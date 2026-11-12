# Masterboard — propositions de refonte, à valider

Audit du 12 novembre 2026, branche `feat/masterboard-design-proposals`, base `c2b7f43`. Demande : proposer un design plus professionnel et des pistes d’amélioration à partir de la liste et des fiches mobiles. Aucune intégration dans le Masterboard réel, aucune publication de production, aucune opération sur un compte ni modification Supabase autorisée par cette demande de propositions.

## Interface retrouvée

- Sources : `masterboard/index.html`, `masterboard/masterboard.css`, `masterboard/masterboard.js`. README et tests Masterboard consultés.
- Adresse actuelle vérifiée HTTP 200 : https://j2947djt9g-sketch.github.io/mon-djai/masterboard/ . https://clair-budget.vercel.app/masterboard/ renvoie 404 ; le Masterboard n’est pas encore hébergé à cette adresse Vercel.
- HTML, CSS et JS publics correspondent exactement aux fichiers du dépôt (empreintes vérifiées).
- Point d’entrée administrateur distinct, contrôle serveur de la liste d’administrateurs. Ne pas l’ajouter à la navigation publique de CLAIR ni affaiblir les droits en préparant son hébergement Vercel.

## Constats vérifiés dans le code

1. `.profile-toggle` : minimum de 218 px sur mobile, padding de 21 px, badges avec 22 px de marge, pied repoussé par `margin-top:auto`. Beaucoup de hauteur sans information supplémentaire.
2. Nom absent affiché « Compte Clair » : des profils différents deviennent visuellement semblables. Afficher « Compte sans nom » et l’adresse disponible, sans inventer de nom ni modifier une donnée.
3. Recherche et filtre empilés, libellés et séparations répétés : actions et comptes commencent bas. Remplacer les filtres courants par des puces accessibles, garder les options secondaires disponibles.
4. Fiche quasi plein écran, identité verticale et grands blocs : les actions arrivent après plusieurs zones peu denses. En-tête compact, données utiles regroupées, action contextuelle selon la demande d’aide.
5. Navigation anthracite très contrastée sur fond clair ; famille visuelle différente de CLAIR Verre doux. Capsule claire pour A ; navigation plus sobre et dense pour B. Préserver cibles de 44 px, contraste et marge basse.
6. Le bouton « Faire sauter le mot de passe » représente une action sensible : `authorize-reset` vise une demande d’appareil, désactive l’ancien mot de passe et accorde 15 minutes au titulaire. Libellé proposé « Autoriser un nouveau mot de passe », explication précise et groupe distinct. Toutes les confirmations existantes restent nécessaires.

## Deux directions visuelles proposées

**A — Verre doux Administration (recommandée).** Fond gris lavande très léger, surfaces blanches, texte anthracite, violet réservé à la sélection et à l’action prioritaire. Liste compacte, états accès/e-mail distincts, fiche claire, capsule proche de CLAIR avec animation discrète. Plus de densité que l’app budget, peu d’effets décoratifs.

**B — Console professionnelle.** Interface orientée support et priorités, navigation encre plus sobre et panneaux blancs, liste dense et panneau de détail sur ordinateur. Utile si le volume de comptes augmente ; moins chaleureuse que A.

Maquettes interactives autonomes dans `masterboard/design-preview/`, jeu de six personnes fictives avec `example.invalid`. Aucun SDK, fetch, stockage, service worker, identifiant réel, envoi ou backend. Les actions sont explicatives et signalées comme maquettes. Captures de référence générées depuis le frontend réel avec un snapshot fictif : aucune image privée fournie par l’utilisateur n’est republiée.

## Améliorations fonctionnelles à valider séparément

- Prioriser les demandes en attente, puis les accès suspendus et messages à reprendre. Ne pas confondre suspension, e-mail non confirmé et connexion récente.
- Trier par demande d’aide, inscription ou dernière connexion ; une dernière connexion n’est pas une mesure d’activité.
- Afficher l’état d’e-mail dès la liste, expliquer la gratuité une seule fois. « Dernière connexion indisponible » au lieu d’un tiret ambigu.
- Historique contextualisé dans la fiche : préparation de message, ouverture de messagerie, envoi marqué manuellement. Ne jamais annoncer « livré » sans preuve.
- Simulations en accordéon secondaire : « Prolonger le test d’un mois », sans facturation réelle.
- Fiche latérale sur ordinateur et vue dédiée sur mobile, conservation de la recherche/position au retour.
- Prévoir une publication du Masterboard sur Vercel après validation, avec ses dépendances et les contrôles d’authentification. Aucun transfert ou changement d’URL effectué à ce stade.
- Option à discuter : réserver l’introduction animée à la première ouverture ou la raccourcir ; le code prévoit une attente minimale d’environ 4,2 secondes avant de lever l’écran d’introduction. Préserver l’identité, accélérer les ouvertures répétées.
- Corriger ensuite le passage du README qui décrit encore l’ancien parcours de récupération par lien/code ; l’action courante utilise le déblocage d’appareil.

## Vérifications et limites

Audit et revues UI/UX/actions sensibles en lecture seule ; aucun compte réel consulté. Avant : frontend Masterboard réel à 390 px, six comptes fictifs, seules requêtes snapshot interceptées. Chromium uniquement, aucun iPhone physique/Safari testé. Maquettes non intégrées : l’esthétique choisie et les pistes fonctionnelles nécessitent la validation de l’utilisateur avant modification de l’application réelle.


## Aperçu livré pour validation

https://clair-budget-4k8xd40uf-diabagateouattara601-7626.vercel.app/ — Vercel READY, preview `dpl_2qgvr9o8Lrb875y3k16mwqUvvR5P`, aucun alias de production. Paquet de 13 fichiers dont 12 publics, CSP sans connexion/formulaire/worker, robots noindex. Sources de travail basées sur `c2b7f43` (dirty=true). Comparaison A/B, boutons « Les comptes »/« Une fiche », essai en plein écran, captures avant/après fictives.

Six vues Chromium vérifiées localement puis sur les ressources publiques avec HTTPS de confiance et empreintes contrôlées : A/B à 320/390/1440, recherche, filtres, fiche/retour, action sensible explicative, aucun stockage ni appel externe ni débordement horizontal. À 390 px : hauteur de carte de 113 px pour A et 101 px pour B, contre 218 px dans le Masterboard actuel. Galerie desktop/mobile, sélection A/B et changement Liste/Fiche vérifiés. Syntaxe et diff --check verts. Pas de tests de comptes réels ni d’iPhone physique.

Relecture indépendante finale sans bloquant. Recommandation : apparence de A + ordre de priorité de B. À affiner lors de l’intégration : « E-mail » devient « À confirmer », noms/métadonnées un peu plus grands, haut de A allégé (deux titres/accroche repoussent encore la première carte), une seule commande retour sur mobile. Ces réserves sont des propositions de finition, pas des changements apportés au Masterboard réel.

Les 12 ressources publiques de l’aperçu sont conformes au paquet ; CLAIR publié SHA1 `c52115e744a78bf07e86b7d805ad93a8c3489dff` et Masterboard GitHub Pages SHA1 `45af8244ce141883128f98667d5bec0a176d0ff6` vérifiés inchangés. Preuves locales sous `/workspace/masterboard-design-work/` (`verify.log`, `verify-live.log`, `captures/`) ; captures versionnées sous `masterboard/design-preview/captures/`. Agents : audit UI/UX, revue actions sensibles, création maquettes ; coordination/captures/vérification/livraison par l’agent principal. La prochaine étape est la validation de la direction avant toute intégration ou publication réelle.


## A validée et intégrée dans le frontend réel

L’utilisateur a choisi **A** puis demandé de poursuivre. Branche `feat/masterboard-verre-doux`, base `28d7b24`. Cette intégration ne choisit pas B et ne modifie ni backend ni production.

Fichiers : `masterboard/index.html`, `masterboard/masterboard.js`, nouvelle feuille `masterboard/admin-ui.css`, thème du manifeste ; README/plan/STATE/MAP et workflow mis à jour ; nouveau `clair/accounts/verify-masterboard-design.cjs`. Les IDs, actions déléguées, payloads, allowlist serveur, confirmation par adresse recopiée, connexion récente et protections administrateur restent en place. Aucun moteur financier ou fichier applicatif CLAIR modifié.

- Cartes compactes : 116 px aux tailles 320/390, 118 px à 768, 104 px à 1440 dans les cas vérifiés. Nom absent affiché « Compte sans nom », sans déduction depuis l’e-mail. Puces rapides reliées au filtre existant, échéances de test conservées sous « Autres filtres ».
- Fiche : identité horizontale, quatre repères, aide en attente réellement issue du snapshot (association e-mail insensible à la casse), inspection en lecture seule et fermeture seulement au clic explicite. Messages et simulations séparés des accès sensibles ; pas de faux historique par compte.
- « Autoriser un nouveau mot de passe » conserve le déblocage par appareil. Point corrigé par rapport à la maquette : **une adresse cible non confirmée reste récupérable avec appareil pending**, comme le prévoit le serveur actuel. Le bouton est indisponible si le compte est suspendu ou sans appareil en attente. L’administrateur reste confirmé et soumis aux mêmes contrôles serveur.
- Capsule claire, cibles de 44 px, contrastes de texte vérifiés à au moins 4,5:1 sur les zones sensibles. Tablette : espace réservé à la liste pour pouvoir changer de compte sans que la fiche non modale intercepte les clics. Introduction et installation conservées.

Validation : trois suites Node `test-{masterboard,assisted-recovery,device-unlock}` vertes ; cinq suites navigateur `verify-{masterboard,masterboard-design,masterboard-install,assisted-recovery,device-unlock}` vertes. Nouveau test A rouge sur baseline figée à 218 px puis vert sur quatre tailles ; recherche/puces, longues identités et échappement HTML, aide/contextes séparés, absence de mutations au rendu, confirmation explicite de fermeture, rafraîchissement/focus/déconnexion, contrastes et absence de débordement. Relecture indépendante finale sans bloquant.

Corrections issues des essais : largeur de puce de 44 px, icône du filtre mobile, contrastes trop pâles, disponibilité du déblocage des adresses non confirmées et interception des clics sur tablette. Une première mesure d’animation d’introduction a échoué ; une relance l’a franchie, puis a révélé le défaut tablette corrigé. La passe finale de l’ancienne suite est verte sur les quatre tailles, sans modification de l’introduction.

**Nouvel aperçu intégré READY** : https://clair-budget-q9p4c0d8e-diabagateouattara601-7626.vercel.app/ → `/masterboard/` ; déploiement `dpl_Focx9cMQHrDpUwqQ1CgFwbyiArK5`, preview sans alias, paquet de travail basé sur `28d7b24` (dirty=true). Il exécute le frontend réel avec une session et six comptes fictifs injectés **seulement dans le paquet d’aperçu**. Toutes les mutations/envois sont refusés par l’adaptateur et la CSP bloque les connexions externes/formulaires/workers ; aide/reset externes sont des pages explicatives, installation désactivée dans cet aperçu uniquement. Aucune donnée réelle ni secret ; aucun compte consulté/modifié, aucun message envoyé.

18 fichiers publics conformes au paquet, redirection/noindex/CSP vérifiés. Essais locaux et publics sur 390/1440 : liste, filtres, fiche, refus effectif des opérations reset/fermeture d’aide, aucun faux succès ni requête externe/cache privé. Les empreintes CLAIR et Masterboard réellement publiés restent celles indiquées plus haut. Captures réelles de l’intégration avec données fictives : `masterboard/design-preview/captures/masterboard-a-integrated-{list,profile}-390.png` ; preuves `integrated-*.log` sous `/workspace/masterboard-design-work/`. Safari/iPhone physique et comptes réels toujours non testés.

### Publication Vercel : changement serveur à autoriser

Vérification OPTIONS sans identifiants : service `clair-masterboard` retourne 204 pour l’origine GitHub Pages actuelle, mais 403 « Origine refusée » pour `https://clair-budget.vercel.app`. Le code serveur autorise seulement GitHub Pages/localhost ; le lien APP_URL des messages pointe encore vers GitHub. Une publication de fichiers seule sur Vercel ne rendrait donc pas l’administration utilisable avec les comptes réels.

Proposition préparée et **non appliquée** : `MASTERBOARD_VERCEL_PROPOSAL.patch`, deux changements dans `core.mjs` seulement : ajouter l’origine exacte `https://clair-budget.vercel.app` (sans wildcard d’aperçus), et utiliser l’URL publique Vercel de CLAIR dans les messages. Aucun SQL/RLS/compte modifié ; toutes les gardes restent identiques. `git apply --check --ignore-space-change` (source CRLF) et tests purs de la proposition passent : GitHub/Vercel autorisés, autres domaines et faux sous-domaines refusés, administrateur anonyme toujours refusé. Le service réel est inchangé. L’application et le déploiement de cette proposition nécessitent l’accord explicite de l’utilisateur avant toute publication réelle.


## Livraison finale : lettrage lumineux et accueil premium

L’utilisateur a demandé de retirer les deux photos, d’écrire « Clair » comme sa référence manuscrite lumineuse, d’améliorer la typographie de l’accueil et de déployer sur Vercel. Les deux originaux et leurs captures sont retirés de l’arbre final. Toute l’étape image et ses timers/décodages ont été supprimés. Le logo passe directement à l’interface après 4,2 s et la sortie du panneau ; toucher le logo, Échap ou la réduction du mouvement libèrent immédiatement la page.

`intro-ui.css` anime cinq chemins SVG originaux par révélation du trait, sans transformer leurs formes. Un dégradé bleu/violet/orangé et un filtre SVG local donnent le relief lumineux de la référence. Aucune police Apple ni copie du visuel de référence n’est distribuée. Le titre du SVG reste CLAIR. La barre conserve le moteur de verre liquide de CLAIR, inchangé.

`type-ui.css` et `assets/fonts/` auto-hébergent Manrope variable sous SIL OFL1.1 : 39 692 octets de WOFF2, sous-ensembles latin/étendu, swap et secours système. Titres, textes, nombres et champs mobiles gagnent en lisibilité ; aucune logique de compte ni donnée n’est modifiée. Les sept flèches statiques sont de petits SVG décoratifs pour éviter les glyphes absents. Licence et provenance sont versionnées ; la licence accompagne les fontes publiées.

**Aperçu final READY** : https://clair-budget-98mw40hdb-diabagateouattara601-7626.vercel.app/masterboard/?welcome=1 (accueil) ; retirer le paramètre pour les six comptes fictifs. Déploiement `dpl_FTzhPjYq9aJUkYKnepVzyrjUJLKD`, cible preview sans alias de production, paquet de 26 fichiers. L’adaptateur fictif et CSP `connect-src none` existent uniquement dans ce paquet. Aucun envoi ou changement de compte réel n’est possible. Les deux URL de photos renvoient 404 dans cet aperçu.

Vérifications : `verify-masterboard-motion.cjs --intro-only` vert sur progression réelle des traits, géométrie fixe320/390/1440, absence d’image, sortie automatique, toucher, Échap, réduction initiale/dynamique. Le test fut rouge sur l’absence de SVG avant implémentation. `verify-masterboard.cjs` vert aux quatre tailles320/390/768/1440 après adaptation de son ancienne attente de chute des lettres. Vérificateur A complété en mémoire par chargement réel de Manrope/texte accentué/identités longues, vert aux quatre tailles, sans éditer ce vérificateur. Auth, données et transport restent des fixtures de test ; aucun compte réel utilisé. Revue indépendante et vérifications syntaxe/diff effectuées. Aucun Safari/iPhone physique testé.

Tests des fichiers HTTPS publics : 25 ressources publiques conformes par taille/SHA1, redirection racine, CSP/noindex/licence présents, les deux photos absentes. Logo lumineux puis accueil, Manrope chargée localement, flèches SVG, aucune erreur JS/appel externe/débordement aux tailles320/390/1440 ; répertoire/profil fictifs et barre liquide en mouvement réduit vérifiés. Le premier essai du vérificateur public lisait une longueur CSS avec `Number` plutôt que `parseFloat` ; correction limitée au vérificateur, puis suite verte. Preuves : `/workspace/masterboard-design-work/premium-public.log`, `hello-intro/green-intro-final.log`, `hello-intro/masterboard-regression.log`, `hello-intro/type-verification/`. Captures versionnées : `masterboard/design-preview/captures/masterboard-{luminous-intro,premium-welcome}-390.png`.

**Publication demandée, pas encore effectuée** : le service réel refuse toujours l’origine `https://clair-budget.vercel.app` (OPTIONS403 confirmé). L’utilisateur a demandé un accord distinct avant toute modification Supabase. La proposition `MASTERBOARD_VERCEL_PROPOSAL.patch` reste non appliquée : autoriser exactement ce domaine et remplacer l’URL GitHub de CLAIR dans les messages, sans wildcard d’aperçu et sans changer SQL/RLS/compte ni garde d’administration. Il faut cet accord pour terminer une publication fonctionnelle.

Le paquet réel est prêt dans `/workspace/masterboard-design-work/production-candidate` (67 fichiers ; manifeste voisin), avec les fontes/licence et toute l’administration réelle, aucun adaptateur fictif/photo, et la redirection `/` vers `/clair/` conservée. Les fichiers CLAIR proviennent du paquet publié existant ; HTML public SHA1 toujours `c52115e744a78bf07e86b7d805ad93a8c3489dff`. Aucun Supabase ni production modifié. La branche distante doit recevoir uniquement le diff final depuis `46e2e9c`, jamais les commits locaux contenant les anciennes photos ; le blocage de diffusion GitHub de ces originaux n’est pas contourné.
