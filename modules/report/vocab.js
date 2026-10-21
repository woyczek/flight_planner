// V3 report — vocabulaire du compte rendu (listes et identifiants), recopié de la V2 (shared/mission_core/vocab.js) le
// 23/10/2026 sans changement : libellés [fr, en, de, es], familles, lettres de famille et numéros de CR (CRM-016-1, CRX-A01-0),
// résultats, causes, rôles d'équipage, contexte, unités de carburant, réseaux. Module ES pur : ni page, ni stockage, ni réseau.
const L = (fr, en, de, es) => [fr, en, de ?? en, es ?? en];
/** Option de liste { value : code stable, label : [fr, en, de, es] }. */
const opt = (value, label) => ({
  value,
  label
});
const familyLabels = {
  HEMS: ['HEMS / MEDEVAC', 'HEMS / MEDEVAC', 'HEMS / MEDEVAC', 'HEMS / MEDEVAC'],
  FIRE: ['FIRE / GAAR — sécurité civile', 'FIRE / aerial firefighting', 'FIRE / Waldbrandbekämpfung',
    'FIRE / extinción de incendios'
  ],
  SAR: ['SAR / récupération de personnel', 'SAR / personnel recovery', 'SAR / Personenbergung', 'SAR / recuperación de personal'],
  AIRLIFT: ['Transport aérien / logistique', 'Airlift / logistics', 'Lufttransport / Logistik', 'Transporte aéreo / logística'],
  AAR: ['Ravitaillement en vol', 'Air-to-air refuelling', 'Luftbetankung', 'Reabastecimiento en vuelo'],
  MARITIME: ['Surveillance maritime', 'Maritime surveillance', 'Seeüberwachung', 'Vigilancia marítima'],
  HADR: ['Aide humanitaire / évacuation', 'Humanitarian aid / evacuation', 'Humanitäre Hilfe / Evakuierung',
    'Ayuda humanitaria / evacuación'
  ],
  AIRBORNE: ['Largage / aéroporté', 'Airdrop / airborne', 'Abwurf / Luftlande', 'Lanzamiento / aerotransportado'],
  FI: ['Contrôle en vol des aides radio', 'Flight inspection (navaids)', 'Flugvermessung (Navigationsanlagen)',
    'Inspección en vuelo (radioayudas)'
  ],
  SURVEY: ['Levés / missions scientifiques', 'Survey / scientific missions', 'Vermessung / Forschungsflüge',
    'Levantamientos / misiones científicas'
  ],
  LE: ['Police / douane / sécurité', 'Police / customs / security', 'Polizei / Zoll / Sicherheit', 'Policía / aduana / seguridad'],
  ISR: ['Renseignement / reconnaissance', 'Intelligence / reconnaissance', 'Aufklärung / Nachrichtengewinnung',
    'Inteligencia / reconocimiento'
  ],
  COMMAND: ['Commandement / police du ciel / guet aérien', 'Command / air policing / early warning',
    'Führung / Luftpolizeidienst / Frühwarnung', 'Mando / policía aérea / alerta temprana'
  ],
  COMBAT: ['Combat aérien / entraînement chasse', 'Air combat / fighter training', 'Luftkampf / Jagdflugausbildung',
    'Combate aéreo / entrenamiento de caza'
  ],
  SOF: ['Opérations spéciales / tactiques', 'Special / tactical operations', 'Spezial- / taktische Operationen',
    'Operaciones especiales / tácticas'
  ],
  SPECIAL: ['Transport spécial / essais / formation', 'Special transport / trials / training',
    'Sondertransport / Erprobung / Ausbildung', 'Transporte especial / ensayos / formación'
  ]
};
const familyLetters = {
  HEMS: 'M',
  MEDEVAC: 'M',
  HADR: 'H',
  FIRE: 'F',
  SAR: 'S',
  AIRLIFT: 'T',
  AAR: 'R',
  AIRBORNE: 'P',
  MARITIME: 'N',
  ISR: 'I',
  LE: 'L',
  COMMAND: 'C',
  COMBAT: 'A',
  SOF: 'O',
  FI: 'V',
  SURVEY: 'G',
  SPECIAL: 'X',
  DEMO: 'D'
};
const MISSION_ID = /^([A-Z])-?(\d{1,3})([A-Z]?)$/,
  CR_ID = /^CR([A-Z])-(\d{3})([A-Z]?)-(\d+)$/,
  CR_FREE = /^CR([A-Z])-([A-Z])(\d{2})-(\d+)$/;
/** Identifiant de mission normalisé : « m016 », « M-16 » → « M-016 » ; '' hors format. */
const missionIdOf = v => {
  const m = MISSION_ID.exec(String(v || '').trim().toUpperCase());
  return m ? `${m[1]}-${m[2].padStart(3, '0')}${m[3]}` : '';
};
/** Rang d'un CR sans mission : A01 → 1, A99 → 99, B01 → 100. */
const freeRank = (series, nn) => (series.charCodeAt(0) - 65) * 99 + nn;
const freeCode = rank => `${String.fromCharCode(65 + Math.floor((rank - 1) / 99))}${String((rank - 1) % 99 + 1).padStart(2, '0')}`;
/** Identifiant de CR découpé : { mission: 'M-016A', letter, num, team, attempt } ; CR sans mission :
 *  { mission: '', letter, free: rang, code: 'A01', attempt } ; null hors format. */
const parseCrId = v => {
  const s = String(v || '').trim().toUpperCase(),
    m = CR_ID.exec(s),
    f = !m && CR_FREE.exec(s);
  return m ? {
      mission: `${m[1]}-${m[2]}${m[3]}`,
      letter: m[1],
      num: +m[2],
      team: m[3],
      attempt: +m[4]
    } :
    f ? {
      mission: '',
      letter: f[1],
      free: freeRank(f[2], +f[3]),
      code: f[2] + f[3],
      attempt: +f[4]
    } : null;
};
/** Identifiant d'un nouveau CR (crIds : identifiants des CR déjà enregistrés, toutes familles).
 *  missionNumber = identifiant de la mission volée (M-016A) → CRM-016A-<essai suivant> ; vide → CR sans mission suivant. */
function crId({
  family,
  missionNumber = '',
  crIds = []
} = {}) {
  const mission = missionIdOf(missionNumber),
    parsed = crIds.map(parseCrId).filter(Boolean);
  if (mission) return `CR${mission}-${Math.max(0, ...parsed.filter(c => c.mission === mission).map(c => c.attempt)) + 1}`;
  const letter = familyLetters[String(family || '').toUpperCase()] || 'X';
  return `CR${letter}-${freeCode(Math.max(0, ...parsed.filter(c => c.free && c.letter === letter).map(c => c.free)) + 1)}-0`;
}
const outcomes = [
  opt('SUCCESS', L('Succès', 'Success', 'Erfolgreich', 'Éxito')), opt('PARTIAL_SUCCESS', L('Succès partiel', 'Partial success',
    'Teilweise erfolgreich', 'Éxito parcial')),
  opt('ABORTED', L('Interrompue', 'Aborted', 'Abgebrochen', 'Abortada')), opt('CANCELLED', L('Annulée', 'Cancelled', 'Storniert',
    'Cancelada')),
  opt('DIVERTED', L('Déroutée', 'Diverted', 'Umgeleitet', 'Desviada')), opt('NO_CONTACT', L('Pas de contact', 'No contact',
    'Kein Kontakt', 'Sin contacto')),
  opt('TARGET_NOT_FOUND', L('Objectif non trouvé', 'Target not found', 'Ziel nicht gefunden', 'Objetivo no encontrado')),
  opt('WEATHER', L('Météo', 'Weather', 'Wetter', 'Meteorología')), opt('TECHNICAL', L('Technique', 'Technical', 'Technisch',
    'Técnico')),
  opt('OPERATIONAL', L('Opérationnel', 'Operational', 'Operativ', 'Operacional')), opt('OTHER', L('Autre', 'Other', 'Andere', 'Otro'))
];
const mneCauses = [
  opt('WEATHER', L('Météo', 'Weather', 'Wetter', 'Meteorología')), opt('TECHNICAL', L('Technique (appareil)', 'Technical (aircraft)',
    'Technisch (Luftfahrzeug)', 'Técnico (aeronave)')),
  opt('SIMULATOR', L('Simulateur', 'Simulator', 'Simulator', 'Simulador')), opt('CREW', L('Pilote ou équipage absent',
    'Pilot or crew missing', 'Pilot oder Besatzung fehlt', 'Piloto o tripulación ausente')),
  opt('ATC', L('Contrôle absent', 'No ATC', 'Keine Flugsicherung', 'Sin control')), opt('NETWORK', L('Réseau (déconnexion, panne)',
    'Network (disconnection, outage)', 'Netz (Trennung, Ausfall)', 'Red (desconexión, caída)')),
  opt('AIRSPACE', L('Zone non activée', 'Airspace not activated', 'Luftraum nicht aktiviert', 'Zona no activada')), opt('TANKER', L(
    'Ravitailleur absent', 'Tanker missing', 'Tanker fehlt', 'Cisterna ausente')),
  opt('TIME', L('Manque de temps', 'Lack of time', 'Zeitmangel', 'Falta de tiempo')), opt('OPERATIONAL', L('Opérationnel',
    'Operational', 'Operativ', 'Operacional')),
  opt('OTHER', L('Autre', 'Other', 'Andere', 'Otro'))
];
const crewRoles = [
  opt('PIC', L('Commandant de bord (PIC)', 'Aircraft commander (PIC)', 'Kommandant (PIC)', 'Comandante (PIC)')),
  opt('COPILOT', L('Copilote', 'Copilot', 'Kopilot', 'Copiloto')), opt('FLIGHT_ENGINEER', L('Mécanicien navigant', 'Flight engineer',
    'Flugingenieur', 'Ingeniero de vuelo')),
  opt('NAVIGATOR', L('Navigateur', 'Navigator', 'Navigator', 'Navegante')), opt('TACCO', L('Coordinateur tactique',
    'Tactical coordinator', 'Taktischer Koordinator', 'Coordinador táctico')),
  opt('SENSOR_OPERATOR', L('Opérateur capteurs', 'Sensor operator', 'Sensorbediener', 'Operador de sensores')), opt('LOADMASTER', L(
    'Chef de soute', 'Loadmaster', 'Lademeister', 'Jefe de carga')),
  opt('CREW_CHIEF', L('Chef mécanicien', 'Crew chief', 'Crew Chief', 'Jefe de tripulación')), opt('WINCH_OPERATOR', L('Treuilliste',
    'Winch operator', 'Windenbediener', 'Operador de grúa')),
  opt('RESCUE_SWIMMER', L('Nageur-sauveteur', 'Rescue swimmer', 'Rettungsschwimmer', 'Nadador de rescate')), opt('MISSION_COMMANDER',
    L('Chef de mission', 'Mission commander', 'Missionskommandant', 'Jefe de misión')),
  opt('JUMPMASTER', L('Largueur', 'Jumpmaster', 'Absetzer', 'Jefe de salto')), opt('DOCTOR', L('Médecin', 'Doctor', 'Arzt',
    'Médico')),
  opt('NURSE', L('Infirmier', 'Nurse', 'Pflegekraft', 'Enfermero')), opt('OBSERVER', L('Observateur', 'Observer', 'Beobachter',
    'Observador')),
  opt('TECHNICIAN', L('Technicien', 'Technician', 'Techniker', 'Técnico')), opt('OTHER', L('Autre', 'Other', 'Andere', 'Otro'))
];
const context = [opt('EXERCISE', L('Exercice / simulation', 'Exercise / simulation', 'Übung / Simulation', 'Ejercicio / simulación')),
  opt('REAL', L('Opération réelle', 'Real operation', 'Realer Einsatz', 'Operación real'))
];
const fuelUnits = [opt('kg', L('kg', 'kg')), opt('lb', L('lb', 'lb')), opt('L', L('L', 'L')), opt('USG', L('US gal', 'US gal'))];
const networks = [opt('', L('Hors réseau / non renseigné', 'Offline / not provided', 'Offline / nicht angegeben',
  'Fuera de red / no indicado')), opt('IVAO', L('IVAO', 'IVAO')), opt('VATSIM', L('VATSIM', 'VATSIM'))];

export {
  L,
  opt,
  familyLabels,
  familyLetters,
  missionIdOf,
  parseCrId,
  crId,
  outcomes,
  mneCauses,
  crewRoles,
  context,
  fuelUnits,
  networks
};
