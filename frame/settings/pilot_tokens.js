(() => {
  'use strict';
  // V3 — écran « Jetons des pilotes » (écran de service de l'application Maintenance, #pilot-tokens, niveau Complet ; G2,
  // 29 oct. 2026 ; frame/SPEC.md, frame/INTEGRATION.md § 13). Le dépôt des données est sur GitLab : chaque pilote reçoit un
  // jeton d'accès de PROJET à son trigramme, que l'administrateur crée ici et lui donne ; le pilote le colle une fois dans
  // Réglages › Accès aux données avec l'adresse du projet. Le lanceur du poste fait les appels avec le jeton de
  // l'administrateur (secrets/gitlab.json), qu'il ne rend jamais : routes gitlab/tokens (liste, création),
  // gitlab/tokens/revoke (révocation) et gitlab/admin (le jeton de l'administrateur posé ici et testé : qui, portées,
  // expiration, rôle dans le projet ; 1er nov. 2026). Le jeton d'un pilote n'est montré qu'une fois, à sa création, et
  // jamais gardé ici ; celui de l'administrateur n'est jamais relu par la page.
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
      'Aucun jeton de l’administrateur sur ce poste : collez-le ci-dessous, dans « Jeton de l’administrateur ».',
      'No administrator’s token on this computer: paste it below, in “Administrator’s token”.',
      'Kein Token des Administrators auf diesem Rechner: Fügen Sie es unten unter „Token des Administrators“ ein.',
      'Ningún token del administrador en este equipo: péguelo abajo, en «Token del administrador».'
    ],
    // les refus de GitLab, par raison (le lanceur la nomme : gitlab_refusal)
    refused: [
      'Jeton de l’administrateur refusé : absent, expiré ou sans la portée api — refaites-le et collez-le ci-dessous, dans « Jeton de l’administrateur ».',
      'Administrator’s token refused: missing, expired or without the api scope — make it again and paste it below, in “Administrator’s token”.',
      'Token des Administrators abgelehnt: fehlt, abgelaufen oder ohne den Bereich api — erstellen Sie es neu und fügen Sie es unten unter „Token des Administrators“ ein.',
      'Token del administrador rechazado: ausente, caducado o sin el alcance api — vuelva a crearlo y péguelo abajo, en «Token del administrador».'
    ],
    noScope: [
      'Jeton de l’administrateur sans la portée api : refaites-le avec la portée api et collez-le ci-dessous.',
      'Administrator’s token without the api scope: make it again with the api scope and paste it below.',
      'Token des Administrators ohne den Bereich api: Erstellen Sie es mit dem Bereich api neu und fügen Sie es unten ein.',
      'Token del administrador sin el alcance api: vuelva a crearlo con el alcance api y péguelo abajo.'
    ],
    noLevel: [
      'Ce compte n’est pas Maintainer du projet : donnez-lui le rôle Maintainer ou Owner (projet › Manage › Members).',
      'This account is not Maintainer of the project: give it the Maintainer or Owner role (project › Manage › Members).',
      'Dieses Konto ist nicht Maintainer des Projekts: Geben Sie ihm die Rolle Maintainer oder Owner (Projekt › Manage › Members).',
      'Esta cuenta no es Maintainer del proyecto: dele el rol Maintainer u Owner (proyecto › Manage › Members).'
    ],
    noProject: [
      'Projet introuvable ou jeton sans accès : vérifiez le projet (groupe/projet) et que ce compte en est membre.',
      'Project not found or token without access: check the project (group/project) and that this account is a member of it.',
      'Projekt nicht gefunden oder Token ohne Zugriff: Prüfen Sie das Projekt (Gruppe/Projekt) und dass dieses Konto Mitglied ist.',
      'Proyecto no encontrado o token sin acceso: compruebe el proyecto (grupo/proyecto) y que esta cuenta es miembro.'
    ],
    tokenRequired: [
      'Autre instance GitLab : collez aussi le jeton de cette instance (celui d’avant ne vaut que pour la sienne).',
      'Another GitLab instance: paste this instance’s token too (the previous one is only valid for its own).',
      'Andere GitLab-Instanz: Fügen Sie auch das Token dieser Instanz ein (das bisherige gilt nur für seine eigene).',
      'Otra instancia de GitLab: pegue también el token de esta instancia (el anterior solo vale para la suya).'
    ],
    badForm: [
      'Attendus : une instance en https, un projet « groupe/projet » et un jeton.',
      'Expected: an https instance, a “group/project” project and a token.',
      'Erwartet: eine https-Instanz, ein Projekt „Gruppe/Projekt“ und ein Token.',
      'Se esperan una instancia https, un proyecto «grupo/proyecto» y un token.'
    ],
    // le jeton de l'administrateur : ce qu'il faut, où le coller, le tester
    admin: ['Jeton de l’administrateur', 'Administrator’s token', 'Token des Administrators', 'Token del administrador'],
    adminNeed: [
      'Un jeton d’accès personnel de votre compte GitLab (Préférences › Jetons d’accès), portée api, avec une expiration (un an au plus) ; ce compte doit être Maintainer ou Owner du projet. Il reste dans le lanceur de ce poste et n’est jamais réaffiché.',
      'A personal access token of your GitLab account (Preferences › Access tokens), scope api, with an expiry (one year at most); this account must be Maintainer or Owner of the project. It stays in this computer’s launcher and is never shown again.',
      'Ein persönliches Zugangstoken Ihres GitLab-Kontos (Preferences › Access tokens), Bereich api, mit Ablaufdatum (höchstens ein Jahr); dieses Konto muss Maintainer oder Owner des Projekts sein. Es bleibt im Starter dieses Rechners und wird nie wieder angezeigt.',
      'Un token de acceso personal de su cuenta de GitLab (Preferences › Access tokens), alcance api, con caducidad (un año como máximo); esta cuenta debe ser Maintainer u Owner del proyecto. Se queda en el lanzador de este equipo y no se vuelve a mostrar.'
    ],
    fInst: ['Instance (vide : celle du dépôt des données)', 'Instance (empty: the data repository’s)',
      'Instanz (leer: die des Datenrepositorys)',
      'Instancia (vacía: la del repositorio de datos)'
    ],
    fProj: ['Projet, groupe/projet (vide : celui du dépôt des données)', 'Project, group/project (empty: the data repository’s)',
      'Projekt, Gruppe/Projekt (leer: das des Datenrepositorys)', 'Proyecto, grupo/proyecto (vacío: el del repositorio de datos)'
    ],
    fTok: ['Jeton (vide : celui déjà enregistré)', 'Token (empty: the one already saved)', 'Token (leer: das bereits gespeicherte)',
      'Token (vacío: el ya guardado)'
    ],
    adminSave: ['Enregistrer et tester', 'Save and test', 'Speichern und testen', 'Guardar y probar'],
    adminTest: ['Tester le jeton de l’administrateur', 'Test the administrator’s token', 'Token des Administrators testen',
      'Probar el token del administrador'
    ],
    adminSaved: ['Jeton de l’administrateur enregistré.', 'Administrator’s token saved.', 'Token des Administrators gespeichert.',
      'Token del administrador guardado.'
    ],
    who: [
      'Compte {u} : rôle {l} dans le projet, portées {s}, {e}.',
      'Account {u}: role {l} in the project, scopes {s}, {e}.',
      'Konto {u}: Rolle {l} im Projekt, Bereiche {s}, {e}.',
      'Cuenta {u}: rol {l} en el proyecto, alcances {s}, {e}.'
    ],
    noExpiry: ['sans expiration', 'no expiry', 'ohne Ablaufdatum', 'sin caducidad'],
    unreadable: ['illisibles', 'unreadable', 'nicht lesbar', 'ilegibles'],
    noRole: ['aucun', 'none', 'keine', 'ninguno'],
    adminGood: [
      'Ce jeton peut créer et révoquer les jetons des pilotes.',
      'This token can create and revoke the pilots’ tokens.',
      'Dieses Token kann die Token der Piloten erstellen und widerrufen.',
      'Este token puede crear y revocar los tokens de los pilotos.'
    ],
    // la branche des données : sur gitlab.com, la branche par défaut est protégée (push aux Maintainers) et refuse les jetons
    // des pilotes (rôle Developer) ; l'administrateur l'ouvre d'ici, après une question (1er nov. 2026)
    bClosed: [
      'Branche {b} : push réservé aux Maintainers — les pilotes ne pourront pas écrire.',
      'Branch {b}: push reserved to Maintainers — the pilots will not be able to write.',
      'Zweig {b}: Push nur für Maintainer — die Piloten werden nicht schreiben können.',
      'Rama {b}: push reservado a los Maintainers — los pilotos no podrán escribir.'
    ],
    bOpen: [
      'Branche {b} : ouverte aux Developers, les pilotes peuvent y écrire.',
      'Branch {b}: open to Developers, the pilots can write to it.',
      'Zweig {b}: für Developer offen, die Piloten können dorthin schreiben.',
      'Rama {b}: abierta a los Developers, los pilotos pueden escribir en ella.'
    ],
    bBtn: ['Ouvrir la branche aux Developers', 'Open the branch to Developers', 'Zweig für Developer öffnen',
      'Abrir la rama a los Developers'
    ],
    bAsk: [
      'Ouvrir la branche {b} aux Developers ? Les jetons des pilotes (rôle Developer) pourront y pousser ; la fusion et la poussée forcée ne changent pas.',
      'Open the branch {b} to Developers? The pilots’ tokens (Developer role) will be able to push to it; merging and force push do not change.',
      'Den Zweig {b} für Developer öffnen? Die Token der Piloten (Rolle Developer) können dorthin pushen; Zusammenführen und erzwungenes Pushen ändern sich nicht.',
      '¿Abrir la rama {b} a los Developers? Los tokens de los pilotos (rol Developer) podrán enviar a ella; la fusión y el envío forzado no cambian.'
    ],
    bAskFirst: [
      'La branche {b} est réservée aux Maintainers : le jeton de ce pilote ne pourra pas y écrire. L’ouvrir aux Developers avant de créer le jeton ?',
      'The branch {b} is reserved to Maintainers: this pilot’s token will not be able to write to it. Open it to Developers before creating the token?',
      'Der Zweig {b} ist Maintainern vorbehalten: Das Token dieses Piloten kann dort nicht schreiben. Vor dem Erstellen des Tokens für Developer öffnen?',
      'La rama {b} está reservada a los Maintainers: el token de este piloto no podrá escribir en ella. ¿Abrirla a los Developers antes de crear el token?'
    ],
    bDone: ['Branche {b} ouverte aux Developers.', 'Branch {b} open to Developers.', 'Zweig {b} für Developer geöffnet.',
      'Rama {b} abierta a los Developers.'
    ],
    // la liste, sous le jeton créé ou sous le formulaire : repliée, avec son nombre
    existing: ['Jetons existants ({n})', 'Existing tokens ({n})', 'Vorhandene Token ({n})', 'Tokens existentes ({n})'],
    createdOn: ['créé le {d}', 'created on {d}', 'erstellt am {d}', 'creado el {d}'],
    justNow: ['créé à l’instant', 'created just now', 'gerade erstellt', 'creado ahora mismo'],
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
    days: ['Durée (jours, 365 au plus)', 'Lifetime (days, 365 at most)', 'Laufzeit (Tage, höchstens 365)',
      'Duración (días, 365 como máximo)'
    ],
    make: ['Créer le jeton', 'Create the token', 'Token erstellen', 'Crear el token'],
    // la carte du jeton qui vient d'être créé : seule en haut de l'écran
    madeTitle: ['Jeton de {n} créé', 'Token for {n} created', 'Token für {n} erstellt', 'Token de {n} creado'],
    copyNow: [
      'Copiez-le maintenant : il ne sera plus affiché. Valable jusqu’au {d}.',
      'Copy it now: it will not be shown again. Valid until {d}.',
      'Kopieren Sie es jetzt: Es wird nicht wieder angezeigt. Gültig bis {d}.',
      'Cópielo ahora: no se volverá a mostrar. Válido hasta el {d}.'
    ],
    toPilot: [
      'À dire au pilote, en lui donnant le jeton par un canal sûr (jamais dans un message public) : collez-le dans Réglages › Accès aux données, avec l’adresse du projet.',
      'To tell the pilot, giving them the token through a safe channel (never in a public message): paste it in Settings › Data access, with the project’s address.',
      'Dem Piloten zu sagen, wenn Sie ihm das Token über einen sicheren Weg geben (nie in einer öffentlichen Nachricht): Fügen Sie es unter Einstellungen › Datenzugang mit der Adresse des Projekts ein.',
      'Para decir al piloto, entregándole el token por un canal seguro (nunca en un mensaje público): péguelo en Ajustes › Acceso a los datos, con la dirección del proyecto.'
    ],
    toMessage: ['Le message pour le pilote (« Ajouter un pilote »)', 'The message for the pilot (“Add a pilot”)',
      'Die Nachricht für den Piloten („Pilot hinzufügen“)', 'El mensaje para el piloto («Añadir un piloto»)'
    ],
    another: ['Créer un autre jeton', 'Create another token', 'Weiteres Token erstellen', 'Crear otro token'],
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
    // un refus dit par sa raison (nommée par le lanceur), le message de GitLab tel quel sinon
    const REASON = {
      secret: T.noSecret,
      refused: T.refused,
      scope: T.noScope,
      level: T.noLevel,
      project: T.noProject,
      form: T.badForm,
      'token-required': T.tokenRequired,
      offline: T.offline
    };
    const why = r => r?.offline ? t(T.offline) : REASON[r?.reason] ? t(REASON[r.reason]) : r?.status === 409 ? t(T.noSecret) : t(T
      .failed, {
        m: r?.message || r?.status || ''
      });
    // ce que le refus demande à l'administrateur : le jeton de l'administrateur (ouvert sous la liste) ou rien
    const ADMIN_FIX = new Set(['secret', 'refused', 'scope', 'level', 'project', 'form', 'token-required']);
    const day = iso => iso ? String(iso).slice(0, 10) : '';
    const ROLE = {
      10: 'Guest',
      20: 'Reporter',
      30: 'Developer',
      40: 'Maintainer',
      50: 'Owner'
    };
    // résultat de « Tester » : qui, rôle, portées, expiration, puis ce qui manque (ou que tout va)
    const said = v => {
      if (!v) return '';
      if (!Array.isArray(v.problems)) return `<p class="f-msg" data-kind="err" data-admin-result="refused">${esc(why(v))}</p>`;
      const who = t(T.who, {
        u: v.username || '?',
        l: ROLE[v.level] || (v.level ? String(v.level) : t(T.noRole)),
        s: v.scopes ? v.scopes.join(', ') || '—' : t(T.unreadable),
        e: v.expires ? t(K.expires, {
          d: day(v.expires)
        }) : t(T.noExpiry)
      });
      const lines = v.problems.map(p => t(p === 'scope' ? T.noScope : T.noLevel));
      return `<p class="f-msg" data-kind="${v.ok ? 'ok' : 'err'}" data-admin-result="${v.ok ? 'ok' : v.problems.join(' ')}">${esc(who)}<br>${esc(v.ok ? t(T.adminGood) : lines.join(' '))}</p>${branchLine(v.branch)}`;
    };
    // la branche des données : fermée aux Developers, dite avec le bouton qui l'ouvre ; ouverte, dite en gris
    const branchLine = b => !b ? '' : b.open ? `<p class="f-muted" data-branch="open">${esc(t(T.bOpen, { b: b.name }))}</p>` :
      `<p class="f-msg" data-kind="warn" data-branch="closed">${esc(t(T.bClosed, { b: b.name }))}
        <button type="button" data-act="bopen" data-name="${esc(b.name)}">${esc(t(T.bBtn))}</button></p>`;
    let branchNow, // dernier état lu de la branche (undefined : pas encore lu)
      pilots = 0, // jetons de pilote actifs du dernier dessin (0 : le prochain est le premier)
      drawn = 0;
    /** La branche ouverte aux Developers par le lanceur (après la question de l'appelant) ; vrai si c'est fait. */
    async function openBranch(name) {
      const v = await R.call('gitlab/admin/branch', {});
      if (v?.ok === false) {
        ctx.notify?.(why(v), 'err');
        return false;
      }
      branchNow = v?.branch || branchNow;
      ctx.notify?.(t(T.bDone, {
        b: name
      }), 'ok');
      return true;
    }
    const adminBlock = (open, tested) => `<details data-admintoken${open ? ' open' : ''}><summary>${esc(t(T.admin))}</summary>
        <p class="f-muted">${esc(t(T.adminNeed))}</p><p class="f-muted">${esc(t(T.branch))}</p>
        <label class="f-field">${esc(t(T.fInst))}<input data-f="ainst" autocomplete="off" spellcheck="false" placeholder="https://gitlab.com"></label>
        <label class="f-field">${esc(t(T.fProj))}<input data-f="aproj" autocomplete="off" spellcheck="false"></label>
        <label class="f-field">${esc(t(T.fTok))}<input data-f="atok" type="password" autocomplete="off" spellcheck="false"></label>
        <div class="f-row"><button type="button" class="primary" data-act="asave">${esc(t(T.adminSave))}</button>
        <button type="button" data-act="atest">${esc(t(T.adminTest))}</button></div><div data-admin-msg>${said(tested)}</div></details>`;
    // une ligne de la liste : le trigramme d'abord, puis la création, l'expiration, l'état (« jamais utilisé » en dernier) ;
    // le jeton qui vient d'être créé dit « créé à l'instant » (Simplification, 1er nov. 2026 : « jamais utilisé » en tête
    // d'une ligne neuve faisait peur)
    const rowOf = (x, fresh) => {
      const state = x.revoked ? t(T.revoked) : !x.active ? t(T.inactive) : fresh && x.id === fresh.id ? t(T.justNow) : x.used ? t(K
        .used, {
          d: day(x.used)
        }) : t(T.never);
      return `<li data-token="${esc(x.id)}"${fresh && x.id === fresh.id ? ' data-token-fresh' : ''}><b>${esc(x.name)}</b>
        <span class="f-muted">${esc([x.created ? t(T.createdOn, { d: day(x.created) }) : '', x.expires ? t(K.expires, { d: day(x.expires) }) : '', state]
          .filter(Boolean).join(' · '))}</span>
        ${x.active && !x.revoked ? `<button type="button" data-act="revoke" data-id="${esc(x.id)}" data-name="${esc(x.name)}">${esc(t(K.revoke))}</button>` : ''}</li>`;
    };
    // à l'ouverture, sept éléments au plus : le titre, l'introduction, le formulaire (trigramme, durée, « Créer »), la liste
    // repliée, le jeton de l'administrateur replié quand la liste se lit (il est posé et répond) ; après « Créer », la carte
    // du jeton seule en haut, la liste repliée dessous, « Créer un autre jeton » (qui redessine : la valeur s'efface)
    async function draw(fresh = null, tested = null) {
      const seq = ++drawn;
      const r = await R.call('gitlab/tokens');
      if (!view.isConnected) return;
      if (r?.ok === false) {
        body.innerHTML = `<p class="f-msg" data-kind="${r.status === 409 || r.reason === 'secret' ? 'warn' : 'err'}" data-tokens-error="${esc(r.reason || '')}">${esc(why(r))}</p>
          ${adminBlock(true, tested)}`;
        return;
      }
      const list = r.tokens || [],
        rows = list.map(x => rowOf(x, fresh)).join('');
      pilots = list.filter(x => x.active && !x.revoked && /^[A-Z0-9]{2,5}$/.test(x.name)).length;
      const listBlock = `<details data-tokens-existing><summary>${esc(t(T.existing, { n: list.length }))}</summary>
        ${rows ? `<ul class="f-list" data-tokens-list>${rows}</ul>` : `<p class="f-muted">${esc(t(T.none))}</p>`}</details>`;
      body.innerHTML = fresh ? `<div class="f-msg" data-kind="ok" data-tokens-new><h3>${esc(t(T.madeTitle, { n: fresh.name }))}</h3>
          <div class="f-row"><input data-token-value readonly spellcheck="false" autocomplete="off" value="${esc(fresh.token)}">
          <button type="button" class="primary" data-act="copy">${esc(t(K.copy))}</button></div>
          <p><b>${esc(t(T.copyNow, { d: day(fresh.expires) }))}</b></p><p>${esc(t(T.toPilot))}</p>
          <p><a href="#settings?card=admin&amp;panel=addPilot" data-tokens-message>${esc(t(T.toMessage))}</a></p></div>
        ${listBlock}<div class="f-row"><button type="button" data-act="another">${esc(t(T.another))}</button></div>` : `<label class="f-field">${esc(t(K.cfgPilot))}<input data-f="tri" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="5"></label>
        <label class="f-field">${esc(t(T.days))}<input data-f="days" type="number" min="1" max="365" value="365"></label>
        <p class="f-msg" data-msg></p><div class="f-row"><button type="button" class="primary" data-act="make">${esc(t(T.make))}</button></div>
        ${listBlock}${adminBlock(!!tested, tested)}`;
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
      // la branche des données lue en fond (le test du jeton de l'administrateur) : fermée aux Developers, la ligne et son
      // bouton en tête de l'écran ; ouverte, rien de plus à l'ouverture
      if (!fresh) R.call('gitlab/admin').then(v => {
        if (!view.isConnected || seq !== drawn) return;
        branchNow = v?.branch ?? null;
        if (branchNow && !branchNow.open) body.insertAdjacentHTML('afterbegin', branchLine(branchNow));
      });
    }
    body.onclick = async e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'copy') {
        const CB = await import(new URL('../lib/clipboard.js', BASE).href).catch(() => null);
        const v = body.querySelector('[data-token-value]')?.value || '';
        if (CB?.copyText) await CB.copyText(v, {
          near: b
        });
        else await navigator.clipboard?.writeText(v);
        return ctx.notify?.(t(T.copied), 'ok');
      }
      if (b.dataset.act === 'another') return draw();
      if (b.dataset.act === 'bopen') {
        if (!await ctx.ask(t(T.bAsk, {
            b: b.dataset.name
          }))) return;
        b.disabled = true;
        const done = await openBranch(b.dataset.name);
        b.disabled = false;
        if (done && view.isConnected) return draw();
        return;
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
        // le premier jeton de pilote sur une branche fermée aux Developers : la question avant de créer, jamais d'ouverture
        // silencieuse ; « non » crée le jeton quand même (il lira, sans écrire)
        if (!pilots) {
          const st = branchNow === undefined ? (await R.call('gitlab/admin'))?.branch : branchNow;
          if (st && !st.open && await ctx.ask(t(T.bAskFirst, {
              b: st.name
            }))) await openBranch(st.name);
        }
        const v = await R.call('gitlab/tokens', {
          trigram: tri,
          days
        });
        b.disabled = false;
        if (v?.ok === false) {
          msg.textContent = why(v);
          if (ADMIN_FIX.has(v.reason)) body.querySelector('[data-admintoken]')?.setAttribute('open', '');
          return;
        }
        return draw(v);
      }
      // le jeton de l'administrateur : enregistré par le lanceur puis testé (champ vide : inchangé) ; un nouveau dessin
      // efface le champ, la valeur n'est jamais relue
      if (b.dataset.act === 'asave' || b.dataset.act === 'atest') {
        const box = body.querySelector('[data-admin-msg]'),
          f = k => (body.querySelector(`[data-f=${k}]`)?.value || '').trim();
        b.disabled = true;
        const v = b.dataset.act === 'atest' ? await R.call('gitlab/admin') : await R.call('gitlab/admin', {
          instance: f('ainst'),
          project: f('aproj'),
          token: f('atok')
        });
        b.disabled = false;
        if (!view.isConnected) return;
        if (b.dataset.act === 'asave' && v?.saved) {
          ctx.notify?.(t(T.adminSaved), 'ok');
          return draw(null, v);
        }
        if (box) box.innerHTML = said(v);
      }
    };
    // « Ajouter un pilote » (Administration) mène ici avec le trigramme : #pilot-tokens?tri=ABC remplit le champ du trigramme
    const asked = (new URLSearchParams(location.hash.split('?')[1] || '').get('tri') || '').trim().toUpperCase();
    draw().then(() => {
      const f = body.querySelector('[data-f=tri]');
      if (f && /^[A-Z0-9]{2,5}$/.test(asked)) f.value = asked;
    });
  }
  (window.SogScreens ||= {})['pilot-tokens'] = {
    screen
  };
})();
