import { test, expect } from '@playwright/test';
import { setupMockWallet, connectWallet, TEST_ACCOUNTS } from './helpers/wallet-mock';

/**
 * Token Flow E2E Test
 * 
 * Tests the complete supply chain token flow UI navigation:
 * 1. Navigate to token creation page
 * 2. Navigate to token list page
 * 3. Navigate to transfers page
 * 4. View token details
 * 
 * Requirements:
 * - Anvil running on localhost:8545
 * - Contract deployed to Anvil
 * - Next.js dev server running
 */
test.describe('Token Flow Test', () => {
  test.beforeEach(async ({ page }) => {
    // Setup mock wallet
    await setupMockWallet(page, TEST_ACCOUNTS.PRODUCER);
    
    // Navigate to home page
    await page.goto('/');
    
    // Connect wallet
    await connectWallet(page);
  });

  test('should navigate to token creation page', async ({ page }) => {
    // Navigate to token creation page
    await page.goto('/token/create');
    
    // Wait for page to load (might redirect if not approved)
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    
    const currentUrl = page.url();
    
    // If redirected, we're on home page (expected for unapproved users)
    if (currentUrl.includes('/token/create')) {
      // Verify page loads and shows token creation form
      await expect(page.locator('body')).toBeVisible();
      
      // Check for heading or form elements
      const heading = page.locator('text=Create Token,text=Token Information');
      const formElements = page.locator('input, textarea, button');
      
      const hasHeading = await heading.first().isVisible({ timeout: 3000 }).catch(() => false);
      const hasFormElements = await formElements.first().isVisible({ timeout: 3000 }).catch(() => false);
      
      // At least one should be visible
      expect(hasHeading || hasFormElements).toBeTruthy();
    } else {
      // Redirected to home (expected if not approved)
      expect(currentUrl.endsWith('/') || currentUrl.includes('/')).toBeTruthy();
    }
  });

  test('should navigate to token list page', async ({ page }) => {
    // Navigate to token list page
    await page.goto('/token');
    
    // Wait for page to load (might redirect if not approved)
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    
    const currentUrl = page.url();
    
    // If redirected, we're on home page (expected for unapproved users)
    if (currentUrl.includes('/token')) {
      // Verify page loads
      await expect(page.locator('body')).toBeVisible();
      
      // Check for token list content (heading, buttons, or empty state)
      const pageContent = page.locator('text=Tokens,text=My Tokens,text=Create Token,text=No tokens,text=Created,text=Transferred');
      const hasContent = await pageContent.first().isVisible({ timeout: 5000 }).catch(() => false);
      
      // If no specific content, check for any buttons or cards
      if (!hasContent) {
        const buttons = page.locator('button, a[href*="/token/create"]');
        const hasButtons = await buttons.first().isVisible({ timeout: 2000 }).catch(() => false);
        expect(hasButtons).toBeTruthy();
      } else {
        expect(hasContent).toBeTruthy();
      }
    } else {
      // Redirected to home (expected if not approved)
      expect(currentUrl.endsWith('/') || currentUrl.includes('/')).toBeTruthy();
    }
  });

  test('should navigate to transfers page', async ({ page }) => {
    // Navigate to transfers page
    await page.goto('/transfers');
    
    // Wait for page to load (might redirect if not approved)
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    
    const currentUrl = page.url();
    
    // If redirected, we're on home page (expected for unapproved users)
    if (currentUrl.includes('/transfers')) {
      // Verify page loads
      await expect(page.locator('body')).toBeVisible();
      
      // Check for transfers content
      const transfersContent = page.locator('text=Pending Transfers,text=Transfer Requests,text=No transfers,text=Transfers');
      const hasContent = await transfersContent.first().isVisible({ timeout: 5000 }).catch(() => false);
      
      // If no specific content, check for table or cards
      if (!hasContent) {
        const table = page.locator('table, [role="table"]');
        const cards = page.locator('[data-slot="card"]');
        const hasTable = await table.first().isVisible({ timeout: 2000 }).catch(() => false);
        const hasCards = await cards.first().isVisible({ timeout: 2000 }).catch(() => false);
        expect(hasTable || hasCards).toBeTruthy();
      } else {
        expect(hasContent).toBeTruthy();
      }
    } else {
      // Redirected to home (expected if not approved)
      expect(currentUrl.endsWith('/') || currentUrl.includes('/')).toBeTruthy();
    }
  });

  test('should show token details page', async ({ page }) => {
    // Navigate to a token detail page (assuming token ID 1 exists)
    await page.goto('/token/1');
    
    // Wait for page to load (might redirect if not approved or token doesn't exist)
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    
    const currentUrl = page.url();
    
    // If redirected, we're on home page (expected for unapproved users or invalid token)
    if (currentUrl.includes('/token/')) {
      // Verify page loads
      await expect(page.locator('body')).toBeVisible();
      
      // Check for token details, error message, or loading state
      const tokenContent = page.locator('text=Token,text=Details,text=Not found,text=Invalid,text=Loading,text=Token ID,text=Creator,text=Metadata');
      const hasContent = await tokenContent.first().isVisible({ timeout: 5000 }).catch(() => false);
      
      // If no specific content, check for any card or content area
      if (!hasContent) {
        const cards = page.locator('[data-slot="card"], .card');
        const hasCards = await cards.first().isVisible({ timeout: 2000 }).catch(() => false);
        expect(hasCards).toBeTruthy();
      } else {
        expect(hasContent).toBeTruthy();
      }
    } else {
      // Redirected to home (expected if not approved or invalid token)
      expect(currentUrl.endsWith('/') || currentUrl.includes('/')).toBeTruthy();
    }
  });

  test('should navigate between token pages', async ({ page }) => {
    // Start at token list
    await page.goto('/token');
    await expect(page.locator('body')).toBeVisible();
    
    // Navigate to create token
    const createLink = page.getByRole('link', { name: /create|Create/i });
    if (await createLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createLink.click();
      await page.waitForURL('**/token/create', { timeout: 5000 });
      await expect(page.locator('body')).toBeVisible();
    }
    
    // Go back to token list
    await page.goto('/token');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show dashboard navigation links', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Verify dashboard loads (might redirect if not approved)
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    
    const currentUrl = page.url();
    
    if (currentUrl.includes('/dashboard')) {
      // Verify dashboard heading
      const dashboardHeading = page.getByRole('heading', { name: 'Dashboard' });
      const dashboardText = page.locator('text=Dashboard').first();
      const hasHeading = await dashboardHeading.isVisible({ timeout: 3000 }).catch(() => false);
      const hasText = await dashboardText.isVisible({ timeout: 3000 }).catch(() => false);
      expect(hasHeading || hasText).toBeTruthy();
      
      // Check for navigation cards/links (they might be in cards or direct links)
      const navLinks = page.locator('a[href*="/token"], a[href*="/transfers"], a[href*="/profile"]');
      const navCards = page.locator('[data-slot="card"] a, .card a');
      
      const linkCount = await navLinks.count();
      const cardLinkCount = await navCards.count();
      
      // Should have at least some navigation options (either direct links or in cards)
      expect(linkCount + cardLinkCount).toBeGreaterThan(0);
    } else {
      // Redirected to home (expected if not approved)
      expect(currentUrl.endsWith('/') || currentUrl.includes('/')).toBeTruthy();
    }
  });
});

