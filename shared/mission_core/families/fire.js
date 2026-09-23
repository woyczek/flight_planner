(() => {
  'use strict';
  // Famille FIRE / GAAR reconstruite sur le Mission Report Core (étape 2b) : mêmes champs
  // que le CR FIRE historique (FIRE/fire_cr.html), plus le modèle commun. Largages et
  // écopages : maximum entre la saisie manuelle et les événements (règle historique).
  const V = window.MissionVocab, L = V.L, opt = V.opt;
  const f = (path, label, type = 'text', extra = {}) => ({ path, label, type, ...extra });
  const P = 'missionData.fire.';
  const num = v => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v));
  const risks = [opt('Green', L('Vert', 'Green', 'Grün', 'Verde')), opt('Yellow', L('Jaune', 'Yellow', 'Gelb', 'Amarillo')), opt('Orange', L('Orange', 'Orange', 'Orange', 'Naranja')), opt('Red', L('Rouge', 'Red', 'Rot', 'Rojo'))];
  const LEGACY = { 'Vert': 'Green', 'Jaune': 'Yellow', 'Rouge': 'Red', 'GAAR avec déroutement': 'GAAR with diversion', 'Intervention': 'Response', 'Entraînement': 'Training', 'Autre': 'Other', 'Alerte feu': 'Fire alert', 'Déroutement': 'Diversion', 'Arrivée secteur': 'Sector arrival', 'Largage': 'Drop', 'Rechargement': 'Reload', 'Écopage': 'Scooping', 'Retour': 'Return', 'Anomalie': 'Issue' };
  const norm = v => LEGACY[String(v ?? '').trim()] ?? String(v ?? '').trim();
  const EVENT = { 'Observation': 'OTHER', 'Fire alert': 'FIRE_ALERT', 'Diversion': 'DIVERSION', 'Sector arrival': 'ON_TASK', 'Drop': 'DROP', 'Reload': 'RELOAD', 'Scooping': 'SCOOPING', 'Return': 'OFF_TASK', 'Issue': 'TECHNICAL' };
  const fire = m => m.missionData?.fire || {};
  const eventCount = (m, types) => (m.events || []).filter(e => types.includes(e.type)).length;
  const drops = m => Math.max(num(fire(m).drops) || 0, eventCount(m, ['DROP']));
  const reloads = m => Math.max(num(fire(m).reloads) || 0, eventCount(m, ['RELOAD', 'SCOOPING']));

  window.MissionCore.registerFamily({
    id: 'FIRE', idPrefix: 'GAAR', defaultCategory: 'fixed',
    pages: { cr: 'fire_core_cr.html', reporting: 'fire_core_reporting.html' },
    title: L('FIRE / GAAR — feux de forêt', 'FIRE / GAAR — wildfires', 'FIRE / GAAR — Waldbrände', 'FIRE / GAAR — incendios forestales'),
    series: [
      { value: 'GAAR', label: L('GAAR', 'GAAR') }, { value: 'GAAR with diversion', label: L('GAAR avec déroutement', 'GAAR with diversion', 'GAAR mit Umleitung', 'GAAR con desvío') },
      { value: 'Response', label: L('Intervention', 'Response', 'Einsatz', 'Intervención') }, { value: 'Training', label: L('Entraînement', 'Training', 'Training', 'Entrenamiento') }
    ],
    events: [
      opt('FIRE_ALERT', L('Alerte feu', 'Fire alert', 'Brandalarm', 'Alerta de incendio')), opt('RELOAD', L('Rechargement', 'Reload', 'Nachladen', 'Recarga')), opt('SCOOPING', L('Écopage', 'Scooping', 'Wasseraufnahme', 'Amerizaje'))
    ],
    blocks: [
      {
        id: 'fire-order', title: L('Ordre de vol', 'Flight order', 'Flugauftrag', 'Orden de vuelo'),
        fields: [
          f(P + 'risk', L('Niveau de risque', 'Risk level', 'Gefahrenstufe', 'Nivel de riesgo'), 'select', { options: risks, blank: true }),
          f(P + 'sector', L('Circuit / secteur', 'Circuit / sector', 'Route / Sektor', 'Circuito / sector')),
          f(P + 'reloadBase', L('Base rechargement / écopage', 'Reload / scooping base', 'Nachlade- / Schöpfbasis', 'Base de recarga / amerizaje'), 'text', { upper: true }),
          f(P + 'fms', L('Fichier FMS', 'FMS file', 'FMS-Datei', 'Archivo FMS')), f(P + 'altitude', L('Altitude prévue', 'Planned altitude', 'Geplante Höhe', 'Altitud prevista')),
          f(P + 'weatherRemarks', L('Vent / météo synthétique', 'Wind / weather summary', 'Wind / Wetterlage', 'Viento / meteorología')), f(P + 'load', L('Charge eau / retardant', 'Water / retardant load', 'Wasser- / Retardantlast', 'Carga de agua / retardante'))
        ]
      },
      {
        id: 'fire-times', title: L('Horaires feux de forêt', 'Wildfire times', 'Waldbrandzeiten', 'Horarios de incendio'),
        fields: [
          f(P + 'patrolStart', L('Début patrouille', 'Patrol start', 'Patrouillenbeginn', 'Inicio de patrulla'), 'time'), f(P + 'fireAlert', L('Alerte feu', 'Fire alert', 'Brandalarm', 'Alerta de incendio'), 'time'),
          f(P + 'firstDrop', L('Premier largage', 'First drop', 'Erster Abwurf', 'Primer lanzamiento'), 'time'), f(P + 'endIntervention', L('Fin intervention', 'End of intervention', 'Einsatzende', 'Fin de la intervención'), 'time')
        ]
      },
      {
        id: 'fire-drops', title: L('Largages et rechargements', 'Drops and reloads', 'Abwürfe und Nachladungen', 'Lanzamientos y recargas'),
        fields: [
          f(P + 'drops', L('Nb largages (manuel)', 'Drops (manual)', 'Abwürfe (manuell)', 'Lanzamientos (manual)'), 'number'),
          f(P + 'reloads', L('Nb rechargements / écopages (manuel)', 'Reloads / scoopings (manual)', 'Nachladungen / Schöpfvorgänge (manuell)', 'Recargas / amerizajes (manual)'), 'number'),
          f(P + 'reloadTime', L('Temps moyen rechargement', 'Average reload time', 'Mittlere Nachladezeit', 'Tiempo medio de recarga'))
        ]
      }
    ],
    stats: [
      { id: 'drops', label: L('Largages incendie', 'Firefighting drops', 'Löschabwürfe', 'Lanzamientos contraincendios'), value: ms => ms.reduce((a, m) => a + drops(m), 0) },
      { id: 'reloads', label: L('Recharges / écopages', 'Reloads / scoopings', 'Nachladungen / Schöpfvorgänge', 'Recargas / amerizajes'), value: ms => ms.reduce((a, m) => a + reloads(m), 0) },
      { id: 'fuelRate', label: L('Consommation moyenne (/h)', 'Average fuel burn (/h)', 'Mittlerer Verbrauch (/h)', 'Consumo medio (/h)'), value: ms => { const v = ms.map(m => { const s = window.MissionModel.computeStatistics(m); return s.fuelUsed != null && s.flightMinutes ? s.fuelUsed / (s.flightMinutes / 60) : null; }).filter(x => x != null); return v.length ? Math.round(v.reduce((a, x) => a + x, 0) / v.length) : 0; } }
    ],
    summary: (() => {
      const build = w => h => {
        const m = h.mission, d = fire(m), s = h.stats, risk = h.pick(risks.find(o => o.value === d.risk)?.label);
        return h.sentence(
          `${h.series || 'GAAR'}${risk ? ` (${w.risk} ${String(risk).toLowerCase()})` : ''}${h.date ? ` ${w.on} ${h.date}` : ''}`, h.aircraft.length && `${w.by} ${h.list(h.aircraft, w.and)}`, h.lead.baseDeparture && `${w.from} ${h.lead.baseDeparture}`, d.sector && `${w.over} ${d.sector}`, '.',
          d.fireAlert && `${w.alert} ${d.fireAlert}${d.firstDrop ? `, ${w.firstDrop} ${d.firstDrop}` : ''}.`,
          (drops(m) || reloads(m)) && `${w.drops(drops(m), reloads(m))}.`,
          s.flightMinutes != null && `${w.flight} ${h.duration(s.flightMinutes)}${s.fuelUsed != null ? `, ${w.fuel} ${s.fuelUsed} ${m.fuel?.unit || ''}` : ''}.`, h.outcome && `${w.outcome} ${h.outcome}.`);
      };
      return {
        fr: build({ risk: 'risque', on: 'du', by: 'réalisée par', and: 'et', from: 'depuis', over: 'sur', alert: 'Alerte feu à', firstDrop: 'premier largage à', drops: (d, r) => `${d} largage(s), ${r} rechargement(s) / écopage(s)`, flight: 'Temps de vol', fuel: 'carburant consommé', outcome: 'Résultat :' }),
        en: build({ risk: 'risk', on: 'on', by: 'flown by', and: 'and', from: 'from', over: 'over', alert: 'Fire alert at', firstDrop: 'first drop at', drops: (d, r) => `${d} drop(s), ${r} reload(s) / scooping(s)`, flight: 'Flight time', fuel: 'fuel used', outcome: 'Outcome:' }),
        de: build({ risk: 'Gefahr', on: 'am', by: 'durchgeführt mit', and: 'und', from: 'ab', over: 'über', alert: 'Brandalarm um', firstDrop: 'erster Abwurf um', drops: (d, r) => `${d} Abwurf/Abwürfe, ${r} Nachladung(en) / Schöpfvorgang/-vorgänge`, flight: 'Flugzeit', fuel: 'Kraftstoffverbrauch', outcome: 'Ergebnis:' }),
        es: build({ risk: 'riesgo', on: 'del', by: 'realizada por', and: 'y', from: 'desde', over: 'sobre', alert: 'Alerta de incendio a las', firstDrop: 'primer lanzamiento a las', drops: (d, r) => `${d} lanzamiento(s), ${r} recarga(s) / amerizaje(s)`, flight: 'Tiempo de vuelo', fuel: 'combustible consumido', outcome: 'Resultado:' })
      };
    })(),
    legacy: {
      configKey: 'gaarLedgerName', label: L('Importer l’ancien registre FIRE / GAAR (CSV)', 'Import legacy FIRE / GAAR ledger (CSV)', 'Altes FIRE / GAAR-Register importieren (CSV)', 'Importar el registro FIRE / GAAR antiguo (CSV)'),
      fromRecord(r, { emptyMission }) {
        const m = emptyMission('FIRE');
        m.metadata.missionId = r.missionId || ''; m.metadata.date = r.date || ''; m.series = norm(r.missionType);
        const type = norm(r.aircraft);
        m.aircraft[0] = { ...m.aircraft[0], type: type === 'Milan / Dash Q400MR' ? 'DH8D' : type === 'Canadair CL-415' ? 'CL2T' : String(type).toUpperCase(), variant: ['Milan / Dash Q400MR', 'Canadair CL-415'].includes(type) ? type : '', registration: String(r.registration || '').toUpperCase(), callsign: String(r.callsign || '').toUpperCase(), baseDeparture: String(r.baseDeparture || '').toUpperCase(), baseReturn: String(r.baseReturn || '').toUpperCase(), category: type === 'Canadair CL-415' ? 'amphibious' : 'fixed' };
        [['captain', 'PIC'], ['fo', 'COPILOT'], ['observer', 'OBSERVER']].forEach(([k, role]) => { if (r[k]) m.crew.push({ role, name: r[k], aircraft: 1, notes: '' }); });
        Object.assign(m.timeline, { engineStart: r.engineStart || '', takeoff: r.takeoff || '', zoneEntry: r.onScene || '', landing: r.landing || '', shutdown: r.engineStop || '' });
        Object.assign(m.fuel, { unit: r.fuelUnit || 'kg', start: num(r.fuelStart), landing: num(r.fuelEnd) });
        m.missionData.fire = { risk: norm(r.risk), sector: r.sector || '', reloadBase: String(r.reloadBase || '').toUpperCase(), fms: r.fms || '', altitude: r.altitude || '', weatherRemarks: r.weather || '', load: r.load || '', patrolStart: r.patrolStart || '', fireAlert: r.fireAlert || '', firstDrop: r.firstDrop || '', endIntervention: r.endIntervention || '', drops: num(r.drops), reloads: num(r.reloads), reloadTime: r.reloadTime || '' };
        m.results.anomalies = r.techNotes || '';
        m.remarks = { observations: r.opsNotes || '', lessonsLearned: r.lessons || '' };
        m.network = { onlineNetwork: r.onlineNetwork || '', ivaoId: r.ivaoId || '', vatsimId: r.vatsimId || '', trackerUrl: r.trackerUrl || '' };
        if (Array.isArray(r.events)) m.events = r.events.map(e => ({ timeLocal: e.time || '', timeUtc: '', type: EVENT[norm(e.type)] || 'OTHER', position: e.position || '', altitude: null, speed: null, heading: null, fuel: null, description: e.note || '', result: '' }));
        return m;
      }
    }
  });
})();
