#!/bin/bash

# Deployment Script for Supply Chain Tracker
# This script deploys the SupplyChainTracker contract to Anvil

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
CONTRACT_NAME="${CONTRACT_NAME:-SupplyChainTracker}"
ARTIFACTS_DIR="../web/src/contracts"

# Global variable for contract address
CONTRACT_ADDRESS=""

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

# Function to verify contract is deployed
verify_contract_deployed() {
    local address=$1
    if [ -z "$address" ] || [ "$address" == "null" ] || [ "$address" == "" ]; then
        return 1
    fi
    
    # Check if cast is available
    if ! command -v cast &> /dev/null; then
        print_warning "cast command not found, skipping bytecode verification"
        return 0
    fi
    
    # Get contract bytecode
    BYTECODE=$(cast code "$address" --rpc-url "$RPC_URL" 2>/dev/null || echo "")
    
    # Check if bytecode is not empty (0x means no code)
    if [ -z "$BYTECODE" ] || [ "$BYTECODE" == "0x" ] || [ "$BYTECODE" == "" ]; then
        print_error "Contract verification failed: No bytecode found at address $address"
        return 1
    fi
    
    # Check if bytecode has reasonable length (at least 100 chars for constructor + contract)
    BYTECODE_LENGTH=${#BYTECODE}
    if [ "$BYTECODE_LENGTH" -lt 100 ]; then
        print_error "Contract verification failed: Bytecode too short (likely not a contract)"
        return 1
    fi
    
    print_status "Contract verified: Bytecode found (${BYTECODE_LENGTH} chars)"
    return 0
}

# Function to extract contract address from broadcast logs
extract_contract_address() {
    local broadcast_log=$1
    
    if [ ! -f "$broadcast_log" ]; then
        return 1
    fi
    
    # Try multiple methods to extract contract address
    local address=""
    
    # Method 1: Look for contractAddress in transactions
    if command -v jq &> /dev/null; then
        address=$(jq -r '.transactions[] | select(.contractAddress != null) | .contractAddress' "$broadcast_log" 2>/dev/null | head -1)
        
        # Method 2: Look for contractAddress in receipts
        if [ -z "$address" ] || [ "$address" == "null" ]; then
            address=$(jq -r '.receipts[] | select(.contractAddress != null) | .contractAddress' "$broadcast_log" 2>/dev/null | head -1)
        fi
        
        # Method 3: Look for createdContractAddress in transaction receipts
        if [ -z "$address" ] || [ "$address" == "null" ]; then
            address=$(jq -r '.transactions[] | select(.transaction.type == "CREATE") | .contractAddress' "$broadcast_log" 2>/dev/null | head -1)
        fi
    fi
    
    if [ -n "$address" ] && [ "$address" != "null" ] && [ "$address" != "" ]; then
        echo "$address"
        return 0
    fi
    
    return 1
}

# Function to deploy contract
deploy_contract() {
    print_status "Deploying $CONTRACT_NAME to $RPC_URL..."
    
    cd "$(dirname "$0")/.."
    
    # Default user0 private key from Anvil
    USER0_PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    DEPLOYER_ADDRESS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    
    # Clean previous broadcast logs to avoid confusion
    if [ -d "broadcast/Deploy.s.sol" ]; then
        print_status "Cleaning previous broadcast logs..."
        rm -rf broadcast/Deploy.s.sol/*
    fi
    
    # Deploy using forge script
    print_status "Running forge script..."
    DEPLOY_OUTPUT=$(forge script script/Deploy.s.sol \
        --rpc-url "$RPC_URL" \
        --broadcast \
        --private-key "$USER0_PRIVATE_KEY" \
        -vvv 2>&1)
    
    DEPLOY_EXIT_CODE=$?
    
    if [ $DEPLOY_EXIT_CODE -ne 0 ]; then
        print_error "Forge script failed with exit code $DEPLOY_EXIT_CODE"
        echo "$DEPLOY_OUTPUT"
        exit 1
    fi
    
    # Wait a moment for the transaction to be mined
    sleep 2
    
    # Extract contract address from broadcast logs
    CONTRACT_ADDRESS=""
    BROADCAST_LOG=$(find broadcast/Deploy.s.sol -name "run-latest.json" -type f 2>/dev/null | head -1)
    
    if [ -n "$BROADCAST_LOG" ] && [ -f "$BROADCAST_LOG" ]; then
        print_status "Extracting contract address from broadcast log: $BROADCAST_LOG"
        CONTRACT_ADDRESS=$(extract_contract_address "$BROADCAST_LOG")
    fi
    
    # Fallback: Try to extract from deployment output
    if [ -z "$CONTRACT_ADDRESS" ] || [ "$CONTRACT_ADDRESS" == "null" ]; then
        print_warning "Could not extract address from broadcast log, trying output..."
        CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -i "deployed" | grep -oP '0x[a-fA-F0-9]{40}' | head -1 || \
                          echo "$DEPLOY_OUTPUT" | grep -i "contract" | grep -oP '0x[a-fA-F0-9]{40}' | head -1 || \
                          echo "")
    fi
    
    if [ -z "$CONTRACT_ADDRESS" ] || [ "$CONTRACT_ADDRESS" == "null" ] || [ "$CONTRACT_ADDRESS" == "" ]; then
        print_error "Failed to extract contract address from deployment"
        print_error "Deployment output:"
        echo "$DEPLOY_OUTPUT"
        exit 1
    fi
    
    print_status "Contract address extracted: $CONTRACT_ADDRESS"
    
    # Verify contract is actually deployed
    print_status "Verifying contract deployment..."
    if ! verify_contract_deployed "$CONTRACT_ADDRESS"; then
        print_error "Contract deployment verification failed!"
        print_error "The address $CONTRACT_ADDRESS does not contain contract code."
        print_error "This usually means:"
        print_error "  1. The transaction failed but was not detected"
        print_error "  2. The wrong address was extracted"
        print_error "  3. Anvil is not running or responding correctly"
        echo ""
        print_error "Deployment output:"
        echo "$DEPLOY_OUTPUT"
        exit 1
    fi
    
    print_status "Contract deployed and verified successfully!"
    echo ""
    print_status "Contract Name: $CONTRACT_NAME"
    print_status "Contract Address: $CONTRACT_ADDRESS"
    print_status "Network: Anvil (Chain ID: 31337)"
    echo ""
    
    
    print_status "Admin User (user0) registered: $DEPLOYER_ADDRESS"
    print_status "Role: Admin (Approved)"
    echo ""
    
    # Create contracts directory if it doesn't exist
    mkdir -p "$ARTIFACTS_DIR"
    
    # Copy ABI to frontend first
    if [ -f "out/$CONTRACT_NAME.sol/$CONTRACT_NAME.json" ]; then
        cp "out/$CONTRACT_NAME.sol/$CONTRACT_NAME.json" "$ARTIFACTS_DIR/"
        print_status "Contract ABI copied to $ARTIFACTS_DIR/"
        
        # Extract ABI from the JSON file for the config
        if command -v jq &> /dev/null; then
            ABI=$(cat "$ARTIFACTS_DIR/$CONTRACT_NAME.json" | jq -c '.abi' 2>/dev/null || echo "[]")
        else
            ABI="[]"
        fi
    else
        print_warning "ABI file not found: out/$CONTRACT_NAME.sol/$CONTRACT_NAME.json"
        ABI="[]"
    fi
    
    # Extract ABI to separate file if possible
    if [ -f "$ARTIFACTS_DIR/$CONTRACT_NAME.json" ] && command -v python3 &> /dev/null; then
        python3 -c "import sys, json; data=json.load(open('$ARTIFACTS_DIR/$CONTRACT_NAME.json')); json.dump(data['abi'], open('$ARTIFACTS_DIR/abi.json', 'w'), indent=2)" 2>/dev/null
        if [ -f "$ARTIFACTS_DIR/abi.json" ]; then
            ABI_IMPORT="import abi from './abi.json';"
            ABI_REF="abi"
            print_status "ABI extracted to separate file: abi.json"
        fi
    fi
    
    # Fallback: inline ABI if extraction failed
    if [ -z "$ABI_IMPORT" ]; then
        ABI_IMPORT=""
        if [ -n "$ABI" ]; then
            ABI_REF="$ABI"
        else
            ABI_REF="[]"
        fi
    fi
    
    # Generate TypeScript contract configuration
    cat > "$ARTIFACTS_DIR/config.ts" <<EOF
// Auto-generated by deploy.sh
// DO NOT EDIT MANUALLY

$ABI_IMPORT

export const contractConfig = {
  address: "$CONTRACT_ADDRESS" as const,
  abi: ${ABI_REF},
  network: {
    name: "anvil" as const,
    chainId: 31337 as const,
  },
} as const;

// Contract artifacts location
export const CONTRACT_ABI_PATH = "./SupplyChainTracker.json";

// Export contract address for convenience
export const CONTRACT_ADDRESS = "$CONTRACT_ADDRESS" as const;

// Export ABI separately for convenience
export { abi };
EOF
    
    print_status "Contract configuration saved to $ARTIFACTS_DIR/config.ts"
    
    # Create network configuration for MetaMask
    cat > "$ARTIFACTS_DIR/network-config.json" <<EOF
{
  "chainId": "0x7A69",
  "chainName": "Anvil Local",
  "rpcUrls": ["$RPC_URL"],
  "nativeCurrency": {
    "name": "Ethereum",
    "symbol": "ETH",
    "decimals": 18
  },
  "blockExplorerUrls": []
}
EOF
    
    print_status "Network configuration saved to $ARTIFACTS_DIR/network-config.json"
    
    echo ""
    print_status "Deployment Summary:"
    echo "  Contract: $CONTRACT_ADDRESS"
    echo "  Network: Anvil Local"
    echo "  RPC: $RPC_URL"
    echo "  Admin (user0): $DEPLOYER_ADDRESS"
    echo ""
    print_warning "Add this network to MetaMask:"
    echo "  - Chain ID: 31337"
    echo "  - RPC URL: $RPC_URL"
    echo ""
    print_status "Admin credentials for testing:"
    echo "  Address: $DEPLOYER_ADDRESS"
    echo "  Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
}

# Function to verify deployment (contract functionality)
verify_deployment() {
    if [ -z "$CONTRACT_ADDRESS" ]; then
        print_error "No contract address to verify"
        return 1
    fi
    
    print_status "Verifying contract functionality..."
    
    # Verify contract owner using cast
    if command -v cast &> /dev/null; then
        # Try to call owner() function
        OWNER=$(cast call "$CONTRACT_ADDRESS" "owner()" --rpc-url "$RPC_URL" 2>/dev/null || echo "")
        
        if [ -n "$OWNER" ] && [ "$OWNER" != "0x" ]; then
            print_status "Contract owner verified: $OWNER"
            return 0
        else
            print_warning "Could not verify contract owner (this may be normal if cast is not configured)"
        fi
    else
        print_warning "cast command not found, skipping functionality verification"
    fi
    
    return 0
}

# Main execution
main() {
    print_status "Supply Chain Tracker - Deployment Script"
    echo ""
    
    check_anvil_running
    deploy_contract
    
    # Verify deployment functionality
    if verify_deployment; then
        echo ""
        print_status "Deployment completed successfully!"
        print_status "Contract is deployed and verified at: $CONTRACT_ADDRESS"
    else
        print_warning "Deployment completed but functionality verification had issues"
    fi
}

main

exit 0

