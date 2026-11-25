// Adaptateur réutilisable, à appeler seulement pendant le vol concerné.
// Le consommateur doit vérifier son vol actif, sa mission, la phase et ses propres positions.
// Un événement candidate_fov n’ouvre jamais un tiroir.
export function watchObjectEvents({mission,onFound,onHint=()=>{},onGap=()=>{},onError=()=>{},fetcher=fetch,interval=1000}){
 let stopped=false,cursor=0,session=null,timer;
 async function tick(){try{
  const r=await fetcher('http://127.0.0.1:8790/api/events?after='+cursor,{cache:'no-store'});if(!r.ok)throw Error('Pont indisponible');const d=await r.json();
  if(d.mission!==mission)throw Error('Autre mission chargée dans le pont');
  if(session&&session!==d.session){cursor=0;onGap('session_changed');}session=d.session;
  if(d.gap)onGap('history_gap');
  if(!stopped)for(const e of d.events){if(e.type==='object_found')onFound(e);else if(e.type==='candidate_fov')onHint(e);}
  cursor=d.cursor;
 }catch(e){if(!stopped)onError(e);}if(!stopped)timer=setTimeout(tick,interval);}
 tick();return ()=>{stopped=true;clearTimeout(timer);};
}
