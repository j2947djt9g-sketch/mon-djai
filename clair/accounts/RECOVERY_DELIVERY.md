# Password recovery delivery and request protection

The login/recovery UI sends requests through `clair-account-recovery`. The function validates the project public key, origin, payload and email syntax, then claims a private PostgreSQL quota before calling Supabase Auth.

- Five requests per normalized email address in a thirty-minute window. The fifth starts a thirty-minute pause.
- Sixty seconds between requests to the same address. Refreshing the page or changing devices does not clear the database quota.
- A separate twenty-request network budget limits abuse without treating every account on shared Wi-Fi as one user.
- Only HMAC fingerprints are stored. No passwords, reset tokens, email addresses or raw IP addresses are saved in the quota table.
- Provider rate limits are reported separately from Clair's quota. A 202 response is neutral and does not confirm that an address has an account or that an email arrived.
- Supabase's public Auth API has its own limits. The app quota applies to this entry point; configure appropriate native Auth limits or a Send Email hook when enabling a custom sender if the same quota must also govern direct Auth API requests.

## Delivery configuration

Supabase's built-in sender is intended for development, only serves pre-authorized team addresses, and currently has a project-wide quota of two emails per hour. Increasing a browser counter cannot lift it. Configure a verified SMTP sender in the project's Authentication email settings, using the provider's host, port, username, secret and verified From address. Do not commit SMTP credentials or disable email verification. Native Auth email quotas can then be adjusted for the verified sender.

The existing masterboard can generate a recovery code for a verified account holder after recent admin authentication and explicit identity confirmation. Generating a code does not send an email and does not erase a password or bypass verification. Delivery of that code remains a deliberate admin action.

## Contact

The recovery screen always offers the private support request and the verified code-entry page. To display a direct public email contact, set `window.CLAIR_SUPPORT_EMAIL` to an address explicitly supplied for publication. The application never looks up or publishes the private administrator allowlist.

## Installation and verification

Apply `supabase/recovery-request-limits.sql`, then deploy `supabase/functions/clair-account-recovery` with the settings in `supabase/config.toml`. Service credentials stay in Edge Function environment variables.

Run the existing recovery/SDK/account tests, `test-recovery-limits.cjs`, the browser welcome/recovery checks, and `supabase/verify-recovery-request-limits.sql`. The SQL verification rolls back all fictional fingerprints. No automated test sends real emails or changes a real account password.
