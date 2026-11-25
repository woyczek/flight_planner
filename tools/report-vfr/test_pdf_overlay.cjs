/* Map interaction contracts, exercised without a browser or network. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'vac-app.js'),'utf8').replace(/\ninit\(\);\s*$/,'\n');
assert(!/\ninit\(\);\s*$/.test(code));

function fixture(){
 const elements=new Map(),images=[],draws=[],layerOrder=[];
 function element(id){if(!elements.has(id))elements.set(id,{value:'',checked:true,hidden:false,disabled:false,attrs:{},textContent:'',setAttribute(k,v){this.attrs[k]=v;},replaceChildren(){}});return elements.get(id);}
 element('sourcePage').value='VAC:1';element('pdfPage').value='VAC:1';element('pdfOpacity').value='65';element('pdfDarkness').value='0';element('sourcePanel').hidden=true;
 const layers=new Map(['roads','hidden-buildings','trace-halo','trace-focus','trace-lines'].map(id=>[id,{id,layout:{visibility:id==='hidden-buildings'?'none':'visible'},paint:{}}]));
 const sources=new Map([['vac-traces',{setData(value){this.data=value;}}]]);
 const fakeMap={getLayer:id=>layers.get(id),getSource:id=>sources.get(id),addSource(id,options){sources.set(id,{...options,updateImage(image){Object.assign(this,image);}});},
  addLayer(layer,before){layers.set(layer.id,{layout:{},paint:{},...layer});layerOrder.push([layer.id,before]);},
  setLayoutProperty(id,key,value){layers.get(id).layout[key]=value;},setPaintProperty(id,key,value){layers.get(id).paint[key]=value;}};
 let canvasCount=0;
 const context=vm.createContext({console,Map,Image:class{constructor(){this.naturalWidth=8;this.naturalHeight=10;images.push(this);}},
  window:{addEventListener(){}},document:{getElementById:element,querySelector:()=>({content:'token'}),createElement(tag){assert.equal(tag,'canvas');const n=++canvasCount;return{getContext:()=>({drawImage(...args){draws.push(args);}}),toDataURL:()=>`data:image/png;base64,test${n}`};}}});
 vm.runInContext(code,context);
 context.fakeMap=fakeMap;
 vm.runInContext(`map=fakeMap;mapReady=true;baseVisibility=new Map([['roads','visible'],['hidden-buildings','none']]);
 current={ad:{ad:'TEST',points:[],vac:{sources:{VAC:{sha256:'vac'},VACH:{sha256:'vach'}},charts:{
 VAC:{pages:[{pdfPage:1,widthPt:400,heightPt:600,image:'VAC-TEST-1.png',calibration:{longitude:[0,1,400,2],latitude:[0,48,600,47]},features:[]}]},
 VACH:{pages:[{pdfPage:2,widthPt:400,heightPt:600,image:'VACH-TEST-2.png',calibration:{longitude:[0,1,400,2],latitude:[0,48,600,47]},features:[]}]}}}}};`,context);
 return{run:s=>vm.runInContext(s,context),element,images,layers,sources,draws,layerOrder};
}

test('PDF corners and reprojected rows align with the parser calibration',()=>{
 const f=fixture(),ad=JSON.parse(fs.readFileSync(path.join(__dirname,'../../data/sia/vac/base/LFBD.json'),'utf8'));
 const page=ad.vac.charts.VAC.pages.find(p=>p.pdfPage===2);f.run(`globalThis.page=${JSON.stringify(page)};`);
 const corners=JSON.parse(f.run('JSON.stringify(pdfCorners(page))'));
 assert(corners[0][0]<corners[1][0]);assert(corners[0][1]>corners[3][1]);
 for(const fraction of [0,.1,.37,.5,.9,1]){
  const error=f.run(`(()=>{const top=lonlat(page.calibration,[0,0])[1],bottom=lonlat(page.calibration,[0,page.heightPt])[1];const lat=top+(bottom-top)*pdfSourceRow(page,${fraction});return mercatorY(lat)-(mercatorY(top)+(mercatorY(bottom)-mercatorY(top))*${fraction});})()`);
  assert(Math.abs(error)<1e-12);
 }
});
test('PDF is beneath traces, with independent opacity and darkness',()=>{
 const f=fixture();f.run('syncPdfOverlay()');assert.equal(f.images.length,1);f.images[0].onload();
 assert.deepEqual(f.layerOrder,[['vac-pdf-layer','trace-halo']]);assert.equal(f.draws.length,10);
 const raster=f.layers.get('vac-pdf-layer');assert.equal(raster.paint['raster-opacity'],.65);
 f.element('pdfDarkness').value='40';f.run('syncPdfOverlay()');assert.equal(raster.paint['raster-brightness-max'],.6);
 assert.equal(raster.paint['raster-opacity'],.65);
});
test('PDF-only hides all extracted data, restores state and never moves the camera',()=>{
 const f=fixture(),before=f.run('JSON.stringify(current)');f.run('syncPdfOverlay()');f.images[0].onload();
 f.run('togglePdfOnly()');
 for(const id of ['roads','hidden-buildings','trace-halo','trace-focus','trace-lines'])assert.equal(f.layers.get(id).layout.visibility,'none');
 assert.equal(f.layers.get('vac-pdf-layer').paint['raster-opacity'],1);assert.equal(f.element('sourceSvg').hidden,true);
 assert.equal(f.element('pdfOpacity').disabled,true);
 f.run('togglePdfOnly()');assert.equal(f.layers.get('roads').layout.visibility,'visible');assert.equal(f.layers.get('hidden-buildings').layout.visibility,'none');
 assert.equal(f.layers.get('trace-lines').layout.visibility,'visible');assert.equal(f.layers.get('vac-pdf-layer').paint['raster-opacity'],.65);
 assert.equal(f.element('pdfOpacity').value,'65');assert.equal(f.run('JSON.stringify(current)'),before);
});
test('Changing VAC/VACH pages never installs a late image from the previous page',()=>{
 const f=fixture();f.run('syncPdfOverlay()');
 f.run("selectPdfPage('VACH:2')");assert.equal(f.element('pdfPage').value,'VACH:2');assert.equal(f.images.length,2);
 f.images[0].onload();assert.equal(f.sources.has('vac-pdf-source'),false);
 f.images[1].onload();assert.equal(f.run('pdfOverlayKey'),'TEST:VACH:2:vach');
 f.run("selectPdfPage('VAC:1')");assert.equal(f.run('pdfOverlayKey'),'TEST:VAC:1:vac');assert.equal(f.images.length,2);
});
test('Hiding PDF and loading errors leave the trace layer intact',()=>{
 const f=fixture();f.run('syncPdfOverlay()');f.images[0].onload();f.element('showPDF').checked=false;f.run('syncPdfOverlay()');
 assert.equal(f.layers.get('vac-pdf-layer').layout.visibility,'none');assert.equal(f.layers.get('trace-lines').layout.visibility,'visible');
 f.run("selectPdfPage('VACH:2')");f.images[1].onerror();assert.match(f.element('pdfStatus').textContent,/indisponible/);
 assert.equal(f.layers.get('vac-pdf-layer').layout.visibility,'none');assert.equal(f.layers.get('trace-lines').layout.visibility,'visible');
});
test('Shared occlusion endpoints stay linked and export only one point correction',()=>{
 const f=fixture(),ad=JSON.parse(fs.readFileSync(path.join(__dirname,'../../data/sia/vac/base/LFBD.json'),'utf8'));
 f.run(`current={base:${JSON.stringify(ad)},ad:linkSharedVertices(${JSON.stringify(ad)})};`);
 f.run(`globalThis.feature=features().find(o=>o.feature.key==='NA-NW').feature;globalThis.bridge=feature.segments.find(s=>s.origin==='cartographic_continuation');globalThis.vertex=bridge.vertices[0];vertex.coordinates=[vertex.coordinates[0]+.0001,vertex.coordinates[1]];`);
 assert.equal(f.run('currentPatch().points.length'),1);
 assert.equal(f.run(`feature.segments.flatMap(s=>s.vertices).filter(v=>v.id===vertex.id).every(v=>v===vertex)`),true);
});
test('Inclusion arrows follow a corrected bound vertex and retain their source direction',()=>{
 const f=fixture(),ad=JSON.parse(fs.readFileSync(path.join(__dirname,'../../data/sia/vac/base/LFAJ.json'),'utf8'));
 f.run(`current={ad:linkSharedVertices(${JSON.stringify(ad)})};globalThis.feature=features()[0].feature;globalThis.marker=feature.directionArrows[0];globalThis.byid=new Map(allVertices(current.ad).map(o=>[o.vertex.id,o.vertex]));globalThis.before=arrowState(marker,byid);`);
 const delta=f.run(`(()=>{const v=byid.get(marker.anchorVertexRef);v.coordinates=[v.coordinates[0]+.0002,v.coordinates[1]];const after=arrowState(marker,byid);return after.coordinates[0]-before.coordinates[0];})()`);
 assert(Math.abs(delta-.0002)<1e-10);assert.equal(f.run('arrowGeojson().features.length'),2);
});
test('An AD without calibrated pages exits PDF-only and restores the map',()=>{
 const f=fixture();f.run('syncPdfOverlay()');f.images[0].onload();f.run('togglePdfOnly()');
 f.run('current.ad.vac.charts={};syncPdfOverlay()');
 assert.equal(f.run('pdfOnly'),false);assert.equal(f.layers.get('roads').layout.visibility,'visible');assert.equal(f.layers.get('vac-pdf-layer').layout.visibility,'none');
 assert.equal(f.element('pdfOnly').disabled,true);
});
