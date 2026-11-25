import contextlib,copy,io,json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
from types import SimpleNamespace
from vac_parser import VERSION,HERE,read,write,sha,build,inventory
from vac_auto import automatic_seed,candidate_vectors,automatic_calibration,blue,ink_kind,rgb
from vac_server import preview_file

DATA=HERE.parents[1]/'data'/'sia'/'vac'
class AutomaticTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  index=read(DATA/'index.json');cls.entries={a['icao']:a for a in index['aerodromes']if a['icao']in['LFAJ','LFRN','LFRS','LFBD']}
  cls.reviews=read(HERE/'vac-reviews.json');cls.audits={code:automatic_seed(entry)for code,entry in cls.entries.items()}
 def test_all_reviewed_map_pages_get_blind_graticule_calibration(self):
  count=0
  for code,ad in self.reviews['aerodromes'].items():
   for kind,review in ad.items():
    if kind not in('VAC','VACH'):continue
    for number in review['calibrations']:
     p=next(p for p in self.audits[code]['sources'][kind]['pages']if p['pdfPage']==int(number))
     self.assertIsNotNone(p['calibration'],f'{code} {kind} {number}');count+=1
     self.assertLessEqual(p['calibration']['residualPdfPt'],2)
  self.assertEqual(count,9)
 def test_reviewed_vectors_are_detected_without_per_ad_ids(self):
  for code,ad in self.reviews['aerodromes'].items():
   for kind,review in ad.items():
    if kind not in('VAC','VACH'):continue
    for f in review['features']:
     p=next(p for p in self.audits[code]['sources'][kind]['pages']if p['pdfPage']==f['pdfPage'])
     self.assertTrue(set(f['vectorRefs'])<={ref for ref,ink in p['vectors']},f'{code} {f["key"]}')
 def test_nantes_wavy_reporting_symbols_are_excluded(self):
  p=next(p for p in self.audits['LFRS']['sources']['VAC']['pages']if p['pdfPage']==1)
  refs={ref for ref,ink in p['vectors']}
  for ref in ['C422','C542','C544','C546','C548','C550','C576','C578']:self.assertNotIn(ref,refs)
 def test_missing_georeferencing_never_gets_a_fabricated_calibration(self):
  page=SimpleNamespace(lines=[],curves=[],width=420,height=595)
  self.assertIsNone(automatic_calibration(page,[],[-1,48]))
 def test_named_pdf_colour_operands_are_not_guessed_as_rgb(self):
  for color in ['Pattern',('P1',),['CS0',.3,.6],(.4,('tint',)),[]]:
   self.assertIsNone(rgb(color));self.assertFalse(blue(color));self.assertIsNone(ink_kind(color))
  self.assertEqual(rgb((0,0,0)),(0,0,0));self.assertEqual(rgb((0,1,0,0)),(1,0,1));self.assertEqual(rgb((.5,)),(.5,)*3)
 def test_inventory_includes_local_helipads_and_alternative_sia_filenames(self):
  with tempfile.TemporaryDirectory()as folder:
   root=Path(folder);(root/'VAC').mkdir();(root/'VACH').mkdir()
   for kind,name in [('VAC','AD-2.LFAJ'),('VAC','AD-2.SIV_NE'),('VACH','AD-3.LF001'),('VACH','FR-AD-3.FMEH-fr-FR'),('VACH','AD-3.LFWM'),('VACH','FR-AD-3.LFWM-fr-FR'),('VACH','FR-AD-3.0-fr-FR')]:
    (root/kind/(name+'.pdf')).write_bytes(b'filename inventory fixture')
   entries=inventory(root);self.assertEqual(set(entries),{'LFAJ','LF001','FMEH','LFWM'})
   primary=entries['LFWM']['sources']['VACH'];self.assertEqual(primary['name'],'AD-3.LFWM.pdf');self.assertEqual(primary['supplements'][0]['name'],'FR-AD-3.LFWM-fr-FR.pdf')
 def cached_ad(self,code):
  ad=read(DATA/'base'/f'{code}.json');ad['vac'].update({'parserVersion':VERSION,'extractionMode':'reviewed_selection','reviewSha256':sha(HERE/'vac-reviews.json')});return ad
 def test_selected_refresh_preserves_other_previously_processed_ads(self):
  entry=copy.deepcopy(self.entries['LFAJ']);other={**entry,'icao':'TEST','status':'automatic','features':2,'file':'TEST.json'}
  with tempfile.TemporaryDirectory()as folder:
   output=Path(folder);write(output/'base'/'LFAJ.json',self.cached_ad('LFAJ'));write(output/'index.json',{'aerodromes':[entry,other]})
   with patch('vac_parser.inventory',return_value={'LFAJ':entry,'TEST':{k:v for k,v in other.items()if k in('icao','sources')}}),patch('vac_parser.extract_one',side_effect=AssertionError('Cache should be reused')),contextlib.redirect_stdout(io.StringIO()):
    result=build('unused',output,'unused',['LFAJ'])
   kept=next(a for a in result['aerodromes']if a['icao']=='TEST');self.assertEqual(kept['status'],'automatic');self.assertEqual(kept['features'],2)
 def test_lfrn_correction_is_reapplied_and_its_file_is_not_rewritten(self):
  entry=copy.deepcopy(self.entries['LFRN']);base=self.cached_ad('LFRN')
  correction=read(DATA/'corrections'/'LFRN.json')
  with tempfile.TemporaryDirectory()as folder:
   output=Path(folder);write(output/'base'/'LFRN.json',base);write(output/'corrections'/'LFRN.json',correction);before=sha(output/'corrections'/'LFRN.json')
   with patch('vac_parser.inventory',return_value={'LFRN':entry}),patch('vac_parser.extract_one',side_effect=AssertionError('Cache should be reused')),contextlib.redirect_stdout(io.StringIO()):build('unused',output,'unused',['LFRN'])
   ad=read(output/'LFRN.json');row=next(c for c in ad['vac']['circuits']if c['id']=='LFRN:32:normal')
   self.assertEqual((row['altitudeFt'],row['heightFt']),(800,700));self.assertEqual(sha(output/'corrections'/'LFRN.json'),before)
 def test_previews_are_lazy_and_fingerprinted(self):
  with tempfile.TemporaryDirectory()as folder:
   output=Path(folder);write(output/'base'/'LFAJ.json',self.cached_ad('LFAJ'));name='VAC-LFAJ-1.png'
   self.assertFalse((output/'previews'/name).exists());target=preview_file(output,name)
   self.assertTrue(target.read_bytes().startswith(b'\x89PNG'));before=target.stat().st_mtime_ns
   self.assertEqual(preview_file(output,name).stat().st_mtime_ns,before)
   with self.assertRaises(ValueError):preview_file(output,'../VAC-LFAJ-1.png')
 def test_local_helipad_preview_accepts_five_character_identifier(self):
  with tempfile.TemporaryDirectory()as folder:
   output=Path(folder);write(output/'base'/'LF001.json',read(DATA/'base'/'LF001.json'))
   target=preview_file(output,'VACH-LF001-1.png');self.assertTrue(target.read_bytes().startswith(b'\x89PNG'))

if __name__=='__main__':unittest.main(verbosity=2)
