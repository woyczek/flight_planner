# Test pages of the procedure readers

Every file in this folder is a page **INVENTED** on the same **structure** as the real page it stands for: the same columns, the same headings, the same
traps of layout, invented names and coordinates. No real extract of any source is in the repository, whatever the licence of the source: the real
corpus stays on the workstation of the user, where the replay of the real corpus runs (decision of the user, 26 Nov 2026, made the rule for ALL
the sources, France included, by the ergonomist).

## Rule of fabrication

1. **KEEP the structure that the reader reads**: the order of the columns, the headings it recognises, the shape of the cells, the traps of the
   layout (a split identifier, a comma for a decimal point, a missing cell, text in the wrong order…).
2. **INVENT the rest**: names of aerodromes, of points and of procedures, coordinates, and the prose (replaced by an invented text of the same length
   and the same shape). No sentence of an AIP remains. What a reader needs as a keyword (« Missed APCH », « turn left », a column title) is structure
   and stays.
3. **COHERENT geometry**: the invented coordinates are deduced from the real ones by **ONE transformation per page**: here, a rotation of the sphere
   about the polar axis, i.e. the **magnitude of the longitude grows by 2 degrees 18 minutes** (the hemisphere letter is kept). It keeps the
   latitudes, the distances and the true courses, so the geometry checks of the readers (distances, courses, projections) give the same results with
   the same tolerances; the frequencies move by a fixed step. The expected values written in the cases follow the same transformation: those that a
   reader computes (a projection from a threshold) were recomputed on the invented page and agree with the transformed real ones to half a unit of
   the sixth decimal (the published coordinates are rounded to six decimals).
4. **REFERENCE**: every file carries its line in the `sources.json` of its folder:
   « Page inventée, sur le modèle de {AIP de tel État, telle rubrique, telle mise en page}. Aucune valeur n'est réelle. »
   Never the name of a local file (K632 refuses a line that names one).
5. The real corpus stays on its workstation (local replay). The tool that makes an invented page from a real one stays there too.
6. **A STATIC CASE** (K632): no file in this folder without its line, no folder that the register of the readers (`tools/proc_readers.py`) does
   not know, no line without a file.

## What is here

- `fr/` — pages on the model of the French AIP (AD 2: DATA pages, ARINC coding tables, IAC ILS / LOC charts and their positioned text); the
  folders `fr/iac/` and `fr/national/` hold the pages of the cases on the final approach and on the national build.
- `uk/` — pages on the model of the UK AIP (AD 2: coding tables, IAC ILS / LOC charts, AD 2.12, a conventional SID chart); the longitude is moved by 2°18′ with a sign chosen per aerodrome (a page may straddle the Greenwich meridian), the other rules are the same.
- `ground/` — three pages (the text of the AD 2.8 of a UK and two Irish eAIP pages, markup and native identities kept: names of the aprons, the aerodrome codes and the elevations are invented, the pages print no coordinate) and two native-text parking charts of the UK style (the printed stand coordinates: the longitude moved by 2°18′ in the sign of the aerodrome, the names and the prose invented). The `ESZY-*.json` files are an invented GeoPDF payload (the content of the chart turned half a turn about the page centre and its frame moved in the SWEREF 99 TM grid, the controls recomputed with an independent Gauss-Krüger series) and four invented control points.