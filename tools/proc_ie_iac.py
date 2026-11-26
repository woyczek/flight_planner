"""Published Irish ILS fix supplements and same-document missed coding.

No ILS minima, threshold location or unencoded entry/turn is invented. Initial and
final fixes join only on printed identity and coordinates; other joins keep a gap.
"""
import copy
import re

from proc_geometry import bearing_nm, review
from proc_layouts import parse_ei_coding, page_date


def coordinate(text):
    match = re.fullmatch(r'(\d{6}(?:\.\d+)?)\s*N\s*/?\s*(\d{7}(?:\.\d+)?)\s*W', text.strip())
    if not match:
        return None
    def deg(value, width):
        d, m, s = int(value[:width]), int(value[width:width+2]), float(value[width+2:])
        return d + m/60 + s/3600 if m < 60 and s < 60 else None
    lat, lon = deg(match[1], 2), deg(match[2], 3)
    if lat is None or lon is None or not 51 <= lat <= 56 or not 5 <= lon <= 11:
        return None
    return round(lat, 6), round(-lon, 6)


def read_final(rows, icao, file, cycle, page=1, known=None):
    rows = [' '.join(r.split()) for r in rows]
    if not re.fullmatch(r'EI[A-Z]{2}', icao) or not any(icao in r and 'AD 2.24' in r for r in rows[:4]):
        return None
    starts = [(i, re.search(r'^Dublin ILS\b.*?Approach RWY\s*(\d{2}\s*[LRC]?)$', r)) for i, r in enumerate(rows)]
    starts = [(i, m) for i, m in starts if m]
    if len(starts) != 1:
        return None
    start, title = starts[0]
    end = next((i for i in range(start+1, len(rows)) if 'MISSED APP' in rows[i]), len(rows))
    block = rows[start:end]
    slope = next((m for r in block for m in [re.fullmatch(r'Descent Angle:\s*(\d(?:\.\d+)?)\s*°?', r)] if m), None)
    if not slope or not 1 <= float(slope[1]) <= 6:
        return None
    k = next((i for i, r in enumerate(block) if r.startswith('Fix Coordinates')), None)
    if k is None:
        return None
    coord_text = block[k][len('Fix Coordinates'):].strip()
    if not coord_text and k and k+1 < len(block):
        # Measured 10L table: two latitude cells above the row label and the
        # corresponding longitude cells below it. Only this exact 2x2 form.
        lat = re.fullmatch(r'(\d(?:\s?\d){5}(?:\.\d+)?)\s*N\s+(\d(?:\s?\d){5}(?:\.\d+)?)\s*N', block[k-1])
        lon = re.fullmatch(r'(\d(?:\s?\d){6}(?:\.\d+)?)\s*W\s+(\d(?:\s?\d){6}(?:\.\d+)?)\s*W', block[k+1])
        if lat and lon:
            coord_text = ' '.join(re.sub(r'\s', '', a)+'N '+re.sub(r'\s', '', b)+'W' for a, b in zip(lat.groups(), lon.groups()))
    if block[k] != 'Fix Coordinates' and k+1 < len(block) and re.match(r'^\d{6}', block[k+1]):
        coord_text += ' '+block[k+1]
    pairs = re.findall(r'\d{6}(?:\.\d+)?\s*N\s*/?\s*\d{7}(?:\.\d+)?\s*W', coord_text)
    if re.sub(r'\s', '', re.sub(r'\d{6}(?:\.\d+)?\s*N\s*/?\s*\d{7}(?:\.\d+)?\s*W', '', coord_text)):
        return None
    positions = [coordinate(p) for p in pairs]
    if any(p is None for p in positions):
        return None
    head = ' '.join(block[:k])
    rw = title[1].replace(' ', '')
    if len(positions) == 4 and re.search(r'IF\s+FAF/\s*FAP\s+MAPt\s+TP', head):
        names = re.search(r'\bFix\s+([A-Z]{5})\s+([A-Z]{5})\s+([A-Z0-9]{3,7})\s+([A-Z]{5})\b', head)
        if not names:
            return None
        fixes = [dict(role=role, id=name, lat=p[0], lon=p[1]) for role, name, p in zip(['IF', 'FAF/FAP', 'MAPT', 'TP'], names.groups(), positions)]
    elif len(positions) == 5 and 'IF FAF/FAP SDF MAPt TP' in head:
        names = re.search(r'\bFix\s+((?:[A-Z0-9]{3,7}\s+){4}[A-Z0-9]{3,7})\b', head)
        if not names:
            return None
        fixes = [dict(role=role, id=name, lat=p[0], lon=p[1]) for role, name, p in zip(['IF', 'FAF/FAP', 'SDF', 'MAPT', 'TP'], names[1].split(), positions)]
    elif len(positions) == 2 and 'FAF MAPt' in head:
        names = re.findall(r'\(D\d+(?:\.\s*\d+)?\s+(?:THR|[A-Z]{2,5})\s*[-–—]\s*([A-Z0-9]{3,7})\s*\)', head)
        if len(names) not in (1, 2):
            return None
        fixes = [dict(role=role, id=names[0] if role == 'FAF' else names[1] if len(names) == 2 else 'MAPT'+rw, lat=p[0], lon=p[1])
                 for role, p in zip(['FAF', 'MAPT'], positions)]
    else:
        return None
    at = page_date(rows)
    if at and cycle != 'unknown' and at > cycle:
        return None
    missed = [t for t in parse_ei_coding(rows, known=known, include_missed=True)['tables'] if t['kind'] == 'MISSED' and t['runways'] == [rw]]
    return {'icao': icao, 'runway': rw, 'fixes': fixes, 'glide_path_deg': float(slope[1]),
            'source': {'file': file, 'cycle': cycle, 'at': at, 'page': page},
            'missed': missed[0]['legs'] if len(missed) == 1 else [],
            'scope': 'published-ILS-final-fixes; no minima or unencoded missed entry'}


def enrich(doc, rows, file, cycle, page=1, known=None):
    profile = read_final(rows, doc['icao'], file, cycle, page, known)
    if not profile:
        return 0
    profiles = doc.setdefault('approach_profiles', [])
    if not any(p['source'] == profile['source'] for p in profiles):
        profiles.append(profile)
    final = [p for p in profile['fixes'] if p['role'] not in ('TP', 'SDF')]
    # Printed final fixes must form a plausible straight axis; no curved join is inferred.
    courses = [bearing_nm((a['lat'], a['lon']), (b['lat'], b['lon']))[0] for a, b in zip(final, final[1:])]
    if not courses or any(abs((c - courses[0] + 180) % 360 - 180) > 1 for c in courses):
        return 0
    count = 0
    for record in doc['procedures']:
        if (record['kind'] != 'APP' or record['source']['file'] != file or record['source']['cycle'] != cycle
                or record['runways'] != [profile['runway']] or 'ILS' not in record['name'] or not record['points']):
            continue
        if (record.get('chart_data') or {}).get('scope') == 'ie-published-final-and-coded-missed':
            continue
        points = copy.deepcopy(record['points'])
        same = lambda a, b: a['id'] == b['id'] and abs(a['lat']-b['lat']) <= 0.000002 and abs(a['lon']-b['lon']) <= 0.000002
        connected = final[0]['role'] == 'IF' and same(points[-1], final[0])
        if final[0]['role'] == 'IF' and not connected:
            continue
        todo = final[1:] if connected else final
        for n, fix in enumerate(todo):
            point = {k: v for k, v in fix.items() if k != 'role'}
            point.update(seq=len(points)+1, leg='CF', alt=None, coords_from='same-document published final fix table', chart_role=fix['role'])
            if n == 0 and not connected:
                point['gap'] = True
            if fix['role'] == 'MAPT':
                point['vpa'] = -profile['glide_path_deg']
            points.append(point)
        missed = profile['missed']
        tp = next((p for p in profile['fixes'] if p['role'] == 'TP'), None)
        if tp and missed and not same(tp, missed[0]):
            missed = []
        for n, leg in enumerate(missed):
            p = {k: v for k, v in leg.items() if k not in ('remark', 'nav', 'seq')}
            if p.get('true') is not None:
                p['trk'] = p.pop('true')
            p.update(seq=len(points)+1, phase='missed')
            if n == 0:
                p['gap'] = True  # The table does not encode the MAPt-to-first-missed entry.
            points.append(p)
        record['points'] = points
        record['partial'] = {'read': ['coded-initial-path', 'published-final-fixes'] + (['coded-missed-legs'] if missed else []),
                             'unread': ['minima', 'final-altitude-constraints', 'ILS-MAPt-association'] + (['missed-entry-path'] if missed else ['missed-path'])
                                       + ([] if connected else ['initial-to-final-join']),
                             'note': 'Published fixes retained; unencoded connections remain gaps'}
        record['chart_data'] = {'scope': 'ie-published-final-and-coded-missed', 'profile': profile}
        doc.setdefault('warnings', []).extend(review(record))
        count += 1
    if count and profile['missed']:
        prefix = f'{file} p.{page}: '
        doc['warnings'] = [w for w in doc.get('warnings', []) if not
                           (w.startswith(prefix) and 'approche interrompue seule' in w
                            and re.search(r'\bILS\b.*\bRWY\s*' + profile['runway'] + r'\b', w))]
    return count
