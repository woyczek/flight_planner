(() => {
  'use strict';
  // V3 — écran « Jetons des pilotes » (écran de service de l'application Maintenance, #pilot-tokens, niveau Complet ; G2,
  // 29 oct. 2026 ; frame/SPEC.md, frame/INTEGRATION.md § 13). Le dépôt des données est sur GitLab : chaque pilote reçoit un
  // jeton d'accès de PROJET à son trigramme, que l'administrateur crée ici et lui donne ; le pilote le colle une fois dans
  // Réglages › Accès aux données avec l'adresse du projet. Le lanceur du poste fait les appels avec le jeton de
  // l'administrateur (secrets/gitlab.json), qu'il ne rend jamais : routes gitlab/tokens (liste, création) et
  // gitlab/tokens/revoke (révocation). Le jeton d'un pilote n'est montré qu'une fois, à sa création, et jamais gardé ici.
  // Contexte (frame/app.js renderScreen) : { t, lang, notify, ask, routes() } — routes() : le client du lanceur réduit aux
  // routes déclarées par l'écran, ou null (pas de lanceur, appareil appairé).
  const BASE = document.currentScript.src;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  const K = window.SogSettingsKit.T; // textes communs des Réglages (kit.js) : les lignes égales dans les quatre langues y sont une fois
  const T = {
    intro: [
      'Un jeton d’accès de projet GitLab par pilote, à son trigramme : créé ici par le lanceur de ce poste avec le jeton de l’administrateur, donné au pilote, collé une fois dans ses Réglages › Accès aux données avec l’adresse du projet. Révoquez-le si l’appareil est perdu ou si le pilote quitte la compagnie.',
      'One GitLab project access token per pilot, named after the trigram: created here by this computer’s launcher with the administrator’s token, given to the pilot, pasted once in their Settings › Data access with the project’s address. Revoke it if the device is lost or the pilot leaves the airline.',
      'Ein GitLab-Projektzugangstoken je Pilot, nach seinem Kürzel benannt: hier vom Starter dieses Rechners mit dem Token des Administrators erstellt, dem Piloten gegeben, einmal in seinen Einstellungen › Datenzugang mit der Adresse des Projekts eingefügt. Widerrufen Sie es, wenn das Gerät verloren ist oder der Pilot die Fluggesellschaft verlässt.',
      'Un token de acceso de proyecto de GitLab por piloto, con su trigrama: creado aquí por el lanzador de este equipo con el token del administrador, entregado al piloto, pegado una vez en sus Ajustes › Acceso a los datos con la dirección del proyecto. Revóquelo si se pierde el dispositivo o si el piloto deja la aerolínea.'
    ],
    noLauncher: [
      'Cet écran se sert du lanceur de ce poste (il garde le jeton de l’administrateur) : ouvrez-le sur le poste où il tourne.',
      'This screen uses this computer’s launcher (it keeps the administrator’s token): open it on the computer where it runs.',
      'Dieser Bildschirm verwendet den Starter dieses Rechners (er verwahrt das Token des Administrators): Öffnen Sie ihn auf dem Rechner, auf dem er läuft.',
      'Esta pantalla usa el lanzador de este equipo (guarda el token del administrador): ábrala en el equipo donde se ejecuta.'
    ],
    noSecret: [
      'Aucun accès GitLab de l’administrateur sur ce poste : secrets/gitlab.json (instance https, projet, jeton du propriétaire du projet).',
      'No administrator GitLab access on this computer: secrets/gitlab.json (https instance, project, the project owner’s token).',
      'Kein GitLab-Zugang des Administrators auf diesem Rechner: secrets/gitlab.json (https-Instanz, Projekt, Token des Projektinhabers).',
      'Ningún acceso GitLab del administrador en este equipo: secrets/gitlab.json (instancia https, proyecto, token del propietario del proyecto).'
    ],
    list: ['Jetons du projet', 'Project tokens', 'Token des Projekts', 'Tokens del proyecto'],
    none: ['Aucun jeton pour l’instant.', 'No token yet.', 'Noch kein Token.', 'Ningún token por ahora.'],
    never: ['jamais utilisé', 'never used', 'nie genutzt', 'nunca usado'],
    revoked: ['révoqué', 'revoked', 'widerrufen', 'revocado'],
    inactive: ['inactif', 'inactive', 'inaktiv', 'inactivo'],
    revokeAsk: [
      'Révoquer le jeton {n} ? L’appareil du pilote ne pourra plus lire ni écrire les données ; ses écritures en attente restent sur son appareil.',
      'Revoke the token {n}? The pilot’s device will no longer read nor write the data; their pending writes stay on their device.',
      'Das Token {n} widerrufen? Das Gerät des Piloten kann die Daten nicht mehr lesen noch schreiben; seine ausstehenden Änderungen bleiben auf seinem Gerät.',
      '¿Revocar el token {n}? El dispositivo del piloto ya no podrá leer ni escribir los datos; sus escrituras pendientes se quedan en su dispositivo.'
    ],
    revokedDone: ['Jeton {n} révoqué.', 'Token {n} revoked.', 'Token {n} widerrufen.', 'Token {n} revocado.'],
    create: ['Nouveau jeton', 'New token', 'Neues Token', 'Nuevo token'],
    days: ['Durée (jours, 365 au plus)', 'Lifetime (days, 365 at most)', 'Laufzeit (Tage, höchstens 365)',
      'Duración (días, 365 como máximo)'
    ],
    make: ['Créer le jeton', 'Create the token', 'Token erstellen', 'Crear el token'],
    created: [
      'Jeton de {n}, valable jusqu’au {d} — montré cette fois seulement : copiez-le et donnez-le au pilote par un canal sûr (jamais dans un message public). Il le colle dans Réglages › Accès aux données, avec l’adresse du projet.',
      'Token for {n}, valid until {d} — shown this once only: copy it and give it to the pilot through a safe channel (never in a public message). They paste it in Settings › Data access, with the project’s address.',
      'Token für {n}, gültig bis {d} — nur dieses eine Mal angezeigt: Kopieren Sie es und geben Sie es dem Piloten über einen sicheren Weg (nie in einer öffentlichen Nachricht). Er fügt es unter Einstellungen › Datenzugang mit der Adresse des Projekts ein.',
      'Token de {n}, válido hasta el {d} — mostrado solo esta vez: cópielo y entrégueselo al piloto por un canal seguro (nunca en un mensaje público). Lo pega en Ajustes › Acceso a los datos, con la dirección del proyecto.'
    ],
    copied: ['Jeton copié.', 'Token copied.', 'Token kopiert.', 'Token copiado.'],
    failed: ['GitLab a refusé : {m}', 'GitLab refused: {m}', 'GitLab hat abgelehnt: {m}', 'GitLab rechazó: {m}'],
    offline: ['Lanceur ou GitLab injoignable.', 'Launcher or GitLab unreachable.', 'Starter oder GitLab nicht erreichbar.',
      'Lanzador o GitLab inaccesible.'
    ],
    branch: [
      'Les jetons ont le rôle Developer : réglez la branche des données pour qu’il puisse y pousser (GitLab › Settings › Repository › Protected branches : « Allowed to push and merge » à « Developers + Maintainers »). Désactivez aussi sur ce projet ce qui ne sert pas aux données — CI/CD, merge requests, tickets, wiki (Settings › General › Visibility, project features, permissions) : un jeton volé ne pourrait rien y lancer.',
      'The tokens have the Developer role: set the data branch so that it may push there (GitLab › Settings › Repository › Protected branches: “Allowed to push and merge” to “Developers + Maintainers”). Also turn off on this project what the data do not use — CI/CD, merge requests, issues, wiki (Settings › General › Visibility, project features, permissions): a stolen token could start nothing there.',
      'Die Token haben die Rolle Developer: Stellen Sie den Datenzweig so ein, dass sie dorthin pushen dürfen (GitLab › Settings › Repository › Protected branches: „Allowed to push and merge“ auf „Developers + Maintainers“). Schalten Sie in diesem Projekt auch ab, was die Daten nicht brauchen — CI/CD, Merge Requests, Issues, Wiki (Settings › General › Visibility, project features, permissions): Ein gestohlenes Token könnte dort nichts starten.',
      'Los tokens tienen el rol Developer: configure la rama de datos para que puedan enviar a ella (GitLab › Settings › Repository › Protected branches: «Allowed to push and merge» a «Developers + Maintainers»). Desactive también en este proyecto lo que los datos no usan — CI/CD, merge requests, incidencias, wiki (Settings › General › Visibility, project features, permissions): un token robado no podría lanzar nada allí.'
    ]
  };

  function screen(view, ctx) {
    const t = (row, v) => ctx.t(row, v),
      R = ctx.routes?.() || null;
    view.innerHTML = `<div class="f-card" data-tokens><h2>${esc(t(K.providerTokens))}</h2><p class="f-muted">${esc(t(T.intro))}</p>
      <div data-tokens-body></div></div>`;
    const body = view.querySelector('[data-tokens-body]');
    if (!R) {
      body.innerHTML = `<p class="f-msg" data-kind="warn" data-tokens-nolauncher>${esc(t(T.noLauncher))}</p>`;
      return;
    }
    const why = r => r?.status === 409 ? t(T.noSecret) : r?.offline ? t(T.offline) : t(T.failed, {
      m: r?.message || r?.status || ''
    });
    const day = iso => iso ? String(iso).slice(0, 10) : '';
    async function draw(fresh = null) {
      const r = await R.call('gitlab/tokens');
      if (!view.isConnected) return;
      if (r?.ok === false) {
        body.innerHTML = `<p class="f-msg" data-kind="${r.status === 409 ? 'warn' : 'err'}" data-tokens-error>${esc(why(r))}</p>`;
        return;
      }
      const rows = (r.tokens || []).map(x => `<li data-token="${esc(x.id)}"><b>${esc(x.name)}</b>
        <span class="f-muted">${esc([x.revoked ? t(T.revoked) : !x.active ? t(T.inactive) : '', x.expires ? t(K.expires, { d: day(x.expires) }) : '',
          x.used ? t(K.used, { d: day(x.used) }) : t(T.never)].filter(Boolean).join(' · '))}</span>
        ${x.active && !x.revoked ? `<button type="button" data-act="revoke" data-id="${esc(x.id)}" data-name="${esc(x.name)}">${esc(t(K.revoke))}</button>` : ''}</li>`).join('');
      body.innerHTML = `${fresh ? `<div class="f-msg" data-kind="ok" data-tokens-new><p>${esc(t(T.created, { n: fresh.name, d: day(fresh.expires) }))}</p>
          <p><code data-token-value>${esc(fresh.token)}</code></p><p><button type="button" data-act="copy">${esc(t(K.copy))}</button></p></div>` : ''}
        <h3>${esc(t(T.list))}</h3>${rows ? `<ul class="f-list" data-tokens-list>${rows}</ul>` : `<p class="f-muted">${esc(t(T.none))}</p>`}
        <h3>${esc(t(T.create))}</h3>
        <label class="f-field">${esc(t(K.cfgPilot))}<input data-f="tri" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="5"></label>
        <label class="f-field">${esc(t(T.days))}<input data-f="days" type="number" min="1" max="365" value="365"></label>
        <p class="f-msg" data-msg></p><div class="f-row"><button type="button" class="primary" data-act="make">${esc(t(T.make))}</button></div>
        <p class="f-muted">${esc(t(T.branch))}</p>`;
      // la valeur du jeton ne vit que dans ce dessin : rien n'est gardé, un nouveau dessin l'efface
      // quitter l'écran (autre adresse, page fermée) efface la valeur du nouveau jeton, pas seulement le prochain dessin
      if (fresh) {
        const wipe = () => {
          body.querySelector('[data-tokens-new]')?.remove();
          window.removeEventListener('hashchange', wipe);
          window.removeEventListener('pagehide', wipe);
        };
        window.addEventListener('hashchange', wipe);
        window.addEventListener('pagehide', wipe);
      }
      body.onclick = async e => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        if (b.dataset.act === 'copy') {
          const CB = await import(new URL('../lib/clipboard.js', BASE).href).catch(() => null);
          const v = body.querySelector('[data-token-value]')?.textContent || '';
          if (CB?.copyText) await CB.copyText(v, {
            near: b
          });
          else await navigator.clipboard?.writeText(v);
          return ctx.notify?.(t(T.copied), 'ok');
        }
        if (b.dataset.act === 'revoke') {
          if (!await ctx.ask(t(T.revokeAsk, {
              n: b.dataset.name
            }))) return;
          const v = await R.call('gitlab/tokens/revoke', {
            id: +b.dataset.id
          });
          if (v?.ok === false) return ctx.notify?.(why(v), 'err');
          ctx.notify?.(t(T.revokedDone, {
            n: b.dataset.name
          }), 'ok');
          return draw();
        }
        if (b.dataset.act === 'make') {
          const tri = (body.querySelector('[data-f=tri]').value || '').trim().toUpperCase(),
            days = +body.querySelector('[data-f=days]').value || 365,
            msg = body.querySelector('[data-msg]');
          if (!/^[A-Z0-9]{2,5}$/.test(tri)) return void(msg.textContent = t(K.badTrigram));
          b.disabled = true;
          const v = await R.call('gitlab/tokens', {
            trigram: tri,
            days
          });
          b.disabled = false;
          if (v?.ok === false) return void(msg.textContent = why(v));
          return draw(v);
        }
      };
    }
    draw();
  }
  (window.SogScreens ||= {})['pilot-tokens'] = {
    screen
  };
})();
