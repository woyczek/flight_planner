// V3 missions — les textes de l'éditeur de missions écrits par la session « Création de missions » (depuis SOG-0439), en quatre langues
// [fr, en, de, es], et les phrases qui s'en assemblent. Ni page, ni stockage, ni réseau : le module passe son traducteur (`tt`, qui
// accorde les marques « (s) » d'après {n}). Les textes des six premières étapes restent dans module.js (Features SOG).
//
// API :
//   EDTX : les textes — tr… (l'essai des clés, SOG-0444 lot P4) ; dw… (la fiche d'un tiroir, SOG-0445) ; pl… et ok_<sorte> (les objets à trouver dans les Lieux, SOG-0445) ; at… (l'atelier, SOG-0444 : le fil, la carte, le déroulé, la fiche du départ, le pied) ; plRemoveAnyway, plCited, plRemoved, ref_<where> (qui cite un lieu : les `where` de editor.js refsOf), todo_<key>
//     (les mots de « À compléter » des clés que editor.js todo ajoute : deadRef, drawerNoPoint, drawerNoKey, mapNoCentre), at_<where> (le champ qui
//     cite une référence morte).
//   todoText(tt, t) → le mot d'une ligne de « À compléter » nommée (« le tiroir B n'a plus son point de déclenchement… ») ; ''.
//   removedText(tt, row) → « RDV-1 retiré, avec ses citations. »
//   citedText(tt, row, cited) → la phrase dite avant de retirer un lieu encore cité (editor.js removePlace) : « PT1 est encore cité
//     par : la route de la mission · le tiroir B (…). « Retirer quand même » le retire avec ces citations. »

export const EDTX = {
  plRemoveAnyway: ['Retirer quand même', 'Remove anyway', 'Trotzdem entfernen', 'Quitar de todos modos'],
  plCited: ['{id} est encore cité par : {who}. « Retirer quand même » le retire avec ces citations.',
    '{id} is still cited by: {who}. “Remove anyway” removes it with these citations.',
    '{id} wird noch genannt von: {who}. „Trotzdem entfernen“ entfernt den Ort mit diesen Nennungen.',
    '{id} sigue citado por: {who}. «Quitar de todos modos» lo quita con estas citas.'
  ],
  plNoName: ['Ce lieu', 'This place', 'Dieser Ort', 'Este lugar'],
  ref_route: ['la route de la mission', 'the mission route', 'die Route der Mission', 'la ruta de la misión'],
  ref_drawer: ['le tiroir {name} (son point de déclenchement : il ne s\'ouvrira plus qu\'à la main)',
    'drawer {name} (its trigger point: it will only open by hand)',
    'Schublade {name} (ihr Auslösepunkt: sie öffnet sich dann nur noch von Hand)',
    'el cajón {name} (su punto de activación: solo se abrirá a mano)'
  ],
  ref_drawerKey: ['le tiroir {name} (sa clé : il ne s\'ouvrira plus qu\'à la main ou à son heure de repli)',
    'drawer {name} (its key: it will only open by hand or at its fallback time)',
    'Schublade {name} (ihr Schlüssel: sie öffnet sich dann nur noch von Hand oder zu ihrer Ersatzzeit)',
    'el cajón {name} (su llave: solo se abrirá a mano o a su hora de reserva)'
  ],
  ref_drawerActor: ['le tiroir {name} (la cible qui franchit sa zone : ce sera le pilote)',
    'drawer {name} (the target that crosses its zone: it will be the pilot)',
    'Schublade {name} (das Ziel, das ihre Zone durchfliegt: es wird der Pilot sein)',
    'el cajón {name} (el blanco que cruza su zona: será el piloto)'
  ],
  ref_objectRoute: ['la route de la cible {name}', 'the route of target {name}', 'die Route des Ziels {name}',
    'la ruta del blanco {name}'
  ],
  ref_drawerStop: ['les arrêts demandés par le tiroir {name}', 'the stops required by drawer {name}',
    'die von Schublade {name} verlangten Halte', 'las paradas que pide el cajón {name}'
  ],
  ref_drawerRoute: ['la suite de route du tiroir {name}', 'the onward route of drawer {name}', 'die Folgeroute der Schublade {name}',
    'la ruta siguiente del cajón {name}'
  ],
  ref_map: ['la carte « {name} » (son centre)', 'the map “{name}” (its centre)', 'die Karte „{name}“ (ihr Mittelpunkt)',
    'el mapa «{name}» (su centro)'
  ],
  ref_event: ['{n} événement(s) de la chronologie', '{n} event(s) of the timeline', '{n} Ereignis(se) der Chronologie',
    '{n} evento(s) de la cronología'
  ],
  ref_profile: ['le profil vertical', 'the vertical profile', 'das Höhenprofil', 'el perfil vertical'],
  ref_alert: ['la route de l\'alerte {name}', 'the route of alert {name}', 'die Route des Alarms {name}', 'la ruta de la alerta {name}'],
  plRemoved: ['{id} retiré, avec ses citations.', '{id} removed, with its citations.', '{id} entfernt, mit seinen Nennungen.',
    '{id} quitado, con sus citas.'
  ],
  // « À compléter » nomme (l'ergonome, 17 nov.) : le champ qui cite et l'identifiant absent, le tiroir, la carte
  todo_deadRef: ['{who} cite {id}, un lieu qui n\'existe pas', '{who} cites {id}, a place that does not exist',
    '{who} nennt {id}, einen Ort, den es nicht gibt', '{who} cita {id}, un lugar que no existe'
  ],
  todo_drawerNoPoint: ['le tiroir {name} n\'a plus son point de déclenchement (il ne s\'ouvre plus qu\'à la main)',
    'drawer {name} no longer has its trigger point (it only opens by hand)',
    'Schublade {name} hat ihren Auslösepunkt nicht mehr (sie öffnet sich nur noch von Hand)',
    'el cajón {name} ya no tiene su punto de activación (solo se abre a mano)'
  ],
  todo_drawerNoKey: ['le tiroir {name} n\'a plus sa clé (il ne s\'ouvre qu\'à la main ou à son heure de repli)',
    'drawer {name} no longer has its key (it only opens by hand or at its fallback time)',
    'Schublade {name} hat ihren Schlüssel nicht mehr (sie öffnet sich nur von Hand oder zu ihrer Ersatzzeit)',
    'el cajón {name} ya no tiene su llave (solo se abre a mano o a su hora de reserva)'
  ],
  todo_uncited_zone: ['La zone {id} n\'est citée nulle part : le pilote ne la verra pas',
    'Zone {id} is cited nowhere: the pilot will not see it',
    'Die Zone {id} wird nirgends genannt: der Pilot wird sie nicht sehen',
    'La zona {id} no se cita en ninguna parte: el piloto no la verá'
  ],
  todo_uncited_object: ['L\'objet {id} n\'est cité nulle part : le pilote ne le verra pas',
    'Object {id} is cited nowhere: the pilot will not see it',
    'Das Objekt {id} wird nirgends genannt: der Pilot wird es nicht sehen',
    'El objeto {id} no se cita en ninguna parte: el piloto no lo verá'
  ],
  todo_uncited_pt: ['Le point {id} n\'est cité nulle part : le pilote ne le verra pas',
    'Point {id} is cited nowhere: the pilot will not see it',
    'Der Punkt {id} wird nirgends genannt: der Pilot wird ihn nicht sehen',
    'El punto {id} no se cita en ninguna parte: el piloto no lo verá'
  ],
  todo_uncited_rdv: ['Le rendez-vous {id} n\'est cité nulle part : le pilote ne le verra pas',
    'Rendezvous {id} is cited nowhere: the pilot will not see it',
    'Der Treffpunkt {id} wird nirgends genannt: der Pilot wird ihn nicht sehen',
    'El punto de encuentro {id} no se cita en ninguna parte: el piloto no lo verá'
  ],
  todo_uncited_target: ['La cible {id} n\'est citée nulle part : le pilote ne la verra pas',
    'Target {id} is cited nowhere: the pilot will not see it',
    'Das Ziel {id} wird nirgends genannt: der Pilot wird es nicht sehen',
    'El objetivo {id} no se cita en ninguna parte: el piloto no lo verá'
  ],
  todo_mapNoCentre: ['la carte {name} n\'a plus de centre', 'map {name} no longer has a centre',
    'die Karte {name} hat keinen Mittelpunkt mehr', 'el mapa {name} ya no tiene centro'
  ],
  // les objets à trouver dans les Lieux (SOG-0445) : la pastille, la fiche, « caché au pilote », « clé du tiroir n »
  plObject: ['OBJ', 'OBJ', 'OBJ', 'OBJ'],
  plAddObject: ['+ Objet à trouver', '+ Object to find', '+ Zu findendes Objekt', '+ Objeto por encontrar'],
  plObjectHint: ['identifiant donné par l\'atelier ; un tiroir le cite comme clé.',
    'identifier given by the workshop; a drawer cites it as its key.',
    'Kennung von der Werkstatt vergeben; eine Schublade nennt sie als Schlüssel.',
    'identificador dado por el taller; un cajón lo cita como llave.'
  ],
  plOKind: ['Sorte d\'objet', 'Kind of object', 'Art des Objekts', 'Tipo de objeto'],
  ok_wreck: ['épave', 'wreck', 'Wrack', 'restos'],
  ok_raft: ['radeau', 'raft', 'Rettungsinsel', 'balsa'],
  ok_person: ['personne', 'person', 'Person', 'persona'],
  ok_vehicle: ['véhicule', 'vehicle', 'Fahrzeug', 'vehículo'],
  ok_container: ['conteneur', 'container', 'Container', 'contenedor'],
  ok_ship: ['navire', 'ship', 'Schiff', 'buque'],
  ok_smoke: ['fumée', 'smoke', 'Rauch', 'humo'],
  ok_aircraft: ['aéronef', 'aircraft', 'Luftfahrzeug', 'aeronave'],
  plRange: ['Portée de détection (NM)', 'Detection range (NM)', 'Erfassungsreichweite (NM)', 'Alcance de detección (NM)'],
  plHeight: ['Hauteur de détection (ft)', 'Detection height (ft)', 'Erfassungshöhe (ft)', 'Altura de detección (ft)'],
  plAlt: ['Altitude de l\'objet (ft)', 'Altitude of the object (ft)', 'Höhe des Objekts (ft)', 'Altitud del objeto (ft)'],
  plHeights: ['Hauteur — facultatif', 'Height — optional', 'Höhe — optional', 'Altura — opcional'],
  plHeightsOf: ['Hauteur', 'Height', 'Höhe', 'Altura'],
  plHeightIs: ['détection à {h} ft près', 'detection within {h} ft', 'Erfassung innerhalb von {h} ft', 'detección a menos de {h} ft'],
  plAltIs: ['objet à {a} ft', 'object at {a} ft', 'Objekt auf {a} ft', 'objeto a {a} ft'],
  plConfirm: ['Trouvé seulement quand le pilote le déclare (« Objet en vue »)',
    'Found only when the pilot declares it (« Object in sight »)',
    'Erst gefunden, wenn der Pilot es meldet („Objekt in Sicht“)', 'Encontrado solo cuando el piloto lo declara («Objeto a la vista»)'
  ],
  plHidden: ['caché au pilote', 'hidden from the pilot', 'für den Piloten verborgen', 'oculto al piloto'],
  plRangeIs: ['portée {r} NM', 'range {r} NM', 'Reichweite {r} NM', 'alcance {r} NM'],
  plMoving: ['cible mobile, gardée telle quelle', 'moving target, kept as it is', 'bewegliches Ziel, unverändert',
    'blanco móvil, conservado tal cual'
  ],
  plKeyOf: ['clé du tiroir {name}', 'key of drawer {name}', 'Schlüssel der Schublade {name}', 'llave del cajón {name}'],
  plNoDrawer: ['aucun tiroir ne le cite', 'no drawer cites it', 'keine Schublade nennt es', 'ningún cajón lo cita'],
  // la fiche d'un tiroir (SOG-0445) : le déroulé, les trois groupes (la clé, les textes, la suite de route), « à compléter », la clé
  // dite en clair (`trigger`, que le pilote lit sur le tiroir fermé : des mots qui ne nomment ni la zone ni l'objet)
  dwAdd: ['＋ Tiroir', '＋ Drawer', '＋ Schublade', '＋ Cajón'],
  dwMax: ['Douze tiroirs au plus.', 'Twelve drawers at most.', 'Höchstens zwölf Schubladen.', 'Doce cajones como máximo.'],
  dwSheet: ['Tiroir {n} — scellé jusqu\'à ce que sa clé joue', 'Drawer {n} — sealed until its key plays',
    'Schublade {n} — versiegelt, bis ihr Schlüssel greift',
    'Cajón {n} — sellado hasta que su llave actúe'
  ],
  dwGrpKey: ['La clé', 'The key', 'Der Schlüssel', 'La llave'],
  dwGrpTexts: ['Les textes', 'The texts', 'Die Texte', 'Los textos'],
  dwGrpRoute: ['La suite de route', 'The onward route', 'Die Folgeroute', 'La ruta siguiente'],
  dwKey: ['Ce qui ouvre le tiroir', 'What opens the drawer', 'Was die Schublade öffnet', 'Lo que abre el cajón'],
  dwKey_hand: ['le geste du pilote seul', 'the pilot\'s gesture alone', 'nur die Geste des Piloten', 'solo el gesto del piloto'],
  dwKey_time: ['une heure', 'an hour', 'eine Uhrzeit', 'una hora'],
  dwKey_zone: ['une zone de passage', 'a passage zone', 'eine Durchflugzone', 'una zona de paso'],
  dwKey_object: ['un objet à trouver', 'an object to find', 'ein zu findendes Objekt', 'un objeto por encontrar'],
  dwKey_arrival: ['l\'arrivée au terrain', 'the arrival at the aerodrome', 'die Ankunft am Platz', 'la llegada al aeródromo'],
  dwKey_kept: ['une clé gardée telle quelle', 'a key kept as it is', 'ein unverändert belassener Schlüssel',
    'una llave conservada tal cual'
  ],
  dwKept: ['Cette clé ne s\'édite pas encore ici ({why}) : elle est gardée telle quelle. Choisir une autre clé la remplace.',
    'This key cannot be edited here yet ({why}): it is kept as it is. Choosing another key replaces it.',
    'Dieser Schlüssel lässt sich hier noch nicht bearbeiten ({why}): er bleibt unverändert. Ein anderer Schlüssel ersetzt ihn.',
    'Esta llave aún no se modifica aquí ({why}): se conserva tal cual. Elegir otra llave la sustituye.'
  ],
  dwWhy_several: ['plusieurs clés écrites', 'several keys written', 'mehrere Schlüssel geschrieben', 'varias llaves escritas'],
  dwWhy_inPart: ['zone ou objet écrits dans le tiroir', 'zone or object written inside the drawer',
    'Zone oder Objekt in der Schublade geschrieben',
    'zona u objeto escritos en el cajón'
  ],
  dwWhy_actor: ['une cible franchit la zone', 'a target crosses the zone', 'ein Ziel durchfliegt die Zone', 'un blanco cruza la zona'],
  dwWhy_condition: ['une condition de vol', 'a flight condition', 'eine Flugbedingung', 'una condición de vuelo'],
  dwWhy_escort: ['une arrivée après un suivi', 'an arrival after a following', 'eine Ankunft nach einer Verfolgung',
    'una llegada tras un seguimiento'
  ],
  dwHandHint: ['Le pilote l\'ouvre par « Ouvrir le tiroir ».', 'The pilot opens it by « Open the drawer ».',
    'Der Pilot öffnet sie mit „Schublade öffnen“.',
    'El piloto lo abre con «Abrir el cajón».'
  ],
  dwPoint: ['Au passage de', 'When passing', 'Beim Passieren von', 'Al pasar por'],
  dwAtTakeoff: ['le décollage', 'the take-off', 'der Start', 'el despegue'],
  dwDelay: ['Délai (min)', 'Delay (min)', 'Verzögerung (min)', 'Retraso (min)'],
  dwZone: ['Zone de la mission', 'Zone of the mission', 'Zone der Mission', 'Zona de la misión'],
  // SOG-0459 : décochée par défaut — la zone de passage d'un tiroir fermé est cachée au pilote
  dwShown: ['Montrer cette zone au pilote dès le départ', 'Show this zone to the pilot from the departure',
    'Diese Zone dem Piloten ab dem Start zeigen',
    'Mostrar esta zona al piloto desde la salida'
  ],
  dwObject: ['Objet de la mission', 'Object of the mission', 'Objekt der Mission', 'Objeto de la misión'],
  dwNoZone: ['Aucune zone dans cette mission — créez-la dans les Lieux.', 'No zone in this mission — create it in the Places.',
    'Keine Zone in dieser Mission — legen Sie sie in den Orten an.', 'Ninguna zona en esta misión — créela en los Lugares.'
  ],
  dwNoObject: ['Aucun objet dans cette mission — créez-le dans les Lieux.', 'No object in this mission — create it in the Places.',
    'Kein Objekt in dieser Mission — legen Sie es in den Orten an.', 'Ningún objeto en esta misión — créelo en los Lugares.'
  ],
  dwToPlaces: ['Ouvrir les Lieux', 'Open the Places', 'Orte öffnen', 'Abrir los Lugares'],
  dwLineNoTitle: ['sans titre', 'no title', 'kein Titel', 'sin título'],
  dwLineMsg: ['message de {n} signe(s)', 'message of {n} sign(s)', 'Nachricht mit {n} Zeichen', 'mensaje de {n} signo(s)'],
  dwLineBrief: ['briefing de {n} signe(s)', 'briefing of {n} sign(s)', 'Briefing mit {n} Zeichen', 'briefing de {n} signo(s)'],
  dwLineNoRoute: ['aucune suite', 'no onward route', 'keine Folgeroute', 'sin ruta siguiente'],
  dwChoose: ['Choisir…', 'Choose…', 'Wählen…', 'Elegir…'],
  dwArrPoint: ['Terrain ou lieu', 'Aerodrome or place', 'Platz oder Ort', 'Aeródromo o lugar'],
  dwDest: ['l\'arrivée', 'the arrival', 'die Ankunft', 'la llegada'],
  dwDep: ['le départ', 'the departure', 'der Abflug', 'la salida'],
  dwArrRadius: ['Rayon (NM)', 'Radius (NM)', 'Radius (NM)', 'Radio (NM)'],
  dwArrSpeed: ['Vitesse maximale (kt)', 'Maximum speed (kt)', 'Höchstgeschwindigkeit (kt)', 'Velocidad máxima (kt)'],
  dwArrGround: ['Posé au sol', 'Landed, on the ground', 'Gelandet, am Boden', 'Posado en tierra'],
  dwStops: ['Arrêts à faire avant l\'arrivée', 'Stops to make before the arrival', 'Halte vor der Ankunft',
    'Paradas antes de la llegada'
  ],
  dwStopAdd: ['Ajouter un arrêt…', 'Add a stop…', 'Halt hinzufügen…', 'Añadir una parada…'],
  dwStopDel: ['Retirer l\'arrêt {id}', 'Remove the stop {id}', 'Halt {id} entfernen', 'Quitar la parada {id}'],
  dwGrpPilot: ['Ce que le pilote voit', 'What the pilot sees', 'Was der Pilot sieht', 'Lo que ve el piloto'],
  // SOG-0459 : un tiroir fermé ne se montre pas au pilote — ni titre, ni clé, ni compte
  dwPilotLine: ['rien avant l\'ouverture, puis le tiroir ouvert', 'nothing before the opening, then the open drawer',
    'nichts vor dem Öffnen, dann die offene Schublade', 'nada antes de la apertura, luego el cajón abierto'
  ],
  dwPilotBefore: ['Avant l\'ouverture', 'Before the opening', 'Vor dem Öffnen', 'Antes de la apertura'],
  dwPilotNothing: ['Rien : le pilote ne sait pas que ce tiroir existe — ni titre, ni clé, ni compte.',
    'Nothing: the pilot does not know this drawer exists — no title, no key, no count.',
    'Nichts: Der Pilot weiß nicht, dass es diese Schublade gibt — kein Titel, kein Schlüssel, keine Zahl.',
    'Nada: el piloto no sabe que este cajón existe — ni título, ni llave, ni recuento.'
  ],
  dwPilotAfter: ['Après — tiroir ouvert', 'After — drawer open', 'Nachher — Schublade offen', 'Después — cajón abierto'],
  dwPilotNoMsg: ['(aucun message)', '(no message)', '(keine Nachricht)', '(ningún mensaje)'],
  dwPilotRoute: ['Suite de route proposée : {r}', 'Onward route proposed: {r}', 'Vorgeschlagene Folgeroute: {r}',
    'Ruta siguiente propuesta: {r}'
  ],
  dwFallback: ['Heure de repli (min après le décollage)', 'Fallback time (min after take-off)', 'Ersatzzeit (min nach dem Start)',
    'Hora de reserva (min tras el despegue)'
  ],
  dwFallbackHint: ['Sans position reçue de l\'avion, le tiroir s\'ouvre à cette heure.',
    'Without a position received from the aircraft, the drawer opens at that time.',
    'Ohne empfangene Position des Luftfahrzeugs öffnet sich die Schublade zu dieser Zeit.',
    'Sin posición recibida de la aeronave, el cajón se abre a esa hora.'
  ],
  dwTitle: ['Titre', 'Title', 'Titel', 'Título'],
  dwTitleHint: ['Le pilote le lit sur le tiroir fermé : restez neutre si la suite doit surprendre.',
    'The pilot reads it on the closed drawer: stay neutral if what follows must surprise.',
    'Der Pilot liest ihn auf der geschlossenen Schublade: bleiben Sie neutral, wenn das Folgende überraschen soll.',
    'El piloto lo lee en el cajón cerrado: sea neutro si lo que sigue debe sorprender.'
  ],
  dwMessage: ['Message à l\'ouverture', 'Message at the opening', 'Nachricht beim Öffnen', 'Mensaje a la apertura'],
  dwBrief: ['Briefing du tiroir', 'Briefing of the drawer', 'Briefing der Schublade', 'Briefing del cajón'],
  dwRouteHint: ['Les lieux que le pilote rejoint après l\'ouverture, dans l\'ordre.',
    'The places the pilot joins after the opening, in order.',
    'Die Orte, die der Pilot nach dem Öffnen anfliegt, der Reihe nach.', 'Los lugares que el piloto alcanza tras la apertura, en orden.'
  ],
  dwRouteNone: ['Aucune suite : la route de la mission continue.', 'No onward route: the mission route goes on.',
    'Keine Folgeroute: die Route der Mission geht weiter.', 'Sin ruta siguiente: la ruta de la misión continúa.'
  ],
  dwRouteAdd: ['Ajouter un lieu…', 'Add a place…', 'Ort hinzufügen…', 'Añadir un lugar…'],
  dwChipDel: ['Retirer {id} de la suite', 'Remove {id} from the onward route', '{id} aus der Folgeroute entfernen',
    'Quitar {id} de la ruta siguiente'
  ],
  dwRemove: ['Retirer ce tiroir', 'Remove this drawer', 'Diese Schublade entfernen', 'Quitar este cajón'],
  dwRemoved: ['Tiroir retiré ; les suivants ont pris son rang.', 'Drawer removed; the following ones took its rank.',
    'Schublade entfernt; die folgenden sind aufgerückt.', 'Cajón quitado; los siguientes han tomado su rango.'
  ],
  dwTodoOf: ['Tiroir {name} : {what}', 'Drawer {name}: {what}', 'Schublade {name}: {what}', 'Cajón {name}: {what}'],
  dwTodo_noMessage: ['sans message', 'no message', 'keine Nachricht', 'sin mensaje'],
  dwTodo_noBrief: ['sans briefing', 'no briefing', 'kein Briefing', 'sin briefing'],
  dwTodo_noFallback: ['clé sans heure de repli', 'key without a fallback time', 'Schlüssel ohne Ersatzzeit', 'llave sin hora de reserva'],
  dwTodo_keyUnread: ['clé illisible (il ne s\'ouvre qu\'à la main)', 'unreadable key (it only opens by hand)',
    'unlesbarer Schlüssel (sie öffnet sich nur von Hand)', 'llave ilegible (solo se abre a mano)'
  ],
  dwTodo_routeUnknown: ['suite de route vers un lieu absent', 'onward route to an absent place', 'Folgeroute zu einem fehlenden Ort',
    'ruta siguiente hacia un lugar ausente'
  ],
  dwSaid_time: ['{n} min après {p}', '{n} min after {p}', '{n} min nach {p}', '{n} min después de {p}'],
  dwSaid_time0: ['au passage de {p}', 'when passing {p}', 'beim Passieren von {p}', 'al pasar por {p}'],
  dwSaid_zone: ['au passage d\'une zone', 'when crossing a zone', 'beim Durchflug einer Zone', 'al cruzar una zona'],
  dwSaid_object: ['quand l\'objet est trouvé', 'when the object is found', 'wenn das Objekt gefunden ist',
    'cuando se encuentra el objeto'
  ],
  dwSaid_arrival: ['à l\'arrivée', 'on arrival', 'bei der Ankunft', 'a la llegada'],
  dwSaid_hand: ['au geste du pilote', 'at the pilot\'s gesture', 'auf die Geste des Piloten', 'al gesto del piloto'],
  // l'essai des clés (SOG-0444, lot P4) : le volet, les cartes du déroulé pendant l'essai, le journal en phrases (les faits viennent de
  // editor_trial.js : trOpen_<how>, trUnknown_<why>, trEv_<ev>)
  trBtn: ['Essayer les clés', 'Try the keys', 'Schlüssel ausprobieren', 'Probar las llaves'],
  trClose: ['Fermer l\'essai', 'Close the trial', 'Versuch schließen', 'Cerrar la prueba'],
  trTitle: ['Essai des clés', 'Trial of the keys', 'Versuch der Schlüssel', 'Prueba de las llaves'],
  trHint: [
    'Sans simulateur : l\'avion suit la route du départ, avancez le temps. Le même calcul que le vol ; rien n\'est écrit dans la mission.',
    'Without a simulator: the aircraft follows the route of the departure, move the time. The same computation as the flight; nothing is written in the mission.',
    'Ohne Simulator: das Luftfahrzeug folgt der Route des Abflugs, bewegen Sie die Zeit. Dieselbe Berechnung wie im Flug; nichts wird in die Mission geschrieben.',
    'Sin simulador: la aeronave sigue la ruta de la salida, avance el tiempo. El mismo cálculo que el vuelo; nada se escribe en la misión.'
  ],
  trTime: ['Temps depuis le décollage', 'Time since take-off', 'Zeit seit dem Start', 'Tiempo desde el despegue'],
  trAt: ['H + {m} min', 'H + {m} min', 'H + {m} min', 'H + {m} min'],
  trAlt: ['Altitude de l\'avion (ft)', 'Altitude of the aircraft (ft)', 'Höhe des Luftfahrzeugs (ft)', 'Altitud de la aeronave (ft)'],
  trSpeed: ['Vitesse (kt)', 'Speed (kt)', 'Geschwindigkeit (kt)', 'Velocidad (kt)'],
  trDeclares: ['Le pilote dit « Objet en vue » dès qu\'il est à portée',
    'The pilot says « Object in sight » as soon as he is within range',
    'Der Pilot meldet „Objekt in Sicht“, sobald er in Reichweite ist', 'El piloto dice «Objeto a la vista» en cuanto está al alcance'
  ],
  trHandBtn: ['Ouvrir à la main le tiroir {n}', 'Open drawer {n} by hand', 'Schublade {n} von Hand öffnen', 'Abrir a mano el cajón {n}'],
  trHandNone: ['Tous les tiroirs sont ouverts', 'Every drawer is open', 'Alle Schubladen sind offen', 'Todos los cajones están abiertos'],
  trReset: ['Recommencer', 'Start again', 'Neu beginnen', 'Volver a empezar'],
  trOpenAt: ['ouvert à H + {m} min', 'open at H + {m} min', 'offen bei H + {m} min', 'abierto a H + {m} min'],
  trClosed: ['fermé', 'closed', 'geschlossen', 'cerrado'],
  trNoRoute: ['Pas d\'essai : la mission n\'a pas de route à suivre (un départ et une arrivée situés).',
    'No trial: the mission has no route to follow (a departure and an arrival with a position).',
    'Kein Versuch: die Mission hat keine Route (Abflug und Ankunft mit Position).',
    'Sin prueba: la misión no tiene ruta que seguir (una salida y una llegada situadas).'
  ],
  trStart: ['départ ; {n} tiroir(s) fermé(s)', 'departure; {n} drawer(s) closed', 'Abflug; {n} Schublade(n) geschlossen',
    'salida; {n} cajón(es) cerrado(s)'
  ],
  trOpen_zone: ['entrée dans la zone : le tiroir {n} s\'ouvre', 'zone entered: drawer {n} opens',
    'Zone erreicht: Schublade {n} öffnet sich',
    'entrada en la zona: el cajón {n} se abre'
  ],
  trOpen_object: ['objet trouvé : le tiroir {n} s\'ouvre', 'object found: drawer {n} opens', 'Objekt gefunden: Schublade {n} öffnet sich',
    'objeto encontrado: el cajón {n} se abre'
  ],
  trOpen_arrival: ['arrivée posée : le tiroir {n} s\'ouvre', 'landed at the arrival: drawer {n} opens',
    'gelandet: Schublade {n} öffnet sich',
    'llegada posada: el cajón {n} se abre'
  ],
  trOpen_time: ['heure atteinte : le tiroir {n} s\'ouvre', 'hour reached: drawer {n} opens',
    'Uhrzeit erreicht: Schublade {n} öffnet sich',
    'hora alcanzada: el cajón {n} se abre'
  ],
  trOpen_fallback: ['heure de repli : le tiroir {n} s\'ouvre', 'fallback time: drawer {n} opens', 'Ersatzzeit: Schublade {n} öffnet sich',
    'hora de reserva: el cajón {n} se abre'
  ],
  trOpen_hand: ['ouvert à la main : le tiroir {n} s\'ouvre', 'opened by hand: drawer {n} opens',
    'von Hand geöffnet: Schublade {n} öffnet sich',
    'abierto a mano: el cajón {n} se abre'
  ],
  trEv_route: ['la suite de route du tiroir {n} est prise — en vol, le pilote la prend d\'un geste',
    'the onward route of drawer {n} is taken — in flight, the pilot takes it by a gesture',
    'die Folgeroute der Schublade {n} wird genommen — im Flug nimmt der Pilot sie mit einer Geste',
    'se toma la ruta siguiente del cajón {n} — en vuelo, el piloto la toma con un gesto'
  ],
  trEv_near: ['à portée de l\'objet du tiroir {n} : il reste fermé tant que le pilote ne dit pas « Objet en vue »',
    'within range of the object of drawer {n}: it stays closed until the pilot says « Object in sight »',
    'in Reichweite des Objekts der Schublade {n}: sie bleibt geschlossen, bis der Pilot „Objekt in Sicht“ meldet',
    'al alcance del objeto del cajón {n}: sigue cerrado hasta que el piloto diga «Objeto a la vista»'
  ],
  trEv_ceiling: ['dans la zone du tiroir {n}, mais au-dessus de son plafond : il reste fermé',
    'in the zone of drawer {n}, but above its ceiling: it stays closed',
    'in der Zone der Schublade {n}, aber über ihrer Obergrenze: sie bleibt geschlossen',
    'en la zona del cajón {n}, pero por encima de su techo: sigue cerrado'
  ],
  trEv_stops: ['arrivé, mais sans les arrêts demandés : le tiroir {n} reste fermé',
    'arrived, but without the required stops: drawer {n} stays closed',
    'angekommen, aber ohne die verlangten Halte: Schublade {n} bleibt geschlossen',
    'llegado, pero sin las paradas pedidas: el cajón {n} sigue cerrado'
  ],
  trEv_unjudged: ['tiroir {n} : sa clé n\'est pas encore jugée en vol — il s\'ouvrira à son heure de repli ou à la main',
    'drawer {n}: its key is not judged in flight yet — it will open at its fallback time or by hand',
    'Schublade {n}: ihr Schlüssel wird im Flug noch nicht bewertet — sie öffnet sich zu ihrer Ersatzzeit oder von Hand',
    'cajón {n}: su llave aún no se juzga en vuelo — se abrirá a su hora de reserva o a mano'
  ],
  trEv_unread: ['tiroir {n} : sa clé ne se lit pas — il ne s\'ouvre qu\'à la main ou à son heure de repli',
    'drawer {n}: its key cannot be read — it only opens by hand or at its fallback time',
    'Schublade {n}: ihr Schlüssel ist nicht lesbar — sie öffnet sich nur von Hand oder zu ihrer Ersatzzeit',
    'cajón {n}: su llave no se lee — solo se abre a mano o a su hora de reserva'
  ],
  trEv_hand: ['tiroir {n} : à ouvrir à la main', 'drawer {n}: to be opened by hand', 'Schublade {n}: von Hand zu öffnen',
    'cajón {n}: se abre a mano'
  ],
  // « placé », jamais « posé » : pour un pilote, « posé » veut dire atterri, et la clé « arrivée » le dit déjà (l'ergonome, 18 nov.)
  trEv_put: ['l\'avion est placé à la main', 'the aircraft is placed by hand', 'das Luftfahrzeug wird von Hand gesetzt',
    'la aeronave se pone a mano'
  ],
  trOrder_object: ['à portée de l\'objet du tiroir {n} : rien ne s\'ouvre, le tiroir {first} d\'abord',
    'within range of the object of drawer {n}: nothing opens, drawer {first} first',
    'in Reichweite des Objekts der Schublade {n}: nichts öffnet sich, zuerst Schublade {first}',
    'al alcance del objeto del cajón {n}: nada se abre, primero el cajón {first}'
  ],
  trOrder_zone: ['dans la zone du tiroir {n} : rien ne s\'ouvre, le tiroir {first} d\'abord',
    'in the zone of drawer {n}: nothing opens, drawer {first} first',
    'in der Zone der Schublade {n}: nichts öffnet sich, zuerst Schublade {first}',
    'en la zona del cajón {n}: nada se abre, primero el cajón {first}'
  ],
  trEv_landed: ['posé à l\'arrivée', 'landed at the arrival', 'an der Ankunft gelandet', 'posado en la llegada'],
  trUnknown_alt: ['tiroir {n} : inconnu — il manque l\'altitude de l\'avion (la zone a un plafond)',
    'drawer {n}: unknown — the altitude of the aircraft is missing (the zone has a ceiling)',
    'Schublade {n}: unbekannt — die Höhe des Luftfahrzeugs fehlt (die Zone hat eine Obergrenze)',
    'cajón {n}: desconocido — falta la altitud de la aeronave (la zona tiene techo)'
  ],
  trUnknown_height: ['tiroir {n} : inconnu — il manque la hauteur de l\'avion au-dessus de l\'objet',
    'drawer {n}: unknown — the height of the aircraft above the object is missing',
    'Schublade {n}: unbekannt — die Höhe des Luftfahrzeugs über dem Objekt fehlt',
    'cajón {n}: desconocido — falta la altura de la aeronave sobre el objeto'
  ],
  trUnknown_ground: ['tiroir {n} : inconnu — on ne sait pas si l\'avion est posé',
    'drawer {n}: unknown — whether the aircraft has landed is not known',
    'Schublade {n}: unbekannt — ob das Luftfahrzeug gelandet ist, ist nicht bekannt',
    'cajón {n}: desconocido — no se sabe si la aeronave está posada'
  ],
  trUnknown_time: [
    'tiroir {n} : heure inconnue — son point n\'est pas sur la route du départ, ou la mission n\'a pas de vitesse de croisière',
    'drawer {n}: unknown hour — its point is not on the route of the departure, or the mission has no cruise speed',
    'Schublade {n}: Uhrzeit unbekannt — ihr Punkt liegt nicht auf der Route des Abflugs, oder die Mission hat keine Reisegeschwindigkeit',
    'cajón {n}: hora desconocida — su punto no está en la ruta de la salida, o la misión no tiene velocidad de crucero'
  ],
  trUnknown_data: ['tiroir {n} : inconnu — sa clé ne se juge pas', 'drawer {n}: unknown — its key cannot be judged',
    'Schublade {n}: unbekannt — ihr Schlüssel lässt sich nicht bewerten', 'cajón {n}: desconocido — su llave no se puede juzgar'
  ],
  // l'atelier (SOG-0444, lot P1) : le fil, la carte, le déroulé, la fiche du départ, le pied
  leaveAsk: ['Quitter l\'atelier sans enregistrer ? Les changements de cette mission seront perdus.',
    'Leave the workshop without saving? The changes to this mission will be lost.',
    'Werkstatt ohne Speichern verlassen? Die Änderungen an dieser Mission gehen verloren.',
    '¿Salir del taller sin guardar? Los cambios de esta misión se perderán.'
  ],
  leaveOk: ['Quitter sans enregistrer', 'Leave without saving', 'Ohne Speichern verlassen', 'Salir sin guardar'],
  leaveStay: ['Rester dans l\'atelier', 'Stay in the workshop', 'In der Werkstatt bleiben', 'Quedarse en el taller'],
  atCrumb: ['Missions › Registre › Atelier', 'Missions › Registry › Workshop', 'Missionen › Register › Werkstatt',
    'Misiones › Registro › Taller'
  ],
  atMap: ['Carte de la mission', 'Map of the mission', 'Karte der Mission', 'Mapa de la misión'],
  // la carte sur son fond uni (hors ligne, ou le fond de la suite n'est pas venu) : dit une fois par séance, en notification
  mmNone: ['Carte indisponible sur cet appareil.', 'Map unavailable on this device.', 'Karte auf diesem Gerät nicht verfügbar.',
    'Mapa no disponible en este dispositivo.'
  ],
  atBase: ['Fond', 'Background', 'Hintergrund', 'Fondo'],
  atBase_fast: ['Rapide', 'Fast', 'Schnell', 'Rápido'],
  atBase_relief: ['Relief', 'Relief', 'Relief', 'Relieve'],
  atSpaces: ['Espaces', 'Airspaces', 'Lufträume', 'Espacios'],
  atReliefOff: ['Relief indisponible (hors ligne, ou le fond ne répond pas) : la carte reste en Rapide.',
    'Relief unavailable (offline, or the background does not answer): the map stays in Fast.',
    'Relief nicht verfügbar (offline, oder der Hintergrund antwortet nicht): Die Karte bleibt in Schnell.',
    'Relieve no disponible (sin conexión, o el fondo no responde): el mapa sigue en Rápido.'
  ],
  atSpacesFar: ['Espaces : rapprochez la vue pour les voir.', 'Airspaces: zoom in to see them.',
    'Lufträume: Ansicht vergrößern, um sie zu sehen.', 'Espacios: acerque la vista para verlos.'
  ],
  atSpacesNoBase: ['Espaces : la base aéronautique ne répond pas sur cet appareil.',
    'Airspaces: the aeronautical base does not answer on this device.',
    'Lufträume: Die Luftfahrtdatenbank antwortet auf diesem Gerät nicht.',
    'Espacios: la base aeronáutica no responde en este dispositivo.'
  ],
  atSpacesN: ['{n} espace(s) dessiné(s) dans cette vue (zones R, D, P et RTBA).',
    '{n} airspace(s) drawn in this view (R, D, P zones and RTBA).',
    'In dieser Ansicht gezeichnete Lufträume: {n} (R-, D-, P-Zonen und RTBA).',
    '{n} espacio(s) dibujado(s) en esta vista (zonas R, D, P y RTBA).'
  ],
  atSpacesNone: ['Espaces : aucun connu dans cette vue.', 'Airspaces: none known in this view.',
    'Lufträume: in dieser Ansicht keiner bekannt.', 'Espacios: ninguno conocido en esta vista.'
  ],
  atMapPlain: ['Fond de carte indisponible : la carte montre les lieux sur un fond uni. Tout le reste fonctionne.',
    'Map background unavailable: the map shows the places on a plain background. Everything else works.',
    'Kartenhintergrund nicht verfügbar: die Karte zeigt die Orte auf einfarbigem Grund. Alles andere funktioniert.',
    'Fondo de mapa no disponible: el mapa muestra los lugares sobre un fondo liso. Todo lo demás funciona.'
  ],
  atMapNone: ['Aucun lieu placé : la carte est vide.', 'No place set: the map is empty.', 'Kein Ort gesetzt: die Karte ist leer.',
    'Ningún lugar situado: el mapa está vacío.'
  ],
  atMapFit: ['Recentrer', 'Recenter', 'Neu zentrieren', 'Recentrar'],
  // les outils de la carte (SOG-0444, lot P2) : après une pose, l'outil revient à Sélection
  atTool_select: ['Sélection', 'Selection', 'Auswahl', 'Selección'],
  atTool_point: ['Point', 'Point', 'Punkt', 'Punto'],
  atTool_route: ['Tracé', 'Route', 'Route', 'Trazado'],
  atHint_route: ['Tracé : touchez un lieu pour l\'ajouter à la route du départ.',
    'Route: touch a place to add it to the route of the departure.',
    'Route: Berühren Sie einen Ort, um ihn der Route des Abflugs hinzuzufügen.',
    'Trazado: toque un lugar para añadirlo a la ruta de la salida.'
  ],
  atHint_routeDrawer: ['Tracé : touchez un lieu pour l\'ajouter à la suite de route du tiroir {n}.',
    'Route: touch a place to add it to the onward route of drawer {n}.',
    'Route: Berühren Sie einen Ort, um ihn der Folgeroute der Schublade {n} hinzuzufügen.',
    'Trazado: toque un lugar para añadirlo a la ruta siguiente del cajón {n}.'
  ],
  // une pastille de route se choisit ; deux flèches la déplacent d'un rang (la route du départ comme la suite d'un tiroir)
  rtEarlier: ['← Plus tôt', '← Earlier', '← Früher', '← Antes'],
  rtLater: ['Plus tard →', 'Later →', 'Später →', 'Después →'],
  rtMoveHint: ['Touchez un lieu pour le choisir, puis déplacez-le par les flèches.',
    'Touch a place to choose it, then move it with the arrows.',
    'Einen Ort berühren, um ihn zu wählen, dann mit den Pfeilen verschieben.',
    'Toque un lugar para elegirlo y muévalo con las flechas.'
  ],
  rtTitle: ['Route du départ', 'Route of the departure', 'Route des Abflugs', 'Ruta de la salida'],
  rtHint: ['Les lieux que le pilote rejoint, dans l\'ordre. Sur la carte, l\'outil « Tracé » en ajoute au toucher.',
    'The places the pilot reaches, in order. On the map, the « Route » tool adds some by a touch.',
    'Die Orte, die der Pilot nacheinander erreicht. Auf der Karte fügt das Werkzeug „Route“ sie durch Berühren hinzu.',
    'Los lugares que el piloto alcanza, en orden. En el mapa, la herramienta «Trazado» los añade con un toque.'
  ],
  rtNone: ['Aucun lieu dans la route du départ.', 'No place in the route of the departure.', 'Kein Ort in der Route des Abflugs.',
    'Ningún lugar en la ruta de la salida.'
  ],
  rtChipDel: ['Retirer {id} de la route', 'Remove {id} from the route', '{id} aus der Route entfernen', 'Quitar {id} de la ruta'],
  rtNoId: ['Ce lieu n\'a pas d\'identifiant : il n\'entre pas dans une route.',
    'This place has no identifier: it does not enter a route.',
    'Dieser Ort hat keine Kennung: er kommt nicht in eine Route.', 'Este lugar no tiene identificador: no entra en una ruta.'
  ],
  rtFull: ['Une route porte soixante lieux au plus.', 'A route carries sixty places at most.', 'Eine Route trägt höchstens sechzig Orte.',
    'Una ruta lleva sesenta lugares como máximo.'
  ],
  atTool_zone: ['Zone', 'Zone', 'Zone', 'Zona'],
  atTool_object: ['Objet', 'Object', 'Objekt', 'Objeto'],
  atMapUndo: ['Annuler le geste', 'Undo the gesture', 'Geste rückgängig', 'Deshacer el gesto'],
  atHint_select: ['Touchez un lieu pour le choisir, faites-le glisser pour le déplacer.',
    'Touch a place to choose it, drag it to move it.',
    'Berühren Sie einen Ort, um ihn zu wählen; ziehen Sie ihn, um ihn zu verschieben.',
    'Toque un lugar para elegirlo, arrástrelo para moverlo.'
  ],
  atHint_chosen: ['{name} : faites-le glisser pour le déplacer.', '{name}: drag it to move it.', '{name}: ziehen, um zu verschieben.',
    '{name}: arrástrelo para moverlo.'
  ],
  atHint_round: ['{name} : son centre la déplace, la poignée de son bord règle son rayon.',
    '{name}: its centre moves it, the handle on its edge sets its radius.',
    '{name}: die Mitte verschiebt sie, der Griff am Rand stellt den Radius ein.',
    '{name}: su centro la mueve, el tirador del borde ajusta su radio.'
  ],
  atHint_fixed: ['{name} : ce lieu ne se déplace pas sur la carte.', '{name}: this place is not moved on the map.',
    '{name}: dieser Ort wird nicht auf der Karte verschoben.', '{name}: este lugar no se mueve en el mapa.'
  ],
  atHint_contour: ['{name} : son milieu la déplace ; un sommet se déplace ; le point entre deux sommets en ajoute un.',
    '{name}: its middle moves it; a vertex is dragged; the point between two vertices adds one.',
    '{name}: die Mitte verschiebt sie; ein Eckpunkt wird gezogen; der Punkt zwischen zwei Eckpunkten fügt einen hinzu.',
    '{name}: su centro la mueve; un vértice se arrastra; el punto entre dos vértices añade uno.'
  ],
  atHint_vertex: ['Sommet {k} de {name}.', 'Vertex {k} of {name}.', 'Eckpunkt {k} von {name}.', 'Vértice {k} de {name}.'],
  atHint_drawFor: ['Touchez la carte : ce qui est posé là sera la clé du tiroir {n}.',
    'Touch the map: what is posed there will be the key of drawer {n}.',
    'Berühren Sie die Karte: was dort gesetzt wird, ist der Schlüssel der Schublade {n}.',
    'Toque el mapa: lo que se ponga ahí será la llave del cajón {n}.'
  ],
  atRef_aerodrome: ['Repère : le terrain {id}.', 'Landmark: the aerodrome {id}.', 'Orientierungspunkt: der Flugplatz {id}.',
    'Referencia: el aeródromo {id}.'
  ],
  atRef_navaid: ['Repère : la balise {id}.', 'Landmark: the beacon {id}.', 'Orientierungspunkt: das Funkfeuer {id}.',
    'Referencia: la radioayuda {id}.'
  ],
  atRef_fix: ['Repère : le point {id}.', 'Landmark: the fix {id}.', 'Orientierungspunkt: der Wegpunkt {id}.',
    'Referencia: el punto {id}.'
  ],
  atRef_vrp: ['Repère : le point VFR {id}.', 'Landmark: the VFR point {id}.', 'Orientierungspunkt: der VFR-Meldepunkt {id}.',
    'Referencia: el punto VFR {id}.'
  ],
  atRefAdd: ['Ajouter comme point', 'Add as a point', 'Als Punkt hinzufügen', 'Añadir como punto'],
  atVertexDel: ['Retirer ce sommet', 'Remove this vertex', 'Diesen Eckpunkt entfernen', 'Quitar este vértice'],
  atVertexMin: ['Un contour garde au moins trois sommets.', 'An outline keeps at least three vertices.',
    'Ein Umriss behält mindestens drei Eckpunkte.', 'Un contorno conserva al menos tres vértices.'
  ],
  plToContour: ['Tracer son contour', 'Draw its outline', 'Umriss zeichnen', 'Trazar su contorno'],
  plToRound: ['La rendre ronde', 'Make it round', 'Rund machen', 'Hacerla redonda'],
  plContour: ['Contour de {n} sommets : il se retouche sur la carte.', 'Outline of {n} vertices: it is edited on the map.',
    'Umriss mit {n} Eckpunkten: er wird auf der Karte bearbeitet.', 'Contorno de {n} vértices: se edita en el mapa.'
  ],
  plShapeNeeds: ['Placez d\'abord la zone et donnez-lui un rayon : son contour part de son rond.',
    'Place the zone and give it a radius first: its outline starts from its circle.',
    'Setzen Sie zuerst die Zone und geben Sie ihr einen Radius: ihr Umriss geht von ihrem Kreis aus.',
    'Sitúe primero la zona y dele un radio: su contorno parte de su círculo.'
  ],
  dwDraw: ['Dessiner sur la carte', 'Draw on the map', 'Auf der Karte zeichnen', 'Dibujar en el mapa'],
  dwPose: ['Poser sur la carte', 'Pose on the map', 'Auf der Karte setzen', 'Poner en el mapa'],
  atHint_point: ['Touchez la carte : le point tournant est posé là.', 'Touch the map: the turning point is posed there.',
    'Berühren Sie die Karte: der Wendepunkt wird dort gesetzt.', 'Toque el mapa: el punto de viraje se pone ahí.'
  ],
  atHint_zone: ['Touchez la carte : une zone ronde est posée là ; son rayon se règle ensuite.',
    'Touch the map: a round zone is posed there; its radius is set afterwards.',
    'Berühren Sie die Karte: eine runde Zone wird dort gesetzt; ihr Radius wird danach eingestellt.',
    'Toque el mapa: una zona redonda se pone ahí; su radio se ajusta después.'
  ],
  atHint_object: ['Touchez la carte : l\'objet à trouver est posé là.', 'Touch the map: the object to find is posed there.',
    'Berühren Sie die Karte: das zu findende Objekt wird dort gesetzt.', 'Toque el mapa: el objeto por encontrar se pone ahí.'
  ],
  atHint_put: ['Touchez la carte : l\'avion de l\'essai est placé là, à H + {m} min.',
    'Touch the map: the aircraft of the trial is placed there, at H + {m} min.',
    'Berühren Sie die Karte: das Luftfahrzeug des Versuchs wird dort gesetzt, bei H + {m} min.',
    'Toque el mapa: la aeronave de la prueba se pone ahí, a H + {m} min.'
  ],
  atPut: ['Placer l\'avion ici', 'Place the aircraft here', 'Luftfahrzeug hier setzen', 'Poner la aeronave aquí'],
  atPutFull: ['Un essai porte vingt placements au plus : « Recommencer » les oublie.',
    'A trial carries twenty placements at most: « Start again » forgets them.',
    'Ein Versuch trägt höchstens zwanzig Setzungen: „Neu beginnen“ vergisst sie.',
    'Una prueba lleva veinte colocaciones como máximo: «Volver a empezar» las olvida.'
  ],
  // « Chercher un repère » par son nom : un champ sous la carte ; la vue se centre sur le repère trouvé, dit et cerclé comme un repère touché
  atSeek: ['Chercher un repère', 'Find a landmark', 'Orientierungspunkt suchen', 'Buscar una referencia'],
  atSeekPh: ['Code ou nom', 'Code or name', 'Kennung oder Name', 'Código o nombre'],
  atSeekGo: ['Chercher', 'Find', 'Suchen', 'Buscar'],
  atSeekShort: ['Écrivez au moins deux signes.', 'Type at least two characters.', 'Mindestens zwei Zeichen eingeben.',
    'Escriba al menos dos caracteres.'
  ],
  atSeekNone: ['Aucun repère « {q} » dans la base aéronautique.', 'No landmark « {q} » in the aeronautical base.',
    'Kein Orientierungspunkt „{q}“ in der Luftfahrtdatenbank.', 'Ninguna referencia «{q}» en la base aeronáutica.'
  ],
  atSeekMany: ['Plusieurs repères : choisissez.', 'Several landmarks: choose one.', 'Mehrere Orientierungspunkte: bitte wählen.',
    'Varias referencias: elija una.'
  ],
  // « Vue du pilote » (SOG-0448) : ce que le pilote peut voir à un stade — la règle du lecteur (pilotView), sur la carte de l'atelier
  atView: ['Vue de la carte', 'View of the map', 'Ansicht der Karte', 'Vista del mapa'],
  atView_all: ['Tout — la vue de l\'auteur', 'Everything — the author\'s view', 'Alles — die Sicht des Autors',
    'Todo — la vista del autor'
  ],
  atView_start: ['Vue du pilote : au départ', 'Pilot\'s view: at the departure', 'Sicht des Piloten: beim Abflug',
    'Vista del piloto: a la salida'
  ],
  atView_n: ['Vue du pilote : tiroir {n} ouvert', 'Pilot\'s view: drawer {n} open', 'Sicht des Piloten: Schublade {n} offen',
    'Vista del piloto: cajón {n} abierto'
  ],
  atHint_pilot: ['Vue du pilote : la carte ne montre que ce qu\'il peut voir à ce stade ; les outils reviennent avec « Tout ».',
    'Pilot\'s view: the map shows only what he may see at this stage; the tools come back with « Everything ».',
    'Sicht des Piloten: die Karte zeigt nur, was er in diesem Stadium sehen darf; die Werkzeuge kommen mit „Alles“ zurück.',
    'Vista del piloto: el mapa solo muestra lo que puede ver en esta etapa; las herramientas vuelven con «Todo».'
  ],
  atHint_view: ['Pendant l\'essai, la carte montre l\'avion et sa trace.', 'During the trial, the map shows the aircraft and its trail.',
    'Während des Versuchs zeigt die Karte das Luftfahrzeug und seine Spur.',
    'Durante la prueba, el mapa muestra la aeronave y su traza.'
  ],
  atHint_none: ['Sans carte, les lieux se placent par leurs champs.', 'Without a map, the places are set by their fields.',
    'Ohne Karte werden die Orte über ihre Felder gesetzt.', 'Sin mapa, los lugares se sitúan por sus campos.'
  ],
  atPoseFull: ['La mission porte déjà autant de lieux de cette sorte qu\'elle le peut.',
    'The mission already carries as many places of this kind as it can.',
    'Die Mission trägt bereits so viele Orte dieser Art wie möglich.',
    'La misión ya lleva tantos lugares de este tipo como puede.'
  ],
  atFlow: ['Déroulé de la mission', 'Unfolding of the mission', 'Ablauf der Mission', 'Desarrollo de la misión'],
  atFlowHint: ['Ce que le pilote lit au départ, puis les tiroirs, dans l\'ordre.',
    'What the pilot reads at the departure, then the drawers, in order.',
    'Was der Pilot beim Abflug liest, dann die Schubladen, der Reihe nach.',
    'Lo que el piloto lee a la salida, luego los cajones, en orden.'
  ],
  atStart: ['Au départ', 'At the departure', 'Beim Abflug', 'A la salida'],
  atVisible: ['visible', 'visible', 'sichtbar', 'visible'],
  atSealed: ['tiroir scellé', 'sealed drawer', 'versiegelte Schublade', 'cajón sellado'],
  atDrawer: ['Tiroir {n}', 'Drawer {n}', 'Schublade {n}', 'Cajón {n}'],
  atKey_time: ['clé : heure', 'key: hour', 'Schlüssel: Uhrzeit', 'llave: hora'],
  atKey_zone: ['clé : zone de passage', 'key: passage zone', 'Schlüssel: Durchflugzone', 'llave: zona de paso'],
  atKey_object: ['clé : objet à trouver', 'key: object to find', 'Schlüssel: zu findendes Objekt', 'llave: objeto por encontrar'],
  atKey_arrival: ['clé : arrivée au terrain', 'key: arrival at the aerodrome', 'Schlüssel: Ankunft am Platz',
    'llave: llegada al aeródromo'
  ],
  atKey_condition: ['clé : pas encore jugée en vol', 'key: not judged in flight yet', 'Schlüssel: im Flug noch nicht bewertet',
    'llave: aún no juzgada en vuelo'
  ],
  atKey_hand: ['clé : geste du pilote', 'key: the pilot\'s gesture', 'Schlüssel: Geste des Piloten', 'llave: gesto del piloto'],
  atSheet: ['Au départ — visible par le pilote', 'At the departure — visible to the pilot', 'Beim Abflug — für den Piloten sichtbar',
    'A la salida — visible para el piloto'
  ],
  atSheetHint: ['Ce que le pilote lit avant de partir. Six groupes ; chacun dit son contenu en une ligne.',
    'What the pilot reads before leaving. Six groups; each says its content in one line.',
    'Was der Pilot vor dem Abflug liest. Sechs Gruppen; jede nennt ihren Inhalt in einer Zeile.',
    'Lo que el piloto lee antes de salir. Seis grupos; cada uno dice su contenido en una línea.'
  ],
  atLine_none: ['à remplir', 'to fill in', 'auszufüllen', 'por rellenar'],
  atLine_teams: ['{n} équipe(s)', '{n} team(s)', '{n} Team(s)', '{n} equipo(s)'],
  atLine_places: ['{n} lieu(x)', '{n} place(s)', '{n} Ort(e)', '{n} lugar(es)'],
  atLine_story: ['résumé de {n} signe(s)', 'summary of {n} sign(s)', 'Kurzbeschreibung mit {n} Zeichen', 'resumen de {n} signo(s)'],
  atLine_risks: ['{n} risque(s)', '{n} risk(s)', '{n} Risiko(en)', '{n} riesgo(s)'],
  atLine_timeline: ['{n} événement(s) · {m} carte(s)', '{n} event(s) · {m} map(s)', '{n} Ereignis(se) · {m} Karte(n)',
    '{n} evento(s) · {m} mapa(s)'
  ],
  atTodo: ['À compléter ({n})', 'To complete ({n})', 'Zu ergänzen ({n})', 'Por completar ({n})'],
  // le champ qui cite une référence morte (les `where` de editor.js refsOf, hors profil et carte, jamais jugés)
  at_route: ['la route de la mission', 'the mission route', 'die Route der Mission', 'la ruta de la misión'],
  at_drawer: ['le point de déclenchement du tiroir {name}', 'the trigger point of drawer {name}', 'der Auslösepunkt der Schublade {name}',
    'el punto de activación del cajón {name}'
  ],
  at_drawerKey: ['la clé du tiroir {name}', 'the key of drawer {name}', 'der Schlüssel der Schublade {name}',
    'la llave del cajón {name}'
  ],
  at_drawerActor: ['la cible du tiroir {name}', 'the target of drawer {name}', 'das Ziel der Schublade {name}',
    'el blanco del cajón {name}'
  ],
  at_objectRoute: ['la route de la cible {name}', 'the route of target {name}', 'die Route des Ziels {name}',
    'la ruta del blanco {name}'
  ],
  at_drawerStop: ['un arrêt demandé par le tiroir {name}', 'a stop required by drawer {name}', 'ein von Schublade {name} verlangter Halt',
    'una parada que pide el cajón {name}'
  ],
  at_drawerRoute: ['la suite de route du tiroir {name}', 'the onward route of drawer {name}', 'die Folgeroute der Schublade {name}',
    'la ruta siguiente del cajón {name}'
  ],
  at_event: ['un événement de la chronologie', 'an event of the timeline', 'ein Ereignis der Chronologie', 'un evento de la cronología'],
  at_alert: ['la route de l\'alerte {name}', 'the route of alert {name}', 'die Route des Alarms {name}', 'la ruta de la alerta {name}']
};

/** Le mot d'une ligne de « À compléter » que editor.js nomme (todo : { key, vars }) ; '' pour une clé dont le texte est ailleurs. */
export function todoText(tt, t) {
  const text = EDTX[`todo_${t?.key}`],
    v = t?.vars || {};
  if (!text || !t?.vars) return '';
  return tt(text, {
    name: String(v.name || '').slice(0, 60),
    id: String(v.id || '').slice(0, 40),
    who: EDTX[`at_${v.where}`] ? tt(EDTX[`at_${v.where}`], {
      name: String(v.name || '').slice(0, 60)
    }) : ''
  });
}

/** La phrase dite au second appui : le lieu est retiré avec ses citations. */
export function removedText(tt, row) {
  return tt(EDTX.plRemoved, {
    id: String(row?.id || row?.name || '').trim().slice(0, 60) || tt(EDTX.plNoName)
  });
}

/** La phrase dite avant de retirer un lieu encore cité (voir l'en-tête). `row` : la ligne du lieu ; `cited` : editor.js citedBy. */
export function citedText(tt, row, cited) {
  const id = String(row?.id || row?.name || '').trim().slice(0, 60) || tt(EDTX.plNoName),
    who = (Array.isArray(cited) ? cited : []).filter(c => EDTX[`ref_${c?.where}`]).map(c => tt(EDTX[`ref_${c.where}`], {
      name: String(c.name || '').slice(0, 60),
      n: c.n
    })).join(' · ');
  return tt(EDTX.plCited, {
    id,
    who
  });
}
