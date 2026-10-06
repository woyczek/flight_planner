"""Zones de données aéronautiques (Paramètres › Maintenance › Données aéronautiques) : un pays du monde par zone (Natural
Earth, 1:50 000 000, domaine public), la France regroupant métropole et outre-mer (couverture du SIA) ; noms en
français, anglais, allemand, espagnol ; contours simplifiés (Douglas-Peucker) et arrondis. Écrit
shared/carto/aero_zones_geo.js : window.AERO_ZONES_GEO = { zone: { n: [fr, en, de, es], r: [[[lon, lat], …], …] } }.
Les sources de chaque zone sont décrites dans shared/aero_zones.js.

Usage (racine du dépôt) : python tools/build_aero_zones.py [ne_50m_admin_0_countries.geojson]
(sans fichier : téléchargé depuis jsDelivr, dépôt nvkelso/natural-earth-vector v5.1.2)
"""
import io, json, os, sys, urllib.request

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
OUT = os.path.join(ROOT, 'shared', 'carto', 'aero_zones_geo.js')
URL = 'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@v5.1.2/geojson/ne_50m_admin_0_countries.geojson'
# territoires rattachés à une zone (ADM0_A3 de Natural Earth) : la France du SIA couvre aussi l'outre-mer
GROUPS = {'PYF': 'fr', 'NCL': 'fr', 'SPM': 'fr', 'WLF': 'fr', 'BLM': 'fr', 'MAF': 'fr'}
SKIP = {'ATA'}  # Antarctique
TOL = .08  # tolérance de simplification (degrés)


def simplify(pts, tol):
    if len(pts) < 4:
        return pts
    a, b = pts[0], pts[-1]
    dx, dy = b[0] - a[0], b[1] - a[1]
    n = (dx * dx + dy * dy) ** .5 or 1e-12
    i, dmax = 0, -1
    for k in range(1, len(pts) - 1):
        d = abs(dy * pts[k][0] - dx * pts[k][1] + b[0] * a[1] - b[1] * a[0]) / n
        if d > dmax:
            i, dmax = k, d
    if dmax <= tol:
        return [a, b]
    return simplify(pts[:i + 1], tol)[:-1] + simplify(pts[i:], tol)


def rings(geom):
    polys = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
    for p in polys:
        r = p[0]  # contour extérieur seulement ; fermé (extrémités confondues) : simplifié en deux moitiés
        m = len(r) // 2
        s = simplify(r[:m + 1], TOL)[:-1] + simplify(r[m:], TOL)
        if len(s) >= 4:
            yield [[round(x, 2), round(y, 2)] for x, y in s]


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    if len(sys.argv) > 1:
        data = json.load(io.open(sys.argv[1], encoding='utf-8'))
    else:
        with urllib.request.urlopen(URL, timeout=60) as r:
            data = json.loads(r.read().decode('utf-8'))
    out = {}
    for f in data['features']:
        p = f['properties']
        a3 = p.get('ADM0_A3')
        if a3 in SKIP or not f.get('geometry'):
            continue
        zone = GROUPS.get(a3) or str(p.get('ISO_A2_EH') or '').lower()
        if not zone or zone == '-99':
            zone = a3.lower()
        z = out.setdefault(zone, {'n': [p.get('NAME_FR'), p.get('NAME_EN'), p.get('NAME_DE'), p.get('NAME_ES')], 'r': []})
        if a3 == 'FRA':
            z['n'] = ['France (métropole et outre-mer)', 'France (mainland and overseas)', 'Frankreich (Mutterland und Übersee)', 'Francia (metrópoli y ultramar)']
        z['r'].extend(rings(f['geometry']))
    out = {k: v for k, v in sorted(out.items()) if v['r']}
    text = ('// GÉNÉRÉ par tools/build_aero_zones.py depuis Natural Earth (1:50 000 000, domaine public) : ne pas éditer.\n'
            '// Zones de données aéronautiques : noms [fr, en, de, es] et contours ([lon, lat], extérieurs, simplifiés).\n'
            'window.AERO_ZONES_GEO = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(text)
    print(f'{len(out)} zones, {sum(len(v["r"]) for v in out.values())} contours, {len(text) // 1024} Ko -> shared/carto/aero_zones_geo.js')


if __name__ == '__main__':
    main()
