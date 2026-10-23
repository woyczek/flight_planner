"""Import d'une compilation VFR tirée des cartes VAC (tools/report-vfr : compile_vfr.py ou refresh_vfr.py,
vfr-compiled.json, formats 1.x et 2.x) dans le dépôt des données : un fichier par terrain, sia/vfr/<OACI>.json (points de
report, séquences, consignes par page, état de l'analyse), et un index léger, sia/vfr/index.json. Bibliothèque standard
seulement.

Contrôle strict avant toute écriture : une seule erreur et rien n'est écrit (les premières erreurs sont rendues). Les
points sont rapprochés des VRP de la base publiée (sia/base/fr/<cycle>/vrp.json : identifiant « <OACI sans LF>-<code> »,
à moins de 0,02° près). Tout reste marqué « extrait des VAC, à vérifier » : rien n'est présenté comme publié.

Format 2.x (refresh_vfr.py) : points avec rôle et origine (point de report publié, point de référence du terrain « AD »,
sommet de tracé manuel « MAN-… »), routes nommées (key) avec sens, pistes, conditions et géométrie interprétée
(LineString), consignes écrites par page (instructions), état de l'analyse du terrain (calculé, interprété, obsolète,
sans relations) et sa portée. Le format 1.x n'a que les points, les séquences et le texte des pages (evidencePages).

API : plan(compiled, data_dir) → { ok, errors, files: { chemin: octets }, changed, remove, summary } ;
      write(plan, data_dir) écrit les fichiers changés et retire ceux qui ne sont plus produits (sous sia/vfr/ seulement)."""
import json, math, os, re

VFR_DIR = ('sia', 'vfr')
LABEL = 'Extrait des VAC, à vérifier'
ICAO = re.compile(r'[A-Z]{4}')
CODE = re.compile(r'[A-Z0-9][A-Z0-9-]{0,23}')
DIRECTIONS = ('forward', 'both', 'unknown')
MAX_AD, MAX_POINTS, MAX_ROUTES, MAX_PAGES, MAX_TEXT, MAX_GEOM = 2000, 300, 400, 60, 60000, 2000


def _num(v, lo, hi):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) and lo <= v <= hi


def _text(v, n):
    return isinstance(v, str) and len(v) <= n


def _lonlat(c):
    return isinstance(c, list) and len(c) == 2 and _num(c[0], -180, 180) and _num(c[1], -90, 90)


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


def _title(text):
    """Titre d'une page : sa première ligne qui n'est pas le nom du terrain (en capitales en tête de chaque page)."""
    lines = [l.strip() for l in text.splitlines() if len(l.strip()) >= 3]  # restes de carte (« x », cotes) écartés
    if len(lines) > 1 and lines[0].isupper():
        lines = lines[1:]
    return (lines[0] if lines else '')[:120]


def _dump(obj):
    return (json.dumps(obj, ensure_ascii=False, indent=1) + '\n').encode('utf-8')


def _pages_of(a):
    """Consignes du terrain : les consignes écrites (2.x, instructions), sinon le texte des pages repérées (1.x)."""
    ins = a.get('instructions')
    return ins if isinstance(ins, list) and ins else a.get('evidencePages') or []


def _check(compiled):
    errors = []

    def err(msg):
        if len(errors) < 20:
            errors.append(msg)

    if not isinstance(compiled, dict):
        return ['Le fichier n’est pas un objet JSON.']
    if not re.match(r'[12]\.', str(compiled.get('schemaVersion', ''))):
        err(f"schemaVersion « {compiled.get('schemaVersion')} » : 1.x ou 2.x attendue (tools/report-vfr).")
    ads = compiled.get('aerodromes')
    if not isinstance(ads, list) or not ads or len(ads) > MAX_AD:
        return errors + ['aerodromes : liste de 1 à 2000 terrains attendue.']
    seen = set()
    for a in ads:
        if not isinstance(a, dict) or not isinstance(a.get('icao'), str) or not ICAO.fullmatch(a['icao']):
            err(f"terrain sans code OACI valide : {str(a)[:60]}")
            continue
        k = a['icao']
        if k in seen:
            err(f'{k} : terrain en double.')
        seen.add(k)
        pts, rts, pgs = a.get('points') or [], a.get('routes') or [], _pages_of(a)
        if not all(isinstance(x, list) for x in (pts, rts, pgs)) or len(pts) > MAX_POINTS or len(rts) > MAX_ROUTES or len(pgs) > MAX_PAGES:
            err(f'{k} : points, routes ou consignes mal formés ou trop nombreux.')
            continue
        codes = {k, 'AD'}  # le terrain lui-même : son code OACI (1.x) ou « AD » (2.x)
        for p in pts:
            if not isinstance(p, dict) or not isinstance(p.get('code'), str) or not CODE.fullmatch(p['code']):
                err(f'{k} : point sans code valide ({str(p)[:60]}).')
            elif not _lonlat(p.get('coordinates')):
                err(f"{k} {p['code']} : coordonnées [longitude, latitude] invalides.")
            elif p.get('pdfPage') is not None and not _num(p.get('pdfPage'), 1, 999):
                err(f"{k} {p['code']} : page invalide.")
            elif p.get('usageRestrictions') is not None and not (isinstance(p['usageRestrictions'], list) and len(p['usageRestrictions']) <= 10
                                                                and all(_text(x, 300) for x in p['usageRestrictions'])):
                err(f"{k} {p['code']} : restrictions d'usage mal formées.")
            else:
                codes.add(p['code'])
        for r in rts:
            if not isinstance(r, dict):
                err(f'{k} : séquence mal formée.')
                continue
            pc, gc, g = r.get('pointCodes'), r.get('geometryPointCodes'), r.get('geometry')
            if not isinstance(pc, list) or len(pc) < 2 or not all(isinstance(c, str) and c in codes for c in pc):
                err(f'{k} : séquence dont un point est inconnu ({str(pc)[:60]}).')
            elif gc is not None and not (isinstance(gc, list) and all(isinstance(c, str) and c in codes for c in gc)):
                err(f'{k} : tracé dont un sommet est inconnu ({str(gc)[:60]}).')
            elif g is not None and not (isinstance(g, dict) and g.get('type') == 'LineString' and isinstance(g.get('coordinates'), list)
                                        and 2 <= len(g['coordinates']) <= MAX_GEOM and all(_lonlat(c) for c in g['coordinates'])):
                err(f'{k} : géométrie de séquence invalide.')
            elif r.get('direction') is not None and r['direction'] not in DIRECTIONS:
                err(f"{k} : sens « {r['direction']} » inconnu.")
            elif not _text(r.get('sourceText', ''), 2000) or not _text(r.get('key', ''), 80):
                err(f'{k} : texte ou nom de séquence trop long.')
        for g in pgs:
            if not isinstance(g, dict) or not _num(g.get('pdfPage'), 1, 999) or not _text(g.get('text'), MAX_TEXT):
                err(f'{k} : page de consignes mal formée.')
    return errors


def plan(compiled, data_dir):
    """Contrôle la compilation et prépare les fichiers (rien n'est écrit)."""
    errors = _check(compiled)
    if errors:
        return {'ok': False, 'errors': errors, 'files': {}, 'changed': [], 'remove': [], 'summary': {}}
    base = _vrp_base(data_dir)
    files, index, unmatched = {}, [], []
    n_pts = n_rts = n_notes = n_int = 0
    for a in sorted(compiled['aerodromes'], key=lambda x: x['icao']):
        k = a['icao']
        pts, rts, pgs = a.get('points') or [], a.get('routes') or [], _pages_of(a)
        if not (pts or rts or pgs):
            continue
        out_pts, vrp_of = [], {}
        for p in pts:
            lon, lat = p['coordinates']
            role = p.get('role') or 'reporting_point'
            vid = f"{k[2:]}-{p['code']}"
            b = base.get(vid) if role == 'reporting_point' else None
            ok = b is not None and _num(b[0], -90, 90) and _num(b[1], -180, 180) and abs(b[0] - lat) < .02 and abs(b[1] - lon) < .02
            vrp_of[p['code']] = vid if ok else None
            if role == 'reporting_point' and not ok:
                unmatched.append(f"{k} {p['code']}")
            out_pts.append({
                'code': p['code'],
                'vrp': vrp_of[p['code']],
                'lat': round(lat, 6),
                'lon': round(lon, 6),
                'role': role,  # reporting_point, aerodrome_reference_point, intermediate_waypoint (sommet de tracé)
                'origin': p.get('origin') or 'published',
                'page': p.get('pdfPage'),
                'text': str(p.get('sourceText') or p.get('reason') or '')[:200],
                # usage restreint (panne radio, sur instruction du contrôle, hélicoptères…), tel que lu dans la VAC
                'restrictions': [str(x) for x in p.get('usageRestrictions') or []],
                # sommet placé à la main : précision (m, null si non mesurée) et sa note
                **({
                    'accuracyM': p.get('accuracyM') if _num(p.get('accuracyM'), 0, 1e5) else None,
                    'accuracyNote': str(p.get('accuracyNote') or '')[:300] or None
                } if role == 'intermediate_waypoint' else {})
            })
        out_rts = []
        for r in rts:
            g = r.get('geometry')
            pages = r.get('sourcePages') if isinstance(r.get('sourcePages'), list) else [r.get('pdfPage')] if r.get('pdfPage') else []
            out_rts.append({
                'key': r.get('key') or None,
                'codes': r['pointCodes'],
                'vrps': [vrp_of.get(c) for c in r['pointCodes']],
                'pages': [x for x in pages if _num(x, 1, 999)],
                'text': str(r.get('sourceText') or ''),
                'fragment': bool(r.get('isFragmentPossible')),
                'status': 'interpreted' if r.get('status') == 'interpreted' else 'candidate',
                'direction': r.get('direction') if r.get('status') == 'interpreted' else 'unknown',  # sens : analyse seulement
                'runways': r.get('runways') if isinstance(r.get('runways'), list) else None,
                'conditions': r.get('conditions') if isinstance(r.get('conditions'), dict) else None,
                # tracé interprété [[lat, lon], …] ; partiel : l'intégration près des pistes n'est pas tracée
                'geometry': [[round(c[1], 6), round(c[0], 6)] for c in g['coordinates']] if isinstance(g, dict) else None,
                'partial': bool(r.get('geometryPartial')),
                'omission': str(r.get('geometryOmission') or '')[:300] or None
            })
        notes = [{'page': g['pdfPage'], 'title': _title(g['text']), 'text': g['text']} for g in sorted(pgs, key=lambda g: g['pdfPage'])]
        src = a.get('source') if isinstance(a.get('source'), dict) else {}
        it = a.get('interpretation') if isinstance(a.get('interpretation'), dict) else {}
        analysis = {
            'status': a.get('status') if isinstance(a.get('status'), str) and a.get('status') != 'unreviewed' else None,
            'scope': a.get('interpretationScope') if isinstance(a.get('interpretationScope'), str) else None,
            'notes': [str(n)[:400] for n in it.get('notes') or [] if isinstance(n, str)][:20]
        }
        n_int += analysis['status'] == 'interprété'
        files['/'.join(VFR_DIR + (f'{k}.json', ))] = _dump({
            'schema': 2,
            'ad': k,
            'status': 'candidate',
            'label': LABEL,
            'analysis': analysis,
            'source': {'file': os.path.basename(str(src.get('file') or '').replace('\\', '/')),
                       'sha256': src.get('sha256') or a.get('fingerprint'), 'cycle': src.get('cycle') or src.get('sourceAirac')},
            'generatedAt': compiled.get('generatedAt'),
            'points': out_pts,
            'routes': out_rts,
            'notes': notes
        })
        index.append({'ad': k, 'points': sum(1 for p in out_pts if p['role'] == 'reporting_point'), 'routes': len(out_rts),
                      'notes': len(notes), 'unmatched': sum(1 for p in out_pts if p['role'] == 'reporting_point' and not p['vrp']),
                      'analysis': analysis['status']})
        n_pts, n_rts, n_notes = n_pts + index[-1]['points'], n_rts + len(out_rts), n_notes + len(notes)
    files['/'.join(VFR_DIR + ('index.json', ))] = _dump({
        'schema': 2,
        'status': 'candidate',
        'label': LABEL,
        'generatedAt': compiled.get('generatedAt'),
        'sourceSchema': str(compiled.get('schemaVersion')),
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
        'summary': {'aerodromes': len(index), 'points': n_pts, 'routes': n_rts, 'notes': n_notes, 'interpreted': n_int,
                    'unmatched': unmatched[:40], 'unmatchedCount': len(unmatched), 'changed': len(changed), 'remove': len(remove),
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
