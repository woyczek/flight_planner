"""Contrôle des villes (shared/carto/villes_geonames.csv) : liste celles dont la position tombe hors du contour de leur
pays (shared/carto/aero_zones_geo.js, Natural Earth 1:50 000 000), avec la même marge que la publication (un demi-degré
pour les côtes et les îles proches). Une ville listée est une erreur de la source (homonyme, coordonnées inversées) ou
un territoire que le contour du pays ne couvre pas (outre-mer) ; la publication la range alors dans la zone où elle
tombe, ou dans aucune.

Usage : python tools/check_cities.py [--margin 0.5] [--min-pop 0]  (bibliothèque standard seulement ; code de sortie 1
si une ville au moins est hors de son pays)
"""
import csv, json, os, re, sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
CSV = os.path.join(ROOT, 'shared', 'carto', 'villes_geonames.csv')
GEO = os.path.join(ROOT, 'shared', 'carto', 'aero_zones_geo.js')


def in_ring(ring, lon, lat):
    """Point dans l'anneau [[lon, lat], …] (règle pair-impair)."""
    c, j = False, len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / (yj - yi) + xi:
            c = not c
        j = i
    return c


def tester(rings, margin):
    """Test « dans un des anneaux, ou à moins de margin degrés » (décalages en croix, comme aero_zones.js inZones)."""
    parts = []
    for r in rings:
        xs, ys = [p[0] for p in r], [p[1] for p in r]
        parts.append((r, min(xs), min(ys), max(xs), max(ys)))

    def inside(lat, lon):
        for r, w, s, e, n in parts:
            if not (w - margin <= lon <= e + margin and s - margin <= lat <= n + margin):
                continue
            if in_ring(r, lon, lat):
                return True
            if margin > 0 and any(in_ring(r, lon + dx, lat + dy) for dx, dy in
                                  ((margin, 0), (-margin, 0), (0, margin), (0, -margin))):
                return True
        return False
    return inside


def main(argv):
    margin = float(argv[argv.index('--margin') + 1]) if '--margin' in argv else .5
    min_pop = int(argv[argv.index('--min-pop') + 1]) if '--min-pop' in argv else 0
    text = open(GEO, encoding='utf-8').read()
    geo = json.loads(re.search(r'=\s*(\{.*\})\s*;?\s*$', text, re.S).group(1))
    tests = {zid: tester(z.get('r') or [], margin) for zid, z in geo.items()}
    out, unknown, n = [], {}, 0
    with open(CSV, encoding='utf-8', newline='') as f:
        for row in csv.DictReader(f):
            try:
                lat, lon, pop = float(row['lat']), float(row['lon']), int(float(row['population'] or 0))
            except (TypeError, ValueError):
                continue
            if pop < min_pop:
                continue
            n += 1
            cc = (row.get('country') or '').strip().lower()
            if cc not in tests:
                unknown[cc] = unknown.get(cc, 0) + 1
                continue
            if not tests[cc](lat, lon):
                where = next((z for z, t in tests.items() if t(lat, lon)), '')
                out.append((pop, row['name'], cc.upper(), lat, lon, where, row.get('geonameid', '')))
    out.sort(reverse=True)
    print(f'{n} villes lues ; {len(out)} hors du contour de leur pays (marge {margin}°) ; '
          f'{sum(unknown.values())} d\'un pays sans contour ({", ".join(sorted(k.upper() or "?" for k in unknown)) or "aucun"})')
    for pop, name, cc, lat, lon, where, gid in out:
        print(f'  {name} ({cc}, {pop} hab., geonameid {gid}) : {lat:.4f}, {lon:.4f} → zone {where or "aucune"}')
    return 1 if out else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
