"""Retire les !important des styles propres d'une page (docs/REFACTORING_TOOLKIT.md, chantier 3 : couches CSS).

Préalable aux couches : dans une couche, un !important l'emporte sur celui d'une règle hors couche (ordre inversé) ;
les !important des styles de page empêcheraient les designs de l'emporter. On les retire donc d'abord, hors couche,
page par page, en vérifiant au banc (tools/skeuo_regression.html?pages=<page>, designs à matières et « standard ») ;
un !important que le banc montre nécessaire est remis à la main, avec un commentaire qui dit contre quoi il se bat.

Usage (à la racine du dépôt) :
    python tools/strip_page_important.py apps/…/page.html [--check]
    python tools/strip_page_important.py shared/mission_core/core.css [--check]

Concerné : les blocs <style> de la page (ou la feuille .css donnée), sauf les règles propres aux designs (sélecteur
html[data-skeuo…], html[data-design…], html[data-tone…], html[data-decor…] : côté habillage, traitées avec les designs)
et les !important précédés d'un commentaire « garder » (/* garder : … */ sur la déclaration).
"""
import io, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from layer_pages import blocs, est_design

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
IMP = re.compile(r'\s*!important(?!\s*;?\s*/\*\s*garder)')


def strip_css(css):
    """(css sans !important hors règles des designs, nombre retiré)."""
    out, n = [], 0
    for b in blocs(css):
        d = est_design(b)
        if d:   # règle des designs (ou @media de règles des designs) : inchangée
            out.append(b)
            continue
        c = len(IMP.findall(b))
        n += c
        out.append(IMP.sub('', b) if c else b)
    return ''.join(out), n


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    check = '--check' in sys.argv
    for rel in args:
        p = os.path.join(ROOT, rel)
        s = io.open(p, encoding='utf-8', newline='').read()
        total = 0
        if rel.endswith('.css'):
            t, total = strip_css(s)
        else:
            def st(m):
                nonlocal total
                css, n = strip_css(m.group(2))
                total += n
                return f'<style{m.group(1)}>{css}</style>'
            t = re.sub(r'<style([^>]*)>(.*?)</style>', st, s, flags=re.S)
        if not check and t != s:
            io.open(p, 'w', encoding='utf-8', newline='').write(t)
        print(f'{rel} : {total} !important retiré(s){" (essai)" if check else ""}')


if __name__ == '__main__':
    main()
