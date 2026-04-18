import { test, expect } from '@playwright/test';

test.describe('Zukan v2 (図鑑)', () => {
  test('displays at least 113 v2.1 mushrooms on default tab', async ({ page }) => {
    await page.goto('/zukan');
    await expect(page.getByRole('heading', { name: 'キノコ図鑑' }).first()).toBeVisible();
    const cards = page.locator('a[href^="/zukan/"]:not([href="/zukan"])');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(113);
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
    await expect(page.getByText('ベニテングタケ').first()).toBeVisible();
    await expect(page.getByText('Amanita muscaria').first()).toBeVisible();
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
    await expect(page.getByRole('heading', { name: 'キノコ図鑑' }).first()).toBeVisible();
  });

  test('back button on detail page returns to list', async ({ page }) => {
    await page.goto('/zukan');
    await page.click('a[href="/zukan/amanita_muscaria"]');
    await expect(page.getByText('Amanita muscaria').first()).toBeVisible();
    await page.click('button[aria-label="戻る"]');
    await expect(page.getByRole('heading', { name: 'キノコ図鑑' }).first()).toBeVisible();
  });
});

// NOTE: Phase 15 で簡易識別を復活させたため、旧 Phase 13-F の「準備中」表示テストは廃止。
// 新仕様の spot check は e2e/phase15-simple-identify.spec.ts を参照。

test.describe('Settings お知らせ section', () => {
  test('お知らせ section renders v2.0 + v2.1 release notices', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByText('お知らせ')).toBeVisible();
    await expect(page.getByText('v2.1 — 収録種を 60 → 113 に拡充')).toBeVisible();
    await expect(page.getByText('v2.0 — データ刷新')).toBeVisible();
  });
});

test.describe('Zukan v2.1 (tier1 新規種)', () => {
  test('tier1 新規種 (ホンシメジ) が表示される', async ({ page }) => {
    await page.goto('/zukan/lyophyllum_shimeji');
    await expect(page.getByText('ホンシメジ').first()).toBeVisible();
    await expect(page.getByText('Lyophyllum shimeji').first()).toBeVisible();
  });

  test('safety=unknown 種 (ビョウタケ) も表示される', async ({ page }) => {
    await page.goto('/zukan/calycina_citrina');
    await expect(page.getByText('ビョウタケ').first()).toBeVisible();
  });

  test('unknown バッジが safety フィルタに存在する', async ({ page }) => {
    await page.goto('/zukan');
    await page.click('button:has-text("もっと絞り込む")');
    await expect(page.getByRole('button', { name: '不明' })).toBeVisible();
  });
});
