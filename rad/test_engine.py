"""Meaningful regression tests; run: python -m unittest test_engine -v"""
import datetime as dt
import unittest
from unittest.mock import patch
import engine
import server

BASE=dict(root='E:/defa',dep='LFRS',arr='LFML',fl=180,date='2026-11-09T12:00',mode='calculate',radius=40,enable_fra=False)

class Integration(unittest.TestCase):
    def run_case(self,**changes): return engine.assess(dict(BASE,**changes))

    def test_three_airport_pairs_and_roundtrip(self):
        for dep,arr in [('LFRS','LFML'),('LFBO','LFPG'),('LFBD','LFLL')]:
            with self.subTest(dep=dep,arr=arr):
                r=self.run_case(dep=dep,arr=arr)
                self.assertTrue(r['legs'])
                self.assertEqual(r['legs'][0]['start']['id'],dep)
                self.assertEqual(r['legs'][-1]['end']['id'],arr)
                self.assertFalse([i for i in r['issues'] if i['level']=='ERREUR'])
                # Every pair joins geographically, including expanded intermediate airway nodes.
                for a,b in zip(r['legs'],r['legs'][1:]): self.assertLess(engine.nm(a['end'],b['start']),0.01)
                direct=engine.nm(r['legs'][0]['start'],r['legs'][-1]['end'])
                self.assertGreaterEqual(r['distance_nm']+0.1,direct)
                self.assertLess(r['distance_nm'],direct*2)
                for leg in r['legs']:
                    if leg['via']!='DCT': self.assertTrue(leg['lower']<=18000<=leg['upper'])
                checked=self.run_case(dep=dep,arr=arr,mode='validate',route=r['route'])
                self.assertEqual(r['distance_nm'],checked['distance_nm'])
                self.assertNotEqual(checked['status'],'VALIDÉE')

    def test_unknown_point_exposes_error(self):
        r=self.run_case(mode='validate',route='LFRS DCT INCONNU DCT LFML')
        self.assertEqual(r['status'],'ERREURS DÉTECTÉES')
        self.assertTrue(any('INCONNU' in i['text'] for i in r['issues'] if i['level']=='ERREUR'))

    def test_vertical_failure(self):
        r=self.run_case(mode='validate',route='LUREN L615 BRY')
        self.assertTrue(any(l['vertical_errors'] and l['upper']==11500 for l in r['legs']))

    def test_airway_discontinuity(self):
        r=self.run_case(mode='validate',route='LFRS L615 LFML')
        self.assertTrue(any('Continuité absente' in i['text'] for i in r['issues']))

    def test_direct_never_full_validation(self):
        r=self.run_case(mode='validate',route='LFRS DCT LFML')
        self.assertEqual(r['status'],'CONTRÔLE PARTIEL — À VÉRIFIER')
        self.assertIsNone(r['legs'][0]['compatible'])
        self.assertTrue(r['gaps'])

    def test_rad_dates(self):
        self.assertEqual(engine.Rad(dt.date(2026,11,25)).book['start'],'2026-10-29')
        self.assertEqual(engine.Rad(dt.date(2026,11,26)).book['start'],'2026-11-26')
        self.assertIsNone(engine.Rad(dt.date(2026,12,24)).book)

    def test_out_of_rad_coverage(self):
        r=self.run_case(date='2026-12-24T12:00',mode='validate',route='LFRS DCT LFML')
        self.assertIsNone(r['rad_source'])
        self.assertTrue(any('Aucun RAD' in i['text'] for i in r['issues']))

    def test_utc_normalization(self):
        r=self.run_case(date='2026-11-26T00:30+02:00',mode='validate',route='LFRS DCT LFML')
        self.assertEqual(r['rad_source']['start'],'2026-10-29')

    def test_speed_level_disagreement(self):
        r=self.run_case(mode='validate',route='N0450F350 LFRS DCT LFML')
        self.assertTrue(any('préfixe annonce FL350' in i['text'] for i in r['issues']))

    def test_no_network_is_not_faked(self):
        with self.assertRaisesRegex(ValueError,'Aucune route|Aucun point'):
            self.run_case(dep='KJFK',arr='KLAX')

    def test_prohibition_at_point(self):
        r=self.run_case(mode='validate',route='LFRS DCT ORRAJ DCT LFML')
        self.assertTrue(any('LFLS1118' in i['text'] and i['level']=='ERREUR' for i in r['issues']))

    def test_rich_text_strike_removed(self):
        rad=engine.Rad(dt.date(2026,11,26))
        rows=[r for r in rad.book['sheets']['Annex 3B DCT'] if r['v'][3]=='LF50309']
        self.assertTrue(any(r['strike_removed'] for r in rows))
        self.assertEqual(rows[0]['v'][10],'22:30-05:00 (21:30-04:00) & \n11:00-16:00 AT PEPAX')

class GraphSafety(unittest.TestCase):
    def test_duplicate_id_is_not_silently_merged(self):
        n=object.__new__(engine.Nav); n.nodes={}; n.ids=engine.collections.defaultdict(list)
        n.add(dict(id='ABC',lat=45,lon=3)); n.add(dict(id='ABC',lat=49,lon=7))
        with self.assertRaisesRegex(ValueError,'ambigu'): n.resolve('ABC')

    def test_forbidden_point_reroutes(self):
        n=object.__new__(engine.Nav); n.nodes={}; n.ids=engine.collections.defaultdict(list); n.edges=[]; n.ads={}; n.date=engine.dt.date(2026,11,9)
        for ident,lat,lon in [('AAAA',0,0),('P1',0,.1),('BAD',0,1),('ALT',1,1),('P2',0,1.9),('BBBB',0,2)]:
            n.add(dict(id=ident,lat=lat,lon=lon))
            if len(ident)==4: n.ads[ident]=dict(icao=ident,lat=lat,lon=lon)
        for a,b in [('P1','BAD'),('BAD','P2'),('P1','ALT'),('ALT','P2')]:
            u,v=n.resolve(a),n.resolve(b)
            n.edges.append(dict(a=u,b=v,route='A1',nm=engine.nm(n.nodes[u],n.nodes[v]),lower=0,upper=50000))
        route,path=n.generate('AAAA','BBBB',180,10,[dict(kind='point',point='BAD')])
        ids={n.nodes[k]['id'] for a,b,e in path for k in [a,b]}
        self.assertNotIn('BAD',ids); self.assertIn('ALT',ids)

class Alternatives(unittest.TestCase):
    def test_rejected_route_gets_checked_distinct_options(self):
        r=server.plan(dict(BASE,dep='LFPO',mode='validate',fl=270,route='LFPO DCT DANBO A2 OKRIX DCT LFML'))
        self.assertTrue(r['automatic_alternatives'])
        self.assertTrue(any('plafond 19500' in x['text'] for x in r['primary']['issues']))
        self.assertGreaterEqual(len(r['alternatives']),1)
        self.assertLessEqual(len(r['alternatives']),3)
        self.assertEqual(len({(x['route'],x['fl'],x['profile']['strategy']) for x in r['alternatives']}),len(r['alternatives']))
        for a in r['alternatives']:
            self.assertFalse(any(i['level']=='ERREUR' for i in a['issues']))
            self.assertEqual(a['date'],'2026-11-09T12:00Z')
            self.assertEqual(a['via'],['DANBO','OKRIX'])
            self.assertTrue(all(v['passed'] for v in a['via_checks']))
            self.assertEqual(a['status'],'CONTRÔLE PARTIEL — À VÉRIFIER')

    def test_empty_coverage_does_not_invent_alternatives(self):
        r=server.plan(dict(BASE,dep='KJFK',arr='KLAX'))
        self.assertFalse(r['primary']['ok'])
        self.assertEqual(r['alternatives'],[])
        self.assertIn('repli',r['alternative_message'])
        self.assertTrue(all(p.get('proposal') and 'NON VALIDÉE' in p['status'] for p in r.get('recovery',{}).get('proposals',[])))

    def test_dct_keyword_does_not_match_every_rad_rule(self):
        r=engine.assess(dict(BASE,mode='validate',route='LFRS DCT LFML'))
        self.assertFalse(any(x['reason']=='Mention de DCT' for x in r['rad']))

if __name__=='__main__': unittest.main()
