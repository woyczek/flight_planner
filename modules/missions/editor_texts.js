// V3 missions — les textes de l'éditeur de missions écrits par la session « Création de missions » (depuis SOG-0439), en quatre langues
// [fr, en, de, es], et les phrases qui s'en assemblent. Ni page, ni stockage, ni réseau : le module passe son traducteur (`tt`, qui
// accorde les marques « (s) » d'après {n}). Les textes des six premières étapes restent dans module.js (Features SOG).
//
// API :
//   EDTX : les textes — pl… et ok_<sorte> (les objets à trouver dans les Lieux, SOG-0445) ; at… (l'atelier, SOG-0444 : le fil, la carte, le déroulé, la fiche du départ, le pied) ; plRemoveAnyway, plCited, plRemoved, ref_<where> (qui cite un lieu : les `where` de editor.js refsOf), todo_<key>
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
  // l'atelier (SOG-0444, lot P1) : le fil, la carte, le déroulé, la fiche du départ, le pied
  atCrumb: ['Missions › Registre › Atelier', 'Missions › Registry › Workshop', 'Missionen › Register › Werkstatt',
    'Misiones › Registro › Taller'
  ],
  atMap: ['Carte de la mission', 'Map of the mission', 'Karte der Mission', 'Mapa de la misión'],
  atMapNone: ['Aucun lieu placé : la carte est vide.', 'No place set: the map is empty.', 'Kein Ort gesetzt: die Karte ist leer.',
    'Ningún lugar situado: el mapa está vacío.'
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
  atDrawersKept: ['Les tiroirs de ce fichier sont gardés tels quels ; ils ne se modifient pas encore ici.',
    'The drawers of this file are kept as they are; they cannot be edited here yet.',
    'Die Schubladen dieser Datei bleiben unverändert; sie lassen sich hier noch nicht bearbeiten.',
    'Los cajones de este archivo se conservan tal cual; aún no se modifican aquí.'
  ],
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
