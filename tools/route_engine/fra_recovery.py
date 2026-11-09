"""Find regional published FRA paths between explicitly unverified DCT bridges.
Only physical nodes receive proposed bridges. FRA I states cannot be entered or
left via these bridges: source E/X/A/D gateways remain mandatory.
"""
import collections,datetime as dt,math
from . import engine,planning   # SOG-0081 : imports relatifs

def project(p,a,b):
    # A planar longitude/latitude projection wrongly displaced the corridor by
    # >100 NM around Paris on a long Scandinavia–Spain flight.
    def bearing(x,y):
        la,lb=math.radians(x['lat']),math.radians(y['lat']);dl=math.radians(y['lon']-x['lon'])
        return math.atan2(math.sin(dl)*math.cos(lb),math.cos(la)*math.sin(lb)-math.sin(la)*math.cos(lb)*math.cos(dl))
    length=engine.nm(a,b)/3440.065
    if length<1e-10:return 0,engine.nm(a,p)
    delta=engine.nm(a,p)/3440.065;angle=bearing(a,p)-bearing(a,b)
    along=math.atan2(math.sin(delta)*math.cos(angle),math.cos(delta));t=along/length
    cross=abs(math.asin(max(-1,min(1,math.sin(delta)*math.sin(angle)))))*3440.065
    return t,cross if 0<=t<=1 else engine.nm(p,a if t<0 else b)

def build(request,nav,rad,anchors,samples,required_area=None):
    if not request.get('enable_fra',True) or request.get('unable_rnav') or not nav.fra.book:return None
    when=dt.datetime.fromisoformat(request['date'].replace('Z','+00:00'))
    if when.tzinfo:when=when.astimezone(dt.timezone.utc).replace(tzinfo=None)
    dep,arr=request['dep'],request['arr'];fl=int(request['fl']);via=engine.via_points(request)
    cache_key=engine.json.dumps([dep,arr,fl,via,when.isoformat(),samples,{k:request.get(k) for k in ['objective','fra_preference','speed_kt','climb_fpm','descent_fpm','_fuel_model']}],sort_keys=True)
    if not hasattr(nav,'_fra_recovery_graph_cache'):nav._fra_recovery_graph_cache={}
    if cache_key not in nav._fra_recovery_graph_cache:
        cached=next((graph for key,graph in nav._fra_graph_cache.items() if key[:5]==(dep,arr,fl,True,tuple(via)) and key[5]==when.isoformat(timespec='minutes')),None)
        if cached is None:
            cached=nav.fra.graph(nav.graph(None),dep,arr,fl,when,via,True)
            nav._fra_graph_cache[(dep,arr,fl,True,tuple(via),when.isoformat(timespec='minutes'),'normal')]=cached
            if len(nav._fra_graph_cache)>2:nav._fra_graph_cache.pop(next(iter(nav._fra_graph_cache)))
        source=cached
        # Limit the regional graph to a corridor around every imposed portion.
        def near(key,width=130):
            p=nav.nodes[key]
            return any(-.03<=t<=1.03 and distance<=width for a,b in zip(anchors,anchors[1:]) for t,distance in [project(p,nav.nodes[a],nav.nodes[b])])
        vertices={u for u in source if near(u)}|{v for es in source.values() for v,e in es if near(v)}
        g=engine.RoutingGraph({u:[(v,e) for v,e in es if v in vertices and isinstance(e.get('lower'),(int,float)) and isinstance(e.get('upper'),(int,float)) and e['lower']<=fl*100] for u,es in source.items() if u in vertices})
        # Source physical E/X gateways (and airway nodes) can receive proposed
        # bridges, but private |FRA| states and I-only physical points cannot.
        physical={k for k in vertices if '|' not in k}
        entry_areas=collections.defaultdict(set)
        for u,es in g.items():
            if '|' not in u:
                for v,e in es:
                    if e.get('kind')=='FRA_GATE' and '|FRA|' in v:entry_areas[u].add(e['fra_area'])
        physical.update(anchors);physical.update(samples)
        for k in physical:g.setdefault(k,[])
        def bridge(a,b):
            if a==b:return
            distance=engine.nm(nav.nodes[a],nav.nodes[b])
            if distance<.1:return
            g[a].append((b,dict(route='DCT',kind='DCT_PROPOSAL',nm=distance,lower=0,upper=fl*100)))
        for a,b in zip(anchors,anchors[1:]):
            distance=engine.nm(nav.nodes[a],nav.nodes[b]);layers=max(1,math.ceil(distance/120));buckets=collections.defaultdict(list)
            for key in physical:
                t,off=project(nav.nodes[key],nav.nodes[a],nav.nodes[b])
                if 0<t<1 and off<=100:buckets[min(layers-1,int(t*layers))].append((t,key))
            buckets[-1].append((0,a));buckets[layers].append((1,b))
            present=sorted(buckets)
            for i,bucket in enumerate(present[:-1]):
                targets=[item for next_bucket in present[i+1:i+3] for item in buckets[next_bucket]]
                for t,u in buckets[bucket]:
                    chosen=sorted(((engine.nm(nav.nodes[u],nav.nodes[v]),v) for t2,v in targets if t2>t),key=lambda item:item[0])[:7]
                    # Reserve links toward each nearby FRA entry, so dense airway
                    # nodes cannot crowd all FRA gateways out of the shortlist.
                    regional=collections.defaultdict(list)
                    for t2,v in targets:
                        if t2<=t:continue
                        for area in entry_areas.get(v,()):regional[area].append((engine.nm(nav.nodes[u],nav.nodes[v]),v))
                    for values in regional.values():chosen+=sorted(values)[:2]
                    for _,v in chosen:bridge(u,v)
            # Always retain a proposal along the explicit sample chain as a backbone.
            between=sorted((project(nav.nodes[k],nav.nodes[a],nav.nodes[b])[0],k) for k in samples if k not in [a,b] and 0<project(nav.nodes[k],nav.nodes[a],nav.nodes[b])[0]<1 and project(nav.nodes[k],nav.nodes[a],nav.nodes[b])[1]<100)
            chain=[a,*[k for t,k in between],b]
            for u,v in zip(chain,chain[1:]):bridge(u,v)
        blocks=rad.blocks(dep,arr,None);points={b['point'] for b in blocks if b['kind']=='point'}
        segments={(b['via'],b['start'],b['end']) for b in blocks if b['kind']=='segment' and b.get('lower_ft') is None}
        for u,es in list(g.items()):
            g[u]=[(v,dict(e,_cost=planning.edge_cost(e,request)*(4 if e.get('kind')=='DCT_PROPOSAL' else 1))) for v,e in es if nav.nodes[u]['id'] not in points and nav.nodes[v]['id'] not in points and (e['route'],nav.nodes[u]['id'],nav.nodes[v]['id']) not in segments]
        options=engine.profile_options(request)
        g.flight=dict(options,departure=nav.ads[dep].get('elev') or 0,arrival=nav.ads[arr].get('elev') or 0,ceiling=fl*100)
        nav._fra_recovery_graph_cache={cache_key:g}
    prepared=nav._fra_recovery_graph_cache[cache_key]
    g=engine.RoutingGraph(prepared);g.flight=prepared.flight;g.required_fra_area=required_area
    path=nav.constrained_path(g,anchors[0],anchors[-1],anchors[1:-1],require_fra=True)
    if not path:return None
    # Group actual consecutive FRA edges; zero-distance E/X gates are not
    # displayed as legs, but were indispensable to the search above.
    clean=[(u,v,e) for u,v,e in path if e.get('kind')!='FRA_GATE'];groups=[]
    for edge in clean:
        u,v,e=edge;status='fra' if e.get('kind')=='FRA' else 'candidate' if e.get('kind')=='DCT_PROPOSAL' else 'base'
        key=(status,e.get('fra_area'))
        if groups and key==groups[-1][0] and status!='candidate' and nav.nodes[u]['id'] not in via:groups[-1][1].append(edge)
        else:groups.append((key,[edge]))
    pieces=[];records={(r['area'],r['row']):r for r in nav.fra.records}
    for (status,area),edges in groups:
        first,last=edges[0],edges[-1];piece=dict(start=nav.nodes[first[0]],end=nav.nodes[last[1]],status=status,fra_area=area,
            route=nav.format_path(nav.nodes[first[0]]['id'],edges,via),distance_nm=round(sum(e['nm'] for u,v,e in edges),1))
        if status=='fra':
            start_record=records[(area,first[2]['fra_rows'][0])];end_record=records[(area,last[2]['fra_rows'][-1])]
            enter='E' if 'E' in start_record['enroute'] else 'D' if 'D' in start_record['terminal'] and nav.fra.airport_match(start_record['dep'],dep) else 'I'
            leave='X' if 'X' in end_record['enroute'] else 'A' if 'A' in end_record['terminal'] and nav.fra.airport_match(end_record['arr'],arr) else 'I'
            piece.update(from_role=enter,to_role=leave,lower=max(e['lower'] for u,v,e in edges),upper=min(e['upper'] for u,v,e in edges),
                note='Liaison FRA issue des points publiés : entrée '+enter+', sortie '+leave+'. Volumes, NPZ et conditions complexes restent hors validation.')
        else:piece['note']='Airways présentes en base.' if status=='base' else 'Raccord DCT géométrique proposé, hors validation.'
        pieces.append(piece)
    return path,pieces


def upper_regions(request,nav,anchors,exclude=()):
    """Dedicated upper FRA regions close to the imposed great-circle corridor."""
    from . import fra   # SOG-0081 : import relatif
    when=dt.datetime.fromisoformat(request['date'].replace('Z','+00:00'))
    if when.tzinfo:when=when.astimezone(dt.timezone.utc).replace(tzinfo=None)
    fl=int(request['fl']);groups=collections.defaultdict(lambda:{'E':[],'X':[]})
    for record in nav.fra.records:
        if record['area'] in exclude or record['lower'] is None or record['lower']<30000 or not nav.fra.eligible(record,fl,when):continue
        for index,(a,b) in enumerate(zip(anchors,anchors[1:])):
            t,off=project(nav.nodes[record['key']],nav.nodes[a],nav.nodes[b])
            if not 0<t<1 or off>80:continue
            for role in ['E','X']:
                if role in record['enroute'] and fra.parity(record['flos'],fl,role):groups[record['area']][role].append((index,t,off))
    result=[]
    for area,roles in groups.items():
        pairs=[((e[2]+x[2])/2,e[0],x[1]-e[1]) for e in roles['E'] for x in roles['X'] if e[0]==x[0] and x[1]-e[1]>.005]
        if pairs:result.append((min(pair[0] for pair in pairs),area))
    return [area for _,area in sorted(result)]
