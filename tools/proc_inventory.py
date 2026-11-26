"""Read-only census of local chart files and stored procedure documents.

No PDF parsing, fetching or installation. Counts describe the supplied folders,
possibly containing several cycles, and never establish national completeness.
"""
import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re


COUNTRIES = [('LF', 'France', ('LF',)), ('EG', 'United Kingdom', ('EG',)),
             ('EB', 'Belgium', ('EB',)), ('EI', 'Ireland', ('EI',)),
             ('ES', 'Sweden', ('ES',)), ('EK', 'Denmark', ('EK',)),
             ('LE', 'Spain', ('LE', 'GC', 'GE')), ('LI', 'Italy', ('LI',)),
             ('LS', 'Switzerland', ('LS',)), ('ED', 'Germany', ('ED', 'ET'))]


def _country(icao):
    return next((state for state, name, prefixes in COUNTRIES if icao[:2] in prefixes), None)


def _airport(path):
    match = re.search(r'(?:^|_)AD[_-]2[_ .-]([A-Z]{4})(?:[_.-]|$)', path.name.upper())
    if match:
        return match[1]
    return next((part for part in reversed(path.parts[:-1]) if re.fullmatch('[A-Z]{4}', part)), None)


def _hash(path):
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def _hints(name, titles, label):
    text = (' '.join([name, *titles])).upper()
    result = []
    if re.search(r'\b(?:VFR|VAC|VISUAL)\b', text.replace('_', ' ')) or 'vac' in label.lower():
        result.append('VFR')
    if 'CODE' in text or 'CODING' in text:
        result.append('coding')
    for kind, words in [('SID', ('SID', 'DEPARTURE')), ('STAR', ('STAR', 'ARRIVAL')),
                        ('APP', ('IAC', 'IAP', 'APPROACH'))]:
        if any(re.search(r'\b'+word+r'\b', text.replace('_', ' ')) for word in words):
            result.append(kind)
    return result or ['unclassified']


def survey_titles(path):
    result = {}
    for row in json.loads(Path(path).read_text(encoding='utf-8')):
        for key, samples in row.items():
            if key.startswith('sample_') and isinstance(samples, list):
                for sample in samples:
                    if isinstance(sample, list) and len(sample) >= 2 and all(isinstance(x, str) for x in sample[:2]):
                        result.setdefault(sample[0], set()).add(sample[1])
    return result


def inventory(roots, titles=None):
    titles = titles or {}
    rows = {state: {'state': state, 'name': name, 'pdf_copies': 0, 'unique_pdf_content': 0,
                   'airports': set(), 'document_hints': Counter(), 'procedure_documents': 0,
                   'procedure_records': 0, 'partial_records': 0, 'record_kinds': Counter(),
                   'cycles': set(), 'format_entries_read': 0, 'format_entries_unread': 0}
            for state, name, prefixes in COUNTRIES}
    seen_paths, seen_pdf, seen_docs, errors = set(), set(), set(), []
    for label, root in roots.items():
        root = Path(root)
        if not root.is_dir():
            errors.append({'root': label, 'reason': 'folder-missing'})
            continue
        for path in sorted(root.rglob('*')):
            if not path.is_file() or path.suffix.lower() not in ('.pdf', '.json'):
                continue
            resolved = str(path.resolve()).casefold()
            if resolved in seen_paths:
                continue
            seen_paths.add(resolved)
            try:
                if path.suffix.lower() == '.pdf':
                    icao = _airport(path)
                    state = _country(icao) if icao else None
                    if state is None:
                        continue
                    row = rows[state]
                    row['pdf_copies'] += 1
                    row['airports'].add(icao)
                    key = (icao, _hash(path))
                    if key not in seen_pdf:
                        row['unique_pdf_content'] += 1
                        seen_pdf.add(key)
                        row['document_hints'].update(_hints(path.name, titles.get(path.name, []), label))
                elif re.fullmatch(r'[A-Z]{4}(?:\.ocr)?\.json', path.name, re.I):
                    doc = json.loads(path.read_text(encoding='utf-8'))
                    icao = doc.get('icao', path.name[:4].upper())
                    state = _country(icao) if isinstance(icao, str) else None
                    if state is None or not isinstance(doc.get('procedures'), list):
                        continue
                    key = (icao, _hash(path))
                    if key in seen_docs:
                        continue
                    seen_docs.add(key)
                    row = rows[state]
                    row['procedure_documents'] += 1
                    records = [p for p in doc['procedures'] if isinstance(p, dict)]
                    row['procedure_records'] += len(records)
                    row['partial_records'] += sum(bool(p.get('partial')) for p in records)
                    row['record_kinds'].update(p.get('kind', 'unknown') for p in records)
                    if isinstance(doc.get('cycle'), str):
                        row['cycles'].add(doc['cycle'])
                    for entry in doc.get('formats') or []:
                        if isinstance(entry, dict) and type(entry.get('ok')) is bool:
                            row['format_entries_read' if entry['ok'] else 'format_entries_unread'] += 1
            except (OSError, ValueError, AttributeError, TypeError) as error:
                errors.append({'root': label, 'file': str(path.relative_to(root)), 'reason': type(error).__name__})
    for row in rows.values():
        for key in ('airports', 'cycles'):
            row[key] = sorted(row[key])
        for key in ('document_hints', 'record_kinds'):
            row[key] = dict(sorted(row[key].items()))
    return {'schema': 1, 'generated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
            'scope': 'supplied-local-folders-only', 'national_completeness': None,
            'roots': {k: str(v) for k, v in roots.items()}, 'countries': list(rows.values()), 'errors': errors,
            'count_rules': 'PDF copies count distinct paths; unique content uses airport and SHA-256. Stored documents may include multiple cycles and OCR alternatives, so records are not installed coverage. Filename/title hints are not recognised-reader results.'}


def markdown(report):
    lines = ['# Local chart corpus inventory', '',
             'Snapshot: ' + report.get('generated_at', 'not recorded') + '.', '',
             'Read-only snapshot of the supplied folders. These counts are not national coverage or a regression result.', '',
             '| Country | PDF paths | Unique PDF content | Aerodromes with PDFs | Stored records (partial) | Format entries read / unread |',
             '|---|---:|---:|---:|---:|---:|']
    for row in report['countries']:
        lines.append(f"| {row['name']} | {row['pdf_copies']} | {row['unique_pdf_content']} | {len(row['airports'])} | {row['procedure_records']} ({row['partial_records']}) | {row['format_entries_read']} / {row['format_entries_unread']} |")
    lines += ['', report['count_rules'], '', '## Source folders', '']
    lines += [f'- `{label}`: `{path}`' for label, path in report['roots'].items()]
    if report['errors']:
        lines += ['', '## Unread inventory inputs', '', '```json', json.dumps(report['errors'], ensure_ascii=False, indent=2), '```']
    return '\n'.join(lines) + '\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', action='append', required=True, metavar='LABEL=FOLDER')
    parser.add_argument('--survey', type=Path)
    parser.add_argument('--out', type=Path)
    parser.add_argument('--markdown', type=Path)
    args = parser.parse_args()
    if any('=' not in value for value in args.root):
        parser.error('--root requires LABEL=FOLDER')
    report = inventory(dict(value.split('=', 1) for value in args.root), survey_titles(args.survey) if args.survey else None)
    text = json.dumps(report, ensure_ascii=False, indent=2) + '\n'
    if args.out:
        args.out.write_text(text, encoding='utf-8')
    else:
        print(text, end='')
    if args.markdown:
        args.markdown.write_text(markdown(report), encoding='utf-8')


if __name__ == '__main__':
    main()
