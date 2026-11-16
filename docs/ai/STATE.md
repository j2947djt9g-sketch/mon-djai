# Clair — état court de reprise

16 novembre 2026. Lire AGENTS puis STATE/MAP ; vérifier branche/statut/dernier commit.

## Repères stables

Production Vercel : https://clair-budget.vercel.app/clair/ ; runtime ef5c75d, dpl_2B8b56bmoFtVcycXSSuUHg3ktpyd, SW41. Masterboard/Edge/rappels préservés. Banque abandonnée. Mission Conseils : aucun compte réel, changement Supabase, fusion main ou déploiement autorisé.

## Trois changements récents

1. **CLAIR Conseils implémenté, PR37 en brouillon.** L’utilisateur a validé Bilan compact puis demandé de coder. Branche `feat/clair-conseils`, base design cbd9729 ; contrat00d24f4, intégration fe52aba. PR : https://github.com/j2947djt9g-sketch/mon-djai/pull/37 . Lire `docs/architecture/CLAIR_CONSEILS.md`, plan/spec16nov dans `docs/superpowers/`. Bilan réel dans la page budget existante, comparaisons déclarées vérifiées, ≤3conseils locaux expliqués, annotations ponctuel/remboursement/virement, repères mensuels datés, pays/ville facultatifs et guide FR. Aucun montant inventé ni transaction créée par un conseil.
2. Contrat JSONv3 optionnel adviceSchema1 : montants/épargne séparés, marqueur conservé import/reset. Modifications financières invalident les périodes concernées ; FX supprime les preuves d’objectif périmées et délie les remboursements arrondis dépassant l’origine sans modifier les montants canoniques. Garde SQL additive préparée/testée en base jetable, **non appliquée** ; prérequis avant publication pour empêcher les anciens clients d’effacer le contexte. Les revues indépendantes métier/UI/globale ont approuvé les corrections, dont focus/éditeur unique et conservation des liens lors du vrai commit de conversion locale.
3. Vérifications :53fichiers de suites Node verts ; génération/miroirs et7tests d’outillage verts ; contrôleur/application générée/SDK à transport synthétique (hors ligne/reconnexion/réponse perdue/double validation/propriétaire) verts. SQLPostgreSQL17local vert :RLS/CAS/compatibilité/8devises/invalidation. Parcours existants verts :Express9, conversion32, profil16, application/épargne4. Paquet fe52aba82fichiers exacts ; HTTP/téléchargement/PWA hors ligne verts, file:// non prouvé ici. CI GitHub en cours. Captures avant/après et rapports : `/workspace/clair-conseils-work/implementation/`. Aucune preuve Safari physique ou synchronisation hébergée réelle.

## Prochaine action

Suivre la CI de PR37 ; candidat et manifeste dans `implementation/candidate-fe52aba` du workdir. Attendre l’accord distinct pour Supabase, fusion et Vercel production. Ne pas publier ni appliquer la garde hébergée sans accord distinct. Ne pas relancer les suites inchangées déjà vertes. Fondation PR33–35/CI172–173 livrée ; `docs/architecture/CLAIR.md` décrit moteur/session/page-host et assemblage canonique. Jamais modifier index généré à la main ni réappliquer les anciennes migrations.
