# Historique par catégorie

L'utilisateur a validé le classement par catégorie et son déploiement après la proposition du 5 novembre. Conserver les cartes et les couleurs actuelles de CLAIR.

- Afficher un sélecteur Catégorie, utilisable avec le mois, la recherche, le sens et l'origine des opérations. Conserver les choix pendant la navigation.
- Résumer les opérations affichées : catégorie, mois, nombre, argent reçu et dépensé. Présenter les mouvements d'épargne séparément pour ne pas les compter comme des achats ou des revenus.
- Permettre d'effacer les filtres et de créer une catégorie personnelle. Utiliser le champ customCategories existant et les mécanismes de sauvegarde actuels.
- Respecter la catégorie choisie pour les dépôts et les corrections ; conserver les anciens revenus sans catégorie sans les reclasser automatiquement.
- Ne pas répartir un dépôt entre des enveloppes dans cette livraison. Aucun changement de base de données, de solde ou d'authentification.

## Approches

Le filtre et le résumé dans l'historique ont été recommandés et acceptés. La répartition des dépôts ajouterait une gestion de budgets distincte ; elle est différée. Un simple filtre caché dans les options serait moins facile à découvrir ; le sélecteur reste visible.

## Vérification

Filtres combinés, épargne, catégories personnelles, dépôts, correction et sauvegarde, absence de résultat, noms échappés, devises, thèmes et affichage mobile. Déployer après les tests et une revue du changement.
