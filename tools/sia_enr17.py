"""AIP de France, ENR 1.7.5 « Tableau des niveaux de croisière » : lecture de la page de l'eAIP du SIA (SOG-0530, 21 nov. 2026).

La page `…/html/eAIP/FR-ENR-1.7-fr-FR.html` (178 Ko au cycle du 29 oct. 2026) porte DEUX tableaux de niveaux, que l'utilisateur a désignés comme la source (Q-0130) :
  1. « En dessous du FL195 pour toutes les règles de vol » : la route MAGNÉTIQUE 000°–179° et 180°–359°, pour chacune les vols IFR et les vols VFR ; une ligne = 12 cellules
     = quatre triplets (niveau de vol, altitude en m, altitude en ft) : IFR 000–179, VFR 000–179, IFR 180–359, VFR 180–359 (un « — » ou une cellule vide : pas de niveau) ;
  2. « Dans la région supérieure de contrôle (UTA) : 195 < FL < 660 » : la route magnétique 090°–269° et 270°–089° (IFR) ; une ligne = deux triplets (8 cellules, ou 12 à partir du FL410).
Au-dessus de l'UTA les mêmes règles de parité s'appliquent (la page le dit) ; le tableau finit par « etc. » : ce qui n'est PAS écrit n'est pas prolongé ici.

La page est une entrée EXTERNE : taille bornée, nombre de lignes borné, rien n'est lu d'autre que des nombres ; chaque niveau est CONTRÔLÉ par la colonne des pieds (le niveau × 100 = l'altitude écrite) et par sa série
(impairs / pairs, VFR décalés de 5) : une page qui ne se présente pas exactement ainsi n'est PAS lue (ValueError, la mise en page a changé) ; jamais une table devinée. Bibliothèque standard seulement.

  parse(octets) → { lower: { ifr: [a, b], vfr: [a, b] }, upper: [a, b] } : des listes de niveaux de vol (centaines de pieds, croissantes) ; a = routes 000–179° (en dessous du FL195) ou 090–269° (UTA), b = l'autre moitié.
"""
import re

from sia_enr51 import _Rows      # les lignes d'un tableau en texte (même lecteur que l'ENR 5.1 : le texte seul, aucune balise interprétée)

MAX_PAGE = 4 * 1024 * 1024
MARK_LOWER = 'De 000° à 179°'
MARK_UPPER = 'De 090° à 269°'
FL = re.compile(r'\d{2,3}\Z', re.A)
NUM = re.compile(r'\d{1,3}(?: \d{3})*\Z', re.A)


def _triple(cells, where):
    """(niveau, ) d'un triplet de cellules (niveau de vol, mètres, pieds) ; None quand le triplet est vide (« — » ou rien) ; ValueError quand il est écrit de travers."""
    texts = [c.replace('\xa0', ' ').strip() for c in cells]
    if all(t in ('', '—', '-') for t in texts):
        return None
    if not (FL.match(texts[0]) and NUM.match(texts[1]) and NUM.match(texts[2])):
        raise ValueError(f'ENR 1.7.5 : un triplet de niveau ne se lit pas ({where})')
    level, feet = int(texts[0]), int(texts[2].replace(' ', ''))
    if feet != level * 100:
        raise ValueError(f'ENR 1.7.5 : le niveau {level} et ses pieds {feet} ne concordent pas ({where})')
    return level


def _series(levels, step, mod, where):
    """Les niveaux d'une série : croissants, sans doublon, de la forme voulue (modulo) ; ValueError sinon."""
    if len(levels) < 5 or levels != sorted(set(levels)):
        raise ValueError(f'ENR 1.7.5 : série de niveaux trop courte ou désordonnée ({where})')
    if any(not 10 <= x <= 660 or x % step != mod % step for x in levels):
        raise ValueError(f'ENR 1.7.5 : un niveau n’est pas de la série attendue ({where})')
    return levels


def parse(page):
    """Les niveaux de croisière de l'ENR 1.7.5 d'une page (octets, UTF-8) ; ValueError quand la page n'a pas la forme attendue."""
    if not isinstance(page, (bytes, bytearray)) or len(page) > MAX_PAGE:
        raise ValueError('page ENR 1.7 trop grande ou illisible')
    p = _Rows()
    p.feed(bytes(page).decode('utf-8', 'replace'))
    p.close()
    rows = p.rows
    start_low = [n for n, r in enumerate(rows) if any(c.startswith(MARK_LOWER) for c in r)]
    start_up = [n for n, r in enumerate(rows) if any(c.startswith(MARK_UPPER) for c in r)]
    if len(start_low) != 1 or len(start_up) != 1 or start_low[0] > start_up[0]:
        raise ValueError('ENR 1.7.5 : les deux tableaux de niveaux sont introuvables (mise en page changée ?)')
    lower = {'ifr': [[], []], 'vfr': [[], []]}
    for n in range(start_low[0] + 1, start_up[0]):
        r = rows[n]
        if len(r) == 12 and FL.match(r[0].strip()):
            for slot, (kind, half) in enumerate((('ifr', 0), ('vfr', 0), ('ifr', 1), ('vfr', 1))):
                level = _triple(r[3 * slot:3 * slot + 3], f'ligne {n}')
                if level is not None:
                    lower[kind][half].append(level)
    upper = [[], []]
    for n in range(start_up[0] + 1, min(len(rows), start_up[0] + 60)):
        r = rows[n]
        if r and r[0].strip().lower().startswith('etc'):
            break
        if len(r) not in (8, 12) or not FL.match(r[0].strip() or 'x'):
            if len(r) in (8, 12) and r[0].strip() == '' and any(FL.match(c.strip()) for c in r):
                pass      # la première ligne : le premier groupe est vide, le second porte le niveau
            else:
                continue
        first = _triple(r[0:3], f'ligne {n}')
        second = _triple(r[4:7] if len(r) == 8 else r[6:9], f'ligne {n}')
        if first is not None:
            upper[0].append(first)
        if second is not None:
            upper[1].append(second)
    # les séries : IFR 000–179 : FL impairs (10, 30 … 190) ; 180–359 : pairs (20 … 180) ; VFR 000–179 : 35, 55 … 195 ; 180–359 : 45, 65 … 185 ; UTA : 090–269 : 210, 230 … puis de 40 en 40 ; 270–089 : 200, 220 … puis de 40 en 40
    out = {'lower': {'ifr': [_series(lower['ifr'][0], 20, 10, 'IFR 000-179'), _series(lower['ifr'][1], 20, 0, 'IFR 180-359')],
                     'vfr': [_series(lower['vfr'][0], 20, 15, 'VFR 000-179'), _series(lower['vfr'][1], 20, 5, 'VFR 180-359')]},
           'upper': [_series([x for x in upper[0] if x <= 400], 20, 10, 'UTA 090-269') + [x for x in upper[0] if x > 400], _series([x for x in upper[1] if x <= 400], 20, 0, 'UTA 270-089') + [x for x in upper[1] if x > 400]]}
    for half in out['upper']:      # la queue au-dessus du FL400 : bornée (≤ FL660), croissante, sans doublon, au plus 60 niveaux (revue de Sécurisation), comme les séries
        tail = [x for x in half if x > 400]
        if tail != sorted(set(tail)) or any(x > 660 for x in tail) or len(half) > 60:
            raise ValueError('ENR 1.7.5 : les niveaux au-dessus du FL400 sont hors des bornes ou désordonnés')
    if any(x % 40 != 10 for x in out['upper'][0] if x > 400) or any(x % 40 != 30 for x in out['upper'][1] if x > 400):
        raise ValueError('ENR 1.7.5 : les niveaux au-dessus du FL400 ne suivent pas la série attendue')
    if out['lower']['ifr'][0][0] != 10 or out['lower']['ifr'][0][-1] != 190 or out['lower']['ifr'][1][-1] != 180 or out['upper'][0][0] != 210 or out['upper'][1][0] != 200:
        raise ValueError('ENR 1.7.5 : les bornes des tableaux ne sont pas celles attendues')
    return out
