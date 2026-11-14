# Clair — état court de reprise

14 novembre2026. Lire AGENTS puis STATE/MAP ; vérifier branche/statut/derniercommit.

## Repères stables

Production **Vercel uniquement**, https://clair-budget.vercel.app/clair/ ; dpl_B2gMeLCaX4uJK6VSzXnVchNZ8S7g READY antérieur, code4673b2a/SW41. Masterboard0cdda26/servicev4 préservés. Cette mission n’a rien publié/appliqué dans Supabase. Banque abandonnée.

## Trois changements récents

1. **Refactorisation locale terminée et revue globale approuvée** (d07f0f6) : `refactor/clair-professional-foundation`, basec55c8ea, tous lots0–6. Guides `docs/architecture/CLAIR.md`, `REFACTOR_VERIFICATION.md`, `FINAL_REVIEW.md`. Aucun problème critique/important/mineur nécessitant correction. Branche/worktree conservés ; aucune fusion/push historique/publication autorisés.
2. Source canonique : domain/engine.js (41API/calculs préservés), application/{budget-commands,budget-session}.js (candidats validés/snapshots privés/owner/epoch), ui/{navigation,page-host}.js et journal paramétré. Cloud garde CAS/révisions/sync ; cache propriétaire/révision gardés, photos tardives rejetées, ACK préserve vues/drafts. Source/template→`node tools/clair/build.mjs --generate`→`--check`, jamais index à la main. JSONv3/centièmes/CFAentiers/datesParis/IDs/provenance préservés.
3.51suitesNode+2CLI et19scriptsbrowser verts après corrections ciblées de fixtures ; cycledevie et polishjournal verts. SQLisoléfinances/ACL/RLS/concurrence/legacy/NULLfaults verts. Paquet75fichiers déterministe et vérifié, téléchargement/PWA/ secoursMasterboard contrôlés sans API/cachecompte ni erreur ;0nœud ajouté/retiré sur10refreshs (110/60avant). SDK/Masterboardinchangés. SQLunlockv2 seulement préparé, protocolefencé/inconnufermé ; guide DEVICE_UNLOCK.md.

## Limites et prochaine intervention

file:// réel NONEXÉCUTÉ (politiqueChromium, ne pas contourner) ; VMfile/téléchargement/PWA sont distincts. Pas de Safari/iPhone physique, nouvelle réceptionmail/push, backendhébergé, CI distante ou typecheck/bundleDeno prouvés. Import/reset conservent orchestration legacy postécriture à durcir séparément ; la garantie `commit` ordinaire ne couvre pas tous ces anciens handlers. Pas de promesse Authexactementunefois/révocationglobale.

PostgreSQLjetable supprimé par ID après tests ; worktree/sources/preuves conservés. Livraison locale zip+patch et commit/SHA256 : `/workspace/clair-refactor-work/delivery/DELIVERY.json`. Preuves/briefs/logs : `/workspace/clair-refactor-work/` ; tests versionnés à relancer selon tâche, pas tout relire. Avant release : lire DEPLOYMENT.md, vérifier cibles/catalogues et obtenir accord propre pour Vercel/Edge/SQL. Ne jamais réappliquer SQLhistorique ni pousser ancienscommitsphoto. Prochaine action utilisateur : revue des sources/livraison locale ou instruction distincte d’intégration.
