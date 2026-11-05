# History Categories Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. Steps use checkbox syntax for tracking.

**Goal:** Make categorized deposits and expenses easy to find and understand in the existing history.

**Architecture:** Extend journal-ui.js and its embedded copy, keeping UI state separate from the ledger. Reuse customCategories and commit for storage and synchronization. Preserve the existing transaction edit form and savings flow.

**Tech Stack:** Vanilla JavaScript/CSS, Node VM tests, Playwright, GitHub Pages.

**Spec:** docs/superpowers/specs/2026-11-05-history-categories-design.md

## Global Constraints

- Preserve existing balances, savings accounting, currencies and authentication.
- Keep native labeled keyboard-accessible controls, dark theme and 320px layout.
- Keep embedded modules identical to source files.
- No deposit allocation or database changes.

## Review Focus

- Old income category IDs remain visible without reclassification.
- Savings withdrawals never increase the received-income total.
- Empty results show zero totals and an easy reset.
- Custom category labels are escaped and duplicate names rejected.
- Filter state survives edits and month/page navigation without changing balances.

## Task 1: Category filtering, summary and categorized entries

- [ ] Extend test-journal.cjs: food/category/search/source/month intersections, count and totals, savings separation, empty results, preserved state and escaped custom labels. Observe RED with node clair/accounts/test-journal.cjs.
- [ ] Extend journal-ui.js: category select, summary, reset and category creation. Update embedded JS/CSS and transaction category rendering/saving in index.html; preserve legacy income defaults.
- [ ] Verify category creation persistence, duplicate rejection and failed-storage rollback with real commit in VM tests.
- [ ] Run Node suites and commit the implementation.

## Task 2: Browser verification and publication

- [ ] Extend verify-journal.cjs to select categories, combine filters, create a category, add/correct a deposit and reload, and inspect no overflow at 320/390/768/1440px.
- [ ] Bump app version to 2026-11-05.1 and service-worker cache to v39; update its test.
- [ ] Run browser verification and full CI; request a fresh whole-branch review and resolve material findings.
- [ ] Merge the tested head and verify production HTML/CSS/service-worker hashes before reporting deployment.
