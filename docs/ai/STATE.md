# Clair — état court de reprise

Mis à jour le 12 novembre 2026. Lire AGENTS puis cette page et MAP ; vérifier branche, statut et dernier commit.

## Repères stables

- **Publication : Vercel uniquement**, https://clair-budget.vercel.app/ → `/clair/`, projet `clair-budget`. Paquet manuel sans publication GitHub automatique : `DEPLOYMENT.md`.
- Cible `clair/index.html`, autres apps hors périmètre. JS/CSS statiques canoniques sous `clair/accounts/`, copies identiques embarquées. JSON v3, centimes entiers, dates Europe/Paris, révisions/propriétaire, aucun double débit.
- Production source `dd7c852`, déploiement `dpl_BcrZig2Kb3zVyuegxXPLN9Qbj8TU`, HTML Git `6cf9fb3c1c2e7a80417c6f35b29d36432b837ae8`, SHA1 brute `81dd1f98c12b10a33a0411e84755bf8d075acb21`.

## Trois changements récents

1. Branche **`feat/clair-category-illustrations`**, base `bb8d9f1` de `feat/clair-express` : atlas original 16 illustrations, renderer/sélecteur progressif, historique/paiements/enveloppes/Express, secours vectoriel et SW v40. Moteur/cloud inchangés. Détails : `VISUAL_DELIVERY.md`.
2. `clair/design-preview/` contient trois maquettes interactives A Verre doux / B Express / C Contraste avec accueil, profil lisible et barre flottante/effets de toucher. **A validée par l’utilisateur le 11 novembre** ; données fictives, aucun backend. A intégrée : `glass-ui.js/.css`, profil clair/photo lisible et unités monétaires entières ; copies inline maintenues. Aperçu A Vercel READY + PR30 brouillon : liens dans `VISUAL_DELIVERY.md`. Aucun accord pour production ou Supabase dans cette mission.
3. Express, huit devises et conversion InforEuro novembre 2026 v2 restent publiés. Migration v2 et rappels v3 déjà autorisés/appliqués : ne pas les rejouer. PR29 ouverte ; `main` ancien `dc376fb`, fusion refusée par contrôle automatique faute d’accord distinct. Ne pas contourner. Banque abandonnée : aucune connexion/import/rapprochement à développer.

## Preuves et limites

- Catégories/Express/devises, A, thèmes et hors connexion vérifiés ; revue indépendante et captures avant/après dans la galerie.
- Production contrôlée inchangée après aperçu (30 ressources vérifiées, galerie mobile testée). Pas de Safari/iPhone physique, compte réel ou notification reçue testés. Aide/récupération : restriction d’origine déjà connue. Indexation Google non confirmée ; audits 3/5 non approuvés.

CI157 sur `3ac89db` verte (`43169887491`). A : 35 suites Node et parcours profil/Express/nav/auth verts. Repère mobile glissant 360ms : six cas navigateur (positions intermédiaires, rapidité, focus, redimensionnement, mouvement réduit), aucune donnée modifiée.

## Reprise

Continuer sur la branche visuelle sans écraser Express/devises. A est intégrée et approuvée ; ne pas redemander le choix. CI limitée à 15 min ; nouvelle passe suivie dans la PR30. Toute publication de production ou modification Supabase attend un accord explicite. Ne pas réappliquer `exchange.sql` ni les fixtures SQL en production.
