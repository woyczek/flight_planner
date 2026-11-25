'use strict';
const $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const copy=o=>JSON.parse(JSON.stringify(o)), token=document.querySelector('meta[name="vac-token"]').content;
let inventory=[], testOrder=[], current=null, selectedFeature=null, selectedVertex=null, map=null, mapReady=false, vertices=[], reports=[], sessions=new Map(), pendingLoad=0;
let pdfOnly=false, pdfOverlayKey=null, baseVisibility=new Map();
let pdfLoadingKey=null, pdfRequestedKey=null, pdfRasterErrorKey=null;
const pdfRasterCache=new Map();
const PDF_SOURCE='vac-pdf-source', PDF_LAYER='vac-pdf-layer';
const empty=()=>({type:'FeatureCollection',features:[]});
function features(ad=current?.ad){return Object.entries(ad?.vac?.charts||{}).flatMap(([kind,c])=>(c.pages||[]).flatMap(p=>p.features.map(f=>({kind,page:p,feature:f}))));}
function visible(kind){return $(kind==='VAC'?'showVAC':'showVACH').checked;}
function allVertices(ad){return[...new Map(features(ad).flatMap(({kind,page,feature})=>feature.segments.flatMap(s=>s.vertices.map(vertex=>[vertex.id,{kind,page,feature,vertex}])))).values()];}
function linkSharedVertices(ad){const shared=new Map();for(const {feature}of features(ad))for(const segment of feature.segments)segment.vertices=segment.vertices.map(v=>{if(!shared.has(v.id))shared.set(v.id,v);return shared.get(v.id);});return ad;}
function pointItems(ad){return (ad.points||[]).filter(p=>Array.isArray(p.coordinates)).map(p=>({kind:p.chartKind||'VAC',point:p}));}
function sourcesha(kind){return current.ad.vac.sources[kind]?.sha256;}
function xy(cal,ll){let[x1,a,x2,b]=cal.longitude,[y1,c,y2,d]=cal.latitude;return[x1+(ll[0]-a)*(x2-x1)/(b-a),y1+(ll[1]-c)*(y2-y1)/(d-c)];}
async function api(url,options={}){let r=await fetch(url,options),v=await r.json();if(!r.ok)throw new Error(v.error||`Erreur HTTP ${r.status}`);return v;}
function lonlat(cal,p){let[x1,a,x2,b]=cal.longitude,[y1,c,y2,d]=cal.latitude;return[a+(p[0]-x1)*(b-a)/(x2-x1),c+(p[1]-y1)*(d-c)/(y2-y1)];}
function pdfCorners(page){return[[0,0],[page.widthPt,0],[page.widthPt,page.heightPt],[0,page.heightPt]].map(p=>lonlat(page.calibration,p));}
function mercatorY(latitude){return Math.log(Math.tan(Math.PI/4+latitude*Math.PI/360));}
function pdfSourceRow(page,fraction){
 const top=lonlat(page.calibration,[0,0])[1],bottom=lonlat(page.calibration,[0,page.heightPt])[1];
 const projected=mercatorY(top)+(mercatorY(bottom)-mercatorY(top))*fraction;
 const latitude=(2*Math.atan(Math.exp(projected))-Math.PI/2)*180/Math.PI;
 return Math.max(0,Math.min(1,(latitude-top)/(bottom-top)));
}
function warpPdfImage(page,image){
 // The parser uses linear latitude; MapLibre interpolates the image in Mercator.
 // Reproject image rows so the original ink and the extracted WGS84 vertices coincide.
 const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Rendu PDF indisponible');
 for(let row=0;row<canvas.height;row++){
  const start=pdfSourceRow(page,row/canvas.height)*canvas.height,end=pdfSourceRow(page,(row+1)/canvas.height)*canvas.height;
  ctx.drawImage(image,0,start,canvas.width,Math.max(.000001,end-start),0,row,canvas.width,1);
 }
 return canvas.toDataURL('image/png');
}
function installPdfRaster(key,page,url){
 if(!mapReady||pdfRequestedKey!==key)return;
 const image={url,coordinates:pdfCorners(page)};
 if(!map.getSource(PDF_SOURCE)){
  map.addSource(PDF_SOURCE,{type:'image',...image});
  map.addLayer({id:PDF_LAYER,type:'raster',source:PDF_SOURCE,paint:{'raster-fade-duration':0}},'trace-halo');
 }else map.getSource(PDF_SOURCE).updateImage(image);
 pdfOverlayKey=key;syncPdfOverlay();
}
function loadPdfRaster(key,page){
 if(pdfRasterCache.has(key)){installPdfRaster(key,page,pdfRasterCache.get(key));return;}
 if(pdfLoadingKey===key||pdfRasterErrorKey===key)return;
 pdfLoadingKey=key;const image=new Image();
 const fail=()=>{if(pdfLoadingKey===key)pdfLoadingKey=null;pdfRasterErrorKey=key;if(pdfRequestedKey===key)$('pdfStatus').textContent='PDF indisponible · recharge la page';};
 image.onerror=fail;image.onload=()=>{
  if(pdfLoadingKey===key)pdfLoadingKey=null;
  try{const url=warpPdfImage(page,image);pdfRasterCache.set(key,url);if(pdfRasterCache.size>4)pdfRasterCache.delete(pdfRasterCache.keys().next().value);installPdfRaster(key,page,url);}catch(e){fail();}
 };
 image.src='/previews/'+page.image;
}
function selectedPdfPage(){const [kind,num]=($('sourcePage').value||'').split(':');return{kind,page:current?.ad.vac.charts[kind]?.pages?.find(p=>p.pdfPage===Number(num))};}
function selectPdfPage(value){$('sourcePage').value=value;$('pdfPage').value=value;syncPdfOverlay();drawSource();}
function syncPdfOverlay(){
 const {kind,page}=selectedPdfPage(),hasPage=Boolean(page);if(!hasPage)pdfOnly=false;
 const show=hasPage&&($('showPDF').checked||pdfOnly);
 const opacity=pdfOnly?1:Number($('pdfOpacity').value)/100, darkness=Number($('pdfDarkness').value)/100;
 $('pdfOpacityValue').textContent=`${Math.round(opacity*100)} %`;$('pdfDarknessValue').textContent=`${Math.round(darkness*100)} %`;
 $('pdfOpacity').disabled=pdfOnly||!hasPage;$('pdfDarkness').disabled=!hasPage;$('showPDF').disabled=pdfOnly||!hasPage;$('pdfOnly').disabled=!hasPage;
 $('pdfOnly').setAttribute('aria-pressed',String(pdfOnly));$('sourceSvg').hidden=pdfOnly;
 $('pdfStatus').textContent=hasPage?(pdfOnly?'Original seul · tracé masqué':`${kind} · p.${page.pdfPage}${show?'':' · masqué'}`):'Pas de page géoréférencée';
 if(!mapReady)return;
 if(hasPage){
  const key=`${current.ad.ad}:${kind}:${page.pdfPage}:${current.ad.vac.sources[kind].sha256}`;
  pdfRequestedKey=key;
  if(pdfOverlayKey!==key){$('pdfStatus').textContent=pdfRasterErrorKey===key?'PDF indisponible · recharge la page':'Chargement du PDF…';loadPdfRaster(key,page);}
 }else{
  pdfRequestedKey=null;
 }
 if(map.getLayer(PDF_LAYER)){
  map.setLayoutProperty(PDF_LAYER,'visibility',show&&pdfOverlayKey===pdfRequestedKey?'visible':'none');
  map.setPaintProperty(PDF_LAYER,'raster-opacity',opacity);map.setPaintProperty(PDF_LAYER,'raster-brightness-max',1-darkness);
 }
 for(const [id,visibility]of baseVisibility)if(map.getLayer(id))map.setLayoutProperty(id,'visibility',pdfOnly?'none':visibility);
 for(const id of ['trace-halo','trace-focus','trace-lines','direction-arrows'])if(map.getLayer(id))map.setLayoutProperty(id,'visibility',pdfOnly?'none':'visible');
}
function togglePdfOnly(){
 if(!selectedPdfPage().page)return;
 pdfOnly=!pdfOnly;syncPdfOverlay();updateMap();drawSource();
}
function status(message,error=false){$('saveStatus').textContent=message;$('saveStatus').classList.toggle('error-text',error);}
function currentPatch(){
 const points=[], fields=[], originals=new Map(allVertices(current.base).map(o=>[o.vertex.id,o]));
 for(const o of allVertices(current.ad)){
  const original=originals.get(o.vertex.id)?.vertex;if(!original)continue;
  if(o.vertex.coordinates.some((x,i)=>Math.abs(x-original.coordinates[i])>1e-11))points.push({id:o.vertex.id,coordinates:o.vertex.coordinates,sourceSha256:o.feature.sourceSha256,chartKind:o.kind});
 }
 const origPoints=new Map(pointItems(current.base).map(o=>[o.point.id,o]));
 for(const {kind,point} of pointItems(current.ad)){
  const orig=origPoints.get(point.id)?.point;
  if(orig&&point.coordinates.some((x,i)=>Math.abs(x-orig.coordinates[i])>1e-11))points.push({id:point.id,coordinates:point.coordinates,sourceSha256:sourcesha(kind),chartKind:kind});
 }
 for(const row of current.ad.vac.circuits){
  const orig=current.base.vac.circuits.find(c=>c.id===row.id&&c.chartKind===row.chartKind), values={};
  for(const k of ['altitudeFt','heightFt','hand'])if(row[k]!==orig[k])values[k]=row[k];
  if(Object.keys(values).length)fields.push({id:row.id,chartKind:row.chartKind,sourceSha256:row.sourceSha256,values});
 }
 return{schemaVersion:'1.0',icao:current.ad.ad,points,fields};
}
function signature(p){return JSON.stringify({points:p.points.map(x=>[x.id,x.coordinates]),fields:p.fields.map(x=>[x.id,x.values])});}
function changed(){
 const patch=currentPatch();current.patch=patch;const sig=signature(patch);
 current.dirtyPatch=sig!==current.savedPatchSig;current.dirtyTarget=sig!==current.savedTargetSig;
 $('savePatch').disabled=!current.dirtyPatch;$('saveTarget').disabled=!current.dirtyTarget;
 $('undo').disabled=!current.undo.length;$('reset').disabled=!(patch.points.length||patch.fields.length);
 const values=patch.fields.reduce((n,row)=>n+Object.keys(row.values).length,0);
 status(`${patch.points.length} point(s) déplacé(s) · ${patch.fields.length} ligne(s) TDP modifiée(s), ${values} valeur(s). ${current.dirtyPatch?'Corrections à enregistrer.':'Corrections enregistrées.'} ${current.dirtyTarget?'JSON cible à écrire.':'JSON cible à jour.'}`);
 updatePointBox();drawSource();updateMap();
}
function checkpoint(){current.undo.push(copy(current.ad));if(current.undo.length>40)current.undo.shift();}
function renderInventory(){
 const q=$('search').value.trim().toUpperCase(),only=$('testsOnly').checked;
 const rows=inventory.filter(a=>(!only||testOrder.includes(a.icao))&&(!q||(a.icao+' '+(a.name||'')).toUpperCase().includes(q)));
 $('count').textContent=rows.length+' / '+inventory.length;$('ads').replaceChildren();
 for(const a of rows){let b=document.createElement('button');b.className='ad'+(current?.ad.ad===a.icao?' active':'');b.dataset.icao=a.icao;
 const labels={extracted:`${a.features} tracés · relu`,automatic:`${a.features} candidats`,needs_georeferencing:'Calage à faire',text_only:'Textes extraits',stale_review:'Source modifiée',error:'Erreur',inventoried:'Non extrait'};
 b.innerHTML=`<div><strong>${esc(a.icao)}</strong><span>${esc(a.name||'Inventorié · extraction à faire')}</span></div><small>${esc(Object.keys(a.sources).join(' / '))}<br>${esc(labels[a.status]||a.status)}</small>`;
 b.onclick=()=>loadAD(a.icao);$('ads').append(b);}
}
async function loadAD(code){
 const req=++pendingLoad;
 try{
  let s=sessions.get(code);
  if(!s){let data=await api('/api/ad/'+code);if(req!==pendingLoad)return;
   s={...data,ad:linkSharedVertices(data.ad),undo:[],patch:data.patch,dirtyPatch:false,dirtyTarget:false};
   current=s;let normalized=currentPatch();s.savedPatchSig=signature(normalized);
   // Target may differ from stored corrections after action 1. Read its signature through bootstrap.
   s.savedTargetSig=signature(data.targetPatch||{points:[],fields:[]});sessions.set(code,s);
  }
  if(req!==pendingLoad)return;current=s;selectedFeature=features()[0]?.feature.id||null;selectedVertex=null;
  renderInventory();renderDetails();populateSourcePages();changed();fitAll();
 }catch(e){if(req===pendingLoad)status(e.message,true);}
}
function renderDetails(){
 const a=current.ad,entry=inventory.find(e=>e.icao===a.ad),v=a.vac;
 $('adTitle').textContent=`${a.ad} · ${entry.name||''}`;$('adSubtitle').textContent=`${features().length} tracés extraits · ${a.points.length} points publiés / repères · analyse partielle`;
 const rows=v.circuits.filter(c=>visible(c.chartKind));
 $('details').innerHTML=`<div class="name">${esc(entry.name||a.ad)}</div><div class="elevation"><div class="metric"><b>${v.terrainElevationFt??'—'} <small>ft</small></b>Altitude terrain</div>${v.fatoElevationFt!=null?`<div class="metric"><b>${v.fatoElevationFt} <small>ft</small></b>Altitude FATO</div>`:''}</div>
 <div class="notice">${v.extractionMode==='automatic_candidates'?'Extraction automatique candidate. Pistes, mains, sens et restrictions restent à relire.':'Sélections relues sur les cartes locales ; portée partielle.'} Calage géographique à vérifier.</div>
 <div class="hint">${Object.entries(v.sources).flatMap(([kind,src])=>[`<a href="/source/${kind}/${a.ad}" target="_blank" rel="noopener">Ouvrir ${kind}</a>`,...(src.supplements||[]).map((p,i)=>`<a href="/source/${kind}/${a.ad}/${i}" target="_blank" rel="noopener">Complément ${esc(kind)} : ${esc(p.name)}</a>`)]).join(' · ')}</div>
 ${(v.quality?.unresolvedMapPages||[]).length?`<p class="notice">${v.quality.unresolvedMapPages.length} page(s) avec calage non résolu : les tracés correspondants ne sont pas placés sur la carte.</p>`:''}
 <h3>Tracé à contrôler</h3><select id="featureSelect" aria-label="Tracé sélectionné"></select><div id="routeInfo" class="route-info"></div>
 <div id="pointBox" hidden class="point-box"></div>
 <h3>Tours de piste · ft</h3><table class="circuit-table"><thead><tr><th>Carte / piste</th><th>Main</th><th>ALT</th><th>HGT</th></tr></thead><tbody>${rows.map((r,i)=>`<tr data-circuit="${esc(r.id)}" data-kind="${r.chartKind}"><td>${esc(r.chartKind)} ${esc(r.runway)}<span class="variant">${esc(r.id.split(':').at(-1))} · p.${r.pdfPage}</span></td><td><select data-field="hand" aria-label="Main ${esc(r.runway)}"><option value="">?</option><option ${r.hand==='MG'?'selected':''}>MG</option><option ${r.hand==='MD'?'selected':''}>MD</option></select></td><td><input aria-label="Altitude ${esc(r.runway)}" data-field="altitudeFt" type="number" min="0" max="30000" value="${r.altitudeFt??''}"></td><td><input aria-label="Hauteur ${esc(r.runway)}" data-field="heightFt" type="number" min="0" max="30000" value="${r.heightFt??''}"></td></tr>${r.conditions?`<tr><td colspan="4" class="hint">${esc(r.conditions)}</td></tr>`:''}`).join('')||'<tr><td colspan="4">Pas de TDP identifié pour cette sélection.</td></tr>'}</tbody></table>
 <p class="hint">MG = main gauche · MD = main droite. ALT et HGT sont les valeurs publiées, parfois arrondies. « ? » = non établi.</p>
 ${(v.circuitCandidates||[]).length?`<details><summary>Valeurs ALT / HGT candidates sans piste (${v.circuitCandidates.length})</summary>${v.circuitCandidates.map(c=>`<div class="sequence">${esc(c.chartKind)} · p.${c.pdfPage} · ${c.altitudeFt} (${c.heightFt}) ft<small>À identifier : TDP, route ou autre annotation ; piste et main non établies.</small></div>`).join('')}</details>`:''}
 <details><summary>Points et repères publiés (${a.points.length})</summary><div id="reportList"></div></details>
 ${v.procedureSequences?.length?`<details><summary>Séquences par piste (${v.procedureSequences.length})</summary>${v.procedureSequences.map(s=>`<div class="sequence">${esc(s.chartKind)} · ${esc(s.runways.join('/'))} · ${esc(s.pointCodes.join(' ↔ '))}<small>${esc(JSON.stringify(s.conditions))}</small></div>`).join('')}</details>`:''}
 <details><summary>Lecture de la carte et limites</summary>${Object.entries(v.charts).map(([kind,c])=>`<h3>${kind}</h3>${(c.notes||[]).map(t=>`<p>${esc(t)}</p>`).join('')}<p class="hint">SHA-256 ${esc(c.source?.sha256)}</p>`).join('')}</details>
 <details><summary>Consignes sources · texte extrait</summary><select id="noteSelect" aria-label="Page des consignes"></select><pre id="noteText" class="notes"></pre></details>`;
 const fs=features().filter(o=>visible(o.kind)),sel=$('featureSelect');
 for(const {kind,feature:f}of fs){const o=new Option(`${kind} · ${f.label}`,f.id);sel.add(o);}
 if(!fs.some(o=>o.feature.id===selectedFeature))selectedFeature=fs[0]?.feature.id||null;
 sel.value=selectedFeature||'';sel.onchange=()=>chooseFeature(sel.value);
 document.querySelectorAll('[data-field]').forEach(el=>el.onchange=()=>{
  const tr=el.closest('tr'),row=v.circuits.find(c=>c.id===tr.dataset.circuit&&c.chartKind===tr.dataset.kind),field=el.dataset.field;
  if(field!=='hand'&&!el.checkValidity()){el.reportValidity();return;}
  checkpoint();row[field]=el.value===''?null:(field==='hand'?el.value:Number(el.value));changed();
 });
 const list=$('reportList');for(const {kind,point:p}of pointItems(a)){let b=document.createElement('button');b.style.cssText='font-size:10px;padding:4px;margin:2px';b.textContent=kind+' '+p.code;b.onclick=()=>selectPoint(p.id,true);list.append(b);}
 const notes=a.notes||[],ns=$('noteSelect');notes.forEach((n,i)=>ns.add(new Option(`${n.chartKind||'VAC'} · p.${n.page} · ${n.title||''}`,i)));
 ns.onchange=()=>{$('noteText').textContent=notes[ns.value]?.text||'';};ns.onchange();updateRouteInfo();
}
function updateRouteInfo(){const f=features().find(o=>o.feature.id===selectedFeature)?.feature;
 $('routeInfo').textContent=f?`${f.mandatory?'DÉPART OBLIGATOIRE · '+(f.runways||[]).join('/')+' · ':''}${f.segments.length} branche(s) · ${new Set(f.segments.flatMap(s=>s.vertices.map(v=>v.id))).size} sommets · page ${f.pdfPage} · ${f.direction==='both'?'double sens':f.direction==='forward'?'sens publié':'sens non structuré'}${f.conditions?' · '+JSON.stringify(f.conditions):''}`:'Aucun tracé pour cette couche.';
}
function chooseFeature(id){selectedFeature=id;selectedVertex=null;updateRouteInfo();updatePointBox();updateMap();const o=features().find(x=>x.feature.id===id);if(o){selectPdfPage(o.kind+':'+o.page.pdfPage);fitFeature(o.feature);}}
function selectPoint(id,fly=false){selectedVertex=id;const o=allVertices(current.ad).find(o=>o.vertex.id===id),p=pointItems(current.ad).find(o=>o.point.id===id);
 if(o){selectedFeature=o.feature.id;$('featureSelect').value=selectedFeature;selectPdfPage(o.kind+':'+o.page.pdfPage);updateRouteInfo();}
 else if(p){const page=current.ad.vac.charts[p.kind]?.pages?.[0];if(page)selectPdfPage(p.kind+':'+page.pdfPage);}
 updatePointBox();updateMap();drawSource();const coord=o?.vertex.coordinates||p?.point.coordinates;if(fly&&map&&coord)map.flyTo({center:coord,zoom:Math.max(map.getZoom(),13),duration:500});
}
function updatePointBox(){if(!$('pointBox'))return;const o=allVertices(current.ad).find(o=>o.vertex.id===selectedVertex),p=pointItems(current.ad).find(o=>o.point.id===selectedVertex),item=o?.vertex||p?.point;
 $('pointBox').hidden=!item;if(!item)return;
 $('pointBox').innerHTML=`<h3 style="margin:0 0 5px">Sommet sélectionné</h3><div class="point-label">${esc(item.id)}</div><div class="coordinate-inputs"><label>Longitude<input id="pointLon" type="number" step="0.000001" min="-180" max="180" value="${item.coordinates[0].toFixed(7)}"></label><label>Latitude<input id="pointLat" type="number" step="0.000001" min="-90" max="90" value="${item.coordinates[1].toFixed(7)}"></label></div><button id="applyCoord">Appliquer les coordonnées</button><div class="hint">Déplacement possible avec la souris sur la carte.</div>`;
 $('applyCoord').onclick=()=>{const lon=Number($('pointLon').value),lat=Number($('pointLat').value);if(!$('pointLon').value||!$('pointLat').value||!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lon)>180||Math.abs(lat)>90){status('Coordonnées invalides.',true);return;}checkpoint();item.coordinates=[lon,lat];changed();};
}
function geojson(){const result=empty();for(const {kind,feature:f}of features()){if(!visible(kind))continue;for(const s of f.segments){if(s.vertices.length<2)continue;result.features.push({type:'Feature',properties:{id:f.id,kind,color:f.displayColor||(kind==='VACH'?'#009c48':'#181818'),mandatory:Boolean(f.mandatory),selected:f.id===selectedFeature?1:0,label:f.label},geometry:{type:'LineString',coordinates:s.vertices.map(v=>v.coordinates)}});}}return result;}
function arrowState(marker,vertexMap){
 const tip=vertexMap.get(marker.anchorVertexRef)?.coordinates,start=vertexMap.get(marker.fromVertexRef)?.coordinates;
 const coordinates=tip?tip.map((x,i)=>x+marker.anchorOffsetLonLat[i]):marker.coordinates;
 const from=start?start.map((x,i)=>x+marker.fromOffsetLonLat[i]):marker.fromCoordinates;
 const rad=Math.PI/180,lat1=from[1]*rad,lat2=coordinates[1]*rad,dl=(coordinates[0]-from[0])*rad;
 const rotation=(Math.atan2(Math.sin(dl)*Math.cos(lat2),Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(dl))/rad+360)%360;
 return{coordinates,from,rotation};
}
function arrowGeojson(){const result=empty(),byid=new Map(allVertices(current?.ad).map(o=>[o.vertex.id,o.vertex]));for(const {kind,feature:f}of features()){if(!visible(kind))continue;for(const marker of f.directionArrows||[]){const a=arrowState(marker,byid);result.features.push({type:'Feature',properties:{id:f.id,rotation:a.rotation,label:f.label,icon:f.mandatory?'departure':kind==='VACH'?'inclusion-green':'inclusion-black'},geometry:{type:'Point',coordinates:a.coordinates}});}}return result;}
function addDirectionIcons(){for(const [name,color]of [['inclusion-black','#181818'],['inclusion-green','#009c48'],['departure','#972e9d']]){const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;const ctx=canvas.getContext('2d');ctx.beginPath();ctx.moveTo(16,2);ctx.lineTo(27,27);ctx.lineTo(16,21);ctx.lineTo(5,27);ctx.closePath();ctx.fillStyle=color;ctx.strokeStyle='#ffffff';ctx.lineWidth=3;ctx.lineJoin='round';ctx.stroke();ctx.fill();map.addImage(name,ctx.getImageData(0,0,32,32),{pixelRatio:1.5});}}
function updateMap(){
 if(!mapReady)return;map.getSource('vac-traces').setData(geojson());map.getSource('vac-directions')?.setData(arrowGeojson());vertices.forEach(m=>m.remove());reports.forEach(m=>m.remove());vertices=[];reports=[];
 if(!current)return;
 if(pdfOnly){$('selectionStatus').textContent='PDF seul · fond OpenFreeMap, tracés extraits et points masqués · même zoom';return;}
 for(const {kind,point:p}of pointItems(current.ad)){if(!visible(kind))continue;let el=document.createElement('div');el.className='report-marker'+(kind==='VACH'?' hel':'');el.textContent=p.code;el.title=p.label||p.sourceText||p.code;
 let m=new maplibregl.Marker({element:el,draggable:true}).setLngLat(p.coordinates).addTo(map);
 el.onclick=e=>{e.stopPropagation();selectPoint(p.id);};m.on('dragstart',()=>checkpoint());m.on('dragend',()=>{let ll=m.getLngLat();p.coordinates=[ll.lng,ll.lat];selectedVertex=p.id;changed();});reports.push(m);}
 const chosen=features().find(o=>o.feature.id===selectedFeature);if(!chosen||!visible(chosen.kind)){$('selectionStatus').textContent=`${current.ad.ad} · pas de tracé géoréférencé dans cette sélection`;return;}
 const placed=new Set();for(const s of chosen.feature.segments)for(const v of s.vertices){if(placed.has(v.id))continue;placed.add(v.id);let el=document.createElement('div');el.className='vertex'+(v.id===selectedVertex?' selected':'')+(v.coordinates.some((n,i)=>Math.abs(n-v.sourceCoordinates[i])>1e-11)?' changed':'');el.title=v.id;
 let m=new maplibregl.Marker({element:el,draggable:true}).setLngLat(v.coordinates).addTo(map);el.onclick=e=>{e.stopPropagation();selectPoint(v.id);};
 m.on('dragstart',()=>{checkpoint();selectedVertex=v.id;});m.on('drag',()=>{const ll=m.getLngLat();v.coordinates=[ll.lng,ll.lat];map.getSource('vac-traces').setData(geojson());map.getSource('vac-directions')?.setData(arrowGeojson());});m.on('dragend',()=>changed());vertices.push(m);}
 const n=chosen.feature.segments.reduce((n,s)=>n+s.vertices.length,0);$('selectionStatus').textContent=`${chosen.feature.label} · ${n} sommets déplaçables · orange = extraction, rouge = correction`;
}
function fitCoords(coords){if(!mapReady||!coords.length)return;const b=new maplibregl.LngLatBounds();coords.forEach(c=>b.extend(c));const toolbar=document.querySelector('.map-toolbar');map.fitBounds(b,{padding:{top:Math.ceil(toolbar?.getBoundingClientRect().height||155)+40,left:65,right:$('sourcePanel').hidden?65:Math.min(460,map.getContainer().clientWidth*.47),bottom:85},maxZoom:15,duration:500});}
function fitAll(){if(pdfOnly){const {page}=selectedPdfPage();if(page)fitCoords(pdfCorners(page));return;}let coords=features().filter(o=>visible(o.kind)).flatMap(o=>o.feature.segments.flatMap(s=>s.vertices.map(v=>v.coordinates)));if(!coords.length&&current){coords=pointItems(current.ad).map(o=>o.point.coordinates);if(!coords.length)coords=Object.values(current.ad.vac.referencePoints||{});}fitCoords(coords);}
function fitFeature(f){fitCoords(f.segments.flatMap(s=>s.vertices.map(v=>v.coordinates)));}
function populateSourcePages(){const sel=$('sourcePage'),pdf=$('pdfPage');sel.replaceChildren();pdf.replaceChildren();for(const [kind,c]of Object.entries(current.ad.vac.charts))for(const p of c.pages||[]){const label=`${kind} · page ${p.pdfPage}`,value=`${kind}:${p.pdfPage}`;sel.add(new Option(label,value));pdf.add(new Option(label,value));}const chosen=features().find(o=>o.feature.id===selectedFeature);selectPdfPage(chosen?chosen.kind+':'+chosen.page.pdfPage:sel.value);}
function drawSource(){if(!current||$('sourcePanel').hidden)return;const [kind,num]=$('sourcePage').value.split(':'),p=current.ad.vac.charts[kind]?.pages?.find(p=>p.pdfPage===Number(num));if(!p)return;
 $('sourceImage').src='/previews/'+p.image;$('pdfLink').href=`/source/${kind}/${current.ad.ad}#page=${num}`;
 const svg=$('sourceSvg');svg.setAttribute('viewBox',`0 0 ${p.widthPt} ${p.heightPt}`);svg.replaceChildren();svg.hidden=pdfOnly;if(pdfOnly)return;
 const f=p.features.find(f=>f.id===selectedFeature);if(!f)return;
 for(const s of f.segments){const pl=document.createElementNS('http://www.w3.org/2000/svg','polyline');pl.setAttribute('points',s.vertices.map(v=>v.pdfXY.join(',')).join(' '));pl.setAttribute('fill','none');pl.setAttribute('stroke','#e18b20');pl.setAttribute('stroke-width','1');svg.append(pl);
 for(const v of s.vertices){const pos=xy(p.calibration,v.coordinates),c=document.createElementNS('http://www.w3.org/2000/svg','circle');c.setAttribute('cx',pos[0]);c.setAttribute('cy',pos[1]);c.setAttribute('r',v.id===selectedVertex?'3.4':'1.8');c.setAttribute('fill',v.coordinates.some((n,i)=>Math.abs(n-v.sourceCoordinates[i])>1e-11)?'#db3732':'#e89929');c.setAttribute('stroke','#fff');c.setAttribute('stroke-width','.5');c.onclick=()=>selectPoint(v.id,true);svg.append(c);}}
 const byid=new Map(allVertices(current.ad).map(o=>[o.vertex.id,o.vertex]));
 for(const marker of f.directionArrows||[]){const a=arrowState(marker,byid),tip=xy(p.calibration,a.coordinates),from=xy(p.calibration,a.from),angle=Math.atan2(tip[1]-from[1],tip[0]-from[0]),u=[Math.cos(angle),Math.sin(angle)],n=[-u[1],u[0]],head=document.createElementNS('http://www.w3.org/2000/svg','polygon');head.setAttribute('points',[tip,[tip[0]-6*u[0]+2.5*n[0],tip[1]-6*u[1]+2.5*n[1]],[tip[0]-4.5*u[0],tip[1]-4.5*u[1]],[tip[0]-6*u[0]-2.5*n[0],tip[1]-6*u[1]-2.5*n[1]]].map(q=>q.join(',')).join(' '));head.setAttribute('fill',f.displayColor||(kind==='VACH'?'#009c48':'#181818'));head.setAttribute('stroke','#fff');head.setAttribute('stroke-width','.6');svg.append(head);}
}
async function save(which){if(!current)return;const s=current,patch=currentPatch(),code=s.ad.ad,expectedRevision=which==='corrections'?s.patchRevision:s.targetRevision;
 const button=$(which==='corrections'?'savePatch':'saveTarget');button.disabled=true;
 try{const r=await api(`/api/${which}/${code}`,{method:'POST',headers:{'Content-Type':'application/json','X-VAC-Token':token},body:JSON.stringify({patch,expectedRevision})});
  if(which==='corrections'){s.patchRevision=r.revision;s.savedPatchSig=signature(patch);}else{s.targetRevision=r.revision;s.savedTargetSig=signature(patch);}
  if(current===s){changed();const values=patch.fields.reduce((n,row)=>n+Object.keys(row.values).length,0);status(`Écrit : ${r.path} · ${r.savedPoints} point(s) déplacé(s), ${r.savedFields} ligne(s) TDP, ${values} valeur(s).`);}
 }catch(e){if(current===s){changed();status(e.message,true);}}
}
async function init(){
 try{const r=await api('/api/inventory');inventory=r.aerodromes;testOrder=r.testOrder||[];if(r.processingScope==='all')$('testsOnly').checked=false;const processed=inventory.filter(a=>!['inventoried','error'].includes(a.status)).length;$('globalStatus').textContent=`${processed} / ${inventory.length} AD analysés · ${inventory.filter(a=>a.status==='extracted').length} sélections relues${r.complete===false?' · traitement en cours':''}`;
 $('search').oninput=renderInventory;$('testsOnly').onchange=renderInventory;
 $('showVAC').onchange=$('showVACH').onchange=()=>{if(current){renderDetails();changed();}};
 $('savePatch').onclick=()=>save('corrections');$('saveTarget').onclick=()=>save('target');
 $('undo').onclick=()=>{if(current?.undo.length){current.ad=linkSharedVertices(current.undo.pop());renderDetails();changed();}};
 $('reset').onclick=()=>{checkpoint();current.ad=linkSharedVertices(copy(current.base));selectedVertex=null;renderDetails();changed();};
 $('sourceToggle').onclick=()=>{$('sourcePanel').hidden=!$('sourcePanel').hidden;drawSource();};$('sourceClose').onclick=()=>{$('sourcePanel').hidden=true;};$('sourcePage').onchange=()=>selectPdfPage($('sourcePage').value);$('fit').onclick=fitAll;
 $('pdfPage').onchange=()=>selectPdfPage($('pdfPage').value);$('showPDF').onchange=syncPdfOverlay;$('pdfOpacity').oninput=$('pdfDarkness').oninput=syncPdfOverlay;$('pdfOnly').onclick=togglePdfOnly;
 if(window.ResizeObserver){new ResizeObserver(entries=>{const h=entries[0].target.getBoundingClientRect().height;document.querySelector('main').style.setProperty('--map-toolbar-bottom',`${Math.ceil(h)+32}px`);}).observe(document.querySelector('.map-toolbar'));}
 renderInventory();
 if(window.maplibregl){try{map=new maplibregl.Map({container:'map',style:'https://tiles.openfreemap.org/styles/liberty',center:[-1.2,47.4],zoom:6,attributionControl:true});map.addControl(new maplibregl.NavigationControl(),'top-right');map.addControl(new maplibregl.ScaleControl({unit:'metric'}));
  map.on('load',()=>{mapReady=true;baseVisibility=new Map(map.getStyle().layers.map(l=>[l.id,l.layout?.visibility||'visible']));map.addSource('vac-traces',{type:'geojson',data:empty()});
   map.addLayer({id:'trace-halo',type:'line',source:'vac-traces',paint:{'line-color':'#ffffff','line-width':7,'line-opacity':.85}});
   map.addLayer({id:'trace-focus',type:'line',source:'vac-traces',filter:['==',['get','selected'],1],paint:{'line-color':'#e9a534','line-width':8,'line-opacity':.55}});
   map.addLayer({id:'trace-lines',type:'line',source:'vac-traces',paint:{'line-color':['get','color'],'line-width':3.2}});
   addDirectionIcons();map.addSource('vac-directions',{type:'geojson',data:empty()});map.addLayer({id:'direction-arrows',type:'symbol',source:'vac-directions',layout:{'icon-image':['get','icon'],'icon-rotate':['get','rotation'],'icon-rotation-alignment':'map','icon-pitch-alignment':'map','icon-anchor':'top','icon-allow-overlap':true,'icon-ignore-placement':true}});
   map.on('click','trace-lines',e=>{if(e.features?.[0]){const id=e.features[0].properties.id;$('featureSelect').value=id;chooseFeature(id);}});
   map.on('click','direction-arrows',e=>{if(e.features?.[0]){const id=e.features[0].properties.id;$('featureSelect').value=id;chooseFeature(id);}});
   map.on('mouseenter','trace-lines',()=>{map.getCanvas().style.cursor='pointer';});map.on('mouseleave','trace-lines',()=>{map.getCanvas().style.cursor='';});
   syncPdfOverlay();updateMap();fitAll();});
  map.on('error',e=>{const message=e.error?.message||'Erreur de carte';if(/fetch|Failed|network|404/i.test(message)){$('mapError').hidden=false;$('mapError').textContent='Fond de carte indisponible : '+message+'. Les données et la carte source restent accessibles.';}});
 }catch(e){$('mapError').hidden=false;$('mapError').textContent='Carte indisponible : '+e.message;}}
 else{$('mapError').hidden=false;$('mapError').textContent='MapLibre ne s’est pas chargé. Vérifie l’accès Internet, puis recharge la page. La carte source et les champs restent accessibles.';}
 await loadAD('LFAJ');
 }catch(e){$('globalStatus').textContent='Chargement impossible';status(e.message,true);}
}
window.addEventListener('beforeunload',e=>{if([...sessions.values()].some(s=>s.dirtyPatch||s.dirtyTarget)){e.preventDefault();e.returnValue='';}});
init();
