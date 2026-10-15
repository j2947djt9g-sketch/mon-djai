# Clair — construction, architecture et exploitation

- Date : 14 octobre 2026.
- Base de référence : 1fde897568d24339e28db6a16f383760d13ab05e ; évolution mascotte décrite ci-dessous.
- Ce document décrit le fonctionnement technique existant, les décisions prises et les limites vérifiées.
- Produit : [PRD.md](PRD.md). Point d'entrée : [CONTEXTE.md](CONTEXTE.md). Sources exactes : [SOURCES.md](SOURCES.md).
- Les identifiants de projet et la clé publishable du client sont des paramètres publics. Aucun mot de passe réel, jeton actif ou clé serveur ne doit entrer dans ce dossier.

## 1. Origine et évolution

- Base historique : application Clair, initialement visible sur Lovable.
- Le fichier clair/LISEZ-MOI.md mentionne comme origine public/clair.html à la révision Lovable 2bf0524fe80750ceb995eb16bd6f11dd1ecc0b59. C'est une référence historique, pas la version courante à modifier.
- Migration vers le sous-dossier clair/ du dépôt GitHub mon-djai.
- Habillage inspiré d'Apple Music : carte de solde, fonds en dégradé, cartes compactes et icônes SVG.
- Simplification des réglages, installation et téléchargement séparés des sauvegardes.
- Ajustements de la configuration guidée, des explications du solde et du format mobile.
- Ajout des comptes et de la synchronisation avec budgets isolés.
- Ajout d'un parcours de récupération permanent et d'une validation de session dédiée.
- PR #1 : comptes et synchronisation. PR #2 : récupération du mot de passe. PR #3 : confirmation des paiements anticipés et événements de fermeture différés.
- Dates et détails non documentés des versions antérieures : [À CONFIRMER]. Ce dossier ne reconstitue pas des interventions sans preuve.

## 2. Stack et services

| Élément | Implémentation actuelle | Rôle |
|---|---|---|
| Interface | HTML, CSS et JavaScript natifs | Affichage, formulaires et navigation |
| Moteur financier | window.ClairEngine, JavaScript intégré | Montants, occurrences, solde, prévision, imports et calendrier |
| Auth et accès aux données | Supabase JS 2.102.0 intégré au HTML | Sessions, connexion, récupération et requêtes |
| Base | PostgreSQL 17 ; projet constaté en version 17.11.0.003 | Budget privé et contrôle des révisions |
| Hébergement | GitHub Pages | Fichiers publics du site |
| Sources | GitHub, dépôt j2947djt9g-sketch/mon-djai | Code versionné et publication |
| Copie locale | localStorage | Budget par utilisateur et session persistée |
| Installation / cache | manifest.webmanifest, service worker et Cache Storage | Application web installable et coque hors ligne |
| Vérification | Tests Node.js .cjs, assertions et VM | Tests de logique, de concurrence et du SDK |

- Aucun framework React/Vue, bundler ou serveur applicatif dédié n'est nécessaire au démarrage de cette version.
- Le SDK contient des capacités Realtime et Storage ; Clair ne les utilise pas pour synchroniser le budget ou stocker les photos.
- Aucune base de rappels ni fonction serveur de notifications n'est activée dans la configuration cliente observée.
- Service SMTP effectif et configuration complète Auth : [À CONFIRMER]. Ne pas ajouter un prestataire ou une offre payante sans validation.

## 3. Points de référence

- Site : https://j2947djt9g-sketch.github.io/mon-djai/clair/
- Dépôt : https://github.com/j2947djt9g-sketch/mon-djai
- Version : https://github.com/j2947djt9g-sketch/mon-djai/tree/1fde897568d24339e28db6a16f383760d13ab05e/clair
- Projet Supabase : hkssnbvktfscizojhftl, nom Clair.
- API : https://hkssnbvktfscizojhftl.supabase.co
- Région du projet vérifiée : eu-central-1, Francfort.
- GitHub Pages distribue les fichiers via son infrastructure ; emplacement exact et durées des journaux d'accès : [À CONFIRMER].
- URL Auth du site et redirections examinées : chemin clair/ et clair/index.html.
- Les tests antérieurs du retour d'un lien expiré ont obtenu une redirection 303 vers ces adresses ; cela ne constitue pas une preuve de réception d'e-mail.

## 4. Carte des fichiers

| Fichier | Responsabilité |
|---|---|
| clair/index.html | Application exécutée : styles, moteur, SDK, cloud et interface |
| clair/accounts/cloud.js | Source du module ClairCloud intégré au HTML |
| clair/accounts/account-ui.js | Source des écrans et actions de compte intégrés au HTML |
| clair/accounts/schema.sql | Définition de table, politiques RLS et fonction de sauvegarde |
| clair/accounts/verify-database.sql | Vérifications SQL à transaction annulée |
| clair/accounts/test-*.cjs | Cinq suites de tests |
| clair/accounts/README.md | Documentation de l'ajout des comptes et de la récupération |
| clair/accounts/LICENSE-supabase.txt | Licence du SDK fourni |
| clair/manifest.webmanifest | Nom, icônes, chemin de démarrage et scope PWA |
| clair/sw.js | Cache de la coque et réception push préparée |
| clair/icons/ | Icônes SVG et PNG |
| clair/LISEZ-MOI.md | Aide historique antérieure aux comptes |

- Important : LISEZ-MOI.md dit encore que le budget n'est envoyé à aucun serveur. Cette phrase est dépassée pour la version hébergée avec comptes.
- accounts/README.md et le code versionné décrivent l'état courant. Le mode fichier local continue de ne pas synchroniser avec Supabase.
- Modifier seulement account-ui.js ou cloud.js ne change pas l'application publiée : leur copie intégrée à index.html doit aussi être mise à jour.

## 5. Calcul financier

- Les montants des opérations et des règles sont des entiers en centimes.
- Les saisies françaises avec virgule sont converties ; deux décimales au maximum.
- Le jour courant est déterminé dans le fuseau Europe/Paris.
- Une occurrence est identifiée par l'identifiant de la règle et la date : autoKey.
- Les occurrences déjà enregistrées ou annulées sont ignorées lors du rattrapage.
- Une occurrence payée en avance garde la clé de sa date d'échéance ; elle n'est pas recréée ce jour-là.
- Confirmer une dépense déjà comptée modifie son état de confirmation, pas le solde.
- La prévision de fin de mois comprend les dépenses restantes, sans anticiper les revenus futurs.
- La liste d'échéances utilise actuellement un horizon de 62 jours et reprend les paiements automatiques non confirmés des 31 derniers jours.
- Ces limites sont des constantes du code actuel, pas des règles bancaires.
- Le moteur contient aussi les migrations de formats anciens, la normalisation et les exports CSV/ICS.
- Empreinte SHA-256 du moteur de référence : d6c1a581119b4d636cf98f3fe20d5823d0f592e48ed9c2856409f34ecb8fa39c.
- Ne pas remplacer ce moteur à partir d'une ancienne copie locale ou d'un fichier d'aide périmé.

## 6. Données de budget

- Format JSON version 3, conservé comme une unité.
- Champs de base : initialized, setupDone, openingCents, openingBalanceDate.
- transactions : identifiant, type, montant, nom, catégorie, date, note, clé automatique, règle d'origine et états de confirmation/correction.
- rules : fréquence, montants, jours, mois, dates de début/fin, pauses et préférence de rappel.
- skipped : occurrences volontairement annulées.
- budgets et budgetOverrides : limites habituelles et ajustements d'un mois.
- customCategories : catégories importées ou présentes dans les données.
- savingsGoal : objectif d'épargne.
- fixedExpenses : données de compatibilité avec les versions anciennes.
- preferences : thème, fond, photo et activation des rappels.
- La validation locale contrôle notamment les dates, les montants, les identifiants et les doublons.

### Plafonds existants

- Import de fichier JSON : 8 Mo maximum.
- Payload serveur : 8 388 608 octets maximum.
- 50 000 opérations, 500 règles et 100 000 clés d'occurrences annulées au maximum dans la normalisation.
- Photo d'entrée : 25 Mo maximum ; réduction dans le navigateur, avec côté le plus long initialement limité à 1 600 pixels et sortie JPEG jusqu'à 1,8 Mo.
- Ces plafonds proviennent du code. Leur adéquation à un usage public important reste [À CONFIRMER].

## 7. Base distante et droits

- Table public.clair_budgets.
- user_id : UUID, clé primaire, référence à auth.users(id).
- payload : JSONB, avec contrôle de forme/version et de taille.
- revision : entier positif, version du budget.
- operation_id : UUID de la sauvegarde, utilisé pour accepter un rejeu.
- display_name : texte, maximum 64 caractères.
- updated_at : date/heure de la sauvegarde.
- La suppression administrative d'un utilisateur Auth entraîne la suppression de sa ligne de budget par la clé étrangère ; cela ne garantit pas l'effacement de sauvegardes, logs et fichiers exportés.

### Contrôles vérifiés au moment de ce dossier

- RLS activée.
- Politique SELECT : utilisateur connecté propriétaire de la ligne.
- Politique INSERT : le propriétaire de la nouvelle ligne doit être auth.uid().
- Politique UPDATE : propriétaire avant et après modification ; changer la propriété est interdit.
- Rôle anon : lecture et insertion de la table interdites.
- Aucun rôle de connexion navigateur ne doit contourner RLS.
- Observation précise : le catalogue accorde le privilège SQL DELETE au rôle authenticated, mais aucune politique DELETE n'existe. Avec RLS, ce privilège seul n'autorise pas la suppression des lignes. Il ne faut pas écrire que ce privilège a été révoqué.
- Nettoyage éventuel des privilèges hérités : point technique à décider, pas une correction appliquée dans ce dossier.

### Fonction save_clair_budget

- Détermine le propriétaire depuis auth.uid(), sans user_id choisi par le client.
- Reçoit le payload, la révision attendue, l'UUID d'opération et le prénom.
- SECURITY INVOKER : la fonction conserve les droits de l'appelant et les politiques RLS.
- search_path vide, tables explicitement qualifiées.
- Verrouille la ligne lors de la sauvegarde.
- Une révision obsolète est refusée ; un UUID d'opération déjà sauvegardé est accepté sans nouvel incrément.
- Pas de concaténation du JSON reçu dans une requête SQL.
- schema.sql contient des CREATE POLICY non idempotents : ne pas le relancer aveuglément sur le projet existant.

## 8. Synchronisation

- La copie locale contient le budget et _cloud : userId, revision, dirty, operationId.
- L'écriture locale regroupe données et métadonnées.
- Envoi après temporisation de 900 ms.
- Lecture/synchronisation à l'ouverture, au retour en ligne et au retour dans l'onglet.
- Vérification toutes les 60 secondes lorsque l'application est visible.
- Pas de canal Realtime permanent.
- Si deux appareils produisent exactement le même payload envoyé, pas de conflit inutile.
- Si une requête a réussi mais que sa réponse est perdue, le rejeu garde le même UUID.
- Si une nouvelle modification intervient pendant une sauvegarde, elle est conservée et reçoit la nouvelle révision de base.
- En cas de conflit : choix de la copie, export de l'autre, puis sauvegarde sur la révision appropriée.
- Ce système choisit un budget complet ; il ne fusionne pas chaque opération indépendamment.
- La photo est retirée du payload envoyé. Le fond photo de l'appareil est réappliqué localement.
- Déconnexion : tentative de sauvegarde, signOut local, retrait de la copie courante du compte. Les copies précédentes et l'ancien budget ne sont pas toutes retirées.

## 9. Authentification et récupération

- Supabase JS initialise les sessions persistées et traite les retours Auth.
- Clé locale de session : clair-account-session-v1.
- Le frontend contient seulement une clé publishable publique.
- Un prénom personnalisable ne détermine pas les autorisations.
- onAuthStateChange gère la récupération et les changements de compte.
- Un événement PASSWORD_RECOVERY associe le formulaire au compte validé.
- Si ce compte diffère de la session déjà ouverte, l'interface attend son attachement.
- updateUser enregistre le nouveau mot de passe.
- Une erreur de session conduit à demander un nouveau lien.
- Les formulaires, messages et états de récupération ne doivent pas être remplacés par le chargement du budget.
- Le compteur de trois erreurs et le délai de renvoi sont locaux ; les limites Supabase restent déterminantes côté serveur.
- Paramètres exacts d'expiration, récupération de sessions, exigences serveur de mot de passe et éventuelle MFA : [À CONFIRMER].
- Aucun verrouillage global après trois essais ni MFA n'est documenté comme activé.
- Les textes de l’interface sont échappés avant insertion HTML ; les imports sont normalisés avant adoption.
- Une CSP intégrée restreint notamment les connexions à l’origine Supabase du projet. Elle autorise les scripts et styles intégrés ; ce n’est pas une preuve d’absence de XSS.

## 10. Données personnelles : lieu, accès et conservation

- Aucun budget réel, mot de passe ou jeton de session d'un utilisateur n'est inclus dans les quatre documents.
- Le code brut conserve la configuration cliente publique et des données de test fictives.
- Les comptes administrateurs du projet et les rôles serveur privilégiés peuvent disposer d'accès techniques plus larges que les utilisateurs de Clair. Liste des personnes et droits opérationnels : [À CONFIRMER].
- Le stockage local n'est pas un coffre chiffré applicatif. Une personne ayant accès au profil du navigateur ou un script compromis sur la même origine constitue une limite de protection.

| Donnée personnelle | Emplacement | Lecture / écriture | Conservation constatée et points inconnus |
|---|---|---|---|
| UUID du compte | Supabase Auth, budget distant ; copie locale | Auth et utilisateur propriétaire via RLS ; administrateurs privilégiés ; code du site pour la copie locale | Liée au compte ; politique formelle de durée et sauvegardes : [À CONFIRMER] |
| Adresse e-mail | Supabase Auth, région du projet eu-central-1 ; session locale ; service d'e-mail lors de l'envoi | Utilisateur via Auth, services Auth/e-mail et administrateurs autorisés | Compte et copies techniques ; durée et fournisseur/région d'e-mail : [À CONFIRMER] |
| Prénom | Métadonnées Auth, display_name du budget distant, session/copie locale | Utilisateur via inscription/Auth et sauvegarde ; affichage par l'application ; administrateurs | Lié au compte et à ses copies ; durée formelle : [À CONFIRMER] |
| Mot de passe | Traitement par Auth ; stockage d'une empreinte côté serveur, pas d'une copie en clair dans le budget | Saisie par l'utilisateur ; Auth vérifie/remplace le secret ; aucune lecture du mot de passe initial via Clair | Champs en mémoire pendant le formulaire ; empreintes gérées par Auth ; paramètres de conservation : [À CONFIRMER] |
| Solde initial, revenus, dépenses, montants, dates, catégories et notes | payload distant et copie locale | Propriétaire via RLS ; administrateurs privilégiés ; code du site/localement profil du navigateur | Pas de purge automatique du budget dans le code ; durée choisie, sauvegardes et effacement complet : [À CONFIRMER] |
| Repas, loyer, abonnements, pauses et habitudes | Même payload ; exports éventuels | Même contrôle de propriété ; utilisateur peut corriger ses règles | Même absence de durée applicative automatique |
| Enveloppes et objectif d'épargne | Même payload | Propriétaire et rôles techniques autorisés | Même conservation que le budget |
| Thème et préférence de rappel | payload distant et copie locale | Propriétaire ; synchronisation par l'application | Jusqu'à modification/remplacement ; durée formelle : [À CONFIRMER] |
| Photo personnelle de fond | JPEG base64 dans localStorage uniquement pour le fonctionnement courant | Code du site et profil du navigateur ; utilisateur par les réglages | Jusqu'au retrait/remplacement ou effacement du stockage ; anciennes copies et exports peuvent encore la contenir |
| Jetons de session et renouvellement | clé locale clair-account-session-v1 ; session Auth côté service | SDK et Auth ; profil du navigateur ; accès serveur selon rôles techniques | Expiration/renouvellement et révocation selon réglages Auth : [À CONFIRMER] |
| Révision, UUID d'opération et date de mise à jour | table de budget et _cloud local | Propriétaire par la sauvegarde/lecture ; administrateurs | Même durée que la copie concernée |
| Association de l'ancien budget au compte | clair-local-owner-v1, sur l'appareil | Code du site/profil du navigateur | Jusqu'à remplacement ou effacement du stockage ; ce marqueur n'est pas une autorisation serveur |
| Compteur d'essais et occurrences déjà rappelées | localStorage | Application et profil du navigateur | Compteur avec délai local ; liste de rappels limitée aux dernières 300 clés ; pas de purge de toutes les copies prévue |
| Copies JSON, CSV et ICS téléchargées | Emplacement choisi par l'utilisateur ; éventuellement calendrier importé | Détenteur du fichier et applications où il est importé | Jusqu'à suppression par leur détenteur ; aucune suppression distante par Clair |
| IP, événements Auth et journaux d'accès éventuels | Infrastructure Supabase / hébergeur ; régions exactes des systèmes de logs : [À CONFIRMER] | Opérateurs habilités et accès projet selon rôles | Contenu exact, durées et sauvegardes : [À CONFIRMER] |

- Région vérifiée du projet de base/Auth : eu-central-1. Géographie de toutes les sauvegardes, sous-traitants et journaux : [À CONFIRMER].
- Le reset EFFACER recommence un budget et conserve une copie précédente ; il ne supprime pas le compte.
- Retirer une photo n'efface pas nécessairement celle d'un export ou d'une copie plus ancienne.
- Les données de push préparées ne sont pas envoyées à un serveur de rappel actif dans cette version ; cette branche n'est pas à décrire comme une collecte opérationnelle.
- Conformité juridique complète et texte de politique de confidentialité : [À CONFIRMER].

## 11. Apparence et adaptation

- Polices système : -apple-system, BlinkMacSystemFont, SF Pro, Helvetica Neue, system-ui, Segoe UI, Roboto.
- Pas de téléchargement d'une police externe pour Clair.
- Accent principal du CSS : #fa2d58 ; palette claire de base #f2f2f7 / #1d1d1f.
- Palette sombre de base #0b0b0d / #f5f5f7.
- Carte du solde : dégradé rose/violet ; montants insuffisants signalés en rouge.
- Couleurs et tailles ont plusieurs couches de CSS : examiner la règle effective et ses media queries.
- Barre mobile, safe areas, unités de viewport dynamiques et champs adaptés au mobile.
- Icônes de navigation et d'échéances dessinées en SVG dans l'interface.
- Les retouches visuelles ne doivent pas modifier l'arithmétique des montants.

## 12. PWA, cache et fichier téléchargé

- scope et start_url du manifest sont relatifs au dossier clair/.
- Cache de coque : clair-github-<chemin-base>v6.
- Liste fermée d'assets ; HTML servi avec priorité réseau et repli sur cache.
- Le service worker traite uniquement des GET de la même origine correspondant à la coque.
- Les réponses du budget Supabase ne sont pas mises en cache par ce worker.
- Les caches des autres sous-applications du dépôt ne doivent pas être supprimés.
- Les handlers push et notificationclick sont prêts à recevoir un message, mais aucun émetteur n'est configuré.
- Téléchargement : source propre de index.html, liens de manifest/icônes retirés.
- En file:, configuration de compte désactivée et stockage local utilisé.
- Copier le fichier de l'application ne copie pas les dépenses ; exporter le JSON séparément.
- La géographie du localStorage est celle de l'appareil, pas une région cloud garantie.

## 13. Vérifications et preuves

### Réexécutées lors de la préparation de ce dossier

- Les 16 fichiers texte correspondent aux blobs du commit de référence, contrôlés par SHA-1 Git.
- Les cinq suites suivantes passent sur la copie exacte.
- Les tests de DOM sont simulés ; le test du SDK emploie la bibliothèque officielle avec un transport simulé.

    node clair/accounts/test-cloud.cjs
    node clair/accounts/test-account-ui.cjs
    node clair/accounts/test-local.cjs
    node clair/accounts/test-recovery.cjs
    node clair/accounts/test-recovery-sdk.cjs

- Cas couverts : budgets distincts, conflit, réponse perdue, écriture pendant une sauvegarde, reprise hors ligne, sessions répétées, gate de connexion, import local, paiement anticipé sans double débit, téléchargement, récupération et passage au budget.
- Lecture des métadonnées du projet, de la table, des politiques et de SECURITY INVOKER : contrôlée le 13 octobre 2026. Ces paramètres n'ont pas été modifiés ni relus pour la correction du 14 octobre.
- Aucun utilisateur réel ni budget réel n'a été lu pour produire ces documents.

### Vérifications antérieures documentées

- Migration appliquée au projet existant.
- Tests SQL transactionnels annulés par ROLLBACK.
- Deux comptes temporaires de test ont servi à vérifier les API réelles ; comptes et budgets de test supprimés ensuite.
- Advisors sans alerte à la date des contrôles antérieurs ; ce résultat n'est pas une garantie permanente.
- PR #2 fusionnée pour la récupération ; PR #3 fusionnée pour les paiements anticipés. Publication du commit de référence vérifiée le 14 octobre 2026.
- Le HTML publié a été comparé aux sources à la publication, puis revérifié identique au commit lors de ce dossier.
- Les paramètres Auth publics revérifiés le 13 octobre 2026 indiquent : inscription autorisée, fournisseur e-mail actif et confirmation d’adresse requise.
- Le contrôle de reconstruction de SOURCES.md retrouve les 16 fichiers texte et les trois icônes PNG, avec leurs empreintes.

### Limites de validation

- Derniers essais visuels automatiques Windows bloqués par le lancement du navigateur.
- Appareils physiques et rendu Safari/iPhone actuel : [À CONFIRMER].
- Réception et délivrabilité des e-mails : [À CONFIRMER].
- Notifications push application fermée : non raccordées.
- Charge de production importante, disponibilité contractuelle et coûts futurs : [À CONFIRMER].
- Les tests ne prouvent pas l'absence de toute faille.

### Correction du paiement anticipé — 14 octobre 2026

- Cause reproduite : fermer puis rouvrir le même dialog produit un événement close différé. L'ancien handler effaçait le callback de la nouvelle confirmation.
- Le bouton de paiement anticipé remplace désormais le contenu du dialog ouvert, sans fermeture intermédiaire.
- close() efface l'ancien état avant la fermeture native ; le handler close ne l'efface pas si le dialog est déjà rouvert.
- Un paiement déjà compté ferme sa fiche après enregistrement de sa confirmation, sans nouveau débit.
- L'ancien test appelait pay() directement et ignorait les événements close ; il ne couvrait pas le parcours défaillant.
- test-local.cjs suit maintenant les clics réels des handlers et simule la file différée de fermeture native. Trois parcours complets, doubles confirmations, annulation/réouverture rapide et dix recalculs à l'échéance par parcours passent.
- Autres cas : fenêtre de modification d'habitude après réouverture, fermeture native, paiement déjà compté, stockage plein puis nouvelle tentative.
- Le test amélioré échoue sur la version précédente : la confirmation perd son état. Il réussit sur la version corrigée.
- Les cinq suites passent ; aucune autre erreur confirmée dans les cas examinés. Ce contrôle n'est pas une preuve d'absence de toute erreur.
- Empreintes du moteur financier, du SDK et du module cloud inchangées ; styles et schéma de données inchangés.
- Essais de DOM et de réseau simulés ; essai Safari/iPhone physique restant à confirmer.

## 14. Reprise et maintenance

- Partir du commit de référence ou récupérer le dernier commit main avant une nouvelle intervention.
- Sauvegarder le budget avant un import, une migration ou un reset.
- Modifier la source du module concerné et sa copie intégrée dans index.html.
- Préserver les contrats de JSON version 3, les clés par compte, autoKey et les mécanismes de révision.
- Ne jamais remplacer la clé publishable par une clé service_role ou secrète.
- Faire les tests nécessaires au changement ; ne pas relancer des fixtures SQL sans comprendre leur transaction.
- Ne pas installer de nouveau framework ou service par simple préférence.
- Publier une modification dans le périmètre validé, vérifier son déploiement et actualiser les quatre documents.
- Nouvelle fonctionnalité : description et validation dans PRD.md avant implémentation.
- Une preuve de publication ne remplace pas un essai de réception d'e-mail ni un essai sur appareil réel.


## Intégration de la mascotte — 15 octobre 2026

- Base : commit 1fde897568d24339e28db6a16f383760d13ab05e, correctif du paiement anticipé conservé.
- Image validée : clair/assets/mascotte-poses.png, feuille de quatre poses affichée directement par CSS.
- Fonction mascot() partagée par les comptes et wizardView().
- account-ui.js et sa copie intégrée à index.html sont maintenus identiques.
- Service worker v7 : illustration précachée ; index.html reste la page de repli hors ligne.
- test-mascot.cjs couvre les choix création/connexion, les sessions existantes, le mode local, la récupération et la préférence de réduction des animations.
- Les six scripts Node passent. Les appels réseau des tests de comptes sont simulés ; aucun nouveau test sur des comptes réels pour cette retouche visuelle.
- Le rendu sur un iPhone physique reste [À CONFIRMER].

## Publication GitHub Pages

- _config.yml exclut clair/docs du rendu Jekyll : les exemples de code brut doivent rester des sources, sans interprétation Liquid.
- Les quatre documents se consultent directement dans le dépôt GitHub.
