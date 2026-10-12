# Licences — X-Plane Web Suite (DEFA Virtual)

Ce document dit sous quelle licence est publié le projet, et sous quelles licences ou conditions sont utilisés le code,
les images et les données de tiers. Mis à jour le 6 octobre 2026.

## 1. Le projet

© 2026 Gaétan Ryckeboer (RBR) et les contributeurs du projet.

| Partie | Licence | Texte |
|---|---|---|
| **Code** : pages et scripts (`.html`, `.js`, `.css`), outils (`.py`, `.sh`, `.cmd`), configuration | **Mozilla Public License 2.0** (MPL 2.0) | [LICENSES/MPL-2.0.txt](LICENSES/MPL-2.0.txt) |
| **Contenu** : documentation et manuels (`docs/`, `README.md`), images et illustrations du projet (`shared/deco/`, `shared/icons/`, `assets/`, planches), données d'exemple (`examples/`) | **Creative Commons Attribution – Partage dans les mêmes conditions 4.0 International** (CC BY-SA 4.0) | [LICENSES/CC-BY-SA-4.0.txt](LICENSES/CC-BY-SA-4.0.txt) |

Avis de la MPL 2.0 (annexe A), valable pour chaque fichier de code du projet :

> This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
> distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

Attribution demandée pour le contenu : « X-Plane Web Suite (DEFA Virtual) — © Gaétan Ryckeboer (RBR) et
contributeurs, CC BY-SA 4.0 », avec un lien vers le dépôt <https://framagit.org/asr/flight_planner>.

Les éléments des sections 2 à 6 restent sous leur propre licence : la MPL 2.0 et la CC BY-SA 4.0 ne s'y appliquent pas.

**Images générées.** Les décors des designs à matières (`shared/deco/`), les planches et une partie des icônes ont été
produits avec un générateur d'images (ChatGPT), puis retouchés et découpés pour le projet. Ils sont publiés sous
CC BY-SA 4.0, dans la mesure où des droits d'auteur s'y attachent.

## 2. Code tiers inclus dans le dépôt

| Composant | Version | Licence | Emplacement | Titulaire |
|---|---|---|---|---|
| MapLibre GL JS (script et feuille de style) | 5.6.0 | BSD 3-Clause | `shared/carto/maplibre-gl.js`, `maplibre-gl.css` | © MapLibre contributors (et Mapbox pour le code d'origine) — <https://github.com/maplibre/maplibre-gl-js/blob/v5.6.0/LICENSE.txt> |
| Natural Earth, Admin 0 – Countries 1:50m (contours simplifiés des zones de données aéronautiques) | 5.1.2 | domaine public | `shared/carto/aero_zones_geo.js` (généré par `tools/build_aero_zones.py`) | Made with Natural Earth — <https://www.naturalearthdata.com/about/terms-of-use/> |
| jsPDF | 2.5.2 | MIT | `apps/cpco/jspdf.umd.min.js` | © James Hall, yWorks GmbH et contributeurs — <https://github.com/parallax/jsPDF> |
| Modèle de Poll et Schumann (croisière, porté en JavaScript) et ses paramètres d'avions (69 avions de ligne, codes équivalents) | pycontrails 0.64 (fichiers `ps-*-20250328.csv`) | Apache 2.0 ([LICENSES/Apache-2.0.txt](LICENSES/Apache-2.0.txt)) | `shared/fuel_poll_schumann.js` (paramètres générés par `tools/build_fuel_poll_schumann.py`) | © 2021-present Contrails.org and the Breakthrough Energy Foundation — <https://github.com/contrailcirrus/pycontrails> ; modifications : partie croisière seule, sans plafond de poussée ni limite de Mach selon l'altitude |
| js-yaml | 4.1.0 | MIT | `shared/mission_core/vendor/js-yaml.min.js` (licence : `js-yaml.LICENSE`) | © 2011-2015 Vitaly Puzrin — <https://github.com/nodeca/js-yaml> |

Chargé à la demande depuis un CDN, dans un outil de développement seulement : **acorn** 8.11.3 (MIT, © Marijn Haverbeke
et contributeurs), par `tools/verify_format.html` depuis cdnjs.

Modules Python utilisés par certains outils, installés à part et non inclus : Pillow (licence HPND / MIT-CMU), numpy
(BSD 3-Clause), PyYAML (MIT), pypdf (BSD 3-Clause), pdfplumber (MIT), jsbeautifier et cssbeautifier (MIT).

## 3. Images et textures de tiers

| Élément | Source | Licence |
|---|---|---|
| Textures photographiques (`shared/textures/*.webp`) | ambientCG — <https://ambientcg.com> (correspondance fichier par fichier : [shared/textures/CREDITS.md](shared/textures/CREDITS.md)) | CC0 1.0 (domaine public) |
| Icônes de ligne (`shared/icons/repository_icons.js`) | dessinées pour le projet, dans le style de Lucide (<https://lucide.dev>) ; aucun tracé de Lucide n'est copié | celle du projet (section 1) |
| Polices Inter et Orbitron (`shared/fonts/*.woff2`, design Tactique) | Inter : The Inter Project Authors (<https://github.com/rsms/inter>) ; Orbitron : The Orbitron Project Authors (<https://github.com/theleagueof/orbitron>) — sous-ensembles latins de Fontsource ; textes de licence : `shared/fonts/OFL-*.txt` | SIL Open Font License 1.1 |

## 4. Données incluses dans le dépôt

| Données | Source | Licence ou conditions | Crédit |
|---|---|---|---|
| Villes (`shared/carto/villes_geonames.csv`) | GeoNames — <https://www.geonames.org> | CC BY 4.0 | « GeoNames (geonames.org), CC BY 4.0 » |
| Liste des codes de types (`AircraftDB/aircraft_types.txt`) | désignateurs OACI (Doc 8643) utilisés par la suite | codes seulement (faits), sans les données de l'OACI | — |
| Exemples (`examples/references/`) | indicatifs publics, flotte fictive, structure de la flotte DEFA Virtual | celle du contenu (section 1) | — |

**Non publiées, reconstruites sur chaque poste.** La base des types d'aéronefs (`AircraftDB/aircraft_db.js` : OACI,
Doc 8643, recoupée EUROCONTROL, Wikidata) et celle des performances (`AircraftDB/aircraft_perf.js` : EUROCONTROL,
*Aircraft Performance Database*) ne sont ni publiées ni redistribuées : elles sont ignorées par git et complétées sur
le poste de chaque utilisateur, type par type, par `AircraftDB/update_aircraft_db.py`. Elles restent © OACI et
© EUROCONTROL. Le bloc `simbrief` de `aircraft_perf.js` (consommation de croisière, masses, plafond : liste publique
`inputs.airframes.json` de SimBrief) suit la même règle : lu sur chaque poste, jamais publié ; © Navigraph (SimBrief). Le bloc `airframedb` et les alias qu'il ajoute viennent des fiches publiques d'Airframe DB
(<https://airframedb.com>, accès automatisé limité comme le demandent ses conditions) ; ses caractéristiques sont celles
de Wikipédia (CC BY-SA 4.0) ; lus sur chaque poste, jamais publiés. En dernier recours, pour un désignateur que
ni l'OACI ni EUROCONTROL ne connaissent (type retiré, comme la Caravelle S210), la fiche d'Aviation Fanatic
(<https://www.aviationfanatic.com>, © Bálint Tóth, sans licence ouverte) est lue : une page par type ajouté à la main,
à la demande, jamais en masse ; nom, catégorie, motorisation et turbulence gardés sur le poste, jamais publiés.

## 5. Données aéronautiques

Les fichiers aéronautiques sont téléchargés par chaque utilisateur sur son poste (dossier `data/sia/`, hors du dépôt du
code). Ils restent sous la licence de leur fournisseur. Seules les données sous licence ouverte (SIA, FAA, Mil AIP
britannique) pourraient être redistribuées ; les autres ne doivent jamais être commitées ni publiées.

| Fournisseur | Données | Licence ou conditions | Crédit |
|---|---|---|---|
| **SIA** (Service de l'information aéronautique, DGAC) | eAIP France, exports AIXM 4.5 et XML SIA | Licence ouverte du SIA (adaptée de la Licence Ouverte Etalab 2.0) : réutilisation libre, même commerciale, sans altérer les données, en citant la source et la date de mise à jour ; aucune garantie, en particulier pour la sécurité des vols | « Service de l'Information Aéronautique — Données originales téléchargées sur https://www.sia.aviation-civile.gouv.fr, mise à jour du [date du cycle AIRAC] » |
| **DIRCAM** (Direction de la circulation aérienne militaire) | MILAIP : ENR 5.7 (axes de ravitaillement en vol), zones RTBA / AZBA | réutilisation non commerciale admise, sans altération, en citant l'origine et la date ; usage commercial sur autorisation préalable | « DIRCAM — MILAIP, amendement [n° / date] » |
| **FAA** (Federal Aviation Administration, États-Unis) | ADDS (espaces à usage spécial, routes MTR, classes d'espace), NASR, CIFP, message des tracks NAT du jour (NMS, `nms.aim.faa.gov/datanat/nat.json`) | domaine public (œuvres du gouvernement fédéral américain) ; ne pas laisser croire à un soutien de la FAA | « Source : FAA » |
| **openAIP** | exports par pays (espaces, aérodromes, balises, points VFR) | CC BY-NC 4.0 : usage non commercial, avec attribution ; les données ne doivent pas être vendues | « © openAIP — https://www.openaip.net, CC BY-NC 4.0 » |
| **ENAIRE** (Espagne) | AIP en AIXM 5.1 | conditions de réutilisation à vérifier (avis légal d'ENAIRE restrictif ; licence de données ouvertes du ministère des Transports pour les jeux publiés) : usage personnel seulement | « Fuente: ENAIRE — AIP España » |
| **NATS** (Royaume-Uni) | UK AIP en AIXM 5.1 (après inscription) | conditions du site de NATS, pas de licence ouverte : usage personnel seulement | « Source: NATS — UK AIP » |
| **No 1 AIDU, Ministry of Defence** (Royaume-Uni) | UK Mil AIP | Open Government Licence v3.0 | « Contains public sector information licensed under the Open Government Licence v3.0. » |
| **X-Plane** (Laminar Research) | données de navigation par défaut (`Resources/default data`) | GNU GPL v2 ou ultérieure, selon l'en-tête de chaque fichier (© Robin A. Peel) | lues sur le poste de l'utilisateur, jamais copiées |
| **Navigraph / Jeppesen** | données de navigation de « Custom Data » d'X-Plane | licence personnelle, non transférable : ni copie, ni publication, ni redistribution | « Navigation data © Jeppesen, via Navigraph » ; lues sur le poste de l'utilisateur, jamais copiées |

**Données calculées ou extraites sur le poste de l'utilisateur, jamais redistribuées :**
- la grille MORA (`data/sia/mora.csv`) est calculée par chaque utilisateur (Paramètres › Maintenance › Données
  aéronautiques) à partir des obstacles du SIA, du relief Terrarium et des sommets d'OpenStreetMap. Pour sa part issue
  d'OpenStreetMap, elle relève de l'**ODbL 1.0** ; elle cite le SIA (cycle AIRAC des obstacles) et les sources du relief
  (section 6). Elle n'est pas publiée : son usage est de la responsabilité de l'utilisateur, dans le respect de ces
  licences. Ces valeurs sont calculées, elles ne sont pas certifiées ;
- les axes de ravitaillement (`data/sia/miam-enr-5-7-*.xml`) sont tirés de la MILAIP ENR 5.7 (DIRCAM) : réutilisation
  non commerciale, avec mention de l'amendement ; pas de redistribution.

## 6. Services en ligne utilisés par les pages

Ces services sont appelés depuis le navigateur de l'utilisateur. Rien de ce qu'ils renvoient n'est conservé dans le
dépôt, sauf mention contraire. Chacun a ses conditions d'usage, à respecter.

| Service | Usage dans la suite | Licence ou conditions | Crédit affiché |
|---|---|---|---|
| **OpenStreetMap** (tuiles raster et vectorielles) | fonds de carte du studio et des cartes de vol | données ODbL 1.0 ; politique d'usage des tuiles de l'OSMF (crédit visible, pas de téléchargement massif ni de hors-ligne) | « © OpenStreetMap contributors » — <https://www.openstreetmap.org/copyright> |
| **Overpass API** | sommets OSM pour la grille MORA | données ODbL 1.0 ; usage raisonnable (quotas du serveur public) | « © OpenStreetMap contributors » |
| **OpenTopoMap** | fond topographique | CC BY-SA 3.0 | « Kartendaten: © OpenStreetMap-Mitwirkende, SRTM \| Kartendarstellung: © OpenTopoMap (CC-BY-SA) » |
| **OpenFreeMap** | fonds vectoriels | gratuit, usage commercial admis | « OpenFreeMap © OpenMapTiles — Data from OpenStreetMap » |
| **VersaTiles** | fonds vectoriels | données OSM (ODbL) et ESA WorldCover (CC BY 4.0) | « © OpenStreetMap contributors · CC BY 4.0 ESA WorldCover 2021 · VersaTiles » |
| **Terrain Tiles (Terrarium, Mapzen, sur AWS)** | relief : coupe verticale, grille MORA | sources multiples, chacune à citer | « Terrain data: USGS 3DEP, SRTM, GMTED2010, NOAA ETOPO1, Copernicus EU-DEM, Geoscience Australia, data.gv.at, Natural Resources Canada, INEGI, LINZ, Kartverket, Environment Agency (UK), ArcticDEM » — <https://github.com/tilezen/joerd/blob/master/docs/attribution.md> |
| **Open-Meteo** (prévisions et archives) | météo à l'heure du vol, METAR calculé | données CC BY 4.0 ; API gratuite réservée à l'usage non commercial (quotas journaliers) ; archives : Copernicus ERA5 | « Weather data by Open-Meteo.com » — <https://open-meteo.com> ; « Contains modified Copernicus Climate Change Service information » |
| **mwgg/Airports** (via jsDelivr) | liste mondiale des aérodromes, chargée à la demande | MIT, © 2014 mwgg | « Airports: github.com/mwgg/Airports (MIT) » |
| **VATSIM** (data.vatsim.net, api.vatsim.net, metar.vatsim.net, réservations ATC) | suivi en direct, plans de vol, METAR, sessions ATC du planning | conditions d'utilisation de VATSIM ; données consultées, pas archivées ni redistribuées | « Data: VATSIM » |
| **IVAO** (api.ivao.aero, tracker) | suivi en direct, plans de vol | conditions de l'IVAO (fréquence d'interrogation limitée) | « Data: IVAO » |
| **StatSim** | historique des vols (consultation) | conditions du site | — |
| **SimBrief** (Navigraph) | import des plans de vol et des appareils de l'utilisateur | conditions développeur de Navigraph : appel sur action de l'utilisateur seulement | « Flight plans: SimBrief by Navigraph » |
| **Framagit** (API GitLab) | contrôle des mises à jour de la suite | conditions de Framasoft | — |
| **Site DEFA Virtual** | journal des vols et flotte, copiés-collés par l'utilisateur | données de la compagnie virtuelle | — |
| **Traducteur intégré du navigateur** (Chrome, Edge) | traduction des briefs sur le poste | fonction du navigateur, rien n'est envoyé par la suite | — |

## 7. Avertissement

Les données et les calculs de la suite (espaces aériens, MORA, routes, météo, performances) servent à la simulation de
vol. Ils ne sont ni officiels, ni certifiés, et ne doivent jamais servir à la navigation aérienne réelle. Les
fournisseurs cités ne soutiennent pas ce projet et n'en sont pas responsables.

Une source a été oubliée ou mal citée ? Signalez-le par une demande sur <https://framagit.org/asr/flight_planner>.
