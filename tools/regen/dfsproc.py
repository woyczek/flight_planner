"""Verbe dfsproc/build (DFS lot 3, SID / STAR / approches) : les procédures officielles de l'Allemagne.

Le travail prend (si le jeu a changé) « ED Procedure » de la DFS (83 Mo, AIXM 5.1, CC BY 4.0, crédit DFS ; Q-0114 : la page, dépôt privé) sous data/local/dfs/ (aero_fetch.dfs_procedure : plafond posé, somme SHA-512 avant
écriture), lit les points dans « ED Waypoints » et « ED Navaids » (data/sia/zones/de/, pris par base/fetch), convertit (tools/dfs_proc.py : lecture en flux, bornes) et écrit data/proc/<date d'entrée en vigueur>/<OACI>.json
et l'index : le fichier d'une AUTRE source n'est jamais écrasé. Les attentes (HM, HA, HF) ne sont pas lues (le schéma n'a pas de clé pour elles : décision du relais), elles sont COMPTÉES dans le résultat.

  dfsproc/build {} → { ok, aerodromes, procedures, kept, counts, effective } ou { ok: False, reason } ; reason : points (ED Waypoints / ED Navaids absents ou refusés), fetch, missing, too-big, doctype, unreadable, too-many, too-slow, nothing.
"""
import os

import aero_fetch
import dfs_proc


def build(job, args, ctx):
    """Verbe dfsproc/build."""
    data = ctx['data']
    points = [os.path.join(data, 'sia', 'zones', 'de', n) for n in ('dfs_ED_Waypoints.xml', 'dfs_ED_Navaids.xml')]
    if not all(os.path.isfile(p) for p in points):
        files, errors = aero_fetch.dfs(data)      # les points viennent des jeux de la DFS que base/fetch prend : ici ils sont repris si absents
        if not all(os.path.isfile(p) for p in points):
            return {'ok': False, 'reason': 'points'}
    job.step('jeu « ED Procedure »', 0, 4, 'étapes')
    got = aero_fetch.dfs_procedure(data)
    if got.get('error'):
        return {'ok': False, 'reason': 'fetch', 'message': got['error'][:300]}
    job.step('lecture des points', 1, 4, 'étapes')
    names, why = dfs_proc.points_of(points)
    if why:
        return {'ok': False, 'reason': 'doctype' if why == 'doctype' else 'points'}
    job.step('lecture des procédures', 2, 4, 'étapes')
    read, why = dfs_proc.read(got['path'], names)
    if why:
        return {'ok': False, 'reason': why}
    legs, procs = read
    docs, stats = dfs_proc.build(legs, procs)
    if not docs:
        return {'ok': False, 'reason': 'nothing'}
    job.step('écriture', 3, 4, 'étapes')
    res = dfs_proc.write(os.path.join(data, 'proc'), docs, got['effective'], stats)
    job.step('terminé', 4, 4, 'étapes')
    return {'ok': True, 'aerodromes': res['aerodromes'], 'procedures': res['procedures'], 'kept': res['kept'], 'effective': got['effective'],
            'counts': {k: stats[k] for k in ('holds', 'fixless', 'unresolved', 'rf', 'missing', 'points')}}


VERBS = {
    ('dfsproc', 'build'): (build, lambda a: {} if a == {} else None),
}
