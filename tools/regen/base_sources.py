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
  'parse', 'personal', 'manual', 'absent'. Une couche qu'openAIP n'a pas pour un pays (403 / 404) est absente, jamais un échec : demandée sans ligne dans la console du
  lanceur, dite en UNE ligne du journal pour tout le passage, mémorisée pour le cycle AIRAC hors de data/ (tools/.openaip_absent.json) et pas redemandée avant le cycle
  suivant ; un pays sans aucun export (ou une zone sans code de deux lettres : cyn, kas, sol) : la source 'skipped', 'absent', la zone 'done'. Un 5xx, un délai ou une
  réponse illisible restent des échecs, dits par fichier.
  Résultat : `{ ok, fetched: [zones où quelque chose a changé], unchanged: [zones sans échec où rien n'a changé], failed: [{ zone, source, error, status? }], manual: [{ zone,
  source, url?, name: [fr, en, de, es] }], outside_sync: n, absent: ['kh_asp', …], sources: { sia | nats | enaire: { cycle | null, current, stale } } (aussi dans la vue
  dès le départ : le cycle que le poste détient par source datée, tools/aero_cycles.py), warnings: [{ code: 'outside-sync', count: n }], reason? }` ; `outside_sync` = les fichiers SUIVIS par git dans data/ que
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
import datetime
import fnmatch
import json
import os
import re
import shutil
import subprocess
import sys
import zipfile

TOOLS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(TOOLS)
if TOOLS not in sys.path:
    sys.path.insert(0, TOOLS)
import aero_cycles  # noqa: E402  (le cycle AIRAC que le poste détient pour chaque source datée)
import aero_fetch  # noqa: E402  (le téléchargement lui-même : jamais recopié ici)
import data_sync  # noqa: E402  (data_path : la règle des chemins de data/, pour base/pickup)
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
    # environnement réduit (regen_jobs.git_child_env : sans question, chemins littéraux) ; jamais tout celui du lanceur
    return subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=60, env=regen_jobs.git_child_env())


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


# exports d'openAIP absents (couche qu'openAIP n'a pas pour un pays) : mémorisés par cycle AIRAC hors de data/ (fichier du poste,
# jamais versionné) et pas redemandés au passage suivant du même cycle ; ctx['cache'] (dossier) pour un autre emplacement (essais)
ABSENT_FILE = '.openaip_absent.json'


def airac_start(today=None):
    """Début (AAAA-MM-JJ) du cycle AIRAC en vigueur : calendrier de 28 jours, AIRAC 2401 = 2024-01-25."""
    ref, d = datetime.date(2024, 1, 25), today or datetime.date.today()
    return (ref + datetime.timedelta(days=28 * ((d - ref).days // 28))).isoformat()


def _absent_path(ctx):
    return os.path.join(ctx.get('cache') or os.path.join(ROOT, 'tools'), ABSENT_FILE)


def absent_load(ctx, cycle):
    """Les couches absentes déjà vues pendant ce cycle (« kh_rpp ») ; vide pour un autre cycle ou un fichier illisible."""
    try:
        with open(_absent_path(ctx), encoding='utf-8') as f:
            doc = json.load(f)
        return {x for x in doc.get('absent', []) if isinstance(x, str) and re.fullmatch(r'[a-z]{2,3}_[a-z]{3}', x)} if doc.get('cycle') == cycle else set()
    except (OSError, ValueError, AttributeError):
        return set()


def absent_save(ctx, cycle, names):
    """Écrit les couches absentes du cycle (remplace celles d'un autre cycle) ; une écriture impossible n'arrête rien."""
    path = _absent_path(ctx)
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path + '.tmp', 'w', encoding='utf-8') as f:
            json.dump({'cycle': cycle, 'absent': sorted(names)}, f)
        os.replace(path + '.tmp', path)
    except OSError:
        pass


def absent_line(names):
    """« openAIP : pas d'export pour iq (apt, asp, nav, rpp), kh (asp, nav, rpp) » : une ligne pour tout le passage."""
    by = {}
    for n in sorted(names):
        cc, layer = n.split('_', 1)
        by.setdefault(cc, []).append(layer)
    return "openAIP : pas d'export pour " + ', '.join(f"{cc} ({', '.join(ls)})" for cc, ls in by.items())


def sia_rels(data):
    """Les fichiers présents de data/sia/ (chemins relatifs avec « / ») où une source datée se trouve : la racine, aixm5/ et zones/<zone>/ ;
    ni lien, ni sous-dossier plus profond."""
    root, out = os.path.join(data, 'sia'), []
    for sub in ('', 'aixm5') + tuple(f'zones/{z}' for z in sorted(_names(os.path.join(root, 'zones')))):
        d = os.path.join(root, *sub.split('/')) if sub else root
        for n in sorted(_names(d)):
            p = os.path.join(d, n)
            if os.path.isfile(p) and not os.path.islink(p):
                out.append(f'{sub}/{n}' if sub else n)
    return out


def _fetch_source(job, data, zone, source, absent=None, known=frozenset()):
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
        # une couche qu'openAIP n'a pas pour ce pays est absente, jamais un échec (dite une fois pour tout le passage) ; un pays sans
        # aucun export, ou une zone sans code de pays (cyn, kas, sol…), donne la source « skipped », error 'absent'
        gone = []
        if re.fullmatch(r'[a-z]{2}', zone):
            for layer in aero_fetch.OPENAIP_LAYERS:
                if job.cancelled():
                    cancelled = True
                    break
                call(aero_fetch.openaip, data, [zone], layers=(layer,), absent=gone, known=known)
        if absent is not None:
            absent.extend(gone)
        if not files and not errors and not cancelled:
            return {'state': 'skipped', 'error': 'absent'}, files, errors, [], False
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
    cycle = airac_start()
    known, absent = absent_load(ctx, cycle), []
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
    # le plan : le cycle que le poste détient pour chaque source datée (SIA, NATS, ENAIRE), avant de télécharger quoi que ce soit
    job.data['sources'] = aero_cycles.report(sia_rels(data), root=os.path.join(data, 'sia'))
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
            entry, files, errors, mods, c = _fetch_source(job, data, z, s, absent=absent, known=known)
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
            elif entry['state'] == 'skipped':
                good += 1  # rien à télécharger (export absent) : dit une fois à la fin, la zone reste faite
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
    if absent:
        absent_save(ctx, cycle, known | set(absent))
        job.log(absent_line(set(absent)))
    # fichiers SUIVIS par git dans data/ que ce travail a modifiés : ils sortent de la synchronisation (aucun commit ici)
    outside = 0
    try:
        outside = len(tracked_among(ctx, modified))
    except RuntimeError as e:
        job.log(f'git: suivi des fichiers modifiés non vérifié ({e})')
    # pickup : le lanceur sait prendre son fichier dans Téléchargements (base/pickup, motif expected)
    manual_list = [{'zone': z, 'source': s, **({'url': SOURCES[s]['link']} if SOURCES[s]['link'].startswith('https://') else {}), 'name': list(SOURCES[s]['label']),
                    **({'pickup': True, 'expected': PICKUP[s]['zip']} if s in PICKUP else {})} for z in zones for s in plans[z][2]]
    reason = ('cancelled' if cancelled else 'nothing-to-fetch' if not attempted else 'failed' if failed and not good else 'partial' if failed else None)
    res = {'ok': reason is None, 'fetched': fetched, 'unchanged': unchanged, 'failed': failed, 'manual': manual_list, 'outside_sync': outside,
           'absent': sorted(set(absent)), 'sources': aero_cycles.report(sia_rels(data), root=os.path.join(data, 'sia')),
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


# ----------------------------------------------------------------------------------------------------------------------- base/pickup
# Le fichier d'une source à déposer à la main (SIA, NATS), pris dans les Téléchargements du poste (inventaire D8 de Réglages,
# 30 oct. 2026 : la page V2 le faisait, rien en V3). Le motif du nom vient d'ici, jamais de la page ; le plus récent qui le suit
# est contrôlé avant toute lecture (taille, regen_jobs.zip_check) ; seuls les noms de ses entrées utiles sont pris (jamais un
# chemin du zip), copiés en .tmp puis remplacés là où la construction les lit (base.list_inputs) : la racine de data/sia/ pour
# le SIA, data/sia/zones/gb/ pour NATS. Sources brutes du poste, jamais commitées (comme celles de base/fetch). Le passage à
# blanc (dry, par défaut) rend le plan.
PICKUP = {
    'sia': {'zip': 'export_xml_bd_SIA_*.zip', 'to': 'sia', 'keep': lambda n: bool(SIA_ROOT.match(n))},
    # NATS : les fichiers EG… seulement (jamais ukmil_aara-tracks.xml ni un autre fichier d'aero_fetch du même dossier)
    'nats': {'zip': 'EG_*_DS_*_XML.zip', 'to': 'sia/zones/gb',
             'keep': lambda n: bool(re.match(r'EG[_-]', n)) and n.lower().endswith('.xml') and not re.search(r'DIFF|DELTA|export-filter|METADATA', n, re.I)},
}
PICKUP_MAX = 500 * 1024 * 1024  # un zip déposé plus gros : refusé avant d'être ouvert
# Les exports d'openAIP (https://www.openaip.net/data/exports), téléchargés par l'utilisateur dans Téléchargements : un fichier par pays et par couche,
# « <pays>_<asp|apt|nav|rpp>.<format> ». GeoJSON (celui que lit la suite) : posé tel quel dans data/sia/openaip/ ; JSON (le tableau d'objets d'openAIP, sa
# géométrie dans chaque objet) : converti en GeoJSON, mêmes propriétés ; XML (openAIP 1.1, un autre format) : pas lu, dit. La couche « hot » (points chauds)
# n'est pas utilisée par la suite. Le fichier est un fichier de l'utilisateur, donc non fiable : taille et nombre d'objets bornés, JSON contrôlé, pays du
# nom et pays des objets d'accord, jamais un chemin pris du fichier (le nom final est construit ici).
OPENAIP_FILE = re.compile(r'^(?P<cc>[a-z]{2})_(?P<layer>asp|apt|nav|rpp|hot)(?: \(\d+\))?\.(?P<ext>geojson|json|xml)\Z', re.A | re.I)
OPENAIP_MAX_FEATURES = 400_000
PICKUP_NAME = re.compile(r'^[\w .()+-]{1,150}\Z', re.A)  # un nom d'entrée pris (le SAFE_NAME de base.py) : ni séparateur, ni « : »


def check_pickup(a):
    """Contrôle des arguments de base/pickup (→ 400 si None) : { zones, dry?: vrai (par défaut) / faux, zips?: { <source>:
    { name, size } } } et rien d'autre. zips : le fichier que le plan a montré, par source ; la prise refuse celle dont le zip
    le plus récent n'est plus celui-là (un autre arrivé pendant la question : audit, ligne 95)."""
    if not isinstance(a, dict) or not set(a) <= {'zones', 'dry', 'zips'}:
        return None
    zones = _zones_arg(a)
    dry = a.get('dry', True)
    zips = a.get('zips', {})
    if zones is None or not isinstance(dry, bool) or not isinstance(zips, dict) or len(zips) > len(PICKUP) + 1:
        return None
    shown = {}
    for s, z in zips.items():
        if (s not in PICKUP and s != 'openaip') or not isinstance(z, dict) or set(z) != {'name', 'size'} or not isinstance(z['name'], str) or not PICKUP_NAME.match(z['name']) \
                or not isinstance(z['size'], int) or isinstance(z['size'], bool) or z['size'] < 0:
            return None
        shown[s] = {'name': z['name'], 'size': z['size']}
    return {'zones': zones, 'dry': dry, **({'zips': shown} if 'zips' in a else {})}  # zips: {} dit « rien de montré »


def _latest(dirs, pattern):
    """Le plus récent des fichiers de ces dossiers qui suivent le motif (sans chemin ; ni lien ni dossier), ou ''."""
    found = []
    for d in dirs:
        try:
            with os.scandir(d) as it:
                found += [e.path for e in it if fnmatch.fnmatch(e.name, pattern) and not e.is_symlink() and e.is_file(follow_symlinks=False)]
        except OSError:
            continue
    return max(found, key=os.path.getmtime) if found else ''


def _openaip_scan(dirs, zones):
    """Les exports d'openAIP de ces zones dans ces dossiers : { (pays, couche): { format: chemin du plus récent } } ; ni lien ni dossier ; seuls les pays des zones
    demandées (un code de deux lettres)."""
    want = {z for z in zones if re.fullmatch(r'[a-z]{2}', z)}
    found = {}
    for d in dirs:
        try:
            with os.scandir(d) as it:
                for e in it:
                    m = OPENAIP_FILE.match(e.name)
                    if not m or m.group('cc').lower() not in want or e.is_symlink() or not e.is_file(follow_symlinks=False):
                        continue
                    slot = found.setdefault((m.group('cc').lower(), m.group('layer').lower()), {})
                    k = m.group('ext').lower()
                    if k not in slot or os.path.getmtime(e.path) > os.path.getmtime(slot[k]):
                        slot[k] = e.path
        except OSError:
            continue
    return found


def _openaip_read(path, ext, cc):
    """(octets GeoJSON ou None si le fichier est déjà du GeoJSON, nombre d'objets) d'un export d'openAIP ; lève ValueError (le code) si le fichier n'est pas ce qu'il dit.
    ext 'json' : le tableau d'objets d'openAIP, converti (la géométrie de chaque objet devient celle de sa Feature, le reste ses propriétés)."""
    if os.path.getsize(path) > aero_fetch.MAX_BYTES:
        raise ValueError('too-large')
    with open(path, 'rb') as f:
        try:
            obj = json.loads(f.read().decode('utf-8-sig'))
        except (ValueError, UnicodeDecodeError):
            raise ValueError('unreadable') from None
    if ext == 'geojson':
        if not (isinstance(obj, dict) and obj.get('type') == 'FeatureCollection' and isinstance(obj.get('features'), list)):
            raise ValueError('not-geojson')
        feats, raw = obj['features'], None
    else:
        if not isinstance(obj, list):
            raise ValueError('not-openaip-json')
        feats = [{'type': 'Feature', 'geometry': e['geometry'], 'properties': {k: v for k, v in e.items() if k != 'geometry'}}
                 for e in obj if isinstance(e, dict) and isinstance(e.get('geometry'), dict)]
        if obj and not feats:
            raise ValueError('no-geometry')
        raw = json.dumps({'type': 'FeatureCollection', 'features': feats}, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    if len(feats) > OPENAIP_MAX_FEATURES:
        raise ValueError('too-many-features')
    countries = [str((f.get('properties') or {}).get('country')).lower() for f in feats if isinstance(f, dict) and isinstance((f.get('properties') or {}).get('country'), str)]
    if countries and sum(1 for x in countries if x == cc) * 2 < len(countries):
        raise ValueError('wrong-country')  # le nom dit un pays, les objets en disent un autre
    return raw, len(feats)


def _openaip_pickup(job, zones, dry, args, ctx, taken, failed, skipped):
    # rend { 'openaip': { name, size } } (le total des fichiers que cette passe prendrait : le plan le rend en `shown`, la prise le rend dans zips pour dire « ce sont ceux-là »), ou {}
    """Les exports d'openAIP de Téléchargements pour les zones à code de pays : écrits sous data/sia/openaip/<pays>_<couche>.geojson (au même endroit que ceux d'aero_fetch),
    jamais commités ; rien n'est dit « manquant » quand il n'y en a pas (openAIP n'est qu'un repli). taken : { zone, source: 'openaip', zip: None, from: [fichiers pris],
    files: [fichiers écrits], converted: [fichiers convertis du JSON], unchanged: [fichiers déjà là], size (le total des fichiers pris), bytes } ; skipped : { zone, source,
    name, why: 'format' (XML openAIP 1.1, non lu) | 'layer' (couche non utilisée) }. Avec zips, le total des fichiers que le plan a montré (zips.openaip.size) doit être celui d'aujourd'hui."""
    data = ctx['data']
    dirs = list((ctx.get('downloads') or (lambda: []))())
    found = _openaip_scan(dirs, zones)
    if not found:
        return {}
    plan = {}
    for (cc, layer), slot in sorted(found.items()):
        if 'xml' in slot:
            skipped.append({'zone': cc, 'source': 'openaip', 'name': os.path.basename(slot['xml']), 'why': 'layer' if layer == 'hot' else 'format'})
        if layer == 'hot':
            for ext in ('geojson', 'json'):
                if ext in slot:
                    skipped.append({'zone': cc, 'source': 'openaip', 'name': os.path.basename(slot[ext]), 'why': 'layer'})
            continue
        ext = 'geojson' if 'geojson' in slot else 'json' if 'json' in slot else None
        if ext:
            plan[(cc, layer)] = (slot[ext], ext)
    if not plan:
        return {}
    total = sum(os.path.getsize(p) for p, _ in plan.values())
    shown = {'openaip': {'name': 'openaip', 'size': total}}
    if 'zips' in args:
        want = args['zips'].get('openaip')
        if not want:
            failed.append({'zone': '*', 'source': 'openaip', 'error': 'not-shown'})
            return shown
        if (want['name'], want['size']) != ('openaip', total):
            failed.append({'zone': '*', 'source': 'openaip', 'error': 'changed', 'size': total})
            return shown
    by_zone = {}
    for (cc, layer), (path, ext) in plan.items():
        by_zone.setdefault(cc, []).append((layer, path, ext))
    for cc, items in sorted(by_zone.items()):
        if job.cancelled():
            return shown
        t = {'zone': cc, 'source': 'openaip', 'zip': None, 'from': [], 'files': [], 'converted': [], 'unchanged': [], 'size': 0, 'bytes': 0}
        for layer, path, ext in sorted(items):
            name = f'{cc}_{layer}.geojson'
            try:
                raw, n = _openaip_read(path, ext, cc)
                dest = data_sync.data_path(data, f'sia/openaip/{name}')
                if not dest:
                    raise ValueError('unsafe-path')
                if raw is None:
                    with open(path, 'rb') as f:
                        raw = f.read()
                t['from'].append(os.path.basename(path))
                t['size'] += os.path.getsize(path)
                if ext == 'json':
                    t['converted'].append(os.path.basename(path))
                if dry:
                    t['files'].append(name)
                    t['bytes'] += len(raw)
                    continue
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                if not regen_jobs.inside(os.path.dirname(dest), os.path.realpath(data)):
                    raise ValueError('unsafe-path')
                if aero_fetch.write(dest, raw):
                    t['files'].append(name)
                    t['bytes'] += len(raw)
                else:
                    t['unchanged'].append(name)
            except (ValueError, OSError) as e:
                failed.append({'zone': cc, 'source': 'openaip', 'error': str(e)[:60] if isinstance(e, ValueError) else type(e).__name__, 'name': os.path.basename(path)})
        if t['from']:
            taken.append(t)
            job.log(f"{cc}: openaip ← {len(t['from'])} fichier(s)" + (f", {len(t['converted'])} converti(s) du JSON" if t['converted'] else '') + (' (à blanc)' if dry else ''))
    return shown


def pickup(job, args, ctx):
    """Verbe base/pickup : pour chaque zone, ses sources à déposer à la main que le lanceur sait prendre (PICKUP), puis les exports d'openAIP de Téléchargements. Rend
    { ok, dry, taken: [{ zone, source, zip, files: [noms], bytes }], missing: [{ zone, source, expected }], failed:
    [{ zone, source, error }], skipped: [{ zone, source: 'openaip', name, why }], shown?: { openaip: { name, size } } (à rendre dans zips à la prise), reason? } ; error 'changed' (un autre zip que celui montré), 'not-shown' (avec zips, une
    source que le plan n'a pas montrée) ; missing : aucun fichier au nom attendu dans Téléchargements (le motif dit lequel) ; openAIP : voir _openaip_pickup."""
    data, dry = ctx['data'], args['dry']
    dirs = list((ctx.get('downloads') or (lambda: []))())
    base = os.path.realpath(data)
    taken, missing, failed = [], [], []
    todo = [(z, s) for z in args['zones'] for s in sources_of(z) if s in PICKUP]
    for n, (z, s) in enumerate(todo):
        if job.cancelled():
            break
        p = PICKUP[s]
        _step(job, n, len(todo))
        if 'zips' in args and s not in args['zips']:
            # avec zips, seules les sources que le plan a montrées sont prises : une source « manquante » au plan dont le zip
            # est arrivé pendant la question n'est pas prise sans contrôle (relecture Sécurisation, ligne 109)
            failed.append({'zone': z, 'source': s, 'error': 'not-shown'})
            continue
        zp = _latest(dirs, p['zip'])
        if not zp:
            missing.append({'zone': z, 'source': s, 'expected': p['zip']})
            continue
        want = args.get('zips', {}).get(s)
        if want and (os.path.basename(zp), os.path.getsize(zp)) != (want['name'], want['size']):
            # le fichier n'est plus celui que le plan a montré : rien de pris pour cette source, le plan est à refaire
            failed.append({'zone': z, 'source': s, 'error': 'changed', 'zip': os.path.basename(zp), 'size': os.path.getsize(zp)})
            continue
        try:
            if os.path.getsize(zp) > PICKUP_MAX:
                raise regen_jobs.TooLarge(f'zip over {PICKUP_MAX // 1048576} MB')
            with zipfile.ZipFile(zp) as zf:
                infos = regen_jobs.zip_check(zf)  # taille décompressée plafonnée avant toute lecture
                pick = {}
                for i in infos:
                    leaf = i.filename.replace('\\', '/').rsplit('/', 1)[-1]
                    # le nom final passe par la règle des chemins de data/ (noms réservés de Windows, point ou espace finale)
                    if not i.is_dir() and PICKUP_NAME.match(leaf) and p['keep'](leaf) and data_sync.data_path(data, f'{p["to"]}/{leaf}'):
                        pick.setdefault(leaf, i)  # un nom une fois : la première entrée qui le porte
                if not pick:
                    failed.append({'zone': z, 'source': s, 'error': 'nothing-to-take', 'zip': os.path.basename(zp)})
                    continue
                out = os.path.join(data, *p['to'].split('/'))
                if not dry:
                    os.makedirs(out, exist_ok=True)
                    if not regen_jobs.inside(out, base):
                        raise ValueError('unsafe-path')
                    for leaf, i in pick.items():
                        dest = data_sync.data_path(data, f'{p["to"]}/{leaf}')
                        with zf.open(i) as src, open(dest + '.tmp', 'wb') as dst:
                            shutil.copyfileobj(src, dst)
                        os.replace(dest + '.tmp', dest)
                taken.append({'zone': z, 'source': s, 'zip': os.path.basename(zp), 'size': os.path.getsize(zp), 'files': sorted(pick),
                              'bytes': sum(i.file_size for i in pick.values())})
                job.log(f'{z}: {s} ← {os.path.basename(zp)} : {len(pick)} fichier(s)' + (' (à blanc)' if dry else ''))
        except (zipfile.BadZipFile, OSError, ValueError, regen_jobs.TooLarge) as e:
            failed.append({'zone': z, 'source': s, 'error': str(e)[:120] if isinstance(e, (ValueError, regen_jobs.TooLarge)) else type(e).__name__})
    skipped = []
    shown = _openaip_pickup(job, args['zones'], dry, args, ctx, taken, failed, skipped)
    reason = 'cancelled' if job.cancelled() else 'failed' if failed and not taken else 'partial' if failed else None
    res = {'ok': reason is None, 'dry': dry, 'taken': taken, 'missing': missing, 'failed': failed, 'skipped': skipped, **({'shown': shown} if shown else {})}
    if reason:
        res['reason'] = reason
    return res


VERBS = {
    ('base', 'fetch'): (fetch, check_fetch),
    ('base', 'purge'): (purge, check_purge),
    ('base', 'pickup'): (pickup, check_pickup),
}
