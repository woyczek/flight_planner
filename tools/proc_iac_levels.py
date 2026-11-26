"""Position-supported IF altitude/height pairs; no guessed FAF or shaded-floor level.

The measured SIA profile family prints procedure altitudes in oblique type and
heights in upright parentheses. Only a unique nearby IF pair is associated here.
Short native bars distinguish min/max/at; unbarred procedure levels stay advisory.
"""
import re


def levels_from_fragments(fragments, strokes, axis):
    context = axis['_positions']
    frame, baseline = context['frame'], context['baseline']
    index = axis['fix_columns'].get('IF')
    if index is None:
        return None
    x = context['columns_x'][index]
    items = [f for f in fragments if f['frame'] == frame]
    labels = [f for f in items if f['text'] == 'IF' and abs(f['x'] - x) <= 10 and 10 <= f['y'] - baseline <= 150]
    if len(labels) != 1:
        return None
    label = labels[0]
    candidates = []
    for altitude in items:
        font = altitude.get('font', '').split('+')[-1]
        if (font != 'HelveticaLT-Narrow-Oblique' or not re.fullmatch(r'\d{3,5}', altitude['text'])
                or not -35 <= altitude['y'] - label['y'] <= 2 or abs(altitude['x'] - label['x']) > 25):
            continue
        heights = [f for f in items if re.fullmatch(r'\(\d{1,5}\)', f['text'])
                   and 4 <= altitude['y'] - f['y'] <= 12 and abs(f['x'] - altitude['x']) <= 4
                   and f.get('font', '').split('+')[-1] == 'HelveticaLT-Narrow']
        if len(heights) != 1 or altitude.get('end_x') is None:
            continue
        height = heights[0]
        bars = [b for b in strokes if b['frame'] == frame and abs(b['x1'] - altitude['x']) <= 3
                and abs(b['x2'] - altitude['end_x']) <= 3]
        below = [b for b in bars if 0.3 <= altitude['y'] - b['y'] <= 3]
        above = [b for b in bars if 5 <= b['y'] - altitude['y'] <= 10]
        if len(below) > 1 or len(above) > 1:
            continue
        restriction = 'at' if below and above else 'min' if below else 'max' if above else 'recommended'
        candidates.append({**axis['columns'][index], 'altitude_ft': int(altitude['text']),
                           'height_ft': int(height['text'][1:-1]), 'restriction': restriction})
    if len(candidates) != 1:
        return None
    faf_role = None
    faf_index = axis['fix_columns'].get('FAF')
    if faf_index is not None:
        faf_x = context['columns_x'][faf_index]
        labels = [f for f in items if f['text'] == 'FAF' and abs(f['x'] - faf_x) <= 10
                  and 10 <= f['y'] - baseline <= 150]
        if len(labels) == 1:
            qualifiers = [f['text'] for f in items if f['text'] in ('LOC', 'ILS')
                          and abs(f['x'] - labels[0]['x']) <= 10 and 4 <= labels[0]['y'] - f['y'] <= 12]
            if len(qualifiers) == 1:
                faf_role = {**axis['columns'][faf_index], 'navigation_type': qualifiers[0]}
    return {'schema': 1, 'method': 'native-text-and-bars', 'station': axis['station'],
            'threshold_reference': axis['threshold_reference'], 'fixes': {'IF': candidates[0]}, 'faf_role': faf_role}


def read_levels(rows, references, fixes, threshold_elevation):
    """Validate the child supplement and independently check altitude minus height."""
    import json
    import math
    prefix = '@@IAC_LEVELS '
    values = [r[len(prefix):] for r in rows if r.startswith(prefix)]
    if not values:
        return {}, {}, False
    if len(values) != 1 or len(values[0]) > 1500:
        return {}, {}, True
    try:
        data = json.loads(values[0])
        if (set(data) != {'schema', 'method', 'station', 'threshold_reference', 'fixes', 'faf_role'}
                or type(data['schema']) is not int or data['schema'] != 1 or data['method'] != 'native-text-and-bars'
                or data['station'] != references.get('station') or data['threshold_reference'] != references.get('threshold_reference')
                or set(data['fixes']) != {'IF'} or 'IF' not in fixes):
            return {}, {}, True
        level = data['fixes']['IF']
        if set(level) != {'dme_nm', 'threshold_nm', 'altitude_ft', 'height_ft', 'restriction'}:
            return {}, {}, True
        if not all(type(level[k]) is int and 0 <= level[k] <= 30000 for k in ('altitude_ft', 'height_ft')):
            return {}, {}, True
        if (level['altitude_ft'] < 100 or abs(level['altitude_ft'] - level['height_ft'] - threshold_elevation) > 1
                or level['restriction'] not in ('at', 'min', 'max', 'recommended')):
            return {}, {}, True
        if not all(isinstance(level[k], (int, float)) and not isinstance(level[k], bool) and math.isfinite(level[k])
                   and abs(level[k] - fixes['IF'][k]) < 0.001 for k in ('dme_nm', 'threshold_nm')):
            return {}, {}, True
        role, roles = data['faf_role'], {}
        if role is not None:
            if (not isinstance(role, dict) or set(role) != {'dme_nm', 'threshold_nm', 'navigation_type'}
                    or role['navigation_type'] not in ('ILS', 'LOC') or 'FAF' not in fixes
                    or not all(isinstance(role[k], (int, float)) and not isinstance(role[k], bool) and math.isfinite(role[k])
                               and abs(role[k] - fixes['FAF'][k]) < 0.001 for k in ('dme_nm', 'threshold_nm'))):
                return {}, {}, True
            roles['FAF'] = role
        return {'IF': level}, roles, False
    except (AttributeError, KeyError, TypeError, ValueError, OverflowError, RecursionError):
        return {}, {}, True


def attach_levels(record):
    """Keep advisory altitude separate from route constraints and preserve coded values."""
    levels = record['chart_data'].get('profile_levels') or {}
    if record['chart_data'].get('profile_level_conflict') and 'if-altitude-reference-conflict' not in record['partial']['unread']:
        record['partial']['unread'].append('if-altitude-reference-conflict')
    for point in record['points']:
        faf = (record['chart_data'].get('final_fix_roles') or {}).get('FAF')
        if faf and point['id'] == 'FAF' + record['runways'][0]:
            point['chart_role'] = faf['navigation_type'] + ' FAF'
            if faf['navigation_type'] == 'LOC' and 'ils-fap-position' not in record['partial']['unread']:
                record['partial']['unread'].append('ils-fap-position')
        if point['id'] != 'IF' + record['runways'][0] or 'IF' not in levels:
            continue
        level = levels['IF']
        restriction = level['restriction']
        point['profile_altitude'] = {'ft': level['altitude_ft'], 'height_ft': level['height_ft'],
                                     'role': restriction, 'from': 'IAC IF altitude/height and native bars'}
        if restriction != 'recommended':
            constraint = {'type': restriction, 'ft': level['altitude_ft']}
            if point.get('alt') is not None and point['alt'] != constraint:
                record['chart_data']['profile_level_conflict'] = True
                if 'if-altitude-reference-conflict' not in record['partial']['unread']:
                    record['partial']['unread'].append('if-altitude-reference-conflict')
                continue
            point['alt'] = constraint
            point['alt_from'] = 'IAC native altitude restriction bars'
        partial = record['partial']
        read = 'if-procedure-level' if restriction == 'recommended' else 'if-altitude-constraint'
        if read not in partial['read']:
            partial['read'].append(read)
        for key in ('if-altitude-constraint', 'if-faf-altitude-constraints'):
            if key in partial['unread']:
                partial['unread'].remove(key)
                if key == 'if-faf-altitude-constraints':
                    partial['unread'].append('faf-altitude-constraint')
    return record
