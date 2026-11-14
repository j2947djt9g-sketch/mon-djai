# Clair — ouvrir et maintenir l’application

La version publique est hébergée sur **Vercel** : https://clair-budget.vercel.app/clair/.
Clair est une application statique ; le dossier racine du dépôt contient une autre application.

## Utiliser Clair

Le mode local garde le budget dans ce navigateur. Le fichier HTML téléchargé fonctionne aussi en local. Exporter régulièrement le JSON depuis Réglages pour conserver une sauvegarde indépendante. Un changement d’adresse ou de navigateur ne transfère pas ces données automatiquement.

Le mode compte synchronisé utilise Supabase : inscription, confirmation par e-mail, puis transfert explicite du budget local. Le même compte permet de retrouver le budget sur un autre appareil. Les données financières et les préférences sont envoyées au service de synchronisation ; les photos de fond restent sur l’appareil. L’adresse e-mail et le mot de passe sont transmis au service d’authentification. Les rappels push nécessitent une autorisation et transmettent un abonnement au service de rappels. Voir [comptes et synchronisation](accounts/README.md) pour les conflits, la récupération et les limites.

Le solde est calculé à partir des saisies, pas fourni par une banque. Les échéances sont rattrapées à l’ouverture sans double déduction. Avant de remplacer une ancienne installation, exporter son budget, importer le JSON dans Clair et vérifier solde, historique et charges.

Installation : sur iPhone, Safari → Partager → Sur l’écran d’accueil ; sur Android/PC, utiliser l’installation proposée par le navigateur.

## Développer et vérifier

Node **24.22.1** a été constaté le 13 novembre 2026 ; `.nvmrc` et la CI fixent cette version. Un clone ne l’installe pas automatiquement. Aucun paquet global n’est nécessaire aux tests Node.

Depuis la racine du dépôt :

```sh
node --version
python3 -m http.server 8000
# Ouvrir http://localhost:8000/clair/ dans le navigateur.
```

L’ouverture par HTTP peut activer la configuration de compte ; pour le mode local autonome, ouvrir le HTML téléchargé. Ne pas utiliser de compte réel pour une vérification automatisée.

```sh
node tools/clair/build.mjs --check
node tools/clair/check-mirrors.mjs
node clair/accounts/test-mirrors.cjs
node clair/accounts/test-local.cjs
# Toutes les suites Node :
for test in clair/accounts/test-*.cjs; do node "$test" || exit; done
```

Modifier les sources canoniques, puis `node tools/clair/build.mjs --generate` et revoir le HTML généré versionné. Le markup/moteur/application encore inline résident dans `clair/app/index.template.html`. Voir [assemblage et paquet](../tools/clair/README.md) pour la livraison depuis un commit exact et les limites du test fichier.

Le contrôle des miroirs ne modifie rien et échoue si une copie manque, diffère, est dupliquée, déplacée ou si une source JS/CSS manque à l’inventaire. Le manifeste [mirrors.json](../tools/clair/mirrors.json) fixe les conteneurs et l’ordre des 26 copies ; trois exceptions sont externes. Il ne remplace pas les tests métier.

Les scripts `verify-*.cjs` utilisent Playwright **1.64.1**, déjà fixé dans la CI, avec Chromium/Chrome (`CLAIR_CHROME_PATH`). Le workflow [.github/workflows/clair-checks.yml](../.github/workflows/clair-checks.yml) décrit l’installation isolée et les contrôles SQL locaux. Les simulations Auth ne prouvent pas la réception d’un e-mail réel. Voir [contribution](../CONTRIBUTING.md) et [carte des modules](../docs/ai/MAP.md).

## Origine et historique

Base historique : `public/clair.html`, révision Lovable `2bf0524fe80750ceb995eb16bd6f11dd1ecc0b59`. Les adaptations initiales visaient GitHub Pages ; les notes datées de livraison restent dans `docs/ai/`. La cible publique actuelle est Vercel.
