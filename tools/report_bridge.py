"""Pont du registre (V3 → V2), appelé par le lanceur (tools/launch.py) à chaque lot d'écritures du frame
(/__setup/batch) et à chaque échange (/__setup/sync) : chaque compte rendu de la V3 (data/cr/reports/<année>/<id>.json,
schéma sog-report/1, modules/report/SPEC.md § 4) est rejoué dans le registre V2 data/cr/missions.yaml.

  · entrée V2 = la fiche sans schema, updated_at et by ; identité famille | n° de CR (metadata.missionId, en
    majuscules) | date (metadata.date), la clé du registre V2 (shared/mission_core/ledger.js) ;
  · clé absente du registre : entrée ajoutée en fin de liste ; clé présente : remplacée si la fiche y apporte une
    valeur différente (une clé que la V2 a ajoutée seule, ses valeurs par défaut, ne compte pas) ; jamais rien de
    retiré, jamais l'inverse (le registre ne réécrit aucune fiche) ;
  · seules les entrées remplacées ou ajoutées sont réécrites, au format exact de la V2 (M.toYaml : js-yaml, toutes les
    chaînes entre guillemets doubles, retrait de 2) ; le reste du fichier garde son texte ;
  · updatedAt du registre : le plus grand des updated_at des fiches rejouées, au moins l'ancien + 1 ms, calculé de la
    même façon sur chaque poste (deux postes qui rejouent les mêmes fiches écrivent le même fichier) ;
  · le texte produit est relu et comparé à ce qu'il doit contenir avant d'être écrit ; registre illisible : rien
    n'est écrit.

Bibliothèque standard seulement : le YAML lu et écrit est le sous-ensemble que produit la V2 (blocs, chaînes entre
guillemets, null, booléens, nombres, [] et {}).
Essai : python tools/report_bridge.py --essai ; sur un dossier : python tools/report_bridge.py <data> [--dry-run]
"""
import datetime as dt
import json
import os
import re
import sys
import threading

LOCK = threading.Lock()
REGISTRY = ('cr', 'missions.yaml')
REPORTS = ('cr', 'reports')
DROP = ('schema', 'updated_at', 'by')

# ---------------------------------------------------------------- écriture (comme js-yaml dump, forceQuotes, '"')
ESC = {0x00: '\\0', 0x07: '\\a', 0x08: '\\b', 0x09: '\\t', 0x0A: '\\n', 0x0B: '\\v', 0x0C: '\\f', 0x0D: '\\r',
       0x1B: '\\e', 0x22: '\\"', 0x5C: '\\\\', 0x85: '\\N', 0xA0: '\\_', 0x2028: '\\L', 0x2029: '\\P'}
PLAIN_KEY = re.compile(r'[A-Za-z_][A-Za-z0-9_-]*')
AMBIGUOUS = re.compile(r'(?:~|null|Null|NULL|true|True|TRUE|false|False|FALSE|[-+]?[0-9_]+(?:\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?'
                       r'|[-+]?\.(?:inf|Inf|INF)|\.(?:nan|NaN|NAN))')


def printable(c):
    """Caractère écrit tel quel par js-yaml dans une chaîne entre guillemets doubles."""
    return (0x20 <= c <= 0x7E or (0xA1 <= c <= 0xD7FF and c not in (0x2028, 0x2029)) or (0xE000 <= c <= 0xFFFD and c != 0xFEFF)
            or 0x10000 <= c <= 0x10FFFF)


def dq(s):
    """Chaîne entre guillemets doubles, échappements de js-yaml."""
    out = []
    for ch in s:
        c = ord(ch)
        if c in ESC:
            out.append(ESC[c])
        elif printable(c):
            out.append(ch)
        else:
            out.append('\\x%02X' % c if c <= 0xFF else '\\u%04X' % c if c <= 0xFFFF else '\\U%08X' % c)
    return '"' + ''.join(out) + '"'


def num(v):
    """Nombre écrit comme JavaScript l'écrit (3.0 → 3, 1e-07 → 1e-7)."""
    if isinstance(v, float) and v.is_integer() and abs(v) < 1e21:
        return str(int(v))
    s = repr(v)
    s = re.sub(r'e([-+])0*(\d)', r'e\1\2', s)
    return s.replace('e', '.e') if re.fullmatch(r'[-+]?[0-9]+e[-+]?[0-9]+', s) else s


def scalar(v):
    if v is None:
        return 'null'
    if v is True:
        return 'true'
    if v is False:
        return 'false'
    if isinstance(v, (int, float)):
        return num(v)
    return dq(str(v))


def key(k):
    k = str(k)
    return k if PLAIN_KEY.fullmatch(k) and not AMBIGUOUS.fullmatch(k) else dq(k)


def dump_map(m, n):
    """Lignes d'un objet non vide, clés en colonne n."""
    pad, out = ' ' * n, []
    for k, v in m.items():
        if isinstance(v, dict) and v:
            out += [f'{pad}{key(k)}:', *dump_map(v, n + 2)]
        elif isinstance(v, list) and v:
            out += [f'{pad}{key(k)}:', *dump_seq(v, n + 2)]
        else:
            out.append(f'{pad}{key(k)}: {"{}" if isinstance(v, dict) else "[]" if isinstance(v, list) else scalar(v)}')
    return out


def dump_seq(s, n):
    """Lignes d'une liste non vide, tirets en colonne n."""
    pad, out = ' ' * n, []
    for v in s:
        if isinstance(v, (dict, list)) and v:
            lines = dump_map(v, n + 2) if isinstance(v, dict) else dump_seq(v, n + 2)
            out += [pad + '- ' + lines[0][n + 2:], *lines[1:]]
        else:
            out.append(f'{pad}- {"{}" if isinstance(v, dict) else "[]" if isinstance(v, list) else scalar(v)}')
    return out


# ---------------------------------------------------------------- lecture (le sous-ensemble écrit par la V2)
DQ = re.compile(r'"(?:[^"\\]|\\.)*"')
SQ = re.compile(r"'(?:[^']|'')*'")
KEYLINE = re.compile(r'("(?:[^"\\]|\\.)*"|[^\s"\'#\-?:,\[\]{}][^:]*?|-[^\s:][^:]*?):(?:[ \t]+(.*))?$')
UNESC = {'0': '\0', 'a': '\a', 'b': '\b', 't': '\t', '\t': '\t', 'n': '\n', 'v': '\v', 'f': '\f', 'r': '\r', 'e': '\x1b',
         ' ': ' ', '"': '"', '/': '/', '\\': '\\', 'N': '\x85', '_': '\xa0', 'L': ' ', 'P': ' '}


class Unreadable(ValueError):
    pass


def undq(s):
    """Texte d'une chaîne YAML entre guillemets doubles (sur une ligne)."""
    out, i, body = [], 0, s[1:-1]
    while i < len(body):
        ch = body[i]
        if ch != '\\':
            out.append(ch)
            i += 1
            continue
        e = body[i + 1] if i + 1 < len(body) else ''
        if e in UNESC:
            out.append(UNESC[e])
            i += 2
        elif e in 'xuU':
            w = {'x': 2, 'u': 4, 'U': 8}[e]
            out.append(chr(int(body[i + 2:i + 2 + w], 16)))
            i += 2 + w
        else:
            raise Unreadable(f'échappement inconnu : \\{e}')
    return ''.join(out)


def parse_scalar(t):
    t = t.strip()
    if t.startswith('"'):
        if not DQ.fullmatch(t):
            raise Unreadable(f'chaîne : {t[:60]}')
        return undq(t)
    if t.startswith("'"):
        if not SQ.fullmatch(t):
            raise Unreadable(f'chaîne : {t[:60]}')
        return t[1:-1].replace("''", "'")
    if t in ('', '~', 'null', 'Null', 'NULL'):
        return None
    if t in ('true', 'True', 'TRUE'):
        return True
    if t in ('false', 'False', 'FALSE'):
        return False
    if t == '[]':
        return []
    if t == '{}':
        return {}
    if t[0] in '[{':
        try:
            return json.loads(t)
        except ValueError:
            raise Unreadable(f'collection : {t[:60]}')
    if re.fullmatch(r'[-+]?(0|[1-9][0-9]*)', t):
        return int(t)
    if re.fullmatch(r'[-+]?(\.[0-9]+|[0-9]+(\.[0-9]*)?)([eE][-+]?[0-9]+)?', t):
        return float(t)
    if t.startswith(('|', '>', '&', '*', '!')):
        raise Unreadable(f'forme non prise en charge : {t[:60]}')
    return t


def lines_of(text):
    """[(retrait, contenu)] des lignes utiles (ni vides ni commentaires)."""
    out = []
    for raw in text.split('\n'):
        s = raw.rstrip('\r')
        if not s.strip() or s.lstrip().startswith('#'):
            continue
        if '\t' in s[:len(s) - len(s.lstrip())]:
            raise Unreadable('tabulation dans un retrait')
        out.append([len(s) - len(s.lstrip(' ')), s.strip()])
    return out


def parse_node(L, i, n):
    """Valeur commençant à la ligne i, en colonne n ; rend (valeur, ligne suivante)."""
    if L[i][1] == '-' or L[i][1].startswith('- '):
        return parse_seq(L, i, n)
    return parse_map(L, i, n)


def child(L, i, n, seq_ok):
    """Valeur placée sous une clé ou un tiret (lignes suivantes plus en retrait, ou liste au même retrait)."""
    if i < len(L) and (L[i][0] > n or (seq_ok and L[i][0] == n and (L[i][1] == '-' or L[i][1].startswith('- ')))):
        return parse_node(L, i, L[i][0])
    return None, i


def parse_map(L, i, n):
    out = {}
    while i < len(L) and L[i][0] == n and not (L[i][1] == '-' or L[i][1].startswith('- ')):
        m = KEYLINE.match(L[i][1])
        if not m:
            raise Unreadable(f'ligne : {L[i][1][:60]}')
        k = undq(m.group(1)) if m.group(1).startswith('"') else m.group(1).strip()
        rest = m.group(2)
        if rest is None or rest.strip() == '':
            out[k], i = child(L, i + 1, n, True)
        else:
            out[k], i = parse_scalar(rest), i + 1
    if i < len(L) and L[i][0] > n:
        raise Unreadable(f'retrait inattendu : {L[i][1][:60]}')
    return out, i


def parse_seq(L, i, n):
    out = []
    while i < len(L) and L[i][0] == n and (L[i][1] == '-' or L[i][1].startswith('- ')):
        rest = L[i][1][1:].lstrip(' ')
        if not rest:
            v, i = child(L, i + 1, n, False)
            out.append(v)
        elif rest == '-' or rest.startswith('- ') or (KEYLINE.match(rest) and not DQ.fullmatch(rest) and not SQ.fullmatch(rest)):
            # « - clé: valeur » ou « - - x » : la suite de la ligne ouvre un bloc en colonne n + 2
            L[i] = [n + 2, rest]
            v, i = parse_node(L, i, n + 2)
            out.append(v)
        else:
            out.append(parse_scalar(rest))
            i += 1
    if i < len(L) and L[i][0] > n:
        raise Unreadable(f'retrait inattendu : {L[i][1][:60]}')
    return out, i


def load(text):
    """Document YAML (sous-ensemble de la V2) ; Unreadable sinon."""
    L = lines_of(text)
    if not L:
        return None
    v, i = parse_node(L, 0, L[0][0])
    if i != len(L):
        raise Unreadable(f'contenu après la fin : {L[i][1][:60]}')
    return v


# ---------------------------------------------------------------- le pont
def ident(m):
    md = m.get('metadata') if isinstance(m.get('metadata'), dict) else {}
    return f"{m.get('family') or ''}|{str(md.get('missionId') or '').strip().upper()}|{md.get('date') or ''}"


def covers(have, want):
    """Vrai si have contient déjà tout ce que want apporte (clés en plus de have ignorées)."""
    if isinstance(want, dict):
        return isinstance(have, dict) and all(k in have and covers(have[k], v) for k, v in want.items())
    if isinstance(want, list):
        return isinstance(have, list) and len(have) == len(want) and all(covers(a, b) for a, b in zip(have, want))
    if isinstance(want, (int, float)) and not isinstance(want, bool) and isinstance(have, (int, float)) and not isinstance(have, bool):
        return float(have) == float(want)
    return have == want


def entry_of(record):
    return {k: v for k, v in record.items() if k not in DROP}


def records(data):
    """[(chemin relatif, fiche)] des comptes rendus de data/cr/reports/<année>/<id>.json (schéma sog-report/1)."""
    root, out = os.path.join(data, *REPORTS), []
    if not os.path.isdir(root):
        return out
    for year in sorted(os.listdir(root)):
        d = os.path.join(root, year)
        if year.startswith(('_', '.')) or not os.path.isdir(d):
            continue
        for f in sorted(os.listdir(d)):
            if not f.endswith('.json') or f.startswith(('_', '.')):
                continue
            try:
                with open(os.path.join(d, f), encoding='utf-8-sig') as fh:
                    r = json.load(fh)
            except (OSError, ValueError):
                continue
            if isinstance(r, dict) and r.get('schema') == 'sog-report/1' and r.get('family'):
                out.append((f'cr/reports/{year}/{f}', r))
    return out


def iso_ms(s):
    """Date ISO → datetime UTC (None si illisible)."""
    try:
        d = dt.datetime.fromisoformat(str(s).replace('Z', '+00:00'))
        return d.astimezone(dt.timezone.utc) if d.tzinfo else d.replace(tzinfo=dt.timezone.utc)
    except ValueError:
        return None


def stamp(d):
    return d.strftime('%Y-%m-%dT%H:%M:%S.') + f'{d.microsecond // 1000:03d}Z'


HEADER = ('# Registre des missions — toutes familles — Mission Report — SO Group Virtual',)


def bridge(data, write=True):
    """Rejoue les comptes rendus dans le registre. Rend { changed: [clés], added: [clés], error? }."""
    res = {'changed': [], 'added': []}
    recs = records(data)
    if not recs:
        return res
    path = os.path.join(data, *REGISTRY)
    with LOCK:
        try:
            raw = open(path, encoding='utf-8-sig', newline='').read() if os.path.isfile(path) else ''
        except OSError as e:
            return {**res, 'error': str(e)}
        nl = '\r\n' if '\r\n' in raw else '\n'
        text = raw.replace('\r\n', '\n')
        try:
            doc = load(text) if text.strip() else {'schemaVersion': 2, 'updatedAt': '', 'legacyImported': {}, 'missions': []}
        except Unreadable as e:
            return {**res, 'error': f'registre illisible : {e}'}
        if not isinstance(doc, dict) or not isinstance(doc.get('missions') or [], list):
            return {**res, 'error': 'registre sans liste missions'}
        missions = list(doc.get('missions') or [])
        where = {ident(m): i for i, m in enumerate(missions) if isinstance(m, dict)}
        newest = None
        for _, r in recs:
            e, k = entry_of(r), ident(r)
            if k in where:
                if covers(missions[where[k]], e):
                    continue
                missions[where[k]] = e
                res['changed'].append(k)
            else:
                where[k] = len(missions)
                missions.append(e)
                res['added'].append(k)
            u = iso_ms(r.get('updated_at'))
            if u and (newest is None or u > newest):
                newest = u
        touched = set(res['changed']) | set(res['added'])
        if not touched:
            return res
        old = iso_ms(doc.get('updatedAt'))
        floor = old + dt.timedelta(milliseconds=1) if old else None
        when = max([d for d in (newest, floor) if d] or [dt.datetime.now(dt.timezone.utc)])
        out = rewrite(text, doc, missions, touched, stamp(when))
        # contrôle : le texte relu est exactement ce qu'il doit être
        expect = {**doc, 'updatedAt': stamp(when), 'missions': missions}
        try:
            if load(out) != json.loads(json.dumps(expect)):
                return {**res, 'error': 'contrôle du registre réécrit en échec : rien écrit'}
        except Unreadable as e:
            return {**res, 'error': f'contrôle du registre réécrit en échec ({e}) : rien écrit'}
        if write:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            tmp = path + '.tmp'
            with open(tmp, 'w', encoding='utf-8', newline='') as f:
                f.write(out.replace('\n', nl))
            os.replace(tmp, path)
        res['updatedAt'] = stamp(when)
        return res


def rewrite(text, doc, missions, touched, when):
    """Texte du registre : en-tête (updatedAt), entrées touchées réécrites, nouvelles ajoutées, le reste inchangé."""
    if not text.strip():
        head = [*HEADER, f'# schemaVersion 2 — {when}', 'schemaVersion: 2', f'updatedAt: {dq(when)}', 'legacyImported: {}']
        return '\n'.join([*head, 'missions:', *dump_seq(missions, 2)]) + '\n'
    lines = text.split('\n')
    start = next((i for i, l in enumerate(lines) if re.match(r'missions:\s*(\[\])?\s*$', l)), None)
    if start is None:
        raise Unreadable('ligne missions: absente')
    end = next((i for i in range(start + 1, len(lines)) if lines[i] and not lines[i].startswith((' ', '#'))), len(lines))
    items = [i for i in range(start + 1, end) if lines[i].startswith('  - ') or lines[i] == '  -']
    blocks = [lines[a:b] for a, b in zip(items, items[1:] + [end])]
    # lignes vides finales du dernier bloc : gardées après la liste
    tail = []
    while blocks and blocks[-1] and not blocks[-1][-1].strip():
        tail.insert(0, blocks[-1].pop())
    if not blocks:
        while end > start + 1 and not lines[end - 1].strip():
            end -= 1
            tail.insert(0, '')
    body = []
    for i, m in enumerate(missions):
        if i < len(blocks) and ident(m) not in touched:
            body += blocks[i]
        else:
            body += dump_seq([m], 2)
    head = lines[:start]
    for j, l in enumerate(head):
        if re.match(r'updatedAt:', l):
            head[j] = f'updatedAt: {dq(when)}'
            break
    else:
        at = next((j + 1 for j, l in enumerate(head) if l.startswith('schemaVersion:')), len(head))
        head.insert(at, f'updatedAt: {dq(when)}')
    for j, l in enumerate(head):
        if re.match(r'# schemaVersion \S+ — ', l):
            head[j] = re.sub(r'— .*$', f'— {when}', l)
            break
    return '\n'.join([*head, 'missions:', *body, *tail, *lines[end:]])


# ---------------------------------------------------------------- essai
def _essai():  # pragma: no cover
    import tempfile
    ok = True

    def check(cond, what):
        nonlocal ok
        print(('  ok  ' if cond else '  ÉCHEC ') + what)
        ok = ok and cond

    sample = {'schemaVersion': 2, 'family': 'HEMS', 'series': 'Primary HEMS', 'subtype': '',
              'metadata': {'missionId': 'CRM-A01-0', 'date': '2026-09-23', 'timeLocal': '10:05', 'reportedBy': 'RBR'},
              'aircraft': [{'type': 'EC135', 'massTakeoff': None, 'equipment': [], 'crewSeats': 4.0}],
              'crew': [{'role': 'PIC', 'name': 'RBR', 'aircraft': 1}],
              'remarks': {'observations': 'ligne 1\nligne 2 « guillemets » "doubles" \\ tab\t nbsp\xa0 fine ', 'x': {}},
              'statistics': {'ratio': 0.125, 'big': 1e-7, 'flag': True}, 'capabilities': ['NVG', 'HOIST'], 'legs': []}
    lines = dump_seq([sample], 2)
    back = load('missions:\n' + '\n'.join(lines))['missions'][0]
    check(back == json.loads(json.dumps(sample)), 'écriture relue à l’identique')
    check(back['remarks']['observations'] == sample['remarks']['observations'], 'échappements relus à l’identique')
    check('crewSeats: 4' in '\n'.join(lines) and 'big: 1.e-7' in '\n'.join(lines), 'nombres écrits comme JavaScript')
    with tempfile.TemporaryDirectory() as d:
        os.makedirs(os.path.join(d, 'cr', 'reports', '2026'))
        rec = {'schema': 'sog-report/1', 'updated_at': '2026-10-22T08:00:00.000Z', 'by': 'TST', **sample}
        rec['metadata'] = {**sample['metadata'], 'missionId': 'CRM-A02-0'}
        open(os.path.join(d, 'cr', 'reports', '2026', 'CRM-A02-0.json'), 'w', encoding='utf-8').write(json.dumps(rec))
        reg = ('# Registre des missions — toutes familles — Mission Report — SO Group Virtual\n'
               '# schemaVersion 2 — 2026-10-19T13:41:02.158Z\nschemaVersion: 2\nupdatedAt: "2026-10-19T13:41:02.154Z"\n'
               'legacyImported:\n  HEMS: "2026-09-23T19:17:08.587Z"\nmissions:\n' + '\n'.join(lines) + '\n')
        open(os.path.join(d, 'cr', 'missions.yaml'), 'w', encoding='utf-8', newline='').write(reg)
        r = bridge(d)
        out = open(os.path.join(d, 'cr', 'missions.yaml'), encoding='utf-8').read()
        check(r['added'] == ['HEMS|CRM-A02-0|2026-09-23'] and not r.get('error'), 'compte rendu ajouté')
        check(out.startswith(reg.split('missions:\n')[0].replace('2026-10-19T13:41:02.154Z', '2026-10-22T08:00:00.000Z')
                             .replace('2026-10-19T13:41:02.158Z', '2026-10-22T08:00:00.000Z')), 'en-tête : updatedAt')
        check(out.count('  - schemaVersion: 2') == 2 and '\n'.join(lines) in out, 'entrée existante gardée mot pour mot')
        check('updated_at' not in out and '"sog-report/1"' not in out and 'by: ' not in out, 'schema, updated_at, by retirés')
        check(bridge(d) == {'changed': [], 'added': []}, 'deuxième passage : rien à faire')
        rec['remarks'] = {**rec['remarks'], 'observations': 'corrigé'}
        rec['updated_at'] = '2026-10-21T00:00:00.000Z'  # plus ancien que le registre : updatedAt + 1 ms
        open(os.path.join(d, 'cr', 'reports', '2026', 'CRM-A02-0.json'), 'w', encoding='utf-8').write(json.dumps(rec))
        r = bridge(d)
        out2 = open(os.path.join(d, 'cr', 'missions.yaml'), encoding='utf-8').read()
        check(r['changed'] == ['HEMS|CRM-A02-0|2026-09-23'] and r['updatedAt'] == '2026-10-22T08:00:00.001Z', 'entrée remplacée')
        check(out2.count('observations: "corrigé"') == 1 and out2.count('  - schemaVersion: 2') == 2, 'une seule entrée par clé')
        reg2 = out2.replace('      reportedBy: "RBR"\n', '      reportedBy: "RBR"\n      extraV2: "défaut"\n', 1)
        open(os.path.join(d, 'cr', 'missions.yaml'), 'w', encoding='utf-8', newline='').write(reg2)
        check(bridge(d) == {'changed': [], 'added': []}, 'clé ajoutée par la V2 seule : pas de réécriture')
        open(os.path.join(d, 'cr', 'missions.yaml'), 'w', encoding='utf-8', newline='').write('missions:\n  - a: |\n      x\n')
        r = bridge(d)
        check(bool(r.get('error')), 'registre illisible : rien écrit')
        os.remove(os.path.join(d, 'cr', 'missions.yaml'))
        r = bridge(d)
        out3 = open(os.path.join(d, 'cr', 'missions.yaml'), encoding='utf-8').read()
        check(r['added'] and load(out3)['missions'][0]['metadata']['missionId'] == 'CRM-A02-0', 'registre absent : créé')
    print('essai :', 'réussi' if ok else 'ÉCHEC')
    return ok


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    if '--essai' in sys.argv:
        sys.exit(0 if _essai() else 1)
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args:
        sys.exit(__doc__)
    print(json.dumps(bridge(args[0], write='--dry-run' not in sys.argv), ensure_ascii=False, indent=1))
