(() => {
  'use strict';
  // Appareils et simulateurs du pilote (Paramètres › Mon profil › Appareils et simulateurs ; avant : blocs « Mes appareils »
  // et « Mes simulateurs » de Mes missions).
  //   · appareils : types de la flotte possédés (dans son simulateur) / maîtrisés — une sous-carte par catégorie
  //     (hélicoptères, réacteurs, turbopropulseurs, pistons), tableau : type (désignateur et modèle), variantes de la
  //     flotte, appareils et bases, cases Possédé / Maîtrisé (maîtrisé implique possédé) ;
  //   · simulateurs : liste de la feuille FLOTTE du classeur ODV (MissionAssignments.simulators) ;
  //   · enregistrés dans ce navigateur (MissionAssignments.saveAircraft / saveSims), puis recopiés dans les semaines
  //     déclarées du pilote à partir de la semaine en cours (le Centre lit les appareils dans ces fichiers).
  // API (window.EquipmentEditor) : mount(hôte, TRI) → Promise.
  if (window.EquipmentEditor) return;
  const K = window.RepositoryKit,
    esc = K.esc,
    t = K.t,
    tf = K.tf;
  const A = () => window.MissionAssignments;

  function css() {
    if (document.getElementById('equipmentEditorCss')) return;
    const s = document.createElement('style');
    s.id = 'equipmentEditorCss';
    s.textContent = `.eq-sum{margin:0 0 8px;font-weight:600}.eq-cards{display:grid;gap:10px}
.eq-table{width:100%;border-collapse:collapse;font-size:12.5px}.eq-table th,.eq-table td{padding:5px 8px;text-align:left;vertical-align:middle;border-bottom:1px solid color-mix(in srgb,currentColor 12%,transparent)}
.eq-table th{font-size:11.5px;font-weight:700;opacity:.8}.eq-table .eq-c{width:5.5em;text-align:center}.eq-table .eq-c input{margin:0;width:16px;height:16px;vertical-align:middle;cursor:pointer}
.eq-table code{font-size:11px}.eq-table small{opacity:.75}
.eq-sims{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px 14px}.eq-sims label{display:inline-flex;align-items:center;gap:6px;margin:0}.eq-sims input{margin:0}`;
    document.head.append(s);
  }

  // recopie dans les semaines déclarées : une à la fois, après la dernière coche (plusieurs coches rapprochées : une passe)
  let timer = 0,
    chain = Promise.resolve();
  /** Semaines déclarées du pilote à partir de la semaine en cours : appareils et simulateurs remis à jour ; nombre de
   *  semaines réécrites. */
  async function syncWeeks(tri) {
    const SD = window.SuiteDispos;
    if (!SD?.readPilot) return 0;
    const cur = SD.weekId(Date.now()),
      weeks = await SD.readPilot(tri, {
        fresh: true
      }),
      av = await A().availability(tri);
    const extra = {
      appareils: {
        possedes: av?.aircraft?.owned || [],
        maitrises: av?.aircraft?.mastered || []
      },
      simulateurs: av?.sims || []
    };
    let n = 0;
    for (const [w, d] of Object.entries(weeks).sort())
      if (w >= cur && Object.keys(d?.dispos || {}).length) {
        await SD.saveWeek(tri, w, d.dispos, extra);
        n++;
      }
    return n;
  }

  async function mount(host, tri) {
    css();
    tri = String(tri || '').toUpperCase();
    const M = A(),
      types = M.fleetTypes(),
      decl = tri ? await M.availability(tri) : null;
    const ac = decl?.aircraft || {
      owned: [],
      mastered: []
    };
    const owned = new Set([...(ac.owned || []), ...(ac.mastered || [])]),
      mastered = new Set(ac.mastered || []);
    const mine = new Set(decl?.sims || []),
      sims = [...new Set([...M.simulators(), ...mine])];
    const groups = [...new Set(types.map(x => x.category))].map(c => types.filter(x => x.category === c));
    const ICON = {
      helico: 'propeller',
      jet: 'plane',
      turboprop: 'propeller',
      piston: 'propeller',
      other: 'plane'
    };
    const summary = () => tf(['{m} type(s) maîtrisé(s), {o} possédé(s) sur {n} types de la flotte.', '{m} type(s) mastered, {o} owned out of {n} fleet types.', '{m} Typ(en) beherrscht, {o} besessen von {n} Flottentypen.', '{m} tipo(s) dominado(s), {o} poseído(s) de {n} tipos de la flota.'], {
      m: mastered.size,
      o: owned.size,
      n: types.length
    });
    const typesHtml = types.length ? `<p class="eq-sum" data-eq-sum>${esc(summary())}</p><div class="eq-cards">${groups.map(g => `<div class="repo-card" data-icon="${ICON[g[0].category] || 'plane'}" data-subtitle="${esc(tf(['{n} type(s)', '{n} type(s)', '{n} Typ(en)', '{n} tipo(s)'], { n: g.length }))}"><h3>${esc(g[0].categoryLabel)}</h3>
      <table class="eq-table"><thead><tr><th>${esc(t(['Type', 'Type', 'Typ', 'Tipo']))}</th><th>${esc(t(['Variantes de la flotte', 'Fleet variants', 'Flottenvarianten', 'Variantes de la flota']))}</th><th>${esc(t(['Appareils', 'Aircraft', 'Luftfahrzeuge', 'Aeronaves']))}</th><th class="eq-c">${esc(t(['Possédé', 'Owned', 'Besessen', 'Poseído']))}</th><th class="eq-c">${esc(t(['Maîtrisé', 'Mastered', 'Beherrscht', 'Dominado']))}</th></tr></thead><tbody>${g.map(x => `<tr>
        <td><b>${esc(x.model)}</b><br><code>${esc(x.type)}</code>${x.description ? ` <small title="${esc(t(['Description OACI (Doc 8643)', 'ICAO description (Doc 8643)', 'ICAO-Beschreibung (Doc 8643)', 'Descripción OACI (Doc 8643)']))}">${esc(x.description)}</small>` : ''}</td>
        <td>${esc(x.variants.join(', ') || '—')}</td>
        <td><b>${x.operational}</b>${x.operational < x.count ? `<small> / ${x.count}</small>` : ''}<br><small title="${esc(x.bases.join(', '))}">${esc(x.bases.slice(0, 3).join(', '))}${x.bases.length > 3 ? '…' : ''}</small></td>
        <td class="eq-c"><input type="checkbox" data-own="${esc(x.type)}"${owned.has(x.type) ? ' checked' : ''} aria-label="${esc(tf(['{m} possédé', '{m} owned', '{m} besessen', '{m} poseído'], { m: x.model }))}"></td>
        <td class="eq-c"><input type="checkbox" data-master="${esc(x.type)}"${mastered.has(x.type) ? ' checked' : ''} aria-label="${esc(tf(['{m} maîtrisé', '{m} mastered', '{m} beherrscht', '{m} dominado'], { m: x.model }))}"></td></tr>`).join('')}</tbody></table></div>`).join('')}</div>` : `<p class="small">${esc(t(['Flotte non chargée.', 'Fleet not loaded.', 'Flotte nicht geladen.', 'Flota no cargada.']))}</p>`;
    host.innerHTML = `<div class="sp-card" id="eqTypes" data-no-i18n><h3>${esc(t(['Appareils', 'Aircraft', 'Luftfahrzeuge', 'Aeronaves']))}</h3><p class="sp-hint">${esc(t(['Types de la flotte que vous possédez dans votre simulateur et ceux que vous maîtrisez : le Centre s’en sert pour vous affecter un appareil.', 'Fleet types you own in your simulator and those you have mastered: the Centre uses them to assign you an aircraft.', 'Flottentypen, die Sie in Ihrem Simulator besitzen, und die, die Sie beherrschen: Das Zentrum nutzt sie, um Ihnen ein Luftfahrzeug zuzuweisen.', 'Tipos de la flota que posee en su simulador y los que domina: el Centro los usa para asignarle una aeronave.']))}</p><div data-eq-types>${typesHtml}</div></div>
      <div class="sp-card" id="eqSims" data-no-i18n><h3>${esc(t(['Simulateurs', 'Simulators', 'Simulatoren', 'Simuladores']))}</h3><p class="sp-hint">${esc(t(['Simulateurs et outils installés (colonnes de la feuille FLOTTE du classeur ODV) : le Centre s’en sert pour réunir des pilotes sur un simulateur commun.', 'Installed simulators and tools (columns of the FLOTTE sheet of the ODV workbook): the Centre uses them to gather pilots on a common simulator.', 'Installierte Simulatoren und Werkzeuge (Spalten des Blatts FLOTTE der ODV-Arbeitsmappe): Das Zentrum nutzt sie, um Piloten auf einem gemeinsamen Simulator zusammenzubringen.', 'Simuladores y herramientas instalados (columnas de la hoja FLOTTE del libro ODV): el Centro los usa para reunir a pilotos en un simulador común.']))}</p>
        <div class="eq-sims" data-eq-sims>${sims.map(s => `<label><input type="checkbox" data-sim="${esc(s)}"${mine.has(s) ? ' checked' : ''}> ${M.simChips([s])}${esc(s)}</label>`).join('')}</div></div>
      <p class="small" data-eq-msg>${esc(t(['Gardé dans ce navigateur et recopié dans vos semaines de disponibilités déclarées, à partir de la semaine en cours (pour le Centre).', 'Kept in this browser and copied into your declared availability weeks, from the current week on (for the Centre).', 'In diesem Browser gespeichert und in Ihre angegebenen Verfügbarkeitswochen ab der aktuellen Woche übernommen (für das Zentrum).', 'Guardado en este navegador y copiado en sus semanas de disponibilidad declaradas, a partir de la semana actual (para el Centro).']))}</p>`;
    // lien vers une carte (#eqTypes, #eqSims : boutons de Mes missions) : carte amenée à l'écran une fois dessinée
    if (/^#eq(Types|Sims)$/.test(location.hash)) host.querySelector(location.hash)?.scrollIntoView({ block: 'start' });
    const msg = host.querySelector('[data-eq-msg]');
    host.onchange = e => {
      const x = e.target;
      if (!x.matches('[data-own], [data-master], [data-sim]')) return;
      if (x.dataset.master && x.checked) host.querySelector(`[data-own="${x.dataset.master}"]`).checked = true; // maîtrisé → possédé
      if (x.dataset.own && !x.checked) host.querySelector(`[data-master="${x.dataset.own}"]`).checked = false; // non possédé → non maîtrisé
      if (x.dataset.sim) M.saveSims(tri, [...host.querySelectorAll('[data-sim]:checked')].map(i => i.dataset.sim));
      else {
        const d = M.saveAircraft(tri, {
          owned: [...host.querySelectorAll('[data-own]:checked')].map(i => i.dataset.own),
          mastered: [...host.querySelectorAll('[data-master]:checked')].map(i => i.dataset.master)
        });
        owned.clear();
        d.aircraft.owned.forEach(v => owned.add(v));
        mastered.clear();
        d.aircraft.mastered.forEach(v => mastered.add(v));
        const sum = host.querySelector('[data-eq-sum]');
        if (sum) sum.textContent = summary();
      }
      clearTimeout(timer);
      timer = setTimeout(() => {
        chain = chain.then(() => syncWeeks(tri)).then(n => {
          msg.textContent = n ? tf(['Gardé dans ce navigateur et recopié dans {n} semaine(s) de disponibilités déclarée(s).', 'Kept in this browser and copied into {n} declared availability week(s).', 'In diesem Browser gespeichert und in {n} angegebene Verfügbarkeitswoche(n) übernommen.', 'Guardado en este navegador y copiado en {n} semana(s) de disponibilidad declarada(s).'], {
            n
          }) : t(['Gardé dans ce navigateur ; recopié avec votre prochaine semaine de disponibilités déclarée.', 'Kept in this browser; copied with your next declared availability week.', 'In diesem Browser gespeichert; mit Ihrer nächsten angegebenen Verfügbarkeitswoche übernommen.', 'Guardado en este navegador; copiado con su próxima semana de disponibilidad declarada.']);
        }, err => {
          msg.textContent = err?.message || String(err);
        });
      }, 600);
    };
    window.AppFramework?.refresh?.(); // en-têtes des sous-cartes (icône, titre, sous-titre)
  }

  window.EquipmentEditor = {
    mount
  };
})();
