import unittest,datetime as dt
import engine,server,flight_profile,fra

def leg(distance,lo=None,hi=None,via='DCT'):
    return dict(nm=distance,lower=lo,upper=hi,via=via,start={'id':'A'},end={'id':'B'})

class ProfileTests(unittest.TestCase):
    def test_corrected_two_thousand_feet_per_minute(self):
        p=flight_profile.build([leg(400)],0,0,270)
        self.assertAlmostEqual(p['climb_fpm'],2000)
        self.assertAlmostEqual(p['climb_nm'],101.25)
        for a,b in zip(p['points'],p['points'][1:]):
            self.assertLessEqual(abs(b['altitude_ft']-a['altitude_ft'])/(b['time_min']-a['time_min']),2001)

    def test_ceiling_and_lower_limit_alerts(self):
        legs=[leg(120),leg(80,6500,19500,'A2'),leg(120)]
        p=flight_profile.build(legs,0,0,270)
        self.assertFalse(p['feasible']);self.assertFalse(legs[1]['compatible'])
        self.assertIn('7500',legs[1]['alerts'][0]);self.assertEqual(legs[1]['speed_limit'],None)

    def test_adapted_profile_preserves_exact_shared_boundary(self):
        legs=[leg(100),leg(100,6500,19500,'A2'),leg(100,19500,50000,'U2'),leg(100)]
        p=flight_profile.build(legs,0,0,270,strategy='adapt')
        self.assertTrue(p['feasible']);self.assertEqual(legs[1]['altitude_end_ft'],19500)
        self.assertEqual(legs[2]['altitude_start_ft'],19500)
        self.assertTrue(any(h['fl']==195 for h in p['holds']))

    def test_exact_peak_is_checked_inside_segment(self):
        legs=[leg(1,0,13200,'A1')]
        p=flight_profile.build(legs,13100,13100,270)
        self.assertGreater(p['max_altitude_ft'],13200);self.assertFalse(p['feasible'])

    def test_arrival_profile_does_not_climb_after_a_low_constraint(self):
        legs=[leg(150),dict(leg(30,0,66000,'STAR1'),kind='STAR',planned_speed_kt=220,node_constraints={'end_max':4000}),dict(leg(25,0,66000,'STAR1'),kind='STAR',planned_speed_kt=220),dict(leg(15),kind='APPROACH_LINK',planned_speed_kt=220)]
        p=flight_profile.build(legs,0,0,270,strategy='adapt');self.assertTrue(p['feasible'])
        self.assertTrue(all(l['altitude_end_ft']<=l['altitude_start_ft']+.1 for l in legs[1:]))

class RouteConstraints(unittest.TestCase):
    def test_user_example_all_passages_and_original_input_preserved(self):
        text='LFPO SITET KEPAD EIDW'
        r=server.plan(dict(dep='LFRS',arr='LFML',route=text,fl=270,date='2026-11-09T12:00',radius=40,mode='calculate'))
        self.assertEqual(r['input_route'],text);self.assertEqual(r['via'],['SITET','KEPAD'])
        self.assertEqual(r['dep'],'LFPO');self.assertEqual(r['arr'],'EIDW')
        self.assertTrue(r['primary']['ok']);self.assertFalse([i for i in r['primary']['issues'] if i['level']=='ERREUR'])
        self.assertTrue(all(v['passed'] for v in r['primary']['via_checks']))
        self.assertLess(r['primary']['route'].index('SITET'),r['primary']['route'].index('KEPAD'))

    def test_forbidden_mandatory_point_is_never_removed(self):
        r=server.plan(dict(dep='LFRS',arr='LFML',route='LFRS ORRAJ LFML',fl=180,date='2026-11-09T12:00',radius=40,mode='calculate',enable_fra=False))
        self.assertEqual(r['via'],['ORRAJ']);self.assertEqual(r['alternatives'],[])

    def test_alternative_at_requested_level(self):
        r=server.plan(dict(dep='LFPO',arr='LFML',route='LFPO DCT DANBO A2 OKRIX DCT LFML',fl=270,date='2026-11-09T12:00',radius=40,mode='validate',enable_fra=False,alternative_levels='190',allow_levels=True))
        self.assertTrue(r['alternatives'])
        self.assertTrue(any(a['fl']==190 for a in r['alternatives']))

    def test_sid_star_are_selected_and_expanded_from_aerodb(self):
        r=server.plan(dict(dep='LFPO',arr='EIDW',route='LFPO SITET KEPAD EIDW',fl=270,date='2026-11-09T12:00',radius=40,mode='calculate',use_procedures=True))
        p=r['primary'];self.assertTrue(p['ok']);self.assertFalse([i for i in p['issues'] if i['level']=='ERREUR'])
        self.assertEqual(len(p['procedures_used']),2)
        self.assertTrue(any(l['kind']=='SID' for l in p['legs']))
        self.assertTrue(any(l['kind']=='STAR' for l in p['legs']))
        self.assertTrue(any(l['kind']=='APPROACH_LINK' for l in p['legs']))
        self.assertTrue(any(l['node_constraints'] for l in p['legs'] if l['procedure_id']))
        self.assertTrue(all(l['speed_kt']==220 for l in p['legs'] if l['procedure_id']))
        self.assertEqual(r['input_route'],'LFPO SITET KEPAD EIDW')

    def test_selected_runways_are_respected(self):
        r=server.plan(dict(dep='LFPO',arr='EIDW',route='LFPO SITET KEPAD EIDW',fl=270,date='2026-11-09T12:00',radius=40,mode='calculate',use_procedures=True,dep_runway='24',arr_runway='16'))
        self.assertTrue(r['primary']['ok']);self.assertEqual(len(r['primary']['procedures_used']),2)
        for p in r['primary'].get('procedures_used',[]):
            self.assertIn('24' if p['id'].startswith('LFPO') else '16',p['runways'])

class FraTests(unittest.TestCase):
    def test_fra_cycles_and_roles_are_loaded(self):
        nav=engine.Nav('E:/defa',dt.date(2026,11,9));f=nav.fra
        self.assertEqual(f.book['start'],'2026-10-29')
        sitet=[r for r in f.records if r['id']=='SITET']
        self.assertTrue(any(r['enroute']=='E' and r['lower']==30500 for r in sitet))
        self.assertFalse(f.eligible(sitet[0],270,dt.datetime(2026,11,9,12)))

    def test_time_windows_and_flos(self):
        self.assertTrue(fra.time_ok('20:00 - 02:00',dt.datetime(2026,11,9,23)))
        self.assertFalse(fra.time_ok('20:00 - 02:00',dt.datetime(2026,11,9,12)))
        self.assertFalse(fra.time_ok('22:00 (21:00)',dt.datetime(2026,11,9,23)))
        self.assertTrue(fra.parity('ODD/EVEN',270,'E'));self.assertFalse(fra.parity('ODD/EVEN',270,'X'))

    def test_fra_entry_direction_is_not_reversed(self):
        n=engine.Nav('E:/defa',dt.date(2026,11,9));f=n.fra;when=dt.datetime(2026,11,9,12)
        entries=[r for r in f.records if r['enroute']=='E' and f.eligible(r,330,when)]
        pair=None
        for a in entries:
            inside=next((b for b in f.records if b['area']==a['area'] and b['enroute']=='I' and f.eligible(b,330,when) and b['key']!=a['key']),None)
            if inside and f.match(a['key'],inside['key'],330,when,'LFPO','EIDW',set()):pair=(a,inside);break
        self.assertIsNotNone(pair);a,b=pair
        self.assertTrue(any(m['area']==a['area'] for m in f.match(a['key'],b['key'],330,when,'LFPO','EIDW',set())))
        self.assertFalse(any(m['area']==a['area'] for m in f.match(b['key'],a['key'],330,when,'LFPO','EIDW',set())))

if __name__=='__main__':unittest.main()
