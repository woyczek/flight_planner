(() => {
  'use strict';
  // V3 aerodb — laboratoire des données (TEMPORAIRE) : le rapport. Un journal d'entrées { at, id, kind, title, lines, data },
  // un texte structuré, daté, lisible et collable (« Copier le rapport »), toujours en anglais (il est lu par la session
  // qui lit les mesures, pas par un pilote). Pur : aucune dépendance au DOM, aucun accès au stockage (le rapport est gardé
  // par lab.js dans cache/lab/report.json, politique cache). Les fonctions `of*` construisent les entrées à partir des
  // résultats de lab_measure.js. API : AeroLabReport.{ format, fmt, ofProbe, ofFile, ofMode, ofChain, ofCompare, ofPublish,
  // ofClean, ofCrash, MAX }.
  const MAX = 300;
  const fmt = {
    mb: n => n == null ? 'n/a' : n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`,
    s: ms => ms == null ? 'n/a' : ms >= 10000 ? `${(ms / 1000).toFixed(0)} s` : ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.round(ms)} ms`,
    rate: (bytes, ms) => bytes && ms ? `${(bytes / 1048576 / (ms / 1000)).toFixed(1)} MB/s` : 'n/a',
    heap: b => b == null ? 'not measurable on this browser' : `${(b / 1048576).toFixed(0)} MB`
  };
  const pad = (s, n) => String(s).padEnd(n);
  /** Le texte du rapport : en-tête daté, appareil, essais dans l'ordre. `at` : instant du texte (ISO). */
  function format({
    at,
    device = {},
    storage = {},
    entries = [],
    cycle = ''
  } = {}) {
    const L = ['SOG data lab report', `generated: ${at || new Date().toISOString()}`, `airac in force: ${cycle || 'n/a'}`, '', '== device =='];
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
      ['connection', d.connection ? `${d.connection.type || '?'} ${d.connection.downlinkMbps ?? '?'} Mbps${d.connection.saveData ? ' (save-data)' : ''}` : 'n/a']
    ];
    for (const [k, v] of rows) L.push(`${k}: ${v == null || v === '' ? 'n/a' : v}`);
    L.push('', `== runs (${entries.length}) ==`);
    if (!entries.length) L.push('(nothing measured yet)');
    for (const e of entries) {
      L.push(`[${e.at}] ${e.kind} ${e.title}`);
      for (const l of e.lines || []) L.push(`    ${l}`);
    }
    L.push('', 'end of report');
    return L.join('\n') + '\n';
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
    const lines = [`url: ${r.url}`];
    if (r.diag && r.diag !== 'http') lines.push(`result: ${DIAG[r.diag] || r.diag} after ${fmt.s(r.ms)}`);
    else lines.push(`result: ${r.ok ? 'OK' : 'FAIL'} HTTP ${r.status} ${r.statusText || ''}`.trim() + ` · ${fmt.mb(r.bytes)}${r.truncated ? ' (truncated by the cap)' : ''} · ${fmt.s(r.ms)} (first byte ${fmt.s(r.ttfbMs)}) · ${fmt.rate(r.bytes, r.ms)}`);
    if (r.status) lines.push(`headers read by CORS: content-type=${r.type || 'n/a'} content-length=${r.length ?? 'n/a'} last-modified=${r.lastModified || 'n/a'}`);
    if (r.status) lines.push('cors: allowed (the cross-origin read succeeded)');
    if (r.error) lines.push(`error: ${r.error}`);
    return entry('probe', src.id, [...lines, ...extra], {
      id: src.id,
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

  function ofPublish(step, r) {
    const lines = [`${r.files} file(s), ${fmt.mb(r.bytes)} · ${r.ok ? 'OK' : 'FAIL'} in ${fmt.s(r.ms)} (head ${fmt.s(r.headMs)}) · ${fmt.rate(r.bytes, r.ms)}`];
    if (r.error) lines.push(`error: ${r.error}${r.status ? ` (HTTP ${r.status})` : ''}${r.offline ? ' (offline)' : ''}`);
    if (r.paths) lines.push(`paths: ${r.paths.join(', ')}`);
    return entry('publish', step, lines, {
      ok: r.ok,
      bytes: r.bytes,
      ms: r.ms,
      status: r.status || null
    });
  }

  function ofClean(r) {
    return entry('clean', 'remove the trial files', [`${r.ok ? 'OK' : 'FAIL'} · ${r.listed ?? 0} file(s) found · ${fmt.s(r.ms)}${r.treeMs != null ? ` (tree read ${fmt.s(r.treeMs)})` : ''}`,
      ...(r.error ? [`error: ${r.error}${r.status ? ` (HTTP ${r.status})` : ''}`] : [])
    ], {
      ok: r.ok
    });
  }

  function ofCrash(g) {
    return entry('crash', 'previous run did not finish', [`started ${g.at} · ${g.label} · last step: ${g.step}`,
      'The page was reloaded or the tab was killed before the run ended (the browser probably ran out of memory).'
    ], g);
  }
  window.AeroLabReport = {
    format,
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
