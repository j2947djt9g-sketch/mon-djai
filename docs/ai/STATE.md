# Clair — état court de reprise

13 novembre2026. Lire AGENTS puis STATE/MAP ; vérifier branche, statut et dernier commit.

## Repères stables

- **Production : Vercel uniquement**, https://clair-budget.vercel.app/clair/, projet `clair-budget`, publication manuelle : `DEPLOYMENT.md`.
- Production inchangée `dpl_GkcCqU5PwryuaBr3pywqJ3vmvErM` READY : CLAIR `ef2558c`, SW v40, HTML SHA1 `c52115e744a78bf07e86b7d805ad93a8c3489dff`. Masterboard `0cdda26`, service v4 : préserver, ne pas rejouer.
- Source correctif `4673b2a`, branche `fix/clair-email-confirmation`, [PR32](https://github.com/j2947djt9g-sketch/mon-djai/pull/32). Copies canoniques/inline identiques. JSON v3/centimes/propriétaires/epochs/révisions préservés. Banque abandonnée.

## Trois changements récents

1. Correctif prêt : `auth-email.js` centralise signup/resend/redirect/callback ; `account-ui.js`, `cloud.js`, index et SW candidat v41. Écran confirmation,60s/double clic/correction, séparation récupération et validation SDK. Revue indépendante corrigée/validée. Détails : `EMAIL_CONFIRMATION.md`.
2. CI167 entièrement verte :37 suites Node, navigateurs et SQL isolés. SMTP/Auth locaux15cas +12UI/SDK réels locaux ; source figée. En production : utilisateur corrige Site URL/allowlist, vérifiées11:18UTC ; signup unique autorisé11:36UTC, mail reçu et lien CLAIR confirmé humainement. DB confirme activation ; login distinct200 puis logout local204, aucun REST budget, empreinte du budget inchangée pendant ce test. Aucun reset ni compte existant modifié.
3. Refonte A/illustrations/profil/capsule et Masterboard publiés antérieurement : `VISUAL_DELIVERY.md`, `MASTERBOARD_DESIGN.md`. Ne pas pousser les anciens commits photo, ne pas fusionner main.

## Publication et limites

Candidat réel68fichiers :63anciens identiques,4modifiés+auth-email.js ; Masterboard/vercel.json préservés. `/workspace/clair-auth-email-work/production-candidate{,-manifest.json}`. HTML SHA1 `707aef7283ab62e73e7d4b31f61ad08740d151cb`. Ne jamais promouvoir l’aperçu fictif.

Accord conditionnel antérieur donné et tests remplis, mais auto-review a REFUSÉ2fois le déploiement : n’a pas reconnu cet accord pour l’action production précise. Aucun déploiement créé ; demander/attendre nouvelle confirmation explicite utilisateur (question async posée). Ne pas contourner ni retenter avant cette réponse. Preuves : `production-authorization-evidence.json`, rapports `controlled-{signup,login}-result.json` horsrepo.

Réception/activation/connexion vérifiées pour1adresse iCloud, sans garantie pour tous les destinataires. SMTP effectif/quotas non inspectés ; aucun fournisseur/frais activé. Récupération assistée : anciennes restrictions GitHub préexistantes. Mot de passe test privé600 horsrepo, aucune PII/secrets dans Git ; remise sûre à prévoir. Aucun budget ou RLS modifié par nos tests, aucune fusion main autorisée.
