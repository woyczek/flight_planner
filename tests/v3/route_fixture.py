"""Fixtures of the route cases (K101-K103, SOG-0081): a tiny OOXML workbook writer (RAD and FRA workbooks of EUROCONTROL in miniature) and a small navigation base in the shape of the README example (LFPO SITET KEPAD EIDW)."""
import gzip
import json
import os
import zipfile
from xml.sax.saxutils import escape


def col(n):
    s = ''
    while n:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


def write_xlsx(path, sheets, strike_style_cells=(), rich_strike=None):
    """sheets: [(name, [[cell values…]…])] (strings or None) ; strike_style_cells: {(sheet, row, col)} given the struck font style ; rich_strike: {(sheet, row, col): (kept, struck)} a rich text with a struck run."""
    strings = []

    def sid(text):
        if text not in strings:
            strings.append(text)
        return strings.index(text)
    sheet_xml = []
    for sname, rows in sheets:
        out = []
        for r, row in enumerate(rows, 1):
            cells = []
            for c, v in enumerate(row, 1):
                ref = f'{col(c)}{r}'
                key = (sname, r, c)
                style = ' s="1"' if key in strike_style_cells else ''
                if rich_strike and key in rich_strike:
                    kept, struck = rich_strike[key]
                    strings.append(('rich', kept, struck))
                    cells.append(f'<c r="{ref}" t="s"{style}><v>{len(strings) - 1}</v></c>')
                elif v is None:
                    if style:
                        cells.append(f'<c r="{ref}"{style}/>')
                elif isinstance(v, (int, float)):
                    cells.append(f'<c r="{ref}"{style}><v>{v}</v></c>')
                else:
                    cells.append(f'<c r="{ref}" t="s"{style}><v>{sid(v)}</v></c>')
            out.append(f'<row r="{r}">{"".join(cells)}</row>')
        sheet_xml.append('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + ''.join(out) + '</sheetData></worksheet>')
    si = []
    for s in strings:
        if isinstance(s, tuple):
            si.append(f'<si><r><t xml:space="preserve">{escape(s[1])}</t></r><r><rPr><strike/></rPr><t xml:space="preserve">{escape(s[2])}</t></r></si>')
        else:
            si.append(f'<si><t xml:space="preserve">{escape(s)}</t></si>')
    styles = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/></font><font><strike/><sz val="11"/></font></fonts>'
              '<cellXfs count="2"><xf numFmtId="0" fontId="0"/><xf numFmtId="0" fontId="1"/></cellXfs></styleSheet>')
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>')
        z.writestr('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
                    + ''.join(f'<sheet name="{escape(n)}" sheetId="{i}" r:id="rId{i}"/>' for i, (n, _) in enumerate(sheets, 1)) + '</sheets></workbook>')
        z.writestr('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                   + ''.join(f'<Relationship Id="rId{i}" Target="worksheets/sheet{i}.xml"/>' for i in range(1, len(sheets) + 1)) + '</Relationships>')
        z.writestr('xl/styles.xml', styles)
        z.writestr('xl/sharedStrings.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' + ''.join(si) + '</sst>')
        for i, x in enumerate(sheet_xml, 1):
            z.writestr(f'xl/worksheets/sheet{i}.xml', x)


RAD_HEAD = ['Change Record', 'Valid From', 'Valid Until', 'ID', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']


def rad_sheets(block_segment=False):
    """The nine sheets of a RAD workbook, almost empty: Annex 1 (one group), Annex 2B (a point rule and, on request, a segment rule), Annex 3B DCT (one rule)."""
    pad = lambda row: row + [''] * (17 - len(row))
    two_b = [RAD_HEAD,
             pad(['NEW', '29 OCT 2026 [2611]', 'UFN', 'LF9001', '', '', '', 'ZZZZZ', 'NOT AVBL FOR TFC', 'H24', 'C', 'Fixture point rule']),
             pad(['AMD', '29 OCT 2026 [2611]', 'UFN', 'LF9002', '', '', '', 'QQQQQ', 'NOT AVBL FOR TFC', 'H24', 'C', 'Struck cell and rich text']),
             ]
    if block_segment:
        two_b.append(pad(['NEW', '29 OCT 2026 [2611]', 'UFN', 'LF9003', 'A1', 'SITET', 'KEPAD', '', 'NOT AVBL FOR TFC', 'H24', 'C', 'Fixture segment rule']))
    return [('Cover', [['RAD 2611 V1.0 (Rolling RAD Document)'], ['Valid From 29/10/2026 until 26/11/2026']]),
            ('Annex 1', [RAD_HEAD, pad(['', '', '', 'FIXGRP', '(LFPO, LFPG)'])]),
            ('Annex 2A', [RAD_HEAD]), ('Annex 2B', two_b), ('Annex 2C', [RAD_HEAD]), ('Annex 3A Conditions', [RAD_HEAD]), ('Annex 3A ARR', [RAD_HEAD]), ('Annex 3A DEP', [RAD_HEAD]),
            ('Annex 3B DCT', [RAD_HEAD, pad(['NEW', '29 OCT 2026 [2611]', 'UFN', 'LF9100', 'AAAAA', 'BBBBB', '0', '660', 'No', '', 'H24'])]),
            ('Annex 3B FRA LIM', [RAD_HEAD])]


FRA_HEAD = ['Change Record', 'Point Type', 'FRA Point', 'FRA Point Latitude', 'FRA Point Longitude', 'FRA Name', 'FRA Relevance En-Route', 'FRA Relevance ARR/DEP', 'Arrival Airport', 'Departure Airport', 'FLOS', 'Level Availability', 'Time Availability', 'Loc. indicators', 'Remarks']


def fra_sheets():
    return [('COVER', [[None], [None], ['Free Route Airspace Significant Points'], ['Effective Date - 29 OCT 2026']]),
            ('FRA Points', [FRA_HEAD, [None, None, 'ABADI', 'N404519', 'E0183830', 'BALTIC FRA', 'I', '-', None, None, '-', 'FL195 / FL660', 'H24', 'LIBB', None],
                            [None, None, 'ABAKO', 'N371102', 'E0163958', 'BALTIC FRA', 'E', '-', None, None, '-', 'FL195 / FL660', 'H24', 'LIRR', None]]),
            ('Column Explanation', [['Column content explanation']])]


def make_base(data):
    """data/sia/base/xx/2026-10-29/ : LFPO and EIDW, four points and the airway A1 between them, the shape of the README example (LFPO SITET KEPAD EIDW)."""
    d = os.path.join(data, 'sia', 'base', 'xx', '2026-10-29')
    os.makedirs(d)
    nodes = {'OLZOM': (48.15, 2.26), 'SITET': (50.2, 0.2), 'KEPAD': (52.0, -3.0), 'BOYNE': (53.62, -5.35)}
    files = {
        'aeroindex': {'fields': ['icao', 'name', 'lat', 'lon', 'elev', 'bearing', 'magVar'], 'rows': [['LFPO', 'PARIS ORLY', 48.72328, 2.37958, 291, 0, 0], ['EIDW', 'DUBLIN', 53.42131, -6.27006, 242, 0, 0]]},
        'points': [{'id': k, 'type': 'ICAO', 'lat': v[0], 'lon': v[1]} for k, v in nodes.items()],
        'navaids': [],
        'airways': [{'route': 'A1', 'a': {'id': a, 'lat': nodes[a][0], 'lon': nodes[a][1]}, 'b': {'id': b, 'lat': nodes[b][0], 'lon': nodes[b][1]}, 'lower': 6500, 'upper': 66000}
                    for a, b in (('OLZOM', 'SITET'), ('SITET', 'KEPAD'), ('KEPAD', 'BOYNE'))],
    }
    for k, v in files.items():
        with open(os.path.join(d, k + '.json'), 'w', encoding='utf-8') as f:
            json.dump({'schema': 2, 'zone': 'xx', 'cycle': '2026-10-29', 'kind': k, 'data': v}, f)
