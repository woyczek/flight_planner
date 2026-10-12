"""Passe les missions du dépôt de données au format helo-xp-mission 2.0 (schema_version: '2.0').

Le format 2.0 (docs/technique/PROMPT_GENERATEUR_MISSIONS.md § 4, schéma helo-xp-mission) ne fait qu'ajouter des champs facultatifs
au 1.0 et fixe l'identifiant « lettre de la famille - numéro de l'opération [équipe | Z] » : un fichier 1.0 dont
l'identifiant est déjà à ce format (missions renumérotées par tools/renumber_missions.py) est conforme, seul son
repère de version change. Les autres fichiers sont signalés, pas modifiés.

Usage (à la racine du dépôt) :
    python tools/migrate_missions_schema.py            → aperçu (rien n'est écrit)
    python tools/migrate_missions_schema.py --write    → écrit
    python tools/migrate_missions_schema.py --write --missions <dossier>   (défaut : data/missions)
"""
import glob, os, re, sys

sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
ID = re.compile(r"^\s{2}id:\s*['\"]?([A-Z]-\d{3}[A-Z]?)['\"]?\s*$", re.M)
VER = re.compile(r"^schema_version:\s*['\"]?1\.0['\"]?\s*$", re.M)


def main(args):
    """Passe en 2.0 les fichiers de mission dont l'identifiant est au format (--write pour écrire) et liste les autres."""
    write = '--write' in args
    folder = args[args.index('--missions') + 1] if '--missions' in args else os.path.join(ROOT, 'data', 'missions')
    done, skipped, current = [], [], 0
    for path in sorted(glob.glob(os.path.join(folder, '**', 'mission*.yaml'), recursive=True)):
        if os.sep + 'versions' + os.sep in path or path.endswith('mission_registry.yaml'):
            continue
        raw = open(path, encoding='utf-8', newline='').read()
        if not VER.search(raw):
            current += 1
            continue
        if not ID.search(raw):
            skipped.append(os.path.relpath(path, folder))
            continue
        if write:
            open(path, 'w', encoding='utf-8', newline='').write(VER.sub("schema_version: '2.0'", raw, count=1))
        done.append(os.path.relpath(path, folder))
    print(f"{'Passés' if write else 'À passer'} en 2.0 : {len(done)} ; déjà à jour ou sans repère : {current} ; identifiant hors format (non modifiés) : {len(skipped)}")
    for p in skipped:
        print('  ?', p)


if __name__ == '__main__':
    main(sys.argv[1:])
