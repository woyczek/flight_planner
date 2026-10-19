# Prompt “Ask ChatGPT for the profile” (Fuel, Performance profiles)

The “Ask ChatGPT” button of the “Performance profiles” block (Fuel page) builds this prompt for an aircraft
type, copies it to the clipboard and opens ChatGPT; the reply (the JSON, or a performance CSV) is pasted under
the button, then imported as a new profile or merged with the existing profile (preview of the changes first).

This document is the **single source** of the prompt: `tools/build_perf_prompt.py` derives
`apps/planner/perf_prompt.js` from it (also rerun by `tools/bump_versions.py`). One ` ```text <language> ` block per
page language (fr, en, de, es); the ` ```json ` block is the schema, common to the four languages.

Placeholders replaced by the page:

| Placeholder | Content |
| --- | --- |
| `{{TYPE}}` | ICAO code of the type |
| `{{MODELE}}` | model (ICAO base, otherwise the profile name) |
| `{{VARIANTE}}` | fleet variant or profile name, fleet registrations |
| `{{MOTORISATION}}` | known powerplant (ICAO description, SimBrief engines, profile) |
| `{{CONNU}}` | what the suite already knows: EUROCONTROL APD, SimBrief, Airframe DB, current profile |
| `{{SCHEMA}}` | the ` ```json ` block below |

Writing rule (the user's choice): **selection rules**, not lists; closed lists only for what the program requires
(the JSON keys, `engineType`, `runwayType`, `phaseLabel`, `unit`).

## Schema

```json
{
  "name": "",
  "icao": "{{TYPE}}",
  "unit": "kg",
  "engineType": "jet | turboprop | piston",
  "pressurized": null,
  "jetFuel": null,
  "usableFuel": null,
  "taxiFuel": null,
  "reserveFuel": null,
  "minRunwayLengthFt": null,
  "runwayType": "HARD | SOFT | WATER",
  "engineCriticalAltFt": null,
  "taxi": { "fuelFlowPerHour": null, "rpmNominal": null },
  "climb": { "iasKt": null, "tasKt": null, "rateFpm": null, "fuelFlowPerHour": null, "rpmNominal": null },
  "cruise": { "iasKt": null, "tasKt": null, "fuelFlowPerHour": null, "ceilingFt": null, "refAltFt": null, "rpmNominal": null },
  "descent": { "iasKt": null, "tasKt": null, "rateFpm": null, "fuelFlowPerHour": null, "rpmNominal": null },
  "rpmPowerReference": "",
  "rpmFuelCurve": [
    { "rpm": null, "altFt": null, "fuelFlowMin": null, "fuelFlowPerHour": null, "fuelFlowMax": null,
      "phaseLabel": "idle | parking | taxi | takeoff | climb | cruise | descent | approach", "comment": "" }
  ],
  "estimated": [],
  "sources": [ { "title": "", "publisher": "", "url": "" } ],
  "notes": ""
}
```

## French

```text fr
PROFIL DE PERFORMANCES — {{TYPE}} ({{MODELE}})

Tu compiles le profil de performances d'un appareil pour un logiciel de préparation des vols en simulation. Appareil : {{MODELE}}, code OACI {{TYPE}}{{VARIANTE}}. Motorisation connue : {{MOTORISATION}}.

Ce que le logiciel sait déjà. Ne le répète pas sans raison : complète ce qui manque, et ne corrige une valeur que si une source meilleure la contredit (dis-le alors dans "notes").
{{CONNU}}

Règles.
1. Sources : rassemble tout ce qui est accessible — manuel de vol et manuel d'exploitation, fiches et brochures du constructeur, documents d'autorité (certificat de type, fiches EASA ou FAA), Wikipédia, documentation des modules de simulation et forums de simulation sérieux. Quand elles divergent, préfère le constructeur ou l'autorité, puis le manuel d'un module de simulation reconnu, puis le reste.
2. Valeurs : celles d'une croisière ordinaire à masse moyenne, en atmosphère standard, pour la variante indiquée — pas les records ni les maxima publicitaires.
3. Unités imposées : vitesses en kt, altitudes en ft, varios en ft/min (descente comprise, en valeur positive), carburant en kg, consommations en kg/h. Convertis les livres, les gallons (densité du carburant du type) et les km/h.
4. Cartographie moteur (rpmFuelCurve) : une ligne par régime ou réglage de puissance documenté (tr/min pour un moteur à pistons ou un rotor, % N1 ou % couple pour une turbine ; dis lequel dans rpmPowerReference), avec la consommation basse, moyenne et haute à ce régime, l'altitude si la source la précise, et la phase de vol prise dans la liste du schéma. Ne fabrique pas de lignes : trois lignes sourcées valent mieux que dix inventées.
5. Incertitude : une valeur estimée, déduite ou peu sûre garde sa place, et son chemin (par exemple "cruise.fuelFlowPerHour" ou "rpmFuelCurve[2].fuelFlowMax") va dans le tableau "estimated". Une valeur introuvable reste null : n'invente rien.
6. Sources citées : chaque document utilisé va dans "sources" (titre, éditeur ou site, adresse si tu l'as).
7. Réponse : le JSON seul, dans un bloc de code, sans texte avant ni après, avec exactement les clés du schéma (aucune clé ajoutée ; une clé sans valeur reste null). Pour engineType, runwayType et phaseLabel, choisis une des valeurs proposées.

Schéma :
{{SCHEMA}}
```

## English

```text en
PERFORMANCE PROFILE — {{TYPE}} ({{MODELE}})

You compile the performance profile of an aircraft for flight-planning software used in simulation. Aircraft: {{MODELE}}, ICAO code {{TYPE}}{{VARIANTE}}. Known powerplant: {{MOTORISATION}}.

What the software already knows. Do not repeat it without reason: fill in what is missing, and only correct a value when a better source contradicts it (then say so in "notes").
{{CONNU}}

Rules.
1. Sources: gather everything available — flight manual and operating manual, manufacturer data sheets and brochures, authority documents (type certificate, EASA or FAA data sheets), Wikipedia, documentation of simulation add-ons and serious simulation forums. When they disagree, prefer the manufacturer or the authority, then the manual of a recognised simulation add-on, then the rest.
2. Values: those of an ordinary cruise at average weight, in standard atmosphere, for the given variant — not records nor advertising maxima.
3. Required units: speeds in kt, altitudes in ft, vertical speeds in ft/min (descent included, as a positive value), fuel in kg, fuel flows in kg/h. Convert pounds, gallons (fuel density of the type) and km/h.
4. Engine map (rpmFuelCurve): one row per documented RPM or power setting (RPM for a piston engine or a rotor, % N1 or % torque for a turbine; say which in rpmPowerReference), with the low, average and high fuel flow at that setting, the altitude if the source gives it, and the flight phase taken from the schema's list. Do not make rows up: three sourced rows are better than ten invented ones.
5. Uncertainty: an estimated, derived or doubtful value keeps its place, and its path (for example "cruise.fuelFlowPerHour" or "rpmFuelCurve[2].fuelFlowMax") goes into the "estimated" array. A value you cannot find stays null: invent nothing.
6. Cited sources: every document used goes into "sources" (title, publisher or site, address if you have it).
7. Answer: the JSON alone, in a code block, with no text before or after, with exactly the schema's keys (no key added; a key without a value stays null). For engineType, runwayType and phaseLabel, choose one of the offered values.

Schema:
{{SCHEMA}}
```

## German

```text de
LEISTUNGSPROFIL — {{TYPE}} ({{MODELE}})

Du stellst das Leistungsprofil eines Luftfahrzeugs für eine Flugvorbereitungssoftware in der Simulation zusammen. Luftfahrzeug: {{MODELE}}, ICAO-Code {{TYPE}}{{VARIANTE}}. Bekannter Antrieb: {{MOTORISATION}}.

Was die Software schon weiß. Wiederhole es nicht ohne Grund: ergänze, was fehlt, und korrigiere einen Wert nur, wenn eine bessere Quelle ihm widerspricht (sag es dann in "notes").
{{CONNU}}

Regeln.
1. Quellen: sammle alles Verfügbare — Flughandbuch und Betriebshandbuch, Datenblätter und Broschüren des Herstellers, Behördendokumente (Musterzulassung, EASA- oder FAA-Datenblätter), Wikipedia, Dokumentation von Simulations-Add-ons und seriöse Simulationsforen. Wenn sie sich widersprechen, bevorzuge den Hersteller oder die Behörde, dann das Handbuch eines anerkannten Simulations-Add-ons, dann den Rest.
2. Werte: die eines gewöhnlichen Reiseflugs bei mittlerer Masse, in Standardatmosphäre, für die angegebene Variante — keine Rekorde und keine Werbe-Höchstwerte.
3. Vorgeschriebene Einheiten: Geschwindigkeiten in kt, Höhen in ft, Steig- und Sinkraten in ft/min (Sinken als positiver Wert), Kraftstoff in kg, Verbrauch in kg/h. Rechne Pfund, Gallonen (Kraftstoffdichte des Typs) und km/h um.
4. Motorkennfeld (rpmFuelCurve): eine Zeile je dokumentierter Drehzahl oder Leistungseinstellung (U/min für Kolbenmotor oder Rotor, % N1 oder % Drehmoment für eine Turbine; sag in rpmPowerReference, welche), mit niedrigem, mittlerem und hohem Verbrauch bei dieser Einstellung, der Höhe, falls die Quelle sie nennt, und der Flugphase aus der Liste des Schemas. Erfinde keine Zeilen: drei belegte Zeilen sind besser als zehn erfundene.
5. Unsicherheit: ein geschätzter, abgeleiteter oder unsicherer Wert bleibt stehen, und sein Pfad (zum Beispiel "cruise.fuelFlowPerHour" oder "rpmFuelCurve[2].fuelFlowMax") kommt in das Feld "estimated". Ein nicht auffindbarer Wert bleibt null: erfinde nichts.
6. Zitierte Quellen: jedes verwendete Dokument kommt in "sources" (Titel, Herausgeber oder Website, Adresse, falls vorhanden).
7. Antwort: nur das JSON, in einem Codeblock, ohne Text davor oder danach, mit genau den Schlüsseln des Schemas (kein zusätzlicher Schlüssel; ein Schlüssel ohne Wert bleibt null). Für engineType, runwayType und phaseLabel wähle einen der angebotenen Werte.

Schema:
{{SCHEMA}}
```

## Spanish

```text es
PERFIL DE RENDIMIENTO — {{TYPE}} ({{MODELE}})

Compilas el perfil de rendimiento de una aeronave para un programa de preparación de vuelos en simulación. Aeronave: {{MODELE}}, código OACI {{TYPE}}{{VARIANTE}}. Motorización conocida: {{MOTORISATION}}.

Lo que el programa ya sabe. No lo repitas sin motivo: completa lo que falta, y corrige un valor solo si una fuente mejor lo contradice (dilo entonces en "notes").
{{CONNU}}

Reglas.
1. Fuentes: reúne todo lo accesible — manual de vuelo y manual de operaciones, fichas y folletos del fabricante, documentos de autoridad (certificado de tipo, fichas EASA o FAA), Wikipedia, documentación de módulos de simulación y foros de simulación serios. Cuando discrepen, prefiere al fabricante o la autoridad, después el manual de un módulo de simulación reconocido, después el resto.
2. Valores: los de un crucero ordinario con masa media, en atmósfera estándar, para la variante indicada — ni récords ni máximos publicitarios.
3. Unidades impuestas: velocidades en kt, altitudes en ft, régimen vertical en ft/min (el descenso también, en valor positivo), combustible en kg, consumos en kg/h. Convierte libras, galones (densidad del combustible del tipo) y km/h.
4. Mapa motor (rpmFuelCurve): una fila por régimen o ajuste de potencia documentado (rpm para un motor de pistón o un rotor, % N1 o % par para una turbina; di cuál en rpmPowerReference), con el consumo bajo, medio y alto en ese régimen, la altitud si la fuente la da, y la fase de vuelo tomada de la lista del esquema. No fabriques filas: tres filas con fuente valen más que diez inventadas.
5. Incertidumbre: un valor estimado, deducido o dudoso conserva su lugar, y su ruta (por ejemplo "cruise.fuelFlowPerHour" o "rpmFuelCurve[2].fuelFlowMax") va en la tabla "estimated". Un valor que no encuentres queda null: no inventes nada.
6. Fuentes citadas: cada documento utilizado va en "sources" (título, editor o sitio, dirección si la tienes).
7. Respuesta: solo el JSON, en un bloque de código, sin texto antes ni después, con exactamente las claves del esquema (ninguna clave añadida; una clave sin valor queda null). Para engineType, runwayType y phaseLabel, elige uno de los valores propuestos.

Esquema:
{{SCHEMA}}
```

## Missing fields of the ticked sheets

"Fill in the missing fields (n)" (bottom bar of the Performance sheets page, ticked rows) asks one question for every
ticked sheet: for each one, what the suite already knows and its empty fields (schema paths whose value is empty, and
the engine map when the sheet has none). The reply gives one entry per sheet (`"sheets"`, each with its `"id"`); only
the empty fields are filled, nothing already entered is overwritten (preview, then "Undo" for 10 s).

One ` ```text <language>-missing ` block per language. Placeholders: `{{NOMBRE}}` (number of sheets), `{{FICHES}}`
(one paragraph per sheet: id, model, ICAO code, known powerplant, what is known, fields to fill), `{{REGLES}}` (rules
1 to 4 of the full prompt of the same language: sources, values, units, engine map), `{{MODELE_REPONSE}}` (the reply
model: `{"sheets": [{"id": …, <the empty fields only>, "estimated": [], "sources": [], "notes": ""}]}`).

```text fr-missing
CHAMPS MANQUANTS — {{NOMBRE}} FICHE(S) DE PERFORMANCES

Tu complètes des fiches de performances d'appareils pour un logiciel de préparation des vols en simulation. Pour chaque fiche, le logiciel donne ce qu'il sait déjà et les champs vides à renseigner. Ne renseigne que ces champs ; ne corrige rien d'autre.

{{FICHES}}

Règles.
{{REGLES}}
5. Une valeur introuvable reste null : n'invente rien. Une valeur estimée, déduite ou peu sûre garde sa place, et son chemin (par exemple "cruise.fuelFlowPerHour") va dans le tableau "estimated" de sa fiche.
6. Chaque document utilisé va dans "sources" de la fiche concernée (titre, éditeur ou site, adresse si tu l'as).
7. Réponse : le JSON seul, dans un bloc de code, sans texte avant ni après, de la forme du modèle ci-dessous : une entrée par fiche dans "sheets", avec son "id" inchangé et exactement les clés de son modèle (aucune clé ajoutée). Pour engineType, runwayType et phaseLabel, choisis une des valeurs proposées.

Modèle de réponse :
{{MODELE_REPONSE}}
```

```text en-missing
MISSING FIELDS — {{NOMBRE}} PERFORMANCE SHEET(S)

You complete aircraft performance sheets for a flight planning program used in simulation. For each sheet, the program gives what it already knows and the empty fields to fill. Fill only those fields; do not correct anything else.

{{FICHES}}

Rules.
{{REGLES}}
5. A value you cannot find stays null: invent nothing. An estimated, derived or uncertain value keeps its place, and its path (for example "cruise.fuelFlowPerHour") goes in the "estimated" array of its sheet.
6. Every document used goes in "sources" of the sheet concerned (title, publisher or site, address if you have it).
7. Reply: the JSON only, in a code block, with no text before or after, shaped like the model below: one entry per sheet in "sheets", with its "id" unchanged and exactly the keys of its model (no key added). For engineType, runwayType and phaseLabel, choose one of the proposed values.

Reply model:
{{MODELE_REPONSE}}
```

```text de-missing
FEHLENDE FELDER — {{NOMBRE}} LEISTUNGSBLATT/-BLÄTTER

Du ergänzt Leistungsblätter von Luftfahrzeugen für ein Flugvorbereitungsprogramm in der Simulation. Für jedes Blatt nennt das Programm, was es schon weiß, und die leeren Felder, die auszufüllen sind. Fülle nur diese Felder aus; korrigiere nichts anderes.

{{FICHES}}

Regeln.
{{REGLES}}
5. Ein nicht auffindbarer Wert bleibt null: erfinde nichts. Ein geschätzter, abgeleiteter oder unsicherer Wert bleibt an seinem Platz, und sein Pfad (zum Beispiel "cruise.fuelFlowPerHour") kommt in das Array "estimated" seines Blatts.
6. Jedes verwendete Dokument kommt in "sources" des betreffenden Blatts (Titel, Herausgeber oder Website, Adresse, falls vorhanden).
7. Antwort: nur das JSON, in einem Codeblock, ohne Text davor oder danach, in der Form des Modells unten: ein Eintrag pro Blatt in "sheets", mit seiner unveränderten "id" und genau den Schlüsseln seines Modells (kein Schlüssel hinzugefügt). Für engineType, runwayType und phaseLabel wähle einen der vorgeschlagenen Werte.

Antwortmodell:
{{MODELE_REPONSE}}
```

```text es-missing
CAMPOS QUE FALTAN — {{NOMBRE}} FICHA(S) DE RENDIMIENTO

Completas fichas de rendimiento de aeronaves para un programa de preparación de vuelos en simulación. Para cada ficha, el programa da lo que ya sabe y los campos vacíos que hay que rellenar. Rellena solo esos campos; no corrijas nada más.

{{FICHES}}

Reglas.
{{REGLES}}
5. Un valor que no encuentres queda null: no inventes nada. Un valor estimado, deducido o poco seguro conserva su lugar, y su ruta (por ejemplo "cruise.fuelFlowPerHour") va en el array "estimated" de su ficha.
6. Cada documento utilizado va en "sources" de la ficha correspondiente (título, editor o sitio, dirección si la tienes).
7. Respuesta: solo el JSON, en un bloque de código, sin texto antes ni después, con la forma del modelo de abajo: una entrada por ficha en "sheets", con su "id" sin cambios y exactamente las claves de su modelo (ninguna clave añadida). Para engineType, runwayType y phaseLabel, elige uno de los valores propuestos.

Modelo de respuesta:
{{MODELE_REPONSE}}
```
