"""Geometric VFR simulation candidates with sampled airspace and non-certified MORA checks."""
import bisect,collections,datetime as dt,json,math,re
from pathlib import Path
import flight_profile,planning

def vertical(value):
    s=str(value).upper().strip()
    if s in ['SFC','GND']:return 0
    if s in ['UNL','UNLIMITED']:return 100000
    m=re.fullmatch(r'FL\s*(\d+)',s)
    if m:return int(m[1])*100
    m=re.fullmatch(r'(\d+)\s*FT(?:\s+AMSL)?',s)
    return int(m[1]) if m else None

def inside(lat,lon,ring):
    yes=False;j=len(ring)-1
    for i,(y,x) in enumerate(ring):
        y2,x2=ring[j]
        if (y>lat)!=(y2>lat) and lon<(x2-x)*(lat-y)/(y2-y)+x:yes=not yes
        j=i
    return yes

class Environment:
    def __init__(self,nav):
        self.mora={};self.cells=collections.defaultdict(list);self.loaded=[]
        for zone,cycle in nav.cycles.items():
            base=nav.root/'data/sia/base'/zone/cycle
            def read(kind):
                p=base/(kind+'.json');return json.loads(p.read_text(encoding='utf-8-sig')).get('data',[]) if p.exists() else []
            for m in read('mora'):
                if isinstance(m.get('moraFt'),(int,float)):self.mora[(math.floor(m['lat']),math.floor(m['lon']))]=m['moraFt']
            for a in read('airspaces'):
                if a.get('type') not in ['P','R','D'] and a.get('cls') not in ['A','B','C','D']:continue
                for ring in a.get('rings',[]):
                    if len(ring)<3:continue
                    lats=[p[0] for p in ring];lons=[p[1] for p in ring];lo,hi=vertical(a.get('lower')),vertical(a.get('upper'))
                    area=dict(a,ring=ring,lo=lo,hi=hi,zone=zone)
                    if (max(lats)-min(lats))*(max(lons)-min(lons))>2000:continue
                    for x in range(math.floor(min(lats)),math.floor(max(lats))+1):
                        for y in range(math.floor(min(lons)),math.floor(max(lons))+1):self.cells[(x,y)].append(area)
            self.loaded.append(zone)

    def check(self,result,nav):
        points=result['profile']['points'];stations=[p['distance_nm'] for p in points];warnings={};unknown=0;samples=0
        def altitude(s):
            i=min(len(points)-1,max(1,bisect.bisect_left(stations,s)));a,b=points[i-1],points[i]
            t=(s-a['distance_nm'])/max(1e-8,b['distance_nm']-a['distance_nm']);return a['altitude_ft']+t*(b['altitude_ft']-a['altitude_ft'])
        for leg in result['legs']:
            hits=set();reviews=set();count=max(1,math.ceil(leg['nm']/2));mora_seen=[]
            for j in range(count+1):
                f=j/count;lat=leg['start']['lat']+(leg['end']['lat']-leg['start']['lat'])*f;lon=leg['start']['lon']+(leg['end']['lon']-leg['start']['lon'])*f
                s=leg['distance_start_nm']+leg['nm']*f;h=altitude(s);samples+=1;cell=(math.floor(lat),math.floor(lon));mora=self.mora.get(cell)
                if mora is not None:mora_seen.append(mora)
                near_ad=min(nav_distance(nav,dict(lat=lat,lon=lon),nav.ads[result['dep']]),nav_distance(nav,dict(lat=lat,lon=lon),nav.ads[result['arr']]))<10
                if mora is None:unknown+=1
                elif not near_ad and h<mora:hits.add(f'Sous la MORA de simulation de la cellule : {mora:g} ft (grille non certifiée, critère conservateur).')
                for a in self.cells.get(cell,[]):
                    if not inside(lat,lon,a['ring']):continue
                    name=a.get('key') or a.get('name') or a['type'];lo,hi=a['lo'],a['hi']
                    if lo is None or hi is None:
                        reviews.add(name+' : limites verticales non interprétées.');continue
                    if not lo<=h<=hi:continue
                    if a.get('type')=='P' or a.get('cls')=='A':hits.add(name+' : zone P / classe A traversée à l’altitude prévue.')
                    else:reviews.add(name+' : espace contrôlé ou R/D, clairance / activité non évaluée.')
            leg['alerts'].extend(sorted(hits));leg['compatible']=not hits;leg['mora_max_ft']=max(mora_seen) if mora_seen else None
            for message in hits:result['issues'].append(dict(level='ERREUR',text=leg['start']['id']+'–'+leg['end']['id']+' : '+message))
            for message in reviews:warnings[message]=True
        result['vfr_environment']=dict(samples=samples,unknown_mora_samples=unknown,airspace_reviews=list(warnings),note='Échantillonnage tous les 2 NM environ, polygones et altitudes interprétables uniquement ; pas de validation météo, VMC, clairance ou terrain certifié.')
        if warnings:result['issues'].append(dict(level='REVUE',text=f'{len(warnings)} espace(s) contrôlé(s) / R/D à examiner dans le détail VFR.'))
        if unknown:result['issues'].append(dict(level='REVUE',text=f'MORA absente pour {unknown} échantillon(s).'))
        result['status']='ERREURS DÉTECTÉES' if any(i['level']=='ERREUR' for i in result['issues']) else 'PRÉCONTRÔLE VFR GÉOMÉTRIQUE'

def nav_distance(nav,a,b):
    import engine
    return engine.nm(a,b)

def plan(request,nav):
    import engine
    dep=request['dep'].upper();arr=request['arr'].upper();via=engine.via_points(request)
    if dep not in nav.ads or arr not in nav.ads:raise ValueError('Aérodrome VFR absent de la base.')
    ids=[dep,*via,arr];keys=[nav.resolve(x) for x in ids]
    if request.get('unable_rnav'):
        allowed=set(nav.vrp_keys)|set(nav.navaid_keys)|{nav.resolve(dep),nav.resolve(arr)}
        missing=[nav.nodes[k]['id'] for k in keys if k not in allowed]
        if missing:raise ValueError('VFR unable RNAV : passages non identifiés comme repères visuels ou aides radio dans la base : '+', '.join(missing))
    altitude=float(request.get('vfr_altitude_ft',5500))
    if not 1000<=altitude<=18000:raise ValueError('Altitude VFR de simulation : 1 000 à 18 000 ft.')
    if not hasattr(nav,'_vfr_environment'):nav._vfr_environment=Environment(nav)
    candidates=[keys]
    # Diversify through nearby published VRP; never substitute an IFR airway or an FRA.
    if request.get('alternatives',False) or request.get('objective')=='economical':
        for index,(a,b) in enumerate(zip(keys,keys[1:])):
            direct=nav_distance(nav,nav.nodes[a],nav.nodes[b]);mid=dict(lat=(nav.nodes[a]['lat']+nav.nodes[b]['lat'])/2,lon=(nav.nodes[a]['lon']+nav.nodes[b]['lon'])/2)
            nearby=sorted((nav_distance(nav,mid,nav.nodes[k]),k) for k in getattr(nav,'vrp_keys',[]) if k not in keys)
            for _,k in nearby[:4]:
                if nav_distance(nav,nav.nodes[a],nav.nodes[k])+nav_distance(nav,nav.nodes[k],nav.nodes[b])<=direct*1.7+10:candidates.append(keys[:index+1]+[k]+keys[index+1:])
    def assess(path):
        legs=[]
        for a,b in zip(path,path[1:]):legs.append(dict(start=nav.nodes[a],end=nav.nodes[b],via='DCT',kind='VFR',nm=nav_distance(nav,nav.nodes[a],nav.nodes[b]),lower=None,upper=None,source_cycle=None,direction='tracé visuel de simulation',node_constraints=None,procedure_id=None,procedure_name=None,speed_limit_ias=None))
        p=flight_profile.build(legs,nav.ads[dep].get('elev') or 0,nav.ads[arr].get('elev') or 0,altitude/100,**engine.profile_options(request),strategy='natural')
        r=dict(ok=True,generated=True,dep=dep,arr=arr,route=' DCT '.join(nav.nodes[k]['id'] for k in path),fl=altitude/100,target_altitude_ft=altitude,date=request['date']+'Z' if not request['date'].endswith('Z') else request['date'],
            profile=p,legs=legs,distance_nm=round(sum(l['nm'] for l in legs),1),issues=[],via=via,via_checks=[dict(point=x,passed=True) for x in via],
            rad=[],rad_source=None,rad_atomic_rules=0,fra_source=None,procedures_used=[],procedure_coverage={},coverage=nav.coverage,
            checked=['Passages imposés et tracé géométrique VFR','Profil altitude / temps','Échantillonnage zones P / classe A et MORA de simulation'],
            gaps=[dict(name='Conditions VFR',reason='VMC, météo, visibilité, minima locaux, clairances et activités non calculés.'),dict(name='Relief et espaces',reason='Grille MORA non certifiée et échantillonnage 2 NM ; les franchissements étroits et limites AGL non interprétées peuvent manquer.')],
            limitation='Préparation VFR de simulation, pas une validation de faisabilité opérationnelle.')
        nav._vfr_environment.check(r,nav);planning.metrics(r,request);r['report']=engine.report(r);return r
    results=[assess(p) for p in candidates]
    good=[r for r in results if not any(i['level']=='ERREUR' for i in r['issues'])]
    if not good and len(candidates)==1 and not request.get('_vfr_retry'):
        return plan(dict(request,alternatives=True,_vfr_retry=True),nav)
    pool=good or results;pool.sort(key=lambda r:(sum(i['level']=='ERREUR' for i in r['issues']),r['objective_score']))
    primary=results[0] if request.get('mode')=='validate' else pool[0];alternatives=[r for r in good if r is not primary][:3]
    return dict(primary=primary,alternatives=alternatives,input_route=request.get('route',''),via=via,dep=dep,arr=arr,automatic_alternatives=any(i['level']=='ERREUR' for i in primary['issues']),alternative_attempts=[],alternative_failures=[],alternative_message=f'{len(alternatives)} variante(s) VFR ; ni FRA ni SID/STAR IFR ajoutées.')
