"""Area L - the Données module: a read-only screen and its first action, Construire (modules/data/SPEC.md sections 3, 5.4, 6.2, 6.5, 9; INTEGRATION.md section 2).

Rules covered
  * L18 « Tout mettre à jour » (SPEC § 5.3) against the fake launcher: the plan question and its No, the eight jobs in the published order then ONE sync with the
    gesture and one notification, the stop at the first failure (nothing published), Arrêter mid-chain, the skipped sets with their reasons, the chain interrupted by a
    reload, the attention mark of a published cycle gone by on Construire and on the button.
  * L19 « Prendre le fichier téléchargé » (base/pickup) against the fake launcher: the fourth verb of the base panel, the plan (dry sent) then ONE question (zip found, file
    missing with its pattern, where the files go), No takes nothing, Yes sends dry false, the summary and the hint, one journal entry, nothing found says the missing files
    without a question, a partial end, the button under the manual sources of a download, grey when the launcher does not know the verb.
  * L20 the map of the zones to tick (stubbed ctx.aerodb.zoneOutlines): one selection with the list (a click or a key, both redrawn from the module state), the frame's tokens
    for the colours, the state in words in the title and aria-label, the 44 px rule (no map on a phone with thin zones), frozen while an operation runs, no map without outlines
    (the list alone, no error line), the resize listener removed at unmount.
  * L16 / L17 (V3 § 10.34, lot A1: the same panel for every group): L16 the pure functions (the SETS table, the verbs a launcher knows and the
    old-launcher fallback, the grey reason of a panel, the States offered, the ICAO types field, the arguments, the view and the end of any set's job,
    the sheets plan, the journal entries); L17 the panels against the fake launcher (regen/verbs, proc build / purge, VAC and aircraft grey, one
    operation at a time across panels, the aircraft field, aircraft steps and reasons, the sheets plan then the copy, resume at mount).
  * L1 model.js, the pure functions, on fixtures (no page of the module, no aerodb): the AIRAC cycle written YYNN and its dates, the
    state of a row by priority (a cycle gone by amber then red a week after its end, the parser version with and without the
    constant, absent, an aircraft edition older than 28 days, a procedure outdated), a row of the base aggregated from two zones,
    the States grouped green / orange / red and cut at seven lines, the groups cut at seven rows;
  * L2 the screen, with aerodb STUBBED (publication / zones / coverageByState answer fixtures, sources() is the real catalogue plus
    a parser constant; nothing is read from the data repository, nothing is fetched): the head with the cycle in force, the four
    groups in order and folded as they should be, seven rows at most visible, the states of the rows, the coverage written once,
    no horizontal scroll, 44 px summaries, the actions are Télécharger · Construire · Purger (one panel) and Publier (grey without a launcher,
    with its reason); no Mettre à jour button anywhere, the four languages;
  * L3 the module is never in Pilot's rail (it belongs to the Maintenance application); Settings > Administration has the line
    « Maintenance » at the Full level only, a real link to #data that mounts the module, including on a phone;
  * L4 an aerodb call that fails is said in one line and throws nothing;
  * L5 the fallbacks (no State names, no `held`, no parser constant) and the States list redrawn on aerodb { coverage: true }, unsubscribed at unmount;
  * L6 model.js, the pure functions of Construire (personal sources, grey reason, a zone's phrase, the bar, the end of a job, the refusal,
    the journal trimmed to 50), on fixtures;
  * L7 Construire against a FAKE launcher (the technique of frame A32: c.context.route answers /__setup/*): the body sent, the zone lines that follow,
    the end summary, one notification, the journal; the personal sources and the X-Plane hint;
  * L8 the other ends: no launcher (grey with its reason), a 409, a refusal that says what to do, Arrêter, an interrupted job found at mount,
    a job found running at mount followed to its end;
  * L9 Arrêter posts the cancel and ends on the real end of the job; L10 the builds found again at mount (see below);
  * L11 model.js, the pure functions of Publier (button state by priority, the counts of sync-status, the end of a publication read from
    the frame's result, the journal entry), on fixtures;
  * L12 Publier against a fake launcher (sync-status) and a FAKE `ctx.data.sync` carrying `.gesture` (an init script wraps FrameData.adapter,
    as the aerodb stub wraps AeroDB.create): the state line, the one question, the call with { gesture: true } exactly once, the result lines,
    the notification, the journal; nothing without the gesture, with nothing to publish, during a build; the launcher's message escaped.
  * L14 model.js, the pure functions of Télécharger and Purger (the verb of a view, the one grey reason, sizes in the four languages, a zone's and a source's
    phrase, the end of a download incl. manual sources / outside_sync / nothing-to-fetch, the plan and the end of a purge with shared-fr / kept-tracked, the
    journal entries), on fixtures;
  * L15 Télécharger and Purger against the FAKE launcher (the technique of L7): the body (verb fetch, args.personal), the lines per zone and per source, the end
    summary, the manual sources (a link only in https), outside_sync, nothing to fetch, 429 too-soon, the journal; Purger: the plan (dry) then ONE question
    (shared-fr, kept-tracked), No does nothing, Yes sends the real job without dry, the end sentences, one journal entry, an empty plan without a question;
    one operation at a time (the other verbs grey while any runs); a running download found at mount is followed with its own lines.

Cases: L1 .. L20.  The suite never reads a real data repository, never reaches the network and never meets a real launcher.
"""
import datetime
import json
import re
import urllib.parse

from lib import ROOT, Fail, case, norm, tx

TX = 'modules/data/texts.js'
LEVEL3 = [['device/level.json', {'level': 3}, 'cache']]
REF = datetime.date(2024, 1, 25)           # AIRAC 2401


def _name(d):
    """AIRAC id (YYNN) of the cycle that starts on `d` (the 28-day suite from 2024-01-25)."""
    first = REF + datetime.timedelta(days=-(-(datetime.date(d.year, 1, 1) - REF).days // 28) * 28)
    return f'{d.year % 100:02d}{(d - first).days // 28 + 1:02d}'


def _cycles():
    """(today, cycle in force, previous, next) as dates."""
    today = datetime.datetime.now(datetime.timezone.utc).date()
    cur = REF + datetime.timedelta(days=(today - REF).days // 28 * 28)
    return today, cur, cur - datetime.timedelta(days=28), cur + datetime.timedelta(days=28)


def _date_text(d, lang):
    """The date as the screen writes it (toLocaleDateString, UTC, 2-digit)."""
    return d.strftime('%d.%m.%Y') if lang == 'de' else d.strftime('%d/%m/%Y')


# ------------------------------------------------------------------------------------------------------ L1
_L1_JS = r"""async () => {
  const M = await import('/modules/data/model.js');
  await import('/frame/aerodb/airac.js');
  const A = window.AeroAirac, out = {};
  const T = s => Date.parse(s + 'T12:00:00Z');
  const now = T('2026-11-10');
  out.head = M.cycleHead(A, now);
  out.names = [M.cycleName(A, '2026-10-01'), M.cycleDateOf(A, '2610'), M.cycleDateOf(A, '2026-10-15'), M.cycleDateOf(A, 'x'), M.cycleName(A, null)];
  // a published cycle: current, ahead, gone by (13 days after its last day), and the amber / red boundary (last day 2026-10-28)
  out.stale = ['2026-10-29', '2026-11-26', '2026-10-01'].map(c => M.staleLevel(A, c, now));
  out.edge = ['2026-11-04', '2026-11-05'].map(d => M.staleLevel(A, '2026-10-01', T(d)));
  out.parser = [[undefined, 1], [3, 2], [3, 3], [3, null], [3, 4], [NaN, 1]].map(([c, f]) => M.parserOld(c, f));
  out.pick = [{}, { absent: 1, stale: 'err' }, { stale: 'warn', parser: 1 }, { parser: 1, outdated: 1 }, { outdated: 1, old: 1 }, { old: 1 }].map(f => M.pickState(f));
  out.age = [M.ageDays('2026-11-10T01:00:00Z', now), M.ageDays('2026-11-09T01:00:00Z', now), M.ageDays('2026-10-01T00:00:00Z', now), M.ageDays(null, now), M.ageDays('nonsense', now)];
  // rows
  const mk = (id, group, zones, status = 'used') => ({ id, group, zones, status });
  const zone = (cycle, v, at, extra = {}) => ({ inForce: cycle, cycles: { [cycle]: { parserVersion: v, at, by: 'ABC', format: 'split', ...extra } } });
  const pub = {
    base: { fr: zone('2026-10-29', 3, '2026-11-01T10:00:00Z'), gb: zone('2026-10-01', 2, '2026-10-05T00:00:00Z'), es: zone('2026-10-29', 3, '2026-11-02T00:00:00Z'),
      wh: { inForce: '2026-10-29', cycles: { '2026-10-29': { parserVersion: null, at: null, by: null, format: 'whole' } } } },
    proc: { inForce: '2026-10-29', cycles: { '2026-10-29': { aerodromes: 12, byStatus: { official: 10, check: 2 } } } },
    vfr: { cycle: '2611', at: '2026-11-03T00:00:00Z', count: 400 },
    aircraft: { at: '2026-09-20T00:00:00Z', types: 300, files: 4 }
  };
  const row = (src, env = {}) => { const r = M.rowOf(src, { airac: A, pub, ids: ['fr', 'gb', 'es'], now, parserVersion: undefined, ...env });
    return { state: r.state, level: r.level, cycle: r.cycle, cycleDate: r.cycleDate, at: r.at, ageDays: r.ageDays, counts: r.counts, zones: r.zones.map(z => z.zone + ':' + z.published), attention: r.attention, unknown: r.unknown, kind: r.kind } };
  out.twoZones = row(mk('openaip', 'base', '*'), { ids: ['fr', 'gb'] });                       // oldest cycle of the two, stale and red
  out.twoZonesCurrent = row(mk('openaip', 'base', '*'), { ids: ['fr', 'es'] });               // both current
  out.twoZonesParser = row(mk('openaip', 'base', '*'), { ids: ['fr', 'es'], parserVersion: 4 });
  out.twoZonesParser3 = row(mk('openaip', 'base', '*'), { ids: ['fr', 'es'], parserVersion: 3 });
  out.lowestParser = row(mk('openaip', 'base', '*'), { ids: ['fr', 'es', 'gb'], parserVersion: 1 });  // stale wins over the parser
  out.gbOnly = row(mk('ukmil', 'base', ['gb']), { parserVersion: 3 });                        // cycle 2610 in force on 2026-11-10: stale
  out.whole = row(mk('x', 'base', ['wh']), { ids: ['wh'], parserVersion: 3 });
  out.wholeNoConst = row(mk('x', 'base', ['wh']), { ids: ['wh'] });
  out.absent = row(mk('x', 'base', ['us']), { ids: ['us'] });
  out.proc = row(mk('eaip', 'proc', ['fr']));
  out.procOutdated = row(mk('eaip', 'proc', ['fr']), { pub: { ...pub, proc: { inForce: '2026-10-29', cycles: { '2026-10-29': { aerodromes: 1, byStatus: { outdated: 1 } } } } } });
  out.procAbsent = row(mk('cifp', 'proc', ['us']), { pub: { ...pub, proc: { cycles: {}, inForce: null } } });
  out.vac = row(mk('vac', 'base', ['fr']));
  out.vacOld = row(mk('vac', 'base', ['fr']), { pub: { ...pub, vfr: { cycle: '2026-10-01', at: '2026-10-04T00:00:00Z', count: 3 } } });
  out.vacAbsent = row(mk('vac', 'base', ['fr']), { pub: { ...pub, vfr: null } });
  out.aircraftOld = row(mk('aircraft', 'aircraft', []));                                      // 51 days
  out.aircraftNew = row(mk('aircraft', 'aircraft', []), { pub: { ...pub, aircraft: { at: '2026-10-25T00:00:00Z', types: 1, files: 1 } } });
  out.aircraftAbsent = row(mk('aircraft', 'aircraft', []), { pub: { ...pub, aircraft: null } });
  out.weather = row(mk('weather', 'weather', []));
  out.candidate = row(mk('ead', 'proc', '*', 'candidate'));
  out.noPub = row(mk('openaip', 'base', '*'), { pub: null });
  // coverage
  const zl = [{ id: 'fr', published: true }, { id: 'gb', published: true }, { id: 'de', published: false }];
  out.cov = [M.coverageIds(null, zl, pub), M.coverageIds({ zones: ['gb', 'gb', 'es'] }, zl, pub), M.coverageIds(null, null, pub), M.coverageIds({ zones: 'x' }, zl, pub)];
  out.fed = [M.fedZones(mk('a', 'base', '*'), ['fr', 'gb']), M.fedZones(mk('a', 'base', ['gb', 'us']), ['fr', 'gb']), M.matters(mk('a', 'base', ['us']), ['fr']), M.matters(mk('a', 'aircraft', []), [])];
  // the States
  const L = r => [r, r, r, r];
  const st = {};
  const add = (p, level, reason, extra = {}) => { st[p] = { level, reason, label: L('L-' + reason), ...extra } };
  add('LF', 'orange', 'sia', { names: ['France', 'France', 'Frankreich', 'Francia'], held: 12 });
  add('EG', 'green', 'held', { held: 3 });
  add('EB', 'red', 'images'); add('ED', 'red', 'none', { held: 0 }); add('LE', 'orange', 'ead'); add('LI', 'orange', 'ead');
  add('LS', 'red', 'labels'); add('LO', 'red', 'points'); add('EH', 'red', 'prose'); add('LK', 'red', 'vfr'); add('LH', 'red', 'unknown');
  out.lines = M.stateLines(st, 2, ['held', 'sia', 'ead', 'images', 'labels', 'points', 'prose', 'vfr', 'none', 'unknown']).map(l => [l.level, l.reason, l.items.map(i => i.name + (i.held ? '#' + i.held : ''))]);
  const sp = M.split(M.stateLines(st, 0).slice(), 7);
  out.split = [sp.visible.length, sp.more.length];
  // the groups: nine used base sources in the coverage, the stale one last; the candidates only in the fold
  const SOURCES = [];
  for (let i = 0; i < 8; i++) SOURCES.push(mk('b' + i, 'base', ['fr']));
  SOURCES.push(mk('vac', 'base', ['fr']));
  SOURCES.push(mk('us1', 'base', ['us']), mk('ead', 'proc', '*', 'candidate'), mk('dfs', 'proc', ['de'], 'abandoned'), mk('eaip', 'proc', ['fr']), mk('aircraft', 'aircraft', []));
  const cat = { GROUPS: ['base', 'proc', 'aircraft', 'weather'], ORDER: ['used', 'candidate', 'abandoned'], SOURCES };
  const stalePub = { ...pub, vfr: { cycle: '2026-10-01', at: '2026-10-04T00:00:00Z', count: 3 } };
  const g = M.buildGroups(cat, { airac: A, pub: stalePub, ids: ['fr'], now });
  out.groups = g.map(x => ({ id: x.id, rows: x.rows.map(r => r.id), more: x.more.map(r => r.id + ':' + r.status), attention: x.attention, used: x.used }));
  const g2 = M.buildGroups(cat, { airac: A, pub, ids: ['fr'], now });
  out.groupsOk = g2.map(x => ({ id: x.id, rows: x.rows.length, attention: x.attention }));
  out.dates = [M.dateText('2026-10-01', 'fr'), M.dateText('2026-10-01', 'de'), M.dateText('x', 'fr'), M.addDays('2026-10-29', -1), M.daysBetween('2026-11-10', '2026-11-26')];
  out.personal = M.PERSONAL;
  return out;
}"""


@case('L1', 'Données: the model on fixtures (cycles, states, rows, States, groups)', 'L', tags=('data',), phone=False,
      rule='modules/data/SPEC 6.1 (YYNN), 6.2 (one state by priority), 3 (seven rows, seven lines)')
def l1(c):
    c.page.goto(f'{c.base}/frame/manifest.webmanifest', wait_until='load')
    r = c.js(_L1_JS)
    h = r['head']
    c.eq([h['id'], h['date'], h['end'], h['next'], h['daysToNext']], ['2611', '2026-10-29', '2026-11-25', {'id': '2612', 'date': '2026-11-26'}, 16], 'the cycle in force on 2026-11-10: id, effective date, last day, next, days to the next', what='cycleHead')
    c.eq(r['names'], ['2610', '2026-10-01', '2026-10-01', None, ''], 'YYNN of a date, the date of a YYNN or of a date inside a cycle, nothing for nonsense', what='cycle names')
    c.eq(r['stale'], [None, None, 'err'], 'the current cycle and one published ahead are fine; 2610 on 10 Nov is red (13 days after its last day)', what='staleLevel')
    c.eq(r['edge'], ['warn', 'err'], 'amber until the last day + 7 days (4 Nov), red from the day after', what='amber / red edge')
    c.eq(r['parser'], [False, True, False, True, False, False], 'the parser is old when below the constant (an unknown version too); never without the constant', what='parserOld')
    c.eq(r['pick'], [['ok', 'ok'], ['absent', 'warn'], ['stale-cycle', 'warn'], ['parser', 'warn'], ['outdated', 'warn'], ['stale-age', 'warn']],
         'one state by the priority absent > stale cycle > parser > outdated > old age > ok', what='pickState')
    c.eq(r['age'], [0, 1, 40, None, None], 'age in whole days, never negative, nothing for an unreadable date', what='ageDays')
    two = r['twoZones']
    c.eq([two['state'], two['level'], two['cycle'], two['cycleDate'], two['counts'], two['zones']],
         ['stale-cycle', 'err', '2610', '2026-10-01', {'zones': 2}, ['fr:true', 'gb:true']],
         'a base row aggregated from two zones takes the OLDEST cycle (2610, stale, red on 10 Nov) and counts the two zones', what='row from fr + gb')
    c.eq(two['at'], '2026-10-05T00:00:00.000Z', 'its date is the oldest publication date', what='row at')
    cur = r['twoZonesCurrent']
    c.eq([cur['state'], cur['cycle'], cur['ageDays'], cur['attention']], ['ok', '2611', 9, False], 'both zones current, no constant: up to date, the age of the oldest publication', what='current base row')
    c.eq(r['twoZonesParser']['state'], 'parser', 'a constant above the lowest published version: old parser', what='parser 4 against 3')
    c.eq(r['twoZonesParser3']['state'], 'ok', 'a constant equal to the lowest published version: up to date', what='parser 3 against 3')
    c.eq(r['lowestParser']['state'], 'stale-cycle', 'a stale cycle wins over an old parser', what='priority')
    c.eq(r['gbOnly']['state'], 'stale-cycle', 'the zone published for 2610 is stale on 10 Nov', what='ukmil')
    c.eq([r['whole']['state'], r['wholeNoConst']['state']], ['parser', 'ok'], 'a zone still in the whole format counts as an old parser, only when the constant exists', what='whole format')
    c.eq([r['absent']['state'], r['absent']['attention']], ['absent', True], 'nothing published for the zone: absent', what='absent')
    c.eq([r['proc']['state'], r['proc']['counts'], r['proc']['cycle']], ['ok', {'aerodromes': 12}, '2611'], 'procedures: the cycle in force, the aerodromes counted', what='eaip row')
    c.eq([r['procOutdated']['state'], r['procAbsent']['state']], ['outdated', 'absent'], 'a procedure set carrying outdated entries is outdated; none published is absent', what='proc states')
    c.eq([r['vac']['state'], r['vac']['counts'], r['vacOld']['state'], r['vacAbsent']['state']], ['ok', {'aerodromes': 400}, 'stale-cycle', 'absent'], 'the VAC points read publication().vfr (cycle as YYNN or as a date)', what='vac rows')
    c.eq([r['aircraftOld']['state'], r['aircraftOld']['cycle'], r['aircraftNew']['state'], r['aircraftAbsent']['state']], ['stale-age', '', 'ok', 'absent'],
         'aircraft have no cycle: older than 28 days is amber, recent is fine, nothing published is absent', what='aircraft rows')
    c.eq([r['aircraftOld']['counts'], r['aircraftOld']['kind']], [{'types': 300, 'files': 4}, 'aircraft'], 'aircraft counts: types and files', what='aircraft counts')
    c.eq([r['weather']['state'], r['candidate']['state'], r['noPub']['state'], r['noPub']['unknown']], [None, None, None, True],
         'weather, a candidate source and a row without a readable publication have no state', what='rows without state')
    cov = r['cov']
    c.eq([cov[0]['ids'], cov[0]['stored'], cov[1]['ids'], cov[1]['stored'], cov[2]['ids'], cov[3]['stored']], [['fr', 'gb'], False, ['gb', 'es'], True, ['fr', 'gb', 'es', 'wh'], False],
         'coverage: the stored list, else every published zone (zones(), else the keys of publication())', what='coverageIds')
    c.eq(r['fed'], [['fr', 'gb'], ['gb'], False, True], 'zones fed: all for *, the intersection otherwise; aircraft always matter', what='fedZones / matters')
    c.eq(r['lines'], [['green', 'held', ['EG#3']], ['orange', 'sia', ['Frankreich#12']], ['orange', 'ead', ['LE', 'LI']],
                      ['red', 'images', ['EB']], ['red', 'labels', ['LS']], ['red', 'points', ['LO']], ['red', 'prose', ['EH']], ['red', 'vfr', ['LK']],
                      ['red', 'none', ['ED']], ['red', 'unknown', ['LH']]],
         'States grouped by colour (green, orange, red) then reason in the catalogue order; the name of the language, else the prefix; held only when positive', what='state lines')
    c.eq(r['split'], [7, 3], 'ten State lines: seven visible, three under the fold', what='split of the lines')
    g = {x['id']: x for x in r['groups']}
    c.eq(g['base']['rows'], ['vac', 'b0', 'b1', 'b2', 'b3', 'b4', 'b5'], 'seven rows visible; the row that needs attention (VAC, stale) comes first', what='base rows')
    c.eq(g['base']['more'], ['b6:used', 'b7:used'], 'the surplus of used sets goes under the fold; a source that feeds no zone of the coverage has no row', what='base fold')
    c.eq([g['proc']['rows'], g['proc']['more'], g['proc']['attention']], [['eaip'], ['ead:candidate', 'dfs:abandoned'], False], 'candidates and set-aside sources are rows of the fold only and never need attention', what='proc group')
    c.eq([g['base']['attention'], g['aircraft']['attention'], g['weather']['used']], [True, True, 0], 'a group needs attention when a used row is not up to date', what='attention')
    c.eq([x['attention'] for x in r['groupsOk'] if x['id'] in ('proc', 'weather')], [False, False], 'nothing to see: folded', what='groups up to date')
    c.eq(r['dates'], ['01/10/2026', '01.10.2026', '', '2026-10-28', 16], 'dates written like the rest of the app', what='dates')
    c.eq(r['personal'], _aero_personal(), 'the personal-licence table of model.js (id, kind, zones fed) is what shared/aero_zones.js says (personal:, COMMON, EXTRA): the two cannot drift', what='PERSONAL against aero_zones.js')
    c.check_errors()


def _aero_personal():
    """{ id: { kind, zones } } of the sources shared/aero_zones.js marks `personal:`: the kind is the field's value; the zones are '*' for a
    source of COMMON, else the zones of EXTRA / OWN that list it (read from the file with regular expressions; the module never loads it)."""
    src = (ROOT / 'shared' / 'aero_zones.js').read_text(encoding='utf-8')
    block = src[src.index('const SOURCES = {'):src.index('const COMMON')]
    kinds, cur = {}, None
    for line in block.splitlines():
        m = re.match(r'^    ([a-z0-9_]+): \{\s*$', line)
        if m:
            cur = m.group(1)
        m = re.search(r"personal:\s*'(\w+)'", line)
        if m and cur:
            kinds[cur] = m.group(1)
    common = re.findall(r"'([a-z0-9_]+)'", re.search(r'const COMMON = \[([^\]]*)\]', src).group(1))
    lists = {}
    for name in ('OWN', 'EXTRA'):
        body = re.search(r'const %s = \{(.*?)\n  \};' % name, src, re.S).group(1)
        for zone, items in re.findall(r"^    ([a-z0-9_]+):\s*\[([^\]]*)\]", body, re.M):
            lists[zone] = re.findall(r"'([a-z0-9_]+)'", items)
    return {sid: {'kind': kind, 'zones': '*' if sid in common else sorted(z for z, l in lists.items() if sid in l)} for sid, kind in kinds.items()}


# ------------------------------------------------------------------------------------------------------ L2
def _fixture(pv=19, shape=True):
    """The stub's answers, relative to today's AIRAC cycle: the base of France one cycle behind, the others current."""
    today, cur, prev, nxt = _cycles()
    z = lambda n: [n, n, n, n]
    zone = lambda d, v: {'inForce': d.isoformat(), 'cycles': {d.isoformat(): {'parserVersion': v, 'at': f'{today.isoformat()}T08:00:00Z', 'by': 'ABC', 'format': 'split'}}}
    zones = [{'id': i, 'names': n, 'frames': [], 'published': p} for i, n, p in [
        ('ca', ['Canada', 'Canada', 'Kanada', 'Canadá'], True), ('es', ['Espagne', 'Spain', 'Spanien', 'España'], True),
        ('fr', ['France', 'France', 'Frankreich', 'Francia'], True), ('gb', ['Royaume-Uni', 'United Kingdom', 'Vereinigtes Königreich', 'Reino Unido'], True),
        ('us', ['États-Unis', 'United States', 'Vereinigte Staaten', 'Estados Unidos'], True), ('de', ['Allemagne', 'Germany', 'Deutschland', 'Alemania'], False)]]
    pub = {
        'base': {'fr': zone(prev, 19), 'gb': zone(cur, 18), 'es': zone(cur, 19), 'us': zone(cur, 19), 'ca': zone(cur, 19)},
        'proc': {'cycles': {cur.isoformat(): {'aerodromes': 40, 'byStatus': {'official': 30, 'check': 10}}}, 'inForce': cur.isoformat()},
        'vfr': {'cycle': cur.isoformat(), 'at': f'{today.isoformat()}T07:00:00Z', 'count': 400},
        'aircraft': {'at': (today - datetime.timedelta(days=40)).isoformat() + 'T00:00:00Z', 'types': 300, 'files': 4}}
    states = {}
    plan = [('green', 'held', ['LF', 'EG'], 12), ('orange', 'sia', ['LF2'], 0), ('orange', 'ead', ['EB', 'LO'], 0), ('red', 'images', ['LS'], 0),
            ('red', 'labels', ['ED'], 0), ('red', 'points', ['LK'], 0), ('red', 'prose', ['LH'], 0), ('red', 'vfr', ['LY'], 0),
            ('red', 'none', ['LZ'], 0), ('red', 'unknown', ['EE'], 0)]
    for level, reason, prefixes, held in plan:
        for p in prefixes:
            e = {'level': level, 'reason': reason, 'label': [f'{reason}-fr', f'{reason}-en', f'{reason}-de', f'{reason}-es']}
            if shape:      # what coverageByState() gives since 567b94440: names x4 for every prefix, held always a number
                e.update({'names': [f'{p}-fr', f'{p}-en', f'{p}-de', f'{p}-es'], 'held': held if p == 'LF' else 0})
            if p == 'LF' and shape:
                e.update({'names': ['France', 'France', 'Frankreich', 'Francia']})
            states[p] = e
    return {'zones': zones, 'publication': pub, 'states': states, 'pv': pv, 'fail': []}, (today, cur, prev, nxt)


def _stub(cfg):
    """Init script: patches the aerodb service the moment AeroDB.create builds it, before any module mounts (as D45 does).  The answers
    are read from window.__stub (a case may change them); window.__stub.fns holds the 'change' listeners (the frame's and the module's)."""
    return """(() => { const cfg = %s; cfg.fns = new Set(); window.__stub = cfg; let ab;
  const patch = (A) => {
    const ok = (name, key) => async () => { const k = window.__stub.calls = window.__stub.calls || {}; k[name] = (k[name] || 0) + 1; if (window.__stub.fail.includes(name)) throw new Error('stub: ' + name); return window.__stub[key] };
    A.publication = ok('publication', 'publication'); A.zones = ok('zones', 'zones'); A.coverageByState = ok('coverageByState', 'states'); A.zoneOutlines = ok('zoneOutlines', 'outlines');
    const s = A.sources; A.sources = async () => { const r = await s.call(A); if (cfg.pv) return { ...r, PARSER_VERSION: cfg.pv }; const { PARSER_VERSION, ...rest } = r; return rest };  // pv null: the catalogue without its constant (aerodb has carried one since 567b94440)
    const on = A.on; A.on = function (ev, fn) { const un = on.call(A, ev, fn); if (ev === 'change') window.__stub.fns.add(fn); return () => { window.__stub.fns.delete(fn); un() } };
    return A };
  Object.defineProperty(window, 'AeroDB', { configurable: true, get() { return ab },
    set(v) { ab = v; if (v && v.create && !v.__data) { const o = v.create; v.__data = 1; v.create = function (...a) { return patch(o.apply(this, a)) } } } }) })()""" % json.dumps(cfg)


def _open(c, cfg, target='data'):
    c.page.add_init_script(_stub(cfg))
    c.open(target, docs=LEVEL3, wait=False, app='maintenance')  # le module Données est dans l'application Maintenance
    c.until("!!document.querySelector('[data-module=data] [data-data-head]')", timeout=20000, what='the head of the Données screen is drawn')
    c.settle()


_ROWS_JS = r"""() => {
  const root = document.querySelector('[data-module=data]');
  const groups = [...root.querySelectorAll('details.f-group')].map(g => ({
    id: g.dataset.group, open: g.open, title: g.querySelector(':scope > summary > span').textContent.trim(), sumH: g.querySelector(':scope > summary').getBoundingClientRect().height,
    visible: [...g.querySelectorAll('[data-set]')].filter(r => !r.closest('[data-more]')).map(r => r.dataset.set),
    states: Object.fromEntries([...g.querySelectorAll('[data-set][data-state]')].map(r => [r.dataset.set, r.dataset.state])),
    cycles: Object.fromEntries([...g.querySelectorAll('[data-set][data-state]')].map(r => [r.dataset.set, r.dataset.cycle])),
    more: (m => m ? { text: m.querySelector(':scope > summary').textContent.trim(), rows: [...m.querySelectorAll('[data-set]')].map(r => r.dataset.set + ':' + r.dataset.status), open: m.open } : null)(g.querySelector(':scope > [data-more]')),
    pills: [...g.querySelectorAll('details[data-set] > summary')].filter(s => s.offsetParent).map(s => s.getBoundingClientRect().height)
  }));
  return { groups, verbs: [...document.querySelectorAll('[data-build] [data-verb]:not([data-verb=pickup]), [data-publish] [data-verb]')].map(b => b.dataset.verb + (b.disabled ? ':off' : '')), buttons: root.querySelectorAll('[data-build] button:not([data-verb=pickup]), [data-publish] button').length,
    sw: document.documentElement.scrollWidth, iw: window.innerWidth,
    over: [...root.querySelectorAll('*')].filter(e => e.getBoundingClientRect().width && (e.getBoundingClientRect().right > window.innerWidth + 1) && !e.closest('[hidden]')).slice(0, 3).map(e => e.tagName + '.' + e.className) };
}"""


@case('L2', 'Données: the read-only screen on a stubbed aerodb', 'L', tags=('data',), langs4=True,
      rule='modules/data/SPEC 3 and 9 (DOM contract), scope of lot 1: no action button, seven rows, seven lines, no horizontal scroll, 44 px')
def l2(c):
    cfg, (today, cur, prev, nxt) = _fixture()
    _open(c, cfg)
    lang = c.lang
    # head: the cycle in force, its dates, the next one, the runner
    c.eq(c.text('[data-cycle-now]'), _name(cur), 'the AIRAC cycle in force, written YYNN', what='cycle now')
    days = (nxt - today).days
    nexttxt = tx(TX, 'nextOne' if days == 1 else 'nextMany', lang).replace('{c}', _name(nxt)).replace('{n}', str(days))
    dates = tx(TX, 'cycleDates', lang).replace('{a}', _date_text(cur, lang)).replace('{b}', _date_text(nxt - datetime.timedelta(days=1), lang))
    c.eq(norm(c.text('[data-cycle-dates]')), norm(f'{dates} · {nexttxt}'), 'the effective date to the day before the next, and the days to the next cycle', what='cycle dates')
    c.eq(c.attr('[data-runner]', 'data-runner'), 'none', 'no launcher in the suite: read only', what='runner')
    c.eq(norm(c.text('[data-runner]')), norm(tx(TX, 'runnerNone', lang)), 'the runner line in the language of the run', what='runner text')
    # coverage: zones by name, written once
    names = {'fr': 0, 'en': 1, 'de': 2, 'es': 3}[lang]
    zn = [z['names'][names] for z in cfg['zones'] if z['published']]
    c.eq(norm(c.text('[data-coverage] [data-zones]')), norm(tx(TX, 'coverageZones', lang).replace('{z}', ', '.join(zn))), 'the published zones by name, in the order of zones()', what='coverage zones')
    doc = c.until_doc('cache/data/coverage.json', lambda d: bool(d and d.get('zones')), what='the coverage is written at the first opening')
    c.eq(doc['zones'], ['ca', 'es', 'fr', 'gb', 'us'], 'every published zone is in the coverage at the first opening', what='coverage.json')
    # the States: seven lines, the rest under the fold, green / orange / red
    lines = c.js("[...document.querySelectorAll('[data-coverage] ul[data-states] > li')].map(li => [li.dataset.level, li.dataset.reason, li.textContent.replace(/\\s+/g, ' ').trim()])")
    c.eq(len(lines), 7, 'seven State lines visible', what='State lines')
    c.eq([x[0] for x in lines], ['green', 'orange', 'orange', 'red', 'red', 'red', 'red'], 'green first, then orange, then red', what='colour order')
    c.ok(all(x[2].startswith(f'held-{lang}') or x[1] != 'held' for x in lines), f'{lines[0]}', 'the reason label (text, not colour alone) leads every line')
    held = norm(lines[0][2])
    fr_name = {'fr': 'France', 'en': 'France', 'de': 'Frankreich', 'es': 'Francia'}[lang]
    c.ok(fr_name in held and 'EG-' + lang in held, held, 'a State shows its name of the language, and (n aerodromes) when it holds some: France (12 ...)')
    c.ok('(12 ' in held and '(0 ' not in ' '.join(x[2] for x in lines), held, 'held is shown beside the name when positive, never (0 ...)')
    more = c.js("(m => m ? { text: m.querySelector('summary').textContent.trim(), n: m.querySelectorAll('li').length } : null)(document.querySelector('[data-coverage] [data-more]'))")
    c.eq([more['text'], more['n']], [norm(tx(TX, 'moreStates', lang).replace('{n}', '3')), 3], 'three more under the fold', what='States fold')
    c.eq(norm(c.text('[data-legend]')), norm(tx(TX, 'legend', lang)), 'a legend of the three colours', what='legend')
    # the groups
    m = c.js(_ROWS_JS)
    g = {x['id']: x for x in m['groups']}
    c.eq([x['id'] for x in m['groups']], ['base', 'proc', 'aircraft', 'weather'], 'four groups in the order of the SPEC', what='groups')
    c.eq([x['title'] for x in m['groups']], [tx(TX, k, lang, after='groups: {') for k in ('base', 'proc', 'aircraft', 'weather')], 'the titles in the language of the run', what='group titles')
    c.eq([x['open'] for x in m['groups']], [True, False, True, False], 'open when a row needs attention (stale base, aircraft over 28 days), folded otherwise', what='open groups')
    for x in m['groups']:
        c.le(len(x['visible']), 7, f'group {x["id"]}', what='visible rows')
    c.eq(len(g['base']['visible']), 7, 'the base has eleven used sets: seven visible', what='base rows visible')
    c.eq(g['base']['more']['text'], norm(tx(TX, 'moreSets', lang).replace('{n}', '4')), 'four more sets under the fold', what='base fold')
    c.ok(all(r.endswith(':used') for r in g['base']['more']['rows']), g['base']['more']['rows'], 'the surplus of the base is made of used sets')
    c.eq(g['proc']['visible'], ['eaip', 'cifp'], 'procedures: eAIP and CIFP visible', what='proc rows')
    c.eq(g['proc']['more']['rows'], ['ead:candidate', 'xpcifp:candidate', 'dfs:abandoned', 'eurocontrol:abandoned'], 'candidates, then set-aside sources: only in the fold, no state', what='proc fold')
    # the states of the rows (stale base for France, the parser constant 3 against UK zone at 2)
    allst = {}
    for x in m['groups']:
        allst.update(x['states'])
    allrows = [r for x in m['groups'] for r in x['visible']] + [r.split(':')[0] for x in m['groups'] if x['more'] for r in x['more']['rows'] if r.endswith(':used')]
    for rid, want in (('sia', 'stale-cycle'), ('openaip', 'stale-cycle'), ('ukmil', 'parser'), ('nats', 'parser'), ('enaire', 'ok'), ('eaip', 'ok'), ('aircraft', 'stale-age')):
        c.eq(allst.get(rid) or _open_and_state(c, rid), want, f'state of {rid}', what=f'data-state {rid}')
    c.eq(g['base']['cycles'].get('sia'), _name(prev), 'the France row carries the cycle published (one behind)', what='data-cycle of sia')
    c.eq(g['weather']['states'], {}, 'the weather rows have no state', what='weather states')
    c.eq(c.text('[data-set="ukmil"] .f-badge[data-pill]'), tx(TX, 'parser', lang, after='state: {'), 'the pill is worded in the language of the run', what='ukmil pill')
    # no action button anywhere, no horizontal scroll, 44 px on the summaries
    c.eq([m['verbs'], m['buttons']], [['download:off', 'build:off', 'purge:off', 'publish:off'], 4],
         'the verbs are Télécharger · Construire · Purger (one panel) then Publier, all grey (no launcher in the suite): no Mettre à jour', what='verbs / buttons')
    c.eq([c.attr('[data-publish] [data-reason]', 'data-reason'), norm(c.text('[data-publish] [data-reason]'))], ['no-launcher', norm(_trow('no-launcher', lang, 'greyReason: {'))],
         'Publier is grey for the same reason, written once', what='publish reason')
    c.eq(c.count('[data-group=base] > [data-build] + [data-publish]'), 1, 'the Publier panel follows the Construire panel', what='panel order')
    # the build panel at the top of the base group: every zone of the coverage ticked, the personal sources unticked, the reason written once
    panel = c.js("""() => { const b = document.querySelector('[data-group=base] > [data-build]'); return b && {
      zones: [...b.querySelectorAll('[data-build-zone]')].map(i => [i.dataset.buildZone, i.checked]),
      personal: [...b.querySelectorAll('[data-personal]')].map(i => [i.dataset.personal, i.checked]),
      lines: [...b.querySelectorAll('[data-personal-line]')].map(p => p.textContent.trim()),
      reasons: [...b.querySelectorAll('[data-reason]')].map(p => [p.dataset.reason, p.textContent.trim()]),
      labels: [...b.querySelectorAll('label.d-opt')].map(l => Math.round(l.getBoundingClientRect().height)),
      btn: Math.round(b.querySelector('[data-verb=build]').getBoundingClientRect().height), first: b === document.querySelector('[data-group=base]').children[1],
      journal: (j => j && { open: j.open, h: Math.round(j.querySelector('summary').getBoundingClientRect().height), last: j === document.querySelector('[data-module=data] [data-body]').lastElementChild })(document.querySelector('[data-journal]')) } }""")
    c.ok(panel and panel['first'], panel, 'the build panel is the first thing in the content of the base group')
    c.eq(panel['zones'], [[z, True] for z in ('ca', 'es', 'fr', 'gb', 'us')], 'the zones of the coverage, all ticked by default', what='build zones')
    c.eq(panel['personal'], [['enaire', False], ['nats', False], ['xplane', False]], 'the three personal-licence sources, UNticked, as every zone ticked feeds them', what='personal sources')
    c.eq([norm(x) for x in panel['lines']], [norm(tx(TX, 'licence', lang, after='personalLine: {'))] * 2 + [norm(tx(TX, 'xplane', lang, after='personalLine: {'))],
         'the personal-use line, the X-Plane variant for X-Plane', what='personal lines')
    c.eq([[r[0], norm(r[1])] for r in panel['reasons']], [['no-launcher', norm(_trow('no-launcher', lang, 'greyReason: {'))]], 'the grey button says why, once', what='reason')
    c.ge(min(panel['labels'] + [panel['btn']]), 44, 'every checkbox line and the button are 44 px', what='touch height')
    c.eq([panel['journal']['open'], panel['journal']['last']], [False, True], 'the journal is the foot of the screen, folded', what='journal')
    c.ge(panel['journal']['h'], 44, 'its summary is a 44 px target', what='journal summary')
    c.le(m['sw'], m['iw'], 'no horizontal scroll', what='scrollWidth')
    c.ok(not m['over'], m['over'], 'no element beyond the right edge of the window')
    for x in m['groups']:
        c.ge(round(x['sumH']), 44, f'group summary {x["id"]}', what='summary height')
        for h in x['pills']:
            c.ge(round(h), 44, f'row summary in {x["id"]}', what='row summary height')
    # a row's detail unfolds: the link with its address, the licence
    c.tap('[data-set="sia"] > summary')
    c.until("document.querySelector('[data-set=sia]').open", what='the detail unfolds')
    d = c.js("(r => ({ href: r.querySelector('a[target=_blank]').getAttribute('href'), rel: r.querySelector('a[target=_blank]').rel, h: r.querySelector('a[target=_blank]').getBoundingClientRect().height, url: r.querySelector('.d-url').textContent, zones: [...r.querySelectorAll('[data-zone-pub]')].map(z => z.dataset.zonePub) }))(document.querySelector('[data-set=sia]'))")
    c.ok(d['href'].startswith('https://') and d['href'] == d['url'], d, 'the link and its address written beside it')
    c.ok('noopener' in d['rel'], d['rel'], 'noopener on the outgoing link')
    c.ge(round(d['h']), 44, 'the link is a 44 px target', what='link height')
    c.eq(d['zones'], ['fr'], 'the detail lists the zones the source feeds', what='zones of sia')
    c.eq(c.js("document.documentElement.scrollWidth <= window.innerWidth"), True, 'still no horizontal scroll with a detail open', what='scrollWidth')
    c.check_errors()


def _open_and_state(c, rid):
    """The data-state of a row that sits under a group's fold (not visible): the fold is unfolded and read."""
    return c.js("(id) => (r => r ? r.dataset.state : null)(document.querySelector('[data-set=\"' + id + '\"]'))", rid)


# ------------------------------------------------------------------------------------------------------ L3
@case('L3', 'Données: in the Maintenance application, not in Pilot; Settings > Administration « Maintenance » leads to it', 'L', tags=('data',), langs4=True,
      designs=('standard',), rule='user, 29 Oct: the data module is the Maintenance application (?app=maintenance), not a place of Pilot\'s rail; the Administration line (read only on a phone)')
def l3(c):
    cfg, _ = _fixture()
    c.page.add_init_script(_stub(cfg))
    title = lambda: tx('frame/settings/admin_links.js', 'title', c.lang, after="id: 'data'")
    # below the Full level: no Administration line
    for lv in (1, 2):
        c.open('settings', docs=[['device/level.json', {'level': lv}, 'cache']])
        c.until("!!document.querySelector('[data-card=\"status\"]')", what='the settings are drawn')
        c.eq(c.count('#fMenu a[data-id="data"]'), 0, f'level {lv}: no Données entry in the rail', what='rail entries')
        c.eq(c.count('[data-admin="data"], a[href*="app=maintenance"]'), 0, f'level {lv}: no link to Maintenance in Settings', what='Settings links')
    # the Full level: still not in the rail nor the phone's bar, the line « Maintenance » in the Administration card
    c.open('settings', docs=LEVEL3)
    c.until("!!document.querySelector('[data-card=\"admin\"] li[data-admin=\"data\"]')", what='the Administration card lists the Maintenance line')
    c.eq(c.count('#fMenu a[data-id="data"]'), 0, 'not a place of Pilot\'s rail (the Maintenance application)', what='rail entries')
    c.eq(c.count('#fTabs [data-tab="data"], #fTabs a[href="#data"]'), 0, 'no tab of the phone bar', what='bar entries')
    if c.count('[data-group="admin"]') and not c.js("document.querySelector('[data-group=\"admin\"]').open"):
        c.tap('[data-group="admin"] > summary')
    btn = c.js("(() => { const e = document.querySelector('[data-admin=\"data\"]').firstElementChild; return { tag: e.tagName, href: e.getAttribute('href'), h: e.getBoundingClientRect().height, text: e.textContent } })()")
    c.ok(btn['tag'] == 'A' and btn['href'].endswith('/frame/?app=maintenance#data'), btn, 'a real link to the Maintenance application, on Données')
    c.eq(c.js("document.querySelector('[data-admin=\"data\"] > a').getAttribute('target')"), None, 'opened in the same tab', what='target')
    c.eq(norm(btn['text']), norm(title()), 'the line is worded « Maintenance » in the language of the run', what='link text')
    c.ge(btn['h'], 43.5, 'touch target of the frame', what='link height')
    c.tap('[data-admin="data"] > a')
    c.until("!!document.querySelector('[data-module=data] [data-data-head]')", timeout=20000, what='the module is mounted by the link (at 390 as at 1280)')
    c.eq((c.js('location.search'), c.hash()), ('?app=maintenance', '#data'), 'the address: the Maintenance application, on Données', what='address')
    c.eq(c.count('#fMenu a[data-id="data"]'), 1, 'in the rail of Maintenance', what='rail entries')
    c.eq(c.count('[data-build] [data-verb]:not([data-verb=pickup]), [data-publish] [data-verb]'), 4, 'Télécharger, Construire, Purger and Publier, grey without a launcher', what='[data-verb]')
    c.ok(c.text('[data-cycle-now]'), 'no cycle', 'the head shows the cycle in force')
    c.check_errors()


# ------------------------------------------------------------------------------------------------------ L4
@case('L4', 'Données: a failing aerodb call is said in one line, nothing throws', 'L', tags=('data',), phone=False,
      rule='modules/data/SPEC 3 (the section says it); lot 1: never an exception')
def l4(c):
    cfg, _ = _fixture()
    cfg['fail'] = ['publication', 'zones', 'coverageByState']
    _open(c, cfg)
    c.eq([c.count('[data-error="publication"]'), c.count('[data-error="zones"]'), c.count('[data-error="states"]')], [1, 1, 1], 'one line per failed call', what='error lines')
    c.eq(norm(c.text('[data-error="publication"]')), norm(tx(TX, 'pubError', c.lang)), 'worded in the language of the run', what='publication error')
    c.eq(c.count('details.f-group'), 4, 'the four groups are still drawn (names and links)', what='groups')
    c.eq(c.count('[data-set][data-state]'), 0, 'no state is invented without a publication', what='states')
    c.eq(c.doc('cache/data/coverage.json'), None, 'a degraded read writes no coverage', what='coverage.json')
    c.eq(c.js("[...document.querySelectorAll('[data-build] [data-verb]:not([data-verb=pickup]), [data-publish] [data-verb]')].map(b => b.dataset.verb + (b.disabled ? ':off' : ''))"), ['download:off', 'build:off', 'purge:off', 'publish:off'], 'Télécharger, Construire, Purger and Publier, grey', what='[data-verb]')
    c.check_errors()


# ------------------------------------------------------------------------------------------------------ L5
@case('L5', 'Données: fallbacks (no names, no held, no parser constant) and the States list follows aerodb { coverage: true }', 'L',
      tags=('data',), phone=False, rule='modules/data/SPEC 3 (the States list), 6.2 (no constant: never "old parser"); aerodb change signal { coverage: true }')
def l5(c):
    cfg, _ = _fixture(pv=None, shape=False)
    c.page.add_init_script("localStorage.setItem('sogFrame:dev', '1')")  # le module d'exemple : un autre module de Maintenance où aller
    _open(c, cfg)
    lines = c.js("[...document.querySelectorAll('[data-coverage] ul[data-states] > li')].map(li => [li.dataset.reason, li.textContent.replace(/\\s+/g, ' ').trim()])")
    c.ok(lines and 'EG, LF' in lines[0][1], lines[:1], 'without names the line shows the prefixes (EG, LF), without (n aerodromes)')
    c.eq(c.count('[data-set][data-state="parser"]'), 0, 'without the parser constant no row is ever "old parser" (the UK zone is at version 18)', what='parser pills')
    c.eq(c.count('[data-set][data-state]'), c.count('[data-set][data-state="ok"], [data-set][data-state="stale-cycle"], [data-set][data-state="stale-age"]'),
         'the other states are the cycle ones', what='states without the constant')
    # aerodb announces { coverage: true }: only the States list is asked for again and redrawn
    c.js("() => { document.querySelector('[data-coverage] [data-more] summary').click(); document.querySelector('[data-set=sia]').dataset.keep = '1' }")
    c.js("""() => { const S = window.__stub; S.states = { ...S.states, LF: { level: 'green', reason: 'held', label: ['held-fr', 'held-en', 'held-de', 'held-es'], names: ['Fr', 'Fr', 'Fr', 'Fr'], held: 5 } };
      for (const fn of [...S.fns]) fn({ coverage: true }) }""")
    c.until("document.querySelector('[data-coverage] ul[data-states] > li').textContent.includes('Fr (5')", timeout=4000, what='the States list shows the new coverage')
    c.eq(c.attr('[data-set="sia"]', 'data-keep'), '1', 'only the States list is redrawn: the rows are the same elements', what='row element kept')
    c.ok(c.js("document.querySelector('[data-coverage] [data-more]').open"), 'folded again', 'the fold the reader opened stays open')
    # the module gives its listener back when it is left
    before = c.js('window.__stub.fns.size')
    c.go('hello')  # Maintenance n'a que Données : le module d'exemple (poste de développement) pour le quitter
    c.until('window.__stub.fns.size < %d' % before, timeout=4000, what='the module unsubscribes at unmount')
    c.check_errors()


# ------------------------------------------------------------------------------------------------------ L6
_L6_JS = r"""async () => {
  const M = await import('/modules/data/model.js');
  const out = {};
  out.personal = [[], ['fr'], ['es'], ['gb'], ['es', 'gb', 'fr']].map(z => M.personalSources(z).map(p => p.id + ':' + p.kind));
  out.gate = [{ launcher: false, busy: true, zones: 0, offline: true }, { launcher: true, busy: true, zones: 0 }, { launcher: true, busy: false, zones: 2, offline: true },
    { launcher: true, zones: 0 }, { launcher: true, zones: 2 }].map(s => { const g = M.setGate({ set: 'base', launcher: s.launcher, busy: s.busy, offline: s.offline, items: s.zones }); return { disabled: g.verbs.build.disabled, reason: g.verbs.build.reason } });
  out.phrase = [undefined, { state: 'building', done: 2, total: 5 }, { state: 'building' }, { state: 'built' }, { state: 'failed', error: 'timeout' },
    { state: 'failed', error: 'zzz' }, { state: 'cancelled' }, { state: 'weird' }].map(z => { const p = M.zonePhrase(z); return [p.state, p.key, p.n, p.m, p.code] });
  out.rows = M.zoneRows({ zones: { fr: { state: 'built' }, us: { state: 'building', done: 1, total: 3 } } }, ['fr', 'gb']).map(r => [r.zone, r.key]);
  out.progress = [M.progress({ done: 2, total: 5 }, ['a']), M.progress(null, ['a', 'b']), M.progress({ done: 9, total: 5 }, []), M.progress(null, [])];
  out.clock = [0, 59, 125, -3, 3600].map(M.clock);
  out.isBuild = [{ zones: {} }, { set: 'base', verb: 'build' }, { state: 'done' }, null, { zones: [] }].map(v => { const o = M.viewOp(v); return !!o && o.set === 'base' && o.verb === 'build' });
  const z = s => ({ state: s }), zf = e => ({ state: 'failed', error: e });
  const o = f => { const r = M.outcome(f); return [r.kind, r.built, r.failed] };
  out.outcome = [
    { state: 'done', zones: { fr: z('built'), gb: z('built') }, result: { built: ['fr', 'gb'], failed: [] } },
    { state: 'done', result: { built: ['fr'], failed: [{ zone: 'gb', error: 'timeout' }], reason: 'partial' } },
    { state: 'error', result: { built: [], failed: [{ zone: 'fr', error: 'invalid-output' }], reason: 'failed' } },
    { state: 'cancelled', zones: { fr: z('built'), gb: z('cancelled') } },
    { state: 'interrupted', zones: { fr: z('built'), gb: z('building') } },
    { state: 'error', result: { ok: false, reason: 'no-browser' } },
    { state: 'error', result: { ok: false, reason: 'xplane-in-page' } },
    { state: 'done', zones: { fr: z('built'), gb: zf('timeout') } },
    { state: 'done', zones: { fr: zf('x') } },
    { state: 'done', result: { reason: 'cancelled', built: ['fr'] } }].map(o);
  out.result = ['done', 'partial', 'failed', 'cancelled', 'interrupted', 'no-browser', 'xplane-in-page'].map(M.journalResult);
  out.refusal = [{ status: 409 }, { status: 429, reason: 'too-soon', wait: 12.2 }, { status: 429 }, { status: 404, message: 'unknown route' }, { status: 400 },
    { status: 403, refused: true }, { ok: false, offline: true }, { status: 500 }, null].map(r => { const f = M.refusal(r); return [f.key, f.wait] });
  const at = Date.parse('2026-10-29T10:00:00Z');
  out.entry = M.journalEntry({ at, zones: ['fr', 'gb'], seconds: 12.4, out: { kind: 'partial', built: ['fr'], failed: [{ zone: 'gb' }] }, job: 'j1' });
  out.entryNoBrowser = M.journalEntry({ at, zones: ['fr'], seconds: null, out: { kind: 'no-browser', built: [], failed: [] } });
  const list = Array.from({ length: 50 }, (_, i) => ({ at: new Date(at + i * 1000).toISOString(), verb: 'build', job: 'k' + i }));
  const more = M.journalAdd(list, out.entry);
  out.trim = [more.length, more[0].job, more[49].job, M.journalAdd(more, out.entry) === more, M.journalAdd([], { ...out.entryNoBrowser }).length];
  out.list = [M.journalList([list[0], { verb: 'x' }, null, 'x']).length, M.journalList({ ops: [list[1]] }).length, M.journalList('x').length, M.journalList(null).length];
  return out;
}"""


@case('L6', 'Données: Construire, the pure functions on fixtures', 'L', tags=('data',), phone=False,
      rule='modules/data/SPEC 5.4, 6.5 (one grey reason), 3 (journal of 50); launcher job protocol (frame/INTEGRATION 15.1)')
def l6(c):
    c.page.goto(f'{c.base}/frame/manifest.webmanifest', wait_until='load')
    r = c.js(_L6_JS)
    c.eq(r['personal'], [[], ['xplane:xplane'], ['enaire:licence', 'xplane:xplane'], ['nats:licence', 'xplane:xplane'], ['enaire:licence', 'nats:licence', 'xplane:xplane']],
         'a personal source is offered only when it feeds a ticked zone (X-Plane feeds every zone, none ticked: nothing)', what='personalSources')
    c.eq([[g['disabled'], g['reason']] for g in r['gate']],
         [[True, 'no-launcher'], [True, 'busy'], [True, 'offline'], [True, 'no-zone'], [False, None]], 'one reason, in the order: launcher, busy, offline, no zone', what='setGate base')
    c.eq(r['phrase'], [['waiting', 'waiting', None, None, None], ['building', 'buildingN', 2, 5, None], ['building', 'building', None, None, None], ['built', 'built', None, None, None],
                       ['failed', 'failed', None, None, 'timeout'], ['failed', 'failed', None, None, 'unknown'], ['cancelled', 'cancelled', None, None, None], ['waiting', 'waiting', None, None, None]],
         'the phrase of a zone: n / m sources only when both are known, the error code kept or « unknown », an unknown state waits', what='zonePhrase')
    c.eq(r['rows'], [['fr', 'built'], ['gb', 'waiting'], ['us', 'buildingN']], 'the requested zones in order (the one the job does not know yet waits), then the ones the job adds', what='zoneRows')
    c.eq(r['progress'], [{'done': 2, 'total': 5, 'pct': 40}, {'done': 0, 'total': 2, 'pct': 0}, {'done': 5, 'total': 5, 'pct': 100}, {'done': 0, 'total': 0, 'pct': None}],
         'the bar: done / total of the view, else 0 over the zones asked; never above the total; no total, no percentage', what='progress')
    c.eq(r['clock'], ['0:00', '0:59', '2:05', '0:00', '60:00'], 'elapsed time as minutes:seconds', what='clock')
    c.eq(r['isBuild'], [True, True, False, False, False], 'a view is a base build when it carries its zones (or says set and verb)', what='viewOp base build')
    c.eq(r['outcome'], [['done', ['fr', 'gb'], []], ['partial', ['fr'], [{'zone': 'gb', 'error': 'timeout'}]], ['failed', [], [{'zone': 'fr', 'error': 'invalid-output'}]],
                        ['cancelled', ['fr'], []], ['interrupted', ['fr'], []], ['no-browser', [], []], ['xplane-in-page', [], []],
                        ['partial', ['fr'], [{'zone': 'gb', 'error': 'timeout'}]], ['failed', [], [{'zone': 'fr', 'error': 'x'}]], ['cancelled', ['fr'], []]],
         'the end of a job: the launcher\'s reason wins, else the zones decide (some built and some failed: partial; none built: failed)', what='outcome')
    c.eq(r['result'], ['done', 'partial', 'failed', 'cancelled', 'interrupted', 'failed', 'failed'], 'the journal result: no-browser and xplane-in-page are failures', what='journalResult')
    c.eq(r['refusal'], [['busy', None], ['tooSoon', 13], ['failed', None], ['unknown-route', None], ['bad-args', None], ['refused', None], ['offline', None], ['failed', None], ['failed', None]],
         'a refusal: 409 busy, 429 too-soon with the wait rounded up, 404 unknown route, 400, 403 refused, no answer offline', what='refusal')
    e = r['entry']
    c.eq(e, {'at': '2026-10-29T10:00:00.000Z', 'set': 'base', 'verb': 'build', 'zones': ['fr', 'gb'], 'seconds': 12, 'result': 'partial', 'built': ['fr'],
             'failed': [{'zone': 'gb', 'error': None}], 'job': 'j1'}, 'a journal entry: UTC ISO time, set, verb, zones, seconds, result, built, failed (and the job)', what='journalEntry')
    c.eq([r['entryNoBrowser']['result'], r['entryNoBrowser']['reason'], r['entryNoBrowser']['seconds'], 'job' in r['entryNoBrowser']], ['failed', 'no-browser', None, False], 'no-browser: a failure with its reason, no job id', what='journalEntry no-browser')
    c.eq(r['trim'], [50, 'k1', 'j1', True, 1], 'the journal keeps the last 50 (the oldest leaves), the same job is never added twice', what='journalAdd')
    c.eq(r['list'], [1, 1, 0, 0], 'a journal file is read as an array or { ops }, unreadable entries dropped', what='journalList')
    c.check_errors()


# ------------------------------------------------------------------------------------------------------ L7, L8, L9, L10
STATUS = {'server': True, 'root': '', 'git': True, 'data': True, 'dataGit': True, 'dataRepo': '', 'lfs': False, 'csp': True,
          'relaxNav': False, 'host': 'TEST', 'lan': False}
UNIT_ZONE = {'fr': ('zone', 'zones'), 'en': ('zone', 'zones'), 'de': ('Zone', 'Zonen'), 'es': ('zona', 'zonas')}


def _trow(key, lang, after=None, row=0):
    """One translation of a row of modules/data/texts.js, the key quoted or not (`'no-launcher': [...]`, `busy: [...]`); `after`: a text to find first;
    `row`: the rank of the row in an array of rows (`pubFiles: [[singular], [plural]]`: 0, 1)."""
    from lib import LANGS, _STR, _unesc
    src = (ROOT / TX).read_text(encoding='utf-8')
    start = src.index(after) if after else 0
    m = re.compile(r"""(?<![\w-])['"]?""" + re.escape(key) + r"""['"]?\s*:\s*\[""").search(src, start)
    if not m:
        raise RuntimeError(f'row {key!r} not found after {after!r}')
    out, i = [], m.end()
    while len(out) < 4 * (row + 1):
        g = _STR.search(src, i)
        out.append(_unesc(next(x for x in g.groups() if x is not None)))
        i = g.end()
    return out[4 * row + LANGS.index(lang)]


def _zones_text(lang, n):
    """« 1 zone », « 3 zones » as the screen counts them."""
    return f'{n} {UNIT_ZONE[lang][0 if n == 1 else 1]}'


def _view(state='running', step='', done=0, total=2, zones=None, result=None, jid='j1', unit='zones'):
    """The job's view as the launcher gives it (frame/INTEGRATION 15.1; aerodb's D5 verb)."""
    return {'id': jid, 'state': state, 'step': step, 'done': done, 'total': total, 'unit': unit, 'log': [], 'result': result, 'zones': zones if zones is not None else {}}


def _zs(state, done=0, total=0, **extra):
    """A zone's entry of the job's view."""
    return {'state': state, 'done': done, 'total': total, **extra}


def _launcher(c, views=(), last=None, start=(200, {'job': 'j1'}), cancel_view=None, busy_view=None, sync=None, verbs=None):
    """A FAKE launcher (the technique of frame A32: c.context.route answers /__setup/*; never a real one).  `views`: what GET regen/job?id= answers one
    after the other (the last one stays); `last`: what GET regen/job (no id) answers at first (the running or the last job); `start`: (status, body) of the
    POST that starts a job; `cancel_view`: what the job becomes once POST regen/job/cancel was received; `busy_view`: the running job a refused start
    (409) leaves in place; `sync`: what GET sync-status answers (`{'changes', 'ahead', 'merging', 'last'}`, or `(status, body)`).  The dict it returns records
    `posts`, `cancels` and `syncs` (the reads of sync-status) and can be changed between steps.  `verbs`: what GET regen/verbs answers: None = an old launcher
    (200 with no list), a list = `{ verbs: [...] }`, an int = that status (404...); `st['verbs_calls']` counts the reads."""
    st = {'posts': [], 'cancels': [], 'views': list(views), 'i': 0, 'current': last, 'cancelled': False, 'start': start, 'syncs': 0,
          'sync': sync or {'changes': 0, 'ahead': 0, 'merging': False, 'last': None}, 'verbs': verbs, 'verbs_calls': 0}

    def handler(route):
        req = route.request
        u = urllib.parse.urlparse(req.url)
        code, body = 200, {}
        if u.path.endswith('/__setup/status'):
            body = STATUS
        elif u.path.endswith('/__setup/sync-status'):
            st['syncs'] += 1
            body = st['sync']
            if isinstance(body, tuple):
                code, body = body
            else:
                body = {'repo': True, 'branch': 'main', 'behind': 0, **body}
        elif u.path.endswith('/__setup/regen/verbs'):
            st['verbs_calls'] += 1
            if isinstance(st['verbs'], int):
                code = st['verbs']
            elif isinstance(st['verbs'], list):
                body = {'verbs': st['verbs']}
        elif u.path.endswith('/__setup/regen/job/cancel'):
            st['cancels'].append(json.loads(req.post_data or '{}'))
            st['cancelled'] = True
            body = {'ok': True}
            if cancel_view:
                st['current'] = cancel_view
        elif u.path.endswith('/__setup/regen/job'):
            if req.method == 'POST':
                st['posts'].append(json.loads(req.post_data or '{}'))
                code, body = st['start']
                if code == 409 and busy_view:
                    st['current'] = busy_view
            elif 'id=' in u.query:
                if st['cancelled'] and cancel_view:
                    body = cancel_view
                else:
                    body = st['views'][min(st['i'], len(st['views']) - 1)]
                    st['i'] += 1
                st['current'] = body
            else:
                body = {'job': st['current']}
        route.fulfill(status=code, content_type='application/json', body=json.dumps(body))
    c.context.route(re.compile(r'/__setup/'), handler)
    return st


def _untick(c, *zones):
    """Unticks zones of the build panel (a tap on the checkbox)."""
    for z in zones:
        c.tap(f'[data-build-zone="{z}"]')
    c.wait(150)


def _notes_with(c, text):
    """The notifications since the page opened that say `text` (the log keeps them after they fade)."""
    return [n for n in c.note_log() if norm(text) in norm(n)]


def _screen_ok(c, what):
    """No horizontal scroll, no element beyond the right edge, 44 px on the build panel's buttons and checkbox lines."""
    m = c.js("""() => { const b = document.querySelector('[data-build]'); return { sw: document.documentElement.scrollWidth, iw: window.innerWidth,
      over: [...b.querySelectorAll('*')].filter(e => e.getBoundingClientRect().width && e.getBoundingClientRect().right > window.innerWidth + 1).slice(0, 3).map(e => e.tagName + '.' + e.className),
      hs: [...b.querySelectorAll('button, label.d-opt')].map(e => Math.round(e.getBoundingClientRect().height)) } }""")
    c.le(m['sw'], m['iw'], f'{what}: no horizontal scroll', what='scrollWidth')
    c.ok(not m['over'], m['over'], f'{what}: nothing beyond the right edge')
    c.ge(min(m['hs']), 44, f'{what}: buttons and checkbox lines are 44 px', what='touch height')


def _head(c):
    """Waits for the head of the Données screen after a reload."""
    c.until("!!document.querySelector('[data-module=data] [data-data-head]')", timeout=20000, what='the head of the Données screen is drawn')
    c.settle()


@case('L7', 'Données: Construire against a fake launcher (body, zone lines, summary, one notification, journal, personal sources)', 'L', tags=('data',), langs4=True,
      designs=('standard',), rule='modules/data/SPEC 3 (one op, notify at the end only), 5.4, 6.5; launcher job protocol (frame/INTEGRATION 15.1)')
def l7(c):
    lang = c.lang
    v1 = _view(step='Zone fr', done=0, zones={'fr': _zs('building', 1, 4), 'gb': _zs('waiting')})
    v2 = _view(step='Zone gb', done=1, zones={'fr': _zs('built', 4, 4, commit='abc1234', seconds=9), 'gb': _zs('building', 2, 5)})
    v3 = _view('done', step='Terminé', done=2, zones={'fr': _zs('built', 4, 4, commit='abc1234'), 'gb': _zs('failed', 5, 5, error='invalid-output')},
               result={'built': ['fr'], 'failed': [{'zone': 'gb', 'error': 'invalid-output'}], 'commits': [{'zone': 'fr', 'commit': 'abc1234'}], 'reason': 'partial'})
    st = _launcher(c, [v1, v2, v2, v2, v3])
    cfg, _ = _fixture()
    _open(c, cfg)
    # a launcher is there: the button is live, no reason under the panel
    c.eq(c.attr('[data-runner]', 'data-runner'), 'launcher', 'the fake launcher is detected', what='runner')
    c.eq(c.js("document.querySelector('[data-verb=build]').disabled"), False, 'Construire is enabled with a launcher, zones ticked, nothing running', what='build disabled')
    c.eq(c.count('[data-build] [data-reason]'), 0, 'no reason when the button is live', what='reason')
    c.eq(norm(c.text('[data-verb=build]')), norm(_trow('build', lang)), 'worded in the language of the run', what='build label')
    # no zone: grey with its reason; ca, es, us unticked: fr and gb remain, ENAIRE is not offered any more
    _untick(c, 'ca', 'es', 'us', 'fr', 'gb')
    c.eq([c.js("document.querySelector('[data-verb=build]').disabled"), c.attr('[data-build] [data-reason]', 'data-reason'), norm(c.text('[data-build] [data-reason]'))],
         [True, 'no-zone', norm(_trow('no-zone', lang, 'greyReason: {'))], 'no zone ticked: grey, « Cochez au moins une zone » written once', what='no zone')
    c.eq(c.count('[data-personal]'), 0, 'no zone, no personal source to offer', what='personal sources')
    c.tap('[data-build-zone="fr"]')
    c.tap('[data-build-zone="gb"]')
    c.eq(c.js("[...document.querySelectorAll('[data-personal]')].map(i => [i.dataset.personal, i.checked])"), [['nats', False], ['xplane', False]],
         'France and the UK feed NATS and X-Plane (not ENAIRE): offered, unticked', what='personal sources')
    # X-Plane ticked: the hint under its checkbox, before the start; unticked again: gone
    c.tap('[data-personal="xplane"]')
    c.eq(norm(c.text('[data-personal-row="xplane"] [data-xplane-hint]')), norm(_trow('xplaneHint', lang)), 'the build in the page is not possible yet: said before the start', what='X-Plane hint')
    c.tap('[data-personal="xplane"]')
    c.eq(c.count('[data-xplane-hint]'), 0, 'unticked: no hint', what='X-Plane hint')
    _screen_ok(c, 'before the start')
    before = c.js('window.__stub.calls.publication')
    # start
    c.tap('[data-verb=build]')
    c.until("!!document.querySelector('[data-build] [data-running]')", what='the running bar is drawn')
    c.eq(len(st['posts']), 1, 'one start', what='posts')
    post = st['posts'][0]
    c.eq({k: post[k] for k in ('set', 'verb', 'args')}, {'set': 'base', 'verb': 'build', 'args': {'zones': ['fr', 'gb'], 'personal': []}},
         'the body: set / verb / the ticked zones, personal EMPTY by default', what='body')
    c.eq(post.get('author'), 'ABC', 'the frame adds the trigram itself', what='author')
    c.eq([c.js("document.querySelector('[data-verb=build]').disabled"), c.attr('[data-build] [data-reason]', 'data-reason')], [True, 'busy'], 'while it runs: grey, « Une autre opération est en cours »', what='running reason')
    c.eq(c.js("[...document.querySelectorAll('[data-build] input[type=checkbox]')].every(i => i.disabled)"), True, 'the choices are frozen while it runs', what='frozen checkboxes')
    c.eq(c.js("[...document.querySelectorAll('[data-build] [data-verb]:not([data-verb=pickup]), [data-publish] [data-verb]')].map(b => b.dataset.verb).sort()"), ['build', 'download', 'publish', 'purge', 'stop'], 'the four verbs (grey, a build is running) and stop only', what='verbs')
    c.eq(c.js("[...document.querySelectorAll('[data-zone-state]')].map(l => [l.dataset.zoneState, l.dataset.state])"), [['fr', 'waiting'], ['gb', 'waiting']], 'a line per zone, waiting before the first view', what='zone lines')
    c.until("document.querySelector('[data-zone-state=fr]').dataset.state === 'building'", timeout=8000, what='fr is building')
    fr_name = c.text('[data-zone-state=fr] b')
    c.eq(norm(c.text('[data-zone-state=fr]')), norm(f"{fr_name} : {_trow('buildingN', lang, 'zoneState: {').replace('{n}', '1').replace('{m}', '4')}"), 'construction (1 / 4 sources)', what='fr line')
    c.eq(norm(c.text('[data-running] [data-count]')), norm(_trow('runCount', lang).replace('{n}', _zones_text(lang, 0)).replace('{m}', '2')), 'the head count « 0 zones sur 2 »', what='count')
    c.eq(c.text('[data-running] [data-step]'), 'Zone fr', 'the step text of the job', what='step')
    c.ok(norm(_trow('elapsed', lang).replace('{t}', '0:0')) .split('0:0')[0].strip() in norm(c.text('[data-elapsed]')), c.text('[data-elapsed]'), 'the elapsed time is written')
    c.eq(c.count('[data-running] [data-verb=stop]'), 1, 'Arrêter is there', what='stop')
    c.until("document.querySelector('[data-zone-state=fr]').dataset.state === 'built' && document.querySelector('[data-zone-state=gb]').dataset.state === 'building'", timeout=8000, what='fr built, gb building')
    gb_name = c.text('[data-zone-state=gb] b')
    c.eq(norm(c.text('[data-zone-state=gb]')), norm(f"{gb_name} : {_trow('buildingN', lang, 'zoneState: {').replace('{n}', '2').replace('{m}', '5')}"), 'construction (2 / 5 sources)', what='gb line')
    c.eq(norm(c.text('[data-zone-state=fr]')), norm(f"{fr_name} : {_trow('built', lang, 'zoneState: {')}"), 'construite', what='fr built line')
    c.eq(c.attr('[data-running] [role=progressbar]', 'aria-valuenow'), '1', 'the bar follows done / total (1 of 2 zones)', what='bar')
    c.eq(norm(c.text('[data-running] [data-count]')), norm(_trow('runCount', lang).replace('{n}', _zones_text(lang, 1)).replace('{m}', '2')), '« 1 zone sur 2 »', what='count')
    c.eq(_notes_with(c, 'Base'), [], 'no notification at the start nor on the way', what='notifications before the end')
    _screen_ok(c, 'running')
    # the end: partial; the summary stays in the panel, one notification with the counts
    c.until("!!document.querySelector('[data-build-result]')", timeout=10000, what='the end of the build')
    want = _trow('sumPartial', lang).replace('{built}', _zones_text(lang, 1)).replace('{failed}', '1').replace('{zones}', 'gb')
    c.eq([c.attr('[data-build-result]', 'data-result'), norm(c.text('[data-build-result] b'))], ['partial', norm(want)], 'the summary: 1 zone built, 1 failed (gb)', what='summary')
    c.eq(norm(c.text('[data-build-result] [data-advice]')), norm(_trow('partial', lang, 'advice: {')), 'what to do', what='advice')
    c.eq(norm(c.text('[data-build-result] [data-zone-state=gb]')), norm(f"{gb_name} : {_trow('failed', lang, 'zoneState: {').replace('{r}', _trow('invalid-output', lang, 'zoneError: {'))}"),
         'the failed zone says why, in words', what='gb failed line')
    c.eq(c.count('[data-running]'), 0, 'the bar is gone', what='running')
    c.eq(c.js("document.querySelector('[data-verb=build]').disabled"), False, 'the button is live again', what='build disabled')
    c.eq(len(_notes_with(c, want)), 1, 'ONE notification, with the counts', what='notifications')
    c.until(f"window.__stub.calls.publication > {before}", what='publication() is read again (the rows change)')
    doc = c.until_doc('cache/data/journal.json', lambda d: bool(d and d.get('ops')), what='the journal is written')
    e = doc['ops'][0]
    c.eq([e['set'], e['verb'], e['zones'], e['result'], e['built'], e['failed']], ['base', 'build', ['fr', 'gb'], 'partial', ['fr'], [{'zone': 'gb', 'error': 'invalid-output'}]],
         'the journal entry: set, verb, zones, result, built, failed', what='journal entry')
    c.ok(re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z', e['at']) and isinstance(e['seconds'], int), e, 'UTC ISO time and whole seconds')
    ops = c.js("[...document.querySelectorAll('[data-journal] [data-op]')].map(o => [o.dataset.result, o.textContent.replace(/\\s+/g, ' ').trim()])")
    c.eq(len(ops), 1, 'one entry in the journal fold', what='journal entries')
    c.ok(re.search(r'\d{2}:\d{2}Z', ops[0][1]) and norm(_trow('build', lang, 'opVerb: {')) in norm(ops[0][1]) and norm(_trow('partial', lang, 'opResult: {')) in norm(ops[0][1]), ops[0], 'time with Z, the verb, the result')
    _screen_ok(c, 'at the end')
    # a second run with personal sources ticked: the ids follow, a clean end
    st['views'] = [_view('done', step='Terminé', done=2, zones={'fr': _zs('built', 4, 4), 'gb': _zs('built', 5, 5)}, result={'built': ['fr', 'gb'], 'failed': [], 'commits': []}, jid='j2')]
    st['i'] = 0
    st['start'] = (200, {'job': 'j2'})
    c.tap('[data-personal="nats"]')
    c.tap('[data-personal="xplane"]')
    c.tap('[data-verb=build]')
    c.until('document.querySelector("[data-build-result][data-result=done]")', timeout=10000, what='the second build ends')
    c.eq(st['posts'][1]['args'], {'zones': ['fr', 'gb'], 'personal': ['nats', 'xplane']}, 'ticking personal sources adds their ids', what='second body')
    want = _trow('sumDone', lang).replace('{built}', _zones_text(lang, 2))
    c.eq(norm(c.text('[data-build-result] b')), norm(want), 'a clean end: « Base construite : 2 zones »', what='summary')
    c.eq(len(_notes_with(c, want)), 1, 'its own notification', what='notifications')
    c.eq(c.count('[data-journal] [data-op]'), 2, 'two entries in the journal', what='journal entries')
    _screen_ok(c, 'after the second run')
    c.check_errors()


@case('L8', 'Données: no launcher, a refused start (429, 404, 409) says what to do', 'L', tags=('data',), designs=('standard',),
      rule='modules/data/SPEC 6.5 (the grey reasons), 3 (one operation at a time); launcher refusals (frame/INTEGRATION 15.1)')
def l8(c):
    # without a launcher the button is grey and says so; nothing is called
    cfg, _ = _fixture()
    _open(c, cfg)
    c.eq([c.js("document.querySelector('[data-verb=build]').disabled"), c.attr('[data-build] [data-reason]', 'data-reason'), norm(c.text('[data-build] [data-reason]'))],
         [True, 'no-launcher', norm(_trow('no-launcher', 'fr', 'greyReason: {'))], 'no launcher: grey, « Il faut le lanceur du poste »', what='no launcher')
    c.eq(c.count('[data-running], [data-build-result]'), 0, 'nothing starts', what='running / result')
    # a fake launcher refuses in three ways
    busy = _view('running', step='Analyse', done=1, total=3, unit='files', zones=None)
    busy.pop('zones')
    busy_done = dict(busy, state='done', done=3, id='o1')
    busy['id'] = 'o1'
    st = _launcher(c, [busy, busy, busy_done], start=(429, {'reason': 'too-soon', 'wait': 12}), busy_view=busy)
    c.page.reload(wait_until='load')
    _head(c)
    for start, key, want in [((429, {'reason': 'too-soon', 'wait': 12}), 'tooSoon', _trow('tooSoon', 'fr', 'refused: {').replace('{n}', '12')),
                             ((409, {'reason': 'updating', 'message': 'no job starts now (updating)'}), 'updating', _trow('updating', 'fr', 'refused: {')),
                             ((404, {}), 'unknown-route', _trow('unknown-route', 'fr', 'refused: {')),
                             ((400, {'message': 'bad'}), 'bad-args', _trow('bad-args', 'fr', 'refused: {'))]:
        st['start'] = start
        c.tap('[data-verb=build]')
        c.until(f"!!document.querySelector('[data-build-result][data-refusal={key}]')", timeout=6000, what=f'the refusal {key} is said')
        c.eq(norm(c.text('[data-build-result]')), norm(want), f'{key}: the sentence says what to do', what=key)
        c.eq(len(_notes_with(c, want)), 1, f'{key}: one notification', what='notifications')
        c.eq(c.js("document.querySelector('[data-verb=build]').disabled"), False, f'{key}: nothing runs, the button stays live', what='build disabled')
        c.eq(c.count('[data-build] [data-running]'), 0, f'{key}: no bar', what='running')
    # 409: another operation runs: said, the button stays grey until it ends
    st['start'] = (409, {'message': 'busy'})
    c.tap('[data-verb=build]')
    c.until("!!document.querySelector('[data-build-result][data-refusal=busy]')", timeout=6000, what='the 409 is said')
    want = _trow('busy', 'fr', 'refused: {')
    c.eq(norm(c.text('[data-build-result]')), norm(want), '« Une autre opération est en cours »', what='409 text')
    c.eq([c.js("document.querySelector('[data-verb=build]').disabled"), c.attr('[data-build] [data-reason]', 'data-reason'), norm(c.text('[data-build] [data-reason]'))],
         [True, 'busy', norm(want)], 'the button is grey with the same reason, written once', what='409 reason')
    c.until("!!document.querySelector('[data-other]') && document.querySelector('[data-other]').textContent.includes('Analyse')", timeout=6000, what='the running operation is followed')
    c.until("!document.querySelector('[data-other]') && !document.querySelector('[data-verb=build]').disabled", timeout=10000, what='the button is live again when that operation ends')
    c.eq(c.count('[data-build] [data-running]'), 0, 'it was not a build of the base: no bar, no summary of it', what='running')
    c.check_errors()


@case('L9', 'Données: Arrêter posts the cancel and ends on the real end of the job', 'L', tags=('data',), designs=('standard',),
      rule='modules/data/SPEC 3 (Arrêter), 5.4; launcher job protocol (POST regen/job/cancel)')
def l9(c):
    v1 = _view(step='Zone fr', done=0, zones={'fr': _zs('building', 1, 4), 'gb': _zs('waiting')})
    stopped = _view('cancelled', step='Arrêté', done=1, zones={'fr': _zs('built', 4, 4, commit='abc1234'), 'gb': _zs('cancelled')},
                    result={'built': ['fr'], 'failed': [], 'commits': [{'zone': 'fr', 'commit': 'abc1234'}], 'reason': 'cancelled'})
    st = _launcher(c, [v1], cancel_view=stopped)
    cfg, _ = _fixture()
    _open(c, cfg)
    _untick(c, 'ca', 'es', 'us')
    c.tap('[data-verb=build]')
    c.until("document.querySelector('[data-zone-state=fr]')?.dataset.state === 'building'", timeout=8000, what='fr is building')
    c.ge(c.js("Math.round(document.querySelector('[data-verb=stop]').getBoundingClientRect().height)"), 44, 'Arrêter is a 44 px target', what='stop height')
    c.tap('[data-verb=stop]')
    for _ in range(40):
        if st['cancels']:
            break
        c.wait(100)
    c.eq(st['cancels'], [{'id': 'j1'}], 'Arrêter posts /__setup/regen/job/cancel with the job id', what='cancel')
    c.until("!!document.querySelector('[data-build-result][data-result=cancelled]')", timeout=10000, what='the cancelled end is shown')
    lang = c.lang
    want = _trow('sumCancelled', lang).replace('{n}', '1')
    c.eq(norm(c.text('[data-build-result] b')), norm(want), 'Construction arrêtée, 1 zone already built', what='summary')
    c.eq(c.js("[...document.querySelectorAll('[data-build-result] [data-zone-state]')].map(l => [l.dataset.zoneState, l.dataset.state])"), [['fr', 'built'], ['gb', 'cancelled']],
         'the zones\' last states', what='zone lines')
    c.eq(len(_notes_with(c, want)), 1, 'one notification', what='notifications')
    c.eq(c.js("document.querySelector('[data-verb=build]').disabled"), False, 'the button is live again', what='build disabled')
    doc = c.until_doc('cache/data/journal.json', lambda d: bool(d and d.get('ops')), what='the journal is written')
    c.eq([doc['ops'][0]['result'], doc['ops'][0]['built']], ['cancelled', ['fr']], 'the journal says cancelled', what='journal')
    c.check_errors()


@case('L10', 'Données: at mount, an interrupted, a finished or a running build is found again; no-browser and X-Plane say what to do', 'L', tags=('data',),
      designs=('standard',), rule='modules/data/SPEC 5.4 (the page follows, the job goes on), 6.5; ctx.launcher.resume (frame/INTEGRATION 15.1)')
def l10(c):
    lang = c.lang
    interrupted = _view('interrupted', step='Zone gb', done=1, total=3, jid='j0',
                        zones={'fr': _zs('built', 3, 3, commit='abc'), 'gb': _zs('building', 1, 4), 'es': _zs('waiting')})
    st = _launcher(c, [interrupted], last=interrupted)
    cfg, _ = _fixture()
    _open(c, cfg)
    c.until("!!document.querySelector('[data-build-result]')", timeout=6000, what='the interrupted job is shown at mount')
    c.eq([c.attr('[data-build-result]', 'data-result'), norm(c.text('[data-build-result] b'))], ['interrupted', norm(_trow('sumInterrupted', lang))],
         '« Construction interrompue (le lanceur s\'est arrêté) »', what='interrupted line')
    c.eq(c.js("[...document.querySelectorAll('[data-build-result] [data-zone-state]')].map(l => [l.dataset.zoneState, l.dataset.state])"), [['fr', 'built'], ['gb', 'building'], ['es', 'waiting']],
         'the zones\' last states', what='zone lines')
    c.eq([c.count('[data-running]'), c.js("document.querySelector('[data-verb=build]').disabled"), len(_notes_with(c, _trow('sumInterrupted', lang)))], [0, False, 0],
         'nothing runs, the button is live, no notification for what ended before', what='state')
    doc = c.until_doc('cache/data/journal.json', lambda d: bool(d and d.get('ops')), what='the interrupted job is in the journal')
    c.eq([[o['result'], o['job']] for o in doc['ops']], [['interrupted', 'j0']], 'journal: interrupted, once', what='journal')
    _screen_ok(c, 'interrupted')
    # a reload finds the same job: no second entry
    c.page.reload(wait_until='load')
    _head(c)
    c.until("!!document.querySelector('[data-build-result]')", timeout=6000, what='shown again after a reload')
    c.wait(300)
    c.eq(len(c.doc('cache/data/journal.json')['ops']), 1, 'the same job is never journaled twice', what='journal')
    # a job finished earlier (partial): its summary line, no notification
    st['current'] = _view('done', done=2, jid='j2', zones={'fr': _zs('built', 3, 3), 'gb': _zs('failed', 2, 4, error='timeout')},
                          result={'built': ['fr'], 'failed': [{'zone': 'gb', 'error': 'timeout'}], 'commits': [], 'reason': 'partial'})
    c.page.reload(wait_until='load')
    _head(c)
    c.until("document.querySelector('[data-build-result]')?.dataset.result === 'partial'", timeout=6000, what='the last job\'s summary is shown')
    want = _trow('sumPartial', lang).replace('{built}', _zones_text(lang, 1)).replace('{failed}', '1').replace('{zones}', 'gb')
    c.eq([norm(c.text('[data-build-result] b')), len(_notes_with(c, want))], [norm(want), 0], 'its summary line, no notification', what='partial summary')
    c.eq(norm(c.text('[data-build-result] [data-zone-state=gb]')), norm(f"{c.text('[data-build-result] [data-zone-state=gb] b')} : {_trow('failed', lang, 'zoneState: {').replace('{r}', _trow('timeout', lang, 'zoneError: {'))}"),
         'the failed zone with its reason', what='gb line')
    # a build found RUNNING is followed to its end: one notification then
    run = _view(step='Zone fr', done=0, jid='j3', zones={'fr': _zs('building', 1, 4), 'gb': _zs('waiting')})
    end = _view('done', done=2, jid='j3', zones={'fr': _zs('built', 4, 4), 'gb': _zs('built', 5, 5)}, result={'built': ['fr', 'gb'], 'failed': [], 'commits': []})
    st['current'] = run
    st['views'] = [run, run, end]
    st['i'] = 0
    c.page.reload(wait_until='load')
    _head(c)
    c.until("!!document.querySelector('[data-build] [data-running]')", timeout=8000, what='the running build is followed')
    c.eq([c.js("document.querySelector('[data-verb=build]').disabled"), c.attr('[data-build] [data-reason]', 'data-reason'), c.count('[data-verb=stop]')], [True, 'busy', 1], 'grey with the reason, Arrêter offered', what='running state')
    c.eq(c.js("document.querySelector('[data-group=base]').open"), True, 'the base group is open to show it', what='group open')
    c.until("!!document.querySelector('[data-build-result][data-result=done]')", timeout=10000, what='the followed build ends')
    want = _trow('sumDone', lang).replace('{built}', _zones_text(lang, 2))
    c.eq(len(_notes_with(c, want)), 1, 'followed to its end: one notification', what='notifications')
    # no browser on the workstation: the sentence, a failure in the journal
    st['views'] = [_view('error', jid='j4', zones={}, result={'ok': False, 'reason': 'no-browser'})]
    st['i'] = 0
    st['start'] = (200, {'job': 'j4'})
    st['current'] = None
    c.page.reload(wait_until='load')
    _head(c)
    c.tap('[data-verb=build]')
    c.until("!!document.querySelector('[data-build-result][data-result=no-browser]')", timeout=8000, what='no-browser is said')
    want = _trow('sumNoBrowser', lang)
    c.eq([norm(c.text('[data-build-result]')), len(_notes_with(c, want))], [norm(want), 1], 'Ni Edge ni Chrome…: the sentence, one notification', what='no-browser')
    # X-Plane ticked: the hint before the start, the id sent, the reason said at the end
    st['views'] = [_view('error', jid='j5', zones={}, result={'ok': False, 'reason': 'xplane-in-page'})]
    st['i'] = 0
    st['start'] = (200, {'job': 'j5'})
    c.tap('[data-personal="xplane"]')
    c.eq(c.count('[data-xplane-hint]'), 1, 'the hint is shown before the start', what='hint')
    c.tap('[data-verb=build]')
    c.until("!!document.querySelector('[data-build-result][data-result=xplane-in-page]')", timeout=8000, what='xplane-in-page is said')
    c.eq(st['posts'][-1]['args']['personal'], ['xplane'], 'it is sent when asked', what='body')
    want = _trow('sumXplane', lang)
    c.eq([norm(c.text('[data-build-result]')), len(_notes_with(c, want))], [norm(want), 1], 'the verb\'s reason is said at the end', what='xplane-in-page')
    doc = c.until_doc('cache/data/journal.json', lambda d: bool(d and len(d.get('ops', [])) >= 5), what='five operations in the journal')
    c.eq([[o['result'], o.get('reason')] for o in doc['ops'][-2:]], [['failed', 'no-browser'], ['failed', 'xplane-in-page']], 'both are failures with their reason', what='journal')
    c.check_errors()


# ------------------------------------------------------------------------------------------------------ L11, L12
_L11_JS = r"""async () => {
  const M = await import('/modules/data/model.js');
  const out = {};
  const ok = { launcher: true, publishing: false, building: false, other: false, gesture: true, nothing: false, offline: false };
  const st = o => { const g = M.publishState({ ...ok, ...o }); return [g.disabled, g.reason] };
  out.state = [st({}), st({ launcher: false }), st({ publishing: true }), st({ building: true }), st({ other: true }), st({ gesture: false }), st({ nothing: true }), st({ offline: true })];
  // the first reason of the order wins: launcher > publishing > building > other > gesture > nothing > offline
  out.order = [st({ launcher: false, publishing: true, building: true, gesture: false, nothing: true, offline: true }), st({ publishing: true, building: true }),
    st({ building: true, other: true, gesture: false }), st({ other: true, gesture: false }), st({ gesture: false, nothing: true, offline: true }), st({ nothing: true, offline: true })];
  const cnt = o => { const c = M.publishCounts(o); return [c.known, c.changes, c.ahead, c.merging, c.nothing, c.last] };
  out.counts = [cnt({ repo: true, changes: 3, ahead: 2, merging: false, last: { at: '2026-10-29T09:30:00Z', pushed: true } }), cnt({ repo: true, changes: 0, ahead: 0 }),
    cnt({ repo: true, changes: 0, ahead: 0, merging: true }), cnt({ repo: true, changes: 0, ahead: 4 }), cnt({ repo: true, changes: '3', ahead: null, last: { at: '', pushed: 1 } }),
    cnt(null), cnt({ ok: false, status: 403 }), cnt({ repo: false }), cnt({ repo: true, changes: 1, last: { at: '2026-10-29T10:00:00Z', pushed: false } })];
  const x = (c, h, r, p, k, f, extra = {}) => ({ ok: true, exchange: { committed: c, held: h, received: r, pushed: p, conflicts: k, refused: f, message: 'm', ...extra } });
  const oc = r => { const o = M.publishOutcome(r); return [o.kind, o.committed, o.held, o.received, o.conflicts, o.refused, o.message] };
  out.outcome = [oc(x(3, 0, 1, true, 0, 0)), oc(x(1, 2, 0, true, 3, 1)), oc(x(0, 0, 0, false, 0, 0)), oc({ ok: true }), oc({ ok: false, error: 'frame says', exchange: { message: 'launcher says' } }),
    oc({ ok: false, error: 'frame says' }), oc(null), oc({ ok: true, exchange: { ok: false, message: 'refused' } }), oc(x('3', null, NaN, true, '1', undefined)), oc({ ok: true, warning: 'w', exchange: { pushed: true } })];
  const ent = M.publishEntry(Date.UTC(2026, 9, 29, 10, 0, 0), M.publishOutcome(x(3, 2, 1, true, 1, 0)));
  out.entry = ent;
  out.entryFailed = M.publishEntry(0, M.publishOutcome({ ok: false })).result;
  out.entryNoExchange = M.publishEntry(0, M.publishOutcome({ ok: true })).result;   // essai réel du 29/10 : rien n'est parti
  out.add = M.journalAdd([], ent).length + ':' + M.journalAdd([ent], ent).length;   // no job id: two publications are two entries
  out.num = [M.num(3), M.num('3'), M.num(NaN), M.num(null)];
  return out;
}"""


@case('L11', 'Données: Publier, the pure functions on fixtures', 'L', tags=('data',), phone=False,
      rule='modules/data/SPEC 3 (one operation at a time), 6.5 (one grey reason); INTEGRATION 1.3 (the gesture sync, sync-status)')
def l11(c):
    c.page.goto(f'{c.base}/frame/manifest.webmanifest', wait_until='load')
    r = c.js(_L11_JS)
    c.eq(r['state'], [[False, None], [True, 'no-launcher'], [True, 'publishing'], [True, 'building'], [True, 'busy'], [True, 'no-gesture'], [True, 'nothing'], [True, 'offline']],
         'the grey reasons of Publier, each alone: no launcher, publishing, build running, another operation, frame without the gesture, nothing to publish, offline', what='publishState')
    c.eq(r['order'], [[True, 'no-launcher'], [True, 'publishing'], [True, 'building'], [True, 'busy'], [True, 'no-gesture'], [True, 'nothing']],
         'one reason, the first of the order launcher > publishing > build > other > gesture > nothing > offline', what='publishState order')
    c.eq(r['counts'], [[True, 3, 2, False, False, {'at': '2026-10-29T09:30:00Z', 'pushed': True}], [True, 0, 0, False, True, None], [True, 0, 0, True, False, None],
                       [True, 0, 4, False, False, None], [True, 0, 0, False, True, None], [False, None, None, False, False, None], [False, None, None, False, False, None],
                       [False, None, None, False, False, None], [True, 1, 0, False, False, {'at': '2026-10-29T10:00:00Z', 'pushed': False}]],
         'sync-status: the counts, « nothing » only when read and 0 / 0 without a pending merge; an unreadable answer (null, refusal, no repository) is never « nothing »; last needs its date', what='publishCounts')
    c.eq(r['outcome'], [['done', 3, 0, 1, 0, 0, 'm'], ['done', 1, 2, 0, 3, 1, 'm'], ['local', 0, 0, 0, 0, 0, 'm'], ['no-exchange', 0, 0, 0, 0, 0, ''],
                        ['failed', 0, 0, 0, 0, 0, 'launcher says'], ['failed', 0, 0, 0, 0, 0, 'frame says'], ['failed', 0, 0, 0, 0, 0, ''], ['failed', 0, 0, 0, 0, 0, 'refused'],
                        ['done', 0, 0, 0, 0, 0, 'm'], ['done', 0, 0, 0, 0, 0, 'w']],
         'the end of a publication: pushed is « done », not pushed « local », no exchange « no-exchange », ok false a failure (the launcher\'s message before the frame\'s); every count is a number (a string or NaN becomes 0)', what='publishOutcome')
    c.eq(r['entry'], {'at': '2026-10-29T10:00:00.000Z', 'set': 'base', 'verb': 'publish', 'result': 'done', 'committed': 3, 'received': 1, 'held': 2, 'conflicts': 1},
         'the journal entry: UTC time, set, verb, result, committed, received, held, conflicts', what='publishEntry')
    c.eq([r['entryFailed'], r['add']], ['failed', '1:2'], 'a failure is journaled as failed; two publications without a job id are two entries', what='publishEntry failed / journalAdd')
    c.eq(r['entryNoExchange'], 'failed', 'a pass without exchange (the device does not synchronise) sent nothing: never journaled « done »', what='publishEntry no exchange')
    c.eq(r['num'], [3, None, None, None], 'num() keeps numbers only', what='num')
    c.check_errors()


# the fake frame sync: wraps FrameData.adapter the moment frame_data.js assigns window.FrameData (as _stub wraps AeroDB.create); its config comes from
# sessionStorage `__fakeSync` (set before each load: { gesture, result, delay }), none: the real adapter (no gesture property)
_SYNC_JS = """(() => { let cfg = null; try { cfg = JSON.parse(sessionStorage.getItem('__fakeSync') || 'null') } catch {}
  window.__sync = { calls: [] }; if (!cfg) return; let fd;
  const patch = F => { const a = F.adapter; F.adapter = function (...x) { const d = a.apply(this, x);
    const f = async o => { window.__sync.calls.push(o === undefined ? null : o); if (cfg.hold) await new Promise(r => { window.__sync.release = r }); else if (cfg.delay) await new Promise(r => setTimeout(r, cfg.delay)); return JSON.parse(JSON.stringify(cfg.result)) };
    if (cfg.gesture) f.gesture = true; d.sync = f; return d }; return F };
  Object.defineProperty(window, 'FrameData', { configurable: true, get() { return fd }, set(v) { fd = v && v.adapter && !v.__fake ? (v.__fake = 1, patch(v)) : v } }) })()"""

FILES = {'fr': ('fichier', 'fichiers'), 'en': ('file', 'files'), 'de': ('Datei', 'Dateien'), 'es': ('archivo', 'archivos')}
COMMITS = {'fr': ('commit', 'commits'), 'en': ('commit', 'commits'), 'de': ('Commit', 'Commits'), 'es': ('commit', 'commits')}


def _sync_cfg(c, gesture=True, result=None, delay=0, hold=False):
    """Sets what the fake frame sync does at the next load (the init script reads sessionStorage); hold: the sync waits until the case
    calls window.__sync.release() (a running state read without racing a delay)."""
    res = result if result is not None else {'ok': True, 'exchange': {'committed': 3, 'held': 0, 'received': 1, 'pushed': True, 'conflicts': 0, 'refused': 0}}
    c.page.evaluate("v => sessionStorage.setItem('__fakeSync', v)", json.dumps({'gesture': gesture, 'result': res, 'delay': delay, 'hold': hold}))


def _pub_ok(c, what):
    """No horizontal scroll, nothing beyond the right edge, 44 px on the Publier button."""
    m = c.js("""() => { const b = document.querySelector('[data-publish]'); return { sw: document.documentElement.scrollWidth, iw: window.innerWidth,
      over: [...b.querySelectorAll('*')].filter(e => e.getBoundingClientRect().width && e.getBoundingClientRect().right > window.innerWidth + 1).slice(0, 3).map(e => e.tagName + '.' + e.className),
      hs: [...b.querySelectorAll('button')].map(e => Math.round(e.getBoundingClientRect().height)) } }""")
    c.le(m['sw'], m['iw'], f'{what}: no horizontal scroll', what='scrollWidth')
    c.ok(not m['over'], m['over'], f'{what}: nothing beyond the right edge')
    c.ge(min(m['hs']), 44, f'{what}: the button is 44 px', what='touch height')


def _pub_open(c, st_sync, gesture=True, result=None, delay=0, launcher=None, hold=False):
    """Opens the screen with the fake launcher (sync-status: `st_sync`) and the fake frame sync; returns the launcher's record."""
    if launcher is None:                       # the first opening: the fake launcher and the init scripts are installed once
        c.page.goto(f'{c.base}/frame/manifest.webmanifest', wait_until='load')
        _sync_cfg(c, gesture, result, delay, hold)
        st = _launcher(c, sync=st_sync)
        c.page.add_init_script(_SYNC_JS)
        _open(c, _fixture()[0])
        return st
    _sync_cfg(c, gesture, result, delay, hold)       # the next ones: the same page, another configuration at the next load
    launcher['sync'] = st_sync
    c.open('data', docs=LEVEL3, wait=False, app='maintenance')  # le module Données est dans l'application Maintenance
    c.until("!!document.querySelector('[data-module=data] [data-data-head]')", timeout=20000, what='the head of the Données screen is drawn')
    c.settle()
    return launcher


def _publish_state(c):
    """What the Publier panel shows: the button, the reason, the lines."""
    return c.js("""() => { const b = document.querySelector('[data-publish]'); const t = e => e ? e.textContent.replace(/\\s+/g, ' ').trim() : null;
      return { disabled: b.querySelector('[data-verb=publish]').disabled, reason: b.querySelector('[data-reason]')?.dataset.reason || null, reasonText: t(b.querySelector('[data-reason]')),
        reasons: b.querySelectorAll('[data-reason]').length, state: t(b.querySelector('[data-publish-state]')), merge: t(b.querySelector('[data-publish-merge]')), last: t(b.querySelector('[data-publish-last]')),
        running: !!b.querySelector('[data-publishing]'), result: b.querySelector('[data-publish-result]')?.dataset.result || null,
        lines: [...b.querySelectorAll('[data-publish-result] [data-line]')].map(p => [p.dataset.line, t(p)]), message: t(b.querySelector('[data-publish-message]')),
        buildDisabled: document.querySelector('[data-verb=build]').disabled, buildReason: document.querySelector('[data-build] [data-reason]')?.dataset.reason || null,
        first: b === document.querySelector('[data-build]').nextElementSibling } }""")


def _ask_text(c):
    """The question of the frame's window: { text, ok, no } (the texts of the two buttons)."""
    c.until("!!document.querySelector('.f-modal [data-ok]')", timeout=8000, what='the question is asked')
    return c.js("""() => ({ text: document.querySelector('.f-modal p').textContent.replace(/\\s+/g, ' ').trim(), ok: document.querySelector('.f-modal [data-ok]').textContent.trim(),
      no: !!document.querySelector('.f-modal [data-no]') })""")


@case('L12', 'Données: Publier against a fake launcher and a fake frame sync (state, one question, the gesture, result, notification, journal, grey reasons)', 'L',
      tags=('data',), langs4=True, designs=('standard',),
      rule='modules/data/SPEC 3 (plan before change, one question, notify at the end only, one operation at a time), 6.5; INTEGRATION 1.3 (ctx.data.sync({ gesture: true }), sync-status)')
def l12(c):
    lang = c.lang
    fl, cm = FILES[lang], COMMITS[lang]
    pub = norm(_trow('publish', lang))
    last_iso = '2026-10-29T09:30:00Z'
    # ---- A: 3 files, 2 commits; the state line, the question, a refusal, then the gesture
    st = _pub_open(c, {'changes': 3, 'ahead': 2, 'merging': False, 'last': {'at': last_iso, 'pushed': True}}, hold=True)
    s = _publish_state(c)
    c.ok(s['first'], s, 'the Publier panel follows the Construire panel')
    want = f"{_trow('pubFiles', lang, row=1).replace('{n}', '3')} · {_trow('pubCommits', lang, row=1).replace('{n}', '2')}"
    c.eq([s['state'], s['disabled'], s['reasons']], [norm(want), False, 0], 'n files changed · m commits to send; the button is live; no reason', what='state line')
    c.ok(s['last'].startswith(norm(_trow('pubLastSent', lang).split('{d}')[0])) and '09:30Z' in s['last'] and s['last'].count('2026') == 1, s['last'], 'the last publication, UTC time with Z')
    c.eq(c.count('[data-publish-merge]'), 0, 'no merge pending: no merge line', what='merge line')
    c.eq(norm(c.text('[data-publish] [data-verb=publish]')), pub, 'the button is worded in the language of the run', what='button label')
    _pub_ok(c, 'before')
    c.tap('[data-publish] [data-verb=publish]')
    q = _ask_text(c)
    ask = _trow('pubAsk', lang).replace('{f}', f'3 {fl[1]}').replace('{c}', f'2 {cm[1]}')
    c.eq([norm(q['text']), norm(q['ok']), q['no']], [norm(ask), pub, True], 'ONE question with both counts, one-word confirmation, and a way out', what='question')
    c.eq(len(c.js('window.__sync.calls')), 0, 'nothing is sent before the answer', what='sync calls')
    s = _publish_state(c)
    c.eq([s['disabled'], s['buildDisabled']], [True, True], 'both buttons are grey while the question is open', what='buttons')
    c.tap('.f-modal [data-no]')
    c.until("!document.querySelector('.f-modal')", what='the window closes')
    c.wait(300)
    s = _publish_state(c)
    c.eq([len(c.js('window.__sync.calls')), s['result'], s['disabled'], s['buildDisabled'], len(_notes_with(c, _trow('pubDone', lang).split('{c}')[0]))], [0, None, False, False, 0],
         'No: nothing is called, nothing is said, both buttons are live again', what='refusal')
    # Yes: the gesture, once; running line while it works, Construire grey; then the result
    c.tap('[data-publish] [data-verb=publish]')
    _ask_text(c)
    st['sync'] = {'repo': True, 'branch': 'main', 'behind': 0, 'changes': 0, 'ahead': 0, 'merging': False, 'last': {'at': '2026-10-29T10:00:00Z', 'pushed': True}}   # what the re-read after the push finds
    syncs, pubs = st['syncs'], c.js('window.__stub.calls.publication')
    c.tap('.f-modal [data-ok]')
    c.until("!!document.querySelector('[data-publish] [data-publishing]')", timeout=6000, what='the running line is drawn')
    s = _publish_state(c)
    c.eq([s['disabled'], s['reason'], norm(s['reasonText']), s['buildDisabled'], s['buildReason']],
         [True, 'publishing', norm(_trow('publishing', lang, 'pubReason: {')), True, 'busy'], 'while it works: Publier grey (a publication is running), Construire grey (another operation is running)', what='running state')
    c.eq(c.count('[data-publishing] [role=progressbar][data-indeterminate]'), 1, 'an indeterminate bar', what='bar')
    c.eq(c.js('window.__sync.calls'), [{'gesture': True}], 'ctx.data.sync called once, with { gesture: true }', what='sync calls')
    c.eq(_notes_with(c, _trow('pubDone', lang).split('{c}')[0]), [], 'no notification on the way', what='notifications before the end')
    _pub_ok(c, 'running')
    c.js('window.__sync.release()')                    # the fake sync answers now: the running state was read without a race
    c.until("!!document.querySelector('[data-publish-result]')", timeout=8000, what='the result is drawn')
    done = _trow('pubDone', lang).replace('{c}', '3').replace('{r}', '1')
    s = _publish_state(c)
    c.eq([s['result'], s['lines']], ['done', [['done', norm(done)]]], 'the result: sent, 3 files committed, 1 received, nothing else', what='result')
    c.eq(len(c.js('window.__sync.calls')), 1, 'still one call', what='sync calls')
    c.eq(len(_notes_with(c, done)), 1, 'ONE notification, with the counts', what='notifications')
    c.until(f"window.__stub.calls.publication > {pubs}", what='publication() is read again (the rows follow)')
    c.ok(st['syncs'] > syncs, st['syncs'], 'sync-status is read again')
    c.until("document.querySelector('[data-publish] [data-reason]')?.dataset.reason === 'nothing'", what='the re-read finds nothing left to publish')
    s = _publish_state(c)
    c.eq([s['disabled'], norm(s['reasonText']), s['reasons'], s['state'], s['result'], s['buildDisabled']], [True, norm(_trow('nothing', lang, 'pubReason: {')), 1, None, 'done', False],
         'nothing left: Publier grey with « Rien à publier » written once (no second line), the result stays, Construire is live', what='after')
    doc = c.until_doc('cache/data/journal.json', lambda d: bool(d and d.get('ops')), what='the journal is written')
    e = doc['ops'][-1]
    c.eq([e['set'], e['verb'], e['result'], e['committed'], e['received'], e['held'], e['conflicts']], ['base', 'publish', 'done', 3, 1, 0, 0], 'the journal entry', what='journal entry')
    c.ok(re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z', e['at']), e['at'], 'UTC ISO time')
    ops = c.js("[...document.querySelectorAll('[data-journal] [data-op]')].map(o => [o.dataset.opVerb, o.dataset.result, o.textContent.replace(/\\s+/g, ' ').trim()])")
    c.ok(len(ops) == 1 and ops[0][0] == 'publish' and re.search(r'\d{2}:\d{2}Z', ops[0][2]) and f'3 {fl[1]}' in ops[0][2], ops, 'the journal line says the verb, the time and the files')
    _pub_ok(c, 'after')

    # ---- B: held, a conflict, a refused file; the counts are re-read before the question
    res = {'ok': True, 'exchange': {'committed': 1, 'held': 2, 'received': 0, 'pushed': True, 'conflicts': 1, 'refused': 1, 'message': ''}}
    st = _pub_open(c, {'changes': 3, 'ahead': 2, 'merging': False, 'last': None}, result=res, launcher=st)
    c.eq(c.count('[data-publish-last]'), 0, 'no last pass known: no line', what='last line')
    st['sync'] = {'repo': True, 'branch': 'main', 'behind': 0, 'changes': 1, 'ahead': 1, 'merging': False, 'last': None}   # changed since the screen was drawn
    c.tap('[data-publish] [data-verb=publish]')
    q = _ask_text(c)
    c.eq(norm(q['text']), norm(_trow('pubAsk', lang).replace('{f}', f'1 {fl[0]}').replace('{c}', f'1 {cm[0]}')), 'the question uses the counts read at the tap (singular forms)', what='question')
    c.tap('.f-modal [data-ok]')
    c.until("!!document.querySelector('[data-publish-result]')", timeout=8000, what='the result is drawn')
    s = _publish_state(c)
    lines = [['done', norm(_trow('pubDone', lang).replace('{c}', '1').replace('{r}', '0'))], ['held', norm(_trow('pubHeld', lang, row=1).replace('{n}', '2'))],
             ['conflicts', norm(_trow('pubConflicts', lang, row=0).replace('{n}', '1'))], ['refused', norm(_trow('pubRefused', lang, row=0).replace('{n}', '1'))]]
    c.eq(s['lines'], lines, 'the result: what was sent, the files of the base kept on the workstation, the conflict (see Settings), the refused file', what='result lines')
    c.eq(len(_notes_with(c, lines[0][1])), 1, 'ONE notification, which carries the counts of every line', what='notifications')
    note = _notes_with(c, lines[0][1])[0]
    c.ok(all(l[1] in norm(note) for l in lines), note, 'the notification says the four facts')
    c.eq(c.js('window.__sync.calls'), [{'gesture': True}], 'one call', what='sync calls')
    doc = c.until_doc('cache/data/journal.json', lambda d: bool(d and any(o.get('verb') == 'publish' for o in d.get('ops', []))), what='the journal entry')
    e = [o for o in doc['ops'] if o['verb'] == 'publish'][-1]
    c.eq([e['committed'], e['held'], e['received'], e['conflicts']], [1, 2, 0, 1], 'the journal keeps the counts', what='journal entry')
    _pub_ok(c, 'held')

    # ---- C: a failure; the launcher's message is text, never HTML
    msg = '<b id="boom">boom</b> & "no"'
    res = {'ok': False, 'error': 'frame says', 'exchange': {'committed': 0, 'held': 0, 'received': 0, 'pushed': False, 'conflicts': 0, 'refused': 0, 'message': msg}}
    st = _pub_open(c, {'changes': 3, 'ahead': 2, 'merging': False, 'last': None}, result=res, launcher=st)
    c.tap('[data-publish] [data-verb=publish]')
    _ask_text(c)
    c.tap('.f-modal [data-ok]')
    c.until("!!document.querySelector('[data-publish-result]')", timeout=8000, what='the failure is drawn')
    s = _publish_state(c)
    c.eq([s['result'], s['lines'], s['message']], ['failed', [['failed', norm(_trow('pubFailed', lang))]], norm(_trow('pubLauncherSays', lang).replace('{m}', msg))],
         'a failure: the sentence (nothing is lost) and what the launcher says, as text', what='failure')
    c.eq(c.count('[data-publish-message] b, #boom'), 0, 'the launcher\'s message is escaped: no element comes out of it', what='escaped')
    c.eq(len(_notes_with(c, _trow('pubFailed', lang))), 1, 'one notification', what='notifications')
    c.eq(s['disabled'], False, 'the button is live again: nothing was lost, the user may try again', what='button')
    doc = c.until_doc('cache/data/journal.json', lambda d: bool(d and any(o.get('verb') == 'publish' and o.get('result') == 'failed' for o in d.get('ops', []))), what='the failure is journaled')
    c.eq([[o['result'], o['committed']] for o in doc['ops'] if o['verb'] == 'publish'][-1], ['failed', 0], 'the journal says failed', what='journal entry')
    _pub_ok(c, 'failed')

    # ---- D: a merge waits (nothing else to send): the line says Publier concludes it first, the button is live
    st = _pub_open(c, {'changes': 0, 'ahead': 0, 'merging': True, 'last': {'at': last_iso, 'pushed': False}}, launcher=st)
    s = _publish_state(c)
    c.eq([s['merge'], s['disabled'], s['reasons']], [norm(_trow('pubMerge', lang)), False, 0], 'a pending merge: its line, and the button stays live', what='merge')
    c.ok(s['last'].startswith(norm(_trow('pubLastKept', lang).split('{d}')[0])), s['last'], 'a last pass that sent nothing says so')
    _pub_ok(c, 'merge')

    # ---- E: nothing to publish: grey with the reason, once, and no state line; a frame without the gesture: grey, nothing called
    st = _pub_open(c, {'changes': 0, 'ahead': 0, 'merging': False, 'last': None}, launcher=st)
    s = _publish_state(c)
    c.eq([s['disabled'], s['reason'], s['reasonText'], s['reasons'], s['state']], [True, 'nothing', norm(_trow('nothing', lang, 'pubReason: {')), 1, None], 'nothing to publish: grey, « Rien à publier » once', what='nothing')
    st = _pub_open(c, {'changes': 3, 'ahead': 2, 'merging': False, 'last': None}, gesture=False, launcher=st)
    s = _publish_state(c)
    c.eq([s['disabled'], s['reason'], s['reasonText'], s['reasons']], [True, 'no-gesture', norm(_trow('no-gesture', lang, 'pubReason: {')), 1],
         'a frame without ctx.data.sync.gesture: grey with its reason, never a pass without the gesture', what='no gesture')
    c.eq(len(c.js('window.__sync.calls')), 0, 'nothing is called', what='sync calls')
    # the real adapter (no fake at all): the frame carries the gesture since a215d47bd, so Publier is live (3 files, 2 commits)
    c.page.evaluate("sessionStorage.removeItem('__fakeSync')")
    c.page.reload(wait_until='load')
    _head(c)
    s = _publish_state(c)
    c.eq([s['disabled'], s['reason']], [False, None], 'the real frame (ctx.data.sync.gesture === true since a215d47bd): Publier is live', what='real adapter')

    # ---- F: sync-status does not answer: said, no question, nothing called
    st = _pub_open(c, (500, {'error': 'boom'}), launcher=st)
    s = _publish_state(c)
    c.eq([s['disabled'], norm(s['state'])], [False, norm(_trow('pubUnread', lang))], 'an unreadable state is said on the panel (never « rien à publier »)', what='unread state')
    c.tap('[data-publish] [data-verb=publish]')
    c.until("!!document.querySelector('[data-publish-result][data-result=unread]')", timeout=6000, what='the failed read is said')
    c.eq([c.count('.f-modal'), len(c.js('window.__sync.calls')), len(_notes_with(c, _trow('pubUnread', lang)))], [0, 0, 1], 'no question, nothing called, one notification', what='unread')

    # ---- G: a build is running: Publier is grey with its reason (and Construire grey while it runs)
    v1 = _view(step='Zone fr', done=0, zones={'fr': _zs('building', 1, 4), 'gb': _zs('waiting')})
    st['views'], st['i'] = [v1], 0
    st = _pub_open(c, {'changes': 3, 'ahead': 2, 'merging': False, 'last': None}, launcher=st)
    c.eq(_publish_state(c)['disabled'], False, 'before the build: live', what='before')
    c.tap('[data-verb=build]')
    c.until("!!document.querySelector('[data-build] [data-running]')", timeout=8000, what='the build runs')
    c.until("document.querySelector('[data-publish] [data-reason]')?.dataset.reason === 'building'", what='Publier says a build is running')
    s = _publish_state(c)
    c.eq([s['disabled'], norm(s['reasonText']), s['reasons']], [True, norm(_trow('building', lang, 'pubReason: {')), 1], 'a build is running: Publier grey, « publiez quand elle est finie »', what='build running')
    c.eq(len(c.js('window.__sync.calls')), 0, 'nothing is called', what='sync calls')
    _pub_ok(c, 'build running')
    c.check_errors()


# ------------------------------------------------------------------------------------------------------ L13
@case('L13', 'Données: « Ajouter un pays » on a repository that publishes no zone yet', 'L', tags=('data',), phone=True, designs=('standard',),
      rule='modules/data/SPEC 3.2 (Ajouter un pays: a zone ticked here and published by nobody is built by this workstation); real trial of 29 Oct (an empty coverage left Construire without a zone)')
def l13(c):
    cfg, _ = _fixture()
    cfg['publication'] = {'base': {}, 'proc': {'cycles': {}, 'inForce': None}, 'vfr': None, 'aircraft': None}   # nothing published yet
    for z in cfg['zones']:
        z['published'] = False
    _open(c, cfg)
    c.eq(c.count('[data-build-zone]'), 0, 'an empty coverage: no zone to build yet', what='zones to build')
    opts = c.js("[...document.querySelectorAll('[data-add-zone] option')].map(o => o.value).filter(Boolean)")
    c.ok(len(opts) >= 2, opts, 'the known zones are offered under « Ajouter un pays »')
    z = opts[0]
    c.js("(z) => { const s = document.querySelector('[data-add-zone]'); s.value = z; s.dispatchEvent(new Event('change', { bubbles: true })) }", z)
    c.until("!!document.querySelector('[data-build-zone]')", what='the zone added is offered to Construire')
    c.eq(c.js("[...document.querySelectorAll('[data-build-zone]')].map(e => e.dataset.buildZone + (e.checked ? ':on' : ''))"), [z + ':on'], 'the zone added is ticked', what='zones to build')
    c.ok(c.js("(z) => ![...document.querySelectorAll('[data-add-zone] option')].some(o => o.value === z)", z), 'still offered', 'a zone of the coverage is no longer offered')
    stored = c.js("async () => (await window.FrameData.adapter({ id: 'probe', reads: ['cache/data/'] }).get('cache/data/coverage.json'))?.zones || null")
    c.eq(stored, [z], 'the coverage is written at once (cache/data/coverage.json)', what='coverage.json')
    c.check_errors()


# ------------------------------------------------------------------------------------------------------ L14
_L14_JS = r"""async () => {
  const M = await import('/modules/data/model.js');
  const out = {};
  // which verb of the base set a view is (the launcher says it; a view without a verb that carries its zones is a build)
  out.verbs = [{ set: 'base', verb: 'fetch', zones: {} }, { set: 'base', verb: 'purge' }, { set: 'base', verb: 'build' }, { zones: {} }, { zones: {}, verb: 'x' },
    { set: 'other', verb: 'fetch', zones: {} }, { state: 'done' }, null, { zones: [] }].map(M.viewOp);
  out.isBuild = [{ set: 'base', verb: 'fetch', zones: {} }, { zones: {} }, { set: 'base', verb: 'build' }].map(v => { const o = M.viewOp(v); return !!o && o.set === 'base' && o.verb === 'build' });
  out.dry = [{ set: 'base', verb: 'purge', args: { dry: true }, zones: {} }, { set: 'base', verb: 'purge', args: { zones: ['fr'] } }, { set: 'base', verb: 'fetch', args: { dry: true } }, null].map(M.opDry);
  // the one grey reason of the three verbs
  out.gate = [{ launcher: false, busy: true, zones: 0 }, { launcher: true, busy: true, zones: 0 }, { launcher: true, zones: 0, offline: true }, { launcher: true, zones: 2, offline: true }, { launcher: true, zones: 2 }]
    .map(s => M.setGate({ set: 'base', launcher: s.launcher, busy: s.busy, offline: s.offline, items: s.zones }).reason);
  // sizes
  const B = [0, 512, 1023, 1024, 1536, 14470348, 14994636, 1048575, 2.5 * 2 ** 30, 5 * 2 ** 40, NaN, -1, null];
  out.bytes = Object.fromEntries(['fr', 'en', 'de', 'es', 'xx'].map(l => [l, B.map(n => M.fmtBytes(n, l))]));
  // a zone's line, per verb
  const ph = (z, v) => { const p = M.zonePhrase(z, v); return [p.state, p.key, p.n, p.m, p.code, p.files, p.bytes] };
  out.fetchPhrase = [undefined, { state: 'fetching', done: 1, total: 3 }, { state: 'fetching' }, { state: 'done' }, { state: 'failed', error: 'http' }, { state: 'failed', error: 'zzz' }, { state: 'built' }].map(z => ph(z, 'fetch'));
  out.purgePhrase = [{ state: 'purging', done: 1, total: 3 }, { state: 'done', files: 3, bytes: 2048 }, { state: 'failed', error: 'perm-denied' }, { state: 'failed', error: 'Bad Code!' }, { state: 'failed' }].map(z => ph(z, 'purge'));
  out.buildPhrase = ph({ state: 'building', done: 2, total: 5 });
  out.rows = M.zoneRows({ zones: { fr: { state: 'done' } } }, ['gb'], 'fetch').map(r => [r.zone, r.key]);
  out.sources = M.sourceRows({ sources: { openaip: { state: 'downloaded', files: 2, bytes: 1500 }, sia: { state: 'manual', error: 'manual' }, enaire: { state: 'skipped', error: 'personal' },
    faa: { state: 'failed', error: 'http', status: 404 }, x: { state: 'failed', error: 'weird' }, nat: { state: 'unchanged' }, y: { state: 'pending' }, z: null } }).map(s => [s.id, s.state, s.files, s.bytes, s.code, s.status]);
  out.sourcesNone = [M.sourceRows(undefined).length, M.sourceRows({}).length];
  // the end of a download
  const man = [{ zone: 'fr', source: 'sia', url: 'https://sia.example/x', name: ['a', 'b', 'c', 'd'] }, { zone: 'gb', source: 'nats', url: 'http://x', name: ['n1', 'n2', 'n3', 'n4'] }, { zone: 'gb', source: 'z' }, { source: 'nozone' }];
  const fo = f => { const o = M.fetchOutcome(f); return [o.kind, o.fetched, o.unchanged, o.failed, o.manual.map(m => [m.zone, m.source, m.url, m.name.length]), o.outside, o.level] };
  out.fetch = [
    { state: 'done', result: { ok: true, fetched: ['fr'], unchanged: ['gb'], failed: [], manual: man, outside_sync: 0, warnings: [] } },
    { state: 'done', result: { ok: true, fetched: ['fr'], unchanged: [], failed: [{ zone: 'gb', source: 'ukmil', error: 'http', status: 404 }, { zone: 'es', source: 'x', error: 'network' }], manual: [], outside_sync: 3,
      warnings: [{ code: 'outside-sync', count: 3 }], reason: 'partial' } },
    { state: 'done', result: { ok: true, fetched: [], unchanged: ['fr'], failed: [], manual: [], outside_sync: 2 } },
    { state: 'error', result: { ok: false, fetched: [], unchanged: [], failed: [], manual: man, outside_sync: 0, warnings: [], reason: 'nothing-to-fetch' } },
    { state: 'error', result: { ok: false, fetched: [], unchanged: [], failed: [{ zone: 'fr', source: 'openaip', error: 'http', status: 403 }], reason: 'failed' } },
    { state: 'cancelled', zones: { fr: { state: 'done', sources: { openaip: { state: 'downloaded' } } }, gb: { state: 'waiting' } } },
    { state: 'interrupted', zones: {} },
    { state: 'done', result: { ok: true, fetched: ['fr'], reason: 'cancelled' } },
    { state: 'done', zones: { fr: { state: 'done', sources: { openaip: { state: 'downloaded', files: 1 }, sia: { state: 'manual' } } }, gb: { state: 'done', sources: { ukmil: { state: 'unchanged' } } },
      es: { state: 'failed', error: 'http', sources: { enaire: { state: 'skipped', error: 'personal' }, faa: { state: 'failed', error: 'http', status: 403 } } } } },
    { state: 'done', result: { ok: true, unchanged: ['fr'], warnings: [{ code: 'outside-sync', count: 4 }] } },
    null].map(fo);
  out.https = ['https://a.example/x', 'http://a.example', 'javascript:alert(1)', 'data:text/html,x', 'https://a b', '', null, 'HTTPS://A.EXAMPLE'].map(M.isHttps);
  // the plan and the end of a purge
  const po = f => { const o = M.purgeOutcome(f); return [o.kind, o.files, o.bytes, o.zones, o.shared, o.kept, o.unsafe, o.nothing, o.level] };
  const rem = { fr: { files: 12, bytes: 14470348 }, es: { files: 3, bytes: 524288 }, gb: { files: 0, bytes: 0 } };
  const warn = [{ code: 'shared-fr' }, { code: 'kept-tracked', count: 2 }, { code: 'unsafe-path', count: 1 }];
  out.purge = [
    { state: 'done', result: { ok: true, removed: rem, warnings: warn } },
    { state: 'done', result: { ok: true, removed: { fr: { files: 0, bytes: 0 } }, warnings: [] } },
    { state: 'error', result: { ok: false, removed: { fr: { files: 1, bytes: 10 } }, warnings: [], reason: 'failed' } },
    { state: 'done', result: { ok: true, removed: { fr: { files: 1, bytes: 10 } }, reason: 'partial' } },
    { state: 'cancelled', zones: { fr: { state: 'done', files: 4, bytes: 40 }, es: { state: 'waiting' } } },
    { state: 'interrupted', zones: {} },
    { state: 'done', result: { ok: true, removed: { fr: { files: 2, bytes: 5 } }, warnings: [{ code: 'kept-tracked', count: 1 }, { code: 'kept-tracked', count: 2 }] } },
    { state: 'done', result: { ok: true, removed: {}, warnings: [{ code: 'kept-tracked', count: 5 }] } }].map(po);
  // the journal entries
  const at = Date.parse('2026-10-29T10:00:00Z');
  const fe = M.fetchOutcome({ state: 'done', result: { ok: true, fetched: ['fr'], unchanged: ['es'], failed: [{ zone: 'gb', source: 'ukmil', error: 'http', status: 404 }, { zone: 'us', source: 'faa', error: 'network' }], reason: 'partial' } });
  out.fetchEntry = M.fetchEntry({ at, zones: ['fr', 'es', 'gb', 'us'], seconds: 12.6, out: fe, job: 'j9' });
  out.fetchEntryNothing = M.fetchEntry({ at, zones: ['fr'], seconds: null, out: M.fetchOutcome({ state: 'error', result: { ok: false, reason: 'nothing-to-fetch' } }) });
  out.purgeEntry = M.purgeEntry({ at, zones: ['es', 'fr'], seconds: 3.2, out: M.purgeOutcome({ state: 'done', result: { ok: true, removed: rem, warnings: warn } }), job: 'j8' });
  out.result = ['nothing', 'done', 'x'].map(M.journalResult);
  return out;
}"""


@case('L14', 'Données: Télécharger and Purger, the pure functions on fixtures (verb of a view, reasons, fetch end, purge plan, sizes, journal entries)', 'L',
      tags=('data',), phone=False,
      rule='modules/data/SPEC 5.1, 6.5 (one grey reason); tools/regen/base_sources.py (the view and the result of base/fetch and base/purge)')
def l14(c):
    c.page.goto(f'{c.base}/frame/manifest.webmanifest', wait_until='load')
    r = c.js(_L14_JS)
    B = lambda verb: {'set': 'base', 'verb': verb}
    c.eq(r['verbs'], [B('fetch'), B('purge'), B('build'), B('build'), None, None, None, None, None],
         'a view is a fetch / purge / build when it says set base and its verb; without a verb its zones make it a build; another set, no zones: none', what='viewOp base')
    c.eq(r['isBuild'], [False, True, True], 'a fetch view carries its zones but is no build any more', what='viewOp base build')
    c.eq(r['dry'], [True, False, False, False], 'only a purge with args.dry is a plan', what='opDry')
    c.eq(r['gate'], ['no-launcher', 'busy', 'offline', 'offline', None], 'the one reason of the three buttons: launcher, busy, offline, no zone (the order of Construire)', what='setGate base')
    mo = ['0 o', '512 o', '1023 o', '1,0 Ko', '1,5 Ko', '13,8 Mo', '14,3 Mo', '1,0 Mo', '2,5 Go', '5120,0 Go', '', '', '']
    gb = lambda units, sep: [x.replace(',', sep).replace(' o', ' B').replace('Ko', 'KB').replace('Mo', 'MB').replace('Go', 'GB') if units else x for x in mo]
    c.eq(r['bytes']['fr'], mo, 'sizes in French: « 13,8 Mo », one decimal, octets whole under 1 Ko, no 1024,0, nothing for NaN, negative, null', what='fmtBytes fr')
    c.eq(r['bytes']['en'], gb(True, '.'), 'in English the decimal point and MB', what='fmtBytes en')
    c.eq(r['bytes']['de'], gb(True, ','), 'in German the comma and MB', what='fmtBytes de')
    c.eq(r['bytes']['es'], gb(True, ','), 'in Spanish the comma and MB', what='fmtBytes es')
    c.eq(r['bytes']['xx'], mo, 'an unknown language is written as French', what='fmtBytes xx')
    c.eq(r['fetchPhrase'], [['waiting', 'waiting', None, None, None, None, None], ['fetching', 'fetchingN', 1, 3, None, None, None], ['fetching', 'fetching', None, None, None, None, None],
                            ['done', 'done', None, None, None, None, None], ['failed', 'failed', None, None, 'http', None, None], ['failed', 'failed', None, None, 'unknown', None, None],
                            ['waiting', 'waiting', None, None, None, None, None]],
         'a zone of a download: n / m sources only when both are known, the code of a failure kept or « unknown », a state of another verb waits', what='zonePhrase fetch')
    c.eq(r['purgePhrase'], [['purging', 'purging', 1, 3, None, None, None], ['done', 'done', None, None, None, 3, 2048], ['failed', 'failed', None, None, 'perm-denied', None, None],
                            ['failed', 'failed', None, None, 'unknown', None, None], ['failed', 'failed', None, None, 'unknown', None, None]],
         'a zone of a purge: files and bytes of the zone, never n / m sources, a short code kept as written', what='zonePhrase purge')
    c.eq(r['buildPhrase'], ['building', 'buildingN', 2, 5, None, None, None], 'the build phrase is unchanged', what='zonePhrase build')
    c.eq(r['rows'], [['gb', 'waiting'], ['fr', 'done']], 'the zones asked in order, then the ones the job adds', what='zoneRows fetch')
    c.eq(r['sources'], [['openaip', 'downloaded', 2, 1500, None, None], ['sia', 'manual', None, None, None, None], ['enaire', 'skipped', None, None, 'personal', None],
                        ['faa', 'failed', None, None, 'http', 404], ['x', 'failed', None, None, 'unknown', None], ['nat', 'unchanged', None, None, None, None]],
         'the sources of a zone, in the view\'s order: unknown or pending ones dropped, the code of a failure (HTTP status kept), « personal » for a source skipped without its licence', what='sourceRows')
    c.eq(r['sourcesNone'], [0, 0], 'a zone without sources has no source line', what='sourceRows none')
    sia = ['fr', 'sia', 'https://sia.example/x', 4]
    nats = ['gb', 'nats', 'http://x', 4]
    z = ['gb', 'z', '', 0]
    c.eq(r['fetch'], [
        ['done', ['fr'], ['gb'], [], [sia, nats, z], 0, 'ok'],
        ['partial', ['fr'], [], [{'zone': 'gb', 'source': 'ukmil', 'error': 'http', 'status': 404}, {'zone': 'es', 'source': 'x', 'error': 'network'}], [], 3, 'warn'],
        ['done', [], ['fr'], [], [], 2, 'warn'],
        ['nothing', [], [], [], [sia, nats, z], 0, 'warn'],
        ['failed', [], [], [{'zone': 'fr', 'source': 'openaip', 'error': 'http', 'status': 403}], [], 0, 'err'],
        ['cancelled', ['fr'], [], [], [], 0, 'warn'],
        ['interrupted', [], [], [], [], 0, 'warn'],
        ['cancelled', ['fr'], [], [], [], 0, 'warn'],
        ['partial', ['fr'], ['gb'], [{'zone': 'es', 'source': 'faa', 'error': 'http', 'status': 403}], [], 0, 'warn'],
        ['done', [], ['fr'], [], [], 4, 'warn'],
        ['done', [], [], [], [], 0, 'ok']],
         'the end of a download: the launcher\'s result wins (reason partial / failed / cancelled / nothing-to-fetch), else the view\'s zones decide; manual sources need a zone and a source; '
         'outside_sync (or its warning) is the count of tracked files changed and turns a clean end amber; a failure with nothing fetched is red', what='fetchOutcome')
    c.eq(r['https'], [True, False, False, False, False, False, False, True], 'a manual source is a link only in https://', what='isHttps')
    c.eq(r['purge'], [
        ['done', 15, 14994636, ['fr', 'es'], True, 2, 1, False, 'warn'],
        ['done', 0, 0, [], False, 0, 0, True, 'ok'],
        ['failed', 1, 10, ['fr'], False, 0, 0, False, 'err'],
        ['partial', 1, 10, ['fr'], False, 0, 0, False, 'warn'],
        ['cancelled', 4, 40, ['fr'], False, 0, 0, False, 'warn'],
        ['interrupted', 0, 0, [], False, 0, 0, False, 'warn'],
        ['done', 2, 5, ['fr'], False, 3, 0, False, 'ok'],
        ['done', 0, 0, [], False, 5, 0, True, 'ok']],
         'a purge plan or end: totals of result.removed (the view\'s zones without it), the zones that have files, shared-fr, the kept-tracked total, the refused paths (amber), nothing = nothing to remove', what='purgeOutcome')
    c.eq(r['fetchEntry'], {'at': '2026-10-29T10:00:00.000Z', 'set': 'base', 'verb': 'download', 'zones': ['fr', 'es', 'gb', 'us'], 'seconds': 13, 'result': 'partial', 'fetched': ['fr'], 'unchanged': ['es'],
                           'failed': [{'zone': 'gb', 'source': 'ukmil', 'error': 'http', 'status': 404}, {'zone': 'us', 'source': 'faa', 'error': 'network'}], 'job': 'j9'},
         'the journal entry of a download: verb « download » (the launcher\'s verb is fetch), zones, result, fetched, unchanged, failed with status', what='fetchEntry')
    c.eq([r['fetchEntryNothing']['result'], r['fetchEntryNothing']['seconds'], 'job' in r['fetchEntryNothing'], r['fetchEntryNothing']['failed']], ['nothing', None, False, []], 'nothing to fetch is journaled « nothing », no job id', what='fetchEntry nothing')
    c.eq(r['purgeEntry'], {'at': '2026-10-29T10:00:00.000Z', 'set': 'base', 'verb': 'purge', 'zones': ['es', 'fr'], 'seconds': 3, 'result': 'done', 'files': 15, 'bytes': 14994636, 'job': 'j8'},
         'the journal entry of a purge: zones, result, files, bytes', what='purgeEntry')
    c.eq(r['result'], ['nothing', 'done', 'failed'], 'the journal result keeps « nothing »', what='journalResult')
    c.check_errors()


# ------------------------------------------------------------------------------------------------------ L15
def _size(n, lang):
    """A size as the screen writes it (an independent version of model.js fmtBytes): base 1024, one decimal, comma (point in English), Mo in French else MB."""
    units = ['o', 'Ko', 'Mo', 'Go'] if lang == 'fr' else ['B', 'KB', 'MB', 'GB']
    if n < 1024:
        return f'{n} {units[0]}'
    v, i = n / 1024, 1
    while i < 3 and round(v * 10) / 10 >= 1024:
        v, i = v / 1024, i + 1
    s = f'{v:.1f}'
    return (s if lang == 'en' else s.replace('.', ',')) + ' ' + units[i]


def _fview(zones, state='running', step='', done=0, total=2, result=None, jid='j1', verb='fetch', args=None):
    """The view of a base fetch / purge job as the launcher gives it (tools/regen/base_sources.py): set and verb say which job it is."""
    v = _view(state, step=step, done=done, total=total, zones=zones, result=result, jid=jid)
    v.update({'set': 'base', 'verb': verb, 'args': args or {}})
    return v


def _fz(state, done=0, total=0, sources=None, **extra):
    """A zone of a fetch / purge view, with its sources."""
    z = _zs(state, done, total, **extra)
    if sources is not None:
        z['sources'] = sources
    return z


def _zhead(c, z):
    """The words of a zone's line in a download without the lines of its sources (its name and its phrase)."""
    return norm(c.js("""(z) => { const d = document.querySelector('[data-zone-state="' + z + '"] > div').cloneNode(true); d.querySelector('ul')?.remove(); return d.textContent }""", z))


def _verbs(c):
    """The verb buttons of the panel, in order, each with ':off' when grey."""
    return c.js("[...document.querySelectorAll('[data-build] [data-verb]')].filter(b => !b.dataset.verb.startsWith('pickup')).map(b => b.dataset.verb + (b.disabled ? ':off' : ''))")


def _grey(c, what):
    """Télécharger, Construire, Purger and Publier are grey, for ONE reason written once under the panel: its key."""
    c.eq(c.js("[...document.querySelectorAll('[data-build] [data-verb]:not([data-verb=pickup]), [data-publish] [data-verb]')].filter(b => b.dataset.verb !== 'stop').map(b => b.dataset.verb + (b.disabled ? ':off' : ''))"),
         ['download:off', 'build:off', 'purge:off', 'publish:off'], f'{what}: the four verbs are grey', what='verbs')
    c.eq(c.js("[...document.querySelectorAll('[data-build] [data-reason]')].map(p => p.dataset.reason)"), ['busy'], f'{what}: one reason, written once', what='reason')


@case('L15', 'Données: Télécharger and Purger against a fake launcher (body, lines per zone and source, summary, manual sources, plan then one question, journal, grey reasons, resume)', 'L',
      tags=('data',), langs4=True, designs=('standard',),
      rule='modules/data/SPEC 3 (plan before change, one question, notify at the end only, one operation at a time), 5.1, 6.5; tools/regen/base_sources.py (base/fetch, base/purge)')
def l15(c):
    lang = c.lang
    li = {'fr': 0, 'en': 1, 'de': 2, 'es': 3}[lang]
    sm = lambda key, who: _trow(key, lang, f'{who}: {{')
    files2 = f'2 {FILES[lang][1]} ({_size(1500000, lang)})'
    man_names = {'sia': ['SIA fr', 'SIA en', 'SIA de', 'SIA es'], 'nats': ['NATS fr', 'NATS en', 'NATS de', 'NATS es'], 'z': ['Z fr', 'Z en', 'Z de', 'Z es']}
    manual = [{'zone': 'fr', 'source': 'sia', 'url': 'https://www.sia.example/aip', 'name': man_names['sia']},
              {'zone': 'gb', 'source': 'nats', 'url': 'http://insecure.example/nats', 'name': man_names['nats']},
              {'zone': 'gb', 'source': 'z', 'url': 'javascript:alert(1)', 'name': man_names['z']}]
    run1 = _fview({'fr': _fz('fetching', 1, 3, {'openaip': {'state': 'downloaded', 'files': 2, 'bytes': 1500000}, 'sia': {'state': 'manual', 'error': 'manual'}}), 'gb': _fz('waiting')}, step='Zone fr')
    run2 = _fview({'fr': _fz('done', 3, 3, {'openaip': {'state': 'downloaded', 'files': 2, 'bytes': 1500000}, 'sia': {'state': 'manual', 'error': 'manual'}}),
                   'gb': _fz('fetching', 1, 2, {'nats': {'state': 'skipped', 'error': 'personal'}, 'ukmil': {'state': 'failed', 'error': 'http', 'status': 404}})}, step='Zone gb', done=1)
    result = {'ok': True, 'fetched': ['fr'], 'unchanged': [], 'failed': [{'zone': 'gb', 'source': 'ukmil', 'error': 'http', 'status': 404}], 'manual': manual,
              'outside_sync': 3, 'warnings': [{'code': 'outside-sync', 'count': 3}], 'reason': 'partial'}
    end = _fview({'fr': _fz('done', 3, 3, {'openaip': {'state': 'downloaded', 'files': 2, 'bytes': 1500000}, 'sia': {'state': 'manual', 'error': 'manual'}}),
                  'gb': _fz('failed', 2, 2, {'nats': {'state': 'skipped', 'error': 'personal'}, 'ukmil': {'state': 'failed', 'error': 'http', 'status': 404}, 'nat': {'state': 'unchanged'}}, error='http')},
                 state='done', step='Terminé', done=2, result=result)
    st = _launcher(c, [run1, run2, run2, end])
    cfg, _ = _fixture()
    names = lambda *ids: ', '.join(z['names'][li] for z in cfg['zones'] if z['id'] in ids)
    _open(c, cfg)
    before = c.js('window.__stub.calls.publication')
    # ---- A: the panel holds the three verbs, in this order, under one choice of zones; no zone: all grey, one reason
    c.eq(_verbs(c), ['download', 'build', 'purge'], 'Télécharger · Construire · Purger, in this order, in the one panel', what='verbs')
    c.eq([norm(c.text(f'[data-build] [data-verb={v}]')) for v in ('download', 'build', 'purge')], [norm(_trow(v, lang)) for v in ('download', 'build', 'purge')], 'worded in the language of the run', what='labels')
    c.eq(norm(c.text('[data-build] h2')), norm(_trow('buildTitle', lang)), 'the panel title covers the three verbs', what='title')
    _untick(c, 'ca', 'es', 'us', 'fr', 'gb')
    c.eq([_verbs(c), c.attr('[data-build] [data-reason]', 'data-reason'), norm(c.text('[data-build] [data-reason]')), c.count('[data-build] [data-reason]')],
         [['download:off', 'build:off', 'purge:off'], 'no-zone', norm(_trow('no-zone', lang, 'greyReason: {')), 1], 'no zone ticked: the three are grey, one reason', what='no zone')
    c.tap('[data-build-zone="fr"]')
    c.tap('[data-build-zone="gb"]')
    c.eq(_verbs(c), ['download', 'build', 'purge'], 'live with a launcher and zones ticked', what='verbs')
    _screen_ok(c, 'before the download')
    # ---- B: Télécharger: the body, the lines per zone and per source, the end
    c.tap('[data-verb=download]')
    c.until("!!document.querySelector('[data-build] [data-running][data-op=fetch]')", what='the running bar is drawn')
    c.eq(len(st['posts']), 1, 'one start', what='posts')
    c.eq({k: st['posts'][0][k] for k in ('set', 'verb', 'args', 'author')}, {'set': 'base', 'verb': 'fetch', 'args': {'zones': ['fr', 'gb'], 'personal': []}, 'author': 'ABC'},
         'the body: verb fetch, the ticked zones, personal EMPTY by default', what='body')
    _grey(c, 'while it runs')
    c.eq(c.js("[...document.querySelectorAll('[data-build] input[type=checkbox]')].every(i => i.disabled)"), True, 'the choices are frozen while it runs', what='frozen checkboxes')
    c.eq(c.js("[...document.querySelectorAll('[data-zone-state]')].map(l => [l.dataset.zoneState, l.dataset.state])"), [['fr', 'waiting'], ['gb', 'waiting']], 'a line per zone, waiting before the first view', what='zone lines')
    c.until("document.querySelector('[data-zone-state=fr]').dataset.state === 'fetching'", timeout=8000, what='fr is downloading')
    fr_name = c.text('[data-zone-state=fr] > div > b')
    c.eq(_zhead(c, 'fr'), norm(f"{fr_name} : {sm('fetchingN', 'fetchState').replace('{n}', '1').replace('{m}', '3')}"), 'the zone: downloading (1 / 3 sources)', what='fr line')
    s_open = c.text('[data-zone-state=fr] [data-source=openaip] b')
    c.eq(norm(c.text('[data-zone-state=fr] [data-source=openaip]')), norm(f"{s_open} : {sm('downloaded', 'sourceState').replace('{n}', files2)}"), 'a source: downloaded, 2 files and their size', what='source downloaded')
    c.eq([c.attr('[data-zone-state=fr] [data-source=openaip]', 'data-state'), c.attr('[data-zone-state=fr] [data-source=sia]', 'data-state')], ['downloaded', 'manual'], 'the state of each source', what='source states')
    c.eq(norm(c.text('[data-zone-state=fr] [data-source=sia]')), norm(f"{c.text('[data-zone-state=fr] [data-source=sia] b')} : {sm('manual', 'sourceState')}"), 'a manual source says so', what='source manual')
    c.eq(norm(c.text('[data-running] [data-count]')), norm(_trow('runCount', lang).replace('{n}', _zones_text(lang, 0)).replace('{m}', '2')), 'the count « 0 zones sur 2 »', what='count')
    c.until("document.querySelector('[data-zone-state=fr]').dataset.state === 'done' && document.querySelector('[data-zone-state=gb]').dataset.state === 'fetching'", timeout=8000, what='fr done, gb downloading')
    gb_name = c.text('[data-zone-state=gb] > div > b')
    c.eq(_zhead(c, 'gb'), norm(f"{gb_name} : {sm('fetchingN', 'fetchState').replace('{n}', '1').replace('{m}', '2')}"), 'gb: downloading (1 / 2 sources)', what='gb line')
    c.eq(norm(c.text('[data-zone-state=gb] [data-source=nats]')), norm(f"{c.text('[data-zone-state=gb] [data-source=nats] b')} : {sm('skippedPersonal', 'sourceState')}"), 'a source skipped: licence not declared', what='source skipped')
    http404 = sm('failed', 'sourceState').replace('{r}', sm('httpN', 'fetchError').replace('{s}', '404'))
    c.eq(norm(c.text('[data-zone-state=gb] [data-source=ukmil]')), norm(f"{c.text('[data-zone-state=gb] [data-source=ukmil] b')} : {http404}"), 'a source failed: its code and HTTP status', what='source failed')
    c.eq(_notes_with(c, _trow('fetchSum', lang).split('{c}')[0]), [], 'no notification at the start nor on the way', what='notifications before the end')
    _screen_ok(c, 'running')
    c.until("!!document.querySelector('[data-build-result][data-op=fetch]')", timeout=10000, what='the end of the download')
    want = _trow('fetchSum', lang).replace('{c}', _trow('fetchChanged', lang, row=0).replace('{n}', '1')).replace('{u}', _trow('fetchSame', lang, row=1).replace('{n}', '0')).replace('{f}', _trow('fetchFails', lang, row=0).replace('{n}', '1'))
    c.eq([c.attr('[data-build-result]', 'data-result'), norm(c.text('[data-build-result] b'))], ['partial', norm(want)], 'the summary: 1 zone changed, 0 unchanged, 1 failure', what='summary')
    outside = _trow('fetchOutside', lang, row=1).replace('{n}', '3')
    c.eq(norm(c.text('[data-build-result] [data-outside]')), norm(outside), 'files outside the synchronised data: said (3)', what='outside')
    c.eq(norm(c.text('[data-build-result] [data-manual-hint]')), norm(_trow('fetchManual', lang)), '« à déposer à la main »', what='manual hint')
    items = c.js("[...document.querySelectorAll('[data-build-result] [data-manual-list] li')].map(li => [li.dataset.manual, li.textContent.replace(/\\s+/g, ' ').trim(), li.querySelector('a')?.getAttribute('href') || null, li.querySelector('a')?.rel || null])")
    c.eq(items, [['fr:sia', norm(f"{fr_name} : {man_names['sia'][li]}"), 'https://www.sia.example/aip', 'noopener noreferrer'],
                 ['gb:nats', norm(f"{gb_name} : {man_names['nats'][li]}"), None, None], ['gb:z', norm(f"{gb_name} : {man_names['z'][li]}"), None, None]],
         'the manual sources by name in the language: a link only for the https:// address, the http:// and javascript: ones are names alone', what='manual sources')
    c.eq(_zhead(c, 'gb'), norm(f"{gb_name} : {sm('failed', 'fetchState').replace('{r}', sm('http', 'fetchError'))}"), 'the failed zone says why', what='gb failed line')
    c.eq(norm(c.text('[data-build-result] [data-zone-state=gb] [data-source=ukmil]')), norm(f"{c.text('[data-build-result] [data-zone-state=gb] [data-source=ukmil] b')} : {http404}"), 'its failed source keeps code and status', what='gb source')
    c.eq(c.count('[data-running]'), 0, 'the bar is gone', what='running')
    c.eq(_verbs(c), ['download', 'build', 'purge'], 'the buttons are live again', what='verbs')
    note = _notes_with(c, want)
    c.eq(len(note), 1, 'ONE notification, with the counts', what='notifications')
    c.ok(norm(outside) in norm(note[0]), note, 'the notification says the files outside the synchronised data too')
    c.until(f"window.__stub.calls.publication > {before}", what='publication() is read again (the rows change)')
    doc = c.until_doc('cache/data/journal.json', lambda d: bool(d and d.get('ops')), what='the journal is written')
    e = doc['ops'][-1]
    c.eq([e['set'], e['verb'], e['zones'], e['result'], e['fetched'], e['unchanged'], e['failed']],
         ['base', 'download', ['fr', 'gb'], 'partial', ['fr'], [], [{'zone': 'gb', 'source': 'ukmil', 'error': 'http', 'status': 404}]], 'the journal entry of the download', what='journal entry')
    ops = c.js("[...document.querySelectorAll('[data-journal] [data-op]')].map(o => [o.dataset.opVerb, o.dataset.result, o.textContent.replace(/\\s+/g, ' ').trim()])")
    c.ok(len(ops) == 1 and ops[0][0] == 'download' and norm(_trow('download', lang, 'opVerb: {')) in norm(ops[0][2]), ops, 'the journal line says the verb')
    _screen_ok(c, 'at the end of the download')
    # ---- C: ENAIRE only when ticked; nothing to fetch says so
    st['views'] = [_fview({}, state='error', jid='j2', done=0, total=0, result={'ok': False, 'fetched': [], 'unchanged': [], 'failed': [], 'manual': [], 'outside_sync': 0, 'warnings': [], 'reason': 'nothing-to-fetch'})]
    st['i'], st['start'] = 0, (200, {'job': 'j2'})
    c.tap('[data-build-zone="es"]')
    c.tap('[data-personal="enaire"]')
    c.tap('[data-verb=download]')
    c.until("!!document.querySelector('[data-build-result][data-result=nothing]')", timeout=10000, what='nothing to download is said')
    c.eq(st['posts'][1]['args'], {'zones': ['es', 'fr', 'gb'], 'personal': ['enaire']}, 'ENAIRE goes in args.personal when ticked', what='second body')
    nothing = _trow('fetchNothing', lang)
    c.eq([norm(c.text('[data-build-result]')), c.count('[data-build-result] [data-zone-state]'), len(_notes_with(c, nothing))], [norm(nothing), 0, 1], '« Rien à télécharger pour ces zones »: the sentence alone, one notification', what='nothing to fetch')
    doc = c.until_doc('cache/data/journal.json', lambda d: bool(d and len(d.get('ops', [])) >= 2), what='the second entry')
    c.eq([doc['ops'][-1]['verb'], doc['ops'][-1]['result']], ['download', 'nothing'], 'journaled as « nothing »', what='journal')
    # ---- D: a refusal 429 says when to try again
    st['start'] = (429, {'reason': 'too-soon', 'wait': 12})
    c.tap('[data-verb=download]')
    c.until("!!document.querySelector('[data-build-result][data-refusal=tooSoon]')", timeout=6000, what='the 429 is said')
    want429 = _trow('tooSoon', lang, 'refused: {').replace('{n}', '12')
    c.eq([norm(c.text('[data-build-result]')), len(_notes_with(c, want429)), _verbs(c)], [norm(want429), 1, ['download', 'build', 'purge']], '429 too-soon: « Réessayez dans 12 s », one notification, the buttons live', what='429')
    # ---- E: Purger: the plan first, then ONE question; No does nothing
    _untick(c, 'gb')
    rem = {'fr': {'files': 12, 'bytes': 14470348}, 'es': {'files': 3, 'bytes': 524288}}
    warn = [{'code': 'shared-fr'}, {'code': 'kept-tracked', 'count': 2}, {'code': 'unsafe-path', 'count': 1}]
    dry_zones = {'es': {'state': 'done', 'files': 3, 'bytes': 524288}, 'fr': {'state': 'done', 'files': 12, 'bytes': 14470348}}
    dry_done = _fview(dry_zones, state='done', step='Plan', done=2, verb='purge', args={'zones': ['es', 'fr'], 'dry': True}, jid='d1', result={'ok': True, 'removed': rem, 'warnings': warn})
    ask = ' '.join([_trow('purgeAsk', lang).replace('{n}', f'15 {FILES[lang][1]}').replace('{s}', _size(14994636, lang)).replace('{z}', names('es', 'fr')),
                    _trow('purgeShared', lang), _trow('purgeKept', lang, row=1).replace('{n}', '2')])
    st['views'], st['i'], st['start'] = [dry_done], 0, (200, {'job': 'p1'})
    posts = len(st['posts'])
    c.tap('[data-verb=purge]')
    q = _ask_text(c)
    c.eq([norm(q['text']), norm(q['ok']), q['no']], [norm(ask), norm(_trow('purge', lang)), True],
         'ONE question from the plan: files, size, zones, the SIA sentence (shared-fr), the files tracked by git kept; one-word confirmation and a way out', what='question')
    c.eq(len(st['posts']), posts + 1, 'only the plan was started', what='posts')
    c.eq({k: st['posts'][-1][k] for k in ('set', 'verb', 'args')}, {'set': 'base', 'verb': 'purge', 'args': {'zones': ['es', 'fr'], 'dry': True}}, 'the plan: dry true, the ticked zones', what='dry body')
    c.eq(c.js("[...document.querySelectorAll('[data-build] [data-verb]:not([data-verb=pickup]), [data-publish] [data-verb]')].filter(b => b.dataset.verb !== 'stop').map(b => b.dataset.verb + (b.disabled ? ':off' : ''))"), ['download:off', 'build:off', 'purge:off', 'publish:off'],
         'all four are grey while the question is open', what='verbs during the question')
    c.tap('.f-modal [data-no]')
    c.until("!document.querySelector('.f-modal')", what='the window closes')
    c.wait(400)
    c.eq([len(st['posts']), c.count('[data-build-result]'), c.count('[data-running]'), _verbs(c), len(_notes_with(c, _trow('purgeDone', lang).split('{n}')[0]))], [posts + 1, 0, 0, ['download', 'build', 'purge'], 0],
         'No: no second job, nothing said, the buttons live', what='after No')
    c.eq([o for o in c.doc('cache/data/journal.json')['ops'] if o['verb'] == 'purge'], [], 'the plan is never journaled', what='journal after No')
    # ---- F: Yes: the real job has no dry; the end; one journal entry
    real_run = _fview({'es': _fz('purging'), 'fr': _fz('waiting')}, step='Zone es', done=0, verb='purge', args={'zones': ['es', 'fr']}, jid='p2')
    real_done = _fview({'es': {'state': 'done', 'files': 3, 'bytes': 524288}, 'fr': {'state': 'done', 'files': 12, 'bytes': 14470348}}, state='done', step='Terminé', done=2, verb='purge',
                       args={'zones': ['es', 'fr']}, jid='p2', result={'ok': True, 'removed': rem, 'warnings': warn})
    st['views'], st['i'], st['start'] = [dry_done, real_run, real_done], 0, (200, {'job': 'p2'})
    c.tap('[data-verb=purge]')
    q = _ask_text(c)
    c.eq(norm(q['text']), norm(ask), 'the same question', what='question')
    c.tap('.f-modal [data-ok]')
    c.until("!!document.querySelector('[data-build] [data-running][data-op=purge]:not([data-dry])')", timeout=8000, what='the real purge runs')
    c.eq(len(st['posts']), posts + 3, 'the plan, then the real job', what='posts')
    c.eq({k: st['posts'][-1][k] for k in ('set', 'verb', 'args')}, {'set': 'base', 'verb': 'purge', 'args': {'zones': ['es', 'fr']}}, 'the real body has no dry', what='real body')
    c.until("!!document.querySelector('[data-build-result][data-op=purge][data-result=done]')", timeout=10000, what='the end of the purge')
    done = _trow('purgeDone', lang).replace('{n}', f'15 {FILES[lang][1]}').replace('{s}', _size(14994636, lang))
    c.eq(norm(c.text('[data-build-result] b')), norm(done), 'the end: « Purgé : 15 fichiers, 14,3 Mo »', what='summary')
    c.eq(c.js("[...document.querySelectorAll('[data-build-result] [data-line]')].map(p => p.textContent.replace(/\\s+/g, ' ').trim())"),
         [norm(_trow('purgeShared', lang)), norm(_trow('purgeKept', lang, row=1).replace('{n}', '2')), norm(_trow('purgeUnsafe', lang, row=0).replace('{n}', '1'))],
         'the sentences of the warnings: SIA shared, files kept, one path refused and left in place', what='warning lines')
    es_name = c.text('[data-build-result] [data-zone-state=es] b')
    c.eq(norm(c.text('[data-build-result] [data-zone-state=es]')), norm(f"{es_name} : {_trow('done', lang, 'purgeState: {').replace('{n}', f'3 {FILES[lang][1]}').replace('{s}', _size(524288, lang))}"), 'a zone line: its files and size', what='es line')
    note = _notes_with(c, done)
    c.eq(len(note), 1, 'ONE notification', what='notifications')
    c.ok(norm(_trow('purgeShared', lang)) in norm(note[0]), note, 'it carries the sentences of the warnings')
    c.eq(_verbs(c), ['download', 'build', 'purge'], 'the buttons are live again', what='verbs')
    doc = c.until_doc('cache/data/journal.json', lambda d: bool(d and any(o.get('verb') == 'purge' for o in d.get('ops', []))), what='the purge is journaled')
    es = [o for o in doc['ops'] if o['verb'] == 'purge']
    c.eq([[o['set'], o['zones'], o['result'], o['files'], o['bytes']] for o in es], [['base', ['es', 'fr'], 'done', 15, 14994636]], 'ONE journal entry: the real run only', what='journal purge')
    _screen_ok(c, 'at the end of the purge')
    # ---- G: nothing to remove: no question
    dry_none = _fview({'es': {'state': 'done', 'files': 0, 'bytes': 0}, 'fr': {'state': 'done', 'files': 0, 'bytes': 0}}, state='done', step='Plan', done=2, verb='purge', args={'zones': ['es', 'fr'], 'dry': True},
                      jid='d3', result={'ok': True, 'removed': {'es': {'files': 0, 'bytes': 0}, 'fr': {'files': 0, 'bytes': 0}}, 'warnings': [{'code': 'shared-fr'}]})
    st['views'], st['i'], st['start'] = [dry_none], 0, (200, {'job': 'p3'})
    posts = len(st['posts'])
    c.tap('[data-verb=purge]')
    c.until("!!document.querySelector('[data-build-result][data-result=nothing]')", timeout=8000, what='« Rien à purger » is said')
    c.eq([norm(c.text('[data-build-result]')), c.count('.f-modal'), len(st['posts']) - posts, len(_notes_with(c, _trow('purgeNothing', lang))), _verbs(c)],
         [norm(_trow('purgeNothing', lang)), 0, 1, 1, ['download', 'build', 'purge']], 'an empty plan: the sentence, no question, no second job, one notification', what='nothing to purge')
    c.eq(len([o for o in c.doc('cache/data/journal.json')['ops'] if o['verb'] == 'purge']), 1, 'still one purge in the journal', what='journal')
    # ---- H: a running download found at mount is followed with its own lines; the other verbs are grey
    run = _fview({'fr': _fz('fetching', 1, 3, {'openaip': {'state': 'downloaded', 'files': 2, 'bytes': 1500000}}), 'gb': _fz('waiting')}, step='Zone fr', jid='j7')
    end2 = _fview({'fr': _fz('done', 3, 3, {'openaip': {'state': 'downloaded', 'files': 2, 'bytes': 1500000}}), 'gb': _fz('done', 2, 2, {'ukmil': {'state': 'unchanged'}})}, state='done', done=2, jid='j7',
                  result={'ok': True, 'fetched': ['fr'], 'unchanged': ['gb'], 'failed': [], 'manual': [], 'outside_sync': 0, 'warnings': []})
    st['current'], st['views'], st['i'] = run, [run, run, end2], 0
    c.page.reload(wait_until='load')
    _head(c)
    c.until("!!document.querySelector('[data-build] [data-running][data-op=fetch]')", timeout=8000, what='the running download is followed')
    _grey(c, 'a download found running')
    c.eq(c.count('[data-verb=stop]'), 1, 'Arrêter is offered', what='stop')
    c.eq(c.js("document.querySelector('[data-group=base]').open"), True, 'the base group is open to show it', what='group open')
    fr_name = c.text('[data-zone-state=fr] > div > b')
    c.eq(_zhead(c, 'fr'), norm(f"{fr_name} : {sm('fetchingN', 'fetchState').replace('{n}', '1').replace('{m}', '3')}"), 'its own lines: a zone with n / m sources', what='fr line')
    c.eq(c.count('[data-zone-state=fr] [data-source=openaip]'), 1, 'and its sources', what='source line')
    c.until("!!document.querySelector('[data-build-result][data-op=fetch][data-result=done]')", timeout=10000, what='the followed download ends')
    want = _trow('fetchSum', lang).replace('{c}', _trow('fetchChanged', lang, row=0).replace('{n}', '1')).replace('{u}', _trow('fetchSame', lang, row=0).replace('{n}', '1')).replace('{f}', _trow('fetchFails', lang, row=1).replace('{n}', '0'))
    c.eq([norm(c.text('[data-build-result] b')), len(_notes_with(c, want)), c.count('[data-outside]'), c.count('[data-manual-list]')], [norm(want), 1, 0, 0], 'followed to its end: the summary, one notification, no outside line, no manual list', what='summary')
    # ---- I: a build running: the other two verbs are grey too
    st['views'], st['i'], st['start'], st['current'] = [_view(step='Zone fr', done=0, zones={'fr': _zs('building', 1, 4), 'gb': _zs('waiting')}, jid='b1')], 0, (200, {'job': 'b1'}), None
    c.tap('[data-verb=build]')
    c.until("!!document.querySelector('[data-build] [data-running][data-op=build]')", timeout=8000, what='the build runs')
    _grey(c, 'a build running')
    c.eq(norm(c.text('[data-build] [data-reason]')), norm(_trow('busy', lang, 'greyReason: {')), '« Une autre opération est en cours »', what='reason text')
    _screen_ok(c, 'a build running')
    c.check_errors()


# ------------------------------------------------------------------------------------------------------ L16
_L16_JS = r"""async () => {
  const M = await import('/modules/data/model.js');
  const out = {};
  out.sets = Object.fromEntries(Object.entries(M.SETS).map(([k, v]) => [k, [v.arg, v.unit, v.group, v.verbs, v.noItem]]));
  out.sheets = [M.SHEETS.set, M.SHEETS.verb, M.SHEETS.panel];
  out.panels = [M.panelOf('aircraft', 'publish'), M.panelOf('aircraft', 'build'), M.panelOf('base', 'fetch'), M.groupOf('vfr', 'build'), M.groupOf('aircraft', 'publish'), M.groupOf('proc', 'fetch')];
  // the verbs a launcher knows
  out.known = [null, { ok: false, status: 404, route: 'regen/verbs' }, {}, { verbs: 'x' }, { verbs: ['base/build', 'proc/fetch', 'bad', 'x/y/z', 3, 'Proc/x'] }, { ok: false, verbs: ['base/build'] }, { verbs: [] }].map(M.knownVerbs);
  out.verbKnown = [M.verbKnown(null, 'base', 'fetch'), M.verbKnown(null, 'proc', 'fetch'), M.verbKnown(['proc/fetch'], 'proc', 'fetch'), M.verbKnown(['proc/fetch'], 'proc', 'build'), M.verbKey('vfr', 'purge')];
  // the grey reason of a panel and of each of its verbs
  const ALL = ['proc/fetch', 'proc/build', 'proc/purge'];
  const g = s => { const r = M.setGate(s); return [r.reason, Object.fromEntries(Object.entries(r.verbs).map(([k, v]) => [k, v.reason]))] };
  out.gate = [
    g({ set: 'proc', launcher: false, known: ALL, items: 1 }),
    g({ set: 'proc', launcher: true, known: M.OLD_VERBS, items: 2 }),
    g({ set: 'proc', launcher: true, known: ALL, items: 0 }),
    g({ set: 'proc', launcher: true, known: ['proc/fetch', 'proc/build'], items: 1 }),
    g({ set: 'proc', launcher: true, known: ALL, items: 0, busy: true }),
    g({ set: 'proc', launcher: true, known: ALL, items: 1, busy: true, offline: true }),
    g({ set: 'proc', launcher: true, known: ALL, items: 1, offline: true }),
    g({ set: 'aircraft', launcher: true, known: ['aircraft/fetch', 'aircraft/build', 'aircraft/purge'] }),
    g({ set: 'base', launcher: true, known: null, items: 0 }),
    g({ set: 'base', launcher: true, known: null, items: 3 }),
    g({ set: 'vfr', launcher: true, known: M.OLD_VERBS, items: 1 }),
    g({ set: 'aircraft', verbs: ['publish'], launcher: true, known: ['aircraft/publish'] }),
    g({ set: 'aircraft', verbs: ['publish'], launcher: true, known: [] })
  ];
  // the States offered: green and orange only, by name
  const L = (a, b, c, d) => [a, b, c, d];
  const st = { LF: { level: 'green', names: L('France', 'France', 'Frankreich', 'Francia') }, EG: { level: 'green', names: L('Royaume-Uni', 'United Kingdom', 'Vereinigtes Königreich', 'Reino Unido') },
    EB: { level: 'orange', names: L('Belgique', 'Belgium', 'Belgien', 'Bélgica') }, ED: { level: 'red', names: L('Allemagne', 'Germany', 'Deutschland', 'Alemania') }, XX: { level: 'orange' }, YY: null };
  out.proc = [M.procItems(st, 0), M.procItems(st, 2), M.procItems(null, 0), M.procItems({}, 1)].map(l => l.map(i => [i.id, i.name, i.level]));
  // the ICAO types field
  out.codes = ['a320, b738  e190', '', 'A320,a320,B', 'A320 TOOLONG 7', 'a-1', null, '  ,, '].map(t => { const r = M.parseCodes(t); return [r.codes, r.bad] });
  // the arguments of each set
  const sel = { ids: ['EG', 'LF'], personal: ['nats'], cycle: '2026-10-29', codes: ['A320'] };
  out.args = [['base', 'build'], ['base', 'fetch'], ['base', 'purge'], ['proc', 'build'], ['proc', 'purge'], ['vfr', 'fetch'], ['vfr', 'purge'], ['aircraft', 'build'], ['aircraft', 'fetch'], ['aircraft', 'purge']].map(([s, v]) => M.setArgs(s, v, sel));
  // which job a view is
  out.ops = [{ set: 'proc', verb: 'build' }, { set: 'aircraft', verb: 'publish' }, { set: 'vfr', verb: 'x' }, { zones: {} }, { set: 'proc', verb: 'build', zones: {} }, { set: 'weather', verb: 'fetch' }, null, { set: 'aircraft', verb: 'fetch' }].map(M.viewOp);
  out.dry = [{ set: 'aircraft', verb: 'publish', args: { dry: true } }, { set: 'aircraft', verb: 'publish', args: { dry: false } }, { set: 'proc', verb: 'purge', args: { dry: true } },
    { set: 'proc', verb: 'fetch', args: { dry: true } }, { set: 'base', verb: 'purge', args: { dry: true } }, null].map(M.opDry);
  out.baseKept = (v => M.normView('base', v) === v)({ zones: {} });
  // a view of another set, brought back to the base's shape
  const pv = { set: 'proc', verb: 'build', states: { LF: { state: 'built' }, EG: { state: 'failed', error: 'x' } }, result: { built: ['LF'], failed: [{ state: 'EG', error: 'x' }], manual: [{ state: 'LF', source: 's' }], reason: 'partial' } };
  const nv = M.normView('proc', pv);
  out.norm = [Object.keys(nv.zones), nv.result.failed[0].zone, nv.result.manual[0].zone, nv.result.built];
  out.single = [['build', 'running'], ['fetch', 'running'], ['purge', 'running'], ['fetch', 'done'], ['build', 'done'], ['build', 'error'], ['build', 'cancelled']].map(([verb, state]) =>
    Object.entries(M.normView('vfr', { set: 'vfr', verb, state, args: { cycle: '2026-10-29' } }).zones).map(([k, z]) => [k, z.state]));
  out.singleOutcome = (o => [o.out.kind, o.out.built])(M.setOutcome('vfr', 'build', { set: 'vfr', verb: 'build', state: 'done', args: { cycle: '2026-10-29' }, result: { ok: true } }));
  // the end of a job of each set
  const ac = (res, state = 'done', steps) => ({ set: 'aircraft', verb: 'build', state, steps: steps || {}, result: res });
  const so = (set, verb, v) => { const o = M.setOutcome(set, verb, v).out; return [o.kind, o.built || o.fetched, o.failed, o.level, o.files, o.bytes, o.zones, o.kept, o.nothing] };
  out.aircraft = [
    so('aircraft', 'build', ac({ ok: false, codes: ['A320'], steps: ['types'], failed: [{ item: 'apd', error: 'exit-2' }], commit: null, reason: 'partial' }, 'done',
      { types: { state: 'built' }, apd: { state: 'failed', error: 'exit-2' }, simbrief: { state: 'waiting' } })),
    so('aircraft', 'build', ac({ ok: true, codes: ['A320'], steps: ['types', 'apd', 'simbrief'], failed: [], commit: null })),
    so('aircraft', 'fetch', ac({ ok: true, codes: [], steps: ['types', 'apd', 'simbrief'], failed: [], commit: null })),
    so('aircraft', 'build', ac({ ok: false, codes: [], steps: [], failed: [], reason: 'no-codes' }, 'error')),
    so('aircraft', 'fetch', ac({ ok: false, codes: ['A320'], steps: [], failed: [], reason: 'no-script' }, 'error')),
    so('aircraft', 'build', ac({ ok: false, steps: [], failed: [{ item: 'types', error: 'exit-1' }], reason: 'failed' }, 'error')),
    so('aircraft', 'purge', ac({ ok: true, dry: true, removed: { files: 4, bytes: 2048 }, warnings: [{ code: 'kept-tracked', count: 1 }] })),
    so('aircraft', 'purge', ac({ ok: true, dry: true, removed: { files: 0, bytes: 0 }, warnings: [] }))
  ];
  // the journal entries
  const at = Date.parse('2026-10-30T10:00:00Z');
  const po = M.setOutcome('proc', 'build', pv).out;
  out.entry = [M.setEntry('proc', 'build', { at, ids: ['EG', 'LF'], seconds: 3.4, out: po, job: 'j1' }),
    M.setEntry('proc', 'fetch', { at, ids: ['LF'], seconds: 1, out: M.setOutcome('proc', 'fetch', { set: 'proc', verb: 'fetch', state: 'done', states: { LF: { state: 'done' } }, result: { fetched: ['LF'], unchanged: [], failed: [] } }).out }),
    M.setEntry('aircraft', 'purge', { at, ids: [], seconds: 2, out: M.setOutcome('aircraft', 'purge', ac({ ok: true, removed: { files: 4, bytes: 2048 } })).out }),
    M.setEntry('base', 'build', { at, ids: ['fr'], seconds: 3.4, out: M.outcome({ state: 'done', zones: { fr: { state: 'built' } } }) })];
  // the sheets: plan, end, entry
  const R = { ok: true, dry: true, remove: [{ path: 'a', size: 10 }], copy: [{ path: 'b', size: 20 }, { path: 'c', size: 30 }], message: 'm' };
  const sp = f => { const p = M.sheetsPlan(f); return [p.removed, p.copied, p.bytes, p.remove.length, p.copy.length] };
  out.plan = [sp({ result: R }), sp({ result: { plan: { remove: [], copy: [{ size: 5 }] } } }), sp(null), sp({ result: { ok: true, copy: 3 } })];
  const sx = f => { const o = M.sheetsOutcome(f); return [o.kind, o.copied, o.removed, o.nothing, o.level] };
  out.sheetsEnd = [sx({ state: 'done', result: { ...R, dry: false } }), sx({ state: 'done', result: { ok: true, dry: false, remove: [], copy: [] } }), sx({ state: 'error', result: { ok: false, reason: 'no-author' } }),
    sx({ state: 'cancelled' }), sx({ state: 'interrupted' }), sx({ state: 'error', result: { ok: false } }), sx({ state: 'done', result: { ok: true, copied: 4, removed: 2 } })];
  out.sheetsEntry = M.sheetsEntry({ at, seconds: 4.2, out: M.sheetsOutcome({ state: 'done', result: { ...R, dry: false } }), job: 'j5' });
  // the VAC points: the cycle's view, the fetch end (counts; a missing chart is not a failure), the build reasons, the purge total
  const vc = '2026-10-29';
  out.vfrView = [['build', 'done'], ['fetch', 'done'], ['build', 'building'], ['fetch', 'failed']].map(([verb, state]) =>
    Object.entries(M.normView('vfr', { set: 'vfr', verb, args: { cycle: vc }, cycles: { [vc]: { state, done: 3, total: 3 } } }).zones).map(([k, z]) => [k, z.state]));
  const vf = (res, state = 'done') => { const o = M.setOutcome('vfr', 'fetch', { set: 'vfr', verb: 'fetch', state, cycles: {}, result: res }).out; return [o.kind, o.counts, o.failed, o.level] };
  out.vfrFetch = [
    vf({ ok: true, cycle: vc, fetched: 12, unchanged: 25, notPublished: 3, failed: [] }),
    vf({ ok: true, cycle: vc, fetched: 40, unchanged: 0, notPublished: 0, failed: [] }),
    vf({ ok: false, cycle: vc, fetched: 5, unchanged: 0, notPublished: 1, failed: [{ item: 'LFPG', error: 'http-500' }], reason: 'partial' }),
    vf({ ok: false, cycle: vc, fetched: 0, unchanged: 0, notPublished: 0, failed: [{ item: 'LFPG', error: 'URLError' }], reason: 'failed' }, 'error'),
    vf({ ok: false, cycle: vc, fetched: 0, unchanged: 0, notPublished: 40, failed: [], reason: 'not-published' }, 'error'),
    vf({ ok: false, cycle: vc, reason: 'no-base', message: 'x' }, 'error'),
    vf({ ok: false, cycle: vc, fetched: 2, reason: 'cancelled' }, 'cancelled'),
    vf({ ok: true, fetched: ['A'], unchanged: ['B', 'C'], notPublished: [], failed: [] })
  ];
  const vb = (res, state = 'done') => { const o = M.setOutcome('vfr', 'build', { set: 'vfr', verb: 'build', state, args: { cycle: vc }, result: res }).out; return [o.kind, o.built, o.failed, o.commit, o.noCommit] };
  out.vfrBuild = [
    vb({ ok: true, cycle: vc, summary: { aerodromes: 300 }, commit: 'abc1234', failed: [] }),
    vb({ ok: true, cycle: vc, summary: {}, commit: null, warning: 'no author', failed: [] }),
    vb({ ok: false, cycle: vc, reason: 'no-pypdf', message: 'x' }, 'error'),
    vb({ ok: false, cycle: vc, reason: 'no-cache', message: 'x' }, 'error'),
    vb({ ok: false, cycle: vc, reason: 'invalid', failed: [{ item: 'plan', error: 'bad point' }], summary: {} }, 'error'),
    vb({ ok: false, cycle: vc, reason: 'failed', failed: [{ item: 'LFPG', error: 'unreadable' }], summary: {} }, 'error'),
    vb({ ok: false, cycle: vc, reason: 'cancelled' }, 'cancelled')
  ];
  const vp = res => { const o = M.setOutcome('vfr', 'purge', { set: 'vfr', verb: 'purge', state: 'done', result: res }).out; return [o.kind, o.files, o.bytes, o.zones, o.unsafe, o.kept] };
  out.vfrPurge = [vp({ ok: true, dry: true, removed: { files: 6, bytes: 3072 }, warnings: [{ code: 'unsafe-path', count: 2 }, { code: 'kept-tracked', count: 1 }] }), vp({ ok: true, dry: true, removed: { files: 0, bytes: 0 }, warnings: [] })];
  out.vfrEntry = M.setEntry('vfr', 'fetch', { at: Date.parse('2026-10-30T10:00:00Z'), ids: [vc], seconds: 5, out: M.setOutcome('vfr', 'fetch', { set: 'vfr', verb: 'fetch', state: 'done', result: { ok: true, fetched: 12, unchanged: 25, notPublished: 3, failed: [] } }).out, job: 'v1' });
  // proc (frame/INTEGRATION § 15 « Set proc per State »): built is { State: n }, fetched and unchanged are numbers of aerodromes, merge-pending for every set
  out.argsProc = [M.setArgs('proc', 'build', { ids: ['LF', 'K', 'LF'] }), M.setArgs('proc', 'purge', { ids: ['K'] })];
  const pb = (res, state = 'done') => { const o = M.setOutcome('proc', 'build', { set: 'proc', verb: 'build', state, states: { K: { state: 'done' }, LF: { state: 'failed' } }, result: res }).out; return [o.kind, o.built, o.failed] };
  out.procBuild = [
    pb({ ok: false, cycle: vc, built: { K: 12 }, commits: { K: 'abc1234' }, failed: [{ state: 'LF', error: 'no-cache' }], reason: 'partial' }),
    pb({ ok: true, cycle: vc, built: { K: 0, LF: 5 }, commits: { LF: 'def5678' }, failed: [] }),
    pb({ ok: false, cycle: vc, built: {}, commits: {}, failed: [], reason: 'merge-pending' }, 'error')
  ];
  const pf = res => { const o = M.setOutcome('proc', 'fetch', { set: 'proc', verb: 'fetch', state: 'done', states: { K: { state: 'done' } }, result: res }).out; return [o.kind, o.counts ?? null, o.failed] };
  out.procFetch = [
    pf({ ok: true, cycle: vc, fetched: 12, unchanged: 3, failed: [] }),
    pf({ ok: false, cycle: vc, fetched: 5, unchanged: 0, failed: [{ state: 'LF', error: 'not-a-zip' }], reason: 'partial' }),
    pf({ ok: true, cycle: vc, fetched: ['K'], unchanged: ['LF'], failed: [] })
  ];
  out.merge = [M.outcome({ state: 'error', zones: {}, result: { ok: false, reason: 'merge-pending' } }).kind,
    M.setOutcome('vfr', 'build', { set: 'vfr', verb: 'build', state: 'error', args: { cycle: vc }, result: { ok: false, reason: 'merge-pending' } }).out.kind,
    M.setOutcome('proc', 'build', { set: 'proc', verb: 'build', state: 'error', states: {}, result: { ok: false, reason: 'merge-pending' } }).out.kind,
    (o => [o.kind, o.level])(M.sheetsOutcome({ state: 'error', result: { ok: false, reason: 'merge-pending' } })),
    M.journalEntry({ at: 0, zones: ['fr'], seconds: 1, out: M.outcome({ state: 'error', zones: {}, result: { ok: false, reason: 'merge-pending' } }) }).reason];
  // « Tout mettre à jour »: the verdict on the end of a job, the stale groups, the journal marker of a chain
  out.chainOrder = [M.CHAIN_SETS, M.CHAIN_VERBS];
  out.verdict = [['fetch', { kind: 'done' }], ['fetch', { kind: 'nothing' }], ['fetch', { kind: 'not-published' }], ['fetch', { kind: 'partial' }], ['fetch', { kind: 'cancelled' }],
    ['build', { kind: 'done' }], ['build', { kind: 'nothing' }], ['build', { kind: 'not-published' }], ['build', { kind: 'merge-pending' }], ['build', { kind: 'no-cache' }], ['fetch', null]].map(([v, o]) => M.chainVerdict(v, o));
  out.stale = M.staleGroups([{ id: 'base', rows: [{ state: 'ok', cycle: '2611' }, { state: 'stale-cycle', cycle: '2610' }], more: [{ state: 'stale-cycle', cycle: '2609' }] },
    { id: 'proc', rows: [{ state: 'ok', cycle: '2611' }], more: [] }, { id: 'aircraft', rows: [{ state: 'stale-cycle', cycle: '2600' }], more: [] }]);
  out.staleNone = [M.staleGroups(null), M.staleGroups([])];
  const jl = [{ at: 'a', verb: 'x', job: 'j1', result: 'running' }, { at: 'b', verb: 'y' }];
  out.jset = [M.journalSet(jl, { at: 'c', verb: 'x', job: 'j1', result: 'done' }).map(e => e.result ?? e.verb), M.journalSet(jl, { at: 'd', verb: 'z', job: 'j2' }).map(e => e.at), M.journalSet(jl, { at: 'e', verb: 'z' }, 2).map(e => e.at)];
  out.chainEntry = M.chainEntry({ at: Date.parse('2026-10-30T10:00:00Z'), items: [{ set: 'base', result: 'done', why: 'x' }, { set: 'proc', result: 'skipped' }], seconds: 12.6, result: 'failed', job: 'chain-1' });
  out.open = [M.openChain([{ set: 'all', verb: 'update', result: 'done', job: 'a' }, { set: 'all', verb: 'update', result: 'running', job: 'b' }, { set: 'base', verb: 'build', result: 'running' }])?.job, M.openChain([]), M.openChain([{ set: 'all', verb: 'update', result: 'interrupted' }])];
  // base/pickup: the plan and the end, the entry, the manual sources the launcher can take
  const pkTk = { zone: 'fr', source: 'sia', zip: 'z.zip', files: ['a', 'b'], bytes: 10 }, pkMs = { zone: 'gb', source: 'nats', expected: 'EG_*.zip' }, pkBg = { zone: 'gb', source: 'nats', error: 'zip over 500 MB' };
  const pko = f => { const o = M.pickupOutcome(f); return [o.kind, o.dry, o.files, o.bytes, o.taken.map(t => t.zone), o.missing.length, o.failed, o.level] };
  out.pickup = [
    pko({ state: 'done', result: { ok: true, dry: true, taken: [pkTk], missing: [pkMs], failed: [] } }),
    pko({ state: 'done', result: { ok: true, dry: true, taken: [], missing: [pkMs, { ...pkMs, zone: 'fr', source: 'sia' }], failed: [] } }),
    pko({ state: 'done', result: { ok: false, dry: false, taken: [pkTk], missing: [], failed: [pkBg], reason: 'partial' } }),
    pko({ state: 'error', result: { ok: false, dry: false, taken: [], missing: [], failed: [{ ...pkBg, error: 'nothing-to-take' }], reason: 'failed' } }),
    pko({ state: 'cancelled', result: { ok: false, dry: false, taken: [pkTk], missing: [], failed: [], reason: 'cancelled' } }),
    pko({ state: 'interrupted' }), pko(null), pko({ state: 'done', result: { ok: true, dry: false, taken: [{ zone: 'fr' }, null, { ...pkTk, files: 'x', bytes: 'y' }], missing: 'x', failed: [{ source: 's' }] } })];
  out.pickupOp = [M.viewOp({ set: 'base', verb: 'pickup' }), M.opDry({ set: 'base', verb: 'pickup', args: { dry: true } }), M.opDry({ set: 'base', verb: 'pickup', args: { dry: false } }), M.viewOp({ set: 'proc', verb: 'pickup' })];
  out.pickupEntry = M.setEntry('base', 'pickup', { at: Date.parse('2026-10-30T10:00:00Z'), ids: ['fr', 'gb'], seconds: 2.4, out: M.pickupOutcome({ state: 'done', result: { ok: false, dry: false, taken: [pkTk], missing: [], failed: [pkBg], reason: 'partial' } }), job: 'k9' });
  out.manualFlags = M.fetchOutcome({ state: 'done', result: { ok: true, fetched: [], unchanged: [], failed: [], manual: [{ zone: 'fr', source: 'sia', name: ['a'], pickup: true, expected: 'x*.zip' }, { zone: 'fr', source: 'dircam' }] } }).manual.map(m => [m.source, m.pickup, m.expected]);
  out.pickupDest = M.PICKUP_DEST;
  const pks1 = M.pickupSplit([{ zone: 'fr', source: 'sia', zip: 'export_é.zip', size: 5 }, { zone: 'gb', source: 'nats', zip: 'ok.zip', size: 2 }, { zone: 'x', source: 'sia', zip: 'a[1].zip', size: 1 },
    { zone: 'y', source: 'sia', zip: 'z'.repeat(151), size: 1 }, { zone: 'w', source: 'nats', zip: 'f.zip', size: null }, { zone: 'v', source: 'sia', zip: 'a,b.zip', size: 1 }, null]);
  const pks2 = M.pickupSplit([{ zone: 'fr', source: 'sia', zip: 'a.zip', size: 1 }, { zone: 'fr', source: 'nats', zip: 'é.zip', size: 1 }]);
  out.split = [[pks1.ready.map(t => t.zone), pks1.blocked.map(t => t.zone), pks1.zips, pks1.zones], [pks2.ready.map(t => t.source), pks2.blocked.map(t => t.source), pks2.zips, pks2.zones], M.pickupSplit(null).ready];
  out.refusals = [{ status: 409, reason: 'updating' }, { status: 409 }, { status: 409, reason: 'other' }, { status: 429, reason: 'too-soon', wait: 3 }, { status: 404 }].map(r => M.refusal(r).key);
  const pz = (...t) => M.pickupZips(t);
  out.zips = [
    pz({ zone: 'fr', source: 'sia', zip: 'a.zip', size: 10 }, { zone: 'gb', source: 'nats', zip: 'b b (1).zip', size: 0 }, { zone: 'x', source: 'sia', zip: 'dup.zip', size: 5 }),
    pz({ source: 'other', zip: 'c.zip', size: 1 }, { source: 'nats', zip: '../e.zip', size: 1 }, { source: 'nats', zip: 'a/b.zip', size: 1 }, { source: 'nats', zip: 'd.zip', size: -1 },
      { source: 'nats', zip: 'e.zip', size: 1.5 }, { source: 'nats', zip: 'f.zip' }, { source: 'nats', size: 3 }, null),
    M.pickupZips(null), M.pickupZips('x')];
  const sz = M.pickupOutcome({ state: 'done', result: { ok: false, dry: false, reason: 'partial', taken: [{ zone: 'fr', source: 'sia', zip: 'z.zip', size: 7, files: [], bytes: 1 }],
    failed: [{ zone: 'gb', source: 'nats', error: 'changed', zip: 'n.zip', size: 9 }, { zone: 'fr', source: 'sia', error: 'x' }] } });
  out.sizes = [sz.kind, sz.taken[0].size, sz.failed];
  const rect = [[0, 0], [10, 0], [10, 5], [0, 5], [0, 0]], bx = [0, 0, 10, 5];
  out.approx = [{ rings: [], box: bx }, { box: bx }, { rings: [rect], box: bx }, { rings: [[[0, 0], [10, 0], [10, 5], [0, 5]]], box: bx }, { rings: [[[10, 5], [0, 5], [0, 0], [10, 0], [10, 5]]], box: bx },
    { rings: [[[0, 0], [10, 0], [5, 5], [0, 0]]], box: bx }, { rings: [rect, rect], box: bx }, { rings: [[[0, 0], [9.9, 0], [9.9, 5], [0, 5], [0, 0]]], box: bx }, { rings: [rect] }, { rings: [], box: [0, 0, 'a', 1] }, null,
    { rings: [[[0, 0], [10, 0], [10, 0], [0, 5], [0, 0]]], box: bx }].map(M.isApproxOutline);
  const zm = M.zoneMap([{ id: 'a', rings: [], box: bx }, { id: 'b', rings: [rect], box: bx }, { id: 'c', rings: [[[0, 0], [10, 0], [5, 5], [0, 0]]], box: bx }], 400);
  out.zmApprox = [zm.shapes.map(x => x.approx), zm.shapes[0].d === zm.shapes[1].d && zm.shapes[0].d.length > 10, zm.shapes[2].d === zm.shapes[1].d];
  out.verbOfBase = [{ set: 'base', verb: 'fetch', zones: {} }, { set: 'proc', verb: 'fetch', states: {} }].map(M.viewOp);
  return out;
}"""


@case('L16', 'Données: the other groups\' panels, the pure functions on fixtures (SETS, verbs the launcher knows, grey reason, States, ICAO types, arguments, views and ends, sheets, journal)', 'L',
      tags=('data',), phone=False,
      rule='modules/data/SPEC 5.5 (the same verbs for every set), 6.5 (grey reasons); tools/regen (set/verb contract)')
def l16(c):
    c.page.goto(f'{c.base}/frame/manifest.webmanifest', wait_until='load')
    r = c.js(_L16_JS)
    c.eq(r['sets'], {'base': ['zones', 'zone', 'base', ['fetch', 'build', 'purge'], 'no-zone'], 'proc': ['states', 'state', 'proc', ['fetch', 'build', 'purge'], 'no-state'],
                     'vfr': ['cycle', 'cycle', 'base', ['fetch', 'build', 'purge'], None], 'aircraft': ['codes', 'step', 'aircraft', ['fetch', 'build', 'purge'], None]},
         'SETS: the arguments key, the item noun, the group (the VAC panel lives in the Base group, where its row is), the verbs, the « no item » reason', what='SETS')
    c.eq(r['sheets'], ['aircraft', 'publish', 'sheets'], 'the published sheets are the aircraft set\'s own verb, with their own panel', what='SHEETS')
    c.eq(r['panels'], ['sheets', 'aircraft', 'base', 'base', 'aircraft', 'proc'], 'the panel and the group of an operation', what='panelOf / groupOf')
    old = ['base/fetch', 'base/build', 'base/purge']
    c.eq(r['known'], [old, old, old, old, ['base/build', 'proc/fetch'], old, []],
         'regen/verbs: no answer, a 404 or a refusal, no list, a bad list: an old launcher (base only); a list is kept as « set/verb » names, the others dropped; an empty list is trusted', what='knownVerbs')
    c.eq(r['verbKnown'], [True, False, True, False, 'vfr/purge'], 'an absent list is the old launcher\'s', what='verbKnown')
    off = lambda reason: [reason, {'fetch': reason, 'build': reason, 'purge': reason}]
    c.eq(r['gate'], [
        off('no-launcher'),
        off('unknown-verb'),
        off('no-state'),
        ['unknown-verb', {'fetch': None, 'build': None, 'purge': 'unknown-verb'}],
        off('busy'),
        off('busy'),
        off('offline'),
        [None, {'fetch': None, 'build': None, 'purge': None}],
        off('no-zone'),
        [None, {'fetch': None, 'build': None, 'purge': None}],
        off('unknown-verb'),
        [None, {'publish': None}],
        ['unknown-verb', {'publish': 'unknown-verb'}]],
         'the one reason of a panel: launcher, then verbs all unknown, then busy, offline, no item (States / zones), then a single unknown verb (only its button is grey); aircraft has no item to tick', what='setGate')
    c.eq(r['proc'], [[['K', 'États-Unis', None], ['LF', 'France', 'green']], [['LF', 'Frankreich', 'green'], ['K', 'Vereinigte Staaten', None]],
                     [['K', 'États-Unis', None], ['LF', 'France', None]], [['LF', 'France', None], ['K', 'United States', None]]],
         'the States offered: only those with a bulk source (LF: the SIA\'s eAIP, K: the FAA\'s CIFP), never an EAD State, by name in the language (coverageByState\'s, else the module\'s: the US is not in its table), level or none', what='procItems')
    c.eq(r['codes'], [[['A320', 'B738', 'E190'], []], [[], []], [['A320'], ['B']], [['A320'], ['TOOLONG', '7']], [[], ['A-1']], [[], []], [[], []]],
         'ICAO types: commas or spaces, upper-cased, no duplicate; 2 to 4 letters or digits; the others are refused; an empty field is valid (the fleet\'s types)', what='parseCodes')
    c.eq(r['args'], [{'zones': ['EG', 'LF'], 'personal': ['nats']}, {'zones': ['EG', 'LF'], 'personal': ['nats']}, {'zones': ['EG', 'LF']}, {'states': ['EG', 'LF']}, {'states': ['EG', 'LF']},
                     {'cycle': '2026-10-29'}, {}, {'codes': ['A320']}, {'codes': ['A320']}, {}],
         'the arguments: base zones (+ personal, not for a purge), proc states, vfr cycle (effective date; its purge has none: the caches of all cycles), aircraft codes (none for the purge, which touches the caches only)', what='setArgs')
    c.eq(r['ops'], [{'set': 'proc', 'verb': 'build'}, {'set': 'aircraft', 'verb': 'publish'}, None, {'set': 'base', 'verb': 'build'}, {'set': 'proc', 'verb': 'build'}, None, None, {'set': 'aircraft', 'verb': 'fetch'}],
         'a view is a known set and verb (aircraft/publish too); one without a verb that carries its zones is the base\'s build; an unknown verb or set: none', what='viewOp')
    c.eq(r['verbOfBase'], [{'set': 'base', 'verb': 'fetch'}, {'set': 'proc', 'verb': 'fetch'}], 'a base view is read as before, another set\'s as its own', what='viewOp base and proc')
    c.eq(r['dry'], [True, False, True, False, True, False], 'a plan is a purge or a publish with args.dry true, of any set', what='opDry')
    c.eq(r['baseKept'], True, 'the base\'s view is returned as it is', what='normView base')
    c.eq(r['norm'], [['LF', 'EG'], 'EG', 'LF', ['LF']], 'another set\'s view is brought to the base\'s shape: its items under zones, its failures and manual sources under `zone`', what='normView proc')
    c.eq(r['single'], [[['2026-10-29', 'building']], [['2026-10-29', 'fetching']], [['2026-10-29', 'purging']], [['2026-10-29', 'done']], [['2026-10-29', 'built']],
                       [['2026-10-29', 'failed']], [['2026-10-29', 'cancelled']]],
         'the cycle (one implicit item) takes its state from the job\'s', what='normView vfr')
    c.eq(r['singleOutcome'], ['done', ['2026-10-29']], 'a clean build of the cycle counts the cycle', what='setOutcome vfr')
    steps3 = ['types', 'apd', 'simbrief']
    c.eq(r['aircraft'], [
        ['partial', ['types'], [{'zone': 'apd', 'error': 'exit-2'}], None, None, None, None, None, None],
        ['done', steps3, [], None, None, None, None, None, None],
        ['done', steps3, [], 'ok', None, None, None, None, None],
        ['no-codes', [], [], None, None, None, None, None, None],
        ['no-script', [], [], 'err', None, None, None, None, None],
        ['failed', [], [{'zone': 'types', 'error': 'exit-1'}], None, None, None, None, None, None],
        ['done', None, None, 'ok', 4, 2048, ['*'], 1, False],
        ['done', None, None, 'ok', 0, 0, [], 0, True]],
         'aircraft: `steps` are the steps done, `failed[].item` the step that failed (exit-N kept as written); the reasons no-codes and no-script are kinds of their own; a purge answers one total (files, bytes), not per item',
         what='aircraft outcomes')
    e = r['entry']
    c.eq([e[0]['set'], e[0]['verb'], e[0]['items'], 'zones' in e[0], e[0]['result'], e[0]['built'], e[0]['failed'], e[0]['seconds'], e[0]['job']],
         ['proc', 'build', ['EG', 'LF'], False, 'partial', ['LF'], [{'zone': 'EG', 'error': 'x'}], 3, 'j1'], 'a journal entry of another set: its set, the items under `items`, the same fields as the base\'s', what='setEntry proc build')
    c.eq([e[1]['set'], e[1]['verb'], e[1]['items'], e[1]['fetched']], ['proc', 'download', ['LF'], ['LF']], 'a download is journaled « download » whatever the set', what='setEntry proc fetch')
    c.eq([e[2]['set'], e[2]['verb'], e[2]['items'], e[2]['files'], e[2]['bytes']], ['aircraft', 'purge', [], 4, 2048], 'a purge: files and bytes', what='setEntry aircraft purge')
    c.eq([e[3]['set'], e[3]['verb'], e[3]['zones'], 'items' in e[3]], ['base', 'build', ['fr'], False], 'the base entry is unchanged', what='setEntry base')
    c.eq(r['pickup'], [
        ['done', True, 2, 10, ['fr'], 1, [], 'ok'],
        ['nothing', True, 0, 0, [], 2, [], 'warn'],
        ['partial', False, 2, 10, ['fr'], 0, [{'zone': 'gb', 'source': 'nats', 'error': 'zip over 500 MB'}], 'warn'],
        ['failed', False, 0, 0, [], 0, [{'zone': 'gb', 'source': 'nats', 'error': 'nothing-to-take'}], 'err'],
        ['cancelled', False, 2, 10, ['fr'], 0, [], 'warn'],
        ['interrupted', False, 0, 0, [], 0, [], 'warn'],
        ['nothing', False, 0, 0, [], 0, [], 'warn'],
        ['done', False, 0, 0, ['fr'], 0, [], 'ok']],
         'base/pickup: the plan or the end; taken zips with their files and size, a missing file is no failure (nothing found = « nothing »), failed and partial by the launcher\'s reason, unreadable entries dropped',
         what='pickupOutcome')
    c.eq(r['pickupOp'], [{'set': 'base', 'verb': 'pickup'}, True, False, None], 'a pickup view is a base operation; its plan is a dry run', what='viewOp pickup')
    e = r['pickupEntry']
    c.eq([e['set'], e['verb'], e['zones'], e['result'], e['files'], e['bytes'], e['failed'], e['seconds'], e['job']],
         ['base', 'pickup', ['fr', 'gb'], 'partial', 2, 10, [{'zone': 'gb', 'source': 'nats', 'error': 'zip over 500 MB'}], 2, 'k9'], 'the journal entry of a pickup', what='pickupEntry')
    c.eq(r['manualFlags'], [['sia', True, 'x*.zip'], ['dircam', False, '']], 'a manual source says whether the launcher can take its file, and the name it expects', what='manual flags')
    c.eq(r['zips'], [{'sia': {'name': 'a.zip', 'size': 10}, 'nats': {'name': 'b b (1).zip', 'size': 0}}, {}, {}, {}],
         'the zips for the real run, built from the plan\'s taken entries only: a known source, a plain file name, an integer size; one per source (the first)', what='pickupZips')
    c.eq(r['sizes'], ['partial', 7, [{'zone': 'gb', 'source': 'nats', 'error': 'changed', 'zip': 'n.zip', 'size': 9}, {'zone': 'fr', 'source': 'sia', 'error': 'x'}]],
         'the plan\'s taken entries carry the zip size; a refusal « changed » carries the newest name and size', what='pickup sizes')
    c.eq(r['approx'], [True, True, True, True, True, False, False, False, False, False, False, False],
         'an outline is approximate when it has no ring or its only ring is exactly the box rectangle (closed or not, any order); never from a name; unreadable boxes are not', what='isApproxOutline')
    c.eq(r['zmApprox'], [[True, True, False], True, False], 'the map flags the approximate shapes; a zone without ring is drawn as its frame', what='zoneMap approx')
    c.eq(r['split'], [[['gb'], ['fr', 'x', 'y', 'w', 'v'], {'nats': {'name': 'ok.zip', 'size': 2}}, ['gb']], [['sia'], ['nats'], {'sia': {'name': 'a.zip', 'size': 1}}, []], []],
         'a zip whose name is outside the rule (accent, [, comma, over 150 characters) or without size is NOT ready: it is not run, and neither is a zone that has such a source', what='pickupSplit')
    c.eq(r['refusals'], ['updating', 'busy', 'busy', 'tooSoon', 'unknown-route'], 'a 409 with reason updating is its own refusal; the other 409 stays « busy »', what='refusal updating')
    c.eq(r['pickupDest'], {'sia': 'data/sia/', 'nats': 'data/sia/zones/gb/'}, 'where the raw files go, as the launcher writes them', what='PICKUP_DEST')
    c.eq(r['argsProc'], [{'states': ['K', 'LF']}, {'states': ['K']}], 'proc: the States sent are sorted and unique (the launcher takes one or two, « K » before « LF »)', what='setArgs proc')
    c.eq(r['procBuild'], [['partial', ['K'], [{'zone': 'LF', 'error': 'no-cache'}]], ['done', ['LF'], []], ['merge-pending', [], []]],
         'proc/build: built is { State: aerodromes } (a State with none is not built), the failures name the State, no-cache per State; merge-pending is a kind of its own', what='proc build')
    c.eq(r['procFetch'], [['done', {'fetched': 12, 'unchanged': 3}, []], ['partial', {'fetched': 5, 'unchanged': 0}, [{'zone': 'LF', 'source': None, 'error': 'not-a-zip'}]], ['done', None, []]],
         'proc/fetch: fetched and unchanged are numbers of aerodromes (counts), or lists of States as before; one State failing is a partial end', what='proc fetch')
    c.eq(r['merge'], ['merge-pending', 'merge-pending', 'merge-pending', ['merge-pending', 'err'], 'merge-pending'],
         'merge-pending (nothing written while a merge waits in data/) is one end for every set: base, vfr, proc, the sheets; the journal keeps it as the reason', what='merge-pending')
    c.eq(r['chainOrder'], [['base', 'proc', 'vfr', 'aircraft'], ['fetch', 'build']], 'the chain: the published order (SPEC 4.5), download then build; never a purge, never aircraft/publish', what='CHAIN')
    c.eq(r['verdict'], ['ok', 'nothing', 'nothing', 'stop', 'stop', 'ok', 'stop', 'stop', 'stop', 'stop', 'stop'],
         'a job\'s end: done goes on; a download with nothing new (nothing, not-published) goes on; anything else stops (partial, cancelled, merge-pending, no-cache, an unreadable end)', what='chainVerdict')
    c.eq([r['stale'], r['staleNone']], [{'base': '2609', 'proc': None}, [{'base': None, 'proc': None}] * 2], 'the groups whose published cycle is gone by (the oldest one, rows and « autres jeux »); the aircraft group is not concerned', what='staleGroups')
    c.eq(r['jset'], [['done', 'y'], ['a', 'b', 'd'], ['b', 'e']], 'the journal replaces the entry of the same job (the chain\'s end replaces its start), else appends, bounded', what='journalSet')
    c.eq(r['chainEntry'], {'at': '2026-10-30T10:00:00.000Z', 'set': 'all', 'verb': 'update', 'items': [{'set': 'base', 'result': 'done'}, {'set': 'proc', 'result': 'skipped'}], 'seconds': 13, 'result': 'failed', 'job': 'chain-1'},
         'the chain\'s journal entry: set all, verb update, each set\'s result', what='chainEntry')
    c.eq(r['open'], ['b', None, None], 'a start marker without its end is the last « running » entry of the chain', what='openChain')
    c.eq(r['vfrView'], [[['2026-10-29', 'built']], [['2026-10-29', 'done']], [['2026-10-29', 'building']], [['2026-10-29', 'failed']]],
         'the cycle\'s entry of the view (`cycles`) as the launcher gives it: « done » of a build is a built cycle', what='normView vfr cycles')
    cnt = lambda f, u, n: {'fetched': f, 'unchanged': u, 'notPublished': n}
    c.eq(r['vfrFetch'], [
        ['done', cnt(12, 25, 3), [], 'warn'],
        ['done', cnt(40, 0, 0), [], 'ok'],
        ['partial', cnt(5, 0, 1), [{'zone': 'LFPG', 'error': 'http-500'}], 'warn'],
        ['failed', cnt(0, 0, 0), [{'zone': 'LFPG', 'error': 'URLError'}], 'err'],
        ['not-published', cnt(0, 0, 40), [], 'warn'],
        ['no-base', cnt(0, 0, 0), [], 'err'],
        ['cancelled', cnt(2, 0, 0), [], 'warn'],
        ['done', cnt(1, 2, 0), [], 'ok']],
         'vfr/fetch: the numbers of charts (or the lengths of lists); a chart not published is counted apart and is no failure (amber); the reasons no-base, not-published, partial, failed, cancelled are kinds', what='vfrFetchOutcome')
    c.eq(r['vfrBuild'], [
        ['done', ['2026-10-29'], [], 'abc1234', False],
        ['done', ['2026-10-29'], [], None, True],
        ['no-pypdf', [], [], None, False],
        ['no-cache', [], [], None, False],
        ['invalid', [], [{'zone': 'plan', 'error': 'bad point'}], None, False],
        ['failed', [], [{'zone': 'LFPG', 'error': 'unreadable'}], None, False],
        ['cancelled', [], [], None, False]],
         'vfr/build: no-pypdf, no-cache and invalid are kinds of their own (invalid lists the plan\'s problems); a clean build without a commit (no trigram) is flagged noCommit', what='vfr build outcomes')
    c.eq(r['vfrPurge'], [['done', 6, 3072, ['*'], 2, 1], ['done', 0, 0, [], 0, 0]], 'vfr/purge answers one total; unsafe-path and kept-tracked are counted', what='vfr purge outcome')
    c.eq([r['vfrEntry']['set'], r['vfrEntry']['verb'], r['vfrEntry']['items'], r['vfrEntry']['counts']], ['vfr', 'download', ['2026-10-29'], cnt(12, 25, 3)], 'the journal entry of a chart download carries the counts', what='setEntry vfr')
    c.eq(r['plan'], [[1, 2, 60, 1, 2], [0, 1, 5, 0, 1], [0, 0, 0, 0, 0], [0, 3, 0, 0, 0]],
         'the sheets plan: what to remove and copy (from `result` or `result.plan`), counts, the total size', what='sheetsPlan')
    c.eq(r['sheetsEnd'], [['done', 2, 1, False, 'ok'], ['done', 0, 0, True, 'ok'], ['no-author', 0, 0, False, 'err'], ['cancelled', 0, 0, False, 'warn'], ['interrupted', 0, 0, False, 'warn'],
                          ['failed', 0, 0, False, 'err'], ['done', 4, 2, False, 'ok']],
         'the end of a sheets publication: done (counts of the lists, or of copied / removed), nothing to do, no trigram, stopped, interrupted, failed', what='sheetsOutcome')
    c.eq({k: v for k, v in r['sheetsEntry'].items()}, {'at': '2026-10-30T10:00:00.000Z', 'set': 'aircraft', 'verb': 'publish', 'items': [], 'seconds': 4, 'result': 'done', 'copied': 2, 'removed': 1, 'job': 'j5'},
         'the journal entry of the sheets', what='sheetsEntry')
    c.check_errors()


# ------------------------------------------------------------------------------------------------------ L17
BASE3 = ['base/fetch', 'base/build', 'base/purge']
PROC3 = ['proc/fetch', 'proc/build', 'proc/purge']
VFR3 = ['vfr/fetch', 'vfr/build', 'vfr/purge']
AC3 = ['aircraft/fetch', 'aircraft/build', 'aircraft/purge']
ALL_VERBS = BASE3 + PROC3 + VFR3 + AC3 + ['aircraft/publish']


def _sview(set_, verb, key, items, state='running', step='', done=0, total=2, result=None, jid='j1', args=None, unit=None):
    """The view of a job of any set as the launcher gives it: set and verb say which job it is, the items sit at the root under `key`."""
    v = _view(state, step=step, done=done, total=total, zones={}, result=result, jid=jid)
    v.pop('zones')
    v.update({'set': set_, 'verb': verb, 'args': args or {}})
    if key:
        v[key] = items
    if unit:
        v['unit'] = unit
    return v


def _pv(c, panel):
    """The verb buttons of a panel (`[data-set-panel=…]`), each with ':off' when grey."""
    return c.js("(p) => [...document.querySelectorAll('[data-set-panel=' + p + '] [data-verb]')].filter(b => b.dataset.verb !== 'stop').map(b => b.dataset.verb + (b.disabled ? ':off' : ''))", panel)


def _preasons(c, panel):
    """The reasons written under a panel: their keys (one expected at most)."""
    return c.js("(p) => [...document.querySelectorAll('[data-set-panel=' + p + '] [data-reason]')].map(e => e.dataset.reason)", panel)


def _panels_ok(c, what):
    """No horizontal scroll, nothing beyond the right edge, 44 px on the buttons, the checkbox lines and the field of every panel."""
    m = c.js("""() => { const ps = [...document.querySelectorAll('[data-set-panel]')];
      return { sw: document.documentElement.scrollWidth, iw: window.innerWidth,
      over: ps.flatMap(b => [...b.querySelectorAll('*')].filter(e => e.getBoundingClientRect().width && e.getBoundingClientRect().right > window.innerWidth + 1)).slice(0, 3).map(e => e.tagName + '.' + e.className),
      hs: ps.flatMap(b => [...b.querySelectorAll('button, label.d-opt, input[type=text]')].map(e => Math.round(e.getBoundingClientRect().height))) } }""")
    c.le(m['sw'], m['iw'], f'{what}: no horizontal scroll', what='scrollWidth')
    c.ok(not m['over'], m['over'], f'{what}: nothing beyond the right edge')
    c.ge(min(m['hs']), 44, f'{what}: buttons, checkbox lines and the field are 44 px', what='touch height')


def _all_open(c):
    """Opens every group (a closed `details` has no visible button): the panels sit in their groups, which open by themselves only when a row needs attention."""
    c.js("() => document.querySelectorAll('details.f-group').forEach(g => { g.open = true })")


def _line(c, sel):
    """The text of an element, spaces normalised."""
    return norm(c.text(sel))


@case('L17', 'Données: the other groups\' panels against a fake launcher (regen/verbs, proc build and purge, VAC and aircraft grey, one operation at a time, aircraft field and steps, sheets plan then copy, resume)',
      'L', tags=('data',), langs4=True, designs=('standard',),
      rule='modules/data/SPEC 3 (one operation at a time, plan before change), 5.5, 6.5; launcher regen/verbs and regen/job { set, verb } (tools/regen)')
def l17(c):
    lang = c.lang
    li = {'fr': 0, 'en': 1, 'de': 2, 'es': 3}[lang]
    T = lambda key, after=None, row=0: _trow(key, lang, after, row)
    label = lambda s: T(s, 'setLabel: {')
    sm = lambda key: T(key, 'setSum: {')
    cfg, _ = _fixture()
    K_NAMES = [['États-Unis', 'United States', 'Vereinigte Staaten', 'Estados Unidos'][i] for i in range(4)]
    name = lambda p: K_NAMES[li] if p == 'K' else cfg['states'][p]['names'][li]
    SORTED = ['K', 'LF']   # what is sent: sorted prefixes
    ORDER = {'fr': ['K', 'LF'], 'en': ['LF', 'K'], 'de': ['LF', 'K'], 'es': ['K', 'LF']}[lang]   # the States in the order of their names in the language
    _, cur, _, _ = _cycles()
    # ---- A: a launcher that knows base and proc only: the Procédures panel is live, VAC and aircraft grey with the reason written once
    run1 = _sview('proc', 'build', 'states', {'K': _zs('building', 1, 3), 'LF': _zs('waiting')}, step='État K', done=0, unit='states')
    end1 = _sview('proc', 'build', 'states', {'K': _zs('built', 3, 3), 'LF': _zs('failed', 2, 2, error='no-cache')}, state='done', step='Terminé', done=2, unit='states',
                  result={'ok': False, 'cycle': '2026-10-29', 'built': {'K': 12}, 'commits': {'K': 'abc1234'}, 'failed': [{'state': 'LF', 'error': 'no-cache'}], 'reason': 'partial'})
    st = _launcher(c, [run1, run1, end1], verbs=BASE3 + PROC3)
    _open(c, cfg)
    _all_open(c)
    c.eq(st['verbs_calls'], 1, 'regen/verbs is read once, at mount', what='verbs calls')
    c.eq(_verbs(c), ['download', 'build', 'purge'], 'the base panel is unchanged and live', what='base verbs')
    c.eq(c.js("[...document.querySelectorAll('[data-set-panel]')].map(p => p.dataset.setPanel)"), ['vfr', 'proc', 'aircraft', 'sheets'],
         'a panel per group: points VFR in the Base group (where its row is), Procédures, Appareils and its published sheets', what='panels')
    c.eq(c.js("[...document.querySelectorAll('[data-set-panel]')].map(p => p.closest('details.f-group').dataset.group)"), ['base', 'proc', 'aircraft', 'aircraft'], 'in their groups', what='panel groups')
    c.eq(c.count('details[data-group=weather] [data-set-panel]'), 0, 'the weather has no panel (published with the site)', what='weather')
    for panel in ('vfr', 'aircraft'):
        c.eq([_pv(c, panel), _preasons(c, panel), _line(c, f'[data-set-panel={panel}] [data-reason]')], [['download:off', 'build:off', 'purge:off'], ['unknown-verb'], norm(T('unknown-verb', 'greyReason: {'))],
             f'{panel}: the launcher does not know its verbs: grey, the reason written once', what=f'{panel} grey')
    c.eq([_pv(c, 'sheets'), _preasons(c, 'sheets')], [['publish-sheets:off'], ['unknown-verb']], 'the published sheets: grey too', what='sheets grey')
    c.eq(_line(c, '[data-set-panel=vfr] [data-item-cycle]'), norm(T('cycle').replace('{c}', _name(cur))), 'the VAC panel names the cycle in force (no checkbox)', what='cycle')
    c.eq(c.count('[data-set-panel=vfr] input'), 0, 'no checkbox for the one implicit item', what='vfr items')
    ids = c.js("[...document.querySelectorAll('[data-set-panel=proc] [data-item]')].map(i => i.dataset.item).sort()")
    c.eq(ids, ['K', 'LF'], 'the States offered: those with a bulk source (France: the SIA\'s eAIP, the US: the FAA\'s CIFP); the EAD States are never listed', what='proc items')
    c.eq(c.js("[...document.querySelectorAll('[data-set-panel=proc] [data-item]')].map(i => i.checked)"), [False] * 2, 'none ticked by default', what='proc ticked')
    c.eq(_line(c, '[data-set-panel=proc] [data-ead-note]'), norm(T('eadNote')), 'the line about the States read by EAD Basic, one aerodrome at a time', what='ead note')
    c.eq(c.text('[data-set-panel=proc] label.d-opt:has([data-item=LF]) span'), name('LF'), 'named in the language', what='proc name')
    c.eq([_pv(c, 'proc'), _preasons(c, 'proc'), _line(c, '[data-set-panel=proc] [data-reason]')], [['download:off', 'build:off', 'purge:off'], ['no-state'], norm(T('no-state', 'greyReason: {'))],
         'no State ticked: grey, « Cochez au moins un État »', what='proc no state')
    _panels_ok(c, 'at the opening')
    c.tap('[data-set-panel=proc] [data-item=LF]')
    c.tap('[data-set-panel=proc] [data-item=K]')
    c.eq([_pv(c, 'proc'), _preasons(c, 'proc')], [['download', 'build', 'purge'], []], 'two States ticked: live', what='proc live')
    c.tap('[data-set-panel=proc] [data-verb=build]')
    c.until("!!document.querySelector('[data-set-panel=proc] [data-running][data-run-set=proc]')", what='the running bar is in the Procédures panel')
    c.eq(len(st['posts']), 1, 'one start', what='posts')
    c.eq({k: st['posts'][0][k] for k in ('set', 'verb', 'args', 'author')}, {'set': 'proc', 'verb': 'build', 'args': {'states': SORTED}, 'author': 'ABC'},
         'the body: set proc, verb build, the ticked States (prefixes, in the order shown)', what='body')
    c.eq(c.count('[data-build] [data-running]'), 0, 'the base panel shows nothing of it', what='base panel')
    c.eq([_verbs(c), _preasons(c, 'proc'), c.attr('[data-build] [data-reason]', 'data-reason')], [['download:off', 'build:off', 'purge:off'], ['busy'], 'busy'],
         'one operation at a time across panels: the base is grey while a proc job runs, « Une autre opération est en cours »', what='base grey')
    c.eq(c.js("[...document.querySelectorAll('[data-set-panel=proc] input')].every(i => i.disabled)"), True, 'the States are frozen while it runs', what='frozen')
    c.until("document.querySelector('[data-set-panel=proc] [data-item-state=K]')?.dataset.state === 'building'", timeout=8000, what='K is building')
    c.eq(_line(c, '[data-set-panel=proc] [data-item-state=K]'), norm(f"{name('K')} : {T('buildingP', 'zoneState: {').replace('{n}', '1').replace('{m}', '3')}"), 'a line per State, with (n / m) and no noun (the launcher counts aerodromes, not sources)', what='K line')
    c.eq(_line(c, '[data-set-panel=proc] [data-running] [data-count]'), norm(T('runCount').replace('{n}', f"0 {_unit('state', lang, 2)}").replace('{m}', '2')), 'the count, in States', what='count')
    _panels_ok(c, 'a proc job running')
    c.until("!!document.querySelector('[data-set-panel=proc] [data-build-result]')", timeout=10000, what='the end of the job')
    unit_state = lambda n: f"{n} {_unit('state', lang, n)}"
    want = sm('buildPartial').replace('{s}', label('proc')).replace('{built}', unit_state(1)).replace('{failed}', '1').replace('{items}', name('LF'))
    c.eq([c.attr('[data-set-panel=proc] [data-build-result]', 'data-result'), _line(c, '[data-set-panel=proc] [data-build-result] b')], ['partial', norm(want)],
         'the summary of the set: « Procédures : construction terminée (1 État) ; 1 en échec (France) »', what='summary')
    c.eq(_line(c, '[data-set-panel=proc] [data-advice]'), norm(T('partial', 'setAdvice: {')), 'what to do', what='advice')
    c.eq(_line(c, '[data-set-panel=proc] [data-item-state=LF]'), norm(f"{name('LF')} : {T('failed', 'zoneState: {').replace('{r}', T('no-cache', 'itemError: {'))}"),
         'the failed State says why: « téléchargez d\'abord » (no-cache, per State)', what='LF line')
    c.eq(len(_notes_with(c, want)), 1, 'ONE notification', what='notification')
    c.eq([_verbs(c), _pv(c, 'proc')], [['download', 'build', 'purge']] * 2, 'the buttons are live again', what='live again')
    doc = c.until_doc('cache/data/journal.json', lambda d: bool(d and d.get('ops')), what='the journal is written')
    e = doc['ops'][-1]
    c.eq([e['set'], e['verb'], e['items'], e['result'], e['built'], e['failed']], ['proc', 'build', ORDER, 'partial', ['K'], [{'zone': 'LF', 'error': 'no-cache'}]],
         'the journal entry carries set and verb, the States under `items`', what='journal entry')
    op = c.js("[...document.querySelectorAll('[data-journal] [data-op]')].map(o => [o.dataset.opSet, o.dataset.opVerb, o.textContent.replace(/\\s+/g, ' ').trim()])")
    c.ok(len(op) == 1 and op[0][:2] == ['proc', 'build'] and norm(label('proc')) in norm(op[0][2]) and name('K') in op[0][2], op, 'the journal line says the set, the verb and the States')
    # ---- B: purge: dry first, ONE question with the plan, the real run says dry false; nothing committed is said in the help
    rem0 = {'K': {'files': 3, 'bytes': 1024}, 'LF': {'files': 2, 'bytes': 2048}}
    rem = {k: rem0[k] for k in ORDER}
    pst = {k: {'state': 'done', **rem0[k]} for k in ORDER}
    warn = [{'code': 'kept-tracked', 'count': 1}]
    dry = _sview('proc', 'purge', 'states', pst, state='done', done=2, jid='d1',
                 args={'states': SORTED, 'dry': True}, result={'ok': True, 'dry': True, 'removed': rem, 'warnings': warn})
    real = _sview('proc', 'purge', 'states', pst, state='done', done=2, jid='p1',
                  args={'states': SORTED, 'dry': False}, result={'ok': True, 'dry': False, 'removed': rem, 'warnings': warn})
    st['views'], st['i'], st['start'] = [dry, real], 0, (200, {'job': 'd1'})
    posts = len(st['posts'])
    c.tap('[data-set-panel=proc] [data-verb=purge]')
    q = _ask_text(c)
    ask = ' '.join([T('purgeAskSet').replace('{n}', f'5 {FILES[lang][1]}').replace('{s}', _size(3072, lang)).replace('{z}', ', '.join(name(k) for k in ORDER)), T('purgeKept', None, 0).replace('{n}', '1')])
    c.eq([norm(q['text']), norm(q['ok']), q['no'], len(st['posts']) - posts], [norm(ask), norm(T('purge')), True, 1], 'ONE question from the plan: files, size, the States, the files kept by git; only the plan was started', what='question')
    c.eq({k: st['posts'][-1][k] for k in ('set', 'verb', 'args')}, {'set': 'proc', 'verb': 'purge', 'args': {'states': SORTED, 'dry': True}}, 'the plan is a dry run', what='dry body')
    c.eq([_verbs(c), _pv(c, 'proc'), _pv(c, 'aircraft')], [['download:off', 'build:off', 'purge:off']] * 2 + [['download:off', 'build:off', 'purge:off']], 'every panel is grey while the question is open', what='during the question')
    c.tap('.f-modal [data-no]')
    c.until("!document.querySelector('.f-modal')", what='the window closes')
    c.wait(400)
    c.eq([len(st['posts']) - posts, c.count('[data-set-panel=proc] [data-build-result]'), _pv(c, 'proc')], [1, 0, ['download', 'build', 'purge']], 'No: nothing more is sent, nothing is said, the buttons are live', what='after No')
    st['views'], st['i'], st['start'] = [dry, real], 0, (200, {'job': 'd1'})
    c.tap('[data-set-panel=proc] [data-verb=purge]')
    _ask_text(c)
    st['start'] = (200, {'job': 'p1'})
    c.tap('.f-modal [data-ok]')
    c.until("!!document.querySelector('[data-set-panel=proc] [data-build-result][data-op=purge][data-result=done]')", timeout=10000, what='the end of the purge')
    c.eq({k: st['posts'][-1][k] for k in ('set', 'verb', 'args')}, {'set': 'proc', 'verb': 'purge', 'args': {'states': SORTED, 'dry': False}}, 'the real run says dry false', what='real body')
    done = T('purgeDone').replace('{n}', f'5 {FILES[lang][1]}').replace('{s}', _size(3072, lang))
    c.eq([_line(c, '[data-set-panel=proc] [data-build-result] b'), len(_notes_with(c, done))], [norm(done), 1], 'the end: « Purgé : 5 fichiers, 3,0 Ko », one notification', what='purge end')
    c.eq(len([o for o in c.doc('cache/data/journal.json')['ops'] if o['verb'] == 'purge']), 1, 'ONE journal entry: the real run only', what='journal purge')
    # ---- C: an older launcher (404 on regen/verbs): the base only
    st2 = _launcher(c, [], verbs=404)
    c.page.reload(wait_until='load')
    _head(c)
    _all_open(c)
    c.eq(st2['verbs_calls'], 1, 'regen/verbs asked again at the next mount', what='verbs calls')
    c.eq([_verbs(c), _pv(c, 'proc'), _pv(c, 'vfr'), _pv(c, 'aircraft'), _pv(c, 'sheets')],
         [['download', 'build', 'purge'], ['download:off', 'build:off', 'purge:off'], ['download:off', 'build:off', 'purge:off'], ['download:off', 'build:off', 'purge:off'], ['publish-sheets:off']],
         'a 404: an old launcher: only base/fetch, base/build and base/purge are live', what='old launcher')
    c.eq(_preasons(c, 'proc'), ['unknown-verb'], 'the reason is the one about the launcher, not the States (nothing helps ticking them)', what='proc reason')
    # ---- D: a launcher that knows everything: a running job greys every panel; the aircraft field; steps; reasons
    steps_run = {'types': {'state': 'building'}, 'apd': {'state': 'waiting'}, 'simbrief': {'state': 'waiting'}}  # the launcher's steps carry a state (and an error), no n / m
    steps_end = {'types': {'state': 'built'}, 'apd': {'state': 'failed', 'error': 'exit-2'}, 'simbrief': {'state': 'waiting'}}
    a_run = _sview('aircraft', 'build', 'steps', steps_run, step='types', done=0, total=3, unit='steps', jid='a1')
    a_end = _sview('aircraft', 'build', 'steps', steps_end, state='done', step='Terminé', done=3, total=3, unit='steps', jid='a1',
                   result={'ok': False, 'codes': ['A320', 'B738'], 'steps': ['types'], 'failed': [{'item': 'apd', 'error': 'exit-2'}], 'commit': None, 'reason': 'partial'})
    st3 = _launcher(c, [a_run, a_run, a_end], verbs=ALL_VERBS, start=(200, {'job': 'a1'}))
    c.page.reload(wait_until='load')
    _head(c)
    _all_open(c)
    c.eq([_verbs(c), _pv(c, 'proc'), _pv(c, 'vfr'), _pv(c, 'aircraft'), _pv(c, 'sheets')],
         [['download', 'build', 'purge'], ['download:off', 'build:off', 'purge:off'], ['download', 'build', 'purge'], ['download', 'build', 'purge'], ['publish-sheets']],
         'every verb known: all live (the States still to tick)', what='all known')
    c.eq(_line(c, '[data-set-panel=aircraft] [data-hint]'), norm(T('aircraftHint')), 'the panel says that Construire commits nothing (AircraftDB is not versioned)', what='aircraft hint')
    c.page.fill('[data-set-panel=aircraft] [data-f=codes]', 'a320 zzzzz')
    c.tap('[data-set-panel=aircraft] [data-verb=build]')
    c.until("!!document.querySelector('[data-set-panel=aircraft] [data-codes-error]')", what='the refused code is said')
    bad = T('codesBad').replace('{c}', 'ZZZZZ')
    c.eq([_line(c, '[data-set-panel=aircraft] [data-codes-error]'), len(st3['posts']), len(_notes_with(c, bad))], [norm(bad), 0, 1], 'an invalid ICAO code: refused with a message, no call', what='bad code')
    c.eq(c.js("document.querySelector('[data-set-panel=aircraft] [data-f=codes]').value"), 'a320 zzzzz', 'the field keeps what was typed', what='field value')
    c.page.fill('[data-set-panel=aircraft] [data-f=codes]', 'a320, b738')
    c.eq(c.count('[data-codes-error]'), 0, 'typing again clears the warning', what='warning cleared')
    c.tap('[data-set-panel=aircraft] [data-verb=build]')
    c.until("!!document.querySelector('[data-set-panel=aircraft] [data-running][data-run-set=aircraft]')", what='the aircraft job runs in its panel')
    c.eq({k: st3['posts'][0][k] for k in ('set', 'verb', 'args')}, {'set': 'aircraft', 'verb': 'build', 'args': {'codes': ['A320', 'B738']}}, 'the body: the types, upper-cased', what='aircraft body')
    c.eq([_verbs(c), _pv(c, 'proc'), _pv(c, 'vfr'), _pv(c, 'sheets'), _preasons(c, 'vfr')], [['download:off', 'build:off', 'purge:off'], ['download:off', 'build:off', 'purge:off'],
                                                                                          ['download:off', 'build:off', 'purge:off'], ['publish-sheets:off'], ['busy']],
         'one operation at a time: every other panel is grey while it runs', what='all grey')
    c.eq(c.js("document.querySelector('[data-set-panel=aircraft] [data-f=codes]').disabled"), True, 'the field is frozen', what='field frozen')
    c.eq(c.js("[...document.querySelectorAll('[data-set-panel=aircraft] [data-running] [data-item-state]')].map(l => l.dataset.itemState)"), ['types', 'apd', 'simbrief'], 'the lines are the three steps, not the types', what='step lines')
    c.until("document.querySelector('[data-set-panel=aircraft] [data-item-state=types]')?.dataset.state === 'building'", timeout=8000, what='the types step is running')
    c.eq(_line(c, '[data-set-panel=aircraft] [data-item-state=types]'), norm(f"{T('types', 'stepName: {')} : {T('building', 'zoneState: {')}"), 'a step line, named in the language', what='step line')
    c.until("!!document.querySelector('[data-set-panel=aircraft] [data-build-result]')", timeout=10000, what='the end of the job')
    want = sm('buildPartial').replace('{s}', label('aircraft')).replace('{built}', f"1 {_unit('step', lang, 1)}").replace('{failed}', '1').replace('{items}', T('apd', 'stepName: {'))
    c.eq(_line(c, '[data-set-panel=aircraft] [data-build-result] b'), norm(want), 'the summary counts steps; the failed step is named', what='aircraft summary')
    c.eq(_line(c, '[data-set-panel=aircraft] [data-item-state=apd]'), norm(f"{T('apd', 'stepName: {')} : {T('failed', 'zoneState: {').replace('{r}', 'exit-2')}"), 'its failure: exit-2 as written', what='apd line')
    # the field empty: codes [] (the fleet's types); a launcher reason says what to do
    c.page.fill('[data-set-panel=aircraft] [data-f=codes]', '')
    nocodes = _sview('aircraft', 'fetch', 'steps', {}, state='error', jid='a2', done=0, total=3, unit='steps',
                     result={'ok': False, 'codes': [], 'steps': [], 'failed': [], 'commit': None, 'reason': 'no-codes'})
    st3['views'], st3['i'], st3['start'] = [nocodes], 0, (200, {'job': 'a2'})
    c.tap('[data-set-panel=aircraft] [data-verb=download]')
    c.until("document.querySelector('[data-set-panel=aircraft] [data-build-result]')?.dataset.result === 'no-codes'", timeout=8000, what='no-codes is said')
    c.eq({k: st3['posts'][-1][k] for k in ('set', 'verb', 'args')}, {'set': 'aircraft', 'verb': 'fetch', 'args': {'codes': []}}, 'an empty field sends codes [] (the fleet\'s types)', what='empty body')
    c.eq([_line(c, '[data-set-panel=aircraft] [data-build-result] b'), c.count('[data-set-panel=aircraft] [data-item-state]')], [norm(sm('noCodes').replace('{s}', label('aircraft'))), 0], 'one sentence, no step lines', what='no-codes')
    # aircraft purge: dry {dry:true} only, one total (not per item), then the real run
    p_dry = _sview('aircraft', 'purge', None, None, state='done', jid='a3', args={'dry': True}, result={'ok': True, 'dry': True, 'removed': {'files': 4, 'bytes': 2048}, 'warnings': []})
    p_real = _sview('aircraft', 'purge', None, None, state='done', jid='a4', args={'dry': False}, result={'ok': True, 'dry': False, 'removed': {'files': 4, 'bytes': 2048}, 'warnings': []})
    st3['views'], st3['i'], st3['start'] = [p_dry, p_real], 0, (200, {'job': 'a3'})
    c.tap('[data-set-panel=aircraft] [data-verb=purge]')
    q = _ask_text(c)
    c.eq([norm(q['text']), st3['posts'][-1]['args']], [norm(T('purgeAskSet').replace('{n}', f'4 {FILES[lang][1]}').replace('{s}', _size(2048, lang)).replace('{z}', label('aircraft'))), {'dry': True}],
         'the plan: the caches only, no types sent; one question', what='aircraft purge ask')
    st3['start'] = (200, {'job': 'a4'})
    c.tap('.f-modal [data-ok]')
    c.until("!!document.querySelector('[data-set-panel=aircraft] [data-build-result][data-op=purge]')", timeout=10000, what='the purge ends')
    c.eq(st3['posts'][-1]['args'], {'dry': False}, 'the real run: dry false', what='aircraft real purge')
    # ---- E: the published sheets: plan, one question with the counts and the size, then the real run
    R = {'ok': True, 'dry': True, 'remove': [{'path': 'a', 'size': 1024}], 'copy': [{'path': 'b', 'size': 2048}, {'path': 'c', 'size': 1024}], 'message': ''}
    s_dry = _sview('aircraft', 'publish', None, None, state='done', jid='s1', args={'dry': True}, result=R)
    s_real = _sview('aircraft', 'publish', None, None, state='done', jid='s2', args={'dry': False}, result={**R, 'dry': False})
    st3['views'], st3['i'], st3['start'] = [s_dry, s_real], 0, (200, {'job': 's1'})
    n = len(st3['posts'])
    c.tap('[data-set-panel=sheets] [data-verb=publish-sheets]')
    q = _ask_text(c)
    ask = T('sheetsAsk').replace('{c}', f"2 {_unit('sheet', lang, 2)}").replace('{r}', f"1 {_unit('sheet', lang, 1)}").replace('{s}', _size(4096, lang))
    c.eq([norm(q['text']), norm(q['ok']), len(st3['posts']) - n, st3['posts'][-1]['args']], [norm(ask), norm(T('publish')), 1, {'dry': True}], 'the plan (dry true sent explicitly), ONE question: the counts and the total size', what='sheets ask')
    c.tap('.f-modal [data-no]')
    c.until("!document.querySelector('.f-modal')", what='the window closes')
    c.wait(300)
    c.eq([len(st3['posts']) - n, c.count('[data-set-panel=sheets] [data-build-result]')], [1, 0], 'No: nothing copied, nothing said', what='sheets No')
    st3['views'], st3['i'], st3['start'] = [s_dry, s_real], 0, (200, {'job': 's1'})
    c.tap('[data-set-panel=sheets] [data-verb=publish-sheets]')
    _ask_text(c)
    st3['start'] = (200, {'job': 's2'})
    c.tap('.f-modal [data-ok]')
    c.until("!!document.querySelector('[data-set-panel=sheets] [data-build-result][data-op=publish]')", timeout=10000, what='the end of the publication')
    c.eq(st3['posts'][-1]['args'], {'dry': False}, 'the real run says dry false', what='sheets real body')
    done = T('sheetsDone').replace('{c}', f"2 {_unit('sheet', lang, 2)}").replace('{r}', f"1 {_unit('sheet', lang, 1)}")
    c.eq([_line(c, '[data-set-panel=sheets] [data-build-result] b'), len(_notes_with(c, done))], [norm(done), 1], 'the end: the counts, one notification', what='sheets end')
    j = [o for o in c.doc('cache/data/journal.json')['ops'] if o['verb'] == 'publish' and o.get('set') == 'aircraft']
    c.eq([[o['copied'], o['removed'], o['result']] for o in j], [[2, 1, 'done']], 'ONE journal entry (the real run)', what='sheets journal')
    # no trigram: the launcher says so, a sentence
    s_noauth = _sview('aircraft', 'publish', None, None, state='error', jid='s4', args={'dry': False}, result={'ok': False, 'reason': 'no-author'})
    st3['views'], st3['i'], st3['start'] = [s_dry, s_noauth], 0, (200, {'job': 's1'})
    c.tap('[data-set-panel=sheets] [data-verb=publish-sheets]')
    _ask_text(c)
    st3['start'] = (200, {'job': 's4'})
    c.tap('.f-modal [data-ok]')
    c.until("document.querySelector('[data-set-panel=sheets] [data-build-result]')?.dataset.result === 'no-author'", timeout=10000, what='no trigram is said')
    c.eq(_line(c, '[data-set-panel=sheets] [data-build-result] b'), norm(T('sheetsNoAuthor')), 'a sentence: set your trigram', what='no-author')
    # a suite update in progress refuses the start (409 updating): said in the panel, no question, the button stays live
    st3['start'] = (409, {'reason': 'updating', 'message': 'no job starts now (updating)'})
    n = len(st3['posts'])
    c.tap('[data-set-panel=sheets] [data-verb=publish-sheets]')
    c.until("!!document.querySelector('[data-set-panel=sheets] [data-build-result][data-refusal=updating]')", timeout=8000, what='the refusal is said')
    c.eq([_line(c, '[data-set-panel=sheets] [data-build-result]'), c.count('.f-modal'), len(st3['posts']) - n, _pv(c, 'sheets')], [norm(T('updating', 'refused: {')), 0, 1, ['publish-sheets']],
         'sheets: « Mise à jour de la suite en cours… », no question, the button stays live', what='sheets updating')
    st3['start'] = (200, {'job': 's5'})
    # nothing to publish: no question
    s_none = _sview('aircraft', 'publish', None, None, state='done', jid='s5', args={'dry': True}, result={'ok': True, 'dry': True, 'remove': [], 'copy': [], 'message': ''})
    st3['views'], st3['i'], st3['start'] = [s_none], 0, (200, {'job': 's5'})
    n = len(st3['posts'])
    c.tap('[data-set-panel=sheets] [data-verb=publish-sheets]')
    c.until("document.querySelector('[data-set-panel=sheets] [data-build-result]')?.dataset.result === 'nothing'", timeout=8000, what='nothing to publish is said')
    c.eq([_line(c, '[data-set-panel=sheets] [data-build-result] b'), c.count('.f-modal'), len(st3['posts']) - n], [norm(T('sheetsNothing')), 0, 1], 'an empty plan: the sentence, no question, no second job', what='sheets nothing')
    _panels_ok(c, 'at the end')
    # ---- F: a running job of another set found at mount is followed in its own panel
    run = _sview('proc', 'fetch', 'states', {'LF': _zs('fetching', 1, 3), 'K': _zs('waiting')}, step='État LF', jid='f7', unit='states')
    end = _sview('proc', 'fetch', 'states', {'LF': _zs('done', 3, 3), 'K': _zs('done', 2, 2)}, state='done', done=2, jid='f7', unit='states',
                 result={'ok': True, 'cycle': '2026-10-29', 'fetched': 12, 'unchanged': 3, 'failed': []})
    st3['current'], st3['views'], st3['i'] = run, [run, run, end], 0
    c.page.reload(wait_until='load')
    _head(c)
    c.until("!!document.querySelector('[data-set-panel=proc] [data-running][data-op=fetch]')", timeout=8000, what='the running download is followed in the Procédures panel')
    c.eq([c.js("document.querySelector('[data-group=proc]').open"), _verbs(c), _pv(c, 'aircraft'), c.count('[data-set-panel=proc] [data-verb=stop]')], [True, ['download:off', 'build:off', 'purge:off'], ['download:off', 'build:off', 'purge:off'], 1],
         'its group is open, the other panels are grey, Arrêter is offered', what='found at mount')
    c.eq(sorted(c.js("[...document.querySelectorAll('[data-set-panel=proc] [data-item-state]')].map(l => l.dataset.itemState)")), ['K', 'LF'], 'its own lines', what='lines')
    c.until("!!document.querySelector('[data-set-panel=proc] [data-build-result][data-op=fetch][data-result=done]')", timeout=10000, what='the followed job ends')
    want = sm('fetchDone').replace('{s}', label('proc')).replace('{c}', f"12 {_unit('aerodrome', lang, 12)}").replace('{u}', f"3 {_unit('aerodrome', lang, 3)}").replace('{f}', _trow('fetchFails', lang, row=1).replace('{n}', '0'))
    c.eq([_line(c, '[data-set-panel=proc] [data-build-result] b'), len(_notes_with(c, want))], [norm(want), 1], 'followed to its end: the summary, one notification', what='fetch summary')
    _all_open(c)
    _panels_ok(c, 'after the followed job')
    # ---- G: the VAC points (the shapes of tools/regen/vfr.py): fetch with charts not published, build without a commit, a dry purge, the reasons
    cyc = cur.isoformat()
    cyc_name = T('cycle').replace('{c}', _name(cur))
    v_run = _sview('vfr', 'fetch', 'cycles', {cyc: {'state': 'fetching', 'done': 12, 'total': 40}}, step='LFPG', done=12, total=40, unit='aerodromes', jid='v1')
    v_end = _sview('vfr', 'fetch', 'cycles', {cyc: {'state': 'done', 'done': 40, 'total': 40}}, state='done', done=40, total=40, unit='aerodromes', jid='v1',
                   result={'ok': True, 'cycle': cyc, 'fetched': 12, 'unchanged': 25, 'notPublished': 3, 'failed': []})
    st3['current'], st3['views'], st3['i'], st3['start'] = None, [v_run, v_run, v_end], 0, (200, {'job': 'v1'})
    c.page.reload(wait_until='load')
    _head(c)
    _all_open(c)
    n = len(st3['posts'])
    c.tap('[data-set-panel=vfr] [data-verb=download]')
    c.until("!!document.querySelector('[data-set-panel=vfr] [data-running][data-run-set=vfr]')", what='the VAC download runs in its panel')
    c.eq({k: st3['posts'][n][k] for k in ('set', 'verb', 'args')}, {'set': 'vfr', 'verb': 'fetch', 'args': {'cycle': cyc}}, 'the body: the cycle in force (its effective date)', what='vfr fetch body')
    c.until("document.querySelector('[data-set-panel=vfr] [data-item-state]')?.dataset.state === 'fetching'", timeout=8000, what='the cycle line follows the view')
    c.eq(_line(c, '[data-set-panel=vfr] [data-item-state]'), norm(f"{cyc_name} : {T('fetchingP', 'fetchState: {').replace('{n}', '12').replace('{m}', '40')}"), 'the cycle\'s line: (12 / 40), no « sources »', what='cycle line')
    c.eq(_line(c, '[data-set-panel=vfr] [data-running] [data-count]'), norm(T('runCount').replace('{n}', f"12 {_unit('aerodrome', lang, 12)}").replace('{m}', '40')), 'the count is the launcher\'s unit: aerodromes', what='vfr count')
    c.until("!!document.querySelector('[data-set-panel=vfr] [data-build-result][data-op=fetch]')", timeout=10000, what='the end of the download')
    want = _trow('fetchDone', lang, 'vfrSum: {').replace('{s}', label('vfr')).replace('{c}', '12').replace('{u}', '25').replace('{p}', _trow('vfrNotPublished', lang, row=1).replace('{n}', '3')).replace('{f}', _trow('fetchFails', lang, row=1).replace('{n}', '0'))
    c.eq([c.attr('[data-set-panel=vfr] [data-build-result]', 'data-result'), _line(c, '[data-set-panel=vfr] [data-build-result] b'), len(_notes_with(c, want))], ['done', norm(want), 1],
         'the end: charts downloaded, already there, « 3 cartes pas encore publiées » (not a failure), no failure; one notification', what='vfr fetch end')
    doc = c.until_doc('cache/data/journal.json', lambda d: bool(d and any(o.get('set') == 'vfr' for o in d.get('ops', []))), what='the download is journaled')
    e = [o for o in doc['ops'] if o.get('set') == 'vfr'][-1]
    c.eq([e['verb'], e['items'], e['result'], e['counts']], ['download', [cyc], 'done', {'fetched': 12, 'unchanged': 25, 'notPublished': 3}], 'the journal entry', what='vfr journal')
    # no base of the cycle on the workstation
    nb = _sview('vfr', 'fetch', 'cycles', {cyc: {'state': 'failed', 'error': 'no-base'}}, state='error', jid='v2', unit='aerodromes', done=0, total=0,
                result={'ok': False, 'cycle': cyc, 'reason': 'no-base', 'message': 'x'})
    st3['views'], st3['i'], st3['start'] = [nb], 0, (200, {'job': 'v2'})
    c.tap('[data-set-panel=vfr] [data-verb=download]')
    c.until("document.querySelector('[data-set-panel=vfr] [data-build-result]')?.dataset.result === 'no-base'", timeout=8000, what='no-base is said')
    c.eq([_line(c, '[data-set-panel=vfr] [data-build-result] b'), c.count('[data-set-panel=vfr] [data-item-state]')], [norm(_trow('noBase', lang, 'vfrSum: {').replace('{s}', label('vfr'))), 0], '« Construisez d\'abord la base France de ce cycle »', what='no-base')
    # build: done, but no commit (no trigram): said
    b_run = _sview('vfr', 'build', 'cycles', {cyc: {'state': 'building', 'done': 1, 'total': 3}}, step='contrôle', done=1, total=3, unit='steps', jid='v3')
    b_end = _sview('vfr', 'build', 'cycles', {cyc: {'state': 'done', 'done': 3, 'total': 3}}, state='done', done=3, total=3, unit='steps', jid='v3',
                   result={'ok': True, 'cycle': cyc, 'summary': {'aerodromes': 300}, 'commit': None, 'warning': 'no author', 'failed': []})
    st3['views'], st3['i'], st3['start'] = [b_run, b_end], 0, (200, {'job': 'v3'})
    n = len(st3['posts'])
    c.tap('[data-set-panel=vfr] [data-verb=build]')
    c.until("!!document.querySelector('[data-set-panel=vfr] [data-build-result][data-result=done]')", timeout=10000, what='the end of the build')
    c.eq({k: st3['posts'][n][k] for k in ('set', 'verb', 'args')}, {'set': 'vfr', 'verb': 'build', 'args': {'cycle': cyc}}, 'the build body', what='vfr build body')
    done = _trow('buildDone', lang, 'setSum: {').replace('{s}', label('vfr')).replace('{built}', f"1 {_unit('cycle', lang, 1)}")
    c.eq([_line(c, '[data-set-panel=vfr] [data-build-result] b'), _line(c, '[data-set-panel=vfr] [data-build-result] [data-line]'), c.count('[data-set-panel=vfr] [data-item-state=\"' + cyc + '\"][data-state=built]')],
         [norm(done), norm(_trow('vfrNoCommit', lang)), 1], 'the cycle is built (« done » of the launcher), and the missing commit is said (no trigram)', what='vfr build end')
    c.eq(len(_notes_with(c, _trow('vfrNoCommit', lang))), 1, 'one notification, carrying that sentence', what='vfr build note')
    # build refused: pypdf missing: a sentence and the link to the first-install assistant
    nop = _sview('vfr', 'build', 'cycles', {cyc: {'state': 'failed', 'error': 'no-pypdf'}}, state='error', jid='v4', unit='steps', done=0, total=3,
                 result={'ok': False, 'cycle': cyc, 'reason': 'no-pypdf', 'message': 'x'})
    st3['views'], st3['i'], st3['start'] = [nop], 0, (200, {'job': 'v4'})
    c.tap('[data-set-panel=vfr] [data-verb=build]')
    c.until("document.querySelector('[data-set-panel=vfr] [data-build-result]')?.dataset.result === 'no-pypdf'", timeout=8000, what='no-pypdf is said')
    c.eq([_line(c, '[data-set-panel=vfr] [data-build-result] b'), c.attr('[data-set-panel=vfr] [data-build-result] a', 'href').endswith('/apps/settings/premier_lancement.html'),
          _line(c, '[data-set-panel=vfr] [data-build-result] a'), c.count('[data-set-panel=vfr] [data-failed]')],
         [norm(_trow('noPypdf', lang, 'vfrSum: {').replace('{s}', label('vfr'))), True, norm(_trow('firstInstall', lang)), 0], 'a sentence and the link to the first-install assistant', what='no-pypdf')
    # the plan refused: its problems are listed
    inv = _sview('vfr', 'build', 'cycles', {cyc: {'state': 'failed', 'error': 'invalid'}}, state='error', jid='v5', unit='steps', done=1, total=3,
                 result={'ok': False, 'cycle': cyc, 'reason': 'invalid', 'failed': [{'item': 'plan', 'error': 'point <b>x</b>'}], 'summary': {}})
    st3['views'], st3['i'], st3['start'] = [inv], 0, (200, {'job': 'v5'})
    c.tap('[data-set-panel=vfr] [data-verb=build]')
    c.until("document.querySelector('[data-set-panel=vfr] [data-build-result]')?.dataset.result === 'invalid'", timeout=8000, what='invalid is said')
    c.eq([_line(c, '[data-set-panel=vfr] [data-build-result] b'), _line(c, '[data-set-panel=vfr] [data-failed] li'), c.count('[data-set-panel=vfr] [data-failed] b b')],
         [norm(_trow('invalid', lang, 'vfrSum: {').replace('{s}', label('vfr')).replace('{failed}', '1')), 'plan : point <b>x</b>', 0], 'the problem of the plan is listed, as text', what='invalid')
    # purge: the plan (dry sent explicitly, no cycle: all of them), one question, the real run; unsafe paths are said
    warn = [{'code': 'unsafe-path', 'count': 2}]
    pd = _sview('vfr', 'purge', None, None, state='done', jid='v6', args={'dry': True}, result={'ok': True, 'dry': True, 'removed': {'files': 6, 'bytes': 3072}, 'warnings': warn})
    pr = _sview('vfr', 'purge', None, None, state='done', jid='v7', args={'dry': False}, result={'ok': True, 'dry': False, 'removed': {'files': 6, 'bytes': 3072}, 'warnings': warn})
    st3['views'], st3['i'], st3['start'] = [pd, pr], 0, (200, {'job': 'v6'})
    n = len(st3['posts'])
    c.tap('[data-set-panel=vfr] [data-verb=purge]')
    q = _ask_text(c)
    c.eq([norm(q['text']), st3['posts'][n]['args']], [norm(T('purgeAskSet').replace('{n}', f'6 {FILES[lang][1]}').replace('{s}', _size(3072, lang)).replace('{z}', label('vfr'))), {'dry': True}],
         'the plan: dry true, no cycle (all of them); one question with the files and the size', what='vfr purge ask')
    st3['start'] = (200, {'job': 'v7'})
    c.tap('.f-modal [data-ok]')
    c.until("!!document.querySelector('[data-set-panel=vfr] [data-build-result][data-op=purge]')", timeout=10000, what='the purge ends')
    c.eq(st3['posts'][-1]['args'], {'dry': False}, 'the real run says dry false', what='vfr real purge')
    c.eq([_line(c, '[data-set-panel=vfr] [data-build-result] b'), c.js("[...document.querySelectorAll('[data-set-panel=vfr] [data-build-result] [data-line]')].map(p => p.textContent.replace(/\\s+/g, ' ').trim())")],
         [norm(T('purgeDone').replace('{n}', f'6 {FILES[lang][1]}').replace('{s}', _size(3072, lang))), [norm(_trow('purgeUnsafe', lang, row=1).replace('{n}', '2'))]],
         'the end, and « 2 chemins refusés, laissés en place »', what='vfr purge end')
    # a State read by EAD one aerodrome at a time: the launcher's error is a sentence, never a bulk read
    ead = _sview('proc', 'fetch', 'states', {'LF': {'state': 'failed', 'error': 'ead-per-aerodrome'}}, state='error', jid='e1', unit='states', done=0, total=1,
                 result={'ok': False, 'fetched': [], 'unchanged': [], 'failed': [{'state': 'LF', 'error': 'ead-per-aerodrome'}], 'reason': 'failed'})
    st3['views'], st3['i'], st3['start'] = [ead], 0, (200, {'job': 'e1'})
    c.tap('[data-set-panel=proc] [data-item=LF]')
    mp = _sview('proc', 'build', 'states', {'LF': {'state': 'failed', 'error': 'merge-pending'}}, state='error', jid='m1', unit='states', done=0, total=1,
                result={'ok': False, 'cycle': '2026-10-29', 'built': {}, 'commits': {}, 'failed': [], 'reason': 'merge-pending'})
    st3['views'], st3['i'], st3['start'] = [mp], 0, (200, {'job': 'm1'})
    c.tap('[data-set-panel=proc] [data-verb=build]')
    c.until("document.querySelector('[data-set-panel=proc] [data-build-result]')?.dataset.result === 'merge-pending'", timeout=8000, what='merge-pending is said')
    c.eq([_line(c, '[data-set-panel=proc] [data-build-result] b'), c.count('[data-set-panel=proc] [data-item-state]'), len(_notes_with(c, T('mergePending')))], [norm(T('mergePending')), 0, 1],
         'a merge waits in data/: one sentence (synchronise first), no line, one notification; nothing was written', what='merge-pending')
    st3['views'], st3['i'], st3['start'] = [ead], 0, (200, {'job': 'e1'})
    c.tap('[data-set-panel=proc] [data-verb=download]')
    c.until("!!document.querySelector('[data-set-panel=proc] [data-build-result][data-op=fetch]')", timeout=8000, what='the proc download ends')
    c.eq(_line(c, '[data-set-panel=proc] [data-item-state=LF]'), norm(f"{name('LF')} : {T('failed', 'fetchState: {').replace('{r}', T('eadNote'))}"), 'ead-per-aerodrome: the sentence « un terrain à la fois »', what='ead error')
    _all_open(c)
    _panels_ok(c, 'after the VAC points')
    c.check_errors()


def _unit(key, lang, n):
    """A unit noun of texts.js (`unit: { <key>: [[singular…], [plural…]] }`), in the language, for the count n."""
    return _trow(key, lang, 'unit: {', 0 if n == 1 else 1)


# ------------------------------------------------------------------------------------------------------ L18
_FRESH_JS = """(() => { try { if (sessionStorage.getItem('__freshFr') && window.__stub) { const b = window.__stub.publication.base; b.fr = b.es } } catch {} })()"""


def _chain_views(cyc):
    """The eight scripted jobs of a clean chain, in order, each already ended: base fetch, base build, proc fetch, proc build, vfr fetch, vfr build, aircraft fetch,
    aircraft build (each answers the follower's first poll; the shapes are the launcher's)."""
    s3 = {'types': {'state': 'done'}, 'apd': {'state': 'done'}, 'simbrief': {'state': 'done'}}
    return [
        _fview({'fr': _fz('done', 3, 3), 'gb': _fz('done', 2, 2)}, state='done', verb='fetch', jid='c1', done=2,
               result={'ok': True, 'fetched': ['fr', 'gb'], 'unchanged': [], 'failed': [], 'manual': [], 'outside_sync': 0, 'warnings': []}),
        _fview({'fr': _zs('built', 4, 4), 'gb': _zs('built', 5, 5)}, state='done', verb='build', jid='c2', done=2, result={'built': ['fr', 'gb'], 'failed': [], 'commits': []}),
        _sview('proc', 'fetch', 'states', {'K': {'state': 'done'}, 'LF': {'state': 'done'}}, state='done', jid='c3', unit='states', done=2,
               result={'ok': True, 'cycle': cyc, 'fetched': 12, 'unchanged': 3, 'failed': []}),
        _sview('proc', 'build', 'states', {'K': {'state': 'done'}, 'LF': {'state': 'done'}}, state='done', jid='c4', unit='states', done=2,
               result={'ok': True, 'cycle': cyc, 'built': {'K': 10, 'LF': 20}, 'commits': {'K': 'a1', 'LF': 'b2'}, 'failed': []}),
        _sview('vfr', 'fetch', 'cycles', {cyc: {'state': 'done', 'done': 40, 'total': 40}}, state='done', jid='c5', unit='aerodromes', done=40, total=40,
               result={'ok': True, 'cycle': cyc, 'fetched': 12, 'unchanged': 25, 'notPublished': 3, 'failed': []}),
        _sview('vfr', 'build', 'cycles', {cyc: {'state': 'done', 'done': 3, 'total': 3}}, state='done', jid='c6', unit='steps', done=3, total=3,
               result={'ok': True, 'cycle': cyc, 'summary': {'aerodromes': 300}, 'commit': 'abc1234', 'failed': []}),
        _sview('aircraft', 'fetch', 'steps', s3, state='done', jid='c7', unit='steps', done=3, total=3,
               result={'ok': True, 'codes': [], 'steps': ['types', 'apd', 'simbrief'], 'failed': [], 'commit': None}),
        _sview('aircraft', 'build', 'steps', s3, state='done', jid='c8', unit='steps', done=3, total=3,
               result={'ok': True, 'codes': [], 'steps': ['types', 'apd', 'simbrief'], 'failed': [], 'commit': None})]


def _card_ok(c, what):
    """The « Tout mettre à jour » card: no horizontal scroll, nothing beyond the right edge, 44 px buttons."""
    m = c.js("""() => { const b = document.querySelector('[data-update-all]'); return { sw: document.documentElement.scrollWidth, iw: window.innerWidth,
      over: [...b.querySelectorAll('*')].filter(e => e.getBoundingClientRect().width && e.getBoundingClientRect().right > window.innerWidth + 1).slice(0, 3).map(e => e.tagName + '.' + e.className),
      hs: [...b.querySelectorAll('button')].map(e => Math.round(e.getBoundingClientRect().height)) } }""")
    c.le(m['sw'], m['iw'], f'{what}: no horizontal scroll', what='scrollWidth')
    c.ok(not m['over'], m['over'], f'{what}: nothing beyond the right edge')
    c.ge(min(m['hs']), 44, f'{what}: the buttons are 44 px', what='touch height')


def _bv(c):
    """The base panel's three verb buttons (not Arrêter), each with ':off' when grey."""
    return c.js("[...document.querySelectorAll('[data-build] [data-verb]')].filter(b => b.dataset.verb !== 'stop' && !b.dataset.verb.startsWith('pickup')).map(b => b.dataset.verb + (b.disabled ? ':off' : ''))")


def _chain_rows(c):
    """The sets listed by the chain: [[set, result]]."""
    return c.js("[...document.querySelectorAll('[data-update-all] [data-chain-set]')].map(l => [l.dataset.chainSet, l.dataset.result])")


@case('L18', 'Données: « Tout mettre à jour » against a fake launcher (plan question, the published order, one Publier, stop at the first failure, Arrêter, skipped sets, attention mark, reload)',
      'L', tags=('data',), langs4=True, designs=('standard',),
      rule='modules/data/SPEC 5.3 (plan first, one question; downloads and builds in the published order; stop at the first failure; one Publier at the end), 6.3 (end of cycle)')
def l18(c):
    lang = c.lang
    li = {'fr': 0, 'en': 1, 'de': 2, 'es': 3}[lang]
    T = lambda key, after=None, row=0: _trow(key, lang, after, row)
    label = lambda s: T(s, 'setLabel: {')
    base_label = T('base', 'groups: {')
    sm = lambda key: T(key, 'setSum: {')
    cfg, _ = _fixture()
    today, cur, prev, nxt = _cycles()
    cyc = cur.isoformat()
    K_NAMES = ['États-Unis', 'United States', 'Vereinigte Staaten', 'Estados Unidos']
    name = lambda p: K_NAMES[li] if p == 'K' else cfg['states'][p]['names'][li]
    ORDER = {'fr': ['K', 'LF'], 'en': ['LF', 'K'], 'de': ['LF', 'K'], 'es': ['K', 'LF']}[lang]
    n_sets = lambda n: f"{n} {_unit('set', lang, n)}"
    stopped = _fview({'fr': _fz('done', 3, 3), 'gb': _fz('cancelled')}, state='cancelled', verb='fetch', jid='c1', done=1,
                     result={'ok': False, 'fetched': ['fr'], 'unchanged': [], 'failed': [], 'manual': [], 'reason': 'cancelled'})
    views = _chain_views(cyc)
    c.page.goto(f'{c.base}/frame/manifest.webmanifest', wait_until='load')
    _sync_cfg(c, True, None)
    st = _launcher(c, views, verbs=ALL_VERBS, cancel_view=stopped, sync={'changes': 3, 'ahead': 0, 'merging': False, 'last': None})
    c.page.add_init_script(_SYNC_JS)
    _open(c, cfg)
    c.page.add_init_script(_FRESH_JS)   # after the aerodb stub's own script: it may then change what the stub publishes
    _all_open(c)
    # ---- A: the card, the count of sets, the attention mark of a published cycle gone by (fr is one cycle behind)
    c.eq([norm(c.text('[data-update-all] [data-verb=all]')), c.js("document.querySelector('[data-update-all] [data-verb=all]').disabled")],
         [norm(T('updateAllN').replace('{n}', n_sets(3))), False], 'the button, with the count of sets it will touch: base (all zones ticked), VAC points, aircraft (the fleet); no State ticked yet', what='button 3')
    c.tap('[data-set-panel=proc] [data-item=K]')
    c.tap('[data-set-panel=proc] [data-item=LF]')
    _untick(c, 'ca', 'es', 'us')
    c.eq([norm(c.text('[data-update-all] [data-verb=all]')), c.js("document.querySelector('[data-update-all] [data-verb=all]').disabled")],
         [norm(T('updateAllN').replace('{n}', n_sets(4))), False], 'four sets once the States are ticked', what='button 4')
    c.eq(c.js("(() => { const a = document.querySelector('[data-update-all]'), g = document.querySelector('details.f-group'); return !!(a.compareDocumentPosition(g) & Node.DOCUMENT_POSITION_FOLLOWING) })()"), True,
         'the card sits above the groups', what='position')
    c.eq([c.count('[data-build] [data-verb=build] [data-attn]'), c.count('[data-update-all] [data-verb=all] [data-attn]'), c.count('[data-set-panel=proc] [data-verb=build] [data-attn]')], [1, 1, 0],
         'the attention mark on the base\'s Construire and on « Tout mettre à jour » (fr published one cycle behind); none on the procedures', what='attention')
    c.eq(norm(c.text('[data-update-all] [data-stale=base]')), norm(T('staleCycle').replace('{x}', _name(prev)).replace('{y}', _name(cur))), 'cycle X out of date, to rebuild for Y, in words', what='stale line')
    _card_ok(c, 'before')
    # ---- B: the plan, ONE question; No calls nothing
    ask_sets = ' ; '.join([f"{base_label} : 2 {_unit('zone', lang, 2)} ({', '.join(z['names'][li] for z in cfg['zones'] if z['id'] in ('fr', 'gb'))})",
                           f"{label('proc')} : 2 {_unit('state', lang, 2)} ({', '.join(name(k) for k in ORDER)})", f"{label('vfr')} : {T('cycle').replace('{c}', _name(cur))}",
                           f"{label('aircraft')} : {T('chainFleet')}"])
    ask = T('chainAsk').replace('{c}', _name(cur)).replace('{sets}', ask_sets).replace('{skipped}', '')
    posts0 = len(st['posts'])
    c.tap('[data-update-all] [data-verb=all]')
    q = _ask_text(c)
    c.eq([norm(q['text']), norm(q['ok']), q['no'], len(st['posts']) - posts0], [norm(ask), norm(T('updateAll')), True, 0], 'ONE question: the cycle, the sets in the published order with what each touches, the downloads\' size unknown, no purge, one publication',
         what='question')
    c.eq([_bv(c), _pv(c, 'proc'), c.js("document.querySelector('[data-update-all] [data-verb=all]').disabled")], [['download:off', 'build:off', 'purge:off'], ['download:off', 'build:off', 'purge:off'], True],
         'every button is grey while the question is open', what='during the question')
    c.tap('.f-modal [data-no]')
    c.until("!document.querySelector('.f-modal')", what='the window closes')
    c.wait(300)
    c.eq([len(st['posts']) - posts0, _bv(c), c.js("document.querySelector('[data-update-all] [data-verb=all]').disabled"), c.count('[data-chain]')], [0, ['download', 'build', 'purge'], False, 0],
         'No: nothing is called, the buttons are live again', what='after No')
    # ---- C: Yes: the eight jobs in the published order, then ONE sync with the gesture
    n_notes = len(c.note_log())
    st['views'], st['i'] = views, 0
    c.tap('[data-update-all] [data-verb=all]')
    _ask_text(c)
    c.tap('.f-modal [data-ok]')
    c.until("!!document.querySelector('[data-update-all] [data-chain]')", timeout=8000, what='the chain line is drawn')
    c.eq([norm(c.text('[data-chain-count]')), norm(c.text('[data-chain-step]'))], [norm(T('chainCount').replace('{n}', '1').replace('{m}', '4')), norm(f"{base_label} : {T('download')}")],
         'the chain line: « 1 / 4 jeux » and the running set and step', what='chain line')
    c.eq([_bv(c), _pv(c, 'proc'), _pv(c, 'vfr'), _pv(c, 'aircraft'), _pv(c, 'sheets'), c.js("document.querySelector('[data-update-all] [data-verb=all]').disabled"), c.js("document.querySelector('[data-publish] [data-verb=publish]').disabled")],
         [['download:off', 'build:off', 'purge:off']] * 4 + [['publish-sheets:off'], True, True], 'all the other buttons are grey while the chain runs', what='all grey')
    _card_ok(c, 'running')
    c.until("!!document.querySelector('[data-update-all] [data-chain-result]')", timeout=60000, what='the end of the chain')
    order = [(p['set'], p['verb']) for p in st['posts'][posts0:]]
    c.eq(order, [('base', 'fetch'), ('base', 'build'), ('proc', 'fetch'), ('proc', 'build'), ('vfr', 'fetch'), ('vfr', 'build'), ('aircraft', 'fetch'), ('aircraft', 'build')],
         'download then build for each set in the published order; no purge, no aircraft/publish', what='order')
    args = [p['args'] for p in st['posts'][posts0:]]
    c.eq([args[0], args[1], args[2], args[4], args[6]], [{'zones': ['fr', 'gb'], 'personal': []}, {'zones': ['fr', 'gb'], 'personal': []}, {'states': ['K', 'LF']}, {'cycle': cyc}, {'codes': []}],
         'each set with its panel\'s choices: the ticked zones, the States, the cycle in force, the fleet\'s types', what='bodies')
    c.eq(c.js('window.__sync.calls'), [{'gesture': True}], 'ONE publication, with the gesture, once the eight jobs succeeded', what='sync')
    pubdone = T('pubDone').replace('{c}', '3').replace('{r}', '1')
    done = T('chainDone').replace('{n}', n_sets(4)).replace('{p}', pubdone)
    c.eq([c.attr('[data-chain-result]', 'data-result'), _line(c, '[data-chain-result] b'), _chain_rows(c)], ['done', norm(done), [['base', 'done'], ['proc', 'done'], ['vfr', 'done'], ['aircraft', 'done']]],
         'the end: every set done, the publication said', what='chain end')
    c.eq(len(c.note_log()) - n_notes, 1, 'ONE notification for the whole chain (none per job, none for the publication)', what='notifications')
    c.eq([_bv(c), c.js("document.querySelector('[data-update-all] [data-verb=all]').disabled")], [['download', 'build', 'purge'], False], 'the buttons are live again', what='live again')
    doc = c.until_doc('cache/data/journal.json', lambda d: bool(d and any(o.get('set') == 'all' and o.get('result') == 'done' for o in d.get('ops', []))), what='the chain is journaled')
    ops = doc['ops']
    al = [o for o in ops if o.get('set') == 'all']
    c.eq([[o['verb'], o['result'], [(i['set'], i['result']) for i in o['items']], o['job'].startswith('chain-')] for o in al],
         [['update', 'done', [('base', 'done'), ('proc', 'done'), ('vfr', 'done'), ('aircraft', 'done')], True]], 'ONE journal entry for the chain, with each set\'s result (the start marker is replaced by the end)', what='journal')
    c.eq([o['verb'] for o in ops if o.get('set') != 'all'], ['publish'], 'the jobs themselves are not journaled one by one: the chain\'s entry and the publication', what='other entries')
    _card_ok(c, 'at the end')
    # ---- D: a failing proc build: the chain stops, the others are not run, nothing is published
    part = _sview('proc', 'build', 'states', {'K': {'state': 'done'}, 'LF': {'state': 'failed', 'error': 'no-cache'}}, state='error', jid='c4', unit='states', done=2,
                  result={'ok': False, 'cycle': cyc, 'built': {'K': 10}, 'commits': {'K': 'a1'}, 'failed': [{'state': 'LF', 'error': 'no-cache'}], 'reason': 'partial'})
    st['views'], st['i'] = views[:3] + [part], 0
    posts1, syncs1, n_notes = len(st['posts']), len(c.js('window.__sync.calls')), len(c.note_log())
    c.tap('[data-update-all] [data-verb=all]')
    _ask_text(c)
    c.tap('.f-modal [data-ok]')
    c.until("document.querySelector('[data-update-all] [data-chain-result]')?.dataset.result === 'failed'", timeout=60000, what='the chain stops')
    reason = sm('buildPartial').replace('{s}', label('proc')).replace('{built}', f"1 {_unit('state', lang, 1)}").replace('{failed}', '1').replace('{items}', name('LF'))
    want = T('chainFailed').replace('{s}', label('proc')).replace('{r}', reason)
    c.eq([_line(c, '[data-chain-result] b'), _chain_rows(c), [(p['set'], p['verb']) for p in st['posts'][posts1:]], len(c.js('window.__sync.calls')) - syncs1, len(c.note_log()) - n_notes],
         [norm(want), [['base', 'done'], ['proc', 'failed'], ['vfr', 'notrun'], ['aircraft', 'notrun']], [('base', 'fetch'), ('base', 'build'), ('proc', 'fetch'), ('proc', 'build')], 0, 1],
         'stopped at the proc build: the set and the reason said, the next sets not run, nothing published, one notification', what='failure')
    c.eq(c.count('[data-update-all] [data-chain]'), 0, 'the chain line is gone', what='chain line')
    al = [o for o in c.doc('cache/data/journal.json')['ops'] if o.get('set') == 'all']
    c.eq([o['result'] for o in al], ['done', 'failed'], 'journaled: failed', what='journal')
    # ---- E: Arrêter mid-chain: the current job is cancelled, the chain stops, nothing is published
    run = _fview({'fr': _fz('fetching', 1, 3), 'gb': _fz('waiting')}, step='Zone fr', verb='fetch', jid='c1')
    st['views'], st['i'], st['cancelled'] = [run], 0, False
    posts2, syncs2, n_notes = len(st['posts']), len(c.js('window.__sync.calls')), len(c.note_log())
    c.tap('[data-update-all] [data-verb=all]')
    _ask_text(c)
    c.tap('.f-modal [data-ok]')
    c.until("!!document.querySelector('[data-build] [data-running][data-op=fetch]') && !!document.querySelector('[data-update-all] [data-verb=stop-chain]')", timeout=8000, what='the base download runs')
    c.eq(c.count('[data-update-all] [data-verb=stop-chain]'), 1, 'one « Arrêter » for the whole chain', what='stop button')
    c.tap('[data-update-all] [data-verb=stop-chain]')
    c.until("document.querySelector('[data-update-all] [data-chain-result]')?.dataset.result === 'cancelled'", timeout=30000, what='the chain stops')
    c.eq([st['cancels'], [(p['set'], p['verb']) for p in st['posts'][posts2:]], len(c.js('window.__sync.calls')) - syncs2, len(c.note_log()) - n_notes],
         [[{'id': 'j1'}], [('base', 'fetch')], 0, 1], 'the running job was cancelled, no other job started, nothing published, one notification', what='stop')
    c.eq([_line(c, '[data-chain-result] b'), _chain_rows(c)], [norm(T('chainStopped').replace('{s}', base_label)), [['base', 'cancelled'], ['proc', 'notrun'], ['vfr', 'notrun'], ['aircraft', 'notrun']]],
         'stopped by the user: said, what is built is kept', what='stop end')
    c.eq(_bv(c), ['download', 'build', 'purge'], 'the buttons are live again', what='live again')
    # ---- F: a chain running at the reload: the job is followed as usual, the chain says it was interrupted
    st['cancelled'] = False
    st['views'], st['i'], st['current'] = [run], 0, None
    c.tap('[data-update-all] [data-verb=all]')
    _ask_text(c)
    c.tap('.f-modal [data-ok]')
    c.until("!!document.querySelector('[data-build] [data-running][data-op=fetch]')", timeout=8000, what='the base download runs')
    st['current'] = run
    c.page.reload(wait_until='load')
    _head(c)
    c.until("!!document.querySelector('[data-update-all] [data-chain-note]')", timeout=8000, what='the interrupted chain is said')
    c.eq([_line(c, '[data-update-all] [data-chain-note]'), len(_notes_with(c, T('chainReload')))], [norm(T('chainReload')), 1], '« chaîne interrompue par le rechargement : relancez « Tout mettre à jour » », in the card and once as a notification', what='reload note')
    c.until("!!document.querySelector('[data-build] [data-running][data-op=fetch]')", timeout=8000, what='the running job is followed as before')
    al = [o for o in c.doc('cache/data/journal.json')['ops'] if o.get('set') == 'all']
    c.eq([o['result'] for o in al], ['done', 'failed', 'cancelled', 'interrupted'], 'the start marker without its end is journaled « interrupted »', what='journal')
    # ---- G: skipped sets with their reasons: nothing ticked in the States, the launcher does not know the aircraft verbs
    st['current'] = None
    st['verbs'] = BASE3 + PROC3 + VFR3
    c.page.reload(wait_until='load')
    _head(c)
    _all_open(c)
    c.eq(norm(c.text('[data-update-all] [data-verb=all]')), norm(T('updateAllN').replace('{n}', n_sets(2))), 'two sets: the base (all its zones ticked) and the VAC points', what='button 2')
    c.tap('[data-update-all] [data-verb=all]')
    q = _ask_text(c)
    names_all = ', '.join(z['names'][li] for z in cfg['zones'] if z['id'] in ('ca', 'es', 'fr', 'gb', 'us'))
    skipped = T('chainSkipped').replace('{s}', f"{label('proc')} ({T('no-state', 'greyReason: {')}), {label('aircraft')} ({T('unknown-verb', 'greyReason: {')})")
    ask = T('chainAsk').replace('{c}', _name(cur)).replace('{sets}', f"{base_label} : 5 {_unit('zone', lang, 5)} ({names_all}) ; {label('vfr')} : {T('cycle').replace('{c}', _name(cur))}").replace('{skipped}', ' ' + skipped)
    c.eq(norm(q['text']), norm(ask), 'the skipped sets are listed with their reason (nothing ticked, verb unknown to this launcher)', what='skipped question')
    c.tap('.f-modal [data-no]')
    c.until("!document.querySelector('.f-modal')", what='the window closes')
    # a suite update in progress refuses the first job: the chain stops there, said, nothing is published
    st['start'] = (409, {'reason': 'updating', 'message': 'no job starts now (updating)'})
    posts1, syncs1 = len(st['posts']), len(c.js('window.__sync.calls'))
    c.tap('[data-update-all] [data-verb=all]')
    _ask_text(c)
    c.tap('.f-modal [data-ok]')
    c.until("document.querySelector('[data-update-all] [data-chain-result]')?.dataset.result === 'failed'", timeout=30000, what='the chain stops on the refusal')
    c.eq([_line(c, '[data-chain-result] b'), len(st['posts']) - posts1, len(c.js('window.__sync.calls')) - syncs1, _chain_rows(c)],
         [norm(T('chainFailed').replace('{s}', base_label).replace('{r}', T('updating', 'refused: {'))), 1, 0, [['base', 'failed'], ['proc', 'skipped'], ['vfr', 'notrun'], ['aircraft', 'skipped']]],
         'every job start is refused during an update of the suite: the chain stops at the first, nothing is published', what='chain updating')
    st['start'] = (200, {'job': 'j1'})
    c.wait(300)
    # ---- H: nothing gone by: no attention mark
    c.page.evaluate("sessionStorage.setItem('__freshFr', '1')")
    c.page.reload(wait_until='load')
    _head(c)
    _all_open(c)
    c.eq([c.count('[data-build] [data-verb=build] [data-attn]'), c.count('[data-update-all] [data-verb=all] [data-attn]'), c.count('[data-update-all] [data-stale]')], [0, 0, 0],
         'every published cycle is the one in force: no attention mark, no line', what='no attention')
    _card_ok(c, 'fresh')
    c.check_errors()


# ------------------------------------------------------------------------------------------------------ L19
def _pk_plan(taken=(), missing=(), failed=(), dry=True, state='done', jid='k1', zones=('fr', 'gb'), reason=None, step=''):
    """The view of a base/pickup job: the plan (dry true) or the real run, with the launcher's result shape (tools/regen/base_sources.py)."""
    res = {'ok': reason is None and state != 'running', 'dry': dry, 'taken': list(taken), 'missing': list(missing), 'failed': list(failed)}
    if reason:
        res['reason'] = reason
    v = _fview({}, state=state, step=step, verb='pickup', args={'zones': list(zones), 'dry': dry}, jid=jid, result=res if state != 'running' else None)
    return v


@case('L19', 'Données: « Prendre le fichier téléchargé » against a fake launcher (plan, one question, No, the real run with dry false, summary and hint, journal, the button of a manual source, grey when unknown)',
      'L', tags=('data',), langs4=True, designs=('standard',),
      rule='modules/data/SPEC 5.1 (plan before change, one question), 5.5; tools/regen/base_sources.py (base/pickup)')
def l19(c):
    lang = c.lang
    li = {'fr': 0, 'en': 1, 'de': 2, 'es': 3}[lang]
    T = lambda key, after=None, row=0: _trow(key, lang, after, row)
    cfg, _ = _fixture()
    zname = lambda z: next(x['names'][li] for x in cfg['zones'] if x['id'] == z)
    sia_zip = {'zone': 'fr', 'source': 'sia', 'zip': 'export_xml_bd_SIA_2026-11-26.zip', 'size': 3000000, 'files': ['a.xml', 'b.xml', 'c.xml'], 'bytes': 5242880}
    miss_gb = {'zone': 'gb', 'source': 'nats', 'expected': 'EG_*_DS_*_XML.zip'}
    st = _launcher(c, [], verbs=ALL_VERBS + ['base/pickup'])
    _open(c, cfg)
    _all_open(c)
    _untick(c, 'ca', 'es', 'us')
    s_sia, s_nats = [c.js(f"document.querySelector('[data-set={x}] summary b').textContent").strip() for x in ('sia', 'nats')]
    pk = "[data-build] [data-verb=pickup]"
    # ---- A: the fourth verb of the base panel, live with a launcher that knows base/pickup
    c.eq([norm(c.text(pk)), c.js(f"document.querySelector('{pk}').disabled"), c.count('[data-build] [data-pickup-reason]'), _verbs(c)], [norm(T('pickup')), False, 0, ['download', 'build', 'purge']],
         'a fourth button « Prendre le fichier téléchargé », live; the three others unchanged', what='button')
    c.eq(c.js("[...document.querySelectorAll('[data-build] .d-verbs button')].map(b => b.dataset.verb)"), ['download', 'pickup', 'build', 'purge'], 'after Télécharger', what='order')
    _screen_ok(c, 'before')
    # ---- B: the plan (dry sent explicitly), ONE question; No takes nothing
    taken_txt = T('pickupTaken').replace('{z}', zname('fr')).replace('{s}', s_sia).replace('{zip}', sia_zip['zip']).replace('{n}', f"3 {FILES[lang][1]}").replace('{b}', _size(5242880, lang))
    miss_txt = T('pickupMissing').replace('{z}', zname('gb')).replace('{s}', s_nats).replace('{e}', miss_gb['expected'])
    ask = T('pickupAsk').replace('{taken}', taken_txt).replace('{missing}', f' {miss_txt}.').replace('{to}', 'data/sia/')
    plan = _pk_plan([sia_zip], [miss_gb])
    st['views'], st['i'], st['start'] = [plan], 0, (200, {'job': 'k1'})
    n = len(st['posts'])
    c.tap(pk)
    q = _ask_text(c)
    c.eq([norm(q['text']), norm(q['ok']), q['no'], len(st['posts']) - n], [norm(ask), norm(T('pickup')), True, 1], 'ONE question from the plan: the zip found (name, files, size), the file missing with its pattern, where the files go, raw and never committed', what='question')
    c.eq({k: st['posts'][n][k] for k in ('set', 'verb', 'args')}, {'set': 'base', 'verb': 'pickup', 'args': {'zones': ['fr', 'gb'], 'dry': True}}, 'the plan is a dry run, sent explicitly', what='dry body')
    c.eq([_bv(c), c.js(f"document.querySelector('{pk}').disabled")], [['download:off', 'build:off', 'purge:off'], True], 'every button is grey while the question is open', what='during the question')
    c.tap('.f-modal [data-no]')
    c.until("!document.querySelector('.f-modal')", what='the window closes')
    c.wait(400)
    c.eq([len(st['posts']) - n, c.count('[data-build-result]'), _bv(c), c.js(f"document.querySelector('{pk}').disabled"), c.count('[data-build] [data-op=pickup]')], [1, 0, ['download', 'build', 'purge'], False, 0],
         'No: nothing more is sent, nothing is said, the buttons are live', what='after No')
    c.eq([o for o in c.doc('cache/data/journal.json')['ops'] if o['verb'] == 'pickup'] if c.doc('cache/data/journal.json') else [], [], 'the plan is never journaled', what='journal after No')
    # ---- C: Yes: the real run (dry false), no zone lines, every button grey; then the summary, the hint, the missing file, one notification, one journal entry
    real_run = _pk_plan([], [], [], dry=False, state='running', jid='k2', step='fr')
    real = _pk_plan([sia_zip], [miss_gb], dry=False, jid='k2')
    st['views'], st['i'], st['start'] = [plan, real_run, real], 0, (200, {'job': 'k1'})
    n = len(st['posts'])
    c.tap(pk)
    _ask_text(c)
    st['start'] = (200, {'job': 'k2'})
    c.tap('.f-modal [data-ok]')
    c.until("!!document.querySelector('[data-build] [data-running][data-op=pickup]:not([data-dry])')", timeout=8000, what='the real run is followed')
    c.eq({k: st['posts'][-1][k] for k in ('set', 'verb', 'args')},
         {'set': 'base', 'verb': 'pickup', 'args': {'zones': ['fr'], 'dry': False, 'zips': {'sia': {'name': sia_zip['zip'], 'size': 3000000}}}},
         'the real body (only the zone with a zip in the plan) says dry false and carries the zip the plan showed (name and size), nothing re-read', what='real body')
    c.eq([_bv(c), c.js(f"document.querySelector('{pk}').disabled"), c.count('[data-build] [data-running] [data-zone-state]'), c.count('[data-build] [data-running] [data-count]'), c.count('[data-build] [data-running] [data-verb=stop]')],
         [['download:off', 'build:off', 'purge:off'], True, 0, 0, 1], 'one operation at a time; the bar has its step, no zone lines, no count; Arrêter', what='running')
    c.until("!!document.querySelector('[data-build-result][data-op=pickup][data-result=done]')", timeout=10000, what='the end of the pickup')
    done = T('done', 'pickupSum: {').replace('{n}', f"3 {FILES[lang][1]}").replace('{s}', _size(5242880, lang))
    c.eq([norm(c.text('[data-build-result] b')), norm(c.text('[data-build-result] [data-pickup-hint]')), [norm(t) for t in c.js("[...document.querySelectorAll('[data-build-result] [data-line]')].map(p => p.textContent)")]],
         [norm(done), norm(T('pickupHint')), [norm(miss_txt)]], 'the end: « Pris : 3 fichiers (5,0 Mo) », « Lancez maintenant Construire », the file still missing', what='summary')
    notes = _notes_with(c, done)
    c.eq([len(notes), norm(T('pickupHint')) in norm(notes[0])], [1, True], 'ONE notification, with the hint', what='notification')
    doc = c.until_doc('cache/data/journal.json', lambda d: bool(d and any(o.get('verb') == 'pickup' for o in d.get('ops', []))), what='the pickup is journaled')
    pks = [o for o in doc['ops'] if o['verb'] == 'pickup']
    c.eq([[o['set'], o['zones'], o['result'], o['files'], o['bytes'], o['failed']] for o in pks], [['base', ['fr'], 'done', 3, 5242880, []]], 'ONE journal entry: the real run only', what='journal')
    ops = c.js("[...document.querySelectorAll('[data-journal] [data-op]')].map(o => [o.dataset.opVerb, o.textContent.replace(/\\s+/g, ' ').trim()])")
    c.ok(any(o[0] == 'pickup' and norm(T('pickup', 'opVerb: {')) in norm(o[1]) for o in ops), ops, 'the journal line says the verb')
    _screen_ok(c, 'at the end')
    # ---- D: nothing in Downloads: no question, the missing files said with their pattern
    none = _pk_plan([], [{'zone': 'fr', 'source': 'sia', 'expected': 'export_xml_bd_SIA_*.zip'}, miss_gb], jid='k3')
    st['views'], st['i'], st['start'] = [none], 0, (200, {'job': 'k3'})
    n = len(st['posts'])
    c.tap(pk)
    c.until("document.querySelector('[data-build-result][data-op=pickup]')?.dataset.result === 'nothing'", timeout=8000, what='nothing to take is said')
    lines = [norm(T('pickupMissing').replace('{z}', zname('fr')).replace('{s}', s_sia).replace('{e}', 'export_xml_bd_SIA_*.zip')), norm(miss_txt)]
    c.eq([norm(c.text('[data-build-result] b')), [norm(t) for t in c.js("[...document.querySelectorAll('[data-build-result] [data-line]')].map(p => p.textContent)")], c.count('.f-modal'), len(st['posts']) - n,
          c.count('[data-build-result] [data-pickup-hint]'), len(_notes_with(c, T('nothing', 'pickupSum: {')))],
         [norm(T('nothing', 'pickupSum: {')), lines, 0, 1, 0, 1], 'no file found: the sentence and each missing pattern, no question, no second job, no hint', what='nothing')
    # ---- E: a zip too large and a zip with nothing useful: the failures are named; a partial end
    big = {'zone': 'gb', 'source': 'nats', 'error': 'zip over 500 MB'}
    plan2 = _pk_plan([sia_zip], [], [big], jid='k4')
    real2 = _pk_plan([sia_zip], [], [big], dry=False, jid='k5', reason='partial')
    st['views'], st['i'], st['start'] = [plan2, real2], 0, (200, {'job': 'k4'})
    c.tap(pk)
    q = _ask_text(c)
    big_txt = T('pickupFailedLine').replace('{z}', zname('gb')).replace('{s}', s_nats).replace('{r}', T('pickupTooLarge').replace('{n}', '500'))
    c.eq(norm(q['text']), norm(T('pickupAsk').replace('{taken}', taken_txt).replace('{missing}', f' {big_txt}.').replace('{to}', 'data/sia/')), 'the failure is in the question: the size message in words', what='question 2')
    st['start'] = (200, {'job': 'k5'})
    c.tap('.f-modal [data-ok]')
    c.until("document.querySelector('[data-build-result][data-op=pickup]')?.dataset.result === 'partial'", timeout=10000, what='the partial end')
    partial = T('partial', 'pickupSum: {').replace('{n}', f"3 {FILES[lang][1]}").replace('{s}', _size(5242880, lang)).replace('{f}', T('fetchFails', row=0).replace('{n}', '1'))
    c.eq([norm(c.text('[data-build-result] b')), [norm(t) for t in c.js("[...document.querySelectorAll('[data-build-result] [data-line]')].map(p => p.textContent)")], c.count('[data-build-result] [data-pickup-hint]')],
         [norm(partial), [norm(big_txt)], 1], 'partial: what was taken, the failure named, the hint (files were taken)', what='partial')
    # ---- F: the manual sources of a download that the launcher can take carry a button
    man = [{'zone': 'fr', 'source': 'sia', 'url': 'https://www.sia.example/aip', 'name': ['SIA fr', 'SIA en', 'SIA de', 'SIA es'], 'pickup': True, 'expected': 'export_xml_bd_SIA_*.zip'},
           {'zone': 'gb', 'source': 'nats', 'name': ['NATS fr', 'NATS en', 'NATS de', 'NATS es'], 'pickup': True, 'expected': 'EG_*_DS_*_XML.zip'},
           {'zone': 'fr', 'source': 'dircam', 'name': ['DIRCAM fr', 'DIRCAM en', 'DIRCAM de', 'DIRCAM es']}]
    fend = _fview({'fr': _fz('done', 1, 1), 'gb': _fz('done', 1, 1)}, state='done', verb='fetch', jid='f1', done=2,
                  result={'ok': True, 'fetched': ['fr', 'gb'], 'unchanged': [], 'failed': [], 'manual': man, 'outside_sync': 0, 'warnings': []})
    st['views'], st['i'], st['start'] = [fend], 0, (200, {'job': 'f1'})
    c.tap('[data-build] [data-verb=download]')
    c.until("!!document.querySelector('[data-build-result][data-op=fetch]')", timeout=10000, what='the download ends')
    items = c.js("[...document.querySelectorAll('[data-build-result] [data-manual-list] li')].map(li => [li.dataset.manual, li.textContent.replace(/\\s+/g, ' ').trim()])")
    c.eq([i[0] for i in items], ['fr:sia', 'gb:nats', 'fr:dircam'], 'the three manual sources', what='manual')
    c.eq(['export_xml_bd_SIA_*.zip' in items[0][1], 'EG_*_DS_*_XML.zip' in items[1][1], '*' in items[2][1]], [True, True, False], 'the expected name is shown for the sources the launcher can take, not for the others', what='expected')
    rb = "[data-build-result] [data-verb=pickup]"
    c.eq([c.count(rb), norm(c.text(rb)), c.attr(rb, 'data-zones'), c.js(f"document.querySelector('{rb}').disabled")], [1, norm(T('pickup')), 'fr,gb', False], 'one button under the list, for the zones of the sources that can be taken', what='result button')
    st['views'], st['i'], st['start'] = [_pk_plan([sia_zip], [miss_gb], jid='k6')], 0, (200, {'job': 'k6'})
    n = len(st['posts'])
    c.tap(rb)
    _ask_text(c)
    c.eq({k: st['posts'][n][k] for k in ('set', 'verb', 'args')}, {'set': 'base', 'verb': 'pickup', 'args': {'zones': ['fr', 'gb'], 'dry': True}}, 'the button starts the same plan for those zones', what='button body')
    c.tap('.f-modal [data-no]')
    c.until("!document.querySelector('.f-modal')", what='the window closes')
    # ---- H: a zip arrived during the question: the launcher refuses that source (changed), the other is taken; « Relancer le plan » asks the plan again
    nats_zip = {'zone': 'gb', 'source': 'nats', 'zip': 'EG_2026_DS_1_XML.zip', 'size': 2097152, 'files': ['n.xml'], 'bytes': 4194304}
    changed = {'zone': 'gb', 'source': 'nats', 'error': 'changed', 'zip': 'EG_2026_DS_2_XML.zip<b>', 'size': 3145728}
    plan3 = _pk_plan([sia_zip, nats_zip], [], [], jid='h1')
    real3 = _pk_plan([sia_zip], [], [changed], dry=False, jid='h2', reason='partial')
    st['views'], st['i'], st['start'] = [plan3, real3], 0, (200, {'job': 'h1'})
    n = len(st['posts'])
    c.tap(pk)
    _ask_text(c)
    st['start'] = (200, {'job': 'h2'})
    c.tap('.f-modal [data-ok]')
    c.until("document.querySelector('[data-build-result][data-op=pickup]')?.dataset.result === 'partial'", timeout=10000, what='the partial end')
    c.eq(st['posts'][-1]['args'], {'zones': ['fr', 'gb'], 'dry': False, 'zips': {'sia': {'name': sia_zip['zip'], 'size': 3000000}, 'nats': {'name': nats_zip['zip'], 'size': 2097152}}},
         'the real body carries both zips of the plan, equal to what it showed', what='real body 2')
    chg = T('pickupChanged').replace('{z}', zname('gb')).replace('{s}', s_nats).replace('{zip}', changed['zip'])
    c.eq([[norm(t) for t in c.js("[...document.querySelectorAll('[data-build-result] [data-line]')].map(p => p.textContent)")], c.count('[data-build-result] b b'),
          norm(c.text('[data-build-result] [data-verb=pickup-replan]')), c.attr('[data-build-result] [data-verb=pickup-replan]', 'data-zones')],
         [[norm(chg)], 0, norm(T('pickupReplan')), 'gb'], 'the refusal is said with the newest name (as text, escaped), with a « Relancer le plan » button for that zone', what='changed')
    taken_one = T('partial', 'pickupSum: {').replace('{n}', f"3 {FILES[lang][1]}").replace('{s}', _size(5242880, lang)).replace('{f}', T('fetchFails', row=0).replace('{n}', '1'))
    c.eq(norm(c.text('[data-build-result] b')), norm(taken_one), 'the other source was taken', what='partial summary')
    plan4 = _pk_plan([{**nats_zip, 'zip': changed['zip'].replace('<b>', ''), 'size': 3145728}], [], [], jid='h3', zones=('gb',))
    st['views'], st['i'], st['start'] = [plan4], 0, (200, {'job': 'h3'})
    n = len(st['posts'])
    c.tap('[data-build-result] [data-verb=pickup-replan]')
    _ask_text(c)
    c.eq({k: st['posts'][n][k] for k in ('set', 'verb', 'args')}, {'set': 'base', 'verb': 'pickup', 'args': {'zones': ['gb'], 'dry': True}}, 'the button starts a new dry run (no zips), for that zone', what='replan')
    c.tap('.f-modal [data-no]')
    c.until("!document.querySelector('.f-modal')", what='the window closes')
    # ---- H2: a source the launcher did not see in zips (not-shown, 8965e8c47): said like « changed », with « Relancer le plan »
    nshown = {'zone': 'gb', 'source': 'nats', 'error': 'not-shown', 'zip': 'EG_2026_DS_3_XML.zip'}
    st['views'], st['i'], st['start'] = [plan3, _pk_plan([sia_zip], [], [nshown], dry=False, jid='h5', reason='partial')], 0, (200, {'job': 'h4'})
    c.tap(pk)
    _ask_text(c)
    st['start'] = (200, {'job': 'h5'})
    c.tap('.f-modal [data-ok]')
    c.until("document.querySelector('[data-build-result][data-op=pickup]')?.dataset.result === 'partial'", timeout=10000, what='the partial end (not-shown)')
    ns = T('pickupNotShown').replace('{z}', zname('gb')).replace('{s}', s_nats).replace('{zip}', nshown['zip'])
    c.eq([[norm(t) for t in c.js("[...document.querySelectorAll('[data-build-result] [data-line]')].map(p => p.textContent)")],
          c.attr('[data-build-result] [data-verb=pickup-replan]', 'data-zones')], [[norm(ns)], 'gb'],
         'a source not shown in the plan is said, nothing taken for it, with « Relancer le plan »', what='not-shown')
    # ---- I: a zip whose name is outside the rule (an accent): shown in the plan, never run; the other source is taken
    bad_zip = {**sia_zip, 'zip': 'export_xml_bd_SIA_é.zip'}
    plan5 = _pk_plan([bad_zip, nats_zip], [], [], jid='i1')
    real5 = _pk_plan([nats_zip], [], [], dry=False, jid='i2', zones=('gb',))
    st['views'], st['i'], st['start'] = [plan5, real5], 0, (200, {'job': 'i1'})
    n = len(st['posts'])
    c.tap(pk)
    q = _ask_text(c)
    rename = T('pickupRename').replace('{z}', zname('fr')).replace('{s}', s_sia).replace('{zip}', bad_zip['zip'])
    nats_txt = T('pickupTaken').replace('{z}', zname('gb')).replace('{s}', s_nats).replace('{zip}', nats_zip['zip']).replace('{n}', f"1 {FILES[lang][0]}").replace('{b}', _size(4194304, lang))
    c.eq(norm(q['text']), norm(T('pickupAsk').replace('{taken}', nats_txt).replace('{missing}', f' {rename}.').replace('{to}', 'data/sia/zones/gb/')),
         'the plan shows the zip with the bad name as « nom de fichier à renommer » and lists only the ready one as to be taken', what='question rename')
    st['start'] = (200, {'job': 'i2'})
    c.tap('.f-modal [data-ok]')
    c.until("document.querySelector('[data-build-result][data-op=pickup]')?.dataset.result === 'done'", timeout=10000, what='the end')
    c.eq(st['posts'][-1]['args'], {'zones': ['gb'], 'dry': False, 'zips': {'nats': {'name': nats_zip['zip'], 'size': 2097152}}},
         'the real run carries only the ready source: its zone and its zip', what='real body 3')
    c.eq([norm(t) for t in c.js("[...document.querySelectorAll('[data-build-result] [data-line]')].map(p => p.textContent)")], [norm(rename)], 'and the end still says what was not taken', what='rename line')
    # none ready: no question, nothing run, the line is shown
    plan6 = _pk_plan([bad_zip], [], [], jid='i3', zones=('fr',))
    st['views'], st['i'], st['start'] = [plan6], 0, (200, {'job': 'i3'})
    n = len(st['posts'])
    c.tap('[data-build] [data-verb=pickup]')
    c.until("document.querySelector('[data-build-result][data-op=pickup]')?.dataset.result === 'blocked'", timeout=8000, what='nothing ready is said')
    c.eq([norm(c.text('[data-build-result] b')), [norm(t) for t in c.js("[...document.querySelectorAll('[data-build-result] [data-line]')].map(p => p.textContent)")], c.count('.f-modal'), len(st['posts']) - n],
         [norm(T('blocked', 'pickupSum: {')), [norm(rename)], 0, 1], 'no ready source: no question, the line to rename, only the plan was called', what='blocked')
    # a suite update in progress refuses every start: said, the button stays live
    st['start'] = (409, {'reason': 'updating', 'message': 'no job starts now (updating)'})
    n = len(st['posts'])
    c.tap('[data-build] [data-verb=pickup]')
    c.until("!!document.querySelector('[data-build-result][data-refusal=updating]')", timeout=6000, what='the refusal is said')
    c.eq([norm(c.text('[data-build-result]')), c.js(f"document.querySelector('{pk}').disabled"), len(st['posts']) - n], [norm(T('updating', 'refused: {')), False, 1], 'a plan refused during an update of the suite: the sentence, nothing runs', what='updating')
    st['start'] = (200, {'job': 'k1'})
    # ---- G: a launcher that does not know base/pickup: grey, the reason written once under the panel; the others live
    st['verbs'] = BASE3
    c.page.reload(wait_until='load')
    _head(c)
    _all_open(c)
    c.eq([c.js(f"document.querySelector('{pk}').disabled"), _bv(c), norm(c.text('[data-build] [data-pickup-reason]')), c.count('[data-build] [data-reason]')],
         [True, ['download', 'build', 'purge'], norm(T('unknown-verb', 'greyReason: {')), 0], 'unknown to this launcher: the button is grey with the usual reason, the three others are live', what='unknown')
    _screen_ok(c, 'old launcher')
    c.check_errors()


# ------------------------------------------------------------------------------------------------------ L20
_FAILOUT_JS = """(() => { try { if (sessionStorage.getItem('__failOutlines') && window.__stub) window.__stub.fail.push('zoneOutlines') } catch {} })()"""
_REALUS_JS = """(() => { try { if (sessionStorage.getItem('__realUs') && window.__stub) window.__stub.outlines.us.rings = [[[12, 45], [24, 45], [24, 46], [18, 47], [12, 47], [12, 45]]] } catch {} })()"""
_RESIZE_JS = """(() => { window.__mapResize = 0; const a = window.addEventListener, r = window.removeEventListener;
  window.addEventListener = function (t, f, o) { if (t === 'resize' && String(f).includes('mapWidth')) window.__mapResize++; return a.call(this, t, f, o) };
  window.removeEventListener = function (t, f, o) { if (t === 'resize' && String(f).includes('mapWidth')) window.__mapResize--; return r.call(this, t, f, o) } })()"""
_ZONE_NAMES = {'fr': ['France', 'France', 'Frankreich', 'Francia'], 'gb': ['Royaume-Uni', 'United Kingdom', 'Vereinigtes Königreich', 'Reino Unido'],
               'es': ['Espagne', 'Spain', 'Spanien', 'España'], 'us': ['États-Unis', 'United States', 'Vereinigte Staaten', 'Estados Unidos']}
# flat rectangles, 2 degrees tall: wide enough for a finger on a desktop, too thin for one on a phone
_RECTS = {'fr': [0, 45, 12, 47], 'gb': [-12, 45, 0, 47], 'es': [-12, 43, 0, 45], 'us': [12, 45, 24, 47]}
_NO_RINGS = ('us',)   # the outline of these stubbed zones is only their frame (no ring)


def _outlines():
    """What the stubbed ctx.aerodb.zoneOutlines() answers: the shape of the real one ({ name ×4, rings, box })."""
    return {z: {'name': _ZONE_NAMES[z], 'rings': [] if z in _NO_RINGS else [[[w, s], [e, s], [e, n - 1], [w, n], [w, s]]], 'box': [w, s, e, n]} for z, (w, s, e, n) in _RECTS.items()}


_L20_JS = r"""async () => {
  const M = await import('/modules/data/model.js');
  const out = {};
  out.tone = [{ inCoverage: false }, { inCoverage: true, running: true, published: true }, { inCoverage: true, published: false }, { inCoverage: true, published: true, stale: true },
    { inCoverage: true, published: true, stale: false }, { inCoverage: false, running: true }].map(M.mapTone);
  const sq = (id, w, s, e, n) => ({ id, rings: [[[w, s], [e, s], [e, n], [w, n], [w, s]]], box: [w, s, e, n] });
  const one = M.zoneMap([sq('a', 0, 0, 10, 10)], 400);
  out.one = [one.vb, one.shapes.map(s => s.id), one.shapes[0].d.startsWith('M0 0L') && one.shapes[0].d.endsWith('Z'), one.small, one.h <= 260.0001];
  const flat = [sq('fr', 0, 45, 12, 47), sq('gb', -12, 45, 0, 47)];
  out.flat = [M.zoneMap(flat, 1000).small, M.zoneMap(flat, 350).small, M.zoneMap([], 400), M.zoneMap(null, 400), M.zoneMap([{ id: 'x', rings: [], box: [0, 0, 'a', 1] }], 400), M.zoneMap(flat, 0).small];
  out.zones = [M.PROC_ZONES, M.MAP_MIN_PX];
  return out;
}"""


@case('L20', 'Données: the map of the zones to tick (one selection with the list, tokens, words for the state, 44 px rule, keyboard, no map without outlines, listener removed)',
      'L', tags=('data',), langs4=True, designs=('standard',),
      rule='modules/data/SPEC 3 (the screen); ergonomics: one writer, never colour alone, 44 px')
def l20(c):
    lang = c.lang
    li = {'fr': 0, 'en': 1, 'de': 2, 'es': 3}[lang]
    T = lambda key, after=None, row=0: _trow(key, lang, after, row)
    tone = lambda t: T(t, 'mapTone: {')
    # ---- A: the pure functions (projection, 5 % margin, the 44 px rule, tones)
    c.page.goto(f'{c.base}/frame/manifest.webmanifest', wait_until='load')
    r = c.js(_L20_JS)
    c.eq(r['tone'], ['muted', 'accent', 'warn', 'warn', 'ok', 'muted'], 'a zone outside the coverage is muted, a running one accent, nothing published or a cycle gone by warn, else ok', what='mapTone')
    vb, ids, path_ok, small, h_ok = r['one']
    c.ok(abs(vb[0] + 0.498) < 0.002 and vb[1] == -10.5 and abs(vb[2] - 10.958) < 0.002 and vb[3] == 11, vb, 'equirectangular x = lon·cos φ0, y = −lat, 5 % margin all round')
    c.eq([ids, path_ok, small, h_ok], [['a'], True, False, True], 'one path per zone, projected rings closed, a big square is not small, the height is bounded', what='zoneMap one')
    c.eq(r['flat'], [False, True, None, None, None, True], 'two thin zones: tickable at 1000 px, too small for a finger at 350 px; no zone, no map; an unreadable box is dropped; no width: small', what='zoneMap small')
    c.eq(r['zones'], [{'LF': ['fr'], 'K': ['us']}, 44], 'the States draw France and the United States; 44 px', what='constants')
    # ---- B: the screen with the stubbed outlines
    cfg, _ = _fixture()
    cfg['outlines'] = _outlines()
    c.page.add_init_script(_RESIZE_JS)
    _open(c, cfg)
    c.page.add_init_script(_FAILOUT_JS)
    c.page.add_init_script(_REALUS_JS)
    _all_open(c)
    wide = c.js('window.innerWidth') >= 700
    names = {z: _ZONE_NAMES[z][li] for z in _ZONE_NAMES}
    list_ids = c.js("[...document.querySelectorAll('[data-build-zone]')].map(i => i.dataset.buildZone)")
    c.eq(list_ids, ['ca', 'es', 'fr', 'gb', 'us'], 'the list is what it was: every zone of the coverage', what='list')
    if not wide:
        c.wait(600)
        c.eq([c.count('[data-zone-map]'), c.count('[data-map-zone]'), len(c.js("[...document.querySelectorAll('[data-build-zone]')]")), c.js('window.__stub.calls.zoneOutlines > 0')], [0, 0, 5, True],
             'on a phone the thin zones would be smaller than 44 px: no map, nothing said, the list remains (the outlines were asked)', what='no map at 390')
        c.eq(c.count('[data-zone-legend]'), 0, 'no legend without the map', what='legend')
        c.check_errors()
        return
    c.until("!!document.querySelector('[data-zone-map=base]')", timeout=8000, what='the map of the zones is drawn')
    c.eq(c.js("[...document.querySelectorAll('[data-zone-map=base] [data-map-zone]')].map(p => p.dataset.mapZone)"), ['es', 'fr', 'gb', 'us'],
         'a path per zone of the panel that has an outline (the list still has Canada)', what='paths')
    c.eq(c.js("document.querySelectorAll('[data-zone-map=base] svg').length"), 1, 'inline SVG', what='svg')
    c.eq(c.js("(() => { const s = document.querySelector('[data-zone-map=base] svg').getBoundingClientRect(); return [s.width <= document.documentElement.clientWidth, s.height <= 261] })()"), [True, True], 'bounded: not wider than the screen, at most 260 px high', what='size')
    legend = norm(c.text('[data-zone-legend]'))
    c.ok(all(norm(tone(t)) in legend for t in ('ok', 'warn', 'accent', 'muted')) and norm(T('mapLegendNote')) in legend, legend, 'the one-line legend names each tone in words and says what ticked looks like')
    # roles, state in words (title and aria-label), tabindex
    fr = c.js("(() => { const p = document.querySelector('[data-map-zone=fr]'); return [p.getAttribute('role'), p.getAttribute('aria-checked'), p.tabIndex, p.getAttribute('aria-label'), p.querySelector('title').textContent, p.dataset.tone] })()")
    c.eq(fr, ['checkbox', 'true', 0, f"{names['fr']} — {tone('warn')}, {T('mapTicked')}", f"{names['fr']} — {tone('warn')}, {T('mapTicked')}", 'warn'],
         'role checkbox, keyboard reachable; the name AND the state in words (France is one cycle behind, ticked), in the title and the aria-label', what='fr attributes')
    # a zone whose outline is only its frame (no ring) is dashed and says so; a real outline is not
    ap = c.js("""() => [...document.querySelectorAll('[data-zone-map=base] [data-map-zone]')].map(p => [p.dataset.mapZone, getComputedStyle(p).strokeDasharray, p.hasAttribute('data-approx'), p.querySelector('title').textContent])""")
    c.eq([[a[0], a[1] != 'none', a[2]] for a in ap], [['es', False, False], ['fr', False, False], ['gb', False, False], ['us', True, True]], 'only the zone without ring is drawn with a dashed stroke', what='dashed')
    c.eq([a[3] for a in ap if a[0] == 'us'], [f"{names['us']} — {tone('ok')}, {T('mapTicked')}, {T('mapApprox')}"], 'and its title adds « contour approximatif » in words', what='approx words')
    c.ok(norm(T('mapLegendApprox')) in norm(c.text('[data-zone-legend]')), c.text('[data-zone-legend]'), 'the legend gains « pointillé : contour approximatif » since such a zone is drawn')
    # the colours are the frame's tokens
    col = c.js("""() => { const probe = t => { const s = document.createElement('span'); s.style.color = 'var(--sog-' + t + ')'; document.body.append(s); const v = getComputedStyle(s).color; s.remove(); return v };
      const g = z => { const cs = getComputedStyle(document.querySelector('[data-map-zone=' + z + ']')); return [cs.fill, cs.stroke] };
      return { warn: probe('warn'), ok: probe('ok'), fr: g('fr'), gb: g('gb'), sw: [...document.querySelectorAll('[data-zone-legend] .d-sw')].map(e => getComputedStyle(e).backgroundColor), tok: ['ok', 'warn', 'accent', 'muted'].map(probe) } }""")
    c.eq([col['fr'], col['gb']], [[col['warn'], col['warn']], [col['ok'], col['ok']]], 'colours by computed style equal the tokens: --sog-warn for the stale zone, --sog-ok for an up-to-date one (fill and stroke)', what='tokens')
    c.eq(col['sw'], col['tok'] * 2, 'the legend swatches (one legend per map) are the same tokens', what='swatches')
    widths = c.js("[...document.querySelectorAll('[data-map-zone]')].map(p => [p.dataset.mapZone, getComputedStyle(p).strokeWidth, getComputedStyle(p).fillOpacity])")
    c.ok(all(w[1] == '3px' and float(w[2]) > 0.5 for w in widths if w[0] in ('fr', 'gb', 'es', 'us')), widths, 'every zone starts ticked: thick stroke and a solid tint, not colour alone')
    # ---- C: a click toggles the selection the list reads, both redrawn from it
    c.tap('[data-map-zone=fr]')
    c.eq([c.js("document.querySelector('[data-build-zone=fr]').checked"), c.attr('[data-map-zone=fr]', 'aria-checked'), c.js("getComputedStyle(document.querySelector('[data-map-zone=fr]')).strokeWidth")], [False, 'false', '1px'],
         'a click unticks the zone: the checkbox, the path and its stroke follow the same state', what='click off')
    c.eq(c.attr('[data-map-zone=fr]', 'aria-label'), f"{names['fr']} — {tone('warn')}", 'unticked: the label drops « ticked »', what='label off')
    c.tap('[data-map-zone=fr]')
    c.eq([c.js("document.querySelector('[data-build-zone=fr]').checked"), c.attr('[data-map-zone=fr]', 'aria-checked')], [True, 'true'], 'and back', what='click on')
    c.tap('[data-build-zone=gb]')
    c.eq(c.attr('[data-map-zone=gb]', 'aria-checked'), 'false', 'the list changes the selection: the map follows', what='list to map')
    c.tap('[data-build-zone=gb]')
    # keyboard
    c.page.focus('[data-map-zone=es]')
    c.page.keyboard.press('Space')
    c.eq([c.attr('[data-map-zone=es]', 'aria-checked'), c.js("document.querySelector('[data-build-zone=es]').checked"), c.js("document.activeElement.dataset.mapZone")], ['false', False, 'es'], 'Space toggles the focused zone, the focus stays on it', what='space')
    c.page.keyboard.press('Enter')
    c.eq([c.attr('[data-map-zone=es]', 'aria-checked'), c.js("document.querySelector('[data-build-zone=es]').checked")], ['true', True], 'Enter toggles it back', what='enter')
    # ---- D: the States map (France and the United States)
    c.until("!!document.querySelector('[data-zone-map=proc]')", timeout=8000, what='the map of the States is drawn')
    c.eq(c.js("[...document.querySelectorAll('[data-zone-map=proc] [data-map-zone]')].map(p => [p.dataset.mapZone, p.getAttribute('aria-checked')])"), [['K', 'false'], ['LF', 'false']], 'the States with a bulk source, none ticked', what='proc paths')
    c.tap('[data-zone-map=proc] [data-map-zone=K]')
    c.eq([c.js("document.querySelector('[data-set-panel=proc] [data-item=K]').checked"), c.js("document.querySelector('[data-set-panel=proc] [data-item=LF]').checked"),
          c.attr('[data-zone-map=proc] [data-map-zone=K]', 'aria-label')], [True, False, f"{K_NAME[lang]} — {tone('ok')}, {T('mapTicked')}, {T('mapApprox')}"],
         'a click on the United States ticks the State K in the panel\'s selection', what='proc click')
    # ---- E: a running operation freezes the map as it freezes the list
    st = _launcher(c, [_view(step='Zone fr', done=0, zones={'fr': _zs('building', 1, 4), 'es': _zs('waiting')})], verbs=BASE3)
    c.page.reload(wait_until='load')
    _head(c)
    _all_open(c)
    c.until("!!document.querySelector('[data-zone-map=base]')", timeout=8000, what='the map is drawn again')
    _untick(c, 'ca', 'gb', 'us')
    c.tap('[data-build] [data-verb=build]')
    c.until("!!document.querySelector('[data-build] [data-running]')", what='a build runs')
    c.eq([c.attr('[data-map-zone=fr]', 'aria-disabled'), c.attr('[data-map-zone=gb]', 'aria-disabled')], ['true', 'true'], 'frozen while it runs', what='frozen')
    c.until("document.querySelector('[data-map-zone=fr]')?.dataset.tone === 'accent'", timeout=6000, what='the running zone takes the accent tone')
    c.eq(c.js("(() => { const s = document.createElement('span'); s.style.color = 'var(--sog-accent)'; document.body.append(s); const v = getComputedStyle(s).color; s.remove(); return getComputedStyle(document.querySelector('[data-map-zone=fr]')).fill === v })()"),
         True, 'the accent token', what='accent')
    before = c.attr('[data-map-zone=es]', 'aria-checked')
    c.js("document.querySelector('[data-map-zone=es]').dispatchEvent(new MouseEvent('click', { bubbles: true }))")
    c.eq(c.attr('[data-map-zone=es]', 'aria-checked'), before, 'a click while it runs changes nothing', what='click frozen')
    # ---- F: the listener is there once and goes with the module
    c.eq(c.js('window.__mapResize'), 1, 'one resize listener while the module is mounted', what='listener')
    ids = c.js("[...document.querySelectorAll('#fMenu a[data-id]')].map(a => a.dataset.id)")
    other = next((i for i in ids if i != 'data'), None)
    c.ok(other is not None, ids, 'the Maintenance rail has another entry to leave the module')
    c.tap(f'#fMenu a[data-id="{other}"]')
    c.until("!document.querySelector('[data-module=data]')", timeout=8000, what='the module is unmounted')
    c.eq(c.js('window.__mapResize'), 0, 'the listener is removed at unmount', what='listener removed')
    # ---- G2: a real outline for the same zone: no dash, no words, no legend item
    c.page.evaluate("sessionStorage.setItem('__realUs', '1')")
    c.open('data', docs=LEVEL3, wait=False, app='maintenance')
    _head(c)
    _all_open(c)
    c.until("!!document.querySelector('[data-zone-map=base]')", timeout=8000, what='the map is drawn again')
    c.eq([c.count('[data-map-zone][data-approx]'), c.js("getComputedStyle(document.querySelector('[data-zone-map=base] [data-map-zone=us]')).strokeDasharray"),
          c.attr('[data-zone-map=base] [data-map-zone=us]', 'aria-label'), norm(T('mapLegendApprox')) in norm(c.text('[data-zone-legend]'))],
         [0, 'none', f"{names['us']} — {tone('ok')}, {T('mapTicked')}", False], 'a ring that is not the frame: solid stroke, no « contour approximatif », no legend item', what='real outline')
    # ---- G: a failing zoneOutlines: the list alone, no error line
    c.page.evaluate("sessionStorage.setItem('__failOutlines', '1')")
    c.open('data', docs=LEVEL3, wait=False, app='maintenance')   # back on the module (the init scripts stay), now with a failing zoneOutlines
    _head(c)
    _all_open(c)
    c.wait(800)
    c.eq([c.count('[data-zone-map]'), c.count('[data-map-zone]'), c.count('[data-build-zone]'), c.count('[data-error]'), c.js('window.__stub.calls.zoneOutlines >= 1')], [0, 0, 5, 0, True],
         'zoneOutlines throws: no map, the list is all there is, no error line', what='failure')
    c.check_errors()


K_NAME = {'fr': 'États-Unis', 'en': 'United States', 'de': 'Vereinigte Staaten', 'es': 'Estados Unidos'}
