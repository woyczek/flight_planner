# V3 — three applications, one frame, modules (specification in progress)

*Started 22 October 2026 from the user's brief. Draft to be refined with the user before any code; interaction design
follows (§ 7). Decisions taken on this document are logged in § 8 so that no agent needs the chat history.*

## 1. Why a V3

V2 added usage levels, three manuals, a mission generator, performance sheets, an availability module, a phone mode,
a stand-alone site (GitHub Pages) and an iOS shell. Trying them on a phone and on the stand-alone site showed the
limits of a suite built page by page:

- the stand-alone mode reads a git repository without a cache: too slow, and the interface has no place for a
  synchronisation control;
- availability entry and mission assignment are desktop gestures (grid, drag and drop) that do not transfer to a
  finger;
- the "global" application, same code for the browser on a desktop and for the phone, is heavy and complex again.

The application and the desktop do not have the same goals. V3 separates them: one **frame**, **modules** worked on
one by one, and three **applications** that assemble modules. Modules are activable or not; the whole stays one
coherent suite.

## 2. The three applications

| Application | For whom | What it does | Main modules |
|---|---|---|---|
| **Pilot** | the pilot preparing a flight | planning tools: fuel, maps, flight level, airspaces, performance sheets, landings | fuel, maps, performance sheets, airspace, landing |
| **CPCO** (operations centre) | the planners of the centre | mission generator, mission registry, assignment of missions (from the registry, or "free"), order schedule | generator, registry, assignment, orders |
| **SOG client** | the member of the airline | receive missions, fly them, write reports — a report is **not** necessarily attached to a mission; availability; my flights | my missions, availability, report, my flights, fleet (read) |
| **Maintenance** (user, 29 Oct evening: "Pour éteindre la v2, il faut les paramétrages admin aéronautique sur la v3. Ce n'est pas dans l'appli pilote ou alors à très très haut niveau. C'est une appli maintenance") | the person who holds the aeronautical data (workstation with a launcher) | zones and sources, download, build (one process per zone), publish, purge; coverage; the launcher's keys and the workstation's settings | data (the module `modules/data`), settings (administration), help |

Decided (29 Oct): an application is a **named set of modules of the same frame** (tabs, rail, help), chosen by the
address (`/frame/?app=maintenance`, default `pilot`) and later by the role in the registry; the Pilot application
does not carry the Données module in its rail, it offers one line "Maintenance" in Réglages › Administration
(level Complet) that opens the Maintenance application; the V2 maintenance page goes out when Maintenance covers
it (D2 to D5 of the Data module). Open: which application a given person opens by default (role in the registry), and whether one person can switch
between them on the same device.

**Missions and the CPCO (user, 30 Oct; the ergonomics session's four objections were confirmed: "désaccord de
formulation, accord de fond")**: missions are **common** data — one author today (the user, whose numbering is the
reference until a later reorganisation of the mission repository), read by every pilot — kept in the shared
repository under `missions/`, one writer (the author, later the CPCO application); the CPCO stays V2 **until it is
built in V3** as the third application of the frame (a debt, not a scope); the "first step" is the first act of a new
**role**, "équipier enrôlé dans une structure réalisant des missions imposées" (neither the VFR pilot nor the airline
pilot: "mission d'un organisme supérieur"), and for that role Fuel starts from a mission (choose, or draw one); mission
categories depend on the airline's kind (a commercial VA has ferry, passenger and cargo missions, inactive for a SOG);
no users nor rights in V3 for now. Framing in § 10.32.

## 3. Transverse blocks (the frame)

- **Design**: designs and skins, tokens, icons, density (desktop / touch), day / night.
- **Security and code exchange**: signed accounts, keys, external services, and the exchange of data and code —
  target: decentralised (no central server required to work).
- **Online help**: tutorials, manuals, in-page help, per application and per module.
- **Settings and maintenance**: identity, levels, data access, caches, diagnostics.
- **Centralisation to the website** (PHP at the target): CPCO data, flight logs, reports; exchange bus; backends.
- **Aeronautical database**: SIA base by zone and cycle, aircraft base, published to the data repository, cached on
  every device.
- **Data layer** (new, the heart of the frame): one local cache (IndexedDB) that serves every read; explicit and
  visible synchronisation (button with its state: "synced 4 min ago, 2 pending writes") plus a regular background
  sync; the same layer behind the launcher, the GitHub mode and the native shells — a module never knows where data
  comes from.
- *(to complete: navigation and levels, translation, notifications, identity.)*

## 4. Supports

| Support | Notes |
|---|---|
| Website (GitHub Pages today, PHP site at the target) | no launcher; data through the data layer |
| Stand-alone (launcher on a workstation) | full suite, folder of data, git synchronisation |
| iOS / Android application (Capacitor shells) | same modules, phone profile, token kept on the device |
| Phone, tablet, screen with keyboard and mouse | every module declares its screens per size; touch gestures are designed, not adapted |

## 5. Module contract (proposal)

A module is what `shared/dispos_timeline.js` already is: one file (or one folder), no dependency on the frame except
through an **adapter** it receives at mount, its own **specification** (regeneration prompt), its own **integration
guide**, delivered separately if useful. It declares:

- what it **reads** and **writes** (paths in the data repository, schema versions);
- its **screens** by size (desktop, tablet, phone) and the gestures of each;
- its **level** and the applications it belongs to;
- its texts (English by default, labels supplied by the frame).

The frame loads a module on demand. A phone profile loads only the modules of its application.

## 6. Agents (one per module, memory of their own)

The sessions of `.claude/agents/` are reorganised by module and by transverse block: each agent owns one module,
its specification, its integration guide and its decisions log (`docs/technique/<module>/DECISIONS.md`); the
ergonomics session keeps the global vision, the specification of this document and the arbitration. Chat history is
**not** needed by an agent: what it needs is written here and in its module's documents.

## 7. Interaction design (to do, per application)

For each application: the first screen, the three things the person does most, how each is done with a finger and
with a mouse, what happens offline, where the synchronisation state and control are. Then per module: the screens
by size. Drafted with the user, validated before code.

### 7.1 Phone target given by the user (24 October 2026, reference: the iVAC app)

The user showed iVAC (VAC charts app, iOS) as the ergonomic target for the Pilot application on a phone. Keep the
**path** in mind even when features are added: every verb at most one tap away, under the thumbs.

- **No hamburger menu.** A **bottom tab bar** with **five items at most, Settings included**, near the thumbs: the
  verbs of the application (today Fuel, Map, Report, My flights, Website: five already; Settings would make six, so
  one verb has to go to a secondary place, or Website folds into another). The bar replaces the drawer; the rail stays
  on a screen.
- **The selected item changes form, not only colour**: a filled variant of the icon on a soft pill (iVAC: filled glyph
  in a rounded grey block), a discreet change, no bright accent block.
- **A "back to top" arrow** when the screen is scrolled, because some controls sit at the top.
- **A small "i" badge** (green in iVAC) on a line that opens a particular pop-up (state of the data: "eAIP in force
  01 OCT 2026", next update), instead of a sentence.
- **Synchronisation control in Settings**, under the right thumb: an acceptable path since Settings is one tap away.
- Filters as **chips** on one row ("All ✓ / Favourites / Recent"), a sort button at the end; lists with a 44 px row,
  the code as a badge, a chevron or a status icon at the right.
- Settings as **segmented controls** and toggles on one line with their label, the version and credits at the bottom.

For the ergonomics session: this reshapes the frame's navigation on a phone (frame SPEC § 3.1, the drawer) and the
design primitives (tab bar, chips, segmented control, badge, back-to-top); to decide and cut into lots with the frame
and design agents. The four design mock-ups (§ 10.3) were made with the drawer; the tab bar supersedes it on a phone.

**Decided (user, 24 Oct 2026, 11:00 — option A "the flight's path")**: the phone bar reads left to right in the
order of a day: **Préparer · Carte · CR · Vols · Réglages**.
- *Préparer* = fuel and level, with a **Météo** tab (the atmosphere module) and the sheets behind a tab; *Carte* =
  the fixed map with the data block (profile, airspaces, VFR points, weather cross-section); *CR* = the report in
  three steps, recorded on the website in the same gesture; *Vols* = my flights and the website log, "write the
  report" for a flight without one; *Réglages* = identity, access, synchronisation, design, diagnostics, help.
- **Website is not a verb** (a transport: the report records, flightlog reads, Settings connects); **Atmosphere is
  not a verb** (a tab of Préparer and a content of the map's data block). Both stay reachable by their address.
- First screen: Préparer, with a status line at the top that shortens the path when it applies ("Flight started ›
  Map", "Report to write for yesterday's flight").
- The frame gets the notion of a **tab = a group of modules** (Préparer = fuel + atmosphere): the bar's case stays
  active while any module of the group is shown. On a screen the rail keeps every module that has a screen.
- Options B (map first) and C (a "Today" hub) were presented and not retained.
- **The map screen must be fixed** (user, same day: "le module carte n'est toujours pas fixe, scroll bar et artefacts
  en header"): on a phone the Carte screen takes the viewport (header, map, data block, bar) with **no page scroll**;
  the data block is a sheet of fixed height under the map, scrolling inside. A frame contract lets a module declare
  a fixed, full-height view. This matters for the native shells (iOS, then Android, Capacitor): the user holds a
  TestFlight key now.
- **Atmosphere stays a dedicated module behind an icon for now** (user, 24 Oct, 12:30, after trying it on a phone:
  "rien ne va en termes d'ergonomie… parfait en mode large… épouvantable en mode téléphone. On retravaille, sous la
  forme d'un module dédié derrière une icône, on réinclura plus tard. Template : module carte"): fixed view like the
  map (map at the top; at the bottom the global cross-section, or the local slice after a tap on the map; the table and
  the settings behind buttons of the module's own toolbar, "i"), no page scroll. Registered at level 1: the Préparer
  group then shows the Carburant · Météo sub-tabs drawn by the frame, which is the later re-inclusion already in place.
- **Orientation locked to portrait for now** (user: "en attendant, on verrouille l'orientation"): manifest
  `orientation: portrait`, `screen.orientation.lock` attempted by the frame once installed, Capacitor iOS portrait on
  iPhone; Android later. **Landscape layout to decide** (the user's question, worded "portrait" but describing the
  map beside the profile): proposed target, map at the left (≈ 60 %), the data block as a narrow right column
  (global profile or local slice), a short info line under it, the buttons as a vertical rail at the right edge under
  the thumb. A later lot of maps and atmosphere once decided.
- **Answers of the user, 24 Oct (afternoon)**: fuel's first tab renamed (Devis / Quote / Berechnung / Cálculo),
  "Préparer" being the bar's word; the **status line gives way to an "i" button of the header** (the iVAC pattern:
  a small badge, green when something applies, opening a pop-up with the state: started flight › Carte, report to
  write › CR, data synchronised n minutes ago, pending writes); the pending report comes from a small cache record
  published by flightlog (`cache/flightlog/pending.json`); atmosphere at level 1, on the rail; fixed modules have no
  help panel nor welcome card, a help button in their toolbar only if needed (the header's "?" opens the chapter).
- **Map screen = header · map · data block · bar, nothing else** (user, 24 Oct, 14:00, on the phone: "Ce n'était pas le
  deal. header, carte, carte, footer. Les autres infos sont mises ailleurs."): the toolbar line (flight selector, Edit,
  Recentre, mode) and the information line under it, the title row of the data block ("Profil vertical" with the
  Profil · Météo toggle) and the hint line ("Glissez le doigt…") all leave the column. Where they go: the map's
  controls as overlays on the map (right column of 44 px round buttons: Edit, Recentre, mode; Layers at the left as
  today), the flight selector inside the Layers panel (rarely used), the flight summary (DEP → ARR · FL · NM · type)
  as the text of the sheet's grip row (ellipsed), the Profil · Météo choice as two small icon chips at the right of that
  same grip row, the hints to the help, the notes ("terrain unavailable") as a small line at the bottom of the sheet's
  content. The sheet's grip row (44 px) is the only chrome between the map and the content. The same template holds
  for atmosphere (its toolbar becomes overlays and the grip row).
- **Same on atmosphere, and three more rules** (user, 24 Oct, 14:05, screenshots of the atmosphere screen on the
  phone: "Idem ici. Le volet glissant fonctionne, mais pas les boutons, et trop d'éléments sur le header. Prévoir une
  exemption pour certains boutons communs. Prévoir un « full screen » pour supprimer le footer et/ou le header."):
  1. **Exempted common buttons**: the only controls allowed between the header and the data block are overlays on the
     map, drawn in a frame-provided overlay layer with two slots: left column (Layers) and right column of round
     44 px buttons (Edit, Recentre, mode, Load, the altitude chip of atmosphere, **Full screen**). Nothing else: no
     toolbar line, no info line, no group sub-tabs row above a fixed module.
  2. **Full screen** (frame): a button of the right column hides the tab bar and the header (both on a phone; on a
     screen the header only, the rail folds), the map and the sheet take the whole viewport; a small "exit" chip
     (44 px) at the top right, Escape, or the same button again brings them back; remembered for the page's life.
  3. **Header slimmed on a phone**: name · "i" · ⚙ only. The sync/trigram dot becomes the "i" badge's colour (green
     ok, amber attention) and its text a line of the pop-up; the help "?" becomes the last line of the "i" pop-up
     ("Aide de cet écran ›"). On a screen the header keeps every button.
  4. **Group switch without a row**: the Carburant · Atmosphère sub-tabs row disappears; a second tap on the active
     bottom tab opens a small popover above the bar listing the group's modules (the current one marked); on a screen
     the rail already lists them. Reachable too from the "i" pop-up? No: the popover only.
  5. ~~Buttons that do not respond on the iPhone~~ — amended by the user (14:20): "Techniquement, ça fonctionne. Mais
     ce n'est pas du tout ni ergonomique, ni utile pour un utilisateur. C'est un souci d'interface, pas de code."
     and "Maximiser l'espace alloué à la carte." Measured on the atmosphere screen (iPhone 13 emulation, 664 px high):
     184 px of chrome above the map (header 57, sub-tabs 44, margin 12, toolbar 48, info line 23), map 235 px (35 %).
     Rules 1–4 above give the map back about 130 px; in addition the **default sheet position goes down to 30 % on a
     phone** (floor 170 px; 35 % on a screen unchanged) so that the map keeps about 60 % of the view by default.
  6. **Atmosphere's sheet is the reference** (user, 14:45: "J'aime la proposition de volet de la part de météo"): the
     grip row carries a meaningful title that says what the content is and its context ("Tranche 43.49° 4.93° · à
     4 NM de la route · 14:44Z", "Profil · chaque lieu lu à l'heure de passage · 9 lieux"), ◀ ▶ to move between
     items when it makes sense, ✕ at the right; no separate title row, no segmented control row. The map's sheet
     adopts it: the title names the content (profile of the flight, airspaces at this point, LFBD reporting points,
     weather cross-section) and the Profil · Météo choice becomes two small icon chips at the right of the grip row.
  7. **Landscape on a phone** (user, 24 Oct, 17:45, two iPhone shots: "Une passe ergo en mode paysage, actuellement
     c'est mauvais. Comme il n'y a pas de verrouillage, il faut le traiter" — Safari does not honour the manifest's
     portrait lock): relay decision, closing open question 1. When the window is wider than high and under 1024 px:
     the bottom bar becomes a **vertical rail of icons at the left edge** (44 px, no labels, same five entries, same
     popover on a second tap); the header stays (57 px); the fixed module's **sheet becomes a right column** (40 % of
     the width, 280 px at least, full height under the header, two positions: default and expanded 60 %, the grip row
     at its top as the title row, scrolling inside); the map takes the rest, full height; the overlay columns stay on
     the map (left: Layers; right: the module's buttons, the full-screen button last) and never wrap into two
     columns at that height (the frame lowers the gap to 4 px before wrapping). The **"flight date" slider** of
     atmosphere stays horizontal, inside the column under the title (the user asked whether vertical would be better
     "pour des raisons de place": the column gives the place; vertical stays the fallback if the column is too
     narrow). Full screen in landscape hides the header and the rail, the column stays. Frame lot first (class
     `html.f-land`, tokens `--f-sheet-side`, `--f-sheet-side-max`, rail rules), then maps and atmosphere take it.
  8. **Weather on the Carte** (user, 24 Oct, 18:30, iPhone shot of the map's Météo cut: "Où est passée la carte météo ?
     On n'a qu'une vue en profil vertical sur maps, mais on n'a plus la météo"): relay decision. The Météo chip of the
     map's sheet does two things at once: the weather cut in the sheet (today) **and the weather layers on the map**
     (isobars, barbs, clouds, jet at the flight's level and date, the same drawing as the Atmosphere module, from one
     shared renderer); the Profil chip puts the map back to the route only. Atmosphere extracts its map renderer into
     a library (`modules/atmosphere/lib/weather_map.js`, `attach(map, { flight, levelFt, time }) → { update, detach }`,
     reading the same caches, never calling Open-Meteo by itself), the map module calls it. Atmosphere stays the
     place for the slider, the slices and the table; on a phone it is reached by a second tap on Préparer.
  9. **The sheet's default position shows the drawing only** (user, 24 Oct, 18:31, iPhone shot of the map's profile
     squashed above a text line: "sur ce profil, on ne veut que le profil. Le reste apparaît quand on slide le volet
     bas. Si on le rétracte, c'est ok"): in the default position the body holds the vertical profile or the weather
     cut alone, at the body's full height (readability floor kept, the body scrolls if really too low); the text
     strip and the notes appear only in the expanded position, under the drawing at its maximum height; the
     head-only position is unchanged. Atmosphere keeps its slider row with the cut (a control, not a text line).
  10. **No buttons in the header; the status at the top of Réglages** (user, 24 Oct, 18:45, with iVAC's Settings
      screen as the reference: "il y a toujours duplication des paramètres par le bas et le haut… on avait dit qu'en
      terme d'ergonomie, les messages et la synchro étaient visibles tout en haut des params, donc pas de besoin de
      boutons dans le header"): relay decision, amending § 7.1 rule 3 and the "i" button of the afternoon answers. On
      a phone the header carries the name (or "←") only; the **Réglages tab** carries the badge (green news, amber
      attention) and its screen opens with a **status block** at the top: the lines of today's "i" pop-up (started
      flight › Carte, report to write › CR, data synchronised n min ago, pending writes, base state, launcher,
      position, help of the last screen), then the settings cards. On a screen the rail's Réglages entry does the
      same and the header keeps the sync dot and "?". The "i" pop-up and the header gear go. Frame lot after the
      landscape lot, with the settings block.
  11. **The map's complexity slider is a zoom shift only** (user, same message: "le curseur complexité n'agit que
      comme si le zoom était différent… l'admin (moi) définit ce qu'un pilote veut voir à chaque niveau de zoom, via
      cette page outil. Anciennement accessible dans les paramètres très avancés"): what each zoom shows comes from
      the administrator's threshold page (`#maps?tune=1`, reachable again from Réglages › administration); the
      slider is the first control of the Layers content and its range is wide enough to empty an Europe-wide view.
  12. **Flight grid vs world weather: no visible edge by default** (user, 24 Oct, 19:50, after the rings proved to be a
      loading bug and not a model divergence: "Pas de bord, si ça ne se justifie pas, ou alors en option avancée (dans
      les paramétrages au même niveau que les sliders de zoom)"): the corrected blend stays the rule; an administrator
      option "Draw the flight zone's limit" (default off) on the map's threshold page (`#maps?tune=1`), saved with the
      thresholds in `airline/map_profiles.json`, passed by both modules to `weather_map.js` (`edge` option), draws a
      clean labelled line at the grid's limit.
      **Amended (user, 25 Oct, 08:55: "il y a un saut entre météo et gfs (normal). Donc je tranche : on affiche le
      cadre (filet fin) avec un mot dans l'aide contextuelle et/ou la légende pour indiquer la différence de modèle
      entre AROME et GFS. Et la précision du modèle")**: the thin line is **drawn by default**; the legend and the help
      chapter carry one line each: "zone du vol · <model and mesh>" / "monde · GFS, published mesh read from the
      index" (the models and their mesh come from the data, four languages). Hiding it is an administrator option.
  13. **The drawing fits the sheet; no title over a drawing** (user, 24 Oct, 20:10, iPhone shots of the cut with its
      x axis off screen: "les abscisses invisibles" and "Toujours la ligne « météo fl160 ». On le sait, c'est affiché
      juste au-dessous : FL, distance, etc. Info redondante donc, qui prend de l'espace vertical"): (a) the vertical
      profile and the weather cut are drawn **at the body's exact height**, the x axis (distances, waypoints) always
      visible without scrolling: no readability floor above the body, the chart drops level labels and ticks before it
      drops its axis; scrolling is for lists, not for drawings; (b) when the content is a drawing, the grip row carries
      **no title**: the handle and the chips only (Profil · Météo, ◀ ▶ when they apply, ✕), on a compact head
      (`.f-sheet-head-bare`, `--f-sheet-head-bare` = 28 px, frame primitive); a title stays for contents that do not
      describe themselves (Couches, Détails, Vol, lists). Atmosphere keeps its slider row under the bare head.
      **Refinement (user, 24 Oct, 21:05: "toujours la ligne d'en-tête superfétatoire au niveau moyen. Utile en volet
      agrandi ou réduit et paysage")**: the bare head applies to the **default position only**; in the expanded and
      the collapsed positions, and in the landscape column, the head keeps its title (there is room, and the title is
      then the only thing that says what the content is). **Second refinement (user's proposal, 24 Oct, 21:25,
      on the map's cut: "supprimer espace jaune et texte rayé rouge, aligner boutons verticalement à droite
      (horizontalement en paysage)", retained)**: no empty margin at the left of the drawing; the Profil · Météo chips
      leave the grip row and stand as a vertical column at the right of the drawing in portrait (44 px, touch zones
      44), as a horizontal row above the drawing in the landscape column; the bare grip keeps the bar and ✕ only.
      **Third refinement (user, 24 Oct, 22:05: "Les icônes passent en horizontal quand la ligne du haut apparaît
      (objectif : maximiser la largeur dispo)")**: the vertical column exists only with the bare grip (default
      position); whenever the titled head row is shown (expanded, collapsed, landscape column) the chips go back
      **into that row, horizontally at its right**, and the drawing takes the full width. Same for Atmosphere's ◀ ▶.
      **Fourth refinement (user, 25 Oct: "le i sur la ligne de titre est bien plus lisible que le bouton i, il permet
      de gagner de la place")**: no more vertical column: with the bare grip the chips sit **in the bare row itself**,
      at its right (28 px chips, 44 px touch zones; the frame's bare head supports buttons), the drawing takes the full
      width and the full height under the row; **their number never changes** (user: "ils doivent rester 3, pas faire
      d'aller-retour entre 2 et 3"): a chip that has nothing to show is disabled, not removed.
      **Done** (maps lot `v3-maps-puces2`, 25 Oct): the three chips are inside the head line (frame's bare-head buttons: 28 px, 44 px
      touch zones), always three, disabled (`disabled`, `aria-disabled`, muted) when empty; `modules/maps/DECISIONS.md`.
  14. **A legend for the drawing, the help button back, Météo in the bar** (user, 24 Oct, 22:15: "On devrait voir la
      légende quelque part. Hover sur le panneau du bas ? Au clic ? Un I quelque part ? À toi de décider. Le chemin,
      c'est qu'on voit un graphe le plus étendu possible, mais qu'on ne sait pas ce que sont les données
      représentées, d'autant qu'il n'y a plus de bouton d'aide contextuelle en header. Tu vas le remettre, et enlever
      les settings du footer. Pour y mettre soit les fiches de perfo, soit la météo. Tu gardes néanmoins le principe
      de double clic sur le menu pour mettre plus de boutons."): relay decisions.
      - **Legend**: an **"i" chip** in the drawing's chip set (last chip: after Profil · Météo on the map, after ◀ ▶
        in Atmosphere; in the column with the bare grip, in the head row otherwise) toggles a **legend overlay** over
        the drawing (translucent panel on the drawing's surface, closed by the chip, a tap on it or Escape): the
        series actually drawn, with their symbol and name in four languages, produced by the drawing code itself
        (`legend()` of `weather_map.js` / `section.js` for the cut, the profile's own list for the profile), never a
        static text. No hover (a phone has none). The screen's help chapter also carries the legend.
      - **Header on a phone**: name · **"?"** (contextual help: the chapter of the current screen, legend included)
        · **⚙** (Réglages, carrying the badge: green news, amber attention). The "i" pop-up goes; its lines are the
        status block at the top of Réglages (rule 10 amended: the gear and the help button stay in the header).
      - **Bottom bar**: Préparer · Carte · CR · Vols · **Météo** (Atmosphere gets its own tab: it is the richest
        screen and was hidden behind a second tap, "Où est passée la carte météo ?"); Réglages leaves the bar (the
        gear). Performance sheets stay a view of Préparer (Devis / Fiches); the Préparer popover on a second tap
        lists Carburant · Fiches, the principle "second tap = more buttons" is kept for every tab with several
        entries. Screen rail: unchanged order, Réglages kept at the end of the rail.
  15. *(Number reserved. The flight-zone edge rule is point 12 above; the journal of 25 October, the synthesis of
      24–27 October and the module DECISIONS of that day call it « rule 15 » (amended: edge drawn by default). The
      numbering is kept so that those references stay true.)*
  16. **Non-fixed modules on a phone (Carburant, CR, Vols)** (user's proposal, 25 Oct, 08:51, retained): the
      **header carries the module's title** ("Carburant et niveau") in place of the application's name, so the page
      loses its big title row; the **"Comment s'en servir" card keeps a ✕**: once dismissed it stays hidden on the
      device (it is redundant with the "?" of the header); the contextual help **opens at the paragraph of the current
      screen or step** and highlights it briefly.
      - **Done by the frame lot** (relay cloud, branch `v3-cadre-titre`; `frame/DECISIONS.md`, 25 Oct 2026): `meta.title` of the
        module fills `#fName` under 760 px (fixed modules, frame screens and screens keep the application's name) and the page's
        `h1` is clipped (kept for screen readers); the "How to use" card, drawn by the frame (`SogHelp.panel`), has a ✕ (per module,
        `device/help.json`) and the help chapter offers "Show the first steps again"; `ctx.helpAnchor` gives the "?" the anchor
        `#help?m=<id>&a=<anchor>`, the manual scrolls there and highlights the paragraph 1.5 s once (anchors added to the Fuel,
        Report and Flights chapters in four languages). Tests A2, A17, A18.
  17. **Map chrome under the sheet** (user, 25 Oct: "le double i, invisible. Masqué par le volet"): the map's own
      controls (MapLibre attribution, scale, any other "i") sit **above the sheet**, never under it: `map_base` offsets
      them by the sheet's height (the offset follows the sheet's position); one attribution control only.
      **Done** (maps lot `v3-maps-puces2`, 25 Oct): the second "i" was the attribution button stretched by the frame's global `summary`
      rule (44 px, its icon repeated, the chevron as a black bar): `map_base` resets it (24 px) and exports `setBottomInset(map, px)`,
      which Maps calls with the part of the map the sheet covers (`modules/maps/INTEGRATION.md` § 7); test D19.
  18. **Administration behind one button** (user: "tous les settings admin vont sur un bouton, comme celui des
      réglages de seuils"): Réglages › Administration is one card with one button per administrator page (map
      thresholds, flight-zone edge, future ones), nothing of the administrator's on the ordinary cards.
      **Done** (settings lot, branch `v3-settings-admin`, 25 Oct): the card is at the Full level, with the thresholds, the flight
      zone limit (`edge.show` of `airline/map_profiles.json`, read by the modules: `frame/settings/INTEGRATION.md` § 4, shown by
      default), the pilot-configuration export (moved from the Access card), the roadmap, the diagnostics, the benches and the
      V2 pages; test A12.
  19. **The sheet is rewritten from the fixed rules** (user: "il lui arrive de clignoter. C'est le signe qu'il faut
      totalement le reprendre, à partir des specs maintenant fixées. On repart d'une feuille vierge dès que prêt. Le
      résultat doit être le même qu'aujourd'hui fonctionnellement"): a clean rewrite of `frame/lib/sheet.js` and of the
      map's sheet code from rules 6–10 and § 11 of `frame/INTEGRATION.md`, same API, same tests and bench as the gate,
      after a diagnosis that says whether the flicker is the primitive's or the module's.
      **Done** (relay cloud, lot `v3-feuille-v2`, 25 Oct): the flicker was the Map's (MapLibre's own resize observer and four module
      observers redrawing at every frame of a drag, not the primitive's); primitive rewritten with the same contract, one resize after the
      release, D7's root cause fixed, D20 added; `frame/DECISIONS.md` and `modules/maps/DECISIONS.md` hold the measurements.
  20. **Zoom on the vertical drawings** (user, 25 Oct, 14:30: "Trouver le moyen de zoomer (pour être précis) le profil
      vertical"; the relay's reading, an ergonomics intent): the profile and the weather cut accept a **window on the distance
      axis**. On a phone: a pinch zooms around its centre, a two-finger drag pans, a double tap comes back to the whole flight;
      one finger stays the reading cursor (airspaces, weather point). On a screen: wheel with Ctrl zooms, drag pans, double
      click resets. The vertical axis refits to what is visible (that is where the precision comes from), axis labels, NM
      marks and point labels follow, the cursor keeps working in the window. The window is a reading convenience, kept for
      the life of the page only, never stored; a small "whole flight" affordance appears in the legend row while zoomed
      (rule 13: no new chip). The gesture is the same on both drawings: the window helper is written once (`modules/maps/lib`,
      next to `map_base`) and the cut receives the window through `drawSection` (Atmosphere session's contract); the lot
      starts with the profile and asks Atmosphere for the cut's option in `modules/maps/INTEGRATION.md`.
  21. **No surface-to-ceiling airspace in the vertical views** (user, 25 Oct, 00:35, after two iPhone shots of "n espaces sur
      ce point" where a R zone "800 ASFC|1800 ASFC" and ten CTL sectors without published limits were drawn SFC → UNL:
      "La règle, pour simplifier l'affichage, c'est « pas d'espace de la surface au plafond ». Ne pas afficher les SIV, FIR,
      dans le profil vertical."): the vertical profile and the "n espaces sur ce point" list never show an airspace that spans
      from the surface to the ceiling (SFC / GND to UNL, or limits that cannot be read and would amount to it); SIV, FIR, UIR
      and control sectors without published limits are left out of both whatever their limits; the map keeps its own
      per-type thresholds. ASFC / AGL heights are read as heights above the ground, never as "unknown"; an unreadable limit
      is never turned into UNL. One filter function for the profile and the list; the sheet's count is the count after
      filtering. Lot `v3-maps-asfc`.
      **Amended (relay, 26 Oct, after the user: "SIV FIR etc. C'était un workaround pour ne pas avoir de colonnes nonsense.
      Soit une coche active tout (FIR ?) soit ça n'a pas d'intérêt (si ces espaces ne varient que peu). Objectif ergonomie
      et infos pertinentes. À toi de trancher avec plusieurs cas d'usages et exemple (endroits simples, endroits chargés)")**:
      no checkbox. Use cases: (a) quiet countryside at FL100 near Poitiers — the vertical question is "what do I cross":
      CTA Poitiers FL115–FL145 and R 49 N1; the FIR and the SIV Poitiers are not volumes to cross but the service to call,
      useful as a name, never as a column; (b) Paris area, thirteen volumes and more — the graph is full, FIR / UIR / SIV
      would add three surface-to-ceiling columns and no information; (c) low-level VFR — the SIV is the information
      service to call, its name matters, its height does not. Decision: the graph and the profile never draw them (rule
      kept); the "n espaces sur ce point" sheet and the hover tooltip end with **one folded line "Aussi ici : FIR Paris ·
      SIV Poitiers · …"** (names only, no column, not counted in the title, folded by default, ×4); no setting. Lot
      `v3-maps-aussi-ici`.
      - **Done for the profile** (relay cloud, lot `v3-profil-zoom`, 25 Oct): `modules/maps/lib/axis_window.js` (the gesture, written once), a `window`
        option of `MapsProfile.draw` (the vertical axis refits to the window, the distance marks take a round step, `xOf` / `sOf` read the
        window so the cursor and the airspace reading are unchanged), the "Whole flight" text button in the legend row (no chip), the window
        kept for the page and reset with the route, never stored; manual of the Map x4, tests D21 to D24. The weather cut was left whole at
        that point: `drawSection` had no window option; the request (`o.window = { from, to }` in NM, what to filter, `geo.window` returned)
        is in `modules/maps/INTEGRATION.md` § 8.
      - **Done for the cut** (Atmosphere `d785ec7c6`, then the Map, lot `v3-maps-coupe-fenetre`, 25 Oct): `drawSection` takes the window; the Map
        keeps **one window per route** shared by the profile and the cut (zoom on one, switch with the chip, the same part of the flight on the
        other), "Whole flight" in front of both, the cut's legend read from `geo.strips` / `geo.layers`; tests D25, D25b.
      - **Done** (relay cloud, branch `v3-feuille-v2`, 25 Oct; `frame/DECISIONS.md` has the diagnosis and the numbers): the flicker was the
        Carte's, not the primitive's (48 of 50 `map.resize()` of a drag came from MapLibre's own `ResizeObserver`, four observers of the module
        redrew the overlay, the profile and the cut at every frame). `frame/lib/sheet.js` is written again with the same API, HTML, classes and
        tokens (one state, the position; a move carried by one CSS variable, a glide at the release, `onSettle` at the end of it and never during
        a move); the Carte's glue has one observer that only asks the sheet to settle and `map_base` creates MapLibre with `trackResize: false`;
        nothing of the map is redrawn while a finger holds the sheet (D20, bench "mouvement", E7).
      - **Done by the frame lot** (relay cloud, branch `v3-cadre-barre`; `frame/DECISIONS.md`, 24 Oct 2026): the bar is Préparer ·
        Carte · CR · Vols · Météo; the performance sheets are a view of the fuel module reached by `#fuel?view=sheets`, listed
        in Préparer's popover as Carburant · Fiches (`APP.tabs[].views`); the "?" and the ⚙ are in the phone header, the "i"
        button and its pop-up are gone (screen too); the ⚙ carries the badge; Settings opens on a "Status" block holding the
        pop-up's lines. The screen rail never had a Réglages entry (the ⚙ opens it): unchanged.
- **Shared code between maps and atmosphere** (relay, 24 Oct, after the atmosphere screen was rebuilt on the map's
  template with copies of its MapLibre base and its sheet): the map base (`loadMapLibre`, `startTiles`, `styleFor`,
  `mapSize`, plain background) goes to `modules/maps/lib/map_base.js`, owned by maps and imported by atmosphere like
  `render.js`; the three-position sheet becomes a frame primitive (`frame/lib/sheet.js`, rules in
  `frame/design/primitives.css`) since every fixed module needs it. Two lots (maps, frame); until then the copies stay,
  isolated and marked.

## 8. Decisions log

- 22 Oct 2026 — V3 decided: frame + modules + three applications (Pilot, CPCO, SOG client); the application and the
  desktop do not have the same goals. Agents reorganised by module. The "live mission map on the phone" and the
  "signed assignments (S3)" lots are paused: to be redone on the frame.
- 22 Oct 2026 — stand-alone mode: a local cache and a regular synchronisation with a visible control are required
  (today's direct reads of the git repository are too slow).
- 22 Oct 2026 — availability entry and mission assignment are to be redesigned for touch (list-based), not adapted.
- 22 Oct 2026 — **Disconnected mode ("mode déco") is the heart of the exchange system**: every device works on its
  own copy, exchange is decentralised (git, API, website). **Security is simplified** to stay accessible to
  newcomers: a token per device and a trigram; the signed-accounts chantier stops (S3, S4 cancelled; L0-L3, S1, S2
  stay merged, dormant, optional). Signed accounts are not a viable objective beyond three or four people.
- 22 Oct 2026 — **Order: the Pilot application first**, built from modules that are then optimised for the whole
  suite. Immediate targets: the interaction with the DEFA Virtual website, the pilot tools (fuel, flight level,
  flight log, live map — optimised and fast), and writing a report with as few clicks as possible, filling the DEFA
  side at the same time. Secondary target: the JavaScript modules as the UX/UI base of a PHP backend, to define with
  the existing website (access "at some point"); CPCO will adhere to the site but must keep working offline.
- 22 Oct 2026 — **Exchange**: git was attractive but is not convincing as it stands; a website / web-service backend
  is indispensable — but not for the disconnected mode. The exchange must be simple, with no triple keys: maybe git,
  but **never "at every click"** — writes are batched and synchronised explicitly or periodically, through a
  transport the data layer plugs in (git, web service, later the PHP site).
- 22 Oct 2026 — **Usages are what multiply complexity**: the suite is configured by a checklist of usages (several
  may be ticked, not one of them): **single user** (local only, nothing to synchronise); **single user, several
  devices** (my copies kept in step through one transport); **several users** (git data repository); **backend**
  (web service / PHP site). The data layer enables a transport per ticked usage; the interface shows only what the
  ticked usages need (synchronisation control, keys, access card). Nothing else differs between usages.
- 22 Oct 2026 — The mission registry already works locally and is enough to "play" a mission for oneself: V2 stays
  for that. The unreleased part of V2 is not considered stable; the new way of working starts now, on a `v3` branch.
- 22 Oct 2026 — One repository: `frame/` and `modules/<name>/`, each module with `SPEC.md`, `INTEGRATION.md`,
  `DECISIONS.md`; the data repository unchanged. One agent (Claude Desktop session) per module and per transverse
  block, reachable individually by the user; the ergonomics session keeps the global vision.
- 23 Oct 2026 — **V2 will be switched off progressively** (decided; the pace is not). Until then V2 pages live
  next to V3 on the same site and launcher.
- 23 Oct 2026 — **Aeronautical database generation: what is known, not decided.** Today the bases are generated by
  V2 only (reading `data/sia`, MORA, publication by zone, cycle and kind; aircraft base publication from Settings ›
  Maintenance). This is a workstation job and will probably need a "big" desktop client, unless something better is
  found. The only decision: failing better, at least that part of V2 is kept. `aerodb` only reads what is published.
- 23 Oct 2026 — **One aircraft registry in `aerodb`.** All aircraft data (ICAO types and performances, the pilot's
  performance sheets, the airline fleet with registrations and call signs, the anonymised reference, mission aircraft)
  are rationalised in `aerodb` at one place, fed globally, with one search over every source and the origin of each
  field. The registry is the master; the `.lnmperf` files are an **export kept in sync both ways**: one file per
  sheet, rewritten by the launcher whenever a sheet, the fleet or a completion (ChatGPT, EUROCONTROL, SimBrief) changes
  in the registry; and when a `.lnmperf` file changes on its side (edited in Little Navmap) its changes are merged
  into the registry, field by field, the most recent wins, the other value kept and reviewable, then re-exported.
  `fuel` keeps the screens and edits through the API; `website` feeds the fleet.
- 23 Oct 2026 — **Pilot access to a private data repository on GitHub.** A fine-grained token can only target
  repositories the token's owner owns (or an organisation's); an invited collaborator cannot create one for another
  user's private repository. Three ways, chosen at export from the repository owner's type: a user-owned repository →
  a classic token with the `repo` scope (dedicated GitHub account advised); an organisation-owned repository →
  fine-grained token scoped to that repository; later, sign-in without a token (OAuth / GitHub App) once a relay
  (the site's web service) exists. The onboarding wizard ("Join the airline") takes a pilot without any GitHub
  account by the hand, step by step.
- 23 Oct 2026 — **`develop` is the V3 line.** After 5.4.0 (last V2 release) the V3 work was squashed into one commit
  per block on `develop`; `v3` is the same line (sessions keep pushing there, `develop` fast-forwards). V2 fixes go to
  `v2-maintenance` (from `master`) and are carried over to `v3`.
- 24 Oct 2026 — **A weather cache layer is wanted** (user, after the question of the `labs/atmosphere` session): today
  in the client, as a frame cache shared by every reader of Open-Meteo (fuel's winds aloft, the atmosphere mock-up,
  maps later), tomorrow possibly in a relay server. **Local cache always.** To plan as a frame lot: one store
  `cache/weather/<model>/<grid cell>/<hour>` (policy `cache`, never synchronised), one reader API behind `ctx`
  (`ctx.weather.aloft(samples, when)`, `ctx.weather.metar(icao)`…) that answers from the cache first and calls
  Open-Meteo through `ctx.net` only for what is missing, with the model chosen by region as fuel does
  (`modules/fuel/winds.js` reused, not copied); **quota**: evaluate precisely how Open-Meteo counts (10,000 calls per
  day and per IP; a request with many locations or variables may weigh more than one call), count every call on the
  device (a visible counter in Settings › Diagnostics, per day), cap the samples per flight, and keep a safety margin;
  the relay server, when it exists, holds the shared cache and the count for the whole airline.

  **World view without credits** (relay decision, 24 Oct 2026, after the user: "si on zoom out la carte météo, on
  n'a pas les infos… sans cramer des crédits… users are dumb"): a device never calls Open-Meteo outside the flight
  grid, whatever the view. Outside the grid the map draws a **global synoptic file** built once per run by the
  repository workflow (standard-library Python in `tools/`, a job in `.github/workflows`) and published with the
  pages: MSL pressure, 10 m wind, cloud cover, 2 m temperature, every 3 h to +24 h, on a **15°** mesh (≈ 288
  points; ≈ 1 150 weighted calls a day over 4 runs, from the runner only); 10° only if the user asks. No extra
  button: the grip title says what is shown ("Synoptique monde · run 12Z · +6 h"), and the flight cut returns when
  the view comes back into the grid. Format specified by the atmosphere module and inherited by the frame/weather
  lot (§ 9.8). SIGMET and METAR (aviationweather.gov, no CORS) come only through the launcher relay, later.

  **Sources** (user, 24 Oct 2026, 15:50: "NOAA en background, openmeteo en one shoot par utilisateur"): the world
  file is built from **NOAA GFS** on the runner, with no quota. The GrADS / OpenDAP text endpoint first planned
  (`…/dods/gfs_1p00/…ascii?…`) **is retired**: checked from the atmosphere session on 24 Oct 2026, NOMADS answers
  "OpenDAP format has been retired" (NWS notice SCN 25-81). So the runner reads NOMADS' **GRIB filter**
  (`cgi-bin/filter_gfs_1p00.pl`: chosen variables and levels, latitudes −80…80) and decodes GRIB2 with
  `tools/grib2_lite.py` (standard library; GFS 1° uses complex packing with spatial differencing, template 5.3, ≈ 0.2 s
  a file). The workflow never calls Open-Meteo. **Open-Meteo is reserved to the device**: one shot per user, the "Charger"
  of the flight grid, counted on the device (§ 8 above).

  **frame/weather — the world synoptic, as built** (atmosphere lot, 24 Oct 2026, NOAA approved by the user the same
  day; the frame/weather lot inherits it unchanged): `/v3/weather/world/` on the pages, written by
  `tools/build_world_weather.py` from **NOAA GFS 1°** (NOMADS GRIB filter, no call quota; GRIB2 read by
  `tools/grib2_lite.py`) in the Pages workflow (step "Synoptique monde", `continue-on-error`; schedule
  `25 4,10,16,22 * * *`, which GitHub runs from the default branch only). A **5°** grid (2,376 places), every 3 h to
  **+72 h** (25 steps). Schema 1, the same for any source: `index.json` = `{ schema, model, run, built, step, lats,
  lons, times, files, units, source }`, one `YYYY-MM-DDTHH.json` per step = `{ schema, time, vars: { name: [lat × lon,
  from the south] } }`; variables `p t cc ws wd` (every source) and `ccl ccm cch cape frz trop js jd pr vis ps zs`
  (GFS); a second file per step, `YYYY-MM-DDTHH-alt.json` (`altFiles`, `levels`), carries 11 pressure levels (z, t, rh,
  ws, wd) so that the world is computed like the flight's grid at any altitude.
  The previous publication is republished while it comes from the latest run; NOMADS unreachable: its steps still
  ahead; never a failed deployment. On the device: same origin (`ctx.net`), `cache/weather/world/` (policy `cache`),
  only the steps shown are read. A launcher-served page has none until this lot gives one (relay or published host).
  Details: `modules/atmosphere/SPEC.md` § 4.

## 9. Plan — first application: Pilot (from 22 October 2026)

Branch `v3` (from `develop`), one commit per lot, each module in `modules/<name>/` with its three documents. Order:

1. **frame/data** — the data layer: local cache (IndexedDB), explicit and background synchronisation with a visible
   control, behind the launcher, the GitHub mode and the shells; the frame's navigation, levels, translation,
   notifications, designs taken from V2 as they are. *Agent: frame.*
2. **modules/report** — the mission report with as few clicks as possible: prefill from the last flight (IVAO,
   SimBrief, the website log), three steps, and "record the flight on the DEFA website" in the same gesture.
   *Agent: report.*
3. **modules/website** — the interaction with the DEFA Virtual website: what it exposes today (pages, forms), what
   the modules send and read, the bookmarklet, then the PHP backend when access is given. *Agent: website.*
4. **modules/fuel** — fuel and flight level (from `apps/planner/flight_planner.js`), performance sheets as a
   sub-module. *Agent: fuel.*
5. **modules/maps** — the live map: route, airspaces, vertical profile, optimised and fast on a phone (from the
   studio's rendering, re-cut). *Agent: maps.*
6. **modules/flightlog** — my flights (reports and website log). *Agent: flightlog.*
7. Transverse: **design** (tokens, density, day/night), **aerodb** (SIA and aircraft bases published by zone and
   cycle), **help** (tutorials and manuals per module), **settings** (identity, data access, caches). *One agent
   each.*
8. **frame/weather** — the weather cache layer (decision of 24 Oct, § 8): local cache, one reader API, quota counted
   and shown; later a relay server. *Agent: frame.*

The SOG client and CPCO applications come after, reusing the same modules; availability and assignment are
redesigned for touch at that point.

## 10. Open questions

1. PHP website: what it receives first (reports? flight logs?), and whether it becomes a data backend behind the data
   layer — to settle when the user has access to the site.
2. Which V2 pages stay reachable from the Pilot application during the transition (the full suite on the launcher).
3. **Designs (user, 23 Oct 2026): four designs are retained for V3 — `metro`, `swiss`, `cupertino` and `material` (Material 3);**
   `cabinet` goes, `field` may stay. Nothing skeuomorphic on a phone. **Amended 28 Oct 2026 (user): `aqua` is retained
   too, for computers only** (`html.f-desk`; not offered and not drawn on a phone or a tablet; textures on the frame's
   chrome, objects inside the modules later; frame/design/SPEC.md § 3). Point 2 below reads: the landmark is used by
   metro and aqua (aqua: one background panel per module). Mock-ups on branch `v3-metro`
   (`frame/design/demo_metro.html`, `frame/design/DECISIONS.md`). Points for the ergonomics session to decide:
   1. the page title written by the frame (the verb as `h1`), the modules dropping their own;
   2. `data-landmark` and `--sog-module*` (one landmark colour per module) in the integration contract, visible in
      every design or in metro only;
   3. the system bar (`theme-color`) following the header's real colour in every design;
   4. verb blocks in the phone drawer and a coloured rail on a screen (CSS only; more than seven verbs = a fifth row);
   5. the two title tokens `--sog-title-size` / `--sog-title-weight` kept (because `--sog-h1` also sizes figures);
   6. flat buttons and bottom-ruled fields: rules of the metro sheet, or tokens for every design
      (`--sog-btn-border`, `--sog-field-rule`);
   7. number tiles as colour blocks, or a left rule only (a coloured tile reads as a button);
   8. the exact hues of the landmark colours (Report is a dark orange so that white text keeps 4.5:1);
   9. a web font or not: Segoe UI Light (metro), Inter (swiss) and SF (cupertino) are not available everywhere;
      the mock-ups use system fonts, which keeps the offline shell light; a bundled font costs 250 to 300 KB;
   10. the map's canvas colours, still hard-coded in `modules/maps`, to be taken from the tokens by the maps agent.
   11. Cupertino's system blue fails 4.5:1 as text on the page and with white on it (day 3.6 / 4.0, night 3.8 on a
       field): keep Apple's hex and accept it, or take `#0066cc` by day and black ink on the night blue (both pass);
   12. Swiss: cards as a black top rule without a box (the mock-up) or a hairline box; the night red is lighter than the
       day red and carries black ink (no red passes both ways on near-black);
   13. the rules written twice or three times across metro, swiss and cupertino (header buttons without frame, `h3`
       as small muted capitals, pane `h1` size, table header, outlined buttons, card border, nav on the page colour):
       promote to tokens (`--sog-btn-border`, `--sog-card-border`…) or primitives, see `frame/design/DECISIONS.md`.
   14. **Flight date (user, 24 Oct: "prévoir un slider « date du vol » pour ajouter x heures à la planification (et
       la carto)")**: the slider shipped in atmosphere (0 to +72 h, in the sheet) moves the cut and the synoptic only.
       The planned departure time should live in the shared flight record (`current_flight.json`, fuel § 4) so that
       the quote's winds, the ETA on the map and the weather all follow one value: a fuel lot ("flight date" in the
       quote, written to the record), then atmosphere reads it as its slider's origin. Decided by the relay (24 Oct) and delivered in fuel (`current_flight.planned_at`, one value: the quote's
       weather, the Map's ETA for a flight that is not started); atmosphere's session reads `planned_at` as its slider's origin
       (fuel INTEGRATION § 3).
   15. **Routes, airways and procedures** (user, 25 Oct: "trouver un moyen (regarder dans la V2) de récupérer les
       routes. Idéalement, un bouton « auto » à la saisie, pour inscrire les AWY (vérifier plafond/plancher). Mais
       surtout, comment ajouter les traces des STAR/SID/APPR"): an exploration of what V2 (studio, planner, SIA base)
       already holds (airway segments with floors and ceilings, procedure traces) precedes the lot: an "auto" button in
       the route field that writes the airways between two points at the planned level, and the SID / STAR / approach
       traces on the map when the base publishes them.
   16. **Settings lost after a Safari relaunch** (user, 25 Oct: "les settings ont tous sauté cette nuit sur les clefs
       avwx et github. A priori relance de Safari. En revanche, RBR et IVAO sont restés"): to diagnose from the code
       (where each setting is stored: the keys and token may live in a store that Safari clears) and decide with the
       user whether the keys persist like the identity.
       **Done** (settings lot, 25 Oct): cause — the token and the avwx key were in `localStorage`, the identity in IndexedDB,
       and Safari kept the second while clearing the first (nothing in the code erases anything); decision of the relay —
       the keys persist like the identity, in `device/keys.json`, never synchronised nor in a backup; test A19; written up in
       `frame/settings/DECISIONS.md`.
   17. **Procedures through aerodb; pypdf on the workstation; a PDF reader in the application** (user, 25 Oct: "On est
       d'accord que c'est via aerodb que tu récupères les data ? Donc on parle de consolidation uniquement. Step 1 :
       simbrief. Step 2 : zip. Step 3 en // eurocontrol. Step 4 : us et reste du monde."; then, on the PDF extraction of
       the eAIP coding tables: "Pypdf sur le poste. 1 lecteur pdf, à prévoir pour l'appli (liens vers cartes VAC)"):
       SID / STAR / approach data enter the suite only through aerodb (one schema, one API, a published base per cycle);
       the eAIP "DATA … CODE" tables are read on the workstation with **pypdf, a declared optional dependency of the
       builder tools** (the only exception to "standard library only"; never the launcher, never the page); the
       application gets a **PDF reader of its own** for the links to the VAC charts (and the eAIP pages) — a frame
       primitive or an aerodb view, to specify. Lot in progress: session `v3-aerodb-proc`.
   18. **A V3 page to regenerate the data, without V2** (user, 26 Oct: "Envisager une page dédiée régénération des
       données, sans passer par la v2 (récupérer fichiers en cache local, compiler, pousser, nettoyer)"): one screen behind
       Administration (settings owns the card, aerodb owns the builders) listing every source (SIA zip / eAIP per cycle,
       VAC extracts, airways, FAA CIFP, world weather…) with its state (cycle, fetched into the local cache, compiled,
       published, stale) and four buttons per source or for all: **fetch** (into the workstation's cache), **compile**
       (the builders, standard library + optional pypdf, through the launcher), **push** (the data repository), **clean**
       (old cycles); nothing by hand, the page chains and shows the progress; the V2 maintenance pages become a fallback,
       then go. Open: which steps can run without the launcher (in-browser parsers such as `shared/sia_base.js` versus
       the Python builders). To specify by aerodb + settings before a lot.
       **Specified** (relay of the cloud, 26 Oct): see `docs/technique/V3_DONNEES_REGENERATION.md` (inventory of the 17 sources and of
       their chains, the screen `#data`, the launcher routes, what runs without the launcher, nine lots).
   19. **A dedicated data application (iOS, Android)** (user, 26 Oct: "L'appli est en bonne voie. On peut imaginer une
       appli dédiée au parsing et à la compilation de toutes ces données : iOS, android. Chantier dédié."): a separate
       project — an application of the suite, "Données", on the frame, whose only job is fetching, parsing, compiling
       and publishing the aeronautical data from a phone or tablet. Implications to study first: builders in JavaScript
       (no Python on a phone), the SIA zip read in the browser (streams, memory), publication by the GitHub API with the
       device's token, the same Capacitor pipeline as Pilot. No lot now; a project file (`docs/technique/
       V3_APP_DONNEES.md`) when the user opens the project. § 10.18 is its first step on the workstation.
       **Specified** (relay of the cloud, 26 Oct): see `docs/technique/V3_APP_DONNEES.md` (project file: implications, measurements, architecture,
       questions; still no lot until the user's go).
   20. **Runway, SID, STAR and approach chosen in the preparation; traces drawn; changed en route** (user, 28 Oct:
       "maintenant qu'on sait lire star et sid, on choisit la rwy, la star, la sid, l'approche dans les phases de planif. on
       affiche le tracé sid/star, avec les altitudes / vitesse. L'approche se modifie en cours de route (le départ aussi)
       même si on a démarré le vol. trouver un mécanisme pour récupérer les infos à la demande (et les stocker !)"):
       decided by the ergonomics session the same day, target written as rules, lots cut per owner.
       - **One record, one writer per field.** `current_flight.json` `route.procedures` becomes `{ dep: { rwy, sid, trans },
         arr: { rwy, star, trans, app, appTrans }, by, at }` (identifiers of the common schema of aerodb § 5 quinquies,
         `null` for "none"); Fuel writes it; the Map reads it; an OFP prefill proposes values that the pilot keeps or changes.
       - **Where the pilot chooses.** In Fuel's step *Route* (user, 29 Oct: "star et sid sont « route », pas « vol »";
         first delivered in step *Vol*, moved the same day), a card at the end of the step after the route text, the
         points and the OFP line: two short rows "Départ : piste · SID ·
         transition" and "Arrivée : piste · STAR · transition · approche", each a `select` filled by
         `aerodb.procedures(icao)`; a runway filters the lists; a choice without data says "aucune procédure publiée"
         and offers the on-demand reading (below). The quote counts the procedure's length and its constraints (climb /
         descent steps) when known; without them, as today.
       - **Changed en route.** Fuel's step *Départ* (and the Map's aerodrome card) keep the arrival row editable after
         "Démarrer le vol": the approach, the STAR and the arrival runway may change at any time, the departure too
         (challenge of 29 Oct: no lock at all after the start, the `depPassed` guard is removed; another departure is a
         new departure, as the amendment below says); a change rewrites `route.procedures` with `by: 'fuel'` and a fresh
         `updated_at`; the Map redraws, the ETA is derived again, the quote is **not** redone after the start (the remaining
         fuel is the frame's / fuel's progress). **Amended (28 Oct, evening, after Fuel's delivery)**: nothing of the Plan is
         locked after the start (today's behaviour stays: another departure resets the start, another arrival is the
         diversion by hand, level, date, aircraft, route, wind and ISA stay editable); the start is only the reference
         time. The altitude constraints of the procedures do not enter the fuel figures (the quote counts the
         procedures' length; the constraints live in `profile.path`, drawn by the Map); a constrained climb / descent
         model in `model.js` is a later lot if the user wants it.
         **On-demand reading by State (user, 28 Oct evening, "bug sur les AD français, pourtant prioritaires")**: the
         gesture "Lire les procédures de LFXX" dispatches by the aerodrome's State: France (LF) reads the SIA eAIP coding
         tables (`tools/proc_sia.py`, free, no credentials, AIRAC folder derived from the cycle in force), the States with
         EAD coding tables read EAD Basic, a State without tables answers "aucune table publiée pour cet État" and offers
         Little Navmap when present; never "mise en page inconnue" for France. Lot: aerodb (`regen_jobs` verb
         `proc/eaip-fetch`, `fetchProcedures` dispatch), fuel (texts ×4).
       - **What the Map draws.** The chosen SID, STAR and approach as the procedure trace (today's purple line), from the
         runway's threshold (SID) to the first en-route fix, and from the last en-route fix to the runway (STAR, approach);
         (hues, user 29 Oct "des couleurs de contraste autres que violet (vert ? orange ? bleu ?)": SID green, STAR
         orange, approach and missed approach sky blue, day and night shades, constraints and point names in the
         procedure's hue; painted at the route's level so the airway cartouches the path follows stay on top);
         every point of the trace with its altitude constraint ("at / min / max / between", formatted by `formatLevel`) and
         its speed limit ("≤ 220 kt") in a close view (300 px per degree and more), in the AIP notation; transitions and the
         missed approach dashed; the vertical profile shows the constraints as steps on the planned path (the climb and
         descent follow them when they are tighter than the aircraft's rates). Procedures not chosen are not drawn; the
         Layers content has no toggle for them.
       - **On demand, and stored.** `aerodb.procedures(icao)` answers from what the device holds (published cycle,
         `proc/manual/`, `proc-seen/`). When an aerodrome has nothing, the screen offers one gesture per aerodrome,
         "Lire les procédures de LFXX": with a launcher, the frame runs the workstation job (`ctx.launcher.job('ead/fetch',
         { icao })`, EAD Basic read by hand, one aerodrome per gesture, § 10.17 and `EAD_BASIC.md` § 1), the result is
         installed under `proc/manual/` and committed to the private data repository, then synchronised to every device;
         without a launcher, the gesture says so and proposes the OFP (SimBrief) as the per-flight source. Nothing is
         fetched silently, nothing is read twice: an aerodrome read once is stored for everyone.
         **Read again (user, 29 Oct: "il manque un bouton “rafraîchir” les procédures (avec une date pour le dernier
         fichier)")**: a side whose aerodrome has a file shows the file's date before a short button "Relire" ("lu le
         28/10 18:01", ⌛ when the cycle is older than the one in force), same gesture `fetchProcedures`, which accepts an
         aerodrome already read and replaces its file (same source only); the Map's aerodrome card shows the same date in
         its coverage line; the date is `coverage(icao).read_at` (ISO 8601 UTC, the last reading of the aerodrome's file,
         `null` before the first reading under this rule: then no date, the button alone) and each record from
         `proc/manual/` carries `source.read_at`; an EAD reading replaces the previous EAD records like the eAIP one does.
         "Lire les procédures de LFXX" stays the gesture of a side without data.
       - **Lots** (owners): aerodb — `procedures()` serving runways and transitions, the `ead/fetch` job (D10 of the Data
         module brought forward), `proc/manual/` code; fuel — the two rows of step Route, the arrival row of step Départ, the
         quote with constraints, `route.procedures` v2 (INTEGRATION § 3); maps — the traces with constraints and the
         profile steps; help ×4 and tests per lot. The Map and Fuel lots start after the aerodb lot publishes its API.
       **aerodb status (28 Oct 2026)**: commit 1 (`c0027f4ad`, pushed) = the API (`procedures()` with runways, transitions and phases, `runways()`,
       `proc/manual/`, the contract of `fetchProcedures`); commit 2 = `fetchProcedures` wired, through the launcher job `proc/ead-fetch` of the
       route `regen/job` (the job is named so, not `ead/fetch`). The dispatch by State of the "On-demand reading by State" paragraph above is wired (28 Oct evening): `LF` reads the SIA eAIP through the job `proc/eaip-fetch`, a State readable in EAD Basic keeps `proc/ead-fetch`, any other answers `no-tables` (with a Little Navmap hint from the status `lnm`), and `unknown-layout` no longer exists.
       **Refinements (ergonomics session, 28 Oct evening, after the Map session's reading)**: the Map never writes
       `route.procedures` (its aerodrome card shows the choice and a "Changer" button to `#fuel?focus=arr`); aerodb adds
       `runways(icao)` (threshold, elevation, QFU, displaced threshold), `arc { centre, radius }` on RF legs when the source
       gives it, `phase` ∈ main | trans | missed on every leg, and states per source what it provides; a leg without a
       position (VA, CA, VM, FM) is drawn as a 2 NM stroke along its course then dashes to the next point, never an invented
       point; constraints keep aerodb's form (`alt { type, ft, ft2 }`, `kt`) and the AIP notation on the map (underlined =
       at or above, overlined = at or below, both = at, "5000–7000" = between, "≤ 220 kt"); when the SID's last point (or its
       transition's) is a route point, the leg aerodrome → that point is drawn by the SID alone, else the SID to its end
       then a dashed direct to the first en-route point, symmetric at the arrival; **one expanded path** "route +
       procedures" (`frame/lib/current_flight.js` `expandedPath(flight, procs)`, points tagged route | sid | star | app |
       missed) is the single basis of the profile, the NM marks, the cursor, `etaOf` / `plannedPositionAt` and Fuel's
       quote (`quote.legs` covers every point); Fuel computes and writes `profile.path [{ nm, ft }]`, the planned
       vertical path under the constraints, and the Map draws it (its own computation only as a fallback); a record with
       the old `route.procedures { sid, star }` is migrated to v2 by Fuel at read, the Map reads v2 only; constraints and
       speeds are labelled in a close view only (300 px per degree), reserved after the route's labels.
       **Second refinement (after Fuel's reading, same evening)**: after the start, a change of STAR, approach or runway
       rewrites only `quote.legs`, `profile.path` and the length (same wind and level model, `quote.legsAt` marked); the
       fuel figures (block, offload, reserves, `quote.at`) do not move, so the ETA and the remaining distance follow; the
       departure may change while the first en-route point (the end of the SID in the expanded path) is not passed,
       judged on `progress.actual` when younger than two minutes, else on `plannedPositionAt`. The Map never writes
       `route.procedures`, not even in Edit mode: Fuel sets to `null` the side whose aerodrome no longer matches
       `route.dep` / `route.arr` at its next write, and readers check the aerodrome. Migration of the old `{ sid, star }`
       record: a pure helper `proceduresOf(flight)` of `frame/lib/current_flight.js` returns the v2 view, every reader
       uses it, Fuel writes v2 at its next ordinary write (nothing written at mount); aerodb finds an OFP procedure by its
       identifier (`proc-seen/`, status `ofp`). `null` = "none", chosen by the pilot; absent = not chosen yet, which the OFP
       may fill; "Charger mon OFP" fills only the sides the pilot has not chosen and says what it filled (challenge of
       29 Oct: the OFP proposes, it never replaces a pilot's choice). The on-demand reading is
       `aerodb.fetchProcedures(icao, { onProgress, signal })`, which wraps the launcher job and refuses with a reason
       without a launcher or on a paired device: Fuel declares no launcher route; `EAD_BASIC.md` § 1 is amended: the
       gesture lives in Fuel (and later in the Data module), not in Settings › Maintenance. `expandedPath` joins the
       procedure to the route on the first common point and never adds a leg twice (an OFP route often already carries
       the SID / STAR points). `route.procedures.at` is the choice's time; `merge` sets `updated_at` on the record.
   21. **MSFS 2020 / 2024 and Little Navmap data** (user, 28 Oct: "dans la foulée, on ajoute le support msfs2024 et
       msfs2020. ils sont tous deux installés ici en local, et ont sans doute des données également. littlenavmap a sans
       doute des données aussi (navigraph ?)"): decided by the ergonomics session. **Position**: Little Navmap's web API
       (`/api/sim/info`, port 8965) already gives the position of any simulator it is connected to, MSFS included; no
       direct SimConnect (not standard-library Python). **Procedures**: the main local fallback becomes **Little Navmap's
       SQLite databases** (`%APPDATA%\ABarthel\little_navmap_db\little_navmap_<navigraph|xp12|msfs|msfs24>.sqlite`; on
       the user's workstation the Navigraph one holds 268 MB of worldwide procedures with legs, the MSFS ones are empty
       until the MSFS scenery is loaded in Little Navmap), read by `tools/proc_lnm.py` (standard-library `sqlite3`, read
       only) into `proc/local/` with status `lnm` (same lowest rank as `xplane`), `source { kind: 'lnm', db, cycle }`,
       **local only, never synchronised nor published** (Navigraph and Microsoft / Asobo licences are personal); one
       aerodrome per gesture, `--all` on the workstation; the X-Plane CIFP converter comes second, only where Little
       Navmap is absent. The catalogue lists MSFS 2020, MSFS 2024 and Little Navmap as local sources; `LICENSE.md` § 5
       gets their rows. Lots: survey session (reader, tests on a synthetic database), aerodb (status `lnm`, labels,
       catalogue, licence rows), position check in `tools/sim_position.py`.
   22. **Coverage map of the procedures** (user, 28 Oct evening: "il faut, du coup, une carte des ADs connus, et/ou des
       zones vertes, orange, rouges"): ergonomics session; the Map's side is built (maps SPEC § 6.11). On the Map, a layer
       **"Couverture"** (renamed by the challenge of 29 Oct, since § 10.20 says the procedures themselves have no
       toggle; off by default, lit only by the user's box, the automatic lighting of D46–D49 is removed: a hidden state
       that ran in the draw loop) colours the aerodrome pins by what the device can give: **green** =
       procedures held (official or check, from the published cycle, `proc/manual/` or `proc/local/`), **orange** =
       readable on demand (France by the SIA, a State with EAD coding tables; Little Navmap counts only once
       `tools/proc_lnm.py` exists, § 10.21: until then no orange for it), **red** = nothing (image-only or prose States, nothing local); one legend line through the "i" chip;
       aerodb gives `coverage(icao)` → green | orange | red with its reason, and `coverageByState()` for the Data
       module, which shows the same three colours per State in its Procédures group (the EAD table § 8.1 as data). No
       new screen: the Map and the Data module carry it. Lots: aerodb (coverage API), maps (layer and pins), data module
       (State list).
       **Status (28 Oct, late)**: aerodb done (`coverage(icao)`, `coverageByState()`, `AeroCatalogue.COVERAGE`:
       frame/aerodb/SPEC.md § 5, INTEGRATION « Coverage of the procedures »); the Map's layer done (maps SPEC § 6.11,
       `modules/maps/coverage.js`, cases D45 to D50); the Data module's State list still to code (with the module).
   23. **Procedure lists: outdated and conflicting marked, never hidden; choosing on the Map** (user, 29 Oct morning;
       rewritten by the challenge of 29 Oct — the first version, in the history before this commit, specified a mode of
       two screens for what is a `select`).
       - **Two markers, one meaning each, everywhere** (Fuel's lists, the Map's labels, aerodrome card and legend, later
         the Data module): **⌛ grey** = outdated (read under an earlier cycle), **⚠ orange** = does not serve the chosen
         runway (the only conflict: STAR → approach continuity is never one, the Map joins with a dashed direct). Never
         the word; the symbol carries the meaning, the colour accompanies it, the reason is the option's `title`.
         **No notification for a conflict** (challenge: a third channel for the same fact).
       - **Conflict is marked, not forbidden.** Lists are never pruned by the runway; a procedure that serves one runway
         sets it when none is chosen. One tri-state per field: `null` = "Aucune" chosen, absent = not chosen (the OFP
         may fill), and one spelling of it in the `select` ("—" / "aucune"), in the record and in an address (`none`).
       - **Lists stay short, compatible first.** Flat lists, the entries compatible with the current choice first then
         the ⚠ ones, each group by runway then name; runways served by the chosen SID or approach first in the runway
         list; the runway in the label only when the procedure serves exactly one. ⌛ then ⚠ close the label.
       - **One rule, one pure module.** `frame/lib/procedures.js` holds every rule on the records, without any module
         state: `conflictsOf`, `orderProcedures`, `dedupProcs`, `runwayChoices`, `appChoices` (an approach given by entry
         listed once, its transitions = the records ending on its first point), `servesRwy`, `nameOf`; Fuel and the Map
         call it and only display; `current_flight.js` `loadProcedures` applies `dedupProcs` so the two modules see the
         same records (the challenge found Fuel alone deduplicating). Tested on a bench without a browser.
       - **One secondary line per side.** Under the selects, one muted line "lu le 28/10 18:01 ⌛ · Relire · Source · 3
         non lues" (the parts present only), never more; "Lire les procédures de LFXX" and "Relire" are the same gesture
         and the same code path, the label alone changes. "Sur la carte" is one button in the side's title.
       - **Choosing on the Map, simplified**: from a side's title, "Sur la carte" opens `#maps?choose=arr&icao=LFPO`
         (the Map mounts as main, the pane closes, no frame change): the view fits the aerodrome's procedures, the base
         map and the Map's own layers dimmed, runway chips as a filter (≤ 7), **one family at a time** in the order the
         side needs (runway, SID or STAR, then approach), every published procedure of that family drawn with one hue
         per procedure (user: "une dizaine d'approches méritera plusieurs couleurs"; eight hues cycled, the same on the
         list row, the cartouche and the trace; ⌛ greys), one cartouche per exit / entry point stacking the names,
         transitions only for the highlighted one; a list ≤ 7 rows then scroll, "Aucune" first. **One tap on a trace or
         a row chooses it**: the Map does `location.replace('#fuel?focus=arr&star=ID')` (one key per trip, the names of
         `route.procedures` v2, `none` for "Aucune"), Fuel consumes the key at mount (`ctx.consume`, § 15 of
         INTEGRATION when the frame delivers it, else `history.replaceState`), writes, says what changed and shows the
         next family's "Sur la carte". No "Valider", no steps, no accumulation: one trip per choice, each trip short.
         Outside the mode the chosen procedures keep their family hue (SID green, STAR orange, approach sky blue).
       - **Delivered (29 Oct night)**: the Map's choose mode (5b713f77e: `#maps?choose=dep|arr&icao=` read by
         `ctx.consume`, one family per opening — the first not chosen —, eight hues `MapsRender.palette().procHues`,
         one cartouche per exit / entry point, transitions of the highlighted one only, every runway as an arrow with
         the chosen one bold, runway chips ≤ 7, "Aucune" first then seven rows and scroll, return by
         `location.replace('#fuel?focus=<side>&<key>=<id|none>')`, never a doubtful or nameless record; ✕ and
         Escape in the sheet also leave the mode); Fuel's markers, flat lists, secondary line and key consumption
         (3c98b564b, aa74300b4); the "Sur la carte" button and the proposal applied with the address rule (d4f683475).
         **§ 10.23 is delivered in full.**
   24. **The chosen runway drawn as an arrow** (user, 29 Oct: "un vecteur sur la carte indiquant la piste (direction
       matérialisée par une flèche)"): when `route.procedures` names a runway, the Map draws it from the landing
       threshold (`runways(icao)`) along the true QFU over the runway's length, head in the direction of use (far end
       for a departure, threshold for an arrival), name at the threshold, the side's family hue, visible from the
       aerodrome view (about 60 px per NM). In the choose mode's runway family every runway is drawn so, the chosen one
       bold. **Delivered** (949f7cbd7). **The ILS / DME aids are deferred** (challenge: a join in aerodb for a label the approach's name already
       gives); `runways(icao)` stays as delivered. Lot: maps (cases D), after § 10.29.
   25. **"Source": the coded page of a procedure, one tap away** (user, 29 Oct): on the secondary line of a side and in
       the Map's aerodrome card, a link "Source" opens in a new tab the public address of the record's page: eAIP =
       `charts.base + Cartes/<ICAO>/<file>`; a record of another source (EAD, OCR, manual) has no link, its document's
       name in the line's `title`. **No launcher route** (challenge: a third target and a route to audit for a page the
       SIA serves to everyone; the local copies stay where they are, `data/local/eaip/<date>/`). aerodb adds
       `source.file` to every record read from a document. **Delivered (29–30 Oct night)**: aerodb `source.file` and
       `source.url` bounded to the SIA host (d88463e51, 97bf5577f), Fuel's link (c540c3efd), the Map's card link (f7bad9970).
   26. **The part not read: doubtful never shown as good, counted** (user, 29 Oct, LFPG "star sans nom 27"): one
       **geometry check** (`tools/proc_geometry.py`, § 10.29), one definition for every reader (eAIP, EAD, OCR, manual):
       printed course and distance against the recalculated ones with a tolerance chosen by what the source prints, a
       repeated point outside a holding, a zigzag (more than three times the direct), a nameless record. A record that
       fails is kept in the file with `status: 'doubt'` and its reason as a **code** (`name`, `repeat`, `zigzag`,
       `geometry`, `unread`), served only with `{ doubt: true }`, counted in `stats.doubt`; the reader never refuses a
       whole aerodrome for one record (EAD did). Pages not read are `formats[].ok: false` with a reason code (`layout`,
       `low-read`, `title`, `no-legs`); **codes, never phrases**: the modules translate them (`AeroCatalogue`, like
       `COVERAGE`). The coverage turns orange with the reason `partial` when an aerodrome has such pages or records.
       Fuel shows "N non lues" on the secondary line with the "Source" link. Fallback by source stays as § 10.21.
       **Delivered (29–30 Oct night)**: one geometry check `tools/proc_geometry.py` (72ca8b2fa), `doubt` with codes
       (fe04ed8b8, bf540e3c2), `partial` (567b94440, e74d02ef7), Fuel's line (aa74300b4).
       **"Lire avec ChatGPT" is dropped** (challenge: a fifth write path into `proc/manual/` for a layout the reader
       should learn; a new layout is a reader fix with its fixture). Lots: aerodb (codes, `partial`, cases K), after
       § 10.29.
   27. **The aerodrome's name wherever its code is, and progressive completion** (user, 29 Oct: "ajouter le nom (et
       détails) de l'AD. par ex : « Départ LFPO Paris-Orly ». Idem sur l'onglet « départ », rappeler le nom complet de
       l'AD. sur l'onglet 1, dès qu'on a choisi un AD, afficher dans un champ de texte fixe (pour ne pas resize tout le
       temps) le nom de l'AD pour vérif. J'aimerai aussi une complétion progressive"): Fuel, decided by the ergonomics
       session. The procedure rows are titled "Départ LFPO Paris-Orly" (the city when the name lacks it, the elevation),
       at steps Route and Départ; step Départ names both aerodromes in full; at step Vol, under the three code fields,
       one fixed read-only line per field ("LFPO — Paris-Orly", reserved height so nothing moves, ellipsis, "inconnu"
       for a code without a match); **progressive completion** on the three fields from two characters, by code or by
       name, through `aerodb.find`, aerodromes only, at most seven suggestions, keyboard ↑ ↓ Entrée Échap and touch, a
       list laid over the page (never the native `datalist`), closed on blur. Lot: fuel (cases F), help ×4.
       **The field is a search, not the code (ergonomics session, 30 Oct night; delivered 26d47f149)**: no
       `maxlength`; while typing, `route.dep` / `arr` / `altn` only takes a four-character code known to aerodb or a
       suggestion chosen in the list, and emptying the field to search writes nothing; on leaving the field: empty →
       the aerodrome is removed, an unknown code that proposed nothing → written (an aerodrome typed on purpose, off the
       base), any other text (a name, "orly" that proposed) → back to the recorded code. The name line reads the field.
   28. **Backlog of 29 Oct (planned, deliberately not specified yet)** — the user's requests of the morning, kept as one
       line each until the challenge pass of 29 Oct 17:00 decides what is built and in which order; a request is specified
       only when its lot starts, never before (the challenge found the specification running ahead of the code).
       - **Direct to a point on ATC instruction**: search a point (a procedure point, an RNAV fix), fly direct to it and
         rewrite the rest of the flight.
       - **Turn radius on the traces**: a turn of more than 90° on a SID, STAR or approach is drawn with a radius from the
         indicated speed (OPAL2E RW07 at LFPO).
       - **FPL route text with runway and procedures**: read and write `LFPO/07 OPAL2E OPALE DCT KUNAV T421 DIDZA N14
         OKSAW DCT LANON DCT ABLIN DCT EIDW` as soon as the runway and the SID are chosen.
       - **Runway in use, or probable**: from the departure and arrival METAR at preparation time.
       - **Active VATSIM / IVAO controllers on the Map**: both networks publish them (VATSIM data v3 with the launcher's
         relay, IVAO Whazzup directly); one hue per network, dark green and brown, under the airspaces' weight.
       - **IVAO on the phone through the relay** (user, 30 Oct night: "Qu'on ne puisse pas récupérer un tracker IVAO
         sur téléphone est gênant. Avec l'appli ça marcherait mieux ?"; checked in IVAO's API spec the same night): a
         native app changes nothing, the consumer key cannot live on a device; IVAO's tracker accepts either the
         consumer key or an OpenID user token (scope `tracker`), and the code exchange needs a client secret, so the
         relay (§ 10.28, R1) does the OpenID exchange with the suite's IVAO client and hands the pilot their own token;
         the phone then reads the tracker directly (CORS ok); the public whazzup feed stays for live positions. With
         GitLab for the data, this and the VATSIM allow-list are what the relay is for. Lot: frame (relay R1 + IVAO
         login), report (last flight with the user's token), after G2.
       - **Flight plan export to the simulators** (user, 29 Oct night: "Prévoir un export .fms à minima (deux formats
         pour xplane), voire le pousser direct dans le dossier ad hoc sur X-Plane. Prévoir un export msfs2024/2020"):
         from Fuel, the expanded path (route + procedures, § 10.20) written as X-Plane `.fms` in both formats (version 3
         "I 3 version" for X-Plane 10/11 and version 1100 for X-Plane 11/12, with airways and procedure names when the
         format carries them) and as MSFS `.pln` (2020 and 2024); download in the browser everywhere; on the workstation
         with a launcher, "Envoyer à X-Plane" writes the file into `Output/FMS plans/` of the X-Plane folder known to the
         launcher (a verb of a `sim` set, workstation only, name from the flight, never overwrites without saying so).
         Pure writers in `frame/lib/fms.js` with benches on the suite's test flight; lot fuel + frame after Source and
         § 10.27.
         **Delivered 99d28acd0 (30 Oct night)**: the download in both `.fms` formats and `.pln`, pure writers
         `toFmsV3`, `toFms1100`, `toPln`, `fileName`, `exportOf`, `airacOf` (CR LF, numbers with a point, AIRAC cycle
         from the sheets or the date), bench `frame/lib/test/fms.html` (34 checks), card "Plan de vol pour le
         simulateur" at step Départ with three 44 px buttons greyed under two placed points, cases F60 and F61.
         "Envoyer à X-Plane" (launcher verb) is not delivered. Doubts recorded in Fuel's DECISIONS: MSFS 2024
         AppVersion assumed, the 1100 approach name sanitised (ILSZRWY25L against I25L in X-Plane's navdata), the
         download after an aerodb wait on Safari, nothing tried in a simulator yet: the user's group tests decide.
         Security verdict: acceptable (file name reduced to the codes, `.pln` escaped, `.fms` identifiers without
         blanks); one note, `escText` to strip the control characters XML 1.0 forbids.
       - **Warning when the flight date is in the past** (user, 29 Oct night): one line at step Vol and on the plan
         ("Vol daté du 26/10, dans le passé : météo et NOTAM ne valent plus"), never blocking; tiny lot fuel.
       - **AIP Ireland as the official source for Irish airspaces** (user, 29 Oct evening, Dublin: openAIP codes the CTA
         sectors 3 to 6 without their inner hole, so five sectors answer at one point): ENR 2.1 / AD 2.17 read like the
         SIA for France; until then the build stats flag overlapping sectors of one family and the point sheet says it.
       - **Onboarding of a pilot through a relay on the NAS** (user, 29 Oct evening: "le chemin d'onboarding d'un
         utilisateur. Actuellement ça ne semble pas trivial. la clef à grain fin n'est pas simple à produire… est-ce qu'un
         synologydrive pourrait répondre ?"; feasibility note by the frame session, decided): the **next priority after
         the refactoring of § 10.29**. The launcher runs on the NAS (Container Manager) in a **relay mode** and serves the
         Pilot application itself (same origin, the launcher transport unchanged): it alone holds the git secret; the
         administrator creates the user (the signed registry's per-user keys) and sends an invitation link
         (`#settings?join=`); the pilot opens it on any device, types the code once, never sees GitHub nor a token.
         To write: the LAN pairing extended to the Internet with long, revocable device tokens per user, only the Pilot
         application's routes exposed (the route table with its public, frame lot 3c, is the base), the commit author
         taken from the user's key, an invitations page; HTTPS through DSM's reverse proxy with Let's Encrypt, never
         the bare launcher; attempt limits; a full security review before any exposure. Two to three frame lots.
         Rejected: a WebDAV / NAS transport (no atomic multi-file commit, no merge, NAS passwords in the browser) and
         Synology Drive file sync (destroyed `data/.git` once, no tablet nor site). The GitHub token stays the advanced
         user's path, not the default onboarding.
         **Cut (frame session, 29 Oct night, approved)**: R1 — `launch.py --relay`: a third public "relais" in the
         route table reduced to what the Pilot application needs off the workstation (status, changes, batch, sync,
         net only towards the relay's allow-list: SimBrief, IVAO, VATSIM, METAR; never an open proxy), long revocable
         device tokens per user (only their fingerprint kept in tools/.devices.json since R-C2; HttpOnly, Secure, SameSite=Strict
         cookie; one year), the commit author taken from the token, never from the page; the launcher listens on
         127.0.0.1 behind DSM's reverse proxy, reads X-Forwarded-* from 127.0.0.1 only, refuses anything not https as
         seen by the proxy, limits attempts; the frame's detection says `relay: true`. **R1a delivered 7ca73448c (30 Oct
         night, workstation only, nothing exposed)**: pairing by an eight-digit code per trigram issued on the
         workstation (once, ten minutes, `secrets.randbelow`, `compare_digest`, five wrong codes per address = one
         minute, thirty per hour = pairing closed until the next code), `tools/device_access.py` since R-C2, Maintenance screen
         "Appareils" (codes, list without fingerprints, revocation per device or per pilot), pairing page
         without script and never framed, `--lan` refused with `--relay`. Security verdict (audit line 763892c80): one
         **blocking point before any exposure** — the relay fails open when the proxy rewrites `Host` (fix: in relay
         mode, a request from 127.0.0.1 carrying a proxy header with a `Host` other than the public host is refused
         403 before any other guard; the install guide says "keep the Host header" and the start-up checks it); two
         corrections (`safe_next` without blank or control character; same origin required on POST `/__relay/pair`);
         decisions of the ergonomics session: cookie `SameSite=Lax` if no GET route of the relay changes state, wrong
         attempts purged after one hour, the company's IVAO key shared by every paired device said in DECISIONS with
         revocation as the answer, debt: bound the relay to the pilot's prefixes one day. R1b (IVAO OpenID through the
         relay) follows on R1a. R2 — invitations from the
         Maintenance application: user created in the signed registry, one-time code valid 7 days, link
         `#settings?join=`, the pilot types the code once on any device and gets its device token; a list "Appareils et
         invitations" per user with revocation. R3 — deployment (Container Manager image: standard Python + git, data/
         as a volume; DSM reverse proxy with Let's Encrypt, access log, backup of tools/.devices.json) and a full security
         review with a basic intrusion test before any exposure, opened only on the user's explicit go. Decided: the
         relay serves the application itself (same origin, the launcher's CSP); an invited device has the same usage
         levels as on the workstation, the workstation-only routes being excluded by the route public. R1 and R2 are
         coded and tested on the workstation without exposure.
         **One identity model (user, 29 Oct night: "dissonance entre onboarding via NAS et authentification GitHub
         via OAuth")**: the relay is the pilots' identity — the signed registry's user keys and the device tokens it
         issues; a pilot never has a GitHub identity for the suite. The GitHub OAuth / GitHub App idea is dropped from
         the roadmap; the GitHub token stays the path of the administrator and of the advanced user who runs the
         suite without a relay. The company website's future web service, if it ever exists, would take the relay's
         role, not add a second identity.
         **Data repository on GitLab (user, 30 Oct about midnight: "pas sûr. Gitlab ?", then the private project
         `gitlab.com/woyczek/flight_planner_data`)**: the data repository moves from GitHub to GitLab, where **project
         access tokens** exist (one per pilot, named after the trigram, role Developer, scope `api`, 365 days at most,
         revocable, commits attributed to the token's bot). Delivered: **G1** `frame/store/transport_gitlab.js`
         (PRIVATE-TOKEN header, `redirect: 'error'`, https instance only, a stored token reused only for the same
         provider, origin and project; the Settings › Accès card takes the project's address then the token, pasted
         once) — security blocking point on token reuse fixed by 02a096440; **G2** the Maintenance service screen
         `#pilot-tokens` (level Complet, workstation only: the launcher calls GitLab with the administrator's token
         from `secrets/gitlab.json`, never rendered nor logged; the pilot's token is shown once, at creation, and
         never kept) — 241eec6c0, cases A38, A39, I12. The administrator opens the data branch to Developers (GitLab ›
         Protected branches). The relay (R1–R3) stays the "no git token in the browser" path and the pilots' identity
         for IVAO; it is not required for the data. The raw sources (openAIP, SIA zones, AIXM, MIAM, MORA archives,
         AircraftDB caches, about 260 MB) leave the data repository (user: "On sort"), reloadable by Télécharger.
   29. **Challenge of 29 Oct: refactoring before any new feature** (user, 29 Oct: "tu challengeras toutes les décisions
       prises depuis hier, quitte à commencer par refaire du code (refactoring)"; inventory by a read-only agent on
       a29709172 plus the debts declared by the four sessions). Findings: the specification ran ahead of the code (about
       130 lines for what did not exist, three contradictions), every real bug added a special case (17 bug commits in
       two days), Fuel and the Map did not share the computation, `modules/fuel/module.js` at 266 KB and
       `tools/proc_eaip.py` at 147 KB with four trades inside, three geometry checks, seven hand-invalidated caches.
       **Decisions** (each with its item above): coverage layer never lit by itself and renamed, no orange without a
       reader, no conflict notification, no departure lock, the OFP proposes, the choose mode is one tap per choice,
       aids deferred, "Source" = public link only, no ChatGPT reading, one geometry check and one `doubt`, reasons as
       codes, one gesture Lire / Relire, `read_at` delivered, § 10.27 stays (it is Fuel's SPEC that carries the details).
       **Refactoring lots, in this order, one owner each, nothing else started before they are on v3**:
       - **aerodb (reader side)**: `tools/proc_geometry.py` (one check, one policy: mark `doubt`), `proc_eaip.py` split
         into `proc_sia.py` (France), `proc_layouts.py` (the foreign layouts as a table `{ name: (detect, read) }`),
         `proc_records.py` (lines → legs → records, the common post-read pass: phase, threshold, `doubt`), the runway
         table and HTTP where they belong; `proc_manual.py` and `proc_ocr.py` no longer import the eAIP reader;
         `probe` moved to `tools/ead_probe.py`; one fixture set per aerodrome (LFBD, LFBO, LFPO, LFPG) regenerable by
         a tool; the point schema written once in the SPEC with what each source fills; `_ead_fetch` and `_eaip_fetch`
         merged into one job with a source table (the "LF" rule in one place). Cases K unchanged in meaning.
         **Constraints from the survey session (29 Oct), kept**: the layouts are an **ordered list** (detection order
         matters: uk-star before uk-app, at/be-coding before sia-code, icao-tab before de-route), each entry carrying its
         fingerprints, its OCR normaliser, its "OCR-readable" flag and its geometry tolerances; the common pass works on
         **all pages of all documents of an aerodrome** (point lists on another page or document, type carried from one
         page to the next, geometry checked after resolution); the geometry tolerance is **per layout** (0.25° / 0.2 NM
         for true-course tables and everything from OCR, 30° / 0.55 NM for tables without a true course, "uncheckable"
         as a warning, not `doubt`, for the Belgian SIDs without a course); `proc_manual` keeps refusing per record,
         never a whole file unless it has no record; a shared `proc_pdf.py` (PDF reading, shifted fonts, page
         classification, point lists, `limited` / timeouts) so that `proc_ocr` and `proc_manual` import no reader;
         real page fixtures for France only (LFBD, LFBO, LFPO, LFPG), the foreign layouts stay on invented pages
         (EAD data are under conditions); reason codes: pages `layout`, `low-read`, `title`, `no-legs`, `counts`,
         `vector`, `timeout`, records `geometry`, `unresolved`, `uncheckable`, `name`, `repeat`, `zigzag`; the single
         job keeps the OCR pass, the EAD pagination and `sanitize` on everything logged; `proc_ead.py` keeps
         `EadLibrary`, `survey` and `fetch`.
       - **aerodb (reader in the browser)**: `procedures(k)` memoised per (aerodrome, revision), `procedure()` and
         `runways()` read the memo; `withMissed` moved from the consumer to the reader as a counted guard;
         `coverage(icao).read_at` and `source.read_at` delivered; freshness through the frame's `FD.revalidate(paths)`
         once delivered, `manualFresh` / `revs` removed.
       - **fuel**: `frame/lib/procedures.js` (pure rules, above) and `modules/fuel/procedures.js` ≤ 60 KB mounted by
         `module.js` with `{ render, onChange, focus }` and its own texts file; one state object per aerodrome, emptied
         by one function on `change { procedures: ICAO }`; `procMemo` removed (aerodb is the only cache); the rows
         re-render only the options when only the lists change, the focus never touched; one deferred write per series
         of choices (one quote); `depPassed` and the conflict notification removed; `legsAt` kept with one state;
         `fmtDayZ` in `frame/lib/time.js`; tests: pure bench for order / conflicts / dedup / profile,
         `tests/v3/fixtures/procedures.py`, waits on a state (`c.settle()`) instead of fixed delays.
       - **maps**: `current_flight.js` kept for the record, `flight_time.js` and `flight_path.js` split out
         (re-exported during the transition); `expandedPath` marks every junction (`join: 'common' | 'direct' | 'gap'`)
         and `procs.js` only draws; one ordered list of layers in `draw()` each with `reserve(pl)` then `paint(ctx)`;
         a reduced form instead of a full `draw(ctx, env)` (decided 29 Oct evening: twenty signatures for no gain on
         screen): per-part frozen namespaces and `kit` frozen after load, `env = { theme, placer }` frozen per draw and
         passed to the parts, the theme alive only during `draw()`, public functions outside a draw reading `tokens()`; one palette of the Map, day and
         night, read by the rendering and the legend; one element for the airway names (profile migration); `covAuto`
         removed; D41 asserting meaning, not a list of booleans.
       - **frame**: J2 (a pending write on the local transport never asks attention), the end-of-cycle line on the real
         `publication()` form, `Job.log` cleaned; then `FD.revalidate(paths)`; then `regen_jobs.py` reduced to its base
         with `tools/regen/<set>.py` per owner, `commit_outputs(paths, author, message)` for every verb, the job state
         persisted (`interrupted` shown), `AeroDB.declaration().launcher`, the refusal form `{ ok: false, status,
         route, message, reason?, wait? }` in § 15.1, `ctx.consume(keys)` with the table of address keys in
         INTEGRATION, `/__setup/status` = detection only, routes as a table with their public (`lan` | `poste`).
       - **security session**: review of each lot on v3.
       **Then, in this order**: the runway arrow (§ 10.24), the choose mode (§ 10.23), "Source" (§ 10.25), the
       aerodrome names and completion (§ 10.27), the flown trace (`progress.actual.trail`, frame + maps), the Data
       module's State list, the backlog of § 10.28 one line at a time (specified when its lot starts).

   30. **Choosing the runway and the procedure in one gesture, in the pane** (user, 30 Oct morning, first group
       tests: "dans le même geste, sélectionner toute la procédure : SID, la piste ; pouvoir changer de piste si la SID
       n'est pas adaptée, et réciproquement ; avoir les infos météo (vent face ou dos, vent travers), idem à
       l'arrivée ; tout doit apparaître en choix dans le volet ; une sélection reste sur la carte jusqu'à ce qu'on la
       ferme ; sa version « sur la carte » n'est pas convaincante non plus"): decided by the ergonomics session,
       replaces the one-family-per-trip rule of § 10.23 (kept: markers, flat lists, pure rules, Fuel the only writer).
       - **One pane, one side, every family at once.** "Sur la carte" opens `#maps?choose=dep|arr&icao=LFPO` as
         today, but the Map's sheet lists the side's three families together, in the side's order: **runway**, **SID**
         (departure) or **STAR** (arrival), **approach** (arrival only; its transition folded under it). Each family is
         one short group: "Aucune" then six rows, the rest folded under "N autres…" (×4) which unfolds in place, a
         procedure highlighted from the Map unfolds its group; compatible rows first then ⚠, eight hues as today. The
         sheet is the **only scroll surface** (maps session, 30 Oct: a group scrolling inside a scrolling sheet is
         exactly the double scrollbar; the page under the sheet never scrolls while it is open).
       - **Return keys**, lowercase and only these: `rwy`, `sid`, `star`, `app`, `apptrans` (value = id or `none`; absent =
         family untouched); no SID / STAR transition key, the model has none.
       - **The selection accumulates in the pane and stays on the Map until the pane is closed.** A tap on a row or on
         a trace sets that family's choice in the pane (local state of the mode, not yet written); the Map draws the
         current selection (runway threshold vector, the chosen SID / STAR / approach in its hue, the rest of the family
         being touched dimmed, the route and the airspaces in light transparency, as the user liked). Closing the pane
         (✕, Escape, or "Terminer") returns to Fuel in one trip with every key of the side:
         `location.replace('#fuel?focus=arr&rwy=25&star=OKRIX5A&app=I25L&apptrans=none')`, Fuel consumes them together
         at mount (`ctx.consume`), writes `route.procedures` once and says what changed. One writer, one write, one
         address; a key absent = that family untouched.
       - **Runway and procedure correct each other, never silently.** Choosing a procedure that serves one runway sets
         that runway when none is chosen; when another runway is chosen the row keeps ⚠ and the pane shows one line
         under the group, "OPAL2E sert la 25 — Passer en 25", one tap. Choosing a runway keeps the procedure if it
         serves it, else marks it ⚠ and shows the same kind of line, "OKRIX5A ne sert pas la 07 — Choisir OKRIX5B"
         (the first compatible by the group's order). Rules in `frame/lib/procedures.js` (`runwayOf(proc)`,
         `firstServing(list, rwy)`), no module state.
       - **Wind on every runway row.** Each runway row carries the components from the aerodrome's METAR already known
         to the suite (the one Fuel's Départ step shows): head or tail wind and crosswind, rounded to the knot,
         "↑ 12 kt · ← 6 kt" (arrows along and across the runway, tail wind in orange above 5 kt, crosswind in orange
         above the aircraft sheet's limit when it has one — no sheet carries that limit yet: a field
         `maxCrosswindKt` in the sheet editor and its imports is a later lot). Pure helper `frame/lib/wind.js`
         `components(runwayTrueHeading, windDirTrue, windKt) → { head, cross, side }`, bench without a browser; no
         METAR → no line, nothing invented. Same at arrival. Fuel's own runway select shows the same components as the
         option's suffix, so the choice is the same wherever it is made.
       - **The runway on the Map: a threshold vector, small, at high zoom only.** Replaces the full-length arrow of
         § 10.24: a short vector (24 px, screen length, never geographic) from the runway threshold along the runway's
         true bearing, with the designator at its tail; the chosen runway bold, the others thin; drawn on the general
         Map too (outside the choose mode, when the aerodrome has runway records), **only above a zoom threshold**;
         the threshold is an airline setting of the administrator, `runwayZoom` (integer 8–16, default 11) at the top
         level of `airline/map_profiles.json` beside the Map's other tuning, written from Réglages › Administration
         (level Complet), read by the Map through the watch it already has on that file (no event, no frame
         change). Below the threshold nothing is drawn.
       - **Out of scope here**: ILS / DME aids (deferred, § 10.24), the runway in use from the METAR (§ 10.28 backlog;
         the components above are its first step).
       Lots: maps (BUGS SOG: the pane with three families, accumulated selection, return keys, threshold vector and
       zoom threshold, single scroll surface), fuel (Features SOG: `frame/lib/procedures.js` and `frame/lib/wind.js`
       helpers with benches, consumption of several keys in one trip including `rwy`, components in its runway select,
       cases F), settings (Réglages: `runwayZoom` line of the Administration card, help ×4). Files reserved: `frame/lib/procedures.js`
       and `frame/lib/wind.js` to Features SOG, `modules/maps/**` to BUGS SOG, `frame/settings/**` to Réglages.
       **Second reading (user, 30 Oct, after testing af261d3e3; Navigraph's panes shown as a yardstick, "exemples à
       ne pas recopier, mais très ergonomiques")**: "en trois clics : choisir visuellement la piste avec les vents, la
       STAR, l'approche. Ou la piste, l'approche, la STAR. Ou la famille de STAR, la piste, l'approche. Qu'on ne voie
       que les procédures compatibles, mais qu'on puisse changer facilement. Les boutons du volet sont bien trop
       espacés, il faut condenser." Rules, replacing the group layout above where they differ:
       - **Three taps, any order.** The three families are always visible at once, each as a compact list, no
         opening tap: one tap on a runway, one on a STAR (or SID), one on an approach, in whatever order the pilot
         thinks. The pane never imposes an order; each choice narrows the two others.
       - **Only the compatible rows, by default.** After a choice, the other families show only what fits it: a runway
         chosen → STARs serving it and approaches to it; a STAR chosen → runways it serves (one tap picks the runway and
         resolves the STAR's suffix) and approaches joining it; an approach chosen → its runway set, STARs joining it.
         What does not fit is folded under one thin line per family, "N autres · Toutes", which unfolds them marked ⚠
         (the marker rule of § 10.23 stays: shown, never forbidden). "Aucune" stays first in every family.
       - **The family of a STAR or SID is a row.** Records that differ only by their runway suffix (ABLI4L, ABLI4R)
         are one row "ABLI4" with its runways as small tags; tapping the row chooses the family, the runway list
         narrows to those runways, tapping one resolves the record. A family with one runway is an ordinary row.
         Pure rule `familyOf(name)` and `siblingsOf(list, proc)` in `frame/lib/procedures.js`: the suffix is the last
         character when it differs across records sharing the same stem and digit; never a guess on a lone name.
       - **Transitions are sub-rows.** An approach's transitions fold under its row (the first one open when the
         approach is chosen), each a one-line sub-row; the chosen one is written as `apptrans`. STAR entries, when the
         records carry several, follow the same shape under the family row.
       - **Condensed.** One line per row, 36 px high, 44 px touch target through padding, no card, no gap: name, then
         the small facts on the same line (runway tag, transition, "↑ 12 kt · ← 6 kt" on a runway, ⚠ ⌛ at the end),
         group headers as thin labels, the sheet's only scroll. Seven rows visible per family, then "N autres".
       - **The current selection reads as three lines at the top of the pane** ("28L · ↑ 12 kt · ← 6 kt", "ABLI4L via
         ABLIN", "ILS 28L via PIZSA"), each with ✕ to clear that family; they are the summary Fuel also shows in its
         side's title after the return (one text rule, `summaryOf(side)` in `procedures.js`).
         **The summary lines are the pane's table of contents** (user, 30 Oct: "un clic sur Piste renvoie direct à
         la liste des pistes, idem pour SID, STAR, approche"): a tap on the line's label ("Piste", "STAR",
         "Approche"), chosen or not, scrolls the sheet to that family's group and unfolds it if it was folded; ✕
         stays the clearing gesture, separate from the label.
       Lots: maps (BUGS SOG: the pane v2 — three lists at once, narrowing, folds, family rows, transition sub-rows,
       condensed rows, summary lines; cases D), fuel (Features SOG: `familyOf`, `siblingsOf`, `compatible(list,
       { rwy, star, app })`, `summaryOf` in `frame/lib/procedures.js` with benches first, then the same summary line
       in Fuel's side title).
       **Delivered**: Fuel's key consumption and wind suffix (25b887349, `wind.label()` is the one text rule, with
       " · " between the two components), the helpers `familyOf`, `siblingsOf`, `familiesOf`, `compatible`,
       `summaryOf` (451d0ce83); the pane v2 and the threshold vector follow.
       **Third reading (user, 30 Oct, on the Map in choose mode)**: "les STAR se recouvrent mutuellement, alors que
       la STAR en surbrillance devrait avoir un z-index supérieur ; flèche de vent : on atterrit toujours à contre-vent
       (flèche vers le bas), code couleur vert / orange / rouge pour les vents traversier et face / arrière ; les
       cartouches sont fouillis, ne conserver que la première partie (NIMER 9*) par exemple ; tu es l'ergonome."
       - **Drawing order.** The highlighted procedure (hovered, tapped or chosen) is drawn last, above every other
         trace and cartouche of the mode; its cartouche too. Order of the rest: chosen, then compatible, then ⚠,
         then ⌛. A highlight change re-orders without redrawing the base.
         **Hover highlights everywhere, always** (user, 30 Oct: "cliquer sur une approche permet la surbrillance
         d'une approche, un survol d'une STAR ne fait plus de surbrillance, ce n'est pas intuitif"): with a
         pointer, hovering any row of any family highlights its trace and cartouche, whatever is chosen and
         whatever family was touched last; leaving the row restores the previous state; the chosen rows stay bold
         under the hover. A tap chooses and leaves the row highlighted; on a coarse pointer the tapped row is the
         highlight. Hovering a trace on the Map highlights its row the same way (the pane scrolls it into view).
       - **Wind arrows show where the wind blows, in the runway's frame** (runway direction drawn upward, as the
         pilot sees it on final): a head wind is "↓" (it blows towards the aircraft), a tail wind "↑", a wind from the
         right "←", from the left "→". The figure follows the arrow: "↓ 12 kt · ← 6 kt". One text rule,
         `wind.label()`.
       - **Three colours, one rule in `frame/lib/wind.js`**: `severity({ head, cross }, limits) → 'ok' | 'warn' |
         'alert'`. Head wind: ok. Tail wind: warn up to `limits.tail` (5 kt by default), alert above. Crosswind: ok up
         to `limits.crossWarn` (10 kt), warn up to `limits.cross` (20 kt, or the sheet's `maxCrosswindKt` when it
         exists), alert above. The worse of the two components colours the whole label (green, orange, red of the
         design's semantic tokens, never a hard-coded colour); the reason is the `title`. Fuel's runway select and the
         Map's rows use the same call.
       - **Cartouches: one per family and per point, the family's name only.** At an entry or exit point, the
         procedures that share a family (NIMER9A, NIMER9B…) make one cartouche "NIMER 9" (family stem, a space before
         the digit); families that share the point stack in the same cartouche as today, one line each. The full
         name (NIMER9A) appears only on the highlighted procedure's cartouche, which sits on top. The other cartouches
         are small and muted; below the zoom where two cartouches of different points would overlap, the one of the
         non-highlighted family is hidden (the trace stays). Never a per-procedure cartouche in a family.
       Lots: maps (BUGS SOG: z-order, cartouches by family, colour classes), fuel (Features SOG: `wind.label()`
       arrows, `severity()` with benches, the select's colour and title), in this order so the Map reads the rule.
       **Fourth reading (user, 30 Oct, LFPO arrival: "que sont toutes ces INA 06 ? il n'y a pas une lettre
       normalement ? ou alors une transition (ODILO, final, VEBEK…) ; si je regarde une autre carte, je trouve des RNAV
       et ILS pour ODILO ; les vecteurs de piste ne sont pas convaincants")**. Checked on `proc/manual/LFPO.json`: the
       SIA publishes the **initial approach segments** as records named "INA RNAV RWY 06" with `transition` = "ODILO
       1A", "VEBEK 1E", "MOLBA 1W"… (first point = the IAF, no final), and the finals as "ILS CAT I or CAT II or CAT III
       RWY 06", "RNP RWY 06" (from the IF to the missed-approach point). Six identical rows "INA RNAV RWY 06" were the
       symptom. Rules, in `frame/lib/procedures.js` (one rule, one pure module):
       - **An approach record that does not reach the runway is a transition, never a row.** Detection: name
         starting with "INA " (SIA), or `transition` set with no final leg (the record ends before the IF / runway).
         It belongs to **every final of the same runway** (ILS, RNP, LOC…): the SIA segments are common. Shown as a
         sub-row under each final, "via ODILO · ODILO 1A" (IAF then the published transition name with its letter),
         ordered by IAF; `apptrans` carries the transition record's id. Choosing a final without a transition is
         "Sans transition" (direct to the IF), as today.
       - **A final's label is short**: `labelOf(app)` keeps the type and the runway, drops the category alternatives
         ("CAT I or CAT II or CAT III", "or LOC") and the words "RWY": "ILS 06", "RNP 06", "LOC 07"; the published
         name stays in the `title` and in the record. Two finals with the same type and runway keep the SIA letter
         ("RNP Y 06", "RNP Z 06") — never two identical labels in a list: when it would happen, the first point joins
         the label ("RNP 06 · IPO06").
       - **The expanded path joins a transition to its final at the first common point**, else by a direct leg to
         the final's first point drawn dashed (the § 10.20 join rule applies to approaches too); the Map colours the
         transition with the final's hue.
       - **Runway vectors**: the full-length arrows of § 10.24 are withdrawn now, not when the threshold vector
         lands: no runway drawing in the choose mode until the 24 px threshold vector of this § is delivered (BUGS
         SOG, next commit). The chosen runway is said by the pane's summary and the row.
         User, same test: "vecteur masqué par le label", then "des labels sur chaque piste de la carte (a minima le
         numéro de piste au seuil) et, comme on est en gros zoom, le nom de l'AD". Rules: the mode's drawings (traces,
         vectors, cartouches) sit **above the base map's labels** (navaid and airway labels of the tiles and of the
         Map's own layers), which the mode dims; a designator sits at the vector's tail, offset, never over it. On
         the general Map, from `runwayZoom` on, **every runway of every drawn aerodrome gets its designator at each
         threshold** ("06", "24"), with the threshold vector when it lands and without it meanwhile, and the
         aerodrome's pin shows its **name beside the code** ("LFPO Paris-Orly", the name rule of § 10.27) instead of
         the code alone; below `runwayZoom` nothing changes.
       - **One label pass for every label the Map draws** (user, 30 Oct, Blois: a leg label "30" over the navaid
         label "BLB 397", then along a leg "22" and "F065" repeated and overlapping; "attention aux règles de
         recouvrement pour approche, SID, STAR aussi"): per render, the Map's own labels (leg distance and level,
         procedure cartouches, runway designators, aerodrome names, navaids, fixes, VRP, obstacles) go through one
         collision pass in priority order — highlighted procedure, chosen procedures, route legs, other cartouches,
         aerodromes, navaids, fixes, the rest; a label that would overlap a higher one is slid along its anchor
         line (a leg, a trace) within its segment, else hidden; one label per leg and per datum at the leg's
         midpoint, distance and level in one label ("22 · F065"), only when the leg's screen length exceeds the
         label's; a label is never repeated along a leg cut into pieces (tiles, date line). The base tiles' labels
         are not moved; the choose mode dims them.
       Lots: fuel first (Features SOG: the transition detection in `appChoices` / `transitionsOf`, `labelOf`, the join
       in `expandedPath`, benches on LFPO's records; Fuel's own approach select uses the same rows), then maps (BUGS
       SOG: sub-rows and hues from the rule, the join on the trace, vectors withdrawn then the threshold vector).

   31. **The route text and the procedures are one model; "Auto" is idempotent** (user, 30 Oct, LFBO → LFPO: "LFBO
       LACOU7B LACOU LMG BALAN SOPIL UN859 AMB GILUX VEROS G54 CTX G28 LMG R10 BTZ R299 DONOS PPN N10 CJN L27 NASOS ANZAN
       L27 BLN PIMOS A3 MOTAL J18 KOTAP LFPO tourne en boucle, résultat de plusieurs Auto successifs depuis LFBO LACOU7B
       LMG BALAN SOPIL UN859 AMB LFPO ; et pourtant la route LACOU LMG n'est toujours pas trouvée ; on doit pouvoir
       modifier le FPL après sélection SID / STAR, ce qui implique que le choix se reporte dans le FPL ; une procédure
       pourrait être un point comme un autre ; LACOU7B impose une sortie vers LMG alors que le départ initial était via
       GAI G38 LMG"). Decided by the ergonomics session, with two objections recorded below.
       - **"Auto" recomputes from the pinned points only, and replaces.** Pinned = departure, the chosen SID's exit,
         every point the pilot typed, the chosen STAR's entry, arrival. Airway names and intermediate nodes produced by
         a previous Auto are never constraints: the tokens Auto writes are tagged generated (`route_text.js` keeps the
         provenance), a second Auto on the same pinned points gives the same text. A result that visits a point twice,
         or whose length exceeds the direct chain by more than `detourPct` over the whole chain, is rejected leg by
         leg (direct for that leg). No path between two pinned points → "LACOU DCT LMG" and one line that says why
         (no airway from LACOU; too far), never silence: "route non trouvée" is a fact the pilot reads, not a bug.
       - **The route text is a view of the model, parsed back when edited.** The model is `route.dep`, `route.procedures`
         (SID, STAR, approach, transition), the points, `route.arr`. Rendering writes the ICAO form: the SID's name
         first, then its exit, the points and airways, the STAR's entry and name last ("LACOU7B LACOU DCT LMG UN859 AMB
         OKRIX5A"); the approach never appears in the text (it is not an FPL item). Parsing a text the pilot edited:
         a first token that names a SID of `route.dep`, or a last token that names a STAR of `route.arr`, sets that
         choice; its absence clears it; a token the base does not know stays a point by name and is flagged. One
         writer stays Fuel; the Map's choices write the model and the text follows at once. Hence "modifier le FPL
         après sélection SID / STAR" works, and the pane and the text never disagree.
       - **SID exit against the typed route.** The chosen procedure joins the route at the first common point, else by
         a direct leg to the route's first point, and Fuel's change line says it ("LACOU7B sort à LACOU : LACOU DCT
         LMG"). In the pane, the SIDs whose exit is on the typed route come first ("vers votre route"), the others
         after, marked "sortie LACOU" — a second compatibility axis beside the runway, `compatible()` takes the route's
         points. The pilot keeps the last word.
       - **A text field with completion at the cursor.** The route field proposes, from two characters at the cursor,
         points, navaids, airways and the procedure names of the two aerodromes (≤ 7, the component of § 10.27);
         inserting writes the token at the cursor. The selects of the Route step stay as the keyboard and screen-reader
         path, secondary (objection to "les popdown ne fonctionnent pas": they are not removed, the failing case is to
         be named).
       - **Objection recorded, user to confirm**: "une procédure pourrait être un point comme un autre" — in the
         route text, yes (ICAO form, above); in the Map's point list a procedure is one folded group row (its legs under
         it, one hue), never a single point: a point has a position, a procedure is a path with constraints and a runway.
         Treating it as a point would hide the legs the pilot flies and break the join rule. Group row proposed instead.
       Lots: fuel (Features SOG: Auto idempotent with provenance in `route_text.js` and `routing.js`, render / parse of
       the text with procedures, the change line, the completion field; cases F), maps (BUGS SOG, after the performance
       fix: SIDs ranked by exit on the route, the group row in the point list; cases D).
       **User's answers (30 Oct, afternoon)**: the group row is accepted ("contre-proposition acceptée"). Two more
       points:
       - **"AGN A34 LACOU A34 PERIG A34 NAVAC A34 LECAR A34 LMG"**: the airway exists in the publication, so "no airway
         from LACOU" is wrong as a reason. Rule: when no open path joins two pinned points, the router names the airway
         that joins them and why it is closed ("A34 relie LACOU à LMG, fermée au FL250 : plafond FL195"), from the
         segments' limits; the pilot then changes the level or keeps the direct. The user's heuristic ("the airway that
         arrives at B is the one that leaves A") is what the shortest path already does when the airway is open; it
         is not added as a rule — objection recorded: a heuristic that follows an airway closed at the level would
         write a route the pilot cannot file. Features SOG checks the real base on this leg first (level of the flight,
         corridor width, segments present), and fixes what is actually missing.
       - **Fuel's procedure area must read without scrolling** ("ça ne tient pas sur un écran, c'est pire sur un
         téléphone ; a minima un TL;DR départ / arrivée avec procédures, puis les outils de sélection ; les boutons Sur
         la carte / Relire / Source complexifient la lecture"). Rules: the step opens on **two summary lines**, one per
         side, the same text as the pane's summary (`summaryOf`: "Départ LFBO 32L · LACOU7B", "Arrivée LFPO 25 ·
         OKRIX5A via ABLIN · ILS 25"), each with **one** button "Sur la carte"; the selects and the secondary line ("lu
         le … ⌛ · Relire · Source · N non lues") are folded under the summary and open on a tap on the line, one side
         at a time; "Relire" and "Source" leave the title and live in that folded part only (rare gestures). Under 7
         elements visible at the step's opening: two lines, two buttons, the rest folded.
       **Delivered (30 Oct)**: Auto idempotent with provenance (5a374c189), the typed airway read along its own nodes
       or left direct with a line (d34ad04fb), the text as a view of the model with SID / STAR read back and the ICAO
       form (79993b1ea), the name rule in `frame/lib/adnames.js` (1e36c7570), the folded procedures card (61948bfb3),
       the procedure group rows in "Points (N)" (512902c66), the closed airway named with its open range (1bade3bc8),
       the completion at the cursor `modules/fuel/routecomplete.js` (40f834eb7); the Map's "vers votre route" ranking
       (1ad1b897b). **§ 10.31 is delivered in full**; § 10.30's pane is complete up to its fourth reading (af261d3e3,
       43df712ef, 1f23b7d73, 8ba329f66, b6b2043e6, 1ad1b897b).
       **Pan: a light drawing during the gesture (user, 30 Oct: "le freeze de refresh est efficace pour la fluidité,
       mais gênant pour se déplacer : un intermédiaire ?"; delivered c3eed56db)**: during a gesture, at most one light
       drawing every 120 ms (airspaces as strokes, airways, route, aerodromes as squares; no label, no collision pass,
       no runway vector, no cartouche), from Path2D paths built at zoom 10 relative to a reference point and placed
       by one transformation — valid through a pinch too, rebuilt per list set of the last full drawing, never
       invalidated by the zoom (the maps session's design, retained over the per-zoom cache first asked); a light
       drawing over 8 ms hands the rest of the gesture to the copied image; the full drawing at rest; none on a
       mission map nor in the choose mode. The corridor is an explicit box, "Autour du vol seulement (plus rapide)",
       first in Couches, remembered on the device, said in the sheet's title and the "i" chip; unticked, the whole
       view is read under the complexity filter, a 10 NM corridor imposed above 600 NM of width (4f9dca4c3).
       **Noreg discipline (30 Oct, after a driver crash)**: one full pass at a time on the workstation; `--touched`
       passes may run beside it; the runner refuses a second full pass while one runs (lock, V3 Frame).
       **Fifth reading: the walkthrough on the real base (maps session, 30 Oct, LFBO → LFPO at 1280 and 390 px, read
       only; fifteen findings, two serious)**. Rules added, lots dispatched the same day:
       - Fuel: rendering the route text from the model is idempotent (procedure, exit and entry tokens already present
         are recognised, never written twice: the text doubled the SID at every return from the Map); Auto starts from
         the chosen SID's exit, never from the aerodrome; one distance, the expanded path's, said "procédures
         comprises"; a family of records (AMOLO 7A for 14L and 14R) is one row in Fuel's lists as in the pane; the
         names through `adTitle`, the return notification "SID → AMOLO 7A" out of the fuel block; the `.fms` approach
         is the ARINC identifier (I02) when it can be derived, and CYCLE the published base's cycle.
       - Map: TOC / TOD tolerate a 100 ft drift of the level; the pane frames the aerodrome and the compatible
         procedures only; the "vers votre route" axis is silent on a route without points, replaced by the bearing of
         the exit towards the arrival ("vers LFPO" first); a label never repeats the runway it already carries, "via
         MOLBA 1E" when the transition's name starts with its IAF, the cartouche uses the list's label; an approach
         transition is offered with a STAR only when its IAF is on that STAR (`compatible({ star })`); the sheet takes
         the available height with "Terminer" always in view; near the aerodrome its label wins over the traces and
         the runway numbers yield to the navaid boxes; the vertical cut goes through the same collision pass.
       **Sixth reading: the Map after the refactoring (maps session, 31 Oct, LFBO → LFPO on the real base at 1280 and
       390 px, read only; seven gaps, confirmed on the captures; nothing wrong in the procedures, the cut, the
       constraints, the navaids, the runway numbers, the layers, the corridor and the return to Fuel)**. Rules, one lot
       and one case each, in this order:
       1. **The sheet's height** is the height of what it shows (the cut, or its line alone), capped at half the view;
          the map takes the rest; never a blank under the content; the same at 1280 and 390 (the map was 250 px of 900).
       2. **The return frames the flight**: opening the Map from Fuel or coming back after "Terminer" frames the flight
          with its procedures, as the first opening does; a framing made by the user (pan / zoom) on the same flight in
          the session is kept, not beyond.
       3. **One distance**: the sheet's title reads the route model's distance (expanded path, procedures included),
          the same as Fuel and the cut's axis; one writer, `frame/lib/route_model` (373 NM against 388 NM today).
       4. **The aerodrome written once**: "one box per key" extends to the aerodrome at the route's end — the route's
          forced label and the aerodrome's name are one box, rank 1, in the aerodrome's style.
       5. **Procedure names**: the flight's map names through `displayName` / `labelOf` of `frame/lib/procedures.js`
          like the pane and Fuel ("ILS 06", "AMOLO 7A"), never the base's raw name ("APP ILS CAT I or CAT II or CAT III
          RWY 06"); the chosen SID's label is a procedure (rank 4) that slides instead of being bitten.
       6. **Choosing starts on the map**: on entry the aerodrome is framed and the first family's candidates (the
          runways, then the compatible procedures) are drawn faded, as "N autres"; the sheet takes half the view at
          most at 1280; touching a row only highlights.
       7. **Light drawing during the pan** draws the same set of aerodromes as the full drawing (the zoom rule chooses,
          not the drawing mode), with simpler marks; the image does not change its aspect at the start nor the end of
          the gesture (seventy black squares between Paris and Bourges today, a dozen aerodromes in the full drawing).
       Each rule is written in the Map's SPEC before its code, the D / M cases stay green, `--touched` before each push,
       a measure at rest when 6 or 7 touches the drawing. F41 (return from the Map to Fuel) failed once under load, green
       twice alone: recorded as a known flake; at the third time, a wait in the case's helper as Fuel's `to_step`, the
       module untouched.
       **Delivered (31 Oct, one day)**: 1 06dcd175b (sheetFit: the sheet's height is its content's, half the view at
       most; D86, C4 and D60 adapted), 2 3d2346411 (one writer of the framing, `frameFlight`, signature of the flight,
       the user's framing kept to the end of a gesture only; D87), 3 5de1e2b93 (the title is rewritten when the
       procedures arrive; the one writer of the distance is `flownPath` of `frame/lib/current_flight.js`, not
       `route_model`, which resolves and does not measure; D88 compares five figures), 4 b700ce857 (the route's label
       at an aerodrome takes the aerodrome's key — its code alone, positions never coincide at four decimals — and
       fuses only when the map draws an aerodrome of that code; D89), 5 771030ddf (`displayName` / `labelOf`
       everywhere, no genre on the map, the name slides along its trace; D90, D41 and D53 adapted), 6 6a8403466 (the
       aerodrome centred, the first family's candidates drawn faded before any touch, a faded trace is chosen by a
       touch like its row, the gesture of § 10.23 unchanged; D91), 7 696fb035f (the light drawing paints what the full
       drawing drew, 138 → 28 marks at Paris VFR, 0.2 ms a frame; D92). Found on the way and fixed by the frame: a
       pane closed before its module arrived (d6e7fa27a, A54, the probable cause of the F41 flake) and the relief
       tiles waiting without bound behind the first reading of the airline (`net.fetch`, bounded to 3 s with refusal
       as the fallback, V3 Frame); the Map's mirror rule follows as a lot: **the cut is built without waiting for a
       tile** (MORA of the cells, "Relief indisponible"), the relief added when its tiles arrive.

   32. **Missions in V3, first framing** (user, 30 Oct: "les missions actuelles sont communes : je suis le seul à en
       créer, d'autres en profitent ; la numérotation est la mienne ; le premier acte du rôle « équipier enrôlé dans une
       structure réalisant des missions imposées » ; une mission d'une VA : rapatrier un appareil, vol commercial, cargo ;
       l'intégration avec l'appli Pilote reste à décider, mais une mission qui a un point de départ et un point de
       rendez-vous doit pouvoir engendrer un FPL et une carte avec les espaces"). Planned after the stabilisation (a
       usable Map, the administration verbs); no lot opened. Rules, so that nothing built meanwhile contradicts them:
       - **Data**: `missions/<id>.json` in the shared repository, the author's numbering as the identifier, one writer
         (the author's device today, the CPCO application tomorrow), read by every pilot; a mission is never
         rewritten by a pilot — what the pilot does with it is the flight record (`pilot/<TRI>/…`). The V2 mission files
         are imported once by a reader, never kept in two shapes.
       - **A mission is a source of the flight**, at the OFP's rank: departure, a **rendezvous** (a point with a time,
         the first fixed constraint of the route), an arrival (the base unless the mission says otherwise), the
         aircraft or its type, the imposed constraints (level, zones, time windows). From it Fuel builds the route
         (dep → rendezvous → arr, "Auto" between), the Map draws the points and the airspaces that matter (the
         rendezvous area, the activated zones). One contract, `missionFlight(mission) → flight fields`, pure, in
         `frame/lib`.
       - **The role is a usage, not an application**: the Pilot application carries a usage "équipier" beside the VFR
         and airline usages (identity / level axis, § 7); with it, Fuel's start offers "Nouveau vol : depuis une mission
         (choisir · tirer au sort) · depuis l'OFP SimBrief · libre", the mission list is a module of the Pilot
         application (rail entry only for the role), and the CPCO (authoring, assignment) is the third application
         when built. The integration level stays the user's call; this framing keeps both doors open.
       - **Categories follow the airline's kind** (`airline/settings.json` `kind`: `sog` | `va` | …): a rule per
         kind decides which mission categories are active (ferry, passenger, cargo for a commercial VA; the SOG's own
         ones), never a hard-coded list in a module.
       **The group mode is NOT abandoned (user, 30 Oct evening: "tu commences à l'implémenter, quelque part, en
       proposant les missions au choix et / ou en aléatoire : c'est le premier pas vers le module équipage")**. What was
       dropped on 21 Oct is the signed accounts (S3 / S4), not the group mode: playing missions as a crew stays the
       suite's purpose. Corrections and framing:
       - **First step, now**: a module "Missions" of the Pilot application that lists the common missions and lets the
         pilot **choose one or draw one at random** (one gesture each, the draw excludes the missions already flown by
         this pilot when the flight log says so), and hands it to Fuel as the flight's source (§ 10.32 above). This is
         the seed of the **crew module** ("Équipage"), not a side feature.
       - **Envelope and page-by-page reader**: the mission opens as the envelope and the page-by-page reader designed
         in V2 for the exercise folds (one envelope per design, Aqua's `Default.png`); in V3 they are two primitives of
         the frame's design layer — the textured skin on the computer designs (Aqua), a plain skin on Standard and on
         the phone — the same reader, one content, two skins. The CPCO's mission registry reuses the textured page the
         same way.
       - **Meeting the crew**: a mission carries, filled at assignment by the CPCO, the rendezvous of the crew — a
         Discord channel (link), an SRS server and frequency, a JoinFS session, or any other named channel — shown by the
         crew module with "Ouvrir" / "Copier", pre-filled and never typed again by the pilot. Rule: these are mission
         data of the shared repository, readable by every pilot of the airline (same access model as the fleet); a
         session secret (a password) is a known limit, said in the SPEC, not a reason to build accounts.
       - **Objection recorded (ergonomics session)**: the user asked for stabilisation first; starting the crew
         module now adds a fifth front while the four sessions carry the administration lots and the refactoring.
         Proposal: the SPEC of the Missions module now (this §, then `modules/missions/SPEC.md` with the data shape read
         from the V2 missions), the code by a dedicated session or by Features SOG after R-F3, never by squeezing it
         between two refactoring lots. The user decides who and when.
       Lots: `modules/missions/SPEC.md` (ergonomics session + survey of the V2 mission files), the V2 mission reader
       into `missions/`, `missionFlight` with a bench (fuel), the usage "équipier" and the two design primitives
       (frame, design), the Missions module (new owner), the Map's drawing (maps), then the crew rendezvous and the
       CPCO registry page.

   33. **Refactoring after the stabilisation: the "do and undo" since 28 Oct** (user, 30 Oct: "challenger tout ce
       qu'on a fait évoluer depuis hier voire avant-hier, pour supprimer les faire et défaire vers un point documenté,
       fonctionnellement logique ; éviter le code mort ou les empilages ; mais d'abord on stabilise"). Three read-only
       inventories were written the same day, one per owner, in each DECISIONS.md under "Inventaire du 30/10 : à
       refondre": the Map (83c31fed9, six zones), the frame and the launcher (b5a324be4, ten zones), Fuel and
       `frame/lib` (d524d253c, eight zones). **Nothing starts before the user's go.** Plan, ready for that go:
       - **Rules of every lot**: no behaviour change (the cases stay green before and after, a case that changes is
         explained in the commit); one owner, one file set, one lot per session at a time; the target shape is the one
         sentence of the inventory, written in the SPEC before the code; benches first for every pure function moved
         to `frame/lib`; dead code deleted, never commented out; `--touched` before the push, one full pass after, one
         at a time on the workstation; the CHANGELOG line says "refonte, sans changement de comportement".
       - **Shared first (frame/lib, one week at most)**: `wind.runwayAxis` and one wind rule (Fuel 4, Map's
         runwayBearing); the procedure rules written once (`compatible` absorbs `conflictsOf`, one notion of an
         approach transition, one name renderer; Fuel 3, Map's pane reads them); the palette's hues as design tokens
         (Fuel 5, Map 5); the frame's trail as the only trace (Map 6, frame 7 after 6 Nov).
       - **Then each owner, in the inventories' order**: Map — runways (4), pan scheduler (3), `paneModel` pure with
         its bench (1), labels declared per layer and one pass (2) with the cartouche primitive (5). Fuel — one
         `routeModel(text, base)` and one renderer, the SID exit entering once (2 with 1 inside), one completion list
         (6), the card's flags (5). Frame and launcher — the IVAO return in one place (3), one route list (4), one
         pairing (2) and one relay identity (1), one data/ recovery (5), the two transports behind one interface (6),
         then the freeze paths (8), the service screens (9) and the noreg selectors (10) when those files are next
         touched.
       - **Cases and documents last**: overlapping cases merged (F41 / F63, F8 / F67; D60's four rewrites), each SPEC
         paragraph rewritten as the state, not as the stack of "since § x" additions; this § 10 is then condensed the
         same way, decision by decision.
       Estimate: two to three days of the four sessions once the go is given, the shared lots first so that nobody
       rebuilds on the old rules.
       **Go given (user, 30 Oct evening: "en // tu peux lancer la refonte")**, in parallel with the lots in
       progress, one refactoring lot at a time per session: Fuel R-F1 wind axis → R-F2 procedure rules → R-F3 hue
       tokens → R-F4 routeModel → R-F5 one completion → R-F6 card flags → cases and SPEC; Map R-M4 runways → R-M6
       trail → R-M3 pan scheduler → R-M1 paneModel → R-M2+5 labels and cartouches; frame R-C2 **one pairing and one
       device list first** (user's question of the day: relay devices versus LAN devices) → R-C3 IVAO return → R-C4
       routes → R-C1 relay identity → R-C5 one data/ recovery → R-C6 transports → R-C7 trail reprise after 6 Nov →
       R-C8/9/10 when touched; Réglages: a short inventory of frame/settings and modules/data first, then its lots.
       **State (30 Oct, night)**: Fuel R-F1 to R-F6 done, cases merged, the SPEC rewritten as a state (3a e3d23846e,
       3b 533dd175f; each rule cites its case or says "no case"; the 22 "no case" rules are debts in DECISIONS, the
       three biggest get a case each, one commit per case, no behaviour change: "Cancel the start" F81, the "Real
       weather" surface-wind mean in the METAR bench F80, the weather corridor; a gap found on the way — a station
       without a wind direction was read as 0° — is fixed as a separate bug commit: such a station leaves the mean and
       the screen says on how many aerodromes the mean is made, or that there is none). Map R-M4, R-M6, R-M3 and R-M1
       (a)(b)(c) done (pure `frame/lib/pane_model.js`, one state, one exit `chooseClose`; audit line 96). Réglages
       R-S1 done, "Prendre le fichier téléchargé" delivered (c62d555e6, audit line 95: the real pickup will carry the
       zip shown by the plan — launcher key `zips: { <source>: { name, size } }`, refused per source when the newest
       zip no longer matches, the name compared only, never used as a path — then R-S2).
       **R-M2+5, plan accepted (BUGS SOG)**, three lots pushed separately, target form in `modules/maps/SPEC.md` § 3:
       (a) one cartouche primitive in the render core (frame, halo, runs, swatch, full / faded) used by the procedure
       labels, the choose pane's top and the airway boxes, and `PALETTE.sid / star / app` read from the `--sog-map-*`
       tokens at every theme change, pixel-identical; (b) every layer declares its labels as requests { layer,
       priority, key, anchor, candidate boxes in sliding order, paint } and `many()` deduplicates by key, the
       in-order placer keeping today's winners; the hidden "full name at pxPerDegree ≥ 900" threshold moves to the
       zoom rule; (c) **one label pass** sorting every request by the closed list below (stable at equal rank), each
       taking its first free candidate or staying silent; the vertical cut goes through the same pass with its own
       list (TOC / TOD, levels, constraints, entered airspaces, fixes, other airspaces). The closed list: 1 the
       aerodrome's name; 2 the runway numbers; 3 the navaid boxes; 4 the procedure cartouches (highlighted, chosen,
       touched family, others); 5 the route's points and the path's airway cartouches — or the mission's points on a
       mission map; 6 the rest (airways off the path, fixes, VRP, airspace names, MORA, towns). Decisions: at a
       terminal the aerodrome and the navaids win over TOC and the ETAs, which slide along their leg before going
       silent; a navaid or a fix that is also a route point is one box (the highest rank, by key), the ETA stays on
       the leg; a case adapted by (c) is said one by one with the old and the new winner, written here as a rule; the
       drawing at rest is measured before and after on the real base (Paris, Toulouse), under 16 ms or the lot stops.
       New cases: the three kinds of cartouche pixel-identical and the hue following the token; a dense fixture with
       identical positions before and after (b); LFBO 14L / 14R with AMOLO 7A / 7H and the threshold navaids at zoom
       11–12, no box overlapping, LFBO and every runway number written, the navaids yielding.
       **Delivered (31 Oct, night)**: (a) 3e65a0465, (b) 87748d47a, (c) 9f703190c. The pass plays the drawing twice: a
       mute turn (a local context that paints nothing, true `measureText`) collects the requests, they are placed by
       rank, the painting turn writes each at its decided place so the drawing order (route over cartouches, the
       choice's veil) stays the image. Final closed list: aerodrome symbols · 1 aerodrome name (the choose pane's code
       first) · 2 runway numbers · navaid symbols (a threshold number beats the symbol of a DME sitting on it) · 3
       navaid boxes · 4 procedures (highlighted, chosen, touched family, others) · 5 route (names, levels, ETA, NM
       marks, TOC / TOD, the path's airway cartouches; a mission's points) · 6 airways off the path and true tracks,
       AAR / NAT, fixes, VRP, obstacles, airspaces, MORA, grid, towns, mission zones. One box per key (a navaid, fix
       or VRP that is a route point is written once), a child silent with its parent (an airway's true tracks), ETA
       then TOC / TOD slide along the trace (16 to 64 px) before going silent, the pass hides nothing by zoom. The
       vertical cut goes through the same pass (TOC / TOD, constraints, levels, airspaces, obstacles, airway points).
       Winners changed, written as rules: at LFBO the navaid box "(D) TBS 110.7" is written and "RW14R" slides; in VFR
       fixes and VRP beat obstacle heights; in the cut a procedure constraint beats levels and airspaces (D80 adapted,
       D85 on the real LFBO). Measure at rest on the real base, 1280 × 900: worst 13.6 ms (Paris VFR z9, 10.1 before),
       everything else under 9 ms. **Rule of the drawing at rest** (reworded on 31 Oct after three runs of the same
       A/B: the worst of Paris VFR z9 varies from 12.8 to 15.7 ms from one run to the next, the old code included):
       no lot raises the median (A/B side by side, 24 drawings a view) and the worst stays under 16 ms; nothing is
       added to the drawing without that measure.
       Also: the SIA key does not identify an airspace (74 duplicates in fr, "LF600" SUR and PRN): an airspace is keyed
       by type, key, name, limits and first point (§ 3 of the Map, aerodb's DECISIONS).
       **State of the refactoring (31 Oct)**: Fuel R-F1–F6 done; Map R-M1–M6 done; frame R-C1–R-C6 done (R-C7 after
       6 Nov, R-C8/9/10 when touched); Réglages R-S1, R-S2 done, R-S3 (one helper for the launcher's secrets) in
       progress. Every session's queue is then empty: the Map's sixth reading (read only, after the refactoring) and
       the user's answers (Missions, pre-release 6.0.0-alpha.3) decide what comes next.

   34. **Administration: what is still missing to turn V2 off** (user, 30 Oct: "j'attends une carte réellement
       utilisable, et un module d'admin"; inventory V2 → V3 of the same day, scope confirmed). The Maintenance
       application already holds the aeronautical base (four verbs), access and repository, keys, IVAO, GitLab tokens,
       relay devices, diagnostic. Lots, in the order of importance for the administrator, rules not screens:
       - **A1 — every data set has the same four verbs** (Réglages, with the launcher's verbs from V3 Frame): the
         Data module's groups Procédures (eAIP / EAD / CIFP readings per State, "Relire" of an aerodrome as today),
         VAC points, aircraft types and performance sheets, and the company's published sheets get Télécharger ·
         Construire · Publier · Purger exactly as the base has them (one choice of sets, one operation at a time found
         again on opening, journal, nothing committed by fetch or purge); then **"Tout mettre à jour"**: one gesture
         that runs the four sets' downloads and builds in the published order and ends on one Publier, with a plan
         shown first (what will change, sizes, AIRAC cycle) and a stop at the first failure; the V2 maintenance page
         link leaves the rail when every V2 verb has its V3 twin.
       - **A2 — aircraft: fleet and sheets edited in Maintenance** (Features SOG): one module `modules/aircraft/` of
         the Maintenance application, level Complet: the company's fleet (`airline/fleet.json`, today pasted from the
         site) as a list with add / edit / retire, the performance sheet of each type (`aircraft/sheets/<id>.json`:
         speeds, fuel flows, `maxCrosswindKt`, the fields Fuel reads) edited in a form built from the sheet's schema
         (one writer per field, the OFP / lnmperf / CSV imports of § 10.21 as sources, preview before writing), the
         aerodb registry (types, callsigns) read-only with a search; no V2 "learned types" nor "merges" rebuilt: a
         type unknown to the registry is a sheet with its own id.
         **One editor only** (decision on Features SOG's SPEC, 30 Oct): the sheets editor lives in `modules/aircraft/`;
         Fuel's "Fiches" tab keeps the reading (which sheet the flight uses, what it lacks) and opens
         `?app=maintenance#aircraft?sheet=<id>` to change it; Fuel's own editor (about 900 lines) is removed in a
         separate commit once the new cases pass. `maxCrosswindKt` joins aerodb's `PROFILE_FIELDS` first. A
         pilot who needs a personal sheet opens the same Maintenance application on their device.
       - **A3 — the workstation itself** (V3 Frame): Maintenance › Administration gets "Mise à jour de la suite"
         (a channel is a version selector, not a branch: stable = the last release tag, early = the last pre-release
         tag, "suivi" for the administrator who tests = the head of the development branch named once in the
         launcher; fetch then fast-forward only, refused on local changes, plan first, manual restart said as
         such, the data repository never touched; the launcher's own update stays a documented manual step), "Sauvegarde du poste" (one ZIP of data/ with
         secrets excluded and said so, restore from a ZIP with a plan first, the journal of backups), "Dossiers"
         (the local folders the launcher knows — data/, X-Plane, Little Navmap, downloads — read-only paths with
         Ouvrir, changed only in the launcher's config file, said so).
       - **A4 — coverage of the procedures on the Map**: already delivered as the layer "Couverture" (§ 10.22,
         28 Oct late; maps session's correction of 30 Oct): lit by the user's box only, never automatically (§ 10.29),
         no Little Navmap orange until `tools/proc_lnm.py` exists; nothing to do. The Data module's per-State
         colours come with A1.
       Out of scope, by the user's decision: users and rights, the Centre (dispos, ODV, CR sending: the CPCO
       application later), theme colours. Each lot: SPEC of the module first, cases, help ×4, `--touched` before the
       push, one full pass after.
