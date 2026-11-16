/**
 * JSON v3 budget. Money fields ending in Cents are integer hundredths;
 * dates are civil YYYY-MM-DD values, interpreted by the Paris calendar.
 * normalize returns a fresh validated budget; sync mutates its caller-owned draft.
 * This module has no storage, DOM, account or network dependency.
 */
/* Clair — calculs en centimes, dates civiles, aucune requête réseau. */
(function (root) {
  'use strict';
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const safeId = (x) =>
    typeof x === 'string' &&
    /^[a-zA-Z0-9_-]{1,100}$/.test(x) &&
    !['__proto__', 'constructor', 'prototype'].includes(x);
  const KEY_RE = /^[a-zA-Z0-9_-]+:\d{4}-\d{2}-\d{2}$/;
  // Money stays in integer hundredths for compatibility with existing budgets.
  // CFA inputs and stored amounts must be whole francs; no exchange rate is applied.
  const currencies = Object.freeze({
    EUR: Object.freeze({ label: 'Euro (EUR)', unit: '€', spoken: 'euros', digits: 2 }),
    XOF: Object.freeze({
      label: 'Franc CFA — Afrique de l’Ouest (XOF)',
      unit: 'F CFA',
      spoken: 'francs CFA XOF',
      digits: 0,
    }),
    XAF: Object.freeze({
      label: 'Franc CFA — Afrique centrale (XAF)',
      unit: 'F CFA',
      spoken: 'francs CFA XAF',
      digits: 0,
    }),
    USD: Object.freeze({
      label: 'Dollar américain (USD)',
      unit: '$US',
      spoken: 'dollars américains',
      digits: 2,
    }),
    GBP: Object.freeze({ label: 'Livre sterling (GBP)', unit: '£', spoken: 'livres sterling', digits: 2 }),
    MAD: Object.freeze({
      label: 'Dirham marocain (MAD)',
      unit: 'DH',
      spoken: 'dirhams marocains',
      digits: 2,
    }),
    CAD: Object.freeze({
      label: 'Dollar canadien (CAD)',
      unit: '$CA',
      spoken: 'dollars canadiens',
      digits: 2,
    }),
    CHF: Object.freeze({ label: 'Franc suisse (CHF)', unit: 'CHF', spoken: 'francs suisses', digits: 2 }),
  });
  function currencyCode(value) {
    if (value === undefined) return 'EUR';
    if (typeof value !== 'string' || !Object.prototype.hasOwnProperty.call(currencies, value))
      throw Error('Devise non prise en charge. Mets Clair à jour ou utilise une sauvegarde compatible.');
    return value;
  }
  /* BEGIN GENERATED COMPATIBILITY exchange.js */
  // Frozen European Commission InforEuro accounting reference, November 2026.
  // Exact EUR-base integers (scale 100000); provenance: exchange-rates-v2.json.
  const exchangePolicy = Object.freeze({
    id: 'inforeuro-2026-11',
    period: 'novembre 2026',
    perEuro: Object.freeze({
      EUR: 100000,
      USD: 111300,
      GBP: 83578,
      MAD: 1098365,
      CAD: 155770,
      CHF: 92220,
      XOF: 65595700,
      XAF: 65595700,
    }),
  });
  function exchangeRate(from, to) {
    from = currencyCode(from);
    to = currencyCode(to);
    if (from === to) return 1;
    if (!own(exchangePolicy.perEuro, from) || !own(exchangePolicy.perEuro, to))
      throw Error(
        'Aucun taux de change vérifié n’est disponible pour cette devise. Ton budget est conservé.',
      );
    return exchangePolicy.perEuro[to] / exchangePolicy.perEuro[from];
  }
  function exchangeAmount(value, from, to) {
    if (!Number.isSafeInteger(value)) throw Error('Montant invalide pour la conversion.');
    from = currencyCode(from);
    to = currencyCode(to);
    exchangeRate(from, to);
    if (from === to) {
      if (Math.abs(value) > 10000000000) throw Error('Un montant converti dépasse la capacité du budget.');
      return value;
    }
    const q = currencies[currencyCode(to)].digits === 0 ? 100n : 1n;
    const a = BigInt(Math.abs(value)) * BigInt(exchangePolicy.perEuro[currencyCode(to)]),
      b = BigInt(exchangePolicy.perEuro[currencyCode(from)]) * q;
    const result = Number(((a * 2n + b) / (2n * b)) * q) * (value < 0 ? -1 : 1);
    if (!Number.isSafeInteger(result) || Math.abs(result) > 10000000000)
      throw Error('Un montant converti dépasse la capacité du budget.');
    if (value !== 0 && result === 0)
      throw Error(
        'Un montant est trop faible pour être conservé dans cette devise. La conversion est annulée.',
      );
    return result;
  }
  function convertCurrency(input, to, asOf = today()) {
    const d = normalize(input),
      from = d.currency;
    to = currencyCode(to);
    if (to === from) return d;
    if (!d.initialized || !validDate(asOf)) throw Error('Configure ton budget avant de changer sa devise.');
    const out = JSON.parse(JSON.stringify(d)),
      convert = (n) => exchangeAmount(n, from, to),
      major = (n) => convert(cents(n, from)) / 100;
    out.currency = to;
    out.currencyRevision = (d.currencyRevision || 0) + 1;
    out.openingCents = convert(d.openingCents);
    out.transactions.forEach((t) => {
      t.amountCents = convert(t.amountCents);
    });
    out.rules.forEach((r) => {
      r.amountCents = convert(r.amountCents);
      r.amounts = r.amounts.map(convert);
    });
    out.savingsProjects.forEach((p) => {
      p.targetCents = convert(p.targetCents);
    });
    out.fixedExpenses.forEach((x) => {
      x.amount = major(x.amount);
    });
    out.savingsGoal = major(d.savingsGoal);
    out.budgets = Object.fromEntries(Object.entries(d.budgets).map(([k, n]) => [k, major(n)]));
    out.budgetOverrides = Object.fromEntries(
      Object.entries(d.budgetOverrides).map(([m, o]) => [
        m,
        Object.fromEntries(Object.entries(o).map(([k, n]) => [k, major(n)])),
      ]),
    );
    if (out.adviceSchema === 1) {
      for (const [month, goals] of Object.entries(out.advice.goals))
        for (const [categoryId, goal] of Object.entries(goals)) {
          const previousOverride = d.budgetOverrides[month];
          if (!previousOverride || !own(previousOverride, categoryId) ||
            goal.amountCents !== cents(previousOverride[categoryId], from)) {
            delete goals[categoryId];
          } else {
            // Preserve proven evidence; rounding must never revive stale evidence.
            goal.amountCents = cents(out.budgetOverrides[month][categoryId], to);
          }
        }
      // Independent rounding can put split refunds above their rounded original.
      // Preserve every converted ledger amount; disclose those refunds as unlinked.
      const rows = new Map(out.transactions.map((t) => [t.id, t])), groups = new Map();
      for (const [id, context] of Object.entries(out.advice.transactions)) {
        if (!context.refundOf) continue;
        if (!groups.has(context.refundOf)) groups.set(context.refundOf, { total: 0n, ids: [] });
        const group = groups.get(context.refundOf);
        group.total += BigInt(rows.get(id).amountCents);
        group.ids.push(id);
      }
      for (const [originalId, group] of groups) {
        const original = rows.get(originalId);
        if (group.total <= BigInt(original.amountCents)) continue;
        delete out.advice.months[original.date.slice(0, 7)];
        for (const id of group.ids) {
          delete out.advice.transactions[id].refundOf;
          delete out.advice.months[rows.get(id).date.slice(0, 7)];
        }
      }
    }
    // Reconcile the rounded ledger with the directly converted balance today.
    out.openingCents += convert(balance(d, asOf)) - balance(out, asOf);
    return normalize(out);
  }
  /* END GENERATED COMPATIBILITY exchange.js */
  const moneyFormats = new Map();
  function formatMoney(value, code = 'EUR') {
    code = currencyCode(code);
    if (!moneyFormats.has(code))
      moneyFormats.set(code, new Intl.NumberFormat('fr-FR', { style: 'currency', currency: code }));
    return moneyFormats.get(code).format(value / 100);
  }
  function inputAmount(value, code = 'EUR') {
    return (value / 100).toFixed(currencies[currencyCode(code)].digits).replace('.', ',');
  }
  function validateCurrency(d) {
    const code = currencyCode(d.currency);
    if (currencies[code].digits !== 0) return;
    const check = (n) => {
      if (!Number.isSafeInteger(n) || n % 100 !== 0)
        throw Error('Les montants en francs CFA doivent être des nombres entiers.');
    };
    check(d.openingCents);
    d.transactions.forEach((t) => check(t.amountCents));
    d.rules.forEach((r) => {
      check(r.amountCents);
      r.amounts.forEach(check);
    });
    d.savingsProjects.forEach((p) => check(p.targetCents));
    Object.values(d.budgets).forEach((n) => check(cents(n, code)));
    Object.values(d.budgetOverrides).forEach((o) => Object.values(o).forEach((n) => check(cents(n, code))));
    check(cents(d.savingsGoal, code));
    d.fixedExpenses.forEach((x) => check(cents(x.amount, code)));
  }

  function cents(value, currency = 'EUR') {
    const s = String(value ?? '')
      .trim()
      .replace(/\s/g, '')
      .replace(',', '.');
    if (!/^-?\d+(\.\d{1,2})?$/.test(s)) throw Error('Montant invalide : utilisez au maximum deux décimales.');
    const n = Math.round(Number(s) * 100);
    if (!Number.isSafeInteger(n) || Math.abs(n) > 10000000000) throw Error('Montant trop élevé.');
    if (currencies[currencyCode(currency)].digits === 0 && n % 100 !== 0)
      throw Error('Indique un montant entier en francs CFA, sans décimales.');
    return n;
  }
  function validDate(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(s + 'T12:00:00Z');
    return (
      Number.isFinite(+d) && d.toISOString().slice(0, 10) === s && s >= '2000-01-01' && s <= '2100-12-31'
    );
  }
  function addDays(s, n) {
    return new Date(+new Date(s + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);
  }
  function daysBetween(a, b) {
    return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);
  }
  function dateAt(instant) {
    const d = instant instanceof Date ? new Date(instant.getTime()) : new Date(instant);
    if (
      !Number.isFinite(+d) ||
      (typeof instant === 'string' &&
        (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(instant) || d.toISOString() !== instant))
    )
      throw Error('Date ou instant invalide.');
    const p = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d);
    const get = (k) => p.find((x) => x.type === k).value;
    const date = `${get('year')}-${get('month')}-${get('day')}`;
    if (!validDate(date)) throw Error('Date ou instant hors des limites de Clair.');
    return date;
  }
  function today() {
    return dateAt(new Date());
  }
  function lastDay(month) {
    const [y, m] = month.split('-').map(Number);
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
  }
  function monthOffset(month, n) {
    const [y, m] = month.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
  }
  const text = (x) => String(x ?? '').slice(0, 300);
  const THEMES = ['light', 'dark', 'auto'],
    WALLPAPERS = ['plain', 'aurora', 'ocean', 'sunset', 'forest', 'photo'],
    PHOTO_MAX_BYTES = 1800000;
  const defaultPrefs = () => ({
    theme: 'auto',
    wallpaper: 'plain',
    photo: null,
    reminders: true,
    guideVersion: 0,
    profileName: '',
    dailyGoal: null,
  });
  function normalizeExpress(value) {
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      value.source !== 'express' ||
      typeof value.createdAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.createdAt) ||
      !Number.isFinite(Date.parse(value.createdAt)) ||
      new Date(value.createdAt).toISOString() !== value.createdAt ||
      !own(currencies, value.originalCurrency) ||
      value.accountId !== 'current-budget' ||
      !safeId(value.idempotencyKey)
    )
      throw Error('Métadonnées Express invalides.');
    dateAt(value.createdAt);
    return {
      source: 'express',
      createdAt: value.createdAt,
      originalCurrency: value.originalCurrency,
      accountId: 'current-budget',
      idempotencyKey: value.idempotencyKey,
    };
  }
  function normPrefs(p) {
    p = p && typeof p === 'object' && !Array.isArray(p) ? p : {};
    const prefix = 'data:image/jpeg;base64,';
    let photo = null;
    if (
      typeof p.photo === 'string' &&
      p.photo.startsWith(prefix) &&
      p.photo.length <= prefix.length + Math.ceil(PHOTO_MAX_BYTES / 3) * 4
    ) {
      const b = p.photo.slice(prefix.length);
      if (
        b.length % 4 === 0 &&
        /^[A-Za-z0-9+/]+={0,2}$/.test(b) &&
        Math.floor((b.length * 3) / 4) - (b.match(/=+$/)?.[0].length || 0) <= PHOTO_MAX_BYTES
      )
        photo = p.photo;
    }
    let wallpaper = WALLPAPERS.includes(p.wallpaper) ? p.wallpaper : 'plain';
    if (wallpaper === 'photo' && !photo) wallpaper = 'plain';
    let dailyGoal = null;
    const goal = p.dailyGoal;
    if (
      goal &&
      typeof goal === 'object' &&
      !Array.isArray(goal) &&
      Object.hasOwn(currencies, goal.currency) &&
      Number.isSafeInteger(goal.amountCents) &&
      goal.amountCents > 0 &&
      goal.amountCents <= 10000000000 &&
      (currencies[goal.currency].digits !== 0 || goal.amountCents % 100 === 0)
    )
      dailyGoal = { currency: goal.currency, amountCents: goal.amountCents };
    let express;
    if (own(p, 'express')) {
      if (
        !p.express ||
        typeof p.express !== 'object' ||
        Array.isArray(p.express) ||
        p.express.defaultAccountId !== 'current-budget'
      )
        throw Error('Préférences Express invalides.');
      express = { defaultAccountId: 'current-budget' };
    }
    return {
      ...(express ? { express } : {}),
      theme: THEMES.includes(p.theme) ? p.theme : 'auto',
      wallpaper,
      photo,
      reminders: p.reminders !== false,
      guideVersion: p.guideVersion === 1 ? 1 : 0,
      profileName: typeof p.profileName === 'string' ? p.profileName.trim().slice(0, 64) : '',
      dailyGoal,
    };
  }
  const empty = () => ({
    version: 3,
    currency: 'EUR',
    initialized: false,
    setupDone: false,
    openingCents: 0,
    openingBalanceDate: today(),
    transactions: [],
    rules: [],
    skipped: [],
    budgets: {},
    budgetOverrides: {},
    customCategories: [],
    savingsGoal: 0,
    savingsSchema: 1,
    savingsProjects: [],
    fixedExpenses: [],
    preferences: defaultPrefs(),
  });
  const savingsKinds = ['voyage', 'etudes', 'securite', 'achat', 'autre'];
  const savingsIcons = ['plane', 'book', 'shield', 'bag', 'heart', 'home', 'star'];
  const savingsColors = ['violet', 'blue', 'green', 'rose', 'amber'];
  function savingsBalance(d, projectId, date = today()) {
    return d.transactions
      .filter((t) => t.categoryId === 'epargne' && t.savingsProjectId === projectId && t.date <= date)
      .reduce((n, t) => n + (t.type === 'income' ? -t.amountCents : t.amountCents), 0);
  }
  function validateSavings(d) {
    if (d.transactions.some((t) => t.categoryId === 'epargne' && !t.savingsProjectId))
      throw Error('Choisis un projet pour chaque mouvement d’épargne.');
    const projects = new Set((d.savingsProjects || []).map((p) => p.id)),
      totals = new Map();
    const moves = d.transactions
      .filter((t) => t.savingsProjectId)
      .map((t, i) => ({ t, i }))
      .sort((a, b) => a.t.date.localeCompare(b.t.date) || a.i - b.i);
    for (const { t } of moves) {
      if (!projects.has(t.savingsProjectId) || t.categoryId !== 'epargne')
        throw Error('Le projet de cette opération d’épargne est introuvable.');
      const value =
        (totals.get(t.savingsProjectId) || 0) + (t.type === 'income' ? -t.amountCents : t.amountCents);
      if (value < 0)
        throw Error('Cette modification retirerait plus que l’épargne disponible dans ce projet.');
      totals.set(t.savingsProjectId, value);
    }
  }
  function normalizeSavings(input, d) {
    if (input.savingsSchema !== undefined && input.savingsSchema !== 1)
      throw Error('Cette épargne demande une version plus récente de Clair.');
    if (input.savingsProjects !== undefined && !Array.isArray(input.savingsProjects))
      throw Error('Liste des projets d’épargne invalide.');
    if ((input.savingsProjects || []).length > 100) throw Error('La limite est de 100 projets d’épargne.');
    const ids = new Set();
    d.savingsProjects = (input.savingsProjects || []).map((p) => {
      if (
        !p ||
        !safeId(p.id) ||
        ids.has(p.id) ||
        typeof p.name !== 'string' ||
        !p.name.trim() ||
        p.name.length > 80 ||
        !Number.isSafeInteger(p.targetCents) ||
        p.targetCents < 0 ||
        p.targetCents > 10000000000 ||
        (p.targetDate && !validDate(p.targetDate))
      )
        throw Error('Projet d’épargne invalide.');
      ids.add(p.id);
      return {
        id: p.id,
        name: p.name.trim(),
        kind: savingsKinds.includes(p.kind) ? p.kind : 'autre',
        icon: savingsIcons.includes(p.icon) ? p.icon : 'star',
        color: savingsColors.includes(p.color) ? p.color : 'violet',
        targetCents: p.targetCents,
        targetDate: p.targetDate || null,
        archived: Boolean(p.archived),
      };
    });
    const unassigned = d.transactions.filter((t) => t.categoryId === 'epargne' && !t.savingsProjectId);
    if (
      unassigned.length ||
      (!d.savingsProjects.length && d.savingsGoal > 0) ||
      (Array.isArray(input.rules) && input.rules.some((r) => r?.categoryId === 'epargne'))
    ) {
      if (!ids.has('savings-legacy')) {
        if (d.savingsProjects.length >= 100)
          throw Error('Un projet supplémentaire est nécessaire pour conserver l’ancienne épargne.');
        d.savingsProjects.push({
          id: 'savings-legacy',
          name: 'Mon épargne',
          kind: 'autre',
          icon: 'star',
          color: 'violet',
          targetCents: cents(d.savingsGoal),
          targetDate: null,
          archived: false,
        });
      }
      unassigned.forEach((t) => {
        t.savingsProjectId = 'savings-legacy';
      });
    }
    validateSavings(d);
  }
  function moneyMap(o, currency) {
    const result = {};
    if (o && typeof o === 'object' && !Array.isArray(o))
      for (const [k, v] of Object.entries(o)) {
        if (safeId(k)) {
          const n = cents(v, currency);
          if (n >= 0) result[k] = n / 100;
        }
      }
    return result;
  }
  function normalizeAdvice(value, d) {
    const fail = () => {
      throw Error('Données CLAIR Conseils invalides.');
    };
    const object = (v) => {
      if (v === undefined) return {};
      if (!v || typeof v !== 'object' || Array.isArray(v)) fail();
      return v;
    };
    const fields = (v, allowed) => {
      if (Object.keys(v).some((k) => !allowed.includes(k))) fail();
    };
    const monthKey = (m) => /^\d{4}-\d{2}$/.test(m) && validDate(m + '-01');
    const source = object(value);
    fields(source, ['transactions', 'months', 'goals', 'location']);
    const out = { transactions: {}, months: {}, goals: {}, location: { country: '', city: '' } },
      txs = new Map(d.transactions.map((t) => [t.id, t]));
    const annotations = object(source.transactions);
    if (Object.keys(annotations).length > 50000) fail();
    for (const [id, raw] of Object.entries(annotations)) {
      if (!safeId(id) || !txs.has(id)) fail();
      const v = object(raw),
        t = txs.get(id);
      fields(v, ['nature', 'exceptional', 'refundOf']);
      const n = v.nature;
      if (n !== undefined && !['income', 'expense', 'refund', 'transfer', 'adjustment'].includes(n))
        fail();
      if (n && t.categoryId === 'epargne') fail();
      if (
        ((n === 'refund' || n === 'income') && t.type !== 'income') ||
        (n === 'expense' && t.type !== 'expense')
      )
        fail();
      if (v.exceptional !== undefined && typeof v.exceptional !== 'boolean') fail();
      if (
        v.exceptional &&
        (t.type !== 'expense' || t.categoryId === 'epargne' || (n && n !== 'expense'))
      )
        fail();
      if (v.refundOf !== undefined && (n !== 'refund' || !safeId(v.refundOf))) fail();
      out.transactions[id] = {
        ...(n ? { nature: n } : {}),
        ...(v.exceptional !== undefined ? { exceptional: v.exceptional } : {}),
        ...(v.refundOf ? { refundOf: v.refundOf } : {}),
      };
    }
    const refunds = new Map();
    for (const [id, v] of Object.entries(out.transactions))
      if (v.refundOf) {
        const original = txs.get(v.refundOf),
          t = txs.get(id),
          c = out.transactions[v.refundOf];
        if (
          !original ||
          original.type !== 'expense' ||
          original.categoryId === 'epargne' ||
          original.date > t.date ||
          ['transfer', 'adjustment'].includes(c?.nature)
        )
          fail();
        const total = (refunds.get(original.id) || 0) + t.amountCents;
        if (!Number.isSafeInteger(total) || total > original.amountCents) fail();
        refunds.set(original.id, total);
      }
    const months = object(source.months);
    if (Object.keys(months).length > 2400) fail();
    for (const [m, raw] of Object.entries(months)) {
      const v = object(raw);
      fields(v, ['through']);
      if (!monthKey(m) || !validDate(v.through) || v.through.slice(0, 7) !== m) fail();
      out.months[m] = { through: v.through };
    }
    const goals = object(source.goals);
    if (Object.keys(goals).length > 2400) fail();
    for (const [m, raw] of Object.entries(goals)) {
      if (!monthKey(m)) fail();
      const entries = object(raw);
      if (Object.keys(entries).length > 200) fail();
      out.goals[m] = {};
      for (const [categoryId, rawGoal] of Object.entries(entries)) {
        const v = object(rawGoal);
        fields(v, ['amountCents', 'setOn']);
        if (
          !safeId(categoryId) ||
          categoryId === 'epargne' ||
          !Number.isSafeInteger(v.amountCents) ||
          v.amountCents <= 0 ||
          v.amountCents > 10000000000 ||
          !validDate(v.setOn) ||
          (currencies[d.currency].digits === 0 && v.amountCents % 100)
        )
          fail();
        out.goals[m][categoryId] = { amountCents: v.amountCents, setOn: v.setOn };
      }
    }
    const place = object(source.location);
    fields(place, ['country', 'city']);
    if (
      place.country !== undefined &&
      (typeof place.country !== 'string' ||
        (place.country !== '' && !/^[A-Z]{2}$/.test(place.country)))
    )
      fail();
    if (place.city !== undefined && (typeof place.city !== 'string' || place.city.length > 100))
      fail();
    out.location = { country: place.country || '', city: (place.city || '').trim() };
    return out;
  }
  /** Invalidate derived review evidence without changing ledger amounts. */
  function reconcileAdviceContext(before, after) {
    if (after.adviceSchema !== 1 || !after.advice || typeof after.advice !== 'object') return;
    const conversion = currencyCode(before.currency) !== currencyCode(after.currency) &&
      after.currencyRevision === (before.currencyRevision || 0) + 1;
    const expectedOldAmount = (amount) => conversion ? exchangeAmount(amount, before.currency, after.currency) : amount;
    const contexts = after.advice.transactions || {},
      oldContexts = before.advice?.transactions || {};
    const previous = new Map(before.transactions.map((t) => [t.id, t])),
      next = new Map(after.transactions.map((t) => [t.id, t]));
    for (const id of Object.keys(contexts)) {
      if (previous.has(id) && !next.has(id)) {
        delete contexts[id];
        continue;
      }
      if (
        previous.has(id) &&
        next.has(id) &&
        JSON.stringify(contexts[id]) === JSON.stringify(oldContexts[id])
      ) {
        const c = contexts[id], t = next.get(id);
        // Ordinary edits may change the classification beneath unchanged context.
        // Keep compatible fields, but never let old advice block a valid ledger edit.
        if (t.categoryId === 'epargne' ||
          (['income', 'refund'].includes(c.nature) && t.type !== 'income') ||
          (c.nature === 'expense' && t.type !== 'expense')) {
          delete c.nature;
          delete c.refundOf;
        }
        if (c.exceptional && (t.type !== 'expense' || t.categoryId === 'epargne' ||
          (c.nature && c.nature !== 'expense'))) delete c.exceptional;
        if (!Object.keys(c).length) delete contexts[id];
      }
    }
    for (const [id, c] of Object.entries(contexts))
      if (c.refundOf && oldContexts[id]?.refundOf === c.refundOf) {
        const a = previous.get(c.refundOf),
          b = next.get(c.refundOf);
        if (
          a &&
          (!b ||
            a.type !== b.type ||
            expectedOldAmount(a.amountCents) !== b.amountCents ||
            a.categoryId !== b.categoryId ||
            a.date !== b.date ||
            ['transfer', 'adjustment'].includes(contexts[b.id]?.nature))
        )
          delete c.refundOf;
      }
    const project = (d, amount = (value) => value) => {
      const groups = new Map();
      for (const t of d.transactions) {
        const m = t.date?.slice(0, 7);
        if (!groups.has(m)) groups.set(m, []);
        const c = d.advice?.transactions?.[t.id] || {};
        groups
          .get(m)
          .push([
            t.id,
            t.type,
            amount(t.amountCents),
            t.date,
            t.categoryId,
            t.savingsProjectId || null,
            c.nature || null,
            c.refundOf || null,
          ]);
      }
      return new Map(
        [...groups].map(([m, rows]) => [
          m,
          JSON.stringify(rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])))),
        ]),
      );
    };
    const a = project(before, expectedOldAmount),
      b = project(after);
    for (const m of new Set([...a.keys(), ...b.keys()]))
      if (a.get(m) !== b.get(m) && after.advice.months) delete after.advice.months[m];
  }
  /**
   * Validate compatible JSON budget data and return a fresh JSON v3 object.
   * @param {unknown} input Parsed current or supported legacy backup.
   * @returns {object} Normalized budget; caller retains ownership of input.
   * @throws {Error} Invalid amounts, dates, currency or financial metadata.
   */
  function normalize(input) {
    if (!input || typeof input !== 'object' || !Array.isArray(input.transactions))
      throw Error('Sauvegarde Clair invalide.');
    if (input.version !== undefined && ![1, 2, 3].includes(input.version))
      throw Error('Cette version de sauvegarde n’est pas prise en charge par Clair.');
    if (
      input.transactions.length > 50000 ||
      (input.rules || []).length > 500 ||
      (Array.isArray(input.skipped) && input.skipped.length > 100000)
    )
      throw Error('Sauvegarde trop volumineuse.');
    if (input.expressSchema !== undefined && input.expressSchema !== 1)
      throw Error('Cette version Express nécessite une mise à jour de Clair.');
    if(input.adviceSchema!==undefined&&input.adviceSchema!==1||input.advice!==undefined&&input.adviceSchema!==1)
      throw Error('Cette version de CLAIR Conseils nécessite une mise à jour.');
    if (
      input.expressSchema !== 1 &&
      ((input.preferences && own(input.preferences, 'express')) ||
        input.transactions.some((t) => t && own(t, 'express')))
    )
      throw Error('Le schéma Express est absent ou invalide.');
    const d = empty();
    if (input.expressSchema === 1) d.expressSchema = 1;
    d.currency = currencyCode(input.currency);
    d.currencyRevision = input.currencyRevision ?? 0;
    if (!Number.isSafeInteger(d.currencyRevision) || d.currencyRevision < 0)
      throw Error('Version de devise invalide.');
    const integer = (n) => {
      if (!Number.isSafeInteger(n) || Math.abs(n) > 10000000000) throw Error('Montant invalide.');
      return n;
    };
    d.initialized = Boolean(input.initialized);
    d.setupDone = Boolean(input.setupDone);
    d.openingCents =
      input.version === 3 ? integer(input.openingCents) : cents(input.openingBalance ?? 0, d.currency);
    d.openingBalanceDate = validDate(input.openingBalanceDate) ? input.openingBalanceDate : today();
    const ids = new Set(),
      keys = new Set(),
      expressKeys = new Set();
    d.transactions = input.transactions.map((t, i) => {
      if (!t || !validDate(t.date)) throw Error('Une opération contient une date invalide.');
      const id = safeId(t.id) ? t.id : 'import-' + i;
      if (ids.has(id)) throw Error('Identifiant d’opération en double.');
      ids.add(id);
      const amountCents = input.version === 3 ? integer(t.amountCents) : cents(t.amount, d.currency);
      if (amountCents < 0) throw Error('Une dépense doit avoir un montant positif.');
      const autoKey =
        typeof t.autoKey === 'string' && KEY_RE.test(t.autoKey) && validDate(t.autoKey.slice(-10))
          ? t.autoKey
          : null;
      if (autoKey && keys.has(autoKey)) throw Error('Dépense automatique en double.');
      if (autoKey) keys.add(autoKey);
      if (t.savingsProjectId != null && !safeId(t.savingsProjectId))
        throw Error('Référence de projet d’épargne invalide.');
      const express = own(t, 'express') ? normalizeExpress(t.express) : undefined;
      if (express) {
        if (expressKeys.has(express.idempotencyKey)) throw Error('Clé de dépense Express en double.');
        expressKeys.add(express.idempotencyKey);
      }
      return {
        ...(express ? { express } : {}),
        id,
        type: t.type === 'income' ? 'income' : 'expense',
        amountCents,
        name: text(t.name),
        categoryId: safeId(t.categoryId) ? t.categoryId : 'autre',
        date: t.date,
        note: text(t.note),
        autoKey,
        ruleId: safeId(t.ruleId) ? t.ruleId : null,
        fixedExpenseId: safeId(t.fixedExpenseId) ? t.fixedExpenseId : null,
        fixedMonth: /^\d{4}-\d{2}$/.test(t.fixedMonth || '') ? t.fixedMonth : null,
        corrected: Boolean(t.corrected),
        paymentConfirmed: Boolean(t.paymentConfirmed),
        confirmedAt: validDate(t.confirmedAt) ? t.confirmedAt : null,
        earlyPaid: Boolean(t.earlyPaid && autoKey),
        savingsProjectId: t.savingsProjectId || null,
      };
    });
    // Anciennes versions : le solde était une opération de revenu.
    if (input.version !== 3 && input.openingBalance === undefined) {
      const t = d.transactions.find((t) => t.type === 'income' && t.name === 'Solde de départ' && !t.note);
      if (t) {
        d.openingCents = t.amountCents;
        d.openingBalanceDate = t.date;
        d.transactions = d.transactions.filter((x) => x !== t);
      }
    }
    d.customCategories = (Array.isArray(input.customCategories) ? input.customCategories : [])
      .slice(0, 100)
      .filter((x) => x && safeId(x.id))
      .map((x) => ({ id: x.id, label: text(x.label), icon: text(x.icon) }));
    d.budgets = moneyMap(input.budgets, d.currency);
    for (const [m, v] of Object.entries(input.budgetOverrides || {}))
      if (validDate(m + '-01')) d.budgetOverrides[m] = moneyMap(v, d.currency);
    if(input.adviceSchema===1){d.adviceSchema=1;d.advice=normalizeAdvice(input.advice,d);}
    d.savingsGoal = Math.max(0, cents(input.savingsGoal ?? 0, d.currency)) / 100;
    normalizeSavings(input, d);
    d.fixedExpenses = (Array.isArray(input.fixedExpenses) ? input.fixedExpenses : [])
      .slice(0, 500)
      .filter((x) => x && safeId(x.id))
      .map((x) => ({
        id: x.id,
        name: text(x.name),
        amount: Math.max(0, cents(x.amount, d.currency)) / 100,
        categoryId: safeId(x.categoryId) ? x.categoryId : 'autre',
        day: Math.max(1, Math.min(31, Math.trunc(Number(x.day) || 1))),
      }));
    const rids = new Set();
    d.rules = (Array.isArray(input.rules) ? input.rules : []).map((r) => {
      if (
        !r ||
        !safeId(r.id) ||
        rids.has(r.id) ||
        !validDate(r.start) ||
        (r.end && (!validDate(r.end) || r.end < r.start))
      )
        throw Error('Règle automatique invalide.');
      rids.add(r.id);
      if (!['weekly', 'monthly', 'yearly'].includes(r.kind)) throw Error('Fréquence invalide.');
      const amounts = r.kind === 'weekly' ? r.amounts : [];
      if (r.kind === 'weekly' && (!Array.isArray(amounts) || amounts.length !== 7))
        throw Error('Jours de repas invalides.');
      const a = amounts.map((n) => integer(n));
      const amountCents = integer(r.amountCents || 0);
      if (a.some((n) => n < 0) || amountCents < 0) throw Error('Montant de règle invalide.');
      if (Array.isArray(r.pauses) && r.pauses.length > 500) throw Error('Trop de pauses.');
      const pauses = (Array.isArray(r.pauses) ? r.pauses : []).map((p) => {
        if (!p || !validDate(p.start) || !validDate(p.end) || p.end < p.start) throw Error('Pause invalide.');
        return { start: p.start, end: p.end };
      });
      return {
        id: r.id,
        name: text(r.name),
        categoryId: safeId(r.categoryId) ? r.categoryId : 'autre',
        kind: r.kind,
        start: r.start,
        end: r.end || null,
        amounts: a,
        amountCents,
        day: r.day === 'last' ? 'last' : Math.max(1, Math.min(31, Math.trunc(Number(r.day) || 1))),
        month: Math.max(1, Math.min(12, Math.trunc(Number(r.month) || 1))),
        pauses,
        originFixedId: safeId(r.originFixedId) ? r.originFixedId : null,
        reminderEnabled: r.kind === 'weekly' ? false : r.reminderEnabled !== false,
      };
    });
    d.skipped = [
      ...new Set(
        (Array.isArray(input.skipped) ? input.skipped : []).filter(
          (x) => typeof x === 'string' && KEY_RE.test(x),
        ),
      ),
    ];
    d.preferences = normPrefs(input.preferences);
    validateCurrency(d);
    return d;
  }
  function dueAmount(r, date) {
    if (date < r.start || (r.end && date > r.end) || r.pauses.some((p) => date >= p.start && date <= p.end))
      return 0;
    if (r.kind === 'weekly') return r.amounts[new Date(date + 'T12:00:00Z').getUTCDay()] || 0;
    const day = r.day === 'last' ? lastDay(date.slice(0, 7)) : Math.min(r.day, lastDay(date.slice(0, 7)));
    if (Number(date.slice(8)) !== day || (r.kind === 'yearly' && Number(date.slice(5, 7)) !== r.month))
      return 0;
    return r.amountCents;
  }
  function occurrences(d, from, through) {
    if (!validDate(from) || !validDate(through) || from > through) return [];
    if (daysBetween(from, through) > 40000) throw Error('Période de calcul trop longue.');
    const skipped = new Set(d.skipped),
      recorded = new Set(d.transactions.map((t) => t.autoKey).filter(Boolean));
    const paid = new Set(
      d.transactions
        .filter((t) => t.fixedExpenseId)
        .map((t) => t.fixedExpenseId + ':' + (t.fixedMonth || t.date.slice(0, 7))),
    );
    const out = [];
    for (const r of d.rules) {
      const first = from > r.start ? from : r.start;
      const last = r.end && r.end < through ? r.end : through;
      for (let date = first; date <= last; date = addDays(date, 1)) {
        const amountCents = dueAmount(r, date),
          key = r.id + ':' + date;
        if (
          !amountCents ||
          skipped.has(key) ||
          recorded.has(key) ||
          (r.originFixedId && paid.has(r.originFixedId + ':' + date.slice(0, 7)))
        )
          continue;
        out.push({
          id: 'auto-' + r.id + '-' + date,
          type: 'expense',
          amountCents,
          date,
          name: r.name,
          categoryId: r.categoryId,
          note: '',
          autoKey: key,
          ruleId: r.id,
          fixedExpenseId: r.originFixedId || null,
          fixedMonth: r.originFixedId ? date.slice(0, 7) : null,
          corrected: false,
          paymentConfirmed: false,
          confirmedAt: null,
          earlyPaid: false,
          savingsProjectId: r.categoryId === 'epargne' ? 'savings-legacy' : null,
        });
        if (out.length > 50000)
          throw Error(
            'Trop de dépenses à rattraper. Réduis le nombre de règles ou avance leur date de début.',
          );
      }
    }
    return out.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  }
  /**
   * Materialize due occurrences into a caller-owned draft, preserving autoKey idempotence.
   * @param {object} d Validated mutable budget draft.
   * @param {string} [date] Inclusive Paris civil date, YYYY-MM-DD.
   * @returns {number} Number of automatic expenses added.
   */
  function sync(d, date = today()) {
    if (!d.initialized || !d.setupDone) return 0;
    const pending = occurrences(d, d.openingBalanceDate, date);
    if (d.transactions.length + pending.length > 50000)
      throw Error(
        'La limite de 50 000 opérations est atteinte. Exporte tes données avant de démarrer un nouveau suivi.',
      );
    if (
      pending.some((t) => t.savingsProjectId === 'savings-legacy') &&
      !d.savingsProjects.some((p) => p.id === 'savings-legacy')
    ) {
      if (d.savingsProjects.length >= 100)
        throw Error('Un projet supplémentaire est nécessaire pour conserver l’épargne automatique.');
      d.savingsProjects.push({
        id: 'savings-legacy',
        name: 'Mon épargne',
        kind: 'autre',
        icon: 'star',
        color: 'violet',
        targetCents: cents(d.savingsGoal),
        targetDate: null,
        archived: false,
      });
    }
    d.transactions.push(...pending);
    return pending.length;
  }
  function balance(d, date = today()) {
    return d.transactions
      .filter((t) => t.date <= date)
      .reduce((n, t) => n + (t.type === 'income' ? t.amountCents : -t.amountCents), d.openingCents);
  }
  function skip(d, id) {
    const t = d.transactions.find((t) => t.id === id);
    if (t?.autoKey && !d.skipped.includes(t.autoKey)) d.skipped.push(t.autoKey);
    // Une charge payée dans l'ancienne version ne doit pas revenir après annulation.
    if (t?.fixedExpenseId && !t.autoKey) {
      const m = t.fixedMonth || t.date.slice(0, 7);
      for (const r of d.rules.filter((r) => r.originFixedId === t.fixedExpenseId)) {
        const day = r.day === 'last' ? lastDay(m) : Math.min(r.day, lastDay(m));
        const date = m + '-' + String(day).padStart(2, '0');
        const key = r.id + ':' + date;
        if (dueAmount(r, date) && !d.skipped.includes(key)) d.skipped.push(key);
      }
    }
    d.transactions = d.transactions.filter((t) => t.id !== id);
    return t;
  }
  function reserve(d, date = today()) {
    const end = date.slice(0, 7) + '-' + lastDay(date.slice(0, 7));
    const predicted = occurrences(d, addDays(date, 1), end);
    const scheduled = d.transactions.filter((t) => t.date > date && t.date <= end);
    return {
      predicted,
      scheduled,
      cents:
        predicted.reduce((n, t) => n + t.amountCents, 0) +
        scheduled.filter((t) => t.type === 'expense').reduce((n, t) => n + t.amountCents, 0),
    };
  }
  /* Prochaine échéance future par habitude ; les débits comptés restent dans le journal. */
  function upcoming(d, date = today(), horizon = 400) {
    const rules = new Map(d.rules.filter((r) => r.kind !== 'weekly').map((r) => [r.id, r]));
    const future = occurrences(
      { ...d, rules: [...rules.values()] },
      addDays(date, 1),
      addDays(date, horizon),
    );
    const seen = new Set(),
      next = [];
    for (const o of future)
      if (!seen.has(o.ruleId)) {
        seen.add(o.ruleId);
        next.push({ ...o, status: 'future' });
      }
    return next
      .map((o) => ({
        ...o,
        dueDate: o.autoKey.slice(-10),
        days: daysBetween(date, o.autoKey.slice(-10)),
        reminderEnabled: rules.get(o.ruleId).reminderEnabled,
      }))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id));
  }
  const reminderDate = (due) => addDays(due, -2);
  /* Données minimales pour le serveur de rappels : uniquement les règles choisies. */
  function pushPayload(d, date = today()) {
    if (!d.preferences.reminders) return { rules: [] };
    const out = [];
    for (const r of d.rules
      .filter((r) => r.kind !== 'weekly' && r.reminderEnabled && (!r.end || r.end > date))
      .slice(0, 100)) {
      const dueDates = occurrences({ ...d, rules: [r] }, addDays(date, 1), addDays(date, 400))
        .map((o) => o.date)
        .slice(0, 24);
      if (dueDates.length)
        out.push({ ruleId: r.id, name: r.name.slice(0, 80), amountCents: r.amountCents, dueDates });
    }
    return { rules: out };
  }
  /* Calendrier iCalendar (RFC 5545) : 12 mois, rappel 2 jours avant, 09:00 Europe/Paris. */
  function icsEscape(s) {
    return String(s)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }
  function icsFold(line) {
    const enc = new TextEncoder();
    let out = '',
      bytes = 0;
    for (const ch of line) {
      const b = enc.encode(ch).length;
      if (bytes + b > 75) {
        out += '\r\n ';
        bytes = 1;
      }
      out += ch;
      bytes += b;
    }
    return out;
  }
  function ics(d, date = today(), now = new Date(), fmt = (c) => formatMoney(c, d.currency)) {
    const end = addDays(monthOffset(date.slice(0, 7), 12) + '-01', -1);
    const rules = d.rules.filter((r) => r.kind !== 'weekly');
    const occ = occurrences({ ...d, rules }, addDays(date, 1), end);
    const stamp = now
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
    const L = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Clair//Echeances//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Clair — échéances',
      'X-WR-TIMEZONE:Europe/Paris',
      'BEGIN:VTIMEZONE',
      'TZID:Europe/Paris',
      'BEGIN:DAYLIGHT',
      'TZOFFSETFROM:+0100',
      'TZOFFSETTO:+0200',
      'TZNAME:CEST',
      'DTSTART:19700329T020000',
      'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
      'END:DAYLIGHT',
      'BEGIN:STANDARD',
      'TZOFFSETFROM:+0200',
      'TZOFFSETTO:+0100',
      'TZNAME:CET',
      'DTSTART:19701025T030000',
      'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
      'END:STANDARD',
      'END:VTIMEZONE',
    ];
    for (const o of occ) {
      const ds = o.date.replace(/-/g, '');
      L.push(
        'BEGIN:VEVENT',
        'UID:' + o.autoKey.replace(':', '-') + '@clair.local',
        'DTSTAMP:' + stamp,
        'DTSTART;TZID=Europe/Paris:' + ds + 'T090000',
        'DURATION:PT15M',
        'SUMMARY:' + icsEscape(o.name + ' — ' + fmt(o.amountCents)),
        'DESCRIPTION:' + icsEscape('Échéance prévue dans Clair (prévision, pas une confirmation bancaire).'),
        'TRANSP:TRANSPARENT',
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'TRIGGER:-P2D',
        'DESCRIPTION:' + icsEscape(o.name + ' dans 2 jours — ' + fmt(o.amountCents)),
        'END:VALARM',
        'END:VEVENT',
      );
    }
    L.push('END:VCALENDAR');
    return { text: L.map(icsFold).join('\r\n') + '\r\n', count: occ.length };
  }
  const csvCell = (x) =>
    '"' +
    String(x ?? '')
      .replace(/"/g, '""')
      .replace(/^[\s]*[=+@-]/, (match) => "'" + match) +
    '"';
  root.ClairEngine = {
    exchangePolicy,
    exchangeRate,
    exchangeAmount,
    convertCurrency,
    currencies,
    currencyCode,
    formatMoney,
    inputAmount,
    validateCurrency,
    csvCell,
    own,
    safeId,
    cents,
    validDate,
    addDays,
    daysBetween,
    dateAt,
    today,
    lastDay,
    monthOffset,
    empty,
    normalize,
    reconcileAdviceContext,
    normPrefs,
    dueAmount,
    occurrences,
    sync,
    balance,
    skip,
    reserve,
    upcoming,
    reminderDate,
    pushPayload,
    ics,
    icsFold,
    icsEscape,
    PHOTO_MAX_BYTES,
    savingsBalance,
    validateSavings,
    savingsKinds,
    savingsIcons,
    savingsColors,
  };
})(typeof window !== 'undefined' ? window : globalThis);
