# Conversion des huit devises — correctif du 11 novembre 2026

Le sélecteur publié affichait GBP/MAD/CAD/CHF grisés : le moteur et le RPC initial n’avaient des taux que pour EUR/USD/XOF/XAF. Les nouvelles devises étaient utilisables à la création, pas pour convertir un budget existant.

## Politique actuelle préparée

Référence mensuelle officielle de la Commission européenne, InforEuro novembre 2026, politique immuable `inforeuro-2026-11`. `exchange-rates-v2.json` contient les valeurs exactes, leurs entiers à l’échelle 100000, la période, les sources et la preuve de vérification. Il s’agit d’une référence comptable indicative, sans frais de change, pas d’un cours en temps réel. Aucun compte bancaire ni service payant connecté.

Les huit codes partagent la même base EUR : EUR 1, USD 1,113, GBP 0,83578, MAD 10,98365, CAD 1,5577, CHF 0,9222, XOF/XAF 655,957. Les directions croisées utilisent le ratio cible/source. Calcul entier rationnel, arrondi au centime ou au franc CFA entier, égalités à l’écart de zéro. Montant trop petit ou au-delà des limites : annulation complète. Une conversion n’a lieu qu’après aperçu puis confirmation ; aucune réévaluation des écritures existantes à la mise à jour. Les objectifs journaliers conservés dans une autre devise s’affichent avec la référence courante, comme auparavant, sans modifier le journal.

## Compatibilité et parcours

- `exchange.js` est embarqué dans le moteur HTML ; `exchange-ui.js` affiche la source/période et fige `asOf` et `policyId` entre aperçu et validation.
- `cloud.convertCurrency(to,revision,asOf,policyId)` appelle `convert_clair_currency_v2`, qui exige la politique exacte. Le serveur conserve verrou du propriétaire, CAS/révision, identifiant de reprise et droits existants.
- `exchange-v2.sql` ajoute seulement les fonctions v2 : les anciens helpers/RPC et leur moyenne 2016–2025 restent inchangés pour les anciens clients. `exchange-rates.json` et `exchange-legacy-vectors.sql` sont les références héritées.
- JSON v3, montants en centimes, provenance Express, projets d’épargne et équilibre des arrondis sont conservés. Le solde initial est ajusté comme dans le moteur précédent pour respecter le solde converti annoncé.

## Vérification et publication

33 suites Node vertes ; 64 paires JS, 64 vecteurs complets JS/SQL et 16 vecteurs hérités inchangés sur PostgreSQL 17.6 isolé. Navigateur : 32 combinaisons largeur/devise, 229 conversions, deux rejets simulés, changement à minuit Paris, conservation de la date d’aperçu, aucun débordement. Relecture indépendante sans problème restant. Données fictives uniquement ; aucun budget réel modifié pour tester.

Ordre : appliquer uniquement `exchange-v2.sql`, vérifier les définitions/droits/gardes et les anciens taux, puis publier le paquet validé sur Vercel. Ne jamais appliquer les fichiers `verify-*.sql` en production : ils reconstruisent des tables de test. Ne pas réappliquer `exchange.sql` : il réinstallerait l’ancienne garde à quatre devises. Ne pas modifier silencieusement les valeurs d’une politique déjà publiée ; utiliser un nouvel identifiant et un déploiement coordonné.

Cible : https://clair-budget.vercel.app/ ; la fusion GitHub reste une action distincte non autorisée. État du déploiement à lire dans `STATE.md` et `DEPLOYMENT.md`.
