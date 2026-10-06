(() => {
  'use strict';
  // Flotte du jeu d'essai (tools/jeu_essai) : appareils des types utilisés par ses missions.
  // complétée à la main ou par la page Paramétrage. Colonnes : opérateur, type OACI, variante,
  // immatriculation, code (numéro tactique), numéro, indicatifs, base, opérationnel.
  // Édition : menu ☰ › Paramétrage › Bases de données (ou à la main : JSON, une ligne par élément).
  const META = {"updatedAt": "2026-10-06T12:00:00.000Z"};
  let data = {
  "rows": [
    {
      "operator": "Armée de l'Air et de l'Espace",
      "type": "RFAL",
      "variant": "Rafale B",
      "registration": "F-UHIB",
      "tacticalNumber": "30-IB",
      "number": "306",
      "callsigns": [],
      "base": "LFBM",
      "operational": true
    },
    {
      "operator": "Armée de l'Air et de l'Espace",
      "type": "RFAL",
      "variant": "Rafale B",
      "registration": "F-UHFP",
      "tacticalNumber": "4-FP",
      "number": "349",
      "callsigns": [],
      "base": "LFSI",
      "operational": true
    },
    {
      "operator": "Armée de l'Air et de l'Espace",
      "type": "RFAL",
      "variant": "Rafale C",
      "registration": "F-UHGC",
      "tacticalNumber": "30-GC",
      "number": "124",
      "callsigns": [],
      "base": "LFBM",
      "operational": true
    },
    {
      "operator": "Armée de l'Air et de l'Espace",
      "type": "MIR2",
      "variant": "Mirage 2000B",
      "registration": "F-UGJO",
      "tacticalNumber": "30-JO",
      "number": "627",
      "callsigns": [],
      "base": "LFBM",
      "operational": true
    },
    {
      "operator": "Armée de l'Air et de l'Espace",
      "type": "MIR2",
      "variant": "Mirage 2000B",
      "registration": "F-UGIE",
      "tacticalNumber": "30-IE",
      "number": "642",
      "callsigns": [],
      "base": "LFBM",
      "operational": true
    },
    {
      "operator": "Armée de l'Air et de l'Espace",
      "type": "A332",
      "variant": "A330 MRTT Phénix",
      "registration": "F-UJCR",
      "tacticalNumber": "",
      "number": "69",
      "callsigns": [],
      "base": "LFMI",
      "operational": true
    },
    {
      "operator": "Armée de l'Air et de l'Espace",
      "type": "A332",
      "variant": "A330 MRTT Phénix",
      "registration": "F-UJCH",
      "tacticalNumber": "",
      "number": "42",
      "callsigns": [],
      "base": "LFMI",
      "operational": true
    },
    {
      "operator": "Armée de l'Air et de l'Espace",
      "type": "E3CF",
      "variant": "",
      "registration": "F-UJCD",
      "tacticalNumber": "36-CD",
      "number": "204",
      "callsigns": [],
      "base": "LFOA",
      "operational": true
    },
    {
      "operator": "Armée de l'Air et de l'Espace",
      "type": "E3CF",
      "variant": "",
      "registration": "F-UJCC",
      "tacticalNumber": "36-CC",
      "number": "203",
      "callsigns": [],
      "base": "LFOA",
      "operational": true
    },
    {
      "operator": "Armée de l'Air et de l'Espace",
      "type": "EC25",
      "variant": "",
      "registration": "F-MCAF",
      "tacticalNumber": "CAF",
      "number": "2638",
      "callsigns": [],
      "base": "LFBP",
      "operational": true
    },
    {
      "operator": "Marine nationale",
      "type": "H160",
      "variant": "",
      "registration": "F-HMRE",
      "tacticalNumber": "",
      "number": "",
      "callsigns": [],
      "base": "LFRC",
      "operational": true
    },
    {
      "operator": "Armée de l'Air et de l'Espace",
      "type": "A400",
      "variant": "",
      "registration": "F-RBAX",
      "tacticalNumber": "",
      "number": "137",
      "callsigns": [],
      "base": "LFOJ",
      "operational": true
    }
  ]
};

  const fileData = data; // contenu du fichier (page Paramétrage : retour au fichier)
  // Modifications locales plus récentes que ce fichier (page Paramétrage, pas encore
  // enregistrées dans le dépôt) : prioritaires dans ce navigateur.
  try { const o = JSON.parse(localStorage.getItem('dataOverride:fleet:v1') || 'null'); if (o && o.updatedAt > META.updatedAt) data = o.data; } catch { /* stockage indisponible */ }
  window.DEFA_FLEET = data.rows.map(row => ({ ...row, callsign: (row.callsigns || [])[0] || '' })); window.DEFA_FLEET_META = META; window.DEFA_FLEET_FILE = fileData.rows;
})();
