"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { toast } from 'sonner';
import { contractConfig } from '@/contracts/config';

// Types
interface User {
  id: number;
  userAddress: string;
  role: string;
  status: UserStatus;
}

enum UserStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
  Canceled = 3
}

interface Web3ContextType {
  // Connection state
  isConnected: boolean;
  account: string | null;
  chainId: number | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  
  // User data
  user: User | null;
  isRegistered: boolean;
  isApproved: boolean;
  
  // Methods
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  checkConnection: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

// Storage keys
const STORAGE_KEYS = {
  ACCOUNT: 'wallet_account',
  CHAIN_ID: 'wallet_chain_id',
  CONNECTION_STATUS: 'wallet_connected'
};

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  // Disconnect wallet helper function (defined early to avoid forward reference)
  const disconnectWallet = useCallback(() => {
    setIsConnected(false);
    setAccount(null);
    setChainId(null);
    setProvider(null);
    setSigner(null);
    setUser(null);
    setIsRegistered(false);
    setIsApproved(false);

    localStorage.removeItem(STORAGE_KEYS.ACCOUNT);
    localStorage.removeItem(STORAGE_KEYS.CHAIN_ID);
    localStorage.removeItem(STORAGE_KEYS.CONNECTION_STATUS);

    toast.info('Wallet disconnected');
  }, []);

  // Load persisted connection state
  useEffect(() => {
    const loadPersistedState = async () => {
      if (typeof window === 'undefined') return;

      const storedAccount = localStorage.getItem(STORAGE_KEYS.ACCOUNT);
      const storedChainId = localStorage.getItem(STORAGE_KEYS.CHAIN_ID);
      const isStoredConnected = localStorage.getItem(STORAGE_KEYS.CONNECTION_STATUS) === 'true';

      if (isStoredConnected && storedAccount && window.ethereum) {
        setAccount(storedAccount);
        if (storedChainId) setChainId(parseInt(storedChainId));
        await checkConnection();
      }
    };

    loadPersistedState();
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected
        disconnectWallet();
      } else if (accounts[0] !== account) {
        // Account changed - refresh all data automatically
        const newAccount = accounts[0];
        setAccount(newAccount);
        localStorage.setItem(STORAGE_KEYS.ACCOUNT, newAccount);
        
        // Reset user data
        setUser(null);
        setIsRegistered(false);
        setIsApproved(false);
        
        // Reconnect with new account
        toast.info('Account changed. Refreshing data...');
        
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const network = await provider.getNetwork();
          const signer = await provider.getSigner();
          
          setChainId(Number(network.chainId));
          setProvider(provider);
          setSigner(signer);
          setIsConnected(true);
          
          localStorage.setItem(STORAGE_KEYS.CHAIN_ID, network.chainId.toString());
          localStorage.setItem(STORAGE_KEYS.CONNECTION_STATUS, 'true');
          
          // Refresh user data for new account
          const contract = new ethers.Contract(
            contractConfig.address,
            contractConfig.abi,
            provider
          );
          try {
            const userData = await contract.getUser(newAccount);
            const userObject: User = {
              id: Number(userData.id),
              userAddress: userData.userAddress,
              role: userData.role,
              status: Number(userData.status) as UserStatus
            };
            setUser(userObject);
            setIsRegistered(true);
            setIsApproved(userObject.status === UserStatus.Approved);
          } catch (error: any) {
            if (!error.message || !error.message.includes("User does not exist")) {
              console.error('Error fetching user data:', error);
            }
            setUser(null);
            setIsRegistered(false);
            setIsApproved(false);
          }
        } catch (error) {
          console.error('Error reconnecting with new account:', error);
          disconnectWallet();
        }
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      const newChainId = parseInt(chainIdHex, 16);
      setChainId(newChainId);
      localStorage.setItem(STORAGE_KEYS.CHAIN_ID, newChainId.toString());
      toast.info('Network changed. Reloading page...');
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, [account, disconnectWallet]);

  // Check MetaMask availability
  const checkMetaMask = useCallback(() => {
    if (typeof window === 'undefined') {
      toast.error('Please use a browser that supports Web3');
      return false;
    }

    if (typeof window.ethereum === 'undefined') {
      toast.error('MetaMask is not installed. Please install MetaMask to continue.');
      return false;
    }

    return true;
  }, []);

  // Check connection status
  const checkConnection = useCallback(async () => {
    if (!checkMetaMask()) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();
      
      if (accounts.length > 0) {
        const account = accounts[0].address;
        const network = await provider.getNetwork();
        const signer = await provider.getSigner();

        setAccount(account);
        setChainId(Number(network.chainId));
        setProvider(provider);
        setSigner(signer);
        setIsConnected(true);

        localStorage.setItem(STORAGE_KEYS.ACCOUNT, account);
        localStorage.setItem(STORAGE_KEYS.CHAIN_ID, network.chainId.toString());
        localStorage.setItem(STORAGE_KEYS.CONNECTION_STATUS, 'true');

        // Refresh user data after state is set
        const contract = new ethers.Contract(
          contractConfig.address,
          contractConfig.abi,
          provider
        );
        try {
          const userData = await contract.getUser(account);
          const userObject: User = {
            id: Number(userData.id),
            userAddress: userData.userAddress,
            role: userData.role,
            status: Number(userData.status) as UserStatus
          };
          setUser(userObject);
          setIsRegistered(true);
          setIsApproved(userObject.status === UserStatus.Approved);
        } catch (error: any) {
          if (!error.message || !error.message.includes("User does not exist")) {
            console.error('Error fetching user data:', error);
          }
          setUser(null);
          setIsRegistered(false);
          setIsApproved(false);
        }
      }
    } catch (error) {
      console.error('Error checking connection:', error);
      setIsConnected(false);
    }
  }, [checkMetaMask]);

  // Connect wallet
  const connectWallet = useCallback(async () => {
    if (!checkMetaMask()) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Request account access
      const accounts = await provider.send('eth_requestAccounts', []);
      
      if (accounts.length > 0) {
        const account = accounts[0];
        const network = await provider.getNetwork();
        const signer = await provider.getSigner();

        setAccount(account);
        setChainId(Number(network.chainId));
        setProvider(provider);
        setSigner(signer);
        setIsConnected(true);

        localStorage.setItem(STORAGE_KEYS.ACCOUNT, account);
        localStorage.setItem(STORAGE_KEYS.CHAIN_ID, network.chainId.toString());
        localStorage.setItem(STORAGE_KEYS.CONNECTION_STATUS, 'true');

        toast.success('Wallet connected successfully!');

        // Refresh user data after state is set
        const contract = new ethers.Contract(
          contractConfig.address,
          contractConfig.abi,
          provider
        );
        try {
          const userData = await contract.getUser(account);
          const userObject: User = {
            id: Number(userData.id),
            userAddress: userData.userAddress,
            role: userData.role,
            status: Number(userData.status) as UserStatus
          };
          setUser(userObject);
          setIsRegistered(true);
          setIsApproved(userObject.status === UserStatus.Approved);
        } catch (error: any) {
          if (!error.message || !error.message.includes("User does not exist")) {
            console.error('Error fetching user data:', error);
          }
          setUser(null);
          setIsRegistered(false);
          setIsApproved(false);
        }
      }
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      
      if (error.code === 4001) {
        toast.error('Please connect your MetaMask wallet to continue');
      } else {
        toast.error('Failed to connect wallet. Please try again.');
      }
    }
  }, [checkMetaMask]);


  // Refresh user data from contract
  const refreshUserData = useCallback(async () => {
    if (!account || !provider) return;

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );
      
      // Check if user exists by calling getUser
      // If the user doesn't exist, it will throw an error
      try {
        const userData = await contract.getUser(account);
        
        // Convert the user data from the contract
        const userObject: User = {
          id: Number(userData.id),
          userAddress: userData.userAddress,
          role: userData.role,
          status: Number(userData.status) as UserStatus
        };
        
        setUser(userObject);
        setIsRegistered(true);
        setIsApproved(userObject.status === UserStatus.Approved);
      } catch (error: any) {
        // User doesn't exist
        if (error.message && error.message.includes("User does not exist")) {
          setUser(null);
          setIsRegistered(false);
          setIsApproved(false);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  }, [account, provider]);

  const value: Web3ContextType = {
    isConnected,
    account,
    chainId,
    provider,
    signer,
    user,
    isRegistered,
    isApproved,
    connectWallet,
    disconnectWallet,
    checkConnection,
    refreshUserData,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

// Hook to use Web3 context
export function useWeb3() {
  const context = useContext(Web3Context);
  
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  
  return context;
}

// Export UserStatus enum for use in components
export { UserStatus };

