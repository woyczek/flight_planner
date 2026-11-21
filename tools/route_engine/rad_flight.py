"""Whole-flight RAD context and a deliberately explicit subset of rule grammar.
All coded SID/STAR points participate in VIA conditions. Unparsed conditions are
reported as reviews; they never become permissions or silently pass as valid.
"""
import collections,functools,math,re
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

AT_LIST=re.compile(r'\b(?:RFL\s+)?(ABV|BLW)\s+FL\s*(\d{2,3})\s+AT\s+\(\s*([A-Z][A-Z0-9]{1,6}(?:\s*,\s*[A-Z][A-Z0-9]{1,6})+)\s*\)')      # SOG-0501 (e) : « ABV FL245 AT (VTB, MORAL) » : le niveau du profil à L'UN des points de la liste

AT_RUN=re.compile(r'(?:RFL\s+)?(ABV|BLW)\s+FL\s*(\d{2,3})\s+AT\s+(\(.*\))')      # SOG-0532 lot 3a (forme L1) : « ABV FL245 AT (A UL607 B) », « BLW FL105 AT (A DCT B DCT C) » : le niveau du profil LE LONG d'une SUITE de points (la même suite qu'un groupe VIA) ; les listes de points « (A, B) » sont lues ci-dessus (AT_LIST)

AT_RUN_SEARCH=re.compile(r'\b(?:RFL\s+)?(?:ABV|BLW)\s+FL\s*\d{2,3}\s+AT\s+\((?:[^()]|\([^()]*\))*\)')      # la même chose, cherchée dans un texte (un niveau d'imbrication de parenthèses) : sert à retirer l'atome avant de contrôler qu'il ne reste aucun autre niveau non lu

BTN_ATOM=re.compile(r'\bBTN\s+FL\s*(\d{2,3})\s*-\s*FL\s*(\d{2,3})\s+AT\s+([A-Z][A-Z0-9]{1,6})\b')      # SOG-0501 (e) : « BTN FL245-FL660 AT BADRU » : le niveau du PROFIL au point est ENTRE les deux niveaux

def between_test(lo,hi,point,ctx):
    """Vrai / faux : le niveau du profil au point `point` est-il entre FL`lo` et FL`hi` ? Le point absent de la route : faux ; l'altitude inconnue ou EXACTEMENT sur une limite : None (jamais devinée)."""
    if 'points' not in ctx:return None      # SOG-0501 (e), revue de Sécurisation : le contexte STATIQUE (static_blocks : les deux terrains seuls) n'a pas de route : « le point n'est pas sur la route » n'y est pas FAUX, il n'est pas décidé
    if point not in ctx['points']:return False
    alt=(ctx.get('alt') or {}).get(point)
    if not isinstance(alt,(int,float)) or not math.isfinite(alt):return None
    a,b=int(lo)*100,int(hi)*100
    if a>=b or abs(alt-a)<1 or abs(alt-b)<1:return None
    return a<alt<b

def at_test(kind,level,point,ctx):
    """Vrai / faux / None : le niveau du profil au point `point` est-il au-dessus (ABV) ou au-dessous (BLW) de FL`level` ? Le point absent de la route : faux ; l'altitude du profil inconnue ou EXACTEMENT sur la limite : None."""
    if 'points' not in ctx:return None      # voir between_test : sans route, pas décidé
    if point not in ctx['points']:return False
    alt=(ctx.get('alt') or {}).get(point)
    if not isinstance(alt,(int,float)) or not math.isfinite(alt):return None
    x=int(level)*100
    return None if abs(alt-x)<1 else (alt>x if kind=='ABV' else alt<x)

def run_test(kind,level,group,ctx):
    """SOG-0532 lot 3a (forme L1, « ABV FL245 AT (A UL607 B) ») : vrai / faux / None. Faux quand la suite n'est pas volée (rad_via.runs : []). Sinon on regarde le niveau du PROFIL à CHAQUE point du passage : tous au-dessus de FL`level` (ABV) ou tous au-dessous (BLW) : vrai ; tous du côté contraire : faux ; un point sur la limite, une altitude inconnue ou le niveau qui traverse la limite le long du passage : None (la source ne dit pas si le niveau se lit au premier point, à l'un d'eux ou à tous : la conclusion n'est donnée que quand elle est la MÊME dans les trois lectures) ; plusieurs passages qui ne concluent pas pareil : None."""
    if 'points' not in ctx or 'legs' not in ctx:return None      # le contexte statique n'a pas de route
    found=rad_via.runs(group,ctx['legs'],aliases,ctx.get('known'))
    if found is None:return None
    if not found:return False
    alts=ctx.get('alt_nodes') or [];x=int(level)*100;out=[]
    for first,last in found:
        along=alts[first:last+1]
        if len(along)!=last-first+1 or any(not isinstance(a,(int,float)) or not math.isfinite(a) or abs(a-x)<1 for a in along):return None
        above=[a>x for a in along]
        if all(above):out.append(kind=='ABV')
        elif not any(above):out.append(kind=='BLW')
        else:return None
    return out[0] if all(o==out[0] for o in out) else None

def rfl_test(spec,fl):
    """Vrai / faux si le niveau demandé `fl` (un entier, FL) satisfait `spec` (le texte d'un atome RFL, sans « RFL ») ; None s'il n'est pas décidable : niveau inconnu, texte non lu, ou niveau EXACTEMENT sur une limite (la source ne dit pas si « ABV FL105 » inclut FL105 : jamais deviné)."""
    m=RFL_ATOM.fullmatch('RFL '+spec.strip())
    if not m or not isinstance(fl,int):return None
    if m[1]:
        x=int(m[2])
        return None if fl==x else (fl>x if m[1]=='ABV' else fl<x)
    lo,hi=int(m[3]),int(m[4])
    return None if fl in (lo,hi) or lo>hi else lo<fl<hi

MAX_THEN=8      # revue de Sécurisation : les termes d'un « AND-THEN » lus au plus
MAX_CONDITION=4000      # SOG-0401 (Sécurisation) : au-delà de ce nombre de signes une condition n'est pas décidée
PAIR=r'\d\d:\d\d\s*-\s*\d\d:\d\d'
PAIR_GROUPS=r'(\d\d):(\d\d)\s*-\s*(\d\d):(\d\d)'

MONTHS=('JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC')
AIRAC_PERIOD=re.compile(r'(?:FIRST\s+|LAST\s+)?AIRAC\s+([A-Z]{3})\s*-\s*(?:FIRST\s+|LAST\s+)?AIRAC\s+([A-Z]{3})\s+(.+)')      # SOG-0532 lot 3b (forme H2) : « AIRAC NOV - FIRST AIRAC MAR 05:00-17:00 », « LAST AIRAC MAR - AIRAC OCT H24 » : une PÉRIODE en cycles d'AIRAC, puis l'horaire
MAX_ITEMS=60      # SOG-0532 lot 3b : au plus ce nombre d'éléments dans une liste numérotée d'horaires

def numbered_items(clock):
    """SOG-0532 lot 3b (forme H6) : les éléments d'une liste NUMÉROTÉE d'horaires (« 1. H24 2. 04:00-22:00 », « 1. A. H24 1. B. 04:00-22:00 »), ou None quand l'horaire n'est pas une telle liste (ou qu'elle ne commence pas par un repère, ou compte plus de MAX_ITEMS éléments)."""
    text=' '.join(str(clock).split())
    marks=list(re.finditer(r'(?:^|\s)\d{1,2}\.\s+(?:[A-Z]\.\s+)?',text))
    if len(marks)<2 or marks[0].start()!=0 or len(marks)>MAX_ITEMS:return None
    ends=[m.start() for m in marks[1:]]+[len(text)]
    return [text[m.end():e].strip() for m,e in zip(marks,ends)]

def simple_ok(clock):
    """SOG-0401 (forme A) : un horaire que le contrôle sait lire : H24, « HH:MM-HH:MM » (UTC), ou « HH:MM-HH:MM (HH:MM-HH:MM) » (l'heure d'hiver, puis celle d'été entre parenthèses)."""
    return clock=='H24' or bool(re.fullmatch(PAIR,clock)) or bool(re.fullmatch(PAIR+r'\s*\('+PAIR+r'\)',clock))

def one_ok(clock):
    clock=' '.join(str(clock).split())
    period=AIRAC_PERIOD.fullmatch(clock)
    if period and period[1] in MONTHS and period[2] in MONTHS:return simple_ok(period[3].strip())      # SOG-0532 lot 3b (forme H2)
    return simple_ok(clock)

def clock_ok(clock):
    """Un horaire que le contrôle sait lire : un horaire simple (H24, une fenêtre UTC, une fenêtre d'hiver et d'été), précédé d'une période en cycles d'AIRAC (SOG-0532 lot 3b, H2), ou une liste NUMÉROTÉE de tels horaires (lot 3b, H6) dont CHAQUE élément se lit."""
    if len(str(clock))>MAX_CONDITION:return False      # SOG-0532 lot 3b : une cellule plus longue n'est pas lue (le classeur vient d'un fichier non fiable)
    items=numbered_items(clock)
    if items is not None:return all(x and numbered_items(x) is None and one_ok(x) for x in items)
    return one_ok(clock)

def summer_time(moment):
    """SOG-0532 lot 3a (forme H3) : True (heure d'été de l'Union européenne : du dernier dimanche de mars 01:00 UTC au dernier dimanche d'octobre 01:00 UTC), False (heure d'hiver) ou None (à moins de 24 h d'un changement d'heure, ou une date illisible : la saison n'est pas décidée)."""
    import datetime as dt
    if not isinstance(moment,dt.datetime):return None
    if moment.tzinfo is not None:moment=moment.astimezone(dt.timezone.utc).replace(tzinfo=None)
    def last_sunday(month):
        d=dt.date(moment.year,month,31)
        return dt.datetime.combine(d-dt.timedelta(days=(d.weekday()+1)%7),dt.time(1,0))
    begin,end=last_sunday(3),last_sunday(10)
    day=dt.timedelta(hours=24)
    if abs(moment-begin)<day or abs(moment-end)<day:return None
    return begin<moment<end

def one_hour_earlier(winter,summer):
    """SOG-0532 lot 3a (forme H3) : la fenêtre d'été entre parenthèses est-elle EXACTEMENT celle d'hiver avancée d'une heure UTC (le début ET la fin, minuit franchi compris) ? Seule cette forme (une règle écrite en heure locale : une heure plus tôt en UTC l'été) est lue : toute autre est un doute."""
    a=re.fullmatch(PAIR_GROUPS,winter);b=re.fullmatch(PAIR_GROUPS,summer)
    if not a or not b:return False
    w=[int(a[1])*60+int(a[2]),int(a[3])*60+int(a[4])];s=[int(b[1])*60+int(b[2]),int(b[3])*60+int(b[4])]
    return all((s[i]-w[i])%1440==1380 for i in (0,1))

def airac_state(first,second,moment):
    """SOG-0532 lot 3b (forme H2) : le mois de `moment` est-il DANS la période « AIRAC `first` - AIRAC `second` » (vrai), HORS d'elle (faux), ou à une frontière (None) ? Le classeur ne dit pas ce que « AIRAC NOV » désigne (le cycle qui commence en novembre, celui qui y est en vigueur…) ni si la période finit au début ou à la fin du dernier cycle : seuls sont décidés les mois qui sont dans la période QUELLE QUE SOIT la lecture (strictement entre les deux mois), et ceux qui en sont hors QUELLE QUE SOIT la lecture (à plus d'un mois après le mois de fin, à plus d'un mois avant le mois de début : un cycle dure 28 jours). Les mois de début, de fin, et les deux voisins : None."""
    import datetime as dt
    if not isinstance(moment,dt.datetime):return None
    a,b=MONTHS.index(first),MONTHS.index(second)
    span=(b-a)%12;pos=(moment.month-1-a)%12
    if span==0:return None
    if 1<=pos<=span-1:return True
    if span+2<=pos<=10:return False
    return None

def window_active(clock,start,end):
    """Vrai / faux si la règle est active pendant [start, end] ; None si l'horaire n'est pas lisible. Un horaire « hiver (été) » : si les deux écritures disent la même chose pour ce passage, c'est cela ; sinon (SOG-0532 lot 3a) la fenêtre d'ÉTÉ n'est lue que si elle est exactement la fenêtre d'hiver une heure plus tôt (UTC) ET que tout le passage est de la même saison, à plus de 24 h d'un changement d'heure ; dans tous les autres cas, None (la règle reste à examiner)."""
    m=re.fullmatch('('+PAIR+r')\s*\(('+PAIR+r')\)',clock)
    if m:
        a,b=active_during(m[1].replace(' ',''),start,end),active_during(m[2].replace(' ',''),start,end)
        if a==b:return a
        if not one_hour_earlier(m[1],m[2]):return None
        first,last=summer_time(start),summer_time(end)
        if first is None or first!=last:return None
        return b if first else a
    return active_during(clock.replace(' ',''),start,end) if simple_ok(clock) else None

def one_active(clock,start,end):
    clock=' '.join(str(clock).split())
    period=AIRAC_PERIOD.fullmatch(clock)
    if not (period and period[1] in MONTHS and period[2] in MONTHS):return window_active(clock,start,end)
    window=window_active(period[3].strip(),start,end)      # SOG-0532 lot 3b (forme H2) : la période ET l'horaire : faux si l'un des deux est faux, vrai si les deux sont vrais, sinon non décidé
    first,last=airac_state(period[1],period[2],start),airac_state(period[1],period[2],end)
    state=first if first==last else None      # un passage qui change de mois : non décidé (sauf si l'horaire dit faux)
    if window is False or state is False:return False
    return True if window is True and state is True else None

def clock_active(clock,start,end):
    """Vrai / faux si la règle est active pendant [start, end] ; None si l'horaire n'est pas lisible ou pas décidé. SOG-0532 lot 3b (forme H6) : une liste NUMÉROTÉE d'horaires (un par alternative de la condition ; le classeur ne dit pas lequel va avec quelle alternative) : décidée SEULEMENT si tous les éléments disent la même chose pour ce passage (le résultat ne dépend alors d'aucun appariement) ; sinon None."""
    if len(str(clock))>MAX_CONDITION:return None
    items=numbered_items(clock)
    if items is None:return one_active(clock,start,end)
    if any(not x or numbered_items(x) is not None for x in items):return None
    seen=[one_active(x,start,end) for x in items]
    return seen[0] if seen[0] is not None and all(x==seen[0] for x in seen) else None

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




# SOG-0532 lot 2 : « dire ce qui n'est pas vérifié, sans noyer » : par État, le COMPTE des règles du RAD (annexe 2B) dont la CIBLE est volée et que le contrôle n'a pas pu décider (avec, par règle, la référence et la raison en CODE), et le COMPTE de celles qui ne visent qu'un espace que la base ne connaît pas ; jamais celles où la route n'apparaît que dans une condition.
MAX_NV_STATES = 40
MAX_NV_ITEMS = 40
_SPACE = r'(?:[A-Z]{2,6}(?:FIR|UIR|CTA|UTA|FRA|ACC|SECT|TMA|CTR)[A-Z0-9]*|[A-Z]{3,6}(?:ZON|ZOC)[A-Z]?)'
_SPACE_RE = re.compile(r'\b' + _SPACE + r'\b')
_REASONS = (      # (code, cellule, motif) : la PREMIÈRE raison qui correspond est celle que la règle porte ; les autres suivent dans `reasons`
    ('zone_state', 9, re.compile(r'\b(?:NOT\s+ACT|ACT|NOT\s+AVBL|AVBL)\b')),
    ('schedule_airac', 9, re.compile(r'\bAIRAC\b')),
    ('schedule_dst', 9, re.compile(r'\(\s*\d\d:\d\d\s*-\s*\d\d:\d\d\s*\)')),
    ('schedule_days', 9, re.compile(r'\b(?:MON|TUE|WED|THU|FRI|SAT|SUN)\b')),
    ('schedule_season', 9, re.compile(r'\b(?:SUMMER|WINTER|HOL|SUMMERTIME|WINTERTIME)\b')),
    ('level_along_points', 8, re.compile(r'\b(?:ABV|BLW)\s+FL\d+\s+AT\s+\(')),
    ('aircraft', 8, re.compile(r'\b(?:ACFT|TYP|PBN|NAV)\b')),
    ('space_unread', 8, None),
)


_KEYWORD = re.compile(r'\b(?:ARR/DEP|DEP/ARR|DEP|ARR|VIA)\b')
_RFL_IN = re.compile(r'\bRFL\s+(?:ABV|BLW)\s+FL\d+\s+IN\b')


def _space_unread(text):
    """Un aérodrome ou un passage « dans » un espace : un mot-clé (DEP, ARR, VIA…) suivi, dans le MÊME segment (coupé sur « & » et le saut de ligne), d'un nom d'espace ; ou un niveau demandé « dans » un espace. UN parcours par segment (linéaire : le premier mot-clé, puis l'espace cherché après lui)."""
    for segment in re.split(r'[&\n]', text):
        keyword = _KEYWORD.search(segment)
        if keyword and _SPACE_RE.search(segment, keyword.end()):
            return True
    return bool(_RFL_IN.search(text))


def reasons_of(values):
    """Les raisons (codes) pour lesquelles une règle n'est pas décidée, d'après ses cellules « condition » et « horaire » : une liste, la première est la principale ; `unread` quand aucune forme connue n'est reconnue. Chaque cellule est COUPÉE à MAX_CONDITION signes avant tout motif (le classeur vient d'un fichier non fiable : le coût reste borné)."""
    out = []
    for code, column, rx in _REASONS:
        text = str(values[column] or '')[:MAX_CONDITION].upper() if len(values) > column else ''
        if (rx.search(text) if rx is not None else _space_unread(text)) and code not in out:
            out.append(code)
    clock = str(values[9] or '')[:MAX_CONDITION] if len(values) > 9 else ''
    if len([x for x in clock.split(LINE) if re.match(r'\s*\d+\.', x)]) > 1 and 'schedule_list' not in out:
        out.append('schedule_list')
    return out or ['unread']


LINE = chr(10)


def not_verified(rad, legs, dep, arr, candidates, known_ids=None, airway=None):
    """SOG-0532 lot 2 : [{ state, flown, spaces_only, items: [{ id, sheet, row, reason, reasons }] }], l'État qui a le plus de règles d'abord, au plus MAX_NV_STATES États et MAX_NV_ITEMS règles par État ; seules les règles de l'annexe 2B restées « à interpréter » comptent : `flown` = la cible est volée par cette route (ou le serait : le doute de sens), `spaces_only` = la cible est un espace que la base ne connaît pas (un compte, jamais une liste) ; une règle dont la route n'apparaît que dans une condition n'est pas comptée."""
    ctx = context(legs, dep, arr)
    ctx['airway'] = airway
    ctx['known'] = known_ids
    states = {}
    for rule in candidates:
        if rule.get('change') == 'DEL' or rule.get('sheet') != 'Annex 2B':
            continue
        assessment = str(rule.get('assessment') or '')
        if not assessment.startswith('À interpréter'):
            continue
        values = rule['values']
        state = (str(rule.get('id') or '')[:2] or str((values[14] if len(values) > 14 else '') or '')[:2]).upper()      # l'État de la règle : les deux premières lettres de sa référence (EBEG1004 : EB)
        entry = states.setdefault(state, dict(state=state, flown=0, spaces_only=0, items=[]))
        if 'ESPACE' in assessment:
            entry['spaces_only'] += 1
            continue
        applicability, flown_legs = target(rule, ctx, legs, rad)
        if applicability is True or applicability == UNSURE:
            entry['flown'] += 1
            if len(entry['items']) < MAX_NV_ITEMS:
                found = reasons_of(values)
                entry['items'].append(dict(id=rule.get('id'), sheet=rule.get('sheet'), row=rule.get('row'), reason=found[0], reasons=found, **({'target': leg_label(legs[flown_legs[0]])} if flown_legs else {})))      # SOG-0532 lot 2 bis : `target`, l'élément de la ROUTE visé par la règle (le premier tronçon touché ; absent si la règle n'a pas de tronçon)
    crossed = crossed_states(legs, dep, arr)
    out = [s for s in states.values() if s['flown'] or (s['spaces_only'] and s['state'] in crossed)]      # SOG-0537 (c) : seuls les États TRAVERSÉS (une règle dont la cible est volée en est la preuve ; sinon : le terrain de départ ou d'arrivée, une cellule FRA, la zone d'une voie) : plus de « LC, RE, LS, LF… » pour une route qui ne les traverse pas
    out.sort(key=lambda s: (-s['flown'], -s['spaces_only'], s['state']))
    return out[:MAX_NV_STATES]


ZONE_PREFIXES = {'de': ('ED', 'ET'), 'fr': ('LF',), 'gb': ('EG',), 'es': ('LE', 'GC'), 'pt': ('LP',), 'it': ('LI',), 'be': ('EB',), 'nl': ('EH',), 'lu': ('EL',), 'ch': ('LS',), 'at': ('LO',), 'cz': ('LK',), 'pl': ('EP',), 'sk': ('LZ',), 'hu': ('LH',), 'ro': ('LR',), 'bg': ('LB',), 'gr': ('LG',), 'tr': ('LT',), 'hr': ('LD',), 'si': ('LJ',), 'rs': ('LY',), 'me': ('LY',), 'ba': ('LQ',), 'mk': ('LW',), 'al': ('LA',), 'ie': ('EI',), 'dk': ('EK',), 'no': ('EN',), 'se': ('ES',), 'fi': ('EF',), 'is': ('BI',), 'ee': ('EE',), 'lv': ('EV',), 'lt': ('EY',), 'ua': ('UK',), 'by': ('UM',), 'md': ('LU',), 'mt': ('LM',), 'cy': ('LC',)}      # SOG-0537 : la zone de la base (le pays) -> les préfixes ICAO des États du RAD


def crossed_states(legs, dep, arr):
    """SOG-0537 (c) : les États (préfixes de deux lettres des références du RAD) que la route traverse, tels que la route les dit : le terrain de départ et celui d'arrivée, la cellule FRA d'un tronçon de route libre (« LFFRASW » : LF), la zone de la base d'où vient la voie d'un tronçon. Un ensemble ; jamais d'exception."""
    out = {str(x)[:2].upper() for x in (dep, arr) if x}
    for leg in legs or []:
        area = str(leg.get('fra_area') or '')
        if len(area) >= 2 and area[:2].isalpha():
            out.add(area[:2].upper())
        zone = leg.get('source_zone')
        if isinstance(zone, str):
            out.update(ZONE_PREFIXES.get(zone, ()))
    return out


def leg_label(leg):
    """SOG-0532 lot 2 bis : l'endroit de la route d'un tronçon, en une chaîne bornée : « UL607 KOK–BUPAL » (la voie, ses deux points), « KOK–BUPAL » pour un direct."""
    a = str((leg.get('start') or {}).get('id') or '')[:20]
    b = str((leg.get('end') or {}).get('id') or '')[:20]
    via = str(leg.get('via') or '')[:20]
    return f'{via} {a}–{b}' if via and via != 'DCT' else f'{a}–{b}'


@functools.lru_cache(maxsize=8192)      # SOG-0468 (5) : le calcul demande les noms d'une voie des centaines de milliers de fois (221 000 appels, 0,7 s sur trois vols) ; une fonction pure d'un texte : mémorisée, et rendue en ensemble NON modifiable (les appelants ne font que lire)
def aliases(text):
    text=re.sub('[^A-Z0-9]','',text.upper())
    return frozenset({text,re.sub(r'\d[A-Z]$','',text)}-{''})

def context(legs,dep,arr,natural=False):
    points={dep,arr};routes=set();phases=collections.Counter();sid=set();star=set()
    for l in legs:
        points.update([l['start']['id'],l['end']['id']]);routes.update(aliases(l['via']));phases[l['kind']]+=1
        if l['kind']=='SID':sid.update(aliases(l['via']))
        if l['kind'] in ['STAR','APPROACH_LINK']:star.update(aliases(l['via']))
    sids=[l for l in legs if l['kind']=='SID'];stars=[l for l in legs if l['kind'] in ['STAR','APPROACH_LINK']]
    if sids:sid.add(sids[-1]['end']['id'])
    if stars:star.add(stars[0]['start']['id'])
    alt={};alt_nodes=[]      # SOG-0401 : l'altitude que le PROFIL donne à chaque point de la route : le bout de chaque tronçon (le point où l'avion passe), le début du premier pour le départ ; SOG-0532 lot 3a : `alt_nodes`, la même chose DANS L'ORDRE du vol (un nœud par point, None si inconnue), pour lire un niveau le long d'une suite
    for n,l in enumerate(legs):
        start_ft,end_ft=(l.get('natural_start_ft'),l.get('natural_end_ft')) if natural and isinstance(l.get('natural_end_ft'),(int,float)) else (l.get('altitude_start_ft'),l.get('altitude_end_ft'))      # SOG-0513 (A) : `natural` : le profil du niveau DÉPOSÉ (celui que l'IFPS juge : une voie hors bande n'est pas « ramenée » à son plafond) quand la route ne porte aucun changement de niveau ; sinon le profil de la stratégie
        if n==0:alt_nodes.append(start_ft if isinstance(start_ft,(int,float)) else None)
        alt_nodes.append(end_ft if isinstance(end_ft,(int,float)) else None)
        if n==0 and isinstance(start_ft,(int,float)):alt[l['start']['id']]=start_ft
        if isinstance(end_ft,(int,float)):alt[l['end']['id']]=end_ft
    return dict(points=points,routes=routes,all=points|routes,dep=dep,arr=arr,sid=sid,star=star,phases=dict(phases),alt=alt,alt_nodes=alt_nodes,legs=legs)      # `legs` : la suite des tronçons, pour les groupes VIA qui se lisent dans l'ordre (rad_via)

def alternatives(text):
    """SOG-0401 (forme A) : les alternatives NUMÉROTÉES « 1. … 2. … » d'une condition (le RAD les lit comme un OU), ou None quand le texte n'est pas une liste numérotée simple : une seule alternative, ou une sous-liste « a. », « i) », une exception, un point-virgule : non décidé ici."""
    if not re.match(r'^1\.\s',text):return None
    pieces=re.split(r'\s*(?:^|(?<=\s))(\d{1,2})\.\s+',text)      # ['', '1', 'ARR (…)', '2', 'DEP (…)']
    nums=pieces[1::2];body=[x.strip() for x in pieces[2::2]]
    if not body or nums!=[str(i) for i in range(1,len(body)+1)] or any(not x for x in body):return None      # SOG-0501 (e) : une liste d'UN seul élément (« 1. DEP (EDMA, EDMO) ») est cet élément
    if any(x.startswith('EXC ') for x in body):return None      # SOG-0501 (e) : « 1. EXC … 2. EXC … » : le sens d'un OU d'exceptions n'est pas décidé
    if any(';' in x for x in body):return None      # SOG-0501 (e) : une alternative peut porter « EXC » et des sous-listes (lues par `condition`) ; le point-virgule reste non décidé
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
    """SOG-0401 / SOG-0501 (e) : le texte d'une condition RAD : des alternatives numérotées (OU), des exceptions « EXC » (avec des sous-listes « A. … B. … » ou « I) … II) … », elles-mêmes avec leurs exceptions), des suites « … AND-THEN … » lues dans l'ordre du vol, des conjonctions « & » d'atomes DEP / ARR / ARR/DEP / VIA / RFL / ABV / BLW / BTN. Vrai, faux, ou None (non décidé : jamais une règle devinée)."""
    if len(text)>MAX_CONDITION:return None      # SOG-0401 (Sécurisation) : un texte de cellule plus long est illisible, il n'est pas décidé (le coût de la lecture reste borné)
    text=' '.join(text.upper().split())
    if not text:return True
    if re.search(r'\b(?:BELOW|ABOVE|BLW|ABV|RFL|ACFT|PBN|EXCEPT|FL\d+)\b',BTN_ATOM.sub(' ',AT_RUN_SEARCH.sub(' ',AT_LIST.sub(' ',AT_ATOM.sub(' ',RFL_ATOM.sub(' ',text)))))):return None      # les atomes de niveau lus (ci-dessus) ne bloquent plus ; tout autre niveau reste non décidé
    numbered=alternatives(text)      # SOG-0401 (forme A) : « 1. ARR (LSGC, LSZH) 2. DEP (LSZA, LSZL) » : des alternatives (OU) numérotées
    if numbered:
        results=[condition(a,ctx,rad) for a in numbered]
        return True if any(r is True for r in results) else False if all(r is False for r in results) else None
    if text.startswith('ALL '):text=text[4:]
    return exception(text,ctx,rad)

ROMAN=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII']

def sublist(text):
    """SOG-0501 (e) : les éléments d'une sous-liste « A. … B. … » ou « I) … II) … » (le texte COMMENCE par le premier repère, les repères se suivent) ; None sinon."""
    for first,marker,names_ in (('A.',r'(?:^|(?<=\s))([A-Z])\.\s+',[chr(65+i) for i in range(26)]),('I)',r'(?:^|(?<=\s))([IVX]{1,4})\)\s+',ROMAN)):
        if not text.startswith(first+' '):continue
        pieces=re.split(marker,text)
        found=pieces[1::2];body=[x.strip() for x in pieces[2::2]]
        if pieces[0].strip() or len(body)<2 or found!=names_[:len(body)] or any(not x for x in body):return None
        return body
    return None

def exception(text,ctx,rad):
    """« principal EXC exceptions » : vrai si le principal est vrai et qu'aucune exception ne l'est ; un principal vide (« EXC VIA LC ») est toujours vrai ; une sous-liste d'exceptions est un OU. Faux dès que le principal est faux ou qu'une exception est vraie, même si le reste n'est pas décidé."""
    m=re.search(r'(?:^|\s)EXC\s+',text)
    if not m:return sequence(text,ctx,rad)
    head,tail=text[:m.start()].strip(),text[m.end():].strip()
    main=True if not head else sequence(head,ctx,rad)
    if main is False:return False
    items=sublist(tail)
    if items:
        results=[exception(x,ctx,rad) for x in items]
        exc=True if any(r is True for r in results) else False if all(r is False for r in results) else None
    elif re.search(r'(?:^|\s)EXC\s',tail):return None
    else:exc=sequence(tail,ctx,rad)
    if exc is True:return False
    return None if main is None or exc is None else main and not exc

def sequence(text,ctx,rad):
    """« X AND-THEN Y » : X, puis Y plus loin sur la route. Vrai si tous les termes sont vrais ET dans l'ordre du vol ; faux si l'un est faux, ou si tous sont vrais mais dans un autre ordre ; None si l'ordre ne se lit pas."""
    terms=[x.strip() for x in re.split(r'\s+AND-THEN\s+',text)]
    if len(terms)==1:return conjunction(text,ctx,rad)
    if len(terms)>MAX_THEN or any(not x for x in terms):return None      # revue de Sécurisation : au plus MAX_THEN termes (le coût d'une règle reste borné)
    results=[conjunction(x,ctx,rad) for x in terms]
    if any(r is False for r in results):return False
    if any(r is None for r in results):return None
    found=[places(x,ctx) for x in terms]
    if any(f is None for f in found):return None
    here=-2
    for f in found:
        later=[p for p in f if p>=here]
        if not later:return False
        here=min(later)
    return True

def places(term,ctx):
    """Où le terme est sur la route (une liste de positions : n pour le point n, n+0,5 pour le tronçon n) ; None quand le terme n'est pas un seul VIA de noms, ni DEP, ni ARR (l'ordre n'est alors pas connu)."""
    if '_flight' not in ctx:ctx['_flight']=rad_via._flight(ctx.get('legs'))      # les nœuds et les voies du vol, faits UNE fois par contexte (et non pour chaque terme de chaque règle)
    flight=ctx['_flight']
    if not flight:return None
    nodes,edges=flight
    atoms=[x.strip() for x in term.split('&')]
    via=[x for x in atoms if x.startswith('VIA ')]
    if len(via)==1:
        spec=via[0][4:].strip()
        if rad_via.read(spec) is not None:return None      # une suite « (A DCT B) » : la position de son début n'est pas calculée ici
        tokens=names(spec)
        return sorted([i for i,n in enumerate(nodes) if n in tokens]+[j+.5 for j,e in enumerate(edges) if aliases(e)&tokens])
    if via:return None
    if len(atoms)==1 and atoms[0].startswith('DEP '):return [-1]
    if len(atoms)==1 and atoms[0].startswith('ARR '):return [len(nodes)+1]
    return None

def conjunction(value,ctx,rad):
    matches=list(re.finditer(r'(ARR/DEP|DEP/ARR|DEP|ARR|VIA|RFL|ABV|BLW|BTN)\s+([A-Z0-9_*(), /-]+?)(?=\s*(?:&|\bAND\b|$))',value))
    if not matches:return None
    residue=value
    tests=[]
    for m in reversed(matches):residue=residue[:m.start()]+residue[m.end():]
    if re.sub(r'\bAND\b|[&\s]','',residue):return None
    for m in matches:
        spec=m[2]
        if m[1]=='BTN':      # SOG-0501 (e) : « BTN FL245-FL660 AT point » : le niveau du PROFIL au point, entre deux niveaux
            a=BTN_ATOM.fullmatch('BTN '+spec.strip())
            if not a:return None
            t=between_test(a[1],a[2],a[3],ctx)
            if t is None:return None
            tests.append(t);continue
        if m[1] in ('ABV','BLW') or (m[1]=='RFL' and re.search(r'\bAT\b',spec)):      # SOG-0401 : « ABV FLnnn AT point » : le niveau du PROFIL au point
            a=AT_ATOM.fullmatch(((m[1]+' ') if m[1]!='RFL' else 'RFL ')+spec.strip()) if m[1]!='RFL' else AT_ATOM.fullmatch('RFL '+spec.strip())
            if not a:
                text=((m[1]+' ') if m[1]!='RFL' else 'RFL ')+spec.strip()
                lst=AT_LIST.fullmatch(text)      # SOG-0501 (e) : une LISTE de points : vrai à l'un d'eux, faux à aucun, sinon non décidé
                if lst:
                    each=[at_test(lst[1],lst[2],x.strip(),ctx) for x in lst[3].split(',')]
                    t=True if any(r is True for r in each) else False if all(r is False for r in each) else None
                else:
                    run=AT_RUN.fullmatch(text)      # SOG-0532 lot 3a (forme L1) : le niveau LE LONG d'une suite « (A UL607 B) »
                    if not run:return None
                    t=run_test(run[1],run[2],run[3],ctx)
            else:t=at_test(a[1],a[2],a[3],ctx)
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
        if m[1] in ['DEP','ARR','ARR/DEP','DEP/ARR']:
            if any(not (re.fullmatch('[A-Z0-9_*]{4}',t) or t in rad.groups) for t in names(spec)):return None
            tests.append(any(rad.match(spec,ctx[end]) for end in (['dep','arr'] if '/' in m[1] else [m[1].lower()])))      # SOG-0501 (e) : « ARR/DEP X » : X est le départ OU l'arrivée
        else:
            tokens=names(spec)
            if any('_' in t or '*' in t for t in tokens):return None
            if len(tokens)>1 and ',' not in spec:return None
            if ctx.get('known') is not None and not tokens<=ctx['known']:return None
            tests.append(bool(tokens & ctx['all']))
    return all(tests)

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
            cited=[(role,code) for role,code in (('dep',ctx.get('dep')),('arr',ctx.get('arr'))) if code and re.search(r'\b'+re.escape(str(code))+r'\b',' '.join(str(x) for x in v))]
            if cited:ctx.setdefault('unknown_ad',set()).add(rule['id'])      # SOG-0501 (c) : la règle NOMME le terrain de départ ou d'arrivée du vol : dite en premier
            for role,code in cited:ctx.setdefault('unknown_by_terrain',{}).setdefault((role,str(code)),set()).add(rule['id'])      # SOG-0539 : et PAR TERRAIN (départ, arrivée)
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

def evaluate(rad,legs,dep,arr,when,candidates,known_ids=None,fl=None,airway=None,natural=False):
    ctx=context(legs,dep,arr,natural);findings=[];avoids=[];decided=0
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
        focus=None      # SOG-0532 lot 2 bis : l'élément de la route qui a déclenché la règle quand elle n'a aucun tronçon : le point de sa condition (« obligatoire pour le trafic par Y » : Y)
        if mode=='COMPULSORY FOR TFC' and not affected and sheet=='Annex 2B':      # SOG-0354 L5 (4) défaut 4 : « X obligatoire pour le trafic par Y » et X absent de la route : le constat n'a aucun tronçon ; il se corrige D'ABORD en passant par X à côté de Y (`compel`), Y n'est écarté (`fallback`) que si cette reprise échoue (plan.plan)
            via=re.fullmatch(r'VIA\s+([A-Z0-9_*(), /-]+)',m[2] or '')
            for point in sorted(names(via[1])) if via else []:
                if re.fullmatch('[A-Z0-9]{2,8}',point) and point in ctx['points']:
                    focus=focus or point
                    if re.fullmatch('[A-Z0-9]{2,8}',v[7] or ''):avoids.append(dict(kind='compel',point=v[7],before=point,id=rule['id'],sheet=sheet,row=rule['row']))
                    avoids.append(dict(kind='point',point=point,fallback=True,id=rule['id'],sheet=sheet,row=rule['row']))
        findings.append(dict(id=rule['id'],sheet=sheet,row=rule['row'],segments=affected,phases=phases,target=(leg_label(legs[affected[0]]) if affected else focus),text=f"RAD {rule['id']} ({sheet}, ligne {rule['row']}) : {mode} ; contexte départ–SID–route–STAR–arrivée pris en compte."))
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
        terrain_rules=[dict(role=role,ad=code,rules=sorted(ids)) for (role,code),ids in sorted((ctx.get('unknown_by_terrain') or {}).items(),key=lambda x:(x[0][0]!='dep',x[0][1]))],      # SOG-0539 : les règles dont la cible est un espace inconnu ET qui nomment le terrain du vol, rangées PAR TERRAIN (départ puis arrivée), triées ; ni verdict ni compte ne changent
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
