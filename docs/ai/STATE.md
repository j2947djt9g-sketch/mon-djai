# Clair — état court de reprise

Mis à jour le 11 novembre 2026. Production Vercel : source `dd7c852` (correctif conversion). Vérifier branche, statut et dernier commit avant de reprendre.

## Repères stables

- **Publication CLAIR : Vercel uniquement**, https://clair-budget.vercel.app/ → `/clair/`, projet `clair-budget`. Paquet manuel, sans publication automatique depuis GitHub : `DEPLOYMENT.md`.
- Cible : `clair/index.html` ; l’index racine appartient à une autre application. HTML/CSS/JS statiques, SDK Supabase embarqué, sources sous `clair/accounts/`.
- JSON v3, centimes entiers, dates Europe/Paris, stockage/révisions par propriétaire. Lire `MAP.md` par tâche, maintenir les copies embarquées et éviter les archives volumineuses.

## Trois changements récents

1. Les huit devises sont convertibles : référence officielle InforEuro novembre 2026, politique `inforeuro-2026-11`. Source/période affichées ; date et politique figées entre aperçu/confirmation. RPC v2 et calcul entier exact ; anciens helpers/taux inchangés. Les écritures existantes ne sont converties qu’après confirmation. Contrats : `EXCHANGE.md`.
2. Migration `clair_reference_exchange_v2_2026_11` appliquée après accord explicite de l’utilisateur (l’ancien refus automatique est levé pour cette action). RLS/gardes/anciens RPC vérifiés inchangés. Express, raccourcis, catégories, huit codes natifs et suggestion régionale modifiable restent publiés. Rappels v3 actifs, origines Vercel/GitHub autorisées.
3. PR29 ouverte sur `feat/clair-express`. La fusion `main` a été refusée par le contrôle automatique, jugée distincte de l’accord de publication. Ne pas contourner ce refus. `main` reste `dc376fb` et ne contient pas la production ; publier depuis la branche validée.

## Vérifications et limites

- Code `dd7c852` : 33 suites Node, 64 vecteurs v2 + 16 hérités JS/SQL, 32 parcours navigateur (229 conversions), Semgrep verts ; workflow `43068736763`. Base réelle : 64 calculs purs exacts, droits et empreintes des fonctions héritées contrôlés ; aucun budget réel écrit pour tester.
- Production READY : `dpl_BcrZig2Kb3zVyuegxXPLN9Qbj8TU`, HTML Git `6cf9fb3c1c2e7a80417c6f35b29d36432b837ae8`. Racine 307 et 47 ressources publiques identiques. Vérification publique EUR→MAD→EUR→CAD, GBP/CHF→MAD, choix actifs et aperçu appliqué ; transport Supabase fictif.
- Pas d’iPhone/Safari physique, de conversion d’un vrai compte ou de notification reçue testés. Aide/récupération : restriction d’origine déjà connue. Indexation Google non confirmée ; audits 3/5 non approuvés.
- Banque : volet abandonné ; aucune connexion, aucun import ni rapprochement à développer.

## Reprise

Continuer sur `feat/clair-express`. V2 est publiée et autorisée : ne pas répéter la demande. Ne pas rejouer `exchange.sql` (ancienne garde à quatre devises) ni les fixtures SQL en production. Toute publication CLAIR se fait sur Vercel.
