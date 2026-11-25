import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
// Contrôle lexical seulement : ne remplace pas une exécution dans LuaJIT/X-Plane.
function checkLexical(source){
 const stack=[];let i=0;
 while(i<source.length){
  if(source.startsWith('--',i)){const long=source.slice(i+2).match(/^\[(=*)\[/);if(long){const end=source.indexOf(']'+long[1]+']',i+2+long[0].length);assert.ok(end>=0,'commentaire long fermé');i=end+long[1].length+2;}else{i=source.indexOf('\n',i);if(i<0)break;}continue;}
  const long=source.slice(i).match(/^\[(=*)\[/);if(long){const end=source.indexOf(']'+long[1]+']',i+long[0].length);assert.ok(end>=0,'texte long fermé');i=end+long[1].length+2;continue;}
  const c=source[i];if(c==='"'||c==="'"){const q=c;i++;let closed=false;while(i<source.length){if(source[i]==='\\'){i+=2;continue;}assert.notEqual(source[i],'\n','pas de chaîne courte non fermée');if(source[i++]===q){closed=true;break;}}assert.ok(closed,'chaîne fermée');continue;}
  if('({['.includes(c))stack.push(c);if(')}]'.includes(c))assert.equal(stack.pop(),{')':'(',']':'[','}':'{'}[c]);i++;
 }assert.deepEqual(stack,[]);
}
for(const name of ['DEFA_objects.lua','DEFA_objects_core.lua'])test(name+' : chaînes et délimiteurs fermés',()=>{const text=fs.readFileSync(new URL('../runtime/'+name,import.meta.url),'utf8');checkLexical(text);});
test('une seule boucle et un seul nettoyage sont enregistrés',()=>{const text=fs.readFileSync(new URL('../runtime/DEFA_objects.lua',import.meta.url),'utf8');assert.equal(text.match(/function DEFA_objects_tick\(\)/g)?.length,1);assert.equal(text.match(/function DEFA_objects_stop\(\)/g)?.length,1);assert.equal(text.match(/do_every_frame\(/g)?.length,1);assert.equal(text.match(/do_on_exit\(/g)?.length,1);});
test('sonde terrain JoinFS : chaînes et délimiteurs fermés',()=>checkLexical(fs.readFileSync(new URL('../joinfs/terrain-probe.lua',import.meta.url),'utf8')));
