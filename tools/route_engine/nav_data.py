"""Read both AeroDB per-dataset folders and legacy country snapshots.
An empty modern dataset can fall back to the newest older nonempty snapshot.
Legacy supplements are merged only when they declare the same AIRAC date.
"""
import json,re

def load(path):return json.loads(path.read_text(encoding='utf-8-sig'))

class Zone:
    def __init__(self,folder,date):
        self.folder=folder;self.date=str(date);self.cache={}
        self.folders=sorted((p for p in folder.iterdir() if p.is_dir() and re.fullmatch(r'\d{4}-\d\d-\d\d',p.name) and p.name<=self.date),reverse=True)
        self.flat=sorted((p for p in folder.glob('*.json') if re.fullmatch(r'\d{4}-\d\d-\d\d',p.stem) and p.stem<=self.date),reverse=True)
        self.cycles={};self.sources={}
    def read(self,path):
        if path not in self.cache:self.cache[path]=load(path)
        return self.cache[path]
    def dataset(self,kind):
        options=[]
        for folder in self.folders:
            p=folder/(kind+'.json')
            if p.exists():options.append((folder.name,0,p))
        options += [(p.stem,1,p) for p in self.flat]
        selected=None;cycle=None;sources=[]
        for stamp,legacy,p in sorted(options,key=lambda item:(item[0],-item[1]),reverse=True):
            if cycle and stamp<cycle:break
            d=self.read(p);declared=str(d.get('cycle',stamp))
            if declared>self.date:continue
            if legacy:
                data=d.get('aero',{}).get('aerodromes' if kind=='aeroindex' else kind,[])
            else:data=d.get('data',[])
            if not data or kind=='aeroindex' and isinstance(data,dict) and not data.get('rows'):continue
            if kind!='aeroindex' and not isinstance(data,list):continue
            if selected is None:selected=data;cycle=declared;sources=[str(p)]
            elif declared==cycle and kind in ['points','navaids','vrp','airways'] and isinstance(data,list):
                selected=[*selected,*data];sources.append(str(p))
        self.cycles[kind]=cycle;self.sources[kind]=sources
        return selected if selected is not None else []
