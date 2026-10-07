"""Téléchargement des données aéronautiques libres d'autres pays dans les sous-dossiers du dossier SIA (data/sia/), lues
ensuite par la base SIA (shared/sia_base.js, lecteurs de shared/aero_sources.js). Voir
docs/technique/DONNEES_AERO_ETRANGER.md (sources, licences).

Fournisseurs :
  openaip  exports par pays d'openAIP (CC BY-NC 4.0 : usage non commercial, attribution « © openAIP ») :
           data/sia/openaip/<pays>_<couche>.geojson — couches asp (espaces), apt (aérodromes), nav (balises),
           rpp (points de report VFR) ;
  faa      FAA ADDS (domaine public) : data/sia/geojson/faa_<couche>.geojson — sua (espaces à usage spécial : MOA, R,
           W, A, P), mtr (routes d'entraînement militaire IR / VR / SR, en couloirs à la lecture), class (classes B, C, D,
           E) ;
  enaire   ENAIRE, Espagne (AIP en AIXM 5.1) : data/sia/aixm5/LE_…_Airspace.xml et …_EnRoute.xml (dernier amendement
           publié sur la page des données numériques ; les versions précédentes sont retirées) ;
  ukmil    UK Military AIP (AIDU, OGL v3.0) : ENR-5-2.pdf (adresse fixe) lu par tools/ukmil_aip.py →
           data/sia/zones/gb/ukmil_enr52.geojson (zones de vol à basse altitude, VATA, TVAA) et ukmil_aara-tracks.xml
           (zones de ravitaillement en vol en axes IP → CP) ; le PDF est gardé à côté (ukmil_ENR-5-2.pdf).
Le Royaume-Uni (NATS, AIXM 5.1) demande une inscription : fichier à déposer à la main dans data/sia/aixm5/.

Usage (racine du dépôt) :
  python tools/aero_fetch.py openaip gb de es      pays (codes ISO à deux lettres)
  python tools/aero_fetch.py faa [sua mtr class]
  python tools/aero_fetch.py enaire
  python tools/aero_fetch.py ukmil
  option --data <dossier> : dossier des données (défaut : data/)
Appelé aussi par le lanceur (POST /__setup/aero-fetch) pour les boutons de Paramètres › Maintenance › Données
aéronautiques.
"""
import json, os, re, sys, urllib.parse, urllib.request

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
UA = {'User-Agent': 'DEFA-suite/1.0 (+https://framagit.org/asr/flight_planner)'}
TIMEOUT = 120
OPENAIP = 'https://s3.openaip.net/openaip-system-exports/{cc}_{layer}.geojson'
OPENAIP_LAYERS = ('asp', 'apt', 'nav', 'rpp')
FAA = 'https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/{svc}/FeatureServer/0/query'
FAA_LAYERS = {'sua': 'Special_Use_Airspace', 'mtr': 'MTRSegment', 'class': 'Class_Airspace'}
FAA_PAGE = {'class': 250}  # objets par page (classes : contours très détaillés, le service expire au-delà)
# contours simplifiés par le service (≈ 50 m, 5 décimales) : assez pour les cartes de mission, 10 à 50 fois plus léger
FAA_SIMPLIFY = {'maxAllowableOffset': 0.0005, 'geometryPrecision': 5}
ENAIRE = 'https://aip.enaire.es/AIP/'
ENAIRE_KINDS = ('Airspace', 'EnRoute')


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=TIMEOUT) as r:
        return r.read()


def write(path, data):
    """Écriture atomique (fichier temporaire puis remplacement) : une lecture de la base ne voit jamais un fichier tronqué."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + '.part'
    with open(tmp, 'wb') as f:
        f.write(data)
    os.replace(tmp, path)


def openaip(data, countries, layers=OPENAIP_LAYERS):
    out, errors = [], []
    for cc in countries:
        cc = cc.strip().lower()
        if not re.fullmatch(r'[a-z]{2}', cc):
            errors.append(f'code pays invalide : {cc}')
            continue
        for layer in layers:
            try:
                body = get(OPENAIP.format(cc=cc, layer=layer))
            except urllib.error.HTTPError as e:
                if e.code in (403, 404):  # couche absente pour ce pays
                    continue
                errors.append(f'{cc}_{layer} : HTTP {e.code}')
                continue
            except OSError as e:
                errors.append(f'{cc}_{layer} : {e}')
                continue
            name = f'{cc}_{layer}.geojson'
            write(os.path.join(data, 'sia', 'openaip', name), body)
            out.append({'name': name, 'bytes': len(body), 'features': len(json.loads(body).get('features', []))})
    return out, errors


def faa(data, layers=('sua', 'mtr')):
    """Couches ArcGIS de la FAA, lues par pages (le service rend au plus 2000 objets par requête)."""
    out, errors = [], []
    for layer in layers:
        svc = FAA_LAYERS.get(layer)
        if not svc:
            errors.append(f'couche FAA inconnue : {layer}')
            continue
        feats, offset, size = [], 0, FAA_PAGE.get(layer, 2000)
        try:
            while True:
                q = urllib.parse.urlencode({'where': '1=1', 'outFields': '*', 'f': 'geojson', 'resultOffset': offset, 'resultRecordCount': size, **FAA_SIMPLIFY})
                for attempt in range(3):  # 502 / 504 passagers du service : deux nouveaux essais
                    try:
                        page = json.loads(get(FAA.format(svc=svc) + '?' + q))
                        break
                    except urllib.error.HTTPError as e:
                        if e.code not in (502, 503, 504) or attempt == 2:
                            raise
                if page.get('error'):  # erreur rendue en réponse ordinaire (quota dépassé, requête refusée)
                    err = page['error']
                    raise ValueError(f"service FAA : {err.get('code', '')} {err.get('message', '')}".strip())
                got = page.get('features', [])
                feats += got
                offset += len(got)
                if not got or not (page.get('exceededTransferLimit') or page.get('properties', {}).get('exceededTransferLimit')):
                    break
        except (OSError, ValueError) as e:
            errors.append(f'faa_{layer} : {e}')
            continue
        name = f'faa_{layer}.geojson'
        body = json.dumps({'type': 'FeatureCollection', 'features': feats}, separators=(',', ':')).encode('utf-8')
        write(os.path.join(data, 'sia', 'geojson', name), body)
        out.append({'name': name, 'bytes': len(body), 'features': len(feats)})
    return out, errors


def enaire(data):
    """Derniers jeux AIXM 5.1 d'ENAIRE (espaces, en route), d'après les liens de la page des données numériques."""
    out, errors = [], []
    try:
        page = get(ENAIRE + 'DatosDigitales-en.html').decode('utf-8', 'replace')
    except OSError as e:
        return out, [f'ENAIRE : {e}']
    folder = os.path.join(data, 'sia', 'aixm5')
    for kind in ENAIRE_KINDS:
        links = re.findall(r'href="(contenido_Datasets/LE_[^"]*?_AIP_DS_FULL_' + kind + r'\.xml)"', page)
        if not links:
            errors.append(f'ENAIRE : jeu {kind} introuvable sur la page')
            continue
        rel = links[0]
        name = rel.rsplit('/', 1)[-1]
        try:
            body = get(ENAIRE + rel)
        except OSError as e:
            errors.append(f'{name} : {e}')
            continue
        write(os.path.join(folder, name), body)
        for old in os.listdir(folder):  # amendements précédents du même jeu
            if old != name and re.fullmatch(r'LE_.*_AIP_DS_FULL_' + kind + r'\.xml', old):
                os.remove(os.path.join(folder, old))
        out.append({'name': name, 'bytes': len(body)})
    return out, errors


def ukmil(data):
    """UK Mil AIP ENR 5.2 : PDF téléchargé, lu (zones, AARA) et rangé dans zones/gb/ avec ses deux sorties."""
    import ukmil_aip
    try:
        raw = get(ukmil_aip.URL)
    except OSError as e:
        return [], [f'UK Mil AIP : {e}']
    try:
        g, xml, edition, n = ukmil_aip.convert(raw)
    except Exception as e:  # PDF d'une autre forme : on le garde quand même pour consultation
        g, xml, edition, n = None, None, '', {}
        err = [f'UK Mil AIP : PDF illisible ({e})']
    else:
        err = [] if n.get('zones') else ['UK Mil AIP : aucune zone lue dans l’ENR 5.2 (mise en page changée ?)']
    folder = os.path.join(data, 'sia', 'zones', 'gb')
    out = []
    write(os.path.join(folder, 'ukmil_ENR-5-2.pdf'), raw)
    out.append({'name': 'ukmil_ENR-5-2.pdf', 'bytes': len(raw)})
    if g and n.get('zones'):
        body = json.dumps(g, ensure_ascii=False).encode('utf-8')
        write(os.path.join(folder, 'ukmil_enr52.geojson'), body)
        out.append({'name': 'ukmil_enr52.geojson', 'bytes': len(body), 'features': n['zones']})
    if xml and n.get('aara'):
        body = xml.encode('utf-8')
        write(os.path.join(folder, 'ukmil_aara-tracks.xml'), body)
        out.append({'name': 'ukmil_aara-tracks.xml', 'bytes': len(body), 'features': n['aara']})
    return out, err


def fetch(data, provider, args=()):
    """Point d'entrée commun (ligne de commande, lanceur) : { ok, files, errors }."""
    args = [a for a in args if a]
    if provider == 'openaip':
        files, errors = openaip(data, args or ['gb'])
    elif provider == 'faa':
        files, errors = faa(data, args or ['sua', 'mtr'])
    elif provider == 'enaire':
        files, errors = enaire(data)
    elif provider == 'ukmil':
        files, errors = ukmil(data)
    else:
        return {'ok': False, 'files': [], 'errors': [f'fournisseur inconnu : {provider}']}
    return {'ok': bool(files) and not errors, 'files': files, 'errors': errors}


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    argv = sys.argv[1:]
    data = os.path.join(ROOT, 'data')
    if '--data' in argv:
        i = argv.index('--data')
        data = os.path.abspath(argv[i + 1])
        del argv[i:i + 2]
    if not argv:
        print(__doc__)
        return 1
    r = fetch(data, argv[0], argv[1:])
    for f in r['files']:
        print(f"  {f['name']} : {f['bytes'] // 1024} Ko" + (f", {f['features']} objets" if 'features' in f else ''))
    for e in r['errors']:
        print('  erreur :', e)
    return 0 if r['files'] else 1


if __name__ == '__main__':
    sys.exit(main())
