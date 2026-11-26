"""Published stand/holding coordinates from local AIP surface charts.

Exact own-airport/table rows only; source-labelled candidates, no active installation.
Optional PDFium is confined to proc_pdf's timed child. Coordinator/parser are stdlib.
"""
import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
from pathlib import Path
import re

from proc_pdf import limited
from proc_replay import contained, sha, write

ROW = re.compile(r'^(?:(Hold|Holding point|Holding position)\s+)?(\d{1,4}[A-Z]{0,2}|[A-Z]{1,3}\d{1,3}[A-Z]?)\s+(\d{6}(?:\.\d{1,3})?)([NS])\s+(\d{7}(?:\.\d{1,3})?)([EW])$',re.I)
HEADER = re.compile(r'\b(?:AIRCRAFT )?STANDS?\s+CO(?:-?ORDINATES|ORDS)\b',re.I)
STOP = re.compile(r'^(?:COM|LIGHTING|RUNWAY/TAXIWAY/APRON|AERO INFO DATE|CHANGE\b|NOTES?\b|ARP\b)')


def _printed(path):
    try:
        import pypdfium2 as F
    except ImportError:
        raise SystemExit('pypdfium2 is required by the optional ground-coordinate PDF builder')
    pages=[]
    with F.PdfDocument(path) as pdf:
        total=len(pdf)
        for n in range(min(total,3)):
            page=pdf[n];text=page.get_textpage()
            if text.count_chars()>50000:
                raise ValueError('ground-coordinate page character limit')
            pages.append(text.get_text_range())
            text.close();page.close()
    return {'pages':pages,'truncated':total>3}


def degrees(value,hemi,latitude):
    width=2 if latitude else 3
    d,m,s=int(value[:width]),int(value[width:width+2]),float(value[width+2:])
    limit=90 if latitude else 180
    if m>=60 or s>=60 or d>limit or d==limit and (m or s):
        raise ValueError('invalid published DMS coordinate')
    result=d+m/60+s/3600
    return round(-result if hemi.upper() in ('S','W') else result,8)


def parse(text,icao,title):
    if not re.fullmatch(r'[A-Z]{4}',icao) or len(text)>200000:
        raise ValueError('invalid/excessive ground coordinate source')
    if not re.search(r'AERODROME|PARKING|DOCKING|GROUND MOVEMENT|\bAD CHART\b|\bPD CHART\b',title,re.I):
        return {'items':[],'conflicts':[],'unread':[],'reason':'not-owned-surface-chart'}
    if not re.search(r'\b'+icao+r'\b',text):
        return {'items':[],'conflicts':[],'unread':[],'reason':'own-airport-not-read'}
    items,conflicts,unread={},set(),[]
    active=False
    for raw in text.splitlines():
        row=' '.join(raw.split())
        if HEADER.search(row):
            active=True;continue
        if STOP.match(row):
            active=False
        match=ROW.fullmatch(row)
        if not match or (not match[1] and not active):
            if active and re.search(r'\d{6}\.\d+[NS]|\d{7}\.\d+[EW]',row):
                unread.append(row[:300])
            continue
        kind='hold' if match[1] else 'park'
        name=match[2].upper()
        try:
            lat=degrees(match[3],match[4],True);lon=degrees(match[5],match[6],False)
            if icao.startswith('EG') and not (49<=lat<=61 and -10<=lon<=3):
                raise ValueError('published coordinate outside UK bounds')
            if icao.startswith('EI') and not (51<=lat<=56 and -11<=lon<=-5):
                raise ValueError('published coordinate outside Irish bounds')
            if icao.startswith('ES') and not (54<=lat<=70 and 10<=lon<=25):
                raise ValueError('published coordinate outside Swedish bounds')
        except ValueError:
            unread.append(row[:300]);continue
        key=(kind,name)
        item={'kind':kind,'name':name,'point':[lon,lat],'coordinate_role':'explicit-published-coordinate',
              'evidence':row,'review_required':True}
        if key in items and items[key]['point']!=item['point']:
            conflicts.add(key)
        else:
            items[key]=item
    return {'items':[item for key,item in items.items() if key not in conflicts],
            'conflicts':[list(k) for k in sorted(conflicts)],'unread':unread,'reason':None}


def build(root,out,workers=3,codes=None):
    root,out=Path(root).resolve(),Path(out)
    manifest=json.loads((root/'inputs-manifest.json').read_text(encoding='utf-8'))['files']
    catalogue=json.loads((root/'work/vfr-ground-catalogue.json').read_text(encoding='utf-8'))
    charts=[c for c in catalogue['charts'] if c['stored'] and any(k!='visual' for k in c['families']) and (not codes or c['icao'] in codes)]
    signature=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()[:16]
    report={'scope':'explicit printed stand/hold coordinates; no installed ground layer','charts':[],'installed':False,'regression_run':False}
    def one(chart):
        path=contained(root,chart['file']);digest=sha(path)
        if digest!=manifest.get(chart['file'],{}).get('sha256'):
            raise ValueError('changed surface-chart source')
        cache=out/'native'/signature/(digest+'.json')
        if cache.exists():native=json.loads(cache.read_text(encoding='utf-8'))
        else:
            native=limited('_printed',path,module='ground_positions',timeout=45);write(cache,native)
        doc={'source':{k:chart[k] for k in ('country','icao','file','title','cycle')},'items':[], 'pages':[],
             'installed':False,'truncated':native['truncated'],'partial':{'unread':['taxiway-lines','apron-polygons','unprinted-or-unread-positions','complete-inventory']}}
        doc['source']['sha256']=digest
        for n,text in enumerate(native['pages'],1):
            result=parse(text,chart['icao'],chart['title'])
            doc['pages'].append({'page':n,**{k:v for k,v in result.items() if k!='items'}})
            for item in result['items']:
                item['page']=n
                item['id']=f"aip:{chart['icao']}:{item['kind']}:{item['name']}:p{n}"
                doc['items'].append(item)
        write(out/'candidates'/chart['icao']/(digest+'.json'),doc)
        return {'icao':chart['icao'],'country':chart['country'],'file':chart['file'],'state':'source-read',
                'counts':dict(Counter(i['kind'] for i in doc['items'])),'unread_rows':sum(len(p['unread']) for p in doc['pages']),
                'conflicts':sum(len(p['conflicts']) for p in doc['pages']),'truncated':native['truncated']}
    with ThreadPoolExecutor(max_workers=max(1,min(workers,4))) as pool:
        futures={pool.submit(one,c):c for c in charts}
        for future in as_completed(futures):
            chart=futures[future]
            try:row=future.result()
            except (Exception,SystemExit) as error:row={'icao':chart['icao'],'country':chart['country'],'file':chart['file'],'state':'failed','error':str(error)[:300]}
            report['charts'].append(row);write(out/'report.json',report)
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
