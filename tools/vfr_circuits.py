"""Les tours de piste VFR extraits des cartes VAC par l'EXTRACTEUR de l'utilisateur (SOG-0253) : le fichier XML `VfrCircuits`, lu comme une ENTRÉE NON FIABLE.

Le format (docs : tools/report-vfr/FORMAT-DONNEES.md, « VfrCircuits ») :
  <VfrCircuits airac="2610" extractor="nom v1">
    <Aerodrome icao="LFRN" source="AD-2.LFRN.pdf" sha256="<64 hex>">
      <Circuit id="RWY10-A" runways="10" aircraft="fixed|rotary|both" altitudeFt="1000" altitudeRef="AAL|AMSL" closed="true|false" status="extracted|checked">
        <Point seq="1" lat="48.0720" lon="-1.7300" code="N"/> …
      </Circuit>
    </Aerodrome>
  </VfrCircuits>
Les points sont DANS L'ORDRE DU VOL : le sens est cet ordre (`hand` en est déduit : `left` si le tracé tourne à gauche vu du dessus, nord en haut, `right` sinon, `unknown` sous trois points ou ouvert). WGS84, degrés décimaux.
Un attribut absent est « inconnu », jamais zéro. Rien n'est inventé : pas de tour de piste par défaut.

Bornes (le fichier est déposé par l'utilisateur, jamais de confiance) : fichier ≤ MAX_BYTES ; ≤ MAX_AERODROMES terrains, MAX_CIRCUITS circuits par terrain, MAX_POINTS points par circuit (au-delà : le fichier est REFUSÉ, dit) ; UTF-8 seulement ; aucun DOCTYPE ni ENTITY (une entité se dilate ; refusé par l'analyseur lui-même, pas seulement par une recherche dans les octets) ;
nombres finis, latitude ±90, longitude ±180 ; noms réduits à `[A-Za-z0-9 _.-]` ; un élément mal formé (un circuit, un point) est ÉCARTÉ et compté dans `warnings`, jamais corrigé.
Périmé : l'empreinte `sha256` d'un terrain est comparée à celle du PDF que la compilation a lu (`sia/vfr/<OACI>.json`, `source.sha256`) : différente → `obsolete` (ses circuits ne sont PAS rendus), égale → `current`, inconnue d'un côté ou de l'autre → `unchecked`."""
import json
import math
import os
import re
import xml.etree.ElementTree as ET
from xml.parsers import expat

MAX_BYTES = 2 * 1024 * 1024
MAX_AERODROMES = 200
MAX_CIRCUITS = 20
MAX_POINTS = 64
MAX_ELEMENTS = MAX_AERODROMES * MAX_CIRCUITS * (MAX_POINTS + 1)
ICAO = re.compile(r'[A-Z]{2}[A-Z0-9]{2}')
SHA = re.compile(r'[0-9a-f]{64}')
RUNWAY = re.compile(r'\d{2}[LRC]?')
CODE = re.compile(r'[A-Z0-9]{1,8}')
AIRCRAFT = ('fixed', 'rotary', 'both')
REFS = ('AAL', 'AMSL')
STATUSES = ('extracted', 'checked')
_DANGER = re.compile(rb'<!\s*(DOCTYPE|ENTITY)', re.I)


class Refused(ValueError):
    """Le fichier entier est refusé (taille, forme, limites) : le message dit pourquoi."""


def _name(text, n):
    return re.sub(r'[^A-Za-z0-9 _.-]', '', str(text or ''))[:n].strip()


def _num(text, low, high):
    try:
        v = float(str(text).strip())
    except (TypeError, ValueError):
        return None
    return v if math.isfinite(v) and low <= v <= high else None


def hand_of(points, closed):
    """`left` | `right` | `unknown` : le sens de rotation du tracé vu du dessus (surface signée, projection locale) ; inconnu sous trois points, ouvert, ou plat."""
    if not closed or len(points) < 3:
        return 'unknown'
    la0 = sum(p['lat'] for p in points) / len(points)
    k = math.cos(math.radians(la0))
    area = sum((a['lon'] * k) * b['lat'] - (b['lon'] * k) * a['lat'] for a, b in zip(points, points[1:] + points[:1]))
    if abs(area) < 1e-12:
        return 'unknown'
    return 'left' if area > 0 else 'right'


def _read(raw):
    """L'arbre du document, construit PAR expat lui-même (pas par une recherche dans les octets) : tout encodage, toute déclaration de type de document, d'entité (interne, externe, sautée) lève Refused ; les éléments sont comptés AU FIL de l'analyse (la mémoire est bornée avant la fin)."""
    def refuse(*_):
        raise Refused('DOCTYPE ou ENTITY : refusé (une entité se dilate)')
    stack = []
    box = []
    n = [0]

    def start(name, attrs):
        n[0] += 1
        if n[0] > MAX_ELEMENTS:
            raise Refused('trop d’éléments')
        el = ET.Element(name, dict(attrs))
        if stack:
            stack[-1].append(el)
        else:
            box.append(el)
        stack.append(el)
    p = expat.ParserCreate()
    p.StartDoctypeDeclHandler = refuse
    p.EntityDeclHandler = refuse
    p.ExternalEntityRefHandler = refuse
    p.SkippedEntityHandler = refuse
    p.StartElementHandler = start
    p.EndElementHandler = lambda name: stack.pop()
    try:
        p.Parse(raw, True)
    except Refused:
        raise
    except (expat.ExpatError, ValueError, LookupError):
        raise Refused('XML illisible') from None
    if not box:
        raise Refused('XML illisible')
    return box[0]


def parse_bytes(raw, current_sha=None):
    """(résultat, avertissements) d'un fichier XML `VfrCircuits` (octets). `current_sha(icao)` : l'empreinte du PDF lu par la compilation pour ce terrain, ou None. Lève Refused."""
    if not isinstance(raw, (bytes, bytearray)) or not raw:
        raise Refused('fichier vide')
    if len(raw) > MAX_BYTES:
        raise Refused(f'fichier de plus de {MAX_BYTES // 1024} Ko')
    if _DANGER.search(raw):
        raise Refused('DOCTYPE ou ENTITY : refusé (une entité se dilate)')
    decl = re.match(rb'(?:\xef\xbb\xbf)?<\?xml[^>]*\?>', raw)
    enc = re.search(rb'encoding\s*=\s*["\']([^"\']+)["\']', decl.group(0)) if decl else None
    if b'\x00' in raw or raw[:2] in (b'\xff\xfe', b'\xfe\xff') or (enc and enc.group(1).lower() != b'utf-8'):
        raise Refused('encodage : UTF-8 seulement')
    root = _read(bytes(raw))
    if root.tag != 'VfrCircuits':
        raise Refused('la racine n’est pas « VfrCircuits »')
    ads = [a for a in root if a.tag == 'Aerodrome']
    if len(ads) > MAX_AERODROMES:
        raise Refused(f'plus de {MAX_AERODROMES} terrains')
    warn = {'aerodromes': 0, 'circuits': 0, 'points': 0, 'altitude': 0}
    out = {}
    for a in ads:
        icao = str(a.get('icao') or '').strip().upper()
        if not ICAO.fullmatch(icao) or icao in out:
            warn['aerodromes'] += 1
            continue
        crs = [c for c in a if c.tag == 'Circuit']
        if len(crs) > MAX_CIRCUITS:
            raise Refused(f'{icao} : plus de {MAX_CIRCUITS} circuits')
        sha = str(a.get('sha256') or '').strip().lower()
        sha = sha if SHA.fullmatch(sha) else None
        have = current_sha(icao) if current_sha else None
        state = 'unchecked' if not sha or not have else 'current' if sha == have else 'obsolete'
        circuits = []
        for c in crs:
            pts_el = [p for p in c if p.tag == 'Point']
            if len(pts_el) > MAX_POINTS:
                raise Refused(f'{icao} : plus de {MAX_POINTS} points dans un circuit')
            aircraft = c.get('aircraft')
            runways = [r for r in re.split(r'[\s,/]+', str(c.get('runways') or '').upper()) if r]
            if (aircraft is not None and aircraft not in AIRCRAFT) or any(not RUNWAY.fullmatch(r) for r in runways) or len(runways) > 8:
                warn['circuits'] += 1
                continue
            pts = []
            bad = False
            for p in pts_el:
                lat, lon = _num(p.get('lat'), -90, 90), _num(p.get('lon'), -180, 180)
                seq = _num(p.get('seq'), 0, 100000)
                if lat is None or lon is None or (p.get('seq') is not None and seq is None):
                    bad = True
                    warn['points'] += 1
                    continue
                code = str(p.get('code') or '').strip().upper()
                pts.append({'seq': seq, 'lat': round(lat, 6), 'lon': round(lon, 6), **({'code': code} if CODE.fullmatch(code) else {})})
            if bad or len(pts) < 2:
                warn['circuits'] += 1
                continue
            if all(p['seq'] is not None for p in pts):
                pts.sort(key=lambda p: p['seq'])
            for p in pts:
                p.pop('seq', None)
            alt = c.get('altitudeFt')
            ref = c.get('altitudeRef')
            altitude = None
            if alt is not None:
                v = _num(alt, 0, 20000)
                if v is None or ref not in REFS:
                    warn['altitude'] += 1
                else:
                    altitude = {'ft': v, 'ref': ref}
            closed = str(c.get('closed') or '').lower() == 'true'
            circuits.append({'id': _name(c.get('id'), 40) or None, 'runways': runways, 'aircraft': aircraft or 'unknown', 'altitude': altitude, 'closed': closed,
                             'hand': hand_of(pts, closed), 'status': c.get('status') if c.get('status') in STATUSES else 'extracted', 'points': pts})
        out[icao] = {'state': state, 'source': _name(a.get('source'), 80) or None, 'circuits': [] if state == 'obsolete' else circuits, **({'dropped': len(circuits)} if state == 'obsolete' else {})}
    res = {'airac': str(root.get('airac') or '')[:8] if re.fullmatch(r'\d{4}', str(root.get('airac') or '')) else None, 'extractor': _name(root.get('extractor'), 60) or None, 'aerodromes': out,
           'counts': {'aerodromes': len(out), 'circuits': sum(len(v['circuits']) for v in out.values()), 'obsolete': sorted(k for k, v in out.items() if v['state'] == 'obsolete')}}
    return res, {k: v for k, v in warn.items() if v}


def compiled_sha(data):
    """L'empreinte du PDF que la compilation a lu pour un terrain : `sia/vfr/<OACI>.json`, `source.sha256` ; None sans fichier ou sans empreinte."""
    def get(icao):
        try:
            with open(os.path.join(data, 'sia', 'vfr', f'{icao}.json'), encoding='utf-8') as f:
                s = (json.load(f) or {}).get('source')
        except (OSError, ValueError):
            return None
        v = s.get('sha256') if isinstance(s, dict) else None
        return v.lower() if isinstance(v, str) and SHA.fullmatch(v.lower()) else None
    return get
