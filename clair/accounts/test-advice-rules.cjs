const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { canonicalEngine } = require('../../tools/clair/test-support/vm-loader.cjs');
const E = canonicalEngine();
const context = vm.createContext({ ClairEngine: E, Date, Intl, structuredClone });
for (const file of ['monthly-summary', 'spending-trends', 'advice-rules']) {
  const source = path.join(__dirname, '../domain', file + '.js');
  if (fs.existsSync(source)) vm.runInContext(fs.readFileSync(source, 'utf8'), context);
}
function summary(extra = {}) {
  return { currency: 'EUR', period: { month: '2026-10', start: '2026-10-01', end: '2026-10-31', through: '2026-10-31', status: 'closed' },
    incomeCents: 105000, expenseCents: 77700, refundCents: 0, netExpenseCents: 77700, surplusCents: 27300,
    savingsCents: 0, transferCents: 0, adjustmentCents: 0, recurringCents: 0,
    categories: [{ id: 'food', expenseCents: 18500, refundCents: 0, netCents: 18500, exceptionalCents: 0, count: 6 }],
    transactions: [], goals: [], quality: { reviewed: true, comparable: true, unknownRefunds: 0, unconfirmedAutomaticCount: 0, notes: [] }, ...extra };
}
function comparison(extra = {}) {
  return { comparable: true, reason: 'comparable', periodLabel: 'mois complets', incomeDeltaCents: 0, expenseDeltaCents: 4500,
    categories: [{ id: 'food', currentCents: 18500, previousCents: 14000, deltaCents: 4500, percent: 32.142857142857146, exceptionalCents: 0, refundDriven: false }], ...extra };
}
function advice(s = summary(), c = comparison()) {
  assert.ok(context.ClairAdviceRules, 'local advice module must explain registered facts');
  return context.ClairAdviceRules.buildAdvice({ summary: s, comparison: c });
}

test('significant food increase explains exact +4500 without inventing a cause or goal', () => {
  const rows = advice();
  const food = rows.find(x => x.kind === 'category-increase');
  assert.equal(food.amountCents, 4500);
  assert.ok(food.finding.includes(E.formatMoney(4500, 'EUR')));
  assert.equal(food.suggestedGoalCents, null);
  assert.equal(food.action.type, 'category');
  assert.equal(food.action.categoryId, 'food');
  assert.ok(food.title && food.explanation && food.recommendation);
});

test('explicit exception optionally proposes 14000 while retaining full 18500 spending', () => {
  const s = summary(); s.categories[0].exceptionalCents = 4500;
  const c = comparison(); c.categories[0].exceptionalCents = 4500;
  const before = JSON.stringify({ s, c });
  const rows = advice(s, c);
  const food = rows.find(x => x.kind === 'category-increase');
  assert.equal(food.suggestedGoalCents, 14000);
  assert.equal(food.amountCents, 4500);
  assert.equal(JSON.stringify({ s, c }), before);
  s.categories[0].exceptionalCents = 18500;
  assert.equal(advice(s, c).find(x => x.kind === 'category-increase').suggestedGoalCents, null);
  s.categories[0].exceptionalCents = 4500;
  s.categories[0].refundCents = 1000;
  assert.equal(advice(s, c).find(x => x.kind === 'category-increase').suggestedGoalCents, null);
});

test('category increases require both personal materiality thresholds and a reliable comparison', () => {
  for (const row of [{ currentCents: 18500, previousCents: 18000, deltaCents: 500, percent: 2.7777777777777777 },
    { currentCents: 1000, previousCents: 100, deltaCents: 900, percent: 900 },
    { currentCents: 18500, previousCents: 0, deltaCents: 18500, percent: null }]) {
    assert.equal(advice(summary(), comparison({ categories: [{ id: 'food', exceptionalCents: 0, ...row }] })).length, 0);
  }
  assert.equal(advice(summary(), comparison({ comparable: false, categories: [] })).length, 0);
});

test('negative registered result asks to verify income and ledger without claiming bank overdraft', () => {
  const row = advice(summary({ incomeCents: 0, surplusCents: -77700 }), { comparable: false }).find(x => x.kind === 'imbalance');
  assert.equal(row.action.type, 'ledger');
  assert.equal(row.amountCents, 77700);
  assert.match(row.recommendation, /revenus/i);
  assert.doesNotMatch(row.finding, /découvert/i);
});

test('goal overspend requires reviewed coverage and a verified dated target', () => {
  const s = summary({ goals: [{ categoryId: 'food', amountCents: 14000, setOn: '2026-09-30', verified: true }] });
  assert.equal(advice(s, { comparable: false }).find(x => x.kind === 'goal-overspend').amountCents, 4500);
  s.goals[0].verified = false;
  assert.equal(advice(s, { comparable: false }).length, 0);
  s.goals[0].verified = true; s.quality.reviewed = false;
  assert.equal(advice(s, { comparable: false }).length, 0);
});

test('recurring registered obligations use positive earned income and a 40 percent threshold', () => {
  assert.ok(advice(summary({ recurringCents: 42000 }), { comparable: false }).some(x => x.kind === 'recurring'));
  assert.equal(advice(summary({ recurringCents: 41999 }), { comparable: false }).length, 0);
  assert.equal(advice(summary({ recurringCents: 42000, incomeCents: 0 }), { comparable: false }).length, 0);
});

test('only positive identified net savings earns a savings finding', () => {
  assert.equal(advice(summary({ savingsCents: 8000 }), { comparable: false }).find(x => x.kind === 'savings').amountCents, 8000);
  assert.equal(advice(summary({ savingsCents: -2000 }), { comparable: false }).length, 0);
  assert.equal(advice(summary(), { comparable: false }).length, 0);
});

test('decreases stay factual and refunds cannot manufacture behavioural praise', () => {
  const c = comparison({ categories: [{ id: 'food', currentCents: 14000, previousCents: 18500, deltaCents: -4500, percent: -24.324324324324323, exceptionalCents: 0, refundDriven: false }] });
  const s = summary(); s.categories[0] = { id: 'food', expenseCents: 14000, refundCents: 0, netCents: 14000, exceptionalCents: 0, count: 2 };
  assert.ok(advice(s, c).some(x => x.kind === 'category-decrease'));
  s.categories[0].refundCents = 4500;
  c.categories[0].refundDriven = true;
  assert.equal(advice(s, c).length, 0);
});

test('advice is stable, limited to three meaningful priorities and reports uncertainty', () => {
  const s = summary({ surplusCents: -500, recurringCents: 50000, savingsCents: 8000,
    goals: [{ categoryId: 'food', amountCents: 14000, setOn: '2026-09-30', verified: true }] });
  const before = JSON.stringify(s);
  const first = advice(s);
  assert.equal(first.length, 3);
  assert.deepEqual(Array.from(first, x => x.kind), ['imbalance', 'goal-overspend', 'category-increase']);
  assert.equal(JSON.stringify(first), JSON.stringify(advice(s)));
  assert.equal(JSON.stringify(s), before);
  s.quality = { reviewed: false, comparable: false, unknownRefunds: 1, unconfirmedAutomaticCount: 0, notes: ['unreviewed-period', 'unlinked-refund'] };
  const uncertain = advice(s, { comparable: false });
  assert.equal(uncertain[0].quality.reviewed, false);
  assert.equal(uncertain[0].quality.unknownRefunds, 1);
  assert.match(uncertain[0].explanation, /enregistr|vérifi/i);
});

test('every currency uses its supplied formatter and future months produce no advice', () => {
  for (const currency of ['EUR', 'XOF', 'XAF', 'USD', 'GBP', 'MAD', 'CAD', 'CHF']) {
    assert.ok(advice(summary({ currency }))[0].finding.includes(E.formatMoney(4500, currency)));
  }
  assert.equal(advice(summary({ surplusCents: -500, period: { status: 'future' } })).length, 0);
});

test('real module pipeline preserves canonical spending and optional exception proposal', () => {
  assert.ok(context.ClairMonthlySummary && context.ClairSpendingTrends, 'real summary and trends required');
  const d = E.empty();
  d.transactions = [
    { id: 'old', type: 'expense', date: '2026-09-15', categoryId: 'food', amountCents: 14000 },
    { id: 'regular', type: 'expense', date: '2026-10-15', categoryId: 'food', amountCents: 14000 },
    { id: 'exception', type: 'expense', date: '2026-10-16', categoryId: 'food', amountCents: 4500 },
  ];
  d.adviceSchema = 1;
  d.advice = { transactions: { exception: { exceptional: true } }, goals: {}, months: {
    '2026-09': { through: '2026-09-30' }, '2026-10': { through: '2026-10-31' },
  } };
  const s = context.ClairMonthlySummary.summarizeMonth(d, { month: '2026-10', asOf: '2026-11-16' });
  const previous = context.ClairMonthlySummary.summarizeMonth(d, { month: '2026-09', asOf: '2026-11-16' });
  const c = context.ClairSpendingTrends.compareMonths(s, previous);
  const increase = advice(s, c).find(x => x.kind === 'category-increase');
  assert.equal(s.expenseCents, 18500);
  assert.equal(increase.amountCents, 4500);
  assert.equal(increase.suggestedGoalCents, 14000);
});
