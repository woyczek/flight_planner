(() => {
  'use strict';
  // V3 — Réglages, carte Administration (frame/settings/SPEC.md § 3.11, § 5, § 6 ; niveau Complet seulement) : un bouton
  // par page d'administrateur (SogAdminLinks), le filet de la limite de la zone du vol (clé edge de
  // airline/map_profiles.json, INTEGRATION.md § 4), l'export d'une configuration pour un pilote (fichier, lien, code QR).
  const {
    ROOT,
    esc,
    now,
    T,
    setup,
    copy,
    sameRepo,
    confirmOpen,
    AIRLINE,
    airlineDoc,
    howtoHtml
  } = window.SogSettingsKit;
  // textes de ce fichier, ajoutés aux textes communs des Réglages (window.SogSettingsT)
  Object.assign(T, {
    // gestes de l'administrateur, dans l'ordre
    cfgSteps: ['Vos gestes', 'Your steps', 'Ihre Schritte', 'Sus pasos'],
    cfgInvite: ['Invitez le nom {h} du pilote sur le dépôt avec le droit Write : {u}',
      'Invite the pilot’s {h} name to the repository with the Write role: {u}',
      'Laden Sie den {h}-Namen des Piloten mit der Rolle Write in das Repository ein: {u}',
      'Invite el nombre de {h} del piloto al repositorio con el rol Write: {u}'
    ],
    cfgInviteGl: ['Ajoutez le nom {h} du pilote au projet avec le rôle Developer : {u}',
      'Add the pilot’s {h} name to the project with the Developer role: {u}',
      'Fügen Sie den {h}-Namen des Piloten dem Projekt mit der Rolle Developer hinzu: {u}',
      'Añada el nombre de {h} del piloto al proyecto con el rol Developer: {u}'
    ],
    cfgInviteOther: ['Donnez au pilote un accès en écriture au dépôt.', 'Give the pilot write access to the repository.',
      'Geben Sie dem Piloten Schreibzugriff auf das Repository.', 'Dé al piloto acceso de escritura al repositorio.'
    ],
    cfgStepExport: ['Exportez sa configuration : son trigramme, l’adresse de l’appli, « Créer le fichier et le lien ».',
      'Export their configuration: their trigram, the app’s address, “Create the file and the link”.',
      'Exportieren Sie seine Konfiguration: sein Kürzel, die Adresse der App, „Datei und Link erstellen“.',
      'Exporte su configuración: su trigrama, la dirección de la aplicación, «Crear el archivo y el enlace».'
    ],
    cfgStepSend: [
      'Envoyez-lui le lien ou le fichier, ou montrez-lui le code QR : il le scanne avec l’appareil photo de son téléphone, et l’assistant « Rejoindre la compagnie » le guide.',
      'Send them the link or the file, or show them the QR code: they scan it with their phone’s camera, and the “Join the airline” assistant guides them.',
      'Senden Sie ihm den Link oder die Datei, oder zeigen Sie ihm den QR-Code: Er scannt ihn mit der Kamera seines Telefons, und der Assistent „Der Fluggesellschaft beitreten“ führt ihn.',
      'Envíele el enlace o el archivo, o muéstrele el código QR: lo escanea con la cámara de su teléfono, y el asistente «Unirse a la aerolínea» le guía.'
    ],
    cfgQr: ['À scanner avec le téléphone du pilote', 'To scan with the pilot’s phone', 'Mit dem Telefon des Piloten scannen',
      'Para escanear con el teléfono del piloto'
    ],
    cfgPilot: ['Trigramme du pilote', 'Pilot’s trigram', 'Kürzel des Piloten', 'Trigrama del piloto'],
    cfgApp: ['Adresse de l’appli publiée (pour le lien)', 'Address of the published app (for the link)',
      'Adresse der veröffentlichten App (für den Link)',
      'Dirección de la aplicación publicada (para el enlace)'
    ],
    cfgMake: ['Créer le fichier et le lien', 'Create the file and the link', 'Datei und Link erstellen',
      'Crear el archivo y el enlace'
    ],
    cfgLink: ['Lien d’import (un toucher sur le téléphone du pilote)', 'Import link (one tap on the pilot’s phone)',
      'Import-Link (ein Tippen auf dem Telefon des Piloten)', 'Enlace de importación (un toque en el teléfono del piloto)'
    ],
    cfgCopy: ['Copier le lien', 'Copy the link', 'Link kopieren', 'Copiar el enlace'],
    cfgCopied: ['Lien copié.', 'Link copied.', 'Link kopiert.', 'Enlace copiado.'],
    cfgMade: ['{f} enregistré : envoyez-le au pilote, ou le lien ci-dessous.', '{f} saved: send it to the pilot, or the link below.',
      '{f} gespeichert: Senden Sie sie dem Piloten, oder den Link unten.', '{f} guardado: envíelo al piloto, o el enlace de abajo.'
    ],
    cfgLocal: ['Cette adresse ne s’ouvre que sur ce poste : donnez celle de l’appli publiée pour un téléphone.',
      'This address only opens on this workstation: give the published app’s address for a phone.',
      'Diese Adresse öffnet sich nur auf diesem Rechner: Geben Sie für ein Telefon die Adresse der veröffentlichten App an.',
      'Esta dirección solo se abre en este puesto: indique la de la aplicación publicada para un teléfono.'
    ],
    cfgNoRepo: ['Aucun dépôt des données à transmettre : le fichier ne réglera que la compagnie et l’identité.',
      'No data repository to pass on: the file will only set the airline and the identity.',
      'Kein Datenrepository weiterzugeben: Die Datei richtet nur die Fluggesellschaft und die Identität ein.',
      'Ningún repositorio de datos que transmitir: el archivo solo configurará la aerolínea y la identidad.'
    ],
    // carte Administration (niveau Complet)
    admin: ['Administration', 'Administration', 'Verwaltung', 'Administración'],
    adminHint: ['Les pages d’administration et d’essai, réunies ici.', 'The administration and test pages, gathered here.',
      'Die Verwaltungs- und Testseiten, hier gesammelt.', 'Las páginas de administración y de prueba, reunidas aquí.'
    ],
    edgeShow: ['Afficher le filet de la limite de la zone du vol', 'Show the edge line of the flight zone limit',
      'Linie der Flugzonengrenze anzeigen', 'Mostrar la línea del límite de la zona del vuelo'
    ],
    edgeHint: [
      'Pour toute la compagnie. La carte lit cette option avec les seuils (airline/map_profiles.json, clé edge) ; sans réglage, le filet est affiché.',
      'For the whole airline. The map reads this option with the thresholds (airline/map_profiles.json, key edge); with no setting the edge line is shown.',
      'Für die ganze Fluggesellschaft. Die Karte liest diese Option mit den Schwellen (airline/map_profiles.json, Schlüssel edge); ohne Einstellung wird die Linie angezeigt.',
      'Para toda la aerolínea. El mapa lee esta opción con los umbrales (airline/map_profiles.json, clave edge); sin ajuste, la línea se muestra.'
    ],
    launcherOnly: ['poste avec lanceur seulement', 'workstation with launcher only', 'nur Rechner mit Starter',
      'solo puesto con lanzador'
    ],
    copyLink: ['Copier le lien', 'Copy the link', 'Link kopieren', 'Copiar el enlace'],
    linkCopied: ['Lien copié.', 'Link copied.', 'Link kopiert.', 'Enlace copiado.'],
    linkOpen: ['Adresse à ouvrir ou à mettre en favori sur le téléphone :', 'Address to open or bookmark on the phone:',
      'Adresse zum Öffnen oder als Lesezeichen auf dem Telefon:', 'Dirección para abrir o guardar como favorito en el teléfono:'
    ]
  });

  // profils d'affichage de la compagnie (écrits par la page des seuils du module Carte) : la clé « edge » y est la seule que
  // cette carte écrit (frame/settings/INTEGRATION.md § 4) ; le reste du fichier est repris tel quel
  const PROFILES = 'airline/map_profiles.json';
  let profiles = null;
  /** Adaptateur (créé une fois) qui lit et écrit les profils de carte de la compagnie. */
  const profilesOf = c => profiles ||= c.FD.adapter({
    id: 'settings-admin',
    reads: [PROFILES],
    writes: [{
      prefix: PROFILES,
      merge: 'record'
    }]
  });
  /** Le filet de la limite de la zone du vol est-il affiché pour la compagnie ? (edge.show ; affiché par défaut) */
  async function readEdge(c) {
    const f = await profilesOf(c).get(PROFILES, {
      wait: true
    }).catch(() => null);
    return f?.edge?.show !== false;
  }
  /** Enregistre edge.show dans airline/map_profiles.json sans toucher au reste du fichier (seuils, profils). */
  async function writeEdge(c, show) {
    const data = profilesOf(c),
      cur = (await data.get(PROFILES, {
        wait: true
      }).catch(() => null)) || {};
    await data.put(PROFILES, {
      schema: 1,
      ...cur,
      edge: {
        ...(cur.edge && typeof cur.edge === 'object' ? cur.edge : {}),
        show
      },
      by: 'settings',
      updated_at: now()
    });
  }

  /** Carte Administration (niveau Complet) : UN BOUTON par page d'administrateur (SogAdminLinks), sa phrase dessous ; un
   *  bouton qui porte un volet (edge, cfg) le déplie sous sa ligne. Bancs actifs seulement sur un poste avec lanceur
   *  (sinon un bouton grisé), pages V2 montrées seulement avec un lanceur. panels : { cfg (HTML du volet, vide sans
   *  accès à exporter), edge (le filet est affiché) }. */
  function adminCard(t, L, panels) {
    const links = window.SogAdminLinks || [];
    if (!links.length) return '';
    /** Panneau replié d'une ligne d'administration (edge : bord de publication, cfg : configuration). */
    const panel = x => x.panel === 'edge' ? `<div class="f-adminpanel" data-adminpanel="edge" hidden><label class="f-check"><input type="checkbox" data-edge ${panels.edge ? 'checked' : ''}>${esc(t(T.edgeShow))}</label>
      <p class="f-muted">${esc(t(T.edgeHint))}</p><p class="f-msg" data-msg></p></div>` : `<div class="f-adminpanel" data-adminpanel="cfg" hidden>${panels.cfg}</div>`;
    /** Ligne de la liste d'administration : titre, lien, bouton de copie et panneau éventuel. */
    const row = x => {
      const label = esc(t(x.title)),
        out = x.href && !x.href.startsWith('#'),
        cls = `f-btn${x.primary ? ' primary' : ''}`;
      const btn = x.panel ? `<button type="button" class="${cls}" data-act="adminPanel" data-panel="${esc(x.panel)}" aria-expanded="false">${label}</button>` : x.act ?
        `<button type="button" class="${cls}" data-act="${esc(x.act)}">${label}</button>` : x.where === 'bench' && !L ? `<button type="button" class="${cls}" disabled>${label}</button>` :
        `<a class="${cls}" href="${esc(out ? new URL(x.href, ROOT).href : x.href)}"${out ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`;
      // `copyLink` : sous le lien, l'adresse absolue de la page, construite depuis location (publiée sur GitHub Pages ou locale), à
      // ouvrir ou à mettre en favori sur le téléphone, copiable par un appui
      const abs = x.copyLink && x.href ? new URL(x.href, location.href).href : '',
        under = abs ? `<span class="f-muted f-admin-url">${esc(t(T.linkOpen))} <code data-adminurl>${esc(abs)}</code></span>
        <span class="f-row"><button type="button" data-act="adminCopy" data-text="${esc(abs)}">${esc(t(T.copyLink))}</button></span>` : '';
      return `<li data-admin="${esc(x.id)}">${btn}<span class="f-muted">${esc(t(x.text))}${x.where === 'bench' ? ` — ${esc(t(T.launcherOnly))}` : ''}</span>${under}${x.panel ? panel(x) : ''}</li>`;
    };
    const shown = links.filter(x => (x.where !== 'v2' || L) && (x.panel !== 'cfg' || panels.cfg));
    return `<div class="f-card" data-card="admin"><h2>${esc(t(T.admin))}</h2><p class="f-muted">${esc(t(T.adminHint))}</p>
      <ul class="f-admin">${shown.map(row).join('')}</ul></div>`;
  }

  const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/;
  /** Adresse de l'appli pour le lien : celle-ci si elle est publiée (https, pas locale), sinon la dernière donnée ici. */
  function appUrl() {
    if (location.protocol === 'https:' && !LOCAL.test(location.hostname)) return `${location.origin}${location.pathname}`;
    try {
      return localStorage.getItem('sogFrame:appUrl') || '';
    } catch {
      return '';
    }
  }
  /** « Créer le fichier et le lien » : sog-config-<TRI>.json téléchargé, lien #settings?config=… affiché à copier. */
  async function makeConfig(c, view, src) {
    const t = c.t,
      box = view.querySelector('[data-cfgx]'),
      msg = (text, kind = 'err') => {
        const m = box.querySelector('[data-xmsg]');
        m.textContent = text;
        m.dataset.kind = kind;
      };
    const tri = box.querySelector('[data-f="cfgPilot"]').value.trim().toUpperCase(),
      app = box.querySelector('[data-f="cfgApp"]').value.trim();
    if (!/^[A-Z0-9]{2,5}$/.test(tri)) return msg(t(T.badTrigram));
    let base = null;
    try {
      base = app ? new URL(app) : null;
    } catch {
      base = null;
    }
    if (base && !/^https?:$/.test(base.protocol)) base = null;
    if (src && SogConfig.kind(src) === 'github' && !src.ownerType) src = {
      ...src,
      ownerType: await SogConfig.ownerType(src) || undefined
    };
    const airline = await airlineDoc(c.FD).get(AIRLINE, {
      wait: true
    }).catch(() => null);
    const cfg = SogConfig.build({
      airline,
      data: src,
      trigram: tri,
      by: c.identity().trigram || ''
    });
    const name = `sog-config-${tri}.json`,
      a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(new Blob([JSON.stringify(cfg, null, 1)], {
          type: 'application/json'
        })),
        download: name
      });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1e4);
    const out = box.querySelector('[data-cfgout]');
    if (base) {
      base.hash = '';
      try {
        if (base.href !== `${location.origin}${location.pathname}`) localStorage.setItem('sogFrame:appUrl', base.href);
      } catch {
        /* stockage indisponible */
      }
      const short = {
          ...cfg
        },
        qr = out.querySelector('[data-cfgqr]');
      delete short.howto; // refait du modèle à l'import (SogConfig.validate)
      const link = `${base.href}#settings?config=${await SogConfig.pack(short)}`;
      out.querySelector('[data-cfglink]').value = link;
      out.hidden = false;
      if (qr && window.SogQR) {
        try {
          qr.querySelector('div').innerHTML = SogQR.svg(link, {
            ecl: 'M',
            scale: 3
          });
          qr.hidden = false;
        } catch {
          qr.hidden = true; // lien trop long pour un code QR : le lien et le fichier restent
        }
      }
    } else out.hidden = true;
    msg([t(T.cfgMade, {
        f: name
      }), base && LOCAL.test(base.hostname) ? t(T.cfgLocal) : ''].filter(Boolean).join(' '), base && LOCAL.test(base.hostname) ?
      'warn' : 'ok');
  }

  /** Volet d'export d'une configuration (poste, ou appareil réglé sur GitHub) ; env.xsrc : le dépôt à exporter, ou null. */
  function cfgPanel(env) {
    const {
      t,
      L,
      gh,
      remote,
      fld
    } = env;
    const src = L ? (remote?.url ? window.SogConfig?.parseRepo(remote.url) : null) : gh ? {
      host: gh.api ? new URL(gh.api).host : 'github.com',
      repo: gh.repo
    } : null;
    const xsrc = src ? {
      ...src,
      branch: L ? (/^[\w./-]+$/.test(remote?.branch || '') ? remote.branch : 'main') : gh.branch || 'main',
      ...(!L && gh?.api ? {
        api: gh.api
      } : {})
    } : null;
    const xk = xsrc ? SogConfig.kind(xsrc) : 'other',
      xhost = xk === 'github' && !xsrc?.api ? 'GitHub' : xsrc?.host || '',
      xinv = !xsrc ? '' : xk === 'github' ? `https://github.com/${xsrc.repo}/settings/access` : xk === 'gitlab' ? `${SogConfig.webUrl(xsrc)}/-/project_members` : '',
      xa = u => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a>`,
      xfill = (row, v) => esc(t(row)).replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);
    const cfgSteps = `<h3>${esc(t(T.cfgSteps))}</h3><ol class="f-join-steps"><li>${xinv ? xfill(xk === 'github' ? T.cfgInvite : T.cfgInviteGl, { h: esc(xhost), u: xa(xinv) }) : esc(t(T.cfgInviteOther))}</li><li>${esc(t(T.cfgStepExport))}</li><li>${esc(t(T.cfgStepSend))}</li></ol>`;
    const cfgOut = window.SogConfig && (L || gh) ? `<div class="f-cfgx" data-cfgx>${cfgSteps}
      ${xsrc ? '' : `<p class="f-warn">${esc(t(T.cfgNoRepo))}</p>`}${fld('cfgPilot', T.cfgPilot, '', { cap: true, ph: 'ABC' })}${fld('cfgApp', T.cfgApp, appUrl(), { ph: 'https://…/v3/frame/' })}
      <div class="f-row"><button type="button" class="primary" data-act="cfgMake">${esc(t(T.cfgMake))}</button></div><p class="f-msg" data-xmsg></p>
      <div data-cfgout hidden><label class="f-field">${esc(t(T.cfgLink))}<textarea data-cfglink rows="3" readonly spellcheck="false"></textarea></label><div class="f-row"><button type="button" data-act="cfgCopy">${esc(t(T.cfgCopy))}</button></div><figure class="f-qr" data-cfgqr hidden><div></div><figcaption class="f-muted">${esc(t(T.cfgQr))}</figcaption></figure></div></div>` : '';
    env.xsrc = xsrc;
    return cfgOut;
  }
  /** Le filet de la limite de la zone du vol, enregistré dès qu'on coche. */
  function live(env) {
    const {
      view,
      c,
      t,
      say
    } = env;
    // filet de la limite de la zone du vol (carte Administration) : enregistré aussitôt, pour la compagnie
    view.querySelector('[data-edge]')?.addEventListener('change', async e => {
      const box = e.target;
      box.disabled = true;
      try {
        await writeEdge(c, box.checked);
        say('admin', '');
        c.notify(t(T.saved), 'ok');
      } catch (err) {
        box.checked = !box.checked;
        say('admin', err?.message || String(err));
      }
      box.disabled = false;
    });
  }
  /** Actions de la carte Administration. */
  async function run(env, act, b, e) {
    const {
      view,
      c,
      t
    } = env;
    if (act === 'adminCopy') {
      const how = await copy(b.dataset.text || '', {
        near: b.closest('.f-row')
      });
      return c.notify(t(how === 'shown' ? T.copyShown : T.linkCopied), how === 'shown' ? 'warn' : 'ok');
    }
    if (act === 'adminPanel') {
      // bouton de la carte Administration : déplie (ou replie) le volet de sa ligne
      const p = view.querySelector(`[data-adminpanel="${CSS.escape(b.dataset.panel)}"]`);
      if (!p) return;
      p.hidden = !p.hidden;
      b.setAttribute('aria-expanded', String(!p.hidden));
      return;
    }
    if (act === 'cfgMake') return makeConfig(c, view, env.xsrc);
    if (act === 'cfgCopy') {
      const box = view.querySelector('[data-cfglink]'),
        how = await copy(box?.value || '', {
          box
        });
      return c.notify(t(how === 'shown' ? T.copyShown : T.cfgCopied), how === 'shown' ? 'warn' : 'ok');
    }
  }

  (window.SogSettingsParts ||= {}).admin = {
    acts: ['adminCopy', 'adminPanel', 'cfgMake', 'cfgCopy'],
    readEdge,
    adminCard,
    cfgPanel,
    live,
    run
  };
})();
