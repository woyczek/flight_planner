/* =====================================================================================================
   Consommations de croisière de référence — estimation quand le profil de l'appareil n'en donne aucune
   -----------------------------------------------------------------------------------------------------
   Utilisé par le planificateur carburant (apps/planner/flight_performance_planner.html) en troisième source de
   consommation, après le profil enregistré et la saisie du vol : une valeur ESTIMÉE, toujours affichée comme
   telle (« ≈ … kg/h, estimation »), jamais écrite dans un profil sans un clic de l'utilisateur.

   Deux tables, en kg/h (carburant total de l'appareil, croisière ordinaire) et kt (TAS de croisière) :
     - TYPES : types employés par la compagnie (flotte, référence), valeur typique nommée ; chaque ligne porte sa
       source — ordre de grandeur public (fiche constructeur, manuels d'emploi, retours d'exploitation), ou calcul
       puissance × consommation spécifique quand seul le moteur est documenté. Ce sont des ordres de grandeur pour
       préparer un vol, pas des valeurs de manuel de vol : la saisie ou le profil les remplacent.
     - CLASSES : description OACI (Doc 8643 : catégorie L / H / A, nombre de moteurs, motorisation P / T / J) puis
       catégorie de turbulence de sillage (L, M, H) — déduite de la MTOW EUROCONTROL (AircraftDB/aircraft_perf.js)
       quand elle est connue, sinon de la base des types (AircraftDB/aircraft_db.js).

   Interface : window.FuelReference = { estimate({ codes, db, apd }), TYPES, CLASSES }.
     estimate → { kgPerHour, tasKt, ceilingFt, basis: "type" | "class", code, cls, wtc, src } ou null (type inconnu,
     base des types absente : rien n'est inventé). La fiche Airframe DB du type (AIRCRAFT_PERF[code].airframedb, posée
     par le lanceur pour les types sans EUROCONTROL ni SimBrief : TAS de croisière, plafond, MTOW, jamais de
     consommation) affine la TAS, le plafond et la catégorie de sillage de l'estimation par classe.
   ===================================================================================================== */
(() => {
  "use strict";
  /** Types de la flotte : [kg/h, TAS kt, alias, source]. Valeurs arrondies, croisière ordinaire, masse moyenne. */
  const TYPES = {
    // --- avions de transport et de mission
    A400: [4000, 400, ["A4M", "A400M"],
      "Airbus A400M : convoyage publié ≈ 8 700 km avec ≈ 50 t de carburant interne à ≈ 400 kt → ≈ 4 t/h ; ordre de grandeur"
    ],
    C130: [2400, 290, ["C130H", "C30J"],
      "Lockheed C-130H : 4 × T56-A-15, ≈ 1 200-1 300 lb/h par moteur en croisière (manuels d'emploi publics) → ≈ 5 000-5 500 lb/h"
    ],
    A332: [6000, 470, ["A330", "KC30"],
      "Airbus A330-200 / MRTT : retours d'exploitation 5,5 à 6,5 t/h en croisière selon la masse"
    ],
    E3CF: [6000, 420, ["E3", "E3F"],
      "Boeing E-3F : 4 × CFM56-2 comme le KC-135R (≈ 12 000-13 000 lb/h publiés) ; radôme : traînée plus forte"
    ],
    E2: [1100, 270, ["E2C", "E2D"],
      "Grumman E-2C/D Hawkeye : 2 × T56-A-427 ; ordre de grandeur public ≈ 2 400 lb/h en transit"
    ],
    DH8D: [1100, 330, ["Q400"],
      "De Havilland Canada Dash 8-400 : retours d'exploitation ≈ 1 000-1 200 kg/h"
    ],
    FA50: [850, 450, [],
      "Dassault Falcon 50 : 3 × TFE731-3, ≈ 1 800-1 900 lb/h en croisière (fiches d'exploitation publiques)"
    ],
    PC24: [480, 420, [],
      "Pilatus PC-24 : 2 × FJ44-4A, ≈ 1 000-1 100 lb/h en croisière haute (fiche constructeur, ordre de grandeur)"
    ],
    B350: [360, 300, ["B300"],
      "Beechcraft King Air 350 : ≈ 800 lb/h au FL250 (tables constructeur publiées, ordre de grandeur)"
    ],
    BE20: [290, 260, ["B200"],
      "Beechcraft King Air 200 : ≈ 640 lb/h en croisière (tables constructeur publiées, ordre de grandeur)"
    ],
    DHC6: [300, 150, [],
      "DHC-6 Twin Otter : 2 × PT6A-27/34, ≈ 650 lb/h en croisière (retours d'exploitation)"
    ],
    E121: [220, 235, [],
      "Embraer EMB-121 Xingu : 2 × PT6A-135 ; ≈ 480 lb/h (ordre de grandeur des biturbopropulseurs de 5,7 t)"
    ],
    CL2T: [900, 180, ["CL415", "CL215T"],
      "Canadair CL-415 : 2 × PW123AF ; transit ≈ 2 000 lb/h (ordre de grandeur public), écopage non compris"
    ],
    // --- avions d'armes et d'entraînement
    RFAL: [2000, 480, ["RAFALE"],
      "Dassault Rafale : 2 × M88-2 ; poussée de croisière ≈ 2 × 12 kN × consommation spécifique ≈ 0,8 lb/lbf/h → ≈ 2 t/h"
    ],
    MIR2: [1500, 480, ["M2000"],
      "Dassault Mirage 2000 : M53-P2 ; poussée de croisière ≈ 15 kN × ≈ 0,9 lb/lbf/h → ≈ 1,4-1,6 t/h"
    ],
    PC21: [250, 300, [],
      "Pilatus PC-21 : PT6A-68B 1 600 shp ; ≈ 60 % de puissance × 0,55 lb/shp/h → ≈ 530 lb/h"
    ],
    TBM7: [180, 280, ["TBM700", "TBM8", "TBM9"],
      "Daher TBM 700 : ≈ 60 USgal/h de kérosène en croisière (fiche constructeur, ordre de grandeur) → ≈ 180 kg/h"
    ],
    PC6T: [130, 115, ["PC6"],
      "Pilatus PC-6 Turbo Porter : PT6A-27 ; ≈ 280 lb/h (retours d'exploitation)"
    ],
    Q9: [80, 170, ["MQ9", "RQ9P"],
      "MQ-9 Reaper : TPE331-10 ≈ 900 shp ; régime de transit ≈ 170-180 lb/h (ordre de grandeur public)"
    ],
    CP10: [22, 130, ["CAP10"],
      "Mudry CAP 10 : Lycoming IO-360 180 ch ; ≈ 30 L/h d'essence aviation × 0,72 kg/L"
    ],
    SR22: [46, 175, [],
      "Cirrus SR22 : IO-550 / IO-550-N ; ≈ 17 USgal/h d'essence aviation (fiche constructeur) × 2,7 kg/USgal"
    ],
    // --- hélicoptères
    NH90: [650, 140, [],
      "NH Industries NH90 : 2 × RTM322 ; ≈ 600-700 kg/h en croisière (retours d'exploitation publics)"
    ],
    EC25: [680, 145, ["H225", "H225M", "EC725"],
      "Airbus Helicopters H225M Caracal : 2 × Makila 2A1 ; ≈ 650-700 kg/h (fiche constructeur, ordre de grandeur)"
    ],
    AS32: [600, 135, ["AS332"],
      "AS332 Super Puma : 2 × Makila 1A ; ≈ 600 kg/h (retours d'exploitation)"
    ],
    PUMA: [580, 130, ["SA330"],
      "SA330 Puma : 2 × Turmo IV ; ≈ 550-600 kg/h (retours d'exploitation)"
    ],
    TIGR: [380, 130, ["TIGRE"],
      "Airbus Helicopters Tigre : 2 × MTR390 ≈ 1 300 shp ; ≈ 350-400 kg/h (ordre de grandeur public)"
    ],
    H160: [330, 145, [],
      "Airbus Helicopters H160 : 2 × Arrano ; classe 5-6 t biturbine (AS365 N3 ≈ 300-350 kg/h), ordre de grandeur"
    ],
    AS65: [330, 140, ["AS365", "AS565", "SA365"],
      "AS365 / AS565 Dauphin, Panther : 2 × Arriel 2C ; ≈ 300-350 kg/h (retours d'exploitation)"
    ],
    EC45: [220, 125, ["H145", "EC145", "BK17"],
      "Airbus Helicopters H145 / EC145 : 2 × Arriel 1E2 / 2E ; ≈ 200-240 kg/h (fiche constructeur, ordre de grandeur)"
    ],
    EC35: [190, 120, ["H135", "EC135"],
      "Airbus Helicopters H135 : 2 × Arrius 2B2 / PW206B ; ≈ 180-200 kg/h (retours d'exploitation)"
    ],
    AS55: [190, 115, ["AS355"],
      "AS355 Écureuil 2 : 2 × Arrius 1A ; ≈ 190 kg/h (retours d'exploitation)"
    ],
    AS50: [165, 120, ["AS350", "H125"],
      "AS350 Écureuil : Arriel 2B ; ≈ 160-170 kg/h (retours d'exploitation)"
    ],
    GAZL: [160, 120, ["SA342", "SA341"],
      "SA342 Gazelle : Astazou XIV ≈ 590 shp ; ≈ 500 shp × 0,65 lb/shp/h → ≈ 150-170 kg/h"
    ],
    EC20: [110, 110, ["EC120"],
      "EC120 Colibri : Arrius 2F ≈ 500 shp ; ≈ 110 kg/h (retours d'exploitation)"
    ]
  };
  /** Classes OACI : description (Doc 8643) → { L | M | H : [kg/h, TAS kt] }, valeurs typiques de la catégorie. */
  const CLASSES = {
    L1P: {
      L: [35, 130]
    }, // monomoteur à pistons léger (DR400, SR22 : 30-50 kg/h)
    L2P: {
      L: [80, 170]
    }, // bimoteur à pistons (Seneca, Baron)
    L1T: {
      L: [180, 260],
      M: [400, 260]
    }, // monoturbopropulseur (TBM, PC-12, PC-21)
    L2T: {
      L: [300, 250],
      M: [900, 290]
    }, // biturbopropulseur : King Air ; ATR 72, C295, Q400
    L4T: {
      M: [2400, 290],
      H: [4000, 380]
    }, // quadriturbopropulseur : C-130 ; A400M
    L1J: {
      L: [250, 330],
      M: [1500, 460]
    }, // monoréacteur : jet léger ; avion d'armes
    L2J: {
      L: [500, 400],
      M: [2400, 450],
      H: [6000, 470]
    }, // biréacteur : affaires ; A320 ; A330
    L3J: {
      M: [1000, 450],
      H: [7000, 470]
    }, // triréacteur : Falcon ; MD-11
    L4J: {
      M: [2200, 400],
      H: [7500, 470]
    }, // quadriréacteur : BAe 146 ; A340, E-3, C-17
    H1P: {
      L: [40, 90]
    }, // hélicoptère à pistons (R44)
    H1T: {
      L: [160, 115],
      M: [400, 130]
    }, // hélicoptère monoturbine (Écureuil, Gazelle)
    H2T: {
      L: [250, 125],
      M: [650, 140],
      H: [1300, 140]
    } // biturbine : H145 ; NH90, Caracal ; CH-47
  };
  /** Code de type normalisé (majuscules, lettres et chiffres). */
  const key = s => String(s || "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Z0-9]/g, "");
  /** Index alias → code de TYPES (construit une fois). */
  const ALIAS = (() => {
    const m = {};
    for (const [code, row] of Object.entries(TYPES)) {
      m[code] = code;
      for (const a of row[2]) m[key(a)] = m[key(a)] || code;
    }
    return m;
  })();
  /** Ligne de la base des types d'un code : catalogue commun (alias suivis jusqu'au bout) pour la base de la page, sinon
   *  entrée directe ou alias de la base passée. */
  const dbRow = (db, k) => (!db || db === window.AIRCRAFT_DB ? window.AircraftCatalog?.record?.(k) : null) || db?.[k] || db?.[db
    ?.__aliases?.[k]
  ] || null;
  /** Catégorie de sillage : MTOW EUROCONTROL, sinon Airframe DB (< 7 t : L, < 136 t : M, sinon H), sinon base des
   *  types (« L/M » : L). */
  const wtcOf = (row, apd, adb = null) => {
    const mtow = +apd?.takeoff?.mtowKg || +adb?.mtowKg || 0;
    if (mtow > 0) return mtow < 7000 ? "L" : mtow < 136000 ? "M" : "H";
    const w = String(row?.wtc || "").toUpperCase()[0];
    return "LMH".includes(w) && w ? w : "";
  };

  /** Estimation de la consommation de croisière d'un appareil. Entrées : codes (type, OACI, identifiant du profil),
   *  db (AIRCRAFT_DB, facultative), apd (fiche EUROCONTROL du type, facultative). Sortie : voir l'en-tête ; null si
   *  ni le type ni sa classe ne sont connus. */
  function estimate({
    codes = [],
    db = null,
    apd = null
  } = {}) {
    const ks = [...new Set(codes.map(key).filter(Boolean))];
    // fiche Airframe DB du type (fiche EUROCONTROL passée, sinon AIRCRAFT_PERF par code ou désignateur de la base)
    const adb = (apd || ks.map(k => window.AIRCRAFT_PERF?.[k] || window.AIRCRAFT_PERF?.[dbRow(db, k)?.tdesig]).find(Boolean))
      ?.airframedb || null;
    // 1) type nommé (code, alias de la table, alias de la base des types)
    for (const k of ks) {
      const code = ALIAS[k] || ALIAS[key(db?.__aliases?.[k])] || ALIAS[key(dbRow(db, k)?.tdesig)];
      if (code) {
        const [kg, tas, , src] = TYPES[code];
        return {
          kgPerHour: kg,
          tasKt: tas,
          ceilingFt: adb?.ceilingFt > 0 ? adb.ceilingFt : null,
          basis: "type",
          code,
          cls: String(dbRow(db, k)?.description || ""),
          wtc: wtcOf(dbRow(db, k), apd, adb),
          src
        };
      }
    }
    // 2) classe OACI et catégorie de sillage
    for (const k of ks) {
      const row = dbRow(db, k),
        cls = String(row?.description || "").toUpperCase(),
        band = CLASSES[cls] || CLASSES[cls.replace(/^[AG]/, "L")]; // amphibie, autogire : comme l'avion
      if (!band) continue;
      const w = wtcOf(row, apd, adb),
        pick = band[w] ? w : ["M", "L", "H"].find(x => band[x]);
      // TAS de croisière de la fiche Airframe DB quand elle existe : celle de la classe est un ordre de grandeur
      const tas = adb?.cruiseKt > 0 ? adb.cruiseKt : band[pick][1];
      return {
        kgPerHour: band[pick][0],
        tasKt: tas,
        ceilingFt: adb?.ceilingFt > 0 ? adb.ceilingFt : null,
        basis: "class",
        code: row?.tdesig || k,
        cls,
        wtc: pick,
        src: "classe OACI " + cls + " / " + pick + (adb?.cruiseKt > 0 ? " ; TAS et plafond Airframe DB" : "")
      };
    }
    return null;
  }
  window.FuelReference = {
    estimate,
    TYPES,
    CLASSES
  };
})();
