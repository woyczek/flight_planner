"""Read named AIP ground facts from stored AD2 HTML; no invented map positions.

Semantic eAIP TTWY/TAPRON fields, explicit Irish taxiway cells, and unambiguous
holding-point prose. Output is candidate nomenclature, not installed OSM geometry.
"""
import argparse
from collections import Counter
from html import unescape
from html.parser import HTMLParser
import json
from pathlib import Path
import re

from proc_replay import sha, write

PAIR = re.compile(r'(?=<span\b([^>]{0,400})>([^<]{1,200})</span>\s*<span\b([^>]{0,400})>([^<]{1,120})</span>)', re.I)
NAME = re.compile(r'[A-Z0-9][A-Z0-9 /&().\-]{0,79}', re.I)
TWY = re.compile(r'(?:[A-Z][A-Z0-9]{0,4}|(?:LINK|AT)\s*\d{1,2}|F-(?:INNER|OUTER))')
HOLD = re.compile(r'\b(?i:(?:holding (?:position|point)|stop[- ]bar)(?: designated| named)?)\s+([A-Z]{1,2}\d{1,2}(?:-[A-Z0-9]{1,3})?|\d{2}-\d)\b')


class Cells(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack, self.cells, self.rows, self.text = [], [], [], []

    def handle_starttag(self, tag, attrs):
        if tag == 'tr':
            self.stack.append([])
        elif tag in ('td', 'th'):
            self.cells.append([])
        elif tag in ('p', 'br', 'div'):
            self.text.append(' ')

    def handle_data(self, text):
        self.text.append(text)
        if self.cells:
            self.cells[-1].append(text)

    def handle_endtag(self, tag):
        if tag in ('td', 'th') and self.cells:
            cell = ' '.join(' '.join(self.cells.pop()).split())
            if self.stack:
                self.stack[-1].append(cell)
        elif tag == 'tr' and self.stack:
            self.rows.append(self.stack.pop())
        elif tag in ('p', 'br', 'div'):
            self.text.append(' ')


def section(markup, icao, number):
    start = re.search(r'\bid=["\']'+re.escape(icao)+'-AD-'+re.escape(number)+r'["\']', markup)
    if not start:
        return ''
    body = markup[start.end():]
    end = re.search(r'\bid=["\']'+re.escape(icao)+r'-AD-2\.\d+["\']', body)
    return body[:end.start()] if end else body


def read(markup, icao):
    if not re.fullmatch(r'[A-Z]{4}', icao) or len(markup) > 8*1024*1024:
        raise ValueError('invalid or excessive AIP ground source')
    facts, conflicts, by_key = [], set(), {}
    def add(kind, name, sec, evidence, native_id=None):
        name = ' '.join(unescape(name).split())
        if not NAME.fullmatch(name) or name.upper() in ('NIL', 'NONE', 'UNKNOWN', 'N/A'):
            return
        key = (kind, native_id or name.upper())
        fact = {'kind': kind, 'name': name, 'section': 'AD '+sec, 'evidence': evidence[:1000],
                'native_id': native_id, 'position': None, 'geometry': None}
        if key in by_key:
            if by_key[key]['name'] != name:
                conflicts.add(key)
            return
        by_key[key] = fact
    body = section(markup, icao, '2.8')
    for match in PAIR.finditer(body):
        left, value, right, params = match.groups()
        if not re.search(r'\bclass=["\']SD["\']', left) or not re.search(r'\bclass=["\']sdParams["\']', right):
            continue
        field = re.fullmatch(r'(TTWY;TXT_DESIG|TAPRON;TXT_NAME);([0-9]{1,12})', unescape(params).strip())
        if field:
            add('twy' if field[1].startswith('TTWY;') else 'apron', value, '2.8', field[0], field[0])
    parser = Cells()
    parser.feed(body)
    for row in parser.rows:
        while row and not row[0]:
            row = row[1:]
        # Explicit table columns: designator, width, surface, strength. A prose
        # mention or an altimeter/INS check position is never a taxiway here.
        if len(row) == 4 and TWY.fullmatch(row[0].upper()) and re.fullmatch(r'\d+(?:\.\d+)?\s*M', row[1]) and re.fullmatch(r'(?:ASPH|CONC|GRASS)(?:\s*/\s*(?:ASPH|CONC|GRASS))*', row[2]):
            add('twy', row[0], '2.8', ' | '.join(row))
    # Irish named aprons are explicit headings immediately before Surface,
    # rather than a reconstructed designation from arbitrary nearby prose.
    flat = ' '.join(' '.join(parser.text).split())
    for match in re.finditer(r'\b((?:West|East|North|South|Terminal|Main) Apron|East Parking Area|Long Term Parking Area)\s+Surface\s*:', flat):
        add('apron', match[1], '2.8', match[0])
    for sec in ('2.9', '2.20'):
        parser = Cells()
        parser.feed(section(markup, icao, sec))
        flat = ' '.join(' '.join(parser.text).split())
        # Prose must say singular holding point/position or stop-bar followed
        # by a printed identifier containing a digit. Lists and single-letter
        # ambiguous labels remain unread for now.
        for match in HOLD.finditer(flat):
            add('hold', match[1], sec, flat[max(0, match.start()-50):match.end()+120])
    facts = [fact for key, fact in by_key.items() if key not in conflicts]
    return {'icao': icao, 'items': facts, 'conflicting_native_ids': sorted(str(k) for k in conflicts),
            'partial': {'read': ['explicit-AIP-ground-names'], 'unread': ['positions', 'taxiway-lines', 'apron-polygons', 'complete-holding-inventory', 'complete-taxiway-inventory', 'complete-apron-inventory']},
            'installed': False}


def build(root, out):
    root, out = Path(root).resolve(), Path(out)
    manifest = json.loads((root/'inputs-manifest.json').read_text(encoding='utf-8'))
    report = {'scope': 'named AIP facts, no inferred/installed ground geometry', 'countries': {}, 'airports': {}}
    patterns = [('UK', root/'sources/uk', 'EG-AD-2.*-en-GB.html'),
                ('Ireland', root/'work', 'EI-AD-2.*-en-IE.html'),
                ('France', root/'work', 'FR-AD-2.*-fr-FR.html')]
    for country, base, glob in patterns:
        counts, total = Counter(), 0
        for page in sorted(base.rglob(glob)):
            icao = re.search(r'AD-2\.([A-Z]{4})', page.name)[1]
            relative = page.relative_to(root).as_posix()
            source = manifest['files'].get(relative)
            if not source:
                continue
            if sha(page) != source['sha256']:
                raise ValueError('changed AIP source: '+relative)
            markup = page.read_text(encoding='utf-8-sig')
            doc = read(markup, icao)
            cycle = re.search(r'name="EM.effectiveDateStart"\s+content="(\d{4}-\d{2}-\d{2})"', markup)
            doc['source'] = {'file': relative, 'sha256': source['sha256'], 'cycle': cycle[1] if cycle else 'unknown', 'authority': country}
            write(out/country/(icao+'.json'), doc)
            counts.update(f['kind'] for f in doc['items'])
            report['airports'][icao] = {'country': country, 'counts': dict(Counter(f['kind'] for f in doc['items'])), 'source': doc['source']}
            total += 1
        report['countries'][country] = {'ad_inputs': total, 'facts': dict(counts)}
    write(out/'report.json', report)
    return report


if __name__ == '__main__':
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--local', type=Path, required=True)
    cli.add_argument('--out', type=Path, required=True)
    args = cli.parse_args()
    print(json.dumps(build(args.local, args.out)['countries']), flush=True)
