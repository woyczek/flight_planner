/* =====================================================================================================
   Flight Performance Planner — aide des champs du profil d'appareil
   -----------------------------------------------------------------------------------------------------
   Texte affiché au survol de chaque champ de l'éditeur de profil (libellé et saisie) : ce que le champ
   contient, et comment le devis carburant ou le modèle de performances (flight_performance_model.js)
   s'en sert. Clé = chemin du champ (PROFILE_FIELDS de la page) ; valeur = [fr, en, de, es].
   Appliqué par FlightProfileHelp.annotate(conteneur, langue) après chaque rendu de l'éditeur.
   ===================================================================================================== */
(() => {
  "use strict";
  const H = {
    name: ["Nom affiché du profil (liste des avions, exports).", "Profile display name (aircraft list, exports).",
      "Anzeigename des Profils (Flugzeugliste, Exporte).", "Nombre del perfil (lista de aviones, exportaciones)."
    ],
    icao: [
      "Code OACI du type (ex. A320, S210). Sert à reconnaître la motorisation (mode « auto ») et à retrouver la fiche EUROCONTROL.",
      "ICAO type designator (e.g. A320, S210). Used to detect the engine type (“auto” mode) and to find the EUROCONTROL sheet.",
      "ICAO-Typcode (z. B. A320, S210). Dient zur Erkennung des Antriebs (Modus „auto“) und zum Finden des EUROCONTROL-Blatts.",
      "Código OACI del tipo (p. ej. A320, S210). Sirve para detectar la motorización (modo «auto») y encontrar la ficha EUROCONTROL."
    ],
    description: ["Notes libres sur le profil.", "Free notes about the profile.", "Freie Notizen zum Profil.",
      "Notas libres sobre el perfil."
    ],
    fuelAsVolume: ["Oui : le carburant est compté en volume (litres / gallons) plutôt qu’en masse.",
      "Yes: fuel is counted by volume (litres / gallons) rather than mass.",
      "Ja: Kraftstoff wird als Volumen (Liter / Gallonen) statt Masse gezählt.",
      "Sí: el combustible se cuenta en volumen (litros / galones) en lugar de masa."
    ],
    jetFuel: ["Oui : carburéacteur (Jet A-1). Sans code OACI connu, aide à distinguer turbine et piston.",
      "Yes: jet fuel (Jet A-1). Without a known ICAO code, helps tell turbine from piston.",
      "Ja: Kerosin (Jet A-1). Ohne bekannten ICAO-Code hilft es, Turbine und Kolben zu unterscheiden.",
      "Sí: queroseno (Jet A-1). Sin código OACI conocido, ayuda a distinguir turbina y pistón."
    ],
    usableFuel: ["Carburant utilisable total (capacité). Contrôle que le devis tient dans les réservoirs.",
      "Total usable fuel (capacity). Checks that the plan fits in the tanks.",
      "Gesamter ausfliegbarer Kraftstoff (Kapazität). Prüft, ob der Plan in die Tanks passt.",
      "Combustible utilizable total (capacidad). Comprueba que el plan cabe en los depósitos."
    ],
    taxiFuel: ["Carburant de roulage forfaitaire.", "Fixed taxi fuel.", "Pauschaler Rollkraftstoff.", "Combustible de rodaje fijo."],
    "taxi.rpmNominal": ["Régime (RPM / N1) au roulage : lu dans la table RPM pour le débit.",
      "Taxi setting (RPM / N1): looked up in the RPM table for the fuel flow.",
      "Rolleinstellung (RPM / N1): in der RPM-Tabelle für den Verbrauch nachgeschlagen.",
      "Régimen de rodaje (RPM / N1): se busca en la tabla RPM para el flujo."
    ],
    "taxi.fuelFlowPerHour": ["Débit au roulage ; avec la durée de roulage du devis, donne le carburant de roulage.",
      "Taxi fuel flow; with the taxi time of the plan, gives the taxi fuel.",
      "Rollverbrauch; mit der Rollzeit des Plans ergibt sich der Rollkraftstoff.",
      "Flujo de rodaje; con el tiempo de rodaje del plan da el combustible de rodaje."
    ],
    reserveFuel: ["Réserve finale forfaitaire (sinon : minutes de réserve × débit).",
      "Fixed final reserve (otherwise: reserve minutes × fuel flow).", "Pauschale Endreserve (sonst: Reserveminuten × Verbrauch).",
      "Reserva final fija (si no: minutos de reserva × flujo)."
    ],
    contingencyPercent: ["Pourcentage du carburant d’étape ajouté en contingence.", "Percentage of trip fuel added as contingency.",
      "Prozentsatz des Streckenkraftstoffs als Contingency.", "Porcentaje del combustible de etapa añadido como contingencia."
    ],
    extraFuel: ["Carburant supplémentaire à la discrétion du commandant.", "Extra fuel at the captain’s discretion.",
      "Zusatzkraftstoff nach Ermessen des Kommandanten.", "Combustible adicional a discreción del comandante."
    ],
    minRunwayLengthFt: ["Longueur de piste minimale (ft) ; la fiche EUROCONTROL donne la distance de décollage.",
      "Minimum runway length (ft); the EUROCONTROL sheet gives the take-off distance.",
      "Mindestpistenlänge (ft); das EUROCONTROL-Blatt nennt die Startstrecke.",
      "Longitud mínima de pista (ft); la ficha EUROCONTROL da la distancia de despegue."
    ],
    runwayType: ["Revêtement de piste accepté : dur, souple, eau (hydravion).",
      "Accepted runway surface: hard, soft, water (seaplane).", "Zulässige Pistenoberfläche: hart, weich, Wasser (Wasserflugzeug).",
      "Superficie de pista aceptada: dura, blanda, agua (hidroavión)."
    ],
    "alternate.fuelFlowPerHour": ["Débit pour le vol vers le dégagement.", "Fuel flow for the flight to the alternate.",
      "Verbrauch für den Flug zum Ausweichflughafen.", "Flujo para el vuelo al alternativo."
    ],
    "alternate.tasKt": ["Vitesse vraie vers le dégagement.", "True airspeed to the alternate.",
      "Wahre Geschwindigkeit zum Ausweichflughafen.", "Velocidad verdadera al alternativo."
    ],
    "climb.iasKt": [
      "Badin de montée. Le modèle en déduit la vitesse de traînée minimale (polaire) ; en montée, réacteur : ce Badin puis le Mach de croisière en altitude.",
      "Climb IAS. The model derives the minimum-drag speed (drag polar) from it; jets climb at this IAS, then at cruise Mach at altitude.",
      "Steig-IAS. Das Modell leitet daraus die Geschwindigkeit des Mindestwiderstands ab; Strahlflugzeuge steigen mit dieser IAS, darüber mit Reise-Mach.",
      "IAS de ascenso. El modelo deduce de ella la velocidad de resistencia mínima; los reactores suben a esta IAS y luego al Mach de crucero."
    ],
    "climb.rpmNominal": ["Régime de montée (RPM / N1) : lu dans la table RPM pour le débit de montée.",
      "Climb setting (RPM / N1): looked up in the RPM table for the climb fuel flow.",
      "Steigeinstellung (RPM / N1): in der RPM-Tabelle für den Steigverbrauch nachgeschlagen.",
      "Régimen de ascenso (RPM / N1): se busca en la tabla RPM para el flujo de ascenso."
    ],
    "climb.fuelFlowPerHour": ["Débit moyen en montée. Recale le débit de montée du modèle (facteur borné 0,5–2).",
      "Average climb fuel flow. Adjusts the model’s climb fuel flow (factor bounded 0.5–2).",
      "Mittlerer Steigverbrauch. Passt den Steigverbrauch des Modells an (Faktor 0,5–2).",
      "Flujo medio de ascenso. Ajusta el flujo de ascenso del modelo (factor 0,5–2)."
    ],
    "climb.tasKt": ["Vitesse vraie moyenne en montée ; à défaut de Badin, sert à l’estimer.",
      "Average true airspeed in climb; without IAS, used to estimate it.",
      "Mittlere wahre Steiggeschwindigkeit; ohne IAS dient sie zur Schätzung.",
      "Velocidad verdadera media en ascenso; sin IAS, sirve para estimarla."
    ],
    "climb.rateFpm": [
      "Vario moyen de montée jusqu’à l’altitude de référence. Cale la poussée / puissance du modèle, donc le vario à chaque altitude et le plafond calculé.",
      "Average climb rate up to the reference altitude. Sets the model’s thrust / power, hence the rate at each altitude and the computed ceiling.",
      "Mittlere Steigrate bis zur Bezugshöhe. Bestimmt Schub / Leistung des Modells, also die Steigrate je Höhe und die berechnete Gipfelhöhe.",
      "Régimen medio de ascenso hasta la altitud de referencia. Fija el empuje / potencia del modelo, y por tanto el régimen a cada altitud y el techo calculado."
    ],
    "cruise.iasKt": ["Badin de croisière (information ; le modèle part de la TAS et de l’altitude de référence).",
      "Cruise IAS (information; the model starts from the TAS and the reference altitude).",
      "Reise-IAS (Information; das Modell geht von TAS und Bezugshöhe aus).",
      "IAS de crucero (información; el modelo parte de la TAS y la altitud de referencia)."
    ],
    "cruise.rpmNominal": ["Régime de croisière (RPM / N1) : lu dans la table RPM pour le débit de croisière.",
      "Cruise setting (RPM / N1): looked up in the RPM table for the cruise fuel flow.",
      "Reiseeinstellung (RPM / N1): in der RPM-Tabelle für den Reiseverbrauch nachgeschlagen.",
      "Régimen de crucero (RPM / N1): se busca en la tabla RPM para el flujo de crucero."
    ],
    "cruise.fuelFlowPerHour": ["Débit de croisière à l’altitude de référence. Obligatoire : cale la consommation du modèle.",
      "Cruise fuel flow at the reference altitude. Required: sets the model’s consumption.",
      "Reiseverbrauch auf der Bezugshöhe. Pflicht: bestimmt den Verbrauch des Modells.",
      "Flujo de crucero a la altitud de referencia. Obligatorio: fija el consumo del modelo."
    ],
    "cruise.tasKt": [
      "Vitesse vraie de croisière à l’altitude de référence. Obligatoire : donne le Mach (réacteur) ou la puissance (hélice) de la « croisière du profil ».",
      "Cruise true airspeed at the reference altitude. Required: gives the Mach (jet) or power (propeller) of the “profile cruise”.",
      "Wahre Reisegeschwindigkeit auf der Bezugshöhe. Pflicht: ergibt Mach (Strahl) bzw. Leistung (Propeller) des „Profil-Reiseflugs“.",
      "Velocidad verdadera de crucero a la altitud de referencia. Obligatoria: da el Mach (reactor) o la potencia (hélice) del «crucero del perfil»."
    ],
    "cruise.ceilingFt": [
      "Plafond maximal (ft). Plafonne celui calculé par le modèle (vario résiduel 300 ft/min, 100 pour un piston) ; au-dessus, les niveaux sont refusés.",
      "Maximum ceiling (ft). Caps the ceiling computed by the model (residual rate 300 ft/min, 100 for a piston); levels above are refused.",
      "Maximale Gipfelhöhe (ft). Begrenzt die vom Modell berechnete (Reststeigrate 300 ft/min, 100 beim Kolben); darüber werden Höhen abgelehnt.",
      "Techo máximo (ft). Limita el calculado por el modelo (régimen residual 300 ft/min, 100 para pistón); por encima se rechazan los niveles."
    ],
    "cruise.refAltFt": [
      "Altitude de référence (ft) : celle où la TAS et le débit de croisière ont été relevés (souvent le niveau de croisière habituel). Le modèle s’y cale (Mach, polaire). Vide : déduite de la cohérence montée / croisière ou de la classe d’avion — moins précis.",
      "Reference altitude (ft): where the cruise TAS and fuel flow were measured (often the usual cruise level). The model is calibrated there (Mach, drag polar). Empty: derived from climb / cruise consistency or the aircraft class — less accurate.",
      "Bezugshöhe (ft): Höhe, auf der Reise-TAS und -Verbrauch gemessen wurden (oft die übliche Reiseflughöhe). Das Modell wird dort kalibriert (Mach, Polare). Leer: aus Steig-/Reiseflug-Konsistenz oder Flugzeugklasse abgeleitet — ungenauer.",
      "Altitud de referencia (ft): donde se midieron la TAS y el flujo de crucero (a menudo el nivel de crucero habitual). El modelo se calibra ahí (Mach, polar). Vacía: deducida de la coherencia ascenso / crucero o de la clase de avión — menos precisa."
    ],
    engineCriticalAltFt: [
      "Moteur à pistons suralimenté : altitude de rétablissement (ft), jusqu'à laquelle le compresseur maintient la pleine puissance (DC-3, R-1830 : environ 7 500 ft). Au-dessus, la puissance décroît comme celle d'un moteur atmosphérique. Vide : moteur atmosphérique, la puissance décroît dès le sol.",
      "Supercharged piston engine: critical altitude (ft), up to which the supercharger keeps full power (DC-3, R-1830: about 7,500 ft). Above it, power decreases like a normally aspirated engine. Empty: normally aspirated, power decreases from the ground.",
      "Aufgeladener Kolbenmotor: Volldruckhöhe (ft), bis zu der der Lader die volle Leistung hält (DC-3, R-1830: etwa 7.500 ft). Darüber nimmt die Leistung wie bei einem Saugmotor ab. Leer: Saugmotor, Leistung nimmt ab dem Boden ab.",
      "Motor de pistones sobrealimentado: altitud crítica (ft), hasta la que el compresor mantiene la plena potencia (DC-3, R-1830: unos 7.500 ft). Por encima, la potencia disminuye como en un motor atmosférico. Vacío: motor atmosférico, la potencia disminuye desde el suelo."
    ],
    pressurized: [
      "Cabine pressurisée ? Non : au-dessus de l'altitude sans oxygène (Paramétrage › Planificateur, 10 000 ft par défaut), le graphique d'altitude optimale signale « oxygène requis » (information, le calcul n'est pas limité). Non renseigné : piston non pressurisé, réacteur et turbopropulseur pressurisés.",
      "Pressurised cabin? No: above the altitude without oxygen (Settings › Planner, 10,000 ft by default), the optimum altitude chart shows “oxygen required” (information, the computation is not limited). Not set: piston unpressurised, jet and turboprop pressurised.",
      "Druckkabine? Nein: oberhalb der Höhe ohne Sauerstoff (Einstellungen › Planer, standardmäßig 10.000 ft) zeigt das Diagramm der optimalen Flughöhe „Sauerstoff erforderlich“ (Hinweis, die Berechnung wird nicht begrenzt). Nicht angegeben: Kolben ohne Druckkabine, Strahl und Turboprop mit Druckkabine.",
      "¿Cabina presurizada? No: por encima de la altitud sin oxígeno (Ajustes › Planificador, 10.000 ft por defecto), el gráfico de altitud óptima indica «oxígeno necesario» (información, el cálculo no se limita). Sin indicar: pistón sin presurizar, reactor y turbohélice presurizados."
    ],
    engineType: ["Motorisation du modèle : réacteur, turbopropulseur, piston. « auto » : lue dans le code OACI (L2J → réacteur…).",
      "Engine type used by the model: jet, turboprop, piston. “auto”: read from the ICAO code (L2J → jet…).",
      "Antriebsart des Modells: Strahl, Turboprop, Kolben. „auto“: aus dem ICAO-Code (L2J → Strahl…).",
      "Motorización del modelo: reactor, turbohélice, pistón. «auto»: leída del código OACI (L2J → reactor…)."
    ],
    "descent.iasKt": ["Badin de descente (information).", "Descent IAS (information).", "Sink-IAS (Information).",
      "IAS de descenso (información)."
    ],
    "descent.rpmNominal": ["Régime de descente (RPM / N1) : lu dans la table RPM pour le débit de descente.",
      "Descent setting (RPM / N1): looked up in the RPM table for the descent fuel flow.",
      "Sinkeinstellung (RPM / N1): in der RPM-Tabelle für den Sinkverbrauch nachgeschlagen.",
      "Régimen de descenso (RPM / N1): se busca en la tabla RPM para el flujo de descenso."
    ],
    "descent.fuelFlowPerHour": ["Débit moyen en descente.", "Average descent fuel flow.", "Mittlerer Sinkverbrauch.",
      "Flujo medio de descenso."
    ],
    "descent.tasKt": ["Vitesse vraie moyenne en descente : distance parcourue en descente (TOD).",
      "Average true airspeed in descent: distance covered while descending (TOD).",
      "Mittlere wahre Sinkgeschwindigkeit: im Sinkflug zurückgelegte Strecke (TOD).",
      "Velocidad verdadera media en descenso: distancia recorrida al descender (TOD)."
    ],
    "descent.rateFpm": ["Vario moyen de descente : durée de la descente, donc distance et carburant de descente.",
      "Average descent rate: descent time, hence descent distance and fuel.",
      "Mittlere Sinkrate: Sinkdauer, damit Sinkstrecke und -kraftstoff.",
      "Régimen medio de descenso: duración del descenso, y por tanto distancia y combustible."
    ],
    rpmPowerReference: ["Ce que représente l’axe RPM / N1 de la table (ex. N1 %, RPM hélice, % puissance).",
      "What the table’s RPM / N1 axis stands for (e.g. N1 %, propeller RPM, % power).",
      "Bedeutung der RPM-/N1-Achse der Tabelle (z. B. N1 %, Propeller-RPM, % Leistung).",
      "Qué representa el eje RPM / N1 de la tabla (p. ej. N1 %, RPM de hélice, % potencia)."
    ],
    rpmFuelRaw: ["Données brutes RPM / débit collées (une ligne par régime) ; converties en table à l’enregistrement.",
      "Raw RPM / fuel-flow data pasted (one line per setting); converted to the table on save.",
      "Eingefügte RPM-/Verbrauchsrohdaten (eine Zeile je Einstellung); beim Speichern in die Tabelle umgewandelt.",
      "Datos brutos RPM / flujo pegados (una línea por régimen); convertidos en tabla al guardar."
    ],
    rpmFuelBasis: ["Provenance des valeurs de la table (manuel, SimBrief, mesure en vol…).",
      "Source of the table values (manual, SimBrief, flight measurement…).",
      "Herkunft der Tabellenwerte (Handbuch, SimBrief, Flugmessung…).",
      "Origen de los valores de la tabla (manual, SimBrief, medición en vuelo…)."
    ],
  };
  const LANGS = ["fr", "en", "de", "es"];
  /** Pose le texte d'aide (attribut title) sur chaque champ [data-profile-path] de root, dans la langue lang. */
  function annotate(root, lang) {
    const k = Math.max(0, LANGS.indexOf(lang));
    root?.querySelectorAll("[data-profile-path]").forEach(el => {
      const h = H[el.dataset.profilePath];
      if (!h) return;
      const field = el.closest(".field") || el.parentElement,
        text = window.RepositoryContentI18n?.typography?.(h[k] || h[0], lang) ?? (h[k] || h[0]);
      field.title = text;
      el.title = text;
      field.classList.add("has-help");
    });
  }
  // ---- liens vers un champ (messages d'erreur, limites) ---------------------------------------------------------
  // Cible : chemin d'un champ du profil (« cruise.tasKt », attribut data-profile-path de l'éditeur) ou « #id » d'un
  // champ de la page (#fl, #dist). Un clic déplie l'éditeur de profil s'il est replié, amène le champ au centre de
  // l'écran, lui donne le focus et le fait clignoter.
  const css = document.createElement("style");
  css.textContent =
    ".field-link{color:inherit;text-decoration:underline dotted;text-underline-offset:2px;cursor:pointer}.field-link:hover{text-decoration-style:solid}.field-flash{outline:2px solid #f0b86e!important;outline-offset:2px;transition:outline-color .3s}";
  document.head.append(css);
  const esc = window.RepositoryKit.esc; // échappement HTML commun (shared/kit.js)
  /** Élément d'une cible (chemin du profil ou #id) ; null s'il n'existe pas. */
  const find = t => t.startsWith("#") ? document.querySelector(t) : document.querySelector(`[data-profile-path="${CSS.escape(t)}"]`);
  /** Libellé affiché d'un champ (texte de son <label>), sinon le chemin. */
  function labelOf(t) {
    const el = find(t),
      lab = el?.closest(".field")?.querySelector("label") || (el?.id && document.querySelector(`label[for="${el.id}"]`));
    return (lab?.textContent || t).trim();
  }
  /** Lien HTML vers un champ (label : texte du lien, par défaut le libellé du champ). */
  const link = (t, label) => `<a href="#" class="field-link" data-goto-field="${esc(t)}" title="${esc(labelOf(t))}">${label ?? esc(labelOf(t))}</a>`;
  /** Amène le champ t à l'écran (éditeur de profil déplié au besoin), focus et clignotement. */
  function goto(t) {
    let el = find(t);
    if (el && el.offsetParent === null) {
      const toggle = document.getElementById("toggleProfileEditor");
      if (toggle && el.closest("#profileEditor, [data-block-id='profile-data']")) toggle.click();
      el = find(t);
    }
    if (!el) return false;
    el.scrollIntoView({
      block: "center",
      behavior: "smooth"
    });
    setTimeout(() => el.focus({
      preventScroll: true
    }), 250);
    el.classList.add("field-flash");
    setTimeout(() => el.classList.remove("field-flash"), 2200);
    return true;
  }
  document.addEventListener("click", e => {
    const a = e.target.closest("[data-goto-field]");
    if (!a) return;
    e.preventDefault();
    goto(a.dataset.gotoField);
  });
  window.FlightProfileHelp = {
    texts: H,
    annotate,
    link,
    goto,
    labelOf
  };
})();
