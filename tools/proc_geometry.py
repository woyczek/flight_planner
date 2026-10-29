"""Contrôle de géométrie et politique de doute des procédures lues (V3 § 10.26, § 10.29 (a)) : UNE définition pour tous les lecteurs (eAIP, EAD, OCR, lecture à la main).

Deux choses, rien d'autre :

  1. le contrôle d'un tronçon : le cap et la distance IMPRIMÉS contre ceux recalculés d'après les deux positions, avec une tolérance CHOISIE PAR CE QUE LA SOURCE IMPRIME
     (TOLERANCES : cap vrai → 0,25° et 0,2 NM, c'est aussi le cas de toute lecture OCR ; cap magnétique seul → 30° et 0,55 NM, le SIA et l'Allemagne ; ni cap ni distance :
     « non contrôlable », un avertissement, jamais un doute) ;
  2. la politique : une procédure qui échoue au contrôle ou aux garde-fous (sans nom, point répété hors attente, zigzag, lignes de la table non lues, positions
     manquantes) est GARDÉE dans le fichier avec `status: 'doubt'` et sa raison en CODE dans `doubt` (« geometry », « name »… ; plusieurs : séparés par une virgule, dans l'ordre
     où ils ont été posés) ; le lecteur ne la sert que sur demande (`{ doubt: true }`) et ne l'installe jamais comme sûre. Le texte humain ne sert que la console et les avertissements du
     fichier (`PHRASES`, `findings`) ; aucun lecteur ne refuse un terrain ni une table entière pour une procédure.

Les entrées sont des points de procédure au schéma commun (SPEC § 5 quinquies) : `leg`, `lat`, `lon`, `gap` (tronçon dont ce qui le sépare du précédent n'est pas codé), `crs`
(cap magnétique imprimé), `trk` (cap vrai imprimé : lectures OCR, EAD et à la main), `nm` (distance imprimée). Bibliothèque standard seulement, aucune dépendance aux lecteurs.
"""
import math

# tolérance (écart de cap en degrés, écart de distance en NM) selon ce que la source imprime : la donnée, pas des « si » éparpillés
TOLERANCES = {
    'true': (0.25, 0.2),            # cap vrai imprimé (UK, Irlande, Autriche, Belgique…) : la page est exacte à l'arrondi près ; toute lecture OCR passe ici
    'magnetic': (30.0, 0.55),       # cap magnétique seul (SIA, Allemagne) : la variation n'est pas dans la page, le cap n'attrape qu'une position fausse ; distance arrondie au dixième
}

# raisons d'une procédure douteuse, dans l'ordre où les lecteurs les posent ; « uncheckable » est un avertissement, jamais un doute
CODES = ('unread', 'name', 'repeat', 'zigzag', 'unresolved', 'geometry', 'uncheckable')
DOUBT_CODES = tuple(c for c in CODES if c != 'uncheckable')

# le texte de la console (le fichier ne porte que le code)
PHRASES = {
    'geometry': 'géométrie incohérente',
    'unresolved': 'positions non résolues',
    'uncheckable': 'géométrie non contrôlable (ni cap ni distance imprimés)',
    'name': 'sans nom',
    'repeat': 'point répété hors attente',
    'zigzag': 'zigzag',
    'unread': 'lignes de la table non lues',
}

DEFERRED, REQUIRED = 'deferred', 'required'     # positions : aerodb résout encore les points en route à la lecture (le contrôle les saute) ; ou elles doivent être là (« unresolved »)

HOLD_LEGS = {'HA', 'HF', 'HM', 'PI'}            # attentes et procédure d'inversion : le point y est revu à dessein
ZIGZAG_MAX = 3.0                                # longueur du parcours / distance directe du premier au dernier point positionné, au-delà : zigzag


def bearing_nm(a, b):
    """(cap vrai en degrés, distance en NM) du grand cercle de a à b, points (lat, lon) en degrés décimaux."""
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    y = math.sin(lo2 - lo1) * math.cos(la2)
    x = math.cos(la1) * math.sin(la2) - math.sin(la1) * math.cos(la2) * math.cos(lo2 - lo1)
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return (math.degrees(math.atan2(y, x)) + 360) % 360, 2 * 3440.065 * math.asin(math.sqrt(h))


# ----------------------------------------------------------------------------------------------------------- le contrôle d'un tronçon
def _true_of(leg):
    return leg.get('true') if leg.get('true') is not None else leg.get('trk')


def basis_of(x):
    """Ce que la source imprime : 'true' (un cap vrai), 'magnetic' (un cap magnétique ou une distance, sans cap vrai) ou None (ni cap ni distance : non contrôlable). `x` : un tronçon, ou une
    liste de tronçons / de points (le cap vrai d'un seul suffit : la source l'imprime)."""
    legs = x if isinstance(x, (list, tuple)) else [x]
    if any(_true_of(g) is not None for g in legs):
        return 'true'
    if any(g.get('crs') is not None or g.get('nm') is not None for g in legs):
        return 'magnetic'
    return None


def tolerance_of(x):
    """(écart de cap en degrés, écart de distance en NM) qui convient à ce que la source imprime (voir basis_of), ou None si elle n'imprime rien de comparable."""
    return TOLERANCES.get(basis_of(x))


def legs_of(points):
    """Les points d'une procédure au schéma commun, en tronçons comparables : un tronçon `gap` n'est pas comparé au précédent (ce qui l'en sépare n'est pas codé) ; `trk` devient `true`."""
    return [{'id': q.get('id'), 'leg': None if q.get('gap') else q.get('leg'), 'lat': q.get('lat'), 'lon': q.get('lon'), 'true': _true_of(q), 'crs': q.get('crs'), 'nm': q.get('nm')}
            for q in points]


def check_legs(legs):
    """Contrôle de cohérence d'une suite de tronçons : pour chaque tronçon TF dont les deux points sont positionnés, le cap et la distance imprimés doivent être ceux recalculés d'après les
    positions, à la tolérance de ce que le tronçon imprime (TOLERANCES). Rend { gaps: [écarts, en texte], compared: tronçons comparés, positioned: tronçons TF dont les deux points sont
    positionnés, unresolved: identifiants des points sans position sur un tronçon qui imprime un cap ou une distance }. Un tronçon sans cap ni distance n'est pas comparé."""
    gaps, unresolved, compared, positioned = [], [], 0, 0
    for a, b in zip(legs, legs[1:]):
        if b.get('leg') != 'TF':
            continue
        basis = basis_of(b)
        if None in (a.get('lat'), b.get('lat')):
            if basis:
                unresolved += [x['id'] for x in (a, b) if x.get('lat') is None and x.get('id') and x['id'] not in unresolved]
            continue
        positioned += 1
        if not basis:
            continue
        tol_deg, tol_nm = TOLERANCES[basis]
        brg, nm = bearing_nm((a['lat'], a['lon']), (b['lat'], b['lon']))
        compared += 1
        printed = _true_of(b) if basis == 'true' else b.get('crs')
        if printed is not None and abs((brg - printed + 180) % 360 - 180) > tol_deg:
            gaps.append(f'{a["id"]} → {b["id"]}: cap calculé {brg:.1f}° pour {printed}°' + (' imprimé' if basis == 'true' else ' magnétique imprimé'))
        if b.get('nm') is not None and abs(nm - b['nm']) > tol_nm:
            gaps.append(f'{a["id"]} → {b["id"]}: distance calculée {nm:.2f} NM pour {b["nm"]} imprimés')
    return {'gaps': gaps, 'compared': compared, 'positioned': positioned, 'unresolved': unresolved}


# ----------------------------------------------------------------------------------------------------------- les garde-fous d'une procédure
def repeated_points(proc):
    """Identifiants que la procédure repasse deux fois HORS ATTENTE : un point suivi d'un autre point, puis revu (non consécutif). Ne comptent pas : un tronçon d'attente ou d'inversion
    (HA, HF, HM, PI), le même point sur deux tronçons de suite (« TF PG825 » puis « FM PG825 »), un point de l'approche interrompue revu dans l'approche."""
    seen, out, prev = set(), [], None
    for q in proc.get('points', []):
        i = q.get('id')
        if q.get('leg') in HOLD_LEGS:
            prev = i or prev
            continue
        if i and i != prev:
            key = (q.get('phase') == 'missed', i)
            if key in seen and i not in out:
                out.append(i)
            seen.add(key)
        prev = i or prev
    return out


def zigzag_ratio(proc):
    """Longueur du parcours divisée par la distance directe du premier au dernier point (au moins 3 points positionnés ; le premier et le dernier point nommés de la procédure doivent l'être,
    sinon « premier au dernier positionné » prendrait pour fin un point du début ; l'approche interrompue d'une approche n'est pas comptée : elle revient vers le terrain) ; None si elle ne se
    mesure pas. Une procédure normale est de 1 à 2,5 ; un parcours de plusieurs procédures collées, ou un arc de séquencement lu comme route, fait des allers-retours."""
    named = [q for q in proc.get('points', []) if q.get('id') and q.get('phase') != 'missed']
    pts = [(q['lat'], q['lon']) for q in named if q.get('lat') is not None and q.get('lon') is not None]
    if len(pts) < 3 or not named or named[0].get('lat') is None or named[-1].get('lat') is None:
        return None
    path = sum(bearing_nm(a, b)[1] for a, b in zip(pts, pts[1:]))
    direct = bearing_nm(pts[0], pts[-1])[1]
    return path / max(direct, 1.0)


def guardrails(proc):
    """Les raisons, hors géométrie imprimée, pour lesquelles une procédure lue n'est pas installée comme sûre : [(code, texte)] dans l'ordre sans nom, point répété hors attente, zigzag ;
    vide = rien à dire. « name » vaut pour tous les types ; « repeat » et « zigzag » pour les SID et les STAR SEULEMENT : une approche boucle à dessein (via un VOR, un
    procedure turn, un RNP « via DUB » qui revient près de son point initial), son parcours n'est jamais un défaut. La raison est le TYPE de la procédure, pas la source : la règle est la même
    pour tous les lecteurs (eAIP, EAD, OCR). Les lignes de table non lues sont notées par le lecteur (code « unread »), la géométrie imprimée par `findings`."""
    out = []
    if '.NONAME.' in (proc.get('id') or ''):
        out.append(('name', PHRASES['name']))
    if proc.get('kind') == 'APP':
        return out
    rep_ids = repeated_points(proc)
    if rep_ids:
        out.append(('repeat', f'{PHRASES["repeat"]}: ' + ', '.join(rep_ids[:4])))
    z = zigzag_ratio(proc)
    if z is not None and z > ZIGZAG_MAX:
        out.append(('zigzag', f'{PHRASES["zigzag"]}: {z:.1f} × le trajet direct'.replace('.', ',')))
    return out


def findings(proc, positions=DEFERRED):
    """Tout ce que le contrôle trouve sur une procédure, sans la modifier : [(code, texte)] — les garde-fous (`guardrails`), puis la géométrie : positions manquantes (« unresolved »,
    seulement avec positions=REQUIRED : par défaut aerodb résout encore les points en route à la lecture, le contrôle les saute), écart imprimé / recalculé (« geometry », le premier écart
    seul est dit), ou « uncheckable » (des tronçons positionnés, aucun ne porte de cap ni de distance : un avertissement, jamais un doute)."""
    out = guardrails(proc)
    res = check_legs(legs_of(proc.get('points', [])))
    if res['unresolved'] and positions == REQUIRED:
        out.append(('unresolved', f'{PHRASES["unresolved"]}: ' + ', '.join(res['unresolved'][:4])))
    if res['gaps']:
        out.append(('geometry', f'{PHRASES["geometry"]}: ' + res['gaps'][0]))
    elif res['positioned'] and not res['compared'] and not res['unresolved']:
        out.append(('uncheckable', PHRASES['uncheckable']))
    return out


# ----------------------------------------------------------------------------------------------------------- la politique : un doute se marque, il ne retire rien
def codes_of(x):
    """Les codes de doute d'une procédure (ou de sa chaîne `doubt`), dans l'ordre où ils ont été posés ; [] si elle n'est pas douteuse."""
    d = x.get('doubt') if isinstance(x, dict) else x
    return [c for c in (d or '').split(',') if c]


def warning_of(proc, text):
    """La ligne d'avertissement du fichier pour une procédure à vérifier ; le lecteur y ajoute le fichier de la page (« x.pdf: … »)."""
    return f'{proc.get("id")} À VÉRIFIER, {text}'


def mark(proc, code, detail=None):
    """Passe la procédure au statut « doubt » (jamais retirée) en ajoutant le code à `doubt`. Rend la ligne d'avertissement, ou None si le code y était déjà (rien n'est dit deux fois)."""
    if code not in DOUBT_CODES:
        raise ValueError(f'code de doute inconnu : {code!r}')
    have = codes_of(proc)
    if code in have:
        return None
    proc['status'], proc['doubt'] = 'doubt', ','.join(have + [code])
    return warning_of(proc, detail or PHRASES[code])


def review(proc, positions=DEFERRED):
    """LA politique, pour un lecteur qui vient de construire une procédure : applique `findings`, marque les doutes, rend les lignes d'avertissement (doutes à vérifier et, en plus,
    l'avertissement « non contrôlable »). Le lecteur les ajoute à ses avertissements ; rappelée sur la même procédure, elle ne redit rien."""
    out = []
    for code, text in findings(proc, positions):
        if code == 'uncheckable':
            out.append(f'{proc.get("id")}: {text}')
        else:
            line = mark(proc, code, text)
            if line:
                out.append(line)
    return out


def doubt_codes(procs):
    """Un code par procédure douteuse (le premier posé), pour les comptes `stats.reasons` de la lecture."""
    return [(codes_of(p) or ['other'])[0] for p in procs if p.get('status') == 'doubt']


def phrase(code):
    """Le texte de console d'un code (inchangé s'il n'en est pas un : un motif de page reste une phrase jusqu'à ce que les pages portent des codes aussi)."""
    return PHRASES.get(code, code)
