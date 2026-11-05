# Clair Express et préparation du suivi bancaire

## Autorisation et périmètre

L’utilisateur a demandé l’implémentation des phases A (Dépense Express) et B (raccourcis et catégorisation), l’étude C et une proposition D. Il a confirmé que le compte par défaut est **le budget Clair courant, confirmé une fois**, sans comptes bancaires séparés. La branche dédiée et la PR sont autorisées ; **aucune fusion dans main, aucun déploiement, aucune banque ni migration distante** ne sont autorisés.

Conserver HTML/CSS/JS existants, JSON v3, centimes entiers, synchronisation/révisions et isolation des utilisateurs. EUR, USD, GBP, XOF et XAF sont couverts (les deux codes CFA représentent la même famille FCFA). GBP est nouveau : saisie native, pas de taux de conversion inventé.

## Parcours retenu

Un bouton « Dépense Express » sur l’accueil ouvre une seule fenêtre. À la première utilisation du budget, un écran de cette même fenêtre demande de confirmer « Utiliser mon budget Clair » ; ce choix est conservé dans son payload privé. Ensuite, seul le montant est nécessaire. Date civile Europe/Paris, heure réelle, devise et compte sont automatiques.

Les raccourcis remplissent le montant, sans enregistrer. La catégorie est une suggestion fondée sur l’historique ou « Non classée » ; un choix facultatif permet de la corriger. La confirmation après sauvegarde propose une correction dans le formulaire classique. L’historique reste toujours modifiable. Une prévision, suggestion ou similarité ne crée aucune opération.

Éviter une refonte multi-comptes, une nouvelle API IA, tout SDK bancaire, un import bancaire effectif et une fusion automatique de transactions. La phase D reste documentaire jusqu’à validation.

## Contrats de données et moteur

- Extension facultative `expressSchema:1` du JSON v3. Budgets historiques sans ce champ inchangés.
- Choix confirmé : `preferences.express = {defaultAccountId:'current-budget'}`. Absent avant confirmation. Pas de choix ou historique stocké dans une clé globale partagée entre utilisateurs.
- Une transaction Express garde les champs habituels et `express:{source:'express',createdAt:<ISO UTC>,originalCurrency:<code>,accountId:'current-budget',idempotencyKey:<safeId>}`.
- `express` absent sur les transactions historiques. S’il est présent, les champs doivent être valides et la clé d’idempotence unique dans le budget. Refuser une sauvegarde/import incohérent plutôt que supprimer silencieusement ces informations.
- Métadonnées originales conservées lors d’une correction et d’une conversion. Le montant courant reste dans la devise courante du budget ; `originalCurrency` décrit la saisie initiale, pas un taux bancaire. Aucune correspondance bancaire future ne doit l’interpréter seule comme un montant bancaire original.
- Export/import et cloud conservent les extensions. Une garde de compatibilité côté serveur est préparée pour empêcher un ancien client d’effacer les champs Express ; elle n’est pas appliquée en production.
- Ajouter `E.dateAt(instant)` réutilisé par `today()` pour calculer la date civile depuis le même instant que l’horodatage Express.
- GBP : formatage/saisie/stockage natifs, GBP→GBP identique ; les paires mixtes GBP sont refusées avec un message de taux vérifié indisponible. Conserver les conversions vérifiées EUR/USD/XOF/XAF. Préparer les adaptations SQL nécessaires sans les exécuter à distance.

## Modules et interfaces communes

### `clair/accounts/express-core.js` — global `ClairExpressCore`

Module pur sans stockage, réseau ou connaissance d’un utilisateur connecté.

- `hasDefaultAccount(data) -> boolean`.
- `confirmDefaultAccount(data)` : mutation du brouillon uniquement à appeler dans `commit`; positionne le choix et `expressSchema:1`.
- `prepareExpense(E,data,{id,rawAmount,createdAt,categoryId}) -> transaction` : valide budget configuré, choix confirmé, identifiant, catégorie sûre hors épargne/revenu, horodatage, devise et montant strictement positif avec `E.cents`. Nom automatique « Dépense Express », date `E.dateAt(createdAt)`.
- `addExpense(E,data,input) -> {created:boolean,transaction}` : prépare et ajoute uniquement si aucun identifiant/clé déjà présent. Même requête répétée = aucune nouvelle transaction ; collision avec contenu différent = erreur. Ne crée aucune transaction de prédiction.

### `clair/accounts/express-insights.js` — global `ClairExpressInsights`

- `suggestCategory(data,amountCents,validCategoryIds,{asOf,lookbackDays=90,minSamples=2,minShare=.75})` → `{categoryId,confidence,sampleCount}` ; repli `non-classee`, `confidence:'none'`.
- `frequentAmounts(data,{asOf,lookbackDays=90,limit=4,minCount=2})` → `{amountCents,count,lastDate,categoryId}[]`.
- `similarExpenses(data,{amountCents,categoryId,asOf,lookbackDays=90,limit=5})` → petits descripteurs copiés.
- `smallExpenseSummary(data,{asOf,lookbackDays=30,thresholdCents})` → devise, bornes, nombre/total et `byCategory:[{categoryId,count,totalCents}]`.
- Historique courant seulement, montants sûrs et valides pour la devise ; exclure futur, revenu, épargne et automatismes. Aucun réseau, horloge implicite, stockage ou mutation. Une catégorie inconnue compte dans l’incertitude, pas comme une preuve de certitude pour les autres.

### `clair/accounts/express-ui.js` et `.css` — fragment dans l’IIFE UI existante

Fonctions de raccordement : `expressHomeAction()`, `openExpress()`, `expressAction(button)`, `expressSubmit(form)`, `expressReset()`, `expressRefresh()` ; fonctions facultatives de changement de montant/catégorie.

Actions : `express-open`, `express-confirm-account`, `express-amount` (cents), `express-edit` si nécessaire. Formulaire montant `#express-form`, montant `[name=amount]`, catégorie `[name=categoryId]`, identifiant `[name=requestId]`. Confirmation `#express-account-form` ou action `express-confirm-account` ; bouton explicite « Utiliser mon budget Clair ». Une seule fenêtre `#dialog` existante, type `modal.kind='express'`.

Le module utilise `E`, `data`, `cloud`, `KEY`, `snapshot`, `commit`, `dialog`, `close`, `notify`, `openTx` existants. Les deux modules purs sont embarqués avant l’IIFE UI, sans décaler les index des quatre scripts existants : les intégrer dans le script du moteur, après sa fermeture, comme les autres utilitaires purs. Le fragment UI est intégré avant les gestionnaires d’événements.

Session de saisie : identifiant stable créé à l’ouverture ; propriétaire/contextes `{KEY,userId,epoch,currency,currencyRevision}` et snapshot de départ. Vérifier contexte + formulaire + modal au submit. Verrou synchrone ; consommer le ticket seulement après `commit=true`. Nouvelle tentative après validation/quota possible. Ancien formulaire, déconnexion/changement de compte/devise ou mise à jour extérieure invalident le ticket sans écrire.

Le hook `expressRefresh()` s’exécute au rendu pour invalider un contexte obsolète ; ne pas perdre le brouillon d’une sauvegarde en cours. La correction après succès vérifie propriétaire et empreinte de la transaction avant `openTx`. Ne jamais recréer une transaction supprimée. La soumission classique préserve `old.express`.

Les suggestions sont recalculées depuis `data` courant. Les raccourcis sans historique sont de simples valeurs de remplissage, adaptées aux francs entiers. Une analyse facultative peut montrer les dépenses ≤25 unités (EUR/USD/GBP) ou ≤2 500 francs CFA sur 30 jours, avec seuil explicite ; ce n’est pas une conversion de devises.

## Répartition et intégration

| Agent | Propriété des fichiers / responsabilité |
|---|---|
| 1 UX | `express-ui.js`, `express-ui.css`, raccordement canonique `dashboard-ui.js` ; ne modifie pas le HTML embarqué |
| 2 Architecture | moteur extrait temporaire hors dépôt, `express-core.js`, `exchange.js`, `cloud.js` si nécessaire, SQL de compatibilité préparé et tests moteur/devises |
| 3 Sécurité | contrôles ciblés en lecture seule et tests de sécurité dédiés si convenus |
| 4 Banque | `docs/ai/BANKING_FEASIBILITY.md`, sources officielles, coûts et proposition D uniquement |
| 5 Automatisation | `express-insights.js`, `test-express-insights.cjs` |
| 6 QA | `test-express-ui.cjs`, `verify-express.cjs`, données fictives et réseau simulé |
| 7 Relecture | revue indépendante du diff final, sans implémentation |
| 8 Intégration (root) | seul éditeur de `clair/index.html`, événements/miroirs/édition, CI, état court, PR, coordination et rapport |

## Vérifications exigées

Tests de comportement avant implémentation ; conserver les preuves rouge→vert. Vérifier 0,50/3/25 EUR, les cinq codes monétaires, invalides, quota, doubles clics/Entrée, clé stable, correction/suppression, bascules A/B, ancien formulaire et ancienne action de correction, offline/reconnexion CAS, import/export des métadonnées, refus des conversions GBP sans taux, écran iPhone/standalone et contrôles existants.

Aucun test réel de banque, e-mail ou installation iPhone physique ne sera déduit d’une simulation. Le rapprochement bancaire reste non implémenté et ses tests sont des critères proposés, pas des résultats annoncés.
