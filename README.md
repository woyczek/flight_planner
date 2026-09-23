# X‑Plane Web Suite

Ouvrir directement l’une des quatre pages HTML. Le bandeau commun calcule tous les liens depuis la racine du repository, y compris lorsqu’une page se trouve dans `FIRE/` ou `LandingPerformanceDashboard/`.

## Fichiers communs

- `repository_tree` : arborescence, labels indépendants des noms de fichiers, thèmes et favicons ;
- `shared/repository_nav.js` et `.css` : bandeau et menu communs ;
- `AircraftDB/aircraft_db.js` : source ICAO unique ;
- `AircraftDB/aircraft_icons.js` : icônes uniques utilisées par les deux pages aviation.

## Flight Performance & Fuel Planner

- La base locale persistante est stockée dans le navigateur ; le bouton de la barre d’état permet de la recharger.
- Une sauvegarde locale précédente est conservée et restaurable depuis le menu ☰.
- L’export de la BDD écrit `flight_performance_database.fpdb.json` dans le dossier autorisé, ou le télécharge si aucun dossier n’a été sélectionné.
- Les préférences de blocs, leur ordre et les unités sont persistantes et peuvent être exportées/importées au format JSON.
- Les lignes de cartographie possèdent un identifiant stable : supprimer une ligne vide ne peut plus supprimer une autre ligne vide ou renseignée.

Pour servir le repository par HTTP, configurer le fichier sans extension `repository_tree` avec un type JavaScript (`text/javascript`). L’ouverture locale directe fonctionne sans serveur.
