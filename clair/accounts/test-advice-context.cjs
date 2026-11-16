const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const { canonicalEngine, root } = require('../../tools/clair/test-support/vm-loader.cjs');
const E = canonicalEngine();
function sample() {
  const d = E.empty();
  d.initialized = d.setupDone = true;
  d.openingCents = 100000;
  d.transactions = [
    {
      id: 'food',
      type: 'expense',
      amountCents: 4500,
      date: '2026-10-20',
      categoryId: 'alimentation',
    },
    { id: 'refund', type: 'income', amountCents: 1000, date: '2026-10-21', categoryId: 'income' },
  ];
  d.adviceSchema = 1;
  d.advice = {
    transactions: { food: { exceptional: true }, refund: { nature: 'refund', refundOf: 'food' } },
    months: { '2026-10': { through: '2026-10-31' } },
    goals: { '2026-11': { alimentation: { amountCents: 14000, setOn: '2026-10-25' } } },
    location: { country: 'FR', city: 'Angers' },
  };
  d.budgetOverrides = { '2026-11': { alimentation: 140 } };
  return d;
}
const d = sample(),
  before = JSON.stringify(d),
  normalized = E.normalize(d);
assert.equal(normalized.adviceSchema, 1, 'optional advice contract survives normalization');
assert.equal(normalized.advice.transactions.refund.refundOf, 'food');
assert.equal(normalized.advice.location.city, 'Angers');
assert.equal(JSON.stringify(d), before);
assert.equal(E.balance(normalized, '2026-10-31'), 96500, 'context never changes ledger balance');
assert.throws(() => E.normalize({ ...d, adviceSchema: 2 }), /Conseils|conseils/);
assert.throws(() => E.normalize({ ...d, adviceSchema: undefined }), /Conseils|conseils/);
assert.throws(() => E.normalize({ ...d, advice: [] }), /Conseils|conseils/);
assert.throws(
  () =>
    E.normalize({
      ...d,
      advice: { ...d.advice, transactions: { missing: { nature: 'expense' } } },
    }),
  /Conseils|conseils/,
);
assert.throws(
  () =>
    E.normalize({ ...d, advice: { ...d.advice, transactions: { food: { nature: 'refund' } } } }),
  /Conseils|conseils/,
);
assert.throws(
  () =>
    E.normalize({
      ...d,
      advice: { ...d.advice, months: { '2026-02': { through: '2026-02-31' } } },
    }),
  /Conseils|conseils/,
);
assert.throws(
  () =>
    E.normalize({
      ...d,
      advice: { ...d.advice, location: { country: 'FR', city: 'x'.repeat(101) } },
    }),
  /Conseils|conseils/,
);
const excessive = sample();
excessive.transactions[1].amountCents = 4600;
assert.throws(() => E.normalize(excessive), /Conseils|conseils/);
const linkedToSavings = sample();
linkedToSavings.transactions[0].categoryId = 'epargne';
linkedToSavings.transactions[0].savingsProjectId = null;
assert.throws(() => E.normalize(linkedToSavings), /Conseils|conseils/);
const context = { ClairEngine: E, structuredClone };
vm.createContext(context);
vm.runInContext(fs.readFileSync(root + '/clair/application/advice-commands.js', 'utf8'), context);
vm.runInContext(fs.readFileSync(root + '/clair/application/budget-commands.js', 'utf8'), context);
const A = context.ClairAdviceCommands,
  prepare = context.ClairBudgetCommands.prepareBudgetChange;
const partial = E.empty();
partial.adviceSchema = 1;
partial.advice = {};
partial.transactions = [...normalized.transactions];
assert.doesNotThrow(
  () => A.annotateTransaction(partial, 'food', { exceptional: true }),
  'compatible partial metadata can be edited',
);
assert.equal(E.normalize(partial).advice.transactions.food.exceptional, true);
const marked = prepare(normalized, (b) => A.annotateTransaction(b, 'food', { exceptional: false }));
assert.equal(
  marked.advice.months['2026-10'].through,
  '2026-10-31',
  'contextual flag does not invalidate a ledger review',
);
assert.equal(E.balance(marked, '2026-10-31'), 96500);
const edited = prepare(normalized, (b) => {
  b.transactions[0].amountCents = 5000;
});
assert.equal(
  edited.advice.months['2026-10'],
  undefined,
  'financial edit invalidates affected review',
);
const deleted = prepare(normalized, (b) => {
  b.transactions = b.transactions.filter((t) => t.id !== 'food');
});
assert.equal(deleted.advice.transactions.food, undefined);
assert.equal(
  deleted.advice.transactions.refund.refundOf,
  undefined,
  'retained refund is disclosed as unlinked after original deletion',
);
const typed = prepare(normalized, (b) =>
  A.annotateTransaction(b, 'refund', { nature: 'transfer' }),
);
assert.equal(typed.advice.months['2026-10'], undefined);
const goal = prepare(normalized, (b) =>
  A.setMonthlyGoal(b, {
    month: '2026-11',
    categoryId: 'alimentation',
    amountCents: 15000,
    setOn: '2026-10-26',
  }),
);
assert.equal(goal.budgetOverrides['2026-11'].alimentation, 150);
assert.equal(goal.advice.goals['2026-11'].alimentation.amountCents, 15000);
assert.equal(goal.transactions.length, 2);
assert.equal(E.balance(goal, '2026-10-31'), 96500);
assert.throws(() =>
  A.setMonthlyGoal(structuredClone(normalized), {
    month: '2026-11',
    categoryId: 'alimentation',
    amountCents: -1,
    setOn: '2026-10-26',
  }),
);
const reviewed = prepare(edited, (b) => A.reviewMonth(b, '2026-10', '2026-10-31'));
assert.equal(reviewed.advice.months['2026-10'].through, '2026-10-31');
for (const code of Object.keys(E.currencies)) {
  const converted = E.convertCurrency(normalized, code, '2026-10-31');
  assert.equal(converted.adviceSchema, 1);
  assert.equal(
    converted.advice.goals['2026-11'].alimentation.amountCents,
    E.cents(converted.budgetOverrides['2026-11'].alimentation, code),
  );
  assert.equal(converted.advice.transactions.food.exceptional, true);
  E.validateCurrency(converted);
}
const local = E.empty();
A.setLocation(local, { country: 'CI', city: 'Abidjan' });
assert.equal(local.currency, 'EUR', 'location never changes currency');
assert.equal(local.advice.location.country, 'CI');
assert.equal(E.normalize(local).adviceSchema, 1);
console.log(
  'PASS advice context: strict optional JSONv3, classifications, review invalidation, goals, FX, location and unchanged ledger',
);

test('moving an annotated expense into an existing savings project prunes incompatible unchanged fields', () => {
  for (const annotation of [{ exceptional: true }, { nature: 'expense', exceptional: false }]) {
    const source = sample();
    source.advice.transactions.food = annotation;
    source.savingsProjects = [{ id: 'reserve', name: 'Réserve', targetCents: 100000 }];
    const current = E.normalize(source);
    const snapshot = JSON.stringify(current);
    const saved = prepare(current, (draft) => {
      draft.transactions[0].categoryId = 'epargne';
      draft.transactions[0].savingsProjectId = 'reserve';
    });
    assert.equal(saved.transactions[0].amountCents, 4500);
    assert.equal(saved.transactions[0].savingsProjectId, 'reserve');
    assert.equal(saved.advice.transactions.food?.nature, undefined);
    assert.equal(saved.advice.transactions.food?.exceptional, annotation.exceptional === false ? false : undefined);
    assert.equal(saved.advice.transactions.refund.nature, 'refund');
    assert.equal(saved.advice.transactions.refund.refundOf, undefined);
    assert.equal(saved.advice.months['2026-10'], undefined);
    assert.equal(E.balance(saved, '2026-10-31'), 96500);
    assert.equal(JSON.stringify(current), snapshot);
  }
});

test('excluding an original expense unlinks retained refunds and invalidates both affected month reviews', () => {
  for (const nature of ['transfer', 'adjustment']) {
    const source = sample();
    source.transactions[1].date = '2026-11-02';
    source.advice.months['2026-11'] = { through: '2026-11-02' };
    source.advice.months['2026-09'] = { through: '2026-09-30' };
    const current = E.normalize(source);
    const saved = prepare(current, (draft) => A.annotateTransaction(draft, 'food', { nature }));
    assert.equal(saved.advice.transactions.food.nature, nature);
    assert.equal(saved.advice.transactions.refund.nature, 'refund');
    assert.equal(saved.advice.transactions.refund.refundOf, undefined);
    assert.equal(saved.advice.months['2026-10'], undefined);
    assert.equal(saved.advice.months['2026-11'], undefined);
    assert.equal(saved.advice.months['2026-09'].through, '2026-09-30');
    assert.equal(JSON.stringify(saved.transactions), JSON.stringify(current.transactions));
  }
});

test('FX rounding unlinks only over-cap refund groups while preserving every canonical converted amount', () => {
  const summaryContext = { ClairEngine: E };
  vm.createContext(summaryContext);
  vm.runInContext(fs.readFileSync(root + '/clair/domain/monthly-summary.js', 'utf8'), summaryContext);
  for (const currency of ['XOF', 'XAF']) {
    const source = sample();
    source.transactions = [
      { id: 'original', type: 'expense', categoryId: 'food', date: '2026-09-20', amountCents: 2000 },
      { id: 'refund-a', type: 'income', categoryId: 'income', date: '2026-10-01', amountCents: 1000 },
      { id: 'refund-b', type: 'income', categoryId: 'income', date: '2026-11-01', amountCents: 1000 },
      { id: 'other', type: 'expense', categoryId: 'other', date: '2026-08-01', amountCents: 3000 },
      { id: 'other-refund', type: 'income', categoryId: 'income', date: '2026-08-02', amountCents: 1000 },
    ];
    source.advice.transactions = {
      'refund-a': { nature: 'refund', refundOf: 'original' },
      'refund-b': { nature: 'refund', refundOf: 'original' },
      'other-refund': { nature: 'refund', refundOf: 'other' },
    };
    source.advice.months = {
      '2026-08': { through: '2026-08-31' }, '2026-09': { through: '2026-09-30' },
      '2026-10': { through: '2026-10-31' }, '2026-11': { through: '2026-11-01' },
    };
    const current = E.normalize(source);
    const snapshot = JSON.stringify(current);
    const withoutAdvice = structuredClone(current);
    delete withoutAdvice.advice;
    delete withoutAdvice.adviceSchema;
    const canonical = E.convertCurrency(withoutAdvice, currency, '2026-11-16');
    const converted = E.convertCurrency(current, currency, '2026-11-16');
    assert.deepEqual(Array.from(converted.transactions.slice(0, 3), (tx) => tx.amountCents), [1311900, 656000, 656000]);
    assert.equal(JSON.stringify(converted.transactions), JSON.stringify(canonical.transactions));
    assert.equal(converted.openingCents, canonical.openingCents);
    assert.equal(E.balance(converted, '2026-11-16'), E.balance(canonical, '2026-11-16'));
    for (const id of ['refund-a', 'refund-b']) {
      assert.equal(converted.advice.transactions[id].nature, 'refund');
      assert.equal(converted.advice.transactions[id].refundOf, undefined);
    }
    assert.equal(converted.advice.transactions['other-refund'].refundOf, 'other');
    assert.equal(converted.advice.months['2026-08'].through, '2026-08-31');
    for (const month of ['2026-09', '2026-10', '2026-11']) assert.equal(converted.advice.months[month], undefined);
    const report = summaryContext.ClairMonthlySummary.summarizeMonth(converted, { month: '2026-10', asOf: '2026-11-16' });
    assert.equal(report.incomeCents, 0);
    assert.equal(report.refundCents, 656000);
    assert.equal(report.quality.unknownRefunds, 1);
    assert.ok(report.quality.notes.includes('unlinked-refund'));
    assert.equal(JSON.stringify(current), snapshot);
    E.validateCurrency(converted);
    const ordinaryOverCap = structuredClone(converted);
    ordinaryOverCap.advice.transactions['refund-a'].refundOf = 'original';
    ordinaryOverCap.advice.transactions['refund-b'].refundOf = 'original';
    assert.throws(() => E.normalize(ordinaryOverCap), /Conseils|conseils/, 'ordinary inputs still enforce the strict aggregate cap');
  }
});

test('FX cannot turn stale goal evidence into verified evidence through rounding coincidence', () => {
  const source = sample();
  source.budgetOverrides['2026-11'].alimentation = 1;
  source.advice.goals['2026-11'].alimentation.amountCents = 101;
  const current = E.normalize(source);
  const snapshot = JSON.stringify(current);
  const converted = E.convertCurrency(current, 'GBP', '2026-11-16');
  assert.equal(E.cents(converted.budgetOverrides['2026-11'].alimentation, 'GBP'), 84);
  assert.equal(converted.advice.goals['2026-11']?.alimentation, undefined,
    'EUR100c override and stale101c evidence both round to GBP84c, but only the override survives');
  const withoutEvidence = structuredClone(current);
  withoutEvidence.advice.goals = {};
  const canonical = E.convertCurrency(withoutEvidence, 'GBP', '2026-11-16');
  assert.equal(JSON.stringify(converted.transactions), JSON.stringify(canonical.transactions));
  assert.equal(converted.openingCents, canonical.openingCents);
  assert.equal(JSON.stringify(current), snapshot);
});

test('FX drops goal evidence without an actual monthly override even if a global envelope exists', () => {
  const source = sample();
  delete source.budgetOverrides['2026-11'];
  source.budgets.alimentation = 140;
  const converted = E.convertCurrency(source, 'USD', '2026-11-16');
  assert.equal(converted.advice.goals['2026-11']?.alimentation, undefined);
  assert.equal(converted.budgetOverrides['2026-11'], undefined);
  assert.equal(converted.budgets.alimentation, 155.82);
});

test('FX requires native CFA goal evidence to match the original override and preserves valid evidence in all eight currencies', () => {
  for (const from of ['XOF', 'XAF']) {
    const source = sample();
    source.currency = from;
    source.advice.goals['2026-11'].alimentation.amountCents = 14100;
    const stale = E.convertCurrency(source, 'EUR', '2026-11-16');
    assert.equal(stale.advice.goals['2026-11']?.alimentation, undefined);
    assert.equal(E.cents(stale.budgetOverrides['2026-11'].alimentation, 'EUR'), 21);
  }
  for (const currency of Object.keys(E.currencies)) {
    const converted = E.convertCurrency(sample(), currency, '2026-11-16');
    const goal = converted.advice.goals['2026-11'].alimentation;
    assert.equal(goal.amountCents, E.cents(converted.budgetOverrides['2026-11'].alimentation, currency));
    assert.equal(goal.setOn, '2026-10-25');
    if (currency === 'XOF' || currency === 'XAF') assert.equal(goal.amountCents % 100, 0);
    E.validateCurrency(converted);
  }
});

function localConversion(current, currency, edit = () => {}) {
  return prepare(current, (draft) => {
    const converted = E.convertCurrency(current, currency, '2026-11-16');
    for (const key of Object.keys(draft)) delete draft[key];
    Object.assign(draft, converted);
    edit(draft);
  });
}

test('the actual local FX commit preserves valid refund links and reviews in all eight currencies', () => {
  const current = E.normalize(sample());
  const snapshot = JSON.stringify(current);
  for (const currency of Object.keys(E.currencies)) {
    const direct = E.convertCurrency(current, currency, '2026-11-16');
    const saved = localConversion(current, currency);
    assert.equal(saved.advice.transactions.refund.refundOf, 'food', currency);
    assert.equal(saved.advice.months['2026-10'].through, '2026-10-31', currency);
    assert.equal(JSON.stringify(saved.advice), JSON.stringify(direct.advice), currency);
    assert.equal(JSON.stringify(saved.transactions), JSON.stringify(direct.transactions), currency);
    assert.equal(saved.openingCents, direct.openingCents, currency);
  }
  assert.equal(JSON.stringify(current), snapshot);
});

test('local FX commit keeps over-cap refunds unlinked as direct conversion does', () => {
  const source = sample();
  source.transactions[0].amountCents = 2000;
  source.transactions.push({ id: 'second-refund', type: 'income', amountCents: 1000, categoryId: 'income', date: '2026-11-01' });
  source.advice.transactions['second-refund'] = { nature: 'refund', refundOf: 'food' };
  source.advice.months['2026-11'] = { through: '2026-11-01' };
  const current = E.normalize(source);
  for (const currency of ['XOF', 'XAF']) {
    const direct = E.convertCurrency(current, currency, '2026-11-16');
    const saved = localConversion(current, currency);
    assert.equal(saved.advice.transactions.refund.refundOf, undefined);
    assert.equal(saved.advice.transactions['second-refund'].refundOf, undefined);
    assert.equal(JSON.stringify(saved.advice), JSON.stringify(direct.advice));
    assert.equal(JSON.stringify(saved.transactions), JSON.stringify(direct.transactions));
  }
});

test('local FX reconciliation still invalidates extra amount/date/category/nature edits, deletion and new rows', () => {
  const source = sample();
  source.transactions[1].date = '2026-11-02';
  source.advice.months['2026-11'] = { through: '2026-11-02' };
  source.advice.months['2026-09'] = { through: '2026-09-30' };
  source.advice.months['2026-08'] = { through: '2026-08-31' };
  const current = E.normalize(source);
  for (const [kind, edit] of [
    ['amount', (d) => { d.transactions[0].amountCents += 100; }],
    ['date', (d) => { d.transactions[0].date = '2026-09-20'; }],
    ['category', (d) => { d.transactions[0].categoryId = 'other'; }],
    ['nature', (d) => { d.advice.transactions.food = { nature: 'transfer' }; }],
  ]) {
    const saved = localConversion(current, 'USD', edit);
    assert.equal(saved.advice.transactions.refund.refundOf, undefined, kind);
    assert.equal(saved.advice.months['2026-10'], undefined, kind);
    assert.equal(saved.advice.months['2026-11'], undefined, kind);
    assert.equal(saved.advice.months['2026-08'].through, '2026-08-31', kind);
    if (kind === 'date') assert.equal(saved.advice.months['2026-09'], undefined);
    else assert.equal(saved.advice.months['2026-09'].through, '2026-09-30', kind);
  }
  const added = localConversion(current, 'USD', (d) => {
    d.transactions.push({ id: 'additional', type: 'expense', amountCents: 100, date: '2026-09-15', categoryId: 'other' });
  });
  assert.equal(added.advice.months['2026-09'], undefined);
  assert.equal(added.advice.months['2026-10'].through, '2026-10-31');
  assert.equal(added.advice.months['2026-11'].through, '2026-11-02');
  assert.equal(added.advice.transactions.refund.refundOf, 'food');
  const deleted = localConversion(current, 'USD', (d) => { d.transactions.splice(1, 1); });
  assert.equal(deleted.advice.transactions.refund, undefined);
  assert.equal(deleted.advice.months['2026-11'], undefined);
  assert.equal(deleted.advice.months['2026-10'].through, '2026-10-31');
});

test('catch-up rows generated during the local FX commit invalidate their month without stripping unrelated reviews', () => {
  const source = sample();
  source.openingBalanceDate = '2026-08-01';
  source.rules = [{ id: 'catchup', kind: 'monthly', categoryId: 'other', name: 'Charge', start: '2026-09-01', end: '2026-09-30', day: 10, amountCents: 100 }];
  source.advice.months['2026-09'] = { through: '2026-09-30' };
  const current = E.normalize(source);
  const saved = localConversion(current, 'GBP');
  assert.equal(saved.transactions.find((t) => t.ruleId === 'catchup').amountCents, 84);
  assert.equal(saved.advice.months['2026-09'], undefined);
  assert.equal(saved.advice.months['2026-10'].through, '2026-10-31');
  assert.equal(saved.advice.transactions.refund.refundOf, 'food');
});
