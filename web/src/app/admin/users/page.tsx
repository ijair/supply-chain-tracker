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
            <Link href="/dashboard">
              <Button variant="ghost" className="mb-4">
                ← Back to Dashboard
              </Button>
            </Link>
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

