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
# les fichiers du SIA eux-mêmes (sia/*.xml) restent hors du dépôt ; airline : réglages de la compagnie partagés avec
# l'appli V3 (airline/map_profiles.json écrit par le studio des cartes ; settings.json, fleet.json écrits par l'appli)
POOL = ['disponibilites', 'utilisateurs', 'config', 'missions', 'cr', 'atc', 'odv', 'sia/base', 'airline']
EXCLUDE = [':(exclude,glob)**/_index.json', ':(exclude,glob)**/_conflits/**', ':(exclude).defa_instance']
# index des dossiers : régénérés par le lanceur (et par l'appli en mode GitHub, depuis l'arbre), jamais suivis par git ;
# une copie suivie dans le dépôt (écrite par une version précédente de l'appli) est retirée du suivi, jamais fusionnée
INDEXES = [':(glob)**/_index.json']
# chemins du pool que seul un geste de l'utilisateur commite (« Synchroniser » : run(gesture=True)) ; un passage de fond
# (mise à jour au démarrage du lanceur, échange périodique du cadre) les laisse sur le poste : une zone de la base à
# moitié écrite par une reconstruction ne part jamais d'elle-même (le travail de construction, D5, commite la sienne)
GESTURE_ONLY = ['sia/base/']
BUILD_GAP = 600  # s : une écriture de sia/base plus récente dit qu'une construction est en cours (building)
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
# git@hôte:chemin, ssh://[utilisateur@]hôte[:port]/chemin, http(s)://hôte[:port]/chemin : jamais de mot de passe ni de
# jeton dans l'adresse (il finirait en clair dans data/.git/config) — en https, aucune partie identifiant du tout : le
# jeton seul en nom d'utilisateur (https://ghp_…@github.com/…) est la forme courante ; en ssh, l'utilisateur (git@) est
# normal ; jamais de « - » en tête
REMOTE_RE = re.compile(r'^(?:\w[\w.-]*@\w[\w.-]*:[\w./~-]+'
                       r'|ssh://(?:\w[\w.-]*@)?\w[\w.-]*(?::\d+)?/[\w./~-]+'
                       r'|https?://\w[\w.-]*(?::\d+)?(?:/[^\s@]*)?)$')
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
    # adresse rendue à la page : sans partie identifiant (un dépôt réglé à la main peut porter un jeton dans .git/config)
    url = clean_text(git(data, 'remote', 'get-url', remote)[1], data) if remote else ''
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
            msg = clean_text(out)[-300:] or 'Échec de git ls-remote.'
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


def clean_text(text, data=''):
    """Texte de git rendu à la page ou journalisé : jamais d'identifiant dans une adresse (« https://compte:jeton@hôte » →
    « https://hôte »), jamais le chemin de ce poste (dossier des données → « data », dossier de la suite → « suite »)."""
    s = re.sub(r'://[^/@\s]+@', '://', str(text or ''))
    for base, name in ((data, 'data'), (ROOT, 'suite')):  # data/ d'abord : il est souvent sous la suite
        if base:
            # chemin donné et chemin réel (data/ atteint par une jonction dans les espaces de travail), « \\ » et « / »
            full = {os.path.abspath(base), os.path.realpath(base)}
            for b in sorted(full | {f.replace('\\', '/') for f in full}, key=len, reverse=True):
                s = re.sub(re.escape(b), name, s, flags=re.I)
    return s


def lit(env=None):
    """Environnement de git où chaque chemin est un nom de fichier, jamais un motif (« [ab].json » n'emporte pas a.json ni
    b.json) : pour toute commande qui reçoit des chemins de fichiers ; jamais pour POOL, EXCLUDE ou INDEXES (des motifs)."""
    return dict(env or git_env(), GIT_LITERAL_PATHSPECS='1')


def git(data, *args, env=None, check=False):
    """git -C data … ; rend (code, texte) : git réussi, sa sortie standard seule — ses avertissements (sortie d'erreur :
    « LF will be replaced by CRLF », …) vont au journal, jamais lus comme un chemin ou une valeur ; git en échec, sortie et
    erreurs (le message rendu à la page)."""
    try:
        r = subprocess.run(git_cmd('-C', data, *args), capture_output=True, text=True, encoding='utf-8', errors='replace',
                           env=env or git_env(), timeout=TIMEOUT)
    except (OSError, subprocess.SubprocessError) as e:
        if check:
            raise RuntimeError(str(e))
        return 1, str(e)
    if r.returncode == 0:
        _journal(args, r.stderr, data)
        return 0, r.stdout.strip()
    out = clean_text((r.stdout + r.stderr).strip(), data)
    if check:
        raise RuntimeError(out or f'git {" ".join(args)} : échec')
    return r.returncode, out


def _journal(args, err, data=''):
    """Avertissements d'une commande git réussie (lignes « warning: ») : au journal du lanceur (sa console), pas dans ce
    que lit le code ; le reste de sa sortie d'erreur (avancement d'un push, …) est laissé."""
    lines = [x for x in err.splitlines() if x.startswith('warning:')]
    if lines and sys.stderr:
        try:
            sys.stderr.write(''.join(f'git {args[0] if args else ""} : {clean_text(x, data)[:300]}\n' for x in lines[:20]))
        except (OSError, ValueError):
            pass


def unmerged(data):
    """Fichiers en conflit, lus dans l'index (git ls-files -u -z) : des chemins de l'index, jamais une ligne d'un message
    de git ; sans guillemets ni échappement (-z)."""
    try:
        out = subprocess.run(git_cmd('-C', data, 'ls-files', '-u', '-z'), capture_output=True, env=git_env(), timeout=TIMEOUT)
    except (OSError, subprocess.SubprocessError):
        return []
    if out.returncode:
        return []
    return sorted({e.split('\t', 1)[1] for e in out.stdout.decode('utf-8', errors='replace').split('\0') if '\t' in e})


def merge_pending(data):
    """Une fusion attend dans data/ (MERGE_HEAD) : le message qui le dit ; '' sinon. Un commit du lanceur fait pendant
    une fusion en attente la conclurait avec tout l'index, ou git le refuse : chaque commit le vérifie d'abord, avant
    d'écrire quoi que ce soit dans data/."""
    if os.path.exists(os.path.join(data, '.git', 'MERGE_HEAD')):
        return ('Une fusion attend dans data/ (passage de synchronisation interrompu) : rien n’est écrit ni commité ; '
                '« Synchroniser » l’annule et refait la fusion.')
    return ''


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
    if st.get('rewritten'):
        bump('alert', {'code': 'rewritten'})
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
          'ahead': ahead, 'behind': behind, 'merging': merging, 'fetched': fetched, 'last': last_sync(data),
          'rewritten': bool(up) and rewritten(data, up)}
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


def merge_raw(path, raw):
    """Versions d'un fichier du pool fusionnées par les règles de la synchronisation ; raw : {1: base, 2: la nôtre,
    3: la leur} (octets, None si absente ; base absente : reprise d'un poste, tools/data_sync.adopt). Rend (contenu
    retenu, compte rendu { how, conflicts? }, version perdante ou None, côté de la perdante)."""
    base, ours, theirs = (parse(raw[s], path) for s in (1, 2, 3))
    text = lambda doc: (json.dumps(doc, ensure_ascii=False, indent=1) + '\n').encode('utf-8')
    if path.endswith('missions/affectations.json') and isinstance(ours, dict) and isinstance(theirs, dict):
        key = lambda a: f"{a.get('mission')}|{a.get('pilot')}|{a.get('role') or ''}"
        merged, conflicts = merge_records((base or {}).get('assignments'), ours.get('assignments'), theirs.get('assignments'), key)
        doc = {**theirs, **ours, 'assignments': merged,
               'updatedAt': max(str(ours.get('updatedAt') or ''), str(theirs.get('updatedAt') or ''))}
        return text(doc), {'how': 'fiches', 'conflicts': conflicts}, None, ''
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
        return text(doc), {'how': 'journal'}, None, ''
    # registre signé des utilisateurs (comptes signés, docs/technique/COMPTES_SIGNES.md § 5) : la version la plus haute
    # est gardée, l'autre va dans _conflits/ ; Python ne vérifie rien (les navigateurs vérifient signatures et chaîne)
    if path.endswith('utilisateurs/_registre.json') and isinstance(ours, dict) and isinstance(theirs, dict):
        version = lambda d: (d.get('contenu') or {}).get('version') if isinstance(d.get('contenu'), dict) else None
        vo, vt = version(ours), version(theirs)
        vo, vt = (v if isinstance(v, int) else -1 for v in (vo, vt))
        win, lose, side = (raw[2], raw[3], 'distante') if vo >= vt else (raw[3], raw[2], 'locale')
        return win, {'how': 'registre (version la plus haute)'}, lose, side
    # une fiche par fichier : supprimée d'un côté, modifiée de l'autre → gardée ; sinon la plus récente
    if raw[2] is None or raw[3] is None:
        return raw[2] if raw[2] is not None else raw[3], {'how': 'gardée (supprimée d’un côté seulement)'}, None, ''
    mine_wins = stamp(raw[2], path) >= stamp(raw[3], path)
    win, lose, side = (raw[2], raw[3], 'distante') if mine_wins else (raw[3], raw[2], 'locale')
    return win, {'how': 'la plus récente'}, lose, side


def resolve(data, path):
    """Fichier en conflit résolu et ajouté ; rend {'path', 'how', 'copy'?}. path : un fichier en conflit de l'index
    (unmerged), jamais un chemin hors de data/."""
    full = data_path(data, path)
    if not full:
        raise RuntimeError(f'chemin en conflit refusé : {path[:200]}')
    if is_index(path):  # index régénéré : retiré du suivi, jamais fusionné (le lanceur le refait)
        git(data, 'rm', '--cached', '-q', '--ignore-unmatch', '--', path, env=lit())
        if os.path.isfile(full):
            os.remove(full)
        return {'path': path, 'how': 'index retiré (régénéré)'}
    out, info, lose, side = merge_raw(path, {s: blob(data, s, path) for s in (1, 2, 3)})
    open(full, 'wb').write(out)
    copy = keep_copy(data, path, lose, side) if lose is not None else ''
    git(data, 'add', '--', path, env=lit())
    return {'path': path, **info, **({'copy': copy} if copy else {})}


WIN_RESERVED = re.compile(r'(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³]|conin\$|conout\$)(\..*)?', re.I)


def data_path(data, rel):
    """Chemin relatif à data/ (séparateur « / ») → son chemin complet, ou '' (refusé) : la règle de data_file du lanceur —
    ni « \\ », ni « : » (lecteur, flux NTFS), ni caractère de contrôle, ni chemin absolu, ni composant vide, « . » ou
    « .. », ni composant finissant par un point ou une espace, ni nom de périphérique de Windows ; le chemin réel reste
    sous data/."""
    if not isinstance(rel, str) or not rel or len(rel) > 400 or rel.startswith('/') or any(c in rel for c in '\\:') or any(
            ord(c) < 32 for c in rel):
        return ''
    parts = rel.split('/')
    if any(x in ('', '.', '..') or x != x.rstrip('. ') or WIN_RESERVED.fullmatch(x) for x in parts):
        return ''
    full = os.path.join(data, *parts)
    base = os.path.normcase(os.path.realpath(data))
    return full if os.path.normcase(os.path.realpath(full)).startswith(base + os.sep) else ''


def is_index(path):
    """Vrai pour un index de dossier régénéré (…/_index.json)."""
    return path == '_index.json' or path.endswith('/_index.json')


def untrack_indexes(data, who, env):
    """Index de dossier suivis par git : retirés du suivi (le fichier reste, le lanceur le refait) et commit. Rend la liste."""
    _, out = git(data, 'ls-files', '--', *INDEXES)
    tracked = [x for x in out.splitlines() if x.strip()]
    if tracked:
        git(data, 'rm', '--cached', '-q', '--', *tracked, env=lit(), check=True)
        git(data, *who, 'commit', '-m', 'Index des dossiers retirés du dépôt (régénérés)', env=env, check=True)
    return tracked


def refused_note(res):
    """Fichiers .js refusés à l'envoi (format des données, tools/data_guard.py), et fichiers gardés sur le poste faute de
    geste (GESTURE_ONLY), pour le compte rendu."""
    r = res.get('refused') or []
    note = f" {len(r)} fichier(s) .js refusé(s), pas au format des données : {', '.join(x['path'] for x in r)}." if r else ''
    if res.get('held'):
        note += f" {res['held']} fichier(s) de sia/base gardés sur ce poste : « Synchroniser » les envoie."
    return note


def _at(data, rev, path, env=None):
    """Les octets du fichier path à la révision rev (« HEAD », une référence) ; None s'il n'y est pas. Les deux reprises de
    data/ (adopt, rewritten_resume) le lisent ainsi (R-C5)."""
    if git(data, 'cat-file', '-e', f'{rev}:{path}')[0]:
        return None
    r = subprocess.run(git_cmd('-C', data, 'cat-file', 'blob', f'{rev}:{path}'), capture_output=True, env=env or git_env(), timeout=TIMEOUT)
    return r.stdout if r.returncode == 0 else None


def _identity(author, name=''):
    """Options et environnement git d'un commit au nom du trigramme."""
    who = ['-c', f'user.name={author}', '-c', f'user.email={author.lower()}@defa.local']
    env = dict(git_env(), GIT_AUTHOR_NAME=f'{author}{" " + name if name else ""}', GIT_AUTHOR_EMAIL=f'{author.lower()}@defa.local')
    return who, env


def _busy(data):
    """Vrai si un rebase est en cours dans data/ (la fusion en attente, elle, est réglée par settle)."""
    return any(os.path.isdir(os.path.join(data, '.git', d)) for d in ('rebase-merge', 'rebase-apply'))


def _own_staged(data):
    """Fichiers indexés pendant une fusion en attente qui ne viennent pas d'elle (un « git add » du poste après
    l'interruption) : ni apportés par l'autre branche, ni identiques à sa version ; un fichier changé des deux côtés est
    tenu pour le résultat de la fusion ; les fichiers en conflit n'en sont jamais."""
    staged = set(_files(data, 'diff', '--cached', '--name-only', '-z', 'HEAD')) - set(unmerged(data))
    code, base = git(data, 'merge-base', 'HEAD', 'MERGE_HEAD')
    if not staged or code:
        return sorted(staged)

    def blobs(args, col):
        out = {}
        for e in _files(data, *args):
            meta, _, p = e.partition('\t')
            if p and len(meta.split()) > col:
                out[p] = meta.split()[col]
        return out
    merged = set(_files(data, 'diff', '--name-only', '-z', base, 'MERGE_HEAD'))
    ours = set(_files(data, 'diff', '--name-only', '-z', base, 'HEAD'))
    index, theirs = blobs(('ls-files', '-s', '-z'), 1), blobs(('ls-tree', '-r', '-z', 'MERGE_HEAD'), 2)
    return sorted(p for p in staged if p not in merged or (p not in ours and index.get(p) != theirs.get(p)))


def settle(data):
    """Fusion laissée en attente dans data/ (MERGE_HEAD : passage interrompu, poste éteint en pleine fusion), jamais
    laissée à l'utilisateur ni conclue : un commit de fusion emporterait tout l'index (des fichiers indexés avant
    l'interruption, hors du pool, sans le contrôle des .js) ; annulée (merge --abort : les modifications du poste, indexées
    ou non, restent dans le dossier), le passage refait la fusion proprement. Rend 'annulée' ou '' (rien en attente) ;
    RuntimeError si git refuse de l'annuler."""
    if not os.path.exists(os.path.join(data, '.git', 'MERGE_HEAD')):
        return ''
    # fichiers indexés par ce poste depuis l'interruption : retirés de l'index d'abord (le dossier n'y perd rien), sinon
    # merge --abort (git reset --merge) les ramènerait à la branche — un fichier nouveau serait effacé
    own = _own_staged(data)
    if own:
        git(data, 'reset', '-q', '--', *own, env=lit(), check=True)
    code, out = git(data, 'merge', '--abort')
    if code:
        # git refuse : un fichier apporté par la fusion a été modifié depuis dans le dossier ; la page dit lequel mettre de côté
        touched = sorted(set(_files(data, 'diff', '--name-only', '-z')) & set(_files(data, 'diff', '--cached', '--name-only', '-z', 'HEAD')))
        if touched:
            raise RuntimeError('Fusion en attente dans data/ impossible à annuler : fichier(s) modifiés depuis la fusion — '
                               + ', '.join(touched[:20]) + ' ; à copier ailleurs (puis à retirer de data/), puis relancer.')
        raise RuntimeError('Fusion en attente dans data/ impossible à annuler : ' + out[-300:])
    return 'annulée'


def _abort(data):
    """Passage en échec : la fusion commencée est annulée (jamais de dépôt laissé à moitié fusionné) ; rend '' ou ce qui
    reste à dire."""
    if not os.path.exists(os.path.join(data, '.git', 'MERGE_HEAD')):
        return ''
    code, out = git(data, 'merge', '--abort')
    return '' if code == 0 else f' Fusion impossible à annuler : {out[-200:]}'


def _why(e, data=''):
    """Texte d'une erreur pour la page : le message de git, sinon le type d'erreur et son texte (erreur du lanceur) ;
    nettoyé (clean_text : ni identifiant d'adresse, ni chemin du poste)."""
    return clean_text(str(e) if isinstance(e, RuntimeError) else f'Erreur du lanceur pendant la synchronisation ({type(e).__name__} : {e}).',
                      data)


def _settled_note(how):
    return ' Fusion laissée en attente par un passage précédent : annulée, puis refaite.' if how == 'annulée' else ''


def building(data, gap=BUILD_GAP):
    """Vrai si un fichier de sia/base modifié sur ce poste, pas encore commité, l'a été il y a moins de gap secondes : une
    construction de la base écrit là (page V2 par son dossier autorisé, travail du lanceur), zone par zone ; vue par
    l'heure des fichiers, quel que soit l'écrivain."""
    now = time.time()
    for p in pool_changes(data, [g.rstrip('/') for g in GESTURE_ONLY]):
        try:
            if now - os.path.getmtime(os.path.join(data, *p.split('/'))) < gap:
                return True
        except OSError:
            continue
    return False


def _commit_local(data, who, env, res, label, gesture=False):
    """Fichiers du pool modifiés sur ce poste : un commit « <label> : n fichier(s) » (res['committed']) ; .js hors du format
    des fichiers de données jamais commités (res['refused']) ; sans geste de l'utilisateur, les chemins GESTURE_ONLY
    restent sur le poste (res['held'] : leur nombre)."""
    changes = pool_changes(data)
    if not gesture:
        held = [c for c in changes if any(c.startswith(g) for g in GESTURE_ONLY)]
        changes = [c for c in changes if c not in held]
        res['held'] = len(held)
    # .js hors du format des fichiers de données (tools/data_guard.py) : jamais commités, jamais envoyés — un script
    # glissé dans data/ (page piégée, dossier autorisé) ne se propage pas aux autres postes
    for p in [c for c in changes if c.lower().endswith('.js') and os.path.isfile(os.path.join(data, *c.split('/')))]:
        ok, why = data_guard.check_file(os.path.join(data, *p.split('/')))
        if not ok:
            changes.remove(p)
            res['refused'].append({'path': p, 'why': why})
    if changes:
        git(data, 'add', '-A', '--', *changes, env=lit(env), check=True)  # fichiers modifiés seuls (dossier du pool absent : pas d'erreur)
        code, _ = git(data, 'diff', '--cached', '--quiet')
        if code:
            git(data, *who, 'commit', '-m', f'{label} : {len(changes)} fichier(s)', env=env, check=True)
            res['committed'] = len(changes)


# historique du dépôt réécrit (sources purgées puis poussé en forcé, 30 oct. 2026) : aucun ancêtre commun avec la branche
# distante ; jamais fusionné, repris par un geste (rewritten_resume)
REWRITTEN_MSG = ('L’historique du dépôt des données a été réécrit : rien n’est fusionné, les écritures de ce poste restent '
                 'dans data/. Réglages › Administration › Dépôt distant : « Reprendre le nouvel historique ».')


def _target(data):
    """(branche distante suivie ou <distant>/<branche>, distant) ; ('', '') sans dépôt distant."""
    br, up, remote = branch_info(data)
    return (up or (f'{remote}/{br}' if remote and br else '')), remote


def rewritten(data, target=''):
    """Vrai si la branche distante déjà récupérée n'a aucun ancêtre commun avec HEAD : son historique a été réécrit."""
    target = target or _target(data)[0]
    if not target or git(data, 'rev-parse', '--verify', '--quiet', target)[0] or git(data, 'rev-parse', '--verify', '--quiet', 'HEAD')[0]:
        return False
    return git(data, 'merge-base', 'HEAD', target)[0] == 1  # 1 : aucun ancêtre commun (sans erreur)


def _tree_match(data, target):
    """Le dernier commit de HEAD dont l'arbre est aussi celui d'un commit du nouvel historique : (ancien, nouveau) ; None
    sinon. La réécriture garde les arbres (mêmes fichiers) : cet état commun sert de base à la reprise."""
    _, theirs = git(data, 'log', '--format=%H %T', target)
    trees = {}
    for line in theirs.splitlines():
        h, _, t = line.partition(' ')
        trees.setdefault(t, h)  # le plus récent d'abord
    _, ours = git(data, 'log', '--format=%H %T', 'HEAD')
    for line in ours.splitlines():
        h, _, t = line.partition(' ')
        if t in trees:
            return h, trees[t]
    return None


def _changed_names(data, a, b):
    """Chemins changés entre deux commits, tels quels (-z : ni guillemets ni octets échappés pour un nom accentué)."""
    _, out = git(data, 'diff', '-z', '--name-only', a, b)
    return [x for x in out.split('\0') if x.strip()]


def rewritten_plan(data, fetch=True, env=None):
    """Ce que ferait la reprise du nouvel historique, sans rien changer : { ok, rewritten, commits (de ce poste depuis
    l'état commun), files (du pool, reportés), kept (hors du pool : jamais repoussés, gardés dans la référence de
    sauvegarde puis recopiés dans data/ tels que sur ce poste), pending (fichiers du pool pas encore commités, commités
    d'abord), message }."""
    res = {'ok': False, 'rewritten': False, 'commits': 0, 'files': [], 'kept': [], 'pending': 0}
    if not is_repo(data):
        return {**res, 'message': 'data/ n’est pas un dépôt git (ou git est absent).'}
    if _busy(data) or os.path.exists(os.path.join(data, '.git', 'MERGE_HEAD')):
        return {**res, 'message': 'Une fusion ou un rebase est en cours dans data/ : synchroniser d’abord.'}
    target, remote = _target(data)
    if not target:
        return {**res, 'message': 'Pas de dépôt distant : rien à reprendre.'}
    if fetch:
        code, out = git(data, 'fetch', '--quiet', remote, env=env)
        if code:
            return {**res, 'message': f'Dépôt distant injoignable : {out[-300:]}'}
    if not rewritten(data, target):
        return {**res, 'ok': True, 'message': 'L’historique du dépôt n’a pas été réécrit : rien à reprendre.'}
    m = _tree_match(data, target)
    if not m:
        return {**res, 'rewritten': True, 'message': 'Aucun état commun entre ce poste et le nouvel historique : reprise impossible '
                'ici (les fichiers de data/ sont intacts).'}
    old, _new = m
    files = _changed_names(data, old, 'HEAD')
    _, n = git(data, 'rev-list', '--count', '--no-merges', f'{old}..HEAD')
    return {**res, 'ok': True, 'rewritten': True, 'commits': int(n or 0), 'files': [x for x in files if in_pool(x)],
            'kept': [x for x in files if not in_pool(x)], 'pending': len(pool_changes(data)), 'message': ''}


def rewritten_resume(data, author, name=''):
    """Geste « Reprendre le nouvel historique » : les fichiers du pool de ce poste commités d'abord ; l'ancienne branche
    gardée dans refs/sog/avant-reecriture-<date> (rien n'est supprimé) ; la branche posée sur l'état commun du nouvel
    historique (reset --keep : fichiers du poste hors du pool intacts) ; les fichiers du pool que ce poste avait changés
    depuis cet état y sont reportés en un commit ; un fichier hors du pool n'est jamais repoussé : celui que ce poste avait
    commité depuis l'état commun est recopié dans data/ tel quel, hors suivi ou modifié, jamais commité (le pilote ne tape
    pas de git). Chaque chemin est un nom de fichier, jamais un motif (GIT_LITERAL_PATHSPECS). La synchronisation suivante
    reçoit le reste du nouvel historique (fusion fiche par fiche) et envoie. Rend le plan, plus { ref, moved, copied }."""
    if not re.fullmatch(r'[A-Z0-9]{2,5}', author or ''):
        return {'ok': False, 'message': 'Trigramme de l’auteur manquant ou invalide.'}
    who, env = _identity(author, name)
    plan = rewritten_plan(data, env=env)
    if not plan.get('ok') or not plan.get('rewritten'):
        return plan
    res = {**plan, 'committed': 0, 'refused': [], 'ref': '', 'moved': 0, 'copied': 0}
    _commit_local(data, who, env, res, f'Synchronisation {author}')
    lenv = lit(env)  # « [ab].json » est un nom, jamais un motif
    target = _target(data)[0]
    old, new = _tree_match(data, target)
    ref = f'refs/sog/avant-reecriture-{time.strftime("%Y%m%d-%H%M%S")}'
    git(data, 'update-ref', ref, 'HEAD', check=True)
    res['ref'] = ref
    names = _changed_names(data, old, ref)
    pool = [x for x in names if in_pool(x)]
    res['kept'] = [x for x in names if not in_pool(x)]
    code, out = git(data, 'reset', '--keep', new)
    if code:
        return {**res, 'ok': False, 'message': 'Reprise refusée : des fichiers de ce poste seraient écrasés '
                f'({out[-200:]}). Rien n’a changé ; ancien état gardé dans {ref}.'}
    try:
        for p in pool:
            if git(data, 'cat-file', '-e', f'{ref}:{p}')[0] == 0:
                git(data, 'checkout', ref, '--', p, env=lenv, check=True)
            else:
                git(data, 'rm', '-q', '--ignore-unmatch', '--', p, env=lenv, check=True)
        if git(data, 'diff', '--cached', '--quiet')[0]:
            git(data, *who, 'commit', '-m', f'Reprise après réécriture de l’historique ({author}) : {len(pool)} fichier(s)', env=env, check=True)
            res['moved'] = len(pool)
        # fichiers hors du pool commités par ce poste depuis l'état commun : recopiés tels quels (octets), jamais commités
        for p in res['kept']:
            full = data_path(data, p)
            raw = _at(data, ref, p, env) if full else None
            if raw is not None:
                os.makedirs(os.path.dirname(full), exist_ok=True)
                with open(full, 'wb') as f:
                    f.write(raw)
                res['copied'] += 1
    except RuntimeError as e:
        git(data, 'reset', '--keep', ref)  # remis comme avant le geste
        return {**res, 'ok': False, 'message': f'Reprise interrompue ({_why(e, data)[-200:]}) : data/ remis comme avant.'}
    res.update(ok=True, rewritten=False, message=f'Nouvel historique repris : {res["moved"]} fichier(s) de ce poste reportés ; ancien '
               f'état gardé dans {ref}.' + (f' {res["copied"]} fichier(s) hors des données synchronisées recopiés dans data/ tels '
                                            'quels, jamais envoyés.' if res['copied'] else ''))
    return res


def _receive(data, who, env, res, remote, up, br):
    """Branche distante récupérée et fusionnée, conflits du pool résolus fiche par fiche (res['received'], res['conflicts']).
    Fusion refusée parce qu'elle écraserait des fichiers du poste hors du pool : res['blocked'] (chemins), rien de changé."""
    git(data, 'fetch', remote, env=env, check=True)
    target = up or f'{remote}/{br}'
    code, _ = git(data, 'rev-parse', '--verify', '--quiet', target)
    if code:
        return
    if rewritten(data, target):  # aucun ancêtre commun : jamais fusionné (git refuserait, et sans base la fusion écraserait)
        res['code'] = 'rewritten'
        raise RuntimeError(REWRITTEN_MSG)
    _, before = git(data, 'rev-parse', 'HEAD')
    # fichiers du poste, modifiés ou non suivis (hors du pool : jamais commités), que la fusion écraserait : rien n'est
    # fusionné, le compte rendu les nomme (calculé, pas lu dans le message de git, qui dépend de sa langue)
    _, upstream = git(data, 'diff', '--name-only', f'HEAD...{target}')
    blocked = sorted({x for x in upstream.splitlines() if x.strip()} & set(pool_changes(data, ['.', *EXCLUDE])))
    if blocked:
        res['blocked'] = blocked
        return
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
        # fichiers en conflit lus dans l'index (jamais dans la sortie de git, où se glissent ses avertissements)
        paths = unmerged(data)
        if not paths:
            raise RuntimeError(out)
        # conflits : fusion fiche par fiche
        for path in paths:
            r = resolve(data, path)
            if r.get('copy') or r.get('conflicts'):
                res['conflicts'].append(r)
        git(data, *who, 'commit', '--no-edit', env=env, check=True)
    _, n = git(data, 'diff', '--name-only', f'{before}..HEAD')
    res['received'] = len([x for x in n.splitlines() if x.strip()])


# motifs ignorés par chaque poste (.git/info/exclude, jamais commité) : un dépôt des données d'avant le modèle
# tools/data_template/.gitignore ne les ignore pas encore
LOCAL_EXCLUDE = ['**/_index.json', '**/_conflits/', '.defa_instance']


def ensure_excludes(data):
    """Index régénérés, copies de conflits et repère du lanceur ignorés par git sur ce poste (.git/info/exclude) ; rend
    les motifs ajoutés."""
    path = os.path.join(data, '.git', 'info', 'exclude')
    try:
        have = open(path, encoding='utf-8').read().splitlines() if os.path.isfile(path) else []
        add = [x for x in LOCAL_EXCLUDE if x not in have]
        if add:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, 'a', encoding='utf-8', newline='\n') as f:
                f.write(('\n' if have and have[-1].strip() else '') + '# index régénérés, conflits, repère du lanceur (tools/data_sync.py)\n' + '\n'.join(add) + '\n')
        return add
    except OSError:
        return []


def run(data, author, name='', gesture=False):
    """Un passage de synchronisation ; rend le compte rendu (ok, committed, received, pushed, conflicts, message). gesture :
    l'utilisateur l'a demandé (bouton « Synchroniser ») — seul ce passage commite aussi les chemins GESTURE_ONLY."""
    res = {'ok': False, 'at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'author': author, 'committed': 0,
           'received': 0, 'pushed': False, 'conflicts': [], 'refused': []}
    if not is_repo(data):
        res['message'] = 'data/ n’est pas un dépôt git (ou git est absent).'
        return res
    if not re.fullmatch(r'[A-Z0-9]{2,5}', author or ''):
        res['message'] = 'Trigramme de l’auteur manquant ou invalide.'
        return res
    if _busy(data):
        res['message'] = 'Un rebase est en cours dans data/ : à terminer ou annuler à la main.'
        return res
    who, env = _identity(author, name)
    try:
        # 0. fusion laissée en attente par un passage interrompu : conclue ou annulée
        res['settled'] = settle(data)
        # 1. modifications de ce poste
        _commit_local(data, who, env, res, f'Synchronisation {author}', gesture)
        # index suivis sur ce poste (reçus d'une version précédente, puis refaits par le lanceur) : retirés du suivi
        # d'abord, sinon la fusion refuserait d'écraser la copie refaite
        res['untracked'] = untrack_indexes(data, who, env)
        br, up, remote = branch_info(data)
        if not remote:
            res.update(ok=True, message='Commit local seulement : pas de dépôt distant.' + refused_note(res))
            return res
        # 2. branche distante, 3. conflits fiche par fiche
        _receive(data, who, env, res, remote, up, br)
        if res.get('blocked'):
            raise RuntimeError('Réception refusée par git : fichiers modifiés sur ce poste, hors des données synchronisées, '
                               'que la fusion écraserait : ' + ', '.join(res['blocked']) + '.')
        # index des dossiers reçus suivis : retirés du suivi avant l'envoi
        res['untracked'] += untrack_indexes(data, who, env)
        # 4. envoi
        git(data, 'push', *([] if up else ['-u']), remote, f'HEAD:{br}', env=env, check=True)
        res['pushed'] = True
        res['ok'] = True
        res['message'] = 'Synchronisé.' + _settled_note(res['settled']) + refused_note(res)
    except Exception as e:  # toute erreur, git ou du lanceur : fusion annulée, message à la page (jamais au serveur)
        res['ok'] = res['pushed'] = False
        res['message'] = _why(e, data)[-800:] + _abort(data)
    finally:
        remember(data, res)
    return res


def update(data, author=''):
    """Mise à jour de data/ au démarrage du lanceur, sans rien envoyer et sans jamais s'arrêter sur des modifications du
    poste : fichiers du pool modifiés commités (« Modifications du poste <TRI> », mêmes règles que run ; trigramme du
    dernier passage, sinon POSTE), index retirés du suivi, branche distante fusionnée fiche par fiche (comme run, jamais de
    rebase : le réglage pull.rebase de l'utilisateur ne compte pas). Fichier hors du pool modifié : laissé tel quel ; si
    la fusion devait l'écraser, elle n'a pas lieu (res['blocked']) et le message le dit. Rend { ok, committed, received,
    conflicts, refused, untracked, blocked, excluded, message }."""
    res = {'ok': False, 'committed': 0, 'received': 0, 'conflicts': [], 'refused': [], 'untracked': [], 'blocked': [],
           'excluded': []}
    if not is_repo(data):
        return {**res, 'message': 'data/ n’est pas un dépôt git (ou git est absent) : pas de mise à jour.'}
    if _busy(data):
        return {**res, 'message': 'Un rebase est en cours dans data/ : à terminer ou annuler à la main ; données actuelles gardées.'}
    author = author if re.fullmatch(r'[A-Z0-9]{2,5}', author or '') else str((last_sync(data) or {}).get('author') or '')
    author = author if re.fullmatch(r'[A-Z0-9]{2,5}', author) else 'POSTE'
    who, env = _identity(author)
    res['excluded'] = ensure_excludes(data)
    try:
        res['settled'] = settle(data)
        _commit_local(data, who, env, res, f'Modifications du poste {author}')
        res['untracked'] = untrack_indexes(data, who, env)
        br, up, remote = branch_info(data)
        if not remote:
            return {**res, 'ok': True, 'message': f'{res["committed"]} fichier(s) du poste commités ; pas de dépôt distant : rien à recevoir.'}
        _receive(data, who, env, res, remote, up, br)
        res['untracked'] += untrack_indexes(data, who, env)
    except Exception as e:  # toute erreur, git ou du lanceur : fusion annulée, données actuelles gardées
        out = _why(e, data) + _abort(data)
        why = ('réseau ou accès au dépôt refusé' if re.search(r'Could not resolve|unable to access|timed out|Authentication|denied|'
                                                             r'could not read|403|401', out, re.I) else out[-300:])
        return {**res, 'message': f'{res["committed"]} fichier(s) du poste commités ; réception impossible pour l’instant ({why}) : '
                                  'données actuelles gardées.'}
    parts = [f'{res["committed"]} fichier(s) du poste commités'] if res['committed'] else []
    if res['blocked']:
        parts.append('réception reportée : fichiers modifiés sur ce poste, hors des données synchronisées, que la mise à jour '
                     'écraserait (' + ', '.join(res['blocked']) + ') — à garder ailleurs ou à annuler (git -C data checkout -- '
                     '<fichier>), puis relancer')
    else:
        parts.append(f'{res["received"]} fichier(s) reçus' if res['received'] else 'déjà à jour')
    if res['conflicts']:
        parts.append(f'{len(res["conflicts"])} fiche(s) modifiées des deux côtés : la plus récente gardée, l’autre dans _conflits/')
    res['ok'] = not res['blocked']
    res['message'] = ' ; '.join(parts) + '.' + _settled_note(res.get('settled')) + (' Rien n’est envoyé : « Synchroniser » le fera.' if res['committed'] else '') + refused_note(res)
    return res


def data_state(data):
    """État du dossier des données : 'absent' (pas de dossier, ou vide), 'repo' (dépôt git), 'plain' (des fichiers, pas de
    dépôt : exemples, archive, données saisies)."""
    if not os.path.isdir(data) or not os.listdir(data):
        return 'absent'
    return 'repo' if os.path.isdir(os.path.join(data, '.git')) else 'plain'


def _files(data, *args):
    """Chemins (relatifs, « / ») rendus par git ls-files / diff -z … ; [] en cas d'échec."""
    try:
        out = subprocess.run(git_cmd('-C', data, *args), capture_output=True, env=git_env(), timeout=TIMEOUT).stdout
    except (OSError, subprocess.SubprocessError):
        return []
    return [x for x in out.decode('utf-8', errors='replace').split('\0') if x]


def in_pool(path):
    """Vrai pour un fichier synchronisé (POOL), hors index régénérés, copies de conflits et repère du lanceur."""
    return (any(path == d or path.startswith(d + '/') for d in POOL) and not is_index(path) and '/_conflits/' not in
            f'/{path}' and path != '.defa_instance')


def _walk(data):
    """Chemins relatifs (« / ») des fichiers de data/, hors .git."""
    for root, dirs, files in os.walk(data):
        dirs[:] = [d for d in dirs if d != '.git']
        for f in files:
            yield os.path.relpath(os.path.join(root, f), data).replace(os.sep, '/')


def _clone_message(log):
    """Cause lisible d'un clone refusé."""
    if re.search(r'Authentication failed|could not read Username|403|401|terminal prompts disabled|Permission denied|publickey', log, re.I):
        return 'Accès refusé : identifiant, mot de passe ou jeton, clé SSH, ou accès au dépôt pas encore donné.'
    if re.search(r'not found|does not exist|Repository not found|404', log, re.I):
        return 'Dépôt introuvable à cette adresse.'
    return clean_text(log)[-400:] or 'Échec du clone.'


def _fresh(data, url, env, auth, backup, res):
    """data/ sans rien à reprendre (jeu d'essai, exemples) : mis de côté dans backup, puis clone du dépôt ; remis en place
    si le clone échoue."""
    try:
        os.rename(data, backup)
    except OSError as e:
        return {**res, 'message': f'data/ ne peut pas être mis de côté (fichier ouvert ailleurs ?) : {e}. data/ est inchangé.'}
    try:
        r = subprocess.run(git_cmd(*auth, 'clone', '--', url, data), capture_output=True, text=True, encoding='utf-8', errors='replace',
                           env=env, timeout=1800)
        ok, log = r.returncode == 0 and os.path.isdir(os.path.join(data, '.git')), (r.stdout + r.stderr).strip()
    except (OSError, subprocess.SubprocessError) as e:
        ok, log = False, str(e)
    if not ok:
        shutil.rmtree(data, ignore_errors=True)
        os.rename(backup, data)
        return {**res, 'message': _clone_message(log) + ' data/ est inchangé.'}
    res['branch'] = git(data, 'rev-parse', '--abbrev-ref', 'HEAD')[1]
    name = os.path.basename(backup)
    return {**res, 'ok': True, 'fresh': True, 'backup': name,
            'message': f'Rien à reprendre dans data/ (jeu d’essai ou exemples) : mis de côté dans {name}/, puis dépôt cloné '
                       f'(branche {res["branch"]}).'}


def adopt(data, url, author, env=None, name='', auth=()):
    """data/ existant, pas encore un dépôt (exemples, archive, données saisies), devenu un clone du dépôt url, sans rien
    envoyer : clone sans extraction à côté, son .git posé dans data/, index sur la branche distante (fichiers du poste
    intacts) ; fichier du dépôt absent du poste : extrait ; présent des deux côtés et différent : fichier du pool fusionné
    par les règles de la synchronisation (merge_raw, sans base commune : la plus récente gagne, l'autre dans _conflits/ ;
    affectations réunies fiche par fiche ; registre : la version la plus haute), autre fichier : celui du dépôt ;
    fichiers du poste absents du dépôt : gardés. Puis un commit « Reprise du poste <TRI> » des fichiers du pool (même
    contrôle des .js que run). Chaque fichier du poste remplacé est d'abord copié dans data_avant_<date>/, à côté de
    data/ ; un échec remet tout en place (data/ intact, .git retiré). env, auth (options -c de git) : identifiants le
    temps du clone, rien d'écrit dans .git/config. Rend
    { ok, message, committed, replaced, conflicts, refused, backup, branch, fresh }. Jeu d'essai, ou aucun fichier du pool
    (seulement data_tree.js des exemples) : rien à reprendre — data/ mis de côté dans data_avant_<date>/, puis simple
    clone (data/ remis en place si le clone échoue)."""
    res = {'ok': False, 'fresh': False, 'committed': 0, 'replaced': 0, 'conflicts': [], 'refused': [], 'backup': '', 'branch': ''}
    url = (url or '').strip()
    if not REMOTE_RE.match(url):
        return {**res, 'message': REMOTE_HELP}
    if not git_exe():
        return {**res, 'message': 'Git n’est pas installé sur cet ordinateur (https://git-scm.com).'}
    if not re.fullmatch(r'[A-Z0-9]{2,5}', author or ''):
        return {**res, 'message': 'Trigramme de l’auteur manquant ou invalide.'}
    state = data_state(data)
    if state != 'plain':
        return {**res, 'message': 'data/ est déjà un dépôt git : régler son dépôt distant (« Enregistrer »).' if state == 'repo' else
                'data/ est absent ou vide : récupérer les données depuis le dépôt (clone).'}
    env = env or git_env()
    parent, when = os.path.dirname(os.path.abspath(data)), time.strftime('%Y-%m-%d_%H%M%S')
    tmp, backup = os.path.join(parent, f'.data_reprise_{when}'), os.path.join(parent, f'data_avant_{when}')
    if is_trial(data) or not any(in_pool(p) for p in _walk(data)):
        return _fresh(data, url, env, auth, backup, res)
    dot = os.path.join(data, '.git')
    try:
        r = subprocess.run(git_cmd(*auth, 'clone', '--no-checkout', '--', url, tmp), capture_output=True, text=True, encoding='utf-8',
                           errors='replace', env=env, timeout=1800)
    except (OSError, subprocess.SubprocessError) as e:
        shutil.rmtree(tmp, ignore_errors=True)
        return {**res, 'message': f'Clone impossible : {e}'}
    log = (r.stdout + r.stderr).strip()
    if r.returncode or not os.path.isdir(os.path.join(tmp, '.git')):
        shutil.rmtree(tmp, ignore_errors=True)
        return {**res, 'message': _clone_message(log) + ' data/ est inchangé.'}
    saved, created = [], []  # fichiers du poste copiés avant d'être remplacés ; fichiers ajoutés depuis le dépôt

    def keep_original(p):
        src, dst = os.path.join(data, *p.split('/')), os.path.join(backup, *p.split('/'))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(src, dst)
        saved.append(p)

    who, cenv = _identity(author, name)
    try:
        os.rename(os.path.join(tmp, '.git'), dot)  # le dépôt reçu devient celui de data/
        shutil.rmtree(tmp, ignore_errors=True)
        res['branch'] = git(data, 'rev-parse', '--abbrev-ref', 'HEAD')[1]
        if git(data, 'rev-parse', '--verify', '--quiet', 'HEAD')[0] == 0:  # dépôt vide : rien à comparer
            git(data, 'reset', '-q', check=True)  # index = branche distante ; fichiers du poste intacts
            for p in _files(data, 'diff', '--name-only', '-z'):  # absents du poste ou différents
                full = os.path.join(data, *p.split('/'))
                if not os.path.isfile(full):
                    created.append(p)
                    git(data, 'checkout', '--', p, env=lit(), check=True)
                    continue
                if is_index(p):  # index suivi dans le dépôt : régénéré, retiré du suivi plus bas
                    continue
                if not in_pool(p):  # fichier de la suite (références, arbre) : celui du dépôt
                    keep_original(p)
                    git(data, 'checkout', '--', p, env=lit(), check=True)
                    res['replaced'] += 1
                    continue
                ours = open(full, 'rb').read()
                theirs = _at(data, 'HEAD', p)
                if theirs is None:
                    raise RuntimeError(f'{p} : illisible dans le dépôt reçu')
                out, info, lose, side = merge_raw(p, {1: None, 2: ours, 3: theirs})
                if info['how'] == 'la plus récente' and stamp(ours, p) == stamp(theirs, p):
                    # sans updated_at qui les départage : la plus récente par date (fichier du poste, dernier commit du
                    # dépôt) — un fichier d'exemple ne remplace pas celui de la compagnie
                    at = git(data, 'log', '-1', '--format=%ct', 'HEAD', '--', p, env=lit())[1]
                    if at.isdigit() and int(at) > os.path.getmtime(full):
                        out, lose, side = theirs, ours, 'locale'
                if out != ours:
                    keep_original(p)
                    open(full, 'wb').write(out)
                copy = keep_copy(data, p, lose, side) if lose is not None else ''
                if copy:
                    created.append(copy)
                if copy or info.get('conflicts'):
                    res['conflicts'].append({'path': p, **info, **({'copy': copy} if copy else {})})
        # fichiers du pool du poste : un commit, rien d'envoyé — le même que celui d'une synchronisation (_commit_local :
        # contrôle des .js, chemins littéraux), tous les fichiers du pool (un geste)
        _commit_local(data, who, cenv, res, f'Reprise du poste {author}', gesture=True)
        untrack_indexes(data, who, cenv)
    except (OSError, RuntimeError, subprocess.SubprocessError) as e:
        # retour en arrière : fichiers du poste remis, fichiers ajoutés retirés, .git retiré — data/ comme avant
        for p in saved:
            shutil.copy2(os.path.join(backup, *p.split('/')), os.path.join(data, *p.split('/')))
        for p in created:
            try:
                os.remove(os.path.join(data, *p.split('/')))
            except OSError:
                pass
        shutil.rmtree(dot, ignore_errors=True)
        shutil.rmtree(tmp, ignore_errors=True)
        if not saved:
            shutil.rmtree(backup, ignore_errors=True)
        return {**res, 'message': f'Reprise interrompue, data/ remis comme avant : {str(e)[-400:]}'}
    res['backup'] = os.path.basename(backup) if saved else ''
    res['ok'] = True
    res['message'] = (f'data/ est un clone du dépôt (branche {res["branch"]}) : {res["committed"]} fichier(s) du poste repris '
                      'dans un commit local, rien n’est envoyé — « Synchroniser » les partagera.'
                      + (f' {res["replaced"]} fichier(s) de la suite remplacés par ceux du dépôt.' if res['replaced'] else '')
                      + (f' {len(res["conflicts"])} fiche(s) présentes des deux côtés : la plus récente gardée, l’autre dans _conflits/.'
                         if res['conflicts'] else '')
                      + (f' Originaux remplacés copiés dans {res["backup"]}/.' if res['backup'] else '') + refused_note(res))
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
    # mise à jour au démarrage (update) : modifications du poste (pool et hors pool), index non suivi, pull.rebase réglé
    g = os.path.join(tmp, 'G')
    assert run(a, 'AAA')['ok']  # A à jour avant de pousser à la main
    mora = os.path.join('sia', 'mora.csv')
    os.makedirs(os.path.join(a, 'sia'), exist_ok=True)
    open(os.path.join(a, mora), 'w').write('cell,ft\n1,1000\n')
    sh('add', 'sia/mora.csv', cwd=a)
    sh('commit', '-m', 'mora', cwd=a)
    sh('push', 'origin', 'HEAD', cwd=a)
    sh('clone', remote, g)
    sh('config', 'pull.rebase', 'true', cwd=g)
    put(g, week, {'updated_at': '2026-10-06T09:00:00Z', 'dispos': {'lun': 'G'}})  # fiche du pool modifiée
    open(os.path.join(g, mora), 'w').write('cell,ft\n1,1200\n')  # hors du pool, modifié sur ce poste
    put(g, 'disponibilites/_index.json', {'pilots': {}})  # index régénéré, non suivi
    put(g, 'pilot/ANON/x.json', {})  # hors du pool, non suivi
    put(a, 'disponibilites/AAA/2026-W43.json', {'updated_at': '2026-10-19T08:00:00Z', 'dispos': {}})
    assert run(a, 'AAA')['ok']
    h0 = subprocess.run(['git', 'ls-remote', remote, 'HEAD'], capture_output=True, text=True).stdout.split()[0]
    ru = update(g, 'GGG')
    assert ru['ok'] and ru['committed'] == 1 and ru['received'] >= 1 and not ru['blocked'], ru
    assert os.path.isfile(os.path.join(g, 'disponibilites', 'AAA', '2026-W43.json')), 'semaine reçue'
    assert get(g, week)['dispos'] == {'lun': 'G'}, 'fiche du poste gardée'
    assert open(os.path.join(g, mora)).read().endswith('1200\n'), 'fichier hors pool laissé tel quel'
    assert subprocess.run(['git', 'ls-remote', remote, 'HEAD'], capture_output=True, text=True).stdout.split()[0] == h0, 'rien envoyé'
    assert '**/_index.json' in open(os.path.join(g, '.git', 'info', 'exclude')).read(), 'index ignorés sur ce poste'
    assert 'commités' in ru['message'] and 'reçus' in ru['message'], ru['message']
    # le dépôt change aussi le fichier hors pool : réception reportée, rien d'écrasé, pas de fusion laissée en cours
    open(os.path.join(a, mora), 'w').write('cell,ft\n1,1500\n')
    sh('commit', '-am', 'mora 2', cwd=a)
    sh('push', 'origin', 'HEAD', cwd=a)
    rb2 = update(g, 'GGG')
    assert not rb2['ok'] and rb2['blocked'] == ['sia/mora.csv'], rb2
    assert open(os.path.join(g, mora)).read().endswith('1200\n') and not os.path.exists(os.path.join(g, '.git', 'MERGE_HEAD'))
    assert 'sia/mora.csv' in rb2['message'], rb2['message']
    # reprise d'un poste (adopt) : data/ sans dépôt, avec ses fiches — adresse locale admise le temps de l'essai
    global REMOTE_RE
    saved_re, REMOTE_RE = REMOTE_RE, re.compile(r'.')
    try:
        put(a, 'config/suite.json', {'va': 'compagnie'})
        assert run(a, 'AAA')['ok']
        head = lambda: subprocess.run(['git', 'ls-remote', remote, 'HEAD'], capture_output=True, text=True).stdout.split()[0]
        h0 = head()
        d = os.path.join(tmp, 'D')
        os.makedirs(d)
        open(os.path.join(d, 'data_tree.js'), 'w').write('window.DATA_TREE = {}\n')
        put(d, week, {'updated_at': '2026-10-05T13:00:00Z', 'dispos': {'lun': 'D'}})  # plus récente que celle du dépôt
        put(d, 'disponibilites/DDD/2026-W42.json', {'updated_at': '2026-10-12T08:00:00Z', 'dispos': {}})  # du poste seul
        dd = get(a, aff)
        dd['assignments'].append({'mission': 'M4', 'pilot': 'DDD', 'role': 'mission', 'updated_at': '3'})
        put(d, aff, dd)
        put(d, 'config/suite.json', {'va': 'exemples'})  # sans updated_at, plus ancien que le commit du dépôt
        os.utime(os.path.join(d, 'config', 'suite.json'), (946684800, 946684800))
        rd = adopt(d, remote, 'DDD')
        assert rd['ok'] and not rd['fresh'] and rd['committed'] >= 3, rd
        assert get(d, week)['dispos'] == {'lun': 'D'}, 'fiche du poste plus récente gardée'
        assert any(c.get('copy') for c in rd['conflicts']), 'version du dépôt gardée dans _conflits/'
        assert sorted(x['mission'] for x in get(d, aff)['assignments']) == ['M1', 'M2', 'M3', 'M4'], 'affectations réunies'
        assert get(d, 'config/suite.json') == {'va': 'compagnie'}, 'fichier sans date : le plus récent (dépôt)'
        assert rd['backup'] and os.path.isfile(os.path.join(tmp, rd['backup'], 'config', 'suite.json')), 'original copié'
        assert os.path.isfile(os.path.join(d, 'data_tree.js')), 'fichier du poste hors du dépôt gardé'
        assert head() == h0, 'rien envoyé'
        assert not pool_changes(d), 'fiches du poste commitées'
        assert branch_info(d)[1], 'branche distante suivie'
        assert run(d, 'DDD')['ok'] and head() != h0, 'Synchroniser envoie la reprise'
        # échec (dépôt absent) : dossier intact
        e = os.path.join(tmp, 'E')
        put(e, week, {'updated_at': '1', 'dispos': {}})
        before = sorted(_walk(e))
        re_ = adopt(e, os.path.join(tmp, 'absent.git'), 'EEE')
        assert not re_['ok'] and sorted(_walk(e)) == before and not os.path.isdir(os.path.join(e, '.git')), re_
        # jeu d'essai : mis de côté, simple clone
        f = os.path.join(tmp, 'F')
        os.makedirs(f)
        open(os.path.join(f, 'data_tree.js'), 'w').write('window.DATA_TREE = { jeu_essai: true }\n')
        put(f, 'disponibilites/ZZZ/2026-W41.json', {'updated_at': '9', 'dispos': {}})
        rf = adopt(f, remote, 'FFF')
        assert rf['ok'] and rf['fresh'] and os.path.isdir(os.path.join(f, '.git')), rf
        assert not os.path.exists(os.path.join(f, 'disponibilites', 'ZZZ')), 'fiches du jeu d’essai pas reprises'
        assert os.path.isfile(os.path.join(tmp, rf['backup'], 'disponibilites', 'ZZZ', '2026-W41.json')), 'jeu d’essai mis de côté'
    finally:
        REMOTE_RE = saved_re
    print('essai réussi :', tmp, '— conflits :', r['conflicts'])
    shutil.rmtree(tmp, ignore_errors=True)


if __name__ == '__main__':
    if '--essai' in sys.argv:
        _essai()
    else:
        print(__doc__)
