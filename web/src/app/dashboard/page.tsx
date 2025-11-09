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

              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <Link href="/admin/contract">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      🛡️ Contract Control
                    </CardTitle>
                    <CardDescription>
                      Manage pause state and ownership
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

