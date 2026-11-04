'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium, devices } = require('playwright');

const server = http.createServer((req, res) => {
  const filename = path.basename(new URL(req.url, 'http://localhost').pathname);
  if (!/^bank-demo(?:-preview)?\.html$/.test(filename)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(fs.readFileSync(path.join(__dirname, filename)));
});

async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = process.env.CLAIR_DEMO_URL || `http://127.0.0.1:${server.address().port}/bank-demo-preview.html`;
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CLAIR_CHROME_PATH ? { executablePath: process.env.CLAIR_CHROME_PATH } : {}),
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  try {
    for (const width of [390, 320, 768, 1440]) {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
        viewport: { width, height: 844 },
      });
      const page = await context.newPage();
      const errors = [], externalRequests = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => {
        if (new URL(request.url()).origin !== new URL(url).origin) externalRequests.push(request.url());
      });
      await page.goto(url);
      assert.equal(await page.getByRole('button', { name: 'Connecter', exact: true }).count(), 2);
      await page.getByRole('button', { name: 'Connecter', exact: true }).first().click();
      assert.match(await page.locator('#connected-count').innerText(), /^1 banque/);
      await page.getByRole('button', { name: 'Connecter', exact: true }).click();
      assert.match(await page.locator('#connected-count').innerText(), /^2 banque/);
      await page.getByRole('button', { name: 'Simuler une synchronisation' }).click();
      assert.equal(await page.locator('#transactions .item').count(), 6);
      assert.match(await page.locator('#income').innerText(), /250,00/);
      assert.match(await page.locator('#expenses').innerText(), /60,49/);
      assert.match((await page.locator('#balance').innerText()).replace(/\s/g, ''), /2850,75/);
      await page.getByRole('button', { name: 'Simuler une synchronisation' }).click();
      assert.equal(await page.locator('#transactions .item').count(), 6);
      assert.match(await page.getByRole('status').innerText(), /^0 nouvelle/);
      await page.getByRole('link', { name: /Opérations/ }).click();
      assert.equal(await page.getByRole('heading', { name: 'Transactions simulées' }).count(), 1);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Horizontal overflow at ${width}px`);
      await page.getByRole('button', { name: 'Déconnecter', exact: true }).first().click();
      assert.equal(await page.locator('#transactions .item').count(), 2);
      assert.match(await page.locator('#income').innerText(), /0,00/);
      assert.match(await page.locator('#expenses').innerText(), /5,99/);
      await page.getByRole('button', { name: 'Réinitialiser la démo' }).click();
      assert.equal(await page.getByRole('button', { name: 'Connecter', exact: true }).count(), 2);
      assert.match(await page.locator('#transactions').innerText(), /Aucune transaction/);
      await page.reload();
      assert.match(await page.locator('#balance').innerText(), /0,00/);
      assert.deepEqual(errors, []);
      assert.deepEqual(externalRequests, []);
      console.log(`PASS ${width}px: connect, sync, no duplicates, internal transfers, navigation, disconnect, reset, reload, no external requests`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
