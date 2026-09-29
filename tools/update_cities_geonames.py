"""Met à jour apps/sia/assets/villes_geonames.csv (villes du studio cartographique) pour des pays GeoNames.

La base d'origine (GeoNames cities500, Europe de l'Ouest) ne contenait pas l'outre-mer : cet outil télécharge
les extraits par pays de GeoNames (https://download.geonames.org/export/dump/<CC>.zip, CC BY 4.0), garde les
lieux habités (classe P) d'au moins 500 habitants — même critère que cities500 — et remplace les lignes de ces
pays dans le CSV (colonnes name, lat, lon, population, country, geonameid ; tri par population décroissante).

Usage (à la racine du dépôt) :
    python tools/update_cities_geonames.py                 → outre-mer français (défaut)
    python tools/update_cities_geonames.py RE NC PF        → pays choisis (codes ISO GeoNames)
    python tools/update_cities_geonames.py --min 1000 RE   → seuil de population
"""
import csv, io, os, sys, urllib.request, zipfile

sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
CSV = os.path.join(ROOT, 'apps', 'sia', 'assets', 'villes_geonames.csv')
# Outre-mer français : Guadeloupe, Martinique, Guyane, Réunion, Mayotte, Nouvelle-Calédonie, Polynésie,
# Saint-Pierre-et-Miquelon, Wallis-et-Futuna, Saint-Barthélemy, Saint-Martin.
OUTRE_MER = ['GP', 'MQ', 'GF', 'RE', 'YT', 'NC', 'PF', 'PM', 'WF', 'BL', 'MF']
URL = 'https://download.geonames.org/export/dump/{}.zip'


def fetch(cc, minimum):
    """Lieux habités (classe P, population ≥ minimum) d'un pays GeoNames."""
    with urllib.request.urlopen(URL.format(cc), timeout=60) as r:
        data = r.read()
    rows = []
    with zipfile.ZipFile(io.BytesIO(data)) as z, z.open(f'{cc}.txt') as f:
        for line in io.TextIOWrapper(f, encoding='utf-8'):
            c = line.rstrip('\n').split('\t')
            # colonnes GeoNames : 0 id, 1 nom, 4 lat, 5 lon, 6 classe, 8 pays, 14 population
            if len(c) < 15 or c[6] != 'P':
                continue
            pop = int(c[14] or 0)
            if pop >= minimum:
                rows.append({'name': c[1], 'lat': c[4], 'lon': c[5], 'population': str(pop), 'country': c[8], 'geonameid': c[0]})
    return rows


def main(args):
    minimum = 500
    if '--min' in args:
        i = args.index('--min')
        minimum = int(args[i + 1])
        del args[i:i + 2]
    countries = [a.upper() for a in args] or OUTRE_MER
    with open(CSV, encoding='utf-8', newline='') as f:
        rows = list(csv.DictReader(f))
    fields = ['name', 'lat', 'lon', 'population', 'country', 'geonameid']
    kept = [r for r in rows if r['country'] not in countries]
    added = []
    for cc in countries:
        got = fetch(cc, minimum)
        print(f'{cc} : {len(got)} lieu(x) habité(s) ≥ {minimum} hab.')
        added += got
    out = sorted(kept + added, key=lambda r: -int(r['population'] or 0))
    with open(CSV, 'w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=fields, quoting=csv.QUOTE_ALL, lineterminator='\n')
        w.writeheader()
        w.writerows(out)
    print(f'villes_geonames.csv : {len(rows)} → {len(out)} ligne(s) ({len(added)} pour {", ".join(countries)}).')


if __name__ == '__main__':
    main(sys.argv[1:])
