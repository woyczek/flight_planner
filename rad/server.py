"""Loopback-only web interface for the RouteSim engine."""
import argparse, collections, datetime as dt, json, mimetypes, os, threading, webbrowser
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs
import engine
import planning,vfr,recovery

HERE=Path(__file__).resolve().parent
CONFIG=engine.load(HERE/'config.json')
CACHE=collections.OrderedDict(); LOCK=threading.Lock()
SOLVER_LOCK=threading.RLock()

class SearchBudget(Exception):pass

def context(request):
    date=dt.datetime.fromisoformat(str(request.get('date','2026-11-09T12:00')).replace('Z','+00:00'))
    if date.tzinfo: date=date.astimezone(dt.timezone.utc)
    date=date.date(); root=CONFIG.get('aerodb_root','E:/defa')
    key=(root,str(date))
    with LOCK:
        if key not in CACHE:
            CACHE[key]=(engine.Nav(root,date),engine.Rad(date))
            while len(CACHE)>3: CACHE.popitem(last=False)
        return CACHE[key]

def plan(request):
    with SOLVER_LOCK:
        nav,rad=context(request)
        try:return _plan(request)
        finally:nav.release_graph_caches()

def _plan(request):
    import time
    started=time.perf_counter()
    def check_budget():
        if time.perf_counter()-started>25:raise SearchBudget('Budget global de recherche atteint (25 s). Les propositions déjà contrôlées sont conservées ; la recherche n’est pas exhaustive.')
    request=dict(request,root=CONFIG.get('aerodb_root','E:/defa'))
    nav,rad=context(request)
    entered=str(request.get('route','')).strip().upper()
    words=entered.split(); airways={e['route'] for e in nav.edges}
    if words and re.fullmatch(r'[NK]\d{4}F\d{3}',words[0]):words=words[1:]
    if len(words)>=2 and words[0] in nav.ads and words[-1] in nav.ads:
        request.update(dep=words[0],arr=words[-1]); words=words[1:-1]
    elif words:
        if words[0]==request.get('dep','').upper():words=words[1:]
        if words and words[-1]==request.get('arr','').upper():words=words[:-1]
    if entered:
        for ad in [request.get('dep'),request.get('arr')]:
            if ad in nav.ads:nav.procedures.prepare(ad)
        procedure_names={p['token'] for p in nav.procedures.items}
        request['via']=[w for w in words if not engine.route_connector(w,nav,airways,procedure_names)]
    if request.get('mode','calculate')=='calculate' and request.get('allow_levels',True): request.setdefault('level_strategy','adapt')
    request=planning.normalize(request,CONFIG.get('aerodb_root','E:/defa'))
    request['_deadline']=started+25
    if request.get('traffic')=='VFR':return vfr.plan(request,nav)
    if request.get('objective')=='economical':request['alternatives']=True
    try: primary=engine.assess(request,nav,rad)
    except ValueError as e: primary=dict(ok=False,status='CALCUL IMPOSSIBLE',error=str(e),route=request.get('route',''),legs=[],issues=[])
    rad_retries=[]
    # A route-dependent RAD condition can only be decided after its SID, route
    # and STAR are known. Retry with the implicated procedure/links excluded.
    if request.get('mode','calculate')=='calculate':
        avoids=[]
        for attempt in range(3):
            findings=primary.get('rad_summary',{}).get('findings',[])
            extra=primary.get('rad_summary',{}).get('search_exclusions',[])
            if not findings or not extra:break
            avoids=list({json.dumps(x,sort_keys=True):x for x in [*avoids,*extra]}.values())
            try:
                check_budget()
                candidate=engine.assess(dict(request,_rad_avoid=avoids),nav,rad)
                rad_retries.append(dict(excluded=avoids,route=candidate['route'],errors=[i['text'] for i in candidate['issues'] if i['level']=='ERREUR']))
                primary=candidate
                request['_rad_avoid']=avoids
            except (ValueError,SearchBudget) as e:
                rad_retries.append(dict(excluded=avoids,error=str(e)));break
    rejected=not primary['ok'] or bool(primary.get('data_gaps')) or any(i['level']=='ERREUR' for i in primary['issues'])
    coverage_gaps=recovery.terminal_gaps(request,nav) if rejected else []
    alternatives=[]; failures=list(coverage_gaps); tested=[]
    if (rejected or request.get('alternatives')) and not coverage_gaps:
        try:
            dep=str(request['dep']).strip().upper(); arr=str(request['arr']).strip().upper(); fl=int(request['fl'])
            radius=float(request.get('radius',40)); blocks=rad.blocks(dep,arr,None)
            if not 1<=radius<=100 or not 10<=fl<=660: raise ValueError('Niveau ou rayon hors limites.')
            options=engine.profile_options(request); mandatory=engine.via_points(request)
            allow_levels=request.get('allow_levels',True)
            levels=request.get('alternative_levels',[])
            explicit_levels=bool(levels)
            if isinstance(levels,str): levels=[int(x.strip().upper().replace('FL','')) for x in levels.split(',') if x.strip()]
            if any(not 10<=int(x)<=660 for x in levels): raise ValueError('Paliers alternatifs : FL010 à FL660.')
            levels=list(dict.fromkeys(map(int,levels))) if levels else list(range(fl-20,max(50,fl-200)-1,-20))
            def signature(r):
                return (r.get('route'),tuple((round(l.get('altitude_start_ft',0)/100),round(l.get('altitude_end_ft',0)/100),round(l.get('altitude_min_ft',0)/100),round(l.get('altitude_max_ft',0)/100)) for l in r.get('legs',[])))
            seen={signature(primary)} if primary.get('ok') else set()
            def consider(route,level,strategy,path=None,conditions=None):
                check_budget()
                r=engine.assess(dict(conditions or request,mode='validate',route=route,fl=level,level_strategy=strategy),nav,rad,_path=path)
                errs=[i['text'] for i in r['issues'] if i['level']=='ERREUR']
                tested.append(dict(fl=level,strategy=strategy,route=route,errors=errs))
                if errs or r.get('data_gaps'): return
                sig=signature(r)
                if sig in seen: return
                seen.add(sig); r['generated']=True
                r['alternative_kind']=('FRA · '+', '.join(r['fra_stats']['areas'])) if r['fra_stats']['segments'] else 'Profil avec paliers adaptés' if strategy=='adapt' else 'Palier de croisière FL'+str(level)
                r['report']=engine.report(r); alternatives.append(r)
            # Reserve a genuinely FRA-constrained candidate before filling the list with level variants.
            if request.get('enable_fra',True) and not request.get('unable_rnav') and (rejected or not primary.get('fra_stats',{}).get('segments')):
                forced=dict(request,require_fra=True,enable_fra=True)
                try:
                    check_budget()
                    route,path=nav.generate(dep,arr,fl,radius,blocks,options,True,mandatory,nav_time(request),True,forced)
                    consider(route,fl,'adapt',path,forced)
                except ValueError as e:failures.append('Recherche FRA imposée : '+str(e))
            if allow_levels and explicit_levels:
                for level in levels:
                    if len(alternatives)>=3:break
                    try:
                        check_budget()
                        route,path=nav.generate(dep,arr,level,radius,rad.blocks(dep,arr,None),options,allow_steps=True,via=mandatory,when=nav_time(request),enable_fra=request.get('enable_fra',True),terminal=request)
                        consider(route,level,'adapt',path)
                    except ValueError as e:failures.append(f'FL{level}: '+str(e))
            if len(alternatives)<3 and allow_levels and primary.get('ok') and (rejected or request.get('mode')=='validate'):
                consider(primary['route'],fl,'adapt')
            # A stepped route can connect airway bands even when the target-FL graph is disconnected.
            if allow_levels and len(alternatives)<3 and (rejected or request.get('mode')=='validate'):
                try:
                    check_budget()
                    route,path=nav.generate(dep,arr,fl,radius,blocks,options,True,mandatory,nav_time(request),request.get('enable_fra',True),request)
                    consider(route,fl,'adapt',path)
                except ValueError as e: failures.append(str(e))
            if len(alternatives)<3:
                try:
                    routes=nav.alternate_routes(dep,arr,fl,radius,blocks,count=4,profile_options=options,allow_steps=bool(allow_levels),via=mandatory,when=nav_time(request),enable_fra=request.get('enable_fra',True),terminal=request,return_paths=True)
                    for route,path in routes:
                        consider(route,fl,'adapt' if allow_levels else 'natural',path)
                        if len(alternatives)==3: break
                except ValueError as e: failures.append(str(e))
            if allow_levels:
                for level in levels:
                    if len(alternatives)>=3: break
                    try:
                        check_budget()
                        route,path=nav.generate(dep,arr,level,radius,rad.blocks(dep,arr,None),options,allow_steps=True,via=mandatory,when=nav_time(request),enable_fra=request.get('enable_fra',True),terminal=request)
                        consider(route,level,'adapt',path)
                    except ValueError as e: failures.append(f'FL{level}: '+str(e))
        except (ValueError,SearchBudget) as e: failures.append(str(e))
    wanted=rejected or bool(request.get('alternatives'))
    if not alternatives:
        failures.extend(e for t in tested for e in t['errors'])
    alternatives.sort(key=lambda r:r.get('objective_score',r['distance_nm']))
    if request.get('mode','calculate')=='calculate' and primary.get('ok') and not primary.get('data_gaps') and not any(i['level']=='ERREUR' for i in primary['issues']) and request.get('objective') in ['fastest','economical']:
        pool=[primary,*alternatives];pool.sort(key=lambda r:r.get('objective_score',r['distance_nm']));primary=pool[0];alternatives=pool[1:4]
    message=(f'{len(alternatives)} alternative(s) sans incompatibilité détectée. Le niveau et les paliers de chaque proposition sont affichés.'
             if alternatives else 'Aucune alternative trouvée. Consulter les niveaux essayés et leurs motifs d’échec.') if wanted else ''
    repli=None
    if rejected and not alternatives:
        nav._routing_cache.clear()
        try:repli=recovery.propose(request,nav,rad)
        except (ValueError,KeyError) as e:repli=dict(proposals=[],pieces=[],note='Repli : '+str(e))
        if repli.get('proposals'):message='Calcul réseau incomplet : '+str(len(repli['proposals']))+' propositions de repli, dont '+str(repli.get('fra_pieces',0))+' portion(s) FRA. Les raccords DCT restent non validés.'
    return dict(primary=primary,alternatives=alternatives,recovery=repli,coverage_gaps=coverage_gaps,rad_search_attempts=rad_retries,alternative_message=message,alternative_failures=list(dict.fromkeys(failures)),
                search=dict(algorithm='A* avec labels altitude ; variantes par pénalisation des liens',last=nav.last_search if hasattr(nav,'last_search') else None,total_seconds=round(time.perf_counter()-started,3)),automatic_alternatives=rejected,alternative_attempts=tested,input_route=request.get('route',''),via=request.get('via',[]),dep=request.get('dep'),arr=request.get('arr'))

def nav_time(request):
    value=dt.datetime.fromisoformat(request['date'].replace('Z','+00:00'))
    return value.astimezone(dt.timezone.utc).replace(tzinfo=None) if value.tzinfo else value

class Handler(BaseHTTPRequestHandler):
    def log_message(self,format,*args): pass

    def reply(self,data,status=200):
        body=json.dumps(data,ensure_ascii=False).encode('utf-8')
        self.send_response(status); self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Cache-Control','no-store'); self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Content-Length',str(len(body))); self.end_headers(); self.wfile.write(body)

    def do_GET(self):
        path=urlparse(self.path).path
        if path=='/api/health': return self.reply(dict(ok=True,app='RouteSim',version='7.0',pid=os.getpid(),root=str(HERE)))
        if path=='/api/aircraft':return self.reply(dict(aircraft=planning.aircraft(CONFIG.get('aerodb_root','E:/defa'))))
        if path=='/api/info':
            try:
                query=parse_qs(urlparse(self.path).query); date=query.get('date',['2026-11-09T12:00'])[0]
                nav,rad=context(dict(date=date))
                return self.reply(dict(root=CONFIG.get('aerodb_root'),coverage=nav.coverage,airports=[dict(icao=k,name=v.get('name',''),lat=v['lat'],lon=v['lon']) for k,v in nav.ads.items()],
                    rad=rad.book['title'] if rad.book else None))
            except Exception as e: return self.reply(dict(error=str(e)),400)
        files={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/profile-ui.js':'profile-ui.js','/style.css':'style.css','/maplibre-gl.js':'maplibre-gl.js','/maplibre-gl.css':'maplibre-gl.css','/leaflet.js':'leaflet.js','/leaflet.css':'leaflet.css'}
        files['/profile.css']='profile.css'
        files['/modes.js']='modes.js'
        if path not in files: return self.reply(dict(error='Introuvable'),404)
        file=HERE/'web'/files[path]
        if not file.exists(): return self.reply(dict(error='Fichier absent : '+files[path]),404)
        data=file.read_bytes(); mime=mimetypes.guess_type(file.name)[0] or 'application/octet-stream'
        self.send_response(200); self.send_header('Content-Type',mime+'; charset=utf-8'); self.send_header('Content-Length',str(len(data)))
        self.send_header('Cache-Control','no-store, max-age=0'); self.send_header('X-Content-Type-Options','nosniff'); self.end_headers(); self.wfile.write(data)

    def do_POST(self):
        if self.path!='/api/plan': return self.reply(dict(error='Introuvable'),404)
        origin=self.headers.get('Origin')
        if origin and origin!=f'http://127.0.0.1:{self.server.server_port}': return self.reply(dict(error='Origine refusée'),403)
        try:
            size=int(self.headers.get('Content-Length',0))
            if not 0<size<=32768: return self.reply(dict(error='Requête vide ou trop volumineuse'),413)
            request=json.loads(self.rfile.read(size))
            return self.reply(plan(request))
        except (ValueError,KeyError,TypeError) as e: return self.reply(dict(error=str(e)),400)
        except Exception as e: return self.reply(dict(error='Erreur de lecture ou de calcul : '+str(e)),500)

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--port',type=int,default=8766); parser.add_argument('--no-browser',action='store_true'); args=parser.parse_args()
    try: server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler)
    except OSError:
        # Reuse an existing RouteSim instance only after checking its identity.
        import urllib.request
        try:
            with urllib.request.urlopen(f'http://127.0.0.1:{args.port}/api/health',timeout=2) as r: existing=json.load(r)
            if existing.get('app')=='RouteSim':
                if not args.no_browser: webbrowser.open(f'http://127.0.0.1:{args.port}/?v=7.0')
                return
        except Exception: pass
        raise SystemExit(f'Le port {args.port} est occupé par une autre application.')
    print(f'RouteSim : http://127.0.0.1:{server.server_port}',flush=True)
    print('Serveur local. Fermer cette fenêtre pour arrêter RouteSim.',flush=True)
    if not args.no_browser: threading.Timer(.5,lambda:webbrowser.open(f'http://127.0.0.1:{server.server_port}/?v=7.0')).start()
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()

if __name__=='__main__': main()
