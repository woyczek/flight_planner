(() => {
  'use strict';
  // Famille SPECIAL TRANSPORT / TEST / TRAINING (§17) : missions spécialisées sans moteur
  // propre. Quatre sous-modules affichés selon le groupe de la série : VIP / gouvernement,
  // convoyage (ferry), essais en vol, formation.
  const V = window.MissionVocab,
    L = V.L,
    opt = V.opt;
  const f = (path, label, type = 'text', extra = {}) => ({
    path,
    label,
    type,
    ...extra
  });
  const P = 'missionData.special.';
  const num = v => Number(v) || 0;
  const group = series => String(series || '').split('-')[0];
  const inGroup = g => ctx => group(ctx.series) === g;
  const yesNo = [opt('', L('—', '—')), opt('YES', L('Oui', 'Yes', 'Ja', 'Sí')), opt('NO', L('Non', 'No', 'Nein', 'No'))];
  const passFail = [opt('PASS', L('Conforme', 'Pass', 'Bestanden', 'Conforme')), opt('FAIL', L('Non conforme', 'Fail', 'Nicht bestanden', 'No conforme')), opt('NOT_FLOWN', L('Non réalisé', 'Not flown', 'Nicht geflogen', 'No realizado'))];
  const completion = [opt('COMPLETED', L('Réalisé', 'Completed', 'Absolviert', 'Completado')), opt('PARTIAL', L('Partiel', 'Partial', 'Teilweise', 'Parcial')), opt('NOT_COMPLETED', L('Non réalisé', 'Not completed', 'Nicht absolviert', 'No completado'))];
  const sp = m => m.missionData?.special || {};
  const points = m => (sp(m).testPoints || []).filter(p => p.id || p.result);
  const exercises = m => (sp(m).exercises || []).filter(e => e.exercise || e.completed);
  const s = (value, fr, en, de, es) => ({
    value,
    label: L(fr, en, de, es)
  });

  window.MissionCore.registerFamily({
    id: 'SPECIAL',
    idPrefix: 'SPC',
    pages: {
      cr: 'special_cr.html',
      reporting: 'special_reporting.html'
    },
    title: L('Transport spécial / essais / formation', 'Special transport / test / training', 'Sondertransport / Erprobung / Ausbildung', 'Transporte especial / ensayos / formación'),
    series: [
      s('VIP-VIP', 'VIP — transport VIP', 'VIP — VIP transport', 'VIP — VIP-Transport', 'VIP — transporte VIP'), s('VIP-VVIP', 'VIP — transport VVIP', 'VIP — VVIP transport', 'VIP — VVIP-Transport', 'VIP — transporte VVIP'),
      s('VIP-STATE', 'VIP — vol d’État', 'VIP — state flight', 'VIP — Staatsflug', 'VIP — vuelo de Estado'), s('VIP-GOVERNMENT', 'VIP — mission gouvernementale', 'VIP — government mission', 'VIP — Regierungsflug', 'VIP — misión gubernamental'),
      s('FERRY-TRANSFER', 'Convoyage — transfert d’appareil', 'Ferry — aircraft transfer', 'Überführung — Luftfahrzeugtransfer', 'Traslado — transferencia de aeronave'), s('FERRY-MAINTENANCE', 'Convoyage — mise en place maintenance', 'Ferry — maintenance positioning', 'Überführung — Wartungspositionierung', 'Traslado — posicionamiento para mantenimiento'),
      s('FERRY-DELIVERY', 'Convoyage — livraison', 'Ferry — delivery', 'Überführung — Auslieferung', 'Traslado — entrega'), s('FERRY-RTB', 'Convoyage — retour base', 'Ferry — return to base', 'Überführung — Rückkehr zur Basis', 'Traslado — regreso a la base'),
      s('TEST-DEVELOPMENT', 'Essai — développement', 'Test — development', 'Erprobung — Entwicklung', 'Ensayo — desarrollo'), s('TEST-ACCEPTANCE', 'Essai — réception', 'Test — acceptance', 'Erprobung — Abnahme', 'Ensayo — aceptación'),
      s('TEST-MCF', 'Essai — vol de contrôle maintenance', 'Test — maintenance check flight', 'Erprobung — Werkstattflug', 'Ensayo — vuelo de control de mantenimiento'), s('TEST-FCF', 'Essai — vol de contrôle fonctionnel', 'Test — functional check flight', 'Erprobung — Funktionsprüfflug', 'Ensayo — vuelo de control funcional'),
      s('TEST-CERTIFICATION', 'Essai — certification', 'Test — certification', 'Erprobung — Zulassung', 'Ensayo — certificación'),
      s('TRAINING-IFR', 'Formation — IFR', 'Training — IFR', 'Ausbildung — IFR', 'Formación — IFR'), s('TRAINING-VFR', 'Formation — VFR', 'Training — VFR', 'Ausbildung — VFR', 'Formación — VFR'),
      s('TRAINING-NIGHT', 'Formation — vol de nuit', 'Training — night', 'Ausbildung — Nachtflug', 'Formación — vuelo nocturno'), s('TRAINING-NVG', 'Formation — NVG', 'Training — NVG', 'Ausbildung — NVG', 'Formación — NVG'),
      s('TRAINING-SAR', 'Formation — SAR', 'Training — SAR', 'Ausbildung — SAR', 'Formación — SAR'), s('TRAINING-HOIST', 'Formation — treuillage', 'Training — hoist', 'Ausbildung — Winde', 'Formación — grúa'),
      s('TRAINING-SHIPBOARD', 'Formation — appontage', 'Training — shipboard', 'Ausbildung — Bordlandung', 'Formación — operaciones embarcadas'), s('TRAINING-PARADROP', 'Formation — largage de personnel', 'Training — paradrop', 'Ausbildung — Personenabsetzen', 'Formación — lanzamiento de personal'),
      s('TRAINING-AIRDROP', 'Formation — largage de matériel', 'Training — airdrop', 'Ausbildung — Lastenabwurf', 'Formación — lanzamiento de carga'), s('TRAINING-LOW_LEVEL', 'Formation — très basse altitude', 'Training — low level', 'Ausbildung — Tiefflug', 'Formación — baja cota'),
      s('TRAINING-FORMATION', 'Formation — vol en patrouille', 'Training — formation flying', 'Ausbildung — Formationsflug', 'Formación — vuelo en formación'), s('TRAINING-INSTRUMENT', 'Formation — instruments', 'Training — instrument', 'Ausbildung — Instrumentenflug', 'Formación — instrumental'),
      s('TRAINING-CHECKRIDE', 'Formation — contrôle en vol (checkride)', 'Training — checkride', 'Ausbildung — Überprüfungsflug', 'Formación — vuelo de verificación')
    ],
    flags: mission => ({
      maritime: mission.series === 'TRAINING-SHIPBOARD'
    }),
    blocks: [{
      id: 'special-vip',
      title: L('Transport VIP / gouvernemental', 'VIP / government transport', 'VIP- / Regierungstransport', 'Transporte VIP / gubernamental'),
      when: inGroup('VIP'),
      fields: [
        f(P + 'passengers', L('Passagers', 'Passengers', 'Passagiere', 'Pasajeros'), 'number'), f(P + 'authority', L('Autorité', 'Authority', 'Behörde', 'Autoridad')),
        f(P + 'passengerDetail', L('Délégation (détail)', 'Delegation (detail)', 'Delegation (Details)', 'Delegación (detalle)'), 'text', {
          sensitive: true
        }),
        f(P + 'origin', L('Origine', 'Origin', 'Start', 'Origen'), 'text', {
          upper: true
        }), f(P + 'destination', L('Destination', 'Destination', 'Ziel', 'Destino'), 'text', {
          upper: true
        }),
        f(P + 'schedule', L('Horaire prévu', 'Planned schedule', 'Geplanter Zeitplan', 'Horario previsto')), f(P + 'delayMinutes', L('Retard (min)', 'Delay (min)', 'Verspätung (min)', 'Retraso (min)'), 'number'),
        f(P + 'diversions', L('Déroutements', 'Diversions', 'Umleitungen', 'Desvíos')), f(P + 'handling', L('Traitement particulier / protocole', 'Special handling / protocol', 'Sonderbehandlung / Protokoll', 'Tratamiento especial / protocolo'), 'text', {
          full: true,
          sensitive: true
        })
      ]
    }, {
      id: 'special-ferry',
      title: L('Convoyage', 'Ferry flight', 'Überführungsflug', 'Vuelo de traslado'),
      when: inGroup('FERRY'),
      fields: [
        f(P + 'origin', L('Origine', 'Origin', 'Start', 'Origen'), 'text', {
          upper: true
        }), f(P + 'destination', L('Destination', 'Destination', 'Ziel', 'Destino'), 'text', {
          upper: true
        }),
        f(P + 'reason', L('Motif', 'Reason', 'Grund', 'Motivo')), f(P + 'technicalStatus', L('État technique', 'Technical status', 'Technischer Zustand', 'Estado técnico')),
        f(P + 'stops', L('Escales', 'Stops', 'Zwischenlandungen', 'Escalas'), 'text', {
          upper: true
        }), f(P + 'defects', L('Défauts constatés', 'Defects found', 'Festgestellte Mängel', 'Defectos detectados'), 'textarea', {
          full: true
        })
      ]
    }, {
      id: 'special-test',
      title: L('Essai en vol', 'Flight test', 'Flugerprobung', 'Ensayo en vuelo'),
      when: inGroup('TEST'),
      fields: [
        f(P + 'testCard', L('Carte d’essai', 'Test card', 'Testkarte', 'Tarjeta de ensayo'), 'text', {
          upper: true
        }), f(P + 'configuration', L('Configuration', 'Configuration', 'Konfiguration', 'Configuración')),
        f(P + 'repeatRequired', L('Reprise nécessaire', 'Repeat required', 'Wiederholung nötig', 'Repetición necesaria'), 'select', {
          options: yesNo
        })
      ]
    }, {
      id: 'special-points',
      title: L('Points d’essai', 'Test points', 'Testpunkte', 'Puntos de ensayo'),
      when: inGroup('TEST'),
      collection: {
        path: P + 'testPoints',
        min: 0,
        compact: true,
        item: L('Point d’essai', 'Test point', 'Testpunkt', 'Punto de ensayo'),
        add: L('+ Ajouter un point d’essai', '+ Add test point', '+ Testpunkt hinzufügen', '+ Añadir punto de ensayo'),
        empty: () => ({
          id: '',
          altitudeFt: null,
          speedKt: null,
          config: '',
          result: '',
          pass: '',
          anomaly: ''
        }),
        fields: [f('id', L('Point', 'Point', 'Punkt', 'Punto'), 'text', {
          upper: true
        }), f('altitudeFt', L('Altitude (ft)', 'Altitude (ft)', 'Höhe (ft)', 'Altitud (ft)'), 'number'), f('speedKt', L('Vitesse (kt)', 'Speed (kt)', 'Geschwindigkeit (kt)', 'Velocidad (kt)'), 'number'), f('config', L('Configuration', 'Configuration', 'Konfiguration', 'Configuración')), f('pass', L('Résultat', 'Result', 'Ergebnis', 'Resultado'), 'select', {
          options: passFail,
          blank: true
        }), f('result', L('Mesure / observation', 'Measurement / observation', 'Messung / Beobachtung', 'Medida / observación')), f('anomaly', L('Anomalie', 'Anomaly', 'Abweichung', 'Anomalía'), 'text', {
          full: true
        })]
      }
    }, {
      id: 'special-training',
      title: L('Formation', 'Training', 'Ausbildung', 'Formación'),
      when: inGroup('TRAINING'),
      fields: [
        f(P + 'instructor', L('Instructeur', 'Instructor', 'Lehrer', 'Instructor')), f(P + 'trainee', L('Stagiaire', 'Trainee', 'Schüler', 'Alumno')),
        f(P + 'grading', L('Évaluation globale', 'Overall grading', 'Gesamtbewertung', 'Evaluación global'))
      ]
    }, {
      id: 'special-exercises',
      title: L('Exercices', 'Exercises', 'Übungen', 'Ejercicios'),
      when: inGroup('TRAINING'),
      collection: {
        path: P + 'exercises',
        min: 0,
        compact: true,
        item: L('Exercice', 'Exercise', 'Übung', 'Ejercicio'),
        add: L('+ Ajouter un exercice', '+ Add exercise', '+ Übung hinzufügen', '+ Añadir ejercicio'),
        empty: () => ({
          exercise: '',
          objective: '',
          repetitions: null,
          completed: '',
          grade: '',
          observations: ''
        }),
        fields: [f('exercise', L('Exercice', 'Exercise', 'Übung', 'Ejercicio')), f('objective', L('Objectif', 'Objective', 'Ziel', 'Objetivo')), f('repetitions', L('Répétitions', 'Repetitions', 'Wiederholungen', 'Repeticiones'), 'number'), f('completed', L('Réalisation', 'Completion', 'Durchführung', 'Realización'), 'select', {
          options: completion,
          blank: true
        }), f('grade', L('Note', 'Grade', 'Note', 'Nota')), f('observations', L('Observations', 'Observations', 'Beobachtungen', 'Observaciones'), 'text', {
          full: true
        })]
      }
    }],
    stats: [{
      id: 'vipPax',
      label: L('Passagers VIP', 'VIP passengers', 'VIP-Passagiere', 'Pasajeros VIP'),
      value: ms => ms.filter(m => group(m.series) === 'VIP').reduce((a, m) => a + num(sp(m).passengers), 0)
    }, {
      id: 'ferry',
      label: L('Convoyages', 'Ferry flights', 'Überführungsflüge', 'Vuelos de traslado'),
      value: ms => ms.filter(m => group(m.series) === 'FERRY').length
    }, {
      id: 'testPoints',
      label: L('Points d’essai conformes / réalisés', 'Test points passed / flown', 'Testpunkte bestanden / geflogen', 'Puntos de ensayo conformes / realizados'),
      value: ms => {
        const p = ms.filter(m => group(m.series) === 'TEST').flatMap(points),
          flown = p.filter(x => x.pass && x.pass !== 'NOT_FLOWN');
        return `${flown.filter(x => x.pass === 'PASS').length} / ${flown.length}`;
      }
    }, {
      id: 'exercises',
      label: L('Exercices réalisés', 'Exercises completed', 'Absolvierte Übungen', 'Ejercicios completados'),
      value: ms => ms.filter(m => group(m.series) === 'TRAINING').flatMap(exercises).filter(e => e.completed === 'COMPLETED').length
    }],
    // Résumé propre à chaque sous-module (VIP, convoyage, essai, formation).
    summary: (() => {
      const build = w => h => {
        const m = h.mission,
          d = sp(m),
          st = h.stats,
          g = group(m.series),
          head = [`${h.series}${h.date ? ` ${w.on} ${h.date}` : ''}`, h.aircraft.length && `${w.by} ${h.list(h.aircraft, w.and)}`];
        const route = [d.origin && `${w.from} ${d.origin}`, d.destination && `${w.to} ${d.destination}`];
        let body = [];
        if (g === 'VIP') body = [...route, '.', d.passengers && `${w.pax(num(d.passengers))}.`, d.delayMinutes ? `${w.delay(num(d.delayMinutes))}.` : `${w.onTime}.`, d.diversions && `${w.diversions} ${d.diversions}.`];
        if (g === 'FERRY') body = [...route, d.stops && `${w.via} ${d.stops}`, '.', d.reason && `${w.reason} ${d.reason}.`, d.defects && `${w.defects} ${d.defects}.`];
        if (g === 'TEST') {
          const p = points(m),
            flown = p.filter(x => x.pass && x.pass !== 'NOT_FLOWN');
          body = [d.testCard && `(${w.card} ${d.testCard})`, '.', p.length && `${w.points(flown.filter(x => x.pass === 'PASS').length, flown.length, p.length)}.`, d.repeatRequired === 'YES' && `${w.repeat}.`];
        }
        if (g === 'TRAINING') {
          const e = exercises(m);
          body = [(d.trainee || d.instructor) && `(${[d.trainee && `${w.trainee} ${d.trainee}`, d.instructor && `${w.instructor} ${d.instructor}`].filter(Boolean).join(', ')})`, '.', e.length && `${w.exercises(e.filter(x => x.completed === 'COMPLETED').length, e.length)}.`, d.grading && `${w.grading} ${d.grading}.`];
        }
        return h.sentence(...head, ...body, st.flightMinutes != null && `${w.flight} ${h.duration(st.flightMinutes)}.`, h.outcome && `${w.outcome} ${h.outcome}.`);
      };
      return {
        fr: build({
          on: 'du',
          by: 'réalisé par',
          and: 'et',
          from: 'de',
          to: 'à',
          via: 'via',
          pax: n => `${n} passager(s)`,
          delay: n => `Retard ${n} min`,
          onTime: 'À l’heure',
          diversions: 'Déroutement :',
          reason: 'Motif :',
          defects: 'Défauts :',
          card: 'carte',
          points: (p, f, t) => `${p} point(s) conforme(s) sur ${f} réalisé(s) (${t} prévu(s))`,
          repeat: 'Reprise nécessaire',
          trainee: 'stagiaire',
          instructor: 'instructeur',
          exercises: (c, t) => `${c} exercice(s) réalisé(s) sur ${t}`,
          grading: 'Évaluation :',
          flight: 'Temps de vol',
          outcome: 'Résultat :'
        }),
        en: build({
          on: 'on',
          by: 'flown by',
          and: 'and',
          from: 'from',
          to: 'to',
          via: 'via',
          pax: n => `${n} passenger(s)`,
          delay: n => `Delay ${n} min`,
          onTime: 'On time',
          diversions: 'Diversion:',
          reason: 'Reason:',
          defects: 'Defects:',
          card: 'card',
          points: (p, f, t) => `${p} of ${f} test point(s) flown passed (${t} planned)`,
          repeat: 'Repeat required',
          trainee: 'trainee',
          instructor: 'instructor',
          exercises: (c, t) => `${c} of ${t} exercise(s) completed`,
          grading: 'Grading:',
          flight: 'Flight time',
          outcome: 'Outcome:'
        }),
        de: build({
          on: 'am',
          by: 'durchgeführt mit',
          and: 'und',
          from: 'von',
          to: 'nach',
          via: 'über',
          pax: n => `${n} Passagier(e)`,
          delay: n => `Verspätung ${n} min`,
          onTime: 'Pünktlich',
          diversions: 'Umleitung:',
          reason: 'Grund:',
          defects: 'Mängel:',
          card: 'Karte',
          points: (p, f, t) => `${p} von ${f} geflogenen Testpunkt(en) bestanden (${t} geplant)`,
          repeat: 'Wiederholung nötig',
          trainee: 'Schüler',
          instructor: 'Lehrer',
          exercises: (c, t) => `${c} von ${t} Übung(en) absolviert`,
          grading: 'Bewertung:',
          flight: 'Flugzeit',
          outcome: 'Ergebnis:'
        }),
        es: build({
          on: 'del',
          by: 'realizado por',
          and: 'y',
          from: 'de',
          to: 'a',
          via: 'vía',
          pax: n => `${n} pasajero(s)`,
          delay: n => `Retraso ${n} min`,
          onTime: 'Puntual',
          diversions: 'Desvío:',
          reason: 'Motivo:',
          defects: 'Defectos:',
          card: 'tarjeta',
          points: (p, f, t) => `${p} de ${f} punto(s) de ensayo realizados conformes (${t} previstos)`,
          repeat: 'Repetición necesaria',
          trainee: 'alumno',
          instructor: 'instructor',
          exercises: (c, t) => `${c} de ${t} ejercicio(s) completado(s)`,
          grading: 'Evaluación:',
          flight: 'Tiempo de vuelo',
          outcome: 'Resultado:'
        })
      };
    })()
  });
})();
