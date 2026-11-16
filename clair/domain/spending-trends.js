/* Compare only explicitly reviewed coverage, in the same native currency. */
(function (root) {
  'use strict';
  const E = root.ClairEngine;
  function difference(a, b) {
    const value = a - b;
    if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b) || !Number.isSafeInteger(value))
      throw Error('Écart de montants en centimes invalide.');
    return value;
  }
  function compareMonths(current, previous) {
    const unavailable = (reason) => ({ comparable: false, reason, periodLabel: 'Périodes non comparables',
      categories: [], incomeDeltaCents: null, expenseDeltaCents: null });
    if (!current || !previous) return unavailable('missing-period');
    if (current.period?.status === 'future' || previous.period?.status === 'future') return unavailable('future-period');
    if (!current.quality?.reviewed || !previous.quality?.reviewed) return unavailable('unreviewed-period');
    if (current.quality.unknownRefunds || previous.quality.unknownRefunds) return unavailable('unlinked-refund');
    if (current.currency !== previous.currency) return unavailable('currency-mismatch');
    const a = current.period, b = previous.period;
    if (!a || !b || !E.validDate(a.start) || !E.validDate(b.start) || !E.validDate(a.through) || !E.validDate(b.through))
      return unavailable('invalid-period');
    if (E.monthOffset(a.month, -1) !== b.month) return unavailable('nonconsecutive-periods');
    const days = E.daysBetween(a.start, a.through) + 1;
    const previousDays = E.daysBetween(b.start, b.through) + 1;
    const full = a.status === 'closed' && b.status === 'closed';
    if (!full && days !== previousDays) return unavailable('coverage-mismatch');
    const currentCategories = new Map(current.categories.map((row) => [row.id, row]));
    const previousCategories = new Map(previous.categories.map((row) => [row.id, row]));
    const ids = [...new Set([...currentCategories.keys(), ...previousCategories.keys()])].sort();
    const categories = ids.map((id) => {
      const now = currentCategories.get(id), before = previousCategories.get(id);
      const currentCents = now?.netCents || 0, previousCents = before?.netCents || 0;
      const deltaCents = difference(currentCents, previousCents);
      const percent = previousCents > 0 ? deltaCents / previousCents * 100 : null;
      return { id, currentCents, previousCents, deltaCents,
        percent: percent !== null && Number.isFinite(percent) ? percent : null,
        exceptionalCents: now?.exceptionalCents || 0,
        // A net reduction involving a refund is not proof of changed behaviour.
        refundDriven: Boolean(now?.refundCents || before?.refundCents) };
    });
    return { comparable: true, reason: 'comparable',
      periodLabel: full ? 'Mois complets' : `Du 1 au ${days} de chaque mois`, categories,
      incomeDeltaCents: difference(current.incomeCents, previous.incomeCents),
      expenseDeltaCents: difference(current.netExpenseCents, previous.netExpenseCents) };
  }
  root.ClairSpendingTrends = { compareMonths };
})(typeof window !== 'undefined' ? window : globalThis);
