// Écriture du format natif historique .jfs, lu également par JoinFS 26.7.
// Vérifié contre LegacyJfsImporter.cs (commit documenté dans PROVENANCE.md).
import {ident} from '../objects.mjs';
const cat=parts=>Buffer.concat(parts),u8=n=>Buffer.from([n]),i32=n=>{const b=Buffer.alloc(4);b.writeInt32LE(n);return b;},f64=n=>{const b=Buffer.alloc(8);b.writeDoubleLE(n);return b;};
function text(s){const b=Buffer.from(s,'utf8');if(b.length>512)throw Error('Texte JFS >512 octets');let n=b.length,a=[];do{const d=n&127;n>>>=7;a.push(d|(n?128:0));}while(n);return cat([Buffer.from(a),b]);}
export function writeJfs(tracks,{version=21003}={}){
 if(![21003,21023].includes(version))throw Error('Format JoinFS non pris en charge');
 if(!Array.isArray(tracks)||!tracks.length||tracks.length>16)throw Error('1 à 16 pistes JoinFS');
 const aircraft=tracks.filter(t=>t.kind==='aircraft'),objects=tracks.filter(t=>t.kind!=='aircraft');
 let total=0;
 const track=t=>{
  if(!ident(t.id)||!t.model||!Array.isArray(t.frames)||!t.frames.length||t.frames.length>100000)throw Error('Piste invalide');
  total+=t.frames.length;if(total>200000)throw Error('Trop de relevés (>200 000)');
  let last=-1;
  const frames=t.frames.map(p=>{
   for(const key of ['time','lat','lon','altitude_m','heading_deg'])if(!Number.isFinite(p[key]))throw Error('Relevé non fini : '+key);
   if(p.time<last||p.time<0||p.time>86400||Math.abs(p.lat)>90||Math.abs(p.lon)>180||p.altitude_m< -500||p.altitude_m>20000)throw Error('Relevé hors bornes');last=p.time;
   const isAircraft=t.kind==='aircraft',b=Buffer.alloc(isAircraft?(version>=21008?91:87):77);let at=0;
   for(const n of [p.lat*Math.PI/180,p.lon*Math.PI/180,p.altitude_m]){b.writeDoubleLE(n,at);at+=8;}
   for(const n of [(p.pitch_deg||0)*Math.PI/180,(p.bank_deg||0)*Math.PI/180,p.heading_deg*Math.PI/180,p.east_ms||0,p.up_ms||0,p.north_ms||0,0,0,0,0,0,0]){b.writeFloatLE(n,at);at+=4;}
   if(isAircraft){for(const n of [0,0,0,-16384,-16384]){b.writeInt16LE(n,at);at+=2;}}
   b.writeFloatLE(p.terrain_m??0,at);at+=4;
   b[at++]=p.on_ground?1:0; // L’export demande de désactiver la correction terrain de JoinFS.
   if(isAircraft&&version>=21008){b.writeFloatLE(Math.max(0,(p.altitude_m-(p.terrain_m??0))/.3048),at);at+=4;}
   if(at!==b.length)throw Error('Taille de relevé JFS incohérente');
   return cat([u8(isAircraft?1:0),f64(p.time),b]);
  });
  return cat([...(t.kind==='aircraft'?[u8(1),text(t.id),text('DEFA')]:[]),text(t.model),u8(t.kind==='aircraft'?1:0),i32(frames.length),...frames,...(version>=21004?[text(t.icao||'ZZZZ'),text('JFS')]:[])]);
 };
 const header=Buffer.alloc(2);header.writeInt16LE(version);
 return cat([header,i32(aircraft.length),...aircraft.map(track),i32(objects.length),...objects.map(track)]);
}
