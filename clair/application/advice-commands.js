(function (root) {
  'use strict';
  const E = root.ClairEngine;
  function context(d) {
    if (d.adviceSchema !== undefined && d.adviceSchema !== 1)
      throw Error('Mets Clair à jour pour modifier les conseils.');
    if (d.advice === undefined) d.advice = {};
    if (!d.advice || typeof d.advice !== 'object' || Array.isArray(d.advice))
      throw Error('Données CLAIR Conseils invalides.');
    for (const field of ['transactions', 'months', 'goals'])
      if (d.advice[field] === undefined) d.advice[field] = {};
    if (d.advice.location === undefined) d.advice.location = { country: '', city: '' };
    d.adviceSchema = 1;
    return d.advice;
  }
  function monthValid(m) {
    return typeof m === 'string' && /^\d{4}-\d{2}$/.test(m) && E.validDate(m + '-01');
  }
  function annotateTransaction(d, id, value) {
    if (!d.transactions.some((t) => t.id === id)) throw Error('Cette opération n’existe plus.');
    const a = context(d);
    if (value === null) delete a.transactions[id];
    else a.transactions[id] = structuredClone(value);
  }
  function reviewMonth(d, month, through) {
    if (
      !monthValid(month) ||
      !E.validDate(through) ||
      through.slice(0, 7) !== month ||
      through > E.today()
    )
      throw Error('Cette période ne peut pas encore être confirmée.');
    context(d).months[month] = { through };
  }
  function setMonthlyGoal(d, { month, categoryId, amountCents, setOn = E.today() }) {
    if (
      !monthValid(month) ||
      !E.safeId(categoryId) ||
      categoryId === 'epargne' ||
      !Number.isSafeInteger(amountCents) ||
      amountCents <= 0 ||
      amountCents > 10000000000 ||
      !E.validDate(setOn) ||
      (E.currencies[d.currency].digits === 0 && amountCents % 100)
    )
      throw Error('Repère mensuel invalide.');
    const a = context(d);
    if (!d.budgetOverrides[month]) d.budgetOverrides[month] = {};
    d.budgetOverrides[month][categoryId] = amountCents / 100;
    if (!a.goals[month]) a.goals[month] = {};
    a.goals[month][categoryId] = { amountCents, setOn };
  }
  function setLocation(d, { country = '', city = '' }) {
    if (
      typeof country !== 'string' ||
      (country !== '' && !/^[A-Z]{2}$/.test(country)) ||
      typeof city !== 'string' ||
      city.length > 100
    )
      throw Error('Pays ou ville invalide.');
    context(d).location = { country, city: city.trim() };
  }
  root.ClairAdviceCommands = Object.freeze({
    annotateTransaction,
    reviewMonth,
    setMonthlyGoal,
    setLocation,
  });
})(typeof window !== 'undefined' ? window : globalThis);
