# CLAIR Conseils — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. The user explicitly approved Bilan compact and implementation; no further design approval is needed.

**Goal:** Implement the real compact monthly review, explainable local advice and optional next-month goals without changing financial transactions automatically.

**Architecture:** Pure report/trend/rule modules read the canonical snapshot. An optional JSONv3 advice context stores explicit transaction annotations, reviewed periods, dated goal evidence and optional declared location. A scoped controller extends the existing budget page and uses existing synchronous commit/CAS infrastructure.

**Tech Stack:** Existing vanilla JS/IIFE, generated standalone HTML, Node assertions, Playwright and disposable PostgreSQL17. No new runtime dependency or paid AI.

**Spec:** `docs/superpowers/specs/2026-11-16-clair-conseils-design.md` (Compact approved by user16Nov2026).

## Global Constraints

- Preserve JSONv3, integer cents, eight currencies and integer FCFA, Paris civil dates, IDs/Express provenance and ledger balances.
- Preserve Auth, notifications, account owner/epoch, local-first writes, CAS/revisions and other apps.
- No real account, production change, SQL migration application, main merge or production deployment in this task.
- No GPS, bank connection, paid AI or automatic financial transaction based on advice.
- At most three useful advice cards; incomplete periods/unknown coverage never imply zero or a reliable comparison.
- References are optional documentary resources with scope/date/conditions, not partners, aid promises or normative local prices.
- Generate `clair/index.html` from canonical sources, never edit it directly.

## Contract and rulings

Optional `adviceSchema:1`, `advice:{transactions,months,goals,location}`. Missing context remains legacy-compatible. Unknown schema/malformed context is rejected, not silently dropped. `transactions[id]` holds optional `nature` (income/expense/refund/transfer/adjustment), `exceptional:boolean`, optional `refundOf` expense ID. Refunds require income direction; expense/income tags must agree with direction. Savings are already explicitly identified and cannot be reclassified. Refund links must reference a non-savings expense and cannot exceed the original aggregate amount. An unlinked refund is separately disclosed, never earned income.

`months[YYYY-MM]={through:YYYY-MM-DD}` is an explicit user review, not bank verification. Financial ledger/nature edits invalidate reviews of affected months; contextual exceptional marking does not. Deletion prunes annotations for removed rows and unlinks retained refunds pointing to removed/changed targets. `goals[month][category]={amountCents,setOn}` is evidence only when equal to the existing canonical monthly override; only an objective chosen before month start supports historic attainment claims. Currency conversion converts this evidence with canonical overrides. `location={country,city}` is optional declared data, not inferred from currency.

Ruling: the additive SQL guard must be prepared/tested before release because old clients normalize unknown fields away. It rejects dropping the advice marker and validates metadata; no live migration is authorized. Release instructions require applying this guard before publishing the new client. Preview tests use synthetic transport only.

Ruling: calculations show registered flows, not verified bank payments. Result=earned income−net expenses, excluding identified savings/internal transfers/adjustments; savings=identified contributions−withdrawals, separately. Refunds reduce expenses and are never new income; unclear categories/links are disclosed. A reviewed elapsed month can compare with the same elapsed days of the previous month, never an unlabelled full previous month. Goal proposals require comparable reviewed periods, explicit exceptional marking and a positive non-exceptional remainder; they are optional, not forecasts of needs.

## Review Focus

1. Editing/deleting a transaction after confirming a month must invalidate stale analysis without altering any amount.
2. A refund across months, unlinked refund or internal transfer must not inflate income or invent behavioural savings.
3. Current/future/absent/zero months and income not yet received must not produce false percentages or certainty.
4. An old client, conversion or import must not erase annotations or leave goal evidence in the wrong currency.
5. Rapid navigation, owner switch, storage error and duplicate submit must not save another user's goal or display false success.

### Task1: Context and pure calculations

**Files:** engine.js, application/budget-commands.js, new domain/{monthly-summary,spending-trends,advice-rules}.js, new application/advice-commands.js, new accounts/test-advice-{context,summary,rules}.cjs.

**Interfaces:** `ClairMonthlySummary.summarizeMonth(snapshot,{month,asOf})`; `ClairSpendingTrends.compareMonths(current,previous)`; `ClairAdviceRules.buildAdvice({summary,comparison})`. Summaries contain integer `incomeCents`, `expenseCents` (gross), `refundCents`, `netExpenseCents`, `surplusCents`, `savingsCents`, `transferCents`, `adjustmentCents`, `categories[]`, `transactions[]`, `quality`, `goals[]`. Category rows contain `id,expenseCents,refundCents,netCents,exceptionalCents,count`. Period contains `month,start,end,through,status`. Quality contains `reviewed,comparable,unknownRefunds,unconfirmedAutomaticCount,notes[]`. `goals[]` contains `categoryId,amountCents,setOn,verified`.

Advice commands mutate only a caller-owned draft: `annotateTransaction(d,id,context)`, `reviewMonth(d,month,through)`, `setMonthlyGoal(d,{month,categoryId,amountCents,setOn})`, `setLocation(d,{country,city})`. Engine exports `reconcileAdviceContext(before,after)` and runs strict optional metadata normalization; commands call reconcile after change/sync before final validation.

- [ ] Write/run failing tests for exact105000/77700/27300/8000 and food14000→18500 (+4500), purity, all eight currencies, future filtering, date ranges, absent/zero histories, refunds/transfers/adjustments and stale review/goal evidence.
- [ ] Implement context/commands then reports/trends/rules. No read/write/network in pure modules. Keep maximum3, significant relative/personal-budget increases, dated goal overspend, imbalance, recurrent weight, positive savings/decreases; never invent causes or force a target.
- [ ] Run focused and engine/command compatibility suites; review task diff and commit.

### Task2: Compact UI and integration

**Files:** new accounts/monthly-advice-{ui.js,css}, accounts/profile-ui.js, app/index.template.html, build-inputs.json, mirrors.json, package-inputs.json, generated index, tests.

**Interface:** `ClairMonthlyAdviceUI.create({getBudget,getOwner,commit,engine,categories,formatMoney,categoryVisual,monthNav,pageBackLink})` returns `{mount(host,{month}),update({month}),dispose()}`. Owner changes clear private state; all mutations use a live owner check and commit. Renderer retains open cards/drafts on metadata ACK, resets stale actions after real financial/context changes. UI observes no global user cache.

- [ ] Write a failing real-browser flow against current budget page; use fake Auth/network with real app modules and no seeded production account.
- [ ] Add summary/category rows, up to3 explainable expandable advice cards, real transaction context controls, reviewed-period action, chart labels and dated monthly goal form. Keep old envelope management available below. Show exact success only after commit.
- [ ] Add optional country/city to existing profile; optional France guide only for explicit FR, no location required.
- [ ] Integrate current page-host lifecycle, declared source tokens/mirrors/package inventory and generated HTML. Extend existing budget/profile handlers to preserve dated-goal evidence; preserve existing navigation/liquid shell.
- [ ] Verify mobile320/390/tablet768/desktop1440, dark/reduced-motion/keyboard, no overflow, same18500/77700/27300/8000 after contextual marking, actual next-month override14000, correction/deletion, owner change, offline/reconnect and storage failure. Commit after review.

### Task3: Compatibility, QA and handover

**Files:** prepared `clair/accounts/advice-compatibility.sql`, isolated SQL verification, docs/architecture/CLAIR_CONSEILS.md, STATE/MAP, CI applicable checks.

- [ ] Add failing SQL guard tests for marker downgrade, malformed metadata, authorized ownership/RLS/CAS preservation and currency-goal evidence; use only disposable PostgreSQL.
- [ ] Prepare additive invoker/search_path-empty trigger guard without touching live schema; test upgrade/old payload preservation and eight currencies/conversion.
- [ ] Run existing relevant Node/browser suites plus reproducible build/package checks. No file:// policy bypass; distinguish local policy block from CI evidence. Independent whole-branch review; fix actionable important findings.
- [ ] Update short state/architecture/contracts/tests/results/limits and deployment prerequisites. Commit and open draft PR, no merge or production deployment. Provide screenshots and a reviewable candidate.

## Progress / decisions

Execution ledger: `/workspace/clair-conseils-work/implementation/progress.md`. This plan is execution detail under the user's explicit implementation approval. Prepared migration and production release remain separate future approval steps.
