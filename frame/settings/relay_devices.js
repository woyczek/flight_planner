(() => {
  'use strict';
  // V3 — écran « Appareils du relais » (écran de service de l'application Maintenance, #relay-devices, niveau Complet ; R1a,
  // 29 oct. 2026 ; frame/SPEC.md, frame/INTEGRATION.md § 13). Le lanceur tourne en relais de la compagnie (--relay) derrière
  // le proxy inverse du NAS : chaque appareil de pilote s'y appaire une fois avec un code à 8 chiffres que l'administrateur
  // demande ici pour son trigramme (une fois, 10 minutes) ; l'appareil garde un jeton révocable, ses écritures sont signées
  // de ce trigramme. Routes du lanceur (ce poste seulement) : relay (état, appareils), relay/devices (un code),
  // relay/devices/revoke (un appareil ou un pilote). Le code n'est montré qu'une fois, jamais gardé ici.
  // Contexte (frame/app.js renderScreen) : { t, notify, ask, routes() }.
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  const T = {
    title: ['Appareils du relais', 'Relay devices', 'Geräte des Relais', 'Dispositivos del relé'],
    intro: [
      'Le relais de la compagnie sert l’appli Pilote derrière le proxy inverse du poste. Un appareil s’y appaire une fois avec un code à 8 chiffres demandé ici pour le trigramme du pilote ; ses écritures sont signées de ce trigramme. Révoquez un appareil perdu, ou tous ceux d’un pilote qui part.',
      'The airline’s relay serves the Pilot application behind this computer’s reverse proxy. A device pairs once with an 8-digit code asked for here for the pilot’s trigram; its writes are signed with that trigram. Revoke a lost device, or all those of a pilot who leaves.',
      'Das Relais der Fluggesellschaft stellt die Pilot-App hinter dem Reverse-Proxy dieses Rechners bereit. Ein Gerät koppelt sich einmal mit einem 8-stelligen Code, der hier für das Kürzel des Piloten angefordert wird; seine Änderungen tragen dieses Kürzel. Widerrufen Sie ein verlorenes Gerät oder alle eines Piloten, der geht.',
      'El relé de la aerolínea sirve la aplicación Piloto detrás del proxy inverso de este equipo. Un dispositivo se vincula una vez con un código de 8 cifras pedido aquí para el trigrama del piloto; sus escrituras llevan ese trigrama. Revoque un dispositivo perdido, o todos los de un piloto que se va.'
    ],
    noLauncher: ['Cet écran se sert du lanceur de ce poste : ouvrez-le sur le poste où il tourne.',
      'This screen uses this computer’s launcher: open it on the computer where it runs.',
      'Dieser Bildschirm verwendet den Starter dieses Rechners: Öffnen Sie ihn auf dem Rechner, auf dem er läuft.',
      'Esta pantalla usa el lanzador de este equipo: ábrala en el equipo donde se ejecuta.'
    ],
    off: [
      'Relais coupé : le lanceur ne tourne pas avec --relay <hôte public>. Les appareils et les codes ci-dessous ne servent qu’avec lui.',
      'Relay off: the launcher does not run with --relay <public host>. The devices and codes below only work with it.',
      'Relais aus: Der Starter läuft nicht mit --relay <öffentlicher Host>. Die Geräte und Codes unten gelten nur damit.',
      'Relé apagado: el lanzador no se ejecuta con --relay <host público>. Los dispositivos y códigos de abajo solo sirven con él.'
    ],
    on: ['Relais en marche pour {h}.', 'Relay running for {h}.', 'Relais läuft für {h}.', 'Relé en marcha para {h}.'],
    list: ['Appareils appairés', 'Paired devices', 'Gekoppelte Geräte', 'Dispositivos vinculados'],
    none: ['Aucun appareil pour l’instant.', 'No device yet.', 'Noch kein Gerät.', 'Ningún dispositivo por ahora.'],
    since: ['appairé le {d}', 'paired on {d}', 'gekoppelt am {d}', 'vinculado el {d}'],
    last: ['dernier usage {d}', 'last used {d}', 'zuletzt genutzt {d}', 'último uso {d}'],
    revoke: ['Révoquer', 'Revoke', 'Widerrufen', 'Revocar'],
    revokeAll: ['Révoquer tous ses appareils', 'Revoke all their devices', 'Alle Geräte widerrufen', 'Revocar todos sus dispositivos'],
    revokeAsk: ['Révoquer cet appareil de {n} ? Il devra être appairé de nouveau.',
      'Revoke this device of {n}? It will have to pair again.',
      'Dieses Gerät von {n} widerrufen? Es muss erneut gekoppelt werden.',
      '¿Revocar este dispositivo de {n}? Deberá vincularse de nuevo.'
    ],
    revokeAllAsk: ['Révoquer tous les appareils de {n} ?', 'Revoke all the devices of {n}?', 'Alle Geräte von {n} widerrufen?',
      '¿Revocar todos los dispositivos de {n}?'
    ],
    revoked: ['{k} appareil(s) révoqué(s).', '{k} device(s) revoked.', '{k} Gerät(e) widerrufen.', '{k} dispositivo(s) revocado(s).'],
    code: ['Nouveau code d’appairage', 'New pairing code', 'Neuer Kopplungscode', 'Nuevo código de vinculación'],
    trigram: ['Trigramme du pilote', 'Pilot’s trigram', 'Kürzel des Piloten', 'Trigrama del piloto'],
    make: ['Demander un code', 'Ask for a code', 'Code anfordern', 'Pedir un código'],
    badTri: ['Trigramme : 2 à 5 lettres ou chiffres.', 'Trigram: 2 to 5 letters or digits.', 'Kürzel: 2 bis 5 Buchstaben oder Ziffern.',
      'Trigrama: de 2 a 5 letras o cifras.'
    ],
    given: [
      'Code pour {n}, valable 10 minutes et une seule fois — donnez-le au pilote : il le saisit sur la page d’appairage du relais.',
      'Code for {n}, valid for 10 minutes and once only — give it to the pilot: they enter it on the relay’s pairing page.',
      'Code für {n}, 10 Minuten und nur einmal gültig — geben Sie ihn dem Piloten: Er gibt ihn auf der Kopplungsseite des Relais ein.',
      'Código para {n}, válido 10 minutos y una sola vez — déselo al piloto: lo introduce en la página de vinculación del relé.'
    ],
    failed: ['Refusé : {m}', 'Refused: {m}', 'Abgelehnt: {m}', 'Rechazado: {m}']
  };

  function screen(view, ctx) {
    const t = (row, v) => ctx.t(row, v),
      R = ctx.routes?.() || null;
    view.innerHTML = `<div class="f-card" data-relay><h2>${esc(t(T.title))}</h2><p class="f-muted">${esc(t(T.intro))}</p><div data-relay-body></div></div>`;
    const body = view.querySelector('[data-relay-body]');
    if (!R) {
      body.innerHTML = `<p class="f-msg" data-kind="warn" data-relay-nolauncher>${esc(t(T.noLauncher))}</p>`;
      return;
    }
    const day = iso => iso ? String(iso).slice(0, 10) : '';
    async function draw(fresh = null) {
      const s = await R.call('relay');
      if (!view.isConnected) return;
      if (s?.ok === false) {
        body.innerHTML = `<p class="f-msg" data-kind="err" data-relay-error>${esc(t(T.failed, { m: s.message || s.status || '' }))}</p>`;
        return;
      }
      const devs = s.devices || [],
        tris = [...new Set(devs.map(d => d.trigram))];
      body.innerHTML = `<p class="f-msg" data-kind="${s.on ? 'ok' : 'warn'}" data-relay-state="${s.on ? 'on' : 'off'}">${esc(s.on ? t(T.on, { h: s.host }) : t(T.off))}</p>
        ${fresh ? `<div class="f-msg" data-kind="ok" data-relay-new><p>${esc(t(T.given, { n: fresh.trigram }))}</p><p><code data-relay-code>${esc(fresh.code)}</code></p></div>` : ''}
        <h3>${esc(t(T.list))}</h3>${devs.length ? `<ul class="f-list" data-relay-list>${devs.map(d => `<li data-device="${esc(d.id)}"><b>${esc(d.trigram)}</b> ${esc(d.label)}
          <span class="f-muted">${esc([t(T.since, { d: day(d.at) }), d.last ? t(T.last, { d: day(d.last) }) : ''].filter(Boolean).join(' · '))}</span>
          <button type="button" data-act="revoke" data-id="${esc(d.id)}" data-name="${esc(d.trigram)}">${esc(t(T.revoke))}</button></li>`).join('')}</ul>
          <div class="f-row">${tris.map(x => `<button type="button" data-act="revokeAll" data-name="${esc(x)}">${esc(t(T.revokeAll))} (${esc(x)})</button>`).join('')}</div>` : `<p class="f-muted">${esc(t(T.none))}</p>`}
        <h3>${esc(t(T.code))}</h3>
        <label class="f-field">${esc(t(T.trigram))}<input data-f="tri" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="5"></label>
        <p class="f-msg" data-msg></p><div class="f-row"><button type="button" class="primary" data-act="make">${esc(t(T.make))}</button></div>`;
      // le code ne vit que dans ce dessin : effacé en quittant l'écran ou au dessin suivant, jamais gardé
      if (fresh) {
        const wipe = () => {
          body.querySelector('[data-relay-new]')?.remove();
          window.removeEventListener('hashchange', wipe);
          window.removeEventListener('pagehide', wipe);
        };
        window.addEventListener('hashchange', wipe);
        window.addEventListener('pagehide', wipe);
      }
      body.onclick = async e => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        if (b.dataset.act === 'revoke' || b.dataset.act === 'revokeAll') {
          const all = b.dataset.act === 'revokeAll';
          if (!await ctx.ask(t(all ? T.revokeAllAsk : T.revokeAsk, {
              n: b.dataset.name
            }))) return;
          const v = await R.call('relay/devices/revoke', all ? {
            trigram: b.dataset.name
          } : {
            id: b.dataset.id
          });
          if (v?.ok === false) return ctx.notify?.(t(T.failed, {
            m: v.message || v.status || ''
          }), 'err');
          ctx.notify?.(t(T.revoked, {
            k: v.removed ?? 0
          }), 'ok');
          return draw();
        }
        if (b.dataset.act === 'make') {
          const tri = (body.querySelector('[data-f=tri]').value || '').trim().toUpperCase(),
            msg = body.querySelector('[data-msg]');
          if (!/^[A-Z0-9]{2,5}$/.test(tri)) return void(msg.textContent = t(T.badTri));
          const v = await R.call('relay/devices', {
            trigram: tri
          });
          if (v?.ok === false) return void(msg.textContent = t(T.failed, {
            m: v.message || v.status || ''
          }));
          return draw(v);
        }
      };
    }
    draw();
  }
  (window.SogScreens ||= {})['relay-devices'] = {
    screen
  };
})();
