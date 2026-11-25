# Format VAC — extension 1.0 du JSON cible schema 2

`data/sia/vac/index.json` (version 1.1) contient l’inventaire VAC/VACH, les SHA-256, les noms, l’ordre des tests, `processingScope`, `complete` et le bilan `summary`. Les états sont `inventoried`, `extracted` (sélection relue), `automatic` (candidats), `needs_georeferencing`, `text_only`, `stale_review`, `error`. `sourceAirac: null` signifie inconnu. Un traitement terminé peut contenir des erreurs : consulter également `errors`.

`data/sia/vac/<OACI>.json` conserve l’enveloppe des précédents `sia/vfr` (`schema`, `ad`, `source`, `analysis`, `points`, `routes`, `notes`) et ajoute `vac`. Les anciennes données ne sont reprises que si leur empreinte correspond. Le statut obsolète d’une interprétation antérieure n’est pas effacé par l’extraction vectorielle.

| Chemin | Contenu |
|---|---|
| `vac.sources.VAC/VACH` | Fichier, SHA-256 et taille |
| `vac.terrainElevationFt` | ALT AD lue dans la première page |
| `vac.fatoElevationFt` | ALT FATO distincte, si publiée |
| `vac.charts.<type>.pages[]` | Page PDF à partir de 1, dimensions, calage et aperçu |
| `pages[].features[]` | Tracés relus : circuit, report_route, helicopter_route |
| `features[].segments[]` | Sous-chemins distincts du PDF, sans raccord automatique |
| `segments[].vertices[]` | Identifiant stable, WGS84 courant/source, PDF XY et objet vectoriel |
| `vac.circuits[]` | Piste, MG/MD/null, ALT, HGT, référence verticale, variantes, conditions et page |
| `vac.procedureSequences[]` | Ordre des points par piste et conditions, distinct de la géométrie |
| `vac.corrections` | Nombre appliqué, identifiants obsolètes, date |
| `vac.correctionPatch` | Corrections appliquées à cette écriture cible |
| `vac.extractionMode` | `reviewed_selection` ou `automatic_candidates` |
| `vac.circuitCandidates[]` | Couples ALT/HGT sans attribution à une piste, à interpréter |
| `vac.quality.unresolvedMapPages[]` | Pages dont le graticule n’a pas pu être résolu |
| `vac.reviewSha256` | Empreinte des sélections relues utilisées, sinon `null` |

Coordonnées géographiques `[longitude, latitude]`, WGS84. PDF XY : points PDF, origine en haut à gauche. Les identifiants de sommets sont `<OACI>:<VAC/VACH>:p<page>:<C/L><objet>:s<sous-chemin>:v<sommet>`. Ils ne sont stables que pour cette source et cette version de sélection/échantillonnage. `sourceSha256` empêche leur réapplication à un autre PDF.

Chaque sous-chemin devient une route `LineString` séparée dans `routes[]`, avec `featureRef` commun, `partial: true` et `aircraft: fixed/rotary`. Les interruptions graphiques sous les annotations sont raccordées lorsque leurs extrémités se font face, sont collinéaires et appartiennent à la même sélection relue. Ces segments portent `origin: cartographic_continuation`, les références des fragments sources, la longueur du masque en points PDF et le motif. Leurs extrémités réutilisent les identifiants des sommets existants.

`features[].directionArrows[]` représente les inclusions et les flèches publiées. Chaque marqueur conserve son symbole source, sa position, son azimut, ses références de sommets et ses décalages. Sa position suit les points corrigés. Les marqueurs sont aussi exportés dans `routes[].directionMarkers` pour le segment qui les porte. Un pictogramme d’avion ou d’hélicoptère n’est pas numérisé comme un contour de trajectoire.

Le départ LFRN 32 porte `kind: mandatory_departure`, `mandatory: true`, `phase: departure`, `runways: ["32"]`, `direction: forward` et `joinsFeatureRef`. Son tracé violet et sa flèche sont distincts des inclusions.

Les sommets graphiques détaillés restent dans `vac` ; les points publiés sont dans `points`. Les coordonnées `lat/lon` y sont aussi conservées pour les consommateurs du précédent format. Les repères publiés sans code ont des codes internes et `isOfficialReportingPoint: false`.

## Parcours automatique

`vac_auto.py` ne contient pas de listes d’objets propres à un AD. Il récupère les libellés de coordonnées des fontes anciennes `/MT`, les rapproche des graduations bleues et ajuste les axes. Deux repères distincts par axe sont nécessaires ; un ajustement incohérent est refusé. Les hémisphères proviennent de l’en-tête du terrain, avec référence VAC réutilisable pour la VACH du même AD. Ce calage interne n’est pas une validation indépendante de précision.

Les traits candidats ont `kind: automatic_track_candidate`, `status: candidate`, `direction: unknown`, `runways: null` et `mandatory: null`. Le violet est conservé comme signal de départ potentiel, sans inférer automatiquement son caractère obligatoire. Les restrictions restent dans les consignes sources. Les valeurs manquantes ne sont pas assimilées à une absence de restriction.

`batch-report.json` résume le passage. `automatic-readiness.json` conserve le passage sans sélections manuelles sur les quatre AD, pour vérifier le repérage des traits et du graticule. Les résultats relus continuent à être utilisés pour ces quatre cartes.

Les clés de site comprennent les codes OACI à quatre caractères et les identifiants locaux `LFxxx`. Les noms `AD-3.<code>.pdf` et `FR-AD-3.<code>-fr-FR.pdf` sont reconnus. S'ils coexistent, la carte graphique reste la source principale ; la fiche descriptive est conservée dans `vac.sources.VACH.supplements` et ses textes dans `notes` avec `sourceSupplement: true`. Ses numéros de page ne sont jamais interprétés comme ceux de la carte principale. `source-coverage.json` recense les documents représentés, les compléments et les documents hors fiches par site.

## Corrections pour refaire le parseur

`data/sia/vac/corrections/<OACI>.json` est indépendant du JSON cible :

```json
{
  "schemaVersion": "1.0",
  "icao": "LFAJ",
  "coordinateOrder": "longitude,latitude",
  "points": [{
    "id": "LFAJ:VAC:p1:C231:s0:v0",
    "sourceSha256": "empreinte du PDF",
    "coordinates": [0.0, 48.7],
    "sourceCoordinates": [0.0001, 48.7001],
    "deltaLonLat": [-0.0001, -0.0001],
    "sourcePdfXY": [164.3, 375.6],
    "deltaPdfXY": [-0.8, 1.2],
    "chartKind": "VAC",
    "pdfPage": 1,
    "reason": "Repositionnement dans le lecteur"
  }],
  "fields": [{
    "id": "LFAJ:04:normal",
    "chartKind": "VAC",
    "sourceSha256": "empreinte du PDF",
    "values": {"hand": "MG", "altitudeFt": 1600, "heightFt": 1000}
  }]
}
```

Exemple de structure uniquement : les coordonnées et les décalages ci-dessus ne sont pas des données à appliquer. Le serveur recalcule lui-même les décalages à partir de la base, valide les coordonnées et l’empreinte et conserve l’historique.

Un point de report publié peut être corrigé même si le calage de la page n'a pas été résolu : `deltaLonLat` reste calculé, tandis que `sourcePdfXY` et `deltaPdfXY` valent `null` en l'absence de coordonnées graphiques utilisables.

`base/<OACI>.json` est la sortie avant corrections, régénérée par le parseur. Le rafraîchissement relit `corrections` et produit le JSON cible. `history/<OACI>/` conserve les versions antérieures aux écritures du lecteur. Les corrections obsolètes sont listées et non appliquées.

Le serveur écoute uniquement `127.0.0.1`, refuse les origines étrangères, exige un jeton de session pour écrire et un SHA-256 de version pour prévenir les écrasements concurrents. Les deux actions de sauvegarde ont chacune leur propre contrôle de version. Aucun endpoint d’exécution de commande ni de chemin d’écriture arbitraire.
