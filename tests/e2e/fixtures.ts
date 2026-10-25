import { test as base, expect, Page } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      localStorage.setItem('apiatomy_onboarding_seen', '1');
      localStorage.setItem('apiatomy_theme', 'light');
    });
    await use(page);
  },
});
export { expect };

export async function selectView(page: Page, name: RegExp) {
  const mobile = page.locator('[aria-controls="mobile-nav-menu"]');
  if (await mobile.isVisible()) {
    await mobile.click();
    await page.getByRole('menuitem', { name }).click();
  } else {
    await page.getByRole('button', { name }).click();
  }
}

export async function selectSchema(page: Page, name: string | RegExp) {
  const back = page.getByRole('button', { name: 'Back to schemas', exact: true });
  if (await back.isVisible()) await back.click();
  await page.getByRole('button', { name, exact: typeof name === 'string' }).click();
}
