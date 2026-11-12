# Clair Masterboard

Separate private entry point: `/mon-djai/masterboard/`. It does not appear in the Clair navigation. Sign in with the owner's existing Clair account; the backend checks the live `clair_masterboard_admins` allowlist. No credentials, private key, or administrator email are shipped in the frontend.

## Free testing phase

The database only accepts `mode = 'free'`. There is no end date, automatic paid switch, or scheduled payment email. No payment is due, and a test expiry never restricts a user's account. Migration and real billing require the owner's explicit instruction and a later code change.

Choose a user, set a simulated expiry (J−2, today, or three days late), prepare a reminder, then open the prefilled Gmail compose link or the mail application. The administrator sends the email in their own mail application. The message explicitly says that this is a test and no money should be transferred. The masterboard records preparation, requested mail opening, and the administrator's manual confirmation of sending. It cannot verify delivery. No SMTP service or paid dependency is required. Reopen a prepared message from the message tab instead of creating duplicates.

The phone number is optional and configured inside the protected settings. It is only sent to selected recipients, never embedded in the public site source. Test renewals add one calendar month from the later of today's date and the previous simulated expiry, with month-end adjustment handled by Postgres. This has no effect on the budget.

## Account management

Recovery prepares a support email directing the recipient to the existing password recovery page; it never reveals a password or bypasses address verification. Manual suspension and restoration use Supabase Auth's admin endpoints. A restrictive RLS policy also stops existing JWTs from accessing the online budget while the account is banned. Suspension disables push devices. Locally cached financial data cannot be remotely erased. Deletion uses Supabase Auth and cascades to the budget, test subscriptions, recipient mail records and push devices; the user can then register again. Typed target-email confirmation and a sign-in under 15 minutes old are required. Administrator accounts cannot be suspended or deleted from this UI.

## Deployment and verification

Apply `supabase/masterboard.sql` once, grant the confirmed owner membership using a private, separately executed SQL insert (never a public auto-claim endpoint), and deploy `supabase/functions/clair-masterboard/{index.ts,core.mjs}`. The handler validates the JWT with Auth and then checks live allowlist membership. The service key only comes from the function environment. The function performs its own authentication; its gateway has `verify_jwt = false` for compatibility with current publishable keys. The isolated Masterboard service worker caches only its public offline screen. Account data, sessions and API responses are never cached. Its scope stays separate from Clair.

Run `node clair/accounts/test-masterboard.cjs`, `node clair/accounts/verify-masterboard.cjs` and `supabase/verify-masterboard.sql` (transaction rolled back) alongside the existing regression checks. Browser tests use mocked Auth and administrative endpoints and never send mail or modify real accounts. Real email reception must be checked after the owner sends the prepared test message.

## Profile interface and assisted recovery

The masterboard has a black-and-white curved introduction, a mobile navigation pill and one expanded profile at a time. Profile controls are hidden and inert until the profile is opened; Escape closes it and returns keyboard focus. Refresh preserves the current profile and simulation tools. Reduced-motion preferences skip the introduction and expansion animations.

Public support requests originate from Clair's login/recovery pages and are submitted through `clair-account-help`. The endpoint performs no account lookup, returns a neutral confirmation, and uses a service-only SQL function for atomic duplicate and rate checks. The inbox is private. Apply `supabase/account-help.sql` before deploying both functions.

The administrator can authorize a reset only after a recent sign-in, copied target-email confirmation and selection of the account holder’s pending device request. The administrator must have a confirmed email; an unconfirmed target address remains recoverable through its linked device request. A suspended account must be restored separately. The server validates allowlist membership, target identity, request binding and recent login before invalidating the old password and approving the device. The account holder has 15 minutes to choose a new password on that device. No recovery URL or code is returned to the administrator, sent automatically, stored in the audit or displayed in this UI. The budget is preserved.

Tests never generate links for real accounts or send real mail. Run `test-assisted-recovery.cjs`, `verify-assisted-recovery.cjs` and `supabase/verify-account-help.sql` alongside the masterboard checks.


## Approved A — Verre doux Administration

Direction A was approved on 12 November 2026. `admin-ui.css` extends the existing presentation with a compact account directory, a clear mobile navigation capsule and a grouped account sheet. The existing HTML IDs, delegated actions, dialog lifecycle, installation and introduction remain.

Quick filter chips drive the existing `#filter` control; test-expiry filtering remains under “Autres filtres”. Missing display names use “Compte sans nom”, without inferring or changing a person’s name. Access, address confirmation and pending support are separate states.

The account sheet uses only the loaded snapshot. Pending requests are matched by email without case sensitivity; inspecting a request is read-only, and closing it still requires an explicit action. Password authorization is grouped under sensitive access and unavailable when the account is suspended or no pending device is linked. An unconfirmed address alone does not disable the existing recovery flow. The global audit stays in settings because the snapshot does not expose a reliable per-account target.

Check `verify-masterboard-design.cjs` for 320/390/768/1440 layouts, escaped/long identities, 44px controls, text contrast, contextual support, guard availability, explicit request closing, refresh/focus/logout and no private directory caching. Tests use synthetic data only. A production publication requires separate approval; current preparation/preview details are in `docs/ai/MASTERBOARD_DESIGN.md`.
