# Clair — PRD : fonctionnement du produit

- Application documentée : révision 97b3b8290d382c32d10c76d6c0eaa88085b14b5b, publiée sur GitHub Pages.
- Publication publique de ces documents autorisée par l’utilisateur le 16 octobre 2026.


- Référence : code du dépôt j2947djt9g-sketch/mon-djai, dossier clair/.
- Base examinée avant cette retouche : 4d6706fcab50033712da59c79c1d98adc77afa78.
- Date de mise à jour : 16 octobre 2026.
- Application : https://j2947djt9g-sketch.github.io/mon-djai/clair/
- Lire d'abord [CONTEXTE.md](CONTEXTE.md). Architecture et données : [CONSTRUCTION.md](CONSTRUCTION.md). Code : [SOURCES.md](SOURCES.md).
- Ce document décrit le produit existant et les demandes déjà acceptées. Il ne transforme pas une fonction préparée dans le code en service opérationnel.

## 1. But

- Suivre son argent disponible sans ressaisir chaque dépense répétitive.
- Configurer les repas habituels, le loyer et les abonnements, puis compter leurs occurrences automatiquement.
- Saisir soi-même les rentrées d'argent et les dépenses exceptionnelles.
- Retrouver son propre budget sur plusieurs appareils avec le même compte.
- Voir rapidement le solde et les échéances les plus urgentes.
- La priorité validée est la simplicité : optimiser les parcours avant d'ajouter des options.

## 2. Accès et appareils

- Version hébergée : navigateur sur iPhone, Android et ordinateur.
- Installation comme application web lorsque le navigateur le permet ; aide Safari intégrée pour l'iPhone.
- Le lien du site est public. Il ne donne pas accès au budget d'un autre compte.
- Chaque utilisateur crée ou utilise son propre compte.
- Le fichier HTML téléchargé fonctionne en mode local, sans synchronisation du compte.
- L'interface comporte des adaptations mobiles ; les derniers parcours de récupération et de paiement anticipé n'ont pas été testés sur un iPhone physique.

## 3. Fonctions existantes

### F01 — Compte

- Inscription : prénom, adresse e-mail et mot de passe.
- Connexion : adresse e-mail et mot de passe ; le prénom ne sert pas de secret de connexion.
- Confirmation de l'adresse requise dans la configuration Auth vérifiée.
- Minimum de 12 caractères dans les formulaires d'inscription et de nouveau mot de passe.
- Après trois réponses de connexion incorrecte, pause locale d'une minute. Ce compteur ne constitue pas un verrouillage global côté serveur.
- Réglages : adresse, synchronisation, modification du mot de passe et déconnexion.
- Modifier mon mot de passe demande le mot de passe actuel, le nouveau et sa confirmation ; affichage/masquage des saisies, nouveau mot de passe de 12 à 128 caractères. La vérification Auth préserve la session et le budget ouverts.
- Si Auth demande un code de vérification supplémentaire, un champ et un renvoi après 60 secondes sont proposés.
- E-mail normalisé : un seul compte e-mail non SSO par adresse. L’index unique est présent et aucun groupe de doublons normalisés au contrôle du 15 octobre 2026.
- Adresse existante confirmée par Auth : proposer connexion et récupération. Réponse masquée : explication neutre et mêmes choix. Conserver l’adresse saisie sans ajouter de recherche publique d’e-mail.
- La déconnexion attend la sauvegarde des changements en attente ou indique qu'elle n'a pas pu aboutir.

### F02 — Récupération du mot de passe

- « Mot de passe oublié ? » conserve l'adresse déjà saisie.
- Demande d'un lien par e-mail ; réponse neutre sur l'existence du compte.
- Écran « Vérifie tes e-mails » persistant, avec adresse, indication sur les indésirables, correction et renvoi.
- Délai de renvoi de 60 secondes dans l'interface, en complément des limites du service.
- Un lien validé ouvre un écran consacré au nouveau mot de passe.
- Bouton pour afficher ou masquer la saisie ; minimum indiqué avant validation.
- La synchronisation et le retour dans l'onglet ne doivent pas effacer la saisie.
- Succès persistant, puis « Accéder à mon budget », sans demander une deuxième connexion.
- Lien invalide, expiré ou déjà utilisé : demande d'un nouveau lien.
- Réception réelle en boîte mail : [À CONFIRMER]. Envoi fiable à tous les utilisateurs : [À CONFIRMER].

### F03 — Première configuration

- Assistant en quatre étapes : point de départ, repas habituels, charges récurrentes, récapitulatif.
- Solde initial et date de début du suivi.
- Repas : jours cochés et montant configurable pour chaque jour.
- Charges : nom, montant, catégorie, date de début et jour d'échéance ou fin du mois.
- Une ligne de charge entièrement vide ne crée pas de règle ; une ligne incomplète sélectionnée affiche son erreur.
- Les anciennes opérations restent conservées lorsqu'on termine la configuration d'un budget existant.
- Lors d'une première connexion avec un ancien budget local, le transfert est proposé explicitement. Il n'est pas fait silencieusement.

### F04 — Dépenses automatiques et habitudes

- Règles hebdomadaires : montant par jour de la semaine.
- Règles mensuelles : jour choisi ou dernier jour du mois.
- Règles annuelles : mois et jour, via le formulaire avancé.
- Si le jour choisi dépasse la longueur du mois, utilisation du dernier jour de ce mois.
- Dates de début et de fin ; pauses temporaires et reprise.
- Interrupteur de suspension : effet à partir du lendemain.
- Correction ou annulation d'une occurrence sans modifier toutes les autres.
- À l'ouverture et lors des actualisations, rattrapage des dates écoulées.
- Une même occurrence ne doit être comptée qu'une fois.
- Ce sont des écritures de suivi : Clair ne prélève pas d'argent et ne paie pas une facture.

### F05 — Solde et prévision

- « Mon solde » figure en haut de l'accueil.
- Solde actuel = solde initial + revenus datés jusqu'à aujourd'hui − dépenses datées jusqu'à aujourd'hui.
- Les dépenses automatiques échues font partie des dépenses déjà comptées.
- Les montants sont calculés en centimes ; l'affichage est en euros.
- Les deux sous-cartes restent côte à côte : dépenses prévues et résultat après ces dépenses.
- Dépenses prévues = occurrences automatiques restantes jusqu'à la fin du mois + dépenses futures déjà saisies dans cette période.
- Si le résultat est négatif : « Il manque », montant positif en rouge. Sinon : « Il restera ».
- Les dépenses prévues ne sont pas déduites une deuxième fois du solde actuel.
- Les revenus futurs ne sont pas inclus dans cette prévision.
- Deux explications repliables donnent la définition du solde et le calcul.
- Le solde n'est pas un relevé bancaire.

### F06 — Paiements à venir

- Cartes compactes avec icône SVG, titre, prix, date et délai.
- Échéances classées par date, de la plus urgente à la plus lointaine.
- Cette liste concerne les règles mensuelles et annuelles, pas chaque repas hebdomadaire.
- Elle affiche aussi des échéances passées déjà comptées mais non confirmées.
- Au clic, ouverture du détail de l'échéance.
- Confirmer un paiement déjà compté ne crée pas une nouvelle déduction.
- Noter un paiement anticipé demande confirmation et crée une seule dépense aujourd'hui ; l'échéance ne sera pas déduite de nouveau.
- La confirmation remplace le détail dans la même fenêtre. Après validation réussie, la fenêtre se ferme et le paiement apparaît dans le suivi.
- Annuler laisse le solde intact ; un double appui sur la confirmation ne crée pas une deuxième dépense.
- « Payé » signifie confirmé par l'utilisateur ; aucune vérification bancaire n'est effectuée.

### F07 — Ajouts et historique

- « Ajouter » propose « Argent reçu » et « Dépense exceptionnelle ».
- Saisie du montant, de la date, du nom, de la catégorie et d'une note.
- Historique par mois, recherche et filtres : toutes, automatiques, saisies, revenus.
- Modifier une opération ; supprimer ou annuler une occurrence.
- Annulation immédiate proposée pour certaines actions.
- Corriger le point de départ ou rapprocher le solde avec le montant réel ; le rapprochement produit une opération d'ajustement.

### F08 — Bilan, enveloppes et épargne

- Bilan mensuel des revenus et des dépenses déjà datés.
- Limites de dépenses par catégorie, habituelles ou propres à un mois.
- Les enveloppes donnent des repères ; leur montant ne crée pas de dépense.
- Suivi des opérations classées en épargne et d'un objectif d'épargne.
- L'épargne affichée correspond au suivi saisi dans Clair, pas à un compte bancaire interrogé automatiquement.

### F09 — Apparence et navigation

- Six poses fixes ; animation uniquement à l’entrée, pendant deux secondes. Comptes, solde, configuration et historique utilisent des images statiques.
- Accueil avec accès à la création du compte et à la connexion ; les utilisateurs déjà connus gardent un accès rapide à leur budget.
- La mascotte est décorative, se réduit pendant la saisie sur mobile et respecte la préférence de réduction des animations.
- L'accompagnement utilise les écrans et calculs existants ; aucun agent conversationnel n'est ajouté par cette évolution.
- Trois entrées principales : Accueil, Historique, Réglages.
- « Mes habitudes » et le bilan sont accessibles depuis les liens de l'application.
- Navigation latérale sur grand écran et barre inférieure sur mobile.
- Inspiration Apple Music : dégradés, carte de solde encadrée, cartes d'échéances et icônes dessinées.
- Thèmes clair, sombre et automatique.
- Fonds : défaut, aurore, océan, coucher de soleil, forêt, photo personnelle.
- Photo convertie et réduite dans le navigateur ; elle reste sur cet appareil.
- Écran « Bonjour », « Développé par El-Hadj », bref et pouvant être passé.
- Réglages regroupés ; explications et actions avancées repliables.
- Le produit ne prétend pas être une application Apple officielle.

### F10 — Rappels

- Rappels dans Clair pour les prochaines échéances sélectionnées à J−2 ou J−1.
- Activation globale et choix par règle mensuelle ou annuelle.
- Pas de rappel individuel pour chaque repas hebdomadaire.
- Export calendrier ICS des échéances futures, avec alarme deux jours avant.
- Après un changement des habitudes, le calendrier exporté doit être remplacé ou réimporté.
- Les notifications lorsque Clair est fermé restent non connectées : CLAIR_PUSH_CONFIG vaut null.
- Le code de réception push et une interface de raccordement existent ; cela ne prouve pas qu'un serveur envoie des rappels.
- L'heure de 9 h affichée dans les informations push ne correspond pas à un service de rappels actif.

### F11 — Synchronisation et sauvegardes

- Même compte sur plusieurs appareils : budget partagé via Supabase.
- Copie locale distincte par utilisateur.
- Changements sauvegardés d'abord sur l'appareil, puis envoyés en ligne.
- Reprise des changements hors ligne lorsque la connexion revient.
- En cas de modifications concurrentes incompatibles, choix explicite d'une copie avec sauvegarde de l'autre.
- Aucun écrasement silencieux par une révision ancienne.
- La photo de fond reste locale ; les autres préférences et le budget sont synchronisés.
- Export et import JSON ; copie précédente conservée avant remplacement.
- Export CSV de l'historique.
- Téléchargement du fichier de l'application séparé de la sauvegarde des dépenses.
- Recommencer le suivi demande d'écrire EFFACER ; une copie précédente est conservée lorsque possible.

## 4. État et limites à ne pas masquer

- Fonctions de compte, de synchronisation et de récupération déployées dans la version de référence.
- Tests de logique et du SDK réussis ; essais sur appareils physiques : [À CONFIRMER].
- Notifications fermées : demande validée, réalisation opérationnelle encore incomplète.
- Configuration de l'envoi d'e-mails pour le grand public : [À CONFIRMER].
- Pas de suppression complète du compte dans l'interface actuelle.
- Conservation formelle des données, sauvegardes serveur et journaux : [À CONFIRMER].
- Le fonctionnement hors ligne dépend de la copie et de la session déjà présentes ; une première connexion demande Internet.
- Une réinitialisation du suivi ne signifie pas suppression de toutes les copies ni fermeture du compte.

## 5. Périmètre des prochaines interventions

- Améliorer les parcours existants et résoudre les problèmes observés.
- Finaliser les rappels et l'envoi d'e-mails dans les limites validées.
- Préserver l'automatisme, les données et la simplicité de navigation.
- Une fonction nouvelle doit être décrite dans ce PRD et validée avant d'être codée.
- Aucune connexion bancaire, paiement réel ou nouvelle collecte personnelle n'est décrite comme disponible.


## Mascotte — version validée le 15 octobre 2026

- Une animation de bienvenue de deux secondes à l’entrée, une lecture par session de navigateur. Un choix permet de passer immédiatement ; aucun rejeu à chaque navigation ou enregistrement.
- Nouvel utilisateur : création ou connexion explicite. Utilisateur connu : passage automatique après deux secondes. Récupération et réduction des mouvements : accès direct sans animation.
- Toutes les autres utilisations de la mascotte sont des images fixes. Les anciens mouvements du solde et de l’historique sont retirés.

| Condition, dans cet ordre | Image fixe |
|---|---|
| Solde actuel négatif | Couchée sur le côté, recroquevillée, très triste, deux petites larmes |
| Solde actuel nul | Assise, clairement triste |
| Solde positif, configuration incomplète | Tablette, invitation à terminer les habitudes |
| Solde positif, prévision négative | Inquiète avec sa tablette |
| Solde positif, prévision nulle | Vigilante, sans tristesse marquée |
| Solde positif, prévision positive | Debout avec un sourire serein |

- Prévision = solde actuel − dépenses prévues. Aucun seuil arbitraire de petit solde. Les messages décrivent les calculs sans jugement sur une dépense.
- Boîte fixe de rapport 3:4, personnage complet, fond transparent et halos séparés en CSS. La pose couchée a été recadrée pour garder le personnage entier.
- Montants lisibles et deux sous-cartes côte à côte sur téléphone ; mascotte réduite pendant la saisie. Confirmation écrite dans le journal avec une image fixe.
- Sept ressources visuelles précachées et intégrées dans le téléchargement HTML. Aucun appel à une IA depuis Clair.
- Neuf suites Node réussies. Réception réelle des e-mails et iPhone physique : [À CONFIRMER].
