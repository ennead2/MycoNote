// e2e/phase5-export-import.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Phase 5a: エクスポート/インポート', () => {
  test('設定画面にデータ管理セクションが表示される', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByText('データ管理')).toBeVisible();
    await expect(page.getByRole('button', { name: /エクスポート/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /インポート/ })).toBeVisible();
  });

  test('写真を含めるチェックボックスが表示される', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByLabel(/写真を含める/)).toBeVisible();
    await expect(page.getByLabel(/写真を含める/)).toBeChecked();
  });

  test('エクスポートボタンをクリックするとダウンロードが開始される', async ({ page }) => {
    await page.goto('/settings');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /エクスポート/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/myconote-backup-\d{4}-\d{2}-\d{2}\.json/);
  });

  test('不正なファイルをインポートするとエラーが表示される', async ({ page }) => {
    await page.goto('/settings');
    const fileInput = page.locator('input[type="file"][accept=".json"]');
    const buffer = Buffer.from('invalid json content');
    await fileInput.setInputFiles({
      name: 'bad-file.json',
      mimeType: 'application/json',
      buffer,
    });
    await expect(page.getByText(/ファイル形式が不正です/)).toBeVisible();
  });
});
