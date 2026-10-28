"""Procédures d'une interprétation manuelle (lues à la main ou par un modèle sur l'image d'une page dont le texte est dessiné en vecteurs) → proc/<cycle>/<OACI>.json.

  python tools/proc_manual.py EGLL.json --out <dépôt de données>/proc [--check]

Le fichier est au format publié d'un terrain (SPEC § 5 quinquies) avec, pour chaque point, ce que la page imprime : `trk` (cap vrai), `nm` (distance), en plus de la position.
Avant d'installer, l'outil REFAIT le contrôle de géométrie : pour chaque tronçon TF, le cap vrai et la distance recalculés d'après les deux positions doivent être ceux imprimés
(tolérance 0,25° et 0,2 NM) ; une procédure qui échoue n'est pas installée (code de sortie 1). Écrit <out>/<cycle>/<OACI>.json et fusionne <out>/<cycle>/index.json (les entrées
des autres terrains et sources sont gardées). Bibliothèque standard seulement ; ne lit aucune page.
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from proc_eaip import check_geometry  # noqa: E402


def verify(doc):
    """Liste des problèmes d'un fichier d'interprétation manuelle ; vide = installable."""
    problems = []
    if doc.get('schema') != 1 or not doc.get('icao') or not doc.get('cycle'):
        problems.append('schema 1, icao et cycle requis')
    ids = [p.get('id') for p in doc.get('procedures', [])]
    if len(ids) != len(set(ids)):
        problems.append('identifiants de procédure en double')
    for p in doc.get('procedures', []):
        if p.get('status') != 'check' or p.get('kind') not in ('SID', 'STAR', 'APP') or not p.get('points'):
            problems.append(f'{p.get("id")}: statut « check », type SID / STAR / APP et des points requis')
            continue
        legs = [{'id': q['id'], 'leg': q.get('leg'), 'lat': q.get('lat'), 'lon': q.get('lon'), 'true': q.get('trk'), 'nm': q.get('nm')} for q in p['points']]
        bad = check_geometry(legs)
        problems += [f'{p["id"]}: {b}' for b in bad]
    return problems


def install(doc, out):
    """Écrit le fichier du terrain et fusionne l'index du cycle."""
    out = Path(out) / doc['cycle']
    out.mkdir(parents=True, exist_ok=True)
    (out / f'{doc["icao"]}.json').write_text(json.dumps(doc, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    idx_path = out / 'index.json'
    idx = json.loads(idx_path.read_text(encoding='utf-8')) if idx_path.exists() else {'schema': 1, 'cycle': doc['cycle'], 'aerodromes': {}}
    n = {'SID': 0, 'STAR': 0, 'APP': 0}
    for p in doc['procedures']:
        n[p['kind']] += 1
    idx['aerodromes'][doc['icao']] = {**n, 'status': 'check'}
    idx_path.write_text(json.dumps(idx, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('file')
    ap.add_argument('--out', default='data/proc')
    ap.add_argument('--check', action='store_true', help='vérifie seulement, n\'écrit rien')
    a = ap.parse_args(argv)
    doc = json.loads(Path(a.file).read_text(encoding='utf-8'))
    problems = verify(doc)
    for p in problems:
        print('PROBLÈME:', p, file=sys.stderr)
    if problems:
        raise SystemExit(1)
    print(f'{doc["icao"]}: {len(doc["procedures"])} procédure(s) cohérentes (caps et distances recalculés)', file=sys.stderr)
    if not a.check:
        install(doc, a.out)
        print(f'installé dans {Path(a.out) / doc["cycle"]}', file=sys.stderr)


if __name__ == '__main__':
    main()
