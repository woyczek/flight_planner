# Assets à fournir — designs à matières

Document de suivi des images à produire (ChatGPT) pour que chaque design à matières (Cabinet, Carnet de vol = `flightlog`,
Durci = `field`, Aqua) ne soit plus que des jetons et des images aux noms convenus : voir
[REFACTORING_TOOLKIT.md › Phase 2](REFACTORING_TOOLKIT.md#phase-2--supprimer-les-exceptions-pistes-30-septembre-2026).
Chaque asset livré fait disparaître une exception de `shared/design_deco.js` ou de `shared/designs_skeuo.css`.

**État à jour : `python tools/assets_status.py`** (tableau par famille et par design, liste des manquants ; `--new` : images
déposées depuis le dernier relevé, `--mark` : noter le relevé). Les cases de ce document datent du 30 septembre 2026 et ne
sont plus tenues : l'outil fait foi. Ce document garde les consignes de génération et d'intégration.

Livré depuis : dossiers de mission des quatre designs (Mes missions) ; signets Cabinet et Carnet de vol ; appareil de page
du Carnet de vol (carnet fermé + DME) ; panneaux du **ton clair** du Carnet de vol (parchemin, gravures bleues :
`shared/deco/flightlog/clair/`, `PANELS.flightlog.clair`) — 17 sur 18, manque aircraft en paysage. Panneaux du ton clair de
Cabinet : 18 sur 18 (2 octobre 2026 ; `PANELS.cabinet.clair` sans alias, anciens `ships` / `instruments` retirés). Les livraisons arrivent
au fil de l'eau, avec des améliorations et des doublons : le tri (meilleure version, remplacement) se fait à
l'intégration ; les sources restent dans le dossier de dépôt.

## Mode d'emploi

**État d'un asset** : deux cases par asset. Aucune cochée = à faire ; `livré` = PNG source déposé dans le dossier cible ;
`intégré` = WebP produit, code modifié, page vérifiée, exception supprimée.

**Génération (ChatGPT)** :

- joindre à la demande une ou deux images existantes du même design (chemins indiqués pour chaque asset) comme référence
  de style, et le dire : « même matière, même lumière, même palette que l'image jointe » ;
- demander le format natif le plus proche (paysage 1536 × 1024, portrait 1024 × 1536, carré 1024 × 1024) : le recadrage
  au ratio final se fait à la conversion ;
- pour un objet détouré : « fond transparent (PNG avec canal alpha), objet entier, rien de coupé au bord, ombre portée
  légère intégrée ou aucune » ; si la transparence échoue, fond uni gris neutre à détourer ensuite ;
- jamais de texte lisible, de logo, de marque ni d'insigne réel, sauf les inscriptions imposées ci-dessous ;
- lumière venant du haut à gauche pour tous les designs (cohérente avec les objets déjà en place) ;
- déposer le PNG tel quel dans le dossier cible (nom d'origine de ChatGPT accepté) ; **les PNG et planches sources ne sont
  jamais supprimés** (ni ceux déjà présents, ni les nouveaux).

**Conversion en WebP** (ImageMagick 7, à la racine du dépôt) :

```bash
# panneau paysage (w) : 1100 × 550, opaque
magick "source.png" -resize 1100x550^ -gravity center -extent 1100x550 -quality 86 shared/deco/<design>/<dossier>/panel-<thème>-w.webp
# panneau portrait (t) : 550 × 1100, opaque
magick "source.png" -resize 550x1100^ -gravity center -extent 550x1100 -quality 86 shared/deco/<design>/<dossier>/panel-<thème>-t.webp
# objet détouré : rogné à son contenu, plus grand côté limité (ici 480 px)
magick "source.png" -trim +repage -resize "480x480>" -quality 86 -define webp:alpha-quality=92 shared/deco/<design>/<nom>.webp
# frise de pied de page : 1394 px de large, opaque
magick "source.png" -resize 1394x -quality 86 shared/deco/<design>/footer.webp
```

Découpe dans une planche à plusieurs objets : `tools/icons_from_sheets.html` (serveur local, voir `tools/README.md`).
Après toute nouvelle image : `python tools/bump_versions.py` (versions de cache), puis vérification dans une page du
design, décor complet, tons clair et sombre, en recherchant les erreurs de console.

**Familles d'images** (rappel de `design_deco.js`) :

| Famille | Rôle | Format | Fichiers |
| --- | --- | --- | --- |
| `PANELS` | fond d'un bloc choisi par thème | opaque, 1100 × 550 (`w`) et 550 × 1100 (`t`) | `panel-<thème>-<w\|t>.webp` |
| `SHEETS` | feuille de registre sous les tableaux des registres (ton clair) | morceaux découpés par `tools/cut_register_sheet.py` | `sheet-*.webp` |
| `PROPS` | objet posé dans le coin bas droit d'un bloc | transparent, ≈ 300 à 450 px | nom libre, cité dans `PROPS` |
| `SETS.between` | objets entre les blocs | transparent, ≈ 150 à 480 px | nom libre, cité dans `SETS` |
| `SETS.sides` | objets des marges (grands écrans) | transparent, ≈ 250 à 450 px | nom libre, cité dans `SETS` |
| `SETS.device` | appareil de page (deux objets côte à côte, déplaçables) | transparent, 700 à 1000 px de large | nom libre, cité dans `SETS` |
| `SETS.foot` | frise du pied de page | opaque, 1394 × 74 à 108 | `footer.webp` |
| carnets du Studio | aperçus de cartes (`apps/cpco/map_parser.html`) | transparent | `notebook-closed.webp`, `notebook-open.webp` |

**Thèmes des panneaux** (codes imposés par le programme, tableau `THEMES` de `design_deco.js`, dans cet ordre) :

| Code | Blocs concernés (motifs reconnus dans le titre) | Sujet du panneau |
| --- | --- | --- |
| `aircraft` | appareil, avion, flotte, performances, masse, centrage | aéronefs |
| `airfield` | aérodrome, terrain, piste, atterrissage, SIA, OACI | terrains et pistes |
| `time` | jour, nuit, heure, date, période, planning, ODV, météo | temps, horloges, ciel |
| `radio` | réseau, radio, fréquence, synchro, sauvegarde, import, export | transmissions |
| `nav` | carte, route, navigation, profil, vol, carburant, vent, cible | navigation |
| `gear` | équipement, matériel, cargo, médical, capacités, charge | matériel et emport |
| `awards` | résultats, succès, bilan, synthèse, statistiques, répartition | distinctions, bilans |
| `families` | familles, séries, types, missions, catégories | familles de missions |
| `ops` | tout le reste (défaut) | opérations, table de travail |

**Règle de composition des panneaux** (commune à tous les designs) : le panneau est affiché en fond de bloc, calé à droite,
avec un fondu qui l'efface vers la gauche (`.repo-deco-panel`, masque de 12 % à gauche à 100 % aux 85 % de la largeur) et
un voile sous les tableaux. L'intérêt visuel se place donc **dans le tiers droit et le long des bords** ; le centre et la
moitié gauche restent calmes, peu contrastés, sans détail fin (du texte s'y pose). Vue de face ou légère plongée, pas de
perspective marquée, pas de cadre ni de marge blanche autour de l'image. Le portrait (`t`) n'est pas un recadrage du
paysage : même sujet recomposé en hauteur, l'intérêt en haut et en bas à droite.

---

## 1. Aqua

Matière : métal brossé clair, verre dépoli, boutons « gel » translucides, eau, reflets spéculaires, bleu clair à bleu
profond ; esthétique des interfaces de bureau du début des années 2000. Références : `shared/deco/aqua/bg-water.webp`
(eau et verre), `shared/deco/aqua/gauge-case.webp` (boîtier de cadran chromé), `shared/textures/brushed-light.webp`.
Aqua n'a aujourd'hui que deux images : il ne rejoint les familles communes qu'avec les livraisons ci-dessous.
Aqua n'a pas de cadre cousu (`frame` absent de son entrée dans `repository_tree`) : certaines règles communes sont
réservées à `html[data-skeuo="frame"]` (voir 1.2).

### 1.1 Panneaux par thème (18 images)

- Dossier cible : `shared/deco/aqua/panels/`
- Fichiers : `panel-<thème>-w.webp` et `panel-<thème>-t.webp` pour les 9 thèmes (`aircraft`, `airfield`, `time`, `radio`,
  `nav`, `gear`, `awards`, `families`, `ops`)
- Format : paysage 1100 × 550 (`w`), portrait 550 × 1100 (`t`) ; opaque ; source 1536 × 1024 / 1024 × 1536
- Style : fond clair et lumineux (le bloc Aqua est du verre blanc en ton clair, un voile de 35 % l'atténue), eau et verre
  en couches, bleu dominant (la couleur d'accent Aqua est choisie par l'utilisateur : rester dans les bleus neutres,
  sans autre teinte forte) ; le sujet du thème traité en silhouettes de verre, reflets ou gravure légère, jamais en photo
  réaliste chargée ; même famille que `bg-water.webp`

| Thème | Paysage `w` | Portrait `t` |
| --- | --- | --- |
| `aircraft` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| `airfield` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| `time` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| `radio` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| `nav` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| `gear` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| `awards` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| `families` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| `ops` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |

Consigne ChatGPT (une demande par thème, les deux orientations à la suite) :

> Fond décoratif pour un panneau d'interface, style « Aqua » des bureaux informatiques du début des années 2000 : verre
> dépoli, eau claire, reflets spéculaires, métal brossé clair, dominante bleu clair, même matière et même lumière que
> l'image jointe. Sujet : **<sujet du thème, voir le tableau des thèmes>**, traité en silhouettes de verre translucide ou
> en reflets dans l'eau, sans réalisme photographique. Composition : tout l'intérêt dans le tiers droit et sur les bords ;
> centre et moitié gauche très calmes, clairs, sans détail (du texte sera posé dessus). Vue de face, sans perspective,
> sans cadre, sans texte, sans logo. Format paysage 1536 × 1024. Puis la même scène recomposée en portrait 1024 × 1536,
> l'intérêt en haut et en bas à droite.

Intégration :

1. Convertir (commandes du mode d'emploi) vers `shared/deco/aqua/panels/`.
2. `design_deco.js` : ajouter `aqua: { dir: 'panels', only: {} }` à `PANELS` (ou `{ dir: 'panels' }` quand `only` sera
   facultatif, Phase 2 point 7).
3. Supprimer `BG.aqua` (quatre entrées `aqua/bg-water`) ; `bg-water.webp` reste dans le dépôt.
4. `designs_skeuo.css` : les opacités propres à Aqua des fonds `.repo-deco-bg-cover` (`html[data-design="aqua"]` 35 % et
   50 % en sombre) deviennent l'opacité du panneau Aqua ; régler le voile `--repo-veil` du ton clair et du ton sombre.
5. **Exception supprimée** : `BG.aqua`. Avec 2.1 (Carnet de vol), la famille `BG` n'a plus d'utilisateur : `BG`, l'étape 1
   de `backgrounds()` et les attributs `data-deco-bg` des pages (`map_parser.html`, `mission_editor.html`,
   `flight_performance_planner.html`, `map_planner.html`, `global_reporting.js`) peuvent disparaître.

### 1.2 Carnets du Studio (2 images)

- [ ] livré · [ ] intégré — `shared/deco/aqua/notebook-closed.webp` : carnet fermé, portrait, transparent, source
  1024 × 1536, livré ≈ 600 × 880
- [ ] livré · [ ] intégré — `shared/deco/aqua/notebook-open.webp` : carnet ouvert à plat, paysage, transparent, source
  1536 × 1024, livré ≈ 900 à 1000 px de large

Contraintes : mêmes cadrage et proportions que `shared/deco/flightlog/notebook-*.webp` et `shared/deco/field/notebook-*.webp`
(vue de dessus, carnet entier, ombre légère ou aucune) ; pages ouvertes **vierges et claires** (la carte est posée
dessus), réglure très légère ou absente ; carnet fermé tenant dans la hauteur du carnet ouvert. Matière Aqua :
couverture en plastique translucide bleuté ou en aluminium brossé, fermeture à bouton gel, reliure chromée.

Consigne ChatGPT :

> Carnet de notes vu exactement de dessus, style « Aqua » début des années 2000 : couverture en plastique translucide
> bleu clair et aluminium brossé, fermoir en bouton gel, reliure chromée ; même matière que l'image jointe. Carnet entier,
> fond transparent, aucune inscription. 1) Fermé, format portrait. 2) Le même ouvert à plat, deux pages blanches vierges
> (réglure à peine visible), format paysage, pages bien dégagées sans objet posé dessus.

Intégration :

1. Convertir (objet détouré, sans `-resize` si la taille convient) ; relever le ratio du carnet ouvert (largeur / hauteur).
2. `apps/cpco/map_parser.html` (règles des carnets) : ajouter
   `html[data-design="aqua"]{--nb-closed:url(".../aqua/notebook-closed.webp");--nb-open:url(".../aqua/notebook-open.webp");--nb-ratio:<L>/<H>;--nb-pad:<haut> <droite> <bas> <gauche>}`
   (marges de la carte sur les pages, en %).
3. Les règles du carnet sont réservées à `html[data-skeuo="frame"]` : Aqua n'en a pas. Soit elles passent sur la présence
   des jetons (composant commun `.repo-notebook`, Phase 2 point 5), soit Aqua reçoit `frame:true` (à écarter : le cadre
   cousu n'est pas dans sa matière). Choix recommandé : le composant commun.
4. **Effet** : aucune règle propre à Aqua ; le carnet devient un composant commun à tous les designs à matières.

### 1.3 Feuille de registre (1 planche + pièces)

- [ ] livré · [ ] intégré — planche source dans `shared/deco/aqua/` (nom libre, cité dans `CONFIGS['aqua']['src']`)
- [ ] livré · [ ] intégré — (facultatif) `shared/deco/aqua/sheet-head.webp`, en-tête transparent
- [ ] livré · [ ] intégré — (facultatif) `shared/deco/aqua/sheet-stamp.webp`, cachet transparent
- [ ] livré · [ ] intégré — (facultatif) `shared/deco/aqua/sheet-string.webp`, accessoire posé sur le bord gauche,
  transparent, portrait (≈ 170 × 650)

Planche : portrait, source 1024 × 1536, opaque ; **suivre la règle commune du chapitre 5** (papier vierge, bords droits,
pièces séparées). Objet : une feuille blanche tenue dans un porte-documents Aqua (plateau de plastique translucide bleuté
ou d'aluminium brossé, pince chromée à bouton gel en haut), bords réguliers sur les quatre côtés, coins distincts. Le
cadre doit pouvoir se découper en quatre coins + quatre tranches répétables : pas d'élément unique au milieu d'un côté
(la pince va dans un coin, ou se livre à part comme l'en-tête).

Consigne ChatGPT :

> Porte-documents vu exactement de face, parfaitement à plat, sans perspective : plateau de plastique translucide bleu
> clair aux bords arrondis, pince chromée à bouton gel dans le coin supérieur gauche, style interface « Aqua » début des
> années 2000, même matière que l'image jointe. Il tient une feuille de papier blanc **entièrement vierge** (ni tableau,
> ni ligne, ni texte). Bords du plateau parallèles aux bords de l'image, épaisseur régulière, éclairage uniforme ; le
> plateau occupe toute l'image avec une marge de 40 px. Format portrait 1024 × 1536.

Intégration :

1. `tools/cut_register_sheet.py` : ajouter une configuration `'aqua'` à `CONFIGS` (coordonnées relevées sur la planche :
   `tl`, `tr`, `bl`, `br`, `top`, `bot`, `left`, `right`, `pieces` vide, `paper`) sans `erase` ni `shear` ; lancer
   `python tools/cut_register_sheet.py aqua`.
2. `design_deco.js` : `SHEETS.aqua = SHEET_BLOCKS` (ou `SHEETS` étendu à tous les designs qui ont des morceaux, Phase 2).
3. `designs_skeuo.css` : bloc `html[data-design="aqua"]{--sheet-*…;--sh-*…}` avec les jetons affichés par le script
   (ou écrits par lui, Phase 2 point 4) ; `--sheet-head`, `--sheet-stamp`, `--sheet-string` à `none` si non livrés.
4. `python tools/bump_versions.py`, vérifier un registre (Registre des missions, ton clair).
5. **Effet** : Aqua reçoit la feuille commune ; aucune exception de plus.

### 1.4 Appareil de page (2 objets)

- [ ] livré · [ ] intégré — `shared/deco/aqua/<objet-principal>.webp` (nom descriptif en anglais, ex. `radio`), transparent,
  ≈ 700 à 1000 px de large
- [ ] livré · [ ] intégré — `shared/deco/aqua/<objet-compagnon>.webp`, transparent, ≈ 500 à 700 px de large

Règle de choix : un appareil principal lié aux opérations aériennes (réception, transmission, navigation, météo) et un
objet compagnon plus petit qui s'y rapporte (câble, casque, carnet, support) ; les deux vus de face à la même hauteur
d'œil, posés sur un même plan, à la même échelle apparente ; matière Aqua (coque translucide colorée, aluminium brossé,
touches gel, écran à reflets). Modèles de cadrage : `shared/deco/cabinet/radio.webp` + `notebook.webp`,
`shared/deco/field/radio.webp` + `cable.webp`.

Consigne ChatGPT :

> Deux objets séparés, vus de face à hauteur d'œil, sur fond transparent, style « Aqua » début des années 2000 (coque en
> plastique translucide bleu, aluminium brossé, boutons gel, reflets spéculaires, même matière que l'image jointe) :
> 1) un appareil d'opérations aériennes de ton choix (poste radio, récepteur de navigation, station météo…), large ;
> 2) un objet compagnon plus petit qui l'accompagne naturellement. Même lumière, même échelle, sans texte ni logo.

Intégration : `design_deco.js`, `SETS.aqua.device = [['<principal>', <hauteur px>], ['<compagnon>', <hauteur px>, <inclinaison>]]`,
`deviceAt: 3`. **Effet** : Aqua reçoit l'appareil de page commun.

### 1.5 Objets (entre les blocs, marges, coins de bloc)

- [ ] livré · [ ] intégré — 3 objets de coin de bloc (`PROPS`) : `order.webp`, `tag-secret.webp`, `dossier.webp`
  (mêmes noms et mêmes rôles que Cabinet : ordre de mission, étiquette de diffusion restreinte, dossier de rapports ;
  des noms communs permettront une liste `PROPS` unique), transparent, ≈ 320 × 440 ou 440 × 175
- [ ] livré · [ ] intégré — 4 à 6 objets entre les blocs (`SETS.between`), transparent, 150 à 480 px, plutôt plats et
  allongés (ils se posent dans l'écart entre deux blocs)
- [ ] livré · [ ] intégré — 5 à 8 objets de marge (`SETS.sides`), transparent, 250 à 450 px, silhouettes lisibles en
  petit
- [ ] livré · [ ] intégré — (facultatif) `footer.webp`, frise de pied de page 1394 × ≈ 90, opaque

Règle de choix : chaque objet évoque un domaine de la DEFA (navigation, transmissions, météo, documents, instruments de
bord) et reste dans le vocabulaire Aqua (verre, aluminium, gel, eau) ; pas de doublon de sujet entre `between` et
`sides` ; variété de formes (rond, allongé, carré) pour l'alternance. Une planche de 4 à 6 objets par demande, découpée
ensuite dans `tools/icons_from_sheets.html`, garde la cohérence d'échelle et de lumière.

Consigne ChatGPT :

> Planche de 4 à 6 objets séparés, bien espacés, sur fond transparent, style « Aqua » début des années 2000 (verre
> translucide bleuté, aluminium brossé, boutons gel, reflets spéculaires), même matière et même lumière que l'image
> jointe. Chaque objet évoque un domaine différent des opérations aériennes (navigation, transmissions, météo, documents,
> instruments) ; formes variées ; vus de face ou de dessus ; sans texte ni logo.

Intégration : `design_deco.js`, entrées `PROPS.aqua` (mêmes motifs que Cabinet), `SETS.aqua.between`, `SETS.aqua.sides`,
et `SETS.aqua.foot` si la frise est livrée. **Effet** : Aqua a toutes les familles communes ; plus aucun décor d'Aqua
n'est un cas particulier.

---

## 2. Carnet de vol (`flightlog`)

Matière : cuir marine, tracés fins dorés (plans, roses des vents, reliefs), aluminium riveté, cadrans de bord, plan de vol
sur papier crème. Références : `shared/deco/flightlog/bg-aircraft.webp`, `bg-aerodromes.webp`, `bg-families.webp` (style
des fonds actuels, à reprendre pour les panneaux), `footer.webp`, `notebook-*.webp`.

### 2.1 Panneaux par thème (18 images)

- Dossier cible : `shared/deco/flightlog/panels/`
- Fichiers : `panel-<thème>-w.webp` et `panel-<thème>-t.webp`, 9 thèmes
- Format : 1100 × 550 et 550 × 1100, opaque ; source 1536 × 1024 / 1024 × 1536
- Style : cuir ou toile marine sombre, sujet en fins tracés dorés ou ivoire façon gravure, comme les fonds `bg-*` actuels ;
  un seul jeu pour les deux tons (les fonds actuels servent déjà aux deux) ; les plans d'avions `blueprint-*.webp`
  peuvent servir de modèle pour `aircraft`

| Thème | Paysage `w` | Portrait `t` |
| --- | --- | --- |
| `aircraft` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| `airfield` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| `time` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| `radio` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| `nav` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| `gear` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| `awards` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| `families` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| `ops` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |

Consigne ChatGPT :

> Fond décoratif pour un panneau d'interface : cuir bleu marine sombre, dessin au trait fin doré et ivoire façon gravure
> technique aéronautique, même style, même palette et même grain que l'image jointe. Sujet : **<sujet du thème>**.
> Composition : l'intérêt dans le tiers droit et le long des bords, centre et moitié gauche presque unis (du texte clair
> sera posé dessus). Vue de face, sans perspective, sans cadre, sans texte lisible, sans logo. Paysage 1536 × 1024, puis
> la même scène recomposée en portrait 1024 × 1536.

Intégration :

1. Convertir vers `shared/deco/flightlog/panels/`.
2. `design_deco.js` : `PANELS.flightlog = { dir: 'panels', only: {} }` ; supprimer `BG.flightlog`.
3. `designs_skeuo.css` : supprimer les dix règles des plans (`html[data-design="flightlog"][data-decor="full"] .repo-block::before`
   et variantes `data-deco-n` / ton sombre, `blueprint-*.webp`) ; l'opacité propre `html[data-design="flightlog"] .repo-deco-bgimg.repo-deco-bg-cover`
   devient celle du panneau ; régler le voile `--repo-veil`.
4. Les fichiers `bg-*.webp` et `blueprint-*.webp` restent dans le dépôt (réutilisables comme objets ou références).
5. **Exceptions supprimées** : `BG.flightlog`, les plans propres au design (`::before` numérotés par `data-deco-n`).

### 2.2 Appareil de page (2 objets)

- [ ] livré · [ ] intégré — `shared/deco/flightlog/<objet-principal>.webp`, transparent, ≈ 700 à 1000 px de large
- [ ] livré · [ ] intégré — `shared/deco/flightlog/<objet-compagnon>.webp`, transparent, ≈ 400 à 600 px de large

Règle de choix : matériel de bord ou de navigation des années 1940 à 1960 (panneau d'instruments démonté, poste de bord,
sacoche de navigation, casque et micro…), aluminium riveté, bakélite noire, cuir marine, laiton ; l'objet compagnon se
rapporte au principal ; les deux vus de face, même lumière, même échelle. Ne pas reprendre les objets de Cabinet
(`radio.webp`, `notebook.webp`) ni de Durci. Références : `gauge-case.webp`, `footer.webp` (tableau de bord à gauche).

Consigne ChatGPT :

> Deux objets séparés, vus de face à hauteur d'œil, fond transparent, aviation des années 1940 à 1960 : aluminium riveté,
> bakélite noire, cadrans à fond noir, cuir bleu marine, laiton ; même matière et même lumière que l'image jointe.
> 1) un appareil de bord ou de navigation de ton choix, large ; 2) un objet compagnon plus petit qui l'accompagne.
> Sans texte lisible ni logo.

Intégration : `design_deco.js`, `SETS.flightlog.device = [[…], […]]`, `deviceAt: 3`. **Effet** : Carnet de vol rejoint
Cabinet et Durci (appareil de page commun).

---

## 3. Cabinet, ton clair (`shared/deco/cabinet/1930/clair/`)

**Livré et intégré le 2 octobre 2026** (9 thèmes × 2) : ce chapitre ne sert plus que de modèle pour un jeu clair « 1800 ».

Matière : parchemin ivoire, cartes côtières aquarellées bleu pâle, instruments de laiton, gravures de navires ; voir
`1930/clair/panel-ships-w.webp`, `panel-instruments-w.webp`, `panel-nav-w.webp`. Le jeu clair n'a que quatre sujets
(`aircraft`, `nav`, `ships`, `instruments`) : `PANELS.cabinet.clair.alias` renvoie sept thèmes vers eux et
`only: { instruments: 'w' }` note l'absence de portrait.

Réutilisation possible (copie, sans supprimer l'original) : `panel-ships-*` → `panel-ops-*` et `panel-instruments-w` →
`panel-gear-w`. Dans ce cas il ne reste à produire que les cinq autres thèmes et `panel-gear-t` (= « instruments » en
portrait).

- Format : 1100 × 550 et 550 × 1100, opaque ; source 1536 × 1024 / 1024 × 1536
- Style : fond ivoire uni sur au moins la moitié gauche, sujet en gravure fine et aquarelle pâle, objets de laiton aux
  bords ; même grain de papier et même palette que les quatre panneaux clairs existants (le voile ivoire à 82 % les
  couvre en partie)

| Thème | Paysage `w` | Portrait `t` | Remarque |
| --- | --- | --- | --- |
| `airfield` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré | |
| `ops` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré | ou copie de `panel-ships-*` |
| `families` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré | |
| `awards` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré | |
| `gear` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré | `w` : ou copie de `panel-instruments-w` ; `t` : l'« instruments » portrait |
| `radio` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré | |
| `time` | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré | |

Consigne ChatGPT :

> Fond décoratif pour un panneau d'interface, cabinet de navigation des années 1930 en version claire : parchemin ivoire,
> gravure fine à l'encre sépia et aquarelle bleu pâle, instruments de laiton posés sur les bords ; même papier, même
> palette et même lumière que l'image jointe. Sujet : **<sujet du thème>**. Composition : moitié gauche et centre en
> parchemin presque uni ; l'intérêt dans le tiers droit et aux coins. Vue de dessus, sans perspective, sans cadre, sans
> texte lisible. Paysage 1536 × 1024, puis la même scène recomposée en portrait 1024 × 1536.

Intégration :

1. Convertir vers `shared/deco/cabinet/1930/clair/` (et copier `ships` / `instruments` sous les noms de thème si ce choix
   est retenu).
2. `design_deco.js` : `PANELS.cabinet.clair = { dir: '1930/clair', only: {} }` (plus d'`alias`).
3. **Exceptions supprimées** : `PANELS.cabinet.clair.alias` et le contenu de `PANELS.cabinet.clair.only`.

Hors génération : le jeu « 1800 » (`shared/deco/cabinet/1800/`, PNG déjà déposés) attend sa conversion ; une fois ses
18 panneaux convertis, remplacer `'1930'` par `'1800'` dans `PANELS.cabinet.dir` et `clair.dir` (un jeu clair « 1800 »
serait alors à produire sur le même modèle que ce chapitre).

---

## 4. Durci (`field`)

Matière : peinture olive écaillée, acier riveté, câbles, voyants, pochoirs ; références `panel-awards-t.webp`,
`panel-families-t.webp`, `panel-radio-w.webp`, `radar.webp`, `plate-defa.webp`.

### 4.1 Panneaux « awards » et « families » en paysage (2 images)

- [ ] livré · [ ] intégré — `shared/deco/field/panel-awards-w.webp`
- [ ] livré · [ ] intégré — `shared/deco/field/panel-families-w.webp`

Format : 1100 × 550, opaque, source 1536 × 1024. Style : même tôle olive, même éclairage et même densité d'objets que
les autres `panel-*-w.webp` de Durci ; le panneau est assombri à l'affichage (`brightness(.72)`) : pas de zone très
sombre au centre. Sujet : reprendre celui des portraits `panel-awards-t.webp` / `panel-families-t.webp` (les joindre) en
le recomposant en largeur.

Consigne ChatGPT :

> Même panneau que l'image jointe (tôle peinte olive, acier riveté, équipements militaires de terrain, même lumière et
> même usure), recomposé en paysage 1536 × 1024 : l'intérêt dans le tiers droit et sur les bords, centre et moitié gauche
> en tôle presque unie. Vue de face, sans perspective, sans texte lisible.

Intégration : convertir ; `design_deco.js`, `PANELS.field = { dir: '', only: {} }`. **Exception supprimée** : le contenu
de `PANELS.field.only`. (Le rangement des panneaux de Durci dans `field/panels/`, Phase 2 point 7, est un déplacement de
fichiers, pas un asset.)

### 4.2 Frise de pied de page en une image (1 image)

- [ ] livré · [ ] intégré — `shared/deco/field/footer.webp`

Format : 1394 × ≈ 100 (bande très allongée, rapport ≈ 14 : 1), opaque ; source 1536 × 1024 dont on garde une bande, ou
mieux une planche paysage où la frise occupe toute la largeur. Modèles : `shared/deco/cabinet/footer.webp`,
`shared/deco/flightlog/footer.webp` (objets de la matière posés côte à côte, de bord à bord).

Contenu : pupitre olive vu de face avec, de gauche à droite, un écran radar vert (éteint ou figé, repris de `radar.webp`),
la plaque DEFA (`plate-defa.webp` : seule inscription admise, recopiée de l'image jointe), puis des éléments de pupitre
(interrupteurs, grilles, voyants) ; **laisser à droite une zone de tôle unie d'environ 220 × 90 px** où se posera le
voyant de sauvegarde (composant commun, pas dans l'image).

Consigne ChatGPT :

> Bande décorative horizontale très allongée (rapport 14 : 1) : pupitre de console militaire de terrain vu de face, tôle
> peinte olive, acier riveté ; de gauche à droite un écran radar vert à fond noir, une plaque gravée identique à l'image
> jointe, des interrupteurs à capot et des grilles d'aération ; l'extrémité droite reste une tôle unie sans objet. Même
> matière et même lumière que les images jointes, sans autre texte.

Intégration :

1. Convertir ; `design_deco.js`, `SETS.field.foot` identique à Cabinet et Carnet de vol (`<img class="repo-deco-strip">`),
   voyant de sauvegarde sorti en composant commun (Phase 2 point 6 : `state()` et le bouton `.repo-deco-status` servent à
   tous les designs, stylés par jetons).
2. Supprimer le HTML de frise de Durci, le calcul des délais du radar dans `render()`, et dans `designs_skeuo.css` les
   règles `.repo-deco-radar*`, `.repo-deco-plate-img`, la grille `html[data-design="field"][data-decor="full"] .repo-deco>…`.
3. **Exception supprimée** : la frise HTML propre à Durci.

Décision à prendre avant l'intégration : l'animation du radar (balayage et plots) disparaît avec la frise en image, à
moins d'en faire un élément commun facultatif posé sur la frise (zone en % déclarée par jetons).

---

## 5. Tous les designs à feuille : planches de feuille de registre « propres »

Aujourd'hui les planches sources ont un tableau imprimé, un en-tête et un cachet dans le papier, et parfois un bord
évasé : `tools/cut_register_sheet.py` efface l'intérieur des coins (`erase`), redresse les bords (`shear`), perce les
pièces d'en-tête et filtre le papier (médiane) pour ôter les lignes. Des planches propres suppriment ces réglages.

| Design | Planche vierge | En-tête `sheet-head` | Cachet `sheet-stamp` |
| --- | --- | --- | --- |
| Cabinet | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| Carnet de vol | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré | [ ] livré · [ ] intégré |
| Durci | [ ] livré · [ ] intégré | sans objet (`none`) | sans objet (`none`) |
| Aqua | voir 1.3 | voir 1.3 | voir 1.3 |

Règle commune (planche) :

- portrait, source 1024 × 1536, opaque ;
- même objet que la planche actuelle du design (dossier « Aéronautique navale » de Cabinet, carnet de vol toilé,
  pochette olive de Durci) : joindre la planche actuelle (`CONFIGS[<design>]['src']` dans le script) ;
- **vue exactement de face, sans perspective** : bords du cadre parallèles aux bords de l'image, épaisseur régulière sur
  chaque côté (pas de bord évasé) ;
- **papier entièrement vierge** : ni tableau, ni lignes, ni en-tête, ni cachet, ni texte ; grain et teinte réguliers,
  éclairage uniforme (pas de vignettage) ;
- tranches (haut, bas, gauche, droite) répétitives : aucun élément unique au milieu d'un côté, les éléments uniques
  (pattes, pince, coin corné, fermeture) dans les coins ;
- les accessoires du bord gauche restent livrés à part (`sheet-string.webp`, inchangés).

Règle commune (pièces) : PNG transparent, bords nets, sans papier autour (l'encre seule, ou le tampon seul), à plat,
à la même échelle que la planche : en-tête ≈ 745 × 185 pour Carnet de vol, ≈ 300 × 270 pour Cabinet ; cachet ≈ 500 × 300.
Inscriptions imposées : reprendre à l'identique celles des pièces actuelles (`sheet-head.webp`, `sheet-stamp.webp` du
design, à joindre).

Consigne ChatGPT (planche) :

> Même objet que l'image jointe, redessiné vu exactement de face et parfaitement à plat, sans perspective : bords
> parallèles aux bords de l'image, épaisseur régulière. Le papier est **entièrement vierge** : aucun tableau, aucune
> ligne, aucun texte, aucun tampon ; teinte et grain réguliers, éclairage uniforme. Même matière, mêmes coins, même
> couleur. Format portrait 1024 × 1536, marge de 40 px autour de l'objet.

Consigne ChatGPT (pièce) :

> Reproduis uniquement **l'en-tête imprimé** (ou : **le tampon**) de l'image jointe, à l'identique, vu à plat, sur fond
> transparent, sans le papier autour, encre légèrement usée.

Intégration :

1. Déposer la planche et les pièces dans `shared/deco/<design>/` ; convertir les pièces directement en
   `sheet-head.webp` / `sheet-stamp.webp` (objet détouré).
2. `tools/cut_register_sheet.py` : nouvelle `src`, coordonnées relevées sur la planche, `pieces: {}`, aucun `erase` ni
   `shear` ; la zone `paper` peut être prise directement dans l'intérieur vierge.
3. Relancer `python tools/cut_register_sheet.py <design>`, reporter les jetons `--sh-*` (et `--sh-head-*`,
   `--sh-stamp-*` d'après la taille des pièces), `python tools/bump_versions.py`, vérifier un registre en ton clair.
4. **Exceptions supprimées** : quand les trois designs sont repris, les fonctions `erase()` et `sheared()`, les options
   `erase` / `shear` / `y0` et le perçage des pièces disparaissent du script ; le filtre médian du papier devient inutile.

---

## 6. Tous les designs : onglets de page (`shared/deco/<design>/tabs/`)

Les onglets en tête de page (les quatre pages de Paramètres, générateur ⇄ studio, et toute page groupée plus tard dans
`REPOSITORY_TREE.tabs`) sont un composant du framework (`repository_nav.js`) habillé par design dans `designs_skeuo.css`
(section « ONGLETS DE PAGE ») : en attendant les images, plaques gravées vissées (Cabinet, Durci), poussoirs sombres
cerclés de laiton avec voyant ambre (Carnet de vol), verre et gel (Aqua). Trois images par design, facultatives :

| Fichier | Contenu | Forme |
|---|---|---|
| `tabs/rail.webp` | rail ou plaque de fer blanc gravée qui porte les onglets, vis aux deux bouts | bande horizontale, ~1200 × 56, fond transparent hors du rail |
| `tabs/tab.webp` | poussoir relâché (page non affichée), **sans texte** | ~240 × 44, transparent autour |
| `tabs/tab-on.webp` | même poussoir enfoncé et éclairé (page courante), **sans texte** | même taille et même cadrage que `tab.webp` |

- **Sans texte** : les libellés (4 langues, longueurs variables) sont posés par la page, gravés ou imprimés par la
  feuille de style (encre, ombre portée du design). Laisser au centre une zone unie, lisible, d'au moins 60 % de la
  largeur.
- **Découpe en 9 parties** (`border-image`) : les coins et les bouts (vis, rivets, embouts) restent à leur taille, le
  milieu s'étire en largeur. Garder les bouts dans les ~24 px de chaque côté (rail : ~40 px), le milieu uniforme
  (pas de motif qui trahirait l'étirement).
- `tab.webp` et `tab-on.webp` exactement superposables : seul l'état change (enfoncement, lumière, voyant).
- **Planche** : une image à fond transparent avec le poussoir relâché, le poussoir enfoncé et le rail (plus, si l'on
  veut, un aperçu monté), rangée sous `docs/planches/onglets_<design>.webp` ; `tools/cut_tabs.py` en tire les trois
  images d'après ses cadrages (table `CONFIG`, mesurés à l'arrivée de la planche), puis la section « onglets en
  images » de `designs_skeuo.css` les monte (`border-image`) — sans retouche des pages. Deux montages :
  « plaques » (Cabinet : la plaque de la planche posée sur le rail, qui court sur toute la largeur) et « cellules »
  (Carnet de vol : rail à fenêtres — chaque onglet est une cellule du rail avec le poussoir dedans, les cellules
  accolées refont la barre, fermée par ses embouts).
- Troisième montage, « barre montée » (Durci : barre livrée d'une pièce) : cellules prises telles quelles d'un jour de
  toile au suivant, voyant de la cellule allumée découpé à part (`tabs/led.webp`, reposé au centre de l'onglet
  courant : il ne s'étire pas) et effacé de la cellule, sangle prolongée sur toute la largeur.
- **Liseré** : cadre à coins arrondis (`docs/planches/lisere_laiton.webp`, `lisere_acier.webp`) posé autour du bloc qui
  suit la barre d'onglets (`.repo-tabs + main`) pour le désigner comme la page des onglets — laiton pour Cabinet et
  Carnet de vol, acier pour Durci et Aqua (`tabs/lisere.webp`, table `LISERE_OF` de `cut_tabs.py`).
- Fait : Carnet de vol (barre de laiton à fenêtres, poussoirs à voyant ambre), Cabinet (étiquettes en cadre d'acier sur
  rail d'acier), Durci (sangle de toile, cadres vissés, voyant), liserés des quatre designs. À venir : onglets d'Aqua
  (en attendant : verre et gel dessinés par les jetons, rail sur toute la largeur de la page).
- État : `python tools/assets_status.py` (famille « Onglets de page »).

---

## Ordre conseillé

Du plus grand nombre d'exceptions supprimées au plus petit (l'effort est indiqué entre parenthèses) :

1. **Carnet de vol, panneaux** (18 images) — supprime `BG.flightlog` et les dix règles des plans de `designs_skeuo.css`.
2. **Aqua, panneaux** (18 images) — supprime `BG.aqua` ; avec le point 1, la famille `BG` entière et les attributs
   `data-deco-bg` des pages disparaissent.
3. **Durci, frise en une image** (1 image, plus le composant commun du voyant) — supprime la frise HTML, le code du radar
   et une dizaine de règles CSS propres à Durci.
4. **Cabinet clair** (5 à 7 thèmes × 2, ou copies) — supprime `alias` et les orientations manquantes du jeu clair.
5. **Durci, deux panneaux paysage** (2 images, gain rapide) — vide `PANELS.field.only` ; avec 1, 2 et 4, `only` disparaît
   de `PANELS` et de `panelOf()`.
6. **Planches de feuille propres** (3 planches + 4 pièces) — supprime `erase`, `shear` et le perçage des pièces du script.
7. **Aqua, feuille, carnets, objets** — n'enlève pas d'exception mais fait entrer Aqua dans les familles communes
   (`SHEETS`, `PROPS`, `SETS`, carnets).
8. **Appareils de page** de Carnet de vol et d'Aqua (2 × 2 objets) — même appareil de page pour tous les designs à matières.
