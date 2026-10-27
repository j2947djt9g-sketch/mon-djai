# Clair Scolaire 🌿

Une mini-application indépendante de **Clair**, avec la même palette vert forêt et un planning souple pour les congés.

## Accès

- Application GitHub Pages : https://j2947djt9g-sketch.github.io/mon-djai/clair-scolaire/
- Code source : dossier `clair-scolaire/` de ce dépôt.

## Ce qui fonctionne

- Planning hebdomadaire : anglais / TOEIC, macroéconomie, Excel, SAP
- Créneaux indicatifs (matin, après-midi, soir), pas d'horaires imposés
- Cases à cocher par date, tâches ajoutables, modifiables et supprimables
- Bouton **Reporter à demain** accessible depuis la modification d'une tâche
- Consultation jour par jour et semaine par semaine
- Tableau de bord des sept derniers jours
- Mode clair/sombre et écran compatible mobile/ordinateur
- Sauvegarde locale dans le navigateur, export/import JSON
- Mode hors ligne pour les éléments déjà chargés et installation possible depuis certains navigateurs

## Confidentialité et limites de la V1

Application statique sans serveur, compte ni publicité. Aucune donnée personnelle n'est envoyée vers un backend. Les tâches et les cases cochées sont enregistrées avec **localStorage**, donc **uniquement sur le navigateur et l'appareil utilisés**. Pour utiliser un autre appareil, exporter les données au format JSON puis les importer. Le cache de l'application permet un usage hors ligne après une première visite, selon la compatibilité du navigateur.

Ne pas effacer les données du navigateur avant d'avoir exporté une sauvegarde. En navigation privée, les données peuvent disparaître à la fermeture de la session.

Le nombre de minutes indiqué est **indicatif** et correspond à la somme des durées des séances cochées, pas à une mesure de temps réelle.

## Déploiement

Projet sans build : `index.html`, `style.css`, `app.js`, `manifest.webmanifest`, `icon.svg` et `sw.js`. Il est servi par GitHub Pages sur la branche hébergeant déjà le dépôt `mon-djai`, sans modifier Clair ni Masterboard.
