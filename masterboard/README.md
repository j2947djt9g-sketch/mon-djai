# Clair Masterboard

Separate private entry point: `/mon-djai/masterboard/`. It does not appear in the Clair navigation. Sign in with the owner's existing Clair account; the backend checks the live `clair_masterboard_admins` allowlist. No credentials, private key, or administrator email are shipped in the frontend.

## Free testing phase

The database only accepts `mode = 'free'`. There is no end date, automatic paid switch, or scheduled payment email. No payment is due, and a test expiry never restricts a user's account. Migration and real billing require the owner's explicit instruction and a later code change.

Choose a user, set a simulated expiry (J−2, today, or three days late), prepare a reminder, then open the prefilled Gmail compose link or the mail application. The administrator sends the email in their own mail application. The message explicitly says that this is a test and no money should be transferred. The masterboard records preparation, requested mail opening, and the administrator's manual confirmation of sending. It cannot verify delivery. No SMTP service or paid dependency is required. Reopen a prepared message from the message tab instead of creating duplicates.

The phone number is optional and configured inside the protected settings. It is only sent to selected recipients, never embedded in the public site source. Test renewals add one calendar month from the later of today's date and the previous simulated expiry, with month-end adjustment handled by Postgres. This has no effect on the budget.

## Account management

Recovery prepares a support email directing the recipient to the existing password recovery page; it never reveals a password or bypasses address verification. Manual suspension and restoration use Supabase Auth's admin endpoints. A restrictive RLS policy also stops existing JWTs from accessing the online budget while the account is banned. Suspension disables push devices. Locally cached financial data cannot be remotely erased. Deletion uses Supabase Auth and cascades to the budget, test subscriptions, recipient mail records and push devices; the user can then register again. Typed target-email confirmation and a sign-in under 15 minutes old are required. Administrator accounts cannot be suspended or deleted from this UI.

## Deployment and verification

Apply `supabase/masterboard.sql` once, grant the confirmed owner membership using a private, separately executed SQL insert (never a public auto-claim endpoint), and deploy `supabase/functions/clair-masterboard/{index.ts,core.mjs}`. The handler validates the JWT with Auth and then checks live allowlist membership. The service key only comes from the function environment. The function performs its own authentication; its gateway has `verify_jwt = false` for compatibility with current publishable keys. No user-data cache or service worker is used for the masterboard. Its assets are outside Clair's service-worker scope.

Run `node clair/accounts/test-masterboard.cjs`, `node clair/accounts/verify-masterboard.cjs` and `supabase/verify-masterboard.sql` (transaction rolled back) alongside the existing regression checks. Browser tests use mocked Auth and administrative endpoints and never send mail or modify real accounts. Real email reception must be checked after the owner sends the prepared test message.
