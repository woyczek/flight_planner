"""Contrats de données, péremption et conservation lors d'un refresh incomplet."""
import copy
import json
import tempfile
import unittest
from datetime import date
from pathlib import Path
from pypdf import PdfWriter
from vfr_core import apply_interpretation, current_airac, extract_document
from refresh_vfr import run

ROOT = Path(__file__).parent

class ContractTests(unittest.TestCase):
    def test_airac_is_calculation_cycle_not_source_cycle(self):
        self.assertEqual(current_airac(date(2026, 10, 23))["id"], "2610")
        self.assertEqual(current_airac(date(2025, 5, 15))["id"], "2505")

    def test_alphanumeric_point_before_or_after_coordinates(self):
        text = 'Points de compte rendu\nE1 45°39’03’’N - 000°15’09’’W Carrefour\nTour 48°53’55”N - 002°33’26”EE2\n'
        ad = extract_document('LFZZ', [{"pdfPage": 1, "text": text}], {})
        self.assertEqual({p['code'] for p in ad['points']}, {'E1', 'E2'})
        self.assertLess(ad['points'][0]['coordinates'][0], 0)

    def test_changed_fingerprint_disables_manual_layer(self):
        patch = json.loads((ROOT / 'interpretations/LFCH.json').read_text(encoding='utf-8'))
        ad = {'source': {'sha256': 'changed'}, 'status': 'calculé', 'points': [], 'routes': []}
        apply_interpretation(ad, patch)
        self.assertEqual(ad['status'], 'obsolète')
        self.assertFalse(ad['interpretation']['applied'])
        self.assertEqual(ad['points'], [])
        self.assertEqual(ad['routes'], [])

    def test_dataset_contract_and_analysed_routes(self):
        dataset = json.loads((ROOT / 'data/vfr-compiled.json').read_text(encoding='utf-8'))
        ads = {a['icao']: a for a in dataset['aerodromes']}
        self.assertEqual(len(ads), 418)
        self.assertEqual(len(ads['LFBD']['routes']), 15)
        self.assertEqual(len(ads['LFBO']['routes']), 3)
        self.assertEqual(len(ads['LFML']['routes']), 15)
        self.assertEqual(sum(p['origin']=='manual' for a in ads.values() for p in a['points']), 14)
        self.assertTrue(any(r.get('geometry') and len(r['geometry']['coordinates'])>5 for r in ads['LFCH']['routes']))
        for a in ads.values():
            self.assertEqual(a['fingerprint'], a['lastCalculation']['sourceSha256'])
            known = {p['id'] for p in a['points']} | {a['icao']}
            for p in a['points']:
                lon, lat = p['coordinates']
                self.assertTrue(-180 <= lon <= 180 and -90 <= lat <= 90)
                if p['origin']=='manual':
                    self.assertFalse(p['isOfficialReportingPoint'])
                    self.assertFalse(p['radioReportRequired'])
                    self.assertIn('reason', p)
            for r in a['routes']:
                self.assertTrue(set(r['pointRefs']) <= known)
                self.assertTrue(set(r.get('geometryPointRefs') or []) <= known)
            for rel in a['relations']:
                self.assertIn(rel['from'], known)
                self.assertIn(rel['to'], known)

    def test_incomplete_refresh_preserves_previous_dataset(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source = root / 'vac'
            source.mkdir()
            for code in ('LFZZ', 'LFZY'):
                writer = PdfWriter()
                writer.add_blank_page(width=400, height=600)
                writer.write(source / ('AD-2.' + code + '.pdf'))
            config = root / 'config.json'
            config.write_text(json.dumps({'sourceDirectory': str(source), 'outputDirectory': 'data', 'cacheDirectory': 'cache'}), encoding='utf-8')
            run(config)
            target = root / 'data/vfr-compiled.json'
            previous = target.read_bytes()
            (source / 'AD-2.LFZY.pdf').unlink()
            with self.assertRaises(RuntimeError):
                run(config)
            self.assertEqual(target.read_bytes(), previous)

if __name__ == '__main__':
    unittest.main()
