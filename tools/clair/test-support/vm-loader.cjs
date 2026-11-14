const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../../..');
function scripts(html = fs.readFileSync(path.join(root, 'clair/index.html'), 'utf8')) {
  return [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
}
function canonicalEngine(
  source = process.env.CLAIR_ENGINE_SCRIPT || path.join(root, 'clair/domain/engine.js'),
) {
  const context = { Date, Intl, structuredClone };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(source, 'utf8'), context);
  return context.ClairEngine;
}
module.exports = { root, scripts, canonicalEngine };
