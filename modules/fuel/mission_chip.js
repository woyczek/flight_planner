// V3 fuel — la puce « Mission <ID> » (SOG-0193 L2, § 10.47 b ; SOG-0617 : un seul composant pour Carburant et la Carte). Carburant la
// pose dans son en-tête et son toucher ouvre le volet de la mission sans quitter l'étape ; la Carte la pose dans l'en-tête de sa feuille
// et son toucher mène au même volet par l'adresse #fuel?focus=mission. Ce fichier ne lit ni n'écrit rien : il rend la puce, son style et
// ses textes.
//
// API : chipHtml(tt, id, { open, action, away }) → le bouton, ou '' sans identifiant ; tt(rangée, valeurs) est la traduction du module
//   appelant (ctx.t) ; open : l'état du volet (aria-expanded), absent hors de Carburant ; action : la valeur de data-do (le gestionnaire
//   du module appelant) ; away : vrai hors de Carburant (le titre dit que la fiche s'ouvre dans Carburant).
//   CSS : le style de la puce, sans préfixe de module (la classe fu-mchip, la même partout) ; le module appelant le pose dans son <style>.
//   TX : les textes, quatre langues.

export const TX = {
  mChip: ['Mission {id}', 'Mission {id}', 'Einsatz {id}', 'Misión {id}'],
  mChipTitle: ['La fiche de la mission, sans quitter l’étape', 'The mission sheet, without leaving the step',
    'Das Einsatzblatt, ohne den Schritt zu verlassen',
    'La ficha de la misión, sin salir del paso'
  ],
  // SOG-0617 : la puce posée hors de Carburant (la Carte) — son toucher ouvre la fiche dans Carburant
  mChipAway: ['La fiche de la mission, dans Carburant', 'The mission sheet, in Fuel', 'Das Einsatzblatt, in Kraftstoff',
    'La ficha de la misión, en Combustible'
  ]
};

/** Le style de la puce : à la taille du texte, teinte d'accent, cible de 44 px (le ::before élargit la zone touchée sans la dessiner). */
export const CSS = `.fu-mchip{position:relative;min-height:0;height:28px;padding:0 10px;border:1px solid var(--sog-accent);background:none;color:var(--sog-accent);font:inherit;font-size:var(--sog-size-s);font-weight:600;white-space:nowrap}
.fu-mchip::before{content:'';position:absolute;inset:-8px -2px}
.fu-mchip[aria-expanded="true"]{background:var(--sog-accent);color:var(--sog-surface)}`;

/** Échappe un texte pour le HTML (l'identifiant vient du vol, une entrée non fiable). */
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

/** La puce « Mission <ID> » (voir l'en-tête) ; '' sans identifiant. L'identifiant est borné à 40 signes. */
export function chipHtml(tt, id, {
  open,
  action = 'mpane',
  away = false
} = {}) {
  const m = typeof id === 'string' ? id.trim().slice(0, 40) : '';
  if (!m) return '';
  const title = tt(away ? TX.mChipAway : TX.mChipTitle);
  return `<button type="button" class="fu-mchip" data-do="${esc(action)}"${typeof open === 'boolean' ? ` aria-expanded="${open}"` : ''} title="${esc(title)}">${esc(tt(TX.mChip, { id: m }))}</button>`;
}
