import { test, expect } from '@playwright/test';
import {takeScreenshot} from "./helpers/test-utils";

const screenshotName = 'health-status-failure';

test.describe('Sapie App Integration', () => {
  test('should display API health status', async ({ page }, testInfo) => {
    await page.goto('/');

    try {
      // Wait for the API health status to load
      await expect(page.getByTestId('api-health-status')).toBeVisible();

      // Check that the health status is ok
      const healthStatus = page.getByTestId('api-health-status');
      const statusText = await healthStatus.innerText();
      const statusObject = JSON.parse(statusText);
      expect(statusObject.status).toBe('ok');

    } catch (error) {
      const screenshot = await page.screenshot();
      await testInfo.attach('screenshot-on-failure', { body: screenshot, contentType: 'image/png' });
      await takeScreenshot(page, screenshotName);
      throw error;
    }
  });

  test('should handle API error gracefully', async ({ page }) => {
    // Mock the API to return an error - use a pattern that matches the full URL
    await page.route('**/api/health', route => {
      route.abort('failed');
    });

    await page.goto('/');

    // Verify error handling
    const healthStatus = page.getByTestId('api-health-status');
    const statusText = await healthStatus.innerText();
    expect(statusText).toBe('Error fetching health status');
  });
});
