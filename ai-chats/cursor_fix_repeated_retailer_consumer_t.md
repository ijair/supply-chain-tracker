# Fix repeated retailer-consumer transactions
_Exported on 11/5/2025 at 22:58:40 EST from Cursor (2.0.63)_

---

**User**

check this history, there is a repeated retailer->consumer transactions but with different address receivers, this happen when the retailer create a request directly from the token received from the factory to the consumer, and the other one is a token created by the retailer based on the token received from the factory and then create the request to another consumer it suppoused the transaction for one consumer should not be related with the transaction for the other consumer, please fix this

---

**Cursor**


Investigating why unrelated retailer->consumer transfers appear linked. Examining the transfer creation logic and history display.



Checking how the frontend displays transfer history:



Checking token history and transfers pages:



Reviewing the smart contract to see how transaction history is stored:



The issue: the history page loads history from the entire token chain (including parent tokens), so unrelated transfers appear. Each token should show only its own history. Updating the history page to display only the current token's history:



Fixing the history page to show only the current token's history, not parent tokens:


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
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

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
}

export default function TokenHistoryPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [token, setToken] = useState<ProductToken | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [tokenChain, setTokenChain] = useState<ProductToken[]>([]);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadHistory();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  // Recursive function to load all parent tokens and their histories
  const loadTokenChain = async (
    contract: ethers.Contract,
    currentTokenId: number,
    chain: ProductToken[] = []
  ): Promise<ProductToken[]> => {
    try {
      const tokenData = await contract.getProductToken(currentTokenId);
      const tokenObj: ProductToken = {
        id: currentTokenId,
        creator: tokenData.creator,
        metadata: tokenData.metadata,
        parentId: Number(tokenData.parentId),
        timestamp: Number(tokenData.timestamp),
        isActive: tokenData.isActive,
      };

      const newChain = [tokenObj, ...chain];

      // If this token has a parent, recursively load it
      if (tokenObj.parentId > 0) {
        return await loadTokenChain(contract, tokenObj.parentId, newChain);
      }

      return newChain;
    } catch (error) {
      console.error(`Error loading token ${currentTokenId}:`, error);
      return chain;
    }
  };

  const loadHistory = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Load complete token chain (current token + all parents) for display purposes only
      const chain = await loadTokenChain(contract, Number(tokenId));
      setTokenChain(chain);

      // Set current token (first in chain)
      const currentToken = chain[0];
      setToken(currentToken);

      // Load transaction history ONLY for the current token being viewed
      // Each token should have its own independent transaction history
      const currentTokenId = Number(tokenId);
      let historyIds: bigint[] = [];
      try {
        historyIds = await contract.getTokenTransactionHistory(currentTokenId);
      } catch (error) {
        console.error(`Error loading history for token ${currentTokenId}:`, error);
      }
      
      const allHistoryIds = historyIds.map((id) => Number(id));
      
      // Load all transfer details
      const transferPromises = allHistoryIds.map(async (transferId) => {
        try {
          const transferData = await contract.getTransfer(Number(transferId));
          
          // Get user roles for from and to addresses
          const fromUser = await contract.getUser(transferData.from);
          const toUser = await contract.getUser(transferData.to);
          
          setUserRoles(prev => ({
            ...prev,
            [transferData.from.toLowerCase()]: fromUser.role,
            [transferData.to.toLowerCase()]: toUser.role,
          }));
          
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
        (transfer): transfer is Transfer => transfer !== null
      );

      // Sort by timestamp (oldest first)
      validTransfers.sort((a, b) => a.requestTimestamp - b.requestTimestamp);

      setTransfers(validTransfers);
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Failed to load product history");
      router.push(`/token/${tokenId}`);
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

  const parseMetadata = (metadata: string) => {
    // Safe JSON parsing with validation
    try {
      const parsed = JSON.parse(metadata);
      // Validate it's an object, not array or null
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Invalid JSON - return safe fallback
    }
    return { name: "Unknown Product" };
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading product history...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Token not found</p>
                <Link href="/token">
                  <Button>Back to Tokens</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const metadata = parseMetadata(token.metadata);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Product History
            </h1>
            <p className="text-muted-foreground mt-2">
              {metadata.name || `Token #${token.id}`} - Complete Supply Chain Tracking
            </p>
          </div>
          <Link href={`/token/${token.id}`}>
            <Button variant="outline">Back to Token</Button>
          </Link>
        </div>

        {/* Token Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Product Name
                </div>
                <div className="text-lg font-semibold">
                  {metadata.name || `Token #${token.id}`}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Token ID
                </div>
                <div className="text-lg font-semibold">#{token.id}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Created
                </div>
                <div className="text-sm">{formatDate(token.timestamp)}</div>
              </div>
            </div>
            {tokenChain.length > 1 && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Product Chain Lineage
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {tokenChain.map((chainToken, index) => {
                    const chainMetadata = parseMetadata(chainToken.metadata);
                    const isLast = index === tokenChain.length - 1;
                    return (
                      <div key={chainToken.id} className="flex items-center gap-2">
                        <Link href={`/token/${chainToken.id}`}>
                          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                            #{chainToken.id} - {chainMetadata.name || `Token ${chainToken.id}`}
                          </Badge>
                        </Link>
                        {!isLast && <span className="text-muted-foreground">→</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transfer Chain */}
        {transfers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No transfer history found for this product</p>
                <p className="text-sm text-muted-foreground">
                  This product has not been transferred yet in the supply chain.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Supply Chain Transfer History</CardTitle>
              <CardDescription>
                Complete transaction history showing the journey of this product through the supply chain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Visual Chain */}
                <div className="relative">
                  {transfers.map((transfer, index) => {
                    const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                    const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                    const isLast = index === transfers.length - 1;
                    
                    return (
                      <div key={transfer.id} className="relative">
                        {/* Transfer Card */}
                        <div className="border-l-4 border-blue-500 pl-4 mb-6">
                          <div className="bg-muted p-4 rounded-lg">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={getRoleColor(fromRole)}>
                                    {fromRole}
                                  </Badge>
                                  <span className="text-muted-foreground">→</span>
                                  <Badge className={getRoleColor(toRole)}>
                                    {toRole}
                                  </Badge>
                                </div>
                                <div className="text-sm font-medium">
                                  Transfer #{transfer.id}
                                </div>
                              </div>
                              <div className="text-right">
                                {getStatusBadge(transfer.status)}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="text-muted-foreground mb-1">From</div>
                                <div className="font-mono">{formatAddress(transfer.from)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">To</div>
                                <div className="font-mono">{formatAddress(transfer.to)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Token Used</div>
                                <Link href={`/token/${transfer.tokenId}`}>
                                  <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                                    Token #{transfer.tokenId}
                                  </Badge>
                                </Link>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Amount</div>
                                <div className="font-semibold">{transfer.amount} tokens</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Requested</div>
                                <div>{formatDate(transfer.requestTimestamp)}</div>
                              </div>
                              {transfer.responseTimestamp > 0 && (
                                <div>
                                  <div className="text-muted-foreground mb-1">Completed</div>
                                  <div>{formatDate(transfer.responseTimestamp)}</div>
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-3">
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="outline" size="sm">
                                  View Transfer Details
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                        
                        {/* Arrow to next transfer */}
                        {!isLast && (
                          <div className="flex justify-center mb-2">
                            <div className="w-0.5 h-8 bg-blue-500"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Summary Table */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">History Summary</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transfer ID</TableHead>
                        <TableHead>Token ID</TableHead>
                        <TableHead>From Role</TableHead>
                        <TableHead>To Role</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfers.map((transfer) => {
                        const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                        const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                        
                        return (
                          <TableRow key={transfer.id}>
                            <TableCell className="font-medium">#{transfer.id}</TableCell>
                            <TableCell>
                              <Link href={`/token/${transfer.tokenId}`}>
                                <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                                  #{transfer.tokenId}
                                </Badge>
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(fromRole)} variant="outline">
                                {fromRole}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(toRole)} variant="outline">
                                {toRole}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">{transfer.amount}</TableCell>
                            <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                            <TableCell className="text-sm">
                              {formatDate(transfer.requestTimestamp)}
                            </TableCell>
                            <TableCell>
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="link" size="sm">
                                  View
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}


```


Checking for lint errors:



Adding a safety filter to show only transfers for the current token:



Adding a safety filter to show only transfers for the current token:


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
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

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
}

export default function TokenHistoryPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [token, setToken] = useState<ProductToken | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [tokenChain, setTokenChain] = useState<ProductToken[]>([]);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadHistory();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  // Recursive function to load all parent tokens and their histories
  const loadTokenChain = async (
    contract: ethers.Contract,
    currentTokenId: number,
    chain: ProductToken[] = []
  ): Promise<ProductToken[]> => {
    try {
      const tokenData = await contract.getProductToken(currentTokenId);
      const tokenObj: ProductToken = {
        id: currentTokenId,
        creator: tokenData.creator,
        metadata: tokenData.metadata,
        parentId: Number(tokenData.parentId),
        timestamp: Number(tokenData.timestamp),
        isActive: tokenData.isActive,
      };

      const newChain = [tokenObj, ...chain];

      // If this token has a parent, recursively load it
      if (tokenObj.parentId > 0) {
        return await loadTokenChain(contract, tokenObj.parentId, newChain);
      }

      return newChain;
    } catch (error) {
      console.error(`Error loading token ${currentTokenId}:`, error);
      return chain;
    }
  };

  const loadHistory = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Load complete token chain (current token + all parents) for display purposes only
      const chain = await loadTokenChain(contract, Number(tokenId));
      setTokenChain(chain);

      // Set current token (first in chain)
      const currentToken = chain[0];
      setToken(currentToken);

      // Load transaction history ONLY for the current token being viewed
      // Each token should have its own independent transaction history
      const currentTokenId = Number(tokenId);
      let historyIds: bigint[] = [];
      try {
        historyIds = await contract.getTokenTransactionHistory(currentTokenId);
      } catch (error) {
        console.error(`Error loading history for token ${currentTokenId}:`, error);
      }
      
      const allHistoryIds = historyIds.map((id) => Number(id));
      
      // Load all transfer details
      const transferPromises = allHistoryIds.map(async (transferId) => {
        try {
          const transferData = await contract.getTransfer(Number(transferId));
          
          // Get user roles for from and to addresses
          const fromUser = await contract.getUser(transferData.from);
          const toUser = await contract.getUser(transferData.to);
          
          setUserRoles(prev => ({
            ...prev,
            [transferData.from.toLowerCase()]: fromUser.role,
            [transferData.to.toLowerCase()]: toUser.role,
          }));
          
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
      // Filter to only show transfers for the current token (safety check)
      const validTransfers = transferResults.filter(
        (transfer): transfer is Transfer => 
          transfer !== null && transfer.tokenId === currentTokenId
      );

      // Sort by timestamp (oldest first)
      validTransfers.sort((a, b) => a.requestTimestamp - b.requestTimestamp);

      setTransfers(validTransfers);
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Failed to load product history");
      router.push(`/token/${tokenId}`);
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

  const parseMetadata = (metadata: string) => {
    // Safe JSON parsing with validation
    try {
      const parsed = JSON.parse(metadata);
      // Validate it's an object, not array or null
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Invalid JSON - return safe fallback
    }
    return { name: "Unknown Product" };
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading product history...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Token not found</p>
                <Link href="/token">
                  <Button>Back to Tokens</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const metadata = parseMetadata(token.metadata);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Product History
            </h1>
            <p className="text-muted-foreground mt-2">
              {metadata.name || `Token #${token.id}`} - Complete Supply Chain Tracking
            </p>
          </div>
          <Link href={`/token/${token.id}`}>
            <Button variant="outline">Back to Token</Button>
          </Link>
        </div>

        {/* Token Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Product Name
                </div>
                <div className="text-lg font-semibold">
                  {metadata.name || `Token #${token.id}`}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Token ID
                </div>
                <div className="text-lg font-semibold">#{token.id}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Created
                </div>
                <div className="text-sm">{formatDate(token.timestamp)}</div>
              </div>
            </div>
            {tokenChain.length > 1 && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Product Chain Lineage
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {tokenChain.map((chainToken, index) => {
                    const chainMetadata = parseMetadata(chainToken.metadata);
                    const isLast = index === tokenChain.length - 1;
                    return (
                      <div key={chainToken.id} className="flex items-center gap-2">
                        <Link href={`/token/${chainToken.id}`}>
                          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                            #{chainToken.id} - {chainMetadata.name || `Token ${chainToken.id}`}
                          </Badge>
                        </Link>
                        {!isLast && <span className="text-muted-foreground">→</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transfer Chain */}
        {transfers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No transfer history found for this product</p>
                <p className="text-sm text-muted-foreground">
                  This product has not been transferred yet in the supply chain.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Supply Chain Transfer History</CardTitle>
              <CardDescription>
                Complete transaction history showing the journey of this product through the supply chain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Visual Chain */}
                <div className="relative">
                  {transfers.map((transfer, index) => {
                    const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                    const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                    const isLast = index === transfers.length - 1;
                    
                    return (
                      <div key={transfer.id} className="relative">
                        {/* Transfer Card */}
                        <div className="border-l-4 border-blue-500 pl-4 mb-6">
                          <div className="bg-muted p-4 rounded-lg">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={getRoleColor(fromRole)}>
                                    {fromRole}
                                  </Badge>
                                  <span className="text-muted-foreground">→</span>
                                  <Badge className={getRoleColor(toRole)}>
                                    {toRole}
                                  </Badge>
                                </div>
                                <div className="text-sm font-medium">
                                  Transfer #{transfer.id}
                                </div>
                              </div>
                              <div className="text-right">
                                {getStatusBadge(transfer.status)}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="text-muted-foreground mb-1">From</div>
                                <div className="font-mono">{formatAddress(transfer.from)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">To</div>
                                <div className="font-mono">{formatAddress(transfer.to)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Token Used</div>
                                <Link href={`/token/${transfer.tokenId}`}>
                                  <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                                    Token #{transfer.tokenId}
                                  </Badge>
                                </Link>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Amount</div>
                                <div className="font-semibold">{transfer.amount} tokens</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Requested</div>
                                <div>{formatDate(transfer.requestTimestamp)}</div>
                              </div>
                              {transfer.responseTimestamp > 0 && (
                                <div>
                                  <div className="text-muted-foreground mb-1">Completed</div>
                                  <div>{formatDate(transfer.responseTimestamp)}</div>
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-3">
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="outline" size="sm">
                                  View Transfer Details
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                        
                        {/* Arrow to next transfer */}
                        {!isLast && (
                          <div className="flex justify-center mb-2">
                            <div className="w-0.5 h-8 bg-blue-500"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Summary Table */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">History Summary</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transfer ID</TableHead>
                        <TableHead>Token ID</TableHead>
                        <TableHead>From Role</TableHead>
                        <TableHead>To Role</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfers.map((transfer) => {
                        const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                        const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                        
                        return (
                          <TableRow key={transfer.id}>
                            <TableCell className="font-medium">#{transfer.id}</TableCell>
                            <TableCell>
                              <Link href={`/token/${transfer.tokenId}`}>
                                <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                                  #{transfer.tokenId}
                                </Badge>
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(fromRole)} variant="outline">
                                {fromRole}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(toRole)} variant="outline">
                                {toRole}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">{transfer.amount}</TableCell>
                            <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                            <TableCell className="text-sm">
                              {formatDate(transfer.requestTimestamp)}
                            </TableCell>
                            <TableCell>
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="link" size="sm">
                                  View
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}


```


Verifying the scope and using the correct variable:



Checking for lint errors:



## Summary

**Problem**: The history page was loading transaction histories from the entire token chain (including parent tokens), causing unrelated transfers to appear. For example:
- Transfer #5 (Token #4 from Retailer to Consumer A) appeared in Token #5's history
- Transfer #6 (Token #5 from Retailer to Consumer B) also appeared
- Both showed up together even though they're unrelated

**Solution**:
1. Removed the `loadAllHistories` function that aggregated histories from multiple tokens
2. Modified `loadHistory` to load only the transaction history for the specific token being viewed
3. Added a safety filter to ensure only transfers for the current token are displayed

**Result**: Each token now shows only its own transaction history. Transfers from parent tokens won't appear in child token histories. The token chain lineage is still displayed for reference, but it's no longer used to aggregate transaction histories.

The fix ensures that:
- Token #4's history shows only Transfer #5 (Token #4's transfers)
- Token #5's history shows only Transfer #6 (Token #5's transfers)
- Each token maintains its own independent transaction history

You can test this by viewing the history of Token #5 - it should only show transfers involving Token #5, not transfers from Token #4.

---

**User**

nope nope that didnt work at all it supposed to be a chain so 2 cases here:

1. consumer 6A65 expected full history producer(tokenp)->factory(tokenf based on tokenp)->retailer(tokenf)->consumer(tokenf)

2. consumer 9720 expected full history producer(tokenp)->factory(tokenf based on tokenp)->retailer(tokenR based on tokenf)->consumer(tokenR)



both consumer are receiving from the same retailer but different tokens, the chain must keep the integrity

revert las changes and apply the real fix to get the right behavior

---

**Cursor**


Reverting the last change and applying the correct fix: showing the full chain history along the ancestor lineage, excluding sibling tokens.



Reverting the changes and implementing the correct fix: showing the full chain history for tokens in the ancestor lineage only, excluding sibling tokens.



Restoring the original chain history logic and fixing the filtering to show only transfers for tokens in the ancestor lineage, excluding sibling tokens:


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
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

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
}

export default function TokenHistoryPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [token, setToken] = useState<ProductToken | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [tokenChain, setTokenChain] = useState<ProductToken[]>([]);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadHistory();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  // Recursive function to load all parent tokens and their histories
  const loadTokenChain = async (
    contract: ethers.Contract,
    currentTokenId: number,
    chain: ProductToken[] = []
  ): Promise<ProductToken[]> => {
    try {
      const tokenData = await contract.getProductToken(currentTokenId);
      const tokenObj: ProductToken = {
        id: currentTokenId,
        creator: tokenData.creator,
        metadata: tokenData.metadata,
        parentId: Number(tokenData.parentId),
        timestamp: Number(tokenData.timestamp),
        isActive: tokenData.isActive,
      };

      const newChain = [tokenObj, ...chain];

      // If this token has a parent, recursively load it
      if (tokenObj.parentId > 0) {
        return await loadTokenChain(contract, tokenObj.parentId, newChain);
      }

      return newChain;
    } catch (error) {
      console.error(`Error loading token ${currentTokenId}:`, error);
      return chain;
    }
  };

  // Load all transfer histories for tokens in the ancestor chain
  const loadAllHistories = async (
    contract: ethers.Contract,
    tokenChain: ProductToken[]
  ): Promise<number[]> => {
    const allHistoryIds: number[] = [];
    const tokenIdsInChain = new Set(tokenChain.map(token => token.id));

    // Load history for each token in the ancestor chain
    for (const token of tokenChain) {
      try {
        const historyIds: bigint[] = await contract.getTokenTransactionHistory(token.id);
        allHistoryIds.push(...historyIds.map((id) => Number(id)));
      } catch (error) {
        console.error(`Error loading history for token ${token.id}:`, error);
      }
    }

    // Remove duplicates
    return Array.from(new Set(allHistoryIds));
  };

  const loadHistory = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Load complete token chain (current token + all parents) - this is the ancestor lineage
      const chain = await loadTokenChain(contract, Number(tokenId));
      setTokenChain(chain);

      // Set current token (first in chain)
      const currentToken = chain[0];
      setToken(currentToken);

      // Create a set of token IDs that are in the ancestor chain
      const tokenIdsInChain = new Set(chain.map(token => token.id));

      // Load all transaction histories from tokens in the ancestor chain only
      const allHistoryIds = await loadAllHistories(contract, chain);
      
      // Load all transfer details
      const transferPromises = allHistoryIds.map(async (transferId) => {
        try {
          const transferData = await contract.getTransfer(Number(transferId));
          
          // CRITICAL: Only include transfers for tokens that are in the ancestor chain
          // This ensures we don't show transfers from sibling tokens
          const transferTokenId = Number(transferData.tokenId);
          if (!tokenIdsInChain.has(transferTokenId)) {
            return null;
          }
          
          // Get user roles for from and to addresses
          const fromUser = await contract.getUser(transferData.from);
          const toUser = await contract.getUser(transferData.to);
          
          setUserRoles(prev => ({
            ...prev,
            [transferData.from.toLowerCase()]: fromUser.role,
            [transferData.to.toLowerCase()]: toUser.role,
          }));
          
          return {
            id: Number(transferId),
            tokenId: transferTokenId,
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
        (transfer): transfer is Transfer => transfer !== null
      );

      // Sort by timestamp (oldest first) to show the chain flow
      validTransfers.sort((a, b) => a.requestTimestamp - b.requestTimestamp);

      setTransfers(validTransfers);
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Failed to load product history");
      router.push(`/token/${tokenId}`);
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

  const parseMetadata = (metadata: string) => {
    // Safe JSON parsing with validation
    try {
      const parsed = JSON.parse(metadata);
      // Validate it's an object, not array or null
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Invalid JSON - return safe fallback
    }
    return { name: "Unknown Product" };
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading product history...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Token not found</p>
                <Link href="/token">
                  <Button>Back to Tokens</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const metadata = parseMetadata(token.metadata);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Product History
            </h1>
            <p className="text-muted-foreground mt-2">
              {metadata.name || `Token #${token.id}`} - Complete Supply Chain Tracking
            </p>
          </div>
          <Link href={`/token/${token.id}`}>
            <Button variant="outline">Back to Token</Button>
          </Link>
        </div>

        {/* Token Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Product Name
                </div>
                <div className="text-lg font-semibold">
                  {metadata.name || `Token #${token.id}`}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Token ID
                </div>
                <div className="text-lg font-semibold">#{token.id}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Created
                </div>
                <div className="text-sm">{formatDate(token.timestamp)}</div>
              </div>
            </div>
            {tokenChain.length > 1 && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Product Chain Lineage
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {tokenChain.map((chainToken, index) => {
                    const chainMetadata = parseMetadata(chainToken.metadata);
                    const isLast = index === tokenChain.length - 1;
                    return (
                      <div key={chainToken.id} className="flex items-center gap-2">
                        <Link href={`/token/${chainToken.id}`}>
                          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                            #{chainToken.id} - {chainMetadata.name || `Token ${chainToken.id}`}
                          </Badge>
                        </Link>
                        {!isLast && <span className="text-muted-foreground">→</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transfer Chain */}
        {transfers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No transfer history found for this product</p>
                <p className="text-sm text-muted-foreground">
                  This product has not been transferred yet in the supply chain.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Supply Chain Transfer History</CardTitle>
              <CardDescription>
                Complete transaction history showing the journey of this product through the supply chain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Visual Chain */}
                <div className="relative">
                  {transfers.map((transfer, index) => {
                    const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                    const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                    const isLast = index === transfers.length - 1;
                    
                    return (
                      <div key={transfer.id} className="relative">
                        {/* Transfer Card */}
                        <div className="border-l-4 border-blue-500 pl-4 mb-6">
                          <div className="bg-muted p-4 rounded-lg">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={getRoleColor(fromRole)}>
                                    {fromRole}
                                  </Badge>
                                  <span className="text-muted-foreground">→</span>
                                  <Badge className={getRoleColor(toRole)}>
                                    {toRole}
                                  </Badge>
                                </div>
                                <div className="text-sm font-medium">
                                  Transfer #{transfer.id}
                                </div>
                              </div>
                              <div className="text-right">
                                {getStatusBadge(transfer.status)}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="text-muted-foreground mb-1">From</div>
                                <div className="font-mono">{formatAddress(transfer.from)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">To</div>
                                <div className="font-mono">{formatAddress(transfer.to)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Token Used</div>
                                <Link href={`/token/${transfer.tokenId}`}>
                                  <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                                    Token #{transfer.tokenId}
                                  </Badge>
                                </Link>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Amount</div>
                                <div className="font-semibold">{transfer.amount} tokens</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Requested</div>
                                <div>{formatDate(transfer.requestTimestamp)}</div>
                              </div>
                              {transfer.responseTimestamp > 0 && (
                                <div>
                                  <div className="text-muted-foreground mb-1">Completed</div>
                                  <div>{formatDate(transfer.responseTimestamp)}</div>
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-3">
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="outline" size="sm">
                                  View Transfer Details
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                        
                        {/* Arrow to next transfer */}
                        {!isLast && (
                          <div className="flex justify-center mb-2">
                            <div className="w-0.5 h-8 bg-blue-500"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Summary Table */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">History Summary</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transfer ID</TableHead>
                        <TableHead>Token ID</TableHead>
                        <TableHead>From Role</TableHead>
                        <TableHead>To Role</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfers.map((transfer) => {
                        const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                        const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                        
                        return (
                          <TableRow key={transfer.id}>
                            <TableCell className="font-medium">#{transfer.id}</TableCell>
                            <TableCell>
                              <Link href={`/token/${transfer.tokenId}`}>
                                <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                                  #{transfer.tokenId}
                                </Badge>
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(fromRole)} variant="outline">
                                {fromRole}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(toRole)} variant="outline">
                                {toRole}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">{transfer.amount}</TableCell>
                            <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                            <TableCell className="text-sm">
                              {formatDate(transfer.requestTimestamp)}
                            </TableCell>
                            <TableCell>
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="link" size="sm">
                                  View
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}


```


Verifying the fix and checking for lint errors:



Adding logic to filter transfers by token creation timestamps and ensure we only show transfers that occurred before child tokens were created, preserving chain integrity:



Adding timestamp-based filtering so parent token transfers appear only if they occurred before the child token was created:


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
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

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
}

export default function TokenHistoryPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [token, setToken] = useState<ProductToken | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [tokenChain, setTokenChain] = useState<ProductToken[]>([]);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadHistory();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  // Recursive function to load all parent tokens and their histories
  const loadTokenChain = async (
    contract: ethers.Contract,
    currentTokenId: number,
    chain: ProductToken[] = []
  ): Promise<ProductToken[]> => {
    try {
      const tokenData = await contract.getProductToken(currentTokenId);
      const tokenObj: ProductToken = {
        id: currentTokenId,
        creator: tokenData.creator,
        metadata: tokenData.metadata,
        parentId: Number(tokenData.parentId),
        timestamp: Number(tokenData.timestamp),
        isActive: tokenData.isActive,
      };

      const newChain = [tokenObj, ...chain];

      // If this token has a parent, recursively load it
      if (tokenObj.parentId > 0) {
        return await loadTokenChain(contract, tokenObj.parentId, newChain);
      }

      return newChain;
    } catch (error) {
      console.error(`Error loading token ${currentTokenId}:`, error);
      return chain;
    }
  };

  // Load all transfer histories for tokens in the ancestor chain
  const loadAllHistories = async (
    contract: ethers.Contract,
    tokenChain: ProductToken[]
  ): Promise<number[]> => {
    const allHistoryIds: number[] = [];
    const tokenIdsInChain = new Set(tokenChain.map(token => token.id));

    // Load history for each token in the ancestor chain
    for (const token of tokenChain) {
      try {
        const historyIds: bigint[] = await contract.getTokenTransactionHistory(token.id);
        allHistoryIds.push(...historyIds.map((id) => Number(id)));
      } catch (error) {
        console.error(`Error loading history for token ${token.id}:`, error);
      }
    }

    // Remove duplicates
    return Array.from(new Set(allHistoryIds));
  };

  const loadHistory = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Load complete token chain (current token + all parents) - this is the ancestor lineage
      const chain = await loadTokenChain(contract, Number(tokenId));
      setTokenChain(chain);

      // Set current token (first in chain)
      const currentToken = chain[0];
      setToken(currentToken);

      // Create a map of token IDs to their creation timestamps in the ancestor chain
      // This helps us filter out transfers from parent tokens that happened after child tokens were created
      const tokenCreationTimes = new Map<number, number>();
      chain.forEach(token => {
        tokenCreationTimes.set(token.id, token.timestamp);
      });

      // Create a set of token IDs that are in the ancestor chain
      const tokenIdsInChain = new Set(chain.map(token => token.id));

      // Load all transaction histories from tokens in the ancestor chain only
      const allHistoryIds = await loadAllHistories(contract, chain);
      
      // Load all transfer details
      const transferPromises = allHistoryIds.map(async (transferId) => {
        try {
          const transferData = await contract.getTransfer(Number(transferId));
          
          // CRITICAL: Only include transfers for tokens that are in the ancestor chain
          // This ensures we don't show transfers from sibling tokens
          const transferTokenId = Number(transferData.tokenId);
          if (!tokenIdsInChain.has(transferTokenId)) {
            return null;
          }
          
          // For parent tokens, only show transfers that occurred before any child tokens were created
          // This preserves chain integrity by excluding transfers that happened after branching
          const transferTokenCreationTime = tokenCreationTimes.get(transferTokenId);
          if (transferTokenCreationTime !== undefined) {
            // Check if this transfer is for a parent token (not the current token)
            const isCurrentToken = transferTokenId === currentToken.id;
            if (!isCurrentToken) {
              // For parent tokens, check if any child token in the chain was created before this transfer
              // If so, this transfer might be part of a different branch and should be excluded
              const transferRequestTime = Number(transferData.requestTimestamp);
              
              // Find the direct child of this token in the chain
              const tokenIndex = chain.findIndex(t => t.id === transferTokenId);
              if (tokenIndex >= 0 && tokenIndex < chain.length - 1) {
                // There is a child token - check if the child was created before this transfer
                const childToken = chain[tokenIndex - 1]; // Child is before parent in the chain array
                const childCreationTime = childToken.timestamp;
                
                // If the transfer happened after the child was created, it's not part of the lineage
                // Exception: if the transfer is TO the creator of the child token, it might be relevant
                // Actually, we need to be more careful here - transfers after child creation are new branches
                // But we want to show the full chain, so we should show all transfers that led to the current token
                // The key is: we only want transfers that are part of the path that led to the current token
                
                // For now, let's show all transfers of parent tokens that happened before the child was created
                // OR transfers that happened to the address that created the child (which received tokens used to create child)
                if (transferRequestTime > childCreationTime) {
                  // This transfer happened after the child was created - check if it's still relevant
                  // If the transfer is FROM the child creator, it might be using tokens that led to child creation
                  // But actually, if it happened after child creation, it's a different branch
                  // We should exclude it to maintain chain integrity
                  const childCreator = childToken.creator.toLowerCase();
                  const transferFrom = transferData.from.toLowerCase();
                  
                  // If the transfer is FROM the child creator AFTER child creation, it's a new branch
                  // Only include if the transfer is TO the child creator (which would be part of the lineage)
                  if (transferFrom === childCreator) {
                    // This is a transfer FROM the child creator after child creation - it's a different branch
                    return null;
                  }
                }
              }
            }
          }
          
          // Get user roles for from and to addresses
          const fromUser = await contract.getUser(transferData.from);
          const toUser = await contract.getUser(transferData.to);
          
          setUserRoles(prev => ({
            ...prev,
            [transferData.from.toLowerCase()]: fromUser.role,
            [transferData.to.toLowerCase()]: toUser.role,
          }));
          
          return {
            id: Number(transferId),
            tokenId: transferTokenId,
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
        (transfer): transfer is Transfer => transfer !== null
      );

      // Sort by timestamp (oldest first) to show the chain flow
      validTransfers.sort((a, b) => a.requestTimestamp - b.requestTimestamp);

      setTransfers(validTransfers);
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Failed to load product history");
      router.push(`/token/${tokenId}`);
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

  const parseMetadata = (metadata: string) => {
    // Safe JSON parsing with validation
    try {
      const parsed = JSON.parse(metadata);
      // Validate it's an object, not array or null
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Invalid JSON - return safe fallback
    }
    return { name: "Unknown Product" };
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading product history...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Token not found</p>
                <Link href="/token">
                  <Button>Back to Tokens</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const metadata = parseMetadata(token.metadata);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Product History
            </h1>
            <p className="text-muted-foreground mt-2">
              {metadata.name || `Token #${token.id}`} - Complete Supply Chain Tracking
            </p>
          </div>
          <Link href={`/token/${token.id}`}>
            <Button variant="outline">Back to Token</Button>
          </Link>
        </div>

        {/* Token Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Product Name
                </div>
                <div className="text-lg font-semibold">
                  {metadata.name || `Token #${token.id}`}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Token ID
                </div>
                <div className="text-lg font-semibold">#{token.id}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Created
                </div>
                <div className="text-sm">{formatDate(token.timestamp)}</div>
              </div>
            </div>
            {tokenChain.length > 1 && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Product Chain Lineage
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {tokenChain.map((chainToken, index) => {
                    const chainMetadata = parseMetadata(chainToken.metadata);
                    const isLast = index === tokenChain.length - 1;
                    return (
                      <div key={chainToken.id} className="flex items-center gap-2">
                        <Link href={`/token/${chainToken.id}`}>
                          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                            #{chainToken.id} - {chainMetadata.name || `Token ${chainToken.id}`}
                          </Badge>
                        </Link>
                        {!isLast && <span className="text-muted-foreground">→</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transfer Chain */}
        {transfers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No transfer history found for this product</p>
                <p className="text-sm text-muted-foreground">
                  This product has not been transferred yet in the supply chain.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Supply Chain Transfer History</CardTitle>
              <CardDescription>
                Complete transaction history showing the journey of this product through the supply chain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Visual Chain */}
                <div className="relative">
                  {transfers.map((transfer, index) => {
                    const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                    const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                    const isLast = index === transfers.length - 1;
                    
                    return (
                      <div key={transfer.id} className="relative">
                        {/* Transfer Card */}
                        <div className="border-l-4 border-blue-500 pl-4 mb-6">
                          <div className="bg-muted p-4 rounded-lg">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={getRoleColor(fromRole)}>
                                    {fromRole}
                                  </Badge>
                                  <span className="text-muted-foreground">→</span>
                                  <Badge className={getRoleColor(toRole)}>
                                    {toRole}
                                  </Badge>
                                </div>
                                <div className="text-sm font-medium">
                                  Transfer #{transfer.id}
                                </div>
                              </div>
                              <div className="text-right">
                                {getStatusBadge(transfer.status)}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="text-muted-foreground mb-1">From</div>
                                <div className="font-mono">{formatAddress(transfer.from)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">To</div>
                                <div className="font-mono">{formatAddress(transfer.to)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Token Used</div>
                                <Link href={`/token/${transfer.tokenId}`}>
                                  <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                                    Token #{transfer.tokenId}
                                  </Badge>
                                </Link>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Amount</div>
                                <div className="font-semibold">{transfer.amount} tokens</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Requested</div>
                                <div>{formatDate(transfer.requestTimestamp)}</div>
                              </div>
                              {transfer.responseTimestamp > 0 && (
                                <div>
                                  <div className="text-muted-foreground mb-1">Completed</div>
                                  <div>{formatDate(transfer.responseTimestamp)}</div>
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-3">
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="outline" size="sm">
                                  View Transfer Details
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                        
                        {/* Arrow to next transfer */}
                        {!isLast && (
                          <div className="flex justify-center mb-2">
                            <div className="w-0.5 h-8 bg-blue-500"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Summary Table */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">History Summary</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transfer ID</TableHead>
                        <TableHead>Token ID</TableHead>
                        <TableHead>From Role</TableHead>
                        <TableHead>To Role</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfers.map((transfer) => {
                        const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                        const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                        
                        return (
                          <TableRow key={transfer.id}>
                            <TableCell className="font-medium">#{transfer.id}</TableCell>
                            <TableCell>
                              <Link href={`/token/${transfer.tokenId}`}>
                                <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                                  #{transfer.tokenId}
                                </Badge>
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(fromRole)} variant="outline">
                                {fromRole}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(toRole)} variant="outline">
                                {toRole}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">{transfer.amount}</TableCell>
                            <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                            <TableCell className="text-sm">
                              {formatDate(transfer.requestTimestamp)}
                            </TableCell>
                            <TableCell>
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="link" size="sm">
                                  View
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}


```


Simplifying the logic: for parent tokens, only show transfers that occurred before the direct child token was created.


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
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

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
}

export default function TokenHistoryPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [token, setToken] = useState<ProductToken | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [tokenChain, setTokenChain] = useState<ProductToken[]>([]);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadHistory();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  // Recursive function to load all parent tokens and their histories
  const loadTokenChain = async (
    contract: ethers.Contract,
    currentTokenId: number,
    chain: ProductToken[] = []
  ): Promise<ProductToken[]> => {
    try {
      const tokenData = await contract.getProductToken(currentTokenId);
      const tokenObj: ProductToken = {
        id: currentTokenId,
        creator: tokenData.creator,
        metadata: tokenData.metadata,
        parentId: Number(tokenData.parentId),
        timestamp: Number(tokenData.timestamp),
        isActive: tokenData.isActive,
      };

      const newChain = [tokenObj, ...chain];

      // If this token has a parent, recursively load it
      if (tokenObj.parentId > 0) {
        return await loadTokenChain(contract, tokenObj.parentId, newChain);
      }

      return newChain;
    } catch (error) {
      console.error(`Error loading token ${currentTokenId}:`, error);
      return chain;
    }
  };

  // Load all transfer histories for tokens in the ancestor chain
  const loadAllHistories = async (
    contract: ethers.Contract,
    tokenChain: ProductToken[]
  ): Promise<number[]> => {
    const allHistoryIds: number[] = [];
    const tokenIdsInChain = new Set(tokenChain.map(token => token.id));

    // Load history for each token in the ancestor chain
    for (const token of tokenChain) {
      try {
        const historyIds: bigint[] = await contract.getTokenTransactionHistory(token.id);
        allHistoryIds.push(...historyIds.map((id) => Number(id)));
      } catch (error) {
        console.error(`Error loading history for token ${token.id}:`, error);
      }
    }

    // Remove duplicates
    return Array.from(new Set(allHistoryIds));
  };

  const loadHistory = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Load complete token chain (current token + all parents) - this is the ancestor lineage
      const chain = await loadTokenChain(contract, Number(tokenId));
      setTokenChain(chain);

      // Set current token (first in chain)
      const currentToken = chain[0];
      setToken(currentToken);

      // Create a map of token IDs to their creation timestamps in the ancestor chain
      // This helps us filter out transfers from parent tokens that happened after child tokens were created
      const tokenCreationTimes = new Map<number, number>();
      chain.forEach(token => {
        tokenCreationTimes.set(token.id, token.timestamp);
      });

      // Create a set of token IDs that are in the ancestor chain
      const tokenIdsInChain = new Set(chain.map(token => token.id));

      // Load all transaction histories from tokens in the ancestor chain only
      const allHistoryIds = await loadAllHistories(contract, chain);
      
      // Load all transfer details
      const transferPromises = allHistoryIds.map(async (transferId) => {
        try {
          const transferData = await contract.getTransfer(Number(transferId));
          
          // CRITICAL: Only include transfers for tokens that are in the ancestor chain
          // This ensures we don't show transfers from sibling tokens
          const transferTokenId = Number(transferData.tokenId);
          if (!tokenIdsInChain.has(transferTokenId)) {
            return null;
          }
          
          // For parent tokens, only show transfers that occurred before the direct child token was created
          // This preserves chain integrity by excluding transfers that happened after branching (different paths)
          const isCurrentToken = transferTokenId === currentToken.id;
          if (!isCurrentToken) {
            // This is a parent token - find its direct child in the chain
            const tokenIndex = chain.findIndex(t => t.id === transferTokenId);
            if (tokenIndex >= 0 && tokenIndex > 0) {
              // There is a child token in the chain (child is at index - 1 since chain is [child, parent, grandparent...])
              const childToken = chain[tokenIndex - 1];
              const childCreationTime = childToken.timestamp;
              const transferRequestTime = Number(transferData.requestTimestamp);
              
              // Exclude transfers that happened after the child was created - these are separate branches
              // This ensures we only show the lineage that led to the current token
              if (transferRequestTime > childCreationTime) {
                // This transfer happened after the child token was created, so it's not part of this lineage
                return null;
              }
            }
          }
          
          // Get user roles for from and to addresses
          const fromUser = await contract.getUser(transferData.from);
          const toUser = await contract.getUser(transferData.to);
          
          setUserRoles(prev => ({
            ...prev,
            [transferData.from.toLowerCase()]: fromUser.role,
            [transferData.to.toLowerCase()]: toUser.role,
          }));
          
          return {
            id: Number(transferId),
            tokenId: transferTokenId,
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
        (transfer): transfer is Transfer => transfer !== null
      );

      // Sort by timestamp (oldest first) to show the chain flow
      validTransfers.sort((a, b) => a.requestTimestamp - b.requestTimestamp);

      setTransfers(validTransfers);
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Failed to load product history");
      router.push(`/token/${tokenId}`);
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

  const parseMetadata = (metadata: string) => {
    // Safe JSON parsing with validation
    try {
      const parsed = JSON.parse(metadata);
      // Validate it's an object, not array or null
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Invalid JSON - return safe fallback
    }
    return { name: "Unknown Product" };
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading product history...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Token not found</p>
                <Link href="/token">
                  <Button>Back to Tokens</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const metadata = parseMetadata(token.metadata);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Product History
            </h1>
            <p className="text-muted-foreground mt-2">
              {metadata.name || `Token #${token.id}`} - Complete Supply Chain Tracking
            </p>
          </div>
          <Link href={`/token/${token.id}`}>
            <Button variant="outline">Back to Token</Button>
          </Link>
        </div>

        {/* Token Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Product Name
                </div>
                <div className="text-lg font-semibold">
                  {metadata.name || `Token #${token.id}`}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Token ID
                </div>
                <div className="text-lg font-semibold">#{token.id}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Created
                </div>
                <div className="text-sm">{formatDate(token.timestamp)}</div>
              </div>
            </div>
            {tokenChain.length > 1 && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Product Chain Lineage
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {tokenChain.map((chainToken, index) => {
                    const chainMetadata = parseMetadata(chainToken.metadata);
                    const isLast = index === tokenChain.length - 1;
                    return (
                      <div key={chainToken.id} className="flex items-center gap-2">
                        <Link href={`/token/${chainToken.id}`}>
                          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                            #{chainToken.id} - {chainMetadata.name || `Token ${chainToken.id}`}
                          </Badge>
                        </Link>
                        {!isLast && <span className="text-muted-foreground">→</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transfer Chain */}
        {transfers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No transfer history found for this product</p>
                <p className="text-sm text-muted-foreground">
                  This product has not been transferred yet in the supply chain.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Supply Chain Transfer History</CardTitle>
              <CardDescription>
                Complete transaction history showing the journey of this product through the supply chain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Visual Chain */}
                <div className="relative">
                  {transfers.map((transfer, index) => {
                    const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                    const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                    const isLast = index === transfers.length - 1;
                    
                    return (
                      <div key={transfer.id} className="relative">
                        {/* Transfer Card */}
                        <div className="border-l-4 border-blue-500 pl-4 mb-6">
                          <div className="bg-muted p-4 rounded-lg">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={getRoleColor(fromRole)}>
                                    {fromRole}
                                  </Badge>
                                  <span className="text-muted-foreground">→</span>
                                  <Badge className={getRoleColor(toRole)}>
                                    {toRole}
                                  </Badge>
                                </div>
                                <div className="text-sm font-medium">
                                  Transfer #{transfer.id}
                                </div>
                              </div>
                              <div className="text-right">
                                {getStatusBadge(transfer.status)}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="text-muted-foreground mb-1">From</div>
                                <div className="font-mono">{formatAddress(transfer.from)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">To</div>
                                <div className="font-mono">{formatAddress(transfer.to)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Token Used</div>
                                <Link href={`/token/${transfer.tokenId}`}>
                                  <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                                    Token #{transfer.tokenId}
                                  </Badge>
                                </Link>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Amount</div>
                                <div className="font-semibold">{transfer.amount} tokens</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Requested</div>
                                <div>{formatDate(transfer.requestTimestamp)}</div>
                              </div>
                              {transfer.responseTimestamp > 0 && (
                                <div>
                                  <div className="text-muted-foreground mb-1">Completed</div>
                                  <div>{formatDate(transfer.responseTimestamp)}</div>
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-3">
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="outline" size="sm">
                                  View Transfer Details
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                        
                        {/* Arrow to next transfer */}
                        {!isLast && (
                          <div className="flex justify-center mb-2">
                            <div className="w-0.5 h-8 bg-blue-500"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Summary Table */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">History Summary</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transfer ID</TableHead>
                        <TableHead>Token ID</TableHead>
                        <TableHead>From Role</TableHead>
                        <TableHead>To Role</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfers.map((transfer) => {
                        const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                        const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                        
                        return (
                          <TableRow key={transfer.id}>
                            <TableCell className="font-medium">#{transfer.id}</TableCell>
                            <TableCell>
                              <Link href={`/token/${transfer.tokenId}`}>
                                <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                                  #{transfer.tokenId}
                                </Badge>
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(fromRole)} variant="outline">
                                {fromRole}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(toRole)} variant="outline">
                                {toRole}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">{transfer.amount}</TableCell>
                            <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                            <TableCell className="text-sm">
                              {formatDate(transfer.requestTimestamp)}
                            </TableCell>
                            <TableCell>
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="link" size="sm">
                                  View
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}


```


Checking how the chain is ordered:



Fixing the chain order logic: the current token is at the end of the chain, not the beginning.


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
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

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
}

export default function TokenHistoryPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [token, setToken] = useState<ProductToken | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [tokenChain, setTokenChain] = useState<ProductToken[]>([]);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadHistory();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  // Recursive function to load all parent tokens and their histories
  const loadTokenChain = async (
    contract: ethers.Contract,
    currentTokenId: number,
    chain: ProductToken[] = []
  ): Promise<ProductToken[]> => {
    try {
      const tokenData = await contract.getProductToken(currentTokenId);
      const tokenObj: ProductToken = {
        id: currentTokenId,
        creator: tokenData.creator,
        metadata: tokenData.metadata,
        parentId: Number(tokenData.parentId),
        timestamp: Number(tokenData.timestamp),
        isActive: tokenData.isActive,
      };

      const newChain = [tokenObj, ...chain];

      // If this token has a parent, recursively load it
      if (tokenObj.parentId > 0) {
        return await loadTokenChain(contract, tokenObj.parentId, newChain);
      }

      return newChain;
    } catch (error) {
      console.error(`Error loading token ${currentTokenId}:`, error);
      return chain;
    }
  };

  // Load all transfer histories for tokens in the ancestor chain
  const loadAllHistories = async (
    contract: ethers.Contract,
    tokenChain: ProductToken[]
  ): Promise<number[]> => {
    const allHistoryIds: number[] = [];
    const tokenIdsInChain = new Set(tokenChain.map(token => token.id));

    // Load history for each token in the ancestor chain
    for (const token of tokenChain) {
      try {
        const historyIds: bigint[] = await contract.getTokenTransactionHistory(token.id);
        allHistoryIds.push(...historyIds.map((id) => Number(id)));
      } catch (error) {
        console.error(`Error loading history for token ${token.id}:`, error);
      }
    }

    // Remove duplicates
    return Array.from(new Set(allHistoryIds));
  };

  const loadHistory = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Load complete token chain (oldest ancestor first, current token last) - this is the ancestor lineage
      const chain = await loadTokenChain(contract, Number(tokenId));
      setTokenChain(chain);

      // Set current token (last in chain - the token being viewed)
      const currentToken = chain[chain.length - 1];
      setToken(currentToken);

      // Create a map of token IDs to their creation timestamps in the ancestor chain
      // This helps us filter out transfers from parent tokens that happened after child tokens were created
      const tokenCreationTimes = new Map<number, number>();
      chain.forEach(token => {
        tokenCreationTimes.set(token.id, token.timestamp);
      });

      // Create a set of token IDs that are in the ancestor chain
      const tokenIdsInChain = new Set(chain.map(token => token.id));

      // Load all transaction histories from tokens in the ancestor chain only
      const allHistoryIds = await loadAllHistories(contract, chain);
      
      // Load all transfer details
      const transferPromises = allHistoryIds.map(async (transferId) => {
        try {
          const transferData = await contract.getTransfer(Number(transferId));
          
          // CRITICAL: Only include transfers for tokens that are in the ancestor chain
          // This ensures we don't show transfers from sibling tokens
          const transferTokenId = Number(transferData.tokenId);
          if (!tokenIdsInChain.has(transferTokenId)) {
            return null;
          }
          
          // For parent tokens, only show transfers that occurred before the direct child token was created
          // This preserves chain integrity by excluding transfers that happened after branching (different paths)
          const isCurrentToken = transferTokenId === currentToken.id;
          if (!isCurrentToken) {
            // This is a parent token - find its direct child in the chain
            const tokenIndex = chain.findIndex(t => t.id === transferTokenId);
            if (tokenIndex >= 0 && tokenIndex > 0) {
              // There is a child token in the chain (child is at index - 1 since chain is [child, parent, grandparent...])
              const childToken = chain[tokenIndex - 1];
              const childCreationTime = childToken.timestamp;
              const transferRequestTime = Number(transferData.requestTimestamp);
              
              // Exclude transfers that happened after the child was created - these are separate branches
              // This ensures we only show the lineage that led to the current token
              if (transferRequestTime > childCreationTime) {
                // This transfer happened after the child token was created, so it's not part of this lineage
                return null;
              }
            }
          }
          
          // Get user roles for from and to addresses
          const fromUser = await contract.getUser(transferData.from);
          const toUser = await contract.getUser(transferData.to);
          
          setUserRoles(prev => ({
            ...prev,
            [transferData.from.toLowerCase()]: fromUser.role,
            [transferData.to.toLowerCase()]: toUser.role,
          }));
          
          return {
            id: Number(transferId),
            tokenId: transferTokenId,
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
        (transfer): transfer is Transfer => transfer !== null
      );

      // Sort by timestamp (oldest first) to show the chain flow
      validTransfers.sort((a, b) => a.requestTimestamp - b.requestTimestamp);

      setTransfers(validTransfers);
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Failed to load product history");
      router.push(`/token/${tokenId}`);
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

  const parseMetadata = (metadata: string) => {
    // Safe JSON parsing with validation
    try {
      const parsed = JSON.parse(metadata);
      // Validate it's an object, not array or null
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Invalid JSON - return safe fallback
    }
    return { name: "Unknown Product" };
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading product history...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Token not found</p>
                <Link href="/token">
                  <Button>Back to Tokens</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const metadata = parseMetadata(token.metadata);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Product History
            </h1>
            <p className="text-muted-foreground mt-2">
              {metadata.name || `Token #${token.id}`} - Complete Supply Chain Tracking
            </p>
          </div>
          <Link href={`/token/${token.id}`}>
            <Button variant="outline">Back to Token</Button>
          </Link>
        </div>

        {/* Token Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Product Name
                </div>
                <div className="text-lg font-semibold">
                  {metadata.name || `Token #${token.id}`}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Token ID
                </div>
                <div className="text-lg font-semibold">#{token.id}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Created
                </div>
                <div className="text-sm">{formatDate(token.timestamp)}</div>
              </div>
            </div>
            {tokenChain.length > 1 && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Product Chain Lineage
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {tokenChain.map((chainToken, index) => {
                    const chainMetadata = parseMetadata(chainToken.metadata);
                    const isLast = index === tokenChain.length - 1;
                    return (
                      <div key={chainToken.id} className="flex items-center gap-2">
                        <Link href={`/token/${chainToken.id}`}>
                          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                            #{chainToken.id} - {chainMetadata.name || `Token ${chainToken.id}`}
                          </Badge>
                        </Link>
                        {!isLast && <span className="text-muted-foreground">→</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transfer Chain */}
        {transfers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No transfer history found for this product</p>
                <p className="text-sm text-muted-foreground">
                  This product has not been transferred yet in the supply chain.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Supply Chain Transfer History</CardTitle>
              <CardDescription>
                Complete transaction history showing the journey of this product through the supply chain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Visual Chain */}
                <div className="relative">
                  {transfers.map((transfer, index) => {
                    const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                    const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                    const isLast = index === transfers.length - 1;
                    
                    return (
                      <div key={transfer.id} className="relative">
                        {/* Transfer Card */}
                        <div className="border-l-4 border-blue-500 pl-4 mb-6">
                          <div className="bg-muted p-4 rounded-lg">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={getRoleColor(fromRole)}>
                                    {fromRole}
                                  </Badge>
                                  <span className="text-muted-foreground">→</span>
                                  <Badge className={getRoleColor(toRole)}>
                                    {toRole}
                                  </Badge>
                                </div>
                                <div className="text-sm font-medium">
                                  Transfer #{transfer.id}
                                </div>
                              </div>
                              <div className="text-right">
                                {getStatusBadge(transfer.status)}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="text-muted-foreground mb-1">From</div>
                                <div className="font-mono">{formatAddress(transfer.from)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">To</div>
                                <div className="font-mono">{formatAddress(transfer.to)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Token Used</div>
                                <Link href={`/token/${transfer.tokenId}`}>
                                  <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                                    Token #{transfer.tokenId}
                                  </Badge>
                                </Link>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Amount</div>
                                <div className="font-semibold">{transfer.amount} tokens</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Requested</div>
                                <div>{formatDate(transfer.requestTimestamp)}</div>
                              </div>
                              {transfer.responseTimestamp > 0 && (
                                <div>
                                  <div className="text-muted-foreground mb-1">Completed</div>
                                  <div>{formatDate(transfer.responseTimestamp)}</div>
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-3">
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="outline" size="sm">
                                  View Transfer Details
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                        
                        {/* Arrow to next transfer */}
                        {!isLast && (
                          <div className="flex justify-center mb-2">
                            <div className="w-0.5 h-8 bg-blue-500"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Summary Table */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">History Summary</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transfer ID</TableHead>
                        <TableHead>Token ID</TableHead>
                        <TableHead>From Role</TableHead>
                        <TableHead>To Role</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfers.map((transfer) => {
                        const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                        const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                        
                        return (
                          <TableRow key={transfer.id}>
                            <TableCell className="font-medium">#{transfer.id}</TableCell>
                            <TableCell>
                              <Link href={`/token/${transfer.tokenId}`}>
                                <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                                  #{transfer.tokenId}
                                </Badge>
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(fromRole)} variant="outline">
                                {fromRole}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(toRole)} variant="outline">
                                {toRole}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">{transfer.amount}</TableCell>
                            <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                            <TableCell className="text-sm">
                              {formatDate(transfer.requestTimestamp)}
                            </TableCell>
                            <TableCell>
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="link" size="sm">
                                  View
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}


```


Fixing the logic to find the child token correctly:


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
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

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
}

export default function TokenHistoryPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [token, setToken] = useState<ProductToken | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [tokenChain, setTokenChain] = useState<ProductToken[]>([]);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadHistory();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  // Recursive function to load all parent tokens and their histories
  const loadTokenChain = async (
    contract: ethers.Contract,
    currentTokenId: number,
    chain: ProductToken[] = []
  ): Promise<ProductToken[]> => {
    try {
      const tokenData = await contract.getProductToken(currentTokenId);
      const tokenObj: ProductToken = {
        id: currentTokenId,
        creator: tokenData.creator,
        metadata: tokenData.metadata,
        parentId: Number(tokenData.parentId),
        timestamp: Number(tokenData.timestamp),
        isActive: tokenData.isActive,
      };

      const newChain = [tokenObj, ...chain];

      // If this token has a parent, recursively load it
      if (tokenObj.parentId > 0) {
        return await loadTokenChain(contract, tokenObj.parentId, newChain);
      }

      return newChain;
    } catch (error) {
      console.error(`Error loading token ${currentTokenId}:`, error);
      return chain;
    }
  };

  // Load all transfer histories for tokens in the ancestor chain
  const loadAllHistories = async (
    contract: ethers.Contract,
    tokenChain: ProductToken[]
  ): Promise<number[]> => {
    const allHistoryIds: number[] = [];
    const tokenIdsInChain = new Set(tokenChain.map(token => token.id));

    // Load history for each token in the ancestor chain
    for (const token of tokenChain) {
      try {
        const historyIds: bigint[] = await contract.getTokenTransactionHistory(token.id);
        allHistoryIds.push(...historyIds.map((id) => Number(id)));
      } catch (error) {
        console.error(`Error loading history for token ${token.id}:`, error);
      }
    }

    // Remove duplicates
    return Array.from(new Set(allHistoryIds));
  };

  const loadHistory = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Load complete token chain (oldest ancestor first, current token last) - this is the ancestor lineage
      const chain = await loadTokenChain(contract, Number(tokenId));
      setTokenChain(chain);

      // Set current token (last in chain - the token being viewed)
      const currentToken = chain[chain.length - 1];
      setToken(currentToken);

      // Create a map of token IDs to their creation timestamps in the ancestor chain
      // This helps us filter out transfers from parent tokens that happened after child tokens were created
      const tokenCreationTimes = new Map<number, number>();
      chain.forEach(token => {
        tokenCreationTimes.set(token.id, token.timestamp);
      });

      // Create a set of token IDs that are in the ancestor chain
      const tokenIdsInChain = new Set(chain.map(token => token.id));

      // Load all transaction histories from tokens in the ancestor chain only
      const allHistoryIds = await loadAllHistories(contract, chain);
      
      // Load all transfer details
      const transferPromises = allHistoryIds.map(async (transferId) => {
        try {
          const transferData = await contract.getTransfer(Number(transferId));
          
          // CRITICAL: Only include transfers for tokens that are in the ancestor chain
          // This ensures we don't show transfers from sibling tokens
          const transferTokenId = Number(transferData.tokenId);
          if (!tokenIdsInChain.has(transferTokenId)) {
            return null;
          }
          
          // For parent tokens, only show transfers that occurred before the direct child token was created
          // This preserves chain integrity by excluding transfers that happened after branching (different paths)
          const isCurrentToken = transferTokenId === currentToken.id;
          if (!isCurrentToken) {
            // This is a parent token - find its direct child in the chain
            // Chain order: [oldest ancestor, ..., parent, current token]
            // So for a token at index i, its child is at index i + 1
            const tokenIndex = chain.findIndex(t => t.id === transferTokenId);
            if (tokenIndex >= 0 && tokenIndex < chain.length - 1) {
              // There is a child token in the chain
              const childToken = chain[tokenIndex + 1];
              const childCreationTime = childToken.timestamp;
              const transferRequestTime = Number(transferData.requestTimestamp);
              
              // Exclude transfers that happened after the child was created - these are separate branches
              // This ensures we only show the lineage that led to the current token
              if (transferRequestTime > childCreationTime) {
                // This transfer happened after the child token was created, so it's not part of this lineage
                return null;
              }
            }
          }
          
          // Get user roles for from and to addresses
          const fromUser = await contract.getUser(transferData.from);
          const toUser = await contract.getUser(transferData.to);
          
          setUserRoles(prev => ({
            ...prev,
            [transferData.from.toLowerCase()]: fromUser.role,
            [transferData.to.toLowerCase()]: toUser.role,
          }));
          
          return {
            id: Number(transferId),
            tokenId: transferTokenId,
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
        (transfer): transfer is Transfer => transfer !== null
      );

      // Sort by timestamp (oldest first) to show the chain flow
      validTransfers.sort((a, b) => a.requestTimestamp - b.requestTimestamp);

      setTransfers(validTransfers);
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Failed to load product history");
      router.push(`/token/${tokenId}`);
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

  const parseMetadata = (metadata: string) => {
    // Safe JSON parsing with validation
    try {
      const parsed = JSON.parse(metadata);
      // Validate it's an object, not array or null
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Invalid JSON - return safe fallback
    }
    return { name: "Unknown Product" };
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading product history...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Token not found</p>
                <Link href="/token">
                  <Button>Back to Tokens</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const metadata = parseMetadata(token.metadata);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Product History
            </h1>
            <p className="text-muted-foreground mt-2">
              {metadata.name || `Token #${token.id}`} - Complete Supply Chain Tracking
            </p>
          </div>
          <Link href={`/token/${token.id}`}>
            <Button variant="outline">Back to Token</Button>
          </Link>
        </div>

        {/* Token Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Product Name
                </div>
                <div className="text-lg font-semibold">
                  {metadata.name || `Token #${token.id}`}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Token ID
                </div>
                <div className="text-lg font-semibold">#{token.id}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Created
                </div>
                <div className="text-sm">{formatDate(token.timestamp)}</div>
              </div>
            </div>
            {tokenChain.length > 1 && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Product Chain Lineage
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {tokenChain.map((chainToken, index) => {
                    const chainMetadata = parseMetadata(chainToken.metadata);
                    const isLast = index === tokenChain.length - 1;
                    return (
                      <div key={chainToken.id} className="flex items-center gap-2">
                        <Link href={`/token/${chainToken.id}`}>
                          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                            #{chainToken.id} - {chainMetadata.name || `Token ${chainToken.id}`}
                          </Badge>
                        </Link>
                        {!isLast && <span className="text-muted-foreground">→</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transfer Chain */}
        {transfers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No transfer history found for this product</p>
                <p className="text-sm text-muted-foreground">
                  This product has not been transferred yet in the supply chain.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Supply Chain Transfer History</CardTitle>
              <CardDescription>
                Complete transaction history showing the journey of this product through the supply chain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Visual Chain */}
                <div className="relative">
                  {transfers.map((transfer, index) => {
                    const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                    const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                    const isLast = index === transfers.length - 1;
                    
                    return (
                      <div key={transfer.id} className="relative">
                        {/* Transfer Card */}
                        <div className="border-l-4 border-blue-500 pl-4 mb-6">
                          <div className="bg-muted p-4 rounded-lg">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={getRoleColor(fromRole)}>
                                    {fromRole}
                                  </Badge>
                                  <span className="text-muted-foreground">→</span>
                                  <Badge className={getRoleColor(toRole)}>
                                    {toRole}
                                  </Badge>
                                </div>
                                <div className="text-sm font-medium">
                                  Transfer #{transfer.id}
                                </div>
                              </div>
                              <div className="text-right">
                                {getStatusBadge(transfer.status)}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="text-muted-foreground mb-1">From</div>
                                <div className="font-mono">{formatAddress(transfer.from)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">To</div>
                                <div className="font-mono">{formatAddress(transfer.to)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Token Used</div>
                                <Link href={`/token/${transfer.tokenId}`}>
                                  <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                                    Token #{transfer.tokenId}
                                  </Badge>
                                </Link>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Amount</div>
                                <div className="font-semibold">{transfer.amount} tokens</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Requested</div>
                                <div>{formatDate(transfer.requestTimestamp)}</div>
                              </div>
                              {transfer.responseTimestamp > 0 && (
                                <div>
                                  <div className="text-muted-foreground mb-1">Completed</div>
                                  <div>{formatDate(transfer.responseTimestamp)}</div>
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-3">
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="outline" size="sm">
                                  View Transfer Details
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                        
                        {/* Arrow to next transfer */}
                        {!isLast && (
                          <div className="flex justify-center mb-2">
                            <div className="w-0.5 h-8 bg-blue-500"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Summary Table */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">History Summary</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transfer ID</TableHead>
                        <TableHead>Token ID</TableHead>
                        <TableHead>From Role</TableHead>
                        <TableHead>To Role</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfers.map((transfer) => {
                        const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                        const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                        
                        return (
                          <TableRow key={transfer.id}>
                            <TableCell className="font-medium">#{transfer.id}</TableCell>
                            <TableCell>
                              <Link href={`/token/${transfer.tokenId}`}>
                                <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                                  #{transfer.tokenId}
                                </Badge>
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(fromRole)} variant="outline">
                                {fromRole}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(toRole)} variant="outline">
                                {toRole}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">{transfer.amount}</TableCell>
                            <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                            <TableCell className="text-sm">
                              {formatDate(transfer.requestTimestamp)}
                            </TableCell>
                            <TableCell>
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="link" size="sm">
                                  View
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}


```


Removing the unused variable and checking for lint errors:


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
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

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
}

export default function TokenHistoryPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [token, setToken] = useState<ProductToken | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [tokenChain, setTokenChain] = useState<ProductToken[]>([]);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadHistory();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  // Recursive function to load all parent tokens and their histories
  const loadTokenChain = async (
    contract: ethers.Contract,
    currentTokenId: number,
    chain: ProductToken[] = []
  ): Promise<ProductToken[]> => {
    try {
      const tokenData = await contract.getProductToken(currentTokenId);
      const tokenObj: ProductToken = {
        id: currentTokenId,
        creator: tokenData.creator,
        metadata: tokenData.metadata,
        parentId: Number(tokenData.parentId),
        timestamp: Number(tokenData.timestamp),
        isActive: tokenData.isActive,
      };

      const newChain = [tokenObj, ...chain];

      // If this token has a parent, recursively load it
      if (tokenObj.parentId > 0) {
        return await loadTokenChain(contract, tokenObj.parentId, newChain);
      }

      return newChain;
    } catch (error) {
      console.error(`Error loading token ${currentTokenId}:`, error);
      return chain;
    }
  };

  // Load all transfer histories for tokens in the ancestor chain
  const loadAllHistories = async (
    contract: ethers.Contract,
    tokenChain: ProductToken[]
  ): Promise<number[]> => {
    const allHistoryIds: number[] = [];
    const tokenIdsInChain = new Set(tokenChain.map(token => token.id));

    // Load history for each token in the ancestor chain
    for (const token of tokenChain) {
      try {
        const historyIds: bigint[] = await contract.getTokenTransactionHistory(token.id);
        allHistoryIds.push(...historyIds.map((id) => Number(id)));
      } catch (error) {
        console.error(`Error loading history for token ${token.id}:`, error);
      }
    }

    // Remove duplicates
    return Array.from(new Set(allHistoryIds));
  };

  const loadHistory = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Load complete token chain (oldest ancestor first, current token last) - this is the ancestor lineage
      const chain = await loadTokenChain(contract, Number(tokenId));
      setTokenChain(chain);

      // Set current token (last in chain - the token being viewed)
      const currentToken = chain[chain.length - 1];
      setToken(currentToken);

      // Create a set of token IDs that are in the ancestor chain
      const tokenIdsInChain = new Set(chain.map(token => token.id));

      // Load all transaction histories from tokens in the ancestor chain only
      const allHistoryIds = await loadAllHistories(contract, chain);
      
      // Load all transfer details
      const transferPromises = allHistoryIds.map(async (transferId) => {
        try {
          const transferData = await contract.getTransfer(Number(transferId));
          
          // CRITICAL: Only include transfers for tokens that are in the ancestor chain
          // This ensures we don't show transfers from sibling tokens
          const transferTokenId = Number(transferData.tokenId);
          if (!tokenIdsInChain.has(transferTokenId)) {
            return null;
          }
          
          // For parent tokens, only show transfers that occurred before the direct child token was created
          // This preserves chain integrity by excluding transfers that happened after branching (different paths)
          const isCurrentToken = transferTokenId === currentToken.id;
          if (!isCurrentToken) {
            // This is a parent token - find its direct child in the chain
            // Chain order: [oldest ancestor, ..., parent, current token]
            // So for a token at index i, its child is at index i + 1
            const tokenIndex = chain.findIndex(t => t.id === transferTokenId);
            if (tokenIndex >= 0 && tokenIndex < chain.length - 1) {
              // There is a child token in the chain
              const childToken = chain[tokenIndex + 1];
              const childCreationTime = childToken.timestamp;
              const transferRequestTime = Number(transferData.requestTimestamp);
              
              // Exclude transfers that happened after the child was created - these are separate branches
              // This ensures we only show the lineage that led to the current token
              if (transferRequestTime > childCreationTime) {
                // This transfer happened after the child token was created, so it's not part of this lineage
                return null;
              }
            }
          }
          
          // Get user roles for from and to addresses
          const fromUser = await contract.getUser(transferData.from);
          const toUser = await contract.getUser(transferData.to);
          
          setUserRoles(prev => ({
            ...prev,
            [transferData.from.toLowerCase()]: fromUser.role,
            [transferData.to.toLowerCase()]: toUser.role,
          }));
          
          return {
            id: Number(transferId),
            tokenId: transferTokenId,
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
        (transfer): transfer is Transfer => transfer !== null
      );

      // Sort by timestamp (oldest first) to show the chain flow
      validTransfers.sort((a, b) => a.requestTimestamp - b.requestTimestamp);

      setTransfers(validTransfers);
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Failed to load product history");
      router.push(`/token/${tokenId}`);
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

  const parseMetadata = (metadata: string) => {
    // Safe JSON parsing with validation
    try {
      const parsed = JSON.parse(metadata);
      // Validate it's an object, not array or null
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Invalid JSON - return safe fallback
    }
    return { name: "Unknown Product" };
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading product history...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Token not found</p>
                <Link href="/token">
                  <Button>Back to Tokens</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const metadata = parseMetadata(token.metadata);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Product History
            </h1>
            <p className="text-muted-foreground mt-2">
              {metadata.name || `Token #${token.id}`} - Complete Supply Chain Tracking
            </p>
          </div>
          <Link href={`/token/${token.id}`}>
            <Button variant="outline">Back to Token</Button>
          </Link>
        </div>

        {/* Token Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Product Name
                </div>
                <div className="text-lg font-semibold">
                  {metadata.name || `Token #${token.id}`}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Token ID
                </div>
                <div className="text-lg font-semibold">#{token.id}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Created
                </div>
                <div className="text-sm">{formatDate(token.timestamp)}</div>
              </div>
            </div>
            {tokenChain.length > 1 && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Product Chain Lineage
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {tokenChain.map((chainToken, index) => {
                    const chainMetadata = parseMetadata(chainToken.metadata);
                    const isLast = index === tokenChain.length - 1;
                    return (
                      <div key={chainToken.id} className="flex items-center gap-2">
                        <Link href={`/token/${chainToken.id}`}>
                          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                            #{chainToken.id} - {chainMetadata.name || `Token ${chainToken.id}`}
                          </Badge>
                        </Link>
                        {!isLast && <span className="text-muted-foreground">→</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transfer Chain */}
        {transfers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No transfer history found for this product</p>
                <p className="text-sm text-muted-foreground">
                  This product has not been transferred yet in the supply chain.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Supply Chain Transfer History</CardTitle>
              <CardDescription>
                Complete transaction history showing the journey of this product through the supply chain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Visual Chain */}
                <div className="relative">
                  {transfers.map((transfer, index) => {
                    const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                    const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                    const isLast = index === transfers.length - 1;
                    
                    return (
                      <div key={transfer.id} className="relative">
                        {/* Transfer Card */}
                        <div className="border-l-4 border-blue-500 pl-4 mb-6">
                          <div className="bg-muted p-4 rounded-lg">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={getRoleColor(fromRole)}>
                                    {fromRole}
                                  </Badge>
                                  <span className="text-muted-foreground">→</span>
                                  <Badge className={getRoleColor(toRole)}>
                                    {toRole}
                                  </Badge>
                                </div>
                                <div className="text-sm font-medium">
                                  Transfer #{transfer.id}
                                </div>
                              </div>
                              <div className="text-right">
                                {getStatusBadge(transfer.status)}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="text-muted-foreground mb-1">From</div>
                                <div className="font-mono">{formatAddress(transfer.from)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">To</div>
                                <div className="font-mono">{formatAddress(transfer.to)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Token Used</div>
                                <Link href={`/token/${transfer.tokenId}`}>
                                  <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                                    Token #{transfer.tokenId}
                                  </Badge>
                                </Link>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Amount</div>
                                <div className="font-semibold">{transfer.amount} tokens</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Requested</div>
                                <div>{formatDate(transfer.requestTimestamp)}</div>
                              </div>
                              {transfer.responseTimestamp > 0 && (
                                <div>
                                  <div className="text-muted-foreground mb-1">Completed</div>
                                  <div>{formatDate(transfer.responseTimestamp)}</div>
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-3">
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="outline" size="sm">
                                  View Transfer Details
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                        
                        {/* Arrow to next transfer */}
                        {!isLast && (
                          <div className="flex justify-center mb-2">
                            <div className="w-0.5 h-8 bg-blue-500"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Summary Table */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">History Summary</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transfer ID</TableHead>
                        <TableHead>Token ID</TableHead>
                        <TableHead>From Role</TableHead>
                        <TableHead>To Role</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfers.map((transfer) => {
                        const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                        const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                        
                        return (
                          <TableRow key={transfer.id}>
                            <TableCell className="font-medium">#{transfer.id}</TableCell>
                            <TableCell>
                              <Link href={`/token/${transfer.tokenId}`}>
                                <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                                  #{transfer.tokenId}
                                </Badge>
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(fromRole)} variant="outline">
                                {fromRole}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(toRole)} variant="outline">
                                {toRole}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">{transfer.amount}</TableCell>
                            <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                            <TableCell className="text-sm">
                              {formatDate(transfer.requestTimestamp)}
                            </TableCell>
                            <TableCell>
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="link" size="sm">
                                  View
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}


```


## Summary

**Problem**: Viewing a token's history showed transfers from parent tokens that occurred after a child token was created, mixing unrelated branches. For example, viewing Token R (retailer token) showed Transfer #5 (Retailer -> Consumer 6A65 for Token F), which happened after Token R was created and is a separate branch.

**Solution**:
1. Restored loading history from the ancestor chain (current token + all parents).
2. Corrected current token identification: the viewed token is the last element in the chain, not the first.
3. Added timestamp filtering: for parent tokens, only show transfers that occurred before the direct child token was created. This excludes transfers from separate branches.

**Result**: 
- When viewing Token F (Consumer 6A65): Shows Producer -> Factory -> Retailer -> Consumer using Token P and Token F.
- When viewing Token R (Consumer 9720): Shows Producer -> Factory -> Retailer -> Consumer using Token P, Token F, and Token R, excluding Transfer #5 (Retailer -> Consumer 6A65 for Token F) since it happened after Token R was created.

This preserves chain integrity: each token shows only the lineage that led to it, excluding transfers from separate branches.

---

**User**

on the transfer detailed view http://localhost:3000/transfers/4 when i click back to transfers are sending me to pending transfer list not to the transfer history i was seeing when i click on the view detail, please fix this the navigation must be easy for the users

---

**Cursor**


Fixing the back navigation: remembering the previous view (pending vs history) and returning to it. Checking the transfer detail page:



Fixing navigation: preserving the view mode (pending/history/all) when returning from the transfer detail page. Updating both pages to use URL query parameters.



Updating both pages to preserve the view mode using URL query parameters.


```typescriptreact
"use client";

import { useEffect, useState, useCallback } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter, useSearchParams } from "next/navigation";
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
    const date = new Date(Number(timestamp) * 1000);
    // Format: MM/DD/YY HH:MM (compact format)
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}/${day}/${year} ${hours}:${minutes}`;
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
                    <TableHead>ID</TableHead>
                    <TableHead>From</TableHead>
                    {isAdmin && <TableHead>To</TableHead>}
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
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">Track: {transfer.id}</span>
                          <Link href={`/token/${transfer.tokenId}`}>
                            <Button variant="link" className="p-0 h-auto text-xs text-primary">
                              token: {transfer.tokenId}
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatAddress(transfer.from)}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="font-mono text-sm">
                          {formatAddress(transfer.to)}
                        </TableCell>
                      )}
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
import { useRouter, useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Get viewMode from URL params or default to "pending"
  const urlViewMode = searchParams.get("viewMode") as "pending" | "all" | "history" | null;
  const [viewMode, setViewMode] = useState<"pending" | "all" | "history">(
    urlViewMode && ["pending", "all", "history"].includes(urlViewMode) 
      ? urlViewMode 
      : "pending"
  );
  const isAdmin = user?.role === "Admin";

  // Update viewMode when URL param changes
  useEffect(() => {
    if (urlViewMode && ["pending", "all", "history"].includes(urlViewMode)) {
      setViewMode(urlViewMode);
    }
  }, [urlViewMode]);

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
    const date = new Date(Number(timestamp) * 1000);
    // Format: MM/DD/YY HH:MM (compact format)
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}/${day}/${year} ${hours}:${minutes}`;
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
                    <TableHead>ID</TableHead>
                    <TableHead>From</TableHead>
                    {isAdmin && <TableHead>To</TableHead>}
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
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">Track: {transfer.id}</span>
                          <Link href={`/token/${transfer.tokenId}`}>
                            <Button variant="link" className="p-0 h-auto text-xs text-primary">
                              token: {transfer.tokenId}
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatAddress(transfer.from)}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="font-mono text-sm">
                          {formatAddress(transfer.to)}
                        </TableCell>
                      )}
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
import { useRouter, useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Get viewMode from URL params or default to "pending"
  const urlViewMode = searchParams.get("viewMode") as "pending" | "all" | "history" | null;
  const [viewMode, setViewMode] = useState<"pending" | "all" | "history">(
    urlViewMode && ["pending", "all", "history"].includes(urlViewMode) 
      ? urlViewMode 
      : "pending"
  );
  const isAdmin = user?.role === "Admin";

  // Update viewMode when URL param changes
  useEffect(() => {
    if (urlViewMode && ["pending", "all", "history"].includes(urlViewMode)) {
      setViewMode(urlViewMode);
    }
  }, [urlViewMode]);

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
    const date = new Date(Number(timestamp) * 1000);
    // Format: MM/DD/YY HH:MM (compact format)
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}/${day}/${year} ${hours}:${minutes}`;
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
                  onClick={() => {
                    setViewMode("pending");
                    router.push("/transfers?viewMode=pending");
                  }}
                >
                  Pending
                </Button>
                <Button
                  variant={viewMode === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setViewMode("all");
                    router.push("/transfers?viewMode=all");
                  }}
                >
                  All Transfers
                </Button>
                <Button
                  variant={viewMode === "history" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setViewMode("history");
                    router.push("/transfers?viewMode=history");
                  }}
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
                    <TableHead>ID</TableHead>
                    <TableHead>From</TableHead>
                    {isAdmin && <TableHead>To</TableHead>}
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
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">Track: {transfer.id}</span>
                          <Link href={`/token/${transfer.tokenId}`}>
                            <Button variant="link" className="p-0 h-auto text-xs text-primary">
                              token: {transfer.tokenId}
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatAddress(transfer.from)}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="font-mono text-sm">
                          {formatAddress(transfer.to)}
                        </TableCell>
                      )}
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
import { useRouter, useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Get viewMode from URL params or default to "pending"
  const urlViewMode = searchParams.get("viewMode") as "pending" | "all" | "history" | null;
  const [viewMode, setViewMode] = useState<"pending" | "all" | "history">(
    urlViewMode && ["pending", "all", "history"].includes(urlViewMode) 
      ? urlViewMode 
      : "pending"
  );
  const isAdmin = user?.role === "Admin";

  // Update viewMode when URL param changes
  useEffect(() => {
    if (urlViewMode && ["pending", "all", "history"].includes(urlViewMode)) {
      setViewMode(urlViewMode);
    }
  }, [urlViewMode]);

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
    const date = new Date(Number(timestamp) * 1000);
    // Format: MM/DD/YY HH:MM (compact format)
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}/${day}/${year} ${hours}:${minutes}`;
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
                  onClick={() => {
                    setViewMode("pending");
                    router.push("/transfers?viewMode=pending");
                  }}
                >
                  Pending
                </Button>
                <Button
                  variant={viewMode === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setViewMode("all");
                    router.push("/transfers?viewMode=all");
                  }}
                >
                  All Transfers
                </Button>
                <Button
                  variant={viewMode === "history" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setViewMode("history");
                    router.push("/transfers?viewMode=history");
                  }}
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
                    <TableHead>ID</TableHead>
                    <TableHead>From</TableHead>
                    {isAdmin && <TableHead>To</TableHead>}
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
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">Track: {transfer.id}</span>
                          <Link href={`/token/${transfer.tokenId}`}>
                            <Button variant="link" className="p-0 h-auto text-xs text-primary">
                              token: {transfer.tokenId}
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatAddress(transfer.from)}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="font-mono text-sm">
                          {formatAddress(transfer.to)}
                        </TableCell>
                      )}
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
                          <Link href={`/transfers/${transfer.id}?from=${viewMode}`}>
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


Updating the transfer detail page to read the query parameter and navigate back correctly:


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";

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

export default function TransferDetailPage() {
  const { account, provider, signer, isConnected, isApproved } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const transferId = params.id as string;
  
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [tokenName, setTokenName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (transferId) {
      loadTransferData();
    }
  }, [transferId, account, isConnected, isApproved, router]);

  const loadTransferData = async () => {
    if (!account || !provider || !transferId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const transferData = await contract.getTransfer(transferId);
      
      const transferObj: Transfer = {
        id: Number(transferId),
        tokenId: Number(transferData.tokenId),
        from: transferData.from,
        to: transferData.to,
        amount: Number(transferData.amount),
        status: Number(transferData.status),
        requestTimestamp: Number(transferData.requestTimestamp),
        responseTimestamp: Number(transferData.responseTimestamp),
      };

      setTransfer(transferObj);

      // Load token name
      try {
        const tokenData = await contract.getProductToken(transferObj.tokenId);
        let metadata;
        try {
          const parsed = JSON.parse(tokenData.metadata);
          // Validate it's an object
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            metadata = parsed;
          } else {
            metadata = { name: `Token #${transferObj.tokenId}` };
          }
        } catch {
          metadata = { name: `Token #${transferObj.tokenId}` };
        }
        setTokenName(metadata.name || `Token #${transferObj.tokenId}`);
      } catch (error) {
        console.error("Error loading token:", error);
      }
    } catch (error) {
      console.error("Error loading transfer:", error);
      toast.error("Failed to load transfer data");
      router.push('/transfers');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!account || !signer || !transferId || !transfer) return;

    // Verify this is the recipient
    if (transfer.to.toLowerCase() !== account.toLowerCase()) {
      toast.error("You are not the recipient of this transfer");
      return;
    }

    if (transfer.status !== 0) {
      toast.error("This transfer is no longer pending");
      return;
    }

    setIsProcessing(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      toast.info("Accepting transfer... Please confirm the transaction in MetaMask.");

      const tx = await contract.acceptTransfer(transferId);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer accepted successfully!");
      
      // Refresh the page data
      await loadTransferData();
      
      // Refresh transfers list by navigating back
      setTimeout(() => {
        router.push('/transfers');
      }, 1500);
    } catch (error: any) {
      console.error("Error accepting transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Only destination can accept")) {
        toast.error("Only the recipient can accept this transfer");
      } else if (error.message?.includes("Transfer not pending")) {
        toast.error("This transfer is no longer pending");
      } else {
        toast.error("Failed to accept transfer. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!account || !signer || !transferId || !transfer) return;

    // Verify this is the recipient
    if (transfer.to.toLowerCase() !== account.toLowerCase()) {
      toast.error("You are not the recipient of this transfer");
      return;
    }

    if (transfer.status !== 0) {
      toast.error("This transfer is no longer pending");
      return;
    }

    setIsProcessing(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      toast.info("Rejecting transfer... Please confirm the transaction in MetaMask.");

      const tx = await contract.rejectTransfer(transferId);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer rejected. Tokens returned to sender.");
      
      // Refresh the page data
      await loadTransferData();
      
      // Refresh transfers list by navigating back
      setTimeout(() => {
        router.push('/transfers');
      }, 1500);
    } catch (error: any) {
      console.error("Error rejecting transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Only destination can reject")) {
        toast.error("Only the recipient can reject this transfer");
      } else if (error.message?.includes("Transfer not pending")) {
        toast.error("This transfer is no longer pending");
      } else {
        toast.error("Failed to reject transfer. Please try again.");
      }
    } finally {
      setIsProcessing(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading transfer details...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Transfer not found</p>
                <Link href="/transfers">
                  <Button>Back to Transfers</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const isRecipient = transfer.to.toLowerCase() === account?.toLowerCase();
  const isPending = transfer.status === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Transfer #{transfer.id}
            </h1>
            <p className="text-muted-foreground mt-2">
              {tokenName || `Token ID: #${transfer.tokenId}`}
            </p>
          </div>
          <Link href="/transfers">
            <Button variant="outline">Back to Transfers</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Transfer Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Status
                  </div>
                  <div>{getStatusBadge(transfer.status)}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Token
                  </div>
                  <Link href={`/token/${transfer.tokenId}`}>
                    <Button variant="link" className="p-0 h-auto">
                      {tokenName || `Token #${transfer.tokenId}`}
                    </Button>
                  </Link>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Amount
                  </div>
                  <div className="text-2xl font-bold">{transfer.amount} tokens</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    From
                  </div>
                  <div className="text-sm font-mono">{formatAddress(transfer.from)}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    To
                  </div>
                  <div className="text-sm font-mono">{formatAddress(transfer.to)}</div>
                  {isRecipient && <Badge variant="outline" className="mt-1">You are the recipient</Badge>}
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Requested At
                  </div>
                  <div className="text-sm">{formatDate(transfer.requestTimestamp)}</div>
                </div>

                {transfer.responseTimestamp > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Response At
                    </div>
                    <div className="text-sm">{formatDate(transfer.responseTimestamp)}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {isPending && isRecipient && (
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                  <CardDescription>
                    Accept or reject this transfer request
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    onClick={handleAccept}
                    className="w-full"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : "Accept Transfer"}
                  </Button>
                  <Button
                    onClick={handleReject}
                    variant="destructive"
                    className="w-full"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : "Reject Transfer"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {!isPending && (
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    This transfer has been {transfer.status === 1 ? "accepted" : "rejected"}.
                  </p>
                </CardContent>
              </Card>
            )}

            {isPending && !isRecipient && (
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Waiting for recipient approval...
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
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
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";

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

export default function TransferDetailPage() {
  const { account, provider, signer, isConnected, isApproved } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const transferId = params.id as string;
  
  // Get the view mode the user came from (pending, all, or history)
  const fromViewMode = searchParams.get("from") || "pending";
  const backUrl = `/transfers?viewMode=${fromViewMode}`;
  
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [tokenName, setTokenName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (transferId) {
      loadTransferData();
    }
  }, [transferId, account, isConnected, isApproved, router]);

  const loadTransferData = async () => {
    if (!account || !provider || !transferId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const transferData = await contract.getTransfer(transferId);
      
      const transferObj: Transfer = {
        id: Number(transferId),
        tokenId: Number(transferData.tokenId),
        from: transferData.from,
        to: transferData.to,
        amount: Number(transferData.amount),
        status: Number(transferData.status),
        requestTimestamp: Number(transferData.requestTimestamp),
        responseTimestamp: Number(transferData.responseTimestamp),
      };

      setTransfer(transferObj);

      // Load token name
      try {
        const tokenData = await contract.getProductToken(transferObj.tokenId);
        let metadata;
        try {
          const parsed = JSON.parse(tokenData.metadata);
          // Validate it's an object
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            metadata = parsed;
          } else {
            metadata = { name: `Token #${transferObj.tokenId}` };
          }
        } catch {
          metadata = { name: `Token #${transferObj.tokenId}` };
        }
        setTokenName(metadata.name || `Token #${transferObj.tokenId}`);
      } catch (error) {
        console.error("Error loading token:", error);
      }
    } catch (error) {
      console.error("Error loading transfer:", error);
      toast.error("Failed to load transfer data");
      router.push('/transfers');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!account || !signer || !transferId || !transfer) return;

    // Verify this is the recipient
    if (transfer.to.toLowerCase() !== account.toLowerCase()) {
      toast.error("You are not the recipient of this transfer");
      return;
    }

    if (transfer.status !== 0) {
      toast.error("This transfer is no longer pending");
      return;
    }

    setIsProcessing(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      toast.info("Accepting transfer... Please confirm the transaction in MetaMask.");

      const tx = await contract.acceptTransfer(transferId);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer accepted successfully!");
      
      // Refresh the page data
      await loadTransferData();
      
      // Refresh transfers list by navigating back
      setTimeout(() => {
        router.push('/transfers');
      }, 1500);
    } catch (error: any) {
      console.error("Error accepting transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Only destination can accept")) {
        toast.error("Only the recipient can accept this transfer");
      } else if (error.message?.includes("Transfer not pending")) {
        toast.error("This transfer is no longer pending");
      } else {
        toast.error("Failed to accept transfer. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!account || !signer || !transferId || !transfer) return;

    // Verify this is the recipient
    if (transfer.to.toLowerCase() !== account.toLowerCase()) {
      toast.error("You are not the recipient of this transfer");
      return;
    }

    if (transfer.status !== 0) {
      toast.error("This transfer is no longer pending");
      return;
    }

    setIsProcessing(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      toast.info("Rejecting transfer... Please confirm the transaction in MetaMask.");

      const tx = await contract.rejectTransfer(transferId);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer rejected. Tokens returned to sender.");
      
      // Refresh the page data
      await loadTransferData();
      
      // Refresh transfers list by navigating back
      setTimeout(() => {
        router.push('/transfers');
      }, 1500);
    } catch (error: any) {
      console.error("Error rejecting transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Only destination can reject")) {
        toast.error("Only the recipient can reject this transfer");
      } else if (error.message?.includes("Transfer not pending")) {
        toast.error("This transfer is no longer pending");
      } else {
        toast.error("Failed to reject transfer. Please try again.");
      }
    } finally {
      setIsProcessing(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading transfer details...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Transfer not found</p>
                <Link href="/transfers">
                  <Button>Back to Transfers</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const isRecipient = transfer.to.toLowerCase() === account?.toLowerCase();
  const isPending = transfer.status === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Transfer #{transfer.id}
            </h1>
            <p className="text-muted-foreground mt-2">
              {tokenName || `Token ID: #${transfer.tokenId}`}
            </p>
          </div>
          <Link href="/transfers">
            <Button variant="outline">Back to Transfers</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Transfer Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Status
                  </div>
                  <div>{getStatusBadge(transfer.status)}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Token
                  </div>
                  <Link href={`/token/${transfer.tokenId}`}>
                    <Button variant="link" className="p-0 h-auto">
                      {tokenName || `Token #${transfer.tokenId}`}
                    </Button>
                  </Link>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Amount
                  </div>
                  <div className="text-2xl font-bold">{transfer.amount} tokens</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    From
                  </div>
                  <div className="text-sm font-mono">{formatAddress(transfer.from)}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    To
                  </div>
                  <div className="text-sm font-mono">{formatAddress(transfer.to)}</div>
                  {isRecipient && <Badge variant="outline" className="mt-1">You are the recipient</Badge>}
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Requested At
                  </div>
                  <div className="text-sm">{formatDate(transfer.requestTimestamp)}</div>
                </div>

                {transfer.responseTimestamp > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Response At
                    </div>
                    <div className="text-sm">{formatDate(transfer.responseTimestamp)}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {isPending && isRecipient && (
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                  <CardDescription>
                    Accept or reject this transfer request
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    onClick={handleAccept}
                    className="w-full"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : "Accept Transfer"}
                  </Button>
                  <Button
                    onClick={handleReject}
                    variant="destructive"
                    className="w-full"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : "Reject Transfer"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {!isPending && (
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    This transfer has been {transfer.status === 1 ? "accepted" : "rejected"}.
                  </p>
                </CardContent>
              </Card>
            )}

            {isPending && !isRecipient && (
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Waiting for recipient approval...
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
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
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";

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

export default function TransferDetailPage() {
  const { account, provider, signer, isConnected, isApproved } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const transferId = params.id as string;
  
  // Get the view mode the user came from (pending, all, or history)
  const fromViewMode = searchParams.get("from") || "pending";
  const backUrl = `/transfers?viewMode=${fromViewMode}`;
  
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [tokenName, setTokenName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (transferId) {
      loadTransferData();
    }
  }, [transferId, account, isConnected, isApproved, router]);

  const loadTransferData = async () => {
    if (!account || !provider || !transferId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const transferData = await contract.getTransfer(transferId);
      
      const transferObj: Transfer = {
        id: Number(transferId),
        tokenId: Number(transferData.tokenId),
        from: transferData.from,
        to: transferData.to,
        amount: Number(transferData.amount),
        status: Number(transferData.status),
        requestTimestamp: Number(transferData.requestTimestamp),
        responseTimestamp: Number(transferData.responseTimestamp),
      };

      setTransfer(transferObj);

      // Load token name
      try {
        const tokenData = await contract.getProductToken(transferObj.tokenId);
        let metadata;
        try {
          const parsed = JSON.parse(tokenData.metadata);
          // Validate it's an object
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            metadata = parsed;
          } else {
            metadata = { name: `Token #${transferObj.tokenId}` };
          }
        } catch {
          metadata = { name: `Token #${transferObj.tokenId}` };
        }
        setTokenName(metadata.name || `Token #${transferObj.tokenId}`);
      } catch (error) {
        console.error("Error loading token:", error);
      }
    } catch (error) {
      console.error("Error loading transfer:", error);
      toast.error("Failed to load transfer data");
      router.push(backUrl);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!account || !signer || !transferId || !transfer) return;

    // Verify this is the recipient
    if (transfer.to.toLowerCase() !== account.toLowerCase()) {
      toast.error("You are not the recipient of this transfer");
      return;
    }

    if (transfer.status !== 0) {
      toast.error("This transfer is no longer pending");
      return;
    }

    setIsProcessing(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      toast.info("Accepting transfer... Please confirm the transaction in MetaMask.");

      const tx = await contract.acceptTransfer(transferId);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer accepted successfully!");
      
      // Refresh the page data
      await loadTransferData();
      
      // Refresh transfers list by navigating back
      setTimeout(() => {
        router.push('/transfers');
      }, 1500);
    } catch (error: any) {
      console.error("Error accepting transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Only destination can accept")) {
        toast.error("Only the recipient can accept this transfer");
      } else if (error.message?.includes("Transfer not pending")) {
        toast.error("This transfer is no longer pending");
      } else {
        toast.error("Failed to accept transfer. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!account || !signer || !transferId || !transfer) return;

    // Verify this is the recipient
    if (transfer.to.toLowerCase() !== account.toLowerCase()) {
      toast.error("You are not the recipient of this transfer");
      return;
    }

    if (transfer.status !== 0) {
      toast.error("This transfer is no longer pending");
      return;
    }

    setIsProcessing(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      toast.info("Rejecting transfer... Please confirm the transaction in MetaMask.");

      const tx = await contract.rejectTransfer(transferId);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer rejected. Tokens returned to sender.");
      
      // Refresh the page data
      await loadTransferData();
      
      // Refresh transfers list by navigating back
      setTimeout(() => {
        router.push('/transfers');
      }, 1500);
    } catch (error: any) {
      console.error("Error rejecting transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Only destination can reject")) {
        toast.error("Only the recipient can reject this transfer");
      } else if (error.message?.includes("Transfer not pending")) {
        toast.error("This transfer is no longer pending");
      } else {
        toast.error("Failed to reject transfer. Please try again.");
      }
    } finally {
      setIsProcessing(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading transfer details...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Transfer not found</p>
                <Link href="/transfers">
                  <Button>Back to Transfers</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const isRecipient = transfer.to.toLowerCase() === account?.toLowerCase();
  const isPending = transfer.status === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Transfer #{transfer.id}
            </h1>
            <p className="text-muted-foreground mt-2">
              {tokenName || `Token ID: #${transfer.tokenId}`}
            </p>
          </div>
          <Link href="/transfers">
            <Button variant="outline">Back to Transfers</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Transfer Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Status
                  </div>
                  <div>{getStatusBadge(transfer.status)}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Token
                  </div>
                  <Link href={`/token/${transfer.tokenId}`}>
                    <Button variant="link" className="p-0 h-auto">
                      {tokenName || `Token #${transfer.tokenId}`}
                    </Button>
                  </Link>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Amount
                  </div>
                  <div className="text-2xl font-bold">{transfer.amount} tokens</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    From
                  </div>
                  <div className="text-sm font-mono">{formatAddress(transfer.from)}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    To
                  </div>
                  <div className="text-sm font-mono">{formatAddress(transfer.to)}</div>
                  {isRecipient && <Badge variant="outline" className="mt-1">You are the recipient</Badge>}
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Requested At
                  </div>
                  <div className="text-sm">{formatDate(transfer.requestTimestamp)}</div>
                </div>

                {transfer.responseTimestamp > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Response At
                    </div>
                    <div className="text-sm">{formatDate(transfer.responseTimestamp)}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {isPending && isRecipient && (
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                  <CardDescription>
                    Accept or reject this transfer request
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    onClick={handleAccept}
                    className="w-full"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : "Accept Transfer"}
                  </Button>
                  <Button
                    onClick={handleReject}
                    variant="destructive"
                    className="w-full"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : "Reject Transfer"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {!isPending && (
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    This transfer has been {transfer.status === 1 ? "accepted" : "rejected"}.
                  </p>
                </CardContent>
              </Card>
            )}

            {isPending && !isRecipient && (
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Waiting for recipient approval...
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
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
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";

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

export default function TransferDetailPage() {
  const { account, provider, signer, isConnected, isApproved } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const transferId = params.id as string;
  
  // Get the view mode the user came from (pending, all, or history)
  const fromViewMode = searchParams.get("from") || "pending";
  const backUrl = `/transfers?viewMode=${fromViewMode}`;
  
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [tokenName, setTokenName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (transferId) {
      loadTransferData();
    }
  }, [transferId, account, isConnected, isApproved, router]);

  const loadTransferData = async () => {
    if (!account || !provider || !transferId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const transferData = await contract.getTransfer(transferId);
      
      const transferObj: Transfer = {
        id: Number(transferId),
        tokenId: Number(transferData.tokenId),
        from: transferData.from,
        to: transferData.to,
        amount: Number(transferData.amount),
        status: Number(transferData.status),
        requestTimestamp: Number(transferData.requestTimestamp),
        responseTimestamp: Number(transferData.responseTimestamp),
      };

      setTransfer(transferObj);

      // Load token name
      try {
        const tokenData = await contract.getProductToken(transferObj.tokenId);
        let metadata;
        try {
          const parsed = JSON.parse(tokenData.metadata);
          // Validate it's an object
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            metadata = parsed;
          } else {
            metadata = { name: `Token #${transferObj.tokenId}` };
          }
        } catch {
          metadata = { name: `Token #${transferObj.tokenId}` };
        }
        setTokenName(metadata.name || `Token #${transferObj.tokenId}`);
      } catch (error) {
        console.error("Error loading token:", error);
      }
    } catch (error) {
      console.error("Error loading transfer:", error);
      toast.error("Failed to load transfer data");
      router.push(backUrl);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!account || !signer || !transferId || !transfer) return;

    // Verify this is the recipient
    if (transfer.to.toLowerCase() !== account.toLowerCase()) {
      toast.error("You are not the recipient of this transfer");
      return;
    }

    if (transfer.status !== 0) {
      toast.error("This transfer is no longer pending");
      return;
    }

    setIsProcessing(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      toast.info("Accepting transfer... Please confirm the transaction in MetaMask.");

      const tx = await contract.acceptTransfer(transferId);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer accepted successfully!");
      
      // Refresh the page data
      await loadTransferData();
      
      // Refresh transfers list by navigating back to the correct view
      setTimeout(() => {
        router.push(backUrl);
      }, 1500);
    } catch (error: any) {
      console.error("Error accepting transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Only destination can accept")) {
        toast.error("Only the recipient can accept this transfer");
      } else if (error.message?.includes("Transfer not pending")) {
        toast.error("This transfer is no longer pending");
      } else {
        toast.error("Failed to accept transfer. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!account || !signer || !transferId || !transfer) return;

    // Verify this is the recipient
    if (transfer.to.toLowerCase() !== account.toLowerCase()) {
      toast.error("You are not the recipient of this transfer");
      return;
    }

    if (transfer.status !== 0) {
      toast.error("This transfer is no longer pending");
      return;
    }

    setIsProcessing(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      toast.info("Rejecting transfer... Please confirm the transaction in MetaMask.");

      const tx = await contract.rejectTransfer(transferId);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer rejected. Tokens returned to sender.");
      
      // Refresh the page data
      await loadTransferData();
      
      // Refresh transfers list by navigating back
      setTimeout(() => {
        router.push('/transfers');
      }, 1500);
    } catch (error: any) {
      console.error("Error rejecting transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Only destination can reject")) {
        toast.error("Only the recipient can reject this transfer");
      } else if (error.message?.includes("Transfer not pending")) {
        toast.error("This transfer is no longer pending");
      } else {
        toast.error("Failed to reject transfer. Please try again.");
      }
    } finally {
      setIsProcessing(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading transfer details...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Transfer not found</p>
                <Link href="/transfers">
                  <Button>Back to Transfers</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const isRecipient = transfer.to.toLowerCase() === account?.toLowerCase();
  const isPending = transfer.status === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Transfer #{transfer.id}
            </h1>
            <p className="text-muted-foreground mt-2">
              {tokenName || `Token ID: #${transfer.tokenId}`}
            </p>
          </div>
          <Link href="/transfers">
            <Button variant="outline">Back to Transfers</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Transfer Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Status
                  </div>
                  <div>{getStatusBadge(transfer.status)}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Token
                  </div>
                  <Link href={`/token/${transfer.tokenId}`}>
                    <Button variant="link" className="p-0 h-auto">
                      {tokenName || `Token #${transfer.tokenId}`}
                    </Button>
                  </Link>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Amount
                  </div>
                  <div className="text-2xl font-bold">{transfer.amount} tokens</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    From
                  </div>
                  <div className="text-sm font-mono">{formatAddress(transfer.from)}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    To
                  </div>
                  <div className="text-sm font-mono">{formatAddress(transfer.to)}</div>
                  {isRecipient && <Badge variant="outline" className="mt-1">You are the recipient</Badge>}
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Requested At
                  </div>
                  <div className="text-sm">{formatDate(transfer.requestTimestamp)}</div>
                </div>

                {transfer.responseTimestamp > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Response At
                    </div>
                    <div className="text-sm">{formatDate(transfer.responseTimestamp)}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {isPending && isRecipient && (
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                  <CardDescription>
                    Accept or reject this transfer request
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    onClick={handleAccept}
                    className="w-full"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : "Accept Transfer"}
                  </Button>
                  <Button
                    onClick={handleReject}
                    variant="destructive"
                    className="w-full"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : "Reject Transfer"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {!isPending && (
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    This transfer has been {transfer.status === 1 ? "accepted" : "rejected"}.
                  </p>
                </CardContent>
              </Card>
            )}

            {isPending && !isRecipient && (
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Waiting for recipient approval...
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
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
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";

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

export default function TransferDetailPage() {
  const { account, provider, signer, isConnected, isApproved } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const transferId = params.id as string;
  
  // Get the view mode the user came from (pending, all, or history)
  const fromViewMode = searchParams.get("from") || "pending";
  const backUrl = `/transfers?viewMode=${fromViewMode}`;
  
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [tokenName, setTokenName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (transferId) {
      loadTransferData();
    }
  }, [transferId, account, isConnected, isApproved, router]);

  const loadTransferData = async () => {
    if (!account || !provider || !transferId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const transferData = await contract.getTransfer(transferId);
      
      const transferObj: Transfer = {
        id: Number(transferId),
        tokenId: Number(transferData.tokenId),
        from: transferData.from,
        to: transferData.to,
        amount: Number(transferData.amount),
        status: Number(transferData.status),
        requestTimestamp: Number(transferData.requestTimestamp),
        responseTimestamp: Number(transferData.responseTimestamp),
      };

      setTransfer(transferObj);

      // Load token name
      try {
        const tokenData = await contract.getProductToken(transferObj.tokenId);
        let metadata;
        try {
          const parsed = JSON.parse(tokenData.metadata);
          // Validate it's an object
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            metadata = parsed;
          } else {
            metadata = { name: `Token #${transferObj.tokenId}` };
          }
        } catch {
          metadata = { name: `Token #${transferObj.tokenId}` };
        }
        setTokenName(metadata.name || `Token #${transferObj.tokenId}`);
      } catch (error) {
        console.error("Error loading token:", error);
      }
    } catch (error) {
      console.error("Error loading transfer:", error);
      toast.error("Failed to load transfer data");
      router.push(backUrl);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!account || !signer || !transferId || !transfer) return;

    // Verify this is the recipient
    if (transfer.to.toLowerCase() !== account.toLowerCase()) {
      toast.error("You are not the recipient of this transfer");
      return;
    }

    if (transfer.status !== 0) {
      toast.error("This transfer is no longer pending");
      return;
    }

    setIsProcessing(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      toast.info("Accepting transfer... Please confirm the transaction in MetaMask.");

      const tx = await contract.acceptTransfer(transferId);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer accepted successfully!");
      
      // Refresh the page data
      await loadTransferData();
      
      // Refresh transfers list by navigating back to the correct view
      setTimeout(() => {
        router.push(backUrl);
      }, 1500);
    } catch (error: any) {
      console.error("Error accepting transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Only destination can accept")) {
        toast.error("Only the recipient can accept this transfer");
      } else if (error.message?.includes("Transfer not pending")) {
        toast.error("This transfer is no longer pending");
      } else {
        toast.error("Failed to accept transfer. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!account || !signer || !transferId || !transfer) return;

    // Verify this is the recipient
    if (transfer.to.toLowerCase() !== account.toLowerCase()) {
      toast.error("You are not the recipient of this transfer");
      return;
    }

    if (transfer.status !== 0) {
      toast.error("This transfer is no longer pending");
      return;
    }

    setIsProcessing(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      toast.info("Rejecting transfer... Please confirm the transaction in MetaMask.");

      const tx = await contract.rejectTransfer(transferId);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer rejected. Tokens returned to sender.");
      
      // Refresh the page data
      await loadTransferData();
      
      // Refresh transfers list by navigating back to the correct view
      setTimeout(() => {
        router.push(backUrl);
      }, 1500);
    } catch (error: any) {
      console.error("Error rejecting transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Only destination can reject")) {
        toast.error("Only the recipient can reject this transfer");
      } else if (error.message?.includes("Transfer not pending")) {
        toast.error("This transfer is no longer pending");
      } else {
        toast.error("Failed to reject transfer. Please try again.");
      }
    } finally {
      setIsProcessing(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading transfer details...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Transfer not found</p>
                <Link href="/transfers">
                  <Button>Back to Transfers</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const isRecipient = transfer.to.toLowerCase() === account?.toLowerCase();
  const isPending = transfer.status === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Transfer #{transfer.id}
            </h1>
            <p className="text-muted-foreground mt-2">
              {tokenName || `Token ID: #${transfer.tokenId}`}
            </p>
          </div>
          <Link href="/transfers">
            <Button variant="outline">Back to Transfers</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Transfer Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Status
                  </div>
                  <div>{getStatusBadge(transfer.status)}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Token
                  </div>
                  <Link href={`/token/${transfer.tokenId}`}>
                    <Button variant="link" className="p-0 h-auto">
                      {tokenName || `Token #${transfer.tokenId}`}
                    </Button>
                  </Link>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Amount
                  </div>
                  <div className="text-2xl font-bold">{transfer.amount} tokens</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    From
                  </div>
                  <div className="text-sm font-mono">{formatAddress(transfer.from)}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    To
                  </div>
                  <div className="text-sm font-mono">{formatAddress(transfer.to)}</div>
                  {isRecipient && <Badge variant="outline" className="mt-1">You are the recipient</Badge>}
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Requested At
                  </div>
                  <div className="text-sm">{formatDate(transfer.requestTimestamp)}</div>
                </div>

                {transfer.responseTimestamp > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Response At
                    </div>
                    <div className="text-sm">{formatDate(transfer.responseTimestamp)}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {isPending && isRecipient && (
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                  <CardDescription>
                    Accept or reject this transfer request
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    onClick={handleAccept}
                    className="w-full"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : "Accept Transfer"}
                  </Button>
                  <Button
                    onClick={handleReject}
                    variant="destructive"
                    className="w-full"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : "Reject Transfer"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {!isPending && (
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    This transfer has been {transfer.status === 1 ? "accepted" : "rejected"}.
                  </p>
                </CardContent>
              </Card>
            )}

            {isPending && !isRecipient && (
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Waiting for recipient approval...
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
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
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";

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

export default function TransferDetailPage() {
  const { account, provider, signer, isConnected, isApproved } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const transferId = params.id as string;
  
  // Get the view mode the user came from (pending, all, or history)
  const fromViewMode = searchParams.get("from") || "pending";
  const backUrl = `/transfers?viewMode=${fromViewMode}`;
  
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [tokenName, setTokenName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (transferId) {
      loadTransferData();
    }
  }, [transferId, account, isConnected, isApproved, router]);

  const loadTransferData = async () => {
    if (!account || !provider || !transferId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const transferData = await contract.getTransfer(transferId);
      
      const transferObj: Transfer = {
        id: Number(transferId),
        tokenId: Number(transferData.tokenId),
        from: transferData.from,
        to: transferData.to,
        amount: Number(transferData.amount),
        status: Number(transferData.status),
        requestTimestamp: Number(transferData.requestTimestamp),
        responseTimestamp: Number(transferData.responseTimestamp),
      };

      setTransfer(transferObj);

      // Load token name
      try {
        const tokenData = await contract.getProductToken(transferObj.tokenId);
        let metadata;
        try {
          const parsed = JSON.parse(tokenData.metadata);
          // Validate it's an object
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            metadata = parsed;
          } else {
            metadata = { name: `Token #${transferObj.tokenId}` };
          }
        } catch {
          metadata = { name: `Token #${transferObj.tokenId}` };
        }
        setTokenName(metadata.name || `Token #${transferObj.tokenId}`);
      } catch (error) {
        console.error("Error loading token:", error);
      }
    } catch (error) {
      console.error("Error loading transfer:", error);
      toast.error("Failed to load transfer data");
      router.push(backUrl);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!account || !signer || !transferId || !transfer) return;

    // Verify this is the recipient
    if (transfer.to.toLowerCase() !== account.toLowerCase()) {
      toast.error("You are not the recipient of this transfer");
      return;
    }

    if (transfer.status !== 0) {
      toast.error("This transfer is no longer pending");
      return;
    }

    setIsProcessing(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      toast.info("Accepting transfer... Please confirm the transaction in MetaMask.");

      const tx = await contract.acceptTransfer(transferId);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer accepted successfully!");
      
      // Refresh the page data
      await loadTransferData();
      
      // Refresh transfers list by navigating back to the correct view
      setTimeout(() => {
        router.push(backUrl);
      }, 1500);
    } catch (error: any) {
      console.error("Error accepting transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Only destination can accept")) {
        toast.error("Only the recipient can accept this transfer");
      } else if (error.message?.includes("Transfer not pending")) {
        toast.error("This transfer is no longer pending");
      } else {
        toast.error("Failed to accept transfer. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!account || !signer || !transferId || !transfer) return;

    // Verify this is the recipient
    if (transfer.to.toLowerCase() !== account.toLowerCase()) {
      toast.error("You are not the recipient of this transfer");
      return;
    }

    if (transfer.status !== 0) {
      toast.error("This transfer is no longer pending");
      return;
    }

    setIsProcessing(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      toast.info("Rejecting transfer... Please confirm the transaction in MetaMask.");

      const tx = await contract.rejectTransfer(transferId);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer rejected. Tokens returned to sender.");
      
      // Refresh the page data
      await loadTransferData();
      
      // Refresh transfers list by navigating back to the correct view
      setTimeout(() => {
        router.push(backUrl);
      }, 1500);
    } catch (error: any) {
      console.error("Error rejecting transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Only destination can reject")) {
        toast.error("Only the recipient can reject this transfer");
      } else if (error.message?.includes("Transfer not pending")) {
        toast.error("This transfer is no longer pending");
      } else {
        toast.error("Failed to reject transfer. Please try again.");
      }
    } finally {
      setIsProcessing(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading transfer details...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Transfer not found</p>
                <Link href={backUrl}>
                  <Button>Back to Transfers</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const isRecipient = transfer.to.toLowerCase() === account?.toLowerCase();
  const isPending = transfer.status === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Transfer #{transfer.id}
            </h1>
            <p className="text-muted-foreground mt-2">
              {tokenName || `Token ID: #${transfer.tokenId}`}
            </p>
          </div>
          <Link href="/transfers">
            <Button variant="outline">Back to Transfers</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Transfer Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Status
                  </div>
                  <div>{getStatusBadge(transfer.status)}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Token
                  </div>
                  <Link href={`/token/${transfer.tokenId}`}>
                    <Button variant="link" className="p-0 h-auto">
                      {tokenName || `Token #${transfer.tokenId}`}
                    </Button>
                  </Link>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Amount
                  </div>
                  <div className="text-2xl font-bold">{transfer.amount} tokens</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    From
                  </div>
                  <div className="text-sm font-mono">{formatAddress(transfer.from)}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    To
                  </div>
                  <div className="text-sm font-mono">{formatAddress(transfer.to)}</div>
                  {isRecipient && <Badge variant="outline" className="mt-1">You are the recipient</Badge>}
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Requested At
                  </div>
                  <div className="text-sm">{formatDate(transfer.requestTimestamp)}</div>
                </div>

                {transfer.responseTimestamp > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Response At
                    </div>
                    <div className="text-sm">{formatDate(transfer.responseTimestamp)}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {isPending && isRecipient && (
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                  <CardDescription>
                    Accept or reject this transfer request
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    onClick={handleAccept}
                    className="w-full"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : "Accept Transfer"}
                  </Button>
                  <Button
                    onClick={handleReject}
                    variant="destructive"
                    className="w-full"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : "Reject Transfer"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {!isPending && (
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    This transfer has been {transfer.status === 1 ? "accepted" : "rejected"}.
                  </p>
                </CardContent>
              </Card>
            )}

            {isPending && !isRecipient && (
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Waiting for recipient approval...
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
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
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";

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

export default function TransferDetailPage() {
  const { account, provider, signer, isConnected, isApproved } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const transferId = params.id as string;
  
  // Get the view mode the user came from (pending, all, or history)
  const fromViewMode = searchParams.get("from") || "pending";
  const backUrl = `/transfers?viewMode=${fromViewMode}`;
  
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [tokenName, setTokenName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (transferId) {
      loadTransferData();
    }
  }, [transferId, account, isConnected, isApproved, router]);

  const loadTransferData = async () => {
    if (!account || !provider || !transferId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const transferData = await contract.getTransfer(transferId);
      
      const transferObj: Transfer = {
        id: Number(transferId),
        tokenId: Number(transferData.tokenId),
        from: transferData.from,
        to: transferData.to,
        amount: Number(transferData.amount),
        status: Number(transferData.status),
        requestTimestamp: Number(transferData.requestTimestamp),
        responseTimestamp: Number(transferData.responseTimestamp),
      };

      setTransfer(transferObj);

      // Load token name
      try {
        const tokenData = await contract.getProductToken(transferObj.tokenId);
        let metadata;
        try {
          const parsed = JSON.parse(tokenData.metadata);
          // Validate it's an object
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            metadata = parsed;
          } else {
            metadata = { name: `Token #${transferObj.tokenId}` };
          }
        } catch {
          metadata = { name: `Token #${transferObj.tokenId}` };
        }
        setTokenName(metadata.name || `Token #${transferObj.tokenId}`);
      } catch (error) {
        console.error("Error loading token:", error);
      }
    } catch (error) {
      console.error("Error loading transfer:", error);
      toast.error("Failed to load transfer data");
      router.push(backUrl);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!account || !signer || !transferId || !transfer) return;

    // Verify this is the recipient
    if (transfer.to.toLowerCase() !== account.toLowerCase()) {
      toast.error("You are not the recipient of this transfer");
      return;
    }

    if (transfer.status !== 0) {
      toast.error("This transfer is no longer pending");
      return;
    }

    setIsProcessing(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      toast.info("Accepting transfer... Please confirm the transaction in MetaMask.");

      const tx = await contract.acceptTransfer(transferId);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer accepted successfully!");
      
      // Refresh the page data
      await loadTransferData();
      
      // Refresh transfers list by navigating back to the correct view
      setTimeout(() => {
        router.push(backUrl);
      }, 1500);
    } catch (error: any) {
      console.error("Error accepting transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Only destination can accept")) {
        toast.error("Only the recipient can accept this transfer");
      } else if (error.message?.includes("Transfer not pending")) {
        toast.error("This transfer is no longer pending");
      } else {
        toast.error("Failed to accept transfer. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!account || !signer || !transferId || !transfer) return;

    // Verify this is the recipient
    if (transfer.to.toLowerCase() !== account.toLowerCase()) {
      toast.error("You are not the recipient of this transfer");
      return;
    }

    if (transfer.status !== 0) {
      toast.error("This transfer is no longer pending");
      return;
    }

    setIsProcessing(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      toast.info("Rejecting transfer... Please confirm the transaction in MetaMask.");

      const tx = await contract.rejectTransfer(transferId);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer rejected. Tokens returned to sender.");
      
      // Refresh the page data
      await loadTransferData();
      
      // Refresh transfers list by navigating back to the correct view
      setTimeout(() => {
        router.push(backUrl);
      }, 1500);
    } catch (error: any) {
      console.error("Error rejecting transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Only destination can reject")) {
        toast.error("Only the recipient can reject this transfer");
      } else if (error.message?.includes("Transfer not pending")) {
        toast.error("This transfer is no longer pending");
      } else {
        toast.error("Failed to reject transfer. Please try again.");
      }
    } finally {
      setIsProcessing(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading transfer details...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Transfer not found</p>
                <Link href={backUrl}>
                  <Button>Back to Transfers</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const isRecipient = transfer.to.toLowerCase() === account?.toLowerCase();
  const isPending = transfer.status === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Transfer #{transfer.id}
            </h1>
            <p className="text-muted-foreground mt-2">
              {tokenName || `Token ID: #${transfer.tokenId}`}
            </p>
          </div>
          <Link href={backUrl}>
            <Button variant="outline">Back to Transfers</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Transfer Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Status
                  </div>
                  <div>{getStatusBadge(transfer.status)}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Token
                  </div>
                  <Link href={`/token/${transfer.tokenId}`}>
                    <Button variant="link" className="p-0 h-auto">
                      {tokenName || `Token #${transfer.tokenId}`}
                    </Button>
                  </Link>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Amount
                  </div>
                  <div className="text-2xl font-bold">{transfer.amount} tokens</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    From
                  </div>
                  <div className="text-sm font-mono">{formatAddress(transfer.from)}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    To
                  </div>
                  <div className="text-sm font-mono">{formatAddress(transfer.to)}</div>
                  {isRecipient && <Badge variant="outline" className="mt-1">You are the recipient</Badge>}
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Requested At
                  </div>
                  <div className="text-sm">{formatDate(transfer.requestTimestamp)}</div>
                </div>

                {transfer.responseTimestamp > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Response At
                    </div>
                    <div className="text-sm">{formatDate(transfer.responseTimestamp)}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {isPending && isRecipient && (
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                  <CardDescription>
                    Accept or reject this transfer request
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    onClick={handleAccept}
                    className="w-full"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : "Accept Transfer"}
                  </Button>
                  <Button
                    onClick={handleReject}
                    variant="destructive"
                    className="w-full"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : "Reject Transfer"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {!isPending && (
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    This transfer has been {transfer.status === 1 ? "accepted" : "rejected"}.
                  </p>
                </CardContent>
              </Card>
            )}

            {isPending && !isRecipient && (
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Waiting for recipient approval...
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}


```


Checking for lint errors and verifying the implementation:



Ensuring the transfers page updates the URL when the view mode changes. Fixing a potential issue with the router dependency:



## Summary

Fixed navigation so the transfer detail page returns to the correct transfers view.

**Changes made:**

1. **Transfers List Page (`/transfers/page.tsx`)**:
   - Reads `viewMode` from URL query parameters (`?viewMode=pending`, `?viewMode=history`, etc.)
   - Updates the URL when switching between view modes (Pending, All Transfers, History)
   - Includes the current `viewMode` in links to transfer detail pages (`/transfers/4?from=history`)

2. **Transfer Detail Page (`/transfers/[id]/page.tsx`)**:
   - Reads the `from` query parameter to know which view the user came from
   - "Back to Transfers" navigates to `/transfers?viewMode={fromViewMode}`
   - After accepting/rejecting transfers, redirects back to the correct view
   - Defaults to "pending" if no `from` parameter is provided

**Result:**
- Viewing Transfer History → clicking a transfer → clicking "Back to Transfers" returns to the Transfer History view
- Viewing Pending Transfers → clicking a transfer → clicking "Back to Transfers" returns to the Pending Transfers view
- The view mode is preserved in the URL, so browser back/forward also works correctly

Navigation is now consistent and preserves the user's context.

---

**User**

los headers en las paginas de tokens y de transfers no han sido actualizado y deben actualizarse, realizar dicha actualizacion.

otra cosa que vamos a agregar es un side slide menu en el lado izquierdo para las resoluciones por debajo de una tablet portrait para que el usuario pueda navegar de mejor manera, el menu debe aparecer y desaparecer al click de el icono del menu. utiliza un icono que sea llamativo actual y que combine con el sitio, la informacion del usuario al menos el addres debe ser visible y el icono del role para evitar confusiones y que el cliente este seguro que esta es su cuenta. realizar cambios pertinentes por favor

---

**Cursor**


Revisando los componentes Header y las páginas de tokens y transfers para actualizar los headers y agregar un menú lateral móvil.



Revisando más archivos para entender la estructura:



Creando el menú lateral móvil y actualizando el Header. Luego actualizaremos las páginas de tokens.


```typescriptreact
"use client";

import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatAddress } from "@/lib/utils";
import { X, LayoutDashboard, Package, ArrowLeftRight, User, Settings } from "lucide-react";
import { usePathname } from "next/navigation";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const { 
    isConnected, 
    account, 
    user, 
    disconnectWallet 
  } = useWeb3();
  const pathname = usePathname();

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

  const isActive = (path: string) => {
    return pathname === path;
  };

  const handleLinkClick = () => {
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed left-0 top-0 h-full w-80 bg-background border-r z-50 transform transition-transform duration-300 ease-in-out
          lg:hidden
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Menu</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* User Info */}
          {isConnected && account && user && (
            <div className="p-4 border-b bg-muted/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <Badge className={getRoleColor(user.role)}>
                    {user.role}
                  </Badge>
                  <div className="mt-1">
                    <div className="text-xs text-muted-foreground">Wallet Address</div>
                    <div className="text-sm font-mono font-medium truncate">
                      {formatAddress(account)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            <Link href="/dashboard" onClick={handleLinkClick}>
              <Button
                variant={isActive("/dashboard") ? "default" : "ghost"}
                className="w-full justify-start gap-3"
              >
                <LayoutDashboard className="h-5 w-5" />
                Dashboard
              </Button>
            </Link>

            <Link href="/token" onClick={handleLinkClick}>
              <Button
                variant={isActive("/token") ? "default" : "ghost"}
                className="w-full justify-start gap-3"
              >
                <Package className="h-5 w-5" />
                Tokens
              </Button>
            </Link>

            <Link href="/transfers" onClick={handleLinkClick}>
              <Button
                variant={pathname?.startsWith("/transfers") ? "default" : "ghost"}
                className="w-full justify-start gap-3"
              >
                <ArrowLeftRight className="h-5 w-5" />
                Transfers
              </Button>
            </Link>

            <Link href="/profile" onClick={handleLinkClick}>
              <Button
                variant={isActive("/profile") ? "default" : "ghost"}
                className="w-full justify-start gap-3"
              >
                <User className="h-5 w-5" />
                Profile
              </Button>
            </Link>

            {user?.role === "Admin" && (
              <>
                <Link href="/admin/users" onClick={handleLinkClick}>
                  <Button
                    variant={pathname?.startsWith("/admin/users") ? "default" : "ghost"}
                    className="w-full justify-start gap-3"
                  >
                    <Settings className="h-5 w-5" />
                    User Management
                  </Button>
                </Link>
                <Link href="/admin/tests" onClick={handleLinkClick}>
                  <Button
                    variant={pathname?.startsWith("/admin/tests") ? "default" : "ghost"}
                    className="w-full justify-start gap-3"
                  >
                    <Settings className="h-5 w-5" />
                    Tests
                  </Button>
                </Link>
              </>
            )}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t">
            {isConnected && (
              <Button
                onClick={() => {
                  disconnectWallet();
                  handleLinkClick();
                }}
                variant="outline"
                className="w-full"
              >
                Disconnect Wallet
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

```

```typescriptreact
"use client";

import { useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatAddress } from "@/lib/utils";
import { Menu } from "lucide-react";
import { MobileSidebar } from "./MobileSidebar";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

```typescriptreact
"use client";

import { useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatAddress } from "@/lib/utils";
import { Menu } from "lucide-react";
import { MobileSidebar } from "./MobileSidebar";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    <>
      <MobileSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className={`border-b-2 ${getHeaderBorderColor(role)} mb-8 pb-4`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Mobile Menu Button - Only visible below lg breakpoint (tablet portrait) */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>

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
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {actionButtons}
            {/* Desktop wallet info - hidden on mobile since it's in sidebar */}
            {isConnected && account && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
                <span className="text-sm text-muted-foreground">Wallet:</span>
                <span className="text-sm font-mono font-medium">
                  {formatAddress(account)}
                </span>
              </div>
            )}
            {isConnected && (
              <Button 
                onClick={disconnectWallet} 
                variant="outline" 
                size="sm"
                className="hidden lg:inline-flex"
              >
                Disconnect
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}


```


Actualizando las páginas de tokens para usar el Header:


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
import { Header } from "@/components/Header";

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
import { Header } from "@/components/Header";

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
        <Header
          title="Product Tokens"
          description="Manage your product tokens and track your inventory"
          backButton={{
            href: "/dashboard",
            label: "Back to Dashboard"
          }}
          actionButtons={
            canCreateTokens && (
              <Link href="/token/create">
                <Button>Create New Token</Button>
              </Link>
            )
          }
        />

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


Actualizando la página de detalle del token para usar el Header:


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { Header } from "@/components/Header";

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
}

export default function TokenDetailPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [token, setToken] = useState<ProductToken | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [totalSupply, setTotalSupply] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [transactionHistory, setTransactionHistory] = useState<number[]>([]);
  const [parentToken, setParentToken] = useState<ProductToken | null>(null);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadTokenData();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  const loadTokenData = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenData = await contract.getProductToken(tokenId);
      const tokenBalance = await contract.getTokenBalance(tokenId, account);
      const tokenTotalSupply = await contract.getTokenTotalSupply(tokenId);
      const history = await contract.getTokenTransactionHistory(tokenId);

      const tokenObj: ProductToken = {
        id: Number(tokenId),
        creator: tokenData.creator,
        metadata: tokenData.metadata,
        parentId: Number(tokenData.parentId),
        timestamp: Number(tokenData.timestamp),
        isActive: tokenData.isActive,
      };

      setToken(tokenObj);
      setBalance(Number(tokenBalance));
      setTotalSupply(Number(tokenTotalSupply));
      setTransactionHistory(history.map((h: bigint) => Number(h)));

      // Load parent token if exists
      if (tokenObj.parentId > 0) {
        try {
          const parentData = await contract.getProductToken(tokenObj.parentId);
          setParentToken({
            id: tokenObj.parentId,
            creator: parentData.creator,
            metadata: parentData.metadata,
            parentId: Number(parentData.parentId),
            timestamp: Number(parentData.timestamp),
            isActive: parentData.isActive,
          });
        } catch (error) {
          console.error("Error loading parent token:", error);
        }
      }
    } catch (error) {
      console.error("Error loading token:", error);
      toast.error("Failed to load token data");
      router.push('/token');
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

  const parseMetadata = (metadata: string) => {
    // Safe JSON parsing with validation
    try {
      const parsed = JSON.parse(metadata);
      // Validate it's an object, not array or null
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Invalid JSON - return safe fallback
    }
    return { name: "Unknown Product" };
  };

  if (!isConnected || !isApproved) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading token details...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Token not found</p>
                <Link href="/token">
                  <Button>Back to Tokens</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const metadata = parseMetadata(token.metadata);
  const isOwner = token.creator.toLowerCase() === account?.toLowerCase();
  
  // Check if user is Consumer - Consumer should not see transfer button
  const canTransfer = balance > 0 && user && user.role !== "Consumer";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              {metadata.name || `Token #${token.id}`}
            </h1>
            <p className="text-muted-foreground mt-2">
              Token ID: #{token.id}
            </p>
          </div>
          <div className="flex gap-2">
            {canTransfer && (
              <Link href={`/token/${token.id}/transfer`}>
                <Button>Transfer Tokens</Button>
              </Link>
            )}
            <Link href={`/token/${token.id}/history`}>
              <Button variant="outline">View Full History</Button>
            </Link>
            <Link href="/token">
              <Button variant="outline">Back to Tokens</Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Token Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Product Name
                  </div>
                  <div className="text-lg font-semibold">
                    {metadata.name || `Token #${token.id}`}
                  </div>
                </div>

                {metadata.description && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Description
                    </div>
                    <div className="text-sm">{metadata.description}</div>
                  </div>
                )}

                {metadata.category && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Category
                    </div>
                    <Badge>{metadata.category}</Badge>
                  </div>
                )}

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Created At
                  </div>
                  <div className="text-sm">{formatDate(token.timestamp)}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Creator
                  </div>
                  <div className="text-sm font-mono">{formatAddress(token.creator)}</div>
                  {isOwner && <Badge variant="outline" className="mt-1">You are the creator</Badge>}
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Status
                  </div>
                  <Badge className={token.isActive ? "bg-green-500" : "bg-gray-500"}>
                    {token.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {Object.keys(metadata).filter(key => !['name', 'description', 'category'].includes(key)).length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      Additional Metadata
                    </div>
                    <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                      {JSON.stringify(metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Parent Token */}
            {parentToken && (
              <Card>
                <CardHeader>
                  <CardTitle>Parent Token</CardTitle>
                  <CardDescription>
                    This token was created from another token
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        Parent Token ID
                      </div>
                      <Link href={`/token/${token.parentId}`}>
                        <Button variant="link" className="p-0 h-auto">
                          Token #{token.parentId}
                        </Button>
                      </Link>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        Parent Name
                      </div>
                      <div className="text-sm">
                        {parseMetadata(parentToken.metadata).name || `Token #${token.parentId}`}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transaction History */}
            {transactionHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Transaction History</CardTitle>
                      <CardDescription>
                        Recent transfers related to this token
                      </CardDescription>
                    </div>
                    <Link href={`/token/${token.id}/history`}>
                      <Button variant="outline" size="sm">
                        View Full History
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {transactionHistory.slice(-5).reverse().map((transferId) => (
                      <div key={transferId} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">Transfer #{transferId}</span>
                        <Link href={`/transfers/${transferId}`}>
                          <Button variant="link" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    ))}
                    {transactionHistory.length > 5 && (
                      <div className="text-center pt-2">
                        <Link href={`/token/${token.id}/history`}>
                          <Button variant="link" size="sm">
                            View all {transactionHistory.length} transfers →
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Token Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">{balance}</div>
                  <div className="text-sm text-muted-foreground">
                    Your balance
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Total Supply
                  </div>
                  <div className="text-lg font-semibold">{totalSupply}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Your Balance
                  </div>
                  <div className="text-lg font-semibold">{balance}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Transactions
                  </div>
                  <div className="text-lg font-semibold">{transactionHistory.length}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
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
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { Header } from "@/components/Header";

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
}

export default function TokenDetailPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [token, setToken] = useState<ProductToken | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [totalSupply, setTotalSupply] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [transactionHistory, setTransactionHistory] = useState<number[]>([]);
  const [parentToken, setParentToken] = useState<ProductToken | null>(null);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadTokenData();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  const loadTokenData = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenData = await contract.getProductToken(tokenId);
      const tokenBalance = await contract.getTokenBalance(tokenId, account);
      const tokenTotalSupply = await contract.getTokenTotalSupply(tokenId);
      const history = await contract.getTokenTransactionHistory(tokenId);

      const tokenObj: ProductToken = {
        id: Number(tokenId),
        creator: tokenData.creator,
        metadata: tokenData.metadata,
        parentId: Number(tokenData.parentId),
        timestamp: Number(tokenData.timestamp),
        isActive: tokenData.isActive,
      };

      setToken(tokenObj);
      setBalance(Number(tokenBalance));
      setTotalSupply(Number(tokenTotalSupply));
      setTransactionHistory(history.map((h: bigint) => Number(h)));

      // Load parent token if exists
      if (tokenObj.parentId > 0) {
        try {
          const parentData = await contract.getProductToken(tokenObj.parentId);
          setParentToken({
            id: tokenObj.parentId,
            creator: parentData.creator,
            metadata: parentData.metadata,
            parentId: Number(parentData.parentId),
            timestamp: Number(parentData.timestamp),
            isActive: parentData.isActive,
          });
        } catch (error) {
          console.error("Error loading parent token:", error);
        }
      }
    } catch (error) {
      console.error("Error loading token:", error);
      toast.error("Failed to load token data");
      router.push('/token');
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

  const parseMetadata = (metadata: string) => {
    // Safe JSON parsing with validation
    try {
      const parsed = JSON.parse(metadata);
      // Validate it's an object, not array or null
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Invalid JSON - return safe fallback
    }
    return { name: "Unknown Product" };
  };

  if (!isConnected || !isApproved) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading token details...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Token not found</p>
                <Link href="/token">
                  <Button>Back to Tokens</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const metadata = parseMetadata(token.metadata);
  const isOwner = token.creator.toLowerCase() === account?.toLowerCase();
  
  // Check if user is Consumer - Consumer should not see transfer button
  const canTransfer = balance > 0 && user && user.role !== "Consumer";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-4xl">
        <Header
          title={metadata.name || `Token #${token.id}`}
          description={`Token ID: #${token.id}`}
          backButton={{
            href: "/token",
            label: "Back to Tokens"
          }}
          actionButtons={
            <>
              {canTransfer && (
                <Link href={`/token/${token.id}/transfer`}>
                  <Button>Transfer Tokens</Button>
                </Link>
              )}
              <Link href={`/token/${token.id}/history`}>
                <Button variant="outline">View Full History</Button>
              </Link>
            </>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Token Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Product Name
                  </div>
                  <div className="text-lg font-semibold">
                    {metadata.name || `Token #${token.id}`}
                  </div>
                </div>

                {metadata.description && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Description
                    </div>
                    <div className="text-sm">{metadata.description}</div>
                  </div>
                )}

                {metadata.category && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Category
                    </div>
                    <Badge>{metadata.category}</Badge>
                  </div>
                )}

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Created At
                  </div>
                  <div className="text-sm">{formatDate(token.timestamp)}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Creator
                  </div>
                  <div className="text-sm font-mono">{formatAddress(token.creator)}</div>
                  {isOwner && <Badge variant="outline" className="mt-1">You are the creator</Badge>}
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Status
                  </div>
                  <Badge className={token.isActive ? "bg-green-500" : "bg-gray-500"}>
                    {token.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {Object.keys(metadata).filter(key => !['name', 'description', 'category'].includes(key)).length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      Additional Metadata
                    </div>
                    <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                      {JSON.stringify(metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Parent Token */}
            {parentToken && (
              <Card>
                <CardHeader>
                  <CardTitle>Parent Token</CardTitle>
                  <CardDescription>
                    This token was created from another token
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        Parent Token ID
                      </div>
                      <Link href={`/token/${token.parentId}`}>
                        <Button variant="link" className="p-0 h-auto">
                          Token #{token.parentId}
                        </Button>
                      </Link>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        Parent Name
                      </div>
                      <div className="text-sm">
                        {parseMetadata(parentToken.metadata).name || `Token #${token.parentId}`}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transaction History */}
            {transactionHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Transaction History</CardTitle>
                      <CardDescription>
                        Recent transfers related to this token
                      </CardDescription>
                    </div>
                    <Link href={`/token/${token.id}/history`}>
                      <Button variant="outline" size="sm">
                        View Full History
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {transactionHistory.slice(-5).reverse().map((transferId) => (
                      <div key={transferId} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">Transfer #{transferId}</span>
                        <Link href={`/transfers/${transferId}`}>
                          <Button variant="link" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    ))}
                    {transactionHistory.length > 5 && (
                      <div className="text-center pt-2">
                        <Link href={`/token/${token.id}/history`}>
                          <Button variant="link" size="sm">
                            View all {transactionHistory.length} transfers →
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Token Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">{balance}</div>
                  <div className="text-sm text-muted-foreground">
                    Your balance
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Total Supply
                  </div>
                  <div className="text-lg font-semibold">{totalSupply}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Your Balance
                  </div>
                  <div className="text-lg font-semibold">{balance}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Transactions
                  </div>
                  <div className="text-lg font-semibold">{transactionHistory.length}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}


```


Actualizando la página de historial del token para usar el Header:


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter, useParams } from "next/navigation";
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

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
}

export default function TokenHistoryPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [token, setToken] = useState<ProductToken | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [tokenChain, setTokenChain] = useState<ProductToken[]>([]);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadHistory();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  // Recursive function to load all parent tokens and their histories
  const loadTokenChain = async (
    contract: ethers.Contract,
    currentTokenId: number,
    chain: ProductToken[] = []
  ): Promise<ProductToken[]> => {
    try {
      const tokenData = await contract.getProductToken(currentTokenId);
      const tokenObj: ProductToken = {
        id: currentTokenId,
        creator: tokenData.creator,
        metadata: tokenData.metadata,
        parentId: Number(tokenData.parentId),
        timestamp: Number(tokenData.timestamp),
        isActive: tokenData.isActive,
      };

      const newChain = [tokenObj, ...chain];

      // If this token has a parent, recursively load it
      if (tokenObj.parentId > 0) {
        return await loadTokenChain(contract, tokenObj.parentId, newChain);
      }

      return newChain;
    } catch (error) {
      console.error(`Error loading token ${currentTokenId}:`, error);
      return chain;
    }
  };

  // Load all transfer histories for tokens in the ancestor chain
  const loadAllHistories = async (
    contract: ethers.Contract,
    tokenChain: ProductToken[]
  ): Promise<number[]> => {
    const allHistoryIds: number[] = [];
    const tokenIdsInChain = new Set(tokenChain.map(token => token.id));

    // Load history for each token in the ancestor chain
    for (const token of tokenChain) {
      try {
        const historyIds: bigint[] = await contract.getTokenTransactionHistory(token.id);
        allHistoryIds.push(...historyIds.map((id) => Number(id)));
      } catch (error) {
        console.error(`Error loading history for token ${token.id}:`, error);
      }
    }

    // Remove duplicates
    return Array.from(new Set(allHistoryIds));
  };

  const loadHistory = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Load complete token chain (oldest ancestor first, current token last) - this is the ancestor lineage
      const chain = await loadTokenChain(contract, Number(tokenId));
      setTokenChain(chain);

      // Set current token (last in chain - the token being viewed)
      const currentToken = chain[chain.length - 1];
      setToken(currentToken);

      // Create a set of token IDs that are in the ancestor chain
      const tokenIdsInChain = new Set(chain.map(token => token.id));

      // Load all transaction histories from tokens in the ancestor chain only
      const allHistoryIds = await loadAllHistories(contract, chain);
      
      // Load all transfer details
      const transferPromises = allHistoryIds.map(async (transferId) => {
        try {
          const transferData = await contract.getTransfer(Number(transferId));
          
          // CRITICAL: Only include transfers for tokens that are in the ancestor chain
          // This ensures we don't show transfers from sibling tokens
          const transferTokenId = Number(transferData.tokenId);
          if (!tokenIdsInChain.has(transferTokenId)) {
            return null;
          }
          
          // For parent tokens, only show transfers that occurred before the direct child token was created
          // This preserves chain integrity by excluding transfers that happened after branching (different paths)
          const isCurrentToken = transferTokenId === currentToken.id;
          if (!isCurrentToken) {
            // This is a parent token - find its direct child in the chain
            // Chain order: [oldest ancestor, ..., parent, current token]
            // So for a token at index i, its child is at index i + 1
            const tokenIndex = chain.findIndex(t => t.id === transferTokenId);
            if (tokenIndex >= 0 && tokenIndex < chain.length - 1) {
              // There is a child token in the chain
              const childToken = chain[tokenIndex + 1];
              const childCreationTime = childToken.timestamp;
              const transferRequestTime = Number(transferData.requestTimestamp);
              
              // Exclude transfers that happened after the child was created - these are separate branches
              // This ensures we only show the lineage that led to the current token
              if (transferRequestTime > childCreationTime) {
                // This transfer happened after the child token was created, so it's not part of this lineage
                return null;
              }
            }
          }
          
          // Get user roles for from and to addresses
          const fromUser = await contract.getUser(transferData.from);
          const toUser = await contract.getUser(transferData.to);
          
          setUserRoles(prev => ({
            ...prev,
            [transferData.from.toLowerCase()]: fromUser.role,
            [transferData.to.toLowerCase()]: toUser.role,
          }));
          
          return {
            id: Number(transferId),
            tokenId: transferTokenId,
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
        (transfer): transfer is Transfer => transfer !== null
      );

      // Sort by timestamp (oldest first) to show the chain flow
      validTransfers.sort((a, b) => a.requestTimestamp - b.requestTimestamp);

      setTransfers(validTransfers);
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Failed to load product history");
      router.push(`/token/${tokenId}`);
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

  const parseMetadata = (metadata: string) => {
    // Safe JSON parsing with validation
    try {
      const parsed = JSON.parse(metadata);
      // Validate it's an object, not array or null
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Invalid JSON - return safe fallback
    }
    return { name: "Unknown Product" };
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading product history...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Token not found</p>
                <Link href="/token">
                  <Button>Back to Tokens</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const metadata = parseMetadata(token.metadata);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Product History
            </h1>
            <p className="text-muted-foreground mt-2">
              {metadata.name || `Token #${token.id}`} - Complete Supply Chain Tracking
            </p>
          </div>
          <Link href={`/token/${token.id}`}>
            <Button variant="outline">Back to Token</Button>
          </Link>
        </div>

        {/* Token Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Product Name
                </div>
                <div className="text-lg font-semibold">
                  {metadata.name || `Token #${token.id}`}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Token ID
                </div>
                <div className="text-lg font-semibold">#{token.id}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Created
                </div>
                <div className="text-sm">{formatDate(token.timestamp)}</div>
              </div>
            </div>
            {tokenChain.length > 1 && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Product Chain Lineage
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {tokenChain.map((chainToken, index) => {
                    const chainMetadata = parseMetadata(chainToken.metadata);
                    const isLast = index === tokenChain.length - 1;
                    return (
                      <div key={chainToken.id} className="flex items-center gap-2">
                        <Link href={`/token/${chainToken.id}`}>
                          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                            #{chainToken.id} - {chainMetadata.name || `Token ${chainToken.id}`}
                          </Badge>
                        </Link>
                        {!isLast && <span className="text-muted-foreground">→</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transfer Chain */}
        {transfers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No transfer history found for this product</p>
                <p className="text-sm text-muted-foreground">
                  This product has not been transferred yet in the supply chain.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Supply Chain Transfer History</CardTitle>
              <CardDescription>
                Complete transaction history showing the journey of this product through the supply chain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Visual Chain */}
                <div className="relative">
                  {transfers.map((transfer, index) => {
                    const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                    const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                    const isLast = index === transfers.length - 1;
                    
                    return (
                      <div key={transfer.id} className="relative">
                        {/* Transfer Card */}
                        <div className="border-l-4 border-blue-500 pl-4 mb-6">
                          <div className="bg-muted p-4 rounded-lg">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={getRoleColor(fromRole)}>
                                    {fromRole}
                                  </Badge>
                                  <span className="text-muted-foreground">→</span>
                                  <Badge className={getRoleColor(toRole)}>
                                    {toRole}
                                  </Badge>
                                </div>
                                <div className="text-sm font-medium">
                                  Transfer #{transfer.id}
                                </div>
                              </div>
                              <div className="text-right">
                                {getStatusBadge(transfer.status)}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="text-muted-foreground mb-1">From</div>
                                <div className="font-mono">{formatAddress(transfer.from)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">To</div>
                                <div className="font-mono">{formatAddress(transfer.to)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Token Used</div>
                                <Link href={`/token/${transfer.tokenId}`}>
                                  <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                                    Token #{transfer.tokenId}
                                  </Badge>
                                </Link>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Amount</div>
                                <div className="font-semibold">{transfer.amount} tokens</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Requested</div>
                                <div>{formatDate(transfer.requestTimestamp)}</div>
                              </div>
                              {transfer.responseTimestamp > 0 && (
                                <div>
                                  <div className="text-muted-foreground mb-1">Completed</div>
                                  <div>{formatDate(transfer.responseTimestamp)}</div>
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-3">
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="outline" size="sm">
                                  View Transfer Details
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                        
                        {/* Arrow to next transfer */}
                        {!isLast && (
                          <div className="flex justify-center mb-2">
                            <div className="w-0.5 h-8 bg-blue-500"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Summary Table */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">History Summary</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transfer ID</TableHead>
                        <TableHead>Token ID</TableHead>
                        <TableHead>From Role</TableHead>
                        <TableHead>To Role</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfers.map((transfer) => {
                        const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                        const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                        
                        return (
                          <TableRow key={transfer.id}>
                            <TableCell className="font-medium">#{transfer.id}</TableCell>
                            <TableCell>
                              <Link href={`/token/${transfer.tokenId}`}>
                                <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                                  #{transfer.tokenId}
                                </Badge>
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(fromRole)} variant="outline">
                                {fromRole}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(toRole)} variant="outline">
                                {toRole}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">{transfer.amount}</TableCell>
                            <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                            <TableCell className="text-sm">
                              {formatDate(transfer.requestTimestamp)}
                            </TableCell>
                            <TableCell>
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="link" size="sm">
                                  View
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
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
import { useRouter, useParams } from "next/navigation";
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

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
}

export default function TokenHistoryPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [token, setToken] = useState<ProductToken | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [tokenChain, setTokenChain] = useState<ProductToken[]>([]);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadHistory();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  // Recursive function to load all parent tokens and their histories
  const loadTokenChain = async (
    contract: ethers.Contract,
    currentTokenId: number,
    chain: ProductToken[] = []
  ): Promise<ProductToken[]> => {
    try {
      const tokenData = await contract.getProductToken(currentTokenId);
      const tokenObj: ProductToken = {
        id: currentTokenId,
        creator: tokenData.creator,
        metadata: tokenData.metadata,
        parentId: Number(tokenData.parentId),
        timestamp: Number(tokenData.timestamp),
        isActive: tokenData.isActive,
      };

      const newChain = [tokenObj, ...chain];

      // If this token has a parent, recursively load it
      if (tokenObj.parentId > 0) {
        return await loadTokenChain(contract, tokenObj.parentId, newChain);
      }

      return newChain;
    } catch (error) {
      console.error(`Error loading token ${currentTokenId}:`, error);
      return chain;
    }
  };

  // Load all transfer histories for tokens in the ancestor chain
  const loadAllHistories = async (
    contract: ethers.Contract,
    tokenChain: ProductToken[]
  ): Promise<number[]> => {
    const allHistoryIds: number[] = [];
    const tokenIdsInChain = new Set(tokenChain.map(token => token.id));

    // Load history for each token in the ancestor chain
    for (const token of tokenChain) {
      try {
        const historyIds: bigint[] = await contract.getTokenTransactionHistory(token.id);
        allHistoryIds.push(...historyIds.map((id) => Number(id)));
      } catch (error) {
        console.error(`Error loading history for token ${token.id}:`, error);
      }
    }

    // Remove duplicates
    return Array.from(new Set(allHistoryIds));
  };

  const loadHistory = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      // Load complete token chain (oldest ancestor first, current token last) - this is the ancestor lineage
      const chain = await loadTokenChain(contract, Number(tokenId));
      setTokenChain(chain);

      // Set current token (last in chain - the token being viewed)
      const currentToken = chain[chain.length - 1];
      setToken(currentToken);

      // Create a set of token IDs that are in the ancestor chain
      const tokenIdsInChain = new Set(chain.map(token => token.id));

      // Load all transaction histories from tokens in the ancestor chain only
      const allHistoryIds = await loadAllHistories(contract, chain);
      
      // Load all transfer details
      const transferPromises = allHistoryIds.map(async (transferId) => {
        try {
          const transferData = await contract.getTransfer(Number(transferId));
          
          // CRITICAL: Only include transfers for tokens that are in the ancestor chain
          // This ensures we don't show transfers from sibling tokens
          const transferTokenId = Number(transferData.tokenId);
          if (!tokenIdsInChain.has(transferTokenId)) {
            return null;
          }
          
          // For parent tokens, only show transfers that occurred before the direct child token was created
          // This preserves chain integrity by excluding transfers that happened after branching (different paths)
          const isCurrentToken = transferTokenId === currentToken.id;
          if (!isCurrentToken) {
            // This is a parent token - find its direct child in the chain
            // Chain order: [oldest ancestor, ..., parent, current token]
            // So for a token at index i, its child is at index i + 1
            const tokenIndex = chain.findIndex(t => t.id === transferTokenId);
            if (tokenIndex >= 0 && tokenIndex < chain.length - 1) {
              // There is a child token in the chain
              const childToken = chain[tokenIndex + 1];
              const childCreationTime = childToken.timestamp;
              const transferRequestTime = Number(transferData.requestTimestamp);
              
              // Exclude transfers that happened after the child was created - these are separate branches
              // This ensures we only show the lineage that led to the current token
              if (transferRequestTime > childCreationTime) {
                // This transfer happened after the child token was created, so it's not part of this lineage
                return null;
              }
            }
          }
          
          // Get user roles for from and to addresses
          const fromUser = await contract.getUser(transferData.from);
          const toUser = await contract.getUser(transferData.to);
          
          setUserRoles(prev => ({
            ...prev,
            [transferData.from.toLowerCase()]: fromUser.role,
            [transferData.to.toLowerCase()]: toUser.role,
          }));
          
          return {
            id: Number(transferId),
            tokenId: transferTokenId,
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
        (transfer): transfer is Transfer => transfer !== null
      );

      // Sort by timestamp (oldest first) to show the chain flow
      validTransfers.sort((a, b) => a.requestTimestamp - b.requestTimestamp);

      setTransfers(validTransfers);
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Failed to load product history");
      router.push(`/token/${tokenId}`);
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

  const parseMetadata = (metadata: string) => {
    // Safe JSON parsing with validation
    try {
      const parsed = JSON.parse(metadata);
      // Validate it's an object, not array or null
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Invalid JSON - return safe fallback
    }
    return { name: "Unknown Product" };
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading product history...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-6xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Token not found</p>
                <Link href="/token">
                  <Button>Back to Tokens</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const metadata = parseMetadata(token.metadata);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-6xl">
        <Header
          title="Product History"
          description={`${metadata.name || `Token #${token.id}`} - Complete Supply Chain Tracking`}
          backButton={{
            href: `/token/${token.id}`,
            label: "Back to Token"
          }}
        />

        {/* Token Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Product Name
                </div>
                <div className="text-lg font-semibold">
                  {metadata.name || `Token #${token.id}`}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Token ID
                </div>
                <div className="text-lg font-semibold">#{token.id}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Created
                </div>
                <div className="text-sm">{formatDate(token.timestamp)}</div>
              </div>
            </div>
            {tokenChain.length > 1 && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Product Chain Lineage
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {tokenChain.map((chainToken, index) => {
                    const chainMetadata = parseMetadata(chainToken.metadata);
                    const isLast = index === tokenChain.length - 1;
                    return (
                      <div key={chainToken.id} className="flex items-center gap-2">
                        <Link href={`/token/${chainToken.id}`}>
                          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                            #{chainToken.id} - {chainMetadata.name || `Token ${chainToken.id}`}
                          </Badge>
                        </Link>
                        {!isLast && <span className="text-muted-foreground">→</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transfer Chain */}
        {transfers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No transfer history found for this product</p>
                <p className="text-sm text-muted-foreground">
                  This product has not been transferred yet in the supply chain.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Supply Chain Transfer History</CardTitle>
              <CardDescription>
                Complete transaction history showing the journey of this product through the supply chain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Visual Chain */}
                <div className="relative">
                  {transfers.map((transfer, index) => {
                    const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                    const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                    const isLast = index === transfers.length - 1;
                    
                    return (
                      <div key={transfer.id} className="relative">
                        {/* Transfer Card */}
                        <div className="border-l-4 border-blue-500 pl-4 mb-6">
                          <div className="bg-muted p-4 rounded-lg">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={getRoleColor(fromRole)}>
                                    {fromRole}
                                  </Badge>
                                  <span className="text-muted-foreground">→</span>
                                  <Badge className={getRoleColor(toRole)}>
                                    {toRole}
                                  </Badge>
                                </div>
                                <div className="text-sm font-medium">
                                  Transfer #{transfer.id}
                                </div>
                              </div>
                              <div className="text-right">
                                {getStatusBadge(transfer.status)}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="text-muted-foreground mb-1">From</div>
                                <div className="font-mono">{formatAddress(transfer.from)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">To</div>
                                <div className="font-mono">{formatAddress(transfer.to)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Token Used</div>
                                <Link href={`/token/${transfer.tokenId}`}>
                                  <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                                    Token #{transfer.tokenId}
                                  </Badge>
                                </Link>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Amount</div>
                                <div className="font-semibold">{transfer.amount} tokens</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1">Requested</div>
                                <div>{formatDate(transfer.requestTimestamp)}</div>
                              </div>
                              {transfer.responseTimestamp > 0 && (
                                <div>
                                  <div className="text-muted-foreground mb-1">Completed</div>
                                  <div>{formatDate(transfer.responseTimestamp)}</div>
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-3">
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="outline" size="sm">
                                  View Transfer Details
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                        
                        {/* Arrow to next transfer */}
                        {!isLast && (
                          <div className="flex justify-center mb-2">
                            <div className="w-0.5 h-8 bg-blue-500"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Summary Table */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">History Summary</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transfer ID</TableHead>
                        <TableHead>Token ID</TableHead>
                        <TableHead>From Role</TableHead>
                        <TableHead>To Role</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfers.map((transfer) => {
                        const fromRole = userRoles[transfer.from.toLowerCase()] || "Unknown";
                        const toRole = userRoles[transfer.to.toLowerCase()] || "Unknown";
                        
                        return (
                          <TableRow key={transfer.id}>
                            <TableCell className="font-medium">#{transfer.id}</TableCell>
                            <TableCell>
                              <Link href={`/token/${transfer.tokenId}`}>
                                <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                                  #{transfer.tokenId}
                                </Badge>
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(fromRole)} variant="outline">
                                {fromRole}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getRoleColor(toRole)} variant="outline">
                                {toRole}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">{transfer.amount}</TableCell>
                            <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                            <TableCell className="text-sm">
                              {formatDate(transfer.requestTimestamp)}
                            </TableCell>
                            <TableCell>
                              <Link href={`/transfers/${transfer.id}`}>
                                <Button variant="link" size="sm">
                                  View
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}


```


Actualizando la página de crear token para usar el Header:



Actualizando la página de crear token:


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
import { Header } from "@/components/Header";
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
import { Header } from "@/components/Header";
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
        <Header
          title="Create Product Token"
          description="Create a new product token in the supply chain"
          backButton={{
            href: "/token",
            label: "Back to Tokens"
          }}
        />

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


Actualizando la página de transferir token:


```typescriptreact
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { validateTokenAmount, validateAndSanitizeAddress } from "@/lib/security";
import { Header } from "@/components/Header";

interface AvailableUser {
  address: string;
  role: string;
  id: number;
}

interface TransferForm {
  to: string;
  amount: string;
}

export default function TransferTokenPage() {
  const { account, provider, signer, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [tokenName, setTokenName] = useState<string>("");
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    control,
  } = useForm<TransferForm>({
    defaultValues: {
      to: "",
      amount: "",
    },
  });

  const selectedRecipient = watch("to");

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId && signer) {
      loadTokenData();
      loadAvailableUsers();
    }
  }, [tokenId, account, isConnected, isApproved, signer, router]);

  const loadTokenData = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenData = await contract.getProductToken(tokenId);
      const balance = await contract.getTokenBalance(tokenId, account);

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

      setTokenName(metadata.name || `Token #${tokenId}`);
      setTokenBalance(Number(balance));
    } catch (error) {
      console.error("Error loading token:", error);
      toast.error("Failed to load token data");
      router.push(`/token/${tokenId}`);
    } finally {
      setLoading(false);
    }
  };

  // Get next role in the supply chain
  const getNextRoleInChain = (currentRole: string): string | null => {
    const chainMap: Record<string, string> = {
      Producer: "Factory",
      Factory: "Retailer",
      Retailer: "Consumer",
    };
    return chainMap[currentRole] || null;
  };

  const loadAvailableUsers = async () => {
    // Need both provider and signer - provider for getUser calls, signer for getApprovedUsersByRole
    if (!provider || !signer || !user || !account) return;

    try {
      setLoadingUsers(true);
      
      // First, verify the current user is approved
      const contractWithProvider = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );
      
      try {
        const currentUserData = await contractWithProvider.getUser(account);
        const currentUserStatus = Number(currentUserData.status);
        
        if (currentUserStatus !== 1) { // 1 = Approved
          console.warn("Current user is not approved. Status:", currentUserStatus);
          toast.error("Your account is not approved. Please wait for admin approval.");
          setAvailableUsers([]);
          setLoadingUsers(false);
          return;
        }
      } catch (error: any) {
        if (error.message?.includes("User does not exist")) {
          console.warn("Current user is not registered in the system.");
          toast.error("Your account is not registered. Please register first.");
          setAvailableUsers([]);
          setLoadingUsers(false);
          return;
        }
        throw error;
      }
      
      // Get next role in chain
      const nextRole = getNextRoleInChain(user.role);
      
      if (!nextRole) {
        // Current role has no next step in chain (e.g., Consumer)
        setAvailableUsers([]);
        setLoadingUsers(false);
        return;
      }

      // Use the new function to get approved users by role
      // This function requires onlyApprovedUser modifier, so we need signer
      try {
        const contractWithSigner = new ethers.Contract(
          contractConfig.address,
          contractConfig.abi,
          signer
        );
        
        const userAddresses: string[] = await contractWithSigner.getApprovedUsersByRole(nextRole);
        
        // Get user details for each address (can use provider for view functions)
        const userPromises = userAddresses.map(async (address: string) => {
          try {
            const userData = await contractWithProvider.getUser(address);
            return {
              address,
              role: userData.role,
              id: Number(userData.id),
            };
          } catch (error) {
            console.error(`Error fetching user ${address}:`, error);
            return null;
          }
        });

        const userResults = await Promise.all(userPromises);
        const validUsers = userResults.filter(
          (user): user is AvailableUser => user !== null
        );

        setAvailableUsers(validUsers);
      } catch (error: any) {
        console.error("Error loading users by role:", error);
        
        // Check if it's the "User not approved" error
        if (error.message?.includes("User not approved") || 
            error.reason?.includes("User not approved")) {
          console.warn("Current user is not approved. Please ensure your account is approved in the system.");
          toast.error("Your account is not approved. Please wait for admin approval.");
        } else if (error.message?.includes("getApprovedUsersByRole") || 
                   error.message?.includes("function does not exist")) {
          console.warn("Contract does not have getApprovedUsersByRole function. Please update the contract.");
          toast.error("Contract version mismatch. Please redeploy the contract.");
        } else {
          console.error("Unexpected error:", error);
        }
        setAvailableUsers([]);
      }
    } catch (error) {
      console.error("Error loading users:", error);
      setAvailableUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const onSubmit = async (data: TransferForm) => {
    if (!account || !signer || !tokenId) {
      toast.error("Please connect your wallet");
      return;
    }

    // Validate and sanitize recipient address
    const addressValidation = validateAndSanitizeAddress(data.to);
    if (!addressValidation.valid || !addressValidation.sanitized) {
      toast.error(addressValidation.error || "Invalid recipient address");
      return;
    }

    const toAddress = addressValidation.sanitized;

    // Prevent self-transfer
    if (toAddress.toLowerCase() === account.toLowerCase()) {
      toast.error("Cannot transfer to yourself");
      return;
    }

    // Validate amount using security utility
    const amountValidation = validateTokenAmount(data.amount, tokenBalance);
    if (!amountValidation.valid || amountValidation.value === undefined) {
      toast.error(amountValidation.error || "Invalid amount");
      return;
    }

    const amount = amountValidation.value;

    // Validate recipient is in available users list
    const recipientExists = availableUsers.some(
      (u) => u.address.toLowerCase() === toAddress.toLowerCase()
    );
    
    if (!recipientExists) {
      toast.error("Selected recipient is not available");
      return;
    }

    setIsSubmitting(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      // Verify recipient is a registered and approved user
      try {
        const recipientUser = await contract.getUser(toAddress);
        if (Number(recipientUser.status) !== 1) { // 1 = Approved
          toast.error("Recipient user is not approved");
          setIsSubmitting(false);
          return;
        }
      } catch (error: any) {
        if (error.message?.includes("User does not exist")) {
          toast.error("Recipient is not registered in the system");
          setIsSubmitting(false);
          return;
        }
        throw error;
      }

      toast.info("Creating transfer request... Please confirm the transaction in MetaMask.");

      const tx = await contract.createTransferRequest(tokenId, toAddress, amount);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer request created successfully! Waiting for recipient approval.");
      
      router.push(`/token/${tokenId}`);
    } catch (error: any) {
      console.error("Error creating transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Insufficient balance")) {
        toast.error("Insufficient token balance");
      } else if (error.message?.includes("Destination user not approved")) {
        toast.error("Recipient user is not approved");
      } else {
        toast.error("Failed to create transfer request. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (tokenBalance === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">You don't have any tokens to transfer</p>
                <Link href={`/token/${tokenId}`}>
                  <Button>Back to Token</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Transfer Tokens
            </h1>
            <p className="text-muted-foreground mt-2">
              {tokenName} (Token ID: #{tokenId})
            </p>
          </div>
          <Link href={`/token/${tokenId}`}>
            <Button variant="outline">Back to Token</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Transfer Request</CardTitle>
            <CardDescription>
              Create a transfer request to send tokens to another user. The recipient must approve the transfer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Available Balance
              </div>
              <div className="text-2xl font-bold">{tokenBalance} tokens</div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Recipient Address - Select Field */}
              <div className="space-y-2">
                <Label htmlFor="to">
                  Recipient <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="to"
                  control={control}
                  rules={{
                    required: "Please select a recipient",
                    validate: (value) => {
                      if (!value) {
                        return "Please select a recipient";
                      }
                      if (value.toLowerCase() === account?.toLowerCase()) {
                        return "Cannot transfer to yourself";
                      }
                      return true;
                    },
                  }}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={loadingUsers || availableUsers.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          loadingUsers 
                            ? "Loading recipients..." 
                            : availableUsers.length === 0 
                            ? `No ${getNextRoleInChain(user?.role || "") || "available"} users found`
                            : "Select a recipient"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map((userOption) => (
                          <SelectItem key={userOption.address} value={userOption.address}>
                            <div className="flex flex-col">
                              <span className="font-medium">{userOption.role}</span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {userOption.address.slice(0, 6)}...{userOption.address.slice(-4)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.to && (
                  <p className="text-sm text-red-500">{errors.to.message}</p>
                )}
                {loadingUsers ? (
                  <p className="text-xs text-muted-foreground">
                    Loading available recipients...
                  </p>
                ) : availableUsers.length === 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs text-yellow-600">
                      {loadingUsers 
                        ? "Loading recipients..."
                        : `No approved ${getNextRoleInChain(user?.role || "") || "next role"} users found.`
                      }
                    </p>
                    {!loadingUsers && (
                      <p className="text-xs text-muted-foreground">
                        {user?.role && `As a ${user.role}, you can only transfer to ${getNextRoleInChain(user.role)} users.`}
                        {availableUsers.length === 0 && " Make sure there are approved users with the required role in the system."}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Select a {getNextRoleInChain(user?.role || "") || "recipient"} to receive the tokens. 
                    {user?.role && ` As a ${user.role}, you can only transfer to ${getNextRoleInChain(user.role)} users.`}
                  </p>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  max={tokenBalance}
                  {...register("amount", {
                    required: "Amount is required",
                    min: { value: 1, message: "Amount must be at least 1" },
                    max: {
                      value: tokenBalance,
                      message: `Amount cannot exceed your balance (${tokenBalance})`,
                    },
                    validate: (value) => {
                      const num = parseInt(value);
                      if (isNaN(num) || num <= 0) {
                        return "Amount must be a positive number";
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
                  Maximum: {tokenBalance} tokens
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Link href={`/token/${tokenId}`} className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting || tokenBalance === 0}
                >
                  {isSubmitting ? "Creating Request..." : "Create Transfer Request"}
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { validateTokenAmount, validateAndSanitizeAddress } from "@/lib/security";
import { Header } from "@/components/Header";

interface AvailableUser {
  address: string;
  role: string;
  id: number;
}

interface TransferForm {
  to: string;
  amount: string;
}

export default function TransferTokenPage() {
  const { account, provider, signer, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [tokenName, setTokenName] = useState<string>("");
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    control,
  } = useForm<TransferForm>({
    defaultValues: {
      to: "",
      amount: "",
    },
  });

  const selectedRecipient = watch("to");

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId && signer) {
      loadTokenData();
      loadAvailableUsers();
    }
  }, [tokenId, account, isConnected, isApproved, signer, router]);

  const loadTokenData = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenData = await contract.getProductToken(tokenId);
      const balance = await contract.getTokenBalance(tokenId, account);

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

      setTokenName(metadata.name || `Token #${tokenId}`);
      setTokenBalance(Number(balance));
    } catch (error) {
      console.error("Error loading token:", error);
      toast.error("Failed to load token data");
      router.push(`/token/${tokenId}`);
    } finally {
      setLoading(false);
    }
  };

  // Get next role in the supply chain
  const getNextRoleInChain = (currentRole: string): string | null => {
    const chainMap: Record<string, string> = {
      Producer: "Factory",
      Factory: "Retailer",
      Retailer: "Consumer",
    };
    return chainMap[currentRole] || null;
  };

  const loadAvailableUsers = async () => {
    // Need both provider and signer - provider for getUser calls, signer for getApprovedUsersByRole
    if (!provider || !signer || !user || !account) return;

    try {
      setLoadingUsers(true);
      
      // First, verify the current user is approved
      const contractWithProvider = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );
      
      try {
        const currentUserData = await contractWithProvider.getUser(account);
        const currentUserStatus = Number(currentUserData.status);
        
        if (currentUserStatus !== 1) { // 1 = Approved
          console.warn("Current user is not approved. Status:", currentUserStatus);
          toast.error("Your account is not approved. Please wait for admin approval.");
          setAvailableUsers([]);
          setLoadingUsers(false);
          return;
        }
      } catch (error: any) {
        if (error.message?.includes("User does not exist")) {
          console.warn("Current user is not registered in the system.");
          toast.error("Your account is not registered. Please register first.");
          setAvailableUsers([]);
          setLoadingUsers(false);
          return;
        }
        throw error;
      }
      
      // Get next role in chain
      const nextRole = getNextRoleInChain(user.role);
      
      if (!nextRole) {
        // Current role has no next step in chain (e.g., Consumer)
        setAvailableUsers([]);
        setLoadingUsers(false);
        return;
      }

      // Use the new function to get approved users by role
      // This function requires onlyApprovedUser modifier, so we need signer
      try {
        const contractWithSigner = new ethers.Contract(
          contractConfig.address,
          contractConfig.abi,
          signer
        );
        
        const userAddresses: string[] = await contractWithSigner.getApprovedUsersByRole(nextRole);
        
        // Get user details for each address (can use provider for view functions)
        const userPromises = userAddresses.map(async (address: string) => {
          try {
            const userData = await contractWithProvider.getUser(address);
            return {
              address,
              role: userData.role,
              id: Number(userData.id),
            };
          } catch (error) {
            console.error(`Error fetching user ${address}:`, error);
            return null;
          }
        });

        const userResults = await Promise.all(userPromises);
        const validUsers = userResults.filter(
          (user): user is AvailableUser => user !== null
        );

        setAvailableUsers(validUsers);
      } catch (error: any) {
        console.error("Error loading users by role:", error);
        
        // Check if it's the "User not approved" error
        if (error.message?.includes("User not approved") || 
            error.reason?.includes("User not approved")) {
          console.warn("Current user is not approved. Please ensure your account is approved in the system.");
          toast.error("Your account is not approved. Please wait for admin approval.");
        } else if (error.message?.includes("getApprovedUsersByRole") || 
                   error.message?.includes("function does not exist")) {
          console.warn("Contract does not have getApprovedUsersByRole function. Please update the contract.");
          toast.error("Contract version mismatch. Please redeploy the contract.");
        } else {
          console.error("Unexpected error:", error);
        }
        setAvailableUsers([]);
      }
    } catch (error) {
      console.error("Error loading users:", error);
      setAvailableUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const onSubmit = async (data: TransferForm) => {
    if (!account || !signer || !tokenId) {
      toast.error("Please connect your wallet");
      return;
    }

    // Validate and sanitize recipient address
    const addressValidation = validateAndSanitizeAddress(data.to);
    if (!addressValidation.valid || !addressValidation.sanitized) {
      toast.error(addressValidation.error || "Invalid recipient address");
      return;
    }

    const toAddress = addressValidation.sanitized;

    // Prevent self-transfer
    if (toAddress.toLowerCase() === account.toLowerCase()) {
      toast.error("Cannot transfer to yourself");
      return;
    }

    // Validate amount using security utility
    const amountValidation = validateTokenAmount(data.amount, tokenBalance);
    if (!amountValidation.valid || amountValidation.value === undefined) {
      toast.error(amountValidation.error || "Invalid amount");
      return;
    }

    const amount = amountValidation.value;

    // Validate recipient is in available users list
    const recipientExists = availableUsers.some(
      (u) => u.address.toLowerCase() === toAddress.toLowerCase()
    );
    
    if (!recipientExists) {
      toast.error("Selected recipient is not available");
      return;
    }

    setIsSubmitting(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      // Verify recipient is a registered and approved user
      try {
        const recipientUser = await contract.getUser(toAddress);
        if (Number(recipientUser.status) !== 1) { // 1 = Approved
          toast.error("Recipient user is not approved");
          setIsSubmitting(false);
          return;
        }
      } catch (error: any) {
        if (error.message?.includes("User does not exist")) {
          toast.error("Recipient is not registered in the system");
          setIsSubmitting(false);
          return;
        }
        throw error;
      }

      toast.info("Creating transfer request... Please confirm the transaction in MetaMask.");

      const tx = await contract.createTransferRequest(tokenId, toAddress, amount);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer request created successfully! Waiting for recipient approval.");
      
      router.push(`/token/${tokenId}`);
    } catch (error: any) {
      console.error("Error creating transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Insufficient balance")) {
        toast.error("Insufficient token balance");
      } else if (error.message?.includes("Destination user not approved")) {
        toast.error("Recipient user is not approved");
      } else {
        toast.error("Failed to create transfer request. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (tokenBalance === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">You don't have any tokens to transfer</p>
                <Link href={`/token/${tokenId}`}>
                  <Button>Back to Token</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-2xl">
        <Header
          title="Transfer Tokens"
          description={`${tokenName} (Token ID: #${tokenId})`}
          backButton={{
            href: `/token/${tokenId}`,
            label: "Back to Token"
          }}
        />

        <Card>
          <CardHeader>
            <CardTitle>Create Transfer Request</CardTitle>
            <CardDescription>
              Create a transfer request to send tokens to another user. The recipient must approve the transfer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Available Balance
              </div>
              <div className="text-2xl font-bold">{tokenBalance} tokens</div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Recipient Address - Select Field */}
              <div className="space-y-2">
                <Label htmlFor="to">
                  Recipient <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="to"
                  control={control}
                  rules={{
                    required: "Please select a recipient",
                    validate: (value) => {
                      if (!value) {
                        return "Please select a recipient";
                      }
                      if (value.toLowerCase() === account?.toLowerCase()) {
                        return "Cannot transfer to yourself";
                      }
                      return true;
                    },
                  }}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={loadingUsers || availableUsers.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          loadingUsers 
                            ? "Loading recipients..." 
                            : availableUsers.length === 0 
                            ? `No ${getNextRoleInChain(user?.role || "") || "available"} users found`
                            : "Select a recipient"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map((userOption) => (
                          <SelectItem key={userOption.address} value={userOption.address}>
                            <div className="flex flex-col">
                              <span className="font-medium">{userOption.role}</span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {userOption.address.slice(0, 6)}...{userOption.address.slice(-4)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.to && (
                  <p className="text-sm text-red-500">{errors.to.message}</p>
                )}
                {loadingUsers ? (
                  <p className="text-xs text-muted-foreground">
                    Loading available recipients...
                  </p>
                ) : availableUsers.length === 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs text-yellow-600">
                      {loadingUsers 
                        ? "Loading recipients..."
                        : `No approved ${getNextRoleInChain(user?.role || "") || "next role"} users found.`
                      }
                    </p>
                    {!loadingUsers && (
                      <p className="text-xs text-muted-foreground">
                        {user?.role && `As a ${user.role}, you can only transfer to ${getNextRoleInChain(user.role)} users.`}
                        {availableUsers.length === 0 && " Make sure there are approved users with the required role in the system."}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Select a {getNextRoleInChain(user?.role || "") || "recipient"} to receive the tokens. 
                    {user?.role && ` As a ${user.role}, you can only transfer to ${getNextRoleInChain(user.role)} users.`}
                  </p>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  max={tokenBalance}
                  {...register("amount", {
                    required: "Amount is required",
                    min: { value: 1, message: "Amount must be at least 1" },
                    max: {
                      value: tokenBalance,
                      message: `Amount cannot exceed your balance (${tokenBalance})`,
                    },
                    validate: (value) => {
                      const num = parseInt(value);
                      if (isNaN(num) || num <= 0) {
                        return "Amount must be a positive number";
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
                  Maximum: {tokenBalance} tokens
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Link href={`/token/${tokenId}`} className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting || tokenBalance === 0}
                >
                  {isSubmitting ? "Creating Request..." : "Create Transfer Request"}
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


Verificando y ajustando el breakpoint del sidebar para que funcione correctamente. Revisando el código:



Mejorando el sidebar con algunos ajustes visuales:


```typescriptreact
"use client";

import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatAddress } from "@/lib/utils";
import { X, LayoutDashboard, Package, ArrowLeftRight, User, Settings } from "lucide-react";
import { usePathname } from "next/navigation";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const { 
    isConnected, 
    account, 
    user, 
    disconnectWallet 
  } = useWeb3();
  const pathname = usePathname();

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

  const isActive = (path: string) => {
    return pathname === path;
  };

  const handleLinkClick = () => {
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed left-0 top-0 h-full w-80 bg-background border-r shadow-xl z-50 transform transition-transform duration-300 ease-in-out
          lg:hidden
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Menu</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* User Info */}
          {isConnected && account && user && (
            <div className="p-4 border-b bg-muted/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <Badge className={getRoleColor(user.role)}>
                    {user.role}
                  </Badge>
                  <div className="mt-1">
                    <div className="text-xs text-muted-foreground">Wallet Address</div>
                    <div className="text-sm font-mono font-medium truncate">
                      {formatAddress(account)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            <Link href="/dashboard" onClick={handleLinkClick}>
              <Button
                variant={isActive("/dashboard") ? "default" : "ghost"}
                className="w-full justify-start gap-3"
              >
                <LayoutDashboard className="h-5 w-5" />
                Dashboard
              </Button>
            </Link>

            <Link href="/token" onClick={handleLinkClick}>
              <Button
                variant={isActive("/token") ? "default" : "ghost"}
                className="w-full justify-start gap-3"
              >
                <Package className="h-5 w-5" />
                Tokens
              </Button>
            </Link>

            <Link href="/transfers" onClick={handleLinkClick}>
              <Button
                variant={pathname?.startsWith("/transfers") ? "default" : "ghost"}
                className="w-full justify-start gap-3"
              >
                <ArrowLeftRight className="h-5 w-5" />
                Transfers
              </Button>
            </Link>

            <Link href="/profile" onClick={handleLinkClick}>
              <Button
                variant={isActive("/profile") ? "default" : "ghost"}
                className="w-full justify-start gap-3"
              >
                <User className="h-5 w-5" />
                Profile
              </Button>
            </Link>

            {user?.role === "Admin" && (
              <>
                <Link href="/admin/users" onClick={handleLinkClick}>
                  <Button
                    variant={pathname?.startsWith("/admin/users") ? "default" : "ghost"}
                    className="w-full justify-start gap-3"
                  >
                    <Settings className="h-5 w-5" />
                    User Management
                  </Button>
                </Link>
                <Link href="/admin/tests" onClick={handleLinkClick}>
                  <Button
                    variant={pathname?.startsWith("/admin/tests") ? "default" : "ghost"}
                    className="w-full justify-start gap-3"
                  >
                    <Settings className="h-5 w-5" />
                    Tests
                  </Button>
                </Link>
              </>
            )}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t">
            {isConnected && (
              <Button
                onClick={() => {
                  disconnectWallet();
                  handleLinkClick();
                }}
                variant="outline"
                className="w-full"
              >
                Disconnect Wallet
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}


```


## Resumen de cambios

### 1. Headers actualizados
- Páginas de tokens actualizadas para usar el componente `Header`:
  - `/token` - Lista de tokens
  - `/token/[id]` - Detalle del token
  - `/token/[id]/history` - Historial del token
  - `/token/[id]/transfer` - Transferir token
  - `/token/create` - Crear token
- Página de transfers ya usaba el Header (sin cambios)

### 2. Menú lateral móvil (MobileSidebar)
- Nuevo componente `MobileSidebar.tsx` con:
  - Aparece/desaparece con animación desde la izquierda
  - Visible solo en pantallas menores a 1024px (`lg` breakpoint)
  - Overlay oscuro al abrir
  - Información del usuario visible:
    - Badge del rol con colores
    - Dirección de wallet (address) formateada
    - Avatar con icono de usuario
  - Navegación con iconos de Lucide React:
    - Dashboard
    - Tokens
    - Transfers
    - Profile
    - User Management (Admin)
    - Tests (Admin)
  - Botón de desconectar en el footer
  - Indicador de página activa

### 3. Header actualizado
- Botón de menú hamburguesa (icono `Menu` de Lucide React)
- Visible solo en móviles/tablets (< 1024px)
- Información de wallet oculta en móviles (mostrada en el sidebar)
- Botón de desconectar oculto en móviles (disponible en el sidebar)

### Características
- Diseño responsive: sidebar solo en móviles/tablets
- Información del usuario: badge de rol y dirección de wallet visibles
- Navegación clara con iconos
- Animaciones suaves al abrir/cerrar
- Overlay para cerrar al hacer clic fuera

Cambios completados y listos para usar. El menú lateral aparece en dispositivos móviles y tablets en modo portrait, mejorando la navegación en pantallas pequeñas.

---

**User**

/token/4 for the token metadata display we can create a component to process any token metadata iterating the json and display attributes, create it please and add it to the displays

---

**Cursor**


Revisando el código actual para crear un componente que muestre los metadatos del token de forma más legible.



Creando un componente para mostrar los metadatos del token de forma más legible:


```typescriptreact
"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface TokenMetadataDisplayProps {
  metadata: Record<string, any>;
  excludeKeys?: string[];
}

/**
 * Formats a key into a readable label
 * Converts camelCase to Title Case and handles underscores
 */
function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1") // Add space before capital letters
    .replace(/_/g, " ") // Replace underscores with spaces
    .replace(/^\w/, (c) => c.toUpperCase()) // Capitalize first letter
    .trim();
}

/**
 * Renders a value based on its type
 */
function renderValue(value: any): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">null</span>;
  }

  if (typeof value === "boolean") {
    return (
      <Badge variant={value ? "default" : "secondary"}>
        {value ? "Yes" : "No"}
      </Badge>
    );
  }

  if (typeof value === "number") {
    return <span className="font-mono">{value.toLocaleString()}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-muted-foreground italic">Empty array</span>;
    }
    return (
      <div className="space-y-1">
        {value.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {index + 1}
            </Badge>
            <span>{renderValue(item)}</span>
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    // Handle nested objects
    return (
      <div className="space-y-2 pl-4 border-l-2 border-muted">
        {Object.entries(value).map(([nestedKey, nestedValue]) => (
          <div key={nestedKey}>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              {formatLabel(nestedKey)}
            </div>
            <div className="text-sm">{renderValue(nestedValue)}</div>
          </div>
        ))}
      </div>
    );
  }

  // Default: string or other primitive
  return <span>{String(value)}</span>;
}

export function TokenMetadataDisplay({
  metadata,
  excludeKeys = ["name", "description", "category"],
}: TokenMetadataDisplayProps) {
  // Filter out excluded keys and get remaining metadata
  const additionalMetadata = Object.entries(metadata).filter(
    ([key]) => !excludeKeys.includes(key.toLowerCase())
  );

  // If no additional metadata, don't render anything
  if (additionalMetadata.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-muted-foreground">
        Additional Metadata
      </div>
      <div className="space-y-3">
        {additionalMetadata.map(([key, value]) => (
          <div key={key} className="pb-3 border-b last:border-b-0 last:pb-0">
            <div className="text-sm font-medium text-muted-foreground mb-2">
              {formatLabel(key)}
            </div>
            <div className="text-sm">{renderValue(value)}</div>
          </div>
        ))}
      </div>
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
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { TokenMetadataDisplay } from "@/components/TokenMetadataDisplay";

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
}

export default function TokenDetailPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [token, setToken] = useState<ProductToken | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [totalSupply, setTotalSupply] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [transactionHistory, setTransactionHistory] = useState<number[]>([]);
  const [parentToken, setParentToken] = useState<ProductToken | null>(null);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadTokenData();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  const loadTokenData = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenData = await contract.getProductToken(tokenId);
      const tokenBalance = await contract.getTokenBalance(tokenId, account);
      const tokenTotalSupply = await contract.getTokenTotalSupply(tokenId);
      const history = await contract.getTokenTransactionHistory(tokenId);

      const tokenObj: ProductToken = {
        id: Number(tokenId),
        creator: tokenData.creator,
        metadata: tokenData.metadata,
        parentId: Number(tokenData.parentId),
        timestamp: Number(tokenData.timestamp),
        isActive: tokenData.isActive,
      };

      setToken(tokenObj);
      setBalance(Number(tokenBalance));
      setTotalSupply(Number(tokenTotalSupply));
      setTransactionHistory(history.map((h: bigint) => Number(h)));

      // Load parent token if exists
      if (tokenObj.parentId > 0) {
        try {
          const parentData = await contract.getProductToken(tokenObj.parentId);
          setParentToken({
            id: tokenObj.parentId,
            creator: parentData.creator,
            metadata: parentData.metadata,
            parentId: Number(parentData.parentId),
            timestamp: Number(parentData.timestamp),
            isActive: parentData.isActive,
          });
        } catch (error) {
          console.error("Error loading parent token:", error);
        }
      }
    } catch (error) {
      console.error("Error loading token:", error);
      toast.error("Failed to load token data");
      router.push('/token');
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

  const parseMetadata = (metadata: string) => {
    // Safe JSON parsing with validation
    try {
      const parsed = JSON.parse(metadata);
      // Validate it's an object, not array or null
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Invalid JSON - return safe fallback
    }
    return { name: "Unknown Product" };
  };

  if (!isConnected || !isApproved) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading token details...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Token not found</p>
                <Link href="/token">
                  <Button>Back to Tokens</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const metadata = parseMetadata(token.metadata);
  const isOwner = token.creator.toLowerCase() === account?.toLowerCase();
  
  // Check if user is Consumer - Consumer should not see transfer button
  const canTransfer = balance > 0 && user && user.role !== "Consumer";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-4xl">
        <Header
          title={metadata.name || `Token #${token.id}`}
          description={`Token ID: #${token.id}`}
          backButton={{
            href: "/token",
            label: "Back to Tokens"
          }}
          actionButtons={
            <>
              {canTransfer && (
                <Link href={`/token/${token.id}/transfer`}>
                  <Button>Transfer Tokens</Button>
                </Link>
              )}
              <Link href={`/token/${token.id}/history`}>
                <Button variant="outline">View Full History</Button>
              </Link>
            </>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Token Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Product Name
                  </div>
                  <div className="text-lg font-semibold">
                    {metadata.name || `Token #${token.id}`}
                  </div>
                </div>

                {metadata.description && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Description
                    </div>
                    <div className="text-sm">{metadata.description}</div>
                  </div>
                )}

                {metadata.category && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Category
                    </div>
                    <Badge>{metadata.category}</Badge>
                  </div>
                )}

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Created At
                  </div>
                  <div className="text-sm">{formatDate(token.timestamp)}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Creator
                  </div>
                  <div className="text-sm font-mono">{formatAddress(token.creator)}</div>
                  {isOwner && <Badge variant="outline" className="mt-1">You are the creator</Badge>}
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Status
                  </div>
                  <Badge className={token.isActive ? "bg-green-500" : "bg-gray-500"}>
                    {token.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {Object.keys(metadata).filter(key => !['name', 'description', 'category'].includes(key)).length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      Additional Metadata
                    </div>
                    <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                      {JSON.stringify(metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Parent Token */}
            {parentToken && (
              <Card>
                <CardHeader>
                  <CardTitle>Parent Token</CardTitle>
                  <CardDescription>
                    This token was created from another token
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        Parent Token ID
                      </div>
                      <Link href={`/token/${token.parentId}`}>
                        <Button variant="link" className="p-0 h-auto">
                          Token #{token.parentId}
                        </Button>
                      </Link>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        Parent Name
                      </div>
                      <div className="text-sm">
                        {parseMetadata(parentToken.metadata).name || `Token #${token.parentId}`}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transaction History */}
            {transactionHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Transaction History</CardTitle>
                      <CardDescription>
                        Recent transfers related to this token
                      </CardDescription>
                    </div>
                    <Link href={`/token/${token.id}/history`}>
                      <Button variant="outline" size="sm">
                        View Full History
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {transactionHistory.slice(-5).reverse().map((transferId) => (
                      <div key={transferId} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">Transfer #{transferId}</span>
                        <Link href={`/transfers/${transferId}`}>
                          <Button variant="link" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    ))}
                    {transactionHistory.length > 5 && (
                      <div className="text-center pt-2">
                        <Link href={`/token/${token.id}/history`}>
                          <Button variant="link" size="sm">
                            View all {transactionHistory.length} transfers →
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Token Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">{balance}</div>
                  <div className="text-sm text-muted-foreground">
                    Your balance
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Total Supply
                  </div>
                  <div className="text-lg font-semibold">{totalSupply}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Your Balance
                  </div>
                  <div className="text-lg font-semibold">{balance}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Transactions
                  </div>
                  <div className="text-lg font-semibold">{transactionHistory.length}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
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
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { TokenMetadataDisplay } from "@/components/TokenMetadataDisplay";

interface ProductToken {
  id: number;
  creator: string;
  metadata: string;
  parentId: number;
  timestamp: number;
  isActive: boolean;
}

export default function TokenDetailPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [token, setToken] = useState<ProductToken | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [totalSupply, setTotalSupply] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [transactionHistory, setTransactionHistory] = useState<number[]>([]);
  const [parentToken, setParentToken] = useState<ProductToken | null>(null);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId) {
      loadTokenData();
    }
  }, [tokenId, account, isConnected, isApproved, router]);

  const loadTokenData = async () => {
    if (!account || !provider || !tokenId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenData = await contract.getProductToken(tokenId);
      const tokenBalance = await contract.getTokenBalance(tokenId, account);
      const tokenTotalSupply = await contract.getTokenTotalSupply(tokenId);
      const history = await contract.getTokenTransactionHistory(tokenId);

      const tokenObj: ProductToken = {
        id: Number(tokenId),
        creator: tokenData.creator,
        metadata: tokenData.metadata,
        parentId: Number(tokenData.parentId),
        timestamp: Number(tokenData.timestamp),
        isActive: tokenData.isActive,
      };

      setToken(tokenObj);
      setBalance(Number(tokenBalance));
      setTotalSupply(Number(tokenTotalSupply));
      setTransactionHistory(history.map((h: bigint) => Number(h)));

      // Load parent token if exists
      if (tokenObj.parentId > 0) {
        try {
          const parentData = await contract.getProductToken(tokenObj.parentId);
          setParentToken({
            id: tokenObj.parentId,
            creator: parentData.creator,
            metadata: parentData.metadata,
            parentId: Number(parentData.parentId),
            timestamp: Number(parentData.timestamp),
            isActive: parentData.isActive,
          });
        } catch (error) {
          console.error("Error loading parent token:", error);
        }
      }
    } catch (error) {
      console.error("Error loading token:", error);
      toast.error("Failed to load token data");
      router.push('/token');
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

  const parseMetadata = (metadata: string) => {
    // Safe JSON parsing with validation
    try {
      const parsed = JSON.parse(metadata);
      // Validate it's an object, not array or null
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Invalid JSON - return safe fallback
    }
    return { name: "Unknown Product" };
  };

  if (!isConnected || !isApproved) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading token details...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Token not found</p>
                <Link href="/token">
                  <Button>Back to Tokens</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const metadata = parseMetadata(token.metadata);
  const isOwner = token.creator.toLowerCase() === account?.toLowerCase();
  
  // Check if user is Consumer - Consumer should not see transfer button
  const canTransfer = balance > 0 && user && user.role !== "Consumer";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-4xl">
        <Header
          title={metadata.name || `Token #${token.id}`}
          description={`Token ID: #${token.id}`}
          backButton={{
            href: "/token",
            label: "Back to Tokens"
          }}
          actionButtons={
            <>
              {canTransfer && (
                <Link href={`/token/${token.id}/transfer`}>
                  <Button>Transfer Tokens</Button>
                </Link>
              )}
              <Link href={`/token/${token.id}/history`}>
                <Button variant="outline">View Full History</Button>
              </Link>
            </>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Token Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Product Name
                  </div>
                  <div className="text-lg font-semibold">
                    {metadata.name || `Token #${token.id}`}
                  </div>
                </div>

                {metadata.description && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Description
                    </div>
                    <div className="text-sm">{metadata.description}</div>
                  </div>
                )}

                {metadata.category && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Category
                    </div>
                    <Badge>{metadata.category}</Badge>
                  </div>
                )}

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Created At
                  </div>
                  <div className="text-sm">{formatDate(token.timestamp)}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Creator
                  </div>
                  <div className="text-sm font-mono">{formatAddress(token.creator)}</div>
                  {isOwner && <Badge variant="outline" className="mt-1">You are the creator</Badge>}
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Status
                  </div>
                  <Badge className={token.isActive ? "bg-green-500" : "bg-gray-500"}>
                    {token.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <TokenMetadataDisplay 
                  metadata={metadata} 
                  excludeKeys={['name', 'description', 'category']}
                />
              </CardContent>
            </Card>

            {/* Parent Token */}
            {parentToken && (
              <Card>
                <CardHeader>
                  <CardTitle>Parent Token</CardTitle>
                  <CardDescription>
                    This token was created from another token
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        Parent Token ID
                      </div>
                      <Link href={`/token/${token.parentId}`}>
                        <Button variant="link" className="p-0 h-auto">
                          Token #{token.parentId}
                        </Button>
                      </Link>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        Parent Name
                      </div>
                      <div className="text-sm">
                        {parseMetadata(parentToken.metadata).name || `Token #${token.parentId}`}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transaction History */}
            {transactionHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Transaction History</CardTitle>
                      <CardDescription>
                        Recent transfers related to this token
                      </CardDescription>
                    </div>
                    <Link href={`/token/${token.id}/history`}>
                      <Button variant="outline" size="sm">
                        View Full History
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {transactionHistory.slice(-5).reverse().map((transferId) => (
                      <div key={transferId} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">Transfer #{transferId}</span>
                        <Link href={`/transfers/${transferId}`}>
                          <Button variant="link" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    ))}
                    {transactionHistory.length > 5 && (
                      <div className="text-center pt-2">
                        <Link href={`/token/${token.id}/history`}>
                          <Button variant="link" size="sm">
                            View all {transactionHistory.length} transfers →
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Token Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">{balance}</div>
                  <div className="text-sm text-muted-foreground">
                    Your balance
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Total Supply
                  </div>
                  <div className="text-lg font-semibold">{totalSupply}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Your Balance
                  </div>
                  <div className="text-lg font-semibold">{balance}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Transactions
                  </div>
                  <div className="text-lg font-semibold">{transactionHistory.length}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}


```


Buscando otros lugares donde se muestren metadatos para usar el componente:



Mejorando el componente para manejar mejor casos especiales:


```typescriptreact
"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface TokenMetadataDisplayProps {
  metadata: Record<string, any>;
  excludeKeys?: string[];
}

/**
 * Formats a key into a readable label
 * Converts camelCase to Title Case and handles underscores
 */
function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1") // Add space before capital letters
    .replace(/_/g, " ") // Replace underscores with spaces
    .replace(/^\w/, (c) => c.toUpperCase()) // Capitalize first letter
    .trim();
}

/**
 * Renders a value based on its type
 */
function renderValue(value: any): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">null</span>;
  }

  if (typeof value === "boolean") {
    return (
      <Badge variant={value ? "default" : "secondary"}>
        {value ? "Yes" : "No"}
      </Badge>
    );
  }

  if (typeof value === "number") {
    return <span className="font-mono">{value.toLocaleString()}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-muted-foreground italic">Empty array</span>;
    }
    return (
      <div className="space-y-1">
        {value.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {index + 1}
            </Badge>
            <span>{renderValue(item)}</span>
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    // Handle nested objects
    return (
      <div className="space-y-2 pl-4 border-l-2 border-muted">
        {Object.entries(value).map(([nestedKey, nestedValue]) => (
          <div key={nestedKey}>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              {formatLabel(nestedKey)}
            </div>
            <div className="text-sm">{renderValue(nestedValue)}</div>
          </div>
        ))}
      </div>
    );
  }

  // Default: string or other primitive
  const stringValue = String(value);
  // Handle empty strings
  if (stringValue.trim() === "") {
    return <span className="text-muted-foreground italic">Empty</span>;
  }
  // Handle very long strings (e.g., URLs)
  if (stringValue.length > 100) {
    return (
      <div className="space-y-1">
        <span className="break-words">{stringValue}</span>
      </div>
    );
  }
  return <span>{stringValue}</span>;
}

export function TokenMetadataDisplay({
  metadata,
  excludeKeys = ["name", "description", "category"],
}: TokenMetadataDisplayProps) {
  // Filter out excluded keys and get remaining metadata
  const additionalMetadata = Object.entries(metadata).filter(
    ([key]) => !excludeKeys.includes(key.toLowerCase())
  );

  // If no additional metadata, don't render anything
  if (additionalMetadata.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-muted-foreground">
        Additional Metadata
      </div>
      <div className="space-y-3">
        {additionalMetadata.map(([key, value]) => (
          <div key={key} className="pb-3 border-b last:border-b-0 last:pb-0">
            <div className="text-sm font-medium text-muted-foreground mb-2">
              {formatLabel(key)}
            </div>
            <div className="text-sm">{renderValue(value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


```


Ajustando el espaciado para que coincida con el diseño del card:


```typescriptreact
"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface TokenMetadataDisplayProps {
  metadata: Record<string, any>;
  excludeKeys?: string[];
}

/**
 * Formats a key into a readable label
 * Converts camelCase to Title Case and handles underscores
 */
function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1") // Add space before capital letters
    .replace(/_/g, " ") // Replace underscores with spaces
    .replace(/^\w/, (c) => c.toUpperCase()) // Capitalize first letter
    .trim();
}

/**
 * Renders a value based on its type
 */
function renderValue(value: any): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">null</span>;
  }

  if (typeof value === "boolean") {
    return (
      <Badge variant={value ? "default" : "secondary"}>
        {value ? "Yes" : "No"}
      </Badge>
    );
  }

  if (typeof value === "number") {
    return <span className="font-mono">{value.toLocaleString()}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-muted-foreground italic">Empty array</span>;
    }
    return (
      <div className="space-y-1">
        {value.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {index + 1}
            </Badge>
            <span>{renderValue(item)}</span>
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    // Handle nested objects
    return (
      <div className="space-y-2 pl-4 border-l-2 border-muted">
        {Object.entries(value).map(([nestedKey, nestedValue]) => (
          <div key={nestedKey}>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              {formatLabel(nestedKey)}
            </div>
            <div className="text-sm">{renderValue(nestedValue)}</div>
          </div>
        ))}
      </div>
    );
  }

  // Default: string or other primitive
  const stringValue = String(value);
  // Handle empty strings
  if (stringValue.trim() === "") {
    return <span className="text-muted-foreground italic">Empty</span>;
  }
  // Handle very long strings (e.g., URLs)
  if (stringValue.length > 100) {
    return (
      <div className="space-y-1">
        <span className="break-words">{stringValue}</span>
      </div>
    );
  }
  return <span>{stringValue}</span>;
}

export function TokenMetadataDisplay({
  metadata,
  excludeKeys = ["name", "description", "category"],
}: TokenMetadataDisplayProps) {
  // Filter out excluded keys and get remaining metadata
  const additionalMetadata = Object.entries(metadata).filter(
    ([key]) => !excludeKeys.includes(key.toLowerCase())
  );

  // If no additional metadata, don't render anything
  if (additionalMetadata.length === 0) {
    return null;
  }

  return (
    <div className="pt-4 border-t space-y-4">
      <div className="text-sm font-medium text-muted-foreground">
        Additional Metadata
      </div>
      <div className="space-y-4">
        {additionalMetadata.map(([key, value]) => (
          <div key={key}>
            <div className="text-sm font-medium text-muted-foreground mb-1">
              {formatLabel(key)}
            </div>
            <div className="text-sm">{renderValue(value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


```


Eliminando importaciones no utilizadas:


```typescriptreact
"use client";

import { Badge } from "@/components/ui/badge";

interface TokenMetadataDisplayProps {
  metadata: Record<string, any>;
  excludeKeys?: string[];
}

/**
 * Formats a key into a readable label
 * Converts camelCase to Title Case and handles underscores
 */
function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1") // Add space before capital letters
    .replace(/_/g, " ") // Replace underscores with spaces
    .replace(/^\w/, (c) => c.toUpperCase()) // Capitalize first letter
    .trim();
}

/**
 * Renders a value based on its type
 */
function renderValue(value: any): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">null</span>;
  }

  if (typeof value === "boolean") {
    return (
      <Badge variant={value ? "default" : "secondary"}>
        {value ? "Yes" : "No"}
      </Badge>
    );
  }

  if (typeof value === "number") {
    return <span className="font-mono">{value.toLocaleString()}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-muted-foreground italic">Empty array</span>;
    }
    return (
      <div className="space-y-1">
        {value.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {index + 1}
            </Badge>
            <span>{renderValue(item)}</span>
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    // Handle nested objects
    return (
      <div className="space-y-2 pl-4 border-l-2 border-muted">
        {Object.entries(value).map(([nestedKey, nestedValue]) => (
          <div key={nestedKey}>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              {formatLabel(nestedKey)}
            </div>
            <div className="text-sm">{renderValue(nestedValue)}</div>
          </div>
        ))}
      </div>
    );
  }

  // Default: string or other primitive
  const stringValue = String(value);
  // Handle empty strings
  if (stringValue.trim() === "") {
    return <span className="text-muted-foreground italic">Empty</span>;
  }
  // Handle very long strings (e.g., URLs)
  if (stringValue.length > 100) {
    return (
      <div className="space-y-1">
        <span className="break-words">{stringValue}</span>
      </div>
    );
  }
  return <span>{stringValue}</span>;
}

export function TokenMetadataDisplay({
  metadata,
  excludeKeys = ["name", "description", "category"],
}: TokenMetadataDisplayProps) {
  // Filter out excluded keys and get remaining metadata
  const additionalMetadata = Object.entries(metadata).filter(
    ([key]) => !excludeKeys.includes(key.toLowerCase())
  );

  // If no additional metadata, don't render anything
  if (additionalMetadata.length === 0) {
    return null;
  }

  return (
    <div className="pt-4 border-t space-y-4">
      <div className="text-sm font-medium text-muted-foreground">
        Additional Metadata
      </div>
      <div className="space-y-4">
        {additionalMetadata.map(([key, value]) => (
          <div key={key}>
            <div className="text-sm font-medium text-muted-foreground mb-1">
              {formatLabel(key)}
            </div>
            <div className="text-sm">{renderValue(value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


```


## Resumen

### 1. Componente `TokenMetadataDisplay`

Componente que procesa y muestra metadatos JSON de forma estructurada.

**Características:**
- Formateo de etiquetas: convierte camelCase a Title Case (ej: `color` → `Color`, `productId` → `Product Id`)
- Manejo de tipos de datos:
  - Strings: texto normal, con manejo de cadenas vacías y texto largo
  - Números: formato con separadores de miles
  - Booleanos: badges "Yes"/"No"
  - Arrays: lista numerada con badges
  - Objetos anidados: renderizado indentado con borde izquierdo
- Filtrado: excluye claves ya mostradas (por defecto: name, description, category)
- Estilo: espaciado y separadores consistentes con el diseño

### 2. Integración

- Reemplazado el JSON crudo en la página de detalle del token (`/token/[id]/page.tsx`)
- El componente solo se muestra si hay metadatos adicionales (después de excluir las claves especificadas)

### Ejemplo de uso

En lugar de mostrar:
```json
{
  "name": "Lona Gruesa",
  "description": "Lona con hilo grueso",
  "color": "azul"
}
```

Ahora muestra:
```
Additional Metadata
─────────────────
Color
azul
```

El componente es reutilizable y puede usarse en otras páginas si es necesario.

```json
{
  "name": "Lona Gruesa",
  "description": "Lona con hilo grueso",
  "color": "azul"
}
```

```plaintext
Additional Metadata
─────────────────
Color
azul
```

