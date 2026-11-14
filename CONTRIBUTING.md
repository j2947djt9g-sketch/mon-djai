# Contribuer à Clair

Lire [AGENTS.md](AGENTS.md), [STATE](docs/ai/STATE.md), puis la ligne utile de [MAP](docs/ai/MAP.md). L’entrée humaine est [clair/LISEZ-MOI.md](clair/LISEZ-MOI.md). Installer explicitement Node 24.22.1 (`.nvmrc`) ; le clone seul ne fournit pas le runtime.

Avant une modification :

- Délimiter les fichiers concernés et conserver les autres applications, dont Masterboard.
- Préserver centimes entiers, JSON v3, dates civiles Paris, identifiants, idempotence, révisions, conflits et récupération.
- Consulter `tools/clair/mirrors.json` : 18 sources JS et 8 CSS embarquées, 3 exceptions externes. Modifier la source canonique, puis `node tools/clair/build.mjs --generate` et revoir le HTML versionné ; conserver conteneur et ordre. Le reste inline appartient au template `clair/app/index.template.html`. Voir `tools/clair/README.md`.

Avant une proposition de changement :

- Exécuter `node tools/clair/build.mjs --check`, `node tools/clair/check-mirrors.mjs` et les suites `test-*` pertinentes ; pour le garde-fou, `node clair/accounts/test-mirrors.cjs`.
- Après un changement applicatif, exécuter les parcours `verify-*` concernés avec Playwright 1.64.1 et Chrome configuré. Pour la documentation seule, ne pas répéter les parcours navigateur inchangés.
- Rapporter les commandes réellement exécutées, leurs limites et les échecs ; les simulations ne prouvent pas une livraison d’e-mail.
- Garder STATE court, mettre à jour MAP si le point d’entrée change, revoir le diff et vérifier l’absence de secrets ou données personnelles.

Les diagnostics utilisent des fixtures. Fusion, publication Vercel, compte réel et mutation distante demandent leur autorisation propre ; une vérification locale n’autorise pas une migration en production. La CI fixe Node et Playwright, exécute les suites Node, navigateur et SQL isolées ; voir `.github/workflows/clair-checks.yml`.
