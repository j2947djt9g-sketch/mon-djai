# CLAIR Conseils — vérification du candidat

16 novembre 2026, branche `feat/clair-conseils`, base de conception `cbd9729`. Contrat et procédure dans [CLAIR_CONSEILS.md](CLAIR_CONSEILS.md). Aucune application SQL hébergée, donnée réelle, fusion main ou publication de production.

## Vérifications exécutées

| Contrôle | Résultat observé |
|---|---|
| `node --test clair/accounts/test-*.cjs` | 53 fichiers réussis, aucun échec, après le dernier correctif du moteur. |
| Paquet `fe52aba` | 82 fichiers exacts vérifiés depuis Git ; téléchargement inspecté, HTTP et workers PWA contrôlant une recharge hors ligne réussis. Ouverture réelle file:// explicitement non prouvée. |
| Génération, contrôle en lecture seule et miroirs | Réussis ; cinq scripts/sept conteneurs et toutes les nouvelles sources déclarés. |
| Tests outillage `build.test.mjs`, `package.test.mjs`, `live.test.mjs` | 7 tests réussis. Le contrôle live utilise son serveur HTTP local, pas la production. |
| `verify-monthly-advice.cjs` | Contrôleur réel + modules métier : chiffres, périodes, contexte, objectifs, erreurs, propriétaire, unicité de l’éditeur et focus clavier ; 320/390/768/1440, clair/sombre/auto et réduction des animations. |
| `verify-advice-app.cjs` | Application générée : totaux exacts, stockage local et échec quota, ACK, objectifs, profil/ressource, navigation persistante, propriétaire et vrai dialogue de conversion locale avec remboursement lié. |
| `verify-advice-sync.cjs` | SDK officiel et transport intercepté : modification hors ligne + double validation → un seul CAS ; réponse perdue après sauvegarde → révision inchangée à la reprise ; changement de compte → brouillon purgé et formulaire détaché ignoré. |
| Parcours existants | Express : 9 cas, dont huit devises et PWA simulée ; conversion : 32 cas ; profil : 16 cas ; parcours application/épargne : 4 cas. Réussis. Navigation aux quatre largeurs et cycle de vie/ACK/écouteurs réussis. |
| `verify-advice-sql.cjs` | PostgreSQL17.6 jetable local, sortie0 : marqueur, validation, projections mensuelles, huit devises, arrondis de remboursements, deux propriétaires/RLS/CAS/idempotence et gardes existantes. |

Les montants de contrôle sont fictifs : revenus105000, dépenses77700, résultat27300 et épargne8000 centimes. L’alimentation passe de14000 à18500. Marquer4500 comme ponctuels conserve tous les totaux. Enregistrer un repère14000 pour le mois suivant n’ajoute aucune opération financière. Les autres tests couvrent historique absent/zéro/partiel/futur, remboursements, virements/ajustements et objectifs non probants.

## Défauts reproduits puis corrigés

- Une dépense annotée déplacée vers l’épargne et une origine reclassée en virement pouvaient bloquer une édition normale : nettoyage du contexte incompatible et invalidation ciblée.
- Plusieurs remboursements convertis séparément pouvaient dépasser leur origine par arrondi : mêmes montants financiers, liens du groupe retirés et qualité signalée.
- Une preuve d’objectif périmée pouvait redevenir numériquement égale après conversion : suppression de cette preuve ; les preuves valides reprennent la limite canonique convertie.
- Le parcours de conversion **locale via commit**, distinct de l’appel direct au convertisseur, effaçait des liens et périodes valides : comparaison au même moteur de conversion, en préservant la détection d’éditions supplémentaires et du rattrapage automatique.
- Les échéances automatiques d’épargne non confirmées n’étaient pas signalées : contrôle commun avant la séparation des flux.
- Les actions remplaçant le contenu perdaient le focus clavier ; deux listes pouvaient afficher deux éditeurs contradictoires : focus sémantique avec portée et éditeur unique.

Ces corrections ont des reproductions en échec avant correction puis des assertions réussies. Les revues métier et interface ont approuvé leurs corrections. La revue globale initiale a demandé le correctif de conversion locale ; la relecture indépendante du correctif a ensuite approuvé le candidat, sans anomalie restante dans son périmètre.

## Captures et preuves

Le contrôle applicatif produit les captures avec `CLAIR_ADVICE_SHOTS`. Les captures avant proviennent de l’index du commit `cbd9729`, avec le même registre fictif. Fichiers de travail : `/workspace/clair-conseils-work/implementation/screenshots/{before,conseils}-{light,dark}-390.png`. Journaux et revues indépendantes sont conservés dans le même répertoire de travail, hors paquet public. Les scripts de vérification et les contrats nécessaires à leur reproduction sont versionnés dans la branche.

## Limites et publication

Les tests de réseau utilisent un transport simulé ; PostgreSQL est local. Ils ne prouvent aucune écriture/synchronisation sur le Supabase hébergé. Aucun compte réel n’a été ouvert. Safari et l’installation sur iPhone physique ne sont pas testés. La politique Chromium locale interdit l’ouverture réelle `file://` ; les assertions VM ne remplacent pas cette preuve. Les ressources documentaires sont facultatives et actuellement limitées au guide français déclaré, sans prix local, évaluation d’aide, connexion bancaire ni service d’IA payant.

La garde SQL reste **préparée uniquement**. Son application au projet existant doit être approuvée séparément, avant une future publication du client. La fusion et le déploiement de production restent également non autorisés. Les procédures et le paquet de livraison ne constituent pas une autorisation de publier.

Livraison : commit runtime `fe52aba94f1d1f30b46a281c26f2534472faf068`, [PR37 en brouillon](https://github.com/j2947djt9g-sketch/mon-djai/pull/37). CI distante en cours à la rédaction ; ses résultats ne sont pas assimilés aux vérifications locales ci-dessus. Aucun aperçu Vercel n’a été déployé pour cette fonctionnalité.
