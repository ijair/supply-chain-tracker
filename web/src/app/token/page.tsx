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

