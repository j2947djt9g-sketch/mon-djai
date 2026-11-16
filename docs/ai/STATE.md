# Clair — état court de reprise

16 novembre 2026. Lire AGENTS puis STATE/MAP ; vérifier branche/statut/dernier commit.

## Repères stables

Production Vercel : https://clair-budget.vercel.app/clair/ ; runtime21dc507, SW42, dpl_Bmr6F84cTKNcHrbJyntLFgvdh86r READY, deux alias habituels. Branche `release/clair-conseils-20261116` ; main non fusionné, PR37 brouillon. Supabase Clair hkssnbvktfscizojhftl. Masterboard/Edge/rappels préservés ; banque abandonnée.

## Trois changements récents

1. **CLAIR Conseils publié après accords.** Demande « Vas y déploie », puis Oui explicite à l’installation de la garde Supabase. Le rejet initial de l’auto-revue est résolu, migration clair_advice_schema_compatibility20261116141125 appliquée. Source exacte, invoker/search_path vide/EXECUTE révoqué ;23fonctions/3gardes/RLS/politiques/grants antérieurs inchangés. Aucun compte ou historique réécrit. Ne pas réappliquer la garde ni les anciennes migrations. Rapport `docs/architecture/CLAIR_CONSEILS_RELEASE.md`.
2. Bilan compact,≤3conseils locaux chiffrés, périodes déclarées vérifiées, contexte explicite remboursements/virements/ponctuels, repères mensuels datés et localisation facultative sans GPS. Aucun montant ou cause inventé, aucune transaction créée par un conseil. Contrats `CLAIR_CONSEILS.md`, QA `CLAIR_CONSEILS_QA.md`. Les revues métier/UI/globale ont approuvé après correction ; dernier audit contenu sans blocage. Release : SW42 et formulation « atteint au moins20% » sans changer seuils/calculs.
3. Preuves :CI175 complète verte sur feature17270e9 (checks/deuxSQL/Semgrep, file:// strict runner),53fichiersNode/7outillage. Delta release :tests ciblés SW/règles11/build/miroirs et paquet82fichiers verts ;81URL publiques exactes via deux contrôles TLS. Quatre parcours publics390/1440clair/sombre sur octets épinglés :1050/777/273/80€, tag45conserve tout, repère140sans transaction, Express0,50double→1, navigation persistante, zéro erreur. Auth/CAS simulés seulement ; Safari physique et synchronisation hébergée réelle non prouvés. Logs Vercel15min sans groupeerror/fatal, pas de drain.

## Prochaine action

Publication terminée. Lors d’un prochain changement, réutiliser moteur/commandes/session/page-host existants et lire seulement la ligne utile de MAP. Preuves `/workspace/clair-conseils-work/release-20261116/`, candidat immuable `candidate-21dc507`. Pas de nouvelle publication, changement Supabase ou merge main implicitement autorisé par cette livraison. Garder la protection des budgets marqués lors d’un éventuel retour frontend. Jamais modifier index généré à la main ni injecter une fixture dans le paquet réel.
