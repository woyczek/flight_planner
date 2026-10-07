"""Garde-fou : aucun fichier binaire ne doit entrer dans git sans passer par Git LFS.

Usage (à la racine d'un dépôt : l'application, ou data/) :
    python tools/check_binaries.py              → fichiers suivis (HEAD / index) : binaires qui ne sont pas des pointeurs LFS
    python tools/check_binaries.py --staged     → fichiers en cours de commit seulement (crochet pre-commit)
    python tools/check_binaries.py --install    → installe le crochet pre-commit de ce dépôt (.git/hooks/pre-commit)
    python ../tools/check_binaries.py --repo data --install   → idem pour le dépôt de données

Binaire = extension d'image, d'archive, de document, de police ou de média, ou contenu avec un octet nul. Un fichier
binaire doit être couvert par une règle « filter=lfs » de .gitattributes (git check-attr) ET être stocké comme
pointeur LFS (« version https://git-lfs.github.com/spec/v1 »). Sortie 1 si un fichier est en défaut (commit refusé).
Correction : git lfs track "*.ext" (ou une règle dans .gitattributes), puis git rm --cached <fichier> && git add <fichier>.
Bibliothèque standard uniquement.
"""
import os, subprocess, sys

sys.stdout.reconfigure(encoding='utf-8')
BIN_EXT = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico', '.tif', '.tiff', '.psd', '.pdf', '.zip', '.7z', '.gz',
           '.tgz', '.rar', '.mp3', '.mp4', '.wav', '.ogg', '.mov', '.avi', '.ttf', '.otf', '.woff', '.woff2', '.eot', '.blend',
           '.dds', '.obj', '.fbx', '.xlsx', '.docx', '.pptx', '.ods', '.odt', '.exe', '.dll', '.so', '.bin', '.dat'}
POINTER = b'version https://git-lfs.github.com/spec/v1'
HOOK = """#!/bin/sh
# Garde-fou : binaires hors Git LFS refusés (tools/check_binaries.py ; installé par --install).
root="$(git rev-parse --show-toplevel)"
script="$root/tools/check_binaries.py"; [ -f "$script" ] || script="$root/../tools/check_binaries.py"
[ -f "$script" ] || exit 0
for py in python python3 py; do command -v "$py" >/dev/null 2>&1 && exec "$py" "$script" --staged --repo "$root"; done
echo "check_binaries : Python introuvable, contrôle sauté." >&2
exit 0
"""


def git(root, *args, binary=False):
    """Sortie d'une commande git dans le dépôt root (texte, ou octets avec binary=True) ; erreurs ignorées."""
    r = subprocess.run(['git', *args], cwd=root, capture_output=True)
    return r.stdout if binary else r.stdout.decode('utf-8', 'replace')


def main():
    """Installe le crochet (--install) ou contrôle les fichiers suivis / indexés (--staged).
    Retourne le code de sortie : 1 si un binaire est hors LFS (ou crochet déjà occupé), 0 sinon."""
    args = sys.argv[1:]
    root = os.path.abspath(args[args.index('--repo') + 1]) if '--repo' in args else os.getcwd()
    root = git(root, 'rev-parse', '--show-toplevel').strip() or root
    if '--install' in args:
        hooks = git(root, 'rev-parse', '--git-path', 'hooks').strip()
        hooks = hooks if os.path.isabs(hooks) else os.path.join(root, hooks)
        os.makedirs(hooks, exist_ok=True)
        path = os.path.join(hooks, 'pre-commit')
        if os.path.exists(path) and 'check_binaries' not in open(path, encoding='utf-8', errors='replace').read():
            print(f'✗ {path} existe déjà (autre crochet) : ajouter à la main l\'appel à tools/check_binaries.py --staged')
            return 1
        with open(path, 'w', encoding='utf-8', newline='\n') as f:
            f.write(HOOK)
        os.chmod(path, 0o755)
        print(f'✓ crochet installé : {path}')
        return 0
    staged = '--staged' in args
    names = git(root, 'diff', '--cached', '--name-only', '--diff-filter=AM', '-z') if staged else git(root, 'ls-files', '-z')
    files = [n for n in names.split('\0') if n]
    if not files:
        return 0
    attrs = git(root, 'check-attr', 'filter', '-z', '--', *files) if files else ''
    lfs = set()
    bits = attrs.split('\0')
    for i in range(0, len(bits) - 2, 3):
        if bits[i + 2] == 'lfs':
            lfs.add(bits[i])
    # état de l'index : « i/-text » = contenu binaire (un pointeur LFS est du texte : i/lf)
    eol = {}
    for rec in git(root, 'ls-files', '--eol', '-z', '--', *files).split('\0'):
        if '\t' in rec:
            info, name = rec.split('\t', 1)
            eol[name] = info.split()[0] if info.split() else ''
    bad = []
    for name in files:
        ext = os.path.splitext(name)[1].lower()
        if ext not in BIN_EXT and eol.get(name) != 'i/-text':
            continue
        head = git(root, 'cat-file', '-p', f':{name}', binary=True)[:200]
        pointer = head.startswith(POINTER)
        if name not in lfs or not pointer:
            why = 'aucune règle LFS (.gitattributes)' if name not in lfs else 'stocké en clair (pas un pointeur LFS)'
            size = git(root, 'cat-file', '-s', f':{name}').strip()
            bad.append(f'{name} — {int(size or 0) // 1024} Ko — {why}')
    if bad:
        print(f'✗ {len(bad)} binaire(s) hors Git LFS :')
        for b in bad[:40]:
            print('   ' + b)
        if len(bad) > 40:
            print(f'   … (+{len(bad) - 40})')
        print('Correction : règle « filter=lfs » dans .gitattributes (git lfs track "*.ext"), puis '
              'git rm --cached <fichier> && git add <fichier>.')
        return 1
    if not staged:
        print(f'✓ {len(files)} fichiers suivis : aucun binaire hors LFS.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
