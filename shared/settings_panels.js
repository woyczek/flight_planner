(() => {
  'use strict';
  // Rubriques des pages de Paramètres écrites hors de shared/data_admin.js (docs/DISPOS_ET_REORGANISATION.md § 2) :
  //   · Mon profil — identité (trigramme, IVAO, VATSIM, SimBrief, identifiants du site DEFA, langue), appareils et
  //     simulateurs ;
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
  L('trigramme, identifiants VATSIM, IVAO, SimBrief et du site DEFA, connexion et mot de passe, préférences de thèmes, langue, appareils et simulateurs', 'trigram, VATSIM, IVAO, SimBrief and DEFA website credentials, sign-in and password, theme preferences, language, aircraft and simulators', 'Kürzel, VATSIM-, IVAO-, SimBrief- und DEFA-Website-Zugangsdaten, Anmeldung und Passwort, Themenpräferenzen, Sprache, Luftfahrzeuge und Simulatoren', 'trigrama, credenciales de VATSIM, IVAO, SimBrief y del sitio DEFA, conexión y contraseña, preferencias de temas, idioma, aeronaves y simuladores');
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
    intro: L('Types de la flotte possédés et maîtrisés, simulateurs installés : déclarés avec vos disponibilités (Mes missions), le Centre s’en sert pour vous affecter un appareil.', 'Fleet types owned and mastered, installed simulators: declared with your availability (My missions), the Centre uses them to assign you an aircraft.', 'Besessene und beherrschte Flottentypen, installierte Simulatoren: mit Ihrer Verfügbarkeit erklärt (Meine Missionen), das Zentrum nutzt sie für die Zuweisung.', 'Tipos de la flota poseídos y dominados, simuladores instalados: declarados con su disponibilidad (Mis misiones), el Centro los usa para asignarle una aeronave.'),
    async render(body, api) {
      const A = window.MissionAssignments,
        tri = A?.trigram?.() || '';
      const mm = new URL('apps/pilot/mes_missions.html', nav().root).href;
      if (!tri) {
        body.innerHTML = `<p>${esc(L('Trigramme non réglé : le régler dans « Identité et réseaux ».', 'Trigram not set: set it in “Identity and networks”.', 'Kürzel nicht gesetzt: unter „Identität und Netzwerke“ festlegen.', 'Trigrama no definido: definirlo en «Identidad y redes».'))}</p>`;
        api.actions([]);
        return;
      }
      const decl = await A.availability(tri),
        ac = decl?.aircraft || {},
        sims = decl?.sims || [];
      body.innerHTML = `<div class="sp-card" data-no-i18n><h3>${esc(K.t(['Appareils', 'Aircraft', 'Luftfahrzeuge', 'Aeronaves']))}</h3><p>${esc(tf(['{m} type(s) maîtrisé(s), {o} possédé(s).', '{m} type(s) mastered, {o} owned.', '{m} Typ(en) beherrscht, {o} besessen.', '{m} tipo(s) dominado(s), {o} poseído(s).'], {
          m: (ac.mastered || []).length,
          o: new Set([...(ac.owned || []), ...(ac.mastered || [])]).size
        }))}</p><p class="sp-hint">${esc([...(ac.mastered || [])].join(', ') || '—')}</p></div>
        <div class="sp-card" data-no-i18n><h3>${esc(K.t(['Simulateurs', 'Simulators', 'Simulatoren', 'Simuladores']))}</h3><p>${A.simChips?.(sims) || ''}${esc(sims.join(', ') || '—')}</p></div>
        <p><a class="secondary" href="${esc(mm)}#aircraft">${esc(L('Modifier dans Mes missions (Mes appareils, Mes simulateurs)', 'Edit in My missions (My aircraft, My simulators)', 'In Meine Missionen bearbeiten (Meine Luftfahrzeuge, Meine Simulatoren)', 'Editar en Mis misiones (Mis aeronaves, Mis simuladores)'))}</a></p>`;
      api.status(tf(['Pilote {t}', 'Pilot {t}', 'Pilot {t}', 'Piloto {t}'], {
        t: tri
      }));
      api.actions([]);
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

  window.SettingsPanels = {
    list: [identity, equipment, setup],
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
