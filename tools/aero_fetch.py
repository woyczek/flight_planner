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
  dfs      DFS Allemagne, « AIP Datasets », jeu « ED Routes » (routes ATS, AIXM 5.1, CC BY 4.0, crédit DFS) → data/sia/zones/de/dfs_ED_Routes.xml
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
import datetime, email.utils, http.client, json, os, re, ssl, sys, urllib.error, urllib.parse, urllib.request

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
import outbound  # noqa: E402 (le User-Agent du lanceur, chaque échec dit en console)

UA = {'User-Agent': outbound.UA}
TIMEOUT = 120          # secondes : le temps d'une requête (chaque lecture de la socket une fois connecté)
CONNECT_TIMEOUT = 15   # secondes : la connexion (TCP, puis la poignée de main TLS) — un hôte muet ne tient plus l'unique emplacement de travail deux minutes par requête
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
DFS = 'https://aip.dfs.de/datasets/rest/'     # DFS « AIP Datasets » (API REST v1.2) : les métadonnées à cette adresse, un jeu à <adresse><amendement>/<nom du fichier>
DFS_FILE = re.compile(r'^ED_Routes_\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}_[a-z]+\.xml\Z')
MAX_BYTES = 200 * 1024 * 1024  # 200 Mo au plus par réponse : au-delà, le téléchargement s'arrête (le fichier présent est gardé)
CHUNK = 1024 * 1024


class TooLarge(OSError):
    """Réponse plus grande que MAX_BYTES : lecture arrêtée, rien n'est écrit (une erreur réseau pour l'appelant)."""


def _bounded(base):
    """La classe de connexion `base` avec sa connexion bornée à CONNECT_TIMEOUT (au plus le temps de la requête) ; une fois connectée (TLS compris), la socket reprend le temps de la requête."""
    class Bounded(base):
        def connect(self):
            whole = self.timeout
            if isinstance(whole, (int, float)) and not isinstance(whole, bool):
                self.timeout = min(whole, CONNECT_TIMEOUT)
            try:
                super().connect()
            finally:
                self.timeout = whole
            if self.sock is not None and isinstance(whole, (int, float)):
                self.sock.settimeout(whole)
    return Bounded


class _Http(urllib.request.HTTPHandler):
    def http_open(self, req):
        return self.do_open(_bounded(http.client.HTTPConnection), req)


class _Https(urllib.request.HTTPSHandler):
    def https_open(self, req):
        return self.do_open(_bounded(http.client.HTTPSConnection), req, context=self._context)


_OPENERS = {}


def _open(req, timeout, quiet):
    """La requête par un ouvreur du lanceur (outbound : User-Agent, redirections sur le même hôte, console) qui n'écrit pas les codes
    de quiet : un 304 n'est jamais un échec (la copie locale est bonne), un 404 / 410 d'un export facultatif une absence attendue."""
    op = _OPENERS.get(quiet) or _OPENERS.setdefault(quiet, outbound.opener(_Http(), _Https(), quiet=quiet))
    return op.open(req, timeout=timeout)


def _body(r):
    """Le corps d'une réponse, lu par morceaux et arrêté au plafond (un serveur qui ne dit pas la taille, ou ment) : TooLarge."""
    size = r.headers.get('Content-Length')
    if size and size.isdigit() and int(size) > MAX_BYTES:
        raise TooLarge(f'réponse de {int(size) // 1048576} Mo, plus de {MAX_BYTES // 1048576} Mo : téléchargement arrêté')
    parts, n = [], 0
    while True:
        part = r.read(CHUNK)
        if not part:
            return b''.join(parts)
        n += len(part)
        if n > MAX_BYTES:
            raise TooLarge(f'réponse de plus de {MAX_BYTES // 1048576} Mo : téléchargement arrêté')
        parts.append(part)


def get(url, since=None, absent_ok=False, copy=None):
    """Corps de la réponse ; None si le serveur répond 304 (rien de plus récent que since, date du fichier local copy) : la copie est
    bonne, et un 304 n'est jamais écrit dans la console du lanceur. Un 304 sans copie derrière lui (aucune condition envoyée, ou copy
    disparue entre-temps) redemande une fois sans condition (Cache-Control: no-cache) au lieu d'échouer ; un second 304 est alors une
    erreur. absent_ok : un 404 / 410 est une absence attendue (un export facultatif), levée comme avant mais jamais écrite dans la console."""
    headers = dict(UA)
    if since:
        headers['If-Modified-Since'] = email.utils.formatdate(since, usegmt=True)
    absent = (404, 410) if absent_ok else ()
    try:
        with _open(urllib.request.Request(url, headers=headers), TIMEOUT, (304, *absent)) as r:
            return _body(r)
    except urllib.error.HTTPError as e:
        if e.code != 304:
            raise
        if since and (copy is None or os.path.exists(copy)):
            return None
    with _open(urllib.request.Request(url, headers={**UA, 'Cache-Control': 'no-cache'}), TIMEOUT, absent) as r:
        return _body(r)


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


def openaip(data, countries, layers=OPENAIP_LAYERS, absent=None, known=()):
    """Exports d'openAIP par pays et couche. Une couche qu'openAIP n'a pas pour ce pays (403, 404) est absente, jamais un échec :
    rien dans errors, son nom (« kh_rpp ») ajouté à absent quand la liste est donnée ; une couche de known (absente ce cycle, déjà
    vue) n'est pas redemandée. Un 5xx, un délai ou une réponse illisible restent des échecs, dits par fichier."""
    out, errors = [], []
    for cc in countries:
        cc = cc.strip().lower()
        if not re.fullmatch(r'[a-z]{2}', cc):
            errors.append(f'code pays invalide : {cc}')
            continue
        for layer in layers:
            name = f'{cc}_{layer}.geojson'
            path = os.path.join(data, 'sia', 'openaip', name)
            if f'{cc}_{layer}' in known:  # absente ce cycle : pas redemandée
                if absent is not None:
                    absent.append(f'{cc}_{layer}')
                continue
            try:
                body = get(OPENAIP.format(cc=cc, layer=layer), since=mtime(path), absent_ok=True, copy=path)
            except urllib.error.HTTPError as e:
                if e.code in (403, 404):  # couche absente pour ce pays
                    if absent is not None:
                        absent.append(f'{cc}_{layer}')
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


def nasr(data):
    """Le NASR de la FAA (SOG-0153 d) : le cycle en vigueur lu sur la page de l'abonnement, les trois jeux CSV (FIX, AWY, NAV : adresses calculées par tools/faa_nasr.py) lus et convertis en faa_nasr.geojson (points et voies de la zone us) ; le fichier est remplacé seulement s'il change."""
    import faa_nasr
    issue, refused, used = None, '', None
    try:
        issue = faa_nasr.current_cycle(get(faa_nasr.PAGE).decode('utf-8', 'replace'))
    except OSError as e:
        refused = str(e)                      # SOG-0219 : la page de la FAA (faa.gov) répond HTTP 403 au lanceur, qui se déclare tel qu'il est (jamais un autre navigateur) : le cycle est alors CALCULÉ
    if issue:
        cycles = [issue]
    else:                                     # les cycles du NASR suivent le calendrier AIRAC : celui en vigueur, puis le précédent, lus sur le serveur des jeux (nfdc.faa.gov, une autre adresse que la page)
        import aero_cycles
        now = datetime.date.today()
        cur = aero_cycles.airac_start(now)
        cycles = [cur, aero_cycles.airac_start(datetime.date.fromisoformat(cur) - datetime.timedelta(days=1))]
    last = None
    for cycle in cycles:
        try:
            blobs = [get(faa_nasr.url(k, cycle)) for k in ('FIX', 'AWY', 'NAV')]
        except OSError as e:
            last = e
            continue
        issue = cycle
        break
    else:
        cycle, blobs, partial = faa_nasr.deposited_latest(data)     # les trois jeux CHOISIS à la main par l'utilisateur (« Choisir le fichier… », data/local/upload/) : le repli quand la FAA refuse le lanceur, quel que soit leur cycle
        if blobs:
            issue = cycle
            used = faa_nasr.deposited_date(data, cycle)      # lus faute de réseau : la ligne du résultat dit DEPUIS QUAND (un dépôt ancien n'est jamais pris pour une lecture du jour)
    if not issue or not blobs:
        why = (f'la page du NASR refuse l’accès automatique ({refused}) ; ' if refused else 'cycle en vigueur introuvable sur la page du NASR ; ') + \
            f'les jeux du cycle {" ou ".join(cycles)} ne répondent pas non plus sur {faa_nasr.HOST} ({last}) : points et voies des États-Unis non mis à jour, ceux déjà là sont gardés. ' + \
            f'Repli : télécharger les trois jeux CSV (FIX, AWY, NAV) de {faa_nasr.PAGE} dans un navigateur, puis « Choisir le fichier… » sur la ligne des États-Unis (Données)' + \
            ''.join(f' ; déjà déposés pour {c} : {", ".join(ks)}, il manque {", ".join(k for k in faa_nasr.KINDS if k not in ks)}' for c, ks in partial.items() if len(ks) < 3)
        raise ValueError(why)
    g, n, m = faa_nasr.convert(*blobs, issue)
    body = json.dumps(g, separators=(',', ':')).encode('utf-8')
    name = faa_nasr.NAME + '.geojson'
    changed = write(os.path.join(data, 'sia', 'geojson', name), body)
    return {'name': name, 'bytes': len(body), 'features': n + m, 'unchanged': not changed, **({'deposited': used} if used else {})}


def faa(data, layers=('sua', 'mtr')):
    """Couches ArcGIS de la FAA, lues par pages (le service rend au plus 2000 objets par requête) ; « nasr » : le NASR (points et voies)."""
    out, errors = [], []
    for layer in layers:
        if layer == 'nasr':
            try:
                out.append(nasr(data))
            except (OSError, ValueError) as e:
                errors.append(f'faa_nasr : {e}')
            continue
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


def dfs(data):
    """Les routes ATS de l'Allemagne (DFS, jeu « ED Routes », AIXM 5.1, licence CC BY 4.0, crédit DFS) : l'amendement en vigueur (n° 0 des métadonnées), vérifié par sa somme SHA-512, rangé sous un nom stable
    (zones/de/dfs_ED_Routes.xml : un seul fichier, l'amendement suivant le remplace). La somme du fichier présent est comparée à celle des métadonnées : identique, rien n'est téléchargé (15 Mo)."""
    import hashlib
    try:
        meta = json.loads(get(DFS).decode('utf-8'))
    except (OSError, ValueError) as e:
        return [], [f'DFS : {e}']

    def leaves(items):
        for it in items if isinstance(items, list) else []:
            if isinstance(it, dict) and it.get('type') == 'group':
                yield from leaves(it.get('items'))
            elif isinstance(it, dict):
                yield it
    release = None
    for amdt in meta.get('Amdts', []) if isinstance(meta, dict) else []:
        if isinstance(amdt, dict) and amdt.get('Amdt') == 0:
            for leaf in leaves((amdt.get('Metadata') or {}).get('datasets')):
                if leaf.get('name') == 'ED Routes':
                    release = next((r for r in leaf.get('releases') or [] if isinstance(r, dict) and r.get('type') == 'AIXM 5.1'), None)
    name = release.get('filename') if release else None
    check = ((release or {}).get('checksum') or {}).get('value')
    if not (isinstance(name, str) and DFS_FILE.match(name) and isinstance(check, str) and re.fullmatch(r'[0-9a-f]{128}', check)):
        return [], ['DFS : le jeu « ED Routes » (AIXM 5.1) n’est pas dans les métadonnées (format changé ?)']
    path = os.path.join(data, 'sia', 'zones', 'de', 'dfs_ED_Routes.xml')
    try:
        with open(path, 'rb') as f:
            if hashlib.sha512(f.read()).hexdigest() == check:
                return [{'name': 'dfs_ED_Routes.xml', 'bytes': os.path.getsize(path), 'unchanged': True}], []
    except OSError:
        pass
    try:
        body = get(DFS + '0/' + name)
    except OSError as e:
        return [], [f'{name} : {e}']
    if hashlib.sha512(body).hexdigest() != check:
        return [], [f'{name} : la somme SHA-512 ne correspond pas aux métadonnées : rien n’est écrit']
    changed = write(path, body)
    return [{'name': 'dfs_ED_Routes.xml', 'bytes': len(body), 'unchanged': not changed}], []


def airnav(data):
    """eAIP d'Irlande (AirNav Ireland) : l'édition en vigueur (adresse lue sur la page AIM, contrôlée), ses pages ENR 4.4 et ENR 3.3 lues (tools/airnav_eaip.py) et rangées en GeoJSON dans zones/ie/
    (airnav_ie_enr_AAAAMMJJ.geojson : la date de l'édition est son cycle). L'édition déjà présente n'est pas relue ; les éditions précédentes du même jeu sont retirées."""
    import airnav_eaip
    folder = os.path.join(data, 'sia', 'zones', 'ie')
    try:
        cur = airnav_eaip.current_issue(get(airnav_eaip.AIM).decode('utf-8', 'replace'))
        if not cur:
            return [], ['AirNav Ireland : édition en vigueur introuvable sur la page AIM (page changée ?)']
        url, issue = cur
        name = airnav_eaip.out_name(issue)
        path = os.path.join(folder, name)
        if os.path.exists(path):  # l'édition en vigueur est déjà là : rien à lire
            return [{'name': name, 'bytes': os.path.getsize(path), 'edition': issue, 'unchanged': True}], []
        e44 = get(airnav_eaip.page_url(url, airnav_eaip.PAGES[0])).decode('utf-8', 'replace')
        e33 = get(airnav_eaip.page_url(url, airnav_eaip.PAGES[1])).decode('utf-8', 'replace')
    except (OSError, ValueError) as e:
        return [], [f'AirNav Ireland : {e}']
    try:
        g, n, m = airnav_eaip.convert(e44, e33, issue)
    except ValueError as e:
        return [], [f'AirNav Ireland : {e}']
    body = json.dumps(g, ensure_ascii=False).encode('utf-8')
    changed = write(path, body)
    from proc_pdf import safe_path
    for old in os.listdir(folder):  # les éditions précédentes (même contrôle de nom avant de retirer)
        if old != name and airnav_eaip.OUT_RE.fullmatch(old):
            try:
                os.remove(safe_path(folder, old, airnav_eaip.OUT_RE))
            except ValueError:
                pass
    return [{'name': name, 'bytes': len(body), 'features': n + m, 'edition': issue, 'unchanged': not changed}], []


def eaip_candidates(prof, downloads):
    """Les eAIP pris à la main qui SE PRÉSENTENT dans les dossiers du lanceur, sans rien lire de leur contenu : [(chemin, nom, date du fichier)] — un zip qui porte une ISO ou le dossier de l'eAIP, une image .iso, un dossier avec `eAIP/html/eAIP/` ; au plus 40.
    C'est ce que base/status regarde pour dire « un fichier attend dans Téléchargements » (pickup-waiting) ; eaip_manual les lit."""
    import zipfile
    import eaip_annexe15 as core
    out = []
    for folder in (downloads() if callable(downloads) else []):
        try:
            names = sorted(os.listdir(folder))
        except OSError:
            continue
        for n in names:
            p = os.path.join(folder, n)
            low = n.lower()
            looks = False
            try:
                if os.path.isdir(p) and not os.path.islink(p):
                    looks = os.path.isdir(os.path.join(p, 'eAIP', 'html', 'eAIP')) or os.path.isdir(os.path.join(p, 'html', 'eAIP'))
                elif low.endswith('.iso') and os.path.isfile(p):
                    looks = True
                elif low.endswith('.zip') and os.path.isfile(p) and os.path.getsize(p) <= core.PKG_MAX_BYTES:
                    with zipfile.ZipFile(p) as zf:
                        infos = zf.infolist()
                        looks = (len(infos) <= 2 and any(i.filename.lower().endswith('.iso') for i in infos)) or any('eaip/html/eaip' in i.filename.replace('\\', '/').lower() for i in infos[:5000])
                if looks:
                    out.append((p, n, os.path.getmtime(p)))
            except (OSError, zipfile.BadZipFile, ValueError):
                continue
            if len(out) >= 40:
                return out
    return out


def eaip_pick(found):
    """L'édition à prendre parmi les eAIP lus ([(édition, date du fichier, nom, pages…)]) : la plus récente DÉJÀ EN VIGUEUR, sinon la plus proche à venir."""
    import datetime
    today = datetime.date.today().isoformat()
    inforce = sorted((m for m in found if m[0] <= today), key=lambda m: (m[0], m[1]))
    return inforce[-1] if inforce else sorted(found, key=lambda m: (m[0], m[1]))[0]


def eaip_manual(prof, downloads):
    """Les eAIP PRIS À LA MAIN que le lanceur trouve pour ce profil, dans les dossiers qu'il connaît (`downloads()` : data/local/upload/, Téléchargements…) — jamais un chemin venu de la page : un zip qui porte une ISO ou le dossier de l'eAIP
    (quel que soit son nom de Windows : « EAIP ISO (1).zip »), une image .iso, un dossier extrait (eAIP/html/eAIP/ à son premier niveau). Rend ([(édition, date du fichier, nom, (page ENR 4.4, pages de routes))], [refus en clair]) :
    un candidat qui ressemble à un eAIP mais n'est pas celui du profil, ou qui ne se lit pas, est un refus DIT (« ISO illisible : … »), pas un silence ; ce qui n'y ressemble pas (un autre zip) n'est pas regardé."""
    import eaip_annexe15 as core
    found, refused = [], []
    for p, n, mtime in eaip_candidates(prof, downloads):
        try:
            page44, routes, issue = core.read_package(prof, p)
            found.append((issue, mtime, n, (page44, routes), p))
        except (ValueError, OSError) as e:
            refused.append(f'{n} : {e}')
    return found, refused


def eaip_tables(data, key, downloads=None):
    """Un eAIP à tableaux d'Annexe 15 (tools/eaip_annexe15.py, profil `key`). D'abord le fichier PRIS À LA MAIN (zip, ISO, dossier : voir eaip_manual), la plus récente des éditions déjà EN VIGUEUR (sinon la plus proche à venir, dite) ; à défaut, le site : l'ENR 4.4
    lu d'abord (sa date d'entrée en vigueur, dans son titre, est l'édition) ; si l'édition est déjà là, rien d'autre n'est lu ; sinon les pages de routes. Le GeoJSON est écrit dans zones/<zone>/ sous la date de l'édition (son cycle), les éditions précédentes
    du même jeu sont retirées. Les adresses du site sont celles du profil (hôte et base fixes), jamais celles d'une page. Un fichier pris à la main dont une route n'est pas nommée dans l'édition est dit (`skipped`)."""
    import datetime
    import eaip_annexe15 as core
    prof = core.PROFILES[key]
    label = prof['label'].split(' (')[0]
    folder = os.path.join(data, 'sia', 'zones', prof['zone'])
    out_re = core.out_re(prof)
    manual, refused = eaip_manual(prof, downloads)
    p44, routes, issue, how = None, None, None, ''
    if manual:
        pick = eaip_pick(manual)
        issue, how, (p44, routes) = pick[0], pick[2], pick[3]
    if p44 is None:
        try:
            p44 = get(core.page_url(prof, prof['points'])).decode('utf-8', 'replace')
            issue = core.issue_of_title(p44)
            if not issue:
                return [], [f'{label} : date d’entrée en vigueur introuvable dans le titre de l’ENR 4.4 (page changée ?)'] + [f'fichier non pris : {r}' for r in refused]
            if os.path.exists(os.path.join(folder, core.out_name(prof['name'], issue))):  # l'édition en vigueur est déjà là : rien d'autre à lire
                name = core.out_name(prof['name'], issue)
                return [{'name': name, 'bytes': os.path.getsize(os.path.join(folder, name)), 'edition': issue, 'unchanged': True}], []
            routes = [get(core.page_url(prof, n)).decode('utf-8', 'replace') for n in prof['routes']]
        except (OSError, ValueError) as e:
            hint = f' ; ou prendre le fichier à la main : le zip ou l’image ISO de l’AIP, ou son dossier extrait, dans Téléchargements ou par « Choisir le fichier… »'
            return [], [f'{label} : {e}{hint}'] + [f'fichier non pris : {r}' for r in refused]
    name = core.out_name(prof['name'], issue)
    path = os.path.join(folder, name)
    try:
        g, n, m = core.convert_tables(prof, p44, routes, issue)
    except ValueError as e:
        return [], [f'{label} : {e}']
    body = json.dumps(g, ensure_ascii=False).encode('utf-8')
    changed = write(path, body)
    from proc_pdf import safe_path
    for old in os.listdir(folder):  # les éditions précédentes (même contrôle de nom avant de retirer)
        if old != name and out_re.fullmatch(old):
            try:
                os.remove(safe_path(folder, old, out_re))
            except ValueError:
                pass
    entry = {'name': name, 'bytes': len(body), 'features': n + m, 'edition': issue, 'unchanged': not changed}
    if how:
        entry['from'] = how          # pris à la main : le nom du fichier ou du dossier (jamais un chemin)
        if issue > datetime.date.today().isoformat():
            entry['future'] = True   # édition pas encore en vigueur : seule celle-là était là
        if issue < __import__('aero_cycles').airac_start():
            entry['older_than_cycle'] = True    # prise mais signalée : l'édition lue est plus ancienne que le cycle AIRAC en vigueur (l'écran le dit, jamais une coche « à jour » muette)
    if g.get('skipped'):
        entry['skipped'] = g['skipped']
    if refused:
        entry['refused'] = refused[:5]      # des fichiers qui ressemblaient à un eAIP et n'ont pas été pris, dits en clair (la source n'échoue pas pour autant)
    return [entry], []


def navpt(data, downloads=None):
    """eAIP du Portugal (NAV Portugal) : ENR 4.4, ENR 3.1 et ENR 3.3 (tools/eaip_annexe15.py, profil pt), pris à la main (zip, ISO, dossier) ou sur le site."""
    return eaip_tables(data, 'pt', downloads)


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
    used = None
    try:
        raw = get(ukmil_aip.URL, since=mtime(pdf), copy=pdf)
    except OSError as e:
        deposited = os.path.join(data, 'local', 'upload', 'ENR-5-2.pdf')      # le PDF choisi à la main (« Choisir le fichier… ») quand le serveur refuse le lanceur
        try:
            with open(deposited, 'rb') as f:
                raw = f.read(MAX_BYTES)
            used = datetime.date.fromtimestamp(os.path.getmtime(deposited)).isoformat()      # lu faute de réseau : la ligne du résultat dit depuis quand
        except OSError:
            tls = isinstance(getattr(e, 'reason', e), ssl.SSLError) or 'SSL' in str(e)
            return [], [f'UK Mil AIP : {e}' + (' (la connexion est coupée pendant la poignée de main TLS, avant toute requête HTTP : l’agent n’y est pour rien)' if tls else '') +
                        f' ; repli : télécharger {ukmil_aip.URL} dans un navigateur, puis « Choisir le fichier… » sur la ligne du Royaume-Uni (Données)']
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
    out.append({'name': 'ukmil_ENR-5-2.pdf', 'bytes': len(raw), 'unchanged': not changed, **({'deposited': used} if used else {})})
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
        raw = get(url, since=mtime(pdf), copy=pdf)  # adresse datée : une nouvelle édition répond toujours 200
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
        files, errors = faa(data, args or ['sua', 'mtr', 'nasr'])
    elif provider == 'enaire':
        files, errors = enaire(data)
    elif provider == 'ukmil':
        files, errors = ukmil(data)
    elif provider == 'navcan':
        files, errors = navcan(data)
    elif provider == 'airnav':
        files, errors = airnav(data)
    elif provider == 'dfs':
        files, errors = dfs(data)
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
