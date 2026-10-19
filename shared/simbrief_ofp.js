(() => {
  'use strict';
  // Lecture d'un OFP SimBrief (JSON de l'API xml.fetcher.php, json=1 ou json=v2) commune au Carburant et aux Cartes de
  // vol : points du navlog, résumé de ce qui a été lu (« OFP du 19/10 · LFRS → LFML · 12 points · FL270 · dégagement
  // LFPG · DH8D F-ZBMD »), raison quand l'OFP n'a pas de route exploitable, et fenêtre du JSON (lecture, Copier).
  // json=1 : navlog = { fix: [ … ] } ; json=v2 : navlog = [ … ] (la liste des points elle-même), alternate en liste.
  if (window.SimbriefOfp) return;
  const K = window.RepositoryKit;
  /** Ligne fr / en / de / es dans la langue de la page ({x} remplacés). */
  const tr = (row, vars = {}) => K?.tf ? K.tf(row, vars) : String(row[0]).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  const list = v => Array.isArray(v) ? v : v && typeof v === 'object' ? [v] : [];
  const num = v => v === '' || v == null ? NaN : +v;

  /** Points du navlog (objets SimBrief : ident, pos_lat, pos_long, type, stage…), json=1 ou v2 ; [] sans navlog. */
  function fixes(raw) {
    const nav = raw?.navlog;
    if (!nav) return [];
    const top = Array.isArray(nav) ? nav : list(nav.fix || nav.waypoint);
    return top.flatMap(n => n && !n.ident && (n.fix || n.waypoint) ? list(n.fix || n.waypoint) : [n]).filter(f => f && typeof f ===
      'object');
  }
  /** Points de route du navlog : TOC / TOD (calculés, pas des points) et terrains (départ, arrivée) écartés ; seuls les
   *  points qui ont une position. */
  const routeFixes = raw => fixes(raw).filter(f => !/^(TOC|TOD)$/i.test(f.ident || '') && f.type !== 'apt' && Number.isFinite(num(f
    .pos_lat)) && Number.isFinite(num(f.pos_long)));
  /** Dégagement de l'OFP (code OACI) ou ''. */
  const alternate = raw => String(list(raw?.alternate)[0]?.icao_code || '').toUpperCase();

  /** Raison pour laquelle l'OFP ne donne pas de route point par point, '' s'il en donne une. */
  function problem(raw) {
    if (!raw?.origin?.icao_code || !raw?.destination?.icao_code) return tr(['OFP sans terrain de départ ou d’arrivée.',
      'OFP without departure or arrival airfield.', 'OFP ohne Start- oder Zielflugplatz.', 'OFP sin aeródromo de salida o llegada.'
    ]);
    const all = fixes(raw);
    if (!all.length) return tr(['navlog vide : l’OFP ne liste aucun point (vol direct ou OFP incomplet).',
      'empty navlog: the OFP lists no point (direct flight or incomplete OFP).',
      'leeres Navlog: der OFP enthält keinen Punkt (Direktflug oder unvollständiger OFP).',
      'navlog vacío: el OFP no lista ningún punto (vuelo directo u OFP incompleto).'
    ]);
    if (!routeFixes(raw).length) return tr(['navlog sans point positionné ({n} entrée(s), aucune avec latitude et longitude).',
      'navlog without positioned point ({n} entries, none with latitude and longitude).',
      'Navlog ohne Punkt mit Position ({n} Einträge, keiner mit Breite und Länge).',
      'navlog sin punto posicionado ({n} entradas, ninguna con latitud y longitud).'
    ], {
      n: all.length
    });
    return '';
  }

  /** Date de l'OFP (params.time_generated : ISO en v2, secondes Unix en json=1) → « 19/10 » ; '' si illisible. */
  function dateOf(raw) {
    const t = raw?.params?.time_generated;
    const d = /^\d+$/.test(String(t || '')) ? new Date(+t * 1000) : new Date(t || NaN);
    return Number.isFinite(d.getTime()) ? `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}` :
      '';
  }
  /** Résumé d'un OFP : date, trajet, nombre de points, niveau initial, dégagement, appareil (type et immatriculation). */
  function summary(raw) {
    const g = raw?.general || {},
      ft = num(g.initial_altitude),
      alt = alternate(raw),
      ac = [raw?.aircraft?.icaocode || raw?.aircraft?.icao_code, raw?.aircraft?.reg].filter(Boolean).join(' '),
      date = dateOf(raw);
    return [
      date ? tr(['OFP du {d}', 'OFP of {d}', 'OFP vom {d}', 'OFP del {d}'], {
        d: date
      }) : 'OFP',
      `${raw?.origin?.icao_code || '?'} → ${raw?.destination?.icao_code || '?'}`,
      tr(['{n} point(s)', '{n} point(s)', '{n} Punkt(e)', '{n} punto(s)'], {
        n: routeFixes(raw).length
      }),
      Number.isFinite(ft) && ft > 0 ? (ft >= 6000 ? `FL${String(Math.round(ft / 100)).padStart(3, '0')}` : `${ft} ft`) : '',
      alt ? tr(['dégagement {a}', 'alternate {a}', 'Ausweichflugplatz {a}', 'alternativo {a}'], {
        a: alt
      }) : '',
      ac
    ].filter(Boolean).join(' · ');
  }

  /** Fenêtre du JSON de l'OFP (lecture seule, texte sélectionné) avec « Copier » à côté de « Fermer ». */
  function showJson(raw) {
    const text = JSON.stringify(raw, null, 2),
      title = tr(['OFP SimBrief (JSON)', 'SimBrief OFP (JSON)', 'SimBrief-OFP (JSON)', 'OFP de SimBrief (JSON)']);
    /** Copie le JSON dans le presse-papiers et le confirme. */
    const copy = () => navigator.clipboard?.writeText(text).then(() => window.AppFramework?.notify?.(tr(['JSON de l’OFP copié.',
      'OFP JSON copied.', 'OFP-JSON kopiert.', 'JSON del OFP copiado.'
    ]), 'ok'), () => {});
    if (!window.AppFramework?.askText) return copy();
    window.AppFramework.askText(title, {
      value: text,
      readonly: true
    }).catch(() => {});
    // bouton « Copier » ajouté au pied de la fenêtre qui vient de s'ouvrir (askText n'a qu'un bouton en lecture seule)
    const foot = [...document.querySelectorAll('dialog.repo-ask[open] footer')].pop();
    if (foot) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ghost';
      b.textContent = tr(['Copier', 'Copy', 'Kopieren', 'Copiar']);
      b.addEventListener('click', copy);
      foot.prepend(b);
    }
  }

  /** Ligne de résultat dans host : résumé (ou raison de l'échec, en erreur) et lien « Voir le JSON ». */
  function render(host, raw, {
    error = ''
  } = {}) {
    if (!host) return;
    host.hidden = false;
    host.textContent = '';
    const span = document.createElement('span');
    span.textContent = error || summary(raw);
    if (error) span.className = 'err';
    const a = document.createElement('button');
    a.type = 'button';
    a.className = 'buttonLink ofp-json';
    a.textContent = tr(['Voir le JSON', 'View the JSON', 'JSON anzeigen', 'Ver el JSON']);
    a.addEventListener('click', () => showJson(raw));
    host.append(span, ' ', a);
  }

  window.SimbriefOfp = {
    fixes,
    routeFixes,
    alternate,
    problem,
    summary,
    showJson,
    render
  };
})();
