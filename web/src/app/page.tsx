// Landing page, Login page, Register page for Supply Chain Tracker
"use client";

import { useWeb3, UserStatus } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormDialog } from "@/components/UserRegistrationForm";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getStatusColor, getStatusText, formatAddress } from "@/lib/utils";

export default function Home() {
  const { 
    isConnected, 
    account, 
    chainId, 
    user, 
    isRegistered, 
    isApproved, 
    connectWallet,
    disconnectWallet 
  } = useWeb3();
  
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard if user is approved
    if (isApproved) {
      router.push('/dashboard');
    }
  }, [isApproved, router]);



  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="flex min-h-screen w-full max-w-4xl flex-col items-center justify-center py-16 px-8">
        <div className="w-full max-w-2xl space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
              Supply Chain Tracker
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Educational decentralized app to keep tracking supplies on-chain
            </p>
          </div>

          {/* Connection Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Wallet Connection</CardTitle>
                <Badge variant={isConnected ? "default" : "secondary"}>
                  {isConnected ? "Connected" : "Disconnected"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isConnected ? (
                <>
                  <p className="text-muted-foreground">
                    Connect your MetaMask wallet to interact with the Supply Chain Tracker
                  </p>
                  <Button onClick={connectWallet} className="w-full">
                    Connect MetaMask
                  </Button>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        Account
                      </div>
                      <div className="text-lg font-mono">
                        {account ? formatAddress(account) : "Not connected"}
                      </div>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        Chain ID
                      </div>
                      <div className="text-lg font-mono">
                        {chainId !== null ? chainId : "N/A"}
                      </div>
                    </div>
                  </div>
                  {!isRegistered && (
                    <FormDialog />
                  )}
                  {isRegistered && user && (
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-muted-foreground">
                          Status
                        </div>
                        <Badge className={getStatusColor(user.status)}>
                          {getStatusText(user.status)}
                        </Badge>
                      </div>
                      {user.status === UserStatus.Pending && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Your registration is pending approval. Please wait for admin approval.
                        </p>
                      )}
                      {user.status === UserStatus.Rejected && (
                        <p className="text-sm text-destructive mt-2">
                          Your registration was rejected. Please contact support.
                        </p>
                      )}
                    </div>
                  )}
                  <Button onClick={() => disconnectWallet()} variant="outline" className="w-full">
                    Disconnect
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Features Card */}
          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                  <div className="text-2xl mb-2">📦</div>
                  <div className="font-semibold mb-1">
                    Register Supplies
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Create new supply items with name and location
                  </div>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl mb-2">📍</div>
                  <div className="font-semibold mb-1">
                    Track Location
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Update supply locations in real-time
                  </div>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-2xl mb-2">👥</div>
                  <div className="font-semibold mb-1">
                    User Roles
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Producer, Factory, Retailer, Consumer management
                  </div>
                </div>
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="text-2xl mb-2">✅</div>
                  <div className="font-semibold mb-1">
                    On-Chain Records
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Immutable blockchain storage
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
