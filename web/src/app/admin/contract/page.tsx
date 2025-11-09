"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";
import { toast } from "sonner";

import { useWeb3 } from "@/contexts/Web3Context";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { contractConfig } from "@/contracts/config";
import { checkContractExists, formatAddress, isContractNotFoundError } from "@/lib/utils";

export default function AdminContractManagement() {
  const {
    isConnected,
    account,
    user,
    isApproved,
    provider,
    signer,
  } = useWeb3();

  const router = useRouter();

  const [ownerAddress, setOwnerAddress] = useState<string>("");
  const [pendingOwner, setPendingOwner] = useState<string>("");
  const [isPaused, setIsPaused] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [newOwnerAddress, setNewOwnerAddress] = useState("");
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [isTogglingPause, setIsTogglingPause] = useState(false);
  const [isAcceptingOwnership, setIsAcceptingOwnership] = useState(false);
  const [isRenouncingOwnership, setIsRenouncingOwnership] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      router.push("/");
      return;
    }

    if (!isApproved || user?.role !== "Admin") {
      router.push("/dashboard");
    }
  }, [isConnected, isApproved, user?.role, router]);

  const loadContractState = useCallback(async () => {
    if (!provider) return;

    setLoading(true);
    try {
      const contractExists = await checkContractExists(provider, contractConfig.address);
      if (!contractExists) {
        toast.error("Contract not deployed. Please deploy the contract first.", {
          description: "The contract at this address does not exist. Anvil may have been restarted.",
          duration: 10000,
        });
        setOwnerAddress("");
        setPendingOwner("");
        setIsPaused(null);
        return;
      }

      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const [ownerValue, pendingOwnerValue, pausedValue] = await Promise.all([
        contract.owner(),
        contract.pendingOwner(),
        contract.paused(),
      ]);

      setOwnerAddress(ownerValue);
      setPendingOwner(pendingOwnerValue);
      setIsPaused(Boolean(pausedValue));
    } catch (error: any) {
      if (isContractNotFoundError(error)) {
        toast.error("Contract not deployed. Please deploy the contract first.", {
          description: "The contract at this address does not exist. Anvil may have been restarted.",
          duration: 10000,
        });
        setOwnerAddress("");
        setPendingOwner("");
        setIsPaused(null);
        return;
      }

      if (process.env.NODE_ENV === "development") {
        console.error("Failed to load contract state:", error);
      }
      toast.error("Failed to load contract state");
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    if (provider && isConnected && isApproved && user?.role === "Admin") {
      loadContractState();
    }
  }, [provider, isConnected, isApproved, user?.role, loadContractState]);

  const isCurrentOwner = useMemo(() => {
    if (!account || !ownerAddress) return false;
    return account.toLowerCase() === ownerAddress.toLowerCase();
  }, [account, ownerAddress]);

  const isPendingOwner = useMemo(() => {
    if (!account || !pendingOwner) return false;
    return account.toLowerCase() === pendingOwner.toLowerCase();
  }, [account, pendingOwner]);

  const handleTogglePause = async (pause: boolean) => {
    if (!signer) {
      toast.error("Please connect your wallet first");
      return;
    }

    setIsTogglingPause(true);
    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      const tx = pause ? await contract.pause() : await contract.unpause();
      toast.info("Transaction sent! Waiting for confirmation...");
      await tx.wait();

      toast.success(pause ? "Contract paused successfully" : "Contract resumed successfully");
      await loadContractState();
    } catch (error: any) {
      if (error?.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (
        error?.message?.includes("Contract is paused") ||
        error?.message?.includes("Contract is not paused")
      ) {
        toast.info(error.message);
      } else {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to toggle pause state:", error);
        }
        toast.error("Failed to change contract pause state");
      }
    } finally {
      setIsTogglingPause(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!signer) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!newOwnerAddress) {
      toast.error("Please enter the new owner address");
      return;
    }

    if (!ethers.isAddress(newOwnerAddress)) {
      toast.error("Invalid Ethereum address");
      return;
    }

    setIsSubmittingTransfer(true);
    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      const tx = await contract.transferOwnership(newOwnerAddress);
      toast.info("Ownership transfer initiated. Waiting for confirmation...");
      await tx.wait();

      toast.success("Ownership transfer started successfully");
      setNewOwnerAddress("");
      await loadContractState();
    } catch (error: any) {
      if (error?.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (
        error?.message?.includes("Invalid new owner address") ||
        error?.message?.includes("New owner must be different")
      ) {
        toast.error(error.message);
      } else {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to transfer ownership:", error);
        }
        toast.error("Failed to start ownership transfer");
      }
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const handleAcceptOwnership = async () => {
    if (!signer) {
      toast.error("Please connect your wallet first");
      return;
    }

    setIsAcceptingOwnership(true);
    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      const tx = await contract.acceptOwnership();
      toast.info("Accepting ownership. Waiting for confirmation...");
      await tx.wait();

      toast.success("Ownership accepted successfully");
      await loadContractState();
    } catch (error: any) {
      if (error?.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to accept ownership:", error);
        }
        toast.error("Failed to accept ownership");
      }
    } finally {
      setIsAcceptingOwnership(false);
    }
  };

  const handleRenounceOwnership = async () => {
    if (!signer) {
      toast.error("Please connect your wallet first");
      return;
    }

    const confirmed = window.confirm(
      "Renouncing ownership is irreversible and will leave the contract without an owner. Are you sure you want to continue?"
    );
    if (!confirmed) {
      return;
    }

    setIsRenouncingOwnership(true);
    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      const tx = await contract.renounceOwnership();
      toast.info("Renouncing ownership. Waiting for confirmation...");
      await tx.wait();

      toast.success("Ownership renounced successfully");
      await loadContractState();
    } catch (error: any) {
      if (error?.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to renounce ownership:", error);
        }
        toast.error("Failed to renounce ownership");
      }
    } finally {
      setIsRenouncingOwnership(false);
    }
  };

  if (!isConnected || !isApproved || user?.role !== "Admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-6xl">
        <Header
          title="Contract Administration"
          description="Manage global contract controls, emergency actions, and ownership"
          backButton={{
            href: "/dashboard",
            label: "Back to Dashboard",
          }}
          actionButtons={
            <Button variant="outline" onClick={loadContractState} disabled={loading}>
              {loading ? "Loading..." : "🔄 Refresh"}
            </Button>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Contract Status</CardTitle>
              <CardDescription>Overview of the contract control state</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Paused</span>
                <Badge className={isPaused ? "bg-red-500" : "bg-green-500"}>
                  {isPaused === null ? "Unknown" : isPaused ? "Paused" : "Active"}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Owner</div>
                <div className="font-mono text-sm break-all">
                  {ownerAddress ? ownerAddress : "—"}
                  {isCurrentOwner && <span className="ml-2 text-xs text-muted-foreground">(You)</span>}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Pending Owner</div>
                <div className="font-mono text-sm break-all">
                  {pendingOwner && pendingOwner !== ethers.ZeroAddress ? pendingOwner : "None"}
                  {isPendingOwner && <span className="ml-2 text-xs text-muted-foreground">(You)</span>}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Last updated using on-chain data. Use the refresh button to fetch the latest state.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Emergency Pause Control</CardTitle>
              <CardDescription>Pause the contract during incidents or resume operations when safe</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                When paused, token creation and transfer operations are blocked. Use this option to protect the system
                during incidents or maintenance windows.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="destructive"
                  disabled={isPaused === null || isPaused === true || isTogglingPause || !isCurrentOwner}
                  onClick={() => handleTogglePause(true)}
                >
                  {isTogglingPause && isPaused === false ? "Pausing..." : "Pause Contract"}
                </Button>
                <Button
                  variant="default"
                  disabled={isPaused === null || isPaused === false || isTogglingPause || !isCurrentOwner}
                  onClick={() => handleTogglePause(false)}
                >
                  {isTogglingPause && isPaused === true ? "Resuming..." : "Resume Contract"}
                </Button>
              </div>
              {!isCurrentOwner && (
                <p className="text-xs text-muted-foreground">
                  Only the current owner can pause or resume the contract.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Ownership Transfer</CardTitle>
              <CardDescription>Assign a new owner to take administrative control</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Start a two-step ownership transfer process by setting the new owner. The designated address must accept
                ownership to complete the transfer.
              </p>
              <div className="space-y-2">
                <Label htmlFor="new-owner">New Owner Address</Label>
                <Input
                  id="new-owner"
                  value={newOwnerAddress}
                  onChange={(event) => setNewOwnerAddress(event.target.value)}
                  placeholder="0x..."
                />
              </div>
              <Button
                onClick={handleTransferOwnership}
                disabled={isSubmittingTransfer || !isCurrentOwner}
              >
                {isSubmittingTransfer ? "Submitting..." : "Start Ownership Transfer"}
              </Button>
              {!isCurrentOwner && (
                <p className="text-xs text-muted-foreground">
                  Only the current owner can initiate an ownership transfer.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ownership Recovery</CardTitle>
              <CardDescription>Complete or revert ownership changes when necessary</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Accept Pending Ownership</p>
                  <p className="text-xs text-muted-foreground">
                    Available to the pending owner address once a transfer has been started.
                  </p>
                  <Button
                    className="mt-2"
                    onClick={handleAcceptOwnership}
                    disabled={!isPendingOwner || isAcceptingOwnership}
                  >
                    {isAcceptingOwnership ? "Accepting..." : "Accept Ownership"}
                  </Button>
                  {!isPendingOwner && pendingOwner && pendingOwner !== ethers.ZeroAddress && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Switch to the pending owner wallet ({formatAddress(pendingOwner)}) to accept ownership.
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-sm font-medium text-red-500">Renounce Ownership</p>
                  <p className="text-xs text-muted-foreground">
                    This action is irreversible and removes administrative control. Only perform this after transferring
                    ownership or if decentralization is intended.
                  </p>
                  <Button
                    className="mt-2"
                    variant="outline"
                    onClick={handleRenounceOwnership}
                    disabled={!isCurrentOwner || isRenouncingOwnership}
                  >
                    {isRenouncingOwnership ? "Renouncing..." : "Renounce Ownership"}
                  </Button>
                  {!isCurrentOwner && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Only the current owner can renounce ownership.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}


