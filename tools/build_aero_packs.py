"""Paquets de pays de la base aéronautique et classements par thème (V3 § 10.42, SOG-0065). Écrit frame/aerodb/packs.json.

Deux niveaux, jamais mêlés :
  1. LES PAQUETS sont des listes d'identifiants de zones, statiques, plusieurs-à-plusieurs (la Turquie est dans la Méditerranée ET au Moyen-Orient). Les paquets de régions viennent des attributs SUBREGION et CONTINENT de Natural Earth (1:50 000 000,
     domaine public) ; quatre listes sont écrites à la main : Méditerranée (les États riverains), Australie et Indonésie, Cercle arctique (les zones qui ne sont que partiellement dans le cercle sont dites `partial`), Antarctique (aucune zone, aucune
     source : liste vide, avec sa raison).
  2. LES THÈMES sont des FILTRES calculés hors ligne, jamais des zones : « les zones qui touchent l'objet ». Objets de sources publiques : Natural Earth `geography_regions_polys` (Himalaya, déserts et steppes), `lakes` et `rivers_lake_centerlines`
     (grands lacs et fleuves), les grandes villes de la base (mégalopoles : 10 millions d'habitants et plus), croisés avec les contours des zones (shared/carto/aero_zones_geo.js) ; îles : les États insulaires (liste à la main) ; forêts et jungles : sans
     couche Natural Earth, des ensembles de pays définis à la main (Amazonie, Congo, Bornéo et Sumatra, forêt boréale). Un thème montre quelles zones ajouter ; il n'en ajoute aucune. Chaque liste dit sa source (`basis`) : le choix de ce qui est
     « désert » ou « jungle » est celui de ce fichier, à relire une fois par l'utilisateur.

Usage (racine du dépôt) : python tools/build_aero_packs.py [--ne DOSSIER] [--cities cities_major.json]
  --ne : dossier des fichiers Natural Earth déjà là (ne_50m_admin_0_countries.geojson, ne_50m_geography_regions_polys.geojson, ne_110m_lakes.geojson, ne_110m_rivers_lake_centerlines.geojson) ; sans lui, téléchargés de jsDelivr (nvkelso/natural-earth-vector v5.1.2).
  --cities : le fichier des grandes villes de la base (data/sia/base/cities_major.json) ; sans lui, la liste des mégalopoles est vide.
Bibliothèque standard seulement."""
import argparse
import datetime
import io
import json
import math
import os
import sys
import urllib.request

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
OUT = os.path.join(ROOT, 'frame', 'aerodb', 'packs.json')
GEO = os.path.join(ROOT, 'shared', 'carto', 'aero_zones_geo.js')
NE = 'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@v5.1.2/geojson/'
FILES = ('ne_50m_admin_0_countries', 'ne_50m_geography_regions_polys', 'ne_110m_lakes', 'ne_110m_rivers_lake_centerlines')
GROUPS = {'PYF': 'fr', 'NCL': 'fr', 'SPM': 'fr', 'WLF': 'fr', 'BLM': 'fr', 'MAF': 'fr'}      # comme tools/build_aero_zones.py : l'outre-mer du SIA est dans la zone fr
MEGA = 5_000_000        # les villes de la base sont comptées SANS leur agglomération (Tokyo : 9,7 millions, Le Caire : 9,6) : 5 millions donne les grandes agglomérations de plus de dix millions


def L4(fr, en, de, es):
    return [fr, en, de, es]


# (identifiant, noms, (CONTINENT ou None, SUBREGIONS))
REGIONS = [
    ('north-america', L4('Amérique du Nord', 'North America', 'Nordamerika', 'América del Norte'), ('Northern America',)),
    ('central-america', L4('Amérique centrale et Caraïbes', 'Central America and the Caribbean', 'Mittelamerika und Karibik', 'América Central y el Caribe'), ('Central America', 'Caribbean')),
    ('south-america', L4('Amérique du Sud', 'South America', 'Südamerika', 'América del Sur'), ('South America',)),
    ('europe-north', L4('Europe du Nord', 'Northern Europe', 'Nordeuropa', 'Europa del Norte'), ('Northern Europe',)),
    ('europe-west', L4('Europe de l’Ouest', 'Western Europe', 'Westeuropa', 'Europa Occidental'), ('Western Europe',)),
    ('europe-south', L4('Europe du Sud', 'Southern Europe', 'Südeuropa', 'Europa del Sur'), ('Southern Europe',)),
    ('europe-east', L4('Europe de l’Est', 'Eastern Europe', 'Osteuropa', 'Europa del Este'), ('Eastern Europe',)),
    ('africa-north', L4('Afrique du Nord', 'Northern Africa', 'Nordafrika', 'África del Norte'), ('Northern Africa',)),
    ('africa-west', L4('Afrique de l’Ouest', 'Western Africa', 'Westafrika', 'África Occidental'), ('Western Africa',)),
    ('africa-central', L4('Afrique centrale', 'Central Africa', 'Zentralafrika', 'África Central'), ('Middle Africa',)),
    ('africa-east', L4('Afrique de l’Est', 'Eastern Africa', 'Ostafrika', 'África Oriental'), ('Eastern Africa',)),
    ('africa-south', L4('Afrique australe', 'Southern Africa', 'Südliches Afrika', 'África Austral'), ('Southern Africa',)),
    ('middle-east', L4('Moyen-Orient', 'Middle East', 'Naher Osten', 'Oriente Medio'), ('Western Asia',)),
    ('asia-central', L4('Asie centrale', 'Central Asia', 'Zentralasien', 'Asia Central'), ('Central Asia',)),
    ('asia-south', L4('Asie du Sud', 'Southern Asia', 'Südasien', 'Asia Meridional'), ('Southern Asia',)),
    ('asia-east', L4('Asie de l’Est', 'Eastern Asia', 'Ostasien', 'Asia Oriental'), ('Eastern Asia',)),
    ('asia-southeast', L4('Asie du Sud-Est', 'South-Eastern Asia', 'Südostasien', 'Sudeste Asiático'), ('South-Eastern Asia',)),
    ('oceania', L4('Océanie', 'Oceania', 'Ozeanien', 'Oceanía'), ('Australia and New Zealand', 'Melanesia', 'Micronesia', 'Polynesia')),
]
# listes écrites à la main (identifiants de zones ; ceux que la liste des zones ne connaît pas sont ignorés)
HAND = [
    ('mediterranean', L4('Méditerranée', 'Mediterranean', 'Mittelmeer', 'Mediterráneo'), ['es', 'fr', 'it', 'mt', 'si', 'hr', 'ba', 'me', 'al', 'gr', 'tr', 'cy', 'sy', 'lb', 'il', 'ps', 'eg', 'ly', 'tn', 'dz', 'ma', 'mc'], [],
     'hand list: the riparian states'),
    ('australia-indonesia', L4('Australie et Indonésie', 'Australia and Indonesia', 'Australien und Indonesien', 'Australia e Indonesia'), ['au', 'nz', 'id', 'pg', 'tl'], [], 'hand list'),
    ('arctic', L4('Cercle arctique', 'Arctic', 'Arktis', 'Ártico'), ['gl', 'is', 'sj', 'fo', 'no', 'se', 'fi', 'ru', 'ca', 'us'], ['no', 'se', 'fi', 'ru', 'ca', 'us'],
     'hand list; the zones in `partial` are whole countries only partly inside the circle'),
]
ANTARCTICA = ('antarctica', L4('Antarctique', 'Antarctica', 'Antarktis', 'Antártida'))
ISLANDS = ['ag', 'bs', 'bb', 'bh', 'cv', 'km', 'cu', 'cy', 'dm', 'do', 'fj', 'fm', 'gd', 'ht', 'id', 'is', 'jm', 'jp', 'kn', 'ki', 'lc', 'lk', 'mh', 'mg', 'mt', 'mu', 'mv', 'nr', 'nz', 'ph', 'pw', 'sb', 'sc', 'sg', 'st', 'to', 'tt', 'tv', 'vc', 'vu', 'ws']
FORESTS = {'Amazon basin': ['br', 'pe', 'co', 've', 'ec', 'bo', 'gy', 'sr'], 'Congo basin': ['cd', 'cg', 'ga', 'cm', 'cf', 'gq'], 'Borneo and Sumatra': ['id', 'my', 'bn'], 'Boreal belt': ['ca', 'ru', 'fi', 'se', 'no', 'us']}
STEPPES = ('KAZAKH STEPPE', 'PONTIC STEPPE')
CITY_ZONE = {'Kinshasa': 'cd'}      # deux capitales face à face sur le fleuve : les contours simplifiés se recouvrent, la ville est donnée à la main
NOT_DESERTS = ('PUNJAB', 'CAATINGAS')      # classés « Desert » par Natural Earth : une plaine cultivée et un fourré semi-aride, pas des déserts
THEMES = {
    'islands': L4('Îles', 'Islands', 'Inseln', 'Islas'),
    'himalaya': L4('Himalaya', 'Himalaya', 'Himalaya', 'Himalaya'),
    'deserts-steppes': L4('Déserts et steppes', 'Deserts and steppes', 'Wüsten und Steppen', 'Desiertos y estepas'),
    'forests-jungles': L4('Forêts et jungles', 'Forests and jungles', 'Wälder und Dschungel', 'Bosques y selvas'),
    'lakes-rivers': L4('Lacs et fleuves', 'Lakes and rivers', 'Seen und Flüsse', 'Lagos y ríos'),
    'megacities': L4('Mégalopoles', 'Megacities', 'Megastädte', 'Megaciudades'),
}


# ----------------------------------------------------------------------------------------------------------------------- géométrie
def inside(pt, ring):
    """Le point [lon, lat] est-il dans le contour (lancer de rayon) ?"""
    x, y, c = pt[0], pt[1], False
    for i in range(len(ring)):
        x1, y1, x2, y2 = ring[i - 1][0], ring[i - 1][1], ring[i][0], ring[i][1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


def bbox(pts):
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


def _cross(a, b, c, d):
    def o(p, q, r):
        return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
    return o(a, b, c) * o(a, b, d) < 0 and o(c, d, a) * o(c, d, b) < 0


def touches(obj, ring, closed=True):
    """Le contour de zone `ring` touche-t-il l'objet (une ligne, ou un contour fermé si closed) ? Un sommet de l'un dans l'autre, ou deux côtés qui se croisent."""
    ob, rb = bbox(obj), bbox(ring)
    if ob[0] > rb[2] or rb[0] > ob[2] or ob[1] > rb[3] or rb[1] > ob[3]:
        return False
    if any(inside(p, ring) for p in obj) or (closed and any(inside(p, obj) for p in ring)):
        return True
    n = len(obj) if closed else len(obj) - 1
    for i in range(n):
        a, b = obj[i], obj[(i + 1) % len(obj)]
        if max(a[0], b[0]) < rb[0] or min(a[0], b[0]) > rb[2] or max(a[1], b[1]) < rb[1] or min(a[1], b[1]) > rb[3]:
            continue
        for j in range(len(ring)):
            if _cross(a, b, ring[j - 1], ring[j]):
                return True
    return False


def parts(geom):
    """Les lignes d'une géométrie GeoJSON : [(points, fermé)]. Seuls les contours extérieurs des polygones."""
    t, c = geom['type'], geom['coordinates']
    if t == 'Polygon':
        return [(c[0], True)]
    if t == 'MultiPolygon':
        return [(p[0], True) for p in c]
    if t == 'LineString':
        return [(c, False)]
    if t == 'MultiLineString':
        return [(line, False) for line in c]
    return []


def zones_touching(features, zones):
    """Les zones dont un contour touche un des objets : { identifiants }."""
    found = set()
    for f in features:
        for pts, closed in parts(f['geometry']):
            for z, g in zones.items():
                if z not in found and any(touches(pts, ring, closed) for ring in g['r']):
                    found.add(z)
    return found


def zone_of_point(pt, zones, within=1.0):
    """La zone qui contient le point ; sinon, la plus proche dont un sommet est à moins de `within` degrés ; sinon None."""
    hits = [z for z, g in zones.items() if any(inside(pt, r) for r in g['r'])]
    if hits:       # des contours simplifiés se recouvrent à la frontière (Kinshasa, Brazzaville) : le plus petit l'emporte
        return min(hits, key=lambda z: min((bbox(r)[2] - bbox(r)[0]) * (bbox(r)[3] - bbox(r)[1]) for r in zones[z]['r'] if inside(pt, r)))
    best, bd = None, within
    for z, g in zones.items():
        for r in g['r']:
            for q in r:
                d = math.hypot(q[0] - pt[0], q[1] - pt[1])
                if d < bd:
                    best, bd = z, d
    return best


# ----------------------------------------------------------------------------------------------------------------------- construction
def zone_id(props):
    a3 = props.get('ADM0_A3')
    zone = GROUPS.get(a3) or str(props.get('ISO_A2_EH') or '').lower()
    return (a3 or '').lower() if not zone or zone == '-99' else zone


def load_zones():
    text = io.open(GEO, encoding='utf-8').read()
    return json.loads(text[text.index('{', text.index('AERO_ZONES_GEO')):text.rindex('}') + 1])


def load_ne(folder):
    out = {}
    for n in FILES:
        path = os.path.join(folder, n + '.geojson') if folder else None
        if path and os.path.isfile(path):
            out[n] = json.load(io.open(path, encoding='utf-8'))
        else:
            with urllib.request.urlopen(NE + n + '.geojson', timeout=90) as r:
                out[n] = json.loads(r.read().decode('utf-8'))
    return out


def build(zones, ne, cities=None, today=None):
    """Le fichier des paquets : { schema, generated, source, regions: [...], themes: [...] } (fonction pure : les entrées sont données)."""
    known = set(zones)
    by_sub = {}
    for f in ne['ne_50m_admin_0_countries']['features']:
        p = f['properties']
        z = zone_id(p)
        if z in known and p.get('CONTINENT') != 'Seven seas (open ocean)':
            by_sub.setdefault(p.get('SUBREGION'), set()).add(z)
    regions = []
    for rid, names, subs in REGIONS:
        zs = sorted(set().union(*(by_sub.get(s, set()) for s in subs)))
        regions.append({'id': rid, 'names': names, 'zones': zs, 'basis': 'natural-earth: SUBREGION ' + ', '.join(subs)})
    for rid, names, zs, partial, basis in HAND:
        regions.append({'id': rid, 'names': names, 'zones': sorted(z for z in zs if z in known), **({'partial': sorted(z for z in partial if z in known)} if partial else {}), 'basis': basis})
    regions.append({'id': ANTARCTICA[0], 'names': ANTARCTICA[1], 'zones': [], 'empty': 'no-zone-no-source', 'basis': 'no zone and no data source today'})
    regs = ne['ne_50m_geography_regions_polys']['features']
    named = lambda *n: [f for f in regs if str(f['properties'].get('NAME', '')).upper() in n]
    deserts = [f for f in regs if f['properties'].get('FEATURECLA') == 'Desert' and (f['properties'].get('SCALERANK') or 9) <= 3 and str(f['properties'].get('NAME', '')).upper() not in NOT_DESERTS] + named(*STEPPES)
    lakes = [f for f in ne['ne_110m_lakes']['features'] if (f['properties'].get('scalerank') if f['properties'].get('scalerank') is not None else 9) <= 1]
    rivers = [f for f in ne['ne_110m_rivers_lake_centerlines']['features'] if (f['properties'].get('scalerank') if f['properties'].get('scalerank') is not None else 9) <= 2]
    big = sorted({CITY_ZONE.get(c.get('name')) or zone_of_point([c['lon'], c['lat']], zones) for c in (cities or []) if isinstance(c.get('population'), (int, float)) and c['population'] >= MEGA} - {None})
    themes = [
        {'id': 'islands', 'names': THEMES['islands'], 'zones': sorted(z for z in ISLANDS if z in known), 'basis': 'hand list: the island states'},
        {'id': 'himalaya', 'names': THEMES['himalaya'], 'zones': sorted(zones_touching(named('HIMALAYAS'), zones)), 'basis': 'natural-earth geography_regions_polys: HIMALAYAS'},
        {'id': 'deserts-steppes', 'names': THEMES['deserts-steppes'], 'zones': sorted(zones_touching(deserts, zones)), 'basis': 'natural-earth geography_regions_polys: class Desert (scale rank 3 and above, without ' + ', '.join(NOT_DESERTS) + ') and ' + ', '.join(STEPPES)},
        {'id': 'forests-jungles', 'names': THEMES['forests-jungles'], 'zones': sorted({z for v in FORESTS.values() for z in v if z in known}), 'basis': 'hand list: ' + '; '.join(f'{k} ({" ".join(v)})' for k, v in FORESTS.items())},
        {'id': 'lakes-rivers', 'names': THEMES['lakes-rivers'], 'zones': sorted(zones_touching(lakes + rivers, zones)), 'basis': 'natural-earth: lakes of scale rank 1 and above (110 m), rivers of scale rank 2 and above'},
        {'id': 'megacities', 'names': THEMES['megacities'], 'zones': big, 'basis': f'the base cities_major.json: {MEGA // 1_000_000} million inhabitants and more, the city without its agglomeration'},
    ]
    return {'schema': 1, 'generated': str(today or datetime.date.today()), 'source': 'Natural Earth 1:50 000 000, v5.1.2 (public domain); hand lists as said by each `basis`; to be reviewed by the user once', 'regions': regions, 'themes': themes}


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    ap = argparse.ArgumentParser(description=__doc__.split('\n', 1)[0])
    ap.add_argument('--ne', default='')
    ap.add_argument('--cities', default='')
    a = ap.parse_args()
    cities = []
    if a.cities:
        cities = json.load(io.open(a.cities, encoding='utf-8')).get('data') or []
    out = build(load_zones(), load_ne(a.ne), cities)
    text = json.dumps(out, ensure_ascii=False, indent=1) + '\n'
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(text)
    print(f'{len(out["regions"])} régions, {len(out["themes"])} thèmes, {len(text) // 1024} Ko -> frame/aerodb/packs.json')
    for r in out['regions'] + out['themes']:
        print(f'  {r["id"]:22} {len(r["zones"]):3}', ' '.join(r['zones'][:12]) + (' …' if len(r['zones']) > 12 else ''))


if __name__ == '__main__':
    main()
