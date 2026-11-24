"""Mise en forme lisible du code source (JavaScript, CSS, blocs <script> et <style> des pages HTML), sans changer le
code : seuls les blancs bougent. jsbeautifier / cssbeautifier (pip install jsbeautifier cssbeautifier).

Usage (à la racine du dépôt) :
    python tools/format_sources.py                 → tous les fichiers suivis concernés (liste ci-dessous)
    python tools/format_sources.py f1.js f2.html   → ces fichiers seulement
    python tools/format_sources.py --check …       → n'écrit rien, liste les fichiers qui changeraient

Garde (SOG-0628) : un script — .js, ou bloc <script> d'un .html — qui ne passe pas `node --check` APRÈS la mise en forme fait échouer la mise en forme de CE fichier : il reste tel quel, l'outil le dit
(« mise en forme REFUSÉE… », pour un script que la mise en forme casse comme pour un script DÉJÀ invalide : une mise en forme stable d'un script invalide cache l'erreur) et sort avec le code 1 ; sans node,
la garde n'a pas lieu et l'outil le dit.

Contrôle obligatoire après écriture : le script dépose les paires avant / après dans tools/_verify/pairs.json ;
ouvrir http://127.0.0.1:8767/tools/verify_format.html (dépôt servi : python -m http.server 8767 --bind 127.0.0.1) :
chaque JavaScript est analysé avant et après (acorn) et les arbres syntaxiques doivent être identiques (même code,
mêmes littéraux, pas de point-virgule implicite déplacé) ; chaque CSS est lu par le navigateur avant et après
(CSSStyleSheet) et les règles doivent être identiques. En cas d'écart : git checkout du fichier, et le signaler.

Hors champ : bibliothèques minifiées, fichiers générés (apps/planner/map_planner.html : relancer
tools/build_map_planner.py ; apps/cpco/mission_prompt.js : tools/build_mission_prompt.py ; apps/planner/perf_prompt.js : tools/build_perf_prompt.py ; section générée de
shared/block_icons.css : tools/build_skeuo_icons_css.py), données.
"""
import io, json, os, re, shutil, subprocess, sys, tempfile
import cssbeautifier, jsbeautifier

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
EXCLUS = re.compile(r'(\.min\.js$|^apps/aide/docs_bundle\.js$|/maplibre|/jspdf|^AircraftDB/|^data/|/carto/|^apps/planner/map_planner\.html$|^apps/cpco/mission_prompt\.js$|^apps/planner/perf_prompt\.js$|^tools/|^docs/)')

JS_OPTS = jsbeautifier.default_options()
JS_OPTS.indent_size = 2
JS_OPTS.preserve_newlines = True
JS_OPTS.max_preserve_newlines = 2
# lignes coupées au-delà de 140 caractères, hors chaînes et gabarits (protégés) : pas de JS « compressé » sur une ligne ;
# les appels [fr, en, de, es] passent à une langue par ligne
JS_OPTS.wrap_line_length = 140
JS_OPTS.brace_style = 'collapse'
JS_OPTS.templating = ['none']
JS_OPTS.end_with_newline = False

CSS_OPTS = cssbeautifier.default_options()
CSS_OPTS.indent_size = 2
CSS_OPTS.selector_separator_newline = True
CSS_OPTS.newline_between_rules = False
CSS_OPTS.preserve_newlines = True
CSS_OPTS.max_preserve_newlines = 2
CSS_OPTS.space_around_combinator = False
CSS_OPTS.end_with_newline = False

# section générée de block_icons.css (tools/build_skeuo_icons_css.py) : laissée telle quelle
GEN_DEBUT = "/* ==== JEUX D'ICÔNES SKEUOMORPHES"
GEN_FIN = '/* ==== fin des jeux skeuomorphes ==== */'
SCRIPT = re.compile(r'(<script\b(?![^>]*\bsrc=)([^>]*)>)(.*?)(</script>)', re.S | re.I)
STYLE = re.compile(r'(<style\b[^>]*>)(.*?)(</style>)', re.S | re.I)


def fichiers():
    """Fichiers suivis par git à mettre en forme : .js, .css et .html de shared/, apps/ et index.html, hors EXCLUS."""
    out = subprocess.run(['git', 'ls-files'], cwd=ROOT, capture_output=True, text=True, encoding='utf-8').stdout.split('\n')
    return [f for f in out if re.search(r'\.(js|css|html)$', f) and (f.startswith(('shared/', 'apps/')) or f == 'index.html') and not EXCLUS.search(f)]


PREV_VALUE = re.compile(r'[\w$)\]]$')   # avant « / » : une valeur → division, sinon expression régulière
MOTS = ('return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'yield', 'await', 'instanceof')


def templates(src):
    """Positions (début, fin) des gabarits `…` de premier niveau (leurs ${…} imbriqués compris), en sautant chaînes,
    commentaires et expressions régulières."""
    out, i, n = [], 0, len(src)

    def skip_string(i, q):
        """Position après la chaîne commençant en i (guillemet q), échappements compris."""
        i += 1
        while i < n and src[i] != q:
            i += 2 if src[i] == '\\' else 1
        return i + 1

    def skip_template(i):
        """Position après le gabarit `…` commençant en i, ses ${…} imbriqués compris."""
        i += 1
        while i < n and src[i] != '`':
            if src[i] == '\\':
                i += 2
            elif src.startswith('${', i):
                i = skip_code(i + 2, '}')
            else:
                i += 1
        return i + 1

    def skip_regex(i):
        """Position après l'expression régulière /…/ commençant en i, classes […] et drapeaux compris."""
        i += 1
        cls = False
        while i < n and (cls or src[i] != '/'):
            if src[i] == '\\':
                i += 1
            elif src[i] == '[':
                cls = True
            elif src[i] == ']':
                cls = False
            i += 1
        i += 1
        while i < n and (src[i].isalpha()):
            i += 1
        return i

    def skip_code(i, stop=None, top=False):
        """Parcourt le code depuis i jusqu'au fermant stop de même niveau (ou la fin) ; retourne la position qui le suit.
        top : niveau du fichier, les gabarits rencontrés sont relevés dans out. « / » : division après une valeur (sauf
        mot-clé de MOTS), expression régulière sinon."""
        depth, last = 0, ''
        while i < n:
            c = src[i]
            if src.startswith('//', i):
                j = src.find('\n', i)
                i = n if j < 0 else j
            elif src.startswith('/*', i):
                j = src.find('*/', i + 2)
                i = n if j < 0 else j + 2
            elif c in '"\'':
                i = skip_string(i, c)
                last = 'v'
            elif c == '`':
                j = skip_template(i)
                if top:
                    out.append((i, j))
                i, last = j, 'v'
            elif c == '/':
                w = re.search(r'([\w$]+)\s*$', src[max(0, i - 40):i])
                if last == 'v' and not (w and w.group(1) in MOTS):
                    i += 1
                    last = 'o'
                else:
                    i = skip_regex(i)
                    last = 'v'
            elif c in '{([':
                depth += 1
                i += 1
                last = 'o'
            elif c in '})]':
                if c == stop and depth == 0:
                    return i + 1
                depth -= 1
                i += 1
                last = 'v'
            elif c.isspace():
                i += 1
            else:
                last = 'v' if (c.isalnum() or c in '_$') else 'o'
                i += 1
        return i

    skip_code(0, top=True)
    return out


def js(src):
    """Mise en forme jusqu'à stabilité : avec la coupure des lignes longues, un passage de jsbeautifier décale encore
    l'indentation des suites de ligne au passage suivant ; trois passages au plus (le deuxième suffit en pratique), pour
    qu'une seule exécution de l'outil soit idempotente."""
    out = src
    for _ in range(3):
        nxt = js_once(out)
        if nxt == out:
            break
        out = nxt
    return out


def js_once(src):
    """jsbeautifier « protégé » : gabarits `…` masqués pendant la mise en forme (jsbeautifier reformate à tort le
    contenu des gabarits imbriqués), remis tels quels ensuite."""
    spans, parts, masque = templates(src), [], []
    k = 0
    for a, b in spans:
        parts.append(src[k:a])
        parts.append(f'__TPL{len(masque)}__')
        masque.append(src[a:b])
        k = b
    parts.append(src[k:])
    out = jsbeautifier.beautify(''.join(parts), JS_OPTS)
    return re.sub(r'__TPL(\d+)__', lambda m: masque[int(m.group(1))], out)


def css(src):
    """Feuille de style mise en forme (cssbeautifier, CSS_OPTS)."""
    return cssbeautifier.beautify(src, CSS_OPTS)


def trouver_node(which=shutil.which):
    """Le `node` à lancer, ou None. Jamais un résultat situé DANS le dépôt : sous Windows `shutil.which` cherche d'abord dans le dossier courant, qui est la racine du dépôt, et un `node.exe` ou `node.cmd`
    posé là par un commit serait exécuté (Sécurisation, SOG-0628)."""
    chemin = which('node')
    if not chemin:
        return None
    try:
        dedans = os.path.commonpath([os.path.abspath(chemin), os.path.abspath(ROOT)]) == os.path.abspath(ROOT)
    except ValueError:      # deux disques : forcément hors du dépôt
        dedans = False
    return None if dedans else chemin


NODE = trouver_node()
DELAI = 60   # secondes accordées à un `node --check` (un node qui se bloque ne bloque pas l'outil)


def syntaxe_ok(code):
    """Le JavaScript passe `node --check`, en module (celui d'un <script type="module"> ; les scripts du dépôt le passent tous) ou, à défaut, en script classique ; le même contrôle sert avant et après la
    mise en forme. None quand node est introuvable (la garde n'a pas lieu et l'outil le dit) ; 'delai' quand node n'a pas répondu en DELAI secondes."""
    if not NODE:
        return None
    with tempfile.TemporaryDirectory() as d:
        for ext in ('mjs', 'cjs'):
            f = os.path.join(d, 'script.' + ext)
            with open(f, 'w', encoding='utf-8', newline='') as w:
                w.write(code)
            try:
                if subprocess.run([NODE, '--check', f], capture_output=True, timeout=DELAI).returncode == 0:
                    return True
            except subprocess.TimeoutExpired:
                return 'delai'
    return False


GARDE = {'sans_node': False, 'refus': []}


def garde(nom, avant, apres):
    """SOG-0628 : un script qui ne passe pas `node --check` APRÈS la mise en forme fait ÉCHOUER la mise en forme de ce fichier (il reste tel quel, l'outil le dit) ; vrai si la mise en forme est sûre. Deux causes, dites
    à part : le script ne passe plus (la mise en forme l'a cassé), ou il ne passait DÉJÀ pas (une mise en forme stable d'un script invalide cache l'erreur : I5 reste vert, le banc plante)."""
    if avant == apres:
        return True
    ok = syntaxe_ok(apres)
    if ok is None:
        GARDE['sans_node'] = True
        return True
    if ok is True:
        return True
    if ok == 'delai':
        GARDE['refus'].append(f"{nom} : node --check n'a pas répondu en {DELAI} s (la garde ne peut pas conclure : le fichier n'est pas mis en forme)")
        return False
    avant_ok = syntaxe_ok(avant)
    GARDE['refus'].append(f"{nom} : le script ne passe plus node --check après la mise en forme" if avant_ok is True else f"{nom} : le script ne passait DÉJÀ pas node --check avant la mise en forme (il n'est pas mis en forme)")
    return False


def est_js(attrs):
    """Vrai si les attributs d'un <script> désignent du JavaScript (sans type, ou type JavaScript / module)."""
    m = re.search(r'\btype\s*=\s*["\']?([\w/+-]+)', attrs)
    return not m or m.group(1).lower() in ('text/javascript', 'module', 'application/javascript')


def mettre_en_forme(chemin, paires):
    """Met en forme un fichier .js, .css ou .html (blocs <script> et <style>), section générée de block_icons.css
    laissée telle quelle ; chaque bloc traité est ajouté à paires (avant / après) pour le contrôle.
    Retourne (nom relatif, nouveau texte ou None s'il ne change pas, fin de ligne du fichier)."""
    brut = open(chemin, 'rb').read().decode('utf-8')
    nl = '\r\n' if '\r\n' in brut else '\n'
    texte = brut.replace('\r\n', '\n')
    nom = os.path.relpath(chemin, ROOT).replace(os.sep, '/')
    if nom.endswith('.js'):
        neuf = js(texte)
        if not garde(nom, texte, neuf):
            return nom, None, nl
        paires.append({'nom': nom, 'type': 'js', 'avant': texte, 'apres': neuf})
    elif nom.endswith('.css'):
        if nom.endswith('block_icons.css') and GEN_DEBUT in texte:
            i = texte.index(GEN_DEBUT)
            j = texte.index(GEN_FIN, i) + len(GEN_FIN)
            neuf = css(texte[:i]).rstrip() + '\n' + texte[i:j] + '\n' + css(texte[j:].lstrip('\n'))
        else:
            neuf = css(texte)
        paires.append({'nom': nom, 'type': 'css', 'avant': texte, 'apres': neuf})
    elif nom.endswith('.html'):
        def sc(m):
            """Bloc <script> JavaScript non vide mis en forme ; autres blocs inchangés."""
            if not est_js(m.group(2)) or not m.group(3).strip():
                return m.group(0)
            corps = js(m.group(3).strip('\n'))
            if not garde(f'{nom} (script)', m.group(3).strip('\n'), corps):
                bad.append(nom)
                return m.group(0)
            paires.append({'nom': f'{nom} (script)', 'type': 'module' if 'module' in m.group(2) else 'js', 'avant': m.group(3), 'apres': corps})
            return f'{m.group(1)}\n{corps}\n{m.group(4)}'

        def st(m):
            """Bloc <style> non vide mis en forme."""
            if not m.group(2).strip():
                return m.group(0)
            corps = css(m.group(2).strip('\n'))
            paires.append({'nom': f'{nom} (style)', 'type': 'css', 'avant': m.group(2), 'apres': corps})
            return f'{m.group(1)}\n{corps}\n{m.group(3)}'
        bad = []
        neuf = STYLE.sub(st, SCRIPT.sub(sc, texte))
        if bad:   # un script ne passe plus : la mise en forme de CE fichier échoue, il reste tel quel (SOG-0628)
            return nom, None, nl
    else:
        neuf = texte  # SOG-0604 : une autre extension (.py, .md, .json…) n'est PAS du HTML : ses « <script>…</script> » sont des chaînes ou du texte, jamais un bloc à mettre en forme
    if not neuf.endswith('\n') and texte.endswith('\n'):
        neuf += '\n'
    return nom, (neuf if neuf != texte else None), nl


def main(args):
    """Met en forme les fichiers donnés (tous les fichiers concernés sans argument) et dépose les paires à contrôler ;
    --check : liste seulement les fichiers qui changeraient."""
    check = '--check' in args
    liste = [a for a in args if a != '--check'] or fichiers()
    # fichiers nommés hors champ (générés, minifiés, carto…) : laissés tels quels, même donnés en argument
    for f in [f for f in liste if EXCLUS.search(f.replace('\\', '/'))]:
        print(f'  laissé tel quel (hors champ) : {f}')
    liste = [f for f in liste if not EXCLUS.search(f.replace('\\', '/'))]
    # un fichier nommé d'une autre extension que .js, .css ou .html : laissé tel quel, et dit (SOG-0604 : un formateur ne change jamais la valeur d'une chaîne)
    for f in [f for f in liste if not f.replace('\\', '/').endswith(('.js', '.css', '.html'))]:
        print(f'  laissé tel quel (extension hors champ : .js, .css et .html seulement) : {f}')
    liste = [f for f in liste if f.replace('\\', '/').endswith(('.js', '.css', '.html'))]
    paires, changes = [], []
    for f in liste:
        nom, neuf, nl = mettre_en_forme(os.path.join(ROOT, f), paires)
        if neuf is None:
            continue
        changes.append(nom)
        if not check:
            open(os.path.join(ROOT, nom), 'wb').write(neuf.replace('\n', nl).encode('utf-8'))
    if not check:
        os.makedirs(os.path.join(ROOT, 'tools', '_verify'), exist_ok=True)
        json.dump(paires, open(os.path.join(ROOT, 'tools', '_verify', 'pairs.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    print(f'{len(changes)} fichier(s) {"à mettre" if check else "mis"} en forme ; {len(paires)} bloc(s) à contrôler.')
    for c in changes:
        print('  ' + c)
    if GARDE['sans_node']:
        print("  garde NON faite : node est introuvable hors du dépôt (node --check d'un script mis en forme)")
    for r in GARDE['refus']:
        print(f'  mise en forme REFUSÉE, le fichier reste tel quel : {r}')
    if GARDE['refus']:
        sys.exit(1)


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main(sys.argv[1:])
