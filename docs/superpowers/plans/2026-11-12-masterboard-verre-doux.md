# Masterboard Verre doux Implementation Plan

> **For agentic workers:** Execution in this session with a frontend stylesheet agent, independent QA and final review. User approved direction A; no further design gate is needed.

**Goal:** Integrate approved A in the existing Masterboard, retaining account actions and safeguards.
**Architecture:** Preserve the static HTML, existing dialog lifecycle and delegated handlers. Refactor only presentation renders, add progressive filter chips and scoped A stylesheet. No backend, SDK, schema or financial engine change.
**Tech Stack:** Static HTML/CSS, vanilla JavaScript, Node and Playwright/Chromium.
**Spec:** `docs/ai/MASTERBOARD_DESIGN.md`, A explicitly approved by user on 12 November 2026.

## Global Constraints

- A only; retain default account ordering and all existing functions. B and speculative feature ideas are not authorized.
- Keep admin allowlist, recent login, target-email confirmation, account protection, escaping and existing request/action payloads.
- No Supabase, financial data, public CLAIR or production deployment changes. Prepare an isolated Vercel preview with synthetic data only; publication needs approval.
- Actual authentication config remains in source; demo data/config overrides exist only in the preview package/test contexts.
- No per-user admin history is exposed in snapshot; do not fabricate one. Requests can be matched by case-insensitive email; message history has only the latest 100 global records.
- Preserve intro, installation, tab keyboard behavior, profile close/focus return and simulation state across refresh.

## Review Focus

- Long names/emails, missing identity and HTML-like strings: safe escaping, visible identity, no overflow.
- Unconfirmed/suspended/admin accounts: distinct states, no loss of existing safeguards/actions.
- Profiles with pending device help vs no request: explain real available information, no fictitious deadline.
- Resize, nested dialogs, refresh/logout: no hidden controls active, focus/scroll and cleanup preserved.
- Mobile dock and keyboard: 44px controls, no obscured final content, reduced motion and usable 320px layout.

### Task 1: A presentation and real render data

**Files:** Modify `masterboard/index.html`, `masterboard/masterboard.js`; create `masterboard/admin-ui.css`.
**Interfaces:** Keep `renderUsers`, `renderProfile`, `renderHelp`, all existing IDs/data-action handlers and server payloads. CSS agent owns only new stylesheet; root owns JS/HTML.

- [x] Add focused browser checks for compact cards, clear dock, grouped identity/facts, fallback identity and sensitive action placement; verify baseline failure.
- [x] Adapt account list markup, profile groups and actual pending-help display. Rename sensitive password action without altering handler/guards. Add chips over the existing select, including unconfirmed addresses; keep advanced test-expiry filter.
- [x] Add approved A stylesheet, compact signed-in header/summary, spacious but dense list and mobile full-height profile. Preserve login/intro/install behavior and desktop sidebar/dialog.
- [x] Check syntax, focused A browser checks and existing Masterboard/account recovery suites.

### Task 2: Review and isolated delivery

**Files:** Focused browser verification under `clair/accounts/`; docs `STATE.md`, `MAP.md` if needed, `MASTERBOARD_DESIGN.md`, `masterboard/README.md` current UI description.
**Interfaces:** Existing mock Auth/admin endpoints only; source files packaged without demo mutation, preview boot/mock fixture separate.

- [x] Independent review of safeguards, existing action selectors/handlers and no out-of-scope source changes; fix blockers.
- [x] Run `test-masterboard.cjs`, `test-assisted-recovery.cjs`, `test-device-unlock.cjs`, `verify-masterboard.cjs`, `verify-assisted-recovery.cjs`, `verify-device-unlock.cjs`, `verify-masterboard-install.cjs` and new focused A checks as relevant.
- [x] Capture actual updated app with fictional fixtures, package isolated preview, verify READY/public assets and unchanged real CLAIR/Masterboard hashes.
- [ ] Record exact results/limitations; push dedicated branch and draft PR; leave production unchanged pending approval. Branch/PR creation follows the reviewed application commit.
