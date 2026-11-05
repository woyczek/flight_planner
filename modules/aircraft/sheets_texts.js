// Textes de la vue « Fiches » de Maintenance : [fr, en, de, es]. Les lignes de l'éditeur sont celles de Fuel (modules/fuel/module.js,
// V3 § 10.34 lot A2, étape 3), copiées avec le code ; Fuel garde les siennes jusqu'au retrait de son éditeur.

export const TX = {
  import: ['Importer un fichier', 'Import a file', 'Datei importieren', 'Importar un archivo'],
  paste: ['Coller un texte', 'Paste a text', 'Text einfügen', 'Pegar un texto'],
  newSheet: ['Nouvelle fiche', 'New sheet', 'Neues Datenblatt', 'Nueva ficha'],
  sheetCats: {
    helico: ['Hélicoptères', 'Helicopters', 'Hubschrauber', 'Helicópteros'],
    turboprop: ['Turbopropulseurs', 'Turboprops', 'Turboprops', 'Turbohélices'],
    jet: ['Réacteurs', 'Jets', 'Strahlflugzeuge', 'Reactores'],
    piston: ['Pistons', 'Piston engines', 'Kolbenmotoren', 'Pistón'],
    other: ['Autres', 'Others', 'Andere', 'Otros']
  },
  coType: ['Type de la compagnie ({n} appareil(s)) : performances à renseigner',
    'Company type ({n} aircraft): performance to fill in', 'Typ der Fluggesellschaft ({n} Luftfahrzeug(e)): Leistungen einzutragen',
    'Tipo de la compañía ({n} aeronave(s)): rendimientos por completar'
  ],
  createSheet: ['Créer la fiche', 'Create the sheet', 'Datenblatt anlegen', 'Crear la ficha'],
  sheetsIntro: ['Fiches de la base partagée ; chaque changement est montré avant d’être écrit.',
    'Sheets of the shared database; every change is shown before it is written.',
    'Datenblätter der gemeinsamen Datenbank; jede Änderung wird vor dem Schreiben gezeigt.',
    'Fichas de la base compartida; cada cambio se muestra antes de escribirse.'
  ],
  missing: ['À compléter : {list}', 'To complete: {list}', 'Zu ergänzen: {list}', 'Por completar: {list}'],
  missingFamily: {
    rpm: ['régimes', 'rpm', 'Drehzahlen', 'regímenes'],
    speeds: ['vitesses', 'speeds', 'Geschwindigkeiten', 'velocidades'],
    cruise: ['croisière', 'cruise', 'Reiseflug', 'crucero'],
    rates: ['varios', 'rates', 'Steigraten', 'velocidades verticales'],
    flows: ['débits', 'fuel flows', 'Verbräuche', 'consumos'],
    taxi: ['roulage', 'taxi', 'Rollen', 'rodaje'],
    runway: ['piste', 'runway', 'Piste', 'pista'],
    fuel: ['carburant', 'fuel', 'Kraftstoff', 'combustible'],
    aircraft: ['appareil', 'aircraft', 'Luftfahrzeug', 'aeronave'],
    other: ['divers', 'other', 'Sonstiges', 'otros']
  },
  complete: ['complète', 'complete', 'vollständig', 'completa'],
  auto: ['auto', 'auto', 'auto', 'auto'],
  updated: ['mise à jour {d}', 'updated {d}', 'aktualisiert {d}', 'actualizada {d}'],
  edit: ['Modifier', 'Edit', 'Bearbeiten', 'Editar'],
  back: ['← Fiches', '← Sheets', '← Datenblätter', '← Fichas'],
  save: ['Enregistrer', 'Save', 'Speichern', 'Guardar'],
  saved: ['Fiche enregistrée : elle partira à la prochaine synchronisation.', 'Sheet saved: it will leave at the next synchronisation.',
    'Datenblatt gespeichert: es geht bei der nächsten Synchronisation hinaus.', 'Ficha guardada: saldrá en la próxima sincronización.'
  ],
  eurocontrol: ['Compléter (EUROCONTROL)', 'Complete (EUROCONTROL)', 'Ergänzen (EUROCONTROL)', 'Completar (EUROCONTROL)'],
  noApd: ['Pas de fiche EUROCONTROL pour ce type.', 'No EUROCONTROL record for this type.', 'Kein EUROCONTROL-Datensatz für diesen Typ.',
    'Ninguna ficha EUROCONTROL para este tipo.'
  ],
  fillFrom: ['Compléter depuis une autre fiche', 'Complete from another sheet', 'Aus anderem Datenblatt ergänzen',
    'Completar desde otra ficha'
  ],
  pasted: ['texte collé', 'pasted text', 'eingefügter Text', 'texto pegado'],
  typeCode: ['Code OACI du type', 'ICAO type code', 'ICAO-Typcode', 'Código OACI del tipo'],
  gpt: ['ChatGPT', 'ChatGPT', 'ChatGPT', 'ChatGPT'],
  // un geste comme en V2 (SOG-0014) : la demande copiée ET ChatGPT ouvert dans un nouvel onglet ; retour par collage de la réponse
  gptPrompt: ['Compléter avec ChatGPT', 'Complete with ChatGPT', 'Mit ChatGPT vervollständigen', 'Completar con ChatGPT'],
  gptMissing: ['ChatGPT : les champs vides seulement', 'ChatGPT: the empty fields only', 'ChatGPT: nur die leeren Felder',
    'ChatGPT: solo los campos vacíos'
  ],
  copyManual: ['Copie impossible ici : le texte est sélectionné, copiez-le (Ctrl+C ou appui long).',
    'Copying is not possible here: the text is selected, copy it (Ctrl+C or long press).',
    'Kopieren ist hier nicht möglich: Der Text ist markiert, kopieren Sie ihn (Strg+C oder lange drücken).',
    'Aquí no se puede copiar: el texto está seleccionado, cópielo (Ctrl+C o pulsación larga).'
  ],
  copied: ['Demande copiée et ChatGPT ouvert : collez-la si elle n’y est pas, puis collez sa réponse ci-dessous.',
    'Request copied and ChatGPT opened: paste it there if it is not, then paste its answer below.',
    'Anfrage kopiert und ChatGPT geöffnet: dort einfügen, falls sie fehlt, dann die Antwort unten einfügen.',
    'Petición copiada y ChatGPT abierto: péguela si no está, luego pegue su respuesta abajo.'
  ],
  gptReply: ['Réponse de ChatGPT (telle quelle)', 'ChatGPT’s answer (as is)', 'Antwort von ChatGPT (unverändert)',
    'Respuesta de ChatGPT (tal cual)'
  ],
  read: ['Lire', 'Read', 'Lesen', 'Leer'],
  exportLnm: ['Exporter .lnmperf', 'Export .lnmperf', '.lnmperf exportieren', 'Exportar .lnmperf'],
  exportJson: ['Exporter JSON', 'Export JSON', 'JSON exportieren', 'Exportar JSON'],
  remove: ['Supprimer', 'Delete', 'Löschen', 'Eliminar'],
  removeAsk: ['Supprimer la fiche « {n} » de la base partagée ?', 'Delete the sheet “{n}” from the shared database?',
    'Datenblatt „{n}“ aus der gemeinsamen Datenbank löschen?', '¿Eliminar la ficha «{n}» de la base compartida?'
  ],
  rpmAdd: ['+ Ligne', '+ Row', '+ Zeile', '+ Fila'],
  rpmGone: ['retirée', 'removed', 'entfernt', 'retirada'],
  rpmTable: ['Table régime / débit', 'RPM / fuel flow table', 'Drehzahl-/Verbrauchstabelle', 'Tabla régimen / consumo'],
  review: ['Changements proposés', 'Proposed changes', 'Vorgeschlagene Änderungen', 'Cambios propuestos'],
  // une courbe régime / débit qui redescend (SOG-0015 : la S210 portait 11 500 lb/h à 6 700 rpm, plus qu'en croisière à 7 250 rpm)
  rpmNotMonotone: ['Débit à {a} rpm supérieur à celui de {b} rpm : fourchette mal lue ?',
    'Fuel flow at {a} rpm above the one at {b} rpm: a range misread?',
    'Verbrauch bei {a} U/min höher als bei {b} U/min: Spanne falsch gelesen?',
    'Consumo a {a} rpm superior al de {b} rpm: ¿horquilla mal leída?'
  ],
  outOfRange: ['« {f} » : {v} hors de la plage {min} à {max} ; rien n’est enregistré.',
    '“{f}”: {v} outside {min} to {max}; nothing is saved.',
    '„{f}“: {v} außerhalb von {min} bis {max}; nichts wird gespeichert.', '«{f}»: {v} fuera de {min} a {max}; no se guarda nada.'
  ],
  // import de plusieurs fiches : la fiche de l'aperçu et son rang (« EC45 · 8 / 13 »), puis le bilan de la file
  reviewOf: ['Changements proposés : {n}', 'Proposed changes: {n}', 'Vorgeschlagene Änderungen: {n}', 'Cambios propuestos: {n}'],
  batchDone: ['Import terminé : {a} fiche(s) écrite(s), {s} sans changement, {k} passée(s).',
    'Import finished: {a} sheet(s) written, {s} unchanged, {k} skipped.',
    'Import abgeschlossen: {a} Datenblatt/-blätter geschrieben, {s} unverändert, {k} übersprungen.',
    'Importación terminada: {a} ficha(s) escrita(s), {s} sin cambios, {k} omitida(s).'
  ],
  skipSheet: ['Passer cette fiche', 'Skip this sheet', 'Dieses Datenblatt überspringen', 'Omitir esta ficha'],
  reviewNew: ['Nouvelle fiche « {n} »', 'New sheet “{n}”', 'Neues Datenblatt „{n}“', 'Nueva ficha «{n}»'],
  reviewNone: ['Rien ne change.', 'Nothing changes.', 'Nichts ändert sich.', 'Nada cambia.'],
  field: ['Champ', 'Field', 'Feld', 'Campo'],
  before: ['Avant', 'Before', 'Vorher', 'Antes'],
  after: ['Après', 'After', 'Nachher', 'Después'],
  apply: ['Appliquer la sélection', 'Apply the selection', 'Auswahl übernehmen', 'Aplicar la selección'],
  cancel: ['Annuler', 'Cancel', 'Abbrechen', 'Cancelar'],
  added: ['ajoutée', 'added', 'hinzugefügt', 'añadida'],
  replaced: ['remplacée', 'replaced', 'ersetzt', 'sustituida'],
  imported: ['{n} fiche(s) lue(s) dans {f}.', '{n} sheet(s) read from {f}.', '{n} Datenblatt/-blätter aus {f} gelesen.',
    '{n} ficha(s) leída(s) de {f}.'
  ],
  unreadable: ['{f} : format non reconnu ({e}).', '{f}: format not recognised ({e}).', '{f}: Format nicht erkannt ({e}).',
    '{f}: formato no reconocido ({e}).'
  ],
  pasteAsk: ['Collez une fiche (JSON, CSV de performances, .lnmperf) ou une réponse de ChatGPT :',
    'Paste a sheet (JSON, performance CSV, .lnmperf) or a ChatGPT answer:',
    'Datenblatt (JSON, Leistungs-CSV, .lnmperf) oder ChatGPT-Antwort einfügen:',
    'Pegue una ficha (JSON, CSV de rendimiento, .lnmperf) o una respuesta de ChatGPT:'
  ],
  taxi: ['Roulage', 'Taxi', 'Rollen', 'Rodaje'],
  climb: ['Montée', 'Climb', 'Steigflug', 'Ascenso'],
  cruise: ['Croisière', 'Cruise', 'Reiseflug', 'Crucero'],
  descent: ['Descente', 'Descent', 'Sinkflug', 'Descenso'],
  reserve: ['Réserve', 'Reserve', 'Reserve', 'Reserva'],
  contPct: ['Contingence (%)', 'Contingency (%)', 'Zuschlag (%)', 'Contingencia (%)'],
  altn: ['Dégagement', 'Alternate', 'Ausweich', 'Alternativo'],
  // ajouts de Maintenance
  noSheet: ['Aucune fiche pour l’instant : importez-en une ou créez-en une.', 'No sheet yet: import one or create one.',
    'Noch kein Datenblatt: eines importieren oder anlegen.', 'Ninguna ficha todavía: importe una o cree una.'
  ],
  loading: ['Chargement des fiches…', 'Loading sheets…', 'Datenblätter werden geladen…', 'Cargando fichas…'],
  noAero: ['La base des aéronefs n’est pas disponible.', 'The aircraft database is not available.',
    'Die Luftfahrzeugdatenbank ist nicht verfügbar.', 'La base de aeronaves no está disponible.'
  ],
  search: ['Rechercher (nom, type, immatriculation)', 'Search (name, type, registration)', 'Suchen (Name, Typ, Kennzeichen)',
    'Buscar (nombre, tipo, matrícula)'
  ],
  noHit: ['Aucune fiche ne correspond.', 'No sheet matches.', 'Kein Datenblatt passt.', 'Ninguna ficha coincide.'],
  originKept: ['Valeurs écartées : {l}', 'Discarded values: {l}', 'Verworfene Werte: {l}', 'Valores descartados: {l}']
};

// libellés des champs de fiche (PROFILE_FIELDS de la V2, en français) : groupes, puis libellés, puis préfixes « X · »
export const FIELD_TX = {
  'Identité et format': ['Identité et format', 'Identity and format', 'Identität und Format', 'Identidad y formato'],
  'Carburant et opération': ['Carburant et opération', 'Fuel and operation', 'Kraftstoff und Betrieb', 'Combustible y operación'],
  'Piste et alternat': ['Piste et dégagement', 'Runway and alternate', 'Piste und Ausweichflughafen', 'Pista y alternativo'],
  'Montée': TX.climb,
  'Croisière': TX.cruise,
  'Descente': TX.descent,
  'Régime et consommation': ['Régime et consommation', 'RPM and fuel flow', 'Drehzahl und Verbrauch', 'Régimen y consumo'],
  'Maintenance et coût': ['Maintenance et coût', 'Maintenance and cost', 'Wartung und Kosten', 'Mantenimiento y coste'],
  'Révision rapide tous les (h)': ['Révision rapide tous les (h)', 'Check every (h)', 'Kleine Inspektion alle (h)',
    'Revisión menor cada (h)'
  ],
  'Grande révision tous les (h)': ['Grande révision tous les (h)', 'Overhaul every (h)', 'Grundüberholung alle (h)',
    'Revisión general cada (h)'
  ],
  'Coût horaire (par heure bloc)': ['Coût horaire (par heure bloc)', 'Hourly cost (per block hour)', 'Stundenkosten (pro Blockstunde)',
    'Coste horario (por hora calzo)'
  ],
  'Densité du carburant (kg/L)': ['Densité du carburant (kg/L)', 'Fuel density (kg/L)', 'Kraftstoffdichte (kg/L)',
    'Densidad del combustible (kg/L)'
  ],
  'Nom': ['Nom', 'Name', 'Name', 'Nombre'],
  'Type / ICAO': ['Type / OACI', 'Type / ICAO', 'Typ / ICAO', 'Tipo / OACI'],
  'Description': ['Description', 'Description', 'Beschreibung', 'Descripción'],
  'Immatriculation': ['Immatriculation', 'Registration', 'Kennzeichen', 'Matrícula'],
  'Indicatif': ['Indicatif', 'Callsign', 'Rufzeichen', 'Indicativo'],
  'Carburant en volume': ['Carburant en volume', 'Fuel as volume', 'Kraftstoff als Volumen', 'Combustible en volumen'],
  'Carburant Jet': ['Carburant Jet', 'Jet fuel', 'Jet-Kraftstoff', 'Combustible jet'],
  'Carburant utilisable': ['Carburant utilisable', 'Usable fuel', 'Nutzbarer Kraftstoff', 'Combustible utilizable'],
  'Taxi': TX.taxi,
  'Réserve': TX.reserve,
  'Contingence (%)': TX.contPct,
  'Carburant extra': ['Carburant extra', 'Extra fuel', 'Zusatzkraftstoff', 'Combustible extra'],
  'Longueur piste mini (ft)': ['Longueur de piste mini (ft)', 'Minimum runway length (ft)', 'Mindestpistenlänge (ft)',
    'Longitud mínima de pista (ft)'
  ],
  'Type de piste': ['Type de piste', 'Runway type', 'Pistenart', 'Tipo de pista'],
  'Vent de travers max (kt)': ['Vent de travers max (kt)', 'Max crosswind (kt)', 'Max. Seitenwind (kt)', 'Viento cruzado máx. (kt)'],
  'Alternat': TX.altn,
  'Badin / IAS (kt)': ['Badin (kt)', 'IAS (kt)', 'IAS (kt)', 'IAS (kt)'],
  'Régime nominal (RPM / N1)': ['Régime nominal (RPM / N1)', 'Nominal RPM / N1', 'Nenndrehzahl (RPM / N1)', 'Régimen nominal (RPM / N1)'],
  'fuel flow': ['débit', 'fuel flow', 'Verbrauch', 'consumo'],
  'Fuel flow': ['Débit', 'Fuel flow', 'Verbrauch', 'Consumo'],
  'TAS (kt)': ['TAS (kt)', 'TAS (kt)', 'TAS (kt)', 'TAS (kt)'],
  'Vario (ft/min)': ['Vario (ft/min)', 'Rate (ft/min)', 'Steigrate (ft/min)', 'Régimen vertical (ft/min)'],
  'Plafond max (ft)': ['Plafond (ft)', 'Ceiling (ft)', 'Gipfelhöhe (ft)', 'Techo (ft)'],
  'Altitude de référence (ft)': ['Altitude de référence (ft)', 'Reference altitude (ft)', 'Referenzhöhe (ft)',
    'Altitud de referencia (ft)'
  ],
  'Cellule (auto : base OACI)': ['Cellule (auto : base OACI)', 'Airframe (auto: ICAO base)', 'Zelle (auto: ICAO-Basis)',
    'Célula (auto: base OACI)'
  ],
  'Propulsion (auto : base OACI)': ['Propulsion (auto : base OACI)', 'Propulsion (auto: ICAO base)', 'Antrieb (auto: ICAO-Basis)',
    'Propulsión (auto: base OACI)'
  ],
  'Altitude de rétablissement (ft)': ['Altitude de rétablissement (ft)', 'Critical altitude (ft)', 'Volldruckhöhe (ft)',
    'Altitud crítica (ft)'
  ],
  'Cabine pressurisée': ['Cabine pressurisée', 'Pressurised cabin', 'Druckkabine', 'Cabina presurizada'],
  'Référence RPM / puissance': ['Référence régime / puissance', 'RPM / power reference', 'Drehzahl-/Leistungsreferenz',
    'Referencia RPM / potencia'
  ],
  'Données RPM / fuel flow': ['Données régime / débit', 'RPM / fuel flow data', 'Drehzahl-/Verbrauchsdaten', 'Datos RPM / consumo'],
  'Base / provenance': ['Base / provenance', 'Basis / origin', 'Grundlage / Herkunft', 'Base / procedencia']
};

// libellés des valeurs des champs à liste (cellule, propulsion) ; les autres listes (type de piste) gardent leur code
export const OPTION_TX = {
  aeroplane: ['avion', 'aeroplane', 'Flugzeug', 'avión'],
  helicopter: ['hélicoptère', 'helicopter', 'Hubschrauber', 'helicóptero'],
  gyroplane: ['gyroplane', 'gyroplane', 'Tragschrauber', 'autogiro'],
  glider: ['planeur', 'glider', 'Segelflugzeug', 'planeador'],
  balloon: ['ballon', 'balloon', 'Ballon', 'globo'],
  airship: ['dirigeable', 'airship', 'Luftschiff', 'dirigible'],
  piston: ['moteur à pistons', 'piston engine', 'Kolbenmotor', 'motor de pistón'],
  turboprop: ['turbopropulseur', 'turboprop', 'Turboprop', 'turbohélice'],
  turboshaft: ['turbomoteur', 'turboshaft', 'Wellenturbine', 'turboeje'],
  jet: ['réacteur', 'jet', 'Strahltriebwerk', 'reactor'],
  electric: ['électrique', 'electric', 'elektrisch', 'eléctrico'],
  none: ['aucune (sans moteur)', 'none (unpowered)', 'keine (ohne Antrieb)', 'ninguna (sin motor)'],
  other: ['autre', 'other', 'andere', 'otra']
};
// champs de fiche hors du formulaire de la V2
/** Une phrase d'aide sous un champ de la fiche (SOG-0011 : « fuel as volume » et « fuel density » n'étaient pas compris). */
export const FIELD_HELP = {
  fuelAsVolume: [
    'Coché : les quantités de cette fiche (utilisable, taxi, réserve, débits) sont des volumes — litres ou gallons, comme le simulateur les affiche —, pas des masses ; la densité ci-dessous les convertit en kilos.',
    'Ticked: the quantities of this sheet (usable, taxi, reserve, flows) are volumes — litres or gallons, as the simulator shows them —, not masses; the density below converts them to kilograms.',
    'Angekreuzt: Die Mengen dieses Datenblatts (nutzbar, Rollen, Reserve, Verbrauch) sind Volumen — Liter oder Gallonen, wie der Simulator sie anzeigt —, keine Massen; die Dichte unten rechnet sie in Kilogramm um.',
    'Marcado: las cantidades de esta ficha (utilizable, rodaje, reserva, consumos) son volúmenes — litros o galones, como los muestra el simulador —, no masas; la densidad de abajo las convierte a kilos.'
  ],
  fuelDensityKgPerL: [
    'Kilos par litre du carburant : Jet A-1 environ 0,80, Avgas environ 0,72. Elle tient au carburant, pas à l’appareil : laissez vide pour la valeur de la compagnie (Réglages), sinon la valeur typique. Entre 0,5 et 1,0.',
    'Kilograms per litre of the fuel: Jet A-1 about 0.80, Avgas about 0.72. It belongs to the fuel, not to the aircraft: leave it empty for the airline’s value (Settings), else the typical one. Between 0.5 and 1.0.',
    'Kilogramm pro Liter des Kraftstoffs: Jet A-1 etwa 0,80, Avgas etwa 0,72. Sie hängt vom Kraftstoff ab, nicht vom Luftfahrzeug: leer lassen für den Wert der Gesellschaft (Einstellungen), sonst der typische. Zwischen 0,5 und 1,0.',
    'Kilos por litro del combustible: Jet A-1 unos 0,80, Avgas unos 0,72. Depende del combustible, no de la aeronave: déjela vacía para el valor de la compañía (Ajustes), si no el típico. Entre 0,5 y 1,0.'
  ]
};

export const PATH_TX = {
  reserveFuelFlowPerHour: ['Réserve · débit', 'Reserve · fuel flow', 'Reserve · Verbrauch', 'Reserva · consumo'],
  'tod.gradientFtPerNm': ['Descente · pente (ft/NM)', 'Descent · gradient (ft/NM)', 'Sinkflug · Gradient (ft/NM)',
    'Descenso · pendiente (ft/NM)'
  ],
  'tod.bufferNm': ['Descente · marge (NM)', 'Descent · buffer (NM)', 'Sinkflug · Puffer (NM)', 'Descenso · margen (NM)'],
  typicalWindKt: ['Vent typique (kt)', 'Typical wind (kt)', 'Typischer Wind (kt)', 'Viento típico (kt)'],
  registration: ['Immatriculation', 'Registration', 'Kennzeichen', 'Matrícula'],
  type: ['Type', 'Type', 'Typ', 'Tipo'],
  notes: ['Notes', 'Notes', 'Hinweise', 'Notas']
};

/** Noms des origines d'un champ (aerodb : sheets.origins) : édité, V2, .lnmperf, ChatGPT… */
export const SRC_TX = {
  edit: ['édité', 'edited', 'bearbeitet', 'editado'],
  v2: ['base V2', 'V2 database', 'V2-Datenbank', 'base V2'],
  lnmperf: ['lnmperf', 'lnmperf', 'lnmperf', 'lnmperf'],
  chatgpt: ['ChatGPT', 'ChatGPT', 'ChatGPT', 'ChatGPT'],
  eurocontrol: ['EUROCONTROL', 'EUROCONTROL', 'EUROCONTROL', 'EUROCONTROL'],
  simbrief: ['SimBrief', 'SimBrief', 'SimBrief', 'SimBrief'],
  ofp: ['OFP', 'OFP', 'OFP', 'OFP'],
  import: ['import', 'import', 'Import', 'importación'],
  fleet: ['flotte', 'fleet', 'Flotte', 'flota'],
  reference: ['référence', 'reference', 'Referenz', 'referencia']
};
