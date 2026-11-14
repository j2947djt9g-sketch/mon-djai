# Émission du déblocage d’appareil

Le protocole v2 est du **code source préparé et testé localement, non appliqué à une base hébergée**. La migration réelle et le déploiement nécessitent leur autorisation distincte. Le navigateur conserve `pending`, `ready`, `expired` et `completed` ; il ne reçoit aucune métadonnée de tentative.

## Autorisation et émission

L’approbation administrative conserve son rôle : vérifier le compte et remplacer son ancien mot de passe avant approbation. Le poll ne répète pas cette opération. Chaque RPC v2 exige le rôle serveur et la paire id/hash ; dispatch et finish exigent aussi l’identifiant de tentative. Celui-ci sert au fencing, pas d’autorisation autonome.

| Transition | Effet |
| --- | --- |
| reserve | Verrouille la demande approuvée, réserve une tentative pendant 30 secondes, au maximum cinq réservations. |
| dispatch | Consomme une seule fois cette réservation et autorise un appel Auth ; renouvelle la lease de 30 secondes. |
| finish issued | Confirme durablement l’émission avant de rendre le token au navigateur. |
| finish not_issued | Seulement une preuve locale avant émission : revient à approved avec cinq secondes de backoff. |
| finish unknown | Ferme la capacité ; aucune reprise automatique. |

L’heure SQL est lue après le verrou ; l’expiration absolue n’est jamais repoussée. Une réservation expirée peut être remplacée, mais l’ancien travailleur ne peut plus dispatch. Une tentative dispatched expirée devient unknown au prochain poll, sans revenir à approved. Le contrôle local de délai réduit les appels de travailleurs retardés ; il ne peut pas annuler un appel distant.

L’adaptateur effectue d’abord un GET du compte attendu et compare son id/email. Une panne de cette lecture prouve l’absence d’appel d’émission dans cette invocation. Après le POST generate_link, toute erreur HTTP, transport, timeout, réponse malformée ou identité différente est unknown. Aucune liste de statuts fournisseur sûrs n’est utilisée. Le REST brut fournit id et hashed_token au premier niveau ; l’enveloppe transformée du SDK n’est pas acceptée. Aucun wrapper de retry n’entoure les appels.

Un ready exige aussi l’identité attendue et un finish confirmé. Une réponse dispatch perdue interdit l’appel Auth ; une réponse finish perdue fait jeter le token. Un résultat tardif est refusé. Une réponse serveur perdue après finish ne peut pas être restituée : aucun token, lien, mot de passe ou réponse Auth supplémentaire n’est conservé en base ou journalisé. La garantie concerne une demande, sans promesse « exactement une fois » de bout en bout.

## Déploiement et retour arrière

1. Revoir puis autoriser séparément `supabase/device-unlock-issuance-v2.sql`. Supabase CLI étant absent pendant la préparation, ce fichier autonome n’invente aucune entrée d’historique de migration. Il s’applique une fois au schéma historique ; ne pas réexécuter `device-unlock.sql` sur une base existante.
2. Appliquer le schéma additif avant le serveur v2. Les colonnes historiques et demandes existantes restent intactes ; une ancienne ligne issued ne devient jamais une réservation. Les nouveaux RPC sont SECURITY INVOKER avec search_path vide, réservés à service_role ; RLS et absence de droits publics restent en place.
3. Vérifier les RPC puis déployer le handler/adaptateur v2. Aucun fallback vers claim historique après une erreur v2. Ancien claim et nouvelle réservation verrouillent la même ligne : un seul gagne.
4. Un rollback serveur conserve le schéma additif. L’ancien serveur voit issuing/unknown comme pending jusqu’à expiration, sans réémission. Ne pas supprimer les colonnes/contraintes v2 tant que ces états existent ; ne jamais reclasser issued/unknown en approved.

## Résultat indéterminé et intervention humaine

Après unknown, issued sans réponse reçue, ou perte de réponse dispatch/finish, ne pas réouvrir le même id/hash ni renvoyer aveuglément un lien. Une nouvelle demande et une nouvelle approbation constituent une nouvelle autorisation. Avant remplacement, l’administrateur doit traiter le lien ou la session potentiellement actif par une procédure vérifiée distincte : expiration Auth effective ou révocation démontrée. Le délai de la demande et la rotation du mot de passe ne prouvent pas à eux seuls la révocation des liens/sessions.

Le frontend actuel n’impose pas cet arbitrage et plusieurs demandes par email restent possibles. Le verrou global par propriétaire, la révocation garantie et les pannes indéterminées de l’approbation administrative sont hors du périmètre v2. Aucune RPC de reset unknown n’est fournie.

## Vérification isolée

Node : `test-device-unlock.cjs`, `test-device-unlock-issuance.cjs` et `test-device-unlock-adapters.cjs` dans `clair/accounts/`, avec doubles uniquement. Ils couvrent reprise sûre, émissions comptées, identité, ancien mot de passe invalidé, concurrence, réponses perdues, timeout et consommation.

PostgreSQL 17.6 jetable : appliquer les schémas historiques et les limites, puis `verify-device-unlock-issuance-upgrade.sql` (qui applique le source v2), `verify-device-unlock-issuance-v2.sql`, `verify-device-unlock.sql` et `node tools/clair/test-unlock-sql-concurrency.mjs`. Le dernier test utilise deux processus/connexions réels ; ne jamais le pointer vers une base hébergée. Le workflow Clair reproduit cet ordre. Les tests SQL vérifient conservation, transitions, expiration après attente du verrou, fencing, compatibilité ancien serveur, ACL effectives, RLS et rollback des fixtures.
