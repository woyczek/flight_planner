"""eAIP de Suède (LFV) : points (ENR 4.4) et routes RNAV (ENR 3.2) en GeoJSON pour la zone « se » (V3, 10 nov. 2026, SOG-0153 b).

La zone se n'avait que l'export openAIP : aucun point, aucune voie (NOSLI, MOKNI, ADVOP inconnus). LFV publie l'AIP de la Suède en eAIP hors ligne (« AIP_OFFLINE.zip » : eAIP/ES-ENR 4.4-en-GB.html,
une page par route ES-ENR 3.2 <route>-en-GB.html, ES-GEN… ; 988 Mo dont la plupart en cartes PDF). Ce module lit seulement les pages utiles de l'archive, sans la déployer, et écrit le même GeoJSON que celui
d'AirNav Ireland (tools/airnav_eaip.py) : des « Feature » `sog: 'point'` (un point désigné) et `sog: 'airway'` (un tronçon de route, de deux positions), que le lecteur de la suite
(shared/aero_sources.js, geojson) sait lire. Le fichier écrit porte la date de l'édition (lfv_se_enr_AAAAMMJJ.geojson) : c'est son cycle AIRAC (tools/aero_cycles.py).

Ce qui est lu : l'ENR 4.4 (point, position, routes et procédures qui l'emploient), chaque page ENR 3.2 (une route : ses points dans l'ordre, la position de chacun, les limites supérieure et inférieure du tronçon qui le suit).
Ce qui ne l'est pas : le sens de parcours (l'eAIP donne la « direction des niveaux de croisière », pas un sens unique : `dir` reste absent, donc inconnu), les procédures (SID, STAR, approches : AD 2), les routes de
raccordement de l'ENR 3.3 (« FRA Connecting Routes »), pas encore.

Licence : l'AIP de la Suède est publié sous l'autorité de l'Agence suédoise des transports et produit par LFV (ES-GEN 0.1) ; AUCUNE condition de réutilisation n'est donnée dans l'archive (pas de section « copyright »),
et le site de LFV n'en dit rien de repérable. La source est donc traitée comme une licence d'usage personnel (lue seulement si la case « personnel » la déclare ; les données compilées restent dans le dépôt privé
des données), le temps qu'une réponse de aip@lfv.se précise ; même position que pour AirNav Ireland. Bibliothèque standard seulement. Appelé par tools/regen/base_sources.py (prise de l'archive dans Téléchargements).
Essai : python tools/lfv_eaip.py <AIP_OFFLINE.zip> [dossier de sortie].
"""
import html as htmllib
import json
import os
import re
import sys
import zipfile
import zip_guard

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import eaip_annexe15 as core  # noqa: E402  (le noyau commun : dms, level_ft, GeoJSON, nom de fichier)
import airnav_eaip as ae  # noqa: E402  (le profil d'Irlande : les mêmes lecteurs de coordonnées et de limites, par le noyau)

NAME = 'lfv_se_enr'
OUT_RE = re.compile(r'^lfv_se_enr_(\d{8})\.geojson\Z')
COVER = 'ES-Cover Page-en-GB.html'
ENR44 = 'eAIP/ES-ENR 4.4-en-GB.html'
ROUTE_RE = re.compile(r'^eAIP/ES-ENR 3\.2 ([A-Z]{1,2}\d{1,4}[A-Z]?)-en-GB\.html\Z')
MEMBER_MAX = 8 * 1024 * 1024        # une page d'eAIP : 2 Mo au plus aujourd'hui (ENR 4.4 : 1 Mo)
MAX_ROUTES = 400
MAX_FEATURES = 60000
MONTHS = core.MONTHS


text_of = core.text_of      # le texte d'une cellule HTML (tools/eaip_annexe15.py)


rows_of = core.rows_of      # [(id de la ligne, [texte de chaque cellule])] (tools/eaip_annexe15.py)


def issue_of(cover):
    """La date d'entrée en vigueur de la page de couverture (« Effective date : 29 OCT 2026 ») en AAAA-MM-JJ, ou None."""
    m = re.search(r'Effective date\s*:\s*(\d{1,2})\s+([A-Z]{3})\s+(\d{4})', text_of(cover).upper().replace('EFFECTIVE DATE', 'Effective date'), re.I)
    if not m or m.group(2).upper() not in MONTHS:
        return None
    import datetime
    try:
        return datetime.date(int(m.group(3)), MONTHS[m.group(2).upper()], int(m.group(1))).isoformat()
    except ValueError:
        return None


_POS = re.compile(r'^(?P<name>.+?)\s+(?P<lat>\d{6,7}(?:\.\d+)?[NS])\s+(?P<lon>\d{6,8}(?:\.\d+)?[EW])$')


def point_id(name):
    """L'identifiant d'un point : « NOSLI » → NOSLI ; « MISBI FIR BDRY » → MISBI (un point sur une limite de FIR) ; « ÖSTERSUND DVOR/DME (OSS) » → OSS (le code entre parenthèses d'une balise)."""
    t = re.sub(r'\s+', ' ', name or '').strip().upper()
    m = re.search(r'\(([A-Z0-9]{2,5})\)$', t)
    if m:
        return m.group(1)
    m = re.match(r'^([A-Z0-9]{2,6})(?: [A-Z ]+)?$', t)
    return m.group(1) if m and re.fullmatch(r'[A-Z]{2,6}[0-9]?|[A-Z0-9]{2,6}', m.group(1)) else ''


def parse_enr44(page):
    """Les points désignés de l'ENR 4.4 : [{ id, lat, lon, uses }] (uses : les routes et procédures qui l'emploient, texte). Une ligne est `<tr id="<ID>ENR44">` : identifiant, « 590422N 0171529E », emploi."""
    out = []
    for rid, cells in rows_of(page):
        if not rid.endswith('ENR44') or len(cells) < 3:
            continue
        pid = cells[0].strip().upper()
        m = re.fullmatch(r'(\d{6,7}(?:\.\d+)?[NS])\s+(\d{6,8}(?:\.\d+)?[EW])', cells[1])
        la, lo = (ae.dms(m.group(1)), ae.dms(m.group(2))) if m else (None, None)
        if re.fullmatch(r'[A-Z0-9]{2,6}', pid) and la is not None and lo is not None:
            out.append({'id': pid, 'lat': la, 'lon': lo, 'uses': cells[2][:200]})
    return out


def parse_route(page):
    """Une page ENR 3.2 : (route, [points { id, lat, lon }], [tronçons { route, a, b, lower, upper }]). Une ligne de point porte « ∆ » puis « NOM [FIR BDRY] position » ; les lignes qui la suivent donnent
    la limite supérieure puis la limite inférieure du tronçon qui part de ce point (la dernière ligne : celles du dernier point sont sans suite). Un point sans position lisible n'est pas rendu."""
    rows = rows_of(page)
    route = ''
    for _, cells in rows:
        m = re.fullmatch(r'([A-Z]{1,2}\d{1,4}[A-Z]?) \(RNAV\)', cells[0] if cells else '')
        if m:
            route = m.group(1)
            break
    pts, limits = [], []           # limits[i] : (haut, bas) lus après le point i
    for _, cells in rows:
        if len(cells) == 2 and cells[0] == '∆':
            m = _POS.match(cells[1])
            la, lo = (ae.dms(m.group('lat')), ae.dms(m.group('lon'))) if m else (None, None)
            pid = point_id(m.group('name')) if m else ''
            pts.append({'id': pid, 'lat': la, 'lon': lo} if pid and la is not None and lo is not None else None)
            limits.append([])
        elif limits and len(cells) == 1 and re.fullmatch(r'(FL ?\d{2,3}|\d{3,5} ?(FT|F)( ?(AMSL|MSL|AGL))?|GND|SFC|UNL)', cells[0].upper()):
            limits[-1].append(ae.level_ft(cells[0]))
    segs = []
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]
        if a and b and route:
            up, lo = (limits[i] + [None, None])[:2]
            segs.append({'route': route, 'a': a, 'b': b, 'lower': lo, 'upper': up})
    return route, [p for p in pts if p], segs


def read_member(z, name):
    info = z.getinfo(name)
    if info.file_size > MEMBER_MAX:
        raise ValueError(f'{name} : trop gros ({info.file_size} octets)')
    return z.read(name).decode('utf-8', 'replace')


def convert(path):
    """(GeoJSON, date de l'édition, nombre de points, nombre de tronçons, nombre de routes) d'après l'archive LFV ; lève ValueError si ce n'est pas l'AIP de la Suède (page de couverture, ENR 4.4 absents) ou si une page
    ne donne rien (mise en page changée) ou trop de choses."""
    with zip_guard.open_zip(path) as z:
        names = set(z.namelist())
        if COVER not in names or ENR44 not in names:
            raise ValueError('ce n’est pas l’eAIP hors ligne de LFV (page de couverture ou ENR 4.4 absents)')
        cover = read_member(z, COVER)
        issue = issue_of(cover)
        if not issue or 'SWEDEN' not in text_of(cover).upper():
            raise ValueError('date d’entrée en vigueur ou « SWEDEN » introuvables sur la page de couverture')
        points = parse_enr44(read_member(z, ENR44))
        routes = sorted(n for n in names if ROUTE_RE.match(n))
        if len(routes) > MAX_ROUTES:
            raise ValueError('trop de pages de routes : ce n’est pas l’archive attendue')
        segments, rp, by_route = [], [], {}
        for n in routes:
            route, pts, segs = parse_route(read_member(z, n))
            if route and route != ROUTE_RE.match(n).group(1):
                raise ValueError(f'{n} : la page parle de la route {route}')
            by_route[route or n] = len(segs)
            segments += segs
            rp += pts
    if not points:
        raise ValueError('aucun point lu dans l’ENR 4.4 (mise en page changée ?)')
    if not segments:
        raise ValueError('aucun tronçon lu dans l’ENR 3.2 (mise en page changée ?)')
    known = {p['id'] for p in points}
    for p in rp:                           # les points qu'une route nomme et que l'ENR 4.4 ne liste pas (balises, points de limite de FIR)
        if p['id'] not in known:
            known.add(p['id'])
            points.append({'id': p['id'], 'lat': p['lat'], 'lon': p['lon'], 'uses': ''})
    if len(points) + len(segments) > MAX_FEATURES:
        raise ValueError('trop d’objets pour la Suède : ce ne sont pas les pages attendues')
    return to_geojson(points, segments, issue), issue, len(points), len(segments), len(by_route)


def to_geojson(points, segments, issue):
    return core.to_geojson(NAME, 'LFV AIP Sweden (ENR 4.4, ENR 3.2)', points, segments, issue, remark='uses')


def out_name(issue):
    """Le nom du fichier d'une édition : lfv_se_enr_20261029.geojson (la date du cycle AIRAC y est lue par tools/aero_cycles.py)."""
    return core.out_name(NAME, issue)


def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    if not argv:
        sys.exit('usage : python tools/lfv_eaip.py <AIP_OFFLINE.zip> [dossier de sortie]')
    g, issue, n, m, r = convert(argv[0])
    path = os.path.join(argv[1] if len(argv) > 1 else '.', out_name(issue))
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(g, f, ensure_ascii=False)
    print(f'{path} : {n} points, {m} tronçons, {r} routes (édition du {issue})')


if __name__ == '__main__':
    main()
