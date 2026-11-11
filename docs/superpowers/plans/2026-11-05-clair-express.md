# Clair Express Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement the scoped tasks. Steps use checkbox syntax.

**Goal:** Deliver real Express entry, history suggestions and a documented banking proposal on a dedicated PR, preserving production.
**Architecture:** Existing JSONv3/commit/cloud boundary, optional versioned Express metadata, small pure modules and embedded UI mirror. Root is the only index.html editor.
**Tech Stack:** JavaScript, HTML/CSS, existing Supabase sync, Node VM and Playwright tests.
**Spec:** `docs/superpowers/specs/2026-11-05-clair-express-design.md`

## Global Constraints

- No merge, deployment, live DB migration, bank connection, paid API or real-account financial write.
- Current Clair budget confirmed once is the default account. Preserve owner isolation and revisions.
- Monetary fields are safe integer hundredths; CFA whole francs. Never invent a GBP exchange rate.
- Predictions never create transactions. Bank import/matching remain a proposal pending explicit validation.
- Canonical and embedded sources remain identical. Root alone edits shared HTML; no unrelated app changes.

## Review Focus

- Stale form/correction action after account, currency or ledger change.
- Double submit before/after failed storage, offline replays and reconnect retries.
- Express metadata stripped by normalize, edit, conversion, old clients or cloud round trips.
- GBP native support with honest mixed-conversion/server-compatibility limitations.
- Suggestions involving future entries, transfers, unknown categories or another user's data.

### Task 1: Data contracts and pure core (Agent2)

- [ ] Write and run failing engine/core tests covering JSONv3 metadata, invalid/duplicate input, dateAt, GBP and legacy round trips.
- [ ] Implement the scoped engine fragment, core and canonical currency/cloud changes; prepare SQL guards without remote execution.
- [ ] Run targeted tests and identify exact embedded replacements for root integration.

### Task 2: History helpers (Agent5)

- [ ] Write failing tests for deterministic suggestions, frequent amounts, similar entries and per-category small-spend totals.
- [ ] Implement the pure IIFE contract; prove no mutation or prediction writes and currency isolation.
- [ ] Run helper suite and report integration interfaces.

### Task 3: Express experience (Agent1)

- [ ] Coordinate failing user-path tests with Agent6; implement canonical UI/CSS and home hook using the shared contracts.
- [ ] Keep the first default-account confirmation in the same dialog, then amount-only entry and optional correction/category.
- [ ] Preserve drafts on failure, stable tickets and owner-bound correction. No source HTML edits.

### Task 4: Integration and QA (Agents6/8, security Agent3)

- [ ] Embed modules without shifting the existing script indices; integrate handlers, category and existing edit preservation.
- [ ] Test actual commit/cloud paths through fictional users, offline/reconnect, quota, stale forms, doubles and mobile/PWA.
- [ ] Run all Node suites and relevant repository browser suites; include Express browser coverage in CI. Prepare/review local SQL compatibility tests if feasible.

### Task 5: Banking study and proposal (Agent4)

- [ ] Document verified official API eligibility/costs/consents/frequency and unknown country/contract constraints.
- [ ] Propose CSV/OFX import and reversible confirmed matching without implementing or claiming a real connection.

### Task 6: Independent review and delivery (Agents7/8)

- [ ] Fresh reviewer examines complete diff and evidence, grades blocking/important/minor findings; fix blockers and important defects.
- [ ] Update compact STATE and MAP, prepare branch/PR and final report with actual tests/limitations and approval-required actions.
- [ ] Leave main and public deployment unchanged; no automatic merge or promotion.

## Mise à jour du périmètre

Le volet bancaire est abandonné à la demande de l’utilisateur : aucune phase D à réaliser. Les tâches déjà achevées hors banque restent dans la PR29 ; préparer leur seule livraison. Les anciennes propositions d’intégration bancaire ci-dessus sont archivées, sans autorisation à solliciter.
