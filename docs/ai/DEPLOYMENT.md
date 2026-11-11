# Clair — repères de publication, à lire seulement pour déployer

**Cible de production CLAIR : Vercel**, projet `clair-budget`. État vérifié le 11 novembre 2026, produit `bb116bb`.

| Élément | Valeur |
|---|---|
| Dépôt / source publiée | `j2947djt9g-sketch/mon-djai`, `feat/clair-express`, commit `bb116bb` |
| Adresse publique | https://clair-budget.vercel.app/ |
| Application servie | `/clair/` |
| Projet Vercel | `clair-budget`, `prj_LQXscKEX44lvgBR4O8Fru9RVWjKE` |
| Équipe Vercel | `team_6GfJ1WkSTn5lXj3kWsLF9FeN` |
| Dernière production vérifiée | `dpl_BFsXnKrXBdAGdiGt7JkbVWvr8EcH` |
| Empreinte Git du HTML publié | `ef0314a4f9cbe57d9aa092a3219d249130ecd360` |

La PR29 reste ouverte : fusion dans `main` refusée par le contrôle automatique faute d’un accord jugé distinct. `main` reste `dc376fb` et ne représente pas le produit publié. Ne pas republier cet ancien code. Ancien déploiement de retour : `dpl_HyxJvHu2VNevkm8YeNXD2Et1DyCG`.

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

## Livraison Express vérifiée

Production READY avec les deux alias attendus, racine 307 vers `/clair/`, HTML et 46 ressources publiques identiques au paquet vérifié. Migration Supabase `clair_express_schema_and_native_currencies` appliquée, RLS et gardes conservées ; rappels `clair-reminders` v3 actifs et préflight Vercel 204. Parcours publics Express et région testés avec transport Supabase fictif ; aucun compte réel ni notification physique validé. Le volet bancaire est abandonné.
