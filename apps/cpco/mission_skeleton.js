// Squelette de mission sans ChatGPT (générateur, « Créer le squelette ici ») : les réglages du formulaire de commande
// (shared/mission_order.js, MissionOrder.requestOf — les mêmes que ceux du prompt) donnent des missions complètes mais
// vides de récit, au format du prompt (docs/technique/PROMPT_GENERATEUR_MISSIONS.md § 4) : une mission par équipe en
// vol (aéronef et indicatif pris dans la flotte), terrains de la base de l'aéronef, cible, points tournants,
// rendez-vous, zone et ravitaillement à placer, timing estimé d'après la durée, cartes attendues ; mission
// d'organisation …Z (heure H, participants, chronologie vide) pour un exercice coordonné.
// API : MissionSkeleton.build(request, slots, { fleet, airport(icao) → { name, lat, lon } | null, aarTracks }) → docs
//       [{ yaml, narrative }] · MissionSkeleton.todo(yaml) → { points, texts } (ce qui reste à compléter)
(() => {
  /** Minutes de vol estimées par taille de durée (milieu de la fourchette du prompt). */
  const MINUTES = {
    XS: 40,
    S: 70,
    M: 135,
    L: 240,
    XL: 390
  };
  const THEATRES = ['métropole', 'Corse', 'Antilles', 'Guyane', 'Réunion', 'Mayotte', 'Nouvelle-Calédonie', 'Polynésie'];
  /** Élément au hasard d'une liste (undefined si vide). */
  const pick = a => a.length ? a[Math.floor(Math.random() * a.length)] : undefined;
  /** Point à placer : nom et rôle remplis, coordonnées vides. */
  const spot = (id, name, role, tot = 0) => ({
    id,
    name,
    lat: null,
    lon: null,
    role,
    time_on_task_min: tot
  });
  /** Ligne de la flotte d'un réglage d'équipe : « TYPE VARIANTE — INDICATIF » (liste du formulaire), type seul, ou vide
   *  (automatique : un appareil de la flotte pas encore pris). */
  function aircraftFor(slot, fleet, used) {
    const v = String(slot || '').trim(),
      tail = v.split(' — ')[1]?.trim().toUpperCase(),
      code = window.MissionEstimate?.designator?.(v) || '';
    let row = tail ? fleet.find(r => [r.callsign, r.registration, r.code].some(x => String(x || '').toUpperCase() === tail)) : null;
    if (!row && code) row = fleet.find(r => r.type === code && !used.has(r)) || fleet.find(r => r.type === code);
    if (!row && !v) row = pick(fleet.filter(r => r.operational !== false && !used.has(r))) || pick(fleet);
    if (row) used.add(row);
    return {
      row,
      type: row ? `${row.type}${row.variant && row.variant !== row.type ? ' ' + row.variant : ''}` : v.replace(/\s+—.*$/, ''),
      callsign: row?.callsign || (tail && !row ? tail : '')
    };
  }
  /** Terrain { name: « Nom (OACI) », lat, lon } d'après le code OACI (base de l'aéronef) ; à compléter sinon. */
  async function field(icao, airport) {
    if (!icao) return {
      name: '',
      lat: null,
      lon: null
    };
    let a = null;
    try {
      a = airport ? await airport(icao) : null
    } catch {
      a = null // terrain introuvable : à compléter
    }
    return a ? {
      name: `${a.name || icao} (${icao})`,
      lat: +a.lat,
      lon: +a.lon
    } : {
      name: `(${icao})`,
      lat: null,
      lon: null
    };
  }
  /** Missions du squelette (et organisation …Z si exercice) d'après la commande request et les aéronefs slots. */
  async function build(request, slots = [], {
    fleet = window.DEFA_FLEET || [],
    airport = null,
    aarTracks = []
  } = {}) {
    const fams = window.MissionOrder?.families?.() || [],
      type = request.type && request.type !== 'aléatoire' ? request.type : pick(fams.map(f => f.id)) || 'SAR',
      fam = fams.find(f => f.id === type),
      subtype = request.subtype && request.subtype !== 'libre' ? request.subtype : pick(fam?.subtypes || []) || '',
      theatre = request.theatre && !/aléatoire/.test(request.theatre) ? request.theatre : pick(THEATRES),
      n = window.SiaMission.nextNumbering(type),
      base = n.id || request.id || 'X-001',
      serie = +request.serie || n.serie || 1,
      number = window.SiaMission.parseId(base).num ?? 1,
      teams = Math.max(1, Math.min(5, +request.teams || 1)),
      ids = teams > 1 ? Array.from({
        length: teams
      }, (_, i) => base + String.fromCharCode(65 + i)) : [base],
      exercise = request.exercise === 'oui',
      zId = exercise ? window.MissionExercise?.organisationId?.(base) || base + 'Z' : '',
      minutes = MINUTES[request.duration] || 90,
      used = new Set(),
      crews = ids.map((id, i) => ({
        id,
        ac: aircraftFor(slots[i], fleet, used)
      })),
      callsigns = crews.map(c => c.ac.callsign).filter(Boolean),
      track = request.aar === 'oui' ? pick(aarTracks) : null,
      ground = Math.max(0, +request.ground || 0),
      today = new Date().toISOString().slice(0, 10),
      docs = [];
    for (const [i, c] of crews.entries()) {
      const home = await field(c.ac.row?.base, airport),
        rdvs = request.rdv === 'avec' ? [{
          id: 'RDV-1',
          name: '',
          lat: null,
          lon: null,
          participants: callsigns.length > 1 ? callsigns : [c.ac.callsign || c.id],
          role: 'jonction',
          time_on_task_min: 10
        }] : [],
        pts = [spot('PT1', 'Point d’entrée', 'aller'), spot('PT2', 'Point de sortie', 'retour')];
      // ravitaillement planifié : axe AAR de la base (ARIP / ARCP placés), rendez-vous à l'ARIP (§ 7 du prompt)
      if (request.aar === 'oui') {
        const ip = track?.ip,
          cp = track?.cp,
          name = track?.name || '';
        pts.splice(1, 0, {
          ...spot('ARIP', `${name} ARIP`.trim(), 'ravitaillement : entrée'),
          ...(ip ? {
            lat: +ip.lat,
            lon: +ip.lon
          } : {})
        }, {
          ...spot('ARCP', `${name} ARCP`.trim(), 'ravitaillement : contact'),
          ...(cp ? {
            lat: +cp.lat,
            lon: +cp.lon
          } : {})
        });
        rdvs.push({
          id: 'RDV-AAR',
          name: `${name} ARIP`.trim(),
          lat: ip ? +ip.lat : null,
          lon: ip ? +ip.lon : null,
          participants: [c.ac.callsign || c.id],
          role: 'ravitaillement en vol',
          time_on_task_min: 20
        })
      }
      const zone = {
        id: 'ZONE-1',
        name: '',
        kind: 'mission',
        centre: {
          lat: null,
          lon: null
        },
        radius_km: 10,
        role: 'zone de travail',
        time_on_task_min: 30
      };
      const maps = [{
        id: 'general',
        filename: `general${c.id}.png`,
        type: 'general',
        description: 'Vue d’ensemble : départ, points tournants, cible, rendez-vous, zone, arrivée.',
        include: {
          origin: true,
          destination: true,
          turning_points: true,
          target: true,
          rendezvous: true,
          zones: true
        }
      }, {
        id: 'cible',
        filename: `cible${c.id}.png`,
        type: 'target',
        centre_ref: 'TARGET',
        range_km: 50,
        description: 'Abords de la cible (50 km).'
      }, {
        id: 'detail_cible',
        filename: `detail_cible${c.id}.png`,
        type: 'detail',
        centre_ref: 'TARGET',
        width_km: 8,
        height_km: 5,
        description: 'Détail de la cible (8 × 5 km).'
      }, ...rdvs.map((r, k) => ({
        id: `detail_rdv_${k + 1}`,
        filename: `detail_rdv${c.id}-${k + 1}.png`,
        type: 'detail_rdv',
        centre_ref: r.id,
        width_km: 8,
        height_km: 5,
        description: `Détail du rendez-vous ${r.id} (8 × 5 km).`
      })), {
        id: 'zone_1',
        filename: `zone${c.id}.png`,
        type: 'zone',
        centre_ref: 'ZONE-1',
        range_km: 20,
        description: 'Zone de travail ZONE-1.'
      }];
      docs.push({
        yaml: {
          schema: 'helo-xp-mission',
          schema_version: '2.0',
          mission: {
            series: serie,
            number,
            id: c.id,
            type,
            subtype,
            theatre
          },
          operation: {
            id: base,
            name: '',
            missions: ids,
            ...(zId ? {
              organisation: zId
            } : {})
          },
          title: '',
          summary: '',
          detailed_description: '',
          author: '',
          date: today,
          aircraft: [{
            id: 'AC1',
            type: c.ac.type,
            callsign: c.ac.callsign,
            operator: c.ac.row?.operator || '',
            role: ''
          }],
          origin: home,
          destination: {
            ...home
          },
          target: {
            id: 'TARGET',
            name: '',
            lat: null,
            lon: null,
            time_on_task_min: 20
          },
          turning_points: pts,
          rendezvous: rdvs,
          zones: [zone],
          route_order: ['ORIGIN', 'PT1', ...(request.aar === 'oui' ? ['ARIP', 'ARCP'] : []), ...rdvs.filter(r => r.id === 'RDV-1')
            .map(r => r
              .id), 'TARGET', 'ZONE-1', 'PT2', 'DESTINATION'
          ],
          timing: {
            estimated_flight_min: minutes,
            estimated_block_min: minutes + 20
          },
          teams: [...crews.map(x => ({
            name: x.ac.callsign || x.id,
            service: x.ac.row?.operator || '',
            department: '',
            type: x.ac.type,
            role: x.id === c.id ? 'équipage' : 'autre équipage'
          })), ...Array.from({
            length: ground
          }, (_, k) => ({
            name: '',
            service: '',
            department: '',
            type: 'équipe au sol',
            role: `équipe au sol ${k + 1}`
          }))],
          objectives: {
            primary: '',
            secondary: []
          },
          risks: [],
          ...(request.aar === 'oui' ? {
            air_refueling: {
              capable: true,
              planned: true,
              role: type === 'AAR' && i === 0 ? 'tanker' : 'receiver',
              track: track?.name || ''
            }
          } : {}),
          maps,
          rendering: {
            north_up: true,
            draw_routes: false,
            add_markers: false,
            attribution_required: true
          },
          notes: [],
          meta: {
            skeleton: true,
            created_at: new Date().toISOString()
          }
        },
        narrative: {
          summary: '',
          detailed: '',
          sections: [{
            title: 'Introduction',
            content: ''
          }, {
            title: 'Chronologie',
            content: ''
          }]
        }
      });
    }
    // exercice coordonné : mission d'organisation …Z, heure H, participants, chronologie d'événements vides
    if (zId) {
      const hText = window.RepositoryKit?.hText || (m => `H+${m}`),
        steps = Math.min(12, Math.max(2, Math.floor(minutes / 15) + 1));
      docs.push({
        yaml: {
          schema: 'helo-xp-mission',
          schema_version: '2.0',
          mission: {
            series: serie,
            number,
            id: zId,
            type,
            subtype: 'EXERCICE',
            role: 'organisation'
          },
          operation: {
            id: base,
            name: '',
            missions: ids,
            organisation: zId
          },
          title: '',
          summary: '',
          detailed_description: '',
          author: '',
          date: today,
          exercise: {
            h_hour: 'H',
            participants: crews.map(c => ({
              callsign: c.ac.callsign || c.id,
              mission: c.id,
              takeoff: 'H',
              role: ''
            })),
            tracks: [],
            events: Array.from({
              length: steps
            }, (_, k) => ({
              id: `EV-${k + 1}`,
              at: hText(k * 15),
              kind: 'radio',
              from: '',
              to: ['ALL'],
              title: '',
              text: ''
            }))
          },
          maps: [],
          meta: {
            skeleton: true,
            created_at: new Date().toISOString()
          }
        },
        narrative: {
          summary: '',
          detailed: '',
          sections: []
        }
      })
    }
    return docs
  }
  /** Ce qui reste à compléter dans une mission : points sans coordonnées, textes vides (titre, résumé, description,
   *  objectif principal ; organisation : titre, résumé, événements sans titre). */
  function todo(y) {
    /** Vrai pour un point sans latitude utilisable. */
    const nopos = p => !(p.lat !== null && p.lat !== '' && p.lat !== undefined && Number.isFinite(+p.lat));
    const points = [y?.origin, y?.destination, y?.target, ...(y?.turning_points || []), ...(y?.rendezvous || [])].filter(p => p && nopos(
      p)).length + (y?.zones || []).filter(z => !z?.points?.length && (z?.centre?.lat === null || z?.centre?.lat === undefined)).length;
    const blank = v => !String(v ?? '').trim();
    const texts = y?.exercise ? [y.title, y.summary].filter(blank).length + (y.exercise.events || []).filter(e => blank(e.title)).length :
      [
        y?.title, y?.summary, y?.detailed_description, y?.objectives?.primary
      ].filter(blank).length;
    return {
      points,
      texts
    }
  }
  window.MissionSkeleton = {
    build,
    todo
  };
})();
