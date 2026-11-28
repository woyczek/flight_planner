// Meta du module aircraft (SOG-0728) : ce que le cadre lit SANS ouvrir le module — niveau, vue fixe, titre, fichiers, droits de lecture et
// d'écriture, lanceur, hôtes. Des littéraux et des fonctions PURES : aucun import, aucun accès à window, document, au stockage ni au
// réseau. module.js l'importe et la ré-exporte (frame/DECISIONS.md, SOG-0728).

export const meta = {
  id: 'aircraft',
  // SOG-0231 (l'utilisateur, 10 nov. : « 2 entrées » de Compagnie) : la Flotte s'ouvre aussi depuis Compagnie (#aircraft?view=fleet),
  // les Fiches restent dans Maintenance (#aircraft?view=sheets) ; les entrées sont celles du cadre (frame/app.js APPS)
  apps: ['maintenance', 'company'],
  level: 3,
  title: ['Aéronefs', 'Aircraft', 'Luftfahrzeuge', 'Aeronaves'],
  files: ['meta.js', 'fleet.js', 'registry_read.js', 'sheets.js', 'sheets_texts.js', 'perf_prompt.js', '../fuel/suggest.js',
    '../../frame/lib/suggest_list.js', '../../frame/lib/ad_field.js', '../../frame/lib/adnames.js',
    '../../frame/lib/text.js', // SOG-0490 : la base d'un appareil
    '../../frame/lib/clipboard.js',
    '../../frame/lib/dom.js', '../../frame/lib/fuel_units.js', '../stats/phases.js', '../stats/journals.js',
    '../../frame/lib/mission_categories.js', '../../frame/lib/airline.js'
  ],
  // titre lisible d'un document en attente de synchronisation (la carte Synchronisation des Réglages, Simplification 1er nov. 2026) :
  // une fiche (aircraft/sheets/<id>.json) ou la flotte ; [fr, en, de, es], ou null (valeur absente ou illisible) ; pur, sans lecture
  titleOf: (path, v) => {
    const m = /^aircraft\/sheets\/([^/]+)\.json$/.exec(path);
    if (m) {
      if (!v || typeof v !== 'object') return null;
      const n = String(v.name || v.id || m[1]);
      return [`Fiche ${n}`, `Sheet ${n}`, `Datenblatt ${n}`, `Ficha ${n}`];
    }
    // la flotte de la compagnie courante (§ 10.38) : airline/fleet.json, airline/<code>/fleet.json ou celle de « personnel »
    if (!/^(airline\/([a-z0-9]{2,8}\/)?|pilot\/[^/]+\/airline\/perso\/)fleet\.json$/.test(path) || !Array.isArray(v?.aircraft))
      return null;
    const n = v.aircraft.length;
    return [`Flotte de la compagnie (${n} aéronefs)`, `Airline fleet (${n} aircraft)`, `Flotte der Gesellschaft (${n} Luftfahrzeuge)`,
      `Flota de la compañía (${n} aeronaves)`
    ];
  },
  // SOG-0341 : registry/ — le registre français publié (environ 3 Mo), lu à la demande (politique « reference »), seulement sans lanceur
  reads: ['airline/', 'pilot/', 'cache/aircraft/', {
    prefix: 'registry/',
    policy: 'reference'
  }],
  // « Depuis le dossier Output » (SOG-0052 étape 2) : le travail stats/output d'AeroDB (status, set, clear, read), comme fetchProcedures
  launcher: {
    routes: ['regen/job', 'regen/job/cancel'],
    read: []
  },
  // la flotte de la compagnie courante (§ 10.38) : airline/<code>/fleet.json, ou pilot/<trigramme>/airline/perso/fleet.json pour
  // « personnel » ; mêmes préfixes et même fusion que Réglages (airline/) et Carburant (pilot/)
  writes: [{
    prefix: 'airline/',
    merge: 'record'
  }, {
    prefix: 'pilot/',
    merge: 'record'
  }, {
    prefix: 'cache/aircraft/',
    policy: 'cache'
  }]
};
