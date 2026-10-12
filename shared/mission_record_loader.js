// Pages de CR historiques (FIRE / GAAR, HEMS / MEDEVAC) : bouton « Charger depuis le registre »
// (lit le registre CSV « ; », reprend une mission dans le formulaire) et numérotation automatique
// du prochain N° de mission quand le registre est chargé d'office (événement mission-ledger-autoload).
(() => {
  'use strict';
  const form = document.getElementById('missionForm');
  if (!form) return;
  /** Champ du formulaire de CR par son nom. */
  const field = name => form.querySelector(`[name="${name}"]`);
  /** Lecteur du registre CSV « ; » (guillemets doublés) : lignes objets indexées par l'en-tête. */
  const parse = text => {
    const data = [];
    let row = [],
      value = '',
      quoted = false;
    const push = () => {
      row.push(value);
      if (row.some(Boolean) && !String(row[0]).startsWith('#')) data.push(row);
      row = [];
      value = ''
    };
    for (let i = 0; i < text.length; i++) {
      const char = text[i],
        next = text[i + 1];
      if (quoted && char === '"' && next === '"') {
        value += '"';
        i++;
      } else if (char === '"') quoted = !quoted;
      else if (!quoted && char === ';') {
        row.push(value);
        value = '';
      } else if (!quoted && (char === '\n' || char === '\r')) {
        if (char === '\r' && next === '\n') i++;
        push();
      } else value += char;
    }
    if (value || row.length) push();
    const head = data.shift() || [];
    return data.map(values => Object.fromEntries(head.map((name, index) => [String(name).replace(/^\uFEFF/, '').trim(), values[index] ||
      ''
    ])));
  };
  /** Recopie une mission du registre dans le formulaire (valeurs de référence converties) et signale le changement. */
  const apply = record => {
    Object.entries(record).forEach(([key, value]) => {
      const input = field(key);
      if (input && value !== '') {
        if (window.MissionValues) window.MissionValues.setField(input, value);
        else input.value = value;
      }
    });
    form.dispatchEvent(new Event('change', {
      bubbles: true
    }));
  };
  /** Propose le prochain n° de mission (préfixe du champ, plus grand numéro + 1) si le champ est vide ou à -001 (pas en mode édition). */
  const nextNumber = records => {
    const input = field('missionId');
    if (!input || window.MissionEditMode || (input.value && !/-001$/.test(input.value))) return;
    const prefix = input.value?.split('-')[0] || (field('service') ? 'HEMS' : 'GAAR');
    const values = records.map(row => Number((row.missionId || '').match(/(\d+)$/)?.[1] || 0));
    input.value = `${prefix}-${String(Math.max(0, ...values) + 1).padStart(3, '0')}`;
  };
  /** Choix d'un registre CSV puis d'une mission à charger dans le formulaire. */
  const chooseLedger = () => {
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = '.csv,text/csv';
    picker.onchange = () => {
      const file = picker.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const records = parse(reader.result);
        nextNumber(records);
        if (!records.length) return;
        // choix dans la page (liste), jamais de boîte native
        const K = window.RepositoryKit,
          picked = await window.AppFramework.askText(K?.t ? K.t(['Choisir une mission à charger :', 'Choose a mission to load:',
            'Zu ladende Mission wählen:', 'Elegir una misión que cargar:'
          ]) : 'Choisir une mission à charger :', {
            value: '0',
            options: records.map((record, i) => [String(i), `${record.missionId || '—'} — ${record.date || ''} — ${record.missionType || ''}`])
          });
        if (picked != null && records[+picked]) apply(records[+picked]);
      };
      reader.readAsText(file);
    };
    picker.click();
  };
  const controls = document.querySelector('.controls .row');
  if (controls) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary';
    button.textContent = 'Charger depuis le registre';
    button.onclick = chooseLedger;
    controls.append(button);
  }
  window.addEventListener('mission-ledger-autoload', event => {
    const records = parse(event.detail.text);
    nextNumber(records);
  });
})();
