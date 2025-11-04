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

  // Load all transfer histories for a token chain
  const loadAllHistories = async (
    contract: ethers.Contract,
    tokenChain: ProductToken[]
  ): Promise<number[]> => {
    const allHistoryIds: number[] = [];

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

      // Load complete token chain (current token + all parents)
      const chain = await loadTokenChain(contract, Number(tokenId));
      setTokenChain(chain);

      // Set current token (first in chain)
      const currentToken = chain[0];
      setToken(currentToken);

      // Load all transaction histories from the entire chain
      const allHistoryIds = await loadAllHistories(contract, chain);
      
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
    try {
      return JSON.parse(metadata);
    } catch {
      return { name: "Unknown Product" };
    }
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

