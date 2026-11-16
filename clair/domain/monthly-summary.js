/* Registered monthly flows only. No sync, inferred labels, storage or network. */
(function (root) {
  'use strict';
  const E = root.ClairEngine;
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const clone = (value) => JSON.parse(JSON.stringify(value));
  function checked(value) {
    if (!Number.isSafeInteger(value)) throw Error('La somme dépasse la capacité des montants en centimes.');
    return value;
  }
  function summarizeMonth(snapshot, { month, asOf = E.today(), through } = {}) {
    if (typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month) || !E.validDate(month + '-01'))
      throw Error('Mois invalide.');
    if (!E.validDate(asOf)) throw Error('Date de référence invalide.');
    if (through !== undefined && (!E.validDate(through) || through.slice(0, 7) !== month))
      throw Error('Date de fin de période invalide.');
    if (!snapshot || !Array.isArray(snapshot.transactions)) throw Error('Budget invalide.');
    const currency = E.currencyCode(snapshot.currency);
    const start = month + '-01';
    const end = month + '-' + String(E.lastDay(month)).padStart(2, '0');
    const future = start > asOf;
    const cutoff = future ? null : [through || end, end, asOf].sort()[0];
    const status = future ? 'future' : cutoff === end ? 'closed' : 'partial';
    const meta = snapshot.adviceSchema === 1 ? snapshot.advice : null;
    const contexts = meta?.transactions || {};
    const review = meta?.months?.[month]?.through;
    const reviewed = Boolean(cutoff && E.validDate(review) && review.slice(0, 7) === month && review >= cutoff && review <= asOf);
    const notes = [];
    if (!meta) notes.push('legacy-unreviewed');
    if (!reviewed) notes.push('unreviewed-period');
    if (future) notes.push('future-period');
    const result = {
      currency, period: { month, start, end, through: cutoff, status },
      incomeCents: 0, expenseCents: 0, refundCents: 0, netExpenseCents: 0, surplusCents: 0,
      savingsCents: 0, transferCents: 0, adjustmentCents: 0, recurringCents: 0,
      categories: [], transactions: [],
      quality: { reviewed, comparable: false, unknownRefunds: 0, unconfirmedAutomaticCount: 0, notes }, goals: [],
    };
    const categories = new Map();
    const rowsById = new Map(snapshot.transactions.map((row) => [row.id, row]));
    const category = (id) => {
      if (!categories.has(id)) categories.set(id, { id, expenseCents: 0, refundCents: 0, netCents: 0, exceptionalCents: 0, count: 0 });
      return categories.get(id);
    };
    const add = (target, key, value) => { target[key] = checked(target[key] + value); };
    for (const row of snapshot.transactions) {
      if (!E.validDate(row.date)) throw Error('Date d’opération invalide.');
      if (!cutoff || row.date < start || row.date > cutoff) continue;
      const amount = checked(row.amountCents);
      if (amount < 0 || (E.currencies[currency].digits === 0 && amount % 100 !== 0))
        throw Error('Montant invalide : les francs CFA doivent être entiers.');
      const context = own(contexts, row.id) ? contexts[row.id] : undefined;
      const included = clone(row);
      if (context) included.context = clone(context);
      result.transactions.push(included);
      const recurring = Boolean(row.autoKey || row.ruleId || row.fixedExpenseId);
      if (recurring && !row.paymentConfirmed) result.quality.unconfirmedAutomaticCount += 1;
      const incoming = row.type === 'income';
      // Savings are already identified by the canonical ledger category.
      if (row.categoryId === 'epargne') {
        add(result, 'savingsCents', incoming ? -amount : amount);
        continue;
      }
      const nature = context?.nature || (incoming ? 'income' : 'expense');
      if (nature === 'transfer' || nature === 'adjustment') {
        add(result, nature === 'transfer' ? 'transferCents' : 'adjustmentCents', incoming ? amount : -amount);
        continue;
      }
      if (nature === 'refund') {
        if (!incoming) throw Error('Un remboursement doit être une entrée.');
        const original = rowsById.get(context.refundOf);
        const originalNature = original && contexts[original.id]?.nature;
        const linked = original?.type === 'expense' && original.categoryId !== 'epargne' &&
          (!originalNature || originalNature === 'expense');
        const bucket = category(linked ? original.categoryId : 'non-classee');
        add(result, 'refundCents', amount);
        add(bucket, 'refundCents', amount);
        bucket.count += 1;
        if (!linked) result.quality.unknownRefunds += 1;
        continue;
      }
      if (!['income', 'expense'].includes(nature) || (nature === 'income') !== incoming)
        throw Error('Nature d’opération incompatible avec son sens.');
      if (incoming) { add(result, 'incomeCents', amount); continue; }
      add(result, 'expenseCents', amount);
      const bucket = category(row.categoryId || 'non-classee');
      add(bucket, 'expenseCents', amount);
      bucket.count += 1;
      if (context?.exceptional === true) add(bucket, 'exceptionalCents', amount);
      if (recurring) {
        add(result, 'recurringCents', amount);
      }
    }
    result.netExpenseCents = checked(result.expenseCents - result.refundCents);
    result.surplusCents = checked(result.incomeCents - result.netExpenseCents);
    result.categories = [...categories.values()].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    result.categories.forEach((row) => { row.netCents = checked(row.expenseCents - row.refundCents); });
    if (result.quality.unknownRefunds) notes.push('unlinked-refund');
    if (result.quality.unconfirmedAutomaticCount) notes.push('unconfirmed-automatic');
    result.quality.comparable = reviewed && result.quality.unknownRefunds === 0;
    const overrides = snapshot.budgetOverrides?.[month] || {};
    const targets = { ...(snapshot.budgets || {}), ...overrides };
    const evidence = meta?.goals?.[month] || {};
    for (const id of Object.keys(targets).sort()) {
      const amountCents = E.cents(targets[id], currency);
      const record = evidence[id];
      const setOn = E.validDate(record?.setOn) ? record.setOn : null;
      result.goals.push({ categoryId: id, amountCents, setOn,
        verified: Boolean(own(overrides, id) && record?.amountCents === amountCents && setOn && setOn <= start) });
    }
    return result;
  }
  root.ClairMonthlySummary = { summarizeMonth };
})(typeof window !== 'undefined' ? window : globalThis);
