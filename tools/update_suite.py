"""Mise à jour de la suite par git, selon le canal choisi (master = stable, develop = early bird).

Usage (à la racine du dépôt, ou n'importe où : le script retrouve le dépôt) :
    python tools/update_suite.py                  → état : branche, canal, retard / avance sur origin, version
    python tools/update_suite.py channel develop  → canal mémorisé dans la configuration git (suite.channel)
    python tools/update_suite.py update           → met à jour sur le canal mémorisé (ou --channel master|develop)
    python tools/update_suite.py doctor           → contrôle de cohérence de l'installation (remote, branches,
                                                    packs orphelins, VERSION.json, fichiers suivis mais ignorés)

La mise à jour n'écrase jamais un travail local : elle refuse si des fichiers suivis sont modifiés, et n'avance
que par « fast-forward » (git merge --ff-only). Chaque opération est tracée dans .git/suite-update.log (une ligne
JSON), relu par Paramètres › Maintenance. Vos données (registres YAML, sauvegardes, navigateur) ne sont pas
touchées : elles sont hors dépôt ou ignorées par git.
Bibliothèque standard uniquement.
"""
import datetime as dt, json, os, re, subprocess, sys

sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
CHANNELS = {'master': 'stable', 'develop': 'early bird'}
EXPECTED_REMOTE = re.compile(r'framagit\.org[/:]asr/flight_planner(\.git)?$', re.I)


def git(*args, check=True, root=None):
    """Sortie texte d'une commande git (erreur : exception, sauf check=False → None)."""
    r = subprocess.run(['git', *args], cwd=root or ROOT, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode != 0:
        if check:
            raise RuntimeError(f"git {' '.join(args)} : {r.stderr.strip() or r.stdout.strip()}")
        return None
    return r.stdout.strip()


try:
    ROOT = subprocess.run(['git', 'rev-parse', '--show-toplevel'], cwd=HERE, capture_output=True, text=True).stdout.strip() or os.path.dirname(HERE)
except FileNotFoundError:
    print('git est introuvable : installez Git (https://git-scm.com) ou mettez à jour par l’archive ZIP de framagit.')
    sys.exit(2)
GITDIR = os.path.join(ROOT, git('rev-parse', '--git-dir', check=False) or '.git')
LOG = os.path.join(GITDIR, 'suite-update.log')


def log(entry):
    """Ajoute une ligne JSON au journal .git/suite-update.log."""
    entry = {'at': dt.datetime.now().astimezone().isoformat(timespec='seconds'), **entry}
    with open(LOG, 'a', encoding='utf-8') as f:
        f.write(json.dumps(entry, ensure_ascii=False) + '\n')
    return entry


def release(ref=None):
    """Version de la suite (repository_tree : release.version) dans l'arbre de travail ou dans une référence git."""
    text = git('show', f'{ref}:repository_tree', check=False) if ref else open(os.path.join(ROOT, 'repository_tree'), encoding='utf-8').read()
    m = re.search(r'release\s*:\s*\{[^}]*version\s*:\s*"([^"]+)"', text or '')
    return m.group(1) if m else '?'


def channel():
    """Canal mémorisé (git config suite.channel), master par défaut."""
    c = git('config', '--get', 'suite.channel', check=False) or 'master'
    return c if c in CHANNELS else 'master'


def counts(a, b):
    """(avance, retard) de a par rapport à b ; None si une référence manque."""
    out = git('rev-list', '--left-right', '--count', f'{a}...{b}', check=False)
    return tuple(int(x) for x in out.split()) if out else None


def dirty():
    """Fichiers suivis modifiés (hors fichiers non suivis / ignorés)."""
    out = git('status', '--porcelain', '--untracked-files=no', check=False) or ''
    return [l for l in out.splitlines() if l.strip()]


def fetch():
    """git fetch origin --prune ; faux en cas d'échec (hors ligne…)."""
    try:
        git('fetch', 'origin', '--prune')
        return True
    except RuntimeError as e:
        print(f'⚠ fetch impossible : {e}')
        return False


def status(do_fetch=True):
    ok = fetch() if do_fetch else False
    branch = git('branch', '--show-current', check=False) or '(HEAD détachée)'
    ch = channel()
    print(f'Dépôt      : {ROOT}')
    print(f'Remote     : {git("remote", "get-url", "origin", check=False) or "(aucun)"}')
    print(f'Branche    : {branch}    canal mémorisé : {ch} ({CHANNELS[ch]})' + ('' if branch == ch else '  ⚠ la branche n’est pas celle du canal'))
    print(f'Version    : {release()} (arbre de travail)')
    for b in CHANNELS:
        c = counts(b, f'origin/{b}')
        if c is None:
            print(f'  {b:8} : absente localement ou sur origin')
        else:
            print(f'  {b:8} : {c[0]} commit(s) en avance, {c[1]} en retard sur origin/{b}' + (f' — origin/{b} : version {release("origin/" + b)}' if c[1] else ''))
    d = dirty()
    print(f'Modifs     : {len(d)} fichier(s) suivi(s) modifié(s)' + (' : ' + ', '.join(x[3:] for x in d[:8]) + (' …' if len(d) > 8 else '') if d else ''))
    if do_fetch:
        print('Fetch      : ' + ('fait' if ok else 'en échec (état d’après le dernier fetch)'))
    log({'action': 'status', 'branch': branch, 'channel': ch, 'head': git('rev-parse', 'HEAD', check=False), 'fetched': ok})


def set_channel(name):
    if name not in CHANNELS:
        print(f'Canal inconnu : {name} (master ou develop)')
        sys.exit(1)
    git('config', 'suite.channel', name)
    log({'action': 'channel', 'channel': name})
    print(f'Canal mémorisé : {name} ({CHANNELS[name]}). Appliquer : python tools/update_suite.py update')


def update(ch=None):
    ch = ch or channel()
    if ch not in CHANNELS:
        print(f'Canal inconnu : {ch}')
        sys.exit(1)
    d = dirty()
    if d:
        print('✗ Mise à jour refusée : fichiers suivis modifiés (commit, ou « git stash » puis relancer) :')
        for x in d[:30]:
            print('   ' + x)
        log({'action': 'update', 'channel': ch, 'ok': False, 'message': f'{len(d)} fichier(s) modifié(s)'})
        sys.exit(1)
    if not fetch():
        log({'action': 'update', 'channel': ch, 'ok': False, 'message': 'fetch impossible'})
        sys.exit(1)
    if git('rev-parse', '--verify', f'origin/{ch}', check=False) is None:
        print(f'✗ origin/{ch} introuvable.')
        sys.exit(1)
    before, before_v = git('rev-parse', 'HEAD'), release()
    current = git('branch', '--show-current', check=False)
    if current != ch:
        if git('rev-parse', '--verify', ch, check=False):
            git('switch', ch)
        else:
            git('switch', '-c', ch, '--track', f'origin/{ch}')
        print(f'Branche : {current or "(détachée)"} → {ch}')
    ahead, behind = counts(ch, f'origin/{ch}') or (0, 0)
    if ahead and behind:
        msg = f'{ch} a divergé de origin/{ch} ({ahead} commit(s) locaux, {behind} distants) : fusion manuelle nécessaire'
        print('✗ ' + msg)
        log({'action': 'update', 'channel': ch, 'ok': False, 'from': before, 'message': msg})
        sys.exit(1)
    if behind:
        git('merge', '--ff-only', f'origin/{ch}')
    after, after_v = git('rev-parse', 'HEAD'), release()
    if before == after:
        print(f'✓ Déjà à jour sur {ch} ({after_v}).' + (f' {ahead} commit(s) local(aux) non publié(s).' if ahead else ''))
    else:
        print(f'✓ Mis à jour : {before_v} → {after_v} ({before[:9]} → {after[:9]})')
        print(git('log', '--oneline', '--no-decorate', '-n', '30', f'{before}..{after}', check=False) or '')
        print('Recharger les pages ouvertes (Ctrl+F5 si une ancienne version reste affichée).')
    log({'action': 'update', 'channel': ch, 'ok': True, 'from': before, 'to': after, 'fromVersion': before_v, 'toVersion': after_v})


def doctor():
    issues = []
    url = git('remote', 'get-url', 'origin', check=False) or ''
    if not EXPECTED_REMOTE.search(url):
        issues.append(f'remote origin inattendu : « {url} » (attendu https://framagit.org/asr/flight_planner.git)')
    for b in CHANNELS:
        if git('rev-parse', '--verify', b, check=False) is None:
            issues.append(f'branche locale {b} absente (git switch -c {b} --track origin/{b})')
        up = git('rev-parse', '--abbrev-ref', f'{b}@{{upstream}}', check=False)
        if up and up != f'origin/{b}':
            issues.append(f'{b} suit {up} au lieu de origin/{b}')
    merged = [x.strip(' *+') for x in (git('branch', '--merged', 'develop', check=False) or '').splitlines()]
    stale = [x for x in merged if x and x not in CHANNELS]
    if stale:
        issues.append('branches déjà fusionnées dans develop (à supprimer : git branch -d …) : ' + ', '.join(stale))
    pack = os.path.join(GITDIR, 'objects', 'pack')
    if os.path.isdir(pack):
        names = os.listdir(pack)
        orphans = [n for n in names if n.endswith('.pack') and n[:-5] + '.idx' not in names]
        if orphans:
            issues.append(f'{len(orphans)} pack(s) sans index dans .git/objects/pack (copie de synchronisation ou gc interrompu) : '
                          'vérifier avec « git fsck --no-dangling », puis déplacer ces .pack hors du dépôt et lancer « git gc »')
    vj = os.path.join(ROOT, 'VERSION.json')
    if os.path.exists(vj):
        try:
            v = json.load(open(vj, encoding='utf-8')).get('release')
            if v != release():
                issues.append(f'VERSION.json ({v}) ≠ repository_tree ({release()}) : VERSION.json est ignoré par git et périmé — le supprimer ou le régénérer')
        except Exception as e:
            issues.append(f'VERSION.json illisible : {e}')
    tracked_ignored = git('ls-files', '-ci', '--exclude-standard', check=False) or ''
    if tracked_ignored:
        issues.append('fichiers suivis bien qu’ignorés par .gitignore (une nouvelle copie ne serait pas ajoutée) : ' + ', '.join(tracked_ignored.splitlines()[:10]))
    if os.environ.get('OS', '').startswith('Windows') or os.name == 'nt':
        if (git('config', '--get', 'core.autocrlf', check=False) or '') not in ('true', 'input'):
            issues.append('core.autocrlf non réglé sous Windows : risque de fins de ligne mélangées (git config core.autocrlf true)')
    print('✓ Installation cohérente.' if not issues else '\n'.join('⚠ ' + i for i in issues))
    log({'action': 'doctor', 'issues': issues})


if __name__ == '__main__':
    args = sys.argv[1:]
    cmd = args[0] if args else 'status'
    try:
        if cmd == 'status':
            status('--no-fetch' not in args)
        elif cmd == 'channel' and len(args) > 1:
            set_channel(args[1])
        elif cmd == 'update':
            ch = args[args.index('--channel') + 1] if '--channel' in args else None
            update(ch)
        elif cmd == 'doctor':
            doctor()
        else:
            print(__doc__)
    except RuntimeError as e:
        print(f'✗ {e}')
        log({'action': cmd, 'ok': False, 'message': str(e)})
        sys.exit(1)
