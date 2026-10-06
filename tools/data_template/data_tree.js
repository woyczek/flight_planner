// Marqueur du dépôt de données de la XPlane Web Suite (clone dans data/ à la racine de l'application).
// Sa présence fait lire data/ plutôt que les exemples (shared/data_files.js). Ne pas renommer.
window.DATA_TREE = {
  version: 1,
  repository: 'https://framagit.org/defa-virtual/missions-defa',
  layout: {
    references: 'flotte, référence, indicatifs, corrections OACI (aircraft_overrides.json)',
    cr: 'registre unique missions.yaml, registres CSV historiques (FIRE, HEMS), CR, packs FMS GAAR',
    missions: 'séries de missions générées (missionNN.yaml, summaryNN.md), mission_registry.yaml',
    sia: 'mora.csv, axes ENR 5.7, Lisez_moi du SIA ; XML AIRAC du cycle (hors git)',
    planner: 'base de performances (flight_performance_database_merged.fpdb.json), profils',
    local: 'hors git : sauvegarde des données du navigateur, sauvegardes totales'
  }
};
