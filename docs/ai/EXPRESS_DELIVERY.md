# Livraison CLAIR Express — 5 novembre 2026

Branche dédiée : `feat/clair-express`, base `dc376fb`. **Aucune fusion, publication Vercel, migration distante ou connexion bancaire effectuée.** Les autres applications du dépôt ne sont pas modifiées.

## Fonctions développées

- Bouton Dépense Express sur l’accueil ; confirmation explicite du budget Clair courant une fois par utilisateur. Aucun faux compte bancaire ajouté.
- Saisie du seul montant ; date civile Europe/Paris, instant UTC, devise et budget ajoutés automatiquement. Catégorie historique prudente ou Non classée ; choix facultatif et correction dans le formulaire existant.
- Raccourcis de montants fréquents, complétés par des montants usuels ; ils remplissent le champ sans enregistrer. Analyse des petites dépenses par catégorie sur 30 jours, seuil affiché. Détection de dépenses similaires disponible comme fonction pure ; aucune fusion ni création automatique.
- Montants entiers en centimes, EUR/USD/GBP/XOF/XAF ; francs CFA entiers. GBP natif, conversion croisée refusée faute de taux vérifié. JSON v3 conservé avec extension Express optionnelle.
- Ticket stable, verrou de soumission, insertion idempotente, validation stricte, reprise après erreur de stockage, persistance locale puis synchronisation existante. Contrôles du propriétaire, de la session et des changements de budget ; correction impossible après suppression/modification concurrente.
- Métadonnées Express préservées dans sauvegardes, synchronisation et conversions autorisées. Import/reset conservent le marqueur de compatibilité et vérifient leur contexte avant toute écriture.

## Organisation et revue

Huit rôles mobilisés : UX (1), architecture (2), sécurité/confidentialité (3), étude bancaire (4), automatisation historique (5), QA (6), relecture indépendante (7), intégration/livraison (8). Les contributions ont été réunies sur un seul worktree dédié ; fichiers partagés intégrés par le coordinateur.

Problèmes corrigés : changement d’utilisateur pendant l’import asynchrone ; écrasement d’un schéma futur lors d’un import ancien ; catégorie Non classée absente des formulaires classiques ; allowlists GBP du profil/rappels ; rangée d’actions compacte conservant la première jauge d’épargne visible ; fausse confiance avec historique incomplet ; conflits inutiles dus à l’ordre des clés de provenance. Un test Auth dépendant de la vitesse du SHA-256 attend maintenant le véritable appel simulé, sans réduire ses assertions.

## Vérifications

- `node clair/accounts/test-*.cjs` exécutés individuellement par boucle : **32 suites passent** après intégration. Les quatre nouvelles suites couvrent moteur Express, cœur idempotent, historique et UI. UI : dix groupes, dont 0,50/3/25 €, cinq codes devises, entrées invalides, quota, doubles soumissions, deux utilisateurs, corrections/suppressions, import/reset et refus de schéma futur.
- Chromium/Playwright : **15 scripts** exécutés, dont `verify-express`, `verify-currency`, `verify-fluidity`, `verify-exchange`, `verify-profile`, `verify-browser`, `verify-auth-entry`, `verify-startup-session`, `verify-navigation`, `verify-welcome`, `verify-journal`, `verify-sounds`, `verify-subscriptions`, `verify-device-unlock`, `verify-assisted-recovery`. Express : six scénarios, vues 320/390 px, standalone simulé, stockage hors connexion, reconnexion sur CAS fictif, correction gardant la provenance et Non classée. Parcours devise : 20 cas, cinq codes × quatre largeurs.
- PostgreSQL 17.6 Docker isolé : `verify-currency.sql`, `verify-exchange.sql`, `verify-express.sql` passent. Le dernier vérifie GBP, le refus de retrait du marqueur/provenance, suppression/reset explicites, refus de conversion GBP sans taux et conversion EUR→USD autorisée.
- Copies sources embarquées et `git diff --check` vérifiés. Nouveaux contrôles Express ajoutés à GitHub Actions ; les résultats CI distants sont à consulter sur la PR.

Données et sessions fictives uniquement. Aucun essai de vrai compte, banque, iPhone/Safari physique, installation PWA réelle, email ou notification reçue. Le rapprochement bancaire **n’est ni implémenté ni testé**. La synchronisation navigateur est testée avec transport Supabase simulé ; SQL testé séparément en local.

## Fichiers modifiés

- Produit : `clair/index.html` ; `clair/accounts/{cloud,dashboard-ui,exchange,profile-ui}.js` ; nouveaux `express-{core,insights,ui}.js` et `express-ui.css`.
- Compatibilité : `clair/accounts/express-compatibility.sql`, `clair/accounts/REMINDERS.md` ; rappels CLAIR : `supabase/functions/clair-reminders/schedule.mjs`.
- Tests : `clair/accounts/test-{account-ui,cloud,currency,exchange,profile,push-server}.cjs`, `test-express-{core,engine,insights,ui}.cjs`, `verify-{currency,express}.cjs`, `verify-express.sql` ; `.github/workflows/clair-checks.yml`.
- Contexte/documentation : `docs/ai/{STATE,MAP,BANKING_FEASIBILITY,EXPRESS_DELIVERY}.md` ; conception et plan sous `docs/superpowers/{specs,plans}/2026-11-05-clair-express*.md`.

## Banque, coûts et décisions nécessaires

Étude complète et sources : [BANKING_FEASIBILITY.md](BANKING_FEASIBILITY.md). Aucune voie gratuite durable en production n’a été vérifiée pour les comptes visés. SG France DSP2/Revolut Open Banking exigent des prestataires réglementés et conditions adaptées. Revolut personnel n’a pas d’API publique. Revolut Business Grow France est affiché à **35 €/mois**, API incluse pour son propre compte Business. Bridge/Powens/Tink/TrueLayer nécessitent des conditions commerciales ; tarifs applicables non vérifiés, ne pas les chiffrer arbitrairement. Gratuité/admission actuelles de GoCardless non établies.

À autoriser séparément :

1. Appliquer `express-compatibility.sql` après `exchange.sql` avant toute publication : sans cette garde serveur, un ancien client peut retirer des métadonnées Express. Préparer sauvegarde et contrôle ciblé lors de cette intervention.
2. Publier la fonction de rappels CLAIR mise à jour pour GBP, puis fusionner/publier l’application après accord explicite. Vérifier les cibles de `DEPLOYMENT.md` ; aucune publication automatique GitHub–Vercel configurée.
3. Valider éventuellement la phase D : import local avec prévisualisation, déduplication et rapprochement réversible confirmé par montant/devise/compte/date. Le format réel des relevés et le pays/type des banques restent à préciser. Une correspondance incertaine ne créera aucun débit sans validation.

Aucun fournisseur activé, secret bancaire demandé ou coût engagé. Les restrictions d’origine déjà connues de récupération/aide/rappels sur Vercel restent à contrôler séparément ; les tests locaux ne les lèvent pas.
