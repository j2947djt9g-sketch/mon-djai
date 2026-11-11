# Carte de lecture Clair

Lecture **par tâche**, chemins depuis la racine : `I` = `clair/index.html`, `A` = `clair/accounts/`. Clair démarre dans `I` ; l’index racine est une autre app.

Chercher avec `rg -n`, puis lire un extrait. Éviter `I`, `SOURCES.md` et les SDK en entier.

| Tâche | Lire / ancre exacte | Vérifications ciblées dans `A` |
|---|---|---|
| Moteur, dates, débits automatiques | **Inline seulement dans `I`** : `root.ClairEngine =`, `normalize`, `occurrences`, `sync`, `balance`, `reserve`, `upcoming`, `skip` | `test-engine-long-term.cjs`, `test-local.cjs`, `test-subscriptions.cjs` |
| Saisie, modification, suppression, import | **Inline `I`** : `commit`, `catchUp`, `openTx`, `pay`, `importFile` ; branches partagées `if(form.id==='tx-form')`, `if(action==='delete-tx'&&t)`, `if(form.id==='reconcile-form')` | `test-local.cjs`, `test-fluidity.cjs`, `verify-fluidity.cjs` |
| Express, historique | `A/express-{core,insights,ui}.js`, `A/express-ui.css`, moteur inline ; `express-compatibility.sql` ; livraison `EXPRESS_DELIVERY.md` ici | `test-express-*.cjs`, `verify-express.cjs`, `verify-express.sql` |
| Auth, synchronisation, récupération | `A/cloud.js`, `A/account-ui.js`, `A/schema.sql` ; pages `clair/reset.html`, `clair/help.html` et `A/reset-page.js`, `A/device-unlock.js` | `test-cloud.cjs`, `test-account-ui.cjs`, `test-recovery.cjs`, `test-account-security-sdk.cjs`, `verify-auth-entry.cjs` |
| Profil, tutoriel, partage | `A/profile-ui.js`, `A/profile.css` ; `shareClair`, `openTutorial`, `dailyGoalCents` | `test-profile.cjs`, `verify-profile.cjs` |
| Accueil, styles, mascotte, sons | `A/dashboard-ui.js`, `A/dashboard.css`, `A/companion-ui.js`, `A/sounds.js` ; styles de base et `applyPrefs` dans `I` | `test-balance-contrast.cjs`, `test-mascot-daily.cjs`, `test-sounds.cjs`, `verify-browser.cjs` |
| Journal, catégories, filtres | `A/journal-ui.js`, `A/journal.css` ; gestionnaires `journal-flow`, `category-form`, `search` dans `I` | `test-journal.cjs`, `verify-journal.cjs` |
| Épargne | `A/savings-ui.js`, `A/savings-compatibility.sql` ; moteur inline `savingsBalance`, `validateSavings`, `normalizeSavings` | `test-savings.cjs`, `verify-browser.cjs` |
| Devises, région, conversion | Moteur inline `cents`, `formatMoney`, `validateCurrency` ; `A/region-currency.js`, `A/exchange.js`, `A/exchange-ui.js`, `A/exchange-rates.json`, `A/currency-compatibility.sql`, `A/exchange.sql` | `test-currency.cjs`, `test-exchange.cjs`, `verify-currency.cjs`, `verify-exchange.cjs` |
| Navigation, démarrage, configuration | **Inline `I`** : `switchPage`, `render`, `welcome`, `const startAccount=`, `startupController`, `beginSetup`, `collectWizard`, `completeSetup` ; `A/welcome.css` | `test-navigation.cjs`, `test-guidance.cjs`, `verify-navigation.cjs`, `verify-startup-session.cjs`, `verify-welcome.cjs` |
| Rappels, notifications | Inline `renderReminders`, `enablePush`, `syncPush` ; `clair/sw.js`, `supabase/functions/clair-reminders/index.ts`, `supabase/reminders.sql`, `A/REMINDERS.md` | `test-push-ui.cjs`, `test-push-server.cjs`, `supabase/verify-reminders.sql` |
| Administration, aide, déverrouillage | `masterboard/README.md`, `masterboard/masterboard.js` ; `supabase/functions/clair-{masterboard,account-help,device-unlock,account-recovery}/index.ts`, SQL correspondants dans `supabase/` ; `A/device-unlock.js` | `test-masterboard.cjs`, `test-assisted-recovery.cjs`, `test-device-unlock.cjs`, `test-recovery-limits.cjs` |
| Publication, PWA, SEO, documentation | `DEPLOYMENT.md` ici ; `.github/workflows/clair-{checks,live-check}.yml` ; `clair/sw.js`, `clair/manifest.webmanifest`, `<head>` de `I`, `robots.txt`, `sitemap.xml`, `_config.yml` ; produit : `clair/docs/PRD.md` | `test-service-worker.cjs` ; contrôles dans les workflows |

Les modules JS et CSS cités (dont Express) ont une **copie identique** dans `I` : maintenir les deux. Exceptions : `reset-page.js` est externe à `reset.html` ; `help.html` charge `device-unlock.js`, aussi embarqué dans `I`. `recovery-support.css` reste externe. Les gestionnaires partagés et le démarrage ne sont pas des modules séparés.

Depuis la racine : `node clair/accounts/<fichier>.cjs`. `test-*` : Node ; `verify-*.cjs` : navigateur, Playwright et Chromium (`CLAIR_CHROME_PATH` selon le script). CI et SQL : `clair-checks.yml`. Choisir selon la modification ; une simulation ne prouve pas un envoi réel.
