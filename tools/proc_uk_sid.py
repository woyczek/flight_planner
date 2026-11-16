"""Les SID d'un aérodrome du Royaume-Uni lues par la COUCHE TEXTE de leurs cartes (SOG-0374, 16 nov. 2026) : de chaque SID, son POINT DE SORTIE, sa piste et la limite de niveau à ce point ; son tracé n'est PAS lu.

Les faits (lus sur les six cartes SID d'EGLL du paquet NATS AIRAC 2026-10-29, « AD 2.EGLL-6-1 » à « 6-6 ») : ce sont des cartes DESSINÉES dont les PDF portent une couche texte (~3 400 signes : étiquettes éparses, pas un tableau de tronçons ordonné) ; le titre de la carte (la page de l'aérodrome,
tools/uk_package.chart_index) dit ses désignateurs (« MODMI 1J 1K MAXIT 1F 1G » : le NOM est le point de sortie, « 1J » la révision et la piste : J = 09R, K = 09L, F = 27R, G = 27L à Heathrow) ; le texte de la carte porte, par SID, un paragraphe d'instructions qui finit par « Straight ahead to MODMI 1J », « to intercept MAXIT 1F » ou « Climb straight ahead to be established on UMLAT 1F »,
la piste (« Cross RWY 09R »), la limite de niveau au point de sortie (« 6000 at MODMI or above »), et les coordonnées des points (« 511401N 0002910W » puis le nom). Aucune table de codage de SID pour EGLL : « RNAV substitution only ».

Ce que le module rend : des procédures du schéma des fichiers de procédures (proc_records) au statut « check » et au champ `partial` : { read: [exit, runway, level], unread: [path] } — « point de sortie et niveaux ; tracé non lu, voir la carte ». UN point (le point de sortie, avec ses coordonnées quand la carte les porte et sa
limite de niveau) : le tracé entre la piste et ce point N'EST PAS inventé. Une SID dont la carte ne dit pas la piste ou le point de sortie n'est pas rendue. Entrée non fiable (un PDF d'un paquet posé par l'utilisateur) : bornes, aucun nom de fichier lu du texte. Bibliothèque standard seulement."""
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


def read_chart(text, title, icao):
    """Les SID d'UNE carte : ([procédures], [avertissements]). Le titre (index de la page de l'aérodrome) dit les désignateurs ; le texte de la carte, la piste et la limite de niveau de chacun."""
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
