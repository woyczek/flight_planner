"""Mémoire des empreintes des fichiers de data/, gardée sur le poste (SOG-0400, « état des données du lanceur »).

Le lanceur donne à la page l'empreinte git de chaque fichier de data/ (GET /__setup/changes). La calculer coûte une lecture de chaque
fichier : 30 à 46 s pour 9 000 fichiers à froid, 25 ms quand la mémoire est chaude (SOG-0164). La mémoire vivait en RAM : chaque démarrage
du lanceur repartait à froid. Elle est maintenant écrite dans data/local/frame_tree.json (le dossier local du poste : hors de l'arbre
donné à la page, jamais servi ni synchronisé) et relue au démarrage ; ne sont recalculés que les fichiers dont la taille ou la date a changé.

Le lanceur est le seul écrivain, et il RELIT son fichier comme une entrée non sûre : le dossier local ni lien ni jonction et son chemin réel
sous le data/ réel, taille bornée avant lecture, forme vérifiée entrée par entrée, tout défaut (dossier, taille, JSON, JSON trop imbriqué,
version, une seule entrée mal formée) = démarrage à froid, rien n'est repris à moitié, et `load` ne lève JAMAIS : le démarrage du lanceur n'en
dépend pas. Une empreinte fausse mais de bonne forme (taille et date égales) ne ferait que donner une mauvaise « révision » à un fichier que
la page lit de toute façon par son chemin ; elle ne fait ni lire ni exécuter autre chose, et qui peut écrire dans data/local/ écrit déjà tout data/.

Bibliothèque standard seulement."""
import json
import os
import re
import tempfile

VERSION = 1
MAX_BYTES = 32 * 2 ** 20      # la mémoire de 10 000 fichiers fait ~1,2 Mo
MAX_ENTRIES = 400_000
MAX_KEY = 600
_SHA = re.compile(r'[0-9a-f]{40}')   # avec fullmatch : « 40 hexadécimaux + saut de ligne » n'en est pas une
_BAD_KEY = re.compile(r'[\x00-\x1f\x7f\x5c]|(^|/)\.\.?(/|$)|^/|//')
_REPARSE = 0x400   # FILE_ATTRIBUTE_REPARSE_POINT : lien symbolique ou jonction (Windows)


def path_of(data):
    return os.path.join(data, 'local', 'frame_tree.json')


def _int(v):
    return isinstance(v, int) and not isinstance(v, bool) and 0 <= v < 2 ** 62


def _local_ok(data):
    """Le dossier local de data/ est un vrai dossier (ni lien ni jonction) dont le chemin réel est sous le data/ réel ; absent = vrai (save le crée,
    puis le contrôle est refait)."""
    d = os.path.join(data, 'local')
    if not os.path.lexists(d):
        return True
    if os.path.islink(d) or (hasattr(os.path, 'isjunction') and os.path.isjunction(d)):
        return False
    try:
        if getattr(os.lstat(d), 'st_file_attributes', 0) & _REPARSE or not os.path.isdir(d):
            return False
        real, root = os.path.normcase(os.path.realpath(d)), os.path.normcase(os.path.realpath(data))
        return real.startswith(root + os.sep)
    except OSError:
        return False


def load(data):
    """{ chemin relatif: ((taille, date en ns), empreinte) } — vide au moindre défaut ; ne lève jamais."""
    try:
        return _load(data)
    except Exception:   # RecursionError (JSON très imbriqué), MemoryError, tout autre défaut : « illisible », démarrage à froid
        return {}


def _load(data):
    p = path_of(data)
    if not _local_ok(data) or os.path.islink(p) or not os.path.isfile(p) or os.path.getsize(p) > MAX_BYTES:
        return {}
    with open(p, 'rb') as f:
        doc = json.loads(f.read(MAX_BYTES + 1).decode('utf-8'))
    if not isinstance(doc, dict) or doc.get('v') != VERSION or not isinstance(doc.get('files'), dict) or len(doc['files']) > MAX_ENTRIES:
        return {}
    out = {}
    for k, v in doc['files'].items():
        if (not isinstance(k, str) or not k or len(k) > MAX_KEY or _BAD_KEY.search(k)
                or not isinstance(v, list) or len(v) != 3 or not _int(v[0]) or not _int(v[1]) or not isinstance(v[2], str) or not _SHA.fullmatch(v[2])):
            return {}
        out[k] = ((v[0], v[1]), v[2])
    return out


def save(data, memo):
    """Écrit la mémoire (fichier temporaire du même dossier, puis remplacement) ; vrai si elle est écrite, jamais d'exception. Refuse (faux) un dossier
    local qui serait un lien ou une jonction, ou sortirait de data/ : rien n'est écrit à travers lui."""
    p = path_of(data)
    try:
        if not _local_ok(data):
            return False
        os.makedirs(os.path.dirname(p), exist_ok=True)
        if not _local_ok(data):   # créé à l'instant (ou changé entre-temps) : contrôlé encore
            return False
        doc = {'v': VERSION, 'files': {k: [m[0][0], m[0][1], m[1]] for k, m in list(memo.items())}}
        fd, tmp = tempfile.mkstemp(prefix='.frame_tree.', suffix='.tmp', dir=os.path.dirname(p))
        try:
            with os.fdopen(fd, 'w', encoding='utf-8') as f:
                json.dump(doc, f, separators=(',', ':'))
            os.replace(tmp, p)
        except BaseException:
            try:
                os.remove(tmp)
            except OSError:
                pass
            raise
        return True
    except Exception:
        return False
