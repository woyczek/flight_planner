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

**`aircraft` (SOG-0253, 13 Nov 2026)** : la sorte d'appareil d'une séquence, `fixed` (voilure fixe), `rotary` (voilure tournante), `both` ou `unknown` (absent = `unknown`) ; saisie à la main dans `interpretations/<OACI>.json` d'après la carte (comme `direction`), écrite dans `sia/vfr/<OACI>.json` pour une séquence interprétée seulement, portée par les relations et la géométrie ; une autre valeur est refusée à l'import. Rien n'est lu automatiquement du dessin.

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

## VfrCircuits — the circuits drawn by the user's extractor (SOG-0253)

The traffic circuit of a VAC chart is in the drawing, not in the text. The user's extractor writes it as XML; this is what the launcher reads (`tools/vfr_circuits.py`, verb `vfr/circuits`). The file is deposited by the page as `data/local/upload/vfr_circuits.xml` (recognised by its root), kept local, never published.

```xml
<VfrCircuits airac="2610" extractor="name v1">
  <Aerodrome icao="LFRN" source="AD-2.LFRN.pdf" sha256="<64 hex: the PDF the extractor read>">
    <Circuit id="RWY10-A" runways="10 28" aircraft="fixed|rotary|both" altitudeFt="1000" altitudeRef="AAL|AMSL" closed="true|false" status="extracted|checked">
      <Point seq="1" lat="48.0720" lon="-1.7300" code="N"/>  <!-- code: the published report point, optional -->
      <Point seq="2" lat="48.0720" lon="-1.6000"/> ...
    </Circuit>
  </Aerodrome>
</VfrCircuits>
```

- **Points in the order of the flight**: the order is the direction (no separate field); WGS84 decimal degrees; `seq` sorts them when given. `hand` is deduced: `left` when the closed outline turns counter-clockwise seen from above (north up), `right` otherwise, `unknown` when open or under three points.
- **Absent = unknown, never zero**: `aircraft`, `altitudeFt` (with its `altitudeRef`, both or none), `runways`, `status`, `code`. Nothing is invented: no default circuit is written (the Map says « main gauche — par défaut, rien de publié » and draws only extracted circuits).
- **Bounds** (an untrusted file): 2 MB; at most 200 aerodromes, 20 circuits per aerodrome, 64 points per circuit (over: the whole file is refused, said); UTF-8 only; no `DOCTYPE` / `ENTITY` (refused by the parser itself, by construction, not only by a search in the bytes); finite numbers, latitude ±90, longitude ±180; names reduced to `[A-Za-z0-9 _.-]`; a malformed circuit or point is left out and counted in `warnings`.
- **Obsolete when the PDF changes**: the `sha256` of an aerodrome is compared with the one the compilation read (`sia/vfr/<ICAO>.json`, `source.sha256`): equal = `current`, different = `obsolete` (its circuits are not returned), unknown on either side = `unchecked`.
- **Result of the verb** (read only, nothing written): `{ ok, airac, extractor, aerodromes: { ICAO: { state, source, circuits: [{ id, runways, aircraft, altitude: { ft, ref } | null, closed, hand, status, points: [{ lat, lon, code? }] }] } }, counts, warnings }`, or `{ ok: false, reason: 'no-file' | 'refused', message }`. The page keeps it in memory (a local layer, like the FRA points).
