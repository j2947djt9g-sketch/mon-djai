# Signup guidance and login retries implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement the tasks.

**Goal:** Explain the signup confirmation link and permit two wrong passwords before a third starts a one-hour browser pause.
**Architecture:** Keep the existing Supabase SDK and server policies. Separate browser login retries from recovery quotas and email delivery errors; store only a SHA-256 digest of each normalized address with counter timestamps.
**Tech Stack:** Existing HTML/JS PWA, Supabase JS 2.102.0, Node VM tests, Playwright.
**Spec:** User request 2026-10-29: explicit confirmation instructions and three wrong passwords followed by one hour of waiting.

## Global constraints

- Count only password login invalid_credentials. Do not count signup, unconfirmed email, offline/network errors or provider limits.
- First and second failures remain retryable. Third pauses the browser for 3600 seconds. Reload retains the deadline.
- Separate addresses; successful login and verified password recovery reset the corresponding counter. Never persist passwords.
- Keep recovery and administrator help accessible.
- Browser policy is not a global server account lock; other browsers, cleared storage and direct Auth API calls can bypass it. Supabase server protections remain active.
- Preserve unrelated current main changes and the existing five-request / thirty-minute recovery quota.

## Review focus

- Delivery failure must not claim a confirmation was sent.
- Account changes and verified recovery must not strand users behind a stale counter.
- Reloads, malformed/unavailable storage and exact expiry must remain usable.
- Pending requests must not duplicate Auth calls.
- Confirmation should fit 320 px and announce its instructions accessibly.

### Task 1: Guidance and retry behavior

- [x] Baseline account UI, password security and SDK tests passed on main 8a2e269.
- [x] Extend account UI test with two retries, third pause, no fourth request, reload, hour expiry, success reset, address isolation and error exclusions. Observed expected RED against unmodified code.
- [x] Update account-ui.js and embedded index module. Core account/security/recovery/SDK tests passed locally.
- [x] Verify expiry clears the old paused message; cover malformed/unavailable storage and offline state.

### Task 2: Browser integration and release

- [x] Add verify-auth-entry.cjs with intercepted HTTP and real SDK; add it to the existing workflow.
- [x] Update app version to 2026-10-29.1 and offline cache to v38.
- [x] Independent whole-branch review completed; two important findings are covered by regression tests.
- [ ] Complete final browser checks and publish with verified GitHub Pages content.

## Execution record

- Local baseline and changed core suites passed. No single-failure lock was present in current source; email-confirmation and provider messages were vague.
- Windows browser startup failed due environment access, then the executor disconnected. Remaining verification runs in GitHub Actions; remote source preparation preserves all candidate content.

- GitHub's extra expiry test initially used an unrendered login fixture; it now renders the form before exercising its timer. The timer clears expired one-hour guidance and only updates live guidance when its text changes.

- Independent review: missing SDK error-version headers in browser fixtures were corrected; the production SDK behavior was verified in the bundled error parser.
- Independent review: verified recovery in another tab left a cached local pause alive. A regression ran RED in GitHub (Auth calls remained 3 instead of expected 4 after recovery). A successful missing-key read is now authoritative; memory-only counters are retained only when storage writes fail. Both normal clearing and failed-write fallback are covered.
- Review items outside validation: SMTP delivery remains blocked pending sender setup; assistive technology requires manual validation; browser widths run in CI.

- 2026-10-30 continuation: the final browser fixture also needs Access-Control-Expose-Headers so browser Fetch can read X-Supabase-Api-Version. The real Auth health response was inspected read-only and exposes that header; the fixture now matches it.
