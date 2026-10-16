# Clair — contexte de reprise pour une IA

- Version décrite : fichiers de ce même commit ; base vérifiée avant cette retouche : fca3aec260f28288e585281af7841c4c7b5e6265.
- Publication publique de ces documents autorisée par l’utilisateur le 16 octobre 2026.

## À lire en premier

- Projet : Clair, suivi de budget personnel automatisé.
- Auteur affiché : El-Hadj.
- Date du dossier : 16 octobre 2026.
- Base vérifiée avant intégration : 4d6706fcab50033712da59c79c1d98adc77afa78. Les fichiers de ce même commit décrivent la version courante.
- Site : https://j2947djt9g-sketch.github.io/mon-djai/clair/
- Dépôt : https://github.com/j2947djt9g-sketch/mon-djai ; périmètre de travail : clair/.
- Ces quatre documents suffisent pour comprendre la version décrite sans relire la discussion. Ils doivent être actualisés après les changements.

## Bibliothèque de référence

| Besoin | Document à consulter |
|---|---|
| Fonctions et comportement utilisateur | [PRD.md](PRD.md) |
| Architecture, décisions, données, accès, tests et limites | [CONSTRUCTION.md](CONSTRUCTION.md) |
| Code brut exact, fichiers et reconstruction | [SOURCES.md](SOURCES.md) |
| Orientation rapide et décisions à préserver | Ce document |

- Charger ce fichier d'abord.
- Consulter ensuite la section pertinente du PRD et de CONSTRUCTION.
- Dans SOURCES, cibler le chemin ou le nom de fonction nécessaire. Ne pas relire le SDK intégré pour une modification d'interface.
- Vérifier la version du dépôt avant de modifier : un export daté ne remplace pas les dernières sources.
- Ne pas coder une fonctionnalité absente du PRD sans l'y décrire et obtenir sa validation.

## Ce que veut l'utilisateur

- Saisir ses habitudes une fois ; éviter la saisie de chaque repas et abonnement.
- Saisir manuellement les revenus et dépenses exceptionnelles.
- Utiliser le même budget sur iPhone, Android et ordinateur.
- Interface inspirée d'Apple Music, cartes encadrées, fonds personnalisables et icônes SVG.
- Solde en haut, paiements à venir ensuite, classés par urgence.
- Dépenses prévues et « Il manque / Il restera » côte à côte, même sur téléphone.
- Réglages courts ; simplifier ou retirer ce qui gêne avant d'ajouter des options.
- Rappels deux jours avant les échéances.
- Récupération du mot de passe simple, avec messages persistants.
- Les quatre fichiers sont une documentation de transfert ; aucun envoi à une autre personne ou IA n'est réalisé automatiquement.

## Ce qui existe

- Application HTML/CSS/JavaScript autonome, hébergée sur GitHub Pages.
- Moteur de calcul en centimes, occurrences sans doublons et dates Europe/Paris.
- Comptes Supabase, confirmation d'e-mail, budgets privés par propriétaire et copie locale.
- Synchronisation avec révisions et choix explicite lors d'un conflit ; reprise hors ligne.
- Guide de configuration, habitudes hebdomadaires/mensuelles/annuelles, historique, bilan et enveloppes.
- Export/import JSON, CSV, calendrier ICS et téléchargement du fichier HTML.
- PWA installable ; photo de fond conservée sur chaque appareil.
- Parcours de récupération déployé : adresse conservée, renvoi limité, formulaire dédié, succès puis budget.
- Paiement anticipé corrigé : confirmation dans la fiche ouverte, protection contre les anciens événements de fermeture, un seul débit après validation.
- Les neuf suites de tests Node passent ; le parcours complet inclut les événements close différés, annulation/réouverture, double appui et échec du stockage.

## Ce qui n'est pas terminé ou prouvé

- Push lorsque l'app est fermée : code préparé, aucun serveur raccordé.
- E-mails publics et réception réelle : [À CONFIRMER].
- Dernier rendu et parcours sur un iPhone physique : [À CONFIRMER].
- Durées de conservation, sauvegardes serveur, logs et conformité juridique complète : [À CONFIRMER].
- Aucune suppression complète du compte proposée dans l'interface.
- Aucune connexion bancaire ou exécution de paiement réel.

## Repères techniques

- Supabase : hkssnbvktfscizojhftl ; région eu-central-1, Francfort.
- Table public.clair_budgets ; RPC save_clair_budget, SECURITY INVOKER.
- SDK Supabase JS 2.102.0 intégré à index.html.
- Les quatre scripts intégrés : moteur, SDK, cloud, interface.
- account-ui.js et cloud.js sont aussi conservés sous clair/accounts/ ; maintenir leurs copies intégrées cohérentes.
- JSON de budget version 3 ; transactions, rules, skipped, enveloppes, épargne et preferences.
- Cache du budget : clair-account-budget-v1-<UUID>.
- Session locale : clair-account-session-v1.
- Ancien budget : clair-github-money-v3 / clair-github-money-v1.
- CLAIR_PUSH_CONFIG = null ; ne pas annoncer le push comme opérationnel.
- Une clé publishable est publique ; aucune clé serveur n'a sa place dans le navigateur.

## Garde-fous

- Ne pas compter deux fois une dépense automatique ou un paiement anticipé.
- Les prévisions ne sont pas encore déduites et n'incluent pas les revenus futurs.
- Ne pas confondre « paiement confirmé par toi » avec une vérification bancaire.
- Le dialog partagé : vider modal avant close() et ne pas effacer l'état d'une fenêtre déjà rouverte lors d'un ancien événement close. Pour payer en avance, remplacer le contenu sans fermer/rouvrir.
- Les enveloppes ne créent pas de dépenses.
- Une photo ne se synchronise pas avec le compte, mais peut exister dans une sauvegarde locale.
- Ne pas effacer une copie en attente ou écraser un conflit silencieusement.
- Ne pas utiliser le prénom comme preuve d'identité.
- RLS protège les lignes ; le compteur local de trois essais n'est pas une sécurité serveur globale.
- Le privilège SQL DELETE de authenticated existe dans le catalogue, mais aucune politique DELETE n'est définie : lire l'explication exacte dans CONSTRUCTION.
- Le reset du suivi ne supprime ni le compte ni toutes les anciennes copies.
- clair/LISEZ-MOI.md est historique : ses affirmations sur l'absence de serveur sont dépassées pour les comptes.
- Ne pas appliquer à Clair les fichiers « les-question.txt » et « la-base.txt » joints à la discussion : ils concernent une autre application.

## Première action lors d'une prochaine demande

1. Identifier la fonction du PRD concernée.
2. Vérifier le dernier commit et lire les sections pertinentes, sans charger tout SOURCES.
3. Préparer le changement en préservant les garde-fous ci-dessus.
4. Tester le comportement concerné et préciser les limites des essais.
5. Actualiser ces documents avec la nouvelle version et les points restant à vérifier.


## Dernière intégration validée — 15 octobre 2026

- Intégration et publication autorisées par l’utilisateur : bienvenue animée seule, images fixes ailleurs, changement du mot de passe et parcours d’adresse existante.
- Bienvenue de deux secondes, une seule lecture par session, passage immédiat possible, bypass récupération et réduction des mouvements. Aucun mouvement dans le solde ou l’historique.
- Six images fixes et une animation sous assets/mascotte/. 06-solde-negatif-v2.webp est statique et recadrée, avec le personnage complet.
- Priorité au solde actuel : négatif → couchée en pleurs ; zéro → assise triste. Solde positif → tablette si prévision négative, vigilance si prévision nulle, sérénité si marge positive. Configuration incomplète → tablette et invitation à terminer les habitudes.
- Réglages → Mon compte → Modifier mon mot de passe : actuel, nouveau, confirmation, affichage/masquage et 12–128 caractères. Vérification via une session Auth temporaire non persistée ; updateUser utilise ensuite la session originale. Budget inchangé.
- Code supplémentaire pris en charge si Auth le réclame ; renvoi limité à 60 secondes.
- Inscription : e-mail normalisé, adresse conservée et actions connexion/récupération. Message explicite seulement si Auth confirme l’existence ; sinon message neutre. Aucun RPC public de recherche d’adresse.
- Index users_email_partial_key présent et zéro groupe de doublons lower(btrim(email)) parmi les comptes non SSO au contrôle en lecture seule du 15 octobre 2026. Aucun schéma ou paramètre Auth modifié.
- Service worker v10 ; ressources visuelles aussi intégrées dans la copie HTML téléchargée, sans données de budget.
- Neuf suites Node réussies, dont test-account-security et test-account-security-sdk. Vérification avec SDK officiel et transport simulé : mot de passe incorrect bloqué, session temporaire supprimée, session originale et budget conservés.
- Moteur financier et cloud inchangés ; sources de compte et copie intégrée cohérentes. SOURCES.md comprend les tests et les empreintes des images.
- Aucun compte réel modifié, aucun mot de passe réel utilisé et aucun e-mail réel envoyé pour les essais. Réception des e-mails et iPhone physique : [À CONFIRMER].

## Dernière retouche validée - 16 octobre 2026

- Mascotte du solde agrandie et rapprochée du montant, placé avec elle dans balance-readout. Message sous le groupe ; aucune image alignée au bord droit de la carte.
- Largeur 190 px sur grand écran, 150 px sur écran intermédiaire, 110 px sur téléphone, 100 px jusqu'à 380 px ; écart de 14 à 18 px. Montants longs : réduction adaptée et coupure entre groupes de milliers si nécessaire, sans seuil de solde supplémentaire.
- Préserver l'image entière, les deux prévisions côte à côte sur téléphone, les expressions actuelles et la bienvenue comme seule animation.
- index.html et sw.js modifiés ; cache v11. Moteur financier, SDK, cloud, comptes et ressources visuelles préservés.
- Neuf suites Node réussies et huit montants contrôlés sans altération ni mutation du budget. Le navigateur de test ne démarre pas : le dernier rendu visuel et l'iPhone physique restent à confirmer.
- PRD, CONSTRUCTION et SOURCES actualisés pour cette retouche, publication publique toujours autorisée dans le périmètre clair/.
