# Format des données — version 2.0

Le résultat principal est `data/vfr-compiled.json`. `data/vfr-geometry.geojson` permet d'afficher les points et les géométries interprétées dans un outil SIG. Une géométrie interprétée n'est jamais présentée comme une géométrie officielle.

## Aérodrome

Chaque objet `aerodromes[]` contient :

| Champ | Sens |
|---|---|
| `icao` | Identifiant de l'AD |
| `fingerprint` | SHA-256 du PDF effectivement utilisé |
| `status` | `calculé`, `interprété`, `obsolète` ou `sans relations` |
| `interpretationScope` | `none`, `partial` ou `complete` |
| `lastCalculation` | Date UTC, AIRAC du calcul, version du parseur, AIRAC source et empreinte |
| `lastInterpretation` | Date et AIRAC de l'analyse humaine, empreinte analysée et portée |
| `source` | Fichier d'origine, éditeur et AIRAC source s'il est établi |
| `points` | Points publiés et sommets intermédiaires manuels |
| `routes` | Séquences candidates ou interprétées |
| `relations` | Arêtes entre points de report et arêtes de géométrie |
| `instructions` | Consignes écrites extraites, avec page source |
| `evidencePages` | Texte extrait des pages, cartes comprises pour repérage |
| `unresolvedCoordinateRows` | Coordonnées détectées dont le code n'a pas été résolu |
| `automaticRouteCandidates` | Extraction automatique préservée lorsqu'une interprétation remplace les routes |

`interprété` signifie qu'une analyse manuelle a été appliquée à cette empreinte. Il faut lire `interpretationScope` et `interpretation.notes` : les sept analyses livrées sont partielles. `sans relations` exige une confirmation explicite dans l'interprétation ; ce statut n'est jamais attribué sur la seule absence de reconnaissance automatique.

## Points

Les coordonnées sont WGS84, dans l'ordre `[longitude, latitude]`.

- Point de report publié : `origin: "published"`, `role: "reporting_point"`. Son extraction peut rester au statut `candidate`.
- Point d'aérodrome transcrit : `origin: "published"`, `role: "aerodrome_reference_point"`, `extractionMethod: "manual_transcription"`.
- Sommet ajouté par analyse : `origin: "manual"`, `role: "intermediate_waypoint"`, `isOfficialReportingPoint: false`, `radioReportRequired: false`.

Un point manuel conserve la page, les coordonnées graphiques choisies, le calage utilisé, le motif du placement et une indication de précision. Les points livrés sont des interprétations graphiques ; leur précision métrique n'est pas validée (`accuracyM: null`). Le nombre de décimales enregistré n'est pas une garantie de précision.

## Routes et relations

`pointRefs` est la séquence des points de report ou d'AD. `geometryPointRefs` est la séquence détaillée de sommets dessinés, points manuels inclus. Elle peut ne couvrir qu'une partie de la route (`geometryPartial: true`). Une intégration non numérisée n'est pas remplacée par une droite vers le centre de l'AD.

`relations[].relationType` distingue `report_sequence` et `geometry_leg`. Le sens est `forward`, `both` ou `unknown`. Les conditions et références de consignes sont attachées aux routes et aux relations. Les pistes ne sont renseignées que lorsqu'elles ont été interprétées explicitement.

Les `instructions` contiennent le texte extrait, pas une réécriture officielle. Les conditions structurées n'épuisent pas toutes les consignes : leur texte reste joint. Une valeur `null` signifie inconnue ou non interprétée, jamais absence de restriction.

## Interprétations persistantes

Les fichiers `interpretations/OACI.json` sont édités séparément du résultat généré. Leur empreinte `sourceSha256` lie l'analyse au PDF lu. Si elle ne correspond plus :

1. l'AD passe à `obsolète` ;
2. les points et routes manuels ne sont pas appliqués ;
3. les nouveaux candidats automatiques restent disponibles ;
4. la date et l'empreinte de l'ancienne interprétation restent identifiables ;
5. l'ancien JSON est conservé dans l'historique du refresh.

Une empreinte différente peut résulter d'un changement purement documentaire. Une relecture est nécessaire avant de réactiver l'interprétation ; ne pas remplacer simplement l'empreinte sans contrôle.
