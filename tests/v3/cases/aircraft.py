"""Area M - the aircraft module of the Maintenance application (modules/aircraft/SPEC.md; V3_SPECIFICATION section 10.34, lot A2).

The fleet (airline/fleet.json): list and search, add, edit (the changed fields said before writing), retire (a question), every write
reading the file just before. Invented aircraft only."""
import json

from lib import case, norm, tx, tx_row

M = '[data-module="aircraft"]'
AC = 'modules/aircraft/module.js'
LEVEL3 = [['device/level.json', {'level': 3}, 'cache']]


def row(c, key):
    """A translation row of the aircraft module."""
    return tx(AC, key, c.lang)


def fleet_doc(n=3):
    """airline/fleet.json with `n` invented aircraft (F-TST1, F-TST2…), the first out of service, the second with a location from the site."""
    ac = []
    for i in range(1, n + 1):
        a = {'operator': 'ESCADRON TEST', 'type': 'C30J' if i % 2 else 'A400', 'variant': '', 'registration': f'F-TST{i}', 'tacticalNumber': f'6{i}-T{i}',
             'number': str(i), 'callsigns': [f'TEST{i:02d}'], 'base': 'Testville', 'operational': i != 1}
        if i == 2:
            a.update(location='Testville-Nord', locationAt='2026-10-20T10:00:00Z')
        ac.append(a)
    return {'schema': 1, 'updated_at': '2026-10-28T09:00:00Z', 'by': 'website', 'aircraft': ac}


def open_fleet(c, n=3):
    c.open('aircraft', docs=LEVEL3 + [['airline/fleet.json', fleet_doc(n), 'document']], wait=False, app='maintenance')
    c.until(f"!!document.querySelector('{M} [data-pane=fleet]')", timeout=15000, what='the fleet list is drawn')


def regs(c):
    return c.js(f"[...document.querySelectorAll('{M} [data-reg]')].map(b => b.dataset.reg)")


def fleet_of(c, pred, what):
    return c.until_doc('airline/fleet.json', pred, what, timeout=8000)


@case('M1', 'Fleet: the list of the company\'s aircraft, searched', 'M', tags=('aircraft',), designs=('standard',), screens=False, langs4=True,
      rule='modules/aircraft SPEC 2-3: one row per aircraft (registration, type, callsigns, base, « hors service »), a search, seven rows then « N autres »')
def m1(c):
    open_fleet(c, 9)
    c.eq(regs(c), [f'F-TST{i}' for i in range(1, 8)], 'seven rows, by registration', what='rows')
    more = norm(c.text(f'{M} [data-do="more"]') or '')
    c.eq(more, norm(row(c, 'more').replace('{n}', '2')), 'then « 2 autres »', what='more')
    c.ok(norm(row(c, 'out')) in norm(c.text(f'{M} [data-reg="F-TST1"]') or ''), c.text(f'{M} [data-reg="F-TST1"]'), 'an aircraft out of service says so')
    c.page.fill(f'{M} [data-k="q"]', 'test04')
    c.until(f"document.querySelectorAll('{M} [data-reg]').length === 1", what='the search by callsign keeps one row')
    c.eq(regs(c), ['F-TST4'], 'the aircraft whose callsign is TEST04', what='search')


@case('M2', 'Fleet: add an aircraft; a type absent from the base is kept, said; the registration is unique', 'M', tags=('aircraft',),
      designs=('standard',), screens=False, langs4=True, rule='modules/aircraft SPEC 3: add, free type said never refused, registration unique, the file read just before')
def m2(c):
    open_fleet(c)
    c.tap(f'{M} [data-do="add"]')
    c.until(f"!!document.querySelector('{M} [data-pane=edit]')", what='the editor opens')
    c.page.fill(f'{M} [data-f="registration"]', 'f-tst2')
    c.page.fill(f'{M} [data-f="type"]', 'ZZ99')
    c.until(f"(w) => (document.querySelector('{M} [data-typeinfo]') || {{}}).textContent.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim() === w", norm(row(c, 'typeFree')),
            what='a type the base does not know: said, kept')
    c.tap(f'{M} [data-do="save"]')
    c.until("(w) => (window.__notes || []).some(n => n.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim() === w)", norm(row(c, 'dupReg').replace('{r}', 'F-TST2')),
            what='an existing registration is refused, said')
    # the notification closed by its ✕ (on a phone it lies over the buttons until it fades)
    c.tap('#fNotes .f-note [data-x]')
    c.until("!document.querySelector('#fNotes .f-note')", what='the notification is closed')
    c.page.fill(f'{M} [data-f="registration"]', 'F-NEW1')
    c.page.fill(f'{M} [data-f="callsigns"]', 'cotam1, cotam1 cotam2')
    c.tap(f'{M} [data-do="save"]')
    d = fleet_of(c, lambda d: any(a.get('registration') == 'F-NEW1' for a in (d or {}).get('aircraft') or []), 'the new aircraft is written')
    a = next(a for a in d['aircraft'] if a['registration'] == 'F-NEW1')
    c.eq((a['type'], a['callsigns'], a['operational']), ('ZZ99', ['COTAM1', 'COTAM2'], True), 'type kept as typed, callsigns cleaned, in service', what='new aircraft')
    c.eq(len(d['aircraft']), 4, 'the other aircraft are kept', what='fleet size')
    c.ok(d.get('updated_at', '') > '2026-10-28T09:00:00Z' and d.get('schema') == 1, f"{d.get('updated_at')}", 'the file is stamped, schema 1')
    c.until(f"!!document.querySelector('{M} [data-reg=\"F-NEW1\"]')", what='back on the list, the new aircraft is there')


@case('M3', 'Fleet: edit an aircraft; the changed fields are said before writing; what the editor does not carry is kept', 'M', tags=('aircraft',),
      designs=('standard',), screens=False, langs4=True, rule='modules/aircraft SPEC 3: changed fields listed; location / number kept; one aircraft changed')
def m3(c):
    open_fleet(c)
    c.tap(f'{M} [data-reg="F-TST2"]')
    c.until(f"!!document.querySelector('{M} [data-pane=edit]')", what='the editor of F-TST2')
    c.eq(norm(c.text(f'{M} [data-changes]') or ''), norm(row(c, 'noChange')), 'nothing changed yet', what='changes line')
    c.page.fill(f'{M} [data-f="base"]', 'Autreville')
    c.page.fill(f'{M} [data-f="callsigns"]', 'TEST02, TEST22')
    want = norm(row(c, 'changes').replace('{n}', '2').split(':')[0])
    c.until(f"(w) => (document.querySelector('{M} [data-changes]').textContent || '').replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim().startsWith(w)", want,
            what='« 2 champs changés : … » before writing')
    c.tap(f'{M} [data-do="save"]')
    # la fin de l'écriture, pas un délai : le module notifie « F-TST2 enregistré… » une fois ctx.data.put résolu, le fichier est lu
    # ensuite (sous la charge d'une passe complète, le fichier n'avait pas l'édition au bout des 8 s de fleet_of une fois sur dix-huit ;
    # une écriture lente attend ici, une écriture sans l'édition échoue ensuite sur fleet_of)
    c.until("(w) => (window.__notes || []).some(n => n.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim() === w)", norm(row(c, 'saved').replace('{r}', 'F-TST2')),
            timeout=20000, what='the end of the write (« F-TST2 enregistré… »)')
    d = fleet_of(c, lambda d: any(a.get('registration') == 'F-TST2' and a.get('base') == 'Autreville' for a in (d or {}).get('aircraft') or []), 'the edit is written')
    a = next(a for a in d['aircraft'] if a['registration'] == 'F-TST2')
    c.eq((a['callsigns'], a.get('location'), a.get('number')), (['TEST02', 'TEST22'], 'Testville-Nord', '2'),
         'the new callsigns; the location and the number the editor does not carry are kept', what='edited aircraft')
    c.eq([x['base'] for x in d['aircraft'] if x['registration'] != 'F-TST2'], ['Testville', 'Testville'], 'the other aircraft are untouched', what='others')


@case('M4', 'Fleet: retire an aircraft after a question; its sheet is not touched', 'M', tags=('aircraft',), designs=('standard',), screens=False,
      langs4=True, rule='modules/aircraft SPEC 3 and frame INTEGRATION: ctx.ask for every removal; the aircraft leaves the file, nothing else')
def m4(c):
    open_fleet(c)
    c.tap(f'{M} [data-reg="F-TST3"]')
    c.until(f"!!document.querySelector('{M} [data-do=retire]')", what='the editor offers « Retirer »')
    c.tap(f'{M} [data-do="retire"]')
    c.until("!!document.querySelector('.f-modal [data-ok]')", what='a question is asked')
    c.ok('F-TST3' in (c.text('.f-modal p') or ''), c.text('.f-modal p'), 'the question names the aircraft')
    c.tap('.f-modal [data-no]')
    c.until(f"!document.querySelector('.f-modal')", what='« Annuler » closes the question')
    fleet_of(c, lambda d: any(a.get('registration') == 'F-TST3' for a in (d or {}).get('aircraft') or []), 'nothing written: F-TST3 is still there')
    c.tap(f'{M} [data-do="retire"]')
    c.until("!!document.querySelector('.f-modal [data-ok]')", what='asked again')
    c.tap('.f-modal [data-ok]')
    d = fleet_of(c, lambda d: d and not any(a.get('registration') == 'F-TST3' for a in d.get('aircraft') or []), 'the aircraft leaves the file')
    c.eq(sorted(a['registration'] for a in d['aircraft']), ['F-TST1', 'F-TST2'], 'the others stay', what='fleet')


@case('M5', 'Fleet and sheet editor at 390 px: no overflow, 44 px rows, few controls at a time, two columns of fields at most, no stretched field',
      'M', tags=('aircraft', 'layout'), designs=('standard', 'cupertino'), screens=False,
      rule='frame rules: seven elements at most per screen, 44 px targets, no horizontal overflow on a phone; the sheet form readable on a phone '
      '(user, 30 Oct: « bug d\'affichage sur les fiches, sur téléphone »: three columns of 96 px, labels on three lines, empty fields stretched; '
      'in the list the text of a row takes the width and its actions go under it)')
def m5(c):
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    open_fleet(c, 12)
    r = c.js(f"""(() => {{ const shown = e => {{ const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 }};
        return {{ over: document.documentElement.scrollWidth - innerWidth, rows: [...document.querySelectorAll('{M} [data-reg]')].map(b => Math.round(b.getBoundingClientRect().height)),
                  controls: [...document.querySelectorAll('{M} [data-pane] button, {M} [data-pane] input')].filter(shown).length }} }})()""")
    c.ok(r['over'] <= 0, f"{r['over']} px", 'no horizontal overflow at 390 px')
    c.ok(all(h >= 44 for h in r['rows']), f"{r['rows']}", 'every row is a 44 px target')
    c.ok(r['controls'] <= 10, f"{r['controls']}", 'the list shows its seven rows plus search, « Ajouter » and « N autres », nothing else')
    # the list of the sheets: the text of a row takes the width, its actions under it
    open_sheets(c)
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-id] [data-do=edit]')", what='the sheets are listed')
    lay = c.js(f"""(() => [...document.querySelectorAll('{M} {SHEETS} .f-list .f-item')].map(r => {{ const b = r.getBoundingClientRect(),
        t = r.firstElementChild.getBoundingClientRect(), a = r.querySelector('.f-row').getBoundingClientRect();
        return [r.dataset.id || r.dataset.type, Math.round(100 * t.width / b.width), a.top >= t.bottom - 1] }}))()""")
    c.ok(all(w >= 80 and under for _, w, under in lay), f'{lay}', 'at 390 px the text of a row takes the width (80 % or more) and its actions go under it')
    # the sheet editor, every group open: two columns at most, each field at its own height (an empty input never grows to the row)
    edit_sheet(c, 'EC25')
    c.js(f"document.querySelectorAll('{M} {SHEETS} details').forEach(d => d.open = true)")
    c.wait(300)
    e = c.js(f"""(() => {{ const grids = [...document.querySelectorAll('{M} {SHEETS} .ac-g3')];
        return {{ over: document.documentElement.scrollWidth - innerWidth,
                  cols: Math.max(...grids.map(g => new Set([...g.children].map(f => Math.round(f.getBoundingClientRect().left))).size)),
                  tall: [...document.querySelectorAll('{M} {SHEETS} .ac-g3 input:not([type=checkbox]), {M} {SHEETS} .ac-g3 select')]
                    .map(i => Math.round(i.getBoundingClientRect().height)).filter(h => h > 60),
                  boxes: [...document.querySelectorAll('{M} {SHEETS} .ac-g3 input[type=checkbox]')].map(i => Math.round(i.getBoundingClientRect().width))
                    .filter(w => w > 40) }} }})()""")
    c.ok(e['over'] <= 0, f"{e['over']} px", 'the sheet editor does not overflow at 390 px')
    c.ok(e['cols'] <= 2, f"{e['cols']} columns", 'two columns of fields at most on a phone (labels with their unit stay readable)')
    c.ok(not e['tall'], f"{e['tall']}", 'no input or list stretched to the height of its row')
    c.ok(not e['boxes'], f"{e['boxes']} px", 'a checkbox keeps its size: its label is not squeezed onto three lines')


# ---------------------------------------------------------------- the Fiches view (SPEC 4; the editor moved here from Fuel)
SX = 'modules/aircraft/sheets_texts.js'
SHEETS = '[data-sheets]'
LANGS = ['fr', 'en', 'de', 'es']
EC25 = {'id': 'EC25', 'name': 'EC25', 'icao': 'EC25', 'usableFuel': 2000, 'maxCrosswindKt': 17, 'updated_at': '2026-10-28T10:00:00Z',
        'cruise': {'tasKt': 141, 'fuelFlowPerHour': 650},
        '_fields': {'cruise.tasKt': {'at': '2026-10-28T10:00:00Z', 'source': 'lnmperf'}, 'usableFuel': {'at': '2026-10-28T10:00:00Z', 'source': 'edit'}}}
C30J = {'id': 'C30J', 'name': 'C-130J', 'icao': 'C30J', 'usableFuel': 20000, 'updated_at': '2026-10-27T10:00:00Z', 'cruise': {'tasKt': 330, 'fuelFlowPerHour': 2000}}
A320 = {'id': 'A320', 'name': 'A320', 'icao': 'A320', 'usableFuel': 18000, 'updated_at': '2026-10-26T10:00:00Z', 'cruise': {'tasKt': 450, 'fuelFlowPerHour': 2400}}
SHEET_DOCS = [[f'aircraft/sheets/{s["id"]}.json', s, 'document'] for s in (EC25, C30J, A320)]
# the base of the types (the published AircraftDB/): a helicopter, a turboprop and a jet, so the list has three families
TYPES = ['AircraftDB/aircraft_db.json', {'EC25': {'description': 'H2T', 'model': 'EC225'}, 'C30J': {'description': 'L4T', 'model': 'C-130J'},
                                         'A320': {'description': 'L2J', 'model': 'A320'}}, 'document']
STATUS = 'cache/aircraft/status.json'


def src_name(c, key):
    """The translated name of a source of a field (edit, lnmperf…)."""
    return norm(tx_row(SX, key, after='export const SRC_TX')[LANGS.index(c.lang)])


def open_sheets(c, view='sheets', target='aircraft', n=3):
    """The Maintenance application on the aircraft module with three invented sheets, the Fiches view kept as the last one (`view`)."""
    ui = [['cache/aircraft/ui.json', {'view': view}, 'cache']] if view else []
    c.open(target, docs=LEVEL3 + [['airline/fleet.json', fleet_doc(n), 'document']] + SHEET_DOCS + [TYPES] + ui, wait=False, app='maintenance')
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-id], {M} [data-pane=fleet], {M} {SHEETS} [data-do=save]')", timeout=15000,
            what='the Fiches list, the fleet list or the editor is drawn')


def sheet_ids(c):
    return c.js(f"[...document.querySelectorAll('{M} {SHEETS} [data-id]')].map(b => b.dataset.id)")


def pressed(c):
    return c.js(f"[...document.querySelectorAll('{M} .f-tabs [data-view]')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.view)")


def sheet_of(c, id):
    return c.until_doc(f'aircraft/sheets/{id}.json', lambda d: d is not None, f'the sheet {id} exists')


def open_group(c, path):
    """Opens the group (a <details>) that holds the field `path`, so that it can be typed in."""
    c.js(f"(() => {{ const d = document.querySelector('{M} {SHEETS} [data-path=\"{path}\"]').closest('details'); if (d) d.open = true }})()")


def clear_notes(c):
    """Closes the notifications (on a phone they lie over the buttons until they fade)."""
    c.js("document.querySelectorAll('#fNotes .f-note [data-x]').forEach(b => b.click())")
    c.until("!document.querySelector('#fNotes .f-note')", what='the notifications are closed')


def edit_sheet(c, id):
    """Opens the editor of sheet `id` from the Fiches list."""
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-id=\"{id}\"] [data-do=edit]')", what=f'the sheet {id} is listed')
    c.tap(f'{M} {SHEETS} [data-id="{id}"] [data-do="edit"]')
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-do=save]')", what=f'the editor of {id} is drawn')


@case('M6', 'Sheets: the Fiches tab lists the sheets by family, keeps the tab on reload and publishes the status line', 'M', tags=('aircraft',),
      designs=('standard',), screens=False, langs4=True,
      rule='modules/aircraft SPEC 2, 4, 6: tabs Flotte / Fiches (the last kept in cache/aircraft/ui.json), the sheets by family, a status line « N appareils, M fiches »')
def m6(c):
    open_sheets(c, view=None)
    c.eq(pressed(c), ['fleet'], 'the fleet is the first view', what='pressed tab')
    c.tap(f'{M} .f-tabs [data-view="sheets"]')
    c.until(f"document.querySelectorAll('{M} {SHEETS} [data-id]').length === 3", what='the three sheets are listed')
    c.eq(pressed(c), ['sheets'], 'the Fiches tab is pressed', what='pressed tab')
    heads = c.js(f"[...document.querySelectorAll('{M} {SHEETS} h3')].map(h => h.textContent.trim())")
    c.ok(len(heads) >= 2 and len(set(heads)) == len(heads), f'{heads}', 'the sheets are listed under one heading per family')
    c.eq(sorted(sheet_ids(c)), ['A320', 'C30J', 'EC25'], 'every seeded sheet is a row', what='rows')
    helico = tx_row(SX, 'helico', after='sheetCats')[LANGS.index(c.lang)]
    first = c.js(f"(document.querySelector('{M} {SHEETS} h3.ac-cat + .f-item') || {{}}).dataset?.id")
    c.ok(helico in heads and first == 'EC25', f'{heads} / {first}', 'EC25 sits alone under « Hélicoptères », the first family')
    todo = c.js(f"document.querySelectorAll('{M} {SHEETS} [data-type]').length")
    # the tab is kept on this device
    c.until_doc('cache/aircraft/ui.json', lambda d: (d or {}).get('view') == 'sheets', 'the chosen view is kept')
    c.page.reload(wait_until='load')
    c.until(f"document.querySelectorAll('{M} {SHEETS} [data-id]').length === 3", timeout=15000, what='after a reload the Fiches list is back')
    c.eq(pressed(c), ['sheets'], 'the reload keeps the Fiches tab', what='pressed tab')
    # the status line: aircraft, sheets, and the fleet types without a sheet
    want = row(c, 'statusCount').replace('{n}', '3').replace('{m}', '3')
    if todo:
        want += ', ' + row(c, 'statusTodo').replace('{k}', str(todo))
    st = c.until_doc(STATUS, lambda d: d and d.get('lines') and d['lines'][0]['text'][LANGS.index(c.lang)] == want, f'the status line says « {want} »')
    c.eq((st['schema'], st['lines'][0]['go']), (1, '#aircraft'), 'schema 1, the line opens the module', what='status record')
    c.tap(f'{M} .f-tabs [data-view="fleet"]')
    c.until(f"!!document.querySelector('{M} [data-pane=fleet]')", what='back on the fleet')
    c.eq(pressed(c), ['fleet'], 'the Flotte tab is pressed', what='pressed tab')


@case('M7', 'Sheets: the editor shows every field of the schema with its value and, under a filled field, its origin and date', 'M', tags=('aircraft',),
      designs=('standard',), screens=False, langs4=True,
      rule='modules/aircraft SPEC 4: the form follows PROFILE_FIELDS (maxCrosswindKt included); origin and date per field from sheets.origins')
def m7(c):
    open_sheets(c)
    edit_sheet(c, 'EC25')
    paths = c.js("window.AeroDBSheets.PROFILE_FIELDS.map(f => f[2])")
    have = c.js(f"[...document.querySelectorAll('{M} {SHEETS} input[data-path], {M} {SHEETS} select[data-path], {M} {SHEETS} textarea[data-path]')].map(i => i.dataset.path)")
    c.ok('maxCrosswindKt' in paths, f'{len(paths)} paths', 'the schema carries maxCrosswindKt')
    c.eq([p for p in paths if p not in have], [], 'every path of PROFILE_FIELDS has a field in the editor', what='missing fields')
    vals = c.js(f"""(() => {{ const v = p => (document.querySelector('{M} {SHEETS} [data-path="' + p + '"]') || {{}}).value;
        return [v('maxCrosswindKt'), v('usableFuel'), v('cruise.tasKt'), v('cruise.fuelFlowPerHour')] }})()""")
    c.eq(vals, ['17', '2000', '141', '650'], 'the fields show the sheet\'s values', what='values')
    o = c.js(f"""(() => {{ const t = p => ((document.querySelector('{M} {SHEETS} [data-origin="' + p + '"]') || {{}}).textContent || '').trim();
        return {{ lnm: t('cruise.tasKt'), edit: t('usableFuel'), none: t('descent.tasKt'), count: document.querySelectorAll('{M} {SHEETS} small[data-origin]').length }} }})()""")
    c.ok(o['lnm'].startswith('lnmperf') and '28' in o['lnm'], o['lnm'], 'cruise.tasKt: « lnmperf · 28/10 »')
    c.ok(norm(o['edit']).startswith(src_name(c, 'edit')) and '28' in o['edit'], o['edit'], 'usableFuel: « édité · 28/10 » in the language of the run')
    c.eq(o['none'], '', 'a field without a value has no origin line', what='empty field')
    c.ok(o['count'] >= 4, f"{o['count']}", 'one origin line under each filled field')
    lab = c.js(f"((document.querySelector('{M} {SHEETS} input[data-path=\"maxCrosswindKt\"]') || {{}}).closest('label') || {{}}).textContent || ''")
    want = c.pick({'fr': 'Vent de travers max', 'en': 'Max crosswind', 'de': 'Max. Seitenwind', 'es': 'Viento cruzado máx.'})
    c.ok(want in lab, lab, 'the crosswind field is labelled in the language of the run')


@case('M8', 'Sheets: an edit shows the review; « Appliquer » writes the file with the stamp of the edit', 'M', tags=('aircraft',), designs=('standard',),
      screens=False, langs4=True, rule='modules/aircraft SPEC 4: every write goes through aerodb sheets.put, the changed field stamped { source: edit } and the old value kept')
def m8(c):
    open_sheets(c)
    edit_sheet(c, 'EC25')
    open_group(c, 'cruise.tasKt')
    c.page.fill(f'{M} {SHEETS} input[data-path="cruise.tasKt"]', '150')
    c.tap(f'{M} {SHEETS} [data-do="save"]')
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-review] [data-do=apply]')", what='the review is shown')
    paths = c.js(f"[...document.querySelectorAll('{M} {SHEETS} [data-review] input[data-path]')].map(i => [i.dataset.path, i.checked])")
    c.eq(paths, [['cruise.tasKt', True]], 'one changed field, ticked', what='review rows')
    c.eq(sheet_of(c, 'EC25')['cruise']['tasKt'], 141, 'nothing is written before « Appliquer »', what='file before apply')
    clear_notes(c)
    c.tap(f'{M} {SHEETS} [data-do="apply"]')
    d = c.until_doc('aircraft/sheets/EC25.json', lambda d: d and d['cruise']['tasKt'] == 150, 'the new value is written')
    c.eq(d['_fields']['cruise.tasKt']['source'], 'edit', 'the changed field carries the stamp of an edit', what='_fields')
    c.eq([k['value'] for k in d['_kept']['cruise.tasKt']][:1], [141], 'the old value is kept', what='_kept')
    c.until(f"((document.querySelector('{M} {SHEETS} [data-origin=\"cruise.tasKt\"]') || {{}}).textContent || '').trim().startsWith('{src_name(c, 'edit')}')",
            what='the editor is drawn again and the origin of the field now says it was edited')


@case('M9', 'Sheets: a pasted JSON sheet is previewed field by field; an unticked field is not written', 'M', tags=('aircraft',), designs=('standard',),
      screens=False, rule='modules/aircraft SPEC 4: imports are a preview; nothing is written before « Enregistrer / Appliquer »; an unticked field keeps its value')
def m9(c):
    reply = {'sheets': [{'id': 'EC25', 'engineType': 'turboprop', 'pressurized': False, 'jetFuel': True, 'usableFuel': 2277,
                         'cruise': {'tasKt': 150, 'fuelFlowPerHour': 650, 'ceilingFt': 19135, 'rpmNominal': 265},
                         'climb': {'tasKt': 80, 'rateFpm': 1362, 'rpmNominal': 265}}]}
    open_sheets(c)
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-do=paste]')", what='the Fiches list is drawn')
    c.tap(f'{M} {SHEETS} [data-do="paste"]')
    c.page.fill(f'{M} {SHEETS} textarea[data-k="pastetext"]', json.dumps(reply))
    c.tap(f'{M} {SHEETS} [data-do="pasteread"]')
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-review] [data-do=apply]')", what='the review of the pasted sheet')
    paths = c.js(f"[...document.querySelectorAll('{M} {SHEETS} [data-review] input[data-path]')].map(i => i.dataset.path)")
    c.ok(not any(p == 'sheets' or p.startswith('sheets.') for p in paths), f'{paths}', 'no "sheets" field is proposed')
    c.ok({'cruise.tasKt', 'usableFuel', 'climb.tasKt'} <= set(paths), f'{paths}', 'the fields of the sheet inside are proposed one by one')
    c.eq(sheet_of(c, 'EC25')['usableFuel'], 2000, 'nothing is written before « Appliquer »', what='file before apply')
    c.page.uncheck(f'{M} {SHEETS} [data-review] input[data-path="usableFuel"]')
    clear_notes(c)
    c.tap(f'{M} {SHEETS} [data-do="apply"]')
    d = c.until_doc('aircraft/sheets/EC25.json', lambda d: d and d['cruise']['tasKt'] == 150, 'the ticked fields are written')
    c.eq(d['usableFuel'], 2000, 'the unticked field keeps its value', what='usableFuel')
    c.eq(d['climb']['tasKt'], 80, 'a ticked field is written', what='climb.tasKt')
    c.eq(d['_fields']['cruise.tasKt']['source'], 'import', 'the stamp names the import', what='_fields')


@case('M10', 'Sheets: #aircraft?sheet=<id> opens the Fiches view on the editor of that sheet', 'M', tags=('aircraft',), designs=('standard',), screens=False,
      rule='modules/aircraft INTEGRATION: the address Fuel\'s list gives for any change; taken once (ctx.consume) and removed from the address')
def m10(c):
    open_sheets(c, view=None, target='aircraft?sheet=EC25')
    c.until(f"!!document.querySelector('{M} {SHEETS} input[data-path=\"usableFuel\"]')", timeout=15000, what='the editor of EC25 is drawn')
    c.eq(c.js(f"document.querySelector('{M} {SHEETS} input[data-path=\"usableFuel\"]').value"), '2000', 'it is the sheet EC25', what='usableFuel')
    c.eq(pressed(c), ['sheets'], 'the Fiches tab is pressed', what='pressed tab')
    c.until("!/sheet=/.test(location.hash)", what='the request is taken once: removed from the address')
    c.tap(f'{M} {SHEETS} [data-do="back"]')
    c.until(f"document.querySelectorAll('{M} {SHEETS} [data-id]').length === 3", what='« ← Fiches » goes back to the list')


@case('M11', 'Sheets: remove a sheet after the question', 'M', tags=('aircraft',), designs=('standard',), screens=False, langs4=True,
      rule='modules/aircraft SPEC 4 and frame INTEGRATION: ctx.ask for every removal (never a native dialog); sheets.remove writes nothing else')
def m11(c):
    open_sheets(c)
    edit_sheet(c, 'A320')
    c.tap(f'{M} {SHEETS} [data-do="del"]')
    c.until("!!document.querySelector('.f-modal [data-ok]')", what='a question is asked')
    c.ok('A320' in (c.text('.f-modal p') or ''), c.text('.f-modal p'), 'the question names the sheet')
    c.tap('.f-modal [data-no]')
    c.until("!document.querySelector('.f-modal')", what='« Annuler » closes the question')
    c.eq(sheet_of(c, 'A320')['usableFuel'], 18000, 'nothing is removed', what='file after cancel')
    c.tap(f'{M} {SHEETS} [data-do="del"]')
    c.until("!!document.querySelector('.f-modal [data-ok]')", what='asked again')
    c.tap('.f-modal [data-ok]')
    c.until_doc('aircraft/sheets/A320.json', lambda d: d is None, 'the sheet file is removed')
    c.until(f"document.querySelectorAll('{M} {SHEETS} [data-id]').length === 2", what='back on the list without it')
    c.eq(sorted(sheet_ids(c)), ['C30J', 'EC25'], 'the other sheets stay', what='rows')
    c.eq(sheet_of(c, 'C30J')['usableFuel'], 20000, 'the other files are untouched', what='C30J')
