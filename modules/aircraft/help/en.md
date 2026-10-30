# Aircraft

The company's fleet, as the other screens read it: the report (registration → type, callsigns), the map, the CPCO. The performance sheets and the type registry will come in the same screen.

## How to use it

<a id="aircraft-fleet"></a>**The fleet.** One row per aircraft: registration, type, callsigns, base, "out of service" when it is. The search filters on the registration, the type, a callsign or the base; seven rows are shown, "N more" unfolds the rest. "Add" opens an empty aircraft.

<a id="aircraft-edit"></a>**Editing an aircraft.** A tap on a row opens it: identity (registration, type, variant, operator) and operation (callsigns separated by commas, base, tactical number, in service). Under the fields, a line says what will change ("2 fields changed: base, callsigns"); "Save" writes it. A type the database does not know is kept as typed, and the screen says so. The registration is the key: two aircraft cannot share it. The location the site gives stays as it is. "Retire" asks, then the aircraft leaves the fleet; its performance sheet, if it has one, is kept.

## Good to know

- The Site module also updates the fleet from the pasted "Fleet" page of the site: both write the same file, each save reads the file just before and changes one aircraft only.
- Nothing leaves before the next synchronisation.

<!-- fr: 90fe2925dc92 -->
