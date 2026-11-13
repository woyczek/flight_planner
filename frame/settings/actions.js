(() => {
  'use strict';
  // V3 — Réglages, les gestes de l'écran (frame/settings/SPEC.md § 8) : le répartiteur des clics, les écouteurs des champs (design, ton, niveau, usages, fichiers), l'export et l'import de la sauvegarde, le fichier de configuration choisi.
  // Il ne dessine que des messages et redemande le dessin par env.again ; il ne construit aucune carte (cards.js) et ne choisit ni l'ordre ni la place des cartes (settings.js).
  const {
    now,
    T
  } = window.SogSettingsKit;
  const P = window.SogSettingsParts || {}; // cartes du lanceur, accès et transport, diagnostic, administration

  // ---- configuration d'un pilote (frame/settings/config.js)
  /** Commence l'assistant « Rejoindre la compagnie » avec une configuration vérifiée et l'affiche (déjà dessiné : redessiné ; sinon l'adresse `#settings?join=1`). */
  async function startJoin(c, cfg, view) {
    await SogJoin.start(c.own, cfg);
    if (location.hash.includes('join=')) return window.SogSettings.render(view, c);
    location.hash = '#settings?join=1';
  }
  /** Une configuration reçue en lien (l'adresse entière « …#settings?config=… », « #settings?config=… », ou la seule valeur de `config`) lue et vérifiée : le résultat de SogConfig.validate ({ ok, cfg } ou la raison du refus),
   *  ou null si le lien est illisible. Le seul lecteur de lien : le lien d'une adresse (settings.js, routeJoin) et le lien collé dans l'assistant passent par lui. */
  async function readConfigLink(text) {
    const raw = String(text || '').trim(),
      m = /[?&#]config=([^&#\s]+)/.exec(raw);
    try {
      return SogConfig.validate(await SogConfig.unpack(m ? m[1] : raw));
    } catch {
      return null;
    }
  }
  /** Fichier de configuration choisi → vérifié, assistant « Rejoindre la compagnie » commencé et affiché ; refus : message. */
  async function joinFromFile(c, f, view) {
    let r = null;
    try {
      r = SogConfig.validate(await SogConfig.read(f));
    } catch {
      r = null;
    }
    if (!r?.ok) return c.notify(r ? cfgError(r, c.t) : c.t(T.cfgBadFile), 'err');
    return startJoin(c, r.cfg, view);
  }
  /** Lien collé dans l'assistant (pas encore de configuration) → vérifié, assistant commencé et affiché ; refus : message, comme pour le fichier. */
  async function joinFromLink(c, text, view) {
    const r = await readConfigLink(text);
    if (!r?.ok) return c.notify(r ? cfgError(r, c.t) : c.t(T.cfgBadFile), 'err');
    return startJoin(c, r.cfg, view);
  }
  /** Choix d'un fichier de configuration depuis l'assistant (pas encore de configuration). */
  function pickConfig(c, view) {
    const i = Object.assign(document.createElement('input'), {
      type: 'file',
      accept: 'application/json,.json'
    });
    i.onchange = () => i.files?.[0] && joinFromFile(c, i.files[0], view);
    i.click();
  }
  /** Message d'une configuration refusée (validate). */
  const cfgError = (r, t) => r.error === 'schema' ? t(T.cfgBadSchema, {
    s: r.schema
  }) : r.error === 'field' ? t(T.cfgBadField, {
    f: r.field
  }) : r.error === 'provider' ? t(T.providerUnknown) : t(T.cfgBadFile);
  /** Retire config= / import= de l'adresse (la configuration n'est plus proposée au dessin suivant). */
  const dropConfigHash = () => {
    if (/[?&](config|import)=/.test(location.hash)) history.replaceState(null, '', `${location.pathname}${location.search}#settings`);
  };

  /** Exporte la sauvegarde de cet appareil en un fichier (FrameData.dump : copies, écritures en attente, conflits ; jamais
   *  de jeton ; bases de référence exclues). */
  async function exportDevice(env) {
    const {
      c,
      bytes
    } = env;
    const d = await c.FD.dump(),
      a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(new Blob([d.text], {
          type: 'application/json'
        })),
        download: d.name
      });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1e4);
    c.notify(window.SogSettingsKit.agreeT(c.t)(T.exported, {
      d: d.counts.docs,
      p: d.counts.pending,
      k: bytes(d.counts.bytes, c.t)
    }), 'ok');
  }
  /** Reprend une sauvegarde (FrameData.load) : fusion par défaut (rien d'ici n'est perdu), remplacement sur demande,
   *  chacun après une question qui dit ce qu'il fait. */
  async function importDevice(c, file, mode = 'merge') {
    let d = null;
    try {
      d = JSON.parse(await file.text());
    } catch {
      /* illisible */
    }
    if (!d || !Array.isArray(d.docs)) return c.notify(c.t(T.badFile), 'err');
    const day = String(d.at || '?').slice(0, 10);
    if (!await c.ask(window.SogSettingsKit.agreeT(c.t)(mode === 'replace' ? T.replaceAsk : T.importAsk, {
        d: day
      }))) return;
    let r;
    try {
      r = await c.FD.load(d, {
        mode
      });
    } catch {
      return c.notify(c.t(T.badFile), 'err');
    }
    await c.reload();
    c.notify(window.SogSettingsKit.agreeT(c.t)(T.imported, {
      a: r.added,
      u: r.updated,
      k: r.kept,
      c: r.conflicts
    }), 'ok');
  }

  /** Répartiteur des clics de l'écran (view.onclick) ; env : le contexte de l'écran (settings.js), card / val / say / again / paintIvaoApp compris. */
  async function onClick(env, e) {
    const {
      c,
      t,
      FD,
      view,
      id,
      prefs,
      card,
      val,
      say,
      again,
      paintIvaoApp,
      v2Settings
    } = env;
    if (await P.launcher.onClick(env, e)) return; // un appareil appairé oublié
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    for (const part of [P.launcher, P.access, P.airline, P.diagnostic, P.admin])
      if (part.acts.includes(act)) return part.run(env, act, b, e);
    if (act === 'v2take') {
      const d = v2Settings();
      if (d) {
        await c.own.put('device/identity.json', {
          ...id,
          ...d.identity,
          updated_at: now()
        });
        if (d.access && !FD.github.config()) FD.github.save(d.access);
      }
      await c.own.put('device/settings.json', {
        ...prefs,
        v2: 'taken',
        updated_at: now()
      });
      await c.reload();
      c.notify(t(T.v2Done), 'ok');
      return again();
    }
    if (act === 'v2no') {
      await c.own.put('device/settings.json', {
        ...prefs,
        v2: 'declined',
        updated_at: now()
      });
      return again();
    }
    if (act === 'identity') {
      const r = card('identity'),
        tri = val('trigram', r).toUpperCase(),
        ivao = val('ivao', r),
        vatsim = val('vatsim', r);
      if (tri && !/^[A-Z0-9]{2,5}$/.test(tri)) return say('identity', t(T.badTrigram));
      if (ivao && !/^\d+$/.test(ivao)) return say('identity', t(T.badNumber, {
        f: t(T.ivaoVid)
      }));
      if (vatsim && !/^\d+$/.test(vatsim)) return say('identity', t(T.badNumber, {
        f: t(T.vatsim)
      }));
      await c.own.put('device/identity.json', {
        trigram: tri,
        ivao,
        vatsim,
        simbrief: val('simbrief', r),
        updated_at: now()
      });
      await c.reload();
      c.notify(t(T.saved), 'ok');
      return again();
    }
    if (act === 'export') return exportDevice(env);
    if (act === 'import' || act === 'replace') {
      const f = view.querySelector('[data-file]');
      f.dataset.mode = act === 'replace' ? 'replace' : 'merge';
      return f.click();
    }
    if (act === 'ivaoConnect') {
      say('ivao', '…', 'warn');
      const r = await c.ivao.connect();
      if (r.ok) return;
      // sans application IVAO (409) : rien n'est parti ; le lieu et le renvoi vers l'assistant, comme au dessin de la carte
      if (r.status === 409) return paintIvaoApp({
        app: false,
        relay: r.relay
      });
      return say('ivao', t(T.ivaoErr, {
        e: r.message || r.status || '?'
      }), 'err');
    }
    if (act === 'ivaoOut') {
      if (!await c.ask(t(T.ivaoOutAsk))) return;
      const r = await c.ivao.disconnect();
      if (r?.revoked) c.notify(t(T.ivaoRevoked), 'ok');
      else c.notify(t(T.ivaoOutManual), 'warn');
      return again();
    }
    if (act === 'wxSave') {
      const f = card('wx').querySelector('[data-f="wxKey"]'),
        k = f?.value.trim() || '';
      if (f) f.value = '';
      if (!k) return say('wx', '');
      await c.weatherKey.save(k);
      c.notify(t(T.saved), 'ok');
      return again();
    }
    if (act === 'wxTest') {
      say('wx', '…', 'warn');
      const r = await c.weatherKey.test('LFPG').catch(e => ({
        ok: false,
        message: e?.message || String(e)
      }));
      // messages du cadre : ok, no key, key refused, offline, HTTP <n> — traduits ici
      const m = String(r?.message || ''),
        http = /^HTTP (\d+)/.exec(m);
      return say('wx', r?.ok ? t(T.wxOk, {
        s: r.status || 200
      }) : m === 'no key' ? t(T.wxNoKey) : m === 'key refused' ? t(T.wxRefused, {
        s: r.status || '401'
      }) : m === 'offline' ? t(T.testOffline) : http ? t(T.wxHttp, {
        s: http[1]
      }) : m || '?', r?.ok ? 'ok' : m === 'offline' ? 'warn' : 'err');
    }
    if (act === 'resetDevice') {
      // SOG-0324 : ne vide que les copies `reference` (relisibles du dépôt, sans écriture en attente : FrameData.evict) ; les chiffres d'abord, UNE confirmation, les envois en attente partent avant
      const copies = (await FD.cached('')).filter(d => d.policy === 'reference'),
        st0 = await FD.status(),
        p = (st0.pending || 0) + (st0.held || 0),
        mb = new Intl.NumberFormat(t(['fr', 'en', 'de', 'es']), {
          maximumFractionDigits: 1
        }).format(copies.reduce((n, d) => n + (d.bytes || 0), 0) / 1048576);
      if (!copies.length) return say('reset', t(T.resetNone), 'warn');
      if (navigator.onLine === false) return say('reset', t(T.resetOffline),
        'err'); // hors ligne : on ne le propose même pas (audit 206)
      if (!await c.ask(t(p ? T.resetAsk1 : T.resetAsk0, {
          n: copies.length,
          mb,
          p
        }))) return;
      // SOG-0324 (audit 206) : jamais vider sans pouvoir relire. Hors ligne, ou l'arbre du dépôt ne répond pas : rien n'est vidé (l'appareil garderait ses bases jusqu'au retour du réseau). Le passage envoie aussi les écritures en attente, puis relit l'arbre : c'est l'essai du réseau.
      if (navigator.onLine === false) return say('reset', t(T.resetOffline), 'err'); // le réseau a pu tomber pendant la question
      const pass = await FD.sync().catch(() => null);
      if (!pass || !pass.ok || pass.error || pass.warning) return say('reset', t(T.resetOffline), 'err');
      if (p && ((await FD.status()).pending || 0) > 0) return say('reset', t(T.resetHeld),
        'err'); // un envoi n'est pas parti : rien n'est vidé
      let n = 0;
      for (const d of copies) n += await FD.evict(d.path).catch(() => 0);
      FD.sync().catch(() => null); // relit l'arbre du dépôt ; les copies reviennent à la demande
      say('reset', t(T.resetDone, {
        n
      }), 'ok');
      return;
    }
    if (act === 'wxErase') {
      if (!await c.ask(t(T.wxEraseAsk))) return;
      await c.weatherKey.clear();
      c.notify(t(T.saved), 'ok');
      return again();
    }
    // ---- configuration d'un pilote
    if (act === 'cfgCancel') {
      dropConfigHash();
      return again();
    }
    if (act === 'cfgJoin') {
      location.hash = '#settings?join=1';
      return;
    }
  }
  /** Pose les gestes sur l'écran dessiné : le clic (onClick) et les écouteurs des vignettes de design, du ton, du niveau, des usages et des fichiers choisis. */
  function wire(env) {
    const {
      c,
      t,
      us,
      view,
      again
    } = env;
    view.onclick = e => onClick(env, e);
    view.querySelectorAll('[data-design-pick], [data-design-preview]').forEach(b => b.addEventListener('click', async () => {
      await c.saveDesign({
        ...(c.design?.() || {}),
        design: b.dataset.designPick || b.dataset.designPreview
      });
      again();
    }));
    view.querySelectorAll('[data-tone-pick]').forEach(i => i.addEventListener('change', async () => {
      await c.saveDesign({
        ...(c.design?.() || {}),
        tone: i.dataset.tonePick
      });
      again();
    }));
    view.querySelectorAll('[data-level]').forEach(i => i.addEventListener('change', async () => {
      const n = +i.dataset.level;
      await c.own.put('device/level.json', {
        level: n,
        updated_at: now()
      });
      await c.reload();
      c.notify(t(T.levelSaved, {
        l: t(T.levels[n - 1][0])
      }), 'ok');
    }));
    view.querySelectorAll('[data-u]').forEach(i => i.addEventListener('change', async () => {
      const u = {
        ...us,
        updated_at: now()
      };
      for (const x of view.querySelectorAll('[data-u]')) u[x.dataset.u] = x.checked;
      u.single = !(u.devices || u.users || u.backend); // « seul sur cet appareil » : l'état sans échange
      await c.own.put('device/usages.json', u);
      await c.reload();
      again();
    }));
    view.querySelector('[data-file]')?.addEventListener('change', async e => {
      const f = e.target.files?.[0];
      e.target.value = '';
      if (f) await importDevice(c, f, e.target.dataset.mode);
      again();
    });
  }

  (window.SogSettingsParts ||= {}).actions = {
    wire,
    pickConfig,
    joinFromLink,
    readConfigLink,
    cfgError,
    dropConfigHash
  };
})();
