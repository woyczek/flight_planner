"""Conservative positioned-text supplement for IAC profile distance columns.

The PDF reader is supplied by the bounded child. Only ASCII text with explicit
WinAnsi encoding is accepted; forms retain independent coordinate frames. No
PDF library, glyph inference or chart-specific numeric repair is used here.
"""
import json
import math
import re


PREFIX = '@@IAC_AXIS '
MAX_FRAGMENTS = 40000


def _object(value):
    return value.get_object() if hasattr(value, 'get_object') else value


def _native_map(font):
    """Explicit measured MT numeric glyph names, never a shifted-code guess."""
    encoding = _object(font.get('/Encoding'))
    if not isinstance(encoding, dict) or font.get('/ToUnicode') is not None:
        return {}
    differences = _object(encoding.get('/Differences', []))
    if len(differences) > 1024:
        return {}
    result, code = {}, None
    for value in differences:
        if isinstance(value, int):
            code = value
        elif code is not None:
            match = re.fullmatch(r'/MT(\d{1,3})', str(value))
            if match and 0 <= code <= 255 and 32 <= int(match[1]) <= 255:
                try:
                    result[code] = bytes([int(match[1])]).decode('cp1252')
                except UnicodeDecodeError:
                    pass
            code += 1
    return result


def _join_words(fragments):
    """Join consecutive text-show operations only when font advances agree."""
    rows = []
    for f in sorted(fragments, key=lambda f: (f['frame'], -f['y'], f['x'])):
        row = next((r for r in rows[-5:] if r[0]['frame'] == f['frame'] and abs(r[0]['y'] - f['y']) <= 0.2), None)
        if row is None:
            rows.append([f.copy()])
        else:
            row.append(f.copy())
    output = []
    for row in rows:
        combined = []
        for f in sorted(row, key=lambda f: f['x']):
            previous = combined[-1] if combined else None
            if (previous and previous.get('end_x') is not None and f.get('font') == previous.get('font')
                    and -1 <= f['x'] - previous['end_x'] <= 0.5):
                previous['text'] += f['text']
                previous['end_x'] = f.get('end_x')
            else:
                combined.append(f)
        for f in combined:
            f['text'] = ' '.join(f['text'].split())
            if f['text']:
                output.append(f)
    return output


def ascii_fragments(page, strokes=None):
    resources = _object(page.get('/Resources', {}))
    state = {'resources': resources, 'allowed': False, 'frame': 0, 'q': [],
             'font': {}, 'map': {}, 'size': 1, 'tc': 0, 'tw': 0, 'tz': 100,
             'stroke_black': True, 'fill_black': True, 'solid': True, 'width': 1, 'path': []}
    text_keys = ('allowed', 'font', 'map', 'size', 'tc', 'tw', 'tz', 'stroke_black', 'fill_black', 'solid', 'width')
    forms, result = [], []
    next_frame = 0

    def before(operator, operands, cm, tm):
        nonlocal next_frame
        if strokes is not None:
            _bars_before(state, strokes, operator, operands, cm)
        if operator == b'q':
            state['q'].append(tuple(state[k] for k in text_keys))
        elif operator == b'Q' and state['q']:
            state.update(zip(text_keys, state['q'].pop()))
        elif operator == b'Do':
            if len(forms) >= 32:
                raise ValueError('IAC form-depth limit')
            forms.append(state.copy())
            obj = _object(_object(state['resources'].get('/XObject', {})).get(operands[0], {})) if operands else {}
            next_frame += 1
            state.update(resources=_object(obj.get('/Resources', {})), allowed=False, frame=next_frame, q=[], path=[])
        elif operator == b'Tf' and operands:
            font = _object(_object(state['resources'].get('/Font', {})).get(operands[0], {}))
            state['allowed'] = font.get('/Encoding') == '/WinAnsiEncoding' and font.get('/ToUnicode') is None
            state['map'] = _native_map(font)
            state['allowed'] |= bool(state['map'])
            state['font'] = font
            state['size'] = float(operands[1]) if len(operands) > 1 else 1
        elif operator in (b'Tc', b'Tw', b'Tz') and operands:
            state[{b'Tc': 'tc', b'Tw': 'tw', b'Tz': 'tz'}[operator]] = float(operands[0])
        elif operator in (b'Tj', b'TJ') and operands and state['allowed']:
            pieces = operands[:1] if operator == b'Tj' else operands[0]
            raw = []
            for piece in pieces:
                if isinstance(piece, bytes):
                    raw.append(piece)
                elif isinstance(piece, (int, float)) and abs(piece) <= 100:
                    continue
                else:
                    return
            text = b''.join(raw)
            decoded = ''.join(state['map'].get(c, '\x00') for c in text) if state['map'] else text.decode('latin1')
            if not text or len(text) > 5000 or not all(32 <= ord(c) < 127 for c in decoded):
                return
            vx, vy = tm[0] * cm[0] + tm[1] * cm[2], tm[0] * cm[1] + tm[1] * cm[3]
            if vx <= 0 or abs(vy) > abs(vx) * 0.01:
                return
            x, y = tm[4] * cm[0] + tm[5] * cm[2] + cm[4], tm[4] * cm[1] + tm[5] * cm[3] + cm[5]
            if not all(math.isfinite(v) and abs(v) < 100000 for v in (x, y)):
                return
            if len(result) >= MAX_FRAGMENTS:
                raise ValueError('IAC positioned-text fragment limit')
            font = state['font']
            widths = _object(font.get('/Widths', []))
            first = int(font.get('/FirstChar', 0))
            end = None
            if all(0 <= c - first < len(widths) for c in text):
                advance = sum(float(widths[c - first]) for c in text) * state['size'] / 1000
                advance += len(text) * state['tc'] + text.count(b' ') * state['tw']
                if operator == b'TJ':
                    advance -= sum(float(v) for v in pieces if isinstance(v, (int, float))) * state['size'] / 1000
                end = x + advance * state['tz'] / 100 * vx
                if not math.isfinite(end):
                    end = None
            result.append({'text': decoded, 'x': round(x, 3), 'y': round(y, 3),
                           'end_x': round(end, 3) if end is not None else None,
                           'font': str(font.get('/BaseFont', '')), 'frame': state['frame']})

    def after(operator, operands, cm, tm):
        if operator == b'Do' and forms:
            state.clear()
            state.update(forms.pop())

    page.extract_text(visitor_operand_before=before, visitor_operand_after=after)
    return _join_words(result)


def axis_from_fragments(fragments, with_positions=False):
    """Pair distinct numeric baselines and nearby IF/FAF labels in one frame."""
    candidates = []
    for frame in sorted({f['frame'] for f in fragments}):
        items = [f for f in fragments if f['frame'] == frame]
        labels = []
        for item in items:
            dme = re.fullmatch(r'DME[- ]+([A-Z]{2,3})(?:\s*\(NM\))?', item['text'])
            threshold = re.fullmatch(r'(D?THR)(?:\s*\(NM\))?', item['text'])
            if not dme and not threshold:
                continue
            unit = '(NM)' in item['text'] or any(f['text'] == '(NM)' and abs(f['y'] - item['y']) <= 2.5 and 0 <= f['x'] - item['x'] <= 100 for f in items)
            if unit:
                labels.append((item, 'DME' if dme else threshold[1], dme[1] if dme else None))

        def numbers(label):
            return sorted((f for f in items if f['x'] > label['x'] + 60 and abs(f['y'] - label['y']) <= 2.5
                           and re.fullmatch(r'\d{1,2}(?:\.\d{1,2})?', f['text']) and float(f['text']) <= 30), key=lambda f: f['x'])

        for dme, kind, station in labels:
            if kind != 'DME':
                continue
            for threshold, basis, _ in labels:
                if basis not in ('THR', 'DTHR') or not 3 <= abs(dme['y'] - threshold['y']) <= 15 or abs(dme['x'] - threshold['x']) > 20:
                    continue
                upper, lower = numbers(dme), numbers(threshold)
                columns, used = [], set()
                for a in upper:
                    matches = [i for i, b in enumerate(lower) if abs(a['x'] - b['x']) <= 6.5]
                    if len(matches) == 1 and matches[0] not in used:
                        used.add(matches[0])
                        columns.append({'dme_nm': float(a['text']), 'threshold_nm': float(lower[matches[0]]['text']), 'x': a['x']})
                    elif float(a['text']) != 0:
                        columns = []
                        break
                if len(columns) < 2 or len(columns) > 12 or len(used) != len(lower):
                    continue
                offsets = [c['dme_nm'] - c['threshold_nm'] for c in columns]
                if max(offsets) - min(offsets) > 0.02:
                    continue
                markers = {'IF': set(), 'FAF': set()}
                y = max(dme['y'], threshold['y'])
                for f in items:
                    if f['text'] not in ('IF', 'FAF', 'FAP') or not 10 <= f['y'] - y <= 150:
                        continue
                    matching = [i for i, c in enumerate(columns) if abs(f['x'] - c['x']) <= 10]
                    if len(matching) == 1:
                        markers['FAF' if f['text'] == 'FAP' else f['text']].add(matching[0])
                candidate = {'schema': 1, 'method': 'native-text-operands', 'station': station,
                    'threshold_reference': basis, 'columns': [{k: v for k, v in c.items() if k != 'x'} for c in columns],
                    'fix_columns': {k: next(iter(v)) for k, v in markers.items() if len(v) == 1}}
                if with_positions:
                    candidate['_positions'] = {'frame': frame, 'baseline': y, 'columns_x': [c['x'] for c in columns]}
                candidates.append(candidate)
    return candidates[0] if len(candidates) == 1 else None


def supplement(page):
    from proc_iac_levels import levels_from_fragments
    strokes = []
    fragments = ascii_fragments(page, strokes)
    axis = axis_from_fragments(fragments, with_positions=True)
    if not axis:
        return []
    levels = levels_from_fragments(fragments, strokes, axis)
    axis.pop('_positions')
    result = [PREFIX + json.dumps(axis, separators=(',', ':'), allow_nan=False)]
    if levels:
        result.append('@@IAC_LEVELS ' + json.dumps(levels, separators=(',', ':'), allow_nan=False))
    return result


def _bars_before(state, strokes, operator, operands, cm):
    """Collect only short solid black horizontal strokes or thin filled rectangles."""
    def black(values, mode):
        values = list(map(float, values))
        if mode == 'gray':
            return len(values) == 1 and abs(values[0]) < 0.01
        if mode == 'rgb':
            return len(values) == 3 and all(abs(v) < 0.01 for v in values)
        return len(values) == 4 and all(abs(v) < 0.01 for v in values[:3]) and abs(values[3] - 1) < 0.01

    if operator in (b'G', b'RG', b'K', b'g', b'rg', b'k'):
        mode = 'gray' if len(operands) == 1 else 'rgb' if len(operands) == 3 else 'cmyk'
        state['stroke_black' if operator.isupper() else 'fill_black'] = black(operands, mode)
    elif operator == b'd' and operands:
        state['solid'] = not operands[0]
    elif operator == b'w' and operands:
        state['width'] = float(operands[0])
    elif operator in (b'm', b'l', b're', b'c', b'v', b'y', b'h'):
        if len(state['path']) >= 1000:
            state['path'] = [('unread', [])]
        else:
            def xy(x, y):
                return (float(x) * cm[0] + float(y) * cm[2] + cm[4], float(x) * cm[1] + float(y) * cm[3] + cm[5])
            if operator == b're':
                x, y, w, h = map(float, operands)
                points = [xy(x, y), xy(x+w, y), xy(x+w, y+h), xy(x, y+h)]
            else:
                points = [xy(operands[i], operands[i+1]) for i in range(0, len(operands)-1, 2)]
            state['path'].append((operator.decode(), points))
    elif operator in (b'S', b's', b'f', b'f*', b'B', b'B*', b'b', b'b*', b'n'):
        path = state['path']
        state['path'] = []
        points = [p for op, ps in path for p in ps]
        line_pairs = ([path[i][1] + path[i+1][1] for i in range(0, len(path), 2)]
                      if path and len(path) % 2 == 0 and [op for op, ps in path] == ['m', 'l'] * (len(path)//2) else [])
        rectangle = ([op for op, ps in path] in (['re'], ['m', 'l', 'l', 'l', 'h'])
                     and len(points) == 4 and len({round(p[0], 2) for p in points}) == 2
                     and len({round(p[1], 2) for p in points}) == 2)
        stroked = (operator in (b'S', b's', b'B', b'B*') and state['solid']
                   and 0 < state['width'] * math.hypot(cm[0], cm[1]) <= 1 and state['stroke_black'])
        filled = operator in (b'f', b'f*', b'B', b'B*', b'b', b'b*') and state['fill_black']
        candidates = [(pair, 0.2) for pair in line_pairs] if stroked else []
        if rectangle and filled:
            candidates.append((points, 1))
        for vertices, thickness in candidates:
            if not all(math.isfinite(v) for p in vertices for v in p):
                continue
            x1, x2 = min(p[0] for p in vertices), max(p[0] for p in vertices)
            y1, y2 = min(p[1] for p in vertices), max(p[1] for p in vertices)
            if 5 <= x2 - x1 <= 100 and y2 - y1 <= thickness:
                if len(strokes) >= MAX_FRAGMENTS:
                    raise ValueError('IAC bar count limit')
                strokes.append({'frame': state['frame'], 'x1': round(x1, 3), 'x2': round(x2, 3), 'y': round((y1+y2)/2, 3)})
