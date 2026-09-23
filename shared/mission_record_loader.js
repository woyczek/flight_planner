(() => {
  'use strict';
  const form = document.getElementById('missionForm');
  if (!form) return;
  const field = name => form.querySelector(`[name="${name}"]`);
  const parse = text => { const [head, ...lines] = text.split(/\r?\n/).filter(line => line && !line.startsWith('#')); return lines.map(line => Object.fromEntries(line.split(';').map((v, i) => [head.split(';')[i], v.replace(/^"|"$/g, '')]))); };
  const apply = record => { Object.entries(record).forEach(([key, value]) => { const input = field(key); if (input && value !== '') input.value = value; }); form.dispatchEvent(new Event('change', { bubbles: true })); };
  const nextNumber = records => { const input = field('missionId'); if (!input || (input.value && !/-001$/.test(input.value))) return; const prefix = input.value?.split('-')[0] || (field('service') ? 'HEMS' : 'GAAR'); const values = records.map(row => Number((row.missionId || '').match(/(\d+)$/)?.[1] || 0)); input.value = `${prefix}-${String(Math.max(0, ...values) + 1).padStart(3, '0')}`; };
  const chooseLedger = () => { const picker = document.createElement('input'); picker.type = 'file'; picker.accept = '.csv,text/csv'; picker.onchange = () => { const file = picker.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { const records = parse(reader.result); nextNumber(records); const choices = records.map((record, i) => `${i + 1}. ${record.missionId || '—'} — ${record.date || ''} — ${record.missionType || ''}`).join('\n'); const selected = Number(prompt(`Choisir une mission à charger :\n${choices}`, '1')); if (selected >= 1 && selected <= records.length) apply(records[selected - 1]); }; reader.readAsText(file); }; picker.click(); };
  const controls = document.querySelector('.controls .row');
  if (controls) { const button = document.createElement('button'); button.type = 'button'; button.className = 'secondary'; button.textContent = 'Charger depuis le registre'; button.onclick = chooseLedger; controls.append(button); }
  window.addEventListener('mission-ledger-autoload', event => { const records = parse(event.detail.text); nextNumber(records); });
})();
