(() => {
  'use strict';
  // Référence du jeu d'essai (tools/jeu_essai) : quatre pilotes fictifs (ALF, BRV, CHL, DLT) et les appareils de sa
  // flotte (immatriculation, type, terrain de rattachement). Base « lâche » : aide à la saisie, non exhaustive.
  // Édition : menu ☰ › Paramétrage › Bases de données (ou à la main : JSON, une ligne par élément).
  const META = {"updatedAt": "2026-10-06T12:00:00.000Z"};
  let data = {
  "pilots": [
    {
      "trigram": "ALF",
      "first": "2026-09-01",
      "last": "2026-10-01",
      "flights": 6,
      "types": [
        "RFAL",
        "MIR2"
      ]
    },
    {
      "trigram": "BRV",
      "first": "2026-09-01",
      "last": "2026-10-01",
      "flights": 6,
      "types": [
        "A332",
        "E3CF",
        "A400"
      ]
    },
    {
      "trigram": "CHL",
      "first": "2026-09-01",
      "last": "2026-10-01",
      "flights": 6,
      "types": [
        "EC25",
        "H160",
        "RFAL"
      ]
    },
    {
      "trigram": "DLT",
      "first": "2026-09-01",
      "last": "2026-10-01",
      "flights": 6,
      "types": [
        "MIR2",
        "A400",
        "H160"
      ]
    }
  ],
  "aircraft": [
    {
      "registration": "F-UHIB",
      "type": "RFAL",
      "variant": "Rafale B",
      "fleetId": "",
      "callsigns": [],
      "first": "2026-09-01",
      "last": "2026-10-01",
      "flights": 2,
      "lastAd": "LFBM",
      "homeAd": "LFBM"
    },
    {
      "registration": "F-UHFP",
      "type": "RFAL",
      "variant": "Rafale B",
      "fleetId": "",
      "callsigns": [],
      "first": "2026-09-01",
      "last": "2026-10-01",
      "flights": 2,
      "lastAd": "LFSI",
      "homeAd": "LFSI"
    },
    {
      "registration": "F-UHGC",
      "type": "RFAL",
      "variant": "Rafale C",
      "fleetId": "",
      "callsigns": [],
      "first": "2026-09-01",
      "last": "2026-10-01",
      "flights": 2,
      "lastAd": "LFBM",
      "homeAd": "LFBM"
    },
    {
      "registration": "F-UGJO",
      "type": "MIR2",
      "variant": "Mirage 2000B",
      "fleetId": "",
      "callsigns": [],
      "first": "2026-09-01",
      "last": "2026-10-01",
      "flights": 2,
      "lastAd": "LFBM",
      "homeAd": "LFBM"
    },
    {
      "registration": "F-UGIE",
      "type": "MIR2",
      "variant": "Mirage 2000B",
      "fleetId": "",
      "callsigns": [],
      "first": "2026-09-01",
      "last": "2026-10-01",
      "flights": 2,
      "lastAd": "LFBM",
      "homeAd": "LFBM"
    },
    {
      "registration": "F-UJCR",
      "type": "A332",
      "variant": "A330 MRTT Phénix",
      "fleetId": "",
      "callsigns": [],
      "first": "2026-09-01",
      "last": "2026-10-01",
      "flights": 2,
      "lastAd": "LFMI",
      "homeAd": "LFMI"
    },
    {
      "registration": "F-UJCH",
      "type": "A332",
      "variant": "A330 MRTT Phénix",
      "fleetId": "",
      "callsigns": [],
      "first": "2026-09-01",
      "last": "2026-10-01",
      "flights": 2,
      "lastAd": "LFMI",
      "homeAd": "LFMI"
    },
    {
      "registration": "F-UJCD",
      "type": "E3CF",
      "variant": "",
      "fleetId": "",
      "callsigns": [],
      "first": "2026-09-01",
      "last": "2026-10-01",
      "flights": 2,
      "lastAd": "LFOA",
      "homeAd": "LFOA"
    },
    {
      "registration": "F-UJCC",
      "type": "E3CF",
      "variant": "",
      "fleetId": "",
      "callsigns": [],
      "first": "2026-09-01",
      "last": "2026-10-01",
      "flights": 2,
      "lastAd": "LFOA",
      "homeAd": "LFOA"
    },
    {
      "registration": "F-MCAF",
      "type": "EC25",
      "variant": "",
      "fleetId": "",
      "callsigns": [],
      "first": "2026-09-01",
      "last": "2026-10-01",
      "flights": 2,
      "lastAd": "LFBP",
      "homeAd": "LFBP"
    },
    {
      "registration": "F-HMRE",
      "type": "H160",
      "variant": "",
      "fleetId": "",
      "callsigns": [],
      "first": "2026-09-01",
      "last": "2026-10-01",
      "flights": 2,
      "lastAd": "LFRC",
      "homeAd": "LFRC"
    },
    {
      "registration": "F-RBAX",
      "type": "A400",
      "variant": "",
      "fleetId": "",
      "callsigns": [],
      "first": "2026-09-01",
      "last": "2026-10-01",
      "flights": 2,
      "lastAd": "LFOJ",
      "homeAd": "LFOJ"
    }
  ]
};

  const fileData = data; // contenu du fichier (page Paramétrage : retour au fichier)
  // Modifications locales plus récentes que ce fichier (page Paramétrage, pas encore
  // enregistrées dans le dépôt) : prioritaires dans ce navigateur.
  try { const o = JSON.parse(localStorage.getItem('dataOverride:defaReference:v1') || 'null'); if (o && o.updatedAt > META.updatedAt) data = o.data; } catch { /* stockage indisponible */ }
  window.DEFA_REFERENCE = { META, pilots: data.pilots, aircraft: data.aircraft, file: fileData };
})();
