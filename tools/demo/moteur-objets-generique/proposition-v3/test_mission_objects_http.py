"""Exercise the actual launcher routes, without starting its update jobs or X-Plane."""
import json
import threading
import unittest
import urllib.error
import urllib.request

import launch
import mission_objects
from test_mission_objects import body, Clock


class HttpTests(unittest.TestCase):
    def setUp(self):
        self.old = mission_objects.RUNTIME
        clock = Clock()
        mission_objects.RUNTIME = mission_objects.Runtime(clock.mono, clock.wall)
        self.server = launch.Server(('127.0.0.1', 0), launch.Setup)
        launch.Setup.port = self.server.server_address[1]
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.url = f'http://127.0.0.1:{launch.Setup.port}/__setup/mission-objects/'
        self.body = body(clock)

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(2)
        mission_objects.RUNTIME = self.old

    def call(self, suffix, value=None, headers=None):
        req = urllib.request.Request(self.url + suffix, data=json.dumps(value).encode() if value is not None else None,
                                     headers={'X-DEFA-Setup': '1', 'Content-Type': 'application/json', **(headers or {})})
        try:
            with urllib.request.urlopen(req, timeout=3) as response:
                return response.status, response.read().decode(), dict(response.headers)
        except urllib.error.HTTPError as error:
            return error.code, error.read().decode(), dict(error.headers)

    def test_browser_to_launcher_to_shared_script_and_stop(self):
        status, text, _ = self.call('session', self.body)
        self.assertEqual(status, 200)
        self.assertTrue(json.loads(text)['active'])
        status, text, headers = self.call('agent')
        self.assertEqual(status, 200)
        self.assertTrue(text.startswith('DEFAOBJ\t1\t'))
        self.assertIn('\nO\tSHIP-1\tsailboat', text)
        self.assertEqual(int(headers['Content-Length']), len(text.encode()))
        self.assertEqual(self.call('session', {'pilot': 'ALF', 'flight': None})[0], 200)
        self.assertNotIn('\nO\t', self.call('agent')[1])

    def test_other_websites_and_malformed_declarations_are_refused(self):
        self.assertEqual(self.call('session', self.body, {'Sec-Fetch-Site': 'cross-site'})[0], 403)
        self.assertEqual(self.call('session', {'pilot': '../../bad'})[0], 400)
        self.assertNotIn('token', self.call('status')[1])


if __name__ == '__main__':
    unittest.main()
