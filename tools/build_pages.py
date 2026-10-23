"""Site statique de la suite pour GitHub Pages (appli sans lanceur, docs/technique/APPLI_AUTONOME.md).

Copie les fichiers suivis par git (sans data/ : les données viennent du dépôt GitHub des données, par le service worker
sw.js) dans un dossier de sortie, comme le lanceur les sert :
  · empreintes ?v= réelles posées dans les pages, scripts et feuilles des designs (tools/version_stamps.serve) ;
  · config/repository_tree (sans extension, servi « octet-stream » par Pages) doublé de config/repository_tree.js,
    et les pages qui le chargent pointées vers ce dernier ;
  · config/build.js (commit affiché en pied de page) écrit depuis git ;
  · .nojekyll (fichiers et dossiers commençant par « _ » servis tels quels) ;
  · politique de sécurité du contenu (CSP) en balise meta dans chaque page (Pages n'envoie pas d'en-têtes ; l'appli iOS
    reprend ce site) : même liste que le lanceur (tools/csp_policy.py) et les adresses de config/repository_tree.
Les images gérées par Git LFS doivent être présentes dans la copie de travail (actions/checkout avec lfs: true) ; un
pointeur LFS restant arrête la construction.

Usage : python tools/build_pages.py _site
"""
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


def main(out):
    out = os.path.abspath(out)
    if os.path.isdir(out):
        shutil.rmtree(out)
    files = [f for f in git('ls-files', '-z').split('\0') if f and not f.startswith(SKIP)]
    # politique de sécurité des pages (balise meta, avant tout script) : liste fixe et adresses de la configuration
    with open(os.path.join(ROOT, 'config', 'repository_tree'), encoding='utf-8') as f:
        policy = csp_policy.value(csp_policy.config_sites(f.read()), meta=True)
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
    print(f'{len(files)} fichiers → {out}')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '_site')
