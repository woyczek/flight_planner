(() => {
  'use strict';
  const moduleUrl = document.currentScript.src;
  const storageKey = 'missionAircraftDirectory:v1';
  // Flotte DEFA Virtual : les associations locales s'ajoutent à cette base commune.
  const seed = [
    ['H160','F-HMRE','BELLIGOUY'],['CL2T','F-ZBEZ','PELICAN41'],['CL2T','F-ZBEU','PELICAN42'],['CL2T','F-ZBFQ','PELICAN43'],['CL2T','F-ZBME','PELICAN44'],['CL2T','F-ZBMF','PELICAN45'],['CL2T','F-ZBMG','PELICAN48'],
    ['DH8D','F-ZBMC','MILAN73'],['DH8D','F-ZBMD','MILAN74'],['DH8D','F-ZBMH','MILAN75'],['DH8D','F-ZBMI','MILAN76'],['DH8D','F-ZBMJ','MILAN77'],['DH8D','F-ZBMK','MILAN78'],['DH8D','F-ZBML','MILAN79'],['DH8D','F-ZBBM','MILAN80'],
    ['EC45','F-ZBPD','DRAGON76'],['EC45','F-ZBPD','DRAGON30'],['EC45','F-ZBQK','DRAGON2B'],['EC45','F-ZBPM','DRAGON13'],['EC45','F-ZBPR','DRAGON34'],['EC45','F-ZBQB','DRAGON66'],['EC45','F-ZBQL','DRAGON17'],['EC45','F-ZBPE','DRAGON20'],['EC45','F-ZBPQ','DRAGON56'],['EC45','F-ZBPH','DRAGON33'],['EC45','F-ZBQM','DRAGON64'],
    ['H145','F-ZBPO','DRAGON74-1'],['H145','F-ZBCO','DRAGON74-2'],['H145','F-ZBQU','DRAGON06'],['H145','F-ZBPS','DRAGON75'],['H145','F-ZBPN','DRAGON67'],
    ['EC35','F-HDIJ','SAMU21'],['EC35','F-HCHT','SAMU24'],['EC35','F-HSUI','SAMU29'],['EC35','F-HORL','TONERRE29'],['EC35','F-HGOA','SAMU33'],['EC35','F-HGTR','SAMU34'],['EC35','F-HSUB','SAMU49'],['EC35','F-HNLO','SAMU54'],['EC35','F-GLOR','SAMU94'],['EC35','F-OHSG','SAMU974'],
    ['EC45','F-HSOF','SAMU35'],['EC45','F-HMBH','SAMU68'],['EC45','F-HSUG','SAMU45'],['EC45','F-HSUE','SAMU44'],['H145','F-HNOR','SAMU59'],['H145','F-HLCL','SAMU66'],['H145','F-HLCE','SAMU12'],['H145','F-HCHU','SAMU80'],['H145','F-HSIK','SAMU06'],['H145','F-HSMU','SAMU69']
  ].map(([type,registration,callsign]) => ({type,registration,callsign}));
  const key = value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const saved = () => { try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { return []; } };
  const entries = () => [...seed, ...saved()].filter((e, i, a) => a.findIndex(x => key(x.registration) === key(e.registration) && key(x.callsign) === key(e.callsign)) === i);
  const save = value => localStorage.setItem(storageKey, JSON.stringify(value));
  window.addEventListener('DOMContentLoaded', () => {
    const registration = document.querySelector('[name="registration"]'), callsign = document.querySelector('[name="callsign"]'), aircraft = document.querySelector('[name="aircraft"]');
    if (!registration || !callsign) return;
    const regs = document.createElement('datalist'), calls = document.createElement('datalist');
    regs.id = 'knownRegistrations'; calls.id = 'knownCallsigns'; document.body.append(regs, calls); registration.setAttribute('list', regs.id); callsign.setAttribute('list', calls.id);
    const refresh = () => {
      const all = entries(), reg = key(registration.value), call = key(callsign.value);
      const choices = reg ? all.filter(e => key(e.registration).startsWith(reg)) : call ? all.filter(e => key(e.callsign).startsWith(call)) : all;
      regs.innerHTML = [...new Set(choices.map(e => e.registration))].map(v => `<option value="${v}"></option>`).join('');
      calls.innerHTML = [...new Set(choices.filter(e => !reg || key(e.registration) === reg).map(e => e.callsign))].map(v => `<option value="${v}"></option>`).join('');
    };
    const complete = source => {
      const all = entries(); let reg = key(registration.value), call = key(callsign.value);
      const matches = reg ? all.filter(e => key(e.registration) === reg) : all.filter(e => key(e.callsign) === call);
      if (source === 'registration' && reg && !call && matches[0]) { callsign.value = matches[0].callsign; call = key(callsign.value); }
      if (source === 'callsign' && call && !reg && matches.length === 1) { registration.value = matches[0].registration; reg = key(registration.value); }
      const selected = all.find(e => key(e.registration) === reg && (!call || key(e.callsign) === call)) || matches[0];
      if (aircraft && selected?.type && (source === 'registration' || !aircraft.value)) {
        const legacyTypes = { DH8D: 'Milan / Dash Q400MR', CL2T: 'Canadair CL-415' };
        const wanted = legacyTypes[selected.type] || selected.type;
        if (aircraft.tagName === 'SELECT' && ![...aircraft.options].some(option => option.value === wanted)) {
          const option = document.createElement('option'); option.value = wanted; option.textContent = wanted; aircraft.append(option);
        }
        aircraft.value = wanted;
      }
      if (reg && call) { const prior = saved(); save([...prior.filter(e => !(key(e.registration) === reg && key(e.callsign) === call)), {registration:registration.value.trim().toUpperCase(), callsign:callsign.value.trim().toUpperCase(), type:String(aircraft?.value || selected?.type || '').trim(), updatedAt:new Date().toISOString()}]); }
      refresh();
    };
    registration.addEventListener('input', refresh); callsign.addEventListener('input', refresh);
    registration.addEventListener('change', () => complete('registration')); callsign.addEventListener('change', () => complete('callsign')); aircraft?.addEventListener('change', () => complete('aircraft')); refresh();
  });
  const extensions = document.createElement('script');
  extensions.src = new URL('mission_extensions.js?v=20260923g', moduleUrl).href;
  document.head.append(extensions);
})();
