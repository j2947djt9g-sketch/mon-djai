# Clair — comptes et synchronisation

Cette branche relie Clair au projet Supabase `hkssnbvktfscizojhftl`. Elle est conservée dans la PR brouillon #1 et n'est pas encore déployée sur le site public.

## État vérifié

- Migration `clair_private_budgets_and_revision_sync` appliquée.
- Tests SQL passés sur la base réelle : création du budget, rejeu idempotent d'une sauvegarde, refus d'une révision obsolète, isolation entre deux identités, refus de réaffecter le propriétaire et refus d'accès anonyme.
- Les fixtures de vérification sont annulées par ROLLBACK. Aucun compte ni budget de test n'est resté dans le projet.
- Advisors Supabase de sécurité et de performance : aucune alerte.
- L'API REST refuse la lecture anonyme avec HTTP 401 / code `42501`.
- Fournisseur e-mail actif et confirmation d'adresse obligatoire.
- Tests Node passés : reprise hors ligne, conflits entre appareils, réponses perdues, modification pendant une sauvegarde, caches distincts, déconnexion, événements de session répétés et mises à jour automatiques identiques.
- Tests de l'interface simulée passés : masquage du budget avant connexion, confirmation de l'e-mail, échappement du prénom, reprise explicite du budget local et pause locale après trois erreurs.
- Vérifications du mode local passées : réglages, saisie guidée, paiements anticipés sans double débit, téléchargement et installation iPhone.
- Moteur financier inchangé. Le HTML utilise une clé publishable et restreint la connexion à l'origine exacte du projet.

## Dernier réglage avant activation

Dans [Authentication → URL Configuration](https://supabase.com/dashboard/project/hkssnbvktfscizojhftl/auth/url-configuration), enregistrer :

Site URL :
`https://j2947djt9g-sketch.github.io/mon-djai/clair/`

Redirect URLs :
- `https://j2947djt9g-sketch.github.io/mon-djai/clair/`
- `https://j2947djt9g-sketch.github.io/mon-djai/clair/index.html`

Le connecteur utilisé ne fournit pas d'action pour modifier ces paramètres. Vérifier ensuite les liens d'e-mail, la connexion réelle sur deux appareils et le rendu navigateur avant fusion et déploiement.

## Fonctionnement

Le prénom personnalise le compte. L'adresse e-mail et le mot de passe servent à la connexion. La propriété du budget est déterminée par `auth.uid()`, sans identifiant de propriétaire fourni à la fonction de sauvegarde par le client. RLS protège chaque ligne et les paramètres JSON ne sont pas concaténés dans une requête SQL.

Le budget est conservé localement avec un numéro de révision, un indicateur de modification et un UUID d'opération dans une seule écriture. Une sauvegarde distante compare la révision et accepte le rejeu d'une même opération. En cas de conflit, un choix explicite est demandé ; la copie remplacée est téléchargée avant résolution.

Le budget existant est transféré après confirmation. Les copies et les sauvegardes de comptes utilisent des clés distinctes par utilisateur. L'ancien budget local est associé au premier compte qui le transfère, et ne peut pas être repris dans l'interface par un autre compte. La déconnexion retire la copie locale du compte après sauvegarde de ses changements en attente.

La synchronisation s'effectue à l'ouverture, au retour de connexion et chaque minute pendant que l'application est visible. Aucun canal Realtime permanent. Les photos de fond restent sur chaque appareil afin de limiter les transferts. Les autres préférences et les données financières sont synchronisées. Le fichier HTML téléchargé conserve le mode local.

## Limites restantes

Le compteur de trois erreurs impose une pause d'une minute sur l'appareil. Il complète les limites de débit de Supabase et n'est pas un verrouillage global côté serveur. Le hook Password Verification Attempt nécessite actuellement une offre Teams ou Enterprise ; aucune offre payante n'est activée.

Le service d'e-mail par défaut de Supabase est destiné aux essais et restreint les destinataires aux adresses autorisées de l'équipe. Un SMTP doit être configuré avant d'ouvrir les inscriptions au grand public. La réception des e-mails et les sessions de navigateur réelles restent à vérifier.

## Dépendance

`@supabase/supabase-js` 2.102.0 est intégré au HTML pour le démarrage hors ligne.
Source : `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.102.0/dist/umd/supabase.js`.
SHA-256 : `c45136a0ba5c7391646869a734db105ba607a9233fd6ec2e7e5bbab447bdc57a`.
Licence dans LICENSE-supabase.txt.

Pour les tests locaux : `node clair/accounts/test-cloud.cjs`, `node clair/accounts/test-account-ui.cjs`, `node clair/accounts/test-local.cjs`.
