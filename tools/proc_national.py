"""Resumable SIA national source build, isolated from installed procedure data.

Discover the AD 2 denominator from the official cycle menu, acquire only the
existing reader's DATA/CODE/ILS-LOC inputs, and keep missing/unread sources in
the coverage report. This is a source build, never a regression runner.
"""
import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import threading
import time
import urllib.request
from urllib.parse import quote
from html.parser import HTMLParser
import re

import outbound
import proc_sia as S
from proc_pdf import all_pages_rows, iac_pages_rows, PdfTimeout
from proc_fr_iac import is_final_chart


def digest(body):
    return hashlib.sha256(body).hexdigest()


def atomic(path, body):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + '.part')
    temp.write_bytes(body)
    temp.replace(path)


def write_json(path, value):
    atomic(path, (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))


def signature():
    root = Path(__file__).parent
    names = ['proc_sia', 'proc_fr_iac', 'proc_iac_positions', 'proc_iac_levels', 'proc_records',
             'proc_layouts', 'proc_se', 'proc_pdf', 'proc_geometry', 'proc_arc', 'proc_national']
    return digest(b''.join((root / (name + '.py')).read_bytes() for name in names if (root / (name + '.py')).is_file()))   # un lecteur absent de ce dépôt (un autre État, un autre lot) ne casse pas l'import : la signature porte sur ceux qui y sont


PROCESS_SIGNATURE = signature()


class EnrRows(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows, self.row, self.cell = [], None, None

    def handle_starttag(self, tag, attrs):
        if tag == 'tr':
            self.row = []
        if tag in ('td', 'th') and self.row is not None:
            self.cell = []

    def handle_data(self, value):
        if self.cell is not None:
            self.cell.append(value)

    def handle_endtag(self, tag):
        if tag in ('td', 'th') and self.cell is not None:
            self.row.append(' '.join(''.join(self.cell).split()))
            self.cell = None
        if tag == 'tr' and self.row is not None:
            self.rows.append(self.row)
            self.row = None


def enr_coordinates(points_html, navaids_html):
    positions, conflicts = {}, set()
    for body, is_navaid in [(points_html, False), (navaids_html, True)]:
        parser = EnrRows()
        parser.feed(body)
        for row in parser.rows:
            name_col, coord_col = (2, 5) if is_navaid else (0, 1)
            if len(row) <= coord_col or not re.fullmatch(r'[A-Z0-9]{2,5}' if is_navaid else r'[A-Z]{5}', row[name_col]):
                continue
            name, pos = row[name_col], S.dms(row[coord_col])
            if pos is None or not (-90 <= pos[0] <= 90 and -180 <= pos[1] <= 180) or name in conflicts:
                continue
            if name in positions and positions[name] != pos:
                conflicts.add(name)
                positions.pop(name)
            else:
                positions[name] = pos
    return positions, sorted(conflicts)


class SourceFetch:
    def __init__(self, interval=0.25):
        self.interval, self.lock, self.next = interval, threading.Lock(), 0

    def __call__(self, url):
        with self.lock:
            delay = self.next - time.monotonic()
            if delay > 0:
                time.sleep(delay)
            self.next = time.monotonic() + self.interval
        with outbound.urlopen(urllib.request.Request(url), timeout=30) as response:
            body = response.read(20 * 1024 * 1024 + 1)
        if len(body) > 20 * 1024 * 1024:
            raise ValueError('source-size-limit')
        return body


def build_one(icao, cycle, out, get, reader_signature, resolve=None, page_reader=None, eaip=None):
    out = Path(out)
    raw, eaip = out / 'raw' / icao, eaip or S.eaip_url(cycle)
    page_path = raw / S.page_name(icao)
    if not page_path.exists():
        atomic(page_path, get(eaip + '/html/eAIP/' + S.page_name(icao)))
    html = page_path.read_text(encoding='utf-8')
    files = S.pdf_names(icao, html)
    wanted = S.procedure_files(files)
    missing, sources, errors = [], {}, {}
    for name in wanted:
        path = raw / name
        try:
            if not path.exists():
                body = get(f'{eaip}/html/eAIP/Cartes/{icao}/{quote(name)}')
                if not body.startswith(b'%PDF-'):
                    raise ValueError('not-a-pdf')
                atomic(path, body)
            sources[name] = digest(path.read_bytes())
        except (OSError, ValueError) as error:
            missing.append(name)
            errors[name] = type(error).__name__ + ': ' + str(error)[:300]
    source_signature = digest(json.dumps([digest(html.encode('utf-8')), sources, missing], sort_keys=True).encode())
    result_path = out / 'procedures' / cycle / (icao + '.json')
    if result_path.exists():
        old = json.loads(result_path.read_text(encoding='utf-8'))
        provenance = old.get('corpus_build') or {}
        if (provenance.get('reader_signature') == reader_signature and provenance.get('source_signature') == source_signature
                and not provenance.get('errors')):
            return coverage(old, wanted, missing, errors)
    pages_cache = {}

    def pages(name):
        if name in pages_cache:
            return pages_cache[name]
        if name not in sources:
            return [[]]
        extract_signature = digest(b''.join((Path(__file__).parent / (n + '.py')).read_bytes()
                                           for n in ('proc_pdf', 'proc_iac_positions', 'proc_iac_levels')))
        row_path = out / 'rows' / extract_signature / (sources[name] + '.json')
        try:
            if row_path.exists():
                result = json.loads(row_path.read_text(encoding='utf-8'))
            else:
                fn = page_reader or (iac_pages_rows if is_final_chart(name) else all_pages_rows)
                result = fn(raw / name)
                write_json(row_path, result)
        except (OSError, ValueError, RuntimeError, SystemExit, PdfTimeout) as error:
            errors[name] = type(error).__name__ + ': ' + str(error)[:300]
            result = [[]]
        pages_cache[name] = result
        return result

    doc = S.build_aerodrome(icao, files, lambda name: (pages(name) or [[]])[0], eaip, cycle,
                            resolve=resolve, ad2=html, pages_of=pages, iac_pages_of=pages)
    doc['corpus_build'] = {'reader_signature': reader_signature, 'source_signature': source_signature,
                           'sources': sources, 'missing': missing, 'errors': errors,
                           'scope': 'candidate-source-build-not-installed'}
    write_json(result_path, doc)
    return coverage(doc, wanted, missing, errors)


def coverage(doc, wanted, missing, errors):
    records, formats = doc.get('procedures') or [], doc.get('formats') or []
    return {'icao': doc['icao'], 'state': 'source-build-finished', 'cycle': doc['cycle'],
            'wanted_files': len(wanted), 'acquired_files': len(wanted) - len(missing),
            'final_iacs_indexed': sum(is_final_chart(n) for n in wanted),
            'profiles_read': len(doc.get('approach_profiles') or []),
            'records': len(records), 'by_kind': dict(Counter(p['kind'] for p in records)),
            'partial_records': sum(bool(p.get('partial')) for p in records),
            'doubt_records': sum(p.get('status') == 'doubt' for p in records),
            'formats_read': sum(bool(f.get('ok')) for f in formats),
            'formats_unread': [{'file': f['file'], 'page': f.get('page'), 'reason': f.get('reason'),
                                 'problems': f.get('problems')} for f in formats if not f.get('ok')],
            'missing': missing, 'errors': errors}


def run(cycle, out, workers=4, codes=None, get=None, resolve=None, region='FRANCE', publication_url=None):
    out, get = Path(out), get or SourceFetch()
    if publication_url:
        disc = S.eaip_url(cycle).rsplit('/FRANCE/', 1)[0]
        if not re.fullmatch(re.escape(disc+'/'+region+'/AIRAC-') + r'\d{4}-\d{2}-\d{2}', publication_url):
            raise ValueError('replay publication URL does not match its disc/region')
    eaip = publication_url or S.region_eaip(cycle, region, get)
    if not eaip:
        raise ValueError('regional publication date unavailable: ' + region)
    menu = out / 'raw' / 'FR-menu-fr-FR.html'
    if not menu.exists():
        atomic(menu, get(eaip + '/html/eAIP/FR-menu-fr-FR.html'))
    indexed = S.icao_list(menu.read_text(encoding='utf-8'))
    selected = indexed if codes is None else [code for code in indexed if code in codes]
    enr_sources, enr_errors = {}, {}
    if resolve is None:
        for section in ('4.4', '4.1'):
            name = f'FR-ENR-{section}-fr-FR.html'
            path = out / 'raw' / name
            try:
                if not path.exists():
                    atomic(path, get(eaip + '/html/eAIP/' + name))
                enr_sources[section] = path.read_text(encoding='utf-8')
            except (OSError, ValueError) as error:
                enr_errors[section] = str(error)[:300]
        positions, conflicts = enr_coordinates(enr_sources.get('4.4', ''), enr_sources.get('4.1', ''))
        resolve = positions.get
    else:
        positions, conflicts = {}, []
    reader_signature = digest((PROCESS_SIGNATURE + digest(json.dumps(positions, sort_keys=True).encode())).encode())
    report = {'schema': 1, 'cycle': cycle, 'region': region, 'source_url': eaip, 'reader_signature': reader_signature,
              'scope': 'indexed-ad2-source-build-not-national-procedure-completeness',
              'indexed_aerodromes': indexed, 'selected_aerodromes': selected, 'results': {}}
    report['enroute'] = {'resolved_identifiers': len(positions), 'conflicts': conflicts, 'errors': enr_errors,
                         'source_cycle': cycle, 'source_hashes': {k: digest(v.encode('utf-8')) for k, v in enr_sources.items()}}
    with ThreadPoolExecutor(max_workers=max(1, min(workers, 8))) as pool:
        futures = {pool.submit(build_one, code, cycle, out, get, reader_signature, resolve, None, eaip): code for code in selected}
        for future in as_completed(futures):
            code = futures[future]
            try:
                row = future.result()
            except Exception as error:
                row = {'icao': code, 'state': 'failed', 'error': type(error).__name__ + ': ' + str(error)[:400]}
            report['results'][code] = row
            report['updated_at'] = datetime.now(timezone.utc).isoformat(timespec='seconds')
            write_json(out / 'progress.json', report)
            print(json.dumps({'done': len(report['results']), 'total': len(selected), **row}, ensure_ascii=False), flush=True)
    write_json(out / 'report.json', report)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cycle', required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--workers', type=int, default=4)
    parser.add_argument('--icao', nargs='*')
    parser.add_argument('--region', choices=list(S.SIA_REGIONS), default='FRANCE')
    args = parser.parse_args()
    run(args.cycle, args.out, args.workers, args.icao, region=args.region)


if __name__ == '__main__':
    main()
