"""Retire les !important des styles propres d'une page (docs/technique/REFACTORING_TOOLKIT.md, chantier 3 : couches CSS).

Préalable aux couches : dans une couche, un !important l'emporte sur celui d'une règle hors couche (ordre inversé) ;
les !important des styles de page empêcheraient les designs de l'emporter. On les retire donc d'abord, hors couche,
page par page, en vérifiant au banc (tools/skeuo_regression.html?pages=<page>, designs à matières et « standard ») ;
un !important que le banc montre nécessaire est remis à la main, avec un commentaire qui dit contre quoi il se bat.

Usage (à la racine du dépôt) :
    python tools/strip_page_important.py apps/…/page.html [--check]
    python tools/strip_page_important.py shared/mission_core/core.css [--check]
    --bump : au lieu de les retirer, convertit les !important en règles renforcées « :not(#imp) » (avant la mise en
             couche : rendu inchangé entre règles de l'application ; voir bump_css)
    --designs (avec --bump) : feuilles des designs, règles des designs comprises (étape 4 : rendu inchangé entre
             règles des designs ; un !important qui bat un style en ligne reste, suivi de /* garder */)

Concerné : les blocs <style> de la page (ou la feuille .css donnée), sauf les règles propres aux designs (sélecteur
html[data-skeuo…], html[data-design…], html[data-tone…], html[data-decor…] : côté habillage, traitées avec les designs)
les blocs @media / @supports (non vérifiés par le banc), les display: none (masquage) et les !important suivis d'un
commentaire « garder » (/* garder : … */).
"""
import io, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from layer_pages import blocs, est_design

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
IMP = re.compile(r'\s*!important(?!\s*;?\s*/\*\s*garder)')
NONE = re.compile(r'display\s*:\s*none\s*$')


def strip_css(css):
    """(css sans !important hors règles des designs, nombre retiré)."""
    out, n = [], 0
    for b in blocs(css):
        d = est_design(b)
        # inchangés : règles des designs ; blocs @media / @supports (largeurs et impression que le banc, relevé à
        # 1500 px à l'écran, ne vérifie pas)
        if d or b.lstrip().startswith('@'):
            out.append(b)
            continue
        # display: none reste !important (utilitaire de masquage : doit l'emporter sur tout display)
        c = len([m for m in IMP.finditer(b) if not NONE.search(b[:m.start()].rsplit(';', 1)[-1].rsplit('{', 1)[-1])])
        n += c
        out.append(IMP.sub(lambda m: m.group(0) if NONE.search(m.string[:m.start()].rsplit(';', 1)[-1].rsplit('{', 1)[-1]) else '', b) if c else b)
    return ''.join(out), n


# --- conversion (couche « app ») : un !important de l'application battait une autre règle de l'application ; dans la
# couche, il devient un sélecteur renforcé d'un id fictif « :not(#imp) » (spécificité + 1-0-0 : devant les règles
# ordinaires de l'application, ordre inchangé entre règles converties, toujours derrière les designs hors couche).
BUMP = ':not(#imp)'
PSEUDO_EL = re.compile(r'::[\w-]+|:(before|after|first-line|first-letter)\b')


def _split_top(s, sep):
    """Découpe s sur sep hors parenthèses et guillemets."""
    out, depth, q, cur = [], 0, None, ''
    for c in s:
        if q:
            q = None if c == q else q
        elif c in '"\'':
            q = c
        elif c == '(':
            depth += 1
        elif c == ')':
            depth -= 1
        elif c == sep and depth == 0:
            out.append(cur)
            cur = ''
            continue
        cur += c
    out.append(cur)
    return out


def bump_selector(sel):
    """« a .b::before » → « a .b:not(#imp)::before » (avant le pseudo-élément) ; sinon ajouté à la fin."""
    out = []
    for s in _split_top(sel, ','):
        s = s.strip()
        depth, cut = 0, None
        for i, c in enumerate(s):
            depth += c == '('
            depth -= c == ')'
            if depth == 0 and c == ':' and PSEUDO_EL.match(s, i):
                cut = i
                break
        out.append(s + BUMP if cut is None else s[:cut] + BUMP + s[cut:])
    return ',\n'.join(out)


def bump_css(css, designs=False):
    """(css où les !important deviennent des règles renforcées, nombre converti) ; designs : règles des designs
    comprises (feuilles des designs, étape 4 : ordre entre règles des designs inchangé)."""
    out, n = [], 0
    for b in blocs(css):
        if (est_design(b) and not designs) or b.lstrip().startswith('@') or '{' not in b:
            out.append(b)
            continue
        head, body = b.split('{', 1)
        body = body.rsplit('}', 1)[0]
        lead = head[:len(head) - len(head.lstrip())]
        decls = [d for d in _split_top(body, ';') if d.strip()]
        keep, imp = [], []
        for d in decls:
            m = re.search(r'\s*!important\s*$', d)
            if m and not NONE.search(d[:m.start()].strip()) and not re.search(r'/\*\s*garder', d):
                imp.append(d[:m.start()].strip())
            else:
                keep.append(d.strip())
        if not imp:
            out.append(b)
            continue
        n += len(imp)
        sel = head.strip()
        if keep:
            out.append(f'{lead}{sel} {{\n  ' + ';\n  '.join(keep) + '\n}')
        out.append(f'{chr(10) if keep else lead}{bump_selector(sel)} {{\n  ' + ';\n  '.join(imp) + '\n}')
    return ''.join(out), n


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    check = '--check' in sys.argv
    for rel in args:
        p = os.path.join(ROOT, rel)
        s = io.open(p, encoding='utf-8', newline='').read()
        total = 0
        conv = (lambda c: bump_css(c, designs='--designs' in sys.argv)) if '--bump' in sys.argv else strip_css
        if rel.endswith('.css'):
            t, total = conv(s)
        else:
            def st(m):
                nonlocal total
                css, n = conv(m.group(2))
                total += n
                return f'<style{m.group(1)}>{css}</style>'
            t = re.sub(r'<style([^>]*)>(.*?)</style>', st, s, flags=re.S)
        if not check and t != s:
            io.open(p, 'w', encoding='utf-8', newline='').write(t)
        print(f'{rel} : {total} !important {"converti(s)" if '--bump' in sys.argv else "retiré(s)"}{" (essai)" if check else ""}')


if __name__ == '__main__':
    main()
