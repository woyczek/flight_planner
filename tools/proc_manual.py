"""Procédures d'une interprétation manuelle (lues à la main ou par un modèle sur l'image d'une page dont le texte est dessiné en vecteurs) → proc/manual/<OACI>.json.

  python tools/proc_manual.py EGLL.json --out <dépôt de données>/proc [--check]

Le fichier est au format publié d'un terrain (SPEC § 5 quinquies) avec, pour chaque point, ce que la page imprime : `trk` (cap vrai), `nm` (distance), en plus de la position.
Avant d'installer, l'outil REFAIT le contrôle de géométrie (tools/proc_geometry.py) : pour chaque tronçon TF, le cap vrai et la distance recalculés d'après les deux positions doivent
être ceux imprimés (tolérance 0,25° et 0,2 NM ; 30° et 0,55 NM si la ligne n'imprime que le cap magnétique) ; une procédure qui échoue n'est pas installée, signalée, et les autres le sont
(le fichier n'est refusé que s'il n'en reste aucune : code de sortie 1). Écrit <out>/manual/<OACI>.json et fusionne
<out>/manual/index.json (les entrées des autres terrains sont gardées) : HORS des dossiers de cycle (décision de l'utilisateur du 28 octobre 2026,
SPEC § 5 quinquies) ; chaque procédure garde le cycle de la page lue (`source.cycle`), et le lecteur la sert « outdated » quand ce cycle n'est plus
en vigueur ; rien ne la retire de soi-même. Un fichier du terrain déjà là qui porte des procédures d'une AUTRE source (ou officielles) n'est jamais écrasé
(SPEC § 5 quinquies) : l'outil refuse, sauf --replace, qui fusionne par identifiant en gardant le meilleur statut (official > check > ofp).
Bibliothèque standard seulement ; ne lit aucune page.
"""
import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import proc_geometry  # noqa: E402


def file_problems(doc):
    """Problèmes du FICHIER d'interprétation (en-tête, identifiants en double) : ils refusent le fichier entier, il n'est plus un fichier de procédures."""
    problems = []
    if doc.get('schema') != 1 or not doc.get('icao') or not doc.get('cycle'):
        problems.append('schema 1, icao et cycle requis')
    ids = [p.get('id') for p in doc.get('procedures', [])]
    if len(ids) != len(set(ids)):
        problems.append('identifiants de procédure en double')
    return problems


def screen(doc):
    """Contrôle PAR PROCÉDURE d'un fichier d'interprétation : (le fichier sans les procédures refusées, les motifs de refus, une ligne par motif). Une lecture à la main qui échoue n'est
    pas installée, mais elle ne refuse que sa propre procédure, jamais le fichier. Refusée : statut autre que « check » (ou « doubt »), type autre que SID / STAR / APP, pas de point, ou
    géométrie incohérente (proc_geometry : cap vrai `trk` et distance `nm` imprimés contre les positions, à la tolérance de ce que la ligne imprime). Une procédure déjà au statut « doubt »
    (le lecteur l'a marquée) n'est pas recontrôlée : elle est gardée comme douteuse, jamais refusée."""
    kept, problems = [], []
    for p in doc.get('procedures', []):
        if p.get('status') not in ('check', 'doubt') or p.get('kind') not in ('SID', 'STAR', 'APP') or not p.get('points'):
            problems.append(f'{p.get("id")}: statut « check » (ou « doubt »), type SID / STAR / APP et des points requis')
            continue
        bad = proc_geometry.check_legs(proc_geometry.legs_of(p['points']))['gaps'] if p.get('status') == 'check' else []
        problems += [f'{p["id"]}: {b}' for b in bad]
        if not bad:
            kept.append(p)
    return {**doc, 'procedures': kept}, problems


def verify(doc):
    """Liste des problèmes d'un fichier d'interprétation manuelle (ceux du fichier, puis ceux de chaque procédure : `screen`) ; vide = tout est installable."""
    return file_problems(doc) + screen(doc)[1]


def empty_refusal(doc, path, out):
    """Message de refus d'un fichier SANS procédure (rien n'est installé, jamais « 0 procédure(s) cohérentes » comme un succès) : les avertissements du fichier, un par ligne
    (les « NON retenue » et « non reconnue » disent pourquoi), et, quand `<OACI>.ocr.json` est à côté, la commande qui installe les procédures lues par OCR."""
    lines = [f'{doc.get("icao", "?")}: {Path(path).name} ne contient AUCUNE procédure : rien n\'est installé.']
    warnings = [w for w in doc.get('warnings', []) if w]
    if warnings:
        lines.append('Avertissements du fichier :')
        lines += [f'  - {w}' for w in warnings[:40]] + ([f'  - … et {len(warnings) - 40} autre(s)'] if len(warnings) > 40 else [])
    sibling = Path(path).with_name(f'{doc.get("icao")}.ocr.json')
    if sibling.is_file() and sibling.name != Path(path).name:
        lines.append(f'Les procédures lues par OCR sont dans {sibling.name} (même dossier) ; pour les installer : python tools/proc_manual.py {sibling} --out {out}')
    return '\n'.join(lines)


RANK = {'official': 0, 'check': 1, 'ofp': 2, 'doubt': 4}      # meilleur statut d'abord ; « doubt » (lecture douteuse, SPEC § 5 quinquies) le dernier, jamais devant une autre lecture


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


def install(doc, out, replace=False, replace_source=None):
    """Écrit le fichier du terrain (fusionné avec celui qui est déjà là) et l'entrée du terrain dans l'index du cycle. Un fichier qui porte
    des procédures d'une autre source, ou officielles, n'est touché qu'avec `replace` (SystemExit sinon, rien n'est écrit). `replace_source` (« eaip ») : une nouvelle lecture de CETTE source
    remplace la précédente (les procédures du fichier déjà là de cette source, de statut « check », sont retirées avant la fusion : un identifiant d'une lecture plus ancienne, changé
    depuis par une règle de lecture meilleure, ne reste pas à côté du nouveau) ; les procédures des autres sources sont gardées."""
    out = Path(out) / 'manual'
    path = out / f'{doc["icao"]}.json'
    for p in doc['procedures']:                                 # le cycle de la page lue reste sur chaque procédure (outdated plus tard)
        p['source'] = {**(p.get('source') or {}), 'cycle': (p.get('source') or {}).get('cycle') or doc['cycle']}
    old = json.loads(path.read_text(encoding='utf-8')) if path.exists() else None
    if old and replace_source:
        old = {**old, 'procedures': [p for p in old.get('procedures', []) if not (p.get('status') in ('check', 'doubt') and (p.get('source') or {}).get('kind') == replace_source)]}
    other = foreign(doc, old)
    if other and not replace:
        raise SystemExit(f'{doc["icao"]}: le fichier du terrain (proc/manual) porte déjà {len(other)} procédure(s) d\'une autre source ou officielles '
                         f'({", ".join(sorted({p.get("status", "?") for p in other}))}) : rien n\'est écrit ; --replace pour fusionner par identifiant '
                         '(le meilleur statut gardé)')
    full = merge(old, doc)
    if not full.get('notice') and any((p.get('source') or {}).get('kind') == 'ead-basic' for p in full['procedures']):
        from proc_records import ead_notice                       # un fichier qui porte des procédures d'EAD Basic dit qu'elles sont non opérationnelles
        full['notice'] = ead_notice(full['icao'])
    out.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(full, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    idx_path = out / 'index.json'
    idx = json.loads(idx_path.read_text(encoding='utf-8')) if idx_path.exists() else {'schema': 1, 'folder': 'manual', 'aerodromes': {}}
    n = {'SID': 0, 'STAR': 0, 'APP': 0}
    for p in full['procedures']:
        if p.get('kind') in n and p.get('status') != 'doubt':       # les lectures douteuses ne comptent pas : le lecteur ne les sert que sur demande
            n[p['kind']] += 1
    best = min((p.get('status') for p in full['procedures'] if p.get('status') != 'doubt'), key=lambda s: RANK.get(s, 9), default='check')
    cycles = sorted({(p.get('source') or {}).get('cycle') for p in full['procedures']} - {None})
    # `updated_at` : la date de cette lecture, celle du fichier (à défaut, celle déjà posée dans l'entrée, sinon maintenant en UTC à la seconde :
    # relire un fichier sans date ne change pas l'index, donc ne fait pas un commit de plus) — aerodb en tire `coverage().read_at`
    idx['aerodromes'][doc['icao']] = {**n, 'status': best, 'cycle': cycles[-1] if cycles else doc['cycle'],
                                      'updated_at': full.get('updated_at') or (idx['aerodromes'].get(doc['icao']) or {}).get('updated_at')
                                      or datetime.now(timezone.utc).isoformat(timespec='seconds')}
    idx_path.write_text(json.dumps(idx, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('file')
    ap.add_argument('--out', default='data/proc')
    ap.add_argument('--check', action='store_true', help='vérifie seulement, n\'écrit rien')
    ap.add_argument('--replace', action='store_true', help='fusionne avec un fichier d\'une autre source (par identifiant, le meilleur statut gardé)')
    a = ap.parse_args(argv)
    doc = json.loads(Path(a.file).read_text(encoding='utf-8'))
    problems = file_problems(doc)
    for p in problems:
        print('PROBLÈME:', p, file=sys.stderr)
    if problems:
        raise SystemExit(1)
    if not doc.get('procedures'):                                 # un fichier vide n'est pas « cohérent » : il n'est jamais installé
        print(empty_refusal(doc, a.file, a.out), file=sys.stderr)
        raise SystemExit(1)
    total = len(doc['procedures'])
    doc, refused = screen(doc)                                    # une procédure refusée est dite, les autres sont installées
    for r in refused:
        print('REFUSÉE:', r, file=sys.stderr)
    if not doc['procedures']:
        print(f'{doc.get("icao", "?")}: aucune des {total} procédure(s) ne passe le contrôle : rien n\'est installé.', file=sys.stderr)
        raise SystemExit(1)
    print(f'{doc["icao"]}: {len(doc["procedures"])} procédure(s) cohérentes (caps et distances recalculés)' + (f', {total - len(doc["procedures"])} refusée(s)' if refused else ''), file=sys.stderr)
    if not a.check:
        install(doc, a.out, a.replace)
        print(f'installé dans {Path(a.out) / "manual"} (cycle de la page : {doc["cycle"]})', file=sys.stderr)


if __name__ == '__main__':
    main()
