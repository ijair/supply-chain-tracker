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
    
    # Custom mnemonic to generate unique addresses (not in blacklists)
    # This generates fresh addresses that won't trigger security warnings
    # Use a unique mnemonic file to persist the same addresses across restarts
    # Store mnemonic in the same directory as the script or in sc/ directory
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    SC_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
    MNEMONIC_FILE="${MNEMONIC_FILE:-$SC_DIR/.anvil_mnemonic}"
    
    # Generate or load mnemonic
    if [ -f "$MNEMONIC_FILE" ]; then
        ANVIL_MNEMONIC=$(cat "$MNEMONIC_FILE")
        print_status "Using existing mnemonic from $MNEMONIC_FILE"
    else
        # Generate a unique random mnemonic if one is provided via env var, use it
        # Otherwise generate a random one using cast (if available) or use a project-specific one
        if [ -n "$ANVIL_MNEMONIC" ]; then
            print_status "Using mnemonic from ANVIL_MNEMONIC environment variable"
        elif command -v cast &> /dev/null; then
            # Generate a random mnemonic using cast
            print_status "Generating random mnemonic..."
            ANVIL_MNEMONIC=$(cast mnemonic 2>/dev/null || echo "")
            if [ -z "$ANVIL_MNEMONIC" ]; then
                # Fallback if cast mnemonic doesn't work
                ANVIL_MNEMONIC="supply chain tracker development mnemonic $(date +%s) unique local testing"
            fi
        else
            # Fallback: use a project-specific mnemonic with timestamp for uniqueness
            TIMESTAMP=$(date +%s)
            ANVIL_MNEMONIC="supply chain tracker development mnemonic $TIMESTAMP unique local testing addresses"
        fi
        
        # Save it for consistency across restarts
        echo "$ANVIL_MNEMONIC" > "$MNEMONIC_FILE"
        print_status "Generated new unique mnemonic and saved to $MNEMONIC_FILE"
        print_warning "Using a unique mnemonic to avoid blacklisted addresses"
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
        
        # Wait a bit more for Anvil to fully initialize and write logs
        sleep 4
        
        # Extract addresses and private keys from Anvil log output
        print_status "Extracting account addresses and private keys from Anvil..."
        print_status "Account addresses and private keys:"
        
        # Parse Anvil log file for account information
        # Anvil outputs accounts in format like:
        # Account #0: 0x... (Private Key: 0x...)
        if [ -f "$ANVIL_LOG_FILE" ]; then
            # Try multiple patterns to match Anvil's output format
            ACCOUNT_COUNT=0
            while IFS= read -r line && [ $ACCOUNT_COUNT -lt 10 ]; do
                # Pattern 1: Standard Anvil format "Account #N: 0x... (PK: 0x...)"
                if echo "$line" | grep -qE "Account #[0-9]+:"; then
                    echo "  $line" | sed 's/^/  /'
                    ACCOUNT_COUNT=$((ACCOUNT_COUNT + 1))
                # Pattern 2: Alternative format
                elif echo "$line" | grep -qE "^0x[a-fA-F0-9]{40}.*0x[a-fA-F0-9]{64}"; then
                    ADDR=$(echo "$line" | grep -oP '0x[a-fA-F0-9]{40}' | head -1)
                    PK=$(echo "$line" | grep -oP '0x[a-fA-F0-9]{64}' | head -1)
                    if [ -n "$ADDR" ] && [ -n "$PK" ]; then
                        print_status "  User$ACCOUNT_COUNT: $ADDR"
                        print_status "        Private Key: $PK"
                        ACCOUNT_COUNT=$((ACCOUNT_COUNT + 1))
                    fi
                fi
            done < "$ANVIL_LOG_FILE"
            
            # If we didn't find accounts in the log, try using cast to derive them
            if [ $ACCOUNT_COUNT -eq 0 ] && command -v cast &> /dev/null; then
                print_status "Parsing from log failed, deriving addresses from mnemonic..."
                for i in {0..9}; do
                    # Try to derive using cast
                    DERIVE_CMD="cast wallet derive --mnemonic \"$ANVIL_MNEMONIC\" --index $i"
                    DERIVE_OUTPUT=$(eval $DERIVE_CMD 2>&1)
                    
                    # Extract private key (usually the last hex string of 64 chars)
                    PRIVATE_KEY=$(echo "$DERIVE_OUTPUT" | grep -oE '0x[a-fA-F0-9]{64}' | tail -1)
                    if [ -n "$PRIVATE_KEY" ]; then
                        ADDRESS=$(cast wallet address $PRIVATE_KEY 2>/dev/null || echo "")
                        if [ -n "$ADDRESS" ]; then
                            print_status "  User$i: $ADDRESS"
                            print_status "        Private Key: $PRIVATE_KEY"
                        fi
                    fi
                done
            fi
        else
            print_warning "Anvil log file not found. Cannot extract addresses automatically."
            print_warning "Check that Anvil started correctly and check logs manually."
        fi
        
        print_status ""
        print_warning "NOTE: These are NEW addresses that should not trigger security warnings."
        print_status "If you see warnings, the addresses are unique to your local setup."
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
        if is_anvil_running; then
            print_error "Cannot reset mnemonic while Anvil is running. Stop Anvil first."
            exit 1
        fi
        SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        SC_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
        MNEMONIC_FILE="${MNEMONIC_FILE:-$SC_DIR/.anvil_mnemonic}"
        if [ -f "$MNEMONIC_FILE" ]; then
            rm -f "$MNEMONIC_FILE"
            print_status "Mnemonic file deleted. New unique addresses will be generated on next start."
        else
            print_warning "No mnemonic file found. Addresses will be generated on next start."
        fi
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
        echo "  reset-mnemonic  - Delete mnemonic file to generate new addresses"
        echo ""
        echo "Environment variables:"
        echo "  ANVIL_HOST           - Anvil host (default: 127.0.0.1)"
        echo "  ANVIL_PORT           - Anvil port (default: 8545)"
        echo "  ANVIL_CHAIN_ID       - Chain ID (default: 31337)"
        echo "  ANVIL_MNEMONIC       - Custom mnemonic (optional)"
        echo "  FORK_URL             - Fork URL (optional)"
        echo "  FORK_BLOCK_NUMBER    - Fork block number (optional)"
        echo ""
        echo "Note: This script uses a unique mnemonic to generate addresses that"
        echo "      are not in security blacklists. If you see 'malicious address'"
        echo "      warnings, run 'reset-mnemonic' and restart Anvil."
        exit 1
        ;;
esac

exit 0

