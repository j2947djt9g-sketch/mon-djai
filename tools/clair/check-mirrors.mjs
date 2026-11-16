import fs from 'node:fs';
import {checkGenerated} from './generated-sources.mjs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Parse actual attribute boundaries; quoted attribute text is never another name.
function attributes(text) {
  const attrs = new Map();
  const pattern = /\s+([^\s/=>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/y;
  let offset = 0;
  while (offset < text.length) {
    if (/^\s*\/?$/.test(text.slice(offset))) break;
    pattern.lastIndex = offset;
    const match = pattern.exec(text);
    if (!match) throw Error('Unsupported HTML attribute syntax');
    const name = match[1].toLowerCase();
    if (attrs.has(name)) throw Error('Duplicate HTML attribute: '+name);
    attrs.set(name, match[2] ?? match[3] ?? match[4] ?? '');
    offset = pattern.lastIndex;
  }
  return attrs;
}

// Read-only scanner for the static deliverable. Consume raw-text/RCDATA bodies
// before scanning more tags, including when their text contains apparent scripts.
export function containers(html) {
  const blocks = [];
  const tokens = /<!--[\s\S]*?-->|<([a-z][a-z0-9:-]*)(?=[\s/>])((?:"[^"]*"|'[^']*'|[^'">])*)>/gi;
  const raw = new Set(['script','style','textarea','title','xmp','iframe','noembed','noframes','noscript','plaintext']);
  let token;
  while ((token = tokens.exec(html))) {
    if (!token[1]) continue;
    const tag = token[1].toLowerCase();
    // Template contents are inert and need a tree parser; fail closed instead.
    if (tag === 'template') throw Error('Unsupported inert template context');
    if (!raw.has(tag)) continue;
    const closing = new RegExp('</'+tag+'\\s*>', 'gi');
    closing.lastIndex = tokens.lastIndex;
    const end = tag === 'plaintext' ? null : closing.exec(html);
    const body = html.slice(tokens.lastIndex, end ? end.index : html.length);
    tokens.lastIndex = end ? closing.lastIndex : html.length;
    if (tag !== 'script' && tag !== 'style') continue;
    const attrs = attributes(token[2]);
    const type = (attrs.get('type') ?? '').trim().toLowerCase();
    const executable = tag === 'style'
      ? (!type || type === 'text/css')
      : !attrs.has('src') && ['', 'module', 'text/javascript', 'application/javascript'].includes(type);
    blocks.push({tag, body, executable});
  }
  return blocks;
}

export function checkMirrors(root = fileURLToPath(new URL('../../', import.meta.url))) {
  const errors = [];
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'tools/clair/mirrors.json'), 'utf8'));
    checkGenerated(manifest,p=>fs.readFileSync(path.join(root,p)));
    const html = fs.readFileSync(path.join(root, manifest.html), 'utf8');
    const blocks = containers(html);
    if (JSON.stringify(blocks.map(b=>b.tag)) !== JSON.stringify(manifest.containers)) errors.push('Container inventory/order differs');
    const declared = [...manifest.mirrors, ...manifest.external].map(m=>m.source);
    const actual = ['clair/accounts','clair/domain','clair/application','clair/ui','clair/config'].flatMap(directory=>fs.existsSync(path.join(root,directory))?fs.readdirSync(path.join(root,directory)).filter(f=>/\.(js|css)$/.test(f)).map(f=>directory+'/'+f):[]);
    if (new Set(declared).size !== declared.length || JSON.stringify([...declared].sort()) !== JSON.stringify(actual.sort())) errors.push('JS/CSS inventory differs (missing, duplicate or unlisted source)');
    const positions = new Map();
    for (const mirror of manifest.mirrors) {
      const source = fs.readFileSync(path.join(root,mirror.source), 'utf8').trim();
      if (!source) {errors.push(`${mirror.source}: empty source`); continue;}
      const matches = [];
      blocks.forEach((block, index)=> {
        let offset = -1;
        while ((offset = block.body.indexOf(source, offset+1)) !== -1) matches.push({index,offset,block});
      });
      if (matches.length !== 1) {errors.push(`${mirror.source}: expected one identical copy, found ${matches.length}`); continue;}
      const match = matches[0];
      if (match.index !== mirror.container || match.block.tag !== mirror.tag || !match.block.executable) errors.push(`${mirror.source}: wrong container or non-executable copy`);
      if (!positions.has(mirror.container)) positions.set(mirror.container, []);
      positions.get(mirror.container).push({offset:match.offset,order:mirror.order,source:mirror.source,nestedIn:mirror.nestedIn});
    }
    for (const entries of positions.values()) entries.filter(x=>!x.nestedIn).sort((a,b)=>a.offset-b.offset).forEach((entry,i)=> {
      if (entry.order !== i) errors.push(`${entry.source}: source order differs`);
    });
    for (const external of manifest.external) fs.accessSync(path.join(root, external.source));
  } catch (error) {errors.push(error.message);}
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--root')) {
    console.error('Usage: node tools/clair/check-mirrors.mjs [--root directory]');
    process.exitCode = 1;
  } else {
    const errors = checkMirrors(args.length ? path.resolve(args[1]) : undefined);
    if (errors.length) {console.error(errors.join('\n')); process.exitCode = 1;}
    else console.log('PASS: declared mirrors and external exceptions; containers and source order match');
  }
}
