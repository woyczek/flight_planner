"""La forme de la réponse que l'écran de Carburant attend de `route/compute` (SOG-0081, demande de Features SOG du 10 nov. 2026) : le plan du moteur (plan.py) rangé en alternatives, segments et remarques.

Appel : `launcher.job('regen/job', { set: 'route', verb: 'compute', args })` avec `args.action` = `compute` (Calculer A → B) ou `check` (Contrôler), communs { adep, adest, fl, rwyDep?, rwyArr?, date? } (FL en centaines de pieds),
compute : `via: [identifiants]` (passages imposés, dans l'ordre), check : `route: '<texte saisi>'` tel quel. `to_request` traduit ces arguments en la demande fermée du moteur (plan.check_request).
Réponse : { ok, alternatives: [alt], segments: [seg], issues: [{ level: 'error' | 'review', text, kind? }], rad, fra, report } ;
  alt = { id, name, route, distanceNm, fl, profile: [{ nm, ft }], sid: { id, name, runway } | null, star: idem, faults, segments: [seg] } — jusqu'à 3 pour compute, une seule (la route saisie) pour check ;
  seg = { from, to, via, state: 'ok' | 'error', reasons: [{ kind: 'RAD' | 'FRA' | 'direction' | 'floor' | 'ceiling' | 'altitude' | 'continuity', text, ruleId?, deltaFt? }] } ;
  `segments` du niveau supérieur = ceux de la première alternative (la proposée, ou la route saisie). Le texte des motifs est celui du moteur ; le genre est reconnu d'après lui (rien n'est inventé : un motif inconnu est « altitude »).
"""
import re

ACTIONS = ('compute', 'check')
EXTRA = ('radius', 'speed_kt', 'terminal_speed_kt', 'climb_fpm', 'descent_fpm', 'allow_levels', 'use_procedures', 'enable_fra', 'level_strategy', 'alternative_levels', 'alternatives')
MAX_PROFILE = 200


def to_request(args):
    """Les arguments de l'écran → la demande du moteur ; ValueError si ce n'est pas la forme de l'écran."""
    known = {'action', 'adep', 'adest', 'fl', 'rwyDep', 'rwyArr', 'date', 'via', 'route', 'raw'} | set(EXTRA)
    if set(args) - known:
        raise ValueError('champ inconnu : ' + sorted(set(args) - known)[0])
    action = args.get('action')
    if action not in ACTIONS:
        raise ValueError('action : compute ou check')
    req = {'dep': args.get('adep', ''), 'arr': args.get('adest', ''), 'fl': args.get('fl'), 'use_procedures': True}
    for src, dst in (('rwyDep', 'dep_runway'), ('rwyArr', 'arr_runway'), ('date', 'date')):
        if args.get(src):
            req[dst] = args[src]
    for k in EXTRA:
        if k in args:
            req[k] = args[k]
    if action == 'compute':
        req.update(mode='calculate', via=args.get('via', []))
        if args.get('route'):
            raise ValueError('compute : via, pas route')
    else:
        if not isinstance(args.get('route'), str) or not args['route'].strip():
            raise ValueError('check : route')
        req.update(mode='validate', route=args['route'], alternatives=bool(args.get('alternatives', False)))
    return req


def reason_of(text):
    """Un motif d'un segment (texte du moteur) → { kind, text, ruleId?, deltaFt? }."""
    r = {'text': text}
    m = re.search(r'Interdiction RAD (\S+)', text)
    delta = re.search(r'écart (\d+(?:\.\d+)?) ft', text)
    if m:
        r.update(kind='RAD', ruleId=m.group(1))
    elif 'sous le plancher' in text:
        r['kind'] = 'floor'
    elif 'au-dessus du plafond' in text:
        r['kind'] = 'ceiling'
    elif re.search(r'FRA', text):
        r['kind'] = 'FRA'
    elif re.search(r'[Ss]ens interdit|contre-sens', text):
        r['kind'] = 'direction'
    elif re.search(r'[Cc]ontinuité', text):
        r['kind'] = 'continuity'
    else:
        r['kind'] = 'altitude'
    if delta:
        r['deltaFt'] = round(float(delta.group(1)))
    return r


def segment(leg):
    reasons = [reason_of(t) for t in dict.fromkeys(leg.get('alerts') or [])]
    return {'from': leg['start']['id'], 'to': leg['end']['id'], 'via': leg['via'], 'state': 'error' if reasons or leg.get('compatible') is False else 'ok', 'reasons': reasons}


def issue_kind(text):
    return reason_of(text)['kind'] if re.search(r'[Ss]ens interdit|[Cc]ontinuité|RAD|plancher|plafond|FRA', text) else None


def level_of(text):
    return 'error' if text == 'ERREUR' else 'review'


def procedure(plan_result, kind):
    for p in plan_result.get('procedures_used') or []:
        if f'.{kind}.' in str(p.get('id')):
            return {'id': p['id'], 'name': p.get('name') or '', 'runway': (p.get('runways') or [''])[0] or None}
    return None


def thin(points):
    pts = [{'nm': round(p['distance_nm'], 1), 'ft': round(p['altitude_ft'])} for p in points or []]
    if len(pts) <= MAX_PROFILE:
        return pts
    step = -(-len(pts) // MAX_PROFILE)
    return pts[::step] + ([pts[-1]] if pts[-1] != pts[::step][-1] else [])


def name_of(r, requested_fl):
    legs = r.get('legs') or []
    airways = [w for w in dict.fromkeys(l['via'] for l in legs if l['via'] not in ('DCT',) and l.get('kind') in ('AIRWAY', None))]
    base = 'Direct FRA' if any(l.get('kind') == 'FRA' for l in legs) and not airways else ('Via ' + ' · '.join(airways[:2])) if airways else 'Direct'
    return base + (f' · FL{r["fl"]}' if r.get('fl') != requested_fl else '')


def alternative(i, r, requested_fl):
    segs = [segment(l) for l in r.get('legs') or []]
    errors = [x for x in r.get('issues') or [] if x['level'] == 'ERREUR']
    return {'id': f'alt{i}', 'name': name_of(r, requested_fl), 'route': r.get('route', ''), 'distanceNm': r.get('distance_nm'), 'fl': r.get('fl'), 'profile': thin((r.get('profile') or {}).get('points')),
            'sid': procedure(r, 'SID'), 'star': procedure(r, 'STAR'), 'faults': max(sum(1 for s in segs if s['state'] == 'error'), len(errors)), 'segments': segs}


def to_view(plan_result, request, include_raw=False):
    """Le plan du moteur → la réponse de l'écran. `request` : la demande du moteur (le FL demandé)."""
    p = plan_result['primary']
    fl = request.get('fl')
    if not p.get('ok'):
        issues = [{'level': 'error', 'text': p.get('error') or p.get('status') or 'Calcul impossible'}]
        alts = []
    else:
        issues = [dict({'level': level_of(x['level']), 'text': x['text']}, **({'kind': issue_kind(x['text'])} if issue_kind(x['text']) else {})) for x in p.get('issues') or []]
        alts = [alternative(1, p, fl)]
    if request.get('mode') == 'calculate':
        accepted = bool(p.get('ok')) and not any(x['level'] == 'ERREUR' for x in p.get('issues') or [])
        alts = ([alternative(1, p, fl)] if accepted else []) + [alternative(i, a, fl) for i, a in enumerate(plan_result.get('alternatives') or [], 2 if accepted else 1)]
        alts = alts[:3]
    for x in plan_result.get('alternative_failures') or []:
        if not alts:
            issues.append({'level': 'review', 'text': x})
    return {'ok': True, 'alternatives': alts, 'segments': alts[0]['segments'] if alts else [], 'issues': issues[:300], 'rad': {'title': (p.get('rad_source') or {}).get('title'), 'start': (p.get('rad_source') or {}).get('start')} if p.get('rad_source') else None,
            'fra': {'start': (p.get('fra_source') or {}).get('start')} if p.get('fra_source') else None, 'report': p.get('report', ''), 'message': plan_result.get('alternative_message', ''), 'gaps': p.get('gaps') or [], 'limitation': p.get('limitation', ''),
            **({'plan': plan_result} if include_raw else {})}
