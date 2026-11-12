# Clair — état court de reprise

Mis à jour le 12 novembre 2026. Lire AGENTS puis cette page et MAP ; vérifier branche, statut et dernier commit.

## Repères stables

- **Production : Vercel uniquement**, https://clair-budget.vercel.app/ → `/clair/`, projet `clair-budget`. Publication manuelle, sans lien Git automatique : `DEPLOYMENT.md`.
- Cible `clair/index.html`, autres apps hors périmètre. JS/CSS canoniques sous `clair/accounts/`, copies identiques embarquées. JSON v3, centimes entiers, dates Europe/Paris, révisions/propriétaire, aucun double débit.
- Source publiée **`ef2558c`**, branche `feat/clair-category-illustrations`, déploiement **`dpl_9uaKUPU5YM3eiPTEitqidJ7hb2ts`** READY production. HTML Git `d65d99b795a97f78bec720c4d4f877ad761b6b42`, SHA1 brute `c52115e744a78bf07e86b7d805ad93a8c3489dff`.

## Trois changements récents

1. **Publication autorisée par l’utilisateur le 12 novembre**, après validation de l’effet et de la forme : A Verre doux, profil lisible clair/sombre/photo, atlas original 16 illustrations et capsule liquide. Rayon circulaire de 30 px, marge de 8 px, ressort/grossissement/reflets et glissement au doigt, mouvement réduit. SW v40. Sources, preuves et fichiers : `VISUAL_DELIVERY.md`. PR30 ouverte vers `feat/clair-express`, aucune fusion dans main.
2. Nouvelle demande **Masterboard : propositions de design**, pas intégration. Branche `feat/masterboard-design-proposals`, base `c2b7f43`. Audit `MASTERBOARD_DESIGN.md`, maquettes isolées sous `masterboard/design-preview/` livrées en aperçu Vercel READY : A Verre doux Administration / B Console professionnelle (lien dans l’audit). Six vues + galerie vérifiées localement/publiquement, revue sans bloquant. Données fictives seulement ; Masterboard réel et Supabase inchangés. Adresse actuelle GitHub Pages ; `/masterboard/` sur Vercel renvoie 404.
3. Express, huit devises et conversion InforEuro novembre 2026 v2 conservés. Moteur/auth/cloud/récupération identiques à `dd7c852` ; aucune modification Supabase pour cette publication. Migrations v2/rappels v3 déjà appliqués : ne pas les rejouer. Banque abandonnée, aucun import/rapprochement à développer.

## Limites et reprise

CI160 source publiée entièrement verte (`43216389904`), 52 ressources publiques vérifiées. Aucun Safari/iPhone physique, compte réel ou notification reçue testé. Indexation Google non confirmée ; audits 3/5 non approuvés. Aide/récupération : restriction d’origine connue, fichiers/SDK présents et inchangés.

Retour disponible : production précédente `dd7c852`, `dpl_BcrZig2Kb3zVyuegxXPLN9Qbj8TU`. `main` reste ancien `dc376fb` ; fusion précédemment refusée faute d’accord distinct : ne pas contourner. Pour la demande actuelle, terminer les propositions Masterboard et attendre validation avant intégration. Préserver la production CLAIR. Nouvelle publication, fusion main ou modification Supabase : suivre les instructions/accords de la session. Maquettes et budgets fictifs uniquement dans les aperçus ; ne pas publier le paquet de démo en production.
