# Données — XPlane Web Suite

Dépôt **privé** des données de la suite (application : <https://framagit.org/asr/flight_planner>), cloné dans le
dossier `data/` à la racine de l'application :

```bash
cd flight_planner
git clone https://framagit.org/defa-virtual/missions-defa.git data
```

L'application lit `data/` si ce dossier contient `data_tree.js`, sinon ses exemples (`examples/`). Dans le navigateur :
☰ › Paramètres › Maintenance › Sources et dossiers › **Dossier des données** : choisir `data/` une fois (registre, missions, SIA en
sont déduits).

| Dossier | Contenu | Origine |
|---|---|---|
| `references/` | `aircraft_fleet.js` (flotte), `defa_reference.js` (pilotes, appareils — anonymisée), `callsigns.js` (indicatifs), `aircraft_overrides.json` (corrections de la base OACI) | outils `AircraftDB/update_fleet.py`, `tools/defa_reference.py` ; Paramétrage ; corrections manuelles (non recalculables) |
| `cr/` | `missions.yaml` (registre unique des CR), `FIRE/`, `HEMS/` (registres historiques, CR, packs FMS GAAR), `mission_ledger_defaults.js` | pages de CR ; saisies (non recalculables) |
| `missions/` | séries générées (`missionNN.yaml`, `summaryNN.md`), `mission_registry.yaml` | générateur de missions, registre |
| `sia/` | `mora.csv` (grille MORA calculée), `miam-enr-5-7-*.xml` (axes AAR), `Lisez_moi.txt` ; XML AIRAC du cycle **hors git** | studio cartographique, Maintenance › Mise à jour SIA |
| `planner/` | base de performances du planificateur, profils | planificateur |
| `local/` | **hors git** : `defa_local_store.yaml`, `sauvegardes/` | données locales, sauvegarde totale |

Les données recalculées portent leur source et leur date (en-tête, colonne `source`, cycle AIRAC) : Paramètres ›
Maintenance › Références et dépendances les contrôle.
