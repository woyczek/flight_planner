# Create a performance sheet — tutorial

*SO Group Virtual (Virtual Special Operation Group) · [Version française](fuel_profile.fr.md)*

Fuel computes a fuel plan from the aircraft's **performance sheet**: speeds, vertical speeds, fuel flows, ceiling,
engine map. This tutorial creates a sheet on the **Performance sheets** page, completes it, then uses it in Fuel.
Allow ten minutes. Names in quotes are the button and block names as they appear on screen.

Before you start: the suite is installed and running ([installation tutorial](installation.en.md)), with the usage
level **Design** or above (Settings › My profile › “Usage level”). The “Engine” and “SimBrief” cards need the
**Expert** level.

## 1. Open the page and choose the aircraft

1. Side bar “Tools” › **Performance sheets**.
2. The “Performance sheets” table lists your aircraft, grouped by category, with those of “My aircraft” first. An
   aircraft without a sheet shows “none” in the “Performance” column.
3. Click the aircraft's row. The row is highlighted and the “Aircraft” selector at the top of the page shows it. For
   an aircraft without a sheet, the bottom bar shows “No sheet for …” and the “Create the sheet” buttons.

You can also start from Settings › My profile › Aircraft and simulators. There, the “Performance” column of an
aircraft without a sheet offers the same ways to create one, and the link opens the sheets page on that aircraft.

To add an aircraft that is not in the table, use “Add an aircraft” in the bottom bar.

## 2. Create the sheet

For the chosen aircraft, the bottom bar offers:

- **“from SimBrief”**, when SimBrief knows the type. This is the fastest way. The sheet takes the cruise fuel flow,
  weights, ceiling and speed from SimBrief's public list.
- **“Ask ChatGPT”**, for any type (see step 3).
- **“Estimate from the class”**, when the type is classified (helicopter, turboprop, jet, single-engine…). The sheet
  is minimal: the class's typical fuel flow, speed and ceiling, marked “estimated”.

After a click, the sheet is created and opens in the “Sheet being edited” card. The bottom bar shows
“Sheet saved — …”.

## 3. Complete it with ChatGPT

1. “Ask ChatGPT” opens the ChatGPT panel above the table, on the chosen aircraft.
2. “Copy the prompt and open ChatGPT” copies the question and opens ChatGPT in a tab. Paste the question (Ctrl+V) and
   send it. “Show the prompt” shows the question on the page.

   The question asks ChatGPT to compile the sources (manuals, manufacturer, authorities, Wikipedia, simulation forums)
   in the suite's units (kt, ft, ft/min, kg/h). It also gives what the suite already knows (EUROCONTROL, SimBrief,
   current sheet), so that ChatGPT completes it rather than repeats it.
3. Copy ChatGPT's answer (the JSON block) and paste it into the panel's field.
4. Click “Merge with “…”” to complete the aircraft's sheet. A preview shows each value that changes, with one box per
   item. Untick what you do not want to take, then confirm. You can still “Undo” for 10 seconds.

What is reported: unknown keys, and unreadable or out-of-range values, which are discarded. Values that ChatGPT gives
as estimates appear in the table's “Missing” column (“estimated: …”). They stop being estimates as soon as you change
them by hand.

**Several aircraft at once.** Tick their rows (boxes, or Ctrl + click). Then, in the bottom bar, open
“Selection (n) ▾” and choose “Fill in the missing fields (n)”. One question goes out for all the ticked sheets, with
each sheet's empty fields. The answer fills only the empty fields: nothing already entered is replaced, and a summary
per sheet comes before you confirm.

## 4. Check and complete the fields

The “Sheet being edited” card, below the table, shows the open sheet:

- **“Flight regimes — profile ↔ map”**: IAS, vertical speed, engine setting and fuel flow for each phase (climb,
  cruise, descent, taxi, alternate).
- **“Sheet fields”**: every field, in groups (“Identity and format”, “Fuel and operation”, “Climb”, “Cruise”,
  “Descent”…). When EUROCONTROL knows the type, an “APD …” label next to a field offers its value: one click takes it.
  “fill empty fields” takes them all.

Correct what needs correcting, then click **“Save the sheet”** in the bottom bar. “Discard changes” goes back to the
saved sheet.

At the Expert level, also check the **“Engine”** card:

- “Engine map — edit” gives the fuel flow at each engine setting (RPM or N1), with the altitude when the source gives
  it.
- “RPM / power → consumption table” and its curve show the result.
- “Engine interpolation” gives the fuel flow for a setting you enter.

An empty table does not block anything: Fuel then uses the sheet's cruise fuel flow.

## 5. Use the sheet in Fuel

1. Open **Fuel**.
2. The “Aircraft” menu in the header lists the aircraft that have a sheet, those of “My aircraft” first. Choose
   yours.
3. Enter the distance and the level: the fuel plan is computed from the sheet.

At the Expert level, the result shows the sheet read only (the “Flight regimes” group), with “Edit this sheet in
Performance sheets ↗”. When a sheet is saved in Performance sheets open in another tab, Fuel picks it up at once and
recomputes the plan.

## Going further

- The “Performance sheets” chapter of the [user manual](../en/MANUEL_UTILISATEUR.md) describes every block: merging
  several sheets, `.lnmperf` export, the performance folder, calibration on a real SimBrief OFP.
- The “Fuel” chapter of the same manual describes the fuel plan, the level decision and the climb.
