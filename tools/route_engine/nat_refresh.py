"""SOG-0394 (lot C) : relire la SOURCE des routes NAT AVANT de répondre, quand c'est l'heure du vol qui pose souci.

Le calcul de route (route/compute, tools/regen/route.py) ne relisait jamais la source : seule la page la relit (AeroDb.natEnsure) quand AUCUNE route n'est valable maintenant. Un message du jour encore valable maintenant, mais qui ne couvrira pas le passage
du vol (ex. : le message de 11 h 30-19 h 00 Z pour un vol vers l'est qui passe à 13 h 32 Z), ne déclenchait rien.

  · `before(data, request, ctx)` : un contrôle BON MARCHÉ sur les fichiers seuls (nat_tracks.json et nat_past.json, sans graphe) : le vol traverse l'Atlantique, l'heure de départ est donnée, et AUCUNE route du SENS du vol (du jour ou gardée) n'a sa fenêtre
    datée qui recoupe [départ, départ + durée estimée au grand cercle] → la source est relue (`tools/aero_fetch.py nat`, qui garde d'abord ce qui sort du fichier : lot B) ;
  · la relecture est BORNÉE (CONNECT_S pour se connecter, BOUND_S en tout : au-delà elle est dite échouée et la réponse part), comptée à part du budget de recherche (`timing.nat_refresh`), au plus une par MIN_GAP_S et par sens, échec compris ;
  · seul le lanceur le permet (`ctx['nat_refresh']`, posé par tools/launch.py) : un autre appelant ne relit jamais la source ; jamais hors du poste : `ctx['lan']` vrai → rien n'est relu, et la réponse le dit ; les cas mettent une SOURCE FAUSSE (`FETCH`) : aucun appel au réseau réel ;
  · `state(data, request, info)` : le champ `sections.nat` de la réponse : { sense, messages, fetched_at, age_s, refresh, why?, seconds?, tracks_in_sense, valid_at_passage } et, quand rien ne couvre le passage, la phrase qui le dit.
Le moteur lit le fichier au chargement du contexte ; l'empreinte du contexte (plan.fingerprint) change à l'écriture : la relecture est vue par la même demande."""
import datetime
import math
import os
import re
import sys
import threading
import time
from pathlib import Path

import safe_json

from . import nat_layer
from . import geo      # SOG-0468 (3)

BOUND_S = 4.0                    # la relecture entière : au-delà elle est dite échouée (la tâche reste en route, son écriture est atomique)
CONNECT_S = 2.0                  # se connecter (et chaque lecture de la socket)
MAX_POS_BYTES = 64_000_000        # aeroindex.json (data/sia/base : un pilote peut l'écrire) : au-delà il n'est pas lu
MAX_NAT_BYTES = nat_layer.MAX_BYTES      # nat_tracks.json : la même borne que le moteur
WHY = {      # SOG-0394 (lot C, Sécurisation) : un vocabulaire FERMÉ : la réponse ne porte jamais le texte d'une exception, d'un serveur ni un chemin ; le détail va au journal de la console du lanceur
    'timeout': 'la source n\'a pas répondu à temps',
    'source': 'la source est injoignable ou a refusé la demande',
    'format': 'la source a changé de format',
    'keep': 'les routes qui sortent du fichier n\'ont pas pu être gardées',
    'error': 'erreur interne',
}
LOG = None                       # le journal : une fonction (texte) ; None : la sortie d'erreur du lanceur
MIN_GAP_S = 300.0                # une relecture par sens et par cinq minutes au plus (un échec compte)
GROUND_KT = 450.0
MERIDIAN_GATE = (53.0, -30.0)    # SOG-0403 : le passage du 30° OUEST (comme tools/route_matrix.py : GATE_WEST / GATE_EAST)
WEST_LON, EAST_LON = -35.0, -15.0      # les mêmes limites que sections et nat_layer.hint
FETCH = None                     # la fonction de relecture (data, timeout) → (fichiers, erreurs) ; None : tools/aero_fetch.nat ; un cas y met une source fausse
_last = {}                       # sens → instant (monotonic) du dernier essai, quel qu'en soit le résultat
_pos = {}                        # chemin d'un aeroindex → (date du fichier, { icao: (lat, lon) })


def _positions(path):
    try:
        mt = os.path.getmtime(path)
    except OSError:
        return {}
    hit = _pos.get(path)
    if hit and hit[0] == mt:
        return hit[1]
    out = {}
    doc, why = safe_json.read(path, MAX_POS_BYTES, encoding='utf-8')      # trop gros, absent ou illisible (imbrication, NaN) : aucune position
    try:
        if why:
            raise ValueError(why)
        rows = doc['data']
        names = rows['fields']
        i, a, o = names.index('icao'), names.index('lat'), names.index('lon')
        for r in rows['rows']:
            if isinstance(r[i], str) and isinstance(r[a], (int, float)) and isinstance(r[o], (int, float)):
                out[r[i]] = (float(r[a]), float(r[o]))
    except (KeyError, IndexError, TypeError, AttributeError, ValueError):      # un fichier énorme, imbriqué ou de mauvaise forme : aucune position, et l'échec est mémorisé avec la date du fichier (pas relu à chaque demande)
        out = {}
    _pos[path] = (mt, out)
    return out


def position(data, icao):
    """(lat, lon) d'un aérodrome d'après les aeroindex de la base (le cycle le plus récent de chaque zone) ; None s'il n'y est pas."""
    base = Path(data) / 'sia' / 'base'
    try:
        zones = sorted(p for p in base.iterdir() if p.is_dir())
    except OSError:
        return None
    for z in zones:
        try:
            cycles = sorted(p for p in z.iterdir() if p.is_dir())
        except OSError:
            continue
        if cycles:
            hit = _positions(str(cycles[-1] / 'aeroindex.json')).get(icao)
            if hit:
                return hit
    return None


_nm = geo.nm_pair      # SOG-0468 (3) : la formule de geo.py


def _routes(data):
    """Les routes des deux fichiers (du jour, gardées), nettoyées par nat_layer.read (entrée non fiable) : [(route, gardée)]."""
    folder = Path(data) / 'sia' / 'zones' / 'nat'
    day, _s = nat_layer.read(folder / 'nat_tracks.json')
    past, _s2 = nat_layer.read(folder / nat_layer.PAST_NAME, nat_layer.MAX_PAST)
    return [(t, False) for t in day] + [(t, True) for t in past]


def _depart(request, now):
    """L'instant de départ UTC donné par la demande, ou None (une date sans heure : on ne suppose rien)."""
    from . import plan
    try:
        got = plan.depart_of(request, now)
    except (ValueError, TypeError):
        return None
    return got[0] if got and got[0] else None


def decide(data, request, now=None):
    """Le contrôle sur les fichiers seuls : { check: 'needed' | 'skipped', why?, sense, hour, tracks_in_sense, valid_at_passage }. `request` : la demande du moteur (dep, arr, date, speed_kt?)."""
    now = now or datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    dep, arr = str(request.get('dep', '')).upper(), str(request.get('arr', '')).upper()
    a, b = position(data, dep), position(data, arr)
    if not a or not b:
        return {'check': 'skipped', 'why': 'no-position'}
    east = a[1] < WEST_LON and b[1] > EAST_LON
    west = b[1] < WEST_LON and a[1] > EAST_LON
    if not (east or west):
        return {'check': 'skipped', 'why': 'not-ocean'}
    sense = 'east' if east else 'west'
    hour = _depart(request, now)
    if hour is None:
        return {'check': 'skipped', 'why': 'no-hour', 'sense': sense}
    speed = float(request.get('speed_kt') or GROUND_KT)
    passage = hour + datetime.timedelta(hours=_nm(a, MERIDIAN_GATE) / speed)      # SOG-0403 (R1) : la validité d'un système se juge au passage du 30° OUEST (la porte (53°N, 30°O), grand cercle), pas sur la durée du vol
    in_sense = valid = 0
    for t, _kept in _routes(data):
        if not ((sense == 'east' and t['east']) or (sense == 'west' and t['west'])):
            continue
        in_sense += 1
        lo, hi = t['from'], t['to']
        lo = lo.replace(tzinfo=None) if lo else None
        hi = hi.replace(tzinfo=None) if hi else None
        if (hi is None or hi >= passage) and (lo is None or lo <= passage):
            valid += 1
    return {'check': 'skipped' if valid else 'needed', **({'why': 'has-routes'} if valid else {}), 'sense': sense, 'hour': hour, 'passage': passage, 'tracks_in_sense': in_sense, 'valid_at_passage': valid}


def _fetch(data):
    f = FETCH
    if f is None:
        import aero_fetch
        f = lambda d, timeout: aero_fetch.nat(d, timeout=timeout)
    return f(str(data), CONNECT_S)


def _log(text):
    """Le détail d'un échec : au journal du lanceur (sa sortie d'erreur), JAMAIS dans la réponse."""
    try:
        if LOG:
            LOG(text)
        else:
            print(text, file=sys.stderr)
    except Exception:
        pass


def refresh(data, sense, clock=time.monotonic):
    """Relit la source (bornée, au plus une fois par MIN_GAP_S et par sens) : { refresh: 'done' | 'nothing-new' | 'failed' | 'skipped', why?, seconds }."""
    now = clock()
    last = _last.get(sense)
    if last is not None and now - last < MIN_GAP_S:
        return {'refresh': 'skipped', 'why': 'delay', 'retry_in_s': round(MIN_GAP_S - (now - last))}
    _last[sense] = now      # un échec compte comme un essai : une source muette n'est pas redemandée à chaque demande
    box = {}

    def work():
        try:
            box['out'] = _fetch(data)
        except ValueError as e:      # un format changé
            box['err'], box['detail'] = 'format', f'{type(e).__name__}: {e}'
        except OSError as e:      # un réseau coupé, un refus
            box['err'], box['detail'] = 'source', f'{type(e).__name__}: {e}'
        except Exception as e:      # une source fausse : dit, jamais une exception muette
            box['err'], box['detail'] = 'error', f'{type(e).__name__}: {e}'
    began = time.perf_counter()
    th = threading.Thread(target=work, daemon=True)
    th.start()
    th.join(BOUND_S)
    seconds = round(time.perf_counter() - began, 2)
    if th.is_alive():
        return {'refresh': 'failed', 'why': 'timeout', 'seconds': seconds}
    if 'err' in box:
        _log(f"relecture des routes NAT : {box['detail'][:300]}")
        return {'refresh': 'failed', 'why': box['err'], 'seconds': seconds}
    files, errors = box['out']
    if errors and not files:
        text = str(errors[0])
        _log(f'relecture des routes NAT : {text[:300]}')
        return {'refresh': 'failed', 'why': 'keep' if 'gardées' in text else 'format' if 'aucun track' in text else 'source', 'seconds': seconds}
    if any(not f.get('unchanged') for f in files):
        return {'refresh': 'done', 'seconds': seconds}
    return {'refresh': 'nothing-new', 'seconds': seconds}


def before(data, request, ctx=None):
    """Avant le calcul : { decision, refresh? } ; ne lève JAMAIS (une panne est un « sauté » dit). Rend None pour un vol qui ne traverse pas l'Atlantique."""
    try:
        dec = decide(data, request)
        if dec.get('why') in ('not-ocean', 'no-position'):
            return None
        out = {'decision': dec}
        if dec['check'] == 'needed':
            if not (ctx and ctx.get('nat_refresh')):      # seul le lanceur (tools/launch.py) le permet : un autre appelant (un cas, un outil) ne lit jamais la source
                out['refresh'] = {'refresh': 'skipped', 'why': 'off'}
            elif ctx.get('lan'):
                out['refresh'] = {'refresh': 'skipped', 'why': 'lan'}
            else:
                out['refresh'] = refresh(data, dec['sense'])
        return out
    except Exception as e:
        return {'decision': {'check': 'skipped', 'why': f'error: {type(e).__name__}'}}


def _clock(t):
    return t.strftime('%H:%MZ') if t else '?'


def state(data, request, info, now=None):
    """Le champ `sections.nat` (et la phrase de la raison) d'après l'état du fichier APRÈS la relecture : { sense, messages, fetched_at, age_s, refresh, why?, seconds?, tracks_in_sense, valid_at_passage, text? } ; None sans traversée."""
    if not info:
        return None
    now = now or datetime.datetime.now(datetime.timezone.utc)
    dec = decide(data, request, now.replace(tzinfo=None))      # l'état du fichier maintenant (après la relecture)
    if dec.get('why') in ('not-ocean', 'no-position'):
        return None
    ref = info.get('refresh') or {'refresh': 'skipped', 'why': (info['decision'].get('why') or 'has-routes')}
    path = Path(data) / 'sia' / 'zones' / 'nat' / 'nat_tracks.json'
    messages, fetched, age = [], None, None
    try:
        mt = datetime.datetime.fromtimestamp(path.stat().st_mtime, datetime.timezone.utc)
        fetched, age = mt.strftime('%Y-%m-%dT%H:%M:%SZ'), max(0, int((now - mt).total_seconds()))
        doc, why = safe_json.read(str(path), MAX_NAT_BYTES)      # trop gros, absent ou illisible : aucun message
        if why:
            raise ValueError(why)
        for m in (doc.get('messages') or [])[:20]:
            x = m.get('id') if isinstance(m, dict) else None
            if isinstance(x, str) and re.fullmatch(r'[A-Z]{4}\d{4}/\d{2}', x, re.A) and x not in messages:
                messages.append(x)
    except (OSError, ValueError, AttributeError):
        pass
    out = {'sense': dec.get('sense'), 'messages': messages, 'fetched_at': fetched, 'age_s': age, 'refresh': ref['refresh'], **({'why': ref['why']} if ref.get('why') else {}), **({'seconds': ref['seconds']} if 'seconds' in ref else {}),
           'tracks_in_sense': dec.get('tracks_in_sense'), 'valid_at_passage': dec.get('valid_at_passage')}
    if dec.get('check') == 'needed' or dec.get('valid_at_passage') == 0:
        way = "vers l'est" if dec.get('sense') == 'east' else "vers l'ouest"
        last = ', '.join(messages) or 'aucun message'
        if ref['refresh'] == 'failed':
            out['text'] = f"Relecture de la source impossible ({WHY.get(ref.get('why'), WHY['error'])}) : le dernier message NAT lu ({last}, lu à {_clock(mt) if fetched else '?'}) n'a aucune route {way} valable à ce passage."
        elif ref['refresh'] in ('done', 'nothing-new'):
            out['text'] = f"Le dernier message NAT lu ({last}, lu à {_clock(mt) if fetched else '?'}) n'a aucune route {way} valable à ce passage ; la source n'en publie pas encore."
        elif ref['refresh'] == 'skipped' and ref.get('why') in ('delay', 'lan'):
            out['text'] = f"Le dernier message NAT lu ({last}, lu à {_clock(mt) if fetched else '?'}) n'a aucune route {way} valable à ce passage ; " + ("la source a été relue il y a moins de cinq minutes." if ref['why'] == 'delay' else "la source n'est relue que depuis le poste de l'utilisateur.")
    return out
