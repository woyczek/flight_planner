"""Le synoptique monde (GFS) tenu à jour PAR LE LANCEUR (SOG-0525 (3)) : jusqu'ici une lecture ne partait que si la page appuyait sur le bouton ; un poste dont la page n'est pas ouverte, ou dont la lecture avait échoué, gardait une prévision de plus en plus ancienne.

Le gardien (Keeper) est un fil du lanceur, qui regarde une fois par minute (tick) s'il faut lancer le travail weather/world (tools/regen/weather.py) :
  · à compter du démarrage du lanceur, et à chaque nouveau run de GFS : le run attendu est celui dont l'heure (00, 06, 12, 18 Z) est passée depuis 4 h 30 (la NOAA publie les échéances en plusieurs heures) ; si la publication du poste est plus ancienne, ou absente : une lecture ;
  · après un échec (ou une lecture qui ne ramène pas le run attendu) : UNE seule tentative, au bout d'une attente qui double (1 h, 2 h, 3 h au plus) ; jamais de rafale ;
  · un plancher de 30 min entre deux départs automatiques, quoi qu'il se soit passé : la limite est la sienne (data/local/weather_auto.json, l'heure du départ est écrite AVANT de lancer), elle ne dépend pas de MIN_GAP du lanceur (qui ne protège plus après un échec sans lecture) et un redémarrage ne la remet pas à zéro ;
  · un lanceur occupé par un autre travail (refus 409) n'est pas une tentative : redemandé une minute plus tard ;
  · un téléchargement coupé par un redémarrage est un échec qui le dit (`interrupted`) et qui n'allonge pas l'attente ; les échéances déjà lues sont gardées par le travail (SOG-0429) et reprises ;
  · SOG_NO_WEATHER_AUTO=1 l'arrête (ligne facturée au volume).
Rien n'est lu ici hors de data/ ; la lecture de la NOAA reste celle du travail weather/world, qui contrôle ce qu'il écrit. `decide` est pur (essais, tests/v3/cases/aerodb.py K407) ; le dernier mot sur l'écran est dit par weather/world status (`auto`)."""
import json
import os
import threading
import time

FLOOR = 1800                 # secondes entre deux départs automatiques, au moins
BACKOFF_MAX = 3 * 3600       # l'attente après des échecs répétés ne dépasse pas cela
AVAILABLE = 4 * 3600 + 1800  # un run de GFS (heure nominale) est publié en entier à peu près 4 h 30 plus tard
RUN = 21600                  # un run toutes les six heures
STATE = ('local', 'weather_auto.json')    # data/local/ : jamais servi, jamais synchronisé
PUBLISHED = ('weather', 'world', 'index.json')
TICK = 60
ENV_OFF = 'SOG_NO_WEATHER_AUTO'


def enabled(env=None):
    """Le gardien est-il permis ? (SOG_NO_WEATHER_AUTO=1 l'arrête)"""
    env = os.environ if env is None else env
    return str(env.get(ENV_OFF, '')).strip().lower() not in ('1', 'true', 'yes', 'on')


def _int(v, lo=0, hi=4102444800):
    return v if isinstance(v, int) and not isinstance(v, bool) and lo <= v <= hi else None


def load(data):
    """L'état gardé { last_start, fails, reason?, inflight? } ; un fichier absent, illisible ou d'une autre forme : l'état vide (rien n'est cru sans contrôle)."""
    try:
        with open(os.path.join(str(data), *STATE), encoding='utf-8') as f:
            r = json.load(f)
    except (OSError, ValueError):
        return {}
    if not isinstance(r, dict):
        return {}
    out = {}
    if _int(r.get('last_start')):
        out['last_start'] = r['last_start']
    if _int(r.get('fails'), 0, 1000) is not None:
        out['fails'] = r['fails']
    if isinstance(r.get('reason'), str) and len(r['reason']) <= 30 and r['reason'].replace('-', '').replace('_', '').isalnum():
        out['reason'] = r['reason']
    if isinstance(r.get('inflight'), bool):
        out['inflight'] = r['inflight']
    return out


def save(data, st):
    """Écrit l'état (d'un coup) ; jamais d'erreur : le gardien ne doit pas tomber pour un disque plein."""
    path = os.path.join(str(data), *STATE)
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        tmp = path + '.tmp'
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump(st, f)
        os.replace(tmp, path)
    except OSError:
        pass


def published_run(data):
    """Le run (secondes) de la publication du poste (data/weather/world/index.json, lu comme une entrée non fiable), ou None."""
    try:
        with open(os.path.join(str(data), *PUBLISHED), encoding='utf-8') as f:
            r = json.load(f).get('run')
    except (OSError, ValueError, AttributeError):
        return None
    return _int(r)


def expected_run(now):
    """Le run que la NOAA a publié à `now` : le dernier dont l'heure est passée depuis AVAILABLE."""
    return (now - AVAILABLE) // RUN * RUN


def wait_after(fails):
    """L'attente entre deux départs : le plancher, doublé à chaque échec, BACKOFF_MAX au plus."""
    return min(FLOOR << min(max(fails, 0), 8), BACKOFF_MAX)


def decide(now, pub_run, st):
    """{ go, due, at } à `now` (s) : `due` (la publication est plus ancienne que le run attendu, ou absente), `go` (due et l'attente est passée), `at` (l'heure de la prochaine tentative : celle où l'attente finit si due, sinon celle du prochain run publié)."""
    st = st or {}
    last = _int(st.get('last_start'), 0) or 0
    last = min(last, now)      # une horloge qui a reculé ne repousse pas la tentative hors d'atteinte
    ready = last + wait_after(_int(st.get('fails'), 0, 1000) or 0) if last else now
    due = pub_run is None or pub_run < expected_run(now)
    nxt = expected_run(now) + RUN + AVAILABLE
    at = max(ready, now) if due else max(nxt, ready)
    return {'go': due and now >= ready, 'due': due, 'at': at}


def view(data, now=None):
    """Ce que dit weather/world status de la tenue à jour : { next, fails, last_start?, reason? }, ou None si le gardien n'a jamais tourné sur ce poste (pas de fichier d'état) ou n'est pas permis."""
    st = load(data)
    if not st or not enabled():
        return None
    now = int(time.time()) if now is None else now
    d = decide(now, published_run(data), st)
    return {'next': d['at'], 'due': d['due'], 'fails': st.get('fails', 0), **({'last_start': st['last_start']} if 'last_start' in st else {}), **({'reason': st['reason']} if 'reason' in st else {})}


class Keeper:
    """Le fil du lanceur : `start(set, verb, args)` lance un travail (Jobs.start), `view(id)` le lit (Jobs.view), `now` et `published` sont des crochets d'essai."""

    def __init__(self, data, start, view, now=time.time, published=None):
        self.data = data
        self.start = start
        self.view = view
        self.now = lambda: int(now())
        self.published = published or (lambda: published_run(data))
        self.job = None
        self.stop = threading.Event()
        st = load(data)
        if st.get('inflight'):
            # un téléchargement coupé par un arrêt du lanceur : un échec qui le dit ; l'attente ne grandit pas (ce n'est pas la NOAA qui a refusé), le plancher tient
            save(data, {**st, 'inflight': False, 'reason': 'interrupted'})

    def _end(self, v):
        """Le travail lancé est fini : l'état dit l'échec ou la réussite. Une lecture qui ne ramène pas le run attendu compte comme un échec (la NOAA n'a pas fini de publier)."""
        st = load(self.data)
        if v.get('state') == 'cancelled':
            # arrêté par un geste de la page (Jobs._yield_auto) ou par l'utilisateur : pas un échec de la NOAA, l'attente ne grandit pas, le plancher tient ; les échéances lues sont gardées
            save(self.data, {**st, 'inflight': False, 'reason': 'cancelled'})
            return
        r = v.get('result') if isinstance(v.get('result'), dict) else {}
        reason = r.get('reason') if isinstance(r.get('reason'), str) else ('' if v.get('state') == 'done' and r.get('ok') else (v.get('state') or 'failed'))
        reason = reason[:30] if reason and reason.replace('-', '').replace('_', '').isalnum() else ('' if r.get('ok') else 'failed')
        pub = self.published()
        fresh = pub is not None and pub >= expected_run(self.now())      # ce que dit la publication, pas le seul résultat du travail : une lecture manuelle entre-temps compte
        st['inflight'] = False
        if fresh:
            st.pop('reason', None)
            st['fails'] = 0
        else:
            st['fails'] = min(st.get('fails', 0) + 1, 1000)
            st['reason'] = reason or 'lag'
        save(self.data, st)

    def tick(self):
        """Un regard : finit le compte du travail lancé, puis lance le suivant s'il le faut."""
        if self.job:
            try:
                v = self.view(self.job)
            except Exception:
                v = None
            v = (v or {}).get('job') if isinstance(v, dict) and 'job' in v else v
            if isinstance(v, dict) and v.get('state') == 'running':
                return
            self.job = None
            if isinstance(v, dict) and v.get('state'):
                self._end(v)
            else:
                self._end({'state': 'lost', 'result': {}})      # le travail n'est plus là (sa place a été reprise par un autre) : ce que dit la publication décide
        now = self.now()
        st = load(self.data)
        if not decide(now, self.published(), st)['go']:
            return
        prev = dict(st)
        st.update(last_start=now, inflight=True)      # l'heure est écrite AVANT le départ : un arrêt brutal ne la perd pas
        save(self.data, st)
        try:
            r = self.start('weather', 'world', {'action': 'build'}, auto=True)      # auto : cède la place à tout geste de la page (Jobs._yield_auto)
        except Exception:
            r = {'ok': False, 'status': 500}
        if isinstance(r, dict) and r.get('ok'):
            self.job = r.get('job')
            return
        if isinstance(r, dict) and r.get('status') == 409:
            save(self.data, prev)      # le lanceur fait autre chose : pas une tentative, redemandé à la prochaine minute
            return
        # refusé autrement (délai du lanceur, 429…) : l'heure reste, le plancher tient
        st['inflight'] = False
        save(self.data, st)

    def run(self):
        """Le premier regard est tout de suite, DANS la garde comme les suivants : une exception (un JSON de data/ tordu, RecursionError, MemoryError) ne tue jamais le fil, il regarde encore une minute plus tard."""
        while True:
            try:
                self.tick()
            except Exception:
                pass
            if self.stop.wait(TICK):
                return


def begin(data, start, view):
    """Lance le gardien (un fil, démon) si permis ; le premier regard est tout de suite, dans la garde. Rend le Keeper, ou None."""
    if not enabled():
        return None
    k = Keeper(data, start, view)
    threading.Thread(target=k.run, name='weather-keeper', daemon=True).start()
    return k
