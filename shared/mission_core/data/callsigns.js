(() => {
  'use strict';
  // Indicatifs : forme complète (parlée, conservée dans les CR) ↔ forme plan de vol (OACI Doc 4444,
  // app. 2, case 7 : 7 caractères, ex. PCAN31) ↔ désignateur OACI de l'exploitant (OPR/, case 18).
  // table : prefix (indicatif complet), fpl (forme plan de vol), operator, designator, types (types OACI
  // de la série), role (indicatif de fonction : pas de choix automatique), generic (désignateur générique),
  // telephony, note. operators : organisme → désignateur OACI (OPR/).
  // aliases : autres formes vues (fautes, formes longues / courtes) ; lignes « journal DEFA » : séries
  // relevées dans le journal des vols DEFA (Paramétrage › Base DEFA) — indicatif complet et organisme à vérifier.
  // Édition : menu ☰ › Paramétrage › Bases de données (ou à la main : JSON, une ligne par élément).
  const META = {"updatedAt":"2026-09-24T10:39:32.000Z"};
  let data = {
  "table": [
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
    {"prefix":"SAMU","fpl":"SAMU","aliases":["SAMUIDF"],"operator":"","designator":"","types":["H145","EC35","EC45"],"note":"journal DEFA 2025-06 → 2026-09 : 62 vols ; H145 (35), EC35 (25), EC45 (2) ; 12 n°"},
    {"prefix":"LCAR","fpl":"LCAR","aliases":["LCARA","LCARB"],"operator":"Marine nationale","designator":"FNY","types":["RFAL"],"note":"journal DEFA 2025-06 → 2026-07 : 48 vols ; RFAL M (48) ; 17 n° ; suffixes ORANGE"},
    {"prefix":"COCA","fpl":"COCA","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["MIR2"],"note":"journal DEFA 2025-05 → 2026-07 : 46 vols ; MIR2 D (41), MIR2 B (5) ; 11 n°"},
    {"prefix":"VANT","fpl":"VANT","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["A332"],"note":"journal DEFA 2025-05 → 2026-09 : 39 vols ; A332 MRTT (38), A332 PAX (1) ; 9 n°"},
    {"prefix":"CCOT","fpl":"CCOT","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["RFAL"],"note":"journal DEFA 2025-06 → 2026-09 : 39 vols ; RFAL C (34), RFAL B (4), MIR2 D (1) ; 18 n°"},
    {"prefix":"RYAK","fpl":"RYAK","aliases":["RAYAK"],"operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["RFAL"],"note":"journal DEFA 2025-05 → 2026-08 : 36 vols ; RFAL C (33), RFAL B (3) ; 12 n°"},
    {"prefix":"RUES","fpl":"RUES","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["RFAL"],"note":"journal DEFA 2025-06 → 2026-09 : 35 vols ; RFAL C (32), RFAL B (3) ; 9 n°"},
    {"prefix":"MIFF","fpl":"MIFF","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["RFAL"],"note":"journal DEFA 2025-05 → 2026-09 : 32 vols ; RFAL B (19), RFAL C (13) ; 12 n°"},
    {"prefix":"QINA","fpl":"QINA","aliases":["QUINA","QINAA","QINAB","QINAO"],"operator":"Marine nationale","designator":"FNY","types":["RFAL"],"note":"journal DEFA 2025-06 → 2026-09 : 25 vols ; RFAL M (25) ; 1 n° ; suffixes ALPHA BLANC BLUE BRAVO ORANGE PIRATE RED WHITE YELLOW"},
    {"prefix":"MGMA","fpl":"MGMA","operator":"","designator":"","types":["RFAL"],"note":"journal DEFA 2025-07 → 2026-09 : 24 vols ; RFAL C (19), RFAL B (3), RFAL M (2) ; 7 n°"},
    {"prefix":"RINO","fpl":"RINO","aliases":["RHINO"],"operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["C130"],"note":"journal DEFA 2025-08 → 2026-09 : 24 vols ; C130 (24) ; 5 n°"},
    {"prefix":"CVEX","fpl":"CVEX","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["A400"],"note":"journal DEFA 2025-09 → 2026-09 : 23 vols ; A400 (23) ; 7 n°"},
    {"prefix":"RFIN","fpl":"RFIN","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["RFAL"],"note":"journal DEFA 2025-06 → 2026-09 : 22 vols ; RFAL B (11), RFAL C (11) ; 9 n°"},
    {"prefix":"MUS","fpl":"MUS","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["PC21"],"note":"journal DEFA 2025-06 → 2026-07 : 17 vols ; PC21 (17) ; 8 n°"},
    {"prefix":"RQUIN","fpl":"RQUIN","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["RFAL"],"note":"journal DEFA 2025-05 → 2026-07 : 16 vols ; RFAL B (10), RFAL C (6) ; 6 n°"},
    {"prefix":"KONO","fpl":"KONO","aliases":["KONOA"],"operator":"Marine nationale","designator":"FNY","types":["RFAL"],"note":"journal DEFA 2025-09 → 2026-07 : 16 vols ; RFAL M (16) ; 10 n°"},
    {"prefix":"XNON","fpl":"XNON","aliases":["XNONG","XENONG","XNONE","XNONA","XNOND"],"operator":"Marine nationale","designator":"FNY","types":["FA50"],"note":"journal DEFA 2025-08 → 2026-09 : 15 vols ; FA50 (15) ; 2 n° ; suffixes ECHO"},
    {"prefix":"BGOU","fpl":"BGOU","aliases":["BGOUT","BGOUW","BGOUA","BGOUX"],"operator":"","designator":"","types":["H160"],"note":"journal DEFA 2025-10 → 2026-07 : 13 vols ; H160 (11), B350 (1), GAZL (1) ; 2 n° ; suffixes YANKEE"},
    {"prefix":"RILLE","fpl":"RILLE","aliases":["RLLE"],"operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["A400"],"note":"journal DEFA 2025-06 → 2026-09 : 12 vols ; A400 (12) ; 7 n°"},
    {"prefix":"MAUD","fpl":"MAUD","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["MIR2"],"note":"journal DEFA 2025-10 → 2026-06 : 12 vols ; MIR2 5 (10), MIR2 D (1), MIR2 B (1) ; 5 n°"},
    {"prefix":"COMMIS","fpl":"COMMIS","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["MIR2"],"note":"journal DEFA 2025-05 → 2025-09 : 12 vols ; MIR2 D (12) ; 5 n°"},
    {"prefix":"ROXAN","fpl":"ROXAN","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["E3CF"],"note":"journal DEFA 2025-05 → 2026-07 : 11 vols ; E3CF (11) ; 1 n°"},
    {"prefix":"CRICK","fpl":"CRICK","aliases":["CICK"],"operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["RFAL","MIR2"],"note":"journal DEFA 2025-09 → 2026-06 : 11 vols ; RFAL C (5), MIR2 B (5), RFAL B (1) ; 4 n°"},
    {"prefix":"BLADE","fpl":"BLADE","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["A400"],"note":"journal DEFA 2026-05 → 2026-08 : 10 vols ; A400 (10) ; 2 n°"},
    {"prefix":"MSO","fpl":"MSO","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["PC21"],"note":"journal DEFA 2025-07 → 2026-08 : 9 vols ; PC21 (9) ; 7 n°"},
    {"prefix":"CEV","fpl":"CEV","operator":"","designator":"","types":["TBM7","A400"],"note":"journal DEFA 2025-07 → 2026-04 : 8 vols ; TBM7 (2), A400 (2), C130 (1), MIR2 D (1) ; 6 n°"},
    {"prefix":"VADOR","fpl":"VADOR","operator":"","designator":"","types":["B350"],"note":"journal DEFA 2025-09 → 2026-06 : 7 vols ; B350 (6), BE35 (1) ; 6 n°"},
    {"prefix":"CONDOR","fpl":"CONDOR","aliases":["CDOR","CONDORB","CONDORC","CONDORA"],"operator":"","designator":"","types":["CP10"],"note":"journal DEFA 2026-04 → 2026-05 : 6 vols ; CP10 (6) ; suffixes BLANC ROUGE"},
    {"prefix":"CMIS","fpl":"CMIS","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["MIR2"],"note":"journal DEFA 2025-10 → 2026-09 : 5 vols ; MIR2 D (4), MIR2 B (1) ; 5 n°"},
    {"prefix":"ROMUS","fpl":"ROMUS","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["A332"],"note":"journal DEFA 2025-06 → 2026-09 : 5 vols ; A332 MRTT (5) ; 2 n°"},
    {"prefix":"CNDE","fpl":"CNDE","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["MIR2"],"note":"journal DEFA 2025-09 → 2026-06 : 5 vols ; MIR2 D (5) ; 5 n°"},
    {"prefix":"CFON","fpl":"CFON","operator":"","designator":"","types":["TBM7"],"note":"journal DEFA 2025-11 → 2026-06 : 5 vols ; TBM7 (5) ; 4 n°"},
    {"prefix":"CUJAS","fpl":"CUJAS","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["A400"],"note":"journal DEFA 2025-06 → 2026-05 : 5 vols ; A400 (5) ; 4 n°"},
    {"prefix":"RESCUE","fpl":"RESCUE","aliases":["RESCUEB","RESCUEA"],"operator":"Marine nationale","designator":"FNY","types":["H160","AS65","FA50"],"note":"journal DEFA 2025-09 → 2026-04 : 5 vols ; H160 (2), AS65 (2), FA50 (1)"},
    {"prefix":"RAPACE","fpl":"RAPACE","operator":"","designator":"","types":["AS55"],"note":"journal DEFA 2025-07 → 2026-07 : 4 vols ; AS55 (4) ; 2 n°"},
    {"prefix":"VRUS","fpl":"VRUS","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["RQ9P"],"note":"journal DEFA 2025-08 → 2026-07 : 4 vols ; RQ9P (4) ; 3 n°"},
    {"prefix":"TIGER","fpl":"TIGER","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["RFAL"],"note":"journal DEFA 2026-05 → 2026-05 : 4 vols ; RFAL C (4) ; 4 n°"},
    {"prefix":"DAMO","fpl":"DAMO","operator":"Marine nationale","designator":"FNY","types":["E2C"],"note":"journal DEFA 2026-01 → 2026-05 : 4 vols ; E2C (4) ; 2 n°"},
    {"prefix":"RCHE","fpl":"RCHE","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["A400","C130"],"note":"journal DEFA 2026-07 → 2026-09 : 3 vols ; A400 (2), C130 (1) ; 3 n°"},
    {"prefix":"GUEPARD","fpl":"GUEPARD","aliases":["GUEPW","GUEPV"],"operator":"Marine nationale","designator":"FNY","types":["AS65"],"note":"journal DEFA 2026-04 → 2026-09 : 3 vols ; AS65 (3) ; suffixes YANKEE"},
    {"prefix":"RMUS","fpl":"RMUS","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["A332"],"note":"journal DEFA 2026-02 → 2026-08 : 3 vols ; A332 MRTT (3) ; 2 n°"},
    {"prefix":"MAF","fpl":"MAF","operator":"","designator":"","types":["PC21","SR22"],"note":"journal DEFA 2026-06 → 2026-08 : 3 vols ; PC21 (2), SR22 (1) ; 3 n°"},
    {"prefix":"RFUT","fpl":"RFUT","operator":"","designator":"","types":["EC25","NH90"],"note":"journal DEFA 2026-01 → 2026-08 : 3 vols ; EC25 (2), NH90 (1) ; 2 n°"},
    {"prefix":"VEUX","fpl":"VEUX","operator":"","designator":"","types":["E121"],"note":"journal DEFA 2026-06 → 2026-07 : 3 vols ; E121 (3) ; 1 n°"},
    {"prefix":"MOLEN","fpl":"MOLEN","aliases":["MOLENJ","MOLENC"],"operator":"","designator":"","types":["FA50","E121"],"note":"journal DEFA 2025-07 → 2026-06 : 3 vols ; FA50 (2), E121 (1)"},
    {"prefix":"MET","fpl":"MET","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["PC21"],"note":"journal DEFA 2025-06 → 2026-05 : 3 vols ; PC21 (3) ; 3 n°"},
    {"prefix":"TPON","fpl":"TPON","operator":"","designator":"","types":["RFAL","TBM7"],"note":"journal DEFA 2026-01 → 2026-05 : 3 vols ; RFAL C (2), TBM7 (1) ; 3 n°"},
    {"prefix":"MARAUD","fpl":"MARAUD","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["MIR2"],"note":"journal DEFA 2025-09 → 2025-09 : 3 vols ; MIR2 5 (3) ; 2 n°"},
    {"prefix":"REVANCHE","fpl":"REVANCH","operator":"Armée de l'Air et de l'Espace","designator":"FAF","types":["C130"],"note":"journal DEFA 2025-06 → 2025-06 : 3 vols ; C130 (3) ; 2 n°"}
  ],
  "operators": {"Armée de l'Air et de l'Espace":"FAF","Sécurité civile":"FRU","ALAT":"FMY","Marine nationale":"FNY","Gendarmerie nationale":"FGN","Douane":"FDO","COTAM":"CTM","DGA Essais en vol":"DGAEV"}
};
  const fileData = data; // contenu du fichier (page Paramétrage : retour au fichier)
  // Modifications locales plus récentes que ce fichier (page Paramétrage, pas encore
  // enregistrées dans le dépôt) : prioritaires dans ce navigateur.
  try { const o = JSON.parse(localStorage.getItem('dataOverride:callsigns:v1') || 'null'); if (o && o.updatedAt > META.updatedAt) data = o.data; } catch { /* stockage indisponible */ }
  window.MISSION_CALLSIGNS = { META, table: data.table, operators: data.operators, file: fileData };
})();
