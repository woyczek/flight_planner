"""Contours des pays pour le fond uni de la carte V3 (modules/maps/lib/outlines.js) : les anneaux [lon, lat] de
shared/carto/aero_zones_geo.js (Natural Earth 1:50 000 000, domaine public, déjà simplifiés au centième de degré), sans
les noms. La carte s'en sert quand les tuiles du fond ne sont pas joignables (hors ligne, hôte refusé, pas de WebGL).

Usage : python tools/build_maps_outlines.py  (réécrit modules/maps/lib/outlines.js ; bibliothèque standard seulement)
"""
import json, os, re

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SRC = os.path.join(ROOT, 'shared', 'carto', 'aero_zones_geo.js')
OUT = os.path.join(ROOT, 'modules', 'maps', 'lib', 'outlines.js')


def main():
    text = open(SRC, encoding='utf-8').read()
    geo = json.loads(re.search(r'=\s*(\{.*\})\s*;?\s*$', text, re.S).group(1))
    rings = [r for _, z in sorted(geo.items()) for r in (z.get('r') or []) if len(r) >= 4]
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write('// GÉNÉRÉ par tools/build_maps_outlines.py depuis shared/carto/aero_zones_geo.js : ne pas éditer.\n')
        f.write('// Contours des pays (Natural Earth 1:50 000 000, domaine public) : anneaux [lon, lat], fond uni sans tuiles.\n')
        f.write('window.MAPS_OUTLINES = ' + json.dumps(rings, separators=(',', ':')) + ';\n')
    print(f'{OUT} : {len(rings)} anneaux, {os.path.getsize(OUT) // 1024} Ko')


if __name__ == '__main__':
    main()
