"""Inventaire des données du poste (SOG-0010, lot E2, 5 nov. 2026) : ce que « data » recouvre, en lecture seule.

Sept emplacements (frame/settings/DATA_MAP.md § 1), chacun avec sa taille, son état de suivi par git (« suivi », « local », « hors
dépôt ») et son écrivain. Rien n'est lu dans un fichier, rien n'est écrit, rien n'est déplacé : des noms de dossiers, des tailles, et
la réponse de git à `ls-files` et `check-ignore`. Jamais un chemin de fichier, jamais un contenu, jamais un jeton.

Sert la route GET /__setup/data/inventory du lanceur (ce poste seulement) ; la carte « Inventaire des données » de Maintenance › Données
l'affiche."""
import os

# Les sept emplacements, dans l'ordre de la table du DATA_MAP : (id, état par défaut si git ne dit rien, écrivain)
PLACES = ('repo', 'local', 'raw', 'cache', 'suite', 'downloads', 'backup')
# L'écrivain de chaque emplacement : une table de la suite, pas une lecture de l'historique git (lente, et qui montrerait des noms)
WRITERS = {
    'repo': 'launcher+pilots',   # le lanceur (builds, ramassages), les pilotes (depuis § 10.36), la publication du cadre
    'local': 'launcher',         # les sources brutes des procédures (cifp, ead, eaip), sync.json
    'raw': 'user',               # les XML et zip du SIA déposés à la main (« Prendre le fichier téléchargé »)
    'cache': 'app',              # la copie de l'appareil (IndexedDB) : l'appli, par ctx.data ; hors de ce disque, jamais lue ici
    'suite': 'suite',            # AircraftDB/, icao_doc8643_cache/, ead_probe/, … à la racine de la suite
    'downloads': 'user',         # le dossier Téléchargements : l'utilisateur
    'backup': 'restoration',     # un dossier data_avant_… laissé par une restauration
}
# Les états de suivi : 'tracked' (suivi par git, publié), 'local' (dans data/ mais ignoré : jamais publié), 'outside' (hors de data/)
STATES = ('tracked', 'local', 'outside', 'unknown')
SIZE_CAP = 5_000_000_000      # au-delà, la taille dit seulement « au moins » (un parcours trop long n'est pas fait)
DEPTH_MAX = 12                # profondeur du parcours d'un dossier (un lien ne se suit jamais)
FILES_MAX = 400_000           # fichiers comptés au plus par emplacement


def _size(path):
    """(octets, fichiers, tronqué) d'un dossier : parcours sans suivre les liens, borné ; (0, 0, False) s'il est absent."""
    total, files, cut = 0, 0, False
    if not os.path.isdir(path):
        return 0, 0, False
    stack = [(path, 0)]
    while stack:
        d, depth = stack.pop()
        try:
            with os.scandir(d) as it:
                for e in it:
                    try:
                        if e.is_symlink():
                            continue
                        if e.is_dir(follow_symlinks=False):
                            if depth < DEPTH_MAX:
                                stack.append((e.path, depth + 1))
                            else:
                                cut = True
                        elif e.is_file(follow_symlinks=False):
                            total += e.stat(follow_symlinks=False).st_size
                            files += 1
                            if files >= FILES_MAX or total >= SIZE_CAP:
                                return total, files, True
                    except OSError:
                        continue
        except OSError:
            continue
    return total, files, cut


def _tracked_count(data, git):
    """Nombre de fichiers suivis par git dans data/ (ls-files), ou None si git ne répond pas. `git(data, *args)` → (code, sortie)."""
    code, out = git(data, 'ls-files', '-z')
    if code != 0:
        return None
    return len([x for x in out.split('\0') if x])


def _ignored(data, git, rel):
    """Vrai si git ignore ce dossier de data/ (check-ignore) ; None si git ne répond pas."""
    code, out = git(data, 'check-ignore', '-q', '--', rel + '/')
    return True if code == 0 else False if code == 1 else None


def inventory(data, root, downloads='', git=None):
    """Les sept emplacements : [{ id, present, bytes, files, truncated, state, writer }].

    data : le dossier data/ du poste ; root : la racine de la suite ; downloads : le dossier Téléchargements ('' : inconnu) ;
    git : `git(data, *args)` → (code, sortie), le lecteur de data_sync (None : l'état de suivi reste « unknown »).
    Rien n'est écrit ; une erreur de lecture d'un emplacement le laisse « absent », jamais une exception."""
    rows = []

    def row(pid, path, state):
        size, files, cut = _size(path) if path else (0, 0, False)
        rows.append({'id': pid, 'present': bool(path) and os.path.isdir(path), 'bytes': size, 'files': files, 'truncated': cut,
                     'state': state if state in STATES else 'unknown', 'writer': WRITERS[pid]})

    is_repo = os.path.isdir(os.path.join(data, '.git'))
    # 1. data/ : le dépôt des données ; 'tracked' quand git en suit des fichiers
    n = _tracked_count(data, git) if (git and is_repo) else None
    row('repo', data, 'unknown' if n is None else 'tracked' if n else 'local')
    # 2. data/local/ : ignoré par le .gitignore de data/ ; git le dit
    ign = _ignored(data, git, 'local') if (git and is_repo) else None
    row('local', os.path.join(data, 'local'), 'local' if ign else 'unknown' if ign is None else 'tracked')
    # 3. les sources brutes du SIA dans data/sia/ : *.xml et *.zip, ignorés ; on compte les fichiers de ce motif seulement
    raw = os.path.join(data, 'sia')
    raw_size, raw_files = 0, 0
    if os.path.isdir(raw):
        for name in os.listdir(raw):
            p = os.path.join(raw, name)
            if os.path.isfile(p) and name.lower().endswith(('.xml', '.zip')):
                try:
                    raw_size += os.path.getsize(p)
                    raw_files += 1
                except OSError:
                    pass
    rows.append({'id': 'raw', 'present': raw_files > 0, 'bytes': raw_size, 'files': raw_files, 'truncated': False,
                 'state': 'local' if raw_files else 'unknown', 'writer': WRITERS['raw']})
    # 4. le cache de l'appareil : dans le navigateur, hors de ce disque ; rien à mesurer ici
    rows.append({'id': 'cache', 'present': False, 'bytes': 0, 'files': 0, 'truncated': False, 'state': 'outside', 'writer': WRITERS['cache']})
    # 5. les dossiers de travail à la racine de la suite (hors data/) : AircraftDB, caches, relevés
    work = [os.path.join(root, d) for d in ('AircraftDB', 'icao_doc8643_cache', 'ead_probe', 'ead_survey', 'git-config')]
    tot, fil, cut = 0, 0, False
    for p in work:
        s, f, c = _size(p)
        tot, fil, cut = tot + s, fil + f, cut or c
    rows.append({'id': 'suite', 'present': any(os.path.isdir(p) for p in work), 'bytes': tot, 'files': fil, 'truncated': cut, 'state': 'outside',
                 'writer': WRITERS['suite']})
    # 6. Téléchargements
    row('downloads', downloads, 'outside')
    # 7. les sauvegardes laissées à la racine : data_avant_<date>/
    backs = sorted(d for d in (os.listdir(root) if os.path.isdir(root) else []) if d.startswith('data_avant_') and os.path.isdir(os.path.join(root, d)))
    tot, fil, cut = 0, 0, False
    for d in backs:
        s, f, c = _size(os.path.join(root, d))
        tot, fil, cut = tot + s, fil + f, cut or c
    rows.append({'id': 'backup', 'present': bool(backs), 'bytes': tot, 'files': fil, 'truncated': cut, 'state': 'outside' if backs else 'unknown',
                 'writer': WRITERS['backup'], 'count': len(backs)})
    return rows
