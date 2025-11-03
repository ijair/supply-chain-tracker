# Supply Chain Tracker

Educational decentralized app to keep tracking supplies on-chain.

## Project Structure

```
supply-chain-tracker/
├── sc/          # Backend: Solidity smart contracts with Foundry & Anvil
├── web/         # Frontend: Next.js with TypeScript, Web3, ethers.js, Tailwind ^3
└── README.md
```

## Technologies

### Backend
- **Solidity**: Smart contract language
- **Foundry**: Development framework
- **Anvil**: Local blockchain for testing

### Frontend
- **Next.js**: React framework with TypeScript
- **Web3 Provider**: MetaMask integration
- **ethers.js**: Ethereum JavaScript library
- **Tailwind CSS**: Utility-first CSS framework (v4)
- **MetaMask**: Browser wallet

## Getting Started

### Prerequisites
- Node.js (v20 or higher)
- Foundry (forge, cast, anvil)
- MetaMask browser extension

### Backend Setup

```bash
# Navigate to backend directory
cd sc

# Compile contracts
forge build

# Run local blockchain
anvil

# Run tests
forge test
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd web

# Install dependencies
npm install

# Run development server
npm run dev
```

## Requirements

- All code and comments must be in English

## License

UNLICENSED

