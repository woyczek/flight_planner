"""SOG-0161 : le contrôle d'une route TRONÇON PAR TRONÇON, par couche (SID / LOW / HIGH / FRA / STAR) — ce que le moteur peut affirmer, ce qu'il ne fait que proposer.

Le moteur de RouteSim rendait « route contrôlée » ou « calcul impossible » : une route qui n'était sûre qu'en partie n'était ni l'une ni l'autre. Ici chaque tronçon du résultat est classé :
  · `controlled` : une procédure publiée (SID, STAR, approche) ou un segment d'airway du réseau publié, niveaux compatibles, sans donnée manquante ; ou un DCT que l'annexe 3B DCT du RAD publie, disponible sans condition ;
  · `incomplete` : une liaison entre points FRA du classeur EUROCONTROL (rôles E / X / I et niveaux contrôlés, mais volumes, NPZ et conditions complexes absents des listes de points) ;
  · `fallback` : un raccord DCT de simulation (aucune SID ni STAR lue pour l'aérodrome) ou un DCT hors liste du RAD : proposé, jamais « contrôlé » ;
  · `error` : le contrôle du moteur y a trouvé une erreur (niveau, sens interdit, RAD).
Les tronçons voisins de même couche et de même classe forment une section. Le résultat gagne `control` : { controlled_pct, incomplete_pct, fallback_pct, error_pct, total_nm, sections: [{ layer, control, from, to, nm, legs: [premier, dernier], reason }] } et chaque tronçon `control`, `layer`, `control_reason`.
Rien n'est inventé : un DCT n'est « contrôlé » que si le RAD le publie sans condition ; la limite horizontale des DCT par espace (annexe 3B FRA LIM) n'est pas appliquée faute de contours d'espaces : un DCT hors liste est dit « non contrôlé ».
"""
import re

LOW_CEILING_FT = 24500          # un segment d'airway dont le plafond ne dépasse pas FL245 est de la couche LOW ; au-dessus, HIGH


def published_dct(rad):
    """Les paires de points { frozenset({a, b}) } dont l'annexe 3B DCT du RAD en vigueur dit « disponible » SANS condition d'emploi (colonne « Utilization » vide) et à toute heure (H24 ou sans horaire) ; vide sans RAD."""
    out = set()
    book = getattr(rad, 'book', None)
    if not book:
        return out
    for r in book['sheets'].get('Annex 3B DCT', []):
        v = r.get('v') or []
        if len(v) < 11 or r.get('strike_removed') or v[0] == 'DEL':
            continue
        try:
            if not rad.active(r):
                continue
        except (KeyError, TypeError, ValueError, AttributeError):
            continue
        if v[8].strip().upper() in ('YES', 'Y') and not v[9].strip() and v[10].strip().upper() in ('H24', '') and v[4] and v[5]:
            out.add(frozenset((v[4].strip().upper(), v[5].strip().upper())))
    return out


def _layer(leg):
    pid = str(leg.get('procedure_id') or '')
    if '.SID.' in pid:
        return 'SID'
    if '.STAR.' in pid:
        return 'STAR'
    if pid:
        return 'APP'
    if leg.get('kind') == 'FRA' or leg.get('fra_area'):
        return 'FRA'
    upper = leg.get('upper')
    return 'LOW' if isinstance(upper, (int, float)) and upper <= LOW_CEILING_FT else 'HIGH'


def annotate(result, rad):
    """Classe les tronçons de `result` (un résultat d'engine.assess) et pose `control` ; rend ce dictionnaire, ou None sans tronçon. Ne lève jamais : un résultat qu'on ne sait pas lire reste tel quel."""
    try:
        legs = result.get('legs') or []
        if not legs:
            return None
        pub = published_dct(rad)
        last = len(legs) - 1
        for i, l in enumerate(legs):
            a, b = str(l['start']['id']).upper(), str(l['end']['id']).upper()
            layer = _layer(l)
            if l.get('procedure_id'):
                control, why = 'controlled', 'procédure publiée'
            elif l.get('kind') == 'FRA' or l.get('fra_area'):
                control, why = 'incomplete', 'liaison FRA candidate : rôles et niveaux contrôlés, volumes et NPZ non lus'
            elif l.get('via') != 'DCT':
                control, why = ('controlled', 'segment d’airway publié') if not l.get('data_gap') else ('incomplete', str(l.get('data_gap'))[:160])
            elif frozenset((a, b)) in pub:
                control, why = 'controlled', 'DCT publié sans condition (RAD, annexe 3B DCT)'
            elif i == 0 or i == last:
                layer = 'SID' if i == 0 else 'STAR'
                control, why = 'fallback', ('SID' if i == 0 else 'STAR') + ' non lue : raccord DCT de simulation'
            else:
                control, why = 'fallback', 'DCT hors liste du RAD : non contrôlé'
            if l.get('compatible') is False or l.get('vertical_errors') or l.get('alerts') and control == 'controlled':
                control, why = 'error', (str((l.get('alerts') or l.get('vertical_errors') or ['erreur de contrôle'])[0])[:160])
            l['control'], l['layer'], l['control_reason'] = control, layer, why
        sections = []
        for i, l in enumerate(legs):
            nm = float(l.get('nm') or 0)
            if sections and sections[-1]['layer'] == l['layer'] and sections[-1]['control'] == l['control']:
                s = sections[-1]
                s['to'], s['nm'], s['legs'][1] = l['end']['id'], round(s['nm'] + nm, 1), i
            else:
                sections.append({'layer': l['layer'], 'control': l['control'], 'from': l['start']['id'], 'to': l['end']['id'], 'nm': round(nm, 1), 'legs': [i, i], 'reason': l['control_reason']})
        total = sum(float(l.get('nm') or 0) for l in legs) or 1.0
        pct = lambda c: round(100 * sum(float(l.get('nm') or 0) for l in legs if l['control'] == c) / total, 1)
        out = {'controlled_pct': pct('controlled'), 'incomplete_pct': pct('incomplete'), 'fallback_pct': pct('fallback'), 'error_pct': pct('error'), 'total_nm': round(total, 1), 'sections': sections[:200]}
        result['control'] = out
        return out
    except (KeyError, TypeError, ValueError, AttributeError, IndexError):
        return None
