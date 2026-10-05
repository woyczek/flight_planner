# Proposition — icônes, numéros et sous-titres de blocs, barre latérale, zones de dépôt

Statut : **proposition** accompagnée d'un **prototype non branché** (aucune page existante modifiée).
Point de départ : la maquette du générateur de mission (barre latérale sombre, en-tête avec sélecteur de mission,
blocs numérotés à sous-titre, sous-cartes à icône, zones de dépôt, boutons à icône, bandeau d'information).
À lire avec [FRAMEWORK.md](FRAMEWORK.md).

Prototype :

| Fichier | Rôle |
|---|---|
| `shared/icons/repository_icons.js` | registre d'icônes au trait (SVG en ligne, 43 icônes, `window.RepositoryIcons`) |
| `shared/block_icons.js` + `.css` | lit `data-step`, `data-icon`, `data-subtitle` ; sous-cartes `.repo-card` ; zones de dépôt `input[type=file][data-dropzone]` ; couleur des icônes selon le contraste réel ; design « Console » |
| `shared/side_nav.js` | barre latérale générée depuis `repository_tree` |
| `docs/demo_design_icones.html` | démonstration : la maquette reconstruite avec le framework, choix du thème / design / barre latérale, tableau des contrastes de tous les thèmes, catalogue d'icônes |

La démonstration s'ouvre par le serveur local du dépôt (voir INSTALL), ex. `http://localhost:8765/docs/demo_design_icones.html`.
Vérifiée : 4 langues, 5 designs, thèmes clair (`sia`) et sombre (`flight`), glisser-déposer (fichier accepté,
fichier refusé), Masquer / Afficher.

---

## 1. Analyse de la maquette

| Élément de la maquette | Existant dans le framework | Écart |
|---|---|---|
| Barre latérale sombre (Missions, Générateur, Cartes, CR DEFA, Paramètres, Aide) | menu ☰ (`repository_nav.js`), arborescence complète de `repository_tree` | nouvelle : raccourcis permanents vers les applications, en complément du ☰ |
| En-tête : icône + titre + sous-titre | `.repo-header`, `<h1>` de la page | icône et sous-titre du titre |
| Sélecteur de mission ◀ liste ▶ + boutons d'action | propre au générateur et au studio (lots de missions, v2.2.8) | à factoriser plus tard (même composant dans les deux pages) |
| Bloc numéroté (pastille « 1 »), titre en capitales, sous-titre, « ˄ Masquer » | bloc `.repo-block` + `.repo-block-heading` (`app_framework.js`), numéro écrit dans le titre (« 1. Importer une mission ») | pastille, sous-titre, icône ; capitales = forme (design) |
| Sous-cartes : icône + titre + sous-titre (+ bouton agrandir) | `.pasteBox`, `<strong>` ou `<label>` selon les pages | composant commun `.repo-card` |
| Zones de dépôt en pointillés « Choisir des fichiers ou glisser-déposer ici » | `<input type="file">` natif ; `file_access.js` ouvre le sélecteur dans le dossier paramétré | composant commun qui enveloppe l'`<input>` |
| Libellés de champs avec icône | `<label>` texte + champ | icône avant le texte |
| Boutons avec icône (avant ou après) | texte seul, parfois flèche « → » ou emoji (💾, 📅, ⏱) | icône SVG déclarée |
| Bandeau d'information en bas du bloc | `#status.status`, `p.small` | style commun `.repo-notice` |

Constat : **tout ce qui change est déclaratif** (une icône, un numéro, un sous-titre, une zone de dépôt) et
s'applique de la même façon à toutes les pages. C'est donc au framework de le rendre, comme il rend déjà les
boutons ↕ / Masquer : une page déclare, le framework dessine.

## 2. Principes retenus

1. **Déclaration dans le HTML**, lue par le framework — dans la continuité de `data-block-id` et
   `data-default-hidden`. Aucune page n'écrit de SVG ni de JavaScript pour ses icônes.
2. **Structure commune à tous les designs, forme propre à chaque design** (règle de `designs.css`) : icônes,
   numéros et sous-titres existent partout ; leur taille, leur forme et leur densité changent avec le design.
3. **Couleurs du thème uniquement** (`--repo-bar`, `--repo-bar-text`, `--repo-page`, `--repo-accent`) et
   **contrastes vérifiés à l'exécution** sur la surface réelle du bloc (§ 7).
4. **Aucune dépendance au lancement** : pas de CDN, pas de police d'icônes téléchargée ; tout est dans le dépôt.
5. **La traduction ne change pas** : les textes restent des nœuds texte en français dans la source, traduits par
   `content_i18n.js` ; l'icône est un élément à côté du texte, jamais dans le texte.

## 3. Déclaration dans une page

### Blocs

```html
<section data-block-id="mission-import" data-step="1" data-icon="upload"
         data-subtitle="Choisissez vos fichiers, générez une mission avec ChatGPT.">
  <h2>Importer une mission</h2>
  …
</section>
```

| Attribut | Effet | Remarque |
|---|---|---|
| `data-step="1"` | pastille numérotée avant le titre | décorative (`aria-hidden`) : le titre se lit seul |
| `data-icon="upload"` | icône avant le titre | nom du registre (§ 4) |
| `data-subtitle="…"` | sous-titre sous le titre, dans l'en-tête du bloc | reste visible quand le bloc est masqué |
| `<p class="repo-block-subtitle">` juste après le `<h2>` | même effet, en élément | au choix de la page (texte long, balisage) |

Le sous-titre en attribut est converti en **nœud texte** par le framework : `content_i18n.js` le traduit comme
n'importe quel texte (il suffit d'une ligne `[fr, en, de, es]` dans la table de la page).

Rendu : `.repo-block-heading` reçoit `.repo-block-heading-rich` et contient
`.repo-block-lead` (pastille, icône) → `.repo-block-titles` (`<h2>`, sous-titre) → `.repo-block-tools` (↕, Masquer).
Le bouton Masquer reçoit un chevron (˄ / ˅) en CSS, car son texte est réécrit par `app_framework.js`.

**Numéros hors du titre.** Aujourd'hui le numéro est dans le texte (« 1. Importer une mission ») et dans les
lignes de traduction. Il passe dans `data-step` ; les lignes de traduction perdent le numéro. Le framework ne
retire **pas** automatiquement un « 1. » du titre : `content_i18n` mémorise la ligne traduite par nœud texte, et
modifier ce texte casserait la retraduction au changement de langue (constaté en lisant `translate()`).

### Sous-cartes

```html
<div class="repo-card" data-icon="file" data-subtitle="Importez un ou plusieurs fichiers de mission (YAML, .md).">
  <h3>YAML et/ou Markdown</h3>
  <span class="repo-card-tools"><button data-icon="maximize" aria-label="Agrandir"></button></span>
  <input type="file" accept=".yaml,.yml,.md" multiple data-dropzone>
</div>
```

`.repo-card` n'est **pas** un bloc (ni ↕ ni Masquer) : c'est une subdivision d'un bloc. Nom distinct de `.card`
(déjà stylé par les designs et utilisé par certaines pages).

### Icônes en ligne (boutons, libellés, titres, bandeaux)

```html
<button data-icon="plus">Nouvelle mission</button>
<button data-icon="sparkles" data-icon-end="arrow-right">ChatGPT</button>
<label data-icon="globe">Théâtre<select>…</select></label>
<h1 data-icon="target" data-subtitle="Créez, importez et préparez vos missions DEFA">Générateur complet de mission</h1>
<p class="repo-notice" data-icon="info">Aucune mission chargée.</p>
```

- L'icône est insérée **à côté** du nœud texte, qui n'est pas modifié (la traduction continue de le suivre).
- Dans un `<label>` (souvent en grille : texte au-dessus du champ), l'icône et le premier texte sont regroupés
  dans `.repo-label-line` ; le nœud texte est déplacé, pas réécrit.
- Bouton sans texte (icône seule) : `aria-label` et `title` **obligatoires** (traduits par `content_i18n`).
- Les flèches « → » écrites dans les textes deviennent `data-icon-end="arrow-right"` (lignes de traduction
  sans la flèche).

### Pages rendues par JavaScript

- **Mission Core** (CR des 16 familles) : les blocs viennent de `shared/mission_core/blocks.js` et sont construits
  par `form.js` (`section.dataset.blockId = mc-…`). Ajouter `icon` et `subtitle` (tableau `[fr, en, de, es]`,
  comme `title`) aux définitions ; `form.js` pose `data-icon` et un `<p class="repo-block-subtitle">` déjà
  traduit. Une seule modification couvre toutes les familles.
- **Reportings** (`global_reporting.js`) : le sous-titre existe déjà sous forme de `<span class="mcg-sub">` dans le
  `<h2>` ; il peut devenir `.repo-block-subtitle`.
- Toute page qui redessine ses blocs appelle déjà `AppFramework.refresh()` : le décor est refait au même moment.

### Intégration définitive (au lieu du fichier séparé du prototype)

Le prototype enveloppe `AppFramework.refresh()` et observe le DOM pour rester non intrusif. En production :

- lecture de `data-step` / `data-icon` / `data-subtitle` **dans `app_framework.js`**, au moment où il construit
  `.repo-block-heading` (plus d'enveloppe de `refresh`, plus de double passage) ;
- registre d'icônes chargé par `repository_nav.js` (comme `designs.css`, `pilot_profile.js`, `file_access.js`),
  donc disponible sur toutes les pages sans nouvelle balise `<script>` ;
- icônes en ligne et `.repo-card` : petite passe commune dans `app_framework.js` (idempotente, même observateur
  léger que le prototype) ;
- zone de dépôt : dans `file_access.js`, qui gère déjà tous les `<input type="file">` (§ 6) ;
- styles : `repository_nav.css` (structure) et `designs.css` (forme par design).

## 4. Jeu d'icônes

### Options

| Option | Avantages | Inconvénients | Avis |
|---|---|---|---|
| **Registre JS de tracés SVG** (`repository_icons.js`) | aucun fichier à charger, marche en `file://` et à l'impression, `currentColor`, extensible par page (`RepositoryIcons.add`) | icônes dans un fichier JS (≈ 150 octets par icône) | **retenu** |
| Sprite SVG externe (`<use href="../icons.svg#x">`) | fichier SVG standard | bloqué en `file://`, une requête, pas de `currentColor` fiable selon les navigateurs anciens | non |
| Police d'icônes locale | une balise CSS | rendu flou, accessibilité médiocre (caractères privés), une seule couleur, fichier binaire | non |
| Emoji (état actuel : 💾 📅 ⏱ ✓ ⚠) | rien à faire | rendu différent selon le système, couleurs imposées, pas thémables | à remplacer progressivement ; ✓ / ⚠ peuvent rester dans les textes |

### Source et licence

Style commun : **grille 24 × 24, trait 2, extrémités arrondies, sans remplissage**, couleur `currentColor`.

- Les 43 icônes du prototype ont été **dessinées pour le prototype** dans ce style (rien n'a été téléchargé).
- Pour la production, **Lucide** (<https://lucide.dev>, licence **ISC**, dérivé de Feather, licence MIT) est la
  référence naturelle : même grille, plus de 1 500 icônes, dont celles de la maquette (`map`, `wrench`, `file`,
  `cloud-upload`, `wand-sparkles`, `database`, `bookmark`, `refresh-cw`, `info`, `eye`, `x`, `send`, `settings`,
  `circle-help`, `globe`, `list`, `users`, `box`, `maximize-2`…). ISC et MIT sont compatibles avec la diffusion du
  dépôt : il suffit de conserver le texte de licence.
- Procédure proposée (manuelle, une fois) : copier les tracés des seules icônes employées dans
  `repository_icons.js`, ajouter `shared/icons/LICENSE` (texte ISC de Lucide + MIT de Feather), noter la version
  de Lucide en tête du fichier. Pas de paquet npm, pas de CDN, pas de chargement au lancement.

### Règles d'usage

- Nom d'icône = rôle générique (`upload`, `database`), jamais le nom d'une page.
- Tailles : 1,15 em dans un bouton ou un libellé, 24 px pour un bloc, 28 px pour une sous-carte, 22 px dans la
  barre latérale (réduites par le design Opérationnel).
- Icônes **décoratives** (`aria-hidden="true"`) : le texte voisin porte le sens. Icône seule = `aria-label`.
- Une icône par idée, la même partout (ex. `upload` = importer, `download` = exporter, `bookmark` = mémoriser).

## 5. Barre latérale de navigation

Générée par `side_nav.js` à partir de `repository_tree` — une seule source pour le menu ☰ et la barre :

```js
// repository_tree (proposition)
sidebar:[
  {icon:"target",   path:"apps/cpco/mission_editor.html", label:["Missions","Missions","Missionen","Misiones"]},
  {icon:"map",      path:"apps/cpco/map_parser.html",     label:["Cartes","Maps","Karten","Mapas"]},
  {icon:"clipboard",path:"apps/cr/mission_cr.html", match:"apps/cr/", label:["CR DEFA", …]},
  {icon:"chart",    path:"apps/cr/mission_operations_reporting.html", match:"_reporting.html", label:[…]},
  {icon:"fuel",     path:"apps/planner/flight_performance_planner.html", label:[…]},
  {icon:"plane",    path:"apps/landing/…", label:[…]},
  {sep:true},
  {icon:"settings", path:"apps/settings/parametrage.html", label:[…]},
  {icon:"help",     menu:true, label:["Menu", …]}      // ouvre le menu ☰
]
```

- Entrée active : la page elle-même, sinon `match` contenu dans le chemin (tous les CR d'une famille allument
  « CR DEFA »).
- Seules les pages déclarées dans `pages` sont affichées ; liens calculés depuis la racine (comme le ☰).
- Le **☰ reste** la navigation complète (arborescence, actions de page, profil, données locales, design) ; la
  barre n'en est qu'un raccourci.
- Affichage : préférence `html[data-sidenav="on"]` (menu ☰ › Design, case « Barre latérale ») ou design
  « Console » ; masquée sous 760 px et à l'impression. Le décalage est posé sur `<html>` (`padding-left`), car
  plusieurs pages imposent `body{margin:0!important;padding:0!important}`.
- La maquette distingue « Missions » et « Générateur » : dans la suite actuelle, c'est la même page
  (`mission_editor.html`). **À trancher** (§ 11).

## 6. Zones de dépôt de fichiers

`<input type="file" data-dropzone>` → l'`<input>` est **déplacé dans** une zone `.repo-dropzone`, jamais remplacé :

- le **clic** dans la zone appelle `input.click()` → `file_access.js` intercepte comme aujourd'hui et ouvre le
  sélecteur **dans le dossier paramétré** (`data-picker-folder` respecté) ;
- le **dépôt** de fichiers filtre selon `accept` (extensions, types MIME, `image/*`), respecte `multiple`, pose
  `input.files` et émet `change` (bulles) — **le même événement que `file_access.js`** : le code des pages ne
  change pas ;
- fichiers refusés : message « Type de fichier non accepté : … » dans la zone (lu par les lecteurs d'écran,
  `aria-live`) ;
- **clavier** : l'`<input>` reste focalisable (masqué visuellement, pas `display:none`) ; contour de focus sur la
  zone (`:focus-within`) ;
- textes du composant (« Choisir des fichiers », « ou glisser-déposer ici », « Aucun fichier choisi ») traduits
  par le composant lui-même (comme Masquer / Afficher), noms des fichiers choisis affichés ;
- zone placée dans un `<label>` (cas du générateur) : `preventDefault` sur le clic, pas de double ouverture.

À prévoir en production : empêcher qu'un fichier lâché **à côté** d'une zone fasse quitter la page (le navigateur
ouvre le fichier) — `dragover`/`drop` neutralisés sur `document` dès qu'une page contient une zone. Les dossiers
(`webkitdirectory`) restent en sélecteur natif, comme aujourd'hui.

## 7. Designs, thèmes et contrastes

### Cohabitation avec les quatre designs

**Recommandation : éléments communs à tous les designs + un cinquième design « Console ».**

| | Standard | Aéro | Opérationnel | Brief | Console (nouveau) |
|---|---|---|---|---|---|
| Pastille de numéro | ronde 28 px, couleurs du bandeau | + ombre teintée | carrée 22 px | cerclée, chiffre à empattement | ronde 44 px |
| Icône de bloc / sous-carte | 24 / 28 px | idem | 18 / 20 px | idem | 28 / 28 px |
| Sous-titre | 0,88 rem | idem | 12 px | italique | idem |
| Sous-carte | bordure fine, rayon 10 | rayon 16 | rayon 3, compacte | filet bas seulement | rayon 8, aérée |
| Zone de dépôt | pointillés, 96 px | rayon 14 | 60 px | angles vifs | idem Standard |
| Titre de bloc | page | page | capitales (déjà) | empattement (déjà) | capitales, 1,3 rem, gras |
| Barre latérale | préférence | préférence | préférence | préférence | **affichée** |

Pourquoi pas « tout dans un nouveau design » : les icônes, numéros et sous-titres sont du **contenu** (repères,
explications) utile quel que soit le goût graphique ; les réserver à un design ferait deux versions des pages à
maintenir. Le design « Console » regroupe seulement ce qui est affaire de goût : barre latérale, cartes aérées,
titres en capitales, boutons hauts (40 px).

Ajouter « Console » : entrée `console` dans `repository_tree.designs.list` (libellés 4 langues) et règles
`html[data-design="console"] …` dans `designs.css` (reprises de `block_icons.css`).

### Contrastes (WCAG)

Mesures sur les thèmes de `repository_tree` (tableau complet dans la démonstration, bloc « Contrôle des contrastes ») :

| Couple | Minimum mesuré | Exigence | Verdict |
|---|---|---|---|
| Texte du bandeau / bandeau (pastille, barre latérale) | 6,47 (hadr) | 4,5 | ✓ tous les thèmes |
| Sous-titre d'en-tête (texte du bandeau à 84 %) / bandeau | 4,93 (hadr) | 4,5 | ✓ — à 72 % : 4,31 (sia) ✗, d'où 84 % |
| Accent / surface blanche | **2,12 (flight), 2,45 (landing)** | 3 (icône) | ✗ pour ces deux thèmes sur surface claire |
| Accent / surface sombre de ces pages | 7,06 (landing), 8,17 (flight) | 3 | ✓ |
| Sous-titre de bloc (texte à 75 %) / surface | 6,96 (clair), 8,72 (sombre) | 4,5 | ✓ |

Conséquence : une couleur fixe « accent » pour les icônes ne suffit pas (thèmes `flight` et `landing` sur une
carte claire). Le prototype choisit **à l'exécution**, pour chaque bloc et sous-carte, d'après la couleur de fond
réelle :

- `--repo-icon` : première couleur du thème (accent, bandeau, texte du bandeau) à **≥ 3:1** (WCAG 1.4.11, éléments
  graphiques), sinon la couleur du texte ;
- `--repo-ink` : même choix à **≥ 4,5:1** pour un texte coloré (« Choisir des fichiers », chiffre en design Brief).

Pastille : texte du bandeau sur bandeau (déjà validé ≥ 6,47) + liseré intérieur, pour rester visible quand le
bandeau a la teinte de la surface (thème `flight` sur surface sombre). Barre latérale : bandeau assombri de 14 %
(le texte clair y gagne du contraste). Proposition complémentaire : `tools/check_contrast.py`, qui recalcule ces
rapports pour chaque thème à chaque modification de `repository_tree`.

## 8. Traduction (fr / en / de / es)

- Sous-titres, libellés, `aria-label` / `title` des boutons à icône seule : **lignes `[fr, en, de, es]`** de la
  table de la page (`sia_i18n.js`, `flight_i18n.js`, `landingI18nRows()`…) — aucun mécanisme nouveau.
- Blocs Mission Core : `subtitle` en tableau `[fr, en, de, es]` dans `blocks.js`, comme `title`.
- Textes des composants (zone de dépôt, barre latérale) : traduits par le composant (tableaux internes), retraduits
  sur `repository-language-change`. Barre latérale : libellés dans `sidebar[].label` ou table `labels` de
  `repository_tree`.
- Numéros sortis des titres (`data-step`) → lignes de traduction à mettre à jour sans le « 1. » ; flèches « → »
  sorties des textes → idem.
- Capitales : `text-transform` en CSS seulement (le texte source et les lecteurs d'écran gardent la casse).
- Typographie française (U+202F) : inchangée, appliquée à l'affichage par `content_i18n.js` ; les textes composés
  par le code passent par `RepositoryContentI18n.typography()` (le prototype le fait pour la zone de dépôt).
  Remarque : un texte `[data-no-i18n]` composé dans une langue n'est pas recomposé au changement de langue — le
  code qui le produit doit se réabonner à `repository-language-change` (vu dans la démonstration).

## 9. Impact sur les pages existantes

| Page | Structure actuelle | Travail | Risque |
|---|---|---|---|
| Générateur (`apps/cpco/mission_editor.html`) | 6 `section`, titres numérotés, `.pasteBox`, `<input type=file>` dans des `<label>` | `data-step/icon/subtitle`, `.repo-card` pour les sous-blocs, `data-dropzone`, icônes des boutons ; lignes `sia_i18n.js` | **session parallèle en cours sur ce fichier** : attendre sa fin |
| Studio (`map_parser.html`) | 5 `section`, colonne d'aperçu collante (`StickyFrame.stick`) | idem ; `StickyFrame.refresh()` après décor (hauteur d'en-tête modifiée) | idem (session parallèle) |
| CR DEFA (Mission Core, 16 familles + démo) | blocs générés par `form.js` depuis `blocks.js`, `core.css`, outils d'en-tête en `summary` | `icon`/`subtitle` dans `blocks.js`, 10 lignes dans `form.js` | faible ; vérifier l'impression (`core.css` masque déjà `.repo-block-heading` du rapport) |
| Reportings (général, familles, HEMS/GAAR anciens) | `section.section` + `h2` avec `.mcg-sub` | icônes par section, `.mcg-sub` → sous-titre | faible |
| Planificateur (`apps/planner/flight_performance_planner.html`) | 13 blocs, en-têtes `.row>h2` avec contrôles, thème sombre, `StickyFrame.follow`, `ColumnResize` | icônes seulement (pas de numéros : pas de parcours linéaire) | règle `.perf-side>[data-block-id=result].is-stuck>:not(.repo-block-heading)` : l'en-tête reste enfant direct, OK ; densité |
| Landing Dashboard | thème sombre, dictionnaire propre `TR` | icônes ; sous-titres via `landingI18nRows()` | faible |
| Paramétrage, fiches appareil / équipage | blocs simples | icônes | faible |

Aucune page n'est touchée tant qu'elle ne déclare rien : sans `data-step` / `data-icon` / `data-subtitle`, l'en-tête
de bloc reste identique à aujourd'hui (vérifié dans le prototype : le décor ne s'applique qu'aux blocs déclarés).

## 10. Plan de migration

1. **Validation** de la maquette et des décisions du § 11 (sur la démonstration).
2. **Framework, sans effet visible** : registre d'icônes chargé par `repository_nav.js` ; lecture des attributs
   dans `app_framework.js` ; `.repo-card`, `.repo-notice`, icônes en ligne ; styles dans `repository_nav.css` et
   `designs.css` ; FRAMEWORK.md (nouvelle section « Icônes et en-têtes de blocs ») ; `tools/bump_versions.py`.
3. **Zone de dépôt** dans `file_access.js` (`data-dropzone`, opt-in) + neutralisation du dépôt hors zone.
4. **Page pilote : le générateur**, une fois le travail parallèle sur `mission_editor.html` / `mission_store.js`
   fusionné — numéros sortis des titres, lignes `sia_i18n.js` mises à jour.
5. **Studio cartographique** (mêmes composants ; sélecteur de mission ◀ ▶ factorisé avec le générateur).
6. **Mission Core** : `icon` / `subtitle` dans `blocks.js`, rendu par `form.js` (toutes les familles d'un coup).
7. **Reportings, planificateur, Landing, Paramétrage** : icônes de blocs et de boutons.
8. **Barre latérale + design « Console »** : `sidebar` et `designs.list.console` dans `repository_tree`,
   préférence « Barre latérale » dans le menu ☰ ; clé `repositorySidenav` exclue du compteur de sauvegarde
   (`browser_store.js`, comme `repositoryFramework:`).
9. **Nettoyage** : emoji des boutons (💾, 📅, ⏱) remplacés par des icônes ; flèches « → » retirées des textes.

Chaque étape : `bump_versions.py`, CHANGELOG, contrôle 4 langues × 5 designs × thèmes clair / sombre, impression.

## 11. Risques

- **Travail parallèle** sur le générateur, le studio et `mission_store.js` : toute intégration dans ces pages
  attend la fin de cette session (conflits sinon). Le prototype n'y touche pas.
- **Structure de l'en-tête de bloc** : le `<h2>` passe de `.repo-block-heading>h2` à
  `.repo-block-heading>.repo-block-titles>h2`. Aucun sélecteur `…heading>h2` trouvé dans le dépôt ; les sélecteurs
  descendants (`.repo-block-heading h2`, `.repo-block h2`) restent valables.
- **`AppFramework.refresh()`** : le prototype l'enveloppe ; en production la lecture se fait dans
  `app_framework.js` même (pas d'enveloppe).
- **Numéros et réordonnancement** : l'utilisateur peut déplacer les blocs (↕) ; les numéros restent ceux de la
  page, donc dans le désordre. Options : numéros fixes (repères de parcours), renumérotation selon l'ordre affiché,
  ou numéros masqués dès que l'ordre est personnalisé — **à trancher**.
- **Largeur** : la barre latérale prend 84 px ; le planificateur (grille à colonnes redimensionnables) et les
  tableaux larges en pâtissent → barre désactivée par défaut hors design « Console ».
- **Contraste** : garanti par le choix à l'exécution pour les icônes ; un thème ajouté plus tard avec un texte de
  bandeau peu contrasté casserait pastille et barre → contrôle outillé (`tools/check_contrast.py`).
- **Compteur de sauvegarde** : les préférences d'affichage (`repositoryDesign`, `repositoryLanguageMode`,
  `repositorySidenav`) incrémentent aujourd'hui le compteur « 💾 Sauvegarder (n) » ; à exclure comme la disposition
  des blocs.
- **Licence** : aucune tant que les icônes sont dessinées localement ; avec Lucide, conserver ISC + MIT.
- **Impression** : icônes imprimées (SVG, couleur du texte) ; barre latérale et pastille de dépôt masquées.

## 12. Décisions à prendre

1. **Portée** : icônes / numéros / sous-titres communs à tous les designs (recommandé) ou réservés à un design ?
2. **Design « Console »** : l'ajouter comme 5ᵉ design (recommandé) ; faut-il en faire le design par défaut ?
3. **Barre latérale** : entrées (la maquette sépare « Missions » et « Générateur », qui sont une même page
   aujourd'hui ; « Aide » : quelle cible — TUTORIAL, manuel, ou le ☰ ?) ; affichée par défaut ou sur préférence ?
4. **Jeu d'icônes** : importer les tracés Lucide (ISC) ou garder des dessins propres ?
5. **Numérotation** : fixe, recalculée selon l'ordre affiché, ou masquée si l'ordre est personnalisé ?
6. **Numéros et flèches hors des textes** : d'accord pour mettre à jour les lignes de traduction en conséquence ?
7. **Ordre de migration** : générateur en pilote dès la fin de la session parallèle, puis Mission Core ?
