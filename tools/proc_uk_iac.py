"""Read the measured UK ILS profile template, keeping unknown manoeuvres explicitly partial.

No PDF library here. Positions on the final are derived from AD 2.12's published threshold
and true runway axis only when the chart explicitly zero-ranges its DME to that threshold.
The initial procedure turn and the missed-approach turn are never reconstructed from labels.
"""
import re
from datetime import date

from proc_arc import destination


def read_profile(rows, icao, file, cycle):
    """Native UK profile facts; no diagram-derived fix/turn association or minima."""
    text = ' '.join(' '.join(rows).split())[:200000]
    if (not re.fullmatch(r'EG[A-Z]{2}', icao) or 'INSTRUMENT APPROACH CHART' not in text[:350]
            or not re.search(r'\bILS(?:/|\s*\()', text[:500])):
        return None
    rw = re.search(r'\bRWY\s+(\d{2}[LRC]?)\b', text[:900])
    source = re.search(r'\bAD\s+2-' + icao + r'-8-\d+\b', text)
    dated = re.search(r'AERO INFO DATE\s+(\d{2})\s+([A-Z]{3})\s+(\d{2})\b', text)
    if not rw or not source or not dated:
        return None
    try:
        months = 'JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC'.split()
        at = date(2000 + int(dated[3]), months.index(dated[2]) + 1, int(dated[1]))
        if at > date.fromisoformat(cycle):
            return None
    except ValueError:
        return None
    locals_ = set(re.findall(r'\b(I-[A-Z]{1,3})\s+(10[89]\.\d{1,3}|11[01]\.\d{1,3})D?\b', text))
    if len(locals_) != 1 or 'RECOMMENDED PROFILE' not in text:
        return None
    ident, frequency = next(iter(locals_))
    profile = text[text.index('RECOMMENDED PROFILE'):]
    profile = profile.split('Aircraft Category', 1)[0]
    start_row = next(i for i, r in enumerate(rows) if 'RECOMMENDED PROFILE' in r)
    end_row = next((i for i, r in enumerate(rows) if i > start_row and 'Aircraft Category' in r), len(rows))
    glide = re.search(r'GLIDE PATH\s+(\d(?:\.\d+)?)°', profile)
    rdh = re.search(r'\bRDH\s+(\d{1,3})(?![\d.])\b', profile)
    threshold = re.search(r'THR ELEVATION\s+(\d{1,5})\b', text[:900])
    zero = re.search(r'(?:DME\s+' + re.escape(ident) + '|' + re.escape(ident) + r'\s+DME)\s+zero ranged to THR RWY\s+' + rw[1] + r'(?![0-9LRC])', profile)
    if not glide or not rdh or not threshold or not zero or not 1 <= float(glide[1]) <= 6:
        return None
    nominal = int(rw[1][:2])*10 % 360
    courses = {int(c) % 360 for c in re.findall(r'(?<![\d.])(\d{3})°', profile)
               if int(c) <= 360 and abs((int(c)-nominal+180) % 360-180) <= 15}
    variation = re.search(r'VAR\s+(\d{1,2}(?:\.\d+)?)°\s*([EW])', text)
    variation = float(variation[1])*(-1 if variation[2] == 'W' else 1) if variation else None
    cat = re.search(r'ACFT CAT\s+([A-D](?:\s*,\s*[A-D])*)', text[:900])
    categories = re.findall(r'[A-D]', cat[1]) if cat else []
    distances = next((r for r in rows if r.startswith('DME '+ident)), '')
    distances = re.sub(r'\([^)]*\)', '', distances[len('DME '+ident):]).strip()
    levels = next((r for r in rows if r.startswith('ALT (HGT) ')), '')
    pairs = re.findall(r'(\d{3,5})\s*\((\d{1,5})\)', levels)
    recommended = []
    if re.fullmatch(r'\d+(?:\.\d+)?(?:\s+\d+(?:\.\d+)?){1,15}', distances):
        numbers = list(map(float, distances.split()))
        if (len(numbers) == len(pairs) and all(0 < d <= 30 for d in numbers)
                and all(a > b for a, b in zip(numbers, numbers[1:]))
                and all(abs(int(a) - int(h) - int(threshold[1])) <= 1 for a, h in pairs)):
            recommended = [{'dme_nm': d, 'altitude_ft': int(a)} for d, (a, h) in zip(numbers, pairs)]
    return {'icao': icao, 'runway': rw[1], 'name': 'ILS RWY ' + rw[1],
            'source': {'kind': 'ukpkg', 'file': file, 'cycle': cycle, 'at': at.isoformat()},
            'chart_data': {'scope': 'uk-iac-profile-metadata', 'localizer': {'ident': ident, 'frequency_mhz': float(frequency)},
                           'glide_path_deg': float(glide[1]), 'rdh_ft': int(rdh[1]), 'threshold_elevation_ft': int(threshold[1]),
                           'inbound_course_magnetic_deg': next(iter(courses)) if len(courses) == 1 else None, 'variation_deg': variation,
                           'profile_course_candidates_magnetic_deg': sorted(courses),
                           'aircraft_categories': categories,
                           'source_operating_conditions': [rows[max(0, i):i+5] for i, row in enumerate(rows)
                                                           if re.search(r'non-standard glide|certified to carry|WARNINGS?', row, re.I)],
                           'dme_zero': 'THR RWY ' + rw[1], 'recommended_profile': recommended,
                           'profile_source_rows': rows[start_row:end_row],
                           'geometry_reconstructed': False},
            'partial': {'read': ['localizer', 'glide-rdh'] + (['recommended-profile'] if recommended else []),
                        'unread': ['initial-path', 'final-fix-association', 'missed-path', 'minima']
                                  + ([] if recommended else ['recommended-profile-reference'])
                                  + ([] if len(courses) == 1 else ['localizer-course-association'])
                                  + (['aircraft-eligibility'] if float(glide[1]) > 4 else [])}}


def profile_record(profile, runway_data):
    """Approximate advisory axis samples, never claimed to be published IF/FAF fixes."""
    data = profile['chart_data']
    runway = next((r for r in runway_data if r['id'] == profile['runway']), None)
    if (not runway or runway.get('elevation_ft') is None or abs(runway['elevation_ft'] - data['threshold_elevation_ft']) > 1
            or data['variation_deg'] is None
            or not any(abs((runway['true']-c-data['variation_deg']+180) % 360-180) <= 1 for c in data['profile_course_candidates_magnetic_deg'])
            or not data['recommended_profile']):
        return None
    pts = []
    for n, value in enumerate(data['recommended_profile'], 1):
        lat, lon = destination((runway['lat'], runway['lon']), (runway['true'] + 180) % 360, value['dme_nm'])
        pts.append({'seq': n, 'id': f'PRF{n:02}', 'leg': 'CF', 'lat': round(lat, 7), 'lon': round(lon, 7), 'alt': None,
                    'profile_altitude': {'ft': value['altitude_ft'], 'semantics': 'recommended'},
                    'synthetic': 'advisory-profile-sample', 'coords_from': 'AD2.12 axis + threshold-zeroed IAC DME'})
    pts.append({'seq': len(pts) + 1, 'id': 'RW' + profile['runway'], 'leg': 'CF', 'lat': runway['lat'], 'lon': runway['lon'],
                'alt': {'type': 'at', 'ft': data['threshold_elevation_ft'] + data['rdh_ft']}, 'vpa': -data['glide_path_deg'],
                'synthetic': 'threshold-crossing'})
    limited = data['aircraft_categories'] and set(data['aircraft_categories']) != set('ABCD')
    suffix = '.CAT' + ''.join(data['aircraft_categories']) if limited else ''
    name = profile['name'] + (' (CAT ' + '/'.join(data['aircraft_categories']) + ')' if limited else '')
    return {'id': profile['icao'] + '.APP.ILS.RW' + profile['runway'] + suffix, 'icao': profile['icao'], 'kind': 'APP',
            'name': name, 'runways': [profile['runway']], 'transition': None, 'points': pts,
            'source': profile['source'], 'status': 'check', 'partial': profile['partial'],
            'chart_data': {**data, 'scope': 'uk-recommended-axis-samples', 'geometry_approximate': True}}


def read_chart(rows, icao, runway_data, file, cycle):
    text = ' '.join(' '.join(rows).split())[:200000]
    rw = re.search(r'\bRWY\s+(\d{2}[LRC]?)\b', text[:900])
    loc = re.search(r'\b(I-[A-Z]{1,3})\s+(10[89]\.\d{1,3}|11[01]\.\d{1,3})D?\b', text)
    if not rw or not loc or 'INSTRUMENT APPROACH CHART' not in text[:300] or 'ILS/' not in text[:500]:
        return None
    rw = rw[1]
    threshold = next((r for r in runway_data if r['id'] == rw), None)
    profile = text[text.find('RECOMMENDED PROFILE'):] if 'RECOMMENDED PROFILE' in text else ''
    gp = re.search(r'GLIDE PATH\s+(\d(?:\.\d+)?)°', profile)
    rdh = re.search(r'RDH\s+(\d{1,3})\b', profile)
    if not threshold or not gp or not rdh or not re.search(r'DME\s+' + re.escape(loc[1]) + r'\s+zero ranged to THR RWY\s+' + rw, profile):
        return None
    # This profile template prints the named IF twice (plan and profile annotations).
    named_if = re.search(r'\bIF\b.{0,300}?\b([A-Z]{5})\s+\1\b', profile)
    dme_axis = re.search(r'zero ranged to THR RWY\s+' + rw + r'\s+0\s+D([\d.]+)\s+D([\d.]+)\s+D([\d.]+)D([\d.]+)', profile)
    var = re.search(r'VAR\s+(\d{1,2}(?:\.\d+)?)°([EW])', text)
    if not named_if or not dme_axis or not var:
        return None
    iaf_dme, faf_dme, if_dme, reversal_dme = map(float, dme_axis.groups())
    if not 0 < iaf_dme < faf_dme < if_dme <= 30 or not 1 <= float(gp[1]) <= 6:
        return None
    variation = float(var[1]) * (-1 if var[2] == 'W' else 1)
    course = round((threshold['true'] - variation) % 360)
    if not re.search(r'\b' + f'{course:03d}' + '°', text):
        return None
    alt = re.search(r'THR ELEVATION\s+(\d{1,5})', text[:900])
    level = re.search(r'\b' + re.escape(named_if[1]) + r'\s+' + re.escape(named_if[1]) + r'.{0,80}?\b(\d{4})\b', profile)
    missed = re.search(r'Climb to\s+(\d{4})\s*\.\s*Straight ahead to\s+' + re.escape(loc[1]) + r'\s+DME\s+([\d.]+)\s+outbound.{0,100}?or\s+(\d{3,4})\s+whichever is the later, then turn\s+(left|right)\s+onto track\s+(\d{3})°', profile)
    if not alt or not level or not missed:
        return None
    profile_distances = next((r for r in rows if r.startswith('DME '+loc[1]+' ')), '')
    profile_altitudes = next((r for r in rows if r.startswith('ALT (HGT) ')), '')
    distances = re.findall(r'\d+(?:\.\d+)?', profile_distances[len('DME '+loc[1]):])
    elevations = re.findall(r'(\d{3,5})\s*\(\d+\)', profile_altitudes)
    recommended = ([{'dme_nm': float(d), 'altitude_ft': int(a)} for d, a in zip(distances, elevations)]
                   if len(distances) == len(elevations) and distances else [])
    channel = re.search(r'\(Ch\s+(\d{1,3}[XY])\)', text[loc.end():loc.end()+70])
    ad_elevation = re.search(r'AD ELEVATION\s+(\d{1,5})', text[:900])
    transition_altitude = re.search(r'TRANSITION ALTITUDE.{0,220}?\b(\d{4,5})\b', text[:1500])
    points = []
    for ident, distance, synthetic in [(named_if[1], if_dme, 'if'), ('FAF'+rw, faf_dme, 'faf')]:
        lat, lon = destination((threshold['lat'], threshold['lon']), (threshold['true']+180) % 360, distance)
        points.append({'seq': len(points)+1, 'id': ident, 'lat': round(lat, 7), 'lon': round(lon, 7),
                       'leg': 'IF' if not points else 'CF', 'alt': {'type': 'at', 'ft': int(level[1])},
                       'synthetic': synthetic, 'coords_from': 'AD2.12 true axis and threshold-zeroed chart DME'})
    points.append({'seq': 3, 'id': 'RW'+rw, 'lat': threshold['lat'], 'lon': threshold['lon'],
                   'leg': 'CF', 'alt': {'type': 'at', 'ft': int(alt[1])}, 'vpa': -float(gp[1]),
                   'crs': course, 'trk': threshold['true'], 'synthetic': 'threshold'})
    return {'id': f'{icao}.APP.ILS.RW{rw}', 'icao': icao, 'kind': 'APP', 'name': 'ILS RWY '+rw,
            'runways': [rw], 'transition': None, 'points': points, 'status': 'check',
            'partial': {'read': ['final-profile', 'localizer', 'missed-instructions'],
                        'unread': ['initial-procedure-turn', 'missed-path'],
                        'note': 'Final profile read; initial and missed manoeuvre geometry not reconstructed'},
            'chart_data': {'localizer': {'ident': loc[1], 'frequency_mhz': float(loc[2]),
                                         'channel': channel[1] if channel else None},
                           'inbound_course_magnetic_deg': course, 'glide_path_deg': float(gp[1]),
                           'rdh_ft': int(rdh[1]), 'threshold_elevation_ft': int(alt[1]),
                           'ad_elevation_ft': int(ad_elevation[1]) if ad_elevation else None,
                           'transition_altitude_ft': int(transition_altitude[1]) if transition_altitude else None,
                           'recommended_profile': recommended,
                           'dme_zero': 'THR RWY '+rw,
                           'missed_approach': {'target_altitude_ft': int(missed[1]),
                              'straight_ahead_until': {'logic': 'later_of', 'dme_outbound_nm': float(missed[2]),
                                                      'minimum_altitude_ft': int(missed[3])},
                              'then': {'turn': 'L' if missed[4] == 'left' else 'R',
                                       'track_magnetic_deg': int(missed[5])},
                              'instructions': profile[missed.start():profile.find('RCF:', missed.end())].strip(),
                              'rcf': profile[profile.find('RCF:'):profile.find('DME '+loc[1]+' zero ranged')].strip()}},
            'source': {'file': file, 'cycle': cycle, 'at': None}}
