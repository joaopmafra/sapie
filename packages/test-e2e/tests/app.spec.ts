import { test, expect } from '@playwright/test';
import {takeScreenshot} from "./helpers/test-utils";

const screenshotName = 'health-status-failure';

test.describe('Sapie App Integration', () => {
  test('should redirect to login for protected home page', async ({ page }, testInfo) => {
    await page.goto('/');

    try {
      // Should be redirected to login page since home is protected
      await expect(page).toHaveURL('/login');
      
      // Should show login page content
      await expect(page.getByText('Welcome to Sapie')).toBeVisible();
      await expect(page.getByText('Sign in to your account or create a new one')).toBeVisible();

    } catch (error) {
      const screenshot = await page.screenshot();
      await testInfo.attach('screenshot-on-failure', { body: screenshot, contentType: 'image/png' });
      await takeScreenshot(page, screenshotName);
      throw error;
    }
  });

  test('should handle protected route access consistently', async ({ page }) => {
    // Try to access protected route
    await page.goto('/');

    // Should consistently redirect to login
    await expect(page).toHaveURL('/login');
    
    // Should show login page elements
    await expect(page.getByText('Welcome to Sapie')).toBeVisible();
    
    // Try to access again to test consistency
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });
});
