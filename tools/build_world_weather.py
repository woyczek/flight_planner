"""Fichier synoptique mondial du module Atmosphère (modules/atmosphere/SPEC.md § 4, V3_SPECIFICATION.md § 8).

Une prévision mondiale lue une fois par run de GFS par le workflow des pages et publiée avec le site : aucun appareil
ne demande jamais rien hors de la grille de son vol, quoi que montre la carte (utilisateur, 24 oct. 2026 : « users are
dumb »). Source : NOAA GFS 1° (NOMADS, filtre GRIB, sans clé ni quota d'appels ; décision de l'utilisateur du 24 oct.
2026 : « NOAA approuvé ») décodé par tools/grib2_lite.py, ramené à une maille de 5° (lat -80..80, lon -180..175 :
33 × 72 = 2 376 lieux), toutes les 3 h du pas de 3 h en cours à +72 h (25 échéances : le curseur « date du vol » du
module avance jusque-là).

Publication : un dossier, un index et un fichier par échéance (l'appareil ne lit que celles qu'il montre, ≈ 35 Ko
compressés chacune) :
  index.json        { schema: 1, model: "gfs", run (s), built (s), step (°), lats [sud → nord], lons [ouest → est],
                      times [s], files [nom de chaque échéance], units, source }
  AAAA-MM-JJTHH.json { schema: 1, time (s), vars: { nom: [lat × lon, rangée par rangée depuis le sud] } }
  AAAA-MM-JJTHH-alt.json  même forme, les variables des niveaux de pression ; l'index les nomme dans altFiles et
                      donne levels

Variables (même format que le fichier d'Open-Meteo d'avant, schéma 1 ; les cinq premières sont celles que tout
lecteur trouve, les autres s'y ajoutent) : p pression au niveau de la mer (hPa), t température à 2 m (°C), cc
nébulosité totale (%), ws / wd vent à 10 m (kt, d'où il vient en °), ccl / ccm / cch nébulosité basse, moyenne, haute
(%), cape énergie convective (J/kg), frz altitude de l'isotherme 0 °C (ft), trop altitude de la tropopause (ft),
js / jd vent à 250 hPa — courant-jet (kt, °), pr précipitations (mm/h), vis visibilité (m), ps pression au sol (hPa),
zs altitude du sol (m). En altitude, un second fichier par échéance (lu seulement quand la carte montre une altitude) :
pour chaque niveau de LEVELS, z<niveau> géopotentiel (m), t<niveau> (°C), rh<niveau> (%), ws<niveau> / wd<niveau>
(kt, °) — les variables qu'Open-Meteo donne à la grille du vol, pour que le module calcule les deux côtés de la même façon
(isobares à altitude vraie constante, températures, vents, nuages tirés de l'humidité) : pas de frontière visible.

Le workflow tourne à chaque poussée sur develop et v3, et toutes les 6 h ; chaque déploiement remplace tout le site :
la publication d'avant (--keep adresse du dossier) est reprise sans rien demander à NOMADS tant qu'elle vient du dernier
run disponible et couvre encore 66 h. Ne fait jamais échouer le déploiement : NOMADS injoignable ou incomplet → les
échéances encore à venir de la publication d'avant ; sinon rien n'est écrit (le module ne dessine alors pas de couche
monde). Code de sortie 0 dans tous les cas, sauf argument erroné.

Bibliothèque standard seulement (CLAUDE.md).

Reprise (SOG-0429, --work DOSSIER_PARENT) : chaque échéance lue est écrite dès qu'elle l'est dans un dossier de travail GARDÉ, `run-<run>-<pas>/` sous le
dossier donné (le lanceur y met data/local/weather_work/ : jamais servi ni synchronisé) ; une construction interrompue (réseau coupé, arrêt, lanceur fermé) ne
perd donc que l'échéance en cours, et la suivante, du même run, relit ce qui est là — RELU COMME UNE ENTRÉE NON SÛRE (taille bornée, schéma, instant, variables et
longueurs exactes, nombres seulement : tout défaut = l'échéance est relue sur la NOAA) — et le dit (« @reprise k/n »). Un dossier d'un autre run
ou d'un autre pas est retiré dès que le run change ; le lanceur retire le dossier quand la publication est en place. Aucun appel réseau de plus : au contraire.

Usage : python tools/build_world_weather.py DOSSIER [--step 5] [--keep ADRESSE_DU_DOSSIER] [--work DOSSIER_PARENT]
"""
import argparse
import json
import math
import os
import re
import shutil
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import grib2_lite  # noqa: E402

FILTER = 'https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_1p00.pl'
STEPS = 25  # 0, 3, … 72 h
TOP = 80  # latitudes lues : -80..80 (au-delà, Mercator ne montre rien d'utile)
FT = 3.28084
# variables et niveaux demandés au filtre (le filtre croise les deux listes ; le surplus est ignoré)
# niveaux de pression publiés (hPa) : ceux de la grille du vol chez Open-Meteo (modules/fuel/winds.js) sauf 975, 950 et 900, du sol au FL390
LEVELS = [1000, 925, 850, 800, 700, 600, 500, 400, 300, 250, 200]
ASK_VARS = ['PRMSL', 'TMP', 'TCDC', 'LCDC', 'MCDC', 'HCDC', 'UGRD', 'VGRD', 'CAPE', 'HGT', 'PRATE', 'VIS', 'PRES', 'RH']
ASK_LEVS = ['mean_sea_level', '2_m_above_ground', '10_m_above_ground', 'entire_atmosphere', 'low_cloud_layer',
            'middle_cloud_layer', 'high_cloud_layer', 'surface', '0C_isotherm', 'tropopause'] + [f'{lv}_mb' for lv in LEVELS]
# champ GRIB2 (catégorie, paramètre, type de surface, valeur) → nom lu
FIELDS = {
    (3, 1, 101, 0): 'prmsl',
    (0, 0, 103, 2): 't2',
    (6, 1, 10, 0): 'tcdc',
    (6, 3, 214, 0): 'lcdc',
    (6, 4, 224, 0): 'mcdc',
    (6, 5, 234, 0): 'hcdc',
    (2, 2, 103, 10): 'u10',
    (2, 3, 103, 10): 'v10',
    (2, 2, 100, 25000): 'u250',
    (2, 3, 100, 25000): 'v250',
    (7, 6, 1, 0): 'cape',
    (3, 5, 4, 0): 'hfrz',
    (3, 5, 7, 0): 'htrop',
    (1, 7, 1, 0): 'prate',
    (19, 0, 1, 0): 'vis',
    (3, 0, 1, 0): 'psfc',
    (3, 5, 1, 0): 'hsfc',
}
for _lv in LEVELS:
    FIELDS.update({
        (3, 5, 100, _lv * 100): f'z{_lv}',
        (0, 0, 100, _lv * 100): f't{_lv}',
        (1, 1, 100, _lv * 100): f'rh{_lv}',
        (2, 2, 100, _lv * 100): f'u{_lv}',
        (2, 3, 100, _lv * 100): f'v{_lv}',
    })
BASE = ['p', 't', 'cc', 'ws', 'wd']
UNITS = {'p': 'hPa', 't': '°C', 'cc': '%', 'ws': 'kt', 'wd': '°', 'ccl': '%', 'ccm': '%', 'cch': '%', 'cape': 'J/kg',
         'frz': 'ft', 'trop': 'ft', 'js': 'kt', 'jd': '°', 'pr': 'mm/h', 'vis': 'm', 'ps': 'hPa', 'zs': 'm'}
ALT_UNITS = {f'{k}{lv}': u for lv in LEVELS for k, u in (('z', 'm'), ('t', '°C'), ('rh', '%'), ('ws', 'kt'), ('wd', '°'))}
KT = 1.943844


def wind(u, v):
    """(vitesse kt, direction d'où il vient en °) d'un vent u, v (m/s)."""
    if u is None or v is None:
        return None, None
    return round(math.hypot(u, v) * KT), round((math.degrees(math.atan2(-u, -v)) + 360) % 360) % 360


def convert(f):
    """Valeurs lues en un lieu (noms de FIELDS) → variables du fichier, arrondies."""
    r = lambda v, k=0: None if v is None else (round(v, k) if k else int(round(v)))  # noqa: E731
    ws, wd = wind(f.get('u10'), f.get('v10'))
    js, jd = wind(f.get('u250'), f.get('v250'))
    g = f.get
    return {
        'p': r(g('prmsl') and g('prmsl') / 100, 1),
        't': r(g('t2') and g('t2') - 273.15, 1),
        'cc': r(g('tcdc')),
        'ws': ws,
        'wd': wd,
        'ccl': r(g('lcdc')),
        'ccm': r(g('mcdc')),
        'cch': r(g('hcdc')),
        'cape': r(g('cape')),
        'frz': None if g('hfrz') is None else int(round(max(0, g('hfrz')) * FT / 100) * 100),
        'trop': None if g('htrop') is None else int(round(g('htrop') * FT / 100) * 100),
        'js': js,
        'jd': jd,
        'pr': None if g('prate') is None else round(g('prate') * 3600, 1),
        'vis': None if g('vis') is None else int(round(g('vis') / 100) * 100),
        'ps': r(g('psfc') and g('psfc') / 100, 1),
        'zs': None if g('hsfc') is None else int(round(max(0, g('hsfc')))),
    }


def convert_alt(f):
    """Valeurs des niveaux de pression en un lieu → variables du fichier d'altitude."""
    out = {}
    for lv in LEVELS:
        z, t, rh = f.get(f'z{lv}'), f.get(f't{lv}'), f.get(f'rh{lv}')
        ws, wd = wind(f.get(f'u{lv}'), f.get(f'v{lv}'))
        out[f'z{lv}'] = None if z is None else int(round(z))
        out[f't{lv}'] = None if t is None else round(t - 273.15, 1)
        out[f'rh{lv}'] = None if rh is None else int(round(rh))
        out[f'ws{lv}'] = ws
        out[f'wd{lv}'] = wd
    return out


def get(url, timeout=120):
    """Octets d'une lecture GET (None : fichier absent, 404) ; les autres erreurs passent."""
    req = urllib.request.Request(url, headers={'User-Agent': 'sog-flight-planner world synoptic (GitHub Actions)'})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise RuntimeError(f'HTTP {e.code}') from None


def url(run, fh, small=False):
    """Adresse du filtre GRIB pour un run (s) et une échéance (h) ; small : la seule pression (essai de présence)."""
    t = time.gmtime(run)
    q = [('file', f'gfs.t{t.tm_hour:02d}z.pgrb2.1p00.f{fh:03d}')]
    q += [('var_PRMSL', 'on'), ('lev_mean_sea_level', 'on')] if small else \
        [(f'var_{v}', 'on') for v in ASK_VARS] + [(f'lev_{lv}', 'on') for lv in ASK_LEVS]
    q += [('subregion', ''), ('toplat', TOP), ('bottomlat', -TOP), ('leftlon', 0), ('rightlon', 359),
          ('dir', f'/gfs.{time.strftime("%Y%m%d", t)}/{t.tm_hour:02d}/atmos')]
    return f'{FILTER}?{urllib.parse.urlencode(q)}'


def latest_run(now, last):
    """Dernier run de GFS dont l'échéance du dernier pas (last, s) est publiée ; None sinon (quatre runs essayés)."""
    run = (now - 3 * 3600) // 21600 * 21600
    for _ in range(4):
        data = get(url(run, (last - run) // 3600, small=True), 60)
        if data and data[:4] == b'GRIB':
            return run
        run -= 21600
        time.sleep(1)
    return None


PROGRESS = '@etape'  # ligne d'avancement « @etape k/n » : une par échéance lue (le lanceur la met en barre de progression)


WORK_NAME = re.compile(r'run-(\d{9,11})-(\d{1,2})\Z')   # le nom d'un dossier de travail gardé : le run (s) et le pas (°)
MAX_STEP_FILE = 2 * 1024 * 1024                         # un fichier d'échéance fait quelques centaines de Ko : au-delà, relu sur la NOAA
FINITE = (int, float)


def _plain(path):
    """Un vrai dossier : ni lien, ni jonction ni point d'analyse (Windows : `st_file_attributes & 0x400` ; sous Python < 3.12 os.path.islink ne voit pas une jonction)."""
    try:
        st = os.lstat(path)
    except OSError:
        return False
    return not os.path.islink(path) and not (hasattr(os.path, 'isjunction') and os.path.isjunction(path)) and not getattr(st, 'st_file_attributes', 0) & 0x400 and os.path.isdir(path)


def work_dir(parent, run, step):
    """Le dossier gardé de ce run (PARENT/run-<run>-<pas>, créé) ; les dossiers de travail d'un AUTRE run ou d'un autre pas sont retirés (le run a changé : ils ne servent plus) ; jamais un autre nom
    (rien d'étranger n'est touché), jamais un lien. None sans --work, ou si le dossier ne peut pas être préparé : la construction se fait alors sans reprise."""
    if not parent:
        return None
    try:
        os.makedirs(parent, exist_ok=True)
        if not _plain(parent):
            return None      # le dossier de travail lui-même est un lien ou une jonction : rien n'est écrit ni retiré à travers
        mine = f'run-{run}-{step}'
        for e in os.scandir(parent):
            if e.name != mine and WORK_NAME.fullmatch(e.name) and _plain(e.path):
                shutil.rmtree(e.path, ignore_errors=True)
        d = os.path.join(parent, mine)
        os.makedirs(d, exist_ok=True)
        return d if _plain(d) else None
    except OSError:
        return None


# SOG-0429 (Sécurisation) : un intervalle PLAUSIBLE par variable (unités de UNITS et ALT_UNITS) — un fichier gardé falsifié ne met pas de valeurs absurdes dans la publication servie à toutes les pages : hors intervalle,
# l'échéance est relue sur la NOAA. Larges (un orage, une dépression, la tropopause), jamais serrés.
RANGES = {'p': (300, 1100), 't': (-100, 70), 'cc': (0, 100), 'ws': (0, 400), 'wd': (0, 360), 'ccl': (0, 100), 'ccm': (0, 100), 'cch': (0, 100), 'cape': (0, 12000), 'frz': (0, 70000), 'trop': (0, 90000),
          'js': (0, 500), 'jd': (0, 360), 'pr': (0, 600), 'vis': (0, 400000), 'ps': (300, 1100), 'zs': (-500, 9000),
          'z': (-1000, 20000), 'rh': (0, 100)}
LEVEL_KEY = re.compile(r'(z|t|rh|ws|wd)\d{3,4}\Z')


def _range(key):
    if key in RANGES:
        return RANGES[key]
    m = LEVEL_KEY.fullmatch(key)
    if m:
        return {'z': RANGES['z'], 't': (-120, 60), 'rh': RANGES['rh'], 'ws': (0, 500), 'wd': (0, 360)}[m.group(1)]
    return (-1e12, 1e12)


def _doc_ok(doc, t, keys, n):
    """Un document d'échéance relu est-il conforme ? schéma 1, instant t, exactement les variables `keys`, chacune une liste de n nombres (ou null) — jamais un booléen, jamais un texte."""
    if not isinstance(doc, dict) or doc.get('schema') != 1 or doc.get('time') != t or not isinstance(doc.get('vars'), dict) or set(doc['vars']) != set(keys):
        return False
    for k, v in doc['vars'].items():
        lo, hi = _range(k)
        if not isinstance(v, list) or len(v) != n or any(x is not None and (isinstance(x, bool) or not isinstance(x, FINITE) or x != x or not lo <= x <= hi) for x in v):
            return False
    return True


def load_step(work, t, n):
    """L'échéance t gardée dans le dossier de travail : (fichier, fichier d'altitude), ou None (absente, trop grosse, illisible, non conforme : elle sera relue sur la NOAA)."""
    if not work:
        return None
    docs = []
    for alt, keys in ((False, UNITS), (True, ALT_UNITS)):
        p = os.path.join(work, name(t, alt))
        try:
            if os.path.islink(p) or not os.path.isfile(p) or os.path.getsize(p) > MAX_STEP_FILE:
                return None
            with open(p, 'rb') as f:
                doc = json.loads(f.read(MAX_STEP_FILE + 1).decode('utf-8'))
        except Exception:   # RecursionError (JSON très imbriqué), MemoryError, illisible : non conforme
            return None
        if not _doc_ok(doc, t, keys, n):
            return None
        docs.append(doc)
    return docs[0], docs[1]


def save_step(work, s, sa):
    """Garde une échéance lue (fichier temporaire puis remplacement : jamais un fichier à moitié écrit) ; un échec n'arrête rien (l'échéance ne sera pas reprise)."""
    if not work:
        return
    try:
        for doc, alt in ((s, False), (sa, True)):
            p = os.path.join(work, name(s['time'], alt))
            with open(p + '.tmp', 'w', encoding='utf-8') as f:
                json.dump(doc, f, ensure_ascii=False, separators=(',', ':'))
            os.replace(p + '.tmp', p)
    except OSError as e:
        print(f'échéance non gardée : {e}', file=sys.stderr)


def read(step, now, run, times, work=None):
    """Télécharge et décode les échéances (celles déjà gardées dans `work` sont relues, pas retéléchargées) ; rend le dictionnaire du fichier, ou lève une erreur."""
    lats = list(range(-TOP, TOP + 1, step))
    lons = list(range(-180, 180, step))
    steps = []
    kept = {t: got for t in times if (got := load_step(work, t, len(lats) * len(lons)))}
    if kept:
        print(f'@reprise {len(kept)}/{len(times)}', flush=True)   # lue par le job du lanceur (tools/regen/weather.py) ; ASCII comme @etape : la sortie d'un tube Windows n'est pas de l'UTF-8
    for t in times:
        if t in kept:
            steps.append(kept[t])
            print(f'{PROGRESS} {len(steps)}/{len(times)}', flush=True)
            continue
        buf = get(url(run, (t - run) // 3600))
        if not buf or buf[:4] != b'GRIB':
            raise RuntimeError(f'échéance +{(t - run) // 3600} h absente')
        grids = {}
        for m in grib2_lite.messages(buf):
            field = FIELDS.get((m['category'], m['number'], m['surface'], m['level']))
            if field and field not in grids:  # en double (instantané puis moyenne) : le premier
                grids[field] = m
        rows = {k: [] for k in UNITS}
        alt = {k: [] for k in ALT_UNITS}
        for la in lats:
            for lo in lons:
                f = {}
                for field, m in grids.items():
                    dj = m['dj'] if m['scan'] & 0x40 else -m['dj']  # 0x40 : du sud au nord
                    j = round((la - m['lat1']) / dj)
                    i = round(((lo - m['lon1']) % 360) / m['di'])
                    f[field] = m['values'][j * m['ni'] + i] if 0 <= j < m['nj'] and 0 <= i < m['ni'] else None
                for k, v in convert(f).items():
                    rows[k].append(v)
                for k, v in convert_alt(f).items():
                    alt[k].append(v)
        n = len(lats) * len(lons)
        for k in BASE:
            missing = sum(v is None for v in rows[k])
            if missing > 0.1 * n:
                raise RuntimeError(f'+{(t - run) // 3600} h, {k} : {missing} valeurs manquantes sur {n}')
        steps.append(({'schema': 1, 'time': t, 'vars': rows}, {'schema': 1, 'time': t, 'vars': alt}))
        save_step(work, *steps[-1])   # gardée tout de suite : une interruption ne perd que l'échéance en cours
        time.sleep(1)  # NOMADS : au plus quelques demandes par minute
        print(f'{PROGRESS} {len(steps)}/{len(times)}', flush=True)  # l'avancement, lu par le job du lanceur (tools/regen/weather.py)
    index = {
        'schema': 1,
        'model': 'gfs',
        'run': run,
        'built': now,
        'step': step,
        'lats': lats,
        'lons': lons,
        'times': times,
        'files': [name(t) for t in times],
        'altFiles': [name(t, True) for t in times],
        'levels': LEVELS,
        'units': {**UNITS, **ALT_UNITS},
        'source': 'NOAA GFS 1° (NOMADS)',
    }
    return index, steps


def name(t, alt=False):
    """Nom du fichier d'une échéance (instant de validité, UTC) ; alt : celui des niveaux de pression."""
    return time.strftime('%Y-%m-%dT%H' + ('-alt' if alt else '') + '.json', time.gmtime(t))


def get_json(addr, timeout=30):
    """JSON d'une adresse ; None si absent ou illisible."""
    try:
        raw = get(addr, timeout)
        return json.loads(raw.decode('utf-8')) if raw else None
    except Exception as e:
        print(f'{addr} : {e}', file=sys.stderr)
        return None


def previous(base, now, keep_from):
    """La publication d'avant (adresse du dossier) : (index, échéances) restreints aux instants ≥ keep_from ; None si
    absente ou sans échéance à venir, ou si une échéance gardée manque."""
    idx = get_json(base + 'index.json')
    if not idx or idx.get('schema') != 1 or not idx.get('times') or idx['times'][-1] <= now:
        print('pas de publication précédente utilisable', file=sys.stderr)
        return None
    if len(idx.get('altFiles') or []) != len(idx['times']):
        print('publication précédente sans niveaux de pression', file=sys.stderr)
        return None
    keep = [(t, f, fa) for t, f, fa in zip(idx['times'], idx['files'], idx['altFiles']) if t >= keep_from]
    steps = []
    for t, f, fa in keep:
        s, sa = get_json(base + f), get_json(base + fa)
        if not s or s.get('time') != t or not sa or sa.get('time') != t:
            print(f'échéance {f} absente de la publication précédente', file=sys.stderr)
            return None
        steps.append((s, sa))
        time.sleep(0.2)
    idx = {**idx, 'times': [k[0] for k in keep], 'files': [k[1] for k in keep], 'altFiles': [k[2] for k in keep]}
    return (idx, steps) if steps else None


def write(out, index, steps):
    """Écrit l'index et les échéances dans le dossier de sortie."""
    os.makedirs(out, exist_ok=True)
    for s, sa in steps:
        for doc, alt in ((s, False), (sa, True)):
            with open(os.path.join(out, name(s['time'], alt)), 'w', encoding='utf-8') as f:
                json.dump(doc, f, ensure_ascii=False, separators=(',', ':'))
    with open(os.path.join(out, 'index.json'), 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, separators=(',', ':'))


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n', 1)[0])
    ap.add_argument('out')
    ap.add_argument('--step', type=int, default=5)
    ap.add_argument('--keep', default='')
    ap.add_argument('--work', default='')
    a = ap.parse_args()
    if a.step not in (1, 2, 5, 10):
        ap.error('step : 1, 2, 5 ou 10')
    base = a.keep if not a.keep or a.keep.endswith('/') else a.keep + '/'
    now = int(time.time())
    t0 = now // 10800 * 10800
    times = [t0 + 10800 * k for k in range(STEPS)]
    pub = None
    try:
        run = latest_run(now, times[-1])
        if not run:
            raise RuntimeError('aucun run de GFS publié pour ces échéances')
        old = get_json(base + 'index.json') if base else None
        if old and old.get('run') == run and old.get('step') == a.step and old.get('model') == 'gfs' and \
                old['times'][-1] >= now + 66 * 3600:
            pub = previous(base, now, t0)
            if pub:
                print(f'même run ({time.strftime("%Y-%m-%d %HZ", time.gmtime(run))}) : publication reprise')
        if not pub:
            pub = read(a.step, now, run, times, work_dir(a.work, run, a.step))
            print(f'synoptique monde : {len(pub[0]["lats"]) * len(pub[0]["lons"])} lieux, {len(pub[1])} échéances, '
                  f'run {time.strftime("%Y-%m-%d %HZ", time.gmtime(run))}')
    except Exception as e:
        print(f'lecture impossible : {e}', file=sys.stderr)
        pub = previous(base, now, t0) if base else None
        if pub:
            print('publication précédente reprise (échéances à venir)')
    if not pub:
        print('aucun synoptique monde écrit', file=sys.stderr)
        return 0
    write(a.out, *pub)
    return 0


if __name__ == '__main__':
    sys.exit(main())
