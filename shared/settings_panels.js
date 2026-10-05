(() => {
  'use strict';
  // Rubriques des pages de Paramètres écrites hors de shared/data_admin.js (docs/technique/DISPOS_ET_REORGANISATION.md § 2) :
  //   · Mon profil — identité (trigramme, IVAO, VATSIM, SimBrief, identifiants du site DEFA, langue), connexion et mot de
  //     passe, préférences de thèmes (listes blanches / noires par domaine), appareils et simulateurs ;
  //   · Centre — utilisateurs et droits (shared/users.js), catégories de disponibilité (shared/dispos.js) ;
  //   · Installation — premier lancement.
  // Chaque rubrique : { id, group, title, intro, render(body, api) } dans window.SettingsPanels.list, lue par
  // DataAdmin.mount (page : REPOSITORY_TREE.settings.sections) ; api : status(texte), actions([[libellé, fn, classe]]),
  // changed() (modifié, non enregistré), saved(), show(), open(id).
  // Textes : français dans le code, lignes [fr, en, de, es] inscrites auprès de la couche de traduction
  // (shared/content_i18n.js) ; phrases avec valeurs : RepositoryKit.tf, dans des zones [data-no-i18n].
  const K = window.RepositoryKit,
    esc = K.esc;
  const rows = [];
  let pending = false;
  /** Texte français d'un libellé, sa ligne [fr, en, de, es] inscrite pour la traduction à l'affichage (par lots : les
   *  lignes des modules chargés ensuite — utilisateurs, catégories — rejoignent la couche à leur tour). */
  const L = (fr, en, de, es) => {
    rows.push([fr, en, de, es]);
    if (!pending && window.RepositoryContentI18n) {
      pending = true;
      queueMicrotask(() => {
        pending = false;
        window.RepositoryContentI18n(rows.splice(0));
      });
    }
    return fr;
  };
  const tf = K.tf;
  const PROFILE = 'missionReportingConfig:v1',
    DEFA = 'defaCredentials:v1'; // secret : gardé dans ce navigateur seulement (exclu des sauvegardes : browser_store.js)
  const notify = (m, k) => window.AppFramework?.notify?.(m, k);
  const nav = () => window.RepositoryNav;

  // sous-titres des en-têtes des quatre pages (« DEFA Virtual — … » : la couche de traduction traduit la partie après le tiret)
  L('trigramme, identifiants VATSIM, IVAO, SimBrief et du site DEFA, connexion et mot de passe, types de missions, langue, appareils et simulateurs', 'trigram, VATSIM, IVAO, SimBrief and DEFA website credentials, sign-in and password, mission types, language, aircraft and simulators', 'Kürzel, VATSIM-, IVAO-, SimBrief- und DEFA-Website-Zugangsdaten, Anmeldung und Passwort, Missionsarten, Sprache, Luftfahrzeuge und Simulatoren', 'trigrama, credenciales de VATSIM, IVAO, SimBrief y del sitio DEFA, conexión y contraseña, tipos de misión, idioma, aeronaves y simuladores');
  L('accès au Centre, utilisateurs et droits, catégories de disponibilité, réglages du routage, envoi des comptes rendus', 'Centre access, users and rights, availability categories, routing settings, report sending', 'Zugang zum Zentrum, Benutzer und Rechte, Verfügbarkeitskategorien, Routing-Einstellungen, Berichtsversand', 'acceso al Centro, usuarios y derechos, categorías de disponibilidad, ajustes de rutas, envío de informes');
  L('premier lancement, dépôt de données, dossiers, compagnie virtuelle', 'first run, data repository, folders, virtual airline', 'Erststart, Datenrepository, Ordner, virtuelle Fluggesellschaft', 'primer arranque, repositorio de datos, carpetas, aerolínea virtual');
  L('mises à jour, versions, dépendances, base SIA, caches, stockage, sauvegarde, journal, fichiers de référence', 'updates, versions, dependencies, SIA base, caches, storage, backup, journal, reference files', 'Aktualisierungen, Versionen, Abhängigkeiten, SIA-Basis, Caches, Speicher, Sicherung, Protokoll, Referenzdateien', 'actualizaciones, versiones, dependencias, base SIA, cachés, almacenamiento, copia, registro, archivos de referencia');
  L('Mon profil', 'My profile', 'Mein Profil', 'Mi perfil');
  L('Installation', 'Installation', 'Installation', 'Instalación');
  L('Paramètres — Centre', 'Settings — Centre', 'Einstellungen — Zentrum', 'Ajustes — Centro');
  L('Paramètres — Installation', 'Settings — Installation', 'Einstellungen — Installation', 'Ajustes — Instalación');
  L('Paramètres — Maintenance', 'Settings — Maintenance', 'Einstellungen — Wartung', 'Ajustes — Mantenimiento');

  const read = k => K.store.json(k, {}) || {};
  /** Champ de formulaire : libellé, saisie (attributs). */
  const field = (label, attrs) => `<label>${esc(label)}</label><input ${attrs} autocomplete="off" spellcheck="false">`;

  // ---------------------------------------------------------------- Mon profil › Identité
  const GROUP_PROFILE = L('Mon profil', 'My profile', 'Mein Profil', 'Mi perfil');
  const identity = {
    id: 'identity',
    group: GROUP_PROFILE,
    title: L('Identité et réseaux', 'Identity and networks', 'Identität und Netzwerke', 'Identidad y redes'),
    intro: L('Trigramme DEFA, identifiants des réseaux (VATSIM, IVAO), SimBrief et du site DEFA, langue de la suite. Repris par toutes les pages (☰ › Profil pilote, comptes rendus, reportings).', 'DEFA trigram, network IDs (VATSIM, IVAO), SimBrief and DEFA website credentials, suite language. Used by every page (☰ › Pilot profile, reports, reportings).', 'DEFA-Kürzel, Netzwerk-IDs (VATSIM, IVAO), SimBrief- und DEFA-Website-Zugangsdaten, Sprache der Suite. Von allen Seiten verwendet (☰ › Pilotenprofil, Berichte).', 'Trigrama DEFA, identificadores de redes (VATSIM, IVAO), SimBrief y del sitio DEFA, idioma de la suite. Usado por todas las páginas (☰ › Perfil de piloto, informes).'),
    render(body, api) {
      const p = read(PROFILE),
        d = read(DEFA),
        U = window.SuiteUsers,
        triLocked = !!U?.trigramLocked?.();
      const LANG = [
        ['auto', L('Automatique (langue du navigateur)', 'Automatic (browser language)', 'Automatisch (Browsersprache)', 'Automático (idioma del navegador)')],
        ['fr', 'Français'],
        ['en', 'English'],
        ['de', 'Deutsch'],
        ['es', 'Español']
      ];
      const mode = nav()?.getLanguageMode?.() || 'auto';
      body.innerHTML = `<div class="sp-card"><h3>${esc(L('Pilote', 'Pilot', 'Pilot', 'Piloto'))}</h3><div class="sp-form">
          ${field(L('Trigramme DEFA', 'DEFA trigram', 'DEFA-Kürzel', 'Trigrama DEFA'), `data-f="trigram" maxlength="4" style="text-transform:uppercase"${triLocked ? ' readonly' : ''}`)}
          ${field(L('ID VATSIM (CID)', 'VATSIM ID (CID)', 'VATSIM-ID (CID)', 'ID VATSIM (CID)'), 'data-f="vatsimId" inputmode="numeric"')}
          ${field(L('ID IVAO (VID)', 'IVAO ID (VID)', 'IVAO-ID (VID)', 'ID IVAO (VID)'), 'data-f="ivaoId" inputmode="numeric"')}
          ${field(L('SimBrief (utilisateur ou ID)', 'SimBrief (username or ID)', 'SimBrief (Benutzer oder ID)', 'SimBrief (usuario o ID)'), 'data-f="simbriefUser"')}
        </div>${triLocked ? `<p class="sp-hint">${esc(L('Mode production : le trigramme est celui de l’utilisateur connecté.', 'Production mode: the trigram is the signed-in user’s.', 'Produktionsmodus: Das Kürzel ist das des angemeldeten Benutzers.', 'Modo producción: el trigrama es el del usuario conectado.'))}</p>` : ''}</div>
        <div class="sp-card"><h3>${esc(L('Site DEFA', 'DEFA website', 'DEFA-Website', 'Sitio DEFA'))}</h3><div class="sp-form">
          ${field(L('Identifiant', 'Login', 'Kennung', 'Identificador'), 'data-defa="login"')}
          <label>${esc(L('Mot de passe', 'Password', 'Passwort', 'Contraseña'))}</label><input type="password" data-defa="password" autocomplete="off">
        </div><p class="sp-hint">${esc(L('Gardés dans ce navigateur seulement : jamais écrits dans un fichier ni dans une sauvegarde.', 'Kept in this browser only: never written to a file or a backup.', 'Nur in diesem Browser gespeichert: nie in eine Datei oder Sicherung geschrieben.', 'Guardadas solo en este navegador: nunca escritas en un archivo ni en una copia.'))}</p></div>
        <div class="sp-card"><h3>${esc(L('Langue', 'Language', 'Sprache', 'Idioma'))}</h3><div class="sp-form"><label>${esc(L('Langue de la suite', 'Suite language', 'Sprache der Suite', 'Idioma de la suite'))}</label>
          <select data-lang>${LANG.map(([v, l]) => `<option value="${v}"${v === mode ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></div></div>`;
      body.querySelectorAll('[data-f]').forEach(i => {
        i.value = p[i.dataset.f] || '';
        if (i.dataset.f === 'trigram' && triLocked) i.value = U.effective?.() || i.value;
      });
      body.querySelector('[data-defa="login"]').value = d.login || '';
      body.querySelector('[data-defa="password"]').value = d.password || '';
      body.querySelectorAll('input').forEach(i => i.oninput = api.changed);
      // langue : appliquée tout de suite (comme le sélecteur de l'en-tête)
      body.querySelector('[data-lang]').onchange = e => nav()?.setLanguage?.(e.target.value);
      api.status(p.trigram ? tf(['Trigramme : {t}', 'Trigram: {t}', 'Kürzel: {t}', 'Trigrama: {t}'], {
        t: p.trigram
      }) : K.t(['Trigramme non réglé', 'Trigram not set', 'Kürzel nicht gesetzt', 'Trigrama no definido']));
      api.actions([
        [L('Enregistrer', 'Save', 'Speichern', 'Guardar'), () => {
          const cur = read(PROFILE),
            next = {
              ...cur
            };
          body.querySelectorAll('[data-f]').forEach(i => {
            if (i.dataset.f === 'trigram' && triLocked) return;
            next[i.dataset.f] = i.dataset.f === 'trigram' ? i.value.trim().toUpperCase() : i.value.trim();
          });
          if (next.trigram && !/^[A-Z0-9]{2,4}$/.test(next.trigram)) return api.status(K.t(['Trigramme : 2 à 4 lettres ou chiffres.', 'Trigram: 2 to 4 letters or digits.', 'Kürzel: 2 bis 4 Buchstaben oder Ziffern.', 'Trigrama: de 2 a 4 letras o cifras.']));
          K.store.setJson(PROFILE, next);
          const login = body.querySelector('[data-defa="login"]').value.trim(),
            password = body.querySelector('[data-defa="password"]').value;
          if (login || password) K.store.setJson(DEFA, {
            login,
            password
          });
          else K.store.remove(DEFA);
          api.saved();
          // pages ouvertes et menu ☰ : profil pilote relu (événement storage des autres onglets ; ici, événement de la suite)
          window.dispatchEvent(new CustomEvent('pilot-profile-change', {
            detail: next
          }));
          if (next.trigram !== cur.trigram) window.MissionAssignments?.envelope?.();
          api.status(K.t(['Profil enregistré dans ce navigateur', 'Profile saved in this browser', 'Profil in diesem Browser gespeichert', 'Perfil guardado en este navegador']));
        }, 'primary']
      ]);
    }
  };

  // ---------------------------------------------------------------- Mon profil › Appareils et simulateurs
  const equipment = {
    id: 'equipment',
    group: GROUP_PROFILE,
    title: L('Appareils et simulateurs', 'Aircraft and simulators', 'Luftfahrzeuge und Simulatoren', 'Aeronaves y simuladores'),
    intro: L('Types de la flotte possédés et maîtrisés, simulateurs installés : le Centre s’en sert pour vous affecter un appareil et réunir des pilotes sur un simulateur commun. Recopiés dans vos semaines de disponibilités déclarées.', 'Fleet types owned and mastered, installed simulators: the Centre uses them to assign you an aircraft and to gather pilots on a common simulator. Copied into your declared availability weeks.', 'Besessene und beherrschte Flottentypen, installierte Simulatoren: Das Zentrum nutzt sie für die Zuweisung eines Luftfahrzeugs und um Piloten auf einem gemeinsamen Simulator zusammenzubringen. In Ihre angegebenen Verfügbarkeitswochen übernommen.', 'Tipos de la flota poseídos y dominados, simuladores instalados: el Centro los usa para asignarle una aeronave y reunir a pilotos en un simulador común. Copiados en sus semanas de disponibilidad declaradas.'),
    async render(body, api) {
      // éditeur (shared/equipment_editor.js) : avant, blocs « Mes appareils » et « Mes simulateurs » de Mes missions
      const [A, E] = [await need('MissionAssignments'), await need('EquipmentEditor')],
        tri = A?.trigram?.() || '';
      api.actions([]);
      if (!A || !E || !tri) {
        body.innerHTML = `<p>${esc(!tri && A ? L('Trigramme non réglé : le régler dans « Identité et réseaux ».', 'Trigram not set: set it in “Identity and networks”.', 'Kürzel nicht gesetzt: unter „Identität und Netzwerke“ festlegen.', 'Trigrama no definido: definirlo en «Identidad y redes».') : K.t(['Composant manquant (shared/equipment_editor.js, shared/assignments.js).', 'Missing component (shared/equipment_editor.js, shared/assignments.js).', 'Fehlende Komponente (shared/equipment_editor.js, shared/assignments.js).', 'Falta un componente (shared/equipment_editor.js, shared/assignments.js).']))}</p>`;
        return;
      }
      await E.mount(body, tri);
      api.status(tf(['Pilote {t}', 'Pilot {t}', 'Pilot {t}', 'Piloto {t}'], {
        t: tri
      }));
    }
  };

  // ---------------------------------------------------------------- Installation › Premier lancement
  const setup = {
    id: 'setup',
    group: L('Installation', 'Installation', 'Installation', 'Instalación'),
    title: L('Premier lancement', 'First run', 'Erststart', 'Primer arranque'),
    intro: L('Réglages faits une fois : données (dépôt framagit ou archive), profil, dossier de l’application, classeur ODV, puis données SIA. La compagnie virtuelle (DEFA par défaut) et les dossiers se règlent dans « Sources et dossiers », le canal de mise à jour dans Maintenance › Mises à jour.', 'One-time settings: data (framagit repository or archive), profile, application folder, ODV workbook, then SIA data. The virtual airline (DEFA by default) and folders are set in “Sources and folders”, the update channel in Maintenance › Updates.', 'Einmalige Einstellungen: Daten (framagit-Repository oder Archiv), Profil, Anwendungsordner, ODV-Arbeitsmappe, dann SIA-Daten. Virtuelle Fluggesellschaft (standardmäßig DEFA) und Ordner unter „Quellen und Ordner“, Update-Kanal unter Wartung › Updates.', 'Ajustes hechos una vez: datos (repositorio framagit o archivo), perfil, carpeta de la aplicación, libro ODV y luego datos SIA. La aerolínea virtual (DEFA por defecto) y las carpetas se ajustan en «Fuentes y carpetas», el canal de actualización en Mantenimiento › Actualizaciones.'),
    render(body, api) {
      const done = K.store.json('suiteSetup:v1', null);
      body.innerHTML = `<p data-no-i18n>${esc(done?.at ? tf(['Premier lancement terminé le {d}.', 'First run completed on {d}.', 'Erststart abgeschlossen am {d}.', 'Primer arranque terminado el {d}.'], {
          d: new Date(done.at).toLocaleString()
        }) : K.t(['Premier lancement pas encore terminé dans ce navigateur.', 'First run not yet completed in this browser.', 'Erststart in diesem Browser noch nicht abgeschlossen.', 'Primer arranque aún no terminado en este navegador.']))}</p>
        <p class="row"><a class="primary" href="premier_lancement.html?force">${esc(L('Ouvrir le premier lancement', 'Open the first run', 'Erststart öffnen', 'Abrir el primer arranque'))}</a>
          <a class="secondary" href="#sources">${esc(L('Sources et dossiers, compagnie virtuelle', 'Sources and folders, virtual airline', 'Quellen und Ordner, virtuelle Fluggesellschaft', 'Fuentes y carpetas, aerolínea virtual'))}</a>
          <a class="secondary" href="${esc(nav().settingsUrl('updates'))}">${esc(L('Canal de mise à jour', 'Update channel', 'Update-Kanal', 'Canal de actualización'))}</a></p>
        <p class="sp-hint">${esc(L('Recommencer de zéro : « Nettoyer et recommencer… » en bas du premier lancement (efface les réglages de ce navigateur, pas les fichiers).', 'Start over: “Clean and start over…” at the bottom of the first run (clears this browser’s settings, not the files).', 'Neu beginnen: „Bereinigen und neu beginnen…“ unten im Erststart (löscht die Einstellungen dieses Browsers, nicht die Dateien).', 'Empezar de cero: «Limpiar y empezar de nuevo…» al final del primer arranque (borra los ajustes de este navegador, no los archivos).'))}</p>`;
      api.status('');
      api.actions([]);
    }
  };

  /** Attend un composant chargé à la demande par repository_nav.js (SuiteUsers, MissionAssignments). */
  const need = (name, ms = 6000) => new Promise(resolve => {
    const t0 = Date.now();
    (function poll() {
      if (window[name]) return resolve(window[name]);
      if (Date.now() - t0 > ms) return resolve(null);
      setTimeout(poll, 50);
    })();
  });
  /** Résultat d'une écriture du pool (writeData) : gardée dans ce navigateur seulement → alerte donnée par writeData,
   *  avec sa raison réelle (dossier non autorisé, autre copie de la suite…). */
  const wrote = r => r;
  const ROLE_LABEL = {
    admin_centre: L('Administrateur du Centre', 'Centre administrator', 'Administrator des Zentrums', 'Administrador del Centro'),
    utilisateur: L('Utilisateur', 'User', 'Benutzer', 'Usuario')
  };
  const ROLE_ROWS = {
    admin_centre: ['Administrateur du Centre', 'Centre administrator', 'Administrator des Zentrums', 'Administrador del Centro'],
    utilisateur: ['Utilisateur', 'User', 'Benutzer', 'Usuario']
  };
  const MODE_NOTE = {
    develop: L('Mode develop : la sécurité est testée, pas imposée (trigramme libre, connexion facultative).', 'Develop mode: security is tested, not enforced (free trigram, optional sign-in).', 'Develop-Modus: Sicherheit wird getestet, nicht erzwungen (freies Kürzel, Anmeldung optional).', 'Modo develop: la seguridad se prueba, no se impone (trigrama libre, conexión opcional).'),
    production: L('Mode production : connexion exigée pour Mes missions et le Centre, trigramme fixé par la connexion.', 'Production mode: sign-in required for My missions and the Centre, trigram set by the sign-in.', 'Produktionsmodus: Anmeldung für Meine Missionen und das Zentrum erforderlich, Kürzel durch die Anmeldung festgelegt.', 'Modo producción: conexión obligatoria para Mis misiones y el Centro, trigrama fijado por la conexión.')
  };
  L('Les contrôles se font dans le navigateur : ils ne protègent pas vraiment tant que la vérification ne passe pas par le serveur (webservice).', 'Checks run in the browser: they do not really protect until verification goes through the server (web service).', 'Die Prüfungen laufen im Browser: Sie schützen erst wirklich, wenn die Prüfung über den Server läuft (Webservice).', 'Los controles se hacen en el navegador: no protegen de verdad hasta que la verificación pase por el servidor (webservice).');

  // ---------------------------------------------------------------- Mon profil › Connexion et mot de passe
  const account = {
    id: 'account',
    group: GROUP_PROFILE,
    title: L('Connexion et mot de passe', 'Sign-in and password', 'Anmeldung und Passwort', 'Conexión y contraseña'),
    intro: L('Fiche utilisateur partagée (data/utilisateurs/<TRI>.json) : rôle, mot de passe (empreinte PBKDF2 salée, jamais en clair).', 'Shared user file (data/utilisateurs/<TRI>.json): role, password (salted PBKDF2 hash, never in clear).', 'Gemeinsame Benutzerdatei (data/utilisateurs/<TRI>.json): Rolle, Passwort (gesalzener PBKDF2-Hash, nie im Klartext).', 'Ficha de usuario compartida (data/utilisateurs/<TRI>.json): rol, contraseña (huella PBKDF2 con sal, nunca en claro).'),
    async render(body, api) {
      const U = await need('SuiteUsers');
      if (!U) {
        body.textContent = K.t(['Module des utilisateurs non chargé.', 'Users module not loaded.', 'Benutzermodul nicht geladen.', 'Módulo de usuarios no cargado.']);
        return;
      }
      await U.loadConfig(true);
      const s = U.session(),
        me = s?.login ? await U.get(s.tri) : null;
      const who = s?.login ? tf(['Connecté : {t} ({r})', 'Signed in: {t} ({r})', 'Angemeldet: {t} ({r})', 'Conectado: {t} ({r})'], {
        t: s.tri,
        r: K.t(ROLE_ROWS[s.role] || [s.role])
      }) : K.t(['Non connecté.', 'Not signed in.', 'Nicht angemeldet.', 'No conectado.']);
      body.innerHTML = `<div class="sp-card"><p class="sp-hint">${esc(MODE_NOTE[U.mode()])}</p><p data-no-i18n><b>${esc(who)}</b>${me?.a_changer ? ` — ${esc(K.t(['mot de passe provisoire, à changer', 'temporary password, to be changed', 'vorläufiges Passwort, zu ändern', 'contraseña provisional, a cambiar']))}` : ''}</p></div>
        ${s?.login ? `<div class="sp-card"><h3>${esc(L('Changer de mot de passe', 'Change password', 'Passwort ändern', 'Cambiar la contraseña'))}</h3><form class="sp-form" data-pw>
            <label>${esc(L('Mot de passe actuel', 'Current password', 'Aktuelles Passwort', 'Contraseña actual'))}</label><input type="password" name="old" autocomplete="current-password">
            <label>${esc(L('Nouveau mot de passe (8 caractères au moins)', 'New password (at least 8 characters)', 'Neues Passwort (mindestens 8 Zeichen)', 'Nueva contraseña (8 caracteres como mínimo)'))}</label><input type="password" name="pw" autocomplete="new-password" minlength="8">
            <label>${esc(L('Confirmation', 'Confirmation', 'Bestätigung', 'Confirmación'))}</label><input type="password" name="pw2" autocomplete="new-password">
            <span></span><button type="submit" class="primary">${esc(L('Changer le mot de passe', 'Change the password', 'Passwort ändern', 'Cambiar la contraseña'))}</button></form></div>` :
          `<div class="sp-card"><h3>${esc(L('Se connecter', 'Sign in', 'Anmelden', 'Conectarse'))}</h3><form class="sp-form" data-login>
            <label>${esc(L('Trigramme', 'Trigram', 'Kürzel', 'Trigrama'))}</label><input name="tri" maxlength="5" autocomplete="username" spellcheck="false" style="text-transform:uppercase">
            <label>${esc(L('Mot de passe', 'Password', 'Passwort', 'Contraseña'))}</label><input type="password" name="pw" autocomplete="current-password">
            <span></span><button type="submit" class="primary">${esc(L('Se connecter', 'Sign in', 'Anmelden', 'Conectarse'))}</button></form>
            <p class="sp-hint">${esc(L('En mode develop, une fiche sans mot de passe se connecte sans mot de passe : en définir un ensuite.', 'In develop mode, a user file without a password signs in without one: set one afterwards.', 'Im develop-Modus meldet sich ein Benutzer ohne Passwort ohne Passwort an: danach eines festlegen.', 'En modo develop, una ficha sin contraseña se conecta sin ella: definir una después.'))}</p></div>`}`;
      const login = body.querySelector('[data-login]'),
        pw = body.querySelector('[data-pw]');
      if (login) {
        login.tri.value = A()?.trigram?.() || '';
        login.onsubmit = async e => {
          e.preventDefault();
          try {
            const r = await U.login(login.tri.value, login.pw.value);
            if (r.mustChange) notify(K.t(['Définir maintenant un mot de passe (ou changer le mot de passe provisoire).', 'Set a password now (or change the temporary password).', 'Jetzt ein Passwort festlegen (oder das vorläufige ändern).', 'Definir ahora una contraseña (o cambiar la provisional).']), 'warn');
            api.show();
          } catch (err) {
            api.status(err.message);
          }
        };
      }
      if (pw) pw.onsubmit = async e => {
        e.preventDefault();
        if (pw.pw.value !== pw.pw2.value) return api.status(K.t(['Les deux saisies diffèrent.', 'The two entries differ.', 'Die beiden Eingaben unterscheiden sich.', 'Las dos entradas difieren.']));
        try {
          wrote(await U.changePassword(pw.old.value, pw.pw.value));
          pw.reset();
          api.status(K.t(['Mot de passe changé.', 'Password changed.', 'Passwort geändert.', 'Contraseña cambiada.']));
        } catch (err) {
          api.status(err.message);
        }
      };
      api.status('');
      api.actions(s?.login ? [
        [L('Se déconnecter', 'Sign out', 'Abmelden', 'Desconectarse'), () => {
          U.logout();
          api.show();
        }]
      ] : []);
    }
  };
  const A = () => window.MissionAssignments;

  // ---------------------------------------------------------------- Centre › Utilisateurs et droits
  const GROUP_CENTRE = L('Centre (CPCO)', 'Centre (CPCO)', 'Zentrum (CPCO)', 'Centro (CPCO)');
  const users = {
    id: 'users',
    group: GROUP_CENTRE,
    title: L('Utilisateurs et droits', 'Users and rights', 'Benutzer und Rechte', 'Usuarios y derechos'),
    intro: L('Une fiche par utilisateur (data/utilisateurs/<TRI>.json, synchronisée) : rôle admin_centre ou utilisateur, actif, mot de passe. Mode develop / production pour toute la compagnie (data/config/suite.json). Un administrateur peut agir en tant qu’un autre utilisateur : un bandeau le rappelle sur toutes les pages et chaque écriture porte « ADM pour TOTO ».', 'One file per user (data/utilisateurs/<TRI>.json, synchronised): role admin_centre or user, active, password. Develop / production mode for the whole airline (data/config/suite.json). An administrator can act as another user: a banner shows it on every page and every write is signed “ADM pour TOTO”.', 'Eine Datei pro Benutzer (data/utilisateurs/<TRI>.json, synchronisiert): Rolle admin_centre oder Benutzer, aktiv, Passwort. Modus develop / production für die ganze Gesellschaft (data/config/suite.json). Ein Administrator kann als anderer Benutzer handeln: ein Banner zeigt es auf allen Seiten, jede Schreibung trägt „ADM pour TOTO“.', 'Una ficha por usuario (data/utilisateurs/<TRI>.json, sincronizada): rol admin_centre o usuario, activo, contraseña. Modo develop / production para toda la compañía (data/config/suite.json). Un administrador puede actuar como otro usuario: una banda lo recuerda en todas las páginas y cada escritura lleva «ADM pour TOTO».'),
    async render(body, api) {
      const U = await need('SuiteUsers');
      if (!U) {
        body.textContent = K.t(['Module des utilisateurs non chargé.', 'Users module not loaded.', 'Benutzermodul nicht geladen.', 'Módulo de usuarios no cargado.']);
        return;
      }
      // relecture des fiches (une par utilisateur) : texte d'attente dans le panneau et barre de progression du framework
      body.innerHTML = `<p class="sp-hint">${esc(L('Lecture des fiches utilisateurs…', 'Reading user files…', 'Benutzerdateien werden gelesen…', 'Leyendo las fichas de usuario…'))}</p>`;
      const readAll = async () => {
        const tris = Object.keys(await U.index(true)).sort();
        const job = window.AppFramework?.task?.(L('Relecture des fiches utilisateurs', 'Reading user files', 'Benutzerdateien lesen', 'Lectura de las fichas de usuario'), {
          total: tris.length
        });
        let done = 0;
        try {
          const users = await Promise.all(tris.map(async tri => {
            const u = await U.get(tri, {
              fresh: true
            });
            job?.set(++done, tris.length, tri);
            return u;
          }));
          job?.end();
          return users.filter(Boolean);
        } catch (err) {
          job?.fail(err);
          throw err;
        }
      };
      await U.loadConfig(true);
      let list = await readAll();
      // dossier vide : une fiche par pilote de la référence DEFA
      if (!list.length && (window.DEFA_REFERENCE?.file || window.DEFA_REFERENCE)?.pilots?.length) {
        const made = await U.seed();
        if (made.length) {
          notify(tf(['{n} fiches créées d’après la référence DEFA.', '{n} user files created from the DEFA reference.', '{n} Benutzerdateien aus der DEFA-Referenz erstellt.', '{n} fichas creadas a partir de la referencia DEFA.'], {
            n: made.length
          }), 'ok');
          if ((A()?.pendingData?.() || []).some(p => p.startsWith('utilisateurs/'))) wrote({
            where: 'local'
          });
        }
        list = await readAll();
      }
      const s = U.session(),
        pending = (A()?.pendingData?.() || []).filter(p => /^(utilisateurs|config)\//.test(p));
      const pwState = u => u.mot_de_passe ? (u.a_changer ? L('provisoire', 'temporary', 'vorläufig', 'provisional') : L('défini', 'set', 'gesetzt', 'definida')) : L('aucun', 'none', 'keins', 'ninguna');
      body.innerHTML = `<div class="sp-card"><h3>${esc(L('Mode de la compagnie', 'Airline mode', 'Modus der Gesellschaft', 'Modo de la compañía'))}</h3>
          <div class="sp-form"><label>${esc(L('Mode', 'Mode', 'Modus', 'Modo'))}</label><select data-mode><option value="develop">develop</option><option value="production">production</option></select></div>
          <p class="sp-hint">${esc(MODE_NOTE[U.mode()])}</p><p class="sp-hint">${esc('Les contrôles se font dans le navigateur : ils ne protègent pas vraiment tant que la vérification ne passe pas par le serveur (webservice).')}</p>
          <p class="sp-hint" data-no-i18n>${esc(s?.login ? tf(['Connecté : {t}', 'Signed in: {t}', 'Angemeldet: {t}', 'Conectado: {t}'], { t: s.tri }) : K.t(['Non connecté (Mon profil › Connexion et mot de passe).', 'Not signed in (My profile › Sign-in and password).', 'Nicht angemeldet (Mein Profil › Anmeldung und Passwort).', 'No conectado (Mi perfil › Conexión y contraseña).']))}</p></div>
        ${pending.length ? `<div class="sp-card" data-no-i18n><p>${esc(tf(['{n} fichier(s) gardé(s) dans ce navigateur, pas encore dans le dossier des données.', '{n} file(s) kept in this browser, not yet in the data folder.', '{n} Datei(en) in diesem Browser, noch nicht im Datenordner.', '{n} archivo(s) guardado(s) en este navegador, aún no en la carpeta de datos.'], { n: pending.length }))}</p><button type="button" class="secondary" data-flush>${esc(K.t(['Écrire dans le dossier des données', 'Write to the data folder', 'In den Datenordner schreiben', 'Escribir en la carpeta de datos']))}</button></div>` : ''}
        <div class="da-scroll"><table class="da-table"><thead><tr><th>${esc(L('Trigramme', 'Trigram', 'Kürzel', 'Trigrama'))}</th><th>${esc(L('Nom affiché', 'Display name', 'Anzeigename', 'Nombre mostrado'))}</th><th>${esc(L('Rôle', 'Role', 'Rolle', 'Rol'))}</th><th>${esc(L('Actif', 'Active', 'Aktiv', 'Activo'))}</th><th>${esc(L('Mot de passe', 'Password', 'Passwort', 'Contraseña'))}</th><th></th></tr></thead>
        <tbody>${list.map(u => `<tr data-u="${esc(u.trigramme)}"><td><b>${esc(u.trigramme)}</b></td><td><input data-k="nom" value="${esc(u.nom || '')}"></td>
          <td><select data-k="role">${U.ROLES.map(r => `<option value="${r}"${r === u.role ? ' selected' : ''}>${esc(ROLE_LABEL[r])}</option>`).join('')}</select></td>
          <td><input type="checkbox" data-k="actif"${u.actif !== false ? ' checked' : ''}></td><td>${esc(pwState(u))}</td>
          <td class="row"><button type="button" class="secondary" data-reset>${esc(L('Réinitialiser…', 'Reset…', 'Zurücksetzen…', 'Restablecer…'))}</button><button type="button" class="secondary" data-imp>${esc(L('Usurper', 'Impersonate', 'Übernehmen', 'Suplantar'))}</button></td></tr>`).join('')}</tbody></table></div>
        <div class="sp-card"><h3>${esc(L('Ajouter un utilisateur', 'Add a user', 'Benutzer hinzufügen', 'Añadir un usuario'))}</h3><form class="sp-form" data-add>
          <label>${esc(L('Trigramme', 'Trigram', 'Kürzel', 'Trigrama'))}</label><input name="tri" maxlength="5" required style="text-transform:uppercase">
          <label>${esc(L('Nom affiché', 'Display name', 'Anzeigename', 'Nombre mostrado'))}</label><input name="nom">
          <label>${esc(L('Rôle', 'Role', 'Rolle', 'Rol'))}</label><select name="role">${U.ROLES.map(r => `<option value="${r}">${esc(ROLE_LABEL[r])}</option>`).join('')}</select>
          <span></span><button type="submit" class="primary">${esc(L('Ajouter', 'Add', 'Hinzufügen', 'Añadir'))}</button></form></div>
        <div class="sp-card" data-reset-box hidden><h3 data-no-i18n></h3><form class="sp-form" data-resetf>
          <label>${esc(L('Mot de passe provisoire (8 caractères au moins)', 'Temporary password (at least 8 characters)', 'Vorläufiges Passwort (mindestens 8 Zeichen)', 'Contraseña provisional (8 caracteres como mínimo)'))}</label><input type="password" name="pw" autocomplete="new-password" minlength="8">
          <span></span><button type="submit" class="primary">${esc(L('Réinitialiser le mot de passe', 'Reset the password', 'Passwort zurücksetzen', 'Restablecer la contraseña'))}</button></form></div>`;
      const modeSel = body.querySelector('[data-mode]');
      modeSel.value = U.mode();
      modeSel.onchange = async () => {
        try {
          wrote(await U.setMode(modeSel.value));
          api.show();
        } catch (err) {
          modeSel.value = U.mode();
          notify(err.message, 'warn');
        }
      };
      body.querySelector('[data-flush]')?.addEventListener('click', async () => {
        try {
          const done = await A().flushData();
          notify(tf(['{n} fichier(s) écrit(s) dans le dossier des données.', '{n} file(s) written to the data folder.', '{n} Datei(en) in den Datenordner geschrieben.', '{n} archivo(s) escrito(s) en la carpeta de datos.'], {
            n: done.length
          }), 'ok');
          api.show();
        } catch (err) {
          notify(err.message, 'warn');
        }
      });
      // modification d'une ligne : fiche réécrite aussitôt
      body.querySelector('tbody').onchange = async e => {
        const tr = e.target.closest('tr[data-u]');
        if (!tr) return;
        try {
          const u = await U.get(tr.dataset.u, {
            fresh: true
          });
          const k = e.target.dataset.k;
          wrote(await U.save({
            ...u,
            [k]: k === 'actif' ? e.target.checked : e.target.value.trim()
          }));
          api.status(tf(['{t} enregistré.', '{t} saved.', '{t} gespeichert.', '{t} guardado.'], {
            t: tr.dataset.u
          }));
        } catch (err) {
          notify(err.message, 'warn');
        }
      };
      let resetFor = '';
      body.querySelector('tbody').onclick = async e => {
        const tr = e.target.closest('tr[data-u]');
        if (!tr) return;
        if (e.target.closest('[data-imp]')) {
          try {
            await U.impersonate(tr.dataset.u);
            notify(tf(['Vous agissez en tant que {t}.', 'You are acting as {t}.', 'Sie handeln als {t}.', 'Actúa como {t}.'], {
              t: tr.dataset.u
            }), 'ok');
          } catch (err) {
            notify(err.message, 'warn');
          }
        }
        if (e.target.closest('[data-reset]')) {
          resetFor = tr.dataset.u;
          const box = body.querySelector('[data-reset-box]');
          box.hidden = false;
          box.querySelector('h3').textContent = tf(['Réinitialiser le mot de passe de {t}', 'Reset the password of {t}', 'Passwort von {t} zurücksetzen', 'Restablecer la contraseña de {t}'], {
            t: resetFor
          });
          box.querySelector('input').focus();
        }
      };
      body.querySelector('[data-resetf]').onsubmit = async e => {
        e.preventDefault();
        try {
          wrote(await U.resetPassword(resetFor, e.target.pw.value));
          notify(tf(['Mot de passe provisoire de {t} enregistré : à changer à sa prochaine connexion.', 'Temporary password of {t} saved: to be changed at the next sign-in.', 'Vorläufiges Passwort von {t} gespeichert: bei der nächsten Anmeldung zu ändern.', 'Contraseña provisional de {t} guardada: a cambiar en la próxima conexión.'], {
            t: resetFor
          }), 'ok');
          api.show();
        } catch (err) {
          notify(err.message, 'warn');
        }
      };
      body.querySelector('[data-add]').onsubmit = async e => {
        e.preventDefault();
        const f = e.target;
        try {
          const tri = f.tri.value.trim().toUpperCase();
          wrote(await U.create(tri, {
            nom: f.nom.value.trim(),
            role: f.role.value
          }));
          notify(tf(['{t} ajouté.', '{t} added.', '{t} hinzugefügt.', '{t} añadido.'], {
            t: tri
          }), 'ok');
          api.show();
        } catch (err) {
          notify(err.message, 'warn');
        }
      };
      api.status(tf(['{n} utilisateur(s)', '{n} user(s)', '{n} Benutzer', '{n} usuario(s)'], {
        n: list.length
      }));
      api.actions([]);
    }
  };

  // ---------------------------------------------------------------- Mon profil › Préférences de thèmes
  const MODES = [
    ['tous', L('Tous les thèmes du domaine', 'Every theme of the domain', 'Alle Themen des Bereichs', 'Todos los temas del dominio')],
    ['blanche', L('Liste blanche : seulement ces thèmes', 'Allow list: only these themes', 'Positivliste: nur diese Themen', 'Lista blanca: solo estos temas')],
    ['noire', L('Liste noire : tous sauf ces thèmes', 'Block list: all but these themes', 'Negativliste: alle außer diesen Themen', 'Lista negra: todos menos estos temas')]
  ];
  const themesPanel = {
    id: 'themes',
    group: GROUP_PROFILE,
    title: L('Types de missions', 'Mission types', 'Missionsarten', 'Tipos de misión'),
    intro: L('Thèmes de mission ouverts par les catégories personnalisées (« sécurité civile personnalisée », « défense personnalisée ») de vos disponibilités : pour chaque domaine, une liste blanche (seulement ces thèmes) ou une liste noire (tous sauf ces thèmes). Gardées dans votre fiche utilisateur, synchronisée.', 'Mission themes opened by the custom categories (“custom civil security”, “custom defence”) of your availability: for each domain, an allow list (only these themes) or a block list (all but these themes). Kept in your user file, synchronised.', 'Missionsthemen, die die Kategorien nach Wahl („Zivilschutz nach Wahl“, „Verteidigung nach Wahl“) Ihrer Verfügbarkeit öffnen: je Bereich eine Positivliste (nur diese Themen) oder eine Negativliste (alle außer diesen). In Ihrer synchronisierten Benutzerdatei gespeichert.', 'Temas de misión abiertos por las categorías personalizadas («seguridad civil personalizada», «defensa personalizada») de su disponibilidad: por dominio, una lista blanca (solo estos temas) o una lista negra (todos menos estos). Guardadas en su ficha de usuario, sincronizada.'),
    async render(body, api) {
      const [U, SD] = [await need('SuiteUsers'), await need('SuiteDispos')];
      const tri = A()?.trigram?.() || '';
      if (!U || !SD || !tri) {
        body.innerHTML = `<p>${esc(L('Trigramme non réglé : le régler dans « Identité et réseaux ».', 'Trigram not set: set it in “Identity and networks”.', 'Kürzel nicht gesetzt: unter „Identität und Netzwerke“ festlegen.', 'Trigrama no definido: definirlo en «Identidad y redes».'))}</p>`;
        api.actions([]);
        return;
      }
      const prefs = (await U.themePrefs(tri)) || {};
      body.innerHTML = SD.domains().map(d => {
        const p = prefs[d.id] || {
          mode: 'tous',
          liste: []
        };
        return `<div class="sp-card" data-dom="${esc(d.id)}" data-no-i18n><h3>${esc(SD.label(d.label))}</h3>
          <div class="sp-chips">${MODES.map(([m]) => `<label><input type="radio" name="m-${esc(d.id)}" value="${m}"${(p.mode || 'tous') === m ? ' checked' : ''}> ${esc(K.t(rowOf(m)))}</label>`).join('')}</div>
          <div class="sp-chips" data-list>${d.themes.map(th => `<label><input type="checkbox" value="${esc(th)}"${(p.liste || []).includes(th) ? ' checked' : ''}> <b>${esc(th)}</b> ${esc(SD.themeLabel(th))}</label>`).join('')}</div>
          <p class="sp-hint" data-open></p></div>`;
      }).join('');
      // thèmes réellement ouverts, recalculés à chaque coche
      const read = () => Object.fromEntries([...body.querySelectorAll('[data-dom]')].map(c => [c.dataset.dom, {
        mode: c.querySelector('input[type=radio]:checked')?.value || 'tous',
        liste: [...c.querySelectorAll('[data-list] input:checked')].map(x => x.value)
      }]));
      const preview = () => {
        const p = read();
        body.querySelectorAll('[data-dom]').forEach(c => {
          const cat = SD.categories({
            all: true
          }).find(x => x.ouverts === `prefs:${c.dataset.dom}`);
          const open = cat ? [...SD.openThemes(cat, p)] : [];
          c.querySelector('[data-list]').style.opacity = p[c.dataset.dom].mode === 'tous' ? '.7' : '';
          c.querySelector('[data-open]').textContent = cat ? tf(['« {c} » ouvre : {t}', '“{c}” opens: {t}', '„{c}“ öffnet: {t}', '«{c}» abre: {t}'], {
            c: SD.label(cat.label),
            t: open.map(SD.themeLabel).join(', ') || '—'
          }) : '';
        });
      };
      body.onchange = () => {
        api.changed();
        preview();
      };
      preview();
      api.status(tf(['Pilote {t}', 'Pilot {t}', 'Pilot {t}', 'Piloto {t}'], {
        t: tri
      }));
      api.actions([
        [L('Enregistrer', 'Save', 'Speichern', 'Guardar'), async () => {
          const p = read();
          // « tous » : pas de liste (préférence effacée pour ce domaine)
          const themes = Object.fromEntries(Object.entries(p).filter(([, v]) => v.mode !== 'tous'));
          wrote(await U.setThemePrefs(tri, themes));
          api.saved();
          api.status(K.t(['Préférences enregistrées.', 'Preferences saved.', 'Präferenzen gespeichert.', 'Preferencias guardadas.']));
        }, 'primary']
      ]);
    }
  };
  const rowOf = m => ({
    tous: ['Tous les thèmes du domaine', 'Every theme of the domain', 'Alle Themen des Bereichs', 'Todos los temas del dominio'],
    blanche: ['Liste blanche : seulement ces thèmes', 'Allow list: only these themes', 'Positivliste: nur diese Themen', 'Lista blanca: solo estos temas'],
    noire: ['Liste noire : tous sauf ces thèmes', 'Block list: all but these themes', 'Negativliste: alle außer diesen Themen', 'Lista negra: todos menos estos temas']
  })[m];

  // ---------------------------------------------------------------- Centre › Catégories de disponibilité
  const OUVERTS = [
    ['all', ['tous les thèmes', 'every theme', 'alle Themen', 'todos los temas']],
    ['none', ['aucun', 'none', 'keine', 'ninguno']]
  ];
  const TYPES = [
    ['dispo', ['disponible', 'available', 'verfügbar', 'disponible']],
    ['atc', ['contrôle', 'control', 'Lotsendienst', 'control']],
    ['occupe', ['occupé', 'busy', 'beschäftigt', 'ocupado']],
    ['indispo', ['indisponible', 'unavailable', 'nicht verfügbar', 'no disponible']]
  ];
  const categoriesPanel = {
    id: 'dispoCategories',
    group: GROUP_CENTRE,
    title: L('Catégories de disponibilité', 'Availability categories', 'Verfügbarkeitskategorien', 'Categorías de disponibilidad'),
    intro: L('Ce que les pilotes déclarent (data/config/disponibilites.json, synchronisé) : groupes affichés dans l’ODV, catégories (libellés, couleur, thèmes ouverts, type, codes du classeur ODV), thèmes par domaine. Une catégorie qui a servi se retire (cachée des listes, gardée pour l’historique), elle ne s’efface pas.', 'What pilots declare (data/config/disponibilites.json, synchronised): groups shown in the ODV, categories (labels, colour, open themes, type, ODV workbook codes), themes per domain. A category that has been used is retired (hidden from lists, kept for history), never deleted.', 'Was die Piloten angeben (data/config/disponibilites.json, synchronisiert): in der ODV angezeigte Gruppen, Kategorien (Bezeichnungen, Farbe, offene Themen, Typ, Codes der ODV-Arbeitsmappe), Themen je Bereich. Eine benutzte Kategorie wird zurückgezogen (in Listen ausgeblendet, für den Verlauf behalten), nie gelöscht.', 'Lo que declaran los pilotos (data/config/disponibilites.json, sincronizado): grupos mostrados en el ODV, categorías (etiquetas, color, temas abiertos, tipo, códigos del libro ODV), temas por dominio. Una categoría usada se retira (oculta en las listas, guardada para el historial), nunca se borra.'),
    async render(body, api) {
      const SD = await need('SuiteDispos');
      if (!SD) {
        body.textContent = K.t(['Module des disponibilités non chargé.', 'Availability module not loaded.', 'Verfügbarkeitsmodul nicht geladen.', 'Módulo de disponibilidad no cargado.']);
        return;
      }
      const cfg = structuredClone(await SD.load(true));
      const known = new Set((cfg.categories || []).map(c => c.id)); // catégories existantes : identifiant figé, pas de suppression
      const ouvertsOpts = c => {
        const v = Array.isArray(c.ouverts) ? 'list' : c.ouverts || 'none';
        return [...OUVERTS, ...cfg.domaines.flatMap(d => [
          [`domain:${d.id}`, [`domaine ${SD.label(d.label)} : {t}`, `domain ${SD.label(d.label)}: {t}`, `Bereich ${SD.label(d.label)}: {t}`, `dominio ${SD.label(d.label)}: {t}`], d],
          [`prefs:${d.id}`, [`${SD.label(d.label)} selon les préférences, parmi {t}`, `${SD.label(d.label)} per preferences, among {t}`, `${SD.label(d.label)} nach Präferenzen, aus {t}`, `${SD.label(d.label)} según preferencias, entre {t}`], d]
        ]), ['list', ['liste de thèmes', 'theme list', 'Themenliste', 'lista de temas']]].map(([k, row, d]) => `<option value="${esc(k)}"${k === v ? ' selected' : ''}>${esc(d ? tf(row, { t: d.themes.join(' ') }) : K.t(row))}</option>`).join('');
      };
      const L4 = (row, k) => `<input data-k="${k}0" value="${esc((Array.isArray(row) ? row[0] : row) || '')}" style="width:16em">`; // français seul : les autres langues passent par l'audit i18n
      const catRow = c => `<tr data-id="${esc(c.id)}"${c.retiree ? ' class="sp-retired"' : ''}><td>${known.has(c.id) ? `<code>${esc(c.id)}</code>` : `<input data-k="id" value="${esc(c.id)}" style="width:8em">`}</td>
        <td><select data-k="groupe">${cfg.groupes.map(g => `<option value="${esc(g.id)}"${g.id === c.groupe ? ' selected' : ''}>${esc(SD.label(g.label))}</option>`).join('')}</select></td>
        <td>${L4(c.label, 'l')}</td><td><input type="color" data-k="couleur" value="${esc(c.couleur || '#bfbfbf')}"></td>
        <td><select data-k="ouverts">${ouvertsOpts(c)}</select><input data-k="liste" value="${esc(Array.isArray(c.ouverts) ? c.ouverts.join(' ') : '')}" placeholder="EXERCICE CONTROLE" title="${esc(K.t(['Thèmes séparés par des espaces', 'Themes separated by spaces', 'Themen durch Leerzeichen getrennt', 'Temas separados por espacios']))}" style="width:9em"${Array.isArray(c.ouverts) ? '' : ' hidden'}></td>
        <td><select data-k="type">${TYPES.map(([k, row]) => `<option value="${k}"${k === c.type ? ' selected' : ''}>${esc(K.t(row))}</option>`).join('')}</select></td>
        <td><input data-k="odv" value="${esc((c.odv || []).join(' '))}" title="${esc(K.t(['Codes des cases du classeur ODV lus comme cette catégorie à l’import, séparés par des espaces ; le premier s’affiche dans la grille des disponibilités', 'ODV workbook cell codes read as this category on import, separated by spaces; the first one is shown in the availability grid', 'Zellcodes der ODV-Arbeitsmappe, die beim Import als diese Kategorie gelesen werden, durch Leerzeichen getrennt; der erste erscheint im Verfügbarkeitsraster', 'Códigos de celda del libro ODV leídos como esta categoría al importar, separados por espacios; el primero se muestra en la cuadrícula de disponibilidad']))}" style="width:6em"></td>
        <td>${known.has(c.id) ? `<input type="checkbox" data-k="retiree"${c.retiree ? ' checked' : ''}>` : `<button type="button" class="repo-plain da-del" data-drop title="${esc(K.t(['Supprimer cette nouvelle catégorie', 'Delete this new category', 'Diese neue Kategorie löschen', 'Eliminar esta nueva categoría']))}">✕</button>`}</td></tr>`;
      const draw = () => {
        body.innerHTML = `<div data-no-i18n><h3>${esc(K.t(['Catégories', 'Categories', 'Kategorien', 'Categorías']))}</h3><div class="da-scroll"><table class="da-table"><thead><tr><th>id</th><th>${esc(K.t(['Groupe', 'Group', 'Gruppe', 'Grupo']))}</th><th>${esc(K.t(['Libellé', 'Label', 'Bezeichnung', 'Etiqueta']))}</th><th>${esc(K.t(['Couleur', 'Colour', 'Farbe', 'Color']))}</th><th>${esc(K.t(['Thèmes ouverts', 'Open themes', 'Offene Themen', 'Temas abiertos']))}</th><th>Type</th><th>${esc(K.t(['Codes ODV', 'ODV codes', 'ODV-Codes', 'Códigos ODV']))}</th><th>${esc(K.t(['Retirée', 'Retired', 'Zurückgezogen', 'Retirada']))}</th></tr></thead>
          <tbody data-cats>${cfg.categories.map(catRow).join('')}</tbody></table></div>
          <p class="row"><button type="button" class="secondary" data-addcat>${esc(K.t(['Ajouter une catégorie', 'Add a category', 'Kategorie hinzufügen', 'Añadir una categoría']))}</button></p>
          <h3>${esc(K.t(['Groupes (ODV)', 'Groups (ODV)', 'Gruppen (ODV)', 'Grupos (ODV)']))}</h3><table class="da-table"><tbody data-groups>${cfg.groupes.map(g => `<tr data-id="${esc(g.id)}"><td><code>${esc(g.id)}</code></td><td>${L4(g.label, 'l')}</td><td><input type="color" data-k="couleur" value="${esc(g.couleur || '#bfbfbf')}"></td></tr>`).join('')}</tbody></table>
          <h3>${esc(K.t(['Thèmes par domaine', 'Themes per domain', 'Themen je Bereich', 'Temas por dominio']))}</h3><table class="da-table"><tbody data-domains>${cfg.domaines.map(d => `<tr data-id="${esc(d.id)}"><td><code>${esc(d.id)}</code></td><td>${L4(d.label, 'l')}</td><td><input data-k="themes" value="${esc(d.themes.join(' '))}" style="width:28em"></td></tr>`).join('')}</tbody></table>
          <p class="sp-hint">${esc(K.t(['Thème = famille de mission (COMBAT, SAR, HEMS…), séparés par des espaces ; un nouveau thème reçoit son libellé dans le fichier (themes). Libellés en français seulement : les traductions manquantes sont relevées par l’audit des traductions (tools/audit_i18n.html) ; un libellé modifié perd ses traductions jusqu’au prochain audit.', 'Theme = mission family (COMBAT, SAR, HEMS…), separated by spaces; a new theme gets its label in the file (themes). Labels in French only: missing translations are listed by the translation audit (tools/audit_i18n.html); a changed label loses its translations until the next audit.', 'Thema = Missionsfamilie (COMBAT, SAR, HEMS…), durch Leerzeichen getrennt; ein neues Thema erhält seine Bezeichnung in der Datei (themes). Bezeichnungen nur auf Französisch: fehlende Übersetzungen erfasst das Übersetzungsaudit (tools/audit_i18n.html); eine geänderte Bezeichnung verliert ihre Übersetzungen bis zum nächsten Audit.', 'Tema = familia de misión (COMBAT, SAR, HEMS…), separados por espacios; un tema nuevo recibe su etiqueta en el archivo (themes). Etiquetas solo en francés: las traducciones que faltan las recoge la auditoría de traducciones (tools/audit_i18n.html); una etiqueta modificada pierde sus traducciones hasta la próxima auditoría.']))}</p></div>`;
      };
      draw();
      /** Configuration d'après le formulaire. */
      const collect = () => {
        const val = (tr, k) => tr.querySelector(`[data-k="${k}"]`);
        // libellé français saisi ; en, de, es gardés s'il n'a pas changé, sinon vidés (l'audit des traductions les relève)
        const lab = (tr, prev) => {
          const old = Array.isArray(prev) ? prev : [prev || ''],
            fr = val(tr, 'l0').value.trim();
          return fr === old[0] ? [fr, ...[1, 2, 3].map(i => old[i] || '')] : [fr, '', '', ''];
        };
        const cats = [...body.querySelectorAll('[data-cats] tr')].map(tr => {
          const id = known.has(tr.dataset.id) ? tr.dataset.id : val(tr, 'id').value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_');
          const o = val(tr, 'ouverts').value;
          const prev = cfg.categories.find(c => c.id === tr.dataset.id) || {};
          return {
            ...prev,
            id,
            groupe: val(tr, 'groupe').value,
            type: val(tr, 'type').value,
            label: lab(tr, prev.label),
            couleur: val(tr, 'couleur').value,
            ouverts: o === 'list' ? val(tr, 'liste').value.split(/[,\s]+/).map(x => x.trim().toUpperCase()).filter(Boolean) : o,
            odv: val(tr, 'odv').value.split(/[,\s]+/).map(x => x.trim().toUpperCase()).filter(Boolean),
            ...(known.has(tr.dataset.id) ? {
              retiree: val(tr, 'retiree').checked || undefined
            } : {})
          };
        });
        const groupes = [...body.querySelectorAll('[data-groups] tr')].map(tr => ({
          ...cfg.groupes.find(g => g.id === tr.dataset.id),
          label: lab(tr, cfg.groupes.find(g => g.id === tr.dataset.id)?.label),
          couleur: val(tr, 'couleur').value
        }));
        const domaines = [...body.querySelectorAll('[data-domains] tr')].map(tr => ({
          ...cfg.domaines.find(d => d.id === tr.dataset.id),
          label: lab(tr, cfg.domaines.find(d => d.id === tr.dataset.id)?.label),
          themes: val(tr, 'themes').value.split(/[,\s]+/).map(x => x.trim().toUpperCase()).filter(Boolean)
        }));
        return {
          ...cfg,
          categories: cats,
          groupes,
          domaines
        };
      };
      body.oninput = body.onchange = e => {
        if (e.target.matches('[data-k="ouverts"]')) e.target.nextElementSibling.hidden = e.target.value !== 'list';
        api.changed();
      };
      body.onclick = e => {
        if (e.target.closest('[data-addcat]')) {
          Object.assign(cfg, collect());
          cfg.categories.push({
            id: `categorie_${cfg.categories.length + 1}`,
            groupe: 'dispo',
            type: 'dispo',
            label: ['', '', '', ''],
            couleur: '#7f9cc0',
            ouverts: 'none',
            odv: []
          });
          draw();
          api.changed();
        }
        const drop = e.target.closest('[data-drop]');
        if (drop) {
          drop.closest('tr').remove();
          api.changed();
        }
      };
      api.status(tf(['{n} catégorie(s), {r} retirée(s)', '{n} categor(y/ies), {r} retired', '{n} Kategorie(n), {r} zurückgezogen', '{n} categoría(s), {r} retirada(s)'], {
        n: cfg.categories.length,
        r: cfg.categories.filter(c => c.retiree).length
      }));
      api.actions([
        [L('Enregistrer', 'Save', 'Speichern', 'Guardar'), async () => {
          const next = collect();
          const ids = next.categories.map(c => c.id);
          if (ids.some(x => !x) || new Set(ids).size !== ids.length) return api.status(K.t(['Identifiants vides ou en double.', 'Empty or duplicate ids.', 'Leere oder doppelte Kennungen.', 'Identificadores vacíos o duplicados.']));
          if (next.categories.some(c => !c.label[0])) return api.status(K.t(['Chaque catégorie a besoin au moins d’un libellé français.', 'Each category needs at least a French label.', 'Jede Kategorie braucht mindestens eine französische Bezeichnung.', 'Cada categoría necesita al menos una etiqueta en francés.']));
          wrote(await SD.save(next));
          api.saved();
          api.show();
          api.status(K.t(['Catégories enregistrées.', 'Categories saved.', 'Kategorien gespeichert.', 'Categorías guardadas.']));
        }, 'primary'],
        [L('Valeurs par défaut', 'Default values', 'Standardwerte', 'Valores por defecto'), async () => {
          if (!await window.AppFramework.ask(K.t(['Revenir aux catégories par défaut ? (les catégories ajoutées sont gardées, retirées)', 'Back to the default categories? (added categories are kept, retired)', 'Zu den Standardkategorien zurück? (hinzugefügte bleiben, zurückgezogen)', '¿Volver a las categorías por defecto? (las añadidas se conservan, retiradas)']))) return;
          const def = structuredClone(SD.DEFAULT),
            extra = cfg.categories.filter(c => !def.categories.some(d => d.id === c.id)).map(c => ({
              ...c,
              retiree: true
            }));
          wrote(await SD.save({
            ...def,
            categories: [...def.categories, ...extra]
          }));
          api.show();
        }]
      ]);
    }
  };

  window.SettingsPanels = {
    list: [identity, account, themesPanel, equipment, setup, users, categoriesPanel],
    /** Ajoute une rubrique (autre module : utilisateurs, catégories de disponibilité). */
    add(panel) {
      this.list.push(panel);
    },
    L,
    rows
  };
  const reg = () => rows.length && window.RepositoryContentI18n?.(rows.splice(0));
  window.RepositoryContentI18n ? reg() : addEventListener('DOMContentLoaded', reg, {
    once: true
  });
})();
