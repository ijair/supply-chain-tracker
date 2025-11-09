# Visibilidad de tokens para actores en la cadena
_Exported on 11/8/2025 at 23:29:58 EST from Cursor (2.0.69)_

---

**User**

Producer, siendo el primer actor de la cadena no va a recibir tokens de nadie, en la page de tokens cuando es un producer no deberia aparecer la pestana de "tokens transfered to me" pero para factory y retailers si deberian aparecer ya que ellos son actores intermedios

---

**Cursor**

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
  const getFilteredTokens = (view: TokenView): ProductToken[] => {
    if (!account) return [];
    
    if (view === "created") {
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

  const canViewTransferredTokens = user?.role !== "Producer";

  useEffect(() => {
    if (!canViewTransferredTokens && activeView !== "created") {
      setActiveView("created");
    }
  }, [canViewTransferredTokens, activeView]);

  const selectedView: TokenView = canViewTransferredTokens ? activeView : "created";
  const filteredTokens = getFilteredTokens(selectedView);
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
                {selectedView === "created" 
                    ? "You haven't created any tokens yet" 
                    : "No tokens have been transferred to you yet"}
                </p>
                {selectedView === "created" && canCreateTokens && (
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
                {selectedView === "created" 
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
                          {selectedView === "created" ? "Total Supply" : "Your Balance"}
                        </div>
                        <div className="text-2xl font-bold">{balance}</div>
                      </div>
                      
                      {token.parentId > 0 && selectedView === "created" && (
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

                      {selectedView === "transferred" && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Received from
                          </div>
                          <div className="text-sm font-mono">{formatAddress(token.creator)}</div>
                        </div>
                      )}
                      {selectedView === "created" && (
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
  const getFilteredTokens = (view: TokenView): ProductToken[] => {
    if (!account) return [];
    
    if (view === "created") {
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

  const canViewTransferredTokens = user?.role !== "Producer";

  useEffect(() => {
    if (!canViewTransferredTokens && activeView !== "created") {
      setActiveView("created");
    }
  }, [canViewTransferredTokens, activeView]);

  const selectedView: TokenView = canViewTransferredTokens ? activeView : "created";
  const filteredTokens = getFilteredTokens(selectedView);
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
                variant={selectedView === "created" ? "default" : "outline"}
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
              {canViewTransferredTokens && (
                <Button
                  variant={selectedView === "transferred" ? "default" : "outline"}
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
              )}
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
                {selectedView === "created" 
                    ? "You haven't created any tokens yet" 
                    : "No tokens have been transferred to you yet"}
                </p>
                {selectedView === "created" && canCreateTokens && (
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
                {selectedView === "created" 
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
                          {selectedView === "created" ? "Total Supply" : "Your Balance"}
                        </div>
                        <div className="text-2xl font-bold">{balance}</div>
                      </div>
                      
                      {token.parentId > 0 && selectedView === "created" && (
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

                      {selectedView === "transferred" && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Received from
                          </div>
                          <div className="text-sm font-mono">{formatAddress(token.creator)}</div>
                        </div>
                      )}
                      {selectedView === "created" && (
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
  const getFilteredTokens = (view: TokenView): ProductToken[] => {
    if (!account) return [];
    
    if (view === "created") {
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

  const canViewTransferredTokens = user?.role !== "Producer";

  useEffect(() => {
    if (!canViewTransferredTokens && activeView !== "created") {
      setActiveView("created");
    }
  }, [canViewTransferredTokens, activeView]);

  const selectedView: TokenView = canViewTransferredTokens ? activeView : "created";
  const filteredTokens = getFilteredTokens(selectedView);
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
                variant={selectedView === "created" ? "default" : "outline"}
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
              {canViewTransferredTokens && (
                <Button
                  variant={selectedView === "transferred" ? "default" : "outline"}
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
              )}
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
                {selectedView === "created" 
                    ? "You haven't created any tokens yet" 
                    : "No tokens have been transferred to you yet"}
                </p>
                {selectedView === "created" && canCreateTokens && (
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
                {selectedView === "created" 
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
                          {selectedView === "created" ? "Total Supply" : "Your Balance"}
                        </div>
                        <div className="text-2xl font-bold">{balance}</div>
                      </div>
                      
                      {token.parentId > 0 && selectedView === "created" && (
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

                      {selectedView === "transferred" && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Received from
                          </div>
                          <div className="text-sm font-mono">{formatAddress(token.creator)}</div>
                        </div>
                      )}
                      {selectedView === "created" && (
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

- Ajusté `web/src/app/token/page.tsx` para ocultar la pestaña "Tokens Transferred to Me" cuando el rol es `Producer` y forcé la vista a "created" en ese caso, manteniendo la lógica existente para Factory y Retailer.

```165:237:web/src/app/token/page.tsx
const canViewTransferredTokens = user?.role !== "Producer";

useEffect(() => {
  if (!canViewTransferredTokens && activeView !== "created") {
    setActiveView("created");
  }
}, [canViewTransferredTokens, activeView]);

const selectedView: TokenView = canViewTransferredTokens ? activeView : "created";
const filteredTokens = getFilteredTokens(selectedView);
// ... existing code ...
{canViewTransferredTokens && (
  <Button
    variant={selectedView === "transferred" ? "default" : "outline"}
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
)}
```

- Pruebas: no ejecuté pruebas automáticas; conviene verificar manualmente la vista de tokens con cuentas Producer y Factory/Retailer.

```typescriptreact
const canViewTransferredTokens = user?.role !== "Producer";

useEffect(() => {
  if (!canViewTransferredTokens && activeView !== "created") {
    setActiveView("created");
  }
}, [canViewTransferredTokens, activeView]);

const selectedView: TokenView = canViewTransferredTokens ? activeView : "created";
const filteredTokens = getFilteredTokens(selectedView);
// ... existing code ...
{canViewTransferredTokens && (
  <Button
    variant={selectedView === "transferred" ? "default" : "outline"}
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
)}
```

---

**User**

Para mejorar la experiencia de usuario hay que agregar un scroll to top button cuando las paginas tengan scroll y que funcione en mobile touch

---

**Cursor**

```typescriptreact
"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const SCROLL_THRESHOLD = 200;

export function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  const handleScroll = useCallback(() => {
    if (typeof window === "undefined") return;
    setIsVisible(window.scrollY > SCROLL_THRESHOLD);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onScroll = () => handleScroll();

    handleScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [handleScroll]);

  const scrollToTop = useCallback(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 md:bottom-10 md:right-10">
      <Button
        size="icon"
        onClick={scrollToTop}
        onTouchEnd={(event) => {
          event.preventDefault();
          scrollToTop();
        }}
        aria-label="Scroll to top"
        className="h-12 w-12 rounded-full shadow-lg transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <ArrowUp className="h-5 w-5" aria-hidden="true" />
      </Button>
    </div>
  );
}

```

```typescriptreact
"use client";

import { ScrollToTopButton } from "@/components/ScrollToTopButton";

export function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <ScrollToTopButton />
    </>
  );
}

```

```typescriptreact
"use client";

import { ReactNode } from "react";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";

export function ClientLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      {children}
      <ScrollToTopButton />
    </>
  );
}


```

```typescriptreact
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/contexts/Web3Context";
import { Toaster } from "@/components/ui/sonner";
import { ClientLayout } from "@/components/ClientLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Supply Chain Tracker",
  description: "Educational decentralized app to keep tracking supplies on-chain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Web3Provider>
          <ClientLayout>
            {children}
          </ClientLayout>
          <Toaster />
        </Web3Provider>
      </body>
    </html>
  );
}

```

- Incorporé un botón flotante `ScrollToTopButton` que se muestra al desplazarse >200px y realiza scroll suave compatible con clic y touch, usando `lucide-react` para el ícono y el componente `Button`. 
```1:45:web/src/components/ScrollToTopButton.tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
// ... existing code ...
```

- Añadí `ClientLayout` como contenedor cliente que envuelve todas las páginas con el nuevo botón y lo integré en `RootLayout`, preservando los proveedores existentes. 
```1:16:web/src/components/ClientLayout.tsx
"use client";
import { ReactNode } from "react";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";
// ... existing code ...
```
```1:34:web/src/app/layout.tsx
import { ClientLayout } from "@/components/ClientLayout";
// ... existing code ...
        <Web3Provider>
          <ClientLayout>
            {children}
          </ClientLayout>
          <Toaster />
        </Web3Provider>
```

- Pruebas: no ejecuté tests automáticos; sugerencia validar manualmente en desktop y mobile que el botón aparezca tras hacer scroll y regrese suavemente al inicio.

```typescriptreact
"use client";
import { useEffect, useState, useCallback } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
// ... existing code ...
```

```typescriptreact
"use client";
import { ReactNode } from "react";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";
// ... existing code ...
```

```typescriptreact
import { ClientLayout } from "@/components/ClientLayout";
// ... existing code ...
        <Web3Provider>
          <ClientLayout>
            {children}
          </ClientLayout>
          <Toaster />
        </Web3Provider>
```

---

**User**

Para mejorar la experiencia de usuario hay que agregar un scroll to top button cuando las paginas tengan scroll y que funcione en mobile touch, recuerda que estamos utilizando shadcn components si es posible applicalo

---

**Cursor**

```typescriptreact
"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SCROLL_THRESHOLD = 240;

export function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  const handleScroll = useCallback(() => {
    if (typeof window === "undefined") return;
    setIsVisible(window.scrollY > SCROLL_THRESHOLD);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onScroll = () => handleScroll();
    handleScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, [handleScroll]);

  const scrollToTop = useCallback(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 sm:bottom-10 sm:right-10">
      <Button
        size="icon"
        aria-label="Scroll to top"
        onClick={scrollToTop}
        onTouchEnd={(event) => {
          event.preventDefault();
          scrollToTop();
        }}
        className={cn(
          "h-12 w-12 rounded-full shadow-lg transition-transform duration-200",
          "hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
      >
        <ArrowUp className="h-5 w-5" aria-hidden="true" />
      </Button>
    </div>
  );
}

```

```typescriptreact
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/contexts/Web3Context";
import { Toaster } from "@/components/ui/sonner";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Supply Chain Tracker",
  description: "Educational decentralized app to keep tracking supplies on-chain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Web3Provider>
          {children}
          <ScrollToTopButton />
          <Toaster />
        </Web3Provider>
      </body>
    </html>
  );
}

```

- Añadí `ScrollToTopButton` como componente cliente que usa el `Button` de shadcn, muestra un botón flotante al superar 240 px de scroll y maneja tanto clic como `touch` con desplazamiento suave hacia la parte superior.
```1:46:web/src/components/ScrollToTopButton.tsx
"use client";
import { useCallback, useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
// ... existing code ...
```
- Lo integré en `RootLayout` para que esté disponible en todas las páginas sin alterar los proveedores existentes.
```1:36:web/src/app/layout.tsx
import { ScrollToTopButton } from "@/components/ScrollToTopButton";
// ... existing code ...
        <Web3Provider>
          {children}
          <ScrollToTopButton />
          <Toaster />
        </Web3Provider>
```
- Pruebas: no corrí pruebas automáticas; recomiendo validar manualmente el comportamiento en desktop y dispositivos touch tras desplazarse.

```typescriptreact
"use client";
import { useCallback, useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
// ... existing code ...
```

```typescriptreact
import { ScrollToTopButton } from "@/components/ScrollToTopButton";
// ... existing code ...
        <Web3Provider>
          {children}
          <ScrollToTopButton />
          <Toaster />
        </Web3Provider>
```

