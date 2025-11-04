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
    
    print_status "Starting Anvil on $ANVIL_HOST:$ANVIL_PORT (Chain ID: $ANVIL_CHAIN_ID)..."
    
    if [ -n "$FORK_URL" ] && [ -n "$FORK_BLOCK_NUMBER" ]; then
        print_status "Starting Anvil with fork from block $FORK_BLOCK_NUMBER..."
        anvil --host $ANVIL_HOST --port $ANVIL_PORT --chain-id $ANVIL_CHAIN_ID \
              --fork-url "$FORK_URL" --fork-block-number "$FORK_BLOCK_NUMBER" \
              > "$ANVIL_LOG_FILE" 2>&1 &
    elif [ -n "$FORK_URL" ]; then
        print_status "Starting Anvil with fork from latest block..."
        anvil --host $ANVIL_HOST --port $ANVIL_PORT --chain-id $ANVIL_CHAIN_ID \
              --fork-url "$FORK_URL" \
              > "$ANVIL_LOG_FILE" 2>&1 &
    else
        anvil --host $ANVIL_HOST --port $ANVIL_PORT --chain-id $ANVIL_CHAIN_ID \
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
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        echo ""
        echo "Commands:"
        echo "  start    - Start Anvil local blockchain"
        echo "  stop     - Stop Anvil local blockchain"
        echo "  restart  - Restart Anvil local blockchain"
        echo "  status   - Show Anvil status"
        echo "  logs     - Show Anvil logs (follow mode)"
        echo ""
        echo "Environment variables:"
        echo "  ANVIL_HOST           - Anvil host (default: 127.0.0.1)"
        echo "  ANVIL_PORT           - Anvil port (default: 8545)"
        echo "  ANVIL_CHAIN_ID       - Chain ID (default: 31337)"
        echo "  FORK_URL             - Fork URL (optional)"
        echo "  FORK_BLOCK_NUMBER    - Fork block number (optional)"
        exit 1
        ;;
esac

exit 0

