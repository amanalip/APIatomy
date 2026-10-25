import { test, expect, selectView } from './fixtures';

test('workspace saves reject collisions and deletion can be undone after reopening', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Workspaces', exact: true }).click();
  await page.getByLabel('New workspace name').fill('Protected');
  await page.getByRole('button', { name: 'Save as new' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved workspace' })).toBeVisible();
  await page.getByRole('button', { name: 'Save as new' }).click();
  await expect(page.getByRole('alert')).toContainText('already exists');
  await page.getByRole('button', { name: 'Update workspace', exact: true }).click();
  await expect(page.getByText(/Replace workspace "Protected"/)).toBeVisible();
  await page.getByRole('button', { name: 'Update existing', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Updated workspace' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open workspace', exact: true })).toHaveCount(0);
  await page.getByRole('dialog', { name: 'Workspaces' }).getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Workspaces', exact: true }).click();
  await page.getByRole('button', { name: 'Undo deletion of Protected', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open workspace', exact: true })).toHaveCount(1);
});

test('edits uploaded dependencies and retains changes through project recovery', async ({ page }) => {
  await page.goto('/');
  const root = 'openapi: 3.0.3\ninfo: {title: Editable files, version: "1"}\npaths: {}\ncomponents:\n  schemas:\n    Pet:\n      $ref: ./model.yaml#/Pet';
  await page.locator('#spec-upload-input').setInputFiles([
    { name: 'root.yaml', mimeType: 'text/yaml', buffer: Buffer.from(root) },
    { name: 'model.yaml', mimeType: 'text/yaml', buffer: Buffer.from('Pet: {type: string}') },
  ]);
  if (await page.getByRole('button', { name: 'Show editor pane' }).isVisible()) await page.getByRole('button', { name: 'Show editor pane' }).click();
  await page.getByRole('navigation', { name: 'Project files' }).getByRole('button', { name: 'model.yaml', exact: true }).click();
  await page.getByRole('textbox', { name: 'Specification editor' }).fill('Pet: {type: integer}');
  await expect(page.getByText('Draft stored locally', { exact: true })).toBeVisible();
  if (await page.getByRole('button', { name: 'Close editor', exact: true }).isVisible()) await page.getByRole('button', { name: 'Close editor', exact: true }).click();
  await selectView(page, /^Schemas/);
  await expect(page.getByRole('heading', { name: 'Pet', exact: true })).toBeVisible();
  await expect(page.getByText('integer', { exact: true }).first()).toBeVisible();
  page.on('dialog', (dialog) => dialog.accept());
  await page.reload();
  await selectView(page, /^Schemas/);
  await expect(page.getByRole('heading', { name: 'Pet', exact: true })).toBeVisible();
  await expect(page.getByText('integer', { exact: true }).first()).toBeVisible();
});
