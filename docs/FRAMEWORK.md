# Framework commun

Les trois applications de la suite — **CR DEFA** (Mission Report Core), **Landing Performance
Dashboard** et **Flight Performance & Fuel Planner** — partagent un framework sans dépendance
ni étape de compilation : des fichiers JavaScript chargés par `<script>`, qui s'activent
seuls sur chaque page. Ce document décrit chaque composant, son rôle et son interface.

| Composant | Fichier | Utilisé par |
|---|---|---|
| Arborescence et thèmes | `repository_tree` | toutes les pages |
| Bandeau, menu ☰, langue | `shared/repository_nav.js`, `.css` | toutes les pages |
| Apparence (designs, icônes, barre latérale, couleurs) | `shared/designs.css`, `block_icons.js/.css`, `icons/repository_icons.js`, `side_nav.js`, `appearance_page.js` | toutes les pages ; réglages sur la page Apparence |
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
| Référence DEFA anonymisée | `data/references/defa_reference.js` | les trois applications |
| Mises à jour (canal, contrôle, pastilles) | `shared/suite_update.js`, `tools/update_suite.py` | toutes les pages ; réglages Paramètres › Maintenance |
| Cycles AIRAC, dossier et base SIA, recalcul MORA | `shared/airac.js` | Maintenance |
| Archives ZIP (écriture, lecture, SHA-256) | `shared/zip_store.js` | Maintenance (sauvegarde totale, export SIA) |
| Maintenance (versions, dépendances, SIA pas à pas, sauvegarde totale, journal) | `shared/maintenance_page.js` | `apps/settings/maintenance.html` |
| Registre des missions générées | `shared/mission_registry.js` | `apps/cpco/mission_registry.html` |
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
- `folders` : thème et favicon par dossier (clé = chemin complet, ex. `"apps/cr/HEMS"`) ;
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

Réglée dans la **fenêtre modale Apparence** (ouverte au-dessus de la page courante par le menu ☰ et la barre latérale :
`RepositoryNav.openAppearance()`, contenu monté par `RepositoryAppearance.mount`), aussi disponible en page (`apps/settings/apparence.html`, construite par `shared/appearance_page.js` : vignettes
des designs dessinées dans chaque design, rangées d'icônes par épaisseur de trait, barre latérale, une carte par thème
avec famille, ton, aperçu, contrastes WCAG et « Voir sur cette page » ; le bouton « Apparence » du menu ☰ et la barre latérale y mènent), mémorisée dans le navigateur et appliquée
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
- **Organisation des designs à matières** (voir aussi `docs/REFACTORING_TOOLKIT.md`) :
  - **registre unique** : `REPOSITORY_TREE.designs.list` porte, par design, `css`, `skeuo` (design à matières),
    `frame` (cadre cousu autour de la page), `base` (design dont il est une déclinaison : Carnet de vol → Cabinet),
    `chart` (palette automatique des graphiques), `icons` (jeu d'icônes par défaut), `emblem` ; `repository_nav.js` en
    déduit les attributs `<html data-skeuo>` (`"frame"` pour les designs à cadre), `data-design-base`, la palette et
    le relief des graphiques, le logo et le dossier des icônes (`appearance.iconFolder`) ; le générateur d'icônes lit
    ses jeux au même endroit ;
  - **jetons** `--sk-*` par design et par ton, **composants communs** écrits une fois (`designs_skeuo.css`) ; les
    règles d'une page (CR, planificateur, éditeur, Apparence) sont dans la feuille de la page, avec ces jetons ;
    banc de non-régression : `tools/skeuo_regression.html` ;
  - **fonds des blocs** (`design_deco.js`) : fonds illustrés déclarés (`BG`, blocs `data-deco-bg` : Carnet de vol,
    Aqua) ; **panneaux par thème** (`PANELS` : Cabinet « 1930 » marine / ivoire selon le ton, Durci) choisis d'après
    le titre, l'icône puis le sous-titre du bloc ; **feuille de registre** (`SHEETS`, Cabinet clair : blocs de tableau
    des registres, une planche par design découpée par `tools/cut_register_sheet.py`, géométrie en jetons `--sh-*`) ;
    **objets posés dans un bloc** (`PROPS` : ordre de mission, étiquette « Top secret ») ; **appareil de page**
    (`device` : un objet à côté d'un poste — Cabinet : livre de bord et radio ; Carnet de vol : carnet de cuir et DME ;
    Durci : câble et radio — dans un vrai emplacement entre les blocs 3 et 4, déplaçable latéralement) ;
  - **boîte à outils** `shared/kit.js` (`window.RepositoryKit`, chargée avant `repository_nav.js`) : échappement,
    langue et traductions, stockage protégé, couleurs et contraste WCAG.
- **Réglages** : boutons « Apparence » et « Paramètres » en tête du menu ☰ ; dans la barre latérale, groupe du bas
  (Apparence, Paramètres, Menu).
- **Icônes** (`repositoryIcons`, `<html data-icons>`) : trait normal, fin, épais ; quatre jeux **skeuomorphes**,
  utilisables dans tous les designs — **Laiton** (`brass`, Cabinet), **Acier** (`steel`, Durci), **Gel** (`gel`, Aqua),
  **Avionique** (`avio`, Carnet de vol) ; ou aucune. Jeux **composés** : fond vierge du jeu
  (`shared/icons/skeuo/<dossier>/vierge.webp`) et glyphe du registre d'icônes par-dessus ; pages et entrées du Centre :
  fond `vierge.rouge.webp` (cuivre) s'il existe, sinon `vierge.gris.webp` (Aqua : bulle grise teintée à la couleur
  Aqua) ; règles générées dans `block_icons.css` par `tools/build_skeuo_icons_css.py`. Sans choix mémorisé : jeu du design (`designs.list[id].icons` : Laiton pour
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

**Tâches longues** (`AppFramework.task`) : toute opération qui dure (aperçus et génération des cartes, lecture
d'un dossier, calcul MORA, import SIA) se déclare au socle : barre de progression flottante dans la pile des
notifications (titre, `fait/total`, étape ; total 0 = indéterminée) et avertissement avant de quitter la page tant
qu'elle tourne (fermeture ou rechargement : fenêtre du navigateur ; lien interne : confirmation qui nomme la tâche).
`const job = AppFramework.task(titre, { total })` ; `job.set(fait, total, étape)` ; `job.end(message?, kind?)` en
`finally` ; `job.fail(erreur)` notifie l'erreur (annulation : simple information). `{ quiet: true }` : la page garde
sa propre jauge (import SIA), la tâche ne sert qu'à la garde de sortie. Les erreurs des pages passent par les zones
`data-status` (relayées en notifications) ou par `job.fail`. Tâches en cours : `AppFramework.busyTasks()`.

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

### Journal des sauvegardes et rechargements

`LocalStore.journal()` : entrées (60 au plus, localStorage `suiteBackupLog:v1`, plus récentes d'abord) ;
`LocalStore.logEvent({ kind, source, … })` en ajoute une (événement `local-store-journal`). Chaque
`restoreText(texte, { source })` y trace la restauration : origine, date de la sauvegarde relue, clés ajoutées et mises à
jour, bases IndexedDB. La page Maintenance y ajoute sauvegardes totales, rechargements, extractions SIA, archivages et
recalculs MORA. `LocalStore.toText()` : texte YAML de la sauvegarde (utilisé par la sauvegarde totale).

## 6 ter. `suite_update.js` — mises à jour

Réglages `suiteUpdate:v1` : `channel` (`master` stable, `develop` early bird), `mode` (`manual`, `auto`, `off`),
`periodDays` (0 = à chaque ouverture, au plus toutes les heures ; 1, 7, 28, 30). `SuiteUpdate.check()` lit la branche du
canal (commit, date, titre) et son `repository_tree` (version) par l'API GitLab de framagit (`release.repository` de
`repository_tree`), les compare au commit local connu (lu dans `.git`, `SuiteUpdate.readGit(dossier)`) ou à la version
locale ; résultat `suiteUpdateCheck:v1`. Pastilles de l'en-tête : « ⬆ Mise à jour » et « AIRAC nn/aa » (base SIA du
studio antérieure au cycle en vigueur, d'après `siaBaseInfo:v1`), vers `apps/settings/maintenance.html`. Une page web ne
réécrit pas le dépôt : l'application passe par `python tools/update_suite.py update` (canal : `git config
suite.channel`).

## 6 sexies. `data_files.js` — données hors de l'application (v3)

Les données DEFA et recalculées vivent dans `data/` (clone du dépôt de données, ignoré par git ; marqueur
`data/data_tree.js`). Une page charge un fichier de données par
`<script src="…/shared/data_files.js?v=…" data-file="references/aircraft_fleet.js"></script>` : le premier appel lit le
marqueur, puis chaque fichier est pris dans `data/`, sinon dans `examples/` (chargement synchrone, ordre conservé). API :
`DataFiles.available()`, `DataFiles.url(chemin)`, `DataFiles.dataUrl(chemin)`. Registres : `data/cr/` (`ledger.js`,
`mission_reporting_config.js`) ; SIA : `data/sia/` (villes livrées dans `shared/carto/`). `FileAccess` :
dossier `__data` ; registre (`cr`), missions, SIA en sont déduits, performances (`planner`) et sauvegarde locale
(`local`) aussi s'ils ne sont pas réglés ailleurs.

## 6 quinquies. Sources externes

`repository_tree.sources` : adresses par défaut (`defa`, `siaData`, `siaCycle` — gabarit `{nn}` / `{yy}` —, `siaEaip`,
`suiteRepo`, `dataRepo`). `RepositoryNav.source(clé)` : surcharge locale (`suiteSources:v1`, réglée dans
Paramètres › Maintenance › Sources et dossiers) sinon valeur par défaut ; `RepositoryNav.setSource(clé, valeur)`
(événement `suite-sources-change`). Aucune adresse DEFA ou SIA n'est écrite en dur dans le code des pages.

## 6 quater. `airac.js`, `zip_store.js`

- `Airac.cycle(date)`, `next()`, `fromDate('2026-10-01')` → `{ date, ident: '2610', label: '10/26', until, url }`
  (cycles de 28 jours depuis l'AIRAC 2401 du 25 janvier 2024 ; `url` : page du cycle sur le site du SIA) ;
  `inspectFolder(fichiers)` : rôle et cycle des fichiers d'un dossier SIA XML, cycles complets ou non, anciens cycles,
  ZIP d'export ; `base()` / `summarize()` / `baseSummary()` : base du studio (lecture seule) ; `patchBase(champs)` ;
  `moraFromObstacles(csv, obstacleMax, cycle)` : recalcul simple de la grille MORA ; `moraCycle(csv)`.
- `ZipStore.build([{ name, data, date }])` → Blob (deflate via `CompressionStream`, sinon stocké ; noms UTF-8) ;
  `ZipStore.read(blob)` → entrées `{ name, size, date, bytes(), text() }` ; `ZipStore.sha256(data)`.

## 6 bis. `file_access.js` — dossiers et fichiers

- Dossiers mémorisés (IndexedDB `missionCore` › `handles`) : **dépôt** (`__repo` : le dossier
  « Documentation », qui contient `repository_tree`), **registre** (`__ledger` :
  `Documentation/CR DEFA`, qui contient `mission_cr.html`), **sauvegarde locale** (`__store`),
  **performances** (`__perf`, Flight Planner), **SIA XML** (`__sia` : données AIRAC, témoin
  `mora.csv`), **missions** (`__missions` : `Documentation/Missions`, séries générées ; registre
  `mission_registry.yaml`), **X-Plane** (`__xplane` : journaux CSV du plugin d'atterrissage, dossier par défaut du
  Landing Dashboard). Tous se règlent dans Paramètres › Maintenance › Sources et dossiers.
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

Page `apps/settings/parametrage.html` : édition en tableau des bases en JavaScript du dépôt (flotte,
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
- `AarTracks.toXml(résultat)` → `data/sia/miam-enr-5-7-tracks.xml` ; `parseTrackXml(xml)` le relit.
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
  dossiers, contrôle des mises à jour) et les scripts propres à `apps/cpco/` (`mission_store.js`, `sia_i18n.js`…).
- `tools/update_suite.py` : état git (`status`), canal (`channel master|develop`), mise à jour sûre (`update` :
  fast-forward, refus si fichiers modifiés, journal `.git/suite-update.log`), diagnostic (`doctor` : remote, branches,
  branches fusionnées, packs orphelins, `VERSION.json`, fichiers suivis mais ignorés, `core.autocrlf`).
- `tools/defa_reference.py "Log des vols.html"` : référence DEFA anonymisée
  (`data/references/defa_reference.js`) depuis le journal des vols (complète sans rien supprimer).
- `tools/new_family_pages.py` : crée les pages d'une nouvelle famille de missions dans
  `apps/cr/`.

## Ajouter une page à la suite

1. Créer la page (un `<header>` avec un `<h1>`, un `<main>`).
2. Charger `../repository_tree` en tête, puis en fin de page `shared/repository_nav.js`,
   `shared/app_framework.js` (et `content_i18n.js` pour la traduction).
3. La déclarer dans `repository_tree` (`pages`), avec son thème et sa place dans le menu.
4. `python tools/bump_versions.py`.

## Base SIA commune (`shared/sia_base.js`)

`SiaBase` regroupe tout ce qui touche à la base SIA analysée, pour le studio cartographique et Paramètres › Maintenance :
lecture du dossier (`build(files)`, `rebuild({ dir })` : cycle le plus récent, AIXM 4.5, XML_SIA, villes, fond, mora.csv,
axes ENR 5.7), cache IndexedDB `sia-map-parser` (`get`, `put`, `patch`, `purge` ; format `VERSION`), résumés
(`summarize`, `summary`, `info` = `siaBaseInfo:v1`, `previous` = base précédente gardée par `put`), grille MORA
(`computeMoraGrid` complet, `moraFromObstacles` simple, `moraCsv`, `parseMora`, `moraLabel`), et le bloc d'interface
`SiaBase.panel(host, { onLoaded, onCached, onPurged })` (dossier, Relire, Purger, état, compte rendu, fichiers), monté
à l'identique dans le studio (`#sia-base`) et à l'étape 4 de la mise à jour SIA. `Airac` (`shared/airac.js`) ne garde
que les cycles et l'inventaire du dossier. Dépendance facultative : `SiaAero.parseAixm` (`shared/carto/aero_symbols.js`).
