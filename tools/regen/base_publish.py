"""Le verbe « base/publish » : publier une zone de la base aéronautique (jeu « base » du lanceur ; V3, 12 nov. 2026, SOG-0258) — chargé par regen_jobs.load_verbs().

`base/publish` { zone, dry? : vrai par défaut } :
  · dry (le plan, par défaut) : rend { ok, zone, state, commit, ahead: [les autres zones construites non publiées qui partiraient avec], commits, otherFiles (fichiers de l'utilisateur, hors sia/base, commités non envoyés), pending (à commiter par la synchronisation) } — le NOMBRE de fichiers
    de l'utilisateur, jamais leurs noms ; ok faux et `reason` : bad-zone, no-repo, no-remote, not-built ;
  · dry faux : la synchronisation de data/ (le geste « Synchroniser » : commit au nom du trigramme de la page, fusion, envoi), puis { ok, zone, sync: { ok, pushed, … }, state } ; « Publier » est dit tel quel : UN envoi emporte tous les commits non envoyés, des autres zones et des données de l'utilisateur
    (le plan les a listés d'abord) : il n'y a pas d'isolation d'une zone.
Rien d'autre que la synchronisation n'est écrit ; aucun chemin ne vient de la page ; le plan ne fait aucun appel réseau."""
import os
import re
import sys

TOOLS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if TOOLS not in sys.path:
    sys.path.insert(0, TOOLS)
import zone_publish  # noqa: E402

TRIGRAM = re.compile(r'^[A-Z0-9]{2,5}$')


def check(a):
    """{ zone, dry? } et rien d'autre (→ 400 si None)."""
    if not isinstance(a, dict) or not set(a) <= {'zone', 'dry'} or not isinstance(a.get('zone'), str) or not zone_publish.ZONE.match(a['zone']) or not isinstance(a.get('dry', True), bool):
        return None
    return {'zone': a['zone'], 'dry': a.get('dry', True)}


def run(job, args, ctx):
    data = ctx['data']
    p = zone_publish.plan(data, args['zone'])
    if args['dry'] or not p.get('ok'):
        return p
    sync = ctx.get('base_publish')
    if not callable(sync):
        return {**p, 'ok': False, 'reason': 'no-sync', 'message': 'this launcher has no synchronisation to publish with'}
    if not TRIGRAM.match(job.author or ''):
        return {**p, 'ok': False, 'reason': 'no-author', 'message': 'trigram of the author missing or invalid'}
    job.step('synchronisation de data/', 0, 1, 'étapes')
    r = sync(job.author)
    after = zone_publish.states(data, [args['zone']]).get(args['zone']) or {}
    return {**p, 'ok': bool(r.get('ok')), 'sync': {k: r.get(k) for k in ('ok', 'pushed', 'committed', 'received', 'conflicts', 'refused', 'message', 'cause') if k in r}, 'state': after.get('state', p.get('state'))}


VERBS = {('base', 'publish'): (run, check)}
