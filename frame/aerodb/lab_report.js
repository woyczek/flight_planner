(() => {
  'use strict';
  // V3 aerodb — laboratoire des données (TEMPORAIRE) : le rapport. Un journal d'entrées { at, id, kind, title, lines, data },
  // un texte structuré, daté, lisible et collable (« Copier le rapport »), toujours en anglais (il est lu par la session
  // qui lit les mesures, pas par un pilote). Pur : aucune dépendance au DOM, aucun accès au stockage (le rapport est gardé
  // par lab.js dans cache/lab/report.json, politique cache). Les fonctions `of*` construisent les entrées à partir des
  // résultats de lab_measure.js. En tête du texte, un résumé de dix lignes au plus (`summary`, passe 2 du 27 octobre : parsing,
  // publication, sources permises / bloquées / injoignables, EAD Basic) ; le détail suit. API : AeroLabReport.{ format, summary,
  // fmt, ofProbe, ofFile, ofMode, ofChain, ofCompare, ofPublish, ofClean, ofCrash, MAX }.
  const MAX = 300;
  const fmt = {
    mbf: n => n == null ? 'n/a' : `${(n / 1048576).toFixed(1)} MB`, // toujours en Mo, une décimale (0.5 MB, 5.3 MB) : les tailles des blocs publiés
    mb: n => n == null ? 'n/a' : n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`,
    s: ms => ms == null ? 'n/a' : ms >= 10000 ? `${(ms / 1000).toFixed(0)} s` : ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.round(ms)} ms`,
    rate: (bytes, ms) => bytes && ms ? `${(bytes / 1048576 / (ms / 1000)).toFixed(1)} MB/s` : 'n/a',
    heap: b => b == null ? 'not measurable on this browser' : `${(b / 1048576).toFixed(0)} MB`
  };
  // Ce que la documentation de GitHub dit (docs.github.com, description OpenAPI de l'API, 27 octobre 2026) : le transport du cadre
  // écrit par l'API git data (arbre avec `content` en UTF-8, sans Base64), dont la documentation ne donne aucun maximum de requête.
  const LIMITS = [
    'git blob / tree (the frame transport: tree entries with inline UTF-8 content): no maximum request size is documented for create-blob or create-tree;',
    '  reading a blob is documented up to 100 MB; a recursive tree read is cut at 100,000 entries or 7 MB (truncated=true).',
    'contents API (not used by the frame): PUT takes the file as Base64 (+33%: a 10 MB file is a 13.3 MB body), no maximum documented; GET: 1 MB all',
    '  features, 1-100 MB raw/object media types only, above 100 MB unsupported.',
    'repository files: a warning above 50 MiB, a push is blocked above 100 MiB; a browser upload is limited to 25 MiB.'
  ];
  const short = n => String(n).split(':')[0].trim(); // le nom court d'une source (avant le « : »)
  const pad = (s, n) => String(s).padEnd(n);
  /** Le texte du rapport : en-tête daté, appareil, essais dans l'ordre. `at` : instant du texte (ISO). */
  function format({
    at,
    device = {},
    storage = {},
    entries = [],
    cycle = '',
    total = 0
  } = {}) {
    const L = ['SOG data lab report', `generated: ${at || new Date().toISOString()}`, `airac in force: ${cycle || 'n/a'}`, '', '== summary ==', ...summary(entries, total), '', '== device =='];
    const d = device;
    const rows = [
      ['userAgent', d.userAgent],
      ['platform', d.platform],
      ['app mode', d.standalone ? 'standalone (home screen)' : 'browser tab'],
      ['online', d.online],
      ['screen / viewport', `${d.screen || 'n/a'} / ${d.viewport || 'n/a'} @${d.pixelRatio || '?'}x`],
      ['cores', d.cores],
      ['deviceMemory (declared)', d.deviceMemoryGB == null ? 'n/a (not exposed by this browser)' : `${d.deviceMemoryGB} GB`],
      ['heap api', d.heapApi],
      ['heap limit', d.heapLimitMB == null ? 'n/a' : `${d.heapLimitMB} MB`],
      ['DecompressionStream / Worker / DOMParser', `${d.decompressionStream} / ${d.worker} / ${d.domParser}`],
      ['secure context / cross-origin isolated', `${d.secureContext} / ${d.crossOriginIsolated}`],
      ['storage', storage.quotaMB == null ? 'n/a' : `${storage.usageMB} MB used of ${storage.quotaMB} MB`],
      ['web share (share / canShare / files json / files geojson)', d.share ? (d.share.error ? `error: ${d.share.error}` : `${d.share.share} / ${d.share.canShare} / ${d.share.json} / ${d.share.geojson}`) : 'n/a'],
      ['connection', d.connection ? `${d.connection.type || '?'} ${d.connection.downlinkMbps ?? '?'} Mbps${d.connection.saveData ? ' (save-data)' : ''}` : 'n/a']
    ];
    for (const [k, v] of rows) L.push(`${k}: ${v == null || v === '' ? 'n/a' : v}`);
    L.push('', '== github api limits (documented; the buttons measure what is real) ==', ...LIMITS);
    L.push('', `== runs (${entries.length}) ==`);
    if (!entries.length) L.push('(nothing measured yet)');
    for (const e of entries) {
      L.push(`[${e.at}] ${e.kind} ${e.title}`);
      for (const l of e.lines || []) L.push(`    ${l}`);
    }
    L.push('', 'end of report');
    return L.join('\n') + '\n';
  }
  // ---- le résumé de tête : lu dans les entrées (jamais dans le texte), au plus dix lignes
  const PUB_SIZES = [524288, 2097152, 5560000, 10485760];
  const last = (entries, pred) => {
    for (let i = entries.length - 1; i >= 0; i--)
      if (pred(entries[i])) return entries[i];
    return null;
  };
  /** Un résultat d'essai d'adresse en quelques mots (d : data de l'entrée). */
  function shortOf(d) {
    if (!d) return 'not tested';
    if (d.ok) return `OK (HTTP ${d.status}${d.json ? `; ${d.json}` : ''})`;
    if (d.diag === 'http') return `HTTP ${d.status}`;
    return ({
      cors: 'blocked by CORS',
      csp: 'blocked by the page CSP',
      unreachable: 'unreachable',
      timeout: 'timeout',
      offline: 'offline',
      aborted: 'stopped'
    })[d.diag] || d.diag || 'failed';
  }
  /** Les lignes du résumé : parsing (temps du mode c d'abord), publication (tailles passées, en échec, non essayées), sources
   *  (permises, bloquées, injoignables, autres, avec les noms), EAD Basic. `total` : nombre de sources de la table. */
  function summary(entries = [], total = 0) {
    const L = [],
      sec = ms => fmt.s(ms);
    // parsing : le dernier résultat de chaque mode, dans l'ordre c, b, a
    const modes = ['c', 'b', 'a'].map(m => ({
      m,
      e: last(entries, e => e.kind === 'mode' && e.data && e.data.mode === m)
    })).filter(x => x.e);
    const cmp = last(entries, e => e.kind === 'compare');
    L.push(modes.length ? `parsing of the SIA zip: ${modes.map(({m, e}) => e.data.failed ? `mode ${m} FAILED` : `mode ${m} ${sec(e.data.totalMs)}`).join(', ')}${cmp && cmp.lines.some(l => /DIFFERENT/.test(l)) ? ' (counts DIFFER between modes)' : cmp && cmp.lines.some(l => /same/.test(l)) ? ' (counts identical between modes)' : ''}` :
      'parsing of the SIA zip: not measured (no zip given)');
    // publication : le dernier résultat par taille ; un « late » (réponse arrivée après le délai) remplace le sans-réponse
    const pubs = PUB_SIZES.map(size => ({
      size,
      e: last(entries, e => e.kind === 'publish' && e.data && e.data.size === size)
    }));
    const passed = pubs.filter(p => p.e && p.e.data.ok),
      failed = pubs.filter(p => p.e && !p.e.data.ok),
      none = pubs.filter(p => !p.e);
    L.push(`publication passed: ${passed.length ? passed.map(p => `${fmt.mbf(p.size)} in ${sec(p.e.data.ms)}${p.e.data.late ? ' (late answer)' : ''}`).join(', ') : 'none'}`);
    if (failed.length) L.push(`publication failed: ${failed.map(p => `${fmt.mbf(p.size)} (${p.e.data.timedOut ? p.e.data.error : p.e.data.error || 'error'})`).join(', ')}`);
    if (none.length) L.push(`publication not tried: ${none.map(p => fmt.mbf(p.size)).join(', ')}`);
    // sources : le dernier essai d'adresse de chacune
    const probes = new Map;
    for (const e of entries)
      if (e.kind === 'probe' && e.data && e.data.id && e.data.id !== 'ead-login') probes.set(e.data.id, e);
    const cls = {
      allowed: [],
      cors: [],
      unreachable: [],
      other: []
    };
    for (const e of probes.values()) {
      const d = e.data,
        name = d.name || d.id;
      if (d.ok) cls.allowed.push(name);
      else if (d.diag === 'cors') cls.cors.push(name);
      else if (['unreachable', 'timeout', 'offline'].includes(d.diag)) cls.unreachable.push(name);
      else cls.other.push(`${name} (${shortOf(d)})`);
    }
    const fl = entries.filter(e => e.kind === 'file' && e.data && e.data.id),
      files = new Set(fl.map(e => e.data.name || e.data.id));
    L.push(`sources: ${probes.size}${total ? ` of ${total}` : ''} tested; files imported by hand: ${fl.length}${files.size ? ` (${[...files].join(', ')})` : ''}`);
    const list = (k, a) => L.push(`  ${k} (${a.length}): ${a.length ? a.join(', ') : '-'}`);
    list('allowed to read', cls.allowed);
    list('blocked by CORS', cls.cors);
    list('unreachable', cls.unreachable);
    if (cls.other.length) list('other answers', cls.other);
    // EAD Basic : la page de connexion, l'appel de connexion à vide, les fichiers importés
    const page = probes.get('ead'),
      call = last(entries, e => e.kind === 'probe' && e.data && e.data.id === 'ead-login'),
      n = entries.filter(e => e.kind === 'file' && e.data && e.data.id === 'ead').length;
    L.push(`EAD Basic: login page ${shortOf(page && page.data)}, login call ${shortOf(call && call.data)}, files imported ${n}`);
    return L;
  }
  const entry = (kind, title, lines, data = {}) => ({
    at: new Date().toISOString(),
    kind,
    title,
    lines,
    data
  });
  const DIAG = {
    cors: 'BLOCKED BY CORS (the server answered; it sends no Access-Control-Allow-Origin for this page)',
    csp: 'BLOCKED BY THE PAGE CSP (connect-src does not list this host)',
    offline: 'offline',
    unreachable: 'UNREACHABLE (no answer: network, DNS, firewall, or the host refuses)',
    timeout: 'TIMEOUT',
    aborted: 'aborted',
    http: 'HTTP error'
  };

  function ofProbe(src, r, extra = []) {
    const lines = [`url: ${r.url}${r.method && r.method !== 'GET' ? ` (${r.method} with empty form fields, nothing else sent)` : ''}`];
    if (r.diag && r.diag !== 'http') lines.push(`result: ${DIAG[r.diag] || r.diag} after ${fmt.s(r.ms)}`);
    else lines.push(`result: ${r.ok ? 'OK' : 'FAIL'} HTTP ${r.status} ${r.statusText || ''}`.trim() + ` · ${fmt.mb(r.bytes)}${r.truncated ? ' (truncated by the cap)' : ''} · ${fmt.s(r.ms)} (first byte ${fmt.s(r.ttfbMs)}) · ${fmt.rate(r.bytes, r.ms)}`);
    if (r.status) lines.push(`headers read by CORS: content-type=${r.type || 'n/a'} content-length=${r.length ?? 'n/a'} last-modified=${r.lastModified || 'n/a'}`);
    if (r.status) lines.push('cors: allowed (the cross-origin read succeeded)');
    if (r.error) lines.push(`error: ${r.error}`);
    return entry('probe', src.id, [...lines, ...extra], {
      id: src.id,
      name: src.n ? short(src.n[1]) : src.id,
      url: r.url,
      json: r.jsonNote || null,
      ok: r.ok,
      status: r.status || null,
      diag: r.diag || null,
      bytes: r.bytes ?? null,
      ms: r.ms
    });
  }

  function ofFile(src, f, extra = []) {
    return entry('file', src ? src.id : 'file', [`file: ${f.name} · ${fmt.mb(f.size)}`,
      `read from the picker: stream ${fmt.s(f.streamMs)} (${fmt.rate(f.size, f.streamMs)}), ArrayBuffer ${f.bufferError ? `failed: ${f.bufferError}` : fmt.s(f.bufferMs)}`,
      ...extra
    ], {
      id: src ? src.id : null,
      name: src && src.n ? short(src.n[1]) : null,
      size: f.size,
      streamMs: f.streamMs,
      bufferMs: f.bufferMs ?? null
    });
  }
  const stepLine = s => `${pad(s.name, 52)} ${pad(fmt.s(s.ms), 9)}${s.heap != null ? ` heap ${fmt.heap(s.heap)}` : ''}${s.bytes ? ` · ${fmt.mb(s.bytes)}` : ''}`;

  function ofMode(r, label) {
    const total = r.steps.reduce((n, s) => n + s.ms, 0),
      S = r.summary || {};
    const lines = r.steps.map(stepLine);
    lines.push(`total ${fmt.s(total)} · peak heap seen ${fmt.heap(r.peak)}${r.mode === 'a' ? ' (sampled between steps: the DOMParser step is synchronous, so the true peak is higher)' : ''}`);
    lines.push(`counts: airspaces(XML_SIA)=${S.airspacesSia} rings=${S.ringsSia} points=${S.pointsSia} vrp=${S.vrp} | airspaces(AIXM)=${S.airspacesAixm} points=${S.pointsAixm} aerodromes=${S.aerodromes} navaids=${S.navaids} ` +
      `points=${S.points} obstacles=${S.obstacles} obstacleCells=${S.obstacleCells}${S.withIcao != null ? ` withIcao=${S.withIcao}` : ''}`);
    if (S.navaidKinds) lines.push(`navaid kinds: ${Object.entries(S.navaidKinds).map(([k, v]) => `${k}=${v}`).join(' ')}`);
    const others = {
      ...S.countsSia
    };
    for (const k of ['Espace', 'Partie', 'NavFix']) delete others[k];
    if (S.countsSia) lines.push(`other XML_SIA records counted: ${Object.entries(others).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k}=${v}`).join(' ')}`);
    if (S.countsAixm) lines.push(`AIXM records counted: ${Object.entries(S.countsAixm).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k}=${v}`).join(' ')}`);
    if (r.sizes) lines.push(`output sizes (JSON): ${Object.entries(r.sizes).map(([k, v]) => `${k}=${fmt.mb(v)}`).join(' ')}${r.mode === 'a' ? '' : ' (reduced objects: not comparable with mode a)'}`);
    if (r.stats)
      for (const [k, st] of Object.entries(r.stats))
        if (st) lines.push(`reader ${k}: ${st.tags} tags, largest text held ${(st.peakChars / 1e6).toFixed(1)} M chars${st.chunks ? `, ${st.chunks} chunks, ${st.encoding}` : ''}`);
    return entry('mode', label || `SIA zip, mode ${r.mode}`, lines, {
      mode: r.mode,
      totalMs: total,
      peak: r.peak,
      summary: S
    });
  }

  function ofChain(src, chain, r, steps = []) {
    const lines = Object.entries(r).filter(([k]) => !['steps', 'sample'].includes(k)).map(([k, v]) => `${k}: ${v}`);
    for (const s of r.steps || steps) lines.push(stepLine(s));
    if (r.peak != null) lines.push(`peak heap seen ${fmt.heap(r.peak)}`);
    return entry('chain', `${src ? src.id : '?'} ${chain}`, lines, {
      id: src ? src.id : null
    });
  }
  /** Comparaison des modes entre eux et avec la base publiée (aeroindex de la zone fr) : lignes « ok / DIFFERENT ». */
  function ofCompare(results, published) {
    const lines = [],
      keys = ['airspacesSia', 'ringsSia', 'pointsSia', 'vrp', 'airspacesAixm', 'pointsAixm', 'aerodromes', 'navaids', 'points',
        'obstacles', 'obstacleCells'
      ];
    const by = Object.fromEntries(results.map(r => [r.mode, r.summary || {}]));
    const modes = Object.keys(by);
    if (modes.length > 1)
      for (const k of keys) {
        const vals = modes.map(m => by[m][k]);
        lines.push(`${pad(k, 16)} ${modes.map((m, i) => `${m}=${vals[i]}`).join(' ')}  ${vals.every(v => v === vals[0]) ? 'same' : 'DIFFERENT'}`);
      }
    if (published) lines.push(`published base (zone fr, cycle ${published.cycle || '?'}): aeroindex rows=${published.rows ?? 'n/a'}; parsed aerodromes with an ICAO code=${by.a ? by.a.withIcao : 'n/a'}`);
    else lines.push('published base: not readable on this device (no access set, or the zone is not published)');
    return entry('compare', 'modes against each other and the published base', lines);
  }

  function ofPublish(step, r, size = null) {
    const lines = [`${r.files} file(s), ${r.bytes >= 262144 ? fmt.mbf(r.bytes) : fmt.mb(r.bytes)} · ${r.timedOut ? 'NO ANSWER' : r.ok ? 'OK' : 'FAIL'} in ${fmt.s(r.ms)} (head ${fmt.s(r.headMs)}) · ${fmt.rate(r.bytes, r.ms)}`];
    if (r.error) lines.push(`error: ${r.error}${r.status ? ` (HTTP ${r.status})` : ''}${r.offline ? ' (offline)' : ''}`);
    if (r.paths) lines.push(`paths: ${r.paths.join(', ')}`);
    // ce qui a été écrit, et où : la branche jetable, jamais la branche principale
    if (r.branch) lines.push(`written to: ${r.repo ? `${r.repo}, ` : ''}branch ${r.branch}${r.created ? ` (created from the head of ${r.base || 'the main branch'})` : ''}${r.commit ? `, commit ${String(r.commit).slice(0, 7)}` : ''}; ${r.base || 'the main branch'} not touched; "Clean" deletes the branch`);
    return entry('publish', step, lines, {
      ok: r.ok,
      size,
      timedOut: !!r.timedOut,
      late: !!r.late,
      error: r.error || null,
      bytes: r.bytes,
      ms: r.ms,
      status: r.status || null
    });
  }

  function ofClean(r, auto = false) {
    const lines = [`${r.ok ? 'OK' : 'FAIL'} · branch ${r.branch || '?'} ${r.deleted ? 'deleted' : 'not found (nothing to delete)'} · ${r.listed ?? 0} trial file(s) on it · ${fmt.s(r.ms)}${r.treeMs != null ? ` (tree read ${fmt.s(r.treeMs)})` : ''}`];
    if (r.paths && r.paths.length) lines.push(`removed: ${r.paths.join(', ')}`);
    if (r.onMain && r.onMain.length) lines.push(`old trial files still on the main branch (before 28 Oct 2026, not touched; purge: frame/aerodb/INTEGRATION.md): ${r.onMain.join(', ')}`);
    else if (r.onMain === null) lines.push('main branch: not readable to look for old trial files');
    if (r.error) lines.push(`error: ${r.error}${r.status ? ` (HTTP ${r.status})` : ''}`);
    return entry('clean', auto ? 'delete the trial branch left by an earlier session (on opening)' : 'delete the trial branch', lines, {
      ok: r.ok,
      auto
    });
  }

  function ofCrash(g) {
    return entry('crash', 'previous run did not finish', [`started ${g.at} · ${g.label} · last step: ${g.step}`,
      'The page was reloaded or the tab was killed before the run ended (the browser probably ran out of memory).'
    ], g);
  }
  window.AeroLabReport = {
    format,
    summary,
    fmt,
    entry,
    ofProbe,
    ofFile,
    ofMode,
    ofChain,
    ofCompare,
    ofPublish,
    ofClean,
    ofCrash,
    MAX
  };
})();
