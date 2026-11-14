// Real application handlers with fictional local data; no account or network access.
const fs = require('node:fs'),
  vm = require('node:vm'),
  assert = require('node:assert/strict'),
  { test } = require('node:test');
const scripts = require('../../tools/clair/test-support/vm-loader.cjs').scripts();

function app({ omit } = {}) {
  const loaded = scripts.map((script) =>
    omit
      ? script.replace(
          fs.readFileSync(require('node:path').join(__dirname, '../..', omit), 'utf8').trim(),
          '',
        )
      : script,
  );
  const nodes = new Map(),
    storage = new Map(),
    events = {},
    windowEvents = {};
  const node = (selector) => {
    if (!nodes.has(selector))
      nodes.set(selector, {
        innerHTML: '',
        textContent: '',
        value: '',
        dataset: {},
        style: {},
        open: false,
        hidden: false,
        attributes: {},
        fields: {},
        setAttribute(k, v) {
          this.attributes[k] = v;
        },
        removeAttribute(k) {
          delete this.attributes[k];
        },
        addEventListener() {},
        scrollIntoView() {},
        focus() {},
        showModal() {
          this.open = true;
        },
        close() {
          this.open = false;
        },
      });
    return nodes.get(selector);
  };
  const sandbox = {
    Intl,
    Date,
    TextEncoder,
    URL,
    URLSearchParams,
    Blob,
    structuredClone,
    crypto: require('node:crypto').webcrypto,
    console,
    AbortController,
    FormData: class {
      constructor(form) {
        this.fields = form.fields;
      }
      get(k) {
        return this.fields[k] ?? null;
      }
    },
    setTimeout: () => 1,
    clearTimeout() {},
    setInterval() {},
    location: { protocol: 'file:', href: 'file:///clair/index.html' },
    navigator: { onLine: true },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    localStorage: {
      getItem: (k) => storage.get(k) || null,
      setItem: (k, v) => storage.set(k, v),
      removeItem: (k) => storage.delete(k),
    },
    document: {
      documentElement: { dataset: {} },
      body: { dataset: {} },
      querySelector: node,
      addEventListener(type, fn) {
        events[type] = fn;
      },
    },
  };
  sandbox.window = sandbox;
  sandbox.addEventListener = (type, fn) => {
    windowEvents[type] = fn;
  };
  sandbox.CLAIR_ACCOUNT_CONFIG = null;
  vm.createContext(sandbox);
  vm.runInContext(loaded[0], sandbox);
  vm.runInContext(loaded[2], sandbox);
  const boot = loaded[3].indexOf('  render();if(!cloud.enabled)catchUp();');
  assert(boot > 0);
  vm.runInContext(
    loaded[3].slice(0, boot) +
      `${require('../../tools/clair/test-support/presentation-adapters.cjs')}window.test={session:budgetSession,key:()=>KEY,commit,importFile,cloud,getSnapshot:()=>snapshot,getRecovery:()=>recovery,setRender(fn){render=fn},setPush(fn){queuePushSync=fn},setNotify(fn){notify=fn},setSound(fn){soundFeedback.saved=fn},openTx,journalFlow,journalResults,state:journalState,getData:()=>data,getModal:()=>modal,getMonth:()=>month,setPage(p){page=p;},setMonth(m){month=m;},setData(d){const current=budgetSession.getContext();if(cloud.enabled&&cloud.user&&current.owner!==cloud.user.id){cloud.epoch=Math.max(cloud.epoch,current.epoch+1);budgetSession.setOwner({owner:cloud.user.id,epoch:cloud.epoch,budget:d});}else budgetSession.adoptRemote(d,current);snapshot=saveData(d);localStorage.setItem(KEY,snapshot);}};})();`,
    sandbox,
  );
  const E = sandbox.ClairEngine,
    t = sandbox.test,
    d = E.empty();
  Object.assign(d, {
    initialized: true,
    setupDone: true,
    openingCents: 1000000,
    openingBalanceDate: '2026-10-01',
  });
  d.customCategories = [{ id: 'custom-study', label: 'Bourse étudiante', icon: '·' }];
  t.setData(d);
  t.setMonth('2026-10');
  t.setPage('journal');
  return {
    E,
    t,
    node,
    storage,
    sandbox,
    events,
    windowEvents,
    click: (action, extra = {}) =>
      events.click({ target: { closest: () => ({ dataset: { action, ...extra } }) } }),
    submit: (fields) =>
      events.submit({
        target: { id: fields.formId || 'tx-form', fields, closest: () => true },
        preventDefault() {},
      }),
  };
}

module.exports = app;
