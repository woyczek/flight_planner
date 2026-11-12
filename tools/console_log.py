"""La console du lanceur (SOG-0265) : chaque ligne porte l'heure (HH:MM:SS, heure du poste) et les lignes IDENTIQUES qui se suivent se comptent au lieu de défiler.

`emit(msg)` écrit la ligne sur la sortie standard, aussitôt. Une ligne identique à la précédente n'est pas réécrite : elle est comptée ; à la première ligne différente, une ligne
« HH:MM:SS ↑ ×14 » dit combien de fois la précédente est venue. Une ligne vide (espacement) passe telle quelle et coupe la série. Bibliothèque standard seulement ; ne lève jamais.
"""
import sys
import threading
import time

_lock = threading.Lock()
_state = {'last': None, 'count': 0}


def _hms(now):
    return time.strftime('%H:%M:%S', time.localtime(now))


def emit(msg='', out=None, now=None):
    """Écrit `msg` (horodaté) ; rend la liste des lignes écrites (pour les essais)."""
    now = time.time() if now is None else now
    text = str(msg)
    written = []
    with _lock:
        if text.strip() and text == _state['last']:
            _state['count'] += 1
            return written
        if _state['count']:
            written.append(f"{_hms(now)} ↑ ×{_state['count'] + 1}")
        _state['last'], _state['count'] = (text if text.strip() else None), 0
        written.append(f'{_hms(now)} {text}' if text.strip() else text)
        stream = out if out is not None else sys.stdout
        try:
            stream.write('\n'.join(written) + '\n')
            stream.flush()
        except Exception:
            pass
    return written
