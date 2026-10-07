(() => {
  'use strict';
  // Indicatifs : forme complète (parlée, conservée dans les CR) ↔ forme plan de vol (OACI Doc 4444,
  // app. 2, case 7 : 7 caractères, ex. PCAN31) ↔ désignateur OACI de l'exploitant (OPR/, case 18).
  // table : prefix (indicatif complet), fpl (forme plan de vol), operator, designator, types (types OACI
  // de la série), role (indicatif de fonction : pas de choix automatique), generic (désignateur générique),
  // telephony, note. operators : organisme → désignateur OACI (OPR/).
  // Édition : menu ☰ › Paramétrage › Bases de données (ou à la main : JSON, une ligne par élément).
  const META = {"updatedAt":"2026-10-05T07:29:36.410Z"};
  let data = {
  "table": [
    {"prefix":"TAFFON","fpl":"TFFN","aliases":[],"operator":"","designator":"FAF","types":["RFAL"],"role":false,"generic":false,"telephony":"","note":"EC 1/7 Provence"},
    {"prefix":"PELICAN","fpl":"PCAN","operator":"Sécurité civile","designator":"FRU","types":["CL2T"],"note":"Canadair — n° avion","aliases":["PELIC","PELICT"]},
    {"prefix":"MILAN","fpl":"MILAN","operator":"Sécurité civile","designator":"FRU","types":["DH8D"],"note":"Dash 8 — n° avion"},
    {"prefix":"BENGALE","fpl":"BENGA","operator":"Sécurité civile","designator":"FRU","types":["BE20"],"note":"Beech 200 — n° avion","aliases":["BENGAL","BGAL"]},
    {"prefix":"ICARE","fpl":"ICARE","operator":"Sécurité civile","designator":"FRU","types":["BE20"],"role":true,"note":"Beech coordination — n° ou nom de feu"},
    {"prefix":"DRAGON","fpl":"DRAGO","operator":"Sécurité civile","designator":"FRU","types":["EC45","EC35","H160","H145"],"note":"Hélicoptère — n° département","aliases":["DRAGONC","DRAGOC"]},
    {"prefix":"CHOUCAS","fpl":"CHOUC","operator":"Gendarmerie nationale","designator":"FGN","types":["EC45","H145"],"note":"EC145 / H145 — n° département"},
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
    {"prefix":"DGAEV","fpl":"DGAEV","operator":"DGA Essais en vol","designator":"DGAEV","types":[],"generic":true},
    {"prefix":"SAMU","fpl":"SAMU","aliases":["SAMUIDF"],"operator":"","designator":"","types":["H145","EC35","EC45"]},
    {"prefix":"LCAR","fpl":"LCAR","aliases":["LCARA","LCARB"],"operator":"Marine nationale","designator":"FNY","types":["RFAL"]},
    {"prefix":"COCA","fpl":"COCA","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["MIR2"]},
    {"prefix":"VANT","fpl":"VANT","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["A332"]},
    {"prefix":"CHICOT","fpl":"CCOT","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["RFAL"]},
    {"prefix":"RAYAK","fpl":"RYAK","aliases":["RAYAK"],"operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["RFAL"]},
    {"prefix":"RUES","fpl":"RUES","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["RFAL"]},
    {"prefix":"MASTIFF","fpl":"MIFF","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["RFAL"],"aliases":["MASTIF"]},
    {"prefix":"QUINA","fpl":"QINA","aliases":["QUINA","QINAA","QINAB","QINAO"],"operator":"Marine nationale","designator":"FNY","types":["RFAL"]},
    {"prefix":"MAGMA","fpl":"MGMA","operator":"","designator":"","types":["RFAL"]},
    {"prefix":"RHINO","fpl":"RINO","aliases":["RHINO"],"operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["C130"]},
    {"prefix":"CVEX","fpl":"CVEX","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["A400"]},
    {"prefix":"RAFFIN","fpl":"RFIN","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["RFAL"]},
    {"prefix":"MUS","fpl":"MUS","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["PC21"]},
    {"prefix":"REQUIN","fpl":"RQUIN","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["RFAL"]},
    {"prefix":"KONO","fpl":"KONO","aliases":["KONOA"],"operator":"Marine nationale","designator":"FNY","types":["RFAL"]},
    {"prefix":"XENON","fpl":"XNON","aliases":["XNONG","XENONG","XNONE","XNONA","XNOND"],"operator":"Marine nationale","designator":"FNY","types":["FA50"]},
    {"prefix":"BGOU","fpl":"BGOU","aliases":["BGOUT","BGOUW","BGOUA","BGOUX"],"operator":"","designator":"","types":["H160"]},
    {"prefix":"RILLE","fpl":"RILLE","aliases":["RLLE","RIL"],"operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["A400"]},
    {"prefix":"MAUD","fpl":"MAUD","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["MIR2"]},
    {"prefix":"COMMIS","fpl":"COMMIS","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["MIR2"]},
    {"prefix":"ROXANE","fpl":"ROXAN","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["E3CF"]},
    {"prefix":"CRICK","fpl":"CRICK","aliases":["CICK"],"operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["RFAL","MIR2"]},
    {"prefix":"BLADE","fpl":"BLADE","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["A400"]},
    {"prefix":"MSO","fpl":"MSO","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["PC21"]},
    {"prefix":"CEV","fpl":"CEV","operator":"","designator":"","types":["TBM7","A400"]},
    {"prefix":"VADOR","fpl":"VADOR","operator":"","designator":"","types":["B350"]},
    {"prefix":"CONDOR","fpl":"CONDOR","aliases":["CDOR","CONDORB","CONDORC","CONDORA"],"operator":"","designator":"","types":["CP10"]},
    {"prefix":"CMIS","fpl":"CMIS","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["MIR2"]},
    {"prefix":"ROMUS","fpl":"ROMUS","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["A332"]},
    {"prefix":"CNDE","fpl":"CNDE","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["MIR2"]},
    {"prefix":"CHIFFON","fpl":"CFON","operator":"","designator":"","types":["TBM7"]},
    {"prefix":"CUJAS","fpl":"CUJAS","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["A400"]},
    {"prefix":"RESCUE","fpl":"RESCUE","aliases":["RESCUEB","RESCUEA"],"operator":"Marine nationale","designator":"FNY","types":["H160","AS65","FA50"]},
    {"prefix":"RAPACE","fpl":"RAPACE","operator":"","designator":"","types":["AS55"]},
    {"prefix":"VIRUS","fpl":"VRUS","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["RQ9P"]},
    {"prefix":"TIGER","fpl":"TIGER","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["RFAL"]},
    {"prefix":"DAMO","fpl":"DAMO","operator":"Marine nationale","designator":"FNY","types":["E2C"]},
    {"prefix":"ROCHEFORT","fpl":"RCHE","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["A400","C130"]},
    {"prefix":"GUEPARD","fpl":"GUEPARD","aliases":["GUEPW","GUEPV"],"operator":"Marine nationale","designator":"FNY","types":["AS65"]},
    {"prefix":"RAMUS","fpl":"RMUS","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["A332"]},
    {"prefix":"MAF","fpl":"MAF","operator":"","designator":"","types":["PC21","SR22"]},
    {"prefix":"RAFFUT","fpl":"RFUT","operator":"","designator":"","types":["EC25","NH90"]},
    {"prefix":"EVREUX","fpl":"VEUX","operator":"","designator":"","types":["E121"]},
    {"prefix":"MOLENE","fpl":"MOLEN","aliases":["MOLENJ","MOLENC"],"operator":"","designator":"","types":["FA50","E121"]},
    {"prefix":"MET","fpl":"MET","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["PC21"]},
    {"prefix":"TPON","fpl":"TPON","operator":"","designator":"","types":["RFAL","TBM7"]},
    {"prefix":"MARAUD","fpl":"MARAUD","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["MIR2"]},
    {"prefix":"REVANCHE","fpl":"REVANCH","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["C130"]},
    {"prefix":"PANTHER","fpl":"PANTHER","aliases":[],"operator":"","designator":"","types":["A400","RFAL"]},
    {"prefix":"WOODY","fpl":"WOODY","aliases":[],"operator":"","designator":"","types":["C130"]}
  ],
  "operators": {"Armée de l'Air et de l'Espace":"FAF","Sécurité civile":"FRU","ALAT":"FMY","Marine nationale":"FNY","Gendarmerie nationale":"FGN","Douane":"FDO","COTAM":"CTM","DGA Essais en vol":"DGAEV"}
};
  const fileData = data; // contenu du fichier (page Paramétrage : retour au fichier)
  // Modifications locales plus récentes que ce fichier (page Paramétrage, pas encore
  // enregistrées dans le dépôt) : prioritaires dans ce navigateur.
  try { const o = JSON.parse(localStorage.getItem('dataOverride:callsigns:v1') || 'null'); if (o && o.updatedAt > META.updatedAt) data = o.data; } catch { /* stockage indisponible */ }
  window.MISSION_CALLSIGNS = { META, table: data.table, operators: data.operators, file: fileData };
})();
