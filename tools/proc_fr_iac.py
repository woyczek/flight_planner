"""Read French IAC facts and derive a final axis only with published references.

No PDF dependency. Rows come from proc_pdf's bounded child. DME and threshold
references stay distinct, and named variants are not used to relabel DATA geometry.
"""
from datetime import date
import copy
import math
import re

import safe_json
from proc_arc import destination
from proc_geometry import bearing_nm
from proc_iac_levels import attach_levels, read_levels


MONTHS = dict(zip('JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC'.split(), range(1, 13)))
NUMBER = r'\d+(?:\.\d+)?'


def is_final_chart(name):
    return bool(re.search(r'_IAC_RWY\d{2}[LRC]?(?:_|\.)', name)
                and re.search(r'_(?:ILS|LOC)(?:_|\.)', name) and '_INA_' not in name)


def attach_profile(procedures, profile, runways=None):
    """Reference the chart without relabelling a route variant or altering geometry."""
    matched = 0
    for proc in procedures:
        if proc['kind'] != 'APP' or proc['runways'] != [profile['runway']]:
            continue
        title = (proc.get('name') or '').upper()
        named = re.fullmatch(r'(?:ILS|LOC)(?:\s+([S-Z]))?\s+RWY\s+\d{2}[LRC]?', title)
        if not named:
            continue
        if named[1] and named[1] != profile['variant']:
            continue
        proc.setdefault('chart_data', {}).setdefault('iac_profiles', []).append(profile)
        if runways is not None and title.startswith('ILS') and named[1] == profile['variant'] and (proc.get('source') or {}).get('cycle') == profile['source']['cycle']:
            context, reason = _threshold_context(profile, runways)
            if not reason:
                lat, lon, elevation, true, qfu, course, basis = context
                for point in proc.get('points') or []:
                    if (point.get('id') != 'RW' + profile['runway'] or not isinstance(point.get('lat'), (int, float))
                            or not isinstance(point.get('lon'), (int, float)) or abs(point['lat'] - lat) > 0.00001 or abs(point['lon'] - lon) > 0.00001):
                        continue
                    target = {'type': 'at', 'ft': elevation + profile['chart_data']['rdh_ft']}
                    if point.get('alt') is None:
                        point['alt'], point['alt_from'] = target, 'matching AD 2.12 threshold + IAC RDH'
                    elif point['alt'] != target:
                        proc['chart_data']['threshold_profile_conflict'] = True
                    if point.get('vpa') is None:
                        point['vpa'] = -profile['chart_data']['glide_path_deg']
        matched += 1
    return matched


def _numbers(text):
    if not re.fullmatch(rf'{NUMBER}(?:\s+{NUMBER}){{0,29}}', text.strip()):
        return None
    return [float(n) for n in text.split()]


def _profile_table(rows):
    """Read the distance/altitude table only; minima columns do not supply altitude."""
    for i, row in enumerate(rows):
        nm = re.search(r'\bNM\s+(' + NUMBER + r'(?:\s+' + NUMBER + r')*)$', row)
        if not nm:
            continue
        distances = _numbers(nm[1])
        context = ' '.join(rows[max(0, i - 4):i + 1])
        station = re.search(r'\bDME[- ]+([A-Z]{2,3})\b', context)
        alt = next((re.search(r'\bALT\s+(.+)$', r) for r in rows[i + 1:i + 4] if re.search(r'\bALT\s+', r)), None)
        levels = _numbers(alt[1]) if alt else None
        if not station or not distances or not levels or len(distances) != len(levels):
            continue
        if len(set(distances)) != len(distances) or not all(0 < n <= 30 for n in distances) or not all(0 < n <= 30000 and n.is_integer() for n in levels):
            continue
        return {'station': station[1], 'reference': 'DME',
                'values': [{'dme_nm': d, 'altitude_ft': int(a)} for d, a in zip(distances, levels)]}
    return None


def _distance_references(rows):
    dme, threshold, station, basis = None, None, None, None
    for row in rows:
        m = re.fullmatch(r'DME\s+([A-Z]{2,3})\s*\(NM\)\s+(.+)', row)
        if m:
            station, dme = m[1], _numbers(m[2])
        m = re.search(r'\b(D?THR)\s*\(NM\)\s+(.+)$', row)
        if m:
            basis, threshold = m[1], _numbers(m[2])
    offset = None
    if dme and threshold and (len(dme) == len(threshold) or (len(dme) == len(threshold) + 1 and dme[-1] == 0)):
        differences = [round(a - b, 3) for a, b in zip(dme, threshold)]
        if len(differences) >= 2 and max(differences) - min(differences) < 0.02:
            offset = differences[0]
    return {'station': station, 'threshold_reference': basis, 'dme_nm': dme,
            'threshold_nm': threshold, 'dme_at_threshold_nm': offset,
            'coordinates_derived': False}


def _final_fixes(rows, references):
    """Bind explicit IF/FAF DME labels to the printed threshold-distance columns."""
    dme, threshold = references.get('dme_nm'), references.get('threshold_nm')
    if not dme or not threshold or references.get('dme_at_threshold_nm') is None:
        return {}
    pairs = list(zip(dme, threshold))
    if len({a for a, b in pairs}) != len(pairs) or not all(a >= 0 and b >= 0 for a, b in pairs):
        return {}
    found = {'IF': set(), 'FAF': set()}
    for row in rows:
        for m in re.finditer(r'\b(IF|FAF)\s+(' + NUMBER + r')\s*NM\s+([A-Z]{2,3})\b', row):
            if m[3] == references['station']:
                found[m[1]].add(float(m[2]))
    result = {}
    for kind, values in found.items():
        if len(values) != 1:
            continue
        distance = next(iter(values))
        matching = [b for a, b in pairs if abs(a - distance) < 0.001]
        if len(matching) == 1 and matching[0] > 0:
            result[kind] = {'dme_nm': distance, 'station': references['station'],
                            'threshold_nm': matching[0], 'threshold_reference': references['threshold_reference']}
    return result


def _inbound_course(rows, runway):
    nominal = (int(runway[:2]) * 10) % 360
    candidates = [int(v) % 360 for v in re.findall(r'(?<![\d.])(\d{3})°', ' '.join(rows))
                  if int(v) <= 360 and abs((int(v) - nominal + 180) % 360 - 180) <= 10]
    return candidates[0] if len(candidates) >= 2 and len(set(candidates)) == 1 else None


def _positioned_axis(rows):
    """Validate the bounded child's typed axis supplement before using any value."""
    prefix = '@@IAC_AXIS '
    items = [r[len(prefix):] for r in rows if r.startswith(prefix)]
    if len(items) != 1 or len(items[0]) > 4000:
        return None
    try:
        axis, why = safe_json.loads(items[0])      # SOG-0468 (a) : le texte vient d'un PDF (non fiable) : la lecture bornée de safe_json (K469), jamais une garde propre
        if why:
            return None
        if (not isinstance(axis, dict) or set(axis) != {'schema', 'method', 'station', 'threshold_reference', 'columns', 'fix_columns'}
                or type(axis['schema']) is not int or axis['schema'] != 1 or axis['method'] != 'native-text-operands'
                or not re.fullmatch(r'[A-Z]{2,3}', axis['station']) or axis['threshold_reference'] not in ('THR', 'DTHR')):
            return None
        columns, markers = axis['columns'], axis['fix_columns']
        if not isinstance(columns, list) or not 2 <= len(columns) <= 12 or not isinstance(markers, dict) or not set(markers) <= {'IF', 'FAF'}:
            return None
        for column in columns:
            if not isinstance(column, dict) or set(column) != {'dme_nm', 'threshold_nm'}:
                return None
            if not all(isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) and 0 <= v <= 30 for v in column.values()):
                return None
        dme, threshold = [c['dme_nm'] for c in columns], [c['threshold_nm'] for c in columns]
        if len(set(dme)) != len(dme) or len(set(threshold)) != len(threshold):
            return None
        for values in (dme, threshold):
            if not (all(a < b for a, b in zip(values, values[1:])) or all(a > b for a, b in zip(values, values[1:]))):
                return None
        differences = [a - b for a, b in zip(dme, threshold)]
        if max(differences) - min(differences) > 0.02:
            return None
        if not all(isinstance(i, int) and not isinstance(i, bool) and 0 <= i < len(columns) for i in markers.values()) or len(set(markers.values())) != len(markers):
            return None
        return axis
    except (KeyError, TypeError, ValueError, OverflowError):
        return None


def _axis_references(axis):
    columns = axis['columns']
    return {'station': axis['station'], 'threshold_reference': axis['threshold_reference'],
            'dme_nm': [c['dme_nm'] for c in columns], 'threshold_nm': [c['threshold_nm'] for c in columns],
            'dme_at_threshold_nm': round(columns[0]['dme_nm'] - columns[0]['threshold_nm'], 3),
            'coordinates_derived': False, 'read_method': 'native-text-operands'}


def _threshold_context(profile, runways):
    """Validate the official runway and the profile's threshold reference together."""
    data, rw = profile['chart_data'], profile['runway']
    runway = next((r for r in runways if r.get('id') == rw), None)
    if not runway or runway.get('source') != 'eaip':
        return None, 'ad212-runway-missing'
    if runway.get('cycle', profile['source']['cycle']) != profile['source']['cycle']:
        return None, 'ad212-cycle-mismatch'
    basis = data['threshold_reference']
    if basis == 'DTHR':
        threshold = runway.get('dthr')
    else:
        threshold = None if runway.get('dthr') else runway
    if not threshold:
        return None, 'matching-threshold-missing'
    values = [threshold.get(k) for k in ('lat', 'lon', 'elev')] + [runway.get('true'), runway.get('qfu'), data.get('inbound_course_magnetic_deg')]
    if not all(isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) for v in values):
        return None, 'threshold-or-course-unread'
    lat, lon, elevation, true, qfu, course = values
    if not (-90 <= lat <= 90 and -180 <= lon <= 180 and 0 <= true <= 360 and 0 <= qfu <= 360):
        return None, 'threshold-or-course-invalid'
    if abs(elevation - data['threshold_elevation_ft']) > 1:
        return None, 'threshold-elevation-mismatch'
    if abs((course - qfu + 180) % 360 - 180) > 1:
        return None, 'final-axis-not-runway-aligned'
    return (lat, lon, elevation, true, qfu, course, basis), None


def final_record(profile, runways):
    """Derive only a labelled final axis from IAC distance columns and official AD 2.12.

    Rounded printed distances do not create published fix coordinates or altitude
    constraints. The threshold crossing altitude is the printed elevation plus RDH.
    No missed leg is projected from a DME range or a diagram's turn shape.
    """
    data, rw = profile['chart_data'], profile['runway']
    if data.get('distance_reference_conflict'):
        return None, 'iac-distance-reference-conflict'
    fixes = data.get('final_fixes') or {}
    if not all(k in fixes for k in ('IF', 'FAF')):
        return None, 'explicit-if-faf-distances-missing'
    if not 0 < fixes['FAF']['threshold_nm'] < fixes['IF']['threshold_nm'] <= 30:
        return None, 'final-distance-order'
    context, reason = _threshold_context(profile, runways)
    if reason:
        return None, reason
    lat, lon, elevation, true, qfu, course, basis = context
    if any(fixes[k]['threshold_reference'] != basis for k in ('IF', 'FAF')):
        return None, 'threshold-reference-mismatch'
    points = []
    for kind in ('IF', 'FAF'):
        distance = fixes[kind]['threshold_nm']
        pos = destination((lat, lon), (true + 180) % 360, distance)
        point = {'seq': len(points) + 1, 'id': kind + rw, 'leg': 'IF' if kind == 'IF' else 'CF',
                 'lat': round(pos[0], 7), 'lon': round(pos[1], 7), 'alt': None,
                 'synthetic': kind.lower(), 'coords_from': 'AD 2.12 true axis + IAC ' + basis + ' distance',
                 'distance_resolution_nm': 0.1, 'distance_rounding_uncertainty_nm': 0.05}
        if kind == 'FAF':
            point.update({'nm': round(fixes['IF']['threshold_nm'] - distance, 3), 'crs': course, 'trk': true})
        points.append(point)
    points.append({'seq': 3, 'id': 'RW' + rw, 'leg': 'CF', 'lat': lat, 'lon': lon,
                   'nm': fixes['FAF']['threshold_nm'], 'crs': course, 'trk': true,
                   'alt': {'type': 'at', 'ft': data['threshold_elevation_ft'] + data['rdh_ft']},
                   'alt_from': 'IAC threshold elevation + RDH', 'vpa': -data['glide_path_deg'], 'synthetic': 'threshold'})
    chart = copy.deepcopy(data)
    chart['distance_references']['coordinates_derived'] = True
    chart.update({'scope': 'derived-final-axis', 'geometry_basis': {'source': 'AD 2.12', 'threshold_reference': basis,
                  'true_course_deg': true, 'cycle': profile['source']['cycle'], 'rounded_distances': True,
                  'axis': 'runway-aligned approximation', 'localizer_true_axis_verified': False}})
    source = {**profile['source'], 'ref': profile['source']['file']}
    identifier = re.sub(r'\s+', '', profile['name'])
    return attach_levels({'id': f"{profile['icao']}.APP.{identifier}.RW{rw}",
            'icao': profile['icao'], 'kind': 'APP', 'name': profile['name'], 'runways': [rw],
            'transition': None, 'points': points, 'source': source, 'status': 'check', 'chart_data': chart,
            'partial': {'read': ['derived-final-axis', 'iac-profile-metadata'],
                        'unread': ['initial-path', 'localizer-true-axis', 'if-faf-altitude-constraints', 'plan-annotations', 'minima', 'missed-path'],
                        'note': 'IF/FAF positions approximate the runway axis using rounded chart distances; initial and missed paths remain unread'}}), None


def published_final_record(profile, runways, data_context):
    """Use a published DATA FAF only for an unambiguous, distance-checked IAC final.

    A published MATF can delimit a straight missed segment; no turn or interception
    is connected to a navaid. The climb target is not an altitude at the MATF.
    """
    data, rw = profile['chart_data'], profile['runway']
    if data.get('distance_reference_conflict'):
        return None, 'iac-distance-reference-conflict'
    if not data_context or not data_context.get('sole_final_chart'):
        return None, 'ambiguous-data-final-variant'
    if data_context.get('cycle') != profile['source']['cycle']:
        return None, 'data-cycle-mismatch'
    faf = data_context.get('faf')
    if not faf or not data_context.get('source_file'):
        return None, 'published-faf-missing'
    if data_context.get('navigation_type') not in data.get('navigation_types', []):
        return None, 'data-final-navigation-type-mismatch'
    context, reason = _threshold_context(profile, runways)
    if reason:
        return None, reason
    lat, lon, elevation, true, qfu, course, basis = context
    if not all(isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) for v in faf):
        return None, 'published-faf-invalid'
    if not (-90 <= faf[0] <= 90 and -180 <= faf[1] <= 180):
        return None, 'published-faf-invalid'
    bearing, distance = bearing_nm(faf, (lat, lon))
    reference = data['distance_references']
    matching = [d for d in reference.get('threshold_nm') or [] if d > 0 and abs(d - distance) <= 0.15]
    if reference.get('threshold_reference') != basis or len(matching) != 1 or abs((bearing - true + 180) % 360 - 180) > 1:
        return None, 'data-faf-iac-distance-or-axis-mismatch'
    labelled_faf = (data.get('final_fixes') or {}).get('FAF')
    if labelled_faf and abs(labelled_faf['threshold_nm'] - matching[0]) > 0.02:
        return None, 'data-faf-iac-label-mismatch'
    faf_altitude = data_context.get('faf_altitude_ft')
    if faf_altitude is not None and (not isinstance(faf_altitude, (int, float)) or isinstance(faf_altitude, bool) or not math.isfinite(faf_altitude)):
        return None, 'data-faf-altitude-invalid'
    points = [{'seq': 1, 'id': 'FAF' + rw, 'leg': 'IF', 'lat': faf[0], 'lon': faf[1],
               'alt': {'type': 'at', 'ft': faf_altitude} if faf_altitude is not None else None,
               'coords_from': data_context['source_file'] + ': published FAF position'},
              {'seq': 2, 'id': 'RW' + rw, 'leg': 'CF', 'lat': lat, 'lon': lon,
               'nm': matching[0], 'trk': round(bearing, 3), 'trk_from': 'published endpoint coordinates', 'crs': course, 'vpa': -data['glide_path_deg'],
               'alt': {'type': 'at', 'ft': data['threshold_elevation_ft'] + data['rdh_ft']},
               'alt_from': 'IAC threshold elevation + RDH', 'coords_from': 'AD 2.12 ' + basis}]
    chart = copy.deepcopy(data)
    chart.update({'scope': 'published-final-axis', 'geometry_basis': {'source': 'DATA FAF + AD 2.12',
                  'data_file': data_context['source_file'], 'threshold_reference': basis,
                  'runway_true_course_deg': true, 'measured_final_course_deg': round(bearing, 3),
                  'cycle': profile['source']['cycle'], 'coordinates': 'published',
                  'distance_check_tolerance_nm': 0.15}})
    read = ['published-final-axis', 'iac-profile-metadata']
    unread = ['initial-path', 'faf-altitude-constraint', 'plan-annotations', 'minima', 'missed-path']
    if faf_altitude is not None:
        read.append('faf-altitude')
        unread.remove('faf-altitude-constraint')
    initial = (data.get('final_fixes') or {}).get('IF')
    if (initial and initial['threshold_reference'] == basis and initial['station'] == reference.get('station')
            and distance < initial['threshold_nm'] <= 30):
        outbound, _ = bearing_nm((lat, lon), faf)
        position = destination((lat, lon), outbound, initial['threshold_nm'])
        point = {'seq': 1, 'id': 'IF' + rw, 'leg': 'IF', 'lat': round(position[0], 7), 'lon': round(position[1], 7),
                 'alt': None, 'synthetic': 'if', 'coords_from': 'IAC threshold distance along published final endpoints',
                 'distance_resolution_nm': 0.1, 'distance_rounding_uncertainty_nm': 0.05}
        track, _ = bearing_nm(position, faf)
        points[0].update(leg='CF', nm=round(initial['threshold_nm'] - matching[0], 3), trk=round(track, 3),
                         trk_from='derived IF and published FAF endpoints', crs=course)
        points.insert(0, point)
        for sequence, existing in enumerate(points, 1):
            existing['seq'] = sequence
        read.append('derived-initial-fix')
        unread.append('if-altitude-constraint')
        chart['geometry_basis']['coordinates'] = 'published final endpoints; derived IF'
    missed, fix = data['missed_approach'], data_context.get('matf')
    if fix:
        chart['missed_approach']['published_turn_fix'] = copy.deepcopy(fix)
    trigger, offset = missed.get('turn_at'), reference.get('dme_at_threshold_nm')
    if fix and trigger and offset is not None and missed.get('straight_ahead') and trigger['station'] == reference.get('station'):
        pos = (fix['lat'], fix['lon'])
        heading, length = bearing_nm((lat, lon), pos)
        expected = trigger['dme_nm'] + offset
        if (fix.get('cycle') == profile['source']['cycle'] and fix.get('role') == 'MATF'
                and expected > 0 and abs(length - expected) <= 0.15
                and abs((heading - true + 180) % 360 - 180) <= 1):
            point = {'seq': len(points) + 1, 'id': 'MATF' + rw, 'leg': 'CF', 'phase': 'missed',
                     'lat': pos[0], 'lon': pos[1], 'alt': None, 'trk': round(heading, 3),
                     'trk_from': 'published endpoint coordinates', 'crs': course,
                     'coords_from': fix['source_file'] + ': published MATF position'}
            if missed.get('maximum_ias_kt') is not None:
                point['kt'] = missed['maximum_ias_kt']
            points.append(point)
            read.append('published-missed-straight-segment')
            unread.remove('missed-path')
            unread += ['missed-turn-and-interception', 'missed-vertical-profile']
            chart['missed_approach']['straight_segment_reconstructed'] = True
            chart['missed_approach']['straight_segment_validation'] = {'dthr_nm_measured': round(length, 3),
                'dthr_nm_expected_approx': round(expected, 3), 'tolerance_nm': 0.15}
    identifier = re.sub(r'\s+', '', profile['name'])
    return attach_levels({'id': f"{profile['icao']}.APP.{identifier}.RW{rw}", 'icao': profile['icao'], 'kind': 'APP',
            'name': profile['name'], 'runways': [rw], 'transition': None, 'status': 'check', 'points': points,
            'source': {**profile['source'], 'ref': profile['source']['file']}, 'chart_data': chart,
            'partial': {'read': read, 'unread': unread,
                        'note': 'Published final positions checked against the IAC; initial path and remaining missed manoeuvre unread'}}), None


def read_profile(rows, icao, file, cycle):
    """Measured SIA/DIRCAM ILS profile family, mainland and regional headers; None otherwise.

    A future chart in an older-cycle cache is refused. Chart dates are amendment
    dates, not a claim that an old chart expires before the requested AIRAC cycle.
    """
    rows = [' '.join(r.split()) for r in rows if r.strip()]
    header = ' '.join(rows[:24])
    if not re.fullmatch(r'[A-Z]{4}', icao):
        return None
    # Native Pacific lettering can split the known ICAO (NT AA); match only
    # the requested four-letter identity immediately before the IAC heading.
    header = re.sub(r'\bAD\s+2\s+' + r'\s*'.join(icao) + r'(?=\s+IAC\b)', 'AD 2 ' + icao, header)
    identity = re.search(r'\bAD\s+2\s+([A-Z]{4})\s+IAC\s+RWY(\d{2}[LRC]?)\s+(?:FNA\s+)?ILS(?:\s+([S-Z]))?\b', header)
    file_id = re.match(r'AD_2_([A-Z]{4})_IAC_RWY(\d{2}[LRC]?)(?:_|\.)', file)
    file_variant = re.search(r'_ILS_([S-Z])(?:_|\.)', file)
    stamp = r'(\d{2})\s+([A-Z]{3})\s+(\d{4}|\d{2})'
    dated = (re.search(r'\b(?:FRANCE|RUN|CAR/SAM/NAM|P\s*AC-[PN])\s+' + stamp + r'\b', header)
             or re.search(r'\b' + stamp + r'\s+FRANCE\b', header))
    if (not identity or not file_id or identity[1] != icao or file_id[1] != icao or file_id[2] != identity[2]
            or (file_variant and file_variant[1] != identity[3]) or 'APPROCHE AUX INSTRUMENTS' not in header or not dated):
        return None
    try:
        effective = date(int(dated[3]) if len(dated[3]) == 4 else 2000 + int(dated[3]), MONTHS[dated[2]], int(dated[1]))
        if effective > date.fromisoformat(cycle):
            return None
    except (KeyError, ValueError):
        return None
    elev = re.search(r'AL\s*T\s+AD\s*:\s*(\d+)(?:\s*\([^)]*\))?\s*,?\s*(D?THR)\s*:\s*(\d+)', header)
    rdh = re.search(r'\bRDH(?:/TCH)?\s*:?\s*(\d{1,3})(?![\d.])\b', header)
    localizer = re.search(r'\b([A-Z]{2,3})\s+(10[89]\.\d{1,3}|11[01]\.\d{1,3})\b', header)
    if localizer:
        ident, frequency = localizer[1], float(localizer[2])
    else:
        named = re.search(r'\bILS\s+([A-Z]{2,3})(?=\s)', header)
        freq = re.search(r'\b(10[89]\.\d{1,3}|11[01]\.\d{1,3})\b', header[named.end():]) if named else None
        ident, frequency = (named[1], float(freq[1])) if named and freq else (None, None)
    start = next((i for i, r in enumerate(rows) if re.search(r'\bT\s*A\s*:', r)), None)
    end = next((i for i, r in enumerate(rows) if i > (start if start is not None else len(rows)) and 'MNM AD' in r), None)
    if start is None or end is None or not elev or not rdh or not ident:
        return None
    profile_rows = rows[start:end]
    ta = re.search(r'\bT\s*A\s*:\s*(\d+)', rows[start])
    profile_text = ' '.join(profile_rows)
    slope = re.search(r'(\d(?:\.\d+)?)°\s*-\s*\d+(?:\.\d+)?\s*%', profile_text)
    if not slope:
        slope = re.search(r'\d+(?:\.\d+)?\s*%\s*-\s*(\d(?:\.\d+)?)°', profile_text)
    if not ta or not slope or not 1 <= float(slope[1]) <= 6:
        return None
    english = re.search(r'Missed\s+(?:approach|APCH)\s*:\s*(.*)', profile_text, re.I)
    english = english[1] if english else ''
    climb = re.search(r'Climb straight ahead (?:up )?to\s+(\d{3,5})\s*\((\d+)\s*\)', english, re.I)
    turn = re.search(r'At\s+(' + NUMBER + r')\s*(?:NM\s+)?([A-Z]{2,3})\s*,?\s*turn\s+'
                     r'(?:(?:\(\d+\)|DA|MDA|\d{3}°)\s+){0,5}(left|right)', english)
    speed = re.search(r'MAX IAS\s+(\d{2,3})\s*kt', english)
    radial = re.search(r'RDL\s+(\d{3})°\s+([A-Z]{2,3})\s*\(RM\s+(\d{3})°\)', english)
    fixes = re.match(r'\s+to\s+([A-Z]{2,5})(?:\s+then\s+([A-Z]{2,5}))?', english[turn.end():]) if turn else None
    missed = {'target_altitude_ft': int(climb[1]) if climb else None,
              'target_height_ft': int(climb[2]) if climb else None,
              'straight_ahead': bool(climb), 'turn': ('L' if turn[3] == 'left' else 'R') if turn else None,
              'turn_at': {'dme_nm': float(turn[1]), 'station': turn[2]} if turn else None,
              'maximum_ias_kt': int(speed[1]) if speed else None,
              'radial': {'magnetic_deg': int(radial[1]), 'station': radial[2], 'inbound_magnetic_deg': int(radial[3])} if radial else None,
              'fix_sequence': [f for f in fixes.groups() if f] if fixes else [],
              'source_rows': profile_rows, 'geometry_reconstructed': False,
              'conditions_rows': [r for r in rows if 'API sous surveillance' in r or 'MISSED APCH under' in r]}
    rw, variant = identity[2], identity[3]
    references = _distance_references(profile_rows)
    positioned = _positioned_axis(rows)
    reference_conflict = False
    if positioned:
        other = _axis_references(positioned)
        recommended = _profile_table(rows[end:])
        known_station = recommended['station'] if recommended else references.get('station')
        reference_conflict = ((known_station is not None and known_station != other['station'])
                              or (references.get('threshold_reference') is not None and references['threshold_reference'] != other['threshold_reference']))
        if references.get('dme_at_threshold_nm') is not None:
            reference_conflict |= (references.get('station') != other['station']
                                   or abs(references['dme_at_threshold_nm'] - other['dme_at_threshold_nm']) > 0.02)
            pairs = sorted(zip(references['dme_nm'], references['threshold_nm']))
            other_pairs = sorted(zip(other['dme_nm'], other['threshold_nm']))
            reference_conflict |= (len(pairs) != len(other_pairs)
                                   or any(abs(a - c) > 0.02 or abs(b - d) > 0.02
                                          for (a, b), (c, d) in zip(pairs, other_pairs)))
        elif not reference_conflict:
            references = other
    final_fixes = _final_fixes(rows, references)
    if positioned and not reference_conflict:
        for kind, index in positioned['fix_columns'].items():
            column = positioned['columns'][index]
            candidate = {**column, 'station': positioned['station'], 'threshold_reference': positioned['threshold_reference']}
            if kind in final_fixes and any(final_fixes[kind][key] != value for key, value in candidate.items()):
                reference_conflict = True
            else:
                final_fixes.setdefault(kind, {**candidate, 'read_method': 'positioned-label-column'})
    if reference_conflict:
        final_fixes = {}
    levels, fix_roles, level_conflict = read_levels(rows, references, final_fixes, int(elev[3]))
    return {'icao': icao, 'runway': rw, 'variant': variant, 'name': 'ILS ' + (variant + ' ' if variant else '') + 'RWY ' + rw,
            'source': {'kind': 'eaip', 'file': file, 'cycle': cycle, 'at': effective.isoformat()},
            'chart_data': {'scope': 'iac-profile-metadata', 'localizer': {'ident': ident, 'frequency_mhz': frequency},
                           'navigation_types': ['ILS', 'LOC'] if re.search(r'\bLOC\b', header) else ['ILS'],
                           'glide_path_deg': float(slope[1]), 'rdh_ft': int(rdh[1]), 'ad_elevation_ft': int(elev[1]),
                           'transition_altitude_ft': int(ta[1]),
                           'threshold_elevation_ft': int(elev[3]), 'threshold_reference': elev[2],
                           'inbound_course_magnetic_deg': _inbound_course(profile_rows, rw),
                           'distance_references': references, 'final_fixes': final_fixes,
                           'distance_reference_conflict': reference_conflict,
                           'positioned_text_unavailable': '@@IAC_POSITION_UNREAD' in rows,
                           'profile_levels': levels, 'profile_level_conflict': level_conflict,
                           'final_fix_roles': fix_roles,
                           'recommended_profile': _profile_table(rows[end:]), 'missed_approach': missed},
            'partial': {'read': ['iac-profile-metadata'] + (['missed-instructions'] if climb and turn else []),
                        'unread': ['initial-path', 'profile-to-route-association', 'plan-annotations', 'minima', 'missed-path']
                                  + (['if-altitude-reference-conflict'] if level_conflict else []),
                        'note': 'Profile facts only; diagram-only restrictions and route geometry still require interpretation'}}
