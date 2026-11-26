// V3 missions — les textes du déroulé de l'atelier (SOG-0620, lot 2), en quatre langues [fr, en, de, es] : le bloc « Déroulé », ses lignes
// et la fiche d'un événement. Ni page, ni stockage, ni réseau ; le module passe son traducteur (`tt`, qui remplace {n}, {a}, {b}…). Le
// français est celui de la maquette validée (modules/missions/maquette/deroule.html).
//
// API : FTX — les textes ; FTX.flDrawerShort : la lettre qui nomme un tiroir dans une heure (« T2 + 20 »).

export const FTX = {
  flTitle: ['Déroulé', 'Sequence', 'Ablauf', 'Desarrollo'],
  flDef: [
    'Un événement est prévu au brief et se constate sur son lieu ; un tiroir reste caché jusqu\'à ce que sa clé joue. Rangés par heure : l\'heure prévue, ou l\'heure de repli d\'un tiroir.',
    'An event is planned in the brief and is observed on its place; a drawer stays hidden until its key plays. Sorted by time: the planned time, or a drawer\'s fallback time.',
    'Ein Ereignis ist im Briefing vorgesehen und wird an seinem Ort festgestellt; eine Schublade bleibt verborgen, bis ihr Schlüssel spielt. Nach Zeit sortiert: die geplante Zeit oder die Ersatzzeit einer Schublade.',
    'Un evento está previsto en el briefing y se constata en su lugar; un cajón permanece oculto hasta que juega su llave. Ordenados por hora: la hora prevista, o la hora de reserva de un cajón.'
  ],
  flEvent: ['Événement', 'Event', 'Ereignis', 'Evento'],
  flDrawer: ['Tiroir', 'Drawer', 'Schublade', 'Cajón'],
  flDrawerShort: ['T', 'D', 'S', 'C'],
  flAddEvent: ['＋ Événement', '＋ Event', '＋ Ereignis', '＋ Evento'],
  flAddDrawer: ['＋ Tiroir', '＋ Drawer', '＋ Schublade', '＋ Cajón'],
  flKeyWord: ['clé', 'key', 'Schlüssel', 'llave'],
  flFallback: ['repli H+{n}', 'fallback H+{n}', 'Ersatz H+{n}', 'reserva H+{n}'],
  flImposedTag: ['imposée', 'imposed', 'vorgegeben', 'impuesta'],
  flNoPlace: ['aucun lieu', 'no place', 'kein Ort', 'ningún lugar'],
  flOrder: ['ordre', 'order', 'Auftrag', 'orden'],
  flTolSame: ['± {a} min', '± {a} min', '± {a} Min.', '± {a} min'],
  flTolDiff: ['−{a} / +{b} min', '−{a} / +{b} min', '−{a} / +{b} Min.', '−{a} / +{b} min'],
  flDrawerTitle: ['Tiroir {n}', 'Drawer {n}', 'Schublade {n}', 'Cajón {n}'],
  flNoTitle: ['Événement sans titre', 'Event without a title', 'Ereignis ohne Titel', 'Evento sin título'],
  flNone: ['Aucun événement ni tiroir : « ＋ Événement » en ajoute un.', 'No event or drawer: « ＋ Event » adds one.',
    'Kein Ereignis und keine Schublade: « ＋ Ereignis » fügt eines hinzu.', 'Ningún evento ni cajón: « ＋ Evento » añade uno.'
  ],
  flNoHome: ['La chronologie de ce fichier est un texte : elle n’est pas modifiée ici.',
    'The timeline of this file is plain text: it is not edited here.',
    'Der Ablauf dieser Datei ist ein Text: er wird hier nicht geändert.',
    'La cronología de este archivo es un texto: aquí no se modifica.'
  ],
  flFull: ['Le déroulé est plein : soixante événements au plus.', 'The sequence is full: sixty events at most.',
    'Der Ablauf ist voll: höchstens sechzig Ereignisse.', 'El desarrollo está lleno: sesenta eventos como máximo.'
  ],
  flRemoved: ['« {t} » retiré ; ses dépendants gardent leur heure, comptée depuis le décollage.',
    '“{t}” removed; its dependents keep their time, counted from take-off.',
    '„{t}“ entfernt; abhängige Ereignisse behalten ihre Zeit, ab dem Start gerechnet.',
    '«{t}» quitado; los que dependían de él conservan su hora, contada desde el despegue.'
  ],
  // la fiche d'un événement
  fsKind: ['prévu au brief · se constate, sans geste', 'planned in the brief · observed, no gesture',
    'im Briefing vorgesehen · wird festgestellt, ohne Handgriff', 'previsto en el briefing · se constata, sin gesto'
  ],
  fsTitle: ['Titre', 'Title', 'Titel', 'Título'],
  fsText: ['Consigne', 'Instruction', 'Anweisung', 'Consigna'],
  fsWhen: ['Heure prévue', 'Planned time', 'Geplante Zeit', 'Hora prevista'],
  fsRef_takeoff: ['le décollage', 'take-off', 'der Start', 'el despegue'],
  fsRef_order: ['la réception de l\'ordre', 'the receipt of the order', 'der Empfang des Auftrags', 'la recepción de la orden'],
  fsRef_point: ['le passage à un point', 'passing a point', 'das Passieren eines Punktes', 'el paso por un punto'],
  fsRef_event: ['un autre événement', 'another event', 'ein anderes Ereignis', 'otro evento'],
  fsRef_drawer: ['un tiroir (caché avec lui)', 'a drawer (hidden with it)', 'eine Schublade (mit ihr verborgen)',
    'un cajón (oculto con él)'
  ],
  fsRefAria: ['Repère de l\'heure', 'Time reference', 'Bezug der Zeit', 'Referencia de la hora'],
  fsTarget: ['Repère choisi', 'Chosen reference', 'Gewählter Bezug', 'Referencia elegida'],
  fsPlus: ['+', '+', '+', '+'],
  fsOffset: ['Décalage en minutes', 'Offset in minutes', 'Versatz in Minuten', 'Desfase en minutos'],
  fsMin: ['min', 'min', 'Min.', 'min'],
  fsTol: ['Tolérance', 'Tolerance', 'Toleranz', 'Tolerancia'],
  fsEarly: ['avance', 'early', 'früher', 'adelanto'],
  fsLate: ['retard', 'late', 'später', 'retraso'],
  fsImposed: ['Heure imposée : elle ne se décale pas, même si son repère est tenu en retard.',
    'Imposed time: it does not shift, even if its reference is held late.',
    'Vorgegebene Zeit: sie verschiebt sich nicht, auch wenn ihr Bezug verspätet eintritt.',
    'Hora impuesta: no se desplaza, aunque su referencia se cumpla con retraso.'
  ],
  fsPlace: ['Lieu (facultatif)', 'Place (optional)', 'Ort (optional)', 'Lugar (opcional)'],
  fsNoPlace: ['aucun lieu', 'no place', 'kein Ort', 'ningún lugar'],
  fsTeams: ['Équipes concernées', 'Teams concerned', 'Betroffene Teams', 'Equipos afectados'],
  fsTeamsAll: ['Aucune équipe cochée : toutes sont concernées.', 'No team ticked: all are concerned.',
    'Kein Team angekreuzt: alle sind betroffen.', 'Ningún equipo marcado: todos están afectados.'
  ],
  fsNoTeams: ['Aucune équipe n\'est déclarée : l\'événement concerne tout le monde.', 'No team is declared: the event concerns everyone.',
    'Kein Team ist angelegt: das Ereignis betrifft alle.', 'No hay equipos declarados: el evento concierne a todos.'
  ],
  fsRead: ['Le pilote lira : « {t} ». En vol, une heure d\'horloge dès que son repère est constaté.',
    'The pilot will read: “{t}”. In flight, a clock time as soon as its reference is observed.',
    'Der Pilot liest: „{t}“. Im Flug eine Uhrzeit, sobald sein Bezug festgestellt ist.',
    'El piloto leerá: «{t}». En vuelo, una hora de reloj en cuanto se constata su referencia.'
  ],
  fsLegacy: ['Heure du fichier : « {at} » — elle reste telle quelle tant que tu ne choisis pas un repère.',
    'Time in the file: “{at}” — it stays as it is until you choose a reference.',
    'Zeit in der Datei: „{at}“ – sie bleibt, bis du einen Bezug wählst.',
    'Hora del archivo: «{at}»: se queda así hasta que elijas una referencia.'
  ],
  fsAfter: ['{n} min après {r}', '{n} min after {r}', '{n} Min. nach {r}', '{n} min después de {r}'],
  fsBefore: ['{n} min avant {r}', '{n} min before {r}', '{n} Min. vor {r}', '{n} min antes de {r}'],
  fsRName_order: ['la réception de l\'ordre', 'the receipt of the order', 'der Empfang des Auftrags', 'la recepción de la orden'],
  fsRName_drawer: ['le tiroir {n}', 'drawer {n}', 'Schublade {n}', 'el cajón {n}'],
  fsRName_point: ['le passage à {id}', 'passing {id}', 'das Passieren von {id}', 'el paso por {id}'],
  fsOrderL: ['Ordre reçu', 'Order received', 'Auftrag erhalten', 'Orden recibida'],
  fsOrderU: ['min avant le décollage', 'min before take-off', 'Min. vor dem Start', 'min antes del despegue'],
  fsNoOrder: ['L\'heure de réception de l\'ordre n\'est pas donnée : elle se règle dans le Cadre.',
    'The time the order is received is not given: set it in the Cadre.',
    'Die Zeit des Auftragseingangs ist nicht angegeben: sie wird im Rahmen eingestellt.',
    'La hora de recepción de la orden no está dada: se ajusta en el Marco.'
  ],
  fsOpenCadre: ['Ouvrir le Cadre', 'Open the Cadre', 'Rahmen öffnen', 'Abrir el Marco'],
  // SOG-0620 lot 4 (français seulement, SOG-0680) : le choix « Annoncé au brief » ⇄ « Caché jusqu'à un stimulus »
  fsShown: ['Annoncé au brief'],
  fsHidden: ['Caché jusqu\'à un stimulus'],
  fsDep1: ['1 événement en dépend : il sera caché avec lui.'],
  fsDepN: ['{n} événements en dépendent : ils seront cachés avec lui.'],
  fsDel: ['Retirer cet événement', 'Remove this event', 'Dieses Ereignis entfernen', 'Quitar este evento'],
};
