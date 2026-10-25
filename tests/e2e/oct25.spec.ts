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

test('selects request payload media and explains unsupported generation', async ({ page }) => {
  await page.goto('/');
  const specification = JSON.stringify({ openapi: '3.0.3', info: { title: 'Payload selection', version: '1' }, paths: { '/payload': { post: { requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'string', readOnly: true }, name: { type: 'string' } } } }, 'application/xml': { schema: { type: 'object' } } } }, responses: { 200: { description: 'ok' } } } } } });
  await page.locator('#spec-upload-input').setInputFiles({ name: 'payload.json', mimeType: 'application/json', buffer: Buffer.from(specification) });
  await page.getByRole('button', { name: 'POST /payload', exact: true }).click();
  await page.getByRole('button', { name: 'cURL Snippet' }).click();
  const preview = page.getByRole('region', { name: 'Generated cURL command preview' });
  await expect(preview).not.toContainText('"id"');
  await page.getByLabel('Request content type', { exact: true }).selectOption('application/xml');
  await expect(preview).toContainText('Content-Type: application/xml');
  await expect(preview).toContainText('@payload.xml');
  await expect(page.getByText(/Automatic payload generation for application\/xml is unsupported/)).toBeVisible();
});

test('saves edited work before replacing it and can reopen the backup', async ({ page }) => {
  await page.goto('/');
  if (await page.getByRole('button', { name: 'Show editor pane' }).isVisible()) await page.getByRole('button', { name: 'Show editor pane' }).click();
  await page.getByRole('textbox', { name: 'Specification editor' }).fill('openapi: 3.0.3\ninfo: {title: Saved before replacement, version: "1"}\npaths: {}');
  await expect(page.locator('header')).toContainText('Saved before replacement');
  await page.getByRole('button', { name: 'Samples', exact: true }).click();
  await page.getByRole('menuitem').first().click();
  page.once('dialog', (dialog) => dialog.accept('Recovery backup'));
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await expect(page.getByRole('dialog', { name: 'Save your changes?' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Workspaces', exact: true }).click();
  await page.getByRole('button', { name: 'Open workspace' }).click();
  await expect(page.locator('header')).toContainText('Saved before replacement');
  await expect(page.getByText('No unsaved changes', { exact: true })).toBeVisible();
});

test('recovers edited multi-file projects with their dependency context', async ({ page }) => {
  await page.goto('/');
  const root = JSON.stringify({ openapi: '3.0.3', info: { title: 'Multi-file draft', version: '1' }, paths: { '/draft': { get: { responses: { 200: { description: 'ok', content: { 'application/json': { schema: { $ref: './models.yaml#/Pet' } } } } } } } } });
  await page.locator('#spec-upload-input').setInputFiles([
    { name: 'root.json', mimeType: 'application/json', buffer: Buffer.from(root) },
    { name: 'models.yaml', mimeType: 'text/yaml', buffer: Buffer.from('Pet:\n  type: object\n  properties:\n    recoveredField:\n      type: integer') },
  ]);
  await expect(page.locator('header')).toContainText('Multi-file draft');
  if (await page.getByRole('button', { name: 'Show editor pane' }).isVisible()) await page.getByRole('button', { name: 'Show editor pane' }).click();
  await page.getByRole('textbox', { name: 'Specification editor' }).fill(root.replace('Multi-file draft', 'Edited multi-file draft'));
  await expect(page.locator('header')).toContainText('Edited multi-file draft');
  await expect(page.getByText('Draft stored locally', { exact: true })).toBeVisible();
  page.on('dialog', (dialog) => dialog.accept());
  await page.reload();
  await expect(page.locator('header')).toContainText('Edited multi-file draft');
  await page.getByRole('button', { name: 'GET /draft', exact: true }).click();
  await expect(page.getByText('recoveredField', { exact: true })).toBeVisible();
  await expect(page.getByText(/Unresolved/)).toHaveCount(0);
});
