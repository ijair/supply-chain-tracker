#!/bin/bash

# Anvil Management Script for Supply Chain Tracker
# This script manages Anvil local blockchain instance

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ANVIL_HOST="${ANVIL_HOST:-127.0.0.1}"
ANVIL_PORT="${ANVIL_PORT:-8545}"
ANVIL_CHAIN_ID="${ANVIL_CHAIN_ID:-31337}"
FORK_URL="${FORK_URL:-}"

ANVIL_PID_FILE="anvil.pid"
ANVIL_LOG_FILE="anvil.log"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check if Anvil is running
is_anvil_running() {
    if [ -f "$ANVIL_PID_FILE" ]; then
        PID=$(cat "$ANVIL_PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            return 0
        else
            rm -f "$ANVIL_PID_FILE"
            return 1
        fi
    fi
    return 1
}

# Function to start Anvil
start_anvil() {
    if is_anvil_running; then
        print_warning "Anvil is already running (PID: $(cat $ANVIL_PID_FILE))"
        return 0
    fi
    
    # Use standard test mnemonic for local development
    # This is the default Anvil mnemonic - predictable and well-documented
    # If you need a custom mnemonic, set ANVIL_MNEMONIC environment variable
    if [ -n "$ANVIL_MNEMONIC" ]; then
        print_status "Using custom mnemonic from ANVIL_MNEMONIC environment variable"
    else
        # Standard test mnemonic used by Anvil and most Ethereum dev tools
        ANVIL_MNEMONIC="test test test test test test test test test test test junk"
        print_status "Using standard test mnemonic (default for local development)"
    fi
    
    print_status "Starting Anvil on $ANVIL_HOST:$ANVIL_PORT (Chain ID: $ANVIL_CHAIN_ID)..."
    
    if [ -n "$FORK_URL" ] && [ -n "$FORK_BLOCK_NUMBER" ]; then
        print_status "Starting Anvil with fork from block $FORK_BLOCK_NUMBER..."
        anvil --host $ANVIL_HOST --port $ANVIL_PORT --chain-id $ANVIL_CHAIN_ID \
              --fork-url "$FORK_URL" --fork-block-number "$FORK_BLOCK_NUMBER" \
              --mnemonic "$ANVIL_MNEMONIC" \
              > "$ANVIL_LOG_FILE" 2>&1 &
    elif [ -n "$FORK_URL" ]; then
        print_status "Starting Anvil with fork from latest block..."
        anvil --host $ANVIL_HOST --port $ANVIL_PORT --chain-id $ANVIL_CHAIN_ID \
              --fork-url "$FORK_URL" \
              --mnemonic "$ANVIL_MNEMONIC" \
              > "$ANVIL_LOG_FILE" 2>&1 &
    else
        anvil --host $ANVIL_HOST --port $ANVIL_PORT --chain-id $ANVIL_CHAIN_ID \
              --mnemonic "$ANVIL_MNEMONIC" \
              > "$ANVIL_LOG_FILE" 2>&1 &
    fi
    
    ANVIL_PID=$!
    echo $ANVIL_PID > "$ANVIL_PID_FILE"
    
    sleep 2
    
    if is_anvil_running; then
        print_status "Anvil started successfully (PID: $ANVIL_PID)"
        print_status "RPC URL: http://$ANVIL_HOST:$ANVIL_PORT"
        print_status "Chain ID: $ANVIL_CHAIN_ID"
        print_status "Logs: $ANVIL_LOG_FILE"
        
        # Wait for Anvil to fully initialize and write logs
        sleep 3
        
        # Extract addresses and private keys from Anvil log output
        # Anvil outputs accounts in format:
        # (0) 0x... (10000.000000000000000000 ETH)
        # Private Keys section:
        # (0) 0x...
        if [ -f "$ANVIL_LOG_FILE" ]; then
            # Wait for Anvil to finish writing initial output (check for "Listening on")
            MAX_WAIT=10
            WAIT_COUNT=0
            while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
                if grep -q "Listening on" "$ANVIL_LOG_FILE" 2>/dev/null; then
                    break
                fi
                sleep 0.5
                WAIT_COUNT=$((WAIT_COUNT + 1))
            done
            
            # Parse Anvil log file for account information
            # Anvil outputs: Available Accounts section with addresses, then Private Keys section
            # Extract addresses and private keys, matching them by index
            print_status "Account addresses and private keys:"
            
            # Extract addresses from "Available Accounts" section (lines like "(0) 0x...")
            # Extract private keys from "Private Keys" section (lines like "(0) 0x...")
            # Match them by index and display
            IN_PRIVATE_KEYS_SECTION=0
            
            # First, collect all addresses
            ADDRESS_LINES=$(grep -E "^\([0-9]+\) 0x[a-fA-F0-9]{40}" "$ANVIL_LOG_FILE" | head -10)
            
            # Then process private keys and match with addresses
            while IFS= read -r line; do
                # Detect "Private Keys" section
                if echo "$line" | grep -qi "Private Keys"; then
                    IN_PRIVATE_KEYS_SECTION=1
                    continue
                fi
                
                # Match private key format: "(0) 0x..."
                if [ $IN_PRIVATE_KEYS_SECTION -eq 1 ] && echo "$line" | grep -qE "^\([0-9]+\) 0x[a-fA-F0-9]{64}"; then
                    INDEX=$(echo "$line" | grep -oE '^\([0-9]+\)' | tr -d '()')
                    PRIVATE_KEY=$(echo "$line" | grep -oE '0x[a-fA-F0-9]{64}' | head -1)
                    
                    # Find matching address for this index
                    MATCHING_ADDRESS=$(echo "$ADDRESS_LINES" | grep -E "^\($INDEX\) 0x[a-fA-F0-9]{40}" | grep -oE '0x[a-fA-F0-9]{40}' | head -1)
                    
                    if [ -n "$MATCHING_ADDRESS" ] && [ -n "$PRIVATE_KEY" ]; then
                        print_status "  User$INDEX: $MATCHING_ADDRESS"
                        print_status "        Private Key: $PRIVATE_KEY"
                        ACCOUNT_COUNT=$((ACCOUNT_COUNT + 1))
                    fi
                fi
            done < "$ANVIL_LOG_FILE"
            
            if [ $ACCOUNT_COUNT -eq 0 ]; then
                print_warning "Could not extract account information from log."
                print_warning "Check $ANVIL_LOG_FILE manually for account details."
            fi
        else
            print_warning "Anvil log file not found. Cannot extract addresses automatically."
            print_warning "Check that Anvil started correctly and check logs manually."
        fi
        
        if [ $ACCOUNT_COUNT -gt 0 ]; then
            print_status ""
            print_warning "NOTE: These are test addresses for local development."
        fi
    else
        print_error "Failed to start Anvil. Check logs: $ANVIL_LOG_FILE"
        exit 1
    fi
}

# Function to stop Anvil
stop_anvil() {
    if ! is_anvil_running; then
        print_warning "Anvil is not running"
        return 0
    fi
    
    PID=$(cat "$ANVIL_PID_FILE")
    print_status "Stopping Anvil (PID: $PID)..."
    
    kill $PID 2>/dev/null || true
    
    sleep 1
    
    if is_anvil_running; then
        print_warning "Anvil did not stop gracefully, forcing..."
        kill -9 $PID 2>/dev/null || true
    fi
    
    rm -f "$ANVIL_PID_FILE"
    print_status "Anvil stopped"
}

# Function to show Anvil status
status_anvil() {
    if is_anvil_running; then
        PID=$(cat "$ANVIL_PID_FILE")
        print_status "Anvil is running (PID: $PID)"
        print_status "RPC URL: http://$ANVIL_HOST:$ANVIL_PORT"
        print_status "Chain ID: $ANVIL_CHAIN_ID"
    else
        print_warning "Anvil is not running"
    fi
}

# Function to show Anvil logs
logs_anvil() {
    if [ -f "$ANVIL_LOG_FILE" ]; then
        tail -f "$ANVIL_LOG_FILE"
    else
        print_error "Log file not found: $ANVIL_LOG_FILE"
        exit 1
    fi
}

# Main command handling
case "${1:-}" in
    start)
        start_anvil
        ;;
    stop)
        stop_anvil
        ;;
    restart)
        stop_anvil
        sleep 1
        start_anvil
        ;;
    status)
        status_anvil
        ;;
    logs)
        logs_anvil
        ;;
    reset-mnemonic)
        print_warning "This command is deprecated. Anvil uses the standard test mnemonic by default."
        print_status "If you need a custom mnemonic, set ANVIL_MNEMONIC environment variable."
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|reset-mnemonic}"
        echo ""
        echo "Commands:"
        echo "  start           - Start Anvil local blockchain"
        echo "  stop            - Stop Anvil local blockchain"
        echo "  restart         - Restart Anvil local blockchain"
        echo "  status          - Show Anvil status"
        echo "  logs            - Show Anvil logs (follow mode)"
        echo "  reset-mnemonic  - (Deprecated) Info about mnemonic usage"
        echo ""
        echo "Environment variables:"
        echo "  ANVIL_HOST           - Anvil host (default: 127.0.0.1)"
        echo "  ANVIL_PORT           - Anvil port (default: 8545)"
        echo "  ANVIL_CHAIN_ID       - Chain ID (default: 31337)"
        echo "  ANVIL_MNEMONIC       - Custom mnemonic (optional)"
        echo "  FORK_URL             - Fork URL (optional)"
        echo "  FORK_BLOCK_NUMBER    - Fork block number (optional)"
        echo ""
        echo "Note: This script uses the standard test mnemonic by default, which"
        echo "      generates predictable addresses perfect for local development."
        echo "      To use a custom mnemonic, set the ANVIL_MNEMONIC environment variable."
        exit 1
        ;;
esac

exit 0

