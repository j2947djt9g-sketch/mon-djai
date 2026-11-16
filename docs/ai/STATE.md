# Clair — état court de reprise

16 novembre 2026. Lire AGENTS puis STATE/MAP ; vérifier branche/statut/dernier commit.

## Repères stables

Production Vercel inchangée : https://clair-budget.vercel.app/clair/ ; ef5c75d, dpl_2B8b56bmoFtVcycXSSuUHg3ktpyd, SW41. Supabase Clair hkssnbvktfscizojhftl/PostgreSQL17.11. Masterboard/Edge/rappels préservés. Banque abandonnée.

## Trois changements récents

1. **Publication Conseils demandée, garde SQL bloquée.** Le16nov l’utilisateur dit « Vas y déploie ». Branche `release/clair-conseils-20261116` depuis17270e9 ; préparation SW42 et libellé « au moins20% » aligné sur le seuil existant. Aucune modification métier. Pas de fusion main ni déploiement effectué. L’auto-revue de l’appel apply_migration a rejeté la garde Supabase persistante : accord distinct jugé insuffisamment explicite. **Ne pas contourner : demander l’accord explicite pour cette seule garde puis reprendre avant Vercel.** Source `clair/accounts/advice-compatibility.sql`, nom clair_advice_schema_compatibility ; aucune donnée existante réécrite, garde absente au préflight.
2. Fonctionnalité intégrée dans PR37 en brouillon : https://github.com/j2947djt9g-sketch/mon-djai/pull/37 ; runtime fe52aba, final17270e9. Contrat et limites `docs/architecture/CLAIR_CONSEILS.md`, résultats `CLAIR_CONSEILS_QA.md`. Bilan compact,≤3conseils locaux quantifiés, périodes déclarées vérifiées, contexte explicite des remboursements/virements/ponctuels, repères mensuels datés, localisation facultative sans GPS. Aucun montant ou cause inventé, aucune transaction créée par un conseil. Revues métier/UI/globale approuvées après corrections ; audit contenu de publication sans blocage.
3. CI175 complète verte sur17270e9 :43872091905 (checks+deuxSQL+Semgrep), y compris file:// strict sur runner.53fichiersNode/7outillage, parcours app/SDK synthétique hors ligne/réponse perdue/propriétaire, Express9/conversion32/profil16/application4 verts. Paquet17270e982fichiers exacts. Local file:// bloqué par politique, Safari physique et synchronisation hébergée réelle non prouvés. Travail `/workspace/clair-conseils-work/`, livraison `release-20261116/`.

## Prochaine action

Terminer/valider le paquet release SW42 puis demander l’accord Supabase explicite expliqué par le rejet automatique. Après accord seulement : appliquer la garde additive préparée, vérifier catalogue/RLS/CAS inchangés puis publier paquet réel sur Vercel clair-budget/équipe team_6GfJ1WkSTn5lXj3kWsLF9FeN et contrôler tous les octets publics. Pas de données fictives en production. Préserver les autres apps et ne pas réappliquer les anciennes migrations.
