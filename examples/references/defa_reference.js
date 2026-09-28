(() => {
  'use strict';
  // EXEMPLE (examples/) : un pilote et un appareil fictifs. Les vraies données sont dans le dépôt de données (data/references/).
  // Référence DEFA anonymisée : pilotes (trigrammes), appareils (immatriculation, type, indicatifs
  // utilisés, dernier terrain connu, terrain de rattachement), sans les vols ni les missions.
  // Générée par tools/defa_reference.py depuis le journal des vols DEFA (non committé) ; complétée
  // à la main dans Paramétrage › Bases de données. Base « lâche » : aide à la saisie, non exhaustive.
  // Édition : menu ☰ › Paramétrage › Bases de données (ou à la main : JSON, une ligne par élément).
  const META = {"updatedAt":"2026-01-01T00:00:00.000Z","example":true};
  let data = {
  "pilots": [
    {
      "trigram": "AAA",
      "first": "2026-01-01",
      "last": "2026-01-31",
      "flights": 3,
      "types": [
        "EC45"
      ]
    }
  ],
  "aircraft": [
    {
      "registration": "F-XBBB",
      "type": "EC45",
      "variant": "",
      "fleetId": "",
      "callsigns": [
        "EXEMPLE02"
      ],
      "first": "2026-01-01",
      "last": "2026-01-31",
      "flights": 3,
      "lastAd": "LFRN",
      "homeAd": "LFRN"
    }
  ]
};

  const fileData = data; // contenu du fichier (page Paramétrage : retour au fichier)
  // Modifications locales plus récentes que ce fichier (page Paramétrage, pas encore
  // enregistrées dans le dépôt) : prioritaires dans ce navigateur.
  try { const o = JSON.parse(localStorage.getItem('dataOverride:defaReference:v1') || 'null'); if (o && o.updatedAt > META.updatedAt) data = o.data; } catch { /* stockage indisponible */ }
  window.DEFA_REFERENCE = { META, pilots: data.pilots, aircraft: data.aircraft, file: fileData };
})();
