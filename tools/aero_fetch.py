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
           (zones de ravitaillement en vol en axes IP → CP) ; le PDF est gardé à côté (ukmil_ENR-5-2.pdf) ;
  nat      tracks NAT du jour (Atlantique Nord, système de routes organisées) : message de Shanwick et de Gander tel
           que publié par la FAA (nms.aim.faa.gov/datanat/nat.json) → data/sia/zones/nat/nat_tracks.json (lettre,
           points — noms de points ou « 63/20 » = 63° N 020° W —, niveaux est et ouest, validité) ;
  navcan   NAV CANADA, Designated Airspace Handbook : édition en vigueur (dah<AAAAMMJJ>.pdf, trouvée sur la page des
           guides opérationnels) lue par tools/navcan_dah.py → data/sia/zones/ca/navcan_dah.geojson (zones dangereuses,
           réglementées, consultatives) ; le PDF est gardé à côté (navcan_dah.pdf).
Le Royaume-Uni (NATS, AIXM 5.1) demande une inscription : fichier à déposer à la main dans data/sia/aixm5/.

Idempotent : un fichier déjà présent est demandé avec If-Modified-Since (304 : rien de téléchargé), un contenu identique
n'est jamais réécrit (date du fichier et base aéronautique inchangées), un jeu ENAIRE déjà présent n'est pas retéléchargé
et un PDF inchangé n'est pas relu. Chaque fichier du compte rendu porte « unchanged » (vrai : rien n'a changé).

Usage (racine du dépôt) :
  python tools/aero_fetch.py openaip gb de es      pays (codes ISO à deux lettres)
  python tools/aero_fetch.py faa [sua mtr class]
  python tools/aero_fetch.py enaire
  python tools/aero_fetch.py ukmil
  python tools/aero_fetch.py navcan
  python tools/aero_fetch.py nat
  option --data <dossier> : dossier des données (défaut : data/)
Appelé aussi par le lanceur (POST /__setup/aero-fetch) pour les boutons de Paramètres › Maintenance › Données
aéronautiques.
"""
import email.utils, json, os, re, sys, urllib.error, urllib.parse, urllib.request

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
import outbound  # noqa: E402 (le User-Agent du lanceur, chaque échec dit en console)

UA = {'User-Agent': outbound.UA}
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
NAT_URL = 'https://nms.aim.faa.gov/datanat/nat.json'
MAX_BYTES = 200 * 1024 * 1024  # 200 Mo au plus par réponse : au-delà, le téléchargement s'arrête (le fichier présent est gardé)
CHUNK = 1024 * 1024


class TooLarge(OSError):
    """Réponse plus grande que MAX_BYTES : lecture arrêtée, rien n'est écrit (une erreur réseau pour l'appelant)."""


def get(url, since=None):
    """Corps de la réponse ; None si le serveur répond 304 (rien de plus récent que since, date du fichier local)."""
    headers = dict(UA)
    if since:
        headers['If-Modified-Since'] = email.utils.formatdate(since, usegmt=True)
    try:
        with outbound.urlopen(urllib.request.Request(url, headers=headers), timeout=TIMEOUT) as r:
            size = r.headers.get('Content-Length')
            if size and size.isdigit() and int(size) > MAX_BYTES:
                raise TooLarge(f'réponse de {int(size) // 1048576} Mo, plus de {MAX_BYTES // 1048576} Mo : téléchargement arrêté')
            parts, n = [], 0
            while True:  # lecture par morceaux : un serveur qui ne dit pas la taille (ou ment) est arrêté au plafond
                part = r.read(CHUNK)
                if not part:
                    return b''.join(parts)
                n += len(part)
                if n > MAX_BYTES:
                    raise TooLarge(f'réponse de plus de {MAX_BYTES // 1048576} Mo : téléchargement arrêté')
                parts.append(part)
    except urllib.error.HTTPError as e:
        if e.code == 304:
            return None
        raise


def mtime(path):
    """Date du fichier local (secondes), None s'il est absent : sert à If-Modified-Since."""
    try:
        return os.path.getmtime(path)
    except OSError:
        return None


def same(path, data):
    """Vrai si le fichier existe déjà avec exactement ce contenu."""
    try:
        if os.path.getsize(path) != len(data):
            return False
        with open(path, 'rb') as f:
            return f.read() == data
    except OSError:
        return False


def write(path, data):
    """Écriture atomique (fichier temporaire puis remplacement) : une lecture de la base ne voit jamais un fichier tronqué.
    Contenu identique au fichier présent : rien n'est réécrit (sa date ne change pas, la base n'a pas à être refaite) ;
    renvoie vrai si le fichier a été écrit."""
    if same(path, data):
        return False
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + '.part'
    with open(tmp, 'wb') as f:
        f.write(data)
    os.replace(tmp, path)
    return True


def openaip(data, countries, layers=OPENAIP_LAYERS):
    out, errors = [], []
    for cc in countries:
        cc = cc.strip().lower()
        if not re.fullmatch(r'[a-z]{2}', cc):
            errors.append(f'code pays invalide : {cc}')
            continue
        for layer in layers:
            name = f'{cc}_{layer}.geojson'
            path = os.path.join(data, 'sia', 'openaip', name)
            try:
                body = get(OPENAIP.format(cc=cc, layer=layer), since=mtime(path))
            except urllib.error.HTTPError as e:
                if e.code in (403, 404):  # couche absente pour ce pays
                    continue
                errors.append(f'{cc}_{layer} : HTTP {e.code}')
                continue
            except OSError as e:
                errors.append(f'{cc}_{layer} : {e}')
                continue
            if body is None:  # 304 : le fichier présent est à jour
                out.append({'name': name, 'bytes': os.path.getsize(path), 'unchanged': True})
                continue
            changed = write(path, body)
            out.append({'name': name, 'bytes': len(body), 'features': len(json.loads(body).get('features', [])), 'unchanged': not changed})
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
        changed = write(os.path.join(data, 'sia', 'geojson', name), body)
        out.append({'name': name, 'bytes': len(body), 'features': len(feats), 'unchanged': not changed})
    return out, errors


def enaire(data):
    """Derniers jeux AIXM 5.1 d'ENAIRE (espaces, en route), d'après les liens de la page des données numériques."""
    out, errors = [], []
    try:
        page = get(ENAIRE + 'DatosDigitales-en.html').decode('utf-8', 'replace')
    except OSError as e:
        return out, [f'ENAIRE : {e}']
    from proc_pdf import safe_path
    folder = os.path.join(data, 'sia', 'aixm5')
    for kind in ENAIRE_KINDS:
        # le nom vient de la page du serveur : motif strict, puis chemin résolu sous sia/aixm5 (jamais de « \ », « / » ni « .. »)
        names = re.findall(r'href="contenido_Datasets/(LE_[A-Za-z0-9._-]+?_AIP_DS_FULL_' + kind + r'\.xml)"', page)
        if not names:
            errors.append(f'ENAIRE : jeu {kind} introuvable sur la page')
            continue
        name, pattern = names[0], re.compile(r'LE_[A-Za-z0-9._-]+_AIP_DS_FULL_' + kind + r'\.xml')
        try:
            path = safe_path(folder, name, pattern)
        except ValueError as e:
            errors.append(f'ENAIRE : {e}')
            continue
        if path.exists():  # amendement en vigueur déjà là : rien à télécharger
            out.append({'name': name, 'bytes': path.stat().st_size, 'unchanged': True})
            continue
        try:
            body = get(ENAIRE + 'contenido_Datasets/' + urllib.parse.quote(name))
        except OSError as e:
            errors.append(f'{name} : {e}')
            continue
        changed = write(str(path), body)
        for old in os.listdir(folder):  # amendements précédents du même jeu (même contrôle avant de retirer)
            if old != name and pattern.fullmatch(old):
                try:
                    os.remove(safe_path(folder, old, pattern))
                except ValueError:
                    pass
        out.append({'name': name, 'bytes': len(body), 'unchanged': not changed})
    return out, errors


def unchanged_outputs(folder, pdf, outputs):
    """Compte rendu « rien n'a changé » d'un PDF déjà lu (le PDF et ses sorties présentes), sinon None."""
    names = [pdf] + [o for o in outputs if os.path.exists(os.path.join(folder, o))]
    if len(names) < 2:
        return None
    return [{'name': n, 'bytes': os.path.getsize(os.path.join(folder, n)), 'unchanged': True} for n in names]


def ukmil(data):
    """UK Mil AIP ENR 5.2 : PDF téléchargé, lu (zones, AARA) et rangé dans zones/gb/ avec ses deux sorties."""
    import ukmil_aip
    folder = os.path.join(data, 'sia', 'zones', 'gb')
    outputs = ('ukmil_enr52.geojson', 'ukmil_aara-tracks.xml')
    pdf = os.path.join(folder, 'ukmil_ENR-5-2.pdf')
    try:
        raw = get(ukmil_aip.URL, since=mtime(pdf))
    except OSError as e:
        return [], [f'UK Mil AIP : {e}']
    # PDF inchangé (304, ou même contenu) et déjà lu : ni relecture du PDF ni réécriture
    done = unchanged_outputs(folder, 'ukmil_ENR-5-2.pdf', outputs) if raw is None or same(pdf, raw) else None
    if done:
        return done, []
    if raw is None:  # 304 sans sorties lues : le PDF présent est relu
        with open(pdf, 'rb') as f:
            raw = f.read()
    try:
        g, xml, edition, n = ukmil_aip.convert(raw)
    except Exception as e:  # PDF d'une autre forme : on le garde quand même pour consultation
        g, xml, edition, n = None, None, '', {}
        err = [f'UK Mil AIP : PDF illisible ({e})']
    else:
        err = [] if n.get('zones') else ['UK Mil AIP : aucune zone lue dans l’ENR 5.2 (mise en page changée ?)']
    out = []
    changed = write(pdf, raw)
    out.append({'name': 'ukmil_ENR-5-2.pdf', 'bytes': len(raw), 'unchanged': not changed})
    if g and n.get('zones'):
        body = json.dumps(g, ensure_ascii=False).encode('utf-8')
        changed = write(os.path.join(folder, 'ukmil_enr52.geojson'), body)
        out.append({'name': 'ukmil_enr52.geojson', 'bytes': len(body), 'features': n['zones'], 'unchanged': not changed})
    if xml and n.get('aara'):
        body = xml.encode('utf-8')
        changed = write(os.path.join(folder, 'ukmil_aara-tracks.xml'), body)
        out.append({'name': 'ukmil_aara-tracks.xml', 'bytes': len(body), 'features': n['aara'], 'unchanged': not changed})
    return out, err


def navcan(data):
    """NAV CANADA DAH : édition en vigueur (adresse datée, lue sur la page des guides) téléchargée, lue et rangée dans zones/ca/."""
    import navcan_dah
    folder = os.path.join(data, 'sia', 'zones', 'ca')
    pdf = os.path.join(folder, 'navcan_dah.pdf')
    try:
        url = navcan_dah.current_url(get(navcan_dah.PAGE).decode('utf-8', 'replace'))
        if not url:
            return [], ['NAV CANADA : aucun lien vers le DAH sur la page des guides opérationnels (page changée ?)']
        raw = get(url, since=mtime(pdf))  # adresse datée : une nouvelle édition répond toujours 200
    except OSError as e:
        return [], [f'NAV CANADA : {e}']
    # édition inchangée (304, ou même contenu) et déjà lue : ni relecture du PDF ni réécriture
    done = unchanged_outputs(folder, 'navcan_dah.pdf', ('navcan_dah.geojson',)) if raw is None or same(pdf, raw) else None
    if done:
        return done, []
    if raw is None:  # 304 sans sortie lue : le PDF présent est relu
        with open(pdf, 'rb') as f:
            raw = f.read()
    try:
        g, edition, n = navcan_dah.convert(raw)
    except Exception as e:  # PDF d'une autre forme : on le garde quand même pour consultation
        g, edition, n = None, '', {}
        err = [f'NAV CANADA : PDF illisible ({e})']
    else:
        err = [] if n.get('zones') else ['NAV CANADA : aucune zone lue dans le DAH (mise en page changée ?)']
    changed = write(pdf, raw)
    out = [{'name': 'navcan_dah.pdf', 'bytes': len(raw), 'edition': edition, 'url': url, 'unchanged': not changed}]
    if g and n.get('zones'):
        body = json.dumps(g, ensure_ascii=False).encode('utf-8')
        changed = write(os.path.join(folder, 'navcan_dah.geojson'), body)
        out.append({'name': 'navcan_dah.geojson', 'bytes': len(body), 'features': n['zones'], 'edition': edition, 'unchanged': not changed})
    return out, err


def nat_parse(messages):
    """Tracks d'une liste de messages NAT de la FAA ([{ icao_id, condition_message, start_datetime, end_datetime }]) :
    [{ id, route: [jetons], east: [niveaux], west: [niveaux], nar: [routes], by, from, to }], dans l'ordre des lettres."""
    tracks = {}
    for m in messages:
        cur = None
        for raw in str(m.get('condition_message') or '').replace('\r', '').split('\n'):
            line = raw.strip().rstrip('-').strip()
            t = re.fullmatch(r'([A-Z]) ((?:[A-Z0-9]{2,5}|\d{2,4}/\d{2,3})(?: (?:[A-Z0-9]{2,5}|\d{2,4}/\d{2,3}))+)', line)
            if t:
                cur = tracks[t.group(1)] = {'id': t.group(1), 'route': t.group(2).split(), 'east': [], 'west': [], 'nar': [],
                                            'by': m.get('icao_id') or '', 'from': m.get('start_datetime') or '',
                                            'to': m.get('end_datetime') or ''}
                continue
            if not cur:
                continue
            for key, label in (('east', 'EAST LVLS'), ('west', 'WEST LVLS'), ('nar', 'NAR')):
                if line.startswith(label):
                    cur[key] = [x for x in line[len(label):].split() if x != 'NIL']
    return [tracks[k] for k in sorted(tracks)]


def nat(data):
    """Tracks NAT en vigueur (FAA) → zones/nat/nat_tracks.json ; le fichier n'est réécrit que si les tracks changent."""
    try:
        msgs = json.loads(get(NAT_URL))
    except (OSError, ValueError) as e:
        return [], [f'NAT (FAA) : {e}']
    msgs = [m for m in msgs if isinstance(m, dict) and m.get('transaction_type', 'NAT_TRACK') == 'NAT_TRACK']
    tracks = nat_parse(msgs)
    if not tracks:
        return [], ['NAT (FAA) : aucun track dans le message publié (format changé ?)']
    doc = {'source': 'FAA NMS — ' + NAT_URL, 'tracks': tracks,
           'messages': [{'by': m.get('icao_id') or '', 'id': m.get('notam_number_formatted') or '', 'part': m.get('part_no'),
                         'from': m.get('start_datetime') or '', 'to': m.get('end_datetime') or ''} for m in msgs]}
    body = json.dumps(doc, ensure_ascii=False, indent=1).encode('utf-8')
    changed = write(os.path.join(data, 'sia', 'zones', 'nat', 'nat_tracks.json'), body)
    return [{'name': 'nat_tracks.json', 'bytes': len(body), 'features': len(tracks), 'unchanged': not changed}], []


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
    elif provider == 'navcan':
        files, errors = navcan(data)
    elif provider == 'nat':
        files, errors = nat(data)
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
        print(f"  {f['name']} : {f['bytes'] // 1024} Ko" + (f", {f['features']} objets" if 'features' in f else '') + (' (inchangé)' if f.get('unchanged') else ''))
    for e in r['errors']:
        print('  erreur :', e)
    return 0 if r['files'] else 1


if __name__ == '__main__':
    sys.exit(main())
