"""Inventory stored visual/aerodrome/ground charts; does not interpret their geometry.

Uses owned NATS index titles, Irish chart-table rows with explicit rowspan context,
and Swedish archive-member names retained in the replay manifest. No acquisition.
"""
import argparse
from collections import Counter
from html.parser import HTMLParser
import json
from pathlib import Path
import re

import uk_package as U
from proc_replay import contained, write


def families(title):
    text = ' '.join(title.upper().replace('_', ' ').split())
    kinds = []
    for kind, pattern in (
        ('visual', r'\b(?:VISUAL APPROACH|VISUAL CIRCUIT|VFR|VAC)\b'),
        ('aerodrome', r'\b(?:AERODROME|HELIPORT) CHART\b|\bAD CHART\b'),
        ('ground', r'\b(?:GROUND MOVEMENT|TAXIWAY|TAXI|GMC)\b'),
        ('parking', r'\b(?:PARKING|DOCKING|APRON|PDC|APDC|PD CHART)\b'),
    ):
        if re.search(pattern, text):
            kinds.append(kind)
    return kinds


class ChartRows(HTMLParser):
    """Keep an index title only for the rows explicitly covered by its rowspan."""
    def __init__(self):
        super().__init__()
        self.rows, self.carry, self.cells, self.links, self.cell = [], [], [], [], None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'tr':
            self.cells = [text for text, n in self.carry]
            self.carry = [(text, n-1) for text, n in self.carry if n > 1]
            self.links = []
        elif tag in ('td', 'th'):
            span = attrs.get('rowspan', '1')
            self.cell = ([], min(100, max(1, int(span))) if span.isdigit() else 1)
        elif tag == 'a' and 'href' in attrs:
            self.links.append(attrs['href'])

    def handle_data(self, text):
        if self.cell is not None:
            self.cell[0].append(text)

    def handle_endtag(self, tag):
        if tag in ('td', 'th') and self.cell is not None:
            chunks, span = self.cell
            text = ' '.join(' '.join(chunks).split())
            self.cells.append(text)
            if span > 1:
                self.carry.append((text, span-1))
            self.cell = None
        elif tag == 'tr':
            self.rows.append((' '.join(self.cells), list(self.links)))


def irish_charts(markup, icao, page_url):
    from proc_ie_public import chart_links
    from html import escape
    from urllib.parse import unquote, urlsplit
    approved = chart_links(markup, icao, page_url)
    parser = ChartRows()
    parser.feed(markup)
    result = {}
    for title, links in parser.rows:
        for href in links:
            name = unquote(urlsplit(href).path.rsplit('/', 1)[-1])
            owned = chart_links('<a href="'+escape(href, quote=True)+'">chart</a>', icao, page_url)
            if name in approved and owned.get(name) == approved[name] and families(title):
                result[name] = {'title': title[:800], 'families': families(title), 'source_url': approved[name]}
    return result


def build(root):
    root = Path(root).resolve()
    manifest = json.loads((root/'inputs-manifest.json').read_text(encoding='utf-8'))
    charts = []
    def add(country, icao, path, title, cycle, **context):
        kinds = families(title)
        if not kinds:
            return
        path = contained(root, path)
        rel = path.relative_to(root).as_posix()
        entry = manifest['files'].get(rel)
        charts.append({'country': country, 'icao': icao, 'file': rel, 'title': title,
                       'families': kinds, 'cycle': cycle, 'stored': bool(entry and path.is_file()),
                       'sha256': entry['sha256'] if entry else None, 'interpretation': 'not-built-by-this-catalogue', **context})

    for page in sorted((root/'sources/uk').rglob('EG-AD-2.*-en-GB.html')):
        icao = re.search(r'AD-2\.([A-Z]{4})', page.name)[1]
        markup = page.read_text(encoding='utf-8-sig')
        for chart in U.chart_index(markup, icao):
            path = page.parents[2]/'graphics'/(chart['pdf']+'.pdf')
            add('UK', icao, path.relative_to(root), chart['title'], U.page_date(markup) or 'unknown', chart=chart['label'])
    for page in sorted((root/'work').glob('ireland-*/raw/*/EI-AD-2.*-en-IE.html')):
        icao = re.search(r'AD-2\.(EI[A-Z]{2})', page.name)[1]
        markup = page.read_text(encoding='utf-8-sig')
        cycle = U.page_date(markup) or 'unknown'
        url = f'https://www.airnav.ie/AIRAC/{cycle}-AIRAC/html/eAIP/{page.name}'
        for name, chart in irish_charts(markup, icao, url).items():
            add('Ireland', icao, (page.parent/name).relative_to(root), chart['title'], cycle, source_url=chart['source_url'])
    for path, entry in manifest['files'].items():
        member = entry.get('archive_member', '')
        match = re.search(r'/Charts/AD/(ES[A-Z]{2})/', member)
        if match:
            add('Sweden', match[1], path, member.rsplit('/', 1)[-1], 'unknown', archive_member=member)
    by_country = {}
    for country in ('UK', 'Ireland', 'Sweden'):
        rows = [c for c in charts if c['country'] == country]
        by_country[country] = {'indexed_charts': len(rows), 'stored_charts': sum(c['stored'] for c in rows),
                               'families': dict(Counter(k for c in rows for k in c['families'])),
                               'surface_charts': sum(any(k != 'visual' for k in c['families']) for c in rows)}
    return {'schema': 1, 'scope': 'selected local packages/index titles; not national VFR completeness or geometry',
            'countries': by_country, 'charts': charts,
            'remaining_country_acquisition': ['Spain / ENAIRE', 'Italy / ENAV', 'Germany / DFS AIP and AIP VFR'],
            'ground_existing': 'tools/regen/ground.py: OpenStreetMap twy/park/hold/apron, separate source from AIP chart geometry'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--local', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    report = build(args.local)
    write(args.out, report)
    print(json.dumps(report['countries']), flush=True)
