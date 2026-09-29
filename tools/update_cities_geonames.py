"""Met à jour shared/carto/villes_geonames.csv (villes du studio cartographique) depuis GeoNames (CC BY 4.0).

La base d'origine (GeoNames cities500, Europe de l'Ouest) ne couvrait ni l'outre-mer ni le reste du monde. L'outil :
  · remplace les lignes des pays demandés par leurs lieux habités (classe P) d'au moins --min habitants, lus dans les
    extraits par pays (https://download.geonames.org/export/dump/<CC>.zip) — même critère que cities500 ;
  · avec --world N, ajoute les villes d'au moins N habitants du monde entier (citiesN.zip : 1000, 5000 ou 15000)
    pour les pays ABSENTS du fichier (le détail européen et l'outre-mer déjà présents sont gardés).
Colonnes : name, lat, lon, population, country, geonameid ; tri par population décroissante.

Usage (à la racine du dépôt) :
    python tools/update_cities_geonames.py                     → outre-mer français (≥ 500 hab.) et monde (≥ 15 000)
    python tools/update_cities_geonames.py RE NC PF            → pays choisis seulement (≥ 500 hab.)
    python tools/update_cities_geonames.py --min 1000 RE       → seuil de population des pays choisis
    python tools/update_cities_geonames.py --world 5000        → outre-mer et monde (≥ 5000 hab.)
    python tools/update_cities_geonames.py --no-world RE NC    → sans l'ajout mondial
"""
import csv, io, os, sys, urllib.request, zipfile

sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
CSV = os.path.join(ROOT, 'shared', 'carto', 'villes_geonames.csv')
# Outre-mer français : Guadeloupe, Martinique, Guyane, Réunion, Mayotte, Nouvelle-Calédonie, Polynésie,
# Saint-Pierre-et-Miquelon, Wallis-et-Futuna, Saint-Barthélemy, Saint-Martin.
OUTRE_MER = ['GP', 'MQ', 'GF', 'RE', 'YT', 'NC', 'PF', 'PM', 'WF', 'BL', 'MF']
URL = 'https://download.geonames.org/export/dump/{}.zip'
FIELDS = ['name', 'lat', 'lon', 'population', 'country', 'geonameid']


def rows_of(name, minimum):
    """Lieux habités (classe P, population ≥ minimum) d'un extrait GeoNames (<CC> ou citiesN)."""
    with urllib.request.urlopen(URL.format(name), timeout=120) as r:
        data = r.read()
    out = []
    with zipfile.ZipFile(io.BytesIO(data)) as z, z.open(f'{name}.txt') as f:
        for line in io.TextIOWrapper(f, encoding='utf-8'):
            c = line.rstrip('\n').split('\t')
            # colonnes GeoNames : 0 id, 1 nom, 4 lat, 5 lon, 6 classe, 8 pays, 14 population
            if len(c) < 15 or c[6] != 'P':
                continue
            pop = int(c[14] or 0)
            if pop >= minimum:
                out.append({'name': c[1], 'lat': c[4], 'lon': c[5], 'population': str(pop), 'country': c[8], 'geonameid': c[0]})
    return out


def main(args):
    minimum, world = 500, 15000
    if '--min' in args:
        i = args.index('--min'); minimum = int(args[i + 1]); del args[i:i + 2]
    if '--world' in args:
        i = args.index('--world'); world = int(args[i + 1]); del args[i:i + 2]
    if '--no-world' in args:
        args.remove('--no-world'); world = 0
    elif args:
        world = world if '--world' in sys.argv else 0      # pays choisis seulement, sauf --world explicite
    countries = [a.upper() for a in args] or OUTRE_MER
    with open(CSV, encoding='utf-8', newline='') as f:
        rows = list(csv.DictReader(f))
    before = len(rows)
    rows = [r for r in rows if r['country'] not in countries]
    for cc in countries:
        got = rows_of(cc, minimum)
        print(f'{cc} : {len(got)} lieu(x) habité(s) ≥ {minimum} hab.')
        rows += got
    if world:
        size = 15000 if world >= 15000 else 5000 if world >= 5000 else 1000
        present = {r['country'] for r in rows}
        extra = [r for r in rows_of(f'cities{size}', world) if r['country'] not in present]
        print(f'Monde : {len(extra)} ville(s) ≥ {world} hab. dans {len({r["country"] for r in extra})} pays absents du fichier.')
        rows += extra
    rows.sort(key=lambda r: -int(r['population'] or 0))
    with open(CSV, 'w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=FIELDS, quoting=csv.QUOTE_ALL, lineterminator='\n')
        w.writeheader()
        w.writerows(rows)
    print(f'villes_geonames.csv : {before} → {len(rows)} ligne(s), {os.path.getsize(CSV) / 1e6:.1f} Mo.')


if __name__ == '__main__':
    main(sys.argv[1:])
