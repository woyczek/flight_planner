import copy,io,json,math,sys,tempfile,unittest
from pathlib import Path
from types import SimpleNamespace
from vac_parser import read,write,sample_path,calibration_xy,inverse_xy,all_features,apply_corrections,sha
from vac_server import make_handler,normalise_patch

DATA=Path(__file__).resolve().parents[2]/'data'/'sia'/'vac'

class WorkbenchTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.ads={c:read(DATA/'base'/f'{c}.json') for c in ['LFAJ','LFRN','LFRS','LFBD']}
 def test_inventory_and_sources(self):
  index=read(DATA/'index.json');self.assertFalse(index['errors']);self.assertGreater(len(index['aerodromes']),600)
  self.assertEqual(sum(a['status']=='extracted' for a in index['aerodromes']),4)
  for ad in self.ads.values():
   for src in ad['vac']['sources'].values():self.assertEqual(sha(src['file']),src['sha256'])
 def test_altitudes_and_hands(self):
  self.assertEqual([self.ads[c]['vac']['terrainElevationFt'] for c in self.ads],[581,124,90,166])
  self.assertEqual(self.ads['LFBD']['vac']['fatoElevationFt'],154)
  aj=self.ads['LFAJ']['vac']['circuits'];self.assertEqual([(r['runway'],r['hand']) for r in aj[:2]],[('04','MG'),('22','MG')])
  self.assertEqual([(r['altitudeFt'],r['heightFt']) for r in aj[:2]],[(1600,1000)]*2)
 def test_bezier_and_shorthand(self):
  path=sample_path([('m',[0,0]),('c',[0,10],[10,10],[10,0]),('v',[20,0],[20,10]),('y',[30,10],[30,0])])[0]
  self.assertEqual(path[0],[0,0]);self.assertEqual(path[-1],[30,0]);self.assertGreater(len(path),12)
  self.assertLess(path[2][1],10) # Control point is not interpreted as a curve vertex.
 def test_calibration_roundtrip(self):
  for ad in self.ads.values():
   for p,f in all_features(ad):
    for s in f['segments']:
     for v in s['vertices']:
      back=inverse_xy(p['calibration'],calibration_xy(p['calibration'],v['pdfXY']))
      self.assertTrue(all(abs(a-b)<1e-6 for a,b in zip(back,v['pdfXY'])))
 def test_no_fictitious_closure(self):
  aj=self.ads['LFAJ'];self.assertEqual(len(list(all_features(aj))),2)
  for p,f in all_features(aj):
   self.assertEqual(len(f['segments']),1)
   self.assertNotEqual(f['segments'][0]['vertices'][0]['coordinates'],f['segments'][0]['vertices'][-1]['coordinates'])
  for ad in self.ads.values():
   expected=sum(len(f['segments']) for p,f in all_features(ad))
   self.assertEqual(sum(r.get('origin')=='vac_vector_extraction' for r in ad['routes']),expected)
 def test_reporting_points_and_sequences(self):
  bd=self.ads['LFBD'];self.assertEqual(len(bd['vac']['procedureSequences']),30)
  self.assertEqual(len({(p.get('chartKind'),p['code']) for p in bd['points']}),len(bd['points']))
  self.assertTrue(any(p['code']=='NW' for p in self.ads['LFRS']['points']))
  self.assertTrue(all(len(p['coordinates'])==2 and all(isinstance(x,(int,float)) for x in p['coordinates']) for ad in self.ads.values() for p in ad['points']))
 def patch(self,code='LFAJ'):
  ad=self.ads[code];p,f=next(all_features(ad));v=f['segments'][0]['vertices'][0]
  return {'icao':code,'points':[{'id':v['id'],'sourceSha256':f['sourceSha256'],'coordinates':[v['coordinates'][0]+.001,v['coordinates'][1]+.001]}],'fields':[]}
 def test_correction_reapplies_without_mutating_base(self):
  base=self.ads['LFAJ'];snapshot=copy.deepcopy(base);patch=normalise_patch(base,self.patch());changed=apply_corrections(base,patch)
  self.assertEqual(base,snapshot);self.assertEqual(changed['vac']['corrections']['applied'],1)
  self.assertAlmostEqual(patch['points'][0]['deltaLonLat'][0],.001);self.assertNotEqual(patch['points'][0]['deltaPdfXY'],[0,0])
  point_id=patch['points'][0]['id'];route=next(r for r in changed['routes'] if point_id in r.get('geometryPointRefs',[]))
  self.assertEqual(route['geometry']['coordinates'][0],patch['points'][0]['coordinates'])
 def test_published_point_moves_and_lat_lon_sync(self):
  ad=self.ads['LFRS'];point=ad['points'][0];patch={'icao':'LFRS','points':[{'id':point['id'],'sourceSha256':ad['vac']['sources']['VAC']['sha256'],'coordinates':[-1.4,47.1]}]}
  result=apply_corrections(ad,normalise_patch(ad,patch));p=result['points'][0]
  self.assertEqual(p['coordinates'],[-1.4,47.1]);self.assertEqual((p['lon'],p['lat']),(-1.4,47.1))
 def test_reporting_point_can_be_saved_without_map_calibration(self):
  ad=copy.deepcopy(self.ads['LFRS']);ad['vac']['charts']['VAC']['pages']=[];point=next(p for p in ad['points']if p['chartKind']=='VAC')
  patch={'icao':'LFRS','points':[{'id':point['id'],'sourceSha256':ad['vac']['sources']['VAC']['sha256'],'coordinates':[-1.4,47.1]}],'fields':[]}
  normalized=normalise_patch(ad,patch);self.assertIsNone(normalized['points'][0]['deltaPdfXY'])
  result=apply_corrections(ad,normalized);self.assertEqual(next(p for p in result['points']if p['id']==point['id'])['coordinates'],[-1.4,47.1])
 def test_local_helipad_identifier_is_accepted_by_http_routes(self):
  handler=make_handler(DATA,'test-token');obj=object.__new__(handler)
  self.assertEqual(obj.code('/api/ad/LF001'),'LF001')
  with self.assertRaises(ValueError):obj.code('/api/ad/../../escape')
 def test_supplemental_pdf_is_served_separately_from_approach_chart(self):
  with tempfile.TemporaryDirectory()as folder:
   data=Path(folder);main=data/'chart.pdf';extra=data/'chapter.pdf';main.write_bytes(b'map');extra.write_bytes(b'chapter')
   write(data/'index.json',{'aerodromes':[{'icao':'LF001','sources':{'VACH':{'file':str(main),'supplements':[{'file':str(extra)}]}}}]})
   handler=make_handler(data,'test-token')
   for path,expected in [('/source/VACH/LF001',b'map'),('/source/VACH/LF001/0',b'chapter')]:
    obj=object.__new__(handler);obj.path=path;obj.headers={'Host':'127.0.0.1:8766'};obj.server=SimpleNamespace(server_port=8766);result=[]
    obj.response=lambda status,value,*args:result.append((status,value));obj.do_GET();self.assertEqual(result[0],(200,expected))
 def test_stale_patch_is_not_applied(self):
  patch=self.patch();patch['points'][0]['sourceSha256']='old';result=apply_corrections(self.ads['LFAJ'],patch)
  self.assertEqual(result['vac']['corrections']['applied'],0);self.assertTrue(result['vac']['corrections']['stale'])
  with self.assertRaises(ValueError):normalise_patch(self.ads['LFAJ'],patch)
 def test_invalid_coordinates_rejected(self):
  for bad in [[500,0],[0,float('nan')],[True,0],['a',0]]:
   patch=self.patch();patch['points'][0]['coordinates']=bad
   with self.assertRaises(ValueError):apply_corrections(self.ads['LFAJ'],patch)
 def request(self,handler,path,payload,token='test-token',origin='http://127.0.0.1:8766'):
  obj=object.__new__(handler);body=json.dumps(payload).encode();obj.path=path;obj.headers={'Host':'127.0.0.1:8766','Origin':origin,'Content-Length':str(len(body)),'X-VAC-Token':token}
  obj.server=SimpleNamespace(server_port=8766);obj.rfile=io.BytesIO(body);result=[]
  obj.response=lambda status,value,*args:result.append((status,value))
  obj.do_POST();return result[0]
 def test_separate_writes_conflict_and_history(self):
  with tempfile.TemporaryDirectory() as folder:
   data=Path(folder);write(data/'base'/'LFAJ.json',self.ads['LFAJ']);write(data/'LFAJ.json',self.ads['LFAJ']);before=sha(data/'LFAJ.json');handler=make_handler(data,'test-token')
   payload={'patch':self.patch(),'expectedRevision':None}
   status,result=self.request(handler,'/api/corrections/LFAJ',payload);self.assertEqual(status,200);self.assertEqual(sha(data/'LFAJ.json'),before)
   patch_revision=result['revision'];self.assertTrue((data/'corrections'/'LFAJ.json').exists())
   payload['expectedRevision']=before;status,result=self.request(handler,'/api/target/LFAJ',payload);self.assertEqual(status,200)
   self.assertEqual(sha(data/'corrections'/'LFAJ.json'),patch_revision);self.assertNotEqual(sha(data/'LFAJ.json'),before)
   self.assertTrue(list((data/'history'/'LFAJ').glob('target-*.json')))
   status,result=self.request(handler,'/api/target/LFAJ',payload);self.assertEqual(status,409)
 def test_cross_origin_and_invalid_token_rejected(self):
  handler=make_handler(DATA,'test-token');payload={'patch':self.patch(),'expectedRevision':None}
  self.assertEqual(self.request(handler,'/api/corrections/LFAJ',payload,token='bad')[0],403)
  self.assertEqual(self.request(handler,'/api/corrections/LFAJ',payload,origin='http://evil.example')[0],403)
 def test_numeric_annotations_do_not_cut_bordeaux_tracks(self):
  ad=self.ads['LFBD']
  for page,f in all_features(ad):
   if f['kind']!='report_route' or f['chartKind']!='VAC':continue
   self.assertTrue(any(s.get('origin')=='cartographic_continuation'for s in f['segments']),f['key'])
   graph={}
   for s in f['segments']:
    a,b=s['vertices'][0]['id'],s['vertices'][-1]['id'];graph.setdefault(a,set()).add(b);graph.setdefault(b,set()).add(a)
   seen=set();todo=[next(iter(graph))]
   while todo:
    ident=todo.pop()
    if ident in seen:continue
    seen.add(ident);todo.extend(graph[ident]-seen)
   self.assertEqual(seen,set(graph),f['key'])
 def test_shared_connector_endpoints_move_together(self):
  ad=self.ads['LFBD'];page,f=next((p,f)for p,f in all_features(ad)if f['key']=='NA-NW');bridge=next(s for s in f['segments']if s.get('origin')=='cartographic_continuation');v=bridge['vertices'][0]
  target=[v['coordinates'][0]+.0002,v['coordinates'][1]]
  result=apply_corrections(ad,{'icao':'LFBD','points':[{'id':v['id'],'coordinates':target,'sourceSha256':f['sourceSha256']}],'fields':[]})
  copies=[q for p,f in all_features(result)for s in f['segments']for q in s['vertices']if q['id']==v['id']]
  self.assertGreater(len(copies),1);self.assertTrue(all(q['coordinates']==target for q in copies))
 def test_departure_32_is_mandatory_and_oriented_southwest(self):
  ad=self.ads['LFRN'];p,f=next((p,f)for p,f in all_features(ad)if f['key']=='dep32')
  self.assertTrue(f['mandatory']);self.assertEqual(f['runways'],['32']);self.assertEqual(f['direction'],'forward');self.assertEqual(f['phase'],'departure')
  path=f['segments'][0]['vertices'];self.assertGreater(path[0]['coordinates'][0],path[-1]['coordinates'][0]);self.assertGreater(path[0]['coordinates'][1],path[-1]['coordinates'][1])
  self.assertTrue(any(r.get('mandatory') and r.get('runways')==['32']for r in ad['routes']))
 def test_argentan_and_aircraft_symbols_have_inclusion_arrows(self):
  for p,f in all_features(self.ads['LFAJ']):self.assertTrue(f.get('directionArrows'));self.assertEqual(f['directionArrows'][0]['role'],'inclusion')
  symbols=[m['sourceSymbol']for p,f in all_features(self.ads['LFRN'])for m in f.get('directionArrows',[])]
  self.assertGreaterEqual(symbols.count('aircraft'),3)

if __name__=='__main__':unittest.main(verbosity=2)
