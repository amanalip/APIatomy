import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('homepage has no detectable a11y violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('share dialog has no a11y violations', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Share$/ }).click();
  await expect(page.getByRole('dialog', { name: /Share/ })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('URL import dialog has no a11y violations', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /URL/ }).click();
  await expect(page.getByRole('dialog', { name: /Load from URL/ })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('command palette has no a11y violations', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog', { name: /Command palette/ })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('endpoint details has no a11y violations', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Samples/ }).click();
  await page.getByRole('menuitem').first().click();
  const cards = page.locator('[data-testid="endpoint-card"]');
  await expect(cards).not.toHaveCount(0);
  await cards.first().click();
  await expect(page.getByText(/Request & Responses/)).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('schema viewer has no a11y violations', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Schemas/ }).click();
  await expect(page.getByText(/Schemas/).first()).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('graph has no a11y violations', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Topology Graph/ }).click();
  await expect(page.locator('[data-testid="graph"]')).toBeVisible({ timeout: 8000 });
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('dark mode has no a11y violations', async ({ page }) => {
  await page.goto('/');
  const toggle = page.getByRole('button', { name: /Switch to.*mode/ });
  await toggle.click();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
