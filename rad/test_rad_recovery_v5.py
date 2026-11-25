import datetime as dt,unittest,collections
import engine,server,rad_flight,recovery

class RuleContext(unittest.TestCase):
    def leg(self,a,b,via,kind):
        return dict(start={'id':a},end={'id':b},via=via,kind=kind,time_start_min=0,time_end_min=10,procedure_id=via if kind in ['SID','STAR'] else None)
    def rule(self,sheet='Annex 2B',condition='NOT AVBL FOR TFC VIA SIDFIX'):
        v=['']*17;v[3]='TEST001'
        if sheet=='Annex 2B':v[7]='MID';v[8]=condition;v[9]='H24'
        else:v[4]='AAAA';v[5]='OUT';v[7]=condition;v[8]='H24'
        return dict(sheet=sheet,row=10,id='TEST001',change='',values=v,assessment='À interpréter')
    def rad(self):
        r=object.__new__(engine.Rad);r.groups={};return r
    def test_sid_and_star_points_feed_whole_flight_conditions(self):
        legs=[self.leg('AAAA','SIDFIX','TEST1A','SID'),self.leg('SIDFIX','MID','A1','AIRWAY'),self.leg('MID','STARFIX','A2','AIRWAY'),self.leg('STARFIX','BBBB','TEST2B','STAR')]
        for point in ['SIDFIX','STARFIX']:
            r=rad_flight.evaluate(self.rad(),legs,'AAAA','BBBB',dt.datetime(2026,11,9),[self.rule(condition='NOT AVBL FOR TFC VIA '+point)],{'SIDFIX','STARFIX','MID'})
            self.assertEqual(len(r['findings']),1);self.assertEqual(r['segments'],4)
            self.assertIn('SID',r['phases']);self.assertIn('STAR',r['phases'])
    def test_sid_specific_condition_is_evaluated_with_final_arrival(self):
        legs=[self.leg('AAAA','OUT','OUT1A','SID'),self.leg('OUT','BBBB','A1','AIRWAY')]
        r=rad_flight.evaluate(self.rad(),legs,'AAAA','BBBB',dt.datetime(2026,11,9),[self.rule('Annex 3A DEP','ONLY AVBL FOR TFC ARR CCCC')])
        self.assertEqual(r['findings'][0]['segments'],[0]);self.assertEqual(r['search_exclusions'][0]['kind'],'procedure')
    def test_complex_language_is_not_misread_as_point_list(self):
        ctx=dict(dep='LFPO',arr='EIDW',all={'LUXTO'},known={'LUXTO','DUCNO','N92'})
        for text in ['Via EGTTFRAW Except via LUXTO N92 DUCNO','ARR (LONDON_GROUP, EGBT/HF) Below FL125','VIA UNKNOWN_AIRSPACE','VIA LUXTO N92 DUCNO']:
            self.assertIsNone(rad_flight.condition(text,ctx,self.rad()))
    def test_rule_activation_inside_segment_and_across_midnight(self):
        day=dt.datetime(2026,11,9)
        self.assertTrue(rad_flight.active_during('12:05-12:10',day.replace(hour=12),day.replace(hour=12,minute=20)))
        self.assertTrue(rad_flight.active_during('23:55-00:05',day.replace(hour=23,minute=50),day+dt.timedelta(days=1,minutes=10)))
        self.assertFalse(rad_flight.active_during('12:05-12:10',day.replace(hour=11),day.replace(hour=12)))
    def test_unknown_airspace_is_not_a_missing_compulsory_fix(self):
        rule=self.rule(condition='COMPULSORY FOR TFC DEP AAAA');rule['values'][7]='ZONE42'
        legs=[self.leg('AAAA','MID','A1','AIRWAY')]
        r=rad_flight.evaluate(self.rad(),legs,'AAAA','BBBB',dt.datetime(2026,11,9),[rule],{'AAAA','MID','BBBB'})
        self.assertFalse(r['findings']);self.assertEqual(r['review_conditions'],1)

class SearchScope(unittest.TestCase):
    def test_rad_point_is_removed_after_sid_is_added(self):
        n=object.__new__(engine.Nav);n.nodes={};n.ids=collections.defaultdict(list);n.edges=[];n.ads={};n.date=dt.date(2026,11,9)
        for ident,lon in [('AAAA',0),('BAD',.1),('GOOD',.2),('P1',.3),('P2',1.8),('BBBB',2)]:
            n.add(dict(id=ident,lat=0,lon=lon))
            if ident in ['AAAA','BBBB']:n.ads[ident]=dict(icao=ident,lat=0,lon=lon,elev=0)
        n.edges.append(dict(a=n.resolve('P1'),b=n.resolve('P2'),route='A1',nm=90,lower=0,upper=50000))
        class Procedures:
            def add_graph(self,g,ad,kind,*args):
                if kind!='SID':return 0
                for ident in ['BAD','GOOD']:
                    for a,b in [('AAAA',ident),(ident,'P1')]:g.setdefault(n.resolve(a),[]).append((n.resolve(b),dict(route=ident+'1A',kind='SID',nm=10,lower=0,upper=50000)))
                return 2
        n.procedures=Procedures()
        route,path=n.generate('AAAA','BBBB',180,30,[dict(kind='point',point='BAD')],terminal={'use_procedures':True})
        ids={n.nodes[k]['id'] for a,b,e in path for k in [a,b]};self.assertNotIn('BAD',ids);self.assertIn('GOOD',ids)

class RealRecovery(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.nav,cls.rad=server.context({'date':'2026-11-09'})
    def request(self,via=()):
        return server.planning.normalize(dict(dep='ESHL',arr='LEMO',via=list(via),route='ESHL '+' '.join(via)+' LEMO',fl=330,date='2026-11-09T12:00',objective='fastest'),'E:/defa')
    def test_eshl_lemo_direct_and_smaller_pieces_are_explicit_proposals(self):
        r=recovery.propose(self.request(),self.nav,self.rad)
        self.assertGreaterEqual(len(r['proposals']),2);self.assertTrue(any(p['status']=='base' for p in r['proposals'][1]['recovery_pieces']));self.assertGreater(r['candidate_pieces'],0)
        self.assertEqual(r['proposals'][0]['route'],'ESHL DCT LEMO')
        for p in r['proposals']:
            self.assertTrue(p['proposal']);self.assertIn('NON VALIDÉE',p['status']);self.assertTrue(p['rad_summary']['segments'])
        self.assertTrue(any(l['kind']=='DCT_PROPOSAL' for l in r['proposals'][1]['legs']))
        self.assertTrue(any(l['kind']=='AIRWAY' for l in r['proposals'][1]['legs']))
    def test_direct_keeps_imposed_point_airborne_and_input_intact(self):
        q=self.request(['LFBD']);entered=q['route'];r=recovery.propose(q,self.nav,self.rad);p=r['proposals'][0]
        self.assertEqual(q['route'],entered);self.assertEqual(p['route'],'ESHL DCT LFBD DCT LEMO')
        self.assertTrue(p['via_checks'][0]['passed'])
        self.assertGreater(next(l['altitude_end_ft'] for l in p['legs'] if l['end']['id']=='LFBD'),10000)
    def test_unknown_point_is_not_invented(self):
        r=recovery.propose(self.request(['ZZUNKNOWN']),self.nav,self.rad);self.assertFalse(r['proposals']);self.assertIn('sans position',r['note'])

if __name__=='__main__':unittest.main()
