"""Fusionne les règles renforcées « :not(#imp) » que l'audit montre inutiles (docs/technique/REFACTORING_TOOLKIT.md, couches CSS).

La conversion des !important (strip_page_important.py --bump) a scindé des règles : une règle ordinaire, puis la même
au sélecteur renforcé. tools/imp_audit.html retire le renfort de chacune, page par page, design par design, ton par ton,
et relève les propriétés qu'elle déclare sur les éléments qu'elle vise ; une règle « inutile » ne change jamais rien
(et aucune règle à état ne se dispute ses propriétés). Ce script lit son JSON (bouton « Copier le JSON ») et, pour
chacune :
  - si la règle précédente a le même sélecteur sans renfort : ses déclarations y sont ajoutées, la règle renforcée
    disparaît (règle d'origine reconstituée) ;
  - sinon : le renfort est retiré du sélecteur.

Usage (à la racine du dépôt) :
    python tools/merge_imp_rules.py audit.json [--check]
Ensuite : python tools/bump_versions.py, banc de non-régression (tools/skeuo_regression.html).
"""
import io, json, os, re, sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
BUMP = ':not(#imp)'
COMMENT = re.compile(r'/\*.*?\*/', re.S)


def norm(sel):
    """Sélecteur comparable à celui du CSSOM (sans renfort, sans commentaire, sans blancs, sans guillemets)."""
    return re.sub(r'\s+', '', COMMENT.sub('', sel).replace(BUMP, '').replace("'", '').replace('"', ''))


def props(css):
    return {d.split(':', 1)[0].strip().lower() for d in COMMENT.sub('', css).split(';') if ':' in d}


def fits(src_css, cssom_css):
    """Les propriétés de la règle source se retrouvent dans celles du CSSOM (raccourcis développés : border → border-*)."""
    om = props(cssom_css)
    return all(any(q == p or q.startswith(p + '-') for q in om) for p in props(src_css))


def rules(text):
    """[(début du sélecteur, '{', '}', sélecteur)] des règles sans bloc imbriqué."""
    out = []
    # commentaires masqués (même longueur) : leurs « ; », « { » et « } » ne comptent pas
    text = COMMENT.sub(lambda m: ' ' * len(m.group(0)), text)
    for m in re.finditer(r'\{', text):
        o = m.start()
        c = text.find('}', o)
        if c < 0 or '{' in text[o + 1:c]:
            continue
        # début du sélecteur : après le précédent « { », « } » ou « ; » (hors commentaires)
        s = max(text.rfind('}', 0, o), text.rfind('{', 0, o), text.rfind(';', 0, o)) + 1
        head = text[s:o]
        # commentaires en tête : sautés
        lead = re.match(r'(\s|/\*.*?\*/)*', head, re.S).end()
        out.append((s + lead, o, c, head[lead:]))
    return out


def merge(text, sel, css):
    """(texte, 'fusionnée' | 'renfort retiré' | None)."""
    want = norm(sel)
    rs = rules(text)
    cands = [i for i, (s, o, c, head) in enumerate(rs) if BUMP in head and norm(head) == want]
    # plusieurs règles renforcées au même sélecteur : celle dont les propriétés sont celles relevées
    cands = cands if len(cands) == 1 else [i for i in cands if fits(text[rs[i][1] + 1:rs[i][2]], css)]
    for i in cands[:1]:
        s, o, c, head = rs[i]
        if i and norm(rs[i - 1][3]) == want and BUMP not in rs[i - 1][3] and not text[rs[i - 1][2] + 1:s].strip():
            _, po, pc, _ = rs[i - 1]
            body = text[po + 1:pc]
            # indentation des déclarations et de l'accolade fermante de la règle précédente
            ind = re.search(r'\n([ \t]*)\S', body)
            ind = ind.group(1) if ind else '  '
            close = re.search(r'\n([ \t]*)$', body)
            # déclarations reprises telles quelles (commentaires « garder » compris), réindentées
            add = '\n'.join(ind + l.strip() for l in text[o + 1:c].strip().split('\n') if l.strip())
            kept = body.rstrip()
            kept = kept if kept.endswith(';') or not kept.strip() else kept + ';'
            new = kept + '\n' + add + '\n' + (close.group(1) if close else '')
            # la règle renforcée disparaît, avec le blanc qui la précède
            return text[:po + 1] + new + '}' + text[c + 1:], 'fusionnée'
        return text[:s] + text[s:o].replace(BUMP, '') + text[o:], 'renfort retiré'
    return text, None


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    check = '--check' in sys.argv
    entries = json.load(io.open(args[0], encoding='utf-8'))
    useless = [e for e in entries if e['seen'] and not e['diff'] and not e['stateConflict']]
    files, stats = {}, {}
    for e in useless:
        p = os.path.join(ROOT, e['src'])
        if p not in files:
            files[p] = io.open(p, encoding='utf-8', newline='').read()
        t, how = merge(files[p], e['sel'], e['css'])
        if how:
            files[p] = t
        stats.setdefault(e['src'], []).append(how or 'introuvable')
        if not how:
            print(f'  introuvable dans {e["src"]} : {e["sel"][:100]}')
    for p, t in files.items():
        if not check:
            io.open(p, 'w', encoding='utf-8', newline='').write(t)
    for src, hs in sorted(stats.items()):
        print(f'{src} : ' + ', '.join(f'{hs.count(h)} {h}' for h in sorted(set(hs))) + (' (essai)' if check else ''))


if __name__ == '__main__':
    main()
