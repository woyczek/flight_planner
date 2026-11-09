"""Area M - the aircraft module of the Maintenance application (modules/aircraft/SPEC.md; V3_SPECIFICATION section 10.34, lot A2).

The fleet (airline/fleet.json): list and search, add, edit (the changed fields said before writing), retire (a question), every write
reading the file just before. Invented aircraft only."""
import json
import re
from pathlib import Path

from lib import ROOT, case, norm, tx, tx_row

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


def help_placed(c):
    """Waits for the frame's « Comment s'en servir » panel above the module: the frame inserts it after the module is drawn, and under
    the load of a full pass it came late — the whole screen moved down between the locating of a control and the tap, which then hit
    the row below (M3 edited another aircraft) or nothing (M2's « Ajouter »)."""
    c.until(f"() => {{ const m = document.querySelector('{M}'); return !!m && !!m.parentElement?.querySelector(':scope > .f-help') }}", timeout=15000,
            what='the help panel of the module is placed (no more layout shift)')
    c.settle()


def open_fleet(c, n=3):
    c.open('aircraft', docs=LEVEL3 + [['airline/fleet.json', fleet_doc(n), 'document']], wait=False, app='maintenance')
    c.until(f"!!document.querySelector('{M} [data-pane=fleet]')", timeout=15000, what='the fleet list is drawn')
    help_placed(c)


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
    help_placed(c)


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


@case('M7', 'Sheets: the editor shows every field of the schema with its value and, on a filled field, a mark that gives its origin and date', 'M', tags=('aircraft',),
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
    o = c.js(f"""(() => {{ const t = p => ((document.querySelector('{M} {SHEETS} [data-origin="' + p + '"]') || {{ getAttribute: () => '' }}).getAttribute('title') || '').trim();
        return {{ lnm: t('cruise.tasKt'), edit: t('usableFuel'), none: t('descent.tasKt'), count: document.querySelectorAll('{M} {SHEETS} .ac-mark[data-origin]').length }} }})()""")
    c.ok(o['lnm'].startswith('lnmperf') and '28' in o['lnm'], o['lnm'], 'cruise.tasKt: « lnmperf · 28/10 »')
    c.ok(norm(o['edit']).startswith(src_name(c, 'edit')) and '28' in o['edit'], o['edit'], 'usableFuel: « édité · 28/10 » in the language of the run')
    c.eq(o['none'], '', 'a field without a value has no origin line', what='empty field')
    c.ok(o['count'] >= 4, f"{o['count']}", 'one origin mark on each filled field')
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
    c.until(f"((document.querySelector('{M} {SHEETS} [data-origin=\"cruise.tasKt\"]')?.getAttribute('title')) || '').trim().startsWith('{src_name(c, 'edit')}')",
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


# ---------------------------------------------------------------- the writes of the Fiches view that had no case (SPEC as a state, 30 Oct 2026)
@case('M12', 'Sheets: a new sheet for a type the base does not know, and « Créer la fiche » for a company type; both through the review', 'M',
      tags=('aircraft',), designs=('standard',), screens=False, langs4=True,
      rule='modules/aircraft SPEC 4: a new sheet takes the code asked (ctx.askText) or the company type, a type unknown to the base is a sheet of '
      'that id and nothing more; nothing is written before « Appliquer »')
def m12(c):
    open_sheets(c)
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-do=new]')", what='« Nouvelle fiche » is offered')
    c.tap(f'{M} {SHEETS} [data-do="new"]')
    c.until("!!document.querySelector('.f-modal [data-in]')", what='the code is asked')
    c.page.fill('.f-modal [data-in]', 'zz99')
    c.tap('.f-modal [data-ok]')
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-review] [data-do=apply]')", what='the new sheet is shown for review')
    c.eq(c.doc('aircraft/sheets/ZZ99.json'), None, 'nothing is written before « Appliquer »', what='file before apply')
    clear_notes(c)
    c.tap(f'{M} {SHEETS} [data-do="apply"]')
    d = c.until_doc('aircraft/sheets/ZZ99.json', lambda d: d is not None, 'the new sheet is written')
    c.eq((d.get('id'), d.get('icao')), ('ZZ99', 'ZZ99'), 'the code typed, in capitals, is its id and its type', what='new sheet')
    # a company type without a sheet (the fleet has A400, no sheet): « Créer la fiche » takes its code without asking
    open_sheets(c)
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-type=\"A400\"] [data-do=newfor]')", what='the company type A400 offers « Créer la fiche »')
    c.tap(f'{M} {SHEETS} [data-type="A400"] [data-do="newfor"]')
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-review] [data-do=apply]')", what='the sheet of A400 is shown for review')
    c.eq(c.count('.f-modal'), 0, 'no question: the company type gives the code', what='question')
    clear_notes(c)
    c.tap(f'{M} {SHEETS} [data-do="apply"]')
    c.until_doc('aircraft/sheets/A400.json', lambda d: d is not None and d.get('id') == 'A400', 'the sheet of the company type is written')


@case('M13', 'Sheets: a file imported is previewed field by field; only the ticked fields are written, stamped as an import', 'M', tags=('aircraft',),
      designs=('standard',), screens=False,
      rule='modules/aircraft SPEC 4: « Importer » takes a file (.csv, .json, .lnmperf, .xml); the result is a preview; an unticked field keeps its value; '
      'the write goes through sheets.put with the source of the import (the formats themselves: the sheets bench, F10)')
def m13(c):
    open_sheets(c)
    body = json.dumps({'sheets': [{'id': 'EC25', 'usableFuel': 2311, 'cruise': {'tasKt': 152, 'fuelFlowPerHour': 650}}]})
    c.page.set_input_files(f'{M} {SHEETS} input[data-file]', files=[{'name': 'ec25.json', 'mimeType': 'application/json', 'buffer': body.encode()}])
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-review] [data-do=apply]')", what='the review of the imported file')
    paths = c.js(f"[...document.querySelectorAll('{M} {SHEETS} [data-review] input[data-path]')].map(i => i.dataset.path)")
    c.ok({'usableFuel', 'cruise.tasKt'} <= set(paths), f'{paths}', 'the changed fields are proposed one by one')
    c.eq(sheet_of(c, 'EC25')['cruise']['tasKt'], 141, 'nothing is written before « Appliquer »', what='file before apply')
    c.page.uncheck(f'{M} {SHEETS} [data-review] input[data-path="usableFuel"]')
    clear_notes(c)
    c.tap(f'{M} {SHEETS} [data-do="apply"]')
    d = c.until_doc('aircraft/sheets/EC25.json', lambda d: d and d['cruise']['tasKt'] == 152, 'the ticked field is written')
    c.eq(d['usableFuel'], 2000, 'the unticked field keeps its value', what='usableFuel')
    c.eq(d['_fields']['cruise.tasKt']['source'], 'import', 'the stamp names the import', what='_fields')


@case('M14', 'Sheets: « Compléter depuis une autre fiche » fills only the empty fields, through the review', 'M', tags=('aircraft',),
      designs=('standard',), screens=False,
      rule='modules/aircraft SPEC 4 (aerodb lib, fillProfileGaps): only the empty fields are taken from the other sheet, fuel in the sheet\'s unit; '
      'nothing is written before « Appliquer »; a filled field is never replaced')
def m14(c):
    open_sheets(c)
    edit_sheet(c, 'C30J')
    c.tap(f'{M} {SHEETS} [data-do="fillopen"]')
    c.page.fill(f'{M} {SHEETS} input[data-k="fillq"]', 'EC25')
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-fillres] [data-do=fill][data-id=EC25]')", what='EC25 found by the search')
    c.tap(f'{M} {SHEETS} [data-fillres] [data-do="fill"][data-id="EC25"]')
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-review] [data-do=apply]')", what='the review of the completion')
    paths = c.js(f"[...document.querySelectorAll('{M} {SHEETS} [data-review] input[data-path]')].map(i => i.dataset.path)")
    c.ok('maxCrosswindKt' in paths and 'usableFuel' not in paths and 'cruise.tasKt' not in paths, f'{paths}',
         'the field C30J lacks (maxCrosswindKt) is proposed; its filled fields are not')
    clear_notes(c)
    c.tap(f'{M} {SHEETS} [data-do="apply"]')
    d = c.until_doc('aircraft/sheets/C30J.json', lambda d: d and d.get('maxCrosswindKt') == 17, 'the empty field is filled')
    c.eq((d['usableFuel'], d['cruise']['tasKt']), (20000, 330), 'the filled fields keep their values', what='C30J')


@case('M19', 'Sheets: a paste of several sheets names each review and its rank, passes the unchanged ones, can skip one, ends with a summary',
      'M', tags=('aircraft',), designs=('standard',), screens=False, langs4=True,
      rule='the user, 1 Nov (thirteen sheets pasted, a review without the sheet\'s name): each review of an existing sheet says « Changements '
      'proposés : <sheet> » and its rank i / n; an existing sheet without change is passed without a click; « Passer cette fiche » goes to the '
      'next one, writing nothing; an existing note is replaced only when ticked by hand; the end says written, unchanged, skipped; '
      '« Annuler » drops the rest of the queue')
def m19(c):
    ec25 = dict(EC25, notes='Note gardée.')
    docs = [[f'aircraft/sheets/{x["id"]}.json', x, 'document'] for x in (ec25, C30J, A320)]
    c.open('aircraft', docs=LEVEL3 + [['airline/fleet.json', fleet_doc(3), 'document']] + docs + [TYPES, ['cache/aircraft/ui.json', {'view': 'sheets'}, 'cache']],
           wait=False, app='maintenance')
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-do=paste]')", timeout=15000, what='the Fiches list is drawn')
    help_placed(c)
    reply = {'sheets': [{'id': 'A320', 'usableFuel': 18000}, {'id': 'EC25', 'cruise': {'tasKt': 150}, 'notes': 'Réponse de ChatGPT.'},
                        {'id': 'C30J', 'usableFuel': 21000}, {'id': 'XNEW', 'name': 'XNEW', 'icao': 'XNEW', 'usableFuel': 500}]}
    c.tap(f'{M} {SHEETS} [data-do="paste"]')
    c.page.fill(f'{M} {SHEETS} textarea[data-k="pastetext"]', json.dumps(reply))
    c.tap(f'{M} {SHEETS} [data-do="pasteread"]')
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-review] [data-do=apply]')", what='the first review')
    head = norm(c.text(f'{M} {SHEETS} [data-review] h2') or '')
    c.ok(norm(tx(SX, 'reviewOf', c.lang).replace('{n}', 'EC25')) in head and '2 / 4' in head, head,
         'the unchanged A320 is passed; the review names EC25 and its rank 2 / 4')
    boxes = dict(c.js(f"[...document.querySelectorAll('{M} {SHEETS} [data-review] input[data-path]')].map(i => [i.dataset.path, i.checked])"))
    c.eq([boxes.get('cruise.tasKt'), boxes.get('notes')], [True, False], 'a changed value is ticked, the replaced note is not', what='ticks')
    label = c.js(f"[...document.querySelectorAll('{M} {SHEETS} [data-review] tr')].find(r => r.querySelector('input[data-path=notes]'))?.children[1].textContent.trim()")
    c.eq(label, tx(SX, 'notes', c.lang, after='PATH_TX'), 'the field « notes » is named in the language of the screen', what='label')
    c.tap(f'{M} {SHEETS} [data-do="skipsheet"]')
    c.until(f"(document.querySelector('{M} {SHEETS} [data-review] h2')?.textContent || '').includes('C-130J · ')", what='« Passer cette fiche » goes to C30J (named C-130J)')
    c.tap(f'{M} {SHEETS} [data-do="apply"]')
    c.until(f"(document.querySelector('{M} {SHEETS} [data-review] h2')?.textContent || '').includes('XNEW')", what='then the new sheet XNEW, 4 / 4')
    clear_notes(c)
    c.tap(f'{M} {SHEETS} [data-do="apply"]')
    want = norm(tx(SX, 'batchDone', c.lang).replace('{a}', '2').replace('{s}', '1').replace('{k}', '1'))
    c.until("(w) => (window.__notes || []).some(n => n.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim() === w)", want, what='the end says 2 written, 1 unchanged, 1 skipped')
    c.eq(sheet_of(c, 'C30J')['usableFuel'], 21000, 'the applied sheet is written', what='C30J')
    c.eq(sheet_of(c, 'EC25')['cruise']['tasKt'], 141, 'the skipped sheet is untouched', what='EC25')
    c.ok(sheet_of(c, 'XNEW') is not None, '', 'the new sheet is created')
    # « Annuler » drops the queue: a second paste cancelled on its first review, then nothing comes back
    c.tap(f'{M} {SHEETS} [data-do="paste"]')
    c.page.fill(f'{M} {SHEETS} textarea[data-k="pastetext"]', json.dumps({'sheets': [{'id': 'C30J', 'usableFuel': 22000}, {'id': 'A320', 'usableFuel': 19000}]}))
    c.tap(f'{M} {SHEETS} [data-do="pasteread"]')
    c.until(f"(document.querySelector('{M} {SHEETS} [data-review] h2')?.textContent || '').includes('C-130J')", what='the review of the second paste')
    c.tap(f'{M} {SHEETS} [data-do="cancel"]')
    c.until(f"!document.querySelector('{M} {SHEETS} [data-review]')", what='« Annuler » closes the review and the queue')
    c.eq([sheet_of(c, 'C30J')['usableFuel'], sheet_of(c, 'A320')['usableFuel']], [21000, 18000], 'nothing of the cancelled paste is written', what='cancel')


@case('M20', 'Fleet: the type field suggests the types of the base and the sheets; a choice writes the type code', 'M', tags=('aircraft',),
      designs=('standard',), screens=False, langs4=True,
      rule='Simplification 1 Nov (the user: « aucune complétion sur le type », adding an H145): typed in part and in lower case, the type '
           'field lists the types of the base (code, name, « fiche <id> » when a sheet has that type) and the sheets whose id, name or type '
           'contains the text, seven at most; a choice writes the code, the rest of the form unchanged; the fleet keeps the type only '
           '(schema 1, no sheet field)')
def m20(c):
    c.open('aircraft', docs=LEVEL3 + [['airline/fleet.json', fleet_doc(3), 'document']] + SHEET_DOCS + [TYPES], wait=False, app='maintenance')
    c.until(f"!!document.querySelector('{M} [data-pane=fleet]')", timeout=15000, what='the fleet list is drawn')
    help_placed(c)
    c.tap(f'{M} [data-do="add"]')
    c.until(f"!!document.querySelector('{M} [data-pane=edit]')", what='the editor opens')
    c.page.fill(f'{M} [data-f="registration"]', 'F-TST9')
    c.page.click(f'{M} [data-f="type"]')
    c.page.keyboard.type('ec2')
    c.until(f"!!document.querySelector('{M} [data-typesug]:not([hidden]) [data-code=\"EC25\"]')", timeout=8000,
            what='« ec2 » typed in lower case: EC25 is proposed')
    item = norm(c.text(f'{M} [data-typesug] [data-code="EC25"]') or '')
    c.ok(norm(tx(AC, 'typeSheet', c.lang).replace('{id}', 'EC25')) in item, item, 'the proposal says the sheet of that type')
    c.tap(f'{M} [data-typesug] [data-code="EC25"]')
    c.until(f"document.querySelector('{M} [data-f=type]').value === 'EC25'", what='the choice writes the type code')
    c.ok(c.js(f"document.querySelector('{M} [data-typesug]').hidden"), '', 'the list is closed')
    c.until(f"(w) => (document.querySelector('{M} [data-typeinfo]') || {{}}).textContent.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim() !== w",
            norm(tx(AC, 'typeFree', c.lang)), what='a type of the base: not said « absent »')
    # a sheet found by its name (« C-130J »): its type proposed
    c.page.fill(f'{M} [data-f="type"]', '')
    c.page.click(f'{M} [data-f="type"]')
    c.page.keyboard.type('c-1')
    c.until(f"!!document.querySelector('{M} [data-typesug]:not([hidden]) [data-code=\"C30J\"]')", timeout=8000,
            what='the sheet named C-130J proposes its type C30J')
    c.page.keyboard.press('ArrowDown')
    c.page.keyboard.press('Enter')
    c.until(f"document.querySelector('{M} [data-f=type]').value === 'C30J'", what='↓ then Entrée choose it')
    c.page.fill(f'{M} [data-f="callsigns"]', 'dragon35')
    clear_notes(c)
    c.tap(f'{M} [data-do="save"]')
    d = c.until_doc('airline/fleet.json', lambda d: d and any(a['registration'] == 'F-TST9' for a in d['aircraft']), 'the aircraft is added')
    a = next(a for a in d['aircraft'] if a['registration'] == 'F-TST9')
    c.eq([a['type'], a['callsigns'], 'sheetId' in a], ['C30J', ['DRAGON35'], False], 'the type code, the callsign; no sheet field (schema 1)',
         what='written')


@case('M21', 'Site: a page address of airline/settings.json is used only when it reads as an http(s) URL', 'M', tags=('aircraft',),
      designs=('standard',), screens=False,
      rule='security audit line 157 (any pilot writes airline/settings.json since § 10.36): pageUrl gives a link or a reading only for an '
      'http or https URL without credentials; « javascript: », « data: », credentials or an unreadable address give nothing')
def m21(c):
    c.page.goto(f'{c.base}/frame/manifest.webmanifest')
    got = c.js("""async () => { const W = await import('/modules/website/model.js');
      const at = (site, log) => W.pageUrl(W.airlineSettings({ site, pages: { log } }), 'log');
      return [at('https://site.test', '/log'), at('javascript:alert(1)', '/log'), at('https://site.test', 'javascript:alert(1)'),
        at('', 'data:text/html,x'), at('https://u:p@site.test', '/log'), at('https://site.test', ''), at('http://site.test', 'https://other.test/log')] }""")
    c.eq(got, ['https://site.test/log', '', 'https://site.test/javascript:alert(1)', '', '', '', 'https://other.test/log'],
         'an http(s) address is kept; javascript:, data:, credentials, nothing give no address', what='pageUrl')


@case('M22', 'Sheets: « Compléter avec ChatGPT » copies the request and opens ChatGPT in one gesture', 'M', tags=('aircraft',),
      designs=('standard',), screens=False, langs4=True,
      rule='SOG-0014 (regression of 4044dc8ba: the V2 gesture copied the prompt and opened ChatGPT): in the sheet editor, the button '
      'puts the request in its box (copied) and opens chatgpt.com in a new tab; the answer comes back by paste (M15)')
def m22(c):
    open_sheets(c)
    edit_sheet(c, 'EC25')
    c.js("(() => { window.__opened = []; window.open = (u, t, f) => { window.__opened.push([u, t, f]); return null } })()")
    c.js(f"(() => {{ const d = document.querySelector('{M} {SHEETS} [data-do=gpt]').closest('details'); if (d) d.open = true }})()")
    c.eq(norm(c.text(f'{M} {SHEETS} [data-do="gpt"]') or ''), norm(tx(SX, 'gptPrompt', c.lang)), 'the button says « Compléter avec ChatGPT »',
         what='label')
    c.tap(f'{M} {SHEETS} [data-do="gpt"]')
    c.until("(window.__opened || []).length === 1", what='ChatGPT is opened')
    url, target, feat = c.js('window.__opened[0]')
    prompt = c.js(f"document.querySelector('{M} {SHEETS} textarea[data-k=gptprompt]').value")
    c.ok(url.startswith('https://chatgpt.com/') and target == '_blank' and 'noopener' in (feat or ''), url[:80], 'chatgpt.com, a new tab, no opener')
    c.ok(len(prompt) > 200 and 'EC25' in prompt, prompt[:80], 'the request is in its box, naming the sheet')
    c.ok(url == 'https://chatgpt.com/' if len(prompt) >= 7000 else '?q=' in url, url[:80], 'the request in the address when it is short enough')


@case('M23', 'Sheets: « Carburant en volume » and « Densité » say what they are; a density out of 0.5–1.0 is refused, said', 'M',
      tags=('aircraft',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0011: a help line under each of the two fields (volume = litres or gallons as the simulator shows them; density = kg per litre '
      'of the fuel, Jet A-1 0.80, Avgas 0.72, the airline\'s value when empty); a density outside 0.5–1.0 is refused with the message, '
      'nothing written')
def m23(c):
    open_sheets(c)
    edit_sheet(c, 'EC25')
    for path in ('fuelAsVolume', 'fuelDensityKgPerL'):
        got = norm(c.text(f'{M} {SHEETS} [data-help="{path}"]') or '')
        c.eq(got, norm(tx(SX, 'text', c.lang, after=f'{path}: {{') + ' ?'), f'the short line of {path} and its « ? »', what=path)
    c.page.fill(f'{M} {SHEETS} input[data-path="fuelDensityKgPerL"]', '8')
    clear_notes(c)
    c.tap(f'{M} {SHEETS} [data-do="save"]')
    c.until("(w) => (window.__notes || []).some(n => n.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim().includes(w))",
            norm(tx(SX, 'outOfRange', c.lang).split('{v}')[1].split('{min}')[0]), what='a density of 8 is refused, said')
    c.eq(c.count(f'{M} {SHEETS} [data-review]'), 0, 'no review: nothing to write', what='refused')


@case('M24', 'Sheets: an RPM curve whose flow goes down while the RPM goes up is said, its row marked, never corrected', 'M', tags=('aircraft',),
      designs=('standard',), screens=True, phone=False, langs4=True,
      rule='SOG-0015 (the S210: 11 500 lb/h at 6 700 rpm, above the cruise 7 300 lb/h at 7 250 rpm): « Débit à 6700 rpm supérieur à celui '
      'de 7250 rpm : fourchette mal lue ? », the row in orange; nothing written')
def m24(c):
    bad = dict(EC25, id='XRPM', name='XRPM', icao='XRPM', unit='lb', cruise={'tasKt': 300, 'fuelFlowPerHour': 7300, 'rpmNominal': 7250},
               rpmFuelCurve=[{'rpm': 6700, 'altFt': None, 'fuelFlowPerHour': 11500}, {'rpm': 4500, 'altFt': None, 'fuelFlowPerHour': 2000}])
    docs = [[f'aircraft/sheets/{x["id"]}.json', x, 'document'] for x in (EC25, C30J, bad)]
    c.open('aircraft', docs=LEVEL3 + [['airline/fleet.json', fleet_doc(3), 'document']] + docs + [TYPES, ['cache/aircraft/ui.json', {'view': 'sheets'}, 'cache']],
           wait=False, app='maintenance')
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-id]')", timeout=15000, what='the Fiches list')
    help_placed(c)
    edit_sheet(c, 'XRPM')
    want = norm(tx(SX, 'rpmNotMonotone', c.lang).replace('{a}', '6700').replace('{b}', '7250'))
    c.until("(w) => (document.querySelector('[data-module=aircraft] [data-rpmwarn]')?.textContent || '').replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim() === w",
            want, what='the curve going down is said')
    c.eq(c.count(f'{M} {SHEETS} tr[data-rpmwarn-row]'), 1, 'the row of 6700 rpm is marked', what='row')
    c.eq(sheet_of(c, 'XRPM')['rpmFuelCurve'][0]['fuelFlowPerHour'], 11500, 'nothing is corrected', what='kept')


@case('M26', 'Sheets: each altitude of the RPM table is its own curve; one going down is said with its altitude, its row marked; altitudes never mixed',
      'M', tags=('aircraft',), designs=('standard',), screens=True, phone=False, langs4=True,
      rule='SOG-0028, V3 spec 10.37 C (curves per altitude: the rows of rpmFuelCurve sharing altFt, the reading of FlightPerfModel.mapAt): the '
      'rule of SOG-0015 applies to each altitude apart: « Débit à 2300 rpm supérieur à celui de 2500 rpm à 8000 ft »; a lower flow at a '
      'higher altitude is no fault; nothing written')
def m26(c):
    alt = dict(EC25, id='XALT', name='XALT', icao='XALT', unit='kg', cruise={'tasKt': 140, 'fuelFlowPerHour': 40, 'rpmNominal': 2400},
               rpmFuelCurve=[{'rpm': 2300, 'altFt': 4000, 'fuelFlowPerHour': 38}, {'rpm': 2500, 'altFt': 4000, 'fuelFlowPerHour': 46},
                             {'rpm': 2300, 'altFt': 8000, 'fuelFlowPerHour': 36}, {'rpm': 2500, 'altFt': 8000, 'fuelFlowPerHour': 33}])
    docs = [[f'aircraft/sheets/{x["id"]}.json', x, 'document'] for x in (EC25, C30J, alt)]
    c.open('aircraft', docs=LEVEL3 + [['airline/fleet.json', fleet_doc(3), 'document']] + docs + [TYPES, ['cache/aircraft/ui.json', {'view': 'sheets'}, 'cache']],
           wait=False, app='maintenance')
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-id]')", timeout=15000, what='the Fiches list')
    edit_sheet(c, 'XALT')
    want = norm(tx(SX, 'rpmNotMonotoneAt', c.lang).replace('{a}', '2300').replace('{b}', '2500').replace('{h}', '8000'))
    c.until("(w) => (document.querySelector('[data-module=aircraft] [data-rpmwarn]')?.textContent || '').replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim() === w",
            want, what='the 8000 ft curve going down is said with its altitude')
    c.eq(c.count(f'{M} {SHEETS} tr[data-rpmwarn-row]'), 1, 'one row marked: 2300 rpm of the 8000 ft curve, not the one of 4000 ft', what='rows')
    c.eq(sheet_of(c, 'XALT')['rpmFuelCurve'][3]['fuelFlowPerHour'], 33, 'nothing is corrected', what='kept')


def _journal(path):
    """An invented Fuel Phase Monitor journal (never a measurement of the user): XMES at 4000 ft / 2300 rpm (38 kg/h, 120 s) and
    8000 ft / 2500 rpm (40 kg/h, 120 s), plus a window of another type."""
    head = ['schema_version', 'aircraft_icao', 'aircraft_file', 'registration', 'flight_id', 'phase', 'duration_sec', 'mean_fuel_flow_kg_h',
            'fuel_coverage_pct', 'engine_count', 'engine_fuel_flow_kg_h', 'mean_pressure_altitude_ft', 'mean_ias_kt', 'mean_tas_kt',
            'mean_vertical_speed_fpm', 'mean_engine_rpm', 'quality_flags']
    rows = []
    for alt, rpm, ff in [(4000, 2300, 38)] * 8 + [(8000, 2500, 40)] * 8:
        rows.append(['0.4.1', 'XMES', 'x.acf', 'F-TEST', 'A', 'CRUISE', 15, ff, 100, 1, ff, alt, 150, 170, 0, rpm, ''])
    rows.append(['0.4.1', 'ZZZZ', 'z.acf', 'F-ZZZZ', 'B', 'CRUISE', 15, 90, 100, 1, 90, 6000, 150, 170, 0, 2400, ''])
    Path(path).write_text('\n'.join(','.join(str(x) for x in r) for r in [head] + rows), encoding='utf-8')


@case('M27', 'Sheets: « Proposer depuis les mesures » reads Fuel Phase Monitor journals, lists the level points with their deviation from the curve of the same altitude; the ticked ones go to the draft, nothing written',
      'M', tags=('aircraft',), designs=('standard',), screens=True, phone=False, langs4=True,
      rule='SOG-0052, V3 spec 10.37 C (« Proposer depuis les mesures », step 1): journals chosen with the file picker, read in the page '
      '(modules/stats/phases.js), only the type of the sheet; each point accepted one by one into the draft; never written alone (JSON one source)')
def m27(c):
    import tempfile
    sheet = dict(EC25, id='XMES', name='XMES', icao='XMES', unit='kg', cruise={'tasKt': 140, 'fuelFlowPerHour': 40, 'rpmNominal': 2400},
                 rpmFuelCurve=[{'rpm': 2200, 'altFt': 4000, 'fuelFlowPerHour': 35}, {'rpm': 2400, 'altFt': 4000, 'fuelFlowPerHour': 45}])
    sheet.pop('_fields', None)
    docs = [[f'aircraft/sheets/{x["id"]}.json', x, 'document'] for x in (EC25, C30J, sheet)]
    c.open('aircraft', docs=LEVEL3 + [['airline/fleet.json', fleet_doc(3), 'document']] + docs + [TYPES, ['cache/aircraft/ui.json', {'view': 'sheets'}, 'cache']],
           wait=False, app='maintenance')
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-id]')", timeout=15000, what='the Fiches list')
    edit_sheet(c, 'XMES')
    with tempfile.TemporaryDirectory() as tmp:
        f = Path(tmp) / 'FuelPhaseMonitor_test.csv'
        _journal(f)
        c.page.set_input_files(f'{M} {SHEETS} input[data-measfile]', str(f))
        c.until(f"document.querySelectorAll('{M} {SHEETS} [data-measrow]').length === 2", what='two level points of XMES (the other type left out)')
    rows = c.js(f"[...document.querySelectorAll('{M} {SHEETS} [data-measrow]')].map(l => [l.dataset.measrow, l.textContent.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim()])")
    c.eq([r[0] for r in rows], ['4000|2300', '10000|2500'], 'per level of the ladder (8000 ft → FL100, SOG-0075) and rpm', what='points')
    delta = norm(tx(SX, 'measDelta', c.lang).replace('{v}', '40').replace('{d}', '-5'))
    c.ok(delta in rows[0][1], rows[0][1], 'the 4000 ft point against the 4000 ft curve of the sheet (40 kg/h at 2300 rpm): -5 %')
    c.ok(norm(tx(SX, 'measNew', c.lang)) in rows[1][1], rows[1][1], 'no FL100 curve in the sheet: a new row')
    c.page.check(f'{M} {SHEETS} [data-measrow="10000|2500"] input')
    c.tap(f'{M} {SHEETS} [data-do="measadd"]')
    c.until(f"""[...document.querySelectorAll('{M} {SHEETS} input[data-rpm][data-rk=rpm]')].map(i => i.value).join(',') === '2200,2400,2500'""",
            what='the ticked point is a row of the draft')
    c.eq(c.js(f"[...document.querySelectorAll('{M} {SHEETS} input[data-rpm][data-rk=altFt]')].map(i => i.value)"), ['4000', '4000', '10000'],
         'the new row at FL100', what='altitudes')
    c.eq(len(sheet_of(c, 'XMES')['rpmFuelCurve']), 2, 'nothing written before « Enregistrer » and « Appliquer »', what='stored rows')


@case('M28', 'Sheets: the RPM table is one folding group per altitude (« 8000 ft · 2 régimes »), a TAS column per row; a group keeps its state when the editor is drawn again',
      'M', tags=('aircraft',), designs=('standard',), screens=True, phone=False, langs4=True,
      rule='SOG-0028 (3) and (4), V3 spec 10.37 C as amended (the curve of an altitude = the rows sharing altFt): more than two curves → '
      'folded groups, the rows without altitude first; one curve → the flat table as before; tasKt optional per row')
def m28(c):
    sheet = dict(EC25, id='XGRP', name='XGRP', icao='XGRP', unit='kg', cruise={'tasKt': 140, 'fuelFlowPerHour': 40, 'rpmNominal': 2400},
                 rpmFuelCurve=[{'rpm': 2300, 'altFt': 4000, 'fuelFlowPerHour': 38, 'tasKt': 150}, {'rpm': 2500, 'altFt': 4000, 'fuelFlowPerHour': 46},
                               {'rpm': 2300, 'altFt': 8000, 'fuelFlowPerHour': 34}, {'rpm': 2500, 'altFt': 8000, 'fuelFlowPerHour': 40},
                               {'rpm': 2000, 'altFt': None, 'fuelFlowPerHour': 30}])
    sheet.pop('_fields', None)
    docs = [[f'aircraft/sheets/{x["id"]}.json', x, 'document'] for x in (EC25, C30J, sheet)]
    c.open('aircraft', docs=LEVEL3 + [['airline/fleet.json', fleet_doc(3), 'document']] + docs + [TYPES, ['cache/aircraft/ui.json', {'view': 'sheets'}, 'cache']],
           wait=False, app='maintenance')
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-id]')", timeout=15000, what='the Fiches list')
    edit_sheet(c, 'XGRP')
    groups = "[...document.querySelectorAll('[data-module=aircraft] details[data-rpmgroup]')].map(d => [d.dataset.rpmgroup, d.open, d.querySelector('summary').textContent.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim()])"
    g = c.js(groups)
    n2 = tx(SX, 'rpmN', c.lang).replace('{n}', '2')
    c.eq(g, [['', False, norm(f"{tx(SX, 'rpmNoAlt', c.lang)} · {tx(SX, 'rpmN1', c.lang)}")], ['4000', False, norm(f'4000 ft · {n2}')], ['8000', False, norm(f'8000 ft · {n2}')]],
         'three curves: three folded groups, the rows without altitude first', what='groups')
    c.eq(c.js(f"document.querySelector('{M} {SHEETS} input[data-rpm=\"0\"][data-rk=tasKt]')?.value"), '150', 'the TAS of a row, in its column', what='tasKt')
    c.js("document.querySelector('[data-module=aircraft] details[data-rpmgroup=\"8000\"]').open = true")
    c.tap(f'{M} {SHEETS} [data-do="rpmadd"]')
    c.until(f"document.querySelectorAll('{M} {SHEETS} input[data-rpm][data-rk=rpm]').length === 6", what='a row is added')
    g = c.js(groups)
    c.eq([x[:2] for x in g], [['', True], ['4000', False], ['8000', True]], 'the 8000 ft group stays open; the group of the new empty row opens', what='after redraw')


_LAUNCHER_STATUS = {'server': True, 'root': '', 'git': True, 'data': False, 'dataGit': False, 'dataRepo': '', 'lfs': False, 'csp': True,
                    'relaxNav': False, 'host': 'TEST', 'lan': False}


def _output_launcher(c, status, text):
    """A FAKE launcher (c.context.route on /__setup/, never a real one) that knows the job stats/output: `status` is what action
    status answers, `text` the journal action read gives; the posted bodies are recorded in st['posts']."""
    import urllib.parse
    st = {'posts': []}

    def handler(route):
        req = route.request
        u = urllib.parse.urlparse(req.url)
        code, body = 200, {}
        if u.path.endswith('/__setup/status'):
            body = _LAUNCHER_STATUS
        elif u.path.endswith('/__setup/regen/job') and req.method == 'POST':
            st['posts'].append(json.loads(req.post_data or '{}'))
            body = {'job': f"j{len(st['posts'])}"}
        elif u.path.endswith('/__setup/regen/job'):
            a = (st['posts'][-1].get('args') or {}) if st['posts'] else {}
            res = (status if a.get('action') == 'status' else {'ok': True, 'name': a.get('name'), 'size': len(text), '_text': text} if a.get('action') == 'read'
                   else {'ok': True, 'set': True} if a.get('action') == 'set' else {'ok': False, 'reason': 'unknown'})
            body = {'id': f"j{len(st['posts'])}", 'state': 'done', 'step': '', 'done': 1, 'total': 1, 'unit': '', 'log': [], 'result': res}
        route.fulfill(status=code, content_type='application/json', body=json.dumps(body))
    c.context.route(re.compile(r'/__setup/'), handler)
    return st


@case('M29', 'Sheets: « Depuis le dossier Output » lists the journals of the workstation\'s X-Plane Output folder through the launcher, reads the ticked ones into the same proposals; without a folder, « Régler le dossier Output »',
      'M', tags=('aircraft',), designs=('standard',), screens=True, phone=False, langs4=True,
      rule='SOG-0052 step 2 (AeroDB 5f03149b8: the launcher job stats/output, status / set / read; the path never given whole, label = two last names): '
      'the button only when the job answers and the folder exists; a fake launcher, never a real one')
def m29(c):
    import tempfile
    sheet = dict(EC25, id='XMES', name='XMES', icao='XMES', unit='kg', cruise={'tasKt': 140, 'fuelFlowPerHour': 40, 'rpmNominal': 2400},
                 rpmFuelCurve=[{'rpm': 2200, 'altFt': 4000, 'fuelFlowPerHour': 35}, {'rpm': 2400, 'altFt': 4000, 'fuelFlowPerHour': 45}])
    sheet.pop('_fields', None)
    docs = [[f'aircraft/sheets/{x["id"]}.json', x, 'document'] for x in (EC25, C30J, sheet)]
    with tempfile.TemporaryDirectory() as tmp:
        f = Path(tmp) / 'j.csv'
        _journal(f)
        text = f.read_text(encoding='utf-8')
    status = {'ok': True, 'set': True, 'exists': True, 'label': 'X-Plane 12/Output', 'files': [{'name': 'FuelPhaseMonitor_1.csv', 'size': 2048, 'mtime': 1762600000}]}
    st = _output_launcher(c, status, text)
    open_at = lambda: c.open('aircraft', docs=LEVEL3 + [['airline/fleet.json', fleet_doc(3), 'document']] + docs + [TYPES, ['cache/aircraft/ui.json', {'view': 'sheets'}, 'cache']],
                             wait=False, app='maintenance')
    open_at()
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-id]')", timeout=15000, what='the Fiches list')
    edit_sheet(c, 'XMES')
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-do=outopen]')", what='« Depuis le dossier Output » (the job answers, the folder exists)')
    c.tap(f'{M} {SHEETS} [data-do="outopen"]')
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-outfile]')", what='the journals of the folder')
    c.ok('X-Plane 12/Output' in (c.text(f'{M} {SHEETS} [data-outlist]') or ''), c.text(f'{M} {SHEETS} [data-outlist]'), 'the folder said by its two last names')
    c.page.check(f'{M} {SHEETS} [data-outfile="0"]')
    c.tap(f'{M} {SHEETS} [data-do="outread"]')
    c.until(f"document.querySelectorAll('{M} {SHEETS} [data-measrow]').length === 2", what='the same proposals as a chosen file')
    reads = [x['args'] for x in st['posts'] if (x.get('args') or {}).get('action') == 'read']
    c.eq([st['posts'][0].get('set'), st['posts'][0].get('verb'), reads], ['stats', 'output', [{'action': 'read', 'name': 'FuelPhaseMonitor_1.csv'}]],
         'the job stats/output asked, the ticked journal read', what='posts')
    # no folder set on the workstation: « Régler le dossier Output », a text field, the setting sent to the launcher
    status.update({'set': False, 'exists': False, 'label': '', 'files': []})
    open_at()
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-id]')", timeout=15000, what='the Fiches list again')
    edit_sheet(c, 'XMES')
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-do=outsetopen]')", what='« Régler le dossier Output »')
    c.eq(c.count(f'{M} {SHEETS} [data-do=outopen]'), 0, 'no folder: no list button', what='outopen')
    c.tap(f'{M} {SHEETS} [data-do="outsetopen"]')
    c.page.fill(f'{M} {SHEETS} input[data-k=outfolder]', 'D:/X-Plane 12/Output')
    c.tap(f'{M} {SHEETS} [data-do="outsave"]')
    for _ in range(60):   # the POST leaves on the tap: wait for the fake launcher to receive it
        if any((x.get('args') or {}).get('action') == 'set' for x in st['posts']):
            break
        c.wait(100)
    sets = [x['args'] for x in st['posts'] if (x.get('args') or {}).get('action') == 'set']
    c.eq(sets, [{'action': 'set', 'folder': 'D:/X-Plane 12/Output'}], 'the folder sent to the launcher, set on the workstation', what='set')


@case('M30', 'Sheets: « Courbes » draws the flow against the rpm, one colour per altitude, a legend, and the measured points of « Proposer depuis les mesures » over it',
      'M', tags=('aircraft',), designs=('standard',), screens=True, phone=False, langs4=True,
      rule='SOG-0055 (decision: the drawing lives in Appareils, the flight tool adjusts the flight, not the data): one curve per altFt of rpmFuelCurve, '
      'the frame chart colours, the legend naming each altitude; the measured level points as squares, a curve\'s colour when at its altitude')
def m30(c):
    import tempfile
    sheet = dict(EC25, id='XMES', name='XMES', icao='XMES', unit='kg', cruise={'tasKt': 140, 'fuelFlowPerHour': 40, 'rpmNominal': 2400},
                 rpmFuelCurve=[{'rpm': 2200, 'altFt': 4000, 'fuelFlowPerHour': 35}, {'rpm': 2400, 'altFt': 4000, 'fuelFlowPerHour': 45},
                               {'rpm': 2200, 'altFt': 9000, 'fuelFlowPerHour': 30}, {'rpm': 2600, 'altFt': 9000, 'fuelFlowPerHour': 41}])
    sheet.pop('_fields', None)
    docs = [[f'aircraft/sheets/{x["id"]}.json', x, 'document'] for x in (EC25, C30J, sheet)]
    c.open('aircraft', docs=LEVEL3 + [['airline/fleet.json', fleet_doc(3), 'document']] + docs + [TYPES, ['cache/aircraft/ui.json', {'view': 'sheets'}, 'cache']],
           wait=False, app='maintenance')
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-id]')", timeout=15000, what='the Fiches list')
    edit_sheet(c, 'XMES')
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-curves]')", what='the « Courbes » fold')
    r = c.js(f"""() => {{ const d = document.querySelector('{M} {SHEETS} [data-curves]');
        return {{ curves: [...d.querySelectorAll('[data-curve]')].map(g => [g.dataset.curve, g.querySelectorAll('circle').length, g.querySelector('path').getAttribute('stroke')]),
                  legend: [...d.querySelectorAll('[data-legend] span')].map(s => s.textContent.trim()), title: d.querySelector('summary').textContent.trim() }} }}""")
    c.eq([r['title'], r['curves'], r['legend']], [norm(tx(SX, 'curves', c.lang)), [['4000', 2, 'var(--sog-chart-1)'], ['9000', 2, 'var(--sog-chart-2)']], ['4000 ft', '9000 ft']],
         'one curve per altitude, its colour, the legend', what='curves')
    with tempfile.TemporaryDirectory() as tmp:
        f = Path(tmp) / 'FuelPhaseMonitor_test.csv'
        _journal(f)
        c.page.set_input_files(f'{M} {SHEETS} input[data-measfile]', str(f))
        c.until(f"document.querySelectorAll('{M} {SHEETS} [data-curves] [data-measmark]').length === 2", what='the two measured points over the curves')
    strokes = c.js(f"[...document.querySelectorAll('{M} {SHEETS} [data-curves] [data-measmark]')].map(m => m.getAttribute('stroke'))")
    c.eq(strokes, ['var(--sog-chart-1)', 'var(--sog-muted)'], 'the 4000 ft point in the 4000 ft colour; FL100, no curve there: muted', what='marks')


@case('M31', 'Sheets: « Proposer depuis les mesures » also proposes the measured climb (rpm, flow, rate, IAS, throttle said); ticked, it fills the climb of the draft',
      'M', tags=('aircraft',), designs=('standard',), screens=True, phone=False, langs4=True,
      rule='SOG-0052 suite and SOG-0061 (user, 9 Nov: « les gaz impliquent directement les RPMs […] le throttle est probablement récupérable depuis '
      'les csv »): climb windows (vario ≥ 400 ft/min, 300 s and 20 windows at least) give the climb rpm, flow, rate and IAS; the throttle is said, '
      'never written (no field for it); nothing written before « Enregistrer » and « Appliquer »')
def m31(c):
    import tempfile
    sheet = dict(EC25, id='XMES', name='XMES', icao='XMES', unit='kg', cruise={'tasKt': 140, 'fuelFlowPerHour': 40, 'rpmNominal': 2400},
                 climb={'rpmNominal': 7100, 'fuelFlowPerHour': 100, 'rateFpm': 1000, 'iasKt': 150},
                 rpmFuelCurve=[{'rpm': 2200, 'altFt': 4000, 'fuelFlowPerHour': 35}, {'rpm': 2400, 'altFt': 4000, 'fuelFlowPerHour': 45}])
    sheet.pop('_fields', None)
    docs = [[f'aircraft/sheets/{x["id"]}.json', x, 'document'] for x in (EC25, C30J, sheet)]
    c.open('aircraft', docs=LEVEL3 + [['airline/fleet.json', fleet_doc(3), 'document']] + docs + [TYPES, ['cache/aircraft/ui.json', {'view': 'sheets'}, 'cache']],
           wait=False, app='maintenance')
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-id]')", timeout=15000, what='the Fiches list')
    edit_sheet(c, 'XMES')
    head = ['schema_version', 'aircraft_icao', 'aircraft_file', 'registration', 'flight_id', 'phase', 'duration_sec', 'mean_fuel_flow_kg_h',
            'fuel_coverage_pct', 'engine_count', 'engine_fuel_flow_kg_h', 'mean_pressure_altitude_ft', 'mean_ias_kt', 'mean_tas_kt',
            'mean_vertical_speed_fpm', 'mean_engine_rpm', 'mean_throttle_pct', 'quality_flags']
    rows = [['0.4.1', 'XMES', 'x.acf', 'F-TEST', 'A', 'CLIMB', 15, 120, 100, 1, 120, 3000 + i * 300, 160, 175, 1500, 8000, 95, ''] for i in range(24)]
    with tempfile.TemporaryDirectory() as tmp:
        f = Path(tmp) / 'FuelPhaseMonitor_climb.csv'
        f.write_text('\n'.join(','.join(str(x) for x in r) for r in [head] + rows), encoding='utf-8')
        c.page.set_input_files(f'{M} {SHEETS} input[data-measfile]', str(f))
        c.until(f"!!document.querySelector('{M} {SHEETS} [data-measphase=climb]')", what='the measured climb proposed')
    line = norm(c.text(f'{M} {SHEETS} [data-measphase=climb]'))
    for want in ('8000 rpm', '120 kg/h', '1500 ft/min', 'IAS 160 kt', norm(tx(SX, 'measThrottle', c.lang).replace('{p}', '95')), '7100 rpm'):
        c.ok(want in line, line, f'the climb line says « {want} »')
    c.page.check(f'{M} {SHEETS} [data-measph=climb]')
    c.tap(f'{M} {SHEETS} [data-do="measadd"]')
    c.until(f"document.querySelector('{M} {SHEETS} input[data-path=\"climb.rpmNominal\"]')?.value === '8000'", what='the climb of the draft takes the measured rpm')
    c.eq([c.js(f"document.querySelector('{M} {SHEETS} input[data-path=\"climb.{k}\"]')?.value") for k in ('rateFpm', 'iasKt')], ['1500', '160'],
         'rate and IAS of the measured climb in the draft', what='climb fields')
    c.eq(sheet_of(c, 'XMES')['climb']['rpmNominal'], 7100, 'nothing written before « Enregistrer » and « Appliquer »', what='stored')


# § 10.38 step 1: two invented airlines of one repository (aaa: an EC25, bbb: a C-130J), the index the migration writes
def airline_docs(index=True):
    """The documents of two airlines (never the user's): index, settings and fleet of aaa and bbb; index=False: the airline of today only."""
    if not index:
        return []
    return [['airline/index.json', {'schema': 1, 'airlines': [{'code': 'aaa', 'name': 'Alpha Air'}, {'code': 'bbb', 'name': 'Bravo Air'}]}, 'document'],
            ['airline/aaa/settings.json', {'schema': 1, 'name': 'Alpha Air'}, 'document'],
            ['airline/aaa/fleet.json', {'schema': 1, 'aircraft': [{'registration': 'F-AAAA', 'type': 'EC25'}]}, 'document'],
            ['airline/bbb/settings.json', {'schema': 1, 'name': 'Bravo Air'}, 'document'],
            ['airline/bbb/fleet.json', {'schema': 1, 'aircraft': [{'registration': 'F-BBBB', 'type': 'C30J'}]}, 'document']]


def set_airline(c, code):
    """Chooses the current airline as Réglages › Compagnie does (FrameData.setAirline: the event frame-data-airline)."""
    c.eq(c.js("(code) => window.FrameData.setAirline(code)", code), True, f'the airline {code} is chosen', what='setAirline')


@case('M32', 'Fleet: the fleet of the current airline (airline/<code>/fleet.json), followed when the airline changes, added to in its own file; without an index, airline/fleet.json',
      'M', tags=('aircraft',), designs=('standard',), screens=False, langs4=True,
      rule='V3 spec 10.38 step 1: the fleet screen reads and writes the fleet of FrameData.airline() (root + fleet.json); frame-data-airline redraws; no index: as before')
def m32(c):
    c.open('aircraft', docs=LEVEL3 + airline_docs(), wait=False, app='maintenance')
    c.until(f"document.querySelectorAll('{M} [data-reg]').length === 1", timeout=15000, what='the fleet of Alpha Air')
    c.eq(regs(c), ['F-AAAA'], 'Alpha Air: F-AAAA', what='aaa')
    set_airline(c, 'bbb')
    c.until(f"(document.querySelector('{M} [data-reg]')?.dataset.reg) === 'F-BBBB'", what='Bravo Air: F-BBBB')
    c.tap(f'{M} [data-do="add"]')
    c.until(f"!!document.querySelector('{M} [data-pane=edit]')", what='the editor opens')
    c.page.fill(f'{M} [data-f="registration"]', 'F-BNEW')
    c.page.fill(f'{M} [data-f="type"]', 'C30J')
    c.tap(f'{M} [data-do="save"]')
    d = c.until_doc('airline/bbb/fleet.json', lambda d: any(a.get('registration') == 'F-BNEW' for a in (d or {}).get('aircraft') or []), 'written in Bravo Air\'s fleet',
                    timeout=8000)
    c.eq(sorted(a['registration'] for a in d['aircraft']), ['F-BBBB', 'F-BNEW'], 'Bravo Air\'s fleet, nothing else', what='bbb fleet')
    c.eq(sorted(a['registration'] for a in c.doc('airline/aaa/fleet.json')['aircraft']), ['F-AAAA'], 'Alpha Air\'s fleet untouched', what='aaa fleet')


@case('M33', 'Sheets: the provenance is a mark at the end of a label (its title says it), each card says its distinct sources once; the long explanations are in the help',
      'M', tags=('aircraft',), designs=('standard',), screens=True, langs4=True,
      rule='SOG-0057, V3 spec 10.43: no provenance line under a field; a mark whose title says the source and the date; a « Sources » line per card '
      '(distinct sources); « Carburant en volume » and « Densité » keep a line of sixty signs at most and a « ? » to their anchor of the help ×4')
def m33(c):
    open_sheets(c)
    edit_sheet(c, 'EC25')
    r = c.js(f"""(() => {{ const root = document.querySelector('{M} {SHEETS}');
        const marks = [...root.querySelectorAll('[data-origin]')];
        const card = root.querySelector('[data-origin="cruise.tasKt"]').closest('details');
        const src = (card.querySelector('[data-sources]')?.textContent || '').trim();
        return {{ small: root.querySelectorAll('small.ac-origin').length, kinds: [...new Set(marks.map(m => m.tagName + '.' + m.className + ':' + m.textContent))],
                  title: root.querySelector('[data-origin="cruise.tasKt"]').getAttribute('title'), src,
                  hints: ['fuelAsVolume', 'fuelDensityKgPerL'].map(p => {{ const h = root.querySelector('[data-help="' + p + '"]');
                    return [h.textContent.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim().length, h.querySelector('a[data-helplink]')?.getAttribute('href')] }}) }} }})()""")
    c.eq([r['small'], r['kinds']], [0, ['SPAN.ac-mark:•']], 'no provenance line under a field: a mark « • » at the end of the label', what='marks')
    c.ok(r['title'].startswith('lnmperf') and '28' in r['title'], r['title'], 'the mark\'s title says the source and the date')
    parts = [x.strip() for x in r['src'].split(':', 1)[-1].split(',')]
    c.ok(parts and len(parts) == len(set(parts)) and any(x.startswith('lnmperf') for x in parts), r['src'], 'the card\'s « Sources » line: its distinct sources, once each')
    c.eq([h[1] for h in r['hints']], ['#help?m=aircraft&a=aircraft-fuel-volume', '#help?m=aircraft&a=aircraft-fuel-density'], 'a « ? » to the anchor of each notion', what='links')
    c.ok(all(h[0] <= 62 for h in r['hints']), r['hints'], 'a line of sixty signs at most (and the « ? »)')
    for lang in ('fr', 'en', 'de', 'es'):
        text = (ROOT / 'modules' / 'aircraft' / 'help' / f'{lang}.md').read_text(encoding='utf-8')
        c.ok('<a id="aircraft-fuel-volume"></a>' in text and '<a id="aircraft-fuel-density"></a>' in text, lang, f'the two explanations in the help ({lang}) with their anchors')


@case('M34', 'Sheets: « Compléter depuis une autre fiche… » shows no other sheet until asked (no select pre-chosen); a search, then the review',
      'M', tags=('aircraft',), designs=('standard',), screens=True, langs4=True,
      rule='SOG-0073 (user, 9 Nov: « on choisit de modifier la caravelle, et c\'est « douglas dc-3 » qui apparaît […] très perturbant »): a button, one '
      'line; the aircraft search of aerodb (the Flight step\'s) lists the other sheets, the open one never; a tap → the review of the completion')
def m34(c):
    open_sheets(c)
    edit_sheet(c, 'C30J')
    bar = c.js(f"(() => {{ const b = document.querySelector('{M} {SHEETS} [data-do=fillopen]'); return {{ select: document.querySelectorAll('{M} {SHEETS} select[data-k=fillfrom]').length, "
               f"card: b ? b.closest('.f-card').textContent : '', box: document.querySelectorAll('{M} {SHEETS} [data-fillbox]').length }} }})()")
    c.eq([bar['select'], bar['box'], 'EC25' in bar['card']], [0, 0, False], 'no select, no list, no other sheet named before it is asked', what='closed')
    c.tap(f'{M} {SHEETS} [data-do="fillopen"]')
    c.until(f"document.activeElement === document.querySelector('{M} {SHEETS} input[data-k=fillq]')", what='the search opens, focused')
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-fillres] [data-id=EC25]')", what='the other sheets listed')
    c.eq(c.count(f'{M} {SHEETS} [data-fillres] [data-id=C30J]'), 0, 'the open sheet is never offered', what='self')
    c.tap(f'{M} {SHEETS} [data-fillres] [data-do="fill"][data-id="EC25"]')
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-review] [data-do=apply]')", what='the review of the completion')


@case('M35', 'Sheets: a sticky line heads the editor, the sheet\'s name and its unit of reading; the unit leads to its choice',
      'M', tags=('aircraft',), designs=('standard',), screens=True, langs4=True,
      rule='SOG-0074 (the unit is the module\'s): the editor\'s head stays at the top while scrolling (position sticky), « lb · lb/h » for an lb sheet; '
      'a tap focuses « Carburant lu et saisi en »')
def m35(c):
    lb = dict(EC25, id='XLBS', name='XLBS', icao='XLBS', unit='lb', usableFuel=4000, cruise={'tasKt': 141, 'fuelFlowPerHour': 1000})
    lb.pop('_fields', None)
    docs = [[f'aircraft/sheets/{x["id"]}.json', x, 'document'] for x in (EC25, lb)]
    c.open('aircraft', docs=LEVEL3 + [['airline/fleet.json', fleet_doc(3), 'document']] + docs + [TYPES, ['cache/aircraft/ui.json', {'view': 'sheets'}, 'cache']],
           wait=False, app='maintenance')
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-id]')", timeout=15000, what='the Fiches list')
    edit_sheet(c, 'XLBS')
    h = c.js(f"(() => {{ const e = document.querySelector('{M} {SHEETS} [data-edithead]'); return {{ pos: getComputedStyle(e).position, "
             f"name: e.querySelector('b').textContent, unit: e.querySelector('[data-do=unitgo]').textContent.trim() }} }})()")
    c.eq(h, {'pos': 'sticky', 'name': 'XLBS', 'unit': 'lb · lb/h'}, 'a sticky head: the name and the unit', what='head')
    c.tap(f'{M} {SHEETS} [data-do="unitgo"]')
    c.until(f"document.activeElement === document.querySelector('{M} {SHEETS} select[data-k=vunit]')", what='the unit choice has the focus')


@case('M36', 'Sheets: measured levels on the ladder of significant levels (FL181 → FL200), an interpolated level greyed « extrapolé », accepted windows kept on the device',
      'M', tags=('aircraft',), designs=('standard',), screens=True, phone=False, langs4=True,
      rule='SOG-0075 (user, 9 Nov: « FL181, c\'est très étrange comme niveau. « < 5000, FL100 FL150 FL200 FL300 FL450 » […] conserver les données brutes »): '
      'ground to 5000 by 1000 then FL100 … FL450 by 50; a level between two measured ones at the same rpm interpolated in pressure, said; the accepted '
      'raw windows in cache/aircraft/raw/<sheet>.json (device, never published); the sheet stays the source')
def m36(c):
    import tempfile
    sheet = dict(EC25, id='XMES', name='XMES', icao='XMES', unit='kg', cruise={'tasKt': 140, 'fuelFlowPerHour': 40, 'rpmNominal': 2400},
                 rpmFuelCurve=[{'rpm': 2200, 'altFt': 4000, 'fuelFlowPerHour': 35}, {'rpm': 2400, 'altFt': 4000, 'fuelFlowPerHour': 45}])
    sheet.pop('_fields', None)
    docs = [[f'aircraft/sheets/{x["id"]}.json', x, 'document'] for x in (EC25, C30J, sheet)]
    c.open('aircraft', docs=LEVEL3 + [['airline/fleet.json', fleet_doc(3), 'document']] + docs + [TYPES, ['cache/aircraft/ui.json', {'view': 'sheets'}, 'cache']],
           wait=False, app='maintenance')
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-id]')", timeout=15000, what='the Fiches list')
    edit_sheet(c, 'XMES')
    head = ['schema_version', 'aircraft_icao', 'aircraft_file', 'registration', 'flight_id', 'phase', 'duration_sec', 'mean_fuel_flow_kg_h',
            'fuel_coverage_pct', 'engine_count', 'engine_fuel_flow_kg_h', 'mean_pressure_altitude_ft', 'mean_ias_kt', 'mean_tas_kt',
            'mean_vertical_speed_fpm', 'mean_engine_rpm', 'quality_flags', 'start_utc']
    rows = [['0.4.1', 'XMES', 'x.acf', 'F-TEST', 'A', 'CRUISE', 15, 50, 100, 1, 50, 18100, 150, 200, 0, 2500, '', f'2026-11-09T08:{i:02d}:00Z'] for i in range(8)]
    rows += [['0.4.1', 'XMES', 'x.acf', 'F-TEST', 'B', 'CRUISE', 15, 60, 100, 1, 60, 5000, 150, 170, 0, 2500, '', f'2026-11-09T09:{i:02d}:00Z'] for i in range(8)]
    with tempfile.TemporaryDirectory() as tmp:
        f = Path(tmp) / 'FuelPhaseMonitor_ladder.csv'
        f.write_text('\n'.join(','.join(str(x) for x in r) for r in [head] + rows), encoding='utf-8')
        c.page.set_input_files(f'{M} {SHEETS} input[data-measfile]', str(f))
        c.until(f"document.querySelectorAll('{M} {SHEETS} [data-measrow]').length === 4", what='FL050, FL100 and FL150 interpolated, FL200 measured')
    got = c.js(f"[...document.querySelectorAll('{M} {SHEETS} [data-measrow]')].map(l => [l.dataset.measrow, l.hasAttribute('data-extrapolated'), l.classList.contains('f-muted')])")
    c.eq(got, [['5000|2500', False, False], ['10000|2500', True, True], ['15000|2500', True, True], ['20000|2500', False, False]],
         'FL181 → FL200 (the ladder); FL100 and FL150 between, interpolated in pressure, greyed', what='ladder')
    c.ok(norm(tx(SX, 'measExtrap', c.lang)) in norm(c.text(f'{M} {SHEETS} [data-measrow="10000|2500"]') or ''), 'no word', 'an interpolated level is said « extrapolé »')
    c.page.check(f'{M} {SHEETS} [data-measrow="20000|2500"] input')
    c.tap(f'{M} {SHEETS} [data-do="measadd"]')
    d = c.until_doc('cache/aircraft/raw/XMES.json', lambda d: d and len(d.get('windows') or []) == 8, 'the eight accepted windows kept on the device')
    c.eq(sorted({w['flight_id'] for w in d['windows']}), ['A'], 'the windows of the accepted point only (flight A, FL200)', what='raw')


@case('M25', 'Sheets: the fuel is read and typed in the unit chosen (kg, lb, l, US gal); the sheet keeps its stored unit, an untouched value unchanged',
      'M', tags=('aircraft',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0032 (« toujours pas de possibilité de lire / écrire en kg ou lb/h ? »): the editor reads and writes in the unit chosen, by '
      'the frame rules (frame/lib/fuel_units.js), the unit beside each field; the JSON keeps its unit; a sheet typed in lb/h read in kg/h '
      'gives the same curve')
def m25(c):
    lb = dict(EC25, id='XLBS', name='XLBS', icao='XLBS', unit='lb', usableFuel=4000, cruise={'tasKt': 141, 'fuelFlowPerHour': 1000},
              rpmFuelCurve=[{'rpm': 2000, 'altFt': None, 'fuelFlowPerHour': 800}, {'rpm': 2400, 'altFt': None, 'fuelFlowPerHour': 1000}])
    lb.pop('_fields', None)
    docs = [[f'aircraft/sheets/{x["id"]}.json', x, 'document'] for x in (EC25, lb)]
    c.open('aircraft', docs=LEVEL3 + [['airline/fleet.json', fleet_doc(3), 'document']] + docs + [TYPES, ['cache/aircraft/ui.json', {'view': 'sheets'}, 'cache']],
           wait=False, app='maintenance')
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-id]')", timeout=15000, what='the Fiches list')
    edit_sheet(c, 'XLBS')
    ff = f'{M} {SHEETS} input[data-path="cruise.fuelFlowPerHour"]'
    c.eq(c.js(f"document.querySelector('{ff}').value"), '1000', 'read in its own unit first (lb/h)', what='lb/h')
    c.page.select_option(f'{M} {SHEETS} select[data-k="vunit"]', 'kg')
    c.until(f"document.querySelector('{ff}')?.value === '453.6'", what='read in kg/h: 1000 lb/h = 453.6 kg/h')
    lab = c.js(f"document.querySelector('{ff}').closest('label').textContent")
    c.ok('(kg/h)' in lab, lab, 'the unit is written beside the field')
    # the RPM table: inputs on a computer screen, its rows read only otherwise
    curve = c.js(f"""(() => {{ const i = [...document.querySelectorAll('{M} {SHEETS} input[data-rpm][data-rk=fuelFlowPerHour]')].map(i => i.value);
        return i.length ? i : [...document.querySelectorAll('{M} {SHEETS} details.f-card table tbody tr td:nth-child(3)')].map(td => td.textContent.trim()) }})()""")
    c.eq(curve, ['362.9', '453.6'], 'the curve read in kg/h', what='curve kg/h')
    c.ok(c.count(f'{M} {SHEETS} [data-vunitnote]') == 1, 'no note', 'the conversion is said')
    # a value typed in kg/h is stored in lb/h; the untouched ones stay exactly as they were
    open_group(c, 'cruise.fuelFlowPerHour')
    c.page.fill(ff, '500')
    c.tap(f'{M} {SHEETS} [data-do="save"]')
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-review] [data-do=apply]')", what='the review is shown')
    paths = c.js(f"[...document.querySelectorAll('{M} {SHEETS} [data-review] input[data-path]')].map(i => i.dataset.path)")
    c.eq(paths, ['cruise.fuelFlowPerHour'], 'only the typed field changes (no rounding of the others)', what='review rows')
    c.tap(f'{M} {SHEETS} [data-do="apply"]')
    d = c.until_doc('aircraft/sheets/XLBS.json', lambda d: d and d['cruise']['fuelFlowPerHour'] != 1000, 'the typed value is written')
    c.eq([d['unit'], round(d['cruise']['fuelFlowPerHour'], 1), d['usableFuel'], [r['fuelFlowPerHour'] for r in d['rpmFuelCurve']]],
         ['lb', 1102.3, 4000, [800, 1000]], 'stored in lb: 500 kg/h = 1102.3 lb/h; the rest unchanged', what='stored')


@case('M15', 'Sheets: a ChatGPT reply is read into the review; « Appliquer » writes it stamped « chatgpt »', 'M', tags=('aircraft',), designs=('standard',),
      screens=False,
      rule='modules/aircraft SPEC 4: the ChatGPT reply (any shape: the aerodb reader) is a source like the others; preview, then a write through '
      'sheets.put with the source chatgpt')
def m15(c):
    open_sheets(c)
    edit_sheet(c, 'EC25')
    reply = 'Voici la fiche :\n```json\n{"id": "EC25", "cruise": {"tasKt": 148, "ceilingFt": 19000}}\n```'
    c.js(f"(() => {{ const d = document.querySelector('{M} {SHEETS} textarea[data-k=gptreply]').closest('details'); if (d) d.open = true }})()")
    c.page.fill(f'{M} {SHEETS} textarea[data-k="gptreply"]', reply)
    c.tap(f'{M} {SHEETS} [data-do="gptread"]')
    c.until(f"!!document.querySelector('{M} {SHEETS} [data-review] [data-do=apply]')", what='the review of the reply')
    c.eq(sheet_of(c, 'EC25')['cruise']['tasKt'], 141, 'nothing is written before « Appliquer »', what='file before apply')
    clear_notes(c)
    c.tap(f'{M} {SHEETS} [data-do="apply"]')
    d = c.until_doc('aircraft/sheets/EC25.json', lambda d: d and d['cruise']['tasKt'] == 148, 'the reply is written')
    c.eq(d['_fields']['cruise.tasKt']['source'], 'chatgpt', 'the stamp names ChatGPT', what='_fields')
