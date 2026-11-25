"""Rebuild the local RAD index from the original workbooks; preserves rows and removes struck text."""
import datetime as dt, gzip, hashlib, json, re, sys
from pathlib import Path
import openpyxl
from openpyxl.cell.rich_text import CellRichText

HERE=Path(__file__).resolve().parent

def main():
    paths=[Path(x) for x in sys.argv[1:]] or sorted((HERE/'sources').glob('*.xlsx'))
    if not paths: raise ValueError('Aucun classeur RAD dans sources/.')
    books={}
    for path in paths:
        w=openpyxl.load_workbook(path,rich_text=True,data_only=True)
        title=str(w['Cover']['A1'].value)
        cover=' '.join(str(c.value) for row in w['Cover'] for c in row if c.value)
        m=re.search(r'Valid From\s+(\d{2}/\d{2}/\d{4})',cover)
        if not m: raise ValueError('Date de couverture absente : '+path.name)
        start=dt.datetime.strptime(m[1],'%d/%m/%Y').date()
        b=dict(file=path.name,title=title,start=str(start),end_exclusive=str(start+dt.timedelta(days=28)),
            sha256=hashlib.sha256(path.read_bytes()).hexdigest(),sheets={},headers={})
        for s in w:
            if s.title=='Cover': continue
            b['headers'][s.title]=[str(c.value or '').replace('\n',' ') for c in s[1]]
            records=[]
            for row in s.iter_rows(min_row=2):
                values=[]; removed=False
                for c in row:
                    v=c.value
                    if c.font.strike: v,removed='',True
                    elif isinstance(v,CellRichText):
                        parts=[]
                        for part in v:
                            if not isinstance(part,str) and part.font.strike: removed=True
                            else: parts.append(str(part))
                        v=''.join(parts)
                    values.append(str(v).replace('_x000D_','').strip() if v is not None else '')
                if any(values): records.append(dict(row=row[0].row,v=values,strike_removed=removed))
            b['sheets'][s.title]=records
        if str(start) in books: raise ValueError('Deux éditions du même cycle : conserver une seule édition dans sources/.')
        books[str(start)]=b; print(title,flush=True)
    temporary=HERE/'rad.json.gz.new'
    with gzip.open(temporary,'wt',encoding='utf-8') as f: json.dump(list(books.values()),f,ensure_ascii=False,separators=(',',':'))
    temporary.replace(HERE/'rad.json.gz')
    print('Import terminé. Redémarrer RouteSim.')

if __name__=='__main__': main()
