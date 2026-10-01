# Prompts — livre de mission (Mes missions, designs à matières)

Images pour la vue « livre » de la page **Mes missions** : mission non ouverte = livre fermé étiqueté, mission ouverte =
livre ouvert (fiche « officielle »), pages tournées en cliquant sur les coins, cartes en vignettes posées de travers.
Une **série par design**, générée **dans une même conversation ChatGPT** (le même objet d'une image à l'autre).
Ordre conseillé : livre ouvert, puis livre fermé (« le même que l'image précédente »), puis page seule, coin, attache.

Dépôt des fichiers : `shared/deco/<design>/` (`cabinet`, `flightlog`, `field` pour Durci, `aqua`), noms ci-dessous ;
PNG accepté, je convertis en WebP. Aucune suppression des fichiers déposés.

## Règles communes (à coller en tête de chaque conversation)

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

## Images de chaque série

Remplacer `[OBJET]` par la description du design (section suivante). Taille : 1024×1536 (portrait) ou 1536×1024
(paysage) — l'objet occupe la toile avec une marge transparente, je recadre.

1. **`book-open.png`** — paysage 1536×1024
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
4. **`corner.png`** — carré 1024×1024
   ```
   Image 4 : le coin inférieur droit d'une page du même papier, corné (le coin replié vers l'avant montre le verso),
   en gros plan, fond transparent autour du papier ; le pli fait environ un tiers du cadre.
   ```
5. **Attache des vignettes** — paysage 1536×1024 (voir le design : `tape.png` ou `photo-corner.png`)
   ```
   Image 5 : [ATTACHE], seule, vue de dessus, fond transparent, assortie au livre de la série.
   ```

## Description par design

### Cabinet (`shared/deco/cabinet/`) — cabinet d'officier de marine, années 1930
- `[OBJET]` : « un registre relié en cuir bleu marine patiné, coins et dos renforcés de cuir plus foncé, nervures sur
  le dos, fermoir en laiton vieilli sur la tranche, pages ivoire épaisses, tranche dorée usée »
- `[ATTACHE]` : inutile, `clip.webp` sert (pince en laiton) — sauter l'image 5.
- Pages : `sheet-paper.webp` existe ; l'image 3 reste utile si son papier diffère de celui du registre.

### Flight log (`shared/deco/flightlog/`) — carnet de vol de pilote
- `[OBJET]` : « un carnet de vol de pilote relié toile bleu ardoise, coins arrondis en toile plus sombre, élastique de
  fermeture noir, pages blanc cassé légèrement satinées »
- `[ATTACHE]` : « deux morceaux de ruban adhésif de masquage beige, légèrement translucides, bords déchirés,
  posés côte à côte » → `tape.png`

### Durci (`shared/deco/field/`) — matériel de terrain militaire
- Reprendre l'objet existant : joindre **`notebook-open.webp`** et **`notebook-closed.webp`** à la conversation.
- Image 1 : « le même carnet que `notebook-open.webp`, mais les deux pages sont vierges, sans aucune ligne ni marge
  tracée ; tout le reste identique (housse cordura olive, crayon, fermeture éclair) »
- Image 2 : « le même carnet que `notebook-closed.webp`, mais sur le rectangle velcro est fixée une étiquette en toile
  claire vierge, cousue sur les bords ; tout le reste identique »
- `[ATTACHE]` : « deux morceaux de ruban adhésif toilé noir mat (gaffer), bords déchirés » → `tape.png`
- Pages : `sheet-paper.webp` existe ; l'image 3 reste utile si son papier diffère des pages du carnet.

### Aqua (`shared/deco/aqua/`) — interface Aqua (Mac OS X 10.0–10.4)
- `[OBJET]` : « une chemise à rabats en plastique bleu translucide brillant façon gel, reflets et liseré clair sur
  les arêtes, fines rayures horizontales en filigrane, contenant un bloc de feuilles blanches » ; ouvert : la chemise
  dépliée à plat, feuilles blanches sur les deux volets.
- `[ATTACHE]` : « quatre coins photo transparents en plastique brillant (style gel bleuté), seuls » →
  `photo-corner.png`

## Facultatif (une seule fois, commun aux designs)

- **`stamp-confidential.png`** (`shared/deco/`) — paysage 1536×1024
  ```
  Un tampon encreur rouge rectangulaire, encadré double, imprimé sur fond transparent, encre irrégulière et légèrement
  baveuse, mot unique en capitales : CONFIDENTIEL. Légèrement incliné (−6°). Rien d'autre.
  ```
  (seule image avec du texte : le tampon ; sinon je le dessine en CSS)
- **`ribbon.png`** par design — portrait 1024×1536 : « un signet en ruban de soie [couleur assortie : rouge bordeaux
  Cabinet, bleu Flight log, olive Durci, bleu gel Aqua], seul, vertical, extrémité coupée en V, fond transparent ».

## Contrôle avant dépôt

- Aucun texte visible (sauf le tampon) ; pages et étiquette vierges.
- Fond réellement transparent (pas de damier dessiné).
- Livre ouvert et fermé : mêmes couleurs, même usure ; pages de l'image 1 et de l'image 3 du même papier.
