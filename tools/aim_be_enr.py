"""L'AIP de Belgique et du Luxembourg (AIM Belgium, publié par l'EAD) : les pages de l'ENR 3 déposées à la main en PDF, leur reconnaissance et leur lecture (SOG-0541, 22 nov. 2026). Bibliothèque standard seulement.

Les faits (relus dans les trois PDF déposés par l'utilisateur, jamais recopiés ici) : un PDF par partie, nommé par l'EAD (« EB_ENR_3_2_en.pdf »), MAIS le nom n'est JAMAIS pris : une page se reconnaît par le TITRE écrit dedans (« ENR 3.2 Area Navigation Routes », « ENR 3.3 Other Routes »,
« ENR 3.4 En-route Holding ») et par son en-tête de page (« ENR 3.2-2 AIP Belgium and Luxembourg »). L'AIP belge n'a PAS de cycle au document : chaque PAGE porte à son pied l'amendement qui l'a modifiée (« AIRAC AMDT 002/2026 » ou « AMDT 007/2023 », puis la date « 19-FEB-2026 »), et une page
inchangée garde sa vieille date tout en restant en vigueur. Ce que le lecteur rend est donc l'amendement le plus récent lu, pas un cycle.
Seule la partie 3.2 (« RNAV ROUTES ») donne des routes ; les parties 3.3 (routes directes, routes militaires) et 3.4 (attentes en route) sont reconnues puis laissées de côté, sans rien écrire.
Une route de l'ENR 3.2 = un désignateur seul sur une ligne (« L179 »), puis la spécification de navigation (« {RNAV 5} »), les disponibilités numérotées (« (1) H24 », « (2) CDR1 H24 »), puis UN point par ligne (« R SASKI 513253N 0023000E (9) » ; un point-balise s'écrit « Costa DVOR/DME (COA) … » :
son identifiant est le code entre parenthèses) ; ENTRE deux points, la ligne du tronçon qui les joint (« 109° / 289° 10NM FL660 FL 055 ForwardsOdd(1) BackwardsEven (1) … » : relèvements aller / retour, distance, limite haute puis basse, sens des niveaux, renvois). Deux points SANS ligne de tronçon entre eux ne sont pas joints :
la liaison est publiée par l'AIP voisin (« For continuation see AIP … »). Un nom de point peut passer sur plusieurs lignes, les coordonnées sur la suivante. Le degré s'écrit « � » dans le texte extrait : jamais lu comme un signe.
Entrée non fiable (le PDF vient de l'utilisateur, le texte du sous-processus borné de tools/pdf_guard.py) : tout est borné, tout refus dit sa raison EN CLAIR (Refusal.reason, liste fermée), rien n'est exécuté, aucun nom de fichier ni chemin n'est pris d'un texte."""
import datetime
import json
import math
import re

import aero_cycles
import eaip_annexe15 as core

PARTS = {'3.2': 'Area Navigation Routes', '3.3': 'Other Routes', '3.4': 'En-route Holding'}      # les titres connus ; la 3.2 seule est lue. L'ENR 3.1 (« NIL » : page blanche, vue par l'utilisateur le 22 nov. 2026) est reconnue par son numéro seul
SOURCE = 'AIM Belgium (EAD) AIP Belgium and Luxembourg, ENR 3.2'
MAX_PAGES = 200            # l'ENR 3.2 fait 34 pages
MAX_NM = 2000             # une distance publiée au-delà (ou nulle, ou infinie : 300 chiffres) n'est pas un tronçon : refusé, compté (revue de Sécurisation, 22 nov. 2026)
MAX_AHEAD_DAYS = 56        # un jeu dont la date d'amendement la plus récente dépasse le jour du dépôt de plus de deux cycles n'est pas pris (décision de l'ergonome, 22 nov. 2026) : traité comme une date illisible
KEEP_SETS = 2              # jeux gardés au plus dans la zone : celui en vigueur et celui publié à l'avance
FILE = re.compile(r'aimbe_be_enr_(\d{8})_(\d{8})\.geojson\Z', re.A)      # « aimbe_be_enr_<date d'amendement>_<jour du dépôt>.geojson » : la date du cycle (tools/aero_cycles.py) est celle du plus tardif des deux
MAX_LINE = 400
NAME = 'aimbe_be_enr'
REASONS = ('not-enr', 'not-routes', 'no-amendment', 'too-many-pages', 'no-routes', 'too-many-objects', 'bad-values')      # la liste FERMÉE des raisons d'un refus
_TITLE = re.compile(r'ENR (3\.\d) ([A-Za-z -]{3,40})')
_HEAD = re.compile(r'(?:AIP Belgium and Luxembourg )?ENR (3\.\d)-(\d{1,3})(?: AIP Belgium and Luxembourg)?')
_AMDT = re.compile(r'(AIRAC )?AMDT (\d{3})/(20\d\d)')
_DAY = re.compile(r'(\d{2})-([A-Z]{3})-(20\d\d)')
_DESIGNATOR = re.compile(r'[A-Z]{1,2}\d{1,4}[A-Z]?')
_COORD = re.compile(r'(\d{6}(?:\.\d+)?[NS])\s*(\d{7}(?:\.\d+)?[EW])')
_SEGMENT = re.compile(r'(\d{3})\D{0,3}/\s*(\d{3})\D{0,3}\s+(\d+(?:\.\d+)?)\s*NM\s+(.*)')
_LIMIT = re.compile(r'FL ?\d{2,3}|\d{3,5} ?FT(?: ?(?:AMSL|AGL))?|GND|SFC|UNL')
_AVAIL = re.compile(r'\((\d{1,2})\) (.{1,80})')
_BEACON = re.compile(r'(.*?)\(([A-Z]{2,4})\)\s*')
_FIX = re.compile(r'[A-Z]{3,5}\d{0,3}')
_REF = re.compile(r'\((\d{1,2})\)')
_SKIP = re.compile(r'(?:Route designator|\{RNP|Significant\b|point name|coordinates|MAG\b|Geodesic|DIST\b|Upper limit|lower limit|FL series|\{Airspace|Remarks\b|F  ?B\b|FB F B|F B\b|AIP Belgium|ENR 3\.\d-|\W+AIM BELGIUM|AIRAC AMDT|AMDT \d|\d\d-[A-Z]{3}-\d{4}|Initial track|Controlling unit|Control units?:|Point remarks:|THIS PAGE)')
_REMARKS = re.compile(r'(?:Route remarks|Segment remarks|Point remarks):?', re.I)


class Refusal(ValueError):
    """Un refus de la liste fermée REASONS, avec sa phrase en clair."""

    def __init__(self, reason, message):
        super().__init__(message)
        self.reason, self.message = reason, message


def _lines(text):
    return [s for s in (ln.strip()[:MAX_LINE] for ln in str(text or '').splitlines()) if s]


# ----------------------------------------------------------------------------------------------------------------------- la reconnaissance : le titre ÉCRIT dans le PDF, jamais le nom du fichier
def identify(texts):
    """{ part: '3.2' | '3.3' | '3.4', title, pages, amendments: [{ page, amdt ('002/2026'), airac (bool), date (AAAA-MM-JJ) }], latest: { amdt, date } } d'après le TEXTE des pages (liste de textes, un par page).
    Une partie 3.1, 3.3 ou 3.4 est reconnue et rendue sans amendement (elle ne sert pas aux routes). Refusal : not-enr (le titre de la première page n'est pas celui d'une partie de l'ENR 3, ou une page de l'ENR 3.2 porte l'en-tête d'une AUTRE partie), no-amendment (une page sans amendement lisible : numéro ET date), too-many-pages."""
    if not isinstance(texts, (list, tuple)) or not texts:
        raise Refusal('not-enr', 'aucune page lisible')
    if len(texts) > MAX_PAGES:
        raise Refusal('too-many-pages', f'plus de {MAX_PAGES} pages : ce n’est pas une partie de l’ENR 3')
    part = title = None
    for ln in _lines(texts[0])[:10]:
        m = _TITLE.fullmatch(ln)
        if m and m.group(1) in ('3.1', '3.2', '3.3', '3.4') and (m.group(1) == '3.1' or PARTS.get(m.group(1)) == m.group(2).strip()):
            part, title = m.group(1), m.group(2).strip()
            break
    if not part:
        raise Refusal('not-enr', 'le titre écrit dans le document n’est pas celui d’une partie de l’ENR 3 (« ENR 3.2 Area Navigation Routes » …)')
    if part != '3.2':      # reconnue, laissée de côté : ni lue, ni gardée
        return {'part': part, 'title': title, 'pages': len(texts), 'amendments': [], 'latest': None}
    amendments = []
    for i, text in enumerate(texts, 1):
        lines = _lines(text)
        head = next((m for m in (_HEAD.fullmatch(ln) for ln in lines[:3]) if m), None)
        if not head or head.group(1) != part:
            raise Refusal('not-enr', f'la page {i} ne porte pas l’en-tête « ENR {part}-n AIP Belgium and Luxembourg »')
        found = None
        for j, ln in enumerate(lines[-6:]):
            m = _AMDT.fullmatch(ln)
            if not m:
                continue
            for other in lines[-6:]:
                d = _DAY.fullmatch(other)
                iso = core.date_of(d.group(1), d.group(2), d.group(3)) if d else None
                if iso:
                    found = {'page': i, 'amdt': f'{m.group(2)}/{m.group(3)}', 'airac': bool(m.group(1)), 'date': iso}
                    break
            if found:
                break
        if not found:
            raise Refusal('no-amendment', f'la page {i} ne porte pas de numéro d’amendement avec sa date (« AIRAC AMDT 002/2026 », « 19-FEB-2026 ») : le jeu n’est pas pris')
        amendments.append(found)
    latest = max(amendments, key=lambda a: (a['date'], a['amdt']))
    return {'part': part, 'title': title, 'pages': len(texts), 'amendments': amendments, 'latest': {'amdt': latest['amdt'], 'date': latest['date']}}


# ----------------------------------------------------------------------------------------------------------------------- la lecture de l'ENR 3.2
def _point_id(name):
    """L'identifiant d'un point d'après son nom écrit : le code entre parenthèses d'un point-balise (« Costa DVOR/DME (COA) » → COA), sinon le premier mot d'un point nommé en majuscules (« SASKI », « SORAT Brussels FIR / Amsterdam FIR » → SORAT) ; None sinon."""
    name = re.sub(r'\s+', ' ', name).strip(' -')
    m = _BEACON.match(name)
    if m and not m.group(1).strip().isupper():
        return m.group(2)
    word = name.split(' ')[0] if name else ''
    return word if _FIX.fullmatch(word) else None


def _nm(a, b):
    """La distance (NM) sur le grand cercle entre deux points {lat, lon}."""
    p1, p2 = math.radians(a['lat']), math.radians(b['lat'])
    q = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(b['lon'] - a['lon']) / 2) ** 2
    return 2 * 3440.065 * math.asin(min(1, math.sqrt(q)))


def parse_routes(texts):
    """([points], [tronçons], stats) de l'ENR 3.2 : un point = { id, lat, lon, remarks } ; un tronçon = { route, a, b, lower, upper (pieds), nm (la distance PUBLIÉE), trk (le relèvement aller), avail ([texte de disponibilité]) }. `stats` : { routes, skipped_points (sans identifiant lisible),
    unjoined (deux points consécutifs sans ligne de tronçon : non joints) }. Les lignes qui ne sont ni un en-tête de page, ni un point, ni un tronçon, ni la liste d'une route sont ignorées : aucune n'est exécutée."""
    points, segments, known = [], [], {}
    stats = {'routes': 0, 'skipped_points': 0, 'unjoined': 0, 'bad_segments': 0}
    route, avail, pending, prev, seg, remarks = None, {}, [], None, None, False
    names = []
    lines = [ln for text in texts for ln in _lines(text)]
    for i, ln in enumerate(lines):
        if _DESIGNATOR.fullmatch(ln) and any(x.startswith('{') for x in lines[i + 1:i + 3]):      # un désignateur est suivi de sa spécification de navigation « {RNAV 5} » : un mot de nom de point qui lui ressemble n'est pas pris
            if route != ln:
                names.append(ln)
                prev = None
            route, avail, pending, seg, remarks = ln, {}, [], None, False      # le même désignateur sur la page suivante reprend la même route
            continue
        if route is None or _SKIP.match(ln) and not _REMARKS.match(ln):
            continue
        if _REMARKS.match(ln):
            remarks, pending, seg = True, [], None
            continue
        if remarks:
            continue
        m = _AVAIL.fullmatch(ln)
        if m and prev is None and not _COORD.search(ln):
            avail[m.group(1)] = m.group(2).strip()
            continue
        s = _SEGMENT.fullmatch(ln)
        if s:
            nm = float(s.group(3))      # le texte vient d'un PDF de l'utilisateur : 300 chiffres donnent l'infini, sans exception : borné AVANT d'entrer dans le jeu
            if not 0 < nm <= MAX_NM:
                stats['bad_segments'] += 1
                pending = []
                continue
            if prev is not None:
                limits = [(core.level_ft(x) if x else None) for x in _LIMIT.findall(s.group(4))[:2]]
                refs = re.search(r'Forwards\w*\s*((?:\(\d+\)\s*)*)', s.group(4))
                back = re.search(r'Backwards\w*\s*((?:\(\d+\)\s*)*)', s.group(4))
                texts_ = sorted({avail[r] for r in _REF.findall((refs.group(1) if refs else '') + ' ' + (back.group(1) if back else '')) if r in avail})
                seg = {'route': route, 'nm': nm, 'trk': int(s.group(1)) % 360, 'upper': limits[0] if len(limits) > 0 else None, 'lower': limits[1] if len(limits) > 1 else None, 'avail': texts_}
            pending = []
            continue
        c = _COORD.search(ln)
        if c:
            name = ' '.join(pending + [ln[:c.start()]]).strip()
            pid = _point_id(re.sub(r'^R\s+', '', name))
            lat, lon = core.dms(c.group(1)), core.dms(c.group(2))
            pending = []
            if pid is None or lat is None or lon is None:
                stats['skipped_points'] += 1
                prev, seg = None, None
                continue
            here = {'id': pid, 'lat': lat, 'lon': lon, 'remarks': ''}
            if pid not in known:
                known[pid] = here
                points.append(here)
            if prev is not None and prev['id'] != pid:
                if seg:
                    segments.append(dict(seg, a=prev, b=here))
                else:
                    stats['unjoined'] += 1
            prev, seg = here, None
            continue
        if ln[0] in '{(' or re.search(r'H24|CDR|\. ', ln) or len(ln) > 80:      # la spécification, une disponibilité ou une remarque : jamais le début d'un nom de point
            pending = []
        else:
            pending = (pending + [ln])[-4:]       # le début d'un nom de point qui passe sur plusieurs lignes
    stats['routes'] = len(set(names))
    return points, segments, stats


def convert(texts, deposit):
    """(GeoJSON, nombre de points, nombre de tronçons, identité, (date d'amendement, jour du dépôt)) d'un PDF de l'ENR 3.2 déposé le jour `deposit` ; Refusal : not-routes (l'ENR 3.1, 3.3, 3.4 ne sert pas aux routes), no-amendment, no-routes, too-many-objects."""
    info = identify(texts)
    if info['part'] != '3.2':
        raise Refusal('not-routes', f'ENR {info["part"]} : cette page ne sert pas au calcul des routes (rien n’est lu, rien n’est gardé)')
    eff, dep = dated(info, deposit)
    points, segments, stats = parse_routes(texts)
    if not segments:
        raise Refusal('no-routes', 'aucun tronçon de route lu dans ces pages')
    if len(points) > core.MAX_POINTS or len(segments) > core.MAX_SEGMENTS:
        raise Refusal('too-many-objects', 'trop d’objets : ce ne sont pas les pages attendues')
    g = core.to_geojson(NAME, SOURCE, points, segments, eff.isoformat(), extra=('nm', 'trk', 'avail'))
    g['amendment'] = dict(info['latest'], pages=info['pages'])
    g['deposited'] = dep.isoformat()
    g['skipped'] = {'points_without_id': stats['skipped_points'], 'unjoined': stats['unjoined'], 'bad_segments': stats['bad_segments']}
    try:
        json.dumps(g, allow_nan=False)      # aucune valeur non finie dans le dérivé (que safe_json refuserait ensuite : la zone ne se lirait plus)
    except ValueError:
        raise Refusal('bad-values', 'une valeur lue n’est pas un nombre fini : le jeu n’est pas pris') from None
    g['routes'] = stats['routes']
    return g, len(points), len(segments), info, (eff, dep)


# ----------------------------------------------------------------------------------------------------------------------- la date du jeu, son cycle, quand il est périmé
def _day(value):
    return value if isinstance(value, datetime.date) else datetime.date.fromisoformat(str(value))


def dated(info, deposit):
    """(date d'amendement la plus récente, jour du dépôt) d'un jeu lu par `identify`, en dates ; Refusal no-amendment si la date dépasse le dépôt de plus de MAX_AHEAD_DAYS (traitée comme illisible : une date de plusieurs cycles à l'avance n'est pas une édition)."""
    eff, dep = _day(info['latest']['date']), _day(deposit)
    if (eff - dep).days > MAX_AHEAD_DAYS:
        raise Refusal('no-amendment', f'la date d’amendement la plus récente ({eff.isoformat()}) dépasse le jour du dépôt de plus de {MAX_AHEAD_DAYS} jours : le jeu n’est pas pris')
    return eff, dep


def status(effective, deposit, today=None):
    """L'état d'un jeu à `today` (le jour du poste ; le moteur, lui, compare à la date du VOL) : { effective, deposited, cycle (le cycle AIRAC du plus tardif de l'amendement et du dépôt), state ('future' : pas encore en vigueur, 'current', 'expired'),
    expires (AAAA-MM-JJ : le début du cycle SUIVANT, à partir duquel il est périmé) }. Un jeu non modifié déposé de nouveau repart d'un nouveau cycle : le dépôt compte."""
    eff, dep, today = _day(effective), _day(deposit), _day(today or datetime.date.today())
    cycle = aero_cycles.airac_start(max(eff, dep))
    expires = (datetime.date.fromisoformat(cycle) + datetime.timedelta(days=28)).isoformat()
    state = 'future' if eff > today else 'expired' if today.isoformat() >= expires else 'current'
    return {'effective': eff.isoformat(), 'deposited': dep.isoformat(), 'cycle': cycle, 'state': state, 'expires': expires}


def sets_of(rels, today=None):
    """Les jeux de la zone d'après les NOMS de ses fichiers (chemins relatifs de data/sia/, « zones/be/aimbe_be_enr_<amendement>_<dépôt>.geojson ») : { inForce: état du jeu en vigueur ou None (le plus récent dont la date d'amendement n'est pas après `today`),
    next: état du jeu publié à l'avance ou None (le plus proche) }, chaque état = `status()` + `name`. Un nom qui n'est pas de la règle, ou une date impossible, est ignoré."""
    found = []
    for rel in rels:
        path = str(rel).replace(chr(92), '/')
        m = FILE.fullmatch(path.rsplit('/', 1)[-1]) if path.startswith('zones/be/') else None
        if not m:
            continue
        if not all(2000 <= int(x[:4]) <= 2100 for x in m.groups()):      # le nom vient d'un dossier que tout pilote du dépôt peut remplir : une année hors de 2000-2100 n'est pas un jeu (9999 ferait déborder le calcul du cycle suivant)
            continue
        try:
            found.append(dict(status(f'{m.group(1)[:4]}-{m.group(1)[4:6]}-{m.group(1)[6:]}', f'{m.group(2)[:4]}-{m.group(2)[4:6]}-{m.group(2)[6:]}', today), name=str(rel)))
        except (ValueError, OverflowError):
            continue
    now = [s for s in found if s['state'] != 'future']
    later = [s for s in found if s['state'] == 'future']
    return {'inForce': max(now, key=lambda s: (s['effective'], s['deposited'])) if now else None, 'next': min(later, key=lambda s: (s['effective'], s['deposited'])) if later else None}


def deposited_of(names, cycle):
    """Le jour du DÉPÔT (AAAA-MM-JJ) du jeu compilé dans le cycle `cycle` (début AIRAC AAAA-MM-JJ), d'après les NOMS de fichiers de la zone (« aimbe_be_enr_<amendement>_<dépôt>.geojson », jamais leur contenu) ; le plus récent si plusieurs ; None s'il n'y en a plus."""
    best = None
    for name in names:
        m = FILE.fullmatch(str(name))
        if not m or not all(2000 <= int(x[:4]) <= 2100 for x in m.groups()):
            continue
        try:
            st = status(f'{m.group(1)[:4]}-{m.group(1)[4:6]}-{m.group(1)[6:]}', f'{m.group(2)[:4]}-{m.group(2)[4:6]}-{m.group(2)[6:]}')
        except (ValueError, OverflowError):
            continue
        if st['cycle'] == cycle and (best is None or st['deposited'] > best):
            best = st['deposited']
    return best


def file_name(effective, deposit):
    return f'aimbe_be_enr_{_day(effective).strftime("%Y%m%d")}_{_day(deposit).strftime("%Y%m%d")}.geojson'
