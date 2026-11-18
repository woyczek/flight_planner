"""AIP de France, ENR 5.1 (zones interdites, réglementées et dangereuses) : lecture de la page de l'eAIP du SIA (SOG-0462, lot B, 18 nov. 2026).

La page `…/html/eAIP/FR-ENR-5.1-fr-FR.html` (6,7 Mo au cycle du 29 oct. 2026, 53 tableaux) range chaque zone en DEUX lignes de tableau :
  1. l'identification (« LF R 12 », « LF R 13 A1 ») et le nom usuel (« MONT SAINT MICHEL ») ;
  2. cinq cellules : limites latérales, limites verticales, horaires (« H24 », « Activity: MON-THU except HOL: 0700-2359… »), TYPE DE RESTRICTION
     = la NATURE DU DANGER (« Activités spécifiques Défense. Tirs et explosifs. Defence specific activities. Live firing and explosives. »),
     organisme et CONDITIONS DE PÉNÉTRATION (« Gestionnaire: BASEFUSCO … CAG/CAM: contournement obligatoire … »).
Textes TELS QUE le SIA les écrit (français puis anglais dans la même cellule), jamais traduits ni reformulés ; une cellule vide n'écrit rien.

La page est une entrée EXTERNE : taille bornée (MAX_PAGE), nombre de lignes et de zones bornés, chaque texte coupé (MAX_TEXT), aucune adresse ni chemin n'en est lu, aucune
balise n'est interprétée (le texte seul). Bibliothèque standard seulement.

  parse(octets) → { clé : { name, hours, nat, auth } } ; la clé est celle de l'AIXM : territoire + type + nom sans espaces (« LFR12 », « LFR13A1 »).
"""
import html.parser
import re

MAX_PAGE = 16 * 1024 * 1024          # la page fait 6,7 Mo
MAX_ROWS = 20000
MAX_ZONES = 6000
MAX_TEXT = 800
MAX_NAME = 80
IDENT = re.compile(r'([A-Z]{2}) ([A-Z]{1,4}) ([A-Z0-9][A-Z0-9 ./-]{0,30})\Z', re.A)


class _Rows(html.parser.HTMLParser):
    """Les lignes de tableau de la page, chacune une liste de cellules en texte (les espaces réduits) ; pas de tableau imbriqué attendu."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.rows = []
        self._row = None
        self._cell = None
        self._size = 0      # les signes déjà gardés dans la cellule (un compteur : la somme n'est pas recalculée à chaque morceau)

    def handle_starttag(self, tag, attrs):
        if tag == 'tr':
            self._row = []
        elif tag in ('td', 'th') and self._row is not None:
            self._cell = []
            self._size = 0
        elif tag == 'br' and self._cell is not None:
            self._cell.append(' ')

    def handle_endtag(self, tag):
        if tag in ('td', 'th') and self._row is not None and self._cell is not None:
            self._row.append(' '.join(''.join(self._cell).split()))
            self._cell = None
        elif tag == 'tr' and self._row is not None:
            if len(self.rows) < MAX_ROWS:
                self.rows.append(self._row)
            self._row = None

    def handle_data(self, data):
        if self._cell is not None and self._size < 4 * MAX_TEXT:
            self._cell.append(data)
            self._size += len(data)


def parse(page):
    """Les zones de l'ENR 5.1 d'une page (octets, UTF-8) : { clé : { name, hours, nat, auth } } ; seuls les champs que la page renseigne sont présents ; {} si rien ne se lit."""
    if not isinstance(page, (bytes, bytearray)) or len(page) > MAX_PAGE:
        raise ValueError('page ENR 5.1 trop grande ou illisible')
    p = _Rows()
    p.feed(bytes(page).decode('utf-8', 'replace'))
    p.close()
    out = {}
    rows = p.rows
    for n, row in enumerate(rows[:-1]):
        if len(row) != 2 or n + 1 >= len(rows):
            continue
        m = IDENT.fullmatch(row[0])
        data = rows[n + 1]
        if not m or len(data) != 5:
            continue
        key = m[1] + m[2] + re.sub(r'\s+', '', m[3])
        if key in out or len(out) >= MAX_ZONES:
            continue
        rec = {}
        if row[1]:
            rec['name'] = row[1][:MAX_NAME]
        for field, text in (('hours', data[2]), ('nat', data[3]), ('auth', data[4])):
            if text:
                rec[field] = text[:MAX_TEXT]
        out[key] = rec
    return out
