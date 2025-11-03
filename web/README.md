# Supply Chain Tracker - Frontend

Next.js frontend application for the Supply Chain Tracker DApp.

## Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Technologies

- **Next.js 16**: React framework with App Router
- **React 19**: UI library
- **TypeScript**: Type safety
- **Tailwind CSS v4**: Styling
- **ethers.js**: Ethereum integration
- **MetaMask**: Web3 wallet provider

## Project Structure

```
web/
├── app/           # Next.js app directory
│   ├── layout.tsx # Root layout
│   ├── page.tsx   # Home page
│   └── globals.css# Global styles
├── public/        # Static assets
├── package.json   # Dependencies
└── tsconfig.json  # TypeScript config
```

## Web3 Integration

The app is configured to work with:
- MetaMask browser wallet
- Anvil local blockchain (Chain ID: 31337)
- ethers.js for Ethereum interactions

## Development

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

The page auto-updates as you edit the files.
