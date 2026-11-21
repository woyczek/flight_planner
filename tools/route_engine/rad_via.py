"""RAD form B (SOG-0401, enlarged): the SEQUENCE of a « VIA (…) » group — « VIA (A DCT B) », « VIA (A L607 B) », « VIA (* DCT B) », « VIA ((A, B) DCT C) », « VIA (A (DCT, N869) B) » — read against the legs of the flight.

A group is a sequence NODE CONNECTOR NODE … (it starts and ends with a node): a node is a point, « * » (any point) or a list « (A, B) » of points; a connector is an airway, DCT, or a list « (DCT, N869) ». The sequence is true when the flight has consecutive points that match the nodes with, between two of them, the connector: DCT = ONE direct leg, an airway = one or more consecutive legs on that airway (a PORTION of the airway is enough). It is false when something it needs is not on the flight at all (a point, an airway, a direct leg). Anything else — every part is there but not in the order of the group, a point the base does not know, a text that does not read as a sequence — is None: the rule is left to review, never decided by a guess.

`read(spec)` → a list of (kind, options) or None ; `match(spec, legs, aliases, known)` → True / False / None.
"""
import re

MAX_ITEMS = 40
MAX_STEPS = 200000      # steps of one match (Security: a group with twenty « * » on a long airway)
AIRWAY = re.compile(r'[A-Z]{1,2}\d{1,4}[A-Z]?\Z')
POINT = re.compile(r'[A-Z][A-Z0-9]{1,6}\Z')


def _tokens(text):
    return re.findall(r'\(|\)|,|[A-Z0-9_*]+', text.upper())


def read(spec):
    """« (A L607 B) » → [('node', {'A'}), ('conn', {'L607'}), ('node', {'B'})], or None when the text is not a sequence this module reads (a list of points « (A, B, C) » is NOT a sequence: the caller reads it)."""
    toks = _tokens(spec)
    if len(toks) < 3 or toks[0] != '(' or toks[-1] != ')' or len(toks) > 4 * MAX_ITEMS:
        return None
    pos = [1]

    def alt():      # « ( x , y , z ) » inside a group → the set of words
        out = set()
        pos[0] += 1
        while pos[0] < len(toks):
            t = toks[pos[0]]
            if t == ')':
                pos[0] += 1
                return out if out else None
            if t in ('(', ','):
                if t == '(':
                    return None
                pos[0] += 1
                continue
            out.add(t)
            pos[0] += 1
        return None
    items = []
    while pos[0] < len(toks) - 1:
        t = toks[pos[0]]
        if t == '(':
            words = alt()
            if not words:
                return None
            items.append(words)
        elif t in (')', ','):
            return None      # a comma at the top level: a list of points, not a sequence
        else:
            items.append({t})
            pos[0] += 1
        if len(items) > MAX_ITEMS:
            return None
    if len(items) < 3 or len(items) % 2 == 0:
        return None
    out = []
    for n, words in enumerate(items):
        if n % 2 == 0:      # a node
            if ('*' in words and len(words) > 1) or any(w != '*' and (not POINT.fullmatch(w) or AIRWAY.fullmatch(w)) for w in words):
                return None      # « * » alone ; a point is not written like an airway (L607)
            out.append(('node', words))
        else:      # a connector
            if any(w != 'DCT' and not AIRWAY.fullmatch(w) for w in words):
                return None
            out.append(('conn', words))
    return out


def _flight(legs):
    """Nodes and edges of the flight : consecutive legs that chain (the end of one is the start of the next) ; None when they do not chain (the order of the flight is then not known)."""
    if not legs:
        return None
    nodes, edges = [legs[0]['start']['id']], []
    for leg in legs:
        if leg['start']['id'] != nodes[-1]:
            return None
        nodes.append(leg['end']['id'])
        edges.append(leg['via'])
    return nodes, edges


def match(spec, legs, aliases, known=None):
    """True / False / None for the group `spec` (the text between the parentheses of VIA, with them) against the legs of the flight ; `aliases(text)` the set of names of an airway (engine side)."""
    seq = read(spec)
    if seq is None:
        return None
    if known is not None and any(w != '*' and w not in known for kind, words in seq if kind == 'node' for w in words):
        return None      # a point the base does not know: not decided (the same rule as the lists of points)
    flight = _flight(legs)
    if flight is None:
        return None
    nodes, edges = flight
    names = [aliases(e) if e != 'DCT' else set() for e in edges]
    on_route = set(nodes)
    # absent from the flight : false (a node with none of its points, an airway used by no leg, a direct leg when there is none)
    for kind, words in seq:
        if kind == 'node' and '*' not in words and not (words & on_route):
            return False
        if kind == 'conn':
            if not any((w == 'DCT' and 'DCT' in edges) or (w != 'DCT' and any(w in n for n in names)) for w in words):
                return False

    failed = set()      # the pairs (node of the group, node of the flight) known not to match: the result depends on these two integers only, so the search costs at most (nodes of the group) x (nodes of the flight)^2
    steps = [0]

    class TooLong(Exception):
        pass

    def go(n, i):      # the node n of the sequence is at the node i of the flight
        if (n, i) in failed:
            return False
        steps[0] += 1
        if steps[0] > MAX_STEPS:
            raise TooLong      # the text of a rule is not trusted: never more than a moment, and then NOT DECIDED (never true or false)
        kind, words = seq[n]
        if '*' not in words and nodes[i] not in words:
            failed.add((n, i))
            return False
        if n == len(seq) - 1:
            return True
        cwords = seq[n + 1][1]
        wanted = cwords - {'DCT'}
        along = bool(wanted)      # every leg since the node i is on one of the airways of the connector
        for j in range(i + 1, len(nodes)):
            along = along and any(w in names[j - 1] for w in wanted)
            direct = 'DCT' in cwords and j == i + 1 and edges[i] == 'DCT'
            if (direct or along) and go(n + 2, j):
                return True
            if not along and j > i:
                break      # a direct leg is ONE leg; an airway stops at the first leg that is not on it
        failed.add((n, i))
        return False
    try:
        if any(go(0, i) for i in range(len(nodes))):
            return True
    except TooLong:
        return None
    return None

MAX_RUNS = 20      # SOG-0532 lot 3a : au plus ce nombre de passages d'une même suite sur le vol ; au-delà, le doute (None)


def runs(spec, legs, aliases, known=None):
    """SOG-0532 lot 3a (forme L1, « ABV FL245 AT (A UL607 B) ») : OÙ la suite `spec` est volée : [(i0, i1), …], les indices du PREMIER et du DERNIER point de chaque passage sur les points du vol (les points entre eux sont ceux du passage) ; [] quand la suite est ABSENTE du vol (ce qu'elle exige n'y est pas : la même règle que `match` pour False) ; None quand le sens n'est pas décidé (texte non lu, point inconnu de la base, tronçons qui ne s'enchaînent pas, tous les éléments présents mais pas dans l'ordre, trop de passages, trop long)."""
    seq = read(spec)
    if seq is None:
        return None
    if known is not None and any(w != '*' and w not in known for kind, words in seq if kind == 'node' for w in words):
        return None
    flight = _flight(legs)
    if flight is None:
        return None
    nodes, edges = flight
    names = [aliases(e) if e != 'DCT' else set() for e in edges]
    on_route = set(nodes)
    for kind, words in seq:
        if kind == 'node' and '*' not in words and not (words & on_route):
            return []
        if kind == 'conn':
            if not any((w == 'DCT' and 'DCT' in edges) or (w != 'DCT' and any(w in n for n in names)) for w in words):
                return []
    memo = {}      # (nœud du groupe, nœud du vol) -> les nœuds du vol où le groupe peut FINIR : le coût reste borné par (nœuds du groupe) x (nœuds du vol)^2
    steps = [0]

    class TooLong(Exception):
        pass

    def ends(n, i):
        if (n, i) in memo:
            return memo[(n, i)]
        steps[0] += 1
        if steps[0] > MAX_STEPS:
            raise TooLong
        kind, words = seq[n]
        if '*' not in words and nodes[i] not in words:
            memo[(n, i)] = frozenset()
            return memo[(n, i)]
        if n == len(seq) - 1:
            memo[(n, i)] = frozenset([i])
            return memo[(n, i)]
        cwords = seq[n + 1][1]
        wanted = cwords - {'DCT'}
        along = bool(wanted)
        out = set()
        for j in range(i + 1, len(nodes)):
            along = along and any(w in names[j - 1] for w in wanted)
            direct = 'DCT' in cwords and j == i + 1 and edges[i] == 'DCT'
            if direct or along:
                out |= ends(n + 2, j)
            if not along and j > i:
                break
        memo[(n, i)] = frozenset(out)
        return memo[(n, i)]
    try:
        found = sorted((i, j) for i in range(len(nodes)) for j in ends(0, i))
    except TooLong:
        return None
    return found if 0 < len(found) <= MAX_RUNS else None
