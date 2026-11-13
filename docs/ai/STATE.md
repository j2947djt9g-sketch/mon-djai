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

Auth distant : destination GitHub par défaut, retours Vercel refusés (303 invalid-link probes) ; pas une preuve de non-livraison. Logs2 mail.send sans erreur SMTP observée ; SMTP actuel inaccessible/inconnu. Aucun e-mail de production reçu testé. Réception locale seule prouvée, aucun iPhone/Safari physique. Récupération assistée : restrictions d’origine/destinations GitHub connues, non modifiées.

Aperçu Vercel fictif READY,390/1440 vérifié ; PR à finaliser : `EMAIL_CONFIRMATION.md`. Ne jamais promouvoir le paquet de démo. Restent à autoriser : réglages Auth/SMTP, publication Vercel réelle et envoi de validation. Aucun compte/mot de passe/SQL/RLS/budget modifié. `main` ancien `dc376fb`, aucune fusion autorisée ; retour production CLAIR seul `dpl_9uaKUPU5YM3eiPTEitqidJ7hb2ts`.
