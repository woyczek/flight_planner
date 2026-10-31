(() => {
  'use strict';
  // V3 — Réglages, les cartes de l'appareil (frame/settings/SPEC.md § 8) : un constructeur par carte, `(env) → html`, vide quand la carte n'est pas montrée à ce niveau ou pour cette adresse.
  // Il dessine seulement : aucun écouteur, aucune écriture, aucun appel du lanceur ; settings.js les ordonne et les pose, actions.js reçoit les gestes.
  const {
    esc,
    T
  } = window.SogSettingsKit;

  /** Carte « Configuration reçue » quand l'adresse #settings?config=… est refusée : le message et « Fermer » ; vide sans erreur. */
  const refused = env => {
    const {
      t,
      inErr
    } = env;
    if (inErr) return `<div class="f-card" data-card="cfg"><h2>${esc(t(T.cfgTitle))}</h2><p class="f-msg" data-kind="err">${esc(inErr)}</p>
      <div class="f-row"><button type="button" data-act="cfgCancel">${esc(t(T.close))}</button></div></div>`;
    return '';
  };
  /** Carte « Rejoindre la compagnie » à reprendre quand l'assistant est en cours ; vide sinon. */
  const joinResume = env => {
    const {
      t,
      join,
      access
    } = env;
    if (join.cfg && !join.finished && !join.quit) {
      const steps = SogJoin.stepsFor(access);
      return `<div class="f-card" data-card="joinresume"><h2>${esc(t(SogJoin.T.title))}</h2><p>${esc(t(T.joinResume, { n: Math.max(1, steps.indexOf(join.step) + 1), m: steps.length }))}</p>
        <div class="f-row"><a class="f-btn primary" href="#settings?join=1">${esc(t(T.joinGo))}</a></div></div>`;
    }
    return '';
  };
  /** Carte de reprise des réglages de la V2 (une fois) ; vide sans réglages à reprendre. */
  const v2Import = env => {
    const {
      t,
      v2
    } = env;
    if (v2) return `<div class="f-card" data-card="v2"><h2>${esc(t(T.v2))}</h2><p class="f-muted">${esc(t(T.v2Intro))}</p>
      <ul>${Object.entries(v2.identity).map(([k, v]) => `<li>${esc(t(T.pair, { k: t(T[k]) }))} <b>${esc(v)}</b></li>`).join('')}${v2.access ? `<li>${esc(t(T.v2Access, { r: v2.access.repo, b: v2.access.branch }))}</li>` : ''}</ul>
      <div class="f-row"><button type="button" class="primary" data-act="v2take">${esc(t(T.v2Take))}</button><button type="button" data-act="v2no">${esc(t(T.v2No))}</button></div></div>`;
    return '';
  };
  /** Carte Identité : trigramme et identifiants de réseau. */
  const identity = env => {
    const {
      t,
      id,
      us,
      fld
    } = env;
    return `<div class="f-card" data-card="identity"><h2>${esc(t(T.identity))}</h2><p class="f-muted">${esc(t(T.identityHint))}</p>
      ${fld('trigram', T.trigram, id.trigram, { cap: true, ph: 'ABC' })}${fld('ivao', T.ivaoVid, id.ivao, { mode: 'numeric' })}${fld('vatsim', T.vatsim, id.vatsim, { mode: 'numeric' })}${fld('simbrief', T.simbrief, id.simbrief)}
      ${us.users && !id.trigram ? `<p class="f-warn">${esc(t(T.needTrigram))}</p>` : ''}<p class="f-msg" data-msg></p>
      <div class="f-row"><button type="button" class="primary" data-act="identity">${esc(t(T.save))}</button></div></div>`;
  };
  /** Carte Niveau : un choix parmi les trois, le menu suit aussitôt. */
  const level = env => {
    const {
      t,
      lvl,
      mods
    } = env;
    const shows = n => mods.filter(m => m.level <= n).map(m => t(m.label)).join(', ') || t(T.levelNone);
    return `<div class="f-card" data-card="level"><h2>${esc(t(T.level))}</h2><p class="f-muted">${esc(t(T.levelHint))}</p>
      ${T.levels.map(([name, desc], i) => `<label class="f-check f-level"><input type="radio" name="sogLevel" data-level="${i + 1}" ${lvl === i + 1 ? 'checked' : ''}><span><b>${esc(t(name))}</b> — ${esc(t(desc))}<br><span class="f-muted">${esc(t(T.levelShows, { m: shows(i + 1) }))}</span></span></label>`).join('')}</div>`;
  };
  /** Carte Design : vignettes des jeux du cadre et ton ; vide sans jeu de design sur cet appareil. */
  const design = env => {
    const {
      c,
      t
    } = env;
    const sets = c.designs?.() || [];
    if (sets.length) {
      const cur = c.design?.() || {},
        night = cur.tone === 'night' || (cur.tone !== 'day' && matchMedia('(prefers-color-scheme: dark)').matches);
      /** Nom d'un design (son libellé s'il est dans la liste de cet appareil, sinon son identifiant). */
      const nameOf = id => {
        const d = sets.find(x => x.id === id);
        return d ? t(d.label) : String(id || '').replace(/^./, ch => ch.toUpperCase());
      };
      const desk = cur.applied && cur.design && cur.applied !== cur.design ? `<p class="f-muted" data-design-applied>${esc(t(T.designDesk, { d: nameOf(cur.design), a: nameOf(cur.applied) }))}</p>` : '';
      return `<div class="f-card" data-card="design"><h2>${esc(t(T.design))}</h2><p class="f-muted">${esc(t(T.designHint))}</p>
        <div class="f-designs">${sets.map(d => `<button type="button" class="f-design" data-design-pick="${esc(d.id)}" aria-pressed="${(cur.applied || cur.design) === d.id}">
          <span class="f-design-thumb" data-design="${esc(d.id)}" data-tone="${night ? 'night' : 'day'}"><span class="f-design-bar"></span><span class="f-design-card">${esc(t(T.sample))}<span class="f-design-chip"></span></span></span>
          <span class="f-design-name">${esc(t(d.label))}${d.textured ? ` <span class="f-muted">· ${esc(t(T.textured))}</span>` : ''}</span></button>`).join('')}</div>${desk}
        <h3>${esc(t(T.tone))}</h3>${['auto', 'day', 'night'].map(k => `<label class="f-check"><input type="radio" name="sogTone" data-tone-pick="${k}" ${(cur.tone || 'auto') === k ? 'checked' : ''}>${esc(t(T.tones[k]))}</label>`).join('')}</div>`;
    }
    return '';
  };
  /** Carte Usages : les échanges cochés (« Seul sur cet appareil » est l'état sans échange) et la phrase qui les résume. */
  const usages = env => {
    const {
      t,
      us,
      L,
      remote,
      exchange,
      gh
    } = env;
    const how = !exchange ? t(L?.data ? T.aloneLauncher : T.alone) : L?.data ? t(T.viaLauncher, {
      g: t(!L.dataGit ? T.viaLauncherNoGit : remote && !remote.url ? T.viaLauncherNoRemote : T.viaLauncherGit)
    }) : gh ? t(T.viaGithub, {
      r: gh.repo
    }) : t(T.viaNone);
    const chk = (k, row, dis) => `<label class="f-check"><input type="checkbox" data-u="${k}" ${us[k] ? 'checked' : ''} ${dis ? 'disabled' : ''}>${esc(t(row))}</label>`;
    return `<div class="f-card" data-card="usages"><h2>${esc(t(T.usages))}</h2><p><b>${esc(how)}</b></p><p class="f-muted">${esc(t(T.usagesHint))}</p>
      ${chk('devices', T.devices)}${chk('users', T.users)}${chk('backend', T.backend, true)}${us.users && L?.data && !remote?.url ? `<p class="f-warn">${esc(t(T.needRemote))}</p>` : ''}</div>`;
  };
  /** Carte Sauvegarde (export / import des données de l'appareil) : sans échange coché, à partir du niveau Courant ; vide sinon. */
  const backup = env => {
    const {
      t,
      exchange,
      lvl,
      focus
    } = env;
    if (!exchange && (lvl > 1 || focus === 'backup')) return `<div class="f-card" data-card="backup"><h2>${esc(t(T.backup))}</h2><p class="f-muted">${esc(t(T.backupHint))}</p>
      <div class="f-row"><button type="button" class="primary" data-act="export">${esc(t(T.export))}</button><button type="button" data-act="import">${esc(t(T.import))}</button><button type="button" data-act="replace">${esc(t(T.replace))}</button><input type="file" accept="application/json,.json" data-file hidden></div></div>`;
    return '';
  };
  /** Volet d'import d'une configuration, en tête de la carte Accès (vide si le module des configurations n'est pas chargé). */
  const cfgImport = env => {
    const {
      t
    } = env;
    return window.SogConfig ? `<p class="f-muted">${esc(t(T.cfgImportHint))}</p><div class="f-row"><button type="button" data-act="cfgJoin">${esc(t(T.cfgJoin))}</button><button type="button" data-act="cfgImport">${esc(t(T.cfgImport))}</button><input type="file" accept="application/json,.json" data-cfgfile hidden></div>` : '';
  };
  /** Carte Données hors ligne (squelette : l'état vivant est posé par settings.js) ; vide à Découverte. */
  const offline = env => {
    const {
      t,
      lvl,
      focus,
      L,
      gh
    } = env;
    if (lvl > 1 || focus === 'offline') return `<div class="f-card" data-card="offline"><h2>${esc(t(T.offlineData))}</h2><dl class="f-dl" data-offline><dt>${esc(t(T.zones))}</dt><dd>…</dd><dt>${esc(t(T.storage))}</dt><dd>…</dd></dl>
      <div data-zones></div>${!L?.data && !gh ? `<p class="f-warn">${esc(t(T.noBases))}</p>` : ''}<p class="f-muted">${esc(t(T.zoneHint))}</p></div>`;
    return '';
  };
  /** Carte Compte IVAO du pilote (par le relais) : avec un lanceur, à partir du niveau Courant ; le jeton n'est jamais montré. */
  const ivao = env => {
    const {
      c,
      t,
      L,
      lvl,
      focus
    } = env;
    const iv = c.ivao;
    if (iv && L && (lvl > 1 || focus === 'ivao')) {
      const st = iv.status();
      return `<div class="f-card" data-card="ivao"><h2>${esc(t(T.ivao))}</h2><p class="f-muted">${esc(t(T.ivaoHint))}</p>
        <p><b data-ivao-state="${st.connected ? 'on' : 'off'}">${esc(st.connected ? t(T.ivaoOn, { d: new Date(st.expires_at * 1000).toISOString().slice(0, 16).replace('T', ' ') + 'Z' }) : t(T.ivaoOff))}</b></p>
        <p class="f-msg" data-msg></p><p data-ivao-app hidden><a href="#settings?card=ivaoapp">${esc(t(T.ivaoAppLink))}</a></p><div class="f-row"><button type="button" class="primary" data-act="ivaoConnect">${esc(t(st.connected ? T.ivaoAgain : T.ivaoConnect))}</button>${st.connected ? `<button type="button" data-act="ivaoOut">${esc(t(T.ivaoOut))}</button>` : ''}</div></div>`;
    }
    return '';
  };
  /** Carte Clé météo de l'appareil, avec ou sans lanceur (le cadre la garde hors de device/ et de toute sauvegarde). */
  const wx = env => {
    const {
      c,
      t,
      L,
      lvl,
      focus,
      fld
    } = env;
    const wk = c.weatherKey;
    if (wk && (lvl > 1 || focus === 'wx')) return `<div class="f-card" data-card="wx"><h2>${esc(t(T.wx))}</h2><p class="f-muted">${esc(t(T.wxHint))}</p>
      ${L ? `<p class="f-muted">${esc(t(T.wxLauncher))}</p>` : ''}<p><b>${esc(t(wk.has() ? T.wxSet : T.wxNone))}</b></p>
      ${fld('wxKey', T.wxKey, '', { type: 'password', ph: wk.has() ? t(T.wxKeySet) : '' })}<p class="f-msg" data-msg></p>
      <div class="f-row"><button type="button" class="primary" data-act="wxSave">${esc(t(T.save))}</button><button type="button" data-act="wxTest" ${wk.has() ? '' : 'disabled'}>${esc(t(T.test))}</button><button type="button" data-act="wxErase" ${wk.has() ? '' : 'disabled'}>${esc(t(T.erase))}</button></div>
      <p><a href="https://account.avwx.rest/" target="_blank" rel="noopener">${esc(t(T.wxSignup))}</a></p></div>`;
    return '';
  };
  /** Emplacement de la carte des fiches Little Navmap (écrite ensuite par aerodb) ; vide sans lanceur ou sans cette part. */
  const lnmperf = env => {
    const {
      c,
      L,
      lvl,
      focus
    } = env;
    if (L && (lvl > 1 || focus === 'lnmperf') && c.aerodb()?.lnmperf) return '<div class="f-card" data-card="lnmperf" hidden></div>';
    return '';
  };

  (window.SogSettingsParts ||= {}).cards = {
    refused,
    joinResume,
    v2Import,
    identity,
    level,
    design,
    usages,
    backup,
    cfgImport,
    offline,
    ivao,
    wx,
    lnmperf
  };
})();
