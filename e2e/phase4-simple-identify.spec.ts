// e2e/phase4-simple-identify.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Phase 4: 簡易識別', () => {
  test.describe('識別モード選択画面', () => {
    test('簡易識別カードが有効でタップ可能', async ({ page }) => {
      await page.goto('/identify');
      const simpleCard = page.getByText('簡易識別').first();
      await expect(simpleCard).toBeVisible();
      await simpleCard.click();
      await expect(page).toHaveURL(/\/identify\/simple/);
    });

    test('オフライン対応タグが表示される', async ({ page }) => {
      await page.goto('/identify');
      await expect(page.getByText('オフライン対応')).toBeVisible();
    });
  });

  test.describe('簡易識別画面', () => {
    test('必須4項目が表示される', async ({ page }) => {
      await page.goto('/identify/simple');
      await expect(page.getByText('ヒダのタイプ')).toBeVisible();
      await expect(page.getByText('傘の色')).toBeVisible();
      await expect(page.getByText('傘の形')).toBeVisible();
      await expect(page.getByText('傘のサイズ')).toBeVisible();
    });

    test('検索ボタンは必須項目未選択時に無効', async ({ page }) => {
      await page.goto('/identify/simple');
      await expect(page.getByRole('button', { name: /候補を検索/ })).toBeDisabled();
    });

    test('注意書きが表示される', async ({ page }) => {
      await page.goto('/identify/simple');
      await expect(page.getByText(/簡易判定です/)).toBeVisible();
    });

    test('もっと絞り込むで追加項目が展開される', async ({ page }) => {
      await page.goto('/identify/simple');
      await expect(page.getByText('ヒダの付き方')).not.toBeVisible();
      await page.getByText(/もっと絞り込む/).click();
      await expect(page.getByText('ヒダの付き方')).toBeVisible();
      await expect(page.getByText('柄の色')).toBeVisible();
      await expect(page.getByText('変色反応')).toBeVisible();
    });

    test('特徴を選択して検索すると結果が表示される', async ({ page }) => {
      await page.goto('/identify/simple');
      // 必須項目を選択
      await page.getByText('ヒダ', { exact: true }).click();
      await page.getByText('茶', { exact: true }).click();
      await page.getByText('まんじゅう', { exact: true }).click();
      await page.getByText(/中 5〜15cm/).click();
      // 検索
      await page.getByRole('button', { name: /候補を検索/ }).click();
      // 結果が表示される
      await expect(page.getByText('識別結果')).toBeVisible();
      // 注意書きが結果画面にも表示
      await expect(page.getByText(/簡易判定です/)).toBeVisible();
    });

    test('結果画面から条件を変えるで入力に戻れる', async ({ page }) => {
      await page.goto('/identify/simple');
      await page.getByText('ヒダ', { exact: true }).click();
      await page.getByText('茶', { exact: true }).click();
      await page.getByText('まんじゅう', { exact: true }).click();
      await page.getByText(/中 5〜15cm/).click();
      await page.getByRole('button', { name: /候補を検索/ }).click();
      await page.getByText(/条件を変える/).click();
      await expect(page.getByText('ヒダのタイプ')).toBeVisible();
    });
  });
});
