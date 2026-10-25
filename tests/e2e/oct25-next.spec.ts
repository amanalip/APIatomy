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
