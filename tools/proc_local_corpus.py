"""Build candidates from complete local UK/Swedish packages and cached national PDFs.

No authenticated EAD transport, installation or regression execution. Raw and parsed
sources stay separate; absent coding/coordinates/cycle remain explicit in the reports.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
from pathlib import Path
import re
from zipfile import ZipFile

import proc_pdf as P
import proc_records as R
import proc_manual as M
import proc_uk_iac as I
import proc_uk_sid as SID
import uk_package as U
from proc_national import digest, write_json


def read_cached(path, out):
    path = Path(path)
    sig = digest((Path(P.__file__).read_bytes()))[:16]
    key = digest(path.read_bytes())
    target = Path(out) / 'rows' / sig / (key + '.json')
    if target.exists():
        return json.loads(target.read_text(encoding='utf-8'))
    rows = P.all_pages_rows(path)
    write_json(target, rows)
    return rows


def uk_one(root, icao, out):
    page = U.aerodrome_page(str(root), icao)
    charts = U.procedure_charts(U.chart_index(page, icao))
    cycle = U.page_date(page) or U.package_date(str(root)) or 'unknown'
    rows, by_name, failures = {}, {}, []
    for chart in charts:
        name = U.canonical(icao, chart)
        path = Path(root) / 'graphics' / (chart['pdf'] + '.pdf')
        by_name[name] = chart
        try:
            rows[name] = read_cached(path, out)
        except (OSError, ValueError, P.PdfTimeout, RuntimeError, SystemExit) as error:
            rows[name] = [[]]
            failures.append({'file': name, 'error': str(error)[:200]})
    doc = R.build_pdf_dir(icao, list(rows), lambda name: rows[name], cycle)
    runway_data = U.runways(page, icao)
    additions, profiles = [], []
    for name, pages in rows.items():
        for row in pages:
            legacy = I.read_chart(row, icao, runway_data, name, cycle)
            profile = I.read_profile(row, icao, name, cycle)
            if legacy:
                additions.append(legacy)
            if profile:
                profiles.append(profile)
                candidate = I.profile_record(profile, runway_data)
                if candidate and not legacy:
                    additions.append(candidate)
                doc['formats'] = [f for f in doc['formats'] if not (f['file'] == name and f.get('reason') == 'no-table')]
                doc['formats'].append({'file': name, 'page': 1, 'layout': 'uk-iac-profile', 'ok': True,
                                       'scope': 'partial-profile-facts', 'problems': []})
        chart = by_name[name]
        if chart in U.sid_charts(charts):
            found, warnings = SID.read_chart('\n'.join(pages[0]) if pages else '', chart['title'], icao)
            for record in found:
                record['source'] = {'kind': 'ukpkg', 'file': name, 'cycle': cycle, 'chart': U.chart_path(chart)}
            additions += found
            doc['warnings'] += warnings
    doc['procedures'] = M.merge({'procedures': []}, {'procedures': doc['procedures'] + additions})['procedures']
    for record in doc['procedures']:
        record['source']['kind'] = 'ukpkg'
    doc['approach_profiles'] = profiles
    doc['source_build'] = {'package': 'NATS', 'cycle': cycle, 'indexed_charts': len(charts), 'failures': failures, 'installed': False}
    return doc


def sweden_groups(archive, out):
    groups = {}
    with ZipFile(archive) as source:
        for entry in source.infolist():
            if not entry.filename.lower().endswith('.pdf'):
                continue
            chart = re.match(r'documents/Root/SWEDEN/Charts/AD/(ES[A-Z]{2})/(?:6\.|8\.)', entry.filename)
            ad_page = re.match(r'documents/PDF/ES-AD 2 (ES[A-Z]{2}) ', entry.filename)
            if not chart and not ad_page:
                continue
            icao = (chart or ad_page)[1]
            if entry.file_size > 20*1024*1024:
                continue
            name = icao + '_' + hashlib.sha256(entry.filename.encode()).hexdigest()[:16] + '.pdf'
            path = Path(out) / 'se-raw' / icao / name
            if not path.exists():
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(source.read(entry))
            groups.setdefault(icao, {})[name] = {'path': path, 'source': entry.filename}
    return groups


def generic_one(icao, files, out, cycle='unknown'):
    def pages(name):
        return read_cached(files[name]['path'], out)
    doc = R.build_pdf_dir(icao, sorted(files), pages, cycle)
    doc['source_build'] = {'installed': False, 'cycle_known': cycle != 'unknown',
                           'files': {n: f['source'] for n, f in files.items()}}
    return doc


def cached_groups(roots):
    groups, seen = {}, set()
    for root in roots:
        for path in Path(root).rglob('*.pdf'):
            match = re.search(r'(?:^|_)AD_2_([A-Z]{4})_', path.name)
            if not match:
                continue
            code = match[1]
            if code[:2] not in ('EB', 'EI', 'EK', 'LE', 'GC', 'LI', 'LS', 'ED', 'ET'):
                continue
            key = (code, digest(path.read_bytes()))
            if key in seen:
                continue
            seen.add(key)
            name = path.stem + '_' + key[1][:8] + '.pdf'
            groups.setdefault(code, {})[name] = {'path': path, 'source': path.name}
    return groups


def run(out, uk=None, sweden=None, roots=(), workers=3):
    out = Path(out)
    work = []
    for root in roots:
        if not Path(root).is_dir():
            raise ValueError('cached PDF root not found: ' + str(root))
    if uk and not (Path(uk) / 'html/eAIP').is_dir():
        raise ValueError('UK package html/eAIP directory not found: ' + str(uk))
    if sweden and not Path(sweden).is_file():
        raise ValueError('Swedish package archive not found: ' + str(sweden))
    if uk:
        for page in sorted((Path(uk) / 'html/eAIP').glob('EG-AD-2.*-en-GB.html')):
            code = re.search(r'AD-2\.([A-Z]{4})-', page.name)[1]
            work.append((code, uk_one, (uk, code, out)))
    if sweden:
        for code, files in sorted(sweden_groups(sweden, out).items()):
            work.append((code, generic_one, (code, files, out)))
    for code, files in sorted(cached_groups(roots).items()):
        work.append((code, generic_one, (code, files, out)))
    if not work:
        raise ValueError('no aerodrome source inputs discovered')
    report = {'schema': 1, 'scope': 'all-indexed-local-inputs-not-national-completeness',
              'airports_discovered': [code for code, fn, args in work], 'results': {}}
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(fn, *args): code for code, fn, args in work}
        for future in as_completed(futures):
            code = futures[future]
            try:
                doc = future.result()
                write_json(out / 'procedures' / (code + '.json'), doc)
                row = {'icao': code, 'records': len(doc['procedures']), 'partial': sum(bool(p.get('partial')) for p in doc['procedures']),
                       'doubt': sum(p.get('status') == 'doubt' for p in doc['procedures']),
                       'format_read': sum(bool(f.get('ok')) for f in doc['formats']),
                       'format_unread': sum(not f.get('ok') for f in doc['formats']), 'cycle': doc['cycle']}
            except Exception as error:
                row = {'icao': code, 'error': type(error).__name__ + ': ' + str(error)[:250]}
            report['results'][code] = row
            write_json(out / 'progress.json', report)
            print(json.dumps({'done': len(report['results']), 'total': len(work), **row}), flush=True)
    write_json(out / 'report.json', report)
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--uk', type=Path)
    parser.add_argument('--sweden', type=Path)
    parser.add_argument('--cached-root', action='append', default=[])
    parser.add_argument('--workers', type=int, default=3)
    args = parser.parse_args()
    run(args.out, args.uk, args.sweden, args.cached_root, args.workers)
