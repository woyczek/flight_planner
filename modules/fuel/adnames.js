// V3 fuel — le nom du terrain là où son code est, et la complétion progressive des trois champs de l'étape Vol (V3_SPECIFICATION
// § 10.27). Depuis SOG-0465 le champ est un bloc commun, frame/lib/ad_field.js (l'atelier de Missions s'en sert aussi) : ce fichier ne
// garde que ce qui est à Carburant — ses trois champs (départ, arrivée, dégagement), la route du vol quand un champ n'est pas à l'écran.
//
// Interface étroite (createAdNames(host) → api), inchangée :
//   host = { ctx, body(), flight(), gone() } ; api = celle de createAdField (paint, onInput, onKey, onFocusOut, onPointerDown, onClick,
//   texts, isPicking, known, hitsFor, nameKnown, positionOf, isCode, stop)
import {
  createAdField
} from '../../frame/lib/ad_field.js';

/** Crée le gestionnaire des noms et de la complétion d'un montage de l'écran Carburant. */
export function createAdNames(host) {
  return createAdField({
    ctx: host.ctx,
    body: host.body,
    gone: host.gone,
    keys: ['dep', 'arr', 'altn'],
    value: k => host.flight()?.route?.[k] || '',
    idPrefix: 'fu-sug'
  });
}
