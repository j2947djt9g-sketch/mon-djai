(function (root) {
  'use strict';
  const E = root.ClairEngine;
  /** Validate the full candidate without projecting away compatible metadata. */
  function validateBudgetCandidate(candidate) {
    E.normalize(candidate);
    E.validateSavings(candidate);
    return candidate;
  }
  /**
   * Prepare a caller-owned JSON v3 budget for persistence, without I/O.
   * Manual, Express and savings handlers retain their own draft-building rules.
   * @param {object} current Existing budget, never mutated.
   * @param {(draft: object) => void} change Synchronous edit of an isolated draft.
   * @returns {object} Validated, detached candidate, including automatic catch-up.
   * @throws {Error} Invalid money, metadata, savings or asynchronous change.
   */
  function prepareBudgetChange(current, change) {
    const candidate = structuredClone(current);
    const result = change(candidate);
    if (result && typeof result.then === 'function') {
      // An async callback may reject later; it can only retain its discarded draft.
      Promise.resolve(result).catch(() => {});
      throw Error('La modification du budget doit être synchrone.');
    }
    E.reconcileAdviceContext(current, candidate);
    validateBudgetCandidate(candidate);
    E.sync(candidate);
    E.reconcileAdviceContext(current, candidate);
    validateBudgetCandidate(candidate);
    return structuredClone(candidate);
  }
  root.ClairBudgetCommands = Object.freeze({ prepareBudgetChange, validateBudgetCandidate });
})(typeof window !== 'undefined' ? window : globalThis);
