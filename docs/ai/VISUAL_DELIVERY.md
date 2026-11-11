# CLAIR — illustrations et propositions de navigation/profil

Travail du 11 novembre 2026 sur `feat/clair-category-illustrations`, base `bb8d9f1` de `feat/clair-express`. Ne pas repartir de `main` (ancien produit). Aucune publication de production ni modification Supabase autorisée pour cette mission.

## Réalisé

- Atlas original WebP transparent 768×768, 16 illustrations cohérentes, environ 161 Kio et une ressource partagée. Provenance dans `clair/assets/categories/README.md`.
- `category-art.js/.css` : résolution visuelle sans modifier les identifiants/intitulés, catégories personnelles reconnues par leur libellé, pictogramme vectoriel de secours, un préchargement. Sélecteur progressif accessible, navigation clavier, FormData et changement natif conservés. Aucun appel au moteur d’écriture.
- Illustrations dans les dépenses/dépôts, Express facultatif, filtres/historique, activité récente, habitudes/paiements à venir, enveloppes et analyse des petites dépenses. Les icônes personnalisées des projets d’épargne restent distinctes.
- Copies canoniques identiques dans `clair/index.html`. SW v40 : atlas mis en cache sans bloquer l’installation si absent.
- `clair/design-preview/` : vraies maquettes interactives A Verre doux, B Express, C Contraste. Accueil/profil, navigation flottante, boutons/effets de toucher, Express fictif, raccourcis du profil. Données Alex/example.com uniquement ; aucune sauvegarde, authentification ou connexion serveur. Galeries et captures avant/après incluses.

## Décision en attente

**La navigation et le profil de l’application n’ont pas été remplacés.** L’utilisateur doit valider A/B/C (ou une combinaison). Le défaut existant du profil photo/clair est reproduit dans les captures : `body[data-wall=photo] .card` écrase le fond violet mais laisse le texte blanc ; `overflow-wrap:anywhere` fragmente MAD dans les statistiques. Les propositions corrigent leur présentation, pas encore la version publique.

## Vérifications

- 34 suites Node vertes, dont contrats des catégories, Express, monnaies, synchronisation, profil et SW.
- Nouveau `verify-category-art.cjs` : trois vues/contrastes et invariance JSON, sélecteur au clavier, libellés/FormData/change/reset, pas de soumission involontaire, mode sombre, mouvement réduit, images/CSS/JS indisponibles, 22 saisies Express exactes sur huit devises.
- `verify-express.cjs` : neuf configurations, huit devises, iPhone 320/390 et standalone simulé, déconnexion/reconnexion et double soumission, corrections et provenance.
- `verify-journal.cjs` : quatre tailles 320/390/768/1440, filtres, catégories personnelles, dépôts/corrections/rechargement ; `verify-fluidity.cjs` : quatre configurations EUR/USD/XOF/XAF. Tests mis à jour pour utiliser le sélecteur visible. `verify-currency.cjs` conserve les parcours de configuration/région sur huit devises avec le nouveau contrôle illustré.
- `verify-design-preview.cjs` : douze vues A/B/C, accueil/profil, 320/390, cibles navigation ≥44px, Express fictif, aucun stockage ni appel externe. Syntaxe et `git diff --check` verts.
- Relecture indépendante UI/qualité/sécurité : aucun défaut bloquant ou important restant. Moteur et synchronisation embarqués identiques à la base, catégories et montants conservés.

Corrections issues des revues : chemin de l’atlas dans la CSS externe, boucle de l’observateur sans CSS, retour du sélecteur après reset, compatibilité DOM minimale des tests et destination portable des captures CI. Le paquet de prévisualisation exclut aide/récupération et bloque toutes les connexions/formulaires/workers par CSP.

## Limites et livraison

Chromium simulant des dimensions iPhone ; aucun Safari/iPhone physique testé. Le clic sur un label externe du filtre ne transfère pas encore le focus au sélecteur personnalisé (le résumé est nommé et utilisable au clavier). Les maquettes sont en mode clair ; le composant réel des catégories est vérifié aussi en sombre. Aucun test bancaire : volet abandonné.

Aperçu **READY**, cible preview (aucun alias de production) : https://clair-budget-l7fl0ssie-diabagateouattara601-7626.vercel.app/ . Déploiement `dpl_97683BbMXYaRzcTwtziiz4emJyah`, source applicative `968aed2` (budget fictif/configuration sans backend ajoutés seulement au paquet d’aperçu).

PR brouillon : https://github.com/j2947djt9g-sketch/mon-djai/pull/30 ; fichiers modifiés : https://github.com/j2947djt9g-sketch/mon-djai/pull/30/files . Agents mobilisés : audit UI, composant frontend, maquettes, styles, qualité et sécurité ; coordination/illustrations/livraison par l’agent principal.

Vérification publique : racine redirigée vers la galerie, 30 ressources publiques conformes aux empreintes du paquet ; CSP/robots vérifiés, aide/récupération/SW absents. Galerie desktop/mobile et trois profils vérifiés sur les ressources Vercel via transport HTTPS Node de confiance avec contrôle des empreintes. Le script de feedback ajouté par Vercel aux aperçus est bloqué par la CSP ; il est identifié séparément pour comparer le HTML applicatif. Empreinte de production inchangée avant/après : `81dd1f98c12b10a33a0411e84755bf8d075acb21`.

La première CI a réussi Node, les nouvelles suites, journal/fluidité/Express et les deux jobs SQL isolés, puis a rencontré l’ancien test de devise qui utilisait le select natif masqué. `verify-currency.cjs` utilise maintenant le sélecteur visible ; 37 parcours locaux du test de devise corrigé passent ; nouvelle CI à suivre. Aucun correctif financier ni changement applicatif supplémentaire. Ne pas fusionner dans main ni publier la production. La confirmation du style et l’accord de publication sont les prochaines décisions utilisateur.
