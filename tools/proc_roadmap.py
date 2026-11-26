"""Build France's five SIA regions, local foreign packages and optional VAC inputs.

One repeatable configuration; isolated candidate outputs, resumable PDF/row caches,
and explicit per-stage failures. Does not install data or execute regression cases.
"""
import argparse
from datetime import date
import json
from pathlib import Path
import subprocess
import sys

import proc_local_corpus as local
import proc_national as national


def write_reports(out, report):
    """A human-readable coverage report from the same machine-readable stage results."""
    out = Path(out)
    national.write_json(out / 'roadmap-report.json', report)
    lines = ['# Source-build coverage', '', 'Candidate outputs; no installation or regression execution.',
             'Counts describe indexed source inputs, not complete national procedure interpretation.', '',
             '| Stage | AD inputs | Records | Partial | Doubt | ILS profiles / indexed IAC | Unread formats | Missing files |',
             '|---|---:|---:|---:|---:|---:|---:|---:|']
    for name, stage in report['stages'].items():
        if stage['state'] == 'failed':
            lines += [f'| {name}: FAILED | — | — | — | — | — | — | — |', '', stage['error'], '']
            continue
        data = stage['report']
        if name == 'vfr' or name.startswith('ground_'):
            continue
        rows = list(data.get('results', {}).values())
        def count(key):
            return sum(r.get(key, 0) for r in rows)
        partial = count('partial' if name == 'foreign' else 'partial_records')
        doubt = count('doubt' if name == 'foreign' else 'doubt_records')
        unread = count('format_unread') if name == 'foreign' else sum(len(r.get('formats_unread', [])) for r in rows)
        profile_metric = f"{count('profiles_read')} / {count('final_iacs_indexed')}" if name in national.S.SIA_REGIONS else 'n/a'
        lines.append(f"| {name} | {len(rows)} | {count('records')} | {partial} | {doubt} | "
                     f"{profile_metric} | {unread} | {sum(len(r.get('missing', [])) for r in rows)} |")
    foreign = (report['stages'].get('foreign', {}).get('report') or {}).get('results', {})
    if foreign:
        lines += ['', '## Local foreign inputs', '', '| Country / scope | AD inputs | Records | Unread formats |', '|---|---:|---:|---:|']
        for name, prefixes in [('UK', ('EG',)), ('Belgium', ('EB',)), ('Ireland', ('EI',)), ('Sweden', ('ES',)),
                               ('Denmark / Faroe sample', ('EK',)), ('Spain / Canary sample', ('LE', 'GC')),
                               ('Italy', ('LI',)), ('Switzerland', ('LS',)), ('Germany', ('ED', 'ET'))]:
            rows = [r for code, r in foreign.items() if code.startswith(prefixes)]
            lines.append(f"| {name} | {len(rows)} | {sum(r.get('records', 0) for r in rows)} | {sum(r.get('format_unread', 0) for r in rows)} |")
        lines += ['', 'UK retains its package cycle; unknown source cycles remain unknown. Local samples are not national inventories.']
    vfr = (report['stages'].get('vfr', {}).get('report') or {}).get('summary')
    if vfr:
        lines += ['', '## VAC compilation', '', '```json', json.dumps(vfr, ensure_ascii=False, indent=2), '```', '',
                  'Automatic extraction is not finished visual path interpretation. Stale manual layers stay disabled.']
    for name in ('ground_names','ground_positions','ground_geometry'):
        stage=report['stages'].get(name,{})
        if stage.get('state')!='source-build-finished':
            continue
        data=stage['report']
        summary=data.get('countries') or {
            'source_charts':len(data.get('charts',[])),
            'failed':sum(c['state']=='failed' for c in data.get('charts',[])),
            'published_stands':sum(c.get('counts',{}).get('park',0) for c in data.get('charts',[])),
            'published_holds':sum(c.get('counts',{}).get('hold',0) for c in data.get('charts',[])),
            'chart_labels':sum(c.get('labels',0) for c in data.get('charts',[])),
            'unclassified_subpaths':sum(c.get('surface_subpaths',0) for c in data.get('charts',[]))}
        lines += ['', '## '+name, '', '```json', json.dumps(summary,ensure_ascii=False,indent=2), '```', '',
                  'Candidate source facts; no active installation, complete ground inventory or operational taxi routing claim.']
    national.atomic(out / 'coverage.md', ('\n'.join(lines) + '\n').encode('utf-8'))


def run(config, out, national_run=None, local_run=None, vfr_run=None, offline=False):
    national_run, local_run = national_run or national.run, local_run or local.run
    out = Path(out)
    cycle = date.fromisoformat(config['cycle']).isoformat()
    workers = config.get('workers', 3)
    if type(workers) is not int or not 1 <= workers <= 8:
        raise ValueError('workers must be an integer between 1 and 8')
    regions = config.get('france_regions', list(national.S.SIA_REGIONS))
    if len(set(regions)) != len(regions) or any(r not in national.S.SIA_REGIONS for r in regions):
        raise ValueError('unknown or duplicate French region')
    report = {'schema': 1, 'cycle': cycle, 'installed': False, 'regression_run': False, 'stages': {}}

    def stage(name, fn):
        try:
            result = fn()
            report['stages'][name] = {'state': 'source-build-finished', 'report': result}
        except Exception as error:
            report['stages'][name] = {'state': 'failed', 'error': type(error).__name__ + ': ' + str(error)[:400]}
        write_reports(out, report)

    for region in regions:
        folder = 'fr-' + (cycle if region == 'FRANCE' else region.lower())
        def build_region(r=region, f=folder):
            options = {}
            if offline:
                from proc_replay import offline_get
                options = {'get': offline_get, 'publication_url': config['publications'][r]}
            return national_run(cycle, out / f, workers=workers, region=r, **options)
        stage(region, build_region)
    foreign = config.get('foreign') or {}
    if foreign:
        stage('foreign', lambda: local_run(out / 'foreign', uk=foreign.get('uk'), sweden=foreign.get('sweden'),
                                           roots=foreign.get('cached_roots', []), workers=workers))
    ireland = config.get('ireland')
    if ireland:
        import proc_ie_public
        from proc_replay import offline_get
        stage('ireland', lambda: proc_ie_public.run(cycle, out / ('ireland-' + cycle),
                                                   airports=ireland.get('airports', ['EIDW']), workers=workers,
                                                   **({'get': offline_get} if offline else {})))
    vfr = config.get('vfr')
    if vfr:
        def compile_vfr():
            target = out / 'vfr'
            target.mkdir(parents=True, exist_ok=True)
            command = [sys.executable, '-B', '-X', 'utf8', str(Path(__file__).parent / 'report-vfr/compile_vfr.py'),
                       '--source', vfr['source'], '--output', str(target / 'vfr-compiled.json'),
                       '--geojson', str(target / 'vfr.geojson')]
            for key in ('cache', 'interpretations', 'source_airac', 'calculation_airac'):
                if vfr.get(key):
                    command += ['--' + key.replace('_', '-'), vfr[key]]
            # The existing VFR command owns PDF dependencies; the coordinator stays stdlib.
            with (target / 'compile.log').open('w', encoding='utf-8') as log:
                (vfr_run or subprocess.run)(command, stdout=log, stderr=subprocess.STDOUT, check=True)
            doc = json.loads((target / 'vfr-compiled.json').read_text(encoding='utf-8'))
            return {'summary': doc['summary'], 'errors': doc['errors']}
        stage('vfr', compile_vfr)
    ground=config.get('ground')
    if ground:
        import aip_ground_names
        import ground_positions
        import ground_pdf
        stage('ground_names',lambda:aip_ground_names.build(ground['local'],out/'ground-aip'))
        stage('ground_positions',lambda:ground_positions.build(ground['local'],out/'ground-published-positions',workers=workers))
        stage('ground_geometry',lambda:ground_pdf.build(ground['local'],out/'ground-geometry',workers=workers))
    write_reports(out, report)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--offline', action='store_true', help='verify local snapshot inputs and forbid acquisition')
    parser.add_argument('--ground-local', type=Path, help='also read names, published positions and native surface-chart geometry from this local snapshot')
    args = parser.parse_args()
    config = json.loads(args.config.read_text(encoding='utf-8-sig'))
    if args.offline:
        from proc_replay import verify, contained
        root = (args.config.parent/config.get('replay_root', '.')).resolve()
        manifest = config.get('replay_manifest', 'inputs-manifest.json')
        verify(root, manifest)
        entries = json.loads(contained(root, manifest).read_text(encoding='utf-8'))['files']
        if args.config.resolve().relative_to(root).as_posix() not in entries:
            raise ValueError('the replay configuration must be an input in its manifest')
        import outbound
        import urllib.request
        blocked_http = []
        def reject_network(*args, **kwargs):
            blocked_http.append(True)
            raise OSError('offline replay forbids HTTP transport')
        outbound.urlopen = urllib.request.urlopen = reject_network
    # Source paths are relative to the configuration, not to the invoking shell.
    def absolute(value):
        path = Path(value).expanduser()
        return str(path if path.is_absolute() else (args.config.parent / path).resolve())
    foreign = config.get('foreign') or {}
    for key in ('uk', 'sweden'):
        if foreign.get(key):
            foreign[key] = absolute(foreign[key])
    if foreign.get('cached_roots'):
        foreign['cached_roots'] = [absolute(p) for p in foreign['cached_roots']]
    for key in ('source', 'cache', 'interpretations'):
        if (config.get('vfr') or {}).get(key):
            config['vfr'][key] = absolute(config['vfr'][key])
    if args.ground_local:
        config['ground']={'local':str(args.ground_local.resolve())}
    elif config.get('ground'):
        config['ground']['local']=absolute(config['ground']['local'])
    report = run(config, args.out, offline=args.offline)
    if args.offline:
        report['offline'] = True
        report['blocked_http_attempts'] = len(blocked_http)
        write_reports(args.out, report)
    failed = any(s['state'] == 'failed' or any(r.get('error') or r.get('state') == 'failed'
                 for r in (s.get('report') or {}).get('results', {}).values())
                 or any(c.get('state')=='failed' for c in (s.get('report') or {}).get('charts',[])) for s in report['stages'].values())
    raise SystemExit(1 if failed or (args.offline and blocked_http) else 0)


if __name__ == '__main__':
    main()
