(() => {
  'use strict';
  // Extension des générateurs de CR (HEMS et GAAR) :
  // - mode modification : un clic sur une mission dans un reporting ouvre le CR avec
  //   ?edit=…, la ligne du registre est pré-saisie et « Générer / actualiser les
  //   modifications » remplace cette ligne (et elle seule, même si le n° de mission est
  //   dupliqué) dans la copie locale du registre partagée avec les reportings ;
  //   « Supprimer cette mission » la retire ; retour vers le reporting d'origine ;
  // - « Ajouter au fichier mission » avertit si le n° de mission figure déjà au registre.
  const form = document.getElementById('missionForm');
  if (!form) return;
  const $ = id => document.getElementById(id);
  const isGaar = location.pathname.includes('/GAAR/');
  const configKey = isGaar ? 'gaarLedgerName' : 'ledgerName';
  const reportingPage = isGaar ? 'gaar_mission_reporting.html' : 'hems_medevac_reporting.html';
  const DRAFT_KEY = 'missionEditDraft:v1';
  const field = name => form.querySelector(`[name="${name}"]`);
  const normId = value => String(value ?? '').trim().toUpperCase();
  const csvLine = values => values.map(value => '"' + String(value ?? '').replace(/"/g, '""') + '"').join(';');
  const parseCsv = text => {
    const out = []; let row = [], value = '', quoted = false; text = String(text || '');
    const push = () => { row.push(value); if (row.some(Boolean) && !String(row[0]).startsWith('#')) out.push(row); row = []; value = ''; };
    for (let i = 0; i < text.length; i++) {
      const char = text[i], next = text[i + 1];
      if (quoted && char === '"' && next === '"') { value += '"'; i++; }
      else if (char === '"') quoted = !quoted;
      else if (!quoted && char === ';') { row.push(value); value = ''; }
      else if (!quoted && (char === '\n' || char === '\r')) { if (char === '\r' && next === '\n') i++; push(); }
      else value += char;
    }
    if (value || row.length) push();
    const head = (out.shift() || []).map(name => String(name).replace(/^﻿/, '').trim());
    return { head, rows: out };
  };

  // Ligne CSV courante du formulaire, construite par le script de la page
  // (HEMS : headers + row(data()) ; GAAR : ledgerHeader + flattenRow()).
  function currentRecord() {
    try {
      const head = isGaar ? ledgerHeader : headers;
      const values = isGaar ? flattenRow() : row(data());
      return Object.fromEntries(head.map((name, index) => [name, values[index] ?? '']));
    } catch { return null; }
  }

  // Texte du registre : fichier du dossier local autorisé, sinon copie locale partagée,
  // sinon registre par défaut embarqué.
  async function ledgerText() {
    const handle = typeof dirHandle !== 'undefined' ? dirHandle : null;
    if ($('storageMode')?.value === 'localfs' && handle) {
      try { return await (await (await handle.getFileHandle($('ledgerName')?.value || '')).getFile()).text(); } catch { /* fichier absent : repli sur la copie locale */ }
    }
    const stored = window.MissionReportingConfig?.cached?.(configKey);
    if (stored?.text) return stored.text;
    const encoded = window.MissionLedgerDefaultsB64?.[configKey];
    return encoded ? new TextDecoder().decode(Uint8Array.from(atob(encoded), char => char.charCodeAt(0))) : '';
  }

  // ---------------------------------------------------------------- mode modification
  let draft = null;
  if (new URLSearchParams(location.search).has('edit')) {
    try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch { draft = null; }
    if (draft && draft.kind !== (isGaar ? 'gaar' : 'hems')) draft = null;
  }
  // Lu par mission_reporting_config.js / mission_record_loader.js pour ne pas
  // renuméroter la mission éditée.
  window.MissionEditMode = draft ? { missionId: draft.record?.missionId || '' } : null;

  if (draft) {
    const banner = document.createElement('section');
    banner.id = 'missionEditBanner';
    banner.innerHTML = '<h2>Modification d’une mission du registre</h2><div class="note" id="missionEditInfo"></div><div class="row"><button type="button" class="primary" id="saveEditBtn">Générer / actualiser les modifications</button><button type="button" class="secondary" id="backToReportingBtn">Retour au reporting</button><button type="button" class="secondary" id="leaveEditBtn">Nouvelle mission (quitter la modification)</button><button type="button" class="danger" id="deleteEditBtn">Supprimer cette mission</button></div><p class="small" id="missionEditStatus"></p>';
    form.prepend(banner);
    const info = () => {
      $('missionEditInfo').textContent = `Mission ${draft.record?.missionId || '—'} — ligne ${draft.index + 1} du registre ${draft.filename || ''}. `
        + (draft.configKey ? 'Les modifications remplacent cette ligne dans la copie locale du registre ; utilisez ensuite « Exporter le registre modifié » depuis le reporting pour mettre à jour le fichier CSV.' : 'Données d’exemple : les modifications ne peuvent pas être réenregistrées dans un registre.');
    };
    info();
    const status = text => { $('missionEditStatus').textContent = text; };

    const apply = record => {
      Object.entries(record || {}).forEach(([key, value]) => {
        const input = field(key); if (!input) return;
        // Mission sans ID IVAO / VATSIM (registres antérieurs) : on garde l'ID du profil pilote.
        if ((key === 'ivaoId' || key === 'vatsimId') && !String(value ?? '').trim()) return;
        // Listes : valeurs de référence anglaises, anciennes valeurs françaises converties.
        if (window.MissionValues) { window.MissionValues.setField(input, value); return; }
        if (input.tagName === 'SELECT' && value && ![...input.options].some(option => option.value === value)) {
          const option = document.createElement('option'); option.value = value; option.textContent = value; input.append(option);
        }
        input.value = value ?? '';
      });
      form.dispatchEvent(new Event('input', { bubbles: true }));
      form.dispatchEvent(new Event('change', { bubbles: true }));
      $('renderBtn')?.click();
    };
    // Après "load" : les champs injectés dynamiquement (mission_extensions.js :
    // altitude-densité, trace réseau) existent alors dans le formulaire.
    if (document.readyState === 'complete') apply(draft.record); else window.addEventListener('load', () => apply(draft.record));

    // Ligne éditée dans la copie locale du registre, après contrôle qu'elle correspond
    // toujours à la mission ouverte (null + alerte sinon).
    const ledgerTarget = () => {
      const stored = window.MissionReportingConfig?.cached?.(draft.configKey);
      if (!stored?.text) { alert('Copie locale du registre introuvable : rouvrez le reporting, rechargez le registre puis cliquez à nouveau sur la mission.'); return null; }
      const { head, rows } = parseCsv(stored.text);
      const target = rows[draft.index], idColumn = head.indexOf('missionId');
      if (!target || normId(target[idColumn]) !== normId(draft.record?.missionId)) {
        alert(`La ligne ${draft.index + 1} du registre ne correspond plus à la mission ${draft.record?.missionId || ''} (registre rechargé ou modifié entre-temps). Rouvrez le reporting puis cliquez à nouveau sur la mission.`);
        return null;
      }
      return { stored, head, rows, target };
    };
    const writeLedger = (stored, head, rows) => {
      const text = csvLine(head) + '\n' + rows.map(values => csvLine(head.map((_, index) => values[index] ?? ''))).join('\n') + '\n';
      window.MissionReportingConfig.cacheText(draft.configKey, stored.filename, text);
      if (window.MissionReportingConfig.cached(draft.configKey)?.text === text) return true;
      alert('Enregistrement impossible dans le stockage du navigateur (quota dépassé ?). Exportez le CSV de la mission à la place.');
      return false;
    };
    const back = () => { location.href = draft.returnUrl || reportingPage; };

    $('saveEditBtn').addEventListener('click', () => {
      $('renderBtn')?.click();
      if (!draft.configKey) { status('Données d’exemple : rien à enregistrer. Utilisez « Ajouter au fichier mission » pour créer une nouvelle ligne.'); return; }
      const record = currentRecord();
      const found = record && ledgerTarget(); if (!found) return;
      const { stored, head, rows, target } = found;
      // Colonnes du registre conservées dans leur ordre ; colonnes nouvelles du CR ajoutées à la fin.
      const newHead = head.concat(Object.keys(record).filter(name => !head.includes(name)));
      rows[draft.index] = newHead.map((name, index) => name in record ? record[name] : (target[index] ?? ''));
      if (!writeLedger(stored, newHead, rows)) return;
      draft.record = Object.fromEntries(newHead.map((name, index) => [name, rows[draft.index][index] ?? '']));
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      window.MissionEditMode.missionId = draft.record.missionId;
      info();
      status(`Modifications enregistrées dans la copie locale du registre (${new Date().toLocaleTimeString()}).`);
    });
    $('backToReportingBtn').addEventListener('click', back);
    $('deleteEditBtn').addEventListener('click', () => {
      if (!draft.configKey) { status('Données d’exemple : rien à supprimer.'); return; }
      const found = ledgerTarget(); if (!found) return;
      if (!confirm(`Supprimer la mission ${draft.record?.missionId || ''} du ${draft.record?.date || ''} ?\nLa suppression s'applique à la copie locale du registre (navigateur) ; pensez à exporter le registre modifié depuis le reporting.`)) return;
      found.rows.splice(draft.index, 1);
      if (!writeLedger(found.stored, found.head, found.rows)) return;
      localStorage.removeItem(DRAFT_KEY);
      window.MissionEditMode = null;
      // La mission n'existe plus : le clic « Générer » remet à zéro l'alerte de
      // modifications non enregistrées (cr_extras.js) avant de quitter la page.
      $('renderBtn')?.click();
      back();
    });
    $('leaveEditBtn').addEventListener('click', () => { localStorage.removeItem(DRAFT_KEY); location.href = location.pathname; });
  }

  // ------------------------------------------ contrôle des doublons à l'archivage
  let bypass = false;
  window.addEventListener('click', async event => {
    const button = event.target.closest?.('#archiveBtn');
    if (!button || bypass) return;
    // Intercepte le clic avant les gestionnaires de la page, puis le rejoue si validé.
    event.stopImmediatePropagation(); event.preventDefault();
    const id = normId(field('missionId')?.value);
    let count = 0;
    if (id) try {
      const { head, rows } = parseCsv(await ledgerText());
      const column = head.indexOf('missionId');
      if (column >= 0) count = rows.filter(values => normId(values[column]) === id).length;
    } catch { /* registre illisible : pas de contrôle possible */ }
    if (count) {
      const label = field('missionId').value.trim();
      const message = draft && normId(draft.record?.missionId) === id
        ? `La mission ${label} est en cours de modification et figure déjà dans le registre.\nPour mettre à jour la ligne existante, utilisez « Générer / actualiser les modifications ».\n\nAjouter quand même une NOUVELLE ligne ${label} au fichier mission ?`
        : `Le n° de mission ${label} figure déjà${count > 1 ? ' ' + count + ' fois' : ''} dans le registre.\n\nAjouter quand même cette mission au fichier (doublon) ?\nAnnuler pour corriger le n° de mission.`;
      if (!confirm(message)) { field('missionId').focus(); return; }
    }
    bypass = true;
    try { button.click(); } finally { bypass = false; }
  }, true);
})();
