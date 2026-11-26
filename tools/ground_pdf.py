"""Bounded native GeoPDF surface-chart candidates, with source hashes and no install.

The coordinator uses stdlib. Only _native imports optional pypdf/pypdfium2 inside
proc_pdf's existing timed child. Relative /RL viewports are never geographic maps.
"""
import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
import math
from pathlib import Path
import re

import ground_geo as G
from proc_pdf import limited
from proc_replay import contained, sha, write

VERSION = '1'
MAX_PAGES, MAX_CHARS, MAX_OBJECTS, MAX_POINTS = 3, 50000, 100000, 250000


def plain(value, depth=0):
    if depth > 10:
        raise ValueError('geospatial metadata depth limit')
    if hasattr(value, 'get_object'):
        value = value.get_object()
    if isinstance(value, dict):
        if len(value)>100:
            raise ValueError('geospatial metadata size limit')
        return {str(k):plain(v,depth+1) for k,v in value.items()}
    if isinstance(value,(tuple,list)):
        if len(value)>100:
            raise ValueError('geospatial metadata array limit')
        return [plain(v,depth+1) for v in value]
    if value is None or isinstance(value,(str,int,float,bool)):
        return value
    return str(value)


def _native(path):
    from proc_pdf import pdf_reader
    reader = pdf_reader(path)
    pages = []
    pdf = None
    for number,pdf_page in enumerate(reader.pages[:MAX_PAGES]):
        vps = plain(pdf_page.get('/VP', []))
        data = {'page':number+1,'viewports':vps,'rotation':int(pdf_page.get('/Rotate',0)), 'labels':[], 'paths':[]}
        pages.append(data)
        if not any(v.get('/Measure',{}).get('/Subtype')=='/GEO' for v in vps):
            continue
        if pdf is None:
            try:
                import pypdfium2 as F
                import pypdfium2.raw as R
                import ctypes as C
            except ImportError:
                raise SystemExit('pypdfium2 is required by the optional native ground-chart builder')
            pdf = F.PdfDocument(path)
        page = pdf[number]
        tp = page.get_textpage()
        count = tp.count_chars()
        if count > MAX_CHARS:
            raise ValueError('surface chart native character limit')
        pieces, boxes, colors = [], [], []
        def color(obj, fill=True):
            vals = [C.c_uint() for _ in range(4)]
            fn = R.FPDFPageObj_GetFillColor if fill else R.FPDFPageObj_GetStrokeColor
            return [v.value for v in vals] if fn(obj,*[C.byref(v) for v in vals]) else None
        def flush():
            text = ' '.join(''.join(pieces).split())
            if text and boxes:
                box = [min(b[0] for b in boxes),min(b[1] for b in boxes),max(b[2] for b in boxes),max(b[3] for b in boxes)]
                ink = Counter(tuple(c) for c in colors if c)
                data['labels'].append({'text':text[:1000],'bbox':[round(v,4) for v in box],
                                       'fill_rgba':list(ink.most_common(1)[0][0]) if ink else None})
            pieces.clear(); boxes.clear(); colors.clear()
        for i in range(count):
            text = tp.get_text_range(i,1)
            if '\r' in text or '\n' in text:
                flush(); continue
            pieces.append(text)
            if text.strip():
                boxes.append(list(tp.get_charbox(i)))
                obj = tp.get_textobj(i)
                colors.append(color(obj) if obj else None)
        flush()
        points = 0
        for index,obj in enumerate(page.get_objects()):
            if index > MAX_OBJECTS:
                raise ValueError('surface chart native object limit')
            if obj.type != R.FPDF_PAGEOBJ_PATH:
                continue
            fill,stroke = C.c_int(),C.c_int()
            if not R.FPDFPath_GetDrawMode(obj,C.byref(fill),C.byref(stroke)) or not fill.value:
                continue
            ink = color(obj)
            if not ink or ink[3]!=255 or max(ink[:3])-min(ink[:3])>4 or not 100<=ink[0]<=245:
                continue
            matrices = []
            current = obj
            while current is not None:
                matrices.append(current.get_matrix())
                current = current.container
                if len(matrices)>16:
                    raise ValueError('surface chart form depth limit')
            def xy(segment):
                x,y = C.c_float(),C.c_float()
                if not R.FPDFPathSegment_GetPoint(segment,C.byref(x),C.byref(y)):
                    raise ValueError('unread native path point')
                point = (x.value,y.value)
                for matrix in matrices:
                    point = matrix.on_point(*point)
                if not all(math.isfinite(v) and abs(v)<100000 for v in point):
                    raise ValueError('invalid native surface path point')
                return [round(v,4) for v in point]
            commands,curve = [],[]
            for n in range(R.FPDFPath_CountSegments(obj)):
                points += 1
                if points>MAX_POINTS:
                    raise ValueError('surface chart vector point limit')
                seg = R.FPDFPath_GetPathSegment(obj,n)
                typ = R.FPDFPathSegment_GetType(seg)
                point = xy(seg)
                if typ==R.FPDF_SEGMENT_BEZIERTO:
                    curve.append(point)
                    if len(curve)==3:
                        commands.append(['c',*curve]);curve=[]
                elif not curve and typ in (R.FPDF_SEGMENT_MOVETO,R.FPDF_SEGMENT_LINETO):
                    commands.append(['m' if typ==R.FPDF_SEGMENT_MOVETO else 'l',point])
                else:
                    raise ValueError('unsupported native surface path sequence')
                if R.FPDFPathSegment_GetClose(seg):
                    commands.append(['h'])
            if curve:
                raise ValueError('incomplete native surface Bezier')
            if len(commands)>2:
                data['paths'].append({'native_object':index,'fill_rgba':ink,'fill_rule':fill.value,'commands':commands})
        tp.close();page.close()
    if pdf:
        pdf.close()
    return {'pages_total':len(reader.pages),'pages':pages,'truncated':len(reader.pages)>MAX_PAGES}


def shapes(commands):
    """Flatten source subpaths separately; never connect across move operations."""
    rows,current = [],[]
    def flush():
        if len(current)>2:
            if current[0]!=current[-1]:
                current.append(current[0])
            rows.append(current[:])
        current.clear()
    for cmd in commands:
        if cmd[0]=='m':
            flush();current.append(cmd[1])
        elif cmd[0]=='l' and current:
            current.append(cmd[1])
        elif cmd[0]=='c' and current:
            a,b,c,d = current[-1],*cmd[1:]
            steps = min(80,max(4,math.ceil((math.dist(a,b)+math.dist(b,c)+math.dist(c,d))/2)))
            current.extend([sum(w*p[i] for w,p in zip(((1-t)**3,3*(1-t)**2*t,3*(1-t)*t*t,t**3),(a,b,c,d))) for i in (0,1)] for t in [j/steps for j in range(1,steps+1)])
        elif cmd[0]=='h' and current:
            current.append(current[0]);flush()
        else:
            raise ValueError('unsupported surface subpath')
    # Filled PDF paths are implicitly closed, but remain separate source rings.
    if current:
        current.append(current[0]);flush()
    return rows


def interpret(native):
    result = {'pages':[],'labels':[],'surface_candidates':[],'installed':False,'review_required':True}
    for page in native['pages']:
        calibrations,refused = [],[]
        for index,viewport in enumerate(page['viewports']):
            try:
                cal = G.calibration(viewport)
                if page['rotation']%360:
                    raise ValueError('rotated PDF page registration unsupported')
                calibrations.append((index,cal))
            except (ValueError,TypeError,KeyError) as error:
                refused.append(str(error))
        result['pages'].append({'page':page['page'],'registrations':[c for i,c in calibrations], 'refused':refused,
                                'state':'geographic-candidates' if calibrations else 'georeferencing-unread'})
        def locate(point):
            matches=[]
            for index,cal in calibrations:
                try:matches.append((G.position(cal,point),index,cal['datum']))
                except ValueError:pass
            return matches[0] if len(matches)==1 else None
        for label in page['labels']:
            ink = label.get('fill_rgba')
            if not ink or ink[2]<ink[0]+10 or ink[1]<ink[0]+5:
                continue
            text = label['text'].strip()
            taxi = re.fullmatch(r'TWY\s+([A-Z][A-Z0-9-]{0,7})',text,re.I)
            apron = re.fullmatch(r'(?:[A-Z][A-Z ]{0,35} )?APRON',text,re.I)
            if not (taxi or apron):
                continue
            b=label['bbox'];center=[(b[0]+b[2])/2,(b[1]+b[3])/2]
            pos = locate(center)
            if pos:
                result['labels'].append({**label,'kind':'twy' if taxi else 'apron','name':taxi[1] if taxi else text,
                                         'coordinates':pos[0],'viewport':pos[1],'datum':pos[2],'page':page['page'],
                                         'role':'chart-label-anchor-not-ground-centerline-or-hold-position'})
        for path in page['paths']:
            rings = shapes(path['commands'])
            for n,ring in enumerate(rings):
                located = [locate(p) for p in ring]
                if not all(located) or len({p[1] for p in located})!=1:
                    continue
                xs,ys = [p[0] for p in ring],[p[1] for p in ring]
                if (max(xs)-min(xs))*(max(ys)-min(ys))<4:
                    continue
                result['surface_candidates'].append({'page':page['page'],'native_object':path['native_object'],
                    'subpath':n,'coordinates':[p[0] for p in located],'pdf_points':ring,'fill_rgba':path['fill_rgba'],
                    'fill_rule':path['fill_rule'],'datum':located[0][2],'role':'unclassified-filled-source-subpath',
                    'holes_and_parent_surface_unresolved':True})
    # Keep source fills only when their native object is near an accepted map
    # label. This excludes unanchored table headers/keys, without claiming that
    # proximity establishes a taxiway/apron identity or resolves hole topology.
    def distance(point, ring):
        inside=False
        best=float('inf')
        for a,b in zip(ring,ring[1:]):
            if (a[1]>point[1])!=(b[1]>point[1]) and point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0]:
                inside=not inside
            dx,dy=b[0]-a[0],b[1]-a[1]
            den=dx*dx+dy*dy
            t=max(0,min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/den)) if den else 0
            best=min(best,math.dist(point,[a[0]+t*dx,a[1]+t*dy]))
        return 0 if inside else best
    nearby={}
    for surface in result['surface_candidates']:
        key=(surface['page'],surface['native_object'])
        for i,label in enumerate(result['labels']):
            if label['page']!=surface['page']:
                continue
            b=label['bbox'];center=[(b[0]+b[2])/2,(b[1]+b[3])/2]
            if distance(center,surface['pdf_points'])<=12:
                nearby.setdefault(key,set()).add(i)
    kept=[]
    for surface in result['surface_candidates']:
        refs=nearby.get((surface['page'],surface['native_object']))
        if refs:
            surface['nearby_chart_label_refs']=sorted(refs)
            surface['label_relation']='cartographic-proximity-only-not-operational-identity'
            kept.append(surface)
    result['unanchored_fill_subpaths']=len(result['surface_candidates'])-len(kept)
    result['surface_candidates']=kept
    result['partial']={'unread':['operational-taxilines','holding-positions','named-apron-polygons','surface-topology','routing']}
    result['truncated']=native.get('truncated',False)
    return result


def build(root,out,workers=3,codes=None):
    root,out = Path(root).resolve(),Path(out)
    catalogue = json.loads((root/'work/vfr-ground-catalogue.json').read_text(encoding='utf-8'))
    manifest = json.loads((root/'inputs-manifest.json').read_text(encoding='utf-8'))['files']
    signature = hashlib.sha256(Path(__file__).read_bytes()+Path(G.__file__).read_bytes()).hexdigest()[:16]
    charts = [c for c in catalogue['charts'] if c['stored'] and any(k!='visual' for k in c['families']) and (not codes or c['icao'] in codes)]
    report={'scope':'native geographic chart labels and unclassified filled subpaths, no installation/routing', 'charts':[], 'regression_run':False}
    def one(chart):
        path=contained(root,chart['file']);digest=sha(path)
        if digest!=manifest.get(chart['file'],{}).get('sha256'):
            raise ValueError('changed chart source')
        cache=out/'native'/signature/(digest+'.json')
        if cache.exists():native=json.loads(cache.read_text(encoding='utf-8'))
        else:
            native=limited('_native',path,module='ground_pdf',timeout=50)
            write(cache,native)
        doc=interpret(native)
        doc['source']={k:chart[k] for k in ('country','icao','file','title','cycle')}
        doc['source']['sha256']=digest
        doc['truncated']=native['truncated']
        target=out/'candidates'/chart['icao']/(digest+'.json')
        write(target,doc)
        return {'icao':chart['icao'],'country':chart['country'],'file':chart['file'],'state':'source-read',
                'geographic_pages':sum(bool(p['registrations']) for p in doc['pages']),'labels':len(doc['labels']),
                'surface_subpaths':len(doc['surface_candidates']),'refused':sorted({r for p in doc['pages'] for r in p['refused']}),
                'truncated':doc['truncated']}
    with ThreadPoolExecutor(max_workers=max(1,min(workers,4))) as pool:
        futures={pool.submit(one,c):c for c in charts}
        for future in as_completed(futures):
            c=futures[future]
            try:row=future.result()
            except (Exception,SystemExit) as error:row={'icao':c['icao'],'country':c['country'],'file':c['file'],'state':'failed','error':str(error)[:300]}
            report['charts'].append(row)
            write(out/'report.json',report)
            print(json.dumps(row),flush=True)
    return report


if __name__=='__main__':
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--local',type=Path,required=True)
    cli.add_argument('--out',type=Path,required=True)
    cli.add_argument('--workers',type=int,default=3)
    cli.add_argument('--icao',nargs='+')
    args=cli.parse_args()
    result=build(args.local,args.out,args.workers,args.icao)
    raise SystemExit(1 if any(c['state']=='failed' for c in result['charts']) else 0)
