"""Le jeu « recette » du lanceur : les verdicts de l'utilisateur sur les tests fonctionnels de la suite (SOG-0167) — chargé par regen_jobs.load_verbs().

Un verbe, `recette/verdict` { action, items? } (ce poste seulement, comme tous les travaux), deux actions, sur le modèle de roadmap/priorities :
  · `get` : lit organisation/RECETTE.json (à la racine de la suite) et rend { ok, action, schema, updated, items, dropped, exists } ;
  · `set` { items, drop? } : FUSIONNE `items` dans le contenu, par identifiant (une entrée écrite ne disparaît JAMAIS parce que l'écran ne l'a pas en main : seul `drop`, la liste des identifiants que l'utilisateur reprend, en retire) et rend { ok, action, count, updated }.
Forme du fichier : { "schema": "sog-recette/1", "updated": "<ISO UTC>", "items": { "SOG-0046": { "verdict": "ok" | "ko", "comment": "…", "at": "<ISO UTC>" }, … } } — 1000 entrées au plus,
un identifiant ^SOG-\\d{4}$, un verdict `ok` ou `ko`, un commentaire de 2000 signes au plus (SANS caractère de commande, hors tabulation et saut de ligne : le champ est sur plusieurs lignes) qui est OBLIGATOIRE pour un refus (`ko`), une date ISO UTC. C'est l'entrée
de l'utilisateur : tools/recette_build.py la lit à chaque régénération (un verdict tient tant que la fiche n'est pas livrée de nouveau).
Règles : le dossier organisation/ absent → { ok: false, reason: 'no-organisation' } (rien n'est créé) ; `set` refuse en bloc ({ ok: false, reason: 'bad-items', bad: [identifiants, 20 au plus] })
une entrée hors des règles ci-dessus, sans rien écrire ; `get` lit un fichier qui peut venir d'ailleurs : ce qui n'est pas aux règles est écarté (`dropped`), un fichier d'un autre schéma ou
illisible vaut « rien » ; l'écriture passe par un .tmp puis un remplacement, jamais un chemin rendu."""
import json
import os
import re
import time

TOOLS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(TOOLS)
SCHEMA = 'sog-recette/1'
FILE = 'RECETTE.json'
ID = re.compile(r'SOG-[0-9]{4}')
AT = re.compile(r'[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,3})?Z')
MAX_ITEMS = 1000
MAX_COMMENT = 2000  # SOG-0303 : 600 avant ; la page, recette_build.py et ce verbe disent la même limite
FILE_MAX = 2 * 1024 * 1024
BAD_MAX = 20


def check(a):
    """Contrôle d'arguments (→ 400 si None) : { action: 'get' } ou { action: 'set', items: { id: { verdict, comment?, at? } } } et rien d'autre ; la forme seulement (les règles de fond sont dans le verbe)."""
    if not isinstance(a, dict) or a.get('action') not in ('get', 'set'):
        return None
    if a['action'] == 'get':
        return {'action': 'get'} if set(a) == {'action'} else None
    items = a.get('items')
    if not {'action', 'items'} <= set(a) <= {'action', 'items', 'drop'} or not isinstance(items, dict) or len(items) > MAX_ITEMS:
        return None
    if not all(isinstance(k, str) and len(k) <= 20 and isinstance(v, dict) for k, v in items.items()):
        return None
    out = {'action': 'set', 'items': items}
    if 'drop' in a:      # the identifiers the user took back: the only way an entry leaves the file
        drop = a['drop']
        if not isinstance(drop, list) or len(drop) > MAX_ITEMS or not all(isinstance(k, str) and len(k) <= 20 for k in drop):
            return None
        out['drop'] = drop
    return out


def entry(v):
    """L'entrée nettoyée { verdict, comment?, at? } d'une valeur, ou None si elle n'est pas aux règles : un verdict ok ou ko, un commentaire texte de 2000 signes au plus sans caractère de commande hors tabulation et saut de ligne (obligatoire,
    non vide, pour `ko`), une date ISO UTC ; rien d'autre."""
    if not isinstance(v, dict) or not set(v) <= {'verdict', 'comment', 'at'} or v.get('verdict') not in ('ok', 'ko'):
        return None
    out = {'verdict': v['verdict']}
    if 'comment' in v:
        c = v['comment']
        if not isinstance(c, str) or len(c) > MAX_COMMENT or re.search(r'[\x00-\x08\x0b-\x1f\x7f]', c):
            return None
        c = c.strip()
        if c:
            out['comment'] = c
    if v['verdict'] == 'ko' and 'comment' not in out:
        return None
    if 'at' in v:
        if not isinstance(v['at'], str) or not AT.fullmatch(v['at']):
            return None
        out['at'] = v['at']
    return out


def clean(items):
    """(entrées aux règles, nombre d'écartées) d'une carte lue d'un fichier : une entrée hors des règles est écartée, 1000 au plus."""
    out, dropped = {}, 0
    if not isinstance(items, dict):
        return out, 0
    for k, v in list(items.items())[:MAX_ITEMS * 2]:
        e = entry(v) if isinstance(k, str) and ID.fullmatch(k) else None
        if e is None:
            dropped += 1
            continue
        out[k] = e
    if len(out) > MAX_ITEMS:
        dropped += len(out) - MAX_ITEMS
        out = dict(list(out.items())[:MAX_ITEMS])
    return out, dropped


def read_file(path):
    """(items, dropped, exists, updated) du fichier des verdicts ; rien d'un fichier absent, trop gros, illisible ou d'un autre schéma."""
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
    items, dropped = clean(d.get('items'))
    upd = d.get('updated')
    return items, dropped, True, upd if isinstance(upd, str) and len(upd) <= 40 else ''


def merged(kept, new, drop):
    """Le fichier après un `set` : ce qu'il porte déjà, avec les entrées envoyées (par identifiant) et sans celles que l'utilisateur a reprises (`drop`) ; None si cela dépasse la limite.
    Un `set` ne REMPLACE plus le fichier (11 nov. 2026 : 14 réponses du matin perdues quand l'écran, qui ne les avait pas lues, a envoyé les 7 du midi) : une entrée écrite ne disparaît que par `drop`."""
    out = dict(kept)
    out.update(new)
    for k in drop or ():
        out.pop(k, None)
    return out if len(out) <= MAX_ITEMS else None


def verdict(job, args, ctx):
    """Verbe recette/verdict (voir l'en-tête) : lire ou compléter organisation/RECETTE.json."""
    root = (ctx or {}).get('root') or ROOT
    org = os.path.join(root, 'organisation')
    if not os.path.isdir(org):
        return {'ok': False, 'action': args['action'], 'reason': 'no-organisation'}
    path = os.path.join(org, FILE)
    if args['action'] == 'get':
        items, dropped, exists, updated = read_file(path)
        return {'ok': True, 'action': 'get', 'schema': SCHEMA, 'updated': updated, 'items': items, 'dropped': dropped, 'exists': exists}
    bad = [k for k, v in args['items'].items() if not ID.fullmatch(k) or entry(v) is None]
    if bad:
        return {'ok': False, 'action': 'set', 'reason': 'bad-items', 'bad': bad[:BAD_MAX]}
    items = merged(read_file(path)[0], {k: entry(v) for k, v in args['items'].items()}, args.get('drop'))
    if items is None:
        return {'ok': False, 'action': 'set', 'reason': 'too-many'}
    doc = {'schema': SCHEMA, 'updated': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'items': {k: items[k] for k in sorted(items)}}
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
    job.log(f'recette : {len(items)} verdict(s)')
    return {'ok': True, 'action': 'set', 'count': len(items), 'updated': doc['updated']}


# ---- recette/decision (SOG-0241) : les réponses de l'utilisateur aux points à trancher (onglet « À trancher » de la recette) — même forme et mêmes gardes que recette/verdict.
#   { action: 'get' } → { ok, action, schema, updated, items, dropped, exists } ; { action: 'set', items, drop? } FUSIONNE par identifiant (`drop` retire). Fichier : organisation/DECISIONS_REPONSES.json,
#   { "schema": "sog-decisions/1", "updated": "<ISO UTC>", "items": { "Q-0001": { "choice": 0..9 | null, "text": "…", "at": "<ISO UTC>" } } } : un identifiant ^Q-\d{4}$, un choix entier
#   de 0 à 9 ou rien, un texte libre de 2000 signes au plus (SANS caractère de commande, hors tabulation et saut de ligne : le champ est sur plusieurs lignes), au moins l'un des deux, une date ISO UTC ; 1000 entrées au plus ; rien d'autre n'est écrit.
DECISIONS_FILE = 'DECISIONS_REPONSES.json'
DECISIONS_SCHEMA = 'sog-decisions/1'
QID = re.compile(r'Q-[0-9]{4}')


def check_decision(a):
    """Contrôle d'arguments (→ 400 si None) : { action: 'get' } ou { action: 'set', items: { id: { choice?, text?, at? } } } et rien d'autre (la forme seulement)."""
    return check(a)


def decision_entry(v):
    """L'entrée nettoyée { choice, text, at? } d'une valeur, ou None hors des règles : `choice` entier 0 à 9 ou None, `text` de 2000 signes au plus sans caractère de commande hors tabulation et saut de ligne, au moins un des deux, `at` ISO UTC."""
    if not isinstance(v, dict) or not set(v) <= {'choice', 'text', 'at'}:
        return None
    choice = v.get('choice')
    if choice is not None and (isinstance(choice, bool) or not isinstance(choice, int) or not 0 <= choice <= 9):
        return None
    text = v.get('text', '')
    if not isinstance(text, str) or len(text) > MAX_COMMENT or re.search(r'[\x00-\x08\x0b-\x1f\x7f]', text):
        return None
    text = text.strip()
    if choice is None and not text:
        return None
    out = {'choice': choice, 'text': text}
    if 'at' in v:
        if not isinstance(v['at'], str) or not AT.fullmatch(v['at']):
            return None
        out['at'] = v['at']
    return out


def clean_decisions(items):
    """(entrées aux règles, nombre d'écartées) d'une carte lue d'un fichier."""
    out, dropped = {}, 0
    if not isinstance(items, dict):
        return out, 0
    for k, v in list(items.items())[:MAX_ITEMS * 2]:
        e = decision_entry(v) if isinstance(k, str) and QID.fullmatch(k) else None
        if e is None:
            dropped += 1
            continue
        out[k] = e
    if len(out) > MAX_ITEMS:
        dropped += len(out) - MAX_ITEMS
        out = dict(list(out.items())[:MAX_ITEMS])
    return out, dropped


def read_decisions(path):
    """(items, dropped, exists, updated) du fichier des réponses ; rien d'un fichier absent, trop gros, illisible ou d'un autre schéma."""
    try:
        if os.path.getsize(path) > FILE_MAX:
            return {}, 0, True, ''
        with open(path, encoding='utf-8') as f:
            d = json.load(f)
    except FileNotFoundError:
        return {}, 0, False, ''
    except (OSError, ValueError):
        return {}, 0, True, ''
    if not isinstance(d, dict) or d.get('schema') != DECISIONS_SCHEMA:
        return {}, 0, True, ''
    items, dropped = clean_decisions(d.get('items'))
    upd = d.get('updated')
    return items, dropped, True, upd if isinstance(upd, str) and len(upd) <= 40 else ''


def decision(job, args, ctx):
    """Verbe recette/decision (voir ci-dessus) : lire ou compléter organisation/DECISIONS_REPONSES.json."""
    root = (ctx or {}).get('root') or ROOT
    org = os.path.join(root, 'organisation')
    if not os.path.isdir(org):
        return {'ok': False, 'action': args['action'], 'reason': 'no-organisation'}
    path = os.path.join(org, DECISIONS_FILE)
    if args['action'] == 'get':
        items, dropped, exists, updated = read_decisions(path)
        return {'ok': True, 'action': 'get', 'schema': DECISIONS_SCHEMA, 'updated': updated, 'items': items, 'dropped': dropped, 'exists': exists}
    bad = [k for k, v in args['items'].items() if not QID.fullmatch(k) or decision_entry(v) is None]
    if bad:
        return {'ok': False, 'action': 'set', 'reason': 'bad-items', 'bad': bad[:BAD_MAX]}
    items = merged(read_decisions(path)[0], {k: decision_entry(v) for k, v in args['items'].items()}, args.get('drop'))
    if items is None:
        return {'ok': False, 'action': 'set', 'reason': 'too-many'}
    doc = {'schema': DECISIONS_SCHEMA, 'updated': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'items': {k: items[k] for k in sorted(items)}}
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
    job.log(f'recette : {len(items)} réponse(s) aux points à trancher')
    return {'ok': True, 'action': 'set', 'count': len(items), 'updated': doc['updated']}


VERBS = {
    ('recette', 'verdict'): (verdict, check),
    ('recette', 'decision'): (decision, check_decision),
}
