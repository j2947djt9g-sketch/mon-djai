# Clair — état court de reprise

Mis à jour le 5 novembre 2026. Référence produit vérifiée : `13fbf2e28e65f968a57687bfd89a6f3dd9e3e568` ; vérifier le dernier commit avant une nouvelle modification.

## Repères stables

- Application : https://clair-budget.vercel.app/ ; la racine redirige vers `/clair/`.
- Code cible : `clair/index.html`. L’`index.html` à la racine est une autre application historique.
- HTML/CSS/JS statiques, SDK Supabase embarqué, modules sources sous `clair/accounts/`. Budget JSON v3, montants entiers en centimes, dates Europe/Paris.
- Comptes et synchronisation existants ; préserver les clés par propriétaire, les révisions et les conflits. Une nouvelle adresse ne migre pas automatiquement le stockage local ou l’installation PWA.
- Commencer par `MAP.md` pour trouver le module et ses tests. Les anciens `clair/docs/CONTEXTE.md` et `SOURCES.md` mélangent des versions : références à consulter seulement pour un point précis.

## Trois changements récents

1. PR27, publiée : partage et ouverture en ligne vers Vercel ; URL canonique, robots et sitemap ajoutés. Accès HTTP public et ressources vérifiés. L’indexation Google n’est pas confirmée et aucune demande Search Console n’a été effectuée.
2. PR26, publiée : animation complète à la première visite, accès rapide ensuite ; dépense directe avec brouillon conservé ; aide sur les filtres d’épargne incompatibles. Les propositions d’audit 3 (recherche toute période) et 5 (restauration de position) ne sont pas approuvées.
3. Présente intervention : ajouter un plan de contexte court, sans changer le produit. La référence Graphty n’a pas été retrouvée dans les dépôts connectés ; cette organisation applique l’objectif décrit par l’utilisateur, sans prétendre recopier un document vérifié.

## Vérifications et limites connues

- Base produit : 28 suites Node et contrôles GitHub verts pour PR27 ; profil/partage testé avec données fictives, sur plusieurs tailles et devises. Cela ne remplace pas un essai avec un compte réel ou un iPhone physique.
- L’aide, la récupération et les rappels côté serveur avaient des origines limitées à GitHub Pages lors du contrôle du 5 novembre. Ne pas les annoncer fonctionnels sur Vercel sans nouvelle vérification ciblée. La connexion ordinaire n’a pas été validée ici sur un vrai compte.
- Déploiement Vercel manuel par fichiers ; connexion GitHub–Vercel non configurée. Cibles et fichiers nécessaires : `DEPLOYMENT.md`.

## Reprise

Aucune modification produit en cours. Pour une nouvelle demande : identifier le sujet, ouvrir sa source et ses tests via la carte, puis actualiser ce bloc à la fin. Ne pas recommencer les travaux déjà publiés des PR26/27.
