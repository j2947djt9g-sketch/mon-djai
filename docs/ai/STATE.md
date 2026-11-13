# Clair — état court de reprise

Mis à jour le 13 novembre 2026. Lire AGENTS puis STATE et MAP ; vérifier branche, statut et dernier commit.

## Repères stables

- **Production : Vercel uniquement**, https://clair-budget.vercel.app/clair/, projet `clair-budget`, publication manuelle sans lien Git automatique : `DEPLOYMENT.md`.
- Production conservée : `dpl_GkcCqU5PwryuaBr3pywqJ3vmvErM` READY ; CLAIR `ef2558c`, HTML SHA1 `c52115e744a78bf07e86b7d805ad93a8c3489dff`, SW v40. Masterboard frontend `0cdda26`, service v4 : ne pas rejouer sa publication.
- Modules canoniques `clair/accounts/` et copies inline identiques. JSON v3/centimes entiers/propriétaire/epochs/révisions et budgets préservés. Express, huit devises et conversion v2 conservés ; banque abandonnée. Autres apps hors périmètre.

## Trois changements récents

1. **Correctif confirmation en préparation**, branche `fix/clair-email-confirmation`, base `1f541b7`. `auth-email.js` centralise signup/resend/redirect/callback/messages ; `account-ui.js` ajoute écran dédié, correction sans mot de passe,60s et double clic. `cloud.js` remonte l’erreur SDK d’initialisation ; gates index séparent confirmation/récupération. SW candidat v41. Diagnostic et procédure : `EMAIL_CONFIRMATION.md`.
2. Preuves :37 suites Node vertes (34 initiales +3 fixtures adaptées/revérifiées),15 tests service, navigateur simulé320/390/768/1440 ;15 tests Auth/SMTP locaux et12 UI/SDK/SMTP réels locaux, plus fallback ancien GitHub→Vercel. Deux comptes isolés, budgets REST fictifs. Relecture indépendante : ambiguïté query/hash avec ancien compte en cache corrigée et régression SDK. Moteur inchangé ; conteneurs locaux arrêtés. Rapports hors dépôt `/workspace/clair-auth-email-work/`.
3. Refonte A/illustrations/profil/capsule liquide et Masterboard publiés antérieurement, sans changement pendant cette mission. Détails : `VISUAL_DELIVERY.md`, `MASTERBOARD_DESIGN.md`. Historique partagé sans photos depuis `46e2e9c` : ne jamais pousser les anciens commits photo locaux.

## Limites et prochaine action

URL Supabase corrigées par l’utilisateur, vérifiées13nov11:18UTC : défaut/callback/index/reset acceptés sur Vercel ; confirmation obligatoire active. SMTP/template production à vérifier ; aucun fournisseur selon utilisateur.

Un compte test créé après accord explicite : signup SDK/helper13nov11:36UTC HTTP200, compte non confirmé,1mail.send,0budget. Un seul envoi. Réception iCloud et lien demandés à l’utilisateur, non vérifiés. Mot de passe privé600 horsrepo, aucune PII dans les docs. Puis vérifier activation/connexion sans budget. Détails : `EMAIL_CONFIRMATION.md`.

[PR32](https://github.com/j2947djt9g-sketch/mon-djai/pull/32) brouillon, code CI167 vert. Publication conditionnelle autorisée, accord conservé : attendre SMTP/template puis publier candidat réel68fichiers sans redemander. Ne jamais promouvoir la démo. Récupération assistée : restrictions GitHub préexistantes. Aucun iPhone physique, compte existant/mot de passe/budget/RLS modifié ni fusion main autorisée.
