# Échéances et rappels — 21 octobre 2026

La vérification sur 7f32f848 a reproduit le défaut : le débit automatique avait déjà eu lieu, mais l’échéance restait dans « Paiements à venir » pendant 31 jours tant que l’utilisateur ne confirmait pas manuellement. Les notifications app fermée n’étaient pas configurées : CLAIR_PUSH_CONFIG était null, sans fonction serveur ni cron.

## Comportement corrigé

Les débits restent automatiques et idempotents. Le jour de l’échéance, la ligne disparaît de la liste des paiements futurs et reste dans l’historique. La prochaine occurrence de chaque règle est affichée par ordre de date, jusqu’à 400 jours pour inclure les abonnements annuels. Une écriture déduite du budget n’est jamais présentée comme une confirmation bancaire.

Un rappel apparaît dans Clair à J−2 (ou J−1 si l’application n’est rouverte que la veille). Le calendrier exporté reste disponible. À l’ouverture ou au retour dans l’application, les dépenses échues sont rattrapées ; l’application ouverte contrôle le changement de jour toutes les 30 secondes, à l’heure de Paris.

## Notifications app fermée

Chaque appareil doit être activé depuis Réglages → Rappels → Notifications app fermée. Le navigateur demande son autorisation sur action de l’utilisateur. Sur iPhone, ouvrir Clair installé sur l’écran d’accueil. Le réseau et les réglages du système conditionnent la réception : aucune garantie de livraison à la seconde.

Le serveur consulte le budget synchronisé du compte, et non un ancien planning envoyé par un appareil. Il respecte les rappels désactivés, les pauses, les arrêts, les occurrences annulées et les paiements anticipés. Les modifications hors ligne ne peuvent être connues du serveur qu’après synchronisation.

La fonction vérifie le JWT auprès de Supabase pour chaque opération d’appareil ; le propriétaire vient de l’utilisateur vérifié. Le point d’envoi périodique accepte uniquement le secret du cron. Les tables de notifications sont sous RLS, sans accès pour anon ou authenticated. Les clés VAPID sont générées une fois côté serveur et ne sont pas exposées ; seule la clé publique est retournée à l’application. Les requêtes sortantes sont limitées aux services push reconnus des navigateurs.

Le cron vérifie les rappels toutes les cinq minutes pendant l’heure de 9 h à Paris, avec adaptation automatique heure été/hiver. Un verrou par appareil/occurrence empêche deux exécutions concurrentes d’envoyer la même notification. Les échecs sont réessayés au maximum trois fois ; les abonnements expirés sont désactivés. Un même tag évite d’empiler les notifications en cas de résultat réseau ambigu après envoi.

## Déploiement et validation

1. Appliquer supabase/reminders.sql une fois avec l’outil de migration, puis vérifier les permissions et le cron.
2. Déployer supabase/functions/clair-reminders avec verify_jwt=false : l’authentification est intégralement vérifiée dans le handler (JWT utilisateur ou secret cron).
3. Contrôler le démarrage de la fonction ; aucun appareil n’est activé et aucun message n’est envoyé par le déploiement.
4. Publier la version de l’application uniquement une fois les suites, SQL et parcours navigateur validés.
5. La réception sur un téléphone réel nécessite l’activation explicite par son utilisateur.

Tests sans comptes réels : test-subscriptions.cjs, test-push-server.cjs, verify-subscriptions.cjs, verify-reminders.sql. Aucun paiement bancaire ni e-mail n’est envoyé par ces tests.
