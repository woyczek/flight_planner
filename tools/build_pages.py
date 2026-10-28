"""Site statique de la suite pour GitHub Pages (appli sans lanceur, docs/technique/APPLI_AUTONOME.md).

Copie les fichiers suivis par git (sans data/ : les données viennent du dépôt GitHub des données, par le service worker
sw.js) dans un dossier de sortie, comme le lanceur les sert :
  · empreintes ?v= réelles posées dans les pages, scripts et feuilles des designs (tools/version_stamps.serve) ;
  · config/repository_tree (sans extension, servi « octet-stream » par Pages) doublé de config/repository_tree.js,
    et les pages qui le chargent pointées vers ce dernier ;
  · config/build.js (commit affiché en pied de page) écrit depuis git ;
  · .nojekyll (fichiers et dossiers commençant par « _ » servis tels quels) ;
  · politique de sécurité du contenu (CSP) en balise meta dans chaque page (Pages n'envoie pas d'en-têtes ; l'appli iOS
    reprend ce site) : même liste que le lanceur (tools/csp_policy.py), les adresses de config/repository_tree et les
    hôtes déclarés par meta.net des modules de l'appli V3.
Les images gérées par Git LFS doivent être présentes dans la copie de travail (actions/checkout avec lfs: true) ; un
pointeur LFS restant arrête la construction.

Page de départ (--start chemin, enveloppe Capacitor de mobile/ : l'appli ouvre index.html à la racine) : la page
d'accueil du site est remplacée par un renvoi vers ce chemin (par ex. frame/index.html, l'appli Pilote de la V3),
adresse et ancre gardées ; le chemin doit faire partie du site construit.

Hôtes du laboratoire des données (csp_policy.LAB_CONNECT, jusqu'à LAB_UNTIL) : une page construite garde sa CSP telle
quelle jusqu'à sa prochaine construction (site Pages, appli iOS qui l'embarque). La construction le dit avec la date tant
qu'ils y sont ; passé LAB_UNTIL ils n'y sont plus, et si le laboratoire est encore dans le code elle avertit (annotation
::warning:: des GitHub Actions) sans refuser : un correctif sans rapport doit pouvoir partir.

Usage : python tools/build_pages.py _site [--start frame/index.html]
"""
import json
import os
import re
import shutil
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import version_stamps  # noqa: E402
import csp_policy  # noqa: E402

ROOT = version_stamps.ROOT
LFS_HEAD = b'version https://git-lfs.github.com/spec/v1'
SKIP = ('data/', '.github/')  # données : jamais publiées (dépôt privé des données, lu par le service worker)


def git(*args):
    """Sortie d'une commande git à la racine du dépôt."""
    return subprocess.run(['git', *args], cwd=ROOT, check=True, capture_output=True, text=True).stdout.strip()


def with_csp(body, meta):
    """Page avec la balise CSP juste après <meta charset> (sinon après <head>) ; page sans <head> : inchangée."""
    m = re.search(rb'<meta\s+charset=[^>]*>', body, re.I) or re.search(rb'<head[^>]*>', body, re.I)
    return body[:m.end()] + meta + body[m.end():] if m else body


def start_page(out, start, meta):
    """Page d'accueil remplacée par un renvoi vers start (chemin relatif à la racine du site, présent dans le site)."""
    if not os.path.isfile(os.path.join(out, *start.split('/'))):
        sys.exit(f'Page de départ absente du site : {start}')
    target = json.dumps(start)
    page = (f'<!doctype html><html lang="fr"><head><meta charset="utf-8">'
            f'<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            f'<meta http-equiv="refresh" content="0; url={start}"><title>SOG Pilote</title>'
            f'<script>location.replace({target} + location.search + location.hash)</script></head><body></body></html>\n').encode()
    with open(os.path.join(out, 'index.html'), 'wb') as f:
        f.write(with_csp(page, meta))
    print(f'page de départ : {start}')


def lab_notice():
    """Ce que la construction dit des hôtes du laboratoire (csp_policy.LAB_CONNECT) ; '' sans laboratoire."""
    lab = csp_policy.lab_hosts()
    present = os.path.isfile(os.path.join(ROOT, 'frame', 'aerodb', 'lab_sources.js'))
    if lab:
        return (f"CSP : {len(lab)} hôtes du laboratoire des données jusqu'au {csp_policy.LAB_UNTIL.isoformat()} ; ce site (et l'appli "
                "iOS qui l'embarque) les garde jusqu'à sa prochaine construction : reconstruire après cette date.")
    if present:
        return (f'::warning::CSP : LAB_UNTIL ({csp_policy.LAB_UNTIL.isoformat()}) est passée et le laboratoire des données '
                "(frame/aerodb/lab*.js) est encore là : ses hôtes ne sont plus dans la politique (ses essais d'adresse sont "
                'bloqués par la page). Retirer le laboratoire, ou repousser la date par une décision écrite (tools/csp_policy.py).')
    return ''


def main(out, start='', only=None):
    """Construit le site dans out ; only : seulement ces chemins (essais : une page, sans images Git LFS)."""
    out = os.path.abspath(out)
    if os.path.isdir(out):
        shutil.rmtree(out)
    files = [f for f in git('ls-files', '-z').split('\0') if f and not f.startswith(SKIP) and (only is None or f in only)]
    note = lab_notice()
    if note:
        print(note)
    # politique de sécurité des pages (balise meta, avant tout script) : liste fixe, adresses de la configuration et
    # hôtes que les bibliothèques des modules V3 appellent elles-mêmes (meta.net)
    with open(os.path.join(ROOT, 'config', 'repository_tree'), encoding='utf-8') as f:
        policy = csp_policy.value([*csp_policy.config_sites(f.read()), *csp_policy.module_hosts(ROOT)], meta=True)
    meta = f'<meta http-equiv="Content-Security-Policy" content="{policy}">'.encode()
    pointers = []
    for rel in files:
        src = os.path.join(ROOT, rel)
        if not os.path.isfile(src):
            continue
        dst = os.path.join(out, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if version_stamps.stamped(src):
            body, _ = version_stamps.serve(src)
        else:
            body = open(src, 'rb').read()
            if body.startswith(LFS_HEAD):
                pointers.append(rel)
        # pages : repository_tree chargé par sa copie .js (type MIME de Pages)
        if rel.endswith('.html'):
            body = re.sub(rb'(config/repository_tree)(\?v=)', rb'\1.js\2', body)
            body = with_csp(body, meta)
        open(dst, 'wb').write(body)
    if pointers:
        sys.exit(f'Pointeurs Git LFS non résolus ({len(pointers)}, ex. {pointers[0]}) : checkout avec lfs: true.')
    tree = os.path.join(out, 'config', 'repository_tree')
    shutil.copyfile(tree, tree + '.js')
    sha, branch = git('rev-parse', 'HEAD'), git('rev-parse', '--abbrev-ref', 'HEAD')
    with open(os.path.join(out, 'config', 'build.js'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(f'window.REPOSITORY_BUILD = {{ sha: "{sha}", branch: "{branch}", tag: "" }};\n')
    open(os.path.join(out, '.nojekyll'), 'w').close()
    if start:
        start_page(out, start.strip('/'), meta)
    print(f'{len(files)} fichiers → {out}')


if __name__ == '__main__':
    args = sys.argv[1:]
    start = ''
    if '--start' in args:
        i = args.index('--start')
        start = args[i + 1] if i + 1 < len(args) else ''
        del args[i:i + 2]
        if not start:
            sys.exit('--start : chemin de la page de départ attendu (ex. frame/index.html)')
    main(args[0] if args else '_site', start)
