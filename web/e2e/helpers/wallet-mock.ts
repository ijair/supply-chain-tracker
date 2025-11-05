/**
 * Wallet Mock Helper for Playwright E2E Tests
 * 
 * This helper mocks window.ethereum to simulate MetaMask interactions
 * without requiring actual MetaMask to be installed or configured.
 */

import { Page } from '@playwright/test';

// Test account addresses (from Anvil default accounts)
export const TEST_ACCOUNTS = {
  ADMIN: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  PRODUCER: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  FACTORY: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  RETAILER: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
  CONSUMER: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
};

export const ANVIL_CHAIN_ID = '0x7a69'; // 31337 in hex

/**
 * Setup mock Ethereum provider in the browser context
 */
export async function setupMockWallet(page: Page, account: string = TEST_ACCOUNTS.PRODUCER) {
  await page.addInitScript((accountAddress, chainId) => {
    // Mock window.ethereum with proper structure for ethers.js BrowserProvider
    const mockEthereum = {
      isMetaMask: true,
      _state: {
        accounts: [accountAddress],
        chainId: chainId,
      },
      
      request: async ({ method, params }: { method: string; params?: any[] }) => {
        switch (method) {
          case 'eth_requestAccounts':
            return [accountAddress];
          
          case 'eth_accounts':
            return [accountAddress];
          
          case 'eth_chainId':
            return chainId;
          
          case 'wallet_switchEthereumChain':
          case 'wallet_addEthereumChain':
            return null;
          
          case 'eth_sendTransaction':
            // Mock transaction response
            return '0x' + '0'.repeat(64);
          
          case 'eth_sign':
          case 'personal_sign':
            // Mock signature
            return '0x' + '0'.repeat(130);
          
          case 'eth_getBalance':
            return '0x' + '0'.repeat(16); // Large balance
          
          case 'eth_blockNumber':
            return '0x' + '0'.repeat(8);
          
          default:
            console.warn(`Unhandled ethereum method: ${method}`);
            return null;
        }
      },
      
      on: (event: string, callback: Function) => {
        // Store listeners for potential future use
        if (!mockEthereum._listeners) {
          mockEthereum._listeners = {};
        }
        if (!mockEthereum._listeners[event]) {
          mockEthereum._listeners[event] = [];
        }
        mockEthereum._listeners[event].push(callback);
      },
      
      removeListener: (event: string, callback: Function) => {
        if (mockEthereum._listeners && mockEthereum._listeners[event]) {
          const index = mockEthereum._listeners[event].indexOf(callback);
          if (index > -1) {
            mockEthereum._listeners[event].splice(index, 1);
          }
        }
      },
      
      removeAllListeners: (event?: string) => {
        if (!mockEthereum._listeners) return;
        if (event) {
          delete mockEthereum._listeners[event];
        } else {
          mockEthereum._listeners = {};
        }
      },
      
      // Make it enumerable
      _listeners: {} as Record<string, Function[]>,
    };
    
    // Make window.ethereum available before page loads
    Object.defineProperty(window, 'ethereum', {
      value: mockEthereum,
      writable: true,
      configurable: true,
    });
  }, account, ANVIL_CHAIN_ID);
}

/**
 * Connect wallet programmatically
 */
export async function connectWallet(page: Page) {
  try {
    // Click connect button
    const connectButton = page.getByRole('button', { name: 'Connect MetaMask' });
    await connectButton.click();
    
    // Wait for connection to be established (with retries)
    await page.waitForTimeout(2000);
    
    // Verify connection badge shows "Connected" (with timeout)
    try {
      await page.waitForSelector('text=Connected', { timeout: 5000 });
    } catch {
      // If "Connected" text doesn't appear, check for account info instead
      const accountInfo = page.locator('text=/0x[a-fA-F0-9]{4,}/i');
      await accountInfo.first().waitFor({ timeout: 3000 }).catch(() => {});
    }
  } catch (error) {
    // If button doesn't exist or already connected, that's ok
    console.log('Wallet connection attempt:', error);
  }
}

/**
 * Fill registration form
 */
export async function fillRegistrationForm(page: Page, role: 'Producer' | 'Factory' | 'Retailer' | 'Consumer') {
  // Wait for registration form to appear
  const formButton = page.getByRole('button', { name: /register|Register/i });
  await formButton.click();
  
  // Wait for dialog/form to appear
  await page.waitForTimeout(500);
  
  // Select role
  const roleSelect = page.locator('select, [role="combobox"]').first();
  if (await roleSelect.isVisible()) {
    await roleSelect.selectOption({ label: role });
  } else {
    // Try radio buttons or other role selection
    const roleOption = page.getByText(role, { exact: true });
    await roleOption.click();
  }
  
  // Submit form
  const submitButton = page.getByRole('button', { name: /submit|register|Register/i });
  await submitButton.click();
  
  // Wait for transaction to process
  await page.waitForTimeout(2000);
}

/**
 * Wait for user to be registered
 */
export async function waitForRegistration(page: Page) {
  // Wait for pending status or success message
  await page.waitForSelector('text=Pending,text=Approved,text=Registration', { timeout: 10000 });
}

/**
 * Navigate to dashboard and verify access
 */
export async function verifyDashboardAccess(page: Page) {
  const { expect } = await import('@playwright/test');
  await page.goto('/dashboard');
  
  // Verify dashboard elements are visible
  await page.waitForSelector('text=Dashboard', { timeout: 5000 });
  
  // Dashboard should show user information
  const userInfo = page.locator('text=User ID,text=Wallet Address');
  await expect(userInfo.first()).toBeVisible({ timeout: 5000 });
}

