# CLAIR Conseils — publication du 16 novembre 2026

CLAIR Conseils est publié après la demande de déploiement puis l’accord explicite pour la protection Supabase. Production : https://clair-budget.vercel.app/clair/ . Source runtime `21dc507b855da9b93eda32198a4b23d519497e09`, branche `release/clair-conseils-20261116`, SW42. Aucun merge dans main ; PR37 reste en brouillon.

## Supabase

La première tentative a été refusée par le contrôle automatique, qui exigeait un accord distinct. Après cet accord, une confirmation technique expirée a nécessité une seule relance du même outil. Migration `clair_advice_schema_compatibility`, version `20261116141125`, appliquée avec succès au projet existant `hkssnbvktfscizojhftl` (PostgreSQL17.11).

La source est exactement `clair/accounts/advice-compatibility.sql`, SHA256 `4327897163f01066abed8eecc7bc2867ecc0eeba2061c5aea35facca49aa2048`, sans les seuls BEGIN/COMMIT externes gérés par l’outil. Aucune réécriture de données existantes. Les 23 fonctions et trois gardes antérieures, politiques, privilèges de table et RLS sont inchangés. La nouvelle fonction est invoker, search_path vide, sans EXECUTE direct pour anon/authenticated ; son corps en base correspond exactement à la source revue. Les avis de sécurité existants sont inchangés, aucun nouveau constat après ajout.

Ne pas réappliquer cette migration ni les anciennes migrations. Conserver la garde lors d’un éventuel retour frontend : les anciens clients doivent être mis à jour pour modifier les budgets marqués, afin de ne pas effacer leurs annotations.

## Vercel

- Projet `clair-budget`, `prj_LQXscKEX44lvgBR4O8Fru9RVWjKE`, équipe `team_6GfJ1WkSTn5lXj3kWsLF9FeN`.
- Déploiement de production `dpl_Bmr6F84cTKNcHrbJyntLFgvdh86r`, état READY, aucun aliasError. Construction statique environ2,1s.
- Deux alias habituels confirmés : `clair-budget.vercel.app` et `clair-budget-diabagateouattara601-7626.vercel.app`.
- Paquet commité : 82 fichiers exacts, dont configuration consommée par Vercel et81 fichiers publics. Masterboard, fontes/licences et redirection racine préservés ; aucune fixture dans le paquet.
- HTML723132octets ; SHA256 `2d42901fdb723d3160fa05d489b1ab32157aca5a632a64d6359de1541877af36`, empreinte Git `6b63755d7fead0dcace7697405447b3548a7367d`.

La release diffère de la feature17270e9 uniquement par SW42, son test d’éviction du cache41, la formulation « atteint au moins20% » alignée sur le seuil existant, et l’index généré. Aucun seuil ou calcul modifié. La CI175 de la feature est entièrement verte ; ce petit delta a ses tests ciblés et son QA de publication, sans prétendre à une nouvelle CI complète sur21dc507.

## Preuves exécutées

- Source/build/mirrors, tests service-worker et11 règles de conseil réussis ; paquet reconstruit et vérifié exclusivement depuis Git.
- Téléchargement du paquet inspecté et PWA HTTP contrôlant une recharge hors ligne réussis. Le file:// strict de la feature a réussi dans CI175 ; la politique Chromium locale continue de l’interdire, sans contournement.
- `verify-live.mjs` compare toutes les ressources publiques réellement servies au paquet21dc507 : succès, racine307 vers `/clair/`.
- Second contrôle indépendant :81 URL HTTPS, octets/tailles/SHA256 exacts ; quatre parcours390/1440px, clair/sombre, à partir des octets publics intacts.
- Totaux fictifs1050/777/273/80€, annotation45€ conservant tous les montants et repère140€ enregistré sans nouvelle transaction ; navigation persistante et Express0,50€ en double soumission donnant une seule dépense. Aucune erreur JS/console ou requête inattendue.
- Aucun groupe error/fatal retourné par les logs Vercel du déploiement sur15min. App statique : ce contrôle ne prouve pas l’absence d’erreurs navigateur ou Supabase. Aucun drain configuré, aucune nouvelle observabilité activée.

Les sessions, données et transports Auth/CAS des parcours navigateur sont fictifs. Aucun compte réel ouvert, e-mail envoyé ou budget réel écrit pour ces tests. Ils prouvent le comportement de l’application publiée avec ce transport, pas une synchronisation hébergée de compte réel. Safari et installation iPhone physiques restent non testés.

Les conseils sont des constats déterministes tirés des opérations enregistrées. Historique incomplet, remboursements non reliés et périodes non vérifiées limitent les comparaisons ; aucun prix local, cause d’achat ou gain futur n’est inventé. Les objectifs restent facultatifs et les mouvements d’épargne distincts du résultat. Aucune API payante ni banque connectée.

## Reprise

Preuves de travail : `/workspace/clair-conseils-work/release-20261116/`, notamment `supabase-verification.json`, `vercel-production-state.json`, `live-bytes.log`, `production/report.json`, captures et `RELEASE.json`. Le candidat figé est `candidate-21dc507` ; les commits documentaires ultérieurs ne constituent pas de nouveaux déploiements.

Production précédente disponible pour diagnostic : `dpl_2B8b56bmoFtVcycXSSuUHg3ktpyd` (ef5c75d/SW41, même Masterboard). Un retour à un ancien client peut bloquer les écritures des budgets marqués ; préférer un correctif frontend conservant le contexte. Ne pas désactiver la garde pour faciliter un retour, et ne pas revenir en arrière sans accord de publication.
