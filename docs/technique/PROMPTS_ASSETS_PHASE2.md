# Prompts — phase 2 assets (toolkit refactoring)

Goal: each material design has the same set of images under the agreed names; the code exceptions disappear
(`PANELS.field.only`, `clair.alias`, `BG` backgrounds of Flight log, HTML frieze of Rugged, `erase`/`shear` of the cutting).
Tracking: [REFACTORING_TOOLKIT.md](REFACTORING_TOOLKIT.md), “Assets to provide or to redo”.

Drop location: `shared/deco/<design>/…` (PNG accepted, I convert to WebP and crop). The dropped source PNGs are kept.
One **ChatGPT conversation per design** (same style from one image to the next): paste the common rules first.

## 1. Block background panels (9 themes × 2 orientations)

Files: `panel-<theme>-w` (landscape, cropped to 2:1, 1100×550) and `panel-<theme>-t` (portrait, 1:2, 550×1100).

### Common rules (to paste at the start)

```
Je vais te demander une série d'images de fond pour les blocs d'une interface web, toutes dans le même style. Règles :
- l'image est un FOND : le centre doit rester calme, clair et peu contrasté (du texte s'affiche par-dessus) ;
  les motifs sont sur les bords et dans les coins, de plus en plus discrets vers le centre ;
- paysage : composition utile dans une bande 2:1 centrée (le haut et le bas seront recadrés) ;
  portrait : bande 1:2 centrée (les côtés seront recadrés) ;
- AUCUN texte lisible, chiffre, logo, drapeau ni insigne réel ;
- vue de dessus, à plat, sans perspective, éclairage doux uniforme ; pas de cadre ni de bordure ajoutés ;
- même papier / même matière, même palette et même usure pour toute la série.
Confirme, puis j'enverrai les thèmes un par un, chacun en paysage (1536×1024) puis en portrait (1024×1536).
```

### Themes (the subject of the edge motifs)

The subjects stay in French: they are pasted as is into the message for each theme.

| Theme | Subject of the motifs |
|---|---|
| `aircraft` | silhouettes et plans d'avions et d'hélicoptères |
| `airfield` | plans d'aérodromes : pistes, taxiways, manche à air, balisage |
| `nav` | cartes, routes tracées, rose des vents, règle et rapporteur |
| `ops` | table d'opérations : pions, ordres, chronomètre, crayon |
| `families` | insignes de spécialités génériques (sans armoiries réelles), fanions, classeurs à onglets |
| `awards` | médailles et rubans génériques, diplômes vierges, coupe |
| `gear` | équipement : casque, gilet, trousse médicale, caisses, élingues |
| `radio` | poste radio, casque d'écoute, micro, antenne, fréquences (sans chiffres) |
| `time` | horloge, chronographe, calendrier vierge, sablier, soleil / lune |

Message for each theme: « Thème `<thème>` : <sujet>. D'abord en paysage 1536×1024, puis la même composition en portrait
1024×1536. »

### By design

| Design | Folder | To produce | Style to give at the start of the conversation |
|---|---|---|---|
| **Flight log** | `flightlog/panels/` | the 9 themes × 2 (18) | « page de carnet de vol de pilote ancien, papier crème légèrement quadrillé, croquis à l'encre bleue et au crayon, tampons pâles » |
| **Light Cabinet** | `cabinet/1930/clair/` | `airfield`, `ops`, `families`, `awards`, `gear`, `radio`, `time` × 2 (14) | « papier ivoire ancien, gravures à l'encre bleu-gris des années 1930 (cartes côtières, aéronavale), aquarelle pâle » — attach 2 existing ivory panels (`panel-nav-w`, `panel-ships-t`) as a reference |
| **Rugged** | `field/` | `awards-w`, `families-w` (2) | attach `panel-awards-t` and `panel-families-t`: « la même chose en paysage » |
| **Aqua** | `aqua/panels/` | the 9 themes × 2 (18) | « interface Aqua de Mac OS X : fond à fines rayures horizontales gris très clair (pinstripe), motifs en plastique gel bleu translucide brillant, reflets nets, ombres douces » |

## 2. Register sheet (Cabinet, Flight log, Rugged, Aqua)

Today the board is cut out with erasure of the printed table and straightening; with clean pieces, the cutting
becomes direct. Files expected per design: `sheet-board.png` (whole board), `sheet-head.png`,
`sheet-stamp.png`.

```
Image 1 : une feuille de registre vierge posée à plat, vue strictement de dessus, bords parfaitement droits (aucune
perspective), papier [PAPIER], SANS tableau, sans lignes, sans texte ; [ACCESSOIRE] en haut à gauche ; marges de
papier régulières ; fond transparent autour de la feuille. Format portrait 1024×1536.
Image 2 : l'en-tête seul de cette feuille (bandeau décoratif du haut, sans texte), fond transparent, paysage 1536×1024.
Image 3 : un cachet / tampon seul assorti (cercle ou cartouche, sans texte lisible), fond transparent, 1024×1024.
```

The values stay in French: they replace the placeholders of the prompt above.

| Design | `[PAPIER]` | `[ACCESSOIRE]` |
|---|---|---|
| Cabinet | ivoire épais, patiné | ficelle nouée dans deux œillets |
| Flight log | crème, très léger quadrillage bleu | pince en laiton |
| Rugged | papier kraft clair, taché | élastique olive et crayon |
| Aqua | blanc pur, très légère texture | pince en plastique gel bleu |

## 3. Rugged — footer frieze in a single image

`field/footer.png` — replaces the HTML frieze (radar, plate, indicator light).

```
Une longue frise horizontale de pied de page, matériel militaire de terrain : tôle olive rivetée, petit écran radar
rond à gauche, plaque métallique vierge au centre, voyant lumineux vert éteint à droite, câbles. Vue de face, à plat,
fond transparent, très allongée (environ 14:1), sans texte. Format 1536×1024 : la frise occupe une bande centrée.
```

## 4. Aqua — joining the common families

Besides the panels and the sheet (above): open / closed mission book (see `PROMPTS_LIVRE_MISSION.md`,
branch `feature/affectations`), and the page device:

```
Deux objets d'interface Aqua (Mac OS X), chacun seul sur fond transparent, vue de face : (1) un petit poste radio
rétro en plastique gel bleu translucide et aluminium brossé, (2) un cadran rond façon instrument, verre bombé gel.
Sans texte. 1024×1024 chacun.
```

## 5. Flight log — page device

To check first: the PNGs `flightlog/ChatGPT Image 30 Sept 2026, 15_29_2x.png` (two sets with dials) may be
suitable; otherwise:

```
Deux objets de cockpit ancien, chacun seul sur fond transparent, vue de face : (1) un poste radio de bord à cadrans
crème et boutons bakélite, (2) un instrument de bord rond (DME) à aiguille. Sans texte lisible. 1024×1024 chacun.
```

## Check before dropping

- No readable text; truly transparent backgrounds (no drawn checkerboard) where requested.
- Panels: calm centre; landscape and portrait of the same theme consistent with each other.
- Name the file according to the list (otherwise I rename it according to its content).
