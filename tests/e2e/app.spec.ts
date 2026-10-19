import { test, expect, selectView } from './fixtures';

test('full workflow: sample, endpoint, cURL, schema, graph, share and reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Samples/ }).click();
  await page.getByRole('menuitem').first().click();
  const cards = page.getByTestId('endpoint-card');
  await expect(cards.first()).toBeVisible();
  await cards.first().click();
  await page.getByRole('button', { name: 'cURL Snippet' }).click();
  await expect(page.getByText('cURL Command', { exact: true })).toBeVisible();
  await selectView(page, /^Schemas/);
  await expect(page.getByPlaceholder(/Search schemas/)).toBeVisible();
  await selectView(page, /Topology Graph/);
  await expect(page.getByTestId('graph')).toBeVisible();
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Share spec' });
  await dialog.getByLabel('Include current view and selection').check();
  const url = await dialog
    .getByRole('textbox', { name: 'Shareable URL', exact: true })
    .inputValue();
  expect(url).toContain('#spec=');
  await page.goto(url);
  await expect(page.getByTestId('graph')).toBeVisible();
});

test('upload and navigate diagnostics', async ({ page }) => {
  await page.goto('/');
  const broken = JSON.stringify({
    openapi: '3.0.0',
    info: { title: 'Broken', version: '1' },
    paths: {
      '/test': {
        get: {
          responses: {
            '200': {
              description: 'OK',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Missing' } } },
            },
          },
        },
      },
    },
  });
  await page.locator('#spec-upload-input').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from(broken),
  });
  await expect(page.getByRole('button', { name: 'GET /test', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Diagnostics/ }).click();
  const diagnostic = page.getByRole('button', { name: /Go to.*Missing/ }).first();
  await expect(diagnostic).toBeVisible();
  await diagnostic.click();
  await expect(page.locator('.cm-editor')).toBeVisible();
});

test('large endpoint lists retain access to the last page and reset after filtering', async ({
  page,
}) => {
  await page.goto('/');
  const paths = Object.fromEntries(
    Array.from({ length: 221 }, (_, i) => [
      `/endpoint/${i}`,
      { get: { tags: [`Tag${i % 12}`], responses: { '200': { description: 'OK' } } } },
    ])
  );
  await page.locator('#spec-upload-input').setInputFiles({
    name: 'large.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({ openapi: '3.0.0', info: { title: 'Large', version: '1' }, paths })
    ),
  });
  await expect(page.getByTestId('endpoint-card')).toHaveCount(100);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByTestId('endpoint-card')).toHaveCount(21);
  await expect(page.getByRole('button', { name: 'GET /endpoint/220', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search endpoints' }).fill('/endpoint/220');
  await expect(page.getByTestId('endpoint-card')).toHaveCount(1);
});

test('multi-file projects survive workspace saves, links, and downloaded share files', async ({
  page,
}) => {
  await page.goto('/');
  const root = JSON.stringify({
    openapi: '3.1.0',
    info: { title: 'Multi file', version: '1' },
    paths: {},
    components: { schemas: { User: { $ref: './user.yaml#/User' } } },
  });
  await page.locator('#spec-upload-input').setInputFiles([
    { name: 'root.json', mimeType: 'application/json', buffer: Buffer.from(root) },
    {
      name: 'user.yaml',
      mimeType: 'text/yaml',
      buffer: Buffer.from(
        'User:\n  type: object\n  properties:\n    address:\n      $ref: ./address.yaml#/Address'
      ),
    },
    {
      name: 'address.yaml',
      mimeType: 'text/yaml',
      buffer: Buffer.from('Address:\n  type: string\n  description: Persisted address'),
    },
  ]);
  await selectView(page, /^Schemas/);
  await expect(page.getByRole('heading', { name: 'User', exact: true })).toBeVisible();
  await expect(page.getByText('Persisted address', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Workspaces', exact: true }).click();
  page.once('dialog', (dialog) => dialog.accept('Multi file workspace'));
  await page.getByRole('button', { name: 'Save locally' }).click();
  await expect(page.getByText('Multi file workspace', { exact: true })).toBeVisible();
  await page
    .getByRole('dialog', { name: 'Workspaces' })
    .getByRole('button', { name: 'Close', exact: true })
    .click();
  await page.reload();
  await page.getByRole('button', { name: 'Workspaces', exact: true }).click();
  await page.getByRole('button', { name: 'Open workspace', exact: true }).click();
  await selectView(page, /^Schemas/);
  await expect(page.getByText('Persisted address', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Share spec' });
  await dialog.getByLabel('Include current view and selection').check();
  const url = await dialog
    .getByRole('textbox', { name: 'Shareable URL', exact: true })
    .inputValue();
  const downloadEvent = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download Share File' }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('apiatomy-project.json');
  const path = await download.path();
  await page.goto(url);
  await expect(page.getByText('Persisted address', { exact: true })).toBeVisible();
  await page.goto('/');
  await page.locator('#spec-upload-input').setInputFiles(path!);
  await selectView(page, /^Schemas/);
  await expect(page.getByText('Persisted address', { exact: true })).toBeVisible();
});
