# Execute point 10.1 from project plan
_Exported on 11/4/2025 at 20:28:23 EST from Cursor (2.0.54)_

---

**User**

execute point 10.1 and related from the @project-plan.md .

---

**Cursor**


Reviewing the codebase to understand the current structure, then implementing point 10.1 and related items.


Reading the dashboard and transfers pages to understand the current structure:


Reading the transfers page to understand its structure:


Checking the contract for a function to get all transfers:


Creating the initial todo list and starting implementation:


Removing "My Tokens" and "Create Token" from the admin dashboard, then creating the Header component and updating the transfers page:


```typescriptreact
"use client";

import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { formatAddress } from "@/lib/utils";

export default function Dashboard() {
  const { 
    isConnected, 
    account, 
    user, 
    isApproved, 
    disconnectWallet
  } = useWeb3();
  
  const router = useRouter();

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

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "bg-red-500";
      case "Producer":
        return "bg-blue-500";
      case "Factory":
        return "bg-green-500";
      case "Retailer":
        return "bg-yellow-500";
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
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Welcome to your Supply Chain Tracker dashboard
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/profile">Profile</Link>
            </Button>
            <Button onClick={disconnectWallet} variant="outline">
              Disconnect
            </Button>
          </div>
        </div>

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

Creating the Header component with role-based colors:


```typescriptreact
"use client";

import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatAddress } from "@/lib/utils";

interface HeaderProps {
  title: string;
  description?: string;
  backButton?: {
    href: string;
    label: string;
  };
  actionButtons?: React.ReactNode;
}

export function Header({ title, description, backButton, actionButtons }: HeaderProps) {
  const { 
    isConnected, 
    account, 
    user, 
    disconnectWallet 
  } = useWeb3();

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "bg-red-500";
      case "Producer":
        return "bg-blue-500";
      case "Factory":
        return "bg-green-500";
      case "Retailer":
        return "bg-blue-500"; // Blue for retailer
      case "Consumer":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const getHeaderBorderColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "border-red-500";
      case "Producer":
        return "border-blue-500";
      case "Factory":
        return "border-green-500";
      case "Retailer":
        return "border-blue-500";
      case "Consumer":
        return "border-purple-500";
      default:
        return "border-gray-500";
    }
  };

  const role = user?.role || "";

  return (
    <div className={`border-b-2 ${getHeaderBorderColor(role)} mb-8 pb-4`}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            {backButton && (
              <Link href={backButton.href}>
                <Button variant="ghost" size="sm">
                  ← {backButton.label}
                </Button>
              </Link>
            )}
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              {title}
            </h1>
            {user && (
              <Badge className={getRoleColor(role)}>
                {role}
              </Badge>
            )}
          </div>
          {description && (
            <p className="text-muted-foreground mt-2">
              {description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {actionButtons}
          {isConnected && account && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
              <span className="text-sm text-muted-foreground">Wallet:</span>
              <span className="text-sm font-mono font-medium">
                {formatAddress(account)}
              </span>
            </div>
          )}
          {isConnected && (
            <Button onClick={disconnectWallet} variant="outline" size="sm">
              Disconnect
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

```

Updating the transfers page to show all transfers for admins and adding a history view:


Updating the transfers page to support admin view (all transfers and history):


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
import { Header } from "@/components/Header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Transfer {
  id: number;
  tokenId: number;
  from: string;
  to: string;
  amount: number;
  status: number; // 0 = Pending, 1 = Accepted, 2 = Rejected
  requestTimestamp: number;
  responseTimestamp: number;
}

export default function TransfersPage() {
  const { account, provider, isConnected, isApproved } = useWeb3();
  const router = useRouter();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    loadTransfers();
  }, [account, isConnected, isApproved, router]);

  const loadTransfers = async () => {
    if (!account || !provider) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Get pending transfers for this user
      const pendingTransferIds: bigint[] = await contract.getPendingTransfers(account);
      
      // Load transfer details
      const transferPromises = pendingTransferIds.map(async (transferId) => {
        try {
          const transferData = await contract.getTransfer(Number(transferId));
          
          return {
            id: Number(transferId),
            tokenId: Number(transferData.tokenId),
            from: transferData.from,
            to: transferData.to,
            amount: Number(transferData.amount),
            status: Number(transferData.status),
            requestTimestamp: Number(transferData.requestTimestamp),
            responseTimestamp: Number(transferData.responseTimestamp),
          };
        } catch (error) {
          console.error(`Error loading transfer ${transferId}:`, error);
          return null;
        }
      });

      const transferResults = await Promise.all(transferPromises);
      const validTransfers = transferResults.filter(
        (transfer): transfer is Transfer => transfer !== null && transfer.status === 0
      );

      // Sort by timestamp (newest first)
      validTransfers.sort((a, b) => b.requestTimestamp - a.requestTimestamp);

      setTransfers(validTransfers);
    } catch (error) {
      console.error("Error loading transfers:", error);
      toast.error("Failed to load transfers");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 1:
        return <Badge className="bg-green-500">Accepted</Badge>;
      case 2:
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  if (!isConnected || !isApproved) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Pending Transfers
            </h1>
            <p className="text-muted-foreground mt-2">
              Review and manage incoming transfer requests
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading transfers...</div>
            </CardContent>
          </Card>
        ) : transfers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No pending transfers</p>
                <Link href="/token">
                  <Button>View Tokens</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Transfer Requests</CardTitle>
              <CardDescription>
                You have {transfers.length} pending transfer request(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transfer ID</TableHead>
                    <TableHead>Token ID</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-medium">#{transfer.id}</TableCell>
                      <TableCell>
                        <Link href={`/token/${transfer.tokenId}`}>
                          <Button variant="link" className="p-0 h-auto">
                            #{transfer.tokenId}
                          </Button>
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatAddress(transfer.from)}
                      </TableCell>
                      <TableCell className="font-semibold">{transfer.amount}</TableCell>
                      <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                      <TableCell className="text-sm">
                        {formatDate(transfer.requestTimestamp)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Link href={`/transfers/${transfer.id}`}>
                            <Button variant="outline" size="sm">
                              Review
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
import { Header } from "@/components/Header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Transfer {
  id: number;
  tokenId: number;
  from: string;
  to: string;
  amount: number;
  status: number; // 0 = Pending, 1 = Accepted, 2 = Rejected
  requestTimestamp: number;
  responseTimestamp: number;
}

export default function TransfersPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"pending" | "all" | "history">("pending");
  const isAdmin = user?.role === "Admin";

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    loadTransfers();
  }, [account, isConnected, isApproved, router, viewMode]);

  const loadTransfers = async () => {
    if (!account || !provider) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      let transferIds: bigint[] = [];

      if (isAdmin && (viewMode === "all" || viewMode === "history")) {
        // For admin: get all transfers
        const totalTransfers = Number(await contract.getTotalTransfers());
        transferIds = [];
        for (let i = 0; i < totalTransfers; i++) {
          try {
            const transferId = await contract.transferIds(i);
            transferIds.push(transferId);
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.error(`Error fetching transfer ID at index ${i}:`, error);
            }
          }
        }
      } else {
        // For regular users or admin pending view: get pending transfers
        transferIds = await contract.getPendingTransfers(account);
      }
      
      // Load transfer details
      const transferPromises = transferIds.map(async (transferId) => {
        try {
          const transferData = await contract.getTransfer(Number(transferId));
          
          return {
            id: Number(transferId),
            tokenId: Number(transferData.tokenId),
            from: transferData.from,
            to: transferData.to,
            amount: Number(transferData.amount),
            status: Number(transferData.status),
            requestTimestamp: Number(transferData.requestTimestamp),
            responseTimestamp: Number(transferData.responseTimestamp),
          };
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`Error loading transfer ${transferId}:`, error);
          }
          return null;
        }
      });

      const transferResults = await Promise.all(transferPromises);
      let validTransfers = transferResults.filter(
        (transfer): transfer is Transfer => transfer !== null
      );

      // Filter based on view mode
      if (!isAdmin || viewMode === "pending") {
        validTransfers = validTransfers.filter(transfer => transfer.status === 0);
      } else if (viewMode === "history") {
        validTransfers = validTransfers.filter(transfer => transfer.status !== 0);
      }

      // Sort by timestamp (newest first)
      validTransfers.sort((a, b) => b.requestTimestamp - a.requestTimestamp);

      setTransfers(validTransfers);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error loading transfers:", error);
      }
      toast.error("Failed to load transfers");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 1:
        return <Badge className="bg-green-500">Accepted</Badge>;
      case 2:
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  if (!isConnected || !isApproved) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Pending Transfers
            </h1>
            <p className="text-muted-foreground mt-2">
              Review and manage incoming transfer requests
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading transfers...</div>
            </CardContent>
          </Card>
        ) : transfers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No pending transfers</p>
                <Link href="/token">
                  <Button>View Tokens</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Transfer Requests</CardTitle>
              <CardDescription>
                You have {transfers.length} pending transfer request(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transfer ID</TableHead>
                    <TableHead>Token ID</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-medium">#{transfer.id}</TableCell>
                      <TableCell>
                        <Link href={`/token/${transfer.tokenId}`}>
                          <Button variant="link" className="p-0 h-auto">
                            #{transfer.tokenId}
                          </Button>
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatAddress(transfer.from)}
                      </TableCell>
                      <TableCell className="font-semibold">{transfer.amount}</TableCell>
                      <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                      <TableCell className="text-sm">
                        {formatDate(transfer.requestTimestamp)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Link href={`/transfers/${transfer.id}`}>
                            <Button variant="outline" size="sm">
                              Review
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
import { Header } from "@/components/Header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Transfer {
  id: number;
  tokenId: number;
  from: string;
  to: string;
  amount: number;
  status: number; // 0 = Pending, 1 = Accepted, 2 = Rejected
  requestTimestamp: number;
  responseTimestamp: number;
}

export default function TransfersPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"pending" | "all" | "history">("pending");
  const isAdmin = user?.role === "Admin";

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    loadTransfers();
  }, [account, isConnected, isApproved, router, viewMode]);

  const loadTransfers = async () => {
    if (!account || !provider) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      let transferIds: bigint[] = [];

      if (isAdmin && (viewMode === "all" || viewMode === "history")) {
        // For admin: get all transfers
        const totalTransfers = Number(await contract.getTotalTransfers());
        transferIds = [];
        for (let i = 0; i < totalTransfers; i++) {
          try {
            const transferId = await contract.transferIds(i);
            transferIds.push(transferId);
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.error(`Error fetching transfer ID at index ${i}:`, error);
            }
          }
        }
      } else {
        // For regular users or admin pending view: get pending transfers
        transferIds = await contract.getPendingTransfers(account);
      }
      
      // Load transfer details
      const transferPromises = transferIds.map(async (transferId) => {
        try {
          const transferData = await contract.getTransfer(Number(transferId));
          
          return {
            id: Number(transferId),
            tokenId: Number(transferData.tokenId),
            from: transferData.from,
            to: transferData.to,
            amount: Number(transferData.amount),
            status: Number(transferData.status),
            requestTimestamp: Number(transferData.requestTimestamp),
            responseTimestamp: Number(transferData.responseTimestamp),
          };
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`Error loading transfer ${transferId}:`, error);
          }
          return null;
        }
      });

      const transferResults = await Promise.all(transferPromises);
      let validTransfers = transferResults.filter(
        (transfer): transfer is Transfer => transfer !== null
      );

      // Filter based on view mode
      if (!isAdmin || viewMode === "pending") {
        validTransfers = validTransfers.filter(transfer => transfer.status === 0);
      } else if (viewMode === "history") {
        validTransfers = validTransfers.filter(transfer => transfer.status !== 0);
      }

      // Sort by timestamp (newest first)
      validTransfers.sort((a, b) => b.requestTimestamp - a.requestTimestamp);

      setTransfers(validTransfers);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error loading transfers:", error);
      }
      toast.error("Failed to load transfers");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 1:
        return <Badge className="bg-green-500">Accepted</Badge>;
      case 2:
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  if (!isConnected || !isApproved) {
    return null;
  }

  const getTitle = () => {
    if (isAdmin) {
      switch (viewMode) {
        case "all":
          return "All Transfers";
        case "history":
          return "Transfer History";
        default:
          return "Pending Transfers";
      }
    }
    return "Pending Transfers";
  };

  const getDescription = () => {
    if (isAdmin) {
      switch (viewMode) {
        case "all":
          return "View all transfers in the system across all stages";
        case "history":
          return "View completed transfer history (accepted and rejected)";
        default:
          return "Review and manage incoming transfer requests";
      }
    }
    return "Review and manage incoming transfer requests";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-7xl">
        <Header
          title={getTitle()}
          description={getDescription()}
          backButton={{
            href: "/dashboard",
            label: "Back to Dashboard"
          }}
          actionButtons={
            isAdmin && (
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("pending")}
                >
                  Pending
                </Button>
                <Button
                  variant={viewMode === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("all")}
                >
                  All Transfers
                </Button>
                <Button
                  variant={viewMode === "history" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("history")}
                >
                  History
                </Button>
              </div>
            )
          }
        />

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading transfers...</div>
            </CardContent>
          </Card>
        ) : transfers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No pending transfers</p>
                <Link href="/token">
                  <Button>View Tokens</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Transfer Requests</CardTitle>
              <CardDescription>
                You have {transfers.length} pending transfer request(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transfer ID</TableHead>
                    <TableHead>Token ID</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-medium">#{transfer.id}</TableCell>
                      <TableCell>
                        <Link href={`/token/${transfer.tokenId}`}>
                          <Button variant="link" className="p-0 h-auto">
                            #{transfer.tokenId}
                          </Button>
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatAddress(transfer.from)}
                      </TableCell>
                      <TableCell className="font-semibold">{transfer.amount}</TableCell>
                      <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                      <TableCell className="text-sm">
                        {formatDate(transfer.requestTimestamp)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Link href={`/transfers/${transfer.id}`}>
                            <Button variant="outline" size="sm">
                              Review
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
import { Header } from "@/components/Header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Transfer {
  id: number;
  tokenId: number;
  from: string;
  to: string;
  amount: number;
  status: number; // 0 = Pending, 1 = Accepted, 2 = Rejected
  requestTimestamp: number;
  responseTimestamp: number;
}

export default function TransfersPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"pending" | "all" | "history">("pending");
  const isAdmin = user?.role === "Admin";

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    loadTransfers();
  }, [account, isConnected, isApproved, router, viewMode]);

  const loadTransfers = async () => {
    if (!account || !provider) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      let transferIds: bigint[] = [];

      if (isAdmin && (viewMode === "all" || viewMode === "history")) {
        // For admin: get all transfers
        const totalTransfers = Number(await contract.getTotalTransfers());
        transferIds = [];
        for (let i = 0; i < totalTransfers; i++) {
          try {
            const transferId = await contract.transferIds(i);
            transferIds.push(transferId);
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.error(`Error fetching transfer ID at index ${i}:`, error);
            }
          }
        }
      } else {
        // For regular users or admin pending view: get pending transfers
        transferIds = await contract.getPendingTransfers(account);
      }
      
      // Load transfer details
      const transferPromises = transferIds.map(async (transferId) => {
        try {
          const transferData = await contract.getTransfer(Number(transferId));
          
          return {
            id: Number(transferId),
            tokenId: Number(transferData.tokenId),
            from: transferData.from,
            to: transferData.to,
            amount: Number(transferData.amount),
            status: Number(transferData.status),
            requestTimestamp: Number(transferData.requestTimestamp),
            responseTimestamp: Number(transferData.responseTimestamp),
          };
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`Error loading transfer ${transferId}:`, error);
          }
          return null;
        }
      });

      const transferResults = await Promise.all(transferPromises);
      let validTransfers = transferResults.filter(
        (transfer): transfer is Transfer => transfer !== null
      );

      // Filter based on view mode
      if (!isAdmin || viewMode === "pending") {
        validTransfers = validTransfers.filter(transfer => transfer.status === 0);
      } else if (viewMode === "history") {
        validTransfers = validTransfers.filter(transfer => transfer.status !== 0);
      }

      // Sort by timestamp (newest first)
      validTransfers.sort((a, b) => b.requestTimestamp - a.requestTimestamp);

      setTransfers(validTransfers);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error loading transfers:", error);
      }
      toast.error("Failed to load transfers");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 1:
        return <Badge className="bg-green-500">Accepted</Badge>;
      case 2:
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  if (!isConnected || !isApproved) {
    return null;
  }

  const getTitle = () => {
    if (isAdmin) {
      switch (viewMode) {
        case "all":
          return "All Transfers";
        case "history":
          return "Transfer History";
        default:
          return "Pending Transfers";
      }
    }
    return "Pending Transfers";
  };

  const getDescription = () => {
    if (isAdmin) {
      switch (viewMode) {
        case "all":
          return "View all transfers in the system across all stages";
        case "history":
          return "View completed transfer history (accepted and rejected)";
        default:
          return "Review and manage incoming transfer requests";
      }
    }
    return "Review and manage incoming transfer requests";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-7xl">
        <Header
          title={getTitle()}
          description={getDescription()}
          backButton={{
            href: "/dashboard",
            label: "Back to Dashboard"
          }}
          actionButtons={
            isAdmin && (
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("pending")}
                >
                  Pending
                </Button>
                <Button
                  variant={viewMode === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("all")}
                >
                  All Transfers
                </Button>
                <Button
                  variant={viewMode === "history" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("history")}
                >
                  History
                </Button>
              </div>
            )
          }
        />

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading transfers...</div>
            </CardContent>
          </Card>
        ) : transfers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  {isAdmin && viewMode === "history" 
                    ? "No transfer history found" 
                    : isAdmin && viewMode === "all"
                    ? "No transfers found"
                    : "No pending transfers"}
                </p>
                {!isAdmin && (
                  <Link href="/token">
                    <Button>View Tokens</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Transfer Requests</CardTitle>
              <CardDescription>
                {isAdmin 
                  ? `Showing ${transfers.length} transfer(s)`
                  : `You have ${transfers.length} pending transfer request(s)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transfer ID</TableHead>
                    <TableHead>Token ID</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-medium">#{transfer.id}</TableCell>
                      <TableCell>
                        <Link href={`/token/${transfer.tokenId}`}>
                          <Button variant="link" className="p-0 h-auto">
                            #{transfer.tokenId}
                          </Button>
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatAddress(transfer.from)}
                      </TableCell>
                      <TableCell className="font-semibold">{transfer.amount}</TableCell>
                      <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                      <TableCell className="text-sm">
                        {formatDate(transfer.requestTimestamp)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Link href={`/transfers/${transfer.id}`}>
                            <Button variant="outline" size="sm">
                              Review
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
import { Header } from "@/components/Header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Transfer {
  id: number;
  tokenId: number;
  from: string;
  to: string;
  amount: number;
  status: number; // 0 = Pending, 1 = Accepted, 2 = Rejected
  requestTimestamp: number;
  responseTimestamp: number;
}

export default function TransfersPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"pending" | "all" | "history">("pending");
  const isAdmin = user?.role === "Admin";

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    loadTransfers();
  }, [account, isConnected, isApproved, router, viewMode]);

  const loadTransfers = async () => {
    if (!account || !provider) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      let transferIds: bigint[] = [];

      if (isAdmin && (viewMode === "all" || viewMode === "history")) {
        // For admin: get all transfers
        const totalTransfers = Number(await contract.getTotalTransfers());
        transferIds = [];
        for (let i = 0; i < totalTransfers; i++) {
          try {
            const transferId = await contract.transferIds(i);
            transferIds.push(transferId);
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.error(`Error fetching transfer ID at index ${i}:`, error);
            }
          }
        }
      } else {
        // For regular users or admin pending view: get pending transfers
        transferIds = await contract.getPendingTransfers(account);
      }
      
      // Load transfer details
      const transferPromises = transferIds.map(async (transferId) => {
        try {
          const transferData = await contract.getTransfer(Number(transferId));
          
          return {
            id: Number(transferId),
            tokenId: Number(transferData.tokenId),
            from: transferData.from,
            to: transferData.to,
            amount: Number(transferData.amount),
            status: Number(transferData.status),
            requestTimestamp: Number(transferData.requestTimestamp),
            responseTimestamp: Number(transferData.responseTimestamp),
          };
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`Error loading transfer ${transferId}:`, error);
          }
          return null;
        }
      });

      const transferResults = await Promise.all(transferPromises);
      let validTransfers = transferResults.filter(
        (transfer): transfer is Transfer => transfer !== null
      );

      // Filter based on view mode
      if (!isAdmin || viewMode === "pending") {
        validTransfers = validTransfers.filter(transfer => transfer.status === 0);
      } else if (viewMode === "history") {
        validTransfers = validTransfers.filter(transfer => transfer.status !== 0);
      }

      // Sort by timestamp (newest first)
      validTransfers.sort((a, b) => b.requestTimestamp - a.requestTimestamp);

      setTransfers(validTransfers);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error loading transfers:", error);
      }
      toast.error("Failed to load transfers");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 1:
        return <Badge className="bg-green-500">Accepted</Badge>;
      case 2:
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  if (!isConnected || !isApproved) {
    return null;
  }

  const getTitle = () => {
    if (isAdmin) {
      switch (viewMode) {
        case "all":
          return "All Transfers";
        case "history":
          return "Transfer History";
        default:
          return "Pending Transfers";
      }
    }
    return "Pending Transfers";
  };

  const getDescription = () => {
    if (isAdmin) {
      switch (viewMode) {
        case "all":
          return "View all transfers in the system across all stages";
        case "history":
          return "View completed transfer history (accepted and rejected)";
        default:
          return "Review and manage incoming transfer requests";
      }
    }
    return "Review and manage incoming transfer requests";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-7xl">
        <Header
          title={getTitle()}
          description={getDescription()}
          backButton={{
            href: "/dashboard",
            label: "Back to Dashboard"
          }}
          actionButtons={
            isAdmin && (
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("pending")}
                >
                  Pending
                </Button>
                <Button
                  variant={viewMode === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("all")}
                >
                  All Transfers
                </Button>
                <Button
                  variant={viewMode === "history" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("history")}
                >
                  History
                </Button>
              </div>
            )
          }
        />

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading transfers...</div>
            </CardContent>
          </Card>
        ) : transfers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  {isAdmin && viewMode === "history" 
                    ? "No transfer history found" 
                    : isAdmin && viewMode === "all"
                    ? "No transfers found"
                    : "No pending transfers"}
                </p>
                {!isAdmin && (
                  <Link href="/token">
                    <Button>View Tokens</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Transfer Requests</CardTitle>
              <CardDescription>
                {isAdmin 
                  ? `Showing ${transfers.length} transfer(s)`
                  : `You have ${transfers.length} pending transfer request(s)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transfer ID</TableHead>
                    <TableHead>Token ID</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    {viewMode !== "history" && <TableHead>Response</TableHead>}
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-medium">#{transfer.id}</TableCell>
                      <TableCell>
                        <Link href={`/token/${transfer.tokenId}`}>
                          <Button variant="link" className="p-0 h-auto">
                            #{transfer.tokenId}
                          </Button>
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatAddress(transfer.from)}
                      </TableCell>
                      <TableCell className="font-semibold">{transfer.amount}</TableCell>
                      <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                      <TableCell className="text-sm">
                        {formatDate(transfer.requestTimestamp)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Link href={`/transfers/${transfer.id}`}>
                            <Button variant="outline" size="sm">
                              Review
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
import { Header } from "@/components/Header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Transfer {
  id: number;
  tokenId: number;
  from: string;
  to: string;
  amount: number;
  status: number; // 0 = Pending, 1 = Accepted, 2 = Rejected
  requestTimestamp: number;
  responseTimestamp: number;
}

export default function TransfersPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"pending" | "all" | "history">("pending");
  const isAdmin = user?.role === "Admin";

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    loadTransfers();
  }, [account, isConnected, isApproved, router, viewMode]);

  const loadTransfers = async () => {
    if (!account || !provider) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      let transferIds: bigint[] = [];

      if (isAdmin && (viewMode === "all" || viewMode === "history")) {
        // For admin: get all transfers
        const totalTransfers = Number(await contract.getTotalTransfers());
        transferIds = [];
        for (let i = 0; i < totalTransfers; i++) {
          try {
            const transferId = await contract.transferIds(i);
            transferIds.push(transferId);
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.error(`Error fetching transfer ID at index ${i}:`, error);
            }
          }
        }
      } else {
        // For regular users or admin pending view: get pending transfers
        transferIds = await contract.getPendingTransfers(account);
      }
      
      // Load transfer details
      const transferPromises = transferIds.map(async (transferId) => {
        try {
          const transferData = await contract.getTransfer(Number(transferId));
          
          return {
            id: Number(transferId),
            tokenId: Number(transferData.tokenId),
            from: transferData.from,
            to: transferData.to,
            amount: Number(transferData.amount),
            status: Number(transferData.status),
            requestTimestamp: Number(transferData.requestTimestamp),
            responseTimestamp: Number(transferData.responseTimestamp),
          };
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`Error loading transfer ${transferId}:`, error);
          }
          return null;
        }
      });

      const transferResults = await Promise.all(transferPromises);
      let validTransfers = transferResults.filter(
        (transfer): transfer is Transfer => transfer !== null
      );

      // Filter based on view mode
      if (!isAdmin || viewMode === "pending") {
        validTransfers = validTransfers.filter(transfer => transfer.status === 0);
      } else if (viewMode === "history") {
        validTransfers = validTransfers.filter(transfer => transfer.status !== 0);
      }

      // Sort by timestamp (newest first)
      validTransfers.sort((a, b) => b.requestTimestamp - a.requestTimestamp);

      setTransfers(validTransfers);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error loading transfers:", error);
      }
      toast.error("Failed to load transfers");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 1:
        return <Badge className="bg-green-500">Accepted</Badge>;
      case 2:
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  if (!isConnected || !isApproved) {
    return null;
  }

  const getTitle = () => {
    if (isAdmin) {
      switch (viewMode) {
        case "all":
          return "All Transfers";
        case "history":
          return "Transfer History";
        default:
          return "Pending Transfers";
      }
    }
    return "Pending Transfers";
  };

  const getDescription = () => {
    if (isAdmin) {
      switch (viewMode) {
        case "all":
          return "View all transfers in the system across all stages";
        case "history":
          return "View completed transfer history (accepted and rejected)";
        default:
          return "Review and manage incoming transfer requests";
      }
    }
    return "Review and manage incoming transfer requests";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-7xl">
        <Header
          title={getTitle()}
          description={getDescription()}
          backButton={{
            href: "/dashboard",
            label: "Back to Dashboard"
          }}
          actionButtons={
            isAdmin && (
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("pending")}
                >
                  Pending
                </Button>
                <Button
                  variant={viewMode === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("all")}
                >
                  All Transfers
                </Button>
                <Button
                  variant={viewMode === "history" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("history")}
                >
                  History
                </Button>
              </div>
            )
          }
        />

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading transfers...</div>
            </CardContent>
          </Card>
        ) : transfers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  {isAdmin && viewMode === "history" 
                    ? "No transfer history found" 
                    : isAdmin && viewMode === "all"
                    ? "No transfers found"
                    : "No pending transfers"}
                </p>
                {!isAdmin && (
                  <Link href="/token">
                    <Button>View Tokens</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Transfer Requests</CardTitle>
              <CardDescription>
                {isAdmin 
                  ? `Showing ${transfers.length} transfer(s)`
                  : `You have ${transfers.length} pending transfer request(s)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transfer ID</TableHead>
                    <TableHead>Token ID</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    {viewMode !== "history" && <TableHead>Response</TableHead>}
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-medium">#{transfer.id}</TableCell>
                      <TableCell>
                        <Link href={`/token/${transfer.tokenId}`}>
                          <Button variant="link" className="p-0 h-auto">
                            #{transfer.tokenId}
                          </Button>
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatAddress(transfer.from)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatAddress(transfer.to)}
                      </TableCell>
                      <TableCell className="font-semibold">{transfer.amount}</TableCell>
                      <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                      <TableCell className="text-sm">
                        {formatDate(transfer.requestTimestamp)}
                      </TableCell>
                      {viewMode !== "history" && (
                        <TableCell className="text-sm">
                          {transfer.responseTimestamp > 0 
                            ? formatDate(transfer.responseTimestamp)
                            : "-"}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex gap-2">
                          <Link href={`/transfers/${transfer.id}`}>
                            <Button variant="outline" size="sm">
                              {viewMode === "history" ? "View Details" : "Review"}
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}


```

Updating the dashboard to use the Header component and fixing the retailer color:


```typescriptreact
"use client";

import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { formatAddress } from "@/lib/utils";
import { Header } from "@/components/Header";

export default function Dashboard() {
  const { 
    isConnected, 
    account, 
    user, 
    isApproved, 
    disconnectWallet
  } = useWeb3();
  
  const router = useRouter();

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

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "bg-red-500";
      case "Producer":
        return "bg-blue-500";
      case "Factory":
        return "bg-green-500";
      case "Retailer":
        return "bg-yellow-500";
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
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Welcome to your Supply Chain Tracker dashboard
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/profile">Profile</Link>
            </Button>
            <Button onClick={disconnectWallet} variant="outline">
              Disconnect
            </Button>
          </div>
        </div>

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
import { useEffect } from "react";
import Link from "next/link";
import { formatAddress } from "@/lib/utils";
import { Header } from "@/components/Header";

export default function Dashboard() {
  const { 
    isConnected, 
    account, 
    user, 
    isApproved, 
    disconnectWallet
  } = useWeb3();
  
  const router = useRouter();

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
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Welcome to your Supply Chain Tracker dashboard
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/profile">Profile</Link>
            </Button>
            <Button onClick={disconnectWallet} variant="outline">
              Disconnect
            </Button>
          </div>
        </div>

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
import { useEffect } from "react";
import Link from "next/link";
import { formatAddress } from "@/lib/utils";
import { Header } from "@/components/Header";

export default function Dashboard() {
  const { 
    isConnected, 
    account, 
    user, 
    isApproved, 
    disconnectWallet
  } = useWeb3();
  
  const router = useRouter();

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

Checking and updating other pages to use the Header component:


Updating the admin users and profile pages to use the Header component:


```typescriptreact
"use client";

import { useWeb3, UserStatus } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import Link from "next/link";
import { getStatusColor, getStatusText } from "@/lib/utils";
import { Header } from "@/components/Header";

interface User {
  id: number;
  userAddress: string;
  role: string;
  status: UserStatus;
}

export default function AdminUsers() {
  const { 
    isConnected, 
    account, 
    user, 
    isApproved, 
    provider,
    signer,
    refreshUserData
  } = useWeb3();
  
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    if (!provider) return;

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );
      
      // Get total number of users
      const totalUsers = Number(await contract.getTotalUsers());
      
      // Get user addresses by calling the array getter
      const addresses: string[] = [];
      for (let i = 0; i < totalUsers; i++) {
        try {
          const address = await contract.userAddresses(i);
          addresses.push(address);
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`Error fetching user address at index ${i}:`, error);
          }
        }
      }
      
      // Get user details for each address
      const userPromises = addresses.map(async (address: string) => {
        try {
          const userData = await contract.getUser(address);
          return {
            id: Number(userData.id),
            userAddress: userData.userAddress,
            role: userData.role,
            status: Number(userData.status) as UserStatus
          };
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`Error fetching user ${address}:`, error);
          }
          return null;
        }
      });

      const usersData = await Promise.all(userPromises);
      setUsers(usersData.filter((u): u is User => u !== null));
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error loading users:", error);
      }
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    // Redirect if not connected or not admin
    if (!isConnected) {
      router.push('/');
      return;
    }
    
    if (!isApproved || user?.role !== "Admin") {
      router.push('/dashboard');
      return;
    }

    loadUsers();
  }, [isConnected, isApproved, user, loadUsers, router]);

  const updateUserStatus = async (userAddress: string, newStatus: UserStatus) => {
    if (!signer) {
      toast.error("Please connect your wallet first");
      return;
    }

    setProcessing(userAddress);
    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );
      
      const tx = await contract.updateUserStatus(userAddress, newStatus);
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("User status updated successfully");
      
      // Refresh data
      await loadUsers();
      await refreshUserData();
    } catch (error: any) {
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (
        (error.reason && error.reason.includes("Status unchanged")) ||
        (error.message && error.message.includes("Status unchanged"))
      ) {
        toast.info("Status is already set to this value");
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.error("Error updating user status:", error);
        }
        toast.error("Failed to update user status");
      }
    } finally {
      setProcessing(null);
    }
  };



  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isConnected || !isApproved || user?.role !== "Admin") {
    return null;
  }

  const pendingUsers = users.filter(u => u.status === UserStatus.Pending);
  const allUsers = users.filter(u => u.status !== UserStatus.Canceled);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex gap-2 mb-4">
              <Link href="/dashboard">
                <Button variant="ghost">
                  ← Back to Dashboard
                </Button>
              </Link>
              <Link href="/admin/tests">
                <Button variant="outline">
                  🧪 Automated Tests
                </Button>
              </Link>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              User Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Moderate user registration requests and manage user accounts
            </p>
          </div>
          <Badge className="bg-red-500">Admin</Badge>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Users</CardDescription>
              <CardTitle className="text-3xl">{users.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Pending Approvals</CardDescription>
              <CardTitle className="text-3xl">{pendingUsers.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Approved Users</CardDescription>
              <CardTitle className="text-3xl">
                {users.filter(u => u.status === UserStatus.Approved).length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Pending Users */}
        {pendingUsers.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>
                Review and approve or reject registration requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUsers.map((user) => (
                    <TableRow key={user.userAddress}>
                      <TableCell className="font-medium">
                        #{user.id}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatAddress(user.userAddress)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(user.status)}>
                          {getStatusText(user.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            onClick={() => updateUserStatus(user.userAddress, UserStatus.Approved)}
                            disabled={processing === user.userAddress}
                          >
                            {processing === user.userAddress ? "Processing..." : "Approve"}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateUserStatus(user.userAddress, UserStatus.Rejected)}
                            disabled={processing === user.userAddress}
                          >
                            {processing === user.userAddress ? "Processing..." : "Reject"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* All Users */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              Complete list of all registered users
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading users...</p>
              </div>
            ) : allUsers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No users found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allUsers.map((user) => (
                    <TableRow key={user.userAddress}>
                      <TableCell className="font-medium">
                        #{user.id}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatAddress(user.userAddress)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(user.status)}>
                          {getStatusText(user.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {user.status === UserStatus.Pending && (
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              onClick={() => updateUserStatus(user.userAddress, UserStatus.Approved)}
                              disabled={processing === user.userAddress}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateUserStatus(user.userAddress, UserStatus.Rejected)}
                              disabled={processing === user.userAddress}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                        {user.status === UserStatus.Approved && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateUserStatus(user.userAddress, UserStatus.Canceled)}
                            disabled={processing === user.userAddress}
                          >
                            {processing === user.userAddress ? "Processing..." : "Deactivate"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useWeb3, UserStatus } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import Link from "next/link";
import { getStatusColor, getStatusText } from "@/lib/utils";
import { Header } from "@/components/Header";

interface User {
  id: number;
  userAddress: string;
  role: string;
  status: UserStatus;
}

export default function AdminUsers() {
  const { 
    isConnected, 
    account, 
    user, 
    isApproved, 
    provider,
    signer,
    refreshUserData
  } = useWeb3();
  
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    if (!provider) return;

    setLoading(true);
    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );
      
      // Get total number of users
      const totalUsers = Number(await contract.getTotalUsers());
      
      // Get user addresses by calling the array getter
      const addresses: string[] = [];
      for (let i = 0; i < totalUsers; i++) {
        try {
          const address = await contract.userAddresses(i);
          addresses.push(address);
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`Error fetching user address at index ${i}:`, error);
          }
        }
      }
      
      // Get user details for each address
      const userPromises = addresses.map(async (address: string) => {
        try {
          const userData = await contract.getUser(address);
          return {
            id: Number(userData.id),
            userAddress: userData.userAddress,
            role: userData.role,
            status: Number(userData.status) as UserStatus
          };
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`Error fetching user ${address}:`, error);
          }
          return null;
        }
      });

      const usersData = await Promise.all(userPromises);
      setUsers(usersData.filter((u): u is User => u !== null));
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error loading users:", error);
      }
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    // Redirect if not connected or not admin
    if (!isConnected) {
      router.push('/');
      return;
    }
    
    if (!isApproved || user?.role !== "Admin") {
      router.push('/dashboard');
      return;
    }

    loadUsers();
  }, [isConnected, isApproved, user, loadUsers, router]);

  const updateUserStatus = async (userAddress: string, newStatus: UserStatus) => {
    if (!signer) {
      toast.error("Please connect your wallet first");
      return;
    }

    setProcessing(userAddress);
    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );
      
      const tx = await contract.updateUserStatus(userAddress, newStatus);
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("User status updated successfully");
      
      // Refresh data
      await loadUsers();
      await refreshUserData();
    } catch (error: any) {
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (
        (error.reason && error.reason.includes("Status unchanged")) ||
        (error.message && error.message.includes("Status unchanged"))
      ) {
        toast.info("Status is already set to this value");
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.error("Error updating user status:", error);
        }
        toast.error("Failed to update user status");
      }
    } finally {
      setProcessing(null);
    }
  };



  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isConnected || !isApproved || user?.role !== "Admin") {
    return null;
  }

  const pendingUsers = users.filter(u => u.status === UserStatus.Pending);
  const allUsers = users.filter(u => u.status !== UserStatus.Canceled);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-6xl">
        <Header
          title="User Management"
          description="Moderate user registration requests and manage user accounts"
          backButton={{
            href: "/dashboard",
            label: "Back to Dashboard"
          }}
          actionButtons={
            <Link href="/admin/tests">
              <Button variant="outline">
                🧪 Automated Tests
              </Button>
            </Link>
          }
        />

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Users</CardDescription>
              <CardTitle className="text-3xl">{users.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Pending Approvals</CardDescription>
              <CardTitle className="text-3xl">{pendingUsers.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Approved Users</CardDescription>
              <CardTitle className="text-3xl">
                {users.filter(u => u.status === UserStatus.Approved).length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Pending Users */}
        {pendingUsers.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>
                Review and approve or reject registration requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUsers.map((user) => (
                    <TableRow key={user.userAddress}>
                      <TableCell className="font-medium">
                        #{user.id}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatAddress(user.userAddress)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(user.status)}>
                          {getStatusText(user.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            onClick={() => updateUserStatus(user.userAddress, UserStatus.Approved)}
                            disabled={processing === user.userAddress}
                          >
                            {processing === user.userAddress ? "Processing..." : "Approve"}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateUserStatus(user.userAddress, UserStatus.Rejected)}
                            disabled={processing === user.userAddress}
                          >
                            {processing === user.userAddress ? "Processing..." : "Reject"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* All Users */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              Complete list of all registered users
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading users...</p>
              </div>
            ) : allUsers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No users found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allUsers.map((user) => (
                    <TableRow key={user.userAddress}>
                      <TableCell className="font-medium">
                        #{user.id}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatAddress(user.userAddress)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(user.status)}>
                          {getStatusText(user.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {user.status === UserStatus.Pending && (
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              onClick={() => updateUserStatus(user.userAddress, UserStatus.Approved)}
                              disabled={processing === user.userAddress}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateUserStatus(user.userAddress, UserStatus.Rejected)}
                              disabled={processing === user.userAddress}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                        {user.status === UserStatus.Approved && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateUserStatus(user.userAddress, UserStatus.Canceled)}
                            disabled={processing === user.userAddress}
                          >
                            {processing === user.userAddress ? "Processing..." : "Deactivate"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


```

```typescriptreact
"use client";

import { useWeb3, UserStatus } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Header } from "@/components/Header";

export default function ProfilePage() {
  const { 
    isConnected, 
    account, 
    user, 
    isApproved, 
    chainId,
    disconnectWallet,
    connectWallet,
    refreshUserData
  } = useWeb3();
  
  const router = useRouter();

  useEffect(() => {
    // Redirect to home if not connected
    if (!isConnected) {
      router.push('/');
      return;
    }
  }, [isConnected, router]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "bg-red-500";
      case "Producer":
        return "bg-blue-500";
      case "Factory":
        return "bg-green-500";
      case "Retailer":
        return "bg-yellow-500";
      case "Consumer":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusColor = (status: UserStatus) => {
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
  };

  const getStatusText = (status: UserStatus) => {
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
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Address copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy address");
    }
  };

  if (!isConnected) {
    return null;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>User not registered</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                You are connected but not registered. Please register first to view your profile.
              </p>
              <Button asChild>
                <Link href="/">Go to Home</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex-1">
            <div className="flex gap-2 mb-4">
              <Button asChild variant="ghost">
                <Link href="/dashboard">
                  ← Back to Dashboard
                </Link>
              </Button>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Profile
            </h1>
            <p className="text-muted-foreground mt-2">
              Your account information and details
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={refreshUserData} variant="outline">
              Refresh
            </Button>
            <Button onClick={disconnectWallet} variant="outline">
              Disconnect
            </Button>
          </div>
        </div>

        {/* User Information Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>User Information</CardTitle>
              <div className="flex gap-2">
                <Badge className={getRoleColor(user.role)}>
                  {user.role}
                </Badge>
                <Badge className={getStatusColor(user.status)}>
                  {getStatusText(user.status)}
                </Badge>
              </div>
            </div>
            <CardDescription>
              Your registered account details on the Supply Chain Tracker
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* User ID */}
              <div className="border-b pb-4">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  User ID
                </div>
                <div className="text-2xl font-bold">
                  #{user.id}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Your unique identifier in the system
                </p>
              </div>

              {/* Wallet Address */}
              <div className="border-b pb-4">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Wallet Address
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-lg font-mono bg-muted px-3 py-2 rounded-md">
                    {user.userAddress}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(user.userAddress)}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Your connected Ethereum wallet address
                </p>
              </div>

              {/* Role */}
              <div className="border-b pb-4">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Role
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${getRoleColor(user.role)} text-white`}>
                    {user.role}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Your role in the supply chain
                </p>
              </div>

              {/* Status */}
              <div className="border-b pb-4">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Account Status
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${getStatusColor(user.status)} text-white`}>
                    {getStatusText(user.status)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {user.status === UserStatus.Approved && "Your account is active and ready to use"}
                  {user.status === UserStatus.Pending && "Your registration is pending admin approval"}
                  {user.status === UserStatus.Rejected && "Your registration was rejected by an admin"}
                  {user.status === UserStatus.Canceled && "Your account has been canceled"}
                </p>
              </div>

              {/* Network Info */}
              {chainId && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Network
                  </div>
                  <div className="text-lg font-semibold">
                    Chain ID: {chainId}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Current blockchain network
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
            <CardDescription>
              Manage your account and navigate to other sections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button asChild variant="outline" className="h-auto py-4">
                <Link href="/dashboard" className="flex flex-col items-start">
                  <span className="font-semibold">Dashboard</span>
                  <span className="text-sm text-muted-foreground">Go to your dashboard</span>
                </Link>
              </Button>
              
              {isApproved && (
                <>
                  <Button asChild variant="outline" className="h-auto py-4">
                    <Link href="/token" className="flex flex-col items-start">
                      <span className="font-semibold">My Tokens</span>
                      <span className="text-sm text-muted-foreground">View your tokens</span>
                    </Link>
                  </Button>
                  
                  <Button asChild variant="outline" className="h-auto py-4">
                    <Link href="/transfers" className="flex flex-col items-start">
                      <span className="font-semibold">Transfers</span>
                      <span className="text-sm text-muted-foreground">Manage transfers</span>
                    </Link>
                  </Button>

                  {user.role === "Admin" && (
                    <>
                      <Button asChild variant="outline" className="h-auto py-4">
                        <Link href="/admin/users" className="flex flex-col items-start">
                          <span className="font-semibold">User Management</span>
                          <span className="text-sm text-muted-foreground">Admin panel</span>
                        </Link>
                      </Button>
                      
                      <Button asChild variant="outline" className="h-auto py-4">
                        <Link href="/admin/tests" className="flex flex-col items-start">
                          <span className="font-semibold">🧪 Automated Tests</span>
                          <span className="text-sm text-muted-foreground">Run system tests</span>
                        </Link>
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

```

```typescriptreact
"use client";

import { useWeb3, UserStatus } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Header } from "@/components/Header";

export default function ProfilePage() {
  const { 
    isConnected, 
    account, 
    user, 
    isApproved, 
    chainId,
    disconnectWallet,
    connectWallet,
    refreshUserData
  } = useWeb3();
  
  const router = useRouter();

  useEffect(() => {
    // Redirect to home if not connected
    if (!isConnected) {
      router.push('/');
      return;
    }
  }, [isConnected, router]);

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

  const getStatusColor = (status: UserStatus) => {
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
  };

  const getStatusText = (status: UserStatus) => {
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
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Address copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy address");
    }
  };

  if (!isConnected) {
    return null;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>User not registered</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                You are connected but not registered. Please register first to view your profile.
              </p>
              <Button asChild>
                <Link href="/">Go to Home</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex-1">
            <div className="flex gap-2 mb-4">
              <Button asChild variant="ghost">
                <Link href="/dashboard">
                  ← Back to Dashboard
                </Link>
              </Button>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Profile
            </h1>
            <p className="text-muted-foreground mt-2">
              Your account information and details
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={refreshUserData} variant="outline">
              Refresh
            </Button>
            <Button onClick={disconnectWallet} variant="outline">
              Disconnect
            </Button>
          </div>
        </div>

        {/* User Information Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>User Information</CardTitle>
              <div className="flex gap-2">
                <Badge className={getRoleColor(user.role)}>
                  {user.role}
                </Badge>
                <Badge className={getStatusColor(user.status)}>
                  {getStatusText(user.status)}
                </Badge>
              </div>
            </div>
            <CardDescription>
              Your registered account details on the Supply Chain Tracker
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* User ID */}
              <div className="border-b pb-4">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  User ID
                </div>
                <div className="text-2xl font-bold">
                  #{user.id}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Your unique identifier in the system
                </p>
              </div>

              {/* Wallet Address */}
              <div className="border-b pb-4">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Wallet Address
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-lg font-mono bg-muted px-3 py-2 rounded-md">
                    {user.userAddress}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(user.userAddress)}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Your connected Ethereum wallet address
                </p>
              </div>

              {/* Role */}
              <div className="border-b pb-4">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Role
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${getRoleColor(user.role)} text-white`}>
                    {user.role}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Your role in the supply chain
                </p>
              </div>

              {/* Status */}
              <div className="border-b pb-4">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Account Status
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${getStatusColor(user.status)} text-white`}>
                    {getStatusText(user.status)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {user.status === UserStatus.Approved && "Your account is active and ready to use"}
                  {user.status === UserStatus.Pending && "Your registration is pending admin approval"}
                  {user.status === UserStatus.Rejected && "Your registration was rejected by an admin"}
                  {user.status === UserStatus.Canceled && "Your account has been canceled"}
                </p>
              </div>

              {/* Network Info */}
              {chainId && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Network
                  </div>
                  <div className="text-lg font-semibold">
                    Chain ID: {chainId}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Current blockchain network
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
            <CardDescription>
              Manage your account and navigate to other sections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button asChild variant="outline" className="h-auto py-4">
                <Link href="/dashboard" className="flex flex-col items-start">
                  <span className="font-semibold">Dashboard</span>
                  <span className="text-sm text-muted-foreground">Go to your dashboard</span>
                </Link>
              </Button>
              
              {isApproved && (
                <>
                  <Button asChild variant="outline" className="h-auto py-4">
                    <Link href="/token" className="flex flex-col items-start">
                      <span className="font-semibold">My Tokens</span>
                      <span className="text-sm text-muted-foreground">View your tokens</span>
                    </Link>
                  </Button>
                  
                  <Button asChild variant="outline" className="h-auto py-4">
                    <Link href="/transfers" className="flex flex-col items-start">
                      <span className="font-semibold">Transfers</span>
                      <span className="text-sm text-muted-foreground">Manage transfers</span>
                    </Link>
                  </Button>

                  {user.role === "Admin" && (
                    <>
                      <Button asChild variant="outline" className="h-auto py-4">
                        <Link href="/admin/users" className="flex flex-col items-start">
                          <span className="font-semibold">User Management</span>
                          <span className="text-sm text-muted-foreground">Admin panel</span>
                        </Link>
                      </Button>
                      
                      <Button asChild variant="outline" className="h-auto py-4">
                        <Link href="/admin/tests" className="flex flex-col items-start">
                          <span className="font-semibold">🧪 Automated Tests</span>
                          <span className="text-sm text-muted-foreground">Run system tests</span>
                        </Link>
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

```

```typescriptreact
"use client";

import { useWeb3, UserStatus } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Header } from "@/components/Header";

export default function ProfilePage() {
  const { 
    isConnected, 
    account, 
    user, 
    isApproved, 
    chainId,
    disconnectWallet,
    connectWallet,
    refreshUserData
  } = useWeb3();
  
  const router = useRouter();

  useEffect(() => {
    // Redirect to home if not connected
    if (!isConnected) {
      router.push('/');
      return;
    }
  }, [isConnected, router]);

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

  const getStatusColor = (status: UserStatus) => {
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
  };

  const getStatusText = (status: UserStatus) => {
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
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Address copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy address");
    }
  };

  if (!isConnected) {
    return null;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>User not registered</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                You are connected but not registered. Please register first to view your profile.
              </p>
              <Button asChild>
                <Link href="/">Go to Home</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-4xl">
        <Header
          title="Profile"
          description="Your account information and details"
          backButton={{
            href: "/dashboard",
            label: "Back to Dashboard"
          }}
          actionButtons={
            <>
              <Button onClick={refreshUserData} variant="outline">
                Refresh
              </Button>
            </>
          }
        />

        {/* User Information Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>User Information</CardTitle>
              <div className="flex gap-2">
                <Badge className={getRoleColor(user.role)}>
                  {user.role}
                </Badge>
                <Badge className={getStatusColor(user.status)}>
                  {getStatusText(user.status)}
                </Badge>
              </div>
            </div>
            <CardDescription>
              Your registered account details on the Supply Chain Tracker
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* User ID */}
              <div className="border-b pb-4">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  User ID
                </div>
                <div className="text-2xl font-bold">
                  #{user.id}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Your unique identifier in the system
                </p>
              </div>

              {/* Wallet Address */}
              <div className="border-b pb-4">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Wallet Address
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-lg font-mono bg-muted px-3 py-2 rounded-md">
                    {user.userAddress}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(user.userAddress)}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Your connected Ethereum wallet address
                </p>
              </div>

              {/* Role */}
              <div className="border-b pb-4">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Role
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${getRoleColor(user.role)} text-white`}>
                    {user.role}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Your role in the supply chain
                </p>
              </div>

              {/* Status */}
              <div className="border-b pb-4">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Account Status
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${getStatusColor(user.status)} text-white`}>
                    {getStatusText(user.status)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {user.status === UserStatus.Approved && "Your account is active and ready to use"}
                  {user.status === UserStatus.Pending && "Your registration is pending admin approval"}
                  {user.status === UserStatus.Rejected && "Your registration was rejected by an admin"}
                  {user.status === UserStatus.Canceled && "Your account has been canceled"}
                </p>
              </div>

              {/* Network Info */}
              {chainId && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Network
                  </div>
                  <div className="text-lg font-semibold">
                    Chain ID: {chainId}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Current blockchain network
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
            <CardDescription>
              Manage your account and navigate to other sections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button asChild variant="outline" className="h-auto py-4">
                <Link href="/dashboard" className="flex flex-col items-start">
                  <span className="font-semibold">Dashboard</span>
                  <span className="text-sm text-muted-foreground">Go to your dashboard</span>
                </Link>
              </Button>
              
              {isApproved && (
                <>
                  <Button asChild variant="outline" className="h-auto py-4">
                    <Link href="/token" className="flex flex-col items-start">
                      <span className="font-semibold">My Tokens</span>
                      <span className="text-sm text-muted-foreground">View your tokens</span>
                    </Link>
                  </Button>
                  
                  <Button asChild variant="outline" className="h-auto py-4">
                    <Link href="/transfers" className="flex flex-col items-start">
                      <span className="font-semibold">Transfers</span>
                      <span className="text-sm text-muted-foreground">Manage transfers</span>
                    </Link>
                  </Button>

                  {user.role === "Admin" && (
                    <>
                      <Button asChild variant="outline" className="h-auto py-4">
                        <Link href="/admin/users" className="flex flex-col items-start">
                          <span className="font-semibold">User Management</span>
                          <span className="text-sm text-muted-foreground">Admin panel</span>
                        </Link>
                      </Button>
                      
                      <Button asChild variant="outline" className="h-auto py-4">
                        <Link href="/admin/tests" className="flex flex-col items-start">
                          <span className="font-semibold">🧪 Automated Tests</span>
                          <span className="text-sm text-muted-foreground">Run system tests</span>
                        </Link>
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

```

Checking for lint errors and fixing any issues:


Fixing a missing dependency in the transfers page useEffect:


Wrapping `loadTransfers` in `useCallback` to fix the dependency issue:


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
import { Header } from "@/components/Header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Transfer {
  id: number;
  tokenId: number;
  from: string;
  to: string;
  amount: number;
  status: number; // 0 = Pending, 1 = Accepted, 2 = Rejected
  requestTimestamp: number;
  responseTimestamp: number;
}

export default function TransfersPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"pending" | "all" | "history">("pending");
  const isAdmin = user?.role === "Admin";

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    loadTransfers();
  }, [account, isConnected, isApproved, router, viewMode]);

  const loadTransfers = async () => {
    if (!account || !provider) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      let transferIds: bigint[] = [];

      if (isAdmin && (viewMode === "all" || viewMode === "history")) {
        // For admin: get all transfers
        const totalTransfers = Number(await contract.getTotalTransfers());
        transferIds = [];
        for (let i = 0; i < totalTransfers; i++) {
          try {
            const transferId = await contract.transferIds(i);
            transferIds.push(transferId);
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.error(`Error fetching transfer ID at index ${i}:`, error);
            }
          }
        }
      } else {
        // For regular users or admin pending view: get pending transfers
        transferIds = await contract.getPendingTransfers(account);
      }
      
      // Load transfer details
      const transferPromises = transferIds.map(async (transferId) => {
        try {
          const transferData = await contract.getTransfer(Number(transferId));
          
          return {
            id: Number(transferId),
            tokenId: Number(transferData.tokenId),
            from: transferData.from,
            to: transferData.to,
            amount: Number(transferData.amount),
            status: Number(transferData.status),
            requestTimestamp: Number(transferData.requestTimestamp),
            responseTimestamp: Number(transferData.responseTimestamp),
          };
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`Error loading transfer ${transferId}:`, error);
          }
          return null;
        }
      });

      const transferResults = await Promise.all(transferPromises);
      let validTransfers = transferResults.filter(
        (transfer): transfer is Transfer => transfer !== null
      );

      // Filter based on view mode
      if (!isAdmin || viewMode === "pending") {
        validTransfers = validTransfers.filter(transfer => transfer.status === 0);
      } else if (viewMode === "history") {
        validTransfers = validTransfers.filter(transfer => transfer.status !== 0);
      }

      // Sort by timestamp (newest first)
      validTransfers.sort((a, b) => b.requestTimestamp - a.requestTimestamp);

      setTransfers(validTransfers);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error loading transfers:", error);
      }
      toast.error("Failed to load transfers");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 1:
        return <Badge className="bg-green-500">Accepted</Badge>;
      case 2:
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  if (!isConnected || !isApproved) {
    return null;
  }

  const getTitle = () => {
    if (isAdmin) {
      switch (viewMode) {
        case "all":
          return "All Transfers";
        case "history":
          return "Transfer History";
        default:
          return "Pending Transfers";
      }
    }
    return "Pending Transfers";
  };

  const getDescription = () => {
    if (isAdmin) {
      switch (viewMode) {
        case "all":
          return "View all transfers in the system across all stages";
        case "history":
          return "View completed transfer history (accepted and rejected)";
        default:
          return "Review and manage incoming transfer requests";
      }
    }
    return "Review and manage incoming transfer requests";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-7xl">
        <Header
          title={getTitle()}
          description={getDescription()}
          backButton={{
            href: "/dashboard",
            label: "Back to Dashboard"
          }}
          actionButtons={
            isAdmin && (
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("pending")}
                >
                  Pending
                </Button>
                <Button
                  variant={viewMode === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("all")}
                >
                  All Transfers
                </Button>
                <Button
                  variant={viewMode === "history" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("history")}
                >
                  History
                </Button>
              </div>
            )
          }
        />

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading transfers...</div>
            </CardContent>
          </Card>
        ) : transfers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  {isAdmin && viewMode === "history" 
                    ? "No transfer history found" 
                    : isAdmin && viewMode === "all"
                    ? "No transfers found"
                    : "No pending transfers"}
                </p>
                {!isAdmin && (
                  <Link href="/token">
                    <Button>View Tokens</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Transfer Requests</CardTitle>
              <CardDescription>
                {isAdmin 
                  ? `Showing ${transfers.length} transfer(s)`
                  : `You have ${transfers.length} pending transfer request(s)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transfer ID</TableHead>
                    <TableHead>Token ID</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    {viewMode !== "history" && <TableHead>Response</TableHead>}
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-medium">#{transfer.id}</TableCell>
                      <TableCell>
                        <Link href={`/token/${transfer.tokenId}`}>
                          <Button variant="link" className="p-0 h-auto">
                            #{transfer.tokenId}
                          </Button>
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatAddress(transfer.from)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatAddress(transfer.to)}
                      </TableCell>
                      <TableCell className="font-semibold">{transfer.amount}</TableCell>
                      <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                      <TableCell className="text-sm">
                        {formatDate(transfer.requestTimestamp)}
                      </TableCell>
                      {viewMode !== "history" && (
                        <TableCell className="text-sm">
                          {transfer.responseTimestamp > 0 
                            ? formatDate(transfer.responseTimestamp)
                            : "-"}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex gap-2">
                          <Link href={`/transfers/${transfer.id}`}>
                            <Button variant="outline" size="sm">
                              {viewMode === "history" ? "View Details" : "Review"}
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}


```

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
import { Header } from "@/components/Header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Transfer {
  id: number;
  tokenId: number;
  from: string;
  to: string;
  amount: number;
  status: number; // 0 = Pending, 1 = Accepted, 2 = Rejected
  requestTimestamp: number;
  responseTimestamp: number;
}

export default function TransfersPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"pending" | "all" | "history">("pending");
  const isAdmin = user?.role === "Admin";

  const loadTransfers = useCallback(async () => {
    if (!account || !provider) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      let transferIds: bigint[] = [];

      if (isAdmin && (viewMode === "all" || viewMode === "history")) {
        // For admin: get all transfers
        const totalTransfers = Number(await contract.getTotalTransfers());
        transferIds = [];
        for (let i = 0; i < totalTransfers; i++) {
          try {
            const transferId = await contract.transferIds(i);
            transferIds.push(transferId);
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.error(`Error fetching transfer ID at index ${i}:`, error);
            }
          }
        }
      } else {
        // For regular users or admin pending view: get pending transfers
        transferIds = await contract.getPendingTransfers(account);
      }
      
      // Load transfer details
      const transferPromises = transferIds.map(async (transferId) => {
        try {
          const transferData = await contract.getTransfer(Number(transferId));
          
          return {
            id: Number(transferId),
            tokenId: Number(transferData.tokenId),
            from: transferData.from,
            to: transferData.to,
            amount: Number(transferData.amount),
            status: Number(transferData.status),
            requestTimestamp: Number(transferData.requestTimestamp),
            responseTimestamp: Number(transferData.responseTimestamp),
          };
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`Error loading transfer ${transferId}:`, error);
          }
          return null;
        }
      });

      const transferResults = await Promise.all(transferPromises);
      let validTransfers = transferResults.filter(
        (transfer): transfer is Transfer => transfer !== null
      );

      // Filter based on view mode
      if (!isAdmin || viewMode === "pending") {
        validTransfers = validTransfers.filter(transfer => transfer.status === 0);
      } else if (viewMode === "history") {
        validTransfers = validTransfers.filter(transfer => transfer.status !== 0);
      }

      // Sort by timestamp (newest first)
      validTransfers.sort((a, b) => b.requestTimestamp - a.requestTimestamp);

      setTransfers(validTransfers);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error loading transfers:", error);
      }
      toast.error("Failed to load transfers");
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 1:
        return <Badge className="bg-green-500">Accepted</Badge>;
      case 2:
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  if (!isConnected || !isApproved) {
    return null;
  }

  const getTitle = () => {
    if (isAdmin) {
      switch (viewMode) {
        case "all":
          return "All Transfers";
        case "history":
          return "Transfer History";
        default:
          return "Pending Transfers";
      }
    }
    return "Pending Transfers";
  };

  const getDescription = () => {
    if (isAdmin) {
      switch (viewMode) {
        case "all":
          return "View all transfers in the system across all stages";
        case "history":
          return "View completed transfer history (accepted and rejected)";
        default:
          return "Review and manage incoming transfer requests";
      }
    }
    return "Review and manage incoming transfer requests";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-7xl">
        <Header
          title={getTitle()}
          description={getDescription()}
          backButton={{
            href: "/dashboard",
            label: "Back to Dashboard"
          }}
          actionButtons={
            isAdmin && (
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("pending")}
                >
                  Pending
                </Button>
                <Button
                  variant={viewMode === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("all")}
                >
                  All Transfers
                </Button>
                <Button
                  variant={viewMode === "history" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("history")}
                >
                  History
                </Button>
              </div>
            )
          }
        />

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading transfers...</div>
            </CardContent>
          </Card>
        ) : transfers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  {isAdmin && viewMode === "history" 
                    ? "No transfer history found" 
                    : isAdmin && viewMode === "all"
                    ? "No transfers found"
                    : "No pending transfers"}
                </p>
                {!isAdmin && (
                  <Link href="/token">
                    <Button>View Tokens</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Transfer Requests</CardTitle>
              <CardDescription>
                {isAdmin 
                  ? `Showing ${transfers.length} transfer(s)`
                  : `You have ${transfers.length} pending transfer request(s)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transfer ID</TableHead>
                    <TableHead>Token ID</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    {viewMode !== "history" && <TableHead>Response</TableHead>}
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-medium">#{transfer.id}</TableCell>
                      <TableCell>
                        <Link href={`/token/${transfer.tokenId}`}>
                          <Button variant="link" className="p-0 h-auto">
                            #{transfer.tokenId}
                          </Button>
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatAddress(transfer.from)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatAddress(transfer.to)}
                      </TableCell>
                      <TableCell className="font-semibold">{transfer.amount}</TableCell>
                      <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                      <TableCell className="text-sm">
                        {formatDate(transfer.requestTimestamp)}
                      </TableCell>
                      {viewMode !== "history" && (
                        <TableCell className="text-sm">
                          {transfer.responseTimestamp > 0 
                            ? formatDate(transfer.responseTimestamp)
                            : "-"}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex gap-2">
                          <Link href={`/transfers/${transfer.id}`}>
                            <Button variant="outline" size="sm">
                              {viewMode === "history" ? "View Details" : "Review"}
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}


```

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
import { Header } from "@/components/Header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Transfer {
  id: number;
  tokenId: number;
  from: string;
  to: string;
  amount: number;
  status: number; // 0 = Pending, 1 = Accepted, 2 = Rejected
  requestTimestamp: number;
  responseTimestamp: number;
}

export default function TransfersPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"pending" | "all" | "history">("pending");
  const isAdmin = user?.role === "Admin";

  const loadTransfers = useCallback(async () => {
    if (!account || !provider) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      let transferIds: bigint[] = [];

      if (isAdmin && (viewMode === "all" || viewMode === "history")) {
        // For admin: get all transfers
        const totalTransfers = Number(await contract.getTotalTransfers());
        transferIds = [];
        for (let i = 0; i < totalTransfers; i++) {
          try {
            const transferId = await contract.transferIds(i);
            transferIds.push(transferId);
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.error(`Error fetching transfer ID at index ${i}:`, error);
            }
          }
        }
      } else {
        // For regular users or admin pending view: get pending transfers
        transferIds = await contract.getPendingTransfers(account);
      }
      
      // Load transfer details
      const transferPromises = transferIds.map(async (transferId) => {
        try {
          const transferData = await contract.getTransfer(Number(transferId));
          
          return {
            id: Number(transferId),
            tokenId: Number(transferData.tokenId),
            from: transferData.from,
            to: transferData.to,
            amount: Number(transferData.amount),
            status: Number(transferData.status),
            requestTimestamp: Number(transferData.requestTimestamp),
            responseTimestamp: Number(transferData.responseTimestamp),
          };
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`Error loading transfer ${transferId}:`, error);
          }
          return null;
        }
      });

      const transferResults = await Promise.all(transferPromises);
      let validTransfers = transferResults.filter(
        (transfer): transfer is Transfer => transfer !== null
      );

      // Filter based on view mode
      if (!isAdmin || viewMode === "pending") {
        validTransfers = validTransfers.filter(transfer => transfer.status === 0);
      } else if (viewMode === "history") {
        validTransfers = validTransfers.filter(transfer => transfer.status !== 0);
      }

      // Sort by timestamp (newest first)
      validTransfers.sort((a, b) => b.requestTimestamp - a.requestTimestamp);

      setTransfers(validTransfers);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error loading transfers:", error);
      }
      toast.error("Failed to load transfers");
    } finally {
      setLoading(false);
    }
  }, [account, provider, isAdmin, viewMode]);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    loadTransfers();
  }, [isConnected, isApproved, router, loadTransfers]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 1:
        return <Badge className="bg-green-500">Accepted</Badge>;
      case 2:
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  if (!isConnected || !isApproved) {
    return null;
  }

  const getTitle = () => {
    if (isAdmin) {
      switch (viewMode) {
        case "all":
          return "All Transfers";
        case "history":
          return "Transfer History";
        default:
          return "Pending Transfers";
      }
    }
    return "Pending Transfers";
  };

  const getDescription = () => {
    if (isAdmin) {
      switch (viewMode) {
        case "all":
          return "View all transfers in the system across all stages";
        case "history":
          return "View completed transfer history (accepted and rejected)";
        default:
          return "Review and manage incoming transfer requests";
      }
    }
    return "Review and manage incoming transfer requests";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-7xl">
        <Header
          title={getTitle()}
          description={getDescription()}
          backButton={{
            href: "/dashboard",
            label: "Back to Dashboard"
          }}
          actionButtons={
            isAdmin && (
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("pending")}
                >
                  Pending
                </Button>
                <Button
                  variant={viewMode === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("all")}
                >
                  All Transfers
                </Button>
                <Button
                  variant={viewMode === "history" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("history")}
                >
                  History
                </Button>
              </div>
            )
          }
        />

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading transfers...</div>
            </CardContent>
          </Card>
        ) : transfers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  {isAdmin && viewMode === "history" 
                    ? "No transfer history found" 
                    : isAdmin && viewMode === "all"
                    ? "No transfers found"
                    : "No pending transfers"}
                </p>
                {!isAdmin && (
                  <Link href="/token">
                    <Button>View Tokens</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Transfer Requests</CardTitle>
              <CardDescription>
                {isAdmin 
                  ? `Showing ${transfers.length} transfer(s)`
                  : `You have ${transfers.length} pending transfer request(s)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transfer ID</TableHead>
                    <TableHead>Token ID</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    {viewMode !== "history" && <TableHead>Response</TableHead>}
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-medium">#{transfer.id}</TableCell>
                      <TableCell>
                        <Link href={`/token/${transfer.tokenId}`}>
                          <Button variant="link" className="p-0 h-auto">
                            #{transfer.tokenId}
                          </Button>
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatAddress(transfer.from)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatAddress(transfer.to)}
                      </TableCell>
                      <TableCell className="font-semibold">{transfer.amount}</TableCell>
                      <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                      <TableCell className="text-sm">
                        {formatDate(transfer.requestTimestamp)}
                      </TableCell>
                      {viewMode !== "history" && (
                        <TableCell className="text-sm">
                          {transfer.responseTimestamp > 0 
                            ? formatDate(transfer.responseTimestamp)
                            : "-"}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex gap-2">
                          <Link href={`/transfers/${transfer.id}`}>
                            <Button variant="outline" size="sm">
                              {viewMode === "history" ? "View Details" : "Review"}
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}


```

## Summary

1. **Removed token options from admin dashboard** ✅
   - "My Tokens" and "Create Token" are hidden for admins
   - Shown only for non-admin users

2. **Admin transfers page** ✅
   - View modes: Pending, All Transfers, History
   - Shows all transfers in any stage for admin
   - History shows completed transfers (accepted/rejected)
   - Added "To" column and response timestamp

3. **Header component with role-based colors** ✅
   - Created reusable `Header` component in `web/src/components/Header.tsx`
   - Role-based border colors:
     - Admin: Red
     - Factory: Green
     - Retailer: Blue
     - Consumer: Purple
   - Includes wallet connection display and disconnect button
   - Supports back buttons and custom action buttons

4. **Updated pages to use Header component** ✅
   - Dashboard
   - Transfers
   - Admin Users
   - Profile

All changes are complete and there are no linter errors. The admin dashboard now focuses on user management and transfers, while other roles retain access to token creation and management.

