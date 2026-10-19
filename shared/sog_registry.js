(() => {
  'use strict';
  // Registre signé des utilisateurs (comptes signés, lot L3 ; docs/technique/COMPTES_SIGNES.md § 2, 5 et 6).
  //   data/utilisateurs/_registre.json : enveloppe { sog: 'signe/1', contenu, signatures } (shared/sog_keys.js) dont le
  //   contenu donne, pour chaque trigramme, le nom, le rôle, l'état actif, l'empreinte du mot de passe et les clés de
  //   poste ; plus la clé de secours, l'état du groupe (constitution / actif) et la chaîne des versions (precedente :
  //   SHA-256 du contenu canonique de la version précédente).
  //   Chaque navigateur vérifie chaque version : signée par un admin (ou la clé de secours) de la version acceptée,
  //   numéro suivant, chaîne intacte ; jamais de retour en arrière (dernière version acceptée gardée dans IndexedDB,
  //   magasin « registre » de sogKeys). La fondation (version 1) est acceptée à la première lecture si l'empreinte de
  //   son signataire est confirmée sur le poste (comparée à celle reçue par un autre canal) ; une refondation (autre
  //   groupe) demande la même confirmation. Une version refusée est signalée (notification, Paramètres › Centre ›
  //   Mode groupe) et le poste garde la précédente.
  //   En mode groupe (data/config/centre.json, mode « groupe »), rôles, état et mots de passe viennent du registre
  //   accepté (shared/users.js) ; leur changement est une nouvelle version signée par un admin.
  if (window.SogRegistry) return;
  const K = window.RepositoryKit;
  const FILE = 'utilisateurs/_registre.json',
    CENTRE = 'config/centre.json',
    ADMIN = 'admin_centre';
  const S = () => window.SogKeys,
    A = () => window.MissionAssignments,
    nav = () => window.RepositoryNav;
  /** Ligne fr / en / de / es dans la langue de la page ({x} remplacés par vars). */
  const tr = (row, vars = {}) => K?.tf ? K.tf(row, vars) : String(row[0]).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const norm = tri => String(tri || '').trim().toUpperCase();

  // ---- raisons (refus d'une version, refus d'une action) : textes à la source, 4 langues
  const WHY = {
    format: ['fichier illisible ou mal formé', 'unreadable or malformed file', 'Datei unlesbar oder fehlerhaft',
      'archivo ilegible o mal formado'
    ],
    ancienne: ['version plus ancienne que celle acceptée', 'version older than the accepted one',
      'Version älter als die akzeptierte', 'versión más antigua que la aceptada'
    ],
    saut: ['versions intermédiaires introuvables (historique git)', 'intermediate versions not found (git history)',
      'Zwischenversionen nicht gefunden (Git-Historie)', 'versiones intermedias no encontradas (historial git)'
    ],
    refonte: ['registre refondé (autre groupe) sans sa version 1', 're-founded registry (other group) without its version 1',
      'neu gegründetes Register (andere Gruppe) ohne Version 1', 'registro refundado (otro grupo) sin su versión 1'
    ],
    chaine: ['chaîne des versions rompue (version précédente différente)',
      'version chain broken (different previous version)', 'Versionskette unterbrochen (andere Vorversion)',
      'cadena de versiones rota (versión anterior distinta)'
    ],
    signataire: ['signé par une clé qui n’est pas admin du registre accepté (kid {kid})',
      'signed by a key that is not an admin of the accepted registry (kid {kid})',
      'von einem Schlüssel signiert, der im akzeptierten Register kein Admin ist (kid {kid})',
      'firmado por una clave que no es admin del registro aceptado (kid {kid})'
    ],
    signature: ['signature invalide (contenu modifié après la signature)', 'invalid signature (content changed after signing)',
      'ungültige Signatur (Inhalt nach der Signatur geändert)', 'firma no válida (contenido modificado tras la firma)'
    ],
    admin: ['au moins un admin avec une clé de poste est exigé', 'at least one admin with a device key is required',
      'mindestens ein Admin mit Geräteschlüssel ist erforderlich', 'se exige al menos un admin con clave de equipo'
    ],
    'deux-admins': ['un groupe actif garde au moins deux admins avec une clé de poste',
      'an active group keeps at least two admins with a device key',
      'eine aktive Gruppe behält mindestens zwei Admins mit Geräteschlüssel',
      'un grupo activo mantiene al menos dos admins con clave de equipo'
    ],
    'non-admin': ['réservé à un admin du registre, sur un poste enrôlé (clé de ce poste)',
      'reserved for a registry admin, on an enrolled device (this device’s key)',
      'einem Admin des Registers auf einem eingeschriebenen Gerät vorbehalten (Schlüssel dieses Geräts)',
      'reservado a un admin del registro, en un equipo inscrito (clave de este equipo)'
    ],
    'aucun-registre': ['aucun registre accepté sur ce poste', 'no registry accepted on this device',
      'kein Register auf diesem Gerät akzeptiert', 'ningún registro aceptado en este equipo'
    ],
    csp: ['le lanceur doit envoyer la politique de sécurité (CSP) : ouvrir la suite par son lanceur, à jour',
      'the launcher must send the security policy (CSP): open the suite through its launcher, up to date',
      'der Starter muss die Sicherheitsrichtlinie (CSP) senden: die Suite über ihren aktuellen Starter öffnen',
      'el lanzador debe enviar la política de seguridad (CSP): abrir la suite con su lanzador, actualizado'
    ],
    centre: ['activer d’abord le Centre (mot de passe du Centre)', 'enable the Centre first (Centre password)',
      'zuerst das Zentrum aktivieren (Passwort des Zentrums)', 'activar primero el Centro (contraseña del Centro)'
    ],
    trigramme: ['régler d’abord son trigramme (Mon profil)', 'set your trigram first (My profile)',
      'zuerst das Kürzel einstellen (Mein Profil)', 'definir primero el trigrama (Mi perfil)'
    ],
    'deja-groupe': ['déjà en mode groupe', 'already in group mode', 'bereits im Gruppenmodus', 'ya en modo grupo'],
    'secours-inconnue': ['cette clé de secours n’est pas celle du registre accepté',
      'this recovery key is not the one of the accepted registry',
      'dieser Notfallschlüssel ist nicht der des akzeptierten Registers',
      'esta clave de emergencia no es la del registro aceptado'
    ],
    'mot-de-passe': ['mot de passe de la clé de secours incorrect', 'wrong recovery key password',
      'falsches Passwort des Notfallschlüssels', 'contraseña de la clave de emergencia incorrecta'
    ],
    'mot-de-passe-court': ['mot de passe de la clé de secours : 8 caractères au moins',
      'recovery key password: at least 8 characters', 'Passwort des Notfallschlüssels: mindestens 8 Zeichen',
      'contraseña de la clave de emergencia: 8 caracteres como mínimo'
    ],
    fichier: ['fichier de clé de secours illisible', 'unreadable recovery key file', 'Notfallschlüsseldatei unlesbar',
      'archivo de clave de emergencia ilegible'
    ],
    cle: ['clé de secours inutilisable', 'unusable recovery key', 'Notfallschlüssel unbrauchbar',
      'clave de emergencia inutilizable'
    ],
    historique: ['version 1 introuvable dans l’historique git des données', 'version 1 not found in the data git history',
      'Version 1 nicht in der Git-Historie der Daten gefunden', 'versión 1 no encontrada en el historial git de los datos'
    ]
  };
  /** Texte d'une raison (code ci-dessus), dans la langue de la page. */
  const why = (code, vars = {}) => WHY[code] ? tr(WHY[code], vars) : String(code || '?');
  /** Erreur d'action portant son code (raison). */
  const fail = (code, vars) => Object.assign(new Error(why(code, vars)), {
    code
  });

  // ---- règles (pures : utilisées à la signature, à la lecture et par le banc d'essai tools/crypto_banc.html)
  /** Clés autorisées à signer la version suivante d'un contenu : admins actifs et clé de secours ; kid → { pub, alg, tri }. */
  function signers(c) {
    const m = new Map();
    for (const [tri, u] of Object.entries(c?.utilisateurs || {}))
      if (u?.role === ADMIN && u.actif !== false)
        for (const k of u.cles || [])
          if (k?.kid && k.pub) m.set(k.kid, {
            pub: k.pub,
            alg: k.alg || 'ES256',
            tri
          });
    for (const k of c?.secours || [])
      if (k?.kid && k.pub) m.set(k.kid, {
        pub: k.pub,
        alg: k.alg || 'ES256',
        tri: 'secours'
      });
    return m;
  }
  /** Trigrammes des admins actifs qui ont au moins une clé de poste. */
  const keyedAdmins = c => Object.entries(c?.utilisateurs || {}).filter(([, u]) => u?.role === ADMIN && u.actif !== false && (u.cles ||
  []).some(k => k?.kid && k.pub)).map(([tri]) => tri);
  /** Règles d'un contenu (forme, admins) : '' si respectées, sinon le code de la règle violée. */
  function rulesError(c) {
    if (!c || c.type !== 'registre' || !Number.isInteger(c.version) || c.version < 1 || !c.utilisateurs || typeof c
      .utilisateurs !== 'object' || !['constitution', 'actif'].includes(c.etat)) return 'format';
    const n = keyedAdmins(c).length;
    if (!n) return 'admin';
    if (c.etat === 'actif' && n < 2) return 'deux-admins';
    return '';
  }
  /** Au moins une signature valide d'une clé de la table keys (kid → { pub, alg }) ? { ok, kids, raison, kid }. */
  async function signedBy(env, keys) {
    const r = await S().verifyEnvelope(env, kid => keys.get(kid) || null);
    if (r.valides.length) return {
      ok: true,
      kids: r.valides
    };
    const e = r.erreurs[0] || {};
    return {
      ok: false,
      raison: e.raison === 'format' ? 'format' : e.raison === 'inconnue' || !e.raison ? 'signataire' : 'signature',
      kid: e.kid || ''
    };
  }
  /** Une enveloppe peut-elle suivre le contenu accepté prev ? { ok, raison, kids, fondation, refonte }.
   *  prev null, ou autre groupe : seule une version 1 signée par un admin qu'elle déclare (confiance au premier usage,
   *  à confirmer sur le poste). Sinon : numéro suivant, precedente = empreinte de prev, signée par un admin ou la clé
   *  de secours de prev, règles respectées. Raisons : format, ancienne, identique, saut, refonte, chaine, signataire,
   *  signature, et celles de rulesError. */
  async function check(prev, env) {
    const c = env?.contenu;
    if (env?.sog !== 'signe/1' || !Array.isArray(env?.signatures)) return {
      ok: false,
      raison: 'format'
    };
    const rule = rulesError(c);
    if (rule === 'format') return {
      ok: false,
      raison: 'format'
    };
    const other = prev && c.groupe !== prev.groupe;
    if (!prev || other) {
      if (c.version !== 1) return {
        ok: false,
        raison: other ? 'refonte' : 'saut'
      };
      if (rule) return {
        ok: false,
        raison: rule
      };
      const r = await signedBy(env, signers(c));
      return r.ok ? {
        ok: true,
        fondation: true,
        refonte: !!other,
        kids: r.kids
      } : r;
    }
    if (c.version < prev.version) return {
      ok: false,
      raison: 'ancienne'
    };
    if (c.version === prev.version) return {
      ok: false,
      raison: (await S().digest(c)) === (await S().digest(prev)) ? 'identique' : 'ancienne'
    };
    if (c.version > prev.version + 1) return {
      ok: false,
      raison: 'saut'
    };
    if (c.precedente !== await S().digest(prev)) return {
      ok: false,
      raison: 'chaine'
    };
    if (rule) return {
      ok: false,
      raison: rule
    };
    return signedBy(env, signers(prev));
  }
  /** Suit la chaîne de prev jusqu'à l'enveloppe target par les versions intermédiaires (enveloppes de l'historique
   *  git) ; { ok, contenu (dernier atteint), raison, version (première version qui ne suit pas) }. */
  async function advance(prev, versions, target) {
    let cur = prev;
    const goal = target.contenu.version;
    while (cur.version < goal) {
      const v = cur.version + 1,
        cands = versions.filter(e => e?.contenu?.version === v);
      if (v === goal) cands.unshift(target);
      let next = null;
      for (const e of cands)
        if ((await check(cur, e)).ok) {
          next = e.contenu;
          break;
        }
      if (!next) return {
        ok: false,
        raison: 'chaine',
        version: v,
        contenu: cur
      };
      cur = next;
    }
    return {
      ok: (await S().digest(cur)) === (await S().digest(target.contenu)),
      raison: 'chaine',
      contenu: cur
    };
  }

  // ---- état du poste
  let st = {
    group: false,
    status: 'absent',
    accepted: null,
    pending: null,
    refus: []
  };
  let first = null;
  /** Attend un module de la page (window[name]) quelques secondes ; rend sa valeur ou null. */
  const need = async (name, ms = 8000) => {
    for (let t0 = Date.now(); !window[name] && Date.now() - t0 < ms;) await new Promise(r => setTimeout(r, 50));
    return window[name] || null;
  };
  /** Versions du registre dans l'historique git des données (lanceur, GET /__setup/registre-historique ; le lanceur
   *  ne vérifie rien) : enveloppes, de la plus ancienne à la plus récente ; [] sans lanceur ou sans git. */
  async function history() {
    try {
      const r = await (await fetch('/__setup/registre-historique', {
        headers: {
          'X-SOG-Setup': '1'
        },
        cache: 'no-store'
      })).json();
      return Array.isArray(r?.versions) ? r.versions : [];
    } catch {
      return [];
    }
  }
  /** Mode du Centre : true si data/config/centre.json est en mode « groupe ». */
  const groupMode = async () => (await nav()?.cpco?.config?.(true))?.mode === 'groupe';
  /** Dernière version acceptée par ce poste (IndexedDB) : { contenu, fondateur: { kid, court }, at } ou null. */
  const stored = async () => (await S().get('registre', 'accepte')) || null;
  /** Retient une version acceptée (jamais une plus ancienne : la règle est vérifiée avant). */
  async function keep(contenu, fondateur) {
    const cur = await stored();
    await S().put('registre', 'accepte', {
      contenu,
      fondateur: fondateur || cur?.fondateur || null,
      at: now()
    });
  }
  /** Signale le refus d'une version (notification une fois par session et liste du panneau du Centre). */
  function refuse(env, r) {
    const v = env?.contenu?.version ?? '?',
      text = tr(['Registre des utilisateurs v{v} refusé : {why}. Ce poste garde la version acceptée.',
        'User registry v{v} refused: {why}. This device keeps the accepted version.',
        'Benutzerregister v{v} abgelehnt: {why}. Dieses Gerät behält die akzeptierte Version.',
        'Registro de usuarios v{v} rechazado: {why}. Este equipo conserva la versión aceptada.'
      ], {
        v,
        why: why(r.raison, {
          kid: r.kid ? S().shortOf(r.kid) : '?'
        })
      });
    if (!st.refus.includes(text)) st.refus.push(text);
    window.AppFramework?.notify?.(text, 'warn', {
      once: true
    });
  }
  /** Demande de confirmation de la fondation (ou de la refondation) du registre : notification avec « Confirmer » et
   *  « Refuser », une fois par session ; la même demande est dans Paramètres › Centre › Mode groupe. */
  function askConfirm() {
    const p = st.pending;
    if (!p || !window.AppFramework?.notify) return;
    const item = window.AppFramework.notify(tr(p.kind === 'refonte' ? [
      'Le registre a été refondé par {tri} : empreinte {court}. Comparez-la avec celle reçue de cet admin (Discord, SMS, courriel) avant de confirmer.',
      'The registry has been re-founded by {tri}: fingerprint {court}. Compare it with the one received from that admin (Discord, SMS, email) before confirming.',
      'Das Register wurde von {tri} neu gegründet: Fingerabdruck {court}. Vor dem Bestätigen mit dem von diesem Admin erhaltenen vergleichen (Discord, SMS, E-Mail).',
      'El registro ha sido refundado por {tri}: huella {court}. Compárela con la recibida de ese admin (Discord, SMS, correo) antes de confirmar.'
    ] : [
      'Registre des utilisateurs du groupe fondé par {tri} : empreinte {court}. Comparez-la avec celle reçue de cet admin (Discord, SMS, courriel) avant de confirmer.',
      'Group user registry founded by {tri}: fingerprint {court}. Compare it with the one received from that admin (Discord, SMS, email) before confirming.',
      'Benutzerregister der Gruppe, gegründet von {tri}: Fingerabdruck {court}. Vor dem Bestätigen mit dem von diesem Admin erhaltenen vergleichen (Discord, SMS, E-Mail).',
      'Registro de usuarios del grupo fundado por {tri}: huella {court}. Compárela con la recibida de ese admin (Discord, SMS, correo) antes de confirmar.'
    ], {
      tri: p.tri,
      court: p.court
    }), 'info', {
      timeout: 0,
      once: true
    });
    if (!item) return;
    const span = item.querySelector('span') || item;
    for (const [row, fn] of [
        [
          ['Confirmer', 'Confirm', 'Bestätigen', 'Confirmar'], confirm
        ],
        [
          ['Refuser', 'Reject', 'Ablehnen', 'Rechazar'], reject
        ]
      ]) {
      const b = Object.assign(document.createElement('button'), {
        type: 'button',
        className: 'repo-notify-act',
        textContent: tr(row)
      });
      b.onclick = async () => {
        item.remove();
        await fn();
      };
      span.append(' ', b);
    }
  }
  /** Fondation (ou refondation) en attente de confirmation : version 1 trouvée, signataire et version visée. */
  async function pendingOf(v1, target, kids, kind) {
    const k = signers(v1.contenu).get(kids[0]) || {};
    return {
      kind,
      fondation: v1,
      cible: target,
      kid: kids[0],
      court: S().shortOf(kids[0]),
      tri: k.tri || '?',
      groupe: v1.contenu.groupe || ''
    };
  }
  let queue = Promise.resolve();
  /** Relectures l'une après l'autre (écriture d'un onglet, synchronisation et action peuvent se croiser). */
  const refresh = (opts = {}) => (queue = queue.then(() => reread(opts), () => reread(opts)));
  /** Relit le registre (data/utilisateurs/_registre.json) et le vérifie contre la version acceptée ; met à jour l'état
   *  (status : absent, ok, a-confirmer, rejete) et prévient les pages (événement sog-registry-change). */
  async function reread({
    fresh = true
  } = {}) {
    if (!await need('SogKeys') || !await need('MissionAssignments')) return st;
    await need('RepositoryNav');
    const group = await groupMode(),
      acc = await stored(),
      rejected = await S().get('registre', 'rejete');
    let env = null;
    try {
      env = await A().readData(FILE, {
        fresh
      });
    } catch {
      /* fichier illisible : comme absent */
    }
    st = {
      group,
      status: acc ? 'ok' : 'absent',
      accepted: acc?.contenu || null,
      fondateur: acc?.fondateur || null,
      pending: null,
      refus: st.refus || []
    };
    if (env) {
      const r = await check(acc?.contenu || null, env);
      if (r.ok && !r.fondation) {
        await keep(env.contenu);
        st.accepted = env.contenu;
      } else if (r.ok && r.fondation) {
        st.pending = await pendingOf(env, env, r.kids, r.refonte ? 'refonte' : 'fondation');
      } else if (r.raison === 'saut' || r.raison === 'refonte') {
        // versions intermédiaires (poste resté hors ligne) ou version 1 d'une refondation : historique git
        const h = await history();
        if (acc && r.raison === 'saut') {
          const a = await advance(acc.contenu, h, env);
          if (a.ok) {
            await keep(a.contenu);
            st.accepted = a.contenu;
          } else refuse(env, a);
        } else {
          const v1 = h.find(e => e?.contenu?.version === 1 && e.contenu.groupe === env.contenu?.groupe);
          const r1 = v1 ? await check(acc?.contenu || null, v1) : {
            ok: false,
            raison: 'historique'
          };
          if (r1.ok) st.pending = await pendingOf(v1, env, r1.kids, acc ? 'refonte' : 'fondation');
          else refuse(env, r1);
        }
      } else if (!['identique', 'ancienne'].includes(r.raison)) refuse(env, r);
    }
    if (st.pending && rejected && rejected.groupe === st.pending.groupe && rejected.kid === st.pending.kid) {
      st.status = 'rejete';
      st.pending = null;
    } else if (st.pending) st.status = 'a-confirmer';
    else st.status = st.accepted ? 'ok' : 'absent';
    window.dispatchEvent(new CustomEvent('sog-registry-change', {
      detail: state()
    }));
    if (st.status === 'a-confirmer' && group) askConfirm();
    return state();
  }
  /** État courant (copie) : { group, status, accepted, fondateur, pending, refus }. */
  const state = () => ({
    ...st,
    refus: [...st.refus]
  });
  /** Première lecture du registre (une fois par page). */
  const ready = () => first ||= refresh().catch(() => state());
  /** Confirme la fondation (ou la refondation) en attente : version 1 acceptée avec l'empreinte de son signataire, puis
   *  chaîne suivie jusqu'à la version lue. */
  async function confirm() {
    const p = st.pending;
    if (!p) return state();
    await S().del('registre', 'rejete');
    let contenu = p.fondation.contenu;
    if (p.cible !== p.fondation && p.cible.contenu.version > 1) {
      const a = await advance(contenu, await history(), p.cible);
      contenu = a.contenu;
      if (!a.ok) refuse(p.cible, a);
    }
    await S().put('registre', 'accepte', {
      contenu,
      fondateur: {
        kid: p.kid,
        court: p.court,
        tri: p.tri
      },
      at: now()
    });
    return refresh();
  }
  /** Refuse la fondation (ou la refondation) en attente : le poste garde ce qu'il avait et ne redemande pas pour ce
   *  signataire. */
  async function reject() {
    const p = st.pending;
    if (!p) return state();
    await S().put('registre', 'rejete', {
      groupe: p.groupe,
      kid: p.kid,
      at: now()
    });
    return refresh({
      fresh: false
    });
  }
  /** Contenu du registre accepté, si le mode groupe est actif sur ce poste ; null sinon. */
  const active = () => st.group && st.accepted ? st.accepted : null;
  /** Entrée signée d'un utilisateur en mode groupe ({ nom, role, actif, mot_de_passe, cles }) ; null hors mode groupe
   *  ou trigramme absent du registre. */
  const userOf = tri => active()?.utilisateurs?.[norm(tri)] || null;
  /** Vrai si la clé de ce poste est celle d'un admin actif du registre accepté. */
  async function isAdminDevice() {
    const id = await S()?.identity?.({
      create: false
    });
    const k = id && signers(st.accepted).get(id.kid);
    return !!k && k.tri !== 'secours';
  }
  /** Nom du poste (affiché dans le registre). */
  const deviceName = () => [navigator.userAgentData?.platform || navigator.platform || '', (navigator.userAgentData?.brands || [])
    .map(b => b.brand).find(b => !/not.?a.?brand|chromium/i.test(b)) || ''
  ].filter(Boolean).join(' · ') || 'poste';
  /** Entrée de clé de ce poste pour le registre. */
  const deviceEntry = id => ({
    kid: id.kid,
    alg: id.alg,
    pub: id.pub,
    ecdh: id.ecdh,
    poste: deviceName(),
    depuis: now()
  });
  /** Télécharge le fichier de la clé de secours (chiffré) : sog-cle-secours-<empreinte>.json. */
  function download(rec) {
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([JSON.stringify(rec.fichier, null, 1)], {
        type: 'application/json'
      })),
      download: `sog-cle-secours-${rec.court}.json`
    });
    document.body.append(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1000);
  }
  /** Écrit data/config/centre.json avec le mode donné (« groupe » ou « standalone »), autres réglages gardés. */
  async function setCentreMode(mode) {
    const cur = (await A().readData(CENTRE, {
      fresh: true
    })) || {};
    const r = await A().writeData(CENTRE, {
      ...cur,
      schema: 1,
      mode,
      updated_at: now(),
      by: window.SuiteUsers?.by?.() || ''
    });
    await nav()?.cpco?.config?.(true);
    return r;
  }
  /** Écrit une enveloppe du registre et la retient comme acceptée (elle a été vérifiée avant). */
  async function write(env, fondateur) {
    const r = await A().writeData(FILE, env);
    await keep(env.contenu, fondateur);
    return r;
  }
  /** Version 1 d'un registre (fondation ou refondation) signée par ce poste : utilisateurs repris (base), l'auteur
   *  admin avec la clé du poste, clé de secours neuve (fichier téléchargé). */
  async function foundation(me, base, recoveryPassword) {
    const id = await S().identity(),
      rec = await S().createRecovery(recoveryPassword).catch(e => {
        throw fail(e?.message === 'mot-de-passe-court' ? 'mot-de-passe-court' : 'cle');
      });
    const utilisateurs = {};
    for (const [tri, u] of Object.entries(base))
      utilisateurs[tri] = {
        nom: u.nom || '',
        role: u.role === ADMIN ? ADMIN : 'utilisateur',
        actif: u.actif !== false,
        mot_de_passe: u.mot_de_passe || null,
        cles: []
      };
    utilisateurs[me] = {
      ...(utilisateurs[me] || {
        nom: '',
        mot_de_passe: null
      }),
      role: ADMIN,
      actif: true,
      cles: [deviceEntry(id)]
    };
    const contenu = {
      type: 'registre',
      va: nav()?.va?.()?.short || 'SOG',
      groupe: S().b64url(crypto.getRandomValues(new Uint8Array(12))),
      version: 1,
      etat: 'constitution',
      utilisateurs,
      secours: [{
        kid: rec.kid,
        alg: rec.alg,
        pub: rec.pub,
        depuis: now()
      }],
      updated_at: now(),
      by: me
    };
    const env = await S().addSignature(S().envelope(contenu));
    const r = await check(null, env);
    if (!r.ok) throw fail(r.raison);
    await write(env, {
      kid: id.kid,
      court: id.court,
      tri: me
    });
    download(rec);
    return {
      env,
      recovery: rec
    };
  }
  /** Trigramme de l'utilisateur de ce poste (session, sinon profil) ; erreur s'il n'est pas réglé. */
  function me() {
    const tri = norm(window.SuiteUsers?.effective?.() || '');
    if (!/^[A-Z0-9]{2,5}$/.test(tri)) throw fail('trigramme');
    return tri;
  }
  /** Préalables communs au passage en mode groupe et à la refondation : Centre activé, CSP du lanceur. */
  async function prerequisites() {
    if (!nav()?.cpco?.enabled?.()) throw fail('centre');
    let csp = false;
    try {
      csp = (await (await fetch('/__setup/status', {
        headers: {
          'X-SOG-Setup': '1'
        },
        cache: 'no-store'
      })).json())?.csp === true;
    } catch {
      /* sans lanceur : pas de CSP */
    }
    if (!csp) throw fail('csp');
  }
  /** Passage en mode groupe (Paramètres › Centre) : version 1 du registre (fiches reprises, l'utilisateur admin avec la
   *  clé de ce poste, clé de secours chiffrée par recoveryPassword et téléchargée), Centre en mode « groupe ». */
  async function goGroup(recoveryPassword) {
    await refresh();
    if (st.group) throw fail('deja-groupe');
    await prerequisites();
    const tri = me(),
      base = {};
    if (st.accepted) Object.assign(base, st.accepted.utilisateurs);
    else
      for (const u of await window.SuiteUsers?.list?.(true) || []) base[norm(u.trigramme)] = u;
    // registre déjà accepté (retour au mode groupe après un passage en autonome) : il reprend sans nouvelle fondation
    if (!st.accepted) await foundation(tri, base, recoveryPassword);
    await setCentreMode('groupe');
    return refresh();
  }
  /** Retour au mode autonome (admin du registre sur un poste enrôlé) : le registre reste, il n'est plus lu. */
  async function leaveGroup() {
    await refresh();
    if (!await isAdminDevice()) throw fail('non-admin');
    await setCentreMode('standalone');
    return refresh();
  }
  /** Nouvelle version signée : mutate(contenu) sur une copie du registre accepté ; signer : ce poste (admin) ou une
   *  clé de secours ouverte ; vérifiée comme à la lecture avant d'être écrite. Rend { where, error } (writeData). */
  async function publish(mutate, {
    signer = null,
    by: author = ''
  } = {}) {
    await refresh();
    const prev = st.accepted;
    if (!prev) throw fail('aucun-registre');
    if (!signer && !await isAdminDevice()) throw fail('non-admin');
    const next = structuredClone(prev);
    mutate(next);
    Object.assign(next, {
      version: prev.version + 1,
      precedente: await S().digest(prev),
      updated_at: now(),
      by: author || window.SuiteUsers?.by?.() || ''
    });
    const env = await S().addSignature(S().envelope(next), signer || undefined);
    const r = await check(prev, env);
    if (!r.ok) throw fail(r.raison, {
      kid: r.kid ? S().shortOf(r.kid) : '?'
    });
    const w = await write(env);
    await refresh({
      fresh: false
    });
    return w;
  }
  /** Change l'entrée d'un utilisateur (nom, rôle, état, mot de passe) : nouvelle version signée par un admin. */
  const setUser = (tri, patch) => publish(c => {
    tri = norm(tri);
    c.utilisateurs[tri] = {
      nom: '',
      role: 'utilisateur',
      actif: true,
      mot_de_passe: null,
      cles: [],
      ...(c.utilisateurs[tri] || {}),
      ...patch
    };
  });
  /** Utilise la clé de secours (fichier + mot de passe) : l'utilisateur tri devient admin, avec la clé de ce poste ;
   *  version signée par la clé de secours (by : « secours »). */
  async function useRecovery(file, password, tri) {
    await refresh();
    let rec;
    try {
      rec = await S().openRecovery(file, password);
    } catch (e) {
      throw fail(['fichier', 'mot-de-passe', 'cle'].includes(e?.message) ? e.message : 'cle');
    }
    if (!(st.accepted?.secours || []).some(k => k.kid === rec.kid)) throw fail('secours-inconnue');
    const id = await S().identity();
    tri = norm(tri);
    return publish(c => {
      const u = c.utilisateurs[tri] ||= {
        nom: '',
        mot_de_passe: null,
        cles: []
      };
      u.role = ADMIN;
      u.actif = true;
      u.cles = [...(u.cles || []).filter(k => k.kid !== id.kid), deviceEntry(id)];
    }, {
      signer: rec.signer,
      by: 'secours'
    });
  }
  /** Nouvelle clé de secours (admin) : l'ancienne est retirée du registre, la nouvelle téléchargée. */
  async function newRecovery(password) {
    await refresh();
    if (!await isAdminDevice()) throw fail('non-admin');
    const rec = await S().createRecovery(password).catch(e => {
      throw fail(e?.message === 'mot-de-passe-court' ? 'mot-de-passe-court' : 'cle');
    });
    await publish(c => {
      c.secours = [{
        kid: rec.kid,
        alg: rec.alg,
        pub: rec.pub,
        depuis: now()
      }];
    });
    download(rec);
    return rec;
  }
  /** Refondation (dernier recours, toutes les clés d'admin et la clé de secours perdues) : nouveau registre en version 1,
   *  nouveau groupe, signé par ce poste ; chaque autre poste devra confirmer l'empreinte du nouvel admin. */
  async function refound(recoveryPassword) {
    await refresh();
    await prerequisites();
    const tri = me(),
      base = {};
    for (const [t, u] of Object.entries(st.accepted?.utilisateurs || {})) base[t] = u;
    if (!Object.keys(base).length)
      for (const u of await window.SuiteUsers?.list?.(true) || []) base[norm(u.trigramme)] = u;
    await foundation(tri, base, recoveryPassword);
    await setCentreMode('groupe');
    return refresh({
      fresh: false
    });
  }

  window.SogRegistry = {
    FILE,
    ready,
    refresh,
    state,
    active,
    userOf,
    isAdminDevice,
    confirm,
    reject,
    goGroup,
    leaveGroup,
    publish,
    setUser,
    useRecovery,
    newRecovery,
    refound,
    why,
    // règles pures (banc d'essai)
    signers,
    keyedAdmins,
    rulesError,
    check,
    advance
  };
  // lecture au chargement de la page ; relue quand le registre ou le réglage du Centre change (synchronisation, autre
  // onglet)
  ready();
  window.addEventListener('defa-data-change', e => {
    const p = String(e.detail?.path || '');
    if (p.endsWith(FILE) || p.endsWith(CENTRE)) refresh();
  });
})();
