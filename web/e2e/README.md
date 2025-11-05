# E2E Tests with Playwright

This directory contains end-to-end tests for the Supply Chain Tracker application using Playwright.

## Test Structure

### Test Files
- `user-flow.spec.ts` - Tests user registration and wallet connection flows
- `token-flow.spec.ts` - Tests token creation, transfers, and navigation flows

### Helpers
- `helpers/wallet-mock.ts` - Utilities for mocking MetaMask wallet interactions

## Features

### Mock Wallet Integration
The tests use a mock Ethereum provider to simulate MetaMask interactions without requiring actual MetaMask installation. This allows tests to:
- Simulate wallet connection
- Mock transaction signing
- Test UI flows without blockchain interaction

### Test Accounts
Default test accounts from Anvil (Chain ID 31337):
- `ADMIN`: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
- `PRODUCER`: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
- `FACTORY`: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
- `RETAILER`: 0x90F79bf6EB2c4f870365E785982E1f101E93b906
- `CONSUMER`: 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65

## Running Tests

### Prerequisites
- Anvil running on localhost:8545 (optional, for full integration tests)
- Contract deployed to Anvil (optional)
- Next.js dev server (will start automatically via webServer config)

### Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run specific test file
npx playwright test e2e/user-flow.spec.ts

# Run with specific browser
npx playwright test --project=chromium
```

### Test Output
- HTML report: `npx playwright show-report`
- Screenshots: `test-results/` (on failure)
- Videos: `test-results/` (on failure, if configured)

## Test Coverage

### User Flow Tests
1. ✅ Wallet connection simulation
2. ✅ Registration form visibility
3. ✅ Connection status display
4. ✅ Dashboard navigation
5. ✅ User status display

### Token Flow Tests
1. ✅ Token creation page navigation
2. ✅ Token list page navigation
3. ✅ Transfers page navigation
4. ✅ Token details page
5. ✅ Dashboard navigation links

## Limitations

The current tests focus on UI interactions and navigation. Full blockchain integration tests would require:
- Actual MetaMask extension setup
- Multiple test accounts
- Real transaction signing
- Contract interaction verification

For full integration testing, see the admin test page at `/admin/tests` which provides programmatic testing of contract interactions.

## Writing New Tests

### Example Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { setupMockWallet, connectWallet, TEST_ACCOUNTS } from './helpers/wallet-mock';

test.describe('My Feature Test', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockWallet(page, TEST_ACCOUNTS.PRODUCER);
    await page.goto('/');
    await connectWallet(page);
  });

  test('should do something', async ({ page }) => {
    // Your test code here
    await expect(page.locator('text=Expected Text')).toBeVisible();
  });
});
```

### Best Practices
1. Always setup mock wallet before navigation
2. Use descriptive selectors (getByRole, getByText)
3. Add appropriate timeouts for async operations
4. Make tests resilient to different app states
5. Use helper functions for common operations

