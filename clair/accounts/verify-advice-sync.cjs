/* Generated app + official Supabase SDK, intercepted synthetic Auth/CAS only.
 * No real backend, account, token, network mutation, or production request. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const { canonicalEngine } = require('../../tools/clair/test-support/vm-loader.cjs');
const E = canonicalEngine();
const root = path.resolve(__dirname, '..');
const supabaseHost = 'hkssnbvktfscizojhftl.supabase.co';
const ids = ['8450886d-891a-40e2-995e-ea46bb1409bc', '8450886d-891a-40e2-995e-ea46bb1409bd'];
const exp = 1900000000;
const user = id => ({ id, aud: 'authenticated', role: 'authenticated', email: 'sync-' + id.slice(-2) + '@example.invalid', user_metadata: { display_name: 'Synthetic QA' }, app_metadata: { provider: 'email' }, identities: [] });
const jwt = id => [{ alg: 'HS256', typ: 'JWT' }, { sub: id, aud: 'authenticated', role: 'authenticated', exp }, 'SYNTHETIC'].map(value => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url')).join('.');
function seed() {
  const budget = E.empty();
  budget.initialized = budget.setupDone = true;
  budget.openingBalanceDate = '2026-09-01';
  const tx = (id, amountCents, categoryId = 'alimentation', type = 'expense', date = '2026-10-10') => ({ id, amountCents, categoryId, type, date, name: id });
  budget.transactions = [3200, 2800, 1800, 2400, 3800, 4500].map((amount, index) => tx('food-' + index, amount));
  budget.transactions.push(tx('housing', 46000, 'logement'), tx('transport', 700, 'transport'), tx('other', 12500, 'autre'), tx('salary', 105000, 'income', 'income'), tx('save', 10000, 'epargne'), tx('withdraw', 2000, 'epargne', 'income'), tx('previous-food', 14000, 'alimentation', 'expense', '2026-09-10'));
  budget.adviceSchema = 1;
  budget.advice = { transactions: {}, months: { '2026-09': { through: '2026-09-30' }, '2026-10': { through: '2026-10-31' } }, goals: {}, location: { country: '', city: '' } };
  return E.normalize(budget);
}
// Test-only bridge invokes existing navigation, sync and official SDK methods.
// Persistence, canonical commits, Auth transitions and rendering remain production code.
const bridge = `window.__adviceSync={
 month:value=>{month=value;page='budget';render()},
 status:()=>({owner:cloud.user?.id,status:cloud.status,busy:cloud.busy,transition:cloud.authTransition,revision:cloud.record?.meta.revision}),
 sync:()=>cloud.sync(),
 session:tokens=>cloud.client.auth.setSession(tokens)
};`;
const server = http.createServer((request, response) => {
  const file = path.resolve(root, '.' + new URL(request.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) return response.writeHead(403).end();
  try {
    let bytes = fs.readFileSync(file);
    if (file.endsWith('/index.html')) {
      const source = bytes.toString(), anchor = '  render();if(!cloud.enabled)catchUp();';
      assert(source.includes(anchor), 'generated app bridge anchor must exist');
      bytes = Buffer.from(source.replace(anchor, bridge + anchor));
    }
    response.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json' }[path.extname(file)] || 'application/octet-stream' }).end(bytes);
  } catch { response.writeHead(404).end(); }
});
async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CLAIR_CHROME_PATH || '/usr/bin/chromium' });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    const remotes = new Map(ids.map(id => [id, { payload: seed(), revision: 1, operation_id: 'synthetic-seed-' + id.slice(-2), display_name: 'Synthetic QA' }]));
    const errors = [], unexpected = [], mutations = [], requests = [];
    let loseResponse = false;
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === origin) return route.continue();
      if (url.hostname !== supabaseHost) { unexpected.push(request.url()); return route.abort(); }
      requests.push(url.pathname);
      let id;
      try { id = JSON.parse(Buffer.from((request.headers().authorization || '').replace(/^Bearer /, '').split('.')[1], 'base64url').toString()).sub; } catch {}
      if (!ids.includes(id)) { unexpected.push('Unrecognized synthetic Auth: ' + url.pathname); return route.fulfill({ status: 401, body: '{}' }); }
      let body;
      if (url.pathname === '/auth/v1/user') body = user(id);
      else if (url.pathname === '/rest/v1/clair_budgets') {
        assert.equal(url.searchParams.get('user_id'), 'eq.' + id, 'read stays scoped to authenticated synthetic owner');
        body = remotes.get(id);
      } else if (url.pathname === '/rest/v1/rpc/save_clair_budget') {
        const input = request.postDataJSON(), current = remotes.get(id);
        if (current.operation_id === input.p_operation_id) body = { saved: true, row: current };
        else if (current.revision !== input.p_expected_revision) body = { saved: false, row: current };
        else {
          const next = { payload: input.p_payload, revision: current.revision + 1, operation_id: input.p_operation_id, display_name: input.p_display_name };
          remotes.set(id, next); mutations.push({ id, input: structuredClone(input) }); body = { saved: true, row: next };
          if (loseResponse) { loseResponse = false; return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ code: 'synthetic_response_lost', message: 'Synthetic response lost after commit' }) }); }
        }
      } else { unexpected.push(url.pathname); return route.fulfill({ status: 400, body: '{}' }); }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date('2026-11-16T12:00:00Z') });
    await page.addInitScript(({ user, jwt, exp }) => {
      localStorage.setItem('clair-welcome-seen-v1', '1');
      sessionStorage.setItem('clair-splash-v2', '1');
      localStorage.setItem('clair-account-session-v1', JSON.stringify({ access_token: jwt, refresh_token: 'SYNTHETIC', expires_in: 3600, expires_at: exp, token_type: 'bearer', user }));
    }, { user: user(ids[0]), jwt: jwt(ids[0]), exp });
    await page.goto(origin + '/index.html');
    await page.locator('.balance-section').waitFor();
    const read = id => page.evaluate(id => JSON.parse(localStorage.getItem('clair-account-budget-v1-' + id)), id);
    await page.waitForFunction(id => window.__adviceSync?.status().owner === id && __adviceSync.status().status === 'synced', ids[0]);
    await page.evaluate(() => __adviceSync.month('2026-10'));
    assert.equal(await page.locator('.monthly-advice').count(), 1);
    const initialTransactions = JSON.stringify((await read(ids[0])).transactions);
    for (const [key, cents] of Object.entries({ income: 105000, expenses: 77700, surplus: 27300, savings: 8000 })) assert.equal(await page.locator('[data-advice-total="' + key + '"]').getAttribute('data-cents'), String(cents));
    assert.equal(mutations.length, 0, 'opening a reviewed monthly report must never save');

    // Coalesce two contextual local saves into one canonical payload while offline.
    await context.setOffline(true);
    await page.locator('[data-advice-open-category="alimentation"]').first().click();
    await page.locator('[data-advice-exception="food-5"]').click();
    assert.equal(await page.locator('[data-advice-goal] input').inputValue(), '140');
    await page.locator('[data-advice-goal]').evaluate(form => { form.requestSubmit(); form.requestSubmit(); });
    let local = await read(ids[0]);
    assert.equal(local.advice.transactions['food-5'].exceptional, true);
    assert.equal(local.budgetOverrides['2026-11'].alimentation, 140);
    assert.equal(local.advice.goals['2026-11'].alimentation.amountCents, 14000);
    assert.equal(local.advice.goals['2026-11'].alimentation.setOn, '2026-11-16');
    assert.equal(JSON.stringify(local.transactions), initialTransactions, 'duplicate goal submit cannot add or change financial transactions');
    assert.equal(local._cloud.dirty, true);
    const offlineOperation = local._cloud.operationId;
    await page.evaluate(() => __adviceSync.sync());
    assert.equal((await page.evaluate(() => __adviceSync.status())).status, 'offline');
    assert.equal(mutations.length, 0);
    await context.setOffline(false);
    await page.evaluate(() => dispatchEvent(new Event('online')));
    await page.waitForFunction(id => JSON.parse(localStorage.getItem('clair-account-budget-v1-' + id))._cloud.dirty === false, ids[0], { timeout: 15000 });
    assert.equal(mutations.length, 1, 'reconnection persists one canonical save for all pending advice changes');
    assert.equal(mutations[0].input.p_operation_id, offlineOperation);
    assert.equal(remotes.get(ids[0]).revision, 2);
    assert.equal(remotes.get(ids[0]).payload.advice.transactions['food-5'].exceptional, true);
    assert.equal(remotes.get(ids[0]).payload.advice.goals['2026-11'].alimentation.amountCents, 14000);
    assert.equal(JSON.stringify(remotes.get(ids[0]).payload.transactions), initialTransactions);
    console.log('PASS advice generated app offline→reconnect: tag + duplicate next-month goal submits coalesce into one canonical CAS save; metadata dated, all financial transactions unchanged');

    // Apply server commit but lose its response. Existing read/reconcile handles retry.
    await page.locator('[data-advice-goal] input').fill('150');
    await page.locator('[data-advice-goal] button[type="submit"]').click();
    const lostOperation = (await read(ids[0]))._cloud.operationId;
    loseResponse = true;
    await page.evaluate(() => __adviceSync.sync());
    assert.equal(remotes.get(ids[0]).revision, 3);
    assert.equal(remotes.get(ids[0]).operation_id, lostOperation);
    assert.equal(mutations.length, 2);
    assert.equal((await read(ids[0]))._cloud.dirty, true);
    assert.equal((await page.evaluate(() => __adviceSync.status())).status, 'error');
    await page.evaluate(() => __adviceSync.sync());
    local = await read(ids[0]);
    assert.equal(local._cloud.dirty, false);
    assert.equal(local._cloud.revision, 3);
    assert.equal(local.budgetOverrides['2026-11'].alimentation, 150);
    assert.equal(remotes.get(ids[0]).revision, 3, 'lost-response retry must not advance server revision twice');
    assert.equal(mutations.length, 2, 'lost-response retry must not create a second financial/metadata mutation');
    assert.equal(JSON.stringify(local.transactions), initialTransactions);
    console.log('PASS advice generated app lost response: retry recognizes the existing canonical server payload, clears dirty state and retains one server revision for the goal change');

    // An unsaved private draft must disappear on an official SDK account change.
    await page.locator('[data-advice-goal] input').fill('199');
    assert.equal(await page.locator('[data-advice-goal] input').inputValue(), '199');
    const stale = await page.locator('[data-advice-goal]').elementHandle();
    const result = await page.evaluate(tokens => __adviceSync.session(tokens), { access_token: jwt(ids[1]), refresh_token: 'SYNTHETIC-SECOND' });
    assert.equal(result.error, null);
    await page.waitForFunction(id => __adviceSync.status().owner === id && __adviceSync.status().status === 'synced', ids[1], { timeout: 15000 });
    assert.equal(await page.locator('[data-advice-category-detail]').count(), 0, 'new owner never sees previous owner draft');
    await stale.evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await page.evaluate(() => __adviceSync.month('2026-10'));
    await page.locator('[data-advice-open-category="alimentation"]').first().click();
    assert.equal(await page.locator('[data-advice-goal] input').inputValue(), '', 'new owner receives no proposed amount without their own exceptional context');
    const other = await read(ids[1]);
    assert.equal(other.advice.transactions['food-5'], undefined);
    assert.equal(other.advice.goals['2026-11'], undefined);
    assert.equal(other.budgetOverrides['2026-11'], undefined);
    assert.equal(remotes.get(ids[1]).revision, 1);
    assert.equal(mutations.length, 2, 'owner switch and detached stale form never issue a write');
    assert.equal((await read(ids[0])).budgetOverrides['2026-11'].alimentation, 150);
    assert.equal(JSON.stringify(other.transactions), initialTransactions);
    assert(requests.includes('/auth/v1/user'), 'owner transition uses the official SDK Auth request against the synthetic transport');
    assert.deepEqual(errors, []);
    assert.deepEqual(unexpected, []);
    console.log('PASS advice generated app official SDK owner switch: private draft cleared, stale detached form ignored, account caches/metadata isolated, no new write');
    console.log('PASS all Supabase requests intercepted locally; no unexpected external request or JavaScript error');
    await context.close();
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
