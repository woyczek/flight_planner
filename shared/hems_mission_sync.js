(() => {
  'use strict';
  const form = document.getElementById('missionForm');
  const body = document.querySelector('#eventsTable tbody');
  const addButton = document.getElementById('addEventBtn');
  if (!form || !body || !addButton) return;

  const links = {
    alert: 'Déclenchement', engineStart: 'Mise en route', takeoff: 'Décollage',
    onScene: 'Arrivée zone', patientContact: 'Prise en charge',
    sceneDeparture: 'Départ zone', destinationArrival: 'Arrivée destination',
    landing: 'Atterrissage final', engineStop: 'Fin mission / arrêt moteurs'
  };
  const reverse = Object.fromEntries(Object.entries(links).map(([field, type]) => [type, field]));
  let syncing = false;
  const field = name => form.querySelector(`[name="${name}"]`);

  function selectFor(row) { return row.querySelector('select'); }
  function timeFor(row) { return row.querySelector('input[type="time"]'); }
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
    const matching = eventRows(type);
    const empty = matching.find(row => !timeFor(row).value);
    if (empty) timeFor(empty).value = time;
    else if (!matching.some(row => timeFor(row).value === time)) addLinkedEvent(type, time);
    syncing = false;
  }
  function syncEventToField(row) {
    if (syncing) return;
    const type = selectFor(row)?.value, name = reverse[type], time = timeFor(row)?.value;
    const input = name && field(name);
    if (!input || !time || input.value) return;
    syncing = true; input.value = time; input.dispatchEvent(new Event('change', { bubbles: true })); syncing = false;
  }
  Object.keys(links).forEach(name => field(name)?.addEventListener('change', () => syncFieldToEvent(name)));
  body.addEventListener('change', event => { const row = event.target.closest('tr'); if (row) syncEventToField(row); });

  const destinationSection = document.createElement('section');
  destinationSection.innerHTML = '<h2>Destinations / étapes</h2><p class="small">Ajoute autant de destinations que nécessaire. La destination principale reste le premier établissement renseigné.</p><table><thead><tr><th>Destination</th><th>Arrivée</th><th>Départ</th><th>Remarque</th><th></th></tr></thead><tbody></tbody></table><div class="row" style="margin-top:10px"><button type="button" class="secondary">+ Ajouter destination</button></div>';
  const chronology = [...form.querySelectorAll('section')].find(section => section.querySelector('h2')?.textContent.includes('Chronologie'));
  chronology?.before(destinationSection);
  const destinationBody = destinationSection.querySelector('tbody');
  function addDestination(destination = '', arrival = '', departure = '', note = '') {
    const row = document.createElement('tr');
    row.innerHTML = `<td><input value="${destination}"></td><td><input type="time" value="${arrival}"></td><td><input type="time" value="${departure}"></td><td><input value="${note}"></td><td><button type="button" class="danger">×</button></td>`;
    destinationBody.append(row); row.querySelector('button').onclick = () => row.remove();
    row.querySelectorAll('input').forEach(input => input.addEventListener('change', () => {
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
