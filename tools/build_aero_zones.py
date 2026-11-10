"""Zones de données aéronautiques (Paramètres › Maintenance › Données aéronautiques) : un pays du monde par zone (Natural
Earth, 1:50 000 000, domaine public), la France regroupant métropole et outre-mer (couverture du SIA) ; noms en
français, anglais, allemand, espagnol ; contours simplifiés (Douglas-Peucker, une frontière commune simplifiée UNE fois : deux voisins gardent les mêmes sommets) et arrondis. Écrit
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
# zones hors pays : l'espace océanique de l'Atlantique Nord (OCA de Shanwick, Gander, Santa Maria, New York Oceanic
# Est), contour simplifié tracé au large des côtes (Irlande, Islande, Groenland, Terre-Neuve, Canaries hors zone) :
# ses points et routes océaniques (X-Plane) et les tracks NAT du jour ne tombent dans aucun pays
OCEANIC = {
    'nat': {
        'n': ['Atlantique Nord (océanique, NAT)', 'North Atlantic (oceanic, NAT)', 'Nordatlantik (ozeanisch, NAT)',
              'Atlántico Norte (oceánico, NAT)'],
        'r': [[[-67, 30], [-60, 27], [-20, 27], [-15, 33], [-15, 51], [-11, 51], [-15, 54], [-12, 57], [-12, 61], [-28, 62.5],
               [-38, 62], [-44, 58.5], [-52, 58], [-55, 54], [-50, 52], [-52, 46], [-60, 42], [-67, 40], [-67, 30]]]
    }
}
TOL = .08  # tolérance de simplification (degrés)


def simplify(pts, tol):
    """Douglas-Peucker sur une ligne ouverte de points [lon, lat] : garde les points à plus de tol (degrés) de la corde."""
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


def _key(p):
    return (round(p[0], 6), round(p[1], 6))


def edge_owners(features):
    """{ arête (deux sommets triés) : {indices des pays qui la portent} } : une frontière commune est une arête que deux pays portent (Natural Earth partage les sommets de deux voisins)."""
    owners = {}
    for fi, f in enumerate(features):
        g = f.get('geometry')
        if not g:
            continue
        for poly in (g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]):
            k = [_key(x) for x in poly[0]]
            for a, b in zip(k, k[1:]):
                if a != b:
                    owners.setdefault(tuple(sorted((a, b))), set()).add(fi)
    return owners


def _arc(pts, cache):
    """Un arc entre deux jonctions, simplifié UNE fois : son résultat est le même pour les deux pays qui le partagent (sens canonique de l'arc, résultat remis dans le sens demandé). Ses deux extrémités sont gardées."""
    keys = tuple(_key(x) for x in pts)
    fwd = keys <= keys[::-1]
    ck = keys if fwd else keys[::-1]
    if ck not in cache:
        line = pts if fwd else pts[::-1]
        if line[0] == line[-1] and len(line) > 3:             # une boucle (une seule jonction) : deux moitiés
            m = len(line) // 2
            cache[ck] = simplify(line[:m + 1], TOL)[:-1] + simplify(line[m:], TOL)
        else:
            cache[ck] = simplify(line, TOL)
    out = cache[ck]
    return out if fwd else out[::-1]


def ring_of(ring, fi, owners, cache):
    """Contour extérieur d'un pays simplifié sans désaccorder ses frontières communes : coupé aux sommets où change l'ensemble des pays qui portent l'arête, chaque arc simplifié une fois (voir _arc) ; sans jonction (île, pays sans voisin), en deux moitiés."""
    pts = ring[:-1] if ring[0] == ring[-1] else ring
    n = len(pts)
    if n < 4:
        return []
    own = [frozenset(owners.get(tuple(sorted((_key(pts[i]), _key(pts[(i + 1) % n])))), {fi})) for i in range(n)]
    cuts = [i for i in range(n) if own[i - 1] != own[i]]
    if not cuts:
        m = n // 2
        return simplify(pts[:m + 1], TOL)[:-1] + simplify(pts[m:] + [pts[0]], TOL)
    start = cuts[0]
    pts = pts[start:] + pts[:start]
    cuts = [(c - start) % n for c in cuts]
    cuts.sort()
    out = []
    for i, c in enumerate(cuts):
        end = cuts[i + 1] if i + 1 < len(cuts) else n
        out += _arc(pts[c:end + 1] if end < n else pts[c:] + [pts[0]], cache)[:-1]
    return out + out[:1]


def rings(geom, fi=0, owners=None, cache=None):
    """Contours extérieurs simplifiés et arrondis au centième de degré d'une géométrie Polygon / MultiPolygon
    (contours de moins de 4 points écartés). Avec `owners` (edge_owners) et `cache`, la frontière que deux pays partagent est simplifiée une seule fois : les deux voisins gardent les mêmes sommets
    (SOG-0201 : simplifiés chacun de leur côté, ils s'écartaient jusqu'à 9 km) ; sans eux, chaque contour est simplifié seul."""
    polys = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
    for p in polys:
        r = p[0]  # contour extérieur seulement ; fermé (extrémités confondues) : simplifié en deux moitiés
        if owners is not None:
            s = ring_of(r, fi, owners, cache if cache is not None else {})
        else:
            m = len(r) // 2
            s = simplify(r[:m + 1], TOL)[:-1] + simplify(r[m:], TOL)
        if len(s) >= 4:
            yield [[round(x, 2), round(y, 2)] for x, y in s]


def main():
    """Lit les pays de Natural Earth (fichier donné ou téléchargé), les regroupe en zones et écrit aero_zones_geo.js."""
    sys.stdout.reconfigure(encoding='utf-8')
    if len(sys.argv) > 1:
        data = json.load(io.open(sys.argv[1], encoding='utf-8'))
    else:
        with urllib.request.urlopen(URL, timeout=60) as r:
            data = json.loads(r.read().decode('utf-8'))
    out = {}
    owners, cache = edge_owners(data['features']), {}
    for fi, f in enumerate(data['features']):
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
        z['r'].extend(rings(f['geometry'], fi, owners, cache))
    out.update(OCEANIC)
    out = {k: v for k, v in sorted(out.items()) if v['r']}
    text = ('// GÉNÉRÉ par tools/build_aero_zones.py depuis Natural Earth (1:50 000 000, domaine public) : ne pas éditer.\n'
            '// Zones de données aéronautiques : noms [fr, en, de, es] et contours ([lon, lat], extérieurs, simplifiés).\n'
            'window.AERO_ZONES_GEO = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(text)
    print(f'{len(out)} zones, {sum(len(v["r"]) for v in out.values())} contours, {len(text) // 1024} Ko -> shared/carto/aero_zones_geo.js')


if __name__ == '__main__':
    main()
