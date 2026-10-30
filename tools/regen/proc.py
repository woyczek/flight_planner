"""Le travail de lecture des procédures d'UN terrain (jeu « proc » du lanceur, V3 § 10.29 (d), frame/INTEGRATION.md § 15) — chargé par regen_jobs.load_verbs().

UN seul travail, deux verbes : `proc/eaip-fetch` (la France, par l'eAIP du SIA, sans compte) et `proc/ead-fetch` (un État dont EAD_STATES dit « read », par EAD Basic, avec le compte du poste).
Ce qui les distingue est dans la table SOURCES (qui lit quel État, avec ou sans compte, où est le cache, comment la source est lue, ce qu'on contrôle avant d'installer) ; tout le reste est
commun et écrit une fois : l'avancement et l'annulation, le journal sans secret, les comptes (`stats`), l'installation par proc_manual, le commit par regen_jobs.commit_outputs, le résultat.

Règle des États, à UN seul endroit (SOURCES[...]['states']) : la France (« LF ») se lit par l'eAIP, jamais par EAD ; tout autre État que la page a choisi (EAD_STATES « read ») par EAD Basic ; `ead-fetch` refuse un code « LF ».
La page (aerodb.fetchProcedures) choisit le verbe d'après le code ; le lanceur REcontrôle ici : un code hors de la France est refusé (400) par `proc/eaip-fetch`, un code français par `proc/ead-fetch`.
Règle d'EAD Basic (frame/aerodb/EAD_BASIC.md § 1) : un terrain par geste de l'utilisateur, jamais une liste, jamais en masse (MIN_GAP : 30 s entre deux départs d'`ead-fetch`, le plus long gagne).
Identifiants d'EAD Basic : <secrets>/ead.json { user, password }, sinon EAD_USER / EAD_PASSWORD ; jamais journalisés (sanitize), jamais rendus.

fn(job, args, ctx) : job.step(texte, fait, total, unité), job.log(ligne), job.cancelled(), job.author (le trigramme de la page, '' sans lui : sans trigramme, rien n'est validé dans data/) ;
ctx = { data, secrets, git_cmd, git_env }. Rend { ok: True, icao, procedures, warnings, commit (SHA | None), source, stats, file, … } ou { ok: False, reason: 'no-credentials' | 'no-tables' |
'cancelled' | 'failed', message?, warnings?, stats? }.
"""
import json
import os
import re
import sys
import time
import urllib.error

TOOLS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if TOOLS not in sys.path:
    sys.path.insert(0, TOOLS)
import regen_jobs  # noqa: E402  (le socle : commit_outputs, _ead_credentials, clean_error)


class _Cancelled(BaseException):
    """Annulation demandée, levée par say() et step(). BaseException : les « except Exception » de proc_ead (lecture de PDF, OCR) ne l'avalent pas ; le travail l'attrape toujours."""


class Env:
    """Ce que le travail et la lecture de la source partagent : l'identité du terrain, les dossiers, le journal sans secret, l'avancement (qui regarde l'annulation)."""

    def __init__(self, job, icao, ctx, secrets=()):
        self.job, self.icao, self.ctx, self.data, self.secrets = job, icao, ctx, ctx['data'], list(secrets)

    def clean(self, text, n=300):
        if not self.secrets:                              # sans compte (l'eAIP), rien à retirer ici : sanitize prendrait le nom d'un PDF pour un jeton ; le socle nettoie déjà le journal et l'avancement (Job.clean)
            return str(text)[:n]
        import proc_ead
        return proc_ead.sanitize(str(text), self.secrets)[:n]

    def say(self, *parts):
        text = self.clean(' '.join(map(str, parts)), 10000)
        self.job.log(text)
        self.job.step(text[:200])
        if self.job.cancelled():
            raise _Cancelled()

    def step(self, text, done, total, unit='pages'):
        self.job.step(self.clean(text, 10000), done, total, unit)         # le nombre de pas faits sur le total : la page le montre (aerodb.fetchProcedures → onProgress)
        if self.job.cancelled():
            raise _Cancelled()

    def failed(self, message, warnings=(), stats=None):
        return {'ok': False, 'reason': 'failed', 'message': self.clean(message), 'warnings': [self.clean(w) for w in warnings][:50], **({'stats': stats} if stats else {})}


# ----------------------------------------------------------------------------------------------------------------------- les deux lectures
def _read_eaip(env):
    """Lit dans l'eAIP du SIA (France) les procédures d'UN terrain (tables de codage ARINC des pages AD 2). AUCUNE adresse ne vient de la page : le dossier AIRAC est calculé ici (cycle en
    vigueur d'après le calendrier de 28 jours, proc_sia.eaip_url). Cache data/local/eaip/<cycle>/ (jamais publié) ; les points en route sont placés d'après la base SIA du poste,
    data/sia/base/fr/<cycle>/, si elle y est, sinon à la lecture par aerodb. Le contrôle de géométrie est fait par le constructeur (proc_geometry.review : une procédure qui échoue est installée
    au statut « doubt » avec son code, jamais retirée). Rend { docs, formats, warnings, dropped, extra } ou un résultat final (la page du terrain ne cite aucune table : 'no-tables')."""
    import proc_ead
    import proc_sia
    cycle = proc_ead.lib_cycle(env.data)                 # cycle en vigueur (la date du dossier AIRAC de l'eAIP)
    eaip = proc_sia.eaip_url(cycle)
    cache = os.path.join(env.data, 'local', 'eaip', cycle)
    base = os.path.join(env.data, 'sia', 'base', 'fr', cycle)
    env.cycle = cycle
    os.makedirs(cache, exist_ok=True)
    try:
        resolve = proc_sia.base_resolver(base) if os.path.isdir(base) else None
    except (OSError, ValueError, AttributeError, TypeError):      # base illisible : les points en route sont placés à la lecture
        resolve = None
    env.say(f'{env.icao}: eAIP du SIA, cycle {cycle}')
    doc = proc_sia.read_aerodrome(eaip, env.icao, cache, resolve, env.say, step=env.step)
    if doc is None:
        return {'ok': False, 'reason': 'no-tables'}
    dropped = [d.get('reason') or 'name' for d in doc.pop('dropped', [])]      # vraiment retirées (build_aerodrome) : un bloc sans titre qui répète une procédure nommée
    return {'docs': [doc], 'formats': doc.get('formats', []), 'warnings': list(doc.get('warnings', [])), 'dropped': dropped, 'extra': {'cycle': cycle}}


def _explain_eaip(env, e):
    """Les erreurs de l'eAIP du SIA dites à l'utilisateur (404 : le dossier du cycle n'est pas encore publié)."""
    if isinstance(e, urllib.error.HTTPError):
        if e.code == 404:
            return env.failed(f'eAIP page not found (HTTP 404): the AIRAC folder of cycle {getattr(env, "cycle", "?")} is not published yet on the SIA site, or {env.icao} has no AD 2 page in it')
        return env.failed(f'SIA site answered HTTP {e.code}')
    return None


def _read_ead(env):
    """Lit dans EAD Basic les procédures d'UN terrain : connexion à la bibliothèque, proc_ead.fetch_ad (cache local data/local/ead/, jamais publié), puis, s'il y en a un écrit par CE travail,
    le document des pages lues par OCR (<OACI>.ocr.json : un reste d'une lecture ancienne est ignoré). Rend { docs, formats, warnings, dropped, extra } ou un résultat final (connexion refusée)."""
    import proc_ead
    t0 = time.time()
    out = os.path.join(env.data, 'local', 'ead')
    os.makedirs(out, exist_ok=True)
    user, password = env.secrets
    lib = proc_ead.EadLibrary(user, password, env.say, delay=1.0)
    if not lib.open():
        return env.failed('login refused')
    doc = proc_ead.fetch_ad(lib, env.icao, out, env.say, step=lambda text, done, total, unit='documents': env.step(text, done, total, unit))
    ocr = None
    ocr_path = os.path.join(out, f'{env.icao}.ocr.json')
    if os.path.isfile(ocr_path) and os.stat(ocr_path).st_mtime >= t0 - 1:          # écrit par CE travail
        with open(ocr_path, encoding='utf-8') as f:
            ocr = json.load(f)
    docs = [d for d in (doc, ocr) if d]
    return {'docs': docs, 'formats': [f for d in docs for f in d.get('formats', [])], 'warnings': [w for d in docs for w in d.get('warnings', [])], 'dropped': [],
            'extra': {'ocr': bool(ocr and ocr.get('procedures'))}}


def _commit_message(source, icao):
    return (f":card_file_box: Procédures {icao} lues dans l'eAIP du SIA (à la demande)" if source == 'eaip' else
            f':card_file_box: Procédures {icao} lues dans EAD Basic (à la demande, non opérationnelles)')


# La table des sources : qui lit quel État, et ce qui change d'une lecture à l'autre. Le reste du travail est commun.
SOURCES = {
    'eaip': {
        'verb': 'eaip-fetch',
        'states': ('LF',),             # la France, et elle seule : son eAIP est publié sans compte (jamais EAD, dont l'échantillon est une édition de 2015)
        'account': False,              # aucun identifiant
        'read': _read_eaip,
        'explain': _explain_eaip,      # les erreurs HTTP de l'eAIP, dites en clair
        'screen': False,               # les tables du SIA impriment le cap magnétique : proc_geometry le contrôle déjà pendant la lecture, pas de second contrôle à la main
        'replace_source': 'eaip',      # une relecture REMPLACE la précédente de la même source (ses identifiants d'avant ne restent pas à côté des nouveaux)
        'detailed_failure': False,     # « rien de lu » : le message court (la page du SIA est lue d'un bloc)
    },
    'ead': {
        'verb': 'ead-fetch',
        'states': None,                # tout autre État que la page a choisi (EAD_STATES « read ») ; le lanceur ne recontrôle pas EAD_STATES
        'not_states': ('LF',),         # … sauf la France, qui n'est JAMAIS lue par EAD : ead-fetch refuse un code « LF » (la règle des États est ici, à un seul endroit)
        'account': True,               # <secrets>/ead.json ou EAD_USER / EAD_PASSWORD
        'read': _read_ead,
        'explain': None,
        'screen': True,                # proc_manual.screen : une lecture qui échoue au contrôle de géométrie est refusée seule (voir proc_geometry)
        'replace_source': None,
        'detailed_failure': True,      # « rien de lu » : combien de documents et de pages vus, lus, et pourquoi pas
    },
}
MIN_GAP = {('proc', 'ead-fetch'): 30}


def check_icao(source):
    """Contrôle d'arguments d'un verbe (→ 400 si None) : { 'icao': 4 caractères [A-Z0-9] } et rien d'autre ; une liste (« LFBD,LFBO »), un joker, un champ en plus sont refusés (EAD Basic ne se
    lit pas en masse) ; et, pour une source qui n'a qu'un État (`states`), un code de cet État seulement."""
    states, excluded = SOURCES[source]['states'], SOURCES[source].get('not_states')

    def check(a):
        if not isinstance(a, dict) or set(a) != {'icao'} or not isinstance(a['icao'], str):
            return None
        icao = a['icao'].strip().upper()
        if not re.fullmatch(r'[A-Z0-9]{4}', icao) or (states and not icao.startswith(states)) or (excluded and icao.startswith(excluded)):
            return None
        return {'icao': icao}
    return check


def _installed_file(data, icao):
    """Le fichier du terrain tel que proc_manual.install vient de l'écrire (data/proc/manual/<OACI>.json), relu sur le disque ; None s'il ne se lit pas. Rendu dans le résultat du travail
    (`file`) : aerodb le sert tout de suite, sans attendre que sa copie de lecture rattrape."""
    try:
        with open(os.path.join(data, 'proc', 'manual', f'{icao}.json'), encoding='utf-8') as f:
            doc = json.load(f)
        return doc if isinstance(doc, dict) and isinstance(doc.get('procedures'), list) else None
    except (OSError, ValueError):
        return None


def _summary(stats):
    """Ligne de journal d'un compte rendu `stats` : « 18 procédure(s) installée(s) ; 22 page(s) lue(s) sur 22, 4 non lue(s) … ». Les motifs sont des codes dans `stats` (proc_geometry), dits ici en
    texte : la console seule porte des phrases."""
    import proc_geometry as G
    why = '; '.join(f'{G.phrase(t)} ×{n}' for t, n in stats.get('reasons', []))
    return (f'{stats.get("procedures", 0)} procédure(s) installée(s) ; {stats.get("read", 0)} page(s) lue(s) sur {stats.get("pages", 0)}, {stats.get("rejected", 0)} non lue(s)'
            f'{"; " + str(stats["doubt"]) + " à vérifier (statut doubt, gardées dans le fichier)" if stats.get("doubt") else ""}'
            f'{"; " + str(stats["dropped"]) + " retirée(s)" if stats.get("dropped") else ""}{" (motifs : " + why + ")" if why else ""}')


def _nothing_read(formats, stats):
    """Message de l'échec « rien de lu » : combien de documents et de pages ont été vus, combien lus, et les motifs les plus fréquents des autres (« 31 document(s), 0 of 31 page(s) read
    (mise en page non reconnue ×31) ») ; Fuel l'affiche tel quel après la raison, c'est tout ce que l'utilisateur voit d'une lecture qui n'a rien donné."""
    import proc_geometry as G
    docs = len({f.get('file') for f in formats if f.get('file')})
    why = '; '.join(f'{G.phrase(t)} ×{n}' for t, n in stats.get('reasons', [])[:2])
    return f'no procedure could be read for this aerodrome: {docs} document(s), {stats.get("read", 0)} of {stats.get("pages", 0)} page(s) read' + (f' ({why})' if why else '')


def fetch(name):
    """Le travail de la source `name` (une clé de SOURCES) : fn(job, args, ctx)."""
    src = SOURCES[name]

    def run(job, args, ctx):
        icao = args['icao']
        data = ctx['data']
        secrets = ()
        if src['account']:
            user, password = regen_jobs._ead_credentials(ctx['secrets'])
            if not user or not password:
                return {'ok': False, 'reason': 'no-credentials'}
            secrets = (user, password)
        import proc_geometry as G
        import proc_manual
        import proc_records
        env = Env(job, icao, ctx, secrets)
        stats = None                                       # les comptes de ce qui a été vu, rendus aussi quand la lecture échoue (aerodb les passe : { ok: false, reason: 'failed', message, stats })
        try:
            got = src['read'](env)
            if 'docs' not in got:                          # un résultat final de la lecture : connexion refusée, aucune table de codage
                return got
            if job.cancelled():
                raise _Cancelled()
            todo, warnings, formats, dropped = [d for d in got['docs'] if d.get('procedures')], got['warnings'], got['formats'], got['dropped']

            def count(installed):
                return proc_records.stats_of(formats, installed, dropped, G.doubt_codes(p for d in todo for p in d['procedures']))
            stats = count(0)                               # sans procédure installée ; remplacé par le compte final en cas de succès
            if not todo:
                job.log(env.clean(_summary(stats)))
                return env.failed(_nothing_read(formats, stats) if src['detailed_failure'] else 'no procedure could be read for this aerodrome', warnings, stats)
            if src['screen']:
                refused = []
                for k, d in enumerate(todo):               # ce que fait proc_manual.main() avant d'installer : le fichier, puis chaque procédure (une lecture à la main qui échoue est refusée seule)
                    problems = proc_manual.file_problems(d)
                    if problems:
                        job.log(env.clean(_summary(stats)))
                        return env.failed('interpretation file refused: ' + '; '.join(problems[:3]), warnings, stats)
                    todo[k], bad = proc_manual.screen(d)
                    refused += bad
                warnings += [f'REFUSÉE: {x}' for x in refused]
                todo = [d for d in todo if d['procedures']]
                stats = count(0)
                if not todo:                               # plus aucune procédure : le fichier n'est refusé que s'il n'en reste aucune
                    job.log(env.clean(_summary(stats)))
                    return env.failed('geometry check failed: ' + '; '.join(refused[:3]), warnings, stats)
            wrong = [d for d in todo if d.get('icao') != icao or any(p.get('icao') != icao for p in d['procedures'])]
            if wrong:                                      # le fichier écrit doit être celui que commit_outputs valide (proc/manual/<OACI>.json) : celui du terrain demandé, et d'aucun autre
                job.log(env.clean(_summary(stats)))
                return env.failed(f"the file read is not {icao}'s (aerodrome {wrong[0].get('icao')!r} in the document): nothing installed", warnings, stats)
            installed = 0
            env.say(f'{icao}: installation de {sum(len(d["procedures"]) for d in todo)} procédure(s)')
            for d in todo:
                try:
                    proc_manual.install(d, os.path.join(data, 'proc'), replace=False, replace_source=src['replace_source'])
                    installed += len(d['procedures'])
                except SystemExit as e:                    # procédures d'une autre source dans le fichier du terrain : rien n'est écrit
                    if not installed:
                        return env.failed(e, warnings, stats)
                    warnings.append(str(e))                # le premier document est déjà installé : le suivant est signalé
        except _Cancelled:
            return {'ok': False, 'reason': 'cancelled'}
        except (SystemExit, Exception) as e:               # réseau (URLError, délai), pypdf manquant (SystemExit), PDF illisible, HTTP de l'eAIP…
            return (src['explain'] and src['explain'](env, e)) or env.failed(e, stats=stats)
        # une fois les fichiers écrits, le travail va jusqu'au commit (sinon data/ resterait sali) ; le commit est celui du socle, de l'auteur de la page, sans push
        done = regen_jobs.commit_outputs(ctx, getattr(job, 'author', ''), [f'proc/manual/{icao}.json', 'proc/manual/index.json'], _commit_message(name, icao))
        if done.get('warning'):
            warnings.append('git: ' + done['warning'])
        stats = count(installed)                           # pages = documents lus (une entrée par page de tableau vue)
        job.log(env.clean(_summary(stats)))
        return {'ok': True, 'icao': icao, 'procedures': installed, 'warnings': [env.clean(w) for w in warnings][:50], 'commit': done.get('commit'), 'source': name, 'stats': stats,
                'file': _installed_file(data, icao), **got['extra']}
    run.__name__ = f'fetch_{name}'
    return run


VERBS = {('proc', src['verb']): (fetch(name), check_icao(name)) for name, src in SOURCES.items()}
