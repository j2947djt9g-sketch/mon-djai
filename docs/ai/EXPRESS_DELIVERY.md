# Livraison CLAIR Express — 11 novembre 2026

**Publié sur Vercel : https://clair-budget.vercel.app/**, source Express `bb116bb`, complétée par le correctif de conversion `dd7c852` de `feat/clair-express`, déploiement `dpl_BcrZig2Kb3zVyuegxXPLN9Qbj8TU` READY. Migration de compatibilité appliquée et rappels v3 actifs après accord explicite. PR29 ouverte, sans fusion dans `main` : le contrôle automatique a jugé l’autorisation de fusion distincte manquante. Les autres applications du dépôt ne sont pas modifiées.

## Fonctions développées

- Bouton Dépense Express sur l’accueil ; confirmation explicite du budget Clair courant une fois par utilisateur. Aucun faux compte bancaire ajouté.
- Saisie du seul montant ; date civile Europe/Paris, instant UTC, devise et budget ajoutés automatiquement. Catégorie historique prudente ou Non classée ; choix facultatif et correction dans le formulaire existant.
- Raccourcis de montants fréquents, complétés par des montants usuels ; ils remplissent le champ sans enregistrer. Analyse des petites dépenses par catégorie sur 30 jours, seuil affiché. Détection de dépenses similaires disponible comme fonction pure ; aucune fusion ni création automatique.
- Devise suggérée à la création selon la région explicite configurée sur l’appareil : MA→MAD, CA→CAD, CH→CHF et régions des devises existantes. Choix modifiable, aucune position GPS ou recherche IP ; une langue sans région et une région inconnue gardent le choix EUR existant. Aucun changement des budgets déjà initialisés.
- Montants entiers en centimes, EUR/USD/GBP/MAD/CAD/CHF/XOF/XAF ; francs CFA entiers. Conversion des huit codes par référence InforEuro novembre 2026 ; détails de politique, tests et déploiement dans `EXCHANGE.md`. JSON v3 conservé avec extension Express optionnelle.
- Ticket stable, verrou de soumission, insertion idempotente, validation stricte, reprise après erreur de stockage, persistance locale puis synchronisation existante. Contrôles du propriétaire, de la session et des changements de budget ; correction impossible après suppression/modification concurrente.
- Métadonnées Express préservées dans sauvegardes, synchronisation et conversions autorisées. Import/reset conservent le marqueur de compatibilité et vérifient leur contexte avant toute écriture.

## Organisation et revue

Huit rôles mobilisés : UX (1), architecture (2), sécurité/confidentialité (3), étude bancaire (4), automatisation historique (5), QA (6), relecture indépendante (7), intégration/livraison (8). Les contributions ont été réunies sur un seul worktree dédié ; fichiers partagés intégrés par le coordinateur.

Problèmes corrigés : changement d’utilisateur pendant l’import asynchrone ; écrasement d’un schéma futur lors d’un import ancien ; catégorie Non classée absente des formulaires classiques ; allowlists des nouvelles devises du profil/rappels ; rangée mobile fixe conservant les commandes et la jauge d’épargne visibles ; fausse confiance avec historique incomplet ; conflits inutiles dus à l’ordre des clés de provenance ; autorisation exacte de l’origine Vercel pour les rappels, en conservant JWT et isolation des propriétaires. Un test Auth dépendant de la vitesse du SHA-256 attend maintenant le véritable appel simulé, sans réduire ses assertions.

## Vérifications

- `node clair/accounts/test-*.cjs` exécutés individuellement par boucle : **33 suites passent** après l’extension régionale. La phase Express initiale en comptait 32. Les quatre nouvelles suites couvrent moteur Express, cœur idempotent, historique et UI. UI : dix groupes, dont 0,50/3/25 €, huit codes devises, entrées invalides, quota, doubles soumissions, deux utilisateurs, corrections/suppressions, import/reset et refus de schéma futur.
- Chromium/Playwright : **15 scripts** exécutés, dont `verify-express`, `verify-currency`, `verify-fluidity`, `verify-exchange`, `verify-profile`, `verify-browser`, `verify-auth-entry`, `verify-startup-session`, `verify-navigation`, `verify-welcome`, `verify-journal`, `verify-sounds`, `verify-subscriptions`, `verify-device-unlock`, `verify-assisted-recovery`. Express final : neuf scénarios, vues 320/390 px, standalone simulé, stockage hors connexion, reconnexion sur CAS fictif, correction gardant la provenance et Non classée. Parcours devise final : 37 cas, huit codes × quatre largeurs et cinq scénarios régionaux (ar-MA, fr-CA, de-CH, ja-JP et fr). La reprise finale réexécute les dix scripts concernés : Express, currency, browser, exchange, fluidity, auth-entry, startup-session, navigation, welcome et profile.
- PostgreSQL 17.6 Docker isolé : `verify-currency.sql`, `verify-exchange.sql`, `verify-express.sql` passent. Le dernier vérifie GBP/MAD/CAD/CHF, le refus de retrait du marqueur/provenance, suppression/reset explicites, refus de conversion sans taux des nouvelles devises et conversion EUR→USD autorisée.
- Le premier passage CI a révélé un retour à la ligne mobile selon la police. Une grille fixe et un test de police de secours vérifient maintenant l’alignement calcul/Ajouter/Express, les cibles de 44 px et l’ouverture/fermeture du calcul. Copies sources embarquées et `git diff --check` vérifiés. Nouveaux contrôles Express ajoutés à GitHub Actions ; les résultats CI distants sont à consulter sur la PR.

Données et sessions fictives uniquement. Aucun essai de vrai compte, banque, iPhone/Safari physique, installation PWA réelle, email ou notification reçue. Le volet bancaire est abandonné. La synchronisation navigateur est testée avec transport Supabase simulé ; SQL testé séparément en local ; les définitions et protections déployées ont été contrôlées sans écrire de budget réel.

## Fichiers modifiés

- Produit : `clair/index.html` ; `clair/accounts/{cloud,dashboard-ui,exchange,exchange-ui,profile-ui}.js` ; nouveaux `express-{core,insights,ui}.js` et `express-ui.css`, `region-currency.js`.
- Compatibilité : `clair/accounts/express-compatibility.sql`, `clair/accounts/REMINDERS.md` ; rappels CLAIR : `supabase/functions/clair-reminders/{schedule,handler}.mjs`.
- Tests : `clair/accounts/test-{account-ui,cloud,currency,exchange,profile,push-server}.cjs`, `test-express-{core,engine,insights,ui}.cjs`, `test-region-currency.cjs`, `verify-{currency,express}.cjs`, `verify-express.sql` ; `.github/workflows/clair-checks.yml`.
- Contexte/documentation : `docs/ai/{STATE,MAP,BANKING_FEASIBILITY,EXPRESS_DELIVERY}.md` ; conception et plan sous `docs/superpowers/{specs,plans}/2026-11-05-clair-express*.md`.

## Périmètre et livraison

Le volet bancaire est abandonné à la demande de l’utilisateur. Aucune connexion, aucun import ni rapprochement bancaire n’est prévu. L’étude déjà réalisée reste une archive datée dans `BANKING_FEASIBILITY.md`. Les fonctions livrées utilisent le budget Clair et la saisie manuelle Express.

Livraison réalisée :

1. Migration `clair_express_schema_and_native_currencies` appliquée ; vérification des huit devises, RLS, garde épargne, provenance Express, sécurité invoker et garde de conversion atomique. Aucun budget réécrit.
2. Bundle complet `clair-reminders` v3 actif, fichiers relus identiques au code validé. Requêtes réelles : origines Vercel/GitHub OPTIONS 204, origine étrangère 403, POST sans JWT 401. Aucun envoi de notification déclenché pour un test.
3. Vercel production READY, deux alias attendus, racine 307 vers `/clair/`. Les 47 ressources publiques correspondent octet par octet au paquet de 48 fichiers (configuration Vercel comprise). HTML Git courant : `6cf9fb3c1c2e7a80417c6f35b29d36432b837ae8`.
4. Vérification indépendante sur le site public : Express EUR 0,50→3, MAD 0,50→3 et nouvelle dépense de 25, XOF entier, doublons/correction/hors connexion et région ar-MA proposant MAD avec choix CAD conservé. HTML et ressources réels ; toutes les requêtes Supabase de ces parcours sont interceptées avec données fictives, sans écriture réelle.
5. `main` n’a pas été fusionné : rejet du contrôle automatique sur cette action distincte. La publication Vercel autorisée a utilisé directement la branche testée ; ne pas republier l’ancien `main`. La PR29 conserve le code et les preuves.

Aucun fournisseur activé, secret bancaire demandé ou coût engagé. Le correctif des rappels autorise les origines exactes GitHub Pages et Vercel, avec tests CORS, JWT et propriétaires ; il est publié dans la version 3. Les restrictions d’origine déjà connues de récupération/aide sur Vercel restent à contrôler séparément. Aucun test local ne prouve une réception réelle de notification.

## Correctif des devises grisées

Le correctif `dd7c852` ajoute les taux officiels communs aux huit devises et un protocole de conversion v2, sans changer les anciens taux/RPC. Migration spécifique autorisée et appliquée, Vercel READY, 47 ressources publiques identiques. Les trois parcours mobiles de conversion publics passent avec données fictives. Voir `EXCHANGE.md` pour les sources, les 64 calculs vérifiés et les limites. Le nouveau calcul ne réécrit aucun budget à l’installation ; il s’applique lors d’une conversion explicitement confirmée.
