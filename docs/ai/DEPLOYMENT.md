# Clair — repères de publication, à lire seulement pour déployer

**Cible de production CLAIR : Vercel**, projet `clair-budget`. État vérifié le 12 novembre 2026, produit `ef2558c`.

| Élément | Valeur |
|---|---|
| Dépôt / source publiée | `j2947djt9g-sketch/mon-djai`, `feat/clair-category-illustrations`, commit `ef2558c` |
| Adresse publique | https://clair-budget.vercel.app/ |
| Application servie | `/clair/` |
| Projet Vercel | `clair-budget`, `prj_LQXscKEX44lvgBR4O8Fru9RVWjKE` |
| Équipe Vercel | `team_6GfJ1WkSTn5lXj3kWsLF9FeN` |
| Dernière production vérifiée | `dpl_9uaKUPU5YM3eiPTEitqidJ7hb2ts` |
| Empreinte Git du HTML publié | `d65d99b795a97f78bec720c4d4f877ad761b6b42` |

La PR29 reste ouverte : fusion dans `main` refusée par le contrôle automatique faute d’un accord jugé distinct. `main` reste `dc376fb` et ne représente pas le produit publié. Ne pas republier cet ancien code. Retour disponible : `dd7c852`, `dpl_BcrZig2Kb3zVyuegxXPLN9Qbj8TU`. PR30 reste ouverte ; cette publication autorisée ne fusionne aucune branche.

Le projet n’est pas relié automatiquement à GitHub. Une fusion seule ne publie donc pas Vercel. Vérifier ce réglage et la cible avant toute publication ; les identifiants ci-dessus évitent de redécouvrir les projets, mais ne prouvent pas leur état actuel.

## Paquet statique existant

- Conserver les chemins `clair/*` : fichiers `.html`, `.js`, `.css`, `.webmanifest`, `.svg`, `.png`, `.webp`, `.json`, hors `clair/docs/` et `clair/design-preview/` (maquettes). Exclure tests `.cjs` et SQL.
- Ajouter **`masterboard/supabase-2.102.0.js`** : les pages `clair/help.html` et `clair/reset.html` en dépendent.
- Ajouter **`robots.txt`** et **`sitemap.xml`** à la racine.
- Ajouter au paquet un `vercel.json` avec la redirection `/` vers `/clair/` ; cette configuration de publication n’est actuellement pas versionnée dans le dépôt.
- Ne pas servir l’`index.html` historique de la racine à la place de Clair. Les notes `docs/ai/` et `AGENTS.md` ne font pas partie du paquet public de l’application.

Réglages utilisés : projet statique, aucun framework, commandes d’installation et construction vides, sortie `.`. Les déploiements passent par les outils Vercel authentifiés ; ne pas créer de nouvelle intégration ou réclamer de jeton sans besoin établi.

## Vérifications après publication

Confirmer READY, cible production et domaine public. Tester `/` → `/clair/`, comparer le HTML servi à l’empreinte du fichier prévu, puis vérifier les ressources et fichiers racine touchés. Aucun succès d’indexation Google, de connexion réelle, d’e-mail ou de notification ne se déduit d’un simple HTTP 200.

La dernière publication a utilisé une création de déploiement de production à partir des fichiers vérifiés : la promotion d’un aperçu avait renvoyé 422. Ne pas répéter cette tentative sans nouvelle raison. Le partage est volontairement une adresse publique fixe, sans paramètres de compte.

## Livraison Express initiale vérifiée (`bb116bb`)

Production READY avec les deux alias attendus, racine 307 vers `/clair/`, HTML et 46 ressources publiques identiques au paquet vérifié. Migration Supabase `clair_express_schema_and_native_currencies` appliquée, RLS et gardes conservées ; rappels `clair-reminders` v3 actifs et préflight Vercel 204. Parcours publics Express et région testés avec transport Supabase fictif ; aucun compte réel ni notification physique validé. Le volet bancaire est abandonné.

## Correctif de conversion vérifié

La migration additive `clair_reference_exchange_v2_2026_11` est appliquée après accord explicite. Elle ajoute trois fonctions v2 ; anciens taux/RPC, gardes et RLS vérifiés inchangés. 64 calculs purs exacts en base, route REST v2 résolue et refusée à un anonyme (401/42501), sans écriture de budget réel. Vercel source `dd7c852` READY, 48 fichiers de paquet dont 47 ressources publiques vérifiées. Empreinte brute HTML : `81dd1f98c12b10a33a0411e84755bf8d075acb21`. Les sélections et conversions EUR/MAD/CAD/GBP/CHF ont été testées sur les fichiers publics, transport Supabase fictif. Ne pas réappliquer la migration historique `exchange.sql` ; voir `EXCHANGE.md`.


## Refonte A et capsule liquide publiée (12 novembre 2026)

Après validation de la forme puis accord utilisateur, `ef2558c` est publié en production : `dpl_9uaKUPU5YM3eiPTEitqidJ7hb2ts`, READY, alias `clair-budget.vercel.app` et `clair-budget-diabagateouattara601-7626.vercel.app`. CI160 entièrement verte (`43216389904`). Paquet statique de 53 fichiers, dont 52 ressources publiques identiques aux sources et vérifiées par taille/SHA1 ; `/` redirige vers `/clair/`. HTML SHA1 brute `c52115e744a78bf07e86b7d805ad93a8c3489dff`.

Atlas, profil Verre doux et capsule liquide avec rayon de 30 px/marge de 8 px ; SW v40. Moteur et modules compte/cloud/récupération/devises inchangés. Aucune modification Supabase ni fusion dans main. Le paquet de production conserve la configuration réelle ; aucune injection de budget fictif, bannière ou CSP d’aperçu.

Parcours sur fichiers publics via HTTPS de confiance avec empreintes contrôlées : profil, grossissement/glissement et toucher ; Express EUR/MAD/XOF, confirmation, montant invalide, double soumission, hors connexion/reconnexion avec une seule dépense, correction/provenance. Sessions/budgets/transport Supabase fictifs uniquement dans les contextes de test ; aucun compte réel ni écriture backend. Limite Safari/iPhone physique inchangée. Détails : `VISUAL_DELIVERY.md` ; manifeste local `/workspace/clair-visual-work/production-manifest.json`.
