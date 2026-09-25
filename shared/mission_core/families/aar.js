(() => {
  'use strict';
  // Famille AAR / RAVITAILLEMENT EN VOL : missions de ravitailleur (tanker) et de ravitaillé
  // (receveur). Hippodrome ou zone (axes MIAM ENR 5.7), rendez-vous, système (perche / panier),
  // ravitaillés et carburant transféré, contacts et breakaways.
  const V = window.MissionVocab,
    L = V.L,
    opt = V.opt;
  const f = (path, label, type = 'text', extra = {}) => ({
    path,
    label,
    type,
    ...extra
  });
  const P = 'missionData.aar.';
  const num = v => Number(v) || 0;

  const roles = [opt('TANKER', L('Ravitailleur', 'Tanker', 'Tanker', 'Cisterna')), opt('RECEIVER', L('Ravitaillé', 'Receiver', 'Empfänger', 'Receptor'))];
  // Axes de ravitaillement du MIAM ENR 5.7 (SIA XML/miam-enr-5-7-tracks.xml), liste à mettre à jour avec le MIAM.
  const tracks = ['AGATHE', 'ALOHA', 'AMELIE', 'BARBARA', 'CECILE', 'DIANA', 'EDWIGE', 'FABIOLA', 'FOX01B/02B', 'FOX03/04', 'FOX05/06', 'FOX07/08', 'FOX09/10', 'FOX66/67',
    'GISELE', 'IRENE', 'JUDITH', 'KATIA', 'LEA', 'LUCIE', 'MARIE', 'NADIA', 'NINA', 'OCEANE', 'OLIVIA', 'REGINA', 'SIMONE', 'STACY', 'STEPHANIE', 'TANIA',
    'TIPHAINE', 'URSULA', 'VALENTINA', 'VIVIANE', 'YVETTE', 'ZOE', 'ZORA'
  ].map(n => opt(n, n)).concat(opt('OTHER', L('Autre zone', 'Other area', 'Anderes Gebiet', 'Otra zona')));
  const rvTypes = [
    opt('RV_ANCHOR', L('Hippodrome (anchor)', 'Anchor (racetrack)', 'Anchor (Racetrack)', 'Anchor (circuito)')), opt('RV_ENROUTE', L('En route (RV Golf)', 'En route (RV Golf)', 'En route (RV Golf)', 'En ruta (RV Golf)')),
    opt('RV_POINT_PARALLEL', L('Point parallèle (RV Delta)', 'Point parallel (RV Delta)', 'Point parallel (RV Delta)', 'Punto paralelo (RV Delta)')), opt('RV_TIMING', L('Rendez-vous minuté', 'Timed rendezvous', 'Zeitgesteuertes Rendezvous', 'Encuentro temporizado')),
    opt('RV_RADAR', L('Guidage radar / contrôle', 'Radar-controlled', 'Radargeführt', 'Guiado radar'))
  ];
  const systems = [
    opt('BOOM', L('Perche rigide (boom)', 'Flying boom', 'Tankausleger (Boom)', 'Pértiga (boom)')), opt('DROGUE_CENTER', L('Panier central (tuyau)', 'Centreline hose & drogue', 'Zentraler Schlauch (Drogue)', 'Manguera central')),
    opt('DROGUE_POD', L('Nacelles de voilure (panier)', 'Wing pods (hose & drogue)', 'Flügelbehälter (Drogue)', 'Góndolas alares (manguera)')), opt('BUDDY', L('Nacelle « buddy »', 'Buddy pod', 'Buddy-Pod', 'Pod buddy'))
  ];
  const results = [opt('OK', L('Transfert complet', 'Complete', 'Vollständig', 'Completo')), opt('PARTIAL', L('Partiel', 'Partial', 'Teilweise', 'Parcial')), opt('DRY', L('Contacts à sec', 'Dry contacts', 'Trockenkontakte', 'Contactos en seco')), opt('FAILED', L('Échec', 'Failed', 'Fehlgeschlagen', 'Fallido'))];
  const receivers = m => m.missionData?.aar?.receivers || [];
  const offloadKg = m => receivers(m).reduce((a, r) => a + num(r.offloadKg), 0) || num(m.missionData?.aar?.offloadKg);
  const contacts = m => receivers(m).reduce((a, r) => a + num(r.contacts), 0);
  const breakaways = m => num(m.missionData?.aar?.breakaways);

  window.MissionCore.registerFamily({
    id: 'AAR',
    idPrefix: 'AAR',
    pages: {
      cr: 'aar_cr.html',
      reporting: 'aar_reporting.html'
    },
    title: L('Ravitaillement en vol', 'Air-to-air refuelling', 'Luftbetankung', 'Reabastecimiento en vuelo'),
    series: [{
      value: 'TRAINING',
      label: L('Entraînement / qualification', 'Training / qualification', 'Training / Qualifikation', 'Entrenamiento / calificación')
    }, {
      value: 'OPERATIONAL',
      label: L('Soutien d’opération', 'Operational support', 'Einsatzunterstützung', 'Apoyo a operaciones')
    }, {
      value: 'QRA',
      label: L('Soutien police du ciel (QRA)', 'QRA support', 'QRA-Unterstützung', 'Apoyo QRA')
    }, {
      value: 'DRAG',
      label: L('Convoyage (drag) / déploiement', 'Fighter drag / deployment', 'Überführung (Drag) / Verlegung', 'Traslado (drag) / despliegue')
    }, {
      value: 'EXERCISE',
      label: L('Grand exercice', 'Major exercise', 'Großübung', 'Gran ejercicio')
    }, {
      value: 'TRIALS',
      label: L('Essais / certification', 'Trials / certification', 'Erprobung / Zulassung', 'Ensayos / certificación')
    }],
    events: [
      opt('AAR_RV', L('Rendez-vous', 'Rendezvous', 'Rendezvous', 'Encuentro')), opt('AAR_TRACK_IN', L('Entrée hippodrome', 'Track entry', 'Einflug Racetrack', 'Entrada al circuito')),
      opt('AAR_CONTACT', L('Contact (connexion)', 'Contact (hook-up)', 'Kontakt (Ankopplung)', 'Contacto (acople)')), opt('AAR_DISCONNECT', L('Déconnexion', 'Disconnect', 'Abkopplung', 'Desacople')),
      opt('AAR_BREAKAWAY', L('Breakaway', 'Breakaway', 'Breakaway', 'Breakaway')), opt('AAR_TRACK_OUT', L('Sortie hippodrome', 'Track exit', 'Ausflug Racetrack', 'Salida del circuito'))
    ],
    blocks: [{
      id: 'aar-setup',
      title: L('Rôle, zone et rendez-vous', 'Role, area and rendezvous', 'Rolle, Gebiet und Rendezvous', 'Función, zona y encuentro'),
      fields: [
        f(P + 'role', L('Rôle', 'Role', 'Rolle', 'Función'), 'select', {
          options: roles
        }),
        f(P + 'track', L('Hippodrome (MIAM ENR 5.7)', 'Track (MIAM ENR 5.7)', 'Racetrack (MIAM ENR 5.7)', 'Circuito (MIAM ENR 5.7)'), 'select', {
          options: tracks,
          blank: true
        }),
        f(P + 'area', L('Autre zone / point', 'Other area / point', 'Anderes Gebiet / Punkt', 'Otra zona / punto'), 'text', {
          upper: true,
          when: ctx => ctx.mission.missionData?.aar?.track === 'OTHER'
        }),
        f(P + 'level', L('Niveau de ravitaillement', 'Refuelling level', 'Betankungshöhe', 'Nivel de reabastecimiento'), 'text', {
          upper: true,
          placeholder: L('FL200', 'FL200')
        }),
        f(P + 'rvType', L('Type de rendez-vous', 'Rendezvous type', 'Rendezvous-Art', 'Tipo de encuentro'), 'select', {
          options: rvTypes,
          blank: true
        }),
        f(P + 'partner', L('Ravitailleur / receveur (indicatif)', 'Tanker / receiver (callsign)', 'Tanker / Empfänger (Rufzeichen)', 'Cisterna / receptor (indicativo)'), 'text', {
          upper: true
        }),
        f(P + 'onStationMinutes', L('Temps sur zone (min)', 'Time on station (min)', 'Zeit im Gebiet (min)', 'Tiempo en zona (min)'), 'number'),
        f(P + 'system', L('Système', 'System', 'System', 'Sistema'), 'select', {
          options: systems,
          blank: true
        })
      ]
    }, {
      id: 'aar-receivers',
      title: L('Ravitaillés et carburant transféré', 'Receivers and fuel offloaded', 'Empfänger und abgegebener Kraftstoff', 'Receptores y combustible transferido'),
      collection: {
        path: P + 'receivers',
        min: 0,
        compact: true,
        item: L('Ravitaillé', 'Receiver', 'Empfänger', 'Receptor'),
        add: L('+ Ajouter un ravitaillé', '+ Add receiver', '+ Empfänger hinzufügen', '+ Añadir receptor'),
        empty: () => ({
          callsign: '',
          type: '',
          plannedKg: null,
          offloadKg: null,
          contacts: null,
          result: 'OK'
        }),
        fields: [
          f('callsign', L('Indicatif', 'Callsign', 'Rufzeichen', 'Indicativo'), 'text', {
            upper: true
          }), f('type', L('Type', 'Type', 'Muster', 'Tipo'), 'text', {
            upper: true,
            placeholder: L('RFAL, M2K…', 'RFAL, M2K…')
          }),
          f('plannedKg', L('Prévu (kg)', 'Planned (kg)', 'Geplant (kg)', 'Previsto (kg)'), 'number'), f('offloadKg', L('Transféré (kg)', 'Offloaded (kg)', 'Abgegeben (kg)', 'Transferido (kg)'), 'number'),
          f('contacts', L('Contacts', 'Contacts', 'Kontakte', 'Contactos'), 'number'), f('result', L('Résultat', 'Result', 'Ergebnis', 'Resultado'), 'select', {
            options: results
          })
        ]
      }
    }, {
      id: 'aar-fuel',
      title: L('Bilan carburant et incidents', 'Fuel balance and incidents', 'Kraftstoffbilanz und Vorfälle', 'Balance de combustible e incidentes'),
      fields: [
        f(P + 'offloadKg', L('Total transféré (kg, si pas de détail)', 'Total offloaded (kg, if no detail)', 'Gesamt abgegeben (kg, ohne Details)', 'Total transferido (kg, sin detalle)'), 'number'),
        f(P + 'receivedKg', L('Reçu (kg, rôle ravitaillé)', 'Received (kg, receiver role)', 'Erhalten (kg, Empfänger)', 'Recibido (kg, receptor)'), 'number', {
          when: ctx => ctx.mission.missionData?.aar?.role === 'RECEIVER'
        }),
        f(P + 'giveAwayKg', L('Carburant disponible au départ (kg)', 'Give-away fuel planned (kg)', 'Abgabefähiger Kraftstoff (kg)', 'Combustible disponible (kg)'), 'number', {
          when: ctx => ctx.mission.missionData?.aar?.role !== 'RECEIVER'
        }),
        f(P + 'breakaways', L('Breakaways', 'Breakaways', 'Breakaways', 'Breakaways'), 'number'),
        f(P + 'incidents', L('Incidents (tuyau, panier, déconnexions…)', 'Incidents (hose, basket, disconnects…)', 'Vorfälle (Schlauch, Korb, Abkopplungen…)', 'Incidentes (manguera, cesta, desacoples…)'), 'textarea', {
          full: true
        })
      ]
    }],
    stats: [{
      id: 'receivers',
      label: L('Ravitaillés', 'Receivers', 'Empfänger', 'Receptores'),
      value: ms => ms.reduce((a, m) => a + receivers(m).length, 0)
    }, {
      id: 'offload',
      label: L('Carburant transféré (t)', 'Fuel offloaded (t)', 'Abgegebener Kraftstoff (t)', 'Combustible transferido (t)'),
      value: ms => Math.round(ms.reduce((a, m) => a + offloadKg(m), 0) / 100) / 10
    }, {
      id: 'contacts',
      label: L('Contacts', 'Contacts', 'Kontakte', 'Contactos'),
      value: ms => ms.reduce((a, m) => a + contacts(m), 0)
    }, {
      id: 'breakaways',
      label: L('Breakaways', 'Breakaways', 'Breakaways', 'Breakaways'),
      value: ms => ms.reduce((a, m) => a + breakaways(m), 0)
    }],
    summary: (() => {
      const build = w => h => {
        const m = h.mission,
          a = m.missionData?.aar || {},
          s = h.stats,
          rs = receivers(m),
          kg = offloadKg(m),
          zone = a.track === 'OTHER' ? a.area : a.track;
        return h.sentence(
          `${h.series || w.aar}${h.date ? ` ${w.on} ${h.date}` : ''}`, h.aircraft.length && `${w.by} ${h.list(h.aircraft, w.and)}`,
          a.role && `(${a.role === 'RECEIVER' ? w.receiver : w.tanker})`, zone && `${w.track} ${zone}`, a.level && `${w.at} ${a.level}`, '.',
          rs.length && `${w.receivers(rs.length)}${kg ? `, ${w.offload(h.mass(kg))}` : ''}.`,
          !rs.length && kg && `${w.offload(h.mass(kg))}.`,
          a.role === 'RECEIVER' && a.receivedKg && `${w.received(h.mass(a.receivedKg))}.`,
          breakaways(m) && `${w.breakaways(breakaways(m))}.`,
          s.flightMinutes != null && `${w.flight} ${h.duration(s.flightMinutes)}${s.blockMinutes != null ? `, ${w.block} ${h.duration(s.blockMinutes)}` : ''}.`,
          h.outcome && `${w.outcome} ${h.outcome}.`);
      };
      return {
        fr: build({
          aar: 'Ravitaillement en vol',
          on: 'du',
          by: 'réalisé par',
          and: 'et',
          tanker: 'ravitailleur',
          receiver: 'ravitaillé',
          track: 'sur l’hippodrome',
          at: 'au',
          receivers: n => `${n} ravitaillé(s)`,
          offload: t => `${t} transférés`,
          received: t => `${t} reçus`,
          breakaways: n => `${n} breakaway(s)`,
          flight: 'Temps de vol',
          block: 'temps bloc',
          outcome: 'Résultat :'
        }),
        en: build({
          aar: 'Air-to-air refuelling',
          on: 'on',
          by: 'flown by',
          and: 'and',
          tanker: 'tanker',
          receiver: 'receiver',
          track: 'on track',
          at: 'at',
          receivers: n => `${n} receiver(s)`,
          offload: t => `${t} offloaded`,
          received: t => `${t} received`,
          breakaways: n => `${n} breakaway(s)`,
          flight: 'Flight time',
          block: 'block time',
          outcome: 'Outcome:'
        }),
        de: build({
          aar: 'Luftbetankung',
          on: 'am',
          by: 'durchgeführt mit',
          and: 'und',
          tanker: 'Tanker',
          receiver: 'Empfänger',
          track: 'im Racetrack',
          at: 'auf',
          receivers: n => `${n} Empfänger`,
          offload: t => `${t} abgegeben`,
          received: t => `${t} erhalten`,
          breakaways: n => `${n} Breakaway(s)`,
          flight: 'Flugzeit',
          block: 'Blockzeit',
          outcome: 'Ergebnis:'
        }),
        es: build({
          aar: 'Reabastecimiento en vuelo',
          on: 'del',
          by: 'realizado por',
          and: 'y',
          tanker: 'cisterna',
          receiver: 'receptor',
          track: 'en el circuito',
          at: 'a',
          receivers: n => `${n} receptor(es)`,
          offload: t => `${t} transferidos`,
          received: t => `${t} recibidos`,
          breakaways: n => `${n} breakaway(s)`,
          flight: 'Tiempo de vuelo',
          block: 'tiempo calzo a calzo',
          outcome: 'Resultado:'
        })
      };
    })()
  });
})();
