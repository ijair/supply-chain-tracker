"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  useEffect(() => {
    // Check if MetaMask is installed
    if (typeof window.ethereum !== "undefined") {
      checkConnection();
    }
  }, []);

  const checkConnection = async () => {
    try {
      const provider = window.ethereum;
      const accounts = await provider.request({ method: "eth_accounts" });
      
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
        
        const chainIdHex = await provider.request({ method: "eth_chainId" });
        setChainId(parseInt(chainIdHex as string, 16));
      }
    } catch (error) {
      console.error("Error checking connection:", error);
    }
  };

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum === "undefined") {
        alert("Please install MetaMask!");
        return;
      }

      const provider = window.ethereum;
      const accounts = await provider.request({ 
        method: "eth_requestAccounts" 
      });
      
      setAccount(accounts[0]);
      setIsConnected(true);
      
      const chainIdHex = await provider.request({ method: "eth_chainId" });
      setChainId(parseInt(chainIdHex as string, 16));
    } catch (error) {
      console.error("Error connecting wallet:", error);
      alert("Failed to connect wallet");
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="flex min-h-screen w-full max-w-4xl flex-col items-center justify-center py-16 px-8">
        <div className="w-full max-w-2xl space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
              Supply Chain Tracker
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Educational decentralized app to keep tracking supplies on-chain
            </p>
          </div>

          {/* Connection Status Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Wallet Connection
              </h2>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                isConnected 
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" 
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
              }`}>
                {isConnected ? "Connected" : "Disconnected"}
              </div>
            </div>

            {!isConnected ? (
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400">
                  Connect your MetaMask wallet to interact with the Supply Chain Tracker
                </p>
                <button
                  onClick={connectWallet}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
                >
                  Connect MetaMask
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Account
                    </div>
                    <div className="text-lg font-mono text-gray-900 dark:text-white">
                      {account ? formatAddress(account) : "Not connected"}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Chain ID
                    </div>
                    <div className="text-lg font-mono text-gray-900 dark:text-white">
                      {chainId !== null ? chainId : "N/A"}
                    </div>
                  </div>
                </div>
                <button
                  onClick={connectWallet}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
                >
                  Change Wallet
                </button>
              </div>
            )}
          </div>

          {/* Info Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Getting Started
            </h3>
            <div className="space-y-3 text-gray-600 dark:text-gray-400">
              <p>
                To use this dApp with your local Anvil node:
              </p>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>Start your Anvil local blockchain: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">cd sc && anvil</code></li>
                <li>Deploy the smart contract: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast</code></li>
                <li>Add Anvil network to MetaMask (Chain ID: 31337, RPC: http://localhost:8545)</li>
                <li>Connect your wallet and start tracking supplies!</li>
              </ol>
            </div>
          </div>

          {/* Features Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Features
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4">
                <div className="text-2xl mb-2">📦</div>
                <div className="font-semibold text-gray-900 dark:text-white mb-1">
                  Register Supplies
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Create new supply items with name and location
                </div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <div className="text-2xl mb-2">📍</div>
                <div className="font-semibold text-gray-900 dark:text-white mb-1">
                  Track Location
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Update supply locations in real-time
                </div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                <div className="text-2xl mb-2">🔍</div>
                <div className="font-semibold text-gray-900 dark:text-white mb-1">
                  View History
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Access complete supply chain history
                </div>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                <div className="text-2xl mb-2">✅</div>
                <div className="font-semibold text-gray-900 dark:text-white mb-1">
                  On-Chain Records
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Immutable blockchain storage
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

declare global {
  interface Window {
    ethereum?: any;
  }
}
