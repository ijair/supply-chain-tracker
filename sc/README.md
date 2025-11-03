# Supply Chain Tracker - Smart Contracts

Solidity smart contracts for the Supply Chain Tracker DApp.

## Setup

```bash
# Install dependencies
forge install

# Build contracts
forge build

# Run tests
forge test

# Start local blockchain (Anvil)
anvil
```

## Project Structure

```
sc/
├── src/           # Smart contracts source code
├── test/          # Test files
├── script/        # Deployment scripts
├── lib/           # Dependencies
└── foundry.toml   # Foundry configuration
```

## Development

Compile contracts:
```bash
forge build
```

Run tests with verbose output:
```bash
forge test -vvv
```

Start local blockchain:
```bash
anvil
```

## Network Configuration

Default Anvil configuration:
- Chain ID: 31337
- Block Time: 1 second
- 10 test accounts with 10000 ETH each
