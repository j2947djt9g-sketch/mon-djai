# Clair — état court de reprise

Mis à jour le 11 novembre 2026. Branche de travail : `feat/clair-express`, base `dc376fb`. Production produit : `13fbf2e` ; vérifier branche, statut et dernier commit avant de reprendre.

## Repères stables

- Public : https://clair-budget.vercel.app/ → `/clair/`. Cible : `clair/index.html` ; l’index racine appartient à une autre application.
- HTML/CSS/JS statiques, SDK Supabase embarqué, sources sous `clair/accounts/`. JSON v3, montants entiers en centimes, dates Europe/Paris, stockage et révisions par propriétaire.
- Lire `MAP.md` par tâche ; maintenir les copies embarquées. Éviter les archives `CONTEXTE.md`/`SOURCES.md` sauf besoin précis. Publication manuelle par fichiers, sans lien GitHub–Vercel : `DEPLOYMENT.md`.

## Trois changements récents

1. Branche Express en revue : montant seul, budget courant confirmé une fois par utilisateur, raccourcis, catégorie facultative/historique, correction protégée, mode hors connexion. Région de l’appareil : suggestion modifiable au nouveau budget via `region-currency.js`, sans GPS ni conversion implicite. Modules Express, moteur/cloud et tests. `expressSchema:1` et provenance optionnels préservés ; GBP/MAD/CAD/CHF natifs ; conversion croisée refusée sans taux vérifié.
2. Compatibilité serveur préparée dans `express-compatibility.sql`, testée uniquement sur PostgreSQL isolé. Elle et la mise à jour de rappels des nouvelles devises doivent être publiées avant la livraison finale pour bloquer les anciens clients qui retirent les métadonnées. Import/reset gardent le marqueur et contrôlent propriétaire/contexte. Aucune migration distante, fusion ou publication autorisée.
3. PR27/26 déjà publiées : partage Vercel/SEO, animation de première visite, saisie directe et aide filtres d’épargne. Indexation Google non confirmée ; propositions d’audit 3 et 5 non approuvées. Le plan de contexte court est issu de PR28.

## Vérifications et limites

- Express : 33 suites Node ; Chromium avec comptes fictifs, huit codes devises, vues 320/390 px, standalone simulé et déconnexion/reconnexion. Preuves et limites : `EXPRESS_DELIVERY.md`.
- Banque : volet abandonné à la demande de l’utilisateur. Aucune connexion, aucun import ni rapprochement à développer. `BANKING_FEASIBILITY.md` reste une archive datée.
- Ni compte réel ni iPhone/Safari physique testés. Rappels : correction d’origine Vercel préparée et testée, non publiée. Aide/récupération : restriction d’origine connue ; aucun fonctionnement réel annoncé sans contrôle ciblé.

## Reprise

Examiner la PR29 en brouillon sur `feat/clair-express`. Ne pas fusionner ni publier sans accord explicite. Publication des seules fonctions hors banque : accord explicite demandé ; migration serveur et rappels restent préparés. Le volet bancaire est annulé.
