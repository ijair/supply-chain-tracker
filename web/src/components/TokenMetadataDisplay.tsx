"use client";

import { Badge } from "@/components/ui/badge";

interface TokenMetadataDisplayProps {
  metadata: Record<string, any>;
  excludeKeys?: string[];
}

/**
 * Formats a key into a readable label
 * Converts camelCase to Title Case and handles underscores
 */
function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1") // Add space before capital letters
    .replace(/_/g, " ") // Replace underscores with spaces
    .replace(/^\w/, (c) => c.toUpperCase()) // Capitalize first letter
    .trim();
}

/**
 * Renders a value based on its type
 */
function renderValue(value: any): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">null</span>;
  }

  if (typeof value === "boolean") {
    return (
      <Badge variant={value ? "default" : "secondary"}>
        {value ? "Yes" : "No"}
      </Badge>
    );
  }

  if (typeof value === "number") {
    return <span className="font-mono">{value.toLocaleString()}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-muted-foreground italic">Empty array</span>;
    }
    return (
      <div className="space-y-1">
        {value.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {index + 1}
            </Badge>
            <span>{renderValue(item)}</span>
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    // Handle nested objects
    return (
      <div className="space-y-2 pl-4 border-l-2 border-muted">
        {Object.entries(value).map(([nestedKey, nestedValue]) => (
          <div key={nestedKey}>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              {formatLabel(nestedKey)}
            </div>
            <div className="text-sm">{renderValue(nestedValue)}</div>
          </div>
        ))}
      </div>
    );
  }

  // Default: string or other primitive
  const stringValue = String(value);
  // Handle empty strings
  if (stringValue.trim() === "") {
    return <span className="text-muted-foreground italic">Empty</span>;
  }
  // Handle very long strings (e.g., URLs)
  if (stringValue.length > 100) {
    return (
      <div className="space-y-1">
        <span className="break-words">{stringValue}</span>
      </div>
    );
  }
  return <span>{stringValue}</span>;
}

export function TokenMetadataDisplay({
  metadata,
  excludeKeys = ["name", "description", "category"],
}: TokenMetadataDisplayProps) {
  // Filter out excluded keys and get remaining metadata
  const additionalMetadata = Object.entries(metadata).filter(
    ([key]) => !excludeKeys.includes(key.toLowerCase())
  );

  // If no additional metadata, don't render anything
  if (additionalMetadata.length === 0) {
    return null;
  }

  return (
    <div className="pt-4 border-t space-y-4">
      <div className="text-sm font-medium text-muted-foreground">
        Additional Metadata
      </div>
      <div className="space-y-4">
        {additionalMetadata.map(([key, value]) => (
          <div key={key}>
            <div className="text-sm font-medium text-muted-foreground mb-1">
              {formatLabel(key)}
            </div>
            <div className="text-sm">{renderValue(value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

