"""Import d'une compilation VFR tirée des cartes VAC (tools/report-vfr/compile_vfr.py, vfr-compiled.json) dans le dépôt
des données : un fichier par terrain, sia/vfr/<OACI>.json (points de report, séquences, consignes par page), et un index
léger, sia/vfr/index.json. Bibliothèque standard seulement.

Contrôle strict avant toute écriture : une seule erreur et rien n'est écrit (les premières erreurs sont rendues). Les
points sont rapprochés des VRP de la base publiée (sia/base/fr/<cycle>/vrp.json : identifiant « <OACI sans LF>-<code> »,
à moins de 0,02° près). Tout reste marqué candidat, « extrait des VAC, à vérifier » : rien n'est présenté comme publié.

API : plan(compiled, data_dir) → { ok, errors, files: { chemin: octets }, remove: [chemins], summary } ;
      write(plan, data_dir) écrit les fichiers et retire ceux qui ne sont plus produits (sous sia/vfr/ seulement)."""
import json, math, os, re

VFR_DIR = ('sia', 'vfr')
LABEL = 'Extrait des VAC, à vérifier'
ICAO = re.compile(r'[A-Z]{4}')
CODE = re.compile(r'[A-Z0-9]{1,8}')
MAX_AD, MAX_POINTS, MAX_ROUTES, MAX_PAGES, MAX_TEXT = 2000, 200, 400, 40, 40000


def _num(v, lo, hi):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) and lo <= v <= hi


def _text(v, n):
    return isinstance(v, str) and len(v) <= n


def _vrp_base(data_dir):
    """VRP de la base publiée la plus récente de la France : { identifiant: (lat, lon) } ; vide sans base."""
    root = os.path.join(data_dir, 'sia', 'base', 'fr')
    try:
        cycles = sorted(c for c in os.listdir(root) if re.fullmatch(r'\d{4}-\d{2}-\d{2}', c))
    except OSError:
        return {}
    for c in reversed(cycles):
        p = os.path.join(root, c, 'vrp.json')
        if os.path.isfile(p):
            try:
                d = json.load(open(p, encoding='utf-8'))
            except (OSError, ValueError):
                return {}
            rows = d.get('data', d) if isinstance(d, dict) else d
            return {str(v.get('id')): (v.get('lat'), v.get('lon')) for v in rows if isinstance(v, dict) and v.get('id')}
    return {}


def _title(text, ad_name=None):
    """Titre d'une page : sa première ligne qui n'est pas le nom du terrain (en capitales en tête de chaque page)."""
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    if len(lines) > 1 and lines[0].isupper():
        lines = lines[1:]
    return (lines[0] if lines else '')[:120]


def _dump(obj):
    return (json.dumps(obj, ensure_ascii=False, indent=1, sort_keys=False) + '\n').encode('utf-8')


def plan(compiled, data_dir):
    """Contrôle la compilation et prépare les fichiers (rien n'est écrit)."""
    errors = []

    def err(msg):
        if len(errors) < 20:
            errors.append(msg)

    if not isinstance(compiled, dict):
        return {'ok': False, 'errors': ['Le fichier n’est pas un objet JSON.'], 'files': {}, 'remove': [], 'summary': {}}
    if not str(compiled.get('schemaVersion', '')).startswith('1.'):
        err(f"schemaVersion « {compiled.get('schemaVersion')} » : 1.x attendue (compile_vfr.py).")
    ads = compiled.get('aerodromes')
    if not isinstance(ads, list) or not ads or len(ads) > MAX_AD:
        err('aerodromes : liste de 1 à 2000 terrains attendue.')
        ads = []
    seen = set()
    for a in ads:
        if not isinstance(a, dict) or not isinstance(a.get('icao'), str) or not ICAO.fullmatch(a['icao']):
            err(f"terrain sans code OACI valide : {str(a)[:60]}")
            continue
        k = a['icao']
        if k in seen:
            err(f'{k} : terrain en double.')
        seen.add(k)
        pts, rts, pgs = a.get('points') or [], a.get('routes') or [], a.get('evidencePages') or []
        if not all(isinstance(x, list) for x in (pts, rts, pgs)) or len(pts) > MAX_POINTS or len(rts) > MAX_ROUTES or len(pgs) > MAX_PAGES:
            err(f'{k} : points, routes ou evidencePages mal formés ou trop nombreux.')
            continue
        codes = {k}
        for p in pts:
            c = p.get('coordinates') if isinstance(p, dict) else None
            if not isinstance(p, dict) or not isinstance(p.get('code'), str) or not CODE.fullmatch(p['code']):
                err(f'{k} : point sans code valide ({str(p)[:60]}).')
            elif not (isinstance(c, list) and len(c) == 2 and _num(c[0], -180, 180) and _num(c[1], -90, 90)):
                err(f"{k} {p['code']} : coordonnées [longitude, latitude] invalides.")
            elif p.get('pdfPage') is not None and not _num(p.get('pdfPage'), 1, 999):
                err(f"{k} {p['code']} : page invalide.")
            else:
                codes.add(p['code'])
        for r in rts:
            pc = r.get('pointCodes') if isinstance(r, dict) else None
            if not isinstance(pc, list) or len(pc) < 2 or not all(isinstance(c, str) and c in codes for c in pc):
                err(f'{k} : séquence dont un point est inconnu ({str(pc)[:60]}).')
            elif not _text(r.get('sourceText', ''), 2000):
                err(f'{k} : texte de séquence trop long.')
        for g in pgs:
            if not isinstance(g, dict) or not _num(g.get('pdfPage'), 1, 999) or not _text(g.get('text'), MAX_TEXT):
                err(f'{k} : page de consignes mal formée.')
    if errors:
        return {'ok': False, 'errors': errors, 'files': {}, 'remove': [], 'summary': {}}

    base = _vrp_base(data_dir)
    files, index, unmatched = {}, [], []
    n_pts = n_rts = n_notes = 0
    for a in sorted(ads, key=lambda x: x['icao']):
        k = a['icao']
        pts, rts, pgs = a.get('points') or [], a.get('routes') or [], a.get('evidencePages') or []
        if not (pts or rts or pgs):
            continue
        out_pts, vrp_of = [], {}
        for p in pts:
            lon, lat = p['coordinates']
            vid = f"{k[2:]}-{p['code']}"
            b = base.get(vid)
            ok = b is not None and _num(b[0], -90, 90) and _num(b[1], -180, 180) and abs(b[0] - lat) < .02 and abs(b[1] - lon) < .02
            vrp_of[p['code']] = vid if ok else None
            if not ok:
                unmatched.append(f"{k} {p['code']}")
            out_pts.append({'code': p['code'], 'vrp': vrp_of[p['code']], 'lat': round(lat, 6), 'lon': round(lon, 6),
                            'page': p.get('pdfPage'), 'text': str(p.get('sourceText') or '')[:200]})
        out_rts = [{'codes': r['pointCodes'], 'vrps': [vrp_of.get(c) for c in r['pointCodes']], 'page': r.get('pdfPage'),
                    'text': str(r.get('sourceText') or ''), 'fragment': bool(r.get('isFragmentPossible'))} for r in rts]
        notes = [{'page': g['pdfPage'], 'title': _title(g['text']), 'text': g['text']} for g in sorted(pgs, key=lambda g: g['pdfPage'])]
        src = a.get('source') if isinstance(a.get('source'), dict) else {}
        files['/'.join(VFR_DIR + (f'{k}.json', ))] = _dump({
            'schema': 1,
            'ad': k,
            'status': 'candidate',
            'label': LABEL,
            'source': {'file': os.path.basename(str(src.get('file') or '').replace('\\', '/')), 'sha256': src.get('sha256'),
                       'cycle': src.get('cycle')},
            'generatedAt': compiled.get('generatedAt'),
            'points': out_pts,
            'routes': out_rts,
            'notes': notes
        })
        index.append({'ad': k, 'points': len(out_pts), 'routes': len(out_rts), 'notes': len(notes),
                      'unmatched': sum(1 for p in out_pts if not p['vrp'])})
        n_pts, n_rts, n_notes = n_pts + len(out_pts), n_rts + len(out_rts), n_notes + len(notes)
    files['/'.join(VFR_DIR + ('index.json', ))] = _dump({
        'schema': 1,
        'status': 'candidate',
        'label': LABEL,
        'generatedAt': compiled.get('generatedAt'),
        'datasetStatus': compiled.get('datasetStatus'),
        'aerodromes': index
    })
    folder = os.path.join(data_dir, *VFR_DIR)
    remove = []
    if os.path.isdir(folder):
        remove = sorted('/'.join(VFR_DIR + (f, )) for f in os.listdir(folder) if f.endswith('.json') and '/'.join(VFR_DIR + (f, )) not in files)
    changed = [p for p, b in files.items() if not os.path.isfile(os.path.join(data_dir, *p.split('/'))) or
               open(os.path.join(data_dir, *p.split('/')), 'rb').read() != b]
    return {
        'ok': True,
        'errors': [],
        'files': files,
        'changed': changed,
        'remove': remove,
        'summary': {'aerodromes': len(index), 'points': n_pts, 'routes': n_rts, 'notes': n_notes, 'unmatched': unmatched[:40],
                    'unmatchedCount': len(unmatched), 'changed': len(changed), 'remove': len(remove),
                    'bytes': sum(len(b) for b in files.values()), 'base': len(base)}
    }


def write(p, data_dir):
    """Écrit les fichiers changés du plan et retire ceux qui ne sont plus produits (sous sia/vfr/ seulement)."""
    folder = os.path.join(data_dir, *VFR_DIR)
    os.makedirs(folder, exist_ok=True)
    for path in p['changed']:
        assert path.startswith('/'.join(VFR_DIR) + '/') and '..' not in path
        with open(os.path.join(data_dir, *path.split('/')), 'wb') as f:
            f.write(p['files'][path])
    for path in p['remove']:
        assert path.startswith('/'.join(VFR_DIR) + '/') and '..' not in path
        os.remove(os.path.join(data_dir, *path.split('/')))
