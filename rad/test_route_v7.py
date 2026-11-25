import datetime as dt,json,tempfile,unittest
from pathlib import Path
import engine,nav_data,server

ROUTE='ESSB DCT NOSLI N850 MOKNI DCT ADVOP Z703 ALS N872 PAM L980 IDRID M40 NILON L610 GILDA L620 SAM N63 LELNA DCT DEGEX DCT GATMO DCT DELOG N864 MONTO N857 HIJ DCT LEMO'
POINTS=['NOSLI','MOKNI','ADVOP','ALS','PAM','IDRID','NILON','GILDA','SAM','LELNA','DEGEX','GATMO','DELOG','MONTO','HIJ']

class Snapshots(unittest.TestCase):
    def zone(self,root,current,legacy,declared='2026-10-01'):
        folder=Path(root)/'nl';(folder/'2026-10-29').mkdir(parents=True)
        (folder/'2026-10-29/airways.json').write_text(json.dumps({'cycle':'2026-10-29','data':current}),encoding='utf-8')
        (folder/'2026-10-01.json').write_text(json.dumps({'cycle':declared,'aero':{'airways':legacy}}),encoding='utf-8')
        return nav_data.Zone(folder,dt.date(2026,11,9))
    def test_empty_new_dataset_uses_actual_older_cycle(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as root:
            z=self.zone(root,[],[{'route':'L980'}]);self.assertEqual(z.dataset('airways'),[{'route':'L980'}]);self.assertEqual(z.cycles['airways'],'2026-10-01')
    def test_nonempty_new_cycle_does_not_revive_old_routes(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as root:
            z=self.zone(root,[{'route':'NEW'}],[{'route':'WITHDRAWN'}]);self.assertEqual(z.dataset('airways'),[{'route':'NEW'}])
    def test_same_cycle_formats_can_supplement_one_another(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as root:
            z=self.zone(root,[{'route':'FIRST'}],[{'route':'SECOND'}],declared='2026-10-29')
            # The declared AIRAC must agree with the snapshot date before merging.
            p=z.flat[0];p.rename(p.with_name('2026-10-29.json'));z=nav_data.Zone(z.folder,dt.date(2026,11,9))
            self.assertEqual({r['route'] for r in z.dataset('airways')},{'FIRST','SECOND'})

class Geography(unittest.TestCase):
    def test_close_geographical_interpretations_stay_ambiguous(self):
        n=object.__new__(engine.Nav);n.nodes={'S':{'id':'S','lat':0,'lon':0},'E':{'id':'E','lat':0,'lon':2},'BN':{'id':'B','lat':1,'lon':1},'BS':{'id':'B','lat':-1,'lon':1}};n.ids={'B':['BN','BS']}
        with self.assertRaisesRegex(ValueError,'ambigu'):n.resolve_sequence(['B'],'S','E')
    def test_waypoint_name_does_not_accept_the_other_side_of_the_world(self):
        n=object.__new__(engine.Nav);n.nodes={k:dict(id='VIA' if k.startswith('V') else k,lat=0,lon=lon) for k,lon in [('S',0),('VN',.1),('VF',100),('E',.2)]}
        def edge(distance,cost):return dict(route='A1',nm=distance,_cost=cost,lower=0,upper=66000)
        g={'S':[('VF',edge(6000,.1)),('VN',edge(10,10))],'VF':[('E',edge(6000,.1))],'VN':[('E',edge(10,10))]}
        p=n.constrained_path(g,'S','E',['VN']);self.assertEqual([b for a,b,e in p],['VN','E'])

class RealRoute(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.nav,cls.rad=server.context({'date':'2026-11-09'})
    def test_loader_finds_idrid_and_european_airways(self):
        self.assertTrue(self.nav.ids['IDRID'])
        for zone in ['nl','de','es']:self.assertTrue(next(c for c in self.nav.coverage if c['zone']==zone)['segments'])
        self.assertTrue(all(e['source_cycle']=='2026-10-01' for e in self.nav.edges if e['zone']=='nl'))
    def test_complete_route_extracts_fifteen_points_and_resolves_homonyms(self):
        known={e['route'] for e in self.nav.edges}
        words=[w for w in ROUTE.split() if not engine.route_connector(w,self.nav,known)]
        self.assertEqual(words[1:-1],POINTS);self.assertEqual(len(engine.via_points({'via':POINTS})),15)
        positions=self.nav.resolve_sequence(words)
        for ident in ['ALS','PAM','SAM']:
            point=self.nav.nodes[positions[words.index(ident)]];self.assertGreater(point['lat'],50);self.assertGreater(point['lon'],-3);self.assertLess(point['lon'],11)
    def test_controls_distinguish_missing_publication_and_fl180_error(self):
        for fl in [180,280,350]:
            q=server.planning.normalize(dict(dep='ESSB',arr='LEMO',route=ROUTE,via=POINTS,fl=fl,date='2026-11-09T12:00',mode='validate',use_procedures=True),'E:/defa')
            r=engine.assess(q,self.nav,self.rad)
            self.assertEqual(r['route'],ROUTE);self.assertEqual(len(r['data_gaps']),4)
            self.assertTrue(all(v['passed'] for v in r['via_checks']))
            errors=[i['text'] for i in r['issues'] if i['level']=='ERREUR']
            if fl==180:self.assertTrue(any('GILDA' in t and '24500' in t for t in errors))
            else:self.assertFalse(errors)
            self.assertTrue(all(l['compatible'] is None for l in r['legs'] if l.get('data_gap')))
    def test_three_levels_get_recovery_without_losing_any_imposed_point(self):
        for fl in [180,280,350]:
            r=server.plan(dict(dep='ESSB',arr='LEMO',route=ROUTE,fl=fl,date='2026-11-09T12:00',mode='validate',use_procedures=True,objective='fastest'))
            self.assertEqual(r['input_route'],ROUTE);self.assertEqual(r['via'],POINTS)
            proposals=r['recovery']['proposals'];self.assertGreaterEqual(len(proposals),2)
            self.assertTrue(all(all(v['passed'] for v in p['via_checks']) for p in proposals))
            if fl>=280:
                fra=next(p for p in proposals if p['fra_stats']['segments']>0)
                self.assertFalse([i for i in fra['issues'] if i['level']=='ERREUR'])
            self.assertFalse(self.nav._fra_graph_cache);self.assertFalse(self.nav._routing_cache);self.assertFalse(getattr(self.nav,'_fra_recovery_graph_cache',{}))
    def test_calculate_button_also_keeps_the_full_route_points(self):
        r=server.plan(dict(dep='ESSB',arr='LEMO',route=ROUTE,fl=350,date='2026-11-09T12:00',mode='calculate',alternatives=True,use_procedures=True,objective='fastest'))
        self.assertEqual(r['input_route'],ROUTE);self.assertEqual(r['via'],POINTS)
        self.assertTrue(r['recovery']['proposals'])
        self.assertTrue(any(p['fra_stats']['segments']>0 for p in r['recovery']['proposals']))
        self.assertTrue(all(all(v['passed'] for v in p['via_checks']) for p in r['recovery']['proposals']))

if __name__=='__main__':unittest.main()
