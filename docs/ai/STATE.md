# Clair — état court de reprise

13 novembre2026. Lire AGENTS puis STATE/MAP ; vérifier branche, statut et dernier commit.

## Repères stables

- **Production : Vercel uniquement**, https://clair-budget.vercel.app/clair/, projet `clair-budget`, publication manuelle : `DEPLOYMENT.md`.
- Production **`dpl_B2gMeLCaX4uJK6VSzXnVchNZ8S7g` READY**, code CLAIR `4673b2a`, SW v41, HTML SHA1 `707aef7283ab62e73e7d4b31f61ad08740d151cb`. Masterboard `0cdda26`, service v4 conservés, ne pas rejouer.
- Branche `fix/clair-email-confirmation`, [PR32](https://github.com/j2947djt9g-sketch/mon-djai/pull/32), pas de fusion main. Copies canoniques/inline identiques ; JSON v3/centimes/propriétaires/epochs/révisions préservés. Banque abandonnée.

## Trois changements récents

1. **Correctif confirmation publié après accord explicite**, suivant deux refus automatiques résolus par une nouvelle confirmation utilisateur. `auth-email.js` centralise signup/resend/redirect/callback ; UI confirmation,60s/double clic/correction, séparation récupération et validation SDK. Copies index et SW v41 livrées. Détails : `EMAIL_CONFIRMATION.md`.
2. URL Supabase corrigées par l’utilisateur, vérifiées défaut/callback/index/reset Vercel. Compte test créé sur autorisation : message iCloud reçu et lien CLAIR rapportés humainement ; activation DB et login SDK distinct200 puis logout local204, aucune requête budget. Empreinte du budget stable pendant login. Réception réelle validée pour cette seule adresse ; SMTP effectif/quotas non inspectés, aucun fournisseur/frais activé.
3. CI167 entièrement verte :37 suites Node, navigateurs et SQL isolés ;15cas Auth/SMTP locaux+12UI/SDK/SMTP locaux. Après publication :67ressources publiques exactes, racine307→/clair/,390/1440 avec SDK réel/Auth simulée verts,0erreur. Paquet68,63anciens inchangés, Masterboard/vercel.json préservés. Rapport/captures horsrepo dans `/workspace/clair-auth-email-work/production-public-smoke/`.

## Limites et reprise

Publication terminée, ne pas redéployer ni renvoyer de mail automatiquement. Preuve horsrepo `email-production-release.json`, manifeste `production-candidate-manifest.json`. Ancienne production de retour : `dpl_GkcCqU5PwryuaBr3pywqJ3vmvErM` (CLAIR ef2558c, SW40, même Masterboard). Ne jamais promouvoir l’aperçu fictif.

Un seul compte test réel ajouté, aucun compte existant/reset/RLS/migration/budget modifié par nos opérations. Mot de passe test privé600 sous `remote-test-private/` horsrepo, ne pas afficher/copier dansGit ; remise sûre au propriétaire à prévoir. Récupération assistée : restrictions GitHub préexistantes non modifiées. Tests automatisés sans Safari/iPhone physique ; pas de garantie tous destinataires ni d’indexation Google. Masterboard/refonte : `MASTERBOARD_DESIGN.md`, `VISUAL_DELIVERY.md` ; ne jamais pousser anciens commits photo.
