(() => {
  'use strict';
  // Famille SAR / PR (§6 du cahier des charges) : recherche et sauvetage terrestre,
  // maritime, recherche d'aéronef, récupération de personnel (PR) et CSAR.
  // Uniquement de la configuration : séries, blocs spécifiques (missionData.sar.*),
  // événements, statistiques et résumé ; tout le reste vient du Mission Report Core.
  const V = window.MissionVocab, L = V.L, opt = V.opt;
  const f = (path, label, type = 'text', extra = {}) => ({ path, label, type, ...extra });
  const P = 'missionData.sar.';
  const maritime = ctx => ['SAR-MARITIME'].includes(ctx.series);

  const beaconTypes = [opt('ELT', L('ELT (aéronef)', 'ELT (aircraft)', 'ELT (Luftfahrzeug)', 'ELT (aeronave)')), opt('PLB', L('PLB (personnelle)', 'PLB (personal)', 'PLB (persönlich)', 'PLB (personal)')), opt('EPIRB', L('EPIRB (navire)', 'EPIRB (vessel)', 'EPIRB (Schiff)', 'EPIRB (buque)')), opt('NONE', L('Aucune', 'None', 'Keine', 'Ninguna'))];
  const alertSources = [opt('BEACON', L('Balise de détresse', 'Distress beacon', 'Notfunkbake', 'Radiobaliza')), opt('CALL', L('Appel (112, VHF…)', 'Call (112, VHF…)', 'Anruf (112, UKW…)', 'Llamada (112, VHF…)')), opt('OVERDUE', L('Retard / disparition signalée', 'Overdue / reported missing', 'Überfällig / vermisst gemeldet', 'Retraso / desaparición notificada')), opt('ATC', L('Contrôle aérien', 'Air traffic control', 'Flugverkehrskontrolle', 'Control aéreo')), opt('WITNESS', L('Témoin', 'Witness', 'Zeuge', 'Testigo')), opt('OTHER', L('Autre', 'Other', 'Andere', 'Otro'))];
  const personStatus = [opt('UNKNOWN', L('Inconnu', 'Unknown', 'Unbekannt', 'Desconocido')), opt('UNINJURED', L('Indemne', 'Uninjured', 'Unverletzt', 'Ileso')), opt('INJURED', L('Blessé', 'Injured', 'Verletzt', 'Herido')), opt('CRITICAL', L('État grave', 'Critical', 'Kritisch', 'Grave')), opt('DECEASED', L('Décédé', 'Deceased', 'Verstorben', 'Fallecido'))];
  const patterns = [
    opt('EXPANDING_SQUARE', L('Carré croissant', 'Expanding square', 'Quadratsuche', 'Cuadrado expansivo')), opt('SECTOR', L('Secteurs', 'Sector search', 'Sektorsuche', 'Búsqueda por sectores')),
    opt('PARALLEL_TRACK', L('Routes parallèles', 'Parallel track', 'Parallelsuche', 'Derrotas paralelas')), opt('CREEPING_LINE', L('Ligne rampante', 'Creeping line', 'Kriechende Linie', 'Línea progresiva')),
    opt('CONTOUR', L('Suivi de courbe de niveau', 'Contour search', 'Höhenliniensuche', 'Búsqueda por curvas de nivel')), opt('SHORELINE', L('Suivi de côte', 'Shoreline search', 'Küstenliniensuche', 'Búsqueda costera')),
    opt('ROUTE', L('Recherche sur route', 'Route search', 'Streckensuche', 'Búsqueda en ruta'))
  ];
  const contactTypes = [opt('VISUAL', L('Visuel', 'Visual', 'Sicht', 'Visual')), opt('EO_IR', L('EO/IR', 'EO/IR')), opt('RADAR', L('Radar', 'Radar')), opt('BEACON', L('Balise', 'Beacon', 'Bake', 'Baliza')), opt('AIS', L('AIS', 'AIS')), opt('RADIO', L('Radio', 'Radio')), opt('OTHER', L('Autre', 'Other', 'Andere', 'Otro'))];
  const identification = [opt('POSITIVE', L('Positive', 'Positive', 'Positiv', 'Positiva')), opt('NEGATIVE', L('Négative', 'Negative', 'Negativ', 'Negativa')), opt('UNCONFIRMED', L('Non confirmée', 'Unconfirmed', 'Unbestätigt', 'No confirmada'))];
  const recoveryMethods = [opt('HOIST', L('Treuillage', 'Hoist', 'Winde', 'Grúa')), opt('LANDING', L('Posé', 'Landing', 'Landung', 'Aterrizaje')), opt('SWIMMER', L('Nageur-sauveteur', 'Rescue swimmer', 'Rettungsschwimmer', 'Nadador de rescate')), opt('SURFACE_UNIT', L('Unité de surface guidée', 'Surface unit vectored', 'Eingewiesene Überwassereinheit', 'Unidad de superficie guiada')), opt('GROUND_TEAM', L('Équipe au sol guidée', 'Ground team vectored', 'Eingewiesene Bodenmannschaft', 'Equipo de tierra guiado')), opt('NONE', L('Aucune', 'None', 'Keine', 'Ninguna'))];

  const SAR = window.MissionCore.registerFamily({
    id: 'SAR', idPrefix: 'SAR',
    pages: { cr: 'sar_cr.html', reporting: 'sar_reporting.html' },
    title: L('SAR / récupération de personnel', 'SAR / personnel recovery', 'SAR / Personalrettung', 'SAR / recuperación de personal'),
    series: [
      { value: 'SAR-LAND', label: L('SAR terrestre', 'Land SAR', 'SAR an Land', 'SAR terrestre'), subtypes: [L('Personne disparue', 'Missing person', 'Vermisste Person', 'Persona desaparecida'), L('Aéronef disparu', 'Missing aircraft', 'Vermisstes Luftfahrzeug', 'Aeronave desaparecida'), L('Véhicule', 'Vehicle', 'Fahrzeug', 'Vehículo'), L('Groupe isolé', 'Isolated group', 'Isolierte Gruppe', 'Grupo aislado'), L('Montagne', 'Mountain', 'Gebirge', 'Montaña'), L('Désert', 'Desert', 'Wüste', 'Desierto'), L('Forêt', 'Forest', 'Wald', 'Bosque')] },
      { value: 'SAR-MARITIME', label: L('SAR maritime', 'Maritime SAR', 'Seenotrettung', 'SAR marítimo'), subtypes: [L('Homme à la mer', 'Man overboard', 'Mann über Bord', 'Hombre al agua'), L('Navire disparu', 'Missing vessel', 'Vermisstes Schiff', 'Buque desaparecido'), L('Embarcation en détresse', 'Craft in distress', 'Boot in Seenot', 'Embarcación en peligro'), L('Naufrage', 'Shipwreck', 'Schiffbruch', 'Naufragio'), L('Balise EPIRB', 'EPIRB beacon', 'EPIRB-Bake', 'Radiobaliza EPIRB'), L('Balise PLB', 'PLB beacon', 'PLB-Bake', 'Radiobaliza PLB'), L('Aéronef tombé en mer', 'Aircraft ditched at sea', 'Luftfahrzeug auf See notgewassert', 'Aeronave amerizada')] },
      { value: 'SAR-AIRCRAFT', label: L('Recherche d’aéronef', 'Aircraft search', 'Luftfahrzeugsuche', 'Búsqueda de aeronave') },
      { value: 'PR', label: L('Récupération de personnel (PR)', 'Personnel recovery (PR)', 'Personalrettung (PR)', 'Recuperación de personal (PR)') },
      { value: 'CSAR', label: L('CSAR (contexte militaire)', 'CSAR (military context)', 'CSAR (militärischer Kontext)', 'CSAR (contexto militar)') }
    ],
    // État de mer, nageurs… : seulement pour la série maritime.
    flags: mission => ({ maritime: mission.series === 'SAR-MARITIME' }),
    events: [
      opt('SEARCH_START', L('Début de recherche', 'Search start', 'Suchbeginn', 'Inicio de búsqueda')), opt('SEARCH_END', L('Fin de recherche', 'Search end', 'Suchende', 'Fin de búsqueda')),
      opt('BEACON_DETECTED', L('Balise détectée', 'Beacon detected', 'Bake geortet', 'Baliza detectada')), opt('SURVIVOR_LOCATED', L('Survivant localisé', 'Survivor located', 'Überlebender geortet', 'Superviviente localizado')),
      opt('SURVIVOR_RECOVERED', L('Survivant récupéré', 'Survivor recovered', 'Überlebender geborgen', 'Superviviente recuperado')), opt('SAR_KIT_DROPPED', L('Kit SAR largué', 'SAR kit dropped', 'SAR-Kit abgeworfen', 'Kit SAR lanzado'))
    ],
    blocks: [
      {
        id: 'sar-alert', title: L('Alerte et coordination SAR', 'SAR alert and coordination', 'SAR-Alarmierung und Koordination', 'Alerta y coordinación SAR'),
        fields: [
          f(P + 'rcc', L('RCC / MRCC', 'RCC / MRCC')), f(P + 'sarNumber', L('Numéro SAR', 'SAR number', 'SAR-Nummer', 'Número SAR'), 'text', { upper: true }),
          f(P + 'alertSource', L('Source de l’alerte', 'Alert source', 'Alarmquelle', 'Origen de la alerta'), 'select', { options: alertSources, blank: true }),
          f(P + 'alertTime', L('Heure d’alerte', 'Alert time', 'Alarmzeit', 'Hora de la alerta'), 'time'),
          f(P + 'beaconType', L('Balise', 'Beacon', 'Bake', 'Radiobaliza'), 'select', { options: beaconTypes, blank: true }),
          f(P + 'beaconFrequency', L('Fréquence balise', 'Beacon frequency', 'Bakenfrequenz', 'Frecuencia de la baliza'), 'text', { placeholder: L('406 MHz / 121.5', '406 MHz / 121.5') }),
          f(P + 'datum', L('Datum initial (coordonnées)', 'Initial datum (coordinates)', 'Ausgangsdatum (Koordinaten)', 'Datum inicial (coordenadas)')),
          f(P + 'lkp', L('Dernière position connue (LKP)', 'Last known position (LKP)', 'Letzte bekannte Position (LKP)', 'Última posición conocida (LKP)')),
          f(P + 'lkpTime', L('Heure LKP', 'LKP time', 'LKP-Zeit', 'Hora LKP'), 'time')
        ]
      },
      {
        id: 'sar-persons', title: L('Personnes recherchées', 'Persons sought', 'Gesuchte Personen', 'Personas buscadas'),
        collection: {
          path: P + 'persons', min: 0, compact: true, item: L('Groupe', 'Group', 'Gruppe', 'Grupo'), add: L('+ Ajouter des personnes', '+ Add persons', '+ Personen hinzufügen', '+ Añadir personas'),
          empty: () => ({ count: 1, description: '', status: 'UNKNOWN' }),
          fields: [
            f('count', L('Nombre', 'Number', 'Anzahl', 'Número'), 'number'), f('status', L('État présumé', 'Presumed condition', 'Vermuteter Zustand', 'Estado presunto'), 'select', { options: personStatus }),
            f('description', L('Description (anonymisée)', 'Description (anonymised)', 'Beschreibung (anonymisiert)', 'Descripción (anonimizada)'), 'text', { full: true })
          ]
        }
      },
      {
        id: 'sar-search', title: L('Zones et schémas de recherche', 'Search areas and patterns', 'Suchgebiete und Suchmuster', 'Zonas y patrones de búsqueda'),
        collection: {
          path: P + 'searchAreas', min: 0, compact: true, item: L('Zone de recherche', 'Search area', 'Suchgebiet', 'Zona de búsqueda'), add: L('+ Ajouter une zone', '+ Add search area', '+ Suchgebiet hinzufügen', '+ Añadir zona'),
          empty: () => ({ name: '', pattern: '', trackSpacingNm: null, altitudeFt: null, speedKt: null, visibility: '', cloud: '', start: '', end: '', coveragePct: null }),
          fields: [
            f('name', L('Zone', 'Area', 'Gebiet', 'Zona')), f('pattern', L('Schéma', 'Pattern', 'Suchmuster', 'Patrón'), 'select', { options: patterns, blank: true }),
            f('trackSpacingNm', L('Espacement (NM)', 'Track spacing (NM)', 'Bahnabstand (NM)', 'Separación (NM)'), 'number'), f('altitudeFt', L('Altitude (ft)', 'Altitude (ft)', 'Höhe (ft)', 'Altitud (ft)'), 'number'),
            f('speedKt', L('Vitesse (kt)', 'Speed (kt)', 'Geschwindigkeit (kt)', 'Velocidad (kt)'), 'number'), f('visibility', L('Visibilité', 'Visibility', 'Sicht', 'Visibilidad')),
            f('cloud', L('Couverture nuageuse', 'Cloud cover', 'Bewölkung', 'Nubosidad')), f('coveragePct', L('Couverture (%)', 'Coverage (%)', 'Abdeckung (%)', 'Cobertura (%)'), 'number'),
            f('start', L('Début', 'Start', 'Beginn', 'Inicio'), 'time'), f('end', L('Fin', 'End', 'Ende', 'Fin'), 'time')
          ]
        }
      },
      {
        id: 'sar-contacts', title: L('Contacts détectés', 'Contacts detected', 'Erfasste Kontakte', 'Contactos detectados'),
        collection: {
          path: P + 'contacts', min: 0, compact: true, item: L('Contact', 'Contact', 'Kontakt', 'Contacto'), add: L('+ Ajouter un contact', '+ Add contact', '+ Kontakt hinzufügen', '+ Añadir contacto'),
          empty: () => ({ time: '', position: '', type: '', identification: 'UNCONFIRMED', description: '' }),
          fields: [
            f('time', L('Heure', 'Time', 'Zeit', 'Hora'), 'time'), f('position', L('Position', 'Position', 'Position', 'Posición')),
            f('type', L('Détection', 'Detection', 'Erfassung', 'Detección'), 'select', { options: contactTypes, blank: true }), f('identification', L('Identification', 'Identification', 'Identifizierung', 'Identificación'), 'select', { options: identification }),
            f('description', L('Description', 'Description', 'Beschreibung', 'Descripción'), 'text', { full: true })
          ]
        }
      },
      {
        id: 'sar-recovery', title: L('Localisation et récupération', 'Location and recovery', 'Ortung und Rettung', 'Localización y recuperación'),
        fields: [
          f(P + 'personsLocated', L('Personnes localisées', 'Persons located', 'Geortete Personen', 'Personas localizadas'), 'number'),
          f(P + 'personsRecovered', L('Personnes récupérées', 'Persons recovered', 'Gerettete Personen', 'Personas recuperadas'), 'number'),
          f(P + 'recoveryMethod', L('Méthode de récupération', 'Recovery method', 'Rettungsmethode', 'Método de recuperación'), 'select', { options: recoveryMethods, blank: true }),
          f(P + 'swimmerDeployed', L('Nageurs déployés', 'Swimmers deployed', 'Eingesetzte Rettungsschwimmer', 'Nadadores desplegados'), 'number', { when: ctx => maritime(ctx) || ctx.mission.missionData?.sar?.recoveryMethod === 'SWIMMER' }),
          f(P + 'handoverTo', L('Transfert vers (unité médicale…)', 'Handed over to (medical unit…)', 'Übergabe an (Sanitätseinheit…)', 'Transferido a (unidad médica…)')),
          f(P + 'survivorsDestination', L('Destination des survivants', 'Survivors’ destination', 'Ziel der Überlebenden', 'Destino de los supervivientes'), 'text', { upper: true })
        ]
      },
      {
        // ROTARY + HOIST → bloc treuil (§23)
        id: 'sar-hoist', title: L('Treuillage', 'Hoist operations', 'Windeneinsatz', 'Operaciones de grúa'),
        when: ctx => ctx.categories.has('rotary') && ctx.capabilities.has('HOIST'),
        fields: [
          f(P + 'hoist.cycles', L('Cycles de treuil', 'Hoist cycles', 'Windenzyklen', 'Ciclos de grúa'), 'number'),
          f(P + 'hoist.personsHoisted', L('Personnes treuillées', 'Persons hoisted', 'Gewindete Personen', 'Personas izadas'), 'number'),
          f(P + 'hoist.maxHeightFt', L('Hauteur max. (ft)', 'Max. height (ft)', 'Max. Höhe (ft)', 'Altura máx. (ft)'), 'number'),
          f(P + 'hoist.notes', L('Observations treuil', 'Hoist remarks', 'Bemerkungen Winde', 'Observaciones de grúa'), 'textarea', { full: true })
        ]
      },
      {
        // FIXED WING + AIRDROP → bloc largage de kit SAR (§23)
        id: 'sar-kit', title: L('Largage de kit SAR', 'SAR kit drop', 'SAR-Kit-Abwurf', 'Lanzamiento de kit SAR'),
        when: ctx => (ctx.categories.has('fixed') || ctx.categories.has('amphibious')) && ctx.capabilities.has('AIRDROP'),
        fields: [
          f(P + 'kit.count', L('Kits largués', 'Kits dropped', 'Abgeworfene Kits', 'Kits lanzados'), 'number'),
          f(P + 'kit.type', L('Type de kit (radeau, survie…)', 'Kit type (life raft, survival…)', 'Kit-Art (Rettungsinsel, Überleben…)', 'Tipo de kit (balsa, supervivencia…)')),
          f(P + 'kit.time', L('Heure de largage', 'Drop time', 'Abwurfzeit', 'Hora de lanzamiento'), 'time'),
          f(P + 'kit.position', L('Position de largage', 'Drop position', 'Abwurfposition', 'Posición de lanzamiento')),
          f(P + 'kit.result', L('Résultat du largage', 'Drop result', 'Abwurfergebnis', 'Resultado del lanzamiento'))
        ]
      }
    ],
    // Statistiques SAR (§20)
    stats: [
      { id: 'searches', label: L('Zones de recherche', 'Search areas', 'Suchgebiete', 'Zonas de búsqueda'), value: ms => ms.reduce((a, m) => a + (m.missionData?.sar?.searchAreas || []).filter(z => z.name || z.pattern).length, 0) },
      { id: 'located', label: L('Personnes localisées', 'Persons located', 'Geortete Personen', 'Personas localizadas'), value: ms => ms.reduce((a, m) => a + (Number(m.missionData?.sar?.personsLocated) || 0), 0) },
      { id: 'rescued', label: L('Personnes secourues', 'Persons rescued', 'Gerettete Personen', 'Personas rescatadas'), value: ms => ms.reduce((a, m) => a + (Number(m.missionData?.sar?.personsRecovered) || 0), 0) },
      { id: 'hoists', label: L('Treuillages', 'Hoists', 'Windeneinsätze', 'Izados'), value: ms => ms.reduce((a, m) => a + (window.MissionModel.blockVisible(m, SAR, 'sar-hoist') ? Number(m.missionData?.sar?.hoist?.cycles) || 0 : 0), 0) },
      { id: 'kits', label: L('Kits SAR largués', 'SAR kits dropped', 'Abgeworfene SAR-Kits', 'Kits SAR lanzados'), value: ms => ms.reduce((a, m) => a + (window.MissionModel.blockVisible(m, SAR, 'sar-kit') ? Number(m.missionData?.sar?.kit?.count) || 0 : 0), 0) }
    ],
    // Résumé automatique SAR (§22) — ex. « SAR maritime de 02:14 réalisée par … ».
    summary: (() => {
      const build = w => h => {
        const m = h.mission, sar = m.missionData?.sar || {}, t = m.timeline, s = h.stats;
        const zone = (sar.searchAreas || []).map(z => z.name).filter(Boolean)[0] || m.navigation?.area;
        const firstContact = (sar.contacts || []).filter(c => c.time).sort((a, b) => a.time.localeCompare(b.time))[0];
        const located = Number(sar.personsLocated) || 0, recovered = Number(sar.personsRecovered) || 0;
        return h.sentence(
          `${h.series || 'SAR'}${s.missionMinutes != null ? ` ${w.of} ${h.duration(s.missionMinutes)}` : ''}${h.date ? ` ${w.on} ${h.date}` : ''}`,
          h.aircraft.length && `${w.by} ${h.list(h.aircraft, w.and)}`, h.lead.baseDeparture && `${w.from} ${h.lead.baseDeparture}`, '.',
          zone && `${w.area} ${zone}.`, firstContact && `${w.contact} ${firstContact.time}.`,
          (located || recovered) && `${w.located(located)}, ${w.recovered(recovered)}.`,
          h.visible('sar-hoist') && sar.hoist?.cycles && `${w.hoists(sar.hoist.cycles)}.`,
          t.landing && `${w.back} ${h.lead.baseReturn || h.lead.baseDeparture || ''} ${w.at} ${t.landing}.`,
          s.flightMinutes != null && `${w.flight} ${h.duration(s.flightMinutes)}${s.timeOnStationMinutes != null ? `, ${w.station} ${h.duration(s.timeOnStationMinutes)}` : ''}.`,
          h.outcome && `${w.outcome} ${h.outcome}.`);
      };
      const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;
      return {
        fr: build({ of: 'de', on: 'du', by: 'réalisée par', and: 'et', from: 'depuis', area: 'Zone de recherche :', contact: 'Contact établi à', located: n => plural(n, 'personne localisée', 'personnes localisées'), recovered: n => n ? plural(n, 'récupération effectuée', 'récupérations effectuées') : 'aucune récupération', hoists: n => plural(n, 'cycle de treuil', 'cycles de treuil'), back: 'Retour', at: 'à', flight: 'Temps de vol', station: 'temps sur zone', outcome: 'Résultat :' }),
        en: build({ of: 'of', on: 'on', by: 'flown by', and: 'and', from: 'from', area: 'Search area:', contact: 'Contact established at', located: n => plural(n, 'person located', 'persons located'), recovered: n => n ? plural(n, 'recovery performed', 'recoveries performed') : 'no recovery', hoists: n => plural(n, 'hoist cycle', 'hoist cycles'), back: 'Return to', at: 'at', flight: 'Flight time', station: 'time on station', outcome: 'Outcome:' }),
        de: build({ of: 'von', on: 'am', by: 'durchgeführt mit', and: 'und', from: 'ab', area: 'Suchgebiet:', contact: 'Kontakt hergestellt um', located: n => plural(n, 'Person geortet', 'Personen geortet'), recovered: n => n ? plural(n, 'Rettung durchgeführt', 'Rettungen durchgeführt') : 'keine Rettung', hoists: n => plural(n, 'Windenzyklus', 'Windenzyklen'), back: 'Rückkehr nach', at: 'um', flight: 'Flugzeit', station: 'Zeit im Einsatzraum', outcome: 'Ergebnis:' }),
        es: build({ of: 'de', on: 'del', by: 'realizada por', and: 'y', from: 'desde', area: 'Zona de búsqueda:', contact: 'Contacto establecido a las', located: n => plural(n, 'persona localizada', 'personas localizadas'), recovered: n => n ? plural(n, 'recuperación efectuada', 'recuperaciones efectuadas') : 'ninguna recuperación', hoists: n => plural(n, 'ciclo de grúa', 'ciclos de grúa'), back: 'Regreso a', at: 'a las', flight: 'Tiempo de vuelo', station: 'tiempo en zona', outcome: 'Resultado:' })
      };
    })()
  });
})();
