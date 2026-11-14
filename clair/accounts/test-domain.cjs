const assert = require('node:assert/strict');
const vm = require('node:vm');
const {canonicalEngine, scripts} = require('../../tools/clair/test-support/vm-loader.cjs');
const E = canonicalEngine();
const generated = {Date, Intl, structuredClone};
generated.window = generated;
vm.createContext(generated);
vm.runInContext(scripts()[0], generated);
const budget = E.empty();
budget.initialized = budget.setupDone = true;
budget.openingCents = 123456;
budget.openingBalanceDate = '2027-01-01';
assert.equal(E.balance(budget, '2027-01-01'), 123456);
assert.equal(JSON.stringify(E.normalize(budget)), JSON.stringify(generated.ClairEngine.normalize(budget)));
assert.deepEqual(Object.keys(E), Object.keys(generated.ClairEngine));
for (const code of Object.keys(E.currencies)) {
  assert.equal(E.cents(code === 'XOF' || code === 'XAF' ? '25' : '25,01', code), code === 'XOF' || code === 'XAF' ? 2500 : 2501);
}
console.log('PASS canonical engine and generated HTML: API, exact JSON, eight currencies');
