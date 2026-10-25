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

Open: which application a given person opens by default (role in the registry), and whether one person can switch
between them on the same device.

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
   `cabinet` goes, `field` may stay. Nothing skeuomorphic on a phone. Mock-ups on branch `v3-metro`
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
