"""Explicit simulation objectives and aircraft/fuel assumptions; no invented performance curves."""
import json,math,re,xml.etree.ElementTree as ET
from pathlib import Path

def aircraft(root):
    for p in [Path(root)/'data/AircraftDB/aircraft_perf.js',Path(root)/'AircraftDB/aircraft_perf.js']:
        if p.exists():
            text=p.read_text(encoding='utf-8-sig');start=text.index('{');end=text.rfind('}')+1
            data=json.loads(text[start:end]);out=[]
            for code,entry in data.items():
                if code.startswith('_'):continue
                sim=entry.get('simbrief',{});flow=sim.get('fuelflowKgh')
                out.append(dict(code=code,name=sim.get('name') or entry.get('airframedb',{}).get('name') or code,
                    fuel_kgh=flow,ceiling_fl=entry.get('cruise',{}).get('ceilingFL') or (sim.get('ceilingFt') or 0)/100 or None,
                    source='AircraftDB / SimBrief' if flow else 'AircraftDB : débit absent',fetched=sim.get('fetched')))
            return sorted(out,key=lambda r:r['code'])
    return []

def normalize(request,root):
    r=dict(request);r.setdefault('objective','distance');r.setdefault('traffic','IFR');r['traffic']=r['traffic'].upper()
    if r['objective'] not in ['distance','fastest','economical']:raise ValueError('Objectif inconnu.')
    if r['traffic'] not in ['IFR','VFR']:raise ValueError('Mode de vol inconnu.')
    if r.get('require_fra') and r['traffic']=='VFR':raise ValueError('FRA imposé et VFR sont incompatibles dans ce moteur.')
    if r.get('require_fra') and r.get('unable_rnav'):raise ValueError('FRA imposé et unable RNAV sont incompatibles : le moteur ne traite pas de dérogation aux spécifications PBN du FRA.')
    if r.get('require_fra'):r['enable_fra']=True
    if r.get('unable_rnav'):r['enable_fra']=False
    preference=float(r.get('fra_preference',DEFAULT_FRA_PREFERENCE))
    if not math.isfinite(preference) or not -.3<=preference<=.5:raise ValueError('Préférence FRA : pondération entre −30 % (le réseau d’airways est préféré) et 50 %.')     # SOG-0161 : négative = une préférence pour les airways
    r['fra_preference']=preference if r['traffic']=='IFR' and r.get('enable_fra',True) and not r.get('unable_rnav') else 0
    models=aircraft(root);model=next((m for m in models if m['code']==r.get('aircraft')),None)
    source=(model or {}).get('source','Débits de simulation saisis')
    flow=(model or {}).get('fuel_kgh');fuel={}
    for phase in ['climb','cruise','descent']:
        value=r.get('fuel_'+phase)
        if value in [None,'']:value=flow
        if value is not None:
            value=float(value)
            if not math.isfinite(value) or not 0<value<=50000:raise ValueError('Débit carburant : valeur positive en kg/h requise.')
        fuel[phase]=value
    if r['objective']=='economical' and any(v is None for v in fuel.values()):
        raise ValueError('Plus économe : sélectionner un avion avec débit renseigné ou saisir les trois débits montée/croisière/descente en kg/h.')
    if model and model.get('ceiling_fl') and float(r.get('fl',0))>model['ceiling_fl'] and r['traffic']=='IFR':
        raise ValueError(f'FL demandé au-dessus du plafond du modèle {model["code"]} : FL{model["ceiling_fl"]:g}.')
    r['_fuel_model']=dict(rates=fuel,aircraft=r.get('aircraft') or None,source=source,
        note='Modèle à débits constants par phase, sans réserve ni taxi, sans masse, vent ou polaire de consommation. Des débits identiques donnent le même classement que la durée.')
    return r

# SOG-0161 : la préférence FRA par défaut était +10 % (un lien FRA coûtait 90 % de sa longueur) : le moteur préférait le direct FRA aux airways publiées ET l'heuristique de A* (distance × le coût minimal par NM, 0,9)
# se relâchait de 10 % : sur LFPG → LEMD les états à altitudes non dominées explosaient (« Budget de recherche atteint », 32 s). Par défaut −10 % : les airways publiées sont préférées (un détour d'airway
# de moins de 10 % l'emporte sur un direct FRA) et l'heuristique est serrée (coût minimal par NM = 1). Une préférence positive reste permise (le budget peut alors s'épuiser sur un long trajet).
DEFAULT_FRA_PREFERENCE=-.10

def edge_cost(edge,request):
    speed=edge.get('planned_speed_kt') or float(request.get('speed_kt',450))
    factor=1-float(request.get('fra_preference',0)) if edge.get('kind')=='FRA' else 1
    if request.get('objective','distance')=='distance':return edge['nm']*factor
    hours=edge['nm']/speed
    if request.get('objective')=='fastest':return hours*factor
    rates=request.get('_fuel_model',{}).get('rates',{})
    phase='climb' if edge.get('kind')=='SID' else 'descent' if edge.get('kind') in ['STAR','APPROACH_LINK'] else 'cruise'
    return hours*(rates.get(phase) or 1)*factor

def metrics(result,request):
    if not result.get('ok'):return result
    p=result['profile'];rates=request.get('_fuel_model',{}).get('rates',{})
    fuel=0;fra_fuel=0;fra_minutes=0;phase_minutes=dict(climb=0.,cruise=0.,descent=0.);leg_index=0
    for a,b in zip(p['points'],p['points'][1:]):
        midpoint=(a['distance_nm']+b['distance_nm'])/2
        while leg_index<len(result['legs'])-1 and midpoint>result['legs'][leg_index]['distance_end_nm']+1e-6:leg_index+=1
        minutes=b['time_min']-a['time_min'];delta=b['altitude_ft']-a['altitude_ft']
        phase='climb' if delta>.01 else 'descent' if delta<-.01 else 'cruise';phase_minutes[phase]+=minutes
        fuel+=minutes/60*(rates.get(phase) or 0)
        if result['legs'][leg_index].get('kind')=='FRA':fra_fuel+=minutes/60*(rates.get(phase) or 0);fra_minutes+=minutes
    known=all(rates.get(x) is not None for x in phase_minutes)
    fra_legs=[l for l in result['legs'] if l.get('kind')=='FRA']
    result['fra_stats']=dict(segments=len(fra_legs),distance_nm=round(sum(l['nm'] for l in fra_legs),1),areas=sorted({l['fra_area'] for l in fra_legs}))
    bands=[]
    for area in result['fra_stats']['areas']:
        ls=[l for l in fra_legs if l['fra_area']==area]
        if any(l.get(k) is None for l in ls for k in ['altitude_min_ft','altitude_max_ft','lower','upper']):continue
        bands.append(dict(area=area,distance_nm=round(sum(l['nm'] for l in ls),1),
            planned_min_ft=round(min(l['altitude_min_ft'] for l in ls)),planned_max_ft=round(max(l['altitude_max_ft'] for l in ls)),
            lower_ft=min(l['lower'] for l in ls),upper_ft=max(l['upper'] for l in ls)))
    result['fra_stats']['bands']=bands
    result['planning']=dict(objective=request.get('objective','distance'),traffic=request.get('traffic','IFR'),require_fra=bool(request.get('require_fra')),unable_rnav=bool(request.get('unable_rnav')),fra_preference=request.get('fra_preference',0))
    result['estimate']=dict(duration_min=p['duration_min'],fuel_kg=round(fuel,1) if known else None,phase_minutes={k:round(v,2) for k,v in phase_minutes.items()},fuel_model=request.get('_fuel_model'))
    objective=request.get('objective','distance')
    raw=fuel if objective=='economical' and known else p['duration_min'] if objective=='fastest' else result['distance_nm']
    fra_cost=fra_fuel if objective=='economical' and known else fra_minutes if objective=='fastest' else result['fra_stats']['distance_nm']
    result['objective_raw_score']=raw;result['objective_score']=raw-float(request.get('fra_preference',0))*fra_cost
    result['estimate']['weighted_score']=round(result['objective_score'],3)
    return result

def rnav_metadata(nav):
    if hasattr(nav,'_rnav_metadata'):return nav._rnav_metadata
    result={}
    cycle=nav.cycles.get('fr');source=nav.data_dir/'sia'/('AIXM4.5_all_FR_OM_'+str(cycle)+'.xml')   # SOG-0081 : data_dir
    if source.exists():
        for event,element in ET.iterparse(source,events=['end']):
            if element.tag!='Rsg':continue
            uid=element.find('RsgUid');route=uid.findtext('RteUid/txtDesig') if uid is not None else None
            ends=[c.findtext('codeId') for c in (uid if uid is not None else []) if c.tag.endswith('UidSta') or c.tag.endswith('UidEnd')]
            typ=element.findtext('codeType')
            if route and len(ends)==2:result[(route,*ends)]=dict(required=True if typ=='RNAV' else False if typ in ['CONV','CONVENTIONAL'] else None,type=typ,rnp=element.findtext('codeRnp'),source=source.name)
            element.clear()
    nav._rnav_metadata=result;return result

def rnav_edge(nav,a,b,e):
    key=(e['route'],nav.nodes[a]['id'],nav.nodes[b]['id']);reverse=(key[0],key[2],key[1]);table=rnav_metadata(nav)
    return table.get(key) or table.get(reverse) or dict(required=None,type='inconnu',source='Exigence absente de la base importée')

def procedure_rnav(p):
    source=str(p.get('source',{}).get('ref','')).upper();typ=str(p.get('type','')).upper()
    if any(x in typ+' '+source for x in ['RNAV','RNP']) or any(point.get('rnp') is not None for point in p.get('points',[])):return True
    if typ in ['CONVENTIONAL','CONVENTIONNEL']:return False
    return None
