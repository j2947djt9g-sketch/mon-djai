const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
(async () => {
  const modulePath = path.resolve(__dirname, '../../tools/clair/check-mirrors.mjs');
  assert.ok(fs.existsSync(modulePath), 'mirror checker must exist');
  const {checkMirrors} = await import(modulePath);
  const root = path.resolve(__dirname, '../..');
  assert.deepEqual(checkMirrors(root), [], 'current deliverable must have no drift');
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'clair-mirrors-'));
  const htmlPath = path.join(fixture, 'clair/index.html');
  fs.cpSync(path.join(root, 'clair'), path.join(fixture, 'clair'), {recursive:true});
  fs.cpSync(path.join(root, 'tools'), path.join(fixture, 'tools'), {recursive:true});
  const original = fs.readFileSync(htmlPath, 'utf8');
  const source = fs.readFileSync(path.join(root, 'clair/accounts/cloud.js'), 'utf8').trim();
  const reject = (name, html) => {
    fs.writeFileSync(htmlPath, html);
    assert.ok(checkMirrors(fixture).length > 0, name);
    console.log('PASS:', name);
  };
  try {
    reject('missing copy', original.replace(source, ''));
    reject('one changed character', original.replace(source, source.replace('Clair', 'clair')));
    reject('duplicate executable copy', original.replace(source, source+'\n'+source));
    reject('copy hidden in HTML comment', original.replace(source, '').replace('</head>', '<!--<script>'+source+'</script>--></head>'));
    reject('copy in wrong container', original.replace(source, '').replace('</style>', source+'</style>'));
    const auth = fs.readFileSync(path.join(root,'clair/accounts/auth-email.js'),'utf8').trim();
    reject('changed module order', original.replace(source+'\n'+auth, auth+'\n'+source));
    reject('non-executable script container', original.replace('<script>/* Clair account sync.', '<script type="application/json">/* Clair account sync.'));
    const opening = '<script>/* Clair account sync.';
    for (const attrs of [
      'type="application/json" data-type="text/javascript"',
      `type="application/json" title='type="text/javascript"'`,
      'src="external.js" data-src=""',
      `src=external.js title='src=""'`
    ]) reject('non-executable attributes: '+attrs, original.replace(opening, '<script '+attrs+'>/* Clair account sync.'));
    for (const tag of ['textarea','title','xmp','iframe','noembed','noframes','plaintext']) {
      reject('mirror hidden in '+tag, original.replace(opening, '<'+tag+'>'+opening));
    }
    for (const attrs of ['data-src="external.js"', `title='src="external.js" type="application/json" >'`, 'type="text/javascript" data-type="application/json"']) {
      fs.writeFileSync(htmlPath, original.replace(opening, '<script '+attrs+'>/* Clair account sync.'));
      assert.deepEqual(checkMirrors(fixture), [], 'actual attributes only: '+attrs);
    }
    fs.writeFileSync(htmlPath, original.replace(opening, '<script>const commentLooking = "<!-- <textarea><script> -->";\n/* Clair account sync.'));
    assert.deepEqual(checkMirrors(fixture), [], 'comment-looking script text stays raw');
    const css = fs.readFileSync(path.join(root,'clair/accounts/device-unlock.css'),'utf8').trim();
    reject('duplicate CSS copy', original.replace(css, css+'\n'+css));
    fs.writeFileSync(htmlPath, original);
    fs.writeFileSync(path.join(fixture,'clair/accounts/unlisted.js'),'void 0;');
    assert.ok(checkMirrors(fixture).length > 0, 'unlisted JS must fail inventory');
    fs.unlinkSync(path.join(fixture,'clair/accounts/unlisted.js'));
    assert.deepEqual(checkMirrors(fixture), [], 'three explicit external exceptions are admitted');
    for(const directory of ['domain','application']){
      const unlisted=path.join(fixture,'clair',directory,'unlisted.js');fs.writeFileSync(unlisted,'void 0;');
      assert.ok(checkMirrors(fixture).length>0,'unlisted '+directory+' module must fail inventory');fs.unlinkSync(unlisted);
    }
    fs.unlinkSync(path.join(fixture,'clair/accounts/cloud.js'));
    assert.ok(checkMirrors(fixture).length > 0, 'missing canonical file');
    console.log('PASS: independent inventory, external exceptions, missing canonical file');
  } finally {fs.rmSync(fixture,{recursive:true,force:true});}
})().catch(error => {console.error(error); process.exitCode=1;});
