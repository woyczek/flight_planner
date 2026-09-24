# Framework commun

Les trois applications de la suite — **CR DEFA** (Mission Report Core), **Landing Performance
Dashboard** et **Flight Performance & Fuel Planner** — partagent un framework sans dépendance
ni étape de compilation : des fichiers JavaScript chargés par `<script>`, qui s'activent
seuls sur chaque page. Ce document décrit chaque composant, son rôle et son interface.

| Composant | Fichier | Utilisé par |
|---|---|---|
| Arborescence et thèmes | `repository_tree` | toutes les pages |
| Bandeau, menu ☰, langue | `shared/repository_nav.js`, `.css` | toutes les pages |
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

## 3. `app_framework.js` — blocs

Chaque `section` / `.panel` du `<main>` devient un bloc avec les boutons ↕ (déplacer) et
« Masquer ». Ordre et visibilité sont mémorisés par page (`repositoryFramework:<page>`).
`data-default-hidden="1"` : bloc masqué tant que l'utilisateur ne l'a pas affiché.
`data-block-id` : identifiant stable (sinon `id`, sinon rang). Après un nouveau rendu de
blocs : `window.AppFramework.refresh()`.

## 4. `content_i18n.js` — traduction

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
  **performances** (`__perf`, Flight Planner).
- `FileAccess.pickFolder(clé)` : le sélecteur s'ouvre sur le dossier actuel ; contrôle du
  contenu attendu (fichier témoin) avec confirmation.
- `FileAccess.decorate(bouton, clé)` : le bouton affiche « Dossier du registre : CR DEFA ✓ »
  (✓ autorisé, ⚠ à ré-autoriser au prochain accès) ; l'infobulle donne le dossier attendu et
  l'état — l'explication au survol plutôt qu'à l'écran.
- **Tout** `<input type="file">` de la suite ouvre le sélecteur du système **directement dans
  le dossier paramétré** : `data-picker-folder="__ledger"` sur le champ, sinon dossier par
  défaut de la page (application CR DEFA : registre ; Paramétrage : dépôt ; Flight Planner :
  performances), sinon le dernier dossier utilisé pour ce bouton. Le code des pages ne change
  pas (événement `change` habituel). Navigateurs sans l'API : sélecteur natif.

### Panneaux de copier-coller (`FileAccess.pastePanel`)

Toute fenêtre où l'on colle un texte (CR › Analyse / import, journal DEFA, historique VATSIM du
suivi réseau) : **×** en haut à droite et bouton **Fermer** ; le bouton de chargement est
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

## 12. `tools/` — maintenance

- `tools/bump_versions.py` : nouveau numéro de version de cache (`?v=`) dans toutes les pages
  après une modification de code partagé (toujours supérieur au précédent).
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
