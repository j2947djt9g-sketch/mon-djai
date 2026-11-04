# Prototype Open Banking fictif de CLAIR

## Portée
Prototype indépendant, sans connexion à un établissement bancaire, sans API externe, sans authentification et sans requête vers Supabase. Il ne modifie pas `clair/index.html`, `clair/sw.js`, le schéma SQL ou le site GitHub Pages de production.

## Fichiers
- `clair/accounts/bank-demo.html` : interface autonome.
- `clair/accounts/bank-demo.css` : styles.
- `clair/accounts/bank-demo.js` : moteur de données fictives, catégorisation, dédoublonnage et transferts internes.
- `clair/accounts/bank-demo-ui.js` : interaction avec la page.
- `clair/accounts/test-bank-demo.cjs` : tests Node natifs.

## Utilisation
Ouvrir `clair/accounts/bank-demo.html` depuis une copie locale du dépôt (ou une prévisualisation statique isolée). Cliquer sur « Connecter », puis « Simuler une synchronisation ». Relancer la synchronisation : aucun doublon. Connecter les deux comptes : le virement interne est exclu des revenus/dépenses. Déconnecter ou réinitialiser pour effacer les transactions de la session.

Les données ne sont stockées ni en base ni en localStorage : recharger la page remet le prototype à zéro. Les soldes fictifs sont des exemples fixes et ne se recalculent pas à partir des opérations importées.

## Tests
Commande : `node --test clair/accounts/test-bank-demo.cjs`.
Les tests couvrent le démarrage vide, la connexion, l'idempotence, l'exclusion des virements internes, la déconnexion et les banques inconnues. Les tests du navigateur et l'accessibilité nécessitent une validation supplémentaire.

## Avant une intégration réelle
Choisir un prestataire Open Banking agréé, vérifier sa couverture bancaire et son tarif, implémenter un backend avec secrets côté serveur, gérer consentement et expiration, séparation des données par utilisateur, RGPD, import idempotent, rapprochement des transactions manuelles, sécurité et audits. Aucun de ces éléments n'est activé ici.
