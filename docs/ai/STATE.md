# Clair — état court de reprise

14 novembre 2026. Lire AGENTS puis STATE/MAP ; vérifier branche/statut/derniercommit.

## Repères stables

Production **Vercel uniquement**, https://clair-budget.vercel.app/clair/ ; runtime ef5c75d, dpl_2B8b56bmoFtVcycXSSuUHg3ktpyd READY, SW41. Masterboard 0cdda26/Edge v4 et reminders v3 préservés. Banque abandonnée. Ne pas republier l’ancien main dc376fb.

## Trois changements récents

1. **Livraison autorisée et publiée** :75 fichiers depuis ef5c75d ;74 ressources publiques exactes, racine307, aucune toolbar/démo. Chromium390/1440 écrans Auth/accueil/profil/navigation rapide verts,aucune erreur ni appel Supabase réel. Snapshot propre parentmain ancien, arbre égal66f3e38 ; [PR33](https://github.com/j2947djt9g-sketch/mon-djai/pull/33), fusionnée (main93c7276). Branche `refactor/clair-foundation-release-20261114` ; branche revue originale conservée. Rapports `docs/architecture/REFACTOR_RELEASE.md`, `docs/ai/DEPLOYMENT.md`.
2. Supabase : migration additive20261114123806 `clair_device_unlock_issuance_v2` puis account-help/account-recovery/device-unlockv2 ACTIVE. Sources exactes ;34 contrôles publics verts. RPC v2 invoker/service-only, anciennesRPC/ACL/RLS et quatre politiques du budget inchangées. Aucun compte/budget réel/reset/e-mail touché par les vérifications. Ne réappliquer ni SQLhistorique ni v2 déjà appliqué. Retour serveur conserve schémaadditif ; DEVICE_UNLOCK.md.
3. Refactor lots 0–6 relu globalement sans correction restante : domaine/commandes/session privée owner+epoch/navigationpersistante/journalparamétré ; Cloud garde CAS/révisions/sync.51 suites Node+2CLI,19 scripts navigateur et cycledevie/polish/SQLisolé verts. Guides CLAIR.md, REFACTOR_VERIFICATION.md, FINAL_REVIEW.md. Source/template→build.mjs --generate→--check, jamais index à la main. JSONv3/centimes/CFAentiers/Paris/IDs/provenance préservés.

## Limites et prochaine intervention

Pas de Safari/iPhone physique, nouvelle réceptionmail/push ou compte hébergé validés sur cette release. file:// local bloqué par la politique Chromium ; CI172 entièrement verte, y compris file/PWA sur runner GitHub. Pas de promesse Authexactementunefois/révocationglobale. Import/reset gardent orchestration legacy postécriture. Advisor motdepassecompromis désactivé préexistant, non modifié.

Worktree/sources/preuves conservés. Livraison initiale66 : `/workspace/clair-refactor-work/delivery/DELIVERY.json` ; paquetpublié et preuves actuelles : `/workspace/clair-refactor-work/release-20261114/`. Prochaine tâche : choisir MAP et tests pertinents sans refaire l’audit. L’accord couvrait cette livraison, pas de dépenses/nouveauxservices/changements financiers. Lire DEPLOYMENT avant toute nouvelle publication.
