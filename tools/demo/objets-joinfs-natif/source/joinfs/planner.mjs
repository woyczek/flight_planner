import crypto from 'node:crypto';import {buildSession,destination,distanceNm} from '../objects.mjs';import {modelIdentity} from './models.mjs';
const R=Math.PI/180;
function bounded(n,min,max,name){if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw Error(name+' hors bornes');return n;}
const bearing=(a,b)=>(Math.atan2(Math.sin((b.lon-a.lon)*R)*Math.cos(b.lat*R),Math.cos(a.lat*R)*Math.sin(b.lat*R)-Math.sin(a.lat*R)*Math.cos(b.lat*R)*Math.cos((b.lon-a.lon)*R))/R+360)%360;
function vertical(o){const mode=o.altitude_mode??(o.kind==='ship'?'water':o.kind==='aircraft'?'msl':'terrain');if(!['terrain','water','msl','agl'].includes(mode))throw Error('Référence verticale inconnue');if(o.kind==='ship'&&mode!=='water')throw Error('Bateau : surface eau obligatoire');if(o.kind==='aircraft'&&!['msl','agl'].includes(mode))throw Error('Aéronef : MSL ou AGL');if(mode==='agl'&&o.altitude_ft!=null||mode==='msl'&&o.height_agl_ft!=null)throw Error('AGL et MSL sont exclusifs');return {mode,value_ft:mode==='msl'?bounded(o.altitude_ft,-1500,60000,'altitude MSL'):mode==='agl'?bounded(o.height_agl_ft,0,30000,'hauteur AGL'):0};}
function locate(doc,ref){const p=ref==='ORIGIN'?doc.origin:ref==='DESTINATION'?doc.destination:ref==='TARGET'?doc.target:[...(doc.turning_points||[]),...(doc.rendezvous||[])].find(p=>p.id===ref);if(!p||!Number.isFinite(p.lat)||!Number.isFinite(p.lon))throw Error('Point sans position : '+ref);return p;}
function routeProgram(doc,o){
 const r=o.route;if(!r||!Array.isArray(r.points)||r.points.length<2||r.points.length>100)throw Error('Route : 2 à 100 passages');
 let nodes=r.points.map(p=>({...locate(doc,p.point),speed_kt:bounded(p.speed_kt,.1,o.kind==='ship'?80:1000,'vitesse de passage'),vertical:vertical({...o,...p})}));
 const repeat=r.repeat??'once';if(!['once','loop','pingpong'].includes(repeat))throw Error('Répétition invalide');
 if(repeat==='loop'&&distanceNm(nodes[0],nodes.at(-1))>=.001)nodes=[...nodes,nodes[0]];if(repeat==='pingpong')nodes=[...nodes,...nodes.slice(0,-1).reverse()];
 const legs=[];let duration=0;
 for(let i=1;i<nodes.length;i++){
  const a=nodes[i-1],b=nodes[i],nm=distanceNm(a,b);if(nm<.001)throw Error('Passages consécutifs trop proches');
  if(a.vertical.mode!==b.vertical.mode)throw Error('Un changement AGL/MSL exige un passage de transition résolu ; exporter des tronçons homogènes');
  const seconds=nm*3600/((a.speed_kt+b.speed_kt)/2);legs.push({a,b,nm,seconds,start:duration,heading:bearing(a,b)});duration+=seconds;
 }
 return {duration,repeat,legs};
}
function onRoute(program,time){const t=program.repeat==='once'?Math.min(time,program.duration):time%program.duration,leg=program.legs.find(l=>t<l.start+l.seconds)||program.legs.at(-1),dt=Math.min(leg.seconds,Math.max(0,t-leg.start)),u=dt/leg.seconds;
 const travelled=(leg.a.speed_kt*dt+(leg.b.speed_kt-leg.a.speed_kt)*dt*dt/(2*leg.seconds))/3600;
 return {...destination(leg.a,leg.heading,Math.min(leg.nm,travelled)),heading_deg:leg.heading,speed_kt:leg.a.speed_kt+(leg.b.speed_kt-leg.a.speed_kt)*u,vertical:{mode:leg.a.vertical.mode,value_ft:leg.a.vertical.value_ft+(leg.b.vertical.value_ft-leg.a.vertical.value_ft)*u},bank_deg:0};
}
function onRacetrack(o,time){const r=o.racetrack,L=bounded(r?.leg_nm,.1,100,'branche hippodrome'),radius=bounded(r?.turn_radius_nm,.05,20,'rayon hippodrome'),axis=bounded(r?.axis_deg,0,359.999,'axe hippodrome'),sign=r.turn==='left'?-1:r.turn==='right'?1:0;if(!sign)throw Error('Sens hippodrome left/right requis');
 const perimeter=2*L+2*Math.PI*radius,d=(o.speed_kt*time/3600)%perimeter;let x,y,theta=0,bank=0;
 if(d<L){x=d;y=0;}else if(d<L+Math.PI*radius){theta=(d-L)/radius;x=L+radius*Math.sin(theta);y=radius*(1-Math.cos(theta));bank=Math.atan((o.speed_kt*.514444444)**2/(radius*1852*9.80665))/R;}
 else if(d<2*L+Math.PI*radius){x=L-(d-L-Math.PI*radius);y=2*radius;theta=Math.PI;}
 else{theta=Math.PI+(d-2*L-Math.PI*radius)/radius;x=radius*Math.sin(theta);y=radius*(1-Math.cos(theta));bank=Math.atan((o.speed_kt*.514444444)**2/(radius*1852*9.80665))/R;}
 const east=x*Math.sin(axis*R)+sign*y*Math.cos(axis*R),north=x*Math.cos(axis*R)-sign*y*Math.sin(axis*R),p=destination(o,(Math.atan2(east,north)/R+360)%360,Math.hypot(east,north));
 return {...p,heading_deg:(axis+sign*theta/R+360)%360,speed_kt:o.speed_kt,bank_deg:sign*bank,vertical:vertical(o)};
}
export function planMission(mission,catalog,root,{duration_sec=600,sample_sec=.5}={}){
 bounded(duration_sec,1,86400,'durée');bounded(sample_sec,.1,5,'intervalle');if(mission.objects?.length>16)throw Error('16 objets maximum pour laisser des places aux joueurs JoinFS');
 const transformed=structuredClone(mission);
 transformed.objects=transformed.objects.map(o=>{const t={...o};if(o.motion==='route'){const first=o.route?.points?.[0];Object.assign(t,locate(mission,first?.point));t.speed_kt=first.speed_kt;t.altitude_mode=first.altitude_mode??o.altitude_mode;t.altitude_ft=first.altitude_ft??o.altitude_ft;t.motion='axis';t.course_deg=0;}if(o.motion==='racetrack'){t.motion='axis';t.course_deg=o.racetrack?.axis_deg;}if(t.altitude_mode==='agl'){t.altitude_mode='msl';t.altitude_ft=0;}return t;});
 const normalized=buildSession(transformed,catalog,root),warnings=[...normalized.warnings];
 const tracks=normalized.objects.map((base,index)=>{
  const o={...mission.objects[index],lat:base.lat,lon:base.lon,speed_kt:base.speed_kt,course_deg:base.course_deg,constraints:{...base.constraints,...mission.objects[index].constraints}},motion=o.motion??'static',program=motion==='route'?routeProgram(mission,o):null,frames=[];
  for(const key of ['max_turn_deg_sec','max_climb_ft_min','max_descent_ft_min'])if(o.constraints[key]!=null)bounded(o.constraints[key],.1,key==='max_turn_deg_sec'?30:10000,key);
  if(motion==='route')warnings.push(o.id+' : passages fly-over avec angles de route ; utiliser un hippodrome pour des virages continus.');
  const begin=base.start_delay_min*60,end=Math.min(duration_sec,begin+base.lifetime_min*60,program?.repeat==='once'?begin+program.duration:Infinity);if(begin>=end)throw Error('Objet sans période dans cet enregistrement');
  if((end-begin)/sample_sec>100000)throw Error('Trop de points à préparer');
  for(let t=begin;t<=end+1e-7;t=Math.min(end,t+sample_sec)){
   const elapsed=t-begin,p=motion==='route'?onRoute(program,elapsed):motion==='racetrack'?onRacetrack(o,elapsed):{...(motion==='axis'?destination(o,o.course_deg,o.speed_kt*elapsed/3600):o),heading_deg:o.course_deg,speed_kt:o.speed_kt,bank_deg:0,vertical:vertical(o)};
   if(p.speed_kt<base.constraints.min_speed_kt||p.speed_kt>base.constraints.max_speed_kt)throw Error(o.id+' : vitesse hors contraintes');
   frames.push({time:+t.toFixed(6),lat:p.lat,lon:p.lon,heading_deg:p.heading_deg,bank_deg:p.bank_deg,vertical:p.vertical,speed_kt:p.speed_kt});if(t===end)break;
  }
  for(let i=1;i<frames.length;i++){const a=frames[i-1],b=frames[i],dt=b.time-a.time,turn=Math.abs(((b.heading_deg-a.heading_deg+540)%360)-180)/dt;
   if(o.constraints.max_turn_deg_sec!=null&&turn>o.constraints.max_turn_deg_sec+.01)throw Error(o.id+' : virage hors contrainte, arrondir la route');
   const climb=(b.vertical.value_ft-a.vertical.value_ft)*60/dt;if(o.constraints.max_climb_ft_min!=null&&climb>o.constraints.max_climb_ft_min+.01||o.constraints.max_descent_ft_min!=null&&-climb>o.constraints.max_descent_ft_min+.01)throw Error(o.id+' : changement de niveau hors contrainte');
  }
  return {id:o.id,kind:o.kind,...modelIdentity(base.asset),asset:base.asset,offset_m:base.offset_m,heading_offset_deg:base.heading_offset_deg,constraints:{...base.constraints,...mission.objects[index].constraints},frames};
 });
 if(tracks.reduce((n,t)=>n+t.frames.length,0)>200000)throw Error('Maximum 200 000 points de trajectoire');
 const body={protocol:1,mission:normalized.mission,duration_sec,sample_sec,tracks};return {...body,hash:crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex'),warnings};
}
export function resolvePlan(plan,profile=null){
 if(profile&&(profile.plan_hash!==plan.hash||!Array.isArray(profile.tracks)))throw Error('Profil terrain d’un autre plan');
 const tracks=plan.tracks.map(track=>({...track,frames:track.frames.map((p,index)=>{
  const sample=profile?.tracks.find(t=>t.id===track.id)?.samples[index],needsTerrain=['terrain','agl'].includes(p.vertical.mode);
  if(needsTerrain&&(!sample||sample.available!==true))throw Error(`${track.id} point ${index} : relevé terrain X-Plane requis`);
  if(sample&&(sample.index!==index||distanceNm(sample,p)>.001))throw Error('Profil terrain décalé');
  const terrain=sample?.available===true?bounded(sample.elevation_m,-500,9000,'terrain'):p.vertical.mode==='water'?0:null;
  if(p.vertical.mode==='water'&&sample&&(!sample.available||sample.is_wet!==true))throw Error('Bateau : point hors eau ou inconnu');
  const altitude=p.vertical.mode==='msl'?p.vertical.value_ft*.3048:p.vertical.mode==='agl'?terrain+p.vertical.value_ft*.3048:terrain;
  if(track.kind==='aircraft'&&terrain!=null&&altitude-terrain<track.constraints.min_clearance_ft*.3048)throw Error('Garde au relief insuffisante');
  const next=track.frames[Math.min(index+1,track.frames.length-1)],heading=bearing(p,next),dt=next.time-p.time,nm=distanceNm(p,next),speed=dt>0?nm*1852/dt:0;
  return {...p,heading_deg:(p.heading_deg+track.heading_offset_deg+360)%360,altitude_m:altitude+track.offset_m,terrain_m:terrain??0,on_ground:['terrain','water'].includes(p.vertical.mode),east_ms:speed*Math.sin(heading*R),north_ms:speed*Math.cos(heading*R),up_ms:0};
 })}));
 for(const track of tracks)for(let i=1;i<track.frames.length;i++){
  const a=track.frames[i-1],b=track.frames[i],dt=b.time-a.time,climb=(b.altitude_m-a.altitude_m)/.3048*60/dt;
  if(track.constraints.max_climb_ft_min!=null&&climb>track.constraints.max_climb_ft_min+.1||track.constraints.max_descent_ft_min!=null&&-climb>track.constraints.max_descent_ft_min+.1)throw Error(track.id+' : profil terrain non compatible avec les capacités verticales');
  a.up_ms=(b.altitude_m-a.altitude_m)/dt;
  a.pitch_deg=track.kind==='aircraft'?Math.atan2(a.up_ms,Math.hypot(a.east_ms,a.north_ms))/R:0;
 }
 return tracks;
}
