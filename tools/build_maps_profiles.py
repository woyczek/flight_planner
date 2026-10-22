"""Profils d'affichage intégrés de la carte V3 (modules/maps/lib/profiles.js) : ceux du studio cartographique
(apps/cpco/map_parser.html, defaultProfiles), avec les profils IFR bas et haut dérivés d'AIRWAYS comme ifrRouteProfile,
et le profil « vprof » du profil vertical (tous les types de zones, aucun élément). La V3 s'en sert pour les cartes de
mission dont le YAML ne porte pas encore la copie de son profil (maps[].profile_def).

Usage : python tools/build_maps_profiles.py  (réécrit modules/maps/lib/profiles.js ; bibliothèque standard seulement)
"""
import copy, json, os, re

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SRC = os.path.join(ROOT, 'apps', 'cpco', 'map_parser.html')
OUT = os.path.join(ROOT, 'modules', 'maps', 'lib', 'profiles.js')


def ifr_route(base, pid, name, low):
    """Profil IFR de route dérivé d'AIRWAYS (map_parser.html, ifrRouteProfile)."""
    p = copy.deepcopy(base)
    p.update(id=pid, name=name, zones=['R', 'D', 'P', 'TRA', 'CTR', 'TMA', 'CTA'], corridorNm=10)
    p['elements'].update(airwaysLow=low, airwaysHigh=not low, natTracks=not low, icaoStyle=True,
                         zoneFloor='' if low else '19500', zoneCeil='19500' if low else '')
    return p


def main():
    text = open(SRC, encoding='utf-8').read()
    m = re.search(r'const defaultProfiles = \(\) => (\[\{.*?\}\])\.flatMap\(', text, re.S)
    if not m:
        raise SystemExit('defaultProfiles introuvable dans ' + SRC)
    base = json.loads(m.group(1))
    out = []
    for p in base:
        out.append(p)
        if p['id'] == 'airways':
            out += [ifr_route(p, 'ifr-low', 'IFR bas', True), ifr_route(p, 'ifr-high', 'IFR haut', False)]
    types = list(dict.fromkeys(re.findall(r'class="zoneType"[^>]*value="([^"]+)"', text) +
                               re.findall(r'value="([^"]+)"[^>]*class="zoneType"', text)))
    out.append({'id': 'vprof', 'name': 'Profil vertical', 'base': 'vector', 'layers': {}, 'cities': False,
                'population': 1000000, 'zones': types, 'zoneList': [], 'zoneMode': 'white', 'elements': {'urbanStyle': 'none'}})
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write('// GÉNÉRÉ par tools/build_maps_profiles.py depuis apps/cpco/map_parser.html (defaultProfiles) : ne pas éditer.\n')
        f.write('// Profils d\'affichage intégrés du studio (IFR, VFR, AIRWAYS, IFR bas / haut, profil vertical).\n')
        f.write('window.MAPS_PROFILES = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print(f'{OUT} : {len(out)} profils ({", ".join(p["id"] for p in out)}), types de zones {len(types)}, '
          f'{os.path.getsize(OUT) // 1024} Ko')


if __name__ == '__main__':
    main()
