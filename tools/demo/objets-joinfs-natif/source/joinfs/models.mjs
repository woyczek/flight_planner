import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {localModel} from '../objects.mjs';
export function modelIdentity(asset){const code='DF'+crypto.createHash('sha256').update(asset).digest('hex').slice(0,10).toUpperCase();return {code,model:'ZZZZ JFS '+code,icao:'ZZZZ'};}
export function prepareModels(catalog,assets,root,out){
 const base=fs.realpathSync(root),packageName='DEFA_MISSION_OBJECTS',folder=path.join(out,packageName);fs.mkdirSync(folder,{recursive:true});
 const lines=['EXPORT_NAME '+packageName],report=[];
 for(const asset of [...new Set(assets)]){
  const entry=catalog[asset];if(!entry)throw Error('Modèle non associé : '+asset);
  // Un chemin physique précis est obligatoire pour garantir la variante et les textures.
  const relative=entry.mode==='file'?entry.path:entry.file;
  if(!relative)throw Error(asset+' : catalogue.file requis pour préparer un modèle de bibliothèque');
  const file=localModel(base,relative),identity=modelIdentity(asset),dest=path.join(folder,identity.code);fs.mkdirSync(dest,{recursive:true});
  let text=fs.readFileSync(file,'utf8');if(!/^[AI]\s+800\s+OBJ\b/.test(text))throw Error('Seuls les modèles OBJ8 sont acceptés');
  if(/^(?:ANIM_|ANIM_begin)/m.test(text))throw Error(asset+' : modèle animé à préparer explicitement, pas de substitution silencieuse');
  text=text.replace(/^(TEXTURE(?:_LIT|_NORMAL|_DRAPED|_DRAPED_NORMAL)?)\s+(.+)$/gm,(line,command,reference)=>{
   const pieces=reference.trim().split(/\s+/),name=pieces.pop();
   if(name==='none')return line;
   if(/[\x00-\x1f]/.test(name)||/^[\\/]|^[a-z]:/i.test(name))throw Error('Texture non relative');
   let source=path.resolve(path.dirname(file),name);
   if(!fs.existsSync(source)){const dds=source.replace(/\.(png|bmp)$/i,'.dds');if(fs.existsSync(dds))source=dds;else throw Error(asset+' : texture manquante '+name);}
   source=fs.realpathSync(source);if(!source.startsWith(base+path.sep)||!fs.statSync(source).isFile())throw Error('Texture hors X-Plane');
   const target='tex_'+crypto.createHash('sha256').update(source).digest('hex').slice(0,12)+path.extname(source);fs.copyFileSync(source,path.join(dest,target));
   return command+' '+[...pieces,target].join(' ');
  });
  fs.writeFileSync(path.join(dest,'model.obj'),text);
  lines.push('','OBJ8_AIRCRAFT '+identity.code,'OBJ8 SOLID YES '+packageName+'/'+identity.code+'/model.obj','VERT_OFFSET '+(entry.offset_m??0),'LIVERY ZZZZ JFS '+identity.code);
  report.push({asset,kind:entry.kind,...identity});
 }
 fs.writeFileSync(path.join(folder,'xsb_aircraft.txt'),lines.join('\n')+'\n');fs.writeFileSync(path.join(out,'modeles-attendus.json'),JSON.stringify(report,null,2));
 return report;
}
