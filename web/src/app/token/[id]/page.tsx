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

