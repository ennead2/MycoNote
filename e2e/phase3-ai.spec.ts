import { test, expect } from '@playwright/test';

test.describe('Phase 3: AI連携', () => {
  test.describe('設定画面 — APIキー管理', () => {
    test('APIキー入力欄が表示される', async ({ page }) => {
      await page.goto('/settings');
      await expect(page.getByText('AI機能（Claude API）')).toBeVisible();
      await expect(page.getByPlaceholder('sk-ant-...')).toBeVisible();
    });

    test('APIキーを入力して保存ボタンが有効になる', async ({ page }) => {
      await page.goto('/settings');
      const input = page.getByPlaceholder('sk-ant-...');
      await input.click();
      await input.fill('sk-ant-test-key-12345');
      await expect(page.getByRole('button', { name: '保存' })).toBeEnabled();
    });

    test('Anthropic Consoleリンクが表示される', async ({ page }) => {
      await page.goto('/settings');
      await expect(page.getByText('Anthropic ConsoleでAPIキーを取得')).toBeVisible();
    });
  });

  test.describe('識別モード選択画面', () => {
    test('詳細識別カードと簡易識別カードが表示される', async ({ page }) => {
      await page.goto('/identify');
      await expect(page.getByText('詳細識別')).toBeVisible();
      await expect(page.getByText('簡易識別')).toBeVisible();
    });

    // Phase 15 で簡易識別が復活したため旧「Phase 4 で追加予定」テストは廃止。
    // 新仕様の確認は e2e/phase15-simple-identify.spec.ts を参照。

    test('安全注意書きが表示される', async ({ page }) => {
      await page.goto('/identify');
      // Phase 9 で文言を「どちらの識別も参考情報です」に更新済み
      await expect(page.getByText(/どちらの識別も参考情報です/)).toBeVisible();
    });

    test('APIキー未設定時に警告表示', async ({ page }) => {
      await page.goto('/identify');
      await expect(page.getByText(/APIキーを設定してください/)).toBeVisible();
    });
  });

  test.describe('詳細識別画面', () => {
    test('APIキー未設定で設定画面にリダイレクト', async ({ page }) => {
      await page.goto('/identify/detail');
      await page.waitForURL('**/settings');
      await expect(page).toHaveURL(/\/settings/);
    });

    test('APIキー設定済みで識別画面が表示される', async ({ page }) => {
      await page.goto('/settings');
      await page.evaluate(() => {
        localStorage.setItem('anthropic_api_key', 'sk-ant-test-key');
      });
      await page.goto('/identify/detail');
      await expect(page.getByText(/AI推定です/)).toBeVisible();
      await expect(page.getByRole('heading', { name: '写真を追加' })).toBeVisible();
      await expect(page.getByRole('button', { name: /識別を開始/ })).toBeDisabled();
    });
  });

  test.describe('採取計画画面', () => {
    test('APIキー未設定でAPIキー案内が表示される', async ({ page }) => {
      await page.goto('/plan');
      await expect(page.getByText(/APIキーを設定すると/)).toBeVisible();
    });

    test('APIキー設定済みでフォームが表示される', async ({ page }) => {
      await page.goto('/settings');
      await page.evaluate(() => {
        localStorage.setItem('anthropic_api_key', 'sk-ant-test-key');
      });
      await page.goto('/plan');
      await expect(page.getByText('予定日')).toBeVisible();
      await expect(page.getByText('場所')).toBeVisible();
      await expect(page.getByText('経験レベル')).toBeVisible();
      await expect(page.getByRole('button', { name: /計画を相談する/ })).toBeVisible();
    });

    test('履歴ボタンで履歴画面に切り替わる', async ({ page }) => {
      await page.goto('/settings');
      await page.evaluate(() => {
        localStorage.setItem('anthropic_api_key', 'sk-ant-test-key');
      });
      await page.goto('/plan');
      await page.getByText('履歴').click();
      await expect(page.getByRole('heading', { name: 'チャット履歴' })).toBeVisible();
      await expect(page.getByText(/チャット履歴がありません/)).toBeVisible();
    });
  });
});
