"""Passage des identifiants « lettre de série » (A001…J046C) aux identifiants « lettre de famille » (M001, S002A…).

Numéro sur 3 chiffres PAR FAMILLE, dans l'ordre des séries existantes (lettre A, B, C… = ordre de création) ;
mission.series = rang de la série dans sa famille (1, 2, 3…). Dossiers : data/missions/<lettre>_<FAMILLE>/<id>/.
former_id (identifiant d'origine) conservé. Usage : python tools/reletter_missions.py [--dry-run]
"""
import os, re, shutil, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from family_letters import FAMILY_LETTERS

sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
M = os.path.join(ROOT, 'data', 'missions')
DRY = '--dry-run' in sys.argv
SERIES_DIR = re.compile(r'^([A-Z])_([A-Z0-9-]+)$')
OLD = re.compile(r'^([A-Z])(\d{3})([A-Z]?)$')


def main():
    """Passe chaque dossier de série au dossier de sa famille : identifiants renumérotés par famille, textes et noms
    réécrits, table ajoutée à RENUMEROTATION.md (rien n'est écrit avec --dry-run)."""
    series = sorted(d for d in os.listdir(M) if SERIES_DIR.match(d) and os.path.isdir(os.path.join(M, d)))
    counters, series_rank, plan = {}, {}, []
    for d in series:
        letter_old, fam = SERIES_DIR.match(d).groups()
        L = FAMILY_LETTERS.get(fam)
        if not L:
            raise SystemExit(f'Famille sans lettre : {fam} ({d})')
        if L == letter_old and all(OLD.match(x) and OLD.match(x).group(1) == L for x in os.listdir(os.path.join(M, d)) if OLD.match(x)):
            continue                                                   # déjà au nouveau format
        series_rank[L] = series_rank.get(L, 0) + 1
        ops = sorted({OLD.match(x).group(2) for x in os.listdir(os.path.join(M, d)) if OLD.match(x)})
        opmap = {}
        for op in ops:
            counters[L] = counters.get(L, 0) + 1
            opmap[f'{letter_old}{op}'] = f'{L}{counters[L]:03d}'
        plan.append({'dir': d, 'fam': fam, 'L': L, 'rank': series_rank[L], 'opmap': opmap, 'newdir': f'{L}_{fam}'})
    table = []
    for s in plan:
        src, dst = os.path.join(M, s['dir']), os.path.join(M, s['newdir'])
        tok = re.compile(r'(?<![A-Z0-9])(' + '|'.join(map(re.escape, sorted(s['opmap'], key=len, reverse=True))) + r')(?![0-9])')
        print(f"{s['dir']} → {s['newdir']}/ (série {s['rank']}) : " + ', '.join(f'{a}→{b}' for a, b in s['opmap'].items()))
        for sub in sorted(os.listdir(src)):
            p = os.path.join(src, sub)
            new_sub = tok.sub(lambda m: s['opmap'][m.group(1)], sub)
            target = os.path.join(dst, new_sub)
            if os.path.isdir(p):
                for name in sorted(os.listdir(p)):
                    fp = os.path.join(p, name)
                    nn = tok.sub(lambda m: s['opmap'][m.group(1)], name)
                    if re.search(r'\.(ya?ml|md|txt)$', name, re.I):
                        t = open(fp, encoding='utf-8', errors='replace').read()
                        t2 = tok.sub(lambda m: s['opmap'][m.group(1)], t)
                        if name.lower().startswith('mission') and name.lower().endswith(('.yaml', '.yml')):
                            t2 = re.sub(r"^(\s+series:\s*).*$", rf"\g<1>{s['rank']}", t2, count=1, flags=re.M)
                            idm = re.search(r"^\s+id:\s*'([A-Z]\d{3})", t2, re.M)
                            if idm:
                                t2 = re.sub(r"^(\s+number:\s*).*$", rf"\g<1>{int(idm.group(1)[1:])}", t2, count=1, flags=re.M)
                            title = re.search(r'^title:\s*"?(.*?)"?\s*$', t2, re.M)
                            fid = re.search(r"former_id:\s*'([^']*)'", t2)
                            table.append((new_sub, fid.group(1) if fid else '', sub, s['fam'], title.group(1) if title else ''))
                        if not DRY:
                            open(fp, 'w', encoding='utf-8', newline='').write(t2)
                    if not DRY:
                        os.makedirs(target, exist_ok=True)
                        shutil.move(fp, os.path.join(target, nn))
                if not DRY:
                    os.rmdir(p)
            else:
                if re.search(r'\.(md|txt)$', sub, re.I) and not DRY:
                    t = open(p, encoding='utf-8', errors='replace').read()
                    open(p, 'w', encoding='utf-8', newline='').write(tok.sub(lambda m: s['opmap'][m.group(1)], t))
                if not DRY:
                    os.makedirs(dst, exist_ok=True)
                    shutil.move(p, os.path.join(dst, sub) if not os.path.exists(os.path.join(dst, sub)) else os.path.join(dst, f"{s['dir'][0]}_{sub}"))
        if not DRY and not os.listdir(src):
            os.rmdir(src)
    if not DRY and table:
        with open(os.path.join(M, 'RENUMEROTATION.md'), 'a', encoding='utf-8') as f:
            f.write('\n## Lettres de famille (numéro par famille)\n\n| Nouveau | Origine (former_id) | Intermédiaire | Famille | Titre |\n|---|---|---|---|---|\n'
                    + ''.join(f'| {a} | {b} | {c} | {d} | {e} |\n' for a, b, c, d, e in sorted(table)))
    print(('(simulation) ' if DRY else '') + f'{len(table) or "?"} missions.')


if __name__ == '__main__':
    main()
