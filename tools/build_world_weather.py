"""Fichier synoptique mondial du module Atmosphère (modules/atmosphere/SPEC.md § 4, V3_SPECIFICATION.md § 8).

Une prévision mondiale grossière, lue une fois par run du modèle par le workflow des pages et publiée avec le site :
aucun appareil ne demande jamais rien à Open-Meteo hors de la grille de son vol, quoi que montre la carte (utilisateur,
24 oct. 2026 : « users are dumb »). Modèle GFS (gfs_seamless), maille de 15° (lat -75..75, lon -180..165 : 11 × 24 =
264 lieux, un appel pondéré chacun : 5 variables), toutes les 3 h du pas de 3 h en cours à +24 h (9 pas) : pression
au niveau de la mer, vent à 10 m (kt), nébulosité totale, température à 2 m.

Le workflow tourne à chaque poussée sur develop et v3, et toutes les 6 h : le fichier publié (--keep adresse) est
repris sans aucun appel tant qu'il vient du run en cours et couvre encore 18 h ; Open-Meteo n'est lu qu'une fois par
run (264 appels pondérés, environ 1 060 par jour).

Ne fait jamais échouer le déploiement : Open-Meteo injoignable, refus de quota (limite par adresse IP : les machines
de GitHub Actions sont partagées) ou lecture incomplète → le fichier publié avant (--keep adresse) est réécrit tant que
son dernier pas est à venir ; sinon rien n'est écrit (le module ne dessine alors pas de couche monde). Code de sortie
0 dans tous les cas, sauf argument erroné.

Bibliothèque standard seulement (CLAUDE.md).

Usage : python tools/build_world_weather.py SORTIE.json [--step 15] [--keep ADRESSE]
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API = 'https://api.open-meteo.com/v1/forecast'
META = 'https://api.open-meteo.com/data/ncep_gfs013/static/meta.json'  # run du modèle qui porte gfs_seamless
MODEL = 'gfs_seamless'
# nom dans le fichier → variable horaire d'Open-Meteo
VARS = {
    'p': 'pressure_msl',
    't': 'temperature_2m',
    'cc': 'cloud_cover',
    'ws': 'wind_speed_10m',
    'wd': 'wind_direction_10m',
}
# décimales gardées par variable (le fichier reste vers 60 Ko)
ROUND = {'p': 1, 't': 1, 'cc': 0, 'ws': 0, 'wd': 0}
STEPS = 9  # 0, 3, … 24 h
BATCH = 60  # lieux par demande (l'adresse reste courte)
MISSING_MAX = 0.1  # au plus 10 % de valeurs manquantes, sinon la lecture est refusée


def get_json(url, timeout=60):
    """JSON d'une lecture GET ; un refus « par minute » (429) est retenté une fois après 65 s."""
    req = urllib.request.Request(url, headers={'User-Agent': 'sog-flight-planner world synoptic (GitHub Actions)'})
    for attempt in (0, 1):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            reason = e.read().decode('utf-8', 'replace')[:200]
            if e.code == 429 and 'inute' in reason and not attempt:
                time.sleep(65)
                continue
            raise RuntimeError(f'HTTP {e.code} {reason}') from None


def grid(step):
    """Latitudes (du sud au nord) et longitudes (d'ouest en est) de la grille."""
    top = 75 if step == 15 else 90 - step
    return list(range(-top, top + 1, step)), list(range(-180, 180, step))


def current_run():
    """Heure (s) du dernier run de GFS chez Open-Meteo (fichier statique, hors décompte) ; None sans réponse."""
    try:
        return get_json(META, 20).get('last_run_initialisation_time')
    except Exception as e:  # le run n'est qu'une étiquette : le fichier sert sans lui
        print(f'run inconnu : {e}', file=sys.stderr)
        return None


def read(step, now, run):
    """Lit Open-Meteo ; rend le dictionnaire du fichier, ou lève une erreur."""
    lats, lons = grid(step)
    places = [(la, lo) for la in lats for lo in lons]
    t0 = now // 10800 * 10800
    times = [t0 + 10800 * k for k in range(STEPS)]
    out = {k: [[None] * len(places) for _ in times] for k in VARS}
    for b in range(0, len(places), BATCH):
        part = places[b:b + BATCH]
        q = urllib.parse.urlencode({
            'latitude': ','.join(str(la) for la, _ in part),
            'longitude': ','.join(str(lo) for _, lo in part),
            'hourly': ','.join(VARS.values()),
            'models': MODEL,
            'wind_speed_unit': 'kn',
            'timeformat': 'unixtime',
            'timezone': 'GMT',
            'forecast_days': 3,
        })
        j = get_json(f'{API}?{q}')
        locs = j if isinstance(j, list) else [j]
        if len(locs) != len(part):
            raise RuntimeError(f'{len(locs)} lieux reçus pour {len(part)}')
        for i, loc in enumerate(locs):
            h = loc.get('hourly') or {}
            index = {t: n for n, t in enumerate(h.get('time') or [])}
            for k, name in VARS.items():
                vals = h.get(name) or []
                for s, t in enumerate(times):
                    n = index.get(t)
                    v = vals[n] if n is not None and n < len(vals) else None
                    if v is not None:
                        out[k][s][b + i] = round(v, ROUND[k]) if ROUND[k] else int(round(v))
        time.sleep(1)  # bien en dessous des 600 appels par minute
    total = len(places) * len(times) * len(VARS)
    missing = sum(v is None for k in out for s in out[k] for v in s)
    if missing > MISSING_MAX * total:
        raise RuntimeError(f'{missing} valeurs manquantes sur {total}')
    return {
        'schema': 1,
        'model': MODEL,
        'run': run,
        'built': now,
        'step': step,
        'lats': lats,
        'lons': lons,
        'times': times,
        'vars': out,
        'units': {'p': 'hPa', 't': '°C', 'cc': '%', 'ws': 'kt', 'wd': '°'},
        'source': 'Open-Meteo (GFS), CC BY 4.0',
    }


def previous(url, now):
    """Le fichier publié avant, tant que son dernier pas est à venir ; None sinon."""
    try:
        j = get_json(url, 30)
    except Exception as e:
        print(f'pas de fichier précédent : {e}', file=sys.stderr)
        return None
    if j.get('schema') != 1 or not j.get('times') or j['times'][-1] <= now:
        print('fichier précédent trop ancien', file=sys.stderr)
        return None
    return j


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n', 1)[0])
    ap.add_argument('out')
    ap.add_argument('--step', type=int, default=15)
    ap.add_argument('--keep', default='')
    a = ap.parse_args()
    if a.step not in (5, 10, 15, 20, 30):
        ap.error('step : 5, 10, 15, 20 ou 30')
    now = int(time.time())
    run = current_run()
    prev = previous(a.keep, now) if a.keep else None
    if prev and run and prev.get('run') == run and prev.get('step') == a.step and prev['times'][-1] >= now + 18 * 3600:
        data = prev
        print(f'même run ({run}) : fichier publié repris, aucun appel')
    else:
        try:
            data = read(a.step, now, run)
            print(f'synoptique monde : {len(data["lats"]) * len(data["lons"])} lieux, run {data["run"]}')
        except Exception as e:
            print(f'lecture impossible : {e}', file=sys.stderr)
            data = prev
            if data:
                print('fichier précédent repris')
    if not data:
        print('aucun fichier monde écrit', file=sys.stderr)
        return 0
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
