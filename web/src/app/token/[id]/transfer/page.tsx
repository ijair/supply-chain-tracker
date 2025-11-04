"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";

interface AvailableUser {
  address: string;
  role: string;
  id: number;
}

interface TransferForm {
  to: string;
  amount: string;
}

export default function TransferTokenPage() {
  const { account, provider, signer, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const tokenId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [tokenName, setTokenName] = useState<string>("");
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    control,
  } = useForm<TransferForm>({
    defaultValues: {
      to: "",
      amount: "",
    },
  });

  const selectedRecipient = watch("to");

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (tokenId && signer) {
      loadTokenData();
      loadAvailableUsers();
    }
  }, [tokenId, account, isConnected, isApproved, signer, router]);

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
      const balance = await contract.getTokenBalance(tokenId, account);

      let metadata;
      try {
        metadata = JSON.parse(tokenData.metadata);
      } catch {
        metadata = { name: `Token #${tokenId}` };
      }

      setTokenName(metadata.name || `Token #${tokenId}`);
      setTokenBalance(Number(balance));
    } catch (error) {
      console.error("Error loading token:", error);
      toast.error("Failed to load token data");
      router.push(`/token/${tokenId}`);
    } finally {
      setLoading(false);
    }
  };

  // Get next role in the supply chain
  const getNextRoleInChain = (currentRole: string): string | null => {
    const chainMap: Record<string, string> = {
      Producer: "Factory",
      Factory: "Retailer",
      Retailer: "Consumer",
    };
    return chainMap[currentRole] || null;
  };

  const loadAvailableUsers = async () => {
    // Need both provider and signer - provider for getUser calls, signer for getApprovedUsersByRole
    if (!provider || !signer || !user || !account) return;

    try {
      setLoadingUsers(true);
      
      // First, verify the current user is approved
      const contractWithProvider = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );
      
      try {
        const currentUserData = await contractWithProvider.getUser(account);
        const currentUserStatus = Number(currentUserData.status);
        
        if (currentUserStatus !== 1) { // 1 = Approved
          console.warn("Current user is not approved. Status:", currentUserStatus);
          toast.error("Your account is not approved. Please wait for admin approval.");
          setAvailableUsers([]);
          setLoadingUsers(false);
          return;
        }
      } catch (error: any) {
        if (error.message?.includes("User does not exist")) {
          console.warn("Current user is not registered in the system.");
          toast.error("Your account is not registered. Please register first.");
          setAvailableUsers([]);
          setLoadingUsers(false);
          return;
        }
        throw error;
      }
      
      // Get next role in chain
      const nextRole = getNextRoleInChain(user.role);
      
      if (!nextRole) {
        // Current role has no next step in chain (e.g., Consumer)
        setAvailableUsers([]);
        setLoadingUsers(false);
        return;
      }

      // Use the new function to get approved users by role
      // This function requires onlyApprovedUser modifier, so we need signer
      try {
        const contractWithSigner = new ethers.Contract(
          contractConfig.address,
          contractConfig.abi,
          signer
        );
        
        const userAddresses: string[] = await contractWithSigner.getApprovedUsersByRole(nextRole);
        
        // Get user details for each address (can use provider for view functions)
        const userPromises = userAddresses.map(async (address: string) => {
          try {
            const userData = await contractWithProvider.getUser(address);
            return {
              address,
              role: userData.role,
              id: Number(userData.id),
            };
          } catch (error) {
            console.error(`Error fetching user ${address}:`, error);
            return null;
          }
        });

        const userResults = await Promise.all(userPromises);
        const validUsers = userResults.filter(
          (user): user is AvailableUser => user !== null
        );

        setAvailableUsers(validUsers);
      } catch (error: any) {
        console.error("Error loading users by role:", error);
        
        // Check if it's the "User not approved" error
        if (error.message?.includes("User not approved") || 
            error.reason?.includes("User not approved")) {
          console.warn("Current user is not approved. Please ensure your account is approved in the system.");
          toast.error("Your account is not approved. Please wait for admin approval.");
        } else if (error.message?.includes("getApprovedUsersByRole") || 
                   error.message?.includes("function does not exist")) {
          console.warn("Contract does not have getApprovedUsersByRole function. Please update the contract.");
          toast.error("Contract version mismatch. Please redeploy the contract.");
        } else {
          console.error("Unexpected error:", error);
        }
        setAvailableUsers([]);
      }
    } catch (error) {
      console.error("Error loading users:", error);
      setAvailableUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const onSubmit = async (data: TransferForm) => {
    if (!account || !signer || !tokenId) {
      toast.error("Please connect your wallet");
      return;
    }

    const toAddress = data.to.trim();
    const amount = parseInt(data.amount);

    // Validate recipient is selected
    if (!toAddress) {
      toast.error("Please select a recipient");
      return;
    }

    // Validate address
    if (!ethers.isAddress(toAddress)) {
      toast.error("Invalid Ethereum address");
      return;
    }

    if (toAddress.toLowerCase() === account.toLowerCase()) {
      toast.error("Cannot transfer to yourself");
      return;
    }

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    if (amount > tokenBalance) {
      toast.error(`Insufficient balance. You have ${tokenBalance} tokens.`);
      return;
    }

    // Validate recipient is in available users list
    const recipientExists = availableUsers.some(
      (u) => u.address.toLowerCase() === toAddress.toLowerCase()
    );
    
    if (!recipientExists) {
      toast.error("Selected recipient is not available");
      return;
    }

    setIsSubmitting(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      // Verify recipient is a registered and approved user
      try {
        const recipientUser = await contract.getUser(toAddress);
        if (Number(recipientUser.status) !== 1) { // 1 = Approved
          toast.error("Recipient user is not approved");
          setIsSubmitting(false);
          return;
        }
      } catch (error: any) {
        if (error.message?.includes("User does not exist")) {
          toast.error("Recipient is not registered in the system");
          setIsSubmitting(false);
          return;
        }
        throw error;
      }

      toast.info("Creating transfer request... Please confirm the transaction in MetaMask.");

      const tx = await contract.createTransferRequest(tokenId, toAddress, amount);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer request created successfully! Waiting for recipient approval.");
      
      router.push(`/token/${tokenId}`);
    } catch (error: any) {
      console.error("Error creating transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Insufficient balance")) {
        toast.error("Insufficient token balance");
      } else if (error.message?.includes("Destination user not approved")) {
        toast.error("Recipient user is not approved");
      } else {
        toast.error("Failed to create transfer request. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (tokenBalance === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">You don't have any tokens to transfer</p>
                <Link href={`/token/${tokenId}`}>
                  <Button>Back to Token</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Transfer Tokens
            </h1>
            <p className="text-muted-foreground mt-2">
              {tokenName} (Token ID: #{tokenId})
            </p>
          </div>
          <Link href={`/token/${tokenId}`}>
            <Button variant="outline">Back to Token</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Transfer Request</CardTitle>
            <CardDescription>
              Create a transfer request to send tokens to another user. The recipient must approve the transfer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Available Balance
              </div>
              <div className="text-2xl font-bold">{tokenBalance} tokens</div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Recipient Address - Select Field */}
              <div className="space-y-2">
                <Label htmlFor="to">
                  Recipient <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="to"
                  control={control}
                  rules={{
                    required: "Please select a recipient",
                    validate: (value) => {
                      if (!value) {
                        return "Please select a recipient";
                      }
                      if (value.toLowerCase() === account?.toLowerCase()) {
                        return "Cannot transfer to yourself";
                      }
                      return true;
                    },
                  }}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={loadingUsers || availableUsers.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          loadingUsers 
                            ? "Loading recipients..." 
                            : availableUsers.length === 0 
                            ? `No ${getNextRoleInChain(user?.role || "") || "available"} users found`
                            : "Select a recipient"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map((userOption) => (
                          <SelectItem key={userOption.address} value={userOption.address}>
                            <div className="flex flex-col">
                              <span className="font-medium">{userOption.role}</span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {userOption.address.slice(0, 6)}...{userOption.address.slice(-4)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.to && (
                  <p className="text-sm text-red-500">{errors.to.message}</p>
                )}
                {loadingUsers ? (
                  <p className="text-xs text-muted-foreground">
                    Loading available recipients...
                  </p>
                ) : availableUsers.length === 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs text-yellow-600">
                      {loadingUsers 
                        ? "Loading recipients..."
                        : `No approved ${getNextRoleInChain(user?.role || "") || "next role"} users found.`
                      }
                    </p>
                    {!loadingUsers && (
                      <p className="text-xs text-muted-foreground">
                        {user?.role && `As a ${user.role}, you can only transfer to ${getNextRoleInChain(user.role)} users.`}
                        {availableUsers.length === 0 && " Make sure there are approved users with the required role in the system."}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Select a {getNextRoleInChain(user?.role || "") || "recipient"} to receive the tokens. 
                    {user?.role && ` As a ${user.role}, you can only transfer to ${getNextRoleInChain(user.role)} users.`}
                  </p>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  max={tokenBalance}
                  {...register("amount", {
                    required: "Amount is required",
                    min: { value: 1, message: "Amount must be at least 1" },
                    max: {
                      value: tokenBalance,
                      message: `Amount cannot exceed your balance (${tokenBalance})`,
                    },
                    validate: (value) => {
                      const num = parseInt(value);
                      if (isNaN(num) || num <= 0) {
                        return "Amount must be a positive number";
                      }
                      return true;
                    },
                  })}
                  placeholder="Enter amount"
                />
                {errors.amount && (
                  <p className="text-sm text-red-500">{errors.amount.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Maximum: {tokenBalance} tokens
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Link href={`/token/${tokenId}`} className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting || tokenBalance === 0}
                >
                  {isSubmitting ? "Creating Request..." : "Create Transfer Request"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

