# Générateur de carte statique

Le script projette les coordonnées WGS84 sur un fond PNG/JPEG nord en haut, à partir de sa bounding box. La résolution du fond est lue automatiquement : le même fichier JSON fonctionne donc avec un stub et avec son remplacement final.

Le poste doit disposer d'ImageMagick (`magick`), déjà présent sur cette machine.

## Fichiers nécessaires

- `generate_operational_map.py` : générateur ;
- un fond de carte vierge PNG/JPEG ;
- un JSON de demande, sur le modèle de `example_map_request.json` ;
- facultativement `sia-airspaces-2026-10-01.xml` pour dessiner les CTR, TMA, zones R/D/P, etc.

## Exécution

```powershell
python .\generate_operational_map.py `
  --config .\example_map_request.json `
  --background C:\chemin\vers\fond-vierge.png `
  --zones-xml C:\chemin\vers\sia-airspaces-2026-10-01.xml `
  --output C:\chemin\vers\carte-mission.png
```

`map.bbox` est toujours `[ouest, sud, est, nord]`, en degrés décimaux WGS84. Le fond doit correspondre exactement à cette emprise et rester orienté nord en haut. Les fonds générés dans `maps_manifest.md` donnent déjà ces quatre valeurs.

La taille en pixels n'est jamais configurée dans le JSON : elle est lue depuis le fond au moment du rendu.

## Sélection d'espaces SIA

Une zone se sélectionne par `type` et `name`, éventuellement par `source_key` et par `parts`.

```json
{
  "selector": {"type": "TMA", "name": "RENNES", "parts": ["2"]}
}
```

Le générateur conserve les dimensions du fond et écrit une PNG de même taille.

## Sortie SVG et libellés des villes

Donner une sortie avec l'extension `.svg` produit un SVG autonome : le fond
vierge PNG/JPEG est incorporé au fichier et toutes les zones, trajectoires,
points et libellés ajoutés restent vectoriels et éditables dans Inkscape,
Illustrator ou Affinity Designer.

Pour afficher les noms de villes, activer cette section dans le JSON :

```json
"city_labels": {"enabled": true, "min_population": 200000}
```

Puis fournir un catalogue UTF-8 au format CSV, avec les colonnes
`name,lat,lon,population` :

```powershell
python .\generate_operational_map.py `
  --config .\demande.json `
  --background "E:\SynologyDrive\DOCS\Flight\SIA XML\Carte france vierge.png" `
  --cities-csv .\villes.csv `
  --output .\carte-mission.svg
```

Les points tournants continuent d'être contrôlés séparément par la section
`points` de la demande ; le seuil de population ne les affecte pas.
