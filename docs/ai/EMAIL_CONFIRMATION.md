# Confirmation e-mail — audit et correctif préparé

13 novembre 2026. Branche `fix/clair-email-confirmation`, base `1f541b7`. **Production et Supabase inchangés.** Aucun compte supprimé, mot de passe réinitialisé, budget/RLS/projet remplacé. La panne de réception en production n’est pas déclarée résolue.

## Diagnostic : preuves et limites

- Auth public `/settings` : inscription et fournisseur email actifs, `mailer_autoconfirm=false` (12 novembre).
- GET `/verify` avec jeton délibérément invalide, sans adresse et sans suivre le retour :303 vers GitHub Pages par défaut, également lorsque `/clair/` ou `/clair/index.html` Vercel sont demandés. L’ancien `/mon-djai/clair/index.html` est conservé. **Défaut prouvé : destination par défaut GitHub et redirections Vercel non acceptées.** Cela n’explique pas à lui seul une absence de réception.
- Avant correction, le client transmet déjà `emailRedirectTo:origin+pathname`. Les modules Auth n’ont pas changé pendant la migration des liens/métadonnées (`06d2947`, 5 novembre). Ne pas attribuer la panne à Vercel sans autre preuve.
- Aucun renvoi `auth.resend` dans l’ancienne UI. Un `otp_expired` de confirmation ouvre à tort la récupération du mot de passe : reproduction VM sans requête Auth.
- Journaux24h examinés :2 activités `mail.send` de confirmation,3 erreurs `email_not_confirmed`, aucun échec SMTP/rate-limit observé. **Une activité d’envoi ne prouve pas la remise ni la réception.** Le référent GitHub des logs peut provenir de la destination sélectionnée ; il ne prouve pas l’origine du navigateur.
- Requête agrégée en lecture seule :13 comptes,2 non confirmés, dont un créé avant la migration. Aucun email ni identifiant individuel copié ici. Non confirmé ne signifie pas nécessairement non reçu.
- Le README historique documente le SMTP de test Supabase limité à l’équipe ; **le réglage SMTP actuel reste inconnu**, faute d’outil Auth Management/SMTP/dashboard connecté. La recherche ciblée dans la boîte mail connectée ne couvre pas les boîtes des autres utilisateurs.
- Variables Vercel visibles : aucune ; app statique avec paramètres Supabase publics intégrés. Aucun secret serveur à introduire dans le client. Les outils disponibles ne permettent pas de corriger la configuration Auth distante.

Preuves expurgées hors dépôt : `/workspace/clair-auth-email-work/{public-auth-probes,redirect-allowlist-probes,logs-audit}.json`. Aucun secret, mail brut, jeton de callback ou destinataire réel à publier.

## Fonctionnalités réellement développées

- Service central `clair/accounts/auth-email.js` (`ClairAuthEmail`) pour inscription, renvoi, destination, reconnaissance/nettoyage des callbacks et messages d’erreur. SDK Supabase2.102.0 et architecture existants conservés.
- Destination fixe `https://clair-budget.vercel.app/clair/?auth=confirmation`. Aucun domaine fourni par un utilisateur.
- Écran dédié après inscription sans session ou connexion `email_not_confirmed` : adresse échappée, indésirables, renvoi, correction et retour connexion. Aucun mot de passe conservé lors de la correction.
- Verrou de requête,60s entre renvois, maintien du délai sur erreur/429 et après rechargement. Stockage d’une échéance sous clé SHA256 par projet/adresse, repli mémoire si stockage indisponible. Ces gardes UI complètent les protections fournisseur ; elles ne constituent pas une limite serveur globale.
- Message « demande acceptée » uniquement après réponse sans erreur ; aucune promesse de livraison. Réponses d’inscription obfusquées traitées de manière neutre.
- Confirmation séparée de la récupération. Un ancien lien ambigu propose le choix du parcours ; une erreur n’ouvre plus implicitement le formulaire de nouveau mot de passe. Suspension et mauvais mot de passe restent distincts.
- Callback traité par le SDK avant nettoyage URL. Le hook optionnel `authInitialized` remonte aussi l’erreur d’initialisation si une ancienne session existe. L’UI exige une adresse confirmée, la bonne identité attachée et des credentials effectifs valides.
- Copies canoniques/inline synchronisées ; démarrage/render préservent le budget pendant la confirmation. Moteur financier inchangé. Cache SW v41, retours Auth exclus des clés de cache.

API : `normalizeEmail`, `confirmationRedirect`, `callback`, `cleanCallback`, `message`, `create({auth,storage,crypto,now})`. Le service créé expose `signup`, `prepare`, `markRequested`, `resend`, `waitSeconds`. `callback().hasImplicitCredentials` respecte la priorité SDK : hash puis query, dernière occurrence gagnante, même vide. Le helper ne retourne aucun token.

## Problème trouvé en relecture et corrigé

Une query vide pouvait masquer les credentials du hash pour le SDK, alors que l’UI reconnaissait encore ceux du hash et annonçait à tort la confirmation du compte A déjà en cache. Aucun accès au compte B ni contournement RLS démontré. Parsing central aligné sur le SDK, quatre régressions VM et régression SDK officiel ajoutés. Relecture indépendante finale : correction acceptée, aucun problème bloquant ou important restant établi sur le diff examiné.

## Vérifications exécutées

| Vérification | Résultat et portée |
|---|---|
| Node `clair/accounts/test-*.cjs` |37 suites vertes :34 réussites au passage global,3 fixtures VM adaptées puis rejouées avec succès (history navigateur, nouvel écran, prédicat de démarrage). Pas de répétition des34 suites inchangées. |
| Service email |15 tests : destination fixe, erreurs,60s/reload, double demande,429, stockage, callbacks/doublons/valeurs vides. |
| UI/cloud/récupération/SDK |Signup, non confirmé, suspendu, SDK initialisation/cache, changement de compte pendant initialisation, callbacks valides/expirés, ambiguïté A/B, récupération existante. |
| Chromium + SDK officiel, transport simulé |320/390/768/1440 : inscription429/200, renvoi accepté/429/réseau,60s, double clic, correction sans mot de passe, reload et expiration.32 captures. |
| Auth et SMTP réellement locaux |15 vérifications GoTrue/Postgres/Mailpit : inscription → mail SMTP capturé → confirmation → connexion, refus avant confirmation, expiration/réutilisation, renvoi immédiat429 puis accepté après61s. Aucun envoi externe. |
| UI + SDK + Auth/SMTP locaux réels |12 vérifications : nouveau contexte mobile390 touch, connexion troisième contexte, correction, expiration/réutilisation, renvoi après62s, deux comptes A/B isolés. Budgets REST simulés avec JWT local vérifié et filtre propriétaire, refus403 intercompte. Ce n’est pas un test de RLS production. |
| Ancienne destination refusée, vrai mail local |1 vérification : Site URL Vercel, GitHub non autorisé, signup demandant GitHub → mail local →303 Vercel avec credentials valides → compte confirmé200 → login200. Aucun domaine externe suivi. |
| Relecture indépendante |Audit fonctionnel/sécurité et correction P2 relue ; aucun changement de données/SQL/SDK. |

Rapports/captures sous `/workspace/clair-auth-email-work/` : `node-suite-final-results.json`, `browser-mock/`, `browser-real-email/`, `security-review.md`, `local-auth/proof-legacy-redirect.json`, et copie expurgée `final-local-evidence/`. Les3 conteneurs et leur réseau de test sont supprimés ;4 ports loopback vérifiés fermés. Secrets locaux privés hors dépôt.

Le harness initial Playwright a lu un ancien HTML public par un GET : faux positif identifié par empreinte. Le parcours final consomme le303 local sans le suivre, puis charge explicitement le document local dont chaque empreinte est vérifiée, avec proxy fermé. Aucun compte Auth cloud créé ni e-mail externe envoyé pendant ces essais.

**Limites :** aucune réception de message de production vérifiée, aucun iPhone/Safari physique, aucune modification des limites/SMTP production. Les tests réels locaux ne prouvent pas la délivrabilité du fournisseur actuel.

## Configuration humaine à appliquer après accord

1. Dans le projet Supabase existant `hkssnbvktfscizojhftl`, relever la configuration actuelle sans partager de secret, puis **Authentication → URL Configuration** : Site URL `https://clair-budget.vercel.app/clair/`.
2. Ajouter les destinations Vercel exactes :
   - `https://clair-budget.vercel.app/clair/`
   - `https://clair-budget.vercel.app/clair/index.html`
   - `https://clair-budget.vercel.app/clair/?auth=confirmation`
   - `https://clair-budget.vercel.app/clair/reset.html`
   Ne pas ajouter de wildcard d’aperçus. Après contrôle des templates/anciens liens, retirer les anciennes destinations **d’inscription** GitHub pour que les nouvelles demandes anciennes retombent sur Site URL Vercel. Ce fallback valide est prouvé localement ; vérifier aussi un ancien lien réel avant clôture. Conserver les entrées de récupération nécessaires jusqu’à validation du point adjacent ci-dessous.
3. **Authentication → Email → SMTP Settings** : relever si un fournisseur personnalisé est actif et inspecter logs/limites, expéditeur validé et indésirables. Si l’envoi de test Supabase est encore utilisé, configurer un fournisseur autorisant les destinataires publics. Ne pas activer d’abonnement ni engager de frais sans accord. Valider SPF/DKIM/DMARC selon fournisseur ; saisir les secrets uniquement dans le dashboard.
4. Template **Confirm signup** : utiliser `{{ .ConfirmationURL }}` généré par Supabase ; vérifier qu’aucune URL GitHub n’est écrite en dur. Laisser la confirmation email activée. Vérifier protections serveur, fréquence minimale d’envoi60s et quotas fournisseur ; valeurs actuelles à relever.
5. Publier sur Vercel uniquement le code réel revu, sans adaptateur/bannière/CSP de démo. **Accord de production requis avant cette étape et les changements Auth.** Aucune variable SMTP/secrète dans le navigateur.
6. Avec une adresse test contrôlée et autorisée, vérifier réellement : inscription, acceptation fournisseur, réception (dont spam), lien, activation, connexion autre appareil ; puis renvoi, expiration/réutilisation. Vérifier les comptes existants sans les modifier. Ne clore l’incident qu’après cette preuve complète.

Point adjacent non modifié : le serveur de récupération assistée et ses pages contiennent encore des origines/destinations GitHub (`supabase/functions/clair-account-recovery/{handler.mjs,index.ts}`, `clair/accounts/reset-page.js`). Leur restriction d’origine Vercel doit être validée séparément avant d’annoncer la récupération production fonctionnelle. Les tests locaux ne prouvent pas cet accès distant ; ne pas retirer aveuglément les anciennes entrées de récupération.

Changer une destination ne renvoie aucun message perdu rétroactivement. Ne pas désactiver la confirmation, modifier `email_confirmed_at`, supprimer des comptes ou contourner RLS.

## Fichiers modifiés

- Production candidate : `clair/accounts/{auth-email,account-ui,cloud}.js`, `clair/index.html`, `clair/sw.js`.
- Tests : `clair/accounts/test-{auth-email,confirmation-sdk,account-ui,cloud,recovery,account-security,account-security-sdk,mascot,service-worker}.cjs`, `clair/accounts/verify-auth-entry.cjs`.
- Contexte : `clair/accounts/README.md`, `docs/ai/{EMAIL_CONFIRMATION,MAP,STATE}.md`.
- Adaptateur/contrôles d’aperçu et preuves SMTP : uniquement dans le workdir hors dépôt, jamais dans le candidat de production.

## Livraison et reprise

Audits code/logs, agents service Auth, UI confirmation, tests navigateur, QA SMTP locale, relecture indépendante et intégration principale mobilisés. Autres applications préservées.

Aperçu Vercel READY : https://clair-budget-haz2o32t7-diabagateouattara601-7626.vercel.app/clair/ (`dpl_3Z7RPPEpJJYhe8Jas3XUPkjvgFNv`, cible preview, aucun alias production). Vérification publique390/1440 : signup,60s, double renvoi, correction, expiration, aucun débordement/erreur JS/appel externe ; ressources chargées comparées aux empreintes du paquet. PR à préparer. L’aperçu est explicitement fictif, sans compte ni envoi réel, connexions externes bloquées, service worker et indexation désactivés. Il ne doit jamais devenir le paquet de production.

Restent soumis à accord : configuration Auth production, éventuel fournisseur SMTP/coût, publication Vercel réelle et envoi réel de validation. Aucun changement Supabase ou de production réalisé par cette mission.
