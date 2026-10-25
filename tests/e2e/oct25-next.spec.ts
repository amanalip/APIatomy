import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, expect, selectView, selectSchema } from './fixtures';

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
  await selectSchema(page, 'Pet');
  await expect(page.getByRole('heading', { name: 'Pet', exact: true })).toBeVisible();
  await expect(page.getByText('integer', { exact: true }).first()).toBeVisible();
  page.on('dialog', (dialog) => dialog.accept());
  await page.reload();
  await selectView(page, /^Schemas/);
  await selectSchema(page, 'Pet');
  await expect(page.getByRole('heading', { name: 'Pet', exact: true })).toBeVisible();
  await expect(page.getByText('integer', { exact: true }).first()).toBeVisible();
});

test('explores outbound webhooks and callback destinations', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Samples', exact: true }).click();
  await page.getByRole('menuitem').filter({ hasText: 'Webhooks' }).click();
  await page.getByLabel('Operation kind', { exact: true }).selectOption('webhook');
  await expect(page.getByRole('button', { name: 'webhook POST orderShipped', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'webhook POST orderShipped', exact: true }).click();
  await expect(page.getByText('Outbound webhook', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close details', exact: true }).click();
  await page.getByLabel('Operation kind', { exact: true }).selectOption('callback');
  await page.getByRole('button', { name: 'callback POST {$request.body#/callbackUrl}', exact: true }).click();
  await expect(page.getByText('Destination: {$request.body#/callbackUrl}', { exact: true })).toBeVisible();
  await expect(page.getByText('Triggered by post_/subscriptions', { exact: true })).toBeVisible();
});

test('shows named examples beside response schemas and preserves falsy values', async ({ page }) => {
  await page.goto('/');
  const text = JSON.stringify({ openapi: '3.0.3', info: { title: 'Examples', version: '1' }, paths: { '/example': { get: { responses: { 200: { description: 'ok', content: { 'application/json': { schema: { type: 'boolean' }, examples: { disabled: { summary: 'Feature disabled', description: 'The documented false value', value: false }, zero: { value: 0 }, empty: { value: '' }, nil: { value: null } } } } } } } } } });
  await page.locator('#spec-upload-input').setInputFiles({ name: 'examples.json', mimeType: 'application/json', buffer: Buffer.from(text) });
  await page.getByRole('button', { name: 'GET /example', exact: true }).click();
  const payload = page.getByRole('region', { name: 'Response application/json', exact: true });
  await payload.getByRole('tab', { name: 'Examples', exact: true }).click();
  await expect(payload.getByText('Feature disabled', { exact: true })).toBeVisible();
  await expect(payload.getByLabel('Response application/json example value')).toHaveText('false');
  for (const [name, value] of [['zero', '0'], ['empty', '""'], ['nil', 'null']]) {
    await payload.getByLabel('Response application/json example', { exact: true }).selectOption('named:' + name);
    await expect(payload.getByLabel('Response application/json example value')).toHaveText(value);
  }
});

test('mobile schema Back retains search and comparison inputs stack', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Dedicated narrow-screen navigation regression');
  await page.goto('/');
  await selectView(page, /^Schemas/);
  await page.getByLabel('Search schemas', { exact: true }).fill('Pet');
  await page.getByRole('button', { name: 'Pet', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pet', exact: true })).toBeVisible();
  await expect(page.getByLabel('Search schemas', { exact: true })).toBeHidden();
  await page.getByRole('button', { name: 'Back to schemas' }).click();
  await expect(page.getByLabel('Search schemas', { exact: true })).toHaveValue('Pet');
  await expect(page.getByRole('button', { name: 'Pet', exact: true })).toBeFocused();
  await selectView(page, /^Diff$/);
  const oldInput = await page.getByRole('textbox', { name: 'Old specification', exact: true }).boundingBox();
  const newInput = await page.getByRole('textbox', { name: 'New specification', exact: true }).boundingBox();
  expect(newInput!.y).toBeGreaterThan(oldInput!.y + oldInput!.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('imports nested folders without flattening duplicate basenames', async ({ page }) => {
  await page.goto('/');
  const folderInput = page.locator('#project-folder-input');
  test.skip(!(await folderInput.evaluate((input) => input.hasAttribute('webkitdirectory'))), 'Browser uses the multi-file fallback');
  const directory = await mkdtemp(join(tmpdir(), 'apiatomy-folder-'));
  try {
    await mkdir(join(directory, 'a')); await mkdir(join(directory, 'b'));
    await writeFile(join(directory, 'root.json'), JSON.stringify({ openapi: '3.0.3', info: { title: 'Nested folder', version: '1' }, paths: {}, components: { schemas: { First: { $ref: './a/pet.yaml#/Pet' }, Second: { $ref: './b/pet.yaml#/Pet' } } } }));
    await writeFile(join(directory, 'a/pet.yaml'), 'Pet: {type: string}');
    await writeFile(join(directory, 'b/pet.yaml'), 'Pet: {type: boolean}');
    await writeFile(join(directory, 'notes.txt'), 'Ignore this unrelated file');
    await folderInput.setInputFiles(directory);
    await expect(page.locator('header')).toContainText('Nested folder');
    if (await page.getByRole('button', { name: 'Show editor pane' }).isVisible()) await page.getByRole('button', { name: 'Show editor pane' }).click();
    const files = page.getByRole('navigation', { name: 'Project files' });
    await expect(files.getByRole('button', { name: /a\/pet.yaml$/ })).toBeVisible();
    await expect(files.getByRole('button', { name: /b\/pet.yaml$/ })).toBeVisible();
    await expect(files.getByText('Root', { exact: true })).toBeVisible();
    if (await page.getByRole('button', { name: 'Close editor', exact: true }).isVisible()) await page.getByRole('button', { name: 'Close editor', exact: true }).click();
    await selectView(page, /^Schemas/);
    await selectSchema(page, 'Second');
    await expect(page.getByRole('heading', { name: 'Second', exact: true })).toBeVisible();
    await expect(page.getByText('boolean', { exact: true }).first()).toBeVisible();
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('mobile schema Back restores virtual list scroll position', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Dedicated narrow-screen scroll regression');
  await page.goto('/');
  const schemas = Object.fromEntries(Array.from({ length: 220 }, (_, index) => ['Schema' + String(index).padStart(3, '0'), { type: 'string' }]));
  await page.locator('#spec-upload-input').setInputFiles({ name: 'schemas.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ openapi: '3.0.3', info: { title: 'Large schemas', version: '1' }, paths: {}, components: { schemas } })) });
  await selectView(page, /^Schemas/);
  const scroller = page.locator('[data-virtual-scroll="true"]');
  await scroller.evaluate((element) => { element.scrollTop = 48 * 140; });
  const selected = page.getByRole('button', { name: 'Schema145', exact: true });
  await expect(selected).toBeVisible();
  await selected.scrollIntoViewIfNeeded();
  const before = await scroller.evaluate((element) => element.scrollTop);
  await selected.click();
  await expect(page.getByRole('heading', { name: 'Schema145', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to schemas' }).click();
  await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).toBeCloseTo(before, 0);
  await expect(selected).toBeFocused();
});
