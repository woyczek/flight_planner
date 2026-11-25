"""Traceable local VAC/VACH extraction. No circuit closure or inferred route reversal."""
from __future__ import annotations
import argparse, copy, hashlib, json, logging, math, re
from datetime import datetime, timezone
from pathlib import Path

VERSION = '0.2.0'
AD_CODE_PATTERN = r'(?:[A-Z0-9]{4}|LF\d{3})'
DEFAULT_SOURCE = r'C:\Users\mojan\synologydrive\DOCS\Flight\Charts\VAC'
DEFAULT_OUTPUT = r'E:\DEFA\data\sia\vac'
DEFAULT_LEGACY = r'E:\DEFA\data\sia\vfr'
HERE = Path(__file__).resolve().parent
logging.getLogger('pypdf').setLevel(logging.ERROR)

def stamp(): return datetime.now(timezone.utc).isoformat()
def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def read(path): return json.loads(Path(path).read_text(encoding='utf-8-sig'))
def write(path, value):
    path = Path(path); path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix+'.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False)+'\n', encoding='utf8')
    temp.replace(path)

def normalise(text):
    return re.sub(r'/MT(\d{1,3})(?!\d)', lambda m: chr(int(m[1])), text)

def calibration_xy(cal, xy):
    x1, lon1, x2, lon2 = cal['longitude']
    y1, lat1, y2, lat2 = cal['latitude']
    return [lon1+(xy[0]-x1)*(lon2-lon1)/(x2-x1),lat1+(xy[1]-y1)*(lat2-lat1)/(y2-y1)]

def inverse_xy(cal, ll):
    x1, lon1, x2, lon2 = cal['longitude']; y1, lat1, y2, lat2 = cal['latitude']
    return [x1+(ll[0]-lon1)*(x2-x1)/(lon2-lon1), y1+(ll[1]-lat1)*(y2-y1)/(lat2-lat1)]

def sample_path(path, tolerance=.15):
    """Flatten cubic Beziers in PDF points, retaining separate PDF subpaths."""
    paths=[]; current=[]; previous=None
    def cubic(a,b,c,d):
        # A conservative length bound keeps curves smooth without trusting control points as vertices.
        steps=max(4,min(200,math.ceil((math.dist(a,b)+math.dist(b,c)+math.dist(c,d))/2)))
        return [[(1-t)**3*a[k]+3*(1-t)**2*t*b[k]+3*(1-t)*t*t*c[k]+t**3*d[k] for k in (0,1)] for t in [i/steps for i in range(1,steps+1)]]
    for cmd in path:
        if cmd[0]=='m':
            if len(current)>1: paths.append(current)
            current=[list(cmd[1])]; previous=list(cmd[1])
        elif cmd[0]=='l': current.append(list(cmd[1])); previous=list(cmd[1])
        elif cmd[0]=='c':
            if previous is None: raise ValueError('Cubic without initial point')
            current.extend(cubic(previous,*cmd[1:])); previous=list(cmd[-1])
        elif cmd[0] in ('v','y'):
            if previous is None: raise ValueError('Cubic without initial point')
            controls=[previous,cmd[1],cmd[2]] if cmd[0]=='v' else [cmd[1],cmd[2],cmd[2]]
            current.extend(cubic(previous,*controls)); previous=list(cmd[-1])
        elif cmd[0]=='h' and current:
            current.append(current[0][:]); previous=current[-1]
        else: raise ValueError(f'Unsupported vector command: {cmd[0]}')
    if len(current)>1: paths.append(current)
    return paths

def bearing(start,end):
    lon1,lat1,lon2,lat2=map(math.radians,[*start,*end])
    return math.degrees(math.atan2(math.sin(lon2-lon1)*math.cos(lat2),math.cos(lat1)*math.sin(lat2)-math.sin(lat1)*math.cos(lat2)*math.cos(lon2-lon1)))%360

def make_vertex(ident,xy,cal,origin,**extra):
    coord=calibration_xy(cal,xy)
    return {'id':ident,'coordinates':coord,'sourceCoordinates':coord[:],'pdfXY':list(xy),'origin':origin,**extra}

def stitch_occlusions(feature,cal,max_gap=35,max_deviation=12):
    """Restore collinear, facing ends inside one reviewed track; retain original vertices."""
    candidates=[];segments=feature['segments'];limit=math.cos(math.radians(max_deviation))
    endpoints=[]
    for segment in segments:
        vs=segment['vertices']
        if len(vs)<2:continue
        for side,near in [(0,1),(-1,-2)]:
            p,q=vs[side]['pdfXY'],vs[near]['pdfXY'];length=math.dist(p,q)
            if length>1e-9:endpoints.append((segment,vs[side],[(p[i]-q[i])/length for i in (0,1)]))
    for i,(sa,a,ta) in enumerate(endpoints):
        for sb,b,tb in endpoints[i+1:]:
            if sa is sb:continue
            gap=math.dist(a['pdfXY'],b['pdfXY'])
            if not .2<gap<=max_gap:continue
            direction=[(b['pdfXY'][k]-a['pdfXY'][k])/gap for k in (0,1)]
            if sum(ta[k]*direction[k]for k in (0,1))<limit or sum(-tb[k]*direction[k]for k in (0,1))<limit:continue
            candidates.append((gap,sa,a,sb,b))
    used=set();bridges=[]
    for gap,sa,a,sb,b in sorted(candidates,key=lambda row:row[0]):
        if a['id'] in used or b['id'] in used:continue
        used.update([a['id'],b['id']])
        key='join:'+':'.join(sorted([sa['id'],sb['id']]))
        # Reuse endpoint IDs so moving a point cannot reopen the annotation gap.
        bridges.append({'id':key,'vertices':[a,b],'origin':'cartographic_continuation',
            'reason':'Continuité du même tracé sous annotation ou symbole, après sélection et relecture.',
            'sourceSegmentRefs':[sa['id'],sb['id']],'gapPdfPt':gap,'method':'facing_collinear_endpoints'})
    feature['segments'].extend(bridges)

def make_direction_arrows(feature,spec,page,cal,code,kind,page_no):
    vs={v['id']:v for s in feature['segments'] for v in s['vertices']};markers=[]
    for item in spec.get('directionArrows',[]):
        item=copy.deepcopy(item)
        if item.get('sourceVector'):
            obj=page.curves[int(item['sourceVector'][1:])];path=obj['path']
            tip=path[0][1];start=path[2][1]
        else:tip=item['pdfTip'];start=item['pdfFrom']
        anchor=min(vs.values(),key=lambda v:math.dist(v['pdfXY'],tip))
        from_vertex=min(vs.values(),key=lambda v:math.dist(v['pdfXY'],start))
        ll=calibration_xy(cal,tip);from_ll=calibration_xy(cal,start)
        markers.append({**item,'id':f'{code}:{kind}:p{page_no}:arrow:{feature["key"]}:{item["key"]}',
            'role':item.get('role','inclusion'),'sourceTipPdfXY':tip,'sourceFromPdfXY':start,
            'coordinates':ll,'sourceCoordinates':ll[:],'fromCoordinates':from_ll,'bearingDeg':bearing(from_ll,ll),
            'anchorVertexRef':anchor['id'],'fromVertexRef':from_vertex['id'],
            'anchorOffsetLonLat':[ll[k]-anchor['sourceCoordinates'][k]for k in (0,1)],
            'fromOffsetLonLat':[from_ll[k]-from_vertex['sourceCoordinates'][k]for k in (0,1)],
            'extractionMethod':'reviewed_direction_marker'})
    feature['directionArrows']=markers

COORD = re.compile(r'(\d{2})[°\s]+(\d{2})[\s\'’′?]+(\d{2}(?:[.,]\d+)?)[\s\'’′\"”″?]*N\s*[-–]?\s*(\d{3})[°\s]+(\d{2})[\s\'’′?]+(\d{2}(?:[.,]\d+)?)[\s\'’′\"”″?]*([EW])')
def extract_points(pages, icao, kind):
    points={}
    for n,text in enumerate(pages,1):
        if not re.search(r'points?\s+de\s+(?:compte|report)|reporting\s+points?|specific\s+points',text,re.I): continue
        for m in COORD.finditer(text):
            values=[float(s.replace(',','.')) for s in m.groups()[:6]]
            a,b,c,d,e,f=values
            if b>=60 or c>=60 or e>=60 or f>=60: continue
            lon=(d+e/60+f/3600)*(-1 if m[7]=='W' else 1); lat=a+b/60+c/3600
            before=text[text.rfind('\n',0,m.start())+1:m.start()].strip()
            end=text.find('\n',m.end()); after=text[m.end():end if end>=0 else len(text)].strip()
            prefix=re.match(r'^([A-Z][A-Z0-9]{0,3})(?:\s|$)',before)
            suffix=re.search(r'([A-Z]+\d?)$',after)
            code=prefix[1] if prefix else suffix[1] if suffix else None
            # BMC radial values can be adjacent to the actual code, e.g. NMNW.
            if code and code.startswith('NM') and len(code)>2: code=code[2:]
            if not code or code in ('BMC','NM'): continue
            points[code]={'id':f'{icao}:{kind}:{code}','code':code,'coordinates':[lon,lat],
                'role':'reporting_point','origin':'published','status':'transcribed_from_local_source',
                'pdfPage':n,'sourceText':text[text.rfind('\n',0,m.start())+1:end if end>=0 else len(text)],'chartKind':kind}
    return list(points.values())

def inventory(root):
    ads={}
    for kind,prefix in [('VAC','AD-2'),('VACH','AD-3')]:
        for p in sorted((Path(root)/kind).glob('*.pdf')):
            m=re.fullmatch(r'(?:FR-)?'+re.escape(prefix)+r'\.('+AD_CODE_PATTERN+r')(?:-fr-FR)?',p.stem,re.I)
            if not m: continue
            code=m[1].upper(); ad=ads.setdefault(code,{'icao':code,'status':'inventoried','sources':{}})
            source={'file':str(p.resolve()),'name':p.name,'sha256':sha(p),'sizeBytes':p.stat().st_size}
            existing=ad['sources'].get(kind)
            if existing:
                # FR-AD files may be the textual heliport chapter accompanying a
                # separate approach chart. Keep both, with the chart as primary.
                if p.stem.upper().startswith(prefix+'.'):
                    source['supplements']=[{k:v for k,v in existing.items()if k!='supplements'},*existing.get('supplements',[])]
                else:
                    existing.setdefault('supplements',[]).append(source);continue
            ad['sources'][kind]=source
    return ads

def extract_one(entry, seeds, legacy_dir, assets=None):
    import pdfplumber
    from pypdf import PdfReader
    code=entry['icao']; out={'schema':2,'ad':code,'status':'candidate','label':'Extrait des cartes locales, à vérifier',
        'analysis':{'status':'interprété','scope':'partial','notes':[]},'source':None,'generatedAt':stamp(),
        'points':[],'routes':[],'notes':[],'vac':{'schemaVersion':'1.0','parserVersion':VERSION,'sources':entry['sources'],
        'charts':{},'terrainElevationFt':None,'fatoElevationFt':None,'circuits':[], 'corrections':{'applied':0,'stale':[]}}}
    legacy=Path(legacy_dir)/f'{code}.json'
    if legacy.exists():
        old=read(legacy)
        if old.get('source',{}).get('sha256')==entry['sources'].get('VAC',{}).get('sha256'):
            out.update({k:copy.deepcopy(old[k]) for k in ['points','routes','notes','analysis'] if k in old})
            for p in out['points']:
                p.setdefault('coordinates',[p.get('lon'),p.get('lat')])
                p.setdefault('id',f'{code}:VAC:{p["code"]}');p.setdefault('chartKind','VAC')
                p.setdefault('pdfPage',p.get('page'))
            # An old interpretation remains labelled stale; current vector review is independent.
            if out['analysis'].get('status')=='obsolète': out['analysis']['notes'].append('Ancienne analyse obsolète conservée ; séquences relues séparément dans vac-reviews.json.')
    for kind,source in entry['sources'].items():
        seed=seeds['aerodromes'].get(code,{}).get(kind)
        if not seed: continue
        if source['sha256']!=seed['sourceSha256']:
            out['vac']['charts'][kind]={'status':'stale_review','reason':'Empreinte différente : relecture nécessaire','source':source}
            continue
        pdf=PdfReader(source['file']); pages=[normalise(p.extract_text() or '') for p in pdf.pages]
        found=extract_points(pages,code,kind)
        # VAC points retain the IDs of the existing schema, VACH IDs stay distinct.
        bycode={p['code']:p for p in out['points'] if p.get('chartKind','VAC')==kind}
        for p in found:
            if p['code'] not in bycode: out['points'].append(p)
        for p in seed.get('publishedPoints',[]):
            out['points']=[q for q in out['points'] if not(q['code']==p['code'] and q.get('chartKind','VAC')==kind)]
            out['points'].append({**p,'id':f'{code}:{kind}:{p["code"]}','chartKind':kind,'origin':'published','status':'transcribed_from_local_source'})
        if not out['source'] or kind=='VAC': out['source']={**source,'cycle':None}
        alt=re.search(r'ALT\s+AD\s*:\s*(\d+)',pages[0])
        if alt: out['vac']['terrainElevationFt']=int(alt[1])
        fato=re.search(r'ALT\s+FATO\s*:\s*(\d+)',pages[0])
        if fato: out['vac']['fatoElevationFt']=int(fato[1])
        chart={'status':'reviewed_selection','source':source,'aircraft':'fixed' if kind=='VAC' else 'rotary',
            'displayColor':'#181818' if kind=='VAC' else '#009c48','pages':[],'notes':seed.get('notes',[])}
        out['vac']['charts'][kind]=chart
        for n,text in enumerate(pages,1):
            out['notes'].append({'chartKind':kind,'page':n,'title':f'{kind} · page {n}','text':text})
        with pdfplumber.open(source['file']) as doc:
            for page_no,cal in seed['calibrations'].items():
                p=doc.pages[int(page_no)-1]
                page={'pdfPage':int(page_no),'widthPt':p.width,'heightPt':p.height,'calibration':cal,
                      'image':f'{kind}-{code}-{page_no}.png','features':[]}
                chart['pages'].append(page)
                if assets:
                    import pypdfium2 as pdfium
                    target=Path(assets)/page['image']; target.parent.mkdir(parents=True,exist_ok=True)
                    rendering=pdfium.PdfDocument(source['file']); rendering[int(page_no)-1].render(scale=1.6).to_pil().save(target); rendering.close()
                for spec in [s for s in seed['features'] if s['pdfPage']==int(page_no)]:
                    feature={k:copy.deepcopy(v) for k,v in spec.items() if k not in ('vectorRefs','reviewedPaths','directionArrows')}
                    feature.update({'chartKind':kind,'id':f'{code}:{kind}:{spec["key"]}', 'sourceSha256':source['sha256'],
                                    'extractionMethod':'reviewed_pdf_vector_selection','accuracyM':None,'geometryPartial':True,'segments':[]})
                    for ref in spec['vectorRefs']:
                        obj=p.curves[int(ref[1:])] if ref[0]=='C' else p.lines[int(ref[1:])]
                        subpaths=sample_path(obj.get('path') or [('m',obj['pts'][0]),('l',obj['pts'][1])])
                        for si,path in enumerate(subpaths):
                            if ref in spec.get('reverseVectorRefs',[]):path=list(reversed(path))
                            vertices=[]
                            for vi,xy in enumerate(path):
                                coord=calibration_xy(cal,xy)
                                vertices.append({'id':f'{code}:{kind}:p{page_no}:{ref}:s{si}:v{vi}',
                                    'coordinates':coord,'sourceCoordinates':coord[:],'pdfXY':xy,
                                    'sourceVector':ref,'origin':'pdf_vector'})
                            feature['segments'].append({'id':ref+':'+str(si),'vertices':vertices,
                                'pdfStyle':{'stroke':obj.get('stroking_color'),'width':obj.get('linewidth'),'dash':obj.get('dash')}})
                    for path in spec.get('reviewedPaths',[]):
                        known=[v for segment in feature['segments']for v in segment['vertices']]
                        new_vertices=[]
                        for vi,xy in enumerate(path['pdfXY']):
                            match=next((v for v in known if math.dist(v['pdfXY'],xy)<1e-6),None)
                            new_vertices.append(match or make_vertex(f'{code}:{kind}:p{page_no}:{path["key"]}:v{vi}',xy,cal,'cartographic_continuation'))
                        feature['segments'].append({'id':path['key'],'origin':'cartographic_continuation','reason':path['reason'],
                            'vertices':new_vertices})
                    if spec.get('joinOccludedSegments'):stitch_occlusions(feature,cal)
                    make_direction_arrows(feature,spec,p,cal,code,kind,page_no)
                    page['features'].append(feature)
        out['vac']['circuits'].extend([{**c,'chartKind':kind,'sourceSha256':source['sha256']} for c in seed.get('circuits',[])])
        out['vac'].setdefault('procedureSequences',[]).extend(copy.deepcopy(seed.get('procedureSequences',[])))
    sync_routes(out)
    return out

def all_features(ad):
    for chart in ad['vac']['charts'].values():
        for page in chart.get('pages',[]):
            for feature in page['features']: yield page,feature

def correction_items(ad):
    items={v['id']:(page,f,v) for page,f in all_features(ad) for s in f['segments'] for v in s['vertices']}
    for p in ad['points']:
        kind=p.get('chartKind','VAC');chart=ad['vac']['charts'].get(kind,{})
        if chart.get('source') and p.get('id'):
            page=chart['pages'][0]if chart.get('pages')else{'pdfPage':p.get('pdfPage'),'calibration':None}
            items[p['id']]=(page,{'chartKind':kind,'sourceSha256':chart['source']['sha256']},p)
    return items

def sync_routes(ad):
    # Keep existing vfr routes/constraints; emit new trace geometries with explicit subpath breaks.
    ad['routes']=[r for r in ad['routes'] if r.get('origin')!='vac_vector_extraction']
    for page,f in all_features(ad):
        vertices={v['id']:v for s in f['segments'] for v in s['vertices']}
        for marker in f.get('directionArrows',[]):
            anchor=vertices[marker['anchorVertexRef']]['coordinates'];start=vertices[marker['fromVertexRef']]['coordinates']
            marker['coordinates']=[anchor[k]+marker['anchorOffsetLonLat'][k]for k in (0,1)]
            marker['fromCoordinates']=[start[k]+marker['fromOffsetLonLat'][k]for k in (0,1)]
            marker['bearingDeg']=bearing(marker['fromCoordinates'],marker['coordinates'])
        for seg in f['segments']:
          if len(seg['vertices'])<2: continue
          coords=[v['coordinates'] for v in seg['vertices']]
          ad['routes'].append({'id':f['id']+':'+seg['id'],'key':f['key']+':'+seg['id'],'kind':f['kind'],'aircraft':'fixed' if f['chartKind']=='VAC' else 'rotary',
            'chartKind':f['chartKind'],'featureRef':f['id'],'codes':[r.rsplit(':',1)[-1] for r in f.get('pointRefs',[])],
            'pointRefs':f.get('pointRefs',[]),'geometryPointRefs':[v['id'] for v in seg['vertices']],
            'direction':f.get('direction','unknown'),'runways':f.get('runways'),'conditions':f.get('conditions'),
            'origin':'vac_vector_extraction','status':'candidate','sourcePages':[f['pdfPage']],'pages':[f['pdfPage']],
            'directionMarkers':[copy.deepcopy(m)for m in f.get('directionArrows',[])if m['anchorVertexRef']in[v['id']for v in seg['vertices']]],
            'mandatory':f.get('mandatory'),'phase':f.get('phase'),'joinsFeatureRef':f.get('joinsFeatureRef'),
            'geometry':{'type':'LineString','coordinates':coords,'origin':'pdf_vector','isOfficialGeometry':False,'accuracyM':None},
            'geometryPartial':True,'partial':True,'reviewRequired':['georeferencing','completeness'], 'sourceSha256':f['sourceSha256']})
    for p in ad['points']:
        if p.get('coordinates'):p['lon'],p['lat']=p['coordinates'];p.setdefault('page',p.get('pdfPage'))

def apply_corrections(ad, patch):
    ad=copy.deepcopy(ad); accepted=[]; stale=[]
    if patch.get('icao')!=ad['ad']: raise ValueError('Correction AD mismatch')
    vertices=correction_items(ad)
    shared={}
    for page,feature in all_features(ad):
        for segment in feature['segments']:
            for vertex in segment['vertices']:shared.setdefault(vertex['id'],[]).append(vertex)
    for change in patch.get('points',[]):
        item=vertices.get(change.get('id'))
        if not item or change.get('sourceSha256')!=item[1]['sourceSha256']:
            stale.append(change.get('id')); continue
        page,f,v=item; target=change.get('coordinates')
        if not isinstance(target,list) or len(target)!=2 or any(isinstance(x,bool) or not isinstance(x,(int,float)) or not math.isfinite(x) for x in target) or not(-180<=target[0]<=180 and -90<=target[1]<=90): raise ValueError('Invalid WGS84 point')
        for vertex in shared.get(change['id'],[v]):vertex['coordinates']=target[:];vertex['origin']='manual_correction'
        accepted.append(change['id'])
    for field in patch.get('fields',[]):
        kind=field.get('chartKind'); current=ad['vac']['sources'].get(kind,{})
        if current.get('sha256')!=field.get('sourceSha256'): stale.append(field.get('id')); continue
        row=next((c for c in ad['vac']['circuits'] if c['id']==field.get('id') and c['chartKind']==kind),None)
        if row is None: stale.append(field.get('id')); continue
        updates=field.get('values',{})
        if set(updates)-{'altitudeFt','heightFt','hand'}: raise ValueError('Unknown correction field')
        if 'hand' in updates and updates['hand'] not in ('MG','MD',None): raise ValueError('Invalid hand')
        for k in ('altitudeFt','heightFt'):
            if k in updates and updates[k] is not None and (isinstance(updates[k],bool) or not isinstance(updates[k],(int,float)) or not math.isfinite(updates[k]) or not 0<=updates[k]<=30000): raise ValueError('Invalid altitude')
        row.update(updates); accepted.append(field['id'])
    ad['vac']['corrections']={'applied':len(accepted),'stale':stale,'updatedAt':patch.get('updatedAt')}
    ad['vac']['correctionPatch']=copy.deepcopy(patch)
    sync_routes(ad); return ad

def build(source, output, legacy, codes, seeds_file=None, all_mode=False, force=False):
    output=Path(output); output.mkdir(parents=True,exist_ok=True)
    review_file=Path(seeds_file or HERE/'vac-reviews.json');seeds=read(review_file);entries=inventory(source);failures=[]
    review_digest=sha(review_file);test_order=['LFAJ','LFRN','LFRS','LFBD'];previous={}
    if (output/'index.json').exists():previous={a['icao']:a for a in read(output/'index.json').get('aerodromes',[])}
    def fingerprints(entry):return {k:[v['sha256'],*[s['sha256']for s in v.get('supplements',[])]]for k,v in entry['sources'].items()}
    for code,entry in entries.items():
        old=previous.get(code)
        if old and fingerprints(old)==fingerprints(entry):
            entry.update({k:v for k,v in old.items()if k not in('icao','sources')})
    order=[c for c in test_order if c in entries]+sorted(set(entries)-set(test_order))if all_mode else list(dict.fromkeys(codes))
    generated=stamp()
    def index_result(complete):
        statuses={s:sum(a.get('status')==s for a in entries.values())for s in ['extracted','automatic','needs_georeferencing','text_only','inventoried','stale_review','error']}
        return {'schemaVersion':'1.1','generatedAt':generated,'parserVersion':VERSION,'complete':complete,
            'sourceRoot':str(Path(source).resolve()),'sourceAirac':None,'coordinateReferenceSystem':'EPSG:4326','coordinateOrder':'longitude,latitude',
            'testOrder':test_order,'processingScope':'all'if all_mode else'selected','summary':statuses,
            'aerodromes':sorted(entries.values(),key=lambda a:(test_order.index(a['icao'])if a['icao']in test_order else len(test_order),a['icao'])),'errors':failures}
    write(output/'index.json',index_result(False))
    def save_snapshot(path,value,code,label):
        if path.exists()and read(path)!=value:write(output/'history'/code/('refresh-'+label+'-'+stamp().replace(':','-')+'.json'),read(path))
        write(path,value)
    for code in order:
        if code not in entries: failures.append({'icao':code,'error':'Source absente'}); continue
        try:
            base_path=output/'base'/f'{code}.json';ad=read(base_path)if base_path.exists()else None
            reviewed=code in seeds['aerodromes'];mode='reviewed_selection'if reviewed else'automatic_candidates'
            cache_ok=ad is not None and ad.get('vac',{}).get('parserVersion')==VERSION and fingerprints({'sources':ad['vac']['sources']})==fingerprints(entries[code]) and ad['vac'].get('extractionMode')==mode
            if reviewed:cache_ok=cache_ok and ad['vac'].get('reviewSha256')==review_digest
            if not cache_ok or force:
                if reviewed:ad=extract_one(entries[code],seeds,legacy,output/'previews')
                else:
                    from vac_auto import extract_automatic
                    ad=extract_automatic(entries[code])
                ad['vac'].update({'parserVersion':VERSION,'extractionMode':mode,'reviewSha256':review_digest if reviewed else None})
                save_snapshot(base_path,ad,code,'base')
            corrections=output/'corrections'/f'{code}.json'
            if corrections.exists(): ad=apply_corrections(ad,read(corrections))
            save_snapshot(output/f'{code}.json',ad,code,'target')
            stale=any(c.get('status')=='stale_review' for c in ad['vac']['charts'].values())
            feature_count=sum(1 for _ in all_features(ad));unresolved=ad['vac'].get('quality',{}).get('unresolvedMapPages',[])
            status='stale_review'if stale else'extracted'if reviewed else'automatic'if feature_count else'needs_georeferencing'if unresolved else'text_only'
            entries[code].update({'status':status,'name':seeds['aerodromes'].get(code,{}).get('name',code),'file':f'{code}.json',
                'features':sum(1 for _ in all_features(ad)),'circuits':len(ad['vac']['circuits']),
                'reviewRequired':True,'issues':ad['vac']['corrections']['stale'],'extractionMode':mode,'parserVersion':VERSION,
                'unresolvedMapPages':len(unresolved),'terrainElevationFt':ad['vac']['terrainElevationFt']})
            print(code,status,entries[code]['features'],'tracés,',entries[code]['circuits'],'circuits',('(cache)'if cache_ok and not force else''),flush=True)
        except Exception as exc:
            failures.append({'icao':code,'error':str(exc)}); entries[code]['status']='error'
            print(code,'ERROR',type(exc).__name__,str(exc),flush=True)
        if (order.index(code)+1)%10==0:write(output/'index.json',index_result(False))
    result=index_result(True)
    represented=[s['file']for e in entries.values()for source in e['sources'].values()for s in [source,*source.get('supplements',[])]]
    source_files=[str(p.resolve())for kind in ['VAC','VACH']for p in (Path(source)/kind).glob('*.pdf')]
    coverage={'pdfFiles':len(source_files),'representedFiles':len(represented),'aerodromes':len(entries),
        'excludedFiles':sorted(set(source_files)-set(represented)),
        'supplements':[{'icao':e['icao'],'chartKind':kind,'primary':v['file'],'files':v['supplements']}for e in entries.values()for kind,v in e['sources'].items()if v.get('supplements')]}
    write(output/'source-coverage.json',coverage)
    write(output/'index.json',result)
    write(output/'batch-report.json',{'parserVersion':VERSION,'generatedAt':generated,'complete':True,'scope':result['processingScope'],
        'summary':result['summary'],'errors':failures,'limitations':['Les candidats automatiques ne sont pas des tracés relus.','Les pistes, mains, restrictions et sens non établis restent inconnus.']})
    print('Inventaire:',len(entries),'AD; erreurs:',len(failures))
    return result

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--source',default=DEFAULT_SOURCE);p.add_argument('--output',default=DEFAULT_OUTPUT)
    p.add_argument('--legacy',default=DEFAULT_LEGACY);p.add_argument('--icao',nargs='+',default=['LFAJ','LFRN','LFRS','LFBD']);p.add_argument('--reviews')
    p.add_argument('--all',action='store_true',help='Analyser tous les AD du corpus ; candidats automatiques hors sélections relues.')
    p.add_argument('--force',action='store_true',help='Réextraire même si les empreintes et versions sont inchangées.')
    a=p.parse_args(); result=build(a.source,a.output,a.legacy,a.icao,a.reviews,a.all,a.force)
    raise SystemExit(bool(result['errors']))
