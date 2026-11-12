# Clair — état court de reprise

Mis à jour le 12 novembre 2026. Lire AGENTS puis cette page et MAP ; vérifier branche, statut et dernier commit.

## Repères stables

- **Production : Vercel uniquement**, https://clair-budget.vercel.app/ → `/clair/`, projet `clair-budget`. Publication manuelle, sans lien Git automatique : `DEPLOYMENT.md`.
- Cible `clair/index.html`, autres apps hors périmètre. JS/CSS canoniques sous `clair/accounts/`, copies identiques embarquées. JSON v3, centimes entiers, dates Europe/Paris, révisions/propriétaire, aucun double débit.
- **Production active `dpl_GkcCqU5PwryuaBr3pywqJ3vmvErM` READY** : CLAIR conservé à `ef2558c` (HTML SHA1 `c52115e744a78bf07e86b7d805ad93a8c3489dff`), Masterboard frontend `0cdda26` sur `/masterboard/`. Deux alias habituels, racine `/clair/`.

## Trois changements récents

1. **Publication autorisée par l’utilisateur le 12 novembre**, après validation de l’effet et de la forme : A Verre doux, profil lisible clair/sombre/photo, atlas original 16 illustrations et capsule liquide. Rayon circulaire de 30 px, marge de 8 px, ressort/grossissement/reflets et glissement au doigt, mouvement réduit. SW v40. Sources, preuves et fichiers : `VISUAL_DELIVERY.md`. PR30 ouverte vers `feat/clair-express`, aucune fusion dans main.
2. **Masterboard A publié**, PR31 (`feat/masterboard-verre-doux`). Après demande de déployer et validation du correctif préparé : logo SVG manuscrit lumineux, accueil Manrope OFL, aucune photo, toucher/Échap/mouvement réduit, barre liquide conservée. Frontend `0cdda26`, CI164 verte ; paquet67,53 anciens fichiers identiques. Service `clair-masterboard` v4 ACTIVE : origine Vercel exacte + lien CLAIR ; auth/gardes préservées. CORS live204/refus401-403, tests serveur verts ;66 fichiers publics et accueil390/1440 vérifiés. Preuves et captures : `MASTERBOARD_DESIGN.md`. Historique partagé sans photos depuis `46e2e9c` ; ne jamais pousser les anciens commits photo locaux.
3. Express, huit devises et conversion InforEuro novembre 2026 v2 conservés. Moteur/auth/cloud/récupération identiques à `dd7c852` ; aucune migration de base pendant cette livraison. Migrations v2/rappels v3 déjà appliqués : ne pas les rejouer. Banque abandonnée, aucun import/rapprochement à développer.

## Limites et reprise

Aucun Safari/iPhone physique, compte réel ou notification reçue testé. Indexation Google non confirmée ; audits 3/5 non approuvés. Aide/récupération : restriction d’origine connue, fichiers/SDK présents et inchangés.

Retour frontend : `dpl_9uaKUPU5YM3eiPTEitqidJ7hb2ts` (CLAIR identique, sans Masterboard Vercel). `main` reste ancien `dc376fb` ; fusion précédemment refusée faute d’accord distinct : ne pas contourner. Publication Masterboard effectuée ; ne pas rejouer le correctif du service. Préserver la production CLAIR. Nouvelle publication, fusion main ou modification Supabase : suivre les instructions/accords de la session. Maquettes et budgets fictifs uniquement dans les aperçus ; ne pas publier le paquet de démo en production.
