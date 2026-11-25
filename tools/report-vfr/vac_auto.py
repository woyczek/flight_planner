"""Conservative automatic candidates for local SIA PDFs; no per-AD vector IDs."""
from __future__ import annotations
import copy,itertools,math,re
from pathlib import Path
from vac_parser import normalise,read,write,sha,stamp,make_vertex,sample_path,stitch_occlusions,sync_routes

def rgb(color):
    if color is None:return None
    if isinstance(color,(int,float)):return (color,)*3
    # Named PDF colour spaces can contain names or nested tint operands. Their
    # channels are not RGB values; leave those inks unresolved instead of guessing.
    if not isinstance(color,(tuple,list))or len(color)not in(1,3,4)or not all(isinstance(v,(int,float))and math.isfinite(v)for v in color):return None
    if len(color)==1:return (color[0],)*3
    if len(color)==4:
        c,m,y,k=color;return((1-c)*(1-k),(1-m)*(1-k),(1-y)*(1-k))
    return tuple(color[:3]) if len(color)>=3 else None

def ink_kind(color):
    c=rgb(color)
    if c is None:return None
    r,g,b=c
    if max(c)<.08:return 'black'
    if r<.2 and g>.5 and b<.35:return 'green'
    if .15<r<.8 and g<.25 and b>.5:return 'purple'
    return None

def blue(color):
    c=rgb(color)
    return c is not None and c[0]<.3 and .2<c[1]<.8 and c[2]>.6

def text_records(pdf_page,height):
    records=[]
    def visitor(text,cm,tm,font,size):
        value=normalise(text).strip().replace('\x92',"'")
        if not value:return
        x=tm[4]*cm[0]+tm[5]*cm[2]+cm[4]
        y=height-(tm[4]*cm[1]+tm[5]*cm[3]+cm[5])
        upright=abs(tm[1]*cm[0]+tm[3]*cm[1])<.1 and abs(tm[0]*cm[2]+tm[2]*cm[3])<.1
        records.append({'text':value,'x':x,'y':y,'upright':upright,'size':abs(tm[0]*size)or size})
    text=normalise(pdf_page.extract_text(visitor_text=visitor)or'')
    unique={}
    for r in records:unique.setdefault((r['text'],round(r['x'],1),round(r['y'],1)),r)
    return text,list(unique.values())

def glyph_maps(resources,result=None,seen=None):
    result={}if result is None else result;seen=set()if seen is None else seen
    resources=resources.get_object()
    if id(resources)in seen:return result
    seen.add(id(resources))
    for font in resources.get('/Font',{}).values():
        font=font.get_object();name=str(font.get('/BaseFont','')).lstrip('/');encoding=font.get('/Encoding');mapping={}
        if encoding and isinstance(encoding.get_object(),dict):
            index=0
            for glyph in encoding.get_object().get('/Differences',[]):
                if isinstance(glyph,int):index=glyph;continue
                m=re.fullmatch(r'/MT(\d+)',str(glyph))
                if m and int(m[1])<=0x10ffff:mapping[index]=chr(int(m[1]))
                index+=1
        if mapping:result[name]=mapping
    for obj in resources.get('/XObject',{}).values():
        obj=obj.get_object()
        if obj.get('/Resources'):glyph_maps(obj['/Resources'],result,seen)
    return result

def coordinate_records(page,pdf_page):
    """Recover only graphic coordinate labels from legacy /MT glyph encodings."""
    original_words=page.dedupe_chars(tolerance=.25).extract_words(extra_attrs=['non_stroking_color'],x_tolerance=2,y_tolerance=2)
    maps=glyph_maps(pdf_page['/Resources'])
    for char in page.chars:
        text=char['text'];match=re.fullmatch(r'\(cid:(\d+)\)',text)
        value=int(match[1])if match else ord(text)if len(text)==1 else None
        if value in maps.get(char['fontname'],{}):char['text']=maps[char['fontname']][value]
    words=original_words+page.dedupe_chars(tolerance=.25).extract_words(extra_attrs=['non_stroking_color'],x_tolerance=2,y_tolerance=2)
    for w in words:w['text']=w['text'].replace('\x92',"'")
    words=[w for w in words if blue(w['non_stroking_color'])and w['bottom']-w['top']<13]
    records=[{'text':w['text'],'x':w['x0'],'y':w['bottom'],'upright':True,'size':w['bottom']-w['top']}for w in words]
    for w in words:
        if not re.fullmatch(r'\d{3}[°º]',w['text']):continue
        next_words=[q for q in words if MIN.fullmatch(q['text'])and abs(q['top']-w['top'])<1 and -.2<q['x0']-w['x1']<7]
        if next_words:
            q=min(next_words,key=lambda q:q['x0'])
            records.append({'text':w['text']+' '+q['text'],'x':w['x0'],'y':w['bottom'],'upright':True,'size':w['bottom']-w['top']})
    return records

def arp_position(text):
    lat=re.search(r'LAT\s*:?\s*(\d{2})\s+(\d{2})\s+(\d{2}(?:[.,]\d+)?)\s*([NS])',text,re.I)
    lon=re.search(r'LONG\s*:?\s*(\d{3})\s+(\d{2})\s+(\d{2}(?:[.,]\d+)?)\s*([EW])',text,re.I)
    if not(lat and lon):return None
    def value(m):return(sum(float(m[i].replace(',','.'))/d for i,d in [(1,1),(2,60),(3,3600)]))*(-1 if m[4].upper()in['S','W']else 1)
    return[value(lon),value(lat)]

def ticks(page):
    vertical=[];horizontal=[]
    for obj in [*page.lines,*page.curves]:
        if not obj.get('stroke')or not blue(obj.get('stroking_color')):continue
        if obj['width']<.4 and 8<=obj['height']<=14:vertical.append({'axis':obj['x0'],'lo':obj['top'],'hi':obj['bottom']})
        if obj['height']<.4 and 8<=obj['width']<=14:horizontal.append({'axis':obj['top'],'lo':obj['x0'],'hi':obj['x1']})
    def unique(rows):return list({(round(r['axis'],1),round(r['lo'],1)):r for r in rows}.values())
    return unique(vertical),unique(horizontal)

DEG=re.compile(r'^(\d{2,3})\s*[°º]\s*$')
MIN=re.compile(r"^(\d{2}(?:[.,]\d+)?)\s*['’′´?]\s*$")
FULL=re.compile(r"^(\d{2,3})\s*[°º]\s*(\d{2}(?:[.,]\d+)?)\s*['’′´?]\s*$")

def graticule_controls(records,vertical,horizontal,arp):
    lon=[];lat=[]
    for r in records:
        if not r['upright']:continue
        text=re.sub(r'\s+',' ',r['text']);m=FULL.fullmatch(text)
        if m:
            degree=int(m[1]);minute=float(m[2].replace(',','.'))
            if minute>=60:continue
            if len(m[1])==3:
                candidates=[t for t in vertical if 5<t['axis']-r['x']<26 and t['lo']-14<r['y']<t['hi']+6]
                if candidates:
                    t=min(candidates,key=lambda t:abs(t['axis']-r['x']-13.5))
                    absolute=degree+minute/60
                    signs=[-1,1]if absolute and abs(arp[0])<.2 else [-1 if arp[0]<0 else 1]
                    lon.append({'pixel':t['axis'],'values':[absolute*s for s in signs],'sourceText':text})
            else:
                candidates=[t for t in horizontal if t['lo']-3<r['x']<t['hi']+3 and abs(t['axis']-r['y'])<12]
                if candidates:
                    t=min(candidates,key=lambda t:abs(t['axis']-r['y']))
                    lat.append({'pixel':t['axis'],'values':[(degree+minute/60)*(-1 if arp[1]<0 else 1)],'sourceText':text})
        m=DEG.fullmatch(text)
        if not m or len(m[1])!=2:continue
        minute_rows=[]
        for q in records:
            minute=MIN.fullmatch(q['text'].strip())
            if q['upright']and minute and abs(q['x']-r['x'])<3 and 3<q['y']-r['y']<17:minute_rows.append((q,minute))
        if not minute_rows:continue
        q,minute=min(minute_rows,key=lambda row:row[0]['y']-r['y'])
        number=float(minute[1].replace(',','.'))
        if number>=60:continue
        candidates=[t for t in horizontal if t['lo']-3<r['x']<t['hi']+3 and r['y']-10<t['axis']<q['y']+3]
        if candidates:
            t=min(candidates,key=lambda t:abs(t['axis']-r['y']-1.5))
            lat.append({'pixel':t['axis'],'values':[(int(m[1])+number/60)*(-1 if arp[1]<0 else 1)],'sourceText':text+' '+q['text']})
    def dedupe(rows):return list({(round(r['pixel'],1),tuple(r['values'])):r for r in rows}.values())
    return dedupe(lon),dedupe(lat)

def fit_axis(controls,increasing):
    if len(controls)<2:return None
    choices=[r['values']for r in controls]
    if math.prod(map(len,choices))>256:return None
    best=None
    for values in itertools.product(*choices):
        xs=[r['pixel']for r in controls];xbar=sum(xs)/len(xs);ybar=sum(values)/len(values)
        den=sum((x-xbar)**2 for x in xs)
        if den<100:continue
        slope=sum((x-xbar)*(y-ybar)for x,y in zip(xs,values))/den
        if (slope>0)!=increasing or abs(slope)<1e-9:continue
        intercept=ybar-slope*xbar;residual=max(abs((v-intercept)/slope-x)for x,v in zip(xs,values))
        if residual>2:continue
        if best is None or residual<best['residualPdfPt']:
            left=min(range(len(xs)),key=xs.__getitem__);right=max(range(len(xs)),key=xs.__getitem__)
            best={'axis':[xs[left],intercept+slope*xs[left],xs[right],intercept+slope*xs[right]],'residualPdfPt':residual,'controls':controls}
    return best

def automatic_calibration(page,records,arp):
    if arp is None:return None
    vertical,horizontal=ticks(page)
    lon,lat=graticule_controls(records,vertical,horizontal,arp)
    x=fit_axis(lon,True);y=fit_axis(lat,False)
    if not(x and y):return None
    sx=(x['axis'][3]-x['axis'][1])/(x['axis'][2]-x['axis'][0]);sy=(y['axis'][3]-y['axis'][1])/(y['axis'][2]-y['axis'][0])
    ratio=abs(sx*math.cos(math.radians(arp[1]))/sy)
    if not .5<ratio<2:return None
    bounds=[min(t['lo']for t in horizontal),min(t['lo']for t in vertical),max(t['hi']for t in horizontal),max(t['hi']for t in vertical)]
    if bounds[2]-bounds[0]<80 or bounds[3]-bounds[1]<80:return None
    return{'method':'automatic_graticule_fit','longitude':x['axis'],'latitude':y['axis'],'mapBoundsPdf':bounds,
        'coordinateUnits':'PDF points, origin top-left','accuracyM':None,'reviewRequired':True,
        'residualPdfPt':max(x['residualPdfPt'],y['residualPdfPt']),'controls':{'longitude':x['controls'],'latitude':y['controls']}}

def candidate_vectors(page,bounds=None):
    result=[]
    for prefix,objects in [('C',page.curves),('L',page.lines)]:
        for index,obj in enumerate(objects):
            ink=ink_kind(obj.get('stroking_color'))
            if not ink or not obj.get('stroke')or obj.get('fill')or not 1.3<=obj.get('linewidth',0)<=1.52:continue
            pts=obj['pts'];length=sum(math.dist(a,b)for a,b in zip(pts,pts[1:]))
            if length<6 or math.dist(pts[0],pts[-1])<.1:continue
            # The small zigzags printed at Nantes' outer points are point symbols, not tracks.
            commands=[part[0]for part in obj.get('path',[])]
            if len(pts)>=8 and max(obj['width'],obj['height'])<45 and set(commands)<={'m','l'}:
                turns=[]
                for a,b,c in zip(pts,pts[1:],pts[2:]):
                    cross=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0])
                    if abs(cross)>.01:turns.append(1 if cross>0 else-1)
                if sum(a!=b for a,b in zip(turns,turns[1:]))>=4:continue
            if bounds and not(bounds[0]-.7<=obj['x0']and obj['x1']<=bounds[2]+.7 and bounds[1]-.7<=obj['top']and obj['bottom']<=bounds[3]+.7):continue
            if not bounds and not(page.height*.08<obj['top']<page.height*.88):continue
            result.append((prefix+str(index),ink,obj))
    return result

def cluster_vectors(rows):
    """Group only same-ink endpoints; do not infer a junction at a crossing."""
    parent=list(range(len(rows)))
    def find(i):
        while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
        return i
    for i,(ref,ink,obj)in enumerate(rows):
        for j,(other,other_ink,other_obj)in enumerate(rows[:i]):
            if ink!=other_ink:continue
            ends=[obj['pts'][0],obj['pts'][-1]];other_ends=[other_obj['pts'][0],other_obj['pts'][-1]]
            connected=any(math.dist(a,b)<1.5 for a in ends for b in other_ends)
            if not connected:
                # Test masked straight continuations before grouping, with the same constraints as the reviewed parser.
                for ia,near_a in [(0,1),(-1,-2)]:
                    for ib,near_b in [(0,1),(-1,-2)]:
                        a,aa=obj['pts'][ia],obj['pts'][near_a];b,bb=other_obj['pts'][ib],other_obj['pts'][near_b]
                        gap=math.dist(a,b);la=math.dist(a,aa);lb=math.dist(b,bb)
                        if not(.2<gap<=35 and la>0 and lb>0):continue
                        da=sum((a[k]-aa[k])*(b[k]-a[k])for k in (0,1))/(la*gap)
                        db=sum((b[k]-bb[k])*(a[k]-b[k])for k in (0,1))/(lb*gap)
                        if da>math.cos(math.radians(12))and db>math.cos(math.radians(12)):connected=True
            if connected:parent[find(i)]=find(j)
    groups={}
    for i,row in enumerate(rows):groups.setdefault(find(i),[]).append(row)
    return list(groups.values())

def automatic_features(page,cal,code,kind,page_no):
    rows=candidate_vectors(page,cal['mapBoundsPdf']);features=[]
    if len(rows)>250:return features
    for group in cluster_vectors(rows):
        ink=group[0][1];key='auto-p'+str(page_no)+'-'+group[0][0]
        f={'key':key,'id':f'{code}:{kind}:{key}','label':('Départ violet candidat'if ink=='purple'else'Tracé candidat')+' · p.'+str(page_no)+' · '+group[0][0],
            'chartKind':kind,'kind':'automatic_track_candidate','pdfPage':page_no,'sourceSha256':None,'extractionMethod':'automatic_stroke_candidate',
            'status':'candidate','direction':'unknown','runways':None,'mandatory':None,'phase':'departure_candidate'if ink=='purple'else None,
            'accuracyM':None,'geometryPartial':True,'reviewRequired':['semantic_identity','runway_assignment','direction','restrictions','georeferencing'],
            'segments':[],'directionArrows':[],'displayColor':'#972e9d'if ink=='purple'else'#009c48'if kind=='VACH'or ink=='green'else'#181818'}
        for ref,ink,obj in group:
            try:paths=sample_path(obj.get('path')or[('m',obj['pts'][0]),('l',obj['pts'][1])])
            except ValueError:continue
            for index,path in enumerate(paths):
                f['segments'].append({'id':ref+':'+str(index),'vertices':[make_vertex(f'{code}:{kind}:p{page_no}:{ref}:s{index}:v{i}',xy,cal,'automatic_pdf_vector',sourceVector=ref)for i,xy in enumerate(path)],
                    'pdfStyle':{'stroke':obj.get('stroking_color'),'width':obj.get('linewidth'),'dash':obj.get('dash')}})
        if f['segments']:
            stitch_occlusions(f,cal)
            for s in f['segments']:
                if s.get('origin')=='cartographic_continuation':s['reason']='Continuité géométrique candidate sous annotation ; relecture requise.'
            features.append(f)
    return features

def automatic_seed(entry):
    """Return transient selections, based on graphics and graticules only. Never mark these as reviewed."""
    import pdfplumber
    from pypdf import PdfReader
    result={};audit={'sources':{},'candidateCount':0};reference_arp=None
    for kind,source in entry['sources'].items():
        reader=PdfReader(source['file']);pages=[];texts=[];arp=None
        with pdfplumber.open(source['file'])as pdf:
            for n,(raw,p)in enumerate(zip(reader.pages,pdf.pages),1):
                text,records=text_records(raw,p.height);texts.append(text)
                if arp is None:arp=arp_position(text)or reference_arp
                if arp is not None:reference_arp=arp
                # Only map pages carry a usable calibrated graticule; tables and profiles are not map geometry.
                vertical,horizontal=ticks(p)
                if len(vertical)>=2 and len(horizontal)>=2:records.extend(coordinate_records(p,raw))
                cal=automatic_calibration(p,records,arp)if len(vertical)>=2 and len(horizontal)>=2 else None
                candidates=candidate_vectors(p,cal['mapBoundsPdf']if cal else None)
                pages.append({'pdfPage':n,'widthPt':p.width,'heightPt':p.height,'text':text,'calibration':cal,'vectors':[(r,ink)for r,ink,obj in candidates],
                    'features':automatic_features(p,cal,entry['icao'],kind,n)if cal else [],
                    'calibrationStatus':'candidate'if cal else'not_resolved'})
        audit['sources'][kind]={'pages':pages,'arp':arp,'terrainElevationFt':None,'fatoElevationFt':None}
        first='\n'.join(texts[:2]);alt=re.search(r'ALT\s+AD\s*:\s*(\d+)',first);fato=re.search(r'ALT\s+FATO\s*:\s*(\d+)',first)
        if alt:audit['sources'][kind]['terrainElevationFt']=int(alt[1])
        if fato:audit['sources'][kind]['fatoElevationFt']=int(fato[1])
        audit['candidateCount']+=sum(len(p['features'])for p in pages)
    return audit

def extract_automatic(entry):
    from vac_parser import extract_points
    audit=automatic_seed(entry);code=entry['icao'];a={'schema':2,'ad':code,'status':'candidate','label':'Extraction automatique, à relire',
        'analysis':{'status':'calculé','scope':'none','notes':['Sélections automatiques candidates ; pistes, sens et conditions non validés.']},
        'source':entry['sources'].get('VAC')or next(iter(entry['sources'].values())),'generatedAt':stamp(),'points':[],'routes':[],'notes':[],
        'vac':{'schemaVersion':'1.0','sources':entry['sources'],'charts':{},'circuits':[],'circuitCandidates':[],'terrainElevationFt':None,'fatoElevationFt':None,
            'extractionMode':'automatic_candidates','corrections':{'applied':0,'stale':[]},'quality':{'reviewRequired':True,'unresolvedMapPages':[]}}}
    for kind,chart in audit['sources'].items():
        source=entry['sources'][kind];pages=[]
        # Some heliports have an AIP data chapter alongside their graphic VAC.
        # Its page numbers belong to that supplemental file, never to the map.
        if source.get('supplements'):
            from pypdf import PdfReader
            for extra in source['supplements']:
                for number,raw in enumerate(PdfReader(extra['file']).pages,1):
                    a['notes'].append({'chartKind':kind,'page':number,'title':extra['name']+' · p.'+str(number),
                        'sourceSupplement':True,'sourceFile':extra['file'],'sourceSha256':extra['sha256'],'text':normalise(raw.extract_text()or'')})
        texts=[p['text']for p in chart['pages']];a['points'].extend(extract_points(texts,code,kind))
        if chart['terrainElevationFt']is not None:a['vac']['terrainElevationFt']=chart['terrainElevationFt']
        if chart['fatoElevationFt']is not None:a['vac']['fatoElevationFt']=chart['fatoElevationFt']
        if chart['arp']:a['vac'].setdefault('referencePoints',{})[kind]=chart['arp']
        for p in chart['pages']:
            a['notes'].append({'chartKind':kind,'page':p['pdfPage'],'title':kind+' · p.'+str(p['pdfPage']),'text':p['text']})
            for m in re.finditer(r'(?<!\d)(\d{3,5})\s*\(\s*(\d{2,5})\s*\)',p['text']):
                alt,hgt=map(int,m.groups())
                if 100<=alt<=20000 and 50<=hgt<=10000:a['vac']['circuitCandidates'].append({'chartKind':kind,'pdfPage':p['pdfPage'],'altitudeFt':alt,'heightFt':hgt,'runways':None,'hand':None,'sourceText':m[0],'status':'unassigned_candidate'})
            if p['calibration']:
                for f in p['features']:f['sourceSha256']=source['sha256']
                pages.append({'pdfPage':p['pdfPage'],'widthPt':p['widthPt'],'heightPt':p['heightPt'],'calibration':p['calibration'],
                    'image':f'{kind}-{code}-{p["pdfPage"]}.png','features':p['features']})
            elif p['vectors']:a['vac']['quality']['unresolvedMapPages'].append({'chartKind':kind,'pdfPage':p['pdfPage'],'rawVectorCount':len(p['vectors']),'reason':'Graticule non résolu ; géométrie non positionnée.'})
        a['vac']['charts'][kind]={'status':'automatic_candidate','source':source,'pages':pages,'notes':['Tracés détectés par couleur et épaisseur ; identité et restrictions à contrôler.'],'displayColor':'#181818'if kind=='VAC'else'#009c48'}
    sync_routes(a)
    return a
