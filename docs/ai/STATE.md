# Clair — état court de reprise

16 novembre 2026. Lire AGENTS puis STATE/MAP ; vérifier branche/statut/dernier commit.

## Repères stables

Production Vercel : https://clair-budget.vercel.app/clair/ ; runtime ef5c75d, dpl_2B8b56bmoFtVcycXSSuUHg3ktpyd, SW41. Masterboard/Edge/rappels préservés. Banque abandonnée. Mission Conseils : aucun compte réel, changement Supabase, fusion main ou déploiement autorisé.

## Trois changements récents

1. **CLAIR Conseils approuvé et implémenté, vérification finale.** L’utilisateur a validé Bilan compact puis demandé de coder. Branche `feat/clair-conseils`, base design cbd9729 ; contrat initial00d24f4. Lire `docs/architecture/CLAIR_CONSEILS.md`, plan/spec16nov dans `docs/superpowers/`. Bilan réel dans la page budget existante, comparaisons déclarées vérifiées, ≤3conseils locaux expliqués, annotations ponctuel/remboursement/virement, repères mensuels datés, pays/ville facultatifs et guide FR. Aucun montant inventé ni transaction créée par un conseil.
2. Contrat JSONv3 optionnel adviceSchema1 : montants/épargne séparés, marqueur conservé import/reset. Modifications financières invalident les périodes concernées ; FX supprime les preuves d’objectif périmées et délie les remboursements arrondis dépassant l’origine sans modifier les montants canoniques. Garde SQL additive préparée/testée en base jetable, **non appliquée** ; prérequis avant publication pour empêcher les anciens clients d’effacer le contexte. Les revues indépendantes métier/UI ont corrigé leurs anomalies (dont focus clavier et éditeur unique) et approuvé ces périmètres.
3. Vérifications :53fichiers de suites Node verts ; génération/miroirs et6tests d’outillage verts ; contrôleur/application générée/SDK à transport synthétique (hors ligne/reconnexion/réponse perdue/double validation/propriétaire) verts. SQLPostgreSQL17local vert :RLS/CAS/compatibilité/8devises/invalidation. Parcours existants navigateur et revue globale en finition. Captures avant/après et rapports : `/workspace/clair-conseils-work/implementation/`. Aucune preuve Safari physique ou synchronisation hébergée réelle.

## Prochaine action

Terminer la revue globale, conserver les résultats navigateur, documenter les limites puis préparer commit/paquet/PR en brouillon. Ne pas publier ni appliquer la garde hébergée sans accord distinct. Ne pas relancer les suites inchangées déjà vertes. Fondation PR33–35/CI172–173 livrée ; `docs/architecture/CLAIR.md` décrit moteur/session/page-host et assemblage canonique. Jamais modifier index généré à la main ni réappliquer les anciennes migrations.
