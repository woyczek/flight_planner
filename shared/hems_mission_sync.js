// CR HEMS / MEDEVAC historique : horaires du formulaire (alerte, décollage, arrivée sur les lieux…)
// et lignes du tableau des événements tenus en cohérence dans les deux sens.
(() => {
  'use strict';
  const form = document.getElementById('missionForm');
  const body = document.querySelector('#eventsTable tbody');
  const addButton = document.getElementById('addEventBtn');
  if (!form || !body || !addButton) return;

  const links = {
    // Valeurs de référence (anglais) des types d'événement : les libellés affichés
    // sont traduits par la couche i18n, les valeurs restent stables.
    alert: 'Dispatch', engineStart: 'Engine start', takeoff: 'Take-off',
    onScene: 'On-scene arrival', patientContact: 'Patient contact',
    sceneDeparture: 'Scene departure', destinationArrival: 'Destination arrival',
    landing: 'Final landing', engineStop: 'Mission end / engine shutdown'
  };
  const reverse = Object.fromEntries(Object.entries(links).map(([field, type]) => [type, field]));
  // Ligne d'événement associée à chaque horaire : une correction de l'horaire met
  // à jour cette ligne au lieu d'en créer une nouvelle.
  const linked = new Map();
  let syncing = false;
  const field = name => form.querySelector(`[name="${name}"]`);

  function selectFor(row) { return row.querySelector('select'); }
  function timeFor(row) { return row.querySelector('input[type="time"]'); }
  // Un <input type="time"> émet "change" à chaque segment saisi (01:00, 10:00,
  // 10:03, 10:39…) : on ne synchronise qu'à la sortie du champ, ou immédiatement
  // si le changement est programmatique (champ non focalisé : chargement JSON…).
  function onCommit(element, handler) {
    element.addEventListener('change', event => { if (document.activeElement !== element) handler(event); });
    element.addEventListener('blur', handler);
  }
  function ensureType(select, type) {
    if (![...select.options].some(option => option.value === type)) {
      const option = document.createElement('option'); option.value = type; option.textContent = type; select.append(option);
    }
  }
  function addLinkedEvent(type, time) {
    addButton.click();
    const row = body.lastElementChild, select = selectFor(row), timeInput = timeFor(row);
    ensureType(select, type); select.value = type;
    if (!timeInput.value) timeInput.value = time;
    return row;
  }
  function eventRows(type) { return [...body.rows].filter(row => selectFor(row)?.value === type); }
  function syncFieldToEvent(name) {
    if (syncing) return;
    const input = field(name), time = input?.value, type = links[name];
    if (!time || !type) return;
    syncing = true;
    // La ligne liée reste valable tant qu'elle existe et que son type n'a pas été
    // changé à la main (le lien est alors retiré, voir l'écouteur "change" plus bas).
    let row = linked.get(name);
    if (row && !row.isConnected) row = null;
    if (!row) {
      const matching = eventRows(type);
      row = matching.find(item => timeFor(item).value === time) || matching.find(item => !timeFor(item).value) || null;
    }
    if (!row) row = addLinkedEvent(type, time);
    else if (timeFor(row).value !== time) { timeFor(row).value = time; form.dispatchEvent(new Event('input', { bubbles: true })); }
    linked.set(name, row);
    syncing = false;
  }
  function syncEventToField(row) {
    if (syncing) return;
    const type = selectFor(row)?.value, name = reverse[type], time = timeFor(row)?.value;
    const input = name && field(name);
    if (!input || !time || input.value === time) return;
    // Ne remplace un horaire déjà saisi que s'il provient de cette même ligne.
    if (input.value && linked.get(name) !== row) return;
    syncing = true; input.value = time; linked.set(name, row); input.dispatchEvent(new Event('change', { bubbles: true })); syncing = false;
  }
  Object.keys(links).forEach(name => { const input = field(name); if (input) onCommit(input, () => syncFieldToEvent(name)); });
  body.addEventListener('change', event => {
    const row = event.target.closest('tr');
    if (row && event.target === selectFor(row)) linked.forEach((linkedRow, name) => { if (linkedRow === row) linked.delete(name); });
    if (row && !(event.target.matches('input[type="time"]') && document.activeElement === event.target)) syncEventToField(row);
  });
  body.addEventListener('focusout', event => { const row = event.target.closest('tr'); if (row && event.target.matches('input[type="time"]')) syncEventToField(row); });

  const destinationSection = document.createElement('section');
  destinationSection.innerHTML = '<h2>Destinations / étapes</h2><p class="small">Ajoute autant de destinations que nécessaire. La destination principale reste le premier établissement renseigné.</p><table><thead><tr><th>Destination</th><th>Arrivée</th><th>Départ</th><th>Remarque</th><th></th></tr></thead><tbody></tbody></table><div class="row" style="margin-top:10px"><button type="button" class="secondary">+ Ajouter destination</button></div>';
  const chronology = [...form.querySelectorAll('section')].find(section => section.querySelector('h2')?.textContent.includes('Chronologie'));
  chronology?.before(destinationSection);
  const destinationBody = destinationSection.querySelector('tbody');
  function addDestination(destination = '', arrival = '', departure = '', note = '') {
    const row = document.createElement('tr');
    row.innerHTML = `<td><input value="${destination}"></td><td><input type="time" value="${arrival}"></td><td><input type="time" value="${departure}"></td><td><input value="${note}"></td><td><button type="button" class="danger">×</button></td>`;
    destinationBody.append(row); row.querySelector('button').onclick = () => row.remove();
    row.querySelectorAll('input').forEach(input => onCommit(input, () => {
      const primary = field('destination'); if (primary && !primary.value && row.cells[0].querySelector('input').value) primary.value = row.cells[0].querySelector('input').value;
      const arrivalTime = row.cells[1].querySelector('input').value;
      const destinationArrival = field('destinationArrival');
      if (arrivalTime && destinationArrival && !destinationArrival.value) destinationArrival.value = arrivalTime;
      if (arrivalTime) syncFieldToEvent('destinationArrival');
    }));
  }
  destinationSection.querySelector('.secondary').onclick = () => addDestination();
  const primaryDestination = field('destination')?.value; if (primaryDestination) addDestination(primaryDestination);
})();
