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

