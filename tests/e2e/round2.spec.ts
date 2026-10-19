import { test, expect, selectView } from './fixtures';

const spec = (schemas: object) =>
  JSON.stringify({
    openapi: '3.1.0',
    info: { title: 'Import regression', version: '1' },
    paths: {},
    components: { schemas },
  });

test('project drops restore sidecars and standalone drops clear them', async ({ page }) => {
  await page.goto('/');
  const root = spec({ User: { $ref: './sidecar.json#/User' } });
  const project = JSON.stringify({
    apiatomyProject: 1,
    specText: root,
    rootFilename: 'root.json',
    files: {
      'sidecar.json': JSON.stringify({ User: { type: 'string', description: 'Restored sidecar' } }),
    },
  });
  const showEditor = page.getByRole('button', { name: 'Show editor pane' });
  if (await showEditor.isVisible()) await showEditor.click();
  const zone = page.getByRole('region', { name: 'Spec editor drop zone' });
  const drop = async (text: string, name: string) => {
    await zone.evaluate(
      (element, file) => {
        const transfer = new DataTransfer();
        transfer.items.add(new File([file.text], file.name, { type: 'application/json' }));
        element.dispatchEvent(
          new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer })
        );
      },
      { text, name }
    );
  };
  await drop(project, 'apiatomy-project.json');
  const closeEditor = page.getByRole('button', { name: 'Close editor' });
  if (await closeEditor.isVisible()) await closeEditor.click();
  await selectView(page, /^Schemas/);
  await expect(page.getByText('Restored sidecar', { exact: true }).first()).toBeVisible();
  if (await showEditor.isVisible()) await showEditor.click();
  await drop(root, 'standalone.json');
  if (await closeEditor.isVisible()) await closeEditor.click();
  await expect(page.getByText('Restored sidecar', { exact: true })).toHaveCount(0);
  await expect(
    page
      .getByText('External reference not resolved offline: ./sidecar.json#/User', { exact: true })
      .first()
  ).toBeVisible();
});

test('workspace rename collision preserves both saved projects', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Workspaces', exact: true }).click();
  for (const name of ['Source', 'Destination']) {
    page.once('dialog', (dialog) => dialog.accept(name));
    await page.getByRole('button', { name: 'Save locally' }).click();
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  }
  page.once('dialog', (dialog) => dialog.accept('Destination'));
  const source = page.getByText('Source', { exact: true }).locator('..').locator('..');
  await source.getByRole('button', { name: 'Rename', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByText('Source', { exact: true })).toBeVisible();
  await expect(page.getByText('Destination', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open workspace', exact: true })).toHaveCount(2);
});

test('mock preview honors supported constraints and exposes limitations', async ({ page }) => {
  await page.goto('/');
  await page.locator('#spec-upload-input').setInputFiles({
    name: 'mock.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      spec({
        Constrained: {
          type: 'array',
          minItems: 3,
          maxItems: 3,
          uniqueItems: true,
          items: { type: 'integer', minimum: 1, maximum: 3 },
        },
        Unsupported: { type: 'string', pattern: '^specific$' },
      })
    ),
  });
  await selectView(page, /^Schemas/);
  await page.getByRole('button', { name: /Constrained/ }).click();
  await page.getByRole('button', { name: 'Mock Data', exact: true }).click();
  const preview = page.getByRole('region', { name: 'Mock data preview in JSON format' });
  const value = JSON.parse((await preview.textContent())!);
  expect([...value].sort()).toEqual([1, 2, 3]);
  await page.getByRole('button', { name: /Unsupported/ }).click();
  await expect(page.getByText(/Example needs review:.*pattern constraints/)).toBeVisible();
});
