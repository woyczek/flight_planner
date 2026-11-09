"""Explicit, nonvalidated recovery proposals, never replacements for source input."""
import math,time
from . import engine,fra_recovery   # SOG-0081 : imports relatifs

def terminal_gaps(request,nav):
    """Proof of a terminal connectivity gap, independent of alternative FLs."""
    radius=float(request.get('radius',40));gaps=[]
    airway_nodes={k for e in nav.edges for k in [e['a'],e['b']]}
    for ad,kind in [(request['dep'],'SID'),(request['arr'],'STAR')]:
        if ad not in nav.ads:continue
        if request.get('use_procedures') and nav.procedures.options(ad,kind,request.get('dep_runway' if kind=='SID' else 'arr_runway','')):continue
        airport=nav.ads[ad]
        if any(engine.nm(airport,nav.nodes[k])<=radius for k in airway_nodes):continue
        role='E' if kind=='SID' else 'X';terminal='D' if kind=='SID' else 'A';column='dep' if kind=='SID' else 'arr'
        gateways=[r for r in nav.fra.records if role in r['enroute'] or terminal in r['terminal'] and nav.fra.airport_match(r[column],ad)] if request.get('enable_fra',True) else []
        distance=min((engine.nm(airport,nav.nodes[r['key']]) for r in gateways),default=None)
        if distance is None or distance>radius:
            gaps.append(f'{ad} : aucune airway ni porte FRA {role}/{terminal} raccordable dans le rayon {radius:g} NM, et aucune {kind} complète disponible pour la sélection. '+(f'Porte FRA candidate la plus proche : {distance:.1f} NM.' if distance is not None else 'Aucune porte FRA applicable trouvée.'))
        else:
            speed=float(request.get('speed_kt',450));rate=float(request.get('climb_fpm' if kind=='SID' else 'descent_fpm',2000))
            nearby=[(r,engine.nm(airport,nav.nodes[r['key']])) for r in gateways if engine.nm(airport,nav.nodes[r['key']])<=radius]
            if nearby and all(isinstance(r['lower'],(int,float)) and r['lower']>(airport.get('elev') or 0)+d/speed*60*rate+.1 for r,d in nearby):
                floor=min(r['lower'] for r,d in nearby)
                gaps.append(f'{ad} : portes FRA proches au plancher minimal FL{floor/100:g}, non atteignable par les raccords directs disponibles à {rate:g} ft/min et {speed:g} kt sol. Aucune {kind} complète ne fournit le temps de montée/descente supplémentaire dans les données chargées. Les replis restent proposés séparément.')
    return gaps

def interpolate(a,b,f):
    def xyz(p):
        lat,lon=math.radians(p['lat']),math.radians(p['lon']);return math.cos(lat)*math.cos(lon),math.cos(lat)*math.sin(lon),math.sin(lat)
    x,y=xyz(a),xyz(b);angle=math.acos(max(-1,min(1,sum(i*j for i,j in zip(x,y)))))
    if angle<1e-8:return dict(lat=a['lat'],lon=a['lon'])
    den=math.sin(angle)
    if abs(den)<1e-8:return dict(lat=a['lat']*(1-f)+b['lat']*f,lon=a['lon']*(1-f)+b['lon']*f)
    v=[(math.sin((1-f)*angle)*i+math.sin(f*angle)*j)/den for i,j in zip(x,y)]
    return dict(lat=math.degrees(math.atan2(v[2],math.hypot(v[0],v[1]))),lon=math.degrees(math.atan2(v[1],v[0])))

def propose(request,nav,rad):
    begun=time.perf_counter();dep,arr=request['dep'],request['arr'];fl=int(request['fl'])
    mandatory=engine.via_points(request)
    try:anchors=nav.resolve_sequence([dep,*mandatory,arr])
    except ValueError as e:return dict(proposals=[],pieces=[],note='Repli impossible sans position non ambiguë : '+str(e))
    if dep not in nav.ads or arr not in nav.ads:return dict(proposals=[],pieces=[],note='Les coordonnées des AD doivent exister dans la base.')
    if any(a==b for a,b in zip(anchors,anchors[1:])):return dict(proposals=[],pieces=[],note='Deux passages successifs ont la même position ; préciser la demande.')
    def direct(a,b):return (a,b,dict(route='DCT',kind='DCT_PROPOSAL',nm=engine.nm(nav.nodes[a],nav.nodes[b])))
    def assess(path,title,kind,pieces):
        route=nav.format_path(dep,path,mandatory)
        r=engine.assess(dict(request,mode='validate',route=route,level_strategy='adapt',use_procedures=False),nav,rad,_path=path)
        r.update(proposal=True,proposal_type=kind,proposal_name=title,generated=True,recovery_pieces=pieces,
            proposal_note='Proposition géométrique de simulation. Les DCT proposés ne sont ni des liaisons publiées, ni une autorisation FRA/RAD. Les airways et les points/rôles FRA proviennent des bases ; les volumes FRA, NPZ et conditions complexes ne sont pas validés.')
        r['issues'].insert(0,dict(level='REVUE',text=r['proposal_note']))
        r['status']='PROPOSITION DE REPLI — NON VALIDÉE';r['report']=engine.report(r)
        return r
    proposals=[];notes=[]
    try:proposals.append(assess([direct(a,b) for a,b in zip(anchors,anchors[1:])],'Direct proposé — passages imposés conservés','direct',[]))
    except ValueError as e:notes.append('Direct : '+str(e))
    blocks=rad.blocks(dep,arr,None);g=nav.graph(None)
    for u,edges in list(g.items()):
        g[u]=[(v,e) for v,e in edges if isinstance(e.get('lower'),(int,float)) and e['lower']<=fl*100 and
            not any(engine.block_hit(block,nav.nodes[u]['id'],nav.nodes[v]['id'],e['route']) for block in blocks)]
    connected={u for u,es in g.items() if es}|{v for es in g.values() for v,e in es}
    fra_points={r['key'] for r in getattr(nav.fra,'records',[])}
    pool=[k for k in set(nav.nodes) if '|' not in k and nav.nodes[k]['id'] not in nav.ads and len(nav.ids.get(nav.nodes[k]['id'],[]))==1]
    expanded=[anchors[0]]
    for a,b in zip(anchors,anchors[1:]):
        distance=engine.nm(nav.nodes[a],nav.nodes[b]);count=min(14,max(1,math.ceil(distance/160)))
        for j in range(1,count):
            aim=interpolate(nav.nodes[a],nav.nodes[b],j/count)
            nearby=[(engine.nm(aim,nav.nodes[k]),k) for k in pool if abs(nav.nodes[k]['lat']-aim['lat'])<1.2 and abs(nav.nodes[k]['lon']-aim['lon'])*math.cos(math.radians(aim['lat']))<1.8]
            nearby=[(d,k) for d,k in nearby if d<=60 and engine.nm(nav.nodes[a],nav.nodes[k])>10 and engine.nm(nav.nodes[b],nav.nodes[k])>10]
            if not nearby:continue
            # Prefer useful network anchors, then published FRA points, then other fixes.
            _,key=min(nearby,key=lambda item:(item[0]+(0 if item[1] in connected else 15 if item[1] in fra_points else 25)))
            if key!=expanded[-1] and key not in expanded:expanded.append(key)
        expanded.append(b)
    assembled=[];pieces=[]
    for a,b in zip(expanded,expanded[1:]):
        path=None;distance=engine.nm(nav.nodes[a],nav.nodes[b])
        if a in connected and b in connected and distance<=400 and time.perf_counter()-begun<5:
            try:path=nav.path(g,a,b)
            except ValueError:pass
            if path and sum(e['nm'] for u,v,e in path)>max(1,distance)*1.6:path=None
        if path:
            assembled.extend(path);status='base';route=nav.format_path(nav.nodes[a]['id'],path)
        else:
            assembled.append(direct(a,b));status='candidate';route=f"{nav.nodes[a]['id']} DCT {nav.nodes[b]['id']}"
        pieces.append(dict(start=nav.nodes[a],end=nav.nodes[b],status=status,route=route,
            distance_nm=round(sum(e['nm'] for u,v,e in path),1) if path else round(distance,1),
            note='Airways présentes en base ; voir les contrôles du profil et du RAD.' if path else 'Points publiés proches de l’axe ; raccord DCT proposé, calcul/autorisation à vérifier.'))
    if assembled and len(pieces)>len(anchors)-1:
        try:proposals.append(assess(assembled,'Repli par tronçons — portions de base et raccords proposés','pieces',pieces))
        except ValueError as e:notes.append('Tronçons : '+str(e))
    piece_proposal_type='pieces';regional=None
    try:
        if len(anchors)>8:
            fra_recovery.build(request,nav,rad,anchors,expanded,prepare_only=True)
            regional=fra_recovery.windowed(request,nav,rad,anchors,assembled)
        else:regional=fra_recovery.build(request,nav,rad,anchors,expanded)
    except ValueError as e:notes.append('Recherche FRA globale : '+str(e))
    if not regional:
        try:regional=fra_recovery.windowed(request,nav,rad,anchors,assembled)
        except ValueError as e:notes.append('Recherche FRA par portions : '+str(e))
    if regional:
        title='Repli FRA — portions régionales et raccords proposés'
        existing={e.get('fra_area') for u,v,e in regional[0] if e.get('kind')=='FRA'}
        if len(anchors)<=8:
            for area in fra_recovery.upper_regions(request,nav,anchors,existing)[:1]:
                try:
                    targeted=fra_recovery.build(request,nav,rad,anchors,expanded,required_area=area)
                    if targeted:regional=targeted;title='Repli FRA supérieur · '+area+' — raccords proposés'
                except ValueError as e:notes.append('Variante FRA '+area+' : '+str(e))
        try:
            fra_path,fra_pieces=regional
            proposal=assess(fra_path,title,'fra',fra_pieces)
            proposals.append(proposal);pieces=fra_pieces;piece_proposal_type='fra'
        except ValueError as e:notes.append('Contrôle du repli FRA : '+str(e))
    return dict(proposals=proposals,pieces=pieces,piece_proposal_type=piece_proposal_type,fra_pieces=sum(p['status']=='fra' for p in pieces),base_pieces=sum(p['status']=='base' for p in pieces),candidate_pieces=sum(p['status']=='candidate' for p in pieces),
        note='Les passages imposés sont conservés dans l’ordre. Le repli AWY suit des jalons proches de l’axe ; le repli FRA recherche aussi des portes d’entrée/sortie publiées dans un corridor géodésique régional. Les raccords DCT restent proposés. '+ ' '.join(notes))
