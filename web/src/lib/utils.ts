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
