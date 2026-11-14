"""Le cache des RÉSULTATS du calcul de route, sur le poste (SOG-0296, refus de l'utilisateur du 13 novembre 2026 : « oui, il faut garder un cache, qui périme uniquement au changement d'airac, ou s'il passe par les nats »).

Le contexte chargé (plan.context) évite de relire la base ; il ne dispense PAS de chercher la route : mesuré sur LFOE → KDEN, forme de l'écran de Carburant (`alternatives`, `proposals`), contexte réutilisé :
26 s à chaque demande, la même demande refaite coûtait autant. Ici le RÉSULTAT d'une demande est gardé : une demande identique (départ, arrivée, niveau, date, pistes, points imposés, options : TOUS les champs de la demande)
rend le résultat gardé, avec `cache: { hit, computedAt, until }` pour que l'écran dise « du cache, calculé à … ».

Ce qui le périme : (1) un fichier de la base qui change (sia/base, proc, la couche NAT, les deux classeurs RAD et FRA : l'empreinte de plan.fingerprint, qui change à un changement d'AIRAC, une base reconstruite, une
procédure relue, un classeur importé, un nouveau message NAT) ; (2) le code du moteur qui change (un lanceur mis à jour ne rend pas un résultat de l'ancien code) ; (3) une route PAR LES NAT : la fin du jour UTC du calcul
(les tracks changent chaque jour : `until`). Rien d'autre : pas de durée fixe. Un résultat qui n'est pas `ok` n'est jamais gardé.

Où : data/local/route-cache/<empreinte de la demande>.json (le dossier local du poste : jamais synchronisé ni publié), 64 fichiers au plus (les plus anciens partent), 4 Mo au plus chacun, écriture atomique. Un fichier de ce
dossier est une entrée non fiable : taille bornée, JSON seulement, version, clé, empreinte et échéance vérifiées, sinon ignoré (le calcul est refait). Bibliothèque standard."""
import datetime as dt
import hashlib
import json
import math
import os
import re

VERSION = 1
ENABLED = True                    # les essais du CONTEXTE (K238) le coupent : sans cela le second appel ne demanderait même pas le contexte
MAX_FILES = 64
MAX_BYTES = 4_000_000
MAX_DEPTH = 32                     # un résultat honnête est peu imbriqué ; un fichier plus profond est refusé (audit 205)
ENTRY = re.compile(r'[0-9a-f]{64}\.(?:json|tmp)')      # les seuls noms que ce dossier écrit : prune() ne touche à aucun autre fichier
FOLDER = ('local', 'route-cache')
_HERE = os.path.dirname(os.path.abspath(__file__))
_STAMP = {}


def folder(data):
    return os.path.join(str(data), *FOLDER)


def code_stamp():
    """Une empreinte du code du moteur (nom, date, taille de ses .py) : un lanceur mis à jour ne rend pas un résultat de l'ancien code."""
    if 'v' not in _STAMP:
        items = []
        for e in sorted(os.scandir(_HERE), key=lambda e: e.name):
            if e.name.endswith('.py') and e.is_file():
                st = e.stat()
                items.append((e.name, st.st_mtime_ns, st.st_size))
        _STAMP['v'] = hashlib.sha1(repr(items).encode()).hexdigest()
    return _STAMP['v']


def signature(data, rad_file, fra_file):
    """L'empreinte de ce dont le résultat dépend : les fichiers de la base (plan.fingerprint, sur ces chemins) et le code du moteur."""
    from route_engine import plan, engine, fra
    old = engine.DATA_DIR, engine.RAD_FILE, fra.FRA_FILE
    engine.DATA_DIR, engine.RAD_FILE, fra.FRA_FILE = data, rad_file, fra_file
    try:
        return plan.fingerprint() + code_stamp()
    finally:
        engine.DATA_DIR, engine.RAD_FILE, fra.FRA_FILE = old


def key(args):
    """L'empreinte de la demande : TOUS ses champs, ordonnés (une demande qui diffère d'un champ est une autre demande)."""
    return hashlib.sha256(json.dumps(args, sort_keys=True, separators=(',', ':'), ensure_ascii=True, default=str).encode()).hexdigest()


def uses_nat(res):
    """Le résultat passe-t-il par une route NAT ? (une alternative ou un tronçon marqué `nat`)"""
    if not isinstance(res, dict):
        return False
    alts = res.get('alternatives') or []
    segs = list(res.get('segments') or []) + [s for a in alts if isinstance(a, dict) for s in (a.get('segments') or [])]
    return any(isinstance(a, dict) and a.get('nat') for a in alts) or any(isinstance(s, dict) and s.get('nat') for s in segs)


def _iso(t):
    return t.astimezone(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def until_of(res, now):
    """L'échéance : la fin du jour UTC pour une route par les NAT, sinon None (le changement de la base ou du code)."""
    if not uses_nat(res):
        return None
    return _iso((now + dt.timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0))


def _sound(doc):
    """Le document est-il sain ? profondeur ≤ MAX_DEPTH et AUCUN nombre non fini (NaN, Infinity, 1e999 : un fichier compilé n'en porte jamais ; renvoyé au navigateur il casserait le JSON). Parcours itératif : jamais de récursion sur un fichier hostile."""
    stack = [(doc, 1)]
    while stack:
        v, d = stack.pop()
        if d > MAX_DEPTH:
            return False
        if isinstance(v, float) and not math.isfinite(v):
            return False
        if isinstance(v, dict):
            stack.extend((x, d + 1) for x in v.values())
        elif isinstance(v, list):
            stack.extend((x, d + 1) for x in v)
    return True


def _refuse_constant(name):
    raise ValueError('nombre non fini : ' + name)


def load(data, k, sig, now=None):
    """(résultat, { computedAt, until }) gardé pour cette demande, ou None : fichier absent, trop gros, illisible, d'une autre version, d'une autre empreinte, échu."""
    if not ENABLED:
        return None
    now = now or dt.datetime.now(dt.timezone.utc)
    path = os.path.join(folder(data), k + '.json')
    try:
        if os.path.getsize(path) > MAX_BYTES:
            return None
        with open(path, encoding='utf-8') as f:
            doc = json.load(f, parse_constant=_refuse_constant)
    except (OSError, ValueError, RecursionError, MemoryError):          # RecursionError : un fichier très imbriqué (audit 205) est un fichier illisible, le calcul est refait
        return None
    if not _sound(doc) or not isinstance(doc, dict) or doc.get('version') != VERSION or doc.get('key') != k or doc.get('sig') != sig or not isinstance(doc.get('result'), dict) or doc['result'].get('ok') is not True:
        return None
    at, until = doc.get('computedAt'), doc.get('until')
    if not isinstance(at, str) or (until is not None and (not isinstance(until, str) or until <= _iso(now))):
        return None
    try:
        os.utime(path)                                   # le plus récemment utilisé reste
    except OSError:
        pass
    return doc['result'], {'computedAt': at, 'until': until}


def store(data, k, sig, res, now=None):
    """Garde un résultat `ok` ; rend { computedAt, until } (rien d'écrit pour un échec, un résultat trop gros ou un dossier non inscriptible)."""
    now = now or dt.datetime.now(dt.timezone.utc)
    if not ENABLED or not isinstance(res, dict) or res.get('ok') is not True:
        return None
    meta = {'computedAt': _iso(now), 'until': until_of(res, now)}
    try:
        raw = json.dumps({'version': VERSION, 'key': k, 'sig': sig, **meta, 'result': res}, ensure_ascii=False, allow_nan=False, separators=(',', ':')).encode('utf-8')
        if len(raw) > MAX_BYTES:
            return meta
        d = folder(data)
        os.makedirs(d, exist_ok=True)
        tmp = os.path.join(d, k + '.tmp')
        with open(tmp, 'wb') as f:
            f.write(raw)
        os.replace(tmp, os.path.join(d, k + '.json'))
        prune(d)
    except (OSError, ValueError, TypeError):
        pass
    return meta


def prune(d):
    """Au plus MAX_FILES entrées : les moins récemment utilisées partent ; les restes d'écriture (.tmp) aussi."""
    try:
        files = sorted((e for e in os.scandir(d) if e.is_file(follow_symlinks=False) and ENTRY.fullmatch(e.name)), key=lambda e: e.stat().st_mtime)
    except OSError:
        return
    for e in files:
        if e.name.endswith('.tmp') or len(files) > MAX_FILES:
            try:
                os.remove(e.path)
            except OSError:
                continue
            if not e.name.endswith('.tmp'):
                files = [x for x in files if x.path != e.path]
