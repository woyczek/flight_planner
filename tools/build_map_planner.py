"""Construit apps/planner/map_planner.html (« Cartes de vol », accessible à tous) à partir du studio cartographique du
Centre (apps/cpco/map_parser.html) : même moteur de rendu et mêmes profils d'affichage, sans le bloc Mission du Centre.

La page publique remplace ce bloc par un bloc « Vol » : route (codes OACI, balises, points), recherche de la route par
les voies aériennes ou le RTBA (MissionRouting), rendez-vous facultatif, niveau, choix des cartes (topographique de
la route, approche, rendez-vous, destination). Elle crée une mission locale dans son propre espace du navigateur
(SIA_MISSION_NS = 'planner') : la mission du générateur et du studio du Centre n'est jamais touchée.

À relancer après chaque modification du studio (la page publique n'est pas éditée à la main) :
    python tools/build_map_planner.py
"""
import os, re, sys

sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SRC = os.path.join(ROOT, 'apps', 'cpco', 'map_parser.html')
OUT = os.path.join(ROOT, 'apps', 'planner', 'map_planner.html')

VOL_BLOCK = r'''<section data-block-id="vol" data-icon="plane" data-subtitle="Route du vol, rendez-vous facultatif et niveau : les cartes de la route se créent d’après eux.">
<h2>Vol</h2>
<p id="volStatus" data-status class="small">Route (aussi cheminement du profil vertical) : codes OACI des terrains, balises, points de report ou coordonnées (« 43.6, 1.4 »), séparés par des espaces ou des virgules ; niveaux acceptés (« FL55 » seul : montée ou descente après le point précédent, « R590A/FL65 », « N0180F055 ») ; « DCT » est ignoré.</p>
<div class="volForm">
<label class="volRoute">Route<textarea id="volRoute" rows="2" spellcheck="false" placeholder="LFBO TOU FL55 AGN LFBD"></textarea></label>
<label>Rendez-vous (facultatif)<input id="volRdv" spellcheck="false" placeholder="point ou « 44.2, 0.6 »"></label>
<label>Niveau de croisière<input id="volLevel" spellcheck="false" placeholder="5500 ou FL65" value="5500"></label>
<label>Recherche de route<select id="volMode"><option value="airways">par les voies aériennes</option><option value="rtba">basse hauteur (RTBA)</option></select></label>
</div>
<div class="volMaps"><span class="small">Cartes :</span>
<label class="check"><input type="checkbox" data-volmap="topo" checked> topographique de la route</label>
<label class="check"><input type="checkbox" data-volmap="approche" checked> approche</label>
<label class="check"><input type="checkbox" data-volmap="rdv" checked> rendez-vous</label>
<label class="check"><input type="checkbox" data-volmap="destination" checked> destination</label>
</div>
<div class="actions"><button id="volSearch" type="button" class="secondary" data-icon="search">Chercher la route</button><button id="volBuild" type="button" data-icon="map">Créer les cartes</button><button id="volPlanner" type="button" class="secondary" data-icon="fuel" title="Ouvrir le planificateur carburant avec cette route (plan de vol OACI), sa distance et son niveau">Planificateur carburant</button></div>
<p id="volInfo" class="small"></p>
</section>
'''

VOL_CSS = '''.volForm{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:8px 12px;align-items:end}.volForm label{display:grid;gap:3px;font-size:13px}
.volForm textarea{min-height:2.6em;font:13px/1.35 ui-monospace,Consolas,monospace;resize:vertical}
.volMaps{display:flex;flex-wrap:wrap;gap:4px 14px;align-items:center;margin:8px 0 2px}
#vprofPtsBox{display:none!important}
@media(max-width:800px){.volForm{grid-template-columns:1fr 1fr}.volForm .volRoute{grid-column:1/-1}}
'''

VOL_SCRIPT = r'''<script>
// ===== Cartes de vol (page publique) : bloc « Vol » =====
// La route du bloc est aussi le cheminement du profil vertical (un seul champ) : points résolus par le module du
// profil (SiaProfile, base SIA du navigateur : aérodromes, balises, points RNAV), niveaux gardés tels quels
// (« FL55 », « R590A/FL65 », « N0180F055 », « 5500 ft »), virgules ou espaces ; recherche par les voies aériennes ou
// le RTBA (MissionRouting.expand) ; mission locale (espace « planner ») envoyée au moteur du studio (useDoc) : cartes
// topographique, approche, rendez-vous, destination, profil vertical tracé aussitôt ; « Planificateur carburant ».
(()=>{
const FORM_KEY='mapPlannerForm:v1',$v=id=>document.getElementById(id);
// points de transit trouvés par la recherche (sommets des zones du RTBA : « R 46 N2 » → R46N2) : coordonnées gardées
let vias={};
const say=(html,kind)=>{$v('volStatus').innerHTML=kind?`<span class="${kind}">${html}</span>`:html};
const levelFt=t=>{const m=/^(FL)?(\d{1,5})(FT)?$/.exec(String(t||'').toUpperCase().replace(/\s+/g,''));return m?(m[1]?+m[2]*100:+m[2]):null};
const coord=t=>{const m=/^\s*(-?\d+(?:\.\d+)?)\s*[,;| ]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(t||'');return m&&Math.abs(+m[1])<=90&&Math.abs(+m[2])<=180?{lat:+m[1],lon:+m[2]}:null};
const LEVEL=/^(FL\d{1,3}|\d{3,5}FT|[NKM]\d{3,4}[FASM]\d{3,4}|VFR|IFR)$/i;
/** Route → { pts (points résolus), unknown, route (cheminement du profil : identifiants et niveaux) }.
 *  Coordonnées décimales « 43.6, 1.4 » regroupées avant le découpage (virgules, points-virgules, espaces). */
function resolve(text){
 const toks=String(text||'').replace(/(\d)\s+ft\b/gi,'$1FT').replace(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/g,'$1|$2').split(/[\s,;]+/).filter(Boolean);
 const unknown=[],pts=[],route=[],res=SiaProfile.resolver({aero:aero||{},ref:{lat:46.5,lon:2.5}});
 for(const t of toks){
  if(/^DCT$/i.test(t))continue;
  if(LEVEL.test(t)){route.push(t.toUpperCase());continue}
  const [core,...rest]=t.split('/'),suffix=rest.length?'/'+rest.join('/').toUpperCase():'',K=core.toUpperCase();let p=null;
  const v=vias[K];if(v)p={id:K,name:v.name||K,lat:v.lat,lon:v.lon};
  else{const c=coord(core);if(c)p={id:`P${pts.length+1}`,name:core.replace('|',', '),...c};else{const r=SiaProfile.parseRoute(core,res);if(r.points?.length){const q=r.points[0];p={id:String(q.name||K).toUpperCase(),name:q.name||K,lat:q.lat,lon:q.lon}}}}
  if(!p){unknown.push(core);continue}
  pts.push(p);route.push(p.id+suffix);
 }
 return{pts,unknown,route};
}
function baseReady(){return(aero?.aerodromes?.length||0)>0}
function saveForm(){try{localStorage.setItem(FORM_KEY,JSON.stringify({route:$v('volRoute').value,rdv:$v('volRdv').value,level:$v('volLevel').value,mode:$v('volMode').value,maps:[...document.querySelectorAll('[data-volmap]')].filter(i=>i.checked).map(i=>i.dataset.volmap),vias}))}catch{}}
function loadForm(){try{const f=JSON.parse(localStorage.getItem(FORM_KEY)||'null');if(!f)return;$v('volRoute').value=f.route||'';$v('volRdv').value=f.rdv||'';$v('volLevel').value=f.level||'5500';if(f.mode)$v('volMode').value=f.mode;if(f.vias&&typeof f.vias==='object')vias=f.vias;if(Array.isArray(f.maps))document.querySelectorAll('[data-volmap]').forEach(i=>{i.checked=f.maps.includes(i.dataset.volmap)})}catch{}}
function checkRoute(){
 if(!baseReady()){say('Base SIA absente de ce navigateur : bloc « Base de données SIA » (menu ☰ › blocs) → « Relire le dossier ».','err');return null}
 const r=resolve($v('volRoute').value);
 if(r.unknown.length){say(`Inconnu(s) dans la base SIA : ${esc(r.unknown.join(', '))}.`,'err');return null}
 if(r.pts.length<2){say('Route : au moins un départ et une destination.','err');return null}
 return r;
}
$v('volSearch').onclick=async()=>{
 const r=checkRoute();if(!r)return;const ft=levelFt($v('volLevel').value)||5500,mode=$v('volMode').value;
 if(!window.MissionRouting?.ready?.())await window.MissionRouting?.loadFromBase?.();
 const ex=window.MissionRouting?.expand?.(r.pts,{cls:mode==='rtba'?'jet':'turboprop',alt:ft},{route_mode:mode});
 if(!ex){say('Calcul des routes non chargé.','err');return}
 if(ex.mode==='direct'){$v('volInfo').textContent=`Route inchangée : ${ex.reason}.`;return}
 $v('volRoute').value=ex.chain.map(p=>{if(p.kind!=='via')return p.id;const k=String(p.id).toUpperCase().replace(/\s+/g,'');vias[k]={name:p.id,lat:p.lat,lon:p.lon};return k}).join(' ');
 $v('volInfo').textContent=`Route calculée : ${ex.how}. Ajoute au besoin les niveaux (« R589B FL55 R590A FL65 »), puis « Créer les cartes ».`;saveForm();
};
/** Crée (ou met à jour) la mission du vol et ses cartes ; quiet : sans message ni recentrage (route modifiée). */
function build(quiet){
 const r=checkRoute();if(!r)return false;const pts=r.pts,want=new Set([...document.querySelectorAll('[data-volmap]')].filter(i=>i.checked).map(i=>i.dataset.volmap));
 let rdv=null;const rt=$v('volRdv').value.trim();if(rt){const c=coord(rt);if(c)rdv={id:'RDV',name:'RDV',...c};else{const q=resolve(rt);if(!q.pts.length){say(`Rendez-vous inconnu : ${esc(rt)}.`,'err');return false}rdv={...q.pts[0],id:'RDV',name:`RDV ${q.pts[0].name||q.pts[0].id}`}}}
 const dep=pts[0],dest=pts[pts.length-1],mid=pts.slice(1,-1),ft=levelFt($v('volLevel').value),P=p=>({id:p.id,name:p.name||p.id,lat:+p.lat.toFixed(6),lon:+p.lon.toFixed(6)});
 const maps=[];
 if(want.has('topo'))maps.push({filename:`route_${dep.id}_${dest.id}.png`,type:'general',description:'Carte topographique de la route',profile:'vfr-detail'});
 if(want.has('approche'))maps.push({filename:`approche_${dest.id}.png`,type:'approche',description:`Approche de ${dest.id}`,centre_ref:'DESTINATION',range_km:30});
 if(want.has('rdv')&&rdv)maps.push({filename:'rendez_vous.png',type:'rdv',description:'Rendez-vous',centre_ref:'RDV',range_km:15});
 if(want.has('destination'))maps.push({filename:`destination_${dest.id}.png`,type:'detail',description:`Terrain de destination ${dest.id}`,centre_ref:'DESTINATION'});
 if(!maps.length){say('Aucune carte choisie.','err');return false}
 const vp={...(sharedDoc?.yaml?.mission?.id==='VOL'?sharedDoc.yaml.vertical_profile:{}),route:r.route.join(', '),cruise:ft?(ft>=6000?`FL${Math.round(ft/100)}`:String(ft)):undefined};
 const yaml={schema_version:'2.0',mission:{id:'VOL',title:`Vol ${dep.id} → ${dest.id}`,type:'Vol'},origin:P(dep),destination:P(dest),turning_points:mid.map(P),...(rdv?{rendezvous:[P(rdv)]}:{}),vertical_profile:vp,maps};
 try{const doc=SiaMission.save({yaml,narrative:{summary:'',detailed:'',sections:[]},sourceNames:[]},'planner');routeCache={};useDoc(doc,true,false);saveForm()}catch(e){say(esc(e.message),'err');return false}
 setTimeout(()=>{if(!$v('vprofDraw').disabled)$v('vprofDraw').click();if(!quiet&&!$v('refreshPreview').disabled)$v('refreshPreview').click()},400);
 if(!quiet){say(`${maps.length} carte(s) prête(s) : ${esc(maps.map(m=>m.description).join(', '))}, et le profil vertical de la route. Réglages et aperçus dans « Cartes et cadrage », fichiers dans « Aperçus et génération ».`,'ok');window.AppFramework?.reveal?.('sia-profiles')}
 return true;
}
$v('volBuild').onclick=()=>build(false);
// planificateur carburant : même route (case 15 OACI), distance, niveau et route vraie
$v('volPlanner').onclick=()=>{if(build(true))setTimeout(()=>$v('vprofToPlanner').click(),600)};
// route modifiée après création : mission, cartes et profil mis à jour
$v('volRoute').addEventListener('change',()=>{if(sharedDoc?.yaml?.mission?.id==='VOL')build(true)});
['volRoute','volRdv','volLevel','volMode'].forEach(id=>$v(id).addEventListener('change',saveForm));document.querySelectorAll('[data-volmap]').forEach(i=>i.addEventListener('change',saveForm));
loadForm();
})();
</script>
'''


def main():
    src = open(SRC, encoding='utf-8', newline='').read()
    nl = '\r\n' if '\r\n' in src else '\n'
    s = src.replace('\r\n', '\n')
    rep = []

    def sub(pattern, repl, flags=0, count=1):
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
    # bloc Mission du Centre : gardé masqué (le moteur s'en sert), bloc « Vol » à sa place
    sub(r'<section data-block-id="sia-mission"[^>]*>', VOL_BLOCK + '<section id="siaMissionHidden" hidden>')
    # cartes d'exercice : propres aux missions du Centre
    # profil vertical : cheminement = route du bloc « Vol » (un seul champ)
    sub(r'<label>Cheminement<button type="button" id="vprofFromProbable"', '<p class="small">Cheminement : la route du bloc « Vol » (niveaux compris).</p><label hidden>Cheminement<button type="button" id="vprofFromProbable"')
    sub(r'</textarea></label><span class="small">Points du brief', '</textarea></label><span class="small" hidden>Points du brief')
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
