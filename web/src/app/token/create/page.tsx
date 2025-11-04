"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { contractConfig } from "@/contracts/config";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Trash2, Plus } from "lucide-react";

interface MetadataField {
  id: string;
  label: string;
  value: string;
}

interface CreateTokenForm {
  parentId: string;
  amount: string;
}

export default function CreateTokenPage() {
  const { account, provider, signer, isConnected, isApproved, user } = useWeb3();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableTokens, setAvailableTokens] = useState<Array<{ id: number; name: string; balance: number }>>([]);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [metadataFields, setMetadataFields] = useState<MetadataField[]>([
    { id: "1", label: "name", value: "" },
    { id: "2", label: "description", value: "" },
  ]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CreateTokenForm>({
    defaultValues: {
      parentId: "0",
      amount: "",
    },
  });

  const parentId = watch("parentId");

  useEffect(() => {
    if (!isConnected || !isApproved) {
      router.push('/');
      return;
    }
    loadAvailableTokens();
  }, [account, isConnected, isApproved, router]);

  const loadAvailableTokens = async () => {
    if (!account || !provider) return;

    try {
      setLoadingTokens(true);
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        provider
      );

      const tokenIds: bigint[] = await contract.getAllProductTokenIds();
      const tokenPromises = tokenIds.map(async (tokenId) => {
        try {
          const tokenData = await contract.getProductToken(Number(tokenId));
          const balance = await contract.getTokenBalance(Number(tokenId), account);
          
          if (Number(balance) > 0) {
            let metadata;
            try {
              metadata = JSON.parse(tokenData.metadata);
            } catch {
              metadata = { name: `Token #${tokenId}` };
            }
            
            return {
              id: Number(tokenId),
              name: metadata.name || `Token #${tokenId}`,
              balance: Number(balance),
            };
          }
          return null;
        } catch (error) {
          return null;
        }
      });

      const results = await Promise.all(tokenPromises);
      const validTokens = results.filter((token): token is { id: number; name: string; balance: number } => token !== null);
      setAvailableTokens(validTokens);
    } catch (error) {
      console.error("Error loading tokens:", error);
    } finally {
      setLoadingTokens(false);
    }
  };

  // Add new metadata field
  const addMetadataField = () => {
    const newField: MetadataField = {
      id: Date.now().toString(),
      label: "",
      value: "",
    };
    setMetadataFields([...metadataFields, newField]);
  };

  // Remove metadata field
  const removeMetadataField = (id: string) => {
    if (metadataFields.length <= 1) {
      toast.error("At least one metadata field is required");
      return;
    }
    setMetadataFields(metadataFields.filter((field) => field.id !== id));
  };

  // Update metadata field
  const updateMetadataField = (id: string, field: "label" | "value", value: string) => {
    setMetadataFields(
      metadataFields.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  // Transform metadata fields to JSON
  const transformMetadataToJSON = (): string => {
    const metadataObject: Record<string, string> = {};

    metadataFields.forEach((field) => {
      // Trim and lowercase labels, trim values
      const processedLabel = field.label.trim().toLowerCase();
      const processedValue = field.value.trim();

      // Only add if both label and value are not empty
      if (processedLabel && processedValue) {
        metadataObject[processedLabel] = processedValue;
      }
    });

    // Validate that we have at least one field
    if (Object.keys(metadataObject).length === 0) {
      throw new Error("At least one metadata field with both label and value is required");
    }

    return JSON.stringify(metadataObject);
  };

  const onSubmit = async (data: CreateTokenForm) => {
    if (!account || !signer) {
      toast.error("Please connect your wallet");
      return;
    }

    // Transform metadata fields to JSON
    let metadata: string;
    try {
      metadata = transformMetadataToJSON();
    } catch (error: any) {
      toast.error(error.message || "Invalid metadata format");
      return;
    }

    const parentIdNum = parseInt(data.parentId) || 0;
    const amount = parseInt(data.amount);

    if (amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    setIsSubmitting(true);

    try {
      const contract = new ethers.Contract(
        contractConfig.address,
        contractConfig.abi,
        signer
      );

      // If parentId is provided, check balance
      if (parentIdNum > 0) {
        const balance = await contract.getTokenBalance(parentIdNum, account);
        if (Number(balance) < amount) {
          toast.error(`Insufficient balance. You have ${Number(balance)} tokens.`);
          setIsSubmitting(false);
          return;
        }
      }

      toast.info("Creating token... Please confirm the transaction in MetaMask.");

      const tx = await contract.createProductToken(metadata, parentIdNum, amount);
      
      toast.info("Transaction sent! Waiting for confirmation...");
      
      await tx.wait();
      
      toast.success("Token created successfully!");
      
      router.push('/token');
    } catch (error: any) {
      console.error("Error creating token:", error);
      
      if (error.code === "ACTION_REJECTED") {
        toast.error("Transaction was rejected");
      } else if (error.message?.includes("Insufficient parent token balance")) {
        toast.error("Insufficient balance of parent token");
      } else if (error.message?.includes("Parent token does not exist")) {
        toast.error("Parent token does not exist");
      } else {
        toast.error("Failed to create token. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected || !isApproved || !user) {
    return null;
  }

  const selectedParent = availableTokens.find(t => t.id === parseInt(parentId));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto py-8 px-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              Create Product Token
            </h1>
            <p className="text-muted-foreground mt-2">
              Create a new product token in the supply chain
            </p>
          </div>
          <Link href="/token">
            <Button variant="outline">Back to Tokens</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Token Information</CardTitle>
            <CardDescription>
              Fill in the details to create a new product token
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Dynamic Metadata Fields */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>
                    Product Metadata <span className="text-red-500">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMetadataField}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Field
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {metadataFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-start">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor={`label-${field.id}`} className="text-xs">
                            Label
                          </Label>
                          <Input
                            id={`label-${field.id}`}
                            type="text"
                            value={field.label}
                            onChange={(e) => updateMetadataField(field.id, "label", e.target.value)}
                            placeholder="e.g., name, category, brand"
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`value-${field.id}`} className="text-xs">
                            Value
                          </Label>
                          <Input
                            id={`value-${field.id}`}
                            type="text"
                            value={field.value}
                            onChange={(e) => updateMetadataField(field.id, "value", e.target.value)}
                            placeholder="Enter value"
                            className="text-sm"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMetadataField(field.id)}
                        className="mt-6 h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50"
                        disabled={metadataFields.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground mb-2">
                    <strong>Note:</strong> Labels will be automatically converted to lowercase and trimmed. Values will be trimmed.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    At least one field with both label and value is required.
                  </p>
                </div>

                {/* Preview JSON */}
                {metadataFields.some((f) => f.label.trim() && f.value.trim()) && (
                  <div className="p-3 bg-muted rounded-md">
                    <Label className="text-xs mb-2 block">JSON Preview:</Label>
                    <pre className="text-xs font-mono overflow-auto max-h-32 bg-background p-2 rounded border">
                      {(() => {
                        try {
                          const preview = transformMetadataToJSON();
                          return JSON.stringify(JSON.parse(preview), null, 2);
                        } catch {
                          return "Invalid metadata";
                        }
                      })()}
                    </pre>
                  </div>
                )}
              </div>

              {/* Parent Token */}
              <div className="space-y-2">
                <Label htmlFor="parentId">Parent Token (Optional)</Label>
                <select
                  id="parentId"
                  {...register("parentId")}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="0">No parent (new product)</option>
                  {loadingTokens ? (
                    <option disabled>Loading tokens...</option>
                  ) : availableTokens.length === 0 ? (
                    <option disabled>No tokens available</option>
                  ) : (
                    availableTokens.map((token) => (
                      <option key={token.id} value={token.id.toString()}>
                        {token.name} (ID: #{token.id}, Balance: {token.balance})
                      </option>
                    ))
                  )}
                </select>
                {selectedParent && (
                  <p className="text-xs text-muted-foreground">
                    Available balance: {selectedParent.balance} tokens
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Select a parent token if this product is created from another product
                </p>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Initial Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  {...register("amount", {
                    required: "Amount is required",
                    min: { value: 1, message: "Amount must be at least 1" },
                    validate: (value) => {
                      const num = parseInt(value);
                      if (isNaN(num) || num <= 0) {
                        return "Amount must be a positive number";
                      }
                      if (parentId !== "0" && selectedParent) {
                        if (num > selectedParent.balance) {
                          return `Amount exceeds available balance (${selectedParent.balance})`;
                        }
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
                  Number of tokens to create initially
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Link href="/token" className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Create Token"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

