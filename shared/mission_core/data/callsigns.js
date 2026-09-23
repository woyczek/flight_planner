(() => {
  'use strict';
  // Indicatifs : forme complète (parlée, conservée dans les CR) ↔ forme plan de vol (OACI Doc 4444,
  // app. 2, case 7 : 7 caractères, ex. PCAN31) ↔ désignateur OACI de l'exploitant (OPR/, case 18).
  // table : prefix (indicatif complet), fpl (forme plan de vol), operator, designator, types (types OACI
  // de la série), role (indicatif de fonction : pas de choix automatique), generic (désignateur générique),
  // telephony, note. operators : organisme → désignateur OACI (OPR/).
  // Édition : menu ☰ › Paramétrage › Bases de données (ou à la main : JSON, une ligne par élément).
  const META = {"updatedAt":"2026-09-23T20:00:56.000Z"};
  let data = {
  "table": [
    {"prefix":"PELICAN","fpl":"PCAN","operator":"Sécurité civile","designator":"FRU","types":["CL2T"],"note":"Canadair — n° avion"},
    {"prefix":"MILAN","fpl":"MILAN","operator":"Sécurité civile","designator":"FRU","types":["DH8D"],"note":"Dash 8 — n° avion"},
    {"prefix":"BENGALE","fpl":"BENGA","operator":"Sécurité civile","designator":"FRU","types":["BE20"],"note":"Beech 200 — n° avion"},
    {"prefix":"ICARE","fpl":"ICARE","operator":"Sécurité civile","designator":"FRU","types":["BE20"],"role":true,"note":"Beech coordination — n° ou nom de feu"},
    {"prefix":"DRAGON","fpl":"DRAGO","operator":"Sécurité civile","designator":"FRU","types":["EC45","EC35","H160"],"note":"Hélicoptère — n° département"},
    {"prefix":"CHOUCAS","fpl":"CHOUC","operator":"Gendarmerie nationale","designator":"FGN","types":["EC45"],"note":"EC145 / H145 — n° département"},
    {"prefix":"KETOUPA","fpl":"KETOU","operator":"Gendarmerie nationale","designator":"FGN","types":["EC35"],"note":"EC135 — n°"},
    {"prefix":"MORANE","fpl":"MORANE","operator":"Sécurité civile","designator":"","types":[],"role":true,"note":"HBE contractuels"},
    {"prefix":"LAT","fpl":"LAT","operator":"ALAT","designator":"FMY","types":[],"role":true,"note":"certains vols / 6e RHC (LAT6xxx)"},
    {"prefix":"FMN","fpl":"FMN","operator":"Marine nationale","designator":"FNY","types":[],"role":true,"telephony":"F.M.N.","note":"séries opérationnelles (FMN5xxx)"},
    {"prefix":"COTAM","fpl":"CTM","operator":"Armée de l'Air et de l'Espace","designator":"CTM","types":[],"role":true,"note":"transport aérien militaire"},
    {"prefix":"FAF","fpl":"FAF","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":[],"generic":true,"telephony":"FRENCH AIR FORCE"},
    {"prefix":"FRU","fpl":"FRU","operator":"Sécurité civile","designator":"FRU","types":[],"generic":true,"telephony":"FRENCH RESCUE"},
    {"prefix":"FMY","fpl":"FMY","operator":"ALAT","designator":"FMY","types":[],"generic":true,"telephony":"FRENCH ARMY"},
    {"prefix":"FNY","fpl":"FNY","operator":"Marine nationale","designator":"FNY","types":[],"generic":true,"telephony":"FRENCH NAVY"},
    {"prefix":"FGN","fpl":"FGN","operator":"Gendarmerie nationale","designator":"FGN","types":[],"generic":true,"telephony":"FRENCH GENDARMERIE"},
    {"prefix":"FDO","fpl":"FDO","operator":"Douane","designator":"FDO","types":[],"generic":true,"telephony":"FRENCH CUSTOM"},
    {"prefix":"DGAEV","fpl":"DGAEV","operator":"DGA Essais en vol","designator":"DGAEV","types":[],"generic":true}
  ],
  "operators": {"Armée de l'Air et de l'Espace":"FAF","Sécurité civile":"FRU","ALAT":"FMY","Marine nationale":"FNY","Gendarmerie nationale":"FGN","Douane":"FDO","COTAM":"CTM","DGA Essais en vol":"DGAEV"}
};
  const fileData = data; // contenu du fichier (page Paramétrage : retour au fichier)
  // Modifications locales plus récentes que ce fichier (page Paramétrage, pas encore
  // enregistrées dans le dépôt) : prioritaires dans ce navigateur.
  try { const o = JSON.parse(localStorage.getItem('dataOverride:callsigns:v1') || 'null'); if (o && o.updatedAt > META.updatedAt) data = o.data; } catch { /* stockage indisponible */ }
  window.MISSION_CALLSIGNS = { META, table: data.table, operators: data.operators, file: fileData };
})();
