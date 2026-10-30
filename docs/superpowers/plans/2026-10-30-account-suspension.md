# Account suspension fix

Goal: a suspended account cannot add transactions; show “Paie ton abonnement pour continuer”. Keep its history and permit restoration from the masterboard.

Architecture: reuse the current server ban and restrictive RLS policy. Expose only the current authenticated account’s active boolean through an invoker RPC. Refresh before user writes, refuse uncertain authorization, retain a read-only cached budget, and poll active sessions. Do not activate billing for other accounts.

- [ ] Reproduce the cached-session defect in a cloud controller test.
- [ ] Add and test the restricted status RPC against active, suspended, anonymous and restored identities in a rolled-back database transaction.
- [ ] Add the client authorization guard, apply it before mutation handlers, keep pack/sync guards, and show the suspension message on login and in the app.
- [ ] Exercise a transaction form opened before suspension, fresh suspension, offline state, restoration and another account in browser fixtures.
- [ ] Run unit, browser and SQL checks, review the diff, publish the migration and GitHub Pages version, then compare public files.
