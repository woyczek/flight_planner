"""Le jeu « vfr » du lanceur : les points VFR des cartes VAC de la France (V3 § 10.34 A1, module Données) — chargé par regen_jobs.load_verbs().

Trois verbes, au contrat de base/* (frame/INTEGRATION.md § 15, modules/data/SPEC.md § 5.5), un seul élément : le cycle AIRAC (« AAAA-MM-JJ »,
celui en vigueur par défaut, calendrier de 28 jours) :
  · `vfr/fetch` { cycle, icaos? } : les cartes VAC du cycle (atlas VFR du disque eAIP du SIA, adresse calculée ici : proc_sia.vac_url, jamais
    prise de la page) dans le cache du poste, data/local/vac/<cycle>/AD-2.<OACI>.pdf (local/ : jamais versionné) ; les terrains : ceux de la base
    SIA du poste pour ce cycle (sia/base/fr/<cycle>/aerodromes.json, codes LF…), ou la liste donnée ; une carte déjà en cache n'est pas
    redemandée (un cycle ne change pas) ; une carte absente (404) n'est pas un échec ; aucune carte du cycle : « not-published » (le SIA ne le
    publie pas encore) ; une pause entre deux demandes, MIN_GAP 30 s entre deux départs ;
  · `vfr/build` { cycle } : la compilation de tools/report-vfr (vfr_core.compile_corpus : points, séquences, consignes, interprétations
    persistantes) sur ce cache, le contrôle strict de tools/vfr_import.py, l'écriture de sia/vfr/ et UN commit (regen_jobs.commit_outputs, au
    nom de l'auteur) — ce que faisait la route V2 vfr-import, à partir du cache et non d'un fichier choisi dans la page ; pypdf absent :
    « no-pypdf » ; une erreur de compilation ou de contrôle : rien n'est écrit ;
  · `vfr/purge` { cycle?, dry } : le cache (les cartes et leur texte extrait) de ce cycle, ou de tous ; le plan d'abord (dry) ; jamais sia/vfr/
    ni un fichier suivi.
Vue : job.data['cycles'] = { <cycle>: { state, done, total, error? } } ; résultats : fetch { ok, cycle, fetched, unchanged, notPublished,
failed: [{ item, error }], reason? }, build { ok, cycle, summary, commit, warning?, failed, reason? }, purge { ok, dry, removed: { files, bytes },
warnings, reason? }."""
import json
import os
import re
import shutil
import subprocess
import sys
import time

TOOLS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if TOOLS not in sys.path:
    sys.path.insert(0, TOOLS)
import regen_jobs  # noqa: E402  (le socle : commit_outputs)

REPORT_VFR = os.path.join(TOOLS, 'report-vfr')
CYCLE = re.compile(r'\d{4}-\d{2}-\d{2}')
ICAO = re.compile(r'LF[A-Z0-9]{2}')
MAX_ICAOS = 800
PAUSE = 0.3  # s entre deux demandes au SIA
MIN_GAP = {('vfr', 'fetch'): 30}
UA = 'SOG-vfr-fetch'


def cycle_in_force():
    """Cycle AIRAC en vigueur (date de début), calendrier de 28 jours (AIRAC 2401 = 2024-01-25)."""
    from datetime import date, timedelta
    ref, today = date(2024, 1, 25), date.today()
    return (ref + timedelta(days=28 * ((today - ref).days // 28))).isoformat()


def _cycle(a):
    c = a.get('cycle') or cycle_in_force()
    return c if isinstance(c, str) and CYCLE.fullmatch(c) else None


def check_fetch(a):
    """{ cycle, icaos }" ; None si le cycle ou un code n'en est pas un (rien de deviné)."""
    c, icaos = _cycle(a), a.get('icaos', [])
    if not c or not isinstance(icaos, list) or len(icaos) > MAX_ICAOS or not all(isinstance(x, str) and ICAO.fullmatch(x) for x in icaos):
        return None
    return {'cycle': c, 'icaos': sorted(set(icaos))}


def check_build(a):
    c = _cycle(a)
    return {'cycle': c} if c else None


def check_purge(a):
    c = a.get('cycle')
    if c is not None and not (isinstance(c, str) and CYCLE.fullmatch(c)):
        return None
    return {'cycle': c, 'dry': a.get('dry', True) is not False}


def cache_dir(data, cycle):
    return os.path.join(data, 'local', 'vac', cycle)


def text_dir(data, cycle):
    return os.path.join(data, 'local', 'vac-text', cycle)


def base_icaos(data, cycle):
    """Les codes LF… des terrains de la base SIA du poste pour ce cycle ; [] sans elle."""
    try:
        with open(os.path.join(data, 'sia', 'base', 'fr', cycle, 'aerodromes.json'), encoding='utf-8') as f:
            doc = json.load(f)
    except (OSError, ValueError):
        return []
    rows = doc.get('data') if isinstance(doc, dict) else None
    return sorted({r.get('icao') for r in rows or [] if isinstance(r, dict) and isinstance(r.get('icao'), str) and ICAO.fullmatch(r['icao'])})


class _View:
    """L'élément du travail (le cycle) à la racine de sa vue."""

    def __init__(self, job, cycle):
        self.job, self.cycle = job, cycle
        job.data['cycles'] = {cycle: {'state': 'waiting', 'done': 0, 'total': 0}}

    def set(self, **kw):
        self.job.data['cycles'][self.cycle] = {**self.job.data['cycles'][self.cycle], **kw}


def _get(url, timeout=60):
    """(statut, octets) ; statut 404 / 410 : absente. Réponse plafonnée, redirection vers un autre hôte refusée (regen_jobs.download)."""
    return regen_jobs.download(url, timeout, max_bytes=50 * 1024 * 1024, ua=UA)


GET = _get  # remplacé par les essais (aucun appel réel)


def fetch(job, args, ctx):
    """Verbe vfr/fetch (voir l'en-tête du module)."""
    import proc_sia
    data, cycle = ctx['data'], args['cycle']
    view = _View(job, cycle)
    icaos = args['icaos'] or base_icaos(data, cycle)
    if not icaos:
        view.set(state='failed', error='no-base')
        return {'ok': False, 'cycle': cycle, 'reason': 'no-base', 'message': f'no SIA base for {cycle} on this workstation: build it first, or give the aerodromes'}
    folder = cache_dir(data, cycle)
    os.makedirs(folder, exist_ok=True)
    eaip = proc_sia.eaip_url(cycle)
    fetched = unchanged = absent = 0
    failed = []
    view.set(state='fetching', total=len(icaos))
    for n, icao in enumerate(icaos):
        if job.cancelled():
            break
        job.step(icao, n, len(icaos), 'aerodromes')
        dest = os.path.join(folder, f'AD-2.{icao}.pdf')
        if os.path.isfile(dest) and os.path.getsize(dest) > 0:  # une carte d'un cycle ne change pas
            unchanged += 1
        else:
            try:
                status, body = GET(proc_sia.vac_url(eaip, icao))
                if status in (404, 410):
                    absent += 1
                elif status != 200 or not body.startswith(b'%PDF'):
                    failed.append({'item': icao, 'error': f'http-{status}' if status != 200 else 'not-a-pdf'})
                else:
                    tmp = dest + '.tmp'
                    with open(tmp, 'wb') as f:
                        f.write(body)
                    os.replace(tmp, dest)
                    fetched += 1
            except (OSError, ValueError, regen_jobs.TooLarge) as e:  # réseau, délai, réponse trop grande : cette carte seulement
                failed.append({'item': icao, 'error': e.__class__.__name__})
            time.sleep(PAUSE)
        view.set(done=n + 1)
    job.step('', len(icaos), len(icaos), 'aerodromes')
    job.log(f'{cycle} : {fetched} téléchargée(s), {unchanged} déjà là, {absent} absente(s), {len(failed)} échec(s)')
    if job.cancelled():
        reason = 'cancelled'
    elif absent == len(icaos):
        reason = 'not-published'  # aucune carte : le SIA ne publie pas encore ce cycle
    elif failed and not (fetched or unchanged):
        reason = 'failed'
    else:
        reason = 'partial' if failed else None
    view.set(state='failed' if reason in ('failed', 'not-published') else 'cancelled' if reason == 'cancelled' else 'done',
             **({'error': reason} if reason else {}))
    res = {'ok': reason is None, 'cycle': cycle, 'fetched': fetched, 'unchanged': unchanged, 'notPublished': absent, 'failed': failed}
    if reason:
        res['reason'] = reason
    return res


def build(job, args, ctx):
    """Verbe vfr/build (voir l'en-tête du module)."""
    data, cycle = ctx['data'], args['cycle']
    view = _View(job, cycle)
    try:
        import pypdf  # noqa: F401  (dépendance facultative de tools/report-vfr : requirements-vfr.txt)
    except ImportError:
        view.set(state='failed', error='no-pypdf')
        return {'ok': False, 'cycle': cycle, 'reason': 'no-pypdf', 'message': 'pypdf is missing: python -m pip install pypdf'}
    folder = cache_dir(data, cycle)
    if not os.path.isdir(folder) or not any(n.startswith('AD-2.') for n in os.listdir(folder)):
        view.set(state='failed', error='no-cache')
        return {'ok': False, 'cycle': cycle, 'reason': 'no-cache', 'message': f'no VAC of {cycle} on this workstation: download them first'}
    if REPORT_VFR not in sys.path:
        sys.path.insert(0, REPORT_VFR)
    import vfr_core
    import vfr_import
    view.set(state='building', total=3)
    job.step('compilation', 0, 3, 'steps')
    compiled = vfr_core.compile_corpus(folder, text_dir(data, cycle), os.path.join(REPORT_VFR, 'interpretations'), source_airac=cycle)
    if job.cancelled():
        view.set(state='cancelled')
        return {'ok': False, 'cycle': cycle, 'reason': 'cancelled'}
    failed = [{'item': e.get('icao', '?'), 'error': str(e.get('error', ''))[:200]} for e in compiled.get('errors') or []]
    if failed:  # compilation incomplète : publication refusée, comme compile_vfr.py
        view.set(state='failed', error='compile')
        return {'ok': False, 'cycle': cycle, 'reason': 'failed', 'failed': failed, 'summary': compiled.get('summary', {})}
    view.set(done=1)
    job.step('contrôle', 1, 3, 'steps')
    p = vfr_import.plan(compiled, data)
    if not p['ok']:
        view.set(state='failed', error='invalid')
        return {'ok': False, 'cycle': cycle, 'reason': 'invalid', 'failed': [{'item': 'plan', 'error': str(e)[:200]} for e in p['errors'][:20]],
                'summary': p['summary']}
    view.set(done=2)
    job.step('écriture', 2, 3, 'steps')
    if regen_jobs.merge_pending(ctx):  # rien n'est écrit dans data/ tant qu'une fusion y attend
        view.set(state='failed', error='merge-pending')
        return {'ok': False, 'cycle': cycle, 'reason': 'merge-pending', 'failed': [], 'summary': p['summary']}
    vfr_import.write(p, data)
    s = p['summary']
    c = regen_jobs.commit_outputs(ctx, job.author, ['sia/vfr/'], f"Points VFR des VAC, cycle {cycle} : {s.get('aerodromes', '?')} terrain(s) ({job.author or '?'})")
    view.set(done=3, state='done')
    job.step('', 3, 3, 'steps')
    res = {'ok': True, 'cycle': cycle, 'summary': s, 'commit': c['commit'], 'failed': []}
    if c.get('warning'):
        res['warning'] = c['warning']
    return res


def _tracked(ctx, rels):
    git = ctx.get('git_cmd')
    if not git:
        return set()
    p = subprocess.run(git('-C', ctx['data'], 'ls-files', '-z', '--', *rels), capture_output=True, env=regen_jobs.git_child_env(), timeout=60)
    if p.returncode:
        raise RuntimeError('git ls-files failed')
    return {x for x in p.stdout.decode('utf-8', 'replace').split('\0') if x}


def purge(job, args, ctx):
    """Verbe vfr/purge : le cache de ce cycle (ou de tous), le plan d'abord ; jamais sia/vfr/ ni un fichier suivi."""
    data, dry = ctx['data'], args['dry']
    roots = [os.path.join(data, 'local', 'vac'), os.path.join(data, 'local', 'vac-text')]
    if args['cycle']:
        roots = [os.path.join(r, args['cycle']) for r in roots]
    cands, refused = [], 0
    base = os.path.realpath(os.path.join(data, 'local'))
    for r in roots:  # chaque chemin résolu sous data/local/ (regen_jobs.inside : un lien ou une jonction vers ailleurs est refusé)
        if not os.path.lexists(r):
            continue
        if not regen_jobs.inside(r, base):
            refused += 1
            continue
        fs, bad = regen_jobs.files_under(r, base)
        cands += fs
        refused += bad
    rels = [os.path.relpath(f, data).replace(os.sep, '/') for f in cands]
    try:
        tracked = _tracked(ctx, rels) if rels else set()
    except (OSError, RuntimeError, subprocess.SubprocessError):
        return {'ok': False, 'reason': 'failed', 'message': 'git ls-files failed: nothing removed', 'removed': {}, 'warnings': []}
    files = size = kept = 0
    job.step('purge', 0, len(cands), 'files')
    for n, (full, rel) in enumerate(zip(cands, rels)):
        if job.cancelled():
            break
        if rel in tracked:
            kept += 1
            continue
        if not regen_jobs.inside(full, base):  # revérifié juste avant le retrait
            refused += 1
            continue
        try:
            nb = os.lstat(full).st_size
            if not dry:
                os.remove(full)
        except OSError as e:
            job.log(f'{rel} non retiré ({e.__class__.__name__})')
            continue
        files += 1
        size += nb
        job.step('purge', n + 1, len(cands), 'files')
    if not dry and not job.cancelled():
        for r in roots:
            if os.path.isdir(r) and regen_jobs.inside(r, base):
                regen_jobs.prune_empty(r, base)  # les dossiers vidés ; jamais au travers d'une jonction
    job.log(f"{'à retirer' if dry else 'retiré'} : {files} fichier(s), {size // 1024} Ko" + (f', {kept} suivi(s) par git gardé(s)' if kept else ''))
    res = {'ok': not job.cancelled(), 'dry': dry, 'removed': {'files': files, 'bytes': size},
           'warnings': ([{'code': 'kept-tracked', 'count': kept}] if kept else []) + ([{'code': 'unsafe-path', 'count': refused}] if refused else [])}
    if job.cancelled():
        res['reason'] = 'cancelled'
    return res


VERBS = {
    ('vfr', 'fetch'): (fetch, check_fetch),
    ('vfr', 'build'): (build, check_build),
    ('vfr', 'purge'): (purge, check_purge),
}
