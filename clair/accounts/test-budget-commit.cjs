const assert = require('node:assert/strict'),
  { test } = require('node:test'),
  app = require('./budget-test-harness.cjs');
const plain = (x) => JSON.stringify(x);
function ready(connected = false) {
  const a = app();
  a.t.getData().openingBalanceDate = a.E.today();
  a.t.setData(a.t.getData());
  if (connected) {
    Object.assign(a.t.cloud, {
      enabled: true,
      user: { id: 'fictional-owner' },
      ready: true,
      status: 'synced',
    });
    a.t.cloud.record = {
      payload: structuredClone(a.t.getData()),
      meta: { userId: 'fictional-owner', revision: 7, dirty: false, operationId: 'previous' },
    };
    a.t.setData(a.t.getData());
    a.t.cloud.record = a.t.cloud.decode(a.t.getSnapshot(), 'fictional-owner');
  }
  return a;
}
for (const connected of [false, true]) {
  test(`oversized reconciliation preserves all state (${connected ? 'account' : 'local'})`, async () => {
    const a = ready(connected);
    a.t.getData().openingCents = -10000000000;
    a.t.setData(a.t.getData());
    const before = plain(a.t.getData()),
      cache = plain([...a.storage]),
      snapshot = a.t.getSnapshot(),
      cloud = plain(a.t.cloud.record);
    await a.submit({ formId: 'reconcile-form', amount: '100000000' });
    assert.equal(plain(a.t.getData()), before);
    assert.equal(plain([...a.storage]), cache);
    assert.equal(a.t.getSnapshot(), snapshot);
    assert.equal(plain(a.t.cloud.record), cloud);
    assert.match(a.node('#alert').innerHTML, /pas été enregistrée/);
  });
  test(`quota failure rolls back candidate only (${connected ? 'account' : 'local'})`, () => {
    const a = ready(connected),
      before = plain(a.t.getData()),
      cache = plain([...a.storage]),
      snapshot = a.t.getSnapshot(),
      cloud = plain(a.t.cloud.record);
    a.sandbox.localStorage.setItem = () => {
      throw Object.assign(Error('quota'), { name: 'QuotaExceededError' });
    };
    assert.equal(
      a.t.commit((d) => (d.openingCents += 100)),
      false,
    );
    assert.equal(plain(a.t.getData()), before);
    assert.equal(plain([...a.storage]), cache);
    assert.equal(a.t.getSnapshot(), snapshot);
    assert.equal(plain(a.t.cloud.record), cloud);
  });
}
for (const effect of ['Render', 'Notify', 'Push', 'Sound', 'Status'])
  test(`persisted success survives ${effect} failure`, () => {
    const a = ready(effect === 'Status');
    if (effect === 'Status')
      a.t.cloud.hooks.status = () => {
        throw Error('status broke');
      };
    else
      a.t['set' + effect](() => {
        throw Error(effect + ' broke');
      });
    assert.equal(
      a.t.commit((d) => (d.openingCents += 100), 'Saved'),
      true,
    );
    assert.equal(a.t.getData().openingCents, 1000100);
    assert.equal(JSON.parse(a.t.getSnapshot()).openingCents, 1000100);
    assert.equal([...a.storage.values()].includes(a.t.getSnapshot()), true);
    assert.equal(a.t.getRecovery(), null);
    assert.doesNotMatch(a.node('#alert').innerHTML, /n’a pas été enregistrée/);
    if (effect === 'Status') {
      assert.equal(a.t.cloud.record.payload.openingCents, 1000100);
      assert.equal(a.t.cloud.record.meta.revision, 7);
      assert.equal(a.t.cloud.record.meta.dirty, true);
    }
  });
test('candidate is validated after synchronization', () => {
  const a = ready(),
    sync = a.E.sync;
  a.E.sync = (d) => {
    sync(d);
    d.transactions.push({ id: 'bad', date: a.E.today(), amountCents: 10000000001, type: 'expense' });
  };
  const before = plain(a.t.getData());
  assert.equal(
    a.t.commit(() => {}),
    false,
  );
  assert.equal(plain(a.t.getData()), before);
});

test('successful candidate preserves every financial metadata field without projecting normalization', () => {
  const a = ready(true),
    d = a.t.getData();
  Object.assign(d, { currency: 'USD', currencyRevision: 9, expressSchema: 1 });
  Object.assign(d.preferences, {
    express: { defaultAccountId: 'current-budget' },
    profileName: 'Fixture',
    dailyGoal: { currency: 'USD', amountCents: 1234 },
  });
  d.savingsProjects = [
    {
      id: 'project',
      name: 'Voyage',
      kind: 'voyage',
      icon: 'plane',
      color: 'blue',
      targetCents: 123400,
      targetDate: '2027-12-01',
      archived: true,
    },
  ];
  d.rules = [
    {
      id: 'rule',
      name: 'Future',
      categoryId: 'transport',
      kind: 'monthly',
      start: '2090-01-01',
      end: null,
      amounts: [],
      amountCents: 100,
      day: 'last',
      month: 1,
      pauses: [],
      originFixedId: 'fixed',
      reminderEnabled: false,
    },
  ];
  d.transactions = [
    {
      id: 'fixture',
      type: 'expense',
      amountCents: 100,
      date: a.E.today(),
      name: 'Fixture',
      categoryId: 'epargne',
      note: 'Keep',
      autoKey: 'rule:' + a.E.today(),
      ruleId: 'rule',
      fixedExpenseId: 'fixed',
      fixedMonth: a.E.today().slice(0, 7),
      corrected: true,
      paymentConfirmed: true,
      confirmedAt: a.E.today(),
      earlyPaid: true,
      savingsProjectId: 'project',
      express: {
        source: 'express',
        createdAt: '2026-11-01T12:00:00.000Z',
        originalCurrency: 'EUR',
        accountId: 'current-budget',
        idempotencyKey: 'express-fixture',
      },
    },
  ];
  d.skipped = ['other:' + a.E.today()];
  d.budgets = { transport: 15 };
  d.budgetOverrides = { '2027-01': { transport: 20 } };
  d.fixedExpenses = [{ id: 'fixed', name: 'Fixed', amount: 1, categoryId: 'transport', day: 31 }];
  const before = structuredClone(d);
  a.E.normalize(d);
  a.t.setData(d);
  assert.equal(
    a.t.commit((x) => (x.openingCents += 100)),
    true,
  );
  before.openingCents += 100;
  assert.equal(plain(a.t.getData()), plain(before));
  const stored = JSON.parse(a.t.getSnapshot());
  delete stored._cloud;
  assert.equal(plain(stored), plain(before));
  assert.equal(plain(a.t.cloud.record.payload), plain(a.E.normalize(before)));
  assert.equal(a.t.cloud.record.meta.revision, 7);
});
test('external storage is adopted without applying a stale candidate', () => {
  const a = ready(),
    external = structuredClone(a.t.getData());
  external.openingCents = 456;
  const key = [...a.storage.keys()][0];
  a.storage.set(key, plain(external));
  assert.equal(
    a.t.commit((d) => (d.openingCents = 789)),
    false,
  );
  assert.equal(a.t.getData().openingCents, 456);
  assert.equal(a.storage.get(key), plain(external));
  assert.equal(a.t.getSnapshot(), plain(external));
});
