"""Le jeu « pelican » du lanceur : l'import des positions de chargement des pélicandromes (SOG-0083) — chargé par regen_jobs.load_verbs().

Un verbe, `pelican/import` { dry?: vrai (par défaut), country?: 'fr', file?: { name, size } } : lit le fichier `pelicandromes_positions*.yaml` de Téléchargements (le motif vient d'ici, jamais un chemin de la page ; le plus récent), le
CONTRÔLE (c'est un fichier de l'utilisateur, donc non fiable : taille bornée, une grammaire YAML réduite, schéma `pelicandromes` version 1, datum WGS84, nombres bornés, textes nettoyés) et le COMPILE en
data/pelicandromes/<pays>.json, publié dans le dépôt des données (UN commit par le travail, au nom de l'auteur). Comme les autres imports : le passage à blanc (dry, par défaut) montre le fichier et ses sites sans rien
écrire ; la prise refuse un fichier qui n'est plus celui que le plan a montré (nom et taille).
Résultat { ok, dry, file: { name, size, sha256 } | null, sites, categories: { <catégorie>: n }, rejected: [{ index, error }], written, commit, reason? } ; reason : 'no-file' (rien dans Téléchargements), 'invalid' (le fichier
n'est pas un fichier de pélicandromes lisible : le message dit pourquoi), 'not-shown', 'changed', 'failed'.
Le fichier compilé : { schema: 'pelicandromes', version: 1, country, datum: 'WGS84', note, source: { name, size, sha256 }, sites: [{ name, icao, category, lat, lon, status, source, country }] } — rien d'horodaté (le même fichier
donne le même résultat, pas de commit pour rien). Les textes n'ont ni caractère de contrôle ni « < » ni « > » : à poser dans la page par textContent, jamais en HTML.
Python : bibliothèque standard seulement (une grammaire YAML réduite : un document, des scalaires, une liste d'enregistrements à plat ; tout le reste — ancres, étiquettes, flux { } [ ], blocs | > — est refusé)."""
import fnmatch
import hashlib
import json
import math
import os
import re
import sys

TOOLS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if TOOLS not in sys.path:
    sys.path.insert(0, TOOLS)
import regen_jobs  # noqa: E402  (le socle : commit_outputs, merge_pending, inside)

PATTERN = 'pelicandromes_positions*.yaml'
MAX_BYTES = 256 * 1024            # le fichier de l'utilisateur fait quelques Ko : au-delà, refusé avant d'être lu
MAX_SITES = 500
MAX_TEXT = 200
DATA_REL = 'pelicandromes'
COUNTRY = re.compile(r'^[a-z]{2}$')
NAME = re.compile(r'^[\w .()+-]{1,150}\Z', re.A)
ICAO = re.compile(r'^[A-Z0-9]{2,4}$')
NUMBER = re.compile(r'^[+-]?\d+(?:\.\d+)?$')
FORBIDDEN_START = '[{|>&*!%@`'


class Refused(ValueError):
    """Un fichier qui n'est pas un fichier de pélicandromes lisible (le message est dit tel quel au pilote)."""


# ----------------------------------------------------------------------------------------------------------------------- la grammaire YAML réduite
def _scalar(text, line):
    text = text.strip()
    if text[:1] in ('"', "'"):
        q = text[0]
        end = text.rfind(q)
        if end < 1 or text[end + 1:].strip() not in ('', ) and not text[end + 1:].strip().startswith('#'):
            raise Refused(f'ligne {line} : texte entre guillemets mal fermé')
        body = text[1:end]
        if q == '"':
            try:
                return json.loads(text[:end + 1])
            except ValueError:
                raise Refused(f'ligne {line} : échappement non reconnu') from None
        return body.replace("''", "'")
    text = re.split(r'\s#', text, maxsplit=1)[0].strip()
    if text[:1] in FORBIDDEN_START and text:
        raise Refused(f'ligne {line} : syntaxe YAML non prise en charge ({text[:1]})')
    if text in ('', 'null', '~', 'Null', 'NULL'):
        return None
    if text in ('true', 'false'):
        return text == 'true'
    if NUMBER.match(text):
        return float(text) if '.' in text else int(text)
    return text


def parse(text):
    """Le document → { clé: valeur, 'sites': [ { clé: valeur } ] } ; Refused si ce n'est pas la forme attendue (un document, des clés à plat, UNE liste d'enregistrements)."""
    doc, sites, current, in_sites, empty = {}, None, None, False, None   # empty : la colonne d'une clé sans valeur (un null) : une ligne plus indentée juste après serait une structure imbriquée
    for n, raw in enumerate(text.replace('\r\n', '\n').split('\n'), 1):
        if not raw.strip() or raw.lstrip().startswith('#'):
            continue
        if '\t' in raw[:len(raw) - len(raw.lstrip())]:
            raise Refused(f'ligne {n} : tabulation en début de ligne')
        if raw.strip() in ('---', '...'):
            continue
        m = re.match(r'^(?P<ind> *)(?P<dash>- +)?(?P<key>[A-Za-z_][\w-]*):(?: +(?P<val>.*))?$', raw.rstrip())
        if not m:
            raise Refused(f'ligne {n} : forme non reconnue')
        ind, dash, key, val = len(m['ind']), m['dash'], m['key'], m['val']
        if empty is not None and ind > empty:
            raise Refused(f'ligne {n} : structure imbriquée non prise en charge')
        empty = (ind + len(dash or '')) if val in (None, '') and not (ind == 0 and not dash and key == 'sites') else None
        if ind == 0 and not dash:
            in_sites = False
            if key == 'sites':
                if val not in (None, ''):
                    raise Refused(f'ligne {n} : « sites » est une liste, pas un texte')
                if sites is not None:
                    raise Refused(f'ligne {n} : « sites » deux fois')
                sites, in_sites = [], True
            elif key in doc:
                raise Refused(f'ligne {n} : « {key} » deux fois')
            else:
                doc[key] = _scalar(val or '', n)
            continue
        if not in_sites:
            raise Refused(f'ligne {n} : indentation hors de « sites »')
        if dash:
            current = {}
            sites.append(current)
        elif current is None:
            raise Refused(f'ligne {n} : un enregistrement commence par « - »')
        if key in current:
            raise Refused(f'ligne {n} : « {key} » deux fois dans un enregistrement')
        current[key] = _scalar(val or '', n)
        if len(sites) > MAX_SITES:
            raise Refused(f'plus de {MAX_SITES} sites')
    if sites is None:
        raise Refused('pas de liste « sites »')
    return {**doc, 'sites': sites}


# ----------------------------------------------------------------------------------------------------------------------- le contrôle des valeurs
def clean(value):
    """Un texte du fichier : sans caractère de contrôle, sans « < » ni « > », blancs ramenés à un, au plus MAX_TEXT signes ; '' si ce n'est pas un texte."""
    if not isinstance(value, str):
        return ''
    t = ''.join(ch for ch in value if ch.isprintable() and ch not in '<>')
    return re.sub(r'\s+', ' ', t).strip()[:MAX_TEXT]


def number(value, lo, hi):
    """Un nombre fini dans ses bornes (jamais un booléen ni un texte), arrondi à 7 décimales ; None sinon."""
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not lo <= value <= hi:
        return None
    return round(float(value), 7)


def site(raw, country):
    """Un enregistrement du fichier → le site compilé, ou une chaîne : la raison du refus."""
    name = clean(raw.get('nom'))
    lat, lon = number(raw.get('latitude'), -90, 90), number(raw.get('longitude'), -180, 180)
    if not name:
        return 'nom absent'
    if lat is None or lon is None:
        return 'latitude ou longitude absente ou hors bornes'
    icao = clean(raw.get('oaci')).upper()
    if icao and not ICAO.match(icao):
        return 'code OACI invalide'
    return {'name': name, 'icao': icao, 'category': clean(raw.get('categorie')), 'lat': lat, 'lon': lon, 'status': clean(raw.get('statut')), 'source': clean(raw.get('source')), 'country': country}


def compile_file(text, meta, country):
    """Le texte du fichier → (le document compilé, les enregistrements refusés [{ index, error }]) ; Refused si le fichier n'est pas de ce schéma."""
    doc = parse(text)
    if doc.get('schema') != 'pelicandromes':
        raise Refused('ce n’est pas un fichier « pelicandromes » (schema)')
    if doc.get('schema_version') != 1:
        raise Refused(f'version de schéma non prise en charge : {clean(str(doc.get("schema_version")))}')
    if str(doc.get('datum', '')).upper() != 'WGS84':
        raise Refused('datum : WGS84 attendu')
    sites, rejected = [], []
    for i, raw in enumerate(doc['sites']):
        got = site(raw, country)
        if isinstance(got, str):
            rejected.append({'index': i, 'error': got})
        else:
            sites.append(got)
    if not sites:
        raise Refused('aucun site lisible')
    return {'schema': 'pelicandromes', 'version': 1, 'country': country, 'datum': 'WGS84', 'note': clean(doc.get('note')), 'source': meta, 'sites': sites}, rejected


# ----------------------------------------------------------------------------------------------------------------------- pelican/import
def check(a):
    """Contrôle d'arguments (→ 400 si None) : { dry?: booléen (vrai par défaut), country?: 'fr', file?: { name, size } } et rien d'autre."""
    if not isinstance(a, dict) or not set(a) <= {'dry', 'country', 'file'}:
        return None
    dry, country, f = a.get('dry', True), a.get('country', 'fr'), a.get('file')
    if not isinstance(dry, bool) or not isinstance(country, str) or not COUNTRY.match(country):
        return None
    if f is not None and (not isinstance(f, dict) or set(f) != {'name', 'size'} or not isinstance(f['name'], str) or not NAME.match(f['name']) or not isinstance(f['size'], int) or isinstance(f['size'], bool) or f['size'] < 0):
        return None
    return {'dry': dry, 'country': country, **({'file': {'name': f['name'], 'size': f['size']}} if f is not None else {})}


def _latest(dirs):
    """Le fichier le plus récent de Téléchargements qui suit le motif (sans lien ni dossier), ou ''."""
    found = []
    for d in dirs:
        try:
            with os.scandir(d) as it:
                found += [e.path for e in it if fnmatch.fnmatch(e.name, PATTERN) and NAME.match(e.name) and e.is_file(follow_symlinks=False) and not e.is_symlink()]
        except OSError:
            continue
    return max(found, key=os.path.getmtime) if found else ''


def _read(path):
    size = os.path.getsize(path)
    if size > MAX_BYTES:
        raise Refused(f'fichier trop gros (plus de {MAX_BYTES // 1024} Ko)')
    with open(path, 'rb') as f:
        raw = f.read(MAX_BYTES + 1)
    try:
        text = raw.decode('utf-8-sig')
    except UnicodeDecodeError:
        raise Refused('le fichier n’est pas de l’UTF-8') from None
    if '\x00' in text:
        raise Refused('le fichier n’est pas un texte')
    return text, {'name': os.path.basename(path), 'size': size, 'sha256': hashlib.sha256(raw).hexdigest()}


def run(job, args, ctx):
    data, dry, country = ctx['data'], args['dry'], args['country']
    if not dry and regen_jobs.merge_pending(ctx):
        return {'ok': False, 'reason': 'failed', 'dry': dry, 'message': 'a merge is pending in data/ (interrupted synchronisation): nothing written; "Synchronise" settles it', 'file': None, 'sites': 0, 'written': False}
    path = _latest(list((ctx.get('downloads') or (lambda: []))()))
    if not path:
        return {'ok': False, 'reason': 'no-file', 'dry': dry, 'file': None, 'sites': 0, 'written': False, 'expected': PATTERN}
    job.step(os.path.basename(path), 0, 1, 'fichier')
    try:
        text, meta = _read(path)
        doc, rejected = compile_file(text, meta, country)
    except (Refused, OSError) as e:
        return {'ok': False, 'reason': 'invalid', 'dry': dry, 'file': {'name': os.path.basename(path), 'size': os.path.getsize(path)}, 'message': str(e)[:200], 'sites': 0, 'written': False}
    cats = {}
    for s in doc['sites']:
        cats[s['category'] or '—'] = cats.get(s['category'] or '—', 0) + 1
    res = {'ok': True, 'dry': dry, 'file': meta, 'sites': len(doc['sites']), 'categories': dict(sorted(cats.items())), 'rejected': rejected[:50], 'written': False, 'commit': None}
    if dry:
        return res
    want = args.get('file')
    if want is None:
        return {**res, 'ok': False, 'reason': 'not-shown', 'message': 'no file chosen: ask for the plan (dry) first, then pass the file to take'}
    if (want['name'], want['size']) != (meta['name'], meta['size']):
        return {**res, 'ok': False, 'reason': 'changed', 'message': 'the file is not the one the plan showed: ask for the plan again'}
    out = os.path.join(data, DATA_REL, f'{country}.json')
    if not regen_jobs.inside(os.path.dirname(out), os.path.realpath(data)):
        return {**res, 'ok': False, 'reason': 'failed', 'message': 'unsafe path'}
    body = json.dumps(doc, ensure_ascii=False, indent=1) + '\n'
    try:
        old = open(out, encoding='utf-8').read()
    except OSError:
        old = None
    if old != body:
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with open(out + '.tmp', 'w', encoding='utf-8', newline='\n') as f:
            f.write(body)
        os.replace(out + '.tmp', out)
        res['written'] = True
        done = regen_jobs.commit_outputs(ctx, getattr(job, 'author', ''), [f'{DATA_REL}/{country}.json'], f':card_file_box: Positions de chargement des pélicandromes compilées ({country}, {len(doc["sites"])} sites)')
        res['commit'] = done.get('commit')
        if done.get('warning'):
            job.log('git: ' + done['warning'])
    return res


VERBS = {('pelican', 'import'): (run, check)}
