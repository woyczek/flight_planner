"""Le jeu « roadmap » du lanceur : les priorités de l'utilisateur sur la feuille de route (SOG-0066) — chargé par regen_jobs.load_verbs().

Un verbe, `roadmap/priorities` { action, items? } (ce poste seulement, comme tous les travaux), deux actions :
  · `get` : lit organisation/PRIORITES.json (à la racine de la suite) et rend { ok, action, schema, updated, items, dropped, exists } ;
  · `set` { items } : REMPLACE le contenu par `items` (la page envoie la carte complète : ce qu'elle a lu, plus le geste) et rend { ok, action, count, updated }.
Forme du fichier : { "schema": "sog-priorities/1", "updated": "<ISO UTC>", "items": { "SOG-0046": { "milestone": "6.0.0-alpha.5", "rank": 1 }, … } } — 500 entrées au plus,
un identifiant ^SOG-\\d{4}$, un jalon de la liste de frame/help/roadmap.json, un rang entier de 1 à 99999 ; une entrée porte l'un ou l'autre, ou les deux. C'est l'entrée de priorité de
l'utilisateur : tools/roadmap_build.py la lit à chaque régénération (jalon forcé, rang).
Règles : le dossier organisation/ absent → { ok: false, reason: 'no-organisation' } (rien n'est créé) ; `set` refuse en bloc ({ ok: false, reason: 'bad-items', bad: [identifiants, 20 au plus] })
une entrée hors des règles ci-dessus, sans rien écrire ; `get` lit un fichier qui peut venir d'ailleurs : ce qui n'est pas aux règles est écarté (`dropped`), un fichier d'un autre schéma ou illisible vaut
« rien » ; l'écriture passe par un .tmp puis un remplacement, jamais un chemin rendu."""
import json
import os
import re
import time

TOOLS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(TOOLS)
SCHEMA = 'sog-priorities/1'
FILE = 'PRIORITES.json'
ID = re.compile(r'SOG-\d{4}')
MAX_ITEMS = 500
MAX_RANK = 99999
FILE_MAX = 1024 * 1024
BAD_MAX = 20


def check(a):
    """Contrôle d'arguments (→ 400 si None) : { action: 'get' } ou { action: 'set', items: { id: { milestone?, rank? } } } et rien d'autre ; la forme seulement (les règles de fond sont dans le résultat)."""
    if not isinstance(a, dict) or a.get('action') not in ('get', 'set'):
        return None
    if a['action'] == 'get':
        return {'action': 'get'} if set(a) == {'action'} else None
    items = a.get('items')
    if set(a) != {'action', 'items'} or not isinstance(items, dict) or len(items) > MAX_ITEMS:
        return None
    if not all(isinstance(k, str) and len(k) <= 20 and isinstance(v, dict) for k, v in items.items()):
        return None
    return {'action': 'set', 'items': items}


def milestones(root):
    """Les identifiants de jalons de frame/help/roadmap.json (l'ensemble, vide si le fichier manque ou est illisible)."""
    try:
        p = os.path.join(root, 'frame', 'help', 'roadmap.json')
        if os.path.getsize(p) > 8 * FILE_MAX:
            return set()
        with open(p, encoding='utf-8') as f:
            d = json.load(f)
    except (OSError, ValueError):
        return set()
    return {m['id'] for m in (d.get('milestones') or []) if isinstance(m, dict) and isinstance(m.get('id'), str)} if isinstance(d, dict) else set()


def entry(v, stones):
    """L'entrée nettoyée { milestone?, rank? } d'une valeur, ou None si elle n'est pas aux règles (rien d'autre qu'un jalon connu et un rang entier, au moins l'un des deux)."""
    if not isinstance(v, dict) or not v or not set(v) <= {'milestone', 'rank'}:
        return None
    out = {}
    if 'milestone' in v:
        if not isinstance(v['milestone'], str) or v['milestone'] not in stones:
            return None
        out['milestone'] = v['milestone']
    if 'rank' in v:
        r = v['rank']
        if isinstance(r, bool) or not isinstance(r, int) or not 1 <= r <= MAX_RANK:
            return None
        out['rank'] = r
    return out


def clean(items, stones):
    """(entrées aux règles, nombre d'écartées) d'une carte lue d'un fichier : un jalon inconnu est ôté de l'entrée (le rang reste), une entrée sans rien ni identifiant valide est écartée."""
    out, dropped = {}, 0
    if not isinstance(items, dict):
        return out, 0
    for k, v in list(items.items())[:MAX_ITEMS * 2]:
        if not isinstance(k, str) or not ID.fullmatch(k) or not isinstance(v, dict):
            dropped += 1
            continue
        keep = {x: v[x] for x in ('milestone', 'rank') if x in v}
        if 'milestone' in keep and keep['milestone'] not in stones:
            del keep['milestone']
        e = entry(keep, stones) if keep else None
        if e is None:
            dropped += 1
            continue
        out[k] = e
    if len(out) > MAX_ITEMS:
        dropped += len(out) - MAX_ITEMS
        out = dict(list(out.items())[:MAX_ITEMS])
    return out, dropped


def read_file(path, stones):
    """(items, dropped, exists, updated) du fichier de priorités ; rien d'un fichier absent, trop gros, illisible ou d'un autre schéma."""
    try:
        if os.path.getsize(path) > FILE_MAX:
            return {}, 0, True, ''
        with open(path, encoding='utf-8') as f:
            d = json.load(f)
    except FileNotFoundError:
        return {}, 0, False, ''
    except (OSError, ValueError):
        return {}, 0, True, ''
    if not isinstance(d, dict) or d.get('schema') != SCHEMA:
        return {}, 0, True, ''
    items, dropped = clean(d.get('items'), stones)
    upd = d.get('updated')
    return items, dropped, True, upd if isinstance(upd, str) and len(upd) <= 40 else ''


def priorities(job, args, ctx):
    """Verbe roadmap/priorities (voir l'en-tête) : lire ou remplacer organisation/PRIORITES.json."""
    root = (ctx or {}).get('root') or ROOT
    org = os.path.join(root, 'organisation')
    if not os.path.isdir(org):
        return {'ok': False, 'action': args['action'], 'reason': 'no-organisation'}
    path = os.path.join(org, FILE)
    stones = milestones(root)
    if args['action'] == 'get':
        items, dropped, exists, updated = read_file(path, stones)
        return {'ok': True, 'action': 'get', 'schema': SCHEMA, 'updated': updated, 'items': items, 'dropped': dropped, 'exists': exists}
    bad = [k for k, v in args['items'].items() if not ID.fullmatch(k) or entry(v, stones) is None]
    if bad:
        return {'ok': False, 'action': 'set', 'reason': 'bad-items', 'bad': bad[:BAD_MAX]}
    items = {k: entry(v, stones) for k, v in args['items'].items()}
    order = sorted(items, key=lambda k: (items[k].get('rank', MAX_RANK + 1), k))
    doc = {'schema': SCHEMA, 'updated': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'items': {k: items[k] for k in order}}
    tmp = path + '.tmp'
    try:
        with open(tmp, 'w', encoding='utf-8', newline='\n') as f:
            f.write(json.dumps(doc, ensure_ascii=False, indent=1) + '\n')
        os.replace(tmp, path)
    except OSError:
        return {'ok': False, 'action': 'set', 'reason': 'failed'}
    finally:
        if os.path.exists(tmp):
            try:
                os.remove(tmp)
            except OSError:
                pass
    job.log(f'priorités : {len(items)} entrée(s)')
    return {'ok': True, 'action': 'set', 'count': len(items), 'updated': doc['updated']}


VERBS = {
    ('roadmap', 'priorities'): (priorities, check),
}
