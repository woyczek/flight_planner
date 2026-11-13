"""Area L - the Données module: a read-only screen and its first action, Construire (modules/data/SPEC.md sections 3, 5.4, 6.2, 6.5, 9; INTEGRATION.md section 2).

Rules covered
  * L18 « Tout mettre à jour » (SPEC § 5.3) against the fake launcher: the plan question and its No, the eight jobs in the published order then ONE sync with the
    gesture and one notification, the stop at the first failure (nothing published), Arrêter mid-chain, the skipped sets with their reasons, the chain interrupted by a
    reload, the attention mark of a published cycle gone by on Construire and on the button.
  * L19 « Prendre le fichier téléchargé » (base/pickup) against the fake launcher: the fourth verb of the base panel, the plan (dry sent) then ONE question (zip found, file
    missing with its pattern, where the files go), No takes nothing, Yes sends dry false, the summary and the hint, one journal entry, nothing found says the missing files
    without a question, a partial end, the button under the manual sources of a download, grey when the launcher does not know the verb.
  * L20 the map of the zones to tick, on the shared map base (stubbed ctx.aerodb.zoneOutlines, the tiles' style stubbed to a background): a tap on a polygon ticks the zone and the list follows
    (one selection), a drag ticks nothing, « Recentrer » frames the zones again, the frame's tokens for the colours, the state in words in the legend, frozen while an operation runs, no map
    when the base does not come or the outlines are missing (the list alone, no error line), the resize listener and the maps removed at unmount.
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
import time
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
  pub.base.fr.cycleSource = 'sia'; pub.base.gb.cycleSource = 'nats'; pub.base.es.cycleSource = 'enaire';   // the lot C field: which source dates each zone (SOG-0026)
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
    # cycleSource (AeroDB lot C): the source that dates the zone's cycle ('sia' France, 'nats' United Kingdom, 'enaire' Spain, null for the others)
    zone = lambda d, v, src=None: {'inForce': d.isoformat(), 'cycleSource': src, 'cycles': {d.isoformat(): {'parserVersion': v, 'at': f'{today.isoformat()}T08:00:00Z', 'by': 'ABC', 'format': 'split'}}}
    zones = [{'id': i, 'names': n, 'frames': [], 'published': p} for i, n, p in [
        ('ca', ['Canada', 'Canada', 'Kanada', 'Canadá'], True), ('es', ['Espagne', 'Spain', 'Spanien', 'España'], True),
        ('fr', ['France', 'France', 'Frankreich', 'Francia'], True), ('gb', ['Royaume-Uni', 'United Kingdom', 'Vereinigtes Königreich', 'Reino Unido'], True),
        ('us', ['États-Unis', 'United States', 'Vereinigte Staaten', 'Estados Unidos'], True), ('de', ['Allemagne', 'Germany', 'Deutschland', 'Alemania'], False)]]
    pub = {
        'base': {'fr': zone(prev, 19, 'sia'), 'gb': zone(cur, 18, 'nats'), 'es': zone(cur, 19, 'enaire'), 'us': zone(cur, 19), 'ca': zone(cur, 19)},
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
    A.aerodromes = async q => { const k = window.__stub.calls = window.__stub.calls || {}; k.aerodromes = (k.aerodromes || 0) + 1; (window.__stub.aeroQ = window.__stub.aeroQ || []).push(q); return window.__stub.aero || [] };
    A.coverage = async icao => window.__stub.cov?.[icao] ?? null;
    // memo: what aerodb really does (published() keeps the list of zones until refresh() or its reader's watcher says it changed): publication() answers the first state until refresh()
    A.publication = async () => { const k = window.__stub.calls = window.__stub.calls || {}; k.publication = (k.publication || 0) + 1; if (window.__stub.fail.includes('publication')) throw new Error('stub: publication');
      return window.__stub.memo ? (window.__stub.memoPub ||= JSON.parse(JSON.stringify(window.__stub.publication))) : window.__stub.publication };
    A.refresh = () => { const k = window.__stub.calls = window.__stub.calls || {}; k.refresh = (k.refresh || 0) + 1; window.__stub.memoPub = null };
    if (cfg.nat) { const cnt = n => { const k = window.__stub.calls = window.__stub.calls || {}; k[n] = (k[n] || 0) + 1 }; A.natState = async () => { cnt('natState'); return window.__stub.nat.state }; A.natEnsure = async () => { cnt('natEnsure'); const n = window.__stub.nat; if (n.busy) return { ...n.state, refreshed: false, busy: true, running: n.running }; if (n.ensure && n.ok !== false) n.state = n.ensure; return { ...n.state, refreshed: true, ok: n.ok !== false } } }   // the NAT tracks of aerodb (SOG-0263): natState() says the validity, natEnsure() takes them again
    if (cfg.packs) A.packs = async () => cfg.packs;   // the country packs of aerodb (packs(), SOG-0065): absent unless the case gives them
    A.zones = ok('zones', 'zones'); A.coverageByState = ok('coverageByState', 'states'); if (!cfg.realOutlines) A.zoneOutlines = ok('zoneOutlines', 'outlines');
    // Portugal's catalogue entry (SOG-0244): 'pick' = the source the user takes by hand from the start (fetch.pick + its step-by-step), 'nopick' = an ordinary downloaded source (the cases of the plain line)
    const navpt = r => { const e = r?.byId?.('navpt'); if (!e || !cfg.navpt) return;
      if (cfg.navpt === 'nopick') { if (e.fetch) delete e.fetch.pick; return }
      if (e.fetch?.pick) return;
      e.fetch = { how: 'launcher', provider: 'navpt', pick: { glob: '*.zip|*.iso', name: 'EAIP ISO.zip' } };
      e.steps = { page: { url: 'https://www.nav.pt/ais', home: 'https://www.nav.pt/' }, files: [{ name: 'AIP Portugal (eAIP hors ligne)', gives: ['L\u2019AIP du Portugal hors ligne', 'The Portuguese AIP offline', 'Der portugiesische AIP offline', 'El AIP de Portugal sin conexi\u00f3n'] }] } };
    // the catalogue of aerodb 5cc4e909b: stepsOf(id).files[] carries { file, link?, what[4], where[4], verified } and AeroCatalogue.PATH_TO_CHECK; a case gives its own steps (cfg.stepsOf: { id: steps }) so the suite does not depend on the catalogue's links
    const steps = r => { if (!cfg.stepsOf) return; const so = r.stepsOf; r.stepsOf = (id, cy) => cfg.stepsOf[id] || so.call(r, id, cy); if (cfg.pathCheck) r.PATH_TO_CHECK = cfg.pathCheck };
    const s = A.sources; A.sources = async () => { const r = await s.call(A); navpt(r); steps(r); if (cfg.pv) return { ...r, PARSER_VERSION: cfg.pv }; const { PARSER_VERSION, ...rest } = r; return rest };  // pv null: the catalogue without its constant (aerodb has carried one since 567b94440)
    const on = A.on; A.on = function (ev, fn) { const un = on.call(A, ev, fn); if (ev === 'change') window.__stub.fns.add(fn); return () => { window.__stub.fns.delete(fn); un() } };
    return A };
  Object.defineProperty(window, 'AeroDB', { configurable: true, get() { return ab },
    set(v) { ab = v; if (v && v.create && !v.__data) { const o = v.create; v.__data = 1; v.create = function (...a) { return patch(o.apply(this, a)) } } } }) })()""" % json.dumps(cfg)


def _open(c, cfg, target='data', my_coverage=True):
    c.page.add_init_script(_stub(cfg))
    c.open(target, docs=LEVEL3, wait=False, app='maintenance')  # le module Données est dans l'application Maintenance
    c.until("!!document.querySelector('[data-module=data] [data-data-head]')", timeout=20000, what='the head of the Données screen is drawn')
    c.settle()
    if my_coverage:   # « Ma couverture » (the packs, the box « Je certifie… ») is folded when the screen opens (SOG-0262, lot C): the cases that act on them open it, the case of lot C leaves it folded (my_coverage=False)
        c.js("document.querySelectorAll('details[data-my-coverage]').forEach(d => { d.open = true })")


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
  return { groups, verbs: [...document.querySelectorAll('[data-build] [data-verb]:not([data-verb=pickup]):not([data-verb=update]):not([data-verb=all]):not([data-verb^=select]), [data-publish] [data-verb]')].map(b => b.dataset.verb + (b.disabled ? ':off' : '')), buttons: root.querySelectorAll('[data-build] button:not([data-verb=pickup]), [data-publish] button').length,
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
    c.eq(c.count('[data-coverage]'), 0, 'the old « Couverture » card is gone (D4: the map, the packs and « Ma couverture » say the coverage)', what='no coverage card')
    doc = c.until_doc('cache/data/coverage.json', lambda d: bool(d and d.get('zones')), what='the coverage is written at the first opening')
    c.eq(doc['zones'], ['ca', 'es', 'fr', 'gb', 'us'], 'every published zone is in the coverage at the first opening', what='coverage.json')
    # the States: seven lines, the rest under the fold, green / orange / red
    c.eq(c.count('[data-coverage], [data-states]'), 0, 'the old States list went with the « Couverture » card (D4): no line with the prefixes any more', what='no states list')
    # the groups
    m = c.js(_ROWS_JS)
    g = {x['id']: x for x in m['groups']}
    c.eq([x['id'] for x in m['groups']], ['proc', 'vfr', 'aircraft', 'weather', 'sources'], 'five folds (D4): the other sets, one line each, then the sources', what='groups')
    c.eq([x['title'] for x in m['groups']], [tx(TX, 'proc', lang, after='groups: {'), _trow('foldVfr', lang, after='  d4: {'), tx(TX, 'aircraft', lang, after='groups: {'), tx(TX, 'weather', lang, after='groups: {'), _trow('foldSources', lang, after='  d4: {')], 'the titles in the language of the run', what='group titles')
    c.eq([x['open'] for x in m['groups']], [False] * 5, 'nothing is unfolded by default (D4), even a set that needs attention: its state is on the line', what='open groups')
    for x in m['groups']:
        c.le(len(x['visible']), 7, f'group {x["id"]}', what='visible rows')
    c.eq(len(g['sources']['visible']), 7, 'the base has eleven used sets: seven visible', what='base rows visible')
    c.eq(g['sources']['more']['text'], norm(tx(TX, 'moreSets', lang).replace('{n}', '5')), 'five more under the fold: four used sets and the candidate Naviair', what='base fold')
    c.ok(sum(r.endswith(':used') for r in g['sources']['more']['rows']) == 4 and all(r.endswith((':used', ':candidate')) for r in g['sources']['more']['rows']), g['sources']['more']['rows'], 'the surplus of the base: the used sets, then the candidates after them (Naviair is a candidate of the catalogue)')
    c.eq(g['proc']['visible'], ['eaip', 'cifp', 'route'], 'procedures: eAIP and CIFP visible, then the route row (SOG-0125: one row more)', what='proc rows')
    c.eq(g['proc']['more']['rows'], ['ead:candidate', 'xpcifp:candidate', 'dfs:abandoned', 'eurocontrol:abandoned'], 'candidates, then set-aside sources: only in the fold, no state', what='proc fold')
    # the states of the rows (stale base for France, the parser constant 3 against UK zone at 2)
    allst = {}
    for x in m['groups']:
        allst.update(x['states'])
    allrows = [r for x in m['groups'] for r in x['visible']] + [r.split(':')[0] for x in m['groups'] if x['more'] for r in x['more']['rows'] if r.endswith(':used')]
    for rid, want in (('sia', 'stale-cycle'), ('openaip', 'stale-cycle'), ('ukmil', 'parser'), ('nats', 'parser'), ('enaire', 'ok'), ('eaip', 'ok'), ('aircraft', 'stale-age')):
        c.eq(allst.get(rid) or _open_and_state(c, rid), want, f'state of {rid}', what=f'data-state {rid}')
    c.eq(g['sources']['cycles'].get('sia'), _name(prev), 'the France row carries the cycle published (one behind)', what='data-cycle of sia')
    c.eq(g['weather']['states'], {'world': 'absent'}, 'the weather rows from the catalogue have no state; the only one is the world synoptic row (SOG-0138), made on the workstation: absent until published', what='weather states')
    c.eq(c.text('[data-set="ukmil"] .f-badge[data-pill]'), tx(TX, 'parser', lang, after='state: {'), 'the pill is worded in the language of the run', what='ukmil pill')
    # no action button anywhere, no horizontal scroll, 44 px on the summaries
    c.eq([m['verbs'], m['buttons'] - c.count('[data-act=update-pack]') - c.count('[data-act=grp-toggle]')], [['download:off', 'build:off', 'purge:off', 'publish:off'], 5],
         'the verbs are Télécharger · Tout recalculer · Purger (one panel) then Publier, all grey (no launcher in the suite); the 5 buttons count Mettre à jour and the world synoptic row (SOG-0262 lot C: the two country-pack tabs sit in the fold « Ma couverture », at the foot of the page) — the old count also had Mettre à jour, the two country-pack tabs and the world synoptic row « Construire » (SOG-0138) (the old « no Mettre à jour » is SOG-0071); the two selection gestures are gone (SOG-0262: no selection), the pack lines of the new list and their « Mettre à jour (n) » (SOG-0188) are counted apart', what='verbs / buttons')
    c.eq([c.attr('[data-publish] [data-reason]', 'data-reason'), norm(c.text('[data-publish] [data-reason]'))], ['no-launcher', norm(_trow('no-launcher', lang, 'greyReason: {'))],
         'Publier is grey for the same reason, written once', what='publish reason')
    c.eq(c.count('[data-group=base] > .d-page > [data-build] + [data-publish]'), 1, 'the Publier panel follows the Construire panel', what='panel order')
    # the build panel at the top of the base group: every zone of the coverage ticked, the personal sources unticked, the reason written once
    panel = c.js("""() => { const b = document.querySelector('[data-group=base] [data-build]'), my = document.querySelector('[data-group=base] [data-mycov-box]'); return b && {
      zones: [...b.querySelectorAll('[data-build-zone]')].map(i => [i.dataset.buildZone, i.checked]),
      personal: [[...my.querySelectorAll('[data-personal-row]')].map(r => r.dataset.personalRow), my.querySelector('[data-certify]')?.checked],
      lines: [...my.querySelectorAll('[data-personal-line]')].map(p => p.textContent.trim()),
      reasons: [...b.querySelectorAll('[data-reason]')].map(p => [p.dataset.reason, p.textContent.trim()]),
      labels: [...b.querySelectorAll('label.d-opt'), ...my.querySelectorAll('label.d-opt')].filter(l => l.offsetParent).map(l => Math.round(l.getBoundingClientRect().height)),
      btn: Math.round(b.querySelector('[data-verb=build]').getBoundingClientRect().height), first: b === document.querySelector('[data-group=base]').children[0].children[0],
      journal: (j => j && { open: j.open, h: Math.round(j.querySelector('summary').getBoundingClientRect().height), last: j === document.querySelector('[data-module=data] [data-body]').lastElementChild })(document.querySelector('[data-journal]')) } }""")
    c.ok(panel and panel['first'], panel, 'the build panel is the first thing in the content of the base group')
    c.eq(panel['zones'], [], 'no zone to tick any more (SOG-0262: the verbs of the base act on the whole coverage)', what='build zones')
    c.eq(panel['personal'], [['enaire', 'nats', 'xplane'], False], 'the three personal-licence sources are listed (every zone ticked feeds them), ONE certification box, unticked', what='personal sources')
    c.eq([norm(x) for x in panel['lines']], [norm(tx(TX, 'licence', lang, after='personalLine: {'))] * 2 + [norm(tx(TX, 'xplane', lang, after='personalLine: {'))],
         'the personal-use line, the X-Plane variant for X-Plane', what='personal lines')
    c.eq([[r[0], norm(r[1])] for r in panel['reasons']], [['no-launcher', norm(_trow('no-launcher', lang, 'greyReason: {'))]], 'the grey button says why, once', what='reason')
    c.ge(min(panel['labels'] + ([panel['btn']] if False else [])), 44 if c.phone else 31, 'every checkbox line is 44 px for a finger, 32 px for a fine pointer (SOG-0168)', what='touch height')
    c.ge(panel['btn'], 44, 'the button is 44 px', what='button height')
    c.eq([panel['journal']['open'], panel['journal']['last']], [False, True], 'the journal is the foot of the screen, folded', what='journal')
    c.ge(panel['journal']['h'], 44, 'its summary is a 44 px target', what='journal summary')
    c.le(m['sw'], m['iw'], 'no horizontal scroll', what='scrollWidth')
    c.ok(not m['over'], m['over'], 'no element beyond the right edge of the window')
    for x in m['groups']:
        c.ge(round(x['sumH']), 44, f'group summary {x["id"]}', what='summary height')
        for h in x['pills']:
            c.ge(round(h), 44, f'row summary in {x["id"]}', what='row summary height')
    # a row's detail unfolds: the link with its address, the licence
    c.js("document.querySelector('details[data-group=sources]').open = true")   # D4: the sources are one folded line
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
    c.eq(c.count('[data-build] [data-verb]:not([data-verb=pickup]):not([data-verb=update]):not([data-verb=all]):not([data-verb^=select]), [data-publish] [data-verb]'), 4, 'Télécharger, Construire, Purger and Publier, grey without a launcher', what='[data-verb]')
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
    c.eq(c.count('details.f-group'), 5, 'the five folds (procedures, VFR points, aircraft, weather, sources) are still drawn (names and links)', what='groups')
    c.eq(c.count('[data-set]:not([data-set=route]):not([data-set=world])[data-state]'), 0, 'no state is invented without a publication (the route and world rows take their own from the workstation: its memory, SOG-0125, and its weather/world status, SOG-0138)', what='states')
    c.eq(c.doc('cache/data/coverage.json'), None, 'a degraded read writes no coverage', what='coverage.json')
    c.eq(c.js("[...document.querySelectorAll('[data-build] [data-verb]:not([data-verb=pickup]):not([data-verb=update]):not([data-verb=all]):not([data-verb^=select]), [data-publish] [data-verb]')].map(b => b.dataset.verb + (b.disabled ? ':off' : ''))"), ['download:off', 'build:off', 'purge:off', 'publish:off'], 'Télécharger, Construire, Purger and Publier, grey', what='[data-verb]')
    c.check_errors()


# ------------------------------------------------------------------------------------------------------ L5
@case('L5', 'Données: fallbacks (no names, no held, no parser constant) and the States list follows aerodb { coverage: true }', 'L',
      tags=('data',), phone=False, rule='modules/data/SPEC 3 (the States list), 6.2 (no constant: never "old parser"); aerodb change signal { coverage: true }')
def l5(c):
    cfg, _ = _fixture(pv=None, shape=False)
    c.page.add_init_script("localStorage.setItem('sogFrame:dev', '1')")  # le module d'exemple : un autre module de Maintenance où aller
    _open(c, cfg)
    c.eq(c.count('[data-coverage], [data-states]'), 0, 'the old States list went with the « Couverture » card (D4): no line with the prefixes any more', what='no states list')
    c.eq(c.count('[data-set][data-state="parser"]'), 0, 'without the parser constant no row is ever "old parser" (the UK zone is at version 18)', what='parser pills')
    c.eq(c.count('[data-set]:not([data-set=route]):not([data-set=world])[data-state]'), c.count('[data-set][data-state="ok"], [data-set][data-state="stale-cycle"], [data-set][data-state="stale-age"]'),
         'the other states are the cycle ones', what='states without the constant')
    # aerodb announces { coverage: true }: nothing is redrawn that does not exist any more, nothing throws
    c.js("() => { document.querySelector('[data-set=sia]').dataset.keep = '1' }")
    c.js("""() => { const S = window.__stub; S.states = { ...S.states, LF: { level: 'green', reason: 'held', label: ['held-fr', 'held-en', 'held-de', 'held-es'], names: ['Fr', 'Fr', 'Fr', 'Fr'], held: 5 } };
      for (const fn of [...S.fns]) fn({ coverage: true }) }""")
    c.wait(500)
    c.eq(c.attr('[data-set="sia"]', 'data-keep'), '1', 'a change of the coverage does not redraw the rows of the sources', what='row element kept')
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
  out.zeroTotal = M.zonePhrase({ state: 'building', done: 0, total: 0 }).key;
  out.phrase = [undefined, { state: 'building', done: 2, total: 5 }, { state: 'building' }, { state: 'built' }, { state: 'failed', error: 'timeout' },
    { state: 'failed', error: 'zzz' }, { state: 'cancelled' }, { state: 'weird' }].map(z => { const p = M.zonePhrase(z); return [p.state, p.key, p.n, p.m, p.code] });
  out.rows = M.zoneRows({ zones: { fr: { state: 'built' }, us: { state: 'building', done: 1, total: 3 } } }, ['fr', 'gb']).map(r => [r.zone, r.key]);
  out.progress = [M.progress({ done: 2, total: 5 }, ['a']), M.progress(null, ['a', 'b']), M.progress({ done: 9, total: 5 }, []), M.progress(null, [])];
  out.clock = [0, 59, 125, -3, 3600].map(M.clock);
  out.isBuild = [{ zones: {} }, { set: 'base', verb: 'build' }, { state: 'done' }, null, { zones: [] }].map(v => { const o = M.viewOp(v); return !!o && o.set === 'base' && o.verb === 'build' });
  const z = s => ({ state: s }), zf = e => ({ state: 'failed', error: e });
  const o = f => { const r = M.outcome(f); return [r.kind, r.built, r.failed] };
  // the blocking sources and the cycle in force (aerodb 294ffc1b8): read, malformed values dropped; the SIA files' single `cycle` is no cycle of the zones
  out.cycleOut = [{ result: { cycle: '2026-10-01', current: '2026-10-29', stale: true, blocking: [{ zone: 'fr', source: 'sia', cycle: '2026-10-01' }] } }, { result: { cycle: '2026-10-01', current: '2026-10-29', stale: true } },
    { result: { current: '2026-10-29', blocking: [{ zone: 'fr' }, null, 'x', { zone: 'gb', source: 'nats', cycle: '01/10/2026' }] } }, { result: { current: 'x' } }, { result: {} }]
    .map(f => { const r = M.outcome(f); return [r.blocking.length, r.current, r.stale, 'cycle' in r] });
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
    c.eq(r['zeroTotal'], 'building', 'a zone with no count of its own (0 / 0) says « construction » with no number, never a global count', what='no own total')
    c.eq(r['phrase'], [['waiting', 'waiting', None, None, None], ['building', 'buildingN', 2, 5, None], ['building', 'building', None, None, None], ['built', 'built', None, None, None],
                       ['failed', 'failed', None, None, 'timeout'], ['failed', 'failed', None, None, 'unknown'], ['cancelled', 'cancelled', None, None, None], ['waiting', 'waiting', None, None, None]],
         'the phrase of a zone: n / m sources only when both are known, the error code kept or « unknown », an unknown state waits', what='zonePhrase')
    c.eq(r['rows'], [['fr', 'built'], ['gb', 'waiting'], ['us', 'buildingN']], 'the requested zones in order (the one the job does not know yet waits), then the ones the job adds', what='zoneRows')
    c.eq(r['progress'], [{'done': 2, 'total': 5, 'pct': 40}, {'done': 0, 'total': 2, 'pct': 0}, {'done': 5, 'total': 5, 'pct': 100}, {'done': 0, 'total': 0, 'pct': None}],
         'the bar: done / total of the view, else 0 over the zones asked; never above the total; no total, no percentage', what='progress')
    c.eq(r['clock'], ['0:00', '0:59', '2:05', '0:00', '60:00'], 'elapsed time as minutes:seconds', what='clock')
    c.eq(r['isBuild'], [True, True, False, False, False], 'a view is a base build when it carries its zones (or says set and verb)', what='viewOp base build')
    c.eq(r['cycleOut'], [[1, '2026-10-29', True, False], [0, '2026-10-29', False, False], [0, '2026-10-29', False, False], [0, None, False, False], [0, None, False, False]],
         'the end of a build reads the blocking sources and the cycle in force; stale only when a source blocks (the SIA files\' cycle alone says nothing); malformed or absent: nothing said', what='blocking')
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


def _one(lang, n):
    """The agreement of frame/lib/plural.js: fr, 0 and 1 are singular; en, de, es only 1."""
    return 0 <= n < 2 if lang == 'fr' else n == 1


def _agree(text, lang):
    """A text whose marks « (s) (x) (es) (en) (n) (e) » are resolved by the number that precedes them (an independent version of frame/lib/plural.js agree, on the final text)."""
    last = [float('nan')]

    def one(m):
        if m.group(1):
            last[0] = int(m.group(1))
            return m.group(0)
        return '' if _one(lang, last[0]) else m.group(2)
    return re.sub(r'(\d+)|\((s|x|es|en|n|e)\)', one, text)


def _shortname(name):
    """The short name of a source: the catalogue's name without its parenthesis (« SIA France (XML SIA + AIXM 4.5) » → « SIA France »)."""
    return re.sub(r'\s*\(.*\)\s*$', '', name)


def _zones_text(lang, n):
    """« 1 zone », « 0 zone », « 3 zones » as the screen counts them (0 and 1 singular in French)."""
    return f'{n} {UNIT_ZONE[lang][0 if _one(lang, n) else 1]}'


def _view(state='running', step='', done=0, total=2, zones=None, result=None, jid='j1', unit='zones'):
    """The job's view as the launcher gives it (frame/INTEGRATION 15.1; aerodb's D5 verb)."""
    return {'id': jid, 'state': state, 'step': step, 'done': done, 'total': total, 'unit': unit, 'log': [], 'result': result, 'zones': zones if zones is not None else {}}


def _zs(state, done=0, total=0, **extra):
    """A zone's entry of the job's view."""
    return {'state': state, 'done': done, 'total': total, **extra}


def _launcher(c, views=(), last=None, start=(200, {'job': 'j1'}), cancel_view=None, busy_view=None, sync=None, verbs=None, inventory=None, personal=None, busy_running=None, cycle=None, publish=None, last_results=None):
    """A FAKE launcher (the technique of frame A32: c.context.route answers /__setup/*; never a real one).  `views`: what GET regen/job?id= answers one
    after the other (the last one stays); `last`: what GET regen/job (no id) answers at first (the running or the last job); `start`: (status, body) of the
    POST that starts a job; `cancel_view`: what the job becomes once POST regen/job/cancel was received; `busy_view`: the running job a refused start
    (409) leaves in place; `sync`: what GET sync-status answers (`{'changes', 'ahead', 'merging', 'last'}`, or `(status, body)`).  The dict it returns records
    `posts`, `cancels` and `syncs` (the reads of sync-status) and can be changed between steps.  `verbs`: what GET regen/verbs answers: None = an old launcher
    (200 with no list), a list = `{ verbs: [...] }`, an int = that status (404...); `st['verbs_calls']` counts the reads.  `inventory`: what GET data/inventory answers (a body, or `(status, body)`; None = an old
    launcher, 404); `st['inventory_calls']` counts the reads.  `personal`: the file of the launcher that holds the personal-use tick (`{'certified', 'at'}`; None = an older launcher, 404); `st['personal_posts']` records the bodies posted, `st['personal_refuse']` makes the next POST fail (500).
    `busy_running`: the running operation a « busy » refusal names (SOG-0245; AeroDB's `running`, see _running); the dict is LIVE (the test changes its vitals), GET regen/job?id=<its id> answers it as a running view
    (`st['gets']` records the reads), POST regen/job/cancel flips its `cancelling`, POST regen/job/release is recorded in `st['releases']` and answers 200 (or 409 `alive` while `st['release_alive']`).  The 409 itself is
    the test's `start=(409, {'reason': 'busy', 'job': id, 'running': busy_running})`.  `cycle` (SOG-0262): the RESULT of the read-only job base/cycle (a dict, or a function of its args `{zone, personal}`; None = the verb answers nothing);
    every such read is recorded in `st['posts']` (verb `cycle`).  `last_results` (SOG-0262, lot D3): the RESULT of the read-only job base/last (K191: the journal of the last pickup / fetch / build / update; a dict or a function of its args; None = the verb answers nothing)."""
    st = {'status': None, 'posts': [], 'cancels': [], 'views': list(views), 'i': 0, 'current': last, 'cancelled': False, 'start': start, 'syncs': 0,
          'sync': sync or {'changes': 0, 'ahead': 0, 'merging': False, 'last': None}, 'verbs': verbs, 'verbs_calls': 0,
          'inventory': inventory, 'inventory_calls': 0, 'personal': personal, 'personal_posts': [], 'personal_refuse': False, 'personal_gets': 0,
          'running': busy_running, 'gets': [], 'releases': [], 'release_alive': False, 'cycle': cycle, 'publish': publish, 'last_results': last_results}

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
        elif u.path.endswith('/__setup/personal'):
            if st['personal'] is None:
                code = 404
            elif req.method == 'POST':
                b = json.loads(req.post_data or '{}')
                st['personal_posts'].append(b)
                if st['personal_refuse']:
                    code, body = 500, {'ok': False}
                elif b.get('migrated') and st['personal'].get('at'):
                    code, body = 409, {'ok': False, 'reason': 'exists'}
                else:
                    st['personal'] = {'certified': b.get('certified') is True, 'at': '2026-11-11T10:00:00Z'}
                    body = {'ok': True, **st['personal']}
            else:
                st['personal_gets'] += 1
                body = st['personal']
        elif u.path.endswith('/__setup/data/inventory'):
            st['inventory_calls'] += 1
            if st['inventory'] is None:
                code = 404
            elif isinstance(st['inventory'], tuple):
                code, body = st['inventory']
            else:
                body = st['inventory']
        elif u.path.endswith('/__setup/regen/verbs'):
            st['verbs_calls'] += 1
            if isinstance(st['verbs'], int):
                code = st['verbs']
            elif isinstance(st['verbs'], list):
                body = {'verbs': st['verbs']}
        elif u.path.endswith('/__setup/regen/job/release'):
            st['releases'].append(json.loads(req.post_data or '{}'))
            if st['release_alive']:
                code, body = 409, {'ok': False, 'reason': 'alive', 'silent': 3}
            else:
                body = {'ok': True, 'job': (st['running'] or {}).get('id'), 'released': True}
        elif u.path.endswith('/__setup/regen/job/cancel'):
            st['cancels'].append(json.loads(req.post_data or '{}'))
            st['cancelled'] = True
            if st['running']:
                st['running']['cancelling'] = True
            body = {'ok': True}
            if cancel_view:
                st['current'] = cancel_view
        elif u.path.endswith('/__setup/regen/job'):
            if req.method == 'POST':
                st['posts'].append(json.loads(req.post_data or '{}'))
                code, body = st['start']
                if code == 409 and busy_view:
                    st['current'] = busy_view
            elif 'id=' in u.query and st['posts'] and st['posts'][-1].get('verb') == 'cycle' and st.get('cycle') is not None:
                res = st['cycle']
                if callable(res):   # the answer depends on the zone asked for (the view per zone, K182)
                    res = res(st['posts'][-1].get('args') or {})
                body = {'id': 'jcy', 'state': 'done', 'step': '', 'done': 1, 'total': 1, 'unit': 'zones', 'log': [], 'result': res, 'zones': {}}
            elif 'id=' in u.query and st['posts'] and st['posts'][-1].get('verb') == 'last' and st.get('last_results') is not None:
                res = st['last_results']   # the journal of the launcher (K191), LIVE: the test changes what the launcher «remembers»
                if callable(res):
                    res = res(st['posts'][-1].get('args') or {})
                body = {'id': 'jla', 'state': 'done', 'step': '', 'done': 1, 'total': 1, 'unit': 'zones', 'log': [], 'result': res, 'zones': {}}
            elif 'id=' in u.query and st['posts'] and st['posts'][-1].get('verb') == 'publish' and st.get('publish') is not None:
                res = st['publish']   # `publish` (SOG-0262, lot C): the RESULT of base/publish, a dict or a function of its args `{zone, dry}` (the plan, then the real run)
                if callable(res):
                    res = res(st['posts'][-1].get('args') or {})
                body = {'id': 'jpb', 'state': 'done', 'step': '', 'done': 1, 'total': 1, 'unit': 'étapes', 'log': [], 'result': res, 'zones': {}}
            elif 'id=' in u.query and st['posts'] and st['posts'][-1].get('verb') == 'status' and st.get('status') is not None:
                res = st['status']
                if callable(res):   # the answer depends on what was asked (args: zones, personal), like the real launcher's
                    res = res((st['posts'][-1].get('args') or {}))
                if st.get('by_args'):   # like the real launcher: the state of the zones asked for only (60 at most)
                    want = (st['posts'][-1].get('args') or {}).get('zones')
                    res = {**res, 'zones': {k: v for k, v in res['zones'].items() if want is None or k in want}}
                body = {'id': 'jst', 'state': 'done', 'step': '', 'done': 1, 'total': 1, 'unit': 'zones', 'log': [], 'result': res, 'zones': {}}
            elif 'id=' in u.query and st['running'] and f"id={st['running']['id']}" in u.query:
                st['gets'].append(st['running']['id'])
                body = {**st['running'], 'state': 'running', 'log': [], 'result': None}
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


# the numbers of the state sentence: [[filter, n], ...] in the order it says them (SOG-0262: the lower list with a pill per zone is gone; this sentence and the sheets are where the states are read)
_SENTENCE_JS = "[...document.querySelectorAll('[data-state-sentence] [data-filter]')].map(b => [b.dataset.filter, parseInt(b.textContent, 10)])"
# the number of zones the state sentence says up to date, as a wait expression (% n)
_SENT_UPTO = "(() => { const b = document.querySelector('[data-state-sentence] [data-filter=upToDate]'); return !!b && parseInt(b.textContent, 10) === %d })()"


def _ready(c, n, timeout=10000):
    """Waits until the state sentence counts `n` zones (the launcher's state of the coverage has been read)."""
    c.until("[...document.querySelectorAll('[data-state-sentence] [data-filter]')].reduce((a, b) => a + parseInt(b.textContent, 10), 0) === %d" % n, timeout=timeout, what=f'the state of the {n} zones')


def _unfold(c, zone):
    """Unfolds, under the state sentence, the list that holds `zone` (the number that counts it): its line — name, state and the buttons of its file — is then on the screen (SOG-0262: the lower list with a line per zone is gone).
    Retried for a few seconds: the zone changes list when the launcher's state changes."""
    for _ in range(25):
        for key, _n in c.js(_SENTENCE_JS):
            sel = f'[data-state-sentence] [data-filter={key}]'
            if c.js(f"(document.querySelector('{sel}') || {{ getAttribute: () => 'true' }}).getAttribute('aria-expanded')") != 'true':
                c.tap(sel)
                c.wait(120)
            if c.count(f'[data-state-zones] [data-zone-row={zone}]'):
                return
        c.wait(300)
    raise Fail(f'the zone {zone} is in no list of the state sentence', 'a line to act on')


def _pills(c):
    """{ zone: state } read from the lists that the numbers of the state sentence unfold, one number after the other (a zone without a state has None): SOG-0262 removed the lower list with a pill per zone."""
    out = {}
    for key in [k for k, _n in c.js(_SENTENCE_JS)]:
        sel = f'[data-state-sentence] [data-filter={key}]'
        c.tap(sel)
        c.until(f"document.querySelector('{sel}').getAttribute('aria-expanded') === 'true' && !!document.querySelector('[data-state-zones]')", what=f'the zones of {key}')
        out.update(c.js("Object.fromEntries([...document.querySelectorAll('[data-state-zones] [data-zone-row]')].map(r => [r.dataset.zoneRow, (r.querySelector('[data-zstate]') || { dataset: {} }).dataset.zstate || null]))"))
        c.tap(sel)
        c.until(f"document.querySelector('{sel}')?.getAttribute('aria-expanded') !== 'true'", what=f'{key} folds again')
    return out


def _untick(c, *zones):
    """Takes zones out of the coverage (SOG-0262: there is no selection any more, the verbs of the base act on the whole coverage; a pack switched off does the same with a question): the module's own
    removeZones, so the build / download / purge that follow concern the zones that remain.  Nothing is purged."""
    c.js("async (z) => (await import('/modules/data/screen.js')).removeZones(z)", list(zones))
    c.wait(150)


def _cov_count(c):
    """The number of zones of the coverage (the coverage card is gone, D4: read from the state of the screen)."""
    return c.js("async () => (await import('/modules/data/state.js')).S.d.cov.ids.length")


def _readd(c, *zones):
    """Puts zones back into the coverage (the screen's own addZones, the one « Ajouter à ma couverture » calls), one after the other."""
    for z in zones:
        c.js("async (z) => (await import('/modules/data/screen.js')).addZones([z])", z)
        c.wait(150)


def _notes_with(c, text):
    """The notifications since the page opened that say `text` (the log keeps them after they fade)."""
    return [n for n in c.note_log() if norm(text) in norm(n)]


def _screen_ok(c, what):
    """No horizontal scroll, no element beyond the right edge, 44 px on the build panel's buttons and checkbox lines."""
    m = c.js("""() => { const b = document.querySelector('[data-build]'); return { sw: document.documentElement.scrollWidth, iw: window.innerWidth,
      over: [...b.querySelectorAll('*')].filter(e => e.getBoundingClientRect().width && e.getBoundingClientRect().right > window.innerWidth + 1).slice(0, 3).map(e => e.tagName + '.' + e.className),
      bs: [...b.querySelectorAll('button')].filter(e => e.offsetParent).map(e => Math.round(e.getBoundingClientRect().height)), ls: [...b.querySelectorAll('label.d-opt')].filter(e => e.offsetParent).map(e => Math.round(e.getBoundingClientRect().height)) } }""")
    c.le(m['sw'], m['iw'], f'{what}: no horizontal scroll', what='scrollWidth')
    c.ok(not m['over'], m['over'], f'{what}: nothing beyond the right edge')
    c.ge(min(m['bs']), 44, f'{what}: the buttons are 44 px', what='button height')
    c.ge(min(m['ls'] or [99]), 44 if c.phone else 31, f'{what}: checkbox lines are 44 px for a finger, 32 px for a fine pointer', what='touch height')


def _head(c):
    """Waits for the head of the Données screen after a reload."""
    c.until("!!document.querySelector('[data-module=data] [data-data-head]')", timeout=20000, what='the head of the Données screen is drawn')
    c.settle()


@case('L7', 'Données: Construire against a fake launcher (body, zone lines, summary, one notification, journal, personal sources)', 'L', tags=('data',), langs4=True,
      designs=('standard',), rule='modules/data/SPEC 3 (one op, notify at the end only), 5.4, 6.5; launcher job protocol (frame/INTEGRATION 15.1)')
def l7(c):
    lang = c.lang
    v1 = _view(step='Zone fr', done=0, zones={'fr': _zs('building', 1, 4), 'gb': _zs('waiting')})
    v1['inputs'] = {'done': 40, 'total': 90}  # the job's global count of sources read (aerodb cee79213e): once, at the head
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
    c.eq(norm(c.text('[data-verb=build]')), norm(_trow('recompute', lang, after='  upd: {')), 'worded in the language of the run (Tout recalculer)', what='build label')
    # no zone: grey with its reason; ca, es, us unticked: fr and gb remain, ENAIRE is not offered any more
    _untick(c, 'ca', 'es', 'us', 'fr', 'gb')
    c.eq([c.js("document.querySelector('[data-verb=build]').disabled"), c.attr('[data-build] [data-reason]', 'data-reason'), norm(c.text('[data-build] [data-reason]'))],
         [True, 'no-zone', norm(_trow('no-zone', lang, 'greyReason: {'))], 'no zone ticked: grey, « Cochez au moins une zone » written once', what='no zone')
    c.eq(c.count('[data-certify]') + c.count('[data-personal-row]'), 0, 'no zone, no personal source to offer', what='personal sources')
    _readd(c, 'fr', 'gb')
    c.eq([c.js("[...document.querySelectorAll('[data-personal-row]')].map(r => r.dataset.personalRow)"), c.js("document.querySelector('[data-certify]').checked")], [['nats', 'xplane'], False],
         'France and the UK feed NATS and X-Plane (not ENAIRE): listed, the one box unticked', what='personal sources')
    # the box ticked: X-Plane (read on this workstation only) is listed with its mention, and nothing tells the user to untick it (SOG-0162: there is no box to untick)
    _tap_certify(c)
    c.eq([c.count('[data-xplane-hint]'), norm(c.text('[data-personal-row="xplane"] [data-personal-line]'))], [0, norm(tx(TX, 'xplane', lang, after='personalLine: {'))], 'ticked: X-Plane says it is read on this workstation only, no hint to untick it', what='X-Plane line')
    _tap_certify(c)
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
    c.eq(c.js("[...document.querySelectorAll('[data-build] [data-verb]:not([data-verb=pickup]):not([data-verb=update]):not([data-verb=all]):not([data-verb^=select]), [data-publish] [data-verb]')].map(b => b.dataset.verb).sort()"), ['build', 'download', 'publish', 'purge', 'stop'], 'the four verbs (grey, a build is running) and stop only', what='verbs')
    c.eq(c.js("[...document.querySelectorAll('[data-zone-state]')].map(l => [l.dataset.zoneState, l.dataset.state])"), [['fr', 'waiting'], ['gb', 'waiting']], 'a line per zone, waiting before the first view', what='zone lines')
    c.until("document.querySelector('[data-zone-state=fr]').dataset.state === 'building'", timeout=8000, what='fr is building')
    fr_name = c.text('[data-zone-state=fr] b')
    c.eq(norm(c.text('[data-zone-state=fr]')), norm(f"{fr_name} : {_trow('buildingN', lang, 'zoneState: {').replace('{n}', '1').replace('{m}', '4')}"), 'construction (1 / 4 sources)', what='fr line')
    c.eq(norm(c.text('[data-running] [data-count]')), norm(_trow('runCount', lang).replace('{n}', _zones_text(lang, 0)).replace('{m}', '2')), 'the head count « 0 zones sur 2 »', what='count')
    c.eq(c.text('[data-running] [data-step]'), 'Zone fr', 'the step text of the job', what='step')
    c.eq([norm(c.text('[data-running] [data-inputs]')), c.count('[data-zone-state] [data-inputs]')],
         [norm(_trow('inputsCount', lang).replace('{n}', '40').replace('{m}', '90')), 0], 'the global count of sources read: once at the head, never on a zone line', what='inputs')
    c.ok(norm(_trow('elapsed', lang).replace('{t}', '0:0')) .split('0:0')[0].strip() in norm(c.text('[data-elapsed]')), c.text('[data-elapsed]'), 'the elapsed time is written')
    c.eq(c.count('[data-running] [data-verb=stop]'), 1, 'Arrêter is there', what='stop')
    c.until("document.querySelector('[data-zone-state=gb]').dataset.state === 'building'", timeout=8000, what='gb is building')
    c.ok(norm(c.text('[data-zone-state=gb]')).endswith(norm(_trow('buildingN', lang, 'zoneState: {').replace('{n}', '2').replace('{m}', '5'))), c.text('[data-zone-state=gb]'),
         'gb keeps its own count (2 / 5), not fr\u2019s (1 / 4) nor a global one')
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
    ops = c.js("[...document.querySelectorAll('[data-journal] [data-op]')].map(o => [o.dataset.result, o.textContent.replace(/\s+/g, ' ').trim()])")
    c.eq(len(ops), 1, 'one entry in the journal fold', what='journal entries')
    c.ok(re.search(r'\d{2}:\d{2}Z', ops[0][1]) and norm(_trow('build', lang, 'opVerb: {')) in norm(ops[0][1]) and norm(_trow('partial', lang, 'opResult: {')) in norm(ops[0][1]), ops[0], 'time with Z, the verb, the result')
    _screen_ok(c, 'at the end')
    # a second run with personal sources ticked: the ids follow, a clean end; its sources are of the previous cycle (aerodb 41e34a752)
    _t, _c, _p, _n = _cycles()
    _cur_day, _prev_day = _c.isoformat(), _p.isoformat()
    st['views'] = [_view('done', step='Terminé', done=2, zones={'fr': _zs('built', 4, 4), 'gb': _zs('built', 5, 5)}, result={'built': ['fr', 'gb'], 'failed': [], 'commits': [], 'cycle': _prev_day, 'current': _cur_day, 'stale': True, 'cycles': {'fr': _prev_day, 'gb': _prev_day},
                     'blocking': [{'zone': 'fr', 'source': 'sia', 'cycle': _prev_day}, {'zone': 'gb', 'source': 'nats', 'cycle': _prev_day}],
                     'sources': {s: {'cycle': _prev_day, 'current': _cur_day, 'stale': True} for s in ('sia', 'nats')}}, jid='j2')]
    st['i'] = 0
    st['start'] = (200, {'job': 'j2'})
    _tap_certify(c)
    c.tap('[data-verb=build]')
    c.until('document.querySelector("[data-build-result][data-result=done]")', timeout=10000, what='the second build ends')
    c.eq(st['posts'][1]['args'], {'zones': ['fr', 'gb'], 'personal': ['nats']}, 'ticking the box adds the personal sources of the zones (not X-Plane)', what='second body')
    want = _trow('sumDone', lang).replace('{built}', _zones_text(lang, 2))
    c.eq(norm(c.text('[data-build-result] b')), norm(want), 'a clean end: « Base construite : 2 zones »', what='summary')
    c.eq(len(_notes_with(c, want)), 1, 'its own notification', what='notifications')
    # the sources being of the previous cycle: ONE warning that names each blocking source once, in a link with the expected file; nothing says « built for cycle X » for all the zones
    nm = {'fr': ('SIA France', 'France'), 'en': ('SIA France', 'France'), 'de': ('SIA Frankreich', 'Frankreich'), 'es': ('SIA Francia', 'Francia')}[lang]
    gb_name = {'fr': 'Royaume-Uni', 'en': 'United Kingdom', 'de': 'Vereinigtes Königreich', 'es': 'Reino Unido'}[lang]
    items = f'{nm[0]} {_name(_p)} ({nm[1]}), NATS UK {_name(_p)} ({gb_name})'
    got = c.js("[...document.querySelectorAll('[data-build-result] [data-blocking]')].map(p => [p.textContent.replace(/\s+/g, ' ').trim(), [...p.querySelectorAll('a')].map(a => [a.href, a.title])])")
    sia_url = c.js("(d) => window.AeroCatalogue.byId('sia').url(d)", _cur_day)
    c.eq(got, [[norm(_trow('srcBlocking', lang).replace('{a}', items).replace('{n}', _name(_c))), [[sia_url, f'export_xml_bd_SIA_{_cur_day}-v<nn>.zip'],
                 ['https://nats-uk.ead-it.com/cms-nats/opencms/en/Publications/digital-datasets/', 'EG_…_DS_…_XML.zip']]]],
         'one line naming SIA France and NATS once each, with their pages and expected files', what='blocking line')
    c.eq(c.count('[data-build-result] [data-built-cycle], [data-build-result] [data-stale-sources]'), 0, 'no « built for cycle X » line for all the zones', what='no built cycle')
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
    # and the journal writes words it does not know as they are (a set, a verb and a result named like members of Object.prototype)
    weird = {'ops': [{'at': '2026-10-30T10:00:00.000Z', 'set': 'constructor', 'verb': 'toString', 'zones': [], 'result': '__proto__'}]}
    c.open('data', docs=LEVEL3 + [['cache/data/journal.json', weird, 'cache']], wait=False, app='maintenance')
    _head(c)
    c.js("document.querySelector('[data-journal]').open = true")
    line = norm(c.text('[data-journal] [data-op]'))
    c.ok('constructor' in line and 'toString' in line and '__proto__' in line and c.attr('[data-journal] [data-op]', 'data-result') == '__proto__', line,
         'unknown words of the journal are written as they are, not as a function or an object')
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
                             ((400, {'message': 'bad'}), 'bad-args', _trow('bad-args', 'fr', 'refused: {') + ' ' + _trow('refusedWhy', 'fr').replace('{m}', 'bad'))]:   # SOG-0144: the launcher’s reason is relayed
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
    # a reason of the launcher's named like a member of Object.prototype: the generic failure sentence, a plain data-result
    bad = _view('error', step='', done=0, zones={}, result={'ok': False, 'built': [], 'failed': [], 'reason': 'constructor'}, jid='o9')
    st['views'], st['i'], st['start'], st['current'] = [bad], 0, (200, {'job': 'o9'}), None
    c.tap('[data-verb=build]')
    c.until("!!document.querySelector('[data-build-result][data-result]')", timeout=10000, what='the end is said')
    sent = _trow('sumFailed', 'fr').replace('{failed}', '0').replace('{zones}', '')
    c.eq([c.attr('[data-build-result]', 'data-result'), norm(c.text('[data-build-result] b'))], ['failed', norm(sent)], 'reason « constructor »: the generic failure sentence, data-result is the plain fallback string', what='constructor reason')
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
    c.eq(c.js("document.querySelector('[data-build] [data-running]').offsetParent !== null"), True, 'the run is on the screen (the base block is never folded)', what='group open')
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
    c.js("document.querySelectorAll('details[data-my-coverage]').forEach(d => { d.open = true })")   # the fold « Ma couverture » is folded after a reload
    c.tap('[data-verb=build]')
    c.until("!!document.querySelector('[data-build-result][data-result=no-browser]')", timeout=8000, what='no-browser is said')
    want = _trow('sumNoBrowser', lang)
    c.eq([norm(c.text('[data-build-result]')), len(_notes_with(c, want))], [norm(want), 1], 'Ni Edge ni Chrome…: the sentence, one notification', what='no-browser')
    # the box ticked: X-Plane is never sent; an older launcher that still answers « xplane-in-page » is said without asking to untick anything
    st['views'] = [_view('error', jid='j5', zones={}, result={'ok': False, 'reason': 'xplane-in-page'})]
    st['i'] = 0
    st['start'] = (200, {'job': 'j5'})
    _tap_certify(c)
    c.tap('[data-verb=build]')
    c.until("!!document.querySelector('[data-build-result][data-result=xplane-in-page]')", timeout=8000, what='xplane-in-page is said')
    c.eq(st['posts'][-1]['args']['personal'], ['enaire', 'nats'], 'the one box is sent as the personal sources of the ticked zones, X-Plane (read on this workstation only) never among them', what='body')
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
    return c.js("""() => { const b = document.querySelector('[data-publish]'); const t = e => e ? e.textContent.replace(/\s+/g, ' ').trim() : null;
      return { disabled: b.querySelector('[data-verb=publish]').disabled, reason: b.querySelector('[data-reason]')?.dataset.reason || null, reasonText: t(b.querySelector('[data-reason]')),
        reasons: b.querySelectorAll('[data-reason]').length, state: t(b.querySelector('[data-publish-state]')), merge: t(b.querySelector('[data-publish-merge]')), last: t(b.querySelector('[data-publish-last]')),
        running: !!b.querySelector('[data-publishing]'), result: b.querySelector('[data-publish-result]')?.dataset.result || null,
        lines: [...b.querySelectorAll('[data-publish-result] [data-line]')].map(p => [p.dataset.line, t(p)]), message: t(b.querySelector('[data-publish-message]')),
        buildDisabled: document.querySelector('[data-verb=build]').disabled, buildReason: document.querySelector('[data-build] [data-reason]')?.dataset.reason || null,
        first: b === document.querySelector('[data-build]').nextElementSibling } }""")


def _ask_text(c):
    """The question of the frame's window: { text, ok, no } (the texts of the two buttons)."""
    c.until("!!document.querySelector('.f-modal [data-ok]')", timeout=8000, what='the question is asked')
    return c.js("""() => ({ text: document.querySelector('.f-modal p').textContent.replace(/\s+/g, ' ').trim(), ok: document.querySelector('.f-modal [data-ok]').textContent.trim(),
      no: !!document.querySelector('.f-modal [data-no]'),
      sections: [...document.querySelectorAll('.f-modal [data-ask-section]')].map(g => [g.dataset.askSection, g.querySelector('h4').textContent.replace(/\s+/g, ' ').trim(), [...g.querySelectorAll('li')].map(li => li.textContent.replace(/\s+/g, ' ').trim())]),
      note: (document.querySelector('.f-modal > div > p.f-muted') || { textContent: '' }).textContent.replace(/\s+/g, ' ').trim() })""")


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
    clean = norm(_trow('pubClean', lang).split('{d}')[0])
    c.ok(s['state'] is not None and s['state'].startswith(clean) and '10:00Z' in s['state'], s['state'], 'what is true is said (SOG-0230): everything is already published, since the last publication, instead of a bare « nothing »')
    c.eq([s['disabled'], norm(s['reasonText']), s['reasons'], s['result'], s['buildDisabled']], [True, norm(_trow('nothing', lang, 'pubReason: {')), 1, 'done', False],
         'nothing left: Publier grey with « Rien à publier » written once (no second line), the result stays, Construire is live', what='after')
    doc = c.until_doc('cache/data/journal.json', lambda d: bool(d and d.get('ops')), what='the journal is written')
    e = doc['ops'][-1]
    c.eq([e['set'], e['verb'], e['result'], e['committed'], e['received'], e['held'], e['conflicts']], ['base', 'publish', 'done', 3, 1, 0, 0], 'the journal entry', what='journal entry')
    c.ok(re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z', e['at']), e['at'], 'UTC ISO time')
    ops = c.js("[...document.querySelectorAll('[data-journal] [data-op]')].map(o => [o.dataset.opVerb, o.dataset.result, o.textContent.replace(/\s+/g, ' ').trim()])")
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
    c.eq(c.count('[data-add-zone], [data-coverage]'), 0, 'the « Ajouter un pays » select went with the « Couverture » card (D4): a country is added from its sheet or from the banner of the map (L107, L113)', what='no add-zone select')
    c.eq(c.doc('cache/data/coverage.json'), None, 'nothing is published: no coverage is written', what='coverage.json')
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
  out.sources = M.sourceRows({ sources: { openaip: { state: 'downloaded', files: 2, bytes: 1500 }, sia: { state: 'manual', error: 'manual' }, enaire: { state: 'skipped', error: 'personal' }, kh_asp: { state: 'skipped', error: 'absent' },
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
                        ['kh_asp', 'skipped', None, None, 'absent', None], ['faa', 'failed', None, None, 'http', 404], ['x', 'failed', None, None, 'unknown', None], ['nat', 'unchanged', None, None, None, None]],
         'the sources of a zone, in the view\'s order: unknown or pending ones dropped, the code of a failure (HTTP status kept), « personal » for a source skipped without its licence, « absent » for a layer openAIP does not export for the country', what='sourceRows')
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
    return c.js("[...document.querySelectorAll('[data-build] [data-verb]')].filter(b => !b.dataset.verb.startsWith('pickup') && b.dataset.verb !== 'update' && b.dataset.verb !== 'all' && b.dataset.verb !== 'stop-chain' && !b.dataset.verb.startsWith('chain-') && !b.dataset.verb.startsWith('select')).map(b => b.dataset.verb + (b.disabled ? ':off' : ''))")


def _grey(c, what):
    """Télécharger, Construire, Purger and Publier are grey, for ONE reason written once under the panel: its key."""
    c.eq(c.js("[...document.querySelectorAll('[data-build] [data-verb]:not([data-verb=pickup]):not([data-verb=update]):not([data-verb=all]):not([data-verb^=select]), [data-publish] [data-verb]')].filter(b => b.dataset.verb !== 'stop').map(b => b.dataset.verb + (b.disabled ? ':off' : ''))"),
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
                   'gb': _fz('fetching', 1, 2, {'nats': {'state': 'skipped', 'error': 'personal'}, 'ukmil': {'state': 'failed', 'error': 'http', 'status': 404}, 'gb_asp': {'state': 'skipped', 'error': 'absent'}})}, step='Zone gb', done=1)
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
    c.eq([norm(c.text(f'[data-build] [data-verb={v}]')) for v in ('download', 'build', 'purge')], [norm(_trow(v, lang)) if v != 'build' else norm(_trow('recompute', lang, after='  upd: {')) for v in ('download', 'build', 'purge')], 'worded in the language of the run (Tout recalculer for the base build)', what='labels')
    c.eq(norm(c.text('[data-build] h2')), norm(_trow('buildTitle', lang)), 'the panel title covers the three verbs', what='title')
    _untick(c, 'ca', 'es', 'us', 'fr', 'gb')
    c.eq([_verbs(c), c.attr('[data-build] [data-reason]', 'data-reason'), norm(c.text('[data-build] [data-reason]')), c.count('[data-build] [data-reason]')],
         [['download:off', 'build:off', 'purge:off'], 'no-zone', norm(_trow('no-zone', lang, 'greyReason: {')), 1], 'no zone ticked: the three are grey, one reason', what='no zone')
    _readd(c, 'fr', 'gb')
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
    c.eq(norm(c.text('[data-zone-state=gb] [data-source=gb_asp]')), norm(f"{c.text('[data-zone-state=gb] [data-source=gb_asp] b')} : {sm('skippedAbsent', 'sourceState')}"),
         'a layer openAIP does not export for the country: said in its words, not a bare « skipped »', what='absent source')
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
    items = c.js("[...document.querySelectorAll('[data-build-result] [data-manual-list] li')].map(li => [li.dataset.manual, li.textContent.replace(/\s+/g, ' ').trim(), li.querySelector('a')?.getAttribute('href') || null, li.querySelector('a')?.rel || null])")
    c.eq(items, [['fr:sia', norm(f"{fr_name} : {man_names['sia'][li]}"), 'https://www.sia.example/aip', 'noopener noreferrer'],
                 ['gb:nats', norm(f"{gb_name} : {man_names['nats'][li]}"), None, None], ['gb:z', norm(f"{gb_name} : {man_names['z'][li]}"), None, None]],
         'the manual sources by name in the language: a link only for the https:// address, the http:// and javascript: ones are names alone', what='manual sources')
    c.eq(_zhead(c, 'gb'), norm(f"{gb_name} : {sm('failed', 'fetchState').replace('{r}', sm('srcWhy', 'fetchError').replace('{src}', c.text('[data-build-result] [data-zone-state=gb] [data-source=ukmil] b')).replace('{r}', sm('httpN', 'fetchError').replace('{s}', '404')))}"), 'the failed zone says why: the source that failed and what it answered (SOG-0180)', what='gb failed line')
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
    ops = c.js("[...document.querySelectorAll('[data-journal] [data-op]')].map(o => [o.dataset.opVerb, o.dataset.result, o.textContent.replace(/\s+/g, ' ').trim()])")
    c.ok(len(ops) == 1 and ops[0][0] == 'download' and norm(_trow('download', lang, 'opVerb: {')) in norm(ops[0][2]), ops, 'the journal line says the verb')
    _screen_ok(c, 'at the end of the download')
    # ---- C: ENAIRE only when ticked; nothing to fetch says so
    st['views'] = [_fview({}, state='error', jid='j2', done=0, total=0, result={'ok': False, 'fetched': [], 'unchanged': [], 'failed': [], 'manual': [], 'outside_sync': 0, 'warnings': [], 'reason': 'nothing-to-fetch'})]
    st['i'], st['start'] = 0, (200, {'job': 'j2'})
    _readd(c, 'es')
    _tap_certify(c)
    c.tap('[data-verb=download]')
    c.until("!!document.querySelector('[data-build-result][data-result=nothing]')", timeout=10000, what='nothing to download is said')
    c.eq(st['posts'][1]['args'], {'zones': ['es', 'fr', 'gb'], 'personal': ['enaire', 'nats']}, 'ENAIRE goes in args.personal when the box is ticked, with the other personal sources of the zones (not X-Plane)', what='second body')
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
    c.eq(c.js("[...document.querySelectorAll('[data-build] [data-verb]:not([data-verb=pickup]):not([data-verb=update]):not([data-verb=all]):not([data-verb^=select]), [data-publish] [data-verb]')].filter(b => b.dataset.verb !== 'stop').map(b => b.dataset.verb + (b.disabled ? ':off' : ''))"), ['download:off', 'build:off', 'purge:off', 'publish:off'],
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
    c.eq(c.js("[...document.querySelectorAll('[data-build-result] [data-line]')].map(p => p.textContent.replace(/\s+/g, ' ').trim())"),
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
    c.eq(c.js("document.querySelector('[data-build] [data-running]').offsetParent !== null"), True, 'the run is on the screen (the base block is never folded)', what='group open')
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
  const pkl = M.pickupSplit([{ zone: 'se', source: 'lfv', zip: 'AIP_OFFLINE.zip', size: 1073741824 }]);
  out.splitLfv = [pkl.ready.map(t => t.source), pkl.blocked.length, pkl.zips, pkl.zones];
  // a reason, a set or a source named like a member of Object.prototype is no key of a table of the module
  const BADK = ['constructor', 'toString', '__proto__', 'hasOwnProperty', 'valueOf'];
  const kindsOf = res => ['outcome', 'fetchOutcome', 'purgeOutcome', 'pickupOutcome', 'vfrFetchOutcome', 'sheetsOutcome'].map(fn => M[fn]({ state: 'done', zones: {}, result: res }).kind);
  out.protoKinds = BADK.map(rs => [kindsOf({ reason: rs }), kindsOf({ ok: false, reason: rs })]);
  out.protoStrings = BADK.every(rs => [...kindsOf({ reason: rs }), ...kindsOf({ ok: false, reason: rs })].every(k => typeof k === 'string'));
  out.protoOps = [{ set: 'constructor', verb: 'build' }, { set: '__proto__', verb: 'fetch' }, { set: 'toString' }, { set: 'hasOwnProperty', verb: 'publish' }].map(M.viewOp);
  const pks = M.pickupSplit([{ zone: 'a', source: 'constructor', zip: 'a.zip', size: 1 }, { zone: 'b', source: '__proto__', zip: 'a.zip', size: 1 }, { zone: 'c', source: 'toString', zip: 'a.zip', size: 1 }]);
  out.protoSplit = [pks.ready.length, pks.blocked.length, pks.zips, pks.zones];
  out.own = [M.own({ a: 1 }, 'a'), M.own({ a: 1 }, 'constructor'), M.own({ a: 1 }, '__proto__'), M.own(null, 'a'), M.own({}, 'toString'), M.own([5], 0), M.own({ a: 1 }, undefined),
    M.own(Object.create({ x: 1 }), 'x'), M.own('abc', 'length')];
  out.bulk = [M.bulkName({}, 'constructor', 0), M.bulkName(null, 'LF', 0), M.bulkName({ LF: { names: ['F', 'F', 'F', 'F'] } }, 'LF', 2), M.bulkName(null, '__proto__', 1)];
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
  const zf = M.zoneFeatures([{ id: 'a', rings: [], box: bx }, { id: 'b', rings: [rect], box: bx }, { id: 'c', rings: [[[0, 0], [10, 0], [5, 5], [0, 0]]], box: bx }]), geo = i => JSON.stringify(zf.features[i].geometry);
  out.zmApprox = [zf.features.map(f => f.properties.approx), geo(0) === geo(1) && geo(0).length > 10, geo(2) === geo(1)];
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
    c.eq(r['zmApprox'], [[True, True, False], True, False], 'the map features flag the approximate outlines; a zone without ring is drawn as its frame', what='zoneFeatures approx')
    c.eq(r['split'], [[['gb'], ['fr', 'x', 'y', 'w', 'v'], {'nats': {'name': 'ok.zip', 'size': 2}}, ['gb']], [['sia'], ['nats'], {'sia': {'name': 'a.zip', 'size': 1}}, []], []],
         'a zip whose name is outside the rule (accent, [, comma, over 150 characters) or without size is NOT ready: it is not run, and neither is a zone that has such a source', what='pickupSplit')
    c.eq(r['refusals'], ['updating', 'busy', 'busy', 'tooSoon', 'unknown-route'], 'a 409 with reason updating is its own refusal; the other 409 stays « busy »', what='refusal updating')
    c.eq(r['protoKinds'], [[['done', 'done', 'done', 'nothing', 'done', 'done'], ['failed', 'failed', 'failed', 'failed', 'failed', 'failed']]] * 5,
         'a launcher reason that names a member of Object.prototype (constructor, toString, __proto__…) gives each verb its fallback kind: the computed one, or « failed » when the result says ok false',
         what='kindOf prototype')
    c.eq(r['protoStrings'], True, 'and the kind is always a plain string, never a function or an object', what='kind type')
    c.eq(r['protoOps'], [None, None, None, None], 'a view whose set is named like a member of Object.prototype is no operation of the module (and throws nothing)', what='viewOp prototype')
    c.eq(r['protoSplit'], [0, 3, {}, []], 'a pickup source named so is no source: its zip is blocked, never sent', what='pickupSplit prototype')
    c.eq(r['own'], [1, None, None, None, None, 5, None, None, None], 'own(): the value of an own key only', what='own')
    c.eq(r['bulk'], ['constructor', 'France', 'F', '__proto__'], 'a State prefix named so is written as it is', what='bulkName')
    c.eq(r['splitLfv'], [['lfv'], 0, {'lfv': {'name': 'AIP_OFFLINE.zip', 'size': 1073741824}}, ['se']], 'SOG-0189 (4): the Swedish AIP_OFFLINE.zip (a permitted name, 1 GB) is READY to be taken, not « nom de fichier à renommer »', what='pickupSplit lfv')
    c.eq(r['pickupDest'], {'sia': 'data/sia/', 'nats': 'data/sia/zones/gb/', 'lfv': 'data/sia/zones/se/'}, 'where the raw files go, as the launcher writes them', what='PICKUP_DEST')
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
      bs: ps.flatMap(b => [...b.querySelectorAll('button, input[type=text]')].filter(e => e.offsetParent).map(e => Math.round(e.getBoundingClientRect().height))), ls: ps.flatMap(b => [...b.querySelectorAll('label.d-opt')].filter(e => e.offsetParent).map(e => Math.round(e.getBoundingClientRect().height))) } }""")
    c.le(m['sw'], m['iw'], f'{what}: no horizontal scroll', what='scrollWidth')
    c.ok(not m['over'], m['over'], f'{what}: nothing beyond the right edge')
    c.ge(min(m['bs']), 44, f'{what}: the buttons and the field are 44 px', what='button height')
    c.ge(min(m['ls'] or [99]), 44 if c.phone else 31, f'{what}: checkbox lines are 44 px for a finger, 32 px for a fine pointer', what='touch height')


def _all_open(c):
    """Opens every group (a closed `details` has no visible button): the panels sit in their groups, which open by themselves only when a row needs attention."""
    c.js("() => document.querySelectorAll('details.f-group').forEach(g => { g.open = true })")


def _tap_certify(c):
    """Taps the box « Je certifie… »: it lives in the fold « Ma couverture » (SOG-0262, lot C), folded after every opening or reload, so the fold is opened first."""
    c.js("document.querySelectorAll('details[data-my-coverage]').forEach(d => { d.open = true })")
    c.tap('[data-certify]')


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
    c.eq(c.js("[...document.querySelectorAll('[data-set-panel]')].map(p => p.dataset.setPanel)"), ['proc', 'vfr', 'aircraft', 'sheets'],
         'a panel per group: points VFR in the Base group (where its row is), Procédures, Appareils and its published sheets', what='panels')
    c.eq(c.js("[...document.querySelectorAll('[data-set-panel]')].map(p => p.closest('details.f-group').dataset.group)"), ['proc', 'vfr', 'aircraft', 'aircraft'], 'in their folds (D4: the VFR points have their own line)', what='panel groups')
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
    c.eq(c.js("(() => { const s = document.querySelector('[data-set-panel=proc] label.d-opt:has([data-item=LF]) > span').cloneNode(true); s.querySelector('[data-held]')?.remove(); return s.textContent.trim() })()"), name('LF'), 'named in the language (the line of its aerodromes held is another element)', what='proc name')
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
    c.eq(_line(c, '[data-set-panel=proc] [data-running] [data-count]'), norm(T('runCount').replace('{n}', f"0 {_unit('state', lang, 0)}").replace('{m}', '2')), 'the count, in States', what='count')
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
    op = c.js("[...document.querySelectorAll('[data-journal] [data-op]')].map(o => [o.dataset.opSet, o.dataset.opVerb, o.textContent.replace(/\s+/g, ' ').trim()])")
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
         [norm(_agree(_trow('invalid', lang, 'vfrSum: {').replace('{s}', label('vfr')).replace('{failed}', '1'), lang)), 'plan : point <b>x</b>', 0], 'the problem of the plan is listed, as text', what='invalid')
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
    c.eq([_line(c, '[data-set-panel=vfr] [data-build-result] b'), c.js("[...document.querySelectorAll('[data-set-panel=vfr] [data-build-result] [data-line]')].map(p => p.textContent.replace(/\s+/g, ' ').trim())")],
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
    return _trow(key, lang, 'unit: {', 0 if _one(lang, n) else 1)


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
    return c.js("[...document.querySelectorAll('[data-build] [data-verb]')].filter(b => b.dataset.verb !== 'stop' && !b.dataset.verb.startsWith('pickup') && b.dataset.verb !== 'update' && b.dataset.verb !== 'all' && b.dataset.verb !== 'stop-chain' && !b.dataset.verb.startsWith('chain-') && !b.dataset.verb.startsWith('select')).map(b => b.dataset.verb + (b.disabled ? ':off' : ''))")


def _chain_rows(c):
    """The sets listed by the chain: [[set, result]]."""
    return c.js("[...document.querySelectorAll('[data-update-all] [data-chain-set]')].map(l => [l.dataset.chainSet, l.dataset.result])")


@case('L18', 'Données: « Tout mettre à jour » against a fake launcher (plan question, the published order, one Publier, the sets go on after a failure and the failed one is listed with « Réessayer », Arrêter, skipped sets, attention mark, reload)',
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
    cfg['publication']['vfr'] = None   # D4: the chain only takes the sets that need something: nothing is published for the VFR points yet
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
    c.eq([c.count('[data-state-head] [data-update-all] [data-verb=all]'), c.js("document.querySelector('[data-update-all] [data-verb=all]').disabled"), norm(c.text('[data-update-all] [data-update-plan]')).endswith(norm(_trow('doPublish', lang, after='  d4: {')) + '.')],
         [1, False, True], 'D4: THE « Tout mettre à jour » is the button of the header (one, enabled): the base and the other sets that need something, its sentence ends with the one publication', what='header button')
    c.tap('[data-set-panel=proc] [data-item=K]')
    c.tap('[data-set-panel=proc] [data-item=LF]')
    _untick(c, 'ca', 'es', 'us')
    c.eq([c.js("document.querySelector('[data-update-all] [data-verb=all]').disabled"), norm(_trow('proc', lang, after='  groups: {')) in norm(c.text('[data-update-all] [data-update-plan]'))], [False, True], 'the sentence names the procedures once the States are ticked', what='plan names proc')
    c.eq(c.js("(() => { const a = document.querySelector('[data-update-all]'), g = document.querySelector('details.f-group:not([data-group=base])'); return !!(a.compareDocumentPosition(g) & Node.DOCUMENT_POSITION_FOLLOWING) })()"), True,
         'the card sits above the other groups (the base group, which the screen shows under the cycle header, comes before it: lot D3)', what='position')
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
    # ---- D: a failing proc build (SOG-0239, « on continue »): the other sets still run, the failed set is listed with its reason and « Réessayer », the rest is published
    part = _sview('proc', 'build', 'states', {'K': {'state': 'done'}, 'LF': {'state': 'failed', 'error': 'no-cache'}}, state='error', jid='c4', unit='states', done=2,
                  result={'ok': False, 'cycle': cyc, 'built': {'K': 10}, 'commits': {'K': 'a1'}, 'failed': [{'state': 'LF', 'error': 'no-cache'}], 'reason': 'partial'})
    st['views'], st['i'] = views[:3] + [part] + views[4:], 0
    posts1, syncs1, n_notes = len(st['posts']), len(c.js('window.__sync.calls')), len(c.note_log())
    c.tap('[data-update-all] [data-verb=all]')
    _ask_text(c)
    c.tap('.f-modal [data-ok]')
    c.until("document.querySelector('[data-update-all] [data-chain-result]')?.dataset.result === 'partial'", timeout=60000, what='the chain goes on after the failure and ends « partial »')
    reason = sm('buildPartial').replace('{s}', label('proc')).replace('{built}', f"1 {_unit('state', lang, 1)}").replace('{failed}', '1').replace('{items}', name('LF'))
    line = _line(c, '[data-chain-result] b')
    c.ok(norm(reason) in line and norm(label('proc')) in line, line, 'the end names the failed set and its reason')
    c.eq([_chain_rows(c), [(p['set'], p['verb']) for p in st['posts'][posts1:] if p['verb'] in ('fetch', 'build')]],
         [[['base', 'done'], ['proc', 'failed'], ['vfr', 'done'], ['aircraft', 'done']], [('base', 'fetch'), ('base', 'build'), ('proc', 'fetch'), ('proc', 'build'), ('vfr', 'fetch'), ('vfr', 'build'), ('aircraft', 'fetch'), ('aircraft', 'build')]],
         'the sets are independent: after the failed proc build the vfr and aircraft sets still ran (SOG-0239)', what='failure goes on')
    c.eq([c.count('[data-chain-set=proc] [data-verb=chain-retry]'), c.count('[data-chain-set=base] [data-verb=chain-retry]'), c.count('[data-chain-set=vfr] [data-verb=chain-retry]')], [1, 0, 0], '« Réessayer » only on the failed set', what='retry button')
    c.eq(c.count('[data-update-all] [data-chain]'), 0, 'the chain line is gone', what='chain line')
    al = [o for o in c.doc('cache/data/journal.json')['ops'] if o.get('set') == 'all']
    c.eq([o['result'] for o in al], ['done', 'partial'], 'journaled: partial', what='journal')
    # ---- D2: « Réessayer » on the failed set: that set alone is run again (download then build), the others keep their result
    st['views'], st['i'] = [views[2], views[3]], 0
    posts_r = len(st['posts'])
    c.tap('[data-chain-set=proc] [data-verb=chain-retry]')
    c.until("document.querySelector('[data-update-all] [data-chain-result]')?.dataset.result === 'done'", timeout=60000, what='the retried set succeeds: the chain ends « done »')
    c.eq([_chain_rows(c), [(p['set'], p['verb']) for p in st['posts'][posts_r:] if p['verb'] in ('fetch', 'build')]], [[['base', 'done'], ['proc', 'done'], ['vfr', 'done'], ['aircraft', 'done']], [('proc', 'fetch'), ('proc', 'build')]],
         '« Réessayer » runs the failed set alone; the others keep their result; everything is done now', what='retry')
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
    c.eq([o['result'] for o in al], ['done', 'partial', 'done', 'cancelled', 'interrupted'], 'the start marker without its end is journaled « interrupted » (the retry of the failed set is journaled as its own chain)', what='journal')
    # ---- G: skipped sets with their reasons: nothing ticked in the States, the launcher does not know the aircraft verbs
    st['current'] = None
    st['verbs'] = BASE3 + PROC3 + VFR3
    c.page.reload(wait_until='load')
    _head(c)
    _all_open(c)
    _readd(c, 'ca', 'es', 'us')      # the coverage written by the earlier gestures (fr, gb) outlives the reload: the five zones are put back
    c.eq(c.js("document.querySelector('[data-update-all] [data-verb=all]').disabled"), False, 'the header button is live: the base and the VAC points', what='button 2')
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
    c.until("document.querySelector('[data-update-all] [data-chain-result]')?.dataset.result === 'failed'", timeout=30000, what='no set succeeded: every job start is refused')
    refused = T('updating', 'refused: {')
    c.eq([_line(c, '[data-chain-result] b'), len(st['posts']) - posts1, len(c.js('window.__sync.calls')) - syncs1, _chain_rows(c)],
         [norm(T('chainFailedAll').replace('{list}', f"{base_label} : {refused} ; {label('vfr')} : {refused}")), 2, 0, [['base', 'failed'], ['proc', 'skipped'], ['vfr', 'failed'], ['aircraft', 'skipped']]],
         'every job start is refused during an update of the suite: each set fails at its first step, none succeeded, nothing is published', what='chain updating')
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
def _pk_plan(taken=(), missing=(), failed=(), dry=True, state='done', jid='k1', zones=('fr', 'gb'), reason=None, step='', skipped=None, shown=None, extra=None):
    """The view of a base/pickup job: the plan (dry true) or the real run, with the launcher's result shape (tools/regen/base_sources.py)."""
    res = {'ok': reason is None and state != 'running', 'dry': dry, 'taken': list(taken), 'missing': list(missing), 'failed': list(failed)}
    if skipped is not None:
        res['skipped'] = list(skipped)
    if shown is not None:
        res['shown'] = shown
    res.update(extra or {})
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
    c.eq(c.js("[...document.querySelectorAll('[data-build] .d-verbs:not([data-select-row]) button:not([data-verb=update]):not([data-verb=all])')].map(b => b.dataset.verb)"), ['download', 'pickup', 'build', 'purge'], 'after Télécharger', what='order')
    _screen_ok(c, 'before')
    # ---- B: the plan (dry sent explicitly), ONE question; No takes nothing
    PK = lambda key: _trow(key, lang, after='  pk: {')
    short = lambda x: re.sub(r'\s*\(.*\)\s*$', '', x)
    take_ln = PK('takeZip').replace('{z}', zname('fr')).replace('{zip}', sia_zip['zip']).replace('{b}', _size(5242880, lang))
    miss_txt = T('pickupMissing').replace('{z}', zname('gb')).replace('{s}', _shortname(s_nats)).replace('{e}', miss_gb['expected'])
    fix_ln = PK('fixMissing').replace('{z}', zname('gb')).replace('{s}', short(s_nats)).replace('{e}', miss_gb['expected'])
    ask = {'text': norm(PK('title')), 'sections': [['take', norm(PK('take').replace('{n}', '1')), [norm(take_ln)]], ['fix', norm(PK('fix').replace('{n}', '1')), [norm(fix_ln)]]], 'note': ''}
    plan = _pk_plan([sia_zip], [miss_gb])
    st['views'], st['i'], st['start'] = [plan], 0, (200, {'job': 'k1'})
    n = len(st['posts'])
    c.tap(pk)
    q = _ask_text(c)
    c.eq([{'text': norm(q['text']), 'sections': q['sections'], 'note': norm(q['note'])}, norm(q['ok']), q['no'], len(st['posts']) - n], [ask, norm(T('pickup')), True, 1], 'ONE question from the plan, in titled groups, one line per file: what will be taken (country · file · size), what to fix (country · source : drop the file), and the note on where the files go (raw, never committed', what='question')
    c.eq({k: st['posts'][n][k] for k in ('set', 'verb', 'args')}, {'set': 'base', 'verb': 'pickup', 'args': {'zones': ['fr', 'gb'], 'personal': [], 'dry': True}}, 'the plan is a dry run, sent explicitly', what='dry body')
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
    build_done = _view('done', step='Terminé', jid='k4', done=1, zones={'fr': _zs('built', 4, 4)}, result={'built': ['fr'], 'failed': [], 'commits': [], 'cycle': '2026-10-29', 'current': '2026-10-29', 'stale': False, 'blocking': []})
    st['views'], st['i'], st['start'] = [plan, real_run, real, build_done], 0, (200, {'job': 'k1'})
    n = len(st['posts'])
    c.tap(pk)
    _ask_text(c)
    st['start'] = (200, {'job': 'k2'})
    c.tap('.f-modal [data-ok]')
    c.until("!!document.querySelector('[data-build] [data-running][data-op=pickup]:not([data-dry])')", timeout=8000, what='the real run is followed')
    c.eq({k: st['posts'][-1][k] for k in ('set', 'verb', 'args')},
         {'set': 'base', 'verb': 'pickup', 'args': {'zones': ['fr'], 'personal': [], 'dry': False, 'zips': {'sia': {'name': sia_zip['zip'], 'size': 3000000}}}},
         'the real body (only the zone with a zip in the plan) says dry false and carries the zip the plan showed (name and size), nothing re-read', what='real body')
    c.eq([_bv(c), c.js(f"document.querySelector('{pk}').disabled"), c.count('[data-build] [data-running] [data-zone-state]'), c.count('[data-build] [data-running] [data-count]'), c.count('[data-build] [data-running] [data-verb=stop]')],
         [['download:off', 'build:off', 'purge:off'], True, 0, 0, 1], 'one operation at a time; the bar has its step, no zone lines, no count; Arrêter', what='running')
    # taking the file builds the zones taken by itself (SOG-0180): no « now click… » instruction, the build follows
    st['start'] = (200, {'job': 'k4'})
    for _ in range(40):
        if any(p.get('verb') == 'build' for p in st['posts']):
            break
        c.wait(250)
    c.eq([{k: p[k] for k in ('set', 'verb')} | {'zones': p['args'].get('zones')} for p in st['posts'][-1:]], [{'set': 'base', 'verb': 'build', 'zones': ['fr']}], 'the zones taken (fr) are built right after, nobody clicks anything', what='chained build')
    done = T('done', 'pickupSum: {').replace('{n}', f"3 {FILES[lang][1]}").replace('{s}', _size(5242880, lang))
    c.until("!!document.querySelector('[data-build-result][data-op=build], [data-build-result][data-result=done]')", timeout=10000, what='the build ends')
    notes = _notes_with(c, done)
    c.eq([len(notes), norm(T('pickupHint')) in norm(notes[0])], [1, True], 'ONE notification for the pickup, which says the zones are built next', what='notification')
    c.eq(c.count('[data-pickup-hint]') + len([x for x in c.js("[...document.querySelectorAll('[data-build-result] [data-line]')].map(p => p.textContent)") if 'Construire' in x]), c.count('[data-pickup-hint]'), 'no sentence tells the user to click a button afterwards', what='no instruction')
    doc = c.until_doc('cache/data/journal.json', lambda d: bool(d and any(o.get('verb') == 'pickup' for o in d.get('ops', []))), what='the pickup is journaled')
    pks = [o for o in doc['ops'] if o['verb'] == 'pickup']
    c.eq([[o['set'], o['zones'], o['result'], o['files'], o['bytes'], o['failed']] for o in pks], [['base', ['fr'], 'done', 3, 5242880, []]], 'ONE journal entry: the real run only', what='journal')
    ops = c.js("[...document.querySelectorAll('[data-journal] [data-op]')].map(o => [o.dataset.opVerb, o.textContent.replace(/\s+/g, ' ').trim()])")
    c.ok(any(o[0] == 'pickup' and norm(T('pickup', 'opVerb: {')) in norm(o[1]) for o in ops), ops, 'the journal line says the verb')
    _screen_ok(c, 'at the end')
    # ---- D: nothing in Downloads: no question, the missing files said with their pattern
    none = _pk_plan([], [{'zone': 'fr', 'source': 'sia', 'expected': 'export_xml_bd_SIA_*.zip'}, miss_gb], jid='k3')
    st['views'], st['i'], st['start'] = [none], 0, (200, {'job': 'k3'})
    n = len(st['posts'])
    c.tap(pk)
    c.until("document.querySelector('[data-build-result][data-op=pickup]')?.dataset.result === 'nothing'", timeout=8000, what='nothing to take is said')
    lines = [norm(T('pickupMissing').replace('{z}', zname('fr')).replace('{s}', _shortname(s_sia)).replace('{e}', 'export_xml_bd_SIA_*.zip')), norm(miss_txt)]
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
    big_txt = T('pickupFailedLine').replace('{z}', zname('gb')).replace('{s}', _shortname(s_nats)).replace('{r}', T('pickupTooLarge').replace('{n}', '500'))
    big_q = T('pickupFailedLine').replace('{z}', zname('gb')).replace('{s}', short(s_nats)).replace('{r}', T('pickupTooLarge').replace('{n}', '500'))
    c.eq([q['sections'][0], q['sections'][1]], [['take', norm(PK('take').replace('{n}', '1')), [norm(take_ln)]], ['fix', norm(PK('fix').replace('{n}', '1')), [norm(big_q)]]], 'the failure is in the « to fix » group: the size message in words', what='question 2')
    st['start'] = (200, {'job': 'k5'})
    c.tap('.f-modal [data-ok]')
    c.until("document.querySelector('[data-build-result][data-op=pickup]')?.dataset.result === 'partial'", timeout=10000, what='the partial end')
    partial = T('partial', 'pickupSum: {').replace('{n}', f"3 {FILES[lang][1]}").replace('{s}', _size(5242880, lang)).replace('{f}', T('fetchFails', row=0).replace('{n}', '1'))
    c.eq([norm(c.text('[data-build-result] b')), [norm(t) for t in c.js("[...document.querySelectorAll('[data-build-result] [data-line]')].map(p => p.textContent)")], c.count('[data-build-result] [data-pickup-hint]')],
         [norm(partial), [norm(big_txt)], 0], 'partial: what was taken, the failure named, no hint and no automatic build (a failure leaves the screen to its gestures)', what='partial')
    # ---- F: the manual sources of a download that the launcher can take carry a button
    man = [{'zone': 'fr', 'source': 'sia', 'url': 'https://www.sia.example/aip', 'name': ['SIA fr', 'SIA en', 'SIA de', 'SIA es'], 'pickup': True, 'expected': 'export_xml_bd_SIA_*.zip'},
           {'zone': 'gb', 'source': 'nats', 'name': ['NATS fr', 'NATS en', 'NATS de', 'NATS es'], 'pickup': True, 'expected': 'EG_*_DS_*_XML.zip'},
           {'zone': 'fr', 'source': 'dircam', 'name': ['DIRCAM fr', 'DIRCAM en', 'DIRCAM de', 'DIRCAM es']}]
    fend = _fview({'fr': _fz('done', 1, 1), 'gb': _fz('done', 1, 1)}, state='done', verb='fetch', jid='f1', done=2,
                  result={'ok': True, 'fetched': ['fr', 'gb'], 'unchanged': [], 'failed': [], 'manual': man, 'outside_sync': 0, 'warnings': []})
    st['views'], st['i'], st['start'] = [fend], 0, (200, {'job': 'f1'})
    c.tap('[data-build] [data-verb=download]')
    c.until("!!document.querySelector('[data-build-result][data-op=fetch]')", timeout=10000, what='the download ends')
    items = c.js("[...document.querySelectorAll('[data-build-result] [data-manual-list] li')].map(li => [li.dataset.manual, li.textContent.replace(/\s+/g, ' ').trim()])")
    c.eq([i[0] for i in items], ['fr:sia', 'gb:nats', 'fr:dircam'], 'the three manual sources', what='manual')
    c.eq(['export_xml_bd_SIA_*.zip' in items[0][1], 'EG_*_DS_*_XML.zip' in items[1][1], '*' in items[2][1]], [True, True, False], 'the expected name is shown for the sources the launcher can take, not for the others', what='expected')
    rb = "[data-build-result] [data-verb=pickup]"
    c.eq([c.count(rb), norm(c.text(rb)), c.attr(rb, 'data-zones'), c.js(f"document.querySelector('{rb}').disabled")], [1, norm(T('pickup')), 'fr,gb', False], 'one button under the list, for the zones of the sources that can be taken', what='result button')
    st['views'], st['i'], st['start'] = [_pk_plan([sia_zip], [miss_gb], jid='k6')], 0, (200, {'job': 'k6'})
    n = len(st['posts'])
    c.tap(rb)
    _ask_text(c)
    c.eq({k: st['posts'][n][k] for k in ('set', 'verb', 'args')}, {'set': 'base', 'verb': 'pickup', 'args': {'zones': ['fr', 'gb'], 'personal': [], 'dry': True}}, 'the button starts the same plan for those zones', what='button body')
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
    c.eq(st['posts'][-1]['args'], {'zones': ['fr', 'gb'], 'personal': [], 'dry': False, 'zips': {'sia': {'name': sia_zip['zip'], 'size': 3000000}, 'nats': {'name': nats_zip['zip'], 'size': 2097152}}},
         'the real body carries both zips of the plan, equal to what it showed', what='real body 2')
    chg = T('pickupChanged').replace('{z}', zname('gb')).replace('{s}', _shortname(s_nats)).replace('{zip}', changed['zip'])
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
    c.eq({k: st['posts'][n][k] for k in ('set', 'verb', 'args')}, {'set': 'base', 'verb': 'pickup', 'args': {'zones': ['gb'], 'personal': [], 'dry': True}}, 'the button starts a new dry run (no zips), for that zone', what='replan')
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
    ns = T('pickupNotShown').replace('{z}', zname('gb')).replace('{s}', _shortname(s_nats)).replace('{zip}', nshown['zip'])
    c.eq([[norm(t) for t in c.js("[...document.querySelectorAll('[data-build-result] [data-line]')].map(p => p.textContent)")],
          c.attr('[data-build-result] [data-verb=pickup-replan]', 'data-zones')], [[norm(ns)], 'gb'],
         'a source not shown in the plan is said, nothing taken for it, with « Relancer le plan »', what='not-shown')
    # ---- I: a zip whose name is outside the rule (an accent): shown in the plan, never run; the other source is taken
    bad_zip = {**sia_zip, 'zip': 'export_xml_bd_SIA_é.zip'}
    plan5 = _pk_plan([bad_zip, nats_zip], [], [], jid='i1')
    real5 = _pk_plan([nats_zip], [], [], dry=False, jid='i2', zones=('gb',))
    st['views'], st['i'], st['start'] = [plan5, real5, build_done], 0, (200, {'job': 'i1'})
    n = len(st['posts'])
    c.tap(pk)
    q = _ask_text(c)
    rename = T('pickupRename').replace('{z}', zname('fr')).replace('{s}', _shortname(s_sia)).replace('{zip}', bad_zip['zip'])
    nats_ln = PK('takeZip').replace('{z}', zname('gb')).replace('{zip}', nats_zip['zip']).replace('{b}', _size(4194304, lang))
    rename_ln = PK('fixRename').replace('{z}', zname('fr')).replace('{s}', short(s_sia)).replace('{zip}', bad_zip['zip'])
    if c.width in (390, 1280):
        c.shot(f'L19_question_{c.width}_{lang}_delivered.png')   # the delivered state: groups, one line per file
    c.eq(q['sections'], [['take', norm(PK('take').replace('{n}', '1')), [norm(nats_ln)]], ['fix', norm(PK('fix').replace('{n}', '1')), [norm(rename_ln)]]],
         'the plan lists only the ready zip as to be taken, and the zip with the bad name under « to fix » as an instruction (rename it without space or accent)', what='question rename')
    st['start'] = (200, {'job': 'i2'})
    c.tap('.f-modal [data-ok]')
    for _ in range(40):
        if any(p.get('args', {}).get('dry') is False for p in st['posts'][n:]):
            break
        c.wait(250)
    real3 = [p for p in st['posts'][n:] if p.get('args', {}).get('dry') is False]
    c.eq(real3[-1]['args'], {'zones': ['gb'], 'personal': [], 'dry': False, 'zips': {'nats': {'name': nats_zip['zip'], 'size': 2097152}}},
         'the real run carries only the ready source: its zone and its zip', what='real body 3')
    for _ in range(40):
        if _notes_with(c, rename):
            break
        c.wait(250)
    c.ok(bool(_notes_with(c, rename)), None, 'the notification still says what was not taken (the build that follows replaces the panel)')
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
# the resize listener of the module (one while it is mounted): counted by the name of its function
_RESIZE_JS = """(() => { window.__mapResize = 0; const a = window.addEventListener, r = window.removeEventListener;
  window.addEventListener = function (t, f, o) { if (t === 'resize' && String(f).includes('resizeMaps')) window.__mapResize++; return a.call(this, t, f, o) };
  window.removeEventListener = function (t, f, o) { if (t === 'resize' && String(f).includes('resizeMaps')) window.__mapResize--; return r.call(this, t, f, o) } })()"""
# MapLibre is loaded on demand (window.maplibregl): its Map is wrapped the moment it appears, to keep the map of each panel (window.__zm.base / .proc, taken at
# the frame the module gives it) and to count the maps removed (window.__zmRemoved)
_ZHOOK_JS = """(() => { let ml; window.__zm = {}; window.__zmRemoved = 0;
  const hook = v => { const M = v && v.Map; if (M && !M.prototype.__zm) { M.prototype.__zm = 1;
    const fb = M.prototype.fitBounds, rm = M.prototype.remove;
    M.prototype.fitBounds = function (...a) { const k = this.getContainer().closest('[data-zone-map]')?.dataset.zoneMap; if (k) window.__zm[k] = this; return fb.apply(this, a) };
    M.prototype.remove = function (...a) { window.__zmRemoved++; return rm.apply(this, a) } } return v };
  Object.defineProperty(window, 'maplibregl', { configurable: true, get() { return ml }, set(v) { ml = hook(v) } }) })()"""
# a style with nothing but a background: the tiles are not reachable in the suite
_ZSTYLE = json.dumps({'version': 8, 'sources': {}, 'layers': [{'id': 'bg', 'type': 'background', 'paint': {'background-color': '#eeeeee'}}]})
_ZONE_NAMES = {'fr': ['France', 'France', 'Frankreich', 'Francia'], 'gb': ['Royaume-Uni', 'United Kingdom', 'Vereinigtes Königreich', 'Reino Unido'],
               'es': ['Espagne', 'Spain', 'Spanien', 'España'], 'us': ['États-Unis', 'United States', 'Vereinigte Staaten', 'Estados Unidos']}
# flat rectangles, side by side
_RECTS = {'fr': [0, 45, 12, 47], 'gb': [-12, 45, 0, 47], 'es': [-12, 43, 0, 45], 'us': [12, 45, 24, 47]}
# a point well inside each zone's polygon (lon, lat)
_ZC = {'fr': [6, 45.5], 'gb': [-6, 45.5], 'es': [-6, 43.8], 'us': [18, 46]}
_NO_RINGS = ('us',)   # the outline of these stubbed zones is only their frame (no ring)
_ZFILL = 'mb-zones-1-fill'   # the first zones layer of a map (map_base.js): the fill, carrying { id, tone, picked, approx }


def _outlines():
    """What the stubbed ctx.aerodb.zoneOutlines() answers: the shape of the real one ({ name ×4, rings, box, framed }). `framed` (the rings shifted into the box, aerodb fed1c6f4a)
    is what is drawn: for Great Britain the stub gives it apart from `rings` (a sliver far away) to pin that `framed` is preferred."""
    out = {z: {'name': _ZONE_NAMES[z], 'rings': [] if z in _NO_RINGS else [[[w, s], [e, s], [e, n - 1], [w, n], [w, s]]], 'box': [w, s, e, n]} for z, (w, s, e, n) in _RECTS.items()}
    out['gb']['framed'] = out['gb']['rings']
    out['gb']['rings'] = [[[100, 0], [101, 0], [101, 1], [100, 0]]]
    return out


_L20_JS = r"""async () => {
  const M = await import('/modules/data/model.js');
  const out = {};
  out.tone = [{ inCoverage: false }, { inCoverage: true, running: true, published: true }, { inCoverage: true, published: false }, { inCoverage: true, published: true, stale: true },
    { inCoverage: true, published: true, stale: false }, { inCoverage: false, running: true }].map(M.mapTone);
  // an antimeridian ring is read in one piece (Fiji: 177 … -179 becomes 177 … 181); a narrow ring is the same ring; nothing is nothing
  const fiji = [[177, -17], [-179, -17], [-179, -16], [177, -16], [177, -17]], small = [[0, 0], [10, 0], [10, 5], [0, 0]];
  out.unwrap = [M.unwrapRing(fiji), M.unwrapRing(small) === small, M.unwrapRing(null), M.unwrapRing([])];
  const sq = (id, w, s, e, n, over = {}) => ({ id, rings: [[[w, s], [e, s], [e, n], [w, n], [w, s]]], box: [w, s, e, n], ...over });
  const fc = M.zoneFeatures([sq('a', 0, 0, 10, 10, { tone: 'ok', picked: true }), sq('b', 170, -20, 180, -10, { rings: [fiji, small], tone: 'warn' }), { id: 'c', rings: [], box: [0, 0, 4, 2] }, { rings: [], box: [0, 0, 1, 1] }, { id: 'd' }, null]);
  out.features = [fc.type, fc.features.map(f => [f.properties.id, f.properties.tone, f.properties.picked, f.properties.approx, f.geometry.type, f.geometry.coordinates.length]),
    fc.features[1].geometry.coordinates[0][0][1][0], fc.features[2].geometry.coordinates[0][0]];
  out.nothing = [M.zoneFeatures(null).features, M.zoneFeatures([]).type];
  // the 44 px rule, the SVG projection and our own frame are gone: the base frames the view (zonesLayer.fit)
  out.gone = ['zoneMap', 'MAP_MIN_PX', 'zonesFrame', 'mainRing', 'ringArea'].map(k => k in M);
  out.zones = [M.PROC_ZONES];
  return out;
}"""
_ZXY_JS = """([kind, lon, lat]) => { const m = window.__zm[kind], p = m.project([lon, lat]), r = m.getContainer().getBoundingClientRect(); return [r.left + p.x, r.top + p.y] }"""
_ZFEAT_JS = """([kind, lon, lat]) => { const m = window.__zm[kind], p = m.project([lon, lat]); const f = m.queryRenderedFeatures([p.x, p.y], { layers: ['%s'] })[0];
  return f ? { id: f.properties.id, tone: f.properties.tone, picked: f.properties.picked, approx: f.properties.approx } : null }""" % _ZFILL
_ZVIEW_JS = """(kind) => { const m = window.__zm[kind], c = m.getCenter(); return [Math.round(c.lng * 1e4) / 1e4, Math.round(c.lat * 1e4) / 1e4, Math.round(m.getZoom() * 1e3) / 1e3] }"""


def _zmap_ready(c, kind, hook=True):
    """Waits for the map of the panel `kind` to be drawn by the module, then makes « Recentrer » hand it to the test (window.__zm[kind])."""
    c.js(f"document.querySelector('[data-zone-map={kind}]').scrollIntoView({{ block: 'center' }})")   # the map starts when it comes into the screen (SOG-0164)
    c.until(f"!!document.querySelector('[data-zone-map={kind}] .d-map-host .maplibregl-canvas')", timeout=20000, what=f'the {kind} map is drawn on the shared base')
    if hook:
        c.js(f"document.querySelector('[data-zone-map={kind}] .d-map-host').scrollIntoView({{ block: 'center' }})")
        c.tap(f'[data-zone-map={kind}] [data-act=map-recenter]')
        c.until(f'!!window.__zm.{kind}', timeout=6000, what=f'the {kind} map is kept by the hook')
        c.wait(400)


def _zpoint(c, kind, zone):
    """Page coordinates of a point inside the zone's polygon, the map scrolled into view."""
    c.js(f"document.querySelector('[data-zone-map={kind}] .d-map-host').scrollIntoView({{ block: 'center' }})")
    c.wait(250)
    return c.js(_ZXY_JS, [kind, *_ZC[zone]])


def _ztap(c, kind, zone):
    """A tap on the zone's polygon (mouse click, no movement)."""
    x, y = _zpoint(c, kind, zone)
    c.page.mouse.click(x, y)
    c.wait(300)


def _zfeat(c, kind, zone):
    """What the base's fill layer says of the zone under its point: { id, tone, picked, approx } (None if nothing is drawn there)."""
    return c.js(_ZFEAT_JS, [kind, *_ZC[zone]])


@case('L20', 'Données: the map of the States to tick on the shared map base (tone, tap, Recentrer, listener and maps removed) and the pure functions of the map; the base panel has no MapLibre map any more (SOG-0262: the world map is an SVG, L88); a failing zoneOutlines draws no world map',
      'L', tags=('data',), langs4=True, designs=('standard',),
      rule='modules/data/SPEC 5.5 (the map of the zones: the shared base, a tap ticks, a drag ticks nothing, Recentrer, no map without the base); ergonomics: one writer, never colour alone')
def l20(c):
    lang = c.lang
    li = {'fr': 0, 'en': 1, 'de': 2, 'es': 3}[lang]
    T = lambda key, after=None, row=0: _trow(key, lang, after, row)
    tone = lambda t: T(t, 'mapTone: {')
    # ---- A: the pure functions (tones, rings read in one piece, features for the base)
    c.page.goto(f'{c.base}/frame/manifest.webmanifest', wait_until='load')
    r = c.js(_L20_JS)
    c.eq(r['tone'], ['muted', 'accent', 'warn', 'warn', 'ok', 'muted'], 'a zone outside the coverage is muted, a running one accent, nothing published or a cycle gone by warn, else ok', what='mapTone')
    c.eq(r['unwrap'], [[[177, -17], [181, -17], [181, -16], [177, -16], [177, -17]], True, [], []], 'a ring across the antimeridian is read in one piece (its western longitudes + 360); a narrow ring is the same; nothing gives an empty ring', what='unwrapRing')
    kinds, ids, west, frame = r['features'][0], r['features'][1], r['features'][2], r['features'][3]
    c.eq([kinds, ids], ['FeatureCollection', [['a', 'ok', True, True, 'MultiPolygon', 1], ['b', 'warn', False, False, 'MultiPolygon', 2], ['c', 'muted', False, True, 'MultiPolygon', 1]]],
         'one MultiPolygon per zone with { id, tone, picked, approx }: the tone defaults to muted, a zone with no ring or whose only ring is its frame is approximate; no id, no entry', what='zoneFeatures')
    c.eq([west, frame], [181, [[0, 0], [4, 0], [4, 2], [0, 2], [0, 0]]], 'the rings of a feature are unwrapped; a zone without ring is its frame', what='zoneFeatures rings')
    c.eq([r['nothing'], r['gone'], r['zones']], [[[], 'FeatureCollection'], [False] * 5, [{'LF': ['fr'], 'K': ['us']}]],
         'nothing gives an empty collection; the 44 px rule, the SVG projection and our own frame are gone (the base frames the view); the States draw France and the United States', what='constants')
    # ---- B: the screen with the stubbed outlines and a style with nothing but a background: the base panel has NO MapLibre map any more (the world map of the base is an SVG, L88); the States map of the Procédures panel keeps the shared base
    mode = {'style': 'ok'}

    def style_route(route):
        if mode['style'] == 'ok':
            route.fulfill(status=200, content_type='application/json', body=_ZSTYLE)
        else:
            route.fulfill(status=404, content_type='text/plain', body='not found')
    c.context.route(re.compile(r'^https://tiles\.openfreemap\.org/'), style_route)
    cfg, _ = _fixture()
    cfg['outlines'] = _outlines()
    c.page.add_init_script(_RESIZE_JS)
    c.page.add_init_script(_ZHOOK_JS)
    _open(c, cfg)
    c.page.add_init_script(_FAILOUT_JS)
    _all_open(c)
    c.until("!!document.querySelector('[data-world-map]')", timeout=10000, what='the world map of the base is drawn')
    c.eq([c.count('[data-zone-map=base]'), c.count('[data-build-zone]'), c.count('[data-world-map] .maplibregl-canvas'), c.count('[data-wmap]')], [0, 0, 0, 1],
         'the base panel has no MapLibre map and no list of zones to tick any more: its map is the SVG world map (L88)', what='base map')
    # ---- D: the States map (France and the United States), on the shared base: tone, tap, legend
    _zmap_ready(c, 'proc')
    c.eq([_zfeat(c, 'proc', 'fr')['id'], _zfeat(c, 'proc', 'us')['id'], _zfeat(c, 'proc', 'us')['picked']], ['LF', 'K', False], 'the States with a bulk source, none ticked', what='proc features')
    _ztap(c, 'proc', 'us')
    c.eq([c.js("document.querySelector('[data-set-panel=proc] [data-item=K]').checked"), c.js("document.querySelector('[data-set-panel=proc] [data-item=LF]').checked"), _zfeat(c, 'proc', 'us')['picked']],
         [True, False, True], 'a tap on the United States ticks the State K in the panel\'s selection', what='proc tap')
    c.eq(norm(c.text('[data-zone-map=proc] [data-act=map-recenter]')), norm(T('mapRecenter')), 'the button is « Recentrer » in the language of the run', what='recenter text')
    # ---- F: the listener is there once and goes with the module, and so do the maps
    c.eq(c.js('window.__mapResize'), 1, 'one resize listener while the module is mounted', what='listener')
    removed = c.js('window.__zmRemoved')
    ids = c.js("[...document.querySelectorAll('#fMenu a[data-id]')].map(a => a.dataset.id)")   # the rail is in the page at both widths (hidden on a phone)
    other = next((i for i in ids if i != 'data'), None)
    c.ok(other is not None, ids, 'the Maintenance rail has another entry to leave the module')
    c.js("(h) => { location.hash = '#' + h }", other)
    c.until("!document.querySelector('[data-module=data]')", timeout=8000, what='the module is unmounted')
    c.eq([c.js('window.__mapResize'), c.js('window.__zmRemoved') - removed, c.count('.maplibregl-canvas')], [0, 1, 0], 'the listener is removed at unmount, and the map that was started (the States one) with it', what='unmount')
    # ---- H: a failing zoneOutlines: no world map, the rest of the panel is there, no error line
    c.page.evaluate("sessionStorage.setItem('__failOutlines', '1')")
    c.open('data', docs=LEVEL3, wait=False, app='maintenance')   # back on the module (the init scripts stay), now with a failing zoneOutlines
    _head(c)
    _all_open(c)
    c.wait(800)
    c.eq([c.count('[data-world-map]'), c.count('[data-error]'), c.js('window.__stub.calls.zoneOutlines >= 1'), c.count('[data-state-head]')], [0, 0, True, 1],
         'zoneOutlines throws: no world map, the state bar is all there is above, no error line', what='failure')
    c.check_errors()


# ------------------------------------------------------------------------------------------------------ L21 .. L23
@case('L21', 'Données: the State lines of the Procédures panel say the aerodromes held and the cycle (coverageByState, one read, again after a change)', 'L', tags=('data',), langs4=True,
      designs=('standard',), rule='modules/data/SPEC 5.5 (the Procédures panel, the user, 1 Nov 2026: « on ne voit pas les terrains déjà téléchargés »): each State line says its aerodromes held (and, for France, the cycle in force); the table is the one of coverageByState(), read once per load, again after { coverage: true }')
def l21(c):
    lang = c.lang
    cfg, _ = _fixture()
    cfg['states']['LF']['held'] = 12345
    cfg['states']['K'] = {'level': 'green', 'reason': 'held', 'label': ['held-fr', 'held-en', 'held-de', 'held-es'], 'names': ['États-Unis', 'United States', 'Vereinigte Staaten', 'Estados Unidos'], 'held': 1}
    _open(c, cfg)
    _all_open(c)
    c.until("!!document.querySelector('[data-set-panel=proc] [data-held=LF]')", timeout=15000, what='the State lines carry their held aerodromes')
    num = lambda n: c.js("([n, l]) => n.toLocaleString(l)", [n, lang])
    cycle = c.js("(d) => window.AeroAirac.cycleOf(d).id", cfg['publication']['proc']['inForce'])
    lf, k = norm(c.text('[data-set-panel=proc] [data-held=LF]')), norm(c.text('[data-set-panel=proc] [data-held=K]'))
    unit = lambda key, i: _trow(key, lang, 'unit: {', i)
    want_lf = norm('— ' + _trow('heldCycle', lang).replace('{n}', f"{num(12345)} {unit('aerodrome', 1)}").replace('{c}', cycle))
    want_k = norm(f"— {num(1)} {unit('aerodromeRead', 0)}")
    c.eq([lf, k], [want_lf, want_k], 'France: the aerodromes held and the cycle of the published procedures in force; another State: the aerodromes read (singular for one)', what='lines')
    c.eq(c.js("window.__stub.calls.coverageByState"), 1, 'one read of the table for the screen', what='one read')
    # aerodb announces a change of the coverage: the table is read again, and only then; the line follows
    c.js("() => { window.__stub.states.LF.held = 15; for (const f of window.__stub.fns) f({ coverage: true }) }")
    c.until("document.querySelector('[data-set-panel=proc] [data-held=LF]')?.textContent.includes('15')", timeout=8000, what='the line follows the change')
    c.eq(c.js("window.__stub.calls.coverageByState"), 2, 'read again after { coverage: true }, once', what='second read')
    c.check_errors()


_L22_JS = """async () => {
  const M = await import('/modules/data/model.js'), out = {};
  out.tone = [{ reason: 'held', outdated: false }, { reason: 'held', outdated: true }, { reason: 'partial' }, { reason: 'sia', level: 'orange' }, { reason: 'images', level: 'red' }, null, {}].map(M.coverTone);
  out.boxes = [M.viewBoxes(-10, 40, 10, 50), M.viewBoxes(170, -20, 190, 0), M.viewBoxes(-200, 0, -170, 10), M.viewBoxes(-190, -10, 190, 10), M.viewBoxes(NaN, 0, 1, 1), M.viewBoxes(0, 0, 1, undefined)];
  const fc = M.pointFeatures([{ id: 'LFPG', lon: 2.5, lat: 49, tone: 'ok' }, { id: 'LFMN', lon: 7.2, lat: 43.6, tone: 'warn' }, { id: 'LFBO', lon: 1.3, lat: 43.6, tone: 'bad' }, { id: 'XXXX', lat: 1, tone: 'ok' }, { lon: 1, lat: 1, tone: 'ok' }, null]);
  out.features = [fc.type, fc.features.map(f => [f.properties.id, f.properties.tone, f.geometry.type, f.geometry.coordinates]), M.pointFeatures(null).features];
  return out;
}"""


@case('L22', 'Données: the pure functions of the held aerodromes on the map (coverTone, viewBoxes, pointFeatures)', 'L', tags=('data',), phone=False, designs=('standard',),
      rule='modules/data/SPEC 5.5: only held aerodromes are drawn (green up to date, orange of a past cycle or partial), the view is asked in one box or two across the antimeridian')
def l22(c):
    c.page.goto(f'{c.base}/frame/manifest.webmanifest', wait_until='load')
    r = c.js(_L22_JS)
    c.eq(r['tone'], ['ok', 'warn', 'warn', None, None, None, None], 'held: green up to date, orange when outdated or partial; readable on demand, red, nothing: not drawn', what='coverTone')
    c.eq(r['boxes'], [[[-10, 40, 10, 50]], [[170, -20, 180, 0], [-180, -20, -170, 0]], [[160, 0, 180, 10], [-180, 0, -170, 10]], [[-180, -10, 180, 10]], [], []],
         'the view in one box, two across the antimeridian (east beyond 180: wrapped), the whole world when it spans 360°, none when a limit is not a number', what='viewBoxes')
    c.eq(r['features'], ['FeatureCollection', [['LFPG', 'ok', 'Point', [2.5, 49]], ['LFMN', 'warn', 'Point', [7.2, 43.6]]], []],
         'one Point [lon, lat] per held aerodrome with { id, tone }; no position, no code or another tone: left out; nothing: none', what='pointFeatures')


# the points drawn by the shared base (pointsLayer: one circle layer « mb-points-<n>-dot ») as the screen shows them: [id, tone, [lon, lat]] of the rendered features, sorted;
# [] below the layer's minimum zoom. And the layer's minimum zoom.
_ZPTS_JS = """() => { const m = window.__zm.proc, ids = m.getStyle().layers.filter(l => /^mb-points-\\d+-dot$/.test(l.id)).map(l => l.id);
  const seen = new Map(); for (const f of m.queryRenderedFeatures({ layers: ids })) seen.set(f.properties.id, [f.properties.id, f.properties.tone, f.geometry.coordinates.map(v => Math.round(v * 1e3) / 1e3)]);
  return [...seen.values()].sort((a, b) => (a[0] < b[0] ? -1 : 1)) }"""
_ZPTS_MINZOOM_JS = """() => { const m = window.__zm.proc, ls = m.getStyle().layers.filter(l => /^mb-points-\\d+-dot$/.test(l.id)); return ls.length ? ls.map(l => l.minzoom) : null }"""


@case('L23', 'Données: the held aerodromes on the Procédures map (points above the threshold only, a read, a tap says the code and the cycle and ticks nothing)', 'L', tags=('data',), langs4=True,
      designs=('standard',), rule='modules/data/SPEC 5.5: the aerodromes held are points on the map of the States, above the base\u2019s COVER_ZOOM only, read from the local base for the view (aerodromes, coverage), green up to date, orange outdated; a tap says the code and the cycle in a line under the map and does not tick the zone')
def l23(c):
    lang = c.lang
    li = {'fr': 0, 'en': 1, 'de': 2, 'es': 3}[lang]
    T = lambda key, after=None, row=0: _trow(key, lang, after, row)
    c.context.route(re.compile(r'^https://tiles\.openfreemap\.org/'), lambda r: r.fulfill(status=200, content_type='application/json', body=_ZSTYLE))
    cfg, _ = _fixture()
    cfg['outlines'] = _outlines()
    cfg['aero'] = [{'icao': 'LFAA', 'lat': 45.5, 'lon': 6.5}, {'icao': 'LFBB', 'lat': 45.5, 'lon': 5.5}, {'icao': 'LFCC', 'lat': 45.5, 'lon': 7.0}, {'icao': 'LFDD', 'lat': 45.2, 'lon': 5.0}]
    cfg['cov'] = {'LFAA': {'level': 'green', 'reason': 'held', 'source': 'published', 'outdated': False, 'counts': {'SID': 1, 'STAR': 1, 'APP': 1}, 'read_at': None},
                  'LFBB': {'level': 'green', 'reason': 'held', 'source': 'manual', 'outdated': True, 'counts': {'SID': 0, 'STAR': 1, 'APP': 0}, 'read_at': '2026-09-30T08:00:00Z'},
                  'LFCC': {'level': 'red', 'reason': 'images'}, 'LFDD': {'level': 'orange', 'reason': 'sia'}}
    c.page.add_init_script(_ZHOOK_JS)
    _open(c, cfg)
    _all_open(c)
    _zmap_ready(c, 'proc')
    c.js('window.__pts = ' + _ZPTS_JS)
    cover = c.js("async () => (await import('/modules/maps/lib/map_base.js?v=0')).COVER_ZOOM")
    c.ok(isinstance(cover, (int, float)), cover, 'the base gives COVER_ZOOM')
    # under the threshold: nothing is read, nothing is drawn (the State lines carry the count)
    c.eq([c.js("window.__zm.proc.getZoom() < %s" % cover), c.js(_ZPTS_JS), c.js("window.__stub.calls.aerodromes || 0")], [True, [], 0],
         'the first view frames the States, under the threshold: no point, no read of the local base', what='under the threshold')
    # above it: the aerodromes of the view are read, the held ones drawn (green up to date, orange outdated); red and readable-on-demand ones are not
    c.js("(z) => window.__zm.proc.jumpTo({ center: [6, 45.5], zoom: z + 0.25 })", cover)
    c.until("window.__pts().length === 2", timeout=10000, what='the held aerodromes are points')
    pts = c.js(_ZPTS_JS)
    c.eq(pts, [['LFAA', 'ok', [6.5, 45.5]], ['LFBB', 'warn', [5.5, 45.5]]], 'held and up to date: green; held of a past cycle: orange; red and readable-on-demand: not drawn', what='points')
    q = c.js("window.__stub.aeroQ.at(-1)")
    c.ok(q.get('lite') is True and q['bbox'][0] <= 5.5 and q['bbox'][2] >= 6.5 and q['bbox'][1] <= 45.5 <= q['bbox'][3], str(q), 'the read is the view: aerodromes({ bbox, lite }) of the local base, nothing else (never a download, never a write)')
    c.eq(c.js(_ZPTS_MINZOOM_JS), [cover], 'the layer is given the threshold as its minimum zoom', what='minzoom')
    # a tap on a point: the code and the cycle in the line under the map, and the zone below it is not ticked
    cycle = c.js("(d) => window.AeroAirac.cycleOf(d).id", cfg['publication']['proc']['inForce'])
    tone = lambda w: T(w, 'mapTone: {')
    c.js("document.querySelector('[data-zone-map=proc] .d-map-host').scrollIntoView({ block: 'center' })")
    c.wait(300)
    x, y = c.js(_ZXY_JS, ['proc', 6.5, 45.5])
    c.page.mouse.click(x, y)
    c.until("!!document.querySelector('[data-zone-map=proc] [data-point-info]')?.textContent.trim()", timeout=6000, what='the line says the aerodrome')
    c.eq(norm(c.text('[data-zone-map=proc] [data-point-info]')), norm(T('ptInfo').replace('{i}', 'LFAA').replace('{w}', tone('ok')).replace('{c}', cycle)), 'published procedures: the code, the state in words and the cycle in force', what='info published')
    c.eq(c.js("document.querySelector('[data-set-panel=proc] [data-item=LF]').checked"), False, 'the tap on a point does not tick the State below it', what='no toggle')
    x, y = c.js(_ZXY_JS, ['proc', 5.5, 45.5])
    c.page.mouse.click(x, y)
    c.until("document.querySelector('[data-zone-map=proc] [data-point-info]')?.textContent.includes('LFBB')", timeout=6000, what='the line says the other aerodrome')
    c.eq(norm(c.text('[data-zone-map=proc] [data-point-info]')), norm(T('ptInfoRead').replace('{i}', 'LFBB').replace('{w}', tone('warn')).replace('{d}', '2026-09-30')), 'a hand reading: the code, the state, the date read', what='info read')
    c.eq(c.js("document.querySelector('[data-set-panel=proc] [data-item=LF]').checked"), False, 'still not ticked', what='no toggle 2')
    # a tap on the zone itself, away from the points, still ticks it
    x, y = c.js(_ZXY_JS, ['proc', 6.0, 45.2])
    c.page.mouse.click(x, y)
    c.until("document.querySelector('[data-set-panel=proc] [data-item=LF]').checked", timeout=6000, what='the zone is ticked by a tap away from the points')
    # back under the threshold: the points go, nothing more is read
    reads = c.js("window.__stub.calls.aerodromes")
    c.js("(z) => window.__zm.proc.jumpTo({ zoom: z - 2 })", cover)
    c.until("window.__pts().length === 0", timeout=8000, what='the points go below the threshold')
    c.eq(c.js("window.__stub.calls.aerodromes"), reads, 'and nothing is read below it', what='no read')
    c.check_errors()


# ------------------------------------------------------------------------------------------------------ L24 .. L25
_L24_JS = """async () => {
  const M = await import('/modules/data/model.js');
  await import('/frame/aerodb/airac.js'); await import('/frame/aerodb/catalogue.js');
  const byId = id => window.AeroCatalogue.byId(id), out = {};
  const sia = { cycle: '2026-10-01', current: '2026-10-29', stale: true };
  out.sources = [M.sourcesOf({ sia, nats: { cycle: null, current: '2026-10-29', stale: false }, enaire: { cycle: 'bad', current: 5 }, junk: 'x', list: [1], none: null, fresh: { cycle: '2026-10-29', current: '2026-10-29', stale: false }, dates: { cycle: '2026-10-01', current: '2026-10-29' } }),
    M.sourcesOf(null), M.sourcesOf([]), M.sourcesOf('x')];
  out.cycles = M.cyclesOf({ fr: '2026-10-01', de: null, gb: 'x', es: 5, '': '2026-10-01', us: undefined });
  out.cyclesNone = [M.cyclesOf(null), M.cyclesOf([]), M.cyclesOf('x')];
  out.blocking = M.blockingOf([{ zone: 'fr', source: 'sia', cycle: '2026-10-01', extra: 1 }, { zone: 'fr' }, null, 'x', { zone: 'gb', source: 'nats', cycle: '01/10/2026' }, { zone: 'es', source: 'enaire', cycle: '2026-10-29' }]);
  const full = M.outcome({ state: 'done', result: { built: ['fr', 'us'], failed: [], cycle: '2026-10-01', current: '2026-10-29', stale: true, cycles: { fr: '2026-10-01', us: null }, folders: { fr: '2026-10-01', us: '2026-10-29' },
    blocking: [{ zone: 'fr', source: 'sia', cycle: '2026-10-01' }], builtOn: '2026-11-01', sources: { sia, nats: { cycle: '2026-10-29', current: '2026-10-29', stale: false } } } });
  out.outcome = [full.cycles, full.blocking, full.stale, full.sources.map(s => [s.id, s.cycle, s.stale]), 'cycle' in full];
  out.noBlock = [M.outcome({ state: 'done', result: { built: ['us'], cycles: { us: null }, stale: true, current: '2026-10-29' } }).stale, M.outcome({ state: 'done', result: { built: ['us'], blocking: [] } }).stale];
  const srcs = M.sourcesOf({ sia, nats: { cycle: '2026-10-01', current: '2026-10-29', stale: true }, enaire: { cycle: null, current: '2026-10-29', stale: false } });
  out.missing = [M.missingSources(srcs, byId), M.missingSources(srcs, byId, ['gb']), M.missingSources(srcs, byId, ['fr']).map(m => m.id),
    M.missingSources(M.sourcesOf({ sia: { cycle: null, current: '2026-10-29', stale: false } }), byId).map(m => [m.id, m.cycle]),
    M.missingSources(M.sourcesOf({ sia: { cycle: '2026-10-29', current: '2026-10-29', stale: false } }), byId), M.missingSources(srcs, null), M.missingSources(null, byId)];
  out.siaUrl = byId('sia').url('2026-10-29');
  out.target = [M.sourceTarget(byId, 'nats', '2026-10-29'), M.sourceTarget(id => ({ url: 'http://x.example/', fetch: { name: 'a_<AAAA-MM-JJ>_b' } }), 'x', '2026-10-29'), M.sourceTarget(() => ({ url: () => { throw new Error('x') } }), 'x', '2026-10-29'),
    M.sourceTarget(null, 'sia', '2026-10-29')];
  out.groups = M.blockingSources([{ zone: 'fr', source: 'sia', cycle: 'a' }, { zone: 'es', source: 'sia', cycle: 'a' }, { zone: 'gb', source: 'nats', cycle: 'b' }, { zone: 'x', source: 'sia', cycle: 'c' }]);
  const doc = M.sourcesDoc(srcs);
  out.doc = [doc, M.sourcesOf(doc).length === srcs.length && JSON.stringify(M.sourcesOf(doc)) === JSON.stringify(srcs), M.sourcesDoc([]), M.sourcesDoc(null)];
  const at = Date.parse('2026-10-29T10:00:00Z'), bo = { kind: 'done', built: ['fr'], failed: [], blocking: [{ zone: 'fr', source: 'sia', cycle: '2026-10-01' }], sources: srcs };
  out.entries = [M.journalEntry({ at, zones: ['fr'], seconds: 1, out: bo }), M.journalEntry({ at, zones: ['fr'], seconds: 1, out: { kind: 'done', built: ['fr'], failed: [], blocking: [], sources: [] } }),
    M.fetchEntry({ at, zones: ['fr'], seconds: 1, out: { kind: 'done', fetched: ['fr'], unchanged: [], failed: [], sources: srcs } }), M.fetchEntry({ at, zones: ['fr'], seconds: 1, out: { kind: 'done', fetched: [], unchanged: [], failed: [], sources: [] } })]
    .map(e => [e.sources ?? null, e.blocking ?? null]);
  const fo = M.fetchOutcome({ state: 'running', sources: { sia }, zones: {} }), fe = M.fetchOutcome({ state: 'done', sources: { sia }, result: { fetched: [], unchanged: [], failed: [], sources: { nats: { cycle: '2026-10-29', current: '2026-10-29', stale: false } } } });
  out.fetch = [fo.sources.map(s => s.id), fe.sources.map(s => s.id), M.fetchOutcome({ state: 'done', result: { fetched: [] } }).sources];
  return out;
}"""


@case('L24', 'Données: the sources dated and the cycle of each zone, the pure functions (outcome, sourcesOf, cyclesOf, blockingOf, missingSources, blockingSources, sourceTarget, journal)', 'L', tags=('data',), phone=False, designs=('standard',),
      rule='modules/data/SPEC 5.4, 6.3: a zone\u2019s cycle is its own dated source\u2019s (null: never out of date); the sources blocking a build are named once; a manual dated source missing the cycle in force says its file and its page')
def l24(c):
    c.page.goto(f'{c.base}/frame/manifest.webmanifest', wait_until='load')
    r = c.js(_L24_JS)
    ok = {'cycle': '2026-10-01', 'current': '2026-10-29', 'stale': True}
    c.eq(r['sources'], [[{'id': 'sia', **ok}, {'id': 'nats', 'cycle': None, 'current': '2026-10-29', 'stale': False}, {'id': 'enaire', 'cycle': None, 'current': None, 'stale': False},
                         {'id': 'fresh', 'cycle': '2026-10-29', 'current': '2026-10-29', 'stale': False}, {'id': 'dates', **ok}], [], [], []],
         'sources: one per dated source (cycle null without a file), a malformed date is null, a past cycle is stale by the flag or the dates; a value that is not an object is dropped; no table: none', what='sourcesOf')
    c.eq([r['cycles'], r['cyclesNone']], [{'fr': '2026-10-01', 'de': None}, [{}, {}, {}]], 'the cycles by zone: a date, or null for a zone without a dated source (kept); anything else dropped', what='cyclesOf')
    c.eq(r['blocking'], [{'zone': 'fr', 'source': 'sia', 'cycle': '2026-10-01'}, {'zone': 'es', 'source': 'enaire', 'cycle': '2026-10-29'}],
         'the blocking list: zone, source and a real cycle date; malformed entries dropped', what='blockingOf')
    c.eq(r['outcome'], [{'fr': '2026-10-01', 'us': None}, [{'zone': 'fr', 'source': 'sia', 'cycle': '2026-10-01'}], True, [['sia', '2026-10-01', True], ['nats', '2026-10-29', False]], False],
         'the end of a build: the cycles by zone (us: none), the blocking source, stale because one blocks, the sources; the single cycle of the SIA files is not kept', what='outcome')
    c.eq(r['noBlock'], [False, False], 'a zone with a null cycle is never out of date: nothing blocking, not stale (even if a stale flag came without the list)', what='null cycle')
    sia = {'id': 'sia', 'cycle': '2026-10-01', 'current': '2026-10-29', 'zones': ['fr'], 'url': r['siaUrl'], 'file': 'export_xml_bd_SIA_2026-10-29-v<nn>.zip'}
    c.ok(r['siaUrl'].startswith('https://'), r['siaUrl'], 'the catalogue\u2019s page of the SIA for the cycle is a link')
    c.eq(r['missing'], [[sia], [], ['sia'], [['sia', None]], [], [], []],
         'a manual, cycled source (SIA) is missing when stale or without a dated file: its page for the cycle in force and its file name with that date; NATS (manual, not cycled) and ENAIRE (launcher) are not; zones narrow it; no catalogue, no table: none', what='missingSources')
    c.eq(r['target'], [{'url': 'https://nats-uk.ead-it.com/cms-nats/opencms/en/Publications/digital-datasets/', 'file': 'EG_…_DS_…_XML.zip'}, {'url': '', 'file': 'a_2026-10-29_b'}, {'url': '', 'file': ''}, {'url': '', 'file': ''}],
         'where to take a source: a fixed page as it is, a page that is not https:// is dropped, a page that throws is dropped, the date of the file name is the cycle in force, no catalogue: nothing', what='sourceTarget')
    c.eq(r['groups'], [{'source': 'sia', 'cycle': 'a', 'zones': ['fr', 'es']}, {'source': 'nats', 'cycle': 'b', 'zones': ['gb']}, {'source': 'sia', 'cycle': 'c', 'zones': ['x']}],
         'the blocking sources, one row per source and past cycle with its zones', what='blockingSources')
    c.eq(r['doc'][1:], [True, None, None], 'the journal keeps the sources as { id: { cycle, current, stale } } and reads them back; none: nothing kept', what='sourcesDoc')
    c.eq(r['entries'], [[r['doc'][0], [{'zone': 'fr', 'source': 'sia', 'cycle': '2026-10-01'}]], [None, None], [r['doc'][0], None], [None, None]],
         'a build entry carries the sources and the blocking list, a download entry the sources, only when there are some', what='journal')
    c.eq(r['fetch'], [['sia'], ['nats'], []], 'the download reads the sources from the plan (the view from the start), the end\u2019s own win, none: none', what='fetchOutcome')


def _short(lang, src):
    """The short name of a dated source as the screen writes it (the catalogue name without its formats)."""
    return {'sia': {'fr': 'SIA France', 'en': 'SIA France', 'de': 'SIA Frankreich', 'es': 'SIA Francia'}[lang], 'nats': 'NATS UK'}[src]


@case('L25', 'Données: a manual dated source missing the cycle in force (the missing line with its page and file, Prendre le fichier téléchargé primary, Construire not, kept at rest, named in « Cycle X dépassé »)', 'L',
      tags=('data',), langs4=True, designs=('standard',),
      rule='modules/data/SPEC 5.4, 6.3: wherever the sources are known (the plan, the end of a download or a build, then the last one kept), a manual dated source missing the cycle in force says so with its file and its page; the pickup is the primary gesture')
def l25(c):
    lang = c.lang
    li = {'fr': 0, 'en': 1, 'de': 2, 'es': 3}[lang]
    _t, cur, prev, _n = _cycles()
    cur_d, prev_d = cur.isoformat(), prev.isoformat()
    srcs = {'sia': {'cycle': prev_d, 'current': cur_d, 'stale': True}, 'nats': {'cycle': cur_d, 'current': cur_d, 'stale': False}, 'enaire': {'cycle': None, 'current': cur_d, 'stale': False}}
    manual = [{'zone': 'fr', 'source': 'sia', 'url': 'https://www.sia.example/aip', 'name': ['SIA fr', 'SIA en', 'SIA de', 'SIA es'], 'pickup': True, 'expected': 'export_xml_bd_SIA_*.zip'}]
    run1 = _fview({'fr': _fz('fetching', 1, 3), 'gb': _fz('waiting')}, step='Zone fr')
    run1['sources'] = srcs   # the plan: the view carries the sources from the start
    end = _fview({'fr': _fz('done', 3, 3), 'gb': _fz('done', 2, 2)}, state='done', step='Terminé', done=2,
                 result={'ok': True, 'fetched': ['fr'], 'unchanged': ['gb'], 'failed': [], 'manual': manual, 'sources': srcs})
    st = _launcher(c, [run1, run1, end], verbs=['base/build', 'base/fetch', 'base/purge', 'base/pickup'])
    cfg, _ = _fixture()
    names = lambda *ids: ', '.join(z['names'][li] for z in cfg['zones'] if z['id'] in ids)
    _open(c, cfg)
    primary = lambda: c.js("[...document.querySelectorAll('[data-build] .d-verbs [data-verb]')].filter(b => b.classList.contains('primary')).map(b => b.dataset.verb)")
    stale_line = lambda by='': norm(_trow('staleCycle', lang).replace('{x}', _name(prev)).replace('{y}', _name(cur)) + by)
    by = _trow('staleBy', lang).replace('{s}', f"{_short(lang, 'sia')} {_name(prev)}")
    # ---- A: nothing is known yet: Construire is the primary gesture, no line, the out-of-date phrase without a source
    c.eq([primary(), c.count('[data-missing-source]'), norm(c.text('[data-update-all] [data-stale=base]'))], [['update'], 0, stale_line()],
         'sources unknown: « Mettre à jour » is the one primary (SOG-0071 time 3), no missing line, « cycle X out of date » without a source named', what='unknown')
    # ---- B: Télécharger: the view carries the sources from the start (the plan): the line is there while it runs
    c.tap('[data-verb=download]')
    c.until("!!document.querySelector('[data-build] [data-running][data-op=fetch]')", what='the download runs')
    c.until("!!document.querySelector('[data-build] [data-missing-source=sia]')", what='the plan says the SIA file is missing')
    site = _trow('sia', lang, 'srcSite: {')
    want = norm(_trow('srcMissing', lang).replace('{s}', _short(lang, 'sia')).replace('{c}', _name(cur)).replace('{a}', f'export_xml_bd_SIA_{cur_d}-v<nn>.zip').replace('{b}', site))
    sia_url = c.js("(d) => window.AeroCatalogue.byId('sia').url(d)", cur_d)
    c.eq([c.count('[data-missing-source]'), norm(c.text('[data-missing-source=sia]')), c.js("[...document.querySelectorAll('[data-missing-source=sia] a')].map(a => a.href)")], [1, want, [sia_url]],
         'one line for the SIA (NATS is current, ENAIRE is fetched by the launcher): its cycle in force, the file with that date, the link to the product page', what='missing line (plan)')
    c.eq([primary(), c.count('[data-missing-source] a[href^="javascript"]')], [['pickup'], 0], 'Prendre le fichier téléchargé is primary, Construire is not', what='primary (plan)')
    # ---- C: the end: the line stays, the manual list and its button are primary too
    c.until("!!document.querySelector('[data-build-result][data-op=fetch]')", timeout=10000, what='the download ends')
    c.eq([c.count('[data-missing-source=sia]'), norm(c.text('[data-missing-source=sia]')), c.count('[data-manual-list] li')], [1, want, 1], 'the end of the download keeps the line next to the manual list', what='missing line (end)')
    c.eq([c.js("[...document.querySelectorAll('[data-build] [data-verb=pickup]')].map(b => b.classList.contains('primary'))"), c.js("document.querySelector('[data-build] [data-verb=build]').classList.contains('primary')")],
         [[True, True], False], 'both pickup buttons are primary, Construire is not', what='primary (end)')
    c.eq(norm(c.text('[data-update-all] [data-stale=base]')), stale_line(by), '« cycle X out of date » names the source once', what='stale by')
    c.eq(c.count('[data-build] .d-zl [data-missing-source], [data-build] .d-zl [data-stale]'), 0, 'the source is not repeated on the zone lines', what='zone lines')
    # ---- D: at rest, after a reload: the last known sources come from the journal (nothing is started to read them)
    entry = {'at': '2026-10-29T10:00:00.000Z', 'set': 'base', 'verb': 'download', 'zones': ['fr', 'gb'], 'seconds': 3, 'result': 'done', 'sources': srcs, 'fetched': ['fr'], 'unchanged': ['gb'], 'failed': []}
    posts = len(st['posts'])
    c.open('data', docs=LEVEL3 + [['cache/data/journal.json', {'ops': [entry]}, 'cache']], wait=False, app='maintenance')
    _head(c)
    c.eq([c.count('[data-missing-source=sia]'), norm(c.text('[data-missing-source=sia]')) if c.count('[data-missing-source=sia]') else '', primary(), norm(c.text('[data-update-all] [data-stale=base]'))],
         [1, want, ['pickup'], stale_line(by)], 'at rest: the journal\u2019s last base entry gives the sources: the line, the primary pickup, the source named', what='at rest')
    c.eq(len(st['posts']), posts, 'no job was started to read them', what='no start')
    # ---- E: a build that blocks only fr; us has no dated source (cycle null): never said out of date
    b = _view('done', step='Terminé', done=2, zones={'fr': _zs('built', 4, 4), 'us': _zs('built', 5, 5)},
              result={'built': ['fr', 'us'], 'failed': [], 'commits': [], 'cycle': prev_d, 'current': cur_d, 'stale': True, 'cycles': {'fr': prev_d, 'us': None},
                      'blocking': [{'zone': 'fr', 'source': 'sia', 'cycle': prev_d}], 'sources': srcs}, jid='j2')
    st['views'] = [b]
    st['i'] = 0
    st['start'] = (200, {'job': 'j2'})
    c.tap('[data-verb=build]')
    c.until("!!document.querySelector('[data-build-result][data-result=done]')", timeout=10000, what='the build ends')
    items = f"{_short(lang, 'sia')} {_name(prev)} ({names('fr')})"
    c.eq([c.count('[data-build-result] [data-blocking]'), norm(c.text('[data-build-result] [data-blocking]')), c.count('[data-build-result] [data-built-cycle]')],
         [1, norm(_trow('srcBlocking', lang).replace('{a}', items).replace('{n}', _name(cur))), 0],
         'one line: the SIA at its past cycle, with the zone it feeds; the zone without a dated source is not named; no « built for » line', what='blocking line')
    c.eq([c.count('[data-missing-source=sia]'), primary()], [1, ['pickup']], 'and the line to take the file, the pickup still primary', what='after the build')
    c.check_errors()


K_NAME = {'fr': 'États-Unis', 'en': 'United States', 'de': 'Vereinigte Staaten', 'es': 'Estados Unidos'}


@case('I29', 'Données: one writer per shared field of the screen state (run and result in follow.js, chain in chain.js, S in state.js)', 'I',
      static=True, rule='modules/data SPEC 11 (R-S10): S.run and S.result are written by follow.js alone, S.chain by chain.js alone, S itself replaced by setState in state.js alone; the other files only read them')
def i29(c):
    import os
    owner = {'run': 'follow.js', 'result': 'follow.js', 'chain': 'chain.js'}
    LF = chr(10)  # a comment removed keeps its line breaks: the line said is the file's
    comment = re.compile(r'/\*.*?\*/|(?<![:\'"\\])//[^\n]*', re.S)
    # an assignment or a mutation: S.f = …, S.f.x = …, S.f[k] = …, S.f.x++ / += …, S.f.list.push(…) / .splice(…), delete S.f.x
    write = re.compile(r'(?<![\w.])(?:delete\s+)?S\.(run|result|chain)\b((?:\??\.[\w$]+|\[[^\]]*\])*)\s*(?:(?:[-+*/%&|^]|\?\?|\|\||&&)?=(?!=)|\+\+|--)'
                       r'|(?<![\w.])S\.(run|result|chain)\b(?:\??\.[\w$]+)*\.(?:push|pop|shift|unshift|splice|sort|reverse)\(')
    replace = re.compile(r'(?<![\w.$])S\s*=(?!=)')
    root = os.path.join(str(c.root), 'modules', 'data')
    bad = []
    for f in sorted(os.listdir(root)):
        if not f.endswith('.js'):
            continue
        text = comment.sub(lambda m: LF * m.group(0).count(LF), open(os.path.join(root, f), encoding='utf-8').read())
        for m in write.finditer(text):
            field = m.group(1) or m.group(3)
            if owner[field] != f:
                bad.append(f'{f}:{text[:m.start()].count(chr(10)) + 1} writes S.{field}')
        if f != 'state.js':
            bad += [f'{f}:{text[:m.start()].count(chr(10)) + 1} replaces S' for m in replace.finditer(text)]
    c.eq(bad, [], 'S.run and S.result written by follow.js only, S.chain by chain.js only, S replaced by state.js only', what='writers')


_INV = {'places': [
    {'id': 'repo', 'present': True, 'bytes': 479523 * 1024, 'files': 4000, 'truncated': False, 'state': 'tracked', 'writer': 'launcher+pilots'},
    {'id': 'local', 'present': True, 'bytes': 46121 * 1024, 'files': 120, 'truncated': False, 'state': 'local', 'writer': 'launcher'},
    {'id': 'raw', 'present': True, 'bytes': 83 * 1024 * 1024, 'files': 4, 'truncated': False, 'state': 'local', 'writer': 'user'},
    {'id': 'cache', 'present': False, 'bytes': 0, 'files': 0, 'truncated': False, 'state': 'outside', 'writer': 'app'},
    {'id': 'suite', 'present': True, 'bytes': 35416 * 1024, 'files': 90, 'truncated': True, 'state': 'outside', 'writer': 'suite'},
    {'id': 'downloads', 'present': False, 'bytes': 0, 'files': 0, 'truncated': False, 'state': 'outside', 'writer': 'user'},
    {'id': 'backup', 'present': True, 'bytes': 565 * 1024, 'files': 3, 'truncated': False, 'state': 'outside', 'writer': 'restoration', 'count': 2}]}


@case('L26', 'Données: the data inventory card (seven places, size, tracked / local / outside, read once when opened, unreadable said, nothing guessed)', 'L', tags=('data',), langs4=True,
      designs=('standard',), rule='SOG-0010 lot E2 (frame/settings/DATA_MAP.md § 5.1; modules/data/SPEC 12): a folded card, read from the launcher (GET data/inventory) only when opened; seven lines; an unreadable answer is said, never replaced by a guess; the answer is text and numbers, read through closed lists')
def l26(c):
    lang = c.lang
    T = lambda key, after=None, row=0: _trow(key, lang, after, row)
    inv = lambda k: T(k, 'inventory: {')
    st = _launcher(c, [], inventory=_INV)
    cfg, _ = _fixture()
    _open(c, cfg)
    c.until("!!document.querySelector('[data-inventory]')", timeout=20000, what='the folded inventory card')
    c.eq([c.js("document.querySelector('[data-inventory]').open"), st['inventory_calls']], [False, 0], 'folded, and nothing read until it is opened', what='folded')
    c.js("document.querySelector('[data-inventory]').open = true")
    c.until("!!document.querySelector('[data-inventory-list] li')", timeout=15000, what='the seven lines')
    c.eq(st['inventory_calls'], 1, 'one read, when opened', what='one read')
    rows = c.js("[...document.querySelectorAll('[data-inventory-list] li')].map(li => [li.dataset.place, li.dataset.state, li.dataset.present])")
    c.eq(rows, [['repo', 'tracked', 'true'], ['local', 'local', 'true'], ['raw', 'local', 'true'], ['cache', 'outside', 'false'], ['suite', 'outside', 'true'],
                ['downloads', 'outside', 'false'], ['backup', 'outside', 'true']], 'seven lines in the order of the table, each with its tracking state', what='lines')
    txt = lambda p: norm(c.text(f'[data-inventory-list] li[data-place={p}]'))
    c.ok(norm(inv('absent')) in txt('cache') and norm(inv('absent')) in txt('downloads'), txt('cache'), 'a place that is not on this disk says it is absent')
    c.ok(norm(T('atLeast', 'inventory: {').replace('{n}', '')).strip() in txt('suite') or 'least' in txt('suite') or 'mindestens' in txt('suite') or 'menos' in txt('suite') or 'moins' in txt('suite'),
         txt('suite'), 'a size cut short says « at least »')
    c.ok('(2)' in txt('backup'), txt('backup'), 'two backups left behind are counted')
    c.eq(norm(c.text('[data-inventory] [data-inv-total]')).startswith(norm(inv('total').split('{n}')[0])), True, 'the measured total is said', what='total')
    c.eq([c.count('[data-inventory] a'), c.count('[data-inventory] script'), c.count('[data-inventory] [data-act]')], [0, 0, 0], 'a card of text: no link, no action, nothing to run', what='read only')
    c.eq(st['posts'], [], 'nothing is sent to the launcher', what='no post')
    c.ge(min(c.js("[...document.querySelectorAll('[data-inventory] summary')].map(e => Math.round(e.getBoundingClientRect().height))")), 44, 'the summary is 44 px', what='touch height')
    c.check_errors()
    # a refused answer, and an old launcher (404): said unreadable, no line guessed
    for answer, what in (((403, {'error': 'refusé'}), 'refused'), (None, 'old launcher')):
        c.context.unroute(re.compile(r'/__setup/'))
        st = _launcher(c, [], inventory=answer)
        _open(c, cfg)
        c.until("!!document.querySelector('[data-inventory]')", timeout=20000, what='the card again')
        c.js("document.querySelector('[data-inventory]').open = true")
        c.until("!!document.querySelector('[data-inv-state=unread]')", timeout=15000, what=f'the unreadable message ({what})')
        c.eq([norm(c.text('[data-inv-state=unread]')), c.count('[data-inventory-list] li')], [norm(inv('unread')), 0], f'{what}: unreadable said, no line invented', what=what)
    # a hostile answer: text in the fields is never taken as markup or as a place
    c.context.unroute(re.compile(r'/__setup/'))
    evil = {'places': [{'id': 'repo', 'present': True, 'bytes': 10, 'files': 1, 'truncated': False, 'state': '<img src=x onerror=window.__pwn=1>', 'writer': '<b>x</b>'},
                       {'id': '<script>window.__pwn=1</script>', 'present': True, 'bytes': 9, 'files': 1, 'truncated': False, 'state': 'tracked', 'writer': 'user'}]}
    _launcher(c, [], inventory=evil)
    _open(c, cfg)
    c.until("!!document.querySelector('[data-inventory]')", timeout=20000, what='the card (hostile answer)')
    c.js("document.querySelector('[data-inventory]').open = true")
    c.until("!!document.querySelector('[data-inventory-list] li')", timeout=15000, what='the lines (hostile answer)')
    c.eq([c.count('[data-inventory-list] li'), c.count('[data-inventory] img'), c.count('[data-inventory] script'), c.js("window.__pwn === undefined")], [7, 0, 0, True],
         'a hostile state, writer or id: still seven known lines, no element, nothing runs', what='hostile')
    c.eq(c.attr('[data-inventory-list] li[data-place=repo]', 'data-state'), 'unknown', 'a state outside the closed list reads « unknown »', what='state')


_L27_JS = r"""async () => {
  const M = await import('/modules/data/model.js');
  const e = (cycle, at) => ({ inForce: cycle, cycles: { [cycle]: { parserVersion: 20, at, by: 'ABC', format: 'split' } } });
  const zone = (cycle, src) => ({ ...e(cycle, cycle + 'T08:00:00Z'), ...(src === undefined ? {} : { cycleSource: src }) });
  // fr (SIA) and gb (NATS) are of the cycle in force; de and it have no dated source, built long ago; ie has the old rule (no field)
  const base = { fr: zone('2026-10-29', 'sia'), gb: zone('2026-10-29', 'nats'), de: zone('2026-10-01', null), it: zone('2026-10-01', null), ie: zone('2026-10-01') };
  const ids = ['fr', 'gb', 'de', 'it'];
  const b = M.baseOf(base, ids);
  const out = { dated: [b.dated, b.cycle, b.oldestSource, b.zones.map(z => z.cycleSource)] };
  // the old reader (no cycleSource) says nothing about the age: never « dépassé »
  const old = M.baseOf(base, ['ie']);
  out.old = [old.dated, old.cycle, old.oldestSource];
  // a dated zone one cycle behind: the line is stale because of that source only
  const behind = M.baseOf({ ...base, gb: zone('2026-10-01', 'nats') }, ids);
  out.behind = [behind.dated, behind.cycle, behind.oldestSource];
  // none dated: no cycle, no source
  const none = M.baseOf(base, ['de', 'it']);
  out.none = [none.dated, none.cycle, none.oldestSource, none.published];
  // a hostile or unknown source name is « not dated », never taken as it is
  const evil = M.baseOf({ x: zone('2026-10-01', '<img src=x>'), y: zone('2026-10-01', 'constructor') }, ['x', 'y']);
  out.evil = [evil.dated, evil.cycle, evil.zones.map(z => z.cycleSource)];
  return out }"""


@case('L27', 'Données: « dépassé » only compares the zones a dated source feeds (cycleSource), a line without dated zone is never stale', 'L', tags=('data',),
      designs=('standard',), rule='SOG-0026 (AeroDB lot C, f089178f5): GeoNames, relief and openAIP feed every zone without an AIRAC cycle, so the oldest folder of all the fed zones said « dépassé » everywhere; only the zones with a cycleSource (sia, nats, enaire) count, against their own source')
def l27(c):
    c.page.goto(f'{c.base}/frame/manifest.webmanifest', wait_until='load')
    r = c.js(_L27_JS)
    c.eq(r['dated'], [2, '2026-10-29', 'sia', ['sia', 'nats', None, None]], 'fr and gb are dated, de and it are not: the cycle is the oldest of the dated zones only', what='dated')
    c.eq(r['old'], [0, None, None], 'a zone without the field (a reader older than lot C) is not dated: no cycle, never stale', what='no field')
    c.eq(r['behind'], [2, '2026-10-01', 'nats'], 'a dated zone one cycle behind: the oldest dated cycle, and the source that says so', what='behind')
    c.eq(r['none'], [0, None, None, 2], 'two zones published, none dated: no cycle and no source', what='none dated')
    c.eq(r['evil'], [0, None, [None, None]], 'an unknown or hostile source name reads as « not dated »', what='hostile')


_L28_JS = r"""async () => {
  const M = await import('/modules/data/model.js');
  // the two examples of AeroDB's contract (frame/aerodb/INTEGRATION.md, f089178f5), the plan (dry)
  const a = { ok: true, dry: true, taken: [{ zone: 'kh', source: 'openaip', zip: null, from: ['kh_rpp.json'], files: ['kh_rpp.geojson'], converted: ['kh_rpp.json'], unchanged: [], size: 2489, bytes: 3011 }],
    missing: [], failed: [], skipped: [], shown: { openaip: { name: 'openaip', size: 2489 } } };
  const b = { ok: true, dry: true, taken: [{ zone: 'kh', source: 'openaip', zip: null, from: ['kh_asp.geojson'], files: ['kh_asp.geojson'], converted: [], unchanged: [], size: 1480, bytes: 1480 }],
    missing: [], failed: [], skipped: [{ zone: 'kh', source: 'openaip', name: 'kh_apt.xml', why: 'format' }, { zone: 'kh', source: 'openaip', name: 'kh_hot.xml', why: 'layer' }],
    shown: { openaip: { name: 'openaip', size: 1480 } } };
  const only = { ok: true, dry: true, taken: [], missing: [], failed: [], skipped: [{ zone: 'kh', source: 'openaip', name: 'kh_apt.xml', why: 'format' }] };
  const view = r => ({ state: 'done', result: r, zones: {} });
  const o = r => { const x = M.pickupOutcome(view(r)); return [x.kind, x.taken.map(t => [t.zone, t.source, t.zip, t.from, t.files, t.converted, t.unchanged, t.size, t.bytes]), x.skipped.map(s => [s.zone, s.name, s.why]), x.files] };
  const out = { a: o(a), b: o(b), only: o(only) };
  out.shownA = M.openaipShown(a); out.shownOnly = M.openaipShown(only);
  // an openAIP entry is neither sendable by zip nor blocked: it travels by shown.openaip
  const sa = M.pickupSplit(M.pickupOutcome(view(a)).taken);
  out.splitA = [sa.ready.length, sa.blocked.length, Object.keys(sa.zips), sa.zones, sa.openaip];
  // a zip and an openAIP export together: the zip stays a zip, the zone of each is launched
  const mixed = M.pickupSplit(M.pickupOutcome(view({ ...a, taken: [...a.taken, { zone: 'fr', source: 'sia', zip: 'export_xml_bd_SIA_2026-11-26.zip', size: 3000000, files: ['a.xml'], bytes: 100 }] })).taken);
  out.mixed = [mixed.ready.map(t => t.source), mixed.blocked.length, Object.keys(mixed.zips), mixed.zones, mixed.openaip];
  // the user's folder is hostile text: a name outside the rule, a reason outside the closed list, a malformed shown, are all dropped
  const evil = { ok: true, dry: true, taken: [{ zone: 'kh', source: 'openaip', zip: null, from: ['<img src=x onerror=1>.geojson', 'ok_asp.geojson', '../../x.json'], files: ['x'.repeat(200)], converted: [], unchanged: [], size: 1, bytes: 1 }],
    skipped: [{ zone: 'kh', source: 'openaip', name: '<script>.xml', why: 'format' }, { zone: 'kh', source: 'openaip', name: 'a.xml', why: 'constructor' }, { zone: 'kh', source: 'openaip', name: 'b.xml', why: 'layer' }],
    shown: { openaip: { name: '<b>x</b>', size: -5 } } };
  const e = M.pickupOutcome(view(evil));
  out.evil = [e.taken[0].from, e.taken[0].files, e.skipped.map(s => s.name), M.openaipShown(evil), M.openaipShown({ shown: { openaip: { name: 'openaip', size: 1.5 } } })];
  return out }"""


@case('L28', 'Données: the openAIP exports of « Prendre le fichier téléchargé » (files one by one, JSON converted, XML said, the shown file sent back, hostile names dropped)', 'L', tags=('data',),
      designs=('standard',), rule='SOG-0027 (AeroDB lot C, f089178f5; frame/aerodb/INTEGRATION.md « base/pickup and the openAIP exports »): taken has zip null with from / files / converted / unchanged; skipped says the XML (why format) and the hot layer (why layer); shown.openaip is sent back in zips; the names come from the user\u2019s Downloads and are never taken as they are (audit 157)')
def l28(c):
    c.page.goto(f'{c.base}/frame/manifest.webmanifest', wait_until='load')
    r = c.js(_L28_JS)
    c.eq(r['a'], ['done', [['kh', 'openaip', None, ['kh_rpp.json'], ['kh_rpp.geojson'], ['kh_rpp.json'], [], 2489, 3011]], [], 1],
         'the contract\u2019s example (a): a JSON export taken and converted, nothing skipped', what='example a')
    c.eq(r['b'], ['done', [['kh', 'openaip', None, ['kh_asp.geojson'], ['kh_asp.geojson'], [], [], 1480, 1480]], [['kh', 'kh_apt.xml', 'format'], ['kh', 'kh_hot.xml', 'layer']], 1],
         'the contract\u2019s example (b): the GeoJSON taken, the XML (format) and the hot layer (layer) said', what='example b')
    c.eq(r['only'], ['nothing', [], [['kh', 'kh_apt.xml', 'format']], 0], 'only an XML: nothing taken, the XML said', what='only xml')
    c.eq([r['shownA'], r['shownOnly']], [{'name': 'openaip', 'size': 2489}, None], 'shown.openaip as the plan gave it, none without it', what='shown')
    c.eq(r['splitA'], [0, 0, [], [], ['kh']], 'an openAIP entry is neither sendable by zip nor blocked: its zone travels by shown.openaip', what='split')
    c.eq(r['mixed'], [['sia'], 0, ['sia'], ['fr'], ['kh']], 'a zip and an openAIP export together: the zip stays a zip, each zone launched', what='mixed')
    c.eq(r['evil'], [['ok_asp.geojson'], [], ['b.xml'], None, None], 'a name outside the rule, a reason outside the closed list, a malformed shown: dropped', what='hostile')
    # the page: the question says the files and the conversion, the real run sends shown.openaip back
    lang = c.lang
    li = {'fr': 0, 'en': 1, 'de': 2, 'es': 3}[lang]
    T = lambda key, after=None, row=0: _trow(key, lang, after, row)
    cfg, _ = _fixture()
    cfg['zones'] = cfg['zones']
    st = _launcher(c, [], verbs=ALL_VERBS + ['base/pickup'])
    _open(c, cfg)
    _all_open(c)
    pk = "[data-build] [data-verb=pickup]"
    taken = {'zone': 'fr', 'source': 'openaip', 'zip': None, 'from': ['fr_rpp.json'], 'files': ['fr_rpp.geojson'], 'converted': ['fr_rpp.json'], 'unchanged': [], 'size': 2489, 'bytes': 3011}
    plan = _pk_plan([taken], skipped=[{'zone': 'fr', 'source': 'openaip', 'name': 'fr_apt.xml', 'why': 'format'}], shown={'openaip': {'name': 'openaip', 'size': 2489}}, zones=('fr',))
    st['views'], st['i'], st['start'] = [plan], 0, (200, {'job': 'k1'})
    c.tap(pk)
    q = _ask_text(c)
    if c.width in (390, 1280):
        c.shot(f'L28_question_{c.width}_{lang}_delivered.png')
    lines = ' '.join(l for g in q['sections'] for l in g[2])
    c.ok(norm(T('pickupConverted').replace('{n}', '1')) in norm(lines), lines, 'the question says the JSON that is converted (in the group of what will be taken)')
    c.eq([[g[0], 'fr_apt.xml' in ' '.join(g[2])] for g in q['sections']], [['take', False], ['ignore', True]], 'and the XML that is not read, by its name, in the « ignored » group')
    st['views'], st['i'], st['start'] = [_pk_plan([taken], dry=False, zones=('fr',), shown=None)], 0, (200, {'job': 'k2'})
    c.tap('.f-modal [data-ok]')
    for _ in range(40):   # the real run is sent (the build of the zone taken follows it by itself, SOG-0180)
        if any(p.get('args', {}).get('dry') is False for p in st['posts']):
            break
        c.wait(250)
    real = [p for p in st['posts'] if p.get('args', {}).get('dry') is False]
    c.eq(real[-1]['args'], {'zones': ['fr'], 'personal': [], 'dry': False, 'zips': {'openaip': {'name': 'openaip', 'size': 2489}}},
         'the real run sends back exactly what the plan showed for openAIP (no zip name, the total size)', what='zips sent')


def _mv_view(result, state='done', jid='m1', undo=False, dry=True):
    """The view of a base/move-sources job with the launcher's result shape (tools/regen/base_sources.py move_sources)."""
    return _fview({}, state=state, verb='move-sources', args={'dry': dry, 'undo': undo}, jid=jid, result=result)


def _mv_res(moved=(), dry=True, undo=False, already=(), kept=(), conflicts=(), failed=(), reason=None):
    """The result of base/move-sources: the plan (dry true) or the real run."""
    r = {'ok': reason is None, 'dry': dry, 'undo': undo, 'moved': list(moved), 'already': list(already), 'kept': list(kept), 'conflicts': list(conflicts), 'failed': list(failed),
         'manifest': 'local/sources/sia/_manifest.json'}
    if reason:
        r['reason'] = reason
    return r


@case('L29', 'Données: « Ranger les sources brutes » in the inventory card (the plan first, one question, the run, the result with its reasons, a refusal, nothing to do, never a path or a hostile text)',
      'L', tags=('data',), langs4=True, designs=('standard',),
      rule='SOG-0030 (SOG-0010 § 6; modules/data/SPEC 12): base/move-sources from the inventory card — dry first (names and sizes, never a path), the run on confirmation, moved / kept / refused with bounded reasons, the undo; refused while a merge is pending or an operation runs; the card stays read only for a launcher that does not know the verb')
def l29(c):
    lang = c.lang
    T = lambda key, after='move: {': _trow(key, lang, after)
    why = lambda k: _trow(k, lang, 'why: {')
    cfg, _ = _fixture()
    xml = lambda n, cyc, b: {'name': n, 'cycle': cyc, 'from': 'sia/' + n, 'to': f'local/sources/sia/{cyc}/' + n, 'bytes': b}
    f1, f2 = xml('XML_SIA_2026-10-01.xml', '2026-10-01', 41943040), xml('AIXM4.5_all_2026-10-01.xml', '2026-10-01', 5242880)
    total = 41943040 + 5242880
    ask = lambda undo=False: _agree(T('askUndo' if undo else 'ask').replace('{n}', '2').replace('{b}', _size(total, lang)), lang)
    go = lambda: c.js("document.querySelector('[data-inventory]').open = true")
    vcode = ALL_VERBS + ['base/move-sources']
    posts = lambda st: [p for p in st['posts'] if p.get('verb') == 'move-sources']
    # ---- A: a launcher that does not know the verb: the card stays read only
    st = _launcher(c, [], inventory=_INV, verbs=ALL_VERBS)
    _open(c, cfg)
    c.until("!!document.querySelector('[data-inventory]')", timeout=20000, what='the card')
    go()
    c.until("!!document.querySelector('[data-inventory-list] li')", timeout=15000, what='the lines')
    c.eq([c.count('[data-move-box]'), c.js("[...document.querySelectorAll('[data-move]')].every(b => b.disabled)")], [1, True], 'a launcher without base/move-sources: the block is shown, every action grey (SOG-0144: it was empty), the card stays read only', what='unknown verb')
    # ---- B: the plan (dry sent), ONE question with names and sizes, then the run
    c.context.unroute(re.compile(r'/__setup/'))
    st = _launcher(c, [_mv_view(_mv_res([f1, f2]))], inventory=_INV, verbs=vcode)
    _open(c, cfg)
    c.until("!!document.querySelector('[data-inventory]')", timeout=20000, what='the card')
    go()
    c.until("!!document.querySelector('[data-move=plan]')", timeout=15000, what='the two buttons')
    c.eq([norm(c.text('[data-move=plan]')), norm(c.text('[data-move=plan-undo]')), c.js("document.querySelector('[data-move=plan]').disabled")], [norm(T('plan')), norm(T('planUndo')), False],
         'two buttons, ranger and remettre, live', what='buttons')
    c.eq(posts(st), [], 'nothing is sent before the gesture', what='no post')
    c.tap('[data-move=plan]')
    c.until("!!document.querySelector('[data-move-state=asking]')", timeout=20000, what='the question')
    q = norm(c.text('[data-move-state=asking] > p'))
    names = c.js("[...document.querySelectorAll('[data-move-files] li')].map(li => li.dataset.name || '')")
    ftxt = norm(c.text('[data-move-files]'))
    c.eq([posts(st)[0].get('set'), posts(st)[0].get('args')], ['base', {'dry': True, 'undo': False}], 'the plan is asked with dry true, undo false', what='plan body')
    c.eq([q, names], [norm(ask()), [f1['name'], f2['name']]], 'one question: how many files, how big; the files by name', what='question')
    c.ok(_size(41943040, lang) in ftxt and '2026-10-01' in ftxt and 'sia/' not in ftxt and 'local/' not in ftxt, ftxt, 'names, sizes and cycle, never a path')
    c.eq(c.js("document.querySelector('[data-move=plan]').disabled"), True, 'grey during the question: one operation at a time', what='grey')
    c.tap('[data-move=cancel]')
    c.until("!document.querySelector('[data-move-state=asking]')", timeout=5000, what='the question closed')
    c.eq(len(posts(st)), 1, 'No: nothing was run (the plan only)', what='no run')
    c.tap('[data-move=plan]')
    c.until("!!document.querySelector('[data-move-state=asking]')", timeout=20000, what='the question again')
    real = _mv_res([f1, f2], dry=False, already=['a.xml'], kept=[{'name': 'XML_SIA_2026-10-01.xml', 'why': 'tracked'}],
                   conflicts=[{'name': 'b.xml', 'why': 'different'}], failed=[{'name': 'c.xml', 'error': 'sha-mismatch'}], reason='partial')
    st['views'], st['i'] = [_mv_view(real, dry=False)], 0
    reads = st['inventory_calls']
    c.tap('[data-move=confirm]')
    c.until("!!document.querySelector('[data-move-state=done]')", timeout=20000, what='the result')
    lines = [norm(x) for x in c.js("[...document.querySelectorAll('[data-move-state=done] [data-move-line]')].map(p => p.textContent)")]
    refused = [(x[0], norm(x[1])) for x in c.js("[...document.querySelectorAll('[data-move-refused] li')].map(li => [li.dataset.why, li.textContent])")]
    c.eq(posts(st)[-1].get('args'), {'dry': False, 'undo': False}, 'the run is the same verb with dry false', what='run body')
    c.eq(lines, [norm(_agree(T('done').replace('{n}', '2').replace('{b}', _size(total, lang)), lang)), norm(_agree(T('already').replace('{n}', '1'), lang)), norm(_agree(T('kept').replace('{n}', '1'), lang)),
                 norm(_agree(T('refused').replace('{n}', '2'), lang)), norm(_trow('partial', lang, 'reason: {'))],
         'the result: moved, already in place, kept (tracked), refused, the reason of a partial run', what='result lines')
    c.eq([r[0] for r in refused], ['different', 'sha-mismatch'], 'the refused ones, each with its reason from the closed list', what='refused whys')
    c.ok(norm(why('different')) in refused[0][1] and norm(why('sha-mismatch')) in refused[1][1], refused, 'the reasons are said in words')
    c.ge(st['inventory_calls'], reads + 1, 'the inventory is read again: the row of the raw sources changes place', what='re-read')
    # ---- C: the undo asks its own question; hostile names and reasons stay text, nothing runs
    evil = {'name': '<img src=x onerror=window.__pwn=1>', 'cycle': '<b>', 'bytes': 9}
    st['views'], st['i'] = [_mv_view(_mv_res([f1, f2, evil], undo=True), undo=True)], 0
    c.tap('[data-move=plan-undo]')
    c.until("!!document.querySelector('[data-move-state=asking]')", timeout=20000, what='the question of the undo')
    c.eq(posts(st)[-1].get('args'), {'dry': True, 'undo': True}, 'the undo is asked as a plan too', what='undo body')
    c.eq(norm(c.text('[data-move-state=asking] > p')), norm(_agree(T('askUndo').replace('{n}', '3').replace('{b}', _size(total + 9, lang)), lang)), 'the question of the undo', what='undo question')
    c.eq([c.count('[data-move-box] img'), c.count('[data-move-box] script'), c.js("window.__pwn === undefined"), c.js("[...document.querySelectorAll('[data-move-files] li')].map(li => li.dataset.name || '')")[2:]],
         [0, 0, True, ['?']], 'a hostile name reads « ? »: no element, nothing runs', what='hostile')
    c.tap('[data-move=cancel]')
    # ---- D: nothing to put away: said, no question
    st['views'], st['i'] = [_mv_view(_mv_res([], already=['a.xml']))], 0
    n0 = len(posts(st))
    c.tap('[data-move=plan]')
    c.until("!!document.querySelector('[data-move-state=nothing]')", timeout=20000, what='nothing to do')
    c.eq([norm(c.text('[data-move-state=nothing] > p')), c.count('[data-move=confirm]'), len(posts(st)) - n0], [norm(T('nothing')), 0, 1], 'nothing to move: said, no question, no run', what='nothing')
    # ---- E: the launcher refuses (an unknown reason text is never shown)
    for code, key in ((403, 'forbidden'), (409, 'busy')):
        st['start'] = (code, {'error': '<img src=x onerror=window.__pwn=1> /secret/path'})
        c.tap('[data-move=plan]')
        c.until(f"document.querySelector('[data-move-state=refused]')?.dataset.why === '{key}'", timeout=20000, what=f'the refusal {key}')
        c.eq([norm(c.text('[data-move-state=refused]')), c.js("window.__pwn === undefined")], [norm(_trow(key, lang, 'refusal: {')), True], f'{code}: the card says why in its own words, the launcher text is never shown', what=key)
    # ---- F: a merge pending in data/: refused before any job; counter-test: without it the job goes out
    st['sync'] = {'changes': 0, 'ahead': 0, 'merging': True, 'last': None}
    st['start'] = (200, {'job': 'm1'})
    n0 = len(posts(st))
    c.tap('[data-move=plan]')
    c.until("document.querySelector('[data-move-state=refused]')?.dataset.why === 'sync'", timeout=20000, what='the refusal for a pending merge')
    c.eq([len(posts(st)) - n0, norm(c.text('[data-move-state=refused]'))], [0, norm(_trow('sync', lang, 'refusal: {'))], 'a merge pending: refused, no job started', what='merge')
    st['sync'] = {'changes': 0, 'ahead': 0, 'merging': False, 'last': None}
    st['views'], st['i'] = [_mv_view(_mv_res([f1]))], 0
    c.tap('[data-move=plan]')
    c.until("!!document.querySelector('[data-move-state=asking]')", timeout=20000, what='the question once the merge is over')
    c.eq(len(posts(st)) - n0, 1, 'counter-test: without the pending merge the same gesture starts the job', what='counter-test')
    c.check_errors()


@case('L31', 'Données: after Construire the screen reads the published state again without a reload (aerodb keeps its list of published zones: refresh() first), so the orange zone turns green', 'L', tags=('data',),
      designs=('standard',), screens=False, night=False,
      rule='SOG-0072: « après avoir recalculé, toujours un pays orange, il faut ctrl-maj-F5 » — the end of a real build (and of a publication, and of the chain) asks aerodb to forget its memorised list of zones (refresh()) before the screen reads publication() again')
def l31(c):
    _t, cur, prev, _n = _cycles()
    v_done = _view('done', step='Terminé', done=1, total=1, zones={'fr': _zs('built', 4, 4, commit='abc1234')},
                   result={'built': ['fr'], 'failed': [], 'commits': [{'zone': 'fr', 'commit': 'abc1234'}], 'cycle': cur.isoformat(), 'current': cur.isoformat(), 'stale': False, 'blocking': [],
                           'sources': {'sia': {'cycle': cur.isoformat(), 'current': cur.isoformat(), 'stale': False}}})
    st = _launcher(c, [v_done])
    cfg, _ = _fixture()
    cfg['memo'] = True   # what aerodb really does: publication() keeps answering the first state until refresh()
    _open(c, cfg)
    base_state = lambda: c.js("(() => { const r = [...document.querySelectorAll('[data-set]')].find(x => x.dataset.set === 'sia'); return r ? r.dataset.state || '' : null })()")
    first = base_state()
    c.eq(first, 'stale-cycle', 'France is one cycle behind: the SIA row is orange at first', what='first')
    _untick(c, 'ca', 'es', 'gb', 'us')
    # the build ends: what is published has changed (France is now of the current cycle) — the page is not reloaded
    c.js("window.__stub.publication.base.fr = { ...window.__stub.publication.base.gb, cycleSource: 'sia' }")
    c.tap('[data-verb=build]')
    c.until("!!document.querySelector('[data-build-result]')", timeout=15000, what='the end of the build')
    c.until("window.__stub.calls.refresh >= 1", timeout=6000, what='aerodb is asked to forget its list of zones')
    c.until(f"(() => {{ const r = [...document.querySelectorAll('[data-set]')].find(x => x.dataset.set === 'sia'); return !!r && r.dataset.state !== {json.dumps(first)} }})()", timeout=10000, what='the SIA row has left its orange state without a reload')
    c.ok(base_state() not in ('stale-cycle', None), base_state(), 'the SIA row is no longer « cycle gone by »: read again after the refresh, no reload')
    c.check_errors()


@case('L32', 'Données: ONE box « I certify that I use the data for my personal use » unlocks every personal-licence source: remembered on the workstation, found ticked at the next opening, sent to Construire; an old per-source box ticked migrates to it (SOG-0162, SOG-0079)', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=False, night=False,
      rule='SOG-0162: « on a besoin d\u2019une seule coche « je certifie utiliser les données pour mon usage personnel », et ensuite tu déverrouilles tout » — the box is a setting of the workstation (cache/data/personal.json), read at each opening and sent as args.personal (every personal source of the ticked zones); the boxes of before (one per source) migrate: one ticked = the box ticked')
def l32(c):
    lang = c.lang
    _t, cur, prev, _n = _cycles()
    v_done = _view('done', step='Terminé', done=2, zones={'fr': _zs('built', 4, 4), 'gb': _zs('built', 5, 5)},
                   result={'built': ['fr', 'gb'], 'failed': [], 'commits': [], 'cycle': cur.isoformat(), 'current': cur.isoformat(), 'stale': False, 'blocking': [],
                           'sources': {'sia': {'cycle': cur.isoformat(), 'current': cur.isoformat(), 'stale': False}}})
    st = _launcher(c, [v_done])
    cfg, _ = _fixture()
    _open(c, cfg)
    _untick(c, 'ca', 'es', 'us')
    box = lambda: c.js("document.querySelector('[data-certify]').checked")
    rows = lambda: c.js("[...document.querySelectorAll('[data-personal-row]')].map(r => r.dataset.personalRow)")
    c.eq(c.count('[data-personal-box] input[type=checkbox]'), 1, 'ONE box in the personal-licence block, not one per source', what='one box')
    c.eq(norm(c.text('[data-personal-box] [data-certify] + span')), norm(_trow('certify', lang)), 'worded as the user asked, in the language of the run', what='box label')
    c.eq([box(), rows(), c.count('[data-personal-kept]')], [False, ['nats', 'xplane'], 0], 'the first time: unticked, the sources it will unlock listed, nothing remembered', what='first time')
    c.eq(c.count('[data-licences-link]'), 1, 'a link to the « Sources et licences » page', what='link')
    # ---- ticked: written at once, said remembered
    _tap_certify(c)
    doc = c.until_doc('cache/data/personal.json', lambda d: bool(d and d.get('certified') is True), what='the certification written')
    c.ok(re.fullmatch(r'\d{4}-\d{2}-\d{2}T.*Z', doc.get('updated_at') or ''), doc, 'a UTC time beside it')
    c.eq(norm(c.text('[data-personal-kept]')), norm(_trow('personalKept', lang)), 'the line under the box says it is remembered, in the language of the run', what='note text')
    # ---- a new opening: ticked again without a gesture, and Construire sends every personal source of the zones
    c.page.reload()
    c.until("!!document.querySelector('[data-module=data] [data-data-head]')", timeout=20000, what='the screen is drawn again')
    c.settle()
    _untick(c, 'ca', 'es', 'us')
    c.eq([box(), c.count('[data-personal-kept]')], [True, 1], 'found ticked at the next opening, nobody ticked it again, and said so', what='after reload')
    c.tap('[data-verb=build]')
    c.until('document.querySelector("[data-build-result]")', timeout=12000, what='the build ends')
    c.eq(st['posts'][0]['args'], {'zones': ['fr', 'gb'], 'personal': ['nats']}, 'the build is sent with the personal sources of the ticked zones, never X-Plane', what='body')
    # ---- only its own box undoes it
    _tap_certify(c)
    c.until_doc('cache/data/personal.json', lambda d: bool(d) and d.get('certified') is False, what='unticked: written')
    c.page.reload()
    c.until("!!document.querySelector('[data-module=data] [data-data-head]')", timeout=20000, what='the screen is drawn a third time')
    c.settle()
    _untick(c, 'ca', 'es', 'us')
    c.eq([box(), c.count('[data-personal-kept]')], [False, 0], 'unticked stays unticked', what='third opening')
    # ---- a source whose zone is unticked is not listed, not sent
    _tap_certify(c)
    _untick(c, 'gb')
    c.eq(rows(), ['xplane'], 'NATS feeds only the UK: not listed with it unticked (so not sent)', what='listed')
    # ---- the migration: a document of before (one box per source) with one source ticked = the box ticked
    c.page.evaluate("() => new Promise((res, rej) => { const r = indexedDB.open('sogFrame'); r.onsuccess = () => { const tx = r.result.transaction('docs', 'readwrite'); tx.objectStore('docs').put({ path: 'cache/data/personal.json', text: JSON.stringify({ sources: ['nats'], updated_at: '2026-11-01T08:00:00Z' }), base: '', rev: '', at: Date.now(), policy: 'cache' }); tx.oncomplete = () => { r.result.close(); res() }; tx.onerror = () => rej(tx.error) }; r.onerror = () => rej(r.error) })")
    c.page.reload()
    c.until("!!document.querySelector('[data-module=data] [data-data-head]')", timeout=20000, what='the screen after the migration seed')
    c.settle()
    _untick(c, 'ca', 'es', 'us')
    c.eq(box(), True, 'an old document with one source ticked: the one box is ticked (migration)', what='migrated')
    c.check_errors()


@case('L82', 'Données: the personal-use box is held by the launcher (SOG-0238): the opening shows ITS file, the click posts the strict body, the cache of the page migrates once, a refusal puts the box back; an older launcher keeps the page’s own setting', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=False, night=False,
      rule='AeroDB K147 / K173 (SOG-0238, 3dcc5e780): GET /__setup/personal → { certified, at } at the opening; POST { certified } at each click (nothing else); once POST { certified: true, migrated: true } when the launcher has no file and the page cache is ticked (409 exists: no retry); the route is declared by the module')
def l82(c):
    lang = c.lang
    box = lambda: c.js("document.querySelector('[data-certify]').checked")
    cfg, _ = _fixture()
    # ---- the launcher's file wins over the cache of the page: it says ticked, the cache has nothing
    st = _launcher(c, [], personal={'certified': True, 'at': '2026-11-10T09:00:00Z'})
    _open(c, cfg)
    c.eq([box(), st['personal_gets'] >= 1, st['personal_posts'], c.count('[data-tick-station]')], [True, True, [], 0], 'the box shows the file of the launcher, not the cache of the page; nothing is posted at the opening; no « on the workstation » line', what='launcher wins')
    if c.width in (390, 1280):
        c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")   # the notes of the repeated reloads of this case are not the delivered state
        c.js("document.querySelector('[data-personal-box]').scrollIntoView({ block: 'center' })")
        c.shot(f'L82_launcher_{c.width}_{lang}_delivered.png')   # the box held by the launcher
    # ---- a click posts the strict body, the launcher answers, the cache follows
    _tap_certify(c)
    c.until_doc('cache/data/personal.json', lambda d: bool(d) and d.get('certified') is False, what='the cache follows the launcher')
    c.eq([st['personal_posts'], box()], [[{'certified': False}], False], 'the click posts { certified: false } and nothing else; the box follows the answer', what='click post')
    # ---- a refusal of the launcher: the box comes back as it was, said
    st['personal_refuse'] = True
    _tap_certify(c)
    c.until("!document.querySelector('[data-certify]').checked && !!document.querySelector('#fNotes .f-note')", timeout=6000, what='the box comes back')
    c.eq([box(), len(_notes_with(c, tx('modules/data/texts.js', 'tickRefused', lang)))], [False, 1], 'a refused write puts the box back and says it', what='refused')
    c.eq(st['personal_posts'][-1], {'certified': True}, 'what was posted is still the strict body', what='refused body')
    # ---- the migration: no file at the launcher, the page cache ticked → one POST with migrated, then the launcher's file holds
    # the cache says ticked, the launcher has no file: the page declares it once
    c.page.evaluate("""() => new Promise((res, rej) => { const r = indexedDB.open('sogFrame'); r.onsuccess = () => { const tx = r.result.transaction('docs', 'readwrite'); tx.objectStore('docs').put({ path: 'cache/data/personal.json', text: JSON.stringify({ certified: true, sources: [], updated_at: '2026-11-01T10:00:00Z' }), base: '', rev: '', at: Date.now(), policy: 'cache' }); tx.oncomplete = () => { r.result.close(); res() }; tx.onerror = () => rej(tx.error) }; r.onerror = () => rej(r.error) })""")
    st['personal'] = {'certified': False, 'at': None}
    st['personal_posts'].clear()
    st['personal_refuse'] = False
    c.page.reload()
    c.until("!!document.querySelector('[data-module=data] [data-data-head]')", timeout=20000, what='the screen after the cache seed')
    c.settle()
    c.until("document.querySelector('[data-certify]') && document.querySelector('[data-certify]').checked", timeout=8000, what='the box ticked by the migration')
    c.eq(st['personal_posts'], [{'certified': True, 'migrated': True}], 'once: { certified: true, migrated: true }, the only second body the launcher admits', what='migration')
    c.page.reload()
    c.until("!!document.querySelector('[data-module=data] [data-data-head]')", timeout=20000, what='the screen once more')
    c.settle()
    c.eq([box(), len(st['personal_posts'])], [True, 1], 'at the next opening the launcher has its file: no second migration', what='no retry')
    # ---- an older launcher (404): the page’s own setting, as before, nothing posted
    st['personal'] = None
    c.page.reload()
    c.until("!!document.querySelector('[data-module=data] [data-data-head]')", timeout=20000, what='the screen with an older launcher')
    c.settle()
    _tap_certify(c)
    c.until_doc('cache/data/personal.json', lambda d: bool(d) and d.get('certified') is False, what='the page keeps its own tick')
    c.eq(st['personal_posts'][1:], [], 'an older launcher: no POST (the migration’s one is the only one so far)', what='old launcher')
    c.eq(norm(c.text('[data-tick-station]')), norm(tx('modules/data/texts.js', 'tickOnStation', lang)), 'without the launcher’s route the screen says the certification for Little Navmap is made on the workstation', what='station line')
    if c.width in (390, 1280):
        c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")   # the notes of the repeated reloads of this case are not the delivered state
        c.js("document.querySelector('[data-personal-box]').scrollIntoView({ block: 'center' })")
        c.shot(f'L82_station_{c.width}_{lang}_delivered.png')   # the box of the page, with the line on the workstation
    c.check_errors()


@case('L83', 'Données: the base panel opens on its state (lot 1 of the redesign) — a sentence with its five numbers that unfold their zones in place, ONE « Mettre à jour » with its scope, its plan and its reason, the progress and the bilan under it', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=True, night=False,
      rule='Données redesign, lot 1 (the ergonomist): the base panel starts with « Cycle AAMM, en vigueur depuis le … Votre base : n à jour · n à reconstruire · n en échec · n attendent un fichier · n sans état »; a number unfolds its zones right under the sentence (same rows as the list below, same selection, nothing ticked, no scroll); one « Mettre à jour (n) » acts on the whole coverage or, with a partial selection, on « la sélection »; up to date: « Tout est à jour. » and no button; grey: its reason beside it; the progress and the bilan are in the same block')
def l83(c):
    lang = c.lang
    z = lambda n: _zones_text(lang, n)
    BT = lambda k, n: _trow(k, lang, after='  bal: {', row=0 if _one(lang, n) else 1).replace('{n}', z(n))
    UT = lambda k: _UT(k, lang)
    fetched = _view('done', step='Terminé', result={'fetched': ['fr'], 'unchanged': [], 'failed': [], 'manual': []})
    running = _view('running', step='Construction', done=1, total=5, zones={'ca': _zs('built', 4, 4), 'es': _zs('building', 1, 4)})
    partial = _view('done', step='Terminé', jid='j2', zones={'fr': _zs('built', 4, 4, commit='abc1234')}, result={'built': ['fr'], 'failed': [{'zone': 'es', 'error': 'invalid-output'}], 'commits': [{'zone': 'fr', 'commit': 'abc1234'}], 'reason': 'partial'})
    st = _launcher(c, [fetched], verbs=_VERBS)
    waiting = {'code': 'pickup-waiting', 'source': 'nats', 'set': 'AIP', 'cycle': '2026-11-26', 'zip': 'x.zip'}
    mixed = _status({'ca': _zst('up-to-date'), 'es': _zst('failed', {'code': 'failed', 'error': 'invalid-output'}), 'fr': _zst('stale', _NEWER), 'gb': _zst('stale', waiting, buildable=False)})   # us: no state at all
    st['status'] = mixed
    cfg, _ = _fixture()
    _open(c, _sized(cfg))
    _all_open(c)
    c.until("document.querySelectorAll('[data-state-sentence] [data-filter]').length === 5", timeout=10000, what='the five numbers of the sentence')
    keys = lambda: c.js("[...document.querySelectorAll('[data-state-sentence] [data-filter]')].map(b => b.dataset.filter)")
    rows = lambda sel: c.js("(s) => [...document.querySelectorAll(s + ' [data-zone-row]')].map(r => r.dataset.zoneRow)", sel)
    top = lambda: c.js("Math.round(document.querySelector('[data-state-sentence]').getBoundingClientRect().top + window.scrollY)")
    # ---- the sentence: the cycle in force and its date (the ones of the screen head), then the five numbers in their order
    cycle = c.text('[data-cycle-now]').strip()
    pat = re.escape(_trow('cycleDates', lang)).replace(re.escape('{a}'), '(?P<a>.+?)').replace(re.escape('{b}'), '(?P<b>.+?)')
    date = re.fullmatch(pat, norm(c.text('[data-cycle-dates]')).split(' · ')[0]).group('a')
    want = _trow('stateBase', lang) + ' ' + ' · '.join(BT(k, 1) for k in ('upToDate', 'rebuild', 'failed', 'waiting', 'unknown'))   # D4: the cycle and its date are in the title and the one-line head, not in the sentence
    c.eq(norm(c.text('[data-state-sentence]')), norm(want), 'the first thing of the base panel: the cycle in force and since when, then the zones of the base — one up to date, one to rebuild, one failed, one that waits for a file, one WITHOUT a state (counted, never hidden)', what='sentence')
    c.eq([keys(), c.count('[data-balance]'), c.count('[data-build] > h2 + [data-state-head]')], [['upToDate', 'rebuild', 'failed', 'waiting', 'unknown'], 0, 1], 'the numbers are the buttons of the sentence (five keys), the old one-line balance is gone, the block sits right under the title', what='numbers')
    c.eq([c.count('[data-state-zones]'), c.js("[...document.querySelectorAll('[data-state-sentence] [data-filter]')].map(b => b.getAttribute('aria-expanded'))")], [0, ['false'] * 5], 'nothing is unfolded at first', what='folded')
    # ---- ONE button, the same verb, whole coverage by default: n = to rebuild + failed + without state (the zone that waits for a file is not in it)
    c.eq(c.count('[data-build] [data-verb=update]'), 1, 'one « Mettre à jour » in the base panel', what='one button')
    c.eq(c.js("(() => { const b = document.querySelector('[data-build] [data-verb=update]'); return [!!b.closest('[data-state-head]'), b.disabled, b.classList.contains('primary')] })()"), [True, False, True], 'it is in the head block, live and primary', what='button place')
    c.eq(norm(c.text('[data-verb=update]')), norm(UT('updateN').replace('{n}', '3')), 'whole coverage (everything ticked is the default): 3 = one to rebuild + one failed + one without state', what='label whole')
    doing = lambda dl, bd: UT('doLine').replace('{l}', ', '.join([UT('doDl').replace('{z}', z(dl))] + ([UT('doBuild').replace('{z}', z(bd))] if bd else [])))
    c.eq(norm(c.text('[data-update-plan]')), norm(doing(3, 2)), 'under it one line says what it will do: download three zones, rebuild two (« Publier » stays its own step)', what='plan')
    c.eq(norm(c.text('[data-update-notes]')), norm(UT('waitNote').replace('{z}', BT('waiting', 1))), 'and that the zone that waits for a file is left to the user', what='notes')
    # ---- a number unfolds its zones in place, no scroll
    y0 = top()
    c.tap('[data-state-sentence] [data-filter=failed]')
    c.until("!!document.querySelector('[data-state-zones]')", timeout=4000, what='the failed zones unfold')
    c.eq([c.js("document.querySelector('[data-state-zones]').dataset.stateOpen"), rows('[data-state-zones]'), c.js("document.querySelector('[data-state-sentence] [data-filter=failed]').getAttribute('aria-expanded')")], ['failed', ['es'], 'true'], 'the number of failures unfolds the failed zone, and says it is open', what='unfold failed')
    c.eq(c.js("document.querySelector('[data-state-sentence]').nextElementSibling === document.querySelector('[data-state-zones]')"), True, 'right below the sentence', what='in place')
    c.eq(c.count('[data-state-zones] [data-zone-row=es] [data-zstate=failed]'), 1, 'the row is the one of the list below: name, state pill', what='row state')
    c.eq(norm(c.text('[data-state-zones] [data-zone-row=es] [data-verb=retry-zone]')), norm(UT('retry')), 'with its « Réessayer » (no tick: SOG-0262)', what='row actions')
    c.eq(abs(top() - y0) <= 1, True, 'the page did not move', what='no side effect')
    c.tap('[data-state-sentence] [data-filter=waiting]')
    c.until("document.querySelector('[data-state-zones]')?.dataset.stateOpen === 'waiting'", timeout=4000, what='the waiting zones unfold')
    c.eq([rows('[data-state-zones]'), c.count('[data-state-zones] [data-zone-row=gb] [data-verb=pickup]'), c.count('[data-state-zones] [data-zone-row=gb] [data-act=zone-upload]'), c.count('[data-state-zones]')], [['gb'], 1, 1, 1], 'another number replaces it: the zone that waits for a file, with « Prendre le fichier » and « Choisir le fichier… »', what='unfold waiting')
    c.tap('[data-state-sentence] [data-filter=unknown]')
    c.until("document.querySelector('[data-state-zones]')?.dataset.stateOpen === 'unknown'", timeout=4000, what='the zone without state unfolds')
    c.eq([rows('[data-state-zones]'), c.count('[data-state-zones] [data-zstate]')], [['us'], 0], 'the zone without a state is listed, with no pill', what='unfold unknown')
    c.tap('[data-state-sentence] [data-filter=rebuild]')
    c.until("document.querySelector('[data-state-zones]')?.dataset.stateOpen === 'rebuild'", timeout=4000, what='the zones to rebuild unfold')
    c.eq(rows('[data-state-zones]'), ['fr'], 'to rebuild: France', what='unfold rebuild')
    c.tap('[data-state-sentence] [data-filter=rebuild]')
    c.until("!document.querySelector('[data-state-zones]')", timeout=4000, what='the same number folds it again')
    c.eq([norm(c.text('[data-verb=update]')), c.js("document.querySelector('[data-build] [data-verb=update]').disabled")], [norm(UT('updateN').replace('{n}', '3')), False], 'the whole coverage, the button is live', what='label none')
    st['views'], st['i'] = [fetched], 0
    n0 = len(st['posts'])
    c.tap('[data-build] [data-verb=update]')
    _ask_text(c)
    c.eq([sorted(p['args']['zones']) for p in st['posts'][n0:] if p['verb'] == 'status'][0], ['ca', 'es', 'fr', 'gb', 'us'], 'it reads the state of the whole coverage', what='status whole')
    c.eq(sorted(_posts(st, 'fetch')[-1]['args']['zones']), ['es', 'fr', 'us'], 'and downloads the zones of the whole coverage that need it', what='fetch whole')
    c.tap('.f-modal [data-no]')
    c.until("!document.querySelector('.f-modal')", timeout=6000, what='the question is closed')
    # ---- the progress and the bilan are in the head block, under the button; the sentence stays while it works
    _untick(c, 'ca', 'fr', 'gb', 'us')      # the coverage is Spain alone: « Tout recalculer » builds it
    st['views'], st['i'], st['start'] = [running], 0, (200, {'job': 'j2'})
    c.js("document.querySelector('[data-verbs-more]').open = true")
    c.tap('[data-build] [data-verb=build]')
    c.until("!!document.querySelector('[data-build] [data-running]')", timeout=10000, what='the progress')
    c.eq([c.count('[data-build] [data-running]'), c.js("!!document.querySelector('[data-build] [data-running]').closest('[data-state-head]')"), c.count('[data-state-sentence] [data-filter]')], [1, True, 1], 'while it works the progress is in the head block, under the button, and the sentence stays (one zone in the coverage here: one number)', what='progress')
    st['views'], st['i'] = [partial], 0
    st['status'] = mixed
    c.until("!!document.querySelector('[data-build] [data-build-result]')", timeout=12000, what='the bilan')
    c.eq([c.count('[data-build] [data-build-result]'), c.js("!!document.querySelector('[data-build] [data-build-result]').closest('[data-state-head]')"), c.count('[data-build] [data-running]')], [1, True, 0], 'the bilan replaces it in the same block, and appears nowhere else of the base panel', what='bilan')
    c.until("!!document.querySelector('[data-state-sentence] [data-filter=failed]')", timeout=6000, what='the state is read again')
    c.tap('[data-state-sentence] [data-filter=failed]')
    c.until("!!document.querySelector('[data-state-zones] [data-zone-row=es] [data-verb=retry-zone]')", timeout=6000, what='« Réessayer » on the failed zone, in the head block')
    if c.width in (390, 1280):
        c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
        c.js("document.querySelector('[data-state-head]').scrollIntoView({ block: 'start' }); window.scrollBy(0, -140)")
        c.shot(f'L83_{c.width}_{lang}_delivered.png')   # the failure of one zone unfolded, the bilan of the run under the button
    # ---- the whole coverage up to date: the sentence and « Tout est à jour. », no button
    st['status'] = _ALL_OK()
    st['views'], st['i'] = [fetched], 0
    c.page.reload()
    c.until("!!document.querySelector('[data-module=data] [data-data-head]')", timeout=20000, what='the screen again')
    c.settle()
    _readd(c, 'ca', 'fr', 'gb', 'us')      # the coverage written by the gestures above (Spain) outlives the reload
    c.until("document.querySelectorAll('[data-state-sentence] [data-filter]').length === 1", timeout=10000, what='the sentence with its one number')
    c.eq([keys(), c.count('[data-build] [data-verb=update]'), norm(c.text('[data-all-fresh]'))], [['upToDate'], 0, norm(_trow('allFresh', lang))], 'everything up to date: one number, no button, « Tout est à jour. »', what='all fresh')
    c.eq(norm(c.text('[data-state-sentence]')).endswith(norm(_trow('stateBase', lang) + ' ' + BT('upToDate', 5))), True, 'the sentence says the five zones are up to date', what='sentence fresh')
    # ---- the launcher does not know base/status: the sentence says the cycle and why it cannot say more; the button is grey with its reason beside it
    st['verbs'] = ['base/fetch', 'base/build', 'base/purge']
    c.page.reload()
    c.until("!!document.querySelector('[data-module=data] [data-data-head]')", timeout=20000, what='the screen with an older launcher')
    c.settle()
    c.until("!!document.querySelector('[data-state-sentence]') && !!document.querySelector('[data-update-reason]')", timeout=10000, what='the sentence without state and the reason')
    why = _trow('unknown-verb', lang, after='  greyReason: {')
    c.eq(norm(c.text('[data-state-sentence]')), norm(_trow('stateUnknown', lang).replace('{r}', why)), 'no state known: the cycle, then why the base cannot be told', what='sentence unknown')
    c.eq([c.count('[data-state-sentence] [data-filter]'), c.js("document.querySelector('[data-build] [data-verb=update]').disabled"), norm(c.text('[data-update-reason]'))], [0, True, norm(why)], 'the button is grey and its reason is written beside it', what='grey')
    c.check_errors()


@case('L84', 'Données: the line of a zone whose file is taken by hand says, on the line, why « Prendre le fichier téléchargé » or « Choisir le fichier… » got nowhere (what was received, what is missing), and the grey button says why (SOG-0244)', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=True, night=False,
      rule='SOG-0244 (the user: « je désélectionne tout, je sélectionne le Portugal, j’ouvre le chevron, pour « prendre le fichier téléchargé ». Ça ne marche pas, et je ne peux pas ni savoir ce qui ne va pas, ni passer le fichier que je viens tout juste de télécharger »): on the line of a zone taken by hand « Choisir le fichier… » is always there; the reason of ANY refusal of the pickup (nothing in Downloads, a file to rename, a refused start) or of the upload (unrecognised, too large…) is written ON THE LINE — a notification fades, the line stays — with what was received and what is missing; a grey pickup button says why next to it')
def l84(c):
    lang = c.lang
    T = lambda key, after=None: _trow(key, lang, after)
    UP = lambda key: _trow(key, lang, after='  up: {')
    ZM = lambda key: _trow(key, lang, after='  zm: {')
    cfg, _ = _fixture()
    cfg['zones'].append({'id': 'pt', 'names': ['Portugal', 'Portugal', 'Portugal', 'Portugal'], 'frames': [], 'published': True})
    cfg['publication']['base']['pt'] = cfg['publication']['base']['fr']
    cfg['navpt'] = 'nopick'      # here Portugal is an ordinary source of the catalogue (the early « Choisir le fichier… » of a `fetch.pick` source is L86)
    waiting = {'code': 'pickup-waiting', 'source': 'navpt', 'set': 'AIP', 'cycle': '2026-11-26', 'zip': 'AIP_PT.zip'}
    # the pickup finds nothing for Portugal: the plan says « nothing found » and the file it expected
    plan = _pk_plan(missing=[{'zone': 'pt', 'source': 'navpt', 'expected': 'AIP_PT_*.zip'}], zones=('pt',))
    st = _launcher(c, [plan], verbs=_VERBS + ['base/pickup'])
    st['status'] = _status({'ca': _zst('up-to-date'), 'es': _zst('up-to-date'), 'fr': _zst('up-to-date'), 'gb': _zst('up-to-date'), 'us': _zst('up-to-date'),
                            'pt': _zst('stale', waiting, buildable=False)})
    answer = {'status': 422, 'body': {'ok': False, 'reason': 'unrecognised', 'expected': ['sia', 'nats']}}
    c.context.route(re.compile(r'/__setup/base/upload'), lambda route: route.fulfill(status=answer['status'], content_type='application/json', body=json.dumps(answer['body'])))
    _open(c, _sized(cfg))
    _all_open(c)
    c.until("[...document.querySelectorAll('[data-state-sentence] [data-filter]')].reduce((a, b) => a + parseInt(b.textContent, 10), 0) >= 6", timeout=8000, what='the six pills')
    row = '[data-state-zones] [data-zone-row=pt]'
    lines = lambda: [norm(x) for x in c.js(f"[...document.querySelectorAll('{row} [data-zone-msg] [data-line]')].map(p => p.textContent)")]
    # ---- his gesture: nothing ticked but Portugal, the fold « Plus » open, « Prendre le fichier téléchargé »
    _unfold(c, 'pt')
    c.js("document.querySelector('[data-verbs-more]').open = true")
    c.eq([c.count(f'{row} [data-verb=pickup]'), c.count(f'{row} [data-act=zone-upload]'), c.count(f'{row} [data-zone-msg]')], [1, 1, 0], 'the line of the zone says what it waits for, offers the pickup and « Choisir le fichier… », and has no message yet', what='line before')
    c.tap('[data-build] [data-verbs-more] [data-verb=pickup]')
    c.until(f"!!document.querySelector('{row} [data-zone-msg]')", timeout=8000, what='the line says why the pickup got nowhere')
    miss = T('pickupMissing').replace('{z}', 'Portugal').replace('{s}', 'NAV Portugal').replace('{e}', 'AIP_PT_*.zip')
    nothing = _trow('nothing', lang, after='  pickupSum: {')
    c.eq(lines(), [norm(nothing), norm(miss)], 'on the line of Portugal: nothing to take in Downloads, and the file that is missing (what it expected)', what='pickup message')
    c.eq([c.count(f'{row} [data-verb=pickup]'), c.count(f'{row} [data-act=zone-upload]')], [1, 1], 'and the line still offers both ways to pass the file', what='buttons stay')
    # a notification fades: the line does not
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.wait(500)
    c.eq(lines(), [norm(nothing), norm(miss)], 'once the notification is gone the line still says it', what='message stays')
    # ---- « Choisir le fichier… » with a file the launcher does not recognise: the refusal is written on the line, with the file that was received
    c.until("!document.querySelector('[data-state-zones] [data-zone-row=pt] [data-act=zone-upload]').disabled", timeout=8000, what='the buttons are free again')
    with c.page.expect_file_chooser() as fc:
        c.js(f"document.querySelector('{row} [data-act=zone-upload]').click()")
    fc.value.set_files({'name': 'AIP_PT.iso', 'mimeType': 'application/x-iso9660-image', 'buffer': b'CD001' + b'x' * 995})
    c.until(f"[...document.querySelectorAll('{row} [data-zone-msg] [data-line]')].some(p => p.textContent.includes('AIP_PT.iso'))", timeout=8000, what='the refusal is written on the line')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    got = lines()
    c.eq([got[0], norm(UP('unrecognised').split('{s}')[0]) in got[1] if len(got) > 1 else None, len(got)], [norm(ZM('chosen').replace('{name}', 'AIP_PT.iso')), True, 2], 'the upload refused: the line says which file was received and why the launcher did not take it (it replaces the old message)', what='upload message')
    c.eq(c.count(f'{row} [data-verb=pickup]') + c.count(f'{row} [data-act=zone-upload]'), 2, 'the way to try again is still on the line', what='again')
    if c.width in (390, 1280):
        c.js(f"document.querySelector('{row}').scrollIntoView({{ block: 'center' }})")
        c.shot(f'L84_{c.width}_{lang}_delivered.png')
    # ---- a pickup refused at the start (too early): the reason is on the line too
    st['start'] = (429, {'ok': False, 'reason': 'too-early'})
    c.until(f"!document.querySelector('{row} [data-verb=pickup]').disabled", timeout=8000, what='the pickup is free')
    c.tap(f'{row} [data-verb=pickup]')
    c.until(f"document.querySelectorAll('{row} [data-zone-msg] [data-line]').length > 0 && [...document.querySelectorAll('{row} [data-zone-msg] [data-line]')].every(p => !p.textContent.includes('AIP_PT.iso'))", timeout=8000, what='the refusal replaces the message of the upload')
    c.ok(len(lines()) == 1 and len(lines()[0]) > 0, lines(), 'a pickup refused at the start says its reason on the line (one sentence)')
    # ---- a launcher that does not know base/pickup: the button is grey on the line AND in the fold, each with its reason next to it
    st['verbs'], st['start'] = _VERBS, (200, {'job': 'j1'})
    c.page.reload(wait_until='load')
    _head(c)
    _all_open(c)
    _ready(c, 6)
    _unfold(c, 'pt')
    c.until("!!document.querySelector('[data-state-zones] [data-zone-row=pt] [data-verb=pickup]')", timeout=10000, what='the line of Portugal')
    grey = norm(_trow('unknown-verb', lang, after='  greyReason: {'))
    c.eq([c.js(f"document.querySelector('{row} [data-verb=pickup]').disabled"), norm(c.text(f'{row} [data-zone-grey]')), c.js("document.querySelector('[data-build] [data-verbs-more] [data-verb=pickup]').disabled"),
          norm(c.text('[data-build] [data-verbs-more] [data-pickup-reason]'))], [True, grey, True, grey], 'the pickup is grey: its reason is written next to it, on the line and in the fold', what='grey reason')
    c.eq(c.js(f"document.querySelector('{row} [data-act=zone-upload]').disabled"), False, '« Choisir le fichier… » stays live (it is another route of the launcher)', what='upload live')
    # ---- the state the user saw (« à reconstruire », buildable, no file waiting): the line has nothing to offer; the pickup from the fold, which finds nothing, writes it on the line and opens « Choisir le fichier… »
    st['status'] = _status({'ca': _zst('up-to-date'), 'es': _zst('up-to-date'), 'fr': _zst('up-to-date'), 'gb': _zst('up-to-date'), 'us': _zst('up-to-date'),
                            'pt': _zst('stale', {'code': 'source-newer', 'source': 'navpt', 'cycle': '2026-11-26', 'built': '2026-10-29'})})
    st['verbs'], st['views'], st['i'] = _VERBS + ['base/pickup'], [_pk_plan(zones=('pt',))], 0
    c.page.reload(wait_until='load')
    _head(c)
    _all_open(c)
    c.until("[...document.querySelectorAll('[data-state-sentence] [data-filter]')].reduce((a, b) => a + parseInt(b.textContent, 10), 0) >= 6", timeout=8000, what='the six pills')
    _unfold(c, 'pt')
    c.js("document.querySelector('[data-verbs-more]').open = true")
    c.eq([c.count(f'{row} [data-zone-action]'), c.count(f'{row} [data-act=zone-upload]')], [0, 0], 'a zone to rebuild whose file nothing says is waiting has no action on its line', what='plain line')
    c.tap('[data-build] [data-verbs-more] [data-verb=pickup]')
    c.until(f"!!document.querySelector('{row} [data-zone-msg]')", timeout=8000, what='the line says why the pickup got nowhere')
    c.eq([lines(), c.count(f'{row} [data-act=zone-upload]'), c.count(f'{row} [data-verb=pickup]')], [[norm(nothing)], 1, 1], 'the pickup found nothing: said on the line, which now offers « Choisir le fichier… » and the pickup again', what='after the first try')
    c.check_errors()


_RT = lambda key, lang: _trow(key, lang, after='  route: {')


@case('L33', 'Données: the « Route (RAD, points FRA) » row — Importer de Téléchargements: the plan names the workbooks and their cycles, the question, the import writes the cycles, the row turns green', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=False, night=False,
      rule='SOG-0125: route/import-rad is a source of data like NATS — one more row in the procedures group, the dry plan (workbooks found by pattern, cycles, size), a question that names them, the real import of the shown books only, then the cycles present; the state is that of the other sources')
def l33(c):
    lang = c.lang
    _t, cur, prev, _n = _cycles()
    rad, fra = 'RAD_2611_v1.0.xlsx', 'eurocontrol-airac-2611-fra-points-20261105.xlsx'
    files = [{'name': rad, 'size': 1500000, 'kind': 'rad', 'cycle': cur.isoformat(), 'title': 'Rolling RAD'}, {'name': fra, 'size': 90000, 'kind': 'fra', 'cycle': cur.isoformat()}]
    plan = _view('done', step='Terminé', result={'ok': True, 'dry': True, 'files': files, 'taken': [], 'failed': [{'name': 'RAD_vieux.xlsx', 'error': 'parse'}], 'rad': [], 'fra': [], 'commit': None})
    st = _launcher(c, [plan], verbs=['base/fetch', 'base/build', 'base/purge', 'route/import-rad'])
    cfg, _ = _fixture()
    _open(c, cfg)
    _all_open(c)
    row = lambda: c.js("(() => { const r = document.querySelector('[data-set=route]'); return r ? [r.dataset.state, r.dataset.cycle, r.closest('details.f-group').dataset.group] : null })()")
    c.eq(row(), ['absent', '', 'proc'], 'one more row in the procedures group, nothing imported yet: the state of a source absent from the repository', what='row at first')
    c.eq(norm(c.text('[data-set=route] summary b')), norm(_RT('name', lang)), 'its name', what='name')
    c.eq(norm(c.text('[data-route-meta]')), norm(_RT('noImport', lang)), 'nothing imported on this workstation', what='meta')
    c.js("document.querySelector('[data-set=route]').open = true")
    # ---- SOG-0237: where to create the free EUROCONTROL account (the EAD Basic page, direct link); nothing is asked or kept here
    c.eq(c.js("[...document.querySelectorAll('[data-route-account] a')].map(a => [a.getAttribute('href'), a.rel])"), [['https://www.ead.eurocontrol.int/cms-eadbasic/opencms/en/ead-solutions/ead-basic', 'noopener noreferrer']], 'the route row says where to register: the EAD Basic page of EUROCONTROL, in a link', what='account link')
    c.ok('Registration form (New Users)' in c.text('[data-route-account]') and c.count('[data-set=route] input[type=text], [data-set=route] input[type=password]') == 0, c.text('[data-route-account]'), 'with the name of the form, and no field for an identifier or a password')
    c.eq(c.js("document.querySelector('[data-verb=route-import]').disabled"), False, 'the button is live with a launcher that knows the verb', what='button')
    # ---- the plan (dry): nothing is written, the question names the workbooks, their cycles and the licence
    c.tap('[data-verb=route-import]')
    c.until('!!document.querySelector("[data-route-ask]")', timeout=10000, what='the question')
    c.eq({k: st['posts'][0][k] for k in ('set', 'verb', 'args')}, {'set': 'route', 'verb': 'import-rad', 'args': {'dry': True}}, 'the plan is asked with dry sent explicitly', what='plan body')
    c.eq(c.js("[...document.querySelectorAll('[data-route-book]')].map(li => [li.dataset.routeBook, li.dataset.kind])"), [[rad, 'rad'], [fra, 'fra']], 'the workbooks found, by name and kind, in the question', what='books')
    c.ok('Rolling RAD' in c.text('[data-route-books]') and rad in c.text('[data-route-books]') and fra in c.text('[data-route-books]'), c.text('[data-route-books]'), 'the question names both workbooks and the title of the RAD')
    c.eq(c.count('[data-route-failed] li'), 1, 'the unreadable workbook of Downloads is said, not taken', what='failed')
    c.eq(c.count('[data-route-licence]'), 1, 'the licence is said before the import', what='licence')
    c.eq(c.count('[data-set=route] [data-verb=route-import]'), 0, 'no second button while the question is asked', what='no button')
    c.eq(c.doc('cache/data/route.json'), None, 'nothing is written by the plan', what='no memory')
    # ---- no: nothing goes
    c.tap('[data-verb=route-no]')
    c.until('!document.querySelector("[data-route-ask]")', timeout=4000, what='the question closes')
    c.eq(len(st['posts']), 1, 'No sends nothing', what='posts')
    # ---- yes: the real import, only the books shown (name and size)
    st['views'] = [plan]
    st['i'] = 0
    c.tap('[data-verb=route-import]')
    c.until('!!document.querySelector("[data-route-ask]")', timeout=10000, what='the question again')
    done = _view('done', step='Terminé', jid='j2', result={'ok': True, 'dry': False, 'files': files, 'taken': [rad, fra], 'failed': [], 'rad': [cur.isoformat()], 'fra': [cur.isoformat()], 'commit': 'abc1234'})
    st['views'] = [done]
    st['i'] = 0
    st['start'] = (200, {'job': 'j2'})
    c.tap('[data-verb=route-yes]')
    c.until('!!document.querySelector("[data-route-result][data-result=done]")', timeout=12000, what='the end of the import')
    c.eq({k: st['posts'][-1][k] for k in ('set', 'verb', 'args')}, {'set': 'route', 'verb': 'import-rad', 'args': {'dry': False, 'books': [{'name': rad, 'size': 1500000}, {'name': fra, 'size': 90000}]}},
         'the real import: the books the plan showed, name and size, nothing else', what='import body')
    c.ok(c.count('[data-route-cycles]') == 1 and 'abc1234' in c.text('[data-route-cycles]'), c.text('[data-route-result]'), 'the cycles present and the commit are said')
    doc = c.until_doc('cache/data/route.json', lambda d: bool(d and d.get('rad') == [cur.isoformat()]), what='the memory of the cycles')
    c.eq([doc['rad'], doc['fra'], doc['commit']], [[cur.isoformat()], [cur.isoformat()], 'abc1234'], 'the cycles present are kept on the workstation', what='memory')
    c.eq(row()[:2], ['ok', cur.isoformat()], 'the row turned green: the RAD of the cycle in force is there', what='row after')
    # ---- a new opening: the row remembers, no gesture
    c.page.reload()
    c.until("!!document.querySelector('[data-module=data] [data-data-head]')", timeout=20000, what='the screen again')
    c.settle()
    _all_open(c)
    c.until("!!document.querySelector('[data-set=route]')", timeout=8000, what='the row')
    c.eq(row()[:2], ['ok', cur.isoformat()], 'found again at the next opening', what='row after reload')
    # ---- nothing in Downloads: said, no question
    st['views'] = [_view('done', step='Terminé', jid='j3', result={'ok': True, 'dry': True, 'files': [], 'taken': [], 'failed': [], 'rad': [], 'fra': [], 'commit': None})]
    st['i'] = 0
    st['start'] = (200, {'job': 'j3'})
    c.js("document.querySelector('[data-set=route]').open = true")
    c.tap('[data-verb=route-import]')
    c.until('!!document.querySelector("[data-route-result][data-result=none]")', timeout=10000, what='the empty answer')
    c.eq(c.count('[data-route-ask]'), 0, 'nothing found: no question', what='no question')
    c.check_errors()


@case('L34', 'Données: the route row is grey without a launcher that knows route/import-rad (an old launcher), with its reason', 'L', tags=('data',),
      designs=('standard',), screens=False, night=False,
      rule='SOG-0125: the verb is read from regen/verbs like the others; an old launcher greys the button with « ne connaît pas encore cette opération »')
def l34(c):
    st = _launcher(c, [], verbs=['base/fetch', 'base/build', 'base/purge'])
    cfg, _ = _fixture()
    _open(c, cfg)
    _all_open(c)
    c.js("document.querySelector('[data-set=route]').open = true")
    c.eq([c.js("document.querySelector('[data-verb=route-import]').disabled"), c.attr('[data-set=route] [data-reason]', 'data-reason')], [True, 'unknown-verb'], 'grey, the launcher does not know the verb', what='grey')
    c.eq(len(st['posts']), 0, 'nothing is sent', what='posts')
    c.check_errors()


@case('L35', 'Données: the address #data?source=eurocontrol_rad (the link of Fuel\u2019s Route step) opens the procedures group and the route row, and brings it on screen', 'L', tags=('data',),
      designs=('standard',), screens=False, night=False,
      rule='SOG-0125: Fuel\u2019s Route step links to the RAD\u2019s line in Maintenance (?app=maintenance#data?source=eurocontrol_rad); without the query the group and the row stay as they were')
def l35(c):
    cfg, _ = _fixture()
    c.page.add_init_script(_stub(cfg))
    c.open('data?source=eurocontrol_rad', docs=LEVEL3, wait=False, app='maintenance')
    c.until("!!document.querySelector('[data-module=data] [data-set=route]')", timeout=20000, what='the route row')
    c.settle()
    c.eq(c.js("(() => { const r = document.querySelector('[data-set=route]'); const b = r.getBoundingClientRect(); return [r.open, r.closest('details.f-group').open, b.top >= 0 && b.top < innerHeight] })()"), [True, True, True],
         'the row is open, in an open group, on screen', what='link target')
    # without the query: the row stays folded, the group as it was
    c.open('data', docs=LEVEL3, wait=False, app='maintenance')
    c.until("!!document.querySelector('[data-module=data] [data-set=route]')", timeout=20000, what='the route row, no query')
    c.settle()
    c.eq(c.js("document.querySelector('[data-set=route]').open"), False, 'no query: the row stays folded', what='no query')
    c.check_errors()


_UT = lambda key, lang: _trow(key, lang, after='  upd: {')
_KB = {'ca': 1000, 'es': 9000, 'fr': 20000, 'gb': 10000, 'us': 21000}


def _sized(cfg):
    """The zones of the fixture with a published size (publishedKb of aerodb's zones())."""
    for z in cfg['zones']:
        if z['id'] in _KB:
            z['publishedKb'] = _KB[z['id']]
    return cfg


def _bytes(c, kb):
    """The size as the page writes it (model.fmtBytes), in the language of the run."""
    return c.js("async ([kb, lang]) => (await import('/modules/data/model.js')).fmtBytes(kb * 1024, lang)", [kb, c.lang])


_VERBS = ['base/fetch', 'base/build', 'base/purge', 'base/status']


def _zst(state, *reasons, buildable=True):
    """One zone of the launcher\u2019s base/status answer."""
    return {'state': state, 'reason': reasons[0] if reasons else None, 'reasons': list(reasons), 'buildable': buildable, 'builtCycle': '2026-10-29', 'expectedCycle': '2026-11-26', 'parserVersion': 23}


def _status(zones):
    """The result of base/status for `zones` ({ id: _zst(...) })."""
    counts = {}
    for z in zones.values():
        counts[z['state']] = counts.get(z['state'], 0) + 1
    return {'ok': True, 'current': '2026-10-29', 'parserVersion': 23, 'counts': counts, 'zones': zones}


_NEWER = {'code': 'source-newer', 'source': 'sia', 'cycle': '2026-11-26', 'built': '2026-10-29'}
_ALL_OK = lambda: _status({z: _zst('up-to-date') for z in ('ca', 'es', 'fr', 'gb', 'us')})
_FR_STALE = lambda: _status({'ca': _zst('up-to-date'), 'es': _zst('up-to-date'), 'fr': _zst('stale', _NEWER), 'gb': _zst('up-to-date'), 'us': _zst('up-to-date')})
_posts = lambda st, verb: [p for p in st['posts'] if p.get('verb') == verb]


@case('L36', 'Données: « Mettre à jour » downloads, reads the launcher\u2019s state (base/status), then rebuilds only the zones that are not up to date after ONE question that names them, why and the size; « Tout recalculer » is today\u2019s build; nothing to do: said, no question', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=False, night=False,
      rule='SOG-0071 (V3_SPECIFICATION § 10.44): three verbs on the selection — Mettre à jour (fetch, then base/status, then the build of the zones the LAUNCHER says are not up to date and buildable), Tout recalculer (the whole selection), Purger; the confirmation names the count, the reasons and the size')
def l36(c):
    lang = c.lang
    _t, cur, prev, _n = _cycles()
    fetched = _view('done', step='Terminé', result={'fetched': ['fr'], 'unchanged': ['ca', 'es', 'gb', 'us'], 'failed': [], 'manual': []})
    built = _view('done', step='Terminé', jid='j2', zones={'fr': _zs('built', 4, 4, commit='abc1234')}, result={'built': ['fr'], 'failed': [], 'commits': [{'zone': 'fr', 'commit': 'abc1234'}], 'cycle': cur.isoformat(), 'current': cur.isoformat(), 'stale': False, 'blocking': []})
    st = _launcher(c, [fetched], verbs=_VERBS)
    st['status'] = _FR_STALE()
    cfg, _ = _fixture()
    _open(c, _sized(cfg))
    _all_open(c)
    c.until("[...document.querySelectorAll('[data-state-sentence] [data-filter]')].reduce((a, b) => a + parseInt(b.textContent, 10), 0) === 5", timeout=8000, what='the state of the five zones, read at the opening')
    labels = c.js("[...document.querySelectorAll('[data-build] .d-verbs:not([data-select-row]) button')].map(b => [b.dataset.verb, b.textContent.trim()])")
    c.eq([[v for v, _l in labels if v != 'pickup'], dict(labels)['update'], dict(labels)['build']], [['update', 'download', 'build', 'purge'], norm(_UT('updateN', lang).replace('{n}', '1')), norm(_UT('recompute', lang))],
         'Mettre à jour (1: France) in the head block, then the verbs row: Télécharger, Tout recalculer (today\u2019s build), Purger', what='verbs')
    n0 = len(st['posts'])
    # ---- Mettre à jour: the fetch, the state, then ONE question that names France (the launcher says: source newer), the reason, the size
    c.tap('[data-build] [data-verb=update]')
    q = _ask_text(c)
    c.eq([p['verb'] for p in st['posts'][n0:]], ['status', 'fetch', 'status'], 'the state is read first (SOG-0180), then the download, then the state again', what='order')
    c.eq(sorted(_posts(st, 'fetch')[0]['args']['zones']), ['fr'], 'the download is that of the zones that are not up to date (SOG-0180): the four up to date are not downloaded again', what='fetch body')
    fr = {'fr': 'France', 'en': 'France', 'de': 'Frankreich', 'es': 'Francia'}[lang]
    c.ok(fr in q['text'] and _bytes(c, _KB['fr']) in q['text'] and norm(_trow('source-newer', lang, after='  zr: {').split('{source}')[0]) in norm(q['text']) and 'Espagne' not in q['text'] and 'Spain' not in q['text'],
         q['text'], 'the question names France, the launcher\u2019s reason and the size of France alone; not the zones that are up to date')
    c.eq(norm(q['ok']), norm(_UT('update', lang)), 'one-word confirmation', what='ok')
    st['views'] = [built]
    st['i'] = 0
    st['start'] = (200, {'job': 'j2'})
    st['status'] = _ALL_OK()   # what the launcher will say once France is built
    c.tap('.f-modal [data-ok]')
    c.until('document.querySelector("[data-build-result]")', timeout=12000, what='the build ends')
    c.eq({k: _posts(st, 'build')[0][k] for k in ('set', 'verb', 'args')}, {'set': 'base', 'verb': 'build', 'args': {'zones': ['fr'], 'personal': []}}, 'only the zone the launcher called stale is built', what='build body')
    for _ in range(40):   # the state is read again at the end of the build: no reload
        if c.js(_SENTENCE_JS) == [['upToDate', 5]]:
            break
        c.wait(200)
    c.eq(c.js(_SENTENCE_JS), [['upToDate', 5]], 'after the build the state is read again from the launcher: every zone is up to date (the numbers of the state sentence)', what='state after')
    # ---- nothing to do: the download, a sentence, no question, no build.  The screen says « Tout est à jour. » (no button) once every zone is up to date, so the page is
    # opened again on a state where France is stale; the launcher then says « up to date » at its second reading (the download made it so)
    st['status'] = _FR_STALE()
    c.page.reload()
    c.until("!!document.querySelector('[data-module=data] [data-data-head]')", timeout=20000, what='the screen again')
    c.settle()
    c.until("[...document.querySelectorAll('[data-state-sentence] [data-filter]')].reduce((a, b) => a + parseInt(b.textContent, 10), 0) === 5 && !!document.querySelector('[data-build] [data-verb=update]')", timeout=8000, what='the state of the five zones and the button')
    seq = {'n': 0}

    def after_download(args):
        seq['n'] += 1
        return _FR_STALE() if seq['n'] == 1 else _ALL_OK()
    st['status'] = after_download
    st['views'] = [fetched]
    st['i'] = 0
    st['start'] = (200, {'job': 'j3'})
    nb = len(_posts(st, 'build'))
    c.tap('[data-build] [data-verb=update]')
    said = norm(_UT('none', lang).split('{n}')[0])
    for _ in range(48):
        if _notes_with(c, said):
            break
        c.wait(250)
    c.ok(bool(_notes_with(c, said)), None, 'the sentence: nothing to rebuild')
    c.eq([len(_posts(st, 'build')) - nb, c.count('.f-modal')], [0, 0], 'no question, no build', what='nothing to do')
    # ---- Tout recalculer: today\u2019s build on the whole selection, as it was
    st['views'] = [built]
    st['i'] = 0
    st['start'] = (200, {'job': 'j4'})
    c.tap('[data-build] [data-verb=build]')
    c.until('document.querySelector("[data-build-result]")', timeout=12000, what='the build ends')
    c.eq(sorted(_posts(st, 'build')[-1]['args']['zones']), ['ca', 'es', 'fr', 'gb', 'us'], 'Tout recalculer builds the whole selection', what='recompute body')
    c.check_errors()


_ticked = lambda c: c.js("[...document.querySelectorAll('[data-build-zone]')].filter(i => i.checked).map(i => i.dataset.buildZone)")


@case('L40', 'Données: the state of each zone is drawn from the launcher\u2019s answer (green, orange with its reason on touch, grey, red; blue while the page builds it), on the list and on the map; the orange country turns green on the answer after a build', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=False, night=False,
      rule='SOG-0071 time 2 / SOG-0072: base/status per zone — up-to-date, stale(reason), never-built, failed — with the reason codes translated in four languages; after a build the state is read again and the orange zone turns green without a reload')
def l40(c):
    lang = c.lang
    built = _view('done', step='Terminé', jid='j2', zones={'fr': _zs('built', 4, 4, commit='abc1234')}, result={'built': ['fr'], 'failed': [], 'commits': [{'zone': 'fr', 'commit': 'abc1234'}], 'cycle': '2026-10-29', 'current': '2026-10-29', 'stale': False, 'blocking': []})
    st = _launcher(c, [built], verbs=_VERBS)
    parser_old = {'code': 'parser-old', 'built': 22, 'current': 23}
    st['status'] = _status({'ca': _zst('up-to-date'), 'es': _zst('never-built', {'code': 'never-built'}), 'fr': _zst('stale', _NEWER, parser_old), 'gb': _zst('failed', {'code': 'failed', 'error': 'invalid-output'}),
                            'us': _zst('stale', {'code': 'inputs-changed', 'count': 2, 'names': ['a.json', 'b.json']})})
    cfg, _ = _fixture()
    cfg['outlines'] = _outlines()
    _open(c, _sized(cfg))
    _all_open(c)
    c.until("document.querySelectorAll('[data-wmap] path[data-zone]').length === 4", timeout=15000, what='the world map')
    c.until("[...document.querySelectorAll('[data-state-sentence] [data-filter]')].reduce((a, b) => a + parseInt(b.textContent, 10), 0) === 5", timeout=8000, what='the five pills')
    c.eq(_pills(c), {'ca': 'up-to-date', 'es': 'never-built', 'fr': 'stale', 'gb': 'failed', 'us': 'stale'}, 'every zone says the state the launcher gave (read from the lists the numbers of the sentence unfold)', what='pills')
    zs = lambda z: _trow(z, lang, after='  zst: {')
    c.tap('[data-state-sentence] [data-filter=upToDate]')
    c.until("!!document.querySelector('[data-state-zones] [data-zone-row=ca] [data-zstate]')", what='the zones up to date')
    c.eq(norm(c.text('[data-zone-row=ca] [data-zstate]')), norm(zs('up-to-date')), 'worded in the language of the run', what='pill text')
    c.tap('[data-state-sentence] [data-filter=rebuild]')
    c.until("!!document.querySelector('[data-state-zones] [data-zone-row=fr] [data-act=zone-why]')", what='the zones to rebuild')
    # the reason on touch: nothing is said until the pill is touched; the codes are translated, the parameters filled
    c.eq(c.count('[data-zone-why]'), 0, 'the reasons stay folded', what='folded')
    c.tap('[data-zone-row=fr] [data-act=zone-why]')
    c.until("!!document.querySelector('[data-zone-why=fr]')", timeout=4000, what='the reasons of France')
    why = norm(c.text('[data-zone-why=fr]'))
    c.ok(norm(_trow('source-newer', lang, after='  zr: {').split('{source}')[0]) in why and ('v22' in why and 'v23' in why), why, 'the two reasons of France, in words, with their parameters (source newer; parser v22, current v23)')
    c.tap('[data-zone-row=us] [data-act=zone-why]')
    c.until("!!document.querySelector('[data-zone-why=us]')", timeout=4000, what='the reasons of the US')
    c.ok('2' in c.text('[data-zone-why=us]'), c.text('[data-zone-why=us]'), 'inputs-changed says its count')
    c.tap('[data-zone-row=fr] [data-act=zone-why]')
    c.until("!document.querySelector('[data-zone-why=fr]')", timeout=4000, what='a second touch folds the reasons')
    # the map: the same states as tones (green, orange, grey, red)
    tone = lambda z: c.js(f"(document.querySelector('[data-wmap] path[data-zone={z}]') || {{ dataset: {{}} }}).dataset.tone")
    c.eq({z: tone(z) for z in ('fr', 'gb', 'es', 'us')}, {'fr': 'warn', 'gb': 'err', 'es': 'warn', 'us': 'warn'}, 'the map draws the same states in three tones (SOG-0260): a zone to do or never built is amber, a failed one red', what='tones')
    # ---- a build: blue while the page builds it, and the orange country turns green on the launcher\u2019s answer (SOG-0072)
    _untick(c, 'ca', 'es', 'gb', 'us')      # the coverage is France alone: « Tout recalculer » builds it (the list of the zones to rebuild is still unfolded)
    c.until("!!document.querySelector('[data-state-zones] [data-zone-row=fr]')", what='France is listed to rebuild')
    st['status'] = _status({'ca': _zst('up-to-date'), 'es': _zst('never-built', {'code': 'never-built'}), 'fr': _zst('up-to-date'), 'gb': _zst('failed', {'code': 'failed', 'error': 'invalid-output'}),
                            'us': _zst('stale', {'code': 'inputs-changed', 'count': 2, 'names': ['a.json', 'b.json']})})
    st['views'] = [_view(step='Zone fr', done=0, total=1, zones={'fr': _zs('building', 1, 4)})] * 3 + [built]
    st['i'] = 0
    c.tap('[data-build] [data-verb=build]')
    for _ in range(30):
        if c.js("document.querySelector('[data-zone-row=fr] [data-zstate]')?.dataset.zstate") == 'building':
            break
        c.wait(150)
    c.eq(c.js("document.querySelector('[data-zone-row=fr] [data-zstate]')?.dataset.zstate"), 'building', 'while the page builds the zone its pill is « en cours »', what='building')
    c.until('document.querySelector("[data-build-result]")', timeout=12000, what='the build ends')
    c.until("document.querySelector('[data-wmap] path[data-zone=fr]').dataset.tone === 'ok'", timeout=8000, what='the orange country is green on the map on the launcher\u2019s answer')
    c.eq(_pills(c), {'fr': 'up-to-date'}, 'and its pill says up to date', what='pill after')
    c.check_errors()


@case('L41', 'Données: « Mettre à jour » on a base built with an older parser: the question says « n zones, parser changed » once (not n lines), warns that it is long, and says the zones waiting for a file of Downloads; those are not built', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=False, night=False,
      rule='SOG-0071 time 2: on the user\u2019s workstation the first update rebuilds every zone (parser 22 → 23), the confirmation says so; a zone that waits for a file (pickup-waiting, not buildable) is said and left out')
def l41(c):
    lang = c.lang
    fetched = _view('done', step='Terminé', result={'fetched': [], 'unchanged': ['ca', 'es', 'fr', 'gb', 'us'], 'failed': [], 'manual': []})
    st = _launcher(c, [fetched], verbs=_VERBS)
    old = {'code': 'parser-old', 'built': 22, 'current': 23}
    many = ['aa', 'ab', 'ac', 'ad', 'ae', 'af', 'ag', 'ah', 'ai', 'aj', 'ak']
    zones = {z: _zst('stale', old) for z in ['ca', 'es', 'fr', 'us'] + many}
    zones['gb'] = _zst('stale', {'code': 'pickup-waiting', 'source': 'nats', 'set': 'AIP', 'cycle': '2026-11-26', 'zip': 'x.zip'}, buildable=False)
    st['status'] = _status(zones)
    cfg, _ = _fixture()
    for z in many:
        cfg['zones'].append({'id': z, 'names': [z.upper()] * 4, 'frames': [], 'published': True})
        cfg['publication']['base'][z] = cfg['publication']['base']['ca']
    _open(c, _sized(cfg))
    _all_open(c)
    c.until("[...document.querySelectorAll('[data-state-sentence] [data-filter]')].reduce((a, b) => a + parseInt(b.textContent, 10), 0) === 16", timeout=10000, what='the state of the sixteen zones')
    n0 = len(st['posts'])
    c.tap('[data-build] [data-verb=update]')
    q = _ask_text(c)
    nine = norm(_UT('whyMany', lang).replace('{n}', _zones_text(lang, 15)).split('{r}')[0])
    c.ok(nine in norm(q['text']) and norm(_trow('parser-old', lang, after='  zr: {').split('{built}')[0]) in norm(q['text']), q['text'], 'ONE line for the fifteen zones: « 15 zones : built with an older parser (v22, current v23) »')
    c.ok(q['text'].count('v22') == 1, q['text'], 'said once, not fifteen times')
    c.ok(norm(_UT('long', lang)) in norm(q['text']), q['text'], 'it says it may take a while')
    c.ok(norm(_UT('waiting', lang).split('{n}')[1].split('{z}')[0]) in norm(q['text']), q['text'], 'the sentence « n cannot be built yet: zone: reason » names the zone that waits')
    st['views'] = [_view('done', step='Terminé', jid='j2', result={'built': [], 'failed': [], 'commits': [], 'cycle': '2026-10-29', 'current': '2026-10-29', 'stale': False, 'blocking': []})]
    st['i'] = 0
    st['start'] = (200, {'job': 'j2'})
    c.tap('.f-modal [data-ok]')
    c.until('document.querySelector("[data-build-result]")', timeout=12000, what='the build ends')
    zs = _posts(st, 'build')[0]['args']['zones']
    c.eq([len(zs), 'gb' in zs], [15, False], 'the fifteen buildable zones are built; the zone that waits for its file is not', what='build body')
    c.check_errors()


@case('L42', 'Données: when the launcher’s state cannot be read (a refused or failed base/status), « Mettre à jour » says so and builds nothing; no pill is invented', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=False, night=False,
      rule='SOG-0071 time 2: never a build in the dark — without the launcher’s state the update stops after the download and says it; an old launcher without base/status keeps « Mettre à jour » grey with its reason')
def l42(c):
    lang = c.lang
    fetched = _view('done', step='Terminé', result={'fetched': [], 'unchanged': ['ca', 'es', 'fr', 'gb', 'us'], 'failed': [], 'manual': []})
    st = _launcher(c, [fetched], verbs=_VERBS)
    st['status'] = {'ok': False, 'reason': 'failed', 'message': 'no'}
    cfg, _ = _fixture()
    _open(c, _sized(cfg))
    _all_open(c)
    c.wait(600)
    c.eq(c.count('[data-zstate]'), 0, 'an unreadable state draws no pill', what='no pill')
    c.tap('[data-build] [data-verb=update]')
    said = norm(_UT('noStatus', lang))
    for _ in range(48):
        if _notes_with(c, said):
            break
        c.wait(250)
    c.ok(bool(_notes_with(c, said)), None, 'the update says the state could not be read')
    c.eq([len(_posts(st, 'build')), c.count('.f-modal')], [0, 0], 'no build, no question: never a build in the dark', what='nothing built')
    c.check_errors()


@case('L43', 'Données: a launcher that does not know base/status keeps « Mettre à jour » without an answer: grey with its reason, nothing sent, no pill', 'L', tags=('data',),
      designs=('standard',), screens=False, night=False,
      rule='SOG-0071 time 2: the verb is read from regen/verbs like the others; an old launcher greys « Mettre à jour » (« ne connaît pas encore cette opération »); « Tout recalculer » (base/build) stays live')
def l43(c):
    st = _launcher(c, [], verbs=['base/fetch', 'base/build', 'base/purge'])
    cfg, _ = _fixture()
    _open(c, _sized(cfg))
    _all_open(c)
    c.wait(500)
    c.eq([c.js("document.querySelector('[data-build] [data-verb=update]').disabled"), c.js("document.querySelector('[data-build] [data-verb=build]').disabled"), c.count('[data-zstate]')], [True, False, 0],
         'Mettre à jour is grey, Tout recalculer is live, no pill is drawn', what='old launcher')
    c.eq([c.count('[data-verb=select-stale]'), c.count('[data-state-sentence] [data-filter]')], [0, 0], 'no selection gesture any more (SOG-0262), and the sentence has no number to unfold without a state', what='no select-stale')
    c.wait(400)
    c.eq(len(st['posts']), 0, 'nothing is sent', what='posts')
    c.check_errors()


_PACK_ZONES = [('it', ['Italie', 'Italy', 'Italien', 'Italia'], 4000), ('jp', ['Japon', 'Japan', 'Japan', 'Japón'], 6000)]


def _packs_cfg():
    """The fixture with two more zones the suite knows and nobody publishes (it, jp), sizes, and packs as aerodb would give them."""
    cfg, _ = _fixture()
    _sized(cfg)
    for z, names, kb in _PACK_ZONES:
        cfg['zones'].append({'id': z, 'names': names, 'frames': [], 'published': False, 'publishedKb': kb})
    for z in cfg['zones']:
        if z['id'] == 'de':
            z['publishedKb'] = 8000
    # the shape aerodb delivers (AeroDb.packs(), INTEGRATION « Country packs »): { regions: [...], themes: [...] }, the kind being the list
    cfg['packs'] = {'generated': '2026-11-10', 'source': 'test', 'regions': [
        {'id': 'ouest', 'names': ['Europe de l’Ouest', 'Western Europe', 'Westeuropa', 'Europa occidental'], 'zones': ['fr', 'gb', 'de', 'it', 'zz'], 'partial': ['gb']},
        {'id': 'asie', 'names': ['Asie', 'Asia', 'Asien', 'Asia'], 'zones': ['jp', 'de']},
        {'id': 'antarctique', 'names': ['Antarctique', 'Antarctica', 'Antarktis', 'Antártida'], 'zones': [], 'empty': 'no-zone-no-source'},
        {'id': 'bad id', 'names': ['x'], 'zones': ['fr']}],
        'themes': [{'id': 'iles', 'names': ['Îles', 'Islands', 'Inseln', 'Islas'], 'zones': ['gb', 'jp', 'es']}]}
    return cfg


@case('L44', 'Données: country packs (aerodb packs()): a row per region with its size and what is already covered, « Ajouter tout » without a duplicate, themes as a filter that adds nothing by itself, an empty pack with its reason', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=True, night=False,
      rule='SOG-0065 (V3_SPECIFICATION § 10.42): a pack is a list of zone ids; the region row says its size (sum of publishedKb), « Ajouter tout » adds the zones of the coverage it lacks (ticked, written once, never a duplicate, nothing built); a theme is a filter that shows zones and adds none by itself; the unknown zones are ignored and said; hostile packs are dropped')
def l44(c):
    lang = c.lang
    PT = lambda key: _trow(key, lang, after='  packs: {')
    cfg = _packs_cfg()
    _open(c, cfg)
    _all_open(c)
    c.until("!!document.querySelector('[data-packs]')", timeout=8000, what='the packs block')
    c.js("document.querySelector('[data-packs-fold]').open = true")   # « Paquets de pays » is folded when the screen opens (SOG-0228)
    c.eq(c.js("[...document.querySelectorAll('[data-pack-regions] > li')].map(li => li.dataset.pack)"), ['ouest', 'asie', 'antarctique'], 'the region packs in aerodb\u2019s order; a pack with a bad id is dropped', what='regions')
    c.eq(c.js("[...document.querySelectorAll('[data-pack-themes] > li')].map(li => li.dataset.pack)"), ['iles'], 'the theme', what='themes')
    row = lambda p: norm(c.text(f'[data-pack={p}]'))
    ouest_size = _bytes(c, _KB['fr'] + _KB['gb'] + 8000 + 4000)
    c.ok(ouest_size in row('ouest') and 'zz' not in row('ouest'), row('ouest'), 'Western Europe: the size is the sum of the known zones (fr, gb, de, it), the zone the suite does not know is not counted')
    c.eq(c.count('[data-pack=ouest] [data-pack-unknown]') + c.count('[data-pack=ouest] [data-pack-partial]'), 2, 'and it says one zone is unknown, one is « en partie »', what='notes')
    c.eq([c.js("document.querySelector('[data-pack-switch=ouest]').checked"), c.js("document.querySelector('[data-pack-switch=ouest]').indeterminate")], [False, True], 'the switch of Western Europe is half on: fr and gb are in the coverage, de and it are not yet', what='switch half')
    c.eq(c.count('[data-pack=antarctique] button'), 0, 'an empty pack has no button', what='empty button')
    c.eq(norm(c.text('[data-pack=antarctique] [data-pack-empty]')), norm(_trow('no-zone-no-source', lang, after='emptyWhy: {')), 'and says why', what='empty reason')
    # ---- SOG-0165: regions and themes in ONE block with two tabs; a theme is a grid of ticks (box, name, state) like the zones list, no button in a row
    c.eq(c.js("[...document.querySelectorAll('[data-pack-tabs] button')].map(b => [b.dataset.packTab, b.getAttribute('aria-pressed')])"), [['regions', 'true'], ['themes', 'false']], 'one block, two tabs: Régions first', what='tabs')
    c.eq(c.js("[...document.querySelectorAll('[data-pack-tabs] button')].map(b => b.textContent.replace(/\s+/g, ' ').trim())"), [norm(PT('regions')) + ' (3)', norm(PT('themes')) + ' (1)'], 'named in the language of the run, with their counts', what='tab names')
    c.eq(c.js("document.querySelector('[data-pack-themes-box]').hidden"), True, 'the themes are behind their tab', what='hidden themes')
    c.tap('[data-pack-tab=themes]')
    c.eq([c.js("document.querySelector('[data-pack-regions]').hidden"), c.js("document.querySelector('[data-pack-themes-box]').hidden")], [True, False], 'the Thèmes tab shows the themes and hides the regions', what='tab switch')
    c.tap('[data-pack-theme=iles] > summary')   # a real touch on the title unfolds it
    c.wait(400)
    cov0 = c.doc('cache/data/coverage.json')
    c.eq(c.js("[...document.querySelectorAll('[data-pack=iles] [data-pack-cov]')].map(i => [i.dataset.packCov, i.checked])"), [['gb', True], ['jp', False], ['es', True]], 'a tick per country: in the coverage or not (gb and es are, jp is not)', what='ticks')
    c.eq(c.count('[data-pack=iles] button:not([data-act=update-pack])'), 0, 'no button in a row of a theme but « Mettre à jour (n) » (SOG-0188)', what='no button')
    # the unfolded theme shows its switch and its countries in full, and the zones list follows it without overlap; a list row is 32 px with a fine pointer (mouse), 44 px with a finger (SOG-0168)
    g = c.js("""() => { const r = e => e.getBoundingClientRect(), rows = [...document.querySelectorAll('[data-pack=iles] .d-zrow')], last = r(rows[rows.length - 1]),
      box = r(document.querySelector('[data-packs]')), clipped = rows.filter(x => { for (let p = x.parentElement; p && p !== document.body; p = p.parentElement) { const cs = getComputedStyle(p); if (/(auto|scroll|hidden)/.test(cs.overflowY) && r(x).bottom > r(p).bottom + 1) return true } return false }).length;
      return { n: rows.length, clipped, inside: last.bottom <= box.bottom + 1, hs: rows.map(x => Math.round(r(x).height)) } }""")
    c.ok(g['n'] == 4 and g['clipped'] == 0 and g['inside'], g, 'the unfolded theme shows its switch and its three countries in full')
    want = 44 if c.phone else 32
    c.ok(all(h <= want + 1 and h >= want - 1 for h in g['hs']), g, f'every list row is {want} px ({"a finger" if c.phone else "a fine pointer"}): the theme rows')
    if c.width in (390, 1280):
        c.shot(f'L44_themes_{c.width}_{lang}.png')
    c.tap('[data-pack=iles] [data-pack-cov=jp]')
    doc = c.until_doc('cache/data/coverage.json', lambda d: bool(d and 'jp' in (d.get('zones') or [])), what='jp added to the coverage')
    c.eq(sorted(set(doc['zones']) - set((cov0 or {}).get('zones') or ['ca', 'es', 'fr', 'gb', 'us'])), ['jp'], 'ticking a country adds that one zone', what='one zone')
    c.eq(c.count('[data-pack-theme=iles][open]'), 1, 'the fold stays open after the redraw', what='open')
    c.tap('[data-pack=iles] [data-pack-cov=jp]')
    q = _ask_text(c)
    c.eq(norm(q['ok']), norm(PT('remove')), 'unticking asks first (the zone leaves the coverage, nothing is purged)', what='ask')
    c.page.click('.f-modal [data-ok]')
    doc = c.until_doc('cache/data/coverage.json', lambda d: bool(d) and 'jp' not in (d.get('zones') or []), what='jp removed from the coverage')
    c.eq(c.js("document.querySelector('[data-pack=iles] [data-pack-cov=jp]').checked"), False, 'and the box is unticked', what='unticked')
    c.tap('[data-pack=iles] [data-pack-cov=jp]')
    doc = c.until_doc('cache/data/coverage.json', lambda d: bool(d and 'jp' in (d.get('zones') or [])), what='jp added again')
    c.tap('[data-pack-tab=regions]')
    # ---- Ajouter tout: de and it enter (ticked, one write), the button turns into « all in the coverage », nothing is built
    c.js("document.querySelector('[data-packs]').scrollIntoView({ block: 'start' })")
    if c.width in (390, 1280):
        c.shot(f'L44_packs_{c.width}_{lang}.png')
    c.tap('[data-pack-switch=ouest]')
    doc = c.until_doc('cache/data/coverage.json', lambda d: bool(d and 'it' in (d.get('zones') or []) and 'de' in (d.get('zones') or [])), what='de and it added')
    c.eq([len(doc['zones']), len(set(doc['zones']))], [8, 8], 'eight distinct zones: nothing was duplicated', what='no duplicate')
    c.eq([c.js("document.querySelector('[data-pack-switch=ouest]').checked"), c.js("document.querySelector('[data-pack-switch=ouest]').indeterminate")], [True, False], 'the whole pack is in the coverage: the switch is on', what='all in')
    c.eq(c.js("document.querySelector('[data-pack-switch=asie]').checked"), True, 'Asia (jp, de) is complete too: on', what='asie')
    c.eq(c.js("window.__stub.calls.zones ? 1 : 0"), 1, 'the screen read zones()', what='sanity')
    c.check_errors()


@case('L45', 'Données: without aerodb packs() (or with an unreadable answer) the packs block is not drawn', 'L', tags=('data',),
      designs=('standard',), screens=False, night=False,
      rule='SOG-0065: the packs are invisible until aerodb gives them — no block, no empty title; a hostile answer is read as no pack')
def l45(c):
    cfg, _ = _fixture()
    cfg['packs'] = {'packs': 'nope'}
    _open(c, _sized(cfg))
    _all_open(c)
    c.wait(500)
    c.eq(c.count('[data-packs]'), 0, 'an unreadable answer: no block', what='unreadable')
    c.check_errors()


@case('L46', 'Données: the shape agreed first for packs() ({ packs: [{ kind, … }] }) is still read, next to the one aerodb delivers ({ regions, themes })', 'L', tags=('data',),
      designs=('standard',), screens=False, night=False,
      rule='SOG-0065: the page reads both shapes — the contract proposed by Réglages and the one AeroDb.packs() gives; the kind of a pack comes from its list or its own field')
def l46(c):
    cfg, _ = _fixture()
    cfg['packs'] = {'packs': [{'id': 'x', 'kind': 'region', 'names': ['Test', 'Test', 'Test', 'Test'], 'zones': ['fr']}, {'id': 'y', 'kind': 'theme', 'names': ['Thème', 'Theme', 'Thema', 'Tema'], 'zones': ['gb']}, {'id': 'z', 'kind': 'planet', 'names': ['?'], 'zones': ['fr']}]}
    _open(c, _sized(cfg))
    _all_open(c)
    c.until("!!document.querySelector('[data-pack=x]')", timeout=12000, what='the agreed shape is drawn')
    c.eq([c.js("[...document.querySelectorAll('[data-pack-regions] > li')].map(l => l.dataset.pack)"), c.js("[...document.querySelectorAll('[data-pack-themes] > li')].map(l => l.dataset.pack)")], [['x'], ['y']], 'the region and the theme; the pack of an unknown kind is dropped', what='both')
    c.check_errors()


@case('L47', 'Données: the DFS row (Germany) says its licence and its credit — CC BY 4.0, DFS — like the other licences', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=False, night=False,
      rule='AeroDB 450c52b1f (source DFS « ED Routes », parser 23): the credit « DFS, CC BY 4.0 » is in the licence line of the catalogue; the row of the zone that DFS feeds shows it in its detail, as every row shows its licence')
def l47(c):
    cfg, _ = _fixture()
    for z in cfg['zones']:
        if z['id'] == 'de':
            z['published'] = True
    cfg['publication']['base']['de'] = cfg['publication']['base']['ca']
    _open(c, cfg)
    _all_open(c)
    c.until("!!document.querySelector('[data-set=dfs]') || !!document.querySelector('[data-more] [data-set=dfs]')", timeout=8000, what='the DFS row')
    lic = c.js("(() => { const r = document.querySelector('[data-set=dfs]'); const dt = [...r.querySelectorAll('dt')].find(d => d.nextElementSibling && /DFS/.test(d.nextElementSibling.textContent)); return r.textContent.replace(/\s+/g, ' ') })()")
    c.ok('DFS' in lic and 'CC BY 4.0' in lic, lic[:300], 'the row of the DFS source carries its licence and its credit: CC BY 4.0, DFS')
    c.check_errors()


@case('L49', 'Données: a selection of more than 60 zones is built in runs of 60 at most, one after the other (the launcher takes 1 to 60); the progress says the part; a refusal says the launcher\u2019s reason, never « invalid arguments » alone', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=False, night=False,
      rule='SOG-0144: base/build, base/fetch and base/purge accept 1 to 60 zones; the user selected 78 and « Tout recalculer » was refused (arguments invalides). The verbs cut the selection into runs of 60, in order, the next one starting when the previous one ends; a 400 of the launcher is relayed with its message')
def l49(c):
    lang = c.lang
    ok = _view('done', step='Terminé', result={'built': ['ca'], 'failed': [], 'commits': [], 'cycle': '2026-10-29', 'current': '2026-10-29', 'stale': False, 'blocking': []})
    st = _launcher(c, [ok], verbs=_VERBS)
    cfg, _ = _fixture()
    extra = [f'q{i:02d}' for i in range(73)]
    for z in extra:
        cfg['zones'].append({'id': z, 'names': [z.upper()] * 4, 'frames': [], 'published': True})
        cfg['publication']['base'][z] = cfg['publication']['base']['ca']
    _open(c, cfg)
    _all_open(c)
    c.eq(_cov_count(c), 78, 'the user\u2019s case: seventy-eight zones ticked', what='78 ticked')
    c.tap('[data-build] [data-verb=build]')
    for _ in range(60):
        if len(_posts(st, 'build')) >= 2:
            break
        c.wait(250)
    posts = _posts(st, 'build')
    c.eq([len(p['args']['zones']) for p in posts], [60, 18], 'two runs, 60 then 18, in the order of the list; the second starts after the first', what='runs')
    c.eq(sorted(posts[0]['args']['zones'] + posts[1]['args']['zones']), sorted(['ca', 'es', 'fr', 'gb', 'us'] + extra), 'together they are the whole selection, none twice', what='whole selection')
    c.until('document.querySelector("[data-build-result]")', timeout=15000, what='the end')
    # ---- a 400 of the launcher: its reason is relayed
    _untick(c, *[z for z in ['ca', 'es', 'gb', 'us'] + extra])      # the coverage is France alone
    st['start'] = (400, {'message': 'zones: 1 to 60, no duplicate'})
    c.tap('[data-build] [data-verb=build]')
    c.until('document.querySelector("[data-build-result][data-refusal=bad-args]")', timeout=10000, what='the refusal')
    said = norm(c.text('[data-build-result][data-refusal=bad-args]'))
    c.ok('zones: 1 to 60' in said and norm(_trow('refusedWhy', lang).split('{m}')[0]) in said, said, 'the refusal gives the launcher\u2019s own reason after the usual sentence')

@case('L48', 'Données: the new reasons of base/status (index-orphan, source-unbuilt, source-unread, source-missing) are written in four languages, the notice « no-points » does not make a zone stale; #data?zone=<id> opens the sheet of that zone', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=False, night=False,
      rule='SOG-0143 (AeroDB c849f397c): four more reasons with their sentences, a notice per zone that is not a reason (no-points: the zone is up to date and says why a point is unknown); the link #data?zone=<id> opens the base, ticks only that zone and brings « Mettre à jour » on screen (a zone outside the coverage is said)')
def l48(c):
    lang = c.lang
    ZR = lambda key: _trow(key, lang, after='  zr: {')
    st = _launcher(c, [], verbs=_VERBS)
    st['status'] = _status({
        'fr': _zst('stale', {'code': 'source-unbuilt', 'source': 'sia'}),
        'es': _zst('stale', {'code': 'source-unread', 'source': 'enaire', 'why': 'personal'}, buildable=False),
        'gb': _zst('stale', {'code': 'source-missing', 'source': 'nats'}, buildable=False),
        'ca': _zst('stale', {'code': 'index-orphan', 'cycle': '2026-10-29', 'count': 3}),
        'us': {**_zst('up-to-date'), 'notices': [{'code': 'no-points', 'source': 'openaip'}]}})
    cfg, _ = _fixture()
    _open(c, _sized(cfg))
    _all_open(c)
    c.until("[...document.querySelectorAll('[data-state-sentence] [data-filter]')].reduce((a, b) => a + parseInt(b.textContent, 10), 0) === 5", timeout=8000, what='the five pills')
    whys = {}
    for z, key in (('fr', 'rebuild'), ('ca', 'rebuild'), ('es', 'personal'), ('gb', 'waiting')):   # the zones are read from the lists the numbers of the sentence unfold (SOG-0262)
        f = f'[data-state-sentence] [data-filter={key}]'
        if c.js(f"document.querySelector('{f}').getAttribute('aria-expanded')") != 'true':
            c.tap(f)
        c.until(f"!!document.querySelector('[data-state-zones] [data-zone-row={z}] [data-act=zone-why]')", what=f'the line of {z}')
        c.tap(f'[data-state-zones] [data-zone-row={z}] [data-act=zone-why]')
        c.until(f"!!document.querySelector('[data-zone-why={z}]')", timeout=4000, what=f'the reason of {z}')
        whys[z] = norm(c.text(f'[data-zone-why={z}]'))
    why = lambda z: whys[z]
    c.ok(norm(ZR('source-unbuilt').split('{source}')[0]) in why('fr') and norm(ZR('source-unbuilt').split('{source}')[1]) in why('fr'), why('fr'), 'source-unbuilt: « built without points or airways, the SIA file is there »')
    c.ok(norm(ZR('source-unread').split('{source}')[1]) in why('es'), why('es'), 'source-unread: the file is there but the « personal » box does not declare it: rebuild with the box ticked')
    c.ok(norm(ZR('source-missing').split('{source}')[1]) in why('gb'), why('gb'), 'source-missing: the file is missing')
    c.ok('3' in why('ca') and norm(ZR('index-orphan').split('{cycle}')[0]) in why('ca'), why('ca'), 'index-orphan: the cycle and the number of absent files')
    c.tap('[data-state-sentence] [data-filter=upToDate]')
    c.until("!!document.querySelector('[data-state-zones] [data-zone-row=us] [data-zstate]')", what='the zones up to date')
    c.eq(c.js("document.querySelector('[data-zone-row=us] [data-zstate]').dataset.zstate"), 'up-to-date', 'a zone with a notice is up to date: the notice is not a reason', what='notice zone')
    c.eq(norm(c.text('[data-zone-notice=us]')), norm(ZR('no-points')), 'the notice says why a point may be unknown (openAIP carries none)', what='notice')
    # ---- the link #data?zone=fr (SOG-0262): the sheet of that zone opens, on screen, and a sentence says so
    c.open('data?zone=fr', docs=LEVEL3, wait=False, app='maintenance')
    c.until("!!document.querySelector('[data-module=data] [data-sheet=fr]')", timeout=20000, what='the sheet of France')
    c.settle()
    c.eq([c.count('[data-sheet]'), c.js("(() => { const b = document.querySelector('[data-sheet]').getBoundingClientRect(); return b.top < innerHeight && b.bottom > 0 })()")], [1, True], 'the sheet of that zone alone is open and on screen', what='sheet')
    said = norm(_UT('zoneLink', lang).split('{z}')[1])
    for _ in range(30):
        if _notes_with(c, said):
            break
        c.wait(200)
    c.ok(bool(_notes_with(c, said)), None, 'a sentence says the sheet of the zone is open')
    c.open('data?zone=zz', docs=LEVEL3, wait=False, app='maintenance')
    c.until("!!document.querySelector('[data-module=data] [data-state-head]')", timeout=20000, what='the base panel again')
    c.settle()
    c.eq([c.count('[data-sheet]'), len(_notes_with(c, norm(_UT('zoneLinkOut', lang).split('{z}')[1])))], [0, 1], 'an unknown zone changes nothing: no sheet, and a sentence says it is not in the coverage', what='unknown')
    c.check_errors()


@case('L50', 'Données: the « Synoptique monde (GFS) » row reads weather/world { action: status } (state, run, weight), « Construire » builds it, the publication is said local to the workstation', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=False, night=False,
      rule='SOG-0138 (AeroDB weather/world): a row in the Météo group — absent until a publication exists, then the run, the steps, the weight and the age; « Construire » = action build (128 s the first time, 13 s when the run is already there); the publication is in data/weather/world/, never synchronised; a failure says its reason')
def l50(c):
    lang = c.lang
    WT = lambda key: _trow(key, lang, after='  world: {')
    now = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0)
    run = now.replace(hour=6, minute=0, second=0).isoformat().replace('+00:00', 'Z')
    absent = _view('done', step='Terminé', result={'ok': True, 'exists': False})
    built = _view('done', step='Terminé', jid='j2', result={'ok': True, 'kept': True, 'exists': True, 'run': run, 'built': now.isoformat().replace('+00:00', 'Z'), 'steps': 25, 'files': 51, 'bytes': 17100000, 'age': 0, 'seconds': 13, 'times': [run, run]})
    failed = _view('done', step='Terminé', jid='j3', result={'ok': False, 'exists': True, 'reason': 'no-run'})
    st = _launcher(c, [absent], verbs=_VERBS + ['weather/world'])
    cfg, _ = _fixture()
    _open(c, cfg)
    _all_open(c)
    c.until("!!document.querySelector('[data-set=world]')", timeout=8000, what='the world synoptic row')
    row = lambda: c.js("(() => { const r = document.querySelector('[data-set=world]'); return [r.dataset.state, r.closest('details.f-group').dataset.group] })()")
    c.eq(row(), ['absent', 'weather'], 'a row in the weather group; nothing published here yet: absent', what='row')
    c.eq(norm(c.text('[data-set=world] summary b')), norm(WT('name')), 'its name', what='name')
    c.eq(norm(c.text('[data-world-meta]')), norm(WT('none')), 'no synoptic on this workstation', what='meta')
    c.eq(_posts(st, 'world')[0]['args'], {'action': 'status'}, 'the state is read at the opening: action status (no network)', what='status body')
    c.until("!!document.querySelector('[data-set=world][data-phase=\"\"]')", timeout=3000, what='the row is drawn')
    for _ in range(40):   # the state read takes a poll of the job: wait until it is over
        if _posts(st, 'world') and c.js("document.querySelector('[data-set=world]').dataset.phase") == '':
            break
        c.wait(250)
    c.js("document.querySelector('[data-set=world]').open = true")
    c.eq(norm(c.text('[data-world-local]')), norm(WT('local')), 'the publication is said local to the workstation, never synchronised', what='local')
    # ---- Construire: action build; the same run already there is reused (13 s)
    st['views'] = [built]
    st['i'] = 0
    st['start'] = (200, {'job': 'j2'})
    c.js("document.querySelector('[data-set=world]').open = true")
    c.js("document.querySelector('[data-verb=world-build]').scrollIntoView({block:'center'})")
    c.tap('[data-verb=world-build]')
    c.until('!!document.querySelector("[data-world-result][data-result=done]")', timeout=12000, what='the end of the build')
    c.eq(_posts(st, 'world')[-1]['args'], {'action': 'build'}, 'the gesture builds', what='build body')
    size = _bytes(c, 17100000 / 1024)
    c.ok('25' in c.text('[data-world-result]') and size in c.text('[data-world-result]') and '13' in c.text('[data-world-result]'), c.text('[data-world-result]'), 'the end says the steps, the weight and the seconds')
    c.eq(row()[0], 'ok', 'the row is up to date once published', what='row after')
    c.ok(size in c.text('[data-world-meta]') and '25' in c.text('[data-world-meta]'), c.text('[data-world-meta]'), 'the summary says the run, the steps and the weight')
    # ---- a failure says its reason, the publication stays
    st['views'] = [failed]
    st['i'] = 0
    st['start'] = (200, {'job': 'j3'})
    c.tap('[data-verb=world-build]')
    c.until('!!document.querySelector("[data-world-result][data-result=failed]")', timeout=12000, what='the failure')
    c.eq(norm(c.text('[data-world-result]')), norm(_trow('no-run', lang, after='  world: {')), 'no run published or NOAA unreachable: the old publication stays', what='reason')
    c.eq(row()[0], 'ok', 'the row keeps the old publication', what='row kept')
    c.check_errors()


@case('L51', 'Données: without weather/world in regen/verbs the synoptic row is grey with its reason and nothing is sent', 'L', tags=('data',),
      designs=('standard',), screens=False, night=False,
      rule='SOG-0138: the verb is read from regen/verbs like the others; an old launcher greys « Construire » with « ne connaît pas encore cette opération »')
def l51(c):
    st = _launcher(c, [], verbs=_VERBS)
    cfg, _ = _fixture()
    _open(c, cfg)
    _all_open(c)
    c.until("!!document.querySelector('[data-set=world]')", timeout=8000, what='the row')
    c.js("document.querySelector('[data-set=world]').open = true")
    c.eq([c.js("document.querySelector('[data-verb=world-build]').disabled"), c.attr('[data-set=world] [data-reason]', 'data-reason')], [True, 'unknown-verb'], 'grey, the launcher does not know the verb', what='grey')
    c.eq(len(_posts(st, 'world')), 0, 'nothing is sent', what='posts')
    c.check_errors()


@case('L53', 'Données: a pack is a switch « the whole pack in the coverage »: off removes its zones after a question that names them (unticked, nothing purged); hovering or pressing a row highlights its zones on the map', 'L', tags=('data',), langs4=True,
      designs=('standard',), night=False,
      rule='SOG-0147 (V3_SPECIFICATION § 10.42): packs could be added but not removed and did not show what they cover; one row = one switch (on: adds, off: removes all its zones from the coverage, with a confirmation naming what is unticked, never purged), hover (mouse) or press (touch) lights the zones of the row on the map')
def l53(c):
    lang = c.lang
    PT = lambda key: _trow(key, lang, after='  packs: {')
    st = _launcher(c, [], verbs=_VERBS)
    st['status'] = _ALL_OK()
    cfg = _packs_cfg()
    cfg['outlines'] = _outlines()
    _open(c, cfg)
    _all_open(c)
    c.until("document.querySelectorAll('[data-wmap] path[data-zone]').length === 4", timeout=15000, what='the world map')
    c.until("!!document.querySelector('[data-pack-switch=ouest]')", timeout=8000, what='the switches')
    c.js("document.querySelector('[data-packs-fold]').open = true")   # « Paquets de pays » is folded when the screen opens (SOG-0228)
    hl = lambda z: c.js(f"document.querySelector('[data-wmap] path[data-zone={z}]').hasAttribute('data-hl')")   # the zones of a pack lit on the world map: the accent border (data-hl)
    tone = lambda z: c.js(f"document.querySelector('[data-wmap] path[data-zone={z}]').dataset.tone")
    def tapsw():   # nothing floating may cover the switch (a note, the tab bar): notes closed, the pack scrolled to the middle
        c.js("document.querySelectorAll('#fNotes .f-note button').forEach(b => b.click())")
        c.until("!document.querySelector('.f-modal')", timeout=8000, what='no question left on the screen (it locks the page scroll while it closes)')
        c.until("(() => { const f = document.querySelector('[data-packs-fold]'); if (!f.open) f.open = true; const e = document.querySelector('[data-pack-switch=ouest]'); e.scrollIntoView({ block: 'center' }); const b = e.getBoundingClientRect(); return b.top >= 0 && b.bottom <= window.innerHeight && document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2) === e })()", timeout=8000, what='the switch is in view and uncovered (the page can still be settling: scrolled again until it is)')
        c.tap('[data-pack-switch=ouest]')
    # ---- the fold « Ajouter ou retirer des pays par paquet » is under the list of the packs, in the choice of the base panel
    c.eq(c.js("!!document.querySelector('.d-choice [data-packs]')"), True, 'the packs fold is in the choice of the base panel', what='in choice')
    # ---- hover (mouse): the zones of the row light up, then go back
    c.until("[...document.querySelectorAll('[data-state-sentence] [data-filter]')].reduce((a, b) => a + parseInt(b.textContent, 10), 0) === 5", timeout=8000, what='the states are drawn (the colours settle)')
    c.wait(400)
    c.js("document.querySelectorAll('#fNotes .f-note button').forEach(b => b.click())")   # a floating note must not cover the row
    c.js("document.querySelector('[data-pack=ouest]').scrollIntoView({ block: 'center' })")
    if c.width >= 700:   # the row is hovered only there
        c.until("(() => { const f = document.querySelector('[data-packs-fold]'); if (!f.open) f.open = true; const r = document.querySelector('[data-pack=ouest] .d-packname'); if (!r) return false; r.scrollIntoView({ block: 'center' }); const b = r.getBoundingClientRect(), o = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !!o && (o === r || r.contains(o) || o.contains(r)) })()", timeout=8000, what='the name of the pack is uncovered and in view (fold open, notes closed)')
    c.wait(300)
    if c.width >= 700:   # the hover is the gesture of a mouse (wide screens); at 390 the gesture is the press below (a forced hover there proved nothing: 2 failures out of 6)
        c.page.hover('[data-pack=ouest] .d-packname')
        c.wait(400)
        c.eq([hl('fr'), hl('gb'), hl('es')], [True, True, False], 'hovering Western Europe lights fr and gb on the map (their border), not Spain', what='hover')
        c.page.mouse.move(5, 5)
        c.wait(400)
        c.eq(hl('fr'), False, 'leaving the row puts the colours back', what='leave')
    # ---- press (touch): the zones stay lit until the next press elsewhere
    c.js("document.querySelector('[data-pack=ouest]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', pointerId: 7 }))")
    c.wait(400)
    c.eq(hl('fr'), True, 'a touch press lights the zones and keeps them lit', what='press')
    c.js("document.querySelector('.d-choice').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', pointerId: 7 }))")
    c.wait(400)
    c.eq(hl('fr'), False, 'a press elsewhere puts the colours back', what='press elsewhere')
    # ---- off: the question names the zones, No keeps everything
    c.js("document.querySelector('[data-pack=ouest]').scrollIntoView({ block: 'center' })")
    tapsw()   # half on → on: adds de and it
    c.until("document.querySelector('[data-pack-switch=ouest]').checked", timeout=6000, what='the pack is in the coverage')
    cov = c.doc('cache/data/coverage.json')['zones']
    tapsw()   # on → off: a question
    q = _ask_text(c)
    names = {'fr': ['France', 'Royaume-Uni'], 'en': ['France', 'United Kingdom'], 'de': ['Frankreich', 'Vereinigtes K'], 'es': ['Francia', 'Reino Unido']}[lang]
    c.ok(all(n in q['text'] for n in names), q['text'], 'the question names the zones that will be unticked')
    c.eq(norm(q['ok']), norm(PT('remove')), 'one-word confirmation', what='ok')
    c.page.click('.f-modal [data-no]')
    c.until("document.querySelector('[data-pack-switch=ouest]').checked", timeout=6000, what='No: the switch comes back on')
    c.eq(c.doc('cache/data/coverage.json')['zones'], cov, 'No: the coverage is unchanged', what='kept')
    # ---- Yes: the zones leave the coverage and the selection; nothing is purged
    tapsw()
    _ask_text(c)
    c.page.click('.f-modal [data-ok]')
    doc = c.until_doc('cache/data/coverage.json', lambda d: bool(d) and 'fr' not in d.get('zones', []) and 'gb' not in d.get('zones', []), what='the pack leaves the coverage')
    c.ok(all(z in doc['zones'] for z in ('ca', 'es', 'us')), doc, 'the other zones stay')
    c.until("document.querySelector('[data-wmap] path[data-zone=fr]').dataset.tone === 'muted'", timeout=6000, what='France is outside the coverage on the map')
    c.eq([tone('fr'), tone('gb')], ['muted', 'muted'], 'its zones are outside the coverage on the map (grey)', what='map')
    c.eq([p['verb'] for p in st['posts'] if p.get('verb') == 'purge'], [], 'nothing is purged: no launcher job', what='no purge')
    c.eq(c.js("document.querySelector('[data-pack-switch=ouest]').checked"), False, 'the switch is off', what='off')
    if c.width == 390:
        c.shot(f'L53_packs_{c.width}_{lang}.png')
    c.check_errors()


@case('L54', 'Données: « Ranger les sources brutes » is visible read only without a launcher or with one that does not know the verb: the buttons grey, the reason written', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=False, night=False,
      rule='SOG-0144 (rest): the block of the inventory card was EMPTY without a paired launcher and the user did not find it; it is shown read only with its reason (« lanceur non appairé », « verbe inconnu de ce lanceur »), the two buttons grey, nothing sent')
def l54(c):
    lang = c.lang
    RT = lambda key: _trow(key, lang, after='      refusal: {')
    cfg, _ = _fixture()
    _open(c, _sized(cfg))
    c.until("!!document.querySelector('[data-inventory]')", timeout=8000, what='the inventory card, without a launcher')
    c.js("document.querySelector('[data-inventory]').open = true")
    c.until("!!document.querySelector('[data-move-box]')", timeout=4000, what='the move block')
    c.eq([c.js("[...document.querySelectorAll('[data-move-box] [data-move]')].map(b => [b.dataset.move, b.disabled])"), c.attr('[data-move-box] [data-move-reason]', 'data-move-reason'), norm(c.text('[data-move-box] [data-move-reason]'))],
         [[['plan', True], ['plan-undo', True]], 'noLauncher', norm(RT('noLauncher'))], 'no launcher: the two buttons grey, the reason written', what='no launcher')
    c.page.click('[data-move=plan]', force=True)
    c.wait(300)
    c.eq(c.count('[data-move-state]'), 0, 'a grey button does nothing', what='nothing')
    c.check_errors()


@case('L55', 'Données: with a launcher that does not know base/move-sources the block is shown grey with « verbe inconnu de ce lanceur »', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=False, night=False,
      rule='SOG-0144 (rest): the verb is read from regen/verbs; an older launcher shows the block read only with its reason')
def l55(c):
    lang = c.lang
    RT = lambda key: _trow(key, lang, after='      refusal: {')
    st = _launcher(c, [], verbs=['base/fetch', 'base/build', 'base/purge'], inventory={'ok': True, 'rows': []})
    cfg, _ = _fixture()
    _open(c, _sized(cfg))
    c.until("!!document.querySelector('[data-inventory]')", timeout=8000, what='the inventory card')
    c.js("document.querySelector('[data-inventory]').open = true")
    c.until("!!document.querySelector('[data-move-box]')", timeout=6000, what='the move block')
    c.eq([c.js("[...document.querySelectorAll('[data-move-box] [data-move]')].map(b => b.disabled)"), c.attr('[data-move-box] [data-move-reason]', 'data-move-reason'), norm(c.text('[data-move-box] [data-move-reason]'))],
         [[True, True], 'unknownVerb', norm(RT('unknownVerb'))], 'unknown verb: grey, the reason written', what='unknown verb')
    c.check_errors()


@case('L56', 'Données: in the base panel only « Mettre à jour » is in view and primary, the other verbs are under a folded « Plus »; « Purger » on more than 60 zones is cut into runs of 60, one plan per run, ONE question that sums them', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=False, night=False,
      rule='SOG-0071 time 3 (rule 13: one primary per screen): the verbs row of the base panel shows « Mettre à jour » alone (primary); « Télécharger », « Prendre le fichier », « Tout recalculer » and « Purger » go under « Plus »; base/purge takes 1 to 60 zones like the others: one plan (dry) per run, then ONE question with the sum, then the real purges run by run')
def l56(c):
    lang = c.lang
    plan = _view('done', step='Terminé', result={'removed': {'ca': {'files': 3, 'bytes': 3072}}, 'warnings': []})
    st = _launcher(c, [plan], verbs=_VERBS)
    cfg, _ = _fixture()
    extra = [f'q{i:02d}' for i in range(73)]
    for z in extra:
        cfg['zones'].append({'id': z, 'names': [z.upper()] * 4, 'frames': [], 'published': True})
        cfg['publication']['base'][z] = cfg['publication']['base']['ca']
    _open(c, cfg)
    _all_open(c)
    # ---- the verbs row: « Mettre à jour » alone in view and primary; the rest folded under « Plus »
    row = c.js("""() => { const r = document.querySelector('[data-build] [data-verbs-row]'), f = r?.querySelector('details[data-verbs-more]');
      return { shown: r ? [...r.children].filter(e => e.tagName === 'BUTTON').map(b => b.dataset.verb) : null, open: f ? f.open : null, summary: f?.querySelector('summary').textContent.trim() || '',
        folded: f ? [...f.querySelectorAll('button')].map(b => [b.dataset.verb, b.classList.contains('primary')]) : null,
        primaries: [...document.querySelectorAll('[data-build] button.primary')].map(b => b.dataset.verb),
        hidden: f ? [...f.querySelectorAll('button')].every(b => !b.checkVisibility()) : null } }""")
    c.eq([row['shown'], row['open'], norm(row['summary']), c.count('[data-build] > [data-state-head] [data-verb=update]'), c.count('[data-build] [data-verb=update]')], [[], False, norm(_trow('more', lang, after='  upd: {')), 1, 1], '« Mettre à jour » is the only button in view, in the head block; the row holds nothing but « Plus » (folded)', what='row')
    c.eq([[v for v, p in row['folded']], row['hidden']], [['download', 'pickup', 'build', 'purge'], True], 'under « Plus »: Télécharger, Prendre le fichier, Tout recalculer, Purger; none is visible while folded', what='folded verbs')
    c.eq(row['primaries'], ['update'], 'one primary button in the panel: « Mettre à jour »', what='one primary')
    c.js("document.querySelector('[data-build] [data-verbs-row]').scrollIntoView({ block: 'center' })")
    if c.width == 390:
        c.shot(f'L56_verbs_{c.width}_{lang}.png')
    # ---- the user's case: 78 zones ticked, « Purger » (under « Plus ») plans the runs one after the other
    c.eq(_cov_count(c), 78, 'seventy-eight zones ticked', what='78 ticked')
    c.tap('[data-build] [data-verb=purge]')
    q = _ask_text(c)
    posts = _posts(st, 'purge')
    c.eq([len(p['args']['zones']) for p in posts], [60, 18], 'two plans, 60 then 18, one after the other; nothing is purged before the answer', what='plans')
    c.eq([bool(p['args'].get('dry')) for p in posts], [True, True], 'both are plans (dry)', what='dry')
    sentence = norm(_trow('purgeChunksAsk', lang).replace('{n}', '78').replace('{k}', '2').replace('{z}', '60'))
    c.ok(sentence in norm(q['text']) and '6' in q['text'], q['text'], 'ONE question: the sum of the two plans (6 files) and the sentence that says the runs')
    # ---- No: nothing is purged
    c.page.click('.f-modal [data-no]')
    c.wait(600)
    c.eq(len(_posts(st, 'purge')), 2, 'No: no real purge is sent', what='no purge')
    # ---- Yes: the real purges, run by run, with no second question
    c.tap('[data-build] [data-verb=purge]')
    _ask_text(c)
    c.page.click('.f-modal [data-ok]')
    for _ in range(60):
        if len(_posts(st, 'purge')) >= 6:
            break
        c.wait(250)
    posts = _posts(st, 'purge')
    c.eq([[len(p['args']['zones']), bool(p['args'].get('dry'))] for p in posts], [[60, True], [18, True], [60, True], [18, True], [60, False], [18, False]],
         'after Yes: the real purges, 60 then 18, each on its own zones; the plans of the second asking come first', what='real runs')
    c.eq(c.count('.f-modal'), 0, 'no second question', what='one question')
    c.check_errors()


@case('L57', 'Données: a question never exceeds the screen: « Prendre le fichier téléchargé » with sixty files shows seven lines then « … et n autres », the buttons stay in view; any long question scrolls inside its window (max 70 vh)', 'L', tags=('data',), langs4=True,
      designs=('standard',), night=False,
      rule='SOG-0151 (rule 13): the plan of the pickup listed every file and the question grew past the screen, the button unreachable; a list in a question is cut at seven lines (« … et n autres »), and the frame’s window (.f-modal) is at most 70 vh high with its text scrolling inside, header and buttons always in view')
def l57(c):
    lang = c.lang
    T = lambda key, after=None, row=0: _trow(key, lang, after, row)
    cfg, _ = _fixture()
    sia_zip = {'zone': 'fr', 'source': 'sia', 'zip': 'export_xml_bd_SIA_2026-11-26.zip', 'size': 3000000, 'files': ['a.xml', 'b.xml', 'c.xml'], 'bytes': 5242880}
    missing = [{'zone': 'gb', 'source': 'nats', 'expected': f'EG_{i:02d}_*.zip'} for i in range(60)]
    st = _launcher(c, [_pk_plan([sia_zip], missing)], verbs=ALL_VERBS + ['base/pickup'])
    _open(c, cfg)
    _all_open(c)
    _untick(c, 'ca', 'es', 'us')
    st['start'] = (200, {'job': 'k1'})
    geo = """() => { const d = document.querySelector('.f-modal>div'), o = d.querySelector('[data-ok]').getBoundingClientRect(), r = d.getBoundingClientRect(), p = d.querySelector('p');
      return { fits: r.top >= 0 && r.bottom <= innerHeight, btn: o.top >= 0 && o.bottom <= innerHeight, h: Math.round(r.height), vh: innerHeight, inner: p.scrollHeight > p.clientHeight } }"""
    c.tap('[data-build] [data-verb=pickup]')
    q = _ask_text(c)
    fixg = [g for g in q['sections'] if g[0] == 'fix'][0]
    c.ok(len(fixg[2]) == 60 and 'EG_00_' in fixg[2][0] and 'EG_59_' in fixg[2][-1], fixg[2][:2], 'sixty files to fix: sixty lines in their group (the group scrolls, nothing is cut by « … et n autres »)')
    lst = c.js("() => { const u = document.querySelector('.f-modal [data-ask-section=fix] .f-ask-lines'), li = parseFloat(getComputedStyle(u.querySelector('li')).lineHeight); return { rows: Math.round(u.clientHeight / li * 10) / 10, scrolls: u.scrollHeight > u.clientHeight, overflow: getComputedStyle(u).overflowY } }")
    c.ok(lst['scrolls'] and lst['overflow'] == 'auto' and 6.5 <= lst['rows'] <= 7.6, lst, 'the group shows seven lines of text at most and scrolls inside itself')
    g = c.js(geo)
    c.ok(g['fits'] and g['btn'] and g['h'] <= g['vh'] * 0.7 + 1, g, 'the question fits the screen (70 vh at most), its buttons in view without scrolling the page')
    if c.width in (390, 1280):
        c.shot(f'L57_pickup_{c.width}_{lang}.png')
    c.tap('.f-modal [data-no]')
    c.until("!document.querySelector('.f-modal')", what='the window closes')
    # ---- any question: a text far too long scrolls inside the window
    c.js("() => { window.__long = window.SogFrame.ask(Array.from({ length: 1500 }, (_, i) => 'mot' + i).join(' '), { ok: 'OK' }) }")
    c.until("!!document.querySelector('.f-modal [data-ok]')", timeout=6000, what='the long question')
    g = c.js(geo)
    c.ok(g['fits'] and g['btn'] and g['h'] <= g['vh'] * 0.7 + 1 and g['inner'], g, 'a very long question: the window stays within 70 vh, the text scrolls inside it, the buttons stay in view')
    if c.width in (390, 1280):
        c.shot(f'L57_long_{c.width}_{lang}.png')
    c.tap('.f-modal [data-ok]')
    c.check_errors()



@case('L58', 'Données: « Prendre le fichier téléchargé » sends the « personnel » box to base/pickup and says what is already taken and what is there but not read (SOG-0150); « Mettre à jour » carries the same box', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=False, night=False,
      rule='SOG-0150 (AeroDB 22e24fe20): base/pickup takes `personal` and answers inPlace [{zone, source, sets}] and unread [{zone, source, why: personal, cycle, sets}]; « Rien à prendre » hid three NATS sets already in place that the build ignored because the box did not declare NATS')
def l58(c):
    lang = c.lang
    li = {'fr': 0, 'en': 1, 'de': 2, 'es': 3}[lang]
    T = lambda key, after=None, row=0: _trow(key, lang, after, row)
    cfg, _ = _fixture()
    gb = next(x['names'][li] for x in cfg['zones'] if x['id'] == 'gb')
    sets = ['AIP', 'OBS', 'UAS']
    five = ('ca', 'es', 'fr', 'gb', 'us')
    in_place = {'inPlace': [{'zone': 'gb', 'source': 'nats', 'sets': sets}]}
    unread = {**in_place, 'unread': [{'zone': 'gb', 'source': 'nats', 'why': 'personal', 'cycle': '2026-10-29', 'sets': sets}]}
    st = _launcher(c, [_pk_plan([], [], [], zones=five, extra=unread)], verbs=_VERBS + ['base/pickup'])
    st['status'] = _status({'gb': _zst('stale', {'code': 'source-unbuilt', 'source': 'nats'}), 'fr': _zst('up-to-date'), 'ca': _zst('up-to-date'), 'es': _zst('up-to-date'), 'us': _zst('up-to-date')})
    _open(c, _sized(cfg))
    _all_open(c)
    c.until("[...document.querySelectorAll('[data-state-sentence] [data-filter]')].reduce((a, b) => a + parseInt(b.textContent, 10), 0) === 5", timeout=10000, what='the state of the five zones')
    lines = lambda: [norm(t) for t in c.js("[...document.querySelectorAll('[data-build-result] [data-line]')].map(p => p.textContent)")]
    # ---- A: the box does not declare NATS: the plan carries personal: [], the end says « already taken » and « there but not read », never « Rien à prendre »
    st['start'] = (200, {'job': 'k1'})
    c.tap('[data-build] [data-verb=pickup]')
    c.until("document.querySelector('[data-build-result][data-op=pickup]')", timeout=10000, what='the end of the plan')
    c.eq(st['posts'][-1]['args'].get('personal'), [], 'the plan carries the box: nothing declared', what='personal A')
    said = norm(c.text('[data-build-result] b'))
    c.eq(said, norm(_agree(T('inPlace', 'pickupSum: {').replace('{n}', '3').replace('{s}', 'NATS'), lang)), 'the end says the sets are already taken', what='already taken')
    c.ok(norm(T('nothing', 'pickupSum: {')) != said, said, 'not « Rien à prendre »')
    want = norm(T('pickupUnread').replace('{z}', gb).replace('{n}', '3').replace('{s}', 'NATS'))
    c.eq(lines(), [want], 'the line says the sets are there but not read: the « personnel » box does not declare NATS', what='unread line')
    # ---- B: the one box is ticked (it declares NATS): personal [enaire, nats, xplane] is sent, nothing is unread
    _tap_certify(c)
    st['views'], st['i'], st['start'] = [_pk_plan([], [], [], zones=five, jid='k2', extra=in_place)], 0, (200, {'job': 'k2'})
    c.tap('[data-build] [data-verb=pickup]')
    c.until("document.querySelector('[data-build-result][data-op=pickup]') && !document.querySelector('[data-build-result] [data-line]')", timeout=10000, what='the end of the second plan')
    c.eq(st['posts'][-1]['args'].get('personal'), ['enaire', 'nats'], 'the one box is ticked: the personal sources of the zones are sent (NATS among them), never X-Plane', what='personal B')
    c.eq(c.count('[data-build-result] [data-line]'), 0, 'declared: nothing is there-but-unread', what='no unread')
    # ---- C: « Mettre à jour » carries the same box to the download and to the build
    fetched = _view('done', step='Terminé', jid='j1', result={'fetched': [], 'unchanged': list(five), 'failed': [], 'manual': []})
    st['views'], st['i'], st['start'] = [fetched], 0, (200, {'job': 'j1'})
    n = len(st['posts'])
    c.tap('[data-build] [data-verb=update]')
    _ask_text(c)
    st['views'], st['i'], st['start'] = [_view('done', step='Terminé', jid='j2', result={'built': ['gb'], 'failed': [], 'commits': [], 'cycle': '2026-10-29', 'current': '2026-10-29', 'stale': False, 'blocking': []})], 0, (200, {'job': 'j2'})
    c.tap('.f-modal [data-ok]')
    for _ in range(40):
        if _posts(st, 'build'):
            break
        c.wait(250)
    c.eq([p['args'].get('personal') for p in st['posts'][n:] if p.get('verb') in ('fetch', 'build')], [['enaire', 'nats']] * 2, '« Mettre à jour »: the download and the build both carry the one box (the personal sources, never X-Plane)', what='update')
    c.eq(_posts(st, 'build')[0]['args']['zones'], ['gb'], 'only gb (source-unbuilt, buildable) is built', what='build zones')
    c.check_errors()


@case('L59', 'Données: the failure of a publication says its cause in the pilot’s words and the step (SOG-0155): three causes, three sentences, passed on by the frame; without a cause the sentence says the launcher did not say, never « fix the cause » alone', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=False, night=False,
      rule='SOG-0155 (AeroDB 8482c891e): the report of POST /__setup/sync carries cause (remote-refused, push-rejected, lfs-hook, auth, network, conflict, busy, timeout, launcher-error, other) and step; frame_data.js exchange() keeps them (closed lists), « Publier » says « La publication a échoué : <cause> (étape <step>) »')
def l59(c):
    lang = c.lang
    report = {'ok': False, 'committed': 1, 'received': 0, 'pushed': False, 'conflicts': [], 'refused': [], 'message': 'boom', 'cause': 'other', 'step': 'push'}
    st = _launcher(c, sync={'changes': 3, 'ahead': 2, 'merging': False, 'last': None})
    st['report'] = report

    def handler(route):
        route.fulfill(status=200, content_type='application/json', body=json.dumps(st['report']))
    c.context.route(re.compile(r'/__setup/sync$'), handler)
    docs = LEVEL3 + [['device/identity.json', {'trigram': 'ABC'}, 'cache'], ['device/usages.json', {'devices': True}, 'cache']]
    c.page.add_init_script(_stub(_fixture()[0]))
    c.open('data', docs=docs, wait=False, app='maintenance')
    c.until("!!document.querySelector('[data-module=data] [data-data-head]')", timeout=20000, what='the head of the Données screen is drawn')
    c.settle()
    word = lambda key, after: norm(_trow(key, lang, after=after))
    for cause, step in (('remote-refused', 'push'), ('auth', 'push'), ('network', 'receive')):
        st['report'] = {**report, 'cause': cause, 'step': step}
        c.js("document.querySelectorAll('.f-note [data-x]').forEach(b => b.click())")
        c.tap('[data-publish] [data-verb=publish]')
        _ask_text(c)
        c.tap('.f-modal [data-ok]')
        c.until("document.querySelector('[data-publish-result]')?.dataset.result === 'failed'", timeout=10000, what=f'the failure {cause}')
        want = norm(_trow('pubFailedCause', lang).replace('{c}', _trow(cause, lang, after='  pubCause: {')).replace('{s}', _trow('pubStepAt', lang).replace('{s}', _trow(step, lang, after='  pubStep: {'))))
        got = _publish_state(c)['lines']
        c.eq(got, [['failed', want]], f'{cause} at {step}: the cause in the pilot’s words and the step', what=cause)
        c.until("!document.querySelector('[data-publish] [data-verb=publish]').disabled", timeout=6000, what='the button is live again')
    # a cause the page does not know, a step outside the list: the cause is dropped, the sentence says the launcher did not say
    st['report'] = {**report, 'cause': '<img src=x>', 'step': '../../etc'}
    c.js("document.querySelectorAll('.f-note [data-x]').forEach(b => b.click())")
    c.tap('[data-publish] [data-verb=publish]')
    _ask_text(c)
    c.tap('.f-modal [data-ok]')
    c.until("document.querySelector('[data-publish-result]')?.dataset.result === 'failed'", timeout=10000, what='the hostile failure')
    c.eq(_publish_state(c)['lines'], [['failed', norm(_trow('pubFailed', lang))]], 'an unknown cause is never shown: the sentence says the launcher did not say why', what='hostile')
    c.eq(c.count('[data-publish-result] img'), 0, 'nothing from the report becomes an element', what='escaped')
    c.check_errors()


@case('L60', 'Données: the opening is usable at once (SOG-0164): the zones are drawn while the state of data/ (sync-status, slow on 10 000 files) is still being read, its line says « reading » in a reserved place; the world map is an SVG (no library, no tile); the States map starts only when it comes into the screen', 'L', tags=('data',),
      designs=('standard',), screens=True, phone=False, night=False,
      rule='SOG-0164 (the user: the page must be usable in under one second): the first draw no longer waits for GET sync-status; MapLibre (about 1 MB) and its tiles are asked for when the zones map is near the screen, not at the opening')
def l60(c):
    lang = c.lang
    c.page.set_viewport_size({'width': 1280, 'height': 420})      # the map is below the first screen
    st = _launcher(c, [], verbs=_VERBS, sync={'changes': 3, 'ahead': 2, 'merging': False, 'last': None})
    st['status'] = _status({z: _zst('up-to-date') for z in ('ca', 'es', 'fr', 'gb', 'us')})
    cfg, _ = _fixture()
    cfg['outlines'] = _outlines()
    c.context.route(re.compile(r'^https://tiles\.openfreemap\.org/'), lambda r: r.fulfill(status=200, content_type='application/json', body=_ZSTYLE))
    # sync-status answers after 2.5 s (the relevé of a data/ of 10 000 files): the page patches fetch for that route only
    body = json.dumps({'repo': True, 'branch': 'main', 'behind': 0, 'changes': 3, 'ahead': 2, 'merging': False, 'last': None})
    c.page.add_init_script("""(() => { window.__ss = 0; const f = window.fetch; window.fetch = function (u, o) { const url = String((u && u.url) || u);
      if (!url.includes('sync-status')) return f.call(this, u, o); window.__ss++; return new Promise(r => setTimeout(r, 2500)).then(() => new Response(%s, { status: 200, headers: { 'content-type': 'application/json' } })).finally(() => { window.__ss-- }) } })()""" % json.dumps(body))
    c.page.add_init_script("""(() => { window.__sh = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) { if (!e.hadRecentInput) window.__sh.push([Math.round(e.startTime), +e.value.toFixed(3), (e.sources || []).map(x => { const n = x.node && (x.node.nodeType === 1 ? x.node : x.node.parentElement); return n ? (n.dataset.set || n.dataset.group || n.className || n.nodeName) : '?' }).slice(0, 3)]) } }).observe({ type: 'layout-shift', buffered: true }) } catch (e) {} })()""")
    c.page.add_init_script(_ZHOOK_JS)
    _open(c, _sized(cfg))
    state = c.js("""() => ({ zones: document.querySelectorAll('[data-wmap] path[data-zone]').length, pending: window.__ss, reading: !!document.querySelector('[data-publish-state=reading]'), readingText: document.querySelector('[data-publish-state=reading]')?.textContent.replace(/\s+/g, ' ').trim() || '', unread: !!document.querySelector('[data-publish-state=unread]'),
      lib: performance.getEntriesByType('resource').some(e => /maplibre|openfreemap/.test(e.name)), ih: innerHeight })""")
    c.ok(state['zones'] == 4 and state['pending'] > 0, state, 'the world map (its four zones) is drawn while sync-status is still being read')
    c.ok(state['reading'] and not state['unread'], state, 'the Publier line says « reading », never « could not be read » while it waits')
    c.ok(not state['lib'], state, 'the world map is an SVG: neither MapLibre nor a tile was asked for (the States map, far below, starts only when it comes into the screen)')
    c.eq(norm(state['readingText']), norm(_trow('pubReading', lang)), 'worded in the language of the run', what='reading text')
    # the answer comes: the line is replaced by the real state
    c.until("!document.querySelector('[data-publish-state=reading]') && !!document.querySelector('[data-publish-state=changes]')", timeout=10000, what='the state of data/ arrives')
    sh = c.js('window.__sh')
    c.ok(sum(x[1] for x in sh if x[0] > 600) < 0.1, sh, 'the arrival of the state of data/ moves nothing noticeable (layout shift under 0.1, rule 22)')
    # the States map (Procédures panel) comes into the screen: now the library is asked for, and the map is drawn
    _all_open(c)
    for _ in range(20):   # the reader scrolls down to the map (the page settles under his finger: the gesture is repeated until the map is there)
        c.js("document.querySelector('[data-zone-map=proc]')?.scrollIntoView({ block: 'center' })")
        if c.count('[data-zone-map=proc] .d-map-host .maplibregl-canvas'):
            break
        c.wait(500)
    c.until("!!document.querySelector('[data-zone-map=proc] .d-map-host .maplibregl-canvas')", timeout=10000, what='the States map is drawn once it is in the screen')
    c.ok(c.js("performance.getEntriesByType('resource').some(e => /maplibre/.test(e.name))"), None, 'MapLibre was asked for when the map came near')
    c.check_errors()


@case('L61', 'Données: no message of the module asks to untick or deselect X-Plane (there is no such box), in four languages; a source read on this workstation only is never in args.personal (SOG-0162, refused at the recipe: « il ne veut pas construire x-plane, et tout est bloqué »)', 'L', tags=('data',), static=True,
      rule='SOG-0162: the single certification box used to send X-Plane with the other sources and the build answered « untick X-Plane and start again » although no box existed; the texts that ask for it are gone, the id is not sent (L7, L10, L15, L32, L58 prove the bodies)')
def l61(c):
    src = (ROOT / 'modules/data/texts.js').read_text(encoding='utf-8')
    bad = re.compile(r"(décochez|untick|abwählen|desmarque)[^'\n]{0,40}X-Plane|X-Plane[^'\n]{0,60}(décochez|untick|abwählen|desmarque)|X-Plane (coché|ticked|angekreuzt|marcado)", re.I)
    c.eq([m.group(0) for m in bad.finditer(src)], [], 'no text of the module asks to untick X-Plane or speaks of X-Plane as ticked', what='texts')
    c.eq(src.count('xplaneHint'), 0, 'the X-Plane hint (a line under a box that no longer exists) is gone', what='hint key')
    panels = (ROOT / 'modules/data/panels.js').read_text(encoding='utf-8')
    c.ok('isLocalOnly' in panels, None, 'the personal sources sent to the verbs leave out those read on this workstation only')


@case('L62', 'Données: every button named between quotation marks in a message of the module exists on the screen under that name, in the four languages (one name per gesture) — no more « cliquez sur Recalculer » for a button that is gone (SOG-0180)', 'L', tags=('data',), static=True,
      rule='SOG-0180 (refused at the recipe: « l’information dit « cliquez sur recalculer ». le bouton n’existe plus »): the words of the messages are checked against the words of the buttons; a name quoted in a message that is not a button of the screen is an orphan')
def l62(c):
    src = (ROOT / 'modules/data/texts.js').read_text(encoding='utf-8')
    src = re.sub(r'^\s*//.*$', '', src, flags=re.M)      # the comments: their apostrophes are not strings
    src = re.sub(r'(?<=[,;\]\)\}])\s+//[^\n]*', '', src)
    one = r"'((?:[^'\\]|\\.)*)'"
    unq = lambda x: re.sub(r"\\(.)", r"\1", x)
    # the buttons (and the boxes) of the screen: the keys whose 4 strings are a label; every occurrence of a key counts
    labels = ['download', 'build', 'purge', 'pickup', 'publish', 'stop', 'addZone', 'pickupReplan', 'updateAll', 'update', 'recompute', 'certify', 'licencesLink', 'retry', 'choose']   # « Choisir le fichier… » (SOG-0199: the button on the line of a zone that waits for a file or whose download was refused)
    allowed = set()
    for k in labels:
        for m in re.finditer(r"^\s*" + k + r": \[\s*" + one + r",\s*" + one + r",\s*" + one + r",\s*" + one, src, re.M):
            allowed |= {unq(g) for g in m.groups()}
    # names that are not buttons of the screen but panels, layers or other screens' buttons, said as such (the sheets panel of the aircraft group, raw layer names, Fuel and Map's « Relire », the settings path)
    others = {'Fiches publiées', 'Published sheets', 'Veröffentlichte Datenblätter', 'Fichas publicadas', 'Relire', 'Read again', 'Erneut lesen', 'Volver a leer', 'data', 'hot', 'Registration form (New Users)', '{f}'}   # the last: the link of EUROCONTROL's own EAD Basic page, not a button of this screen (SOG-0237)
    c.ok(len(allowed) >= 40, len(allowed), 'the labels of the screen were read (four languages each)')
    quote = re.compile(r"«\s*([^»]{2,60}?)\s*»|“([^”]{2,60}?)”|„([^“]{2,60}?)“")
    orphans = []
    for m in re.finditer(one, src):
        text = unq(m.group(1))
        for q in quote.finditer(text):
            name = next(g for g in q.groups() if g).strip()
            if name not in allowed and name not in others:
                orphans.append(name)
    c.eq(sorted(set(orphans)), [], 'every quoted button name of a message is the name of a button of the screen', what='orphans')


@case('L63', 'Données: the numbers of the state sentence (« 58 à jour · 2 en échec · 1 attend un fichier »): each number unfolds its zones in place; a zone that waits for a file has « Prendre le fichier » on its line, a failed one « Réessayer » (SOG-0180)', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=True, night=False,
      rule='SOG-0180 (decision 2 and 4): a zone waiting for a file only the user can drop says so on its own line with the button that takes it; a failed zone has its own « Réessayer » (the build of that zone alone); the end is a one-line balance whose numbers open their lines')
def l63(c):
    lang = c.lang
    ok = _view('done', step='Terminé', jid='j1', zones={'es': _zs('built', 4, 4, commit='abc1234')}, result={'built': ['es'], 'failed': [], 'commits': [{'zone': 'es', 'commit': 'abc1234'}], 'cycle': '2026-10-29', 'current': '2026-10-29', 'stale': False, 'blocking': []})
    plan = _view('done', step='Terminé', jid='j2', result={'ok': True, 'dry': True, 'taken': [], 'missing': []})
    st = _launcher(c, [plan], verbs=_VERBS + ['base/pickup'])
    st['status'] = _status({'ca': _zst('up-to-date'), 'es': _zst('failed', {'code': 'failed', 'error': 'invalid-output'}), 'fr': _zst('stale', _NEWER),
                            'gb': _zst('stale', {'code': 'pickup-waiting', 'source': 'nats', 'set': 'AIP', 'cycle': '2026-11-26', 'zip': 'x.zip'}, buildable=False), 'us': _zst('up-to-date')})
    cfg, _ = _fixture()
    _open(c, _sized(cfg))
    _all_open(c)
    c.until("[...document.querySelectorAll('[data-state-sentence] [data-filter]')].reduce((a, b) => a + parseInt(b.textContent, 10), 0) === 5 && !!document.querySelector('[data-state-sentence] [data-filter]')", timeout=8000, what='the five pills and the numbers of the sentence')
    nums = lambda: c.js("[...document.querySelectorAll('[data-state-sentence] button[data-filter]')].filter(b => b.dataset.filter).map(b => [b.dataset.filter, +b.textContent.match(/\\d+/)[0]])")
    c.eq(nums(), [['upToDate', 2], ['rebuild', 1], ['failed', 1], ['waiting', 1]], 'the numbers of the sentence: two up to date, one to rebuild, one failed, one waiting for a file (nothing without a state)', what='balance')
    c.eq(c.count('[data-state-sentence]'), 1, 'one sentence', what='one sentence')
    shown = lambda: c.js("[...document.querySelectorAll('[data-state-zones] [data-zone-row]')].map(r => r.dataset.zoneRow)")
    c.eq(c.count('[data-build-zones]') + c.count('[data-state-zones]'), 0, 'nothing is unfolded at the start, and there is no list of the whole coverage under the sentence any more (SOG-0262)', what='folded')
    # ---- a number unfolds its lines in place
    c.tap('[data-state-sentence] [data-filter=failed]')
    c.until("document.querySelectorAll('[data-state-zones] [data-zone-row]').length === 1", timeout=4000, what='only the failed line')
    c.eq(shown(), ['es'], 'the number of failures unfolds the failed zone alone', what='failed only')
    c.eq(c.js("document.querySelector('[data-state-sentence] [data-filter=failed]').getAttribute('aria-expanded')"), 'true', 'and says it is open', what='expanded')
    c.tap('[data-state-sentence] [data-filter=waiting]')
    c.until("document.querySelectorAll('[data-state-zones] [data-zone-row]').length === 1 && !!document.querySelector('[data-state-zones] [data-zone-row=gb]')", timeout=4000, what='the waiting line')
    c.tap('[data-state-sentence] [data-filter=waiting]')
    c.until("!document.querySelector('[data-state-zones]')", timeout=4000, what='the same number folds it')
    # ---- the actions are on the lines of their zones, and only there
    acts = lambda: c.js("[...document.querySelectorAll('[data-zone-action]')].map(p => [p.dataset.zoneAction, [...p.querySelectorAll('button[data-verb]')].map(b => b.dataset.verb)])")
    c.tap('[data-state-sentence] [data-filter=failed]')
    c.until("!!document.querySelector('[data-state-zones] [data-zone-row=es]')", timeout=4000, what='the failed line')
    c.eq(acts(), [['es', ['retry-zone']]], '« Réessayer » on the failed zone, only there', what='actions failed')
    c.eq(norm(c.text('[data-zone-row=es] [data-verb=retry-zone]')), norm(_UT('retry', lang)), 'worded in the language of the run', what='retry label')
    c.tap('[data-state-sentence] [data-filter=waiting]')
    c.until("!!document.querySelector('[data-state-zones] [data-zone-row=gb]')", timeout=4000, what='the waiting line')
    c.eq(acts(), [['gb', ['pickup']]], '« Prendre le fichier » on the waiting zone, nothing on the others', what='actions waiting')
    c.eq(norm(c.text('[data-zone-row=gb] [data-verb=pickup]')), norm(_trow('pickup', lang)), 'worded in the language of the run (the same name as the button of the screen)', what='pickup label')
    c.ok('x.zip' in c.text('[data-zone-row=gb] [data-zone-action]') or c.text('[data-zone-row=gb] [data-zone-action]').strip() != '', None, 'the waiting zone says what it waits for on its own line')
    c.shot(f"L63_standard_{c.page.viewport_size['width']}_delivered.png")   # the delivered state, read by the ergonomist
    # ---- « Prendre le fichier » on the line: the plan of THAT zone
    n0 = len(st['posts'])
    c.tap('[data-zone-row=gb] [data-verb=pickup]')
    for _ in range(40):
        if _posts(st, 'pickup'):
            break
        c.wait(250)
    c.eq([{k: p.get(k) for k in ('set', 'verb')} | {'zones': p['args']['zones'], 'dry': p['args'].get('dry')} for p in _posts(st, 'pickup')[:1]], [{'set': 'base', 'verb': 'pickup', 'zones': ['gb'], 'dry': True}], 'the plan of the pickup concerns the waiting zone alone', what='pickup body')
    # ---- « Réessayer »: the build of that zone alone
    c.until("!document.querySelector('[data-build] [data-verb=update]').disabled", timeout=15000, what='the buttons free again')
    st['views'], st['i'] = [ok], 0
    c.tap('[data-state-sentence] [data-filter=failed]')
    c.until("!!document.querySelector('[data-state-zones] [data-zone-row=es] [data-verb=retry-zone]')", timeout=4000, what='the failed line again')
    c.tap('[data-zone-row=es] [data-verb=retry-zone]')
    for _ in range(40):
        if _posts(st, 'build'):
            break
        c.wait(250)
    c.eq([{k: p[k] for k in ('set', 'verb', 'args')} for p in _posts(st, 'build')[:1]], [{'set': 'base', 'verb': 'build', 'args': {'zones': ['es'], 'personal': []}}], 'the build of the failed zone alone', what='retry body')
    c.check_errors()


@case('L64', 'Données: the zones are independent — a run of 60 that fails or half fails does not hold the next runs; a stop does (SOG-0180)', 'L', tags=('data',),
      designs=('standard',), screens=False, night=False,
      rule='SOG-0180 (decision 1): « l’échec d’une zone est une ligne avec sa raison, jamais un arrêt des autres »; runChunks used to stop at the first run that did not end well, now only a stop asked by the user, an interruption or a reason that concerns the whole work stops')
def l64(c):
    half = _view('error', step='Échec', jid='j1', zones={'ca': _zs('built', 4, 4), 'es': _zs('failed', 1, 4, error='invalid-output')}, result={'built': ['ca'], 'failed': [{'zone': 'es', 'error': 'invalid-output'}], 'commits': [], 'cycle': '2026-10-29', 'current': '2026-10-29', 'stale': False, 'blocking': [], 'reason': 'failed'})
    st = _launcher(c, [half], verbs=_VERBS)   # every run answers the same half failure: the second run only starts if the first did not hold it
    cfg, _ = _fixture()
    extra = [f'q{i:02d}' for i in range(73)]
    for z in extra:
        cfg['zones'].append({'id': z, 'names': [z.upper()] * 4, 'frames': [], 'published': True})
        cfg['publication']['base'][z] = cfg['publication']['base']['ca']
    _open(c, cfg)
    _all_open(c)
    c.eq(_cov_count(c), 78, 'seventy-eight zones ticked: two runs', what='78 ticked')
    c.tap('[data-build] [data-verb=build]')
    for _ in range(60):
        if len(_posts(st, 'build')) >= 2:
            break
        c.wait(250)
    c.eq([len(p['args']['zones']) for p in _posts(st, 'build')], [60, 18], 'every run half failed: the second run still starts after the first', what='runs after a failure')
    c.until('document.querySelector("[data-build-result]")', timeout=15000, what='the end')
    # ---- a stop asked by the user does stop the next runs
    cancelled = _view('cancelled', step='Arrêté', jid='j3', result={'built': [], 'failed': [], 'commits': [], 'cycle': '2026-10-29', 'current': '2026-10-29', 'stale': False, 'blocking': []})
    st['views'], st['i'] = [cancelled], 0
    n = len(_posts(st, 'build'))
    c.tap('[data-build] [data-verb=build]')
    c.wait(3000)
    c.eq(len(_posts(st, 'build')) - n, 1, 'a run that ends stopped: the next one is not started', what='runs after a stop')
    c.check_errors()


@case('L65', 'Données: « Mettre à jour » goes on after a download that half failed: the state is read and the question names the zones to rebuild (SOG-0180)', 'L', tags=('data',),
      designs=('standard',), screens=False, night=False,
      rule='SOG-0180 (decision 1): the failure of a source is a line with its reason, never a stop of the other zones; the update used to end at the first download that did not end well')
def l65(c):
    fetch_half = _view('error', step='Échec', jid='j1', result={'fetched': ['fr'], 'unchanged': [], 'failed': [{'zone': 'ca', 'error': 'timeout'}], 'manual': [], 'reason': 'failed'})
    st = _launcher(c, [fetch_half], verbs=_VERBS)
    st['status'] = _FR_STALE()
    cfg, _ = _fixture()
    _open(c, _sized(cfg))
    _all_open(c)
    c.until("[...document.querySelectorAll('[data-state-sentence] [data-filter]')].reduce((a, b) => a + parseInt(b.textContent, 10), 0) === 5", timeout=8000, what='the five pills')
    c.tap('[data-build] [data-verb=update]')
    q = _ask_text(c)
    c.ok(len(q['text']) > 0, q, 'a download that half failed: the update goes on, the question asks about the zones to rebuild (the zones are independent)')
    c.eq([p['verb'] for p in st['posts'] if p['verb'] in ('fetch', 'build')], ['fetch'], 'and nothing is built before the answer', what='posts')
    c.check_errors()


@case('L66', 'Données: each region pack keeps its switch and has a folded « Pays (n) » listing its countries, one tick each (ticked = already in the coverage): ticking adds that country alone, nothing is downloaded or built (SOG-0186)', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=True, night=False,
      rule='SOG-0186 (recipe of SOG-0065: « ce n\u2019était pas si mal de choisir un pays parmi un package… replié, ça pourrait être bien ? »): the switch of a pack stays (all of it), and a fold « Pays (n) », folded by default, lists the pack\u2019s countries with a tick each; ticking adds one country to the coverage, nothing is fetched or built; the open fold has a bounded height and scrolls inside itself')
def l66(c):
    lang = c.lang
    PT = lambda key: _trow(key, lang, after='  packs: {')
    cfg = _packs_cfg()
    _open(c, cfg)
    _all_open(c)
    c.until("!!document.querySelector('[data-packs]')", timeout=8000, what='the packs block')
    c.js("document.querySelector('[data-packs-fold]').open = true")   # « Paquets de pays » is folded when the screen opens (SOG-0228)
    fold = lambda p: f'[data-pack={p}] details[data-pack-fold]'
    c.eq([c.count(fold('ouest')), c.count(fold('asie')), c.count(fold('antarctique'))], [1, 1, 0], 'a fold in each region that has countries, none in an empty pack', what='folds')
    c.eq(c.js("document.querySelector('[data-pack=asie] details[data-pack-fold]').open"), False, 'folded by default', what='folded')
    # SOG-0186 refused at 17:25 (« mettre le chevron d'ouverture sur la ligne même, et réduire le bouton ») : the chevron IS the line of the pack — the summary holds the switch, the name and the counts; « Mettre à jour (n) » is a discreet link at its right, in that line
    c.eq(c.count(fold('asie') + ' > summary [data-pack-switch=asie]'), 1, 'the switch of the pack is in the summary: the chevron is on the line itself', what='switch')
    c.ok(c.js("document.querySelector('[data-pack=asie] [data-pack-switch=asie]').getAttribute('aria-label')") in c.text(fold('asie') + ' > summary') and '2' in c.text(fold('asie') + ' > summary'), c.text(fold('asie') + ' > summary'), 'the summary says the name and the counts of the pack, not a line of its own « Pays (2) »')
    c.eq(c.count(fold('ouest') + ' > summary [data-act=update-pack]'), 0, '« Mettre à jour (n) » is no longer in this fold (SOG-0262: it is on the line of the pack in the list of the packs, L68)', what='no update link here')
    c.tap(fold('asie') + ' > summary')
    c.wait(300)
    cov0 = c.doc('cache/data/coverage.json')
    c.eq(c.js("[...document.querySelectorAll('[data-pack=asie] [data-pack-cov]')].map(i => [i.dataset.packCov, i.checked])"), [['jp', False], ['de', False]], 'a tick per country: none of them is in the coverage yet', what='ticks')
    g = c.js("() => { const o = document.querySelector('[data-pack=asie] details[data-pack-fold] > .d-opts'), cs = getComputedStyle(o); return { overflow: cs.overflowY, max: cs.maxHeight } }")
    c.ok(g['overflow'] == 'auto' and g['max'] != 'none', g, 'the open fold has a bounded height and scrolls inside itself')
    dx = c.js("() => { const r = e => e.getBoundingClientRect(); return r(document.querySelector('[data-pack=asie] [data-pack-cov=jp]')).left - r(document.querySelector('[data-pack-switch=asie]')).left }")
    c.ok(0 <= dx <= 40, dx, 'the countries of the open fold sit under the switch of their pack, not left of it (the chevron is on the pack’s line)')
    if c.width in (390, 1280):
        c.shot(f"L66_standard_{c.width}_{lang}_delivered.png")   # the delivered state, read by the ergonomist
    c.tap('[data-pack=asie] [data-pack-cov=jp]')
    doc = c.until_doc('cache/data/coverage.json', lambda d: bool(d and 'jp' in (d.get('zones') or [])), what='jp added to the coverage')
    c.eq(sorted(set(doc['zones']) - set((cov0 or {}).get('zones') or ['ca', 'es', 'fr', 'gb', 'us'])), ['jp'], 'ticking a country adds that one zone and no other', what='one zone')
    c.until("document.querySelector('[data-pack=asie] details[data-pack-fold]').open && document.querySelector('[data-pack-switch=asie]').indeterminate", timeout=6000, what='the fold stays open and the switch becomes half on')
    c.eq(c.js("document.querySelector('[data-pack=asie] details[data-pack-fold]').open"), True, 'the fold stays open after the draw', what='still open')
    c.eq([p['verb'] for p in c.js("window.__posts || []")], [], 'nothing is downloaded or built', what='no job')
    c.tap('[data-pack=asie] [data-pack-switch=asie]')
    c.until_doc('cache/data/coverage.json', lambda d: bool(d and 'de' in (d.get('zones') or [])), what='« the whole pack » still adds the rest')
    c.check_errors()


@case('L67', 'Données: the coverage table by country (SOG-0174): read from the launcher (base/coverage: once at the opening, shared with the hatch of the world map), seven columns at most (country, points, airways, airspaces, FIR, procedures, ground: a number or « non »), sortable, a country unfolds to its sources and their licence; what the launcher answers is untrusted', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=True, night=False,
      rule='SOG-0174 (the user: « des données aéro pour TOUS les pays »; the ergonomist: one row per country, columns points / airways / airspaces / FIR / procedures / ground, source and licence, sortable, seven columns at most on screen, the rest in the detail of the row): the block is folded and reads nothing until opened; the answer is bounded (zone ids, closed list of source ids, integers); a refused or unreadable answer is said with « Relire »')
def l67(c):
    lang = c.lang
    T = lambda k: _trow(k, lang, after='  cov: {')
    cov_ok = _view('done', step='Terminé', jid='jc', result={'ok': True, 'zones': {
        'fr': {'cycle': '2026-10-29', 'parserVersion': 28, 'counts': {'aerodromes': 1872, 'navaids': 424, 'points': 4277, 'airways': 1493, 'airspaces': 2559, 'vrp': 1121, 'fir': 15}, 'procedures': 6, 'ground': 1,
               'sources': {'declared': ['sia', 'dircam', 'openaip', 'mora', 'xplane'], 'present': ['dircam', 'openaip', 'sia', 'evil']}, 'has': {'points': True}},
        'es': {'cycle': '2026-10-29', 'parserVersion': 23, 'counts': {'aerodromes': 217, 'navaids': 84, 'points': 0, 'airways': 0, 'airspaces': 380, 'vrp': 272, 'fir': 0}, 'procedures': 0, 'ground': 0,
               'sources': {'declared': ['lfv', 'openaip', 'mora', 'xplane'], 'present': ['openaip']}, 'has': {}},
        'us': {'cycle': 'not a date', 'parserVersion': None, 'counts': {'aerodromes': '<img src=x onerror=window.__pwn=1>', 'navaids': -5, 'points': 0, 'airways': 0, 'airspaces': 9230, 'vrp': 0, 'fir': 0}, 'procedures': 2257, 'ground': 0,
               'sources': {'declared': ['faa'], 'present': []}, 'has': {}},
        'ZZ!': {'cycle': None, 'counts': {}, 'sources': {}, 'has': {}}}})
    st = _launcher(c, [cov_ok], verbs=_VERBS + ['base/coverage'])
    st['status'] = _ALL_OK()
    cfg, _ = _fixture()
    _open(c, _sized(cfg))
    _all_open(c)
    c.until("[...document.querySelectorAll('[data-state-sentence] [data-filter]')].reduce((a, b) => a + parseInt(b.textContent, 10), 0) === 5", timeout=8000, what='the opening is over')
    c.eq(c.js("document.querySelector('[data-covtable]').open"), False, 'the block is folded', what='folded')
    for _ in range(50):   # the read of the map follows the state read: wait for it, never a fixed delay
        if _posts(st, 'coverage'):
            break
        c.wait(150)
    c.wait(600)
    c.eq(len(_posts(st, 'coverage')), 1, 'the block reads nothing itself until it is opened; the world map read base/coverage once at the opening for its hatch (procSources, SOG-0264)', what='one read by the map')
    c.eq(norm(c.text('[data-covtable] > summary')), norm(T('title')), 'named in the language of the run', what='title')
    c.js("document.querySelector('[data-covtable]').open = true")
    c.until("document.querySelectorAll('[data-cov-zone]').length === 3", timeout=10000, what='the table')
    c.eq([[p['set'], p['verb'], p['args']] for p in _posts(st, 'coverage')], [['base', 'coverage', {}]], 'one read, no argument', what='one read')
    c.eq(c.count('[data-cov-table] thead th'), 7, 'seven columns: the country and six', what='columns')
    c.eq(c.js("[...document.querySelectorAll('[data-cov-table] thead button')].map(b => b.dataset.covSort)"), ['zone', 'points', 'airways', 'airspaces', 'fir', 'procedures', 'ground'], 'country, points, airways, airspaces, FIR, procedures, ground', what='headings')
    c.eq(c.js("[...document.querySelectorAll('[data-cov-zone]')].map(r => r.dataset.covZone).sort()"), ['es', 'fr', 'us'], 'the zone with a bad identifier is dropped', what='rows')
    cellv = lambda z, col: c.js(f"document.querySelector('[data-cov-zone={z}] td[data-col={col}]').dataset.n")
    c.eq([cellv('fr', 'points'), cellv('fr', 'airways'), cellv('fr', 'fir'), cellv('fr', 'procedures'), cellv('fr', 'ground')], ['4277', '1493', '15', '6', '1'], 'the counts of France', what='fr counts')
    c.eq([norm(c.text('[data-cov-zone=es] td[data-col=points]')), norm(c.text('[data-cov-zone=es] td[data-col=fir]'))], [norm(T('no')), norm(T('no'))], 'a count of 0 is « non »', what='non')
    c.ok(cellv('us', 'airspaces') == '9230' and c.count('[data-covtable] img') == 0 and c.js('window.__pwn === undefined'), None, 'a text where a number is expected counts as 0: no element, nothing runs')
    c.ok(c.js("(() => { const e = document.querySelector('.d-covscroll'); return e.scrollWidth <= e.clientWidth + 1 })()"), c.js("[document.querySelector('.d-covscroll').scrollWidth, document.querySelector('.d-covscroll').clientWidth]"), 'the seven columns fit the width: no sideways scroll to find the last one')
    c.js("document.querySelector('[data-covtable]').scrollIntoView()")
    if c.width in (390, 1280):
        c.shot(f'L67_standard_{c.width}_{lang}_delivered.png')
    # ---- sort: the same button reverses; numbers go down first
    order = lambda: c.js("[...document.querySelectorAll('[data-cov-zone]')].map(r => r.dataset.covZone)")
    c.tap('[data-cov-sort=airspaces]')
    c.until("document.querySelector('[data-cov-sort=airspaces]').closest('th').getAttribute('aria-sort') === 'descending'", timeout=4000, what='sorted down')
    c.eq(order(), ['us', 'fr', 'es'], 'airspaces, most first: 9 230, 2 559, 380', what='sort down')
    c.tap('[data-cov-sort=airspaces]')
    c.until("document.querySelector('[data-cov-sort=airspaces]').closest('th').getAttribute('aria-sort') === 'ascending'", timeout=4000, what='sorted up')
    c.eq(order(), ['es', 'fr', 'us'], 'the same heading again reverses', what='sort up')
    # ---- a country unfolds: its sources with the catalogue's licence, those not read yet
    c.tap('[data-cov-row=es]')
    c.until("!!document.querySelector('[data-cov-detail=es]')", timeout=4000, what='the detail of Spain')
    c.eq(c.js("document.querySelector('[data-cov-row=es]').getAttribute('aria-expanded')"), 'true', 'the country says it is open', what='expanded')
    c.eq(c.js("[...document.querySelectorAll('[data-cov-detail=es] [data-cov-source]')].map(l => l.dataset.covSource)"), ['openaip'], 'the sources read', what='sources')
    c.ok(c.count('[data-cov-detail=es] [data-cov-notyet]') == 1 and 'lfv' in c.js("document.querySelector('[data-cov-detail=es] [data-cov-notyet]').textContent.toLowerCase()"), None, 'LFV is declared but not read yet: said (X-Plane and MORA, listed for every zone, are not)')
    c.tap('[data-cov-row=fr]')
    c.until("!!document.querySelector('[data-cov-detail=fr]')", timeout=4000, what='the detail of France')
    c.eq(c.js("[...document.querySelectorAll('[data-cov-detail=fr] [data-cov-source]')].map(l => l.dataset.covSource)"), ['dircam', 'openaip', 'sia'], 'an identifier outside the closed list (« evil ») is ignored', what='closed list')
    # ---- unreadable answer: said, « Relire » asks again
    c.js("document.querySelector('[data-covtable]').open = false")
    c.until("!document.querySelector('[data-covtable]').open", timeout=4000, what='folded again')
    st['views'], st['i'] = [_view('error', step='Échec', jid='jx', result={'ok': False})], 0
    c.js("document.querySelector('[data-covtable]').open = true")
    c.until("!!document.querySelector('[data-cov-state=unread]')", timeout=10000, what='unread')
    c.eq(norm(c.text('[data-cov-state=unread]')), norm(T('unread')), 'said in words', what='unread text')
    st['views'], st['i'] = [cov_ok], 0
    c.tap('[data-cov-reload]')
    c.until("document.querySelectorAll('[data-cov-zone]').length === 3", timeout=10000, what='the table after « Relire »')
    c.check_errors()


@case('L68', 'Données: a pack that has countries in the coverage carries « Mettre à jour (n) »: the update path on those countries only, the coverage untouched, at most one question (SOG-0188)', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=True, night=False,
      rule='SOG-0188 (the user: « pour rafraîchir europe de l\u2019ouest, on déselectionne tous les pays, on clique europe de l\u2019ouest, une popup nous prévient qu\u2019on accepte, et on resélectionne… »): the row of a pack with countries in the coverage has « Mettre à jour (n) »; it runs fetch, state, then the one question about the zones to rebuild, on the pack\u2019s countries in the coverage only, without touching what is ticked')
def l68(c):
    lang = c.lang
    UP = lambda key: _trow(key, lang, after='  upd: {')
    fetched = _view('done', step='Terminé', jid='j1', result={'fetched': ['fr'], 'unchanged': ['gb'], 'failed': [], 'manual': []})
    st = _launcher(c, [fetched], verbs=_VERBS)
    st['status'] = _status({'ca': _zst('up-to-date'), 'es': _zst('up-to-date'), 'fr': _zst('stale', _NEWER), 'gb': _zst('up-to-date'), 'us': _zst('up-to-date')})
    cfg = _packs_cfg()
    _open(c, cfg)
    _all_open(c)
    c.until("!!document.querySelector('[data-packs]') && [...document.querySelectorAll('[data-state-sentence] [data-filter]')].reduce((a, b) => a + parseInt(b.textContent, 10), 0) === 5", timeout=8000, what='the packs and the states')
    # SOG-0262: « Mettre à jour (n) » is on the line of the pack in the list of the packs, shown when the pack is opened (one at a time)
    btn = lambda p: f'[data-group-id={p}] [data-act=update-pack]'

    def open_pack(p):
        if c.js(f"document.querySelector('[data-group-id={p}] [data-act=grp-toggle]').getAttribute('aria-expanded')") != 'true':
            c.tap(f'[data-group-id={p}] [data-act=grp-toggle]')
        c.until(f"!!document.querySelector('[data-group-id={p}] [data-group-body]')", what=f'the pack {p} is open')
    open_pack('ouest')
    c.eq(c.count(btn('ouest')), 1, 'a button on the pack that has countries in the coverage (fr, gb)', what='button ouest')
    open_pack('asie')
    c.eq([c.count(btn('asie')), c.count(btn('ouest')), c.count('[data-group-id=antarctique]')], [0, 0, 0], 'none on a pack that has none in the coverage (jp, de); one pack open at a time; an empty pack is not listed', what='buttons')
    open_pack('ouest')
    c.eq(norm(c.text(btn('ouest'))), norm(UP('updatePack').replace('{n}', '2')), 'it says how many countries it will update: « Mettre à jour (2) »', what='label')
    before = _cov_count(c)
    n0 = len(st['posts'])
    c.tap(btn('ouest'))
    q = _ask_text(c)
    posts = st['posts'][n0:]
    c.eq([[p['verb'], sorted(p['args']['zones'])] for p in posts if p['verb'] == 'fetch'], [['fetch', ['fr']]], 'the download concerns the countries of the pack that are in the coverage and not up to date, no other (SOG-0180)', what='fetch zones')
    c.ok('fr' in norm(q['text']).lower() or len(q['text']) > 0, q['text'][:200], 'ONE question follows, about the zones to rebuild')
    c.eq(_cov_count(c), before, 'the coverage did not move', what='coverage kept')
    c.eq(c.count('.f-modal'), 1, 'one question', what='one question')
    c.tap('.f-modal [data-no]')
    c.until("!document.querySelector('.f-modal')", timeout=6000, what='the window closes')
    c.eq([p['verb'] for p in st['posts'][n0:] if p['verb'] == 'build'], [], 'No: nothing is built', what='no build')
    c.eq(_cov_count(c), before, 'and the coverage is still the same', what='coverage kept after No')
    c.shot(f"L68_standard_{c.page.viewport_size['width']}_{lang}_delivered.png")
    c.check_errors()


@case('L69', 'Données: a set with mixed cycles says « en partie à jour : n en 2611, m en 2610 » (never « à jour »); a zone that waits for a file shows the step-by-step of its source — the direct link, the exact file name, what it brings, then the button (SOG-0191, SOG-0189)', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=True, night=False,
      rule='SOG-0191 (the VFR build of 10 Nov replaced 418 terrains by 28 and the row still said « à jour »): publication().vfr.partial puts the row in the state « partial » with the parts by cycle; SOG-0189 (AeroCatalogue.stepsOf): on the line of a zone that waits for a file, the direct link of the page (the home page as a fallback), the file to take, what it gives, the button')
def l69(c):
    lang = c.lang
    TS = lambda key: _trow(key, lang, after='  steps: {')
    TP = lambda key: _trow(key, lang, after='  partial: {')
    cfg, (today, cur, prev, nxt) = _fixture()
    cfg['publication']['vfr'] = {'cycle': prev.isoformat(), 'at': today.isoformat() + 'T00:00:00Z', 'count': 418, 'cycles': {cur.isoformat(): 28, prev.isoformat(): 385}, 'unknown': 5, 'partial': True}
    st = _launcher(c, [], verbs=_VERBS + ['base/pickup'])
    st['status'] = _status({'ca': _zst('up-to-date'), 'es': _zst('up-to-date'), 'fr': _zst('up-to-date'), 'us': _zst('up-to-date'),
                            'gb': _zst('stale', {'code': 'pickup-waiting', 'source': 'nats', 'set': 'AIP', 'cycle': '2026-11-26', 'zip': 'x.zip'}, buildable=False)})
    _open(c, _sized(cfg))
    _all_open(c)
    c.until("[...document.querySelectorAll('[data-state-sentence] [data-filter]')].reduce((a, b) => a + parseInt(b.textContent, 10), 0) === 5", timeout=8000, what='the five pills')
    # ---- SOG-0191: the VAC row
    c.eq(_open_and_state(c, 'vac'), 'partial', 'the row is « partial », not « ok » nor only « out of date »', what='state')
    text = norm(c.js("document.querySelector('[data-set=vac]').textContent"))
    parts = [(n, cyc) for n, cyc in re.findall(r'(\d+) \S+ (\d{4})\b', text)]
    c.ok(('28' in dict(parts).keys() or any(n == '28' for n, _ in parts)) and any(n == '385' for n, _ in parts), text[:300], 'the row says the parts by cycle: 28 in the current one, 385 in the previous one')
    c.ok(norm(TP('line').split('{parts}')[0]) in text, text[:300], 'worded « en partie à jour : … » in the language of the run')
    c.ok(norm(TP('unknown').replace('{n}', '5')) in text, text[:300], 'and the 5 terrains of unknown cycle')
    # ---- SOG-0189: the step-by-step on the line of the zone that waits for a file
    steps = c.js("() => { const s = AeroCatalogue.stepsOf('nats', '2026-11-26'); return s && { page: s.page, files: s.files.map(f => ({ name: f.name, url: f.url || '' })) } }")
    c.ok(steps and steps['files'], steps, 'the catalogue has a step-by-step for NATS')
    _unfold(c, 'gb')
    box = '[data-zone-row=gb] [data-pickup-steps]'
    c.until(f"!!document.querySelector('{box}')", timeout=6000, what='the step-by-step on the line of the United Kingdom')
    links = c.js(f"[...document.querySelectorAll('{box} a')].map(a => [a.getAttribute('href'), a.target, a.rel])")
    c.eq(links[0], [steps['page']['url'], '_blank', 'noopener noreferrer'], 'the first link is the DIRECT link of the page, opened in a new tab', what='page link')
    c.ok(any(norm(f['name']) in norm(c.text(box)) for f in steps['files']), c.text(box)[:300], 'the exact name of the file is written')
    c.ok(c.js(f"document.querySelector('{box} > li').hasAttribute('data-step-page')"), None, 'the page comes first')
    last = c.js(f"[...document.querySelectorAll('{box} > li')].pop().hasAttribute('data-step-then')")
    c.ok(last, None, 'then the last step points at the button of the line')
    c.ok(c.count('[data-zone-row=gb] [data-verb=pickup]') == 1 and c.count('[data-zone-row=fr] [data-pickup-steps]') == 0, None, 'the button is on the line, and a zone that waits for nothing has no steps')
    c.js("document.querySelector('[data-zone-row=gb]').scrollIntoView({ block: 'center' })")
    if c.width in (390, 1280):
        c.shot(f'L69_standard_{c.width}_{lang}_delivered.png')
    c.check_errors()


@case('L70', 'Données: « Choisir le fichier… » on the line of a zone that waits for a file sends the chosen file to the launcher (POST base/upload, raw bytes, the name encoded), says what the launcher recognised, then runs the normal pickup; every refusal is said in words (SOG-0199)', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=True, night=False,
      rule='SOG-0199 (the user: « AIP_offline.zip est bien téléchargé pour la suède, mais pas récupéré »): beside « Prendre le fichier téléchargé », « Choisir le fichier… » opens the system chooser and sends the file (ctx.launcher.upload, XMLHttpRequest: progress, cancel); the launcher recognises it by its content and puts it where the pickup reads; the page then follows the usual path (the plan of base/pickup, the pickup, the build); a refusal (closed list of reasons) is said in words')
def l70(c):
    lang = c.lang
    UP = lambda key: _trow(key, lang, after='  up: {')
    st = _launcher(c, [_pk_plan([], [], [], jid='k1')], verbs=_VERBS + ['base/pickup'])   # the plan finds nothing to take: no question, the buttons are free again
    st['start'] = (200, {'job': 'k1'})
    st['status'] = _status({'ca': _zst('up-to-date'), 'es': _zst('up-to-date'), 'fr': _zst('stale', _NEWER), 'us': _zst('up-to-date'),   # France is stale and buildable: « Mettre à jour » has something to do, so it is drawn
                            'gb': _zst('stale', {'code': 'pickup-waiting', 'source': 'nats', 'set': 'AIP', 'cycle': '2026-11-26', 'zip': 'x.zip'}, buildable=False)})
    sent = []
    answer = {'status': 200, 'body': {'ok': True, 'source': 'nats', 'zone': 'gb', 'name': 'EG_AIP_DS_20261126_XML.zip', 'size': 5004, 'replaced': True, 'sha256': 'ab' * 32}}

    hold = {'on': False, 'routes': []}

    def upload(route):
        req = route.request
        if hold['on']:   # the answer is held: the upload is « in progress » for the screen
            hold['routes'].append(route)
            return
        sent.append({'method': req.method, 'headers': {k.lower(): v for k, v in req.headers.items()}, 'size': len(req.post_data_buffer or b'')})
        route.fulfill(status=answer['status'], content_type='application/json', body=json.dumps(answer['body']))
    c.context.route(re.compile(r'/__setup/base/upload'), upload)
    cfg, _ = _fixture()
    _open(c, _sized(cfg))
    _all_open(c)
    _ready(c, 5)
    _unfold(c, 'gb')
    btn = '[data-zone-row=gb] [data-act=zone-upload]'
    c.until(f"!!document.querySelector('{btn}')", timeout=8000, what='the button on the line of the waiting zone')
    c.eq([norm(c.text(btn)), c.count('[data-zone-row=fr] [data-act=zone-upload]'), c.js(f"document.querySelector('{btn}').disabled")], [norm(UP('choose')), 0, False], 'named in the language of the run, on the waiting zone only, live', what='button')
    pick = lambda name='AIP OFFLINE é.zip', size=5000: (c.page.expect_file_chooser(), name, size)

    def choose(name='AIP OFFLINE é.zip', size=5000):
        with c.page.expect_file_chooser() as fc:
            c.js(f"document.querySelector('{btn}').click()")   # a toast of the previous answer may cover the button
            pass
        fc.value.set_files({'name': name, 'mimeType': 'application/zip', 'buffer': b'PK\x03\x04' + b'x' * (size - 4)})
    # ---- recognised: the bytes are sent as they are, the name encoded; then the normal pickup (its plan) follows
    n0 = len(st['posts'])
    choose()
    c.until("window.__notes && window.__notes.length > 0" if False else "true", timeout=2000, what='sent')
    for _ in range(40):
        if sent:
            break
        c.wait(250)
    c.eq([sent[0]['method'], sent[0]['headers'].get('content-type'), sent[0]['size']], ['POST', 'application/octet-stream', 5000], 'a POST of the raw bytes, octet-stream', what='request')
    c.eq(sent[0]['headers'].get('x-sog-name'), urllib.parse.quote('AIP OFFLINE é.zip', safe="-_.!~*'()"), 'the name is only a hint, URL-encoded (spaces and accents survive)', what='name header')
    c.ok('x-sog-setup' in sent[0]['headers'], sorted(sent[0]['headers']), 'with the header of this workstation')
    done = norm(UP('done').split('{s}')[0].replace('{name}', 'EG_AIP_DS_20261126_XML.zip'))
    for _ in range(30):
        if _notes_with(c, done):
            break
        c.wait(250)
    c.ok(bool(_notes_with(c, done)), None, 'the launcher’s answer is said: the file it put away, its source and its zone')
    for _ in range(40):
        if _posts(st, 'pickup'):
            break
        c.wait(250)
    c.eq([{k: p['args'].get(k) for k in ('zones', 'dry')} for p in _posts(st, 'pickup')[:1]], [{'zones': ['gb'], 'dry': True}], 'then the usual path: the plan of the pickup for the recognised zone', what='pickup plan')
    if c.width in (390, 1280):
        c.js("document.querySelector('[data-zone-row=gb]').scrollIntoView({ block: 'center' })")
        c.shot(f"L70_standard_{c.width}_{lang}_delivered.png")
    c.wait(2500)   # the plan of the pickup ends (nothing to take): the buttons are free again
    # ---- an upload in progress: the line says it (bar, name), every other gesture is grey, « Annuler » stops it and says so
    c.until(f"!document.querySelector('{btn}').disabled", timeout=8000, what='the button is live')
    hold['on'] = True
    choose('long.zip', 4000)
    c.until("!!document.querySelector('[data-zone-row=gb] [data-uploading]')", timeout=8000, what='the upload line')
    c.eq([norm(c.text('[data-zone-row=gb] [data-up-text]')).startswith('long.zip'), c.js("document.querySelector('[data-zone-row=gb] [data-act=zone-upload]').disabled"), c.js("document.querySelector('[data-zone-row=gb] [data-verb=pickup]').disabled"), c.js("document.querySelector('[data-build] [data-verb=update]').disabled")], [True, True, True, True], 'the line shows the upload; « Choisir », « Prendre » and « Mettre à jour » are grey while it lasts (one at a time)', what='in progress')
    c.js("document.querySelector('[data-zone-row=gb] [data-act=upload-cancel]').click()")
    for _ in range(30):
        if _notes_with(c, norm(UP('aborted'))):
            break
        c.wait(250)
    c.ok(bool(_notes_with(c, norm(UP('aborted')))), None, '« Annuler » stops the sending and says so')
    c.eq(c.count('[data-uploading]'), 0, 'the line of the upload is gone', what='line gone')
    hold['on'] = False
    # ---- refusals, each in words and each without a pickup
    for status, reason, extra, key in ((422, 'unrecognised', {'expected': ['sia', 'nats']}, 'unrecognised'), (409, 'busy', {}, 'busy'), (415, 'type', {}, 'type'), (413, 'too-large', {}, 'too-large'), (507, 'disk', {}, 'disk')):
        answer.update({'status': status, 'body': {'ok': False, 'reason': reason, 'message': 'x', **extra}})
        want = norm(UP(key).split('{s}')[0])
        n_before = len(_posts(st, 'pickup'))
        c.until(f"!document.querySelector('{btn}').disabled", timeout=8000, what='the button is live again')
        choose()
        for _ in range(30):
            if _notes_with(c, want):
                break
            c.wait(250)
        c.ok(bool(_notes_with(c, want)), reason, f'{reason}: said in words')
        c.eq(len(_posts(st, 'pickup')), n_before, f'{reason}: no pickup follows a refusal', what=f'no pickup after {reason}')
    # ---- the same file already there: said, nothing rewritten
    answer.update({'status': 200, 'body': {'ok': True, 'source': 'nats', 'zone': 'gb', 'name': 'EG_AIP_DS_20261126_XML.zip', 'size': 5000, 'replaced': False}})
    c.until(f"!document.querySelector('{btn}').disabled", timeout=8000, what='the button is live again')
    choose()
    same = norm(UP('same').split('{name}')[0] + 'EG_AIP_DS_20261126_XML.zip')
    for _ in range(30):
        if _notes_with(c, 'EG_AIP_DS_20261126_XML.zip'):
            break
        c.wait(250)
    c.ok(bool(_notes_with(c, 'EG_AIP_DS_20261126_XML.zip')), None, 'a file already there: said, with its name')
    c.check_errors()


# The REAL shape of a download where a source answers 403 (AeroDB, 10 Nov 2026, the launcher's own views): the zone is `failed` with `error: 'http'` and, per source, `status: 403`;
# `result.reason` stays « partial » even when nothing at all was taken (« failed » only when the job itself fails).
_F403 = lambda: _fview({
    'fr': _fz('done', 2, 2, {'sia': {'state': 'downloaded', 'files': 2, 'bytes': 354}}),
    'gb': _fz('failed', 2, 2, {'nats': {'state': 'manual', 'error': 'manual'}, 'ukmil': {'state': 'failed', 'error': 'http', 'status': 403}, 'openaip': {'state': 'downloaded', 'files': 2, 'bytes': 354}}, error='http'),
    'us': _fz('failed', 3, 3, {'faa': {'state': 'failed', 'error': 'http', 'status': 403}, 'faaclass': {'state': 'failed', 'error': 'http', 'status': 403}, 'openaip': {'state': 'skipped', 'error': 'absent'}}, error='http')},
    state='error', step='Échec', done=3, total=3,
    result={'ok': False, 'fetched': ['fr'], 'unchanged': [], 'failed': [{'zone': 'gb', 'source': 'ukmil', 'error': 'http', 'status': 403}, {'zone': 'us', 'source': 'faa', 'error': 'http', 'status': 403}, {'zone': 'us', 'source': 'faaclass', 'error': 'http', 'status': 403}], 'manual': [], 'reason': 'partial'})


@case('L71', 'Données: « Mettre à jour » with a source that answers 403 (the real shape of the launcher\u2019s view): the other zones go on (state read, question, build), the failed zone says why on its line with « Réessayer » (SOG-0180 reopened)', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=True, night=False,
      rule='SOG-0180 reopened (the user, 10 Nov 16:25: « le téléchargement NASR répond 403, ça bloque la mise à jour qui s\u2019arrête dessus »): a download that fails for one zone never stops the others — the state is read, the question names the zones to rebuild, the build goes; the failed zone carries its reason (« la source a refusé le téléchargement (403) ») and « Réessayer » replays ITS download only')
def l71(c):
    lang = c.lang
    st = _launcher(c, [_F403()], verbs=_VERBS)
    st['status'] = _status({'ca': _zst('up-to-date'), 'es': _zst('up-to-date'), 'fr': _zst('stale', _NEWER), 'gb': _zst('up-to-date'),
                            'us': _zst('stale', {'code': 'source-old', 'source': 'faa', 'cycle': '2026-10-01', 'current': '2026-11-26'}, buildable=False)})
    cfg, _ = _fixture()
    _open(c, _sized(cfg))
    _all_open(c)
    c.until("[...document.querySelectorAll('[data-state-sentence] [data-filter]')].reduce((a, b) => a + parseInt(b.textContent, 10), 0) === 5", timeout=8000, what='the five pills')
    c.tap('[data-build] [data-verb=update]')
    q = _ask_text(c)
    c.ok(len(q['text']) > 0 and 'France' in q['text'] if lang == 'fr' else len(q['text']) > 0, q, 'the download of one zone failed (403): the update goes on, the question names the zone to rebuild')
    c.eq([p['verb'] for p in st['posts'] if p['verb'] in ('fetch', 'build')], ['fetch'], 'and nothing is built before the answer', what='posts')
    # the bilan counts ZONES that failed (gb, us), not the sources (ukmil, faa, faaclass)
    two = norm(_trow('fetchFails', lang, after='  fetchChanged: [', row=1).replace('{n}', '2'))
    c.ok(bool(_notes_with(c, two)), two, 'the bilan of the download counts two zones that failed (gb, us), not three sources')
    c.tap('.f-modal [data-no]')
    c.until("!document.querySelector('.f-modal')", timeout=6000, what='the question closes')
    _unfold(c, 'us')
    c.until("!!document.querySelector('[data-zone-action=us][data-fetch-failed]')", timeout=8000, what='the failed zone says why on its line')
    why = norm(c.text('[data-zone-action=us][data-fetch-failed] .f-muted'))
    c.ok('faa' in why.lower() and '403' in why and norm(_trow('refused', lang, after='  fetchError: {').split('{src}')[1].split('({s})')[0]) in why, why, 'the line of the zone names the source and what it answered: « FAA : download refused (403) », not a bare « HTTP answer »')
    c.eq(c.count('[data-zone-action=us][data-fetch-failed] button[data-verb=retry-fetch]'), 1, 'with « Réessayer » on that line', what='retry button')
    # the FAA refuses the automatic download: the line of « us » offers « Choisir le fichier… » and the direct link to the three NASR sets; the line of gb (another source) does not
    UP = lambda key: _trow(key, lang, after='  up: {')
    c.eq([c.count('[data-zone-action=us] [data-act=zone-upload]'), norm(c.text('[data-zone-action=us] [data-act=zone-upload]')), c.count('[data-zone-action=gb] [data-act=zone-upload]')],
         [1, norm(UP('choose')), 0], '« Choisir le fichier… » on the line of the zone whose FAA download was refused, not on the other failed zone', what='choose file')
    c.eq(c.js(r"""[...document.querySelectorAll('[data-nasr-hint] a')].map(a => a.getAttribute('href').replace(/\d{4}-\d{2}-\d{2}\/$/, ''))"""), ['https://www.faa.gov/air_traffic/flight_info/aeronav/aero_data/NASR_Subscription/'], 'with the link of the NASR page of the cycle (the catalogue gives it, dated)', what='nasr link')
    c.eq(c.js("document.querySelector('[data-nasr-hint] code').textContent.startsWith('28DaySubscription_Effective_')"), True, 'and says the ONE file of the subscription (not three sets)', what='nasr one file')
    zl = norm(c.text('[data-zone-state=us]'))
    c.ok('403' in zl and 'faa' in zl.lower(), zl, 'the result of the download says the same for the zone')
    if c.width in (390, 1280):
        c.js("document.querySelector('[data-zone-action=us]').scrollIntoView({ block: 'center' })")
        c.shot(f"L71_standard_{c.width}_{lang}_delivered.png")
    n_fetch = len(_posts(st, 'fetch'))
    c.tap('[data-zone-action=us] button[data-verb=retry-fetch]')
    for _ in range(40):
        if len(_posts(st, 'fetch')) > n_fetch:
            break
        c.wait(250)
    c.eq([sorted(p['args']['zones']) for p in _posts(st, 'fetch')[n_fetch:n_fetch + 1]], [['us']], '« Réessayer » replays the download of that zone alone', what='retry body')
    c.check_errors()


_ZDL = lambda z, done: {**z, 'download': {'done': done, 'cycle': '2026-11-26', 'at': '2026-11-27T08:00:00Z' if done else None}}


@case('L72', 'Données: « Mettre à jour » only does what is not up to date — the state is read BEFORE the download: up-to-date zones are skipped, zones whose sources of the cycle are already there are only rebuilt, a line says what is going to be done (SOG-0180)', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=True, night=False,
      rule='SOG-0180 (the user, 10 Nov 16:55: « la mise à jour, qui a quelques items en échec, reprend de 0 dès qu\u2019on « met à jour », alors que c\u2019est déjà vert… ne reprendre que la suite de la màj »): per zone, from base/status — up to date: skipped; `download.done` (the sources of the cycle are there): no new download, the build only; download to do: that one alone; a line before the start says « 1 zone à télécharger, 3 à reconstruire, 2 déjà à jour »')
def l72(c):
    lang = c.lang
    U = lambda key: _trow(key, lang, after='  upd: {')
    stale = lambda reason, done, **kw: _ZDL(_zst('stale', reason, **kw), done)
    parser = {'code': 'parser-old', 'built': 22, 'current': 23}
    old = {'code': 'source-old', 'source': 'faa', 'cycle': '2026-10-01', 'current': '2026-11-26'}
    st = _launcher(c, [_view('done', step='Terminé', jid='j1', result={'fetched': ['us'], 'unchanged': [], 'failed': [], 'manual': []})], verbs=_VERBS)
    st['status'] = _status({'ca': _ZDL(_zst('up-to-date'), True), 'es': _ZDL(_zst('up-to-date'), True), 'fr': stale(_NEWER, True), 'gb': stale(parser, True), 'us': stale(old, False)})
    cfg, _ = _fixture()
    _open(c, _sized(cfg))
    _all_open(c)
    c.until("[...document.querySelectorAll('[data-state-sentence] [data-filter]')].reduce((a, b) => a + parseInt(b.textContent, 10), 0) === 5", timeout=8000, what='the five pills')
    fetches = lambda: [sorted(p['args']['zones']) for p in _posts(st, 'fetch')]
    # ---- a first update: only the zone whose download is not done is downloaded; the line before the start says what is going to be done
    n0 = len(st['posts'])
    c.tap('[data-build] [data-verb=update]')
    q = _ask_text(c)
    plan = ', '.join([norm(U('planDl').replace('{z}', _zones_text(lang, 1))), norm(U('planBuild').replace('{z}', _zones_text(lang, 3))), norm(U('planOk').replace('{z}', _zones_text(lang, 2)))])
    c.ok(bool(_notes_with(c, plan)), plan, 'a line says what is going to be done: one to download, three to rebuild, two already up to date')
    c.eq(fetches(), [['us']], 'only the zone whose sources of the cycle are not there is downloaded; the four others are not', what='first fetch')
    c.eq([p['verb'] for p in st['posts'][n0:] if p['verb'] in ('status', 'fetch')][:2], ['status', 'fetch'], 'the state is read before the download', what='order')
    c.ok('France' in q['text'] or lang != 'fr', q['text'][:200], 'then the question names the zones to rebuild')
    if c.width in (390, 1280):
        c.shot(f"L72_standard_{c.width}_{lang}_delivered.png")
    c.tap('.f-modal [data-no]')
    # ---- a second update, once the downloads are done (the launcher says so): nothing is downloaded again, the question comes at once
    st['status'] = _status({'ca': _ZDL(_zst('up-to-date'), True), 'es': _ZDL(_zst('up-to-date'), True), 'fr': stale(_NEWER, True), 'gb': stale(parser, True), 'us': stale(old, True)})
    c.until("!document.querySelector('[data-build] [data-verb=update]').disabled", timeout=8000, what='the update button is live again')
    c.tap('[data-build] [data-verb=update]')
    _ask_text(c)
    c.eq(fetches(), [['us']], 'a second update downloads nothing: the sources of every zone are there, only the build is asked', what='second fetch')
    c.tap('.f-modal [data-no]')
    # ---- everything up to date: nothing downloaded, nothing asked, said
    st['status'] = _status({z: _ZDL(_zst('up-to-date'), True) for z in ('ca', 'es', 'fr', 'gb', 'us')})
    c.until("!document.querySelector('[data-build] [data-verb=update]').disabled", timeout=8000, what='the update button is live again')
    c.tap('[data-build] [data-verb=update]')
    none = norm(U('none').replace('{n}', _zones_text(lang, 5)))
    for _ in range(30):
        if _notes_with(c, none):
            break
        c.wait(250)
    c.ok(bool(_notes_with(c, none)), none, 'all green: said, no download, no question')
    c.eq([fetches(), c.count('.f-modal')], [[['us']], 0], 'still the one download of the first update', what='nothing more')
    c.check_errors()


@case('L73', 'Données: « Mettre à jour » on a coverage of 78 zones reads the state of ALL of them (60 at most per read): the 18 zones with the old parser are asked to be rebuilt although the FAA answers 403 (SOG-0180 reopened)', 'L', tags=('data',),
      designs=('standard',), screens=False, night=False,
      rule='SOG-0180 reopened (the user: « mise à jour qui s’arrête sur le 403 de la FAA », 18 zones left at the old parser, 1 failed, none proposed): the state was read for the first 60 zones only (ids.slice(0, 60)), the others were « unknown » and never proposed to the build; the state is now read by runs of 60 and merged')
def l73(c):
    st = _launcher(c, [_F403()], verbs=_VERBS)
    st['by_args'] = True
    cfg, _ = _fixture()
    extra = [f'q{i:02d}' for i in range(73)]
    for z in extra:
        cfg['zones'].append({'id': z, 'names': [z.upper()] * 4, 'frames': [], 'published': True})
        cfg['publication']['base'][z] = cfg['publication']['base']['ca']
    old = {'code': 'parser-old', 'built': 23, 'current': 28}
    zones = {z: _ZDL(_zst('up-to-date'), True) for z in ['ca', 'es', 'fr', 'gb'] + extra[:55]}
    zones['us'] = _ZDL(_zst('stale', {'code': 'source-old', 'source': 'faa', 'cycle': '2026-10-01', 'current': '2026-11-26'}), False)
    zones.update({z: _ZDL(_zst('stale', old), True) for z in extra[55:]})
    st['status'] = _status(zones)
    _open(c, _sized(cfg))
    _all_open(c)
    c.eq(_cov_count(c), 78, 'the coverage of 78 zones is ticked', what='78 ticked')
    c.until("[...document.querySelectorAll('[data-state-sentence] [data-filter]')].reduce((a, b) => a + parseInt(b.textContent, 10), 0) === 78", timeout=15000, what='the state of the 78 zones, read at the opening (60 then 18)')
    n0 = len(st['posts'])
    c.tap('[data-build] [data-verb=update]')
    q = _ask_text(c)
    lens = [len(p['args'].get('zones', [])) for p in st['posts'][n0:] if p['verb'] == 'status']
    c.eq(lens[:2], [60, 18], 'the state is read for the 78 zones, 60 then 18', what='status reads')
    c.ok(re.search('[^0-9]19[^0-9]', q['text']) is not None and re.search('[^0-9]78[^0-9]', q['text']) is not None, q['text'][:200], 'the question asks to rebuild 19 of the 78 zones: the 18 with the old parser and the United States, whose download was refused')
    c.eq([sorted(p['args']['zones']) for p in _posts(st, 'fetch')], [['us']], 'only the zone whose download is not done is downloaded', what='fetch')
    c.check_errors()


@case('L74', 'Données: the three NASR sets of the FAA chosen by hand (the download answers 403): each one is counted and what is missing is said; the third runs the download of the zone, which reads them, then its build (SOG-0180, AeroDB K153)', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=False, night=False,
      rule='AeroDB (K153): the NASR layer is produced by base/fetch (it reads the three files put in data/local/upload/), not by the build: after EACH recognised upload of source faa the screen counts the sets of the cycle; at the third it chains base/fetch { zones: [us] } then base/build when the faa source is downloaded; before, it says which set is missing')
def l74(c):
    lang = c.lang
    UP = lambda key: _trow(key, lang, after='  up: {')
    st = _launcher(c, [_F403()], verbs=_VERBS)
    st['status'] = _status({'ca': _zst('up-to-date'), 'es': _zst('up-to-date'), 'fr': _zst('up-to-date'), 'gb': _zst('up-to-date'),
                            'us': _zst('stale', {'code': 'source-old', 'source': 'faa', 'cycle': '2026-10-01', 'current': '2026-11-26'}, buildable=False)})
    sent = []

    def upload(route):
        name = urllib.parse.unquote(route.request.headers.get('x-sog-name', ''))
        sent.append(name)
        body = {'ok': True, 'source': 'faa', 'zone': 'us', 'cycle': '2026-10-29', 'name': name, 'replaced': True}
        if len(sent) > 1:   # the first answer is that of an older launcher (the screen counts); the next ones say what is deposited and missing (AeroDB 42aab1ae8)
            body.update({'deposited': ['FIX', 'AWY', 'NAV'][:len(sent)], 'missing': ['FIX', 'AWY', 'NAV'][len(sent):]})
        route.fulfill(status=200, content_type='application/json', body=json.dumps(body))
    c.context.route(re.compile(r'/__setup/base/upload'), upload)
    cfg, _ = _fixture()
    _open(c, _sized(cfg))
    _all_open(c)
    c.until("[...document.querySelectorAll('[data-state-sentence] [data-filter]')].reduce((a, b) => a + parseInt(b.textContent, 10), 0) === 5", timeout=8000, what='the five pills')
    c.tap('[data-build] [data-verb=update]')
    _unfold(c, 'us')
    btn = '[data-zone-action=us] [data-act=zone-upload]'
    c.until(f"!!document.querySelector('{btn}') && !document.querySelector('{btn}').disabled", timeout=8000, what='« Choisir le fichier… » on the line of the refused zone')
    fetches = lambda: [sorted(p['args']['zones']) for p in _posts(st, 'fetch')]
    c.eq(fetches(), [['us']], 'the update downloaded us once (refused)', what='fetch before')

    def choose(name):
        c.until(f"!document.querySelector('{btn}').disabled", timeout=8000, what='the button is live')
        c.js("document.querySelectorAll('#fNotes .f-note button').forEach(b => b.click())")   # a floating note must not cover the button (the log keeps what was said)
        c.js(f"document.querySelector('{btn}').scrollIntoView({{ block: 'center' }})")
        with c.page.expect_file_chooser() as fc:
            c.tap(btn)
        fc.value.set_files({'name': name, 'mimeType': 'application/zip', 'buffer': b'PK\x03\x04' + b'x' * 996})

    def said(have, miss):
        want = norm(UP('nasrWait').replace('{h}', have).replace('{m}', miss))
        for _ in range(30):
            if _notes_with(c, want):
                return True
            c.wait(250)
        return False
    choose('29_Oct_2026_FIX_CSV.zip')
    c.ok(said('FIX', 'AWY, NAV'), None, 'a first set: said, with what is missing')
    c.eq(fetches(), [['us']], 'and nothing is downloaded yet', what='fetch after one')
    choose('29_Oct_2026_AWY_CSV.zip')
    c.ok(said('FIX, AWY', 'NAV'), None, 'a second set: said, one is missing')
    c.eq(fetches(), [['us']], 'still nothing downloaded', what='fetch after two')
    # the third: the download of the zone reads the three, then the build
    fetch_ok = _fview({'us': _fz('done', 3, 3, {'faa': {'state': 'downloaded', 'files': 3, 'bytes': 900}})}, state='done', step='Terminé', done=1, total=1,
                      result={'ok': True, 'fetched': ['us'], 'unchanged': [], 'failed': [], 'manual': []})
    built = _view('done', step='Terminé', jid='j3', zones={'us': _zs('built', 4, 4, commit='abc1234')}, result={'built': ['us'], 'failed': [], 'commits': [{'zone': 'us', 'commit': 'abc1234'}], 'cycle': '2026-10-29', 'current': '2026-10-29', 'stale': False, 'blocking': []})
    st['views'], st['i'], st['start'] = [fetch_ok, built], 0, (200, {'job': 'j2'})
    choose('29_Oct_2026_NAV_CSV.zip')
    for _ in range(60):
        if _posts(st, 'build'):
            break
        c.wait(250)
    c.eq(fetches(), [['us'], ['us']], 'the third set: the download of us runs (it reads the three files)', what='fetch after three')
    c.eq([p['args']['zones'] for p in _posts(st, 'build')], [['us']], 'then the build of us', what='build')
    c.check_errors()


@case('L75', 'Données: the state of the zones is read with the SAME personal sources as the build sends — a zone built with a personal source is « à jour », not « à reconstruire » for ever; the box « Je certifie… » re-reads the state (SOG-0180, the user: « nonsense. qu’est-ce qui est vrai ? »)', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=True, night=False,
      rule='the user, 10 Nov 18:06 (a screen that says « À reconstruire » on Sweden and, just under, « Base construite : Suède construite »): base/status was asked with zones only; the launcher compares the build with the sources it is told are allowed (personal), so a zone built with LFV was « inputs-changed » for ever; the status carries `personal` = what the build sends (the box ticked: the personal sources of those zones; unticked: none), and is read again when the box changes')
def l75(c):
    lang = c.lang

    def status(args):   # the real launcher: a zone built with ENAIRE is up to date only when the status is told that ENAIRE may be read
        asked = args.get('personal') or []
        es = _zst('up-to-date') if 'enaire' in asked else _zst('stale', {'code': 'inputs-changed', 'count': 1, 'names': ['zones/es/enaire_es_enr.geojson']})
        return _status({'ca': _zst('up-to-date'), 'es': es, 'fr': _zst('up-to-date'), 'gb': _zst('stale', _NEWER), 'us': _zst('up-to-date')})   # Great Britain is stale whatever the personal sources: « Mettre à jour » always has something to do
    fetched = _view('done', step='Terminé', result={'fetched': ['gb'], 'unchanged': [], 'failed': [], 'manual': []})
    st = _launcher(c, [fetched], verbs=_VERBS)
    st['status'] = status
    st['by_args'] = True
    cfg, _ = _fixture()
    _open(c, _sized(cfg))
    _all_open(c)
    c.until("[...document.querySelectorAll('[data-state-sentence] [data-filter]')].reduce((a, b) => a + parseInt(b.textContent, 10), 0) === 5", timeout=8000, what='the five pills')
    states = lambda: list(_pills(c).values())
    asked = lambda: [p['args'].get('personal') for p in st['posts'] if p['verb'] == 'status']
    c.eq(asked()[0], [], 'the box is not ticked: the opening asks the state with no personal source', what='personal unticked')
    c.ok('stale' in states(), states(), 'and Spain, built with ENAIRE, is said stale (the launcher cannot read the personal file)')
    # ---- the box ticked: the same sources as the build, the state is read again, Spain is up to date
    n = len(st['posts'])
    _tap_certify(c)
    c.until(_SENT_UPTO % 4, timeout=8000, what='every zone but Great Britain up to date once the state is read with the personal sources')
    c.eq({z: v for z, v in _pills(c).items() if v != 'up-to-date'}, {'gb': 'stale'}, 'only Great Britain is left to rebuild', what='pills')
    ask2 = [p['args'].get('personal') for p in st['posts'][n:] if p['verb'] == 'status']
    c.ok(bool(ask2) and 'enaire' in ask2[-1], ask2, 'the state was read again with the personal sources the build would send (ENAIRE)')
    if c.width in (390, 1280):
        c.shot(f'L75_standard_{c.width}_{lang}_delivered.png')
    # ---- « Mettre à jour » reads the state with them too: only Great Britain is left to rebuild
    n = len(st['posts'])
    c.tap('[data-build] [data-verb=update]')
    for _ in range(40):
        if any(p['verb'] == 'status' for p in st['posts'][n:]):
            break
        c.wait(250)
    c.ok(all('enaire' in (p['args'].get('personal') or []) for p in st['posts'][n:] if p['verb'] == 'status'), [p['args'].get('personal') for p in st['posts'][n:] if p['verb'] == 'status'], '« Mettre à jour » reads the state with the same personal sources')
    q = _ask_text(c)
    c.ok('Espagne' not in q['text'] and 'Spain' not in q['text'] and 'Spanien' not in q['text'] and 'España' not in q['text'], q['text'], 'the question is asked for the zone that is left (Great Britain), never for Spain')
    c.tap('.f-modal [data-no]')
    c.check_errors()


@case('L76', 'Données: the minimum before the redesign (SOG-0228) — « Paquets de pays » is folded when the screen opens, a note says what « Zones de la couverture (n) » counts, and a tap on « n à reconstruire » unfolds those zones in place without ticking or scrolling (lot 1 of the redesign)', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=True, night=False,
      rule='SOG-0228 (the user: « j’ai « 68 à jour, 7 à reconstruire ». je clique sur le bouton, j’ai l’impression qu’il ne se passe rien… je ne sais pas quoi faire pour reconstruire ces 7 … replier « paquets de pays ». expliquer pourquoi « zone de la couverture » est suivi d’un « 75 » »): the packs are folded at the opening (and kept as the pilot leaves them); the count of the coverage is explained; since the lot 1 redesign a number of the sentence of the base panel (to rebuild, failed…) unfolds its zones in place, ticks nothing, does not scroll and leaves the list of the coverage whole')
def l76(c):
    lang = c.lang
    st = _launcher(c, [], verbs=_VERBS)
    st['status'] = _status({'ca': _zst('up-to-date'), 'es': _zst('up-to-date'), 'fr': _zst('stale', _NEWER), 'gb': _zst('stale', _NEWER), 'us': _zst('stale', _NEWER)})
    cfg = _packs_cfg()
    _open(c, cfg)
    _all_open(c)
    c.until("!!document.querySelector('[data-packs-fold]') && [...document.querySelectorAll('[data-state-sentence] [data-filter]')].reduce((a, b) => a + parseInt(b.textContent, 10), 0) === 5 && !!document.querySelector('[data-state-sentence] [data-filter]')", timeout=10000, what='the packs fold, the pills and the numbers of the sentence')
    # ---- (a) the packs are folded at the opening; opened by hand, they stay so
    c.eq(c.js("document.querySelector('[data-packs-fold]').open"), False, '« Paquets de pays » is folded when the screen opens', what='packs folded')
    c.eq(norm(c.text('[data-packs-fold] > summary')), norm(_trow('title', lang, after='  packs: {')), 'its summary is its title', what='packs summary')
    c.js("document.querySelector('[data-packs-fold]').open = true")
    c.tap('[data-state-sentence] [data-filter=rebuild]')      # a redraw of the panel
    c.eq(c.js("document.querySelector('[data-packs-fold]').open"), True, 'opened by hand: kept across a redraw', what='packs kept open')
    c.tap('[data-state-sentence] [data-filter=rebuild]')
    c.js("document.querySelector('[data-packs-fold]').open = false")
    c.eq(c.count('[data-zones-note]') + c.count('[data-zones-title]'), 0, 'the list « Zones de la couverture (n) » and its note are gone (SOG-0262: the coverage is the map and the packs)', what='no zones note')
    # ---- (b) a tap on « n à reconstruire » (lot 1 of the redesign): the zones unfold in place under the sentence; nothing is ticked, the page does not move, the list below stays whole
    y0 = c.js("Math.round(document.querySelector('[data-state-sentence]').getBoundingClientRect().top + window.scrollY)")
    c.tap('[data-state-sentence] [data-filter=rebuild]')
    c.until("document.querySelectorAll('[data-state-zones] [data-zone-row]').length === 3", timeout=6000, what='the three zones to rebuild unfold')
    c.eq(c.js("[...document.querySelectorAll('[data-state-zones] [data-zone-row]')].map(r => r.dataset.zoneRow)"), ['fr', 'gb', 'us'], 'the zones to rebuild are listed under the sentence', what='zones listed')
    c.eq([c.count('[data-build-zones]'), c.count('[data-filter-line]'), abs(c.js("Math.round(document.querySelector('[data-state-sentence]').getBoundingClientRect().top + window.scrollY)") - y0) <= 1], [0, 0, True], 'no lower list, no line to follow, the page did not scroll', what='no side effect')
    if c.width in (390, 1280):
        c.shot(f'L76_standard_{c.width}_{lang}_delivered.png')
    c.tap('[data-state-sentence] [data-filter=rebuild]')
    c.until("!document.querySelector('[data-state-zones]')", timeout=6000, what='the same number folds the list again')
    c.check_errors()


@case('L77', 'Données: « Publier » says what is true after a build (SOG-0230): the commits the build made are sent by the frame’s background pass, so there is nothing left (« Tout est déjà publié… ») and a publication whose commits were already made says what went, never « fichiers commités : 0 » alone', 'L',
      tags=('data',), langs4=True, designs=('standard',), screens=True, night=False,
      rule='SOG-0230 (the user: « on met à jour, on reconstruit, on publie : « 0 fichiers envoyés ». la suède, s’affiche construite, mais rien à publier »; the survey: the build commits « construite sur le poste » in data/, the pass of the frame pushes them, the last publication is the minute of the build): nothing to publish after a pass that pushed says « tout est déjà publié », a publication of commits already made says the commits that left')
def l77(c):
    lang = c.lang
    # ---- A: nothing left, the last pass pushed (the build's commits already left): said, with the time
    st = _pub_open(c, {'changes': 0, 'ahead': 0, 'merging': False, 'last': {'at': '2026-11-10T17:05:00Z', 'pushed': True}})
    s = _publish_state(c)
    clean = norm(_trow('pubClean', lang).split('{d}')[0])
    c.ok(s['state'] is not None and s['state'].startswith(clean) and '17:05Z' in s['state'], s['state'], 'everything is already published, at 17:05Z, with the build: said instead of a bare « Rien à publier »')
    c.eq([s['disabled'], s['reason']], [True, 'nothing'], 'and « Publier » stays grey for it', what='grey')
    if c.width in (390, 1280):
        c.js("document.querySelector('[data-publish]').scrollIntoView({ block: 'center' })")
        c.shot(f'L77_standard_{c.width}_{lang}_delivered.png')
    # ---- B: two commits already made by the build wait; the publication says what left, not « 0 files committed »
    result = {'ok': True, 'exchange': {'committed': 0, 'held': 0, 'received': 0, 'pushed': True, 'conflicts': 0, 'refused': 0}}
    st = _pub_open(c, {'changes': 0, 'ahead': 2, 'merging': False, 'last': {'at': '2026-11-10T17:05:00Z', 'pushed': True}}, result=result, launcher=st)
    c.tap('[data-publish] [data-verb=publish]')
    _ask_text(c)
    c.tap('.f-modal [data-ok]')
    c.until("!!document.querySelector('[data-publish-result]')", timeout=8000, what='the result is drawn')
    s = _publish_state(c)
    first = s['lines'][0][1] if s['lines'] else ''
    c.ok(first.startswith(norm(_trow('pubDoneCommits', lang).split('{n}')[0])) and '2' in first, s['lines'], 'the commits that left are said (two, already made by the build), never « committed files: 0 » alone')
    c.check_errors()


@case('L78', 'Données: « Choisir le fichier… » on the « Route (RAD, points FRA) » row sends an EUROCONTROL workbook to the launcher, which recognises it by its content (source eurocontrol_rad, no zone), then the import of the row follows: its plan, its question (SOG-0237)', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=True, night=False,
      rule='SOG-0237 + AeroDB 6dc9c5a1e: the launcher recognises RAD_AAMM_v<n>_<m>.xlsx and eurocontrol-airac-AAMM-fra-points-<texte>.xlsx (content checked) and puts them in data/local/upload/, which route/import-rad reads as Downloads; the answer carries source eurocontrol_rad, kind rad|fra and no zone: the screen chains the import (the plan, then the question), never a zone build')
def l78(c):
    lang = c.lang
    UP = lambda key: _trow(key, lang, after='  up: {')
    _t, cur, prev, _n = _cycles()
    rad = 'RAD_2611_v1_0.xlsx'
    plan = _view('done', step='Terminé', result={'ok': True, 'dry': True, 'files': [{'name': rad, 'size': 1500000, 'kind': 'rad', 'cycle': cur.isoformat(), 'title': 'Rolling RAD'}], 'taken': [], 'failed': [], 'rad': [], 'fra': [], 'commit': None})
    st = _launcher(c, [plan], verbs=['base/fetch', 'base/build', 'base/purge', 'route/import-rad'])
    sent = []

    def upload(route):
        sent.append(urllib.parse.unquote(route.request.headers.get('x-sog-name', '')))
        route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'source': 'eurocontrol_rad', 'kind': 'rad', 'zone': '', 'name': sent[-1], 'size': 1500000, 'replaced': True, 'sha256': 'cd' * 32}))
    c.context.route(re.compile(r'/__setup/base/upload'), upload)
    cfg, _ = _fixture()
    _open(c, cfg)
    _all_open(c)
    c.js("document.querySelector('[data-set=route]').open = true")
    btn = '[data-set=route] [data-act=zone-upload]'
    c.until(f"!!document.querySelector('{btn}') && !document.querySelector('{btn}').disabled", timeout=8000, what='« Choisir le fichier… » on the route row')
    c.eq(norm(c.text(btn)), norm(UP('choose')), 'named like the other upload buttons', what='button')
    c.js(f"document.querySelector('{btn}').scrollIntoView({{ block: 'center' }})")
    if c.width in (390, 1280):
        c.shot(f'L78_standard_{c.width}_{lang}_delivered.png')
    with c.page.expect_file_chooser() as fc:
        c.tap(btn)
    fc.value.set_files({'name': rad, 'mimeType': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'buffer': b'PK' + b'x' * 996})
    for _ in range(40):
        if sent:
            break
        c.wait(250)
    c.eq(sent, [rad], 'the workbook is sent to the launcher, under its own name', what='sent')
    done = norm(UP('doneRoute').split('{name}')[0] + rad + UP('doneRoute').split('{name}')[1].split('{s}')[0])
    for _ in range(30):
        if _notes_with(c, rad):
            break
        c.wait(250)
    c.ok(bool(_notes_with(c, rad)), None, 'the recognition is said, with the name and the source')
    # the import of the row follows: its plan (dry), then its question — never a build of a zone
    for _ in range(40):
        if _posts(st, 'import-rad'):
            break
        c.wait(250)
    c.eq([{k: p[k] for k in ('set', 'verb')} | {'dry': p['args'].get('dry')} for p in _posts(st, 'import-rad')[:1]], [{'set': 'route', 'verb': 'import-rad', 'dry': True}], 'the plan of the import follows (dry), the workbook just put away is read as if it were in Downloads', what='plan')
    c.until('!!document.querySelector("[data-route-ask]")', timeout=10000, what='the question of the row is asked')
    c.ok(rad in c.text('[data-route-books]'), c.text('[data-route-books]'), 'the question names the workbook just chosen')
    c.eq(len(_posts(st, 'pickup')) + len(_posts(st, 'build')), 0, 'no zone pickup, no build of a zone', what='no zone job')
    c.tap('[data-verb=route-no]')
    c.check_errors()


@case('L79', 'Données: « Mettre à jour » never says « the N ticked are up to date » for zones whose state the launcher did not give (challenge of Réglages, 11 Nov)', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=False, night=False,
      rule='the update said TX.upd.none with n = every ticked zone when nothing was to rebuild, even when the launcher had answered for some zones only (a zone without a state is neither up to date nor stale): a false « all up to date »; it now counts the zones the launcher said up to date and says how many have no state')
def l79(c):
    lang = c.lang
    st = _launcher(c, [_view('done', step='Terminé', result={'ok': True, 'fetched': [], 'unchanged': ['gb', 'us'], 'failed': [], 'manual': []})], verbs=_VERBS)
    st['status'] = _status({'ca': _zst('up-to-date'), 'es': _zst('up-to-date'), 'fr': _zst('up-to-date')})   # gb and us: no state given (they are downloaded, still without a state)
    cfg, _ = _fixture()
    _open(c, _sized(cfg))
    _all_open(c)
    c.until("[...document.querySelectorAll('[data-state-sentence] [data-filter]')].reduce((a, b) => a + parseInt(b.textContent, 10), 0) === 5", timeout=8000, what='the states read (three given, two without a state)')
    c.tap('[data-build] [data-verb=update]')
    head = norm(_trow('none', lang, after='  upd: {').split('{n}')[0])
    for _ in range(30):
        if _notes_with(c, head):
            break
        c.wait(250)
    said = _notes_with(c, head)
    c.ok(bool(said), said, 'the update says nothing is to rebuild')
    c.ok('3' in said[0] and '5' not in said[0], said, 'only the three zones the launcher said up to date are counted (3), not the five ticked')
    c.check_errors()


@case('L80', 'Données: opening Maintenance straight on #data raises no page error (follow() ran on an unmounted state: « Cannot read properties of null (reading ‘ctx’) »)', 'L', tags=('data',),
      designs=('standard',), screens=False, night=False,
      rule='V3 Frame (11 Nov): c.open(‘data’, app=‘maintenance’, docs=LEVEL3, wait=False) then check_errors showed a pageerror at follow (modules/data/follow.js:412) from mount (module.js:399): mount went on after an await although the module had been unmounted (the state S is null), and follow() read S.ctx')
def l80(c):
    # the cache reads of the screen are slow (900 ms): the pilot leaves for another module while the screen is still loading — the state is gone when mount goes on
    c.page.add_init_script("""(() => { const get = IDBObjectStore.prototype.get; IDBObjectStore.prototype.get = function (key) { const q = get.call(this, key); if (!/^(pilot|cache)\//.test(String(key))) return q;
      const late = { get result() { return q.result }, get error() { return q.error } }; q.onsuccess = () => setTimeout(() => late.onsuccess && late.onsuccess({ target: late }), 900); q.onerror = () => setTimeout(() => late.onerror && late.onerror({ target: late }), 900); return late } })()""")
    c.open('data', app='maintenance', docs=LEVEL3, wait=False)
    c.until("!!document.querySelector('[data-module=data]')", timeout=20000, what='the module is mounted (still loading)')
    # leave, come back, leave again while the reads are slow: three mounts, two unmounts, each read still pending when its screen is gone
    for h in ('#devices', '#data', '#devices', '#data', '#devices'):
        c.js(f"location.hash = '{h}'")
        c.wait(150)
    c.wait(5000)
    c.check_errors()


@case('L81', 'Données: leaving the screen while a download chained after a chosen NASR set is still running raises no page error (fetchThenBuild read the state of a screen that was gone)', 'L', tags=('data',),
      designs=('standard',), screens=False, night=False,
      rule='the same shape as follow() (11 Nov, V3 Frame / BUGS SOG b69dfb381): a module variable tested after an await — fetchThenBuild read S.lastOp after settle() without first checking that the screen was still the one that started the job; leaving the screen while the job ran threw « Cannot read properties of null »')
def l81(c):
    st = _launcher(c, [_F403()], verbs=_VERBS)
    st['status'] = _status({'ca': _zst('up-to-date'), 'es': _zst('up-to-date'), 'fr': _zst('up-to-date'), 'gb': _zst('up-to-date'),
                            'us': _zst('stale', {'code': 'source-old', 'source': 'faa', 'cycle': '2026-10-01', 'current': '2026-11-26'}, buildable=False)})
    sent = []

    def upload(route):
        name = urllib.parse.unquote(route.request.headers.get('x-sog-name', ''))
        sent.append(name)
        route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'source': 'faa', 'zone': 'us', 'cycle': '2026-10-29', 'name': name, 'replaced': True, 'deposited': ['FIX', 'AWY', 'NAV'], 'missing': []}))
    c.context.route(re.compile(r'/__setup/base/upload'), upload)
    cfg, _ = _fixture()
    _open(c, _sized(cfg))
    _all_open(c)
    c.until("[...document.querySelectorAll('[data-state-sentence] [data-filter]')].reduce((a, b) => a + parseInt(b.textContent, 10), 0) === 5", timeout=8000, what='the five pills')
    c.tap('[data-build] [data-verb=update]')
    _unfold(c, 'us')
    btn = '[data-zone-action=us] [data-act=zone-upload]'
    c.until(f"!!document.querySelector('{btn}') && !document.querySelector('{btn}').disabled", timeout=8000, what='« Choisir le fichier… » on the refused zone')
    running = _fview({'us': _fz('fetching', 1, 3, {'faa': {'state': 'downloaded', 'files': 3, 'bytes': 900}})}, state='running', step='Téléchargement', done=0, total=1)
    st['views'], st['i'], st['start'] = [running], 0, (200, {'job': 'j2'})
    c.js("document.querySelectorAll('#fNotes .f-note button').forEach(b => b.click())")
    c.js(f"document.querySelector('{btn}').scrollIntoView({{ block: 'center' }})")
    with c.page.expect_file_chooser() as fc:
        c.tap(btn)
    fc.value.set_files({'name': '29_Oct_2026_NAV_CSV.zip', 'mimeType': 'application/zip', 'buffer': b'PK' + b'x' * 996})
    for _ in range(40):
        if len(_posts(st, 'fetch')) >= 2:
            break
        c.wait(250)
    c.eq(len(_posts(st, 'fetch')), 2, 'the download of the zone is running (the job is still « running »)', what='fetch started')
    c.js("location.hash = '#devices'")      # the pilot leaves while the job runs
    c.wait(3000)
    c.check_errors()



# ------------------------------------------------------------------------------------------------------ L85
def _running(**kw):
    """What AeroDB's « busy » refusal names (`running`, SOG-0245): the Procédures download of two States, started five minutes ago, a quarter of the way, last sign 5 s ago."""
    now = int(time.time())
    r = {'id': 'o1', 'set': 'proc', 'verb': 'fetch', 'args': {'action': 'plan'}, 'started': now - 300, 'step': 'Lecture des sources', 'done': 2, 'total': 10, 'unit': 'states',
         'seen': now - 5, 'silent': 5, 'alive': 'alive', 'cancelling': False}
    r.update(kw)
    return r


def _clock(s):
    """« 5:10 »: seconds as the screen writes them."""
    return f'{s // 60}:{s % 60:02d}'


@case('L85', 'Données: « une autre opération est en cours » is a card — which operation, since when (UTC), where it is, alive or « ne répond plus » — with Voir, Arrêter and, only when it is stuck or gone, Libérer (SOG-0245)', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=True, night=False,
      rule='SOG-0245 (the user: « une autre opération est en cours : on ne sait pas quoi, et on ne peut pas l’arrêter. S’il reste un lock suite à un souci, on ne peut donc pas l’enlever. On devrait pouvoir retourner sur l’appli en cours, horodatage démarrage, pourcentage d’achèvement, et est-elle toujours vivante »): AeroDB INTEGRATION « The running operation » — every « busy » refusal (job start, file upload) carries `running`; Voir = GET regen/job?id=, Arrêter = POST regen/job/cancel { id }, Libérer = POST regen/job/release { id } (409 alive: stop it first), offered for stuck or gone only; an older launcher without `running` keeps the bare sentence')
def l85(c):
    lang = c.lang
    B = lambda key: _trow(key, lang, after='  busy: {')
    name = f"{_trow('proc', lang, after='  groups: {')} · {_trow('fetch', lang, after='Ruta (RAD, FRA)')}"
    hhmm = lambda r: time.strftime('%H:%MZ', time.gmtime(r['started']))
    card = '[data-build] [data-busy-card]'
    acts = lambda: c.js(f"[...document.querySelectorAll('{card} [data-busy-act]')].map(b => b.dataset.busyAct)")
    lines = lambda: [norm(x) for x in c.js(f"[...document.querySelectorAll('{card} [data-busy-line]')].map(p => p.textContent)")]
    quiet_notes = lambda: c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    R = _running()
    cfg, _ = _fixture()
    cfg['zones'].append({'id': 'pt', 'names': ['Portugal', 'Portugal', 'Portugal', 'Portugal'], 'frames': [], 'published': True})
    cfg['publication']['base']['pt'] = cfg['publication']['base']['fr']
    cfg['navpt'] = 'nopick'      # here Portugal is an ordinary source of the catalogue (the early « Choisir le fichier… » of a `fetch.pick` source is L86)
    waiting = {'code': 'pickup-waiting', 'source': 'navpt', 'set': 'AIP', 'cycle': '2026-11-26', 'zip': 'AIP_PT.zip'}
    st = _launcher(c, [_view('running')], start=(409, {'reason': 'busy', 'job': 'o1', 'running': R}), busy_running=R, verbs=_VERBS + ['base/pickup'])
    st['status'] = _status({'ca': _zst('up-to-date'), 'es': _zst('up-to-date'), 'fr': _zst('up-to-date'), 'gb': _zst('up-to-date'), 'us': _zst('up-to-date'),
                            'pt': _zst('stale', waiting, buildable=False)})
    c.context.route(re.compile(r'/__setup/base/upload'), lambda route: route.fulfill(status=409, content_type='application/json', body=json.dumps({'ok': False, 'reason': 'busy', 'running': R})))
    _open(c, _sized(cfg))
    _all_open(c)
    # ---- (a) a start refused while an operation runs: the card names it, says since when, where it is, that it is alive; Voir and Arrêter, no Libérer
    c.tap('[data-verb=build]')
    c.until(f"!!document.querySelector('{card}')", timeout=8000, what='the card of the running operation')
    c.eq(norm(c.text(f'{card} [data-busy-name]')), norm(B('title').replace('{n}', name)), 'the card names the operation in plain words (the set and the verb), not an identifier', what='name')
    got = lines()
    c.ok(norm(B('started').replace('{t}', hhmm(R))) in got, got, 'since when, in UTC (« 16:30Z »)')
    c.ok(norm(B('step').replace('{s}', R['step'])) in got, got, 'the step it is at')
    c.ok(any('20 %' in x for x in got), got, 'the percentage of completion (2 of 10)')
    c.ok(norm(B('alive')) in got, got, 'and that it is still alive')
    c.eq([c.attr(f'{card} [role=progressbar]', 'aria-valuenow'), c.attr(f'{card} [role=progressbar]', 'aria-valuemax'), c.attr(card, 'data-alive')], ['2', '10', 'alive'], 'a bar with the count', what='bar')
    c.eq(acts(), ['see', 'stop', 'hide'], 'Voir and Arrêter; no Libérer while it is alive', what='buttons')
    c.eq(c.count('[data-build] [data-build-result][data-refusal=busy]'), 0, 'the bare sentence is replaced by the card', what='bare sentence')
    c.eq(c.js("document.querySelector('[data-verb=build]').disabled"), True, 'the screen stays grey while it runs', what='grey')
    _screen_ok(c, 'the card')
    # Voir: the job is read again by its identifier, the card shows what it says now
    R['done'], R['step'] = 5, 'Calcul'
    c.tap(f'{card} [data-busy-act=see]')
    c.until(f"document.querySelector('{card}').textContent.includes('50 %')", timeout=8000, what='the card shows the fresh count')
    c.eq(st['gets'][:1], ['o1'], 'Voir reads GET regen/job?id=o1', what='see')
    # ---- (b) Arrêter: the id is posted, the card says the stop was requested
    quiet_notes()
    c.tap(f'{card} [data-busy-act=stop]')
    c.until(f"document.querySelector('{card}[data-cancelling]')", timeout=8000, what='the stop is requested')
    c.eq([st['cancels'], c.js(f"document.querySelector('{card} [data-busy-act=stop]').disabled"), norm(B('cancelling')) in lines()], [[{'id': 'o1'}], True, True], 'Arrêter posts { id }; the card says « arrêt demandé » and the button is spent', what='cancel')
    # ---- (c) stuck: « ne répond plus », Libérer; it posts { id }, the card goes away and the screen can start again
    R['alive'], R['silent'], R['cancelling'] = 'stuck', 400, False
    c.tap(f'{card} [data-busy-act=see]')
    c.until(f"document.querySelector('{card}[data-alive=stuck]')", timeout=8000, what='the card says it is stuck')
    c.ok(norm(B('stuck').replace('{t}', _clock(400))) in lines(), lines(), '« ne répond plus » with the silence')
    c.eq(acts(), ['see', 'stop', 'release', 'hide'], 'Libérer appears for a stuck operation', what='buttons stuck')
    quiet_notes()
    if c.width in (390, 1280):
        c.js(f"document.querySelector('{card}').scrollIntoView({{ block: 'center' }})")
        c.shot(f'L85_{c.width}_{lang}_delivered.png')
    R['alive'] = 'gone'
    c.tap(f'{card} [data-busy-act=see]')
    c.until(f"document.querySelector('{card}[data-alive=gone]')", timeout=8000, what='the card says its thread is gone')
    c.ok(norm(B('gone')) in lines() and 'release' in acts(), lines(), 'gone: its process has disappeared, Libérer still offered')
    c.tap(f'{card} [data-busy-act=release]')
    c.until(f"!document.querySelector('{card}')", timeout=8000, what='the card goes away')
    c.eq([st['releases'], c.js("document.querySelector('[data-verb=build]').disabled"), c.count('[data-other]')], [[{'id': 'o1'}], False, 0], 'Libérer posts { id }; the screen is free again', what='release')
    st['start'] = (200, {'job': 'j1'})
    n = len(st['posts'])
    c.tap('[data-verb=build]')
    c.wait(600)
    c.eq(len(st['posts']), n + 1, 'a new operation can start', what='start again')
    # ---- (d) the launcher refuses to release an operation that gave a sign of life: « arrêtez d'abord »
    c.page.reload(wait_until='load')
    _head(c)
    _all_open(c)
    R.update(alive='stuck', silent=310, cancelling=False)
    st['start'], st['release_alive'] = (409, {'reason': 'busy', 'job': 'o1', 'running': R}), True
    c.tap('[data-verb=build]')
    c.until(f"!!document.querySelector('{card}[data-alive=stuck]')", timeout=8000, what='the card of the stuck operation')
    n0 = len(lines())
    c.tap(f'{card} [data-busy-act=release]')
    c.until(f"document.querySelectorAll('{card} [data-busy-line]').length > {n0}", timeout=8000, what='the card says to stop it first')
    c.ok(norm(B('aliveFirst').replace('{t}', _clock(310))) in lines(), lines(), '« arrêtez d’abord » (it gave a sign of life)')
    c.eq([len(st['releases']), c.count(card)], [2, 1], 'the release was asked (and refused): the card stays', what='refused')
    # ---- (f) an older launcher (no `running`, or a body that does not read): the bare sentence, nothing breaks
    for body in ({'message': 'busy'}, {'reason': 'busy', 'running': {'id': 'Bad Id!', 'alive': 'dead'}}, {'reason': 'busy', 'running': 'x'}):
        st['start'] = (409, body)
        c.page.reload(wait_until='load')
        _head(c)
        _all_open(c)
        c.tap('[data-verb=build]')
        c.until("!!document.querySelector('[data-build-result][data-refusal=busy]')", timeout=8000, what='the bare sentence')
        c.eq([norm(c.text('[data-build-result]')), c.count('[data-busy-card]')], [norm(_trow('busy', lang, 'refused: {')), 0], f'no usable `running` ({body}): the old sentence, no card', what='older launcher')
    # ---- (e) a file refused because an operation runs (409 busy on base/upload): the same card, in the panel of the base
    R.update(alive='alive', silent=5, cancelling=False)
    st['start'] = (200, {'job': 'j1'})
    c.page.reload(wait_until='load')
    _head(c)
    _all_open(c)
    c.until("[...document.querySelectorAll('[data-state-sentence] [data-filter]')].reduce((a, b) => a + parseInt(b.textContent, 10), 0) >= 6", timeout=8000, what='the six pills')
    row = '[data-state-zones] [data-zone-row=pt]'
    _unfold(c, 'pt')
    with c.page.expect_file_chooser() as fc:
        c.js(f"document.querySelector('{row} [data-act=zone-upload]').click()")
    fc.value.set_files({'name': 'AIP_PT.zip', 'mimeType': 'application/zip', 'buffer': b'PK' + b'x' * 998})
    c.until(f"!!document.querySelector('{card}')", timeout=8000, what='the card of the running operation after a refused file')
    quiet_notes()
    c.eq([norm(c.text(f'{card} [data-busy-name]')), acts()], [norm(B('title').replace('{n}', name)), ['see', 'stop', 'hide']], 'a file refused because an operation runs: the same card, named, with Voir and Arrêter', what='upload card')
    if c.width in (390, 1280):
        c.js(f"document.querySelector('{card}').scrollIntoView({{ block: 'center' }})")
        c.shot(f'L85_{c.width}_{lang}_upload.png')
    c.check_errors()


@case('L86', 'Données: Portugal (a source whose catalogue entry carries fetch.pick) offers « Choisir le fichier… » on its zone line from the start with its step-by-step; a file seen in Downloads makes « Prendre le fichier téléchargé » the one gesture and « Choisir un autre fichier… » a link under it; the line says the edition read, the cycle comparison and the refused files from the launcher\'s answers; the list of sources an unrecognised file refuses comes from the launcher only (SOG-0244)', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=True, night=False,
      rule='SOG-0244, the join with the launcher (K177: the upload answers { ok, source: navpt, zone: pt, name, cycle: <edition> } or unrecognised with a `message` and `expected`; the base/fetch line of the source carries edition, from (a file NAME), future, older_than_cycle, skipped.routes_without_name, refused [« nom : raison »]): the zone line of a source taken by hand offers the file from the start (a plain France line still has no action: L63/L70), ONE purpose per button (the file seen in Downloads is taken, another one is chosen by a link; nothing seen: « Choisir le fichier… » alone), says what the launcher read, and the sentence of a refusal names only the sources the launcher gives (none: no name at all); every launcher string is bounded and escaped')
def l86(c):
    lang = c.lang
    ZM = lambda key: _trow(key, lang, after='  zm: {')
    UP = lambda key: _trow(key, lang, after='  up: {')
    WHY = lambda key: _trow(key, lang, after='    why: {')
    NONE = lambda key: _trow(key, lang, after='    whyNone: {')
    ST = lambda key: _trow(key, lang, after='  steps: {')
    cfg, _ = _fixture()
    cfg['zones'].append({'id': 'pt', 'names': ['Portugal', 'Portugal', 'Portugal', 'Portugal'], 'frames': [], 'published': True})
    cfg['publication']['base']['pt'] = cfg['publication']['base']['fr']
    cfg['navpt'] = 'pick'
    ok = lambda: _zst('up-to-date')
    newer = {'code': 'source-newer', 'source': 'navpt', 'cycle': '2026-11-26', 'built': '2026-10-29'}
    seen = {'code': 'pickup-waiting', 'source': 'navpt', 'zip': 'EAIP ISO (1).zip'}
    st = _launcher(c, [], verbs=['base/fetch', 'base/status', 'base/purge', 'base/pickup'])       # no base/build: the build that follows a download is not part of this case
    st['status'] = _status({'ca': ok(), 'es': ok(), 'fr': _zst('stale', _NEWER), 'gb': ok(), 'us': ok(), 'pt': _zst('stale', newer)})
    answer = {'status': 200, 'body': {}}
    c.context.route(re.compile(r'/__setup/base/upload'), lambda route: route.fulfill(status=answer['status'], content_type='application/json', body=json.dumps(answer['body'])))
    _open(c, _sized(cfg))
    _all_open(c)
    c.until("[...document.querySelectorAll('[data-state-sentence] [data-filter]')].reduce((a, b) => a + parseInt(b.textContent, 10), 0) >= 6", timeout=8000, what='the six pills')
    _unfold(c, 'pt')
    row = '[data-state-zones] [data-zone-row=pt]'
    fr = '[data-state-zones] [data-zone-row=fr]'
    lines = lambda: [norm(x) for x in c.js(f"[...document.querySelectorAll('{row} [data-zone-msg] [data-line]')].map(p => p.textContent)")]
    quiet = lambda: c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")

    def choose(name, mime='application/zip'):
        c.until(f"!document.querySelector('{row} [data-act=zone-upload]').disabled", timeout=8000, what='the choose button is free')
        with c.page.expect_file_chooser() as fc:
            c.js(f"document.querySelector('{row} [data-act=zone-upload]').click()")
        fc.value.set_files({'name': name, 'mimeType': mime, 'buffer': b'PK' + b'x' * 998})

    def reopen():
        c.page.reload(wait_until='load')
        _head(c)
        _all_open(c)
        c.until("[...document.querySelectorAll('[data-state-sentence] [data-filter]')].reduce((a, b) => a + parseInt(b.textContent, 10), 0) >= 6", timeout=10000, what='the six pills')
        _unfold(c, 'pt')
    # ---- 1. from the start: « Choisir le fichier… » alone, with the step-by-step; France (an ordinary stale line) still has no action
    c.eq([c.count(f'{row} [data-zone-action]'), c.count(f'{row} [data-act=zone-upload]'), c.count(f'{row} [data-verb=pickup]'), c.count(f'{row} [data-zone-alt]'), c.count(f'{row} [data-zone-msg]')], [1, 1, 0, 0, 0],
         'Portugal, to rebuild, nothing seen in Downloads: its line offers « Choisir le fichier… » from the start, and nothing else (no pickup, no link, no message)', what='line at once')
    c.eq(norm(c.text(f'{row} [data-act=zone-upload]')), norm(UP('choose')), 'the button says « Choisir le fichier… »', what='button text')
    c.eq(c.count(f'{fr} [data-zone-action]'), 0, 'France, an ordinary stale line, has no action on it (the early offer is for the sources that carry fetch.pick)', what='France plain')
    steps = c.js(f"(() => {{ const o = document.querySelector('{row} [data-pickup-steps=pt]'); return o ? [[...o.querySelectorAll('[data-step-page] a')].map(a => a.getAttribute('href')), o.querySelectorAll('[data-step-file]').length, o.querySelector('[data-step-then]').textContent] : null }})()")
    c.eq([steps[0], steps[1], norm(steps[2])] if steps else None,
         [c.js("(() => { const s = window.AeroCatalogue.stepsOf('navpt'); return [s.page.url, s.page.home] })()"), 1, norm(ST('thenChoose'))], 'its step-by-step: the page of NAV Portugal and its home, the file to take, and the last step is « Choisir le fichier… » (no pickup button to touch)', what='steps')
    # ---- 2. a file SEEN in Downloads (the launcher's status says it): the pickup is the one gesture, another file is a link under it
    st['status'] = _status({'ca': ok(), 'es': ok(), 'fr': _zst('stale', _NEWER), 'gb': ok(), 'us': ok(), 'pt': _zst('stale', seen, buildable=False)})
    reopen()
    c.eq([c.count(f'{row} [data-zone-action=pt] [data-verb=pickup]'), c.count(f'{row} [data-zone-action=pt] [data-act=zone-upload]'), c.count(f'{row} [data-zone-alt=pt] [data-act=zone-upload].d-link')], [1, 0, 1],
         'a file seen in Downloads: « Prendre le fichier téléchargé » on the line, « Choisir un autre fichier… » as a link on the line under it, never two buttons side by side', what='seen buttons')
    c.eq([norm(c.text(f'{row} [data-zone-action=pt] > span')), norm(c.text(f'{row} [data-zone-alt=pt] button'))], [norm(ZM('seen').replace('{zip}', 'EAIP ISO (1).zip')), norm(UP('chooseOther'))],
         'the line names the file seen, the link says « Choisir un autre fichier… »', what='seen texts')
    c.ok(len(norm(c.text(f'{row} [data-verb=pickup]'))) > 3, c.text(f'{row} [data-verb=pickup]'), 'and the primary button has its label')
    c.ok(c.js(f"document.querySelector('{row} [data-zone-alt=pt]').getBoundingClientRect().top > document.querySelector('{row} [data-zone-action=pt]').getBoundingClientRect().top + 20"), 'not under', 'the link is under the primary gesture')
    c.eq(norm(c.text(f'{row} [data-step-then]')), norm(ST('then')), 'and the step-by-step ends on the pickup button', what='seen then')
    if c.width in (390, 1280):
        c.js(f"document.querySelector('{row}').scrollIntoView({{ block: 'center' }})")
        c.wait(300)
        c.shot(f'L86_{c.width}_{lang}_seen.png')
    # ---- 3. a file the launcher does not recognise: its `message` in plain words, and ONLY the sources it names
    st['status'] = _status({'ca': ok(), 'es': ok(), 'fr': _zst('stale', _NEWER), 'gb': ok(), 'us': ok(), 'pt': _zst('stale', newer)})
    reopen()
    answer.update(status=422, body={'ok': False, 'reason': 'unrecognised', 'message': 'ISO illisible : <b>aucune page</b> de « AIP for PORTUGAL »', 'expected': ['navpt', 'faa', 'ukmil']})
    choose('AIP_ES.zip')
    c.until(f"[...document.querySelectorAll('{row} [data-zone-msg] [data-line]')].some(p => p.textContent.includes('AIP_ES.zip'))", timeout=8000, what='the refusal is on the line')
    quiet()
    got = lines()
    c.eq([len(got), got[0]], [3, norm(ZM('chosen').replace('{name}', 'AIP_ES.zip'))], 'the file chosen, the sentence, and the launcher\'s own words (three lines)', what='refusal lines')
    c.ok(got[1].startswith(norm(WHY('unrecognised').split('{s}')[0])) and 'NAV Portugal' in got[1] and 'SIA' not in got[1] and 'NATS' not in got[1], got[1], 'the sources named are the launcher\'s expected (Portugal among them), not a list of the page')
    c.eq(got[2], norm('ISO illisible : <b>aucune page</b> de « AIP for PORTUGAL »'), 'the launcher\'s message, as it is (escaped, bounded)', what='refusal message')
    c.eq(c.js(f"document.querySelector('{row} [data-zone-msg]').querySelectorAll('b').length"), 0, 'nothing a launcher says is read as HTML', what='escaped')
    # the launcher names no source: the sentence names nobody (neither the old list of the page)
    answer.update(status=422, body={'ok': False, 'reason': 'unrecognised'})
    choose('AIP_ES.zip')
    c.until(f"[...document.querySelectorAll('{row} [data-zone-msg] [data-line]')].length === 2", timeout=8000, what='the second refusal replaces the first')
    quiet()
    got = lines()
    c.eq(got, [norm(ZM('chosen').replace('{name}', 'AIP_ES.zip')), norm(NONE('unrecognised'))], 'without `expected` the sentence names no source (and has no braces left)', what='no list')
    # ---- 4. an eAIP ISO recognised: the edition on the line; without the personal-use tick nothing reads it, and the line says so
    answer.update(status=200, body={'ok': True, 'source': 'navpt', 'zone': 'pt', 'name': 'navpt_eaip.iso', 'cycle': '2026-10-01'})
    posts = len(st['posts'])
    choose('EAIP_PORTUGAL.iso', 'application/x-iso9660-image')
    c.until(f"[...document.querySelectorAll('{row} [data-zone-msg] [data-line]')].length === 3", timeout=8000, what='the edition and the tick are on the line')
    quiet()
    edition = _date_text(datetime.date(2026, 10, 1), lang)
    c.eq(lines(), [norm(ZM('chosen').replace('{name}', 'EAIP_PORTUGAL.iso')), norm(ZM('edition').replace('{d}', edition)), norm(UP('tick'))], 'an ISO recognised: the file chosen, its EDITION (the launcher\'s `cycle`), and that the personal-use box is not ticked', what='edition line')
    c.eq([len([p for p in st['posts'][posts:] if p.get('verb') == 'fetch']), c.attr(f'{row} [data-zone-msg]', 'data-level')], [0, 'warn'], 'without the tick nothing is downloaded (the licence is personal), the line is amber', what='no fetch')
    # ---- 5. with the tick: the download of the zone reads the file; its result says the edition read, the cycle comparison, the routes skipped and the refused files
    st['personal'] = {'certified': True, 'at': '2026-11-10T09:00:00Z'}
    reopen()
    entry = {'state': 'downloaded', 'files': 1, 'bytes': 120000, 'edition': '2026-10-01', 'from': 'EAIP ISO (1).zip', 'older_than_cycle': True, 'skipped': {'routes_without_name': 2},
             'refused': ['EAIP_OLD.zip : ISO illisible', 'notes.zip : ce n’est pas cet eAIP']}
    done = _fview({'pt': _fz('done', 1, 1, {'navpt': entry})}, state='done', step='Terminé', done=1, total=1, jid='jf', args={'zones': ['pt'], 'personal': ['navpt']},
                  result={'ok': True, 'fetched': ['pt'], 'unchanged': [], 'failed': []})
    st['views'], st['i'], st['start'] = [done], 0, (200, {'job': 'jf'})
    posts = len(st['posts'])
    answer.update(status=200, body={'ok': True, 'source': 'navpt', 'zone': 'pt', 'name': 'navpt_eaip.zip', 'cycle': '2026-10-01'})
    choose('EAIP ISO (1).zip')
    c.until(f"[...document.querySelectorAll('{row} [data-zone-msg] [data-line]')].some(p => p.textContent.includes('EAIP_OLD.zip'))", timeout=12000, what='the result of the download is on the line')
    quiet()
    sent = [p for p in st['posts'][posts:] if p.get('verb') == 'fetch']
    c.eq([{k: sent[0][k] for k in ('set', 'verb', 'args')}] if sent else None, [{'set': 'base', 'verb': 'fetch', 'args': {'zones': ['pt'], 'personal': ['navpt']}}], 'the download of Portugal alone, with the tick of navpt, follows the upload of the file', what='fetch body')
    c.eq(lines(), [norm(ZM('edition').replace('{d}', edition) + ' (EAIP ISO (1).zip)'), norm(ZM('older')), norm(ZM('routes').replace('{n}', '2')),
                   norm(ZM('refused').replace('{r}', 'EAIP_OLD.zip : ISO illisible')), norm(ZM('refused').replace('{r}', 'notes.zip : ce n’est pas cet eAIP'))],
         'the line: the edition and the NAME of the file read, « ce fichier est celui du cycle précédent » (the launcher said older_than_cycle), the routes without a name, each refused file « nom : raison »', what='result lines')
    c.eq(c.attr(f'{row} [data-zone-msg]', 'data-level'), 'warn', 'amber: something to read', what='level')
    if c.width in (390, 1280):
        c.settle()
        c.js(f"document.querySelector('{row}').scrollIntoView({{ block: 'center' }})")
        c.wait(300)
        c.shot(f'L86_{c.width}_{lang}_delivered.png')
    # ---- 6. an edition still to come: said with its date; the zone is up to date again and the line stays
    c.wait(3500)   # the reads that follow the first download (state of the countries, list of the month) are over: the fake launcher’s state below is not read by a late one
    entry2 = {'state': 'downloaded', 'files': 1, 'bytes': 120000, 'edition': '2026-12-24', 'from': 'EAIP_PORTUGAL', 'future': True}
    done2 = _fview({'pt': _fz('done', 1, 1, {'navpt': entry2})}, state='done', step='Terminé', done=1, total=1, jid='jg', args={'zones': ['pt'], 'personal': ['navpt']},
                   result={'ok': True, 'fetched': ['pt'], 'unchanged': [], 'failed': []})
    st['views'], st['i'], st['start'] = [done2], 0, (200, {'job': 'jg'})
    st['status'] = _status({'ca': ok(), 'es': ok(), 'fr': _zst('stale', _NEWER), 'gb': ok(), 'us': ok(), 'pt': ok()})      # what the launcher says once the zone is built: up to date
    c.until(f"!document.querySelector('{row} [data-act=zone-upload]').disabled", timeout=8000, what='the choose button is free')
    choose('EAIP_PORTUGAL.zip')
    c.until(f"[...document.querySelectorAll('{row} [data-zone-msg] [data-line]')].some(p => p.textContent.includes('EAIP_PORTUGAL'))", timeout=12000, what='the second result is on the line')
    quiet()
    ed = _date_text(datetime.date(2026, 12, 24), lang)
    c.eq(lines(), [norm(ZM('edition').replace('{d}', ed) + ' (EAIP_PORTUGAL)'), norm(ZM('future').replace('{d}', ed))], 'an edition to come: its date, and « il sera pris le <date> » (the launcher said future)', what='future lines')
    c.until(_SENT_UPTO % 5, timeout=8000, what='the launcher says the zone is up to date again (five up to date, France still stale)')
    _unfold(c, 'pt')
    c.until("document.querySelector('[data-state-zones] [data-zone-row=pt] [data-zstate]').dataset.zstate === 'up-to-date'", timeout=8000, what='the zone is up to date')
    c.eq([c.count(f'{row} [data-zone-action]'), c.count(f'{row} [data-act=zone-upload]'), len(lines())], [0, 0, 2], 'up to date: no button, and the line of the edition stays', what='up to date')
    c.check_errors()


# ------------------------------------------------------------------------------------------------------ L87
_L87_CODES = ['index-orphan', 'never-built', 'failed', 'pickup-waiting', 'source-newer', 'personal-undeclared', 'inputs-changed', 'source-unbuilt', 'parser-old', 'files-missing', 'source-unread',
              'source-missing', 'source-old']
_L87_JS = r"""async (codes) => {
  const S = await import('/modules/data/status.js'), M = await import('/modules/data/model.js');
  const extra = { source: 'nats', set: 'AIP', cycle: '2026-11-26', built: 23, current: 28, count: 2, names: ['a', 'b'], zip: 'x.zip', error: 'invalid-output', why: 'personal' };
  const one = code => M.statusOf({ state: 'done', result: { ok: true, zones: { aa: { state: 'stale', reasons: [{ code, ...extra }], buildable: true } } } }).zones.aa.reasons[0];
  return { closed: [...M.REASON_CODES].sort(), texts: codes.map(code => { const r = one(code); return [code, r.code, S.reasonText(r)] }), unknown: S.reasonText(one('zz-new_code')),
    hostile: S.reasonText(one('ZZ<b>X</b>-' + 'a'.repeat(60))), none: S.reasonText(one(null)), tones: M.STATE_TONE }
}"""


def _l87_ready(c, st=None, tag=''):
    """After a reload: the 75 zones have their state and the sentence is drawn (what is missing is said)."""
    try:
        c.until("[...document.querySelectorAll('[data-state-sentence] [data-filter]')].reduce((a, b) => a + parseInt(b.textContent, 10), 0) >= 75 && !!document.querySelector('[data-state-sentence] [data-filter]')", timeout=20000, what='the state of the 75 zones')
    except Fail:
        raise Fail(f'the 75 zones have no state ({tag}): ' + json.dumps([[p['verb'] for p in (st or {'posts': []})['posts']][-6:], (st or {}).get('verbs_calls'), c.errors[:2]]) + json.dumps(c.js("() => [document.querySelectorAll('[data-zstate]').length, !!document.querySelector('[data-state-sentence]'), (document.querySelector('[data-state-head]') || {}).innerText]")), 'the state is read') from None


@case('L87', 'Données: the base panel does not lie (SOG-0260) — « Tout est à jour. » only when nothing is left, the notices are information, the 13 reasons are worded, the file buttons are for the zones that wait for a file, the zones that wait for the personal-use tick say so, a three-state legend, « pourquoi ? » keeps the scroll, the busy sentence is said once (SOG-0261, L85)', 'L', tags=('data',), langs4=True,
      designs=('standard',), screens=True, night=False,
      rule='SOG-0260 (the user: « 4 zones à jour · 2 à reconstruire · 69 attendent un fichier » and, in green, « Tout est à jour. »; every country « À reconstruire » + « Raison non reconnue » + « Prendre le fichier téléchargé »): the screen says what the launcher says — the all-fresh sentence needs nothing left to rebuild, fail, wait for or be unknown; `notices[]` are information (never a reason, never counted, no state colour); every code of the closed list has a text, an unknown one is said with its code; a file button only where a file is expected (pickup-waiting, source-missing, source-old), the personal-use tick is its own part of the sentence with a link to the box; the map legend has three states; SOG-0261: the « pourquoi ? » of a row keeps the scroll; L85 follow-up: the busy sentence is said once')
def l87(c):
    lang = c.lang
    z = lambda n: _zones_text(lang, n)
    BT = lambda k, n: _trow(k, lang, after='  bal: {', row=0 if _one(lang, n) else 1).replace('{n}', z(n))
    UT = lambda k: _UT(k, lang)
    ZR = lambda k: _trow(k, lang, after='  zr: {')
    certify = _trow('certify', lang, after='  personalTitle:')
    unknown = lambda code: ZR('unknown').replace('{code}', code)
    keys = lambda: c.js("[...document.querySelectorAll('[data-state-sentence] [data-filter]')].map(b => b.dataset.filter)")
    # ---- the coverage of the user's screen, with AeroDB's real shapes: 75 zones, 60 up to date (ten of them with the « no points » notice), 9 to rebuild (7 parser-old, 2 with a code the page does not know), 1 failed,
    #      2 that wait for a file, 3 that wait for the personal-use tick (the launcher says it twice: personal-undeclared AND source-unread)
    cfg, _ = _fixture()
    cfg['navpt'] = 'pick'        # Portugal is the hard case: a source taken by hand, which must still NOT offer a file when the tick is what it waits for
    cfg['outlines'] = _outlines()
    extra = [f'q{i:02d}' for i in range(66)]
    for zid, names in [('af', ['Afghanistan'] * 4), ('pt', ['Portugal'] * 4), ('ie', ['Irlande', 'Ireland', 'Irland', 'Irlanda']), ('se', ['Suède', 'Sweden', 'Schweden', 'Suecia'])]:
        cfg['zones'].append({'id': zid, 'names': names, 'frames': [], 'published': True})
        cfg['publication']['base'][zid] = cfg['publication']['base']['ca']
    for zid in extra:
        cfg['zones'].append({'id': zid, 'names': [f'Zone {zid[1:]}'] * 4, 'frames': [], 'published': True})
        cfg['publication']['base'][zid] = cfg['publication']['base']['ca']
    ALL = ['ca', 'es', 'fr', 'gb', 'us', 'af', 'pt', 'ie', 'se'] + extra
    notice = {'code': 'no-points', 'source': 'openaip'}
    HOSTILE = 'ZZ<b>X</b>-' + 'a' * 60
    shown_hostile = re.sub(r'[^a-z0-9_-]', '', HOSTILE.lower())[:40]
    old = {'code': 'parser-old', 'built': 23, 'current': 28}
    undeclared = lambda s: {'code': 'personal-undeclared', 'source': s}
    unread = lambda s: {'code': 'source-unread', 'source': s, 'why': 'personal'}

    def full(**over):
        """The status of the 75 zones: every one up to date (the notices on Afghanistan and nine more), but those of `over`."""
        zs = {zid: {**_ZDL(_zst('up-to-date'), True), 'notices': [notice] if zid == 'af' or zid in extra[:9] else [], 'publish': {'state': 'published'}} for zid in ALL}
        zs.update(over)
        return _status(zs)
    WAIT = {'gb': _ZDL(_zst('stale', {'code': 'pickup-waiting', 'source': 'nats', 'set': 'AIP', 'cycle': '2026-11-26', 'zip': 'x.zip'}, buildable=False), True),
            'us': _ZDL(_zst('stale', {'code': 'source-missing', 'source': 'faa'}, buildable=False), True)}
    PERS = {'pt': _ZDL(_zst('stale', undeclared('navpt'), unread('navpt'), buildable=False), True), 'ie': _ZDL(_zst('stale', undeclared('airnav'), buildable=False), True),
            'se': _ZDL(_zst('stale', undeclared('lfv'), unread('lfv'), buildable=False), True)}
    REBUILD = {**{zid: _ZDL(_zst('stale', old), True) for zid in extra[56:63]}, 'q63': _ZDL(_zst('stale', {'code': 'zz-new_code'}), True), 'q64': _ZDL(_zst('stale', {'code': HOSTILE}), True)}
    mixed = full(es=_ZDL(_zst('failed', {'code': 'failed', 'error': 'invalid-output'}), True), **WAIT, **PERS, **REBUILD)
    R = _running()
    st = _launcher(c, [_view('done', step='Terminé')], verbs=_VERBS + ['base/pickup'], busy_running=R)
    st['by_args'] = True
    st['status'] = mixed

    def style_route(route):
        route.fulfill(status=200, content_type='application/json', body=_ZSTYLE)
    c.context.route(re.compile(r'^https://tiles\.openfreemap\.org/'), style_route)
    _open(c, _sized(cfg))
    _all_open(c)
    c.until("[...document.querySelectorAll('[data-state-sentence] [data-filter]')].reduce((a, b) => a + parseInt(b.textContent, 10), 0) >= 75", timeout=20000, what='the state of the 75 zones, read at the opening (60 then 15)')
    c.until("!!document.querySelector('[data-state-sentence] [data-filter]')", timeout=10000, what='the sentence')
    row = lambda zid: f'[data-state-zones] [data-zone-row={zid}]'
    # ---- 1. the sentence says the right counts, in its order; « Tout est à jour. » is NOT there next to « à faire »
    cycle = c.text('[data-cycle-now]').strip()
    pat = re.escape(_trow('cycleDates', lang)).replace(re.escape('{a}'), '(?P<a>.+?)').replace(re.escape('{b}'), '(?P<b>.+?)')
    date = re.fullmatch(pat, norm(c.text('[data-cycle-dates]')).split(' · ')[0]).group('a')
    want = _trow('stateBase', lang) + ' ' + ' · '.join(BT(k, n) for k, n in [('upToDate', 60), ('rebuild', 9), ('failed', 1), ('waiting', 2), ('personal', 3)])
    c.eq(norm(c.text('[data-state-sentence]')), norm(want), 'the sentence of the user’s coverage: 60 up to date, 9 to rebuild, 1 failed, 2 that wait for a file, 3 that wait for the personal-use tick (its own part; nothing without a state)', what='sentence')
    c.eq(keys(), ['upToDate', 'rebuild', 'failed', 'waiting', 'personal'], 'the parts are the buttons of the sentence, the personal-use tick between the files and the unknown', what='keys')
    c.eq([c.count('[data-all-fresh]'), c.count('[data-hand-alone]'), c.count('[data-build] [data-verb=update]')], [0, 0, 1], 'zones are left to rebuild: no « Tout est à jour. », the button is there', what='no all-fresh')
    c.eq(norm(c.text('[data-verb=update]')), norm(UT('updateN').replace('{n}', '10')), 'the button counts what it treats: 9 to rebuild + 1 failed (never the zones that wait for the user)', what='label')
    c.eq(norm(c.text('[data-update-notes]')), norm(UT('waitNote').replace('{z}', BT('waiting', 2) + ' · ' + BT('personal', 3))), 'and the note under it says what it leaves to the user: the files, and the tick', what='notes')
    # ---- 2. the notices are information: Afghanistan is green « À jour » on its row, its line is muted and neutral, it is counted up to date, no file button
    _unfold(c, 'af')     # the zones up to date: their notices are under them (SOG-0262: the lower list is gone, the numbers of the sentence unfold the zones)
    zst = lambda zid: c.js("(id) => { const e = document.querySelector('[data-state-zones] [data-zone-row=' + id + '] [data-zstate]'); return e ? [e.dataset.zstate, e.textContent.trim(), e.querySelector('.f-dot')?.dataset.kind, e.tagName] : null }", zid)
    c.eq(zst('af'), ['up-to-date', norm(_trow('up-to-date', lang, after='  zst: {')), 'ok', 'SPAN'], 'Afghanistan: green « À jour », a plain label (nothing to open)', what='af pill')
    c.eq([[norm(t) for t in c.js(f"[...document.querySelectorAll('{row('af')} [data-zone-notice]')].map(p => p.textContent)")], c.js(f"(() => {{ const p = document.querySelector('{row('af')} [data-zone-notice]'); return [p.classList.contains('f-muted'), p.hasAttribute('data-level'), p.className.includes('warn') || p.className.includes('err')] }})()")],
         [[norm(ZR('no-points'))], [True, False, False]], 'its information line: muted, no state colour', what='af notice')
    c.eq([c.count(f"{row('af')} [data-zone-action]"), c.count(f"{row('af')} [data-verb=pickup]"), c.count(f"{row('af')} [data-act=zone-upload]")], [0, 0, 0], 'and no file to take for Afghanistan', what='af no file')
    c.eq([c.count('[data-state-zones] [data-zone-notice]'), c.count('[data-state-sentence] [data-filter=failed]')], [10, 1], 'ten notices (never counted: the 60 up to date are 60)', what='notices')
    # ---- 3. the 13 reasons have a text, an unknown code is said with its code (bounded, never as markup), the closed list is the 13
    r = c.js(_L87_JS, _L87_CODES)
    c.eq(r['closed'], sorted(_L87_CODES), 'the closed list of reason codes the page reads is the launcher’s thirteen', what='closed list')
    bad = [t for t in r['texts'] if t[0] != t[1] or len(t[2]) < 8 or '{' in t[2] or 'undefined' in t[2] or t[2] == ZR('unknown')]
    c.ok(not bad, bad, 'each of the 13 codes is read as itself and has its own text in the language of the run (no placeholder left, never the unknown one)')
    c.eq(len({t[2] for t in r['texts']}), 13, 'thirteen different sentences', what='distinct')
    c.eq([norm(r['unknown']), norm(r['hostile']), norm(r['none'])], [norm(unknown('zz-new_code')), norm(unknown(shown_hostile)), norm(unknown('?'))],
         'an unknown code is said with its code (« Raison du lanceur : … »), cut to [a-z0-9_-] and 40 characters; never « Raison non reconnue »', what='unknown')
    c.eq([norm(_trow('unknown', lang, after='  zr: {')).find('{code}') >= 0, 'unrecognised' in norm(r['unknown']).lower() or 'non reconnue' in norm(r['unknown']).lower()], [True, False], 'the text of the unknown reason carries the code', what='unknown row')
    c.eq(r['tones'], {'up-to-date': 'ok', 'stale': 'warn', 'never-built': 'warn', 'failed': 'err', 'building': 'accent'}, 'the tones of the zones are the three states (green, amber, red) and the blue of the page at work: no brown, no grey state', what='tones')
    # in the screen: the unknown code of a row, and the hostile one not as markup
    _unfold(c, 'q63')
    c.js("document.querySelector('[data-state-zones] [data-zone-row=q63] [data-act=zone-why]').scrollIntoView({ block: 'center' })")
    c.tap(f"{row('q63')} [data-act=zone-why]")
    c.until(f"!!document.querySelector('{row('q63')} [data-zone-why]')", timeout=4000, what='the reason of q63 opens')
    c.eq(norm(c.text(f"{row('q63')} [data-zone-why]")), norm(unknown('zz-new_code')), 'the zone with a code the page does not know says the code', what='q63 why')
    c.tap(f"{row('q63')} [data-act=zone-why]")
    _unfold(c, 'q64')
    c.js(f"document.querySelector('{row('q64')} [data-act=zone-why]').scrollIntoView({{ block: 'center' }})")
    c.tap(f"{row('q64')} [data-act=zone-why]")
    c.until(f"!!document.querySelector('{row('q64')} [data-zone-why]')", timeout=4000, what='the reason of q64 opens')
    c.eq([norm(c.text(f"{row('q64')} [data-zone-why]")), c.count(f"{row('q64')} [data-zone-why] b")], [norm(unknown(shown_hostile)), 0], 'a hostile code is cut and escaped: no element comes out of it', what='q64 why')
    c.tap(f"{row('q64')} [data-act=zone-why]")
    # ---- 4. the file buttons: only on the zones that wait for a file; the zones that wait for the tick have none and say what to tick, with a link to the box
    _unfold(c, 'gb')
    hand = c.js("[...document.querySelectorAll('[data-state-zones] [data-zone-row]')].filter(r => r.querySelector('[data-verb=pickup], [data-act=zone-upload]')).map(r => r.dataset.zoneRow)")
    c.eq(hand, ['gb', 'us'], 'the file buttons (« Prendre le fichier téléchargé », « Choisir le fichier… ») are on the two zones that wait for a file (pickup-waiting, source-missing) and nowhere else', what='file buttons')
    short = lambda s: re.sub(r'\s*\(.*\)\s*$', '', s)
    _unfold(c, 'pt')
    for zid in ('pt', 'ie', 'se'):
        line = norm(c.text(f"{row(zid)} [data-personal-wait] .f-muted"))
        pre = norm(ZR('personal-undeclared').replace('{c}', certify).split('{source}')[0])
        post = norm(ZR('personal-undeclared').replace('{c}', certify).split('{source}')[1])
        c.ok(line.startswith(pre) and line.endswith(post), line, f'{zid}: « Cochez « {certify} » (en bas de la liste) pour que la source … soit lue. »')
        c.eq([c.count(f"{row(zid)} [data-act=zone-certify]"), norm(c.text(f"{row(zid)} [data-act=zone-certify]")), c.count(f"{row(zid)} [data-verb=pickup]"), c.count(f"{row(zid)} [data-act=zone-upload]"), c.count(f"{row(zid)} [data-pick]")],
             [1, norm(_trow('toCertify', lang)), 0, 0, 0], f'{zid}: a link to the box, no file button (Portugal included, though its file is chosen by hand)', what=f'{zid} line')
    c.ok('NAV Portugal' in c.text(f"{row('pt')} [data-personal-wait]"), c.text(f"{row('pt')} [data-personal-wait]"), 'Portugal names its source')
    c.eq(norm(c.text(f"{row('pt')} [data-zone-why]")) if c.count(f"{row('pt')} [data-zone-why]") else '', '', 'the reason line of Portugal is not open on its own', what='pt why closed')
    c.eq(sorted(c.js("[...document.querySelectorAll('[data-state-zones] [data-zone-row]')].map(r => r.dataset.zoneRow)")), ['ie', 'pt', 'se'], 'it unfolds its three zones in place, like the others', what='unfold personal')
    c.tap(f"{row('pt')} [data-act=zone-certify]")
    c.until("document.activeElement?.matches('[data-certify]')", timeout=4000, what='the link brings the box to the focus')
    box = c.js("(() => { const r = document.querySelector('[data-certify]').getBoundingClientRect(); return [r.top >= 0, r.bottom <= window.innerHeight] })()")
    c.eq(box, [True, True], 'and into view', what='box in view')
    # ---- 5. the legend of the map: three states, the colours follow it
    c.until("document.querySelectorAll('[data-wmap] path[data-zone]').length === 4", timeout=15000, what='the world map')
    leg = c.js("(() => { const p = document.querySelector('[data-cw-legend]'); return [[...p.querySelectorAll('.d-sw[data-tone]')].map(s => s.dataset.tone), p.textContent] })()")
    L = lambda k: _trow(k, lang, after='mapLegendBase: {')
    c.eq(leg[0], ['ok', 'warn', 'err', 'muted'], 'the legend has the three states (green, amber, red) and the grey of the zones outside the coverage', what='swatches')
    c.ok(all(norm(L(k)) in norm(leg[1]) for k in ('ok', 'warn', 'err')), leg[1], 'it says them in words: à jour, à faire, en échec')
    c.tap('[data-act=legend-more]')
    c.until("!!document.querySelector('[data-cw-legend-more]')", timeout=3000, what='the second line of the legend')
    c.ok(norm(_trow('hatch', lang, after='  cw: {')) in norm(c.text('[data-cw-legend-more]')), c.text('[data-cw-legend-more]'), 'the hatch of the procedures is said behind the « ? »')
    c.ok(norm(_trow('accent', lang, after='mapTone: {')) not in norm(leg[1]), leg[1], 'no fourth state in the legend (not « en cours »)')
    tones = {zid: c.js(f"document.querySelector('[data-wmap] path[data-zone={zid}]').dataset.tone") for zid in ('fr', 'gb', 'us', 'es')}
    c.eq(tones, {'fr': 'ok', 'gb': 'warn', 'us': 'warn', 'es': 'err'}, 'on the map: up to date green, a zone that waits for a file amber, the failed one red', what='map tones')
    # ---- 6. SOG-0261: the « pourquoi ? » of a row says it opens something, keeps the scroll, folds on the second tap
    _unfold(c, 'q60')
    hint = f"{row('q60')} button.d-st [data-why-hint]"
    c.js(f"document.querySelector('{row('q60')}').scrollIntoView({{ block: 'center' }})")
    c.wait(300)
    c.eq([norm(c.text(hint)), c.count(f'{hint} .d-chev'), c.attr(f"{row('q60')} button.d-st", 'aria-expanded')], [norm(_trow('whyHint', lang)), 1, 'false'], 'the dotted state word says « pourquoi ? » with a chevron, and that it is closed', what='hint')
    pos = lambda: c.js("() => [Math.round(window.scrollY), 0]")
    y0 = pos()
    c.ok(y0[0] > 30 or y0[1] > 30, y0, 'the list is scrolled down (page or its own frame) before the tap: a real case, not a row at the top')
    c.tap(f"{row('q60')} button.d-st")
    c.until(f"!!document.querySelector('{row('q60')} [data-zone-why]')", timeout=4000, what='the reason opens')
    c.wait(300)
    y1 = pos()
    c.ok(abs(y1[0] - y0[0]) <= 2 and abs(y1[1] - y0[1]) <= 2, [y0, y1], 'the tap on the state word does not move the scroll (page and list within 2 px)')
    c.eq([c.attr(f"{row('q60')} button.d-st", 'aria-expanded'), norm(c.text(f"{row('q60')} [data-zone-why]"))], ['true', norm(ZR('parser-old').replace('{built}', '23').replace('{current}', '28'))], 'aria-expanded is true and the reason is said', what='open')
    c.eq(c.js("document.activeElement?.matches('[data-act=zone-why]')"), True, 'the word keeps the focus', what='focus')
    c.tap(f"{row('q60')} button.d-st")
    c.until(f"!document.querySelector('{row('q60')} [data-zone-why]')", timeout=4000, what='the second tap folds it')
    c.wait(300)
    y2 = pos()
    c.ok(abs(y2[0] - y0[0]) <= 2 and abs(y2[1] - y0[1]) <= 2, [y0, y2], 'folding does not move it either')
    c.eq(c.attr(f"{row('q60')} button.d-st", 'aria-expanded'), 'false', 'closed again', what='folded')
    # ---- the delivered state, read by the ergonomist
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    if c.width in (390, 1280):
        c.js("document.querySelector('[data-state-head]').scrollIntoView({ block: 'start' }); window.scrollBy(0, -90)")
        c.shot(f'L87_{c.width}_{lang}_delivered.png')
        _unfold(c, 'pt')
        c.js(f"document.querySelector('{row('pt')}').scrollIntoView({{ block: 'center' }})")
        c.shot(f'L87_{c.width}_{lang}_personal.png')
    # ---- 7. only zones that wait for the user are left: the sentence says what they wait for, never « Tout est à jour. » next to it
    st['status'] = full(**PERS)
    c.page.reload(wait_until='load')
    _head(c)
    _all_open(c)
    _l87_ready(c, st, 'personal only')
    c.eq(keys(), ['upToDate', 'personal'], 'only the zones that wait for the tick are left', what='keys personal')
    c.eq([c.count('[data-all-fresh]'), c.count('[data-build] [data-verb=update]'), norm(c.text('[data-hand-alone]'))], [0, 0, norm(_trow('handAlone', lang, row=0 if _one(lang, 3) else 1).replace('{z}', z(3)))],
         'nothing to rebuild but three zones that wait: no « Tout est à jour. », no empty button, the sentence says what they wait for', what='hand alone')
    st['status'] = full()
    c.page.reload(wait_until='load')
    _head(c)
    _all_open(c)
    _l87_ready(c, st, 'all fresh')
    c.eq([keys(), c.count('[data-all-fresh]'), c.count('[data-hand-alone]'), c.count('[data-build] [data-verb=update]'), norm(c.text('[data-all-fresh]'))], [['upToDate'], 1, 0, 0, norm(_trow('allFresh', lang))],
         'everything up to date (the notices do not count): « Tout est à jour. », nothing else, no button', what='all fresh')
    _unfold(c, 'af')
    c.eq(c.count('[data-state-zones] [data-zone-notice]'), 10, 'the information lines stay under their zones', what='notices stay')
    # ---- 8. the busy sentence is said ONCE: by the card, not again under the button
    st['status'] = mixed
    c.page.reload(wait_until='load')
    _head(c)
    _all_open(c)
    _l87_ready(c, st, 'busy')
    st['start'] = (409, {'reason': 'busy', 'job': 'o1', 'running': R})      # the status is read; now every start is refused: an operation runs
    busy = norm(_trow('busy', lang, after='  greyReason: {'))
    _untick(c, *[z for z in ALL if z != 'ca'])      # the coverage is Canada alone: « Tout recalculer » is one run (more than 60 are cut into several)
    c.tap('[data-verb=build]')
    c.until("!!document.querySelector('[data-build] [data-busy-card]')", timeout=8000, what='the card of the running operation')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.eq([c.count('[data-build] [data-busy-card]'), norm(c.text('[data-build]')).count(busy)], [1, 1], 'the busy sentence is said once on the base panel: the card’s title', what='said once')
    c.eq([c.count('[data-build] [data-update-reason]'), c.count('[data-build] [data-pickup-reason]'), c.count('[data-build] [data-reason]'), c.count('[data-build] [data-zone-grey]')], [0, 0, 0, 0],
         'no grey-reason line under the update button, in the fold, under the buttons or on a zone line', what='no grey line')
    if c.width in (390, 1280):
        c.js("document.querySelector('[data-build] [data-busy-card]').scrollIntoView({ block: 'center' })")
        c.shot(f'L87_{c.width}_{lang}_busy.png')
    c.check_errors()


# ------------------------------------------------------------------------------------------------------ L88
_L88_RECTS = {'es': [-9, 36, 3, 43], 'fr': [-5, 43, 8, 51], 'gb': [-8, 50, 2, 59], 'de': [6, 47, 15, 55], 'it': [7, 37, 18, 47], 'ca': [-125, 49, -60, 60], 'us': [-124, 25, -67, 49], 'jp': [130, 31, 145, 45]}
_L88_NAMES = {'es': ['Espagne', 'Spain', 'Spanien', 'España'], 'fr': ['France', 'France', 'Frankreich', 'Francia'], 'gb': ['Royaume-Uni', 'United Kingdom', 'Vereinigtes Königreich', 'Reino Unido'],
              'de': ['Allemagne', 'Germany', 'Deutschland', 'Alemania'], 'it': ['Italie', 'Italy', 'Italien', 'Italia'], 'ca': ['Canada', 'Canada', 'Kanada', 'Canadá'],
              'us': ['États-Unis', 'United States', 'Vereinigte Staaten', 'Estados Unidos'], 'jp': ['Japon', 'Japan', 'Japan', 'Japón']}
_L88_NOREADER = 'naviair'


def _l88_outlines():
    """The stubbed zoneOutlines(): a ring (a rectangle with a notch, so it is not only its frame) per zone, but the United States (the frame alone: dashed)."""
    out = {}
    for z, (w, s, e, n) in _L88_RECTS.items():
        out[z] = {'name': _L88_NAMES[z], 'box': [w, s, e, n], 'rings': [] if z == 'us' else [[[w, s], [e, s], [e, n], [(w + e) / 2, n - 1], [w, n], [w, s]]]}
    return out


def _l88_steps(x4):
    """What the catalogue of aerodb 5cc4e909b gives for the SIA (stepsOf): two files, the second one's path to check; the links are the suite's own (never the real ones)."""
    return {'sia': {'id': 'sia', 'page': {'url': 'https://sia.example/page-du-cycle', 'home': 'https://sia.example/'}, 'files': [
        {'name': 'export_xml_bd_SIA_<AAAA-MM-JJ>-v<nn>.zip', 'file': 'export_xml_bd_SIA_<AAAA-MM-JJ>-v<nn>.zip', 'gives': x4('gives one'), 'what': x4('what one'),
         'where': x4('SIA › Produits › Données AIM › XML'), 'verified': True},
        {'name': 'ENR 3.2.pdf', 'file': 'ENR 3.2.pdf', 'link': 'https://sia.example/enr32', 'gives': x4('gives two'), 'what': x4('what two'), 'where': x4('SIA › AIP › ENR › ENR 3.2'), 'verified': False}]},
            # a source its publisher no longer offers (AeroDB 48cc3811c): stepsOf(id).unavailable = { since, note[4] }
            'dircam': {'id': 'dircam', 'page': {'url': 'https://dircam.example/page', 'home': 'https://dircam.example/'}, 'files': [], 'unavailable': {'since': '2025-11', 'note': x4('unavailable note')}}}


def _l88_cycle(args):
    """The result of base/cycle { zone } as AeroDB's K182 gives it: the SIA (by hand) and openAIP (by the launcher) for France; Germany is outside the coverage and its Naviair-like source has no reader."""
    zone = args.get('zone')
    sia = {'id': 'sia', 'label': ['SIA France', 'SIA France', 'SIA Frankreich', 'SIA Francia'], 'regime': 'hand', 'personal': False, 'zoneCount': 1, 'zones': ['fr'],
           'steps': {'download': {'state': 'done', 'cycle': '2026-10-29', 'at': '2026-11-02T08:00:00Z', 'edition': 'AIRAC 2611'}, 'build': {'zones': 1, 'upToDate': 0}, 'publish': {'published': 0, 'unpublished': 1, 'unknown': 0}},
           'hand': {'link': 'https://sia.example/page-du-cycle', 'expected': ['export_xml_bd_SIA_<AAAA-MM-JJ>-v<nn>.zip', 'ENR 3.2.pdf'], 'inDownloads': ['export_xml_bd_sia_2026-10-29-v01.zip']}}
    oaip = {'id': 'openaip', 'label': ['openAIP <img src=x onerror=window.__pwn=1>', 'openAIP', 'openAIP', 'openAIP'], 'regime': 'auto', 'personal': False, 'zoneCount': 70,
            'steps': {'download': {'state': 'late', 'cycle': '2026-10-01', 'at': '2026-10-05T08:00:00Z'}, 'build': {'zones': 1, 'upToDate': 1}, 'publish': {'published': 1, 'unpublished': 0, 'unknown': 0}}, 'why': 'older-than-cycle'}
    dircam = {'id': 'dircam', 'label': ['DIRCAM', 'DIRCAM', 'DIRCAM', 'DIRCAM'], 'regime': 'hand', 'personal': False, 'zoneCount': 1, 'zones': ['fr'], 'unavailable': {'since': '2025-11'},
              'steps': {'download': {'state': 'unavailable'}, 'build': {'zones': 1, 'upToDate': 0}, 'publish': {'published': 0, 'unpublished': 0, 'unknown': 1}}, 'why': 'unavailable-at-publisher',
              'hand': {'link': 'https://dircam.example/page', 'expected': ['MIAM_OACI_ENR 5.7.pdf'], 'inDownloads': []}}
    views = {'fr': {'zone': 'fr', 'known': True, 'inCoverage': True, 'sources': [sia, oaip, dircam],
                    'state': {'state': 'stale', 'builtCycle': '2026-10-01', 'builtAt': '2026-10-05T10:00:00Z', 'expectedCycle': '2026-10-29', 'publish': {'state': 'unpublished', 'commit': 'abc', 'at': '2026-10-05T11:00:00Z'}, 'notices': [], 'reasons': ['source-newer']},
                    'addWillAsk': {'sources': ['sia', 'openaip'], 'auto': ['openaip'], 'hand': [{'id': 'sia', 'expected': ['export_xml_bd_SIA_<AAAA-MM-JJ>-v<nn>.zip']}], 'personal': [], 'noReader': []}},
             'de': {'zone': 'de', 'known': True, 'inCoverage': False, 'sources': [{**oaip, 'steps': {'download': {'state': 'missing'}, 'build': {'zones': 1, 'upToDate': 0}, 'publish': {'published': 0, 'unpublished': 0, 'unknown': 1}}, 'why': 'not-downloaded'}], 'state': None,
                    'addWillAsk': {'sources': ['openaip'], 'auto': ['openaip'], 'hand': [], 'personal': [], 'noReader': [_L88_NOREADER]}}}
    return {'ok': True, 'cycle': {'inForce': '2026-10-29', 'next': '2026-11-26', 'ids': {'inForce': '2611', 'next': '2612'}}, 'items': [], 'next': {'cycle': '2026-11-26', 'items': []}, 'unread': [],
            **({'zoneView': views[zone]} if zone in views else {})}


@case('L88', 'Données: the world map, the country packs and the country sheet replace the flat list of zones (SOG-0262, lot A) — the page order, the map framed on the coverage with its outlines, three states, hatch for procedures, a blue border for the open pack, the hovered country alone in solid; packs with their summarised state, one open at a time; the sheet (right of the map, full screen on a phone) with its ticks and its inventory in three beats; no selection left',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=True, night=False,
      rule='SOG-0262 (the user: « faire disparaître la liste totale des pays, et remplacer par les paquets de pays »; « non aux pastilles, on reste sur les contours de pays actuels »; sheet « à droite, c\'est très bien. sur téléphone, full screen »; each file in three beats: what it is, where to find it, its name): the base panel reads, top to bottom, the state bar, the map, the packs; the flat list, « Seulement les périmés », « Tout désélectionner » and the ticks are gone; a tap on a country opens its sheet; K182 (base/cycle { zone }) feeds the sheet, read once per opened sheet')
def l88(c):
    lang = c.lang
    li = {'fr': 0, 'en': 1, 'de': 2, 'es': 3}[lang]
    CW = lambda k, row=0: _trow(k, lang, after='  cw: {', row=row)
    x4 = lambda s: [f'{s} fr', f'{s} en', f'{s} de', f'{s} es']
    cfg, _ = _fixture()
    cfg['outlines'] = _l88_outlines()
    cfg['stepsOf'] = _l88_steps(x4)
    cfg['pathCheck'] = ['chemin à vérifier', 'path to check', 'Pfad zu prüfen', 'ruta por verificar']
    for z, names, kb in [('it', _L88_NAMES['it'], 4000), ('jp', _L88_NAMES['jp'], 6000)]:
        cfg['zones'].append({'id': z, 'names': names, 'frames': [], 'published': False, 'publishedKb': kb})
    for z in cfg['zones']:
        z['names'] = _L88_NAMES.get(z['id'], z['names'])
    cfg['packs'] = {'generated': '2026-11-12', 'source': 'test', 'regions': [
        {'id': 'ouest', 'names': ['Europe de l’Ouest', 'Western Europe', 'Westeuropa', 'Europa occidental'], 'zones': ['fr', 'gb', 'es', 'de', 'it']},
        {'id': 'amerique', 'names': ['Amérique du Nord', 'North America', 'Nordamerika', 'Norteamérica'], 'zones': ['ca', 'us']},
        {'id': 'asie', 'names': ['Asie', 'Asia', 'Asien', 'Asia'], 'zones': ['jp']}], 'themes': []}
    cov_view = _view('done', step='Terminé', jid='jc', result={'ok': True, 'zones': {
        'fr': {'cycle': '2026-10-29', 'counts': {}, 'procedures': 9, 'sources': {}, 'procSources': ['eaip']}, 'us': {'cycle': '2026-10-29', 'counts': {}, 'procedures': 3069, 'sources': {}, 'procSources': ['cifp']},
        'gb': {'cycle': '2026-10-29', 'counts': {}, 'procedures': 0, 'sources': {}, 'procSources': []}}})
    st = _launcher(c, [cov_view], verbs=_VERBS + ['base/coverage', 'base/cycle'], cycle=_l88_cycle)
    zs = {'ca': {**_zst('up-to-date'), 'builtAt': '2026-11-01T10:00:00Z', 'publish': {'state': 'published', 'at': '2026-11-01T12:00:00Z'}},
          'es': {**_zst('up-to-date'), 'builtAt': '2026-11-01T10:00:00Z', 'publish': {'state': 'unknown', 'reason': 'no-repo'}},
          'fr': {**_zst('stale', _NEWER), 'builtAt': '2026-10-05T10:00:00Z', 'builtCycle': '2026-10-01', 'publish': {'state': 'unpublished', 'at': '2026-10-05T11:00:00Z'}},
          'gb': _zst('failed', {'code': 'failed', 'error': 'x'}), 'us': {**_zst('up-to-date'), 'builtAt': '2026-11-01T10:00:00Z', 'publish': {'state': 'published', 'at': '2026-11-01T12:00:00Z'}}}
    st['status'] = _status(zs)
    _open(c, cfg)
    _all_open(c)
    c.until("document.querySelectorAll('[data-wmap] path[data-zone]').length === 8 && !!document.querySelector('[data-cw-groups]') && document.querySelectorAll('.d-wh').length === 2", timeout=15000, what='the map, the packs and the hatch')
    c.until("document.querySelector('[data-wmap] path[data-zone=fr]').dataset.tone === 'warn'", timeout=8000, what='the states are on the map')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    # ---- 1. the page order, and what is gone
    pos = c.js("""(() => { const q = s => document.querySelector(s), before = (a, b) => !!(q(a).compareDocumentPosition(q(b)) & Node.DOCUMENT_POSITION_FOLLOWING);
      return [before('[data-state-head]', '[data-world-map]'), before('[data-world-map]', '[data-cw-groups]'), before('[data-cw-groups]', '[data-packs-fold]'), before('[data-cw-groups]', '[data-publish]')] })()""")
    c.eq(pos, [True, True, True, True], 'the page order: the state bar, the map, the packs, then the rest of the base panel (the fold to add or remove countries, Publier)', what='page order')
    c.eq([c.count(s) for s in ('[data-build-zone]', '[data-select-row]', '[data-selection-line]', '[data-build-zones]', '[data-zones-title]', '[data-verb=select-stale]', '[data-verb=select-none]', '[data-zone-map=base]')], [0] * 8,
         'the flat list of the zones, its ticks, « Seulement les périmés », « Tout désélectionner », the selection line and the old map are gone', what='old UI gone')
    # ---- 2. the map: the outlines of the countries (no pastille), framed on the coverage, three states and the hatch
    m = c.js("""(() => { const s = document.querySelector('[data-wmap]'), vb = s.getAttribute('viewBox').split(' ').map(Number), p = id => document.querySelector(`[data-wmap] path[data-zone=${id}]`);
      return { vb, paths: [...s.querySelectorAll('path[data-zone]')].map(e => e.dataset.zone).sort(), shapes: s.querySelectorAll('circle, ellipse').length, tones: ['fr', 'gb', 'es', 'us', 'de', 'jp'].map(z => p(z).dataset.tone),
        approx: ['us', 'fr'].map(z => p(z).hasAttribute('data-approx')), hatch: [...s.querySelectorAll('.d-wh')].map(e => e.dataset.proc).sort(), fill: getComputedStyle(s.querySelector('.d-wh')).fill, w: s.getBoundingClientRect().width, win: window.innerWidth } })()""")
    c.eq(m['paths'], ['ca', 'de', 'es', 'fr', 'gb', 'it', 'jp', 'us'], 'a path per country the suite knows (outlines, one each)', what='paths')
    c.eq(m['shapes'], 0, 'no pastille: only the outlines', what='no dots')
    c.eq(m['tones'], ['warn', 'err', 'ok', 'ok', 'muted', 'muted'], 'the state of the launcher per country (to do, failed, up to date) and grey outside the coverage', what='tones')
    c.eq(m['approx'], [True, False], 'a country known by its frame only is dashed, one with an outline is not', what='approx')
    c.eq(m['hatch'], ['fr', 'us'], 'the hatch on the countries with procedures (procSources of base/coverage: eAIP, CIFP), not on one whose list is empty', what='hatch')
    c.ok(m['fill'].startswith('url('), m['fill'], 'the hatch is a pattern fill')
    c.ok(m['vb'][0] + m['vb'][2] < 100 and m['vb'][0] <= -125 and m['vb'][2] > 150, m['vb'], 'framed on the coverage (Spain to Canada and the United States), not on the world: Japan is out of the frame')
    c.le(m['w'], m['win'], 'the map fits the width', what='map width')
    legend = norm(c.text('[data-cw-legend]'))
    for word in [_trow(k, lang, after='  mapLegendBase: {') for k in ('ok', 'warn', 'err')] + [CW('outside')]:
        c.ok(norm(word) in legend, legend, f'the legend says « {word} »')
    c.eq(c.count('[data-cw-legend-more]'), 0, 'the three states and « outside » are on the line: the hatch, the border and the dashes are behind a « ? »', what='legend short')
    c.tap('[data-act=legend-more]')
    c.until("!!document.querySelector('[data-cw-legend-more]')", timeout=3000, what='the second line of the legend')
    more = norm(c.text('[data-cw-legend-more]'))
    for word in (CW('hatch'), CW('border'), _trow('mapLegendApprox', lang)):
        c.ok(norm(word) in more, more, f'behind the « ? »: « {word} »')
    c.eq(c.attr('[data-act=legend-more]', 'aria-expanded'), 'true', 'the toggle says it is open', what='legend expanded')
    c.tap('[data-act=legend-more]')
    c.until("!document.querySelector('[data-cw-legend-more]')", timeout=3000, what='the second line folds')
    c.tap('[data-act=world-toggle]')
    c.until("(() => { const v = document.querySelector('[data-wmap]').getAttribute('viewBox').split(' ').map(Number); return v[0] + v[2] > 140 })()", timeout=4000, what='the whole world is framed')
    c.eq(norm(c.text('[data-act=map-home]')), norm(_trow('mvHome', lang, after='  zx: {')), 'a second button gives back the framing of the coverage (lot D1: the map zooms, see L96)', what='home button')
    c.tap('[data-act=map-home]')
    c.until("document.querySelector('[data-wmap]').getAttribute('viewBox').split(' ').map(Number).reduce((a, b, i) => i === 2 ? b : a, 0) < 250", timeout=4000, what='the coverage again')
    # ---- 3. the packs: one line each with its summarised state, one open at a time
    c.eq(c.count('[data-group-id]'), 3, 'three packs, always visible (not a folded block)', what='groups')
    c.eq(c.js("document.querySelector('[data-cw-groups]').closest('details:not(.f-group)')"), None, 'the list of the packs is not inside a fold', what='no fold')
    sum = lambda g: norm(c.text(f'[data-group-id={g}] [data-group-sum]'))
    z = lambda n: n
    ouest = ' · '.join([CW('sumOk').replace('{n}', '1').replace('{m}', '3'), CW('sumTodo').replace('{n}', '1'), CW('sumErr').replace('{n}', '1'), CW('sumOut').replace('{n}', '2')])
    c.eq(sum('ouest'), norm(_agree(ouest, lang)), 'Western Europe: 1 of its 3 countries in the coverage up to date, one to do, one failed, two outside the coverage', what='summary ouest')
    c.eq(sum('amerique'), norm(CW('sumOk').replace('{n}', '2').replace('{m}', '2')), 'North America: 2 of 2 up to date', what='summary amerique')
    c.eq(sum('asie'), norm(CW('sumNoCov') + ' · ' + CW('sumOut').replace('{n}', '1')), 'Asia: no country in the coverage, its one country outside it', what='summary asie')
    c.eq(c.count('[data-group-body]'), 0, 'none is open at the start', what='closed')
    c.tap('[data-group-id=ouest] [data-act=grp-toggle]')
    c.until("document.querySelectorAll('[data-group-body]').length === 1", timeout=4000, what='the pack opens')
    c.eq(c.js("[...document.querySelectorAll('[data-group-body] [data-act=open-country]')].map(b => b.dataset.zone)"), ['fr', 'gb', 'es', 'de', 'it'], 'its countries, each one a button', what='countries')
    c.eq(c.js("document.querySelector('[data-group-id=ouest] [data-act=grp-toggle]').getAttribute('aria-expanded')"), 'true', 'the line says it is open', what='expanded')
    word = lambda t: _trow(t, lang, after='    word: {')
    tile = norm(c.text('[data-group-body] [data-zone=fr]'))
    nm = norm(c.js("document.querySelector('[data-group-body] [data-zone=fr] span').textContent"))
    c.ok(tile.startswith(nm) and norm(word('warn')) in tile, tile, 'a country tile: its name and its state in a word (lot D2: with its sign, and « proc. » where it has procedures)')
    accent = c.js("(() => { const i = document.createElement('i'); i.style.color = 'var(--sog-accent)'; document.body.append(i); const v = getComputedStyle(i).color; i.remove(); return v })()")
    br = c.js("['fr', 'gb', 'es', 'de', 'it', 'ca'].map(z => { const p = document.querySelector(`[data-wmap] path[data-zone=${z}]`), s = getComputedStyle(p); return [s.stroke, s.fill, p.hasAttribute('data-grp')] })")
    c.eq([b[0] for b in br[:5]], [accent] * 5, 'the open pack: a blue border (the accent) on all its countries', what='blue border')
    c.ok(br[5][0] != accent and not br[5][2], br[5], 'another pack\'s country has none')
    c.ok(all(b[1] != 'none' for b in br), br, 'the border is not a fill: the fill stays the tint of the state')
    c.tap('[data-group-id=amerique] [data-act=grp-toggle]')
    c.until("document.querySelectorAll('[data-group-body]').length === 1 && !!document.querySelector('[data-group-id=amerique] [data-group-body]')", timeout=4000, what='the other pack opens')
    c.eq([c.count('[data-group-id=ouest] [data-group-body]'), c.js("document.querySelectorAll('[data-wmap] [data-grp]').length")], [0, 2], 'ONE pack open at a time: the first closed, only Canada and the United States are bordered now', what='one at a time')
    # hover: the country alone in solid, the others keep their border
    c.page.hover('[data-group-body] [data-zone=ca]')
    c.until("!!document.querySelector('[data-wmap] path[data-zone=ca][data-hover]')", timeout=3000, what='the hovered country is marked')
    op = c.js("['ca', 'us', 'fr'].map(z => getComputedStyle(document.querySelector(`[data-wmap] path[data-zone=${z}]`)).fillOpacity)")
    c.eq([float(op[0]), float(op[1]) < 1, float(op[2]) < 1], [1.0, True, True], 'the hovered country is filled solid, alone', what='hover fill')
    c.eq(c.js("getComputedStyle(document.querySelector('[data-wmap] path[data-zone=us]')).stroke"), accent, 'the others of the open pack keep their blue border', what='border kept')
    c.page.mouse.move(2, 2)
    c.until("!document.querySelector('[data-wmap] [data-hover]')", timeout=3000, what='the hover ends')
    c.page.hover('[data-wmap] path[data-zone=us]')
    c.until("!!document.querySelector('[data-group-body] [data-zone=us][data-hover]')", timeout=3000, what='the hover on the map marks the line of the pack too')
    c.page.mouse.move(2, 2)
    # the pack's own « Mettre à jour » (SOG-0188) still works: its countries of the coverage only
    n0 = len(st['posts'])
    c.tap('[data-group-id=amerique] [data-act=update-pack]')
    c.until("document.querySelector('.f-modal') || true", timeout=6000)
    c.wait(600)
    c.eq([sorted(p['args'].get('zones', [])) for p in st['posts'][n0:] if p['verb'] == 'status'][:1], [['ca', 'us']], 'the pack\'s update reads the state of ITS countries of the coverage', what='pack update')
    if c.count('.f-modal'):
        c.tap('.f-modal [data-no]')
        c.until("!document.querySelector('.f-modal')", timeout=6000, what='the question closes')
    # ---- 4. the sheet: wide, to the right of the map; phone, the whole screen with a back button
    c.tap('[data-group-id=amerique] [data-act=grp-toggle]')
    c.until("document.querySelectorAll('[data-group-body]').length === 0", timeout=4000, what='the pack closes')
    c.js("document.querySelector('[data-wmap]').scrollIntoView({ block: 'center' })")
    c.wait(200)
    zone_reads = lambda: [p for p in st['posts'] if p['verb'] == 'cycle' and p['args'].get('zone')]
    c.eq([len(zone_reads()), len([p for p in st['posts'] if p['verb'] == 'cycle' and not p['args'].get('zone')])], [0, 1], 'the view of a country is not read until its sheet is opened; the list of the month is read once at the opening', what='lazy')
    c.tap('[data-wmap] path[data-zone=fr]')
    c.until("!!document.querySelector('[data-sheet=fr] [data-sheet-source=sia] [data-file-state]')", timeout=10000, what='the sheet of France with its inventory')
    cyc = zone_reads()
    c.eq([[p['set'], p['args'].get('zone')] for p in cyc], [['base', 'fr']], 'one read of the view per zone for the opened sheet (K182)', what='one read')
    geo = c.js("""(() => { const m = document.querySelector('[data-wmap]').getBoundingClientRect(), s = document.querySelector('[data-sheet]').getBoundingClientRect(), ps = getComputedStyle(document.querySelector('[data-sheet]')).position;
      return { map: [m.left, m.right, m.top], sheet: [s.left, s.right, s.top, s.width, s.height], pos: ps, iw: window.innerWidth, ih: window.innerHeight } })()""")
    if c.width >= 900:
        c.ok(geo['sheet'][0] >= geo['map'][1] - 1 and geo['pos'] != 'fixed', geo, 'wide: the sheet is to the RIGHT of the map')
    else:
        c.ok(geo['pos'] == 'fixed' and abs(geo['sheet'][3] - geo['iw']) <= 1 and abs(geo['sheet'][4] - geo['ih']) <= 1, geo, 'phone: the sheet is the whole screen')
    c.eq(c.js("document.activeElement && document.activeElement.dataset.act"), 'sheet-close', 'the focus goes to « Retour »', what='focus in')
    close = c.js("""(() => { const v = e => !!e && e.offsetParent !== null, b = document.querySelector('[data-sheet] .d-back'), x = document.querySelector('[data-sheet] .d-x');
      return { back: v(b), cross: v(x), backText: b.textContent.trim(), crossLabel: x.getAttribute('aria-label'), r: x.getBoundingClientRect().right, sr: document.querySelector('[data-sheet]').getBoundingClientRect().right } })()""")
    if c.width >= 900:
        c.ok(close['cross'] and not close['back'] and close['crossLabel'] == _trow('close', lang, after='  cwb: {') and close['sr'] - close['r'] < 24, close, 'wide: a « Fermer » cross at the top right of the panel, no « Retour »')
    else:
        c.ok(close['back'] and not close['cross'] and norm(close['backText']) == norm(CW('back')), close, 'phone: « ← Retour » (the sheet is the whole screen), no cross')
    # content: name, state, built, procedures, ticks, inventory
    c.eq(norm(c.text('[data-sheet-name]')), norm(_L88_NAMES['fr'][li]), 'the name of the country', what='name')
    c.eq(c.js("document.querySelector('[data-sheet] [data-zstate]').dataset.zstate"), 'stale', 'its state', what='state')
    facts = lambda key: c.js(f"(() => {{ const e = document.querySelector('[data-sheet-facts] [data-tick={key}]'), n = document.querySelector('[data-sheet] [data-cell-note={key}]'); return e ? [e.dataset.ok, (e.textContent + ' ' + (n ? n.textContent : '')).replace(/[\s\\u00a0\\u202f]+/g, ' ').trim()] : null }})()")
    built = facts('build')
    c.ok(built[0] == 'todo' and _date_text(datetime.date(2026, 10, 5), lang) in built[1] and '2610' in built[1], built, 'built (a fact of the COUNTRY, once, at the top): ○ to do (not a failure: nothing failed), the reason, then the date and the cycle of the last build')
    c.ok('eAIP' in c.text('[data-sheet-proc]'), c.text('[data-sheet-proc]'), 'procedures: yes, from the eAIP (procSources)')
    c.eq(c.js("[...document.querySelectorAll('[data-sheet] [data-sheet-source]:not([data-unavailable])')].map(e => e.dataset.sheetSource)"), ['sia', 'openaip'], 'the sources that feed France, in the order the launcher gives', what='sources')
    gone = c.js("(() => { const e = document.querySelector('[data-sheet] [data-sheet-source][data-unavailable]'); return e ? [e.dataset.sheetSource, e.textContent.replace(/\s+/g, ' '), e.querySelectorAll('[data-tick], [data-inventory]').length, document.querySelector('[data-unavailable-title]').compareDocumentPosition(e) & 4] : null })()")
    c.ok(gone and gone[0] == 'dircam' and f'unavailable note {lang}' in gone[1] and '2025-11' in gone[1] and gone[2] == 0 and gone[3] == 4, gone, 'a source its publisher no longer offers is said APART, under its own title, with the note of the catalogue and since when: no tick, no inventory, neither « en retard » nor « à faire »')
    tk = lambda src, key: c.js(f"(() => {{ const e = document.querySelector('[data-sheet-source={src}] [data-tick={key}]'); return e ? [e.dataset.ok, e.textContent.replace(/[\s\\u00a0\\u202f]+/g, ' ').trim()] : null }})()")
    c.eq(c.count('[data-sheet-source] [data-tick=build], [data-sheet-source] [data-tick=publish]'), 0, 'under each source ONLY « téléchargé »: « construit » and « publié » are facts of the country, never repeated per source (no more « construit : pas à jour : Source SIA… » under openAIP)', what='no per-source build tick')
    d1 = tk('sia', 'download')
    c.ok(d1[0] == 'yes' and _date_text(datetime.date(2026, 11, 2), lang) in d1[1] and 'AIRAC 2611' in d1[1], d1, 'SIA downloaded: ticked with the date and the edition the launcher gives')
    p1 = facts('publish')
    c.ok(p1[0] == 'na' and norm(_trow('pubWaitBuild', lang, after='  zx: {')) in norm(p1[1]), p1, 'published (a fact of the country): — not yet possible, the country is not built (lot D1: the four signs)')
    o1 = tk('openaip', 'download')
    c.ok(o1[0] == 'todo' and norm(_trow('older-than-cycle', lang, after='    why: {')) in norm(o1[1]), o1, 'a file older than the cycle in force: a reason in words, not a tick')
    c.eq(c.count('[data-sheet] img'), 0, 'the launcher\'s label is escaped (no element, nothing runs)', what='escaped')
    c.eq(c.js('window.__pwn === undefined'), True, 'nothing ran', what='no pwn')
    inv = c.js("""[...document.querySelectorAll('[data-sheet-source=sia] [data-file]')].map(f => ({ what: f.querySelector('[data-file-what]').textContent, path: (f.querySelector('[data-file-path]') || {}).textContent || '', check: !!f.querySelector('[data-path-check]'),
      checkLast: !!f.querySelector('[data-file-where] > [data-path-check]:last-child'), links: [...f.querySelectorAll('a')].map(a => a.getAttribute('href')), linkText: [...f.querySelectorAll('a')].map(a => a.textContent.trim()),
      lines: [...f.children].map(e => e.matches('[data-file-what]') ? 'what' : e.matches('[data-file-where]') ? 'where' : e.matches('[data-file-name]') ? 'file' : '?'), where: (f.querySelector('[data-file-where]') || {}).textContent || '',
      fileLine: (f.querySelector('[data-file-name]') || {}).textContent || '', name: f.querySelector('code').textContent, state: f.querySelector('[data-file-state]').dataset.fileState }))""")
    c.eq([i['lines'] for i in inv], [['what', 'where', 'file']] * 2, 'one file = three lines, in this order: what it is, « Où : … », « Fichier : … »', what='three lines')
    c.ok(all(norm(i['where']).startswith(norm(_trow('wherePath', lang, after='  cw: {').split('{p}')[0])) for i in inv), [i['where'] for i in inv], 'the « Où » line starts with its label and carries the path')
    c.eq([i['linkText'] for i in inv], [[_trow('pageLink', lang, after='  cw: {')]] * 2, 'ONE link per file, one single label that says what it opens (a page)', what='link label')
    c.eq([i['checkLast'] for i in inv], [False, True], '« chemin à vérifier » closes the « Où » line (only when the path is not verified)', what='check at the end')
    c.ok(all(norm(i['fileLine']).startswith(norm(_trow('name', lang, after='  cw: {').split('{n}')[0])) for i in inv), [i['fileLine'] for i in inv], 'the file line starts with « Fichier : » and ends with its state')
    c.eq([i['what'] for i in inv], [f'what one {lang}', f'what two {lang}'], 'beat one: what each file is, in a pilot\'s words (the catalogue\'s `what`)', what='what')
    c.ok(f'SIA › Produits › Données AIM › XML {lang}' in inv[0]['path'] and f'SIA › AIP › ENR › ENR 3.2 {lang}' in inv[1]['path'], inv, 'beat two: where to find it, rubric by rubric')
    c.eq([i['check'] for i in inv], [False, True], 'a path not verified says « chemin à vérifier » next to it, a verified one does not', what='path to check')
    c.eq([i['links'] for i in inv], [['https://sia.example/page-du-cycle'], ['https://sia.example/enr32']], 'the link of the page of the source, or of that very file when the catalogue gives one — never an invented one', what='links')
    c.eq([i['name'] for i in inv], ['export_xml_bd_SIA_<AAAA-MM-JJ>-v<nn>.zip', 'ENR 3.2.pdf'], 'beat three: the name of the file expected', what='names')
    c.eq([i['state'] for i in inv], ['seen', 'missing'], 'seen in Downloads (a name that fits the pattern, whatever its case) / missing', what='seen / missing')
    c.eq(c.count('[data-sheet] [data-sheet-source=openaip] [data-inventory]'), 0, 'a source the launcher takes alone has no inventory', what='no inventory for auto')
    c.eq([c.count('[data-sheet] [data-sheet-actions]'), c.count('[data-sheet] [data-sheet-update]')], [0, 1], 'the temporary buttons of the line of a zone are gone from the sheet: the gestures of lot B are there (L89)', what='gestures')
    if c.width in (390, 1280):
        c.shot(f'L88_{c.width}_{lang}_delivered_sheet.png')
    # close: the sheet goes, the focus returns to the opener
    c.tap('[data-sheet] [data-act=sheet-close]:visible')
    c.until("!document.querySelector('[data-sheet]')", timeout=4000, what='the sheet closes')
    c.eq(c.js("(document.activeElement.dataset || {}).zone + '|' + document.activeElement.tagName.toLowerCase()"), 'fr|path', 'the focus returns to the country that opened it', what='focus back')
    # a country outside the coverage opens a sheet too: it says so; Germany has a source with no reader
    c.tap('[data-group-id=ouest] [data-act=grp-toggle]')
    c.tap('[data-group-body] [data-zone=de]')
    c.until("!!document.querySelector('[data-sheet=de] [data-sheet-noreader]')", timeout=10000, what='the sheet of Germany')
    c.eq([c.count('[data-sheet] [data-sheet-out]'), c.count('[data-sheet] [data-tick]'), c.count('[data-sheet] [data-sheet-update], [data-sheet] [data-hand]')], [1, 0, 0], 'outside the coverage: it says so, no tick, no gesture', what='outside')
    c.key('Escape')
    c.until("!document.querySelector('[data-sheet]')", timeout=4000, what='Escape closes the sheet')
    c.eq(c.js("(document.activeElement.dataset || {}).zone"), 'de', 'and the focus returns to the line that opened it', what='focus back (line)')
    c.eq(c.js("document.documentElement.scrollWidth <= window.innerWidth"), True, 'no horizontal scroll', what='no sideways scroll')
    # screens: the map and the packs (one open), then the sheet above
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.js("document.querySelector('[data-world-map]').scrollIntoView({ block: 'start' })")
    if c.width in (390, 1280):
        c.shot(f'L88_{c.width}_{lang}_delivered.png')
    c.check_errors()


# ------------------------------------------------------------------------------------------------------ L89 .. L92 (SOG-0262, lot B)
_L89_LABEL = lambda i: [f'{i} fr', f'{i} en', f'{i} de', f'{i} es']


def _l89_item(i, reg, dl, build=(1, 1), pub=(1, 0, 0), zones=None, why=None, hand=None, label=None, unavailable=None):
    """One source of the list of the cycle as AeroDB's K179 gives it: { id, label[4], regime, steps: { download, build, publish }, zones?, why?, hand?, unavailable? }."""
    it = {'id': i, 'label': label or _L89_LABEL(i), 'regime': reg, 'personal': False, 'zoneCount': len(zones) if zones else 70,
          'steps': {'download': dl, 'build': {'zones': build[0], 'upToDate': build[1]}, 'publish': {'published': pub[0], 'unpublished': pub[1], 'unknown': pub[2]}}}
    if zones is not None:
        it['zones'] = zones
    if why:
        it['why'] = why
    if hand is not None:
        it['hand'] = hand
    if unavailable:
        it['unavailable'] = unavailable
    return it


def _l89_cycle(world):
    """base/cycle from a LIVE `world` (the test flips `sia_seen` between steps): ten sources counted + one the publisher no longer offers; with `zone`, the view of that country (K182)."""
    def answer(args):
        seen = world['sia_seen']
        sia = _l89_item('sia', 'hand', {'state': 'waiting' if seen else 'missing'}, (1, 0), (0, 1, 0), ['fr'], 'newer-in-downloads' if seen else 'no-file',
                        {'link': 'https://sia.example/page-du-cycle', 'expected': ['export_xml_bd_SIA_<AAAA-MM-JJ>-v<nn>.zip', 'ENR 3.2.pdf'], 'inDownloads': ['export_xml_bd_sia_2026-10-29-v01.zip'] if seen else []})
        nats = _l89_item('nats', 'hand', {'state': 'late', 'cycle': '2026-10-01', 'at': '2026-10-05T08:00:00Z'}, (1, 0), (0, 0, 1), ['gb'], 'older-than-cycle',
                         {'link': 'https://nats.example/aip', 'expected': ['EG_AIP_DS_<AAAAMMJJ>_XML.zip'], 'inDownloads': []})
        lfv = _l89_item('lfv', 'hand', {'state': 'missing'}, (1, 0), (0, 1, 0), ['se'], 'no-file', {'link': 'https://lfv.example/', 'expected': ['AIP_OFFLINE.zip'], 'inDownloads': []})
        story = world.get('dircam_story')   # L119: a coherent story for DIRCAM - nothing taken (« missing », the file not seen) until the launcher has received the PDF, then taken (« done », the file seen in the upload folder)
        have = not story or world.get('dircam_in')
        dircam = _l89_item('dircam', 'hand', {'state': 'done', 'cycle': '2026-10-29', 'at': '2026-11-02T08:00:00Z'} if have else {'state': 'missing'}, (1, 1 if have else 0), (1, 0, 0) if have else (0, 1, 0), ['fr'], None if have else 'no-file',
                           {'link': 'https://sia.example/info_dircam', 'expected': ['MIAM_OACI_ENR 5.7.pdf'], 'inDownloads': ['MIAM_OACI_ENR 5.7.pdf'] if story and have else []})
        mora = _l89_item('mora', 'local', {'state': 'n/a'}, (5, 5), (5, 0, 0))
        faa = _l89_item('faa', 'auto', {'state': 'done', 'cycle': '2026-10-29', 'at': '2026-11-02T08:00:00Z'}, (1, 1), (0, 1, 0), ['us'])
        navcan = _l89_item('navcan', 'auto', {'state': 'missing'}, (1, 0), (0, 1, 0), ['ca'], 'not-downloaded')
        xplane = _l89_item('xplane', 'local', {'state': 'n/a'}, (5, 3), (3, 2, 0), None, None, None, ['X-Plane <img src=x onerror=window.__pwn=1>', 'X-Plane', 'X-Plane', 'X-Plane'])
        openaip = _l89_item('openaip', 'auto', {'state': 'done', 'cycle': '2026-10-29', 'at': '2026-11-02T08:00:00Z'}, (5, 5), (5, 0, 0))
        enaire = _l89_item('enaire', 'auto', {'state': 'done', 'cycle': '2026-10-29', 'at': '2026-11-02T08:00:00Z'}, (1, 1), (1, 0, 0), ['es'])
        ukmil = _l89_item('ukmil', 'hand', {'state': 'unavailable'}, (1, 0), (0, 0, 1), ['gb'], 'unavailable-at-publisher', {'link': 'https://ukmil.example/', 'expected': ['ENR-5-2.pdf'], 'inDownloads': []}, None, {'since': '2025-11'})
        items = [mora, openaip, enaire, dircam] if world.get('done') else [mora, faa, navcan, xplane, lfv, openaip, nats, enaire, sia, dircam, ukmil]
        local = None
        if world.get('local'):   # K185 (lot D3): the sources computed on this workstation are OUT of `items`, said apart under `local`
            items = [it for it in items if it['regime'] != 'local']
            inj = '<img src=x onerror=window.__pwn=1>'
            local = [{'id': 'mora', 'label': _L89_LABEL('MORA'), 'at': '2026-11-05T08:00:00Z', 'personal': False, 'zoneCount': 5},
                     {'id': 'xplane', 'label': _L89_LABEL('X-Plane'), 'at': None, 'personal': False, 'zoneCount': 3},
                     {'id': 'gebco', 'label': [f'GEBCO {l} {inj}' for l in ('fr', 'en', 'de', 'es')], 'at': '2026-10-20T09:00:00Z', 'personal': True, 'zoneCount': 0}]
        res = {'ok': True, 'cycle': {'inForce': '2026-10-29', 'next': '2026-11-26', 'ids': {'inForce': '2611', 'next': '2612'}}, 'items': items, 'unavailable': ['ukmil'], 'next': world.get('next', {'cycle': '2026-11-26', 'items': []}), 'unread': world.get('unread', [])}
        if local is not None:
            res['local'] = local
        # world['next'] / world['unread']: the cycle after and what is seen but not read (lot C)
        zone = args.get('zone')
        by = {'fr': [sia, dircam, openaip], 'gb': [nats, ukmil, openaip] + ([mora] if world.get('mora') else []), 'es': [enaire, openaip], 'ca': [navcan, openaip], 'us': [faa, openaip]}
        if zone in by:
            res['zoneView'] = {'zone': zone, 'known': True, 'inCoverage': True, 'sources': by[zone], 'state': None, 'addWillAsk': {'sources': [], 'auto': [], 'hand': [], 'personal': [], 'noReader': []}}
        if zone == 'de':   # a country outside the coverage: what adding it will ask (K182 addWillAsk, lot C)
            res['zoneView'] = {'zone': 'de', 'known': True, 'inCoverage': False, 'sources': [_l89_item('openaip', 'auto', {'state': 'missing'}, (1, 0), (0, 1, 0), None, 'not-downloaded')], 'state': None,
                               'addWillAsk': {'sources': ['openaip', 'sia', 'nats', 'naviair'], 'auto': ['openaip'], 'hand': [{'id': 'sia', 'expected': ['export_xml_bd_SIA_<AAAA-MM-JJ>-v<nn>.zip']}], 'personal': ['nats'], 'noReader': ['naviair']}}
        return res
    return answer


def _l89_open(c, world, status=True, verbs=('base/pickup', 'base/cycle'), busy_running=None, busy_view=None, publish=None, nat=None, my_coverage=True, extra=None, last_results=None):
    """The Données screen on the fake launcher of lot B: the map and the packs of L88, the fake `base/cycle` (_l89_cycle), the state of five countries (France waits for a file seen in Downloads, the United Kingdom is stale and buildable,
    the others are up to date) read from the LIVE `world['zs']`; the stubbed catalogue says the SIA's two files and shelves UK Mil.  Returns (st, x4)."""
    x4 = lambda s: [f'{s} fr', f'{s} en', f'{s} de', f'{s} es']
    cfg, _ = _fixture()
    cfg['outlines'] = _l88_outlines()
    cfg['stepsOf'] = {'sia': _l88_steps(x4)['sia'], 'ukmil': {'id': 'ukmil', 'page': {'url': 'https://ukmil.example/', 'home': 'https://ukmil.example/'}, 'files': [], 'unavailable': {'since': '2025-11', 'note': x4('unavailable note')}}}
    cfg['pathCheck'] = ['chemin à vérifier', 'path to check', 'Pfad zu prüfen', 'ruta por verificar']
    for z, names, kb in [('it', _L88_NAMES['it'], 4000), ('jp', _L88_NAMES['jp'], 6000)]:
        cfg['zones'].append({'id': z, 'names': names, 'frames': [], 'published': False, 'publishedKb': kb})
    for z in cfg['zones']:
        z['names'] = _L88_NAMES.get(z['id'], z['names'])
    cfg['packs'] = {'generated': '2026-11-12', 'source': 'test', 'regions': [
        {'id': 'ouest', 'names': ['Europe de l’Ouest', 'Western Europe', 'Westeuropa', 'Europa occidental'], 'zones': ['fr', 'gb', 'es', 'de', 'it']},
        {'id': 'amerique', 'names': ['Amérique du Nord', 'North America', 'Nordamerika', 'Norteamérica'], 'zones': ['ca', 'us']}], 'themes': []}
    if nat is not None:
        cfg['nat'] = nat   # the stub of aerodb answers natState() / natEnsure() from window.__stub.nat (lot C)
    if extra:
        extra(cfg)
    st = _launcher(c, [], verbs=_VERBS + list(verbs), cycle=_l89_cycle(world), busy_running=busy_running, busy_view=busy_view, publish=publish, last_results=last_results)
    world.setdefault('zs', {'ca': _zst('up-to-date'), 'es': _zst('up-to-date'), 'us': _zst('up-to-date'),
                            'fr': _zst('stale', {'code': 'pickup-waiting', 'source': 'sia', 'cycle': '2026-11-26', 'zip': 'export_xml_bd_sia_2026-10-29-v01.zip'}, buildable=False), 'gb': _zst('stale', _NEWER)})
    if status:
        st['status'] = lambda args: _status(world['zs'])
    _open(c, cfg, my_coverage=my_coverage)
    _all_open(c)
    c.until("document.querySelectorAll('[data-wmap] path[data-zone]').length === 8 && !!document.querySelector('[data-todo-state=ready]')", timeout=20000, what='the map and the list of the month')
    _ready(c, 5)
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    return st, x4


def _l89_sheet(c, zone):
    """Opens the sheet of `zone` from the map (a sheet already open is closed first: on a phone it covers the map)."""
    if c.count('[data-sheet]'):
        c.tap('[data-sheet] [data-act=sheet-close]:visible')
        c.until("!document.querySelector('[data-sheet]')", timeout=4000, what='the sheet closes')
    c.tap(f'[data-wmap] path[data-zone={zone}]')
    c.until(f"!!document.querySelector('[data-sheet={zone}] [data-sheet-source]')", timeout=10000, what=f'the sheet of {zone}')
    c.until(f"!!document.querySelector('[data-sheet={zone}] [data-inventory-state]') === false || !document.querySelector('[data-sheet={zone}] [data-inventory-state=loading]')", timeout=8000, what='the view of the country is read')


def _l89_reads(st, zone=None):
    """The reads of base/cycle so far: those of one country (`zone`), or the list of the month (zone None)."""
    return [p for p in st['posts'] if p['verb'] == 'cycle' and (p['args'].get('zone') == zone)]


@case('L89', 'Données: the gestures of the country sheet (SOG-0262, lot B) — « Mettre à jour ce pays » is the update of ONE country (what it does said under it, grey with its reason), « Prendre le fichier téléchargé » is the primary gesture when a file is seen in Downloads with « Choisir un autre fichier… » as a link under it, « Choisir le fichier… » alone when nothing is seen, the per-file state is re-read after each gesture, the card of the running operation shows on the sheet',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=True, night=False,
      rule='SOG-0262 (the user: « transférer les boutons « prendre le fichier téléchargé » et « choisir le fichier » »; the ergonomist: the sheet is the only place where one acts; one purpose, never two stacked equal buttons; a grey button writes why): the sheet carries startUpdate([zone]) (fetch of what is missing, then the build of that country only), the pickup of that country, the chooser of a file of that source; the lists of Downloads are re-read after each gesture; the busy card is on the sheet')
def l89(c):
    lang = c.lang
    CWB = lambda k, row=0: _trow(k, lang, after='  cwb: {', row=row)
    UP = lambda k: _trow(k, lang, after='  up: {')
    PICK = norm(_trow('pickup', lang))
    world = {'sia_seen': True}
    R = _running()   # the Procédures download of two States (an operation the Données screen does not adopt: its card shows)
    RV = {**_fview({}, state='running', step='Lecture des sources', jid='o1', verb='fetch'), 'set': 'proc'}
    st, _x4 = _l89_open(c, world, busy_running=R, busy_view=RV)
    st['upload_posts'] = []
    answer = {'status': 422, 'body': {'ok': False, 'reason': 'unrecognised', 'message': 'not an SIA export', 'expected': ['sia', 'nats']}}
    c.context.route(re.compile(r'/__setup/base/upload'), lambda route: (st['upload_posts'].append({k.lower(): v for k, v in route.request.headers.items()}), route.fulfill(status=answer['status'], content_type='application/json', body=json.dumps(answer['body']))))
    cls = lambda sel: c.js(f"(document.querySelector('{sel}') || {{ className: '' }}).className")
    # ---- 1. « Mettre à jour ce pays »: the United Kingdom is stale and buildable: live, primary (no file is seen there), it says what it will do
    _l89_sheet(c, 'gb')
    btn = '[data-sheet=gb] [data-act=sheet-update]'
    want = norm(CWB('doLine').replace('{l}', CWB('doDl') + ', ' + CWB('doBuild')))
    c.eq([norm(c.text(btn)), c.js(f"document.querySelector('{btn}').disabled"), 'primary' in cls(btn), norm(c.text('[data-sheet=gb] [data-sheet-update-plan]'))], [norm(CWB('update')), False, True, want],
         '« Mettre à jour ce pays », live and primary, with the line that says what it does (download what is missing, rebuild the country)', what='update button gb')
    # a source taken by hand with NO file seen: « Choisir le fichier… » ALONE (no pickup, no second equal button)
    hand = '[data-sheet=gb] [data-hand=nats]'
    c.eq([c.attr(hand, 'data-hand-state'), c.count(f'{hand} button'), norm(c.text(f'{hand} [data-act=zone-upload]')), c.count(f'{hand} [data-verb=pickup]'), c.attr(f'{hand} [data-act=zone-upload]', 'data-source')],
         ['none', 1, norm(UP('choose')), 0, 'nats'], 'nothing seen in Downloads: « Choisir le fichier… » alone, on the line of its source', what='choose alone')
    n0 = len(st['posts'])
    st['views'] = [_l97_dl('done', jid='f1'), _l97_build('done', jid='b1')]
    st['i'] = 0
    st['start'] = (200, {'job': 'f1'})
    c.js(_L97_MODAL)
    c.tap(btn)
    c.until("!!document.querySelector('[data-sheet=gb] [data-sheet-thread]') && !document.querySelector('[data-sheet=gb] [data-sheet-progress]')", timeout=30000, what='the thread of the update')
    mine = st['posts'][n0:]
    c.eq([[sorted(p['args'].get('zones', [])), p['verb']] for p in mine if p['verb'] in ('status', 'fetch', 'build')][:2], [[['gb'], 'status'], [['gb'], 'fetch']],
         'the same path as the pack and the top button, for ONE country: its state is read, then ONLY its download is posted', what='posts')
    c.eq([[p['verb'], sorted(p['args'].get('zones', []))] for p in mine if p['verb'] in ('fetch', 'build')], [['fetch', ['gb']], ['build', ['gb']]],
         'lot D1: no question any more, the build of that country follows its download in the same gesture; the sheet says what it did', what='chain')
    c.eq(c.js("!!window.__modal"), False, 'no window « reconstruire » at any time', what='no question')
    for _ in range(40):
        if len(_l89_reads(st)) >= 2:
            break
        c.wait(250)
    c.ge(len(_l89_reads(st)), 2, 'the list of the month is read again when the operation ends', what='todo re-read')
    # ---- 2. grey, with the reason written: up to date / waits for a file seen in Downloads
    _l89_sheet(c, 'es')
    r = c.js("(() => { const b = document.querySelector('[data-sheet=es] [data-act=sheet-update]'), w = document.querySelector('[data-sheet=es] [data-sheet-update-reason]'); return [b.disabled, w && w.dataset.sheetUpdateReason, w && w.textContent.trim()] })()")
    c.eq([r[0], r[1], norm(r[2])], [True, 'up-to-date', norm(CWB('upToDate'))], 'up to date: the button is grey and says why', what='grey up to date')
    _l89_sheet(c, 'fr')
    r = c.js("(() => { const b = document.querySelector('[data-sheet=fr] [data-act=sheet-update]'), w = document.querySelector('[data-sheet=fr] [data-sheet-update-plan]'); return [b.disabled, w && w.textContent.trim(), b.className] })()")
    c.eq([r[0], norm(r[1]), 'primary' in r[2]], [False, norm(CWB('doLine').replace('{l}', _trow('doPick', lang, after='  zx: {') + ', ' + CWB('doBuild'))), False],
         'lot D1: a country whose file is SEEN in Downloads: the gesture takes it then builds (said under the button), and it is no longer the primary button (the pickup is)', what='seen file')
    # ---- 3. a file SEEN in Downloads: « Prendre le fichier téléchargé » is THE primary gesture, « Choisir un autre fichier… » a link under it
    hand = '[data-sheet=fr] [data-hand=sia]'
    c.eq([c.attr(hand, 'data-hand-state'), norm(c.text(f'{hand} [data-verb=pickup]')), 'primary' in cls(f'{hand} [data-verb=pickup]'), c.attr(f'{hand} [data-verb=pickup]', 'data-zones'),
          norm(c.text(f'{hand} [data-hand-alt] [data-act=zone-upload]')), 'd-link' in cls(f'{hand} [data-hand-alt] [data-act=zone-upload]')],
         ['seen', PICK, True, 'fr', norm(UP('chooseOther')), True], 'a file seen: « Prendre le fichier téléchargé » (primary, for that country) with « Choisir un autre fichier… » as a link under it', what='seen')
    c.eq(c.js("document.querySelectorAll('[data-sheet=fr] button.primary').length"), 1, 'ONE primary gesture in the sheet, never two equal buttons stacked', what='one primary')
    c.eq([c.attr('[data-sheet=fr] [data-hand=dircam]', 'data-hand-state'), c.count('[data-sheet=fr] [data-hand=dircam] button')], ['none', 1], 'the DIRCAM line, nothing seen: its « Choisir le fichier… » alone', what='dircam line')
    seen0 = c.js("[...document.querySelectorAll('[data-sheet=fr] [data-sheet-source=sia] [data-file-state]')].map(f => f.dataset.fileState)")
    c.eq(seen0, ['seen', 'missing'], 'the files: one seen, one missing', what='files before')
    if c.width in (390, 1280):
        c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
        c.js("document.querySelector('[data-sheet=fr]').scrollIntoView({ block: 'start' })")
        c.shot(f'L89_{c.width}_{lang}_delivered.png')
    # the pickup: the plan for THIS country only; the file is then no longer in Downloads: the per-file state and the gesture follow (the lists are re-read after the gesture)
    world['sia_seen'] = False
    world['zs']['fr'] = _zst('stale', _NEWER)
    st['views'] = [_pk_plan([], [{'zone': 'fr', 'source': 'sia', 'expected': 'export_xml_bd_SIA_*.zip'}], [], jid='k1', zones=('fr',))]
    st['i'] = 0
    st['start'] = (200, {'job': 'k1'})
    z0 = len(_l89_reads(st, 'fr'))
    c.tap(f'{hand} [data-verb=pickup]')
    for _ in range(40):
        if [p for p in st['posts'] if p['verb'] == 'pickup']:
            break
        c.wait(250)
    pk = [p for p in st['posts'] if p['verb'] == 'pickup']
    c.eq([[p['args'].get('zones'), p['args'].get('dry')] for p in pk[:1]], [[['fr'], True]], 'the pickup plan of that country only (dry sent)', what='pickup post')
    c.until("document.querySelector('[data-sheet=fr] [data-hand=sia]')?.dataset.handState === 'none'", timeout=15000, what='the gesture follows what Downloads now holds')
    c.eq(c.js("[...document.querySelectorAll('[data-sheet=fr] [data-sheet-source=sia] [data-file-state]')].map(f => f.dataset.fileState)"), ['missing', 'missing'], 'after the gesture the per-file state is re-read: nothing is seen any more, both files « manquant »', what='files after')
    c.ge(len(_l89_reads(st, 'fr')), z0 + 1, 'the view of the country was read again after the gesture', what='re-read fr')
    c.eq([c.count('[data-sheet=fr] [data-hand=sia] [data-zone-msg]'), c.count('[data-sheet=fr] [data-hand=dircam] [data-zone-msg]')], [1, 0], 'what the pickup found and did not find is written with the gestures of that source, at the foot of the sheet (SOG-0244, lot D2)', what='message on the source')
    # ---- 4. « Choisir le fichier… »: the chooser, the bytes as they are, what the launcher refused is said on the same block, the lists are re-read
    z1 = len(_l89_reads(st, 'fr'))
    with c.page.expect_file_chooser() as fc:
        c.js("document.querySelector('[data-sheet=fr] [data-hand=sia] [data-act=zone-upload]').click()")
    fc.value.set_files({'name': 'not sia é.zip', 'mimeType': 'application/zip', 'buffer': b'PK\x03\x04' + b'x' * 60})
    for _ in range(40):
        if st['upload_posts']:
            break
        c.wait(250)
    c.eq(st['upload_posts'][0].get('x-sog-name'), urllib.parse.quote('not sia é.zip', safe="-_.!~*'()"), 'the chosen file is sent as it is, its name only a hint', what='upload name')
    c.until("!!document.querySelector('[data-sheet=fr] [data-hand=sia] [data-zone-msg][data-level=err]')", timeout=10000, what='the refusal on the source block')
    c.ok('not sia' in c.text('[data-sheet=fr] [data-hand=sia] [data-zone-msg]'), c.text('[data-sheet=fr] [data-hand=sia] [data-zone-msg]'), 'the refusal names the chosen file')
    for _ in range(40):
        if len(_l89_reads(st, 'fr')) >= z1 + 1:
            break
        c.wait(250)
    c.ge(len(_l89_reads(st, 'fr')), z1 + 1, 'after the upload the view of the country is read again', what='re-read after upload')
    # ---- 5. the card of the running operation, on the sheet, when the gesture of the sheet is refused busy
    world['sia_seen'] = True
    world['zs']['fr'] = _zst('stale', {'code': 'pickup-waiting', 'source': 'sia', 'cycle': '2026-11-26', 'zip': 'export_xml_bd_sia_2026-10-29-v01.zip'}, buildable=False)
    c.page.reload(wait_until='load')
    _head(c)
    _all_open(c)
    c.until("document.querySelectorAll('[data-wmap] path[data-zone]').length === 8 && !!document.querySelector('[data-todo-state=ready]')", timeout=20000, what='the screen again')
    _ready(c, 5)
    _l89_sheet(c, 'fr')
    st['start'] = (409, {'reason': 'busy', 'job': 'o1', 'running': R})
    c.tap('[data-sheet=fr] [data-hand=sia] [data-verb=pickup]')
    c.until("!!document.querySelector('[data-sheet] [data-busy-card]')", timeout=10000, what='the card on the sheet')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    busy = norm(_trow('busy', lang, after='  greyReason: {'))
    c.eq([c.count('[data-sheet] [data-busy-card]'), c.count('[data-state-head] [data-busy-card]'), c.count('[data-sheet] [data-sheet-update-reason=busy]')], [1, 0, 0],
         'the card of the running operation is on the sheet (not twice, the state bar does not repeat it) and the grey button does not repeat the sentence', what='busy card')
    c.eq([c.js("document.querySelector('[data-sheet=fr] [data-hand=sia] [data-verb=pickup]').disabled"), c.js("document.querySelector('[data-sheet=fr] [data-hand=dircam] [data-act=zone-upload]').disabled")], [True, True],
         'while it runs the gestures of the sheet are grey', what='grey while busy')
    if c.width in (390, 1280):
        c.js("document.querySelector('[data-sheet] [data-busy-card]').scrollIntoView({ block: 'center' })")
        c.shot(f'L89_{c.width}_{lang}_busy.png')
    c.check_errors()


@case('L90', 'Données: « Ce qui reste à faire ce mois-ci » (SOG-0262, lot B) — under the map and before the packs, fed by base/cycle (read at the opening and after each operation): « Cycle AIRAC 2611 : 4 faits sur 10 », one line per source not done sorted (your hand, late, to build, to publish) with its regime and the three ticks set by the tool, each line leading to the sheet of its country, the done ones folded, the sources the publisher no longer offers apart and not counted',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=True, night=False,
      rule='SOG-0262 + SOG-0259 (the user: « la liste du cycle cochée par l\'outil »): the list of the cycle is the same data seen flat; the page reads state bar, map, what is left to do, the packs, the rest; a line is a source with its label (4 languages), regime badge, ticks téléchargé / construit / publié (date or reason in words), and a button to the sheet; `unavailable` sources are neither « en retard » nor « à faire » and are not counted')
def l90(c):
    lang = c.lang
    li = {'fr': 0, 'en': 1, 'de': 2, 'es': 3}[lang]
    CWB = lambda k, row=0: _trow(k, lang, after='  cwb: {', row=row)
    CW = lambda k, row=0: _trow(k, lang, after='  cw: {', row=row)
    world = {'sia_seen': True}
    st, _x4 = _l89_open(c, world)
    # ---- 1. one read of the list of the month at the opening (no zone), and the page order
    c.eq([len(_l89_reads(st)), len(_l89_reads(st, 'fr'))], [1, 0], 'the list of the month is read once at the opening (base/cycle, no zone)', what='one read')
    c.eq(c.js("document.querySelector('details[data-todo]').open"), False, 'the block is folded by default (lot D1)', what='folded')
    c.js("document.querySelector('details[data-todo]').open = true")
    pos = c.js("""(() => { const q = s => document.querySelector(s), before = (a, b) => !!(q(a).compareDocumentPosition(q(b)) & Node.DOCUMENT_POSITION_FOLLOWING);
      return [before('[data-state-head]', '[data-world-map]'), before('[data-world-map]', '[data-todo]'), before('[data-todo]', '[data-cw-groups]'), before('[data-cw-groups]', '[data-publish]')] })()""")
    c.eq(pos, [True] * 4, 'the page order: state bar, the map, what is left to do, the packs, the rest', what='page order')
    head = norm(c.text('[data-todo-head]'))
    c.eq(head, norm(CWB('todoHead').replace('{c}', '2611').replace('{n}', '3').replace('{m}', '8')), 'the header counts the sources done among the eight counted (the one the publisher no longer offers and the two computed here, MORA and X-Plane, are not counted: lot D1)', what='head')
    c.eq([c.count('[data-todo] h3'), norm(c.text('[data-todo] [data-todo-help]'))], [0, norm(_trow('tdHelp', lang, after='  d2: {'))], 'the block has no sub-heading that repeats the header of the fold (« Ce qui reste à faire ce mois-ci · n »): only the hint under it', what='no sub-heading')
    # ---- 2. one line per source not done, sorted: waits for your hand (launcher order), late, to build, to publish
    ids = c.js("[...document.querySelectorAll('[data-todo-list] > [data-todo-item]')].map(l => [l.dataset.todoItem, l.dataset.todoKind])")
    c.eq(ids, [['lfv', 'hand'], ['nats', 'hand'], ['sia', 'hand'], ['navcan', 'late'], ['faa', 'publish']], 'five lines, sorted: your hand, late, to publish (X-Plane, computed on this workstation, is no longer a line: lot D1)', what='sorted')
    c.eq(c.count('[data-todo-list] [data-todo-item=openaip], [data-todo-list] [data-todo-item=mora], [data-todo-list] [data-todo-item=ukmil], [data-todo-list] [data-todo-item=xplane]'), 0, 'a source that is done, shelved or computed here has no line in the list', what='no done line')
    line = lambda i: c.js(f"""(() => {{ const l = document.querySelector('[data-todo-list] [data-todo-item={i}]'), t = k => {{ const e = l.querySelector('[data-tick=' + k + ']'); return [e.dataset.ok, e.textContent.replace(/[\\s\\\u00a0\\\u202f]+/g, ' ').trim()] }};
      return {{ label: l.querySelector('[data-todo-label]').textContent, badge: l.querySelector('[data-regime-badge]').dataset.regimeBadge, badgeText: l.querySelector('[data-regime-badge]').textContent, kind: l.querySelector('[data-kind-word]').textContent,
        ticks: [t('download'), t('build'), t('publish')], go: [...l.querySelectorAll('[data-act=open-country]')].map(b => b.dataset.zone) }} }})()""")
    kind = lambda k: norm(_trow(k, lang, after='    kind: {'))
    badge = lambda k: norm(_trow(k, lang, after='    badge: {'))
    nats = line('nats')
    c.eq([nats['label'], nats['badge'], norm(nats['badgeText']), norm(nats['kind'])], [f'nats {["fr", "en", "de", "es"][li]}', 'hand', badge('hand'), kind('hand')], 'a line: the label of the source in the language of the run, its regime, where it stands', what='nats head')
    late = norm(CWB('dlLateDates').replace('{f}', _date_text(datetime.date(2026, 10, 1), lang)).replace('{c}', _date_text(datetime.date(2026, 10, 29), lang)))
    ZXW = lambda k: _trow(k, lang, after='  zx: {')
    c.eq([nats['ticks'][0][0], norm(nats['ticks'][0][1])], ['todo', norm(f"○ {_trow('dlTick', lang, after='    tick: {')} ({ZXW('twTodo')}) : {late}")], 'téléchargé: a file older than the cycle says it in dates (« en retard : fichier du 1 oct., le cycle est du 29 oct. »), ○ to do with its word', what='late reason')
    c.eq([t[0] for t in nats['ticks']], ['todo', 'todo', 'na'], 'the three ticks set by the tool: to do (not a failure), to do, publication not read (not applicable)', what='nats ticks')
    sia = line('sia')
    c.ok(norm(_trow('newer-in-downloads', lang, after='    why: {')) in norm(sia['ticks'][0][1]) or norm(CW('dlWaiting')) in norm(sia['ticks'][0][1]), sia['ticks'][0][1], 'a file of the cycle waits in Downloads: said in words')
    c.eq(norm(line('navcan')['ticks'][0][1].split(':', 1)[1]), norm(_trow('not-downloaded', lang, after='    why: {')), 'a source the launcher takes and has not taken: « pas encore téléchargé »', what='not downloaded')
    c.eq(c.count('[data-todo-item=xplane]'), 0, 'X-Plane is computed here: no line', what='no xplane')
    c.eq([line('navcan')['kind'].strip() == kind('late'), line('navcan')['badge']], [True, 'auto'], 'late, automatic', what='navcan')
    c.eq(c.count('[data-todo] img'), 0, 'a label from the launcher is escaped (nothing is injected)', what='escaped')
    c.eq(c.js('window.__pwn === undefined'), True, 'nothing ran', what='no pwn')
    fa = line('faa')
    c.eq([t[0] for t in fa['ticks']], ['yes', 'yes', 'todo'], 'faa: downloaded and built, not published yet (○ to do)', what='faa ticks')
    # ---- 3. a line leads to the sheet of its country (a button), sources of no country of the coverage have none
    c.eq([nats['go'], sia['go'], line('lfv')['go']], [['gb'], ['fr'], ['se']], 'the buttons of a line open the sheet of the countries of the source in the coverage; Sweden (not in the coverage) opens its own sheet, where adding it is offered (lot D1: no line without a gesture)', what='go')
    # ---- 4. the folded ones and the shelved ones
    c.eq([c.attr('[data-todo-done]', 'open'), norm(c.text('[data-todo-done] summary'))], [None, norm(CWB('todoDone').replace('{n}', '3'))], 'the done ones are folded under « Déjà faits (3) »', what='done fold')
    c.tap('[data-todo-done] summary')
    c.until("document.querySelector('[data-todo-done]').open", timeout=3000, what='the fold opens')
    c.eq(c.js("[...document.querySelectorAll('[data-todo-done] [data-todo-item]')].map(l => l.dataset.todoItem).sort()"), ['dircam', 'enaire', 'openaip'], 'the three done sources (MORA is computed here: not a line)', what='done list')
    gone = c.js("""(() => { const g = document.querySelector('[data-todo-gone] [data-todo-unavailable=ukmil]'), t = document.querySelector('[data-todo-unavailable-title]');
      return g ? [g.textContent.replace(/\s+/g, ' '), !!(t.compareDocumentPosition(g) & 4), g.querySelectorAll('[data-tick]').length, document.querySelector('[data-todo-list] [data-todo-item=ukmil]') !== null] : null })()""")
    c.ok(gone and f'unavailable note {lang}' in gone[0] and '2025-11' in gone[0] and gone[1] and gone[2] == 0 and not gone[3], gone, 'UK Mil is shelved APART under its muted title with the note of the catalogue: no tick, not « late », not in the list')
    # ---- 5. the button leads to the sheet
    c.tap('[data-todo-list] [data-todo-item=nats] [data-act=open-country]')
    c.until("!!document.querySelector('[data-sheet=gb]')", timeout=8000, what='the sheet of the United Kingdom')
    c.eq(c.count('[data-sheet=gb]'), 1, 'the line of the list opens the sheet of its country', what='leads to the sheet')
    c.tap('[data-sheet] [data-act=sheet-close]:visible')
    c.until("!document.querySelector('[data-sheet]')", timeout=4000, what='the sheet closes')
    c.eq(c.js("(document.activeElement.closest && document.activeElement.closest('[data-todo]') !== null) && document.activeElement.dataset.zone"), 'gb', 'and the focus comes back to the line that opened it', what='focus back')
    c.eq(c.js("document.documentElement.scrollWidth <= window.innerWidth"), True, 'no horizontal scroll', what='no sideways scroll')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    if c.width in (390, 1280):
        c.js("document.querySelector('[data-todo]').scrollIntoView({ block: 'start' })")
        c.shot(f'L90_{c.width}_{lang}_delivered.png')
    c.check_errors()


@case('L91', 'Données: the ergonomist\'s retouches of lot A (SOG-0262) — the map is bounded at a wide width so the first packs are on the first screen, the texts no longer speak of a selection that is gone, the « Fermer » cross at a wide width and « ← Retour » on a phone',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=True, night=False,
      rule='ergonomist 12/11: at 1280×800 the groups fell below the fold: the map is bounded (≈ 45 % of the visible height) without a sheet, nothing changes with one open; « Rien à reconstruire : les 2 zones cochées sont à jour » spoke of ticked zones that no longer exist; the texts that still say ticked / selection refer to the box « Je certifie… », the coverage fold or the States of the Procédures')
def l91(c):
    lang = c.lang
    world = {'sia_seen': True, 'done': True}   # nothing left to do this month: the block under the map is short, so the first packs can be on the first screen
    _st, _x4 = _l89_open(c, world)
    c.wait(1500)   # the reads that follow the opening (list of the month, state of the countries) have redrawn the page
    m = c.js("""(() => { document.querySelector('[data-world-map]').scrollIntoView({ block: 'start', behavior: 'instant' }); const q = s => document.querySelector(s).getBoundingClientRect(), svg = document.querySelector('[data-wmap]'), g = document.querySelector('[data-group-id]');
      return { map: q('[data-wmap]').height, mtop: q('[data-wmap]').top, ttop: q('[data-todo]').top, ih: window.innerHeight, gtop: g.getBoundingClientRect().top, max: getComputedStyle(svg).maxHeight, w: q('[data-wmap]').width } })()""")
    if c.width >= 900:
        c.le(m['map'], m['ih'] * 0.46, 'wide, no sheet: the map is bounded to about 45 % of the visible height', what='map height')
        c.ok(m['gtop'] < m['ih'], m, 'and, the map being at the top of the screen, the first pack is on the first screen without scrolling')
        _l89_sheet(c, 'fr')
        o = c.js("getComputedStyle(document.querySelector('[data-wmap]')).maxHeight")
        c.ok(o == m['max'], (o, m['max']), 'with a sheet open the bound is the same: the sheet is a card at the right (lot D2), it takes nothing from the map')
    else:
        c.ok(m['map'] <= m['ih'] * 0.72, m, 'phone: the map keeps its own bound (70 % of the height)')
    # ---- the texts: every text of the module that says ticked / selection refers to what still exists
    hits = c.js("""async () => { const { TX } = await import('/modules/data/texts.js'), re = /coch|s[ée]lection|ticked|untick|selection|selected|angekreuzt|abgekreuzt|ausgewählt|auswahl|marcad|desmarc|selecci/i, out = [];
      (function walk(o, p) { if (Array.isArray(o) && o.length === 4 && typeof o[0] === 'string') { if (o.some(s => re.test(s))) out.push(p); return } if (o && typeof o === 'object') for (const k of Object.keys(o)) walk(o[k], p ? p + '.' + k : k) })(TX, '');
      return out }""")
    allowed = ('up.tick', 'certifyHint', 'tickOnStation', 'tickRefused', 'bal.personal', 'toCertify', 'zr.', 'upd.planTick', 'packs.', 'personalKept', 'greyReason.no-set', 'greyReason.no-state', 'zoneMap.', 'mapLegendNote',
               'pickupUnread', 'pk.fixUnread', 'cwb.waitsTick', 'lc.addPersonal')
    c.eq([h for h in hits if not h.startswith(allowed)], [], 'only the texts about the « Je certifie… » box, the coverage fold, the States of the Procédures and the proc map still say ticked / selection', what='selection texts')
    t = c.js("""async () => { const { TX } = await import('/modules/data/texts.js'); return [TX.upd.none, TX.upd.ask, TX.advice.partial, TX.advice.interrupted, TX.greyReason['no-zone']] }""")
    c.ok(all(not re.search(r'coch|ticked|angekreuzt|marcad', ' '.join(row), re.I) for row in t), t, '« Rien à reconstruire : ces n sont à jour », the question, the advice and « no zone » no longer say ticked')
    if c.width in (390, 1280):
        c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
        c.shot(f'L91_{c.width}_{lang}_delivered.png')
    c.check_errors()


def _l92_zip(members, zip64=False, method=0):
    """A zip written by hand (so that the cases control every field): `members` = [(name, bytes)]; the first one is a plain stored file, the LAST is the member under test, deflated when `method` is 8; `zip64` writes the sizes and the offset in the zip64 extra and the zip64 end records."""
    import struct
    import zlib
    out, cen = b'', b''
    for i, (name, data) in enumerate(members):
        n = name.encode()
        m = method if i == len(members) - 1 else 0
        comp = data
        if m == 8:
            co = zlib.compressobj(6, zlib.DEFLATED, -15)
            comp = co.compress(data) + co.flush()
        crc = zlib.crc32(data) & 0xffffffff
        off = len(out)
        out += struct.pack('<IHHHHHIIIHH', 0x04034b50, 20, 0, m, 0, 0x21, crc, len(comp), len(data), len(n), 0) + n + comp
        if zip64:
            extra = struct.pack('<HHQQQ', 1, 24, len(data), len(comp), off)
            cen += struct.pack('<IHHHHHHIIIHHHHHII', 0x02014b50, 20, 20, 0, m, 0, 0x21, crc, 0xffffffff, 0xffffffff, len(n), len(extra), 0, 0, 0, 0, 0xffffffff) + n + extra
        else:
            cen += struct.pack('<IHHHHHHIIIHHHHHII', 0x02014b50, 20, 20, 0, m, 0, 0x21, crc, len(comp), len(data), len(n), 0, 0, 0, 0, 0, off) + n
    cd = len(out)
    out += cen
    if zip64:
        rec = len(out)
        out += struct.pack('<IQHHIIQQQQ', 0x06064b50, 44, 45, 45, 0, 0, len(members), len(members), len(cen), cd)
        out += struct.pack('<IIQI', 0x07064b50, 0, rec, 1)
        out += struct.pack('<IHHHHIIH', 0x06054b50, 0, 0, 0xffff, 0xffff, 0xffffffff, 0xffffffff, 0)
    else:
        out += struct.pack('<IHHHHIIH', 0x06054b50, 0, 0, len(members), len(members), len(cen), cd, 0)
    return out


@case('L92', 'Données: « Choisir le fichier… » on the DIRCAM line reads the ENR 5.7 PDF in the SIA archive WITHOUT loading it (SOG-0262, lot B) — the end of the central directory (zip64 too), the one member, stored or deflated, recognised by that member whatever the archive is named; the PDF only is sent, never the archive; a wrong member, a truncated, hostile or encrypted archive is refused in words and nothing is sent',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=False, night=False,
      rule='ergonomist 12/11 (decision DIRCAM): info_aero_dircam.zip weighs 1.3 GB and the ENR 5.7 is one member (PDF/MIAM/MIAM_OACI_ENR 5.7.pdf); the page slices the File (central directory, local entry) and inflates with DecompressionStream(\'deflate-raw\'); bounded entries / sizes, CRC checked, a bomb cut at the announced size; the launcher of this workstation does not take the PDF yet (its refusal is said as it is)')
def l92(c):
    import struct
    import zlib
    lang = c.lang
    world = {'sia_seen': False}
    st, _x4 = _l89_open(c, world)
    sent = []
    answer = {'status': 422, 'body': {'ok': False, 'reason': 'unrecognised', 'message': 'not taken yet', 'expected': ['sia', 'nats']}}

    def upload(route):
        req = route.request
        sent.append({'headers': {k.lower(): v for k, v in req.headers.items()}, 'body': req.post_data_buffer or b''})
        route.fulfill(status=answer['status'], content_type='application/json', body=json.dumps(answer['body']))
    c.context.route(re.compile(r'/__setup/base/upload'), upload)
    CWB = lambda k: _trow(k, lang, after='    zip: {')
    member = 'PDF/MIAM/MIAM_OACI_ENR 5.7.pdf'
    pdf = b'%PDF-1.4\n' + bytes(range(256)) * 40 + b'\n%%EOF\n'
    _l89_sheet(c, 'fr')
    sel = '[data-sheet=fr] [data-hand=dircam] [data-act=zone-upload]'
    c.eq(c.attr(sel, 'data-source'), 'dircam', 'the DIRCAM line asks for its own source', what='source')

    def pick(name, data):
        before = len(sent)
        with c.page.expect_file_chooser() as fc:
            c.js(f"document.querySelector('{sel}').click()")
        fc.value.set_files({'name': name, 'mimeType': 'application/zip', 'buffer': data})
        c.wait(1200)
        return len(sent) - before

    msg = lambda: norm(c.js("(document.querySelector('[data-sheet=fr] [data-hand=dircam] [data-zone-msg]') || { textContent: '' }).textContent"))
    # ---- recognised by the member, whatever the archive is named: stored, deflated, zip64, with other members before it
    for what, data in [('stored', _l92_zip([('readme.txt', b'x' * 50), ('PDF/other.pdf', b'%PDF-other'), (member, pdf)])),
                       ('deflated', _l92_zip([('readme.txt', b'x' * 50), (member, pdf)], method=8)),
                       ('zip64', _l92_zip([('readme.txt', b'x' * 50), (member, pdf)], zip64=True)),
                       ('zip64 deflated', _l92_zip([('readme.txt', b'x' * 50), (member, pdf)], zip64=True, method=8))]:
        n = pick(f'anything é {what}.zip', data)
        c.eq(n, 1, f'{what}: one upload, and it is the PDF member, not the archive', what=f'{what} sent')
        c.eq([sent[-1]['body'] == pdf, urllib.parse.unquote(sent[-1]['headers'].get('x-sog-name', ''))], [True, 'MIAM_OACI_ENR 5.7.pdf'], f'{what}: the bytes of the member as they are (CRC checked) under the name of the member', what=f'{what} body')
        c.until(f"!!document.querySelector('[data-sheet=fr] [data-hand=dircam] [data-zone-msg]')", timeout=6000, what='the launcher\'s answer on the DIRCAM block')
        c.ok(norm(CWB('refused').replace('{p}', 'MIAM_OACI_ENR 5.7.pdf')) in msg(), msg(), f'{what}: a refusal of the launcher (here « unrecognised ») is said in words, with the name it expects')
    # ---- a plain PDF is sent as it is when it bears the name the launcher recognises (« (1) » copy of a second download included), refused in words otherwise
    n = pick('MIAM_OACI_ENR 5.7 (1).pdf', pdf)
    c.eq([n, sent[-1]['body'] == pdf, urllib.parse.unquote(sent[-1]['headers'].get('x-sog-name', ''))], [1, True, 'MIAM_OACI_ENR 5.7 (1).pdf'], 'a PDF chosen directly under the name of the launcher is sent as it is', what='plain pdf')
    n = pick('MIAM ENR 5.7 copy.pdf', pdf)
    c.eq(n, 0, 'a PDF the launcher would not recognise (its name) is not sent', what='pdf name')
    c.ok(norm(CWB('pdf-name').replace('{p}', 'MIAM_OACI_ENR 5.7.pdf')) in msg(), msg(), 'and the refusal says why, with the name to give')
    # ---- refusals in words, nothing sent
    good = _l92_zip([('readme.txt', b'x' * 50), (member, pdf)])
    bomb = bytearray(_l92_zip([(member, b'\0' * 200000)], method=8))
    ci = bytes(bomb).index(struct.pack('<I', 0x02014b50))
    struct.pack_into('<I', bomb, ci + 24, 100)         # the central directory announces 100 bytes: the stream inflates to 200 000
    badcrc = bytearray(good)
    struct.pack_into('<I', badcrc, bytes(badcrc).rindex(struct.pack('<I', 0x02014b50)) + 16, 0xdeadbeef)
    crypt = bytearray(good)
    struct.pack_into('<H', crypt, bytes(crypt).rindex(struct.pack('<I', 0x02014b50)) + 8, 1)
    huge = bytearray(good)
    struct.pack_into('<I', huge, bytes(huge).rindex(struct.pack('<I', 0x02014b50)) + 24, 0x7fffffff)
    cases = [('no member', _l92_zip([('readme.txt', b'x' * 50), ('PDF/MIAM/other.pdf', pdf)]), 'no-member'),
             ('truncated', good[:len(good) // 2], 'truncated'),
             ('not a zip', b'hello, this is only text ' * 20, 'not-zip'),
             ('bomb', bytes(bomb), 'too-large'),
             ('bad crc', bytes(badcrc), 'corrupt'),
             ('encrypted', bytes(crypt), 'unsupported'),
             ('huge announced', bytes(huge), 'too-large'),
             ('member is not a pdf', _l92_zip([('readme.txt', b'x' * 50), (member, b'this is not a pdf ' * 20)]), 'not-pdf'),
             ('garbage directory', good[:-22] + struct.pack('<IHHHHIIH', 0x06054b50, 0, 0, 2, 2, 4000, 10, 0), 'corrupt')]
    for what, data, code in cases:
        n = pick(f'{what}.zip', data)
        c.eq(n, 0, f'{what}: nothing is sent', what=f'{what} sent')
        c.until("!!document.querySelector('[data-sheet=fr] [data-hand=dircam] [data-zone-msg][data-level=err]')", timeout=6000, what=f'{what}: the refusal on the DIRCAM block')
        want = norm(CWB(code).replace('{m}', member).replace('{p}', 'MIAM_OACI_ENR 5.7.pdf'))
        c.ok(want in msg(), (msg(), want), f'{what}: said in words ({code})')
    # ---- the generic chooser of another source is NOT touched: a zip goes to the launcher as it is
    sel2 = '[data-sheet=fr] [data-hand=sia] [data-act=zone-upload]'
    before = len(sent)
    with c.page.expect_file_chooser() as fc:
        c.js(f"document.querySelector('{sel2}').click()")
    fc.value.set_files({'name': 'export.zip', 'mimeType': 'application/zip', 'buffer': good})
    c.wait(1200)
    c.eq([len(sent) - before, sent[-1]['body'] == good], [1, True], 'another source\'s chooser sends the file as it is (the launcher recognises it by its content)', what='other source')
    c.check_errors()


@case('L119', 'Données: the DIRCAM line sends ONLY the MIAM ENR 5.7 PDF, in the shape the launcher recognises (a %PDF named « MIAM_OACI_ENR 5.7.pdf »), says which file to choose, and says what the launcher answered — received (name, size), already there, or its refusal in words (SOG-0273, K192 / K188; lot B of SOG-0262)',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=True, night=False,
      rule='AeroDB f5eafe4a1 / 971fe40e6 (tools/base_upload.py, K192): the launcher takes the ENR 5.7 by its CONTENT (`%PDF`) AND its name (`MIAM_OACI_ENR 5.7.pdf`, with or without « (n) », any case), answers 200 { ok, source: \'dircam\', zone: \'fr\', name, size, replaced, sha256 } (no `cycle`: nothing is read) or { ok: false, reason, message, expected? } in a closed list; it does not take the 1.3 GB archive. The page reads the one member of `info_aero_dircam.zip` on this device and posts only that PDF under the member\'s name; a PDF chosen as it is must bear that name; the line says the file to choose (the catalogue\'s `file`), what was received (the canonical name and the size: never « La prise suit », nothing is picked up) or the refusal. DIRCAM is no longer shelved: it is read from base/cycle and the catalogue only. What the launcher says (message) is bounded and escaped.')
def l119(c):
    import hashlib
    lang = c.lang
    world = {'sia_seen': False, 'dircam_story': True}
    x4 = lambda s: [f'{s} fr', f'{s} en', f'{s} de', f'{s} es']
    steps = {'id': 'dircam', 'page': {'url': 'https://sia.example/info_dircam', 'home': 'https://sia.example/'}, 'files': [
        {'name': 'MIAM_OACI_ENR 5.7.pdf', 'file': 'info_aero_dircam.zip', 'link': 'https://sia.example/info_dircam', 'gives': x4('gives'), 'what': x4('what'), 'where': x4('SIA › info_dircam'), 'verified': True}]}
    st, _x4 = _l89_open(c, world, extra=lambda cfg: cfg['stepsOf'].update({'dircam': steps}))
    sent = []
    answer = {}

    def upload(route):
        req = route.request
        sent.append({'headers': {k.lower(): v for k, v in req.headers.items()}, 'body': req.post_data_buffer or b''})
        if answer['status'] == 200:
            world['dircam_in'] = True   # the launcher keeps the PDF in data/local/upload/, which base/cycle lists like Downloads
        route.fulfill(status=answer['status'], content_type='application/json', body=json.dumps(answer['body']))
    c.context.route(re.compile(r'/__setup/base/upload'), upload)
    CWB = lambda k: _trow(k, lang, after='    zip: {')
    UPW = lambda k: _trow(k, lang, after='whyNone: {')
    member = 'PDF/MIAM/MIAM_OACI_ENR 5.7.pdf'
    canon = 'MIAM_OACI_ENR 5.7.pdf'
    pdf = b'%PDF-1.4\n' + bytes(range(256)) * 40 + b'\n%%EOF\n'
    archive = _l92_zip([('readme.txt', b'x' * 50), ('PDF/other.bin', bytes(range(256)) * 1200), (member, pdf)], method=8)
    ok_body = lambda replaced: {'ok': True, 'source': 'dircam', 'zone': 'fr', 'name': canon, 'size': len(pdf), 'replaced': replaced, 'sha256': hashlib.sha256(pdf).hexdigest()}
    _l89_sheet(c, 'fr')
    block = '[data-sheet=fr] [data-hand=dircam]'
    msg = lambda: norm(c.js(f"(document.querySelector('{block} [data-zone-msg]') || {{ textContent: '' }}).textContent"))

    def pick(name, data):
        before = len(sent)
        with c.page.expect_file_chooser() as fc:
            c.js(f"document.querySelector('{block} [data-act=zone-upload]').click()")
        fc.value.set_files({'name': name, 'mimeType': 'application/octet-stream', 'buffer': data})
        c.wait(1200)
        return len(sent) - before
    # ---- DIRCAM is no longer shelved: a source of the sheet like another, nothing hides it
    c.eq([c.count('[data-sheet=fr] [data-sheet-source=dircam]:not([data-unavailable])'), c.count('[data-sheet=fr] [data-unavailable]'), c.count('[data-todo-unavailable=dircam]')], [1, 0, 0],
         'DIRCAM is on the sheet as a source like another: read from the catalogue and base/cycle, not shelved apart', what='not shelved')
    # ---- the hint says which file to choose (the catalogue\'s `file`, never an invented name) and what leaves the device
    want = norm(CWB('hint').replace('{f}', ' (info_aero_dircam.zip)').replace('{p}', canon))
    c.eq(norm(c.text(f'{block} [data-choose-hint=dircam]')), want, 'under « Choisir le fichier… »: the SIA archive (named by the catalogue), read on this device, only the PDF of the ENR 5.7 is sent', what='hint')
    # ---- the gestures of a source are INSIDE its card (no stack at the bottom of the sheet); the file line agrees with the tick (nothing taken yet: « manquant » beside « à faire »)
    c.eq([c.count('[data-sheet-gestures]'), c.count('[data-sheet-source=dircam] [data-hand=dircam] [data-act=zone-upload]'), c.count('[data-sheet-source=sia] [data-hand=sia]'), c.count('[data-sheet=fr] [data-hand]')], [0, 1, 1, 2],
         'each hand-taken source carries its own gestures in its card; nothing detached', what='in the card')
    c.eq(c.js("[...document.querySelectorAll('[data-sheet-source=dircam] [data-file-state]')].map(e => e.dataset.fileState)"), ['missing'], 'before the upload: the expected file is « manquant », as the tick says (nothing taken)', what='before')
    # ---- the archive: ONE upload, the member only, in the launcher\'s shape
    answer.update(status=200, body=ok_body(True))
    n = pick('info_aero_dircam.zip', archive)
    c.eq(n, 1, 'one upload', what='count')
    h = sent[-1]['headers']
    c.eq([sent[-1]['body'] == pdf, sent[-1]['body'][:4], len(sent[-1]['body']) < len(archive), urllib.parse.unquote(h.get('x-sog-name', ''))], [True, b'%PDF', True, canon],
         'the body is the member as it is (%PDF, CRC checked), far smaller than the archive, under the name the launcher recognises', what='shape')
    c.until(f"!!document.querySelector('{block} [data-zone-msg][data-level=ok]')", timeout=6000, what='what the launcher received, said on the DIRCAM line')
    tpl = norm(CWB('received').replace('{name}', canon))
    rx = '.{1,24}?'.join(re.escape(p) for p in tpl.split('{b}'))
    c.ok(re.search(rx, msg()) is not None and 'info_aero_dircam.zip' in msg(), (msg(), rx), 'the line says the file chosen, then what the launcher received (canonical name, size)')
    done_tail = norm(_trow('done', lang, after='  up: {').split('{z}')[-1]).strip(' .,:')
    notes = norm(c.js("[...document.querySelectorAll('#fNotes .f-note')].map(n => n.textContent).join(' | ')"))
    c.ok(done_tail and done_tail not in notes and done_tail not in msg(), (done_tail, notes), 'nothing says « the pickup follows »: no pickup is started for this PDF')
    c.eq(c.count(f'{block} [data-uploading]'), 0, 'the progress is gone', what='progress')
    # the file line follows the upload: « ✓ reçu : MIAM_OACI_ENR 5.7.pdf (size) le date », never « manquant » beside a « Téléchargé ✓ »
    c.wait(1500)   # the read of the country that follows the upload lists the file: the line stays « reçu »
    fl = c.js("[...document.querySelectorAll('[data-sheet-source=dircam] [data-file-state]')].map(e => [e.dataset.fileState, e.textContent.replace(/\\s+/g, ' ').trim()])")
    c.ok(len(fl) == 1 and fl[0][0] == 'received' and canon in fl[0][1] and fl[0][1].startswith('✓'), fl, 'after the upload the expected file says « ✓ reçu : name (size) le date »')
    c.eq([c.count('[data-sheet-source=dircam] [data-file-state=missing]'), c.count('[data-sheet-source=dircam] .d-cells1 > li[data-ok=yes]')], [0, 1], 'and « Téléchargé ✓ » agrees with it: no « manquant » beside it', what='coherent')
    # ---- the same file again: already there
    answer.update(status=200, body=ok_body(False))
    pick('info_aero_dircam.zip', archive)
    c.until(f"!!document.querySelector('{block} [data-zone-msg][data-level=ok]')", timeout=6000, what='the answer « already there »')
    tpl = norm(CWB('receivedSame').replace('{name}', canon))
    rx = '.{1,24}?'.join(re.escape(p) for p in tpl.split('{b}'))
    c.ok(re.search(rx, msg()) is not None, (msg(), rx), 'the same file is said « already there, nothing rewritten »')
    # the capture: the sheet of France, the DIRCAM line after an upload (the file chosen, what the launcher received, « already there »)
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    _tall_shot(c, f'L119_{c.width}_{lang}_sheet.png', '[data-sheet=fr] [data-sheet-source=dircam]', 1000 if c.width > 800 else 1300, 'end')
    # ---- a PDF as it is, under the name of a second download: sent as it is
    answer.update(status=200, body=ok_body(True))
    n = pick('miam_oaci_enr 5.7 (2).pdf', pdf)
    c.eq([n, urllib.parse.unquote(sent[-1]['headers'].get('x-sog-name', ''))], [1, 'miam_oaci_enr 5.7 (2).pdf'], 'a PDF under a name the launcher recognises (« (2) », any case) is sent as it is', what='copy')
    # ---- the refusals of the launcher, in its real shape: in words, bounded, escaped
    evil = 'ce type de fichier (PDF, XML seul) n’est pas pris par cet envoi <img src=x onerror=window.__pwn=1> ' + 'x' * 400
    refusals = [('unrecognised', 422, {'ok': False, 'reason': 'unrecognised', 'message': evil, 'expected': ['sia', 'nats', 'lfv', 'openaip', 'faa', 'ukmil', 'eurocontrol_rad', 'navpt']}, CWB('refused').replace('{p}', canon)),
                ('type', 415, {'ok': False, 'reason': 'type', 'message': 'ni zip, ni JSON, ni PDF, ni XML'}, UPW('type')),
                ('too-large', 413, {'ok': False, 'reason': 'too-large', 'message': 'plus de 1536 Mo'}, UPW('too-large')),
                ('busy', 409, {'ok': False, 'reason': 'busy', 'message': 'un travail du poste tourne : réessayez à sa fin'}, UPW('busy')),
                ('disk', 507, {'ok': False, 'reason': 'disk', 'message': 'disque'}, UPW('disk'))]
    for reason, status, body, words in refusals:
        answer.update(status=status, body=body)
        n = pick('info_aero_dircam.zip', archive)
        c.eq(n, 1, f'{reason}: the PDF was sent once', what=f'{reason} count')
        c.until(f"!!document.querySelector('{block} [data-zone-msg][data-level=err]')", timeout=6000, what=f'{reason}: the refusal on the DIRCAM line')
        c.ok(norm(words) in msg(), (msg(), norm(words)), f'{reason}: said in words')
        c.ok('info_aero_dircam.zip' in msg(), msg(), f'{reason}: the line names the file the user chose')
    c.eq([c.count(f'{block} img'), c.js('window.__pwn === undefined')], [0, True], 'what the launcher says is escaped (no element, nothing runs)', what='escaped')
    c.ok(len(msg()) < 900, len(msg()), 'and bounded (240 characters of the launcher\'s message at most)')
    # ---- nothing the launcher would refuse leaves the page: a PDF under another name, a member that is not a PDF
    before = len(sent)
    n = pick('ENR 5.7.pdf', pdf)
    c.eq(n, 0, 'a PDF whose name the launcher would not recognise is not sent', what='name')
    c.until(f"!!document.querySelector('{block} [data-zone-msg][data-level=err]')", timeout=6000, what='the refusal on the line')
    c.ok(norm(CWB('pdf-name').replace('{p}', canon)) in msg(), msg(), 'and the line says why, with the name to give')
    n = pick('info_aero_dircam.zip', _l92_zip([('readme.txt', b'x' * 50), (member, b'<html>not a pdf</html>' * 10)]))
    c.eq(n, 0, 'a member that is not a PDF (no %PDF) is not sent', what='content')
    c.ok(norm(CWB('not-pdf').replace('{p}', canon)) in msg(), msg(), 'and the line says why')
    c.eq(len(sent) - before, 0, 'nothing was sent after the refusals of the page', what='total')
    c.check_errors()


# ------------------------------------------------------------------------------------------------------ L93 to L95 (SOG-0262, lot C)
_L93_UNREAD = [{'id': 'naviair', 'files': ['EK_ENR_4_1.pdf'], 'reason': 'no-reader', 'note': 'EK_: Denmark OR Faroe Islands <img src=x onerror=window.__pwn=1>'},
               {'id': 'openaip_xml', 'files': ['gb_apt.xml'], 'reason': 'format', 'note': ''}]
_L93_NEXT = {'cycle': '2026-11-26', 'items': [{'id': 'sia', 'state': 'in-downloads', 'files': ['export_xml_bd_sia_2026-11-26-v01.zip']}, {'id': 'nats', 'state': 'to-take', 'files': []},
                                              {'id': 'faa', 'state': 'will-be-taken', 'files': []}, {'id': 'ukmil', 'state': 'unavailable', 'files': []}]}
_L93_PLAN = {'ok': True, 'zone': 'fr', 'state': 'unpublished', 'commit': 'abc1234', 'ahead': ['gb'], 'commits': 3, 'otherFiles': 2, 'pending': 1, 'nothing': False}
_L93_SENT = {'ok': True, 'zone': 'fr', 'state': 'published', 'sync': {'ok': True, 'pushed': True, 'committed': 3, 'received': 1, 'conflicts': 0, 'refused': 0}}


def _l93_world():
    """The state of five countries with their publication: France and the United Kingdom are built and not sent; plus the cycle after and what is seen but not read."""
    pub = lambda state: {'state': state, 'commit': 'abc1234', 'at': '2026-11-01T12:00:00Z'}
    zs = {z: {**_zst('up-to-date'), 'publish': pub('unpublished' if z in ('fr', 'gb') else 'published')} for z in ('ca', 'es', 'fr', 'gb', 'us')}
    return {'sia_seen': True, 'zs': zs, 'next': _L93_NEXT, 'unread': _L93_UNREAD, 'plan': dict(_L93_PLAN), 'real': dict(_L93_SENT)}


def _l93_open(c, world, nat=None, my_coverage=False):
    """Lot C on the fake launcher: `base/publish` answers the plan from `world['plan']` (dry) and the real run from `world['real']`; the folded blocks are left folded."""
    return _l89_open(c, world, verbs=('base/pickup', 'base/cycle', 'base/publish'), publish=lambda a: world['plan'] if a.get('dry', True) else world['real'], nat=nat, my_coverage=my_coverage)


def _l93_ready(c):
    c.until("document.querySelector('[data-publish-plan=ready]') !== null", timeout=15000, what='the plan of Publier is read')


def _l93_run(c):
    """Taps « Publier… », answers Yes to the question and waits for the result."""
    c.tap('[data-publish] [data-verb=publish]')
    _ask_text(c)
    c.tap('.f-modal [data-ok]')
    c.until("!!document.querySelector('[data-publish-result]')", timeout=8000, what='the result is drawn')


def _l93_real_posts(st):
    return [p for p in st['posts'] if p['verb'] == 'publish' and p['args'].get('dry') is False]


@case('L93', 'Données: « Publier » says FIRST what leaves with it (SOG-0262, lot C) — the plan of base/publish read without writing (the other built zones, the user\'s files as a NUMBER, the unsent commits), « Un envoi emporte TOUS les commits non envoyés… » on the screen, the button « Publier… » asks the usual single question, the real run (dry false, no frame sync) is said in words: sent, committed, conflicts, refused, no trigram; nothing to publish; no plan without a remote',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=True, night=False,
      rule='SOG-0262 + K178 (Q-0025: one push carries every unsent commit, no isolation of one zone): the plan comes from the launcher (counts only, never a user file name); the real run is base/publish { zone, dry: false } (the trigram is the launcher\'s); « Publier » stays ONE place, under the country groups')
def l93(c):
    lang = c.lang
    LC = lambda k, row=0, after='  lc: {': _trow(k, lang, after=after, row=row)
    w = _l93_world()
    st, _x4 = _l93_open(c, w)
    _l93_ready(c)
    # ---- 1. the plan is read once at the opening, for the first built zone not sent, and said BEFORE the button
    reads = [p for p in st['posts'] if p['verb'] == 'publish']
    c.eq([{k: r[k] for k in ('set', 'verb', 'args')} for r in reads], [{'set': 'base', 'verb': 'publish', 'args': {'zone': 'fr', 'dry': True}}], 'one read of the plan at the opening: dry sent explicitly, the first built zone not sent', what='plan read')
    zu = lambda n: f"{n} {_unit('zone', lang, n)}"
    fu = lambda n: f'{n} {FILES[lang][0 if n == 1 else 1]}'
    cu = lambda n: f'{n} {COMMITS[lang][0 if n == 1 else 1]}'
    sentence = LC('planAll').replace('{z}', zu(2)).replace('{f}', fu(3))
    commits = LC('planCommits').replace('{c}', cu(3))
    c.eq(norm(c.text('[data-publish] [data-plan-sentence]')), norm(f'{sentence} {commits}'), 'what leaves with an upload, said plainly: every unsent commit — 2 built zones, 3 files of yours (counts only), 3 commits', what='sentence')
    names = {'fr': ['France', 'Royaume-Uni'], 'en': ['France', 'United Kingdom'], 'de': ['Frankreich', 'Vereinigtes Königreich'], 'es': ['Francia', 'Reino Unido']}[lang]
    c.eq(norm(c.text('[data-publish] [data-plan-zones]')), norm(LC('planZones').replace('{z}', ', '.join(names))), 'the zones that leave, by name', what='zones line')
    c.eq(c.js("!!(document.querySelector('[data-publish] [data-plan-sentence]').compareDocumentPosition(document.querySelector('[data-publish] [data-verb=publish]')) & 4)"), True, 'the plan comes before the button', what='before button')
    c.eq([norm(c.text('[data-publish] [data-verb=publish]')), c.js("document.querySelector('[data-publish] [data-verb=publish]').disabled")], [norm(LC('publishDots')), False], 'the button says « Publier… » and is live (the launcher sends: no frame gesture needed)', what='button')
    c.eq(c.count('[data-verb=publish]'), 1, 'ONE place for Publier in the base group', what='one place')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    # ---- 2. the question: the same sentence, the commits, then the question; No: nothing is sent
    c.tap('[data-publish] [data-verb=publish]')
    q = _ask_text(c)
    c.eq([norm(q['text']), norm(q['ok']), q['no']], [norm(f"{sentence} {commits} {LC('planTail')}"), norm(_trow('publish', lang)), True], 'ONE question: what leaves, then « Publier vers le dépôt des données ? »', what='question')
    c.eq(len(_l93_real_posts(st)), 0, 'nothing is sent before the answer (the plan was read again, dry)', what='no real run')
    c.tap('.f-modal [data-no]')
    c.until("!document.querySelector('.f-modal')", what='the window closes')
    c.wait(300)
    c.eq([len(_l93_real_posts(st)), c.count('[data-publish-result]')], [0, 0], 'No: nothing is sent, nothing is said', what='refusal')
    # ---- 3. Yes: the real run is the verb (dry false) for that zone, once; the result in words
    _l93_run(c)
    c.eq([{k: r[k] for k in ('set', 'verb', 'args')} for r in _l93_real_posts(st)], [{'set': 'base', 'verb': 'publish', 'args': {'zone': 'fr', 'dry': False}}], 'the real run: base/publish { zone, dry: false }, once', what='real run')
    done = _trow('pubDone', lang).replace('{c}', '3').replace('{r}', '1')
    c.eq([c.attr('[data-publish-result]', 'data-result'), norm(c.text('[data-publish-result] [data-line=done]'))], ['done', norm(done)], 'the result in words: sent, 3 files committed, 1 received', what='result')
    c.eq(len(_notes_with(c, done)), 1, 'ONE notification with the counts', what='notification')
    doc = c.until_doc('cache/data/journal.json', lambda d: bool(d and d.get('ops')), what='the journal is written')
    c.eq([doc['ops'][-1]['verb'], doc['ops'][-1]['result'], doc['ops'][-1]['committed']], ['publish', 'done', 3], 'the journal entry', what='journal')
    # ---- 4. nothing left (the plan says so at the next opening): said, the button is grey with its reason, written once
    w['plan'] = {**_L93_PLAN, 'state': 'published', 'ahead': [], 'commits': 0, 'otherFiles': 0, 'pending': 0, 'nothing': True}
    c.page.reload(wait_until='load')
    c.until("!!document.querySelector('[data-publish-plan=nothing]')", timeout=15000, what='the plan says nothing is left')
    c.eq([norm(c.text('[data-publish-plan=nothing]')), c.js("document.querySelector('[data-publish] [data-verb=publish]').disabled"), c.attr('[data-publish] [data-reason]', 'data-reason'), c.count('[data-publish] [data-reason]')],
         [norm(LC('planNothing')), True, 'nothing', 1], 'nothing to publish: said, the button grey for that reason, written once', what='nothing')
    # ---- 5. the real run with a conflict and refused files, then without a trigram
    w['plan'] = dict(_L93_PLAN)
    w['real'] = {'ok': True, 'zone': 'fr', 'state': 'unpublished', 'sync': {'ok': True, 'pushed': True, 'committed': 1, 'received': 0, 'conflicts': 1, 'refused': 2}}
    c.page.reload(wait_until='load')
    _l93_ready(c)
    _l93_run(c)
    lines = c.js("[...document.querySelectorAll('[data-publish-result] [data-line]')].map(p => [p.dataset.line, p.textContent.replace(/\\s+/g, ' ').trim()])")
    c.eq(lines, [['done', norm(_trow('pubDone', lang).replace('{c}', '1').replace('{r}', '0'))], ['conflicts', norm(_trow('pubConflicts', lang, row=0).replace('{n}', '1'))], ['refused', norm(_trow('pubRefused', lang, row=1).replace('{n}', '2'))]],
         'the result says what went, the conflict and the 2 refused files', what='conflicts / refused')
    w['real'] = {'ok': False, 'reason': 'no-author', 'zone': 'fr', 'state': 'unpublished', 'message': 'trigram of the author missing or invalid'}
    c.page.reload(wait_until='load')
    _l93_ready(c)
    _l93_run(c)
    c.eq([c.attr('[data-publish-result]', 'data-result'), norm(c.text('[data-publish-result] [data-line=no-author]'))], ['no-author', norm(LC('pubNoAuthor'))], 'no trigram: nothing left, said with what to do (Réglages › Identité)', what='no author')
    # ---- 6. no remote repository: the reason in words, from the plan
    w['plan'] = {'ok': False, 'zone': 'fr', 'reason': 'no-remote'}
    c.page.reload(wait_until='load')
    c.until("!!document.querySelector('[data-publish-plan=refused]')", timeout=15000, what='the plan is refused')
    c.eq([c.attr('[data-publish-plan=refused]', 'data-plan-reason'), norm(c.text('[data-publish-plan=refused]'))], ['no-remote', norm(_trow('no-remote', lang, after='    planReason: {'))], 'no remote repository: the reason in words', what='no remote')
    c.eq(c.js("document.documentElement.scrollWidth <= window.innerWidth"), True, 'no horizontal scroll', what='no sideways scroll')
    w['plan'] = dict(_L93_PLAN)
    c.page.reload(wait_until='load')
    _l93_ready(c)
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    if c.width in (390, 1280):
        c.js("document.querySelector('[data-publish]').scrollIntoView({ block: 'center' })")
        c.shot(f'L93_{c.width}_{lang}_delivered.png')
    c.check_errors()


@case('L94', 'Données: under « Publier », three folded blocks in this order (SOG-0262, lot C) — « Cycle suivant (2612) » (already in Downloads by the file names, still to fetch by hand, taken by itself once in force, the shelved ones apart), « Quand ça change » (X-Plane, Little Navmap, openAIP, GeoNames, MORA with their last date and a button where the screen has the gesture; the NAT tracks say their validity and are taken again when the fold opens, no « Ouvrir »), « Vu par le poste, pas encore lu » (file names, reason in words, the note); « Ma couverture » folded at the foot; the page order',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=True, night=False,
      rule='SOG-0262 lot C: the lists come from the one read of base/cycle (next, unread) — no launcher call of their own; the NAT line reads aerodb.natState() and calls natEnsure() when the fold opens (SOG-0263); an untrusted launcher string is escaped; nothing in « vu, pas encore lu » is an action')
def l94(c):
    lang = c.lang
    LC = lambda k, row=0, after='  lc: {': _trow(k, lang, after=after, row=row)
    NAT = lambda k: LC(k, after='    nat: {')
    w = _l93_world()
    valid = {'present': True, 'count': 17, 'from': '2026-11-12T07:00:00Z', 'validUntil': '2026-11-12T19:00:00Z', 'expired': False, 'current': 12}
    expired = {**valid, 'validUntil': '2026-11-10T19:00:00Z', 'expired': True, 'current': 0}
    st, _x4 = _l93_open(c, w, nat={'state': valid})
    _l93_ready(c)
    # ---- 1. the page order, the folds folded, no call of their own
    pos = c.js("""(() => { const q = s => document.querySelector(s), before = (a, b) => !!(q(a).compareDocumentPosition(q(b)) & Node.DOCUMENT_POSITION_FOLLOWING);
      return [before('[data-state-head]', '[data-world-map]'), before('[data-world-map]', '[data-todo]'), before('[data-todo]', '[data-cw-groups]'), before('[data-cw-groups]', '[data-publish]'), before('[data-publish]', '[data-lc-fold=later]'),
        before('[data-lc-fold=later]', '[data-lc-fold=change]'), before('[data-lc-fold=change]', '[data-lc-fold=unread]'), before('[data-lc-fold=unread]', '[data-my-coverage]')] })()""")
    c.eq(pos, [True] * 8, 'the page order: state bar, map, what is left to do, the country groups, Publier, cycle suivant, quand ça change, vu pas encore lu, ma couverture', what='page order')
    c.eq(c.js("[...document.querySelectorAll('[data-lc-fold], [data-my-coverage]')].map(d => [d.dataset.lcFold || 'mycov', d.open])"), [['later', False], ['change', False], ['unread', False], ['registry', False], ['mycov', False]], 'the three blocks, the French register (SOG-0315) and « Ma couverture » are folded', what='folded')
    c.eq([norm(c.text('[data-lc-fold=later] > summary > .d-lct')), norm(c.text('[data-lc-fold=change] > summary > .d-lct')), norm(c.text('[data-lc-fold=unread] > summary > .d-lct')), norm(c.text('[data-my-coverage] > summary'))],
         [norm(LC('laterTitle').replace('{c}', '2612')), norm(LC('changeTitle')), norm(LC('unreadTitle')), norm(LC('myCovTitle'))], 'their titles, the cycle after is named (each fold has its count pill after the title: lot D2)', what='titles')
    calls = lambda: c.js('window.__stub.calls') or {}
    c.eq([len(_l89_reads(st)), len(_l89_reads(st, 'fr')), calls().get('natState', 0), calls().get('natEnsure', 0)], [1, 0, 0, 0], 'no launcher call of their own: the one read of base/cycle feeds them; the NAT tracks are not read before the fold opens', what='lazy')
    # ---- 2. Cycle suivant
    c.tap('[data-lc-fold=later] > summary')
    c.until("document.querySelector('[data-lc-fold=later]').open", timeout=3000, what='the fold opens')
    lists = c.js("[...document.querySelectorAll('[data-lc-fold=later] [data-later-list]')].map(u => [u.dataset.laterList, [...u.querySelectorAll('li')].map(l => [l.dataset.laterItem, l.textContent.replace(/\\s+/g, ' ').trim()])])")
    c.eq([[k, [i[0] for i in items]] for k, items in lists], [['in-downloads', ['sia']], ['to-take', ['nats']], ['will-be-taken', ['faa']]], 'three lists in order: already in Downloads, still to fetch by hand, taken by itself once in force', what='lists')
    c.ok('export_xml_bd_sia_2026-11-26-v01.zip' in lists[0][1][0][1], lists[0], 'the file already in Downloads is named')
    c.eq([norm(c.text(f'[data-later-title={k}]')) for k in ('in-downloads', 'to-take', 'will-be-taken')], [norm(_trow(k, lang, after='    laterState: {')) for k in ('in-downloads', 'to-take', 'will-be-taken')], 'the three headings', what='headings')
    c.eq([c.js("[...document.querySelectorAll('[data-later-gone] li')].map(l => l.dataset.laterItem)"), c.js("document.querySelector('[data-later-gone-title]').compareDocumentPosition(document.querySelector('[data-later-gone]')) & 4")], [['ukmil'], 4], 'a source its publisher no longer offers is apart, under its muted title', what='gone')
    # ---- 3. Quand ça change: the lines, their dates, the buttons; the NAT validity without « Ouvrir »
    c.tap('[data-lc-fold=change] > summary')
    c.until("(document.querySelector('[data-change=nat] [data-change-last]')?.textContent || '').includes('19:00Z')", timeout=8000, what='the NAT validity is read')
    c.eq(c.js("[...document.querySelectorAll('[data-change-list] > li')].map(l => l.dataset.change)"), ['xplane', 'lnm', 'openaip', 'geonames', 'mora', 'nat'], 'six lines: X-Plane, Little Navmap, openAIP, GeoNames, MORA, the NAT tracks', what='lines')
    last = lambda i: norm(c.text(f'[data-change={i}] [data-change-last]'))
    c.eq([last('openaip'), last('xplane'), last('geonames')], [norm(LC('changeLast').replace('{d}', _date_text(datetime.date(2026, 11, 2), lang))), norm(LC('changeNoDate')), norm(LC('changeNoDate'))], 'the last date of a source (the day of its file), « date non lue » when the list of the cycle gives none', what='dates')
    c.eq(c.js("[...document.querySelectorAll('[data-change-list] [data-act=change-act]')].map(b => [b.closest('li').dataset.change, b.dataset.kind, b.disabled])"), [['xplane', 'build', False], ['openaip', 'fetch', False], ['mora', 'fetch', False]], 'a button where the screen already has the gesture (rebuild, download again), none for Little Navmap, GeoNames and the NAT tracks', what='buttons')
    until = f"{_date_text(datetime.date(2026, 11, 12), lang)} 19:00Z"
    c.eq(last('nat'), norm(NAT('valid').replace('{d}', until) + ' · ' + NAT('count').replace('{n}', '17')), 'the NAT line says the validity and the number of tracks', what='nat valid')
    c.eq([calls().get('natState', 0), calls().get('natEnsure', 0), c.count('[data-change=nat] a, [data-change=nat] button'), c.count('[data-set=nat] a[target=_blank]')], [1, 0, 0, 0], 'valid tracks: read once, not taken again, and « Ouvrir » is gone (no link, no button on the line or on the row)', what='nat calls')
    # expired tracks: the fold opens -> taken again; then the launcher cannot (said, no new try at once)
    c.js("window.__stub.nat = { state: " + json.dumps(expired) + ", ensure: " + json.dumps({**valid, 'validUntil': '2026-11-13T07:00:00Z'}) + ", ok: true }")
    c.js("document.querySelector('[data-lc-fold=change]').open = false")
    c.tap('[data-lc-fold=change] > summary')
    c.until("(window.__stub.calls.natEnsure || 0) === 1", timeout=8000, what='the expired tracks are taken again when the fold opens')
    c.until("document.querySelector('[data-change=nat] [data-change-last]').textContent.includes('07:00Z')", timeout=8000, what='the new validity')
    c.eq(last('nat'), norm(NAT('refreshed').replace('{d}', f"{_date_text(datetime.date(2026, 11, 13), lang)} 07:00Z") + ' · ' + NAT('count').replace('{n}', '17')), 'taken again: said, with the new validity', what='nat refreshed')
    c.js("window.__stub.nat = { state: " + json.dumps(expired) + ", ensure: null, ok: false }")
    c.js("document.querySelector('[data-lc-fold=change]').open = false")
    c.tap('[data-lc-fold=change] > summary')
    c.until("(window.__stub.calls.natEnsure || 0) === 2 && document.querySelector('[data-change=nat] [data-change-last]').textContent.includes('10')", timeout=8000, what='the failed retake is said')
    c.ok(norm(NAT('expired').replace('{d}', f"{_date_text(datetime.date(2026, 11, 10), lang)} 19:00Z")) in last('nat') and norm(NAT('failed')) in last('nat'), last('nat'), 'expired tracks: « périmées (valides jusqu\'à … ) » then the failure in words')
    # ---- 4. Vu par le poste, pas encore lu: file names, reason in words, the note (escaped); no action
    c.tap('[data-lc-fold=unread] > summary')
    c.until("document.querySelector('[data-lc-fold=unread]').open", timeout=3000, what='the fold opens')
    rows = c.js("[...document.querySelectorAll('[data-unread-list] > li')].map(l => [l.dataset.unread, l.dataset.unreadReason, l.querySelector('[data-unread-why]').textContent, l.textContent.replace(/\\s+/g, ' ').trim()])")
    c.eq([[r[0], r[1], norm(r[2])] for r in rows], [['naviair', 'no-reader', norm(LC('no-reader', after='    unreadReason: {'))], ['openaip_xml', 'format', norm(LC('format', after='    unreadReason: {'))]], 'one line per source seen and not read, its reason in words (no reader / format not recognised)', what='unread')
    c.ok('EK_ENR_4_1.pdf' in rows[0][3] and 'EK_: Denmark OR Faroe Islands' in rows[0][3] and 'gb_apt.xml' in rows[1][3], rows, 'the file names and the note of the launcher (Denmark OR Faroe) are said')
    c.eq([c.count('[data-lc-fold=unread] button, [data-lc-fold=unread] a, [data-lc-fold=unread] img'), c.js('window.__pwn === undefined')], [0, True], 'nothing here is an action; the note is escaped (nothing is injected)', what='no action')
    # ---- 5. « Ma couverture »: the packs and the box « Je certifie… » are one tap away
    c.tap('[data-my-coverage] > summary')
    c.until("document.querySelector('[data-my-coverage]').open", timeout=3000, what='the fold opens')
    c.eq([c.count('[data-my-coverage] [data-packs-fold]'), c.count('[data-my-coverage] [data-certify]')], [1, 1], 'the country packs and the box « Je certifie… » live in « Ma couverture »', what='my coverage')
    c.eq(c.js("document.documentElement.scrollWidth <= window.innerWidth"), True, 'no horizontal scroll', what='no sideways scroll')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.js("document.querySelector('[data-my-coverage]').open = false")
    if c.width in (390, 1280):
        c.js("document.querySelector('[data-publish]').scrollIntoView({ block: 'start' })")
        c.shot(f'L94_{c.width}_{lang}_delivered.png')
    c.check_errors()


@case('L95', 'Données: « Ajouter à ma couverture » on the sheet of a country outside the coverage (SOG-0262, lot C) — it says in words what adding will ask (download by the launcher, take by hand with the expected file names, the personal-use box, files dropped and not read yet) from base/cycle { zone } addWillAsk; the button adds the country (nothing is downloaded); « Retirer de ma couverture » on a covered country asks first and never purges',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=True, night=False,
      rule='SOG-0262 (Q-0028 « Ajouter à ma couverture » avec ce que cela demandera): addWillAsk = { sources, auto, hand: [{ id, expected }], personal, noReader }; the add writes the coverage only (addZone); removal is one question first (the files stay)')
def l95(c):
    lang = c.lang
    li = {'fr': 0, 'en': 1, 'de': 2, 'es': 3}[lang]
    LC = lambda k, row=0, after='  lc: {': _trow(k, lang, after=after, row=row)
    w = _l93_world()
    st, _x4 = _l93_open(c, w)
    de = _L88_NAMES['de'][li]
    c.tap('[data-wmap] path[data-zone=de]')
    c.until("!!document.querySelector('[data-sheet=de] [data-add-ask] [data-ask]')", timeout=10000, what='the sheet of Germany says what adding it will ask')
    c.eq([c.count('[data-sheet=de] [data-sheet-out]'), c.count('[data-sheet=de] [data-tick]'), c.count('[data-sheet=de] [data-sheet-update]')], [1, 0, 0], 'outside the coverage: it says so, no tick, no update', what='outside')
    asks = c.js("[...document.querySelectorAll('[data-sheet=de] [data-add-ask] [data-ask]')].map(l => [l.dataset.ask, l.hasAttribute('data-sheet-noreader'), l.textContent.replace(/\\s+/g, ' ').trim()])")
    c.eq([[a[0], a[1]] for a in asks], [['auto', False], ['hand', False], ['personal', False], ['noreader', True]], 'four things, in words: download by the launcher, take by hand, the box, files dropped and not read yet', what='asks')
    c.eq(norm(c.text('[data-sheet=de] [data-add-ask] > p b')), norm(LC('addTitle')), 'the title says what adding will ask', what='title')
    c.ok(norm(LC('addAuto').split('{s}')[0]) in norm(asks[0][2]) and 'openAIP' in asks[0][2], asks[0], 'automatic: the sources the launcher downloads by itself are named')
    c.ok('export_xml_bd_SIA_<AAAA-MM-JJ>-v<nn>.zip' in asks[1][2] and norm(LC('addHand').split('{s}')[0]) in norm(asks[1][2]), asks[1], 'by hand: the source and the expected file names')
    c.ok(norm(LC('addPersonal').split('{s}')[0]) in norm(asks[2][2]) and norm(LC('addNoReader').split('{s}')[1]) in norm(asks[3][2]), asks[2:], 'the personal-use box and the files not read yet are said')
    c.eq(norm(c.text('[data-sheet=de] [data-act=add-country]')), norm(LC('addBtn')), 'the button', what='button')
    c.eq(c.js("document.documentElement.scrollWidth <= window.innerWidth"), True, 'no horizontal scroll', what='no sideways scroll')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    if c.width in (390, 1280):
        c.shot(f'L95_{c.width}_{lang}_delivered.png')
    n_posts = len(st['posts'])
    c.tap('[data-sheet=de] [data-act=add-country]')
    doc = c.until_doc('cache/data/coverage.json', lambda d: bool(d and 'de' in d.get('zones', [])), what='the country is in the coverage')
    c.eq(sorted(doc['zones']), ['ca', 'de', 'es', 'fr', 'gb', 'us'], 'the coverage is written with the country', what='coverage.json')
    c.eq(len(_notes_with(c, LC('added').replace('{c}', de))), 1, 'one notification', what='notification')
    c.eq([p['verb'] for p in st['posts'][n_posts:] if p['verb'] in ('fetch', 'build', 'update')], [], 'adding downloads and builds nothing', what='nothing started')
    c.until("!document.querySelector('[data-sheet=de] [data-add-ask]') && !!document.querySelector('[data-sheet=de] [data-sheet-remove]')", timeout=8000, what='the sheet is now the one of a covered country')
    # ---- remove: one question first, No keeps it, Yes removes it (the files are never purged)
    c.tap('[data-sheet=de] [data-act=remove-country]')
    q = _ask_text(c)
    c.eq([norm(q['text']), norm(q['ok'])], [norm(LC('removeAsk').replace('{c}', de)), norm(LC('removeBtn'))], 'ONE question that says the files stay', what='question')
    c.tap('.f-modal [data-no]')
    c.until("!document.querySelector('.f-modal')", what='the window closes')
    c.wait(300)
    c.eq('de' in (c.doc('cache/data/coverage.json') or {}).get('zones', []), True, 'No: still in the coverage', what='kept')
    c.tap('[data-sheet=de] [data-act=remove-country]')
    _ask_text(c)
    c.tap('.f-modal [data-ok]')
    c.until_doc('cache/data/coverage.json', lambda d: bool(d and 'de' not in d.get('zones', [])), what='the country leaves the coverage')
    c.eq([len(_notes_with(c, LC('removed').replace('{c}', de))), [p['verb'] for p in st['posts'][n_posts:] if p['verb'] == 'purge']], [1, []], 'Yes: out of the coverage, one notification, nothing purged', what='removed')
    c.until("!!document.querySelector('[data-sheet=de] [data-add-ask]')", timeout=8000, what='the sheet offers to add it again')
    c.check_errors()


# ------------------------------------------------------------------------------------------------------ L96 .. L101 (lot D1: the user's real trial)
def _l96_inside(v, world, base, eps=1e-3):
    """The view [x, y, w, h] stays in the world (or in the frame it started from when that one is larger)."""
    x0, x1 = min(world[0], base[0]), max(world[0] + world[2], base[0] + base[2])
    y0, y1 = min(world[1], base[1]), max(world[1] + world[3], base[1] + base[3])
    return v[0] >= x0 - eps and v[1] >= y0 - eps and v[0] + v[2] <= x1 + eps and v[1] + v[3] <= y1 + eps


_L96_WHEEL = """([dy, fx, fy]) => { const s = document.querySelector('[data-wmap]'), r = s.getBoundingClientRect();
  return !s.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, ctrlKey: true, clientX: r.left + r.width * fx, clientY: r.top + r.height * fy, bubbles: true, cancelable: true })) }"""
_L96_PTR = """([type, id, fx, fy, kind, target]) => { const s = document.querySelector('[data-wmap]'), r = s.getBoundingClientRect(), t = target ? document.querySelector(target) : s;
  t.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: kind, isPrimary: id === 1, button: type === 'pointermove' ? -1 : 0, buttons: type === 'pointerup' ? 0 : 1, clientX: r.left + r.width * fx, clientY: r.top + r.height * fy, bubbles: true, cancelable: true })) }"""


@case('L96', 'Données: the world map zooms and pans again (SOG-0262, lot D1) — wheel zoom around the pointer, pinch, drag, bounded to the world, « Voir le monde entier » and « Recentrer sur ma couverture »; the blue border of the open pack and the hover survive; a drag never opens a sheet',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=True, night=False,
      rule='SOG-0262 D1 (the user\'s trial: « on ne peut plus zoomer sur la carte »): the lot A SVG map lost zoom and pan; the view is a box kept in the state of the screen (a redraw keeps it), bounded to the world (no panning off it, a minimum and a maximum zoom); a drag is swallowed (no sheet), a plain tap still opens the sheet; the two buttons give back the world and the framing of the coverage')
def l96(c):
    lang = c.lang
    ZX = lambda k: _trow(k, lang, after='  zx: {')
    st, _x4 = _l89_open(c, {'sia_seen': True})
    vb = lambda: c.js("document.querySelector('[data-wmap]').getAttribute('viewBox').split(' ').map(Number)")
    frame = lambda a: c.js(f"(s => (s.getAttribute('{a}') || s.getAttribute('viewBox')).split(' ').map(Number))(document.querySelector('[data-wmap]'))")
    base0, world, v0 = frame('data-base'), frame('data-world'), vb()
    ptr = lambda *a: c.js(_L96_PTR, list(a))
    c.eq(v0, base0, 'the map opens framed on the coverage', what='initial frame')
    # ---- 1. a plain tap still opens the sheet, a drag is swallowed (no sheet)
    _l89_sheet(c, 'gb')
    c.eq(c.count('[data-sheet=gb]'), 1, 'a plain tap on a country opens its sheet', what='tap opens')
    c.tap('[data-sheet] [data-act=sheet-close]:visible')
    c.until("!document.querySelector('[data-sheet]')", timeout=4000, what='the sheet closes')
    gb = '[data-wmap] path[data-zone=gb]'
    ptr('pointerdown', 1, .5, .5, 'mouse', gb)
    for i in range(1, 7):
        ptr('pointermove', 1, .5 + i * .02, .5 + i * .01, 'mouse', None)
    ptr('pointerup', 1, .62, .56, 'mouse', None)
    c.js(f"document.querySelector('{gb}').dispatchEvent(new MouseEvent('click', {{ bubbles: true, cancelable: true }}))")
    c.wait(300)
    c.eq(c.count('[data-sheet]'), 0, 'a drag that ends on a country does not open its sheet', what='drag swallowed')
    c.ok(vb() != v0, vb(), 'the drag moved the view')
    # ---- 2. the wheel zooms around the pointer, and the page does not scroll
    c.tap('[data-act=map-home]')
    c.until("document.querySelector('[data-wmap]').getAttribute('viewBox') === document.querySelector('[data-wmap]').getAttribute('data-base')", timeout=4000, what='back to the framing of the coverage')
    v1 = vb()
    r = c.js("""() => { const s = document.querySelector('[data-wmap]'), b = s.getBoundingClientRect(), x = b.left + b.width * .3, y = b.top + b.height * .5, at = () => { const p = new DOMPoint(x, y).matrixTransform(s.getScreenCTM().inverse()); return [p.x, p.y] };
      const u1 = at(), prevented = !s.dispatchEvent(new WheelEvent('wheel', { deltaY: -240, ctrlKey: true, clientX: x, clientY: y, bubbles: true, cancelable: true })); return [prevented, u1, at()] }""")
    prevented, u1, u2 = r
    v2 = vb()
    c.ok(prevented, prevented, 'the wheel over the map is taken (the page does not scroll)')
    c.ok(v2[2] < v1[2] - 1e-6, (v1, v2), 'wheel forward zooms in (the view is narrower)')
    c.ok(abs(u1[0] - u2[0]) < v1[2] * 1e-3 and abs(u1[1] - u2[1]) < v1[3] * 1e-2, (u1, u2), 'the zoom is around the pointer (not around the centre of the view): the point under it stays under it')
    c.ok(abs(v2[2] / v2[3] - v1[2] / v1[3]) < 1e-3, (v1, v2), 'the proportions of the frame are kept')
    r2 = c.js("""() => { const s = document.querySelector('[data-wmap]'), b = s.getBoundingClientRect(), d = document.scrollingElement; return [d.scrollHeight - d.clientHeight > 2, !s.dispatchEvent(new WheelEvent('wheel', { deltaY: -240, clientX: b.left + b.width / 2, clientY: b.top + b.height / 2, bubbles: true, cancelable: true }))] }""")
    c.eq(r2, [True, True], 'a plain wheel over the map (no Ctrl) is taken even while the page has something to scroll (SOG-0285, L123): the map zooms, the page does not scroll', what='plain wheel')
    # ---- 3. bounded: zoom out far, zoom in far, drag far
    for _ in range(14):
        c.js(_L96_WHEEL, [800, .5, .5])
    v3 = vb()
    c.ok(_l96_inside(v3, world, base0) and v3[2] <= max(min(world[2], world[3] * base0[2] / base0[3]), base0[2]) + 1e-3, (v3, world), 'zoomed out as far as it goes: the view stays in the world, never wider than it')
    for _ in range(40):
        c.js(_L96_WHEEL, [-800, .5, .5])
    v4 = vb()
    c.ok(v4[2] >= world[2] / 80 - 1e-6 and v4[2] <= v3[2], (v4, world), 'zoomed in as far as it goes: a minimum width, it never collapses')
    ptr('pointerdown', 1, .5, .5, 'mouse', None)
    for i in range(1, 12):
        ptr('pointermove', 1, .5 - i * .5, .5 - i * .5, 'mouse', None)
    ptr('pointerup', 1, -5, -5, 'mouse', None)
    v5 = vb()
    c.ok(_l96_inside(v5, world, base0) and v5 != v4, (v5, world), 'a long drag moves the view but never off the world')
    # ---- 4. pinch
    c.tap('[data-act=map-home]')
    c.until("document.querySelector('[data-wmap]').getAttribute('viewBox') === document.querySelector('[data-wmap]').getAttribute('data-base')", timeout=4000, what='home again')
    v6 = vb()
    ptr('pointerdown', 1, .4, .5, 'touch', None)
    ptr('pointerdown', 2, .6, .5, 'touch', None)
    for i in range(1, 6):
        ptr('pointermove', 1, .4 - i * .03, .5, 'touch', None)
        ptr('pointermove', 2, .6 + i * .03, .5, 'touch', None)
    ptr('pointerup', 1, .25, .5, 'touch', None)
    ptr('pointerup', 2, .75, .5, 'touch', None)
    v7 = vb()
    c.ok(v7[2] < v6[2] * .9, (v6, v7), 'two fingers moving apart zoom in')
    # ---- 5. the buttons
    c.tap('[data-act=map-zoom][data-dir=out]')
    c.ok(vb()[2] > v7[2], vb(), '« − » zooms out')
    c.eq([norm(c.text('[data-act=world-toggle]')), norm(c.text('[data-act=map-home]'))], [norm(ZX('mvWorld')), norm(ZX('mvHome'))], 'the two buttons say what they do', what='button labels')
    c.tap('[data-act=world-toggle]')
    c.until("document.querySelector('[data-wmap]').getAttribute('viewBox') === document.querySelector('[data-wmap]').getAttribute('data-world')", timeout=4000, what='the whole world is framed')
    c.eq(vb(), world, '« Voir le monde entier »: the frame of the world', what='world frame')
    c.tap('[data-act=map-home]')
    c.until("document.querySelector('[data-wmap]').getAttribute('viewBox') === document.querySelector('[data-wmap]').getAttribute('data-base')", timeout=4000, what='the coverage is framed again')
    c.eq(vb(), base0, '« Recentrer sur ma couverture »: the first framing', what='home frame')
    # ---- 6. the border of the open pack and the hover survive a zoom and a redraw
    c.tap('[data-group-id=ouest] [data-act=grp-toggle]')
    c.until("document.querySelectorAll('[data-wmap] path[data-grp]').length >= 2", timeout=4000, what='the pack is outlined')
    sw0 = c.js("getComputedStyle(document.querySelector('[data-wmap] path[data-grp]')).strokeWidth")
    for _ in range(3):
        c.js(_L96_WHEEL, [-240, .5, .5])
    vz = vb()
    c.tap('[data-act=legend-more]')   # D4: opening another pack now FRAMES the map on it, so the redraw is the legend's « ? » here
    c.until("!!document.querySelector('[data-cw-legend-more]')", timeout=4000, what='the panel is redrawn')
    c.eq(vb(), vz, 'a redraw of the panel keeps the zoom and the position', what='redraw keeps')
    c.until("document.querySelectorAll('[data-wmap] path[data-grp]').length >= 2", timeout=4000, what='the first pack is still outlined')
    c.eq(c.js("getComputedStyle(document.querySelector('[data-wmap] path[data-grp]')).strokeWidth"), sw0, 'the blue border keeps its width when zoomed (it is not scaled)', what='border width')
    c.js("document.querySelector('[data-wmap] path[data-zone=fr]').dispatchEvent(new PointerEvent('pointerover', { pointerType: 'mouse', bubbles: true }))")
    c.eq([c.count('[data-wmap] path[data-hover]'), c.js("getComputedStyle(document.querySelector('[data-wmap] path[data-hover]')).fillOpacity")], [1, '1'], 'the hovered country is filled, zoomed', what='hover')
    # ---- 7. on a touch screen ONE finger scrolls the PAGE (touch-action: pan-y on the map) and TWO fingers pan and pinch the map (lot D2: « un doigt fait défiler, deux doigts déplacent »)
    c.eq(c.js("getComputedStyle(document.querySelector('[data-wmap]')).touchAction"), 'pan-y', 'the map leaves the vertical pan to the page (touch-action: pan-y), never `none`', what='touch-action')
    c.tap('[data-act=map-home]')
    c.until("document.querySelector('[data-wmap]').getAttribute('viewBox') === document.querySelector('[data-wmap]').getAttribute('data-base')", timeout=4000, what='home again')
    if c.width < 900:
        cdp = c.page.context.new_cdp_session(c.page)
        touch = lambda kind, pts: cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': [{'x': x, 'y': y, 'id': i} for i, (x, y) in enumerate(pts)]})
        c.js("document.querySelector('[data-wmap]').scrollIntoView({ block: 'start', behavior: 'instant' }); window.scrollBy(0, -40)")
        c.wait(300)
        b0 = c.js("(r => [r.left + r.width / 2, r.top + r.height / 2])(document.querySelector('[data-wmap]').getBoundingClientRect())")
        y0, v0 = c.js('window.scrollY'), vb()
        touch('touchStart', [(b0[0], b0[1] + 40)])
        for i in range(1, 13):
            touch('touchMove', [(b0[0], b0[1] + 40 - i * 12)])
            c.wait(16)
        touch('touchEnd', [])
        c.wait(400)
        c.ok(c.js('window.scrollY') > y0 + 40, (y0, c.js('window.scrollY')), 'ONE finger dragging up from the map scrolls the page (scrollY changes)')
        c.eq(vb(), v0, 'and the map does not move: the page took the gesture', what='map unchanged')
        c.js("document.querySelector('[data-wmap]').scrollIntoView({ block: 'center', behavior: 'instant' })")
        c.wait(300)
        b1 = c.js("(r => [r.left + r.width / 2, r.top + r.height / 2])(document.querySelector('[data-wmap]').getBoundingClientRect())")
        y1, v1 = c.js('window.scrollY'), vb()
        touch('touchStart', [(b1[0] - 40, b1[1]), (b1[0] + 40, b1[1])])
        for i in range(1, 9):
            touch('touchMove', [(b1[0] - 40 - i * 8, b1[1]), (b1[0] + 40 + i * 8, b1[1])])
            c.wait(16)
        touch('touchEnd', [])
        c.wait(300)
        v2 = vb()
        c.ok(v2[2] < v1[2] * .9 and abs(c.js('window.scrollY') - y1) < 4, (v1, v2), 'TWO fingers moving apart on the map pinch-zoom it, the page stays where it is')
        touch('touchStart', [(b1[0] - 30, b1[1]), (b1[0] + 30, b1[1])])
        for i in range(1, 9):
            touch('touchMove', [(b1[0] - 30 - i * 10, b1[1] + i * 4), (b1[0] + 30 - i * 10, b1[1] + i * 4)])
            c.wait(16)
        touch('touchEnd', [])
        c.wait(300)
        v3 = vb()
        c.ok(abs(v3[0] - v2[0]) > 1e-3 or abs(v3[1] - v2[1]) > 1e-3, (v2, v3), 'TWO fingers moving together pan the map')
    c.check_errors()


def _l97_world(ca_stale=False):
    """A world where the United Kingdom is stale and buildable (and Canada too, when asked), the other countries up to date; the file of the SIA is not in Downloads."""
    zs = {'ca': _zst('stale', _NEWER) if ca_stale else _zst('up-to-date'), 'es': _zst('up-to-date'), 'us': _zst('up-to-date'),
          'fr': _zst('stale', {'code': 'pickup-waiting', 'source': 'sia', 'cycle': '2026-11-26', 'zip': 'export_xml_bd_sia_2026-10-29-v01.zip'}, buildable=False), 'gb': _zst('stale', _NEWER)}
    return {'sia_seen': False, 'zs': zs}


def _l97_dl(state='done', zone='gb', failed=None, jid='f1'):
    """A download view of the United Kingdom: running (one source read), done (fetched) or failed (a source refused)."""
    res = {'fetched': [] if failed else [zone], 'unchanged': [], 'failed': failed or [], 'manual': []}
    return _fview({zone: _fz('fetching', 0, 1) if state == 'running' else _fz('failed', 1, 1, error='http') if failed else _fz('fetched', 1, 1)}, state=state, step='Lecture de NATS' if state == 'running' else 'Terminé',
                  done=0 if state == 'running' else 1, total=1, result=None if state == 'running' else res, jid=jid, args={'zones': [zone]})


def _l97_build(state='done', zone='gb', jid='b1'):
    """A build view of the United Kingdom: running or done (built)."""
    return _fview({zone: _zs('building', 2, 4) if state == 'running' else _zs('built', 4, 4)}, state=state, step='Calcul des couches' if state == 'running' else 'Terminé', done=0 if state == 'running' else 1, total=1, verb='build',
                  result=None if state == 'running' else {'built': [zone], 'failed': [], 'commits': []}, jid=jid, args={'zones': [zone]})


_L97_MODAL = "(() => { window.__modal = false; new MutationObserver(() => { if (document.querySelector('.f-modal')) window.__modal = true }).observe(document.body, { childList: true, subtree: true }) })()"
_L97_BARE = """(() => [...document.querySelectorAll('[data-sheet=gb] button:disabled')].filter(b => { let e = b.closest('div'); if (e && e.matches('[data-sheet]')) e = b.closest('p'); return !(e && e.querySelector('[data-grey]')) }).map(b => b.textContent.trim()))()"""


def _l97_run(c, st, world, views, after_build_state='up-to-date', n_status=None):
    """Taps « Mettre à jour ce pays » on the open sheet of the United Kingdom with the given job views; the state of the country after the build is `after_build_state`."""
    st['views'], st['i'] = list(views), 0
    st['start'] = (200, {'job': 'j1'})
    n0 = len([p for p in st['posts'] if p['verb'] == 'build'])
    st['status'] = lambda args: _status({**world['zs'], 'gb': _zst(after_build_state, *(() if after_build_state == 'up-to-date' else (_NEWER,))) if len([p for p in st['posts'] if p['verb'] == 'build']) > n0 else world['zs']['gb']})
    c.js(_L97_MODAL)
    c.tap('[data-sheet=gb] [data-act=sheet-update]')


def _rx(text, lang, **kv):
    """A regular expression of a text of the screen whose {t} is a time (« 14:20Z ») and whose other marks are free."""
    pat = re.escape(norm(text))
    for k in kv:
        pat = pat.replace(re.escape('{' + k + '}'), kv[k])
    return re.sub(r'\\\{\w+\\\}', '.+', pat)


@case('L97', 'Données: « Mettre à jour ce pays » shows its progress IN PLACE of the button, chained without a question (SOG-0262, lot D1) — the step in words, « n sur m », a bar, « Arrêter »; then the thread of the operation under the state (what was done, at what time), the sheet of the country re-read; no popup, no floating note alone, no grey button without its reason; a chain that leaves the country stale says why',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=True, night=False,
      rule='SOG-0262 D1 (the user: « Portugal. j\'ai cliqué sur « mettre à jour ». le bouton est désactivé. où est l\'avancement ? »; « ça a disparu, remplacé par une popup « reconstruire » »): the button becomes the progress on the sheet (step, n of m, bar, Arrêter), the single-country gesture chains download then build with no ctx.ask, the sheet keeps the thread of the last operation of THIS country and says why it is still not up to date; every disabled button has its reason beside it')
def l97(c):
    lang = c.lang
    ZX = lambda k: _trow(k, lang, after='  zx: {')
    world = _l97_world()
    st, _x4 = _l89_open(c, world)
    _l89_sheet(c, 'gb')
    n_notes = len(c.note_log())
    reads0 = len(_l89_reads(st, 'gb'))
    _l97_run(c, st, world, [_l97_dl('running'), _l97_dl('done'), _l97_build('running'), _l97_build('done')])
    # ---- 1. the button BECOMES the progress, in place
    c.until("!!document.querySelector('[data-sheet=gb] [data-sheet-progress]')", timeout=10000, what='the progress is on the sheet')
    prog = '[data-sheet=gb] [data-sheet-update] [data-sheet-progress]'
    c.eq([c.count('[data-sheet=gb] [data-act=sheet-update]'), c.count(prog)], [0, 1], 'the button is gone: its place holds the progress', what='in place')
    c.until("document.querySelector('[data-sheet=gb] [data-prog-count]') !== null", timeout=10000, what='the count « n sur m »')
    c.ok(re.search(r'\d+\D+\d+', c.text('[data-sheet=gb] [data-prog-count]') or ''), c.text('[data-sheet=gb] [data-prog-count]'), 'the count says « n sur m »')
    c.ok(len(norm(c.text('[data-sheet=gb] [data-prog-step]') or '')) > 3, c.text('[data-sheet=gb] [data-prog-step]'), 'the step is said in words')
    c.eq([c.count(f'{prog} [role=progressbar]'), norm(c.text(f'{prog} [data-act=zop-stop]') or '')], [1, norm(_trow('stop', lang, after='  stop: '))], 'a bar and « Arrêter »', what='bar and stop')
    c.eq(c.js(_L97_BARE), [], 'no disabled button of the sheet is bare: each one has its reason beside it', what='no bare grey')
    # a second gesture meanwhile: the buttons of the screen are grey and SAY why
    r = c.js("(() => { const b = document.querySelector('[data-state-head] [data-verb=update]'); const w = document.querySelector('[data-state-head] [data-update-reason]'); return b ? [b.disabled, w ? w.textContent.trim() : ''] : null })()")
    c.ok(r and r[0] and len(r[1]) > 3, r, 'the top button is grey while it runs and writes why beside it')
    # ---- 2. the end: the thread, no question, no note alone
    c.until("!!document.querySelector('[data-sheet=gb] [data-sheet-thread]')", timeout=30000, what='the thread of the operation')
    c.eq(c.js("!!window.__modal"), False, 'no question was asked at any time (no « reconstruire » window)', what='no modal')
    c.eq([[p['verb'], p['args'].get('zones')] for p in st['posts'] if p['verb'] in ('fetch', 'build')], [['fetch', ['gb']], ['build', ['gb']]], 'the download then the build of that country only, chained', what='chain')
    steps = c.js("[...document.querySelectorAll('[data-sheet=gb] [data-thread-step]')].map(s => [s.dataset.threadStep, s.dataset.ok, s.querySelector('[data-thread-text]').textContent.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim()])")
    c.eq([s[:2] for s in steps], [['download', 'yes'], ['build', 'yes']], 'the thread: downloaded, built, both done', what='thread steps')
    c.ok(re.fullmatch(_rx(ZX('thDl'), lang, t=r'\d{2}:\d{2}Z'), steps[0][2]) and re.fullmatch(_rx(ZX('thBuild'), lang, t=r'\d{2}:\d{2}Z'), steps[1][2]), steps, 'each step says what it did and at what time')
    c.eq([norm(c.text('[data-sheet=gb] [data-thread-bilan]')), c.attr('[data-sheet=gb] [data-thread-bilan]', 'data-level')], [norm(ZX('thOk')), 'ok'], 'the one-line bilan: the country is up to date', what='bilan ok')
    c.eq(len(c.note_log()), n_notes, 'nothing was said in a floating note', what='no note')
    for _ in range(40):
        if len(_l89_reads(st, 'gb')) > reads0:
            break
        c.wait(250)
    c.ge(len(_l89_reads(st, 'gb')), reads0 + 1, 'the cells of the sheet (the view of the country) were read again after the operation', what='re-read')
    c.eq(c.js(_L97_BARE), [], 'and still no bare grey button', what='no bare grey end')
    if c.width in (390, 1280):
        c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
        c.js("document.querySelector('[data-sheet=gb] [data-sheet-thread]').scrollIntoView({ block: 'center' })")
        c.shot(f'L97_{c.width}_{lang}_thread.png')
    # ---- 3. a successful chain that leaves the country stale says WHY, in the launcher\'s words
    world['zs']['gb'] = _zst('stale', _NEWER)
    st['status'] = lambda args: _status(world['zs'])
    _l98_fresh(c)
    _l89_sheet(c, 'gb')
    _l97_run(c, st, world, [_l97_dl('done', jid='f2'), _l97_build('done', jid='b2')], after_build_state='stale')
    c.until("!!document.querySelector('[data-sheet=gb] [data-sheet-thread][data-thread-state=done]') && !document.querySelector('[data-sheet=gb] [data-sheet-progress]')", timeout=30000, what='the second thread')
    why = norm(c.text('[data-sheet=gb] [data-thread-bilan]'))
    mid = norm(_trow('source-newer', lang, after="'source-newer'").split('{cycle}')[1].split('{built}')[0])
    c.ok(mid.strip() in why and why.startswith(norm(ZX('thStale')).split('{r}')[0].strip()[:12]), why, 'the country is still not up to date after a good chain: the bilan says why, with the launcher\'s reason (source newer than the build)')
    c.check_errors()


def _l98_fresh(c, st=None):
    """Reloads the screen: nothing is open, nothing runs (a refusal leaves the screen grey while the other operation is followed: it is over for the launcher stub)."""
    if st is not None:
        st['current'], st['start'] = None, (200, {'job': 'j1'})
    c.page.reload(wait_until='load')
    _head(c)
    _all_open(c)
    c.until("document.querySelectorAll('[data-wmap] path[data-zone]').length === 8 && !!document.querySelector('[data-todo-state=ready]')", timeout=20000, what='the screen again')
    _ready(c, 5)
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")


@case('L98', 'Données: « une autre opération est en cours » is THE card (which operation, since when, step, progress, Voir / Arrêter) at the place of the gesture, from every path (SOG-0262, lot D1) — the sheet, the top button, a line of the month, a pack, a file sent, the pickup, Publier, the NAT routes; never the bare sentence',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=True, night=False,
      rule='SOG-0262 D1 + SOG-0245 (the user: « retour du « une autre opération est en cours ». laquelle ? depuis combien de temps ? comment la stopper ? »): the refusal of ANY launcher call — the read of the state of a country, a job start, a file upload, the plan of Publier — draws the card where the gesture was made (sheet, group body, block of the month, state bar, Publier); the grey buttons do not repeat the sentence')
def l98(c):
    lang = c.lang
    B = lambda key: _trow(key, lang, after='  busy: {')
    ZX = lambda k: _trow(k, lang, after='  zx: {')
    name = f"{_trow('proc', lang, after='  groups: {')} · {_trow('fetch', lang, after='Ruta (RAD, FRA)')}"
    R = _running()
    RV = {**_fview({}, state='running', step='Lecture des sources', jid='o1', verb='fetch'), 'set': 'proc'}
    busy = {'reason': 'busy', 'job': 'o1', 'running': R}
    world = _l93_world()
    for z in ('gb', 'ca'):
        world['zs'][z] = {**_zst('stale', _NEWER), 'publish': world['zs'][z]['publish']}
    expired = {'present': True, 'count': 17, 'from': '2026-11-09T07:00:00Z', 'validUntil': '2026-11-10T19:00:00Z', 'expired': True, 'current': 0}
    st, _x4 = _l89_open(c, world, busy_running=R, busy_view=RV, verbs=('base/pickup', 'base/cycle', 'base/publish'), publish=lambda a: world['plan'] if a.get('dry', True) else world['real'], nat={'state': expired})
    c.context.route(re.compile(r'/__setup/base/upload'), lambda route: route.fulfill(status=409, content_type='application/json', body=json.dumps({'ok': False, 'reason': 'busy', 'running': R})))
    st['views'] = [_fview({}, state='done', jid='j1')]
    where = lambda sel: [c.count(f'{sel} [data-busy-card]'), c.count('[data-busy-card]'), c.count('[data-other]'), c.count('[data-refusal=busy]')]

    def card(sel, why):
        c.until(f"!!document.querySelector('{sel} [data-busy-card]')", timeout=12000, what=f'the card {why}')
        c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
        c.eq(where(sel), [1, 1, 0, 0], f'{why}: ONE card, at the place of the gesture, no bare sentence', what=why)
        c.eq(norm(c.text(f'{sel} [data-busy-name]')), norm(B('title').replace('{n}', name)), f'{why}: it names the operation, since when and where it is (the card of SOG-0245)', what=f'{why} name')
        c.eq(c.js(f"[...document.querySelectorAll('{sel} [data-busy-act]')].map(b => b.dataset.busyAct)"), ['see', 'stop', 'hide'], f'{why}: Voir and Arrêter', what=f'{why} buttons')
    # (a) the sheet of a country
    _l89_sheet(c, 'gb')
    st['start'] = (409, busy)
    c.tap('[data-sheet=gb] [data-act=sheet-update]')
    card('[data-sheet=gb]', 'sheet: « Mettre à jour ce pays »')
    c.eq(c.count('[data-state-head] [data-busy-card]'), 0, 'the state bar does not repeat it', what='head silent')
    # the NAT routes (expired): an operation runs, so they are not taken now: the line says so and the card of that operation is there too
    c.tap('[data-sheet] [data-act=sheet-close]:visible')
    c.until("!document.querySelector('[data-sheet]')", timeout=4000, what='the sheet closes')
    c.eq(c.count('[data-state-head] [data-busy-card]'), 1, 'the sheet closed, the card of the refusal is not lost: it moves to the state bar', what='card moves')
    c.tap('[data-lc-fold=change] > summary')
    c.until("document.querySelector('[data-lc-fold=change]').open && !!document.querySelector('[data-later-blocks] [data-busy-card]')", timeout=8000, what='the card in the NAT block')
    c.eq([c.count('[data-later-blocks] [data-busy-card]'), (c.js('window.__stub.calls') or {}).get('natEnsure', 0), norm(ZX('natDeferred')) in norm(c.text('[data-change=nat]'))], [1, 0, True],
         'NAT routes: not taken while an operation runs; the line says it will be taken again at its end, with the card of that operation', what='nat deferred')
    # (b) the top button of the state bar
    _l98_fresh(c, st)
    st['start'] = (409, busy)
    c.tap('[data-state-head] [data-verb=update]')
    card('[data-state-head]', 'state bar: the top button')
    # (c) a line of the list of the month
    _l98_fresh(c, st)
    st['start'] = (409, busy)
    c.js("(d => { if (d) d.open = true })(document.querySelector('details[data-todo]'))")
    c.tap('[data-todo-item=navcan] [data-todo-act=update]')
    card('[data-todo]', 'a line of the month')
    # (d) the « Mettre à jour (n) » of a pack
    _l98_fresh(c, st)
    st['start'] = (409, busy)
    c.tap('[data-group-id=ouest] [data-act=grp-toggle]')
    c.tap('[data-group-body] [data-act=update-pack]')
    card('[data-group-body]', 'a pack')
    # (e) a file chosen on the sheet (the launcher refuses the upload: busy)
    _l98_fresh(c, st)
    st['start'] = (200, {'job': 'j1'})
    _l89_sheet(c, 'gb')
    with c.page.expect_file_chooser() as fc:
        c.js("document.querySelector('[data-sheet=gb] [data-act=zone-upload]').click()")
    fc.value.set_files({'name': 'EG_AIP.zip', 'mimeType': 'application/zip', 'buffer': b'PK' + b'x' * 998})
    card('[data-sheet=gb]', 'a file sent')
    # (f) the pickup of a file seen in Downloads
    _l98_fresh(c, st)
    world['sia_seen'] = True
    world['zs']['fr'] = _zst('stale', {'code': 'pickup-waiting', 'source': 'sia', 'cycle': '2026-11-26', 'zip': 'export_xml_bd_sia_2026-10-29-v01.zip'}, buildable=False)
    _l89_sheet(c, 'fr')
    st['start'] = (409, busy)
    c.tap('[data-sheet=fr] [data-hand=sia] [data-verb=pickup]')
    card('[data-sheet=fr]', 'the pickup')
    # (g) Publier: the plan is refused while an operation runs
    world['zs']['fr'] = {**_zst('up-to-date'), 'publish': world['zs']['es']['publish']}
    _l98_fresh(c, st)
    c.until("document.querySelector('[data-publish-plan=ready]') !== null", timeout=15000, what='the plan of Publier is read')
    st['start'] = (409, busy)
    c.tap('[data-publish] [data-verb=publish]')
    card('[data-publish]', 'Publier')
    c.eq(c.count('.f-modal'), 0, 'Publier asked nothing', what='no question')
    # (h) « Tout mettre à jour »: the chain asks its one question, then its first operation is refused
    _l98_fresh(c, st)
    st['start'] = (409, busy)
    c.tap('[data-update-all] [data-update-row] button')
    c.until("!!document.querySelector('.f-modal [data-ok]') || !!document.querySelector('[data-state-head] [data-busy-card]')", timeout=8000, what='the question of the chain, or the card of the refusal of the base update')
    if c.count('.f-modal [data-ok]'):
        c.tap('.f-modal [data-ok]')
    card('[data-state-head]', 'the top button « Tout mettre à jour »')
    c.check_errors()


@case('L99', 'Données: nothing ephemeral for a failure or a result (SOG-0262, lot D1) — the thread of the last operation of THIS country stays on its sheet step by step until the next operation: a failed step stays with its reason and « Réessayer », the retry chains the rest and succeeds; a floating note never carries a result alone; the sheet of another country shows nothing of it',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=True, night=False,
      rule='SOG-0262 D1 (the user: « Essai réel du Royaume-Uni : échec, ça a disparu, remplacé par une popup « reconstruire » ; manque de fluidité »): the thread keeps the failed download with the reason the launcher gave and « Réessayer »; the retry re-reads the state and does what is missing; the bilan of an operation shows on the sheet of ITS country only (the sheet of France showed « Royaume-Uni : en attente »); a retry refused busy draws the card on the sheet')
def l99(c):
    lang = c.lang
    ZX = lambda k: _trow(k, lang, after='  zx: {')
    world = _l97_world()
    R = _running()
    st, _x4 = _l89_open(c, world, busy_running=R, busy_view={**_fview({}, state='running', step='Lecture des sources', jid='o1', verb='fetch'), 'set': 'proc'})
    _l89_sheet(c, 'gb')
    n_notes = len(c.note_log())
    fail = [{'zone': 'gb', 'source': 'nats', 'error': 'http', 'status': 404}]
    _l97_run(c, st, world, [_l97_dl('done', failed=fail, jid='f1')])
    c.until("!!document.querySelector('[data-sheet=gb] [data-sheet-thread]')", timeout=20000, what='the thread of the failed operation')
    c.eq(c.js("(s => { const th = s.querySelector('[data-sheet-thread]'), cells = s.querySelector('.d-cells3'), src = s.querySelector('[data-sheet-source]'); return !!(cells.compareDocumentPosition(th) & 4) && !!(th.compareDocumentPosition(src) & 4) })(document.querySelector('[data-sheet=gb]'))"), True, 'the thread of the last operation sits UNDER the state cells and ABOVE the sources (visible without scrolling through the inventories)', what='thread order')
    if c.width in (390, 1280):
        c.js("document.querySelector('[data-sheet=gb] [data-sheet-thread]').scrollIntoView({ block: 'center' })")
        c.shot(f'L99_{c.width}_{lang}_thread.png')
    c.eq(c.js("!!window.__modal"), False, 'no question at any time', what='no modal')
    steps = c.js("[...document.querySelectorAll('[data-sheet=gb] [data-thread-step]')].map(s => [s.dataset.threadStep, s.dataset.ok])")
    c.eq(steps, [['download', 'no'], ['build', 'todo']], 'the thread: the download FAILED (a red failure, with its reason), the build was not reached (to do, neutral)', what='failed thread')
    c.ok(norm(c.text('[data-sheet=gb] [data-thread-step=download] [data-thread-text]')).startswith(norm(ZX('thWDl'))) and '404' in c.text('[data-sheet=gb] [data-thread-step=download] [data-thread-text]'),
         c.text('[data-sheet=gb] [data-thread-step=download] [data-thread-text]'), 'the failed step stays with the launcher\'s reason (the status 404)')
    c.eq([c.attr('[data-sheet=gb] [data-sheet-thread]', 'data-thread-state'), c.attr('[data-sheet=gb] [data-thread-bilan]', 'data-level'), c.count('[data-sheet=gb] [data-act=zop-retry]')], ['failed', 'err', 1], 'the bilan is a failure with « Réessayer » on the failed step', what='failed bilan')
    c.eq([[p['verb']] for p in st['posts'] if p['verb'] in ('fetch', 'build')], [['fetch']], 'the chain stopped at the failure: nothing was built', what='stopped')
    c.eq(len(c.note_log()), n_notes, 'the failure is not said in a floating note (it would vanish): the thread says it', what='no note')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.wait(1500)
    c.eq(c.count('[data-sheet=gb] [data-sheet-thread]'), 1, 'it is still there, long after (nothing ephemeral)', what='stays')
    # the sheet of another country does not show it
    _l89_sheet(c, 'es')
    gbname = _L88_NAMES['gb'][{'fr': 0, 'en': 1, 'de': 2, 'es': 3}[lang]]
    c.eq([c.count('[data-sheet=es] [data-sheet-thread]'), c.count('[data-sheet=es] [data-build-result]'), gbname in (c.text('[data-sheet=es]') or '')], [0, 0, False], 'the sheet of another country shows nothing of the United Kingdom\'s operation', what='only its country')
    _l89_sheet(c, 'fr')
    c.eq([c.count('[data-sheet=fr] [data-build-result]'), gbname in (c.text('[data-sheet=fr]') or '')], [0, False], 'nor does the sheet of France (it showed « Royaume-Uni : en attente »)', what='fr silent')
    # the retry that succeeds: the state is read again and only what is missing is done (the download again, then the build)
    _l89_sheet(c, 'gb')
    st['start'] = (200, {'job': 'j1'})
    st['views'], st['i'] = [_l97_dl('done', jid='f2'), _l97_build('done', jid='b2')], 0
    n0 = len([p for p in st['posts'] if p['verb'] == 'build'])
    st['status'] = lambda args: _status({**world['zs'], 'gb': _zst('up-to-date') if len([p for p in st['posts'] if p['verb'] == 'build']) > n0 else world['zs']['gb']})
    c.js(_L97_MODAL)
    c.js("document.querySelector('[data-sheet=gb] [data-act=zop-retry]').scrollIntoView({ block: 'center' })")   # the sheet of the United Kingdom lists three files to take by hand now (catalogue of 12 Nov): the thread is under them, inside the scroll of the sheet
    c.tap('[data-sheet=gb] [data-act=zop-retry]')
    c.until("!!document.querySelector('[data-sheet=gb] [data-sheet-thread][data-thread-state=done]') && !document.querySelector('[data-sheet=gb] [data-sheet-progress]')", timeout=30000, what='the thread of the retry')
    c.eq([c.js("[...document.querySelectorAll('[data-sheet=gb] [data-thread-step]')].map(s => [s.dataset.threadStep, s.dataset.ok])"), norm(c.text('[data-sheet=gb] [data-thread-bilan]')), c.js("!!window.__modal")],
         [[['download', 'yes'], ['build', 'yes']], norm(ZX('thOk')), False], 'the retry succeeded: the download done again, the build done, the country up to date, no question', what='retry thread')
    # a retry refused because an operation runs: THE card, on the sheet, and the failed thread stays (a fresh failure first)
    world['zs']['gb'] = _zst('stale', _NEWER)
    st['status'] = lambda args: _status(world['zs'])
    _l98_fresh(c, st)
    _l89_sheet(c, 'gb')
    _l97_run(c, st, world, [_l97_dl('done', failed=fail, jid='f3')])
    c.until("!!document.querySelector('[data-sheet=gb] [data-sheet-thread]') && !document.querySelector('[data-sheet=gb] [data-sheet-progress]')", timeout=20000, what='the second failed thread')
    st['start'] = (409, {'reason': 'busy', 'job': 'o1', 'running': R})
    c.js("document.querySelector('[data-sheet=gb] [data-act=zop-retry]').scrollIntoView({ block: 'center' })")   # the sheet of the United Kingdom lists three files to take by hand now (catalogue of 12 Nov): the thread is under them, inside the scroll of the sheet
    c.tap('[data-sheet=gb] [data-act=zop-retry]')
    c.until("!!document.querySelector('[data-sheet=gb] [data-busy-card]')", timeout=10000, what='the card on the sheet for the refused retry')
    c.eq([c.count('[data-sheet=gb] [data-busy-card]'), c.count('[data-other]')], [1, 0], 'a retry refused because an operation runs: THE card, on the sheet', what='retry busy')
    c.eq([c.count('[data-sheet=gb] [data-sheet-thread]'), c.count('[data-sheet=gb] [data-act=zop-retry]')], [1, 1], 'the refused retry did nothing: the failed thread is still there, with its « Réessayer »', what='thread kept')
    c.check_errors()


@case('L100', 'Données: every line of « À faire ce mois-ci » carries THE gesture that does it (SOG-0262, lot D1) — a source the launcher takes or computes has « Mettre à jour (n pays) » / « Construire » / « Publier… », a hand-taken one « Prendre le fichier » or « Choisir le fichier… », « Tout mettre à jour (n) » at the top; the regime reads « pris par le lanceur »; « 74 sur 83 » says why; computed sources are never a line',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=True, night=False,
      rule='SOG-0262 D1 (the user: « OpenAIP : 74 sur 83 à jour, statut non construit, et pourtant construction automatique. ben alors, on fait un refresh, non ? »): a line the launcher can do alone carries its button running exactly that work (startUpdate on the countries the source feeds that need it); a hand-taken line carries the pickup or the chooser; no line without a gesture; the reason of the countries that are not up to date is the launcher\'s, in words, never « non construit »; MORA and X-Plane (computed here) are not lines: they are facts, under « Quand ça change » and on the sheet of a country')
def l100(c):
    lang = c.lang
    ZX = lambda k: _trow(k, lang, after='  zx: {')
    CWB = lambda k, row=0: _trow(k, lang, after='  cwb: {', row=row)
    world = _l97_world(ca_stale=True)
    world['sia_seen'] = True
    st, _x4 = _l89_open(c, world)
    c.js("(d => { if (d) d.open = true })(document.querySelector('details[data-todo]'))")
    c.eq(c.js("[...document.querySelectorAll('[data-todo-list] > [data-todo-item]')].map(l => l.dataset.todoItem)"), ['lfv', 'nats', 'sia', 'navcan', 'faa'], 'the lines: your hand, late, to publish — the computed sources (X-Plane, MORA) are NOT lines (filtered here)', what='lines')
    c.eq(c.count('[data-todo-item=xplane], [data-todo-item=mora]'), 0, 'no line for a source computed on this workstation, done or not', what='no computed line')
    gest = lambda i: c.js(f"[...document.querySelectorAll('[data-todo-item={i}] [data-todo-act]')].map(b => [b.dataset.todoAct, b.textContent.trim(), b.disabled])")
    z = lambda n: _trow('country', lang, after='  unit: {', row=0 if n == 1 else 1)
    c.eq([gest('navcan')[0][0], gest('sia')[0][0], gest('nats')[0][0], gest('faa')[0][0]], ['update', 'pick', 'choose', 'publish'], 'every kind of line carries its gesture: update, pickup (a file is seen), chooser (nothing seen), publish', what='gestures')
    c.eq(norm(gest('navcan')[0][1]), norm(ZX('tdUpdate').replace('{z}', f"1 {z(1)}")), 'the launcher\'s line: « Mettre à jour (1 pays) », the countries that need it', what='update label')
    c.eq(norm(gest('sia')[0][1]), norm(ZX('tdPick')), '« Prendre le fichier »', what='pick label')
    c.eq(norm(gest('nats')[0][1]), norm(_trow('choose', lang, after='  up: {')), '« Choisir le fichier… »', what='choose label')
    c.ok(all(not g[2] for i in ('navcan', 'sia', 'nats') for g in gest(i)), [gest(i) for i in ('navcan', 'sia', 'nats')], 'the buttons are live')
    c.eq(c.js("(() => { const b = document.querySelector('[data-todo-item=faa] [data-todo-act=publish]'); return !b.disabled || !!b.closest('p').querySelector('[data-grey]') })()"), True, 'Publier is live, or says why beside it (no bare grey button)', what='publish grey')
    c.eq(c.js("[...document.querySelectorAll('[data-todo-list] > [data-todo-item]')].filter(l => !l.querySelector('[data-todo-act], [data-act=open-country], [data-todo-nogesture]')).map(l => l.dataset.todoItem)"), [], 'no line without a gesture', what='no bare line')
    c.eq(c.js("document.querySelector('[data-todo-item=navcan] [data-regime-badge]').textContent.trim()"), norm(_trow('auto', lang, after='    badge: {')), 'the regime says what it is', what='badge')
    c.ok(norm(_trow('auto', lang, after='    badge: {')) == {'fr': 'pris par le lanceur', 'en': 'taken by the launcher', 'de': 'vom Starter geholt', 'es': 'tomado por el lanzador'}[lang], lang, 'automatic is worded « pris par le lanceur »')
    c.eq(norm(c.text('[data-todo-all] [data-todo-act=all]')), norm(ZX('tdAll').replace('{n}', '2')), '« Tout mettre à jour (n) » at the top does them all: the two countries that need work (the UK and Canada)', what='all label')
    # the reason: Canada is stale, the line says why in the launcher's words
    why = norm(c.text('[data-todo-item=navcan] [data-tick=build] [data-tick-text]'))
    mid = norm(_trow('source-newer', lang, after="'source-newer'").split('{cycle}')[1].split('{built}')[0]).strip()
    c.ok(mid in why and 'non construit' not in why.lower(), why, 'the line says WHY the country is not up to date, in the launcher\'s words')
    # the gesture runs exactly that work
    st['views'], st['i'] = [_l97_dl('done', zone='ca', jid='f1'), _l97_build('done', zone='ca', jid='b1')], 0
    st['start'] = (200, {'job': 'j1'})
    c.tap('[data-todo-item=navcan] [data-todo-act=update]')
    for _ in range(40):
        if [p for p in st['posts'] if p['verb'] in ('fetch', 'status')]:
            break
        c.wait(250)
    c.ok([p for p in st['posts'] if p['verb'] == 'status'][-1]['args'].get('zones') == ['ca'], [p for p in st['posts'] if p['verb'] == 'status'][-3:], 'the gesture starts the update of the countries of that line (Canada), nothing else')
    c.until("!!document.querySelector('.f-modal [data-no]')", timeout=20000, what='the question of the update (several countries: the question stays for them)')
    c.tap('.f-modal [data-no]')
    c.until("!document.querySelector('.f-modal')", timeout=5000, what='closed')
    # computed sources: facts, under « Quand ça change » and on the sheet of a country
    c.tap('[data-lc-fold=change] > summary')
    c.until("document.querySelector('[data-lc-fold=change]').open", timeout=3000, what='the fold opens')
    c.ok({'xplane', 'mora'} <= set(c.js("[...document.querySelectorAll('[data-change-list] > li')].map(l => l.dataset.change)")), 'change lines', 'X-Plane and MORA are under « Quand ça change » with their date')
    _l89_sheet(c, 'es')
    c.eq(c.count('[data-sheet=es] [data-computed-fact]'), 0, 'a country whose sources are all the launcher\'s shows no computed fact', what='no fact')
    c.check_errors()


@case('L101', 'Données: four tick signs and a folded, framed block (SOG-0262, lot D1) — ✓ done, ○ to do (neutral), ✗ a failure only, — not applicable or not yet possible, each with its word; « À faire ce mois-ci · n » is a framed block folded by default, under the map and before the packs, the first packs visible under the map at 1280×800',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=True, night=False,
      rule='SOG-0262 D1 (the user: everything not done was a red ✗, a line to do read as three failures): ✓ green = done, ○ empty neutral = to do, ✗ red = a real failure with its reason, — grey = not applicable / not yet possible (publication of a country not built, download of a computed source); the word always accompanies the sign; the block of the month is a frame folded by default, only a shortcut to the sheets')
def l101(c):
    lang = c.lang
    ZX = lambda k: _trow(k, lang, after='  zx: {')
    world = _l97_world()
    world['sia_seen'] = True
    world['mora'] = True
    st, _x4 = _l89_open(c, world)
    # ---- the block: framed, folded, its marker with the number, in place
    blk = '[data-todo]'
    c.eq([c.js("document.querySelector('details[data-todo]') !== null"), c.js("(document.querySelector('details[data-todo]') || { open: null }).open")], [True, False], 'the block is a folded details by default', what='folded')
    c.eq(norm(c.text('[data-todo] > summary')), norm(ZX('tdMarker').replace('{n}', '5')), 'its marker says what and how many: « À faire ce mois-ci · 5 »', what='marker')
    c.ok(c.js("getComputedStyle(document.querySelector('details[data-todo]')).borderTopWidth") not in ('0px', ''), c.js("getComputedStyle(document.querySelector('details[data-todo]')).borderTopWidth"), 'it is a framed block (a border)')
    pos = c.js("""(() => { const q = s => document.querySelector(s), before = (a, b) => !!(q(a).compareDocumentPosition(q(b)) & Node.DOCUMENT_POSITION_FOLLOWING);
      return [before('[data-world-map]', '[data-todo]'), before('[data-todo]', '[data-cw-groups]')] })()""")
    c.eq(pos, [True, True], 'under the map and before the packs (not above the map)', what='order')
    if c.width >= 900:
        m = c.js("""(() => { document.querySelector('[data-world-map]').scrollIntoView({ block: 'start', behavior: 'instant' }); const g = document.querySelector('[data-group-id]').getBoundingClientRect(); return [g.top, window.innerHeight] })()""")
        c.ok(m[0] < m[1], m, 'the first packs are visible under the map at a wide width, the block folded')
    c.js("(d => { if (d) d.open = true })(document.querySelector('details[data-todo]'))")
    c.until("document.querySelector('[data-todo]') && (document.querySelector('details[data-todo]') || { open: true }).open", timeout=2000, what='opens')
    c.js("(d => { if (d) d.open = true })(document.querySelector('[data-todo-done]'))")
    c.eq(c.count('[data-todo-done]'), 1, '« Déjà faits » stays folded inside', what='done inside')
    # ---- the four signs, each with its word
    sign = lambda sel: c.js(f"(() => {{ const l = document.querySelector('{sel}'); return l ? [l.dataset.ok, l.querySelector('.d-tk').textContent.trim(), l.querySelector('[data-tick-word]').textContent.replace(/[()]/g, '').trim()] : null }})()")
    W = lambda k: norm(ZX(k))
    nats = '[data-todo-item=nats]'
    c.eq([sign(f'{nats} [data-tick=download]')[:2], sign(f'{nats} [data-tick=build]')[:2]], [['todo', '○'], ['todo', '○']], 'a late download and a build to do are ○ (to do), not failures', what='to do signs')
    c.eq(norm(sign(f'{nats} [data-tick=download]')[2]), W('twTodo'), 'and the word says « à faire »', what='todo word')
    c.eq([sign(f'{nats} [data-tick=publish]')[:2], norm(sign(f'{nats} [data-tick=publish]')[2])], [['na', '—'], W('twNa')], 'a publication not read yet is — (not applicable)', what='na sign')
    c.eq(sign('[data-todo-item=faa] [data-tick=download]')[:2], ['yes', '✓'], 'a download done is ✓', what='yes sign')
    c.eq(sign('[data-todo-item=faa] [data-tick=publish]')[:2], ['todo', '○'], 'a build done and not published is ○', what='publish todo')
    c.eq(c.js("[...document.querySelectorAll('[data-todo-list] [data-tick][data-ok=no]')].length"), 0, 'no ✗ anywhere in the list of the month: nothing failed', what='no cross')
    col = lambda sel: c.js(f"getComputedStyle(document.querySelector('{sel}')).color")
    ok_c, no_c, todo_c = col('[data-todo-item=faa] [data-tick=download] .d-tk'), col(f'{nats} [data-tick=download] .d-tk'), col(f'{nats} [data-tick=publish] .d-tk')
    c.ok(ok_c != no_c and no_c == todo_c or ok_c != no_c, (ok_c, no_c, todo_c), 'done is green, to do and not applicable are neutral (never the red of a failure)')
    # on the sheet: the same signs; a country not built has its publication « not yet possible »
    _l89_sheet(c, 'gb')
    facts = c.js("[...document.querySelectorAll('[data-sheet=gb] [data-sheet-facts] [data-tick]')].map(l => [l.dataset.tick, l.dataset.ok])")
    c.eq(facts, [['build', 'todo']], 'the sheet of a stale country: built ○ (to do, with its reason); no publication line without a published state', what='sheet facts')
    c.eq(c.count('[data-sheet=gb] [data-tick][data-ok=no]'), 0, 'no failure sign on a sheet where nothing failed', what='no cross on the sheet')
    # a computed source (MORA) is a FACT of the country, not a tick
    c.eq([c.count('[data-sheet=gb] [data-sheet-source=mora] [data-computed-fact]'), c.count('[data-sheet=gb] [data-sheet-source=mora] [data-tick=download]')], [1, 0], 'MORA, computed here, is a fact on the sheet (computed on this workstation), with no downloaded tick', what='computed fact')
    c.check_errors()


# ------------------------------------------------------------------------------------------------------ L102 (SOG-0262, lot D2: the form of the screen, as the validated mockup)
_L102_NODE = r"""
const fs = require('fs'); globalThis.window = globalThis;
for (const f of ['frame/aerodb/airac.js', 'frame/aerodb/catalogue.js']) (0, eval)(fs.readFileSync(f, 'utf8'));
const out = {};
for (const id of ['navpt', 'dircam', 'adds', 'nats', 'sia', 'enaire', 'dfs', 'airnav', 'lfv', 'openaip']) { const s = AeroCatalogue.byId(id); out[id] = s ? s.n : null }
console.log(JSON.stringify(out));
"""


def _l102_labels():
    """The names of the real catalogue (AeroCatalogue, frame/aerodb/catalogue.js), read with node: the capture never shows a stub label."""
    import subprocess
    r = subprocess.run(['node', '-e', _L102_NODE], cwd=str(ROOT), capture_output=True, text=True, encoding='utf-8', timeout=30)
    return json.loads(r.stdout)


def _l102_world():
    """The REAL country outlines, names and packs of the repository (shared/carto/aero_zones_geo.js, frame/aerodb/packs.json), with INVENTED states only (never the user's data): the countries of the
    coverage, one waiting for its file seen in Downloads (Portugal), two late, one failed, the others up to date."""
    geo = json.loads((ROOT / 'shared/carto/aero_zones_geo.js').read_text(encoding='utf-8').split('=', 1)[1].strip().rstrip(';'))
    packs = json.loads((ROOT / 'frame/aerodb/packs.json').read_text(encoding='utf-8'))
    cover = ['pt', 'es', 'fr', 'gb', 'ie', 'be', 'lu', 'nl', 'de', 'ch', 'at', 'it', 'mt', 'ad', 'se', 'no', 'fi', 'dk', 'pl', 'cz', 'gr', 'hr', 'si', 'hu', 'sk', 'rs']
    return geo, packs, cover


def _l102_cycle(world, labels):
    """base/cycle for the capture: the real catalogue names, invented dates and files."""
    def answer(args):
        L = lambda i: labels[i]
        navpt = _l89_item('navpt', 'hand', {'state': 'waiting'}, (1, 0), (0, 0, 1), ['pt'], 'newer-in-downloads', {'link': 'https://ais.nav.pt/', 'expected': ['EAIP ISO.zip'], 'inDownloads': ['EAIP ISO.zip']}, L('navpt'))
        dircam = _l89_item('dircam', 'hand', {'state': 'late', 'cycle': '2026-10-08', 'at': '2026-10-08T08:00:00Z'}, (1, 1), (1, 0, 0), ['fr'], 'older-than-cycle', {'link': 'https://dircam.example/', 'expected': ['info_aero_dircam.zip'], 'inDownloads': ['info_aero_dircam.zip']}, L('dircam'))
        nats = _l89_item('nats', 'hand', {'state': 'late', 'cycle': '2026-10-06', 'at': '2026-10-06T08:00:00Z'}, (1, 1), (1, 0, 0), ['gb'], 'older-than-cycle', {'link': 'https://nats.example/aip', 'expected': ['EG_AIP_DS_<AAAAMMJJ>_XML.zip'], 'inDownloads': []}, L('nats'))
        adds = _l89_item('dfs', 'auto', {'state': 'late', 'cycle': '2026-11-01', 'at': '2026-11-01T08:00:00Z'}, (1, 1), (1, 0, 0), ['de'], 'older-than-cycle', None, L('dfs'))
        done = lambda i, z: _l89_item(i, 'auto', {'state': 'done', 'cycle': '2026-10-29', 'at': '2026-10-29T08:00:00Z'}, (1, 1), (1, 0, 0), z, None, None, L(i))
        items = [navpt, dircam, nats, adds, done('sia', ['fr']), done('enaire', ['es']), done('airnav', ['ie']), done('lfv', ['se']), done('openaip', None)]
        res = {'ok': True, 'cycle': {'inForce': '2026-10-29', 'next': '2026-11-26', 'ids': {'inForce': '2611', 'next': '2612'}}, 'items': items, 'unavailable': [], 'next': {'cycle': '2026-11-26', 'items': []}, 'unread': []}
        zone = args.get('zone')
        by = {'pt': [navpt, done('openaip', None)], 'fr': [done('sia', ['fr']), dircam], 'gb': [nats, done('openaip', None)], 'de': [adds, done('openaip', None)]}
        if zone in by:
            res['zoneView'] = {'zone': zone, 'known': True, 'inCoverage': True, 'sources': by[zone], 'state': None, 'addWillAsk': {'sources': [], 'auto': [], 'hand': [], 'personal': [], 'noReader': []}}
        return res
    return answer


def _l102_open(c, tweak=None, wrap=None, target='data'):
    """The Données screen of the capture: real outlines, real names, real packs, real catalogue; invented states."""
    labels = _l102_labels()
    geo, packs, cover = _l102_world()
    cfg, _ = _fixture()
    cfg['realOutlines'] = True
    cfg['zones'] = [{'id': z, 'names': g['n'], 'frames': [], 'published': z in cover} for z, g in sorted(geo.items())]
    cfg['packs'] = {'generated': packs['generated'], 'source': 'test', 'regions': [r for r in packs['regions'] if r['zones']], 'themes': []}
    cfg['publication']['base'] = {z: cfg['publication']['base']['es'] for z in cover}
    ok = lambda: {**_zst('up-to-date'), 'builtAt': '2026-10-29T10:00:00Z', 'publish': {'state': 'published', 'at': '2026-10-30T12:00:00Z'}}
    world = {'zs': {z: ok() for z in cover}}
    world['zs']['pt'] = {**_zst('stale', {'code': 'pickup-waiting', 'source': 'navpt', 'cycle': '2026-11-26', 'zip': 'EAIP ISO.zip'}, buildable=False), 'builtAt': '2026-10-05T10:00:00Z', 'builtCycle': '2026-10-01', 'publish': {'state': 'unpublished', 'at': '2026-10-05T11:00:00Z'}}
    for z in ('fr', 'gb', 'de'):
        world['zs'][z] = {**_zst('stale', _NEWER), 'builtAt': '2026-10-29T10:00:00Z', 'publish': {'state': 'published', 'at': '2026-10-30T12:00:00Z'}}
    world['zs']['it'] = {**_zst('failed', {'code': 'failed', 'error': 'x'}), 'builtAt': '2026-10-29T10:00:00Z', 'publish': {'state': 'unpublished', 'at': '2026-10-29T11:00:00Z'}}
    procs = {z: {'cycle': '2026-10-29', 'counts': {}, 'procedures': 9, 'sources': {}, 'procSources': ['eaip']} for z in ('fr', 'es', 'gb', 'ie', 'nl', 'de', 'ch', 'it')}
    st = _launcher(c, [_view('done', step='Terminé', jid='jc', result={'ok': True, 'zones': procs})], verbs=_VERBS + ['base/pickup', 'base/cycle', 'base/coverage'], cycle=(wrap or (lambda a: a))(_l102_cycle(world, labels)))
    st['status'] = lambda args: _status(world['zs'])
    if tweak:
        tweak(cfg)   # D4: a case adds its own sub-zone names or catalogue steps
    _open(c, cfg, target=target, my_coverage=False)
    c.until("document.querySelectorAll('[data-wmap] path[data-zone]').length > 20 && !!document.querySelector('[data-todo-state=ready]')", timeout=30000, what='the real map and the list of the month')
    _ready(c, len(cover), timeout=20000)
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    return st


def _l102_compare(shots):
    """The mockup (modules/data/maquette) and this screen side by side: the whole page at half size (L102_compare_1280.png) and the first screen at full size (L102_compare_view_1280.png)."""
    from PIL import Image
    mock = Image.open(ROOT / 'modules/data/maquette/liste_cycle_1280.png').convert('RGB')
    mine = Image.open(shots / 'L102_1280_fr_full.png').convert('RGB')
    half = lambda im: im.resize((640, max(1, round(im.height * 640 / im.width))))
    a, b = half(mock), half(mine)
    out = Image.new('RGB', (1290, max(a.height, b.height)), (255, 255, 255))
    out.paste(a, (0, 0))
    out.paste(b, (650, 0))
    out.save(shots / 'L102_compare_1280.png')
    top = mock.resize((1280, round(mock.height / 2))).crop((0, 0, 1280, 800))
    view = Image.open(shots / 'L102_1280_fr_view.png').convert('RGB')
    out2 = Image.new('RGB', (2570, 800), (255, 255, 255))
    out2.paste(top, (0, 0))
    out2.paste(view, (1290, 0))
    out2.save(shots / 'L102_compare_view_1280.png')


@case('L102', 'Données: the screen has the FORM of the validated mockup (SOG-0262, lot D2) — a cycle header with its bar, small-caps headings with their help on the line, the map on the left with its legend in pastilles on one line, groups in a two-column grid with the open one framed in blue and its countries as tiles, the country sheet a sticky card on the right with a block per source, cells for the steps and buttons at the bottom, « À faire » folded as a framed block, « Publier » framed, the three folds with their counts',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=True, night=False,
      rule='SOG-0262 D2 (the user refused the form of the lot A-D1 captures: « les captures ne reflètent pas ce que tu m\'avais vendu »): modules/data/maquette/liste_cycle.html and its three PNGs are the visual contract; the capture uses the real outlines, names, packs and catalogue of the repository with invented states')
def l102(c):
    lang = c.lang
    D2 = lambda k: norm(_trow(k, lang, after='  d2: {'))
    st = _l102_open(c)
    wide = c.width >= 900
    shots = c.width in (390, 1280)
    q = lambda js: c.js(js)
    rect = lambda sel: c.js(f"(e => e ? (r => ({{ l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }}))(e.getBoundingClientRect()) : null)(document.querySelector('{sel}'))")
    # ---- 1. the header: a strong title, the progress bar under it, the button with, beside it, the sentence that says what it does; no row of counter pills
    title = norm(c.text('[data-cycle-title]'))
    cw = lambda k: norm(_trow(k, lang, after='  cwb: {'))
    c.ok(title.startswith(cw('todoHead').split('{c}')[0]) and c.count('[data-cycle-bar][role=progressbar]') == 1, title, 'the header is a title « Cycle AIRAC 2611 · n faits sur m » with a progress bar under it')
    bar = c.js("(b => [+b.getAttribute('aria-valuenow'), +b.getAttribute('aria-valuemax'), b.firstElementChild.style.width])(document.querySelector('[data-cycle-bar]'))")
    c.eq(bar[:2], [5, 9], 'the bar counts the sources done among those counted (invented states: 5 of 9)', what='bar counts')
    c.eq(norm(c.text('[data-state-head] [data-update-row] button')), norm(_UT('updateN', lang).replace('{n}', '4')), 'the button of the cycle says « Tout mettre à jour (n) »', what='button')
    tb, bt, wh = rect('[data-cycle-title]'), rect('[data-state-head] [data-update-row] button'), rect('[data-state-head] .d-what')
    c.ok(tb['b'] <= rect('[data-cycle-bar]')['t'] + 1 and rect('[data-cycle-bar]')['b'] <= bt['t'], (tb, bt), 'title, then bar, then the button')
    if c.width >= 640:
        c.ok(wh['l'] >= bt['r'] - 1 and abs(wh['t'] - bt['t']) < 40, (bt, wh), 'the sentence that says what the button does is BESIDE it')
    c.ok(c.js("[...document.querySelectorAll('[data-state-sentence] [data-filter]')].every(b => getComputedStyle(b).borderTopWidth === '0px') && document.querySelectorAll('[data-state-sentence] [data-filter]').length > 1"), 'no pills', 'the counts of the sentence are text in a caption, not a row of pills (no frame)')
    # ---- 2. the small-caps headings, their help on the same line
    heads = c.js("[...document.querySelectorAll('[data-page] .d-sh')].filter(h => h.offsetParent && !h.closest('[data-sheet]')).map(h => [getComputedStyle(h).textTransform, h.querySelector('small') ? Math.abs(h.querySelector('small').getBoundingClientRect().top - h.getBoundingClientRect().top) : -1, h.textContent.replace(/\\s+/g, ' ').trim().slice(0, 40)])")
    c.ok(len(heads) >= 2 and all(h[0] == 'uppercase' for h in heads), heads, 'the section headings are in small capitals')
    if wide:
        c.ok(all(0 <= h[1] < 24 for h in heads), heads, 'the help of a heading is on the same line as the heading')
    c.eq(norm(c.text('[data-world-map] .d-sh small')), D2('mapHelp'), 'La carte · « touchez un pays, ou ouvrez un groupe plus bas »', what='map help')
    # ---- 3. the map: group open above-left, « voir le monde entier » on the right, the legend in pastilles on one line, « ? » at its end
    c.js("document.querySelector('[data-cycle-title]').scrollIntoView({ block: 'start', behavior: 'instant' }); window.scrollBy(0, -64)")   # the cycle title just under the header of the frame
    mp, wl, mt = rect('[data-wmap]'), rect('[data-act=world-toggle]'), rect('[data-map-title]')
    c.ok(wl['l'] > mt['r'] and abs(wl['t'] - mt['t']) < 30 if c.width >= 640 else wl['t'] >= mt['t'], (mt, wl), '« Groupe ouvert » above-left of the map and « Voir le monde entier » on its right, on one line (under it on a phone)')
    lg = rect('.d-lgl')
    q_ = rect('[data-act=legend-more]')
    c.ok(q_['l'] >= lg['r'] - 1 and c.count('[data-cw-legend] .d-sw') == 4, (lg, q_), 'the legend is four pastilles and the « ? » is at the END of the line')
    c.ok(c.js("getComputedStyle(document.querySelector('[data-cw-legend] .d-sw')).borderRadius") in ('50%', '6px'), c.js("getComputedStyle(document.querySelector('[data-cw-legend] .d-sw')).borderRadius"), 'a pastille is round')
    c.ok(c.js("document.querySelectorAll('[data-wmap] path[data-zone]').length > 100 && document.querySelectorAll('[data-wmap] circle').length === 0"), 'real outlines, no dot', 'the real outlines of the repository (more than a hundred countries), never dots')
    if wide:
        sh0 = rect('.d-cwtop > .d-sheetph')   # the card of the right column: the hint of the empty state until a country is opened
        c.ok(mp['r'] < sh0['l'] and 0.5 < (mp['w'] / (sh0['r'] - mp['l'])) < 0.66, (mp, sh0), 'the map is on the LEFT, about 60 % of the width')
    # ---- 4. the folded block of the month, then the first row of groups: all on screen at 1280 x 800
    if wide:
        td, gr = rect('[data-todo]'), rect('[data-group-id]')
        c.ok(gr['b'] <= c.js('window.innerHeight') and td['b'] <= gr['t'], (td, gr, c.js('window.innerHeight')), 'the map, the folded « À faire » line and the FIRST ROW of groups are all on screen (the viewport of 800)')
        c.ge(mp['h'], 320, 'the map is at least 320 px high at 1280 x 800 (it was 200: the header doubled itself; the mockup has about 380)')
        c.ok(mp['b'] <= td['t'] and td['b'] <= gr['t'], (mp, td, gr), 'in that order: the map, the folded « À faire » line, the first row of groups')
    c.eq(c.js("[...document.querySelector('[data-todo]').children].length > 0 && document.querySelector('details[data-todo]').open"), False, '« À faire ce mois-ci » is folded', what='todo folded')
    c.ok(c.js("getComputedStyle(document.querySelector('details[data-todo]')).borderTopWidth") == '1px', 'framed', 'and it is a framed block')
    if c.width == 390 and c.lang == 'fr':
        c.page.screenshot(path=str(ROOT / 'tests/v3/shots' / 'L102_390_fr_view.png'))
    # ---- 5. the groups: a grid of cards (2 columns wide, 1 on a phone), the open one framed in blue, full width, its countries as tiles (3 columns wide, 2 on a phone)
    cols = lambda sel: c.js(f"getComputedStyle(document.querySelector('{sel}')).gridTemplateColumns.split(' ').length")
    c.eq(cols('.d-gl'), 2 if c.width >= 640 else 1, 'the groups are a grid of cards: two columns (one on a phone)', what='group columns')
    c.eq(c.count('[data-group-id] .d-gcount'), c.count('[data-group-id]'), 'each card says its name and « n pays »', what='group counts')
    c.ok(c.js("document.querySelectorAll('[data-group-id] [data-sum-tone]').length > 5"), 'coloured', 'its summary is coloured by state: « 2 à jour · 1 sans état »')
    c.tap('[data-group-id=europe-south] [data-act=grp-toggle]')
    c.until("document.querySelector('[data-group-id=europe-south]').dataset.open === 'true'", timeout=4000, what='the pack opens')
    c.eq(cols('.d-gc'), 3 if c.width >= 640 else 2, 'its countries are tiles: three columns (two on a phone)', what='tile columns')
    op, gl = rect('[data-group-id=europe-south]'), rect('.d-gl')
    c.ok(op['w'] >= gl['w'] - 2 and c.js("getComputedStyle(document.querySelector('[data-group-id=europe-south]')).borderTopWidth") == '2px', (op, gl), 'the open group is a blue-framed panel on the full width')
    c.eq(c.js("getComputedStyle(document.querySelector('[data-group-id=europe-south]')).borderTopColor === getComputedStyle(document.querySelector('[data-wmap] path[data-grp]')).stroke"), True, 'blue = the accent, as the border on the map', what='blue')
    t0 = c.js("(b => [getComputedStyle(b).borderLeftWidth, b.textContent.replace(/\\s+/g, ' ').trim()])(document.querySelector('[data-group-body] [data-zone=pt]'))")
    c.ok(t0[0] == '6px', t0, 'a tile has its state edge')
    c.ok(norm(_trow('warn', lang, after='    word: {')) in norm(t0[1]), t0, 'and its state in words')
    c.ok(c.count('[data-group-body] [data-has-proc]') >= 1 and D2('procShort') in norm(c.text('[data-group-body] [data-has-proc]')), 'proc', 'with the « proc. » badge where the country has procedures')
    # ---- 6. the sheet of Portugal: a card, sticky at the right (full screen on a phone)
    c.tap('[data-group-body] [data-zone=pt]')
    c.until("!!document.querySelector('[data-sheet=pt] [data-sheet-source]')", timeout=10000, what='the sheet of Portugal')
    c.until("!document.querySelector('[data-sheet=pt] [data-inventory-state=loading]')", timeout=8000, what='the view of Portugal is read')
    c.wait(400)
    sh = rect('[data-sheet]')
    c.ok(c.js("(s => getComputedStyle(s).boxShadow !== 'none' && getComputedStyle(s).borderTopWidth === '1px')(document.querySelector('[data-sheet]'))") or not wide, 'card', 'the sheet is a card (border, shadow)')
    hd = c.js("(h => [h.querySelector('h3').textContent.trim(), !!h.querySelector('[data-sheet-badge]'), h.querySelector('[data-sheet-sub]').textContent.trim(), !!h.querySelector('[data-act=sheet-close]')])(document.querySelector('[data-sheet] .d-sheeth'))")
    c.ok(hd[1] and hd[3] and hd[2].startswith('PT'), hd, 'header: the name large, the state badge, the close cross; the sub-title (code · group)')
    c.ok(c.count('[data-sheet] .d-cells3 .d-cell, [data-sheet] .d-cells3 li') >= 2, c.count('[data-sheet] .d-cells3 .d-cell, [data-sheet] .d-cells3 li'), 'the facts of the country (state · built · published) are cells at the top of the sheet')
    src = c.js("[...document.querySelectorAll('[data-sheet] [data-sheet-source]')].map(s => [s.dataset.sheetSource, s.dataset.srcTone, getComputedStyle(s).borderLeftWidth, !!s.querySelector('.d-regbadge'), s.querySelectorAll('.d-cells1 > li').length])")
    c.ok(len(src) >= 2 and all(s[2] == '5px' and s[1] for s in src) and src[0][3] and src[0][4] == 1, src, 'a block per source, a coloured left edge by its state, the regime badge on its right, ONE « téléchargé » cell')
    c.ok(c.js("(l => l.length >= 1 && getComputedStyle(l[0]).backgroundColor !== getComputedStyle(document.querySelector('[data-sheet]')).backgroundColor)([...document.querySelectorAll('[data-sheet] .d-cells1 > li[data-ok=yes]')])"), 'tinted', 'the step cell of a source done is tinted (green)')
    c.ok(c.js("getComputedStyle(document.querySelector('[data-sheet-source=navpt] .d-cells1 > li > b, [data-sheet] .d-cells1 > li > b')).textTransform") == 'uppercase', 'caps', 'the word of a step is in small capitals')
    c.ok(c.js("[...document.querySelectorAll('[data-sheet] .d-sh')].every(h => getComputedStyle(h).textTransform === 'uppercase')"), 'caps', '« Fichiers à prendre · 1 vu, 0 manque » is in small capitals, with its counts')
    c.ok(c.count('[data-sheet] [data-inventory-count]') >= 1, 'count', 'the count of the files is on the heading')
    card, pb = rect('[data-sheet] [data-sheet-source=navpt]'), rect('[data-sheet] [data-sheet-source=navpt] [data-hand] button.primary')
    c.eq(c.count('[data-sheet-gestures]'), 0, 'no stack of buttons detached at the bottom of the sheet', what='no stack')
    c.ok(card['t'] <= pb['t'] and pb['b'] <= card['b'] + 1, (card, pb), 'the gestures of a source are INSIDE its card (« Prendre le fichier téléchargé » under the expected files)')
    up, last = rect('[data-sheet] [data-sheet-update]'), rect('[data-sheet] [data-sheet-source]:last-of-type')
    c.ok(up['t'] >= last['b'] - 1, (up, last), '« Mettre à jour ce pays » stays at the BOTTOM of the sheet, under the sources')
    c.ok(pb['w'] >= (card['w'] - 40) * 0.9, (pb, card), 'the primary button is on the full width of its card')
    if wide:
        c.ok(sh['l'] > mp['r'] and c.js("getComputedStyle(document.querySelector('[data-sheet]')).position") == 'sticky', sh, 'the sheet is a card at the RIGHT, sticky')
        y0 = c.js("window.scrollY")
        c.js("document.querySelector('[data-group-body]').scrollIntoView({ block: 'start', behavior: 'instant' }); window.scrollBy(0, 300)")   # down the groups: the sticky card lives as long as the two-column part of the page (the folds under « Publier » are full width)
        c.wait(250)
        sh2 = rect('[data-sheet]')
        c.ok(c.js("window.scrollY") > y0 + 300 and 0 <= sh2['t'] < 80, (y0, sh2), 'scrolling down the page, the sheet stays on screen (sticky)')
    else:
        c.eq(c.js("getComputedStyle(document.querySelector('[data-sheet]')).position"), 'fixed', 'a phone: the sheet is full screen', what='phone sheet')
        c.ok(sh['w'] >= c.js('window.innerWidth') - 1, sh, 'and covers the width')
    # ---- 7. « Publier » framed, the folds with their count pills
    c.js("document.querySelector('[data-publish]').scrollIntoView({ block: 'center', behavior: 'instant' })")
    pu = rect('[data-publish]')
    c.ok(c.js("getComputedStyle(document.querySelector('[data-publish]')).borderTopWidth") == '1px' and rect('[data-publish] [data-verb=publish]')['w'] >= pu['w'] - 40, pu, '« Publier » is a framed block with its button on the full width')
    c.ok(norm(c.text('[data-lc-fold=change] [data-lc-pill]')) == norm(_trow('pillSources', lang, after='  d2: {').replace('{n}', '6')), c.text('[data-lc-fold=change] [data-lc-pill]'), 'the folds carry their count pill (« Quand ça change » : 6 sources)')
    c.eq([c.js("document.querySelector('[data-lc-fold=later]').open"), c.js("document.querySelector('[data-lc-fold=change]').open")], [False, False], 'the folds are folded', what='folds')
    # ---- the delivered captures: the page, then (1280) next to the mockup (tests/v3/shots/L102_compare_1280.png: the mockup on the left, this screen on the right)
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    if shots:
        shots_dir = ROOT / 'tests/v3/shots'
        c.js("window.scrollTo(0, 0)")
        c.wait(200)
        c.page.screenshot(path=str(shots_dir / f'L102_{c.width}_{c.lang}_full.png'), full_page=True)
        if c.width == 1280 and c.lang == 'fr':
            c.js("document.querySelector('[data-cycle-title]').scrollIntoView({ block: 'start', behavior: 'instant' }); window.scrollBy(0, -64)")
            c.wait(200)
            c.page.screenshot(path=str(shots_dir / 'L102_1280_fr_view.png'))
            _l102_compare(shots_dir)
    c.check_errors()


# ------------------------------------------------------------------------------------------------------ L103 .. L106 (SOG-0262, lot D3: the three contracts of AeroDB K185 / K186 / K191)
_L103_TIME = r'(?:\d{2}/\d{2} )?\d{2}:\d{2}Z'


def _l103_entry(result, ago, state='done', zones=('gb',)):
    """One entry of the journal of the launcher (base/last, K191): the end of the last job of a verb, `ago` seconds ago."""
    return {'job': 'jl', 'state': state, 'ended': int(time.time()) - ago, 'ok': result.get('ok') is not False, 'reason': None, 'args': {'zones': list(zones), 'personal': []}, 'result': result}


def _l103_journal(kind='chain'):
    """The journal of the launcher for the United Kingdom: 'chain' = the file taken, downloaded, built (nothing changed); 'built' = downloaded and built; 'failed' = the download refused by the site."""
    pick = _l103_entry({'ok': True, 'dry': False, 'taken': [{'zone': 'gb', 'source': 'nats', 'zip': 'EG_AIP_DS.zip', 'files': ['EG_ENR.xml'], 'bytes': 1000}], 'missing': [], 'failed': []}, 300)
    fetch = _l103_entry({'ok': True, 'fetched': ['gb'], 'unchanged': [], 'failed': [], 'manual': []}, 240 if kind == 'chain' else 60)
    if kind == 'failed':
        return {'ok': True, 'results': {'base/fetch': _l103_entry({'ok': False, 'fetched': [], 'unchanged': [], 'failed': [{'zone': 'gb', 'source': 'nats', 'error': 'http', 'status': 404}], 'manual': []}, 120)}}
    if kind == 'built':
        return {'ok': True, 'results': {'base/fetch': fetch, 'base/build': _l103_entry({'ok': True, 'built': ['gb'], 'failed': [], 'commits': []}, 30)}}
    return {'ok': True, 'results': {'base/pickup': pick, 'base/fetch': fetch, 'base/build': _l103_entry({'ok': True, 'built': [], 'failed': [], 'commits': []}, 180)}}


@case('L103', 'Données: the thread of the last operation of a country comes from the launcher\'s journal (base/last, SOG-0262 lot D3) and SURVIVES A PAGE RELOAD — « pris à … ✓ · téléchargé ✓ · construit ✓ rien n\'a changé » step by step, a failed step with its reason and « Réessayer », why the country stays « pas à jour »; read once at the opening and again after each operation; a launcher without the verb keeps the in-memory thread',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=True, night=False,
      rule='SOG-0262 D3 + K191 (the ergonomist: « le fil de la dernière opération survit au rechargement »): the sheet builds its thread from base/last filtered on the country (arguments or result name it) and merges it with the operation the page itself ran (the most recent of the two); the journal is read through the screen lane (serial), once when the screen opens and after each operation end; a launcher that does not list base/last is not asked and the thread stays the in-memory one; the launcher\'s texts are bounded and escaped')
def l103(c):
    lang = c.lang
    ZX = lambda k: _trow(k, lang, after='  zx: {')
    world = _l97_world()
    world['last'] = {'ok': True, 'results': {}}   # the launcher has done nothing yet
    st, _x4 = _l89_open(c, world, verbs=('base/pickup', 'base/cycle', 'base/last'), last_results=lambda a: world['last'])
    reads = lambda: [p for p in st['posts'] if p['verb'] == 'last']
    # the read of base/last is queued AFTER the read of the list of the cycle in the lane of the screen (one job at a time): the screen is drawn when the first one is done, the second may still be on its way (a loaded machine) - wait for it, then check that no other follows
    deadline = time.time() + 15
    while not reads() and time.time() < deadline:
        c.wait(100)
    c.wait(1200)
    c.eq([len(reads()), (reads() or [{'args': None}])[0]['args']], [1, {}], 'the journal of the launcher is read ONCE when the screen opens (no argument), through the screen lane like the other reads', what='one read at the opening')
    steps = lambda: c.js("[...document.querySelectorAll('[data-sheet=gb] [data-thread-step]')].map(s => [s.dataset.threadStep, s.dataset.ok, s.querySelector('[data-thread-text]').textContent.replace(/[\\s\\u00a0\\u202f]+/g, ' ').trim()])")
    # ---- 1. the sheet of the United Kingdom runs « Mettre à jour ce pays »: the page keeps its own thread; the launcher's journal now holds the same two operations
    _l89_sheet(c, 'gb')
    c.eq(c.count('[data-sheet=gb] [data-sheet-thread]'), 0, 'nothing was done to this country yet: no thread', what='no thread yet')
    world['last'] = _l103_journal('built')
    n_reads = len(reads())
    _l97_run(c, st, world, [_l97_dl('done', jid='f1'), _l97_build('done', jid='b1')])
    c.until("!!document.querySelector('[data-sheet=gb] [data-sheet-thread]') && !document.querySelector('[data-sheet=gb] [data-sheet-progress]')", timeout=30000, what='the thread of the update')
    c.eq([[k, ok] for k, ok, _t in steps()], [['download', 'yes'], ['build', 'yes']], 'the page\'s own thread: downloaded, built', what='memory thread')
    for _ in range(40):
        if len(reads()) > n_reads:
            break
        c.wait(250)
    c.ge(len(reads()), n_reads + 1, 'the journal is read again after the operation ends', what='re-read at the end')
    # ---- 2. the page is reloaded: the memory is gone, the sheet still tells the last operation of the country (RED before: the thread vanished)
    _l98_fresh(c, st)
    c.ge(len(reads()), n_reads + 2, 'the reloaded screen reads the journal again', what='read after reload')
    _l89_sheet(c, 'gb')
    c.until("!!document.querySelector('[data-sheet=gb] [data-sheet-thread]')", timeout=15000, what='the thread from the journal after the reload')
    c.eq([c.attr('[data-sheet=gb] [data-sheet-thread]', 'data-thread-from'), [[k, ok] for k, ok, _t in steps()], c.attr('[data-sheet=gb] [data-thread-bilan]', 'data-level')], ['journal', [['download', 'yes'], ['build', 'yes']], 'ok'],
         'after the reload the sheet still shows the last operation of the country (from the launcher\'s journal): downloaded, built, and the country is up to date', what='reloaded thread')
    t = steps()
    c.ok(re.fullmatch(_rx(ZX('thDl'), lang, t=_L103_TIME), norm(t[0][2])) and re.fullmatch(_rx(ZX('thBuild'), lang, t=_L103_TIME), norm(t[1][2])), t, 'each step says what it did and at what time')
    _l89_sheet(c, 'fr')
    c.eq(c.count('[data-sheet=fr] [data-sheet-thread]'), 0, 'the journal entries name the United Kingdom only: the sheet of France shows nothing', what='only its country')
    # ---- 3. the whole chain and why the country stays « pas à jour »: taken at, downloaded at, built at — nothing changed
    world['last'] = _l103_journal('chain')
    world['zs']['gb'] = _zst('stale', _NEWER)
    st['status'] = lambda args: _status(world['zs'])
    _l98_fresh(c, st)
    _l89_sheet(c, 'gb')
    c.until("!!document.querySelector('[data-sheet=gb] [data-sheet-thread]')", timeout=15000, what='the thread from the journal')
    t = steps()
    c.eq([[k, ok] for k, ok, _t in t], [['pick', 'yes'], ['download', 'yes'], ['build', 'yes']], 'the three steps of the last operation: taken, downloaded, built', what='chain steps')
    c.ok(re.fullmatch(_rx(ZX('thPick'), lang, t=_L103_TIME), norm(t[0][2])) and re.fullmatch(_rx(ZX('thDl'), lang, t=_L103_TIME), norm(t[1][2])) and re.fullmatch(_rx(ZX('thBuildSame'), lang, t=_L103_TIME), norm(t[2][2])), t,
         '« pris à … · téléchargé à … · construit à … : rien n\'a changé »')
    mid = norm(_trow('source-newer', lang, after="'source-newer'").split('{cycle}')[1].split('{built}')[0]).strip()
    bilan = norm(c.text('[data-sheet=gb] [data-thread-bilan]'))
    c.ok(c.attr('[data-sheet=gb] [data-thread-bilan]', 'data-level') == 'warn' and mid in bilan, bilan, 'the country is still not up to date and the sheet says WHY, in the launcher\'s words')
    if c.width in (390, 1280):
        c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
        c.js("document.querySelector('[data-sheet=gb] [data-sheet-thread]').scrollIntoView({ block: 'center' })")
        c.shot(f'L103_{c.width}_{lang}_delivered.png')
    # ---- 4. a failed step stays with its reason and « Réessayer » (after a reload too); the retry chains the rest
    world['last'] = _l103_journal('failed')
    _l98_fresh(c, st)
    _l89_sheet(c, 'gb')
    c.until("!!document.querySelector('[data-sheet=gb] [data-sheet-thread]')", timeout=15000, what='the failed thread from the journal')
    t = steps()
    c.eq([[k, ok] for k, ok, _t in t], [['download', 'no'], ['build', 'todo']], 'the download FAILED (red, with its reason), the build was not reached (neutral)', what='failed steps')
    c.ok(norm(t[0][2]).startswith(norm(ZX('thWDl'))) and '404' in t[0][2], t[0][2], 'the failed step keeps the launcher\'s reason (the status 404)')
    c.eq([c.attr('[data-sheet=gb] [data-sheet-thread]', 'data-thread-state'), c.attr('[data-sheet=gb] [data-thread-bilan]', 'data-level'), c.count('[data-sheet=gb] [data-act=zop-retry]')], ['failed', 'err', 1], 'the bilan is a failure with « Réessayer » on the failed step', what='failed bilan')
    world['last'] = _l103_journal('built')
    world['zs']['gb'] = _zst('stale', _NEWER)
    _l97_run_retry = [_l97_dl('done', jid='f2'), _l97_build('done', jid='b2')]
    st['views'], st['i'] = _l97_run_retry, 0
    st['start'] = (200, {'job': 'j1'})
    n0 = len([p for p in st['posts'] if p['verb'] == 'build'])
    st['status'] = lambda args: _status({**world['zs'], 'gb': _zst('up-to-date') if len([p for p in st['posts'] if p['verb'] == 'build']) > n0 else world['zs']['gb']})
    c.js("document.querySelector('[data-sheet=gb] [data-act=zop-retry]').scrollIntoView({ block: 'center' })")   # the sheet of the United Kingdom lists three files to take by hand now (catalogue of 12 Nov): the thread is under them, inside the scroll of the sheet
    c.tap('[data-sheet=gb] [data-act=zop-retry]')
    c.until("!!document.querySelector('[data-sheet=gb] [data-sheet-thread][data-thread-state=done]') && !document.querySelector('[data-sheet=gb] [data-sheet-progress]')", timeout=30000, what='the thread of the retry')
    c.eq([[k, ok] for k, ok, _t in steps()], [['download', 'yes'], ['build', 'yes']], 'the retry of a step read from the journal chains the rest and succeeds', what='retry thread')
    # ---- 5. a launcher that does not list base/last: not asked, the in-memory thread is all there is (nothing breaks)
    st['verbs'] = _VERBS + ['base/pickup', 'base/cycle']
    prev = -1
    for _ in range(20):   # the reads of the previous page end first (a late one must not be counted against the new page)
        if len(reads()) == prev:
            break
        prev = len(reads())
        c.wait(500)
    n1 = len(reads())
    _l98_fresh(c, st)
    _l89_sheet(c, 'gb')
    c.wait(600)
    c.eq([len(reads()) - n1, c.count('[data-sheet=gb] [data-sheet-thread]')], [0, 0], 'a launcher without the verb is not asked, and a reloaded page has no thread to show (graceful)', what='no verb')
    c.check_errors()


@case('L104', 'Données: the computed sources come from base/cycle `local` (SOG-0262 lot D3, K185) — « Quand ça change » reads their label, their last date and their number of countries from it (« calculée le 5/11/2026 · pour 5 pays »), any other computed source it names gets its line, the sheet of a country states them as facts, the list of the month still counts the same sources',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=True, night=False,
      rule='SOG-0262 D3 + K185: the launcher no longer returns MORA / X-Plane in `items` but under `local: [{ id, label[4], at, personal, zoneCount }]`; the screen reads `local` (a launcher that still puts them in `items` is brought to the same form, the screen-side filter of the list of the month stays harmless); the to-do count (done among counted) does not change; the launcher\'s label is bounded and escaped')
def l104(c):
    lang = c.lang
    ZX = lambda k: _trow(k, lang, after='  zx: {')
    D3 = lambda k: _trow(k, lang, after='  d3: {')
    CWB = lambda k: _trow(k, lang, after='  cwb: {')
    LC = lambda k: _trow(k, lang, after='  lc: {')
    world = {'sia_seen': True, 'local': True, 'mora': True}
    st, _x4 = _l89_open(c, world, nat={'state': {'present': True, 'count': 17, 'from': '2026-11-12T07:00:00Z', 'validUntil': '2026-11-12T19:00:00Z', 'expired': False, 'current': 12}})
    c.js("(d => { if (d) d.open = true })(document.querySelector('details[data-todo]'))")
    c.eq(norm(c.text('[data-todo-head]')), norm(CWB('todoHead').replace('{c}', '2611').replace('{n}', '3').replace('{m}', '8')), 'the list of the month counts the same eight sources, 3 done (the computed ones are not in `items` any more and were never counted)', what='todo count')
    c.eq(c.count('[data-todo-item=xplane], [data-todo-item=mora]'), 0, 'no line for a computed source', what='no computed line')
    # ---- « Quand ça change »: label, last date and number of countries come from `local`
    c.tap('[data-lc-fold=change] > summary')
    c.until("document.querySelector('[data-lc-fold=change]').open", timeout=3000, what='the fold opens')
    c.eq(c.js("[...document.querySelectorAll('[data-change-list] > li')].map(l => l.dataset.change)"), ['xplane', 'lnm', 'openaip', 'geonames', 'mora', 'nat', 'gebco'], 'the six lines, then the other computed source the launcher names (gebco)', what='lines')
    z = lambda n: _trow('country', lang, after='  unit: {', row=0 if n <= 1 else 1)
    last = lambda i: norm(c.text(f'[data-change={i}] [data-change-last]'))
    c.eq([last('mora'), last('xplane'), last('gebco')],
         [norm(D3('changeComputed').replace('{d}', _date_text(datetime.date(2026, 11, 5), lang))), norm(LC('changeNoDate')), norm(D3('changeComputed').replace('{d}', _date_text(datetime.date(2026, 10, 20), lang)))],
         'MORA: computed on its date (from `local`), X-Plane: no date, the extra source: its own date', what='dates')
    c.eq([norm(c.text('[data-change=mora] [data-change-zones]')), norm(c.text('[data-change=xplane] [data-change-zones]')), c.count('[data-change=gebco] [data-change-zones]')],
         [norm(D3('changeZones').replace('{z}', f"5 {z(5)}")), norm(D3('changeZones').replace('{z}', f"3 {z(3)}")), 0], 'for how many countries (zoneCount), nothing said for none', what='zones')
    c.eq(norm(c.text('[data-change=gebco] b')).startswith('GEBCO'), True, 'the extra line carries the label the launcher gives in the language of the app', what='extra label')
    c.eq([c.count('[data-lc-fold=change] img'), c.js('window.__pwn === undefined'), c.count('[data-change=gebco] button, [data-change=gebco] a')], [0, True, 0], 'the launcher\'s label is escaped (nothing is injected) and the extra line is no action', what='escaped')
    c.eq(norm(c.text('[data-lc-fold=change] [data-lc-pill]')), norm(_trow('pillSources', lang, after='  d2: {').replace('{n}', '7')), 'the pill counts the seven lines', what='pill')
    # ---- the sheet of a country that has a computed source: a fact, with the date of `local` when its own file carries none
    _l89_sheet(c, 'gb')
    fact = norm(c.text('[data-sheet=gb] [data-computed-fact]'))
    c.ok(_date_text(datetime.date(2026, 11, 5), lang) in fact and norm(ZX('computedHere').replace('{s}', '')) not in fact, fact, 'the sheet says it as a fact: « MORA : calculée le … » with the date from `local`')
    c.eq(c.count('[data-sheet=gb] [data-sheet-source=mora] [data-tick=download]'), 0, 'a computed source has no « téléchargé » tick', what='no tick')
    c.check_errors()


@case('L105', 'Données: natEnsure answering « busy » (the launcher already runs another operation, SOG-0262 lot D3, K186) shows THE busy card at the NAT line — which operation, since when, where it is, Voir / Arrêter — never the bare sentence; it is no failure, the line says it will be taken again at its end',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=True, night=False,
      rule='SOG-0262 D3 + K186: `AeroDb.natEnsure()` returns `busy: true` + `running` (the 409 of the launcher) when the launcher is busy: refreshed false, no failure counted; the screen draws the card of that operation (busy.js, S.at) at the NAT line with that `running`; one card on the page, no « autre opération » sentence alone')
def l105(c):
    lang = c.lang
    B = lambda key: _trow(key, lang, after='  busy: {')
    ZX = lambda k: _trow(k, lang, after='  zx: {')
    name = f"{_trow('proc', lang, after='  groups: {')} · {_trow('fetch', lang, after='Ruta (RAD, FRA)')}"
    R = _running()
    RV = {**_fview({}, state='running', step='Lecture des sources', jid='o1', verb='fetch'), 'set': 'proc'}
    expired = {'present': True, 'count': 17, 'from': '2026-11-09T07:00:00Z', 'validUntil': '2026-11-10T19:00:00Z', 'expired': True, 'current': 0}
    world = _l93_world()
    st, _x4 = _l89_open(c, world, busy_running=R, busy_view=RV, verbs=('base/pickup', 'base/cycle', 'base/publish'), publish=lambda a: world['plan'] if a.get('dry', True) else world['real'],
                        nat={'state': expired, 'busy': True, 'running': R}, my_coverage=False)
    c.eq(c.count('[data-busy-card]'), 0, 'nothing runs on the page: no card before the NAT tracks are read', what='no card yet')
    c.tap('[data-lc-fold=change] > summary')
    c.until("!!document.querySelector('[data-change=nat] [data-busy-card]')", timeout=12000, what='the card at the NAT line')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.eq([c.count('[data-change=nat] [data-busy-card]'), c.count('[data-busy-card]'), c.count('[data-other]'), c.count('[data-refusal=busy]'), (c.js('window.__stub.calls') or {}).get('natEnsure', 0)], [1, 1, 0, 0, 1],
         'natEnsure said busy: ONE card, at the NAT line, no bare sentence, natEnsure asked once', what='card at the nat line')
    c.eq(norm(c.text('[data-change=nat] [data-busy-name]')), norm(B('title').replace('{n}', name)), 'the card names the operation of the launcher\'s `running` (the card of SOG-0245)', what='card name')
    c.eq(c.js("[...document.querySelectorAll('[data-change=nat] [data-busy-act]')].map(b => b.dataset.busyAct)"), ['see', 'stop', 'hide'], 'Voir and Arrêter (Masquer for the card alone)', what='card buttons')
    c.eq(norm(ZX('natDeferred')) in norm(c.text('[data-change=nat]')), True, 'it is no failure: the line says the tracks will be taken again at the end of that operation', what='deferred line')
    c.eq(c.count('[data-change=nat] [data-change-last]'), 1, 'the validity of the tracks is still said on the line', what='validity')
    if c.width in (390, 1280):
        c.js("document.querySelector('[data-change=nat]').scrollIntoView({ block: 'center' })")
        c.shot(f'L105_{c.width}_{lang}_delivered.png')
    c.check_errors()


@case('L106', 'Données: there is ONE « Tout mettre à jour » and the page follows its own order (SOG-0262 lot D3, redone at lot D4) — the older card of the data sets is gone (its function lives in the button of the cycle header, which does the base AND the other sets that need something); the base group sits right under the cycle header in the code (the keyboard goes where the eye goes) and no CSS `order` is left on the page body',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=True, night=False,
      rule='SOG-0262 D3 + D4: the label « Tout mettre à jour » existed twice (the button of the base header and the older chain card); the ergonomist decided (D4) on ONE, the one of the header, that runs the chain machinery (chain.js) when other sets need something and the base update otherwise; the D2 layout used CSS `order` to put the base group under the header, so the Tab order differed from the visual order: the DOM now follows the visual order')
def l106(c):
    lang = c.lang
    world = {'sia_seen': True}
    st, _x4 = _l89_open(c, world)
    pre = norm(_UT('updateN', lang)).split('{n}')[0].rstrip(' (')
    btns = c.js("(p => [...document.querySelectorAll('[data-module=data] button')].filter(b => b.offsetParent !== null && b.textContent.replace(/\s+/g, ' ').trim().startsWith(p)).map(b => !!b.closest('[data-state-head]')))", pre)
    c.eq([btns, c.count('[data-state-head] [data-update-row] button')], [[True], 1], 'one button « Tout mettre à jour », and it is the one of the cycle header (the older card and its second button are gone)', what='one button')
    c.eq(c.count('[data-update-all] h2, [data-update-all-caption], [data-body] > [data-update-all]'), 0, 'no card, no title, no caption of the older chain', what='no old card')
    order = c.js("""(() => { const q = s => document.querySelector(s), before = (a, b) => !!(q(a).compareDocumentPosition(q(b)) & Node.DOCUMENT_POSITION_FOLLOWING);
      return [before('[data-data-head]', '[data-group=base]'), before('[data-group=base]', '[data-update-all]'), before('[data-update-all]', 'details.f-group[data-group=proc]')] })()""")
    c.eq(order, [True] * 3, 'the code order is the visual one: the one-line head, the base block with the cycle header and its button, the other sets', what='dom order')
    c.eq([c.js("[...document.querySelector('[data-body]').children].filter(e => getComputedStyle(e).order !== '0').map(e => e.tagName)"), c.js("[...document.querySelectorAll('[data-state-head] *')].filter(e => getComputedStyle(e).order !== '0').length")], [[], 0],
         'no CSS `order` left on the page body nor in the cycle header: Tab follows the screen', what='no css order')
    c.check_errors()


# ------------------------------------------------------------------------------------------------------ L107 .. L115 (SOG-0262, lot D4: the eight finishing items of the ergonomist)
_D4 = lambda key, lang: norm(_trow(key, lang, after='  d4: {'))
_unit_count = lambda unit, n, lang: f"{n} {_unit(unit, lang, n)}"
_L_RECT = lambda c, sel: c.js(f"(e => e ? (r => ({{ l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }}))(e.getBoundingClientRect()) : null)(document.querySelector('{sel}'))")


@case('L107', 'Données: the bottom of the page is the mockup (SOG-0262 lot D4, item 1) — under the base block there is no old unfolded screen: every OTHER set is ONE folded line with its state (« Procédures · à jour », « Aéronefs · 1 à faire »…), nothing is unfolded by default, the old « Couverture » card and the old set-chain card are gone, the coverage by country, the inventory and the journal are folded lines too, and a line opened shows its panel as before',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=True, night=False,
      rule='SOG-0262 D4 item 1 (the user, Q-0020: « chaque autre jeu = une ligne repliée avec son état, rien de déplié par défaut; ce que la refonte remplace disparaît »): the user must not see two screens stacked; every panel keeps its behaviour and its data-attributes inside its fold')
def l107(c):
    lang = c.lang
    _l102_open(c)
    folds = c.js("[...document.querySelectorAll('[data-body] > details.f-group')].map(d => [d.dataset.group, d.open])")
    c.eq(folds, [['proc', False], ['vfr', False], ['aircraft', False], ['weather', False], ['sources', False]], 'the other sets: ONE folded line each, in the order of the page, nothing unfolded by default', what='folds')
    c.eq(c.count('[data-coverage], [data-update-all] h2, [data-update-all-caption], [data-body] > [data-update-all]'), 0, 'the old « Couverture » card and the old set-chain card are gone', what='old cards')
    c.eq(c.js("[...document.querySelectorAll('[data-set-panel], [data-set]')].filter(e => e.checkVisibility()).map(e => e.tagName + ':' + (e.dataset.set || e.dataset.setPanel) + ':' + (e.parentElement.className || e.parentElement.tagName))"), [], 'no panel and no row of the other sets is visible: they are inside their folded line', what='nothing unfolded')
    words = c.js("[...document.querySelectorAll('[data-body] > details.f-group')].map(d => [d.dataset.group, (d.querySelector('summary > span:first-child') || {}).textContent, ((d.querySelector('[data-fold-state]') || {}).textContent || '').trim()])")
    ok_w, unk_w = _D4('stOk', lang), _D4('stUnknown', lang)
    todo_rx = re.escape(_D4('stTodo', lang)).replace(re.escape('{n}'), r'\d+')
    for g, title, word in words:
        if g in ('proc', 'aircraft', 'sources'):
            c.ok(re.fullmatch(f'{re.escape(ok_w)}|{todo_rx}|{re.escape(unk_w)}', norm(word)) is not None, (g, word), 'the line says the state of its set in a word: à jour, n à faire or état inconnu')
        c.ok(bool(norm(title or '')), (g, title), 'and has its title')
    c.eq([norm(words[1][1]), norm(words[4][1])], [_D4('foldVfr', lang), _D4('foldSources', lang)], 'the VFR points and the sources have their own lines', what='titles')
    tail = c.js("[...document.querySelector('[data-body]').children].slice(-3).map(e => e.tagName + '.' + e.className.split(' ').find(x => x.startsWith('d-')))")
    c.eq(tail, ['DETAILS.d-covtable', 'DETAILS.d-inventory', 'DETAILS.d-journal'], 'the coverage by country, the inventory of the files and the journal close the page, as folded lines', what='tail')
    c.eq(c.js("[...document.querySelectorAll('details.d-covtable, details.d-inventory, details.d-journal')].map(d => d.open)"), [False] * 3, 'folded', what='tail folded')
    c.eq(c.count('[data-state-head] [data-update-row] button'), 1, 'ONE « Tout mettre à jour » on the page: the one of the cycle header (the second button of the old card is gone)', what='one button')
    # opening a line shows its panel, as before (data-attributes and verbs kept)
    for g, panel in (('proc', '[data-set-panel=proc] [data-verb=download]'), ('vfr', '[data-set-panel=vfr] [data-verb=build]'), ('aircraft', '[data-set-panel=aircraft] [data-verb=purge]'), ('sources', '[data-set=sia]')):
        c.tap(f'details[data-group={g}] > summary')
        c.until(f"document.querySelector('{panel}')?.checkVisibility()", timeout=3000, what=f'the panel of {g} shows when its line is opened')
        c.tap(f'details[data-group={g}] > summary')
    c.eq(c.js("[...document.querySelectorAll('details.f-group')].map(d => d.open)"), [False] * 5, 'folded again', what='folded again')
    c.check_errors()


@case('L108', 'Données: the header does not double itself and the map is tall (SOG-0262 lot D4, item 2) — « Données / Cycle en vigueur… / Base aéronautique » above the cycle title are ONE line, the counters stay on ONE line under the bar, and at 1280 × 800 the map is at least 320 px high with the folded « À faire ce mois-ci » line and the first ROW of group cards in the same screen',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=True, night=False,
      rule='SOG-0262 D4 item 2 (the map was 200 px against about 380 in the mockup because the header and the heading of the base block stacked three lines above the title)')
def l108(c):
    lang = c.lang
    wide = c.width >= 900
    _l102_open(c)
    head = _L_RECT(c, '[data-data-head]')
    c.le(head['h'], 36 if wide else 70, 'the cycle, its dates and the launcher are ONE line of the header (two or three on a phone)', what='head height')
    c.eq(c.count('[data-data-head] p'), 1, 'one paragraph', what='one paragraph')
    c.eq(c.count('details[data-group=base], [data-group=base] > summary'), 0, 'no « Base aéronautique » heading line above the cycle title', what='no base heading')
    c.ok(norm(_trow('base', lang, after='  groups: {')) not in norm(c.text('[data-body]')), 'text', 'the words « Base aéronautique » are not on the page any more')
    c.js("document.querySelector('[data-cycle-title]').scrollIntoView({ block: 'start', behavior: 'instant' }); window.scrollBy(0, -64)")
    tops = c.js("[...document.querySelectorAll('[data-state-sentence] [data-filter]')].map(b => Math.round(b.getBoundingClientRect().top))")
    c.ok(len(tops) >= 4 and (max(tops) - min(tops) < 8 or not wide), tops, 'the counters are links on ONE line under the bar (wide)')
    if wide:
        mp, td, gr = _L_RECT(c, '[data-wmap]'), _L_RECT(c, '[data-todo]'), _L_RECT(c, '[data-group-id]')
        vh = c.js('window.innerHeight')
        c.ge(mp['h'], 320, 'the map is at least 320 px high (it was 200)', what='map height')
        c.ok(gr['b'] <= vh and mp['b'] <= td['t'] and td['b'] <= gr['t'], (mp, td, gr, vh), 'the map, the folded « À faire ce mois-ci » line and the first row of group cards are all in the first screen of 800')
    c.check_errors()


def _l_frame(c):
    """The frame (viewBox x y w h) of the map."""
    return c.js("document.querySelector('[data-wmap]').getAttribute('viewBox').split(' ').map(Number)")


@case('L109', 'Données: opening a group FRAMES the map on that group (SOG-0262 lot D4, item 3) — « Groupe ouvert : Europe du Sud » shows Southern Europe, the overseas territories of its countries do not count in the frame (they stay tinted, seen by zooming out), « Voir le monde entier » and « Recentrer sur ma couverture » stay, closing the group returns to the coverage frame',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=True, night=False,
      rule='SOG-0262 D4 item 3 (the mockup: « Groupe ouvert : Europe de l\'Ouest » shows Western Europe): the frame of a group is the one of the principal ring group of each of its countries (aerodb zoneOutlines `parts[0]`), never the Azores, the Canaries or the overseas departments')
def l109(c):
    _l102_open(c)
    cover0 = _l_frame(c)
    c.tap('[data-group-id=europe-south] [data-act=grp-toggle]')
    c.until("document.querySelector('[data-group-id=europe-south]').dataset.open === 'true'", timeout=4000, what='the group opens')
    g = _l_frame(c)
    c.ok(g[2] < cover0[2] * 0.7 and g[0] > -22 and g[0] + g[2] < 62, (cover0, g), 'the map is framed on Southern Europe: narrower than the coverage frame, from about -10 degrees to the east of the Balkans')
    pt = c.js("(p => p ? [p.getBBox().x, p.hasAttribute('data-grp'), p.dataset.tone] : null)(document.querySelector('[data-wmap] path[data-zone=pt]'))")
    c.ok(pt and pt[0] < -25 and pt[1] and pt[2], pt, 'the overseas territories are still drawn and tinted (the path of Portugal reaches the Azores at -31 degrees, outlined with its group) although the frame does not reach them')
    c.tap('[data-act=world-toggle]')
    c.until("document.querySelector('[data-wmap]').getAttribute('viewBox') === document.querySelector('[data-wmap]').getAttribute('data-world')", timeout=4000, what='the world is framed')
    c.eq(c.count('[data-act=world-toggle], [data-act=map-home]'), 2, '« Voir le monde entier » and « Recentrer sur ma couverture » are still there', what='map links')
    c.tap('[data-act=map-home]')
    c.until("document.querySelector('[data-wmap]').getAttribute('viewBox') === document.querySelector('[data-wmap]').getAttribute('data-base')", timeout=4000, what='the coverage is framed again')
    c.eq(_l_frame(c), cover0, '« Recentrer sur ma couverture » gives the coverage frame, even with the group open', what='home')
    c.tap('[data-group-id=europe-south] [data-act=grp-toggle]')
    c.until("document.querySelector('[data-group-id=europe-south]').dataset.open === 'false'", timeout=4000, what='the group closes')
    c.eq(_l_frame(c), cover0, 'closing the group returns to the coverage frame', what='closed')
    c.tap('[data-group-id=europe-south] [data-act=grp-toggle]')
    c.until("document.querySelector('[data-group-id=europe-south]').dataset.open === 'true'", timeout=4000, what='the group opens again')
    c.eq(_l_frame(c), g, 'opening it again frames it again', what='reopened')
    c.check_errors()


@case('L110', 'Données: the groups are ordered by what there is to do (SOG-0262 lot D4, item 4) — the groups with something to do first, then the up-to-date ones, then the ones with NO country of your coverage, faded, at the end',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=True, night=False,
      rule='SOG-0262 D4 item 4 (the mockup lists the groups to do first); the order inside a rank is the one of the packs')
def l110(c):
    _l102_open(c)
    rows = c.js("[...document.querySelectorAll('[data-group-id]')].map(g => [g.dataset.groupId, g.hasAttribute('data-nocov') ? 2 : g.querySelector('[data-sum-tone=warn], [data-sum-tone=err]') ? 0 : 1, getComputedStyle(g).opacity])")
    ranks = [r[1] for r in rows]
    c.ok(ranks == sorted(ranks) and set(ranks) == {0, 1, 2}, rows, 'to do first (0), then up to date (1), then no country of your coverage (2): the three kinds are there and in that order')
    c.ok(all(float(r[2]) < 1 for r in rows if r[1] == 2) and all(float(r[2]) == 1 for r in rows if r[1] < 2), [r[2] for r in rows], 'the groups without any country of the coverage are faded')
    c.check_errors()


@case('L111', 'Données: the country sheet is readable (SOG-0262 lots D4 and D5, items 5 and 6) — the three cells carry the SHORT word (« à faire », « à jour », « le 05/10 »), the long detail is a full-width line UNDER the cells (not crammed in a narrow cell), the sub-title says the zones when the catalogue names them (AeroCatalogue.partNamesOf: « PT · groupe Europe du Sud · 3 zones : continent, Madère, Açores ») and the « Pourquoi à la main » block exists ONLY on a source whose catalogue entry carries a reason (steps.why), in the language of the screen',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=True, night=False,
      rule='SOG-0262 D4 items 5 and 6 (the mockup\'s cells hold one word; a whole sentence in a 105 px cell was unreadable, also at 390), D5 (frame/aerodb/INTEGRATION.md « steps.why and partNamesOf », K206): never an invented text: the sub-zone names come from `AeroCatalogue.partNamesOf(zone)` (null = no sub-title) and the reason from `AeroCatalogue.stepsOf(id).why` (absent = no block); both are READ from the real catalogue of the page, nothing is hard-coded here')
def l111(c):
    lang = c.lang
    li = {'fr': 0, 'en': 1, 'de': 2, 'es': 3}[lang]
    _l102_open(c)
    c.tap('[data-group-id=europe-south] [data-act=grp-toggle]')
    c.until("document.querySelector('[data-group-id=europe-south]').dataset.open === 'true'", timeout=4000, what='the group opens')
    c.tap('[data-group-body] [data-zone=pt]')
    c.until("!!document.querySelector('[data-sheet=pt] [data-sheet-source]')", timeout=10000, what='the sheet of Portugal')
    c.until("!document.querySelector('[data-sheet=pt] [data-inventory-state=loading]')", timeout=8000, what='the view of Portugal is read')
    c.wait(300)
    cells = c.js("[...document.querySelectorAll('[data-sheet] [data-sheet-facts] li')].map(l => [l.dataset.tick, l.dataset.ok, l.textContent.replace(/\\s+/g, ' ').trim()])")
    zx = lambda k: norm(_trow(k, lang, after='  zx: {'))
    build = next(x for x in cells if x[0] == 'build')
    c.ok(zx('twTodo') in norm(build[2]) and len(build[2]) < 40, build, 'the « construit » cell holds the short word « à faire » and nothing more')
    cl, notes, sh = _L_RECT(c, '[data-sheet] .d-cells3'), _L_RECT(c, '[data-sheet] [data-cell-notes]'), _L_RECT(c, '[data-sheet]')
    c.ok(notes is not None and notes['t'] >= cl['b'] - 1 and notes['w'] >= sh['w'] - 48, (cl, notes, sh), 'the long detail is on its own line under the cells, on the full width of the sheet')
    note = norm(c.text('[data-sheet] [data-cell-note=build]'))
    c.ok(len(note) > 40 and note not in norm(build[2]), note, 'the long sentence (why the country is not up to date, the last build) is there, outside the cell')
    # the sub-title: the parts of Portugal as the REAL catalogue names them (partNamesOf), in the language of the screen
    parts = c.js(f"(AeroCatalogue.partNamesOf('pt') || []).map(n => n[{li}])")
    c.ok(len(parts) == 3 and all(parts), parts, 'the catalogue names three parts of Portugal (read from AeroCatalogue.partNamesOf, not written here)')
    sub = norm(c.text('[data-sheet-sub]'))
    c.ok(sub.endswith(_D4('subZones', lang).replace('{n}', str(len(parts))).replace('{z}', norm(', '.join(parts)))) and sub.startswith('PT'), sub, 'the sub-title says the zones: « PT · groupe … · 3 zones : continent, Madère, Açores »')

    def why_blocks():
        """[[launcher id, the reason shown or None, the reason of the catalogue in this language or None]] for every source block of the open sheet."""
        return c.js(f"""[...document.querySelectorAll('[data-sheet] [data-sheet-source]:not([data-unavailable])')].map(b => {{
          const id = b.dataset.sheetSource, w = AeroCatalogue.stepsOf(id === 'faa' ? 'adds' : id)?.why, e = b.querySelector('[data-hand-why]');
          return [id, e ? e.textContent.replace(/\\s+/g, ' ').trim() : null, w ? w[{li}] : null, e ? e.querySelector('b').textContent.trim() : null] }})""")

    def check(zone, what):
        got = why_blocks()
        c.ok(len(got) >= 1, got, f'{what}: the sheet lists its sources')
        for sid, shown, known, label in got:
            c.ok((shown is not None) == (known is not None), (zone, sid, shown, known), f'{what}: {sid} shows « Pourquoi à la main » exactly when its catalogue entry carries a reason (never invented)')
            if shown is not None:
                c.ok(norm(label).lower() == _D4('whyHand', lang).lower() and norm(shown).endswith(norm(known)), (sid, shown, known), f'{what}: {sid} says the reason of the catalogue, in the language of the screen')
        return got

    pt = check('pt', 'Portugal')
    c.ok(any(x[0] == 'navpt' and x[1] for x in pt), pt, 'NAV Portugal says why it is taken by hand')

    def open_sheet(zone):
        c.js(f"window.location.hash = '#data?zone={zone}'")
        c.js(f"(async () => (await import('/modules/data/countries.js')).openCountryById('{zone}'))()")
        c.js("(async () => (await import('/modules/data/panels.js')).renderBuild())()")
        c.until(f"!!document.querySelector('[data-sheet={zone}] [data-sheet-source]')", timeout=10000, what=f'the sheet of {zone}')

    # France: the SIA and DIRCAM both carry a known reason in the catalogue (AeroDB 6e27a6a8a): both are said, in the four languages
    open_sheet('fr')
    fr = check('fr', 'France')
    said = {x[0]: x for x in fr}
    c.ok(all(k in said and said[k][1] and said[k][2] for k in ('sia', 'dircam')), fr, 'the SIA and DIRCAM each say why they are taken by hand (the catalogue gives it; read from it, not written here)')
    # a country whose sources have no reason: no block at all (the first one found in the catalogue that says nothing)
    nowhy = c.js("(AeroCatalogue.SOURCES.filter(s => s.group === 'base' && s.id !== 'adds' && !AeroCatalogue.stepsOf(s.id)?.why && Array.isArray(s.zones) && ['gb', 'de', 'es', 'ie', 'se', 'ch', 'nl'].some(z => s.zones.includes(z))).map(s => s.id))")
    c.ok(len(nowhy) >= 1, nowhy, 'the catalogue has base sources without a known reason (NATS, LFV...)')
    open_sheet('gb')
    gb = check('gb', 'United Kingdom')
    c.ok(any(x[0] == 'nats' and x[1] is None for x in gb), gb, 'NATS has no known reason: no « Pourquoi à la main » on its block')
    c.check_errors()


# D5 (SOG-0262, frame/aerodb/INTEGRATION.md « base/cycle.datasets », K207): the other sets as the launcher says them (tools/regen/base_cycle.py datasets()); labels, states and reasons mimic the real answer
_L116_LABEL = {'procedures': ['Procédures', 'Procedures', 'Verfahren', 'Procedimientos'], 'weather': ['Météo du monde (synoptique)', 'World weather (synoptic)', 'Weltwetter (Synoptik)', 'Meteorología mundial (sinóptico)'],
               'nat': ['Routes NAT du jour', 'Today’s NAT tracks', 'NAT-Tracks des Tages', 'Tracks NAT del día'], 'vfr': ['Points VFR', 'VFR points', 'VFR-Punkte', 'Puntos VFR'],
               'aircraft': ['Aéronefs (types, performances)', 'Aircraft (types, performance)', 'Luftfahrzeuge (Typen, Leistung)', 'Aeronaves (tipos, rendimiento)'],
               'sheets': ['Fiches de performances', 'Performance sheets', 'Leistungsblätter', 'Fichas de rendimiento']}


def _l116_ds(i, state, why=None, at=None, **extra):
    """One row of base/cycle.datasets: { id, label[4], state, why?, at, ... }."""
    return {'id': i, 'label': _L116_LABEL[i], 'state': state, **({'why': why} if why else {}), 'at': at, **extra}


_L116_DATASETS = [_l116_ds('procedures', 'todo', 'older-than-cycle', '2026-10-05T10:00:00Z', cycle='2026-10-01', counts={'cifp': 1200, 'eaip': 30}),
                  _l116_ds('weather', 'up-to-date', None, '2026-11-12T06:30:00Z', run='2026-11-12T06:00Z'),
                  _l116_ds('nat', 'todo', 'expired', '2026-11-11T18:00:00Z', validUntil='2026-11-12T05:00:00Z'),
                  _l116_ds('vfr', 'n/a', None, '2026-10-20T08:00:00Z', counts={'aerodromes': 400}),
                  _l116_ds('aircraft', 'n/a', None, '2026-09-30T08:00:00Z'),
                  _l116_ds('sheets', 'todo', 'absent', None)]
_L116_SHORT = {'fr': {'2026-10-05': '05/10', '2026-11-11': '11/11', '2026-10-20': '20/10', '2026-09-30': '30/09'},
               'en': {'2026-10-05': '05/10', '2026-11-11': '11/11', '2026-10-20': '20/10', '2026-09-30': '30/09'},
               'de': {'2026-10-05': '05.10.', '2026-11-11': '11.11.', '2026-10-20': '20.10.', '2026-09-30': '30.09.'},
               'es': {'2026-10-05': '5/10', '2026-11-11': '11/11', '2026-10-20': '20/10', '2026-09-30': '30/09'}}


def _l116_wrap(datasets, local=None):
    """Adds `datasets` (and the registry line of `local`) to what the fake base/cycle answers."""
    def wrap(answer):
        def go(args):
            res = answer(args)
            if datasets is not None:
                res['datasets'] = datasets
            if local:
                res['local'] = [*res.get('local', []), *local]
            return res
        return go
    return wrap


@case('L116', 'Données: the other sets say their state and the reason in words, and the header counts them — base/cycle.datasets (SOG-0262 lot D5, K207): « Procédures · à faire — plus ancien que le cycle · le 05/10 », « Aéronefs (…) · sans échéance » counted as done, and « Cycle AIRAC 2611 · n faits sur m » counts the base sources plus ONE per other set',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=True, night=False,
      rule='frame/aerodb/INTEGRATION.md « base/cycle.datasets » (12 Nov 2026, K207): { id, label[4], state: up-to-date | todo | n/a, why?: absent | older-than-cycle | old | expired, at }; n/a = exists with no due date = DONE in « n done on m »; a launcher without `datasets` keeps the count of the base alone (the other L cases)')
def l116(c):
    lang = c.lang
    _l102_open(c, wrap=_l116_wrap(_L116_DATASETS))
    c.until("!!document.querySelector('[data-body] > details.f-group[data-group=proc] [data-fold-why]')", timeout=8000, what='the folded line of the procedures says why')
    CW = lambda k: norm(_trow(k, lang, after='  cwb: {'))
    D5 = lambda k: norm(_trow(k, lang, after='  d5: {'))
    on = lambda d: norm(_trow('on', lang, after='  cw: {')).replace('{d}', _L116_SHORT[lang][d])
    lab = lambda i: _L116_LABEL[i][{'fr': 0, 'en': 1, 'de': 2, 'es': 3}[lang]]
    todo = lambda w: D5('dsTodo').replace('{w}', w)
    named = lambda why, i: D5(why) + f' ({lab(i)})'
    line = lambda g: c.js(f"(e => e ? [e.dataset.foldState, e.dataset.foldWhy || '', e.textContent.replace(/\s+/g, ' ').trim()] : null)(document.querySelector('[data-body] > details.f-group[data-group={g}] .d-fstate'))")
    got = {g: line(g) for g in ('proc', 'vfr', 'aircraft', 'weather')}
    exp = {'proc': ['todo', 'older-than-cycle', f"{todo(D5('dsWhyOlder'))} · {on('2026-10-05')}"],
           'weather': ['todo', 'expired', f"{todo(named('dsWhyExpired', 'nat'))} · {on('2026-11-11')}"],
           'aircraft': ['todo', 'absent', todo(named('dsWhyAbsent', 'sheets'))]}
    what = {'proc': 'Procédures: « à faire — plus ancien que le cycle · le 05/10 »', 'weather': 'the weather fold names the set to do when it is not its main one: « à faire — expiré (Routes NAT du jour) · le 11/11 »',
            'aircraft': 'the aircraft fold names the performance sheets: « à faire — absent (Fiches de performances) », no date (the launcher has none)'}
    # the useful date / counts of a set (SOG-0262, « date utile ») sit between the reason and the date of the file: the sentence is checked around them (L120 checks them in words)
    for g, e in exp.items():
        shown, full = norm(got[g][2]), norm(e[2])
        pre = full if g == 'aircraft' else norm(D5('dsTodo').split('{w}')[0]) if g == 'weather' else full.split(' · ')[0]
        tail = full if g == 'aircraft' else full.rsplit(' · ', 1)[-1]
        c.ok(got[g][:2] == e[:2] and shown.startswith(pre) and shown.endswith(tail) and (g != 'weather' or f'({lab("nat")})' in shown), (got[g], e), what[g])
    # VFR: no due date: counted done; the line says « sans échéance » and the date of the file (unless the publication of the rows asks for something)
    vfr = got['vfr']
    c.ok(vfr is not None and vfr[1] == '' and (vfr[0] == 'todo' or D5('dsNa') in norm(vfr[2]) and on('2026-10-20') in norm(vfr[2])), vfr, 'VFR points: « sans échéance · le 20/10 » (n/a counts as done), unless the publication of its rows has something to do')
    # the header: the base sources plus one per other set; n/a and up to date count as done
    head = norm(c.text('[data-todo-head]'))
    nb = re.search(r'(\d+)\D+(\d+)\D*$', head)
    c.ok(nb and int(nb.group(2)) == 9 + 6 and int(nb.group(1)) == 5 + 3, head, 'the header counts the nine sources of the base plus the six other sets, and as done the five sources and the three sets that are up to date or without a due date: 8 on 15')
    exp_head = CW('todoHead').replace('{c}', '2611').replace('{n}', '8').replace('{m}', '15')
    c.eq(head, exp_head, 'the header sentence: « Cycle AIRAC 2611 · 8 faits sur 15 »', what='header')
    c.eq([c.attr('[data-cycle-bar]', 'aria-valuenow'), c.attr('[data-cycle-bar]', 'aria-valuemax')], ['8', '15'], 'the progress bar says the same count', what='bar')
    c.check_errors()


@case('L117', 'Données: what the launcher says in base/cycle.datasets is untrusted — a state out of the closed list drops the row, a reason outside the list is not shown, labels are bounded and escaped, and a launcher without `datasets` keeps the count of the base alone (SOG-0262 lot D5)',
      'L', tags=('data',), langs4=False, designs=('standard',), screens=True, night=False,
      rule='frame/aerodb/INTEGRATION.md « base/cycle.datasets »; the page parses defensively (model_countries.js datasetsOf): closed list of states and reasons, bounded strings, esc()')
def l117(c):
    evil = [{'id': 'procedures', 'label': ['<img src=x onerror=window.__pwn=1>' + 'x' * 400, 'P', 'P', 'P'], 'state': 'todo', 'why': '<b>nope</b>', 'at': '2026-10-05T10:00:00Z'},
            {'id': 'weather', 'label': ['W'] * 4, 'state': 'exploded', 'why': 'absent', 'at': None},
            {'id': 'nat', 'label': ['N'] * 4, 'state': 'up-to-date', 'why': 'expired', 'at': 'not a date'},
            {'id': '../evil', 'label': ['E'] * 4, 'state': 'todo'}, 'string', None, {'id': 'vfr', 'state': 'n/a', 'at': None, 'label': 'nope', 'counts': {'aerodromes': '9<script>'}}]
    _l102_open(c, wrap=_l116_wrap(evil))
    c.until("!!document.querySelector('[data-body] > details.f-group[data-group=proc] .d-fstate')", timeout=8000, what='the folded line of the procedures')
    proc = c.js("(e => [e.dataset.foldState, e.dataset.foldWhy || '', e.textContent.length, e.innerHTML.includes('<img')])(document.querySelector('[data-body] > details.f-group[data-group=proc] .d-fstate'))")
    c.eq(proc[:2] + [proc[3]], ['todo', '', False], 'a reason outside the closed list is not shown as one (« à faire » alone), the word is plain text', what='proc line')
    c.ok(proc[2] < 80, proc, 'the line stays short')
    c.eq(c.js("window.__pwn === undefined && !document.querySelector('[data-body] img[src=x]')"), True, 'nothing a launcher sends runs or becomes markup', what='no pwn')
    weather = c.js("document.querySelector('[data-body] > details.f-group[data-group=weather] .d-fstate')?.dataset.foldState || null")
    c.ok(weather in (None, 'ok', 'todo', 'unknown'), weather, 'a set whose state is out of the list is dropped (the line is the one of the rows, or none)')
    head = norm(c.text('[data-todo-head]'))
    nb = re.search(r'(\d+)\D+(\d+)\D*$', head)
    # kept rows: procedures (todo), nat (up-to-date; its reason is dropped), vfr (n/a): 3 sets; weather, the odd ids and the non-objects are dropped
    c.ok(nb and int(nb.group(2)) == 9 + 3 and int(nb.group(1)) == 5 + 2, head, 'only the three readable sets are counted: 9 + 3 on the total, 5 + 2 done')
    c.check_errors()


@case('L118', 'Données: « Quand ça change » says the French aircraft registry the launcher keeps (base/cycle.local `registry_fr`, SOG-0270 / K203): its name in the language of the screen, the date of the file, no button (SOG-0262 lot D5)',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=True, night=False,
      rule='frame/aerodb/INTEGRATION.md « base/cycle.local » (K203): { id: registry_fr, label[4], at, personal, zoneCount: 0 } when data/local/registry/fr_immat.json exists; one more line under « Quand ça change », a gesture only when a verb exists (none today)')
def l118(c):
    lang = c.lang
    li = {'fr': 0, 'en': 1, 'de': 2, 'es': 3}[lang]
    reg = {'id': 'registry_fr', 'label': ['Registre français des immatriculations (DGAC)', 'French aircraft registry (DGAC)', 'Französisches Luftfahrzeugregister (DGAC)', 'Registro francés de matrículas (DGAC)'],
           'at': '2026-10-05T10:00:00Z', 'personal': '', 'zoneCount': 0}
    _l102_open(c, wrap=_l116_wrap(None, [reg]))
    c.js("document.querySelector('[data-lc-fold=change]').open = true")
    c.until("!!document.querySelector('[data-change=registry_fr]')", timeout=8000, what='the line of the registry')
    row = c.js("(e => [e.querySelector('b').textContent.trim(), e.querySelector('[data-change-last]').textContent.trim(), e.querySelectorAll('button').length, e.hasAttribute('data-change-extra')])(document.querySelector('[data-change=registry_fr]'))")
    c.eq(row[0], reg['label'][li], 'the name of the registry, in the language of the screen (the launcher says it)', what='label')
    day = c.js(f"import('/modules/data/model.js').then(M => M.dateText('2026-10-05', '{lang}'))")
    c.ok(day and norm(day) in norm(row[1]), (day, row), 'the date of the file is said (the 5th of October, written as everywhere on the screen)')
    c.eq(row[2], 0, 'no button: no verb takes the registry again', what='no button')
    c.eq(c.count('[data-change-list] [data-change=registry_fr]'), 1, 'one line, in the list « Quand ça change »', what='one line')
    c.check_errors()


# the dark capture: the top of the screen in the night tone, no colour written in the new rules, readable text
_L112_JS = r"""() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1; const g = cv.getContext('2d', { willReadFrequently: true });
  const rgba = col => { g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillStyle = col; g.fillRect(0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255] };
  const bgOf = el => { const layers = []; for (let n = el; n; n = n.parentElement) { const c = rgba(getComputedStyle(n).backgroundColor); if (c[3] > 0) layers.push(c); if (c[3] >= 0.999) break }
    let base = layers.length && layers[layers.length - 1][3] >= 0.999 ? layers.pop().slice(0, 3) : rgba(getComputedStyle(document.body).backgroundColor).slice(0, 3);
    for (const c of layers.reverse()) base = base.map((v, i) => v * (1 - c[3]) + c[i] * c[3]); return base };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]) };
  const ratio = el => { const fg = rgba(getComputedStyle(el).color), bg = bgOf(el), mix = fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3])), a = lum(mix), b = lum(bg); return Math.round((Math.max(a, b) + .05) / (Math.min(a, b) + .05) * 100) / 100 };
  const q = s => document.querySelector(s);
  return Object.fromEntries(Object.entries(SELS).map(([k, s]) => [k, q(s) ? ratio(q(s)) : null]));
}"""


def _tall_shot(c, name, sel, height, align='start'):
    """A capture of `sel` seen whole: the window is made `height` px tall for the shot (the screen scrolls inside the window), the element is brought to the top, the window is given back."""
    size = c.page.viewport_size
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.page.set_viewport_size({'width': size['width'], 'height': height})
    c.wait(500)
    c.js(f"document.querySelector('{sel}').scrollIntoView({{block: '{align}'}})")
    if align == 'start':   # under the header of the frame
        c.js("window.scrollBy(0, -70); document.querySelectorAll('*').forEach(e => { if (e.scrollTop > 0 && e.scrollHeight > e.clientHeight) e.scrollTop = Math.max(0, e.scrollTop - 70); })")
    c.wait(500)
    c.shot(name)
    c.page.set_viewport_size(size)
    c.wait(300)


def _l120_tpl(template, **given):
    """A regex for a text of texts.js with `{x}` holes: the given values are literal, the other holes match any short text (a date written by the page)."""
    t = norm(template)
    for k, v in given.items():
        t = t.replace('{' + k + '}', v)
    return '.{1,60}?'.join(re.escape(p) for p in re.split(r'\{\w+\}', t))


@case('L120', 'Données: « n faits sur m » and « À faire ce mois-ci » count THE SAME THING — a set the launcher says `todo` (base/cycle.datasets) is a LINE of the block with its gesture and its reason in words, a set `n/a` has no line, a set `up-to-date` is among the done ones (SOG-0262, K207)',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=True, night=False,
      rule='the header counted the base sources plus every set the launcher lists (M.cycleCount) but the block listed only the sources: « 8 faits sur 15 » with a block that shows 4 lines. Now m minus the lines of the block = n: each `todo` set (procedures older than the cycle, expired NAT tracks, absent sheets) is a line with the gesture the screen already has for it (« Relire les procédures », « Reprendre les routes NAT », « Publier les fiches ») and its reason (« plus ancien que le cycle · cycle 2610 », « routes NAT périmées depuis le … », « absent »); `n/a` (vfr, aircraft: « exists, no due date ») counts as done in the header and has no line; `up-to-date` (the weather) is in « Déjà faits ». A button the gate greys says why next to it. The folded line of a set says its useful date and counts (procedures: cycle and aerodromes read, in the locale of the language).')
def l120(c):
    lang = c.lang
    _l102_open(c, wrap=_l116_wrap(_L116_DATASETS))
    c.until("!!document.querySelector('[data-todo-list] [data-todo-dataset]')", timeout=8000, what='the sets to do are lines of the block')
    c.js("document.querySelector('[data-todo]').open = true")
    D6 = lambda k: norm(_trow(k, lang, after='  d6: {'))
    D5 = lambda k: norm(_trow(k, lang, after='  d5: {'))
    head = norm(c.text('[data-todo-head]'))
    nb = re.search(r'(\d+)\D+(\d+)\D*$', head)
    n, m = int(nb.group(1)), int(nb.group(2))
    lines = c.count('[data-todo-list] > li')
    c.eq([n, m, m - lines], [8, 15, 8], f'the header says {n} done on {m}: the block has {lines} lines to do, and m minus the lines is n (the four sources and the three sets)', what='same count')
    c.ok(re.search(rf'\b{lines}\b', norm(c.text('[data-todo-marker]'))) is not None, c.text('[data-todo-marker]'), 'the marker of the block says the same number of lines')
    c.eq(c.js("[...document.querySelectorAll('[data-todo-list] [data-todo-dataset]')].map(e => e.dataset.todoDataset)"), ['procedures', 'nat', 'sheets'], 'the sets to do are the lines of the block, after the sources', what='ids')
    # the gesture of each: the one the screen already has; a greyed button says why beside it
    for i, k in (('procedures', 'actProc'), ('nat', 'actNat'), ('sheets', 'actSheets')):
        b = c.js(f"(e => e ? [e.textContent.trim(), e.dataset.todoAct, e.disabled] : null)(document.querySelector('[data-todo-dataset={i}] [data-todo-act=ds]'))")
        c.ok(b is not None and norm(b[0]) == D6(k) and b[1] == 'ds', b, f'{i}: the line carries its gesture « {D6(k)} »')
        c.ok(not b[2] or c.count(f'[data-todo-dataset={i}] [data-grey]') == 1, b, f'{i}: a greyed gesture says why beside it')
    # the reason in words
    why = lambda i: norm(c.text(f'[data-todo-dataset={i}] [data-ds-why]'))
    c.ok(why('procedures').startswith(D5('dsWhyOlder')) and D6('procCycle').replace('{c}', '2610') in why('procedures'), why('procedures'), 'procedures: « plus ancien que le cycle · cycle 2610 · … » (the reason, then the cycle read)')
    c.ok(re.fullmatch(_l120_tpl(_trow('natExpired', lang, after='  d6: {')), why('nat')) is not None, why('nat'), 'NAT tracks: « routes NAT périmées depuis le … » (the date of the end, written by the page)')
    c.eq(why('sheets'), D5('dsWhyAbsent'), 'sheets: « absent »', what='sheets')
    # n/a: no line anywhere in the block; up to date: among the done
    c.eq([c.count('[data-todo] [data-todo-dataset=vfr]'), c.count('[data-todo] [data-todo-dataset=aircraft]')], [0, 0], 'a set « without due date » has no line (it counts as done in the header only)', what='n/a')
    c.js("document.querySelector('[data-todo-done]').open = true")
    c.eq(c.count('[data-todo-done] [data-todo-dataset=weather]'), 1, 'the weather, up to date, is among the done ones', what='done')
    dn = re.findall(r'\d+', norm(c.text('[data-todo-done] summary')))
    c.eq(int(dn[-1]), c.count('[data-todo-done] > ul > li'), 'and « Déjà faits (n) » counts the lines it shows', what='done count')
    # the folded line of the procedures says its cycle and the aerodromes read, in the locale of the language
    num = lambda v: c.js(f"({v}).toLocaleString('{lang}')")
    proc = norm(c.text('[data-body] > details.f-group[data-group=proc] .d-fstate'))
    unit = lambda r: norm(_trow('aerodrome', lang, after='  unit: {', row=r))
    want = f"{D6('procCycle').replace('{c}', '2610')} · {norm(num(1200))} {unit(1)} CIFP · {norm(num(30))} {unit(1)} eAIP"
    c.ok(want in proc, (proc, want), 'the folded line of the procedures says « cycle 2610 · 1 200 terrains CIFP · 30 terrains eAIP » (numbers formatted for the language)')
    wx = norm(c.text('[data-body] > details.f-group[data-group=weather] .d-fstate'))
    c.ok(re.search(_l120_tpl(_trow('natExpired', lang, after='  d6: {')), wx) is not None, wx, 'the weather fold names the expired NAT tracks and the date they ended')
    # ONE fold sign, the chevron on the LEFT: the right-hand triangle of the folds (the block, the sets, the blocks under the packs) is gone; the packs carry their chevron on the left too
    c.eq(c.js("[...document.querySelectorAll('details > summary > .d-chev')].every(e => getComputedStyle(e).display === 'none') && document.querySelectorAll('details > summary > .d-chev').length > 4"), True, 'the folds (the block, the other sets, the blocks under the packs) show only the chevron on the left, the one of the frame', what='one sign')
    c.eq(c.js("[...document.querySelectorAll('details > summary')].every(s => getComputedStyle(s, '::before').content !== 'none')"), True, 'which is drawn for each of them', what='left chevron')
    c.eq(c.js("(h => !!h && h.querySelector('.d-chev').getBoundingClientRect().left < h.querySelector('b').getBoundingClientRect().left)(document.querySelector('.d-gh'))"), True, 'a pack has its chevron on the left of its name, not a triangle on the right', what='pack chevron')
    # the greyed « Relire les procédures » says where to tick: its reason is a link that opens the Procédures fold and focuses its first State
    c.eq(norm(c.text('[data-todo-dataset=procedures] [data-act=focus-states]')), norm(_trow('no-state', lang, after='  greyReason: {')), 'the reason of the greyed gesture is a LINK (« Cochez au moins un État »)', what='link')
    c.tap('[data-todo-dataset=procedures] [data-act=focus-states]')
    c.until("document.querySelector('details.f-group[data-group=proc]').open && document.activeElement && document.activeElement.matches('input[data-item]')", timeout=4000, what='the Procédures fold opens and its first State has the focus')
    c.js("document.querySelector('details.f-group[data-group=proc]').open = false")
    # the capture: the block unfolded (the sources and the sets to do, with their gestures and reasons)
    c.js("document.querySelector('[data-todo-done]').open = false; document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    _tall_shot(c, f'L120_{c.width}_{lang}_todo.png', '[data-todo]', 1350 if c.width > 800 else 1900)
    c.check_errors()


@case('L121', 'Données: the folded line of a set that is up to date says its useful date in words — « routes NAT valides jusqu’au … » (validUntil), « prévision du … » (the weather run), « cycle 2611 · 3 069 terrains » (the procedures) — with the numbers in the locale of the language (SOG-0262, K207)',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=True, night=False,
      rule='the folded line said « à jour · le 05/10 » (the date of the file): the useful date was read (base/cycle.datasets validUntil, run, cycle, counts) and not shown. Now the line says it, from the launcher\'s own fields only, bounded; a set that has none of these keeps the date of its file.')
def l121(c):
    lang = c.lang
    ok = [_l116_ds('procedures', 'up-to-date', None, '2026-10-30T10:00:00Z', cycle='2026-10-29', counts={'cifp': 3069, 'eaip': 0}),
          _l116_ds('weather', 'up-to-date', None, '2026-11-12T06:30:00Z', run='2026-11-12T06:00Z'),
          _l116_ds('nat', 'up-to-date', None, '2026-11-12T08:00:00Z', validUntil='2026-11-13T19:00:00Z'),
          _l116_ds('vfr', 'n/a', None, '2026-10-20T08:00:00Z', counts={'aerodromes': 400}),
          _l116_ds('aircraft', 'n/a', None, '2026-09-30T08:00:00Z'),
          _l116_ds('sheets', 'n/a', None, None)]
    _l102_open(c, wrap=_l116_wrap(ok))
    c.until("!!document.querySelector('[data-body] > details.f-group[data-group=proc] .d-fstate')", timeout=8000, what='the folded lines')
    D6 = lambda k: _trow(k, lang, after='  d6: {')
    num = c.js(f"(3069).toLocaleString('{lang}')")
    unit = norm(_trow('aerodrome', lang, after='  unit: {', row=1))
    line = lambda g: norm(c.text(f'[data-body] > details.f-group[data-group={g}] .d-fstate'))
    c.ok(f"{norm(D6('procCycle')).replace('{c}', '2611')} · {norm(num)} {unit}" in line('proc'), line('proc'), 'procedures: « cycle 2611 · 3 069 terrains » (a count at 0 is not said, the number is written for the language)')
    wx = line('weather')
    c.ok(re.search(_l120_tpl(D6('run')), wx) is not None and re.search(_l120_tpl(D6('natValid')), wx) is not None, wx, 'weather: « prévision du … » and, for the NAT tracks of the same fold, « routes NAT valides jusqu’au … »')
    c.ok('06:00Z' in wx and '19:00Z' in wx, wx, 'both with the hour in UTC, as the rest of the screen writes it')
    c.ok(norm(_trow('dsNa', lang, after='  d5: {')) in line('vfr') or line('vfr').startswith(norm(_trow('stTodo', lang, after='  d4: {')).split('{n}')[0]), line('vfr'), 'a set that gives no useful date keeps its own word and the date of its file')
    # the capture: the other sets, folded, each with its useful date
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    _tall_shot(c, f'L121_{c.width}_{lang}_folds.png', '[data-body] > details.f-group[data-group=proc]', 600 if c.width > 800 else 700)
    c.check_errors()


@case('L122', 'Données: a hostile zone id (`a"]b`) in what the launcher says — the state of the countries, the list of the cycle, the view of a country — throws no selector error and does not break the sheet (selectors built from a zone id are escaped; Sécurisation audit)',
      'L', tags=('data',), langs4=False, designs=('standard',), screens=False, night=False,
      rule='every selector the module builds from a zone id passes it through CSS.escape (selectorOf, hoverZone, highlightZones, the progress line of an upload) and the ids a launcher says are first bounded by the model; a hostile id is dropped or inert, the sheet of a real country still opens and nothing in the console fails')
def l122(c):
    bad = 'a"]b'
    world = {'sia_seen': False}
    st, _x4 = _l89_open(c, world)
    inner = _l89_cycle(world)

    def hostile(args):
        res = inner(args)
        for it in res['items']:
            it['zones'] = [*it.get('zones', []), bad]
        zv = res.get('zoneView')
        if zv:
            for s in zv['sources']:
                s['zones'] = [*s.get('zones', []), bad]
            zv['zone'] = args.get('zone')
        res['unread'] = [*res.get('unread', []), {'id': bad, 'files': [bad], 'reason': 'no-reader', 'note': bad}]
        return res
    world['zs'][bad] = _zst('stale')
    st['cycle'] = hostile
    st['status'] = lambda args: _status(world['zs'])
    c.js("document.querySelector('[data-act=sheet-close]')?.click()")
    _l89_sheet(c, 'fr')
    c.eq(c.count('[data-sheet=fr] [data-sheet-source]') > 0, True, 'the sheet of France opens with its sources although the launcher mentions a hostile id', what='sheet')
    n = c.js("[...document.querySelectorAll('[data-zone]')].filter(e => e.dataset.zone === 'a\"]b').length")
    c.eq([n, c.count('[data-hz]') > 0], [0, True], 'no element carries the hostile id as a zone (the model drops it): the map and the sheet are intact', what='inert')
    c.check_errors()


@case('L112', 'Données: in the night tone the top of the screen is readable and no colour is written in the new rules (SOG-0262 lot D4, item 7) — the cycle title, the one-line head, the counters, the button sentence, the map legend, the folded lines with their state words, the country sheet name and its cells all keep a readable contrast (computed), and the style of the module holds only tokens of the frame',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=True, night=False, tone='night',
      rule='SOG-0262 D4 item 7 (a capture of the top of the screen in a dark design; the lots D1 to D3 had been drawn day only): colours come from the --sog-* tokens, mixed with color-mix in the module; no #hex, rgb() or hsl() in the rules')
def l112(c):
    # no colour written in the rules of the module (the tokens of the frame only)
    bad = []
    for f in ('screen.js', 'countries.js', 'todo.js', 'later.js', 'select.js'):
        src = (ROOT / 'modules/data' / f).read_text(encoding='utf-8')
        for m in re.finditer(r'\[data-module="data"\][^{}`]*\{([^{}]*)\}', src):
            for col in re.findall(r'#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(', m.group(1)):
                bad.append((f, m.group(0)[:60], col))
    c.eq(bad, [], 'no #hex, rgb() or hsl() colour in the CSS of the module: only var(--sog-*) tokens (and color-mix of them)', what='hard-coded colours')
    _l102_open(c)
    c.eq(c.js("document.documentElement.dataset.tone || ''"), c.tone, 'the page is in the tone of the run (night at 1280 and 390 in French; the other languages are day runs, the contrast is measured all the same)', what='tone')
    c.ok(c.tone == 'night' or c.lang != 'fr', c.tone, 'the French runs are night runs')
    c.tap('[data-group-id=europe-south] [data-act=grp-toggle]')
    c.tap('[data-group-body] [data-zone=pt]')
    c.until("!!document.querySelector('[data-sheet=pt] [data-sheet-source]')", timeout=10000, what='the sheet of Portugal')
    c.until("!document.querySelector('[data-sheet=pt] [data-inventory-state=loading]')", timeout=8000, what='the view of Portugal is read')
    c.wait(300)
    sels = {'title': '[data-cycle-title]', 'head': '[data-data-head] .d-headline > b', 'counters': '[data-state-sentence] [data-filter]', 'plan': '[data-update-plan]', 'legend': '.d-lgl .d-lgi', 'foldTitle': 'details.d-fold > summary > span:first-child',
            'todo': '[data-todo] > summary > span', 'groupTitle': '.d-gtitle b', 'sheetName': '[data-sheet-name]', 'cellWord': '[data-sheet] .d-cells > li .d-tkw', 'cellLabel': '[data-sheet] .d-cells > li > b', 'note': '[data-sheet] [data-cell-note]',
            'sheetSub': '[data-sheet-sub]', 'sourceName': '[data-sheet] .d-src h4'}
    r = c.js(_L112_JS.replace('SELS', json.dumps(sels)))
    c.ok(all(v is None or v >= 3 for v in r.values()), r, 'every text measured keeps a contrast of at least 3:1 in the night tone (the muted ones)')
    strong = ('title', 'head', 'foldTitle', 'groupTitle', 'sheetName', 'sourceName', 'todo')
    c.ok(all(r[k] is not None and r[k] >= 4.5 for k in strong), {k: r[k] for k in strong}, 'and 4.5:1 for the titles and names')
    if c.width in (390, 1280) and c.lang == 'fr':
        c.js("document.querySelector('[data-cycle-title]').scrollIntoView({ block: 'start', behavior: 'instant' }); window.scrollBy(0, -64)")
        c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
        c.wait(150)
        c.shot(f'L112_{c.width}_night_top.png')
        c.js("[...document.querySelectorAll('[data-sheet] [data-act=sheet-close]')].find(b => b.offsetParent)?.click(); window.scrollTo(0, 0)")
        c.wait(200)
        c.page.screenshot(path=str(ROOT / 'tests/v3/shots' / f'L112_{c.width}_night_full.png'), full_page=True)
    c.check_errors()


# multi-selection on the map (the gesture lost with L38 / L39 at lot A, restored with the banner of lot D4)
_L113_XY = """([lon, lat]) => { const svg = document.querySelector('[data-wmap]'), m = svg.getScreenCTM(), my = la => Math.log(Math.tan(Math.PI / 4 + Math.max(-58, Math.min(84, la)) * Math.PI / 360)) * 180 / Math.PI;
  const p = new DOMPoint(lon, -my(lat)).matrixTransform(m); return [p.x, p.y] }"""


def _l113_open(c):
    """The capture screen of lot D2 (real outlines, 26 countries in the coverage), the map at its coverage frame scrolled to the middle of the window; `us` is outside the coverage."""
    st = _l102_open(c)
    c.js("document.querySelector('[data-wmap]').scrollIntoView({ block: 'center', behavior: 'instant' })")
    c.wait(300)
    return st


def _l113_xy(c, lon, lat):
    return c.js(_L113_XY, [lon, lat])


_L113_SEL = "[...document.querySelectorAll('[data-wmap] path[data-sel]')].map(p => p.dataset.zone).sort()"


@case('L113', 'Données: several countries can be picked on the map again (SOG-0262 lot D4, item 8; ports L38 / L39 of lot A) — Shift + click picks a country, Shift + drag a rectangle picks the countries it touches (the count is said before the release), the banner under the map offers « Ajouter à ma couverture (n) » and « Mettre à jour (n) » and « Annuler », a plain click always opens the sheet, the selection empties after the gesture, on « Annuler » and on Escape, a picked country has a thick dashed outline',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=True, phone=False, night=False,
      rule='SOG-0262 D4 item 8 (the user\'s gesture, lost at lot A: « sélectionner plusieurs pays d\'un coup »); picks are never written: adding writes the coverage of the workstation (addZones), updating is the ordinary verb on the covered countries; a plain click is never taken for a pick')
def l113(c):
    lang = c.lang
    D4 = lambda k: _D4(k, lang)
    st = _l113_open(c)
    c.tap('[data-act=world-toggle]')   # the whole world: every country is on the map
    c.until("document.querySelector('[data-wmap]').getAttribute('viewBox') === document.querySelector('[data-wmap]').getAttribute('data-world')", timeout=4000, what='the world is framed')
    c.eq(c.count('[data-sel-bar]'), 0, 'no banner while nothing is picked', what='no banner')
    pt, fr, us = _l113_xy(c, -8, 39.5), _l113_xy(c, 2.5, 47), _l113_xy(c, -98, 39)
    at = lambda xy: c.js("([x, y]) => (p => p ? p.dataset.zone : null)(document.elementFromPoint(x, y)?.closest('path[data-zone]'))", xy)
    c.eq([at(pt), at(fr), at(us)], ['pt', 'fr', 'us'], 'the points aimed at are Portugal, France and the United States', what='aim')
    # ---- a plain click opens the sheet, picks nothing
    c.page.mouse.click(*pt)
    c.until("!!document.querySelector('[data-sheet=pt]')", timeout=8000, what='a plain click opens the sheet')
    c.eq([c.js(_L113_SEL), c.count('[data-sel-bar]')], [[], 0], 'a plain click picks nothing', what='plain click')
    # ---- Shift + click picks
    for xy in (pt, fr, us):
        c.page.keyboard.down('Shift')
        c.page.mouse.click(*xy)
        c.page.keyboard.up('Shift')
        c.wait(120)
    c.eq(c.js(_L113_SEL), ['fr', 'pt', 'us'], 'Shift + click picks three countries: the blue outline of the open group on each (L124)', what='picked')
    c.ok(c.js("(p => getComputedStyle(p).strokeDasharray === 'none' && parseFloat(getComputedStyle(p).strokeWidth) >= 2.5)(document.querySelector('[data-wmap] path[data-sel]'))"), 'solid', 'the mark is a thick solid outline')
    c.eq(c.js("document.querySelector('[data-sheet]')?.dataset.sheet || null"), 'pt', 'the sheet that was open stays open', what='sheet stays')
    c.eq(norm(c.text('[data-sel-bar] [data-sel-line] b')), norm(_unit_count('country', 3, lang)), 'the banner says how many are picked', what='banner count')
    c.eq(norm(c.text('[data-sel-bar] [data-act=sel-add]')), D4('selAdd').replace('{n}', '1'), '« Ajouter à ma couverture (1) » for the one outside the coverage (the United States)', what='add button')
    c.eq(norm(c.text('[data-sel-bar] [data-act=sel-update]')), D4('selUpdate').replace('{n}', '2'), '« Mettre à jour (2) » for the two covered (Portugal, France)', what='update button')
    c.ok(c.count('[data-sel-bar] [data-sel-plan=add]') == 1 and c.count('[data-sel-bar] [data-sel-plan=update]') == 1, 'plan lines', 'each gesture says what it does')
    # ---- Shift + click again unpicks; Escape empties
    c.page.keyboard.down('Shift')
    c.page.mouse.click(*us)
    c.page.keyboard.up('Shift')
    c.wait(150)
    c.eq([c.js(_L113_SEL), c.count('[data-act=sel-add]')], [['fr', 'pt'], 0], 'a second Shift + click on a picked country unpicks it; with no country outside the coverage there is no « Ajouter »', what='unpick')
    c.page.keyboard.press('Escape')
    c.until("document.querySelectorAll('[data-wmap] path[data-sel]').length === 0", timeout=3000, what='Escape empties the selection')
    c.eq(c.js("document.querySelector('[data-sheet]')?.dataset.sheet || null"), 'pt', 'the first Escape empties the selection, the sheet stays', what='escape first')
    # ---- Shift + drag: a rectangle on Iberia (Portugal, Spain and France\'s south touch it, nothing else); the count is said before the release
    x0, y0 = _l113_xy(c, -12, 36.2)
    x1, y1 = _l113_xy(c, -2.2, 43.9)
    c.page.keyboard.down('Shift')
    c.page.mouse.move(x0, y1)
    c.page.mouse.down()
    c.page.mouse.move(x1, y0, steps=6)
    c.until("!!document.querySelector('[data-rect]:not([hidden])')", timeout=4000, what='the rectangle is drawn')
    for _ in range(20):
        txt = norm(c.text('[data-rect-count]'))
        if txt and not txt.startswith('0 '):
            break
        c.wait(100)
    live = norm(c.text('[data-rect-count]'))
    c.eq(c.js(_L113_SEL), [], 'nothing is picked before the release', what='before release')
    c.page.mouse.up()
    c.page.keyboard.up('Shift')
    c.until("document.querySelectorAll('[data-wmap] path[data-sel]').length >= 2", timeout=4000, what='the countries are picked at the release')
    got = c.js(_L113_SEL)
    c.ok({'pt', 'es'} <= set(got) and not ({'gb', 'de', 'it', 'se', 'us'} & set(got)), got, 'the rectangle picks Portugal and Spain, not the countries it does not touch')
    c.eq(live, norm(_unit_count('country', len(got), lang)), 'the count said before the release is the count picked', what='live count')
    c.eq(c.count('[data-rect]:not([hidden])'), 0, 'the rectangle is gone', what='rect gone')
    c.eq(c.js("document.querySelector('[data-sheet]')?.dataset.sheet || null"), 'pt', 'a rectangle never opens a sheet (the click that follows the drag is swallowed); the open one stays', what='drag no sheet')
    # ---- « Annuler » empties
    c.tap('[data-sel-bar] [data-act=sel-cancel]')
    c.until("document.querySelectorAll('[data-wmap] path[data-sel]').length === 0 && !document.querySelector('[data-sel-bar]')", timeout=3000, what='Annuler empties the selection and the banner goes')
    # ---- « Mettre à jour (n) » on the covered ones: the ordinary verb, then the selection is empty
    for lon, lat in ((-8, 39.5), (2.5, 47)):
        c.js("document.querySelector('[data-wmap]').scrollIntoView({ block: 'center', behavior: 'instant' })")
        c.page.keyboard.down('Shift')
        c.page.mouse.click(*_l113_xy(c, lon, lat))
        c.page.keyboard.up('Shift')
        c.wait(120)
    n0 = len(st['posts'])
    c.tap('[data-sel-bar] [data-act=sel-update]')
    c.until("document.querySelectorAll('[data-wmap] path[data-sel]').length === 0", timeout=6000, what='the gesture is taken: the selection empties')
    for _ in range(40):
        if any(p['verb'] in ('status', 'fetch', 'build') for p in st['posts'][n0:]):
            break
        c.wait(150)
    zs = [sorted((p['args'] or {}).get('zones', [])) for p in st['posts'][n0:] if p['verb'] in ('status', 'fetch', 'build')]
    c.ok(zs and all(set(z) <= {'pt', 'fr'} for z in zs), zs, '« Mettre à jour » reads the state of the picked covered countries only (the ordinary update path)')
    if c.count('.f-modal [data-no]'):
        c.tap('.f-modal [data-no]')
    # ---- « Ajouter à ma couverture (n) » writes the coverage of the workstation
    c.js("document.querySelector('[data-wmap]').scrollIntoView({ block: 'center', behavior: 'instant' })")
    c.page.keyboard.down('Shift')
    c.page.mouse.click(*_l113_xy(c, -98, 39))
    c.page.keyboard.up('Shift')
    c.until("!!document.querySelector('[data-act=sel-add]')", timeout=3000, what='the banner offers to add the United States')
    c.tap('[data-sel-bar] [data-act=sel-add]')
    c.wait(600)
    c.ok(c.js("(async () => (await import('/modules/data/state.js')).S.d.cov.ids.includes('us'))()"), c.js("(async () => { const S = (await import('/modules/data/state.js')).S; return [S.d.cov.ids.length, [...S.cw.sel], !!S.run, !!S.chain, !!S.zop] })()"), 'the coverage of the workstation now holds the United States')
    doc = c.until_doc('cache/data/coverage.json', lambda d: bool(d and 'us' in (d.get('zones') or [])), what='and it is written (cache/data/coverage.json)')
    c.eq([c.js(_L113_SEL), c.count('[data-sel-bar]')], [[], 0], 'the selection is empty after the gesture', what='after add')
    if c.width == 1280 and c.lang == 'fr':
        c.page.keyboard.down('Shift')
        c.page.mouse.click(*pt)
        c.page.mouse.click(*fr)
        c.page.keyboard.up('Shift')
        c.wait(200)
        c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
        c.shot('L113_1280_fr_banner.png')
    c.check_errors()


@case('L114', 'Données: on a phone the rectangle is TWO FINGERS HELD HALF A SECOND on the map, and the D2 touch rule is kept (SOG-0262 lot D4, item 8) — one finger scrolls the page and picks nothing, two fingers that move at once pinch the map, two fingers held still draw the rectangle between them with its count before the lift; a tap opens the sheet',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=False, phone=True, night=False,
      rule='SOG-0262 D4 item 8 + D2 (« un doigt fait défiler, deux doigts déplacent et pincent la carte »): the hold (500 ms, 14 px of slop) is the only way to a rectangle by touch; a pinch that starts moving before the half second is a pinch')
def l114(c):
    lang = c.lang
    st = _l113_open(c)
    c.tap('[data-act=world-toggle]')
    c.until("document.querySelector('[data-wmap]').getAttribute('viewBox') === document.querySelector('[data-wmap]').getAttribute('data-world')", timeout=4000, what='the world is framed')
    x0, y0 = _l113_xy(c, -12, 36.2)
    x1, y1 = _l113_xy(c, -2.2, 43.9)
    ev = lambda kind, pid, x, y: c.js("([k, id, x, y]) => document.querySelector('[data-wmap]').dispatchEvent(new PointerEvent('pointer' + k, { bubbles: true, cancelable: true, pointerType: 'touch', pointerId: id, isPrimary: id === 1, clientX: x, clientY: y, button: 0, buttons: k === 'up' ? 0 : 1 }))", [kind, pid, x, y])
    # one finger: no rectangle, nothing picked, the map does not move
    v0 = c.js("document.querySelector('[data-wmap]').getAttribute('viewBox')")
    ev('down', 1, x0, y0)
    c.wait(700)
    ev('move', 1, x0, y0 + 60)
    ev('up', 1, x0, y0 + 60)
    c.eq([c.count('[data-rect]:not([hidden])'), c.js(_L113_SEL), c.js("document.querySelector('[data-wmap]').getAttribute('viewBox')")], [0, [], v0], 'one finger held and moved: no rectangle, nothing picked, the map does not move (the page scrolls)', what='one finger')
    # a pinch: the fingers move before the half second
    ev('down', 1, x0, y0)
    ev('down', 2, x1, y1)
    ev('move', 1, x0 - 40, y0)
    c.wait(700)
    c.eq([c.count('[data-rect]:not([hidden])'), c.js(_L113_SEL)], [0, []], 'two fingers that move at once are a pinch: no rectangle', what='pinch')
    ev('up', 1, x0 - 40, y0)
    ev('up', 2, x1, y1)
    # the hold: two fingers still for half a second (the pinch above moved the map: the points are taken again)
    c.tap('[data-act=world-toggle]')
    c.wait(300)
    x0, y0 = _l113_xy(c, -12, 36.2)
    x1, y1 = _l113_xy(c, -2.2, 43.9)
    ev('down', 1, x0, y0)
    ev('down', 2, x1, y1)
    c.until("!!document.querySelector('[data-rect]:not([hidden])')", timeout=3000, what='the rectangle after the hold')
    live = norm(c.text('[data-rect-count]'))
    c.ok(live and not live.startswith('0 '), live, 'the count is said while the fingers are down')
    c.eq(c.js(_L113_SEL), [], 'nothing picked before the lift', what='before lift')
    if c.width == 390 and c.lang == 'fr':
        c.shot('L114_390_fr_rect.png')
    ev('up', 2, x1, y1)
    c.wait(800)
    got = c.js(_L113_SEL)
    c.ok({'pt', 'es'} <= set(got) and not ({'gb', 'de', 'it', 'se', 'us'} & set(got)), (got, live), 'the countries the rectangle touches are picked at the lift')
    ev('up', 1, x0, y0)
    c.eq(c.count('[data-sel-bar]'), 1, 'the banner offers the gesture', what='banner')
    c.tap('[data-sel-bar] [data-act=sel-cancel]')
    c.until("!document.querySelector('[data-sel-bar]')", timeout=3000, what='Annuler empties')
    # a tap on a country opens the sheet
    c.wait(600)   # the click that follows a drag is swallowed for 350 ms
    c.js("document.querySelector('[data-wmap] path[data-zone=pt]').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))")   # a tap (the path is a few pixels wide on a phone at the world frame: the click event itself)
    c.until("!!document.querySelector('[data-sheet=pt]')", timeout=8000, what='a tap opens the sheet')
    c.check_errors()


@case('L115', 'Données: the layout follows the width of the SCREEN, not the window (SOG-0262 lot D4, V3 Frame\'s rail) — the map and the sheet are two columns when the screen is wide enough (container query on the wrapper of the screen), one column with a full-screen sheet otherwise, at a window of 1050 px as at 1280',
      'L', tags=('data',), langs4=False, designs=('standard',), screens=True, phone=False, night=False,
      rule='V3 Frame rail (origin/v3 f4c475ceb): the width of the module is the window minus a bar of 210 px or a rail of 56 px; the two-column threshold (900 px) is read on the wrapper of the screen (@container), so the layout follows the rail by itself')
def l115(c):
    _l102_open(c)
    for win in (1050, 1280, 800):
        c.page.set_viewport_size({'width': win, 'height': 800})
        c.wait(400)
        if c.js("document.querySelector('[data-group-id=europe-south]').dataset.open") != 'true':
            c.tap('[data-group-id=europe-south] [data-act=grp-toggle]')
        c.tap('[data-group-body] [data-zone=pt]')
        c.until("!!document.querySelector('[data-sheet=pt] [data-sheet-source]')", timeout=10000, what='the sheet of Portugal')
        c.wait(300)
        body = c.js("document.querySelector('[data-body]').getBoundingClientRect().width")
        pos = c.js("getComputedStyle(document.querySelector('[data-sheet]')).position")
        mp, sh = _L_RECT(c, '[data-wmap]'), _L_RECT(c, '[data-sheet]')
        two = body >= 900
        c.eq(pos == 'sticky', two, f'window {win}: the screen is {round(body)} px wide, the sheet is a card at the right (sticky) exactly when the screen is 900 px or more', what=f'sticky at {win}')
        c.ok(two == (sh['l'] >= mp['r'] - 1), (win, body, mp, sh), 'and it sits at the right of the map in that case only')
        c.ok(two or (pos == 'fixed' and sh['w'] >= win - 1), (win, body, pos, sh), 'otherwise the sheet is full screen, as on a phone')
        c.js("[...document.querySelectorAll('[data-sheet] [data-act=sheet-close]')].find(b => b.offsetParent)?.click()")
        c.wait(200)
    c.check_errors()


# ------------------------------------------------------------------------------------------------------ L123 .. L125 (SOG-0285: the map of the Données screen, the user's trial of 12 Nov)
_L123_SCROLL = "() => { let t = 0; for (let n = document.querySelector('[data-wmap]'); n; n = n.parentElement) t += n.scrollTop || 0; return t + (document.scrollingElement?.scrollTop || 0) }"
_L123_VIEW = "() => document.querySelector('[data-wmap]').getAttribute('viewBox').split(' ').map(Number)"


@case('L123', 'Données: the wheel zooms the map wherever the pointer is on it, over the outline of a country included (SOG-0285) — a REAL wheel event (no Ctrl) over a country, over the sea and over the margin of the map; the page does not scroll; at the end of the zoom the wheel goes back to the page',
      'L', tags=('data',), langs4=False, designs=('standard',), screens=True, phone=False, night=False,
      rule='SOG-0285 (the user, twice: « toujours pas de molette sur les pays »): the plain wheel was taken only when the page had nothing to scroll (mapview.js pageScrolls), so on the real screen, which scrolls, it scrolled the page over every point of the map; the map takes the wheel wherever the pointer is on it, and gives it back to the page only when the zoom cannot go further')
def l123(c):
    _l113_open(c)
    c.tap('[data-act=map-home]')
    c.until("document.querySelector('[data-wmap]').getAttribute('viewBox') === document.querySelector('[data-wmap]').getAttribute('data-base')", timeout=4000, what='the framing of the coverage')
    c.eq(c.js("document.scrollingElement.scrollHeight - document.scrollingElement.clientHeight > 2"), True, 'the page has something to scroll (the real condition of the trial)', what='page scrolls')
    pt = _l113_xy(c, -8, 39.5)
    box = c.js("() => { const b = document.querySelector('[data-wmap]').getBoundingClientRect(); return [b.left, b.top, b.width, b.height] }")
    spots = {'a country': pt, 'the sea': [box[0] + box[2] * .12, box[1] + box[3] * .88], 'the margin': [box[0] + 6, box[1] + 6]}
    c.eq(c.js("([x, y]) => document.elementFromPoint(x, y)?.closest('path[data-zone]')?.dataset.zone || null", pt), 'pt', 'the first point is on the outline of Portugal', what='aim')
    for name, xy in spots.items():
        c.js("() => document.querySelector('[data-act=map-home]').click()")
        c.until("document.querySelector('[data-wmap]').getAttribute('viewBox') === document.querySelector('[data-wmap]').getAttribute('data-base')", timeout=4000, what='home')
        v0, s0 = c.js(_L123_VIEW), c.js(_L123_SCROLL)
        c.page.mouse.move(*xy)
        c.page.mouse.wheel(0, -240)
        c.wait(250)
        v1, s1 = c.js(_L123_VIEW), c.js(_L123_SCROLL)
        c.ok(v1[2] < v0[2] - 1e-6, (name, v0, v1), f'a wheel forward over {name} zooms the map in')
        c.eq(s1, s0, f'and the page did not scroll over {name}', what=f'no scroll over {name}')
    # the end of the zoom: zoomed out as far as it goes, one more wheel backwards belongs to the page
    c.page.mouse.move(*pt)
    last = None
    for _ in range(40):   # until the view stops changing: zoomed out as far as it goes
        c.page.mouse.wheel(0, 600)
        c.wait(60)
        now = c.js(_L123_VIEW)
        if now == last:
            break
        last = now
    c.js("window.scrollTo(0, 0)")
    c.js("document.querySelector('[data-wmap]').scrollIntoView({ block: 'center', behavior: 'instant' })")
    c.wait(250)
    mid = c.js("() => { const b = document.querySelector('[data-wmap]').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2] }")
    c.page.mouse.move(*mid)
    c.wait(100)
    v2, s2 = c.js(_L123_VIEW), c.js(_L123_SCROLL)
    c.page.mouse.wheel(0, 400)
    c.wait(400)
    v3, s3 = c.js(_L123_VIEW), c.js(_L123_SCROLL)
    c.ok(v3 == v2 and s3 > s2, (v2, v3, s2, s3), 'with the map zoomed out as far as it goes, the wheel scrolls the page (no trap)')
    c.check_errors()


_L124_HL = "() => [...document.querySelectorAll('[data-wmap] path[data-sel]')].map(p => p.dataset.zone).sort()"
_L124_LOOK = """(ids) => ids.map(id => { const p = document.querySelector(`[data-wmap] path[data-zone="${id}"]`), s = getComputedStyle(p), o = document.querySelector('[data-wmap] path[data-grp]') ? getComputedStyle(document.querySelector('[data-wmap] path[data-grp]')) : null;
  return { id, stroke: s.stroke, width: parseFloat(s.strokeWidth), dash: s.strokeDasharray, fill: parseFloat(s.fillOpacity), open: o ? o.stroke : null } })"""


@case('L124', 'Données: a country picked with Shift + click stays highlighted on the map, in the blue of the open group, and the banner says how many are picked (SOG-0285, the user: « le shift-clic ne surligne pas les pays »)',
      'L', tags=('data',), langs4=False, designs=('standard',), screens=True, phone=False, night=False,
      rule='SOG-0285 (regression of lot D4): a picked country wore a dark dashed outline that disappears at the scale of a world map; it wears the blue of the open group (the same colour, solid, thick) and a fuller fill, as long as it is picked')
def l124(c):
    st = _l113_open(c)
    if c.js("document.querySelector('[data-group-id=europe-south]').dataset.open") != 'true':
        c.tap('[data-group-id=europe-south] [data-act=grp-toggle]')   # a group is open, as in the user's trial
    c.tap('[data-act=world-toggle]')
    c.until("document.querySelector('[data-wmap]').getAttribute('viewBox') === document.querySelector('[data-wmap]').getAttribute('data-world')", timeout=4000, what='the world is framed')
    c.js("document.querySelector('[data-wmap]').scrollIntoView({ block: 'center', behavior: 'instant' })")
    c.wait(300)
    pt, fr = _l113_xy(c, -8, 39.5), _l113_xy(c, 2.5, 47)
    for xy in (pt, fr):
        c.page.keyboard.down('Shift')
        c.page.mouse.click(*xy)
        c.page.keyboard.up('Shift')
        c.wait(150)
    c.eq(c.js(_L124_HL), ['fr', 'pt'], 'the two countries are picked', what='picked')
    look = c.js(_L124_LOOK, ['pt', 'fr'])
    c.ok(all(l['stroke'] == l['open'] and l['width'] >= 2.5 and l['dash'] in ('none', '') for l in look) and look[0]['open'], look, 'a picked country wears the blue of the open group: the same colour, solid, at least 2.5 px')
    plain, same = c.js(_L124_LOOK, ['de', 'es'])
    c.ok(plain['stroke'] != look[0]['stroke'], (plain, look[0]), 'a country outside the open group that is not picked does not')
    c.ok(look[0]['fill'] > same['fill'], (look[0], same), 'and a picked country of the open group is fuller than one that is not picked')
    c.eq(c.count('[data-sel-bar]'), 1, 'the banner is there', what='banner')
    n = c.js("document.querySelector('[data-sel-line] b').textContent")
    c.ok(n.strip()[:1] == '2', n, 'and it says how many countries are picked (2)')
    c.page.screenshot(path=str(ROOT / 'tests/v3/shots' / 'L124_1280_picked.png'))
    c.check_errors()


@case('L125', 'Données: hovering a group of the grid outlines its perimeter on the map, without framing it; leaving the group takes the outline off; on a phone nothing changes (SOG-0285, the user: « un survol sur le périmètre serait bienvenu »)',
      'L', tags=('data',), langs4=False, designs=('standard',), screens=True, night=False,
      rule='SOG-0285: the groups of the grid carried no hover (only the old « Ajouter ou retirer » rows did); the hover outlines the countries of the group in the blue of the open group (data-hl) and nothing else moves — the framing stays with the click; the touch has no hover')
def l125(c):
    _l113_open(c)
    if c.width > 760:   # the map at the top of the window with the first row of groups under it, as the user sees it: the outline and the group are on the same screen
        c.js("window.scrollTo(0, document.querySelector('[data-wmap]').closest('[data-world-map]').getBoundingClientRect().top + window.scrollY - 70)")
        c.wait(250)
    gid = c.js("""() => { const ok = g => g.dataset.open === 'false' && !g.hasAttribute('data-nocov') && g.getBoundingClientRect().bottom <= innerHeight && g.getBoundingClientRect().top > 0;
      const gs = [...document.querySelectorAll('.d-gp[data-group-id]')]; return (['europe-north', 'europe-west'].map(i => gs.find(g => g.dataset.groupId === i)).concat(gs).find(g => g && ok(g)) || gs.find(g => g.dataset.open === 'false' && !g.hasAttribute('data-nocov')))?.dataset.groupId }""")
    g = f'[data-group-id={gid}]'
    zones = c.js(f"(document.querySelector('{g}').dataset.zones || '').split(',').filter(Boolean)")
    c.ok(len(zones) >= 3, zones, 'the group row says which countries it holds (data-zones)')
    v0 = c.js(_L123_VIEW)
    hl = lambda: c.js("() => [...document.querySelectorAll('[data-wmap] path[data-hl]')].map(p => p.dataset.zone).sort()")
    if c.width <= 760:
        c.tap(f'{g} [data-act=grp-toggle]')
        c.wait(300)
        c.eq(hl(), [], 'on a phone a tap on a group outlines nothing more than it did (no hover)', what='no hover on a phone')
        return c.check_errors()
    c.page.hover(f'{g} [data-act=grp-toggle]')
    c.wait(250)
    got = hl()
    drawn = c.js("(zs => zs.filter(z => document.querySelector(`[data-wmap] path[data-zone='${z}']`)).sort())", zones)
    c.eq(got, drawn, 'hovering the group outlines every country of it that the map draws', what='outlined')
    c.eq(c.js(_L123_VIEW), v0, 'and the map is not framed (the framing stays with the click)', what='no framing')
    c.eq(c.js(f"document.querySelector('{g}').dataset.open"), 'false', 'the group did not open', what='still closed')
    c.page.screenshot(path=str(ROOT / 'tests/v3/shots' / 'L125_1280_hover.png'))
    c.page.mouse.move(5, 5)
    c.wait(250)
    c.eq(hl(), [], 'leaving the group takes the outline off', what='cleared')
    c.check_errors()


# ------------------------------------------------------------------------------------------------------ L126 .. L127 (SOG-0315, item 4: where the French aircraft register is deposited)
_L126_STATE = """() => { const f = document.querySelector('[data-lc-fold=registry]'); if (!f) return null; const r = f.getBoundingClientRect(), t = s => f.querySelector(s)?.textContent.replace(/\\s+/g, ' ').trim() ?? null;
  return { open: f.open, title: t('summary .d-lct'), pill: t('[data-lc-pill]'), state: t('[data-reg-state]'), msg: t('[data-reg-msg]'), level: f.querySelector('[data-reg-msg]')?.dataset.level || null, top: Math.round(r.top), h: Math.round(r.height), vh: innerHeight,
    link: (a => a ? [a.href, a.target, a.rel] : null)(f.querySelector('a[href^="https://"]')), btn: (b => b ? [b.textContent.trim(), b.disabled] : null)(f.querySelector('[data-act=reg-choose]')), prog: !!f.querySelector('[data-reg-uploading]') } }"""


def _l126_text(c, key, **kw):
    """A text of TX.regs in the language of the run, its {placeholders} filled."""
    out = _trow(key, c.lang, after='  regs: {')
    for k, v in kw.items():
        out = out.replace('{' + k + '}', str(v))
    return out


@case('L126', 'Données: the French aircraft register has a place to be deposited, under a title one finds (SOG-0315, item 4) — a fold « Registre français des aéronefs » under « Vu par le poste », its state, where to get the file (a real link to the DGAC site), « Choisir le fichier… » sends the CSV to the launcher (POST base/upload) and says how many registrations were read; a refusal is said in words; the address #data?registry=1 opens it',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=True, night=False,
      rule='SOG-0315 (the user: « le déposer » → je retourne sur « ma compagnie ». BTW, je n\'ai pas trouvé où le déposer dans maintenance »): the register had no place on the Données screen (only a line without gesture in « Quand ça change »); the link of the aircraft screen (« Le déposer dans Données ») must land on a place that carries the register\'s name; the launcher recognises the CSV by its header (base/upload → source registry_fr), keeps five columns, never the original, never an owner')
def l126(c):
    lang = c.lang
    R = lambda k, **kw: _l126_text(c, k, **kw)
    st = _l102_open(c, target='data?registry=1')
    sent = []
    answer = {'status': 200, 'body': {'ok': True, 'source': 'registry_fr', 'rows': 40689, 'skipped': 12, 'date': '2026-11-13', 'size': 1200}}

    def upload(route):
        req = route.request
        sent.append({'method': req.method, 'headers': {k.lower(): v for k, v in req.headers.items()}, 'size': len(req.post_data_buffer or b'')})
        route.fulfill(status=answer['status'], content_type='application/json', body=json.dumps(answer['body']))
    c.context.route(re.compile(r'/__setup/base/upload'), upload)
    c.until("!!document.querySelector('[data-lc-fold=registry]')", timeout=12000, what='the fold of the register')
    s = c.js(_L126_STATE)
    # ---- the place: its name, opened by the address, in sight, its state
    c.eq(s['title'], R('title'), 'the fold carries the name of the register in the language of the run', what='title')
    c.ok(s['open'] and s['top'] >= 0 and s['top'] < s['vh'], s, 'the address #data?registry=1 opens it and brings it into view')
    c.eq([s['pill'], s['state']], [R('pillOff'), R('stateOff')], 'not deposited yet: said in the pill and in the line', what='state')
    c.ok(s['link'] and s['link'][0].startswith('https://immat.aviation-civile.gouv.fr/') and s['link'][1] == '_blank' and 'noopener' in s['link'][2], s['link'], 'where to get the file: a real link to the DGAC site, a new tab, no referrer')
    c.eq(s['btn'], [_trow('choose', lang, after='  up: {'), False], '« Choisir le fichier… » is there and live', what='button')
    # ---- the deposit: the CSV goes to the launcher as raw bytes, the answer is said with the number of registrations
    with c.page.expect_file_chooser() as fc:
        c.js("document.querySelector('[data-act=reg-choose]').click()")
    fc.value.set_files({'name': 'export (1).csv', 'mimeType': 'text/csv', 'buffer': b'IMMATRICULATION;CONSTRUCTEUR;MODELE\r\nF-AAAA;X;Y\r\n'})
    for _ in range(40):
        if sent:
            break
        c.wait(250)
    c.eq([sent[0]['method'], sent[0]['headers'].get('content-type'), sent[0]['headers'].get('x-sog-name')], ['POST', 'application/octet-stream', urllib.parse.quote('export (1).csv', safe="-_.!~*'()")], 'a POST of the raw bytes, the name only a hint', what='request')
    c.until("!!document.querySelector('[data-reg-msg]')", timeout=8000, what='the answer is said')
    n = c.js(f"new Intl.NumberFormat('{lang}').format(40689)")
    day = c.js(f"import('/modules/data/model.js').then(M => M.dateText('2026-11-13', '{lang}'))")
    s = c.js(_L126_STATE)
    c.eq([norm(s['msg']), s['level']], [norm(R('done', n=n, d=day)), 'ok'], 'the number of registrations read and the date, in words; the original is not kept', what='done')
    c.eq(norm(s['pill']), norm(R('pillOn', d=day)), 'the pill follows: deposited on that date', what='pill after')
    c.shot(f'L126_{c.width}_{lang}_delivered.png')
    # ---- a refusal: in words, never the launcher\'s own text
    sent.clear()
    answer.update(status=422, body={'ok': False, 'reason': 'unrecognised', 'message': 'headers: IMMATRICULATION missing'})
    with c.page.expect_file_chooser() as fc:
        c.js("document.querySelector('[data-act=reg-choose]').click()")
    fc.value.set_files({'name': 'autre.csv', 'mimeType': 'text/csv', 'buffer': b'a;b\r\n1;2\r\n'})
    for _ in range(40):
        if sent:
            break
        c.wait(250)
    c.until("document.querySelector('[data-reg-msg]')?.dataset.level === 'err'", timeout=8000, what='the refusal is said')
    s = c.js(_L126_STATE)
    c.eq(norm(s['msg']), norm(R('refused')), 'a file that is not the register: said in words, nothing kept', what='refused')
    c.ok('IMMATRICULATION' not in s['msg'], s['msg'], 'the launcher\'s own text is not shown')
    c.check_errors()


@case('L127', 'Données: the register fold without the address stays folded, says « déposé le … » when the launcher reports the file (base/cycle.local registry_fr), and the line of « Quand ça change » stays (SOG-0315, item 4)',
      'L', tags=('data',), langs4=True, designs=('standard',), screens=True, night=False,
      rule='SOG-0315: opening the Données screen does not unfold the register; the file the launcher keeps (data/local/registry/fr_immat.json) shows as deposited, with the date it carries')
def l127(c):
    lang = c.lang
    R = lambda k, **kw: _l126_text(c, k, **kw)
    reg = {'id': 'registry_fr', 'label': ['Registre français des immatriculations (DGAC)', 'French aircraft registry (DGAC)', 'Französisches Luftfahrzeugregister (DGAC)', 'Registro francés de matrículas (DGAC)'],
           'at': '2026-10-05T10:00:00Z', 'personal': '', 'zoneCount': 0}
    _l102_open(c, wrap=_l116_wrap(None, [reg]))
    c.until("!!document.querySelector('[data-lc-fold=registry]')", timeout=12000, what='the fold of the register')
    s = c.js(_L126_STATE)
    day = c.js(f"import('/modules/data/model.js').then(M => M.dateText('2026-10-05', '{lang}'))")
    c.eq(s['open'], False, 'folded when the screen opens', what='folded')
    c.eq([norm(s['pill']), norm(s['state'] or '')], [norm(R('pillOn', d=day)), norm(R('stateOn', d=day))], 'the pill and the line say the file is deposited, with the date it carries', what='state')
    c.eq(c.count('[data-change=registry_fr]'), 1, 'and the line of « Quand ça change » is still there', what='change line')
    c.check_errors()
