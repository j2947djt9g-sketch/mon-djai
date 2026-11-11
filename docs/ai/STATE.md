# Clair — état court de reprise

Mis à jour le 11 novembre 2026. Production : source `bb116bb`, publiée sur Vercel. Vérifier branche, statut et dernier commit avant de reprendre.

## Repères stables

- **Publication CLAIR : Vercel uniquement**, https://clair-budget.vercel.app/ → `/clair/`, projet `clair-budget`. Paquet manuel, sans publication automatique depuis GitHub : `DEPLOYMENT.md`.
- Cible : `clair/index.html` ; l’index racine appartient à une autre application. HTML/CSS/JS statiques, SDK Supabase embarqué, sources sous `clair/accounts/`.
- JSON v3, montants entiers en centimes, dates Europe/Paris, stockage/révisions par propriétaire. Lire `MAP.md` par tâche et maintenir les copies embarquées ; éviter les archives volumineuses.

## Trois changements récents

1. Express publié : montant seul, budget courant confirmé une fois, raccourcis, catégorie proposée/modifiable, correction protégée et hors connexion. Huit codes natifs EUR/USD/GBP/MAD/CAD/CHF/XOF/XAF. Région de l’appareil : suggestion modifiable au nouveau budget, sans GPS. Aucune conversion croisée GBP/MAD/CAD/CHF sans taux vérifié.
2. Migration `clair_express_schema_and_native_currencies` appliquée : garde Express/provenance et huit devises, sans réécriture des budgets ; RLS, garde épargne et conversion atomique conservées. Rappels `clair-reminders` version 3 actifs, origines exactes Vercel/GitHub autorisées, JWT/propriétaires conservés.
3. PR29 reste ouverte sur `feat/clair-express`. Le contrôle automatique a refusé la fusion dans `main`, jugeant l’accord de fusion distinct manquant. L’utilisateur a autorisé la migration, les rappels et la publication Vercel ; la version testée a été publiée directement depuis la branche. `main` reste `dc376fb` : ne pas republier cet ancien produit.

## Vérifications et limites

- Code `bb116bb` : 33 suites Node, parcours navigateur/SQL et Semgrep verts (workflow `43057880460`). En public : racine 307, 46 fichiers identiques, smoke Express EUR/MAD/XOF et région ar-MA→MAD avec choix CAD, transport Supabase fictif. Preuves : `EXPRESS_DELIVERY.md`.
- Vercel READY : `dpl_BFsXnKrXBdAGdiGt7JkbVWvr8EcH`, HTML Git `ef0314a4f9cbe57d9aa092a3219d249130ecd360`. Rappels réels : préflight 204, origine étrangère 403, requête sans JWT 401 ; aucune notification envoyée pour un test.
- Ni compte réel ni iPhone/Safari physique testés. Aide/récupération : restriction d’origine déjà connue, à contrôler séparément. Indexation Google non confirmée ; propositions d’audit 3/5 non approuvées.
- Banque : volet abandonné ; aucune connexion, aucun import ni rapprochement à développer. Étude archivée.

## Reprise

Partir de la version publiée sur `feat/clair-express`. La fusion GitHub reste une action distincte à autoriser ; ne pas contourner son refus automatique. Toute future publication CLAIR se fait sur Vercel.
