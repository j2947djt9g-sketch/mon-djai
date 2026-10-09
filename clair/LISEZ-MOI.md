# Clair — version autonome

Application statique publiée dans le dossier clair du dépôt mon-djai.

## Migrer son budget
1. Dans Clair sur Lovable : Réglages → sauvegarde/export JSON.
2. Ouvrir la nouvelle version GitHub : Réglages → import JSON, sélectionner la sauvegarde.
3. Vérifier solde, historique et charges avant de supprimer l'ancienne sauvegarde.

Le changement d'adresse ne transfère pas les données automatiquement. Les données sont propres au navigateur. Cette version utilise des clés distinctes afin de préserver l'application historique située à la racine du dépôt.

## Utilisation
Configurer le solde disponible, les jours de repas et les charges récurrentes. Ajouter manuellement revenus et dépenses exceptionnelles. Le solde est calculé, pas un relevé bancaire. Les dépenses automatiques rattrapent les dates écoulées à l'ouverture sans déduction en double.

## Installation
iPhone : Safari → Partager → Sur l'écran d'accueil. Android/PC : utiliser l'option d'installation proposée par le navigateur compatible. Les chemins du manifest et du service worker sont relatifs au dossier clair. Le cache ne couvre que les fichiers de cette application.

## Notifications
Les rappels visibles à l'ouverture et l'export calendrier sont disponibles. Les notifications push lorsque l'application est fermée ne sont pas connectées : aucun serveur de rappels n'est configuré. Aucune donnée de budget n'est envoyée à un serveur par cette version.

## Vérifications de cette migration
Syntaxe des deux scripts JavaScript vérifiée. Moteur comptable inchangé. Vérification de la déduction mensuelle et de son idempotence réussie. Manifest et cache isolés au sous-dossier ; le worker ne supprime pas les caches des autres applications. Le nouvel habillage et l'installation sur un vrai appareil restent à vérifier dans un navigateur.

## Source
Base : public/clair.html de Clair, révision Lovable 2bf0524fe80750ceb995eb16bd6f11dd1ecc0b59. Habillage des cartes, explications repliables, chemins PWA et stockage séparé adaptés pour GitHub Pages. Aucun secret ou budget personnel inclus.
