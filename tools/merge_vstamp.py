"""Pilote de fusion git « vstamp » : les conflits qui ne portent que sur les empreintes de cache « ?v=xxxxxxxx » (posées par
tools/bump_versions.py dans les pages, scripts et feuilles) sont résolus seuls ; les vrais conflits restent à résoudre à
la main, comme d'habitude.

Pourquoi : chaque branche remonte les empreintes de ses fichiers ; à la fusion ou au rebase, les mêmes lignes
« <script src="…?v=abcd1234"> » diffèrent des deux côtés sans qu'aucun contenu n'ait changé. Le pilote fait la fusion à
trois voies ordinaire (git merge-file), puis, dans chaque bloc de conflit, compare les deux côtés en remplaçant les
empreintes par un jeton : s'ils sont identiques, il garde le côté courant ; l'empreinte juste est remise ensuite par
tools/bump_versions.py (à relancer avant de commiter, comme toujours).

Installation (une fois par clone ou worktree ; faite par tools/install_hooks.sh) :
    git config merge.vstamp.name "empreintes ?v= : résolues seules"
    git config merge.vstamp.driver "python tools/merge_vstamp.py %O %A %B"
Déclaration : .gitattributes (« *.html merge=vstamp », etc.). Sans la configuration, git fusionne normalement.
Code de sortie : 0 fusion propre (y compris après résolution des empreintes), 1 conflits restants (marqueurs laissés
dans %A, comme git merge-file).
"""
import io, re, subprocess, sys

RX_CONFLICT = re.compile(r'<<<<<<< [^\n]*\n(.*?)\n=======\n(.*?)\n>>>>>>> [^\n]*\n', re.S)
RX_STAMP = re.compile(r'\?v=[0-9a-f]+')


def same_but_stamps(a, b):
    """Vrai si les deux textes ne diffèrent que par leurs empreintes ?v=."""
    return RX_STAMP.sub('?v=X', a) == RX_STAMP.sub('?v=X', b)


def main(base, ours, theirs):
    """Fusion à trois voies, puis résolution des blocs qui ne diffèrent que par les empreintes ; écrit le résultat dans ours."""
    # git merge-file écrit le résultat dans ours et renvoie le nombre de conflits (négatif : erreur)
    r = subprocess.run(['git', 'merge-file', '-L', 'courant', '-L', 'base', '-L', 'autre', ours, base, theirs])
    if r.returncode < 0:
        return 2
    if r.returncode == 0:
        return 0
    text = io.open(ours, encoding='utf-8', errors='surrogateescape', newline='').read()
    left = 0

    def resolve(m):
        nonlocal left
        a, b = m.group(1), m.group(2)
        if same_but_stamps(a, b):
            return a + '\n'
        left += 1
        return m.group(0)
    text = RX_CONFLICT.sub(resolve, text)
    io.open(ours, 'w', encoding='utf-8', errors='surrogateescape', newline='').write(text)
    return 1 if left else 0


if __name__ == '__main__':
    if len(sys.argv) != 4:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(*sys.argv[1:4]))
