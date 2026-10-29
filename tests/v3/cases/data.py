"""Area L - the Données module: a read-only screen and its first action, Construire (modules/data/SPEC.md sections 3, 5.4, 6.2, 6.5, 9; INTEGRATION.md section 2).

Rules covered
  * L1 model.js, the pure functions, on fixtures (no page of the module, no aerodb): the AIRAC cycle written YYNN and its dates, the
    state of a row by priority (a cycle gone by amber then red a week after its end, the parser version with and without the
    constant, absent, an aircraft edition older than 28 days, a procedure outdated), a row of the base aggregated from two zones,
    the States grouped green / orange / red and cut at seven lines, the groups cut at seven rows;
  * L2 the screen, with aerodb STUBBED (publication / zones / coverageByState answer fixtures, sources() is the real catalogue plus
    a parser constant; nothing is read from the data repository, nothing is fetched): the head with the cycle in force, the four
    groups in order and folded as they should be, seven rows at most visible, the states of the rows, the coverage written once,
    no horizontal scroll, 44 px summaries, the only action is Construire (grey without a launcher, with its reason); no Télécharger / Publier /
    Purger / Mettre à jour button anywhere, the four languages;
  * L3 the module is never in Pilot's rail (it belongs to the Maintenance application); Settings > Administration has the line
    « Maintenance » at the Full level only, a real link to #data that mounts the module, including on a phone;
  * L4 an aerodb call that fails is said in one line and throws nothing;
  * L5 the fallbacks (no State names, no `held`, no parser constant) and the States list redrawn on aerodb { coverage: true }, unsubscribed at unmount;
  * L6 model.js, the pure functions of Construire (personal sources, grey reason, a zone's phrase, the bar, the end of a job, the refusal,
    the journal trimmed to 50), on fixtures;
  * L7 Construire against a FAKE launcher (the technique of frame A32: c.context.route answers /__setup/*): the body sent, the zone lines that follow,
    the end summary, one notification, the journal; the personal sources and the X-Plane hint;
  * L8 the other ends: no launcher (grey with its reason), a 409, a refusal that says what to do, Arrêter, an interrupted job found at mount,
    a job found running at mount followed to its end.

Cases: L1 .. L8.  The suite never reads a real data repository, never reaches the network and never meets a real launcher.
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
    A.publication = ok('publication', 'publication'); A.zones = ok('zones', 'zones'); A.coverageByState = ok('coverageByState', 'states');
    const s = A.sources; A.sources = async () => { const r = await s.call(A); if (cfg.pv) return { ...r, PARSER_VERSION: cfg.pv }; const { PARSER_VERSION, ...rest } = r; return rest };  // pv null: the catalogue without its constant (aerodb has carried one since 567b94440)
    const on = A.on; A.on = function (ev, fn) { const un = on.call(A, ev, fn); if (ev === 'change') window.__stub.fns.add(fn); return () => { window.__stub.fns.delete(fn); un() } };
    return A };
  Object.defineProperty(window, 'AeroDB', { configurable: true, get() { return ab },
    set(v) { ab = v; if (v && v.create && !v.__data) { const o = v.create; v.__data = 1; v.create = function (...a) { return patch(o.apply(this, a)) } } } }) })()""" % json.dumps(cfg)


def _open(c, cfg, target='data'):
    c.page.add_init_script(_stub(cfg))
    c.open(target, docs=LEVEL3, wait=False)
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
  return { groups, verbs: [...document.querySelectorAll('[data-verb]')].map(b => b.dataset.verb + (b.disabled ? ':off' : '')), buttons: root.querySelectorAll('button').length,
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
    c.eq([m['verbs'], m['buttons']], [['build:off'], 1], 'the only verb is Construire, grey (no launcher in the suite): no Télécharger / Publier / Purger / Mettre à jour', what='verbs / buttons')
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
@case('L3', 'Données: not in the rail; Settings > Administration « Maintenance » leads to it', 'L', tags=('data',), langs4=True,
      designs=('standard',), rule='user, 29 Oct: the data module is the Maintenance application, not a place of Pilot\'s rail; the Administration line (read only on a phone)')
def l3(c):
    cfg, _ = _fixture()
    c.page.add_init_script(_stub(cfg))
    title = lambda: tx('frame/settings/admin_links.js', 'title', c.lang, after="id: 'data'")
    # below the Full level: no Administration line
    for lv in (1, 2):
        c.open('settings', docs=[['device/level.json', {'level': lv}, 'cache']])
        c.until("!!document.querySelector('[data-card=\"status\"]')", what='the settings are drawn')
        c.eq(c.count('#fMenu a[data-id="data"]'), 0, f'level {lv}: no Données entry in the rail', what='rail entries')
        c.eq(c.count('[data-admin="data"], a[href="#data"]'), 0, f'level {lv}: no link to #data in Settings', what='Settings links')
    # the Full level: still not in the rail nor the phone's bar, the line « Maintenance » in the Administration card
    c.open('settings', docs=LEVEL3)
    c.until("!!document.querySelector('[data-card=\"admin\"] li[data-admin=\"data\"]')", what='the Administration card lists the Maintenance line')
    c.eq(c.count('#fMenu a[data-id="data"]'), 0, 'not a place of Pilot\'s rail (the Maintenance application)', what='rail entries')
    c.eq(c.count('#fTabs [data-tab="data"], #fTabs a[href="#data"]'), 0, 'no tab of the phone bar', what='bar entries')
    if c.count('[data-group="admin"]') and not c.js("document.querySelector('[data-group=\"admin\"]').open"):
        c.tap('[data-group="admin"] > summary')
    btn = c.js("(() => { const e = document.querySelector('[data-admin=\"data\"]').firstElementChild; return { tag: e.tagName, href: e.getAttribute('href'), h: e.getBoundingClientRect().height, text: e.textContent } })()")
    c.ok(btn['tag'] == 'A' and btn['href'] == '#data', btn, 'a real link to #data')
    c.eq(norm(btn['text']), norm(title()), 'the line is worded « Maintenance » in the language of the run', what='link text')
    c.ge(btn['h'], 43.5, 'touch target of the frame', what='link height')
    c.tap('[data-admin="data"] > a')
    c.until("!!document.querySelector('[data-module=data] [data-data-head]')", timeout=20000, what='the module is mounted by the link (at 390 as at 1280)')
    c.eq(c.hash(), '#data', 'the address', what='hash')
    c.eq(c.count('#fMenu a[data-id="data"]'), 0, 'still not in the rail once mounted', what='rail entries')
    c.eq(c.count('[data-verb]'), 1, 'only Construire, grey without a launcher', what='[data-verb]')
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
    c.eq(c.js("[...document.querySelectorAll('[data-verb]')].map(b => b.dataset.verb + (b.disabled ? ':off' : ''))"), ['build:off'], 'only Construire, grey', what='[data-verb]')
    c.check_errors()


# ------------------------------------------------------------------------------------------------------ L5
@case('L5', 'Données: fallbacks (no names, no held, no parser constant) and the States list follows aerodb { coverage: true }', 'L',
      tags=('data',), phone=False, rule='modules/data/SPEC 3 (the States list), 6.2 (no constant: never "old parser"); aerodb change signal { coverage: true }')
def l5(c):
    cfg, _ = _fixture(pv=None, shape=False)
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
    c.go('flightlog')
    c.until('window.__stub.fns.size < %d' % before, timeout=4000, what='the module unsubscribes at unmount')
    c.check_errors()


# ------------------------------------------------------------------------------------------------------ L6
_L6_JS = r"""async () => {
  const M = await import('/modules/data/model.js');
  const out = {};
  out.personal = [[], ['fr'], ['es'], ['gb'], ['es', 'gb', 'fr']].map(z => M.personalSources(z).map(p => p.id + ':' + p.kind));
  out.gate = [{ launcher: false, busy: true, zones: 0, offline: true }, { launcher: true, busy: true, zones: 0 }, { launcher: true, busy: false, zones: 2, offline: true },
    { launcher: true, zones: 0 }, { launcher: true, zones: 2 }].map(M.buildState);
  out.phrase = [undefined, { state: 'building', done: 2, total: 5 }, { state: 'building' }, { state: 'built' }, { state: 'failed', error: 'timeout' },
    { state: 'failed', error: 'zzz' }, { state: 'cancelled' }, { state: 'weird' }].map(z => { const p = M.zonePhrase(z); return [p.state, p.key, p.n, p.m, p.code] });
  out.rows = M.zoneRows({ zones: { fr: { state: 'built' }, us: { state: 'building', done: 1, total: 3 } } }, ['fr', 'gb']).map(r => [r.zone, r.key]);
  out.progress = [M.progress({ done: 2, total: 5 }, ['a']), M.progress(null, ['a', 'b']), M.progress({ done: 9, total: 5 }, []), M.progress(null, [])];
  out.clock = [0, 59, 125, -3, 3600].map(M.clock);
  out.isBuild = [{ zones: {} }, { set: 'base', verb: 'build' }, { state: 'done' }, null, { zones: [] }].map(M.isBuildView);
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
         [[True, 'no-launcher'], [True, 'busy'], [True, 'offline'], [True, 'no-zone'], [False, None]], 'one reason, in the order: launcher, busy, offline, no zone', what='buildState')
    c.eq(r['phrase'], [['waiting', 'waiting', None, None, None], ['building', 'buildingN', 2, 5, None], ['building', 'building', None, None, None], ['built', 'built', None, None, None],
                       ['failed', 'failed', None, None, 'timeout'], ['failed', 'failed', None, None, 'unknown'], ['cancelled', 'cancelled', None, None, None], ['waiting', 'waiting', None, None, None]],
         'the phrase of a zone: n / m sources only when both are known, the error code kept or « unknown », an unknown state waits', what='zonePhrase')
    c.eq(r['rows'], [['fr', 'built'], ['gb', 'waiting'], ['us', 'buildingN']], 'the requested zones in order (the one the job does not know yet waits), then the ones the job adds', what='zoneRows')
    c.eq(r['progress'], [{'done': 2, 'total': 5, 'pct': 40}, {'done': 0, 'total': 2, 'pct': 0}, {'done': 5, 'total': 5, 'pct': 100}, {'done': 0, 'total': 0, 'pct': None}],
         'the bar: done / total of the view, else 0 over the zones asked; never above the total; no total, no percentage', what='progress')
    c.eq(r['clock'], ['0:00', '0:59', '2:05', '0:00', '60:00'], 'elapsed time as minutes:seconds', what='clock')
    c.eq(r['isBuild'], [True, True, False, False, False], 'a view is a base build when it carries its zones (or says set and verb)', what='isBuildView')
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


def _trow(key, lang, after=None):
    """One translation of a row of modules/data/texts.js, the key quoted or not (`'no-launcher': [...]`, `busy: [...]`); `after`: a text to find first."""
    from lib import LANGS, _STR, _unesc
    src = (ROOT / TX).read_text(encoding='utf-8')
    start = src.index(after) if after else 0
    m = re.compile(r"""(?<![\w-])['"]?""" + re.escape(key) + r"""['"]?\s*:\s*\[""").search(src, start)
    if not m:
        raise RuntimeError(f'row {key!r} not found after {after!r}')
    out, i = [], m.end()
    while len(out) < 4:
        g = _STR.search(src, i)
        out.append(_unesc(next(x for x in g.groups() if x is not None)))
        i = g.end()
    return out[LANGS.index(lang)]


def _zones_text(lang, n):
    """« 1 zone », « 3 zones » as the screen counts them."""
    return f'{n} {UNIT_ZONE[lang][0 if n == 1 else 1]}'


def _view(state='running', step='', done=0, total=2, zones=None, result=None, jid='j1', unit='zones'):
    """The job's view as the launcher gives it (frame/INTEGRATION 15.1; aerodb's D5 verb)."""
    return {'id': jid, 'state': state, 'step': step, 'done': done, 'total': total, 'unit': unit, 'log': [], 'result': result, 'zones': zones if zones is not None else {}}


def _zs(state, done=0, total=0, **extra):
    """A zone's entry of the job's view."""
    return {'state': state, 'done': done, 'total': total, **extra}


def _launcher(c, views=(), last=None, start=(200, {'job': 'j1'}), cancel_view=None, busy_view=None):
    """A FAKE launcher (the technique of frame A32: c.context.route answers /__setup/*; never a real one).  `views`: what GET regen/job?id= answers one
    after the other (the last one stays); `last`: what GET regen/job (no id) answers at first (the running or the last job); `start`: (status, body) of the
    POST that starts a job; `cancel_view`: what the job becomes once POST regen/job/cancel was received; `busy_view`: the running job a refused start
    (409) leaves in place.  The dict it returns records `posts` and `cancels` and can be changed between steps."""
    st = {'posts': [], 'cancels': [], 'views': list(views), 'i': 0, 'current': last, 'cancelled': False, 'start': start}

    def handler(route):
        req = route.request
        u = urllib.parse.urlparse(req.url)
        code, body = 200, {}
        if u.path.endswith('/__setup/status'):
            body = STATUS
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
    c.eq(c.js("[...document.querySelectorAll('[data-verb]')].map(b => b.dataset.verb).sort()"), ['build', 'stop'], 'the build and stop verbs only', what='verbs')
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
