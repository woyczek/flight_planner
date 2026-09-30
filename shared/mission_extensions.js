// Compléments des CR historiques (FIRE / GAAR, HEMS) : colonnes supplémentaires du registre (réseau
// en ligne, identifiants IVAO / VATSIM, altitude-densité HEMS), liste des circuits FMS connus, mise à
// jour du registre en cache après chaque CR.
(() => {
  'use strict';
  /** Texte { fr, en, de, es } dans la langue de la page (fr à défaut). */
  const message = values => values[window.RepositoryNav?.getLanguage?.() || 'fr'] || values.fr;
  const fmsSeed = [
    'LFTW_LFMP_GAAR_3H_MILAN.fms',
    'cl415_gaar_fms_pack/circuits/JAUNE_01_Cevennes_Sud.fms', 'cl415_gaar_fms_pack/circuits/JAUNE_02_Luberon_Durance.fms', 'cl415_gaar_fms_pack/circuits/JAUNE_03_Etang_Berre_Cote_Bleue.fms',
    'cl415_gaar_fms_pack/circuits/ORANGE_01_Corbières_Aude.fms', 'cl415_gaar_fms_pack/circuits/ORANGE_02_Haut_Var.fms', 'cl415_gaar_fms_pack/circuits/ORANGE_03_Maures_Ouest.fms',
    'cl415_gaar_fms_pack/circuits/ROUGE_01_Maures_Esterel.fms', 'cl415_gaar_fms_pack/circuits/ROUGE_02_Corse_Preposition_Ajaccio.fms', 'cl415_gaar_fms_pack/circuits/ROUGE_03_Landes_Gironde_Convoy.fms',
    'cl415_gaar_fms_pack/circuits/VERT_01_Camargue_Petite_Camargue.fms', 'cl415_gaar_fms_pack/circuits/VERT_02_Alpilles_Crau.fms', 'cl415_gaar_fms_pack/circuits/VERT_03_Garrigues_Gard.fms',
    'cl415_gaar_fms_pack/deroutements/DIV_01_Aramon_Gard.fms', 'cl415_gaar_fms_pack/deroutements/DIV_02_Alpilles_Eygalieres.fms', 'cl415_gaar_fms_pack/deroutements/DIV_03_Camargue_Salin.fms', 'cl415_gaar_fms_pack/deroutements/DIV_04_Uzes_PontduGard.fms', 'cl415_gaar_fms_pack/deroutements/DIV_05_Aigoual_Vallee_Herault.fms', 'cl415_gaar_fms_pack/deroutements/DIV_06_Luberon_Bonnieux.fms', 'cl415_gaar_fms_pack/deroutements/DIV_07_Corbieres_Fitou.fms', 'cl415_gaar_fms_pack/deroutements/DIV_08_Minervois_Lezignan.fms', 'cl415_gaar_fms_pack/deroutements/DIV_09_HautVar_Aups.fms', 'cl415_gaar_fms_pack/deroutements/DIV_10_Maures_Collobrieres.fms', 'cl415_gaar_fms_pack/deroutements/DIV_11_Esterel_Theoule.fms', 'cl415_gaar_fms_pack/deroutements/DIV_12_Biscarrosse_Landes.fms',
    'milan_gaar_pack/fms/circuits_gaar/JAUNE_04_CEVENNES.fms', 'milan_gaar_pack/fms/circuits_gaar/JAUNE_05_LUBERON.fms', 'milan_gaar_pack/fms/circuits_gaar/JAUNE_06_CORBIERES.fms', 'milan_gaar_pack/fms/circuits_gaar/ORANGE_07_VAR_OUEST.fms', 'milan_gaar_pack/fms/circuits_gaar/ORANGE_08_MAURES.fms', 'milan_gaar_pack/fms/circuits_gaar/ORANGE_09_AUDE_PO.fms', 'milan_gaar_pack/fms/circuits_gaar/ROUGE_10_MAURES_ESTEREL.fms', 'milan_gaar_pack/fms/circuits_gaar/ROUGE_11_CEVENNES_LOZERE.fms', 'milan_gaar_pack/fms/circuits_gaar/ROUGE_12_CORBIERES_CANIGOU.fms', 'milan_gaar_pack/fms/circuits_gaar/VERT_01_CAMARGUE.fms', 'milan_gaar_pack/fms/circuits_gaar/VERT_02_ALPILLES.fms', 'milan_gaar_pack/fms/circuits_gaar/VERT_03_GARRIGUES.fms',
    'milan_gaar_pack/fms/deroutements/DIV_01_CAMARGUE_GALLO_LFTW.fms', 'milan_gaar_pack/fms/deroutements/DIV_02_ALPILLES_EYGAL_LFTW.fms', 'milan_gaar_pack/fms/deroutements/DIV_03_GARDON_COLLIAS_LFTW.fms', 'milan_gaar_pack/fms/deroutements/DIV_04_AIGOUAL_BREAU_LFTW.fms', 'milan_gaar_pack/fms/deroutements/DIV_05_LUBERON_ROUSS_LFTW.fms', 'milan_gaar_pack/fms/deroutements/DIV_06_MINERVOIS_BIZE_LFMK.fms', 'milan_gaar_pack/fms/deroutements/DIV_07_BRIGNOLES_LFTW.fms', 'milan_gaar_pack/fms/deroutements/DIV_08_COLLOBRIERES_LFTW.fms', 'milan_gaar_pack/fms/deroutements/DIV_09_SALSES_OPP_LFMP.fms', 'milan_gaar_pack/fms/deroutements/DIV_10_ESTEREL_AGAY_LFTW.fms', 'milan_gaar_pack/fms/deroutements/DIV_11_MENDE_CAUSSE_LFTW.fms', 'milan_gaar_pack/fms/deroutements/DIV_12_CANIGOU_CERET_LFMP.fms'
  ];
  /** Ajoute des colonnes à l'en-tête du registre en cache (nouveaux champs du CR). */
  const addHeaders = names => {
    try {
      if (typeof headers !== 'undefined' && Array.isArray(headers)) names.forEach(name => {
        if (!headers.includes(name)) headers.push(name);
      });
    } catch {}
    try {
      if (typeof ledgerHeader !== 'undefined' && Array.isArray(ledgerHeader)) names.forEach(name => {
        if (!ledgerHeader.includes(name)) ledgerHeader.push(name);
      });
    } catch {}
  };
  /** Champ de formulaire (libellé + saisie) pour les sections ajoutées au CR. */
  const field = (label, name, placeholder = '') => {
    const box = document.createElement('div');
    box.innerHTML = `<label>${label}</label><input name="${name}" placeholder="${placeholder}">`;
    return box;
  };
  /** Lecteur CSV « ; » (guillemets doublés). */
  const parseCsv = text => {
    const out = [];
    let row = [],
      value = '',
      quoted = false;
    for (let i = 0; i < String(text || '').length; i++) {
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
        row.push(value);
        if (row.some(Boolean) && !String(row[0]).startsWith('#')) out.push(row);
        row = [];
        value = '';
      } else value += char;
    }
    row.push(value);
    if (row.some(Boolean) && !String(row[0]).startsWith('#')) out.push(row);
    return out;
  };
  /** Ligne CSV « ; » (valeurs entre guillemets, guillemets doublés). */
  const csvLine = values => values.map(value => '"' + String(value ?? '').replace(/"/g, '""') + '"').join(';');
  // Ajoute le CR courant au registre en cache (reporting à jour sans relire le fichier).
  function cacheCurrentMission() {
    try {
      const isHems = location.pathname.includes('/HEMS/'),
        configKey = isHems ? 'ledgerName' : 'gaarLedgerName';
      const currentHeaders = isHems ? (typeof headers !== 'undefined' ? headers : null) : (typeof ledgerHeader !== 'undefined' ? ledgerHeader : null);
      const currentRow = isHems ? (typeof row !== 'undefined' && typeof data !== 'undefined' ? row(data()) : null) : (typeof flattenRow !== 'undefined' ? flattenRow() : null);
      if (!currentHeaders || !currentRow || !window.MissionReportingConfig) return;
      const stored = window.MissionReportingConfig.cached(configKey),
        encoded = window.MissionLedgerDefaultsB64?.[configKey],
        seed = encoded ? new TextDecoder().decode(Uint8Array.from(atob(encoded), char => char.charCodeAt(0))) : '',
        parsed = parseCsv(stored?.text || seed),
        oldHeaders = parsed.shift() || [];
      const records = parsed.map(values => Object.fromEntries(oldHeaders.map((name, index) => [name, values[index] || ''])));
      records.push(Object.fromEntries(currentHeaders.map((name, index) => [name, currentRow[index] ?? ''])));
      const text = csvLine(currentHeaders) + '\n' + records.map(record => csvLine(currentHeaders.map(name => record[name] ?? ''))).join('\n') + '\n';
      window.MissionReportingConfig.cacheText(configKey, document.getElementById('ledgerName')?.value || stored?.filename || '', text);
    } catch {
      /* The CR export remains authoritative if cache refresh is unavailable. */
    }
  }

  /** CR HEMS : ajoute le champ « Altitude-densité » (saisie) aux conditions, et sa colonne au registre. */
  function addDensityAltitude() {
    if (!location.pathname.includes('/HEMS/')) return;
    const anchor = document.querySelector('[name="conditions"]')?.closest('.grid');
    if (!anchor || document.querySelector('[name="densityAltitude"]')) return;
    anchor.append(field('Altitude-densité', 'densityAltitude', '2500 ft'));
    addHeaders(['densityAltitude']);
  }

  /** Liste de suggestions des fichiers FMS (mémorisés, plus un jeu de départ) pour le champ fms. */
  function addFmsPicker() {
    const input = document.querySelector('[name="fms"]');
    if (!input) return;
    const stored = (() => {
      try {
        return JSON.parse(localStorage.getItem('missionFmsFiles:v1') || '[]');
      } catch {
        return [];
      }
    })();
    let names = [...new Set([...fmsSeed, ...stored])];
    const list = document.createElement('div');
    list.className = 'mission-fms-picker';
    list.hidden = true;
    list.style.cssText = 'position:absolute;z-index:30;background:#fff;border:1px solid #aaa;border-radius:8px;padding:6px;max-height:260px;overflow:auto;min-width:320px;box-shadow:0 8px 24px #0003';
    /** Suggestions FMS filtrées par le texte saisi. */
    const render = () => {
      const q = input.value.toLowerCase();
      list.innerHTML = names.filter(name => !q || name.toLowerCase().includes(q)).map(name => `<button type="button" data-fms="${name.replace(/"/g,'&quot;')}" style="display:block;width:100%;text-align:left;background:#fff;padding:6px;border:0">${name}</button>`).join('') || '<span>Aucun fichier FMS.</span>';
    };
    input.closest('div').style.position = 'relative';
    input.after(list);
    input.setAttribute('autocomplete', 'off');
    input.addEventListener('click', () => {
      render();
      list.hidden = false;
    });
    input.addEventListener('input', () => {
      render();
      list.hidden = false;
    });
    list.addEventListener('mousedown', event => {
      const button = event.target.closest('[data-fms]');
      if (!button) return;
      input.value = button.dataset.fms;
      input.dispatchEvent(new Event('change', {
        bubbles: true
      }));
      list.hidden = true;
    });
    document.addEventListener('click', event => {
      if (!input.closest('div').contains(event.target)) list.hidden = true;
    });
    const upload = document.createElement('input');
    upload.type = 'file';
    upload.accept = '.fms';
    upload.multiple = true;
    upload.hidden = true;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary';
    button.textContent = 'Importer un FMS';
    button.style.marginTop = '6px';
    button.onclick = () => upload.click();
    upload.onchange = async () => {
      const files = [...upload.files],
        imported = files.map(file => file.name);
      names = [...new Set([...names, ...imported])];
      localStorage.setItem('missionFmsFiles:v1', JSON.stringify(names.filter(name => !fmsSeed.includes(name))));
      if (imported[0]) {
        input.value = imported[0];
        input.dispatchEvent(new Event('change', {
          bubbles: true
        }));
      }
      if (files.length && window.showDirectoryPicker && confirm(message({
          fr: 'Copier aussi le ou les FMS dans un dossier local ?',
          en: 'Also copy the FMS file(s) to a local folder?',
          de: 'FMS-Datei(en) auch in einen lokalen Ordner kopieren?',
          es: '¿Copiar también los archivos FMS en una carpeta local?'
        }))) try {
        const directory = await window.showDirectoryPicker({
          mode: 'readwrite'
        });
        for (const file of files) {
          const handle = await directory.getFileHandle(file.name, {
              create: true
            }),
            writer = await handle.createWritable();
          await writer.write(file);
          await writer.close();
        }
      } catch {
        /* Selection cancelled: the imported names remain available in the form. */ }
    };
    input.closest('div').append(button, upload);
  }
  /** Section « Suivi réseau » du CR : ID IVAO / VATSIM (profil pilote par défaut) et liens vers les traceurs. */
  function addTracking() {
    const form = document.querySelector('form');
    if (!form || document.getElementById('networkTracking')) return;
    const controls = form.querySelector('.controls'),
      section = document.createElement('section');
    section.id = 'networkTracking';
    // Les CR peuvent déjà déclarer ivaoId / vatsimId (section Identification) : on les
    // réutilise au lieu de créer des champs homonymes (FormData garderait le dernier).
    const hasIvao = !!form.querySelector('[name="ivaoId"]'),
      hasVatsim = !!form.querySelector('[name="vatsimId"]');
    section.innerHTML = '<h2>Trace réseau IVAO / VATSIM</h2><div class="grid"><div><label>Réseau</label><select name="onlineNetwork"><option value="">Hors réseau / non renseigné</option><option value="IVAO">IVAO</option><option value="VATSIM">VATSIM</option></select></div>' + (hasIvao ? '' : '<div><label>ID IVAO (VID)</label><input name="ivaoId" inputmode="numeric"></div>') + (hasVatsim ? '' : '<div><label>ID VATSIM (CID)</label><input name="vatsimId" inputmode="numeric"></div>') + '<div class="full"><label>URL de la trace</label><input name="trackerUrl" type="url" placeholder="https://tracker…"></div></div><div class="row" style="margin-top:8px"><a id="ivaoTrackerLink" class="secondary" target="_blank" rel="noopener">Ouvrir le tracker IVAO</a><a id="vatsimTrackerLink" class="secondary" target="_blank" rel="noopener">Ouvrir le tracker VATSIM</a><button type="button" class="secondary" id="findLiveTrack">Chercher le callsign actif</button></div><p class="small" id="trackStatus">La trace peut être saisie directement. La recherche automatique est limitée aux connexions VATSIM actuellement actives.</p>';
    form.insertBefore(section, controls || null);
    addHeaders(['onlineNetwork', 'ivaoId', 'vatsimId', 'trackerUrl']);
    const ivao = form.querySelector('[name="ivaoId"]'),
      vatsim = form.querySelector('[name="vatsimId"]'),
      url = section.querySelector('[name="trackerUrl"]'),
      status = section.querySelector('#trackStatus');
    section.querySelectorAll('a.secondary').forEach(link => link.style.cssText = 'display:inline-block;padding:9px 12px;border-radius:9px;text-decoration:none;color:inherit');
    const links = () => {
      section.querySelector('#ivaoTrackerLink').href = 'https://tracker.ivao.aero/?userId=' + encodeURIComponent(ivao.value.trim());
      section.querySelector('#vatsimTrackerLink').href = 'https://stats.vatsim.net/stats/' + encodeURIComponent(vatsim.value.trim());
    };
    ivao.addEventListener('input', links);
    vatsim.addEventListener('input', links);
    links();
    section.querySelector('#ivaoTrackerLink').onclick = event => {
      if (!ivao.value.trim()) {
        event.preventDefault();
        ivao.focus();
      } else url.value = event.currentTarget.href;
    };
    section.querySelector('#vatsimTrackerLink').onclick = event => {
      if (!vatsim.value.trim()) {
        event.preventDefault();
        vatsim.focus();
      } else url.value = event.currentTarget.href;
    };
    section.querySelector('#findLiveTrack').onclick = async () => {
      const callsign = document.querySelector('[name="callsign"]')?.value.trim().toUpperCase();
      if (!callsign) {
        status.textContent = 'Renseignez d’abord le callsign.';
        return;
      }
      status.textContent = 'Recherche VATSIM en cours…';
      try {
        const data = await (await fetch('https://data.vatsim.net/v3/vatsim-data.json', {
            cache: 'no-store'
          })).json(),
          pilot = data.pilots?.find(item => item.callsign?.toUpperCase() === callsign);
        if (!pilot) {
          status.textContent = 'Aucune connexion VATSIM active trouvée pour ce callsign.';
          return;
        }
        vatsim.value = pilot.cid || '';
        section.querySelector('[name="onlineNetwork"]').value = 'VATSIM';
        links();
        url.value = section.querySelector('#vatsimTrackerLink').href;
        status.textContent = 'Connexion VATSIM active trouvée.';
      } catch {
        status.textContent = 'Recherche active indisponible ; utilisez les liens avec le VID/CID.';
      }
    };
    /** Reporte les liens de suivi réseau dans l'aperçu du CR après son rendu. */
    const syncReport = () => setTimeout(() => {
      const report = document.getElementById('report');
      if (!report) return;
      report.querySelector('#networkTraceReport')?.remove();
      const tracker = url.value.trim(),
        safeTracker = /^https?:\/\//i.test(tracker) ? tracker : '',
        density = document.querySelector('[name="densityAltitude"]')?.value.trim();
      if (!tracker && !density) return;
      const block = document.createElement('div');
      block.id = 'networkTraceReport';
      block.innerHTML = `<h3>Compléments opérationnels</h3><div class="meta">${density ? `<div class="box"><span>Altitude-densité</span>${density}</div>` : ''}${safeTracker ? `<div class="box"><span>Trace réseau</span><a href="${safeTracker.replace(/"/g,'&quot;')}" target="_blank" rel="noopener">Ouvrir la trace</a></div>` : ''}</div>`;
      report.append(block);
    });
    form.addEventListener('input', syncReport);
    form.addEventListener('change', syncReport);
    ['renderBtn', 'printBtn', 'archiveBtn'].forEach(id => document.getElementById(id)?.addEventListener('click', syncReport));
    document.getElementById('archiveBtn')?.addEventListener('click', () => setTimeout(cacheCurrentMission));
  }
  /** Ajouts au CR historique : altitude densité (HEMS), sélecteur FMS, suivi réseau. */
  function init() {
    addDensityAltitude();
    addFmsPicker();
    addTracking();
  }
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', init);
  else init();
})();
