import { test, expect } from '@playwright/test';

/**
 * Phase 15 S5 軽量版 e2e: 簡易識別の主要フローを spot check。
 *
 * unit test で matcher ロジックは網羅済みのため、ここでは
 * 遷移・毒警告・月バッジ・候補タップなど実 DOM レベルの動作のみ検証する。
 */
test.describe('Phase 15 — 簡易識別 (統制形質ベース)', () => {
  test('識別モード画面に「簡易識別」カードが有効で、タップで遷移する', async ({ page }) => {
    await page.goto('/identify');
    // 「準備中」バッジが撤去されていること = aria-label が simpleTitle のみ
    const simpleCard = page.getByRole('button', { name: /簡易識別/ });
    await expect(simpleCard).toBeVisible();
    await expect(simpleCard).toBeEnabled();
    await simpleCard.click();
    await expect(page).toHaveURL(/\/identify\/simple$/);
    await expect(page.getByRole('heading', { name: /簡易識別/ }).first()).toBeVisible();
  });

  test('初期状態で全アコーディオン折り畳み → 要素を開いて値チップを選択', async ({ page }) => {
    await page.goto('/identify/simple');
    // 「傘」「柄」アコーディオンヘッダは aria-expanded="false"
    const pileus = page.locator('button[aria-expanded]').filter({ hasText: '傘' });
    await expect(pileus).toHaveAttribute('aria-expanded', 'false');
    // 開く
    await pileus.click();
    await expect(pileus).toHaveAttribute('aria-expanded', 'true');
    // 値チップ「赤」をタップ → aria-pressed=true
    const redChip = page.getByRole('button', { name: '赤', exact: true });
    await redChip.click();
    await expect(redChip).toHaveAttribute('aria-pressed', 'true');
  });

  test('タマゴタケ狙い条件でタマゴタケが候補に入り、毒警告バナーも表示', async ({ page }) => {
    await page.goto('/identify/simple');
    // 傘・赤
    await page.locator('button[aria-expanded]').filter({ hasText: '傘' }).click();
    await page.getByRole('button', { name: '赤', exact: true }).click();
    // 柄・白
    await page.locator('button[aria-expanded]').filter({ hasText: '柄' }).click();
    await page.getByRole('button', { name: '白', exact: true }).click();
    // つば・有
    await page.locator('button[aria-expanded]').filter({ hasText: 'つば' }).click();
    await page.getByRole('button', { name: '有', exact: true }).click();

    // 候補リストにタマゴタケが入る
    await expect(page.locator('a[href="/zukan/amanita_caesareoides"]')).toBeVisible();
    // 毒警告バナー（InfoBanner role="alert" + 毒キノコ含む label）
    const dangerBanner = page.getByRole('alert').filter({ hasText: /毒キノコ/ });
    await expect(dangerBanner).toBeVisible();
  });

  test('月指定で「旬」バッジが候補カードに表示される', async ({ page }) => {
    await page.goto('/identify/simple');
    // 10 月（タマゴタケ / ベニテングの旬）
    await page.getByRole('button', { name: '10月', exact: true }).click();
    // 結果セクションに「旬」バッジが少なくとも 1 つは見える
    const shunBadge = page.getByLabel('旬').first();
    await expect(shunBadge).toBeVisible();
  });

  test('候補カードをタップすると図鑑詳細に遷移する', async ({ page }) => {
    await page.goto('/identify/simple');
    // 傘・赤のみで候補出す
    await page.locator('button[aria-expanded]').filter({ hasText: '傘' }).click();
    await page.getByRole('button', { name: '赤', exact: true }).click();
    // 候補のいずれかリンクをクリック
    const firstCandidate = page.locator('a[href^="/zukan/"]').first();
    const href = await firstCandidate.getAttribute('href');
    expect(href).toBeTruthy();
    await firstCandidate.click();
    await expect(page).toHaveURL(new RegExp(href!.replace(/\//g, '\\/')));
  });

  test('「すべてクリア」で選択状態が初期化される', async ({ page }) => {
    await page.goto('/identify/simple');
    // 何か選ぶ
    await page.locator('button[aria-expanded]').filter({ hasText: '傘' }).click();
    await page.getByRole('button', { name: '赤', exact: true }).click();
    await page.getByRole('button', { name: '10月', exact: true }).click();
    // すべてクリア
    await page.getByRole('button', { name: 'すべてクリア' }).click();
    // 「まだ特徴が選ばれていません」プレースホルダに戻る
    await expect(page.getByText('まだ特徴が選ばれていません')).toBeVisible();
  });
});
