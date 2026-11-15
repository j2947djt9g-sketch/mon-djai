# Livraison CLAIR — 14 novembre 2026

Après accord utilisateur, la refactorisation revue est publiée sur https://clair-budget.vercel.app/clair/. [PR33](https://github.com/j2947djt9g-sketch/mon-djai/pull/33) est fusionnée dans main93c72763a31e77ce50256df8958d0fb0b93f629b.

## Versions et changements

| Élément | Valeur vérifiée |
|---|---|
| Commit runtime | ef5c75d639bec6da0e2ddb5e8a77505fd163caf9 |
| Arbre | 243f84a4a25ef7a78d823eede700160f26895a10, identique au HEAD local66f3e38 après revue globale d07f0f6 |
| Vercel | dpl_2B8b56bmoFtVcycXSSuUHg3ktpyd READY, deux alias habituels |
| HTML brut SHA1 / blob Git | e8c1a6ed81054acf4acbd1e2f7a9deeaa1b4b399 / f52a7994670b9d58867dbf0eaec6e2b3781aa148 |
| Supabase existant | hkssnbvktfscizojhftl ; migration 20261114123806 clair_device_unlock_issuance_v2 |
| Edge mises à jour | account-help, account-recovery, device-unlock :v2 ACTIVE ; verify_jwt=false préexistant conservé |

Le moteur canonique, les commandes et la session privée séparent les responsabilités. Les candidats sont validés avant écriture ; les résultats asynchrones tardifs sont rejetés après changement de propriétaire/budget. Navigation persistante et journal paramétré conservent l’état utile sans empêcher les mises à jour réelles. Cloud garde CAS/révisions/sync et isolation utilisateur. JSONv3, unités financières, IDs et provenance Express restent préservés.

Les parcours de récupération reconnaissent les origines Vercel exactes. Le déblocage sépare réservation, autorisation d’émission et confirmation durable ; les résultats indéterminés ferment la capacité. Aucun nouveau token persisté. L’assemblage et le paquet sont déterministes. Guides : [CLAIR.md](CLAIR.md), [REFACTOR_VERIFICATION.md](REFACTOR_VERIFICATION.md), [FINAL_REVIEW.md](FINAL_REVIEW.md), [DEVICE_UNLOCK.md](DEVICE_UNLOCK.md).

Le snapshot propre a pour parent l’ancien main dc376fb ; il évite de publier tout l’historique des branches empilées. Les autres apps restent identiques. Masterboard frontend0cdda26/Edge v4 et rappelsv3 sont conservés. La clôture documentaire ne change aucun fichier du paquet publié.

## Vérifications exécutées

- Sauvegardes avant changement : catalogue SQL et sources/configuration des trois Edge ; configuration Vercel réelle récupérée. Même JSON fonctionnel `/`307→`/clair/`, sans en-tête supplémentaire ni règle projet additionnelle.
- Migration additive avant serveur : trois RPC exactes aux sources, SECURITY INVOKER/search_path vide/service_role uniquement ; anon/authenticated refusés. Treize anciennes colonnes, quatre anciennesRPC, ACL/RLS et quatre politiques du budget inchangées. Aucune ligne utilisateur/financière lue ou modifiée par les vérifications.
- Trois Edge récupérées après déploiement : sources exactes et versions/flags attendus.34 contrôles OPTIONS/GET/JSON invalide verts, aucun e-mail ni demande/reset/compte réel créé.
- Paquet75 fichiers reconstruit depuis ef5c75d :74 entrées hors manifeste identiques au paquet66f3e38 relu. Preview dpl_9MG9oMLLZjVhHksgn9nSU7VQRXzm : vérificateur strict échoué à cause de la seule toolbar Vercel sur cinq HTML ; comparaison contrôlée et parcours applicatifs verts. Cette exception est refusée en production.
- Production : `verify-live.mjs` strict vert,74 ressources exactes octet par octet, racine307 et aucune toolbar. Chromium390/1440 écrans connexion/inscription, accueil/profil/navigation rapide verts ; identité navigation conservée, budget fictif inchangé,aucun débordement, aucune erreur console/JavaScript et aucune requête Supabase. Six captures conservées.
- Erreurs runtime Vercel sur15 min : aucun groupe retourné, aucun drain configuré. App statique : cela ne remplace ni les tests navigateur ni les logs Auth. Advisors inchangés :11 INFO RLS sans politiques pour tables service-only et avertissement préexistant de protection des mots de passe compromis désactivée ([remédiation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)). Aucun réglage payant activé.

Préparation locale vérifiée :51 suites Node,2 contrôles CLI,19 scripts navigateur et contrôles supplémentaires de cycle de vie/polish. PostgreSQL 17.6 isolé : finances, compatibilité, ACL/RLS, concurrence réelle, migration historique et injectionsNULL. [CI172](https://github.com/j2947djt9g-sketch/mon-djai/actions/runs/43623848649) est entièrement verte :51 suites Node (48 comptes +3 outils), assemblage/paquet, parcours navigateur et deux jobs SQL. Tête PR ef5c75d ; commit de fusion provisoire testé1f4e4003b96e90a8e0f74dd7f8679606880400c7. Leurs arbres runtime sont identiques.

Le contrôle après fusion est terminé : [CI173](https://github.com/j2947djt9g-sketch/mon-djai/actions/runs/43625150828), déclenchée sur main93c72763a31e77ce50256df8958d0fb0b93f629b, est entièrement verte (checks, masterboard-sql et reminders-sql). La clôture documentaire [PR34](https://github.com/j2947djt9g-sketch/mon-djai/pull/34) est fusionnée dans5f0fcbb ; seuls les quatre documents de livraison diffèrent du runtime publié. Le domaine public pointe toujours vers le même déploiement READY ef5c75d. Aucun groupe d’erreurs runtime Vercel retourné sur les24heures du contrôle ; cela ne prouve pas l’absence d’erreurs sur les appareils des utilisateurs. Aucun test déjà vert n’a été relancé et aucun nouveau déploiement ou changement Supabase n’a été effectué pour ce suivi.

## Limites et retour

Safari/iPhone physique, installation PWA physique, notifications et nouvelle réception e-mail ne sont pas prouvés sur cette release. Les parcours navigateur utilisent Auth/budgets fictifs ; aucun reset/déblocage réel déclenché. Le file:// local reste bloqué par la politique Chromium ; le contrôle strict téléchargement/file/PWA et la CI172 complète ont réussi sur le runner GitHub. Import/reset gardent leur orchestration legacy après écriture ; incertitudes Auth globales décrites dans DEVICE_UNLOCK. Aucune banque ajoutée.

Retour frontend : dpl_B2gMeLCaX4uJK6VSzXnVchNZ8S7g. Sources des Edgev1 sauvegardées ; un retour serveur conserve le schéma additif et ne reclasse jamais issuing/unknown/issued en approved. Ne pas restaurer/effacer les budgets pour annuler cette publication. Aucun retour exécuté.

Paquet, sauvegardes, manifestes, rapports et captures : `/workspace/clair-refactor-work/release-20261114/`. La livraison initiale `delivery/DELIVERY.json` est antérieure au déploiement ; son indicateur nonpublié reste une preuve historique. Pour reprendre : AGENTS/STATE/MAP puis modules/tests utiles, sans refaire l’audit complet.
