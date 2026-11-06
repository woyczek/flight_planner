"""Le jeu « airline » du lanceur : la migration vers une compagnie par dossier (V3_SPECIFICATION § 10.38, étape 1, SOG-0039) — chargé par regen_jobs.load_verbs().

Un verbe, `airline/migrate` { dry?: vrai par défaut, code?: chaîne } : la compagnie unique d'aujourd'hui, data/airline/settings.json (et map_profiles.json),
est COPIÉE dans son dossier data/airline/<code>/ (`code` : le nom court sur les réseaux, ^[a-z0-9]{2,8}$ ; proposé d'après le nom, confirmé par l'utilisateur
en le passant dans `code`), `fleet.json` y est créé VIDE (la flotte d'aujourd'hui vit dans la boîte « personnelle » des fiches et le Centre V2, hors de ce verbe :
le résultat le dit, `fleet: 'empty'`), et data/airline/index.json (`{ schema: 1, airlines: [{ code, name }] }`) reçoit l'entrée. Rien n'est supprimé : l'ancien
settings.json (et map_profiles.json) restent en place comme copie jusqu'au cycle suivant. Aucun fichier existant n'est écrasé (dit dans `conflicts`). À blanc par défaut :
le plan dit les fichiers et leur taille, jamais un chemin complet ; la migration réelle écrit chaque fichier par un .tmp puis un remplacement.

Résultat : { ok, dry, code, proposed, name, files: [{ name, bytes }], conflicts: [{ name, why }], fleet: 'empty', index: 'created' | 'updated' | 'unchanged', reason? }.
`reason` : 'no-source' (pas de settings.json lisible), 'bad-code' (code refusé), 'exists' (le dossier de la compagnie a déjà un settings.json : rien n'est écrit), 'failed'."""
import json
import os
import re
import sys
import unicodedata

TOOLS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if TOOLS not in sys.path:
    sys.path.insert(0, TOOLS)
import data_sync  # noqa: E402  (data_path : un chemin sous data/, jamais ailleurs)

CODE = re.compile(r'[a-z0-9]{2,8}')
FILE_MAX = 1024 * 1024  # un fichier de réglages fait quelques Ko : au-delà, pas copié
COPIED = ('settings.json', 'map_profiles.json')  # ce que la compagnie d'aujourd'hui emporte dans son dossier
FLEET_EMPTY = {'schema': 1, 'aircraft': []}
INDEX_MAX = 20


def check_migrate(a):
    """Contrôle des arguments de airline/migrate (→ 400 si None) : { dry?: vrai par défaut, code?: ^[a-z0-9]{2,8}$ } et rien d'autre."""
    if not isinstance(a, dict) or not set(a) <= {'dry', 'code'}:
        return None
    dry, code = a.get('dry', True), a.get('code')
    if not isinstance(dry, bool) or not (code is None or isinstance(code, str) and CODE.fullmatch(code)):
        return None
    return {'dry': dry, 'code': code}


def propose(name):
    """Le code proposé d'après le nom (« DEFA Virtual » → « defa ») : le premier mot sans accents, minuscules, lettres et chiffres, deux à huit caractères ; '' sans mot utilisable."""
    word = (re.split(r'[\s_-]+', unicodedata.normalize('NFKD', str(name or '')).encode('ascii', 'ignore').decode().strip().lower()) or [''])[0]
    word = re.sub(r'[^a-z0-9]', '', word)[:8]
    return word if CODE.fullmatch(word) else ''


def _read(path):
    """(octets, document JSON) d'un fichier lisible de taille bornée, sinon (None, None)."""
    try:
        if os.path.getsize(path) > FILE_MAX:
            return None, None
        raw = open(path, 'rb').read()
        return raw, json.loads(raw.decode('utf-8'))
    except (OSError, ValueError):
        return None, None


def _write(path, raw):
    """Écrit raw (octets) par un .tmp puis un remplacement ; le dossier est créé."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + '.tmp'
    try:
        with open(tmp, 'wb') as f:
            f.write(raw)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            try:
                os.remove(tmp)
            except OSError:
                pass


def migrate(job, args, ctx):
    """Verbe airline/migrate (voir l'en-tête). À blanc : le plan seul ; réel : les copies, la flotte vide et l'index."""
    data, dry = ctx['data'], args['dry']
    src_raw, src = _read(data_sync.data_path(data, 'airline/settings.json') or '')
    res = {'ok': False, 'dry': dry, 'code': '', 'proposed': '', 'name': '', 'files': [], 'conflicts': [], 'fleet': 'empty', 'index': 'unchanged'}
    if not isinstance(src, dict):
        return {**res, 'reason': 'no-source'}
    name = str(src.get('name') or '')[:80]
    proposed = propose(name)
    code = args.get('code') or proposed
    res.update(name=name, proposed=proposed, code=code or '')
    if not code or not CODE.fullmatch(code):
        return {**res, 'reason': 'bad-code'}
    base = f'airline/{code}'
    dest = lambda leaf: data_sync.data_path(data, f'{base}/{leaf}')
    if os.path.isfile(dest('settings.json') or ''):
        return {**res, 'conflicts': [{'name': 'settings.json', 'why': 'exists'}], 'reason': 'exists'}
    plan = []  # (nom, octets)
    for leaf in COPIED:
        raw, doc = (src_raw, src) if leaf == 'settings.json' else _read(data_sync.data_path(data, f'airline/{leaf}') or '')
        if raw is None or not isinstance(doc, dict):
            continue
        if os.path.exists(dest(leaf) or ''):
            res['conflicts'].append({'name': leaf, 'why': 'exists'})
            continue
        plan.append((leaf, raw))
    fleet_path = dest('fleet.json')
    if os.path.exists(fleet_path or ''):
        res['conflicts'].append({'name': 'fleet.json', 'why': 'exists'})
    else:
        plan.append(('fleet.json', (json.dumps(FLEET_EMPTY, ensure_ascii=False, indent=1) + '\n').encode('utf-8')))
    res['files'] = [{'name': n, 'bytes': len(b)} for n, b in plan]
    idx_path = data_sync.data_path(data, 'airline/index.json') or ''
    _, idx = _read(idx_path) if os.path.isfile(idx_path) else (None, None)
    airlines = [x for x in (idx or {}).get('airlines', []) if isinstance(x, dict) and isinstance(x.get('code'), str)] if isinstance(idx, dict) else []
    known = any(x['code'] == code for x in airlines)
    res['index'] = 'unchanged' if known else 'updated' if airlines else 'created'
    if dry:
        return {**res, 'ok': not res['conflicts'], **({'reason': 'partial'} if res['conflicts'] else {})}
    try:
        for leaf, raw in plan:
            _write(dest(leaf), raw)
        if not known and len(airlines) < INDEX_MAX:
            airlines.append({'code': code, 'name': name})
            _write(idx_path, (json.dumps({'schema': 1, 'airlines': airlines}, ensure_ascii=False, indent=1) + '\n').encode('utf-8'))
        elif not known:
            res['index'] = 'unchanged'
            res['conflicts'].append({'name': 'index.json', 'why': 'full'})
    except OSError:
        return {**res, 'reason': 'failed'}
    job.log(f'compagnie {code} : {len(plan)} fichier(s) copiés ou créés')
    return {**res, 'ok': not res['conflicts'], **({'reason': 'partial'} if res['conflicts'] else {})}


VERBS = {
    ('airline', 'migrate'): (migrate, check_migrate),
}
