const URLS = {
  vatsimData: 'https://vatsim.net',
  boundaries: 'https://githubusercontent.com',
  vatspyDat: 'https://githubusercontent.com'
};

/**
 * Parse la section [FIRs] de VATSpy.dat pour lier un préfixe d'indicatif à un ID de polygone
 * Format dans VATSpy.dat : ICAO|Name|CallsignPrefix|FIRBoundaryID
 */
function parseVatspyFirs(datText) {
  const firMap = new Map();
  const lines = datText.split('\n');
  let inFirsSection = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith(';')) continue;

    if (line.startsWith('[')) {
      inFirsSection = line.toUpperCase() === '[FIRS]';
      continue;
    }

    if (inFirsSection) {
      const [icao, name, callsignPrefix, boundaryId] = line.split('|');
      const targetId = boundaryId || icao; // Si boundaryId est vide, l'ICAO sert d'ID
      
      if (icao) firMap.set(icao.trim(), targetId.trim());
      if (callsignPrefix) firMap.set(callsignPrefix.trim(), targetId.trim());
    }
  }
  return firMap;
}

/**
 * Récupère les contrôleurs actifs et leur associe leur polygone GeoJSON
 */
async function getActiveControllersWithPolygons() {
  // 1. Téléchargement parallèle des 3 sources de données
  const [dataRes, geoRes, datRes] = await Promise.all([
    fetch(URLS.vatsimData),
    fetch(URLS.boundaries),
    fetch(URLS.vatspyDat)
  ]);

  const vatsimData = await dataRes.json();
  const boundariesGeoJson = await geoRes.json();
  const vatspyDatText = await datRes.text();

  // 2. Indexation des polygones GeoJSON par leur propriété "id"
  const polygonsById = new Map();
  for (const feature of boundariesGeoJson.features) {
    if (feature.properties && feature.properties.id) {
      polygonsById.set(feature.properties.id, feature);
    }
  }

  // 3. Création du dictionnaire de correspondance depuis VATSpy.dat
  const firLookup = parseVatspyFirs(vatspyDatText);

  // 4. Association pour chaque contrôleur connecté
  const mappedControllers = [];

  for (const atc of vatsimData.controllers) {
    // Exemple : "LFFF_CTR" -> prefix = "LFFF", suffix = "CTR"
    const parts = atc.callsign.split('_');
    const prefix = parts[0];
    const suffix = parts[parts.length - 1];

    // Traitement des centres en route (facility === 6 ou suffixe CTR/FSS)
    if (atc.facility === 6 || suffix === 'CTR' || suffix === 'FSS') {
      // Recherche de l'ID exact ou du préfixe dans VATSpy.dat
      const boundaryId = firLookup.get(prefix) || prefix;
      const geoFeature = polygonsById.get(boundaryId);

      mappedControllers.push({
        callsign: atc.callsign,
        frequency: atc.frequency,
        visualRangeNM: atc.visual_range,
        boundaryId: boundaryId,
        hasPolygon: Boolean(geoFeature),
        polygon: geoFeature || null // Objet GeoJSON prêt pour Leaflet / Mapbox
      });
    }
  }

  return mappedControllers;
}

// Exécution
getActiveControllersWithPolygons()
  .then(results => {
    console.log(`${results.length} centres (CTR/FSS) actifs trouvés.`);
    console.log('Exemple :', JSON.stringify(results[0], null, 2));
  })
  .catch(err => console.error('Erreur lors de la récupération :', err));
