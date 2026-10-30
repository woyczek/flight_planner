# Aircraft

The company's fleet, as the other screens read it: the report (registration → type, callsigns), the map, the CPCO. The performance sheets are in the same screen ("Sheets" tab); the type registry will come.

## How to use it

<a id="aircraft-fleet"></a>**The fleet.** One row per aircraft: registration, type, callsigns, base, "out of service" when it is. The search filters on the registration, the type, a callsign or the base; seven rows are shown, "N more" unfolds the rest. "Add" opens an empty aircraft.

<a id="aircraft-edit"></a>**Editing an aircraft.** A tap on a row opens it: identity (registration, type, variant, operator) and operation (callsigns separated by commas, base, tactical number, in service). Under the fields, a line says what will change ("2 fields changed: base, callsigns"); "Save" writes it. A type the database does not know is kept as typed, and the screen says so. The registration is the key: two aircraft cannot share it. The location the site gives stays as it is. "Retire" asks, then the aircraft leaves the fleet; its performance sheet, if it has one, is kept.

<a id="aircraft-sheets"></a>**The sheets.** The "Sheets" tab lists the performance sheets by family (helicopters, turboprops, jets, pistons, others); the search filters on the name, the type or the registration. Each row says where the sheet comes from, what it lacks and its date; a fleet type without a sheet is offered "to complete". "Import a file" reads a CSV, a JSON, a .lnmperf or a SimBrief OFP; "Paste a text" reads a pasted text, a ChatGPT answer included; "New sheet" asks for the type code. Nothing is written at once: an import first shows, field by field, what would change; untick what you keep, then "Apply the selection". The chosen tab is kept on the device, and the link `#aircraft?sheet=<id>` opens a sheet's editor directly.

<a id="aircraft-sheet-edit"></a>**Editing a sheet.** "Edit" opens the editor: the fields by group (identity, fuel, runway and alternate, climb, cruise, descent, RPM), the RPM / fuel flow table on a large screen, and the EUROCONTROL completion, "complete from another sheet" or the ChatGPT request to fill the empty fields. Under each filled field a muted line gives its origin and date ("lnmperf · 28/10", "edited · 30/10"); hovering it shows the discarded values. "Save" opens the preview of the changes, which are written only after "Apply the selection"; each changed field thus keeps its source, and the old value is kept. "Export .lnmperf" and "Export JSON" download the sheet; "Delete" asks before removing the sheet from the shared database.

## Good to know

- The Site module also updates the fleet from the pasted "Fleet" page of the site: both write the same file, each save reads the file just before and changes one aircraft only.
- Nothing leaves before the next synchronisation.

<!-- fr: 6c68e01d8018 -->
