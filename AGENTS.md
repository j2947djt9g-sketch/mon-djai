# Travailler sur Clair avec un contexte court

Ces repères concernent l’application `clair/` du dépôt `mon-djai`. Les autres applications du dépôt ont leur propre périmètre.

## Démarrage

1. Lire ce fichier puis `docs/ai/STATE.md` ; vérifier `git status --short` et `git log -1 --oneline`.
2. Choisir la ligne utile de `docs/ai/MAP.md`, puis lire seulement le module ou la fonction concernée. Le protocole détaillé est dans `docs/ai/PLAN.md`, à consulter au besoin.
3. Pour publier, lire uniquement `docs/ai/DEPLOYMENT.md` et vérifier les cibles actuelles.

## Éviter les relectures coûteuses

- Ne pas charger entièrement `clair/index.html`, `clair/docs/SOURCES.md`, les SDK vendoriés, les archives ou les anciens plans par défaut.
- Utiliser `rg --files`, puis `rg -n --max-columns 180 --max-columns-preview 'nomDeFonction' chemin` et des extraits ciblés. Un résultat tronqué sert à trouver une position ; il ne suffit pas pour modifier la fonction.
- Les fichiers actuels et leur diff font foi. Les anciens documents sont des références datées, pas un état courant à importer en entier.
- Ne pas recopier les sources, les journaux complets ou l’historique de conversation dans un résumé ou une mission de sous-agent.

## Changer et vérifier

- Conserver les montants, le JSON v3, l’absence de doubles débits et l’isolation des comptes. Lire le moteur ou les contrats concernés avant de les modifier.
- Quand un module de `clair/accounts/` est embarqué dans `clair/index.html`, modifier les deux copies et vérifier leur correspondance. Certaines fonctions existent seulement dans le HTML : voir la carte.
- Exécuter les contrôles pertinents pour le changement. Ne pas relancer un audit ou des tests déjà verts sur le même code sans raison nouvelle. Une modification de documentation seule ne demande pas les parcours navigateur complets.
- Respecter la demande et les accords déjà donnés. Une proposition d’audit non approuvée reste une proposition ; ne pas redemander une validation déjà acquise pour le même périmètre.

## Avant de terminer ou de changer de session

Actualiser brièvement `docs/ai/STATE.md` : travail terminé/en cours, fichiers, décision, preuve de vérification et prochaine action. Garder au plus trois changements récents ; renvoyer aux commits/PR pour le détail. Ne jamais y mettre de secrets, sessions ou données personnelles.
