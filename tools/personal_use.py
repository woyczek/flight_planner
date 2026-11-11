"""La coche « Je certifie utiliser les données pour mon usage personnel », tenue PAR LE LANCEUR (SOG-0238, 11 novembre 2026).

Jusqu'ici la coche vivait dans le cache de la page (cache/data/personal.json) et chaque appel la déclarait (`personal: true`) : n'importe quel code de page pouvait la passer. Le lanceur la tient maintenant lui-même, dans
data/local/personal_use.json { certified: bool, at: 'AAAA-MM-JJThh:mm:ssZ', migrated?: true } : data/local/ n'est servi à personne (hidden()), jamais synchronisé ni commité ; SEUL le lanceur l'écrit, par la route
POST /__setup/personal (ce poste seulement) quand l'utilisateur coche ou décoche. Un verbe qui lit des données sous licence personnelle (proc/lnm) lit CE fichier et ignore ce que la page dit.
Limite dite : un script de la MÊME origine peut aussi appeler la route d'écriture ; le gain est contre l'oubli et le code de page qui déclare à la place de l'utilisateur, pas contre un script hostile de la page.
`migrated: true` : la coche déjà posée dans le cache de la page, reportée UNE fois à l'ouverture de Données (le geste de l'utilisateur, daté) ; ensuite seul un clic l'écrit. Bibliothèque standard seulement."""
import json
import os
import time

FILE = ('local', 'personal_use.json')


def path(data):
    return os.path.join(data, *FILE)


def read(data):
    """{ certified: bool, at: str | None, migrated?: True } ; { certified: False, at: None } sans fichier ou avec un fichier illisible (jamais une erreur : sans coche réelle, rien n'est lu)."""
    try:
        with open(path(data), encoding='utf-8') as f:
            v = json.load(f)
    except (OSError, ValueError):
        return {'certified': False, 'at': None}
    if not isinstance(v, dict) or v.get('certified') is not True:
        return {'certified': False, 'at': v.get('at') if isinstance(v, dict) and isinstance(v.get('at'), str) else None}
    return {'certified': True, 'at': v.get('at') if isinstance(v.get('at'), str) else None, **({'migrated': True} if v.get('migrated') is True else {})}


def certified(data):
    return read(data)['certified']


def exists(data):
    return os.path.isfile(path(data))


def check(body):
    """Le corps de POST /__setup/personal, STRICT : { certified: booléen } ou, pour le report unique du cache de la page, { certified: true, migrated: true } ; autre chose : None (400)."""
    if not isinstance(body, dict) or not isinstance(body.get('certified'), bool):
        return None
    extra = set(body) - {'certified'}
    if not extra:
        return {'certified': body['certified'], 'migrated': False}
    if extra == {'migrated'} and body['migrated'] is True and body['certified'] is True:
        return {'certified': True, 'migrated': True}
    return None


def write(data, certified, migrated=False, now=None):
    """Écrit d'un coup (data/local/personal_use.json) ; rend l'état écrit. Un report (migrated) n'est accepté que si le fichier n'existe pas encore : sinon rend None, rien n'est écrit."""
    if migrated and exists(data):
        return None
    at = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(now if now is not None else time.time()))
    rec = {'certified': bool(certified), 'at': at, **({'migrated': True} if migrated else {})}
    p = path(data)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p + '.tmp', 'w', encoding='utf-8', newline='\n') as f:
        f.write(json.dumps(rec, ensure_ascii=False) + '\n')
    os.replace(p + '.tmp', p)
    return rec
