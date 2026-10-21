"""Table des zones de la base aéronautique V3 (frame/aerodb/zones.js) : pour chaque zone de shared/carto/aero_zones_geo.js
(contours Natural Earth, tools/build_aero_zones.py), ses noms [fr, en, de, es] et le cadre de chacune de ses parties
[ouest, sud, est, nord] en degrés, arrondi vers l'extérieur au centième. aerodb s'en sert pour savoir quelles zones
charger pour une emprise, sans embarquer les contours (≈ 370 Ko).

Usage : python tools/build_aerodb_zones.py  (réécrit frame/aerodb/zones.js ; bibliothèque standard seulement)
"""
import json, math, os, re

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SRC = os.path.join(ROOT, 'shared', 'carto', 'aero_zones_geo.js')
OUT = os.path.join(ROOT, 'frame', 'aerodb', 'zones.js')


def main():
    text = open(SRC, encoding='utf-8').read()
    geo = json.loads(re.search(r'=\s*(\{.*\})\s*;?\s*$', text, re.S).group(1))
    zones = {}
    for zid, z in sorted(geo.items()):
        parts = []
        for ring in z.get('r') or []:
            xs = [p[0] for p in ring]
            ys = [p[1] for p in ring]
            if xs and ys:
                parts.append([math.floor(min(xs) * 100) / 100, math.floor(min(ys) * 100) / 100,
                              math.ceil(max(xs) * 100) / 100, math.ceil(max(ys) * 100) / 100])
        zones[zid] = {'n': z.get('n') or [zid.upper()], 'b': parts}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write('// GÉNÉRÉ par tools/build_aerodb_zones.py depuis shared/carto/aero_zones_geo.js : ne pas éditer.\n')
        f.write('// Zones de la base aéronautique : noms [fr, en, de, es] et cadres des parties [ouest, sud, est, nord].\n')
        f.write('window.AERODB_ZONES = ' + json.dumps(zones, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print(f'{OUT} : {len(zones)} zones, {os.path.getsize(OUT) // 1024} Ko')


if __name__ == '__main__':
    main()
