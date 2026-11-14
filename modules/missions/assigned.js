// V3 missions — « Mes missions affectées » (SOG-0114 (A), décision de l'ergonome du 13/11 à 16 h 05) : le calcul pur. L'index des
// affectations de la V2 (missions/affectations.json, écrit par le CPCO, une ligne par participant : docs/technique/AFFECTATION_MISSIONS.md)
// est lu tel quel (SPEC § 6) ; il est écrit par n'importe quel pilote de la compagnie : une entrée non fiable (audit 157), chaque champ
// borné. Ni page, ni stockage, ni réseau.
//
//   mine(doc, trigram, now) → [{ mission, title, callsign, registration, type, departure, takeoff, ferry, rdv, meet }] : les affectations
//     à venir de ce trigramme (une ligne « annulée » écartée, un décollage passé de plus de 12 h écarté), par décollage (une astreinte
//     sans heure en dernier) ; [] sans trigramme ou sans index. rdv : l'heure du rendez-vous (`rendezvous_at`, ISO UTC ou « H±n »)
//     quand la ligne la porte ; meet : les canaux de l'équipage (`meet[]` : { kind, label, url? (https seulement), value? }, six au plus).

const KINDS = ['discord', 'srs', 'joinfs', 'teamspeak', 'other'];
/** Un texte nettoyé (sans caractère de contrôle) et borné ; '' pour ce qui n'est pas un texte. */
const cut = (v, n) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n) : '';
/** Une heure ISO UTC lisible, sinon null. */
const isoOf = v => {
  const t = Date.parse(typeof v === 'string' ? v : '');
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
};
/** Une adresse https bornée, sinon '' (jamais javascript:, data:, ni une adresse sans hôte). */
const httpsOf = v => {
  const s = cut(v, 300);
  try {
    const u = new URL(s);
    return u.protocol === 'https:' && u.hostname ? u.href : '';
  } catch {
    return '';
  }
};

/** Un canal de l'équipage, borné (voir l'en-tête) ; null sans libellé, ou sans adresse https ni valeur. */
function meetOf(m) {
  if (!m || typeof m !== 'object') return null;
  const label = cut(m.label, 80);
  if (!label) return null;
  const url = httpsOf(m.url),
    value = cut(m.value, 80);
  if (!url && !value) return null; // ni adresse https ni valeur à copier : rien d'utilisable (une adresse refusée n'est pas dite)
  return {
    kind: KINDS.includes(m.kind) ? m.kind : 'other',
    label,
    ...(url ? {
      url
    } : {}),
    ...(value ? {
      value
    } : {})
  };
}

/** Les affectations à venir de ce trigramme (voir l'en-tête). */
export function mine(doc, trigram, now = Date.now()) {
  const me = String(trigram || '').toUpperCase();
  if (!/^[A-Z]{3}$/.test(me)) return [];
  const out = [];
  for (const a of (Array.isArray(doc?.assignments) ? doc.assignments : []).slice(0, 5000)) {
    if (!a || typeof a !== 'object' || String(a.pilot ?? '').toUpperCase() !== me || a.status === 'annulée') continue;
    const mission = cut(a.mission, 12).toUpperCase();
    if (!/^[A-Z]-\d{3}[A-Z]?$/.test(mission)) continue;
    const takeoff = isoOf(a.takeoff);
    if (takeoff && Date.parse(takeoff) < now - 12 * 3600e3) continue;
    const ac = a.aircraft && typeof a.aircraft === 'object' ? a.aircraft : {},
      rdv = isoOf(a.rendezvous_at) || (/^H[+-]\d{1,4}$/.test(String(a.rendezvous_at ?? '')) ? String(a.rendezvous_at) : null),
      dep = cut(a.departure, 4).toUpperCase();
    out.push({
      mission,
      title: cut(a.title, 120),
      callsign: /^[A-Z0-9-]{2,12}$/i.test(cut(a.callsign, 12)) ? cut(a.callsign, 12).toUpperCase() : '',
      registration: cut(ac.registration, 12).toUpperCase(),
      type: /^[A-Z0-9]{2,8}$/i.test(cut(ac.type, 8)) ? cut(ac.type, 8).toUpperCase() : '',
      departure: /^[A-Z0-9]{4}$/.test(dep) ? dep : '',
      takeoff,
      ferry: a.role === 'convoyage',
      rdv,
      meet: (Array.isArray(a.meet) ? a.meet : []).slice(0, 6).map(meetOf).filter(Boolean)
    });
  }
  return out.sort((x, y) => (Date.parse(x.takeoff || '') || 9e15) - (Date.parse(y.takeoff || '') || 9e15));
}
