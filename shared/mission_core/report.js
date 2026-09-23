(() => {
  'use strict';
  // Mission Report Core — rendu du compte rendu (§21) et résumé automatique (§22).
  // Le CR est construit à partir des mêmes définitions de blocs que le formulaire :
  // sections dans l'ordre du cahier des charges, champs vides et sections vides omis.
  // Libellés en français (source) + lignes [fr,en,de,es] pour la traduction commune ;
  // le résumé, phrase générée, est produit directement dans la langue d'affichage par
  // le modèle de la famille (family.summary[lang]).
  const M = window.MissionModel, V = window.MissionVocab, B = window.MissionBlocks, L = V.L;
  const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const LANGS = ['fr', 'en', 'de', 'es'];
  const lang = () => { const l = window.RepositoryNav?.getLanguage?.() || 'fr'; return LANGS.includes(l) ? l : 'fr'; };
  const duration = n => n == null ? '' : n >= 60 ? `${Math.floor(n / 60)}h${String(n % 60).padStart(2, '0')}` : `${n} min`;
  const S = {
    stamp: L('EXERCICE / SIMULATION', 'EXERCISE / SIMULATION', 'ÜBUNG / SIMULATION', 'EJERCICIO / SIMULACIÓN'),
    stampReal: L('OPÉRATION RÉELLE', 'REAL OPERATION', 'REALER EINSATZ', 'OPERACIÓN REAL'),
    title: L('Compte rendu de mission', 'Mission report', 'Einsatzbericht', 'Informe de misión'),
    s1: L('1. Identification de la mission', '1. Mission identification', '1. Einsatzidentifikation', '1. Identificación de la misión'),
    s2: L('2. Résumé', '2. Mission summary', '2. Zusammenfassung', '2. Resumen'),
    s3: L('3. Appareil(s)', '3. Aircraft', '3. Luftfahrzeug(e)', '3. Aeronave(s)'),
    s4: L('4. Équipage', '4. Crew', '4. Besatzung', '4. Tripulación'),
    s5: L('5. Tâche', '5. Tasking', '5. Auftrag', '5. Tarea'),
    s6: L('6. Environnement / météo', '6. Environment / weather', '6. Umgebung / Wetter', '6. Entorno / meteorología'),
    s7: L('7. Chronologie', '7. Timeline', '7. Zeitablauf', '7. Cronología'),
    s8: L('8. Exécution de la mission', '8. Mission execution', '8. Einsatzdurchführung', '8. Ejecución de la misión'),
    s9: L('9. Données spécifiques', '9. Mission-specific data', '9. Einsatzspezifische Daten', '9. Datos específicos'),
    s10: L('10. Résultats', '10. Results', '10. Ergebnisse', '10. Resultados'),
    s11: L('11. Carburant / statistiques de vol', '11. Fuel / flight statistics', '11. Kraftstoff / Flugstatistik', '11. Combustible / estadísticas de vuelo'),
    s12: L('12. Incidents / technique', '12. Incidents / technical', '12. Vorfälle / Technik', '12. Incidentes / técnica'),
    s13: L('13. Remarques', '13. Remarks', '13. Bemerkungen', '13. Observaciones'),
    s14: L('14. Enseignements', '14. Lessons learned', '14. Erkenntnisse', '14. Lecciones aprendidas'),
    capabilitiesUsed: L('Capacités employées', 'Capabilities used', 'Eingesetzte Fähigkeiten', 'Capacidades empleadas'),
    events: L('Événements', 'Events', 'Ereignisse', 'Eventos'), legs: L('Étapes / sorties', 'Legs / sorties', 'Etappen / Einsätze', 'Tramos / salidas'),
    trace: L('Trace réseau', 'Network track', 'Netzwerkspur', 'Traza de red'), openTrace: L('Ouvrir la trace', 'Open track', 'Spur öffnen', 'Abrir traza'),
    family: L('Famille', 'Family', 'Familie', 'Familia'), footer: L('Généré localement dans le navigateur — aucune donnée transmise.', 'Generated locally in the browser — no data transmitted.', 'Lokal im Browser erzeugt — keine Datenübertragung.', 'Generado localmente en el navegador — ningún dato transmitido.'),
    equipment: L('Équipements', 'Equipment', 'Ausrüstung', 'Equipamiento')
  };
  const KPI = [
    ['blockMinutes', L('Temps bloc', 'Block time', 'Blockzeit', 'Tiempo calzo a calzo')], ['flightMinutes', L('Temps de vol', 'Flight time', 'Flugzeit', 'Tiempo de vuelo')],
    ['transitOutMinutes', L('Transit aller', 'Transit outbound', 'Anflug', 'Tránsito de ida')], ['timeOnStationMinutes', L('Temps sur zone', 'Time on station', 'Zeit im Einsatzraum', 'Tiempo en zona')],
    ['transitInMinutes', L('Transit retour', 'Transit inbound', 'Rückflug', 'Tránsito de vuelta')], ['missionMinutes', L('Temps mission', 'Mission time', 'Missionszeit', 'Tiempo de misión')]
  ];

  // ---- valeurs affichables (libellé d'option, capacités, unités)
  function optionsFor(field, family) {
    if (field.options) return field.options;
    if (field.familySeries) return family.series || [];
    if (field.crewRoles) return V.crewRoles;
    if (field.eventTypes) return V.eventTypes.concat(family.events || []);
    return [];
  }
  const allCapabilityItems = V.capabilityGroups.flatMap(g => g.items);
  function display(field, value, family, rows, unit) {
    const label = arr => { rows.set(arr[0], arr); return arr[0]; };
    if (value == null || value === '' || (Array.isArray(value) && !value.length)) return '';
    if (field.type === 'select') { const o = optionsFor(field, family).find(x => x.value === value); return o ? label(o.label) : String(value); }
    if (field.type === 'checkgroup') return value.map(code => { const o = allCapabilityItems.find(x => x.value === code); return o ? label(o.label) : code; }).join(', ');
    if (field.type === 'number' && unit) return `${value} ${unit}`;
    return String(value);
  }

  function render(mission, family, ctx) {
    const rows = new Map(); const t = arr => { rows.set(arr[0], arr); return arr[0]; };
    const box = (labelArr, value) => value === '' || value == null ? '' : `<div class="box"><span>${esc(t(labelArr))}</span>${esc(value)}</div>`;
    const fieldsBoxes = (fields, base = mission, prefix = '', unit = '') => fields.filter(f => f.label && (!f.when || f.when(ctx))).map(f => {
      const value = M.get(base, prefix + f.path);
      return box(f.label, display(f, value, family, rows, f.path.startsWith('fuel.') && f.path !== 'fuel.unit' ? unit : ''));
    }).join('');
    const section = (titleArr, body) => body && body.replace(/<[^>]+>/g, '').trim() ? `<h3>${esc(t(titleArr))}</h3>${body}` : '';
    const meta = inner => inner ? `<div class="meta">${inner}</div>` : '';
    const table = (spec, list) => {
      const fields = spec.fields.filter(f => f.type !== 'checkgroup');
      const used = fields.filter(f => list.some(item => { const v = M.get(item, f.path); return v !== '' && v != null; }));
      const items = list.filter(item => used.some(f => { const v = M.get(item, f.path); return v !== '' && v != null; }));
      if (!items.length) return '';
      return `<table><thead><tr>${used.map(f => `<th>${esc(t(f.label))}</th>`).join('')}</tr></thead><tbody>${items.map(item => `<tr>${used.map(f => `<td>${esc(display(f, M.get(item, f.path), family, rows))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    };
    const stats = M.computeStatistics(mission), unit = mission.fuel?.unit || '';
    const seriesLabel = (family.series || []).find(s => s.value === mission.series);

    // 1. Identification
    const s1 = meta(box(S.family, family.id) + (seriesLabel ? box(['Série', 'Series', 'Serie', 'Serie'], t(seriesLabel.label)) : '') + fieldsBoxes(B.identification.fields.filter(f => f.path !== 'series')));
    // 3. Appareils : tableau + équipements
    const aircraftTable = table(B.aircraft.collection, mission.aircraft || []);
    const equipment = (mission.aircraft || []).filter(a => a.equipment?.length).map(a => box(['Équipements', 'Equipment', 'Ausrüstung', 'Equipamiento'], `${a.registration || a.type || ''} : ${display({ type: 'checkgroup' }, a.equipment, family, rows)}`)).join('');
    // 7. Chronologie + durées calculées
    const durations = KPI.map(([key, label]) => box(label, duration(stats[key]))).join('');
    // 8. Exécution : navigation, capacités employées, événements, étapes
    const capabilities = mission.capabilities?.length ? meta(box(S.capabilitiesUsed, display({ type: 'checkgroup' }, mission.capabilities, family, rows))) : '';
    const events = table(B.events.collection, mission.events || []), legs = table(B.legs.collection, mission.legs || []);
    const execution = meta(fieldsBoxes(B.navigation.fields)) + capabilities + (events ? `<h4>${esc(t(S.events))}</h4>${events}` : '') + (legs ? `<h4>${esc(t(S.legs))}</h4>${legs}` : '');
    // 9. Données spécifiques de la famille (blocs visibles uniquement)
    const specific = (family.blocks || []).filter(b => !b.when || b.when(ctx)).map(b => {
      const body = b.collection ? table(b.collection, M.get(mission, b.collection.path) || []) : meta(fieldsBoxes(b.fields));
      return body ? `<h4>${esc(t(b.title))}</h4>${body}` : '';
    }).join('');
    // 10–14
    const results = meta(fieldsBoxes(B.results.fields.filter(f => ['results.outcome', 'results.interruptionReason', 'results.detail'].includes(f.path))));
    const fuel = meta(fieldsBoxes(B.fuel.fields.filter(f => f.path !== 'fuel.unit'), mission, '', unit) + box(['Carburant consommé', 'Fuel used', 'Kraftstoffverbrauch', 'Combustible consumido'], stats.fuelUsed == null ? '' : `${stats.fuelUsed} ${unit}`) + box(['Carburant sur zone', 'Fuel on station', 'Kraftstoff im Einsatzraum', 'Combustible en zona'], stats.fuelOnStation == null ? '' : `${stats.fuelOnStation} ${unit}`));
    const incidents = meta(fieldsBoxes(B.results.fields.filter(f => ['results.incidents', 'results.anomalies'].includes(f.path))));
    const remarks = mission.remarks?.observations ? `<div class="box">${esc(mission.remarks.observations)}</div>` : '';
    const lessons = mission.remarks?.lessonsLearned ? `<div class="box">${esc(mission.remarks.lessonsLearned)}</div>` : '';
    const traceHref = /^https?:\/\//i.test(mission.network?.trackerUrl || '') ? mission.network.trackerUrl : '';
    const traceBox = traceHref ? `<div class="box"><span>${esc(t(S.trace))}</span><a href="${esc(traceHref)}" target="_blank" rel="noopener">${esc(t(S.openTrace))}</a></div>` : '';

    const summaryText = summary(mission, family, lang());
    const html = `<p class="stamp">${esc(t(mission.metadata?.context === 'REAL' ? S.stampReal : S.stamp))}</p>
      <h2>${esc(t(S.title))} ${esc(mission.metadata?.missionId || '')}</h2>
      ${section(S.s1, s1 + (traceBox ? meta(traceBox) : ''))}
      ${summaryText ? `<h3>${esc(t(S.s2))}</h3><p class="mc-summary" data-no-i18n>${esc(summaryText)}</p>` : ''}
      ${section(S.s3, aircraftTable + meta(equipment))}
      ${section(S.s4, table(B.crew.collection, mission.crew || []))}
      ${section(S.s5, meta(fieldsBoxes(B.tasking.fields)))}
      ${section(S.s6, meta(fieldsBoxes(B.environment.fields)))}
      ${section(S.s7, meta(fieldsBoxes(B.timeline.fields)) + (durations ? meta(durations) : ''))}
      ${section(S.s8, execution)}
      ${section(S.s9, specific)}
      ${section(S.s10, results)}
      ${section(S.s11, fuel)}
      ${section(S.s12, incidents)}
      ${section(S.s13, remarks)}
      ${section(S.s14, lessons)}
      <p class="small mc-report-footer">${esc(t(S.footer))}</p>`;
    return { html, rows: [...rows.values()] };
  }

  // ---- résumé automatique (§22) : modèle propre à chaque famille, dans la langue demandée
  function helpers(mission, family, l) {
    const idx = Math.max(0, LANGS.indexOf(l));
    const pick = arr => Array.isArray(arr) ? arr[idx] || arr[1] || arr[0] : arr;
    const stats = M.computeStatistics(mission);
    const series = (family.series || []).find(s => s.value === mission.series);
    const outcome = V.outcomes.find(o => o.value === mission.results?.outcome);
    const caps = (mission.capabilities || []).map(code => pick(allCapabilityItems.find(x => x.value === code)?.label) || code);
    const lead = mission.aircraft?.[0] || {};
    const aircraft = (mission.aircraft || []).filter(a => a.type || a.registration).map(a => [a.type, a.registration && `(${a.registration})`].filter(Boolean).join(' '));
    const list = (items, and) => items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} ${and} ${items[items.length - 1]}`;
    const date = mission.metadata?.date ? new Date(`${mission.metadata.date}T12:00:00`).toLocaleDateString(l, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    // Assemble des morceaux de phrase en ignorant ceux dont une donnée manque.
    const sentence = (...parts) => parts.filter(Boolean).join(' ').replace(/\s+([,.])/g, '$1').trim();
    // Un résumé ne cite jamais les données d'un bloc masqué (ex. largages sans AIRDROP).
    const ctx = M.context(mission, family), visible = id => M.blockVisible(mission, family, id);
    // Nombre formaté selon la langue (4,0 t en français, 4.0 t en anglais…).
    const number = (v, digits = 0) => Number(v || 0).toLocaleString(l, { minimumFractionDigits: digits, maximumFractionDigits: digits });
    // Masse lisible : kg sous la tonne, t (1 décimale) au-delà.
    const mass = kg => Number(kg) >= 1000 ? `${number(Number(kg) / 1000, 1)} t` : `${number(kg)} kg`;
    return { lang: l, number, mass, visible, ctx, pick, stats, duration, series: pick(series?.label) || mission.series || '', outcome: pick(outcome?.label) || '', caps, lead, aircraft, list, date, sentence, mission };
  }
  function summary(mission, family, l = lang()) {
    const template = family.summary?.[l] || family.summary?.fr;
    if (typeof template !== 'function') return '';
    try { return template(helpers(mission, family, l)).replace(/\s+/g, ' ').trim(); } catch { return ''; }
  }

  window.MissionReport = { render, summary, helpers, lang };
})();
