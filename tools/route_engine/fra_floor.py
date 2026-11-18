"""SOG-0401 (planchers de route libre) : les voies d'un espace de ROUTE LIBRE au-dessus de son plancher, lues dans le classeur RAD déjà déposé sur le poste (annexe 3B, feuille « FRA LIM »).

Eurocontrol répond PROF407 à un tronçon de voie qui traverse un espace de route libre : la voie n'existe pas dans cette tranche de niveaux. Le RAD donne le plancher de chaque espace (« LIMMACC ABV FL195, DCT limit FRA » : la route libre
commence à FL195). Ce module lit ce plancher POUR UN PAYS (la Suisse `ch`, l'Italie `it`) quand il est sans ambiguïté, et dit les tronçons de voie de ce pays que le PROFIL du vol met AU-DESSUS (montée, croisière ou descente : l'altitude
que le profil donne au tronçon, jamais le niveau déposé partout).

Ce qu'il lit : les lignes de la feuille dont l'espace commence par les deux lettres du pays (LI, LS) et dont la limite horizontale des directs est « FRA » (route libre) ; le plancher est la limite basse de leur tranche (« ABV FL195 », « BTN FL195-FL245 », « above FL195 »),
à toute heure (H24), une tranche par segment « ---------- » de la cellule. Un plancher n'est pris que s'il est PLAUSIBLE (de FL100 à FL500) et que le texte de la cellule est borné (4 000 signes) : sinon, comme si les lignes du pays ne s'accordaient pas, AUCUN plancher
(le pays reste « à examiner », jamais un refus inventé). Si les lignes du pays ne donnent pas toutes le même plancher, ou si une cellule n'est pas lisible : aucun plancher non plus.
Ce qu'il NE lit PAS : l'Allemagne (trois tranches : EDUUFRAW au-dessus de FL245, EDUUFRAN FL285, EDUUFRAE FL315, sans contour pour dire laquelle), la France, l'Espagne (FRA par sous-espace) : dits « non appliqués ».
Ce que la recherche en fait : RIEN par défaut (`CAP_SEARCH` est faux : la route la plus courte est gardée, et dite) ; vrai, `Nav.routing_graph` ramène le plafond de ces voies au plancher (la route descend alors à FL195 sur les Alpes : légale, absurde).
Python : bibliothèque standard."""
import re

SHEET = 'Annex 3B FRA LIM'
COUNTRIES = {'it': 'LI', 'ch': 'LS'}      # la liste fermée de ce lot : le pays de la base (`source_zone` du tronçon) → le début des noms d'espaces du RAD
NOT_READ = {'de': 'Allemagne : trois tranches (EDUUFRAW FL245, EDUUFRAN FL285, EDUUFRAE FL315) sans contours pour dire laquelle', 'fr': 'France : route libre par sous-espace (LFFRAE, LFFRAN, LFFRASE…)',
            'es': 'Espagne : route libre par sous-espace'}
TERMINAL = ('SID', 'STAR', 'APPROACH_LINK')


def unread_issue(legs):
    """SOG-0501 (c) : la phrase de revue des États de NOT_READ dont la route emprunte des voies (hors raccords et directs) : leur route libre est par tranches ou sous-espaces dont la base n'a pas les contours, la voie peut ne pas exister aux niveaux de la route libre (l'IFPS : PROF407, ROUTE52) ; None si aucun."""
    count = {}
    for leg in legs or []:
        z = leg.get('source_zone')
        if z in NOT_READ and leg.get('kind') not in TERMINAL and leg.get('via') not in (None, 'DCT') and not leg.get('connector'):
            count[z] = count.get(z, 0) + 1
    if not count:
        return None
    names = [NOT_READ[z].split(':')[0].strip() for z in sorted(count)]
    return f"Voies d'États à route libre non lue ({', '.join(names)} : {sum(count.values())} tronçon(s) de voie) : la base n'a pas les contours ni les niveaux de leur route libre ; une voie peut ne pas y exister (l'IFPS : PROF407), et un direct depuis un point qui n'est pas un point de route libre y est refusé (ROUTE52) ; non vérifié ici."

MAX_ISSUES = 40
MAX_TEXT = 4000      # un texte de cellule plus long est illisible (à examiner)
PLAUSIBLE = (100, 500)      # un plancher de route libre est un niveau de vol entre FL100 et FL500 : « ABV FL10 » est une cellule abîmée, pas un plancher
CAP_SEARCH = False      # SOG-0401 : la recherche garde la route la plus courte (et la dit) ; vrai : le plafond des voies de ces pays est ramené au plancher dans son graphe (la route descend à FL195 sur les Alpes)
CACHE = {}


def _floors_of(vert, clock):
    """Les planchers (FL) des tranches H24 d'une cellule « vertical » : liste ; None si une tranche n'est pas lisible, pas plausible, ou si un texte est trop long."""
    if len(str(vert or '')) > MAX_TEXT or len(str(clock or '')) > MAX_TEXT:
        return None
    cells = [x.strip() for x in re.split(r'-{4,}', str(vert or '')) if x.strip()]
    clocks = [x.strip() for x in re.split(r'-{4,}', str(clock or '')) if x.strip()] or ['']
    if len(clocks) == 1:
        clocks = clocks * len(cells)
    if len(clocks) != len(cells):
        return None
    out = []
    for cell, ck in zip(cells, clocks):
        m = re.match(r'^(?:ABV|ABOVE)\s+FL\s*(\d{2,3})\b', cell, re.I) or re.match(r'^(?:BTN|BETWEEN)\s+FL\s*(\d{2,3})\b', cell, re.I)
        if not m or not PLAUSIBLE[0] <= int(m.group(1)) <= PLAUSIBLE[1]:
            return None
        if ck.upper() == 'H24':
            out.append(int(m.group(1)))
    return out


def floors(rad):
    """{ zone : plancher FL } pour les pays de COUNTRIES dont le RAD en vigueur donne un plancher sans ambiguïté ; {} sans RAD. Gardé par classeur (sans empreinte ni nom : pas de cache)."""
    book = getattr(rad, 'book', None)
    if not book:
        return {}
    key = book.get('sha256') or book.get('file')
    if key and key in CACHE:
        return CACHE[key]
    per = {z: [] for z in COUNTRIES}
    bad = set()
    for r in (book.get('sheets') or {}).get(SHEET, []):
        v = r.get('v') or []
        if len(v) < 9 or v[0] == 'DEL':
            continue
        try:
            if not rad.active(r):
                continue
        except (KeyError, TypeError, ValueError, AttributeError):
            continue
        space = str(v[4]).strip().upper()
        for zone, pre in COUNTRIES.items():
            if not space.startswith(pre):
                continue
            if 'FRA' not in str(v[7]).upper().split('----------')[0].upper():
                continue      # une ligne « sous le plancher » (BLW FL195, 0 NM) : pas de la route libre
            fl = _floors_of(v[5], v[6])
            if fl is None or r.get('strike_removed'):
                bad.add(zone)
            elif fl:
                per[zone].append(min(fl))
    out = {z: vals[0] for z, vals in per.items() if vals and z not in bad and len(set(vals)) == 1}
    if key:
        if len(CACHE) > 8:
            CACHE.clear()
        CACHE[key] = out
    return out


def _altitudes(leg):
    alts = [leg.get('altitude_start_ft'), leg.get('altitude_end_ft')]
    return alts if all(isinstance(a, (int, float)) for a in alts) else None


def _candidate(leg, floor_of):
    zone = leg.get('source_zone')
    return bool(floor_of.get(zone)) and leg.get('kind') not in TERMINAL and leg.get('via') != 'DCT' and not leg.get('data_gap') and not leg.get('procedure_id')


def findings(legs, floor_of):
    """Les tronçons de voie que le PROFIL met au-dessus du plancher de route libre de leur pays (le plus haut des deux bouts du tronçon : un tronçon qui monte à travers le plancher en fait partie, un tronçon en montée qui reste dessous n'en est pas) :
    une suite { legs, text, short } par suite de tronçons consécutifs d'une même voie et d'un même pays."""
    if not floor_of:
        return []
    found = []
    for n, leg in enumerate(legs):
        if not _candidate(leg, floor_of):
            continue
        alts = _altitudes(leg)
        if not alts:
            continue      # profil inconnu : « à examiner » (voir `unknown`), jamais une erreur inventée
        zone = leg['source_zone']
        if max(alts) <= floor_of[zone] * 100:
            continue
        key = (leg['via'], zone)
        if found and found[-1]['key'] == key and found[-1]['index'][-1] == n - 1:
            found[-1]['index'].append(n)
            found[-1]['level'] = max(found[-1]['level'], max(alts))
        else:
            found.append(dict(key=key, index=[n], level=max(alts)))
    out = []
    for run in found:
        via, zone = run['key']
        members = [legs[n] for n in run['index']]
        chain = [members[0]['start']['id']] + [m['end']['id'] for m in members]
        if len(chain) > 8:
            chain = chain[:3] + ['…'] + chain[-2:]
        label = f'Tronçon {via} {chain[0]}–{chain[-1]}' if len(members) == 1 else f'Tronçons {via} {"–".join(chain)}'
        fl = f'FL{round(run["level"] / 100):03d}'
        low = f'FL{floor_of[zone]:03d}'
        out.append(dict(legs=members, text=f'{label} : voie dans l’espace de route libre ({COUNTRIES[zone]}**, plancher {low}, RAD annexe 3B FRA LIM) volée à {fl}, au-dessus du plancher : la voie n’y existe pas (PROF407 d’Eurocontrol)',
                        short=f'Voie volée à {fl} dans la route libre au-dessus de {low} (RAD annexe 3B).'))
    return out


def unknown(legs, floor_of):
    """Le nombre de tronçons de voie d'un pays à plancher dont le profil ne donne pas l'altitude : « à examiner »."""
    return sum(1 for leg in legs if _candidate(leg, floor_of) and not _altitudes(leg))
