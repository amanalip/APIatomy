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

test('preserves comparison inputs across tabs and supports independent clearing', async ({ page }) => {
  await page.goto('/');
  await selectView(page, /^Diff$/);
  await page.getByRole('textbox', { name: 'Old specification', exact: true }).fill('openapi: 3.0.3\ninfo: {title: Baseline, version: "1"}\npaths: {}');
  await page.getByRole('textbox', { name: 'New specification', exact: true }).fill('openapi: 3.0.3\ninfo: {title: Independent, version: "2"}\npaths: {}');
  await selectView(page, /^Endpoints/);
  await selectView(page, /^Diff$/);
  await expect(page.getByRole('textbox', { name: 'Old specification', exact: true })).toHaveValue(/Baseline/);
  await expect(page.getByRole('textbox', { name: 'New specification', exact: true })).toHaveValue(/Independent/);
  await page.getByRole('button', { name: 'Clear old specification' }).click();
  await expect(page.getByRole('textbox', { name: 'Old specification', exact: true })).toHaveValue('');
  await expect(page.getByRole('textbox', { name: 'New specification', exact: true })).toHaveValue(/Independent/);
});

test('explains response changes and distinguishes an incomplete comparison', async ({ page }) => {
  const spec = (type: string) => JSON.stringify({ openapi: '3.0.3', info: { title: 'Prices', version: '1' }, paths: { '/price': { get: { responses: { 200: { description: 'ok', content: { 'application/json': { schema: { type } } } } } } } } });
  await page.goto('/');
  await selectView(page, /^Diff$/);
  await expect(page.getByText('Choose both specifications to compare.')).toBeVisible();
  await page.getByRole('textbox', { name: 'Old specification', exact: true }).fill(spec('number'));
  await page.getByRole('textbox', { name: 'New specification', exact: true }).fill(spec('string'));
  await page.getByText('get /price breaking', { exact: true }).click();
  await expect(page.getByText('responses[200].content[application/json].schema.type', { exact: true })).toBeVisible();
  await expect(page.getByText('Before', { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Breaking endpoint changes only' }).check();
  await expect(page.getByText('Changed (1)', { exact: true })).toBeVisible();
});
