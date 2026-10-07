(() => {
  'use strict';
  // Composant de framework « SuiteUpdate » : canal et contrôle des mises à jour de la suite, état git local.
  // Chargé par repository_nav.js sur toutes les pages ; réglages dans Paramètres › Maintenance.
  //   · réglages (localStorage suiteUpdate:v1, sauvegardés avec les données locales) : canal « master » (stable)
  //     ou « develop » (early bird), mode « manual » (bouton), « off » (jamais), « auto » (contrôle au chargement
  //     d'une page, au plus une fois par période : periodDays) ;
  //   · check() : dernière version publiée du canal — API GitLab de framagit (branche : commit, date, titre ;
  //     repository_tree du canal : version de la suite), comparée à la version locale (repository_tree chargé,
  //     commit local lu dans .git) ; résultat mémorisé (suiteUpdateCheck:v1) ; la mise à jour elle-même se fait
  //     par git (python tools/update_suite.py) : une page web ne réécrit pas le dépôt ;
  //   · readGit(dossier) : branche, commit, suivi origin, dernier fetch, configuration [suite] channel, packs
  //     orphelins, journal de tools/update_suite.py — lus dans .git du dossier du dépôt autorisé (__repo) ;
  //   · pastille de l'en-tête : « Mise à jour » (nouvelle version du canal) et « AIRAC » (base SIA du studio plus
  //     ancienne que le cycle en vigueur, d'après siaBaseInfo:v1), vers la page Maintenance.
  const nav = window.RepositoryNav;
  if (!nav || window.SuiteUpdate) return;
  const cfg = window.REPOSITORY_TREE || {};
  const REPO = Object.assign({
    web: 'https://framagit.org/asr/flight_planner',
    api: 'https://framagit.org/api/v4/projects/asr%2Fflight_planner',
    channels: {
      master: 'stable',
      develop: 'early'
    }
  }, cfg.release?.repository || {});
  // dépôt de l'application réglé dans Maintenance › Sources (suiteRepo) : adresse de l'API GitLab déduite
  {
    const web = nav.source?.('suiteRepo');
    const m = /^(https?:\/\/[^/]+)\/(.+?)(?:\.git)?$/.exec(web || '');
    if (m && web !== REPO.web) {
      REPO.web = web;
      REPO.api = `${m[1]}/api/v4/projects/${encodeURIComponent(m[2])}`;
    }
  }
  const KEY = 'suiteUpdate:v1',
    RESULT = 'suiteUpdateCheck:v1',
    GIT = 'suiteGitInfo:v1';
  const DEFAULTS = {
    channel: 'master',
    mode: 'manual',
    periodDays: 7
  };
  const tr = row => window.RepositoryKit.t(row, {
    typo: false
  }); // shared/kit.js
  const read = (k, d) => {
    try {
      return JSON.parse(localStorage.getItem(k) || 'null') ?? d;
    } catch {
      return d;
    }
  };
  const write = (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* quota */
    }
  };

  /** Réglages { channel, mode, periodDays, updatedAt }. */
  const settings = () => ({
    ...DEFAULTS,
    ...read(KEY, {})
  });
  /** Enregistre des réglages (fusion) ; événement « suite-update-settings ». */
  function save(patch) {
    const s = {
      ...settings(),
      ...patch,
      updatedAt: new Date().toISOString()
    };
    if (!['master', 'develop'].includes(s.channel)) s.channel = 'master';
    if (!['manual', 'off', 'auto'].includes(s.mode)) s.mode = 'manual';
    s.periodDays = Math.max(0, Math.min(90, +s.periodDays || 0));
    write(KEY, s);
    window.dispatchEvent(new CustomEvent('suite-update-settings', {
      detail: s
    }));
    badge();
    return s;
  }
  /** Dernier résultat de contrôle (suiteUpdateCheck:v1). */
  const last = () => read(RESULT, null);
  /** Dernière lecture de .git (suiteGitInfo:v1). */
  const gitInfo = () => read(GIT, null);

  // ---- versions : « 2.5.0 » comparées numériquement
  const vparts = v => String(v || '').replace(/^v/i, '').split(/[.-]/).map(x => /^\d+$/.test(x) ? +x : x);
  /** -1, 0 ou 1 selon que la version a est antérieure, égale ou postérieure à b. */
  function compare(a, b) {
    const x = vparts(a),
      y = vparts(b);
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
      const p = x[i] ?? 0,
        q = y[i] ?? 0;
      if (p === q) continue;
      if (typeof p === 'number' && typeof q === 'number') return p < q ? -1 : 1;
      return String(p) < String(q) ? -1 : 1;
    }
    return 0;
  }
  /** Version et date de release d'un texte repository_tree (release:{date:"…",version:"…"}). */
  function releaseOf(text) {
    const block = /release\s*:\s*\{([^}]*)\}/.exec(String(text || ''))?.[1] || '';
    return {
      // version distante : chiffres seulement (affichée dans l'en-tête de chaque page)
      version: /^\d{1,4}(?:\.\d{1,4}){1,3}(?:-[\w.]{1,20})?$/.exec(/version\s*:\s*"([^"]+)"/.exec(block)?.[1] || '')?.[0] || '',
      date: /date\s*:\s*"([^"]+)"/.exec(block)?.[1] || ''
    };
  }
  const local = () => ({
    version: cfg.release?.version || '',
    date: cfg.release?.date || '',
    git: gitInfo()
  });

  /** Contrôle la dernière version du canal (réseau) ; résultat mémorisé : { at, channel, ok, remote, local, available, reason, error }. */
  async function check({
    channel
  } = {}) {
    const s = settings(),
      ch = channel || s.channel,
      at = new Date().toISOString();
    const loc = local();
    let result;
    try {
      const get = async (url, type) => {
        const r = await fetch(url, {
          cache: 'no-store',
          credentials: 'omit'
        });
        if (!r.ok) throw new Error(`${r.status} ${r.statusText || ''} — ${url.replace(REPO.api, 'API')}`.trim());
        return type === 'json' ? r.json() : r.text();
      };
      const [branch, tree] = await Promise.all([
        get(`${REPO.api}/repository/branches/${encodeURIComponent(ch)}`, 'json'),
        // config/repository_tree (depuis la 4.7) ; repository_tree à la racine pour les versions antérieures du canal
        get(`${REPO.api}/repository/files/config%2Frepository_tree/raw?ref=${encodeURIComponent(ch)}`, 'text')
        .catch(() => get(`${REPO.api}/repository/files/repository_tree/raw?ref=${encodeURIComponent(ch)}`, 'text')).catch(() => '')
      ]);
      const rel = releaseOf(tree),
        remote = {
          commit: branch?.commit?.id || '',
          short: branch?.commit?.short_id || '',
          date: branch?.commit?.committed_date || '',
          title: branch?.commit?.title || '',
          version: rel.version,
          releaseDate: rel.date,
          url: `${REPO.web}/-/commits/${encodeURIComponent(ch)}`
        };
      // Nouveauté : commit distant différent du commit local connu et plus récent ; sans commit local connu, version
      // (ou, à version égale, date du commit distant postérieure à la date de release locale).
      let available = false,
        reason = '';
      const head = loc.git?.branch === ch ? loc.git?.head : loc.git?.channelHeads?.[ch] || '';
      if (head && remote.commit) {
        available = head !== remote.commit && !(loc.git?.remoteHeads?.[ch] === remote.commit && loc.git?.behind === 0);
        reason = available ? 'commit' : 'same-commit';
        if (available && loc.git?.headDate && remote.date && new Date(remote.date) <= new Date(loc.git.headDate)) {
          available = false;
          reason = 'local-newer';
        }
      } else if (rel.version && loc.version) {
        const c = compare(rel.version, loc.version);
        available = c > 0 || (c === 0 && ch === 'develop' && remote.date && loc.date && remote.date.slice(0, 10) > loc.date);
        reason = c > 0 ? 'version' : available ? 'develop-commits' : 'same-version';
      }
      result = {
        at,
        channel: ch,
        ok: true,
        remote,
        local: {
          version: loc.version,
          date: loc.date,
          head
        },
        available,
        reason
      };
    } catch (e) {
      result = {
        at,
        channel: ch,
        ok: false,
        error: String(e?.message || e),
        local: {
          version: loc.version,
          date: loc.date
        },
        available: false
      };
    }
    write(RESULT, result);
    window.dispatchEvent(new CustomEvent('suite-update-checked', {
      detail: result
    }));
    badge();
    return result;
  }
  /** Contrôle automatique : mode « auto » et période écoulée (au moins une heure entre deux contrôles). */
  function autoCheck() {
    const s = settings();
    if (s.mode !== 'auto') return null;
    const prev = last(),
      since = prev?.at ? Date.now() - new Date(prev.at).getTime() : Infinity;
    const period = Math.max(3600e3, (+s.periodDays || 0) * 864e5);
    if (prev && prev.channel === s.channel && since < period) return null;
    return check();
  }

  // ---- dépôt local (.git du dossier autorisé __repo)
  /** Dossier / fichier d'un chemin relatif ('a/b/c') sous un dossier ; null si absent. */
  async function walk(dir, path, kind = 'file') {
    const bits = path.split('/').filter(Boolean);
    let h = dir;
    try {
      for (let i = 0; i < bits.length; i++) {
        const lastBit = i === bits.length - 1;
        h = lastBit && kind === 'file' ? await h.getFileHandle(bits[i]) : await h.getDirectoryHandle(bits[i]);
      }
      return h;
    } catch {
      return null;
    }
  }
  /** Texte et date d'un fichier sous un dossier ; null si absent. */
  async function readText(dir, path) {
    const h = await walk(dir, path);
    if (!h) return null;
    try {
      const f = await h.getFile();
      return {
        text: await f.text(),
        lastModified: f.lastModified,
        size: f.size
      };
    } catch {
      return null;
    }
  }
  /** Sections d'un fichier de configuration git : { 'remote "origin"': { url }, suite: { channel } … }. */
  function gitConfig(text) {
    const out = {};
    let sec = null;
    for (const line of String(text || '').split(/\r?\n/)) {
      const h = /^\s*\[([^\]]+)\]\s*$/.exec(line);
      if (h) {
        sec = h[1].trim();
        out[sec] = out[sec] || {};
        continue;
      }
      const kv = /^\s*([\w.-]+)\s*=\s*(.*?)\s*$/.exec(line);
      if (kv && sec) out[sec][kv[1].toLowerCase()] = kv[2];
    }
    return out;
  }
  /** Dernière ligne d'un journal de références git (logs/…) : { from, to, at, message }. */
  function lastReflog(text) {
    const lines = String(text || '').trim().split(/\r?\n/).filter(Boolean);
    const m = /^(\w+) (\w+) .*? (\d{9,}) ([+-]\d{4})\t(.*)$/.exec(lines[lines.length - 1] || '');
    return m ? {
      from: m[1],
      to: m[2],
      at: new Date(+m[3] * 1000).toISOString(),
      message: m[5]
    } : null;
  }
  /** État git du dépôt (dossier racine autorisé) ; mémorisé en résumé (suiteGitInfo:v1). */
  async function readGit(root) {
    const git = await walk(root, '.git', 'dir');
    if (!git) return {
      ok: false,
      error: 'no-git'
    };
    const head = (await readText(git, 'HEAD'))?.text?.trim() || '';
    const packed = (await readText(git, 'packed-refs'))?.text || '';
    const ref = async name => ((await readText(git, name))?.text || '').trim() || (new RegExp(`^(\\w{40}) ${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm').exec(packed)?.[1] || '');
    const branch = /^ref: refs\/heads\/(.+)$/.exec(head)?.[1] || '';
    const sha = branch ? await ref(`refs/heads/${branch}`) : head;
    const config = gitConfig((await readText(git, 'config'))?.text);
    const channelHeads = {},
      remoteHeads = {};
    for (const b of ['master', 'develop']) {
      channelHeads[b] = await ref(`refs/heads/${b}`);
      remoteHeads[b] = await ref(`refs/remotes/origin/${b}`);
    }
    const fetchHead = await readText(git, 'FETCH_HEAD');
    const headLog = lastReflog((await readText(git, 'logs/HEAD'))?.text);
    const originLog = branch ? lastReflog((await readText(git, `logs/refs/remotes/origin/${branch}`))?.text) : null;
    // packs sans index (.idx) et fichiers parasites : synchronisation (Synology…) ou maintenance interrompue
    const packs = {
      pack: [],
      idx: [],
      other: []
    };
    const packDir = await walk(git, 'objects/pack', 'dir');
    if (packDir)
      for await (const [name] of packDir.entries()) {
        if (/\.pack$/.test(name)) packs.pack.push(name.replace(/\.pack$/, ''));
        else if (/\.idx$/.test(name)) packs.idx.push(name.replace(/\.idx$/, ''));
        else if (!/\.(rev|bitmap|promisor|keep)$/.test(name)) packs.other.push(name);
      }
    const orphanPacks = packs.pack.filter(p => !packs.idx.includes(p));
    // journal de tools/update_suite.py (une ligne JSON par opération)
    const updLog = String((await readText(git, 'suite-update.log'))?.text || '').trim().split(/\r?\n/).filter(Boolean).slice(-20).map(
      l => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      }).filter(Boolean).reverse();
    const originUrl = config['remote "origin"']?.url || '';
    const info = {
      ok: true,
      readAt: new Date().toISOString(),
      branch,
      detached: !branch,
      head: sha,
      headDate: headLog?.to === sha ? headLog.at : '',
      lastAction: headLog,
      upstream: branch ? (config[`branch "${branch}"`]?.merge || '').replace('refs/heads/', '') : '',
      originUrl,
      originOk: /framagit\.org[/:]asr\/flight_planner(\.git)?$/i.test(originUrl),
      remoteHead: branch ? remoteHeads[branch] : '',
      behind: branch && remoteHeads[branch] ? (remoteHeads[branch] === sha ? 0 : null) : null,
      lastFetch: fetchHead ? new Date(fetchHead.lastModified).toISOString() : '',
      originUpdated: originLog?.at || '',
      channelConfig: config.suite?.channel || '',
      channelHeads,
      remoteHeads,
      orphanPacks,
      strayPackFiles: packs.other,
      updateLog: updLog
    };
    write(GIT, {
      branch: info.branch,
      head: info.head,
      headDate: info.headDate,
      channelHeads,
      remoteHeads,
      behind: info.behind,
      readAt: info.readAt,
      channelConfig: info.channelConfig
    });
    return info;
  }

  // ---- AIRAC (cycles de 28 jours depuis le 25 janvier 2024) : base SIA du studio en retard ?
  const REF = Date.UTC(2024, 0, 25),
    CYCLE = 28 * 864e5;
  const now = new Date(),
    today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const effStart = REF + Math.floor((today - REF) / CYCLE) * CYCLE,
    effective = new Date(effStart).toISOString().slice(0, 10);
  /** Libellé « nn/aa » du cycle commençant à start (numéro du cycle dans l'année). */
  const cycleLabel = start => {
    const y = new Date(start).getUTCFullYear(),
      first = REF + Math.ceil((Date.UTC(y, 0, 1) - REF) / CYCLE) * CYCLE;
    return `${String(Math.round((start - first) / CYCLE) + 1).padStart(2, '0')}/${String(y).slice(2)}`;
  };
  /** Cycle en vigueur (AAAA-MM-JJ) et cycle de la base du studio (siaBaseInfo:v1) ; late : base plus ancienne. */
  function airacState() {
    const info = read('siaBaseInfo:v1', null);
    return {
      effective,
      label: cycleLabel(effStart),
      base: info?.airac || '',
      late: !!(info?.airac && info.airac < effective),
      mixed: !!info?.mixed
    };
  }

  // ---- pastille de l'en-tête (vers Paramètres › Maintenance)
  const T = {
    update: ['Mise à jour', 'Update', 'Update', 'Actualización'],
    updateTitle: ['Nouvelle version sur le canal {c} : {v} — ouvrir Paramètres › Maintenance',
      'New version on channel {c}: {v} — open Settings › Maintenance',
      'Neue Version im Kanal {c}: {v} — Einstellungen › Wartung öffnen',
      'Nueva versión en el canal {c}: {v} — abrir Ajustes › Mantenimiento'
    ],
    airac: ['AIRAC', 'AIRAC', 'AIRAC', 'AIRAC'],
    airacTitle: ['Cycle AIRAC {e} en vigueur ; base SIA du studio : {b} — mettre à jour les données SIA (Paramètres › Maintenance)',
      'AIRAC cycle {e} in force; map studio SIA base: {b} — update SIA data (Settings › Maintenance)',
      'AIRAC-Zyklus {e} gültig; SIA-Basis des Studios: {b} — SIA-Daten aktualisieren',
      'Ciclo AIRAC {e} vigente; base SIA del estudio: {b} — actualizar los datos SIA'
    ]
  };
  const page = block => nav.settingsUrl?.(block) || new URL(`apps/settings/maintenance.html?m=${block}`, nav.root).href; // Paramètres › Maintenance
  let host = null;

  function badge() {
    const tools = document.querySelector('.repo-header-tools');
    if (!tools) return;
    if (!host) {
      host = document.createElement('span');
      host.className = 'repo-update-badges no-print';
      tools.prepend(host);
      if (!document.getElementById('repoUpdateStyle')) document.head.insertAdjacentHTML('beforeend',
        '<style id="repoUpdateStyle">.repo-update-badges{display:inline-flex;gap:6px;align-items:center}.repo-update-badge{height:28px;display:inline-flex;align-items:center;gap:4px;border-radius:7px;padding:3px 9px;font:600 12px/1 Inter,system-ui,Segoe UI,Arial,sans-serif;text-decoration:none;white-space:nowrap;background:#1d4ed8;color:#fff!important}.repo-update-badge.airac{background:#b45309}.repo-update-badge:hover{filter:brightness(1.1)}@media print{.repo-update-badges{display:none!important}}</style>'
        );
    }
    const s = settings(),
      r = last(),
      a = airacState(),
      parts = [];
    const onPage = /\/parametrage\.html$/.test(location.pathname) && new URLSearchParams(location.search).has('m');
    if (s.mode !== 'off' && r?.ok && r.available && r.channel === s.channel && !onPage) {
      const v = r.remote?.version && r.remote.version !== r.local?.version ? r.remote.version : (r.remote?.short || '');
      const e = window.RepositoryKit.esc; // version et canal : lus à distance ou gardés dans le navigateur
      parts.push(`<a class="repo-update-badge" href="${page('updates')}" title="${e(tr(T.updateTitle).replace('{c}', s.channel).replace('{v}', v))}">⬆ ${e(tr(T.update))}${v ? ' ' + e(v) : ''}</a>`);
    }
    if (a.late && !onPage) parts.push(`<a class="repo-update-badge airac" href="${page('sia')}" title="${tr(T.airacTitle).replace('{e}', a.effective).replace('{b}', a.base)}">${tr(T.airac)} ${a.label}</a>`);
    host.innerHTML = parts.join('');
  }

  window.SuiteUpdate = {
    REPO,
    settings,
    save,
    last,
    check,
    autoCheck,
    readGit,
    gitInfo,
    compare,
    releaseOf,
    airacState,
    badge,
    lastReflog,
    gitConfig
  };
  badge();
  window.addEventListener('repository-language-change', badge);
  window.addEventListener('storage', e => {
    if ([KEY, RESULT, 'siaBaseInfo:v1'].includes(e.key)) badge();
  });
  // contrôle automatique après le chargement (hors impression, page visible)
  const later = () => setTimeout(() => {
    if (document.visibilityState !== 'hidden') autoCheck()?.catch?.(() => {});
  }, 4000);
  if (document.readyState === 'complete') later();
  else window.addEventListener('load', later, {
    once: true
  });
})();
