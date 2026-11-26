"""The Italian (ENAV) and Spanish (ENAIRE) readers of procedure pages, cut out of proc_layouts.py (SOG-0678: a file of code over 1 500 lines is cut, by family of layout).

Pure functions of the rows of a page, moved WITHOUT any change of behaviour; `proc_layouts` imports them (and keeps their names: `proc_layouts.parse_it_app`
and `proc_layouts.parse_es_prose`, the entries of `LAYOUTS` and the cases read them there). The helpers of the tables (`_tab_alt`, `_tab_value`,
`TAB_NOMATCH`, `PATH_TERMINATORS`) stay in proc_layouts and are imported AT THE CALL of each reader, so that the two modules never import each other at load.
"""
import re


def parse_it_app(rows):
    """ENAV named approach tables: transitions and missed approach, never the unprinted final.

    Rejoin the printed true course continuation. Fixed columns are required; an unsupported
    cell rejects its block with a reason instead of silently returning zero tables.
    """
    from proc_layouts import PATH_TERMINATORS, TAB_NOMATCH, _tab_alt, _tab_value      # the helpers of the tables stay in proc_layouts (which imports this module: the import is made at the call, never at the load)
    title = next((r for r in rows if re.search(r'(?i)^(?:ILS|LOC|RNP|VOR|NDB).*RWY\s*\d{2}', r)), '')
    runway = re.search(r'RWY\s*(\d{2}[LRC]?)', title, re.I)
    if not runway:
        return {'kind': 'APP', 'tables': [], 'warnings': ['ENAV: approach title/runway not read, table NON retenue']}
    legs, warnings, missed, active, pending = [], [], False, True, None
    for raw in rows:
        line = ' '.join(raw.split())
        if 'MISSED APPROACH' in line.upper():
            missed, active = True, True
        elif 'TRANSITION' in line.upper():
            active = True
        if re.search(r'(?i)WAYPOINT\s+(?:HOLDING|LIST)', line):
            active = False
        if not active:
            continue
        if re.fullmatch(r'\(\s*[\d .]+\s*\)', line) and pending is not None:
            try:
                true = float(re.sub(r'[()\s]', '', line))
                if not 0 <= true <= 360:
                    raise ValueError('true course')
                legs[pending]['true'] = true
            except ValueError:
                warnings.append(f'ENAV {title}: invalid true course, table NON retenue')
            continue
        if not re.match(r'^\d{3}\s+(?:' + '|'.join(sorted(PATH_TERMINATORS)) + r')\s+', line):
            continue
        line = re.sub(r'(?<=\d)\s*\(\d+\)', '', line)
        line = re.sub(r'@\s*(\d)\s*(\d)\s*(\d)', r'@\1\2\3', line)
        line = re.sub(r'\s+(?:RNAV|RNP)\s*[\d.]+(?:/RNP[\d.]+)?(?:\(\d+\))?\s*$', '', line)
        tokens = line.replace('°', '').split()
        if len(tokens) != 11:
            warnings.append(f'ENAV {title}: cells not recognised ({raw[:90]}), table NON retenue')
            continue
        seq, leg, ident, over, crs, var, nm, turn, alt, speed, vpa = tokens
        try:
            altitude = _tab_alt(alt)
            if altitude is TAB_NOMATCH or over not in ('Y', 'N', '-') or turn not in ('L', 'R', '-'):
                raise ValueError('altitude, fly-over or turn')
            course = None if crs == '-' else float(crs)
            if course is not None and not 0 <= course <= 360:
                raise ValueError('course')
            exact = re.fullmatch(r'@(\d{2,3})', speed)
            limit = _tab_value('spd', speed, False) if not exact else None
            if limit is TAB_NOMATCH:
                raise ValueError('speed')
            point = {'id': None if ident == '-' else ident, 'leg': leg, 'seq': len(legs) + 1,
                     'lat': None, 'lon': None, 'alt': altitude, 'over': True if over == 'Y' else None,
                     'crs': course, 'true': None, 'nm': None if nm == '-' else float(nm),
                     'turn': None if turn == '-' else turn, 'kt': limit, 'remark': ''}
            if ident != '-' and not re.fullmatch(r'[A-Z0-9]{2,7}', ident):
                raise ValueError('waypoint')
            if point['nm'] is not None and not 0 < point['nm'] <= 300:
                raise ValueError('distance')
            if limit is not None and not 10 <= limit <= 600:
                raise ValueError('speed')
            if exact:
                point['speed'] = {'type': 'at', 'kt': int(exact.group(1))}
            if vpa != '-':
                point['vpa'] = float(vpa)
            if missed:
                point['phase'] = 'missed'
                if not any(x.get('phase') == 'missed' for x in legs):
                    point['gap'] = True
            legs.append(point)
            pending = len(legs) - 1
        except ValueError as e:
            warnings.append(f'ENAV {title}: {e} ({raw[:90]}), table NON retenue')
    if warnings or not legs:
        return {'kind': 'APP', 'tables': [], 'warnings': warnings or [f'ENAV {title}: no readable legs, table NON retenue']}
    notes = [r for r in rows if re.match(r'^\(\s*\d+\s*\)', r)]
    read = ['approach-transition'] + (['missed-transition'] if any(p.get('phase') == 'missed' for p in legs) else [])
    table = {'title': title, 'kind': 'APP', 'name': title.split('–')[0].strip(),
             'runways': [runway.group(1)], 'transition': None, 'legs': legs,
             'chart_data': {'notes': notes},
             'partial': {'read': read, 'unread': ['final-path'],
                         'note': 'RNAV transitions read; ILS/LOC final is on the chart, not in this coding table'}}
    return {'kind': 'APP', 'tables': [table], 'warnings': []}


def parse_es_prose(rows):
    """ENAIRE conventional SID descriptions: name, runway and exit constraints only.

    Bilingual prose and DME arcs are not coded legs. Retain the excerpt and mark the path
    unread, using the same one-point partial contract as the conventional UK SIDs.
    """
    from proc_layouts import PATH_TERMINATORS, TAB_NOMATCH, _tab_alt, _tab_value      # the helpers of the tables stay in proc_layouts (which imports this module: the import is made at the call, never at the load)
    headers = []
    runway = None
    for i, row in enumerate(rows):
        rw = re.search(r'\bPISTA\s+(\d{2}[LRC]?)\b', row)
        if rw:
            runway = rw[1]
        m = re.match(r'^SALIDA\s+[A-ZÁÉÍÓÚÑ ]+\s+\(([A-Z]{3,5})(\d[A-Z])\)', row)
        if m and runway:
            headers.append((i, m[1], m[2], runway))
    tables = []
    for n, (i, exit_name, rev, rw) in enumerate(headers):
        end = headers[n+1][0] if n+1 < len(headers) else len(rows)
        excerpt = ' '.join(rows[i:end])[:12000]
        pattern = r'\b' + exit_name + r'(?:\s+\(IAF\s+[A-Z]{4}\))?\s+a\s+(FL\d{2,3}|\d{3,5})\s*(?:ft)?\s+o\s+(superior|inferior)\b'
        constraint = re.search(pattern, excerpt, re.I)
        if not constraint:
            english = r'\b' + exit_name + r'(?:\s+\(IAF\s+[A-Z]{4}\))?\s+at\s+(FL\d{2,3}|\d{3,5})\s*(?:ft)?\s+or\s+(above|below)\b'
            constraint = re.search(english, excerpt, re.I)
        alt = None
        if constraint:
            value = constraint[1].upper()
            alt = {'type': 'min' if constraint[2].lower() in ('superior', 'above') else 'max',
                   'ft': int(value[2:])*100 if value.startswith('FL') else int(value)}
        name = exit_name + ' ' + rev
        tables.append({'title': name, 'kind': 'SID', 'name': name, 'runways': [rw], 'transition': None,
                       'legs': [{'seq': 1, 'id': exit_name, 'leg': 'IF', 'lat': None, 'lon': None,
                                 'alt': alt, 'kt': None, 'crs': None, 'nm': None, 'over': None, 'remark': ''}],
                       'chart_data': {'bilingual_excerpt': excerpt},
                       'partial': {'read': ['exit', 'runway'] + (['level'] if alt else []), 'unread': ['path'],
                                   'note': 'Conventional SID: exit and printed exit level only; DME arcs and path not reconstructed'}})
    return {'kind': 'SID', 'tables': tables, 'warnings': [] if tables else ['ENAIRE: no SID block with a runway, table NON retenue']}
