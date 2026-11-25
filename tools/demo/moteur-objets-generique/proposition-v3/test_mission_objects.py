"""Standard-library tests of the generic, mission-independent runtime."""
import datetime
import unittest

from mission_objects import Runtime, compile_objects, pose, distance


class Clock:
    value = 0

    def mono(self):
        return self.value

    def wall(self):
        return 1795507200 + self.value


def body(clock, mission='N-001', oid='SHIP-1'):
    return {'pilot': 'ALF', 'flight': {'mission': mission, 'started_at': datetime.datetime.fromtimestamp(clock.wall(), datetime.timezone.utc).isoformat()},
            'objects': [{'id': oid, 'kind': 'ship', 'motion': 'axis', 'lat': 48.72, 'lon': -2.1, 'course_deg': 65, 'speed_kt': 8}], 'points': []}


class RuntimeTests(unittest.TestCase):
    def setUp(self):
        self.clock = Clock()
        self.runtime = Runtime(self.clock.mono, self.clock.wall)

    def test_any_mission_is_a_declaration_not_a_generated_script(self):
        for mid in ['N-001', 'M-023', 'S-012', 'OTHER-99']:
            self.runtime.publish(body(self.clock, mid))
            self.assertEqual(self.runtime.status()['mission'], mid)
            self.assertIn('O\tSHIP-1\tsailboat\tship', self.runtime.snapshot())

    def test_same_flight_renewal_preserves_trajectory_and_session(self):
        request = body(self.clock)
        first = self.runtime.publish(request)
        self.clock.value = 10
        self.assertEqual(self.runtime.publish(request)['session'], first['session'])
        o = self.runtime.session['objects'][0]
        self.assertAlmostEqual(distance(o, pose(o, 3600)), 8, places=7)

    def test_changed_object_replaces_state_and_increments_revision(self):
        request = body(self.clock)
        first = self.runtime.publish(request)
        request['objects'][0]['speed_kt'] = 12
        second = self.runtime.publish(request)
        self.assertEqual(second['session'], first['session'])
        self.assertEqual(second['revision'], first['revision'] + 1)

    def test_stop_and_lease_expiry_remove_everything(self):
        self.runtime.publish(body(self.clock))
        self.clock.value = 19
        self.assertFalse(self.runtime.status()['active'])
        self.assertNotIn('\nO\t', self.runtime.snapshot())
        self.runtime.publish(body(self.clock))
        self.runtime.publish({'pilot': 'ALF', 'flight': None})
        self.assertFalse(self.runtime.status()['active'])

    def test_new_flight_changes_identity_and_drops_old_events(self):
        first = self.runtime.publish(body(self.clock))
        self.clock.value = 1
        second = self.runtime.publish(body(self.clock, 'S-002', 'NEW-OBJ'))
        self.assertNotEqual(first['session'], second['session'])
        self.assertNotIn('SHIP-1', self.runtime.snapshot())

    def test_other_pilot_cannot_hijack_an_active_local_flight(self):
        self.runtime.publish(body(self.clock))
        other = body(self.clock)
        other['pilot'] = 'RBR'
        with self.assertRaisesRegex(ValueError, 'other_pilot'):
            self.runtime.publish(other)

    def test_bad_coordinates_and_duplicate_ids_are_atomic(self):
        for value in [float('nan'), float('inf'), True, 91, '48']:
            doc = body(self.clock)
            doc['objects'][0]['lat'] = value
            with self.assertRaises(ValueError):
                compile_objects(doc)
        doc = body(self.clock)
        doc['objects'] *= 2
        with self.assertRaisesRegex(ValueError, 'duplicate'):
            compile_objects(doc)

    def test_missing_kind_model_and_user_target_are_named_not_guessed(self):
        doc = body(self.clock)
        del doc['objects'][0]['kind']
        self.assertEqual(compile_objects(doc)[1][0]['code'], 'kind_required')
        doc['objects'][0]['kind'] = 'person'
        self.assertEqual(compile_objects(doc)[1][0]['code'], 'asset_required')
        doc['objects'][0]['control'] = 'user'
        self.assertEqual(compile_objects(doc)[1][0]['code'], 'network_target_not_duplicated')

    def test_mission_path_cannot_select_the_simulator_disk(self):
        doc = body(self.clock)
        doc['objects'][0]['visual'] = {'asset': '../../file.obj', 'path': 'C:/bad.obj'}
        self.assertEqual(compile_objects(doc)[1][0]['code'], 'asset_required')

    def test_route_repeats_points_and_interpolates_levels_and_speeds(self):
        doc = body(self.clock)
        doc['points'] = [{'id': 'A', 'lat': 48, 'lon': -2}, {'id': 'B', 'lat': 48.1, 'lon': -2}]
        doc['objects'][0] = {'id': 'AIR', 'kind': 'aircraft', 'motion': 'route', 'altitude_mode': 'msl', 'altitude_ft': 2000,
                             'route': {'repeat': 'loop', 'points': [{'point': 'A', 'speed_kt': 100, 'altitude_ft': 2000}, {'point': 'B', 'speed_kt': 120, 'altitude_ft': 3000}, {'point': 'A', 'speed_kt': 100, 'altitude_ft': 2000}]}}
        objects, _ = compile_objects(doc)
        o = objects[0]
        p = pose(o, o['legs'][0]['seconds'] / 2)
        self.assertEqual(p['speed'], 110)
        self.assertEqual(p['altitude'], 2500)
        self.assertAlmostEqual(pose(o, o['duration'])['lat'], 48)

    def test_agl_is_a_height_separate_from_msl_and_clearance(self):
        doc = body(self.clock)
        doc['objects'][0].update(kind='aircraft', altitude_mode='agl', height_agl_ft=800, constraints={'min_clearance_ft': 300})
        o = compile_objects(doc)[0][0]
        self.assertEqual(o['altitude'], 800)
        self.assertEqual(o['clearance_ft'], 300)
        doc['objects'][0]['altitude_ft'] = 1000
        with self.assertRaisesRegex(ValueError, 'mixed_altitude'):
            compile_objects(doc)

    def test_racetrack_returns_to_start_without_restarting_the_flight(self):
        doc = body(self.clock)
        doc['objects'][0].update(kind='aircraft', motion='racetrack', speed_kt=120, altitude_mode='msl', altitude_ft=4500,
                                  racetrack={'axis_deg': 65, 'leg_nm': 2, 'turn_radius_nm': 1, 'turn': 'right'})
        o = compile_objects(doc)[0][0]
        import math
        self.assertLess(distance(o, pose(o, (4 + 2 * math.pi) / 120 * 3600)), 1e-8)

    def test_event_authentication_distance_dedup_and_mission_identity(self):
        self.runtime.publish(body(self.clock))
        s = self.runtime.session
        event = {'session': s['id'], 'token': self.runtime.token, 'run': 'RUN-1', 'seq': 1, 'object': 'SHIP-1', 'type': 'object_found',
                 'pilot': {'lat': 48.72, 'lon': -2.1, 'altitude_ft': 50}, 'position': {'lat': 48.72, 'lon': -2.1, 'altitude_ft': 0}}
        self.assertTrue(self.runtime.report(event)['ok'])
        self.runtime.report(event)
        self.assertEqual(len(self.runtime.events), 1)
        self.assertNotIn('token', self.runtime.events[0])
        self.assertEqual(self.runtime.events[0]['mission'], 'N-001')
        event['pilot']['lon'] = 0
        event['seq'] = 2
        with self.assertRaisesRegex(ValueError, 'out_of_range'):
            self.runtime.report(event)
        event['token'] = 'wrong'
        with self.assertRaisesRegex(ValueError, 'session'):
            self.runtime.report(event)


if __name__ == '__main__':
    unittest.main()
