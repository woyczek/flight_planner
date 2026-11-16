"""Le fichier des bornes des bibliothèques Python en option (tools/requirements-optional.txt, SOG-0376) : UN lecteur, strict.

Deux lecteurs seulement, celui-ci pour l'un et pour l'autre : tools/pdf_guard.py (l'état, sans rien importer) et tools/install_libs.py (le script d'installation lancé par l'utilisateur). Avis de Sécurisation (16/11/2026), toutes les
conditions sont tenues ici :
  · chaque ligne de bibliothèque est validée par un motif STRICT « nom>=minimum,<maximum » (le maximum est facultatif), le nom étant dans la liste FERMÉE ALLOWED ; une ligne de commande de pip (-e, -r, --index-url, --extra-index-url,
    --hash…), une URL, un dépôt (git+…), un chemin, une marque d'environnement ou un nom hors liste REFUSE LE FICHIER ENTIER (jamais d'« ignorer la ligne » : un fichier douteux n'installe rien) ;
  · les groupes sont ceux de GROUPS (« # group: pdf » ou « # group: ocr ») ; une bibliothèque hors groupe, un groupe répété ou un nom répété est refusé ;
  · le fichier est lu en UTF-8, borné (MAX_BYTES, MAX_LINES) ; les notes (« # … ») sont libres.
Bibliothèque standard seulement ; n'importe aucune des bibliothèques qu'il décrit."""
import os
import re

FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'requirements-optional.txt')
ALLOWED = ('pypdf', 'pdfplumber', 'Pillow', 'pdfminer.six', 'pypdfium2', 'rapidocr-onnxruntime')      # la liste FERMÉE des noms : un nom qui n'y est pas refuse le fichier
GROUPS = ('pdf', 'ocr')
MAX_BYTES = 8192
MAX_LINES = 80
_VERSION = r'\d{1,8}(?:\.\d{1,4}){0,3}'
LINE = re.compile(r'(?P<name>[A-Za-z][A-Za-z0-9.-]{0,40})>=(?P<min>' + _VERSION + r')(?:,<(?P<max>' + _VERSION + r'))?', re.A)
GROUP_LINE = re.compile(r'# group: (?P<id>[a-z]{2,8})', re.A)


def parse(text):
    """[{ id, packages: [(nom, minimum, maximum ou None)] }] dans l'ordre du fichier ; ValueError, avec le numéro de la ligne, au premier écart."""
    if not isinstance(text, str) or len(text.encode('utf-8', 'replace')) > MAX_BYTES:
        raise ValueError(f'le fichier des bornes est trop gros ({MAX_BYTES} octets au plus)')
    lines = text.replace('\r\n', '\n').split('\n')
    if len(lines) > MAX_LINES:
        raise ValueError(f'le fichier des bornes a trop de lignes ({MAX_LINES} au plus)')
    groups, seen = [], set()
    for number, raw in enumerate(lines, 1):
        line = raw.strip()
        if not line:
            continue
        if line.startswith('#'):
            m = GROUP_LINE.fullmatch(line)
            if line.startswith('# group:') and not m:
                raise ValueError(f'ligne {number} : un groupe se note « # group: pdf » ou « # group: ocr »')
            if m:
                if m.group('id') not in GROUPS or any(g['id'] == m.group('id') for g in groups):
                    raise ValueError(f'ligne {number} : groupe inconnu ou répété')
                groups.append({'id': m.group('id'), 'packages': []})
            continue
        m = LINE.fullmatch(line)
        if not m or m.group('name') not in ALLOWED:
            raise ValueError(f'ligne {number} : seule la forme « nom>=minimum,<maximum » d’une bibliothèque de la liste fermée est admise (ni option de pip, ni adresse, ni chemin)')
        if not groups:
            raise ValueError(f'ligne {number} : une bibliothèque hors d’un groupe')
        if m.group('name') in seen:
            raise ValueError(f'ligne {number} : bibliothèque répétée')
        seen.add(m.group('name'))
        groups[-1]['packages'].append((m.group('name'), m.group('min'), m.group('max')))
    if not groups or any(not g['packages'] for g in groups):
        raise ValueError('un groupe vide, ou aucun groupe')
    return groups


def load(path=None):
    """Les groupes du fichier des bornes (parse) ; ValueError s'il est illisible ou refusé."""
    try:
        with open(path or FILE, 'rb') as f:
            raw = f.read(MAX_BYTES + 1)
        return parse(raw.decode('utf-8'))
    except (OSError, UnicodeDecodeError) as e:
        raise ValueError(f'le fichier des bornes ne se lit pas : {type(e).__name__}') from None


def minima(groups):
    """((nom, minimum, maximum ou None), …) de tous les groupes, dans l'ordre du fichier."""
    return tuple(p for g in groups for p in g['packages'])


def spec(package):
    """« nom>=minimum,<maximum » d'un (nom, minimum, maximum) : l'argument donné à pip, jamais lu d'ailleurs."""
    name, lo, hi = package
    return f'{name}>={lo}' + (f',<{hi}' if hi else '')
