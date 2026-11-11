# Clair — repères de publication, à lire seulement pour déployer

**Cible de production CLAIR : Vercel**, projet `clair-budget`. État vérifié le 11 novembre 2026, produit `dd7c852`.

| Élément | Valeur |
|---|---|
| Dépôt / source publiée | `j2947djt9g-sketch/mon-djai`, `feat/clair-express`, commit `dd7c852` |
| Adresse publique | https://clair-budget.vercel.app/ |
| Application servie | `/clair/` |
| Projet Vercel | `clair-budget`, `prj_LQXscKEX44lvgBR4O8Fru9RVWjKE` |
| Équipe Vercel | `team_6GfJ1WkSTn5lXj3kWsLF9FeN` |
| Dernière production vérifiée | `dpl_BcrZig2Kb3zVyuegxXPLN9Qbj8TU` |
| Empreinte Git du HTML publié | `6cf9fb3c1c2e7a80417c6f35b29d36432b837ae8` |

La PR29 reste ouverte : fusion dans `main` refusée par le contrôle automatique faute d’un accord jugé distinct. `main` reste `dc376fb` et ne représente pas le produit publié. Ne pas republier cet ancien code. Déploiement précédent de retour : `dpl_BFsXnKrXBdAGdiGt7JkbVWvr8EcH`.

Le projet n’est pas relié automatiquement à GitHub. Une fusion seule ne publie donc pas Vercel. Vérifier ce réglage et la cible avant toute publication ; les identifiants ci-dessus évitent de redécouvrir les projets, mais ne prouvent pas leur état actuel.

## Paquet statique existant

- Conserver les chemins `clair/*` : fichiers `.html`, `.js`, `.css`, `.webmanifest`, `.svg`, `.png`, `.webp`, `.json`, hors `clair/docs/`. Exclure tests `.cjs` et SQL.
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
