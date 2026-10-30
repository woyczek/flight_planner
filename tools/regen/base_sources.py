"""Télécharger et purger les sources brutes d'une zone, SANS FENÊTRE (jeu « base » du lanceur ; DECISIONS de frame/aerodb du 30 octobre 2026 ;
frame/aerodb/INTEGRATION.md « Fetching and purging the sources on the workstation ») — chargé par regen_jobs.load_verbs(). Bibliothèque standard seulement.

Deux verbes, qui complètent `base/build` (tools/regen/base.py) : les sources brutes n'ont plus leur place dans le dépôt des données (elles se retélécharge
et se reconstruisent), le module Données les télécharge et les purge par zone.

`base/fetch`, arguments `{ zones: [identifiants], personal?: [sources] }` (rien d'autre : 400). Pour chaque zone, les sources de kind « download » du catalogue
(shared/aero_zones.js, reflété ici par SOURCES / sources_of) sont téléchargées par tools/aero_fetch.py (aucun téléchargement n'est recopié) à l'endroit où il écrit
aujourd'hui, data/sia/… : openaip (le pays de la zone, couche par couche), faa et faaclass (us), enaire (es, SEULEMENT si « enaire » est dans `personal`, sinon
state 'skipped', error 'personal'), ukmil (gb), navcan (ca), nat (nat). Les sources manual / pdf (sia, nats, dircam) ne sont jamais téléchargées : state 'manual'
(error 'manual'), avec leur adresse https dans le résultat. Les sources local (xplane) et computed (mora) ne sont pas de ce travail : elles n'apparaissent ni dans la
vue ni dans le résultat. AUCUN commit (décision du 30 octobre) : les sources brutes sont ignorées par git (tools/data_template/.gitignore). Annulation entre deux fichiers
(openaip : entre deux couches ; faa : entre deux couches) ; une source en échec n'arrête pas les autres.
  Vue (GET regen/job?id=) : `zones: { <zone>: { state ('waiting' | 'fetching' | 'done' | 'failed' | 'cancelled'), done, total, error?, sources: { <source>: { state
  ('downloaded' | 'unchanged' | 'failed' | 'skipped' | 'manual'), files?, bytes?, error?, status? } } } }` ; step « N zones sur M », done / total en zones (unit 'zones').
  Par zone, done / total = sources téléchargeables essayées n / m (une source 'skipped' n'est pas comptée) ; `sources` porte aussi, dès le départ, les sources 'manual'
  et 'skipped'. 'downloaded' : au moins un fichier écrit ; 'unchanged' : rien n'a changé (304, ou contenu identique) ; 'failed' : une erreur (les fichiers obtenus quand même
  sont comptés). Une zone est 'failed' si une de ses sources a échoué (`error` = le code de la première), sinon 'done'. Codes d'une source : 'network', 'http' (+ status),
  'parse', 'personal', 'manual'. Un pays sans export openAIP (les quatre couches répondent 403 / 404, ou l'identifiant n'est pas un code de deux lettres : cyn, kas, sol) :
  'failed', 'http', 404.
  Résultat : `{ ok, fetched: [zones où quelque chose a changé], unchanged: [zones sans échec où rien n'a changé], failed: [{ zone, source, error, status? }], manual: [{ zone,
  source, url?, name: [fr, en, de, es] }], outside_sync: n, warnings: [{ code: 'outside-sync', count: n }], reason? }` ; `outside_sync` = les fichiers SUIVIS par git dans data/ que
  ce travail a modifiés (git ls-files : suivi = présent dans l'index) ; 0 : pas d'avertissement ; reason : 'partial', 'failed', 'cancelled', 'nothing-to-fetch' (aucune source à essayer :
  ok est alors faux).

`base/purge`, arguments `{ zones: [identifiants], what?: ['sources', 'caches'] (les deux par défaut), dry?: vrai }` (rien d'autre : 400). Retire les fichiers sources de la zone sous
data/sia/ (ceux que file_source lui attribue : openaip/<cc>_*, aixm5/LE_* pour es, geojson/faa_* pour us, zones/<zone>/*, et pour fr les fichiers AIXM / XML_SIA / sia-airspaces /
miam-*.xml de la racine) et ses caches sous data/local/ (fr : local/eaip/). JAMAIS sia/base/ ni proc/ (on ne les parcourt pas), JAMAIS un fichier SUIVI par git (il quitterait le dépôt pour
tous les postes : gardé et compté, warning 'kept-tracked' avec `count`), jamais un lien ni un chemin qui sort de data/sia ou data/local. Purger fr ajoute le warning 'shared-fr' (les contours des FIR
de France, lus dans XML_SIA, servent la construction de toutes les zones). `dry` : même vue, même résultat, rien n'est retiré.
  Vue : `zones: { <zone>: { state ('waiting' | 'purging' | 'done' | 'failed'), files, bytes, error? } }`, step « N zones sur M » ; une annulation laisse les zones pas atteintes 'waiting'.
  Résultat : `{ ok, removed: { <zone>: { files, bytes } }, warnings: [{ code, count? }], reason? }` ; reason : 'partial', 'failed', 'cancelled' ; codes d'avertissement : 'kept-tracked',
  'shared-fr', 'unsafe-path' (un chemin refusé par le contrôle de confinement, jamais retiré).
Crochets des essais (ctx, jamais posés par le lanceur) : data, git_cmd, git_env comme partout ; le réseau d'essai passe par aero_fetch.get / aero_fetch.<fournisseur> remplacés.
"""
import json
import os
import re
import subprocess
import sys

TOOLS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(TOOLS)
if TOOLS not in sys.path:
    sys.path.insert(0, TOOLS)
import aero_fetch  # noqa: E402  (le téléchargement lui-même : jamais recopié ici)
import regen_jobs  # noqa: E402  (le socle : inside, la règle commune des purges)

ZONES_GEO = 'shared/carto/aero_zones_geo.js'
ZONE_ID = re.compile(r'^[a-z0-9_-]{2,12}$')
MAX_ZONES = 60                  # comme base/build
MIN_GAP = {('base', 'fetch'): 30}  # openAIP, la FAA, ENAIRE… : pas deux départs coup sur coup (30 s)


# ----------------------------------------------------------------------------------------------------------------------- le miroir de shared/aero_zones.js
# Le catalogue des sources et la règle « fichier → zone, source » vivent dans la page (shared/aero_zones.js). Le lanceur n'a pas de navigateur ici : il en tient ce miroir, que le banc K52
# compare au fichier (identifiants, kind, personal, adresses, noms ×4, sources de chaque zone, file_source sur des chemins d'essai). Modifier l'un SANS l'autre fait échouer K52.
def _src(kind, label, link='', personal='', provider='', args=()):
    """Une source : kind (download | manual | pdf | local | computed), label [fr, en, de, es], link (adresse, ou ''), personal ('' | 'licence' | 'xplane'), provider et args (aero_fetch, 'download' seulement)."""
    return {'kind': kind, 'label': tuple(label), 'link': link, 'personal': personal, 'provider': provider, 'args': tuple(args)}


SOURCES = {
    'sia': _src('manual', (
            'SIA France — AIXM 4.5 et XML_SIA (cycle AIRAC)',
            'SIA France — AIXM 4.5 and XML_SIA (AIRAC cycle)',
            'SIA Frankreich — AIXM 4.5 und XML_SIA (AIRAC-Zyklus)',
            'SIA Francia — AIXM 4.5 y XML_SIA (ciclo AIRAC)')),
    'dircam': _src('pdf', (
            'DIRCAM — MILAIP ENR 5.7 (axes de ravitaillement en vol)',
            'DIRCAM — MILAIP ENR 5.7 (air refuelling tracks)',
            'DIRCAM — MILAIP ENR 5.7 (Luftbetankungsstrecken)',
            'DIRCAM — MILAIP ENR 5.7 (ejes de reabastecimiento en vuelo)'), link='https://www.dircam.dsae.defense.gouv.fr/fr/milaip'),
    'openaip': _src('download', (
            'openAIP — export du pays',
            'openAIP — country export',
            'openAIP — Länderexport',
            'openAIP — exportación del país'), provider='openaip'),
    'enaire': _src('download', (
            'ENAIRE — AIP Espagne (AIXM 5.1)',
            'ENAIRE — Spain AIP (AIXM 5.1)',
            'ENAIRE — AIP Spanien (AIXM 5.1)',
            'ENAIRE — AIP España (AIXM 5.1)'), personal='licence', provider='enaire'),
    'faa': _src('download', (
            'FAA — zones à usage spécial et routes militaires',
            'FAA — special use airspace and military routes',
            'FAA — Sonderlufträume und Militärrouten',
            'FAA — espacios de uso especial y rutas militares'), provider='faa', args=('sua', 'mtr')),
    'faaclass': _src('download', (
            'FAA — classes d’espace (B, C, D, E)',
            'FAA — airspace classes (B, C, D, E)',
            'FAA — Luftraumklassen (B, C, D, E)',
            'FAA — clases de espacio (B, C, D, E)'), provider='faa', args=('class',)),
    'nats': _src('manual', (
            'NATS — AIP Royaume-Uni (AIXM 5.1)',
            'NATS — UK AIP (AIXM 5.1)',
            'NATS — AIP Vereinigtes Königreich (AIXM 5.1)',
            'NATS — AIP Reino Unido (AIXM 5.1)'), link='https://nats-uk.ead-it.com/cms-nats/opencms/en/Publications/digital-datasets/', personal='licence'),
    'ukmil': _src('download', (
            'UK Mil AIP — ENR 5.2 : basse altitude, VATA, ravitaillement (AARA)',
            'UK Mil AIP — ENR 5.2: low flying, VATA, air-to-air refuelling (AARA)',
            'UK Mil AIP — ENR 5.2: Tiefflug, VATA, Luftbetankung (AARA)',
            'UK Mil AIP — ENR 5.2: baja altura, VATA, reabastecimiento (AARA)'), link='https://www.aidu.mod.uk/aip/aipVolumes.html', provider='ukmil'),
    'navcan': _src('download', (
            'NAV CANADA — manuel des espaces aériens désignés (DAH)',
            'NAV CANADA — Designated Airspace Handbook (DAH)',
            'NAV CANADA — Designated Airspace Handbook (DAH)',
            'NAV CANADA — Designated Airspace Handbook (DAH)'), link='https://www.navcanada.ca/en/aeronautical-information/operational-guides.aspx', provider='navcan'),
    'nat': _src('download', (
            'Tracks NAT du jour (Shanwick, Gander)',
            'Today’s NAT tracks (Shanwick, Gander)',
            'NAT-Tracks des Tages (Shanwick, Gander)',
            'Tracks NAT del día (Shanwick, Gander)'), link='https://nms.aim.faa.gov/nat', provider='nat'),
    'xplane': _src('local', (
            'X-Plane — données de navigation du simulateur',
            'X-Plane — simulator navigation data',
            'X-Plane — Navigationsdaten des Simulators',
            'X-Plane — datos de navegación del simulador'), personal='xplane'),
    'mora': _src('computed', (
            'MORA calculée (relief, sommets OpenStreetMap, obstacles)',
            'Computed MORA (terrain, OpenStreetMap peaks, obstacles)',
            'Berechnete MORA (Relief, OSM-Gipfel, Hindernisse)',
            'MORA calculada (relieve, cumbres OSM, obstáculos)')),
}
COMMON = ('openaip', 'mora', 'xplane')
OWN = {'nat': ('nat', 'xplane')}  # zones hors pays : leurs seules sources
EXTRA = {'fr': ('sia', 'dircam'), 'gb': ('nats', 'ukmil'), 'es': ('enaire',), 'us': ('faa', 'faaclass'), 'ca': ('navcan',)}
SIA_ROOT = re.compile(r'^(AIXM4\.5_all_FR_OM_|XML_SIA_|sia-airspaces-)\d{4}-\d{2}-\d{2}\.xml\Z', re.I | re.A)


def sources_of(zone):
    """Sources d'une zone : les siennes (zone océanique), sinon celles du pays puis les communes (AeroZones.sourcesOf)."""
    return OWN.get(zone) or (*EXTRA.get(zone, ()), *COMMON)


def file_source(rel):
    """Zone et source d'un fichier du dossier SIA (chemin relatif : « openaip/gb_asp.geojson ») : { zone, source } ; zone '*' pour mora.csv ; None si inconnu
    (AeroZones.fileSource, règle pour règle)."""
    p = str(rel).replace('\\', '/')
    name = p.split('/')[-1]
    if '/' not in p:
        if SIA_ROOT.search(name):
            return {'zone': 'fr', 'source': 'sia'}
        if re.search(r'^miam-enr-5-7-tracks\.xml\Z', name, re.I | re.A):
            return {'zone': 'fr', 'source': 'dircam'}
        if re.search(r'^mora\.csv\Z', name, re.I | re.A):
            return {'zone': '*', 'source': 'mora'}
        return None
    parts = p.split('/')
    d, sub = parts[0], (parts[1] if len(parts) > 1 else '')
    if d == 'openaip':
        m = re.search(r'^([a-z]{2})_', name, re.I | re.A)
        return {'zone': m.group(1).lower(), 'source': 'openaip'} if m else None
    if d == 'aixm5' and re.search(r'^LE_', name, re.I | re.A):
        return {'zone': 'es', 'source': 'enaire'}
    if d == 'geojson' and re.search(r'^faa_class', name, re.I | re.A):
        return {'zone': 'us', 'source': 'faaclass'}
    if d == 'geojson' and re.search(r'^faa_', name, re.I | re.A):
        return {'zone': 'us', 'source': 'faa'}
    # zones/<zone>/<source>_… : fichier d'une source nommée (ukmil_…) ; sinon la source déposée à la main de la zone
    m = re.search(r'^([a-z]+)[_-]', name, re.I | re.A)
    pre = m.group(1).lower() if m else ''
    if d == 'zones' and sub and pre and pre in sources_of(sub):
        return {'zone': sub, 'source': pre}
    if d == 'zones' and sub:
        return {'zone': sub, 'source': next((s for s in sources_of(sub) if SOURCES[s]['kind'] == 'manual' and s != 'sia'), 'manual')}
    return None


def zone_ids(root=None):
    """Identifiants des zones (clés de window.AERO_ZONES_GEO, shared/carto/aero_zones_geo.js) ; vide si le fichier ne se lit pas."""
    try:
        with open(os.path.join(root or ROOT, *ZONES_GEO.split('/')), encoding='utf-8') as f:
            text = f.read()
        obj = json.loads(text[text.index('{', text.index('AERO_ZONES_GEO')):text.rindex('}') + 1])
        return [k for k in obj if ZONE_ID.match(k)]
    except (OSError, ValueError):
        return []


_IDS = []


def _zones_arg(a):
    """Les zones d'un argument : liste de 1 à MAX_ZONES identifiants de la liste des zones, sans doublon, en minuscules ; None si refusée."""
    if not isinstance(a.get('zones'), list):
        return None
    zones = [z.strip().lower() if isinstance(z, str) else z for z in a['zones']]
    if not _IDS:
        _IDS.extend(zone_ids())
    if not 1 <= len(zones) <= MAX_ZONES or any(not isinstance(z, str) or z not in _IDS for z in zones) or len(set(zones)) != len(zones):
        return None
    return zones


def check_fetch(a):
    """Contrôle des arguments de base/fetch (→ 400 si None) : { zones: [identifiants], personal?: [identifiants de sources du catalogue] } et rien d'autre.
    Aucun chemin, aucune adresse, aucune commande ne vient de la page."""
    if not isinstance(a, dict) or not set(a) <= {'zones', 'personal'}:
        return None
    zones = _zones_arg(a)
    personal = a.get('personal', [])
    if zones is None or not isinstance(personal, list) or len(personal) > 10:
        return None
    personal = [p.strip().lower() if isinstance(p, str) else p for p in personal]
    if any(not isinstance(p, str) or p not in SOURCES for p in personal):
        return None
    return {'zones': zones, 'personal': sorted(set(personal))}


WHAT = ('sources', 'caches')


def check_purge(a):
    """Contrôle des arguments de base/purge (→ 400 si None) : { zones, what?: ['sources', 'caches'] (1 ou 2, sans doublon), dry?: vrai / faux } et rien d'autre."""
    if not isinstance(a, dict) or not set(a) <= {'zones', 'what', 'dry'}:
        return None
    zones = _zones_arg(a)
    what = a.get('what', list(WHAT))
    if zones is None or not isinstance(what, list) or not 1 <= len(what) <= 2 or any(w not in WHAT for w in what) or len(set(what)) != len(what):
        return None
    if not isinstance(a.get('dry', False), bool):
        return None
    return {'zones': zones, 'what': [w for w in WHAT if w in what], 'dry': a.get('dry', False)}


# ----------------------------------------------------------------------------------------------------------------------- aides communes : la vue, git
class _View:
    """Les zones de la vue du travail (job.data['zones']) : chaque mise à jour REMPLACE l'entrée de la zone et le dict d'ensemble par une copie, jamais un dict que la route
    de lecture du lanceur est en train de sérialiser (une écriture en place lèverait « dictionary changed size during iteration » dans son fil)."""

    def __init__(self, job, zones):
        self.job, self.z = job, dict(zones)
        job.data['zones'] = dict(self.z)

    def set(self, zone, **fields):
        self.z[zone] = {**self.z[zone], **fields}
        self.job.data['zones'] = dict(self.z)

    def source(self, zone, source, entry):
        self.set(zone, sources={**self.z[zone]['sources'], source: entry})


def _git(ctx, *args):
    """git -C data … avec les crochets du lanceur (git_cmd, git_env : data_sync) ; des chemins littéraux (GIT_LITERAL_PATHSPECS), jamais des motifs."""
    data, git_cmd, git_env = ctx['data'], ctx.get('git_cmd'), ctx.get('git_env')
    cmd = list(git_cmd('-C', data, *args)) if git_cmd else ['git', '-C', data, *args]
    env = dict(git_env() if git_env else os.environ, GIT_LITERAL_PATHSPECS='1')
    return subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=60, env=env)


def tracked_among(ctx, rels):
    """Parmi ces chemins (relatifs à data/, avec « / »), ceux que git SUIT dans data/ (présents dans l'index : `git ls-files`, le même verdict que `--error-unmatch` fichier par fichier,
    en un appel par centaine), en minuscules (la casse d'un index de Windows ne fait pas foi). Pas de dépôt (data/.git absent) : aucun. Lève RuntimeError si git échoue : on ne
    devine pas ce qui est suivi."""
    rels = sorted(set(rels))
    if not rels or not os.path.exists(os.path.join(ctx['data'], '.git')):
        return set()
    out = set()
    for i in range(0, len(rels), 100):
        try:
            p = _git(ctx, 'ls-files', '-z', '--', *rels[i:i + 100])
        except (OSError, subprocess.TimeoutExpired) as e:
            raise RuntimeError(f'git: {str(e)[:150]}') from e
        if p.returncode != 0:
            raise RuntimeError('git ls-files: ' + (p.stderr or p.stdout).strip()[:150])
        out |= {x.replace('\\', '/').lower() for x in p.stdout.split('\0') if x}
    return out


def _is_tracked(rel, tracked):
    return rel.replace('\\', '/').lower() in tracked


def _step(job, done, total):
    job.step(f'{done} zones sur {total}', done, total, 'zones')


# ----------------------------------------------------------------------------------------------------------------------- base/fetch
# où aero_fetch écrit, par fournisseur (data/sia/…) : la même arborescence que file_source lit (le banc K52 le vérifie)
FOLDERS = {'openaip': 'sia/openaip', 'faa': 'sia/geojson', 'enaire': 'sia/aixm5', 'ukmil': 'sia/zones/gb', 'navcan': 'sia/zones/ca', 'nat': 'sia/zones/nat'}
# les messages de tools/aero_fetch.py (des textes, pas des codes) rangés en codes ; HTTP d'abord, puis ce qui est une forme de réponse inattendue
HTTP_RE = re.compile(r'\bHTTP(?: Error)? (\d{3})\b')
PARSE_RE = re.compile(r'illisible|aucun|introuvable|chang[ée]|invalide|inconnu|service FAA|Expecting|JSON|decod|Extra data|Unterminated', re.I)


def classify(item):
    """Un échec d'aero_fetch (le texte de ses `errors`, ou l'exception qui s'est échappée d'une de ses fonctions) → { error: 'network' | 'http' | 'parse', status?, text }.
    HTTP n (404, 502…) → 'http' + status ; une forme inattendue (PDF illisible, page changée, JSON refusé, exception qui n'est pas du réseau) → 'parse' ; le reste → 'network'."""
    text = str(item)
    m = HTTP_RE.search(text)
    if m:
        return {'error': 'http', 'status': int(m.group(1)), 'text': text}
    if (isinstance(item, BaseException) and not isinstance(item, OSError)) or PARSE_RE.search(text):
        return {'error': 'parse', 'text': text}
    return {'error': 'network', 'text': text}


def _names(folder):
    try:
        return set(os.listdir(folder))
    except OSError:
        return set()


def _fetch_source(job, data, zone, source):
    """Télécharge UNE source d'UNE zone par les fonctions d'aero_fetch (couche par couche pour openaip et faa : l'annulation passe entre deux couches). Rend (entrée de la vue |
    None si annulé avant le moindre résultat, fichiers rendus par aero_fetch, échecs [classify], chemins modifiés relatifs à data/, annulé)."""
    s = SOURCES[source]
    p = s['provider']
    files, errors, removed, cancelled = [], [], [], False

    def call(fn, *a, **k):
        try:
            out, errs = fn(*a, **k)
        except Exception as e:  # un fournisseur qui lève (réseau, forme inattendue) ne fait pas tomber le travail
            out, errs = [], [e]
        files.extend(out)
        errors.extend(classify(x) for x in errs)

    if p == 'openaip':
        if not re.fullmatch(r'[a-z]{2}', zone):  # cyn, kas, sol… : pas de code de pays, pas d'export
            errors.append(classify(f'openAIP : HTTP 404 (aucun export pour « {zone} »)'))
        else:
            for layer in aero_fetch.OPENAIP_LAYERS:
                if job.cancelled():
                    cancelled = True
                    break
                call(aero_fetch.openaip, data, [zone], layers=(layer,))
            if not files and not errors and not cancelled:  # openaip() passe sous silence les couches absentes (403, 404)
                errors.append(classify(f'openAIP : HTTP 404 (aucun export pour « {zone} »)'))
    elif p == 'faa':
        for layer in s['args']:
            if job.cancelled():
                cancelled = True
                break
            call(aero_fetch.faa, data, (layer,))
    elif p == 'enaire':
        folder = os.path.join(data, *FOLDERS['enaire'].split('/'))
        before = _names(folder)
        call(aero_fetch.enaire, data)
        removed = [f"{FOLDERS['enaire']}/{n}" for n in sorted(before - _names(folder))]  # les amendements précédents que enaire() retire
    else:
        call(getattr(aero_fetch, p), data)
    if not files and not errors:
        if cancelled:
            return None, files, errors, [], True
        errors.append(classify('aucun fichier rendu (format changé ?)'))
    if errors:
        e = errors[0]
        entry = {'state': 'failed', 'error': e['error'], **({'status': e['status']} if 'status' in e else {})}
        if files:
            entry.update(files=len(files), bytes=sum(f.get('bytes', 0) for f in files))
    else:
        entry = {'state': 'downloaded' if any(not f.get('unchanged') for f in files) else 'unchanged', 'files': len(files),
                 'bytes': sum(f.get('bytes', 0) for f in files)}
    mods = [f"{FOLDERS[p]}/{f['name']}" for f in files if not f.get('unchanged')] + removed
    return entry, files, errors, mods, cancelled


def fetch(job, args, ctx):
    """Verbe base/fetch (voir l'en-tête du module pour la vue et le résultat)."""
    data = ctx['data']
    zones, personal = args['zones'], set(args['personal'])
    plans, init = {}, {}
    for z in zones:
        dl, skipped, manual = [], [], []
        for s in sources_of(z):
            k = SOURCES[s]['kind']
            if k == 'download':
                (dl if not SOURCES[s]['personal'] or s in personal else skipped).append(s)
            elif k in ('manual', 'pdf'):
                manual.append(s)  # local (xplane) et computed (mora) : pas de ce travail
        plans[z] = (dl, skipped, manual)
        pre = {s: {'state': 'skipped', 'error': 'personal'} for s in skipped}
        pre.update({s: {'state': 'manual', 'error': 'manual'} for s in manual})
        init[z] = {'state': 'waiting', 'done': 0, 'total': len(dl), 'sources': pre}
    view = _View(job, init)
    _step(job, 0, len(zones))
    fetched, unchanged, failed, modified = [], [], [], []
    attempted = good = 0
    cancelled = False
    for n, z in enumerate(zones):
        if job.cancelled():
            cancelled = True
        if cancelled:
            view.set(z, state='cancelled')
            continue
        dl, skipped, manual = plans[z]
        for s in skipped:
            job.log(f'{z}: {s} non téléchargée (licence personnelle non déclarée)')
        for s in manual:
            job.log(f'{z}: {s} à déposer à la main')
        view.set(z, state='fetching')
        changed = bad = False
        first_error, tried = None, 0
        for s in dl:
            if job.cancelled():
                cancelled = True
                break
            entry, files, errors, mods, c = _fetch_source(job, data, z, s)
            cancelled = cancelled or c
            if entry is None:
                break
            tried += 1
            attempted += 1
            view.source(z, s, entry)
            view.set(z, done=tried)
            modified.extend(mods)
            changed = changed or bool(mods)
            if entry['state'] == 'failed':
                bad = True
                first_error = first_error or entry['error']
                failed.append({'zone': z, 'source': s, 'error': entry['error'], **({'status': entry['status']} if 'status' in entry else {})})
                job.log(f"{z}: {s} échec ({entry['error']}{' ' + str(entry['status']) if 'status' in entry else ''}) : {errors[0]['text']}")
            else:
                good += 1
                job.log(f"{z}: {s} " + (f"{len(mods)} fichier(s) écrit(s) sur {entry['files']}, {entry['bytes'] // 1024} Ko" if entry['state'] == 'downloaded'
                                         else f"inchangée ({entry['files']} fichier(s))"))
            if cancelled:
                break
        if cancelled:
            view.set(z, state='cancelled')
        elif bad:
            view.set(z, state='failed', error=first_error)
        else:
            view.set(z, state='done')
        if changed:
            fetched.append(z)
        elif tried and not bad and not cancelled:
            unchanged.append(z)
        _step(job, n + 1, len(zones))
    # fichiers SUIVIS par git dans data/ que ce travail a modifiés : ils sortent de la synchronisation (aucun commit ici)
    outside = 0
    try:
        outside = len(tracked_among(ctx, modified))
    except RuntimeError as e:
        job.log(f'git: suivi des fichiers modifiés non vérifié ({e})')
    manual_list = [{'zone': z, 'source': s, **({'url': SOURCES[s]['link']} if SOURCES[s]['link'].startswith('https://') else {}), 'name': list(SOURCES[s]['label'])}
                   for z in zones for s in plans[z][2]]
    reason = ('cancelled' if cancelled else 'nothing-to-fetch' if not attempted else 'failed' if failed and not good else 'partial' if failed else None)
    res = {'ok': reason is None, 'fetched': fetched, 'unchanged': unchanged, 'failed': failed, 'manual': manual_list, 'outside_sync': outside,
           'warnings': [{'code': 'outside-sync', 'count': outside}] if outside else []}
    if reason:
        res['reason'] = reason
    return res


# ----------------------------------------------------------------------------------------------------------------------- base/purge
CACHES = {'fr': ('local/eaip',)}  # caches par zone sous data/ (lecture de l'eAIP du SIA : data/local/eaip/<cycle>/) ; les autres zones n'en ont pas aujourd'hui
SOURCE_DIRS = ('openaip', 'aixm5', 'geojson')  # sous-dossiers à plat de data/sia/ (zones/<zone>/ en plus) ; sia/base et proc/ ne sont JAMAIS parcourus
MIAM = re.compile(r'^miam-.*\.xml\Z', re.I | re.A)  # axes de ravitaillement de France à la racine de sia/ (file_source ne connaît que miam-enr-5-7-tracks.xml)


def attributed_zone(rel):
    """Zone à laquelle un fichier de data/sia/ (chemin relatif) est attribué : file_source, et les miam-*.xml de la racine à fr ; None sinon ('*' : mora.csv, à aucune zone)."""
    fs = file_source(rel)
    if fs:
        return fs['zone']
    return 'fr' if '/' not in rel and MIAM.search(rel) else None


_inside = regen_jobs.inside  # une seule règle pour toutes les purges (regen_jobs.inside)


def _walk(top, prefix, base):
    """(fichiers [(chemin relatif avec prefix, chemin réel)], dossiers, chemins refusés) sous `top`, sans suivre de lien : ni un lien, ni un dossier qui se résout hors de `base`
    (une jonction de Windows n'est pas un lien pour os.walk) n'est descendu ; un fichier qui est un lien ou se résout hors de `base` n'est pas listé mais compté parmi les refusés."""
    files, dirs, bad = [], [], []
    for d, subs, names in os.walk(top):
        dirs.append(d)
        rel = os.path.relpath(d, top).replace(os.sep, '/')
        at = (prefix + '/' if rel == '.' else f'{prefix}/{rel}/')
        bad += [at + x for x in subs if not _inside(os.path.join(d, x), base)]  # un lien ou une jonction vers un dossier : refusé, pas descendu
        subs[:] = [x for x in subs if _inside(os.path.join(d, x), base)]
        for n in names:
            full = os.path.join(d, n)
            name = at + n
            if _inside(full, base):
                files.append((name, full))
            else:
                bad.append(name)
    return files, dirs, bad


def candidates(data, zone, what):
    """Ce que base/purge retirerait pour une zone : ([(chemin relatif à data/, chemin réel, dossier de confinement)], [dossiers à retirer s'ils se vident], nombre de chemins refusés).
    Les sources : ce que attributed_zone attribue à la zone, dans la racine de data/sia/, openaip/, aixm5/, geojson/ et zones/<zone>/ ; les caches : CACHES[zone]."""
    out, prune, unsafe = [], [], 0
    if 'sources' in what:
        sia = os.path.join(data, 'sia')
        base = os.path.realpath(sia)
        if os.path.islink(sia):
            return out, prune, 1
        if os.path.isdir(sia):
            try:
                for n in sorted(os.listdir(sia)):  # la racine : à plat (sia/base/ et les autres dossiers ne sont pas parcourus)
                    full = os.path.join(sia, n)
                    if os.path.isfile(full) and not os.path.islink(full) and attributed_zone(n) == zone:
                        out.append((f'sia/{n}', full, base))
            except OSError:
                pass
            for sub in (*SOURCE_DIRS, f'zones/{zone}'):
                top = os.path.join(sia, *sub.split('/'))
                if not os.path.isdir(top):
                    continue
                if not _inside(top, base):
                    unsafe += 1
                    continue
                files, dirs, bad = _walk(top, sub, base)
                unsafe += sum(1 for rel in bad if attributed_zone(rel) == zone)
                out += [(f'sia/{rel}', full, base) for rel, full in files if attributed_zone(rel) == zone]
                if sub.startswith('zones/'):
                    prune += dirs
    if 'caches' in what:
        local = os.path.join(data, 'local')
        base = os.path.realpath(local)
        for sub in CACHES.get(zone, ()):
            top = os.path.join(data, *sub.split('/'))
            if not os.path.isdir(top):
                continue
            if os.path.islink(local) or not _inside(top, base):
                unsafe += 1
                continue
            files, dirs, bad = _walk(top, sub, base)
            unsafe += len(bad)
            out += [(rel, full, base) for rel, full in files]
            prune += dirs
    return out, prune, unsafe


def purge(job, args, ctx):
    """Verbe base/purge (voir l'en-tête du module pour la vue et le résultat)."""
    data = ctx['data']
    zones, what, dry = args['zones'], args['what'], args['dry']
    view = _View(job, {z: {'state': 'waiting', 'files': 0, 'bytes': 0} for z in zones})
    _step(job, 0, len(zones))
    removed, kept, unsafe_n, failed_zones = {}, 0, 0, 0
    cancelled = False
    for n, z in enumerate(zones):
        if job.cancelled():
            cancelled = True
            break
        view.set(z, state='purging')
        cands, prune, unsafe = candidates(data, z, what)
        unsafe_n += unsafe
        files = size = zone_kept = 0
        error = None
        try:
            tracked = tracked_among(ctx, [rel for rel, _, _ in cands])
        except RuntimeError as e:  # on ne devine pas ce qui est suivi : rien n'est retiré pour cette zone
            job.log(f'{z}: {e}')
            cands, error = [], 'git'
            tracked = set()
        for rel, full, base in cands:
            if job.cancelled():
                cancelled = True
                break
            if _is_tracked(rel, tracked):  # un fichier suivi quitterait le dépôt pour tous les postes : gardé
                kept += 1
                zone_kept += 1
                continue
            if not _inside(full, base):
                unsafe_n += 1
                continue
            try:
                nbytes = os.lstat(full).st_size
                if not dry:
                    os.remove(full)
            except OSError as e:
                error = error or 'remove-failed'
                job.log(f'{z}: {rel} non retiré ({e.__class__.__name__})')
                continue
            files += 1
            size += nbytes
            if files % 200 == 0:
                view.set(z, files=files, bytes=size)
        if not dry and not cancelled:
            for d in sorted(set(prune), key=len, reverse=True):  # les dossiers vidés (zones/<zone>/, local/eaip/…), du plus profond au plus haut ; un dossier non vide reste
                try:
                    os.rmdir(d)
                except OSError:
                    pass
        removed[z] = {'files': files, 'bytes': size}
        if cancelled:  # la zone interrompue garde ce qui était déjà retiré
            error = 'cancelled'
        view.set(z, state='failed' if error else 'done', files=files, bytes=size, **({'error': error} if error else {}))
        failed_zones += 1 if error and not cancelled else 0
        job.log(f"{z}: {'à retirer' if dry else 'retiré'} {files} fichier(s), {size // 1024} Ko" + (f", {zone_kept} suivi(s) par git gardé(s)" if zone_kept else ''))
        if cancelled:
            break
        _step(job, n + 1, len(zones))
    warnings = []
    if kept:
        warnings.append({'code': 'kept-tracked', 'count': kept})
    if unsafe_n:
        warnings.append({'code': 'unsafe-path', 'count': unsafe_n})
    if 'sources' in what and 'fr' in zones:
        warnings.append({'code': 'shared-fr'})  # les contours des FIR de France (XML_SIA) servent la construction de toutes les zones
    reason = 'cancelled' if cancelled else 'failed' if failed_zones and failed_zones == len(zones) else 'partial' if failed_zones else None
    res = {'ok': reason is None, 'removed': removed, 'warnings': warnings}
    if reason:
        res['reason'] = reason
    return res


VERBS = {
    ('base', 'fetch'): (fetch, check_fetch),
    ('base', 'purge'): (purge, check_purge),
}
