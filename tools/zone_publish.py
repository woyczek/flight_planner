"""L'état de PUBLICATION de chaque zone de la base aéronautique, et le plan de « Publier » (V3, 12 nov. 2026, SOG-0258).

Chaque construction d'une zone fait UN commit local (« Base aéronautique <zone> <cycle> construite sur le poste », tools/regen/base.py) ; elle est publiée quand ce commit est un ancêtre de la branche distante CONNUE (celle que la dernière
synchronisation a vue : aucun appel réseau ici). Une construction jamais commitée ou modifiée depuis son commit n'est pas publiée. L'état se lit en quatre appels de git pour toutes les zones (jamais un par zone).
Publier est la synchronisation de data/ (tools/data_sync.py) : un envoi emporte TOUS les commits non envoyés, des autres zones et des données de l'utilisateur — il n'y a pas d'isolation d'une zone (décision de l'ergonome : le dire, ne pas le cacher).
Le plan rend ce qui partirait avec : les autres zones construites non publiées (leurs noms : ce sont des zones de la base, pas des données personnelles) et le NOMBRE de fichiers de l'utilisateur (commités non envoyés, et à commiter), jamais leurs noms.
Bibliothèque standard seulement ; git par tools/data_sync.py."""
import os
import re

import data_sync

BASE = 'sia/base'
ZONE = re.compile(r'^[a-z0-9_-]{2,12}$')
MAX_LOG = 4000      # commits relus pour retrouver le dernier de chaque zone


def _upstream(data):
    br, up, remote = data_sync.branch_info(data)
    return up


def _unpushed(data, up):
    code, out = data_sync.git(data, 'rev-list', f'{up}..HEAD')
    return set(out.split()) if code == 0 else None


def _last_commits(data):
    """{ zone : (sha, epoch) } : le dernier commit qui a touché sia/base/<zone>/ (un seul appel : le journal, les noms de fichiers)."""
    code, out = data_sync.git(data, 'log', f'--max-count={MAX_LOG}', '--name-only', '--format=%x01%H%x09%ct', '--', BASE)
    res = {}
    if code != 0:
        return res
    for block in out.split('\x01')[1:]:
        lines = [x for x in block.splitlines() if x.strip()]
        if not lines:
            continue
        head = lines[0].split('\t')
        if len(head) != 2 or not head[1].isdigit():
            continue
        for path in lines[1:]:
            parts = path.split('/')
            if len(parts) >= 4 and parts[0] == 'sia' and parts[1] == 'base' and ZONE.match(parts[2]) and parts[2] not in res:
                res[parts[2]] = (head[0], int(head[1]))
    return res


def _status_paths(data):
    """Les chemins modifiés, ajoutés ou supprimés non commités de data/ (git status, sans les noms rendus plus loin) : [chemin relatif]."""
    code, out = data_sync.git(data, 'status', '--porcelain', '-uall')
    if code != 0:
        return []
    paths = []
    for line in out.splitlines():
        p = re.sub(r'^[MADRCU?!]{1,2}\s+', '', line.lstrip()).strip().strip('"')      # git() rend la sortie sans son espace de tête : le code d'état se lit sans compter les colonnes
        if ' -> ' in p:
            p = p.split(' -> ')[-1]
        if p:
            paths.append(p.replace('\\', '/'))
    return paths


def zone_of(path):
    parts = path.split('/')
    return parts[2] if len(parts) >= 4 and parts[0] == 'sia' and parts[1] == 'base' and ZONE.match(parts[2]) else None


def states(data, zones=None):
    """{ zone : { state: 'published' | 'unpublished' | 'unknown', commit, at (ISO UTC), reason? } } pour les zones données (toutes celles dont un commit existe, sinon) ; une zone sans commit de construction : absente.
    `unknown` : pas de dépôt, pas de branche distante connue (reason `no-repo`, `no-remote`) : rien n'est dit publié."""
    import time
    if not data_sync.is_repo(data):
        return {z: {'state': 'unknown', 'commit': None, 'at': None, 'reason': 'no-repo'} for z in (zones or [])}
    up = _upstream(data)
    commits = _last_commits(data)
    iso = lambda t: time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(t))
    wanted = list(zones) if zones is not None else sorted(commits)
    dirty = {zone_of(p) for p in _status_paths(data)} - {None}
    if not up:
        return {z: {'state': 'unknown', 'commit': commits[z][0] if z in commits else None, 'at': iso(commits[z][1]) if z in commits else None, 'reason': 'no-remote'} for z in wanted}
    ahead = _unpushed(data, up)
    if ahead is None:
        return {z: {'state': 'unknown', 'commit': None, 'at': None, 'reason': 'no-remote'} for z in wanted}
    out = {}
    for z in wanted:
        if z not in commits:
            continue
        sha, t = commits[z]
        out[z] = {'state': 'unpublished' if (sha in ahead or z in dirty) else 'published', 'commit': sha, 'at': iso(t)}
    return out


def plan(data, zone):
    """Le plan de « Publier » pour une zone : { ok, zone, state, commit, ahead: [zones construites non publiées qui partiraient avec, hors celle-ci], commits: n (les commits non envoyés), otherFiles: n (fichiers de l'utilisateur, hors sia/base,
    commités non envoyés), pending: n (fichiers à commiter par la synchronisation, hors sia/base) } ; jamais un nom de fichier de l'utilisateur. ok faux et `reason` si la zone n'a pas de construction, ou si rien n'est publiable."""
    if not isinstance(zone, str) or not ZONE.match(zone):
        return {'ok': False, 'reason': 'bad-zone', 'zone': zone}
    if not data_sync.is_repo(data):
        return {'ok': False, 'reason': 'no-repo', 'zone': zone}
    up = _upstream(data)
    if not up:
        return {'ok': False, 'reason': 'no-remote', 'zone': zone}
    st = states(data)
    mine = st.get(zone)
    if not mine:
        return {'ok': False, 'reason': 'not-built', 'zone': zone}
    ahead_set = _unpushed(data, up) or set()
    code, files = data_sync.git(data, 'diff', '--name-only', f'{up}..HEAD')
    other = [p for p in (files.splitlines() if code == 0 else []) if p and zone_of(p.replace('\\', '/')) is None]
    pend = [p for p in _status_paths(data) if zone_of(p) is None]
    others = sorted(z for z, v in st.items() if z != zone and v['state'] == 'unpublished')
    return {'ok': True, 'zone': zone, 'state': mine['state'], 'commit': mine['commit'], 'ahead': others, 'commits': len(ahead_set), 'otherFiles': len(other), 'pending': len(pend),
            'nothing': mine['state'] == 'published' and not others and not ahead_set and not pend}
