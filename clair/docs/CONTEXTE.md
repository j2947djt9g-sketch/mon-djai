# Clair — contexte de reprise pour une IA

## À lire en premier

- Projet : Clair, suivi de budget personnel automatisé.
- Auteur affiché : El-Hadj.
- Date du dossier : 15 octobre 2026.
- Base de référence : 1fde897568d24339e28db6a16f383760d13ab05e ; évolution mascotte décrite ci-dessous.
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
- Les cinq suites de tests Node passent ; le parcours complet inclut les événements close différés, annulation/réouverture, double appui et échec du stockage.

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


## Dernière évolution — mascotte, 15 octobre 2026

- Direction visuelle et publication autorisées par l’utilisateur.
- Illustration à quatre expressions dans l’accueil, les comptes et la configuration existante.
- Aucun agent IA ajouté ; aucun nouveau service externe.
- Les six scripts Node passent, y compris le paiement anticipé sans double débit et la récupération.
- Le moteur financier et le module cloud sont inchangés.
- Les fichiers présents dans ce dépôt sont la référence ; ce dossier docs/ contient les quatre documents actualisés.
- Sources complètes dans SOURCES.md ; consulter seulement les fichiers utiles à la tâche.
- Affichage sur iPhone physique : [À CONFIRMER].
