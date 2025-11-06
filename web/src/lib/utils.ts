import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// User status utilities
export enum UserStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
  Canceled = 3
}

/**
 * Get status color class for badge styling
 */
export function getStatusColor(status: number): string {
  switch (status) {
    case UserStatus.Approved:
      return "bg-green-500";
    case UserStatus.Pending:
      return "bg-yellow-500";
    case UserStatus.Rejected:
      return "bg-red-500";
    case UserStatus.Canceled:
      return "bg-gray-500";
    default:
      return "bg-gray-500";
  }
}

/**
 * Get status text label
 */
export function getStatusText(status: number): string {
  switch (status) {
    case UserStatus.Approved:
      return "Approved";
    case UserStatus.Pending:
      return "Pending";
    case UserStatus.Rejected:
      return "Rejected";
    case UserStatus.Canceled:
      return "Canceled";
    default:
      return "Unknown";
  }
}

/**
 * Format Ethereum address for display
 */
export function formatAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Check if a contract exists at the given address
 * @param provider - The ethers provider
 * @param address - The contract address to check
 * @returns true if contract exists, false otherwise
 */
export async function checkContractExists(
  provider: any,
  address: string
): Promise<boolean> {
  try {
    const code = await provider.getCode(address);
    // If code is "0x" or empty, the contract doesn't exist
    return code && code !== "0x" && code.length > 2;
  } catch (error) {
    console.error("Error checking contract existence:", error);
    return false;
  }
}

/**
 * Check if an error is a contract not found error
 * @param error - The error object
 * @returns true if error indicates contract not found
 */
export function isContractNotFoundError(error: any): boolean {
  if (!error) return false;
  
  const errorCode = error?.code || '';
  const errorMessage = error?.message || String(error) || '';
  const errorReason = error?.reason || '';
  
  // Check for CALL_EXCEPTION with missing revert data (contract doesn't exist)
  if (errorCode === 'CALL_EXCEPTION') {
    if (errorMessage.includes('missing revert data') || 
        errorMessage.includes('execution reverted') ||
        errorReason === null) {
      return true;
    }
  }
  
  // Check for other indicators that contract doesn't exist
  if (errorMessage.includes('contract does not exist') ||
      errorMessage.includes('no contract at address') ||
      errorMessage.includes('contract creation code storage')) {
    return true;
  }
  
  return false;
}

/**
 * Check if a user can create tokens based on their role and transfer history
 * @param role - User role (Producer, Factory, Retailer, Consumer)
 * @param provider - The ethers provider
 * @param account - User address
 * @param contractAddress - Contract address
 * @param abi - Contract ABI
 * @returns Promise<boolean> - true if user can create tokens
 */
export async function canUserCreateTokens(
  role: string,
  provider: any,
  account: string,
  contractAddress: string,
  abi: any[]
): Promise<boolean> {
  // Producer can always create tokens
  if (role === "Producer") {
    return true;
  }

  // Consumer cannot create tokens
  if (role === "Consumer") {
    return false;
  }

  // Factory and Retailer can only create tokens if they have accepted at least one transfer
  if (role === "Factory" || role === "Retailer") {
    try {
      const { ethers } = await import("ethers");
      const contract = new ethers.Contract(contractAddress, abi, provider);
      
      // Get total number of transfers
      const totalTransfers = Number(await contract.getTotalTransfers());
      
      // Check all transfers to see if user has accepted any
      for (let i = 0; i < totalTransfers; i++) {
        try {
          const transferId = await contract.transferIds(i);
          const transfer = await contract.getTransfer(Number(transferId));
          
          // Check if this transfer was accepted by the user
          // status 1 = Accepted, 0 = Pending, 2 = Rejected
          if (
            Number(transfer.status) === 1 && // Accepted
            transfer.to.toLowerCase() === account.toLowerCase()
          ) {
            return true; // User has accepted at least one transfer
          }
        } catch (error) {
          // Continue checking other transfers if one fails
          if (process.env.NODE_ENV === 'development') {
            console.error(`Error checking transfer ${i}:`, error);
          }
        }
      }
      
      return false; // No accepted transfers found
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error checking if user can create tokens:", error);
      }
      // In case of error, default to false for safety
      return false;
    }
  }

  return false;
}
