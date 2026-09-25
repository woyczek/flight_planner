(() => {
  'use strict';
  // Valeurs de référence (anglais) des listes déroulantes HEMS / GAAR.
  // Les <option> portent une valeur explicite en anglais, stable quelle que soit la
  // langue d'affichage : c'est elle qui est écrite dans les CSV / JSON. Les libellés
  // restent traduits par la couche i18n. Cette table convertit les anciennes valeurs
  // françaises (registres, JSON et CR antérieurs) vers ces valeurs de référence.
  const LEGACY = {
    // HEMS — organisme / service
    'Sécurité civile': 'Civil Security',
    'HEMS privé': 'Private HEMS',
    'Gendarmerie / secours': 'Gendarmerie / rescue',
    'Autre': 'Other',
    // HEMS — type de mission
    'HEMS primaire': 'Primary HEMS',
    'Transfert interhospitalier (MEDEVAC)': 'Interhospital transfer (MEDEVAC)',
    'Secours / sauvetage': 'Rescue',
    'Recherche / évacuation': 'Search / evacuation',
    'Transport spécialisé': 'Specialized transport',
    'Entraînement': 'Training',
    // HEMS — statut
    'Terminée': 'Completed',
    'Patient transporté': 'Patient transported',
    'Mission annulée': 'Mission cancelled',
    'Non engagement': 'Not dispatched',
    'Déroutée': 'Diverted',
    'Interrompue': 'Interrupted',
    // HEMS — médicalisation
    'Médicalisée': 'Physician-staffed',
    'Paramédicalisée': 'Paramedic-staffed',
    'Non médicalisée': 'Not medically staffed',
    'Non applicable': 'Not applicable',
    // HEMS — événements
    'Déclenchement': 'Dispatch',
    'Décollage': 'Take-off',
    'Arrivée zone': 'On-scene arrival',
    'Pose': 'Touchdown',
    'Treuil': 'Winch',
    'Prise en charge': 'Patient contact',
    'Départ zone': 'Scene departure',
    'Arrivée destination': 'Destination arrival',
    'Annulation': 'Cancellation',
    'Anomalie': 'Issue',
    'Mise en route': 'Engine start',
    'Atterrissage final': 'Final landing',
    'Fin mission / arrêt moteurs': 'Mission end / engine shutdown',
    // GAAR — risque, type de mission
    'Vert': 'Green',
    'Jaune': 'Yellow',
    'Rouge': 'Red',
    'GAAR avec déroutement': 'GAAR with diversion',
    'Intervention': 'Response',
    // GAAR — événements
    'Alerte feu': 'Fire alert',
    'Déroutement': 'Diversion',
    'Arrivée secteur': 'Sector arrival',
    'Largage': 'Drop',
    'Rechargement': 'Reload',
    'Écopage': 'Scooping',
    'Retour': 'Return'
  };
  // Colonnes des registres alimentées par une liste déroulante.
  const COLUMNS = ['service', 'missionType', 'outcome', 'medicalization', 'risk', 'aircraft', 'fuelUnit', 'onlineNetwork'];

  /** Valeur de référence (anglais) d'une valeur de liste, anciennes valeurs françaises converties. */
  const normalize = value => {
    const text = String(value ?? '').trim();
    return Object.prototype.hasOwnProperty.call(LEGACY, text) ? LEGACY[text] : value;
  };
  // Sélectionne une valeur dans une liste, en acceptant les anciennes valeurs
  // françaises ; une valeur inconnue est ajoutée comme option pour ne rien perdre.
  const setSelect = (select, value) => {
    value = normalize(value ?? '');
    if (value !== '' && ![...select.options].some(option => option.value === value)) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.append(option);
    }
    select.value = value;
  };
  // Affecte une valeur à un champ de formulaire (liste ou saisie libre).
  const setField = (element, value) => {
    if (!element) return;
    if (element.tagName === 'SELECT') setSelect(element, value);
    else element.value = value ?? '';
  };
  // Convertit les colonnes énumérées d'une ligne de registre (objet) en place.
  const normalizeRecord = record => {
    COLUMNS.forEach(key => {
      if (record && key in record) record[key] = normalize(record[key]);
    });
    return record;
  };

  window.MissionValues = {
    LEGACY,
    COLUMNS,
    normalize,
    setSelect,
    setField,
    normalizeRecord
  };
})();
