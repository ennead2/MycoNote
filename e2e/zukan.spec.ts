import { test, expect } from '@playwright/test';

test.describe('Zukan v2 (図鑑)', () => {
  test('displays 60 v2 mushrooms on default tab', async ({ page }) => {
    await page.goto('/zukan');
    await expect(page.getByText('キノコ図鑑')).toBeVisible();
    const cards = page.locator('a[href^="/zukan/"]:not([href="/zukan"])');
    await expect(cards).toHaveCount(60);
  });

  test('search filters by Japanese name (ベニテング)', async ({ page }) => {
    await page.goto('/zukan');
    await page.fill('input[placeholder*="検索"]', 'ベニテング');
    await expect(page.locator('a[href="/zukan/amanita_muscaria"]')).toBeVisible();
  });

  test('safety filter (deadly only)', async ({ page }) => {
    await page.goto('/zukan');
    await page.click('button:has-text("猛毒")');
    const cards = page.locator('a[href^="/zukan/"]:not([href="/zukan"])');
    await expect(cards.first()).toBeVisible();
  });

  test('navigates to v2 detail page (Amanita muscaria)', async ({ page }) => {
    await page.goto('/zukan');
    await page.click('a[href="/zukan/amanita_muscaria"]');
    await expect(page.getByText('ベニテングタケ')).toBeVisible();
    await expect(page.getByText('Amanita muscaria')).toBeVisible();
    await expect(page.locator('span:has-text("毒")').first()).toBeVisible();
  });

  test('toxic species shows caution InfoBanner', async ({ page }) => {
    await page.goto('/zukan/amanita_muscaria');
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('detail page renders sources section with links', async ({ page }) => {
    await page.goto('/zukan/amanita_muscaria');
    await expect(page.getByText('出典・ライセンス')).toBeVisible();
    await expect(page.locator('a[href*="ja.wikipedia.org"]').first()).toBeVisible();
  });

  test('cap color filter is removed (Phase 13-F: traits not in v2)', async ({ page }) => {
    await page.goto('/zukan');
    await page.click('button:has-text("もっと絞り込む")');
    await expect(page.getByText('傘の色')).not.toBeVisible();
  });

  test('bottom navigation works', async ({ page }) => {
    await page.goto('/zukan');
    await expect(page.locator('nav a[href="/settings"]')).toBeVisible();
    await page.goto('/settings');
    await expect(page.getByText('アプリ情報')).toBeVisible();
    await page.goto('/zukan');
    await expect(page.getByText('キノコ図鑑')).toBeVisible();
  });

  test('back button on detail page returns to list', async ({ page }) => {
    await page.goto('/zukan');
    await page.click('a[href="/zukan/amanita_muscaria"]');
    await expect(page.getByText('Amanita muscaria')).toBeVisible();
    await page.click('button[aria-label="戻る"]');
    await expect(page.getByText('キノコ図鑑')).toBeVisible();
  });
});

test.describe('Identify menu (Phase 13-F: simple identify suspended)', () => {
  test('simple identify card shows 準備中 badge', async ({ page }) => {
    await page.goto('/identify');
    await expect(page.getByText('準備中')).toBeVisible();
  });

  test('simple identify page renders placeholder', async ({ page }) => {
    await page.goto('/identify/simple');
    await expect(page.getByText('準備中')).toBeVisible();
    await expect(page.getByRole('link', { name: /AI 識別を使う/ })).toBeVisible();
  });
});

test.describe('Settings お知らせ section', () => {
  test('お知らせ section renders v2 release notice', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByText('お知らせ')).toBeVisible();
    await expect(page.getByText('v2.0 — データ刷新')).toBeVisible();
  });
});
