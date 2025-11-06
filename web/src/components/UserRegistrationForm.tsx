"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserStatus } from "@/contexts/Web3Context";
import { contractConfig } from "@/contracts/config";
import { checkContractExists, isContractNotFoundError } from "@/lib/utils";

const VALID_ROLES = ["Producer", "Factory", "Retailer", "Consumer"];

export function FormDialog() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { account, isRegistered, isConnected, refreshUserData, signer, provider } = useWeb3();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !account) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!role) {
      toast.error("Please select a role");
      return;
    }

    if (!signer) {
      toast.error("Please connect your wallet first");
      return;
    }

    setIsSubmitting(true);

    try {
      // Verify contract exists before trying to use it
      if (provider) {
        const contractExists = await checkContractExists(provider, contractConfig.address);
        if (!contractExists) {
          toast.error(
            'Contract not deployed. Please deploy the contract first.',
            {
              description: 'The contract at this address does not exist. Anvil may have been restarted.',
              duration: 10000,
            }
          );
          setIsSubmitting(false);
          return;
        }
      }

      // Create contract instance with signer
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );
      
      // Call registerUser function
      const tx = await contract.registerUser(role);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      // Wait for transaction to be mined
      await tx.wait();
      
      toast.success("Registration successful! Waiting for admin approval.");
      
      // Refresh user data
      await refreshUserData();
      
      setOpen(false);
    } catch (error: any) {
      console.error("Registration error:", error);
      
      // Check if contract doesn't exist
      if (isContractNotFoundError(error)) {
        toast.error(
          'Contract not deployed. Please deploy the contract first.',
          {
            description: 'The contract at this address does not exist. Anvil may have been restarted.',
            duration: 10000,
          }
        );
        setIsSubmitting(false);
        return;
      }
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected by user");
      } else if (error.message && error.message.includes("User already registered")) {
        toast.error("You are already registered");
      } else {
        toast.error("Registration failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected) {
    return null;
  }

  if (isRegistered) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">Register Now</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Register as User</DialogTitle>
          <DialogDescription>
            Complete your registration to participate in the Supply Chain Tracker network.
            Choose your role and wait for admin approval.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account">Account Address</Label>
            <input
              id="account"
              type="text"
              value={account || ""}
              disabled
              className="w-full px-3 py-2 border border-input bg-muted rounded-md text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Select Your Role</Label>
            <Select value={role} onValueChange={setRole} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {VALID_ROLES.map((roleOption) => (
                  <SelectItem key={roleOption} value={roleOption}>
                    {roleOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Your registration will be reviewed by an admin.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting || !role}
            >
              {isSubmitting ? "Registering..." : "Register"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

