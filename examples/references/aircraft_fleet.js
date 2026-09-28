(() => {
  'use strict';
  // EXEMPLE (examples/) : trois appareils fictifs. Les vraies données sont dans le dépôt de données (data/references/).
  // Flotte DEFA Virtual : base commune des appareils connus (CR HEMS / FIRE, Mission Report Core).
  // Source : page « Flotte virtuelle » de flotte.defa-virtual.fr (python AircraftDB/update_fleet.py Flotte.html),
  // complétée à la main ou par la page Paramétrage. Colonnes : opérateur, type OACI, variante,
  // immatriculation, code (numéro tactique), numéro, indicatifs, base, opérationnel.
  // Édition : menu ☰ › Paramétrage › Bases de données (ou à la main : JSON, une ligne par élément).
  const META = {"updatedAt":"2026-01-01T00:00:00.000Z","example":true};
  let data = {
  "rows": [
    {
      "operator": "Escadrille d’exemple",
      "type": "A400",
      "variant": "A400M Atlas",
      "registration": "F-XAAA",
      "tacticalNumber": "",
      "number": "01",
      "callsigns": [
        "EXEMPLE01"
      ],
      "base": "LFOJ",
      "operational": true
    },
    {
      "operator": "Escadrille d’exemple",
      "type": "EC45",
      "variant": "",
      "registration": "F-XBBB",
      "tacticalNumber": "",
      "number": "",
      "callsigns": [
        "EXEMPLE02"
      ],
      "base": "LFRN",
      "operational": true
    },
    {
      "operator": "Escadrille d’exemple",
      "type": "DH8D",
      "variant": "Dash 8 Q400",
      "registration": "F-XCCC",
      "tacticalNumber": "",
      "number": "",
      "callsigns": [
        "EXEMPLE03"
      ],
      "base": "LFTW",
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
