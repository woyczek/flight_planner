"""Construit apps/planner/map_planner.html (« Cartes de vol », accessible à tous) à partir du studio cartographique du
Centre (apps/cpco/map_parser.html) : même moteur de rendu, mêmes profils d'affichage, même bloc « Route » (champ de
route en case 15, carte et coupe verticale liées), sans le bloc Mission du Centre.

La page publique ajoute, après le bloc Route, un bloc « Cartes » : rendez-vous facultatif, choix des cartes (route,
approche, rendez-vous, destination) et l'action. Elle crée une mission locale dans son propre espace
du navigateur (SIA_MISSION_NS = 'planner') d'après la route du champ : la mission du générateur et du studio du Centre
n'est jamais touchée.

v2 (niveaux d'utilisation) : aux niveaux 1 à 3, la page se limite au bloc « Route » (champ de route, niveau, SimBrief,
aperçu et « Agrandir ») et au bloc « Cartes », dont l'unique bouton « Générer les cartes et le ZIP » crée les cartes
puis lance la génération, compte rendu juste dessous ; le reste du studio (recherche de route, tracé, réglages des
profils, « Cartes à produire », « Aperçus et génération », pied de page, base SIA) porte data-min-level="4" ici
seulement. Au niveau 4, le bloc « Cartes » garde « Préparer les cartes » (liste « Cartes à produire ») et la génération
reste celle du studio (pied de page).

Ton foncé, comme les autres outils (Carburant, Atterrissages) : la page porte <html data-tool="dark"> (palette « outil
sombre » de repository_nav.css : --bg, --card, --card-2, --field, --ink, --muted, --line, --ok, --warn, --bad) et reçoit
TONE_CSS, en couche « app » après les styles du studio : surfaces, champs, boutons, onglets des profils, aperçus, pied de
page passent en ton foncé, accent du thème (--repo-accent) ; les cartes (canvas, images, marqueurs) gardent leurs
couleurs. Les designs (designs.css, designs_skeuo.css, hors couche) s'appliquent par-dessus. Le studio reste clair.

À relancer après chaque modification du studio (la page publique n'est pas éditée à la main) :
    python tools/build_map_planner.py
"""
import os, re, sys

sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SRC = os.path.join(ROOT, 'apps', 'cpco', 'map_parser.html')
OUT = os.path.join(ROOT, 'apps', 'planner', 'map_planner.html')

# titre, sous-titre et boutons : écrits par VOL_SCRIPT (K.t, avant le cadre de page qui les lit)
# bloc « Base de données SIA » de Cartes de vol (le studio n'a plus qu'un panneau sous sa ligne d'état, masqué ici)
SIA_BASE_BLOCK = '''<section data-block-id="sia-base" data-min-level="4" data-default-hidden="1" data-icon="database" data-subtitle="Dossier SIA (AIXM) lu et gardé dans le navigateur."><h2>Base de données SIA</h2>
<p class="small">Dossier <code>data/sia</code> (mémorisé comme les autres dossiers de la suite) : « Relire le dossier » après une mise à jour AIRAC. Le fond de carte et les villes sont livrés avec l’application. Même bloc que Paramètres › Maintenance › Mise à jour SIA (étape 4).</p>
<div id="siaBasePanel"></div></section>
'''
VOL_BLOCK = r'''<section data-block-id="vol" data-icon="plane">
<h2 id="volTitle"></h2>
<div class="volForm">
<label>Rendez-vous (facultatif)<input id="volRdv" spellcheck="false" placeholder="point ou « 44.2, 0.6 »"></label>
<label>Dégagement (OACI, facultatif)<input id="volAltn" spellcheck="false" placeholder="LFBD" maxlength="4"></label>
</div>
<div class="volMaps"><span class="small">Cartes :</span>
<label class="check"><input type="checkbox" data-volmap="topo" checked> route (vue d’ensemble, IFR)</label>
<label class="check"><input type="checkbox" data-volmap="approche" checked> approche</label>
<label class="check"><input type="checkbox" data-volmap="rdv" checked> rendez-vous</label>
<label class="check"><input type="checkbox" data-volmap="destination" checked> destination</label>
</div>
<div class="actions"><button id="volGenerate" type="button" data-icon="map" data-max-level="3"></button><button id="volBuild" type="button" data-icon="map" data-min-level="4"></button></div>
<p id="volStatus" data-status class="small"></p>
<div id="volGallery" class="volGallery" hidden></div>
</section>

'''

VOL_CSS = '''.volForm{display:grid;grid-template-columns:repeat(2,minmax(0,260px));gap:8px 12px;align-items:end}.volForm label{display:grid;gap:3px;font-size:13px}
#volStatus:empty{display:none}
[data-block-id="vol"] #result:not(:empty){margin-top:6px}
.volMaps{display:flex;flex-wrap:wrap;gap:4px 14px;align-items:center;margin:8px 0 2px}
#vprofPtsBox{display:none!important}
.volGallery{margin-top:10px}.volGalleryBar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 8px}.volGalleryBar b{flex:1}
.volGalleryGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
.volGalleryGrid figure{margin:0;display:grid;gap:6px;padding:6px;border:1px solid var(--line,#8884);border-radius:calc(8px*var(--repo-round,1))}
.volGalleryGrid img{width:100%;height:150px;object-fit:contain;background:var(--field,#fff);cursor:zoom-in}
.volGalleryGrid figcaption{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:12px}.volGalleryGrid figcaption span{flex:1 1 100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.volGalleryFiles{margin:8px 0 0;font-size:12px}
@media(max-width:800px){.volForm{grid-template-columns:1fr 1fr}}
'''

# Ton foncé de la page publique (le studio du Centre reste clair) : règles en couche « app », posées après celles du
# studio (même couche, ordre postérieur) ; palette « outil sombre » de repository_nav.css (html[data-tool="dark"]) et
# accent du thème. Les designs, hors couche, gardent la main sur les blocs, boutons et champs qu'ils habillent.
TONE_CSS = '''<style id="plannerTone" data-layer="app">
@layer app {
  :root {
    color-scheme: dark;
    color: var(--ink);
    background: var(--bg)
  }
  section {
    background: var(--card);
    border-color: var(--line);
    box-shadow: 0 2px 10px #0000004d
  }
  .sub,
  .small,
  .studio-footer .small {
    color: var(--muted)
  }
  .box,
  .aliasCard,
  .previewCard,
  #osmLivePreview,
  #generalPreview,
  #assemblyPreview {
    border-color: var(--line)
  }
  .previewCard {
    background: var(--card-2)
  }
  .previewCard img,
  #generalPreview,
  #assemblyPreview {
    background: var(--field)
  }
  input,
  select,
  textarea,
  .colorRow input[type=color],
  .aarPick summary,
  .aarOptions,
  .vprof-chip {
    border-color: var(--line);
    background: var(--field);
    color: var(--ink)
  }
  input[type=checkbox],
  input[type=radio],
  input[type=range] {
    accent-color: var(--repo-accent)
  }
  .vprof-chip.on {
    background: #ffe08a;
    border-color: #d69600;
    color: #17202a
  }
  button,
  .buttonLink {
    border: 1px solid color-mix(in srgb, var(--repo-accent) 55%, transparent);
    background: color-mix(in srgb, var(--repo-accent) 26%, var(--card));
    color: var(--ink)
  }
  button:hover:not(:disabled),
  .buttonLink:hover {
    background: color-mix(in srgb, var(--repo-accent) 38%, var(--card))
  }
  .danger {
    border-color: var(--bad)
  }
  section a:not([class*="repo-"]):not(.buttonLink) {
    color: var(--repo-accent)
  }
  .warn {
    border-left-color: var(--warn);
    background: color-mix(in srgb, var(--warn) 14%, var(--card));
    color: var(--ink)
  }
  .ok {
    color: var(--ok)
  }
  .err,
  .mapRow .mapDel {
    color: var(--bad)
  }
  code {
    background: var(--soft)
  }
  .profileTabs {
    border-bottom-color: var(--repo-accent)
  }
  .profileTabs button {
    border-color: var(--line);
    border-bottom: 0;
    background: var(--card-2);
    color: var(--muted)
  }
  .profileTabs button:hover:not(.on) {
    background: var(--soft);
    color: var(--ink)
  }
  .profileTabs button.on {
    border-color: var(--repo-accent);
    background: color-mix(in srgb, var(--repo-accent) 30%, var(--card));
    color: var(--ink)
  }
  .mapRow.on .mapShow {
    color: var(--repo-accent)
  }
  .mapProfileRow,
  .mapRow {
    border-bottom-color: var(--line)
  }
  .elemBox.nested,
  .profileEdit,
  .mapList {
    border-top-color: var(--line)
  }
  .galleryMission {
    border-bottom-color: var(--line)
  }
  .zoneChips li {
    border-color: var(--line);
    background: var(--card-2)
  }
  .zoneChips li.none {
    border-color: var(--bad);
    background: color-mix(in srgb, var(--bad) 18%, var(--card))
  }
  .splitter {
    background: linear-gradient(90deg, transparent 4px, var(--line) 4px, var(--line) 8px, transparent 8px)
  }
  .splitter:hover,
  .splitter.drag {
    background: linear-gradient(90deg, transparent 3px, var(--repo-accent) 3px, var(--repo-accent) 9px, transparent 9px)
  }
  .profilePreview.popped {
    background: var(--card)
  }
  .studio-footer {
    background: color-mix(in srgb, var(--card) 94%, transparent);
    border-top-color: var(--line);
    box-shadow: 0 -4px 16px #00000066
  }
}
</style>
'''

VOL_SCRIPT = r'''<script src="../../shared/external_links.js?v=0"></script>
<script>
// « Ouvrir dans ▾ » (shared/external_links.js) dans l'en-tête : SimBrief, SkyVector, cartes des terrains, d'après la
// route du bloc Route, son niveau et l'avion choisi (profil du Carburant, flightPerfState), lus à l'ouverture
(()=>{const host=document.getElementById('extLinks');if(!host||!window.ExternalLinks)return;
ExternalLinks.menu(host,()=>{let st={};try{st=JSON.parse(localStorage.getItem('flightPerfState')||'{}')||{}}catch{}
const id=document.getElementById('vprofAircraft')?.value,p=(id&&st.profiles?.[id])||st.profiles?.[st.lastAircraft]||{};
const m=/^(FL)?(\d{1,5})(FT)?$/.exec(String(document.getElementById('vprofCruise')?.value||'').toUpperCase().replace(/\s+/g,'')),ft=m?(m[1]?+m[2]*100:+m[2]):0;
return{route:document.getElementById('vprofRoute')?.value||'',fl:ft?Math.round(ft/100):'',type:p.icao||p.type||'',reg:p.registration||'',callsign:p.callsign||'',altn:document.getElementById('volAltn')?.value||''}})})();
</script>
<script>
// ===== Cartes de vol (page publique) : bloc « Cartes » =====
// La route est celle du bloc Route (champ vprofRoute, case 15) : points lus par SiaProfile.parseRoute (base SIA du
// navigateur : aérodromes, balises, points RNAV, voies aériennes) ; mission locale (espace « planner ») envoyée au
// moteur du studio (useDoc) : points de la route, cartes topographique, approche, rendez-vous, destination, profil.
(()=>{
const FORM_KEY='mapPlannerForm:v1',$v=id=>document.getElementById(id),K=window.RepositoryKit;
// niveau d'utilisation (html[data-level], posé avant le rendu) : niveau 4 = studio complet
const full=(+document.documentElement.dataset.level||4)>=4;
// textes du bloc, traduits à la source : ce script passe avant le cadre de page (titre, sous-titre, icônes)
document.querySelector('section[data-block-id="vol"]').dataset.subtitle=K.t(['Rendez-vous facultatif et cartes à choisir d’après la route du bloc « Route ».','Optional rendezvous and maps to choose from the route of the “Route” block.','Optionaler Treffpunkt und auszuwählende Karten nach der Route des Blocks „Route“.','Encuentro opcional y mapas que elegir según la ruta del bloque «Ruta».']);
$v('volTitle').textContent=K.t(['Cartes','Maps','Karten','Mapas']);
$v('volGenerate').textContent=K.t(['Générer les cartes','Generate the maps','Karten erzeugen','Generar los mapas']);
$v('volBuild').textContent=K.t(['Préparer les cartes','Prepare the maps','Karten vorbereiten','Preparar los mapas']);
// niveaux 1 à 3 : « Aperçus et génération » est rangé au niveau 4 ; le compte rendu de la génération (#result du
// studio, avec « Réessayer seule ») passe sous l'action du bloc, une fois au chargement (le niveau change en rechargeant)
if(!full)$v('volStatus').after($v('result'));
const say=(html,kind)=>{$v('volStatus').innerHTML=kind?`<span class="${kind}">${html}</span>`:html};
const levelFt=t=>{const m=/^(FL)?(\d{1,5})(FT)?$/.exec(String(t||'').toUpperCase().replace(/\s+/g,''));return m?(m[1]?+m[2]*100:+m[2]):null};
const coord=t=>{const m=/^\s*(-?\d+(?:\.\d+)?)\s*[,;| ]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(t||'');return m&&Math.abs(+m[1])<=90&&Math.abs(+m[2])<=180?{lat:+m[1],lon:+m[2]}:null};
const baseReady=()=>(aero?.aerodromes?.length||0)>0;
// plan de vol partagé avec le planificateur carburant (flightPlanShared:v1) : un seul FPL, le plus récent l'emporte
const FPL_KEY='flightPlanShared:v1',readFpl=()=>{try{return JSON.parse(localStorage.getItem(FPL_KEY)||'null')}catch{return null}};
// vol en cours partagé : route, niveau (FL), fiche de l'appareil, dégagement ; écrit seulement s'il change
function saveForm(){const route=$v('vprofRoute').value.trim(),ft=levelFt($v('vprofCruise').value);try{localStorage.setItem(FORM_KEY,JSON.stringify({route,rdv:$v('volRdv').value,altn:$v('volAltn').value,level:$v('vprofCruise').value,maps:[...document.querySelectorAll('[data-volmap]')].filter(i=>i.checked).map(i=>i.dataset.volmap),at:Date.now()}));const cur=readFpl()||{},next={route,fl:ft?String(Math.round(ft/100)):'',aircraft:$v('vprofAircraft').value||'',altn:$v('volAltn').value.trim().toUpperCase()};if(route&&Object.keys(next).some(k=>String(cur[k]||'')!==next[k]))localStorage.setItem(FPL_KEY,JSON.stringify({...next,at:Date.now(),by:'maps'}))}catch{}}
// vol voulu à l'ouverture (le plus récent du plan partagé et du formulaire) : repris par le démarrage, qui l'emporte sur la
// mission enregistrée (relue par le studio après ce script)
let wanted={route:'',aircraft:''};
function loadForm(){try{const f=JSON.parse(localStorage.getItem(FORM_KEY)||'null')||{},sh=readFpl(),fresh=sh?.route&&(sh.at||0)>(f.at||0),route=fresh?sh.route:f.route;if(route&&(!$v('vprofRoute').value.trim()||sh?.route===route))$v('vprofRoute').value=route;$v('volRdv').value=f.rdv||'';$v('volAltn').value=(fresh?sh.altn:f.altn)||'';const fl=fresh&&+sh.fl?`FL${+sh.fl}`:f.level;if(fl&&(fresh||!$v('vprofCruise').value))$v('vprofCruise').value=fl;if(Array.isArray(f.maps))document.querySelectorAll('[data-volmap]').forEach(i=>{i.checked=f.maps.includes(i.dataset.volmap)});wanted={route:route||'',aircraft:fresh?sh.aircraft||'':''}}catch{}}
/** Points de la route du champ (sans les points intermédiaires des voies aériennes) ; null et message si impossible. */
function routePoints(){
 if(!baseReady()){say(esc(K.t(['Base SIA absente de ce navigateur : bloc « Base de données SIA », « Reconstruire la base aéronautique », ou Paramètres › Maintenance.','SIA database missing from this browser: “SIA database” block, “Rebuild the aeronautical database”, or Settings › Maintenance.','SIA-Datenbank fehlt in diesem Browser: Block „SIA-Datenbank“, „Luftfahrtdatenbank neu aufbauen“, oder Einstellungen › Wartung.','Base SIA ausente de este navegador: bloque «Base de datos SIA», «Reconstruir la base aeronáutica», o Ajustes › Mantenimiento.'])),'err');return null}
 const{points,unknown}=SiaProfile.parseRoute($v('vprofRoute').value.trim(),SiaProfile.resolver({aero:aero||{}}));
 if(unknown.length){say(`Route : inconnu(s) dans la base SIA : ${esc(unknown.join(', '))}.`,'err');return null}
 const pts=points.filter(p=>!p.awy);
 if(pts.length<2){say('Route : au moins un départ et une destination (bloc « Route »).','err');return null}
 return pts;
}
// profils choisis à la main dans la liste des cartes (cette page) : gardés d'une création à l'autre ; les autres
// reprennent le profil par défaut de leur carte (route et approche : IFR ; destination, rendez-vous : VFR détaillé)
const userProfile=new Map();
document.addEventListener('change',e=>{const i=e.target?.dataset?.mapProfile;if(i!=null&&mission?.maps?.[+i])userProfile.set(mission.maps[+i].file,e.target.value)},true);
/** Crée (ou met à jour) la mission du vol et ses cartes ; quiet : sans message ni recentrage (route modifiée) ; gen :
 *  la génération suit (bouton des niveaux 1 à 3), l'aperçu est relancé par elle. */
function build(quiet,gen){
 const pts=routePoints();if(!pts)return false;const want=new Set([...document.querySelectorAll('[data-volmap]')].filter(i=>i.checked).map(i=>i.dataset.volmap));
 const idOf=(p,i)=>{const n=String(p.name||'').toUpperCase();return/^[A-Z0-9]{2,5}$/.test(n)?n:`P${i}`};
 let altn=null;const at=$v('volAltn').value.trim().toUpperCase();if(at){const q=SiaProfile.resolver({aero:aero||{}})(at);if(!q){say(`Dégagement inconnu : ${esc(at)}.`,'err');return false}altn={id:'ALTN',name:q.name||at,lat:q.lat,lon:q.lon}}
 let rdv=null;const rt=$v('volRdv').value.trim();if(rt){const c=coord(rt);if(c)rdv={id:'RDV',name:'RDV',...c};else{const q=SiaProfile.resolver({aero:aero||{}})(rt);if(!q){say(`Rendez-vous inconnu : ${esc(rt)}.`,'err');return false}rdv={id:'RDV',name:`RDV ${q.name||rt}`,lat:q.lat,lon:q.lon}}}
 const P=(p,i)=>({id:idOf(p,i),name:p.name||idOf(p,i),lat:+p.lat.toFixed(6),lon:+p.lon.toFixed(6)}),dep=P(pts[0],0),dest=P(pts[pts.length-1],pts.length-1),mid=pts.slice(1,-1).map((p,i)=>P(p,i+1)),ft=levelFt($v('vprofCruise').value);
 const maps=[];
 // carte de la route : profil IFR bas ou haut selon le niveau de croisière (seuil FL195)
 if(want.has('topo'))maps.push({filename:`route_${dep.id}_${dest.id}.png`,type:'general',description:'Carte de la route',profile:ft>=19500?'ifr-high':'ifr-low'});
 if(want.has('approche'))maps.push({filename:`approche_${dest.id}.png`,type:'approche',description:`Approche de ${dest.id}`,centre_ref:'DESTINATION',range_km:30});
 if(want.has('rdv')&&rdv)maps.push({filename:'rendez_vous.png',type:'rdv',description:'Rendez-vous',centre_ref:'RDV',range_km:15});
 if(want.has('destination'))maps.push({filename:`destination_${dest.id}.png`,type:'detail',description:`Terrain de destination ${dest.id}`,centre_ref:'DESTINATION'});
 if(!maps.length){say('Aucune carte choisie.','err');return false}
 const vp={...(sharedDoc?.yaml?.mission?.id==='VOL'?sharedDoc.yaml.vertical_profile:{}),route:$v('vprofRoute').value.trim(),cruise:ft?(ft>=6000?`FL${Math.round(ft/100)}`:String(ft)):undefined,aircraft:$v('vprofAircraft').value||undefined};
 vp.output=vp.output!==false; // profil vertical montré avec les cartes, sauf refus explicite
 const yaml={schema_version:'2.0',mission:{id:'VOL',title:`Vol ${dep.id} → ${dest.id}`,type:'Vol'},origin:dep,destination:dest,...(altn?{alternate:P(altn,0)}:{}),turning_points:mid,...(rdv?{rendezvous:[P(rdv,0)]}:{}),vertical_profile:vp,maps};
 const views=new Map((mission?.maps||[]).filter(m=>m._view).map(m=>[m.file,m._view]));
 for(const m of maps){const u=userProfile.get(m.filename);if(u)m.profile=u;const v=views.get(m.filename);if(v)m.view=v}
 try{const doc=SiaMission.save({yaml,narrative:{summary:'',detailed:'',sections:[]},sourceNames:[]},'planner');routeCache={};useDoc(doc,true,true);saveForm()}catch(e){say(esc(e.message),'err');return false}
 setTimeout(()=>{drawVprofPreview();if(!quiet&&!gen&&!$v('refreshPreview').disabled)$v('refreshPreview').click()},400);
 // suite indiquée selon le niveau : « Cartes à produire » et les aperçus n'existent qu'au niveau 4 ; aux niveaux 1 à 3,
 // le bouton « Générer les cartes et le ZIP » du bloc (lancée par lui : progression et compte rendu dans #result,
 // dessous ; sinon à lancer, après une arrivée ?fpl=1)
 if(!quiet){const list={n:maps.length,list:esc(maps.map(m=>m.description).join(', '))};say(gen?K.tf(['{n} carte(s) : {list}, et le profil vertical de la route.','{n} map(s): {list}, and the vertical profile of the route.','{n} Karte(n): {list}, und das Höhenprofil der Route.','{n} mapa(s): {list}, y el perfil vertical de la ruta.'],list):K.tf(full?['{n} carte(s) prête(s) : {list}, et le profil vertical de la route. Réglages et aperçus dans « Cartes à produire », fichiers dans « Aperçus et génération ».','{n} map(s) ready: {list}, and the vertical profile of the route. Settings and previews in “Maps to produce”, files in “Previews and generation”.','{n} Karte(n) bereit: {list}, und das Höhenprofil der Route. Einstellungen und Vorschauen unter „Zu erstellende Karten“, Dateien unter „Vorschauen und Erzeugung“.','{n} mapa(s) listo(s): {list}, y el perfil vertical de la ruta. Ajustes y vistas previas en «Mapas que producir», archivos en «Vistas previas y generación».']:['{n} carte(s) prête(s) : {list}, et le profil vertical de la route. Images : « Générer les cartes ».','{n} map(s) ready: {list}, and the vertical profile of the route. Images: “Generate the maps”.','{n} Karte(n) bereit: {list}, und das Höhenprofil der Route. Bilder: „Karten erzeugen“.','{n} mapa(s) listo(s): {list}, y el perfil vertical de la ruta. Imágenes: «Generar los mapas».'],list),'ok')}
 return true;
}
// mission reçue de Mes missions (autre qu'un vol « VOL » de cette page) : remplacée par le vol libre seulement après confirmation
$v('volBuild').onclick=async()=>{if(mission&&sharedDoc?.yaml?.mission?.id!=='VOL'&&!await window.AppFramework.ask(K.t(['Remplacer la mission chargée par un vol libre construit à partir du cheminement ?','Replace the loaded mission with a free flight built from the route?','Die geladene Mission durch einen freien Flug aus der Route ersetzen?','¿Sustituir la misión cargada por un vuelo libre construido a partir de la ruta?'])))return;build(false)};
// niveaux 1 à 3 : un seul bouton, cartes créées puis aperçu et génération des images par le moteur du studio, montrées
// dans la page (window.SiaDeliver, plus bas)
// (« Générer » du studio, masqué ici : compte rendu dans #result, sous ce bouton) ; mission reçue de Mes missions
// (autre qu'un vol « VOL » de cette page) : ses cartes sont générées telles quelles, sans les remplacer par celles du bloc
$v('volGenerate').onclick=async()=>{const b=$v('volGenerate'),own=!mission||sharedDoc?.yaml?.mission?.id==='VOL';if(b.disabled||(own&&!build(false,true)))return;b.disabled=true;try{await new Promise(r=>setTimeout(r,450));await $v('refreshPreview').onclick?.();if(mission&&outputMaps().length)await $v('generate').onclick()}finally{b.disabled=false}};
// ---- plus d'archive : les images générées (cartes, profil vertical) sont montrées dans la page, chacune téléchargeable
// ou imprimable, « Tout imprimer » ; « Réessayer seule » remplace son image (moteur du studio : deliverFiles)
let shown=[];
const GTX={count:['{n} image(s) générée(s)','{n} image(s) generated','{n} Bild(er) erzeugt','{n} imagen(es) generada(s)'],dl:['Télécharger','Download','Herunterladen','Descargar'],print:['Imprimer','Print','Drucken','Imprimir'],all:['Tout imprimer','Print all','Alle drucken','Imprimir todo'],files:['Autres fichiers :','Other files:','Weitere Dateien:','Otros archivos:']};
/** Imprime des images, une par page, dans une fenêtre à part. */
function printImages(list){const w=window.open('','_blank');if(!w)return;w.document.write(`<!doctype html><meta charset="utf-8"><title>${esc(K.t(['Cartes de vol','Flight maps','Flugkarten','Mapas de vuelo']))}</title><style>@page{margin:8mm}body{margin:0}img{display:block;max-width:100%;max-height:96vh;margin:0 auto;page-break-after:always}img:last-child{page-break-after:auto}</style>${list.map(f=>`<img src="${f.url}" alt="${esc(f.name)}">`).join('')}<script>addEventListener('load',()=>{print()})<\/script>`);w.document.close()}
/** Montre les fichiers générés : images PNG en vignettes (agrandir, télécharger, imprimer), autres fichiers en liens. */
function showFiles(files,info={}){const box=$v('volGallery'),add=files.map(f=>({name:f.name,png:/\.png$/i.test(f.name),url:URL.createObjectURL(new Blob([f.data],{type:/\.png$/i.test(f.name)?'image/png':/\.svg$/i.test(f.name)?'image/svg+xml':'text/plain'}))}));
 if(info.retry){shown=shown.filter(x=>{const out=add.some(a=>a.name===x.name);if(out)URL.revokeObjectURL(x.url);return!out}).concat(add)}else{shown.forEach(x=>URL.revokeObjectURL(x.url));shown=add}
 const imgs=shown.filter(f=>f.png),other=shown.filter(f=>!f.png);box.hidden=!shown.length;
 box.innerHTML=`<div class="volGalleryBar"><b>${esc(K.tf(GTX.count,{n:imgs.length}))}</b>${imgs.length?`<button type="button" data-print-all>${esc(K.t(GTX.all))}</button>`:''}</div><div class="volGalleryGrid">${imgs.map(f=>`<figure><img src="${f.url}" alt="${esc(f.name)}" title="${esc(f.name)}"><figcaption><span>${esc(f.name)}</span><a class="buttonLink" href="${f.url}" download="${esc(f.name)}">${esc(K.t(GTX.dl))}</a><button type="button" data-print="${esc(f.name)}">${esc(K.t(GTX.print))}</button></figcaption></figure>`).join('')}</div>${other.length?`<p class="volGalleryFiles">${esc(K.t(GTX.files))} ${other.map(f=>`<a href="${f.url}" download="${esc(f.name)}">${esc(f.name)}</a>`).join(' · ')}</p>`:''}`;
 if(!info.retry)box.scrollIntoView({block:'nearest',behavior:'smooth'})}
window.SiaDeliver=(files,info)=>showFiles(files,info);
$v('volGallery').addEventListener('click',e=>{const t=e.target;if(t.matches('img'))return enlargePreview(t.src,t.alt);if(t.dataset.printAll!==undefined)return printImages(shown.filter(f=>f.png));const n=t.dataset.print;if(n)printImages(shown.filter(f=>f.name===n))});
// « Tracer » ou « Planificateur carburant » avant la création : la mission du vol est d'abord créée ; mission chargée (vol de
// cette page ou mission reçue) : ils travaillent dessus sans la remplacer
for(const id of ['vprofDraw','vprofToPlanner'])$v(id).addEventListener('click',e=>{if(mission||sharedDoc?.yaml?.mission?.id==='VOL')return;e.stopImmediatePropagation();if(build(true))setTimeout(()=>$v(id).click(),600)},true);
// route modifiée (saisie, recherche, carte ou coupe) : mission, cartes et profil mis à jour
const follow=()=>{saveForm();if(sharedDoc?.yaml?.mission?.id==='VOL')build(true)};
$v('vprofRoute').addEventListener('change',follow);
window.addEventListener('vprof-route-edited',e=>{if(e.detail?.altn!==undefined)$v('volAltn').value=e.detail.altn;follow()});
['volRdv','vprofCruise'].forEach(id=>$v(id).addEventListener('change',()=>{saveForm();if(sharedDoc?.yaml?.mission?.id==='VOL')build(true)}));document.querySelectorAll('[data-volmap]').forEach(i=>i.addEventListener('change',saveForm));
loadForm();
// ouverture : vol en cours (plan de vol partagé avec le Carburant, le plus récent, sinon le formulaire de la page). Dès la
// base SIA chargée : le vol voulu l'emporte sur la mission enregistrée (relue entre-temps par le studio) ; la mission du
// vol est refaite si sa route, son appareil ou le profil de sa carte de route ont changé ; une mission reçue de Mes
// missions est gardée. Puis carte (aperçu interactif) et profil vertical montrés d'emblée. ?fpl=1 (arrivée depuis le
// Carburant) : même chemin.
if(new URLSearchParams(location.search).has('fpl'))history.replaceState(null,'',location.pathname+location.hash);
(async()=>{for(let i=0;i<100&&!baseReady();i++)await new Promise(r=>setTimeout(r,200));if(!baseReady())return;
 const own=sharedDoc?.yaml?.mission?.id==='VOL',vp=sharedDoc?.yaml?.vertical_profile||{},route=(wanted.route||(own?vp.route:'')||'').trim();
 if(route&&(!mission||own)){$v('vprofRoute').value=route;
  if(wanted.aircraft&&[...$v('vprofAircraft').options].some(o=>o.value===wanted.aircraft)){$v('vprofAircraft').value=wanted.aircraft;$v('vprofAircraft')._choiceButton?._aircraftPicker?.refresh()}
  const stale=!own||vp.route!==route||(wanted.aircraft&&vp.aircraft!==$v('vprofAircraft').value)||(sharedDoc.yaml.maps||[]).some(m=>/^route_/.test(m.filename||'')&&!/^ifr-/.test(m.profile||''));
  if(stale&&!build(true))return}
 if(!mission)return;await new Promise(r=>setTimeout(r,500));if(!$v('refreshPreview').disabled)$v('refreshPreview').click();drawVprofPreview()})();
})();
</script>
'''


def main():
    """Génère map_planner.html depuis le studio du Centre (remplacements successifs), fins de ligne du studio gardées."""
    src = open(SRC, encoding='utf-8', newline='').read()
    nl = '\r\n' if '\r\n' in src else '\n'
    s = src.replace('\r\n', '\n')
    rep = []

    def sub(pattern, repl, flags=0, count=1):
        """Remplace le motif dans la page (repl littéral, sans références de groupes) ; arrêt si le motif est introuvable :
        le studio a changé, l'outil est à mettre à jour."""
        nonlocal s
        new, n = re.subn(pattern, lambda m: repl, s, count=count, flags=flags)
        if n == 0:
            raise SystemExit(f'motif introuvable dans le studio : {pattern[:70]}')
        s = new
        rep.append(pattern)

    sub(r'<title>[^<]*</title>', '<title>Cartes de vol</title>')
    # ton foncé (palette « outil sombre ») : attribut de <html>, règles TONE_CSS à la fin de <head>
    sub(r'<html lang="fr">', '<html data-tool="dark" lang="fr">')
    sub(r'</head>', TONE_CSS + '</head>')
    # scripts propres au Centre : chemins depuis apps/planner ; mission dans l'espace « planner » ; registre non chargé
    sub(r'<script src="mission_store\.js', '<script>window.SIA_MISSION_NS=\'planner\'</script><script src="../cpco/mission_store.js')
    sub(r'<script src="sia_i18n\.js', '<script src="../cpco/sia_i18n.js')
    sub(r'<script src="\.\./\.\./shared/mission_registry\.js\?v=[^"]*"></script>', '')
    sub(r'</style>', VOL_CSS + '</style>')
    sub(r'<header>.*?</header>', '<header><div class="header-row"><h1>Cartes de vol</h1><a class="headerButton" href="flight_performance_planner.html">← Planificateur</a><span id="extLinks" class="header-ext"></span></div><p>Route, cartes topographiques, approche, rendez-vous et destination, profil vertical — pour sa propre préparation</p></header>', re.S)
    # bloc Mission du Centre : gardé masqué (le moteur s'en sert)
    sub(r'<section data-block-id="sia-mission"[^>]*>', '<section id="siaMissionHidden" hidden>')
    # bloc « Cartes du vol » après le bloc Route
    sub(r'<section data-block-id="sia-profiles"', VOL_BLOCK + '<section data-block-id="sia-profiles"')
    # route probable et cartes d'exercice : propres aux missions du Centre
    sub(r'<button type="button" id="vprofFromProbable"', '<button type="button" id="vprofFromProbable" hidden')
    sub(r'<button type="button" id="addExerciseMaps"', '<button type="button" id="addExerciseMaps" hidden')

    def lit(old, new):
        """Remplacement d'un morceau exact du studio (sans motif)."""
        sub(re.escape(old), new)

    # v2 : page simple aux niveaux 1 à 3 (route, niveau, SimBrief, aperçu et « Agrandir », bloc « Cartes » et son bouton
    # « Générer les cartes et le ZIP ») ; le reste, rangé au niveau 4 (data-min-level, repository_nav.css), y est complet.
    # Le studio du Centre n'est pas touché.
    lit('<span class="routeInline"><select id="routeMode"', '<span class="routeInline" data-min-level="4"><select id="routeMode"')
    lit('<div class="routeGroup"><button type="button" id="vprofDraw"', '<div class="routeGroup" data-min-level="4"><button type="button" id="vprofDraw"')
    # liste « Carte » gardée à tout niveau (une mission de plusieurs cartes se parcourt dans l'aperçu) ; « Profil » : niveau 4
    lit('<label class="routeInline">Profil <select id="routeMapProfile"', '<label class="routeInline" data-min-level="4">Profil <select id="routeMapProfile"')
    # réglages du profil d'affichage (déplacés sous l'aperçu par le studio) et de la coupe
    lit('<div class="profileLeft routeProfileEdit">', '<div class="profileLeft routeProfileEdit" data-min-level="4">')
    lit('<details id="profileEdit" class="profileEdit">', '<details id="profileEdit" class="profileEdit" data-min-level="4">')
    lit('<details class="vprofSettings">', '<details class="vprofSettings" data-min-level="4">')
    # barre de l'aperçu : seul « Agrandir » reste aux niveaux 1 à 3
    lit('<label class="mapZip previewZip" title="Mettre cette carte dans le ZIP (décocher pour ne pas la générer)"><input type="checkbox" id="previewZip" checked disabled> ZIP</label>',
        '<label class="mapZip previewZip" data-min-level="4" title="Générer cette carte (décocher pour ne pas la générer)"><input type="checkbox" id="previewZip" checked disabled> Générer</label>')
    # plus d'archive : les images sont montrées dans la page (window.SiaDeliver, VOL_SCRIPT)
    lit('id="generate" data-icon="download" disabled>Générer les cartes et le ZIP', 'id="generate" data-icon="download" disabled>Générer les cartes')
    lit('<button id="generateSticky" data-icon="download" type="button" disabled>Générer les cartes et le ZIP</button>',
        '<button id="generateSticky" data-icon="map" type="button" disabled>Générer les cartes</button>')
    lit('<button id="refreshPreview"', '<button id="refreshPreview" data-min-level="4"')
    for v in ('keep', 'home', 'auto'):
        lit(f'<button type="button" data-view="{v}"', f'<button type="button" data-view="{v}" data-min-level="4"')
    lit('<button id="previewWindow"', '<button id="previewWindow" data-min-level="4"')
    lit('<section data-block-id="sia-profiles"', '<section data-block-id="sia-profiles" data-min-level="4"')
    # base SIA : le studio montre son panneau sous la ligne d'état du bloc Mission, masqué ici ; Cartes de vol garde le
    # bloc « Base de données SIA » en fin de page, niveau 4, montré à tout niveau tant que la base manque
    # (renderSiaBaseLine du studio)
    lit('<div id="siaBasePanel" hidden></div>', '')
    sub(r'</main>', SIA_BASE_BLOCK + '</main>')
    # « Aperçus et génération » et pied de page : niveau 4 (l'action des niveaux 1 à 3 est dans le bloc « Cartes », le
    # compte rendu #result y est déplacé par VOL_SCRIPT) ; au niveau 4, « Générer » une seule fois, dans le pied de page
    # (generateSticky, qui clique celui-ci, gardé masqué)
    lit('<section data-block-id="sia-outputs"', '<section data-block-id="sia-outputs" data-min-level="4"')
    lit('<button id="generate" data-icon="download" disabled>', '<button id="generate" data-icon="download" disabled hidden>')
    lit('<div class="studio-footer repo-actionbar" id="studioToolbar"', '<div class="studio-footer repo-actionbar" id="studioToolbar" data-min-level="4"')
    # phrase d'attente du studio dans #result (profils, carte d'assemblage) : niveau 4 seulement ; aux niveaux 1 à 3,
    # #result est vidé quand la mission change (compte rendu d'une route précédente)
    lit("  $('result').textContent = hasMission ?\n", "  $('result').textContent = hasMission && (+document.documentElement.dataset.level || 4) >= 4 ?\n")
    i = s.rfind('</script>\n<script src="../../shared/repository_nav.js')
    if i < 0:
        raise SystemExit('fin du script du studio introuvable')
    s = s[:i + len('</script>\n')] + VOL_SCRIPT + s[i + len('</script>\n'):]
    s = s.replace('<!doctype html>', '<!doctype html>\n<!-- Page générée par tools/build_map_planner.py depuis apps/cpco/map_parser.html : ne pas éditer à la main. -->', 1)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, 'w', encoding='utf-8', newline='').write(s.replace('\n', nl))
    print(f'{os.path.relpath(OUT, ROOT)} : {len(s) // 1024} Ko, {len(rep)} remplacement(s).')


if __name__ == '__main__':
    main()
