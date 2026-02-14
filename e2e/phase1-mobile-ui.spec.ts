import { expect, test } from '@playwright/test';

const baseUrl = process.env.E2E_BASE_URL ?? 'https://blaue-magiergilde.test';
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const mobileViewport = { width: 390, height: 844 };

const login = async (page: Parameters<Parameters<typeof test>[1]>[0]['page']) => {
  await page.goto(`${baseUrl}/login`);
  await page.locator('input[type="email"]').first().fill(email ?? '');
  await page.locator('input[type="password"]').first().fill(password ?? '');
  await page.getByRole('button', { name: /login/i }).first().click();
  await expect(page).not.toHaveURL(/\/login(?:\?.*)?$/);
};

test.describe('Phase 1 mobile UX checks', () => {
  test.use({
    viewport: mobileViewport,
    ignoreHTTPSErrors: true,
  });

  test.skip(!email || !password, 'Set E2E_EMAIL and E2E_PASSWORD to run authenticated UI checks.');

  test('keeps modal primary action visible on character creation', async ({ page }) => {
    await login(page);
    await page.goto(`${baseUrl}/characters`);

    const createButton = page.getByRole('button', { name: /add character|create character/i }).first();
    await expect(createButton).toBeVisible();
    await createButton.click();

    const saveButton = page.getByRole('button', { name: /^save$/i }).first();
    await expect(saveButton).toBeVisible();

    const box = await saveButton.boundingBox();
    expect(box).not.toBeNull();
    expect((box?.y ?? 99999) + (box?.height ?? 0)).toBeLessThanOrEqual(mobileViewport.height + 2);
  });

  test('avoids horizontal overflow on character detail and keeps actions accessible', async ({ page }) => {
    await login(page);
    await page.goto(`${baseUrl}/characters`);

    const detailsButton = page.getByRole('link', { name: /details/i }).or(page.getByRole('button', { name: /details/i })).first();
    await expect(detailsButton).toBeVisible();
    await detailsButton.click();
    await expect(page).toHaveURL(/\/characters\/\d+/);
    await expect(page.getByRole('heading', { name: /details/i }).first()).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 2;
    });
    expect(hasHorizontalOverflow).toBeFalsy();
  });

  test('keeps modal primary action visible on game creation', async ({ page }) => {
    await login(page);
    await page.goto(`${baseUrl}/game-master-log`);

    const createButton = page.getByRole('button', { name: /create new game|add game/i }).first();
    await expect(createButton).toBeVisible();
    await createButton.click();

    const saveButton = page.getByRole('button', { name: /^save$/i }).first();
    await expect(saveButton).toBeVisible();

    const box = await saveButton.boundingBox();
    expect(box).not.toBeNull();
    expect((box?.y ?? 99999) + (box?.height ?? 0)).toBeLessThanOrEqual(mobileViewport.height + 2);
  });
});

