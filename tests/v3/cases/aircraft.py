"""Area M - the aircraft module of the Maintenance application (modules/aircraft/SPEC.md; V3_SPECIFICATION section 10.34, lot A2).

The fleet (airline/fleet.json): list and search, add, edit (the changed fields said before writing), retire (a question), every write
reading the file just before. Invented aircraft only."""
from lib import case, norm, tx

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
    c.until(f"!!document.querySelector('{M} [data-view=fleet]')", timeout=15000, what='the fleet list is drawn')


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
    c.until(f"!!document.querySelector('{M} [data-view=edit]')", what='the editor opens')
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
    c.until(f"!!document.querySelector('{M} [data-view=edit]')", what='the editor of F-TST2')
    c.eq(norm(c.text(f'{M} [data-changes]') or ''), norm(row(c, 'noChange')), 'nothing changed yet', what='changes line')
    c.page.fill(f'{M} [data-f="base"]', 'Autreville')
    c.page.fill(f'{M} [data-f="callsigns"]', 'TEST02, TEST22')
    want = norm(row(c, 'changes').replace('{n}', '2').split(':')[0])
    c.until(f"(w) => (document.querySelector('{M} [data-changes]').textContent || '').replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim().startsWith(w)", want,
            what='« 2 champs changés : … » before writing')
    c.tap(f'{M} [data-do="save"]')
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


@case('M5', 'Fleet at 390 px: no overflow, 44 px rows, few controls at a time', 'M', tags=('aircraft', 'layout'), designs=('standard',), screens=False,
      rule='frame rules: seven elements at most per screen, 44 px targets, no horizontal overflow on a phone')
def m5(c):
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    open_fleet(c, 12)
    r = c.js(f"""(() => {{ const shown = e => {{ const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 }};
        return {{ over: document.documentElement.scrollWidth - innerWidth, rows: [...document.querySelectorAll('{M} [data-reg]')].map(b => Math.round(b.getBoundingClientRect().height)),
                  controls: [...document.querySelectorAll('{M} [data-view] button, {M} [data-view] input')].filter(shown).length }} }})()""")
    c.ok(r['over'] <= 0, f"{r['over']} px", 'no horizontal overflow at 390 px')
    c.ok(all(h >= 44 for h in r['rows']), f"{r['rows']}", 'every row is a 44 px target')
    c.ok(r['controls'] <= 10, f"{r['controls']}", 'the list shows its seven rows plus search, « Ajouter » and « N autres », nothing else')
