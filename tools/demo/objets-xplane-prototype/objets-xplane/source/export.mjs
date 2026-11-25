import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {readMission,buildSession,luaLiteral} from './objects.mjs';
const [missionFile,catalogFile,xplaneRoot,out,yamlLibrary]=process.argv.slice(2);
if(!out){console.error('node export.mjs mission.yaml catalogue-local.json dossier-XPlane dossier-sortie [js-yaml.min.js]');process.exit(1);}
try{
 const session=buildSession(readMission(missionFile,yamlLibrary||'E:/DEFA/frame/lib/js-yaml.min.js'),JSON.parse(fs.readFileSync(catalogFile,'utf8')),xplaneRoot);
 const base=path.dirname(fileURLToPath(import.meta.url));fs.mkdirSync(out,{recursive:true});
 for(const f of ['DEFA_objects.lua','DEFA_objects_core.lua']){let text=fs.readFileSync(path.join(base,'runtime',f),'utf8');if(f==='DEFA_objects.lua')text=text.replace('__MISSION_CONFIG__',()=>luaLiteral(session));fs.writeFileSync(path.join(out,f),text);}
 fs.writeFileSync(path.join(out,'session-local.json'),JSON.stringify(session,null,2));
 console.log(`${session.mission} : ${session.objects.length} objet(s), paquet généré ; rien installé dans X-Plane.`);for(const w of session.warnings)console.log('À vérifier : '+w);
}catch(e){console.error(e.message);process.exit(1);}
