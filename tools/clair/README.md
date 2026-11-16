# Assemblage et livraison Clair

`build-inputs.json` v2 assemble le moteur canonique `clair/domain/engine.js`, les commandes/session dans `clair/application/` et les fragments historiques ; il réutilise le SDK `masterboard/supabase-2.102.0.js`. Transformation `trim` explicite, sept conteneurs/cinq scripts, aucun timestamp. L’index généré est versionné et ne s’édite jamais à la main. Les recettes v1 des anciens commits restent supportées.

Le moteur possède son change lexical imbriqué. `mirrors.json` déclare le fragment `accounts/exchange.js` avec `nestedIn`/`generatedFrom` et deux frontières uniques dans le moteur. Modifier le moteur seulement. `build.mjs --generate` régénère cette compatibilité puis l’index ; `--check`, les miroirs et le lecteur Git du paquet refusent un fragment périmé. `--generate --out /tmp/index.html` ne modifie pas le checkout et exige une compatibilité déjà à jour. Le reste inline se modifie dans `clair/app/index.template.html`. Contrats du store et chemins d’adoption : `docs/architecture/CLAIR.md`.

`package.mjs --ref COMMIT --out /tmp/candidat` résout un commit, lit sa recette, son template et tous ses blobs avec `git ls-tree/show`, puis vérifie son index assemblé avant d’écrire. Un ancien commit sans recette échoue ; il ne récupère pas la recette courante. Les modifications locales et fichiers non suivis ne participent pas. Sortie hors checkout, absente/vide, sans symlink ni traversée ; aucune suppression automatique. Les recettes ont une version explicite ; ne pas changer la sémantique d’une version existante.

`verify-package.mjs --ref COMMIT --out /tmp/candidat` recalcule le jeu exact attendu depuis Git : modifier les fichiers et réécrire leurs empreintes dans le manifeste ne contourne pas la comparaison. Fichiers absents/supplémentaires, répertoires vides et symlinks sont refusés. Le manifeste contient le commit source et SHA256/taille de chaque entrée hors lui-même. Il est déterministe pour un même commit ; il n’est pas une signature d’autorisation de publier. Les listes de recette sont explicites, pas une recherche d’extensions dans le worktree. Le compte avec Conseils est82fichiers :78runtime+2licences+config+manifeste ; ce n’est pas une limite future.

Après publication distinctement autorisée seulement :

```sh
node tools/clair/verify-live.mjs --domain https://PROJET.vercel.app --ref COMMIT_EXACT --manifest /tmp/candidat/clair-package-manifest.json
```

Origine HTTPS Vercel explicite (HTTP loopback pour tests), manifeste identique au commit, `/`307→`/clair/`, chaque fichier servi exact ; pas de redirection de ressources suivie silencieusement. La configuration Vercel est consommée par la plateforme et vérifiée localement, pas requêtée. Le workflow manuel reçoit domaine/commit explicites ; aucun déploiement automatique ni secret.

Vérification locale :

```sh
node tools/clair/tests/build.test.mjs
node tools/clair/tests/package.test.mjs
node tools/clair/tests/live.test.mjs
NODE_PATH=/chemin/playwright/node_modules CLAIR_CHROME_PATH=/chemin/chromium node tools/clair/tests/browser.cjs /tmp/candidat
```

Le test navigateur bloque les requêtes externes, utilise uniquement des budgets fictifs et les octets du paquet, télécharge réellement Clair.html puis teste file://, JSONv3/centimes/SDK et les workers contrôlant une recharge hors ligne. Ici, la politique Chromium interdit file:// : le parcours strict échoue à cette navigation. `CLAIR_SKIP_FILE_POLICY=1` permet uniquement de terminer les assertions HTTP/PWA, avec message LIMIT explicite ; ce résultat ne constitue jamais une preuve file://. Avant de revendiquer cette couverture, exécuter le test strict dans un navigateur/environnement où l’ouverture est autorisée. Les suites VM fichier existantes constituent une preuve distincte. Limite produit connue : atlas relatif non embarqué, repli visuel attendu. Safari physique/installation OS non testés.

Les sources Conseils incluent `clair/config/` ; synthèses/règles et contrôleur restent embarqués. Contrats et prérequis SQL de publication : `docs/architecture/CLAIR_CONSEILS.md`.
