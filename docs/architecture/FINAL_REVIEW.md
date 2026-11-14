# Final independent whole-branch architecture review

Reviewed 14 November 2026: `c55c8ea02280730c9da22b88915ec49f3fdf480d` → `d07f0f673ea98c2fbe716b57af24c033919e2911`, `/workspace/clair-visual`.

## Scope and method

Read the final review brief first, then AGENTS, current STATE, approved refactor plan, verification report, progress/rulings ledger, the supplied canonical/server/tool/test diff and semantic template projection, and focused current source. Inspected earlier independent review evidence where it establishes unchanged financial extraction or already investigated protocol boundaries. Read the final matrix and the actual `delivery/review-package.log`, rather than treating per-task approval labels as sufficient evidence.

The review concentrated on interactions between validated writes, session ownership, cloud metadata/adoption, delayed operations, rendering identity, authorization, and selected-commit assembly. Generated index duplication and unchanged baseline SDK/style/product markup were not reloaded. The original full diff remains available; no named risk required reopening those duplicate bodies. Git status was clean and HEAD matched the requested commit. No repository, index, branch, database, hosted service, deployment or real-account mutation was performed. This external report is the only written deliverable. No new subagents or tests were run: source examination did not establish an unresolved doubt requiring another execution of the unchanged green matrix.

## Strengths and integrated assessment

### Financial boundary and durable state

`clair/application/budget-commands.js:5–29` uses the existing engine normalizer and savings validation, clones the command input, rejects asynchronous changes, validates before and after existing automatic catch-up, and returns a detached result. It does not introduce alternative money rules or normalize away live metadata on ordinary writes. The serializer in `clair/accounts/account-ui.js:131` also applies the validation boundary to replacement serialization.

`clair/application/budget-session.js:9–108` has one private UI budget, explicit owner/epoch, detached input and output values, and persistence before publication. Retained draft, persistence and subscriber references do not become authority. The expected context is copied before command execution and rechecked before persistence. Subscriber exceptions are observable and isolated from later listeners; publication errors do not retroactively reject a durable save.

The normal `commit` path in `clair/app/index.template.html:473–516` integrates that boundary correctly: stale local storage is adopted before refusing/requiring repetition of the edit, quota/validation failures retain the previous session, and post-persistence presentation/sync scheduling failures are separated from the failure-to-save branch. The financial recovery copy is a candidate, not a mutation of current authority. Existing manual, Express and savings constructors keep their own contracts.

The only financial version policy change is the explicit refusal of unsupported versions at `clair/domain/engine.js:446–447`; known absence/1/2 and v3 remain accepted. Canonical extraction and nested exchange authoring preserve the prior algorithms. Earlier independent AST/API evidence establishes identical engine statements and all 41 exports across extraction; the integrated source and subsequent diffs do not add a new financial algorithm change. Integer cents, CFA quantum, Paris dates, automatic keys and Express/savings provenance remain in the existing engine and tests.

### Owner, cloud and asynchronous integration

`clair/accounts/account-ui.js:38–58` coordinates owner entry/leave and exact-context remote adoption. `clair/accounts/cloud.js:96–103` supplies the epoch/owner associated with an adoption; the other modified apply sites carry the same explicit context. Cloud remains responsible for revision, dirty state, operation ID, conflict and retry; the session does not duplicate that protocol.

`clair/app/index.template.html:461–471` decodes account cache ownership/metadata through Cloud before session adoption and updates `cloud.record` alongside the snapshot. This avoids carrying a newly adopted payload with an obsolete CAS revision. Wrong-owner cache input is rejected. The stale edit cannot quietly overwrite another tab's edit.

The photo handler captures both selection order and budget replacement context around asynchronous decoding. Existing URL release remains in `finally`. The conversion completion path releases busy/converting and reschedules the current owner after an epoch switch. This closes the identified cross-task race without creating a second ownership ticket or sync worker.

Semantic normalized equality in account apply deliberately preserves an open view/modal on a metadata-only ACK. It still updates the session/snapshot and permits changed finance, dates and settings to render. No direct assignment to the UI budget remains outside its subscription initialization/publication in the reviewed application integration.

### Presentation and resource lifetime

`clair/ui/page-host.js:2–10` retains one current view record, records successful mounts/updates, and disposes when owner/page/view changes. It creates no timers, listeners or inactive DOM cache. Desktop navigation retains buttons; mobile navigation still calls the existing unchanged GlassUI implementation.

`clair/app/index.template.html:742–804` purges journal filters, feedback timer/state, trail and charge draft at owner boundaries, clears private visible DOM, and keys normal rendering by owner/epoch, normalized financial input, month, Paris day and relevant profile/settings state. Shell/account/reminder/companion work remains outside the equal-body shortcut. Settings status updates target the applicable controls. Genuine changes are not discarded merely because the page name is stable.

`clair/accounts/journal-ui.js:23–65` separates selector, summary and controller dependencies and reconciles rows by transaction ID. Matching rows retain DOM identity; obsolete rows are removed. It holds no second budget or financial cache. The final companion polish supplies model, time and escaping explicitly. Tests distinguish semantic ACK preservation from actual finance/date/owner changes; real-browser lifecycle evidence is separate from the intentionally limited VM presentation adapters.

### Authorization and server issuance

The origin helper uses explicit named policies and exact Vercel/legacy/local origins. It does not accept arbitrary previews or suffix lookalikes. Recovery sender and browser destination are aligned without adding a client secret or widening quotas.

`supabase/device-unlock-issuance-v2.sql:16–68` serializes reserve, dispatch and finish on the same row. Time is evaluated after lock acquisition. Attempt fencing, absolute expiration, five reservations and safe backoff are consistent with the handler. An expired dispatched attempt closes rather than reopening. Legacy issued requests stay closed; the original claim cannot consume a v2 issuing attempt. New functions remain invoker functions with empty search path, explicit revocation and service-role execution, on the existing RLS-protected table.

`supabase/functions/clair-device-unlock/adapters.mjs:15–34` permits safe retry only before generate_link, verifies expected user/email, and treats every post-generation failure as unknown. The handler requires an acknowledged one-use dispatch and an acknowledged finish before revealing a matching owner's token. There is no fallback to legacy claim, retry wrapper or persistent credential. Lost replies sacrifice availability in the documented manner. The schema is additive prepared source; source review does not imply that it has been installed remotely.

### Build, packaging and verification integrity

`tools/clair/build.mjs:14–44` verifies declared source/container inventory, placeholders, executable positions/order, and generated nested compatibility. `generated-sources.mjs` retains a single engine author for exchange. Explicit generation and read-only checks are distinct.

`tools/clair/package-lib.mjs:12–74` reads the selected commit's recipe and regular blobs, reconstructs the expected artifact, checks a precise inventory/configuration, and verifies actual bytes independently of the output manifest. Dirty checkout data cannot become package input. Traversal, symlink, extra/missing/tampered file and stale derived-source cases have direct adversarial coverage. The runtime recipe includes the new canonical modules and preserves Masterboard resources and licenses. Manual live verification requires an explicit origin, commit and matching manifest; it is not a deployment step.

The evidence is appropriately layered: canonical/VM behavior, actual generated integration, real DOM lifecycle, local SQL concurrency/ACL/upgrade, and exact packaged download/PWA checks. The final matrix records 51 Node suites plus two CLI checks and 19 browser suites, including the original fixture failures and corrected reruns. The last polish has targeted follow-up evidence. The actual final package log names `d07f0f673ea98c2fbe716b57af24c033919e2911`, 75 exact files, downloaded script/SDK inspection, controlling Clair offline worker and Masterboard fallback, with zero reported external attempts/page errors. I inspected this evidence; I did not independently rerun those suites.

## Findings

### Critical

None identified.

### Important

None identified.

### Minor

None requiring correction for this reviewed scope. The previously reported long test formatting, nullable upgrade assertions and companion dependency observations are addressed. The upgrade assertions now reject NULL explicitly; the final companion formatter consumes the supplied model and clock.

## Recommendations

1. Complete the already planned final documentation/STATE closure and package the resulting final documentation commit, recording its exact SHA and manifest. The current verification document intentionally still says final review/repack pending; this is an in-progress handoff, not a source defect.
2. Preserve the declared coverage limits in the final user report. A later release decision should obtain actual file-browser coverage in an authorized environment and separately validate hosted schema/function configuration, recovery destination configuration, Deno deployment tooling and relevant physical-device behavior.
3. Keep future view extraction incremental. Preserve the single owner/epoch and Cloud CAS boundaries, and profile before removing existing validation/cloning or adding financial caches. No framework rewrite is needed to complete this branch.

## Declined to judge

These boundaries were considered explicitly before the readiness verdict:

- **Existing import/reset post-persistence error orchestration** (`clair/app/index.template.html:906,1012`): the branch routes adoption through the session but preserves the existing broader try/catch behavior. A presentation failure after those replacement writes is not comprehensively redesigned by this scope. I do not extend the normal `commit` durable-truth claim to every legacy replacement handler. Earlier review explicitly treated that existing orchestration as preserved scope; no new regression from session adoption was found.
- **Global per-owner recovery serialization, administrative password-rotation uncertainty and guaranteed revocation of old links/sessions:** these are documented existing limitations outside the accepted per-request issuance protocol. No end-to-end exactly-once or safe automatic replacement authorization judgment is made.
- **Actual file:// startup:** NONEXECUTED under managed Chromium policy. Download inspection, VM file mode and HTTP/PWA proof are not substitutes. No policy workaround or alternate-browser circumvention was attempted.
- **Hosted Supabase/Auth/SMTP, real accounts/email, Deno bundling/typecheck, remote CI, Vercel response headers and deployment:** not executed/authorized for this local refactor. Local source, doubles, SQL fixtures and package evidence do not establish live operational readiness.
- **Physical Safari/iPhone installation, push delivery, steady-state heap and general performance gains:** absent physical/profiling evidence. The reported same-fixture DOM reduction is useful but narrower than those claims.
- **Unknown historical v1 backup variants:** compatible v1 shape is accepted, but no distinct historical v1 artifact was found. The retained legacy examples do not prove every possible historical format.
- **Unchanged SDK internals, unrelated Masterboard product logic, frozen FX policy and unrelated product defects:** no newly identified integration risk justified expanding this approved refactor into those audits. Packaging/resource preservation and the changed shared contracts were reviewed.
- **Merge, push, production rollout and worktree removal:** outside the requested outcome. The reviewable local branch must remain available.

## Readiness verdict

**APPROVED for the requested reviewable local refactor branch.** No Critical, Important or actionable Minor finding remains in the reviewed integrated changes. The implementation keeps the intended architecture incremental, preserves the financial/auth/offline contracts at the changed boundaries, and supplies credible layered regression evidence. The final polish and cross-task integration do not expose a blocker that per-task reviews missed.

This is approval of source and local review readiness at the stated commit, with the explicit declined judgments above. It is not release approval, a claim of complete physical/hosted coverage, or authorization to merge, deploy, push or apply SQL. The planned final documentation/package handoff can proceed without a corrective implementation wave.
