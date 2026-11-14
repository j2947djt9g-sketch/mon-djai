# CLAIR — audit architectural du 13 novembre 2026

**Statut : audit et propositions, sans refactorisation.** Base locale `c55c8ea`, code CLAIR publié documenté `4673b2a`, branche de départ `fix/clair-email-confirmation`. Les lignes citées désignent cette base. Aucun code applicatif, compte, budget, service ou déploiement modifié pendant l’audit. Seuls ce rapport, le plan et l’état de reprise sont ajoutés ou actualisés.

## Périmètre et méthode

Lecture AGENTS → STATE → MAP, puis inspection ciblée des sources et contrats. Quatre revues spécialisées : UI/cycle de vie, métier financier, sécurité/synchronisation et livraison/testabilité. Le coordinateur a relu les rapports, les sources sensibles et reproduit indépendamment les deux anomalies financières. Les scripts de diagnostic restent hors dépôt dans `/workspace/clair-architecture-audit/`, avec données fictives et réseau interdit pour les reproductions.

Le produit est une **application statique JavaScript sans framework**, avec HTML autonome téléchargeable, PWA, SDK Supabase vendorié, modules canoniques et fragments embarqués. Cette contrainte explique les copies dans l’index ; elle ne justifie pas leur maintien manuel indéfini. Une migration React/Vue, une nouvelle base ou une réécriture complète n’est pas justifiée.

## Note de maintenabilité : 5,5 / 10

Grille qualitative pondérée, portant sur la facilité de reprise et d’évolution du code, pas sur son apparence. Échelle : 0 = absent/inexploitable ; 5 = utilisable avec dépendances implicites ; 10 = responsabilités explicites, reproductibles et vérifiées.

| Critère | Poids | Note /10 | Justification |
|---|---:|---:|---|
| Modularité et séparation |20 %|4|Noyau pur et services existent, mais orchestration/fragments dépendent de la même fermeture.|
| Lisibilité et contrats |15 %|4,5|Bons noms métier ; fonctions compactées, interfaces UI implicites, conventions peu outillées.|
| État, asynchronisme et cycle de vie |15 %|5|Epochs et dock solides ; courses et pertes d’identité DOM reproduites ailleurs.|
| Sécurité et intégrité |15 %|7|RLS/CAS/idempotence présents ; deux frontières de validation et reprise Auth à renforcer.|
| Tests |15 %|8|37 suites Node, 24 vérificateurs navigateur et SQL isolé ; chargeurs souvent couplés au HTML.|
| Construction et livraison |10 %|4|Livraisons vérifiées, mais recette/configuration et manifestes non entièrement reproductibles au clone.|
| Documentation humaine |10 %|6|MAP/STATE utiles ; entrée humaine et plusieurs passages historiques se contredisent.|

Calcul : 5,475 arrondi à 5,5. Les protections existantes et la couverture expliquent pourquoi la recommandation est une évolution progressive.

## Mesures et responsabilités actuelles

- `clair/index.html` : **632 328 octets** ; SDK tiers embarqué **186 702 octets**, soit 29,5 %. La taille du SDK n’est pas une duplication métier.
- Script UI principal : **215 513 octets**, **184 fonctions déclarées** et **101 liaisons dans sa portée principale, dont 49 modifiables**. Ce sont des variables de fermeture, pas 49 propriétés globales de `window`.
- `account-ui.js` : 48 141 octets/516 lignes. `settings` représente 6 846 octets sur 9 lignes et `wizardView` 5 732 sur 5 lignes : les lignes compactées masquent la complexité.
- **26 sources embarquées conformes aujourd’hui : 18 JS et 8 CSS**, 260 273 octets. Aucune dérive présente constatée. Trois ressources externes attendues : `help-page.js`, `reset-page.js`, `recovery-support.css`.
- Sur 37 suites Node : 32 utilisent VM, 16 des indices `scripts[n]`, 16 une chaîne littérale de démarrage. VM n’est pas un défaut en soi ; l’adressage physique du HTML est fragile.

Ces tailles ne mesurent ni le transfert HTTP compressé, ni le temps de rendu sur iPhone. Aucune amélioration en millisecondes ou pourcentage de performance n’est annoncée.

## Les dix constats prioritaires

Les gravités indiquent l’impact possible ; « confirmé » n’implique pas qu’un incident soit survenu chez un utilisateur réel.

### F1 — Élevée, cas limite confirmé : écriture locale et validation ne forment pas une transaction cohérente

Sources : `clair/index.html:2027` (`commit`), `:2040` (écriture avant `afterLocalSave`), `:2043` (restauration mémoire seule), `:3440` (`reconcile-form`), `clair/accounts/cloud.js:17,28` (`decode/saved`).

Deux valeurs admises individuellement peuvent produire un ajustement interdit : ouverture −10 000 000 000 centimes, rapprochement à +100 000 000 EUR → transaction de 20 000 000 000 centimes, au-dessus du plafond unitaire. Le mode local annonce un succès puis refuse le JSON au rechargement. Avec `ClairCloud` sans client réseau, la validation tardive échoue : `commit` retourne false, la mémoire revient à zéro transaction, **le stockage en contient toujours une invalide**.

La reproduction utilise le vrai `commit`, ses vrais helpers, le vrai gestionnaire de rapprochement et le vrai normaliseur. C’est un défaut de frontière, pas une erreur d’arrondi. Préparer et valider un candidat complet avant persistance ; distinguer ensuite l’échec d’écriture d’un effet UI/cloud échoué après écriture.

### F2 — Élevée mais latente : une version de sauvegarde inconnue est convertie silencieusement

Sources : `clair/index.html:828,837,844` (`normalize`), `:3180` (`importFile`), `clair/accounts/schema.sql:10`.

`normalize` distingue seulement `version === 3` du format historique. Une entrée `version:4`, `openingCents:123400`, transactions vides devient une version3 avec ouverture0 sans erreur. La transformation est reproduite ; aucun client officiel produisant une version4 ni perte réelle n’est observé. Refuser les versions futures/inconnues avant proposition d’import, en préservant les migrations historiques réellement prises en charge.

### F3 — Moyenne : une photo terminée tard peut modifier un autre budget local

Sources : `clair/index.html:3448` (`await photoToJpeg` puis `commit`), `:3172–3173` (contexte déjà réutilisable), `clair/accounts/cloud.js:86–87`.

Décodage de la photo A suspendu, remplacement du budget par B via l’événement de stockage, reprise : B reçoit la photo A. Reproduit avec données fictives. Le scénario précis logout/login A→B reste un risque non exécuté ; **aucune fuite cloud n’est démontrée**, la photo étant retirée du payload distant. Capturer/assert le contexte existant et invalider les sélections précédentes après chaque attente.

### F4 — Élevée pour les parcours concernés : récupération assistée et aide restent configurées pour GitHub

Sources : `supabase/functions/clair-{account-help,account-recovery}/handler.mjs:4`, `clair-device-unlock/handler.mjs:5`, `clair-account-recovery/index.ts:17`, `clair/accounts/account-ui.js:365`.

Les allowlists excluent Vercel, y compris avant OPTIONS ; la récupération contient encore une destination GitHub. Les sources déployées version1 lues pendant l’audit portent ces mêmes restrictions. **La confirmation d’inscription réparée est un autre flux**, déjà dirigé vers Vercel. Centraliser la configuration d’environnement en gardant des politiques explicites par service ; autoriser uniquement les origines retenues, jamais un wildcard de convenance.

### F5 — Moyenne : une panne du fournisseur peut épuiser un déblocage sans reprise

Sources : `supabase/device-unlock.sql:53–64`, `supabase/functions/clair-device-unlock/handler.mjs:23–37`, `clair-masterboard/core.mjs:74`.

Le claim passe à `issued` avant l’émission Auth. Si celle-ci échoue, le handler renvoie503 ; le prochain poll voit `expired` plutôt qu’une reprise, malgré la lease. Reproduction avec handler réel et transition SQL explicitement simulée. Le flux administratif peut déjà avoir invalidé l’ancien mot de passe. Cela peut imposer une nouvelle demande/admin ; ce n’est pas un contournement de capacité. Distinguer échec certain avant émission et résultat indéterminé après émission, sans rouvrir une capacité consommée ni promettre un email « exactement une fois » entre systèmes indépendants.

### F6 — Faible à moyenne : changer de compte pendant une conversion retarde le chargement suivant

Sources : `clair/accounts/cloud.js:74,106,148,169,183`.

La conversion tient `busy`. L’entrée de B demande un sync qui est ignoré ; le finally de la conversion A libère le verrou sans relance pour B. Après fin et vidage des timers : B est ready, non busy mais loading/record null. Un sync explicite le rétablit. Reproduction hors réseau ; aucun écrit intercompte observé. Reprendre la logique de rattrapage déjà présente dans `sync`, en conservant les gardes d’epoch. Le polling de60s ou un autre événement limite généralement le retard.

### F7 — Moyenne : l’identité persistante du dock n’est pas généralisée aux autres contrôles

Sources : `clair/index.html:2942,2946,3459`, `cloud.hooks.apply` à `:2110` ; contre-exemple sain `glass-ui.js:172,196`.

À1440px, activer le menu desktop au clavier détruit son bouton et déplace le focus sur BODY. Un rafraîchissement de visibilité remplace la recherche du journal : valeur restaurée, focus perdu ; un détail ouvert des réglages se referme. Reproduit sous Chromium avec aucun trafic externe. Le dock liquide conserve bien ses nœuds, son animation et son nettoyage : **il ne faut pas le réécrire**. Séparer navigation et actualisation de l’écran courant, préserver les contrôles interactifs et ne pas rendre sur un ACK sans changement. Les dialogues hors `#page` ne sont pas tous affectés.

### F8 — Importante pour la maintenance : des « modules UI » sont des fragments dépendants d’une grande fermeture

Sources : `clair/index.html:1934,2027,2930,3340`, `accounts/{account-ui,dashboard-ui,journal-ui,profile-ui,express-ui,savings-ui}.js` ; `test-navigation.cjs:9–14`, `test-account-ui.cjs:17–19`.

Les fichiers existent mais utilisent implicitement `data`, `cloud`, `modal`, `commit`, etc. Les tests compensent en découpant le HTML, injectant des exports et parfois les canoniques. Le couplage de184 fonctions/101 liaisons rend un déplacement sensible à des dépendances cachées et à des ancres de mise en forme. Extraire d’abord les frontières pures et introduire des contextes explicites ; garder une intégration qui exerce le vrai HTML. Pas de dépendance circulaire incontrôlée démontrée : le projet n’a pas aujourd’hui un graphe d’imports ES modules à certifier.

### F9 — Importante pour la fiabilité de livraison : double maintenance manuelle des sources

Sources : `AGENTS.md:20`, `docs/ai/MAP.md:23`, `test-recovery.cjs:66–67`, `test-sounds.cjs:2`, `test-mascot.cjs:33`.

Les26 miroirs sont conformes, mais seules4 assertions complètes de parité ont été localisées, sans contrôle central retrouvé. Certains tests réinjectent le canonique ou ajoutent un fragment manquant : leur réussite peut masquer une omission du livrable. Le problème n’est pas d’embarquer du code pour la PWA ; c’est d’éditer deux sources sans assemblage unique. Commencer par un inventaire/contrôle strict, puis produire l’HTML autonome de manière déterministe.

### F10 — Importante pour la reprise humaine : recette de livraison et vérification live ne suivent pas la cible actuelle

Sources : `docs/ai/DEPLOYMENT.md:21–27`, `.github/workflows/clair-live-check.yml:4,19,25,34`, `clair/LISEZ-MOI.md:7,19`, `clair/docs/CONSTRUCTION.md:74,294`.

La recette et `vercel.json` du paquet ne sont pas entièrement versionnés ; des manifestes sont dans les workdirs. Le workflow « publication » vérifie encore3fichiers GitHub Pages depuis main, pas la production Vercel. Les références locales main/origin/main diffèrent du code publié ; leur état distant n’est pas certifié ici. L’entrée humaine affirme encore qu’aucun budget n’est envoyé au serveur, alors que les comptes synchronisent leurs données. Versionner la recette et le contrôle Vercel, clarifier la référence de livraison, actualiser l’entrée humaine. Aucune fusion main ni publication n’est autorisée par ce rapport.

## Cartographie de ce qui doit être réutilisé

| Responsabilité | Existant | Contrat et précaution |
|---|---|---|
| Calcul financier | `ClairEngine`, inline :657–985 | `normalize`, `cents`, `balance`, `sync`, `reserve`, `upcoming`, dates civiles ; pur, sans remplacer le modèle.|
| Change | `accounts/exchange.js`, inclus dans Engine | `exchangeAmount/convertCurrency`, ratios entiers/BigInt, moitié éloignée de zéro ; fragment dépendant du moteur, pas import autonome actuel.|
| Express | `express-core.js`, `express-insights.js` | Préparation/idempotence/suggestions/statistiques ; même chemin de sauvegarde. Ne pas créer un second moteur de transactions.|
| Épargne | Engine + `savings-ui.js` | Solde dérivé des transactions, validation de chronologie, pas de second solde persistant.|
| Catégories/région | `category-art.js`, `region-currency.js` | Atlas/fallback et suggestion sans GPS ; préserver IDs et décisions utilisateur.|
| Comptes/sync | `cloud.js` / `ClairCloud` | Propriétaire, epoch, cache, révision attendue, operationId, conflits et reprise ; pas de second synchroniseur.|
| Confirmation | `auth-email.js` / `ClairAuthEmail` | Signup/resend/destination/callback/erreurs ; `account-ui.js` orchestre encore des vues et opérations.|
| Composants | `glass-ui.js`, helpers `heading/field/formActions/dialog/txRow/categoryVisual` | Réutiliser l’identité du dock et les primitives ; ne pas cloner ses contrôles interactifs.|
| Pages et ressources | `dashboard/journal/profile` UI, `companion-ui`, `sounds` | Générateurs actuels et état local ; journalResults actualise déjà une zone, timers/voix disposent de gardes.|
| Serveur | `supabase/functions/*/index.ts` + handlers `.mjs` | Adaptateurs Deno et handlers testables avec db/auth injectés ; autorité serveur conservée.|

Les répétitions JS/SQL de validation sont une défense aux deux frontières : ne pas retirer la validation serveur au nom de DRY. Les variantes transaction manuelle/Express/épargne ont des règles différentes et ne justifient pas un constructeur universel. La propriété des gardes devise dans une migration Express, déjà documentée, mérite une clarification ultérieure sans rejouer les migrations historiques.

## Sécurité et données : protections et limites

Métadonnées live lues par la revue sécurité : RLS active sur11tables `clair_*`, aucun CRUD anon ; budgets bornés au propriétaire et à l’état actif ; RPC budget/conversion invoker et search_path vide ; opérations sensibles réservées au service_role. Admin vérifié côté serveur, même lorsque verify_jwt=false. Pas de secret service_role identifié dans les modules client examinés. Les clés publishable ne sont pas des secrets.

Les sommes normalisées restent dans les entiers sûrs :50 000 ×10 000 000 000 ≤5×10^14. Les conversions monétaires utilisent BigInt et un arrondi explicite. Aucun double débit courant ni perte de centime démontré. Aucun accès intercompte exploité pendant cet audit. Ces constats ne remplacent pas des essais d’autorisation entre deux identités en base isolée.

Aucune fuite mémoire non bornée ni duplication de listeners active démontrée ; plusieurs composants disposent de guards et nettoyages. Aucun code mort suffisamment prouvé pour suppression. Les états partagés, annulations et montages doivent être testés avant toute suppression ou mutualisation.

## Vérifications réellement faites

| Type | Résultat | Limite |
|---|---|---|
| Analyse statique/AST locale | Tailles,26copies,184fonctions/101liaisons/49modifiables, ancres tests mesurés | Pas de graphe exhaustif de dépendances dynamiques.|
| Repro financière coordinateur |3 assertions de scénarios confirment F1 local/cloud et F2 | Données fictives, sans SDK ni backend ; confirmer une anomalie ne signifie pas la corriger.|
| Repro navigateur UI | F3/F7 reproduits, dock persistant,0requête externe/erreur JS | Chromium1440, Auth désactivée, événements contrôlés ; pas Safari physique.|
| Repros sécurité | F5 handler réel/transition SQL simulée ; F6 harnais cloud synthétique | Pas d’émission réelle ni modification de comptes.|
| Sources/metadata serveur | Policies/ACL et fonctions déployées lues | Aucun test d’intrusion, charge ou mutation de production.|
| Suites historiques | Non rejouées sur code inchangé ; CI167 verte selon livraison précédente | Ce n’est pas une nouvelle exécution de37suites/24parcours.|

Un premier lancement local UI a échoué sur permission réseau locale, puis le lancement autorisé a réussi. Un relevé distant de main n’a pas été exécuté : la revue automatique d’autorisation était indisponible pour quota, sans décision de sûreté ; aucun contournement. Deux agents ont atteint leur quota après écriture des rapports ; pas de seconde revue globale indépendante supplémentaire.

Preuves hors dépôt : `source-metrics.json`, `domain-repro.{cjs,json}`, `ui-repro.{cjs,json}`, `security-cloud-race.cjs`, `security-unlock-failure.mjs` et rapports `domain.md`, `ui.md`, `security.md`, `delivery.md` dans `/workspace/clair-architecture-audit/`.

## Proposition et décision attendue

Architecture cible et lots : [REFACTOR_PLAN.md](REFACTOR_PLAN.md). Recommandation : JavaScript modulaire en sources, HTML autonome conservé par assemblage déterministe ; commandes/état/session explicites et vues persistantes. Corriger d’abord les frontières prouvées, extraire ensuite. Aucun nouvel abonnement, banque, framework ou service.

Le plan doit être validé avant modifications importantes. La validation de refactorisation n’autorise pas à fusionner main, déployer ou migrer la production.
