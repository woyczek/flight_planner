"""Synchronisation git du pool de données (docs/technique/INDEX_DONNEES.md § 9, étape 8), appelée par le lanceur
(tools/launch.py : GET /__setup/sync-status, POST /__setup/sync, bouton « Synchroniser » de l'en-tête, shared/sync.js).

Un passage de synchronisation (run) :
  1. les fichiers du pool modifiés sur ce poste (POOL, hors index régénérés et copies de conflits) sont commités, au nom
     du trigramme connecté (auteur du commit) ;
  2. la branche distante est récupérée (fetch) puis fusionnée (merge, pas de rebase : l'historique n'est jamais
     réécrit, une seule fusion à résoudre) ;
  3. fichier en conflit → fusion par le lanceur, fiche par fiche (resolve) : les données sont découpées à une fiche
     par fichier (semaine d'un pilote, utilisateur, mission) — la plus récente (updated_at) l'emporte, l'autre est
     gardée dans <dossier>/_conflits/ et signalée ; les deux fichiers qui regroupent plusieurs fiches sont fusionnés
     entrée par entrée (missions/affectations.json par mission, pilote et rôle ; missions/affectations_log.json, journal
     en ajout seul : réunion) ;
  4. le résultat est poussé (push).

Essai sans toucher au vrai dépôt : python tools/data_sync.py --essai (dépôt distant et deux copies dans un dossier
temporaire, modifications croisées, conflits, vérifications).
"""
import json, os, re, shutil, subprocess, sys, tempfile, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import data_guard  # .js du pool : format des fichiers de données seulement (jamais de code commité)

# chemins synchronisés (relatifs à data/) ; index régénérés et repère du lanceur exclus ; sia/base : base aéronautique
# publiée par zone par le poste qui la reconstruit (shared/sia_base.js, publish), lue par les téléphones (mode GitHub) —
# les fichiers du SIA eux-mêmes (sia/*.xml) restent hors du dépôt
POOL = ['disponibilites', 'utilisateurs', 'config', 'missions', 'cr', 'atc', 'odv', 'sia/base']
EXCLUDE = [':(exclude,glob)**/_index.json', ':(exclude,glob)**/_conflits/**', ':(exclude).defa_instance']
# index des dossiers : régénérés par le lanceur (et par l'appli en mode GitHub, depuis l'arbre), jamais suivis par git ;
# une copie suivie dans le dépôt (écrite par une version précédente de l'appli) est retirée du suivi, jamais fusionnée
INDEXES = [':(glob)**/_index.json']
TIMEOUT = 120

try:
    import yaml  # PyYAML : updated_at des fichiers YAML (sinon : expression régulière)
except ImportError:  # pragma: no cover
    yaml = None


ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
# exécutables cherchés dans le PATH seulement, jamais dans le dossier courant (un git.exe déposé dans la suite)
os.environ['NoDefaultCurrentDirectoryInExePath'] = '1'
# options de chaque appel : rien de ce que contiendrait un .git/config reçu d'ailleurs ne lance de commande
# (core.fsmonitor), pas de transport « ext:: » (commande arbitraire), pas de sous-module suivi
HARDEN = ['-c', 'core.fsmonitor=false', '-c', 'protocol.ext.allow=never', '-c', 'submodule.recurse=false']
_git = []


def git_exe():
    """Chemin absolu de git, pris dans le PATH hors du dossier de la suite ; '' s'il est absent."""
    if not _git:
        root = os.path.normcase(os.path.realpath(ROOT))
        dirs = [d for d in os.environ.get('PATH', '').split(os.pathsep)
                if d.strip() and os.path.isabs(d) and not (os.path.normcase(os.path.realpath(d)) + os.sep).startswith(root + os.sep)]
        _git.append(shutil.which('git', path=os.pathsep.join(dirs)) or '')
    return _git[0]


def git_cmd(*args):
    """git durci (HARDEN) avec ses arguments ; git absent : 'git' (l'appel échoue proprement)."""
    return [git_exe() or 'git', *HARDEN, *args]


def git_env():
    """Git sans question dans le terminal ni fenêtre d'identifiants ; SSH sans question non plus (clé ou rien ; hôte
    inconnu accepté à la première connexion, refusé s'il a changé)."""
    return dict(os.environ, GIT_TERMINAL_PROMPT='0', GCM_INTERACTIVE='never',
                GIT_SSH_COMMAND=os.environ.get('GIT_SSH_COMMAND', 'ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15'))


# ---- dépôt distant de synchronisation (premier lancement : adresse précisée, vérifiée, jamais bloquante)
# git@hôte:chemin, ssh://[utilisateur@]hôte[:port]/chemin, http(s)://[utilisateur@]hôte[:port]/chemin : jamais de
# mot de passe ni de jeton dans l'adresse (il finirait en clair dans data/.git/config), jamais de « - » en tête
REMOTE_RE = re.compile(r'^(?:\w[\w.-]*@\w[\w.-]*:[\w./~-]+'
                       r'|ssh://(?:\w[\w.-]*@)?\w[\w.-]*(?::\d+)?/[\w./~-]+'
                       r'|https?://(?:\w[\w.-]*@)?\w[\w.-]*(?::\d+)?(?:/[^\s@]*)?)$')
REMOTE_HELP = 'Adresse invalide : git@hôte:compte/dépôt.git ou https://hôte/compte/dépôt.git (sans mot de passe ni jeton dans l’adresse).'


def same_repo(a, b):
    """Même dépôt, quelle que soit la forme de l'adresse (https, ssh, git@hôte:…, .git final, utilisateur)."""
    def norm(u):
        u = re.sub(r'^(?:[a-z+]+://)?(?:[^@/]+@)?', '', (u or '').strip().lower())
        return re.sub(r'(?:\.git)?/*$', '', u.replace(':', '/', 1))
    return bool(a and b) and norm(a) == norm(b)


def remote_info(data):
    """Dépôt distant de data/ : { repo, remote (nom), url, branch }."""
    if not is_repo(data):
        return {'repo': False, 'remote': '', 'url': '', 'branch': ''}
    br, _, remote = branch_info(data)
    url = git(data, 'remote', 'get-url', remote)[1] if remote else ''
    return {'repo': True, 'remote': remote, 'url': url, 'branch': br}


def check_remote(url):
    """Le dépôt répond-il ? git ls-remote, sans question (identifiants, clé SSH) ; rend { ok, message, branches }."""
    url = (url or '').strip()
    if not REMOTE_RE.match(url):
        return {'ok': False, 'message': REMOTE_HELP, 'branches': []}
    if not git_exe():
        return {'ok': False, 'message': 'Git n’est pas installé sur cet ordinateur.', 'branches': []}
    try:
        r = subprocess.run(git_cmd('ls-remote', '--heads', '--', url), capture_output=True, text=True, encoding='utf-8',
                           errors='replace', env=git_env(), timeout=30)
    except subprocess.TimeoutExpired:
        return {'ok': False, 'message': 'Pas de réponse en 30 s (réseau, adresse, pare-feu).', 'branches': []}
    except OSError as e:
        return {'ok': False, 'message': str(e), 'branches': []}
    out = (r.stdout + r.stderr).strip()
    if r.returncode:
        if re.search(r'Permission denied|publickey|Authentication failed|could not read Username|403|401|terminal prompts disabled', out, re.I):
            msg = 'Le dépôt existe peut-être, mais l’accès est refusé : clé SSH (adresse git@…) ou identifiants enregistrés dans Git (adresse https://…) à régler sur cet ordinateur.'
        elif re.search(r'not found|does not exist|Repository not found|404', out, re.I):
            msg = 'Dépôt introuvable à cette adresse.'
        elif re.search(r'Could not resolve|unable to access|Connection|timed out', out, re.I):
            msg = 'Hôte injoignable (réseau, nom d’hôte, pare-feu).'
        else:
            msg = out[-300:] or 'Échec de git ls-remote.'
        return {'ok': False, 'message': msg, 'branches': []}
    branches = [l.split('refs/heads/', 1)[1] for l in r.stdout.splitlines() if 'refs/heads/' in l]
    return {'ok': True, 'message': f'Le dépôt répond : {len(branches)} branche(s).', 'branches': branches}


def set_remote(data, url, allowed=()):
    """Adresse du dépôt distant de data/ (dépôt distant de la branche, sinon origin, créé au besoin). Seulement vers le
    dépôt actuel ou l'un des dépôts admis (allowed : celui de la configuration, ou celui que l'utilisateur vient de
    confirmer dans la fenêtre du lanceur) : une page piégée enverrait sinon toutes les données ailleurs au
    « Synchroniser » suivant. Refus : { ok: False, refused: True, current }."""
    url = (url or '').strip()
    if not REMOTE_RE.match(url):
        return {'ok': False, 'message': REMOTE_HELP}
    if not is_repo(data):
        return {'ok': False, 'message': 'data/ n’est pas encore un dépôt git : l’adresse servira à récupérer les données.'}
    info = remote_info(data)
    name = info['remote'] or 'origin'
    if not any(same_repo(url, u) for u in (info['url'], *allowed)):
        return {'ok': False, 'refused': True, 'current': info['url'],
                'message': 'Autre dépôt que celui des données : changement à confirmer dans la fenêtre du lanceur.'}
    code, out = git(data, 'remote', 'set-url', '--', name, url) if info['remote'] else git(data, 'remote', 'add', '--', name, url)
    return {'ok': code == 0, 'message': f'Dépôt distant « {name} » : {url}' if code == 0 else out}


def git(data, *args, env=None, check=False):
    """git -C data … ; rend (code, sortie texte)."""
    try:
        r = subprocess.run(git_cmd('-C', data, *args), capture_output=True, text=True, encoding='utf-8', errors='replace',
                           env=env or git_env(), timeout=TIMEOUT)
    except (OSError, subprocess.SubprocessError) as e:
        if check:
            raise RuntimeError(str(e))
        return 1, str(e)
    out = (r.stdout + r.stderr).strip()
    if check and r.returncode:
        raise RuntimeError(out or f'git {" ".join(args)} : échec')
    return r.returncode, out


def blob(data, stage, path):
    """Contenu d'une version d'un fichier en conflit (1 base, 2 la nôtre, 3 la leur) ; None si absente."""
    try:
        r = subprocess.run(git_cmd('-C', data, 'show', f':{stage}:{path}'), capture_output=True, env=git_env(), timeout=TIMEOUT)
    except (OSError, subprocess.SubprocessError):
        return None
    return r.stdout if r.returncode == 0 else None


def is_repo(data):
    """Vrai si data/ est un dépôt git et que git est disponible sur ce poste."""
    return os.path.isdir(os.path.join(data, '.git')) and bool(git_exe())


def branch_info(data):
    """Branche, branche suivie (amont), dépôt distant."""
    _, br = git(data, 'rev-parse', '--abbrev-ref', 'HEAD')
    code, up = git(data, 'rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}')
    up = up if code == 0 else ''
    remote = up.split('/', 1)[0] if up else ''
    if not remote:
        _, rs = git(data, 'remote')
        remote = (rs.split() or [''])[0]
    return br, up, remote


def pool_changes(data, spec=None):
    """Fichiers du pool (ou d'autres chemins : spec) modifiés, ajoutés ou supprimés sur ce poste (non commités)."""
    try:  # sortie brute, -z : l'espace de tête du code d'état compte (pas de strip) ; chemins sans guillemets
        out = subprocess.run(git_cmd('-C', data, 'status', '--porcelain', '-z', '-uall', '--', *(spec or [*POOL, *EXCLUDE])),
                             capture_output=True, env=git_env(), timeout=TIMEOUT).stdout.decode('utf-8', errors='replace')
    except (OSError, subprocess.SubprocessError):
        return []
    items, files = out.split('\0'), []
    i = 0
    while i < len(items):
        e = items[i]
        if len(e) > 3:
            files.append(e[3:])
            if e[0] in 'RC':  # renommage : l'ancien chemin suit
                i += 1
                files.append(items[i])
        i += 1
    return files


# ---- écart entre data/ et sa sauvegarde git distante : seuils [à synchroniser, alerte] ; surchargeables dans
# data/config/suite.json, clé « sync » ({ "changes": [20, 100], … })
DIVERGENCE = {
    'changes': [20, 100],  # fichiers du pool modifiés sur ce poste, pas encore envoyés
    'age_h': [48, 168],  # âge (heures) de la plus ancienne modification non envoyée
    'behind': [10, 50],  # commits du dépôt distant pas encore reçus
    'ahead': [1, 20],  # commits locaux pas encore envoyés (envoi échoué)
    'outside': [1, 50],  # fichiers modifiés hors du pool : jamais envoyés par « Synchroniser »
}


def thresholds(data):
    """Seuils d'alerte de divergence (DIVERGENCE), surchargés par config/suite.json › sync s'ils sont bien formés."""
    t = {k: list(v) for k, v in DIVERGENCE.items()}
    try:
        with open(os.path.join(data, 'config', 'suite.json'), encoding='utf-8') as f:
            o = json.load(f).get('sync') or {}
        for k, v in o.items():
            if k in t and isinstance(v, list) and len(v) == 2 and all(isinstance(x, (int, float)) for x in v):
                t[k] = v
    except (OSError, ValueError, AttributeError):
        pass
    return t


def is_trial(data):
    """Jeu d'essai (tools/jeu_essai.py : repère data_tree.js « jeu_essai: true ») : pas de sauvegarde attendue."""
    try:
        with open(os.path.join(data, 'data_tree.js'), encoding='utf-8') as f:
            return 'jeu_essai: true' in f.read(4000)
    except OSError:
        return False


def outside_changes(data):
    """Fichiers modifiés ou nouveaux de data/ hors du pool (références, SIA…) : ignorés par « Synchroniser »."""
    return pool_changes(data, ['.', *[f':(exclude){p}' for p in POOL], *EXCLUDE, ':(exclude)local/**'])


def oldest_age_h(data, files):
    """Âge en heures du plus ancien des fichiers donnés (modifications locales en attente) ; 0 sans fichier lisible."""
    now, ages = time.time(), []
    for p in files:
        try:
            ages.append((now - os.path.getmtime(os.path.join(data, p))) / 3600)
        except OSError:
            pass  # fichier supprimé
    return round(max(ages), 1) if ages else 0


def divergence(data, st):
    """Niveau d'écart : none (rien à sauvegarder), ok, warn (à synchroniser), alert ; raisons [{ code, n, seuil }]."""
    if not st.get('repo'):
        if is_trial(data):
            return {'level': 'none', 'reasons': [{'code': 'trial'}]}
        return {'level': 'alert', 'reasons': [{'code': 'no_repo' if git_exe() else 'no_git'}]}
    reasons, level = [], 'ok'
    rank = {'ok': 0, 'warn': 1, 'alert': 2}

    def bump(lv, r):
        nonlocal level
        reasons.append(r)
        if rank[lv] > rank[level]:
            level = lv
    if not st.get('remote'):
        bump('alert', {'code': 'no_remote'})
    if st.get('merging'):
        bump('alert', {'code': 'merging'})
    t = thresholds(data)
    for code, n in (('changes', st.get('changes', 0)), ('age_h', st.get('oldest_h', 0) if st.get('changes') else 0),
                    ('behind', st.get('behind', 0)), ('ahead', st.get('ahead', 0)), ('outside', len(st.get('outside') or []))):
        warn, alert = t[code]
        if n >= alert:
            bump('alert', {'code': code, 'n': n, 'seuil': alert})
        elif n >= warn:
            bump('warn', {'code': code, 'n': n, 'seuil': warn})
    return {'level': level, 'reasons': reasons}


def status(data, fetch=False):
    """État pour l'en-tête : dépôt, branche, modifications locales, commits à envoyer / à recevoir, écart avec la
    sauvegarde distante (divergence : niveau et raisons)."""
    if not is_repo(data):
        st = {'repo': False}
        st['divergence'] = divergence(data, st)
        return st
    br, up, remote = branch_info(data)
    fetched = False
    if fetch and remote:
        fetched = git(data, 'fetch', '--quiet', remote)[0] == 0
    ahead = behind = 0
    if up:
        code, out = git(data, 'rev-list', '--left-right', '--count', f'HEAD...{up}')
        if code == 0 and len(out.split()) == 2:
            ahead, behind = map(int, out.split())
    merging = os.path.exists(os.path.join(data, '.git', 'MERGE_HEAD'))
    changes = pool_changes(data)
    st = {'repo': True, 'branch': br, 'upstream': up, 'remote': remote, 'changes': len(changes),
          'oldest_h': oldest_age_h(data, changes), 'outside': outside_changes(data)[:200],
          'ahead': ahead, 'behind': behind, 'merging': merging, 'fetched': fetched, 'last': last_sync(data)}
    st['divergence'] = divergence(data, st)
    return st


def last_sync(data):
    """Résultat du dernier passage de synchronisation de ce poste (data/local/sync.json) ; None s'il n'y en a pas."""
    try:
        return json.load(open(os.path.join(data, 'local', 'sync.json'), encoding='utf-8'))
    except (OSError, ValueError):
        return None


def remember(data, result):
    """Garde le résultat d'un passage de synchronisation dans data/local/sync.json (propre au poste, ignoré par git)."""
    os.makedirs(os.path.join(data, 'local'), exist_ok=True)  # local/ : propre au poste, ignoré par git
    with open(os.path.join(data, 'local', 'sync.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump({k: result.get(k) for k in ('at', 'author', 'committed', 'received', 'pushed', 'conflicts', 'refused', 'ok')}, f,
                  ensure_ascii=False, indent=1)


# ---- fusion fiche par fiche
def parse(raw, path):
    if raw is None:
        return None
    text = raw.decode('utf-8', errors='replace')
    if path.endswith('.json'):
        try:
            return json.loads(text)
        except ValueError:
            return None
    if path.endswith(('.yaml', '.yml')) and yaml:
        try:
            return yaml.safe_load(text)
        except yaml.YAMLError:
            return None
    return None


def stamp(raw, path):
    """updated_at d'une version (fiche), '' sinon."""
    v = parse(raw, path)
    if isinstance(v, dict):
        return str(v.get('updated_at') or v.get('updatedAt') or '')
    m = re.search(rb'^updated_at:\s*[\'"]?([^\'"\r\n]+)', raw or b'', re.M)
    return m.group(1).decode() if m else ''


def keep_copy(data, path, raw, side):
    """Version perdante gardée dans <dossier>/_conflits/ (non synchronisé) ; chemin relatif rendu."""
    d, name = os.path.split(path)
    base, ext = os.path.splitext(name)
    rel = '/'.join(x for x in (d, '_conflits', f'{base}.{side}.{time.strftime("%Y%m%d-%H%M%S")}{ext}') if x)
    full = os.path.join(data, *rel.split('/'))
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'wb') as f:
        f.write(raw)
    return rel


def merge_records(base, ours, theirs, key):
    """Fusion à trois de listes de fiches (dict) identifiées par key ; conflit (modifiée des deux côtés) : la plus
    récente (updated_at). Rend (liste, conflits)."""
    b = {key(x): x for x in base or []}
    o = {key(x): x for x in ours or []}
    t = {key(x): x for x in theirs or []}
    out, conflicts = [], []
    for k in list(dict.fromkeys([*o, *t])):
        x, y, z = b.get(k), o.get(k), t.get(k)
        if y is None or z is None:  # présente d'un seul côté
            other = z if y is None else y
            if x is not None and other == x:
                continue  # supprimée d'un côté, inchangée de l'autre : supprimée
            out.append(other)
        elif y == z or z == x:
            out.append(y)
        elif y == x:
            out.append(z)
        else:
            conflicts.append(k)
            out.append(y if str(y.get('updated_at') or '') >= str(z.get('updated_at') or '') else z)
    return out, conflicts


def resolve(data, path):
    """Fichier en conflit résolu et ajouté ; rend {'path', 'how', 'copy'?}."""
    full = os.path.join(data, *path.split('/'))
    if is_index(path):  # index régénéré : retiré du suivi, jamais fusionné (le lanceur le refait)
        git(data, 'rm', '--cached', '-q', '--ignore-unmatch', '--', path)
        if os.path.isfile(full):
            os.remove(full)
        return {'path': path, 'how': 'index retiré (régénéré)'}
    raw = {s: blob(data, s, path) for s in (1, 2, 3)}
    base, ours, theirs = (parse(raw[s], path) for s in (1, 2, 3))
    write = lambda text: open(full, 'w', encoding='utf-8', newline='\n').write(text)
    if path.endswith('missions/affectations.json') and isinstance(ours, dict) and isinstance(theirs, dict):
        key = lambda a: f"{a.get('mission')}|{a.get('pilot')}|{a.get('role') or ''}"
        merged, conflicts = merge_records((base or {}).get('assignments'), ours.get('assignments'), theirs.get('assignments'), key)
        doc = {**theirs, **ours, 'assignments': merged,
               'updatedAt': max(str(ours.get('updatedAt') or ''), str(theirs.get('updatedAt') or ''))}
        write(json.dumps(doc, ensure_ascii=False, indent=1) + '\n')
        git(data, 'add', '--', path)
        return {'path': path, 'how': 'fiches', 'conflicts': conflicts}
    if path.endswith('missions/affectations_log.json') and isinstance(ours, dict) and isinstance(theirs, dict):
        seen, entries = set(), []
        for e in [*(ours.get('entries') or []), *(theirs.get('entries') or [])]:
            k = json.dumps(e, sort_keys=True, ensure_ascii=False)
            if k not in seen:
                seen.add(k)
                entries.append(e)
        entries.sort(key=lambda e: str(e.get('at') or ''))
        doc = {**theirs, **ours, 'entries': entries,
               'updatedAt': max(str(ours.get('updatedAt') or ''), str(theirs.get('updatedAt') or ''))}
        write(json.dumps(doc, ensure_ascii=False, indent=1) + '\n')
        git(data, 'add', '--', path)
        return {'path': path, 'how': 'journal'}
    # registre signé des utilisateurs (comptes signés, docs/technique/COMPTES_SIGNES.md § 5) : la version la plus haute
    # est gardée, l'autre va dans _conflits/ ; Python ne vérifie rien (les navigateurs vérifient signatures et chaîne)
    if path.endswith('utilisateurs/_registre.json') and isinstance(ours, dict) and isinstance(theirs, dict):
        version = lambda d: (d.get('contenu') or {}).get('version') if isinstance(d.get('contenu'), dict) else None
        vo, vt = version(ours), version(theirs)
        vo, vt = (v if isinstance(v, int) else -1 for v in (vo, vt))
        win, lose, side = (raw[2], raw[3], 'distante') if vo >= vt else (raw[3], raw[2], 'locale')
        open(full, 'wb').write(win)
        copy = keep_copy(data, path, lose, side)
        git(data, 'add', '--', path)
        return {'path': path, 'how': 'registre (version la plus haute)', 'copy': copy}
    # une fiche par fichier : supprimée d'un côté, modifiée de l'autre → gardée ; sinon la plus récente
    if raw[2] is None or raw[3] is None:
        win = raw[2] if raw[2] is not None else raw[3]
        open(full, 'wb').write(win)
        git(data, 'add', '--', path)
        return {'path': path, 'how': 'gardée (supprimée d’un côté seulement)'}
    mine_wins = stamp(raw[2], path) >= stamp(raw[3], path)
    win, lose, side = (raw[2], raw[3], 'distante') if mine_wins else (raw[3], raw[2], 'locale')
    open(full, 'wb').write(win)
    copy = keep_copy(data, path, lose, side)
    git(data, 'add', '--', path)
    return {'path': path, 'how': 'la plus récente', 'copy': copy}


def is_index(path):
    """Vrai pour un index de dossier régénéré (…/_index.json)."""
    return path == '_index.json' or path.endswith('/_index.json')


def untrack_indexes(data, who, env):
    """Index de dossier suivis par git : retirés du suivi (le fichier reste, le lanceur le refait) et commit. Rend la liste."""
    _, out = git(data, 'ls-files', '--', *INDEXES)
    tracked = [x for x in out.splitlines() if x.strip()]
    if tracked:
        git(data, 'rm', '--cached', '-q', '--', *tracked, check=True)
        git(data, *who, 'commit', '-m', 'Index des dossiers retirés du dépôt (régénérés)', env=env, check=True)
    return tracked


def refused_note(res):
    """Fichiers .js refusés à l'envoi (format des données, tools/data_guard.py), pour le compte rendu."""
    r = res.get('refused') or []
    return f" {len(r)} fichier(s) .js refusé(s), pas au format des données : {', '.join(x['path'] for x in r)}." if r else ''


def run(data, author, name=''):
    """Un passage de synchronisation ; rend le compte rendu (ok, committed, received, pushed, conflicts, message)."""
    res = {'ok': False, 'at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'author': author, 'committed': 0,
           'received': 0, 'pushed': False, 'conflicts': [], 'refused': []}
    if not is_repo(data):
        res['message'] = 'data/ n’est pas un dépôt git (ou git est absent).'
        return res
    if not re.fullmatch(r'[A-Z0-9]{2,5}', author or ''):
        res['message'] = 'Trigramme de l’auteur manquant ou invalide.'
        return res
    if os.path.exists(os.path.join(data, '.git', 'MERGE_HEAD')) or os.path.isdir(os.path.join(data, '.git', 'rebase-merge')):
        res['message'] = 'Une fusion ou un rebase est en cours dans data/ : à terminer ou annuler à la main.'
        return res
    who = ['-c', f'user.name={author}', '-c', f'user.email={author.lower()}@defa.local']
    env = dict(git_env(), GIT_AUTHOR_NAME=f'{author}{" " + name if name else ""}', GIT_AUTHOR_EMAIL=f'{author.lower()}@defa.local')
    try:
        # 1. modifications de ce poste
        changes = pool_changes(data)
        # .js hors du format des fichiers de données (tools/data_guard.py) : jamais commités, jamais envoyés — un script
        # glissé dans data/ (page piégée, dossier autorisé) ne se propage pas aux autres postes
        for p in [c for c in changes if c.lower().endswith('.js') and os.path.isfile(os.path.join(data, *c.split('/')))]:
            ok, why = data_guard.check_file(os.path.join(data, *p.split('/')))
            if not ok:
                changes.remove(p)
                res['refused'].append({'path': p, 'why': why})
        if changes:
            git(data, 'add', '-A', '--', *changes, check=True)  # fichiers modifiés seuls (dossier du pool absent : pas d'erreur)
            code, _ = git(data, 'diff', '--cached', '--quiet')
            if code:
                git(data, *who, 'commit', '-m', f'Synchronisation {author} : {len(changes)} fichier(s)', env=env, check=True)
                res['committed'] = len(changes)
        # index suivis sur ce poste (reçus d'une version précédente, puis refaits par le lanceur) : retirés du suivi
        # d'abord, sinon la fusion refuserait d'écraser la copie refaite
        res['untracked'] = untrack_indexes(data, who, env)
        br, up, remote = branch_info(data)
        if not remote:
            res.update(ok=True, message='Commit local seulement : pas de dépôt distant.' + refused_note(res))
            return res
        # 2. branche distante
        git(data, 'fetch', remote, env=env, check=True)
        target = up or f'{remote}/{br}'
        code, _ = git(data, 'rev-parse', '--verify', '--quiet', target)
        if code == 0:
            _, before = git(data, 'rev-parse', 'HEAD')
            # index suivis dans le dépôt distant : la copie locale non suivie (régénérée) bloquerait la fusion — retirée,
            # le lanceur la refait
            _, theirs = git(data, 'ls-tree', '-r', '--name-only', target)  # (ls-tree ne lit pas « :(glob) »)
            _, ours_idx = git(data, 'ls-files', '--', *INDEXES)
            for p in {x for x in theirs.splitlines() if is_index(x)} - set(ours_idx.split()):
                f = os.path.join(data, *p.split('/'))
                if os.path.isfile(f):
                    os.remove(f)
            code, out = git(data, *who, 'merge', '--no-edit', target, env=env)
            if code:
                _, unmerged = git(data, 'diff', '--name-only', '--diff-filter=U')
                if not unmerged.strip():
                    raise RuntimeError(out)
                # 3. conflits : fusion fiche par fiche
                for path in unmerged.splitlines():
                    r = resolve(data, path.strip())
                    if r.get('copy') or r.get('conflicts'):
                        res['conflicts'].append(r)
                git(data, *who, 'commit', '--no-edit', env=env, check=True)
            _, n = git(data, 'diff', '--name-only', f'{before}..HEAD')
            res['received'] = len([x for x in n.splitlines() if x.strip()])
        # index des dossiers reçus suivis : retirés du suivi avant l'envoi
        res['untracked'] += untrack_indexes(data, who, env)
        # 4. envoi
        git(data, 'push', *([] if up else ['-u']), remote, f'HEAD:{br}', env=env, check=True)
        res['pushed'] = True
        res['ok'] = True
        res['message'] = 'Synchronisé.' + refused_note(res)
    except RuntimeError as e:
        res['message'] = str(e)[-800:]
        if os.path.exists(os.path.join(data, '.git', 'MERGE_HEAD')):
            git(data, 'merge', '--abort')  # jamais de dépôt laissé à moitié fusionné
    finally:
        remember(data, res)
    return res


# ---- essai sur des copies (aucun accès au vrai dépôt)
def _essai():  # pragma: no cover
    tmp = tempfile.mkdtemp(prefix='defa-sync-')
    remote, a, b = (os.path.join(tmp, x) for x in ('distant.git', 'A', 'B'))
    sh = lambda *args, cwd=tmp: subprocess.run(['git', *args], cwd=cwd, check=True, capture_output=True)
    sh('init', '--bare', '-b', 'main', remote)
    sh('clone', remote, a)
    for x in ('user.name', 'user.email'):
        sh('config', x, 'essai', cwd=a)

    def put(root, rel, obj):
        p = os.path.join(root, *rel.split('/'))
        os.makedirs(os.path.dirname(p), exist_ok=True)
        json.dump(obj, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    get = lambda root, rel: json.load(open(os.path.join(root, *rel.split('/')), encoding='utf-8'))
    week = 'disponibilites/AAA/2026-W41.json'
    aff = 'missions/affectations.json'
    log = 'missions/affectations_log.json'
    reg = 'utilisateurs/_registre.json'
    put(a, reg, {'sog': 'signe/1', 'contenu': {'type': 'registre', 'version': 1}, 'signatures': []})
    put(a, week, {'updated_at': '2026-10-05T10:00:00Z', 'dispos': {'lun': 1}})
    put(a, aff, {'updatedAt': 'x', 'assignments': [{'mission': 'M1', 'pilot': 'AAA', 'role': 'mission', 'updated_at': '1'}]})
    put(a, log, {'updatedAt': 'x', 'entries': [{'at': '1', 'mission': 'M1'}]})
    put(a, 'disponibilites/_index.json', {'pilots': {}})
    r = run(a, 'AAA')
    assert r['ok'] and r['committed'] == 4, r  # _index.json exclu
    sh('clone', remote, b)
    # modifications croisées : même semaine des deux côtés (B plus récent), affectations différentes, journal
    put(a, week, {'updated_at': '2026-10-05T11:00:00Z', 'dispos': {'lun': 'A'}})
    put(b, week, {'updated_at': '2026-10-05T12:00:00Z', 'dispos': {'lun': 'B'}})
    da, db = get(a, aff), get(b, aff)
    da['assignments'].append({'mission': 'M2', 'pilot': 'AAA', 'role': 'mission', 'updated_at': '2'})
    db['assignments'].append({'mission': 'M3', 'pilot': 'BBB', 'role': 'mission', 'updated_at': '2'})
    put(a, aff, da)
    put(b, aff, db)
    la, lb = get(a, log), get(b, log)
    la['entries'].append({'at': '2', 'mission': 'M2'})
    lb['entries'].append({'at': '3', 'mission': 'M3'})
    put(a, log, la)
    put(b, log, lb)
    # registre : version 3 en A (plus haute, mais plus ancienne en date que B), version 2 en B
    put(a, reg, {'sog': 'signe/1', 'contenu': {'type': 'registre', 'version': 3, 'updated_at': '1'}, 'signatures': []})
    put(b, reg, {'sog': 'signe/1', 'contenu': {'type': 'registre', 'version': 2, 'updated_at': '9'}, 'signatures': []})
    rb = run(b, 'BBB')
    assert rb['ok'], rb
    r = run(a, 'AAA')
    assert r['ok'], r
    assert get(a, week)['dispos'] == {'lun': 'B'}, 'la plus récente gagne'
    assert any(c.get('copy') for c in r['conflicts']), 'copie gardée'
    assert sorted(x['mission'] for x in get(a, aff)['assignments']) == ['M1', 'M2', 'M3'], 'affectations réunies'
    assert [e['mission'] for e in get(a, log)['entries']] == ['M1', 'M2', 'M3'], 'journal réuni'
    assert get(a, reg)['contenu']['version'] == 3, 'registre : la version la plus haute gagne'
    assert any(str(c.get('copy') or '').startswith('utilisateurs/_conflits/') for c in r['conflicts']), 'registre perdant gardé'
    assert run(b, 'BBB')['ok'] and get(b, aff) == get(a, aff), 'B reçoit la fusion'
    assert get(b, reg)['contenu']['version'] == 3, 'B reçoit le registre le plus haut'
    _, author = git(a, 'log', '-1', '--format=%an', '--', week)
    # index suivi dans le dépôt (version précédente de l'appli) : ne bloque pas la fusion d'un poste qui a sa copie
    # régénérée, puis est retiré du suivi partout
    idx = 'disponibilites/_index.json'
    put(b, idx, {'pilots': {'BBB': {}}})
    sh('add', '-f', idx, cwd=b)
    sh('commit', '-m', 'index suivi', cwd=b)
    sh('push', 'origin', 'HEAD', cwd=b)
    put(a, idx, {'pilots': {'AAA': {}}})  # copie régénérée, non suivie
    ra = run(a, 'AAA')
    assert ra['ok'] and ra['untracked'] == [idx], ra
    assert not git(a, 'ls-files', '--', idx)[1].strip(), 'index plus suivi chez A'
    # C suivait l'index et l'a refait (lanceur) pendant qu'A le retirait : la fusion passe, plus suivi
    c = os.path.join(tmp, 'C')
    put(b, idx, {'pilots': {'BBB': {}, 'CCC': {}}})  # B suit encore l'index et l'a refait localement
    rb = run(b, 'BBB')
    assert rb['ok'] and rb['untracked'] == [idx] and not git(b, 'ls-files', '--', idx)[1].strip(), rb
    sh('clone', remote, c)
    assert not os.path.exists(os.path.join(c, *idx.split('/'))), 'index absent du dépôt'
    print('essai réussi :', tmp, '— conflits :', r['conflicts'])
    shutil.rmtree(tmp, ignore_errors=True)


if __name__ == '__main__':
    if '--essai' in sys.argv:
        _essai()
    else:
        print(__doc__)
