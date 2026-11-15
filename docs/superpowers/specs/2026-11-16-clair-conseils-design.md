# CLAIR Conseils — proposition à examiner

Statut : audit et maquettes fictives uniquement, en attente de validation. La fonctionnalité n’est pas implémentée. Base inspectée : f323de4 ; branche `design/clair-conseils`. Aucun changement du produit, de Supabase ou de la production.

## Proposition recommandée

Enrichir « Mon bilan du mois », déjà accessible depuis l’accueil et le profil. Une même page permet de comprendre le mois, examiner un constat et choisir éventuellement un repère pour le mois suivant. Conserver les trois onglets de navigation, les illustrations et le verre doux. Aucun nouveau bouton d’accueil ni écran de chat obligatoire.

Afficher au plus trois conseils, et moins quand seuls un ou deux constats sont suffisamment étayés. Chaque conseil contient un montant vérifiable, une explication prudente et une action facultative. L’analyse personnelle fournit les calculs ; les références publiques fournissent un contexte facultatif. Le principe 80/20 n’est pas une formule ni une note financière.

Les améliorations proposées par rapport aux quatre écrans initiaux sont : réunir le conseil et les achats concernés dans un détail de la page, séparer clairement résultat et épargne, puis n’offrir un objectif chiffré que si son origine est explicable. Un achat marqué ponctuel reste intégralement compté dans les dépenses.

## Ce qui existe réellement

| Besoin | Réutilisation / limite confirmée |
|---|---|
| Accès et bilan | `accounts/dashboard-ui.js:14`, `profile-ui.js:68` ouvrent déjà `budget`. `app/index.template.html:701–702` rend les enveloppes, revenus et dépenses par catégorie. Enrichir cette page. |
| Épargne | Le bilan actuel affiche le stock cumulé des projets. Le profil calcule déjà les flux mensuels versements−retraits (`profile-ui.js:61–63`). Réutiliser cette sélection ; ne jamais assimiler revenus−dépenses à de l’épargne. |
| Transactions et règles | Moteur, dates Paris, montants entiers, catégories personnelles, journal et règles récurrentes existent. Les échéances automatiques non confirmées restent des dépenses enregistrées : cela ne prouve aucun paiement bancaire. |
| Objectifs | `budgets` et `budgetOverrides[YYYY-MM]` existent. Une cible globale modifiée n’a pas d’historique de version : ne pas lui attribuer rétroactivement une réussite ou un dépassement passé. |
| Nature et contexte | `domain/engine.js:500–518` ne distingue que income/expense et les mouvements d’épargne identifiés. Aucun type général remboursement/virement interne/achat exceptionnel ; un nouveau champ libre serait perdu à la normalisation. Les ajustements de solde sont aussi des entrées/sorties. Classification explicite compatible à concevoir avant recommandations qui en dépendent. |
| Mois comparables | Pas de preuve de complétude des saisies. Un mois absent ne vaut pas zéro. Pour un mois partiel, comparer la même période si les données le permettent, sinon suspendre le conseil de hausse. Ne pas inventer de précision. |
| Devises | Huit devises EUR/XOF/XAF/USD/GBP/MAD/CAD/CHF ; conversion globale de l’historique dans la devise actuelle. Ne pas reconstruire des taux ou montants d’origine par transaction inexistants. |
| Petites dépenses | Express et ses suggestions sont préservés. `express-insights.js:22–28` exclut les automatiques/charges fixes : son échantillon de 30 jours ne doit pas devenir le total mensuel. |
| Profil et pays | Pays/ville absents du profil actuel. Extension future facultative ; la région linguistique n’est pas une résidence. Aucun GPS ni pays déduit de la devise. |

Audit : sources uniquement, aucune transaction réelle lue. Notes détaillées dans `/workspace/clair-conseils-work/{domain-audit,ux-audit,financial-audit,references}.md`.

## Deux maquettes à comparer

**Bilan compact — recommandée.** Synthèse, répartition et conseils dans la même page. Le conseil alimentaire se déplie ; les achats puis le repère facultatif apparaissent dans son prolongement. Moins de navigation et lecture immédiate sur iPhone.

**Bilan et coach séparés.** Synthèse et coach en colonnes sur ordinateur ; vues locales Bilan/Conseils sur mobile. Lecture plus aérée, au prix d’une interaction supplémentaire. Les deux variantes partagent exactement les mêmes données et règles de présentation.

Ce sont des propositions, pas un choix déjà approuvé. Les [maquettes conservées dans la documentation](2026-11-16-clair-conseils-prototype/README.md), également disponibles hors dépôt pour la revue, n’enregistrent rien et ne communiquent avec aucun compte. Mode sombre et états incomplets sont explorables. Les contrôles de démonstration sont distincts de l’interface envisagée.

## Scénario et interactions

Le cas 140 → 185 € est présenté sur deux mois clôturés fictifs, septembre/octobre 2026, afin de ne pas comparer silencieusement un mois en cours avec un mois complet. Le scénario déclare ses données fictives complètes ; la clôture calendaire ne prouve jamais à elle seule la complétude réelle des saisies. En cours de mois, les libellés et conseils changent. Tous les autres chiffres ajoutés sont explicitement fictifs.

- Alimentation : 140 € puis 185 €, hausse 45 € (+32,1%). Transport : 7 €, sans supposer de tarif à Angers.
- Synthèse fictive : revenus 1 050 €, dépenses hors épargne 777 € = logement 460 + alimentation 185 + transport 7 + autres 125. Résultat mensuel 273 €, avant mouvements d’épargne. Épargne identifiée 80 € =100 versés − 20 retirés ; ce n’est ni le résultat 273 € ni le solde réel d’un compte.
- Six achats alimentaires fictifs : 32 + 28 + 18 + 24 + 38 + 45 = 185 €. Aucun achat pré-marqué ; aucune cause attribuée automatiquement.
- Ouvrir le conseil : deux barres 140/185 avec valeurs textuelles, explication bienveillante, action « Comprendre ma hausse ».
- Examiner les achats : marquer explicitement une opération comme ponctuelle, puis annuler ce marquage. Les totaux 185/777/273/80 restent identiques. Seule une lecture exploratoire séparée peut afficher 185 − 45 = 140.
- Préparer novembre : sans contexte suffisant, aucun montant imposé. Après marquage explicite de 45 €, 140 € peut être proposé comme repère personnel expliqué, modifiable et facultatif, tout en gardant visible «185 € dépensés, dont45 € marqués ponctuels». Ne pas le qualifier d’optimal ni promettre45 € d’économie. Le choix ne vaut que pour novembre, pas automatiquement chaque mois.
- Tester le repère dans la maquette : retour explicite de simulation en mémoire, sans écriture financière. Le produit futur devra confirmer une véritable sauvegarde seulement après réussite.
- Autres états : mois en cours, précédent absent, mois ancien partiellement renseigné, ville absente et thème sombre. Pas de0% artificiel, d’épargne déduite d’un surplus ou de classement normatif.

## Références publiques

Sources documentaires candidates : OVE, UNAF, Banque de France/Mes questions d’argent, FAGE, CAF, Crous et Points Conseil Budget. Aucun partenariat ni API supposé. Les liens primaires ont été consultés le 15 novembre 2026 ; périodes des données et dates de publication sont distinguées des dates de vérification.

La maquette peut proposer un guide pédagogique [Comment faire ses comptes ?](https://www.mesquestionsdargent.fr/budget/comment-faire-ses-comptes), source Mes questions d’argent/Banque de France, portée France, publication non datée dans la page consultée. Il ne sert ni à juger 185 € ni à promettre une aide. Les liens ne reçoivent aucune transaction ou montant dans leur URL. Les références France sont facultatives et ne déterminent pas le pays de l’utilisateur.

Le [catalogue documentaire candidat](2026-11-16-clair-conseils-references.md) donne les liens primaires et leurs limites. Catalogue futur minimal : organisme/titre/URL, type, publication nullable, période des données, date de vérification, portée géographique, population/conditions, statut de revue et limite d’usage. Un tarif ou une aide chiffrée exige une preuve précise et une éligibilité explicitée ; sinon ne pas l’afficher. Le bilan reste utilisable hors ligne et sans pays.

## Architecture envisagée après validation seulement

Responsabilités proposées : `domain/monthly-summary` (sélection/totaux/qualité), `domain/spending-trends` (périodes comparables), `domain/advice-rules` (constats déterministes et priorités), catalogue documentaire daté et `accounts/monthly-advice-ui` (extension de la page existante). Réutiliser les commandes d’enveloppes ; ne pas créer un deuxième moteur de montants ni un service d’objectifs sans responsabilité nouvelle démontrée.

Les calculs lisent un snapshot fourni et ne modifient pas le ledger. Les vues sont scopées propriétaire/epoch/mois ; les modifications/suppressions/conversions invalident les résultats dérivés. Ne pas créer de cache global de conseils entre comptes. Préserver centimes, contraintes CFA, JSONv3, CAS/révisions, Auth, notifications et RLS. Les annotations nécessaires devront être couvertes par normalisation, validation JS/SQL, import/export et compatibilité avant toute persistance. Pas de migration ou API d’IA payante dans cette phase.

Ordre futur proposé : sécuriser le contrat des données et le bilan, ajouter comparaison/constats et états incomplets, ajouter objectif facultatif via commandes existantes, puis contexte documentaire optionnel. Les anciens bilans sont recalculés depuis l’historique actuel ; aucune archive immuable inventée.

Tests à prévoir après accord : montants exacts/8 devises, versement/retrait sans double comptage, remboursements/virements explicitement classés, automatiques non confirmés, historique absent/zéro/partiel, mois Paris, objectifs datés, modification/suppression et conversion, marquage sans altération des totaux, changement de propriétaire, hors ligne, navigation rapide, clavier/reduced-motion et iPhone/tablette/ordinateur. Les tests des maquettes ne valideront pas ce futur moteur.

## Validation attendue

Vérification de la présentation uniquement :8 cas A/B en320/390/768/1440 réussis ; thèmes, clavier, réduction des animations, états incomplets, montants conservés, absence d’erreur console/JavaScript et de requête API/externe. La version de conversation et le fichier autonome ont aussi passé7 cas locaux de chargement/interactions/identifiants accessibles (bibliothèque d’icônes réelle dans une enveloppe de test). Sources et rapports dans le dossier de travail ; résultat de la maquette versionné dans `2026-11-16-clair-conseils-prototype/QA.json`. Ces tests en EUR fictif ne prouvent ni les huit devises dans le futur moteur ni Safari physique. Aucun accès à l’application de production effectué pour ces essais.

Choisir Bilan compact ou Bilan/Coach séparés, puis ajuster les maquettes si nécessaire. Seule une approbation explicite de cette direction et de ses maquettes autorisera l’implémentation produit. Aucun nouveau déploiement de fonctionnalité ni changement Supabase n’est autorisé par la présente phase.
