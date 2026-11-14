# Carte de lecture Clair

`I` = `clair/app/index.template.html`, `A` = `clair/accounts/`, `D` = `clair/domain/engine.js`, `P` = `clair/application/`. `clair/index.html` est généré ; index racine autre app. Lire par extraits `rg -n`.

| Tâche | Source / ancre | Vérifications dans A |
|---|---|---|
| Moteur, centimes, dates Paris, débits | `D` : `normalize`, `occurrences`, `sync`, `balance`, `reserve`, `upcoming`, `skip` | `test-domain`, `test-engine-long-term`, `test-local`, `test-subscriptions` |
| Commandes et propriétaire du budget | `P/budget-commands.js` : `prepareBudgetChange`, `validateBudgetCandidate` ; `P/budget-session.js` : `commit`, `adoptRemote`, `setOwner` ; `I` : `commit`, `adoptCachedBudget`, `importFile`, `budgetReplacementContext` | `test-budget-{commands,session,commit}`, `test-session-integration`, `test-fluidity` |
| Saisie, édition, suppression, import | `I` : `openTx`, `pay`, `catchUp`, `importFile`, branches `tx-form`, `delete-tx`, `reconcile-form` | `test-local`, `test-fluidity`, `verify-fluidity` |
| Express et provenance | `A/express-{core,insights,ui}.js`, `express-ui.css`, `D` ; `express-compatibility.sql` ; `docs/ai/EXPRESS_DELIVERY.md` | `test-express-*`, `verify-express.cjs/.sql` |
| Auth, cache, CAS et récupération | `A/{cloud,account-ui,auth-email}.js`, `schema.sql`, `clair/{reset,help}.html`, `A/{reset-page,device-unlock}.js` ; `docs/ai/EMAIL_CONFIRMATION.md` | `test-{cloud,account-ui,auth-email,confirmation-sdk,recovery,account-security-sdk}`, `verify-auth-entry` |
| Profil, tutoriel, partage | `A/profile-ui.js`, `profile.css` ; `clair/design-preview/`, `docs/ai/VISUAL_DELIVERY.md` | `test-profile`, `verify-profile`, `verify-design-preview` |
| Accueil, apparence, mascotte, sons | `A/{dashboard-ui,companion-ui,sounds}.js`, `dashboard.css` ; `I` : `applyPrefs` | `test-{balance-contrast,mascot-daily,sounds}`, `verify-{browser,sounds}` |
| Journal, catégories, filtres | `A/journal-ui.js` : `createJournalController`, `selectJournalTransactions` ; `journal.css`, `category-art.{js,css}`, `clair/assets/categories/` ; `I` : `txRow`, `category-form` | `test-{journal,category-art}`, `verify-{journal,category-art}` |
| Épargne | `A/savings-ui.js`, `savings-compatibility.sql` ; `D` : `savingsBalance`, `validateSavings`, `normalizeSavings` | `test-savings`, `verify-browser` |
| Devises, région, conversion | `D` : `cents`, `formatMoney`, `validateCurrency`, change imbriqué ; `A/{region-currency,exchange-ui}.js`, `exchange-rates{,-v2}.json`, SQL currency/exchange | `test-{currency,exchange}`, `verify-{currency,exchange}.cjs`, `verify-exchange-v2.sql` ; `docs/ai/EXCHANGE.md` |
| Navigation et démarrage | `clair/ui/{navigation,page-host}.js` ; `I` : `switchPage`, `render`, `startupController` ; `A/welcome.css`, `glass-ui.{js,css}` | `test-{glass-ui,navigation}`, `verify-{render-lifecycle,glass-ui,nav-motion,liquid-nav,navigation,startup-session,welcome}` |
| Rappels et notifications | `I` : `renderReminders`, `enablePush`, `syncPush` ; `clair/sw.js`, `supabase/functions/clair-reminders/index.ts`, `supabase/reminders.sql` ; `A/REMINDERS.md` | `test-push-{ui,server}`, `supabase/verify-reminders.sql` |
| Administration, aide, déverrouillage | `masterboard/` ; `supabase/functions/clair-{masterboard,account-help,device-unlock,account-recovery}/index.ts` et SQL ; `A/device-unlock.js` | `test-{masterboard,assisted-recovery,device-unlock,recovery-limits}`, `verify-masterboard-*` |
| Assemblage, paquet, PWA, publication | `tools/clair/README.md`, `docs/architecture/CLAIR.md`, `docs/ai/DEPLOYMENT.md`, `clair-checks.yml`, `clair/sw.js`, manifest/head/robots/sitemap | `test-service-worker`, `test-mirrors`, `tools/clair/tests/` |

Sources/template → `node tools/clair/build.mjs --generate` → `--check` + `check-mirrors.mjs`. Le moteur possède `accounts/exchange.js`, compatibilité générée depuis ses frontières uniques ; ne pas éditer ce fragment. Cinq scripts/sept conteneurs conservés. `reset-page.js`, `help-page.js`, `recovery-support.css` restent externes. `device-unlock.js` est aussi embarqué.

`node A/test-*.cjs` = Node ; `verify-*.cjs` = Playwright (`CLAIR_CHROME_PATH`). Chargeur VM partagé : `tools/clair/test-support/vm-loader.cjs`. Fixtures adoptées explicitement ; aucun accès mutable à l’état privé. Simulation ≠ email réel ou preuve navigateur file://.
