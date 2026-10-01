# Prompts — assets de la phase 2 (refactoring du toolkit)

But : chaque design à matières a le même jeu d'images aux noms convenus ; les exceptions de code disparaissent
(`PANELS.field.only`, `clair.alias`, fonds `BG` du Carnet de vol, frise HTML de Durci, `erase`/`shear` de la découpe).
Suivi : [REFACTORING_TOOLKIT.md](REFACTORING_TOOLKIT.md), « Assets à fournir ou à refaire ».

Dépôt : `shared/deco/<design>/…` (PNG accepté, je convertis en WebP et recadre). Les PNG sources déposés sont gardés.
Une **conversation ChatGPT par design** (même style d'une image à l'autre) : coller d'abord les règles communes.

## 1. Panneaux de fond des blocs (9 thèmes × 2 orientations)

Fichiers : `panel-<thème>-w` (paysage, recadré en 2:1, 1100×550) et `panel-<thème>-t` (portrait, 1:2, 550×1100).

### Règles communes (à coller en tête)

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

### Thèmes (le sujet des motifs de bord)

| Thème | Sujet des motifs |
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

Message par thème : « Thème `<thème>` : <sujet>. D'abord en paysage 1536×1024, puis la même composition en portrait
1024×1536. »

### Par design

| Design | Dossier | À produire | Style à donner en tête de conversation |
|---|---|---|---|
| **Carnet de vol** | `flightlog/panels/` | les 9 thèmes × 2 (18) | « page de carnet de vol de pilote ancien, papier crème légèrement quadrillé, croquis à l'encre bleue et au crayon, tampons pâles » |
| **Cabinet clair** | `cabinet/1930/clair/` | `airfield`, `ops`, `families`, `awards`, `gear`, `radio`, `time` × 2 (14) | « papier ivoire ancien, gravures à l'encre bleu-gris des années 1930 (cartes côtières, aéronavale), aquarelle pâle » — joindre 2 panneaux ivoire existants (`panel-nav-w`, `panel-ships-t`) comme référence |
| **Durci** | `field/` | `awards-w`, `families-w` (2) | joindre `panel-awards-t` et `panel-families-t` : « la même chose en paysage » |
| **Aqua** | `aqua/panels/` | les 9 thèmes × 2 (18) | « interface Aqua de Mac OS X : fond à fines rayures horizontales gris très clair (pinstripe), motifs en plastique gel bleu translucide brillant, reflets nets, ombres douces » |

## 2. Feuille de registre (Cabinet, Carnet de vol, Durci, Aqua)

Aujourd'hui la planche est découpée avec effacement du tableau imprimé et redressement ; avec des pièces propres, la
découpe devient directe. Fichiers attendus par design : `sheet-board.png` (planche entière), `sheet-head.png`,
`sheet-stamp.png`.

```
Image 1 : une feuille de registre vierge posée à plat, vue strictement de dessus, bords parfaitement droits (aucune
perspective), papier [PAPIER], SANS tableau, sans lignes, sans texte ; [ACCESSOIRE] en haut à gauche ; marges de
papier régulières ; fond transparent autour de la feuille. Format portrait 1024×1536.
Image 2 : l'en-tête seul de cette feuille (bandeau décoratif du haut, sans texte), fond transparent, paysage 1536×1024.
Image 3 : un cachet / tampon seul assorti (cercle ou cartouche, sans texte lisible), fond transparent, 1024×1024.
```

| Design | `[PAPIER]` | `[ACCESSOIRE]` |
|---|---|---|
| Cabinet | ivoire épais, patiné | ficelle nouée dans deux œillets |
| Carnet de vol | crème, très léger quadrillage bleu | pince en laiton |
| Durci | papier kraft clair, taché | élastique olive et crayon |
| Aqua | blanc pur, très légère texture | pince en plastique gel bleu |

## 3. Durci — frise de pied de page en une image

`field/footer.png` — remplace la frise HTML (radar, plaque, voyant).

```
Une longue frise horizontale de pied de page, matériel militaire de terrain : tôle olive rivetée, petit écran radar
rond à gauche, plaque métallique vierge au centre, voyant lumineux vert éteint à droite, câbles. Vue de face, à plat,
fond transparent, très allongée (environ 14:1), sans texte. Format 1536×1024 : la frise occupe une bande centrée.
```

## 4. Aqua — rejoindre les familles communes

Outre les panneaux et la feuille (ci-dessus) : livre de mission ouvert / fermé (voir `PROMPTS_LIVRE_MISSION.md`,
branche `feature/affectations`), et l'appareil de page :

```
Deux objets d'interface Aqua (Mac OS X), chacun seul sur fond transparent, vue de face : (1) un petit poste radio
rétro en plastique gel bleu translucide et aluminium brossé, (2) un cadran rond façon instrument, verre bombé gel.
Sans texte. 1024×1024 chacun.
```

## 5. Carnet de vol — appareil de page

À vérifier d'abord : les PNG `flightlog/ChatGPT Image 30 Sept 2026, 15_29_2x.png` (deux postes à cadrans) conviennent
peut-être ; sinon :

```
Deux objets de cockpit ancien, chacun seul sur fond transparent, vue de face : (1) un poste radio de bord à cadrans
crème et boutons bakélite, (2) un instrument de bord rond (DME) à aiguille. Sans texte lisible. 1024×1024 chacun.
```

## Contrôle avant dépôt

- Aucun texte lisible ; fonds réellement transparents (pas de damier dessiné) là où c'est demandé.
- Panneaux : centre calme ; paysage et portrait du même thème cohérents entre eux.
- Nommer le fichier d'après la liste (sinon je renomme d'après le contenu).
