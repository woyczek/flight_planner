import unittest
from unittest.mock import patch
import engine,server,recovery,fra_recovery

class Geography(unittest.TestCase):
    def test_paris_corridor_uses_great_circle(self):
        a=dict(lat=59.21972,lon=17.93417);b=dict(lat=37.175,lon=-5.61611)
        midpoint=recovery.interpolate(a,b,.5);t,off=fra_recovery.project(midpoint,a,b)
        self.assertAlmostEqual(t,.5,places=5);self.assertLess(off,.01)
        _,off=fra_recovery.project(dict(lat=48.82,lon=2.75),a,b)
        self.assertLess(off,80)
    def test_requested_region_cannot_be_satisfied_by_another_fra(self):
        nav=object.__new__(engine.Nav);nav.nodes={k:dict(id=k,lat=0,lon=i*.001) for i,k in enumerate('ABCD')}
        def e(distance,area):return dict(route='DCT',nm=distance,kind='FRA',fra_area=area,lower=30000,upper=66000)
        g=engine.RoutingGraph({'A':[('B',e(10,'OTHER')),('C',e(20,'TARGET'))],'B':[('D',e(10,'OTHER'))],'C':[('D',e(20,'TARGET'))]})
        g.required_fra_area='TARGET';path=nav.constrained_path(g,'A','D',require_fra=True)
        self.assertEqual([b for a,b,e in path],['C','D'])

class RealFraRecovery(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.nav,cls.rad=server.context({'date':'2026-11-09'})
        cls.q=server.planning.normalize(dict(dep='ESHL',arr='LEMO',route='ESHL LEMO',fl=330,date='2026-11-09T12:00',objective='fastest'),'E:/defa')
        cls.r=recovery.propose(cls.q,cls.nav,cls.rad)
    def test_upper_fra_paris_is_offered_with_actual_fl330(self):
        p=next(p for p in self.r['proposals'] if p['proposal_type']=='fra')
        self.assertTrue(p['proposal']);self.assertFalse([i for i in p['issues'] if i['level']=='ERREUR'])
        band=next(b for b in p['fra_stats']['bands'] if b['area']=='LFFRAN')
        self.assertGreater(band['distance_nm'],20);self.assertEqual(band['planned_min_ft'],33000);self.assertEqual(band['planned_max_ft'],33000)
        piece=next(x for x in self.r['pieces'] if x.get('fra_area')=='LFFRAN')
        self.assertEqual((piece['from_role'],piece['to_role']),('E','X'))
        self.assertEqual(self.q['route'],'ESHL LEMO')
    def test_proposed_bridges_never_enter_or_leave_private_fra_states(self):
        old=next(p for p in self.r['proposals'] if p['proposal_type']=='pieces')['recovery_pieces']
        samples=[self.nav.resolve(old[0]['start']['id']),*[self.nav.resolve(x['end']['id']) for x in old]]
        anchors=[self.nav.resolve('ESHL'),self.nav.resolve('LEMO')]
        with patch.object(self.nav,'constrained_path',wraps=self.nav.constrained_path) as wrapped:
            result=fra_recovery.build(self.q,self.nav,self.rad,anchors,samples,required_area='LFFRAN')
            self.assertIsNotNone(result);g=wrapped.call_args.args[0]
            bridges=[(u,v) for u,es in g.items() for v,e in es if e.get('kind')=='DCT_PROPOSAL']
            self.assertTrue(bridges);self.assertTrue(all('|' not in u and '|' not in v for u,v in bridges))
    def test_disabled_fra_remains_disabled(self):
        r=recovery.propose(dict(self.q,enable_fra=False),self.nav,self.rad)
        self.assertFalse(any(p['fra_stats']['segments'] for p in r['proposals']))
    def test_fl300_does_not_unlock_lffran_below_its_floor(self):
        anchors=[self.nav.resolve('ESHL'),self.nav.resolve('LEMO')]
        self.assertNotIn('LFFRAN',fra_recovery.upper_regions(dict(self.q,fl=300),self.nav,anchors))

if __name__=='__main__':unittest.main()
