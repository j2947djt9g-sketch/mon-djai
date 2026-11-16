# CLAIR Conseils

Bilan compact approuvé le 16 novembre 2026. Implémentation sur `feat/clair-conseils`, sans changement de production ni application du SQL hébergé. La page `budget` existante accueille le bilan ; la navigation et les enveloppes restent partagées avec CLAIR.

## Responsabilités et flux

| Module canonique | Responsabilité |
|---|---|
| `domain/engine.js` | Normalisation JSONv3, contexte optionnel, réconciliation après une modification, conversion existante. |
| `application/advice-commands.js` | Annotations explicites, déclaration de période vérifiée, repère mensuel et pays/ville facultatifs. Modifie uniquement le brouillon fourni. |
| `domain/monthly-summary.js` | Sélection des opérations et totaux mensuels en centimes natifs, qualité et preuve d’objectif. Aucun stockage, réseau ou mutation. |
| `domain/spending-trends.js` | Comparaison de deux périodes consécutives, vérifiées et dans la même devise. |
| `domain/advice-rules.js` | Au plus trois constats déterministes expliqués, classés par priorité. |
| `config/advice-references.js` | Catalogue documentaire immuable ; aucune requête automatique. |
| `accounts/monthly-advice-ui.js` | Contrôleur monté par `budgetPageView` dans le page-host existant, détails et formulaires limités au compte actif. |
| `accounts/advice-compatibility.sql` | Garde additive préparée, à examiner et appliquer séparément avant une future publication. |

Flux : snapshot détaché de `budgetSession` → synthèse → comparaison → règles → contrôleur. Une action explicite passe par `commit` → commandes existantes → réconciliation/validation du candidat → stockage durable → publication du snapshot → synchronisation CAS existante. L’affichage ne déclare une réussite qu’après le succès de `commit`. Aucun conseil ne crée de transaction.

Le contrôleur ne détient que la vue active. Il retire ses écouteurs à la sortie, purge les brouillons au changement de propriétaire/epoch/mois/données et conserve les saisies lors d’un ACK identique. Les actions vérifient le propriétaire et le snapshot courant avant de sauvegarder. Un seul éditeur contextuel existe par opération, même quand elle figure dans deux listes. Le focus clavier conserve la portée de la liste d’origine.

## Règles financières

- Les opérations enregistrées ne prouvent pas un paiement bancaire. Une échéance automatique non confirmée reste signalée, y compris un versement d’épargne.
- Revenus = entrées ordinaires identifiées ; les remboursements ne sont pas des revenus. Dépenses nettes = dépenses brutes − remboursements. Résultat = revenus − dépenses nettes, **avant** les mouvements d’épargne.
- Épargne mensuelle = versements identifiés − retraits identifiés ; elle diffère du stock cumulé des projets, conservé dans leur interface existante.
- Virements internes et ajustements explicitement classés sont exclus du résultat. Aucune nature n’est déduite du nom d’une opération.
- Un achat ponctuel conserve son montant dans tous les totaux. Son annotation est réversible et ne crée pas d’économie comptable.
- Un remboursement lié vise une dépense réelle antérieure ou du même jour, hors épargne/virement/ajustement ; l’ensemble lié ne dépasse pas cette dépense. Un remboursement non lié est signalé et suspend la comparaison.
- Les huit devises existantes restent gérées par le moteur, en centimes entiers et en francs entiers pour XOF/XAF. Pas de nouveaux taux ni de conversion par opération inventée.

Les mois clos ne sont pas automatiquement complets. L’utilisateur doit déclarer avoir vérifié les opérations. Un mois courant se compare aux mêmes jours écoulés du mois précédent ; si ce dernier est trop court, la comparaison reste suspendue. Historique absent, future période ou base nulle ne produit pas de pourcentage trompeur.

Une hausse doit atteindre 20 % de la catégorie précédente **et** 3 % des dépenses brutes du mois pour déclencher ce constat. Ces seuils servent à limiter le bruit, pas à noter l’utilisateur. Les autres règles couvrent le résultat négatif enregistré, le dépassement d’un objectif prouvé, le poids des dépenses récurrentes et l’épargne identifiée. Une baisse liée à un remboursement ne devient pas une économie comportementale.

Un repère facultatif porte uniquement sur le mois choisi, dans `budgetOverrides`, sans reconduction. Sa date est enregistrée ; une cible créée pendant/après un mois ne justifie pas une affirmation historique de dépassement. La proposition « net moins ponctuel » nécessite une comparaison fiable, un marquage explicite, aucun remboursement de catégorie et un reste positif. Ce n’est ni une prévision de besoins ni une promesse d’économie.

## Contrat de données et compatibilité

Le JSON reste en version 3. L’extension optionnelle est `adviceSchema:1` et `advice:{transactions,months,goals,location}`. Un budget ancien non marqué reste ancien ; aucune complétude n’est inventée. Les versions inconnues et contextes mal formés sont refusés.

- `transactions[id]` : `nature`, `exceptional`, `refundOf` facultatifs, contrôlés contre le registre réel.
- `months[YYYY-MM].through` : fin de la période explicitement vérifiée.
- `goals[YYYY-MM][category]` : `amountCents` et `setOn`, probants seulement si la limite mensuelle canonique correspond.
- `location` : pays ISO et ville facultatifs déclarés, sans GPS, sans changement de devise. Le guide France apparaît seulement pour le pays `FR` explicitement choisi. La ville n’impose aucun tarif ni droit à une aide.

Modifier/supprimer une opération invalide la déclaration des mois concernés ; les anciens contextes devenus incompatibles sont élagués et les remboursements conservés sont déliés si leur dépense d’origine change. Un simple marquage ponctuel préserve la déclaration.

La conversion conserve les montants arrondis du moteur. Une preuve d’objectif déjà périmée est supprimée ; une preuve valide reprend la limite canonique convertie. Si plusieurs remboursements arrondis dépassent ensemble l’origine arrondie, tous les liens de ce groupe sont retirés, leurs natures conservées et les périodes concernées doivent être revérifiées. Aucun montant financier n’est ajusté pour faire rentrer les métadonnées.

Import et remise à zéro explicitement confirmés conservent le marqueur de capacité d’un budget déjà marqué, ainsi que les sauvegardes existantes. Ils peuvent remplacer son contexte après confirmation. Les limites historiques de ces parcours restent documentées séparément.

## Modifier et vérifier

Ajouter un calcul dans les modules purs ; ajouter une règle étayée dans `advice-rules` en conservant la limite de trois ; étendre l’interface du contrôleur plutôt que créer une seconde page ou un cache utilisateur global. Les catégories, montants, devises et mutations réutilisent toujours le moteur et les commandes canoniques. Tout nouveau champ exige une validation JS/SQL et une politique pour les anciens clients.

```sh
node clair/accounts/test-advice-context.cjs
node clair/accounts/test-advice-summary.cjs
node clair/accounts/test-advice-rules.cjs
node clair/accounts/test-advice-integration.cjs
node clair/accounts/test-advice-references.cjs
node tools/clair/build.mjs --generate
node tools/clair/build.mjs --check
node tools/clair/check-mirrors.mjs
node --test clair/accounts/test-*.cjs
```

Avec Playwright et `CLAIR_CHROME_PATH` configurés : `verify-monthly-advice.cjs` teste le contrôleur réel ; `verify-advice-app.cjs` teste l’application générée ; `verify-advice-sync.cjs` teste son SDK officiel avec transport synthétique, hors connexion/reconnexion, réponse perdue et changement de compte. Aucune fixture ne contacte un compte réel. `CLAIR_ADVICE_SHOTS` permet au parcours applicatif de produire les captures.

`node tools/clair/tests/verify-advice-sql.cjs` possède sa base Docker PostgreSQL 17.6, sans réseau, sans port publié, données en mémoire et nettoyage final. Aucune chaîne de connexion n’est acceptée. Le contrôle couvre notamment les deux propriétaires, RLS, CAS, anciens clients, contextes invalides et conversions. `--without-guard` est un contrôle négatif attendu en échec, pas une commande de livraison.

L’assemblage et le paquet déclarent tous les nouveaux modules. L’index est généré ; ne jamais l’éditer à la main. La CI conserve les tests existants et ajoute ces trois parcours navigateur ainsi que le contrôle SQL isolé.

## Conditions avant une publication ultérieure

1. Obtenir l’accord de publication et l’accord distinct pour la garde SQL préparée ; aucun n’est inclus dans la présente implémentation.
2. Examiner/appliquer la garde additive au projet existant, sans réappliquer les anciennes migrations, puis vérifier sa présence. Elle refuse la perte du marqueur par un ancien client ; l’ancien client doit être mis à jour avant de pouvoir modifier un budget marqué.
3. Préparer le paquet à partir du commit revu, actualiser la version PWA selon la procédure de livraison et vérifier le parcours sur un aperçu isolé. Un aperçu utilisant de vraies écritures ne doit pas précéder la garde SQL.
4. Vérifier les données synthétiques et les configurations absentes du paquet réel, préserver Masterboard, Auth, RLS et configuration Vercel, puis publier uniquement après accord.

Limites : analyses de saisies déclarées, pas de connexion bancaire ni IA générative ; une ressource documentaire française, pas de catalogue mondial d’aides ; anciens bilans recalculés depuis l’historique courant, pas d’archives immuables. Chromium mobile simulé ne prouve pas Safari sur iPhone physique. Les tests de transport synthétiques et PostgreSQL local ne prouvent pas la synchronisation hébergée d’un compte réel.
