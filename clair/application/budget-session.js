(function (root) {
  'use strict';
  const commands = root.ClairBudgetCommands;
  /**
   * Own the UI budget; ClairCloud still owns wire payloads, revisions and retries.
   * @param {{owner: string|null, epoch: number, budget: object}} initial
   * @returns {object} Synchronous store; every exposed budget is a detached clone.
   */
  function create(initial) {
    let owner,
      epoch,
      budget,
      disposed = false;
    const listeners = new Set();
    let publicationErrors = [];
    function assertOpen() {
      if (disposed) throw Error('La session de budget est fermée.');
    }
    function assertContext(context) {
      assertOpen();
      if (!context || context.owner !== owner || context.epoch !== epoch) {
        throw Error('Le contexte du budget a changé. Recommence depuis le compte actuel.');
      }
    }
    function getSnapshot() {
      assertOpen();
      return structuredClone(budget);
    }
    function publish() {
      publicationErrors = [];
      for (const listener of listeners) {
        // Subscription effects cannot invalidate a durable write or share state.
        try {
          listener(getSnapshot());
        } catch (error) {
          publicationErrors.push(String(error?.message || error));
        }
      }
    }
    /** Start an explicit ownership epoch using validated cache or empty state. */
    function setOwner(next) {
      assertOpen();
      if (
        !next ||
        (next.owner !== null && typeof next.owner !== 'string') ||
        !Number.isSafeInteger(next.epoch) ||
        next.epoch < 0
      ) {
        throw Error('Contexte du budget invalide.');
      }
      if (epoch !== undefined && (next.epoch < epoch || (next.owner !== owner && next.epoch === epoch))) {
        throw Error('Le contexte du budget a changé.');
      }
      const candidate = structuredClone(next.budget);
      commands.validateBudgetCandidate(candidate);
      owner = next.owner;
      epoch = next.epoch;
      budget = candidate;
      publish();
    }
    /** Adopt remote/cache data only for the exact current owner and epoch. */
    function adoptRemote(next, context) {
      assertContext(context);
      const candidate = structuredClone(next);
      commands.validateBudgetCandidate(candidate);
      budget = candidate;
      publish();
    }
    /**
     * @param {(draft: object) => void} change Synchronous command.
     * @param {{context: {owner: string|null, epoch: number}, persist: (budget: object) => string}} options
     * Persist first; on failure leave the private budget and subscribers untouched.
     */
    function commit(change, { context, persist }) {
      const expected = { owner: context?.owner, epoch: context?.epoch };
      assertContext(expected);
      const candidate = commands.prepareBudgetChange(budget, change);
      assertContext(expected);
      const result = persist(structuredClone(candidate));
      if (result && typeof result.then === 'function')
        throw Error('La persistance du budget doit être synchrone.');
      assertContext(expected);
      budget = candidate;
      publish();
      return result;
    }
    function subscribe(listener) {
      assertOpen();
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
    function dispose() {
      disposed = true;
      listeners.clear();
      budget = null;
    }
    setOwner(initial);
    return Object.freeze({
      getSnapshot,
      getPublicationErrors: () => [...publicationErrors],
      getContext: () => ({ owner, epoch }),
      commit,
      adoptRemote,
      setOwner,
      subscribe,
      dispose,
    });
  }
  root.ClairBudgetSession = Object.freeze({ create });
})(typeof window !== 'undefined' ? window : globalThis);
