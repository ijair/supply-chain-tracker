#!/bin/bash

# Faucet Script for Supply Chain Tracker
# Sends test ETH from Anvil test accounts to any address

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ANVIL_HOST="${ANVIL_HOST:-127.0.0.1}"
ANVIL_PORT="${ANVIL_PORT:-8545}"
RPC_URL="http://$ANVIL_HOST:$ANVIL_PORT"

# Test account private keys from Anvil (default accounts)
declare -a TEST_ACCOUNTS=(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
    "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
    "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6"
    "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a"
    "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba"
    "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e"
    "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356"
    "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97"
    "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6"
)

# Amount to send (in ETH, will be converted to Wei)
AMOUNT="${AMOUNT:-100}"

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
check_anvil_running() {
    if ! curl -s $RPC_URL > /dev/null 2>&1; then
        print_error "Anvil is not running on $RPC_URL"
        print_error "Please start Anvil first: ./scripts/anvil.sh start"
        exit 1
    fi
}

# Function to send ETH from faucet
send_eth() {
    local to_address=$1
    
    if [[ -z "$to_address" ]]; then
        print_error "Please provide a recipient address"
        echo "Usage: ./scripts/faucet.sh <recipient_address> [amount_in_eth]"
        exit 1
    fi
    
    # Use first test account as faucet
    local faucet_key=${TEST_ACCOUNTS[0]}
    
    print_status "Sending $AMOUNT ETH from faucet to $to_address..."
    
    cd "$(dirname "$0")/.."
    
    # Use cast to send ETH
    cast send \
        --rpc-url "$RPC_URL" \
        --private-key "$faucet_key" \
        "$to_address" \
        --value "$(cast --to-wei $AMOUNT eth)"
    
    print_status "Successfully sent $AMOUNT ETH to $to_address"
}

# Main execution
main() {
    print_status "Supply Chain Tracker - Faucet Script"
    echo ""
    
    check_anvil_running
    
    if [[ -z "$1" ]]; then
        print_warning "No recipient address provided"
        echo ""
        echo "Usage: ./scripts/faucet.sh <recipient_address> [amount_in_eth]"
        echo ""
        echo "Examples:"
        echo "  ./scripts/faucet.sh 0xYourAddress"
        echo "  ./scripts/faucet.sh 0xYourAddress 50"
        echo ""
        print_status "Available test accounts (10000 ETH each):"
        echo ""
        for i in "${!TEST_ACCOUNTS[@]}"; do
            local key=${TEST_ACCOUNTS[$i]}
            local addr=$(cast wallet address "$key" 2>/dev/null || echo "Unknown")
            echo "  Account $i: $addr"
        done
        echo ""
        exit 1
    fi
    
    if [[ -n "$2" ]]; then
        AMOUNT=$2
    fi
    
    send_eth "$1"
}

main "$@"

exit 0

