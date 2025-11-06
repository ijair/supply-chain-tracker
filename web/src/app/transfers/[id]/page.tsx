"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";

interface Transfer {
  id: number;
  tokenId: number;
  from: string;
  to: string;
  amount: number;
  status: number; // 0 = Pending, 1 = Accepted, 2 = Rejected
  requestTimestamp: number;
  responseTimestamp: number;
}

export default function TransferDetailPage() {
  const { account, provider, signer, isConnected, isApproved } = useWeb3();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const transferId = params.id as string;
  
  // Get the view mode the user came from (pending, all, or history)
  const fromViewMode = searchParams.get("from") || "pending";
  const backUrl = `/transfers?viewMode=${fromViewMode}`;
  
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [tokenName, setTokenName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    if (transferId) {
      loadTransferData();
    }
  }, [transferId, account, isConnected, isApproved, router]);

  const loadTransferData = async () => {
    if (!account || !provider || !transferId) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const transferData = await contract.getTransfer(transferId);
      
      const transferObj: Transfer = {
        id: Number(transferId),
        tokenId: Number(transferData.tokenId),
        from: transferData.from,
        to: transferData.to,
        amount: Number(transferData.amount),
        status: Number(transferData.status),
        requestTimestamp: Number(transferData.requestTimestamp),
        responseTimestamp: Number(transferData.responseTimestamp),
      };

      setTransfer(transferObj);

      // Load token name
      try {
        const tokenData = await contract.getProductToken(transferObj.tokenId);
        let metadata;
        try {
          const parsed = JSON.parse(tokenData.metadata);
          // Validate it's an object
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            metadata = parsed;
          } else {
            metadata = { name: `Token #${transferObj.tokenId}` };
          }
        } catch {
          metadata = { name: `Token #${transferObj.tokenId}` };
        }
        setTokenName(metadata.name || `Token #${transferObj.tokenId}`);
      } catch (error) {
        console.error("Error loading token:", error);
      }
    } catch (error) {
      console.error("Error loading transfer:", error);
      toast.error("Failed to load transfer data");
      router.push(backUrl);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!account || !signer || !transferId || !transfer) return;

    // Verify this is the recipient
    if (transfer.to.toLowerCase() !== account.toLowerCase()) {
      toast.error("You are not the recipient of this transfer");
      return;
    }

    if (transfer.status !== 0) {
      toast.error("This transfer is no longer pending");
      return;
    }

    setIsProcessing(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      toast.info("Accepting transfer... Please confirm the transaction in MetaMask.");

      const tx = await contract.acceptTransfer(transferId);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer accepted successfully!");
      
      // Refresh the page data
      await loadTransferData();
      
      // Refresh transfers list by navigating back to the correct view
      setTimeout(() => {
        router.push(backUrl);
      }, 1500);
    } catch (error: any) {
      console.error("Error accepting transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Only destination can accept")) {
        toast.error("Only the recipient can accept this transfer");
      } else if (error.message?.includes("Transfer not pending")) {
        toast.error("This transfer is no longer pending");
      } else {
        toast.error("Failed to accept transfer. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!account || !signer || !transferId || !transfer) return;

    // Verify this is the recipient
    if (transfer.to.toLowerCase() !== account.toLowerCase()) {
      toast.error("You are not the recipient of this transfer");
      return;
    }

    if (transfer.status !== 0) {
      toast.error("This transfer is no longer pending");
      return;
    }

    setIsProcessing(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      toast.info("Rejecting transfer... Please confirm the transaction in MetaMask.");

      const tx = await contract.rejectTransfer(transferId);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Transfer rejected. Tokens returned to sender.");
      
      // Refresh the page data
      await loadTransferData();
      
      // Refresh transfers list by navigating back to the correct view
      setTimeout(() => {
        router.push(backUrl);
      }, 1500);
    } catch (error: any) {
      console.error("Error rejecting transfer:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Only destination can reject")) {
        toast.error("Only the recipient can reject this transfer");
      } else if (error.message?.includes("Transfer not pending")) {
        toast.error("This transfer is no longer pending");
      } else {
        toast.error("Failed to reject transfer. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 1:
        return <Badge className="bg-green-500">Accepted</Badge>;
      case 2:
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
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
              <div className="text-center text-muted-foreground">Loading transfer details...</div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Transfer not found</p>
                <Link href={backUrl}>
                  <Button>Back to Transfers</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const isRecipient = transfer.to.toLowerCase() === account?.toLowerCase();
  const isPending = transfer.status === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Transfer #{transfer.id}
            </h1>
            <p className="text-muted-foreground mt-2">
              {tokenName || `Token ID: #${transfer.tokenId}`}
            </p>
          </div>
          <Link href={backUrl}>
            <Button variant="outline">Back to Transfers</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Transfer Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Status
                  </div>
                  <div>{getStatusBadge(transfer.status)}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Token
                  </div>
                  <Link href={`/token/${transfer.tokenId}`}>
                    <Button variant="link" className="p-0 h-auto">
                      {tokenName || `Token #${transfer.tokenId}`}
                    </Button>
                  </Link>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Amount
                  </div>
                  <div className="text-2xl font-bold">{transfer.amount} tokens</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    From
                  </div>
                  <div className="text-sm font-mono">{formatAddress(transfer.from)}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    To
                  </div>
                  <div className="text-sm font-mono">{formatAddress(transfer.to)}</div>
                  {isRecipient && <Badge variant="outline" className="mt-1">You are the recipient</Badge>}
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Requested At
                  </div>
                  <div className="text-sm">{formatDate(transfer.requestTimestamp)}</div>
                </div>

                {transfer.responseTimestamp > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Response At
                    </div>
                    <div className="text-sm">{formatDate(transfer.responseTimestamp)}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {isPending && isRecipient && (
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                  <CardDescription>
                    Accept or reject this transfer request
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    onClick={handleAccept}
                    className="w-full"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : "Accept Transfer"}
                  </Button>
                  <Button
                    onClick={handleReject}
                    variant="destructive"
                    className="w-full"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : "Reject Transfer"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {!isPending && (
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    This transfer has been {transfer.status === 1 ? "accepted" : "rejected"}.
                  </p>
                </CardContent>
              </Card>
            )}

            {isPending && !isRecipient && (
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Waiting for recipient approval...
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

