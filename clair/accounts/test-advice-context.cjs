const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
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
