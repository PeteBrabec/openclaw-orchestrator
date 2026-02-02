import { test, expect } from '@playwright/test';

const HETZNER_TOKEN = process.env.HETZNER_TOKEN || 'ueoZKqtplTZiHq6NaCvJMzXxGoxiNp8EXF9MtmeFAnczOHY3PWpbQzjm6hsLouba';

test.describe('Hedz App - Full Flow', () => {

  test('Complete user journey', async ({ page }) => {
    // 1. Clear state and load app
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // 2. Verify welcome screen
    console.log('Step 1: Checking welcome screen...');
    await expect(page.getByText('Welcome to Hedz')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: '/tmp/step1-welcome.png' });
    
    // 3. Click Configure
    console.log('Step 2: Clicking Configure...');
    await page.getByText('Configure').last().click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/step2-settings.png' });
    
    // 4. Verify settings screen
    console.log('Step 3: Verifying settings screen...');
    await expect(page.getByText('Hetzner Cloud')).toBeVisible({ timeout: 5000 });
    
    // 5. Fill Hetzner token
    console.log('Step 4: Filling Hetzner token...');
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    console.log(`Found ${inputCount} input fields`);
    
    // Find the Hetzner token input (first one)
    const tokenInput = inputs.first();
    await tokenInput.click();
    await tokenInput.fill(HETZNER_TOKEN);
    await page.screenshot({ path: '/tmp/step3-filled.png' });
    
    // 6. Click Save
    console.log('Step 5: Clicking Save...');
    await page.getByText('Save').click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/step4-saved.png' });
    
    // 7. Verify credentials are saved
    console.log('Step 6: Verifying localStorage...');
    const stored = await page.evaluate(() => localStorage.getItem('hedz_credentials'));
    console.log('Stored:', stored ? 'YES' : 'NO');
    expect(stored).toBeTruthy();
    
    // 8. Verify we're on agent list (should see + button or empty state)
    console.log('Step 7: Verifying agent list...');
    await page.waitForTimeout(1000);
    const hasSpawnButton = await page.getByText('+').isVisible().catch(() => false);
    const hasEmptyState = await page.getByText('No agents yet').isVisible().catch(() => false);
    const hasAgents = await page.getByText('running').isVisible().catch(() => false);
    
    console.log(`Spawn button: ${hasSpawnButton}, Empty state: ${hasEmptyState}, Has agents: ${hasAgents}`);
    await page.screenshot({ path: '/tmp/step5-list.png' });
    
    expect(hasSpawnButton || hasEmptyState || hasAgents).toBeTruthy();
    
    // 9. Test persistence - reload and verify still logged in
    console.log('Step 8: Testing persistence...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Should NOT see welcome screen
    const welcomeVisible = await page.getByText('Welcome to Hedz').isVisible().catch(() => false);
    console.log(`Welcome visible after reload: ${welcomeVisible}`);
    expect(welcomeVisible).toBeFalsy();
    
    await page.screenshot({ path: '/tmp/step6-reloaded.png' });
    
    // 10. Open settings and verify token is there
    console.log('Step 9: Verifying settings persistence...');
    await page.getByText('⚙️').click();
    await page.waitForTimeout(500);
    
    const savedToken = await inputs.first().inputValue();
    console.log(`Token preserved: ${savedToken === HETZNER_TOKEN}`);
    expect(savedToken).toBe(HETZNER_TOKEN);
    
    await page.screenshot({ path: '/tmp/step7-settings-persisted.png' });
    
    console.log('✅ All steps passed!');
  });

  test('Spawn screen loads correctly', async ({ page }) => {
    // Setup: save credentials first
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('hedz_credentials', JSON.stringify({
        hetznerToken: token,
        anthropicKey: '',
        telegramBots: []
      }));
    }, HETZNER_TOKEN);
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Click spawn button
    console.log('Clicking spawn button...');
    await page.getByText('+').click();
    await page.waitForTimeout(500);
    
    // Verify spawn screen elements
    await expect(page.getByText('Agent Identity')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Infrastructure')).toBeVisible();
    await expect(page.getByText('Falkenstein')).toBeVisible();
    await expect(page.getByText('🚀 Spawn Agent')).toBeVisible();
    
    await page.screenshot({ path: '/tmp/spawn-screen.png' });
    console.log('✅ Spawn screen loaded correctly');
  });

});
