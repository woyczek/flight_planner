"""Procédures d'une interprétation manuelle (lues à la main ou par un modèle sur l'image d'une page dont le texte est dessiné en vecteurs) → proc/manual/<OACI>.json.

  python tools/proc_manual.py EGLL.json --out <dépôt de données>/proc [--check]

Le fichier est au format publié d'un terrain (SPEC § 5 quinquies) avec, pour chaque point, ce que la page imprime : `trk` (cap vrai), `nm` (distance), en plus de la position.
Avant d'installer, l'outil REFAIT le contrôle de géométrie : pour chaque tronçon TF, le cap vrai et la distance recalculés d'après les deux positions doivent être ceux imprimés
(tolérance 0,25° et 0,2 NM) ; une procédure qui échoue n'est pas installée (code de sortie 1). Écrit <out>/manual/<OACI>.json et fusionne
<out>/manual/index.json (les entrées des autres terrains sont gardées) : HORS des dossiers de cycle (décision de l'utilisateur du 28 octobre 2026,
SPEC § 5 quinquies) ; chaque procédure garde le cycle de la page lue (`source.cycle`), et le lecteur la sert « outdated » quand ce cycle n'est plus
en vigueur ; rien ne la retire de soi-même. Un fichier du terrain déjà là qui porte des procédures d'une AUTRE source (ou officielles) n'est jamais écrasé
(SPEC § 5 quinquies) : l'outil refuse, sauf --replace, qui fusionne par identifiant en gardant le meilleur statut (official > check > ofp).
Bibliothèque standard seulement ; ne lit aucune page.
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


RANK = {'official': 0, 'check': 1, 'ofp': 2}      # meilleur statut d'abord


def foreign(doc, old):
    """Procédures du fichier déjà installé qui viennent d'une autre source que `doc` (ou qui sont officielles)."""
    kinds = {(p.get('source') or {}).get('kind') for p in doc.get('procedures', [])}
    return [p for p in (old or {}).get('procedures', []) if p.get('status') == 'official' or (p.get('source') or {}).get('kind') not in kinds]


def merge(old, doc):
    """Fichier du terrain : les procédures de `old` et de `doc` fusionnées par identifiant, la meilleure gardée (à statut égal, la nouvelle)."""
    if not old:
        return doc
    by = {p['id']: p for p in old.get('procedures', [])}
    for p in doc['procedures']:
        q = by.get(p['id'])
        if q is None or RANK.get(p.get('status'), 9) <= RANK.get(q.get('status'), 9):
            by[p['id']] = p
    warnings = list(dict.fromkeys([*old.get('warnings', []), *doc.get('warnings', [])]))
    return {**old, **{k: v for k, v in doc.items() if k != 'procedures'}, 'procedures': list(by.values()), 'warnings': warnings}


def install(doc, out, replace=False):
    """Écrit le fichier du terrain (fusionné avec celui qui est déjà là) et l'entrée du terrain dans l'index du cycle. Un fichier qui porte
    des procédures d'une autre source, ou officielles, n'est touché qu'avec `replace` (SystemExit sinon, rien n'est écrit)."""
    out = Path(out) / 'manual'
    path = out / f'{doc["icao"]}.json'
    for p in doc['procedures']:                                 # le cycle de la page lue reste sur chaque procédure (outdated plus tard)
        p['source'] = {**(p.get('source') or {}), 'cycle': (p.get('source') or {}).get('cycle') or doc['cycle']}
    old = json.loads(path.read_text(encoding='utf-8')) if path.exists() else None
    other = foreign(doc, old)
    if other and not replace:
        raise SystemExit(f'{doc["icao"]}: le fichier du terrain (proc/manual) porte déjà {len(other)} procédure(s) d\'une autre source ou officielles '
                         f'({", ".join(sorted({p.get("status", "?") for p in other}))}) : rien n\'est écrit ; --replace pour fusionner par identifiant '
                         '(le meilleur statut gardé)')
    full = merge(old, doc)
    if not full.get('notice') and any((p.get('source') or {}).get('kind') == 'ead-basic' for p in full['procedures']):
        from proc_eaip import ead_notice                       # un fichier qui porte des procédures d'EAD Basic dit qu'elles sont non opérationnelles
        full['notice'] = ead_notice(full['icao'])
    out.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(full, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    idx_path = out / 'index.json'
    idx = json.loads(idx_path.read_text(encoding='utf-8')) if idx_path.exists() else {'schema': 1, 'folder': 'manual', 'aerodromes': {}}
    n = {'SID': 0, 'STAR': 0, 'APP': 0}
    for p in full['procedures']:
        if p.get('kind') in n:
            n[p['kind']] += 1
    best = min((p.get('status') for p in full['procedures']), key=lambda s: RANK.get(s, 9), default='check')
    cycles = sorted({(p.get('source') or {}).get('cycle') for p in full['procedures']} - {None})
    idx['aerodromes'][doc['icao']] = {**n, 'status': best, 'cycle': cycles[-1] if cycles else doc['cycle']}
    idx_path.write_text(json.dumps(idx, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('file')
    ap.add_argument('--out', default='data/proc')
    ap.add_argument('--check', action='store_true', help='vérifie seulement, n\'écrit rien')
    ap.add_argument('--replace', action='store_true', help='fusionne avec un fichier d\'une autre source (par identifiant, le meilleur statut gardé)')
    a = ap.parse_args(argv)
    doc = json.loads(Path(a.file).read_text(encoding='utf-8'))
    problems = verify(doc)
    for p in problems:
        print('PROBLÈME:', p, file=sys.stderr)
    if problems:
        raise SystemExit(1)
    print(f'{doc["icao"]}: {len(doc["procedures"])} procédure(s) cohérentes (caps et distances recalculés)', file=sys.stderr)
    if not a.check:
        install(doc, a.out, a.replace)
        print(f'installé dans {Path(a.out) / "manual"} (cycle de la page : {doc["cycle"]})', file=sys.stderr)


if __name__ == '__main__':
    main()
