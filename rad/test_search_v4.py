"""Regressions for altitude continuity, imposed AD overflight and upper FRA."""
import unittest
import engine,server

class SearchRegression(unittest.TestCase):
    def test_climb_detour_is_kept_and_waypoint_does_not_reset_altitude(self):
        nav=object.__new__(engine.Nav)
        nav.nodes={k:dict(id=k,lat=0,lon=i*.1) for i,k in enumerate(['DEP','CLIMB','VIA','HIGH','ARR'])}
        def edge(distance,lower=0,upper=33000):return dict(route='DCT',nm=distance,lower=lower,upper=upper)
        g=engine.RoutingGraph({'DEP':[('VIA',edge(1)),('CLIMB',edge(40))],
            'CLIMB':[('VIA',edge(40))],'VIA':[('HIGH',edge(20,10000))],
            'HIGH':[('ARR',edge(50))]})
        g.flight=dict(departure=0,arrival=0,ceiling=33000,speed_kt=450,climb_fps=2000/60,descent_fps=2000/60)
        p=nav.search(g,'DEP','ARR',['VIA'])
        self.assertIsNotNone(p)
        self.assertEqual([b for a,b,e in p],['CLIMB','VIA','HIGH','ARR'])

    def test_impossible_instant_altitude_jump_is_rejected(self):
        nav=object.__new__(engine.Nav)
        nav.nodes={k:dict(id=k,lat=0,lon=i) for i,k in enumerate(['A','B','C'])}
        g=engine.RoutingGraph({'A':[('B',dict(route='A1',nm=60,lower=0,upper=19500))],
            'B':[('C',dict(route='DCT',nm=60,lower=24500,upper=66000))]})
        self.assertIsNone(nav.search(g,'A','C',['B']))

    def test_lfll_lfbd_eidw_has_three_valid_alternatives_and_upper_fra(self):
        q=dict(dep='LFLL',arr='EIDW',route='LFLL LFBD EIDW',fl=330,date='2026-11-09T12:00',mode='calculate',use_procedures=True,alternatives=True,objective='fastest')
        r=server.plan(q)
        self.assertEqual(r['input_route'],q['route']);self.assertEqual(len(r['alternatives']),3)
        for candidate in [r['primary'],*r['alternatives']]:
            self.assertTrue(candidate['ok'])
            self.assertFalse([i for i in candidate['issues'] if i['level']=='ERREUR'])
            self.assertTrue(candidate['via_checks'][0]['passed'])
            crossings=[l['altitude_end_ft'] for l in candidate['legs'] if l['end']['id']=='LFBD']
            self.assertTrue(crossings);self.assertGreater(min(crossings),10000)
            self.assertTrue(all(p['airport']!='LFBD' for p in candidate['procedures_used']))
        bands=[b for c in [r['primary'],*r['alternatives']] for b in c['fra_stats']['bands']]
        self.assertTrue(any(b['area'].startswith('LFFRA') and b['planned_max_ft']>=33000 for b in bands))

    def test_imposed_ad_at_fl270_is_airborne(self):
        q=dict(dep='LFLL',arr='EIDW',route='LFLL LFBD EIDW',fl=270,date='2026-11-09T12:00',mode='calculate',use_procedures=True,objective='fastest')
        r=server.plan(q)['primary']
        self.assertTrue(r['ok']);self.assertFalse([i for i in r['issues'] if i['level']=='ERREUR'])
        self.assertTrue(any(l['end']['id']=='LFBD' and l['altitude_end_ft']>10000 for l in r['legs']))

if __name__=='__main__':unittest.main()
