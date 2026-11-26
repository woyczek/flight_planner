"""Loopback-only workbench; explicit, separate writes for parser corrections and target JSON."""
import argparse, copy, hashlib, json, re, secrets, threading, webbrowser
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse,unquote
from vac_parser import AD_CODE_PATTERN,DEFAULT_OUTPUT,DEFAULT_SOURCE,read,write,stamp,sha,apply_corrections,all_features,inverse_xy,correction_items

HERE=Path(__file__).resolve().parent
def revision(path): return sha(path) if path.exists() else None

def preview_file(data,name):
    import re
    match=re.fullmatch(r'(VAC|VACH)-('+AD_CODE_PATTERN+r')-(\d+)\.png',name)
    if not match:raise ValueError('Nom d’aperçu invalide')
    kind,code,number=match[1],match[2],int(match[3]);ad=read(data/'base'/f'{code}.json')
    chart=ad['vac']['charts'][kind]
    if not any(p['pdfPage']==number for p in chart.get('pages',[])):raise ValueError('Page non géoréférencée')
    source=chart['source'];target=data/'previews'/name;metadata=target.with_suffix('.meta.json')
    if sha(source['file'])!=source['sha256']:raise ValueError('PDF modifié : réextraire avant de consulter cet aperçu')
    if target.exists()and metadata.exists()and read(metadata).get('sha256')==source['sha256']:return target
    import pypdfium2 as pdfium
    doc=pdfium.PdfDocument(source['file'])
    try:
        target.parent.mkdir(parents=True,exist_ok=True);temp=target.with_suffix('.tmp.png')
        doc[number-1].render(scale=1.6).to_pil().save(temp);temp.replace(target)
        write(metadata,{'sha256':source['sha256'],'pdfPage':number})
    finally:doc.close()
    return target

def normalise_patch(base, patch):
    if patch.get('icao')!=base['ad']:raise ValueError('AD de correction incorrect')
    tested=apply_corrections(base,patch)
    if tested['vac']['corrections']['stale']: raise ValueError('Corrections obsolètes ou sommets inconnus : '+', '.join(tested['vac']['corrections']['stale']))
    byid=correction_items(base)
    points=[]
    if len(patch.get('points',[]))!=len({p['id'] for p in patch.get('points',[])}):raise ValueError('Sommet en double')
    for change in patch.get('points',[]):
        page,f,v=byid[change['id']]; ll=change['coordinates'];cal=page.get('calibration')
        xy=inverse_xy(cal,ll)if cal else None;source_xy=v.get('pdfXY')or(inverse_xy(cal,v['coordinates'])if cal else None)
        points.append({'id':change['id'],'chartKind':f['chartKind'],'pdfPage':page['pdfPage'],'sourceSha256':f['sourceSha256'],
            'coordinates':ll,'sourceCoordinates':v['coordinates'],
            'deltaLonLat':[ll[i]-v['coordinates'][i] for i in (0,1)],
            'sourcePdfXY':source_xy,'deltaPdfXY':[xy[i]-source_xy[i] for i in (0,1)]if xy and source_xy else None,
            'reason':str(change.get('reason','Repositionnement dans le lecteur'))[:500]})
    return {'schemaVersion':'1.0','icao':base['ad'],'parserVersion':base['vac']['parserVersion'],'updatedAt':stamp(),
        'coordinateOrder':'longitude,latitude','points':points,'fields':patch.get('fields',[])}

def make_handler(data,token):
    data=Path(data).resolve()
    lock=threading.Lock()
    class Handler(BaseHTTPRequestHandler):
        def log_message(self,fmt,*args): print(fmt%args)
        def response(self,status,value,content_type='application/json; charset=utf-8'):
            body=value if isinstance(value,bytes) else json.dumps(value,ensure_ascii=False,allow_nan=False).encode('utf8')
            self.send_response(status);self.send_header('Content-Type',content_type);self.send_header('Content-Length',str(len(body)))
            self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');self.end_headers();self.wfile.write(body)
        def code(self,path):
            import re
            code=path.rsplit('/',1)[-1]
            if not re.fullmatch(AD_CODE_PATTERN,code):raise ValueError('Code AD invalide')
            return code
        def guard(self):
            allowed={f'127.0.0.1:{self.server.server_port}',f'localhost:{self.server.server_port}'}
            if self.headers.get('Host') not in allowed: return False
            origin=self.headers.get('Origin')
            return origin is None or origin in {'http://'+h for h in allowed}
        def do_GET(self):
            if not self.guard(): return self.response(403,{'error':'Origine refusée'})
            path=unquote(urlparse(self.path).path)
            try:
                if path in ('/','/index.html'):
                    html=(HERE/'vac-workbench.html').read_text(encoding='utf8').replace('__VAC_TOKEN__',token)
                    return self.response(200,html.encode('utf8'),'text/html; charset=utf-8')
                if path in ('/vac-app.js','/vac-app.css','/pdf-overlay.css'):
                    return self.response(200,(HERE/path[1:]).read_bytes(),'text/javascript; charset=utf-8' if path.endswith('js') else 'text/css; charset=utf-8')
                if path=='/api/inventory':return self.response(200,read(data/'index.json'))
                if path.startswith('/api/ad/'):
                    code=self.code(path);base_path=data/'base'/f'{code}.json'
                    if not base_path.exists():return self.response(404,{'error':'AD inventorié, extraction non réalisée pour ce terrain.'})
                    base=read(base_path);patch_path=data/'corrections'/f'{code}.json';patch=read(patch_path) if patch_path.exists() else {'icao':code,'points':[],'fields':[]}
                    target_path=data/f'{code}.json';target_patch=read(target_path).get('vac',{}).get('correctionPatch',{'points':[],'fields':[]}) if target_path.exists() else {'points':[],'fields':[]}
                    return self.response(200,{'base':base,'ad':apply_corrections(base,patch),'patch':patch,'targetPatch':target_patch,
                        'patchRevision':revision(patch_path),'targetRevision':revision(data/f'{code}.json')})
                if path.startswith('/previews/'):
                    name=path.split('/')[-1]
                    if '/' in path[len('/previews/'):] or not name.endswith('.png'):raise ValueError('Chemin invalide')
                    with lock:preview=preview_file(data,name)
                    return self.response(200,preview.read_bytes(),'image/png')
                if path.startswith('/source/'):
                    parts=path.split('/');kind=parts[2];code=self.code('/'+parts[3]); index=read(data/'index.json')
                    entry=next(a for a in index['aerodromes'] if a['icao']==code);src=entry['sources'][kind]
                    if len(parts)>4:
                        if len(parts)!=5 or not parts[4].isdigit():raise ValueError('Complément PDF invalide')
                        src=src.get('supplements',[])[int(parts[4])]
                    return self.response(200,Path(src['file']).read_bytes(),'application/pdf')
                return self.response(404,{'error':'Page introuvable'})
            except (FileNotFoundError,StopIteration,KeyError):return self.response(404,{'error':'Fichier absent'})
            except (ValueError,IndexError) as exc:return self.response(400,{'error':str(exc)})
        def do_POST(self):
            if not self.guard() or self.headers.get('X-VAC-Token')!=token:return self.response(403,{'error':'Session invalide'})
            path=urlparse(self.path).path
            try:
                if not (path.startswith('/api/corrections/') or path.startswith('/api/target/')):return self.response(404,{'error':'Action inconnue'})
                length=int(self.headers.get('Content-Length','0'))
                if not 0<length<5_000_000:raise ValueError('Taille de requête invalide')
                payload=json.loads(self.rfile.read(length));code=self.code(path)
                with lock:
                    base=read(data/'base'/f'{code}.json');patch=normalise_patch(base,payload['patch'])
                    correction='/corrections/' in path
                    target=data/'corrections'/f'{code}.json' if correction else data/f'{code}.json'
                    if payload.get('expectedRevision')!=revision(target):return self.response(409,{'error':'Fichier modifié dans une autre session ; recharge le terrain avant d’enregistrer.'})
                    # Recheck every source fingerprint immediately before accepting a manual write.
                    for src in [s for source in base['vac']['sources'].values()for s in [source,*source.get('supplements',[])]]:
                        if sha(src['file'])!=src['sha256']:return self.response(409,{'error':'PDF source modifié : relance le parseur avant enregistrement.'})
                    value=patch if correction else apply_corrections(base,patch)
                    if not correction: value['generatedAt']=stamp()
                    if target.exists():
                        backup=data/'history'/code/(('corrections-' if correction else 'target-')+stamp().replace(':','-')+'.json')
                        write(backup,read(target))
                    write(target,value)
                    return self.response(200,{'path':str(target),'revision':revision(target),'patch':patch,
                        'savedPoints':len(patch['points']),'savedFields':len(patch['fields'])})
            except (ValueError,KeyError,TypeError,json.JSONDecodeError) as exc:return self.response(400,{'error':str(exc)})
            except OSError as exc:return self.response(500,{'error':str(exc)})
    return Handler

def serve(data,port=8766,open_browser=False):
    token=secrets.token_urlsafe(32)
    server=ThreadingHTTPServer(('127.0.0.1',port),make_handler(data,token))
    url=f'http://127.0.0.1:{server.server_port}/';print('VAC workbench:',url,flush=True)
    if open_browser:webbrowser.open(url)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--data',default=DEFAULT_OUTPUT);p.add_argument('--port',type=int,default=8766);p.add_argument('--open',action='store_true')
    a=p.parse_args();serve(a.data,a.port,a.open)
