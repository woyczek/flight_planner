(() => {
  'use strict';
  // Utilisateurs et droits (docs/DISPOS_ET_REORGANISATION.md § 2), chargé sur chaque page par repository_nav.js.
  //   · fiche par utilisateur data/utilisateurs/<TRI>.json (pool synchronisé) : trigramme, nom, rôle « admin_centre » ou
  //     « utilisateur », actif, mot de passe (empreinte PBKDF2-SHA256 salée, WebCrypto — jamais en clair), préférences de
  //     thèmes, compagnie (va) ; index data/utilisateurs/_index.json (trigramme → rôle, actif) ;
  //   · configuration partagée data/config/suite.json : mode « develop » (défaut : sécurité testée, pas imposée — trigramme
  //     libre, connexion facultative) ou « production » (connexion exigée pour Mes missions et, admin_centre, pour le
  //     Centre ; trigramme fixé par la connexion ; mot de passe changé en connaissant l'ancien, ou réinitialisé par un
  //     admin) ;
  //   · session de ce navigateur (suiteSession:v1) : { tri, role, at, as } ; as : utilisateur usurpé par un admin —
  //     bandeau « Usurpation : utilisateur TOTO » sur toutes les pages, écritures signées by: "ADM pour TOTO".
  // Limite : tout se vérifie dans le navigateur ; la vérification passera côté serveur avec le webservice
  // (docs/INDEX_DONNEES.md § 9). Le verrou du Centre (cpcoAccess:v1, repository_nav.js) reste indépendant.
  // API (window.SuiteUsers) : mode(), config(), setMode(mode), session(), effective(), by(), isAdmin(),
  //   trigramLocked(), get(TRI), list(), save(fiche), create(TRI, { nom, role }), seed(), login(TRI, mot de passe),
  //   logout(), changePassword(ancien, nouveau), resetPassword(TRI, nouveau), impersonate(TRI), stopImpersonation(),
  //   themePrefs(TRI), setThemePrefs(TRI, prefs), ROLES.
  if (window.SuiteUsers) return;
  const K = window.RepositoryKit;
  const t = row => K?.t ? K.t(row) : row[0],
    tf = (row, v) => K?.tf ? K.tf(row, v) : row[0];
  const SESSION = 'suiteSession:v1',
    CONFIG = 'config/suite.json',
    DIR = 'utilisateurs',
    INDEX = 'utilisateurs/_index.json',
    VA = () => window.RepositoryNav?.va?.().short || 'DEFA',
    ITER = 310000; // PBKDF2-SHA256 : itérations (recommandation OWASP pour SHA-256 dans le navigateur)
  const ROLES = ['admin_centre', 'utilisateur'];
  /** Socle des fichiers du pool (shared/assignments.js, chargé avec ce script). */
  const A = () => window.MissionAssignments;
  const now = () => new Date().toISOString();
  const norm = tri => String(tri || '').trim().toUpperCase();

  // ---- configuration partagée (mode develop / production), lue une fois puis à chaque écriture d'un onglet
  let cfg = K?.store?.json('suiteConfigCache:v1', null) || null; // dernière valeur lue : mode connu dès le chargement
  async function loadConfig(fresh = false) {
    const v = await A()?.readData?.(CONFIG, {
      fresh
    });
    cfg = v && typeof v === 'object' ? v : {
      schema: 1,
      va: VA(),
      mode: 'develop'
    };
    const before = K?.store?.json('suiteConfigCache:v1', null)?.mode;
    K?.store?.setJson('suiteConfigCache:v1', cfg);
    if (before !== cfg.mode) window.dispatchEvent(new CustomEvent('suite-mode-change', {
      detail: {
        mode: mode()
      }
    }));
    return cfg;
  }
  const mode = () => cfg?.mode === 'production' ? 'production' : 'develop';

  // ---- session de ce navigateur
  const session = () => K?.store?.json(SESSION, null) || null;
  const setSession = s => {
    if (s) K.store.setJson(SESSION, s);
    else K.store.remove(SESSION);
    window.dispatchEvent(new CustomEvent('suite-session-change', {
      detail: s
    }));
    banner();
  };
  /** Trigramme de travail : utilisateur usurpé, sinon connecté (production), sinon profil pilote. */
  const effective = () => {
    const s = session();
    if (s?.as) return s.as;
    if (mode() === 'production') return s?.tri || '';
    return A()?.profileTrigram?.() || s?.tri || '';
  };
  /** Signature des écritures : « ADM pour TOTO » pendant une usurpation, sinon le trigramme de travail. */
  const by = () => {
    const s = session();
    return s?.as ? `${s.tri} pour ${s.as}` : effective();
  };
  const isAdmin = () => session()?.role === 'admin_centre';
  const trigramLocked = () => mode() === 'production' || !!session()?.as;

  // ---- empreinte du mot de passe (PBKDF2-SHA256, sel aléatoire de 16 octets)
  const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function derive(password, salt, iterations) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(password)), 'PBKDF2', false, ['deriveBits']);
    return crypto.subtle.deriveBits({
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations
    }, key, 256);
  }
  async function hashPassword(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return {
      algo: 'PBKDF2-SHA256',
      iterations: ITER,
      sel: b64(salt),
      empreinte: b64(await derive(password, salt, ITER))
    };
  }
  /** Mot de passe conforme à l'empreinte (comparaison sur toute la longueur). */
  async function verify(password, h) {
    if (!h?.sel || !h?.empreinte || h.algo !== 'PBKDF2-SHA256') return false;
    const a = new Uint8Array(await derive(password, unb64(h.sel), +h.iterations || ITER)),
      b = unb64(h.empreinte);
    let diff = a.length ^ b.length;
    for (let i = 0; i < Math.min(a.length, b.length); i++) diff |= a[i] ^ b[i];
    return diff === 0;
  }

  // ---- fiches
  /** Fiche d'un utilisateur ; null si absente. */
  const get = async (tri, opts) => tri ? A()?.readData?.(`${DIR}/${norm(tri)}.json`, opts) || null : null;
  /** Index des utilisateurs (trigramme → { role, actif, nom }) : fichier, complété par les fiches de la boîte d'envoi. */
  async function index(fresh = false) {
    const idx = (await A()?.readData?.(INDEX, {
      fresh
    })) || {};
    const out = {
      ...(idx.utilisateurs || {})
    };
    for (const rel of A()?.pendingData?.() || []) {
      const m = /^utilisateurs\/([A-Z0-9]{2,5})\.json$/.exec(rel);
      if (m) {
        const u = await A().readData(rel);
        if (u) out[m[1]] = {
          role: u.role,
          actif: u.actif !== false,
          nom: u.nom || ''
        };
      }
    }
    return out;
  }
  /** Fiches de tous les utilisateurs (ordre des trigrammes). */
  async function list(fresh = false) {
    const idx = await index(fresh);
    const users = await Promise.all(Object.keys(idx).sort().map(tri => get(tri, {
      fresh
    })));
    return users.filter(Boolean);
  }
  /** Enregistre une fiche (datée, signée) et son entrée d'index. Retour : { where, error } (writeData). */
  async function save(user) {
    const tri = norm(user.trigramme);
    if (!/^[A-Z0-9]{2,5}$/.test(tri)) throw new Error(t(['Trigramme invalide.', 'Invalid trigram.', 'Ungültiges Kürzel.', 'Trigrama no válido.']));
    const doc = {
      schema: 1,
      va: VA(),
      ...user,
      trigramme: tri,
      role: ROLES.includes(user.role) ? user.role : 'utilisateur',
      actif: user.actif !== false,
      updated_at: now(),
      by: by() || tri
    };
    const r = await A().writeData(`${DIR}/${tri}.json`, doc);
    await A().dataStore.lock('data:utilisateurs/_index', async () => {
      const idx = (await A().readData(INDEX, {
        fresh: true
      })) || {
        schema: 1,
        utilisateurs: {}
      };
      idx.utilisateurs ||= {};
      idx.utilisateurs[tri] = {
        role: doc.role,
        actif: doc.actif,
        nom: doc.nom || ''
      };
      idx.updated_at = doc.updated_at;
      idx.va = VA();
      await A().writeData(INDEX, idx);
    });
    window.dispatchEvent(new CustomEvent('suite-users-change', {
      detail: {
        tri
      }
    }));
    return r;
  }
  /** Nouvelle fiche (sans mot de passe : à définir à la première connexion en mode develop, par un admin sinon). */
  async function create(tri, {
    nom = '',
    role = 'utilisateur'
  } = {}) {
    tri = norm(tri);
    if (await get(tri, {
        fresh: true
      })) throw new Error(tf(['{t} existe déjà.', '{t} already exists.', '{t} existiert bereits.', '{t} ya existe.'], {
      t: tri
    }));
    return save({
      trigramme: tri,
      nom,
      role,
      actif: true,
      mot_de_passe: null,
      preferences: {}
    });
  }
  /** Dossier vide : une fiche « utilisateur » par pilote de la référence DEFA. Retour : trigrammes créés. */
  async function seed() {
    if (Object.keys(await index(true)).length) return [];
    const ref = window.DEFA_REFERENCE || {},
      pilots = (ref.file || ref).pilots || [];
    const tris = [...new Set(pilots.map(p => norm(p.trigram)).filter(x => /^[A-Z0-9]{2,5}$/.test(x)))].sort();
    for (const tri of tris) await save({
      trigramme: tri,
      nom: '',
      role: 'utilisateur',
      actif: true,
      mot_de_passe: null,
      preferences: {}
    });
    return tris;
  }

  // ---- connexion
  async function login(tri, password) {
    await loadConfig(true);
    tri = norm(tri);
    const u = await get(tri, {
      fresh: true
    });
    const fail = row => {
      throw new Error(t(row));
    };
    if (!u) fail(['Utilisateur inconnu.', 'Unknown user.', 'Unbekannter Benutzer.', 'Usuario desconocido.']);
    if (u.actif === false) fail(['Utilisateur désactivé.', 'User deactivated.', 'Benutzer deaktiviert.', 'Usuario desactivado.']);
    if (u.mot_de_passe) {
      if (!await verify(password, u.mot_de_passe)) fail(['Mot de passe incorrect.', 'Wrong password.', 'Falsches Passwort.', 'Contraseña incorrecta.']);
    } else if (mode() === 'production') fail(['Aucun mot de passe défini : le demander à un administrateur du Centre.', 'No password set: ask a Centre administrator.', 'Kein Passwort gesetzt: einen Administrator des Zentrums fragen.', 'Ninguna contraseña definida: pedirla a un administrador del Centro.']);
    setSession({
      tri,
      role: u.role,
      at: now(),
      login: true
    });
    // le profil pilote suit la connexion (trigramme des pages)
    const p = K.store.json('missionReportingConfig:v1', {}) || {};
    if (p.trigram !== tri) {
      K.store.setJson('missionReportingConfig:v1', {
        ...p,
        trigram: tri
      });
      window.dispatchEvent(new CustomEvent('pilot-profile-change', {
        detail: {
          trigram: tri
        }
      }));
    }
    return {
      user: u,
      mustChange: !!u.a_changer || !u.mot_de_passe
    };
  }
  const logout = () => setSession(null);
  /** Change le mot de passe de l'utilisateur connecté (l'ancien est exigé s'il en a un). */
  async function changePassword(oldPassword, newPassword) {
    const s = session();
    if (!s?.tri || s.as) throw new Error(t(['Se connecter d’abord (hors usurpation).', 'Sign in first (not while impersonating).', 'Zuerst anmelden (nicht während einer Übernahme).', 'Conectarse primero (fuera de una suplantación).']));
    if (String(newPassword || '').length < 8) throw new Error(t(['Nouveau mot de passe : 8 caractères au moins.', 'New password: at least 8 characters.', 'Neues Passwort: mindestens 8 Zeichen.', 'Nueva contraseña: 8 caracteres como mínimo.']));
    const u = await get(s.tri, {
      fresh: true
    });
    if (!u) throw new Error(t(['Fiche introuvable.', 'User file not found.', 'Benutzerdatei nicht gefunden.', 'Ficha no encontrada.']));
    if (u.mot_de_passe && !await verify(oldPassword, u.mot_de_passe)) throw new Error(t(['Ancien mot de passe incorrect.', 'Wrong old password.', 'Altes Passwort falsch.', 'Contraseña anterior incorrecta.']));
    return save({
      ...u,
      mot_de_passe: await hashPassword(newPassword),
      a_changer: false
    });
  }
  /** Réinitialisation par un admin : mot de passe provisoire, à changer à la prochaine connexion. */
  async function resetPassword(tri, newPassword) {
    requireAdmin();
    if (String(newPassword || '').length < 8) throw new Error(t(['Mot de passe provisoire : 8 caractères au moins.', 'Temporary password: at least 8 characters.', 'Vorläufiges Passwort: mindestens 8 Zeichen.', 'Contraseña provisional: 8 caracteres como mínimo.']));
    const u = await get(tri, {
      fresh: true
    });
    if (!u) throw new Error(t(['Fiche introuvable.', 'User file not found.', 'Benutzerdatei nicht gefunden.', 'Ficha no encontrada.']));
    return save({
      ...u,
      mot_de_passe: await hashPassword(newPassword),
      a_changer: true
    });
  }
  /** Droits d'administration : imposés en mode production (admin_centre connecté) ; testés seulement en develop. */
  function requireAdmin() {
    if (mode() === 'production' && !isAdmin()) throw new Error(t(['Réservé aux administrateurs du Centre (admin_centre connecté).', 'Reserved for Centre administrators (signed-in admin_centre).', 'Administratoren des Zentrums vorbehalten (angemeldeter admin_centre).', 'Reservado a los administradores del Centro (admin_centre conectado).']));
  }
  /** Agir en tant qu'un autre utilisateur (admin) : bandeau sur toutes les pages, écritures signées « ADM pour TOTO ». */
  async function impersonate(tri) {
    requireAdmin();
    tri = norm(tri);
    const s = session() || {};
    const me = s.tri || A()?.profileTrigram?.() || '';
    if (!me) throw new Error(t(['Se connecter d’abord (ou régler son trigramme en mode develop).', 'Sign in first (or set your trigram in develop mode).', 'Zuerst anmelden (oder im develop-Modus das Kürzel setzen).', 'Conectarse primero (o definir el trigrama en modo develop).']));
    if (tri === me) return stopImpersonation();
    if (!await get(tri)) throw new Error(t(['Utilisateur inconnu.', 'Unknown user.', 'Unbekannter Benutzer.', 'Usuario desconocido.']));
    // develop sans connexion : session d'usurpation seule (login: false), effacée à la fin de l'usurpation
    setSession(s.login ? {
      ...s,
      as: tri
    } : {
      tri: me,
      role: (await get(me))?.role || 'utilisateur',
      at: now(),
      login: false,
      as: tri
    });
  }
  /** Fin de l'usurpation : retour à la session de l'admin (ou à aucune, s'il ne s'était pas connecté). */
  function stopImpersonation() {
    const s = session();
    if (!s) return;
    const {
      as,
      ...rest
    } = s;
    setSession(rest.login ? rest : null);
  }
  /** Change le mode (configuration partagée) ; production : au moins un admin_centre actif avec mot de passe. */
  async function setMode(m) {
    if (!['develop', 'production'].includes(m)) return;
    if (mode() === 'production') requireAdmin();
    if (m === 'production') {
      const admins = (await list(true)).filter(u => u.role === 'admin_centre' && u.actif !== false && u.mot_de_passe);
      if (!admins.length) throw new Error(t(['Mode production : il faut d’abord un administrateur du Centre actif, avec un mot de passe.', 'Production mode: an active Centre administrator with a password is needed first.', 'Produktionsmodus: zuerst ist ein aktiver Administrator des Zentrums mit Passwort nötig.', 'Modo producción: primero hace falta un administrador del Centro activo con contraseña.']));
    }
    const doc = {
      schema: 1,
      va: VA(),
      ...(cfg || {}),
      mode: m,
      updated_at: now(),
      by: by() || 'CPCO'
    };
    const r = await A().writeData(CONFIG, doc);
    cfg = doc;
    K.store.setJson('suiteConfigCache:v1', cfg);
    window.dispatchEvent(new CustomEvent('suite-mode-change', {
      detail: {
        mode: m
      }
    }));
    return r;
  }

  // ---- préférences de thèmes (par domaine : { mode: 'tous' | 'blanche' | 'noire', liste: [THÈMES] })
  const themePrefs = async tri => (await get(tri))?.preferences?.themes || null;
  async function setThemePrefs(tri, themes) {
    tri = norm(tri);
    const u = (await get(tri, {
      fresh: true
    })) || {
      trigramme: tri,
      role: 'utilisateur',
      actif: true,
      mot_de_passe: null
    };
    return save({
      ...u,
      preferences: {
        ...(u.preferences || {}),
        themes
      }
    });
  }

  // ---- bandeau d'usurpation (toutes les pages) et connexion exigée (mode production)
  function banner() {
    const s = session(),
      on = !!s?.as;
    document.documentElement.classList.toggle('suite-impersonating', on);
    let b = document.getElementById('suiteImpBanner');
    if (!on) return b?.remove();
    if (!document.body) return document.addEventListener('DOMContentLoaded', banner, {
      once: true
    });
    if (!b) {
      b = document.createElement('div');
      b.id = 'suiteImpBanner';
      b.className = 'suite-imp-banner no-print';
      b.setAttribute('role', 'status');
      b.setAttribute('data-no-i18n', '');
      b.innerHTML = '<span></span><button type="button" class="repo-plain"></button>';
      b.querySelector('button').onclick = () => stopImpersonation();
      document.body.append(b);
    }
    b.querySelector('span').textContent = tf(['Usurpation : utilisateur {u} (par {a}, écritures signées « {a} pour {u} »)', 'Impersonation: user {u} (by {a}, writes signed “{a} pour {u}”)', 'Identitätsübernahme: Benutzer {u} (durch {a}, Schreibvorgänge signiert „{a} pour {u}“)', 'Suplantación: usuario {u} (por {a}, escrituras firmadas «{a} pour {u}»)'], {
      u: s.as,
      a: s.tri
    });
    b.querySelector('button').textContent = t(['Terminer l’usurpation', 'End impersonation', 'Übernahme beenden', 'Terminar la suplantación']);
  }
  /** Page qui exige une connexion en mode production : 'user' (Mes missions), 'admin' (Centre), '' sinon. */
  function gateOf() {
    const p = window.RepositoryNav?.page?.path || '';
    if (p.startsWith('apps/pilot/')) return 'user';
    if (p.startsWith('apps/cpco/') || p === 'apps/settings/centre.html') return 'admin';
    return '';
  }
  function gate() {
    document.getElementById('suiteLogin')?.remove();
    const need = gateOf(),
      s = session();
    if (mode() !== 'production' || !need || (s?.tri && (need === 'user' || s.role === 'admin_centre'))) return;
    if (!document.body) return document.addEventListener('DOMContentLoaded', gate, {
      once: true
    });
    const box = document.createElement('div');
    box.id = 'suiteLogin';
    box.className = 'cpco-lock suite-login';
    box.setAttribute('role', 'dialog');
    box.setAttribute('data-no-i18n', '');
    box.innerHTML = `<div><b></b><p></p><form><input name="tri" maxlength="5" autocomplete="username" spellcheck="false"><input name="pw" type="password" autocomplete="current-password"><button type="submit"></button><span class="suite-login-msg"></span></form><a href="${K.esc(new URL('index.html', window.RepositoryNav?.root || location.href).href)}"></a></div>`;
    const f = box.querySelector('form');
    box.querySelector('b').textContent = t(['Connexion', 'Sign in', 'Anmeldung', 'Conexión']);
    box.querySelector('p').textContent = need === 'admin' ? t(['Mode production : le Centre est réservé aux administrateurs du Centre connectés.', 'Production mode: the Centre is reserved for signed-in Centre administrators.', 'Produktionsmodus: Das Zentrum ist angemeldeten Administratoren vorbehalten.', 'Modo producción: el Centro está reservado a los administradores conectados.']) : t(['Mode production : connectez-vous pour voir vos missions.', 'Production mode: sign in to see your missions.', 'Produktionsmodus: anmelden, um Ihre Missionen zu sehen.', 'Modo producción: conéctese para ver sus misiones.']);
    f.tri.placeholder = t(['Trigramme', 'Trigram', 'Kürzel', 'Trigrama']);
    f.pw.placeholder = t(['Mot de passe', 'Password', 'Passwort', 'Contraseña']);
    f.querySelector('button').textContent = t(['Se connecter', 'Sign in', 'Anmelden', 'Conectarse']);
    box.querySelector('a').textContent = t(['Accueil', 'Home', 'Startseite', 'Inicio']);
    f.onsubmit = async e => {
      e.preventDefault();
      const msg = f.querySelector('.suite-login-msg');
      msg.textContent = '…';
      try {
        const r = await login(f.tri.value, f.pw.value);
        if (need === 'admin' && r.user.role !== 'admin_centre') throw new Error(t(['Compte sans droits d’administration du Centre.', 'Account without Centre administration rights.', 'Konto ohne Administrationsrechte für das Zentrum.', 'Cuenta sin derechos de administración del Centro.']));
        if (r.mustChange) window.AppFramework?.notify?.(t(['Mot de passe provisoire : le changer dans Paramètres › Mon profil › Connexion.', 'Temporary password: change it in Settings › My profile › Sign-in.', 'Vorläufiges Passwort: unter Einstellungen › Mein Profil › Anmeldung ändern.', 'Contraseña provisional: cambiarla en Ajustes › Mi perfil › Conexión.']), 'warn');
        location.reload();
      } catch (err) {
        msg.textContent = err.message;
      }
    };
    document.body.append(box);
    f.tri.focus();
  }

  window.SuiteUsers = {
    ROLES,
    mode,
    config: () => ({
      ...(cfg || {}),
      mode: mode()
    }),
    loadConfig,
    setMode,
    session,
    effective,
    by,
    isAdmin,
    trigramLocked,
    get,
    index,
    list,
    save,
    create,
    seed,
    login,
    logout,
    changePassword,
    resetPassword,
    impersonate,
    stopImpersonation,
    themePrefs,
    setThemePrefs,
    hashPassword,
    verify
  };
  banner();
  // mode lu (fichier partagé) : connexion exigée le cas échéant ; changements d'un autre onglet suivis
  const waitA = () => A() ? Promise.resolve() : new Promise(r => {
    let n = 0;
    const i = setInterval(() => {
      if (A() || ++n > 100) {
        clearInterval(i);
        r();
      }
    }, 50);
  });
  waitA().then(() => loadConfig()).then(gate).catch(() => {});
  window.addEventListener('defa-data-change', e => {
    if (!e.detail?.path || e.detail.path.endsWith(CONFIG)) loadConfig(true).then(gate).catch(() => {});
  });
  window.addEventListener('storage', e => {
    if (e.key === SESSION) {
      banner();
      gate();
    }
  });
})();
