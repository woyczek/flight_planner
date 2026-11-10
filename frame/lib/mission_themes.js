// V3 frame/lib (propriétaire : Features SOG) — la table UNIQUE des thèmes de mission (V3_SPECIFICATION § 10.48, SOG-0202) : les seize
// familles de la V2 et leurs séries (identifiants, libellés ×4, lettre des numéros de compte rendu), DÉPLACÉES ici telles qu'elles étaient
// dans modules/report/vocab.js et families/*.js (le compte rendu les lit d'ici ; tests/v3/fixtures/report_lists_v2.json les fige), et le
// 17e thème COMMERCIAL (l'utilisateur, 10 nov. 15 h 20 : « airlift et special sont des thèmes militaires. « commercial » est un grand
// thème. dedans, on « devrait » trouver : cargo, passagers, rapatriement vide, etc. »). Thème = famille, sous-thème = série. Pur : ni page,
// ni stockage, ni réseau ; les libellés sont du texte à échapper par qui l'affiche.
//
//   THEMES                 [{ id, short (sigle), letter (numéros de CR), military, labels [fr, en, de, es], series: [{ value, labels, load? }] }]
//                          load : ce que transporte un vol de la série (freight : fret en kg, passengers : nombre), absent = rien
//   themeOf(code)          le thème d'un code (alias : MEDEVAC → HEMS) ou null ; seriesOf(code) → [{ value, label }] (la forme des familles
//                          du compte rendu) ; themes(lang) → [{ id, short, name, label }] ; LABELS / LETTERS : les tables du vocabulaire du CR
//   Le fichier d'une compagnie (data/airline/<code>/themes.json, écrit par Réglages seul ; entrée non fiable, § 10.36) :
//     { schema: 1, chosen: [ids], added: { themes: [{ id, short, labels }], series: { THEME: [{ value, labels }] } } }
//   cleanThemes(doc)       le fichier filtré et borné (THEME_ID, SHORT, LABEL_MAX, ADDED_MAX ; un id déjà pris n'est jamais remplacé)
//   defaultChosen(kind)    les thèmes cochés d'avance : va (Commerciale) → COMMERCIAL ; sog (Escadrille SO) → les seize militaires ;
//                          perso et sans genre → les dix-sept
//   chosenOf(doc, kind)    les thèmes d'une compagnie : son fichier s'il en a un (filtré), sinon defaultChosen(kind) — rien n'est écrit
//                          tant qu'on ne coche pas
//   Sigle de COMMERCIAL (« CAT », Commercial Air Transport de l'AESA) et sa lettre (« E ») : validés par l'utilisateur (« CAT, E. go. »).
//   T2 : MIGRATION / fromCategory(id) (les catégories de SOG-0041 lues comme thème / série), loadOf(theme, series) (la charge d'une
//   série), seriesFor(theme, texte) (la série qui répond au sous-type d'une mission), forAirline(doc, kind, keep) (les thèmes d'une
//   compagnie pour une liste, ses séries ajoutées comprises).
export const LANGS = ['fr', 'en', 'de', 'es'];
export const THEME_ID = /^[A-Z][A-Z0-9_]{1,23}$/;
export const SERIES_ID = /^[A-Za-z0-9][A-Za-z0-9 _.\/()-]{0,39}$/;
export const SHORT = /^[A-Z0-9]{2,8}$/;
export const LABEL_MAX = 40;
export const ADDED_MAX = Object.freeze({
  themes: 8,
  seriesPerTheme: 20
});
const deep = x => {
  Object.freeze(x);
  for (const v of Object.values(x))
    if (v && typeof v === 'object' && !Object.isFrozen(v)) deep(v);
  return x;
};
export const THEMES = deep([{
  id: "HEMS",
  short: "HEMS",
  letter: "M",
  military: true,
  labels: ["HEMS / MEDEVAC", "HEMS / MEDEVAC", "HEMS / MEDEVAC", "HEMS / MEDEVAC"],
  series: [{
    value: "Primary HEMS",
    labels: ["HEMS primaire", "Primary HEMS", "Primärer HEMS-Einsatz", "HEMS primario"]
  }, {
    value: "Interhospital transfer (MEDEVAC)",
    labels: ["Transfert interhospitalier (MEDEVAC)", "Interhospital transfer (MEDEVAC)", "Interhospitaltransfer (MEDEVAC)",
      "Traslado interhospitalario (MEDEVAC)"
    ]
  }, {
    value: "Rescue",
    labels: ["Secours / sauvetage", "Rescue", "Rettung", "Socorro / rescate"]
  }, {
    value: "Search / evacuation",
    labels: ["Recherche / évacuation", "Search / evacuation", "Suche / Evakuierung", "Búsqueda / evacuación"]
  }, {
    value: "Specialized transport",
    labels: ["Transport spécialisé", "Specialized transport", "Spezialtransport", "Transporte especializado"]
  }, {
    value: "Training",
    labels: ["Entraînement", "Training", "Training", "Entrenamiento"]
  }]
}, {
  id: "FIRE",
  short: "FIRE",
  letter: "F",
  military: true,
  labels: ["FIRE / GAAR — sécurité civile", "FIRE / aerial firefighting", "FIRE / Waldbrandbekämpfung",
    "FIRE / extinción de incendios"
  ],
  series: [{
    value: "GAAR",
    labels: ["GAAR", "GAAR", "GAAR", "GAAR"]
  }, {
    value: "GAAR with diversion",
    labels: ["GAAR avec déroutement", "GAAR with diversion", "GAAR mit Umleitung", "GAAR con desvío"]
  }, {
    value: "Response",
    labels: ["Intervention", "Response", "Einsatz", "Intervención"]
  }, {
    value: "Training",
    labels: ["Entraînement", "Training", "Training", "Entrenamiento"]
  }]
}, {
  id: "SAR",
  short: "SAR",
  letter: "S",
  military: true,
  labels: ["SAR / récupération de personnel", "SAR / personnel recovery", "SAR / Personenbergung", "SAR / recuperación de personal"],
  series: [{
    value: "SAR-LAND",
    labels: ["SAR terrestre", "Land SAR", "SAR an Land", "SAR terrestre"]
  }, {
    value: "SAR-MARITIME",
    labels: ["SAR maritime", "Maritime SAR", "Seenotrettung", "SAR marítimo"]
  }, {
    value: "SAR-AIRCRAFT",
    labels: ["Recherche d’aéronef", "Aircraft search", "Luftfahrzeugsuche", "Búsqueda de aeronave"]
  }, {
    value: "PR",
    labels: ["Récupération de personnel (PR)", "Personnel recovery (PR)", "Personalrettung (PR)", "Recuperación de personal (PR)"]
  }, {
    value: "CSAR",
    labels: ["CSAR (contexte militaire)", "CSAR (military context)", "CSAR (militärischer Kontext)", "CSAR (contexto militar)"]
  }]
}, {
  id: "AIRLIFT",
  short: "AIRLIFT",
  letter: "T",
  military: true,
  labels: ["Transport aérien / logistique", "Airlift / logistics", "Lufttransport / Logistik", "Transporte aéreo / logística"],
  series: [{
    value: "STRATEGIC",
    labels: ["Transport stratégique", "Strategic airlift", "Strategischer Lufttransport", "Transporte estratégico"]
  }, {
    value: "TACTICAL",
    labels: ["Transport tactique", "Tactical airlift", "Taktischer Lufttransport", "Transporte táctico"]
  }, {
    value: "REMOTE",
    labels: ["Desserte isolée", "Remote airlift", "Versorgung abgelegener Orte", "Transporte a zonas aisladas"]
  }, {
    value: "OFFSHORE",
    labels: ["Logistique offshore", "Offshore logistics", "Offshore-Logistik", "Logística offshore"]
  }, {
    value: "POLAR",
    labels: ["Antarctique / polaire", "Antarctic / polar", "Antarktis / Polar", "Antártida / polar"]
  }, {
    value: "HUMANITARIAN",
    labels: ["Logistique humanitaire", "Humanitarian logistics", "Humanitäre Logistik", "Logística humanitaria"]
  }, {
    value: "PERSONNEL",
    labels: ["Transport de personnel", "Personnel transport", "Personentransport", "Transporte de personal"]
  }, {
    value: "CARGO",
    labels: ["Fret", "Cargo", "Fracht", "Carga"]
  }, {
    value: "COMBI",
    labels: ["Mixte passagers / fret", "Combi (passengers / cargo)", "Kombi (Passagiere / Fracht)", "Mixto (pasajeros / carga)"]
  }]
}, {
  id: "AAR",
  short: "AAR",
  letter: "R",
  military: true,
  labels: ["Ravitaillement en vol", "Air-to-air refuelling", "Luftbetankung", "Reabastecimiento en vuelo"],
  series: [{
    value: "TRAINING",
    labels: ["Entraînement / qualification", "Training / qualification", "Training / Qualifikation",
      "Entrenamiento / calificación"
    ]
  }, {
    value: "OPERATIONAL",
    labels: ["Soutien d’opération", "Operational support", "Einsatzunterstützung", "Apoyo a operaciones"]
  }, {
    value: "QRA",
    labels: ["Soutien police du ciel (QRA)", "QRA support", "QRA-Unterstützung", "Apoyo QRA"]
  }, {
    value: "DRAG",
    labels: ["Convoyage (drag) / déploiement", "Fighter drag / deployment", "Überführung (Drag) / Verlegung",
      "Traslado (drag) / despliegue"
    ]
  }, {
    value: "EXERCISE",
    labels: ["Grand exercice", "Major exercise", "Großübung", "Gran ejercicio"]
  }, {
    value: "TRIALS",
    labels: ["Essais / certification", "Trials / certification", "Erprobung / Zulassung", "Ensayos / certificación"]
  }]
}, {
  id: "MARITIME",
  short: "MARITIME",
  letter: "N",
  military: true,
  labels: ["Surveillance maritime", "Maritime surveillance", "Seeüberwachung", "Vigilancia marítima"],
  series: [{
    value: "MARPAT",
    labels: ["Patrouille maritime (MARPAT)", "Maritime patrol (MARPAT)", "Seefernaufklärung (MARPAT)",
      "Patrulla marítima (MARPAT)"
    ]
  }, {
    value: "FISHERY",
    labels: ["Police des pêches", "Fishery patrol", "Fischereiaufsicht", "Vigilancia pesquera"]
  }, {
    value: "CUSTOMS",
    labels: ["Douane maritime", "Maritime customs", "Seezoll", "Aduana marítima"]
  }, {
    value: "POLLUTION",
    labels: ["Surveillance des pollutions", "Pollution surveillance", "Verschmutzungsüberwachung",
      "Vigilancia de la contaminación"
    ]
  }, {
    value: "SHIPPING",
    labels: ["Surveillance du trafic", "Shipping surveillance", "Verkehrsüberwachung", "Vigilancia del tráfico"]
  }, {
    value: "ICE",
    labels: ["Patrouille des glaces", "Ice patrol", "Eisbeobachtung", "Patrulla de hielos"]
  }, {
    value: "SHIP_ID",
    labels: ["Identification de navires", "Ship identification", "Schiffsidentifizierung", "Identificación de buques"]
  }, {
    value: "ANTI_POLLUTION",
    labels: ["Lutte antipollution", "Anti-pollution", "Ölbekämpfung", "Lucha anticontaminación"]
  }, {
    value: "OFFSHORE",
    labels: ["Surveillance offshore", "Offshore surveillance", "Offshore-Überwachung", "Vigilancia offshore"]
  }]
}, {
  id: "HADR",
  short: "HADR",
  letter: "H",
  military: true,
  labels: ["Aide humanitaire / évacuation", "Humanitarian aid / evacuation", "Humanitäre Hilfe / Evakuierung",
    "Ayuda humanitaria / evacuación"
  ],
  series: [{
    value: "DISASTER_RELIEF",
    labels: ["Secours en cas de catastrophe", "Disaster relief", "Katastrophenhilfe", "Socorro en catástrofes"]
  }, {
    value: "FLOOD",
    labels: ["Inondation", "Flood", "Hochwasser", "Inundación"]
  }, {
    value: "EARTHQUAKE",
    labels: ["Séisme", "Earthquake", "Erdbeben", "Terremoto"]
  }, {
    value: "CYCLONE",
    labels: ["Cyclone", "Cyclone", "Zyklon", "Ciclón"]
  }, {
    value: "STORM",
    labels: ["Tempête", "Storm", "Sturm", "Tormenta"]
  }, {
    value: "VOLCANO",
    labels: ["Éruption volcanique", "Volcanic eruption", "Vulkanausbruch", "Erupción volcánica"]
  }, {
    value: "HUMANITARIAN",
    labels: ["Mission humanitaire", "Humanitarian mission", "Humanitärer Einsatz", "Misión humanitaria"]
  }, {
    value: "NEO",
    labels: ["Évacuation de ressortissants (NEO)", "Non-combatant evacuation (NEO)", "Evakuierung von Staatsangehörigen (NEO)",
      "Evacuación de no combatientes (NEO)"
    ]
  }, {
    value: "CIVIL_EVACUATION",
    labels: ["Évacuation civile", "Civil evacuation", "Zivile Evakuierung", "Evacuación civil"]
  }, {
    value: "ISOLATED_COMMUNITY",
    labels: ["Désenclavement de population isolée", "Isolated community support", "Versorgung isolierter Gemeinden",
      "Apoyo a comunidades aisladas"
    ]
  }, {
    value: "SUPPLY_DROP",
    labels: ["Ravitaillement par largage", "Supply drop", "Versorgungsabwurf", "Lanzamiento de suministros"]
  }]
}, {
  id: "AIRBORNE",
  short: "AIRBORNE",
  letter: "P",
  military: true,
  labels: ["Largage / aéroporté", "Airdrop / airborne", "Abwurf / Luftlande", "Lanzamiento / aerotransportado"],
  series: [{
    value: "PERSONNEL_PARADROP",
    labels: ["Largage de personnel", "Personnel paradrop", "Personenabsetzen", "Lanzamiento de personal"]
  }, {
    value: "CARGO_AIRDROP",
    labels: ["Largage de matériel", "Cargo airdrop", "Lastenabwurf", "Lanzamiento de carga"]
  }, {
    value: "RESUPPLY",
    labels: ["Ravitaillement", "Resupply", "Versorgung", "Reabastecimiento"]
  }, {
    value: "HUMANITARIAN_AIRDROP",
    labels: ["Largage humanitaire", "Humanitarian airdrop", "Humanitärer Abwurf", "Lanzamiento humanitario"]
  }, {
    value: "SAR_KIT_DROP",
    labels: ["Largage de kit SAR", "SAR kit drop", "SAR-Kit-Abwurf", "Lanzamiento de kit SAR"]
  }, {
    value: "TRAINING_DROP",
    labels: ["Largage d’entraînement", "Training drop", "Übungsabwurf", "Lanzamiento de instrucción"]
  }]
}, {
  id: "FI",
  short: "FI",
  letter: "V",
  military: true,
  labels: ["Contrôle en vol des aides radio", "Flight inspection (navaids)", "Flugvermessung (Navigationsanlagen)",
    "Inspección en vuelo (radioayudas)"
  ],
  series: [{
    value: "ILS",
    labels: ["ILS", "ILS", "ILS", "ILS"]
  }, {
    value: "LOC",
    labels: ["Localiser (LOC)", "Localizer (LOC)", "Landekurssender (LOC)", "Localizador (LOC)"]
  }, {
    value: "GLIDE_PATH",
    labels: ["Glide path", "Glide path", "Gleitweg", "Senda de planeo"]
  }, {
    value: "VOR",
    labels: ["VOR", "VOR", "VOR", "VOR"]
  }, {
    value: "DME",
    labels: ["DME", "DME", "DME", "DME"]
  }, {
    value: "NDB",
    labels: ["NDB", "NDB", "NDB", "NDB"]
  }, {
    value: "TACAN",
    labels: ["TACAN", "TACAN", "TACAN", "TACAN"]
  }, {
    value: "RADAR",
    labels: ["Radar", "Radar", "Radar", "Radar"]
  }, {
    value: "PAPI_VASI",
    labels: ["PAPI / VASI", "PAPI / VASI", "PAPI / VASI", "PAPI / VASI"]
  }, {
    value: "RNAV_GNSS",
    labels: ["RNAV / GNSS", "RNAV / GNSS", "RNAV / GNSS", "RNAV / GNSS"]
  }, {
    value: "PROCEDURE_VALIDATION",
    labels: ["Validation de procédure", "Procedure validation", "Verfahrensvalidierung", "Validación de procedimiento"]
  }, {
    value: "AIRPORT_LIGHTING",
    labels: ["Balisage aéroportuaire", "Airport lighting", "Flughafenbefeuerung", "Balizamiento de aeropuerto"]
  }]
}, {
  id: "SURVEY",
  short: "SURVEY",
  letter: "G",
  military: true,
  labels: ["Levés / missions scientifiques", "Survey / scientific missions", "Vermessung / Forschungsflüge",
    "Levantamientos / misiones científicas"
  ],
  series: [{
    value: "AERIAL_PHOTO",
    labels: ["Photographie aérienne", "Aerial photography", "Luftbildaufnahme", "Fotografía aérea"]
  }, {
    value: "MAPPING",
    labels: ["Cartographie", "Mapping", "Kartierung", "Cartografía"]
  }, {
    value: "LIDAR",
    labels: ["LiDAR", "LiDAR", "LiDAR", "LiDAR"]
  }, {
    value: "PHOTOGRAMMETRY",
    labels: ["Photogrammétrie", "Photogrammetry", "Photogrammetrie", "Fotogrametría"]
  }, {
    value: "GEOPHYSICS",
    labels: ["Géophysique", "Geophysics", "Geophysik", "Geofísica"]
  }, {
    value: "ATMOSPHERIC",
    labels: ["Recherche atmosphérique", "Atmospheric research", "Atmosphärenforschung", "Investigación atmosférica"]
  }, {
    value: "WEATHER_RECON",
    labels: ["Reconnaissance météo", "Weather reconnaissance", "Wettererkundung", "Reconocimiento meteorológico"]
  }, {
    value: "VOLCANO",
    labels: ["Surveillance volcanique", "Volcano monitoring", "Vulkanüberwachung", "Vigilancia volcánica"]
  }, {
    value: "WILDLIFE",
    labels: ["Faune", "Wildlife", "Tierwelt", "Fauna"]
  }, {
    value: "ENVIRONMENT",
    labels: ["Environnement", "Environment", "Umwelt", "Medio ambiente"]
  }, {
    value: "ICE",
    labels: ["Glaces", "Ice", "Eis", "Hielo"]
  }, {
    value: "OCEANOGRAPHIC",
    labels: ["Océanographie", "Oceanographic", "Ozeanographie", "Oceanografía"]
  }]
}, {
  id: "LE",
  short: "LE",
  letter: "L",
  military: true,
  labels: ["Police / douane / sécurité", "Police / customs / security", "Polizei / Zoll / Sicherheit",
    "Policía / aduana / seguridad"
  ],
  series: [{
    value: "POLICE_OBSERVATION",
    labels: ["Observation police", "Police observation", "Polizeiliche Beobachtung", "Observación policial"]
  }, {
    value: "GENDARMERIE",
    labels: ["Gendarmerie", "Gendarmerie", "Gendarmerie", "Gendarmería"]
  }, {
    value: "BORDER",
    labels: ["Surveillance des frontières", "Border surveillance", "Grenzüberwachung", "Vigilancia de fronteras"]
  }, {
    value: "CUSTOMS",
    labels: ["Douane", "Customs", "Zoll", "Aduana"]
  }, {
    value: "TRAFFIC",
    labels: ["Circulation routière", "Traffic", "Verkehrsüberwachung", "Tráfico"]
  }, {
    value: "PURSUIT",
    labels: ["Poursuite", "Pursuit", "Verfolgung", "Persecución"]
  }, {
    value: "MISSING_PERSON",
    labels: ["Personne disparue", "Missing person", "Vermisste Person", "Persona desaparecida"]
  }, {
    value: "TACTICAL_SUPPORT",
    labels: ["Appui tactique", "Tactical support", "Taktische Unterstützung", "Apoyo táctico"]
  }, {
    value: "EVENT_SECURITY",
    labels: ["Sécurité d’événement", "Event security", "Veranstaltungsschutz", "Seguridad de eventos"]
  }]
}, {
  id: "ISR",
  short: "ISR",
  letter: "I",
  military: true,
  labels: ["Renseignement / reconnaissance", "Intelligence / reconnaissance", "Aufklärung / Nachrichtengewinnung",
    "Inteligencia / reconocimiento"
  ],
  series: [{
    value: "ISR",
    labels: ["ISR", "ISR", "ISR", "ISR"]
  }, {
    value: "RECON",
    labels: ["Reconnaissance", "Reconnaissance", "Aufklärung", "Reconocimiento"]
  }, {
    value: "EO_IR",
    labels: ["EO/IR", "EO/IR", "EO/IR", "EO/IR"]
  }, {
    value: "IMINT",
    labels: ["IMINT (imagerie)", "IMINT (imagery)", "IMINT (Bildaufklärung)", "IMINT (imágenes)"]
  }, {
    value: "SIGINT",
    labels: ["SIGINT", "SIGINT", "SIGINT", "SIGINT"]
  }, {
    value: "ELINT",
    labels: ["ELINT", "ELINT", "ELINT", "ELINT"]
  }, {
    value: "COMINT",
    labels: ["COMINT", "COMINT", "COMINT", "COMINT"]
  }, {
    value: "BORDER_ISR",
    labels: ["ISR frontalier", "Border ISR", "Grenzaufklärung", "ISR fronterizo"]
  }, {
    value: "MARITIME_ISR",
    labels: ["ISR maritime", "Maritime ISR", "Seeaufklärung", "ISR marítimo"]
  }, {
    value: "INFRASTRUCTURE_ISR",
    labels: ["ISR infrastructures", "Infrastructure ISR", "Infrastrukturaufklärung", "ISR de infraestructuras"]
  }]
}, {
  id: "COMMAND",
  short: "COMMAND",
  letter: "C",
  military: true,
  labels: ["Commandement / police du ciel / guet aérien", "Command / air policing / early warning",
    "Führung / Luftpolizeidienst / Frühwarnung", "Mando / policía aérea / alerta temprana"
  ],
  series: [{
    value: "AIR_POLICING",
    labels: ["Police du ciel / interception (QRA, MASA)", "Air policing / interception (QRA)",
      "Luftpolizeidienst / Abfangen (QRA)", "Policía aérea / interceptación (QRA)"
    ]
  }, {
    value: "AIRBORNE_COMMAND",
    labels: ["Poste de commandement aéroporté", "Airborne command", "Luftgestützte Führung", "Mando aerotransportado"]
  }, {
    value: "AEW",
    labels: ["Guet aérien avancé (AEW)", "Airborne early warning (AEW)", "Luftgestützte Frühwarnung (AEW)",
      "Alerta temprana aérea (AEW)"
    ]
  }, {
    value: "AIR_COORDINATION",
    labels: ["Coordination aérienne", "Air coordination", "Luftkoordination", "Coordinación aérea"]
  }, {
    value: "COMM_RELAY",
    labels: ["Relais de communications", "Communications relay", "Kommunikationsrelais", "Retransmisión de comunicaciones"]
  }, {
    value: "DISASTER_RELAY",
    labels: ["Relais catastrophe", "Disaster relay", "Katastrophenrelais", "Retransmisión en catástrofes"]
  }, {
    value: "FIRE_COORDINATION",
    labels: ["Coordination feux de forêt", "Fire coordination", "Waldbrandkoordination", "Coordinación de incendios"]
  }, {
    value: "SAR_COORDINATION",
    labels: ["Coordination SAR", "SAR coordination", "SAR-Koordination", "Coordinación SAR"]
  }]
}, {
  id: "COMBAT",
  short: "COMBAT",
  letter: "A",
  military: true,
  labels: ["Combat aérien / entraînement chasse", "Air combat / fighter training", "Luftkampf / Jagdflugausbildung",
    "Combate aéreo / entrenamiento de caza"
  ],
  series: [{
    value: "BFM",
    labels: ["BFM — combat rapproché (manœuvres de base)", "BFM — basic fighter manoeuvres", "BFM — Grundmanöver des Luftkampfs",
      "BFM — maniobras básicas de caza"
    ]
  }, {
    value: "ACM",
    labels: ["ACM — combat aérien manœuvrant", "ACM — air combat manoeuvring", "ACM — Luftkampfmanöver",
      "ACM — maniobras de combate aéreo"
    ]
  }, {
    value: "DACT",
    labels: ["DACT — adversaire dissemblable", "DACT — dissimilar air combat training",
      "DACT — Luftkampf gegen ungleiches Muster", "DACT — combate aéreo disimilar"
    ]
  }, {
    value: "INTERCEPT",
    labels: ["Interception / identification (VID)", "Interception / identification (VID)", "Abfangen / Identifizierung (VID)",
      "Interceptación / identificación (VID)"
    ]
  }]
}, {
  id: "SOF",
  short: "SOF",
  letter: "O",
  military: true,
  labels: ["Opérations spéciales / tactiques", "Special / tactical operations", "Spezial- / taktische Operationen",
    "Operaciones especiales / tácticas"
  ],
  series: [{
    value: "INSERTION",
    labels: ["Insertion", "Insertion", "Absetzen", "Inserción"]
  }, {
    value: "EXTRACTION",
    labels: ["Extraction", "Extraction", "Aufnahme", "Extracción"]
  }, {
    value: "INFILTRATION",
    labels: ["Infiltration", "Infiltration", "Infiltration", "Infiltración"]
  }, {
    value: "EXFILTRATION",
    labels: ["Exfiltration", "Exfiltration", "Exfiltration", "Exfiltración"]
  }, {
    value: "TACTICAL_TRANSPORT",
    labels: ["Transport tactique", "Tactical transport", "Taktischer Transport", "Transporte táctico"]
  }, {
    value: "SR_SUPPORT",
    labels: ["Appui reconnaissance spéciale", "Special reconnaissance support", "Unterstützung Spezialaufklärung",
      "Apoyo a reconocimiento especial"
    ]
  }, {
    value: "FAST_ROPE",
    labels: ["Corde lisse", "Fast rope", "Fast Rope", "Cuerda rápida"]
  }, {
    value: "RAPPEL",
    labels: ["Rappel", "Rappel", "Abseilen", "Rápel"]
  }, {
    value: "PARACHUTE_INSERTION",
    labels: ["Insertion par parachute", "Parachute insertion", "Fallschirmabsetzen", "Inserción en paracaídas"]
  }, {
    value: "LZ_INSERTION",
    labels: ["Insertion sur LZ", "Landing zone insertion", "Absetzen in LZ", "Inserción en LZ"]
  }, {
    value: "SHIP_INSERTION",
    labels: ["Insertion sur navire", "Ship insertion", "Absetzen auf Schiff", "Inserción en buque"]
  }]
}, {
  id: "SPECIAL",
  short: "SPECIAL",
  letter: "X",
  military: true,
  labels: ["Transport spécial / essais / formation", "Special transport / trials / training",
    "Sondertransport / Erprobung / Ausbildung", "Transporte especial / ensayos / formación"
  ],
  series: [{
    value: "VIP-VIP",
    labels: ["VIP — transport VIP", "VIP — VIP transport", "VIP — VIP-Transport", "VIP — transporte VIP"]
  }, {
    value: "VIP-VVIP",
    labels: ["VIP — transport VVIP", "VIP — VVIP transport", "VIP — VVIP-Transport", "VIP — transporte VVIP"]
  }, {
    value: "VIP-STATE",
    labels: ["VIP — vol d’État", "VIP — state flight", "VIP — Staatsflug", "VIP — vuelo de Estado"]
  }, {
    value: "VIP-GOVERNMENT",
    labels: ["VIP — mission gouvernementale", "VIP — government mission", "VIP — Regierungsflug", "VIP — misión gubernamental"]
  }, {
    value: "FERRY-TRANSFER",
    labels: ["Convoyage — transfert d’appareil", "Ferry — aircraft transfer", "Überführung — Luftfahrzeugtransfer",
      "Traslado — transferencia de aeronave"
    ]
  }, {
    value: "FERRY-MAINTENANCE",
    labels: ["Convoyage — mise en place maintenance", "Ferry — maintenance positioning", "Überführung — Wartungspositionierung",
      "Traslado — posicionamiento para mantenimiento"
    ]
  }, {
    value: "FERRY-DELIVERY",
    labels: ["Convoyage — livraison", "Ferry — delivery", "Überführung — Auslieferung", "Traslado — entrega"]
  }, {
    value: "FERRY-RTB",
    labels: ["Convoyage — retour base", "Ferry — return to base", "Überführung — Rückkehr zur Basis",
      "Traslado — regreso a la base"
    ]
  }, {
    value: "TEST-DEVELOPMENT",
    labels: ["Essai — développement", "Test — development", "Erprobung — Entwicklung", "Ensayo — desarrollo"]
  }, {
    value: "TEST-ACCEPTANCE",
    labels: ["Essai — réception", "Test — acceptance", "Erprobung — Abnahme", "Ensayo — aceptación"]
  }, {
    value: "TEST-MCF",
    labels: ["Essai — vol de contrôle maintenance", "Test — maintenance check flight", "Erprobung — Werkstattflug",
      "Ensayo — vuelo de control de mantenimiento"
    ]
  }, {
    value: "TEST-FCF",
    labels: ["Essai — vol de contrôle fonctionnel", "Test — functional check flight", "Erprobung — Funktionsprüfflug",
      "Ensayo — vuelo de control funcional"
    ]
  }, {
    value: "TEST-CERTIFICATION",
    labels: ["Essai — certification", "Test — certification", "Erprobung — Zulassung", "Ensayo — certificación"]
  }, {
    value: "TRAINING-IFR",
    labels: ["Formation — IFR", "Training — IFR", "Ausbildung — IFR", "Formación — IFR"]
  }, {
    value: "TRAINING-VFR",
    labels: ["Formation — VFR", "Training — VFR", "Ausbildung — VFR", "Formación — VFR"]
  }, {
    value: "TRAINING-NIGHT",
    labels: ["Formation — vol de nuit", "Training — night", "Ausbildung — Nachtflug", "Formación — vuelo nocturno"]
  }, {
    value: "TRAINING-NVG",
    labels: ["Formation — NVG", "Training — NVG", "Ausbildung — NVG", "Formación — NVG"]
  }, {
    value: "TRAINING-SAR",
    labels: ["Formation — SAR", "Training — SAR", "Ausbildung — SAR", "Formación — SAR"]
  }, {
    value: "TRAINING-HOIST",
    labels: ["Formation — treuillage", "Training — hoist", "Ausbildung — Winde", "Formación — grúa"]
  }, {
    value: "TRAINING-SHIPBOARD",
    labels: ["Formation — appontage", "Training — shipboard", "Ausbildung — Bordlandung", "Formación — operaciones embarcadas"]
  }, {
    value: "TRAINING-PARADROP",
    labels: ["Formation — largage de personnel", "Training — paradrop", "Ausbildung — Personenabsetzen",
      "Formación — lanzamiento de personal"
    ]
  }, {
    value: "TRAINING-AIRDROP",
    labels: ["Formation — largage de matériel", "Training — airdrop", "Ausbildung — Lastenabwurf",
      "Formación — lanzamiento de carga"
    ]
  }, {
    value: "TRAINING-LOW_LEVEL",
    labels: ["Formation — très basse altitude", "Training — low level", "Ausbildung — Tiefflug", "Formación — baja cota"]
  }, {
    value: "TRAINING-FORMATION",
    labels: ["Formation — vol en patrouille", "Training — formation flying", "Ausbildung — Formationsflug",
      "Formación — vuelo en formación"
    ]
  }, {
    value: "TRAINING-INSTRUMENT",
    labels: ["Formation — instruments", "Training — instrument", "Ausbildung — Instrumentenflug", "Formación — instrumental"]
  }, {
    value: "TRAINING-CHECKRIDE",
    labels: ["Formation — contrôle en vol (checkride)", "Training — checkride", "Ausbildung — Überprüfungsflug",
      "Formación — vuelo de verificación"
    ]
  }]
}, {
  id: 'COMMERCIAL',
  short: 'CAT',
  letter: 'E',
  military: false,
  labels: ["Transport aérien commercial", "Commercial air transport", "Gewerblicher Luftverkehr", "Transporte aéreo comercial"],
  series: [{
    value: "CARGO",
    labels: ["Fret", "Cargo", "Fracht", "Carga"],
    load: "freight"
  }, {
    value: "PASSENGERS",
    labels: ["Passagers", "Passengers", "Passagiere", "Pasajeros"],
    load: "passengers"
  }, {
    value: "EMPTY_LEG",
    labels: ["Rapatriement à vide", "Empty repositioning", "Leerüberführung", "Reposicionamiento en vacío"]
  }, {
    value: "VIP",
    labels: ["VIP", "VIP", "VIP", "VIP"],
    load: "passengers"
  }, {
    value: "TRAINING",
    labels: ["Entraînement", "Training", "Training", "Entrenamiento"]
  }, {
    value: "TRANSIT",
    labels: ["Transit", "Transit", "Transit", "Tránsito"]
  }, {
    value: "FLIGHT_TEST",
    labels: ["Essais en vol", "Flight test", "Flugerprobung", "Ensayos en vuelo"]
  }]
}]);
export const MILITARY = Object.freeze(THEMES.filter(t => t.military).map(t => t.id));
export const ALIASES = Object.freeze({
  MEDEVAC: 'HEMS'
});
/** Les noms ×4 des familles, comme le vocabulaire du compte rendu les avait (familyLabels) : les seize militaires et COMMERCIAL. */
export const LABELS = Object.freeze(Object.fromEntries(THEMES.map(t => [t.id, t.labels])));
/** Les lettres des numéros de compte rendu (familyLetters) : celles des thèmes, plus les anciens codes que la V2 numérotait. */
export const LETTERS = Object.freeze({
  ...Object.fromEntries(THEMES.map(t => [t.id, t.letter])),
  MEDEVAC: 'M',
  DEMO: 'D'
});
const at = lang => Math.max(0, LANGS.indexOf(lang));
/** Le thème d'un code (alias compris) ou null. */
export function themeOf(code) {
  const k = String(code ?? '').trim().toUpperCase();
  return THEMES.find(t => t.id === k || t.id === ALIASES[k]) || null;
}
/** Les séries d'un thème, dans la forme des familles du compte rendu : [{ value, label: [fr, en, de, es] }] ; [] pour un code inconnu. */
export function seriesOf(code) {
  return (themeOf(code)?.series || []).map(s => ({
    value: s.value,
    label: s.labels
  }));
}
/** Les thèmes dans une langue : [{ id, short, name, label }] (label : « SAR · Récupération de personnel », le sigle d'abord). */
export function themes(lang = 'fr') {
  return THEMES.map(t => {
    const name = String(t.labels[at(lang)] ?? t.labels[0]),
      rest = name.toUpperCase().startsWith(t.short) && /^\s*[/—–-]/.test(name.slice(t.short.length)) ? name.slice(t.short.length)
      .replace(/^\s*[/—–-]\s*/, '') : name,
      long = rest ? rest.charAt(0).toLocaleUpperCase() + rest.slice(1) : '';
    return {
      id: t.id,
      short: t.short,
      name: long,
      label: long ? `${t.short} · ${long}` : t.short
    };
  });
}
// ---------------------------------------------------------------- le fichier d'une compagnie (entrée non fiable)
const text = v => typeof v === 'string' ? v.replace(/[\p{Cc}\p{Zl}\p{Zp}<>]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, LABEL_MAX) : '';
const labels4 = v => {
  const a = Array.isArray(v) ? v : [];
  const fr = text(a[0]);
  return fr ? LANGS.map((_, i) => text(a[i]) || fr) : null;
};
/** Le fichier d'une compagnie, filtré et borné (voir l'en-tête) ; null sans fichier lisible. */
export function cleanThemes(doc) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return null;
  const taken = new Set(THEMES.map(t => t.id)),
    added = [];
  for (const t of (Array.isArray(doc.added?.themes) ? doc.added.themes : []).slice(0, 40)) {
    const id = String(t?.id ?? '').trim().toUpperCase(),
      short = String(t?.short ?? id).trim().toUpperCase(),
      lb = labels4(t?.labels);
    if (!THEME_ID.test(id) || taken.has(id) || !SHORT.test(short) || !lb || added.length >= ADDED_MAX.themes) continue;
    taken.add(id);
    added.push({
      id,
      short,
      labels: lb
    });
  }
  const series = {},
    src = doc.added?.series && typeof doc.added.series === 'object' && !Array.isArray(doc.added.series) ? doc.added.series : {};
  for (const [k, list] of Object.entries(src).slice(0, 40)) {
    const id = String(k).trim().toUpperCase();
    if (!taken.has(id) || !Array.isArray(list)) continue;
    const have = new Set((themeOf(id)?.series || []).map(s => s.value)),
      out = [];
    for (const s of list.slice(0, 80)) {
      const v = String(s?.value ?? '').trim(),
        lb = labels4(s?.labels);
      if (!SERIES_ID.test(v) || have.has(v) || !lb || out.length >= ADDED_MAX.seriesPerTheme) continue;
      have.add(v);
      out.push({
        value: v,
        labels: lb
      });
    }
    if (out.length) series[id] = out;
  }
  const chosen = Array.isArray(doc.chosen) ? [...new Set(doc.chosen.map(x => String(x ?? '').trim().toUpperCase()).filter(x => taken.has(
    x)))] : null;
  return {
    chosen,
    added: {
      themes: added,
      series
    }
  };
}
/** Les thèmes cochés d'avance par le genre (voir l'en-tête). */
export function defaultChosen(kind) {
  if (kind === 'va') return ['COMMERCIAL'];
  if (kind === 'sog') return [...MILITARY];
  return THEMES.map(t => t.id);
}
/** Les thèmes d'une compagnie : ceux de son fichier (filtré), sinon ceux du genre. */
export function chosenOf(doc, kind) {
  const c = cleanThemes(doc);
  return c?.chosen ? c.chosen : defaultChosen(kind);
}
// ---------------------------------------------------------------- T2 : ce que lisent Carburant, le compte rendu et Missions (§ 10.48)
/** Les identifiants de catégorie de SOG-0041 (frame/lib/mission_categories.js, base commune) et leur thème / série : une mission ou un vol
 *  qui porte encore une catégorie est lu avec son thème (« fret » → COMMERCIAL / CARGO) ; rien n'est réécrit. */
export const MIGRATION = Object.freeze({
  fret: Object.freeze(['COMMERCIAL', 'CARGO']),
  passagers: Object.freeze(['COMMERCIAL', 'PASSENGERS']),
  positionnement: Object.freeze(['COMMERCIAL', 'EMPTY_LEG']),
  vip: Object.freeze(['COMMERCIAL', 'VIP']),
  training: Object.freeze(['COMMERCIAL', 'TRAINING']),
  transit: Object.freeze(['COMMERCIAL', 'TRANSIT']),
  'essais-en-vol': Object.freeze(['COMMERCIAL', 'FLIGHT_TEST'])
});
/** Le thème et la série d'une ancienne catégorie : { theme, series } ou null. */
export function fromCategory(id) {
  const m = MIGRATION[String(id ?? '').trim()];
  return m ? {
    theme: m[0],
    series: m[1]
  } : null;
}
/** Ce que transporte un vol d'une série (« freight », « passengers ») ; '' sans charge, ou pour une série inconnue. */
export function loadOf(theme, series) {
  return themeOf(theme)?.series.find(s => s.value === series)?.load || '';
}
/** La série d'un thème qui répond à un texte (la valeur, ou un libellé ×4, sans casse) : le sous-type d'une mission (« GAAR ») ; '' sinon. */
export function seriesFor(theme, text) {
  const k = String(text ?? '').trim().toLowerCase();
  if (!k) return '';
  return themeOf(theme)?.series.find(s => s.value.toLowerCase() === k || s.labels.some(l => String(l).toLowerCase() === k))?.value || '';
}
/** Les thèmes d'une compagnie pour une liste (Carburant, le compte rendu) : ceux qu'elle a choisis (son fichier, sinon son genre), dans
 *  l'ordre de la table, puis ceux qu'elle a ajoutés ; chacun avec ses séries (les ajoutées à la suite) — [{ id, short, labels, added,
 *  series: [{ value, labels, load }] }]. `keep` : un thème à garder même s'il n'est pas choisi (celui du vol ou du compte rendu). */
export function forAirline(doc, kind, keep = '') {
  const c = cleanThemes(doc),
    chosen = new Set(c?.chosen || defaultChosen(kind)),
    k = String(keep || '').toUpperCase(),
    more = c?.added?.series || {},
    out = THEMES.filter(t => chosen.has(t.id) || t.id === k).map(t => ({
      id: t.id,
      short: t.short,
      labels: t.labels,
      added: false,
      series: [...t.series.map(s => ({
        value: s.value,
        labels: s.labels,
        load: s.load || ''
      })), ...(more[t.id] || []).map(s => ({
        ...s,
        load: ''
      }))]
    }));
  for (const t of c?.added?.themes || [])
    if (chosen.has(t.id) || t.id === k) out.push({
      id: t.id,
      short: t.short,
      labels: t.labels,
      added: true,
      series: (more[t.id] || []).map(s => ({
        ...s,
        load: ''
      }))
    });
  return out;
}
