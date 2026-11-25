import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {readMission,luaLiteral} from '../objects.mjs';import {planMission,resolvePlan} from './planner.mjs';import {writeJfs} from './jfs.mjs';import {prepareModels} from './models.mjs';
const [action,...args]=process.argv.slice(2);
try{
 if(action==='plan'){
  const [mission,catalog,root,out,duration='600',step='.5',yaml]=args;if(!out)throw Error('plan mission.yaml catalogue.json XPlane sortie [durée_sec=600] [pas_sec=.5] [js-yaml.min.js]');
  const p=planMission(readMission(mission,yaml||'E:/DEFA/frame/lib/js-yaml.min.js'),JSON.parse(fs.readFileSync(catalog,'utf8')),root,{duration_sec:Number(duration),sample_sec:Number(step)});
  fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'plan-joinfs.json'),JSON.stringify(p));
  const probe=fs.readFileSync(new URL('./terrain-probe.lua',import.meta.url),'utf8').replace('__PLAN__',()=>luaLiteral(p));fs.writeFileSync(path.join(out,'DEFA_JoinFS_terrain_probe.lua'),probe);
  fs.writeFileSync(path.join(out,'modeles-requis.json'),JSON.stringify(p.tracks.map(t=>({asset:t.asset,model:t.model,kind:t.kind})),null,2));
  console.log('Plan '+p.mission+' préparé : '+p.tracks.length+' objet(s).');for(const w of p.warnings)console.log('À vérifier : '+w);
 }else if(action==='record'){
  const [planFile,out,profileFile]=args;if(!out)throw Error('record plan-joinfs.json scenario.jfs [profil-terrain.json]');
  const p=JSON.parse(fs.readFileSync(planFile,'utf8')),profile=profileFile?JSON.parse(fs.readFileSync(profileFile,'utf8')):null;
  if(!profile&&p.tracks.some(t=>t.frames.some(f=>f.vertical.mode==='water')))console.log('Attention : niveau marin MSL 0 utilisé ; caractère aquatique du parcours non mesuré. Fournir un profil X-Plane pour le vérifier.');
  const tracks=resolvePlan(p,profile);fs.writeFileSync(out,writeJfs(tracks));
  const ordered=[...tracks.filter(t=>t.kind==='aircraft'),...tracks.filter(t=>t.kind!=='aircraft')];
  fs.writeFileSync(out+'.manifest.json',JSON.stringify({mission:p.mission,plan_hash:p.hash,format:'JoinFS legacy 21003',single_playback_owner:true,terrain_profile:!!profile,warnings:p.warnings,tracks:ordered.map((t,i)=>({joinfs_track:i+1,object:t.id,kind:t.kind,model:t.model,start_sec:t.frames[0].time,end_sec:t.frames.at(-1).time}))},null,2));
  console.log('Enregistrement natif '+path.basename(out)+' créé. Aucun serveur ni connecteur de synchronisation à lancer.');
 }else if(action==='models'){
  const [catalogFile,root,planFile,out]=args;if(!out)throw Error('models catalogue.json XPlane plan-joinfs.json sortie-CSL');
  const p=JSON.parse(fs.readFileSync(planFile,'utf8')),report=prepareModels(JSON.parse(fs.readFileSync(catalogFile,'utf8')),p.tracks.map(t=>t.asset),root,out);
  console.log(report.length+' modèle(s) CSL préparés hors du simulateur ; à faire depuis les ressources locales de chaque poste.');
 }else throw Error('Actions : plan | record | models. Voir README_JOINFS.md.');
}catch(e){console.error(e.message);process.exitCode=1;}
