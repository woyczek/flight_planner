"""Le jeu « base/coverage » du lanceur : le tableau de couverture des données aéronautiques par pays (SOG-0174, « des données aéro pour TOUS les pays ») — chargé par regen_jobs.load_verbs().

`base/coverage` {} (lecture seule, rien n'est écrit) : pour chaque zone publiée de data/sia/base/, ce que sa base PORTE aujourd'hui, lu dans ses fichiers, jamais deviné :
  { ok, current, zones: { <zone>: { cycle, parserVersion, counts: { aerodromes, navaids, points, airways, airspaces, fir, vrp }, procedures, ground, sources: { declared: [ids], present: [ids] }, has: { points, airways, airspaces, fir, procedures, ground } } } }
  · `counts` : le nombre d'enregistrements de chaque sorte du dernier cycle publié de la zone (`fir` : les espaces de type FIR ou UIR) ;
  · `procedures` : le nombre de terrains de la zone dont le dossier détient des procédures (data/proc/manual/<OACI>.json et les index proc/<cycle>/index.json), d'après les préfixes OACI de la zone ;
  · `ground` : le nombre de terrains de la zone dont la couche sol (data/proc/ground/<OACI>.json) est détenue ;
  · `sources.declared` : les sources que la suite déclare pour la zone (base_sources.sources_of) ; `present` : celles dont un fichier est dans data/sia/ (file_source) ;
  · `has` : oui / non par colonne du tableau (au moins un enregistrement : points, navaids, airways, airspaces, fir, procedures, ground) — la page y ajoute la source et la licence de son catalogue (frame/aerodb/catalogue.js) ; la licence n'est pas ici.
Une zone sans fichier lisible est rendue avec des comptes à 0 : rien n'est inventé. Bibliothèque standard seulement.
"""
import json
import os
import re
import sys
import types

TOOLS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if TOOLS not in sys.path:
    sys.path.insert(0, TOOLS)
import regen_jobs  # noqa: E402

KINDS = ('aerodromes', 'navaids', 'points', 'airways', 'airspaces', 'vrp')
CYCLE = re.compile(r'^\d{4}-\d{2}-\d{2}$')
ICAO = re.compile(r'^[A-Z0-9]{4}$')
MAX_BYTES = 80 * 1024 * 1024        # un fichier de zone plus gros n'est pas lu (le plus gros : ~10 Mo)


def _ns(verb):
    entry = regen_jobs.REGISTRY.get(verb)
    return types.SimpleNamespace(**entry[0].__globals__) if entry else None


def _read(path):
    """Le tableau `data` d'un fichier de zone, [] s'il manque, est illisible ou trop gros."""
    try:
        if os.path.getsize(path) > MAX_BYTES:
            return []
        with open(path, encoding='utf-8') as f:
            d = json.load(f)
        v = d.get('data') if isinstance(d, dict) else None
        return v if isinstance(v, list) else []
    except (OSError, ValueError):
        return []


def _icaos(folder):
    """Les codes OACI des fichiers <OACI>.json d'un dossier."""
    try:
        return {n[:-5] for n in os.listdir(folder) if n.endswith('.json') and ICAO.match(n[:-5])}
    except OSError:
        return set()


def coverage(job, args, ctx):
    data = ctx['data']
    base = os.path.join(data, 'sia', 'base')
    S = _ns(('base', 'fetch'))
    try:
        with open(os.path.join(base, 'index.json'), encoding='utf-8') as f:
            index = (json.load(f) or {}).get('zones') or {}
    except (OSError, ValueError):
        index = {}
    held_proc = _icaos(os.path.join(data, 'proc', 'manual'))
    try:
        for c in os.listdir(os.path.join(data, 'proc')):
            if CYCLE.match(c):
                try:
                    with open(os.path.join(data, 'proc', c, 'index.json'), encoding='utf-8') as f:
                        held_proc |= {k for k in ((json.load(f) or {}).get('aerodromes') or {}) if ICAO.match(str(k))}
                except (OSError, ValueError, AttributeError):
                    pass
    except OSError:
        pass
    held_ground = _icaos(os.path.join(data, 'proc', 'ground'))
    present = {}
    try:
        for rel in _ns(('base', 'build')).list_inputs(data):
            hit = S.file_source(rel)
            if hit and hit.get('zone') not in (None, '*'):
                present.setdefault(hit['zone'], set()).add(hit['source'])
    except (OSError, AttributeError, TypeError):
        pass
    zones = {}
    for zone in sorted(index):
        e = index[zone] if isinstance(index[zone], dict) else {}
        cycle = str(e.get('cycle') or '')
        folder = os.path.join(base, zone, cycle) if CYCLE.match(cycle) else ''
        counts = {k: len(_read(os.path.join(folder, k + '.json'))) if folder else 0 for k in KINDS}
        spaces = _read(os.path.join(folder, 'airspaces.json')) if folder else []
        counts['fir'] = sum(1 for a in spaces if isinstance(a, dict) and str(a.get('type')) in ('FIR', 'UIR'))
        prefixes = tuple(p for p in (e.get('prefixes') or []) if isinstance(p, str) and 1 <= len(p) <= 4)
        mine = lambda held: sum(1 for k in held if k.startswith(prefixes)) if prefixes else 0
        meta = {}
        if folder:
            try:
                with open(os.path.join(folder, 'meta.json'), encoding='utf-8') as f:
                    meta = json.load(f) or {}
            except (OSError, ValueError):
                meta = {}
        zones[zone] = {'cycle': cycle or None, 'parserVersion': meta.get('parserVersion') if isinstance(meta, dict) else None, 'counts': counts, 'procedures': mine(held_proc), 'ground': mine(held_ground),
                       'sources': {'declared': list(S.sources_of(zone)) if S else [], 'present': sorted(present.get(zone, ()))},
                       'has': {'points': counts['points'] > 0, 'navaids': counts['navaids'] > 0, 'airways': counts['airways'] > 0, 'airspaces': counts['airspaces'] > 0, 'fir': counts['fir'] > 0,
                               'procedures': mine(held_proc) > 0, 'ground': mine(held_ground) > 0}}
    return {'ok': True, 'zones': zones}


def check(a):
    """Contrôle d'arguments (→ 400 si None) : aucun."""
    return {} if a == {} or a is None else None


VERBS = {('base', 'coverage'): (coverage, check)}
