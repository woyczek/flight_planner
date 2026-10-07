"""Construit apps/planner/map_planner.html (« Cartes de vol », accessible à tous) à partir du studio cartographique du
Centre (apps/cpco/map_parser.html) : même moteur de rendu, mêmes profils d'affichage, même bloc « Route » (champ de
route en case 15, carte et coupe verticale liées), sans le bloc Mission du Centre.

La page publique ajoute, après le bloc Route, un bloc « Cartes du vol » : rendez-vous facultatif, niveau, choix des cartes
(route, approche, rendez-vous, destination). Elle crée une mission locale dans son propre espace
du navigateur (SIA_MISSION_NS = 'planner') d'après la route du champ : la mission du générateur et du studio du Centre
n'est jamais touchée.

À relancer après chaque modification du studio (la page publique n'est pas éditée à la main) :
    python tools/build_map_planner.py
"""
import os, re, sys

sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SRC = os.path.join(ROOT, 'apps', 'cpco', 'map_parser.html')
OUT = os.path.join(ROOT, 'apps', 'planner', 'map_planner.html')

VOL_BLOCK = r'''<section data-block-id="vol" data-icon="plane" data-subtitle="Rendez-vous facultatif et cartes à produire d’après la route du bloc « Route ».">
<h2>Cartes du vol</h2>
<p id="volStatus" data-status class="small"></p>
<div class="volForm">
<label>Rendez-vous (facultatif)<input id="volRdv" spellcheck="false" placeholder="point ou « 44.2, 0.6 »"></label>
</div>
<div class="volMaps"><span class="small">Cartes :</span>
<label class="check"><input type="checkbox" data-volmap="topo" checked> route (vue d’ensemble, IFR)</label>
<label class="check"><input type="checkbox" data-volmap="approche" checked> approche</label>
<label class="check"><input type="checkbox" data-volmap="rdv" checked> rendez-vous</label>
<label class="check"><input type="checkbox" data-volmap="destination" checked> destination</label>
</div>
<div class="actions"><button id="volBuild" type="button" data-icon="map">Créer les cartes</button></div>
</section>

'''

VOL_CSS = '''.volForm{display:grid;grid-template-columns:repeat(2,minmax(0,260px));gap:8px 12px;align-items:end}.volForm label{display:grid;gap:3px;font-size:13px}
#volStatus:empty{display:none}
.volMaps{display:flex;flex-wrap:wrap;gap:4px 14px;align-items:center;margin:8px 0 2px}
#vprofPtsBox{display:none!important}
@media(max-width:800px){.volForm{grid-template-columns:1fr 1fr}}
'''

VOL_SCRIPT = r'''<script>
// ===== Cartes de vol (page publique) : bloc « Cartes du vol » =====
// La route est celle du bloc Route (champ vprofRoute, case 15) : points lus par SiaProfile.parseRoute (base SIA du
// navigateur : aérodromes, balises, points RNAV, voies aériennes) ; mission locale (espace « planner ») envoyée au
// moteur du studio (useDoc) : points de la route, cartes topographique, approche, rendez-vous, destination, profil.
(()=>{
const FORM_KEY='mapPlannerForm:v1',$v=id=>document.getElementById(id);
const say=(html,kind)=>{$v('volStatus').innerHTML=kind?`<span class="${kind}">${html}</span>`:html};
const levelFt=t=>{const m=/^(FL)?(\d{1,5})(FT)?$/.exec(String(t||'').toUpperCase().replace(/\s+/g,''));return m?(m[1]?+m[2]*100:+m[2]):null};
const coord=t=>{const m=/^\s*(-?\d+(?:\.\d+)?)\s*[,;| ]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(t||'');return m&&Math.abs(+m[1])<=90&&Math.abs(+m[2])<=180?{lat:+m[1],lon:+m[2]}:null};
const baseReady=()=>(aero?.aerodromes?.length||0)>0;
// plan de vol partagé avec le planificateur carburant (flightPlanShared:v1) : un seul FPL, le plus récent l'emporte
const FPL_KEY='flightPlanShared:v1',readFpl=()=>{try{return JSON.parse(localStorage.getItem(FPL_KEY)||'null')}catch{return null}};
function saveForm(){const route=$v('vprofRoute').value.trim();try{localStorage.setItem(FORM_KEY,JSON.stringify({route,rdv:$v('volRdv').value,level:$v('vprofCruise').value,maps:[...document.querySelectorAll('[data-volmap]')].filter(i=>i.checked).map(i=>i.dataset.volmap),at:Date.now()}));if(route&&readFpl()?.route!==route)localStorage.setItem(FPL_KEY,JSON.stringify({route,at:Date.now(),by:'maps'}))}catch{}}
function loadForm(){try{const f=JSON.parse(localStorage.getItem(FORM_KEY)||'null')||{},sh=readFpl(),route=sh?.route&&(sh.at||0)>(f.at||0)?sh.route:f.route;if(route&&(!$v('vprofRoute').value.trim()||sh?.route===route))$v('vprofRoute').value=route;$v('volRdv').value=f.rdv||'';if(f.level&&!$v('vprofCruise').value)$v('vprofCruise').value=f.level;if(Array.isArray(f.maps))document.querySelectorAll('[data-volmap]').forEach(i=>{i.checked=f.maps.includes(i.dataset.volmap)})}catch{}}
/** Points de la route du champ (sans les points intermédiaires des voies aériennes) ; null et message si impossible. */
function routePoints(){
 if(!baseReady()){say('Base SIA absente de ce navigateur : bloc « Base de données SIA » (menu ☰ › blocs) → « Relire le dossier ».','err');return null}
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
/** Crée (ou met à jour) la mission du vol et ses cartes ; quiet : sans message ni recentrage (route modifiée). */
function build(quiet){
 const pts=routePoints();if(!pts)return false;const want=new Set([...document.querySelectorAll('[data-volmap]')].filter(i=>i.checked).map(i=>i.dataset.volmap));
 const idOf=(p,i)=>{const n=String(p.name||'').toUpperCase();return/^[A-Z0-9]{2,5}$/.test(n)?n:`P${i}`};
 let rdv=null;const rt=$v('volRdv').value.trim();if(rt){const c=coord(rt);if(c)rdv={id:'RDV',name:'RDV',...c};else{const q=SiaProfile.resolver({aero:aero||{}})(rt);if(!q){say(`Rendez-vous inconnu : ${esc(rt)}.`,'err');return false}rdv={id:'RDV',name:`RDV ${q.name||rt}`,lat:q.lat,lon:q.lon}}}
 const P=(p,i)=>({id:idOf(p,i),name:p.name||idOf(p,i),lat:+p.lat.toFixed(6),lon:+p.lon.toFixed(6)}),dep=P(pts[0],0),dest=P(pts[pts.length-1],pts.length-1),mid=pts.slice(1,-1).map((p,i)=>P(p,i+1)),ft=levelFt($v('vprofCruise').value);
 const maps=[];
 if(want.has('topo'))maps.push({filename:`route_${dep.id}_${dest.id}.png`,type:'general',description:'Carte de la route',profile:'ifr'});
 if(want.has('approche'))maps.push({filename:`approche_${dest.id}.png`,type:'approche',description:`Approche de ${dest.id}`,centre_ref:'DESTINATION',range_km:30});
 if(want.has('rdv')&&rdv)maps.push({filename:'rendez_vous.png',type:'rdv',description:'Rendez-vous',centre_ref:'RDV',range_km:15});
 if(want.has('destination'))maps.push({filename:`destination_${dest.id}.png`,type:'detail',description:`Terrain de destination ${dest.id}`,centre_ref:'DESTINATION'});
 if(!maps.length){say('Aucune carte choisie.','err');return false}
 const vp={...(sharedDoc?.yaml?.mission?.id==='VOL'?sharedDoc.yaml.vertical_profile:{}),route:$v('vprofRoute').value.trim(),cruise:ft?(ft>=6000?`FL${Math.round(ft/100)}`:String(ft)):undefined};
 const yaml={schema_version:'2.0',mission:{id:'VOL',title:`Vol ${dep.id} → ${dest.id}`,type:'Vol'},origin:dep,destination:dest,turning_points:mid,...(rdv?{rendezvous:[P(rdv,0)]}:{}),vertical_profile:vp,maps};
 const views=new Map((mission?.maps||[]).filter(m=>m._view).map(m=>[m.file,m._view]));
 for(const m of maps){const u=userProfile.get(m.filename);if(u)m.profile=u;const v=views.get(m.filename);if(v)m.view=v}
 try{const doc=SiaMission.save({yaml,narrative:{summary:'',detailed:'',sections:[]},sourceNames:[]},'planner');routeCache={};useDoc(doc,true,true);saveForm()}catch(e){say(esc(e.message),'err');return false}
 setTimeout(()=>{drawVprofPreview();if(!quiet&&!$v('refreshPreview').disabled)$v('refreshPreview').click()},400);
 if(!quiet){say(`${maps.length} carte(s) prête(s) : ${esc(maps.map(m=>m.description).join(', '))}, et le profil vertical de la route. Réglages et aperçus dans « Cartes à produire », fichiers dans « Aperçus et génération ».`,'ok')}
 return true;
}
$v('volBuild').onclick=()=>build(false);
// « Tracer » ou « Planificateur carburant » avant la création : la mission du vol est d'abord créée
for(const id of ['vprofDraw','vprofToPlanner'])$v(id).addEventListener('click',e=>{if(sharedDoc?.yaml?.mission?.id==='VOL')return;e.stopImmediatePropagation();if(build(true))setTimeout(()=>$v(id).click(),600)},true);
// route modifiée (saisie, recherche, carte ou coupe) : mission, cartes et profil mis à jour
const follow=()=>{saveForm();if(sharedDoc?.yaml?.mission?.id==='VOL')build(true)};
$v('vprofRoute').addEventListener('change',follow);
window.addEventListener('vprof-route-edited',follow);
['volRdv','vprofCruise'].forEach(id=>$v(id).addEventListener('change',()=>{saveForm();if(sharedDoc?.yaml?.mission?.id==='VOL')build(true)}));document.querySelectorAll('[data-volmap]').forEach(i=>i.addEventListener('change',saveForm));
loadForm();
// mission enregistrée avant le passage de la carte de route en IFR (profil « VFR détaillé ») : recréée une fois
if(!new URLSearchParams(location.search).has('fpl')&&sharedDoc?.yaml?.mission?.id==='VOL'&&(sharedDoc.yaml.maps||[]).some(m=>/^route_/.test(m.filename||'')&&m.profile==='vfr-detail'))(async()=>{for(let i=0;i<100&&!baseReady();i++)await new Promise(r=>setTimeout(r,200));if(baseReady()&&$v('vprofRoute').value.trim())build(true)})();
// arrivée depuis le planificateur carburant (?fpl=1) : cartes et profil du plan de vol partagé, dès la base SIA chargée
if(new URLSearchParams(location.search).has('fpl')){history.replaceState(null,'',location.pathname+location.hash);(async()=>{for(let i=0;i<100&&!baseReady();i++)await new Promise(r=>setTimeout(r,200));if(baseReady()&&$v('vprofRoute').value.trim())build(false)})()}
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
    # scripts propres au Centre : chemins depuis apps/planner ; mission dans l'espace « planner » ; registre non chargé
    sub(r'<script src="mission_store\.js', '<script>window.SIA_MISSION_NS=\'planner\'</script><script src="../cpco/mission_store.js')
    sub(r'<script src="sia_i18n\.js', '<script src="../cpco/sia_i18n.js')
    sub(r'<script src="\.\./\.\./shared/mission_registry\.js\?v=[^"]*"></script>', '')
    sub(r'</style>', VOL_CSS + '</style>')
    sub(r'<header>.*?</header>', '<header><div class="header-row"><h1>Cartes de vol</h1><a class="headerButton" href="flight_performance_planner.html">← Planificateur</a></div><p>Route, cartes topographiques, approche, rendez-vous et destination, profil vertical — pour sa propre préparation</p></header>', re.S)
    # bloc Mission du Centre : gardé masqué (le moteur s'en sert)
    sub(r'<section data-block-id="sia-mission"[^>]*>', '<section id="siaMissionHidden" hidden>')
    # bloc « Cartes du vol » après le bloc Route
    sub(r'<section data-block-id="sia-profiles"', VOL_BLOCK + '<section data-block-id="sia-profiles"')
    # route probable et cartes d'exercice : propres aux missions du Centre
    sub(r'<button type="button" id="vprofFromProbable"', '<button type="button" id="vprofFromProbable" hidden')
    sub(r'<button type="button" id="addExerciseMaps"', '<button type="button" id="addExerciseMaps" hidden')
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
