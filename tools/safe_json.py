"""Lecture d'un fichier JSON NON FIABLE, bornée : un seul endroit pour la garde (SOG-0468, a).

Tout fichier du dépôt de données est écrit par n'importe quel pilote (§ 10.36) : il peut être énorme, imbriqué sur des dizaines de
milliers de niveaux (RecursionError), contenir NaN / Infinity (que `json` accepte par défaut et que la comparaison laisse passer en
silence), être un lien, un tube ou un fichier qui grossit pendant la lecture. Ce module lit un fichier en UN passage borné, sans
jamais lever : `read` dit POURQUOI il n'a rien rendu, `load` rend la valeur ou le repli.

API :
  read(path, max_bytes, *, encoding='utf-8-sig') -> (valeur, raison)   raison : '' (lu), 'missing' (absent ou pas un fichier),
      'size' (au-delà de max_bytes), 'unreadable' (JSON invalide, NaN / Infinity, trop imbriqué, mémoire, encodage, accès)
  load(path, max_bytes, default=None, *, encoding='utf-8-sig') -> la valeur, ou `default` quand `read` donne une raison
  loads(text) -> (valeur, raison)   le même contrôle sur un texte déjà lu ('unreadable' seulement)

Un site qui avait sa propre garde `except (OSError, ValueError, RecursionError, MemoryError)` autour de `json.load` s'en sert à la
place ; le cas K469 interdit d'en écrire une nouvelle ailleurs (hors la liste des sites encore à migrer, qui ne fait que diminuer).
"""
import json
import os


def _refuse(name):
    """`parse_constant` : NaN, Infinity et -Infinity ne sont pas du JSON ; un fichier qui en porte est illisible."""
    raise ValueError(f'constante refusée : {name}')


def loads(text):
    """(valeur, raison) d'un texte JSON : jamais d'exception ; '' si lu, 'unreadable' sinon."""
    try:
        return json.loads(text, parse_constant=_refuse), ''
    except (ValueError, RecursionError, MemoryError, TypeError):
        return None, 'unreadable'


def read(path, max_bytes, *, encoding='utf-8-sig'):
    """(valeur, raison) du fichier `path` (voir l'en-tête). La taille est bornée deux fois : avant la lecture (`stat`) et pendant
    (on ne lit jamais plus de max_bytes + 1 octets : un fichier qui grossit, un tube, un périphérique n'échappent pas à la borne)."""
    try:
        limit = int(max_bytes)
        if limit < 0:
            return None, 'unreadable'
        st = os.stat(path)
        if not os.path.isfile(path):
            return None, 'missing'
        if st.st_size > limit:
            return None, 'size'
        with open(path, 'rb') as f:
            raw = f.read(limit + 1)
        if len(raw) > limit:
            return None, 'size'
        return loads(raw.decode(encoding))
    except FileNotFoundError:
        return None, 'missing'
    except (OSError, ValueError, MemoryError, RecursionError, TypeError):
        return None, 'unreadable'


def load(path, max_bytes, default=None, *, encoding='utf-8-sig'):
    """La valeur du fichier, ou `default` quand il manque, est trop gros ou illisible (voir `read`)."""
    value, why = read(path, max_bytes, encoding=encoding)
    return default if why else value
