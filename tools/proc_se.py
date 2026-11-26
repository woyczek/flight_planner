"""Measured LFV SID/STAR ARINC tables; coordinates come from source waypoint lists."""
import re


def detect(rows):
    text = ' '.join(rows).lower()
    return all(word in text for word in ('waypoint', 'navaid', 'specification', 'rest alts')) and ('sid instruction' in text or 'star instruction' in text)


def parse(rows, kind_hint=None):
    from proc_layouts import PATH_TERMINATORS, alt_ft
    text = ' '.join(rows)
    kind = 'SID' if 'SID instruction' in text else 'STAR' if 'STAR instruction' in text else kind_hint
    title = re.compile(r'^([A-Z]{3,6}|[A-Z] [A-Z]{4})\s+(\d[A-Z])(?:\s+\(.*\))?$')
    course = r'(?:\d{3}(?:\.\d+)?°\s*\(\d{3}(?:\.\d+)?°(?:T)?\)|-)'
    row_re = re.compile(r'^(?P<leg>[A-Z]{2})\s+(?P<id>[A-Z][A-Z0-9]{1,5}|-)\s+(?P<over>Y|N|-)\s+'
                        r'(?P<course>'+course+r')\s+(?P<nm>\d+(?:\.\d+)?|-)\s+(?P<turn>L|R|-)\s+'
                        r'(?P<alt>[+-]?\s*(?:FL)?\d{3,5}|-)\s+(?P<speed>[+-]?\s*\d{2,3}|-)\s+'
                        r'(?P<vpa>-|[+-]?\d(?:\.\d+)?/\d{1,3})\s+(?P<nav>[A-Z]{2,4}|-)\s+RNAV\s*1$')
    tables, warnings, blocks = [], [], []
    current = None
    for line in rows:
        match = title.fullmatch(line)
        if match:
            current = {'name': match[1].replace(' ', '') + ' ' + match[2], 'rows': [], 'lost': []}
            blocks.append(current)
            continue
        if current is not None and re.match(r'^(?:'+'|'.join(sorted(PATH_TERMINATORS))+r')\s', line):
            match = row_re.fullmatch(line)
            if match:
                current['rows'].append(match.groupdict())
            else:
                current['lost'].append(line)
    for block in blocks:
        if block['lost']:
            warnings.append(block['name'] + ': NON retenue: ' + str(len(block['lost'])) + ' unread coding row(s)')
            continue
        if not block['rows']:
            continue
        legs, unsigned = [], []
        for row in block['rows']:
            ident = None if row['id'] == '-' else row['id']
            values = re.findall(r'\d+(?:\.\d+)?', row['course'])
            altitude, speed = row['alt'].replace(' ', ''), row['speed'].replace(' ', '')
            level = alt_ft(altitude.lstrip('+-'))
            alt = None if level is None else {'type': 'min' if altitude.startswith('+') else 'max' if altitude.startswith('-') else 'at', 'ft': level}
            limit, semantics = None, None
            if speed != '-':
                value = int(speed.lstrip('+-'))
                if not 50 <= value <= 400:
                    unsigned.append(ident)
                elif speed[0] in '+-':
                    limit, semantics = value, 'min' if speed[0] == '+' else 'max'
                elif ident and re.search(re.escape(ident)+r'\s*\([^)]{0,120}?max IAS\s*'+str(value)+r'\s*kt', text, re.I):
                    limit, semantics = value, 'max'
                else:
                    unsigned.append(ident)
            leg = {'leg': row['leg'], 'id': ident, 'lat': None, 'lon': None, 'alt': alt,
                   'over': row['over'] == 'Y', 'crs': float(values[0]) if values else None,
                   'true': float(values[1]) if values else None,
                   'nm': float(row['nm']) if row['nm'] != '-' else None,
                   'kt': limit, 'turn': row['turn'] if row['turn'] != '-' else None, 'remark': ''}
            if semantics:
                leg['speed'] = {'type': semantics, 'kt': limit}
            if row['vpa'] != '-':
                leg['vpa'] = -abs(float(row['vpa'].split('/')[0]))
            legs.append(leg)
        unread = ['prose-only-operating-conditions']
        if unsigned:
            unread.append('unsigned-speed-semantics')
        tables.append({'kind': kind, 'name': block['name'], 'title': block['name'], 'transition': None,
                       'runways': [], 'legs': legs,
                       'partial': {'read': ['native-arinc-legs', 'signed-constraints'], 'unread': unread},
                       'chart_data': {'scope': 'se-native-coding', 'source_instructions': [r for r in rows if 'instruction' in r or 'climb gradient' in r or 'jet traffic' in r],
                                      'unsigned_speed_points': unsigned}})
    return {'kind': kind, 'tables': tables, 'warnings': warnings}
