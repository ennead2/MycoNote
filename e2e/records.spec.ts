import { test, expect } from '@playwright/test';

test.describe('Records (採取記録)', () => {
  test('shows empty state initially', async ({ page }) => {
    await page.goto('/records');
    await expect(page.getByText('採取記録がありません')).toBeVisible();
  });

  test('navigates to new record form', async ({ page }) => {
    await page.goto('/records');
    await page.click('text=新規記録');
    await expect(page.getByText('日時')).toBeVisible();
    await expect(page.getByText('場所')).toBeVisible();
    await expect(page.getByText('保存')).toBeVisible();
  });

  test('creates a new record and shows in list', async ({ page }) => {
    await page.goto('/records/new');

    // Select mushroom by ID (option value)
    await page.selectOption('#mushroom-select', 'matsutake');

    // Fill location description
    await page.fill('#location-description', 'テスト場所');

    // Fill lat/lng by aria-label
    await page.fill('[aria-label="緯度"]', '35.6762');
    await page.fill('[aria-label="経度"]', '139.6503');

    // Save
    await page.click('button[type="submit"]');

    // Should redirect to list and show the record
    await expect(page).toHaveURL('/records');
    await expect(page.getByText('マツタケ')).toBeVisible();
    await expect(page.getByText('テスト場所')).toBeVisible();
  });

  test('view toggle between list and map works', async ({ page }) => {
    await page.goto('/records');
    await page.click('button:has-text("地図")');
    await page.click('button:has-text("リスト")');
  });
});
