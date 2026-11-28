// Meta du module report (SOG-0728) : ce que le cadre lit SANS ouvrir le module — niveau, vue fixe, titre, fichiers, droits de lecture et
// d'écriture, lanceur, hôtes. Des littéraux et des fonctions PURES : aucun import, aucun accès à window, document, au stockage ni au
// réseau. module.js l'importe et la ré-exporte (frame/DECISIONS.md, SOG-0728).

export const meta = {
  id: 'report',
  title: ['Compte rendu', 'Mission report', 'Einsatzbericht', 'Informe de misión'], // en-tête du téléphone (règle 16)
  apps: ['pilot'],
  level: 1,
  reads: ['cr/', 'pilot/', 'cache/report/', 'airline/',
    'missions/'
  ], // airline/ : les catégories de la compagnie (SOG-0041) ; missions/ :
  // le registre et le fichier de la mission du vol, lus pour recalculer les paliers des posés de précision (SOG-0516)
  // « Mesures » (§ 10.37 A étape 3) : les journaux du dossier Output du poste par le travail stats/output d'AeroDB
  launcher: {
    routes: ['regen/job', 'regen/job/cancel'],
    read: []
  },
  writes: [{
    prefix: 'cr/reports/',
    merge: 'record'
  }, {
    prefix: 'pilot/', // le vol courant : started et progress remis à null quand le CR d'un vol démarré est enregistré
    merge: 'record'
  }, {
    prefix: 'cache/report/',
    policy: 'cache'
  }, {
    prefix: 'pilot/handoff.json',
    policy: 'cache'
  }],
  files: ['meta.js', 'vocab.js', 'model.js', 'fpl.js', 'text_import.js', '../stats/phases.js', '../stats/journals.js',
    '../../frame/lib/last_flight.js', '../../frame/lib/current_flight.js', '../../frame/lib/mission_categories.js',
    '../../frame/lib/mission_themes.js', '../../frame/lib/airline.js',
    '../../frame/lib/mission.js', '../../frame/lib/mission_events.js', // mission_events.js : importé par mission.js (SOG-0620 ; I26)
    '../../frame/lib/adnames.js', '../../frame/lib/untrusted.js', // importés par mission.js (cas I26 ; Création, 18/11)
    '../../frame/lib/precision.js', '../../frame/lib/crossing.js',
    '../../frame/lib/geo.js', // SOG-0516 : precision.js et ce qu'il importe (I26)
    '../../frame/lib/js-yaml.min.js', // SOG-0516 : le registre et la mission sont en YAML (chargé à la demande)
    '../../frame/lib/flight_time.js',
    '../../frame/lib/flight_path.js',
    '../../frame/lib/geo.js', // importé par current_flight.js et flight_path.js (cas I26)
    '../../frame/lib/procedures.js',
    '../../frame/lib/route_text.js',
    '../../frame/lib/website.js',
    'families/aar.js', 'families/commercial.js', '../../frame/lib/mission_themes.js',
    'families/airborne.js', 'families/airlift.js', 'families/combat.js', 'families/command.js', 'families/fire.js',
    'families/flight_inspection.js', 'families/hadr.js', 'families/hems.js', 'families/isr.js', 'families/law_enforcement.js',
    'families/maritime.js', 'families/sar.js', 'families/sof.js', 'families/special.js', 'families/survey.js', '../../frame/lib/dom.js',
    '../../frame/lib/clipboard.js', '../../frame/lib/time.js'
  ]
};
