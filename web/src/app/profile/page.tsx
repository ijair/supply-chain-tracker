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
