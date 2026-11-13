"""Continuous simulation altitude profile with exact segment-boundary constraints."""
import math

FREE=1e7   # ft/s : « libre » (SOG-0161)


def build(legs,departure_ft,arrival_ft,cruise_fl,speed_kt=450,climb_fps=2000/60,descent_fps=2000/60,strategy='natural',free_departure=False,free_arrival=False):   # SOG-0161 : free_* : le raccord DCT d'un aérodrome sans SID (STAR) lue monte (descend) comme la procédure le ferait
    for name,value,low,high in [('Vitesse sol',speed_kt,30,1500),('Montée ft/s',climb_fps,.1,500),('Descente ft/s',descent_fps,.1,500)]:
        if not isinstance(value,(int,float)) or not math.isfinite(value) or not low<=value<=high:
            raise ValueError(f'{name} : valeur entre {low} et {high}.')
    if strategy not in ['natural','adapt']: raise ValueError('Stratégie verticale inconnue.')
    total=sum(l['nm'] for l in legs); cruise=cruise_fl*100
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
        lower=leg.get('lower'); upper=leg.get('upper')
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
            phase=phase,speed_kt=speeds[n],speed_limit=None,compatible=not reasons if leg.get('kind')!='APPROACH_LINK' and (leg['via']!='DCT' or leg.get('kind')=='FRA') else None,
            vertical_errors=reasons,alerts=list(reasons),source_cycle=leg.get('source_cycle'))
    if abs(altitudes[0]-departure_ft)>.1 or abs(altitudes[-1]-arrival_ft)>.1: feasible=False
    holds=[h for h in holds if h['end_nm']-h['start_nm']>.5 and abs(h['altitude_ft']/100-round(h['altitude_ft']/100))<.001]
    return dict(strategy=strategy,points=points,holds=holds,feasible=feasible,duration_min=round(total_seconds/60,2),max_altitude_ft=round(max(altitudes),1),
        speed_kt=speed_kt,climb_fps=climb_fps,descent_fps=descent_fps,climb_fpm=climb_fps*60,descent_fpm=descent_fps*60,departure_ft=departure_ft,arrival_ft=arrival_ft,
        climb_nm=round(max(0,cruise-departure_ft)/up,2),descent_nm=round(max(0,cruise-arrival_ft)/down,2),
        note='Modèle de simulation en pieds / FL×100, GS en route et GS terminale réglables. Contraintes d’altitude SID/STAR aux points codés ; IAS, QNH, vent et performances avion non modélisés.')
