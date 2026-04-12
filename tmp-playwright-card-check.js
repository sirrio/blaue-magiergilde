const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1400 } });
  await context.addCookies([{ name: 'laravel_session', value: 'eyJpdiI6Im83aDdlMTJBMGFqdXNqS1NmeGMzNUE9PSIsInZhbHVlIjoiZzlkc2o3MDJuQnRyOWNOcXVKZ3ZQcTNPaFBHSGlONU9ua2ZxclFQVnRvWTI5NXJEYVN1NzhLTlAxSmVHbytWWENzMFV3QjI0bHVMQTdjM0ZtY2ZaQ2c5RnYybk9YcXZ3YTdVWmt5NWJMZEtjbElETXlTTzRWTE1OdTdoWU1JWjgiLCJtYWMiOiIzMjYxMDViZWFiYTc4ZjMyMThhZWNiODAyY2Y2NGRhMjQwODhhZjlkNmM3NjBkNjI3NzRjYTMwZjZjM2ZhYTRmIiwidGFnIjoiIn0%3D', domain: 'blaue-magiergilde.test', path: '/', httpOnly: true, secure: true, sameSite: 'Lax' }]);
  const page = await context.newPage();
  await page.goto('https://blaue-magiergilde.test/characters', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'tmp-draft-card-check.png', fullPage: true });
  const cards = await page.locator('[data-slot="card"]').count();
  console.log(JSON.stringify({ url: page.url(), cards }));
  await browser.close();
})();
