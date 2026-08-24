import { test, expect } from '@playwright/test';

test('full workflow: load sample, explore endpoint, view cURL, schema and graph, share and reload', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('APIatomy')).toBeVisible();

  await page.getByRole('button', { name: /Samples/ }).click();
  await page.getByRole('menuitem').first().click();

  await expect(page.getByText(/Endpoints/)).toBeVisible();

  const cards = page.locator('[data-testid="endpoint-card"]');
  await expect(cards).not.toHaveCount(0);
  await cards.first().click();

  await expect(page.getByText(/Request & Responses/)).toBeVisible();
  await page.getByRole('button', { name: /cURL Snippet/ }).click();
  await expect(page.getByText(/cURL Command/)).toBeVisible();

  await page.getByRole('button', { name: /^Schemas/ }).click();
  await expect(page.getByRole('button', { name: /Schemas/ }).first()).toBeVisible();

  await page.getByRole('button', { name: /Topology Graph/ }).click();
  await expect(page.locator('[data-testid="graph"]')).toBeVisible({ timeout: 8000 });

  await page.getByRole('button', { name: /^Share$/ }).click();
  await expect(page.getByRole('dialog', { name: /Share/ })).toBeVisible();
  await page.getByRole('button', { name: 'Close share dialog' }).click();
  await expect(page.getByRole('dialog', { name: /Share/ })).toBeHidden();
});

test('upload and display diagnostics', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Spec Editor')).toBeVisible();

  const brokenYaml = `openapi: 3.0.0
info:
  title: Broken
  version: 1.0.0
paths:
  /test:
    get:
      responses:
        '200':
          description: ok
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Missing'
`;

  await page.locator('#spec-upload-input').setInputFiles({
    name: 'broken.yaml',
    mimeType: 'text/yaml',
    buffer: Buffer.from(brokenYaml),
  });

  await expect(page.getByText('Diagnostics')).toBeVisible();
  await page.getByRole('button', { name: /Diagnostics/ }).click();
  await expect(page.getByText(/Unresolved reference|Missing|Missing schema/i).first()).toBeVisible({ timeout: 5000 });
});
