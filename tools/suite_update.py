"""Mise à jour de la suite par le lanceur (V3 § 10.34 A3, carte « Mise à jour de la suite » de Maintenance › Administration ;
30 oct. 2026).

Un canal choisit une version, jamais une branche à suivre à l'aveugle :
  · stable : la dernière étiquette de version vX.Y.Z (sans suffixe), extraite détachée ;
  · early  : la version la plus haute, préversions comprises (vX.Y.Z-alpha.N, -beta.N, -rc.N), extraite détachée — une
    préversion plus ancienne que la dernière stable n'est jamais proposée ;
  · suivi  : la tête de la branche de développement (DEV_BRANCH, nommée ici une fois), pour l'administrateur qui essaie.
Règles, toutes vérifiées avant d'écrire quoi que ce soit (plan) :
  · git fetch d'abord (étiquettes et branche de développement) ; puis avance rapide seulement : la cible doit contenir la
    version extraite (aucun retour en arrière, aucune fusion) ;
  · refus si la suite a des changements locaux suivis (fichiers modifiés, index), ou si l'extraction n'est pas celle du
    canal (étiquettes : HEAD détachée ; suivi : la branche DEV_BRANCH) — l'administrateur règle cela lui-même ;
  · le dépôt des données (data/, dépôt à part) n'est jamais touché ; le lanceur en cours garde son code jusqu'à ce qu'il
    soit relancé à la main (dit dans le résultat) ; la mise à jour du lanceur lui-même reste une étape documentée.
Bibliothèque standard seulement ; git par data_sync.git_cmd / git_env (jamais d'invite, chemins littéraux)."""
import os
import re

import data_sync

CHANNELS = ('stable', 'early', 'suivi')
DEV_BRANCH = 'v3'  # la branche de développement suivie par le canal « suivi » (une seule mention)
TAG = re.compile(r'^v(\d+)\.(\d+)\.(\d+)(?:-(alpha|beta|rc)\.(\d+))?$')
PRE_ORDER = {'alpha': 0, 'beta': 1, 'rc': 2}
TIMEOUT = 120
SHA = re.compile(r'^[0-9a-f]{40}$')  # la cible montrée par « Vérifier », renvoyée par « Mettre à jour »


def _git(root, *args):
    """(code, sortie) de git dans le dossier de la suite ; jamais d'invite."""
    return data_sync.git(root, *args)


def version_key(tag):
    """Clé d'ordre d'une étiquette de version (une préversion avant la version qu'elle précède) ; None hors format."""
    m = TAG.match(tag or '')
    if not m:
        return None
    major, minor, patch, pre, n = m.groups()
    return (int(major), int(minor), int(patch), 0 if pre else 1, PRE_ORDER.get(pre, 0), int(n or 0))


def tags(root):
    """Étiquettes de version du dépôt de la suite (déjà récupérées), triées de la plus haute à la plus basse."""
    _, out = _git(root, 'tag', '--list', 'v*')
    found = [t.strip() for t in out.splitlines() if version_key(t.strip())]
    return sorted(found, key=version_key, reverse=True)


def target_of(root, channel):
    """(nom, commit) de la cible du canal ; ('', '') s'il n'y en a pas."""
    if channel == 'suivi':
        ref = f'origin/{DEV_BRANCH}'
        code, sha = _git(root, 'rev-parse', '--verify', '--quiet', f'{ref}^{{commit}}')
        return (ref, sha.strip()) if code == 0 and sha.strip() else ('', '')
    tl = tags(root)
    pick = next((t for t in tl if channel == 'early' or '-' not in t), '')
    if not pick:
        return '', ''
    code, sha = _git(root, 'rev-parse', '--verify', '--quiet', f'refs/tags/{pick}^{{commit}}')
    return (pick, sha.strip()) if code == 0 else ('', '')


def current(root):
    """{ head, branch ('' : détachée), version (git describe --tags), dirty } de la suite extraite."""
    code, head = _git(root, 'rev-parse', 'HEAD')
    _, branch = _git(root, 'symbolic-ref', '--quiet', '--short', 'HEAD')
    _, desc = _git(root, 'describe', '--tags', '--always')
    _, st = _git(root, 'status', '--porcelain', '--untracked-files=no')
    return {'head': head.strip() if code == 0 else '', 'branch': branch.strip(), 'version': desc.strip(), 'dirty': bool(st.strip())}


def plan(root, channel, fetch=True):
    """Ce que ferait la mise à jour sur ce canal, sans rien changer : { ok, channel, current, target, sha, commits, reason?,
    message } (sha : le commit de la cible) ; reason : 'no-git', 'unknown-channel', 'fetch-failed', 'no-target', 'dirty', 'other-checkout', 'downgrade',
    'up-to-date'."""
    res = {'ok': False, 'channel': channel, 'current': {}, 'target': '', 'commits': 0}
    if channel not in CHANNELS:
        return {**res, 'reason': 'unknown-channel', 'message': 'canal inconnu'}
    if not data_sync.git_exe() or not os.path.exists(os.path.join(root, '.git')):  # dossier, ou fichier d'un worktree
        return {**res, 'reason': 'no-git', 'message': 'la suite n’est pas un dépôt git (installée par une archive) : mise à jour manuelle'}
    if fetch:
        code, out = _git(root, 'fetch', '--quiet', '--tags', 'origin', f'+refs/heads/{DEV_BRANCH}:refs/remotes/origin/{DEV_BRANCH}')
        if code:
            return {**res, 'reason': 'fetch-failed', 'message': f'dépôt de la suite injoignable : {data_sync.clean_text(out)[-200:]}'}
    cur = current(root)
    res['current'] = cur
    name, sha = target_of(root, channel)
    if not sha:
        return {**res, 'reason': 'no-target', 'message': 'aucune version sur ce canal'}
    res['target'], res['sha'] = name, sha
    if cur['dirty']:
        return {**res, 'reason': 'dirty', 'message': 'des fichiers de la suite ont été modifiés sur ce poste : rien n’est changé'}
    if (channel == 'suivi') != (cur['branch'] == DEV_BRANCH) or (channel != 'suivi' and cur['branch']):
        return {**res, 'reason': 'other-checkout',
                'message': (f'le canal « suivi » demande la branche {DEV_BRANCH} extraite' if channel == 'suivi' else
                            'ce canal demande une version extraite détachée (une étiquette), pas une branche')}
    if sha == cur['head']:
        return {**res, 'ok': True, 'reason': 'up-to-date', 'message': 'déjà à jour'}
    if _git(root, 'merge-base', '--is-ancestor', cur['head'], sha)[0] != 0:
        return {**res, 'reason': 'downgrade', 'message': 'la cible ne contient pas la version extraite : jamais de retour en arrière ni de fusion'}
    _, n = _git(root, 'rev-list', '--count', f'{cur["head"]}..{sha}')
    res.update(ok=True, commits=int(n.strip() or 0), message='')
    return res


def changed(p, want):
    """Le plan p refusé (reason 'changed', avec le sha trouvé) si sa cible n'est plus want, le sha que « Vérifier » a
    montré ; None sinon, et sans want (relecture Sécurisation de 99b4c2a25, ligne 105)."""
    if want and p.get('sha') != want:
        return {**p, 'ok': False, 'done': False, 'reason': 'changed',
                'message': f'la version du canal a changé depuis la vérification ({p.get("sha", "")[:12] or "aucune"}) : vérifiez à nouveau'}
    return None


def apply(root, channel, fetch=True, want=''):
    """La mise à jour du canal, après un plan refait (avec fetch, ou sans quand l'appelant vient de le faire) : extraction
    détachée de l'étiquette, ou avance rapide de la branche ; { ok, …plan, done, message }. want : le sha que la question a
    montré ; une autre cible est refusée ('changed'), rien n'est écrit. Le lanceur en cours n'est pas relancé : à faire à la
    main."""
    p = plan(root, channel, fetch=fetch)
    if no := changed(p, want):
        return no
    if not p.get('ok') or p.get('reason') == 'up-to-date':
        return {**p, 'done': False}
    if channel == 'suivi':
        code, out = _git(root, 'merge', '--ff-only', '--quiet', f'origin/{DEV_BRANCH}')
    else:
        code, out = _git(root, 'checkout', '--quiet', '--detach', f'refs/tags/{p["target"]}')
    if code:
        return {**p, 'ok': False, 'done': False, 'reason': 'failed', 'message': f'git a refusé : {data_sync.clean_text(out)[-200:]}'}
    after = current(root)
    return {**p, 'done': True, 'current': after,
            'message': f'suite passée à {after["version"]} : relancez le lanceur (fermez sa fenêtre, puis lancer.cmd) pour qu’il prenne la nouvelle version'}
