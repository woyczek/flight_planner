"""Acquire official AirNav AD2 chart inputs for specified Irish aerodromes.

Cycle-checked public eAIP source, isolated raw/row/candidate outputs. EAD-cached inputs
remain usable separately; no credentials or active-data installation are required.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date
import html
import json
from pathlib import Path
import re
from urllib.parse import quote, unquote, urljoin, urlsplit

import proc_records as R
from proc_local_corpus import read_cached
from proc_national import SourceFetch, atomic, digest, write_json


def indexed_airports(markup, cycle):
    if not re.search(r'name="EM.effectiveDateStart"\s+content="' + re.escape(cycle) + '"', markup):
        raise ValueError('Irish index cycle mismatch')
    codes = sorted(set(re.findall(r'EI-AD-2\.(EI[A-Z]{2})-en-IE\.html', markup)))
    if not codes or len(codes) > 80:
        raise ValueError('empty or excessive Irish AD2 index')
    return codes


def chart_links(markup, icao, page_url):
    links = {}
    for href in re.findall(r'href="([^"<>]+\.pdf)"', markup):
        url = urljoin(page_url, html.unescape(href))
        name = unquote(urlsplit(url).path.rsplit('/', 1)[-1])
        match = re.fullmatch(r'EI_AD_ ?2_' + icao + r'_24[-.](\d{1,2})(?:\.\d+)?(?:_[eE][nN])?\.pdf', name)
        prefix = page_url.split('/html/', 1)[0] + '/graphics/eAIP/'
        if match and int(match[1]) >= 1 and urlsplit(url).hostname == 'www.airnav.ie' and url.rsplit('/', 1)[0] + '/' == prefix:
            links[name] = prefix + quote(name)
    if len(links) > 120:
        raise ValueError('excessive chart index')
    return links


def published_nil(markup, icao):
    section = re.search(r'<div\b[^>]*\bid="' + re.escape(icao) + r'-AD-2\.24"[^>]*>(.*?)</div>', markup, re.S)
    if not section:
        return False
    body = re.split(r'</h4>', section[1], flags=re.I)[-1]
    value = html.unescape(re.sub(r'<[^>]*>', ' ', body))
    return value.strip().upper() == 'NIL'


def build_one(cycle, icao, out, get, page_reader=None):
    if not re.fullmatch(r'EI[A-Z]{2}', icao):
        raise ValueError('Irish ICAO required')
    base = f'https://www.airnav.ie/AIRAC/{cycle}-AIRAC'
    url = base + f'/html/eAIP/EI-AD-2.{icao}-en-IE.html'
    raw = Path(out) / 'raw' / icao
    page = raw / f'EI-AD-2.{icao}-en-IE.html'
    if not page.exists():
        atomic(page, get(url))
    markup = page.read_text(encoding='utf-8-sig')
    if not re.search(r'name="EM.effectiveDateStart"\s+content="' + re.escape(cycle) + '"', markup):
        raise ValueError('source publication cycle mismatch')
    links = chart_links(markup, icao, url)
    nil = not links and published_nil(markup, icao)
    if not links and not nil:
        raise ValueError('no chart inputs indexed')
    errors, sources = {}, {}
    for name, link in sorted(links.items()):
        path = raw / name
        try:
            if not path.exists():
                body = get(link)
                if not body.startswith(b'%PDF-'):
                    raise ValueError('not a PDF')
                atomic(path, body)
            sources[name] = digest(path.read_bytes())
        except (OSError, ValueError) as error:
            errors[name] = type(error).__name__ + ': ' + str(error)[:200]
    def pages(name):
        try:
            return page_reader(raw / name) if page_reader else read_cached(raw / name, out)
        except (OSError, ValueError, RuntimeError, SystemExit) as error:
            errors[name] = type(error).__name__ + ': ' + str(error)[:200]
            return [[]]
    doc = R.build_pdf_dir(icao, sorted(sources), pages, cycle)
    for record in doc['procedures']:
        record['source'].update(kind='airnav', ref='airnav/EI/' + record['source']['file'], url=links[record['source']['file']])
    doc['notice'] = 'Official AirNav Ireland eAIP source; candidate interpretation for the simulation suite.'
    doc['source_build'] = {'authority': 'AirNav Ireland', 'cycle': cycle, 'source_url': url,
                           'sources': sources, 'indexed': links, 'errors': errors, 'installed': False,
                           'index_status': 'published-NIL' if nil else 'indexed-PDF-links'}
    write_json(Path(out) / 'procedures' / cycle / (icao + '.json'), doc)
    return {'icao': icao, 'cycle': cycle, 'state': 'source-build-finished', 'index_status': doc['source_build']['index_status'], 'records': len(doc['procedures']),
            'wanted_files': len(links), 'acquired_files': len(sources), 'missing': sorted(set(links) - set(sources)),
            'errors': errors, 'partial_records': sum(bool(p.get('partial')) for p in doc['procedures']),
            'doubt_records': sum(p.get('status') == 'doubt' for p in doc['procedures']),
            'formats_unread': [f for f in doc['formats'] if not f.get('ok')]}


def run(cycle, out, airports=('EIDW',), workers=2, get=None):
    date.fromisoformat(cycle)
    get = get or SourceFetch()
    discovery = None
    if airports == 'all':
        url = f'https://www.airnav.ie/AIRAC/{cycle}-AIRAC/html/eAIP/EI-AD-1.3-en-IE.html'
        path = Path(out) / 'raw/EI-AD-1.3-en-IE.html'
        if not path.exists():
            atomic(path, get(url))
        indexed = indexed_airports(path.read_text(encoding='utf-8-sig'), cycle)
        airports = (['EIDW'] if 'EIDW' in indexed else []) + [c for c in indexed if c != 'EIDW']
        discovery = {'url': url, 'sha256': digest(path.read_bytes()), 'indexed_aerodromes': indexed}
    elif isinstance(airports, str):
        raise ValueError('airports must be a list or all')
    airports = list(dict.fromkeys(airports))
    if not airports:
        raise ValueError('at least one Irish aerodrome is required')
    report = {'schema': 1, 'cycle': cycle, 'scope': 'official-irish-ad2-chart-inputs-not-complete-procedure-interpretation',
              'selected_aerodromes': airports, 'results': {}}
    if discovery:
        report['discovery'] = discovery
    with ThreadPoolExecutor(max_workers=max(1, min(workers, 4))) as pool:
        futures = {pool.submit(build_one, cycle, code, out, get): code for code in airports}
        for future in as_completed(futures):
            code = futures[future]
            try:
                row = future.result()
            except Exception as error:
                row = {'icao': code, 'state': 'failed', 'error': type(error).__name__ + ': ' + str(error)[:300]}
            report['results'][code] = row
            write_json(Path(out) / 'report.json', report)
            print(json.dumps(row), flush=True)
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cycle', required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--icao', nargs='+', default=['EIDW'])
    parser.add_argument('--all', action='store_true', help='all AD2 links from the cycle-checked official AD1.3 index')
    args = parser.parse_args()
    report = run(args.cycle, args.out, 'all' if args.all else args.icao)
    raise SystemExit(1 if any(r.get('state') == 'failed' for r in report['results'].values()) else 0)
