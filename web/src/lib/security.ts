/**
 * Security utilities for sanitizing and validating user input
 */

// Maximum lengths for input validation
export const MAX_INPUT_LENGTHS = {
  METADATA_LABEL: 100,
  METADATA_VALUE: 500,
  METADATA_TOTAL: 10240, // 10KB - matches contract
};

/**
 * Sanitize JSON string to prevent XSS attacks
 * @param jsonString - The JSON string to sanitize
 * @returns Sanitized JSON string or null if invalid
 */
export function sanitizeJson(jsonString: string): string | null {
  if (!jsonString || typeof jsonString !== 'string') {
    return null;
  }

  try {
    // Parse to validate it's valid JSON
    const parsed = JSON.parse(jsonString);

    // Recursively sanitize object values
    const sanitized = sanitizeObject(parsed);

    // Return as string
    return JSON.stringify(sanitized);
  } catch (error) {
    // Invalid JSON
    return null;
  }
}

/**
 * Recursively sanitize object values to prevent XSS
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return escapeHtml(obj);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, any> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        // Sanitize both key and value
        const sanitizedKey = escapeHtml(key);
        sanitized[sanitizedKey] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}

/**
 * Validate metadata field length
 */
export function validateMetadataField(
  label: string,
  value: string
): { valid: boolean; error?: string } {
  if (!label || !label.trim()) {
    return { valid: false, error: 'Label is required' };
  }

  if (!value || !value.trim()) {
    return { valid: false, error: 'Value is required' };
  }

  if (label.trim().length > MAX_INPUT_LENGTHS.METADATA_LABEL) {
    return {
      valid: false,
      error: `Label must be ${MAX_INPUT_LENGTHS.METADATA_LABEL} characters or less`,
    };
  }

  if (value.trim().length > MAX_INPUT_LENGTHS.METADATA_VALUE) {
    return {
      valid: false,
      error: `Value must be ${MAX_INPUT_LENGTHS.METADATA_VALUE} characters or less`,
    };
  }

  return { valid: true };
}

/**
 * Validate total metadata length
 */
export function validateMetadataTotal(metadataJson: string): {
  valid: boolean;
  error?: string;
} {
  if (!metadataJson) {
    return { valid: false, error: 'Metadata is required' };
  }

  if (metadataJson.length > MAX_INPUT_LENGTHS.METADATA_TOTAL) {
    return {
      valid: false,
      error: `Total metadata size must be ${MAX_INPUT_LENGTHS.METADATA_TOTAL} bytes or less`,
    };
  }

  return { valid: true };
}

/**
 * Validate Ethereum address format
 */
export function validateAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }

  // Basic format validation: 0x followed by 40 hex characters
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate and sanitize Ethereum address
 */
export function validateAndSanitizeAddress(address: string): {
  valid: boolean;
  error?: string;
  sanitized?: string;
} {
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Address is required' };
  }

  // Trim whitespace
  const trimmed = address.trim();

  // Check format
  if (!/^0x[a-fA-F0-9]{40}$/i.test(trimmed)) {
    return { valid: false, error: 'Invalid address format. Must be a valid Ethereum address (0x followed by 40 hex characters)' };
  }

  // Convert to checksummed address (lowercase for consistency)
  const sanitized = trimmed.toLowerCase();

  return { valid: true, sanitized };
}

/**
 * Validate numeric input (token ID, amount, etc.)
 */
export function validateNumericInput(
  value: string | number,
  options?: {
    min?: number;
    max?: number;
    integer?: boolean;
    positive?: boolean;
  }
): { valid: boolean; error?: string; value?: number } {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return { valid: false, error: 'Invalid number' };
  }

  if (options?.integer && !Number.isInteger(numValue)) {
    return { valid: false, error: 'Must be an integer' };
  }

  if (options?.positive && numValue <= 0) {
    return { valid: false, error: 'Must be a positive number' };
  }

  if (options?.min !== undefined && numValue < options.min) {
    return { valid: false, error: `Must be at least ${options.min}` };
  }

  if (options?.max !== undefined && numValue > options.max) {
    return { valid: false, error: `Must be at most ${options.max}` };
  }

  return { valid: true, value: numValue };
}

/**
 * Validate token amount
 */
export function validateTokenAmount(amount: string | number, balance?: number): {
  valid: boolean;
  error?: string;
  value?: number;
} {
  // First validate it's a valid positive integer
  const numericValidation = validateNumericInput(amount, {
    integer: true,
    positive: true,
    min: 1,
  });

  if (!numericValidation.valid) {
    return numericValidation;
  }

  const numAmount = numericValidation.value!;

  // Check against balance if provided
  if (balance !== undefined && numAmount > balance) {
    return {
      valid: false,
      error: `Insufficient balance. You have ${balance} tokens.`,
    };
  }

  // Check maximum amount (prevent overflow)
  const MAX_SAFE_AMOUNT = Number.MAX_SAFE_INTEGER;
  if (numAmount > MAX_SAFE_AMOUNT) {
    return {
      valid: false,
      error: 'Amount is too large',
    };
  }

  return { valid: true, value: numAmount };
}

/**
 * Validate token ID
 */
export function validateTokenId(tokenId: string | number): {
  valid: boolean;
  error?: string;
  value?: number;
} {
  return validateNumericInput(tokenId, {
    integer: true,
    positive: true,
    min: 1,
  });
}

/**
 * Validate role string
 */
export function validateRole(role: string): { valid: boolean; error?: string } {
  const validRoles = ['Producer', 'Factory', 'Retailer', 'Consumer'];

  if (!role || typeof role !== 'string') {
    return { valid: false, error: 'Role is required' };
  }

  if (!validRoles.includes(role.trim())) {
    return { valid: false, error: `Invalid role. Must be one of: ${validRoles.join(', ')}` };
  }

  return { valid: true };
}

/**
 * Safely parse JSON with error handling
 */
export function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    const parsed = JSON.parse(jsonString);
    // Additional validation can be added here
    return parsed as T;
  } catch (error) {
    console.error('JSON parse error:', error);
    return fallback;
  }
}

/**
 * Rate limiting helper (client-side)
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 5, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  canProceed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // Remove old requests outside the window
    const recentRequests = requests.filter(
      (timestamp) => now - timestamp < this.windowMs
    );

    if (recentRequests.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    recentRequests.push(now);
    this.requests.set(key, recentRequests);

    return true;
  }

  reset(key: string): void {
    this.requests.delete(key);
  }
}

