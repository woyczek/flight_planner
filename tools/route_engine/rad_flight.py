"""Whole-flight RAD context and a deliberately explicit subset of rule grammar.
All coded SID/STAR points participate in VIA conditions. Unparsed conditions are
reported as reviews; they never become permissions or silently pass as valid.
"""
import collections,re
from . import fra   # SOG-0081 : import relatif

def active_during(clock,start,end):
    if clock=='H24':return True
    import datetime as dt
    match=re.fullmatch(r'(\d\d):(\d\d)\s*-\s*(\d\d):(\d\d)',clock)
    if not match:return None
    a=int(match[1])*60+int(match[2]);b=int(match[3])*60+int(match[4])
    day=start.replace(hour=0,minute=0,second=0,microsecond=0)-dt.timedelta(days=1)
    while day<=end:
        left=day+dt.timedelta(minutes=a);right=day+dt.timedelta(minutes=b+(1440 if b<=a else 0))
        if start<right and end>=left:return True
        day+=dt.timedelta(days=1)
    return False

def names(text):
    return set(re.findall(r'[A-Z][A-Z0-9_*]{1,30}',text.upper()))

def aliases(text):
    text=re.sub('[^A-Z0-9]','',text.upper())
    return {text,re.sub(r'\d[A-Z]$','',text)}-{''}

def context(legs,dep,arr):
    points={dep,arr};routes=set();phases=collections.Counter();sid=set();star=set()
    for l in legs:
        points.update([l['start']['id'],l['end']['id']]);routes.update(aliases(l['via']));phases[l['kind']]+=1
        if l['kind']=='SID':sid.update(aliases(l['via']))
        if l['kind'] in ['STAR','APPROACH_LINK']:star.update(aliases(l['via']))
    sids=[l for l in legs if l['kind']=='SID'];stars=[l for l in legs if l['kind'] in ['STAR','APPROACH_LINK']]
    if sids:sid.add(sids[-1]['end']['id'])
    if stars:star.add(stars[0]['start']['id'])
    return dict(points=points,routes=routes,all=points|routes,dep=dep,arr=arr,sid=sid,star=star,phases=dict(phases))

def condition(text,ctx,rad):
    """Only simple conjunctions of DEP/ARR/VIA and one EXC are decidable here."""
    text=' '.join(text.upper().split())
    if not text:return True
    if re.search(r'\b(?:BELOW|ABOVE|BLW|ABV|RFL|ACFT|PBN|EXCEPT|FL\d+)\b',text):return None
    if text.startswith('ALL '):text=text[4:]
    # Do not interpret enumerations, flight levels, aircraft types or activation.
    parts=re.split(r'\s+EXC\s+',text)
    if len(parts)>2:return None
    def conjunction(value):
        matches=list(re.finditer(r'(DEP|ARR|VIA)\s+([A-Z0-9_*(), /-]+?)(?=\s*(?:&|\bAND\b|$))',value))
        if not matches:return None
        residue=value
        tests=[]
        for m in reversed(matches):residue=residue[:m.start()]+residue[m.end():]
        if re.sub(r'\bAND\b|[&\s]','',residue):return None
        for m in matches:
            spec=m[2]
            if names(spec)&{'AND','OR','EXC','DEP','ARR','VIA','ABV','BLW','FL','RFL','TYP','PBN','NOT','DCT','SID','STAR','BELOW','ABOVE','EXCEPT'}:return None
            if m[1] in ['DEP','ARR']:
                if any(not (re.fullmatch('[A-Z0-9_*]{4}',t) or t in rad.groups) for t in names(spec)):return None
                tests.append(rad.match(spec,ctx[m[1].lower()]))
            else:
                tokens=names(spec)
                if any('_' in t or '*' in t for t in tokens):return None
                if len(tokens)>1 and ',' not in spec:return None
                if ctx.get('known') is not None and not tokens<=ctx['known']:return None
                tests.append(bool(tokens & ctx['all']))
        return all(tests)
    main=conjunction(parts[0])
    if main is None:return None
    if len(parts)==1:return main
    exc=conjunction(parts[1]);return None if exc is None else main and not exc

def target(rule,ctx,legs,rad):
    v=rule['values'];sheet=rule['sheet'];ids=[]
    if sheet in ['Annex 3A DEP','Annex 3A ARR']:
        phase='SID' if sheet.endswith('DEP') else 'STAR'
        if not rad.match(v[4],ctx['dep'] if phase=='SID' else ctx['arr']):return False,[]
        wanted=names(v[5]);scope=ctx['sid'] if phase=='SID' else ctx['star']
        if wanted & scope:
            ids=[i for i,l in enumerate(legs) if l['kind']=='SID' if phase=='SID'] if phase=='SID' else [i for i,l in enumerate(legs) if l['kind'] in ['STAR','APPROACH_LINK']]
        if v[6]:
            candidates=[(i,l) for i,l in enumerate(legs) if l['via']=='DCT' and ((l['start']['id']==ctx['dep']) if phase=='SID' else l['end']['id']==ctx['arr'])]
            ids += [i for i,l in candidates if (l['end']['id'] if phase=='SID' else l['start']['id']) in names(v[6])]
        return bool(ids),sorted(set(ids))
    if sheet!='Annex 2B':return None,[]
    if v[7] and not any(v[i] for i in [4,5,6]):
        if not re.fullmatch(r'[A-Z0-9]{2,8}',v[7]):return None,[]
        if ctx.get('known') is not None and v[7] not in ctx['known']:return None,[]
        if v[7] not in ctx['points']:return False,[]
        return True,[i for i,l in enumerate(legs) if v[7] in [l['start']['id'],l['end']['id']]]
    if all(v[i] for i in [4,5,6]) and not v[7]:
        for i,l in enumerate(legs):
            if v[4] not in aliases(l['via']) or l['start']['id']!=v[5]:continue
            for j in range(i,len(legs)):
                if v[4] not in aliases(legs[j]['via']):break
                if legs[j]['end']['id']==v[6]:ids.extend(range(i,j+1));break
        return bool(ids),sorted(set(ids))
    return None,[]

def evaluate(rad,legs,dep,arr,when,candidates,known_ids=None):
    ctx=context(legs,dep,arr);findings=[];avoids=[];decided=0
    ctx['known']=known_ids
    duplicates=collections.Counter((c['sheet'],c['id']) for c in candidates if c.get('change')!='DEL')
    for rule in candidates:
        if rule.get('change')=='DEL':continue
        v=rule['values'];sheet=rule['sheet']
        if sheet not in ['Annex 2B','Annex 3A DEP','Annex 3A ARR']:continue
        if duplicates[(sheet,rule['id'])]>1:continue
        applicability,affected=target(rule,ctx,legs,rad)
        if applicability is None:continue
        util=' '.join(v[8 if sheet=='Annex 2B' else 7].upper().split())
        clock=v[9 if sheet=='Annex 2B' else 8].strip()
        if not (clock=='H24' or re.fullmatch(r'\d\d:\d\d\s*-\s*\d\d:\d\d',clock)):continue
        # Check the entire passage interval, including midnight and activation
        # beginning during a segment, rather than only the departure clock.
        import datetime as dt
        timed=affected or ([i for i,l in enumerate(legs) if l['kind']=='SID'] if sheet.endswith('DEP') else [i for i,l in enumerate(legs) if l['kind'] in ['STAR','APPROACH_LINK']] if sheet.endswith('ARR') else list(range(len(legs))))
        if not any(active_during(clock,when+dt.timedelta(minutes=legs[i].get('time_start_min',0)),when+dt.timedelta(minutes=legs[i].get('time_end_min',legs[i].get('time_start_min',0)))) for i in timed):
            rule['assessment']='Hors horaire au passage estimé (UTC)';decided+=1;continue
        m=re.fullmatch(r'(NOT AVBL FOR TFC|ONLY AVBL FOR TFC|COMPULSORY FOR TFC)(?:\s+(.*))?',util)
        if not m:continue
        test=condition(m[2] or '',ctx,rad)
        if test is None:continue
        mode=m[1];violation=(applicability and test) if mode=='NOT AVBL FOR TFC' else (applicability and not test) if mode=='ONLY AVBL FOR TFC' else (test and not applicability)
        decided+=1;rule['assessment']='INFRACTION : condition RAD évaluée sur tout le vol' if violation else 'Condition simple évaluée sur tout le vol : aucune infraction détectée'
        if not violation:continue
        if not affected:
            affected=[i for i,l in enumerate(legs) if l['kind']=='SID'] if sheet.endswith('DEP') else [i for i,l in enumerate(legs) if l['kind'] in ['STAR','APPROACH_LINK']] if sheet.endswith('ARR') else []
        phases=sorted({legs[i]['kind'] for i in affected})
        findings.append(dict(id=rule['id'],sheet=sheet,row=rule['row'],segments=affected,phases=phases,text=f"RAD {rule['id']} ({sheet}, ligne {rule['row']}) : {mode} ; contexte départ–SID–route–STAR–arrivée pris en compte."))
        for i in affected:
            l=legs[i]
            if l.get('procedure_id'):avoids.append(dict(kind='procedure',procedure_id=l['procedure_id']))
            else:avoids.append(dict(kind='segment',via=l['via'],start=l['start']['id'],end=l['end']['id']))
    return dict(scope='Vol entier : départ, tous les points SID, route, tous les points STAR et arrivée',segments=len(legs),phases=ctx['phases'],
        evaluated_conditions=decided,review_conditions=sum('interpréter' in c['assessment'] for c in candidates),findings=findings,search_exclusions=avoids)

def static_blocks(rad,dep,arr):
    """Airport-only ONLY/NOT conditions can safely constrain the graph upfront."""
    if not rad.book:return []
    active=[r for r in rad.book['sheets']['Annex 2B'] if rad.active(r) and r['v'][0]!='DEL']
    duplicates=collections.Counter(r['v'][3] for r in active);blocks=[]
    for r in active:
        v=r['v']
        if duplicates[v[3]]>1 or v[9]!='H24':continue
        m=re.fullmatch(r'(ONLY AVBL FOR TFC|NOT AVBL FOR TFC)\s+(.+)',' '.join(v[8].upper().split()))
        if not m or re.search(r'\bVIA\b',m[2]):continue
        result=condition(m[2],dict(dep=dep,arr=arr,all=set()),rad)
        if result is None or not (result if m[1]=='NOT AVBL FOR TFC' else not result):continue
        base=dict(id=v[3],sheet='Annex 2B',row=r['row'])
        if v[7] and not any(v[i] for i in [4,5,6]) and re.fullmatch('[A-Z0-9]{2,8}',v[7]):blocks.append(dict(base,kind='point',point=v[7]))
        elif all(re.fullmatch('[A-Z0-9]{2,8}',v[i]) for i in [4,5,6]) and not v[7]:blocks.append(dict(base,kind='segment',via=v[4],start=v[5],end=v[6]))
    return blocks
