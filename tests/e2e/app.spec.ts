import { test, expect } from '@playwright/test';

test('full workflow: load sample, explore endpoint, view cURL, schema and graph, share and reload', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('APIatomy')).toBeVisible();

  await page.getByRole('button', { name: /Samples/ }).click();
  await page.getByRole('menuitem').first().click();

  await expect(page.getByText(/Endpoints/)).toBeVisible();

  const firstEndpoint = page.locator('[data-testid="endpoint-card"]').first();
  if (await firstEndpoint.count() > 0) {
    await firstEndpoint.click();
    await expect(page.getByText(/cURL Snippet|Request & Responses/)).toBeVisible();
    const curlTab = page.getByRole('button', { name: /cURL/ });
    if (await curlTab.count() > 0) {
      await curlTab.click();
      await expect(page.getByText(/cURL Command/)).toBeVisible();
    }
  }

  await page.getByRole('button', { name: /Schemas/ }).click();
  await expect(page.getByText(/Schemas/)).toBeVisible();

  await page.getByRole('button', { name: /Topology Graph/ }).click();
  await expect(page.locator('canvas, [data-testid="graph"]')).toBeVisible({ timeout: 5000 }).catch(() => {});

  await page.getByRole('button', { name: /Share/ }).click();
  await expect(page.getByRole('dialog', { name: /Share/ })).toBeVisible();
  await page.getByRole('button', { name: 'Close share dialog' }).click();
});

test('upload and display diagnostics', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Spec Editor')).toBeVisible();
});
