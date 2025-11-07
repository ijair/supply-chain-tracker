"use client";

import { useWeb3, UserStatus } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import Link from "next/link";
import { getStatusColor, getStatusText, checkContractExists, isContractNotFoundError } from "@/lib/utils";
import { Header } from "@/components/Header";

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
  const loadingRef = useRef(false);

  const loadUsers = useCallback(async () => {
    if (!provider) return;
    
    // Prevent concurrent loads
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      // Verify contract exists before trying to use it
      const contractExists = await checkContractExists(provider, contractConfig.address);
      if (!contractExists) {
        toast.error(
          'Contract not deployed. Please deploy the contract first.',
          {
            description: 'The contract at this address does not exist. Anvil may have been restarted.',
            duration: 10000,
          }
        );
        console.error('Contract not found at address:', contractConfig.address);
        setLoading(false);
        loadingRef.current = false;
        return;
      }

      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );
      
      // Get total number of users first to know how many to fetch
      let totalUsers = 0;
      try {
        totalUsers = Number(await contract.getTotalUsers());
      } catch (error: any) {
        // Check if contract doesn't exist
        if (isContractNotFoundError(error)) {
          toast.error(
            'Contract not deployed. Please deploy the contract first.',
            {
              description: 'The contract at this address does not exist. Anvil may have been restarted.',
              duration: 10000,
            }
          );
          console.error('Contract not found at address:', contractConfig.address);
          setLoading(false);
          loadingRef.current = false;
          return;
        }
        
        // Handle RPC errors gracefully
        const errorCode = error?.code || '';
        const errorMessage = error?.message || '';
        
        // Only log non-critical errors
        if (errorCode !== 'CALL_EXCEPTION' && !errorMessage.includes('execution reverted')) {
          if (process.env.NODE_ENV === 'development') {
            console.warn("Could not get totalUsers, will iterate until error:", error);
          }
        }
        // Continue with iteration even if getTotalUsers fails
      }
      
      // Get user addresses by iterating through the userAddresses array
      // Only iterate up to totalUsers (or a reasonable limit if totalUsers fails)
      const addresses: string[] = [];
      const maxAttempts = totalUsers > 0 ? totalUsers : 100; // Use totalUsers if available, otherwise 100 as fallback
      
      for (let i = 0; i < maxAttempts; i++) {
        try {
          const address = await contract.userAddresses(i);
          // Check if address is valid (not zero address)
          if (address && address !== ethers.ZeroAddress && address.toLowerCase() !== ethers.ZeroAddress.toLowerCase()) {
            addresses.push(address);
          } else {
            // Zero address indicates empty slot or end of array
            if (process.env.NODE_ENV === 'development') {
              console.log(`Found zero address at index ${i}, stopping iteration`);
            }
            break;
          }
        } catch (error: any) {
          // If we get a revert or out of bounds, we've reached the end of the array
          const errorMessage = error.message || error.reason || String(error) || '';
          const errorCode = error.code || '';
          
          // Check for execution reverted (this means we're out of bounds)
          const isExecutionReverted = 
            errorMessage.includes('execution reverted') ||
            errorMessage.includes('revert') ||
            errorCode === 'CALL_EXCEPTION' ||
            errorCode === 'UNPREDICTABLE_GAS_LIMIT';
          
          // Handle RPC errors - Internal JSON-RPC errors should be caught and not logged repeatedly
          if (errorCode === -32603 || errorMessage.includes('Internal JSON-RPC error')) {
            // For RPC errors, stop if we've tried beyond totalUsers
            // This prevents infinite loops when the RPC is having issues
            if (i >= totalUsers && totalUsers > 0) {
              if (process.env.NODE_ENV === 'development') {
                console.log(`RPC error at index ${i}, stopping (totalUsers: ${totalUsers})`);
              }
              break;
            }
            // If we don't have totalUsers, try a few more times then stop
            if (i >= 10 && totalUsers === 0) {
              if (process.env.NODE_ENV === 'development') {
                console.log(`RPC error at index ${i}, stopping after 10 attempts`);
              }
              break;
            }
            continue; // Skip to next iteration for transient RPC errors
          }
          
          // If we get execution reverted, we've reached the end of the array
          if (isExecutionReverted) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`Reached end of userAddresses array at index ${i} (execution reverted)`);
            }
            break; // Stop immediately when we hit execution reverted
          }
          
          // For other errors, log in development but continue
          if (process.env.NODE_ENV === 'development') {
            console.warn(`Error fetching user address at index ${i}:`, error);
          }
          
          // If we've tried beyond totalUsers and still getting errors, stop
          if (i >= totalUsers && totalUsers > 0) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`Stopping iteration after ${i} attempts (totalUsers: ${totalUsers})`);
            }
            break;
          }
          
          // Safety limit: don't try more than 100 iterations
          if (i >= 100) {
            if (process.env.NODE_ENV === 'development') {
              console.warn(`Stopping iteration after 100 attempts (safety limit)`);
            }
            break;
          }
        }
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Loaded ${addresses.length} user addresses (totalUsers: ${totalUsers})`);
      }
      
      // Get user details for each address
      const userPromises = addresses.map(async (address: string) => {
        try {
          const userData = await contract.getUser(address);
          // Only include users that have been registered (id != 0)
          if (Number(userData.id) === 0) {
            return null;
          }
          return {
            id: Number(userData.id),
            userAddress: userData.userAddress,
            role: userData.role,
            status: Number(userData.status) as UserStatus
          };
        } catch (error: any) {
          // Check if contract doesn't exist
          if (isContractNotFoundError(error)) {
            // This error will be handled at the top level, just return null here
            return null;
          }
          
          // Silently handle RPC errors to prevent console spam
          const errorCode = error?.code || '';
          const errorMessage = error?.message || '';
          
          // Don't log Internal JSON-RPC errors
          if (errorCode !== -32603 && !errorMessage.includes('Internal JSON-RPC error')) {
            if (process.env.NODE_ENV === 'development') {
              console.error(`Error fetching user ${address}:`, error);
            }
          }
          return null;
        }
      });

      const usersData = await Promise.all(userPromises);
      setUsers(usersData.filter((u): u is User => u !== null));
    } catch (error: any) {
      // Check if contract doesn't exist
      if (isContractNotFoundError(error)) {
        toast.error(
          'Contract not deployed. Please deploy the contract first.',
          {
            description: 'The contract at this address does not exist. Anvil may have been restarted.',
            duration: 10000,
          }
        );
        console.error('Contract not found at address:', contractConfig.address);
        setLoading(false);
        loadingRef.current = false;
        return;
      }
      
      // Handle RPC errors gracefully
      const errorCode = error?.code || '';
      const errorMessage = error?.message || '';
      
      // Don't show toast or log Internal JSON-RPC errors (they're handled silently)
      if (errorCode !== -32603 && !errorMessage.includes('Internal JSON-RPC error')) {
        if (process.env.NODE_ENV === 'development') {
          console.error("Error loading users:", error);
        }
        toast.error("Failed to load users");
      }
      // If it's an RPC error, we'll just keep the existing data
    } finally {
      loadingRef.current = false;
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

    if (!provider) return;

    // Initial load
    loadUsers();
    
    // Set up polling to refresh users every 10 seconds (increased from 5 to reduce load)
    // This ensures new registrations appear even if events aren't being listened to
    const interval = setInterval(() => {
      // Only poll if provider is still available and not currently loading
      if (provider && !loadingRef.current) {
        loadUsers().catch((error) => {
          // Silently handle polling errors to prevent console spam
          if (process.env.NODE_ENV === 'development') {
            console.warn('Polling error (silenced):', error);
          }
        });
      }
    }, 10000);
    
    return () => clearInterval(interval);
    // Remove loadUsers from dependencies to prevent effect re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, isApproved, user?.role, provider, router]);

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
  const allUsers = users.filter(u => u.status !== UserStatus.Pending);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-6xl">
        <Header
          title="User Management"
          description="Moderate user registration requests and manage user accounts"
          backButton={{
            href: "/dashboard",
            label: "Back to Dashboard"
          }}
          actionButtons={
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => loadUsers()}
                disabled={loading}
              >
                {loading ? "Loading..." : "🔄 Refresh"}
              </Button>
              <Link href="/admin/tests">
                <Button variant="outline">
                  🧪 Automated Tests
                </Button>
              </Link>
            </div>
          }
        />

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
                        {user.status === UserStatus.Approved ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateUserStatus(user.userAddress, UserStatus.Canceled)}
                            disabled={processing === user.userAddress}
                          >
                            {processing === user.userAddress ? "Processing..." : "Deactivate"}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
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

