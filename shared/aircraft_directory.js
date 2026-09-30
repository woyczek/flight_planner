(() => {
  'use strict';
  const moduleUrl = document.currentScript.src;
  const storageKey = 'missionAircraftDirectory:v1';
  // Flotte DEFA Virtual (data/references/aircraft_fleet.js) : les associations locales s'ajoutent à cette base commune.
  // Un appareil de la flotte peut avoir plusieurs indicatifs : une entrée par indicatif.
  const seed = (window.DEFA_FLEET || []).flatMap(e => (e.callsigns?.length ? e.callsigns : [e.callsign || '']).map(callsign => ({
    ...e,
    callsign
  })));
  /** Clé de comparaison : majuscules, lettres et chiffres seulement. */
  const key = value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  /** Associations immatriculation ↔ indicatif ajoutées localement (missionAircraftDirectory:v1). */
  const saved = () => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch {
      return [];
    }
  };
  /** Annuaire complet : flotte DEFA (une entrée par indicatif) puis ajouts locaux, sans doublon. */
  const entries = () => [...seed, ...saved()].filter((e, i, a) => a.findIndex(x => key(x.registration) === key(e.registration) && key(x.callsign) === key(e.callsign)) === i);
  /** Mémorise les associations locales. */
  const save = value => localStorage.setItem(storageKey, JSON.stringify(value));
  window.addEventListener('DOMContentLoaded', () => {
    const registration = document.querySelector('[name="registration"]'),
      callsign = document.querySelector('[name="callsign"]'),
      aircraft = document.querySelector('[name="aircraft"]');
    if (!registration || !callsign) return;
    const regs = document.createElement('datalist'),
      calls = document.createElement('datalist');
    regs.id = 'knownRegistrations';
    calls.id = 'knownCallsigns';
    document.body.append(regs, calls);
    registration.setAttribute('list', regs.id);
    callsign.setAttribute('list', calls.id);
    /** Recharge les listes de suggestions (datalist) des champs immatriculation et indicatif. */
    const refresh = () => {
      const all = entries(),
        reg = key(registration.value),
        call = key(callsign.value);
      const choices = reg ? all.filter(e => key(e.registration).startsWith(reg)) : call ? all.filter(e => key(e.callsign).startsWith(call)) : all;
      regs.innerHTML = [...new Set(choices.map(e => e.registration))].map(v => `<option value="${v}"></option>`).join('');
      calls.innerHTML = [...new Set(choices.filter(e => !reg || key(e.registration) === reg).map(e => e.callsign))].map(v => `<option value="${v}"></option>`).join('');
    };
    /** Complète le champ jumeau (immatriculation → indicatif ; indicatif → immatriculation s'il n'y en a qu'une) et le type d'appareil ; mémorise l'association immatriculation + indicatif (+ type) et rafraîchit les suggestions. source : champ modifié (registration / callsign). */
    const complete = source => {
      const all = entries();
      let reg = key(registration.value),
        call = key(callsign.value);
      const matches = reg ? all.filter(e => key(e.registration) === reg) : all.filter(e => key(e.callsign) === call);
      if (source === 'registration' && reg && !call && matches[0]) {
        callsign.value = matches[0].callsign;
        call = key(callsign.value);
      }
      if (source === 'callsign' && call && !reg && matches.length === 1) {
        registration.value = matches[0].registration;
        reg = key(registration.value);
      }
      const selected = all.find(e => key(e.registration) === reg && (!call || key(e.callsign) === call)) || matches[0];
      if (aircraft && selected?.type && (source === 'registration' || !aircraft.value)) {
        const legacyTypes = {
          DH8D: 'Milan / Dash Q400MR',
          CL2T: 'Canadair CL-415'
        };
        const wanted = legacyTypes[selected.type] || selected.type;
        if (aircraft.tagName === 'SELECT' && ![...aircraft.options].some(option => option.value === wanted)) {
          const option = document.createElement('option');
          option.value = wanted;
          option.textContent = wanted;
          aircraft.append(option);
        }
        aircraft.value = wanted;
      }
      if (reg && call) {
        const prior = saved();
        save([...prior.filter(e => !(key(e.registration) === reg && key(e.callsign) === call)), {
          registration: registration.value.trim().toUpperCase(),
          callsign: callsign.value.trim().toUpperCase(),
          type: String(aircraft?.value || selected?.type || '').trim(),
          updatedAt: new Date().toISOString()
        }]);
      }
      refresh();
    };
    registration.addEventListener('input', refresh);
    callsign.addEventListener('input', refresh);
    registration.addEventListener('change', () => complete('registration'));
    callsign.addEventListener('change', () => complete('callsign'));
    aircraft?.addEventListener('change', () => complete('aircraft'));
    refresh();
  });
  const extensions = document.createElement('script');
  extensions.src = new URL('mission_extensions.js?v=415d166f', moduleUrl).href;
  document.head.append(extensions);
})();
