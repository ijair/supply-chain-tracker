# Supply Chain Tracker

Educational decentralized app to keep tracking supplies on-chain.

## Project Structure

```
supply-chain-tracker/
├── sc/                  # Backend: Solidity smart contracts with Foundry & Anvil
│   ├── src/
│   │   └── SupplyChainTracker.sol  # Main smart contract with user roles
│   ├── test/
│   │   └── SupplyChainTracker.t.sol # Comprehensive test suite (24 tests)
│   ├── script/
│   │   ├── Deploy.s.sol            # Deployment script
│   │   └── *.sh                    # Deployment scripts
│   └── env.example                 # Environment configuration
├── web/                 # Frontend: Next.js with TypeScript, Web3, shadcn/ui
│   ├── src/
│   │   ├── app/                   # Next.js App Router pages
│   │   ├── components/
│   │   │   ├── ui/                # shadcn/ui components
│   │   │   └── UserRegistrationForm.tsx
│   │   ├── contexts/
│   │   │   └── Web3Context.tsx    # MetaMask & Web3 state management
│   │   └── contracts/             # Contract artifacts & configs
│   └── components.json            # shadcn/ui configuration
└── README.md
```

## Technologies

### Backend
- **Solidity**: Smart contract language
- **Foundry**: Development framework with forge, cast, anvil, chisel
- **Anvil**: Local blockchain for testing and development

### Frontend
- **Next.js 16**: React framework with App Router and TypeScript
- **shadcn/ui**: Beautiful, accessible component library
- **Tailwind CSS v4**: Utility-first CSS framework
- **ethers.js v6**: Ethereum JavaScript library
- **MetaMask**: Web3 wallet integration
- **Sonner**: Toast notifications

## Features

### Smart Contract Features
✅ **User Management System**
- Role-based access control (Producer, Factory, Retailer, Consumer)
- User registration with pending/approved/rejected/canceled status
- Admin-only user moderation functions
- Soft delete via status management

✅ **Supply Chain Tracking**
- Register supplies with name and location
- Update supply locations in real-time
- Deactivate supplies
- On-chain event logging
- Access control based on user approval status

✅ **Comprehensive Testing**
- 24 automated tests with 100% pass rate
- Tests for all user roles and supply operations
- Error handling and edge case coverage

### Frontend Features
✅ **Web3 Integration**
- MetaMask wallet connection with persistence
- Automatic account and network change detection
- Local storage for connection state
- Disconnect functionality

✅ **User Registration Flow**
- Beautiful registration form with role selection
- Status display (Pending/Approved/Rejected)
- Automatic dashboard redirection for approved users
- Pending approval messaging

✅ **Modern UI/UX**
- Responsive design with shadcn/ui components
- Toast notifications for user feedback
- Loading states and error handling
- Dark mode support

## Getting Started

### Prerequisites
- Node.js (v20 or higher)
- Foundry (forge, cast, anvil, chisel)
- MetaMask browser extension

### Quick Start

```bash
# 1. Start Anvil and deploy contract
cd sc
./scripts/anvil.sh start       # In one terminal
./scripts/deploy.sh             # In another terminal

# 2. Start frontend
cd web
npm install
npm run dev                     # Open http://localhost:3000

# 3. If using MetaMask with your own wallet, get test ETH:
cd sc
./scripts/faucet.sh 0xYourMetaMaskAddress
```

### Backend Setup

```bash
# Navigate to backend directory
cd sc

# Install dependencies
forge install

# Compile contracts
forge build

# Run comprehensive test suite
forge test

# Start Anvil local blockchain (in one terminal)
./scripts/anvil.sh start

# In another terminal, deploy contracts
./scripts/deploy.sh
```

The deployment script will:
- Deploy the contract to Anvil
- Generate TypeScript configuration for the frontend
- Copy ABI files to the frontend
- Display contract address and network information

### Frontend Setup

```bash
# Navigate to frontend directory
cd web

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### MetaMask Configuration

Add Anvil network to MetaMask:
- **Network Name**: Anvil Local
- **RPC URL**: http://localhost:8545
- **Chain ID**: 31337
- **Currency Symbol**: ETH

**Important**: Anvil provides 10 pre-funded test accounts with 10000 ETH each. However, if you're using MetaMask with your own accounts, you'll need to get test ETH using the faucet (see below).

### Getting Test ETH

If you're using MetaMask with your own wallet address, you need to fund it with test ETH:

```bash
# Send 100 ETH to your MetaMask address
cd sc
./scripts/faucet.sh 0xYourMetaMaskAddress

# Or send a custom amount (default is 100 ETH)
./scripts/faucet.sh 0xYourMetaMaskAddress 50
```

**Pre-funded Anvil Test Accounts**:
```
Account 0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (Owner/Admin)
Account 1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Account 2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
... and 7 more accounts
```

Each account has 10000 ETH and can be imported into MetaMask using the private keys (see `sc/scripts/deploy.sh`).

## Usage

### For New Users

1. **Get Test ETH**: If you're using MetaMask with your own wallet, run `./scripts/faucet.sh 0xYourAddress` to get test ETH
2. **Connect Wallet**: Click "Connect MetaMask" on the home page
3. **Register**: Click "Register Now" and select your role (Producer, Factory, Retailer, or Consumer)
4. **Wait for Approval**: Your registration will show as "Pending" until admin approval
5. **Access Dashboard**: Once approved, you'll be redirected to your role-specific dashboard

### For Admins

1. Connect wallet using the owner account
2. Deploy the contract
3. Approve or reject user registrations
4. Access admin dashboard for user management

### Available Roles

- **Producer**: Creates and tracks supply items from origin
- **Factory**: Processes and transforms supplies
- **Retailer**: Distributes supplies to consumers
- **Consumer**: Receives final supply products
- **Admin**: Manages user approvals and system oversight

## Smart Contract API

### User Functions
- `registerUser(string memory _role)`: Register as a new user with pending status
- `updateUserStatus(address _userAddress, UserStatus _newStatus)`: Admin-only status update
- `getUser(address _userAddress)`: Get user details
- `getUserStatus(address _userAddress)`: Check user approval status
- `isUserApproved(address _userAddress)`: Boolean approval check
- `getAllUsers()`: Admin-only list of all registered users

### Supply Functions (Approved users only)
- `registerSupply(string memory _name, string memory _location)`: Register new supply
- `updateSupplyLocation(uint256 _id, string memory _newLocation)`: Update location
- `deactivateSupply(uint256 _id)`: Deactivate supply item
- `getSupply(uint256 _id)`: Get supply details
- `getAllSupplyIds()`: Get all supply IDs

### Events
- `UserRegistered`: User registration events
- `UserStatusUpdated`: Status change events
- `SupplyRegistered`: New supply registrations
- `SupplyUpdated`: Location updates
- `SupplyDeactivated`: Supply deactivation

## Testing

```bash
# Run all tests
cd sc
forge test

# Run tests with verbose output
forge test -vvv

# Run specific test
forge test --match-test test_RegisterUser

# Run tests with gas reporting
forge test --gas-report
```

## Deployment Scripts

### Anvil Management
```bash
# Start Anvil
./scripts/anvil.sh start

# Stop Anvil
./scripts/anvil.sh stop

# Restart Anvil
./scripts/anvil.sh restart

# Check status
./scripts/anvil.sh status

# View logs
./scripts/anvil.sh logs
```

### Contract Deployment
```bash
# Deploy to Anvil
./scripts/deploy.sh

# Deploy with fork (mainnet)
FORK_URL=<url> FORK_BLOCK_NUMBER=<block> ./scripts/deploy.sh
```

### Faucet (Get Test ETH)
```bash
# Send 100 ETH to your address (default)
./scripts/faucet.sh 0xYourAddress

# Send custom amount
./scripts/faucet.sh 0xYourAddress 50

# Show usage and available test accounts
./scripts/faucet.sh
```

## Development

### Code Quality
- All code and comments are in English
- Comprehensive Solidity test coverage (24 tests)
- TypeScript strict mode enabled
- ESLint for code quality
- Tailwind CSS for styling

### Project Standards
- **Frontend**: Use shadcn/ui components in `web/src/components/ui`
- **Reusable Components**: Create in `web/src/components/`
- **Contexts**: Web3 and app state in `web/src/contexts/`
- **Tests**: Comprehensive coverage for all smart contract functions

## Requirements

- All code and comments must be in English
- Quality tests for smart contracts
- Frontend standards: responsive design with shadcn/ui components
- Component library location: `web/src/components/ui`

## Roadmap

- [ ] Role-based dashboards with color themes
- [ ] Admin user management interface
- [ ] Supply tracking with timeline visualization
- [ ] Transfer tracking between roles
- [ ] Token statistics per role
- [ ] Blockchain explorer integration

## License

UNLICENSED

## Support

For issues or questions, please check the project documentation or create an issue in the repository.
