# CLAIR Conseils — maquette interactive, pas une fonctionnalité livrée

Ouvrir `index.html` dans un navigateur ou servir ce seul dossier avec un serveur statique local. Ce prototype est conservé dans la documentation et exclu du paquet de production CLAIR. Une copie de travail existe hors dépôt dans `/workspace/clair-conseils-work/prototype/`. Aucune API, authentification, connexion bancaire, transaction réelle, Supabase ou stockage local n’est utilisé. Les choix sont gardés seulement en mémoire, jusqu’au rechargement.

## À explorer

1. **A Compact** présente le bilan et ses conseils sur une même page. **B Plus aéré** les répartit en deux colonnes sur grand écran, avec deux vues locales Bilan/Conseils sur tablette et mobile.
2. Dans le conseil alimentation, **Voir le conseil** déplie le graphique140→185 et l’écart45€. **Comprendre ma hausse** affiche les six opérations fictives, total185€.
3. Cocher **Cet achat de45€ est ponctuel** ajoute du contexte uniquement. Les185€ d’alimentation,777€ de dépenses,273€ de solde du mois et80€ d’épargne restent inchangés. Décocher annule ce marquage.
4. **Préparer novembre** affiche un objectif facultatif. Si les45€ sont explicitement marqués et les périodes comparables,140€ est un point de départ personnel expliqué, pas une estimation des besoins futurs. Sinon le champ reste libre. **Garder185€** est un choix explicite de l’utilisateur. **Tester ce repère** n’enregistre rien et ne change aucun chiffre du bilan.
5. Le bouton de thème affiche le mode sombre. **Scénario** ouvre les états mois clôturé, mois en cours et historique manquant ; aucun écart mensuel trompeur n’est affiché pour les deux derniers. Réinitialiser restaure octobre.
6. Le sélecteur de mois donne aussi un aperçu de septembre : seul le montant alimentation140€ est connu, les autres totaux sont non renseignés, jamais supposés nuls.
7. **Un repère pour préparer ton mois** expose la source documentaire, sa date/portée et le repère facultatif Angers. Retirer Angers n’affecte aucun calcul. Le guide externe ne s’ouvre que sur clic et ne reçoit aucune transaction dans son URL.

## Données fictives du scénario complet d’octobre2026

- Revenus hors épargne1050€, dépenses hors épargne777€ ; solde mensuel273€ avant mouvements d’épargne.
- Dépenses : logement460€, alimentation185€, transport7€, autres125€.
- Alimentation :32+28+18+24+38+45=185€. Septembre140€, écart45€ (+32,1%). Aucun achat n’est marqué à l’ouverture.
- Épargne identifiée :100€ de versements−20€ de retraits=80€, distincte des273€ de solde mensuel.
- Le7€ de transport est une dépense personnelle fictive, pas un prix ou tarif d’Angers.

Le prototype réutilise le logo, une mascottePNG et l’atlas de catégories présents dans CLAIR, sans emojis. Il utilise une typographie système Apple/SF Pro avec fallbacks. CSS et interactions sont circonscrits à `#clair-conseils-prototype`. `#prototype-scroll` est la zone de défilement interne ; la capsule reste visible en bas du composant. Les autres entrées de navigation affichent un message de périmètre et ne simulent pas des fonctions absentes.

Adaptation prévue : mobile390px, tablette768px, ordinateur1440px ; clavier, focus et réduction des animations. Validation des maquettes : 8 cas A/B en320/390/768/1440px réussis dans Chromium ; thème sombre, clavier, réduction des animations et invariants de montants vérifiés. Aucune erreur JS/console ni requête API/externe retournée. Ces résultats concernent exclusivement les données EUR fictives ; ils ne prouvent pas un moteur financier produit ou Safari physique. Preuves de travail : `/workspace/clair-conseils-work/qa/report.json`. La syntaxe JavaScript peut être contrôlée avec `node --check app.js`.
