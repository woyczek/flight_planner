"""Le jeu « stats » du lanceur : la lecture des journaux du Fuel Phase Monitor dans le dossier Output de X-Plane (V3 § 10.37 C, SOG-0052 étape 2) — chargé par regen_jobs.load_verbs().

Un verbe, `stats/output` { action, folder?, name? } (ce poste seulement, comme tous les travaux), quatre actions :
  · `status` : { ok, set, exists, label, files: [{ name, size, mtime }] } — le réglage du poste « dossier Output » et les journaux qu'il contient (`FuelPhaseMonitor*.csv`, `.csv.gz`) ;
  · `set` { folder } : règle le dossier (un chemin absolu, qui existe, hors du dossier des données et de la suite) ; écrit data/local/xp_output.json (local/ : jamais versionné, jamais publié) ;
  · `clear` : efface le réglage ;
  · `read` { name } : { ok, name, size, _text } — le texte du journal, lu par le lanceur (64 Mo au plus ; un .gz décompressé, sous le même plafond), que la page donne à modules/stats/phases.js.
Règles : X-Plane reste LOCAL (§ 10.37 A) : le dossier n'est jamais publié, jamais écrit dans data/ hors local/, et **son chemin n'est jamais rendu entier** (`label` : les deux derniers noms, « X-Plane 12/Output ») ; les
échantillons ne sont jamais écrits : le texte est dans la clé `_text` du résultat, que le socle ne garde pas dans le fichier du dernier travail (regen_jobs.Jobs._save : une clé qui commence par « _ » n'est pas
conservée). Un nom de fichier est un nom seul qui répond au motif des journaux : ni séparateur, ni « .. », ni lien qui sorte du dossier."""
import gzip
import json
import os
import re
import sys
import time

TOOLS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAX_BYTES = 64 * 1024 * 1024      # comme modules/stats/phases.js (le texte, après décompression)
MAX_FILES = 500
NAME = re.compile(r'^FuelPhaseMonitor[A-Za-z0-9_.-]{0,100}\.csv(\.gz)?$')
SETTING = ('local', 'xp_output.json')


def check(a):
    """Contrôle d'arguments (→ 400 si None) : { action: status | set | clear | read, folder? (set), name? (read) } et rien d'autre."""
    if not isinstance(a, dict) or a.get('action') not in ('status', 'set', 'clear', 'read'):
        return None
    act = a['action']
    allowed = {'action'} | ({'folder'} if act == 'set' else {'name'} if act == 'read' else set())
    if set(a) != allowed:
        return None
    if act == 'set' and not (isinstance(a['folder'], str) and 0 < len(a['folder']) <= 500 and '\x00' not in a['folder']):
        return None
    if act == 'read' and not (isinstance(a['name'], str) and NAME.fullmatch(a['name'])):
        return None
    return dict(a)


def _setting_path(data):
    return os.path.join(data, *SETTING)


def _folder(data):
    """Le dossier réglé, '' s'il ne l'est pas ou s'il n'existe plus."""
    try:
        with open(_setting_path(data), encoding='utf-8') as f:
            v = json.load(f)
    except (OSError, ValueError):
        return ''
    p = v.get('folder') if isinstance(v, dict) else ''
    return p if isinstance(p, str) and p and os.path.isdir(p) else ''


def label(path):
    """Les deux derniers noms du chemin (« X-Plane 12/Output »), jamais le chemin entier."""
    parts = [x for x in re.split(r'[\\/]+', str(path)) if x]
    return '/'.join(parts[-2:])


def _inside(child, parent):
    c, p = os.path.normcase(os.path.realpath(child)), os.path.normcase(os.path.realpath(parent))
    return c == p or c.startswith(p.rstrip(os.sep) + os.sep)


def _files(folder):
    out = []
    try:
        names = sorted(os.listdir(folder))
    except OSError:
        return out
    for n in names:
        p = os.path.join(folder, n)
        if NAME.fullmatch(n) and os.path.isfile(p) and not os.path.islink(p):
            try:
                st = os.stat(p)
            except OSError:
                continue
            out.append({'name': n, 'size': st.st_size, 'mtime': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(st.st_mtime))})
        if len(out) >= MAX_FILES:
            break
    return out


def _status(data):
    folder = _folder(data)
    return {'ok': True, 'set': bool(folder), 'exists': bool(folder), 'label': label(folder) if folder else '', 'files': _files(folder) if folder else []}


def _read(data, name):
    folder = _folder(data)
    if not folder:
        return {'ok': False, 'reason': 'no-folder', 'message': 'the Output folder is not set on this workstation'}
    path = os.path.join(folder, name)
    if not os.path.isfile(path) or os.path.islink(path) or not _inside(path, folder):
        return {'ok': False, 'reason': 'no-file', 'message': 'no such journal in the Output folder'}
    size = os.path.getsize(path)
    try:
        if name.endswith('.gz'):
            with gzip.open(path, 'rb') as f:
                raw = f.read(MAX_BYTES + 1)
        else:
            if size > MAX_BYTES:
                return {'ok': False, 'reason': 'too-large', 'message': f'the journal is over {MAX_BYTES // 1048576} MB'}
            with open(path, 'rb') as f:
                raw = f.read(MAX_BYTES + 1)
    except (OSError, EOFError, gzip.BadGzipFile):
        return {'ok': False, 'reason': 'unreadable', 'message': 'the journal cannot be read'}
    if len(raw) > MAX_BYTES:
        return {'ok': False, 'reason': 'too-large', 'message': f'the journal is over {MAX_BYTES // 1048576} MB'}
    return {'ok': True, 'name': name, 'size': len(raw), '_text': raw.decode('utf-8', 'replace')}


def output(job, args, ctx):
    data, act = ctx['data'], args['action']
    if act == 'status':
        return _status(data)
    if act == 'clear':
        try:
            os.remove(_setting_path(data))
        except OSError:
            pass
        return _status(data)
    if act == 'read':
        return _read(data, args['name'])
    folder = os.path.abspath(os.path.expanduser(args['folder']))      # set
    if not os.path.isdir(folder):
        return {'ok': False, 'reason': 'no-folder', 'message': 'that folder does not exist'}
    root = os.path.dirname(TOOLS)
    if _inside(folder, data) or _inside(folder, root) or _inside(data, folder) or _inside(root, folder):
        return {'ok': False, 'reason': 'refused', 'message': 'the data folder and the suite folder cannot be the Output folder'}
    path = _setting_path(data)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8', newline='\n') as f:
        json.dump({'folder': folder}, f, ensure_ascii=False)
    os.replace(tmp, path)
    return _status(data)


VERBS = {('stats', 'output'): (output, check)}
