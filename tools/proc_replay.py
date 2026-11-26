"""Snapshot chart inputs under data/local and verify them before offline replay.

No source is moved/deleted. Immutable inputs are copied byte-for-byte, hashed and
kept separate from mutable parser caches/candidate outputs. No PDF dependency.
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import shutil
from zipfile import ZipFile


def sha(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(1024*1024), b''):
            h.update(block)
    return h.hexdigest()


def write(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix+'.part')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    temp.replace(path)


def contained(root, relative):
    path = (Path(root)/relative).resolve()
    if not path.is_relative_to(Path(root).resolve()) or path == Path(root).resolve():
        raise ValueError('replay path escapes its local root')
    return path


def prepare(config_path, source_output, local_root):
    config_path, source_output, local_root = Path(config_path), Path(source_output), Path(local_root).resolve()
    config = json.loads(config_path.read_text(encoding='utf-8-sig'))
    records = {}
    def copy_file(source, target, immutable=True):
        source, target = Path(source), contained(local_root, target)
        if target.exists() and not immutable:
            return
        expected = sha(source)
        if target.exists():
            if sha(target) != expected:
                raise ValueError('input changed; use a new snapshot root: '+str(target))
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            temp = target.with_suffix(target.suffix+'.part')
            shutil.copyfile(source, temp)
            if sha(temp) != expected:
                raise ValueError('copy checksum mismatch: '+str(source))
            temp.replace(target)
        if immutable:
            records[target.relative_to(local_root).as_posix()] = {'sha256': expected, 'bytes': target.stat().st_size}

    def copy_dir(source, target, mode='inputs'):
        source = Path(source).resolve()
        if not source.is_dir() or source == local_root or source in local_root.parents:
            raise ValueError('invalid replay source directory: '+str(source))
        count = 0
        for path in sorted(source.rglob('*')):
            if not path.is_file():
                continue
            if path.is_symlink() or not path.resolve().is_relative_to(source):
                raise ValueError('linked source escapes its input root')
            rel = path.relative_to(source)
            if mode == 'pdfs' and path.suffix.lower() != '.pdf':
                continue
            immutable = mode != 'derived' and (mode != 'work' or path.suffix.lower() == '.pdf' or 'raw' in rel.parts)
            copy_file(path, Path(target)/rel, immutable)
            count += 1
        print(json.dumps({'copied_or_reused': count, 'target': str(target)}), flush=True)

    def source_path(value):
        p = Path(value)
        return p if p.is_absolute() else (config_path.parent/p).resolve()

    copy_dir(source_output, 'work', 'work')
    publications = {}
    for region in config.get('france_regions', []):
        folder = 'fr-'+(config['cycle'] if region == 'FRANCE' else region.lower())
        report = json.loads((source_output/folder/'report.json').read_text(encoding='utf-8'))
        publications[region] = report['source_url']
    config['publications'] = publications
    foreign = config.get('foreign') or {}
    if foreign.get('uk'):
        copy_dir(source_path(foreign['uk']), 'sources/uk')
        foreign['uk'] = 'sources/uk'
    if foreign.get('sweden'):
        copy_file(source_path(foreign['sweden']), 'sources/sweden/AIP_OFFLINE.zip')
        foreign['sweden'] = 'sources/sweden/AIP_OFFLINE.zip'
        total = 0
        with ZipFile(local_root/foreign['sweden']) as archive:
            for entry in archive.infolist():
                if not entry.filename.lower().endswith('.pdf'):
                    continue
                total += entry.file_size
                if entry.file_size > 100*1024*1024 or total > 4*1024**3 or entry.file_size > 1000*max(1, entry.compress_size):
                    raise ValueError('PDF archive expansion limit exceeded')
                name = hashlib.sha256(entry.filename.encode()).hexdigest()[:24]+'.pdf'
                target = contained(local_root, 'sources/sweden/pdfs/'+name)
                body = archive.read(entry)
                expected = hashlib.sha256(body).hexdigest()
                if target.exists() and sha(target) != expected:
                    raise ValueError('archived PDF changed; use a new snapshot root')
                if not target.exists():
                    target.parent.mkdir(parents=True, exist_ok=True)
                    temp = target.with_suffix('.pdf.part'); temp.write_bytes(body); temp.replace(target)
                records[target.relative_to(local_root).as_posix()] = {'sha256': expected, 'bytes': len(body), 'archive_member': entry.filename}
    roots = []
    for n, value in enumerate(foreign.get('cached_roots', []), 1):
        target = f'sources/ead/root{n:02}'
        copy_dir(source_path(value), target, 'pdfs')
        roots.append(target)
    foreign['cached_roots'] = roots
    if foreign:
        config['foreign'] = foreign
    vfr = config.get('vfr') or {}
    if vfr:
        copy_dir(source_path(vfr['source']), 'sources/vac', 'pdfs')
        vfr['source'] = 'sources/vac'
        if vfr.get('cache'):
            copy_dir(source_path(vfr['cache']), 'work/vfr-cache', 'derived')
            vfr['cache'] = 'work/vfr-cache'
        if vfr.get('interpretations'):
            copy_dir(source_path(vfr['interpretations']), 'sources/vfr-interpretations')
            vfr['interpretations'] = 'sources/vfr-interpretations'
    config['replay_manifest'] = 'inputs-manifest.json'
    config['replay_root'] = '.'
    # Publication context is also an immutable replay input, not a live discovery request.
    publication_path = local_root/'publications.json'
    if publication_path.exists() and json.loads(publication_path.read_text()) != publications:
        raise ValueError('publication context changed; use a new snapshot root')
    write(publication_path, publications)
    records['publications.json'] = {'sha256': sha(publication_path), 'bytes': publication_path.stat().st_size}
    write(local_root/'replay-config.json', config)
    records['replay-config.json'] = {'sha256': sha(local_root/'replay-config.json'), 'bytes': (local_root/'replay-config.json').stat().st_size}
    manifest = {'schema': 1, 'cycle': config['cycle'], 'scope': 'immutable chart/HTML/archive/context inputs; derived rows and outputs excluded',
                'files': records, 'counts': dict(Counter(Path(p).suffix.lower() for p in records)),
                'bytes': sum(r['bytes'] for r in records.values())}
    write(local_root/'inputs-manifest.json', manifest)
    guide = ('# Local chart replay\n\nAll acquired inputs are kept below this folder. '
             'Original and individually extracted Swedish PDF files are retained. '
             'No source directory was moved or deleted.\n\n'
             'From the suite root:\n\n```powershell\n'
             'python -B -X utf8 tools/proc_roadmap.py --config data/local/aip-replay/replay-config.json '
             '--out data/local/aip-replay/work --offline\n```\n\n'
             '`inputs-manifest.json` checks the immutable inputs. Parser rows/candidates stay under `work/`. '
             'The two never-acquired French POGO charts remain explicit cache misses. '
             'Offline replay neither fetches missing inputs nor installs candidate data. '
             'Add `--ground-local <snapshot-folder>` to chain AIP ground names, '
             'published stand/holding coordinates and native GeoPDF chart candidates.\n')
    (local_root/'README.md').write_text(guide, encoding='utf-8')
    (local_root/'work/LIRE.md').write_text('See ../README.md for the self-contained offline replay command.\n', encoding='utf-8')
    return manifest


def verify(local_root, manifest='inputs-manifest.json'):
    local_root = Path(local_root).resolve()
    data = json.loads(contained(local_root, manifest).read_text(encoding='utf-8'))
    errors = []
    for name, rec in data['files'].items():
        path = contained(local_root, name)
        if not path.is_file() or path.stat().st_size != rec['bytes'] or sha(path) != rec['sha256']:
            errors.append(name)
    if errors:
        raise ValueError('replay inputs missing/modified: '+', '.join(errors[:10]))
    return {'verified_inputs': len(data['files']), 'counts': data['counts'], 'bytes': data['bytes']}


def offline_get(url):
    raise OSError('offline replay: source was not acquired in this snapshot')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--local', type=Path, required=True)
    parser.add_argument('--prepare', action='store_true')
    parser.add_argument('--config', type=Path)
    parser.add_argument('--source-output', type=Path)
    args = parser.parse_args()
    if args.prepare:
        if not args.config or not args.source_output:
            parser.error('--prepare requires --config and --source-output')
        prepare(args.config, args.source_output, args.local)
    print(json.dumps(verify(args.local)), flush=True)
