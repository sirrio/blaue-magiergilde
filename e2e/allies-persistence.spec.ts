import { expect, test, type Page } from '@playwright/test';

const baseUrl = process.env.E2E_BASE_URL ?? 'https://blaue-magiergilde.test';
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

const login = async (page: Page) => {
  await page.goto(`${baseUrl}/login`);
  await page.locator('input[type="email"]').first().fill(email ?? '');
  await page.locator('input[type="password"]').first().fill(password ?? '');
  await page.getByRole('button', { name: /login/i }).first().click();
  await expect(page).not.toHaveURL(/\/login(?:\?.*)?$/);
};

const openAlliesModal = async (page: Page) => {
  await page.goto(`${baseUrl}/characters`);
  const manageAlliesButtons = page.getByRole('button', { name: /manage allies/i });
  test.skip((await manageAlliesButtons.count()) === 0, 'Need at least one character with allies actions.');
  await manageAlliesButtons.first().click();
  await expect(page.getByText('Manage Allies')).toBeVisible();
};

test.describe('Allies persistence regression', () => {
  test.use({
    ignoreHTTPSErrors: true,
  });

  test.skip(!email || !password, 'Set E2E_EMAIL and E2E_PASSWORD for authenticated ally checks.');

  test('saves and removes an ally through the modal', async ({ page }) => {
    await login(page);
    await openAlliesModal(page);

    const allyName = `PW Ally ${Date.now()}`;

    await page.getByRole('button', { name: /add ally/i }).click();
    await page.getByPlaceholder('Name').fill(allyName);
    await page.getByRole('button', { name: /^save$/i }).click();

    const allyRow = page.locator('button').filter({ hasText: allyName }).first();
    await expect(allyRow).toBeVisible();

    await allyRow.click();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /remove/i }).click();

    await expect(page.locator('button').filter({ hasText: allyName })).toHaveCount(0);
  });

  test('does not show a phantom ally when save fails offline', async ({ context, page }) => {
    await login(page);
    await openAlliesModal(page);

    const allyName = `PW Offline Ally ${Date.now()}`;

    await page.getByRole('button', { name: /add ally/i }).click();
    await page.getByPlaceholder('Name').fill(allyName);

    await context.setOffline(true);
    await page.getByRole('button', { name: /^save$/i }).click();
    await page.waitForTimeout(1200);
    await context.setOffline(false);

    await expect(page.getByPlaceholder('Name')).toHaveValue(allyName);
    await expect(page.locator('button').filter({ hasText: allyName })).toHaveCount(0);
  });
});
