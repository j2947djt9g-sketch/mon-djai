# Clair — état court de reprise

16 novembre 2026. Lire AGENTS puis STATE/MAP ; vérifier branche/statut/dernier commit.

## Repères stables

Production Vercel : https://clair-budget.vercel.app/clair/ ; runtime ef5c75d, dpl_2B8b56bmoFtVcycXSSuUHg3ktpyd, SW41. Masterboard0cdda26/Edgev4 et remindersv3 préservés. Banque abandonnée. Mission Conseils : aucun accès aux comptes, changement Supabase ou déploiement.

## Trois changements récents

1. **CLAIR Conseils : proposition et maquettes, validation attendue.** Branche `design/clair-conseils`, base main f323de4. Lire `docs/superpowers/specs/2026-11-16-clair-conseils-design.md`, prototype voisin et références. L’utilisateur veut analyser/améliorer la proposition, valider ensemble, puis coder. A Bilan compact recommandé ; B Bilan et coach séparés. Aucune fonctionnalité produit implémentée. Modèles fictifs en mémoire uniquement ; contrôles des maquettes Chromium A/B320/390/768/1440 verts, montants185/777/273/80 conservés après marquage45 puis repère140. Pas un test du futur moteur ou de Safari physique.
2. Audit ciblé : entrée bilan budget() existante ; réutiliser moteur/dates Paris/centimes/huit devises/enveloppes/journal/atlas et flux épargne du profil. Épargne cumulée du bilan actuel ≠ épargne mensuelle. Nature remboursement/virement/exception et preuve de complétude absentes ; ne rien inférer du libellé. Conversion globale conserve la devise courante, pas tous les montants FX originaux. ExpressInsights exclut automatiques/fixes : ne pas en faire le total mensuel. Aucun prix local ni droit à une aide inventé ; références documentaires optionnelles, pays/ville déclaratifs sans GPS.
3. Fondation précédente livrée : PR33–35 fusionnées, CI172 et CI173 après fusion entièrement vertes ; suivi clos. Canonique domain/engine, application/{budget-commands,budget-session}, ui/{navigation,page-host} ; Cloud garde CAS/révisions/owner/epoch. Source/template→build.mjs --generate→--check ; jamais index à la main. Migration unlockv2 20261114123806 et trois Edgev2 déjà appliquées ; ne pas réappliquer SQL historique/v2. Guides `docs/architecture/{CLAIR,REFACTOR_RELEASE,DEVICE_UNLOCK}.md`.

## Prochaine action

Présenter les maquettes et recueillir le choix explicite avant implémentation. Les choix/règles de la proposition sont proposés, pas déjà approuvés. Préserver JSONv3, centimes/CFA entiers, IDs/provenance, Auth/notifications/RLS. Import/reset et révocation globale restent une dette distincte. Preuves et versions interactives de travail : `/workspace/clair-conseils-work/` ; livraisons antérieures : `/workspace/clair-refactor-work/release-20261114/`. Ne pas relancer l’audit ou les suites déjà vertes sans raison nouvelle.
