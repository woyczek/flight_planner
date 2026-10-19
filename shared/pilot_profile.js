(() => {
  'use strict';
  // Profil pilote partagé : trigramme (missions affectées : shared/assignments.js), ID IVAO (VID), ID VATSIM (CID)
  // et identifiant SimBrief (import
  // du plan de vol dans les CR du Mission Report Core) saisis une seule fois dans
  // le menu du framework, disponibles sur toutes les pages (chargé par repository_nav.js).
  // Même stockage que les préférences des reportings (mission_reporting_config.js) :
  // les champs de préférences des reportings et les champs ivaoId / vatsimId des CR
  // restent synchronisés, y compris entre onglets ouverts.
  const nav = window.RepositoryNav;
  if (!nav?.menu || document.getElementById('repoPilotProfile')) return;
  const KEY = 'missionReportingConfig:v1',
    FIELDS = ['trigram', 'ivaoId', 'vatsimId', 'simbriefUser'],
    // identifiants des réseaux et de SimBrief : réglés dans Mon profil seulement (une seule place), affichés ici
    READ_ONLY = ['ivaoId', 'vatsimId', 'simbriefUser'];
  /** Profil pilote mémorisé (missionReportingConfig:v1 : nom, ID IVAO / VATSIM, identifiant SimBrief…). */
  const read = () => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '{}') || {};
    } catch {
      return {};
    }
  };
  /** Met à jour le profil pilote (fusion) et le mémorise. */
  const write = patch => {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        ...read(),
        ...patch
      }));
    } catch {
      /* stockage indisponible */
    }
  };
  const TEXT = {
    fr: {
      title: 'Profil pilote',
      trigram: 'Trigramme (missions affectées)',
      ivaoId: 'ID IVAO (VID)',
      vatsimId: 'ID VATSIM (CID)',
      simbriefUser: 'SimBrief (utilisateur ou ID)',
      edit: 'Modifier dans Mon profil ↗'
    },
    en: {
      title: 'Pilot profile',
      trigram: 'Trigram (assigned missions)',
      ivaoId: 'IVAO ID (VID)',
      vatsimId: 'VATSIM ID (CID)',
      simbriefUser: 'SimBrief (username or ID)',
      edit: 'Edit in My profile ↗'
    },
    de: {
      title: 'Pilotenprofil',
      trigram: 'Kürzel (zugewiesene Missionen)',
      ivaoId: 'IVAO-ID (VID)',
      vatsimId: 'VATSIM-ID (CID)',
      simbriefUser: 'SimBrief (Benutzer oder ID)',
      edit: 'In Mein Profil ändern ↗'
    },
    es: {
      title: 'Perfil de piloto',
      trigram: 'Trigrama (misiones asignadas)',
      ivaoId: 'ID IVAO (VID)',
      vatsimId: 'ID VATSIM (CID)',
      simbriefUser: 'SimBrief (usuario o ID)',
      edit: 'Modificar en Mi perfil ↗'
    }
  };

  const style = document.createElement('style');
  style.textContent =
    '.repo-profile-field{display:grid;grid-template-columns:1fr 120px;align-items:center;gap:8px;padding:5px 8px;font-size:12px}' +
    '.repo-profile-edit{display:block;padding:2px 8px 6px;font-size:12px;color:inherit;text-align:right}' +
    '.repo-profile-field input[readonly]{opacity:.75;cursor:default}' +
    '.repo-profile-field input{width:100%;box-sizing:border-box;padding:5px 7px;border-radius:6px;border:1px solid color-mix(in srgb,var(--repo-bar-text) 25%,transparent);background:color-mix(in srgb,var(--repo-bar-text) 8%,transparent);color:inherit;font:inherit}';
  document.head.append(style);

  const box = document.createElement('div');
  box.id = 'repoPilotProfile';
  box.innerHTML = '<div class="repo-sep"></div><div class="repo-group" data-profile-text="title"></div>' +
    FIELDS.map(name => `<label class="repo-profile-field"><span data-profile-text="${name}"></span><input data-profile="${name}"${name === 'simbriefUser' ? '' : name === 'trigram' ? ' maxlength="4" style="text-transform:uppercase"' : ' inputmode="numeric"'}${READ_ONLY.includes(name) ? ' readonly' : ''} autocomplete="off"></label>`).join('') +
    `<a class="repo-profile-edit" data-profile-text="edit" href="${nav.settingsUrl?.('identity') || '#'}"></a>`;
  const actions = nav.menu.querySelector('.repo-page-actions');
  nav.menu.insertBefore(box, actions || null);
  const inputs = Object.fromEntries(FIELDS.map(name => [name, box.querySelector(`[data-profile="${name}"]`)]));

  /** Retraduit les libellés du formulaire de profil pilote (menu ☰). */
  const translate = () => {
    const text = TEXT[nav.getLanguage?.()] || TEXT.fr;
    box.querySelectorAll('[data-profile-text]').forEach(el => {
      el.textContent = text[el.dataset.profileText];
    });
  };
  // Répercute un ID sur la page : champs de préférences (data-mission-config) et champs
  // de CR (name=ivaoId / vatsimId) encore vides ou égaux à l'ancienne valeur du profil.
  const propagate = (name, value, previous) => {
    document.querySelectorAll(`[data-mission-config="${name}"]`).forEach(el => {
      if (el.value !== value) el.value = value;
    });
    document.querySelectorAll(`form [name="${name}"]`).forEach(el => {
      if (el.value === value || (el.value && el.value !== previous)) return;
      el.value = value;
      el.dispatchEvent(new Event('input', {
        bubbles: true
      }));
    });
    window.dispatchEvent(new CustomEvent('pilot-profile-change', {
      detail: {
        [name]: value
      }
    }));
  };
  /** Recopie le profil pilote mémorisé dans les champs du formulaire. */
  const refresh = () => {
    const config = read();
    FIELDS.forEach(name => {
      if (document.activeElement !== inputs[name]) inputs[name].value = config[name] || '';
    });
    // mode production ou usurpation (shared/users.js) : trigramme fixé par la connexion
    const U = window.SuiteUsers;
    inputs.trigram.readOnly = !!U?.trigramLocked?.();
    if (inputs.trigram.readOnly) inputs.trigram.value = U.effective() || '';
  };

  FIELDS.forEach(name => {
    let previous = read()[name] || '';
    inputs[name].addEventListener('input', () => {
      const value = name === 'trigram' ? inputs[name].value.trim().toUpperCase() : inputs[name].value.trim();
      write({
        [name]: value
      });
      propagate(name, value, previous);
      previous = value;
      if (name === 'trigram') window.MissionAssignments?.envelope(); // pli cacheté du nouveau trigramme
    });
  });
  // Saisie dans un champ de la page (préférences d'un reporting, CR) → menu à jour.
  document.addEventListener('input', event => {
    const name = event.target?.dataset?.missionConfig || event.target?.name;
    if (FIELDS.includes(name) && !box.contains(event.target)) setTimeout(refresh);
  });
  // Autre onglet / autre page ouverte : mise à jour immédiate.
  window.addEventListener('storage', event => {
    if (event.key !== KEY) return;
    const before = Object.fromEntries(FIELDS.map(name => [name, inputs[name].value]));
    refresh();
    FIELDS.forEach(name => {
      if (inputs[name].value !== before[name]) propagate(name, inputs[name].value, before[name]);
    });
  });
  // profil enregistré par une page de la suite (Paramètres › Mon profil) : champs du menu relus
  window.addEventListener('pilot-profile-change', () => setTimeout(refresh));
  for (const ev of ['suite-session-change', 'suite-mode-change']) window.addEventListener(ev, () => setTimeout(refresh));
  window.addEventListener('repository-language-change', translate);
  translate();
  refresh();
})();
