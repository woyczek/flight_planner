"""Passage d'une installation v2 à la v3 : les données sortent de l'application et vont dans data/.

La v3 sépare l'application (ce dépôt) et les données (dépôt privé cloné dans data/). Après être passé sur une version
3 (git pull / tools/update_suite.py update), lancer une fois, à la racine de l'application :

    python tools/migrate_v3.py                       → prépare data/, y range les données, affiche le bilan
    python tools/migrate_v3.py --data-url URL        → clone d'abord le dépôt de données dans data/ (s'il n'existe pas)
    python tools/migrate_v3.py --dry-run             → montre ce qui serait fait, sans rien changer

1. data/ : clone de --data-url, sinon dépôt git local neuf (modèle tools/data_template/ : data_tree.js, README, .gitignore)
   — à relier ensuite au dépôt distant (git remote add origin …).
2. Données qui étaient suivies par git en v2 (flotte, référence DEFA, indicatifs, corrections OACI, packs FMS GAAR,
   registres HEMS, MORA, axes ENR 5.7…) : recopiées depuis le dernier commit v2 (--from, détecté sinon) quand data/
   ne les a pas déjà.
3. Fichiers non suivis restés dans l'ancienne arborescence (registres missions.yaml et CSV, CR JSON, Missions/, XML
   AIRAC, base de performances, sauvegarde locale…) : déplacés dans data/ ; dossiers vides supprimés.
Aucun fichier existant de data/ n'est écrasé (conflits listés). Trace : .git/suite-update.log.
Bibliothèque standard uniquement.
"""
import datetime as dt, json, os, shutil, subprocess, sys

sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
DATA = os.path.join(ROOT, 'data')
TEMPLATE = os.path.join(ROOT, 'tools', 'data_template')
DRY = '--dry-run' in sys.argv
AIRAC = ('AIXM4.5_all_FR_OM_', 'XML_SIA_', 'sia-airspaces-', 'export_xml_bd_SIA_')


def git(*args, check=True):
    """Sortie d'une commande git à la racine de l'application ; en échec : RuntimeError (check) ou None."""
    r = subprocess.run(['git', *args], cwd=ROOT, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode and check:
        raise RuntimeError(r.stderr.strip())
    return r.stdout if r.returncode == 0 else None


def data_path(old):
    """Chemin dans data/ d'un fichier de l'ancienne arborescence (None : n'est pas une donnée)."""
    p = old.replace('\\', '/')
    name = p.rsplit('/', 1)[-1]
    if p in ('shared/aircraft_fleet.js', 'shared/defa_reference.js', 'shared/mission_core/data/callsigns.js', 'AircraftDB/aircraft_overrides.json'):
        return 'references/' + name
    if p == 'shared/mission_ledger_defaults.js':
        return 'cr/mission_ledger_defaults.js'
    if p.startswith('CR DEFA/') and not p.endswith('.html'):
        return 'cr/' + p[len('CR DEFA/'):]
    if p.startswith('Missions/'):
        return 'missions/' + p[len('Missions/'):]
    if p.startswith('SIA XML/'):
        rest = p[len('SIA XML/'):]
        if rest in ('mora.csv', 'miam-enr-5-7-tracks.xml', 'miam-enr-5-7-coordinates.xml', 'Lisez_moi.txt') or rest.startswith(AIRAC) or rest.startswith('_archives/'):
            return 'sia/' + rest
        return None
    if p == 'flight_performance_database_merged.fpdb.json':
        return 'planner/' + name
    if p in ('defa_local_store.yaml', 'VERSION.json'):
        return 'local/' + name
    return None


def last_v2_commit():
    """Dernier commit contenant l'ancienne arborescence (parent du commit qui a retiré shared/aircraft_fleet.js)."""
    for arg in sys.argv:
        if arg.startswith('--from='):
            return arg.split('=', 1)[1]
    if '--from' in sys.argv:
        return sys.argv[sys.argv.index('--from') + 1]
    removed = (git('log', '-1', '--format=%H', '--diff-filter=D', '--', 'shared/aircraft_fleet.js', check=False) or '').strip()
    return removed + '^' if removed else None


def main():
    """Prépare data/, y recopie les données suivies en v2 et y déplace les fichiers restés, puis affiche le bilan et
    l'inscrit dans .git/suite-update.log (rien n'est changé avec --dry-run)."""
    report = {'created': [], 'restored': [], 'moved': [], 'conflicts': [], 'removed_dirs': []}
    url = sys.argv[sys.argv.index('--data-url') + 1] if '--data-url' in sys.argv else None
    # 1. data/
    if not os.path.isdir(DATA):
        if url:
            print(f'Clone du dépôt de données : {url} → data/')
            if not DRY:
                r = subprocess.run(['git', 'clone', url, DATA], cwd=ROOT)
                if r.returncode:
                    print('✗ clone impossible (droits, réseau ?) : data/ sera créé vide, à relier ensuite.')
        if not os.path.isdir(DATA) and not DRY:
            os.makedirs(DATA)
            subprocess.run(['git', 'init', '-q', '-b', 'main'], cwd=DATA)
            report['created'].append('data/ (dépôt git local neuf)')
    for name in os.listdir(TEMPLATE):
        dst = os.path.join(DATA, name)
        if not os.path.exists(dst):
            report['created'].append('data/' + name)
            if not DRY:
                shutil.copy2(os.path.join(TEMPLATE, name), dst)
    # 2. données suivies en v2 : depuis le dernier commit v2
    ref = last_v2_commit()
    if ref:
        for old in (git('ls-tree', '-r', '--name-only', '-z', ref, check=False) or '').split('\0'):
            new = data_path(old) if old else None
            if not new:
                continue
            dst = os.path.join(DATA, new)
            if os.path.exists(dst):
                continue
            report['restored'].append(new)
            if not DRY:
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                blob = subprocess.run(['git', 'show', f'{ref}:{old}'], cwd=ROOT, capture_output=True).stdout
                open(dst, 'wb').write(blob)
    else:
        print('ℹ commit v2 introuvable : étape 2 sautée (données déjà dans data/ ?)')
    # 3. fichiers restés dans l'ancienne arborescence
    for top in ('CR DEFA', 'Missions', 'SIA XML', '.'):
        base = os.path.join(ROOT, top)
        if not os.path.isdir(base):
            continue
        walker = os.walk(base) if top != '.' else [(ROOT, [], [f for f in os.listdir(ROOT) if os.path.isfile(os.path.join(ROOT, f))])]
        for folder, _dirs, names in walker:
            for n in names:
                src = os.path.join(folder, n)
                rel = os.path.relpath(src, ROOT).replace(os.sep, '/')
                new = data_path(rel)
                if not new:
                    continue
                dst = os.path.join(DATA, new)
                if os.path.exists(dst):
                    same = open(src, 'rb').read() == open(dst, 'rb').read()
                    if same and not DRY:
                        os.remove(src)
                    elif not same:
                        report['conflicts'].append(f'{rel} (déjà dans data/{new}, contenu différent : non déplacé)')
                    continue
                report['moved'].append(f'{rel} → data/{new}')
                if not DRY:
                    os.makedirs(os.path.dirname(dst), exist_ok=True)
                    shutil.move(src, dst)
    # dossiers de l'ancienne arborescence devenus vides
    for top in ('CR DEFA', 'Missions', 'SIA XML'):
        base = os.path.join(ROOT, top)
        if not os.path.isdir(base):
            continue
        for folder, _dirs, _names in sorted(os.walk(base), key=lambda x: -len(x[0])):
            if not os.listdir(folder):
                report['removed_dirs'].append(os.path.relpath(folder, ROOT))
                if not DRY:
                    os.rmdir(folder)
    # bilan
    for k, label in (('created', 'Créés'), ('restored', 'Recopiés depuis le commit v2'), ('moved', 'Déplacés'), ('conflicts', 'Conflits'), ('removed_dirs', 'Dossiers vides supprimés')):
        if report[k]:
            print(f'{label} ({len(report[k])}) :')
            for x in report[k][:40]:
                print('   ' + x)
            if len(report[k]) > 40:
                print(f'   … (+{len(report[k]) - 40})')
    left = [d for d in ('CR DEFA', 'Missions', 'SIA XML') if os.path.isdir(os.path.join(ROOT, d))]
    if left:
        print('ℹ restent dans l\'ancienne arborescence (à vérifier) : ' + ', '.join(left))
    print(('(simulation) ' if DRY else '') + 'Ensuite : dans data/, « git add -A && git commit » puis relier et pousser le dépôt de données ; '
          'dans le navigateur, ☰ › Paramètres › Maintenance › Sources et dossiers › Dossier des données : choisir data/.')
    if not DRY:
        gitdir = (git('rev-parse', '--git-dir', check=False) or '.git').strip()
        with open(os.path.join(ROOT, gitdir, 'suite-update.log'), 'a', encoding='utf-8') as f:
            f.write(json.dumps({'at': dt.datetime.now().astimezone().isoformat(timespec='seconds'), 'action': 'migrate_v3', 'from': ref,
                                **{k: len(v) for k, v in report.items()}}, ensure_ascii=False) + '\n')


if __name__ == '__main__':
    main()
