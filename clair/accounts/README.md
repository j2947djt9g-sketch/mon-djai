# Clair — comptes et synchronisation (préparation)

Cette branche prépare la connexion et la synchronisation sur plusieurs appareils. Elle n’est pas activée : `CLAIR_ACCOUNT_CONFIG` reste à `null`. Le site publié continue à utiliser son stockage local.

## Fonctionnement

- Adresse e-mail, mot de passe, confirmation de l’adresse et récupération du mot de passe par Supabase Auth. Prénom de 64 caractères maximum, affiché avec échappement HTML.
- Une ligne de budget par utilisateur, avec RLS sur l’UUID fourni par `auth.uid()`. Aucun identifiant utilisateur fourni par le navigateur n’est utilisé pour déterminer le propriétaire lors d’une sauvegarde RPC.
- Sauvegarde locale atomique avec indicateur de modification, numéro de révision et UUID de l’opération. Comparaison de révision côté serveur et rejeu idempotent : une réponse perdue ne provoque pas de double sauvegarde.
- Vérification à l’ouverture, au retour de connexion et chaque minute pendant que l’application est visible. Aucun canal Realtime permanent.
- En cas de conflit entre deux appareils, conserver une copie exige un choix explicite. Une sauvegarde de la copie remplacée est téléchargée.
- Transfert explicite du budget existant. Le budget local original reste présent et devient associé à son premier propriétaire. Il n’est pas importé automatiquement dans le compte d’une autre personne.
- Les photos de fond restent sur chaque appareil, pour éviter de retransmettre une image avec chaque dépense. Les dépenses, les habitudes, les enveloppes et les autres préférences sont synchronisées.
- La déconnexion retire la copie locale du compte connecté. Elle demande d’abord la sauvegarde des modifications en attente.

## Activation restante

1. Créer un projet **Clair**, idéalement dans la région Paris, dans l’organisation choisie. Le connecteur n’a pas permis de le créer : `get_cost` a retourné `MCP tool get_cost was not returned by tools/list`. Aucun coût n’a été confirmé et aucun projet n’a été créé automatiquement.
2. Appliquer `schema.sql` au projet via Supabase MCP `apply_migration` (DDL). Cette version est conçue pour un projet neuf.
3. Exécuter `verify-database.sql` et les advisors de sécurité. Les tests sont dans une transaction terminée par `ROLLBACK`. Vérifier ensuite deux sessions réelles sur des navigateurs distincts : budget A invisible pour B, sauvegarde hors ligne, conflit de modifications, confirmation d’adresse et récupération du mot de passe.
4. Configurer Supabase Auth : Site URL et redirections exactes vers `https://j2947djt9g-sketch.github.io/mon-djai/clair/` et la variante `index.html`. Garder la confirmation d’e-mail active ; minimum de mot de passe 12 caractères. Pour accueillir des utilisateurs hors de l’équipe Supabase, configurer un fournisseur SMTP : le SMTP de test Supabase ne suffit pas à une application publique.
5. Récupérer l’URL du projet et une **clé publishable** `sb_publishable_...`. Ne jamais insérer de clé secrète ou `service_role` dans le HTML.
6. Dans le bloc de compte du HTML, remplacer la configuration nulle par `window.CLAIR_ACCOUNT_CONFIG={url:'https://PROJECT_REF.supabase.co',key:'sb_publishable_...'};`. Restreindre `connect-src` à l’origine exacte du projet plutôt qu’à `https://*.supabase.co`.
7. Vérifier les flux réels, puis fusionner la branche. Ne pas annoncer la synchronisation active avant ces vérifications.

## Tentatives de connexion

Le code impose une pause d’une minute après trois erreurs de mot de passe **sur cet appareil**. Ce compteur n’est pas une protection serveur : il peut être contourné en appelant directement l’API. Les limites de débit serveur de Supabase doivent rester actives, et un CAPTCHA peut être configuré lors de la mise en service publique.

Un plafond exact de trois erreurs par compte côté serveur n’est pas inclus. Le hook Supabase « Password Verification Attempt » nécessite actuellement une offre Teams ou Enterprise. Ne pas présenter le compteur local comme un verrouillage global du compte et ne pas changer d’offre payante sans validation.

## Validation effectuée

`test-cloud.cjs` vérifie avec un serveur simulé : clés distinctes par compte, transfert explicite, conflit entre deux appareils, réponse réseau perdue, modification pendant une sauvegarde, reprise hors ligne et déconnexion.

`test-account-ui.cjs` vérifie le masquage du budget avant connexion, les trois essais côté appareil, la confirmation de l’e-mail, l’échappement du prénom et la protection contre la reprise d’un ancien budget par un autre compte.

`test-local.cjs` vérifie la version avec les comptes désactivés : réglages, paiements anticipés sans double débit, saisie guidée, téléchargement et installation iPhone.

Ces tests sont passés. Les scripts JavaScript sont valides et le moteur financier est identique à la version actuellement publiée. **Les tests SQL, l’isolation réelle RLS et les flux d’e-mail ne sont pas encore exécutés**, faute de projet accessible. Le rendu navigateur de cette branche reste aussi à vérifier avant sa mise en ligne.

## Dépendance

Le client officiel `@supabase/supabase-js` **2.102.0** est intégré au HTML pour permettre le démarrage hors ligne, sans requête vers un CDN. Source : `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.102.0/dist/umd/supabase.js`.

SHA-256 : `c45136a0ba5c7391646869a734db105ba607a9233fd6ec2e7e5bbab447bdc57a`. Licence dans `LICENSE-supabase.txt`. Ce fichier, les tests et les SQL ne contiennent ni mot de passe ni donnée financière réelle.
