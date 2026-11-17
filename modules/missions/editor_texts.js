// V3 missions — les textes de l'éditeur de missions écrits par la session « Création de missions » (depuis SOG-0439), en quatre langues
// [fr, en, de, es], et les phrases qui s'en assemblent. Ni page, ni stockage, ni réseau : le module passe son traducteur (`tt`, qui
// accorde les marques « (s) » d'après {n}). Les textes des six premières étapes restent dans module.js (Features SOG).
//
// API :
//   EDTX : les textes — plRemoveAnyway, plCited, ref_<where> (qui cite un lieu : les `where` de editor.js refsOf), todo_<key> (les mots
//     de « À compléter » des clés que editor.js todo ajoute : deadRef, drawerNoPoint, mapNoCentre).
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
  todo_deadRef: ['une référence à un lieu qui n\'existe pas', 'a reference to a place that does not exist',
    'ein Verweis auf einen Ort, den es nicht gibt', 'una referencia a un lugar que no existe'
  ],
  todo_drawerNoPoint: ['un tiroir sans son point de déclenchement (il ne s\'ouvre plus qu\'à la main)',
    'a drawer without its trigger point (it only opens by hand)',
    'eine Schublade ohne ihren Auslösepunkt (sie öffnet sich nur noch von Hand)',
    'un cajón sin su punto de activación (solo se abre a mano)'
  ],
  todo_mapNoCentre: ['une carte sans centre (son lieu a été retiré)', 'a map without centre (its place was removed)',
    'eine Karte ohne Mittelpunkt (ihr Ort wurde entfernt)', 'un mapa sin centro (su lugar fue quitado)'
  ]
};

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
