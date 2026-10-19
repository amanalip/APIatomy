import { test, expect, selectView } from './fixtures';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

async function assertAccessible(page: Page) {
  await page.addStyleTag({
    content: '*, *::before, *::after { transition: none !important; animation: none !important; }',
  });
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.map(({ id, nodes }) => ({
      id,
      nodes: nodes.map((node) => ({ target: node.target, message: node.failureSummary })),
    }))
  ).toEqual([]);
}

test('homepage has no detectable a11y violations', async ({ page }) => {
  await page.goto('/');
  await assertAccessible(page);
});

test('share dialog has no a11y violations', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Share$/ }).click();
  await expect(page.getByRole('dialog', { name: /Share/ })).toBeVisible();
  await assertAccessible(page);
});

test('URL import dialog has no a11y violations', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /URL/ }).click();
  await expect(page.getByRole('dialog', { name: /Load from URL/ })).toBeVisible();
  await assertAccessible(page);
});

test('command palette has no a11y violations', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('heading', { name: 'APIatomy', exact: true }).click();
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog', { name: /Command palette/ })).toBeVisible();
  await assertAccessible(page);
});

test('endpoint details has no a11y violations', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Samples/ }).click();
  await page.getByRole('menuitem').first().click();
  const cards = page.locator('[data-testid="endpoint-card"]');
  await expect(cards).not.toHaveCount(0);
  await cards.first().click();
  await expect(page.getByText(/Request & Responses/)).toBeVisible();
  await assertAccessible(page);
});

test('schema viewer has no a11y violations', async ({ page }) => {
  await page.goto('/');
  await selectView(page, /^Schemas/);
  await expect(page.getByPlaceholder(/Search schemas/)).toBeVisible();
  await assertAccessible(page);
});

test('graph has no a11y violations', async ({ page }) => {
  await page.goto('/');
  await selectView(page, /Topology Graph/);
  await expect(page.locator('[data-testid="graph"]')).toBeVisible({ timeout: 8000 });
  await assertAccessible(page);
});

test('dark mode has no a11y violations', async ({ page }) => {
  await page.goto('/');
  const toggle = page.getByRole('button', { name: /Switch to.*mode/ });
  await toggle.click();
  await assertAccessible(page);
});
