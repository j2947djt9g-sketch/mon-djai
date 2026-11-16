const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { canonicalEngine } = require('../../tools/clair/test-support/vm-loader.cjs');
const E = canonicalEngine();
const context = vm.createContext({ ClairEngine: E, Date, Intl, structuredClone });
for (const file of ['monthly-summary', 'spending-trends']) {
  const source = path.join(__dirname, '../domain', file + '.js');
  if (fs.existsSync(source)) vm.runInContext(fs.readFileSync(source, 'utf8'), context);
}
const summarize = (...args) => {
  assert.ok(context.ClairMonthlySummary, 'monthly summary module must produce registered monthly flows');
  return context.ClairMonthlySummary.summarizeMonth(...args);
};
const compare = (...args) => {
  assert.ok(context.ClairSpendingTrends, 'spending trends module must guard comparisons');
  return context.ClairSpendingTrends.compareMonths(...args);
};
const options = { month: '2026-10', asOf: '2026-11-16' };
function tx(id, amountCents, categoryId = 'food', type = 'expense', date = '2026-10-10', extra = {}) {
  return { id, amountCents, categoryId, type, date, name: id, ...extra };
}
function budget(rows = [], reviewed = true) {
  const d = E.empty();
  d.transactions = rows;
  if (reviewed) {
    d.adviceSchema = 1;
    d.advice = { transactions: {}, months: { '2026-09': { through: '2026-09-30' }, '2026-10': { through: '2026-10-31' } }, goals: {} };
  }
  return d;
}
function fixture() {
  const rows = [3200, 2800, 1800, 2400, 3800, 4500].map((amount, i) => tx('food-' + i, amount));
  rows.push(tx('housing', 46000, 'housing'), tx('transport', 700, 'transport'), tx('other', 12500, 'other'),
    tx('salary', 105000, 'salary', 'income'), tx('save', 10000, 'epargne'), tx('withdraw', 2000, 'epargne', 'income'),
    tx('previous-food', 14000, 'food', 'expense', '2026-09-10'));
  return budget(rows);
}

test('canonical month separates spending, earned income and identified savings without mutation', () => {
  const d = fixture();
  const before = JSON.stringify(d);
  const s = summarize(d, options);
  assert.equal(s.incomeCents, 105000);
  assert.equal(s.expenseCents, 77700);
  assert.equal(s.netExpenseCents, 77700);
  assert.equal(s.surplusCents, 27300);
  assert.equal(s.savingsCents, 8000);
  assert.equal(s.categories.find(x => x.id === 'food').expenseCents, 18500);
  assert.equal(s.categories.find(x => x.id === 'food').count, 6);
  assert.equal(s.quality.reviewed, true);
  assert.equal(s.period.status, 'closed');
  assert.equal(JSON.stringify(d), before);
  s.transactions[0].name = 'detached';
  assert.equal(d.transactions[0].name, 'food-0');
});

test('explicit exception changes context only, including detached nested rows', () => {
  const d = fixture();
  d.advice.transactions['food-5'] = { exceptional: true };
  d.transactions[0].express = { source: { kind: 'manual' } };
  const s = summarize(d, options);
  assert.equal(s.expenseCents, 77700);
  assert.equal(s.surplusCents, 27300);
  assert.equal(s.categories.find(x => x.id === 'food').exceptionalCents, 4500);
  assert.equal(s.transactions.find(x => x.id === 'food-5').context.exceptional, true);
  s.transactions[0].express.source.kind = 'changed';
  s.transactions.find(x => x.id === 'food-5').context.exceptional = false;
  assert.equal(d.transactions[0].express.source.kind, 'manual');
  assert.equal(d.advice.transactions['food-5'].exceptional, true);
});

test('all eight currencies retain native cents including integer CFA', () => {
  for (const currency of ['EUR', 'XOF', 'XAF', 'USD', 'GBP', 'MAD', 'CAD', 'CHF']) {
    const d = fixture(); d.currency = currency;
    const s = summarize(d, options);
    assert.equal(s.currency, currency);
    assert.equal(s.expenseCents, 77700);
    assert.equal(s.surplusCents, 27300);
  }
  const invalid = budget([tx('fractional-cfa', 101)]); invalid.currency = 'XOF';
  assert.throws(() => summarize(invalid, options), /montant|centime|entier|CFA/i);
});

test('refunds reduce net expenses and retain original cross-month category', () => {
  const d = budget([tx('original', 10000, 'food', 'expense', '2026-09-10'),
    tx('refund', 3000, 'other', 'income'), tx('salary', 20000, 'salary', 'income'), tx('food', 5000)]);
  d.advice.transactions.refund = { nature: 'refund', refundOf: 'original' };
  const s = summarize(d, options);
  assert.equal(s.incomeCents, 20000);
  assert.equal(s.expenseCents, 5000);
  assert.equal(s.refundCents, 3000);
  assert.equal(s.netExpenseCents, 2000);
  assert.equal(s.surplusCents, 18000);
  assert.equal(s.categories.find(x => x.id === 'food').netCents, 2000);
  assert.equal(s.quality.unknownRefunds, 0);
});

test('unlinked refunds are disclosed rather than reclassified as income', () => {
  const d = budget([tx('refund', 3000, 'food', 'income')]);
  d.advice.transactions.refund = { nature: 'refund' };
  const s = summarize(d, options);
  assert.equal(s.incomeCents, 0);
  assert.equal(s.refundCents, 3000);
  assert.equal(s.categories.find(x => x.id === 'non-classee').refundCents, 3000);
  assert.equal(s.quality.unknownRefunds, 1);
  assert.equal(s.quality.comparable, false);
  assert.ok(s.quality.notes.includes('unlinked-refund'));
  assert.equal(compare(s, summarize(d, { ...options, month: '2026-09' })).comparable, false);
});

test('transfers and adjustments are signed excluded flows; savings classification wins', () => {
  const d = budget([tx('out', 6000), tx('in', 2000, 'other', 'income'), tx('correction', 1000, 'other', 'income'),
    tx('save', 8000, 'epargne'), tx('withdraw', 500, 'epargne', 'income')]);
  d.advice.transactions = { out: { nature: 'transfer' }, in: { nature: 'transfer' }, correction: { nature: 'adjustment' },
    save: { nature: 'transfer' }, withdraw: { nature: 'refund' } };
  const s = summarize(d, options);
  assert.equal(s.transferCents, -4000);
  assert.equal(s.adjustmentCents, 1000);
  assert.equal(s.savingsCents, 7500);
  assert.equal(s.incomeCents, 0);
  assert.equal(s.expenseCents, 0);
  assert.equal(s.refundCents, 0);
});

test('legacy labels never imply refunds, transfers or real zero coverage', () => {
  const d = budget([tx('Remboursement virement', 3000, 'food', 'income')], false);
  const s = summarize(d, options);
  assert.equal(s.incomeCents, 3000);
  assert.equal(s.refundCents, 0);
  assert.equal(s.quality.reviewed, false);
  assert.ok(s.quality.notes.includes('legacy-unreviewed'));
  const empty = summarize(budget([], false), options);
  assert.equal(empty.expenseCents, 0);
  assert.equal(empty.quality.comparable, false);
  assert.equal(compare(empty, empty).comparable, false);
});

test('partial periods bound through by today and exclude future ledger rows and generated occurrences', () => {
  const d = budget([tx('past', 1000), tx('future', 4000, 'food', 'expense', '2026-10-25')]);
  d.rules = [{ id: 'unrecorded-rule', kind: 'monthly', start: '2026-10-01', amountCents: 5000, day: 1 }];
  d.advice.months['2026-10'].through = '2026-10-15';
  const s = summarize(d, { month: '2026-10', asOf: '2026-10-15', through: '2026-10-31' });
  assert.equal(s.period.through, '2026-10-15');
  assert.equal(s.period.status, 'partial');
  assert.equal(s.expenseCents, 1000);
  assert.equal(s.quality.reviewed, true);
  const narrower = summarize(d, { ...options, through: '2026-10-05' });
  assert.equal(narrower.expenseCents, 0);
  const future = summarize(d, { month: '2026-12', asOf: '2026-11-16' });
  assert.equal(future.period.status, 'future');
  assert.equal(future.period.through, null);
  assert.equal(future.transactions.length, 0);
  assert.equal(future.quality.reviewed, false);
});

test('future review evidence does not validate current coverage', () => {
  const d = budget([tx('past', 1000)]);
  assert.equal(summarize(d, { month: '2026-10', asOf: '2026-10-15' }).quality.reviewed, false);
});

test('invalid month/civil dates and unsafe money are rejected', () => {
  for (const bad of [{ ...options, month: '2026-13' }, { ...options, month: '2026-2' },
    { ...options, asOf: '2026-02-30' }, { ...options, through: '2026-09-30' }, { ...options, through: 'bad' }]) {
    assert.throws(() => summarize(budget(), bad), /date|mois|période/i);
  }
  assert.throws(() => summarize(budget([tx('unsafe', Number.MAX_SAFE_INTEGER), tx('overflow', 1)]), options), /montant|capacité|centime/i);
});

test('recurring rows are counted once from recorded rows and unconfirmed obligations are disclosed', () => {
  const d = budget([tx('automatic', 7000, 'housing', 'expense', '2026-10-03', { autoKey: 'r:2026-10-03', ruleId: 'r' }),
    tx('fixed', 4000, 'housing', 'expense', '2026-10-04', { fixedExpenseId: 'f', paymentConfirmed: true }),
    tx('manual', 3000)]);
  const s = summarize(d, options);
  assert.equal(s.expenseCents, 14000);
  assert.equal(s.recurringCents, 11000);
  assert.equal(s.quality.unconfirmedAutomaticCount, 1);
  assert.ok(s.quality.notes.includes('unconfirmed-automatic'));
});

test('unconfirmed automatic savings remain a quality warning without becoming recurring ordinary spending', () => {
  const d = budget([tx('automatic-saving', 8000, 'epargne', 'expense', '2026-10-03', {
    autoKey: 'save:2026-10-03', ruleId: 'save', paymentConfirmed: false,
  })]);
  const s = summarize(d, options);
  assert.equal(s.savingsCents, 8000);
  assert.equal(s.expenseCents, 0);
  assert.equal(s.recurringCents, 0);
  assert.equal(s.quality.unconfirmedAutomaticCount, 1);
  assert.ok(s.quality.notes.includes('unconfirmed-automatic'));
});

test('goal evidence requires a matching monthly override chosen before month start', () => {
  const d = budget();
  d.budgets = { food: 120, transport: 10 };
  d.budgetOverrides = { '2026-10': { food: 140 } };
  d.advice.goals['2026-10'] = { food: { amountCents: 14000, setOn: '2026-09-30' }, transport: { amountCents: 1000, setOn: '2026-09-30' } };
  let s = summarize(d, options);
  assert.equal(s.goals.find(x => x.categoryId === 'food').verified, true);
  assert.equal(s.goals.find(x => x.categoryId === 'transport').verified, false);
  d.budgetOverrides['2026-10'].food = 150;
  s = summarize(d, options);
  assert.equal(s.goals.find(x => x.categoryId === 'food').amountCents, 15000);
  assert.equal(s.goals.find(x => x.categoryId === 'food').verified, false);
  d.advice.goals['2026-10'].food = { amountCents: 15000, setOn: '2026-10-02' };
  assert.equal(summarize(d, options).goals.find(x => x.categoryId === 'food').verified, false);
  delete d.advice.goals['2026-10'].food;
  assert.equal(summarize(d, options).goals.find(x => x.categoryId === 'food').setOn, null);
});

test('closed reviewed comparisons show food +4500 and never baseline-zero percentages', () => {
  const d = fixture();
  const c = compare(summarize(d, options), summarize(d, { ...options, month: '2026-09' }));
  assert.equal(c.comparable, true);
  const food = c.categories.find(x => x.id === 'food');
  assert.equal(food.deltaCents, 4500);
  assert.ok(Math.abs(food.percent - 32.142857142857146) < 0.000001);
  assert.equal(c.categories.find(x => x.id === 'housing').percent, null);
  assert.equal(c.incomeDeltaCents, 105000);
  assert.equal(c.expenseDeltaCents, 63700);
  const realZero = budget([]);
  assert.equal(compare(summarize(realZero, options), summarize(realZero, { ...options, month: '2026-09' })).comparable, true);
});

test('comparisons require reviewed same-length elapsed days or two complete months, same currency and chronology', () => {
  const d = fixture();
  const current = summarize(d, { month: '2026-10', asOf: '2026-11-16', through: '2026-10-15' });
  const previous = summarize(d, { month: '2026-09', asOf: '2026-11-16', through: '2026-09-15' });
  assert.equal(compare(current, previous).comparable, true);
  assert.match(compare(current, previous).periodLabel, /15/);
  for (const prior of [summarize(d, { ...options, month: '2026-09' }),
    summarize(d, { ...options, month: '2026-09', through: '2026-09-14' }), current]) {
    const c = compare(current, prior);
    assert.equal(c.comparable, false);
    assert.equal(c.categories.length, 0);
    assert.equal(c.incomeDeltaCents, null);
  }
  const unreviewed = summarize(budget([], false), { ...options, month: '2026-09' });
  assert.equal(compare(current, unreviewed).comparable, false);
  const differentCurrency = { ...previous, currency: 'USD' };
  assert.equal(compare(current, differentCurrency).comparable, false);
});
