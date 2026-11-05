# Plan de travail pour économiser le contexte

But : reprendre Clair sans relire toute l’application ni la conversation. Ce plan organise les lectures ; il ne supprime pas les limites de contexte ou de quota du modèle.

## 1. Démarrer court

Lire `AGENTS.md` et `STATE.md`, puis vérifier le commit et les modifications locales. Budget de ces deux fichiers : **6 500 octets maximum ensemble**. Ne pas charger la carte, le protocole et les anciens dossiers en entier si la demande n’en a pas besoin.

## 2. Trouver avant de lire

Consulter la ligne correspondante de `MAP.md`. Préférer la source de module au HTML embarqué. Pour une fonction qui n’existe que dans le HTML, trouver son nom avec une recherche bornée, puis lire sa fonction complète et les appels utiles, sans inclure le SDK.

```sh
rg --files clair/accounts
rg -n --max-columns 180 --max-columns-preview 'function shareUrl|function shareClair' clair/accounts/profile-ui.js
```

Une sortie tronquée n’est pas une preuve suffisante pour éditer. Lire ensuite l’extrait complet nécessaire, élargir aux dépendances si le sujet l’exige. Les budgets sont des défauts de lecture, pas une interdiction de comprendre un problème complexe.

## 3. Travailler sur un seul périmètre

Écrire un objectif en une phrase et les fichiers concernés. Déléguer seulement une tâche indépendante ; transmettre les chemins, la question et les contraintes utiles, pas toute la conversation. Conserver les décisions et preuves de travail dans l’état court ou un petit journal propre à la tâche.

Éditer le module et sa copie embarquée ensemble. Ne pas dupliquer le code dans `SOURCES.md` après chaque petite retouche : le dépôt est la source de vérité. Lire les documents de produit ou d’architecture seulement pour les règles que le code ne suffit pas à expliquer.

## 4. Vérifier une fois utilement

- Code : test de comportement concerné, vérification des miroirs et contrôles requis par le dépôt ; les suites Node complètes sont rapides.
- Plusieurs parcours touchés : ajouter les essais navigateur appropriés. Ne pas supprimer un contrôle requis pour économiser des tokens.
- Documentation seule : vérifier chemins, faits, taille et cohérence ; éviter de relancer les comptes, bases et écrans sans changement de comportement.
- Garder le résultat court et le lien vers la preuve. Ne pas importer les journaux complets, images base64 ou logs déjà examinés dans le contexte.

## 5. Préparer la prochaine session

Maintenir `STATE.md` sous **3 200 octets** et `MAP.md` sous **4 500 octets**. Garder trois changements récents au maximum ; l’historique détaillé reste dans Git. Avant une interruption, remplacer le bloc Reprise par :

```text
Objectif :
Branche/commit et fichiers modifiés :
Terminé et vérifié :
Décision ou limite :
Prochaine action exacte :
```

Ne pas présenter comme acquis un accord, un test ou un déploiement qui n’a pas eu lieu. Une note est un aide-mémoire : vérifier le diff et les sources actuelles avant de poursuivre.

## Mise en place

Le présent changement apporte les quatre fiches et l’entrée `AGENTS.md`. Aucun code, schéma, calcul financier ni déploiement de l’application n’est modifié. Graphty pourra servir à ajuster les conventions si son document devient disponible.
