(() => {
  'use strict';
  // V3 — écran « Appareils » (écran de service de l'application Maintenance, #devices, niveau Complet ; refonte R-C2,
  // 30 oct. 2026 ; frame/SPEC.md § 3.10, frame/INTEGRATION.md § 13). Un seul appairage et une seule liste pour les deux
  // canaux : le réseau local (lanceur --lan) et le relais de la compagnie (--relay). Un code à 8 chiffres demandé ici pour
  // le trigramme d'un pilote vaut une fois, 10 minutes, sur l'un ou l'autre canal ; la ligne de l'appareil dit le canal par
  // lequel il est venu. Un appareil appairé par le code de console du réseau local n'a pas de trigramme : « Nommer » lui en
  // pose un. Routes du lanceur (ce poste seulement) : devices (liste, codes en cours, état des canaux), devices (un code),
  // devices/revoke (un appareil, un pilote), devices/name. Le code n'est montré qu'une fois, jamais gardé ici. L'ancienne
  // adresse #relay-devices mène ici (frame/app.js). Contexte (frame/app.js renderScreen) : { t, notify, ask, routes() }.
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  const K = window.SogSettingsKit.T; // textes communs des Réglages (kit.js) : les lignes égales dans les quatre langues y sont une fois
  const T = {
    title: ['Appareils', 'Devices', 'Geräte', 'Dispositivos'],
    intro: [
      'Les appareils des pilotes appairés à ce poste, par le réseau local ou par le relais de la compagnie. Un appareil s’appaire une fois avec un code à 8 chiffres demandé ici pour le trigramme du pilote ; ses écritures sont signées de ce trigramme. Révoquez un appareil perdu, ou tous ceux d’un pilote qui part.',
      'The pilots’ devices paired with this computer, through the local network or the airline’s relay. A device pairs once with an 8-digit code asked for here for the pilot’s trigram; its writes are signed with that trigram. Revoke a lost device, or all those of a pilot who leaves.',
      'Die Geräte der Piloten, die mit diesem Rechner gekoppelt sind, über das lokale Netz oder das Relais der Fluggesellschaft. Ein Gerät koppelt sich einmal mit einem 8-stelligen Code, der hier für das Kürzel des Piloten angefordert wird; seine Änderungen tragen dieses Kürzel. Widerrufen Sie ein verlorenes Gerät oder alle eines Piloten, der geht.',
      'Los dispositivos de los pilotos vinculados a este equipo, por la red local o por el relé de la aerolínea. Un dispositivo se vincula una vez con un código de 8 cifras pedido aquí para el trigrama del piloto; sus escrituras llevan ese trigrama. Revoque un dispositivo perdido, o todos los de un piloto que se va.'
    ],
    noLauncher: ['Cet écran se sert du lanceur de ce poste : ouvrez-le sur le poste où il tourne.',
      'This screen uses this computer’s launcher: open it on the computer where it runs.',
      'Dieser Bildschirm verwendet den Starter dieses Rechners: Öffnen Sie ihn auf dem Rechner, auf dem er läuft.',
      'Esta pantalla usa el lanzador de este equipo: ábrala en el equipo donde se ejecuta.'
    ],
    relayOff: [
      'Relais coupé : le lanceur ne tourne pas avec --relay <hôte public>.',
      'Relay off: the launcher does not run with --relay <public host>.',
      'Relais aus: Der Starter läuft nicht mit --relay <öffentlicher Host>.',
      'Relé apagado: el lanzador no se ejecuta con --relay <host público>.'
    ],
    relayOn: ['Relais en marche pour {h}.', 'Relay running for {h}.', 'Relais läuft für {h}.', 'Relé en marcha para {h}.'],
    lanOn: ['Réseau local ouvert : {u}.', 'Local network open: {u}.', 'Lokales Netz offen: {u}.', 'Red local abierta: {u}.'],
    lanOff: ['Réseau local fermé (Réglages › Accès du poste l’ouvre).', 'Local network closed (Settings › Computer access opens it).',
      'Lokales Netz geschlossen (Einstellungen › Zugang zum Rechner öffnet es).',
      'Red local cerrada (Ajustes › Acceso al equipo la abre).'
    ],
    none: ['Aucun appareil pour l’instant.', 'No device yet.', 'Noch kein Gerät.', 'Ningún dispositivo por ahora.'],
    channels: {
      lan: ['Réseau local', 'Local network', 'Lokales Netz', 'Red local'],
      relay: ['Relais', 'Relay', 'Relais', 'Relé']
    },
    since: ['appairé le {d}', 'paired on {d}', 'gekoppelt am {d}', 'vinculado el {d}'],
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
    name: ['Nommer', 'Name', 'Benennen', 'Nombrar'],
    nameOk: ['Poser', 'Set', 'Setzen', 'Poner'],
    named: ['Trigramme {n} posé.', 'Trigram {n} set.', 'Kürzel {n} gesetzt.', 'Trigrama {n} puesto.'],
    code: ['Nouveau code d’appairage', 'New pairing code', 'Neuer Kopplungscode', 'Nuevo código de vinculación'],
    make: ['Demander un code', 'Ask for a code', 'Code anfordern', 'Pedir un código'],
    given: [
      'Code pour {n}, valable 10 minutes et une seule fois, sur le réseau local comme par le relais — donnez-le au pilote : il le saisit sur la page d’appairage.',
      'Code for {n}, valid for 10 minutes and once only, on the local network as through the relay — give it to the pilot: they enter it on the pairing page.',
      'Code für {n}, 10 Minuten und nur einmal gültig, im lokalen Netz wie über das Relais — geben Sie ihn dem Piloten: Er gibt ihn auf der Kopplungsseite ein.',
      'Código para {n}, válido 10 minutos y una sola vez, en la red local como por el relé — déselo al piloto: lo introduce en la página de vinculación.'
    ],
    failed: ['Refusé : {m}', 'Refused: {m}', 'Abgelehnt: {m}', 'Rechazado: {m}']
  };
  const TRI = /^[A-Z0-9]{2,5}$/;

  function screen(view, ctx) {
    const t = (row, v) => ctx.t(row, v),
      R = ctx.routes?.() || null;
    view.innerHTML = `<div class="f-card" data-devices><h2>${esc(t(T.title))}</h2><p class="f-muted">${esc(t(T.intro))}</p><div data-devices-body></div></div>`;
    const body = view.querySelector('[data-devices-body]');
    if (!R) {
      body.innerHTML = `<p class="f-msg" data-kind="warn" data-devices-nolauncher>${esc(t(T.noLauncher))}</p>`;
      return;
    }
    const day = iso => iso ? String(iso).slice(0, 10) : '';
    const refused = v => t(T.failed, {
      m: v?.message || v?.status || ''
    });
    async function draw(fresh = null) {
      const s = await R.call('devices');
      if (!view.isConnected) return;
      if (s?.ok === false) {
        body.innerHTML = `<p class="f-msg" data-kind="err" data-devices-error>${esc(refused(s))}</p>`;
        return;
      }
      const devs = s.devices || [],
        tris = [...new Set(devs.map(d => d.trigram).filter(Boolean))],
        lan = s.lan || {},
        relay = s.relay || {};
      const who = d => d.trigram ? `<b>${esc(d.trigram)}</b>` : `<i>${esc(t(K.lanConsole))}</i> <button type="button" data-act="name" data-id="${esc(d.id)}">${esc(t(T.name))}</button>`;
      body.innerHTML = `<p class="f-msg" data-kind="${relay.on ? 'ok' : 'warn'}" data-relay-state="${relay.on ? 'on' : 'off'}">${esc(relay.on ? t(T.relayOn, { h: relay.host }) : t(T.relayOff))}</p>
        <p class="f-msg" data-kind="${lan.on ? 'ok' : 'warn'}" data-lan-state="${lan.on ? 'on' : 'off'}">${esc(lan.on ? t(T.lanOn, { u: lan.urls?.[0] || '' }) : t(T.lanOff))}</p>
        ${fresh ? `<div class="f-msg" data-kind="ok" data-devices-new><p>${esc(t(T.given, { n: fresh.trigram }))}</p><p><code data-devices-code>${esc(fresh.code)}</code></p></div>` : ''}
        <h3>${esc(t(K.lanDevices))}</h3>${devs.length ? `<ul class="f-list" data-devices-list>${devs.map(d => `<li data-device="${esc(d.id)}" data-channel="${esc(d.channel)}">${who(d)} ${esc(d.label)}
          <span class="f-tag" data-channel-name>${esc(t(T.channels[d.channel] || [d.channel, d.channel, d.channel, d.channel]))}</span>
          <span class="f-muted">${esc([t(T.since, { d: day(d.at) }), d.last ? t(K.used, { d: day(d.last) }) : '', d.expires ? t(K.expires, { d: day(d.expires) }) : ''].filter(Boolean).join(' · '))}</span>
          <button type="button" data-act="revoke" data-id="${esc(d.id)}" data-name="${esc(d.trigram || t(K.lanConsole))}">${esc(t(K.revoke))}</button></li>`).join('')}</ul>
          <div class="f-row">${tris.map(x => `<button type="button" data-act="revokeAll" data-name="${esc(x)}">${esc(t(T.revokeAll))} (${esc(x)})</button>`).join('')}</div>` : `<p class="f-muted">${esc(t(T.none))}</p>`}
        <h3>${esc(t(T.code))}</h3>
        <label class="f-field">${esc(t(K.cfgPilot))}<input data-f="tri" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="5"></label>
        <p class="f-msg" data-msg></p><div class="f-row"><button type="button" class="primary" data-act="make">${esc(t(T.make))}</button></div>`;
      // le code ne vit que dans ce dessin : effacé en quittant l'écran ou au dessin suivant, jamais gardé
      if (fresh) {
        const wipe = () => {
          body.querySelector('[data-devices-new]')?.remove();
          window.removeEventListener('hashchange', wipe);
          window.removeEventListener('pagehide', wipe);
        };
        window.addEventListener('hashchange', wipe);
        window.addEventListener('pagehide', wipe);
      }
      body.onclick = async e => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const act = b.dataset.act;
        if (act === 'revoke' || act === 'revokeAll') {
          const all = act === 'revokeAll';
          if (!await ctx.ask(t(all ? T.revokeAllAsk : T.revokeAsk, {
              n: b.dataset.name
            }))) return;
          const v = await R.call('devices/revoke', all ? {
            trigram: b.dataset.name
          } : {
            id: b.dataset.id
          });
          if (v?.ok === false) return ctx.notify?.(refused(v), 'err');
          ctx.notify?.(t(T.revoked, {
            k: v?.removed ?? 0
          }), 'ok');
          return draw();
        }
        if (act === 'name') {
          // un appareil du code de console : un champ à la place du bouton, posé par « Poser »
          b.outerHTML = `<input data-f="name" data-id="${esc(b.dataset.id)}" aria-label="${esc(t(K.cfgPilot))}" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="5" size="5"> <button type="button" data-act="nameOk" data-id="${esc(b.dataset.id)}">${esc(t(T.nameOk))}</button>`;
          body.querySelector(`[data-f="name"][data-id="${CSS.escape(b.dataset.id)}"]`)?.focus();
          return;
        }
        if (act === 'nameOk') {
          const tri = (body.querySelector(`[data-f="name"][data-id="${CSS.escape(b.dataset.id)}"]`)?.value || '').trim().toUpperCase();
          if (!TRI.test(tri)) return ctx.notify?.(t(K.badTrigram), 'warn');
          const v = await R.call('devices/name', {
            id: b.dataset.id,
            trigram: tri
          });
          if (v?.ok === false) return ctx.notify?.(refused(v), 'err');
          ctx.notify?.(t(T.named, {
            n: tri
          }), 'ok');
          return draw();
        }
        if (act === 'make') {
          const tri = (body.querySelector('[data-f=tri]').value || '').trim().toUpperCase(),
            msg = body.querySelector('[data-msg]');
          if (!TRI.test(tri)) return void(msg.textContent = t(K.badTrigram));
          const v = await R.call('devices', {
            trigram: tri
          });
          if (v?.ok === false) return void(msg.textContent = refused(v));
          return draw(v);
        }
      };
    }
    draw();
  }
  (window.SogScreens ||= {}).devices = {
    screen
  };
})();
