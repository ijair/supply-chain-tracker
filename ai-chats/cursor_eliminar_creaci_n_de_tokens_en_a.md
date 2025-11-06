# Eliminar creación de tokens en actores
_Exported on 11/5/2025 at 21:40:11 EST from Cursor (2.0.63)_

---

**User**

En la cadena de produccion el unico que puede crear tokens sin estar relacionados con otros tokens transferidos es el producer, dicho esto debemos eliminar la opcion de crear nuevos tokens en los actores factory y retailer si no han aceptado ninguna transferencia de tokens de acuerdo al flujo establecido

---

**Cursor**


Revisando el código para entender cómo funciona la creación de tokens y dónde se muestra la opción, para que solo el producer pueda crear tokens nuevos y factory/retailer solo después de aceptar transferencias.



Revisando cómo verificar si un factory o retailer ha aceptado transferencias:



Buscando cómo verificar transferencias aceptadas. Revisando la página de transfers para entender mejor el flujo:



Implementando la lógica: solo el Producer puede crear tokens sin transferencias; Factory y Retailer solo después de aceptar transferencias. Verificando si el usuario puede crear tokens y actualizando el dashboard.



Añadiendo una función helper para verificar si un usuario puede crear tokens y actualizando el dashboard y la página de creación:


```typescript
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

```


Verificando si el contrato expone `transferIds`:



Actualizando el dashboard para usar esta función y ocultar el botón de "Create Token" cuando corresponda:


```typescriptreact
"use client";

import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatAddress, canUserCreateTokens } from "@/lib/utils";
import { Header } from "@/components/Header";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";

export default function Dashboard() {
  const { 
    isConnected, 
    account, 
    user, 
    isApproved, 
    disconnectWallet,
    provider
  } = useWeb3();
  
  const router = useRouter();
  const [pendingTransfersCount, setPendingTransfersCount] = useState(0);
  const [canCreateTokens, setCanCreateTokens] = useState(false);

  const loadPendingTransfersCount = useCallback(async () => {
    if (!account || !provider || !isApproved) return;

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const pendingTransferIds = await contract.getPendingTransfers(account);
      setPendingTransfersCount(pendingTransferIds.length);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error loading pending transfers count:", error);
      }
      setPendingTransfersCount(0);
    }
  }, [account, provider, isApproved]);

  useEffect(() => {
    // Redirect to home if not connected
    if (!isConnected) {
      router.push('/');
      return;
    }
    
    // Redirect to home if not approved
    if (!isApproved) {
      router.push('/');
    }
  }, [isConnected, isApproved, router]);

  useEffect(() => {
    if (isConnected && isApproved && account) {
      loadPendingTransfersCount();
    }
  }, [isConnected, isApproved, account, loadPendingTransfersCount]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "bg-red-500";
      case "Producer":
        return "bg-blue-500";
      case "Factory":
        return "bg-green-500";
      case "Retailer":
        return "bg-blue-500";
      case "Consumer":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };



  if (!isConnected || !isApproved || !user) {
    return null;
  }

  const isAdmin = user.role === "Admin";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-6xl">
        <Header
          title="Dashboard"
          description="Welcome to your Supply Chain Tracker dashboard"
          actionButtons={
            <Button asChild variant="outline">
              <Link href="/profile">Profile</Link>
            </Button>
          }
        />

        {/* User Info Card */}
        <Card className="mb-8 cursor-pointer hover:shadow-lg transition-shadow">
          <Link href="/profile">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Your Profile</CardTitle>
                <Badge className={getRoleColor(user.role)}>
                  {user.role}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    User ID
                  </div>
                  <div className="text-lg font-semibold">
                    #{user.id}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Wallet Address
                  </div>
                  <div className="text-lg font-mono">
                    {formatAddress(user.userAddress)}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Click to view full profile details →
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {isAdmin && (
            <>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <Link href="/admin/users">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      👥 User Management
                    </CardTitle>
                    <CardDescription>
                      Review and moderate registration requests
                    </CardDescription>
                  </CardHeader>
                </Link>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-primary">
                <Link href="/admin/tests">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      🧪 Automated Tests
                    </CardTitle>
                    <CardDescription>
                      Run automated tests for system validation
                    </CardDescription>
                  </CardHeader>
                </Link>
              </Card>
            </>
          )}
          
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <Link href="/profile">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  👤 Profile
                </CardTitle>
                <CardDescription>
                  View and manage your account details
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
          
          {!isAdmin && (
            <>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <Link href="/token">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      🪙 My Tokens
                    </CardTitle>
                    <CardDescription>
                      View and manage your product tokens
                    </CardDescription>
                  </CardHeader>
                </Link>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <Link href="/token/create">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      ➕ Create Token
                    </CardTitle>
                    <CardDescription>
                      Create a new product token
                    </CardDescription>
                  </CardHeader>
                </Link>
              </Card>
            </>
          )}

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <Link href="/transfers">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📤 Transfers
                  {pendingTransfersCount > 0 && (
                    <div className="flex items-center gap-2 ml-2">
                      <div className="relative">
                        <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold text-yellow-900">
                          {pendingTransfersCount}
                        </div>
                      </div>
                      <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                        pending
                      </span>
                    </div>
                  )}
                </CardTitle>
                <CardDescription>
                  View and manage transfer requests
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <Badge className={getRoleColor(user.role)}>
                    {user.role}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className="bg-green-500">Approved</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Your account is active and ready to use.
                </p>
                {isAdmin && (
                  <p className="text-sm">
                    As an admin, you have access to user management features.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatAddress, canUserCreateTokens } from "@/lib/utils";
import { Header } from "@/components/Header";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";

export default function Dashboard() {
  const { 
    isConnected, 
    account, 
    user, 
    isApproved, 
    disconnectWallet,
    provider
  } = useWeb3();
  
  const router = useRouter();
  const [pendingTransfersCount, setPendingTransfersCount] = useState(0);
  const [canCreateTokens, setCanCreateTokens] = useState(false);

  const loadPendingTransfersCount = useCallback(async () => {
    if (!account || !provider || !isApproved) return;

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const pendingTransferIds = await contract.getPendingTransfers(account);
      setPendingTransfersCount(pendingTransferIds.length);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error loading pending transfers count:", error);
      }
      setPendingTransfersCount(0);
    }
  }, [account, provider, isApproved]);

  useEffect(() => {
    // Redirect to home if not connected
    if (!isConnected) {
      router.push('/');
      return;
    }
    
    // Redirect to home if not approved
    if (!isApproved) {
      router.push('/');
    }
  }, [isConnected, isApproved, router]);

  const loadCanCreateTokens = useCallback(async () => {
    if (!account || !provider || !isApproved || !user) return;

    try {
      const canCreate = await canUserCreateTokens(
        user.role,
        provider,
        account,
        contractConfig.address,
        contractConfig.abi
      );
      setCanCreateTokens(canCreate);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error loading can create tokens:", error);
      }
      setCanCreateTokens(false);
    }
  }, [account, provider, isApproved, user]);

  useEffect(() => {
    if (isConnected && isApproved && account) {
      loadPendingTransfersCount();
      loadCanCreateTokens();
    }
  }, [isConnected, isApproved, account, loadPendingTransfersCount, loadCanCreateTokens]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "bg-red-500";
      case "Producer":
        return "bg-blue-500";
      case "Factory":
        return "bg-green-500";
      case "Retailer":
        return "bg-blue-500";
      case "Consumer":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };



  if (!isConnected || !isApproved || !user) {
    return null;
  }

  const isAdmin = user.role === "Admin";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-6xl">
        <Header
          title="Dashboard"
          description="Welcome to your Supply Chain Tracker dashboard"
          actionButtons={
            <Button asChild variant="outline">
              <Link href="/profile">Profile</Link>
            </Button>
          }
        />

        {/* User Info Card */}
        <Card className="mb-8 cursor-pointer hover:shadow-lg transition-shadow">
          <Link href="/profile">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Your Profile</CardTitle>
                <Badge className={getRoleColor(user.role)}>
                  {user.role}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    User ID
                  </div>
                  <div className="text-lg font-semibold">
                    #{user.id}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Wallet Address
                  </div>
                  <div className="text-lg font-mono">
                    {formatAddress(user.userAddress)}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Click to view full profile details →
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {isAdmin && (
            <>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <Link href="/admin/users">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      👥 User Management
                    </CardTitle>
                    <CardDescription>
                      Review and moderate registration requests
                    </CardDescription>
                  </CardHeader>
                </Link>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-primary">
                <Link href="/admin/tests">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      🧪 Automated Tests
                    </CardTitle>
                    <CardDescription>
                      Run automated tests for system validation
                    </CardDescription>
                  </CardHeader>
                </Link>
              </Card>
            </>
          )}
          
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <Link href="/profile">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  👤 Profile
                </CardTitle>
                <CardDescription>
                  View and manage your account details
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
          
          {!isAdmin && (
            <>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <Link href="/token">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      🪙 My Tokens
                    </CardTitle>
                    <CardDescription>
                      View and manage your product tokens
                    </CardDescription>
                  </CardHeader>
                </Link>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <Link href="/token/create">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      ➕ Create Token
                    </CardTitle>
                    <CardDescription>
                      Create a new product token
                    </CardDescription>
                  </CardHeader>
                </Link>
              </Card>
            </>
          )}

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <Link href="/transfers">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📤 Transfers
                  {pendingTransfersCount > 0 && (
                    <div className="flex items-center gap-2 ml-2">
                      <div className="relative">
                        <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold text-yellow-900">
                          {pendingTransfersCount}
                        </div>
                      </div>
                      <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                        pending
                      </span>
                    </div>
                  )}
                </CardTitle>
                <CardDescription>
                  View and manage transfer requests
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <Badge className={getRoleColor(user.role)}>
                    {user.role}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className="bg-green-500">Approved</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Your account is active and ready to use.
                </p>
                {isAdmin && (
                  <p className="text-sm">
                    As an admin, you have access to user management features.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatAddress, canUserCreateTokens } from "@/lib/utils";
import { Header } from "@/components/Header";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";

export default function Dashboard() {
  const { 
    isConnected, 
    account, 
    user, 
    isApproved, 
    disconnectWallet,
    provider
  } = useWeb3();
  
  const router = useRouter();
  const [pendingTransfersCount, setPendingTransfersCount] = useState(0);
  const [canCreateTokens, setCanCreateTokens] = useState(false);

  const loadPendingTransfersCount = useCallback(async () => {
    if (!account || !provider || !isApproved) return;

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const pendingTransferIds = await contract.getPendingTransfers(account);
      setPendingTransfersCount(pendingTransferIds.length);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error loading pending transfers count:", error);
      }
      setPendingTransfersCount(0);
    }
  }, [account, provider, isApproved]);

  useEffect(() => {
    // Redirect to home if not connected
    if (!isConnected) {
      router.push('/');
      return;
    }
    
    // Redirect to home if not approved
    if (!isApproved) {
      router.push('/');
    }
  }, [isConnected, isApproved, router]);

  const loadCanCreateTokens = useCallback(async () => {
    if (!account || !provider || !isApproved || !user) return;

    try {
      const canCreate = await canUserCreateTokens(
        user.role,
        provider,
        account,
        contractConfig.address,
        contractConfig.abi
      );
      setCanCreateTokens(canCreate);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error loading can create tokens:", error);
      }
      setCanCreateTokens(false);
    }
  }, [account, provider, isApproved, user]);

  useEffect(() => {
    if (isConnected && isApproved && account) {
      loadPendingTransfersCount();
      loadCanCreateTokens();
    }
  }, [isConnected, isApproved, account, loadPendingTransfersCount, loadCanCreateTokens]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "bg-red-500";
      case "Producer":
        return "bg-blue-500";
      case "Factory":
        return "bg-green-500";
      case "Retailer":
        return "bg-blue-500";
      case "Consumer":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };



  if (!isConnected || !isApproved || !user) {
    return null;
  }

  const isAdmin = user.role === "Admin";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-6xl">
        <Header
          title="Dashboard"
          description="Welcome to your Supply Chain Tracker dashboard"
          actionButtons={
            <Button asChild variant="outline">
              <Link href="/profile">Profile</Link>
            </Button>
          }
        />

        {/* User Info Card */}
        <Card className="mb-8 cursor-pointer hover:shadow-lg transition-shadow">
          <Link href="/profile">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Your Profile</CardTitle>
                <Badge className={getRoleColor(user.role)}>
                  {user.role}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    User ID
                  </div>
                  <div className="text-lg font-semibold">
                    #{user.id}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Wallet Address
                  </div>
                  <div className="text-lg font-mono">
                    {formatAddress(user.userAddress)}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Click to view full profile details →
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {isAdmin && (
            <>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <Link href="/admin/users">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      👥 User Management
                    </CardTitle>
                    <CardDescription>
                      Review and moderate registration requests
                    </CardDescription>
                  </CardHeader>
                </Link>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-primary">
                <Link href="/admin/tests">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      🧪 Automated Tests
                    </CardTitle>
                    <CardDescription>
                      Run automated tests for system validation
                    </CardDescription>
                  </CardHeader>
                </Link>
              </Card>
            </>
          )}
          
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <Link href="/profile">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  👤 Profile
                </CardTitle>
                <CardDescription>
                  View and manage your account details
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
          
          {!isAdmin && (
            <>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <Link href="/token">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      🪙 My Tokens
                    </CardTitle>
                    <CardDescription>
                      View and manage your product tokens
                    </CardDescription>
                  </CardHeader>
                </Link>
              </Card>
              
              {canCreateTokens && (
                <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                  <Link href="/token/create">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        ➕ Create Token
                      </CardTitle>
                      <CardDescription>
                        Create a new product token
                      </CardDescription>
                    </CardHeader>
                  </Link>
                </Card>
              )}
            </>
          )}

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <Link href="/transfers">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📤 Transfers
                  {pendingTransfersCount > 0 && (
                    <div className="flex items-center gap-2 ml-2">
                      <div className="relative">
                        <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold text-yellow-900">
                          {pendingTransfersCount}
                        </div>
                      </div>
                      <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                        pending
                      </span>
                    </div>
                  )}
                </CardTitle>
                <CardDescription>
                  View and manage transfer requests
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <Badge className={getRoleColor(user.role)}>
                    {user.role}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className="bg-green-500">Approved</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Your account is active and ready to use.
                </p>
                {isAdmin && (
                  <p className="text-sm">
                    As an admin, you have access to user management features.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}


```


Protegiendo la página de creación de tokens para redirigir a Factory/Retailer sin transferencias aceptadas que accedan directamente:


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Trash2, Plus } from "lucide-react";
import { 
  validateMetadataField, 
  validateMetadataTotal,
  validateTokenAmount,
  MAX_INPUT_LENGTHS 
} from "@/lib/security";
import { canUserCreateTokens } from "@/lib/utils";

interface MetadataField {
  id: string;
  label: string;
  value: string;
}

interface CreateTokenForm {
  parentId: string;
  amount: string;
}

export default function CreateTokenPage() {
  const { account, provider, signer, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableTokens, setAvailableTokens] = useState<Array<{ id: number; name: string; balance: number }>>([]);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [canCreateTokens, setCanCreateTokens] = useState<boolean | null>(null);
  const [metadataFields, setMetadataFields] = useState<MetadataField[]>([
    { id: "1", label: "name", value: "" },
    { id: "2", label: "description", value: "" },
  ]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CreateTokenForm>({
    defaultValues: {
      parentId: "0",
      amount: "",
    },
  });

  const parentId = watch("parentId");

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    loadAvailableTokens();
  }, [account, isConnected, isApproved, router]);

  const loadAvailableTokens = async () => {
    if (!account || !provider) return;

    try {
      setLoadingTokens(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenIds: bigint[] = await contract.getAllProductTokenIds();
      const tokenPromises = tokenIds.map(async (tokenId) => {
        try {
          const tokenData = await contract.getProductToken(Number(tokenId));
          const balance = await contract.getTokenBalance(Number(tokenId), account);
          
          if (Number(balance) > 0) {
            let metadata;
            try {
              const parsed = JSON.parse(tokenData.metadata);
              // Validate it's an object
              if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                metadata = parsed;
              } else {
                metadata = { name: `Token #${tokenId}` };
              }
            } catch {
              metadata = { name: `Token #${tokenId}` };
            }
            
            return {
              id: Number(tokenId),
              name: metadata.name || `Token #${tokenId}`,
              balance: Number(balance),
            };
          }
          return null;
        } catch (error) {
          return null;
        }
      });

      const results = await Promise.all(tokenPromises);
      const validTokens = results.filter((token): token is { id: number; name: string; balance: number } => token !== null);
      setAvailableTokens(validTokens);
    } catch (error) {
      console.error("Error loading tokens:", error);
    } finally {
      setLoadingTokens(false);
    }
  };

  // Add new metadata field
  const addMetadataField = () => {
    const newField: MetadataField = {
      id: Date.now().toString(),
      label: "",
      value: "",
    };
    setMetadataFields([...metadataFields, newField]);
  };

  // Remove metadata field
  const removeMetadataField = (id: string) => {
    if (metadataFields.length <= 1) {
      toast.error("At least one metadata field is required");
      return;
    }
    setMetadataFields(metadataFields.filter((field) => field.id !== id));
  };

  // Update metadata field with length validation
  const updateMetadataField = (id: string, field: "label" | "value", value: string) => {
    // Enforce maximum length
    const maxLength = field === "label" 
      ? MAX_INPUT_LENGTHS.METADATA_LABEL 
      : MAX_INPUT_LENGTHS.METADATA_VALUE;
    
    if (value.length > maxLength) {
      toast.error(`${field === "label" ? "Label" : "Value"} must be ${maxLength} characters or less`);
      return;
    }

    setMetadataFields(
      metadataFields.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  // Transform metadata fields to JSON with validation
  const transformMetadataToJSON = (): string => {
    const metadataObject: Record<string, string> = {};

    // Validate each field
    for (const field of metadataFields) {
      const processedLabel = field.label.trim().toLowerCase();
      const processedValue = field.value.trim();

      // Skip empty fields
      if (!processedLabel || !processedValue) {
        continue;
      }

      // Validate field
      const validation = validateMetadataField(processedLabel, processedValue);
      if (!validation.valid) {
        throw new Error(validation.error || "Invalid metadata field");
      }

      metadataObject[processedLabel] = processedValue;
    }

    // Validate that we have at least one field
    if (Object.keys(metadataObject).length === 0) {
      throw new Error("At least one metadata field with both label and value is required");
    }

    const metadataJson = JSON.stringify(metadataObject);

    // Validate total length
    const totalValidation = validateMetadataTotal(metadataJson);
    if (!totalValidation.valid) {
      throw new Error(totalValidation.error || "Metadata too large");
    }

    return metadataJson;
  };

  const onSubmit = async (data: CreateTokenForm) => {
    if (!account || !signer) {
      toast.error("Please connect your wallet");
      return;
    }

    // Transform metadata fields to JSON
    let metadata: string;
    try {
      metadata = transformMetadataToJSON();
    } catch (error: any) {
      toast.error(error.message || "Invalid metadata format");
      return;
    }

    const parentIdNum = parseInt(data.parentId) || 0;
    const amount = parseInt(data.amount);

    if (amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    setIsSubmitting(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      // If parentId is provided, check balance
      if (parentIdNum > 0) {
        const balance = await contract.getTokenBalance(parentIdNum, account);
        if (Number(balance) < amount) {
          toast.error(`Insufficient balance. You have ${Number(balance)} tokens.`);
          setIsSubmitting(false);
          return;
        }
      }

      toast.info("Creating token... Please confirm the transaction in MetaMask.");

      const tx = await contract.createProductToken(metadata, parentIdNum, amount);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Token created successfully!");
      
      router.push('/token');
    } catch (error: any) {
      console.error("Error creating token:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Insufficient parent token balance")) {
        toast.error("Insufficient balance of parent token");
      } else if (error.message?.includes("Parent token does not exist")) {
        toast.error("Parent token does not exist");
      } else {
        toast.error("Failed to create token. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  const selectedParent = availableTokens.find(t => t.id === parseInt(parentId));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Create Product Token
            </h1>
            <p className="text-muted-foreground mt-2">
              Create a new product token in the supply chain
            </p>
          </div>
          <Link href="/token">
            <Button variant="outline">Back to Tokens</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Token Information</CardTitle>
            <CardDescription>
              Fill in the details to create a new product token
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Dynamic Metadata Fields */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>
                    Product Metadata <span className="text-red-500">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMetadataField}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Field
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {metadataFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-start">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor={`label-${field.id}`} className="text-xs">
                            Label
                          </Label>
                          <Input
                            id={`label-${field.id}`}
                            type="text"
                            value={field.label}
                            onChange={(e) => updateMetadataField(field.id, "label", e.target.value)}
                            placeholder="e.g., name, category, brand"
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`value-${field.id}`} className="text-xs">
                            Value
                          </Label>
                          <Input
                            id={`value-${field.id}`}
                            type="text"
                            value={field.value}
                            onChange={(e) => updateMetadataField(field.id, "value", e.target.value)}
                            placeholder="Enter value"
                            className="text-sm"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMetadataField(field.id)}
                        className="mt-6 h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50"
                        disabled={metadataFields.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground mb-2">
                    <strong>Note:</strong> Labels will be automatically converted to lowercase and trimmed. Values will be trimmed.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    At least one field with both label and value is required.
                  </p>
                </div>

                {/* Preview JSON */}
                {metadataFields.some((f) => f.label.trim() && f.value.trim()) && (
                  <div className="p-3 bg-muted rounded-md">
                    <Label className="text-xs mb-2 block">JSON Preview:</Label>
                    <pre className="text-xs font-mono overflow-auto max-h-32 bg-background p-2 rounded border">
                      {(() => {
                        try {
                          const preview = transformMetadataToJSON();
                          return JSON.stringify(JSON.parse(preview), null, 2);
                        } catch {
                          return "Invalid metadata";
                        }
                      })()}
                    </pre>
                  </div>
                )}
              </div>

              {/* Parent Token */}
              <div className="space-y-2">
                <Label htmlFor="parentId">Parent Token (Optional)</Label>
                <select
                  id="parentId"
                  {...register("parentId")}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="0">No parent (new product)</option>
                  {loadingTokens ? (
                    <option disabled>Loading tokens...</option>
                  ) : availableTokens.length === 0 ? (
                    <option disabled>No tokens available</option>
                  ) : (
                    availableTokens.map((token) => (
                      <option key={token.id} value={token.id.toString()}>
                        {token.name} (ID: #{token.id}, Balance: {token.balance})
                      </option>
                    ))
                  )}
                </select>
                {selectedParent && (
                  <p className="text-xs text-muted-foreground">
                    Available balance: {selectedParent.balance} tokens
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Select a parent token if this product is created from another product
                </p>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Initial Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  max={parentId !== "0" && selectedParent ? selectedParent.balance : undefined}
                  {...register("amount", {
                    required: "Amount is required",
                    min: { value: 1, message: "Amount must be at least 1" },
                    validate: (value) => {
                      const balance = parentId !== "0" && selectedParent ? selectedParent.balance : undefined;
                      const validation = validateTokenAmount(value, balance);
                      if (!validation.valid) {
                        return validation.error || "Invalid amount";
                      }
                      return true;
                    },
                  })}
                  placeholder="Enter amount"
                />
                {errors.amount && (
                  <p className="text-sm text-red-500">{errors.amount.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Number of tokens to create initially
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Link href="/token" className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Create Token"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Trash2, Plus } from "lucide-react";
import { 
  validateMetadataField, 
  validateMetadataTotal,
  validateTokenAmount,
  MAX_INPUT_LENGTHS 
} from "@/lib/security";
import { canUserCreateTokens } from "@/lib/utils";

interface MetadataField {
  id: string;
  label: string;
  value: string;
}

interface CreateTokenForm {
  parentId: string;
  amount: string;
}

export default function CreateTokenPage() {
  const { account, provider, signer, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableTokens, setAvailableTokens] = useState<Array<{ id: number; name: string; balance: number }>>([]);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [canCreateTokens, setCanCreateTokens] = useState<boolean | null>(null);
  const [metadataFields, setMetadataFields] = useState<MetadataField[]>([
    { id: "1", label: "name", value: "" },
    { id: "2", label: "description", value: "" },
  ]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CreateTokenForm>({
    defaultValues: {
      parentId: "0",
      amount: "",
    },
  });

  const parentId = watch("parentId");

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    checkCanCreateTokens();
    loadAvailableTokens();
  }, [account, isConnected, isApproved, user, provider, router]);

  const checkCanCreateTokens = async () => {
    if (!account || !provider || !user) return;

    try {
      const canCreate = await canUserCreateTokens(
        user.role,
        provider,
        account,
        contractConfig.address,
        contractConfig.abi
      );
      setCanCreateTokens(canCreate);
      
      // Redirect if user cannot create tokens
      if (!canCreate) {
        toast.error("You cannot create tokens. Factory and Retailer users must accept at least one transfer before creating tokens.");
        router.push('/dashboard');
        return;
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error checking if user can create tokens:", error);
      }
      setCanCreateTokens(false);
      toast.error("Error verifying permissions. Redirecting to dashboard.");
      router.push('/dashboard');
    }
  };

  const loadAvailableTokens = async () => {
    if (!account || !provider) return;

    try {
      setLoadingTokens(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenIds: bigint[] = await contract.getAllProductTokenIds();
      const tokenPromises = tokenIds.map(async (tokenId) => {
        try {
          const tokenData = await contract.getProductToken(Number(tokenId));
          const balance = await contract.getTokenBalance(Number(tokenId), account);
          
          if (Number(balance) > 0) {
            let metadata;
            try {
              const parsed = JSON.parse(tokenData.metadata);
              // Validate it's an object
              if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                metadata = parsed;
              } else {
                metadata = { name: `Token #${tokenId}` };
              }
            } catch {
              metadata = { name: `Token #${tokenId}` };
            }
            
            return {
              id: Number(tokenId),
              name: metadata.name || `Token #${tokenId}`,
              balance: Number(balance),
            };
          }
          return null;
        } catch (error) {
          return null;
        }
      });

      const results = await Promise.all(tokenPromises);
      const validTokens = results.filter((token): token is { id: number; name: string; balance: number } => token !== null);
      setAvailableTokens(validTokens);
    } catch (error) {
      console.error("Error loading tokens:", error);
    } finally {
      setLoadingTokens(false);
    }
  };

  // Add new metadata field
  const addMetadataField = () => {
    const newField: MetadataField = {
      id: Date.now().toString(),
      label: "",
      value: "",
    };
    setMetadataFields([...metadataFields, newField]);
  };

  // Remove metadata field
  const removeMetadataField = (id: string) => {
    if (metadataFields.length <= 1) {
      toast.error("At least one metadata field is required");
      return;
    }
    setMetadataFields(metadataFields.filter((field) => field.id !== id));
  };

  // Update metadata field with length validation
  const updateMetadataField = (id: string, field: "label" | "value", value: string) => {
    // Enforce maximum length
    const maxLength = field === "label" 
      ? MAX_INPUT_LENGTHS.METADATA_LABEL 
      : MAX_INPUT_LENGTHS.METADATA_VALUE;
    
    if (value.length > maxLength) {
      toast.error(`${field === "label" ? "Label" : "Value"} must be ${maxLength} characters or less`);
      return;
    }

    setMetadataFields(
      metadataFields.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  // Transform metadata fields to JSON with validation
  const transformMetadataToJSON = (): string => {
    const metadataObject: Record<string, string> = {};

    // Validate each field
    for (const field of metadataFields) {
      const processedLabel = field.label.trim().toLowerCase();
      const processedValue = field.value.trim();

      // Skip empty fields
      if (!processedLabel || !processedValue) {
        continue;
      }

      // Validate field
      const validation = validateMetadataField(processedLabel, processedValue);
      if (!validation.valid) {
        throw new Error(validation.error || "Invalid metadata field");
      }

      metadataObject[processedLabel] = processedValue;
    }

    // Validate that we have at least one field
    if (Object.keys(metadataObject).length === 0) {
      throw new Error("At least one metadata field with both label and value is required");
    }

    const metadataJson = JSON.stringify(metadataObject);

    // Validate total length
    const totalValidation = validateMetadataTotal(metadataJson);
    if (!totalValidation.valid) {
      throw new Error(totalValidation.error || "Metadata too large");
    }

    return metadataJson;
  };

  const onSubmit = async (data: CreateTokenForm) => {
    if (!account || !signer) {
      toast.error("Please connect your wallet");
      return;
    }

    // Transform metadata fields to JSON
    let metadata: string;
    try {
      metadata = transformMetadataToJSON();
    } catch (error: any) {
      toast.error(error.message || "Invalid metadata format");
      return;
    }

    const parentIdNum = parseInt(data.parentId) || 0;
    const amount = parseInt(data.amount);

    if (amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    setIsSubmitting(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      // If parentId is provided, check balance
      if (parentIdNum > 0) {
        const balance = await contract.getTokenBalance(parentIdNum, account);
        if (Number(balance) < amount) {
          toast.error(`Insufficient balance. You have ${Number(balance)} tokens.`);
          setIsSubmitting(false);
          return;
        }
      }

      toast.info("Creating token... Please confirm the transaction in MetaMask.");

      const tx = await contract.createProductToken(metadata, parentIdNum, amount);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Token created successfully!");
      
      router.push('/token');
    } catch (error: any) {
      console.error("Error creating token:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Insufficient parent token balance")) {
        toast.error("Insufficient balance of parent token");
      } else if (error.message?.includes("Parent token does not exist")) {
        toast.error("Parent token does not exist");
      } else {
        toast.error("Failed to create token. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  const selectedParent = availableTokens.find(t => t.id === parseInt(parentId));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Create Product Token
            </h1>
            <p className="text-muted-foreground mt-2">
              Create a new product token in the supply chain
            </p>
          </div>
          <Link href="/token">
            <Button variant="outline">Back to Tokens</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Token Information</CardTitle>
            <CardDescription>
              Fill in the details to create a new product token
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Dynamic Metadata Fields */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>
                    Product Metadata <span className="text-red-500">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMetadataField}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Field
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {metadataFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-start">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor={`label-${field.id}`} className="text-xs">
                            Label
                          </Label>
                          <Input
                            id={`label-${field.id}`}
                            type="text"
                            value={field.label}
                            onChange={(e) => updateMetadataField(field.id, "label", e.target.value)}
                            placeholder="e.g., name, category, brand"
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`value-${field.id}`} className="text-xs">
                            Value
                          </Label>
                          <Input
                            id={`value-${field.id}`}
                            type="text"
                            value={field.value}
                            onChange={(e) => updateMetadataField(field.id, "value", e.target.value)}
                            placeholder="Enter value"
                            className="text-sm"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMetadataField(field.id)}
                        className="mt-6 h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50"
                        disabled={metadataFields.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground mb-2">
                    <strong>Note:</strong> Labels will be automatically converted to lowercase and trimmed. Values will be trimmed.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    At least one field with both label and value is required.
                  </p>
                </div>

                {/* Preview JSON */}
                {metadataFields.some((f) => f.label.trim() && f.value.trim()) && (
                  <div className="p-3 bg-muted rounded-md">
                    <Label className="text-xs mb-2 block">JSON Preview:</Label>
                    <pre className="text-xs font-mono overflow-auto max-h-32 bg-background p-2 rounded border">
                      {(() => {
                        try {
                          const preview = transformMetadataToJSON();
                          return JSON.stringify(JSON.parse(preview), null, 2);
                        } catch {
                          return "Invalid metadata";
                        }
                      })()}
                    </pre>
                  </div>
                )}
              </div>

              {/* Parent Token */}
              <div className="space-y-2">
                <Label htmlFor="parentId">Parent Token (Optional)</Label>
                <select
                  id="parentId"
                  {...register("parentId")}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="0">No parent (new product)</option>
                  {loadingTokens ? (
                    <option disabled>Loading tokens...</option>
                  ) : availableTokens.length === 0 ? (
                    <option disabled>No tokens available</option>
                  ) : (
                    availableTokens.map((token) => (
                      <option key={token.id} value={token.id.toString()}>
                        {token.name} (ID: #{token.id}, Balance: {token.balance})
                      </option>
                    ))
                  )}
                </select>
                {selectedParent && (
                  <p className="text-xs text-muted-foreground">
                    Available balance: {selectedParent.balance} tokens
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Select a parent token if this product is created from another product
                </p>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Initial Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  max={parentId !== "0" && selectedParent ? selectedParent.balance : undefined}
                  {...register("amount", {
                    required: "Amount is required",
                    min: { value: 1, message: "Amount must be at least 1" },
                    validate: (value) => {
                      const balance = parentId !== "0" && selectedParent ? selectedParent.balance : undefined;
                      const validation = validateTokenAmount(value, balance);
                      if (!validation.valid) {
                        return validation.error || "Invalid amount";
                      }
                      return true;
                    },
                  })}
                  placeholder="Enter amount"
                />
                {errors.amount && (
                  <p className="text-sm text-red-500">{errors.amount.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Number of tokens to create initially
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Link href="/token" className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Create Token"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Trash2, Plus } from "lucide-react";
import { 
  validateMetadataField, 
  validateMetadataTotal,
  validateTokenAmount,
  MAX_INPUT_LENGTHS 
} from "@/lib/security";
import { canUserCreateTokens } from "@/lib/utils";

interface MetadataField {
  id: string;
  label: string;
  value: string;
}

interface CreateTokenForm {
  parentId: string;
  amount: string;
}

export default function CreateTokenPage() {
  const { account, provider, signer, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableTokens, setAvailableTokens] = useState<Array<{ id: number; name: string; balance: number }>>([]);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [canCreateTokens, setCanCreateTokens] = useState<boolean | null>(null);
  const [metadataFields, setMetadataFields] = useState<MetadataField[]>([
    { id: "1", label: "name", value: "" },
    { id: "2", label: "description", value: "" },
  ]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CreateTokenForm>({
    defaultValues: {
      parentId: "0",
      amount: "",
    },
  });

  const parentId = watch("parentId");

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    checkCanCreateTokens();
    loadAvailableTokens();
  }, [account, isConnected, isApproved, user, provider, router]);

  const checkCanCreateTokens = async () => {
    if (!account || !provider || !user) return;

    try {
      const canCreate = await canUserCreateTokens(
        user.role,
        provider,
        account,
        contractConfig.address,
        contractConfig.abi
      );
      setCanCreateTokens(canCreate);
      
      // Redirect if user cannot create tokens
      if (!canCreate) {
        toast.error("You cannot create tokens. Factory and Retailer users must accept at least one transfer before creating tokens.");
        router.push('/dashboard');
        return;
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error checking if user can create tokens:", error);
      }
      setCanCreateTokens(false);
      toast.error("Error verifying permissions. Redirecting to dashboard.");
      router.push('/dashboard');
    }
  };

  const loadAvailableTokens = async () => {
    if (!account || !provider) return;

    try {
      setLoadingTokens(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenIds: bigint[] = await contract.getAllProductTokenIds();
      const tokenPromises = tokenIds.map(async (tokenId) => {
        try {
          const tokenData = await contract.getProductToken(Number(tokenId));
          const balance = await contract.getTokenBalance(Number(tokenId), account);
          
          if (Number(balance) > 0) {
            let metadata;
            try {
              const parsed = JSON.parse(tokenData.metadata);
              // Validate it's an object
              if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                metadata = parsed;
              } else {
                metadata = { name: `Token #${tokenId}` };
              }
            } catch {
              metadata = { name: `Token #${tokenId}` };
            }
            
            return {
              id: Number(tokenId),
              name: metadata.name || `Token #${tokenId}`,
              balance: Number(balance),
            };
          }
          return null;
        } catch (error) {
          return null;
        }
      });

      const results = await Promise.all(tokenPromises);
      const validTokens = results.filter((token): token is { id: number; name: string; balance: number } => token !== null);
      setAvailableTokens(validTokens);
    } catch (error) {
      console.error("Error loading tokens:", error);
    } finally {
      setLoadingTokens(false);
    }
  };

  // Add new metadata field
  const addMetadataField = () => {
    const newField: MetadataField = {
      id: Date.now().toString(),
      label: "",
      value: "",
    };
    setMetadataFields([...metadataFields, newField]);
  };

  // Remove metadata field
  const removeMetadataField = (id: string) => {
    if (metadataFields.length <= 1) {
      toast.error("At least one metadata field is required");
      return;
    }
    setMetadataFields(metadataFields.filter((field) => field.id !== id));
  };

  // Update metadata field with length validation
  const updateMetadataField = (id: string, field: "label" | "value", value: string) => {
    // Enforce maximum length
    const maxLength = field === "label" 
      ? MAX_INPUT_LENGTHS.METADATA_LABEL 
      : MAX_INPUT_LENGTHS.METADATA_VALUE;
    
    if (value.length > maxLength) {
      toast.error(`${field === "label" ? "Label" : "Value"} must be ${maxLength} characters or less`);
      return;
    }

    setMetadataFields(
      metadataFields.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  // Transform metadata fields to JSON with validation
  const transformMetadataToJSON = (): string => {
    const metadataObject: Record<string, string> = {};

    // Validate each field
    for (const field of metadataFields) {
      const processedLabel = field.label.trim().toLowerCase();
      const processedValue = field.value.trim();

      // Skip empty fields
      if (!processedLabel || !processedValue) {
        continue;
      }

      // Validate field
      const validation = validateMetadataField(processedLabel, processedValue);
      if (!validation.valid) {
        throw new Error(validation.error || "Invalid metadata field");
      }

      metadataObject[processedLabel] = processedValue;
    }

    // Validate that we have at least one field
    if (Object.keys(metadataObject).length === 0) {
      throw new Error("At least one metadata field with both label and value is required");
    }

    const metadataJson = JSON.stringify(metadataObject);

    // Validate total length
    const totalValidation = validateMetadataTotal(metadataJson);
    if (!totalValidation.valid) {
      throw new Error(totalValidation.error || "Metadata too large");
    }

    return metadataJson;
  };

  const onSubmit = async (data: CreateTokenForm) => {
    if (!account || !signer) {
      toast.error("Please connect your wallet");
      return;
    }

    // Transform metadata fields to JSON
    let metadata: string;
    try {
      metadata = transformMetadataToJSON();
    } catch (error: any) {
      toast.error(error.message || "Invalid metadata format");
      return;
    }

    const parentIdNum = parseInt(data.parentId) || 0;
    const amount = parseInt(data.amount);

    if (amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    setIsSubmitting(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      // If parentId is provided, check balance
      if (parentIdNum > 0) {
        const balance = await contract.getTokenBalance(parentIdNum, account);
        if (Number(balance) < amount) {
          toast.error(`Insufficient balance. You have ${Number(balance)} tokens.`);
          setIsSubmitting(false);
          return;
        }
      }

      toast.info("Creating token... Please confirm the transaction in MetaMask.");

      const tx = await contract.createProductToken(metadata, parentIdNum, amount);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Token created successfully!");
      
      router.push('/token');
    } catch (error: any) {
      console.error("Error creating token:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Insufficient parent token balance")) {
        toast.error("Insufficient balance of parent token");
      } else if (error.message?.includes("Parent token does not exist")) {
        toast.error("Parent token does not exist");
      } else {
        toast.error("Failed to create token. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  // Show loading state while checking permissions
  if (canCreateTokens === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Verifying permissions...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // If user cannot create tokens, don't render the form (redirect should happen)
  if (!canCreateTokens) {
    return null;
  }

  const selectedParent = availableTokens.find(t => t.id === parseInt(parentId));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Create Product Token
            </h1>
            <p className="text-muted-foreground mt-2">
              Create a new product token in the supply chain
            </p>
          </div>
          <Link href="/token">
            <Button variant="outline">Back to Tokens</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Token Information</CardTitle>
            <CardDescription>
              Fill in the details to create a new product token
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Dynamic Metadata Fields */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>
                    Product Metadata <span className="text-red-500">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMetadataField}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Field
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {metadataFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-start">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor={`label-${field.id}`} className="text-xs">
                            Label
                          </Label>
                          <Input
                            id={`label-${field.id}`}
                            type="text"
                            value={field.label}
                            onChange={(e) => updateMetadataField(field.id, "label", e.target.value)}
                            placeholder="e.g., name, category, brand"
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`value-${field.id}`} className="text-xs">
                            Value
                          </Label>
                          <Input
                            id={`value-${field.id}`}
                            type="text"
                            value={field.value}
                            onChange={(e) => updateMetadataField(field.id, "value", e.target.value)}
                            placeholder="Enter value"
                            className="text-sm"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMetadataField(field.id)}
                        className="mt-6 h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50"
                        disabled={metadataFields.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground mb-2">
                    <strong>Note:</strong> Labels will be automatically converted to lowercase and trimmed. Values will be trimmed.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    At least one field with both label and value is required.
                  </p>
                </div>

                {/* Preview JSON */}
                {metadataFields.some((f) => f.label.trim() && f.value.trim()) && (
                  <div className="p-3 bg-muted rounded-md">
                    <Label className="text-xs mb-2 block">JSON Preview:</Label>
                    <pre className="text-xs font-mono overflow-auto max-h-32 bg-background p-2 rounded border">
                      {(() => {
                        try {
                          const preview = transformMetadataToJSON();
                          return JSON.stringify(JSON.parse(preview), null, 2);
                        } catch {
                          return "Invalid metadata";
                        }
                      })()}
                    </pre>
                  </div>
                )}
              </div>

              {/* Parent Token */}
              <div className="space-y-2">
                <Label htmlFor="parentId">Parent Token (Optional)</Label>
                <select
                  id="parentId"
                  {...register("parentId")}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="0">No parent (new product)</option>
                  {loadingTokens ? (
                    <option disabled>Loading tokens...</option>
                  ) : availableTokens.length === 0 ? (
                    <option disabled>No tokens available</option>
                  ) : (
                    availableTokens.map((token) => (
                      <option key={token.id} value={token.id.toString()}>
                        {token.name} (ID: #{token.id}, Balance: {token.balance})
                      </option>
                    ))
                  )}
                </select>
                {selectedParent && (
                  <p className="text-xs text-muted-foreground">
                    Available balance: {selectedParent.balance} tokens
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Select a parent token if this product is created from another product
                </p>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Initial Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  max={parentId !== "0" && selectedParent ? selectedParent.balance : undefined}
                  {...register("amount", {
                    required: "Amount is required",
                    min: { value: 1, message: "Amount must be at least 1" },
                    validate: (value) => {
                      const balance = parentId !== "0" && selectedParent ? selectedParent.balance : undefined;
                      const validation = validateTokenAmount(value, balance);
                      if (!validation.valid) {
                        return validation.error || "Invalid amount";
                      }
                      return true;
                    },
                  })}
                  placeholder="Enter amount"
                />
                {errors.amount && (
                  <p className="text-sm text-red-500">{errors.amount.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Number of tokens to create initially
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Link href="/token" className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Create Token"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


```


Revisando errores de lint en los archivos modificados:



Optimizando la función `canUserCreateTokens` para evitar iterar sobre todas las transferencias. Revisando si hay una forma más eficiente:



Buscando otras referencias al botón de crear tokens:



Revisando y protegiendo la página de tokens que también tiene botones para crear tokens:



Protegiendo los botones de crear tokens en esta página:


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { canUserCreateTokens } from "@/lib/utils";
import { useCallback } from "react";

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
  balance: number;
}

type TokenView = "created" | "transferred";

export default function TokenListPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [allTokens, setAllTokens] = useState<ProductToken[]>([]);
  const [balances, setBalances] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [allTokenIds, setAllTokenIds] = useState<number[]>([]);
  const [activeView, setActiveView] = useState<TokenView>("created");
  const [canCreateTokens, setCanCreateTokens] = useState(false);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    loadTokens();
  }, [account, isConnected, isApproved, router]);

  const loadTokens = async () => {
    if (!account || !provider) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Get all product token IDs
      const tokenIds: bigint[] = await contract.getAllProductTokenIds();
      const tokenIdsArray = tokenIds.map(id => Number(id));
      setAllTokenIds(tokenIdsArray);

      // Load token details and balances
      const tokenPromises = tokenIdsArray.map(async (tokenId) => {
        try {
          const tokenData = await contract.getProductToken(tokenId);
          const balance = await contract.getTokenBalance(tokenId, account);
          
          return {
            id: tokenId,
            creator: tokenData.creator,
            metadata: tokenData.metadata,
            parentId: Number(tokenData.parentId),
            timestamp: Number(tokenData.timestamp),
            isActive: tokenData.isActive,
            balance: Number(balance),
          };
        } catch (error) {
          console.error(`Error loading token ${tokenId}:`, error);
          return null;
        }
      });

      const tokenResults = await Promise.all(tokenPromises);
      const validTokens = tokenResults.filter(
        (token): token is ProductToken & { balance: number } => token !== null
      );

      // Store all tokens with their balances
      setAllTokens(validTokens);
      const balanceMap: Record<number, number> = {};
      validTokens.forEach(token => {
        balanceMap[token.id] = token.balance;
      });
      setBalances(balanceMap);
    } catch (error) {
      console.error("Error loading tokens:", error);
      toast.error("Failed to load tokens");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  const parseMetadata = (metadata: string) => {
    // Safe JSON parsing with fallback
    try {
      const parsed = JSON.parse(metadata);
      // Basic validation - ensure it's an object
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Invalid JSON - return safe fallback
    }
    return { name: "Unknown Product" };
  };

  // Filter tokens based on active view
  const getFilteredTokens = (): ProductToken[] => {
    if (!account) return [];
    
    if (activeView === "created") {
      // Tokens created by the user (may have parentId)
      return allTokens.filter(
        (token) => token.creator.toLowerCase() === account.toLowerCase()
      );
    } else {
      // Tokens transferred to the user (have balance but user is not creator)
      return allTokens.filter(
        (token) => 
          token.balance > 0 && 
          token.creator.toLowerCase() !== account.toLowerCase()
      );
    }
  };

  const filteredTokens = getFilteredTokens();
  const createdCount = allTokens.filter(
    (token) => token.creator.toLowerCase() === account?.toLowerCase()
  ).length;
  const transferredCount = allTokens.filter(
    (token) => 
      token.balance > 0 && 
      token.creator.toLowerCase() !== account?.toLowerCase()
  ).length;

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Product Tokens
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your product tokens and track your inventory
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/token/create">
              <Button>Create New Token</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>

        {/* View Toggle */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex gap-2">
              <Button
                variant={activeView === "created" ? "default" : "outline"}
                onClick={() => setActiveView("created")}
                className="flex-1"
              >
                Tokens Created by Me
                {createdCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {createdCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant={activeView === "transferred" ? "default" : "outline"}
                onClick={() => setActiveView("transferred")}
                className="flex-1"
              >
                Tokens Transferred to Me
                {transferredCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {transferredCount}
                  </Badge>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading tokens...</div>
            </CardContent>
          </Card>
        ) : filteredTokens.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  {activeView === "created" 
                    ? "You haven't created any tokens yet" 
                    : "No tokens have been transferred to you yet"}
                </p>
                {activeView === "created" && (
                  <Link href="/token/create">
                    <Button>Create Your First Token</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                {activeView === "created" 
                  ? `Showing ${filteredTokens.length} token${filteredTokens.length !== 1 ? 's' : ''} created by you`
                  : `Showing ${filteredTokens.length} token${filteredTokens.length !== 1 ? 's' : ''} transferred to you`}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTokens.map((token) => {
                const metadata = parseMetadata(token.metadata);
                const balance = balances[token.id] || 0;
                const isOwner = token.creator.toLowerCase() === account?.toLowerCase();

              return (
                <Card key={token.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">
                          {metadata.name || `Token #${token.id}`}
                        </CardTitle>
                        <CardDescription>Token ID: #{token.id}</CardDescription>
                      </div>
                      {isOwner && (
                        <Badge variant="outline">Creator</Badge>
                      )}
                      {!isOwner && activeView === "transferred" && (
                        <Badge className="bg-blue-500">Received</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          {activeView === "created" ? "Total Supply" : "Your Balance"}
                        </div>
                        <div className="text-2xl font-bold">{balance}</div>
                      </div>
                      
                      {token.parentId > 0 && activeView === "created" && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Created from Parent Token
                          </div>
                          <Link href={`/token/${token.parentId}`}>
                            <Button variant="link" className="p-0 h-auto">
                              Token #{token.parentId}
                            </Button>
                          </Link>
                        </div>
                      )}

                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Created
                        </div>
                        <div className="text-sm">{formatDate(token.timestamp)}</div>
                      </div>

                      {activeView === "transferred" && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Received from
                          </div>
                          <div className="text-sm font-mono">{formatAddress(token.creator)}</div>
                        </div>
                      )}
                      {activeView === "created" && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Created by
                          </div>
                          <div className="text-sm font-mono">{formatAddress(token.creator)}</div>
                          {isOwner && (
                            <Badge variant="outline" className="mt-1 text-xs">You</Badge>
                          )}
                        </div>
                      )}

                      {metadata.description && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Description
                          </div>
                          <div className="text-sm">{metadata.description}</div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Link href={`/token/${token.id}`} className="flex-1">
                          <Button variant="outline" className="w-full">
                            View Details
                          </Button>
                        </Link>
                        {balance > 0 && user?.role !== "Consumer" && (
                          <Link href={`/token/${token.id}/transfer`} className="flex-1">
                            <Button className="w-full">
                              Transfer
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { canUserCreateTokens } from "@/lib/utils";
import { useCallback } from "react";

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
  balance: number;
}

type TokenView = "created" | "transferred";

export default function TokenListPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [allTokens, setAllTokens] = useState<ProductToken[]>([]);
  const [balances, setBalances] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [allTokenIds, setAllTokenIds] = useState<number[]>([]);
  const [activeView, setActiveView] = useState<TokenView>("created");
  const [canCreateTokens, setCanCreateTokens] = useState(false);

  const loadCanCreateTokens = useCallback(async () => {
    if (!account || !provider || !isApproved || !user) return;

    try {
      const canCreate = await canUserCreateTokens(
        user.role,
        provider,
        account,
        contractConfig.address,
        contractConfig.abi
      );
      setCanCreateTokens(canCreate);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error loading can create tokens:", error);
      }
      setCanCreateTokens(false);
    }
  }, [account, provider, isApproved, user]);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    loadTokens();
    loadCanCreateTokens();
  }, [account, isConnected, isApproved, router, loadCanCreateTokens]);

  const loadTokens = async () => {
    if (!account || !provider) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Get all product token IDs
      const tokenIds: bigint[] = await contract.getAllProductTokenIds();
      const tokenIdsArray = tokenIds.map(id => Number(id));
      setAllTokenIds(tokenIdsArray);

      // Load token details and balances
      const tokenPromises = tokenIdsArray.map(async (tokenId) => {
        try {
          const tokenData = await contract.getProductToken(tokenId);
          const balance = await contract.getTokenBalance(tokenId, account);
          
          return {
            id: tokenId,
            creator: tokenData.creator,
            metadata: tokenData.metadata,
            parentId: Number(tokenData.parentId),
            timestamp: Number(tokenData.timestamp),
            isActive: tokenData.isActive,
            balance: Number(balance),
          };
        } catch (error) {
          console.error(`Error loading token ${tokenId}:`, error);
          return null;
        }
      });

      const tokenResults = await Promise.all(tokenPromises);
      const validTokens = tokenResults.filter(
        (token): token is ProductToken & { balance: number } => token !== null
      );

      // Store all tokens with their balances
      setAllTokens(validTokens);
      const balanceMap: Record<number, number> = {};
      validTokens.forEach(token => {
        balanceMap[token.id] = token.balance;
      });
      setBalances(balanceMap);
    } catch (error) {
      console.error("Error loading tokens:", error);
      toast.error("Failed to load tokens");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  const parseMetadata = (metadata: string) => {
    // Safe JSON parsing with fallback
    try {
      const parsed = JSON.parse(metadata);
      // Basic validation - ensure it's an object
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Invalid JSON - return safe fallback
    }
    return { name: "Unknown Product" };
  };

  // Filter tokens based on active view
  const getFilteredTokens = (): ProductToken[] => {
    if (!account) return [];
    
    if (activeView === "created") {
      // Tokens created by the user (may have parentId)
      return allTokens.filter(
        (token) => token.creator.toLowerCase() === account.toLowerCase()
      );
    } else {
      // Tokens transferred to the user (have balance but user is not creator)
      return allTokens.filter(
        (token) => 
          token.balance > 0 && 
          token.creator.toLowerCase() !== account.toLowerCase()
      );
    }
  };

  const filteredTokens = getFilteredTokens();
  const createdCount = allTokens.filter(
    (token) => token.creator.toLowerCase() === account?.toLowerCase()
  ).length;
  const transferredCount = allTokens.filter(
    (token) => 
      token.balance > 0 && 
      token.creator.toLowerCase() !== account?.toLowerCase()
  ).length;

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Product Tokens
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your product tokens and track your inventory
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/token/create">
              <Button>Create New Token</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>

        {/* View Toggle */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex gap-2">
              <Button
                variant={activeView === "created" ? "default" : "outline"}
                onClick={() => setActiveView("created")}
                className="flex-1"
              >
                Tokens Created by Me
                {createdCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {createdCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant={activeView === "transferred" ? "default" : "outline"}
                onClick={() => setActiveView("transferred")}
                className="flex-1"
              >
                Tokens Transferred to Me
                {transferredCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {transferredCount}
                  </Badge>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading tokens...</div>
            </CardContent>
          </Card>
        ) : filteredTokens.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  {activeView === "created" 
                    ? "You haven't created any tokens yet" 
                    : "No tokens have been transferred to you yet"}
                </p>
                {activeView === "created" && (
                  <Link href="/token/create">
                    <Button>Create Your First Token</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                {activeView === "created" 
                  ? `Showing ${filteredTokens.length} token${filteredTokens.length !== 1 ? 's' : ''} created by you`
                  : `Showing ${filteredTokens.length} token${filteredTokens.length !== 1 ? 's' : ''} transferred to you`}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTokens.map((token) => {
                const metadata = parseMetadata(token.metadata);
                const balance = balances[token.id] || 0;
                const isOwner = token.creator.toLowerCase() === account?.toLowerCase();

              return (
                <Card key={token.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">
                          {metadata.name || `Token #${token.id}`}
                        </CardTitle>
                        <CardDescription>Token ID: #{token.id}</CardDescription>
                      </div>
                      {isOwner && (
                        <Badge variant="outline">Creator</Badge>
                      )}
                      {!isOwner && activeView === "transferred" && (
                        <Badge className="bg-blue-500">Received</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          {activeView === "created" ? "Total Supply" : "Your Balance"}
                        </div>
                        <div className="text-2xl font-bold">{balance}</div>
                      </div>
                      
                      {token.parentId > 0 && activeView === "created" && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Created from Parent Token
                          </div>
                          <Link href={`/token/${token.parentId}`}>
                            <Button variant="link" className="p-0 h-auto">
                              Token #{token.parentId}
                            </Button>
                          </Link>
                        </div>
                      )}

                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Created
                        </div>
                        <div className="text-sm">{formatDate(token.timestamp)}</div>
                      </div>

                      {activeView === "transferred" && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Received from
                          </div>
                          <div className="text-sm font-mono">{formatAddress(token.creator)}</div>
                        </div>
                      )}
                      {activeView === "created" && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Created by
                          </div>
                          <div className="text-sm font-mono">{formatAddress(token.creator)}</div>
                          {isOwner && (
                            <Badge variant="outline" className="mt-1 text-xs">You</Badge>
                          )}
                        </div>
                      )}

                      {metadata.description && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Description
                          </div>
                          <div className="text-sm">{metadata.description}</div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Link href={`/token/${token.id}`} className="flex-1">
                          <Button variant="outline" className="w-full">
                            View Details
                          </Button>
                        </Link>
                        {balance > 0 && user?.role !== "Consumer" && (
                          <Link href={`/token/${token.id}/transfer`} className="flex-1">
                            <Button className="w-full">
                              Transfer
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { canUserCreateTokens } from "@/lib/utils";
import { useCallback } from "react";

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
  balance: number;
}

type TokenView = "created" | "transferred";

export default function TokenListPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [allTokens, setAllTokens] = useState<ProductToken[]>([]);
  const [balances, setBalances] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [allTokenIds, setAllTokenIds] = useState<number[]>([]);
  const [activeView, setActiveView] = useState<TokenView>("created");
  const [canCreateTokens, setCanCreateTokens] = useState(false);

  const loadCanCreateTokens = useCallback(async () => {
    if (!account || !provider || !isApproved || !user) return;

    try {
      const canCreate = await canUserCreateTokens(
        user.role,
        provider,
        account,
        contractConfig.address,
        contractConfig.abi
      );
      setCanCreateTokens(canCreate);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error loading can create tokens:", error);
      }
      setCanCreateTokens(false);
    }
  }, [account, provider, isApproved, user]);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    loadTokens();
    loadCanCreateTokens();
  }, [account, isConnected, isApproved, router, loadCanCreateTokens]);

  const loadTokens = async () => {
    if (!account || !provider) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Get all product token IDs
      const tokenIds: bigint[] = await contract.getAllProductTokenIds();
      const tokenIdsArray = tokenIds.map(id => Number(id));
      setAllTokenIds(tokenIdsArray);

      // Load token details and balances
      const tokenPromises = tokenIdsArray.map(async (tokenId) => {
        try {
          const tokenData = await contract.getProductToken(tokenId);
          const balance = await contract.getTokenBalance(tokenId, account);
          
          return {
            id: tokenId,
            creator: tokenData.creator,
            metadata: tokenData.metadata,
            parentId: Number(tokenData.parentId),
            timestamp: Number(tokenData.timestamp),
            isActive: tokenData.isActive,
            balance: Number(balance),
          };
        } catch (error) {
          console.error(`Error loading token ${tokenId}:`, error);
          return null;
        }
      });

      const tokenResults = await Promise.all(tokenPromises);
      const validTokens = tokenResults.filter(
        (token): token is ProductToken & { balance: number } => token !== null
      );

      // Store all tokens with their balances
      setAllTokens(validTokens);
      const balanceMap: Record<number, number> = {};
      validTokens.forEach(token => {
        balanceMap[token.id] = token.balance;
      });
      setBalances(balanceMap);
    } catch (error) {
      console.error("Error loading tokens:", error);
      toast.error("Failed to load tokens");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  const parseMetadata = (metadata: string) => {
    // Safe JSON parsing with fallback
    try {
      const parsed = JSON.parse(metadata);
      // Basic validation - ensure it's an object
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Invalid JSON - return safe fallback
    }
    return { name: "Unknown Product" };
  };

  // Filter tokens based on active view
  const getFilteredTokens = (): ProductToken[] => {
    if (!account) return [];
    
    if (activeView === "created") {
      // Tokens created by the user (may have parentId)
      return allTokens.filter(
        (token) => token.creator.toLowerCase() === account.toLowerCase()
      );
    } else {
      // Tokens transferred to the user (have balance but user is not creator)
      return allTokens.filter(
        (token) => 
          token.balance > 0 && 
          token.creator.toLowerCase() !== account.toLowerCase()
      );
    }
  };

  const filteredTokens = getFilteredTokens();
  const createdCount = allTokens.filter(
    (token) => token.creator.toLowerCase() === account?.toLowerCase()
  ).length;
  const transferredCount = allTokens.filter(
    (token) => 
      token.balance > 0 && 
      token.creator.toLowerCase() !== account?.toLowerCase()
  ).length;

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Product Tokens
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your product tokens and track your inventory
            </p>
          </div>
          <div className="flex gap-2">
            {canCreateTokens && (
              <Link href="/token/create">
                <Button>Create New Token</Button>
              </Link>
            )}
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>

        {/* View Toggle */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex gap-2">
              <Button
                variant={activeView === "created" ? "default" : "outline"}
                onClick={() => setActiveView("created")}
                className="flex-1"
              >
                Tokens Created by Me
                {createdCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {createdCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant={activeView === "transferred" ? "default" : "outline"}
                onClick={() => setActiveView("transferred")}
                className="flex-1"
              >
                Tokens Transferred to Me
                {transferredCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {transferredCount}
                  </Badge>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading tokens...</div>
            </CardContent>
          </Card>
        ) : filteredTokens.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  {activeView === "created" 
                    ? "You haven't created any tokens yet" 
                    : "No tokens have been transferred to you yet"}
                </p>
                {activeView === "created" && (
                  <Link href="/token/create">
                    <Button>Create Your First Token</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                {activeView === "created" 
                  ? `Showing ${filteredTokens.length} token${filteredTokens.length !== 1 ? 's' : ''} created by you`
                  : `Showing ${filteredTokens.length} token${filteredTokens.length !== 1 ? 's' : ''} transferred to you`}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTokens.map((token) => {
                const metadata = parseMetadata(token.metadata);
                const balance = balances[token.id] || 0;
                const isOwner = token.creator.toLowerCase() === account?.toLowerCase();

              return (
                <Card key={token.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">
                          {metadata.name || `Token #${token.id}`}
                        </CardTitle>
                        <CardDescription>Token ID: #{token.id}</CardDescription>
                      </div>
                      {isOwner && (
                        <Badge variant="outline">Creator</Badge>
                      )}
                      {!isOwner && activeView === "transferred" && (
                        <Badge className="bg-blue-500">Received</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          {activeView === "created" ? "Total Supply" : "Your Balance"}
                        </div>
                        <div className="text-2xl font-bold">{balance}</div>
                      </div>
                      
                      {token.parentId > 0 && activeView === "created" && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Created from Parent Token
                          </div>
                          <Link href={`/token/${token.parentId}`}>
                            <Button variant="link" className="p-0 h-auto">
                              Token #{token.parentId}
                            </Button>
                          </Link>
                        </div>
                      )}

                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Created
                        </div>
                        <div className="text-sm">{formatDate(token.timestamp)}</div>
                      </div>

                      {activeView === "transferred" && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Received from
                          </div>
                          <div className="text-sm font-mono">{formatAddress(token.creator)}</div>
                        </div>
                      )}
                      {activeView === "created" && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Created by
                          </div>
                          <div className="text-sm font-mono">{formatAddress(token.creator)}</div>
                          {isOwner && (
                            <Badge variant="outline" className="mt-1 text-xs">You</Badge>
                          )}
                        </div>
                      )}

                      {metadata.description && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Description
                          </div>
                          <div className="text-sm">{metadata.description}</div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Link href={`/token/${token.id}`} className="flex-1">
                          <Button variant="outline" className="w-full">
                            View Details
                          </Button>
                        </Link>
                        {balance > 0 && user?.role !== "Consumer" && (
                          <Link href={`/token/${token.id}/transfer`} className="flex-1">
                            <Button className="w-full">
                              Transfer
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { canUserCreateTokens } from "@/lib/utils";
import { useCallback } from "react";

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
  balance: number;
}

type TokenView = "created" | "transferred";

export default function TokenListPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [allTokens, setAllTokens] = useState<ProductToken[]>([]);
  const [balances, setBalances] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [allTokenIds, setAllTokenIds] = useState<number[]>([]);
  const [activeView, setActiveView] = useState<TokenView>("created");
  const [canCreateTokens, setCanCreateTokens] = useState(false);

  const loadCanCreateTokens = useCallback(async () => {
    if (!account || !provider || !isApproved || !user) return;

    try {
      const canCreate = await canUserCreateTokens(
        user.role,
        provider,
        account,
        contractConfig.address,
        contractConfig.abi
      );
      setCanCreateTokens(canCreate);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error loading can create tokens:", error);
      }
      setCanCreateTokens(false);
    }
  }, [account, provider, isApproved, user]);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    loadTokens();
    loadCanCreateTokens();
  }, [account, isConnected, isApproved, router, loadCanCreateTokens]);

  const loadTokens = async () => {
    if (!account || !provider) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Get all product token IDs
      const tokenIds: bigint[] = await contract.getAllProductTokenIds();
      const tokenIdsArray = tokenIds.map(id => Number(id));
      setAllTokenIds(tokenIdsArray);

      // Load token details and balances
      const tokenPromises = tokenIdsArray.map(async (tokenId) => {
        try {
          const tokenData = await contract.getProductToken(tokenId);
          const balance = await contract.getTokenBalance(tokenId, account);
          
          return {
            id: tokenId,
            creator: tokenData.creator,
            metadata: tokenData.metadata,
            parentId: Number(tokenData.parentId),
            timestamp: Number(tokenData.timestamp),
            isActive: tokenData.isActive,
            balance: Number(balance),
          };
        } catch (error) {
          console.error(`Error loading token ${tokenId}:`, error);
          return null;
        }
      });

      const tokenResults = await Promise.all(tokenPromises);
      const validTokens = tokenResults.filter(
        (token): token is ProductToken & { balance: number } => token !== null
      );

      // Store all tokens with their balances
      setAllTokens(validTokens);
      const balanceMap: Record<number, number> = {};
      validTokens.forEach(token => {
        balanceMap[token.id] = token.balance;
      });
      setBalances(balanceMap);
    } catch (error) {
      console.error("Error loading tokens:", error);
      toast.error("Failed to load tokens");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  const parseMetadata = (metadata: string) => {
    // Safe JSON parsing with fallback
    try {
      const parsed = JSON.parse(metadata);
      // Basic validation - ensure it's an object
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Invalid JSON - return safe fallback
    }
    return { name: "Unknown Product" };
  };

  // Filter tokens based on active view
  const getFilteredTokens = (): ProductToken[] => {
    if (!account) return [];
    
    if (activeView === "created") {
      // Tokens created by the user (may have parentId)
      return allTokens.filter(
        (token) => token.creator.toLowerCase() === account.toLowerCase()
      );
    } else {
      // Tokens transferred to the user (have balance but user is not creator)
      return allTokens.filter(
        (token) => 
          token.balance > 0 && 
          token.creator.toLowerCase() !== account.toLowerCase()
      );
    }
  };

  const filteredTokens = getFilteredTokens();
  const createdCount = allTokens.filter(
    (token) => token.creator.toLowerCase() === account?.toLowerCase()
  ).length;
  const transferredCount = allTokens.filter(
    (token) => 
      token.balance > 0 && 
      token.creator.toLowerCase() !== account?.toLowerCase()
  ).length;

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Product Tokens
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your product tokens and track your inventory
            </p>
          </div>
          <div className="flex gap-2">
            {canCreateTokens && (
              <Link href="/token/create">
                <Button>Create New Token</Button>
              </Link>
            )}
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>

        {/* View Toggle */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex gap-2">
              <Button
                variant={activeView === "created" ? "default" : "outline"}
                onClick={() => setActiveView("created")}
                className="flex-1"
              >
                Tokens Created by Me
                {createdCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {createdCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant={activeView === "transferred" ? "default" : "outline"}
                onClick={() => setActiveView("transferred")}
                className="flex-1"
              >
                Tokens Transferred to Me
                {transferredCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {transferredCount}
                  </Badge>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading tokens...</div>
            </CardContent>
          </Card>
        ) : filteredTokens.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  {activeView === "created" 
                    ? "You haven't created any tokens yet" 
                    : "No tokens have been transferred to you yet"}
                </p>
                {activeView === "created" && canCreateTokens && (
                  <Link href="/token/create">
                    <Button>Create Your First Token</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                {activeView === "created" 
                  ? `Showing ${filteredTokens.length} token${filteredTokens.length !== 1 ? 's' : ''} created by you`
                  : `Showing ${filteredTokens.length} token${filteredTokens.length !== 1 ? 's' : ''} transferred to you`}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTokens.map((token) => {
                const metadata = parseMetadata(token.metadata);
                const balance = balances[token.id] || 0;
                const isOwner = token.creator.toLowerCase() === account?.toLowerCase();

              return (
                <Card key={token.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">
                          {metadata.name || `Token #${token.id}`}
                        </CardTitle>
                        <CardDescription>Token ID: #{token.id}</CardDescription>
                      </div>
                      {isOwner && (
                        <Badge variant="outline">Creator</Badge>
                      )}
                      {!isOwner && activeView === "transferred" && (
                        <Badge className="bg-blue-500">Received</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          {activeView === "created" ? "Total Supply" : "Your Balance"}
                        </div>
                        <div className="text-2xl font-bold">{balance}</div>
                      </div>
                      
                      {token.parentId > 0 && activeView === "created" && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Created from Parent Token
                          </div>
                          <Link href={`/token/${token.parentId}`}>
                            <Button variant="link" className="p-0 h-auto">
                              Token #{token.parentId}
                            </Button>
                          </Link>
                        </div>
                      )}

                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Created
                        </div>
                        <div className="text-sm">{formatDate(token.timestamp)}</div>
                      </div>

                      {activeView === "transferred" && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Received from
                          </div>
                          <div className="text-sm font-mono">{formatAddress(token.creator)}</div>
                        </div>
                      )}
                      {activeView === "created" && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Created by
                          </div>
                          <div className="text-sm font-mono">{formatAddress(token.creator)}</div>
                          {isOwner && (
                            <Badge variant="outline" className="mt-1 text-xs">You</Badge>
                          )}
                        </div>
                      )}

                      {metadata.description && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Description
                          </div>
                          <div className="text-sm">{metadata.description}</div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Link href={`/token/${token.id}`} className="flex-1">
                          <Button variant="outline" className="w-full">
                            View Details
                          </Button>
                        </Link>
                        {balance > 0 && user?.role !== "Consumer" && (
                          <Link href={`/token/${token.id}/transfer`} className="flex-1">
                            <Button className="w-full">
                              Transfer
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}


```


Revisando errores de lint:



Combinando los imports de React:


```typescriptreact
"use client";

import { useEffect, useState, useCallback } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { canUserCreateTokens } from "@/lib/utils";

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
  balance: number;
}

type TokenView = "created" | "transferred";

export default function TokenListPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [allTokens, setAllTokens] = useState<ProductToken[]>([]);
  const [balances, setBalances] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [allTokenIds, setAllTokenIds] = useState<number[]>([]);
  const [activeView, setActiveView] = useState<TokenView>("created");
  const [canCreateTokens, setCanCreateTokens] = useState(false);

  const loadCanCreateTokens = useCallback(async () => {
    if (!account || !provider || !isApproved || !user) return;

    try {
      const canCreate = await canUserCreateTokens(
        user.role,
        provider,
        account,
        contractConfig.address,
        contractConfig.abi
      );
      setCanCreateTokens(canCreate);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error loading can create tokens:", error);
      }
      setCanCreateTokens(false);
    }
  }, [account, provider, isApproved, user]);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    loadTokens();
    loadCanCreateTokens();
  }, [account, isConnected, isApproved, router, loadCanCreateTokens]);

  const loadTokens = async () => {
    if (!account || !provider) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Get all product token IDs
      const tokenIds: bigint[] = await contract.getAllProductTokenIds();
      const tokenIdsArray = tokenIds.map(id => Number(id));
      setAllTokenIds(tokenIdsArray);

      // Load token details and balances
      const tokenPromises = tokenIdsArray.map(async (tokenId) => {
        try {
          const tokenData = await contract.getProductToken(tokenId);
          const balance = await contract.getTokenBalance(tokenId, account);
          
          return {
            id: tokenId,
            creator: tokenData.creator,
            metadata: tokenData.metadata,
            parentId: Number(tokenData.parentId),
            timestamp: Number(tokenData.timestamp),
            isActive: tokenData.isActive,
            balance: Number(balance),
          };
        } catch (error) {
          console.error(`Error loading token ${tokenId}:`, error);
          return null;
        }
      });

      const tokenResults = await Promise.all(tokenPromises);
      const validTokens = tokenResults.filter(
        (token): token is ProductToken & { balance: number } => token !== null
      );

      // Store all tokens with their balances
      setAllTokens(validTokens);
      const balanceMap: Record<number, number> = {};
      validTokens.forEach(token => {
        balanceMap[token.id] = token.balance;
      });
      setBalances(balanceMap);
    } catch (error) {
      console.error("Error loading tokens:", error);
      toast.error("Failed to load tokens");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  const parseMetadata = (metadata: string) => {
    // Safe JSON parsing with fallback
    try {
      const parsed = JSON.parse(metadata);
      // Basic validation - ensure it's an object
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Invalid JSON - return safe fallback
    }
    return { name: "Unknown Product" };
  };

  // Filter tokens based on active view
  const getFilteredTokens = (): ProductToken[] => {
    if (!account) return [];
    
    if (activeView === "created") {
      // Tokens created by the user (may have parentId)
      return allTokens.filter(
        (token) => token.creator.toLowerCase() === account.toLowerCase()
      );
    } else {
      // Tokens transferred to the user (have balance but user is not creator)
      return allTokens.filter(
        (token) => 
          token.balance > 0 && 
          token.creator.toLowerCase() !== account.toLowerCase()
      );
    }
  };

  const filteredTokens = getFilteredTokens();
  const createdCount = allTokens.filter(
    (token) => token.creator.toLowerCase() === account?.toLowerCase()
  ).length;
  const transferredCount = allTokens.filter(
    (token) => 
      token.balance > 0 && 
      token.creator.toLowerCase() !== account?.toLowerCase()
  ).length;

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Product Tokens
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your product tokens and track your inventory
            </p>
          </div>
          <div className="flex gap-2">
            {canCreateTokens && (
              <Link href="/token/create">
                <Button>Create New Token</Button>
              </Link>
            )}
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>

        {/* View Toggle */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex gap-2">
              <Button
                variant={activeView === "created" ? "default" : "outline"}
                onClick={() => setActiveView("created")}
                className="flex-1"
              >
                Tokens Created by Me
                {createdCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {createdCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant={activeView === "transferred" ? "default" : "outline"}
                onClick={() => setActiveView("transferred")}
                className="flex-1"
              >
                Tokens Transferred to Me
                {transferredCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {transferredCount}
                  </Badge>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading tokens...</div>
            </CardContent>
          </Card>
        ) : filteredTokens.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  {activeView === "created" 
                    ? "You haven't created any tokens yet" 
                    : "No tokens have been transferred to you yet"}
                </p>
                {activeView === "created" && canCreateTokens && (
                  <Link href="/token/create">
                    <Button>Create Your First Token</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                {activeView === "created" 
                  ? `Showing ${filteredTokens.length} token${filteredTokens.length !== 1 ? 's' : ''} created by you`
                  : `Showing ${filteredTokens.length} token${filteredTokens.length !== 1 ? 's' : ''} transferred to you`}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTokens.map((token) => {
                const metadata = parseMetadata(token.metadata);
                const balance = balances[token.id] || 0;
                const isOwner = token.creator.toLowerCase() === account?.toLowerCase();

              return (
                <Card key={token.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">
                          {metadata.name || `Token #${token.id}`}
                        </CardTitle>
                        <CardDescription>Token ID: #{token.id}</CardDescription>
                      </div>
                      {isOwner && (
                        <Badge variant="outline">Creator</Badge>
                      )}
                      {!isOwner && activeView === "transferred" && (
                        <Badge className="bg-blue-500">Received</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          {activeView === "created" ? "Total Supply" : "Your Balance"}
                        </div>
                        <div className="text-2xl font-bold">{balance}</div>
                      </div>
                      
                      {token.parentId > 0 && activeView === "created" && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Created from Parent Token
                          </div>
                          <Link href={`/token/${token.parentId}`}>
                            <Button variant="link" className="p-0 h-auto">
                              Token #{token.parentId}
                            </Button>
                          </Link>
                        </div>
                      )}

                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Created
                        </div>
                        <div className="text-sm">{formatDate(token.timestamp)}</div>
                      </div>

                      {activeView === "transferred" && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Received from
                          </div>
                          <div className="text-sm font-mono">{formatAddress(token.creator)}</div>
                        </div>
                      )}
                      {activeView === "created" && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Created by
                          </div>
                          <div className="text-sm font-mono">{formatAddress(token.creator)}</div>
                          {isOwner && (
                            <Badge variant="outline" className="mt-1 text-xs">You</Badge>
                          )}
                        </div>
                      )}

                      {metadata.description && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Description
                          </div>
                          <div className="text-sm">{metadata.description}</div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Link href={`/token/${token.id}`} className="flex-1">
                          <Button variant="outline" className="w-full">
                            View Details
                          </Button>
                        </Link>
                        {balance > 0 && user?.role !== "Consumer" && (
                          <Link href={`/token/${token.id}/transfer`} className="flex-1">
                            <Button className="w-full">
                              Transfer
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}


```


## Resumen de cambios

1. Función helper (`web/src/lib/utils.ts`):
   - Añadida `canUserCreateTokens()` que verifica:
     - Producer: siempre puede crear tokens
     - Factory/Retailer: solo si han aceptado al menos una transferencia
     - Consumer: no puede crear tokens

2. Dashboard (`web/src/app/dashboard/page.tsx`):
   - El botón "Create Token" solo se muestra si el usuario puede crear tokens
   - Se verifica automáticamente al cargar el dashboard

3. Página de creación de tokens (`web/src/app/token/create/page.tsx`):
   - Verifica permisos al cargar
   - Redirige al dashboard si el usuario no puede crear tokens
   - Muestra un mensaje de error explicativo

4. Página de tokens (`web/src/app/token/page.tsx`):
   - Los botones "Create New Token" y "Create Your First Token" solo se muestran si el usuario puede crear tokens

El sistema ahora asegura que Factory y Retailer solo puedan crear tokens después de aceptar al menos una transferencia, siguiendo el flujo de la cadena de suministro donde el Producer es el único que puede crear tokens iniciales.

