"""Découpe de la feuille de registre de Cabinet (dossier « Aéronautique navale ») en morceaux WebP pour
shared/designs_skeuo.css (.repo-deco-sheet) : coins fixes aux bords intérieurs fondus, tranches répétées raccordables
(fondu enchaîné), en-tête en deux parties (logos à gauche ; N° et tampon « Diffusion restreinte » à droite), papier de
fond, ficelle (image transparente livrée à part, sheet-string.webp, non produite ici).

Planche source (non versionnée, 1145 × 1374) : shared/deco/cabinet/ChatGPT Image 30 Sept 2026, 11_48_14.png ; origine
de la feuille dans la planche : (40, 45). Les positions et tailles des morceaux dans la CSS en découlent (échelle --k).

Usage (ImageMagick 7, dossier courant : shared/deco/cabinet) :
  python ../../../tools/cut_register_sheet.py            → écrit les sheet-*.webp
Puis python tools/bump_versions.py et vérification dans une page à registre (Cabinet, ton clair).
"""
import subprocess, os, tempfile
SRC = 'ChatGPT Image 30 Sept 2026, 11_48_14.png'
T = tempfile.mkdtemp()   # fichiers intermédiaires
Q = ['-quality', '86', '-define', 'webp:alpha-quality=92']


def run(*a):
    subprocess.run(['magick', *a], check=True)


def crop(x, y, w, h, out):
    run(SRC, '-crop', f'{w}x{h}+{x}+{y}', '+repage', out)


def feather(inp, out, left=0, right=0, top=0, bottom=0):
    """Fond transparent progressif sur les bords indiqués (px) : raccord doux avec la bande voisine."""
    w, h = map(int, subprocess.run(['magick', 'identify', '-format', '%w %h', inp], capture_output=True, text=True).stdout.split())
    m = ['-size', f'{w}x{h}', 'xc:white']
    if left: m += ['(', '-size', f'{h}x{left}', 'gradient:black-white', '-rotate', '-90', ')', '-geometry', '+0+0', '-compose', 'multiply', '-composite']
    if right: m += ['(', '-size', f'{h}x{right}', 'gradient:black-white', '-rotate', '90', ')', '-geometry', f'+{w - right}+0', '-compose', 'multiply', '-composite']
    if top: m += ['(', '-size', f'{w}x{top}', 'gradient:black-white', ')', '-geometry', '+0+0', '-compose', 'multiply', '-composite']
    if bottom: m += ['(', '-size', f'{w}x{bottom}', 'gradient:white-black', ')', '-geometry', f'+0+{h - bottom}', '-compose', 'multiply', '-composite']
    # (-geometry remis à zéro : le décalage du dernier fondu ne doit pas déplacer le masque)
    run(inp, '(', '+clone', '-alpha', 'extract', '(', *m, ')', '-geometry', '+0+0', '-compose', 'multiply', '-composite', ')', '-alpha', 'off', '-geometry', '+0+0', '-compose', 'copy_opacity', '-composite', *Q, out)


def seamless(x, y, w, h, o, axis, out):
    """Bande de w × h (axis 'x') ou h × w… raccordable : les o premiers px fondus avec les o px qui suivent la bande."""
    if axis == 'x':
        crop(x, y, w + o, h, f'{T}/s.png')
        run(f'{T}/s.png', '-crop', f'{w}x{h}+0+0', '+repage', f'{T}/a.png')
        run(f'{T}/s.png', '-crop', f'{o}x{h}+{w}+0', '+repage', f'{T}/b.png')
        run('-size', f'{h}x{o}', 'gradient:white-black', '-rotate', '-90', f'{T}/g.png')   # 1 à gauche → 0 à droite : poids de b
    else:
        crop(x, y, w, h + o, f'{T}/s.png')
        run(f'{T}/s.png', '-crop', f'{w}x{h}+0+0', '+repage', f'{T}/a.png')
        run(f'{T}/s.png', '-crop', f'{w}x{o}+0+{h}', '+repage', f'{T}/b.png')
        run('-size', f'{w}x{o}', 'gradient:white-black', f'{T}/g.png')
    # début de la bande = suite de la bande estompée (opaque à gauche / en haut) posée sur le début : la dernière
    # colonne (ligne) enchaîne sur la première ; transparences respectées (pas de noir)
    run(f'{T}/b.png', '(', '+clone', '-alpha', 'extract', f'{T}/g.png', '-compose', 'multiply', '-composite', ')',
        '-alpha', 'off', '-compose', 'copy_opacity', '-composite', f'{T}/bf.png')
    run(f'{T}/a.png', f'{T}/bf.png', '-geometry', '+0+0', '-compose', 'over', '-composite', *Q, out)


# coins et pièces fixes (origine de la feuille : x 40, y 45)
crop(40, 45, 720, 115, f'{T}/tl.png');   feather(f'{T}/tl.png', 'sheet-tl.webp', right=60, bottom=40)
crop(880, 45, 225, 155, f'{T}/tr.png');  feather(f'{T}/tr.png', 'sheet-tr.webp', left=50, bottom=40)
crop(40, 1232, 260, 98, f'{T}/bl.png');  feather(f'{T}/bl.png', 'sheet-bl.webp', right=50, top=20)
crop(880, 1232, 225, 98, f'{T}/br.png'); feather(f'{T}/br.png', 'sheet-br.webp', left=50, top=24)
crop(40, 470, 210, 410, f'{T}/st.png');  feather(f'{T}/st.png', 'sheet-string.webp', top=30, bottom=30, right=30)
# bandes raccordables : tranche plate du haut, du bas, dos à gauche, pages empilées à droite
seamless(780, 45, 120, 115, 40, 'x', f'{T}/top.png'); feather(f'{T}/top.png', 'sheet-top.webp', bottom=40)
seamless(420, 1232, 160, 98, 40, 'x', f'{T}/bot.png'); feather(f'{T}/bot.png', 'sheet-bot.webp', top=30)
seamless(40, 900, 210, 280, 40, 'y', f'{T}/left.png'); feather(f'{T}/left.png', 'sheet-left.webp', right=40)
seamless(1000, 490, 105, 360, 40, 'y', f'{T}/right.png'); feather(f'{T}/right.png', 'sheet-right.webp', left=30)
# en-tête : logos et « Marine nationale » (gauche) ; N° et tampon (droite), bords fondus sur le papier
crop(230, 150, 300, 270, f'{T}/hl.png'); run(f'{T}/hl.png', '(', '-size', '40x50', 'xc:none', ')', '-geometry', '+260+220', '-compose', 'copy', '-composite', f'{T}/hl.png')   # effacé : bout du tampon
feather(f'{T}/hl.png', 'sheet-head.webp', left=50, right=60, top=40, bottom=50)
crop(480, 190, 530, 300, f'{T}/hr.png'); run(f'{T}/hr.png', '(', '-size', '42x62', 'xc:none', ')', '-geometry', '+0+0', '-compose', 'copy', '-composite', f'{T}/hr.png')   # effacé : fin de « Aéronautique navale »
feather(f'{T}/hr.png', 'sheet-stamp.webp', left=60, right=40, top=30, bottom=50)
for f in ['tl', 'tr', 'bl', 'br', 'string', 'top', 'bot', 'left', 'right', 'head', 'stamp']:
    print(f, subprocess.run(['magick', 'identify', '-format', '%wx%h', f'sheet-{f}.webp'], capture_output=True, text=True).stdout)

# papier de fond : zone réglée sans filets (pointillés effacés), éclairage aplani, à la couleur moyenne du papier de
# l'en-tête (zone vierge entre « Marine nationale » et le N°) : pas de rectangle visible autour de l'en-tête et du tampon
mean = subprocess.run(['magick', SRC, '-alpha', 'off', '-crop', '250x170+525+100', '+repage', '-scale', '1x1!', '-format', '%[pixel:p{0,0}]', 'info:'], capture_output=True, text=True).stdout
run(SRC, '-alpha', 'off', '-crop', '540x540+405+665', '+repage', '-statistic', 'Median', '1x13', f'{T}/p.png')
run(f'{T}/p.png', '(', '+clone', '-blur', '0x40', ')', '-compose', 'DivideSrc', '-composite', '(', '-size', '540x540', f'xc:{mean}', ')', '-compose', 'Multiply', '-composite', '-quality', '86', 'sheet-paper.webp')
print('papier', mean)
