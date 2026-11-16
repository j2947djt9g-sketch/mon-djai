/* Explainable local rules. Advice never changes a transaction or a goal. */
(function (root) {
  'use strict';
  const E = root.ClairEngine;
  function buildAdvice({ summary, comparison } = {}) {
    if (!summary || summary.period?.status === 'future') return [];
    const s = summary, cards = [], money = (value) => E.formatMoney(value, s.currency);
    const byCategory = new Map(s.categories.map((row) => [row.id, row]));
    const quality = {
      reviewed: Boolean(s.quality.reviewed), unknownRefunds: s.quality.unknownRefunds || 0,
      unconfirmedAutomaticCount: s.quality.unconfirmedAutomaticCount || 0, notes: [...s.quality.notes],
    };
    const caveats = ['Les montants décrivent les opérations enregistrées dans Clair.'];
    if (!quality.reviewed) caveats.push('La période reste à vérifier avec tes opérations.');
    if (quality.unknownRefunds) caveats.push('Des remboursements ne sont pas reliés à une dépense.');
    if (quality.unconfirmedAutomaticCount) caveats.push('Des échéances automatiques ne sont pas confirmées comme payées.');
    const add = (priority, kind, categoryId, data) => cards.push({ id: `${kind}:${categoryId || 'month'}`,
      priority, kind, categoryId, ...data, explanation: `${data.explanation} ${caveats.join(' ')}`,
      quality: { ...quality, notes: [...quality.notes] } });
    if (s.surplusCents < 0) add(10, 'imbalance', null, {
      title: 'Vérifier le résultat du mois', amountCents: -s.surplusCents,
      finding: `Les dépenses nettes enregistrées dépassent les revenus de ${money(-s.surplusCents)}.`,
      explanation: 'Le résultat est calculé avant les mouvements d’épargne et hors flux exclus.',
      recommendation: 'Vérifie les revenus déjà reçus et les dépenses du journal avant de décider d’un ajustement.', action: { type: 'ledger' },
    });
    if (s.quality.reviewed && !s.quality.unknownRefunds) for (const goal of s.goals) {
      const row = byCategory.get(goal.categoryId);
      if (!goal.verified || !row || row.netCents <= goal.amountCents) continue;
      const amountCents = row.netCents - goal.amountCents;
      add(20, 'goal-overspend', goal.categoryId, { title: 'Faire le point sur ton repère', amountCents,
        finding: `Les dépenses nettes dépassent de ${money(amountCents)} le repère de ${money(goal.amountCents)}.`,
        explanation: 'Ce repère mensuel correspond à un objectif enregistré au plus tard au début du mois.',
        recommendation: 'Examine les opérations de cette catégorie et adapte le prochain repère à tes besoins.',
        action: { type: 'goal', categoryId: goal.categoryId } });
    }
    if (comparison?.comparable && s.quality.reviewed && !s.quality.unknownRefunds) for (const change of comparison.categories) {
      if (change.deltaCents <= 0 || change.percent === null || change.percent < 20 ||
        s.expenseCents <= 0 || change.deltaCents < s.expenseCents * 0.03) continue;
      const row = byCategory.get(change.id);
      const exceptional = row?.exceptionalCents || 0;
      const remainder = row ? row.netCents - exceptional : 0;
      const suggestedGoalCents = exceptional > 0 && remainder > 0 && row.refundCents === 0 ? remainder : null;
      add(30, 'category-increase', change.id, { title: 'Comprendre cette hausse', amountCents: change.deltaCents,
        suggestedGoalCents,
        finding: `Cette catégorie augmente de ${money(change.deltaCents)} sur des périodes comparables.`,
        explanation: `La variation atteint au moins 20 % du mois précédent et représente au moins 3 % des dépenses brutes du mois.${exceptional > 0 ? ` Tu as identifié ${money(exceptional)} de dépenses exceptionnelles, conservées dans les totaux.` : ''}`,
        recommendation: suggestedGoalCents === null ? 'Ouvre les opérations pour comprendre ce qui a changé.' :
          `Si cela convient à tes besoins, tu peux choisir ${money(suggestedGoalCents)} comme prochain repère. Ce n’est pas une promesse d’économie.`,
        action: { type: 'category', categoryId: change.id } });
    }
    if (s.incomeCents > 0 && s.recurringCents > 0 && s.recurringCents / s.incomeCents >= 0.4)
      add(40, 'recurring', null, { title: 'Revoir les engagements récurrents', amountCents: s.recurringCents,
        finding: `Les dépenses récurrentes enregistrées représentent ${money(s.recurringCents)}, au moins 40 % des revenus enregistrés.`,
        explanation: 'Le calcul retient les opérations récurrentes déjà présentes dans le journal, sans ajouter de futures échéances.',
        recommendation: 'Vérifie les engagements et leurs dates pour préparer les prochains mois.', action: { type: 'ledger' } });
    if (s.savingsCents > 0) add(50, 'savings', 'epargne', { title: 'Ton épargne identifiée', amountCents: s.savingsCents,
      finding: `Les versements d’épargne dépassent les retraits de ${money(s.savingsCents)} sur cette période.`,
      explanation: 'Ce flux identifié est distinct du résultat mensuel et du stock total d’épargne.',
      recommendation: 'Consulte les mouvements d’épargne pour suivre les projets qui comptent pour toi.', action: { type: 'category', categoryId: 'epargne' } });
    if (comparison?.comparable && s.quality.reviewed && !s.quality.unknownRefunds) for (const change of comparison.categories) {
      const row = byCategory.get(change.id);
      if (change.deltaCents >= 0 || change.percent === null || change.refundDriven || row?.refundCents > 0) continue;
      add(60, 'category-decrease', change.id, { title: 'Observer cette baisse', amountCents: -change.deltaCents,
        finding: `Les dépenses enregistrées de cette catégorie baissent de ${money(-change.deltaCents)} sur des périodes comparables.`,
        explanation: 'Cette différence ne permet pas, à elle seule, de connaître la cause du changement.',
        recommendation: 'Regarde les opérations pour vérifier si cette évolution peut se poursuivre selon tes besoins.', action: { type: 'category', categoryId: change.id } });
    }
    return cards.sort((a, b) => a.priority - b.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).slice(0, 3);
  }
  root.ClairAdviceRules = { buildAdvice };
})(typeof window !== 'undefined' ? window : globalThis);
