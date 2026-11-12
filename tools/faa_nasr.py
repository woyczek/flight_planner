"""FAA NASR (abonnement de 28 jours) : points et voies aériennes des États-Unis en GeoJSON pour la zone « us » (V3, 10 nov. 2026, SOG-0153 d).

La zone us n'avait ni points ni voies : openAIP n'en porte pas, les couches ArcGIS de la FAA (tools/aero_fetch.py, « faa ») ne donnent que des espaces et des routes militaires. Le NASR (https://www.faa.gov/air_traffic/flight_info/aeronav/aero_data/NASR_Subscription/)
publie, en CSV, par jeu : `FIX` (FIX_BASE.csv : les points, position décimale), `NAV` (NAV_BASE.csv : les balises) et `AWY` (AWY_SEG_ALT.csv : un tronçon par ligne, ses deux points, l'altitude minimale en route et l'altitude maximale autorisée). Ce module lit ces trois
fichiers et écrit le même GeoJSON que celui d'AirNav Ireland et de LFV (tools/airnav_eaip.py, tools/lfv_eaip.py) : des « Feature » `sog: 'point'` et `sog: 'airway'` ; seuls les points que des voies nomment, et les balises, sont gardés (une dizaine de milliers : le NASR compte
des dizaines de milliers de points de procédures sans intérêt pour la route).

Les limites : l'altitude minimale en route (MEA) est la limite basse, l'altitude maximale autorisée la limite haute ; à défaut, 0 et 17 999 ft pour une voie basse (V, T, colorées), 18 000 et 60 000 ft pour une voie haute (J, Q) — le moteur de route refuse un segment sans limites. Le sens n'est pas écrit (`dir` absent) : le NASR le dit
voie par voie, pas en un champ simple ; non lu.

Licence : domaine public (publication de la FAA : « free of use and redistribute », décision de l'utilisateur du 10 nov. 2026). Les adresses des jeux sont CALCULÉES ici (nfdc.faa.gov, https, chemin fixe) et jamais prises de la page ; la date du cycle en vigueur est lue sur la page de l'abonnement
(« Current Subscription effective … »). Bibliothèque standard seulement. Appelé par tools/aero_fetch.py (fournisseur « faa », couche « nasr »). Essai : python tools/faa_nasr.py [dossier de sortie].
"""
import csv
import datetime
import io
import json
import os
import re
import sys
import zipfile
import zip_guard

PAGE = 'https://www.faa.gov/air_traffic/flight_info/aeronav/aero_data/NASR_Subscription/'
HOST = 'nfdc.faa.gov'
KINDS = ('FIX', 'AWY', 'NAV')
FILES = {'FIX': 'FIX_BASE.csv', 'AWY': 'AWY_SEG_ALT.csv', 'NAV': 'NAV_BASE.csv'}
MONTHS = ('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec')
FULL = {m: i + 1 for i, m in enumerate(('January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'))}
SUB_NAME = re.compile(r'28DaySubscription_Effective_(\d{4}-\d{2}-\d{2})(?: \(\d+\))?\.zip\Z', re.A)       # SOG-0273 : l'abonnement COMPLET du cycle (un seul fichier), tel que la FAA le nomme
INNER_MEMBER = re.compile(r'CSV_Data/\d{2}_[A-Z][a-z]{2}_\d{4}_CSV\.zip\Z', re.A)                          # …et son zip de jeux CSV (FIX_BASE, AWY_SEG_ALT, NAV_BASE), lu sur place
INNER_MAX = 128 * 1024 * 1024        # ce zip fait 20 Mo aujourd'hui
MEMBER_MAX = 64 * 1024 * 1024        # un fichier CSV décompressé : 11 Mo aujourd'hui (FIX_BASE)
MAX_FEATURES = 400_000
NAME = 'faa_nasr'


def current_cycle(page):
    """La date AAAA-MM-JJ de l'abonnement en vigueur lue sur la page (« Current Subscription effective October 29, 2026 »), ou None."""
    m = re.search(r'Current Subscription effective\s+([A-Z][a-z]+)\s+(\d{1,2}),\s+(\d{4})', re.sub(r'<[^>]+>', ' ', str(page)))
    if not m or m.group(1) not in FULL:
        return None
    try:
        return datetime.date(int(m.group(3)), FULL[m.group(1)], int(m.group(2))).isoformat()
    except ValueError:
        return None


def sub_file(iso):
    """Le nom canonique de l'abonnement complet d'un cycle : 28DaySubscription_Effective_2026-11-26.zip (celui que la FAA donne ; l'envoi par la page le pose sous ce nom)."""
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', str(iso)):
        raise ValueError(f'cycle NASR refusé : {iso!r}')
    return f'28DaySubscription_Effective_{iso}.zip'


def sub_url(iso):
    """L'adresse de l'abonnement complet : https://nfdc.faa.gov/webContent/28DaySub/28DaySubscription_Effective_2026-11-26.zip (calculée ici)."""
    return f'https://{HOST}/webContent/28DaySub/{sub_file(iso)}'


def sub_blobs(path):
    """Les trois jeux CSV d'un abonnement complet déposé : le zip CSV_Data/<JJ>_<Mon>_<AAAA>_CSV.zip est lu SUR PLACE (l'annuaire du gros zip, puis ce seul membre) et rendu trois fois : [FIX, AWY, NAV] au sens de
    convert() (chaque zip porte ses trois fichiers). ValueError, avec la raison, si le fichier n'est pas un abonnement NASR."""
    try:
        with zip_guard.open_zip(path) as z:
            members = [i for i in z.infolist() if INNER_MEMBER.fullmatch(i.filename)]
            if len(members) != 1:
                raise ValueError('abonnement NASR non reconnu : pas de zip CSV_Data/<jour>_<mois>_<année>_CSV.zip')
            if members[0].file_size > INNER_MAX:
                raise ValueError('abonnement NASR refusé : le zip des jeux CSV est trop gros')
            inner = z.read(members[0])
    except (zipfile.BadZipFile, OSError, RuntimeError) as e:
        raise ValueError(f'abonnement NASR illisible : {e}') from None
    return [inner, inner, inner]


def deposited(data, iso):
    """Les trois jeux CSV d'un cycle que l'utilisateur a choisis à la main (data/local/upload/, tools/base_upload.py : nom canonique « 29_Oct_2026_FIX_CSV.zip ») : [FIX, AWY, NAV] en octets, ou None s'il en manque un. Lecture seule ; jamais un chemin de la page."""
    try:
        return sub_blobs(os.path.join(data, 'local', 'upload', sub_file(iso)))       # l'abonnement complet d'abord (un seul fichier)
    except ValueError:
        pass
    out = []
    for k in KINDS:
        p = os.path.join(data, 'local', 'upload', os.path.basename(url(k, iso)))
        try:
            with open(p, 'rb') as f:
                out.append(f.read(MEMBER_MAX * 3))
        except OSError:
            return None
    return out


def deposited_date(data, iso):
    """La date (AAAA-MM-JJ, heure locale) à laquelle les trois jeux d'un cycle ont été déposés à la main : celle du plus ancien des trois fichiers ; None si l'un manque."""
    try:
        return datetime.date.fromtimestamp(os.path.getmtime(os.path.join(data, 'local', 'upload', sub_file(iso)))).isoformat()
    except OSError:
        pass
    times = []
    for k in KINDS:
        try:
            times.append(os.path.getmtime(os.path.join(data, 'local', 'upload', os.path.basename(url(k, iso)))))
        except OSError:
            return None
    return datetime.date.fromtimestamp(min(times)).isoformat()


def deposited_latest(data):
    """Le cycle le plus récent dont les trois jeux sont déposés à la main : (iso, [FIX, AWY, NAV] en octets, {}) ; sinon (None, None, { iso: [jeux déposés] }) de ce que l'on a, pour dire ce qui manque. Le nom de chaque fichier est celui que la FAA lui donne (tools/base_upload.py)."""
    have = {}
    try:
        names = os.listdir(os.path.join(data, 'local', 'upload'))
    except OSError:
        return None, None, {}
    for n in names:
        m = SUB_NAME.fullmatch(n)
        if m and n == sub_file(m.group(1)):                   # l'abonnement complet vaut les trois jeux
            have.setdefault(m.group(1), set()).update(KINDS)
            continue
        m = re.fullmatch(r'(\d{2})_([A-Z][a-z]{2})_(\d{4})_(FIX|AWY|NAV)_CSV\.zip', n)
        if m and m.group(2) in MONTHS:
            have.setdefault(datetime.date(int(m.group(3)), MONTHS.index(m.group(2)) + 1, int(m.group(1))).isoformat(), set()).add(m.group(4))
    for iso in sorted(have, reverse=True):
        if have[iso] >= set(KINDS):
            blobs = deposited(data, iso)
            if blobs:
                return iso, blobs, {}
    return None, None, {iso: [k for k in KINDS if k in ks] for iso, ks in sorted(have.items())}


def url(kind, iso):
    """L'adresse du jeu CSV d'un cycle : https://nfdc.faa.gov/webContent/28DaySub/extra/29_Oct_2026_FIX_CSV.zip (calculée ici)."""
    if kind not in KINDS or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', str(iso)):
        raise ValueError(f'jeu NASR refusé : {kind!r} {iso!r}')
    d = datetime.date.fromisoformat(iso)
    return f'https://{HOST}/webContent/28DaySub/extra/{d.day:02d}_{MONTHS[d.month - 1]}_{d.year}_{kind}_CSV.zip'


def rows(blob, member):
    """Les lignes (dictionnaires) d'un CSV d'un zip donné en octets ; ValueError si le fichier manque ou est trop gros."""
    with zipfile.ZipFile(io.BytesIO(blob)) as z:
        try:
            info = z.getinfo(member)
        except KeyError:
            raise ValueError(f'{member} absent du zip')
        if info.file_size > MEMBER_MAX:
            raise ValueError(f'{member} : trop gros ({info.file_size} octets)')
        with z.open(info) as f:
            yield from csv.DictReader(io.TextIOWrapper(f, encoding='utf-8-sig', newline=''))


def _pos(r, lat, lon):
    try:
        la, lo = float(r[lat]), float(r[lon])
    except (KeyError, TypeError, ValueError):
        return None
    return (round(la, 6), round(lo, 6)) if -90 <= la <= 90 and -180 <= lo <= 180 else None


def _limits(awy_id, lower, upper):
    """(limite basse, limite haute) en pieds : l'altitude minimale en route et l'altitude maximale autorisée, à défaut celles de la famille de la voie."""
    def num(v):
        try:
            return int(float(v))
        except (TypeError, ValueError):
            return None
    lo, up = num(lower), num(upper)
    high = awy_id[:1] in ('J', 'Q') or (lo is not None and lo >= 18000)
    return (lo if lo is not None else (18000 if high else 0)), (up if up is not None else (60000 if high else 17999))


def convert(fix_zip, awy_zip, nav_zip, issue):
    """(GeoJSON, nombre de points, nombre de tronçons) d'après les trois zips (octets) ; ValueError si l'un ne donne rien (mise en page changée) ou trop de choses."""
    fixes = {r['FIX_ID'].strip().upper(): p for r in rows(fix_zip, FILES['FIX']) if r.get('FIX_ID') and (p := _pos(r, 'LAT_DECIMAL', 'LONG_DECIMAL'))}
    navs = {}
    for r in rows(nav_zip, FILES['NAV']):
        p = _pos(r, 'LAT_DECIMAL', 'LONG_DECIMAL')
        if r.get('NAV_ID') and p:
            navs.setdefault(r['NAV_ID'].strip().upper(), p)
    if not fixes or not navs:
        raise ValueError('aucun point (FIX_BASE) ou aucune balise (NAV_BASE) lu : mise en page changée ?')
    used, segments = {}, []

    def where(ident, kind):
        ident = str(ident).strip().upper()
        nav_first = bool(re.match(r'(VOR|NDB|TACAN|DME|VORTAC|FAN|MARINE|UHF|VOT)', str(kind).strip().upper()))
        pos = (navs.get(ident) or fixes.get(ident)) if nav_first else (fixes.get(ident) or navs.get(ident))
        return pos

    for r in rows(awy_zip, FILES['AWY']):
        if r.get('AWY_SEG_GAP_FLAG', 'N').strip().upper() == 'Y':
            continue
        awy = (r.get('AWY_ID') or '').strip().upper()
        a, b = (r.get('FROM_POINT') or '').strip().upper(), (r.get('TO_POINT') or '').strip().upper()
        if not (awy and a and b):
            continue
        pa, pb = where(a, r.get('FROM_PT_TYPE')), where(b, 'WP')
        if not pa or not pb or pa == pb:
            continue
        used[a], used[b] = pa, pb
        lo, up = _limits(awy, r.get('MIN_ENROUTE_ALT'), r.get('MAX_AUTH_ALT'))
        segments.append({'route': awy, 'a': a, 'pa': pa, 'b': b, 'pb': pb, 'lower': lo, 'upper': up})
    if not segments:
        raise ValueError('aucun tronçon lu dans AWY_SEG_ALT (mise en page changée ?)')
    for ident, pos in navs.items():          # les balises, qu'une voie les nomme ou non (la Carte et la saisie les trouvent)
        used.setdefault(ident, pos)
    if len(used) + len(segments) > MAX_FEATURES:
        raise ValueError('trop d’objets pour les États-Unis : ce ne sont pas les fichiers attendus')
    feats = [{'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': [p[1], p[0]]}, 'properties': {'sog': 'point', 'id': i}} for i, p in sorted(used.items())]
    for s in segments:
        feats.append({'type': 'Feature', 'geometry': {'type': 'LineString', 'coordinates': [[s['pa'][1], s['pa'][0]], [s['pb'][1], s['pb'][0]]]},
                      'properties': {'sog': 'airway', 'route': s['route'], 'a': s['a'], 'b': s['b'], 'lower': s['lower'], 'upper': s['upper']}})
    return {'type': 'FeatureCollection', 'name': NAME, 'issue': issue, 'source': 'FAA NASR (FIX, NAV, AWY)', 'features': feats}, len(used), len(segments)


def main(argv=None):
    """Essai : lit l'abonnement en vigueur sur le réseau et écrit le GeoJSON dans le dossier donné (défaut : le dossier courant)."""
    import urllib.request
    argv = list(sys.argv[1:] if argv is None else argv)
    get = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'SOG-launcher-test'}), timeout=120).read()
    issue = current_cycle(get(PAGE).decode('utf-8', 'replace'))
    if not issue:
        sys.exit('cycle en vigueur introuvable sur la page du NASR')
    g, n, m = convert(get(url('FIX', issue)), get(url('AWY', issue)), get(url('NAV', issue)), issue)
    path = os.path.join(argv[0] if argv else '.', NAME + '.geojson')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(g, f, separators=(',', ':'))
    print(f'{path} : {n} points, {m} tronçons (cycle du {issue})')


if __name__ == '__main__':
    main()
