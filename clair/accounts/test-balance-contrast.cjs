const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync(process.argv[2]||__dirname+'/../index.html','utf8'),css=html.match(/<style>([\s\S]*?)<\/style>/)[1];
// Resolve the class-only negative-color rules against the actual card ancestry.
// This exercises the cascade (including !important), not the spelling of a fix.
function matches(selector,ancestors){
 const parts=selector.trim().split(/\s+/);if(parts.some(p=>!/^([.][\w-]+)+$/.test(p)))return false;
 const has=(part,classes)=>part.slice(1).split('.').every(c=>classes.includes(c));
 if(!has(parts.pop(),ancestors[0]))return false;
 let i=1;while(parts.length){const part=parts.pop();while(i<ancestors.length&&!has(part,ancestors[i]))i++;if(i>=ancestors.length)return false;i++;}return true;
}
function color(ancestors){
 const candidates=[];let order=0;
 for(const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
  order++;if(!match[1].includes('.negative'))continue;
  const colors=[...match[2].matchAll(/(?:^|;)\s*color\s*:\s*([^;]+)/g)];
  for(const selector of match[1].split(','))if(matches(selector,ancestors))for(const declaration of colors){const value=declaration[1].trim();candidates.push({value:value.replace(/\s*!important\s*$/,''),rank:[/!important/.test(value)?1:0,(selector.match(/\./g)||[]).length,order]});}
 }
 assert(candidates.length,'No negative color rule matched the card');
 candidates.sort((a,b)=>{for(let i=0;i<3;i++){const d=a.rank[i]-b.rank[i];if(d)return d;}return 0;});
 let value=candidates.at(-1).value;
 if(value==='var(--red)')value=css.match(/--red:(#[\da-f]+)/i)[1];
 if(value==='inherit')value='#fff';
 return value;
}
function luminance(hex){let digits=hex.replace('#','');if(digits.length===3)digits=digits.split('').map(c=>c+c).join('');assert.match(digits,/^[\da-f]{6}$/i);const channels=[0,2,4].map(i=>parseInt(digits.slice(i,i+2),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;}
const cards=[
 [['balance','negative'],['balance-readout'],['balance-companion-row'],['balance-section']],
 [['negative'],['forecast-result'],['balance-summary'],['balance-section']]
];
assert.equal(color(cards[0]),'#fff','Negative balance stays readable');
assert.equal(color(cards[1]),'#c91a3f','Shortfall must be red, not white');
for(const [i,ancestry] of cards.entries()){const text=luminance(color(ancestry));for(const background of (i===0?['#43206b','#642b91']:['#fff'])){const bg=luminance(background),contrast=(Math.max(text,bg)+.05)/(Math.min(text,bg)+.05);assert(contrast>=4.5,`Negative text contrast too low: ${contrast.toFixed(2)}:1 against ${background}`);}}
console.log('PASS: white negative balance and red shortfall win the CSS cascade and exceed 4.5:1 on violet balance and white forecast cards');

