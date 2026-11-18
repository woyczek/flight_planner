"""Le paquet eAIP du Royaume-Uni (NATS, « AIRAC 11-2026 ») posé à la main : sa RECONNAISSANCE par son contenu, l'index des cartes d'un aérodrome et la recopie des seuls PDF utiles (SOG-0374, 16 nov. 2026).

Les faits (lus le 16 nov. 2026 sur le paquet de l'utilisateur, 2 766 fichiers, 881 Mo, sans AIXM) : <paquet>/html/eAIP/EG-AD-2.<OACI>-en-GB.html (une page par aérodrome : 116) et <paquet>/graphics/<numéro>.pdf (2 093 cartes) ; la page d'un aérodrome liste ses cartes dans des lignes de tableau, et son en-tête porte UNE balise <meta name="EM.effectiveDateStart" content="AAAA-MM-JJ"/> : la date d'entrée en vigueur du cycle (les autres balises EM.* sont vides, DC.date est la date de publication : jamais lues)
(« AD 2.EGLL-6-1 » = le lien vers ../../graphics/525824.pdf, avec son titre : « STANDARD DEPARTURE CHART - INSTRUMENT (SID) RWY 09R/L … »). Le paquet est un dossier extrait ; il se pose sous un dossier des Téléchargements, sous un ou deux niveaux de dossiers (« UK-AIRAC-11-26/AIRAC 11-2026/2026-10-29-AIRAC »).

Règles : jamais un chemin venu d'une page (un nom de PDF est ramené à des chiffres, un code d'aérodrome à quatre lettres) ; la recherche ne regarde que des NOMS de dossiers (jamais le contenu d'un fichier avant d'avoir reconnu le paquet par sa forme : html/eAIP/EG-AD-2.*-en-GB.html + graphics/),
sur trois niveaux, dans les seuls dossiers dont le nom évoque un AIP (airac, aip, nats, le mot uk), au plus MAX_TOTAL entrées au total, sans suivre ni lien symbolique ni jonction Windows (`_link` : os.path.isjunction, Python 3.12 et après ; ce poste a Python 3.14) ; le NOM du dossier de l'utilisateur ne sort jamais de ce module (la date en est lue : package_date, en repli de celle de la page de l'aérodrome : page_date) ; la page de l'aérodrome et chaque PDF sont lus sous un plafond de taille ; seuls les PDF d'UN aérodrome et d'UNE sorte (les cartes SID) sont recopiés, sous un nom canonique, dans le dossier que l'appelant donne (data/local/upload/ :
la lecture de PDF de pdf_guard n'ouvre rien d'autre). Bibliothèque standard seulement."""
import datetime
import html as htmllib
import os
import re

PAGE_MAX = 8 * 1024 * 1024            # la page d'EGLL fait 0,7 Mo
PDF_MAX = 4 * 1024 * 1024             # une carte SID fait 0,5 Mo
MAX_CHARTS = 12
MAX_DEPTH = 3
NAME_HINT = re.compile(r'airac|aip|nats|(?<![a-z])uk(?![a-z])', re.I)      # le MOT « uk » entier (jamais « duke »)
MAX_TOTAL = 3000                      # entrées parcourues au TOTAL par une recherche (tous dossiers, tous niveaux)
DATE_NAME = re.compile(r'(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)', re.A)
PAGE_DATE = re.compile(r'<meta\s+name\s*=\s*(["\'])EM\.effectiveDateStart\1\s+content\s*=\s*(["\'])(\d{4})-(\d{2})-(\d{2})\2', re.A)      # la balise de l'en-tête de la page, rien d'autre
MAX_ROWS = 20000
MAX_ROW = 20000
ROOT_ENTRIES = 20000                  # le dossier Téléchargements lui-même est souvent très peuplé : ses NOMS seuls sont regardés (comme base/cycle)
MAX_ENTRIES = 400                     # entrées regardées par dossier : un dossier plus peuplé n'est pas un niveau d'un paquet
ICAO = re.compile(r'E[A-Z]{3}\Z', re.A)      # le Royaume-Uni : EG…
PAGE = 'EG-AD-2.{}-en-GB.html'
LABEL = re.compile(r'AD 2\.(EG[A-Z]{2})-(\d{1,2})-(\d{1,2})\Z', re.A)
PDF_LINK = re.compile(r'(?:\.\./)*graphics/(\d{1,12})\.pdf\Z', re.A)
CANON = re.compile(r'ukpkg_(EG[A-Z]{2})_(\d{1,2})-(\d{1,2})\.pdf\Z', re.A)


def _link(path):
    """Un lien symbolique OU une jonction Windows (os.path.isjunction : Python 3.12 et après ; avant, le chemin réel est comparé au chemin donné)."""
    if os.path.islink(path):
        return True
    junction = getattr(os.path, 'isjunction', None)
    if junction is not None:
        return junction(path)
    try:
        return os.path.normcase(os.path.realpath(path)) != os.path.normcase(os.path.abspath(path))
    except OSError:
        return True


def _dirs(path, cap=MAX_ENTRIES, budget=None):
    """Les sous-dossiers (noms seuls, ni lien ni fichier) d'un dossier, au plus `cap` entrées regardées ; [] si illisible ou trop peuplé."""
    try:
        with os.scandir(path) as it:
            out = []
            for n, e in enumerate(it):
                if n >= cap:
                    return []
                if budget is not None:
                    budget[0] -= 1
                    if budget[0] < 0:
                        return []
                if e.is_dir(follow_symlinks=False) and not _link(e.path):
                    out.append(e.name)
            return sorted(out)
    except OSError:
        return []


def is_package(root):
    """Le dossier est-il la racine d'un paquet ? Sa FORME : html/eAIP/ qui porte des pages EG-AD-2.*-en-GB.html, et graphics/."""
    if not (os.path.isdir(os.path.join(root, 'graphics')) and os.path.isdir(os.path.join(root, 'html', 'eAIP'))) or any(_link(os.path.join(root, *p)) for p in (('graphics',), ('html',), ('html', 'eAIP'))):
        return False
    try:
        with os.scandir(os.path.join(root, 'html', 'eAIP')) as it:
            for n, e in enumerate(it):
                if n >= 5000:
                    return False
                if e.name.startswith('EG-AD-2.') and e.name.endswith('-en-GB.html') and e.is_file(follow_symlinks=False):
                    return True
    except OSError:
        return False
    return False


def _bounded_date(y, m, d, today):
    """La date AAAA-MM-JJ si (y, m, d) est une VRAIE date du calendrier, de 2000-01-01 à `today` inclus ; None sinon (jour impossible, futur, trop ancien). Ne rend que la chaîne ISO normalisée, bâtie sur trois entiers : jamais le texte lu."""
    try:
        day = datetime.date(int(y), int(m), int(d))
    except ValueError:
        return None
    return day.isoformat() if datetime.date(2000, 1, 1) <= day <= today else None


def package_date(root, today=None):
    """La date du paquet, lue dans le NOM de son dossier (« 2026-10-29-AIRAC ») : AAAA-MM-JJ si c'est une vraie date, de 2000 à aujourd'hui ; None sinon (aucune date, une date impossible ou du futur : « 2099-01-01 »). Jamais la date du jour à la place d'une date absente."""
    today = today or datetime.date.today()
    m = DATE_NAME.search(os.path.basename(str(root)))
    if not m:
        return None
    return _bounded_date(m.group(1), m.group(2), m.group(3), today)


def page_date(page, today=None):
    """La date d'entrée en vigueur lue dans la PAGE d'un aérodrome : la balise <meta name="EM.effectiveDateStart" content="AAAA-MM-JJ"/> de son en-tête (strictement cette forme, dans les 64 premiers Kio, la première occurrence). Une vraie date de 2000 à `today` ; None sinon (pas de balise, date impossible, du futur, chiffres d'une autre écriture). La page est une entrée non fiable : rien n'en sort que la chaîne ISO bâtie sur trois entiers, rien n'est journalisé, rien n'est un chemin. Les autres balises (EM.effectiveDateEnd, EM.AIRAC, DC.date) et les titres des paragraphes ne sont jamais lus."""
    today = today or datetime.date.today()
    m = PAGE_DATE.search(page[:65536]) if isinstance(page, str) else None
    return _bounded_date(m.group(3), m.group(4), m.group(5), today) if m else None


def find(folders, today=None):
    """Les paquets que les dossiers de l'utilisateur portent : [chemin de la racine], le plus RÉCENT (par la date de `package_date`, sans date d'abord) en dernier. Trois niveaux de dossiers au plus sous chacun, MAX_TOTAL entrées au total."""
    found = []
    budget = [MAX_TOTAL]

    def walk(path, depth):
        if is_package(path):
            found.append(path)
            return
        if depth >= MAX_DEPTH:
            return
        for n in _dirs(path, ROOT_ENTRIES if depth == 0 else MAX_ENTRIES, budget):
            if NAME_HINT.search(n):      # on ne descend que dans un dossier qui a l'air d'un paquet d'AIP : la reconnaissance est faite ensuite par la FORME (is_package)
                walk(os.path.join(path, n), depth + 1)
    for f in folders:
        if isinstance(f, str) and os.path.isdir(f) and not _link(f):
            walk(f, 0)
    return sorted(dict.fromkeys(found), key=lambda p: (package_date(p, today) or '', os.path.basename(p)))


def aerodrome_page(root, icao):
    """Le texte de la page d'un aérodrome du paquet (ValueError si le code n'est pas britannique, la page absente ou trop grosse)."""
    if not isinstance(icao, str) or not ICAO.match(icao) or not icao.startswith('EG'):
        raise ValueError(f'{icao!r} : pas un aérodrome du Royaume-Uni (EG…)')
    p = os.path.join(root, 'html', 'eAIP', PAGE.format(icao))
    if _link(p) or not os.path.isfile(p):
        raise ValueError(f'{icao} : pas de page dans ce paquet')
    if os.path.getsize(p) > PAGE_MAX:
        raise ValueError(f'{icao} : page trop grosse')
    with open(p, encoding='utf-8', errors='replace') as f:
        return f.read(PAGE_MAX + 1)


def _text(x):
    return re.sub(r'\s+', ' ', htmllib.unescape(re.sub(r'<[^>]+>', ' ', x))).strip()


def chart_index(page, icao):
    """Les cartes que la page de l'aérodrome liste : [{ label: « AD 2.EGLL-6-1 », part, number, pdf: « 525824 », title }] dans l'ordre de la page. Le titre est celui de la ligne qui PRÉCÈDE celle du lien (« STANDARD DEPARTURE CHART - INSTRUMENT (SID) … »)."""
    out, seen, previous = [], set(), ''
    for chunk in page.split('</tr>')[:MAX_ROWS]:      # un balayage linéaire (pas d'expression à retour arrière sur 8 Mo) : le texte de chaque ligne est ce qui suit son dernier « <tr »
        k = chunk.rfind('<tr')
        if k < 0:
            continue
        row = chunk[k:][:MAX_ROW]
        row = row[row.find('>') + 1:]
        link = re.search(r'<a[^>]*href="([^"]{1,200})"[^>]*>(.*?)</a>', row, flags=re.S)
        if not link:
            previous = _text(row)      # la ligne du TITRE précède celle du lien (« STANDARD DEPARTURE CHART … » puis « AD 2.EGLL-6-1 »)
            continue
        m = LABEL.fullmatch(_text(link.group(2)))
        h = PDF_LINK.fullmatch(link.group(1).replace(chr(92), '/'))
        if not m or not h or m.group(1) != icao or m.group(0) in seen:
            continue
        seen.add(m.group(0))
        out.append({'label': m.group(0), 'part': int(m.group(2)), 'number': int(m.group(3)), 'pdf': h.group(1), 'title': previous[:300]})
        if len(out) >= 400:
            break
    return out


def sid_charts(index):
    """Les cartes SID de l'index (« STANDARD DEPARTURE CHART - INSTRUMENT (SID) ») : les seules à recopier pour les départs."""
    return [c for c in index if 'STANDARD DEPARTURE CHART' in c['title'].upper() and '(SID)' in c['title'].upper()][:MAX_CHARTS]


def canonical(icao, chart):
    return f'ukpkg_{icao}_{chart["part"]}-{chart["number"]}.pdf'


def copy_charts(root, icao, charts, dest):
    """Recopie les PDF des cartes données dans `dest` sous leur nom canonique (ukpkg_EGLL_6-1.pdf) : ([noms posés], [refus dits]). Jamais un nom ni un chemin pris ailleurs que dans l'index (chiffres seulement) ;
    un PDF absent, lié, trop gros ou qui ne commence pas par « %PDF- » est un refus dit, les autres sont posés."""
    os.makedirs(dest, exist_ok=True)
    done, refused = [], []
    for c in charts[:MAX_CHARTS]:
        src = os.path.join(root, 'graphics', c['pdf'] + '.pdf')
        name = canonical(icao, c)
        if _link(src) or not os.path.isfile(src):
            refused.append(f'{c["label"]} : PDF absent du paquet')
            continue
        if os.path.getsize(src) > PDF_MAX:
            refused.append(f'{c["label"]} : PDF trop gros')
            continue
        with open(src, 'rb') as f:
            body = f.read(PDF_MAX + 1)
        if not body.startswith(b'%PDF-') or len(body) > PDF_MAX:
            refused.append(f'{c["label"]} : pas un PDF')
            continue
        target = os.path.join(dest, name)
        try:
            if os.path.isfile(target) and open(target, 'rb').read(PDF_MAX + 1) == body:
                done.append(name)
                continue
            tmp = target + '.part'
            with open(tmp, 'wb') as f:
                f.write(body)
            os.replace(tmp, target)
            done.append(name)
        except OSError as e:
            refused.append(f'{c["label"]} : {e.strerror or e}')
    return done, refused
