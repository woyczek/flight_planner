# Passe de contraste et cohérence des designs à matières — 2026-10-09

Demande : « une passe de contraste sur toutes les pages, tous les styles » et « que tous les éléments d'un design soient
cohérents entre eux ». Périmètre des corrections : `shared/designs_skeuo.css` (Cabinet, Carnet de vol, Durci, Aqua,
Tactique) et `shared/repository_nav.css` (menus communs). Les défauts relevant de `shared/designs.css` (Standard, Aéro,
Opérationnel, Console) ou des feuilles de page sont listés (§ 5), pas corrigés.

## 1. Méthode

Outil : `tools/contrast_audit.html` (bibliothèque standard du navigateur, sans dépendance). Pour chaque page × design ×
décor, il pose les réglages (`repositoryDesign`, `repositoryDecor`, niveau 4, accès Centre, français) dans le stockage du
navigateur, charge la page dans un cadre de 1280 × 900, attend 600 ms sans modification du document (8 s au plus), puis
mesure chaque texte visible (nœud texte non vide, élément affiché, hors `[aria-hidden]`, `script`, `option`, `svg`) et
chaque champ rempli :

- **couleur** : `color` (ou `-webkit-text-fill-color`), opacité cumulée des ancêtres ;
- **fond effectif** : couche de l'élément, puis des ancêtres jusqu'au premier fond opaque, fonds semi-transparents
  composés ; image ou dégradé : couleur moyenne (image réduite sur un canevas ; dégradé : moyenne des arrêts) ; images
  de bord remplies (`border-image … fill` : onglets découpés dans les planches) : partie centrale de l'image ; panneaux
  posés sous le contenu (enfant en position absolue à `z-index` négatif : `.repo-deco-bgimg`, feuille de registre
  `.repo-deco-sheet` et ses pièces) et pseudo-éléments couvrants ; images partielles non répétées (vis, filigranes)
  ignorées, sauf sur un petit élément (bouton à médaillon) ;
- **seuils WCAG** : 4,5:1, 3:1 pour le grand texte (≥ 24 px, ou ≥ 18,66 px en gras) et pour un glyphe seul sans lettre
  ni chiffre (flèche, ↕ : élément graphique, 1.4.11) ; commandes désactivées ignorées (hors exigence) ;
- **menus** : le menu ☰ (groupes dépliés) et le menu des langues sont ouverts et mesurés à part.

Relevés : 18 pages (accueil, Aujourd'hui, Mes missions, CR, CR et reporting HEMS, Ordres de vols, générateur, registre,
Studio cartographique, Cartes de vol, Carburant, Atterrissages, Mon profil, Apparence, Installation, Maintenance, Aide)
× 9 designs × 2 décors = 324 relevés par passe, ~4 100 textes mesurés par design et décor. Le ton (clair / sombre) est
celui du thème de chaque page : Cartes de vol, Carburant et Atterrissages donnent les variantes sombres (Cabinet « carte
de nuit », Aqua sombre).

- **Avant** : feuilles de référence = `designs_skeuo.css` et `repository_nav.css` du commit `4190dc47`, copiées dans
  `tools/_verify/ref/` (dossier ignoré ; adresses `url()` réécrites vers `shared/`) et substituées par l'outil (champ
  « Feuilles de référence »). Recréer la référence :
  `git show HEAD:shared/designs_skeuo.css | sed -E 's#url\("(textures|deco|icons|fonts|panels)/#url("../../../shared/\1/#g' > tools/_verify/ref/designs_skeuo.css`.
- **Après** : feuilles de travail, relues sans le cache « immutable » (option « feuilles communes sans cache »).
- Données : `docs/technique/perf/runs/contrast_2026-10-09.json` (`runs[0]` avant, `runs[1]` après ; par relevé :
  page, design, décor, ton, textes mesurés, défauts regroupés par sélecteur × couleur × fond, 80 au plus).

Limites : moyenne d'une texture ou d'un dégradé et non pire cas local ; ombres portées du texte ignorées (plaques
gravées) ; décors en éléments frères non vus ; survol et focus non testés ; `index.html` n'applique pas le design
(page d'aiguillage, relevé `applied: false`). Conseil : ouvrir l'outil sur une origine que personne d'autre n'utilise
(`http://[::1]:<port>/…`), les réglages étant ceux du navigateur pour l'origine.

## 2. Résultats avant / après

Textes sous le seuil (somme des occurrences) sur les 18 pages ; entre parenthèses : dans les menus ☰ et langues, puis
sur les pages à thème sombre.

| Design | Décor | Avant | Après | Menus avant → après | Ton sombre avant → après |
|---|---|---:|---:|---|---|
| Standard | complet / sobre | 119 / 119 | 119 / 119 | 0 → 0 | 0 → 0 |
| Aéro | complet / sobre | 114 / 114 | 114 / 114 | 0 → 0 | 0 → 0 |
| Opérationnel | complet / sobre | 119 / 119 | 119 / 119 | 0 → 0 | 0 → 0 |
| Console | complet / sobre | 119 / 119 | 119 / 119 | 0 → 0 | 0 → 0 |
| Cabinet | complet | 439 | 94 | 252 → 0 | 125 → 0 |
| Cabinet | sobre | 729 | 159 | 252 → 0 | 125 → 0 |
| Carnet de vol | complet | 444 | 95 | 254 → 0 | 125 → 0 |
| Carnet de vol | sobre | 738 | 159 | 252 → 0 | 125 → 0 |
| Durci | complet | 152 | 110 | 0 → 0 | 12 → 3 |
| Durci | sobre | 204 | 162 | 0 → 0 | 12 → 3 |
| Aqua | complet | 618 | 83 | 154 → 0 | 69 → 0 |
| Aqua | sobre | 583 | 117 | 154 → 0 | 69 → 0 |
| Tactique | complet / sobre | 247 / 247 | 58 / 58 | 0 → 0 | 0 → 0 |

Le reste des designs à matières vient pour l'essentiel des Ordres de vols (pastilles de simulateur blanches sur couleurs
claires : 684 des ~1 100 occurrences restantes, § 5) et de trois composants hors de ces feuilles (§ 5).

## 3. Les trois constats

### 3.1 Menu ☰ de Cabinet illisible

Causes (deux, cumulées) :

1. `repository_nav.css` colorait les titres de groupe (`.repo-group`, `summary` des groupes), séparateurs, réglages et
   champs du profil avec `--repo-bar-text` (blanc du bandeau), pensé pour un menu au fond du bandeau ; les designs à
   matières posent un parchemin clair (`--sk-menu-bg`) : blanc 66 % sur parchemin = 1,8:1. Les actions « Données
   locales » et « Page » (`button.repo-action`) prenaient en plus le cuir marine des boutons du design, sous l'encre
   foncée forcée par `.repo-menu :is(a, button, summary)` : 1,1:1.
2. En **ton sombre** (thème de page sombre : Cartes de vol, Carburant, Atterrissages), `--cab-ink` devient clair mais
   `--sk-menu-bg` restait le parchemin clair : tout le menu, le menu des langues, les notifications et le pied de page
   à 1,2-1,9:1.

Correction à la source : `repository_nav.css` définit `--repo-menu-ink` (`--sk-menu-ink` du design, sinon
`--repo-bar-text`), `--repo-menu-ink-2`, `--repo-menu-line`, `--repo-menu-hover`, dont dérivent titres, séparateurs,
survol et réglages ; `designs_skeuo.css` (COMPOSANTS COMMUNS) donne une encre de groupe `--sk-menu-ink-2` par design,
rend les entrées du menu plates (liens, actions, langues : même ligne, même survol), habille les champs du profil comme
les champs du design et ôte l'opacité posée en ligne sur l'état de sauvegarde ; Cabinet et Carnet de vol en ton sombre
ont un menu et un pied de page en parchemin sombre. Résultat : 0 défaut dans les menus des cinq designs, deux décors,
deux tons.

### 3.2 Aqua en ton foncé

Constat : l'Aqua sombre ne redéfinissait que quelques couleurs, en dur et élément par élément : le rail des onglets
restait le métal clair de l'Aqua clair sous des poussoirs sombres, les jetons `--sk-mbtn-*`, `--sk-lbtn-*`,
`--sk-pick-*`, `--sk-tool-*` gardaient le verre clair sous une encre devenue claire (règle de rattrapage en dur pour
☰, langue et secondaires seulement), l'entrée courante de la barre latérale avait un voile blanc .55 (1,9:1), et le gel
(reflet haut à 45 % de blanc) donnait 3,6:1 sous le texte blanc dans les deux tons.

Correction : matières en jetons, posés une fois dans l'Aqua clair et seuls redéfinis par l'Aqua sombre —
`--aq-glass`, `--aq-glass-ink`, `--aq-glass-edge`, `--aq-glass-sep`, `--aq-glass-shine`, `--aq-glass-drop`,
`--aq-glass-text-shadow` (verre clair ou fumé), `--aq-slate`, `--aq-slate-edge` (bouton discret), `--aq-rail`,
`--aq-rail-shadow` (métal du rail). Segments et onglets au repos, ☰, langue, boutons secondaires et de l'en-tête,
liens-boutons, outils de bloc, listes déroulantes, boutons d'en-tête des pages (`--sk-hb*`) en verre ; page courante,
segment choisi et action principale en gel ; rail sombre en ton sombre. Règle de rattrapage en dur de l'Aqua sombre
supprimée. Gel : reflet ramené à 15 % de blanc et bas assombri (moyenne ≥ 4,5:1 pour toutes les teintes Aqua). Barre
latérale sombre : voile .14. Résultat : 0 défaut en Aqua sombre.

### 3.3 Rail des onglets (« marqueur filet ») inégal

Inventaire des onglets :

| Onglets | Pages | Composant |
|---|---|---|
| Communs `pilot` | Mes missions, Mes disponibilités | `.repo-tabs` (repository_nav.js) |
| Communs `missions` | Registre, Générateur, Studio cartographique | `.repo-tabs` (selon le niveau) |
| Communs `tools` | Cartes de vol, Carburant, Atterrissages, Analyse des missions | `.repo-tabs` |
| Communs `settings` | Mon profil, Apparence, Centre, Installation, Maintenance, Premier lancement | `.repo-tabs` |
| Communs `planning` | Tableau (Ordres de vols) seul | aucune barre : un seul onglet visible (voulu) |
| Propres à une page | Studio cartographique (`map_parser.html`) et Cartes de vol (`map_planner.html`, généré) : Fond de carte, Zones, Symboles OACI, Éléments | `.profileTabs` + `.tabPanel` |
| Pas des onglets | Paramètres (menu latéral `.da-nav`), Apparence (sélecteurs `.repo-segs`) | — |

Mesure dans les cinq designs à matières, décor complet et sobre : le rail (image découpée, ou jeton `--sk-tabs-rail`)
et les poussoirs sont identiques sur toutes les pages qui ont `.repo-tabs`, quel que soit le décor (aucune règle de
décor ne les touche). Les différences venaient de :

1. **Carburant** : le contenu qui suit la barre est `div.wrap`, pas `main` → pas de liseré (« filet ») autour du bloc à
   onglets (`.repo-tabs+main`). Corrigé : `.repo-tabs+:is(main, .wrap)`.
2. **Studio cartographique et Cartes de vol** : leurs onglets propres (`.profileTabs`) gardaient le dessin de la page
   (onglets bleus en classeur). Corrigé : les règles d'onglets des designs à matières visent aussi `.profileTabs`
   (rail) et `.profileTabs>button` (poussoir, `.on` = page courante) — rail, poussoirs, vis, voyants et images des
   planches de chaque design, sans toucher au HTML ni au générateur.
3. **Aqua sombre** : rail clair sous des poussoirs sombres (§ 3.2).
4. **Planning** et niveaux bas : une seule page visible dans le groupe → pas de barre (comportement voulu de
   `repository_nav.js`). **Tactique** : pas de liseré (`--sk-tabs-lisere: none`, design sans image), voulu.

Encres des onglets en image relevées : Carnet de vol (étiquettes) encres assombries (#1c160d, page courante #241803),
Durci page courante #0d0d06 sur la toile éclairée.

## 4. Autres corrections (designs_skeuo.css)

- **Encre secondaire de Cabinet** (`--cab-ink-2`) : #5b4a2e → #45361f. La texture de parchemin a pour couleur moyenne
  #c0a883 (et non #efe3c4, base des calculs d'origine) : 3,7 → 4,9:1 pour sous-titres de blocs, `.small`, résumés.
- **Gris des pages** (`--muted`) et petits textes (`.small`, `.note`, `.muted`, `.hint`) : encre secondaire du design
  dans les blocs de **tous** les designs à matières (Aqua et Tactique compris : #6b7280 et #5c6d76 des pages à 3,1-3,7:1) ;
  dans l'en-tête, encre de l'en-tête atténuée (et `--odvo-mute` des Ordres de vols) ; dans les boutons, encre du
  bouton ; dans les barres d'état, encre de la barre.
- **Liens des blocs** : jeton `--sk-link` par design (marine de Cabinet, voyant de Durci, bleu / bleu clair d'Aqua,
  cyan de Tactique), règle commune ; encre de la feuille sur les feuilles de registre et de l'impression sur l'aperçu.
- **Aperçu imprimable** (`.report`, Mission Core) : jetons d'encre redéfinis sur la feuille (le texte clair de Durci et
  Tactique tombait à 1:1 sur le papier) ; papier de Tactique clair ; en-têtes de tableau du rapport neutres.
- **Menu latéral des Paramètres** (`.da-nav`) : surface des blocs (`--repo-surface`) posée dessous par un
  pseudo-élément (la matière des cartes, semi-transparente, laissait voir le bois : 2,9:1).
- **Opacités de page** neutralisées dans les designs à matières : libellés des formulaires d'ordre
  (`mission_order.js`, .85), intertitres du sommaire de l'Aide (.7).
- **Carnet de vol** : sélecteur segmenté en aluminium brossé clair (l'acier donnait 3,8:1). **Durci** : vert du bouton
  principal approfondi (4,4 → 5:1), lien `.secondary` à l'encre des boutons (1:1), sous-titres des cartes en encre
  pleine. **Aqua** : sous-titre de l'en-tête et libellé de langue en encre de l'en-tête atténuée (3,9 → > 7:1).

Aucune règle n'a changé une matière : les seuls `background` modifiés sont ceux des entrées du menu (lignes plates, au
lieu du cuir des boutons), du rail et des poussoirs Aqua (mêmes dégradés, passés en jetons), du menu des Paramètres
(pseudo-élément dessous) ; textures de page, en-tête, blocs, barre latérale et pied vérifiées (`backgroundImage`) sur
Mes missions, Mon profil, CR et Ordres de vols en Aqua, Cabinet, Carnet de vol et Durci.

## 5. Ce qui reste

Hors des feuilles corrigées ici :

| Où | Défaut | Designs | Ratio |
|---|---|---|---|
| `apps/cpco/odv_orders.html` (Ordres de vols) | pastilles de simulateur `.sim-chip` blanches sur couleurs claires (vert, jaune, cyan) | tous | 2,4-4,3 |
| `apps/cpco/odv_orders.html` | `.odvo-tpl small` (gabarits de la palette), `.odvo-tr span` (or #7a5c12 sur sombre), `.odvo-atc-reservation`, `sup.odv-rank`, `button.repo-plain.low small` | tous | 1,3-4,5 |
| `shared/mission_table.js` (tableaux triables) | flèches de tri `.st-arrow` (#a9adb5 sur #f5f5f6 ; or ou violet sur sombre) ; en-têtes `.st-sortable` #6b7280 sur #f5f5f6 | tous | 1,3-4,4 |
| `shared/mission_core/` (CR HEMS) | `.mc-kpi .small` #6b7280 sur #ececf3 | Standard, Ops, Console | 4,1 |
| `shared/designs.css` (Aéro) | titre de bloc `h2` des Ordres de vols #7a5c12 sur #181d23 (page d'outil sombre) | Aéro | 2,7 |
| `tools/build_skeuo_icons_css.py` → `block_icons.css` (section générée) | bouton « déplacer » des blocs en jeu Gel : glyphe blanc sur bulle grise teintée, or (#ffd23f) sur les pages du Centre | Aqua | 2,0-3,0 |
| `apps/aide/aide.html`, `apps/cpco/mission_registry.html` | `.small` à opacité .8 sur parchemin (#483e2d) | Cabinet, Carnet de vol (sobre) | 4,48 |
| Mesure | Durci : onglet courant, toile éclairée — la moyenne de la colonne centrale inclut le cadre d'acier (2,5:1 mesuré) ; visuellement lisible, à confirmer sur la planche | Durci | — |

À noter pour `designs.css` (autre session) : les menus d'Aéro et Opérationnel peuvent désormais s'appuyer sur
`--repo-menu-ink` / `--repo-menu-line` si leur fond change.
