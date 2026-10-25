import { test, expect, selectView } from './fixtures';

test('recovers edited drafts and lets users cancel sample replacement', async ({ page }) => {
  await page.goto('/');
  const editorToggle = page.getByRole('button', { name: 'Show editor pane' });
  if (await editorToggle.isVisible()) await editorToggle.click();
  const editor = page.getByRole('textbox', { name: 'Specification editor' });
  await editor.fill('openapi: 3.0.3\ninfo: {title: Recovery check, version: "1"}\npaths: {}');
  await expect(page.getByText('Unsaved changes', { exact: true })).toBeVisible();
  await expect(page.getByText('Draft stored locally', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Samples', exact: true }).click();
  await page.getByRole('menuitem').first().click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(editor).toContainText('Recovery check');
  page.on('dialog', (dialog) => dialog.accept());
  await page.reload();
  await expect(page.locator('header')).toContainText('Recovery check');
  await expect(page.getByText('Unsaved changes', { exact: true })).toBeVisible();
});

test('rejects a non-API upload without replacing the current API', async ({ page }) => {
  await page.goto('/');
  await page.locator('#spec-upload-input').setInputFiles({ name: 'invalid.yaml', mimeType: 'text/yaml', buffer: Buffer.from('this is not an API') });
  await expect(page.getByText(/invalid.yaml: Specification root/)).toBeVisible();
  await expect(page.locator('header')).toContainText('Swagger Petstore');
  await expect(page.getByText('Spec loaded', { exact: true })).toHaveCount(0);
});
