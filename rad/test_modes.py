import unittest,copy,collections
import engine,planning,server

class GraphConstraints(unittest.TestCase):
    def nav(self):
        n=object.__new__(engine.Nav);n.nodes={k:dict(id=k,lat=0,lon=i) for i,k in enumerate('ABCD')};return n
    def test_fra_requirement_and_favourable_weight_are_distinct(self):
        n=self.nav();request={'objective':'fastest','speed_kt':100,'fra_preference':.5}
        def edge(nm,kind):
            e=dict(nm=nm,route='DCT' if kind=='FRA' else 'A1',kind=kind,lower=0,upper=30000);e['_cost']=planning.edge_cost(e,request);return e
        g={'A':[('B',edge(100,'AIRWAY')),('C',edge(60,'FRA'))],'C':[('B',edge(60,'FRA'))]}
        p=n.path(g,'A','B');self.assertEqual([b for a,b,e in p],['C','B'])
        for es in g.values():
            for v,e in es:e['_cost']=e['nm']/100
        self.assertEqual(len(n.path(g,'A','B')),1)
        forced=n.constrained_path(g,'A','B',require_fra=True);self.assertEqual(len(forced),2)

    def test_altitude_band_cannot_jump_at_a_mandatory_point(self):
        n=self.nav()
        def e(lo,hi,nm=1):return dict(nm=nm,route='A1',lower=lo,upper=hi)
        g={'A':[('B',e(0,10000)),('D',e(0,25000,2))],'D':[('B',e(15000,25000,2))],'B':[('C',e(15000,25000))]}
        p=n.constrained_path(g,'A','C',['B']);self.assertEqual([b for a,b,x in p],['D','B','C'])

class Scores(unittest.TestCase):
    def result(self,climb=True,fra=False,duration=10):
        return dict(ok=True,profile=dict(duration_min=duration,points=[dict(distance_nm=0,time_min=0,altitude_ft=0 if climb else 20000),dict(distance_nm=100,time_min=duration,altitude_ft=20000)]),
            legs=[dict(kind='FRA' if fra else 'AIRWAY',fra_area='TEST' if fra else None,nm=100,distance_end_nm=100)],distance_nm=100)
    def test_weight_does_not_change_reported_minutes_or_kilograms(self):
        q=dict(objective='economical',fra_preference=.25,_fuel_model={'rates':dict(climb=6000,cruise=2000,descent=1000)})
        r=planning.metrics(self.result(fra=True),q)
        self.assertEqual(r['estimate']['duration_min'],10);self.assertEqual(r['estimate']['fuel_kg'],1000)
        self.assertEqual(r['objective_raw_score'],1000);self.assertEqual(r['objective_score'],750)
    def test_time_and_fuel_can_produce_different_rankings(self):
        q=dict(_fuel_model={'rates':dict(climb=6000,cruise=2000,descent=1000)})
        a=planning.metrics(self.result(),dict(q,objective='fastest'));b=planning.metrics(self.result(False,duration=15),dict(q,objective='fastest'))
        self.assertLess(a['objective_score'],b['objective_score'])
        a=planning.metrics(self.result(),dict(q,objective='economical'));b=planning.metrics(self.result(False,duration=15),dict(q,objective='economical'))
        self.assertGreater(a['objective_score'],b['objective_score'])
    def test_economy_requires_a_model(self):
        with self.assertRaisesRegex(ValueError,'débits'):planning.normalize({'objective':'economical'},'E:/defa')
    def test_incompatible_constraints_are_explicit(self):
        with self.assertRaisesRegex(ValueError,'incompatibles'):planning.normalize({'require_fra':True,'unable_rnav':True},'E:/defa')

class RealData(unittest.TestCase):
    def test_favourable_fra_weight_keeps_non_fra_choices(self):
        q=dict(dep='LFPO',arr='EIDW',route='LFPO SITET KEPAD EIDW',fl=270,date='2026-11-09T12:00',radius=40,mode='calculate',use_procedures=True,objective='fastest',alternatives=True,fra_preference=.25)
        r=server.plan(q);pool=[r['primary'],*r['alternatives']]
        self.assertTrue(any(p.get('fra_stats',{}).get('segments',0)>0 for p in pool))
        self.assertTrue(any(p.get('fra_stats',{}).get('segments',0)==0 for p in pool if p.get('ok')))
        self.assertFalse(r['primary']['planning']['require_fra'])
        self.assertTrue(all(all(v['passed'] for v in p.get('via_checks',[])) for p in pool))
        self.assertEqual(r['input_route'],q['route'])
    def test_forced_fra_is_really_used_and_revalidated(self):
        q=dict(dep='LFPO',arr='EIDW',route='LFPO SITET KEPAD EIDW',fl=330,date='2026-11-09T12:00',radius=40,mode='calculate',use_procedures=True,require_fra=True,objective='fastest')
        r=server.plan(q);p=r['primary']
        self.assertTrue(p['ok']);self.assertFalse([i for i in p['issues'] if i['level']=='ERREUR'])
        self.assertGreater(p['fra_stats']['segments'],0);self.assertIn('BOREALIS FRA',p['fra_stats']['areas'])
        self.assertTrue(all(v['passed'] for v in p['via_checks']));self.assertEqual(r['input_route'],q['route'])
        self.assertTrue(all(l['fra_rows'] for l in p['legs'] if l['kind']=='FRA'))
    def test_vfr_is_separate_from_the_ifr_network(self):
        q=dict(dep='LFRS',arr='LFBD',route='LFRS LFBD',fl=180,date='2026-11-09T12:00',radius=40,mode='calculate',traffic='VFR',vfr_altitude_ft=5500,speed_kt=120,objective='fastest',unable_rnav=True)
        p=server.plan(q)['primary'];self.assertEqual(p['planning']['traffic'],'VFR');self.assertEqual(p['procedures_used'],[])
        self.assertEqual(p['fra_stats']['segments'],0);self.assertTrue(all(l['kind']=='VFR' for l in p['legs']))
        self.assertGreater(p['vfr_environment']['samples'],0);self.assertLessEqual(p['profile']['max_altitude_ft'],5500)
    def test_unable_rnav_does_not_accept_unknown_ifr_requirements(self):
        q=dict(dep='LFRS',arr='LFBD',route='LFRS LFBD',fl=180,date='2026-11-09T12:00',mode='calculate',unable_rnav=True)
        p=server.plan(q)['primary'];self.assertFalse(p['ok']);self.assertIn('aucun segment IFR conventionnel confirmé',p['error'])

if __name__=='__main__':unittest.main()
