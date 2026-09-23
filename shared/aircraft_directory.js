(() => {
  'use strict';
  const key = 'missionAircraftDirectory:v1';
  const read = () => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
  const write = entries => localStorage.setItem(key, JSON.stringify(entries));
  const normal = value => String(value || '').trim().toUpperCase();
  function init() {
    const registration = document.querySelector('[name="registration"]');
    const callsign = document.querySelector('[name="callsign"]');
    const aircraft = document.querySelector('[name="aircraft"]');
    if (!registration || !callsign) return;
    const registrationList = document.createElement('datalist'); registrationList.id = 'knownRegistrations';
    const callsignList = document.createElement('datalist'); callsignList.id = 'knownCallsigns';
    document.body.append(registrationList, callsignList); registration.setAttribute('list', registrationList.id); callsign.setAttribute('list', callsignList.id);
    const refresh = () => {
      const entries = read(), reg = normal(registration.value), call = normal(callsign.value);
      const byReg = reg ? entries.filter(entry => entry.registration.startsWith(reg)) : entries;
      const byCall = call ? entries.filter(entry => entry.callsign.startsWith(call)) : entries;
      const candidates = reg && call ? byReg.filter(entry => entry.callsign === call || entry.registration === reg) : (reg ? byReg : (call ? byCall : entries));
      registrationList.innerHTML = [...new Set(candidates.map(entry => entry.registration))].map(value => `<option value="${value}"></option>`).join('');
      callsignList.innerHTML = [...new Set(candidates.filter(entry => !reg || entry.registration === reg).map(entry => entry.callsign))].map(value => `<option value="${value}"></option>`).join('');
    };
    const complete = source => {
      const entries = read(), reg = normal(registration.value), call = normal(callsign.value);
      if (source === 'registration' && reg && !call) { const match = entries.find(entry => entry.registration === reg); if (match) callsign.value = match.callsign; }
      if (source === 'callsign' && call && !reg) { const matches = entries.filter(entry => entry.callsign === call); if (matches.length === 1) registration.value = matches[0].registration; }
      const finalReg = normal(registration.value), finalCall = normal(callsign.value);
      const type = String(aircraft?.value || '').trim();
      if (finalReg && finalCall) {
        const kept = entries.filter(entry => !(entry.registration === finalReg && entry.callsign === finalCall));
        write([...kept, { registration: finalReg, callsign: finalCall, type, updatedAt: new Date().toISOString() }]);
        if (aircraft && !aircraft.value) { const match = entries.find(entry => entry.registration === finalReg && entry.type); if (match) aircraft.value = match.type; }
      }
      refresh();
    };
    registration.addEventListener('input', refresh); callsign.addEventListener('input', refresh); aircraft?.addEventListener('change', () => complete('aircraft'));
    registration.addEventListener('change', () => complete('registration')); callsign.addEventListener('change', () => complete('callsign'));
    refresh();
  }
  window.addEventListener('DOMContentLoaded', init);
})();
