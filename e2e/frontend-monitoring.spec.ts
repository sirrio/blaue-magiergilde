import { expect, test } from '@playwright/test'

const baseUrl = process.env.E2E_BASE_URL ?? 'https://blaue-magiergilde.test'

test.describe('Frontend monitoring smoke', () => {
  test.use({
    ignoreHTTPSErrors: true,
  })

  test('reports uncaught browser errors to the monitoring endpoint', async ({ page }) => {
    const payloads: Array<Record<string, unknown>> = []

    await page.route('**/monitoring/frontend-errors', async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>
      payloads.push(body)

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'reported' }),
      })
    })

    await page.goto(baseUrl)

    await page.evaluate(() => {
      setTimeout(() => {
        throw new Error('Playwright uncaught browser error')
      }, 0)
    })

    await expect
      .poll(() => payloads.find((payload) => payload.message === 'Playwright uncaught browser error'))
      .toMatchObject({
        source: 'window_error',
        message: 'Playwright uncaught browser error',
      })
  })

  test('reports fetch 500 responses to the monitoring endpoint', async ({ page }) => {
    const payloads: Array<Record<string, unknown>> = []

    await page.route('**/monitoring/frontend-errors', async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>
      payloads.push(body)

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'reported' }),
      })
    })

    await page.route('**/__playwright-monitoring-500', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'forced failure' }),
      })
    })

    await page.goto(baseUrl)

    await page.evaluate(async () => {
      await fetch('/__playwright-monitoring-500')
    })

    await expect
      .poll(() => payloads.find((payload) => payload.source === 'fetch_response_error'))
      .toMatchObject({
        source: 'fetch_response_error',
        message: 'Fetch request failed with 500',
      })
  })
})
