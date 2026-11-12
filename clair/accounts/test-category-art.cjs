// Pure presentation contracts. Fictional categories only; no account or network access.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const file=path.join(__dirname,'category-art.js'),source=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';
function fixture(){
 const images=[],events={},document={readyState:'complete',documentElement:{dataset:{}},querySelectorAll:()=>[],addEventListener:(type,callback)=>{events[type]=callback}};
 class Image{constructor(){images.push(this);}set src(value){this.url=value;}get src(){return this.url;}}
 const sandbox={document,Image,console,URL,Map,Set,WeakMap,WeakSet,Promise,MutationObserver:class{observe(){}},setTimeout:()=>1,clearTimeout(){}};
 sandbox.window=sandbox;vm.createContext(sandbox);vm.runInContext(source,sandbox);
 return {sandbox,images,document,events};
}
const f=fixture(),api=f.sandbox;
assert.equal(typeof api.resolveCategoryArt,'function','Category art must expose a resolver before it can decorate financial categories');
assert.equal(typeof api.categoryArtwork,'function');assert.equal(typeof api.initCategoryArt,'function');assert.equal(typeof api.enhanceCategorySelects,'function');
const ids=['alimentation','logement','transport','telephone','etudes','hygiene','vetements','famille','loisirs','abonnements','epargne','imprevus','non-classee','autre'];
const labels=['Alimentation','Logement','Transport','Téléphone','Études','Hygiène','Vêtements','Famille','Loisirs','Abonnements','Épargne','Imprévus','Non classée','Autre'];
const tiles=[0,3,2,10,5,11,6,12,7,13,8,14,15,15];
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),declaration=html.match(/const categories = (\[\{id:'alimentation'[\s\S]*?\]);/);
assert(declaration,'The existing financial category catalog must remain available');
const catalog=vm.runInNewContext(declaration[1]);
assert.deepEqual(Array.from(catalog,c=>c.id),ids,'Illustrations must not add or rename financial category IDs');
assert.deepEqual(Array.from(catalog,c=>c.label),labels,'Illustrations must preserve existing category labels');
for(let i=0;i<ids.length;i++){
 const category=Object.freeze({id:ids[i],label:labels[i],icon:'legacy'}),before=JSON.stringify(category),resolved=api.resolveCategoryArt(category);
 assert.equal(resolved.tile,tiles[i],ids[i]+' resolves to the corresponding illustration');
 assert.equal(resolved.label,labels[i]);assert.equal(JSON.stringify(category),before,'Resolving artwork must not rewrite a category');
 const rendered=api.categoryArtwork(category,{size:'sm'});assert.match(rendered,/<svg\b/,'Every illustration retains a local vector fallback');assert.match(rendered,/aria-hidden=["']true["']/,'Labeled artwork is decorative by default');
}
assert.equal(api.resolveCategoryArt({id:'income',label:'Sans catégorie (argent reçu)'}).tile,9);
for(const [id,label,tile]of [['personal-restaurant','Restaurant',1],['personal-health','Santé',4],['personal-pay','Salaire',9]]){
 const custom=Object.freeze({id,label});assert.equal(api.resolveCategoryArt(custom).tile,tile,'Known custom labels may select art without changing their ID');assert.equal(custom.id,id);
}
const unsafe=Object.freeze({id:'personal-unknown',label:'<img src=x onerror=alert(1)> & "catégorie"'}),rendered=api.categoryArtwork(unsafe,{label:unsafe.label,decorative:false});
assert.equal(api.resolveCategoryArt(unsafe).tile,15,'Unknown custom labels retain neutral artwork');
assert.doesNotMatch(rendered,/<img\b/i,'Custom category content cannot create markup');
assert.match(rendered,/&lt;img/);assert.match(rendered,/&amp;/);
assert.equal(api.resolveCategoryArt(null).tile,15,'Missing categories retain neutral artwork');
console.log('PASS immutable category IDs/labels, built-in/custom resolution, escaped custom content and decorative vector fallback');
for(const outcome of ['load','error']){
 const g=fixture();g.sandbox.initCategoryArt();g.sandbox.initCategoryArt();g.sandbox.enhanceCategorySelects();
 assert.equal(g.images.length,1,'A document preloads the atlas once, including repeated initialization');
 assert.match(g.images[0].url,/assets\/categories\/atlas-v1\.webp$/);
 const handler=g.images[0]['on'+outcome];assert.equal(typeof handler,'function');handler();
 assert.equal(g.document.documentElement.dataset.categoryArt,outcome==='load'?'ready':'failed','Atlas failure keeps an explicit fallback state');
 g.sandbox.initCategoryArt();assert.equal(g.images.length,1,'A failed atlas must not create a repeated request loop');
}
console.log('PASS single atlas preload, ready/error state and no failed-request loop');
