# Prompts — mission book (My missions, material designs)

Images for the “book” view of the **My missions** page: unopened mission = closed labelled book, opened mission =
open book (“official” sheet), pages turned by clicking the corners, maps as thumbnails laid askew.
One **series per design**, generated **within a single ChatGPT conversation** (the same object from one image to the next).
Recommended order: open book, then closed book (« le même que l'image précédente »), then single page, corner, fastener.

Dropping the files: `shared/deco/<design>/` (`cabinet`, `flightlog`, `field` for Rugged, `aqua`), names below;
PNG accepted, I convert to WebP. No deletion of the dropped files.

## Common rules (to paste at the start of each conversation)

```
Je vais te demander une série d'images d'un même objet (un livre de mission) pour une interface web. Règles pour
toutes les images de la série :
- fond transparent (PNG avec canal alpha), objet seul, sans table, sans main, sans décor autour ;
- vue de face (fermé) ou strictement de dessus (ouvert), sans perspective ni inclinaison, objet centré, droit ;
- éclairage doux et uniforme venant du haut à gauche, ombre portée légère intégrée sous l'objet seulement ;
- AUCUN texte, chiffre, logo ni écriture nulle part : le texte sera ajouté par l'interface ;
- pages vierges : ni lignes, ni carreaux, ni marge tracée ; papier légèrement texturé et patiné, uniforme ;
- même objet, mêmes matières, même usure, mêmes couleurs d'une image à l'autre de la série ;
- proportions : couverture fermée 2:3 (largeur:hauteur) ; livre ouvert à plat 4:3, chaque page ayant les
  proportions de la couverture ; marges de papier régulières (au moins 8 % du côté) ;
- haute définition, rendu photographique réaliste, pas d'illustration.
Confirme, puis j'enverrai la première image à produire.
```

## Images of each series

Replace `[OBJET]` with the description of the design (next section). Size: 1024×1536 (portrait) or 1536×1024
(landscape) — the object fills the canvas with a transparent margin, I crop.

1. **`book-open.png`** — landscape 1536×1024
   ```
   Image 1 : [OBJET], ouvert à plat, vu strictement de dessus, deux pages vierges (sans lignes), reliure au centre
   visible, légère courbure des pages vers la reliure, coins des pages nets. Rien d'écrit.
   ```
2. **`book-closed.png`** — portrait 1024×1536
   ```
   Image 2 : le même [OBJET] que l'image précédente, fermé, vu de face. Sur la couverture, dans le tiers supérieur et
   centrée, une étiquette rectangulaire en papier collée (environ 60 % de la largeur, 25 % de la hauteur de la
   couverture), vierge, légèrement jaunie, bords nets. Aucun texte sur l'étiquette ni ailleurs.
   ```
3. **`page.png`** — portrait 1024×1536
   ```
   Image 3 : une page seule du même livre, détachée, à plat, vue de face, papier identique aux pages de l'image 1,
   vierge, opaque, bords légèrement irréguliers, sans ombre portée.
   ```
4. **`corner.png`** — square 1024×1024
   ```
   Image 4 : le coin inférieur droit d'une page du même papier, corné (le coin replié vers l'avant montre le verso),
   en gros plan, fond transparent autour du papier ; le pli fait environ un tiers du cadre.
   ```
5. **Thumbnail fastener** — landscape 1536×1024 (see the design: `tape.png` or `photo-corner.png`)
   ```
   Image 5 : [ATTACHE], seule, vue de dessus, fond transparent, assortie au livre de la série.
   ```

## Description by design

The quoted descriptions stay in French: they are pasted as is into the prompts above.

### Cabinet (`shared/deco/cabinet/`) — naval officer's cabinet, 1930s
- `[OBJET]`: « un registre relié en cuir bleu marine patiné, coins et dos renforcés de cuir plus foncé, nervures sur
  le dos, fermoir en laiton vieilli sur la tranche, pages ivoire épaisses, tranche dorée usée »
- `[ATTACHE]`: not needed, `clip.webp` is used (brass clip) — skip image 5.
- Pages: `sheet-paper.webp` exists; image 3 remains useful if its paper differs from that of the register.

### Flight log (`shared/deco/flightlog/`) — pilot's logbook
- `[OBJET]`: « un carnet de vol de pilote relié toile bleu ardoise, coins arrondis en toile plus sombre, élastique de
  fermeture noir, pages blanc cassé légèrement satinées »
- `[ATTACHE]`: « deux morceaux de ruban adhésif de masquage beige, légèrement translucides, bords déchirés,
  posés côte à côte » → `tape.png`

### Rugged (`shared/deco/field/`) — military field equipment
- Reuse the existing object: attach **`notebook-open.webp`** and **`notebook-closed.webp`** to the conversation.
- Image 1: « le même carnet que `notebook-open.webp`, mais les deux pages sont vierges, sans aucune ligne ni marge
  tracée ; tout le reste identique (housse cordura olive, crayon, fermeture éclair) »
- Image 2: « le même carnet que `notebook-closed.webp`, mais sur le rectangle velcro est fixée une étiquette en toile
  claire vierge, cousue sur les bords ; tout le reste identique »
- `[ATTACHE]`: « deux morceaux de ruban adhésif toilé noir mat (gaffer), bords déchirés » → `tape.png`
- Pages: `sheet-paper.webp` exists; image 3 remains useful if its paper differs from the pages of the notebook.

### Aqua (`shared/deco/aqua/`) — Aqua interface (Mac OS X 10.0–10.4)
- `[OBJET]`: « une chemise à rabats en plastique bleu translucide brillant façon gel, reflets et liseré clair sur
  les arêtes, fines rayures horizontales en filigrane, contenant un bloc de feuilles blanches » ; open: the folder
  unfolded flat, white sheets on both flaps.
- `[ATTACHE]`: « quatre coins photo transparents en plastique brillant (style gel bleuté), seuls » →
  `photo-corner.png`

## Optional (only once, common to the designs)

- **`stamp-confidential.png`** (`shared/deco/`) — landscape 1536×1024
  ```
  Un tampon encreur rouge rectangulaire, encadré double, imprimé sur fond transparent, encre irrégulière et légèrement
  baveuse, mot unique en capitales : CONFIDENTIEL. Légèrement incliné (−6°). Rien d'autre.
  ```
  (the only image with text: the stamp; otherwise I draw it in CSS)
- **`ribbon.png`** per design — portrait 1024×1536: « un signet en ruban de soie [couleur assortie : rouge bordeaux
  Cabinet, bleu Flight log, olive Durci, bleu gel Aqua], seul, vertical, extrémité coupée en V, fond transparent ».

## Check before dropping

- No visible text (except the stamp); blank pages and label.
- Truly transparent background (no drawn checkerboard).
- Open and closed book: same colours, same wear; pages of image 1 and image 3 of the same paper.
