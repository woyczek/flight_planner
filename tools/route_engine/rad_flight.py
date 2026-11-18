"""Whole-flight RAD context and a deliberately explicit subset of rule grammar.
All coded SID/STAR points participate in VIA conditions. Unparsed conditions are
reported as reviews; they never become permissions or silently pass as valid.
"""
import collections,re
from . import fra   # SOG-0081 : import relatif
from . import rad_via      # SOG-0401 (forme B) : la SUITE d'un groupe VIA

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

RFL_ATOM=re.compile(r'\bRFL\s+(?:(ABV|BLW)\s+FL\s*(\d{2,3})|BTN\s+FL\s*(\d{2,3})\s*-\s*FL\s*(\d{2,3}))\b')      # SOG-0401 (le niveau demandé) : « RFL ABV FL105 », « RFL BLW FL295 », « RFL BTN FL105-FL195 » : le niveau de CROISIÈRE déposé par rapport à un niveau ; « AT point » et « IN pays » ne sont PAS lus ici

AT_ATOM=re.compile(r'\b(?:RFL\s+)?(ABV|BLW)\s+FL\s*(\d{2,3})\s+AT\s+([A-Z][A-Z0-9]{1,6})\b')      # SOG-0401 : « ABV FL245 AT UMDAS », « RFL BLW FL105 AT X » : le niveau AU POINT, tel que le PROFIL du vol le donne (le point doit être sur la route : sinon la condition est fausse)

def at_test(kind,level,point,ctx):
    """Vrai / faux / None : le niveau du profil au point `point` est-il au-dessus (ABV) ou au-dessous (BLW) de FL`level` ? Le point absent de la route : faux ; l'altitude du profil inconnue ou EXACTEMENT sur la limite : None."""
    if point not in ctx.get('points',()):return False
    alt=(ctx.get('alt') or {}).get(point)
    if not isinstance(alt,(int,float)):return None
    x=int(level)*100
    return None if abs(alt-x)<1 else (alt>x if kind=='ABV' else alt<x)

def rfl_test(spec,fl):
    """Vrai / faux si le niveau demandé `fl` (un entier, FL) satisfait `spec` (le texte d'un atome RFL, sans « RFL ») ; None s'il n'est pas décidable : niveau inconnu, texte non lu, ou niveau EXACTEMENT sur une limite (la source ne dit pas si « ABV FL105 » inclut FL105 : jamais deviné)."""
    m=RFL_ATOM.fullmatch('RFL '+spec.strip())
    if not m or not isinstance(fl,int):return None
    if m[1]:
        x=int(m[2])
        return None if fl==x else (fl>x if m[1]=='ABV' else fl<x)
    lo,hi=int(m[3]),int(m[4])
    return None if fl in (lo,hi) or lo>hi else lo<fl<hi

MAX_CONDITION=4000      # SOG-0401 (Sécurisation) : au-delà de ce nombre de signes une condition n'est pas décidée
PAIR=r'\d\d:\d\d\s*-\s*\d\d:\d\d'

def clock_ok(clock):
    """SOG-0401 (forme A) : un horaire que le contrôle sait lire : H24, « HH:MM-HH:MM » (UTC), ou « HH:MM-HH:MM (HH:MM-HH:MM) » (l'heure d'hiver, puis celle d'été entre parenthèses)."""
    return clock=='H24' or bool(re.fullmatch(PAIR,clock)) or bool(re.fullmatch(PAIR+r'\s*\('+PAIR+r'\)',clock))

def clock_active(clock,start,end):
    """Vrai / faux si la règle est active pendant [start, end] ; None si l'horaire n'est pas lisible OU si les deux écritures d'un horaire « hiver (été) » ne disent pas la même chose (la saison n'est pas décidée ici : la règle reste à examiner)."""
    m=re.fullmatch('('+PAIR+r')\s*\(('+PAIR+r')\)',clock)
    if m:
        a,b=active_during(m[1].replace(' ',''),start,end),active_during(m[2].replace(' ',''),start,end)
        return a if a==b else None
    return active_during(clock.replace(' ',''),start,end) if clock_ok(clock) else None

def names(text):
    return set(re.findall(r'[A-Z][A-Z0-9_*]{1,30}',text.upper()))

def unread_spaces_issue(summary,limit=8):
    """SOG-0501 (c) : la phrase de revue des règles RAD que le vol touche et que la base NE PEUT PAS appliquer parce que leur cible est un ESPACE sans contour (LDZOC, LDZON, EDUUUTA…) : (texte, nombre de règles) ou None ; `summary['unknown_spaces']` = [{ space, rules }] ; au plus `limit` espaces."""
    spaces=[x for x in (summary or {}).get('unknown_spaces') or [] if isinstance(x,dict) and isinstance(x.get('space'),str) and isinstance(x.get('rules'),list) and x['rules']]
    if not spaces:return None
    total=len({r for x in spaces for r in x['rules']})
    named=[f"{x['space']} ({', '.join(str(r) for r in x['ad'][:3])})" for x in spaces if isinstance(x.get('ad'),list) and x['ad']]      # les règles qui nomment le terrain de départ ou d'arrivée, d'abord
    spaces=sorted(spaces,key=lambda x:not(isinstance(x.get('ad'),list) and x['ad']))
    shown='; '.join(f"{x['space']} ({', '.join(str(r) for r in x['rules'][:3])}{', …' if len(x['rules'])>3 else ''})" for x in spaces[:limit])
    more=f' ; {len(spaces)-limit} autre(s) espace(s)' if len(spaces)>limit else ''
    first=f" ; celles qui nomment le terrain de départ ou d'arrivée : {'; '.join(named[:8])}" if named else ''
    return f"Règles RAD NON appliquées : {total} règle(s) dont la cible est un espace sans contour dans la base{first} — tous les espaces : {shown}{more} ; l'IFPS les applique, la route peut être refusée par elles.",total


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
    alt={}      # SOG-0401 : l'altitude que le PROFIL donne à chaque point de la route : le bout de chaque tronçon (le point où l'avion passe), le début du premier pour le départ
    for n,l in enumerate(legs):
        if n==0 and isinstance(l.get('altitude_start_ft'),(int,float)):alt[l['start']['id']]=l['altitude_start_ft']
        if isinstance(l.get('altitude_end_ft'),(int,float)):alt[l['end']['id']]=l['altitude_end_ft']
    return dict(points=points,routes=routes,all=points|routes,dep=dep,arr=arr,sid=sid,star=star,phases=dict(phases),alt=alt,legs=legs)      # `legs` : la suite des tronçons, pour les groupes VIA qui se lisent dans l'ordre (rad_via)

def alternatives(text):
    """SOG-0401 (forme A) : les alternatives NUMÉROTÉES « 1. … 2. … » d'une condition (le RAD les lit comme un OU), ou None quand le texte n'est pas une liste numérotée simple : une seule alternative, ou une sous-liste « a. », « i) », une exception, un point-virgule : non décidé ici."""
    if not re.match(r'^1\.\s',text):return None
    pieces=re.split(r'\s*(?:^|(?<=\s))(\d{1,2})\.\s+',text)      # ['', '1', 'ARR (…)', '2', 'DEP (…)']
    nums=pieces[1::2];body=[x.strip() for x in pieces[2::2]]
    if len(body)<2 or nums!=[str(i) for i in range(1,len(body)+1)] or any(not x for x in body):return None
    if any(re.search(r'(?:^|\s)(?:[a-z]\.|[ivx]+\))\s|\bEXC\b|;',x,re.I) for x in body):return None
    return body

def split_parts(util,clock):
    """SOG-0401 (forme A) : une règle peut porter PLUSIEURS parties séparées par « ---------- » (« ONLY AVBL FOR TFC … ---------- COMPULSORY FOR TFC … », un horaire par partie) : [(texte, horaire)], une partie par mode ; None si le nombre d'horaires ne suit pas."""
    texts=[' '.join(x.upper().split()) for x in re.split(r'-{4,}',util or '')];texts=[x for x in texts if x]
    clocks=[x.strip() for x in re.split(r'-{4,}',clock or '')];clocks=[x for x in clocks if x]
    if not texts:return None
    if len(clocks)==len(texts):return list(zip(texts,clocks))
    if len(clocks)==1:return [(t,clocks[0]) for t in texts]
    return None

def condition(text,ctx,rad):
    """Only simple conjunctions of DEP/ARR/VIA and one EXC are decidable here."""
    if len(text)>MAX_CONDITION:return None      # SOG-0401 (Sécurisation) : un texte de cellule plus long est illisible, il n'est pas décidé (le coût de la lecture reste borné)
    text=' '.join(text.upper().split())
    if not text:return True
    if re.search(r'\b(?:BELOW|ABOVE|BLW|ABV|RFL|ACFT|PBN|EXCEPT|FL\d+)\b',AT_ATOM.sub(' ',RFL_ATOM.sub(' ',text))):return None      # les atomes RFL lus (ci-dessus) ne bloquent plus ; tout autre niveau reste non décidé
    numbered=alternatives(text)      # SOG-0401 (forme A) : « 1. ARR (LSGC, LSZH) 2. DEP (LSZA, LSZL) » : des alternatives (OU) numérotées, chacune une conjonction simple
    if numbered:
        results=[condition(a,ctx,rad) for a in numbered]
        return True if any(r is True for r in results) else False if all(r is False for r in results) else None
    if text.startswith('ALL '):text=text[4:]
    # Do not interpret enumerations, flight levels, aircraft types or activation.
    parts=re.split(r'\s+EXC\s+',text)
    if len(parts)>2:return None
    def conjunction(value):
        matches=list(re.finditer(r'(DEP|ARR|VIA|RFL|ABV|BLW)\s+([A-Z0-9_*(), /-]+?)(?=\s*(?:&|\bAND\b|$))',value))
        if not matches:return None
        residue=value
        tests=[]
        for m in reversed(matches):residue=residue[:m.start()]+residue[m.end():]
        if re.sub(r'\bAND\b|[&\s]','',residue):return None
        for m in matches:
            spec=m[2]
            if m[1] in ('ABV','BLW') or (m[1]=='RFL' and re.search(r'\bAT\b',spec)):      # SOG-0401 : « ABV FLnnn AT point » : le niveau du PROFIL au point
                a=AT_ATOM.fullmatch(((m[1]+' ') if m[1]!='RFL' else 'RFL ')+spec.strip()) if m[1]!='RFL' else AT_ATOM.fullmatch('RFL '+spec.strip())
                if not a:return None
                t=at_test(a[1],a[2],a[3],ctx)
                if t is None:return None
                tests.append(t);continue
            if m[1]=='RFL':      # SOG-0401 : le niveau demandé (ctx['fl'], le niveau déposé) ; inconnu ou sur la limite : non décidé
                t=rfl_test(spec,ctx.get('fl'))
                if t is None:return None
                tests.append(t);continue
            if m[1]=='VIA' and rad_via.read(spec.strip()) is not None:      # SOG-0401 (forme B) : « VIA (A DCT B) », « VIA (A L607 B) », « VIA (* DCT B) » : une SUITE, lue dans l'ordre du vol (vrai, faux, ou non décidé)
                t=rad_via.match(spec.strip(),ctx.get('legs'),aliases,ctx.get('known'))
                if t is None:return None
                tests.append(t);continue
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

UNSURE='?'      # SOG-0401 : « le vol est sur la voie du segment, mais on ne sait pas s'il vole une portion DU segment » : ni applicable ni sans objet

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
        if ctx.get('known') is not None and v[7] not in ctx['known']:
            # SOG-0401 : la cible n'est pas un POINT de la base : c'est un ESPACE (une FRA, une UTA, un ACC : LSASFRA, EDUUUTA…) ; la base n'en a pas le polygone sous ce nom (aucun des 25 307 espaces de la base de ce poste ne porte ces noms) : la règle n'est pas appliquée, elle est « à examiner », DITE avec l'espace
            ctx.setdefault('unknown_spaces',{}).setdefault(v[7],[]).append(rule['id'])
            if any(re.search(r'\b'+re.escape(str(code))+r'\b',' '.join(str(x) for x in v)) for code in (ctx.get('dep'),ctx.get('arr')) if code):ctx.setdefault('unknown_ad',set()).add(rule['id'])      # SOG-0501 (c) : la règle NOMME le terrain de départ ou d'arrivée du vol : dite en premier
            rule['assessment']='À interpréter : la cible est un ESPACE ('+v[7]+') inconnu de la base (aucun polygone) : règle non appliquée'
            return None,[]
        if v[7] not in ctx['points']:return False,[]
        return True,[i for i,l in enumerate(legs) if v[7] in [l['start']['id'],l['end']['id']]]
    if all(v[i] for i in [4,5,6]) and not v[7]:
        for i,l in enumerate(legs):
            if v[4] not in aliases(l['via']) or l['start']['id']!=v[5]:continue
            for j in range(i,len(legs)):
                if v[4] not in aliases(legs[j]['via']):break
                if legs[j]['end']['id']==v[6]:ids.extend(range(i,j+1));break
        if ids:return True,sorted(set(ids))
        # SOG-0401 (EDLO1003) : le vol qui n'enchaîne pas EXACTEMENT « de v[5] à v[6] » sur la voie peut quand même voler une PARTIE du segment (TIVDA T703 BEPAS pour le segment ARBAX–DEXIT : ARBAX–BARIX–BEPAS est dedans) ; Eurocontrol applique la règle à toute portion. « Sans objet » n'est donc dit que si le vol n'est jamais sur la voie ; sinon on cherche les tronçons du segment dans la voie, et sans ordre de la voie (ou dans le sens inverse) la règle n'est PAS décidée
        used=[i for i,l in enumerate(legs) if v[4] in aliases(l['via'])]
        if not used:return False,[]
        path=(ctx.get('airway') or (lambda *a:None))(v[4],v[5],v[6])
        if path is None:return UNSURE,used      # l'ordre de la voie manque : la règle n'est décidée que si la conclusion est la même qu'elle s'applique ou non (voir evaluate)
        forward,reverse=path
        ids=[i for i in used if (legs[i]['start']['id'],legs[i]['end']['id']) in forward]
        if ids:return True,sorted(set(ids))
        if any((legs[i]['start']['id'],legs[i]['end']['id']) in reverse for i in used):return UNSURE,used
        return False,[]
    return None,[]

def evaluate(rad,legs,dep,arr,when,candidates,known_ids=None,fl=None,airway=None):
    ctx=context(legs,dep,arr);findings=[];avoids=[];decided=0
    ctx['airway']=airway      # SOG-0401 : airway(alias,p,q) -> (tronçons de p à q dans le sens de la voie, tronçons en sens inverse) ou None si la voie ne relie pas p et q
    ctx['known']=known_ids;ctx['fl']=int(fl) if isinstance(fl,(int,float)) else None      # SOG-0401 : le niveau demandé (déposé), pour les conditions « RFL ABV FLnnn »
    duplicates=collections.Counter((c['sheet'],c['id']) for c in candidates if c.get('change')!='DEL')
    for rule in candidates:
        if rule.get('change')=='DEL':continue
        v=rule['values'];sheet=rule['sheet']
        if sheet not in ['Annex 2B','Annex 3A DEP','Annex 3A ARR']:continue
        if duplicates[(sheet,rule['id'])]>1:continue
        applicability,affected=target(rule,ctx,legs,rad)
        if applicability is None:continue
        plist=split_parts(v[8 if sheet=='Annex 2B' else 7],v[9 if sheet=='Annex 2B' else 8])      # SOG-0401 (forme A) : une partie par mode ; l'ancienne règle d'une partie en est le cas simple
        if plist is None:continue
        # Check the entire passage interval, including midnight and activation
        # beginning during a segment, rather than only the departure clock.
        import datetime as dt
        timed=affected or ([i for i,l in enumerate(legs) if l['kind']=='SID'] if sheet.endswith('DEP') else [i for i,l in enumerate(legs) if l['kind'] in ['STAR','APPROACH_LINK']] if sheet.endswith('ARR') else list(range(len(legs))))
        def run(applicability):
            outcomes=[]
            for util,clock in plist:
                if not clock_ok(clock):return None
                seen=[clock_active(clock,when+dt.timedelta(minutes=legs[i].get('time_start_min',0)),when+dt.timedelta(minutes=legs[i].get('time_end_min',legs[i].get('time_start_min',0)))) for i in timed]
                if None in seen:return None      # « hiver (été) » qui ne dit pas la même chose : à examiner
                if not any(seen):
                    outcomes.append((False,False,None,None));continue
                m=re.fullmatch(r'(NOT AVBL FOR TFC|ONLY AVBL FOR TFC|COMPULSORY FOR TFC)(?:\s+(.*))?',util)
                if not m:return None
                test=condition(m[2] or '',ctx,rad)
                if test is None:return None
                mode=m[1];outcomes.append((True,(applicability and test) if mode=='NOT AVBL FOR TFC' else (applicability and not test) if mode=='ONLY AVBL FOR TFC' else (test and not applicability),mode,m[2]))
            return outcomes
        if applicability==UNSURE:
            # SOG-0401 : applicable ou non, on ne sait pas : décidée seulement si les deux hypothèses donnent la même réponse (alors, toujours « sans infraction » : sans objet = jamais d'infraction pour « NOT / ONLY », et la condition fausse = jamais pour « COMPULSORY ») ; sinon laissée à examiner
            first,second=run(True),run(False)
            if first is None or second is None or [o[1] for o in first]!=[o[1] for o in second]:continue
            outcomes=first
        else:outcomes=run(applicability)
        if outcomes is None:continue
        if not any(o[0] for o in outcomes):
            rule['assessment']='Hors horaire au passage estimé (UTC)';decided+=1;continue
        bad=[o for o in outcomes if o[0] and o[1]];violation=bool(bad)
        mode,m=(bad[0][2],[None,bad[0][2],bad[0][3]]) if bad else (None,None)
        decided+=1;rule['assessment']='INFRACTION : condition RAD évaluée sur tout le vol' if violation else 'Condition simple évaluée sur tout le vol : aucune infraction détectée'
        if not violation:continue
        if not affected:
            affected=[i for i,l in enumerate(legs) if l['kind']=='SID'] if sheet.endswith('DEP') else [i for i,l in enumerate(legs) if l['kind'] in ['STAR','APPROACH_LINK']] if sheet.endswith('ARR') else []
        phases=sorted({legs[i]['kind'] for i in affected})
        if mode=='COMPULSORY FOR TFC' and not affected and sheet=='Annex 2B':      # SOG-0354 L5 (4) défaut 4 : « X obligatoire pour le trafic par Y » et X absent de la route : le constat n'a aucun tronçon ; il se corrige D'ABORD en passant par X à côté de Y (`compel`), Y n'est écarté (`fallback`) que si cette reprise échoue (plan.plan)
            via=re.fullmatch(r'VIA\s+([A-Z0-9_*(), /-]+)',m[2] or '')
            for point in sorted(names(via[1])) if via else []:
                if re.fullmatch('[A-Z0-9]{2,8}',point) and point in ctx['points']:
                    if re.fullmatch('[A-Z0-9]{2,8}',v[7] or ''):avoids.append(dict(kind='compel',point=v[7],before=point,id=rule['id'],sheet=sheet,row=rule['row']))
                    avoids.append(dict(kind='point',point=point,fallback=True,id=rule['id'],sheet=sheet,row=rule['row']))
        findings.append(dict(id=rule['id'],sheet=sheet,row=rule['row'],segments=affected,phases=phases,text=f"RAD {rule['id']} ({sheet}, ligne {rule['row']}) : {mode} ; contexte départ–SID–route–STAR–arrivée pris en compte."))
        point_rule=sheet=='Annex 2B' and bool(v[7]) and not any(v[i] for i in [4,5,6]) and re.fullmatch('[A-Z0-9]{2,8}',v[7]) and v[7] not in [dep,arr]      # SOG-0354 L5 (4) d2 A : la cible de la règle est un POINT (LE2666 : DELOG) : le constat exclut le POINT (toutes les arêtes qui le touchent), pas les seuls tronçons de la route trouvée : la route suivante y arrivait par un AUTRE tronçon du même point (une 2e reprise, 2,8 s)
        for i in affected:
            l=legs[i]
            if l.get('procedure_id'):avoids.append(dict(kind='procedure',procedure_id=l['procedure_id']))
            elif point_rule:
                block=dict(kind='point',point=v[7],id=rule['id'],sheet=sheet,row=rule['row'])
                if block not in avoids:avoids.append(block)
            else:avoids.append(dict(kind='segment',via=l['via'],start=l['start']['id'],end=l['end']['id']))
    return dict(scope='Vol entier : départ, tous les points SID, route, tous les points STAR et arrivée',segments=len(legs),phases=ctx['phases'],
        evaluated_conditions=decided,review_conditions=sum('interpréter' in c['assessment'] for c in candidates),findings=findings,search_exclusions=avoids,
        unknown_spaces=[dict(space=s,rules=sorted(set(r)),**({'ad':sorted(set(r)&ctx['unknown_ad'])} if ctx.get('unknown_ad') and set(r)&ctx['unknown_ad'] else {})) for s,r in sorted(ctx.get('unknown_spaces',{}).items())])      # SOG-0401 : les règles dont la cible est un espace inconnu de la base, par espace

def static_blocks(rad,dep,arr):
    """Airport-only ONLY/NOT conditions can safely constrain the graph upfront."""
    if not rad.book:return []
    active=[r for r in rad.book['sheets']['Annex 2B'] if rad.active(r) and r['v'][0]!='DEL']
    duplicates=collections.Counter(r['v'][3] for r in active);blocks=[]
    for r in active:
        v=r['v']
        if duplicates[v[3]]>1:continue
        plist=split_parts(v[8],v[9])      # SOG-0401 (forme A) : une partie par mode, un horaire par partie
        for util,clock in plist or []:
            if clock!='H24':continue
            m=re.fullmatch(r'(ONLY AVBL FOR TFC|NOT AVBL FOR TFC)\s+(.+)',util)
            if not m or re.search(r'\bVIA\b',m[2]):continue
            result=condition(m[2],dict(dep=dep,arr=arr,all=set()),rad)
            if result is None or not (result if m[1]=='NOT AVBL FOR TFC' else not result):continue
            base=dict(id=v[3],sheet='Annex 2B',row=r['row'])
            if v[7] and not any(v[i] for i in [4,5,6]) and re.fullmatch('[A-Z0-9]{2,8}',v[7]):blocks.append(dict(base,kind='point',point=v[7]))
            elif all(re.fullmatch('[A-Z0-9]{2,8}',v[i]) for i in [4,5,6]) and not v[7]:blocks.append(dict(base,kind='segment',via=v[4],start=v[5],end=v[6]))
    return blocks
