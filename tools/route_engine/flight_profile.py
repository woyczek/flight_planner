"""Continuous simulation altitude profile with exact segment-boundary constraints."""
import bisect
import math

FREE=1e7   # ft/s : « libre » (SOG-0161)
ELEV_MIN_FT, ELEV_MAX_FT = -1500.0, 30000.0      # SOG-0354 L5 (4) : l'élévation d'un aérodrome est comprise entre -1 500 ft (la mer Morte est à -1 400 ft) et 30 000 ft ; hors de cette borne la demande est REFUSÉE et dit pourquoi


def elevation(icao, value):
    """L'élévation (ft, flottant) d'un aérodrome pour le modèle vertical : une valeur NÉGATIVE est une donnée normale (EHAM -10 ft) ; absente (None) : 0 ; non numérique, infinie ou hors de -1 500 à 30 000 ft : ValueError dite (l'aérodrome est refusé)."""
    if value is None:
        return 0.0
    try:
        v = float(value)
    except (TypeError, ValueError):
        v = float('nan')
    if not math.isfinite(v) or not ELEV_MIN_FT <= v <= ELEV_MAX_FT:
        raise ValueError(f'Élévation de {str(icao)[:8]} : {repr(value)[:24]} ft refusée (de {ELEV_MIN_FT:,.0f} à {ELEV_MAX_FT:,.0f} ft).'.replace(',', ' '))
    return v

MAX_CHANGES = 60                                   # SOG-0401 (4) : les changements de palier rendus (le total dit `changes_total`)
TERMINAL_KINDS = ('SID', 'STAR', 'APPROACH_LINK')  # les tronçons de procédure ne sont pas de la croisière


def fl_text(feet):
    """Une altitude en pieds, dite en niveau : 16500 → « FL165 »."""
    return f'FL{feet / 100:03.0f}'


def _nm_at(seconds, elapsed, positions):
    """La distance (NM) atteinte à l'instant `seconds` (interpolation sur les échantillons du profil)."""
    if seconds <= elapsed[0]:
        return positions[0]
    if seconds >= elapsed[-1]:
        return positions[-1]
    i = bisect.bisect_right(elapsed, seconds)
    t0, t1 = elapsed[i - 1], elapsed[i]
    return positions[i - 1] if t1 <= t0 else positions[i - 1] + (positions[i] - positions[i - 1]) * (seconds - t0) / (t1 - t0)


def _limit_leg(legs, first, last, down, to_ft, from_ft):
    """Le tronçon dont le plafond explique un changement de palier : en descente, le premier tronçon (à partir du dernier de la suite) dont le plafond vaut le palier atteint ; en remontée, le dernier tronçon (avant la suite) dont le plafond vaut le palier quitté."""
    order = range(last, len(legs)) if down else range(first - 1, -1, -1)
    target = to_ft if down else from_ft
    for m in order:
        upper = legs[m].get('upper')
        if isinstance(upper, (int, float)) and abs(upper - target) <= 1:
            return legs[m]
    return None


def changes_of(legs, ranges, altitudes, nominals, positions, window):
    """SOG-0401 (4) : les changements de palier que le profil IMPOSE en croisière, rendus au lieu d'être écrasés en silence. Un changement est un tronçon (de la partie de croisière, hors SID / STAR) dont l'altitude prévue change de plus d'un pied
    ET qui passe sous l'altitude naturelle du niveau demandé (le plafond d'une voie ramène le palier) ; les tronçons qui se suivent dans le même sens ne font qu'UN changement. { point, end_point, from_ft, to_ft, via, kind, reason, limit }.
    Un profil sans voie à plafond bas (la montée et la descente ordinaires, un raccord libre) ne change rien : []."""
    if not window:
        return []
    runs = []
    for n, (leg, (a, b)) in enumerate(zip(legs, ranges)):
        low, high = positions[a], positions[b]
        moved = altitudes[b] - altitudes[a]
        if (leg.get('kind') in TERMINAL_KINDS or high <= window[0] + .01 or low >= window[1] - .01 or abs(moved) <= 1
                or not any(altitudes[j] < nominals[j] - 1 for j in range(a, b + 1))):
            continue
        direction = moved < 0
        if runs and runs[-1]['last'] == n - 1 and runs[-1]['down'] == direction:
            runs[-1]['last'] = n
        else:
            runs.append(dict(first=n, last=n, down=direction))
    out = []
    for run in runs:
        first, last, down = run['first'], run['last'], run['down']
        from_ft, to_ft = round(altitudes[ranges[first][0]]), round(altitudes[ranges[last][1]])
        bound = _limit_leg(legs, first, last, down, to_ft, from_ft)
        limit = dict(via=bound['via'], **{'from': bound['start']['id'], 'to': bound['end']['id']}, ft=round(bound['upper'])) if bound else None
        if limit:
            where = f'{limit["via"]} {limit["from"]}–{limit["to"]}'
            reason = (f'Le plafond {fl_text(limit["ft"])} de {where} impose de descendre de {fl_text(from_ft)} à {fl_text(to_ft)}.' if down
                      else f'Après le plafond {fl_text(limit["ft"])} de {where} : retour de {fl_text(from_ft)} à {fl_text(to_ft)}.')
        else:
            reason = f'Le profil vertical change de palier : de {fl_text(from_ft)} à {fl_text(to_ft)}.'
        out.append(dict(point=legs[first]['start']['id'], end_point=legs[last]['end']['id'], from_ft=from_ft, to_ft=to_ft, via=' '.join(dict.fromkeys(l['via'] for l in legs[first:last + 1])),
                        kind=('ceiling' if down else 'release') if limit else 'profile', reason=reason, limit=limit))
    return out


def band_findings(legs, cruise_fl, window, levels=None):
    """SOG-0401 (4) : les tronçons de CROISIÈRE dont la bande [plancher, plafond] de la voie ne contient pas le niveau déposé. Le profil adapté les ramène au plafond sans rien dire (`vertical_errors` vide) : ici ils sont DITS.
    Un tronçon est de croisière s'il a une bande numérique, n'est ni une SID, ni une STAR, ni un raccord d'approche, n'a pas déjà un motif vertical et recouvre la partie de croisière du profil (`window`, en NM : de la fin de la montée au début de la descente) ; la suite de la même voie et de la même bande qui prolonge un tronçon dit (jusque dans la descente) l'est aussi.
    `levels` (SOG-0401, retouche j) : le niveau déposé à chaque tronçon quand la route porte des groupes de niveau « POINT/Fnnn » (centaines de pieds ; None : le niveau de la demande) ; sans lui, le niveau de la demande pour toute la route.
    Rend une liste de suites { legs, text, short } : une suite = des tronçons consécutifs d'une même voie, de même bande, même niveau, même zone, même cycle."""
    found = []
    for n, leg in enumerate(legs):
        override = bool(levels and levels[n])
        cruise = (levels[n] if override else cruise_fl) * 100
        low, high = leg.get('lower'), leg.get('upper')
        if not isinstance(low, (int, float)) or not isinstance(high, (int, float)) or leg.get('kind') in TERMINAL_KINDS or leg.get('data_gap') or leg.get('vertical_errors'):
            continue
        reached = leg.get('natural_max_ft')
        top = cruise if override or not isinstance(reached, (int, float)) else min(cruise, reached)      # SOG-0513 (A) : le niveau le plus haut que l'avion atteint SUR ce tronçon (profil naturel) : une voie dont le plafond est sous lui n'existe pas dans « F(plafond)..F999 » (l'IFPS : PROF195), qu'il monte, croise ou descende ; sous le plancher : seulement en croisière, comme avant
        above_ceiling = top > high + .5
        below_floor = cruise < low
        if not above_ceiling and not (below_floor and window):
            continue
        key = (leg['via'], low, high, leg.get('source_zone'), leg.get('source_cycle'), cruise)
        follows = bool(found) and found[-1]['key'] == key and found[-1]['index'][-1] == n - 1       # la suite de la même voie, de la même bande, après un tronçon dit : la descente ordinaire ne l'excuse pas (le palier est déjà ramené depuis le premier)
        if not above_ceiling and not follows and (not window or leg.get('distance_end_nm', 0) <= window[0] + .01 or leg.get('distance_start_nm', 0) >= window[1] - .01):
            continue      # sous le plancher : seulement les tronçons de croisière (ou la suite d'un tronçon dit) ; au-dessus du plafond : tout tronçon que l'avion y survole
        if follows:
            found[-1]['index'].append(n)
            found[-1]['top'] = max(found[-1]['top'], top)
        else:
            found.append(dict(key=key, index=[n], top=top))
    out = []
    for run in found:
        via, low, high, zone, cycle, cruise = run['key']
        members = [legs[n] for n in run['index']]
        chain = [members[0]['start']['id']] + [m['end']['id'] for m in members]
        if len(chain) > 8:
            chain = chain[:3] + ['…'] + chain[-2:]
        above = run['top'] > high + .5
        cruise = run['top'] if above else cruise      # le niveau le plus haut atteint sur la suite (le niveau déposé en croisière)
        gap = round(cruise - high if above else low - cruise)
        verdict = f'au-dessus du plafond {fl_text(high)}' if above else f'sous le plancher {fl_text(low)}'
        source = ', '.join(x for x in [f'cycle {cycle}' if cycle else '', f'zone {zone}' if zone else ''] if x)
        label = (f'Tronçon {via} {chain[0]}–{chain[-1]}' if len(members) == 1 else f'Tronçons {via} {"–".join(chain)}')
        out.append(dict(legs=members, text=f'{label} : niveau {fl_text(cruise)} hors de la bande {fl_text(low)}–{fl_text(high)} de la voie, {verdict}' + (f' ({source})' if source else ''),
                        short=f'Niveau {fl_text(cruise)} {verdict} de la voie (bande {fl_text(low)}–{fl_text(high)}, écart {gap} ft).'))
    return out


def build(legs,departure_ft,arrival_ft,cruise_fl,speed_kt=450,climb_fps=2000/60,descent_fps=2000/60,strategy='natural',free_departure=False,free_arrival=False):   # SOG-0161 : free_* : le raccord DCT d'un aérodrome sans SID (STAR) lue monte (descend) comme la procédure le ferait
    for name,value,low,high in [('Vitesse sol',speed_kt,30,1500),('Montée ft/s',climb_fps,.1,500),('Descente ft/s',descent_fps,.1,500)]:
        if not isinstance(value,(int,float)) or not math.isfinite(value) or not low<=value<=high:
            raise ValueError(f'{name} : valeur entre {low} et {high}.')
    if strategy not in ['natural','adapt']: raise ValueError('Stratégie verticale inconnue.')
    total=sum(l['nm'] for l in legs); cruise=cruise_fl*100
    ground=min(0,departure_ft,arrival_ft)      # le plancher « 0 » d'un tronçon est le SOL : sous le niveau de la mer pour EHAM (-10 ft), il suit l'aérodrome le plus bas (SOG-0354 L5 4) ; 0 pour tout autre vol
    speeds=[l.get('planned_speed_kt') or speed_kt for l in legs]
    if any(not 30<=v<=1500 for v in speeds):raise ValueError('Vitesse sol de segment : 30 à 1500 kt.')
    total_seconds=sum(l['nm']/v*3600 for l,v in zip(legs,speeds))
    up=climb_fps*3600/speed_kt; down=descent_fps*3600/speed_kt
    breakpoints=[(cruise-departure_ft)/climb_fps,total_seconds-(cruise-arrival_ft)/descent_fps,
                 (arrival_ft+descent_fps*total_seconds-departure_ft)/(climb_fps+descent_fps)]
    positions=[0.]; elapsed=[0.]; lowers=[departure_ft]; uppers=[departure_ft]; rates_up=[climb_fps];rates_down=[descent_fps];ranges=[]; cursor=0;time_cursor=0
    for leg,leg_speed in zip(legs,speeds):
        start=len(positions)-1; distance=leg['nm']; count=max(1,math.ceil(distance))
        low=leg.get('lower'); high=leg.get('upper')
        low=low if isinstance(low,(int,float)) else 0
        if low==0:low=ground
        high=high if isinstance(high,(int,float)) else cruise
        # Preserve the published boundary exactly: 19,500 ft may be the only
        # common altitude between two adjacent bands. Never round it to 19,000.
        cap=min(cruise,high)
        lowers[-1]=max(lowers[-1],low); uppers[-1]=min(uppers[-1],cap)
        constraint=leg.get('node_constraints') or {}
        if constraint.get('start_min') is not None:lowers[-1]=max(lowers[-1],constraint['start_min'])
        if constraint.get('start_max') is not None:uppers[-1]=min(uppers[-1],constraint['start_max'])
        duration=distance/leg_speed*3600
        extra=[cursor+(t-time_cursor)*leg_speed/3600 for t in breakpoints if time_cursor+1e-8<t<time_cursor+duration-1e-8]
        samples=sorted(set([cursor+distance*j/count for j in range(1,count+1)]+extra))
        for s in samples:
            positions.append(s); elapsed.append(time_cursor+(s-cursor)/leg_speed*3600); lowers.append(low); uppers.append(cap)
            rates_up.append(0 if leg.get('kind') in ['STAR','APPROACH_LINK'] else FREE if free_departure and leg is legs[0] else climb_fps)
            rates_down.append(0 if leg.get('kind')=='SID' else FREE if free_arrival and leg is legs[-1] else descent_fps)
        if constraint.get('end_min') is not None:lowers[-1]=max(lowers[-1],constraint['end_min'])
        if constraint.get('end_max') is not None:uppers[-1]=min(uppers[-1],constraint['end_max'])
        cursor+=distance;time_cursor+=duration;ranges.append((start,len(positions)-1))
    if not legs:
        return dict(strategy=strategy,points=[],holds=[],feasible=False,duration_min=0,max_altitude_ft=0,speed_kt=speed_kt,climb_fps=climb_fps,descent_fps=descent_fps,climb_fpm=climb_fps*60,descent_fpm=descent_fps*60)
    lowers[-1]=max(lowers[-1],arrival_ft); uppers[-1]=min(uppers[-1],arrival_ft)
    def nominal(t): return min(cruise,departure_ft+climb_fps*t,arrival_ft+descent_fps*(total_seconds-t))
    if strategy=='natural': altitudes=[nominal(t) for t in elapsed]
    else:
        altitudes=list(uppers)
        for i in range(1,len(positions)): altitudes[i]=min(altitudes[i],altitudes[i-1]+rates_up[i]*(elapsed[i]-elapsed[i-1]))
        for i in range(len(positions)-2,-1,-1): altitudes[i]=min(altitudes[i],altitudes[i+1]+rates_down[i+1]*(elapsed[i+1]-elapsed[i]))
    feasible=all(l-1e-5<=h<=u+1e-5 for l,h,u in zip(lowers,altitudes,uppers))
    toc=(cruise-departure_ft)/climb_fps; tod=total_seconds-(cruise-arrival_ft)/descent_fps      # SOG-0401 (4) : la partie de croisière (NM) du profil naturel, quand le niveau est atteint ; les changements de palier que le profil impose se lisent contre ce profil
    window=[_nm_at(toc,elapsed,positions),_nm_at(tod,elapsed,positions)] if toc<tod-1e-6 else None
    changes=changes_of(legs,ranges,altitudes,[nominal(t) for t in elapsed],positions,window)
    points=[dict(distance_nm=round(s,6),altitude_ft=round(h,4),time_min=round(t/60,8)) for s,h,t in zip(positions,altitudes,elapsed)]
    holds=[]; current=None
    for i in range(len(positions)-1):
        if abs(altitudes[i+1]-altitudes[i])<.1 and positions[i+1]-positions[i]>.001:
            level=round(altitudes[i],1)
            if current and abs(current['altitude_ft']-level)<.1: current['end_nm']=positions[i+1]
            else:
                current=dict(start_nm=positions[i],end_nm=positions[i+1],altitude_ft=level,fl=level/100); holds.append(current)
        else: current=None
    for n,(leg,(a,b)) in enumerate(zip(legs,ranges)):
        heights=altitudes[a:b+1]; min_h=min(heights); max_h=max(heights); reasons=[]
        natural=[nominal(t) for t in elapsed[a:b+1]]      # SOG-0513 (A) : le profil NATUREL du niveau déposé sur ce tronçon (montée, croisière, descente), quelle que soit la stratégie : c'est celui que l'IFPS juge ; `altitude_*` est celui de la stratégie (adapté aux plafonds)
        lower=leg.get('lower'); upper=leg.get('upper')
        if isinstance(lower,(int,float)) and lower==0:lower=ground
        if isinstance(lower,(int,float)) and min_h<lower-.1: reasons.append(f'Profil minimum {min_h:.0f} ft sous le plancher {lower:g} ft (écart {lower-min_h:.0f} ft).')
        if isinstance(upper,(int,float)) and max_h>upper+.1: reasons.append(f'Profil maximum {max_h:.0f} ft au-dessus du plafond {upper:g} ft (écart {max_h-upper:.0f} ft).')
        if leg.get('kind')=='SID' and any(v<u-.1 for u,v in zip(heights,heights[1:])):reasons.append('Le profil redescend sur une SID : incompatible avec la phase de départ choisie.')
        if leg.get('kind') in ['STAR','APPROACH_LINK'] and any(v>u+.1 for u,v in zip(heights,heights[1:])):reasons.append('Le profil remonte pendant la phase d’arrivée : profil à corriger.')
        constraint=leg.get('node_constraints') or {}
        for side,index,point in [('start',a,leg['start']['id']),('end',b,leg['end']['id'])]:
            low_c=constraint.get(side+'_min');high_c=constraint.get(side+'_max');h=altitudes[index]
            if low_c is not None and h<low_c-.1:reasons.append(f'{point} : altitude prévue {h:.0f} ft sous la contrainte procédure {low_c:g} ft minimum.')
            if high_c is not None and h>high_c+.1:reasons.append(f'{point} : altitude prévue {h:.0f} ft au-dessus de la contrainte procédure {high_c:g} ft maximum.')
        delta=altitudes[b]-altitudes[a]
        phase='montée' if delta>1 else 'descente' if delta<-1 else 'palier'
        if max_h-min_h>1 and abs(delta)<1: phase='montée / descente'
        leg.update(index=n,distance_start_nm=round(positions[a],3),distance_end_nm=round(positions[b],3),
            altitude_start_ft=round(altitudes[a],1),altitude_end_ft=round(altitudes[b],1),altitude_min_ft=round(min_h,1),altitude_max_ft=round(max_h,1),
            natural_start_ft=round(natural[0],1),natural_end_ft=round(natural[-1],1),natural_max_ft=round(max(natural),1),
            phase=phase,speed_kt=speeds[n],speed_limit=None,compatible=not reasons if leg.get('kind')!='APPROACH_LINK' and (leg['via']!='DCT' or leg.get('kind')=='FRA') else None,
            vertical_errors=reasons,alerts=list(reasons),source_cycle=leg.get('source_cycle'))
    if abs(altitudes[0]-departure_ft)>.1 or abs(altitudes[-1]-arrival_ft)>.1: feasible=False
    holds=[h for h in holds if h['end_nm']-h['start_nm']>.5 and abs(h['altitude_ft']/100-round(h['altitude_ft']/100))<.001]
    return dict(strategy=strategy,points=points,holds=holds,feasible=feasible,duration_min=round(total_seconds/60,2),max_altitude_ft=round(max(altitudes),1),
        speed_kt=speed_kt,climb_fps=climb_fps,descent_fps=descent_fps,climb_fpm=climb_fps*60,descent_fpm=descent_fps*60,departure_ft=departure_ft,arrival_ft=arrival_ft,
        cruise_nm=[round(window[0],3),round(window[1],3)] if window else None,changes=changes[:MAX_CHANGES],changes_total=len(changes),
        climb_nm=round(max(0,cruise-departure_ft)/up,2),descent_nm=round(max(0,cruise-arrival_ft)/down,2),
        note='Modèle de simulation en pieds / FL×100, GS en route et GS terminale réglables. Contraintes d’altitude SID/STAR aux points codés ; IAS, QNH, vent et performances avion non modélisés.')
