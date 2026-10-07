"""Identifiants de mission avec tiret : « M001 » → « M-001 », « S002A » → « S-002A » (migration unique, data/missions).

Dans chaque dossier de famille data/missions/<lettre>_<FAMILLE>/ : sous-dossiers de mission renommés (M001/ → M-001/),
fichiers renommés (missionM001.yaml → missionM-001.yaml, generalM001.png → generalM-001.png), identifiants réécrits
dans les YAML, Markdown et textes (mission.id, operation.id / missions, soutiens, noms de cartes, titres « # Mission »).
Seuls les identifiants des missions présentes sont touchés ; mission.former_id et RENUMEROTATION.md restent tels quels.
Déjà au format : ignoré. Usage (racine de l'application) : python tools/dash_mission_ids.py [--dry-run]
"""
import os, re, sys

sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
M = os.path.join(ROOT, 'data', 'missions')
DRY = '--dry-run' in sys.argv
FAMILY_DIR = re.compile(r'^([A-Z])_[A-Z0-9-]+$')
TEXT = re.compile(r'\.(ya?ml|md|txt|json|csv)$', re.I)


def main():
    """Passe au format avec tiret les missions de chaque dossier de famille : contenus des textes, puis noms de
    fichiers et de dossiers (rien n'est écrit avec --dry-run)."""
    total = 0
    for d in sorted(os.listdir(M)):
        fm = FAMILY_DIR.match(d)
        if not fm or not os.path.isdir(os.path.join(M, d)):
            continue
        L, base = fm.group(1), os.path.join(M, d)
        ops = sorted({re.match(rf'^({L}\d{{3}})[A-Z]?$', x).group(1) for x in os.listdir(base) if re.match(rf'^{L}\d{{3}}[A-Z]?$', x)})
        if not ops:
            continue
        tok = re.compile(r'(?<![A-Z0-9-])(' + '|'.join(ops) + r')(?![0-9])')
        sub = lambda s: tok.sub(lambda m: f'{m.group(1)[0]}-{m.group(1)[1:]}', s)
        print(f'{d} : ' + ', '.join(f'{o}→{o[0]}-{o[1:]}' for o in ops))
        # contenus, puis noms (fichiers avant dossiers : parcours du plus profond au moins profond)
        for dirpath, dirs, files in os.walk(base, topdown=False):
            for name in files:
                p = os.path.join(dirpath, name)
                if TEXT.search(name) and name != 'RENUMEROTATION.md':
                    t = open(p, encoding='utf-8', errors='replace').read()
                    # former_id conservé tel quel
                    t2 = '\n'.join(l if re.match(r'^\s*former_id:', l) else sub(l) for l in t.split('\n'))
                    if t2 != t:
                        total += 1
                        if not DRY:
                            open(p, 'w', encoding='utf-8', newline='').write(t2)
                nn = sub(name)
                if nn != name and not DRY:
                    os.rename(p, os.path.join(dirpath, nn))
            for name in dirs:
                nn = sub(name)
                if nn != name and not DRY:
                    os.rename(os.path.join(dirpath, name), os.path.join(dirpath, nn))
    print(('(simulation) ' if DRY else '') + f'{total} fichiers texte réécrits.')


if __name__ == '__main__':
    main()
