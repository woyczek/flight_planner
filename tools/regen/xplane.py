"""Verbe xplane/build (SOG-0474 suite ; Q-0108 : « les deux ») : le réseau de repli X-Plane (Navigraph) pour les États SANS réseau officiel.

Le dossier d'X-Plane est celui que l'utilisateur a indiqué UNE fois (POST /__setup/xplane, data/local/xplane.json) ; il est REVALIDÉ ici (tools/xplane_net.check_folder : chemin absolu d'un lecteur local, ni UNC, ni « .. », ni lien ou
jonction ; trois fichiers à noms FIXES sous Custom Data/ ou Resources/default data/). La coche « usage personnel » est celle du LANCEUR. Le travail lit earth_fix.dat, earth_nav.dat et earth_awy.dat (200 Mo au plus, relus pendant la
lecture) et écrit SEULEMENT data/local/xplane/net_<cycle>.json : points et voies des zones sans réseau officiel (une zone dont la base a moins de MIN_OFFICIAL tronçons) dans la région de route (REGION). Jamais publié, jamais
versionné, jamais dans data/ synchronisé ; aucune position n'est écrite ailleurs ni dite dans un message. Le nom du dossier de l'utilisateur ne sort jamais.

  xplane/build {} → { ok, zones: n, cycle, counts } ou { ok: False, reason } ; reason : not-personal, not-configured, missing, not-xplane, refused, unreadable, too-big, nothing, no-zones.
"""
import json
import os
import re

import personal_use
import safe_json
import xplane_net

MIN_OFFICIAL = 20          # un État dont la base a moins de tronçons de voie n'a pas de réseau officiel
REGION = (-32.0, 24.0, 62.0, 75.0)      # (ouest, sud, est, nord) : la région que le moteur de route sert (Europe, Méditerranée, Atlantique Nord) : le repli ne lit pas le monde
ZONE = re.compile(r'[a-z]{2}\Z')
MAX_ZONE_FILE = 64 * 1024 * 1024


def _boxes(root):
    """{ zone : [[ouest, sud, est, nord], …] } de frame/aerodb/zones.js (généré par tools/build_aerodb_zones.py) ; {} sans lecture."""
    try:
        with open(os.path.join(root, 'frame', 'aerodb', 'zones.js'), encoding='utf-8') as f:
            text = f.read(8 * 1024 * 1024)
    except OSError:
        return {}
    m = re.search(r'window\.AERODB_ZONES\s*=\s*(\{.*\})\s*;?\s*\Z', text, re.S)
    if not m:
        return {}
    doc, why = safe_json.loads(m[1])
    if why or not isinstance(doc, dict):
        return {}
    return {z: v['b'] for z, v in doc.items() if ZONE.match(z) and isinstance(v, dict) and isinstance(v.get('b'), list)}


def _in_region(boxes):
    w, s, e, n = REGION
    return any(bw <= e and be >= w and bs <= n and bn >= s for bw, bs, be, bn in boxes if all(isinstance(x, (int, float)) for x in (bw, bs, be, bn)))


def without_network(data, boxes):
    """Les zones de la région de route dont la base n'a pas de réseau officiel (moins de MIN_OFFICIAL tronçons de voie au dernier cycle publié) ; l'ordre des noms."""
    base = os.path.join(data, 'sia', 'base')
    out = []
    try:
        zones = sorted(n for n in os.listdir(base) if ZONE.match(n) and os.path.isdir(os.path.join(base, n)))
    except OSError:
        return out
    for z in zones:
        if z not in boxes or not _in_region(boxes[z]):
            continue
        try:
            cycles = sorted(c for c in os.listdir(os.path.join(base, z)) if re.fullmatch(r'\d{4}-\d{2}-\d{2}', c) and os.path.isdir(os.path.join(base, z, c)))
        except OSError:
            cycles = []
        n = 0
        for c in reversed(cycles):
            doc, why = safe_json.read(os.path.join(base, z, c, 'airways.json'), MAX_ZONE_FILE, encoding='utf-8')
            if not why:
                d = doc.get('data') if isinstance(doc, dict) else None
                n = len(d) if isinstance(d, list) else 0
                break
        if n < MIN_OFFICIAL:
            out.append(z)
    return out


def build(job, args, ctx):
    """Verbe xplane/build."""
    data = ctx['data']
    if not personal_use.certified(data):
        return {'ok': False, 'reason': 'not-personal'}
    path = xplane_net.config_read(data)
    if not path:
        return {'ok': False, 'reason': 'not-configured'}
    ok, why = xplane_net.check_folder(path)
    if not ok:
        return {'ok': False, 'reason': {'missing': 'missing', 'no-files': 'not-xplane'}.get(why, 'refused')}
    root = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
    boxes = _boxes(root)
    zones = without_network(data, boxes)
    if not zones:
        return {'ok': False, 'reason': 'no-zones'}
    job.step('lecture du réseau', 0, 1, 'étapes')
    net, why = xplane_net.build(path, zones, boxes)
    if net is None:
        return {'ok': False, 'reason': {'no-files': 'not-xplane'}.get(why, why)}
    xplane_net.save(data, net)
    job.step('réseau écrit', 1, 1, 'étapes')
    return {'ok': True, 'zones': len(net['zones']), 'cycle': net.get('cycle') or None, 'counts': net.get('counts')}


VERBS = {
    ('xplane', 'build'): (build, lambda a: {} if a == {} else None),
}
