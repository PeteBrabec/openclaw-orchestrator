import { test, expect } from '@playwright/test';

// Test credentials
const HETZNER_TOKEN = process.env.HETZNER_TOKEN || 'ueoZKqtplTZiHq6NaCvJMzXxGoxiNp8EXF9MtmeFAnczOHY3PWpbQzjm6hsLouba';

test.describe('Hedz App', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('1. App loads successfully', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the app to render (looking for any text that indicates app loaded)
    // React Native Web uses div elements
    await page.waitForLoadState('networkidle');
    
    // Take screenshot for debugging
    await page.screenshot({ path: '/tmp/hedz-test-1.png' });
    
    // Check page has content (not just loading)
    const bodyContent = await page.locator('body').textContent();
    console.log('Page content:', bodyContent?.substring(0, 500));
    
    // Should have some text content
    expect(bodyContent?.length).toBeGreaterThan(10);
  });

  test('2. Welcome screen appears for new users', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for "Welcome" or "Hedz" text
    const hasWelcome = await page.getByText('Welcome').isVisible().catch(() => false);
    const hasHedz = await page.getByText('Hedz').isVisible().catch(() => false);
    const hasConfigure = await page.getByText('Configure').first().isVisible().catch(() => false);
    
    console.log('hasWelcome:', hasWelcome, 'hasHedz:', hasHedz, 'hasConfigure:', hasConfigure);
    
    // At least one should be visible
    expect(hasWelcome || hasHedz || hasConfigure).toBeTruthy();
  });

  test('3. Can save credentials', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Click on Configure text (first match)
    const configureButton = page.getByText('Configure').first();
    if (await configureButton.isVisible()) {
      await configureButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Look for input field
    const tokenInput = page.locator('input').first();
    if (await tokenInput.isVisible()) {
      await tokenInput.fill(HETZNER_TOKEN);
      
      // Look for Save button
      const saveButton = page.getByText('Save');
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(2000);
      }
    }
    
    // After save, check localStorage
    const stored = await page.evaluate(() => localStorage.getItem('hedz_credentials'));
    console.log('Stored credentials:', stored ? 'yes' : 'no');
    
    // Credentials should be stored
    expect(stored).toBeTruthy();
  });

});
