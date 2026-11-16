/* Local, owner-scoped presentation of canonical monthly advice models. */
(function (root) {
  "use strict";
  const escape = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  function create(options) {
    const {
      getBudget,
      getOwner,
      commit,
      engine: E,
      categories,
      formatMoney,
      categoryVisual,
      monthNav,
      pageBackLink,
      envelopes,
      references,
    } = options;
    let host = null,
      month = null,
      owner = null,
      fingerprint = null,
      model = null,
      mutating = false,
      disposed = true;
    let state;
    function reset() {
      state = {
        category: null,
        ledger: false,
        context: null,
        contextScope: null,
        goalDraft: null,
        goalDirty: false,
        contextDraft: null,
        more: {},
        error: "",
        status: "",
      };
    }
    reset();
    const signature = (budget) => JSON.stringify([month, E.today(), budget]);
    const money = (value) => escape(formatMoney(value, model.summary.currency));
    const label = (id) =>
      (categories() || []).find((c) => c.id === id)?.label ||
      (id === "non-classee" ? "Non classée" : id || "Non classée");
    const period = (summary) =>
      summary.period.through
        ? `${summary.period.start} au ${summary.period.through}`
        : `Mois ${summary.period.month} à venir`;
    const action = (attr, text, extra = "") =>
      `<button type="button" ${attr} ${extra}>${text}</button>`;
    function compute(budget) {
      const summary = root.ClairMonthlySummary.summarizeMonth(budget, {
        month,
        asOf: E.today(),
      });
      const previousMonth = E.monthOffset(month, -1);
      // Match elapsed civil days, without making a shorter previous month look complete.
      const day =
        summary.period.status === "partial"
          ? Number(summary.period.through.slice(-2))
          : null;
      const through = day
        ? `${previousMonth}-${String(Math.min(day, E.lastDay(previousMonth))).padStart(2, "0")}`
        : undefined;
      const previous = root.ClairMonthlySummary.summarizeMonth(budget, {
        month: previousMonth,
        asOf: E.today(),
        ...(through ? { through } : {}),
      });
      const comparison = root.ClairSpendingTrends.compareMonths(
        summary,
        previous,
      );
      return {
        budget,
        summary,
        previous,
        comparison,
        cards: root.ClairAdviceRules.buildAdvice({ summary, comparison }),
      };
    }
    function metric(key, title, value) {
      return `<div class="monthly-advice-metric" data-advice-total="${key}" data-cents="${value}"><span>${title}</span><strong>${money(value)}</strong></div>`;
    }
    function matchingRows(categoryId) {
      return model.summary.transactions.filter((row) => {
        if (!categoryId) return true;
        if (categoryId === "epargne") return row.categoryId === "epargne";
        const nature = row.context?.nature || row.type;
        if (
          row.categoryId === "epargne" ||
          nature === "transfer" ||
          nature === "adjustment" ||
          nature === "income"
        )
          return false;
        if (nature === "refund") {
          const original = model.budget.transactions.find(
            (t) => t.id === row.context.refundOf,
          );
          return (original?.categoryId || "non-classee") === categoryId;
        }
        return (row.categoryId || "non-classee") === categoryId;
      });
    }
    function contextForm(row, scope) {
      const draft = state.contextDraft || {
        nature: row.context?.nature || "",
        refundOf: row.context?.refundOf || "",
      };
      const values = [
        [
          "",
          `Sens enregistré : ${row.type === "income" ? "revenu" : "dépense"} (effacer la classification)`,
        ],
        [row.type, row.type === "income" ? "Revenu" : "Dépense"],
        ...(row.type === "income" ? [["refund", "Remboursement"]] : []),
        ["transfer", "Virement interne"],
        ["adjustment", "Ajustement de solde"],
      ];
      const eligible = model.budget.transactions.filter(
        (t) =>
          t.id !== row.id &&
          t.type === "expense" &&
          t.categoryId !== "epargne" &&
          t.date <= row.date &&
          (!model.budget.advice?.transactions?.[t.id]?.nature ||
            model.budget.advice.transactions[t.id].nature === "expense"),
      );
      return `<form data-advice-context-form="${escape(row.id)}" data-advice-scope="${escape(scope)}" novalidate><label>Nature de l’opération<select name="nature">${values.map(([v, l]) => `<option value="${v}" ${draft.nature === v ? "selected" : ""}>${escape(l)}</option>`).join("")}</select></label><label>Dépense d’origine facultative (pour un remboursement)<select name="refundOf"><option value="">Non relié à une dépense</option>${eligible.map((t) => `<option value="${escape(t.id)}" ${draft.refundOf === t.id ? "selected" : ""}>${escape(t.name)} · ${escape(t.date)} · ${money(t.amountCents)}</option>`).join("")}</select></label><p>Le sens, le montant et la catégorie enregistrés restent inchangés. Le lien n’est jamais choisi automatiquement.</p><div class="monthly-advice-actions"><button type="submit">Appliquer</button>${action("data-advice-cancel-context", "Annuler")}</div></form>`;
    }
    function transaction(row, editable = true, scope) {
      const nature = row.context?.nature || row.type;
      const savings = row.categoryId === "epargne";
      const contextLabel =
        {
          income: "Revenu",
          expense: "Dépense",
          refund: "Remboursement",
          transfer: "Virement interne",
          adjustment: "Ajustement",
        }[nature] || nature;
      const canMark =
        !savings && row.type === "expense" && nature === "expense";
      return `<li class="monthly-advice-transaction" data-advice-row="${escape(row.id)}"><div class="monthly-advice-row-heading"><div><strong>${escape(row.name || label(row.categoryId))}</strong><small>${escape(row.date)} · ${escape(savings ? "Épargne identifiée" : contextLabel)} · ${escape(label(row.categoryId))}</small></div><strong>${row.type === "income" ? "+" : "−"}${money(row.amountCents)}</strong></div>${row.autoKey || row.ruleId || row.fixedExpenseId ? `<p>Échéance automatique enregistrée${row.paymentConfirmed ? " · paiement déclaré confirmé" : " · paiement non confirmé"}.</p>` : ""}${!savings && editable ? `<div class="monthly-advice-actions">${canMark ? action(`data-advice-exception="${escape(row.id)}" data-advice-scope="${escape(scope)}"`, `Achat ponctuel${row.context?.exceptional ? " ✓" : ""}`, `aria-pressed="${row.context?.exceptional === true}"`) : ""}${action(`data-advice-context="${escape(row.id)}" data-advice-scope="${escape(scope)}"`, "Préciser la nature", `aria-expanded="${state.context === row.id && state.contextScope === scope}"`)}</div>` : ""}${editable && state.context === row.id && state.contextScope === scope ? contextForm(row, scope) : ""}</li>`;
    }
    function rows(rows, scope, editable = true) {
      const limit = state.more[scope] || 50;
      return `<ul class="monthly-advice-transactions">${rows
        .slice(0, limit)
        .map((row) => transaction(row, editable, scope))
        .join(
          "",
        )}</ul>${rows.length > limit ? action(`data-advice-more="${escape(scope)}"`, `Voir plus (${rows.length - limit} restantes)`) : ""}`;
    }
    function review(summary, which) {
      if (!summary.period.through)
        return "<p>Cette période n’a pas encore commencé.</p>";
      return `<div class="monthly-advice-review"><strong>${which === "previous" ? "Période précédente" : "Période sélectionnée"} · ${escape(period(summary))}</strong><p>${summary.quality.reviewed ? "Tu as déclaré avoir vérifié cette période." : "Avant de confirmer, vérifie les saisies, revenus, dépenses, virements et remboursements de cette période dans ton journal. Les chiffres décrivent seulement ce qui est enregistré."}</p>${summary.quality.reviewed ? action(`data-advice-unreview="${which}"`, "Annuler ma confirmation") : action(`data-advice-review="${which}"`, "Confirmer cette période")}</div>`;
    }
    function graph(categoryId) {
      if (!model.comparison.comparable)
        return "<p>Compare les périodes après avoir vérifié leurs opérations. Un historique absent ne représente pas un mois réellement à zéro.</p>";
      const current =
        model.summary.categories.find((c) => c.id === categoryId)?.netCents ||
        0;
      const previous =
        model.previous.categories.find((c) => c.id === categoryId)?.netCents ||
        0;
      const max = Math.max(current, previous, 1);
      return `<div class="monthly-advice-graph" aria-label="Comparaison des dépenses nettes">${[
        [model.previous, previous],
        [model.summary, current],
      ]
        .map(
          ([s, v]) =>
            `<div><div class="monthly-advice-row-heading"><span>${escape(period(s))}</span><strong>${money(v)}</strong></div><div class="monthly-advice-track"><span style="width:${(Math.max(0, v) / max) * 100}%"></span></div></div>`,
        )
        .join(
          "",
        )}<p>Écart : ${money(current - previous)}${previous > 0 ? ` (${escape(new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(((current - previous) / previous) * 100))} %)` : " · pourcentage indisponible sans montant précédent positif"}.</p></div>`;
    }
    function suggested(categoryId) {
      const row = model.summary.categories.find((c) => c.id === categoryId);
      return model.comparison.comparable &&
        row &&
        row.exceptionalCents > 0 &&
        row.refundCents === 0 &&
        row.netCents - row.exceptionalCents > 0
        ? row.netCents - row.exceptionalCents
        : null;
    }
    function goalDefault(categoryId) {
      const target = E.monthOffset(month, 1),
        override = model.budget.budgetOverrides?.[target]?.[categoryId];
      if (override !== undefined)
        return String(E.cents(override, model.summary.currency) / 100);
      const value = suggested(categoryId);
      return value === null ? "" : String(value / 100);
    }
    function categoryDetail() {
      if (!state.category) return "";
      const id = state.category,
        row = model.summary.categories.find((c) => c.id === id);
      const target = E.monthOffset(month, 1),
        override = model.budget.budgetOverrides?.[target]?.[id];
      const draft =
        state.goalDraft === null ? goalDefault(id) : state.goalDraft;
      return `<section class="monthly-advice-panel" data-advice-category-detail><div class="monthly-advice-row-heading"><h2>${escape(label(id))}</h2>${action(`data-advice-close-category="${escape(id)}"`, "Fermer le détail")}</div>${id === "epargne" ? "<p>Mouvements d’épargne identifiés, séparés des dépenses et du résultat mensuel.</p>" : graph(id)}${row ? `<p>${money(row.netCents)} de dépenses nettes enregistrées, dont ${money(row.exceptionalCents)} marqués ponctuels. Les achats ponctuels restent dans tous les totaux.</p>` : ""}${rows(matchingRows(id), "category")}${id !== "epargne" ? `<form class="monthly-advice-goal" data-advice-goal="${escape(id)}" novalidate><h3>Préparer le mois suivant</h3><p>Repère facultatif pour ${escape(target)}, sans reconduction automatique.${override !== undefined ? ` Repère enregistré : ${money(E.cents(override, model.summary.currency))}.` : ""}</p>${suggested(id) !== null ? `<p>Le montant proposé correspond aux dépenses nettes moins les achats explicitement marqués ponctuels. Ce n’est pas une prévision de tes besoins ni une promesse d’économie.</p>` : "<p>Aucun montant conseillé sans comparaison fiable et contexte suffisant. Tu peux choisir librement ton repère.</p>"}<label>Mon repère (${escape(model.summary.currency)})<input name="amount" type="text" inputmode="${E.currencies[model.summary.currency].digits === 0 ? "numeric" : "decimal"}" value="${escape(draft)}" autocomplete="off"></label><div class="monthly-advice-actions"><button type="submit">${override !== undefined ? "Modifier mon repère" : "Enregistrer mon repère"}</button>${action("data-advice-cancel-goal", "Annuler la saisie")}${row && row.netCents > 0 ? action("data-advice-use-current", "Choisir le montant actuel") : ""}</div></form>` : ""}</section>`;
    }
    function documentary() {
      if (model.budget.advice?.location?.country !== "FR" || !references)
        return "";
      const docs = references("FR");
      if (!Array.isArray(docs) || !docs.length) return "";
      return `<details class="monthly-advice-panel" data-advice-section="references"><summary>Sources et repères documentaires · France</summary><p>Ressources facultatives, sans évaluation de tes dépenses ni promesse d’aide.</p>${docs
        .map((ref) => {
          let safe = false;
          try {
            safe = new URL(ref.url).protocol === "https:";
          } catch {}
          return `<article><h3>${safe ? `<a href="${escape(ref.url)}" target="_blank" rel="noopener noreferrer">${escape(ref.title)}</a>` : escape(ref.title)}</h3><p>${escape(ref.description)}</p><p>Source : ${escape(ref.source)} · Publication : ${escape(ref.publication || "non datée")} · Vérifié le ${escape(ref.checkedAt)} · Portée : ${escape(ref.geography)} · Conditions : ${escape(ref.eligibility)}</p></article>`;
        })
        .join("")}</details>`;
    }
    function captureFocus() {
      const node = document.activeElement;
      if (!node || !host.contains(node)) return null;
      const form = node.closest(
        "[data-advice-goal],[data-advice-context-form]",
      );
      return {
        attributes: [...node.attributes]
          .filter((a) => a.name.startsWith("data-advice-"))
          .map((a) => [a.name, a.value]),
        form: form
          ? {
              kind: form.hasAttribute("data-advice-goal")
                ? "data-advice-goal"
                : "data-advice-context-form",
              id: form.dataset.adviceGoal || form.dataset.adviceContextForm,
              scope: form.dataset.adviceScope,
            }
          : null,
        name: node.name,
        submit: node.type === "submit",
        start: node.selectionStart,
        end: node.selectionEnd,
        category: node.dataset.adviceCloseCategory || state.category,
      };
    }
    function restoreFocus(focus) {
      if (!focus) return;
      const match = (nodes, attributes) =>
        [...nodes].find((n) =>
          attributes.every(([key, value]) => n.getAttribute(key) === value),
        );
      let next;
      if (focus.form) {
        const f = focus.form;
        const form = [...host.querySelectorAll("form")].find(
          (n) =>
            n.getAttribute(f.kind) === f.id &&
            (!f.scope || n.dataset.adviceScope === f.scope),
        );
        if (form) {
          if (focus.name)
            next = [...form.elements].find((n) => n.name === focus.name);
          else if (focus.submit)
            next = form.querySelector('button[type="submit"]');
          else next = match(form.querySelectorAll("button"), focus.attributes);
        }
        // A saved classification may remove its category row; return to its ledger control.
        if (!next && f.kind === "data-advice-context-form") {
          const controls = host.querySelectorAll("[data-advice-context]");
          next =
            match(controls, [
              ["data-advice-context", f.id],
              ["data-advice-scope", f.scope],
            ]) || match(controls, [["data-advice-context", f.id]]);
        }
      }
      if (!next && focus.attributes.length)
        next = match(host.querySelectorAll("button,summary"), focus.attributes);
      if (
        !next &&
        focus.attributes.some(([key]) => key === "data-advice-close-category")
      )
        next = match(host.querySelectorAll("[data-advice-open-category]"), [
          ["data-advice-open-category", focus.category],
        ]);
      if (
        !next &&
        focus.attributes.some(
          ([key]) =>
            key === "data-advice-review" || key === "data-advice-unreview",
        )
      ) {
        const [, which] = focus.attributes.find(
          ([key]) =>
            key === "data-advice-review" || key === "data-advice-unreview",
        );
        next = [
          ...host.querySelectorAll(
            "[data-advice-review],[data-advice-unreview]",
          ),
        ].find(
          (n) => (n.dataset.adviceReview || n.dataset.adviceUnreview) === which,
        );
      }
      if (next) {
        next.focus({ preventScroll: true });
        if (focus.name && next.setSelectionRange && focus.start != null)
          next.setSelectionRange(focus.start, focus.end);
      }
    }
    function render() {
      if (disposed || !host) return;
      const s = model.summary;
      const focus = captureFocus();
      const openSections = [
        ...host.querySelectorAll("details[data-advice-section]"),
      ]
        .filter((n) => n.open)
        .map((n) => n.dataset.adviceSection);
      host.innerHTML = `<div class="monthly-advice">${pageBackLink ? pageBackLink() : ""}${monthNav ? monthNav() : ""}<header class="monthly-advice-heading"><p>Ton budget, à ton rythme${model.budget.advice?.location?.city ? " · " + escape(model.budget.advice.location.city) : ""}</p><h1>Mon bilan du mois</h1><p>${escape(period(s))}${s.period.status === "partial" ? " · Mois en cours" : ""}</p><span class="monthly-advice-badge">${s.quality.reviewed ? "Période vérifiée par toi" : "Opérations à vérifier"}</span></header><section class="monthly-advice-panel"><div class="monthly-advice-result" data-advice-total="surplus" data-cents="${s.surplusCents}"><span>Résultat enregistré du mois</span><strong>${money(s.surplusCents)}</strong><p>Revenus − dépenses nettes, avant les mouvements d’épargne. Ce résultat ne constitue pas une épargne confirmée.</p></div><div class="monthly-advice-metrics">${metric("income", "Revenus enregistrés", s.incomeCents)}${metric("expenses", "Dépenses nettes", s.netExpenseCents)}</div>${s.refundCents ? `<p>Dépenses brutes : ${money(s.expenseCents)} · remboursements : ${money(s.refundCents)}${s.quality.unknownRefunds ? " · remboursement(s) non relié(s) à une dépense" : ""}.</p>` : ""}${metric("savings", "Épargne identifiée · versements − retraits", s.savingsCents)}${s.transferCents || s.adjustmentCents ? `<p>Flux exclus du résultat : virements ${money(s.transferCents)} · ajustements ${money(s.adjustmentCents)}.</p>` : ""}<p>Les montants correspondent aux opérations enregistrées dans Clair ; ils ne prouvent pas un paiement bancaire.${s.quality.unconfirmedAutomaticCount ? " Des échéances automatiques ne sont pas confirmées comme payées." : ""}</p>${!s.transactions.length ? "<p>Aucune opération enregistrée sur cette période. Vérifie tes saisies avant d’interpréter ces chiffres ; cet historique ne confirme pas une absence réelle de dépenses.</p>" : ""}${action("data-advice-ledger-toggle", "Vérifier mes opérations", `aria-expanded="${state.ledger}"`)}${state.ledger ? `<section data-advice-period-ledger><h2>Les opérations de la période</h2>${rows(s.transactions, "ledger")}${review(s, "current")}<details data-advice-previous-ledger data-advice-section="previous"><summary>Voir les opérations de la période précédente</summary><p>${escape(period(model.previous))}</p>${rows(model.previous.transactions, "previous", false)}${!model.previous.transactions.length ? "<p>Aucune opération enregistrée sur cette période précédente. Cela ne confirme pas une absence réelle de dépenses.</p>" : ""}</details>${review(model.previous, "previous")}</section>` : ""}</section><section class="monthly-advice-panel"><h2>Mes dépenses par catégorie</h2>${s.categories.length ? s.categories.map((row) => `<button type="button" class="monthly-advice-category" data-advice-open-category="${escape(row.id)}"><span class="monthly-advice-category-label">${categoryVisual ? categoryVisual(row.id, 40) : ""}<span>${escape(label(row.id))}</span></span><strong>${money(row.netCents)}</strong></button>`).join("") : "<p>Aucune dépense de catégorie enregistrée sur cette période.</p>"}<p>${model.comparison.comparable ? "Comparaison disponible sur les périodes déclarées vérifiées." : "Comparaison suspendue : vérifie la période sélectionnée et la période précédente, y compris leurs remboursements."}</p></section><section class="monthly-advice-cards" aria-label="Conseils du mois">${model.cards.map((card) => `<article class="monthly-advice-panel" data-advice-card="${escape(card.id)}"><div class="monthly-advice-row-heading"><h2>${escape(card.title)}</h2>${card.categoryId && categoryVisual ? categoryVisual(card.categoryId, 40) : ""}</div>${card.categoryId ? `<strong>${escape(label(card.categoryId))}</strong>` : ""}<p class="monthly-advice-finding">${escape(card.finding)}</p><p>${escape(card.explanation)}</p><p>${escape(card.recommendation)}</p>${card.categoryId ? action(`data-advice-open-category="${escape(card.categoryId)}"`, card.title === "Comprendre cette hausse" ? "Comprendre cette hausse" : "Voir les opérations") : action("data-advice-open-ledger", "Voir les opérations")}</article>`).join("")}${!model.cards.length ? `<p>${s.quality.reviewed ? "Aucun conseil étayé à afficher pour cette période." : "Vérifie les opérations pour disposer de constats plus fiables."}</p>` : ""}</section>${categoryDetail()}<p class="monthly-advice-error" data-advice-error role="alert">${escape(state.error)}</p><p data-advice-status role="status">${escape(state.status)}</p>${envelopes ? `<details class="monthly-advice-panel" data-advice-section="envelopes"><summary>Mes enveloppes et mes projets</summary>${envelopes()}</details>` : ""}${documentary()}</div>`;
      for (const section of host.querySelectorAll(
        "details[data-advice-section]",
      ))
        section.open = openSections.includes(section.dataset.adviceSection);
      restoreFocus(focus);
    }
    function currentNode(node) {
      return !disposed && host && host.contains(node) && node.isConnected;
    }
    function save(node, change, message, after) {
      if (!currentNode(node)) return false;
      if (getOwner() !== owner) {
        update({ month });
        return false;
      }
      if (signature(getBudget()) !== fingerprint) {
        update({ month });
        state.error =
          "Les opérations ont changé. Vérifie les données avant de réessayer.";
        render();
        return false;
      }
      state.error = "";
      state.status = "";
      mutating = true;
      const expectedOwner = owner;
      try {
        const ok = commit((d) => {
          if (disposed || getOwner() !== expectedOwner)
            throw Error("Le compte actif a changé.");
          change(d);
        }, message);
        if (disposed || getOwner() !== expectedOwner) {
          if (!disposed) update({ month });
          return false;
        }
        if (ok !== true) {
          state.error =
            "Le repère ou la modification n’a pas pu être enregistré. Réessaie après avoir vérifié la sauvegarde.";
          render();
          return false;
        }
        model = compute(getBudget());
        fingerprint = signature(model.budget);
        if (after) after();
        state.status = message;
        render();
        return true;
      } catch (error) {
        if (getOwner() !== expectedOwner) {
          update({ month });
          return false;
        }
        state.error =
          error.message || "La modification n’a pas pu être enregistrée.";
        render();
        return false;
      } finally {
        mutating = false;
      }
    }
    function liveRow(id) {
      const row = model.summary.transactions.find((t) => t.id === id);
      if (!row || row.date > E.today())
        throw Error("Cette opération ne peut plus être modifiée ici.");
      return row;
    }
    function onClick(event) {
      const button = event.target.closest(
        "[data-advice-ledger-toggle],[data-advice-open-ledger],[data-advice-open-category],[data-advice-close-category],[data-advice-exception],[data-advice-context],[data-advice-cancel-context],[data-advice-review],[data-advice-unreview],[data-advice-more],[data-advice-cancel-goal],[data-advice-use-current]",
      );
      if (!button || !currentNode(button)) return;
      event.preventDefault();
      event.stopPropagation();
      if (getOwner() !== owner) {
        update({ month });
        return;
      }
      const d = button.dataset;
      state.error = "";
      state.status = "";
      if ("adviceLedgerToggle" in d) state.ledger = !state.ledger;
      else if ("adviceOpenLedger" in d) state.ledger = true;
      else if ("adviceOpenCategory" in d) {
        state.category = d.adviceOpenCategory;
        state.context = null;
        state.goalDraft = null;
        state.goalDirty = false;
      } else if ("adviceCloseCategory" in d) {
        state.category = null;
        state.context = null;
        state.goalDraft = null;
      } else if ("adviceMore" in d)
        state.more[d.adviceMore] = (state.more[d.adviceMore] || 50) + 50;
      else if ("adviceContext" in d) {
        state.context =
          state.context === d.adviceContext &&
          state.contextScope === d.adviceScope
            ? null
            : d.adviceContext;
        state.contextScope = state.context ? d.adviceScope : null;
        state.contextDraft = null;
      } else if ("adviceCancelContext" in d) {
        state.context = null;
        state.contextDraft = null;
      } else if ("adviceCancelGoal" in d) {
        state.goalDraft = null;
        state.goalDirty = false;
      } else if ("adviceUseCurrent" in d) {
        const row = model.summary.categories.find(
          (c) => c.id === state.category,
        );
        state.goalDraft = String(row.netCents / 100);
        state.goalDirty = true;
      } else if ("adviceException" in d) {
        const row = liveRow(d.adviceException);
        save(
          button,
          (draft) => {
            const context = { ...(draft.advice?.transactions?.[row.id] || {}) };
            context.exceptional = !context.exceptional;
            root.ClairAdviceCommands.annotateTransaction(
              draft,
              row.id,
              context,
            );
          },
          "Contexte enregistré. Les montants sont conservés.",
          () => {
            if (!state.goalDirty) state.goalDraft = null;
          },
        );
        return;
      } else if ("adviceReview" in d || "adviceUnreview" in d) {
        const which = d.adviceReview || d.adviceUnreview,
          s = which === "previous" ? model.previous : model.summary;
        save(
          button,
          (draft) => {
            if ("adviceUnreview" in d) {
              if (draft.advice?.months)
                delete draft.advice.months[s.period.month];
            } else
              root.ClairAdviceCommands.reviewMonth(
                draft,
                s.period.month,
                s.period.through,
              );
          },
          "Vérification de la période enregistrée.",
        );
        return;
      }
      render();
    }
    function onInput(event) {
      const form = event.target.closest(
        "[data-advice-goal],[data-advice-context-form]",
      );
      if (!form || !currentNode(form)) return;
      event.stopPropagation();
      if (form.hasAttribute("data-advice-goal")) {
        state.goalDraft = form.elements.amount.value;
        state.goalDirty = true;
      } else
        state.contextDraft = {
          nature: form.elements.nature.value,
          refundOf: form.elements.refundOf.value,
        };
    }
    function onSubmit(event) {
      const form = event.target.closest(
        "[data-advice-goal],[data-advice-context-form]",
      );
      if (!form || !currentNode(form)) return;
      event.preventDefault();
      event.stopPropagation();
      if (getOwner() !== owner) {
        update({ month });
        return;
      }
      try {
        if (form.hasAttribute("data-advice-goal")) {
          state.goalDraft = form.elements.amount.value;
          state.goalDirty = true;
          const categoryId = form.dataset.adviceGoal;
          if (state.category !== categoryId)
            throw Error("Ce détail n’est plus actif.");
          const amountCents = E.cents(state.goalDraft, model.summary.currency);
          if (amountCents <= 0)
            throw Error("Le montant du repère doit être positif.");
          save(
            form,
            (draft) =>
              root.ClairAdviceCommands.setMonthlyGoal(draft, {
                month: E.monthOffset(month, 1),
                categoryId,
                amountCents,
                setOn: E.today(),
              }),
            "Repère mensuel enregistré.",
            () => {
              state.goalDraft = null;
              state.goalDirty = false;
            },
          );
        } else {
          const id = form.dataset.adviceContextForm;
          if (
            state.context !== id ||
            state.contextScope !== form.dataset.adviceScope
          )
            throw Error("Ce formulaire n’est plus actif.");
          const row = liveRow(id),
            nature = form.elements.nature.value,
            refundOf = form.elements.refundOf.value;
          state.contextDraft = { nature, refundOf };
          save(
            form,
            (draft) => {
              const context = nature ? { nature } : null;
              if (context && nature === "refund" && refundOf)
                context.refundOf = refundOf;
              if (context && nature === "expense" && row.context?.exceptional)
                context.exceptional = true;
              root.ClairAdviceCommands.annotateTransaction(draft, id, context);
            },
            "Nature de l’opération enregistrée.",
            () => {
              state.context = null;
              state.contextDraft = null;
            },
          );
        }
      } catch (error) {
        state.error = error.message;
        state.status = "";
        render();
      }
    }
    function update(next = {}) {
      if (disposed) return;
      const nextOwner = getOwner(),
        nextMonth = next.month || month;
      const ownerChanged = owner !== nextOwner,
        monthChanged = nextMonth !== month;
      month = nextMonth;
      owner = nextOwner;
      const budget = getBudget(),
        nextFingerprint = signature(budget);
      if (
        ownerChanged ||
        monthChanged ||
        (!mutating && fingerprint !== nextFingerprint)
      )
        reset();
      if (!ownerChanged && !monthChanged && fingerprint === nextFingerprint)
        return;
      fingerprint = nextFingerprint;
      model = compute(budget);
      render();
    }
    function dispose() {
      if (host) {
        host.removeEventListener("click", onClick);
        host.removeEventListener("submit", onSubmit);
        host.removeEventListener("input", onInput);
        host.removeEventListener("change", onInput);
      }
      disposed = true;
      host = null;
      owner = null;
      fingerprint = null;
      model = null;
      reset();
    }
    function mount(element, next = {}) {
      dispose();
      host = element;
      disposed = false;
      host.addEventListener("click", onClick);
      host.addEventListener("submit", onSubmit);
      host.addEventListener("input", onInput);
      host.addEventListener("change", onInput);
      update({ month: next.month || E.today().slice(0, 7) });
    }
    return { mount, update, dispose };
  }
  root.ClairMonthlyAdviceUI = Object.freeze({ create });
})(typeof window !== "undefined" ? window : globalThis);
