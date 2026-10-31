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
    howtoHtml,
    link,
    fill
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
    // « Ajouter un pilote » (volet de la carte Administration)
    apName: ['Nom du pilote (facultatif, pour le saluer dans le message)', 'Pilot’s name (optional, to greet them in the message)',
      'Name des Piloten (optional, für die Anrede in der Nachricht)', 'Nombre del piloto (opcional, para saludarlo en el mensaje)'
    ],
    apLang: ['Langue du message', 'Language of the message', 'Sprache der Nachricht', 'Idioma del mensaje'],
    apPrepare: ['Préparer', 'Prepare', 'Vorbereiten', 'Preparar'],
    apNeedApp: ['Indiquez l’adresse de l’appli publiée : sans elle, ni lien ni message à envoyer.',
      'Give the published app’s address: without it, no link and no message to send.',
      'Geben Sie die Adresse der veröffentlichten App an: ohne sie kein Link und keine Nachricht zum Senden.',
      'Indique la dirección de la aplicación publicada: sin ella, ni enlace ni mensaje que enviar.'
    ],
    apTokenLink: ['Créer son jeton', 'Create their token', 'Token erstellen', 'Crear su token'],
    apTokenHint: ['Le lanceur crée le jeton avec celui de l’administrateur ; l’écran dit s’il manque.',
      'The launcher creates the token with the administrator’s; the screen says if it is missing.',
      'Der Starter erstellt das Token mit dem des Administrators; der Bildschirm sagt, wenn es fehlt.',
      'El lanzador crea el token con el del administrador; la pantalla dice si falta.'
    ],
    apManual: ['À la main, sans le lanceur', 'By hand, without the launcher', 'Von Hand, ohne den Starter',
      'A mano, sin el lanzador'
    ],
    apS1: ['Ouvrez {u}, la page des jetons d’accès du projet.', 'Open {u}, the project’s access tokens page.',
      'Öffnen Sie {u}, die Seite der Zugriffstoken des Projekts.', 'Abra {u}, la página de tokens de acceso del proyecto.'
    ],
    apS2: [
      'Remplissez : Token name = {tri} ; Expiration date = {d} (90 jours conseillés, 365 au plus, jamais sans date) ; Role = Developer ; Scopes = api (et rien d’autre).',
      'Fill in: Token name = {tri}; Expiration date = {d} (90 days advised, 365 at most, never without a date); Role = Developer; Scopes = api (nothing else).',
      'Füllen Sie aus: Token name = {tri}; Expiration date = {d} (90 Tage empfohlen, höchstens 365, nie ohne Datum); Role = Developer; Scopes = api (sonst nichts).',
      'Rellene: Token name = {tri}; Expiration date = {d} (90 días aconsejados, 365 como máximo, nunca sin fecha); Role = Developer; Scopes = api (nada más).'
    ],
    apS3: ['Cliquez « Create project access token », puis copiez le jeton tout de suite : GitLab ne le montre qu’une fois.',
      'Click “Create project access token”, then copy the token at once: GitLab shows it only once.',
      'Klicken Sie „Create project access token“ und kopieren Sie das Token sofort: GitLab zeigt es nur einmal.',
      'Pulse «Create project access token» y copie el token enseguida: GitLab lo muestra solo una vez.'
    ],
    apS4: [
      'Vérifiez que la branche des données laisse pousser les Developers (Settings › Repository › Protected branches : « Allowed to push and merge » = « Developers + Maintainers », force push désactivé), sinon les écritures échouent avec une erreur 403.',
      'Check that the data branch lets Developers push (Settings › Repository › Protected branches: “Allowed to push and merge” = “Developers + Maintainers”, force push off), otherwise writes fail with a 403 error.',
      'Prüfen Sie, dass der Datenzweig Developers pushen lässt (Settings › Repository › Protected branches: „Allowed to push and merge“ = „Developers + Maintainers“, Force-Push aus), sonst schlagen Schreibvorgänge mit einem 403-Fehler fehl.',
      'Compruebe que la rama de datos deja enviar a los Developers (Settings › Repository › Protected branches: «Allowed to push and merge» = «Developers + Maintainers», force push desactivado); si no, las escrituras fallan con un error 403.'
    ],
    apS5: ['Pour révoquer l’accès : Settings › Access tokens › Revoke, sur la ligne du trigramme.',
      'To revoke access: Settings › Access tokens › Revoke, on the trigram’s line.',
      'Zum Widerrufen des Zugriffs: Settings › Access tokens › Revoke, in der Zeile des Kürzels.',
      'Para revocar el acceso: Settings › Access tokens › Revoke, en la línea del trigrama.'
    ],
    apS6: ['Envoyez le jeton à part du message ci-dessous (un autre canal, ou collez-le devant le pilote), jamais avec le lien.',
      'Send the token apart from the message below (another channel, or paste it in front of the pilot), never with the link.',
      'Senden Sie das Token getrennt von der Nachricht unten (anderer Kanal, oder fügen Sie es vor dem Piloten ein), nie mit dem Link.',
      'Envíe el token aparte del mensaje de abajo (otro canal, o péguelo delante del piloto), nunca con el enlace.'
    ],
    apMsgTitle: ['Message à envoyer au pilote', 'Message to send to the pilot', 'Nachricht an den Piloten',
      'Mensaje para enviar al piloto'
    ],
    apHello: ['Bonjour {n},', 'Hello {n},', 'Hallo {n},', 'Hola {n},'],
    apHelloNo: ['Bonjour,', 'Hello,', 'Hallo,', 'Hola,'],
    apMsg: [
      'Voici l’application des pilotes : {app}\n\nOuvrez ce lien dans l’application : il la règle pour vous. Collez ensuite le jeton que je vous envoie séparément :\n{link}\n\nÀ bientôt.',
      'Here is the pilots’ app: {app}\n\nOpen this link in the app: it sets it up for you. Then paste the token I am sending you separately:\n{link}\n\nSee you soon.',
      'Hier ist die App der Piloten: {app}\n\nÖffnen Sie diesen Link in der App: Er richtet sie für Sie ein. Fügen Sie dann das Token ein, das ich Ihnen getrennt sende:\n{link}\n\nBis bald.',
      'Esta es la aplicación de los pilotos: {app}\n\nAbra este enlace en la aplicación: la configura por usted. Después pegue el token que le envío aparte:\n{link}\n\nHasta pronto.'
    ],
    // carte Administration (niveau Complet)
    admin: ['Administration', 'Administration', 'Verwaltung', 'Administración'],
    adminHint: ['Les pages d’administration et d’essai, réunies ici.', 'The administration and test pages, gathered here.',
      'Die Verwaltungs- und Testseiten, hier gesammelt.', 'Las páginas de administración y de prueba, reunidas aquí.'
    ],
    runwayZoom: ['Zoom des seuils de piste', 'Runway thresholds zoom', 'Zoomstufe der Pistenschwellen',
      'Zoom de los umbrales de pista'
    ],
    byDefault: ['par défaut', 'default', 'Standard', 'por defecto'],
    runwayHint: [
      'Pour toute la compagnie. La carte lit ce réglage avec les seuils (airline/map_profiles.json, clé runwayZoom) ; sans réglage, 11.',
      'For the whole airline. The map reads this setting with the thresholds (airline/map_profiles.json, key runwayZoom); with no setting, 11.',
      'Für die ganze Fluggesellschaft. Die Karte liest diese Einstellung mit den Schwellen (airline/map_profiles.json, Schlüssel runwayZoom); ohne Einstellung 11.',
      'Para toda la aerolínea. El mapa lee este ajuste con los umbrales (airline/map_profiles.json, clave runwayZoom); sin ajuste, 11.'
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
    linkOpen: ['Adresse à ouvrir ou à mettre en favori sur le téléphone :', 'Address to open or bookmark on the phone:',
      'Adresse zum Öffnen oder als Lesezeichen auf dem Telefon:', 'Dirección para abrir o guardar como favorito en el teléfono:'
    ]
  });

  // profils d'affichage de la compagnie (écrits par la page des seuils du module Carte) : les clés « edge » et « runwayZoom » y sont
  // les seules que cette carte écrit (frame/settings/INTEGRATION.md § 4) ; le reste du fichier est repris tel quel
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
  // zoom à partir duquel la carte dessine les seuils de piste (V3 § 10.30) : entier de RUNWAY_MIN à RUNWAY_MAX, RUNWAY_DEFAULT sans réglage
  const RUNWAY_MIN = 8,
    RUNWAY_MAX = 16,
    RUNWAY_DEFAULT = 11;
  // réglages sans fichier (ou carte non montrée) : le filet affiché, le zoom par défaut ; gelés (référence exportée, règle du cadre)
  const PROFILE_DEFAULTS = Object.freeze({
    edge: true,
    runwayZoom: RUNWAY_DEFAULT
  });
  /** Le zoom des seuils de piste lu dans le fichier (runwayZoom) : un entier dans les bornes, sinon la valeur par défaut. */
  const runwayZoomOf = f => Number.isInteger(f?.runwayZoom) && f.runwayZoom >= RUNWAY_MIN && f.runwayZoom <= RUNWAY_MAX ? f.runwayZoom :
    RUNWAY_DEFAULT;
  /** Lit airline/map_profiles.json d'un seul `get` : { edge (le filet de la limite de la zone du vol est affiché : edge.show,
   *  affiché par défaut), runwayZoom (le zoom à partir duquel la carte dessine les seuils de piste, 11 par défaut) }. */
  async function readProfiles(c) {
    const f = await profilesOf(c).get(PROFILES, {
      wait: true
    }).catch(() => null);
    return {
      edge: f?.edge?.show !== false,
      runwayZoom: runwayZoomOf(f)
    };
  }
  /** Enregistre un réglage dans airline/map_profiles.json sans toucher au reste du fichier (schema, seuils, profils, toute autre
   *  clé) ; patch : { edge: { show } } ou { runwayZoom } (hors des bornes : refusé). `by` et `updated_at` disent le dernier écrivain. */
  async function writeProfiles(c, patch) {
    if ('runwayZoom' in patch && (!Number.isInteger(patch.runwayZoom) || patch.runwayZoom < RUNWAY_MIN || patch.runwayZoom >
        RUNWAY_MAX)) throw new Error(
      `runwayZoom ${patch.runwayZoom}`);
    const data = profilesOf(c),
      cur = (await data.get(PROFILES, {
        wait: true
      }).catch(() => null)) || {};
    await data.put(PROFILES, {
      schema: 1,
      ...cur,
      ...('runwayZoom' in patch ? {
        runwayZoom: patch.runwayZoom
      } : {}),
      ...(patch.edge ? {
        edge: {
          ...(cur.edge && typeof cur.edge === 'object' ? cur.edge : {}),
          ...patch.edge
        }
      } : {}),
      by: 'settings',
      updated_at: now()
    });
  }

  /** Carte Administration (niveau Complet) : UN BOUTON par page d'administrateur (SogAdminLinks), sa phrase dessous ; un
   *  bouton qui porte un volet (edge, cfg) le déplie sous sa ligne. Bancs actifs seulement sur un poste avec lanceur
   *  (sinon un bouton grisé), pages V2 et volets du lanceur montrés seulement avec un lanceur. panels : { edge (le filet
   *  est affiché), cfg (HTML du volet, vide sans accès à exporter), remote (dépôt distant de data/, vide si data/ n'est pas
   *  un dépôt git), keys (clés d'API de la compagnie) } ; une ligne dont le volet est vide n'est pas montrée. */
  function adminCard(t, L, panels) {
    const links = window.SogAdminLinks || [];
    if (!links.length) return '';
    /** Panneau replié d'une ligne d'administration (edge : bord de publication, cfg : configuration). */
    const panel = x => `<div class="f-adminpanel" data-adminpanel="${esc(x.panel)}" hidden>${x.panel === 'edge' ? `<label class="f-check"><input type="checkbox" data-edge ${panels.edge ? 'checked' : ''}>${esc(t(T.edgeShow))}</label>
      <p class="f-muted">${esc(t(T.edgeHint))}</p><p class="f-msg" data-msg></p>` : x.panel === 'runway' ? `<label>${esc(t(T.runwayZoom))} <select data-runway-zoom>
      ${Array.from({ length: RUNWAY_MAX - RUNWAY_MIN + 1 }, (_, i) => RUNWAY_MIN + i).map(z => `<option value="${z}"${z === panels.runway ? ' selected' : ''}>${z}${z === RUNWAY_DEFAULT ? ` (${esc(t(T.byDefault))})` : ''}</option>`).join('')}</select></label>
      <p class="f-muted">${esc(t(T.runwayHint))}</p><p class="f-msg" data-msg></p>` : panels[x.panel] || ''}</div>`;
    /** Ligne de la liste d'administration : titre, lien, bouton de copie et panneau éventuel. */
    const row = x => {
      const label = esc(t(x.title)),
        out = x.href && !x.href.startsWith('#'),
        cls = `f-btn${x.primary ? ' primary' : ''}`;
      const btn = x.panel ? `<button type="button" class="${cls}" data-act="adminPanel" data-panel="${esc(x.panel)}" aria-expanded="false">${label}</button>` : x.act ?
        `<button type="button" class="${cls}" data-act="${esc(x.act)}">${label}</button>` : x.where === 'bench' && !L ? `<button type="button" class="${cls}" disabled>${label}</button>` :
        `<a class="${cls}" href="${esc(out ? new URL(x.href, ROOT).href : x.href)}"${out && !x.same ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`;
      // `copyLink` : sous le lien, l'adresse absolue de la page, construite depuis location (publiée sur GitHub Pages ou locale), à
      // ouvrir ou à mettre en favori sur le téléphone, copiable par un appui
      const abs = x.copyLink && x.href ? new URL(x.href, x.href.startsWith('#') ? location.href : ROOT).href : '',
        under = abs ? `<span class="f-muted f-admin-url">${esc(t(T.linkOpen))} <code data-adminurl>${esc(abs)}</code></span>
        <span class="f-row"><button type="button" data-act="adminCopy" data-text="${esc(abs)}">${esc(t(T.cfgCopy))}</button></span>` : '';
      return `<li data-admin="${esc(x.id)}">${btn}<span class="f-muted">${esc(t(x.text))}${x.where === 'bench' ? ` — ${esc(t(T.launcherOnly))}` : ''}</span>${under}${x.panel ? panel(x) : ''}</li>`;
    };
    const shown = links.filter(x => (!['v2', 'launcher'].includes(x.where) || L) && (!x.panel || x.panel === 'edge' || x.panel ===
      'runway' || panels[x.panel]));
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
  /** « Créer le fichier et le lien » : sog-config-<TRI>.json téléchargé, lien #settings?config=… affiché à copier. box : le volet (le volet d'export ou « Ajouter un pilote »), ids : les champs du trigramme et de l'adresse
   *  de l'appli ; rend { tri, link (vide sans adresse de l'appli valide), name } une fois le fichier fait, ou null si rien n'a été fait. */
  async function makeConfig(c, box, src, ids = {
    tri: 'cfgPilot',
    app: 'cfgApp'
  }) {
    const t = c.t,
      msg = (text, kind = 'err') => {
        const m = box.querySelector('[data-xmsg]');
        m.textContent = text;
        m.dataset.kind = kind;
      };
    const tri = box.querySelector(`[data-f="${ids.tri}"]`).value.trim().toUpperCase(),
      app = box.querySelector(`[data-f="${ids.app}"]`).value.trim();
    if (!/^[A-Z0-9]{2,5}$/.test(tri)) return void msg(t(T.badTrigram));
    let base = null;
    try {
      base = app ? new URL(app) : null;
    } catch {
      base = null;
    }
    if (base && !/^https?:$/.test(base.protocol)) base = null;
    // jamais un fournisseur deviné : inconnu, l'export est refusé (github ou gitlab, pas « other »)
    if (src && !SogConfig.PROVIDER_TABLE[src.provider]) return void msg(t(T.providerUnknown));
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
    let linkUrl = '';
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
      linkUrl = `${base.href}#settings?config=${await SogConfig.pack(short)}`;
      out.querySelector('[data-cfglink]').value = linkUrl;
      out.hidden = false;
      if (qr && window.SogQR) {
        try {
          qr.querySelector('div').innerHTML = SogQR.svg(linkUrl, {
            ecl: 'M',
            scale: 3
          });
          qr.hidden = false;
        } catch {
          qr.hidden = true; // lien trop long pour un code QR : le lien et le fichier restent
        }
      }
    } else {
      out.hidden = true;
      out.querySelector('[data-cfglink]').value = '';
    }
    msg([t(T.cfgMade, {
        f: name
      }), base && LOCAL.test(base.hostname) ? t(T.cfgLocal) : ''].filter(Boolean).join(' '), base && LOCAL.test(base.hostname) ?
      'warn' : 'ok');
    return {
      tri,
      link: linkUrl,
      name
    };
  }

  /** Les gestes de l'administrateur d'un export (l'invitation du pilote sur le dépôt, le fichier ou le lien, l'envoi) : le volet d'export et, pour un dépôt GitHub, « Ajouter un pilote »
   *  les montrent ; xsrc : le dépôt à exporter, ou null. */
  function exportSteps(t, xsrc) {
    const xl = xsrc?.provider ? SogConfig.links(xsrc) : null,
      xk = xl?.kind,
      xhost = xl ? xl.host : '',
      xinv = xl ? xl.invite : '';
    return `<h3>${esc(t(T.cfgSteps))}</h3><ol class="f-join-steps"><li>${xinv ? fill(t(xk === 'github' ? T.cfgInvite : T.cfgInviteGl), { h: esc(xhost), u: link(xinv) }) : esc(t(T.cfgInviteOther))}</li><li>${esc(t(T.cfgStepExport))}</li><li>${esc(t(T.cfgStepSend))}</li></ol>`;
  }
  /** Le bloc du lien d'import : le lien à copier, « Copier le lien » et le code QR ; caché jusqu'à ce que makeConfig l'ait rempli (le volet d'export et « Ajouter un pilote » le partagent). */
  const cfgOutHtml = t => `<div data-cfgout hidden><label class="f-field">${esc(t(T.cfgLink))}<textarea data-cfglink rows="3" readonly spellcheck="false"></textarea></label><div class="f-row"><button type="button" data-act="cfgCopy">${esc(t(T.cfgCopy))}</button></div><figure class="f-qr" data-cfgqr hidden><div></div><figcaption class="f-muted">${esc(t(T.cfgQr))}</figcaption></figure></div>`;
  /** Les langues du message à envoyer au pilote : [code, nom dans sa langue]. */
  const PILOT_LANGS = [
    ['fr', 'Français'],
    ['en', 'English'],
    ['de', 'Deutsch'],
    ['es', 'Español']
  ];
  /** Les gestes d'« Ajouter un pilote » : pour un dépôt GitLab, créer le jeton du projet du pilote (avec le lanceur : le lien vers l'écran des jetons, trigramme prérempli, et les gestes à la main
   *  repliés ; sans lanceur : les gestes à la main, ouverts) ; sinon les gestes de l'export (GitHub). tri : le trigramme du pilote. */
  function pilotSteps(env, tri) {
    const {
      t,
      L,
      xsrc
    } = env;
    if (SogConfig.kind(xsrc) !== 'gitlab') return exportSteps(t, xsrc);
    const day = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10), // la date d'expiration conseillée : aujourd'hui + 90 jours
      url = `${SogConfig.webUrl(xsrc)}/-/settings/access_tokens`,
      manual = `<ol class="f-join-steps"><li>${fill(t(T.apS1), { u: link(url) })}</li><li>${fill(t(T.apS2), { tri: `<b>${esc(tri)}</b>`, d: `<b>${esc(day)}</b>` })}</li><li>${esc(t(T.apS3))}</li><li>${esc(t(T.apS4))}</li><li>${esc(t(T.apS5))}</li><li>${esc(t(T.apS6))}</li></ol>`;
    return `<h3>${esc(t(T.cfgSteps))}</h3>${L ? `<p><a class="f-btn primary" href="?app=maintenance#pilot-tokens?tri=${esc(tri)}" data-aptoken>${esc(t(T.apTokenLink))}</a></p><p class="f-muted">${esc(t(T.apTokenHint))}</p><p class="f-muted">${esc(t(T.apS6))}</p>
      <details data-apmanual><summary>${esc(t(T.apManual))}</summary>${manual}</details>` : manual}`;
  }
  /** Le message à envoyer au pilote, en texte, dans la langue choisie (une ligne de texte par langue lue directement : `t` suit l'écran, pas ce choix) : le salut (avec le nom s'il est donné),
   *  l'adresse de l'appli et le lien de configuration ; jamais le jeton. */
  function pilotMessage(lang, name, app, linkUrl) {
    const i = Math.max(0, PILOT_LANGS.findIndex(l => l[0] === lang)),
      sub = (text, v) => text.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);
    return `${name ? sub(T.apHello[i], { n: name }) : T.apHelloNo[i]}\n\n${sub(T.apMsg[i], { app, link: linkUrl })}`;
  }
  /** Redessine le message du volet « Ajouter un pilote » d'après les champs (langue, nom) et le lien de configuration déjà fait ; caché sans lien. */
  function drawPilotMessage(box) {
    const linkUrl = box.querySelector('[data-cfglink]').value,
      area = box.querySelector('[data-apmsg]'),
      wrap = box.querySelector('[data-apmessage]');
    wrap.hidden = !linkUrl;
    if (!linkUrl) return;
    area.value = pilotMessage(box.querySelector('[data-f="apLang"]').value, box.querySelector('[data-f="apName"]').value.trim(), linkUrl
      .split('#')[0], linkUrl);
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
      // fournisseur : celui de l'adresse du dépôt distant de data/ (même fonction que le volet du dépôt distant : hôte public, ou
      // hôte donné par la configuration de l'appareil), ou celui de l'accès de l'appareil sans lanceur ; null s'il est inconnu (l'export
      // est alors refusé) ; il part dans la configuration pour que le côté du pilote s'ouvre dessus
      provider: L ? SogConfig.providerOf(remote.url, env.known).provider : SogConfig.kind(gh) // jamais d'api : l'export n'en écrit pas
    } : null;
    const cfgSteps = exportSteps(t, xsrc);
    const cfgOut = window.SogConfig && (L || gh) ? `<div class="f-cfgx" data-cfgx>${cfgSteps}
      ${xsrc ? '' : `<p class="f-warn">${esc(t(T.cfgNoRepo))}</p>`}${xsrc && !xsrc.provider ? `<p class="f-warn">${esc(t(T.providerUnknown))}</p>` : ''}${fld('cfgPilot', T.cfgPilot, '', { cap: true, ph: 'ABC' })}${fld('cfgApp', T.cfgApp, appUrl(), { ph: 'https://…/v3/frame/' })}
      <div class="f-row"><button type="button" class="primary" data-act="cfgMake">${esc(t(T.cfgMake))}</button></div><p class="f-msg" data-xmsg></p>
      ${cfgOutHtml(t)}</div>` : '';
    env.xsrc = xsrc;
    return cfgOut;
  }
  /** Volet « Ajouter un pilote » de la carte Administration : le trigramme, le nom (facultatif), la langue du message (celle de l'écran par défaut), l'adresse de l'appli, « Préparer » ; sous lui
   *  le lien et le fichier de l'export (makeConfig), les gestes de l'administrateur et le message à envoyer. Vide là où l'export est impossible (env.xsrc, posé par cfgPanel : le même dépôt). */
  function addPilotPanel(env) {
    const {
      t,
      fld,
      xsrc
    } = env;
    if (!window.SogConfig || !xsrc) return '';
    const mine = t(['fr', 'en', 'de', 'es']);
    return `<div class="f-cfgx" data-addpilot>${xsrc.provider ? '' : `<p class="f-warn">${esc(t(T.providerUnknown))}</p>`}${fld('apTri', T.cfgPilot, '', { cap: true, ph: 'ABC' })}${fld('apName', T.apName, '')}
      <label class="f-field">${esc(t(T.apLang))}<select data-f="apLang">${PILOT_LANGS.map(([code, name]) => `<option value="${code}"${code === mine ? ' selected' : ''}>${name}</option>`).join('')}</select></label>
      ${fld('apApp', T.cfgApp, appUrl(), { ph: 'https://…/v3/frame/' })}
      <div class="f-row"><button type="button" class="primary" data-act="pilotMake">${esc(t(T.apPrepare))}</button></div><p class="f-msg" data-xmsg></p>
      ${cfgOutHtml(t)}<div data-apsteps></div>
      <div data-apmessage hidden><h3>${esc(t(T.apMsgTitle))}</h3><label class="f-field"><textarea data-apmsg rows="9" readonly spellcheck="false" aria-label="${esc(t(T.apMsgTitle))}"></textarea></label><div class="f-row"><button type="button" data-act="pilotCopyMsg">${esc(t(T.copy))}</button></div></div></div>`;
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
    // zoom des seuils de piste (carte Administration) : enregistré aussitôt, pour la compagnie
    view.querySelector('[data-runway-zoom]')?.addEventListener('change', async e => {
      const sel = e.target,
        before = sel.dataset.was || String(RUNWAY_DEFAULT);
      sel.disabled = true;
      try {
        await writeProfiles(c, {
          runwayZoom: Number(sel.value)
        });
        sel.dataset.was = sel.value;
        say('admin', '');
        c.notify(t(T.saved), 'ok');
      } catch (err) {
        sel.value = before;
        say('admin', err?.message || String(err));
      }
      sel.disabled = false;
    });
    // « Ajouter un pilote » : la langue ou le nom change, le message est refait (sans rien refaire d'autre)
    for (const [sel, ev] of [
        ['[data-addpilot] [data-f="apLang"]', 'change'],
        ['[data-addpilot] [data-f="apName"]', 'input']
      ])
      view.querySelector(sel)?.addEventListener(ev, e => drawPilotMessage(e.target.closest('[data-addpilot]')));
    view.querySelector('[data-edge]')?.addEventListener('change', async e => {
      const box = e.target;
      box.disabled = true;
      try {
        await writeProfiles(c, {
          edge: {
            show: box.checked
          }
        });
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
      return c.notify(t(how === 'shown' ? T.copyShown : T.cfgCopied), how === 'shown' ? 'warn' : 'ok');
    }
    if (act === 'adminPanel') {
      // bouton de la carte Administration : déplie (ou replie) le volet de sa ligne
      const p = view.querySelector(`[data-adminpanel="${CSS.escape(b.dataset.panel)}"]`);
      if (!p) return;
      p.hidden = !p.hidden;
      b.setAttribute('aria-expanded', String(!p.hidden));
      return;
    }
    if (act === 'cfgMake') return void await makeConfig(c, b.closest('[data-cfgx]'), env.xsrc);
    if (act === 'pilotMake') {
      // « Préparer » : le fichier et le lien (le même export), puis les gestes de l'administrateur et le message à envoyer
      const box = b.closest('[data-addpilot]'),
        made = await makeConfig(c, box, env.xsrc, {
          tri: 'apTri',
          app: 'apApp'
        });
      if (!made) return;
      box.querySelector('[data-apsteps]').innerHTML = pilotSteps(env, made.tri);
      if (!made.link) box.querySelector('[data-xmsg]').textContent = t(T.apNeedApp);
      return drawPilotMessage(box);
    }
    if (act === 'pilotCopyMsg') {
      const area = b.closest('[data-addpilot]').querySelector('[data-apmsg]'),
        how = await copy(area.value, {
          box: area
        });
      return c.notify(t(how === 'shown' ? T.copyShown : T.cfgCopied), how === 'shown' ? 'warn' : 'ok');
    }
    if (act === 'cfgCopy') {
      const box = b.closest('[data-cfgout]').querySelector('[data-cfglink]'),
        how = await copy(box?.value || '', {
          box
        });
      return c.notify(t(how === 'shown' ? T.copyShown : T.cfgCopied), how === 'shown' ? 'warn' : 'ok');
    }
  }

  (window.SogSettingsParts ||= {}).admin = {
    acts: ['adminCopy', 'adminPanel', 'cfgMake', 'cfgCopy', 'pilotMake', 'pilotCopyMsg'],
    readProfiles,
    PROFILE_DEFAULTS,
    adminCard,
    cfgPanel,
    addPilotPanel,
    live,
    run
  };
})();
