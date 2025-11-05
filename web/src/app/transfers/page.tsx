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
import { Header } from "@/components/Header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

export default function TransfersPage() {
  const { account, provider, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"pending" | "all" | "history">("pending");
  const isAdmin = user?.role === "Admin";

  const loadTransfers = useCallback(async () => {
    if (!account || !provider) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      let transferIds: bigint[] = [];

      if (isAdmin && (viewMode === "all" || viewMode === "history")) {
        // For admin: get all transfers
        const totalTransfers = Number(await contract.getTotalTransfers());
        transferIds = [];
        for (let i = 0; i < totalTransfers; i++) {
          try {
            const transferId = await contract.transferIds(i);
            transferIds.push(transferId);
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.error(`Error fetching transfer ID at index ${i}:`, error);
            }
          }
        }
      } else {
        // For regular users or admin pending view: get pending transfers
        transferIds = await contract.getPendingTransfers(account);
      }
      
      // Load transfer details
      const transferPromises = transferIds.map(async (transferId) => {
        try {
          const transferData = await contract.getTransfer(Number(transferId));
          
          return {
            id: Number(transferId),
            tokenId: Number(transferData.tokenId),
            from: transferData.from,
            to: transferData.to,
            amount: Number(transferData.amount),
            status: Number(transferData.status),
            requestTimestamp: Number(transferData.requestTimestamp),
            responseTimestamp: Number(transferData.responseTimestamp),
          };
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`Error loading transfer ${transferId}:`, error);
          }
          return null;
        }
      });

      const transferResults = await Promise.all(transferPromises);
      let validTransfers = transferResults.filter(
        (transfer): transfer is Transfer => transfer !== null
      );

      // Filter based on view mode
      if (!isAdmin || viewMode === "pending") {
        validTransfers = validTransfers.filter(transfer => transfer.status === 0);
      } else if (viewMode === "history") {
        validTransfers = validTransfers.filter(transfer => transfer.status !== 0);
      }

      // Sort by timestamp (newest first)
      validTransfers.sort((a, b) => b.requestTimestamp - a.requestTimestamp);

      setTransfers(validTransfers);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error loading transfers:", error);
      }
      toast.error("Failed to load transfers");
    } finally {
      setLoading(false);
    }
  }, [account, provider, isAdmin, viewMode]);

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    loadTransfers();
  }, [isConnected, isApproved, router, loadTransfers]);

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

  const getTitle = () => {
    if (isAdmin) {
      switch (viewMode) {
        case "all":
          return "All Transfers";
        case "history":
          return "Transfer History";
        default:
          return "Pending Transfers";
      }
    }
    return "Pending Transfers";
  };

  const getDescription = () => {
    if (isAdmin) {
      switch (viewMode) {
        case "all":
          return "View all transfers in the system across all stages";
        case "history":
          return "View completed transfer history (accepted and rejected)";
        default:
          return "Review and manage incoming transfer requests";
      }
    }
    return "Review and manage incoming transfer requests";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-7xl">
        <Header
          title={getTitle()}
          description={getDescription()}
          backButton={{
            href: "/dashboard",
            label: "Back to Dashboard"
          }}
          actionButtons={
            isAdmin && (
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("pending")}
                >
                  Pending
                </Button>
                <Button
                  variant={viewMode === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("all")}
                >
                  All Transfers
                </Button>
                <Button
                  variant={viewMode === "history" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("history")}
                >
                  History
                </Button>
              </div>
            )
          }
        />

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading transfers...</div>
            </CardContent>
          </Card>
        ) : transfers.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  {isAdmin && viewMode === "history" 
                    ? "No transfer history found" 
                    : isAdmin && viewMode === "all"
                    ? "No transfers found"
                    : "No pending transfers"}
                </p>
                {!isAdmin && (
                  <Link href="/token">
                    <Button>View Tokens</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Transfer Requests</CardTitle>
              <CardDescription>
                {isAdmin 
                  ? `Showing ${transfers.length} transfer(s)`
                  : `You have ${transfers.length} pending transfer request(s)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transfer ID</TableHead>
                    <TableHead>Token ID</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    {viewMode !== "history" && <TableHead>Response</TableHead>}
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-medium">#{transfer.id}</TableCell>
                      <TableCell>
                        <Link href={`/token/${transfer.tokenId}`}>
                          <Button variant="link" className="p-0 h-auto">
                            #{transfer.tokenId}
                          </Button>
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatAddress(transfer.from)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatAddress(transfer.to)}
                      </TableCell>
                      <TableCell className="font-semibold">{transfer.amount}</TableCell>
                      <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                      <TableCell className="text-sm">
                        {formatDate(transfer.requestTimestamp)}
                      </TableCell>
                      {viewMode !== "history" && (
                        <TableCell className="text-sm">
                          {transfer.responseTimestamp > 0 
                            ? formatDate(transfer.responseTimestamp)
                            : "-"}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex gap-2">
                          <Link href={`/transfers/${transfer.id}`}>
                            <Button variant="outline" size="sm">
                              {viewMode === "history" ? "View Details" : "Review"}
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

