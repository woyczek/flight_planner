(() => {
  'use strict';
  // V3 — Réglages : aides partagées par les fichiers de l'écran (frame/settings/SPEC.md ; ordre de chargement :
  // INTEGRATION.md § 1, kit.js le premier) — racine de la suite, échappement, horodatage, textes communs
  // (window.SogSettingsT, que chaque fichier complète), appels au lanceur, copie, document de la compagnie, comparaison
  // d'adresses de dépôt, mode d'emploi du jeton en HTML.
  const ROOT = new URL('../../', document.currentScript.src).href; // racine de la suite (routes /__setup du lanceur)
  /** Échappement HTML d'un texte (attributs compris). */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  /** Horodatage ISO de maintenant. */
  const now = () => new Date().toISOString();
  const T = window.SogSettingsT ||= {}; // textes [fr, en, de, es] de l'écran, complétés par chaque fichier

  /** Appel d'une route du lanceur (/__setup/<route>) ; GET sans corps, POST avec ; null en cas d'échec. */
  async function setup(route, body) {
    try {
      const r = await fetch(new URL(`__setup/${route}`, ROOT), {
        method: body ? 'POST' : 'GET',
        cache: 'no-store',
        headers: {
          'X-SOG-Setup': '1',
          ...(body ? {
            'Content-Type': 'application/json'
          } : {})
        },
        ...(body ? {
          body: JSON.stringify(body)
        } : {})
      });
      return await r.json();
    } catch {
      return null;
    }
  }

  /** Copie vers le presse-papiers, aussi hors contexte sûr (appareil appairé en http) : frame/lib/clipboard.js (module,
   *  chargé à la demande) — 'clipboard', 'exec' ou 'shown' (texte montré sélectionné dans box, ou après near). */
  async function copy(text, o = {}) {
    try {
      return await (await import(new URL('frame/lib/clipboard.js', ROOT).href)).copyText(text, o);
    } catch {
      return 'shown';
    }
  }

  /** Adresse de dépôt comparable (sans .git ni barre finale, hôte en minuscules). */
  const sameRepo = (a, b) => {
    /** Forme normalisée d'une adresse. */
    const n = u => String(u || '').trim().replace(/\/+$/, '').replace(/\.git$/, '').replace(/^(\w+:\/\/[^/]+)/, h => h.toLowerCase());
    return !!a && !!b && n(a) === n(b);
  };
  /** Refus du lanceur parce qu'une fenêtre est déjà ouverte (champ confirm, sinon le texte du message) ? */
  const confirmOpen = r => !!r && !r.ok && (r.confirm === 'open' || /déjà ouverte|already open/i.test(r.message || ''));
  const AIRLINE = 'airline/settings.json';
  let airlineA = null;
  /** Document de la compagnie (airline/settings.json du dépôt des données) : lecture, et écriture par l'import. */
  const airlineDoc = FD => airlineA ||= FD.adapter({
    id: 'frame-settings-airline',
    reads: ['airline/'],
    writes: [AIRLINE]
  });
  /** Mode d'emploi reçu → HTML en texte seul : une ligne par paragraphe, adresses https en liens. */
  const howtoHtml = text => String(text).split(/\n+/).filter(Boolean).map(l => `<p>${esc(l).replace(/https:\/\/(?:[^\s<&]|&#38;)+[^\s<&.,;:)]/g, u => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`)}</p>`).join('');

  window.SogSettingsKit = {
    ROOT,
    esc,
    now,
    T,
    setup,
    copy,
    sameRepo,
    confirmOpen,
    AIRLINE,
    airlineDoc,
    howtoHtml
  };
})();
