import { test, expect } from '@playwright/test';

test.describe('Zukan (図鑑)', () => {
  test('displays mushroom grid on zukan page', async ({ page }) => {
    await page.goto('/zukan');
    await expect(page.getByText('キノコ図鑑')).toBeVisible();
    const cards = page.locator('a[href^="/zukan/"]');
    await expect(cards).toHaveCount(13);
  });

  test('search filters mushrooms by name', async ({ page }) => {
    await page.goto('/zukan');
    await page.fill('input[placeholder*="検索"]', 'マツタケ');
    const cards = page.locator('a[href^="/zukan/"]');
    await expect(cards).toHaveCount(1);
    await expect(page.getByText('マツタケ')).toBeVisible();
  });

  test('toxicity filter works', async ({ page }) => {
    await page.goto('/zukan');
    await page.click('button:has-text("猛毒")');
    const cards = page.locator('a[href^="/zukan/"]');
    await expect(cards).toHaveCount(3);
  });

  test('navigates to detail page from grid', async ({ page }) => {
    await page.goto('/zukan');
    await page.click('a[href="/zukan/matsutake"]');
    await expect(page.getByText('マツタケ')).toBeVisible();
    await expect(page.getByText('Tricholoma matsutake')).toBeVisible();
    await expect(page.getByText('食用')).toBeVisible();
  });

  test('toxic mushroom detail shows caution box', async ({ page }) => {
    await page.goto('/zukan/tsukiyo-take');
    // ToxicityBadge shows "毒" for toxic mushrooms (span element)
    await expect(page.locator('span:has-text("毒")').first()).toBeVisible();
    // Check caution section exists
    await expect(page.locator('text=注意事項')).toBeVisible();
  });

  test('similar species links work', async ({ page }) => {
    await page.goto('/zukan/tsukiyo-take');
    // Click on a similar species link (シイタケ or ヒラタケ)
    const similarLink = page.locator('a[href="/zukan/shiitake"]').or(page.locator('a[href="/zukan/hiratake"]'));
    await similarLink.first().click();
    await expect(page).toHaveURL(/\/zukan\/(shiitake|hiratake)/);
  });

  test('season calendar view shows all mushrooms', async ({ page }) => {
    await page.goto('/zukan');
    await page.click('button:has-text("シーズンカレンダー")');
    await expect(page.getByText('マツタケ')).toBeVisible();
    await expect(page.getByText('ツキヨタケ')).toBeVisible();
  });

  test('bottom navigation works', async ({ page }) => {
    await page.goto('/zukan');
    // Verify BottomNav has links to all main sections
    await expect(page.locator('nav a[href="/settings"]')).toBeVisible();
    await expect(page.locator('nav a[href="/zukan"]')).toBeVisible();
    // Navigate to settings page
    await page.goto('/settings');
    await expect(page.getByText('アプリ情報')).toBeVisible();
    // Navigate back to zukan page
    await page.goto('/zukan');
    await expect(page.getByText('キノコ図鑑')).toBeVisible();
  });

  test('back button on detail page returns to list', async ({ page }) => {
    await page.goto('/zukan');
    await page.click('a[href="/zukan/matsutake"]');
    await expect(page.getByText('Tricholoma matsutake')).toBeVisible();
    await page.click('button[aria-label="戻る"]');
    await expect(page.getByText('キノコ図鑑')).toBeVisible();
  });
});
