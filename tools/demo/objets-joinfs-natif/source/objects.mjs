import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
export const ident = v => typeof v==='string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/.test(v);
const num=(v,lo,hi,key)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<lo||v>hi)throw Error(`${key} : nombre requis entre ${lo} et ${hi}`);return v;};
export function readMission(file,yamlLibrary){
 const text=fs.readFileSync(file,'utf8');if(Buffer.byteLength(text)>2e6)throw Error('Mission > 2 Mo');
 if(file.endsWith('.json'))return JSON.parse(text);
 // Réutilise le lecteur CORE_SCHEMA déjà livré avec DEFA, sans nouvelle dépendance.
 const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(yamlLibrary,'utf8'),ctx);
 return JSON.parse(JSON.stringify(ctx.jsyaml.load(text,{schema:ctx.jsyaml.CORE_SCHEMA,json:false})));
}
export function cleanPath(p){if(typeof p!=='string'||p.length>400||!p.endsWith('.obj')||/[\\:\x00-\x1f]/.test(p)||p.startsWith('/')||p.split('/').some(x=>!x||x==='.'||x==='..'))throw Error('Modèle : chemin relatif OBJ invalide');return p;}
export function localModel(root,relative){cleanPath(relative);const base=fs.realpathSync(root),file=fs.realpathSync(path.resolve(base,relative));if(!file.startsWith(base+path.sep)||!fs.statSync(file).isFile())throw Error('Modèle hors du dossier X-Plane');return file;}
export function buildSession(mission,catalog,xplaneRoot,options={}){
 if(mission.schema!=='helo-xp-mission'||!['1.0','2.0'].includes(String(mission.schema_version))||!ident(mission.mission?.id))throw Error('Mission helo-xp-mission 1.0 ou 2.0 requise');
 if(!Array.isArray(mission.objects)||!mission.objects.length||mission.objects.length>32)throw Error('1 à 32 objets requis');
 const seen=new Set(),warnings=[];
 const objects=mission.objects.map(src=>{
  if(!ident(src.id)||seen.has(src.id))throw Error('Identifiant objet absent ou dupliqué');seen.add(src.id);
  if(src.control==='user')throw Error(`${src.id} : une cible réseau ne doit pas être dupliquée par une instance`);
  const asset=src.visual?.asset;if(!ident(asset)||!Object.hasOwn(catalog,asset))throw Error(`${src.id} : visual.asset à associer explicitement à un modèle local`);
  const entry=catalog[asset];if(!['file','library'].includes(entry.mode))throw Error('Mode de modèle invalide');cleanPath(entry.path);
  if(entry.mode==='file')localModel(xplaneRoot,entry.path);
  const kind=src.kind;if(!['person','animal','vehicle','wreck','raft','ship','aircraft','container'].includes(kind))throw Error(`${src.id} : genre à compléter`);
  if(entry.kind!==kind)throw Error(`${src.id} : modèle ${entry.kind} incompatible avec ${kind}`);
  const motion=src.motion??'static';if(!['static','axis'].includes(motion))throw Error('Prototype : mouvement static ou axis uniquement');
  if(motion==='axis'&&!['ship','aircraft'].includes(kind))throw Error('Axe mobile réservé au bateau ou à l’aéronef');
  const altitude_mode=src.altitude_mode??(kind==='ship'?'water':kind==='aircraft'?'msl':'terrain');
  if(!['terrain','water','msl'].includes(altitude_mode)||kind==='ship'&&altitude_mode!=='water'||kind==='aircraft'&&altitude_mode!=='msl')throw Error('Référence verticale incompatible avec le genre');
  const o={id:src.id,name:String(src.name||src.id).slice(0,120),kind,motion,asset,model:{mode:entry.mode,path:entry.path},lat:num(src.lat,-90,90,'latitude'),lon:num(src.lon,-180,180,'longitude'),altitude_mode,
   altitude_ft:altitude_mode==='msl'?num(src.altitude_ft,-1500,60000,'altitude MSL'):0,
   offset_m:num(src.visual?.offset_m??0,-20,100,'correction origine modèle'),heading_offset_deg:num(entry.heading_offset_deg??0,-180,180,'orientation modèle'),
   course_deg:num(src.course_deg??(motion==='static'?0:undefined),0,359.999,'cap vrai'),speed_kt:num(src.speed_kt??(motion==='static'?0:undefined),0,kind==='ship'?80:1000,'vitesse'),
   start_delay_min:num(src.start_delay_min??0,0,1440,'départ après H'),lifetime_min:num(src.lifetime_min??120,1,1440,'durée de présence'),
   detection_range_nm:num(src.detection_range_nm??1,.001,100,'distance de confirmation'),detection_height_ft:num(src.detection_height_ft??3000,1,60000,'écart vertical de confirmation')};
  if(motion==='static'&&o.speed_kt!==0)throw Error('Un objet statique a une vitesse nulle');
  const limits=src.constraints||{};
  o.constraints={min_speed_kt:num(limits.min_speed_kt??(kind==='aircraft'&&motion==='axis'?1:0),0,1000,'vitesse minimale'),max_speed_kt:num(limits.max_speed_kt??(kind==='ship'?80:1000),0,kind==='ship'?80:1000,'vitesse maximale'),min_clearance_ft:num(limits.min_clearance_ft??50,0,10000,'garde au sol'),require_water:kind==='ship'};
  if(kind==='ship'&&limits.require_water===false)throw Error('Un bateau exige une surface eau');
  if(o.constraints.min_speed_kt>o.constraints.max_speed_kt||o.speed_kt<o.constraints.min_speed_kt||o.speed_kt>o.constraints.max_speed_kt)throw Error('Vitesse hors des contraintes de la mission');
  if(kind==='aircraft'&&motion==='axis'&&o.speed_kt===0)throw Error('Aéronef mobile : vitesse positive requise');
  if(src.detection_range_nm==null)warnings.push(`${src.id} : portée par défaut 1 NM à valider`);
  if(src.detection_height_ft==null)warnings.push(`${src.id} : écart vertical par défaut 3000 ft à valider`);
  return o;
 });
 return {protocol:1,session:crypto.randomUUID(),token:crypto.randomBytes(32).toString('hex'),mission:mission.mission.id,udp_port:options.udp_port??47910,http_port:options.http_port??8790,objects,warnings};
}
export function luaLiteral(v){if(v===null)return 'nil';if(typeof v==='number')return String(num(v,-1e12,1e12,'nombre Lua'));if(typeof v==='boolean')return String(v);if(typeof v==='string')return '"'+v.replace(/[\\"\x00-\x1f\x7f]/g,c=>'\\'+c.charCodeAt(0).toString().padStart(3,'0'))+'"';if(Array.isArray(v))return '{'+v.map(luaLiteral).join(',')+'}';if(v&&typeof v==='object')return '{'+Object.entries(v).map(([k,x])=>'['+luaLiteral(k)+']='+luaLiteral(x)).join(',')+'}';throw Error('Valeur Lua non prise en charge');}
export function destination(p,heading,nm){const r=Math.PI/180,a=p.lat*r,b=p.lon*r,h=heading*r,d=nm/3440.065,lat=Math.asin(Math.sin(a)*Math.cos(d)+Math.cos(a)*Math.sin(d)*Math.cos(h)),lon=b+Math.atan2(Math.sin(h)*Math.sin(d)*Math.cos(a),Math.cos(d)-Math.sin(a)*Math.sin(lat));return {lat:lat/r,lon:((lon/r+540)%360)-180};}
export function distanceNm(a,b){const r=Math.PI/180,h=Math.sin((b.lat-a.lat)*r/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin((b.lon-a.lon)*r/2)**2;return 3440.065*2*Math.asin(Math.min(1,Math.sqrt(h)));}
export function validateEvent(session,e){
 if(!e||e.protocol!==1||e.session!==session.session||e.token!==session.token||e.mission!==session.mission||!Number.isInteger(e.seq)||e.seq<1||e.seq>1e9||!ident(e.run)||!['spawned','removed','candidate_fov','object_found','spawn_failed'].includes(e.type))throw Error('Événement invalide');
 const o=session.objects.find(o=>o.id===e.object);if(!o)throw Error('Objet inconnu');
 num(e.sim_sec,0,1e9,'temps');
 if(!ident(e.reason??'ok'))throw Error('Raison invalide');
 if(['candidate_fov','object_found'].includes(e.type)){
  for(const p of [e.pilot,e.position]){if(!p)throw Error('Position manquante');num(p.lat,-90,90,'latitude');num(p.lon,-180,180,'longitude');num(p.altitude_ft,-1500,60000,'altitude');}
  const expected=o.motion==='axis'?destination(o,o.course_deg,o.speed_kt*Math.max(0,e.sim_sec-o.start_delay_min*60)/3600):o;
  if(e.sim_sec<o.start_delay_min*60||e.sim_sec>(o.start_delay_min+o.lifetime_min)*60||distanceNm(e.position,expected)>.02)throw Error('Objet hors de sa trajectoire ou de sa période');
  if(o.altitude_mode==='msl'&&Math.abs(e.position.altitude_ft-o.altitude_ft)>2)throw Error('Altitude objet incohérente');
  if(distanceNm(e.pilot,e.position)>o.detection_range_nm+.001||Math.abs(e.pilot.altitude_ft-e.position.altitude_ft)>o.detection_height_ft+1)throw Error('Confirmation hors portée');
 }
 const {token,...safe}=e;return safe;
}

