(() => {
  'use strict';
  // Profil pilote partagé : ID IVAO (VID), ID VATSIM (CID) et identifiant SimBrief (import
  // du plan de vol dans les CR du Mission Report Core) saisis une seule fois dans
  // le menu du framework, disponibles sur toutes les pages (chargé par repository_nav.js).
  // Même stockage que les préférences des reportings (mission_reporting_config.js) :
  // les champs de préférences des reportings et les champs ivaoId / vatsimId des CR
  // restent synchronisés, y compris entre onglets ouverts.
  const nav = window.RepositoryNav;
  if (!nav?.menu || document.getElementById('repoPilotProfile')) return;
  const KEY = 'missionReportingConfig:v1',
    FIELDS = ['ivaoId', 'vatsimId', 'simbriefUser'];
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
      /* stockage indisponible */ }
  };
  const TEXT = {
    fr: {
      title: 'Profil pilote',
      ivaoId: 'ID IVAO (VID)',
      vatsimId: 'ID VATSIM (CID)',
      simbriefUser: 'SimBrief (utilisateur ou ID)'
    },
    en: {
      title: 'Pilot profile',
      ivaoId: 'IVAO ID (VID)',
      vatsimId: 'VATSIM ID (CID)',
      simbriefUser: 'SimBrief (username or ID)'
    },
    de: {
      title: 'Pilotenprofil',
      ivaoId: 'IVAO-ID (VID)',
      vatsimId: 'VATSIM-ID (CID)',
      simbriefUser: 'SimBrief (Benutzer oder ID)'
    },
    es: {
      title: 'Perfil de piloto',
      ivaoId: 'ID IVAO (VID)',
      vatsimId: 'ID VATSIM (CID)',
      simbriefUser: 'SimBrief (usuario o ID)'
    }
  };

  const style = document.createElement('style');
  style.textContent = '.repo-profile-field{display:grid;grid-template-columns:1fr 120px;align-items:center;gap:8px;padding:5px 8px;font-size:12px}' +
    '.repo-profile-field input{width:100%;box-sizing:border-box;padding:5px 7px;border-radius:6px;border:1px solid color-mix(in srgb,var(--repo-bar-text) 25%,transparent);background:color-mix(in srgb,var(--repo-bar-text) 8%,transparent);color:inherit;font:inherit}';
  document.head.append(style);

  const box = document.createElement('div');
  box.id = 'repoPilotProfile';
  box.innerHTML = '<div class="repo-sep"></div><div class="repo-group" data-profile-text="title"></div>' +
    FIELDS.map(name => `<label class="repo-profile-field"><span data-profile-text="${name}"></span><input data-profile="${name}"${name === 'simbriefUser' ? '' : ' inputmode="numeric"'} autocomplete="off"></label>`).join('');
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
  };

  FIELDS.forEach(name => {
    let previous = read()[name] || '';
    inputs[name].addEventListener('input', () => {
      const value = inputs[name].value.trim();
      write({
        [name]: value
      });
      propagate(name, value, previous);
      previous = value;
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
  window.addEventListener('repository-language-change', translate);
  translate();
  refresh();
})();
