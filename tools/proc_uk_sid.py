"""Les SID d'un aérodrome du Royaume-Uni lues par la COUCHE TEXTE de leurs cartes (SOG-0374, 16 nov. 2026) : de chaque SID, son POINT DE SORTIE, sa piste et la limite de niveau à ce point ; son tracé n'est PAS lu.

Les faits (lus sur les six cartes SID d'EGLL du paquet NATS AIRAC 2026-10-29, « AD 2.EGLL-6-1 » à « 6-6 ») : ce sont des cartes DESSINÉES dont les PDF portent une couche texte (~3 400 signes : étiquettes éparses, pas un tableau de tronçons ordonné) ; le titre de la carte (la page de l'aérodrome,
tools/uk_package.chart_index) dit ses désignateurs (« MODMI 1J 1K MAXIT 1F 1G » : le NOM est le point de sortie, « 1J » la révision et la piste : J = 09R, K = 09L, F = 27R, G = 27L à Heathrow) ; le texte de la carte porte, par SID, un paragraphe d'instructions qui finit par « Straight ahead to MODMI 1J », « to intercept MAXIT 1F » ou « Climb straight ahead to be established on UMLAT 1F »,
la piste (« Cross RWY 09R »), la limite de niveau au point de sortie (« 6000 at MODMI or above »), et les coordonnées des points (« 511401N 0002910W » puis le nom). Aucune table de codage de SID pour EGLL : « RNAV substitution only ».

Ce que le module rend : des procédures du schéma des fichiers de procédures (proc_records) au statut « check » et au champ `partial` : { read: [exit, runway, level], unread: [path] } — « point de sortie et niveaux ; tracé non lu, voir la carte ». UN point (le point de sortie, avec ses coordonnées quand la carte les porte et sa
limite de niveau) : le tracé entre la piste et ce point N'EST PAS inventé. Une SID dont la carte ne dit pas la piste ou le point de sortie n'est pas rendue. Entrée non fiable (un PDF d'un paquet posé par l'utilisateur) : bornes, aucun nom de fichier lu du texte. Bibliothèque standard seulement.

Cartes conventionnelles et RNAV1 (SOG-0499, EGGW, décision du relais du 18 nov. 2026) : la plupart des terrains n'ont pas le titre à désignateurs d'EGLL. La page aplatie (sans colonnes) porte d'abord
les fragments du DESSIN (espaces, étiquettes de balises avec leur coordonnée, légendes de tronçons, nombres isolés, « ° »), puis le TEXTE des procédures, puis « GENERAL INFORMATION » (notes numérotées),
puis le cartouche (fréquences, « TRANSITION ALTITUDE », « AERO INFO DATE », titre, numéro de carte en dernier) ; des fragments du dessin reviennent aussi après les notes. Chaque SID y est un BLOC :
une ligne qui COMMENCE par son identifiant « NOM nL » (nom parfois coupé sur deux lignes à l'impression, recousu), la PISTE en tête de la ligne SUIVANTE (« RWY nn … » : la piste précède le texte qui
continue), des phrases (« Climb straight ahead… turn left to intercept <balise> R031… Cross <balise> NDB at <niveau>… ») qui finissent sur le POINT DE SORTIE (« … to <POINT>. ») ; deux colonnes
de texte s'entrelacent ligne à ligne (une restriction d'une autre colonne finit une ligne). Les cartes RNAV1 listent les coordonnées de leurs points dans « ADDITIONAL RNAV DATA » / « WAYPOINTS »
(« <POINT> : ddmmss.ssN dddmmss.ssW ») ; les conventionnelles les portent dans les étiquettes du dessin. read_blocks lit ces blocs PAR MOTIFS seulement (jamais par la place d'une ligne),
après avoir écarté par leur forme les lignes de bruit (nombres seuls, texte imprimé deux fois, ligne « CHANGE ( »), et rend la MÊME fiche partielle (point de sortie, piste, niveau ; tracé non lu,
statut « check ») ; un point dont la carte ne donne pas la position reste sans lat/lon (aerodb le résout dans sa base ou marque un doute) ; rien n'est inventé."""
import re

MAX_TEXT = 60000
TITLE_NAME = re.compile(r'\b([A-Z]{3,5})((?: \d[A-Z])+)', re.A)
SKIP = {'RWY', 'RNAV', 'ICAO', 'SID', 'NAV'}
RUNWAY = re.compile(r'RWY\s+(\d{2}[LRC]?)\b', re.A)
COORD = re.compile(r'(\d{6})([NS])\s*(\d{7})([EW])', re.A)


def designators(title):
    """Les SID que dit le titre d'une carte : [{ name: « MODMI 1J », exit: « MODMI », rev: « 1J » }] (« MODMI 1J 1K MAXIT 1F 1G (RNAV SUBSTITUTION ONLY) » : quatre). Le titre est lu jusqu'à « (RNAV » : les mots de pistes ne sont pas des noms."""
    head = str(title or '')[:400]
    head = head[:head.upper().index('(RNAV')] if '(RNAV' in head.upper() else head
    head = re.sub(r'RWY \d{2}[LRC]?(?:/[LRC])?', ' ', head)
    out, seen = [], set()
    for m in TITLE_NAME.finditer(head):
        exit_name = m.group(1)
        if exit_name in SKIP:
            continue
        for rev in m.group(2).split():
            d = f'{exit_name} {rev}'
            if d not in seen:
                seen.add(d)
                out.append({'name': d, 'exit': exit_name, 'rev': rev})
    return out[:40]


def _deg(digits, hemi, width):
    d, rest = int(digits[:width]), digits[width:]
    v = d + int(rest[:2]) / 60 + (int(rest[2:4]) / 3600 if len(rest) >= 4 else 0)
    return -v if hemi in 'SW' else v


def position(text, name):
    """La position du point `name` d'après les étiquettes de la carte : la coordonnée la plus proche de son nom (au plus 70 signes), avant ou après ; None si la carte n'en porte pas. Une coordonnée d'étiquette de balise (« 512930N 0011311W CPT 114.35 ») ou de point (« 511401N 0002910W » puis « MODMI »)."""
    best = None
    for m in re.finditer(r'(?<![A-Z0-9])' + re.escape(name) + r'(?![A-Z0-9])', text):
        for c in COORD.finditer(text, max(0, m.start() - 70), min(len(text), m.end() + 70)):
            gap = min(abs(c.start() - m.end()), abs(m.start() - c.end()))
            lat, lon = _deg(c.group(1), c.group(2), 2), _deg(c.group(3), c.group(4), 3)
            if 49 <= lat <= 61 and -9 <= lon <= 3 and (best is None or gap < best[0]):
                best = (gap, round(lat, 6), round(lon, 6))
    return (best[1], best[2]) if best else None


def _read_titled(text, title, icao):
    """Les SID d'UNE carte de la forme d'EGLL (« RNAV substitution ») : ([procédures], [avertissements]). Le titre (index de la page de l'aérodrome) dit les désignateurs ; le texte de la carte, la piste et la limite de niveau de chacun.
    Inchangée depuis SOG-0374 ; read_chart l'appelle d'abord puis complète par la lecture par blocs (read_blocks)."""
    text = str(text or '')[:MAX_TEXT]
    flat = re.sub(r'\s+', ' ', text)
    out, warnings = [], []
    for d in designators(title):
        end = None
        for m in re.finditer(r'\b(?:to|on)\s+(?:intercept\s+|be established on\s+)?' + re.escape(d['exit']) + r'\s+' + re.escape(d['rev']) + r'\b', flat):
            end = m
        if end is None:
            warnings.append(f'{d["name"]}: le paragraphe d’instructions de la carte ne se retrouve pas (SID non lue)')
            continue
        window = flat[max(0, end.start() - 700):end.start()]
        runways = RUNWAY.findall(window)
        if not runways:
            warnings.append(f'{d["name"]}: piste non lue dans la carte (SID non lue)')
            continue
        runway = runways[-1]
        lvl = re.findall(r'(\d{4,5})\s+at\s+' + re.escape(d['exit']) + r'\b', window, re.A)
        point = {'seq': 1, 'id': d['exit'], 'leg': 'TF'}
        pos = position(text, d['exit'])
        if pos:
            point.update(lat=pos[0], lon=pos[1])
        read = ['exit', 'runway']
        if lvl:
            point['alt'] = {'type': 'min', 'ft': int(lvl[-1])}
            read.append('level')
        else:
            warnings.append(f'{d["name"]}: limite de niveau au point de sortie non lue')
        out.append({'id': f'{icao}.SID.{re.sub("[^A-Z0-9]", "", d["name"])}.RW{runway}', 'icao': icao, 'kind': 'SID', 'name': d['name'], 'runways': [runway], 'transition': d['exit'], 'points': [point],
                    'partial': {'read': read, 'unread': ['path'], 'note': 'point de sortie et niveaux ; tracé non lu, voir la carte'}, 'status': 'check'})
    return out, warnings


# --- Cartes conventionnelles et RNAV1 (SOG-0499) : la lecture par BLOCS -------------------------------------------------------------------------------------------
BLOCK_HEAD = re.compile(r'([A-Z]{3,5}) (\d[A-Z])\b', re.A)                 # tête de bloc, ancrée en tête de ligne par .match : « VAXOP 2K Climb straight ahead… »
BEACON_WORDS = {'VOR', 'NDB', 'DME', 'ILS', 'SID', 'RWY'}                    # mots de balise ou de piste : jamais un nom de SID
RUNWAY_HEAD = re.compile(r'RWY (\d{2}[LRC]?)\b', re.A)                      # la piste du bloc, en TÊTE de la ligne qui suit l'identifiant (.match)
NOISE_LINE = re.compile(r'[\d°.\-()\s]*', re.A)                             # un fragment du dessin fait seulement de chiffres, de « ° », de points, de tirets, de parenthèses
PART_LINE = re.compile(r'[A-Z]{2,5}', re.A)                                 # une ligne qui n'est qu'un morceau de nom coupé à l'impression (« VAX » puis « OP 2K … »)
POINT_NAME = re.compile(r'[A-Z]{3,5}|[A-Z]{2,3}\d{2}', re.A)                 # un nom de point : « VAXOP », « ZIB », « ZQ20 » ; « ZQ201 » n'en est pas un (3 chiffres)
RUNWAY_NAME = re.compile(r'\d{2}[LRC]?', re.A)
EXIT_END = re.compile(r'\b(?:to|direct) ([A-Z]{2,5}\d{0,2})\.(?=\s|$)', re.A)  # « … left to VAXOP. » : le point qui FINIT une phrase
WAYPOINT_LINE = re.compile(r'([A-Z][A-Z0-9]{1,4})\s*:\s*(\d{6}(?:\.\d{1,3})?)([NS])\s*(\d{7}(?:\.\d{1,3})?)([EW])', re.A)
BLOCK_STOP = ('GENERAL INFORMATION', 'ADDITIONAL RNAV DATA', 'WAYPOINTS', 'TRANSITION ALTITUDE', 'AERO INFO DATE', 'BEARINGS', 'ALTITUDES AND')
BLOCK_LINES = 12                                                             # un bloc compte au plus 12 lignes (l'identifiant compris)
MAX_BLOCKS = 40
MAX_LINES = 4000
MAX_LINE = 400
LEVEL_MAX = 60000


def _deg2(digits, hemi, width):
    """Une coordonnée « ddmmss.ss » (latitude, width = 2) ou « dddmmss.ss » (longitude, width = 3) en degrés décimaux signés (S et W négatifs), secondes décimales admises ;
    None quand les minutes ou les secondes sortent de [0, 60) : une coordonnée mal lue n'est jamais corrigée, elle est laissée."""
    whole, _, frac = digits.partition('.')
    try:
        d, m = int(whole[:width]), int(whole[width:width + 2])
        s = float(whole[width + 2:width + 4] + ('.' + frac if frac else ''))
    except ValueError:
        return None
    if m >= 60 or s >= 60:
        return None
    v = d + m / 60 + s / 3600
    return -v if hemi in 'SW' else v


def _is_noise(line):
    """Vrai pour une ligne du DESSIN que la lecture par blocs écarte, par sa forme seulement (jamais par sa place) : vide ou de moins de 3 signes (« ° »), faite seulement de chiffres et de ponctuation
    (« 081 », « 13.5 », « (211°) »), imprimée deux fois (« R999R999 », « SFCSFC » : deux moitiés égales), ou ligne de changement d'amendement (« CHANGE (11/26): … », pas une règle)."""
    if len(line) < 3 or NOISE_LINE.fullmatch(line) or line.startswith('CHANGE ('):
        return True
    half = len(line) // 2
    return len(line) % 2 == 0 and ' ' not in line and line[:half] == line[half:]


def _lines(text):
    """Les lignes utiles d'une page aplatie : chaque ligne nettoyée (espaces resserrés, bornée à MAX_LINE signes), les lignes de bruit écartées (_is_noise), et un nom COUPÉ recousu :
    une ligne qui n'est que 2 à 5 majuscules (« VAX ») suivie d'une ligne qui, collée à elle, commence par un identifiant (« OP 2K Climb… » → « VAXOP 2K Climb… ») ; la couture est bornée à DEUX lignes."""
    raw = [re.sub(r'\s+', ' ', x).strip()[:MAX_LINE] for x in str(text or '')[:MAX_TEXT].split('\n')[:MAX_LINES]]
    raw = [x for x in raw if PART_LINE.fullmatch(x) or not _is_noise(x)]      # un morceau de nom de 2 lettres (« RO ») est gardé pour la couture
    out, i = [], 0
    while i < len(raw):
        line = raw[i]
        if PART_LINE.fullmatch(line) and i + 1 < len(raw) and not BLOCK_HEAD.match(raw[i + 1]):
            joined = line + raw[i + 1]
            if BLOCK_HEAD.match(joined):
                out.append(joined)
                i += 2
                continue
        out.append(line)
        i += 1
    return out


def _head(line):
    """L'identifiant d'une tête de bloc (« VAXOP 2K ») ou None : nom de 3 à 5 lettres en tête de ligne, révision chiffre + lettre ; ni un mot réservé (SKIP) ni un mot de balise."""
    m = BLOCK_HEAD.match(line)
    if not m or m.group(1) in SKIP or m.group(1) in BEACON_WORDS:
        return None
    return m.group(1), m.group(2)


def _blocks(lines):
    """Les blocs de procédure d'une page : [(nom, révision, [lignes])], chaque bloc = sa ligne d'identifiant et les lignes qui la suivent, jusqu'à la tête suivante, une section
    (« GENERAL INFORMATION », « ADDITIONAL RNAV DATA », « WAYPOINTS ») ou une ligne du cartouche (« TRANSITION ALTITUDE », « AERO INFO DATE », …), au plus BLOCK_LINES lignes."""
    out = []
    for i, line in enumerate(lines):
        head = _head(line)
        if not head:
            continue
        body = [line]
        for nxt in lines[i + 1:i + BLOCK_LINES]:
            if _head(nxt) or nxt.startswith(BLOCK_STOP):
                break
            body.append(nxt)
        out.append((head[0], head[1], body))
        if len(out) >= MAX_BLOCKS:
            break
    return out


def _exit(body, head_name):
    """Le point de sortie d'un bloc : le point qui finit une phrase (« … to VAXOP. », « … left to DEBOK. », « direct ZQ20. ») — le DERNIER de ces points, sauf quand le nom de la tête
    du bloc en est un (la SID porte au Royaume-Uni le nom de son point de sortie) ; une phrase intercalée d'une autre colonne (« Wexcombe or Pellow Down. ») ne finit pas sur « to <point> » et n'est pas lue.
    None quand aucune phrase ne finit sur un nom de point valide."""
    flat = ' '.join(body)
    names = [m.group(1) for m in EXIT_END.finditer(flat) if POINT_NAME.fullmatch(m.group(1)) and m.group(1) not in BEACON_WORDS and m.group(1) not in SKIP]
    if not names:
        return None
    return head_name if head_name in names else names[-1]


def _level(flat, name):
    """La limite de niveau (en pieds) AU point de sortie, dite par la phrase : « Cross VAXOP (VOR|NDB) at 6000 », « 6000 or above to VAXOP », « 6000 at VAXOP », « to VAXOP at 6000 » ;
    un niveau « (AAL) » ou un niveau à un AUTRE point n'en est pas un ; None hors de [0, LEVEL_MAX] ou quand la phrase n'en dit pas."""
    n = re.escape(name)
    for pat in (r'\bCross ' + n + r'(?: VOR| NDB| DME)? at (\d{4,5})\b', r'\b(\d{4,5}) (?:or above )?(?:at|to) ' + n + r'\b', r'\bto ' + n + r' at (\d{4,5})\b'):
        m = re.search(pat, flat, re.A)
        if m and 0 <= int(m.group(1)) <= LEVEL_MAX:
            return int(m.group(1))
    return None


def _waypoint(lines, name):
    """La position du point `name` dans la section « WAYPOINTS » (après « ADDITIONAL RNAV DATA ») d'une carte RNAV1 : « VAXOP : 514530.75N 0004015.50W », secondes décimales admises ;
    None quand la carte n'a pas cette section, ne liste pas ce point ou que la coordonnée sort des bornes du Royaume-Uni (49 à 61 N, 9 W à 3 E)."""
    start = next((i for i, x in enumerate(lines) if x.startswith(('WAYPOINTS', 'ADDITIONAL RNAV DATA'))), None)
    if start is None:
        return None
    for line in lines[start:]:
        m = WAYPOINT_LINE.match(line)
        if not m or m.group(1) != name:
            continue
        lat, lon = _deg2(m.group(2), m.group(3), 2), _deg2(m.group(4), m.group(5), 3)
        if lat is not None and lon is not None and 49 <= lat <= 61 and -9 <= lon <= 3:
            return round(lat, 6), round(lon, 6)
    return None


def read_blocks(text, icao):
    """Les SID d'une carte de la forme CONVENTIONNELLE ou RNAV1 (SOG-0499, EGGW) : ([procédures], [avertissements]). Lecture par MOTIFS seulement, ligne à ligne : bloc ouvert par
    l'identifiant en tête de ligne (_blocks), piste en tête de la ligne suivante (RUNWAY_HEAD), point de sortie qui finit la phrase (_exit), niveau à ce point (_level), position par la section
    WAYPOINTS (_waypoint) puis par les étiquettes du dessin (position) — sinon aucune position (aerodb résout le nom dans sa base ou marque un doute). Même fiche partielle que les SID d'EGLL ;
    une même SID (nom, piste) n'est rendue qu'une fois ; un avertissement par SID non lue, seulement si ce nom n'est lu par aucun autre bloc (une étiquette du dessin « VAXOP 2K » n'en donne pas)."""
    text = str(text or '')[:MAX_TEXT]
    lines = _lines(text)
    out, seen, why = [], set(), {}
    for name, rev, body in _blocks(lines):
        sid = f'{name} {rev}'
        runway = next((m.group(1) for m in (RUNWAY_HEAD.match(x) for x in body[1:]) if m), None)
        if not runway or not RUNWAY_NAME.fullmatch(runway):
            why.setdefault(sid, f'{sid}: piste non lue dans la carte (SID non lue)')
            continue
        exit_name = _exit(body, name)
        if not exit_name:
            why.setdefault(sid, f'{sid}: point de sortie non lu dans la carte (SID non lue)')
            continue
        if (sid, runway) in seen:
            continue
        seen.add((sid, runway))
        point = {'seq': 1, 'id': exit_name, 'leg': 'TF'}
        pos = _waypoint(lines, exit_name) or position(text, exit_name)
        if pos:
            point.update(lat=pos[0], lon=pos[1])
        read = ['exit', 'runway']
        lvl = _level(' '.join(body), exit_name)
        if lvl is not None:
            point['alt'] = {'type': 'min', 'ft': lvl}
            read.append('level')
        else:
            why[sid + '#level'] = f'{sid}: limite de niveau au point de sortie non lue'
        out.append({'id': f'{icao}.SID.{re.sub("[^A-Z0-9]", "", sid)}.RW{runway}', 'icao': icao, 'kind': 'SID', 'name': sid, 'runways': [runway], 'transition': exit_name, 'points': [point],
                    'partial': {'read': read, 'unread': ['path'], 'note': 'point de sortie et niveaux ; tracé non lu, voir la carte'}, 'status': 'check'})
    done = {p['name'] for p in out}
    warnings = [w for k, w in why.items() if k.endswith('#level') or k not in done]
    return out, warnings


def read_chart(text, title, icao):
    """Les SID d'UNE carte : ([procédures], [avertissements]). D'abord la forme d'EGLL (_read_titled : désignateurs du titre, paragraphe « to <SORTIE> <RÉV> »), puis la forme par blocs
    (read_blocks, SOG-0499) qui ajoute les SID dont le NOM n'a pas été lu par la première ; l'avertissement de la première pour un désignateur que les blocs ont lu est retiré. Une carte qui
    ne donne aucune SID et aucun avertissement (la carte « 6-1 » de contexte) donne un seul avertissement : « aucune SID reconnue sur la carte »."""
    out, warnings = _read_titled(text, title, icao)
    names = {p['name'] for p in out}
    more, why = read_blocks(text, icao)
    more = [p for p in more if p['name'] not in names]
    read = {p['name'] for p in more}
    warnings = [w for w in warnings if w.split(':', 1)[0] not in read] + [w for w in why if w.split(':', 1)[0] not in names]
    out += more
    if not out and not warnings:
        warnings.append('aucune SID reconnue sur la carte')
    return out, warnings
