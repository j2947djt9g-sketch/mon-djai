/* Documentary resources only. No financial values, external requests or inferred residence. */
(function (root) {
  "use strict";
  const france = Object.freeze([
    Object.freeze({
      title: "Comment faire ses comptes ?",
      description:
        "Un guide pour recenser ses ressources, ses dépenses et suivre son budget.",
      source: "Banque de France — Mes questions d’argent",
      url: "https://www.mesquestionsdargent.fr/budget/comment-faire-ses-comptes",
      publication: null,
      checkedAt: "2026-11-15",
      geography: "France",
      eligibility:
        "Ressource pédagogique en accès libre ; aucun droit à une aide évalué.",
    }),
  ]);
  const empty = Object.freeze([]);
  root.ClairAdviceReferences = Object.freeze({
    forCountry: (country) => (country === "FR" ? france : empty),
  });
})(typeof window !== "undefined" ? window : globalThis);
