# Framework commun

Les trois applications de la suite — **CR DEFA** (Mission Report Core), **Landing Performance
Dashboard** et **Flight Performance & Fuel Planner** — partagent un framework sans dépendance
ni étape de compilation : des fichiers JavaScript chargés par `<script>`, qui s'activent
seuls sur chaque page. Ce document décrit chaque composant, son rôle et son interface.

| Composant | Fichier | Utilisé par |
|---|---|---|
| Arborescence et thèmes | `repository_tree` | toutes les pages |
| Bandeau, menu ☰, langue | `shared/repository_nav.js`, `.css` | toutes les pages |
| Apparence (designs, icônes, barre latérale, couleurs) | `shared/designs.css`, `block_icons.js/.css`, `icons/repository_icons.js`, `side_nav.js`, `appearance_page.js`, `appearance_admin.js` | toutes les pages ; réglages sur la page Apparence |
| Colonnes redimensionnables | `shared/column_resize.js` | Planner |
| Blocs (déplacer / masquer) | `shared/app_framework.js` | toutes les pages |
| Traduction des textes | `shared/content_i18n.js` | CR DEFA, Planner, reportings |
| Profil pilote | `shared/pilot_profile.js` | toutes les pages (menu ☰) |
| Données locales ⇄ fichier, rappel de sauvegarde | `shared/browser_store.js` | toutes les pages (menu ☰, en-tête) |
| Dossiers autorisés, ouverture des fichiers | `shared/file_access.js` | toutes les pages |
| Période d'analyse (zoom) | `shared/time_period.js` | reportings, Landing Dashboard |
| Graphiques SVG | `shared/mission_core/charts.js` | reportings |
| Tableau triable | `shared/mission_table.js` | reportings |
| Bases de données éditables | `shared/data_admin.js` (page Paramétrage) | CR DEFA |
| Base des types d'aéronefs | `AircraftDB/` | les trois applications |
| Catalogue commun (types, appareils DEFA) | `shared/aircraft_catalog.js` | les trois applications |
| Référence DEFA anonymisée | `shared/defa_reference.js` | les trois applications |
| Outils de maintenance | `tools/` | dépôt |

## 1. `repository_tree` — arborescence, thèmes, menu

Fichier JavaScript **sans extension** (à servir en `text/javascript`, voir INSTALL) qui
définit `window.REPOSITORY_TREE` :

- `release` : version de la suite (`version`, `date`, `changelog` : lien affiché en pied de page de
  chaque page vers `CHANGELOG.md`) ; `defaults` : thème, favicon, configuration commune ;
- `themes` : couleurs de bandeau / page / accent et favicon par thème (`flight`, `landing`,
  `core`, un par famille de missions…) ;
- `designs` : designs graphiques proposés dans le menu ☰ (`list` : clé → libellé et description
  [fr, en, de, es] ; `default`) — voir § 2 bis ;
- `folders` : thème et favicon par dossier (clé = chemin complet, ex. `"CR DEFA/HEMS"`) ;
- `pages` : `{ path, label, menu, theme, favicon, files, slot }` —
  `menu: "Groupe/Libellé"` place la page dans le menu ☰, `menu: false` la cache (pages de
  saisie ouvertes depuis d'autres pages), `slot: "settings"` la range en bas du menu, avant
  « Données locales » ; `files` : fichiers par défaut d'une page (anciens registres CSV).

Tous les liens sont calculés depuis la racine du dépôt : une page peut être déplacée dans un
sous-dossier sans modifier ses liens.

## 2. `repository_nav.js` — bandeau commun

Transforme le `<header>` de la page en bandeau collé en haut (`.repo-header`) : titre, choix
de la **langue** (auto, FR, EN, DE, ES — événement `repository-language-change`) et **menu ☰**
(arborescence de `repository_tree`, actions de la page, profil pilote, données locales).
Charge `pilot_profile.js` et `browser_store.js`.

Interface `window.RepositoryNav` : `root` (racine du site), `page`, `menu`, `settings`,
`getLanguage()`, `getLanguageMode()`, `addAction(libellé, fn)` (action de page dans le menu
☰), `setTheme(nom)`.

> Une page ne doit jamais réécrire tout le `<header>` (`innerHTML`) après le chargement du
> bandeau : elle y **ajoute** ses éléments (sinon la langue et le menu ☰ disparaissent).

## 2 bis. Apparence — designs, icônes, barre latérale, couleurs

Réglée dans la **fenêtre modale Apparence** (ouverte au-dessus de la page courante par le menu ☰, la barre latérale et
Paramétrage : `RepositoryNav.openAppearance()`, contenu monté par `RepositoryAppearance.mount`), aussi disponible en page (`CR DEFA/apparence.html`, construite par `shared/appearance_page.js` : vignettes
des designs dessinées dans chaque design, rangées d'icônes par épaisseur de trait, barre latérale, une carte par thème
avec famille, ton, aperçu, contrastes WCAG et « Voir sur cette page » ; le menu ☰ « Apparence… » et un bloc-lien de
Paramétrage, `shared/appearance_admin.js`, y mènent), mémorisée dans le navigateur et appliquée
sur toutes les pages par `repository_nav.js` dès le chargement (`RepositoryNav.appearance`). Ces réglages sont
sauvegardés avec les données locales mais **ne comptent pas** comme modifications à sauvegarder (`browser_store.js`,
liste `DISPLAY` : design, icônes, couleurs, barre latérale, langue, onglets, séparateurs, colonnes, cadrans…).

- **Design** (`repositoryDesign`, `<html data-design>`) : Standard (styles propres des pages), **Aéro** (arrondi,
  ombres douces, en-tête en dégradé), **Opérationnel** (dense, angles vifs, liseré du thème, titres en capitales),
  **Console** (barre latérale, blocs aérés, titres en capitales, icônes ; remplace l'ancien Brief).
  Règles : `designs.css` (formes communes) et `block_icons.css` (Console, icônes, numéros).
- **Designs à matières** : **Carnet de vol** (`flightlog`, déclinaison aéronautique de Cabinet : cadre d'aluminium riveté
  des blocs, plaques d'aluminium brossé, emblème à hélice ailée, cadrans et plan de vol en décor, icônes « Avionique »),
  **Cabinet** (cabinet de navigation : sous-main en cuir, cadre en bois, en-tête en cuir
  marine, blocs en parchemin cerclés de cuir, plaques de titre en laiton gravé, médaillon rose des vents), **Durci**
  (clé `field` : console de terrain, fond de carte topographique, châssis en peinture olive écaillée, panneaux d'acier,
  plaques kaki, champs noirs, bouton principal vert à voyant, radar) et **Aqua** (métal brossé, verre dépoli, boutons
  gel). Règles : `designs_skeuo.css`, chargé **à la demande** (`designs.list[id].css`) ; textures WebP de
  `shared/textures/` (≈ 140 Ko en tout, produites par `tools/textures_generator.html` + `tools/save_textures.py`).
  Les **matières** ont une palette propre au design ; les **couleurs d'information** restent celles du thème
  (Cabinet : bandeau assombri ; Durci : bande d'unité à gauche des blocs ; Aqua : gel des boutons). Icônes de blocs
  en « matière » : médaillons de bronze, plaques d'acier vissées, bulles de gel. Accroches : `<html data-tone>`
  (thème clair ou sombre : Cabinet « carte de nuit »), `<html data-decor>` (**Décor** `repositoryDecor` : complet ou
  sobre ; défaut par page ou dossier, clé `decor` de `repository_tree` : sobre sur les CR, le planificateur et Landing),
  `.repo-header-emblem` (emblème `designs.list[id].emblem`, `RepositoryIcons.emblem`), `<html data-dirty>` (voyant
  de sauvegarde de la barre d'état, `browser_store.js`). Aqua a une variante sombre (graphite, verre fumé) sur les
  thèmes sombres : les graphiques gardent leurs couleurs. Illustrations du décor complet (`design_deco.js`, chargé
  avec la feuille) : frise de bureau de Cabinet (cuir, corde, longue-vue, carte tamponnée), panneaux de Durci (plaque
  DEFA, radar tournant, voyants de sauvegarde). Textures : photographies CC0 d'ambientCG (cuir, bois, papier, métaux,
  peintures ; relief cuit et reteinte par `tools/textures_from_photos.html`, crédits dans `shared/textures/CREDITS.md`)
  et matières dessinées (cartes, radar : `tools/textures_generator.html`) ; adresses versionnées par
  `bump_versions.py`. **Icônes et décors des planches** : icônes et éléments découpés dans les planches de maquette
  (`tools/icons_from_sheets.html` → `shared/icons/skeuo/<design>/`, `shared/deco/<design>/`) ; en jeu Matière, les
  icônes posées (blocs, sous-cartes, barre latérale, boutons à icône seule, zones de dépôt, bandeaux) prennent l'image
  de la planche (règles générées par `tools/build_skeuo_icons_css.py`, attribut `data-i` des icônes), sinon un
  médaillon, une plaque ou une bulle dessinés ; `design_deco.js` dissémine les décors (frise de pied, entre les blocs,
  dans les marges des grands écrans). Classe `repo-actionbar` : barre d'action collée en bas d'une page, habillée par le design. Classe `repo-plain` : bouton qui garde son propre dessin (vignettes, sélecteurs). À l'impression,
  tout s'efface.
- **Réglages** : boutons « Apparence » et « Paramètres » en tête du menu ☰ ; dans la barre latérale, groupe du bas
  (Apparence, Paramètres, Menu).
- **Icônes** (`repositoryIcons`, `<html data-icons>`) : trait normal, fin, épais ; trois jeux **skeuomorphes** en
  images, utilisables dans tous les designs — **Laiton** (`brass` : médaillons de bronze cerclés de laiton), **Acier**
  (`steel` : plaques d'acier vissées), **Gel** (`gel` : bulles), **Avionique** (`avio` : boutons ronds de métal sombre, Carnet de vol) ; ou aucune. En jeu skeuomorphe, l'image
  (`shared/icons/skeuo/<cabinet|field|aqua>/<nom>.webp`) remplace le tracé de chaque icône (`svg.repo-svg[data-i]`)
  partout : icônes découpées dans les planches de maquette (`tools/icons_from_sheets.html`), les autres fabriquées dans
  leur style (`tools/icons_skeuo_generator.html`) ; règles générées dans `block_icons.css` par
  `tools/build_skeuo_icons_css.py`. Sans choix mémorisé : jeu du design (`designs.list[id].icons` : Laiton pour
  Cabinet, Acier pour Durci, Gel pour Aqua), sinon trait normal.
- **Barre latérale** (`repositorySidenav`, `<html data-sidenav>`) : selon le design (affichée en Console),
  toujours, ou jamais. Entrées : `REPOSITORY_TREE.sidebar` s'il existe, sinon la liste de `repository_nav.js`, qui construit la barre dès son exécution (styles dans `repository_nav.css`,
  chargé dans l'en-tête) ; `side_nav.js` y pose ensuite les icônes, dans des emplacements de taille fixe.
- **Couleurs des thèmes** (`repositoryColors`) : pour chaque thème, une **famille** (`REPOSITORY_TREE.colorFamilies` :
  teinte, saturation) et un **ton** (clarté) plutôt que des valeurs absolues ; bandeau, texte du bandeau (blanc
  ou noir selon le meilleur contraste) et accent (ajusté jusqu'à ≥ 4,5:1 sur le fond de page) en sont calculés.
  Le bloc affiche l'aperçu et les rapports WCAG (texte / bandeau, accent / page ≥ 4,5:1 ; accent / carte ≥ 3:1).
  Sans réglage : couleurs de `repository_tree`.
- **Page de démonstration** (`docs/demo_design_icones.html`, lien dans le bloc) : la maquette du générateur
  reconstruite avec les composants, catalogue d'icônes, tableau des contrastes de tous les thèmes ; design, icônes
  et barre latérale choisis là sont les réglages de l'apparence.

Règles d'un design : il ne change que la **forme** (arrondis, ombres, bordures, typographie, densité) des éléments
communs — en-tête, blocs, `.card`, boutons, menus, champs, tableaux ; les **couleurs viennent du thème**
(`--repo-bar`, `--repo-bar-text`, `--repo-page`, `--repo-accent`). Ajouter un design : une entrée dans
`repository_tree.designs.list` et ses règles `html[data-design="clé"] …`.

### Icônes, numéros, sous-titres, zones de dépôt (`block_icons.js`, `icons/repository_icons.js`)

Chargés sur toutes les pages par `repository_nav.js`. Une page **déclare**, le framework dessine :
`<section data-step="1" data-icon="upload" data-subtitle="…">` (pastille, icône et sous-titre du bloc ; le titre
`<h2>` n'a plus de numéro), `<div class="repo-card" data-icon="file" data-subtitle="…">` (sous-carte),
`<button data-icon="plus">`, `<label data-icon="globe">`, `<p class="repo-notice" data-icon="info">`,
`<input type="file" data-dropzone>` (zone « Choisir des fichiers ou glisser-déposer ici » : même événement
`change`). Sous-titres traduits par les lignes `[fr, en, de, es]` de la page. Couleur des icônes choisie d'après
la surface réelle du bloc (≥ 3:1). Registre : 43 icônes au trait (grille 24), `RepositoryIcons.add` pour en
ajouter. Détails et plan de migration des pages : [PROPOSITION_DESIGN_ICONES.md](PROPOSITION_DESIGN_ICONES.md)
(page pilote : générateur de mission).

## 3. `app_framework.js` — blocs

Chaque `section` / `.panel` du `<main>` devient un bloc avec les boutons ↕ (déplacer) et
« Masquer ». Ordre et visibilité sont mémorisés par page (`repositoryFramework:<page>`).
`data-default-hidden="1"` : bloc masqué tant que l'utilisateur ne l'a pas affiché.
`data-block-id` : identifiant stable (sinon `id`, sinon rang). Après un nouveau rendu de
blocs : `window.AppFramework.refresh()`.

Option `grow: true` de `StickyFrame.follow` : l'ancre prend au moins la hauteur du cadre (+ gap), pour
qu'un cadre plus haut que sa rangée ne déborde pas sur le cadre suivant (panneaux du planificateur). L'ancre ne
fait que grandir (pas de va-et-vient pendant un réglage) ; `StickyFrame.resetGrow()` la remet à la mesure après
un nouveau contenu complet.

## 3 ter. `column_resize.js` — colonnes redimensionnables

`ColumnResize.attach(grille, { key, defaults, min, media, until, title })` pose une poignée entre chaque paire
de colonnes d'une grille CSS : glisser répartit la largeur entre les deux voisines, double-clic revient aux
largeurs par défaut. Largeurs gardées en fractions (`fr`, grille fluide), mémorisées sous `key` ; `media` :
requête où la grille a ses colonnes (poignées masquées ailleurs) ; `until()` : élément dont le bas limite la
hauteur des poignées. Retour : `{ reset(), refresh() }`. Utilisé par le planificateur (saisie et courbes |
Résultat | instruments).

## 3 bis. `sticky_frame.js` — cadres semi-mobiles

Blocs de colonne latérale qui restent lisibles pendant le défilement (`window.StickyFrame`).

| Appel | Comportement | Utilisé par |
|---|---|---|
| `StickyFrame.stick(el, { top })` | collant CSS sous l'en-tête ; plus haut que la fenêtre : décalage négatif, on défile jusqu'à son bas avant qu'il se colle | Studio cartographique (colonne d'aperçu) |
| `StickyFrame.follow(el, { anchor, stack, gap, media })` | suit un bloc « ancre » d'une autre colonne : arrive avec lui, reste collé sous l'en-tête (et sous les cadres `stack` précédents), repart avec le bas de l'ancre ; pas de chevauchement entre cadres d'un même conteneur ; classe `is-stuck` pendant qu'il est retenu (la page peut le compacter) ; inactif hors `media` (défaut : plus de 800 px) | Planificateur : bloc Résultat (ancre : Devis carburant, `stack`) et panneaux d'explications (ancre : rangée de leur courbe) |
| `StickyFrame.refresh()` | recalcul après un redessin | vues qui changent des hauteurs |
| `StickyFrame.headerBottom()` | bas de l'en-tête collant (px) | — |

Positionnement absolu dans le conteneur (rendu `position: relative`), recalculé au défilement, au
redimensionnement et quand l'ancre ou le cadre changent de taille.

## 4. `content_i18n.js` — traduction

**Typographie** (à l'affichage, après traduction, sur les nœuds texte et les attributs `title` /
`placeholder` / `aria-label`, hors `code`, `kbd`, `samp`) : en français, espace fine insécable U+202F
avant `: ; ! ? »` et après `«` ; dans les autres langues, pas d'espace avant `: ; ! ?`. Dans les sources,
écrire une espace simple : la page corrige. `RepositoryContentI18n.typography(texte, langue)` pour un texte
posé hors du DOM (export, presse-papiers).

**Zones.** `[data-no-i18n]` : texte déjà composé dans la langue courante (tables, graphiques, états) —
typographie seule. Les outils de l'en-tête et des blocs sont traduits par le menu, sauf un conteneur
`[data-i18n]` qu'une page y range (ex. options du Landing dashboard dans le menu ☰). Le Landing
dashboard fournit ses lignes depuis ses propres dictionnaires (`landingI18nRows()`).

`window.RepositoryContentI18n(lignes)` : lignes `[fr, en, de, es]`. Les nœuds texte (et
`title`, `placeholder`) dont la valeur est un des textes connus sont traduits dans la langue
du bandeau, y compris ceux ajoutés plus tard (observateur). Les textes composés par le code
sont produits directement dans la langue courante (`RepositoryNav.getLanguage()`). Les pages
du Landing Dashboard et du Planner ont en plus leur dictionnaire propre (`TR`,
`flight_i18n.js`).

## 5. `pilot_profile.js` — profil pilote

☰ › Profil pilote : ID IVAO (VID), ID VATSIM (CID), identifiant SimBrief. Stockés une fois
(`missionReportingConfig:v1`) et lus par toutes les pages : suivi réseau et import de plan
de vol des CR, liens vers les trackers, dernier OFP SimBrief du Planner.

## 6. `browser_store.js` — données locales

☰ › Données locales : tout ce que les pages gardent dans le navigateur (localStorage) est
copié dans `defa_local_store.yaml`, dans un dossier choisi une fois (idéalement le dossier
synchronisé du dépôt) — écriture automatique au départ de chaque page, restauration par
fusion (la donnée la plus récente l'emporte). Exclus : le suivi réseau en cours, la clef du
webservice d'envoi des CR. Événement `local-store-restored` après une restauration.

**Bases IndexedDB sauvegardées** (section `indexed` du fichier) : `FlightPerfCache` (OFP, calibrations,
airframes du planificateur) et `LandingPerformanceDashboardCache` (journal d'atterrissages chargé) — liste
`IDB_SAVED`. Hors sauvegarde : base SIA (relue depuis le dossier officiel), autorisations de dossiers.
Inventaire complet des données et de leur provenance : [DONNEES.md](DONNEES.md).

### Rappel de sauvegarde

Chaque modification des données locales est comptée (au plus une par clé et par minute ;
disposition des blocs, période et préférences d'affichage exclues). À partir de **10**, un
bouton **💾 Sauvegarder (n) · date de la dernière sauvegarde** apparaît en couleur de contraste
dans l'en-tête : il écrit la sauvegarde dans le dossier autorisé (sinon le fait choisir, ou
télécharge le fichier) et remet le compteur à zéro. La sauvegarde automatique (dossier
autorisé : toutes les 5 minutes et au départ de la page) remet aussi le compteur à zéro.

## 6 bis. `file_access.js` — dossiers et fichiers

- Dossiers mémorisés (IndexedDB `missionCore` › `handles`) : **dépôt** (`__repo` : le dossier
  « Documentation », qui contient `repository_tree`), **registre** (`__ledger` :
  `Documentation/CR DEFA`, qui contient `mission_cr.html`), **sauvegarde locale** (`__store`),
  **performances** (`__perf`, Flight Planner), **SIA XML** (`__sia` : données AIRAC, témoin
  `Carte france vierge.png`).
- `FileAccess.pickFolder(clé)` : le sélecteur s'ouvre sur le dossier actuel ; contrôle du
  contenu attendu (fichier témoin) avec confirmation.
- `FileAccess.decorate(bouton, clé)` : le bouton affiche « Dossier du registre : CR DEFA ✓ »
  (✓ autorisé, ⚠ à ré-autoriser au prochain accès) ; l'infobulle donne le dossier attendu et
  l'état — l'explication au survol plutôt qu'à l'écran.
- **Tout** `<input type="file">` de la suite ouvre le sélecteur du système **directement dans
  le dossier paramétré** : `data-picker-folder="__ledger"` sur le champ, sinon dossier par
  défaut de la page (application CR DEFA : registre ; Paramétrage : dépôt ; Flight Planner :
  performances ; Missions SIA : SIA XML), sinon le dernier dossier utilisé pour ce bouton. Le code des pages ne change
  pas (événement `change` habituel). Navigateurs sans l'API : sélecteur natif. Les sélecteurs
  de **dossier** (`webkitdirectory`) gardent le sélecteur natif.

### Panneaux de copier-coller (`FileAccess.pastePanel`)

Toute fenêtre où l'on colle un texte (CR › Analyse / import, journal DEFA, historique VATSIM du
suivi réseau, mission et liste de zones du studio SIA, mission du générateur) : **×** en haut à droite et bouton **Fermer** ; le bouton de chargement est
**désactivé** tant que la zone est vide, devient **✓ Valider** (vert, ferme la fenêtre) après un
chargement réussi, et redevient « Charger » dès que la zone est de nouveau remplie.

```js
const panel = FileAccess.pastePanel({ root, area, run, close, runLabel });
panel.done();   // après un chargement réussi
```

## 7. `time_period.js` — période d'analyse et zoom

Composant unique pour choisir la période analysée **et zoomer** — reporting général,
reportings de famille, anciens reportings HEMS / GAAR, Landing Performance Dashboard.

Interface :

- préréglages (toutes les dates, aujourd'hui, 7 / 30 derniers jours, mois, année en cours),
  dates de début / fin toujours visibles (les modifier = période personnalisée) ;
- boutons **◀ reculer**, **🔍− zoom arrière ×2**, **▶ avancer**, bornés par l'étendue des
  données ; la navigation garde la largeur de la période ;
- **zoom depuis un graphique** : glisser sur un graphique (ou cliquer une barre) appelle
  `TimePeriod.zoomTo(début, fin)` ; double-clic : `TimePeriod.zoomOut()`.

API :

```js
const ctrl = TimePeriod.mount(element, {
  onChange(state) {},          // { preset, start, end }
  storage: true,               // partagé (défaut) | false : piloté par la page
  bounds: { start, end },      // étendue des données (dates, instants ou ms)
  presets: true, summary: true
});
ctrl.setBounds(debut, fin); ctrl.set(state); ctrl.zoomTo(a, b); ctrl.shift(±1); ctrl.zoomOut();
TimePeriod.filterRows(lignes, 'date');   // lignes de la période (état partagé)
TimePeriod.range(); TimePeriod.rangeMs(state);   // période effective (jours / millisecondes)
TimePeriod.zoomTo(a, b); TimePeriod.zoomOut(); TimePeriod.zoomIn(); TimePeriod.shift(±1);
TimePeriod.edges(conteneur, lignes, 'date');     // repères sous un tableau : ◀ n avant · − + · m après ▶
```

- **Mode partagé** (reportings) : état dans `missionReportingPeriod:v1`, synchronisé entre
  pages et onglets (événement `mission-period-change`) — un zoom dans le reporting général se
  retrouve dans les reportings de famille.
- **Mode piloté** (Landing Dashboard) : la page garde sa période (mémorisée par fichier de
  mesures) et l'affiche par `ctrl.set()` ; le zoom par glisser de ses graphiques passe par
  `ctrl.zoomTo()`.
- État : `start` / `end` au jour (`AAAA-MM-JJ`) ou à la milliseconde
  (`AAAA-MM-JJTHH:MM:SS.mmm`, heure locale) pour un zoom sur des événements horodatés ;
  navigation et zoom arrière arrondis aux jours pour une période en jours.

## 8. `charts.js` — graphiques

SVG autonomes (hors ligne, impression), styles injectés et thémables par les variables
`--muted`, `--soft`, `--panel`, `--mcg-grid`, `--mcg-base` :

- `MissionCharts.buckets(dates, { start, end, unit, lang })` : périodes continues (unité
  automatique selon l'étendue, ou jour / semaine / mois / trimestre / année ; 400 au plus) ;
- `stackedBars({ buckets, series, value, format })` : barres empilées par période ;
- `enableZoom(conteneur)` : zoom par glisser / clic / double-clic relié à TimePeriod ;
- `donut(items)`, `hbars(items)` : répartitions et classements.

## 9. `mission_table.js` — tableau triable

`SortedTable.render(conteneur, { rows, columns, defaultSortKey, defaultDir, onRowClick,
onDelete, deleteMessage, emptyText, rowTitle })` → `{ setRows, getRows }`. Colonnes :
`{ key, label, type: 'number', format(v, ligne), html(v, ligne), sortValue(ligne) }`.
En-têtes collants, tri numérique ou texte, ligne cliquable, bouton « Supprimer » confirmé.

## 10. `data_admin.js` — Paramétrage › bases de données

Page `CR DEFA/parametrage.html` : édition en tableau des bases en JavaScript du dépôt (flotte,
types d'aéronefs, indicatifs…) et des données du navigateur. « Appliquer dans ce navigateur »
écrit une surcouche datée (`dataOverride:<base>:v1`) prioritaire tant qu'elle est plus récente
que le fichier ; « Enregistrer dans le dépôt » réécrit le fichier (format commun, voir
`AircraftDB/datafile.py`) dans le dossier du dépôt autorisé. Voir le manuel d'exploitation.

## 11. `AircraftDB/` — types d'aéronefs

`aircraft_db.js` (types OACI : désignateur, modèle, catégorie…), `aircraft_icons.js`
(silhouettes), `aircraft_overrides.json` (corrections locales), scripts
`update_aircraft_db.py` (mise à jour), `update_fleet.py` (flotte DEFA),
`datafile.py` (format commun des fichiers de données).

## 11 bis. `aircraft_catalog.js` et `defa_reference.js` — catalogue commun

Chargés juste après `AircraftDB/aircraft_db.js` dans **toutes** les pages qui l'utilisent
(CR, Paramétrage, Landing Dashboard, Flight Planner) :

- **types** : base OACI (avec les modifications de Paramétrage plus récentes que le fichier),
  types militaires absents de la base (`SUPPLEMENT` : RFAL, MIR2, A400, E3CF, H160, TIGR…) et
  types ajoutés localement dans les CR (`missionAircraftTypes:v1`), fusionnés dans
  `window.AIRCRAFT_DB` — les trois applications voient les mêmes types ;
- **appareils DEFA** (`AircraftCatalog.defaAircraft()`) : flotte, référence DEFA, appareils des
  missions enregistrées et journal DEFA chargé, par immatriculation (la donnée la plus récente
  l'emporte) : type, variante, indicatifs, terrain de rattachement, dernier terrain connu ;
  `defaTypes()` : types employés, avec leurs appareils ; `pilots()` : trigrammes.
- `defa_reference.js` : référence **anonymisée** committée (pilotes : trigramme, période, vols,
  types ; appareils : immatriculation, type, indicatifs utilisés, rattachement, dernier terrain,
  statut, mise en service) — sans les vols ni les missions. Générée par
  `tools/defa_reference.py` ou Paramétrage › Base DEFA, éditable dans Paramétrage.

Base « lâche » : aide à la saisie, jamais une contrainte — une valeur absente reste saisissable.

### Collections du formulaire (`form.js`)

Toute collection est affichée en **tableau compact** (une ligne par élément ; champs longs —
`full`, `textarea` — sur une 2e ligne), sauf `layout: 'cards'` (appareils : une carte par
appareil). `link(item)` : lien en tête de carte (fiche appareil). Ajout par le « + » du titre.

## 11 ter. `aar_tracks.js` — axes de ravitaillement (MILAIP ENR 5.7)

- `AarTracks.parseEnr57(textesDesPages)` : lecture du PDF ENR 5.7 (texte extrait par pdf.js) —
  points en minutes décimales et en DMS comparés, noms complets des axes, renvois (30 / 40 NM),
  largeur 14 NM, côté donné par S2, circuits heavy FOX / ROM ; anomalies listées.
- `AarTracks.toXml(résultat)` → `SIA XML/miam-enr-5-7-tracks.xml` ; `parseTrackXml(xml)` le relit.
- `AarTracks.trackRacetrack(axe, { defaultSide })` / `racetrack(…)` : contour exact de
  l'hippodrome (branche aller IP → CP, retour décalé, demi-cercles), cap, longueur, largeur, côté.
- `toGeoJson`, `nearest` : tracés MapLibre / SVG, axe le plus proche d'un point.

## 11 quater. Passerelle mission → CR DEFA

- `MissionVocab.familyForType(type)` (`shared/mission_core/vocab.js`) : famille de CR d'après
  un type de mission libre (MEDEVAC → HEMS, TRAINING → SPECIAL…).
- Une page de CR ouverte avec `?from=sia` lit `localStorage['siaMissionToCr:v1']` (mission
  `helo-xp-mission`), crée un nouveau CR pré-rempli (`fromSia` dans `core.js` : nom, numéro,
  objectif, terrains, points, appareils au type OACI du catalogue, exploitant, charge), puis
  applique les aides habituelles (appareil connu, terrain) ; confirmation avant de remplacer
  un brouillon.

## 12. `tools/` — maintenance

- `tools/bump_versions.py` : nouveau numéro de version de cache (`?v=`) dans toutes les pages
  après une modification de code partagé (toujours supérieur au précédent) ; met aussi à jour
  les chargements internes de `repository_nav.js` (profil pilote, données locales, accès aux
  dossiers).
- `tools/defa_reference.py "Log des vols.html"` : référence DEFA anonymisée
  (`shared/defa_reference.js`) depuis le journal des vols (complète sans rien supprimer).
- `tools/new_family_pages.py` : crée les pages d'une nouvelle famille de missions dans
  `CR DEFA/`.

## Ajouter une page à la suite

1. Créer la page (un `<header>` avec un `<h1>`, un `<main>`).
2. Charger `../repository_tree` en tête, puis en fin de page `shared/repository_nav.js`,
   `shared/app_framework.js` (et `content_i18n.js` pour la traduction).
3. La déclarer dans `repository_tree` (`pages`), avec son thème et sa place dans le menu.
4. `python tools/bump_versions.py`.
