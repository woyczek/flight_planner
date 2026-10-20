(() => {
  'use strict';
  // Saisie des disponibilités d'une semaine dans la suite (Mes missions › Mes disponibilités, apps/pilot/disponibilites.html) :
  // le module de saisie shared/dispos_timeline.js (axe continu, fond et dispos, une minute un seul état), monté avec les
  // catégories de la suite (SuiteDispos.timelineConfig), ses textes en quatre langues (K.t), densité compacte, aide
  // repliée, sans période répétitive ; autour de lui, ce qui est à la suite :
  //   · barre de semaine (‹ date › « semaine en cours », titre) — ou semaine imposée par la page hôte (nav: false) ;
  //   · sous la palette, les thèmes de mission ouverts par la catégorie choisie (lien vers les préférences pour une
  //     catégorie personnalisée) ;
  //   · « Plage précise » : groupe, catégorie, jours, de, à (à la minute, UTC ; vides : journée entière) → api.add ;
  //   · « ⧉ Semaine précédente » (copie dans la semaine affichée, confirmation si elle n'est pas vide, Ctrl+Z l'annule),
  //     « Tout effacer » (Ctrl+Z l'annule), « Écrire dans le dossier des données (n) », ligne d'état ;
  //   · chaque retouche est enregistrée au schema 3 (SuiteDispos.saveWeek : dossier des données, sinon ce navigateur),
  //     dans l'ordre, avec appareils et simulateurs du pilote relus ; semaine relue quand un autre onglet l'écrit
  //     (defa-data-change), composant remonté au changement de langue ou de catégories ;
  //   · semaine sans déclaration mais ancienne grille horaire (fichier <TRI>.json d'avant les catégories) : importée,
  //     puis enregistrée ;
  //   · mode mobile (html[data-mobile]) : vue « un jour » (dayRender) au lieu de la grille de la semaine, qui ne se trace
  //     pas au doigt ; bascule Jour / Semaine (choix gardé : disposView:v1).
  // API (window.DisposWeek) : mount(hôte, { nav = true }) → { set({ tri, week }), refresh(), touch(), week } ;
  //   legend() : HTML des catégories par groupe (pastilles inertes, Planning ODV) ; subtitle(), bindSubtitle(élément) :
  //   sous-titre du bloc de saisie, dans la langue courante.
  const K = window.RepositoryKit,
    esc = K.esc,
    t = K.t,
    tf = K.tf;
  const SD = () => window.SuiteDispos,
    A = () => window.MissionAssignments;
  /** Attend que window[name] existe (sondage toutes les 50 ms) ; rend l'objet, ou null après ms millisecondes. */
  const need = (name, ms = 6000) => new Promise(res => {
    const t0 = Date.now();
    /** Un tour de sondage, relancé tant que l'objet manque et que le délai court. */
    (function poll() {
      if (window[name]) return res(window[name]);
      if (Date.now() - t0 > ms) return res(null);
      setTimeout(poll, 50);
    })();
  });
  // locale des dates et des jours du module (Intl) : anglais britannique (19/10), pas américain (10/19)
  const lang = () => ['fr-FR', 'en-GB', 'de-DE', 'es-ES'][K.langIndex()] || 'fr-FR';
  const loc = () => ['fr-FR', 'en-GB', 'de-DE', 'es-ES'][K.langIndex()] || 'fr-FR';
  const isoDay = ms => new Date(ms).toISOString().slice(0, 10);
  /** Libellé court d'un jour (« lun 05/10 »), en UTC dans la langue de la page. */
  const dayLabel = ms => new Date(ms).toLocaleDateString(loc(), {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC'
  }).replace('.', '');
  const mins = s => s ? +s.slice(0, 2) * 60 + +s.slice(3, 5) : null;

  // ---- textes du module de saisie, dans les quatre langues (clés de DisposTimeline.DEFAULT_LABELS)
  const LABELS = {
    erase: ['Effacer le fond', 'Erase background', 'Hintergrund löschen', 'Borrar el fondo'],
    'erase.title': ['Effacer le fond (les dispos restent)', 'Erase the background (availabilities stay)',
      'Hintergrund löschen (Verfügbarkeiten bleiben)', 'Borrar el fondo (las disponibilidades se quedan)'
    ],
    'brush.bg': [
      '{label} — déposé sur une bande ou une dispo : en change la nature ; sur un jour : journée entière ; double-clic : fond de toute la semaine',
      '{label} — dropped on a band or an availability: changes its nature; on a day: whole day; double-click: background of the whole week',
      '{label} — auf ein Band oder eine Verfügbarkeit gezogen: ändert deren Art; auf einen Tag: ganzer Tag; Doppelklick: Hintergrund der ganzen Woche',
      '{label} — soltado sobre una banda o una disponibilidad: cambia su naturaleza; sobre un día: el día entero; doble clic: fondo de toda la semana'
    ],
    'brush.fg': ['{label} — déposé sur une bande ou une dispo : en change la nature ; sur un jour : journée entière',
      '{label} — dropped on a band or an availability: changes its nature; on a day: whole day',
      '{label} — auf ein Band oder eine Verfügbarkeit gezogen: ändert deren Art; auf einen Tag: ganzer Tag',
      '{label} — soltado sobre una banda o una disponibilidad: cambia su naturaleza; sobre un día: el día entero'
    ],
    'hover.default': ['Indisponible (par défaut)', 'Unavailable (default)', 'Nicht verfügbar (Standard)',
      'No disponible (por defecto)'
    ],
    'hover.day': ['{day}, de {from} à {to} : {name}', '{day}, {from} to {to}: {name}', '{day}, {from} bis {to}: {name}',
      '{day}, de {from} a {to}: {name}'
    ],
    'hover.days': ['du {day} {from} au {day2} {to} : {name}', 'from {day} {from} to {day2} {to}: {name}',
      'vom {day} {from} bis {day2} {to}: {name}', 'del {day} {from} al {day2} {to}: {name}'
    ],
    box: ['{label} {from}–{to}, {day} → {day2}', '{label} {from}–{to}, {day} → {day2}', '{label} {from}–{to}, {day} → {day2}',
      '{label} {from}–{to}, {day} → {day2}'
    ],
    delete: ['Effacer', 'Delete', 'Löschen', 'Borrar'],
    'help.title': ['Comment s’en servir', 'How to use', 'So geht’s', 'Cómo usarlo'],
    'help.layers': [
      'Deux couches. Le fond dit la nature d’une indisponibilité (indisponible, congés, récupération, activité réelle) : la couleur seule, sur toute la hauteur de la rangée. La première couche porte les dispos, exercices et occupations : des rectangles avec une lettre et leurs horaires. Une minute n’a qu’un état : là où un rectangle est posé, le fond dessous ne compte pas, mais il reste en place et revient quand le rectangle s’en va.',
      'Two layers. The background gives the nature of an unavailability (unavailable, holidays, time off, real-life activity): colour only, full row height. The first layer holds the availabilities, exercises and busy times: rectangles with a letter and their times. A minute has one state only: where a rectangle lies, the background under it does not count, but it stays in place and comes back when the rectangle moves away.',
      'Zwei Ebenen. Der Hintergrund gibt die Art einer Nichtverfügbarkeit an (nicht verfügbar, Urlaub, Ausgleich, Termin im echten Leben): nur die Farbe, über die ganze Zeilenhöhe. Die erste Ebene trägt Verfügbarkeiten, Übungen und Belegungen: Rechtecke mit einem Buchstaben und ihren Zeiten. Eine Minute hat nur einen Zustand: wo ein Rechteck liegt, zählt der Hintergrund darunter nicht, bleibt aber erhalten und kehrt zurück, wenn das Rechteck weggeht.',
      'Dos capas. El fondo indica la naturaleza de una no disponibilidad (no disponible, vacaciones, descanso, actividad real): solo el color, en toda la altura de la fila. La primera capa lleva las disponibilidades, ejercicios y ocupaciones: rectángulos con una letra y sus horarios. Un minuto solo tiene un estado: donde hay un rectángulo, el fondo de debajo no cuenta, pero se queda en su sitio y vuelve cuando el rectángulo se va.'
    ],
    'help.palette': [
      'La palette. Cliquer sur une puce choisit le pinceau : il dit seulement QUOI tracer. Les puces de fond sont sur la dernière ligne.',
      'The palette. Click a chip to choose the brush: it only says what the next drawing will be. Background chips are on the last line.',
      'Die Palette. Ein Klick auf einen Chip wählt den Pinsel: er sagt nur, WAS gezeichnet wird. Die Hintergrund-Chips stehen in der letzten Zeile.',
      'La paleta. Un clic en una ficha elige el pincel: solo indica QUÉ trazar. Las fichas de fondo están en la última línea.'
    ],
    'help.draw': [
      'Tracer. Glisser dans le vide ou dans l’espace entre deux rangées : la forme s’aimante à la demi-heure. Sur plusieurs jours, un rectangle de sélection pose la même plage horaire sur chaque jour traversé.',
      'Draw. Drag on empty space or in the gap between two rows: the shape snaps to the half hour. Across several days, a selection rectangle lays the same hours on each day it crosses.',
      'Zeichnen. Im leeren Bereich oder im Abstand zwischen zwei Zeilen ziehen: die Form rastet auf der halben Stunde ein. Über mehrere Tage legt ein Auswahlrechteck dieselben Stunden auf jeden durchquerten Tag.',
      'Trazar. Arrastrar en el vacío o en el espacio entre dos filas: la forma se ajusta a la media hora. En varios días, un rectángulo de selección pone el mismo horario en cada día que cruza.'
    ],
    'help.grab': [
      'Saisir une forme. Un geste qui part sur une forme, rectangle ou bande, la saisit quel que soit le pinceau : un clic la sélectionne, un glisser la déplace (pas de 5 min ; vers le haut ou le bas : même horaire, autre jour), ses bords la redimensionnent. Maj+glisser trace par-dessus : c’est ainsi qu’on pose une dispo sur un jour déjà couvert d’une bande.',
      'Take a shape. A gesture that starts on a shape, rectangle or band, takes it whatever the brush: a click selects it, a drag moves it (5 min steps; up or down: same times, another day), its edges resize it. Shift+drag draws over it instead, which is how to draw an availability on a day already covered by a band.',
      'Eine Form greifen. Eine Geste, die auf einer Form (Rechteck oder Band) beginnt, greift sie, egal welcher Pinsel: ein Klick wählt sie aus, Ziehen verschiebt sie (in 5-min-Schritten; nach oben oder unten: gleiche Zeiten, anderer Tag), ihre Ränder ändern die Größe. Umschalt+Ziehen zeichnet darüber: so legt man eine Verfügbarkeit auf einen Tag, der schon von einem Band bedeckt ist.',
      'Tomar una forma. Un gesto que empieza sobre una forma, rectángulo o banda, la toma sea cual sea el pincel: un clic la selecciona, arrastrar la mueve (pasos de 5 min; hacia arriba o abajo: mismo horario, otro día), sus bordes la redimensionan. Mayús+arrastrar traza encima: así se pone una disponibilidad en un día ya cubierto por una banda.'
    ],
    'help.cut': [
      'Découper. La dernière forme gagne : un rectangle tracé sur un autre le découpe, un fond tracé à travers un rectangle aussi. La découpe se voit pendant le geste.',
      'Cut. The last shape wins: a rectangle drawn over another cuts it, and a background drawn through a rectangle cuts it too. The cut shows while you drag.',
      'Schneiden. Die letzte Form gewinnt: ein über ein anderes gezeichnetes Rechteck schneidet es, ein Hintergrund durch ein Rechteck ebenfalls. Der Schnitt ist während der Geste zu sehen.',
      'Cortar. La última forma gana: un rectángulo trazado sobre otro lo corta, y un fondo trazado a través de un rectángulo también. El corte se ve durante el gesto.'
    ],
    'help.drop': [
      'Déposer, double-cliquer. Glisser une puce sur une forme : la forme prend cette nature. La déposer sur le vide d’une rangée ou sur le nom du jour : toute la journée, et une puce de fond ne change alors que le fond, les rectangles restent. Double-clic sur une bande : sa couleur devient le fond de toute la journée ; sur une puce de fond : de toute la semaine.',
      'Drop and double-click. Drag a chip onto a shape: the shape takes that nature. Drop it on the empty part of a row or on the day name: the whole day, and a background chip then changes only the background, rectangles stay. Double-click a band: its colour becomes the background of the whole day; double-click a background chip: of the whole week.',
      'Ablegen, Doppelklick. Einen Chip auf eine Form ziehen: die Form nimmt diese Art an. Auf den leeren Teil einer Zeile oder den Tagesnamen ablegen: der ganze Tag, und ein Hintergrund-Chip ändert dann nur den Hintergrund, die Rechtecke bleiben. Doppelklick auf ein Band: seine Farbe wird Hintergrund des ganzen Tages; auf einen Hintergrund-Chip: der ganzen Woche.',
      'Soltar, doble clic. Arrastrar una ficha sobre una forma: la forma toma esa naturaleza. Soltarla en el vacío de una fila o en el nombre del día: el día entero, y una ficha de fondo solo cambia entonces el fondo, los rectángulos se quedan. Doble clic en una banda: su color pasa a ser el fondo de todo el día; en una ficha de fondo: de toda la semana.'
    ],
    'help.fix': [
      'Corriger. Le ✕ d’une forme, ou Suppr sur la sélection, l’efface ; les flèches la déplacent (← → 5 min, ↑ ↓ un jour) ; Échap désélectionne. Ctrl+Z annule, Ctrl+Y ou Ctrl+Maj+Z rétablit.',
      'Correct. ✕ on a shape, or Delete on the selection, removes it; the arrow keys move it (← → 5 min, ↑ ↓ one day); Escape clears the selection. Ctrl+Z undoes, Ctrl+Y or Ctrl+Shift+Z redoes.',
      'Korrigieren. Das ✕ einer Form oder Entf auf der Auswahl löscht sie; die Pfeiltasten verschieben sie (← → 5 min, ↑ ↓ ein Tag); Esc hebt die Auswahl auf. Strg+Z macht rückgängig, Strg+Y oder Strg+Umschalt+Z stellt wieder her.',
      'Corregir. La ✕ de una forma, o Supr sobre la selección, la borra; las flechas la mueven (← → 5 min, ↑ ↓ un día); Esc quita la selección. Ctrl+Z deshace, Ctrl+Y o Ctrl+Mayús+Z rehace.'
    ],
    'help.saved': [
      'Ce qui est enregistré. Les heures sont en UTC, les semaines sont des semaines ISO (du lundi au dimanche). Chaque retouche est enregistrée (dossier des données, sinon ce navigateur) ; le Centre s’en sert pour affecter les missions. Le temps sans rien est indisponible.',
      'What is saved. Times are in UTC, weeks are ISO weeks (Monday to Sunday). Every change is saved (data folder, otherwise this browser); the Centre uses it to assign missions. Time with nothing is unavailable.',
      'Was gespeichert wird. Die Zeiten sind UTC, die Wochen sind ISO-Wochen (Montag bis Sonntag). Jede Änderung wird gespeichert (Datenordner, sonst dieser Browser); das Zentrum nutzt sie, um Missionen zuzuteilen. Zeit ohne Eintrag gilt als nicht verfügbar.',
      'Qué se guarda. Las horas están en UTC, las semanas son semanas ISO (de lunes a domingo). Cada cambio se guarda (carpeta de datos, si no este navegador); el Centro lo usa para asignar las misiones. El tiempo sin nada es no disponible.'
    ]
  };
  /** Textes du module dans la langue courante. */
  const labels = () => Object.fromEntries(Object.entries(LABELS).map(([k, row]) => [k, t(row)]));

  /** Insère une fois la feuille de style de la page de saisie (disposWeekCss). */
  function css() {
    if (document.getElementById('disposWeekCss')) return;
    const s = document.createElement('style');
    s.id = 'disposWeekCss';
    s.textContent = `.dw-wrap{display:grid;gap:8px}.dw-nav,.dw-add,.dw-actions{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center}
.dw-add label{display:inline-flex;gap:5px;align-items:center;font-size:12.5px}.dw-add select,.dw-add input[type=time]{padding:3px 5px;font:inherit}
.dw-days{display:inline-flex;flex-wrap:wrap;gap:2px 8px}.dw-days label{font-size:12px}.dw-themes{margin:2px 0 0;font-size:12px;opacity:.85}
.dw-precise>summary{cursor:pointer;font-size:12px;opacity:.85}.dw-precise[open]>summary{margin-bottom:6px}.dw-msg{margin:0}
.dw-legend{display:grid;grid-template-columns:max-content 1fr;gap:3px 6px;align-items:center}.dw-legend-r{display:flex;flex-wrap:wrap;gap:2px}
.dw-legend-n{font:400 10.5px/1.2 system-ui,sans-serif;opacity:.85;white-space:nowrap}
.dw-view{display:flex;gap:4px}.dw-view button{flex:1}
.dw-wrap :is(.dw-view button[aria-pressed=true],.dw-dpills button[aria-current=true]):not(#imp){background:var(--accent,#1d6fd8) !important /* garder */;color:#fff !important /* garder */}
.dw-day-on [data-tl] :is(.dt-grid,.dt-helpbox){display:none}.dw-dayview{display:grid;gap:8px}
.dw-dhead{display:flex;align-items:center;gap:8px}.dw-dhead b{flex:1;text-align:center;font-size:15px}
.dw-dpills{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}.dw-dpills button{padding:5px 0;font-size:12px;line-height:1.15}
.dw-dpills button.has::after{content:'';display:block;width:6px;height:6px;margin:2px auto 0;border-radius:50%;background:currentColor}
.dw-dhint{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin:0;font-size:13px}
.dw-dlist{list-style:none;margin:0;padding:0;display:grid;gap:4px}.dw-dlist li{display:flex;align-items:center;gap:8px;font-size:13px}
.dw-dlist li>span{flex:1}.dw-dlist i{flex:none;width:14px;height:14px;border:1px solid #0003}
.dw-colbox{max-height:62vh;overflow-y:auto;overscroll-behavior:contain}.dw-col{position:relative;cursor:pointer;touch-action:manipulation;border:1px solid color-mix(in srgb,currentColor 25%,transparent);
background-image:repeating-linear-gradient(to bottom,color-mix(in srgb,currentColor 22%,transparent) 0 1px,transparent 1px 48px),
repeating-linear-gradient(to bottom,color-mix(in srgb,currentColor 9%,transparent) 0 1px,transparent 1px 24px)}
.dw-col .dw-h{position:absolute;left:4px;font-size:11px;opacity:.75;padding-top:1px;pointer-events:none}
.dw-col :is(.dw-dbg,.dw-dfg,.dw-dpick){position:absolute;pointer-events:none;box-sizing:border-box}.dw-dbg{left:46px;right:0;opacity:.55}
.dw-dfg{left:58px;right:6px;padding:2px 6px;font-size:12px;line-height:1.3;overflow:hidden;border-radius:4px;box-shadow:0 1px 2px #0004}
.dw-dpick{left:46px;right:0;outline:2px dashed var(--accent,#1d6fd8);outline-offset:-2px;background:color-mix(in srgb,var(--accent,#1d6fd8) 18%,transparent)}
.dw-wrap :is(.dt-brush,.dt-x){border-radius:0 !important /* garder */;min-height:0 !important /* garder */;height:auto !important /* garder */;letter-spacing:0 !important /* garder */;text-transform:none !important /* garder */;text-shadow:none !important /* garder */;margin:0 !important /* garder */}.dw-chip{padding:0 3px;border:1px solid rgba(0,0,0,.3);font:400 9.5px/1.45 system-ui,sans-serif;white-space:nowrap}`;
    document.head.append(s);
  }
  /** Couleur d'encre lisible sur le fond c. */
  const ink = c => (K.color.luminance(c) ?? 1) < .4 ? '#fff' : '#1b1b1b';

  /** Légende des catégories (Planning ODV) : pastilles inertes par groupe, lettre et libellé court sur leur couleur. */
  function legend() {
    const D = SD();
    if (!D) return '';
    css();
    const cats = D.categories();
    return `<div class="dw-legend">${D.groups().map(g => {
      const list = cats.filter(c => c.groupe === g.id);
      return list.length ? `<span class="dw-legend-n">${esc(D.label(g.label))}</span><span class="dw-legend-r">${list.map(c => `<span class="dw-chip" style="background:${D.color(c)};color:${ink(D.color(c))}" title="${esc(`${D.code(c)} — ${D.label(c.label)}`)}">${esc([D.code(c), D.shortLabel(c)].filter(Boolean).join(' '))}</span>`).join('')}</span>` : '';
    }).join('')}</div>`;
  }

  /** Monte la saisie dans host ; nav : barre de semaine (false : semaine imposée par la page hôte). */
  function mount(host, {
    nav = true
  } = {}) {
    css();
    let tri = '',
      week = '',
      ui = null, // composant DisposTimeline monté
      extra = {}, // appareils, simulateurs (déclaration du pilote)
      ready = null,
      loadSeq = 0,
      shownKey = '', // pilote et semaine des données tenues par le composant
      lastSaved = ''; // updated_at de notre dernière écriture (relecture d'un autre onglet seulement)
    host.classList.add('dw-wrap');
    host.setAttribute('data-no-i18n', ''); // textes composés dans la langue courante (refaits au changement de langue)
    let last = ['', ''];
    /** Message d'état (kind : ok, warn, err), gardé pour survivre aux redessins. */
    const msg = (text, kind = '') => {
      last = [text || '', kind];
      const p = host.querySelector('.dw-msg');
      if (p && p.textContent !== last[0]) p.textContent = last[0];
      if (p) p.className = `dw-msg small ${kind}`;
    };
    const BRUSH = 'disposBrush:v1';
    const storedBrush = () => {
      try {
        return localStorage.getItem(BRUSH) || '';
      } catch {
        return '';
      }
    };

    /** Squelette de la page : barre de semaine, composant, plage précise, actions, état ; composant (re)monté. */
    function frame() {
      const D = SD();
      if (!D || !window.DisposTimeline) return;
      const keep = ui && shownKey === `${tri}|${week}` ? ui.get() : null,
        brush = ui?.brush() || storedBrush();
      ui?.destroy();
      ui = null;
      host.innerHTML = `${nav ? '<div class="dw-nav" data-nav></div>' : ''}<p class="small" data-notri hidden></p><div class="dw-view" data-view hidden><button type="button" class="secondary" data-view-set="day">${esc(t(['Jour', 'Day', 'Tag', 'Día']))}</button><button type="button" class="secondary" data-view-set="week">${esc(t(['Semaine', 'Week', 'Woche', 'Semana']))}</button></div><div data-tl></div><div class="dw-dayview" data-dayview hidden></div>
        <details class="dw-precise"><summary>${esc(t(['Plage précise', 'Precise range', 'Genauer Zeitraum', 'Intervalo preciso']))}</summary><div class="dw-add" data-add-form></div></details>
        <div class="dw-actions" data-actions></div><p class="dw-msg small ${last[1]}">${esc(last[0])}</p>`;
      if (!tri) return render();
      ui = window.DisposTimeline.mount(host.querySelector('[data-tl]'), {
        config: D.timelineConfig(),
        week,
        data: keep,
        lang: lang(),
        labels: labels(),
        density: 'compact',
        help: 'collapsed',
        nav: false,
        period: false,
        buttonClass: 'repo-plain', // pastilles et ✕ du module : hors du style des boutons des designs (angles : règle
        // « garder » de css(), un design arrondit aussi les boutons repo-plain)
        onChange: d => queueSave(tri, d)
      });
      const slot = ui.slot('palette');
      if (slot) slot.innerHTML = '<p class="dw-themes" data-themes></p>';
      if (brush) ui.brush(brush);
      host.querySelector('[data-tl]').addEventListener('dispos-brush', e => {
        try {
          localStorage.setItem(BRUSH, e.detail.id);
        } catch {
          /* stockage indisponible */
        }
        themesHint(e.detail.id);
      });
      // vue « un jour » redessinée à chaque retouche, annulation, semaine relue ou pinceau choisi
      for (const ev of ['dispos-change', 'dispos-history', 'dispos-week', 'dispos-brush']) host.querySelector('[data-tl]')
        .addEventListener(ev, dayRender);
      render();
      themesHint(ui.brush());
    }
    /** Parties de la page autour du composant : barre de semaine, formulaire de plage précise, actions. */
    function render() {
      const D = SD();
      if (!D) return;
      const mon = D.weekMonday(week || D.weekId(Date.now())),
        curWeek = D.weekId(Date.now());
      const navEl = host.querySelector('[data-nav]');
      if (navEl) navEl.innerHTML = `<button type="button" class="secondary" data-wk="-1" title="${esc(t(['Semaine précédente', 'Previous week', 'Vorherige Woche', 'Semana anterior']))}">‹</button><input type="date" data-wk-date value="${isoDay(mon)}"><button type="button" class="secondary" data-wk="1" title="${esc(t(['Semaine suivante', 'Next week', 'Nächste Woche', 'Semana siguiente']))}">›</button>${week !== curWeek ? `<button type="button" class="secondary" data-wk="0">${esc(t(['Semaine en cours', 'Current week', 'Aktuelle Woche', 'Semana actual']))}</button>` : ''}<b>${esc(tf(['Semaine {w} — du {a} au {b} (UTC)', 'Week {w} — from {a} to {b} (UTC)', 'Woche {w} — vom {a} bis {b} (UTC)', 'Semana {w} — del {a} al {b} (UTC)'], { w: week.slice(6), a: dayLabel(mon), b: dayLabel(mon + 6 * 864e5) }))}</b>`;
      const noTri = host.querySelector('[data-notri]');
      noTri.hidden = !!tri;
      noTri.textContent = tri ? '' : t(['Trigramme non réglé : le régler dans Paramètres › Mon profil (ou ☰ › Profil pilote).',
        'Trigram not set: set it in Settings › My profile (or ☰ › Pilot profile).',
        'Kürzel nicht gesetzt: unter Einstellungen › Mein Profil (oder ☰ › Pilotenprofil) festlegen.',
        'Trigrama no definido: definirlo en Ajustes › Mi perfil (o ☰ › Perfil de piloto).'
      ]);
      for (const sel of ['.dw-precise', '[data-actions]']) host.querySelector(sel).hidden = !tri;
      if (!tri) return;
      const form = host.querySelector('[data-add-form]');
      if (!form.childElementCount) {
        const groups = D.groups();
        form.innerHTML = `<label>${esc(t(['Groupe', 'Group', 'Gruppe', 'Grupo']))} <select data-g>${groups.map(g => `<option value="${esc(g.id)}">${esc(D.label(g.label))}</option>`).join('')}</select></label>
          <label>${esc(t(['Catégorie', 'Category', 'Kategorie', 'Categoría']))} <select data-c></select></label>
          <span class="dw-days">${Array.from({ length: 7 }, (_, j) => `<label><input type="checkbox" data-day="${j}"> ${esc(new Date(mon + j * 864e5).toLocaleDateString(loc(), { weekday: 'short', timeZone: 'UTC' }).replace('.', ''))}</label>`).join('')}</span>
          <label>${esc(t(['de', 'from', 'von', 'de']))} <input type="time" step="60" data-from></label><label>${esc(t(['à', 'to', 'bis', 'a']))} <input type="time" step="60" data-to></label>
          <span class="small">UTC</span><button type="button" class="primary" data-add>${esc(t(['Ajouter', 'Add', 'Hinzufügen', 'Añadir']))}</button>`;
        fillCats();
      }
      const pending = (A()?.pendingData?.() || []).filter(p => p.startsWith(`disponibilites/${tri}/`)).length;
      const actions = `<button type="button" class="secondary" data-copy title="${esc(t(['Recopier la semaine précédente dans la semaine affichée (Ctrl+Z l’annule)', 'Copy the previous week into the shown week (Ctrl+Z undoes it)', 'Die Vorwoche in die angezeigte Woche übernehmen (Strg+Z macht es rückgängig)', 'Copiar la semana anterior en la semana mostrada (Ctrl+Z lo deshace)']))}">⧉ ${esc(t(['Semaine précédente', 'Previous week', 'Vorherige Woche', 'Semana anterior']))}</button>
        <button type="button" class="ghost" data-clear>${esc(t(['Tout effacer', 'Clear all', 'Alles löschen', 'Borrar todo']))}</button>
        ${pending ? `<button type="button" class="secondary" data-flush data-icon="save">${esc(tf(['Écrire dans le dossier des données ({n})', 'Write to the data folder ({n})', 'In den Datenordner schreiben ({n})', 'Escribir en la carpeta de datos ({n})'], { n: pending }))}</button>` : ''}`;
      const box = host.querySelector('[data-actions]');
      if (box.innerHTML !== actions) box.innerHTML = actions;
      dayRender();
    }

    // ---- vue « un jour » (mode mobile) : un jour à la fois, heures de haut en bas (une demi-heure : CELL px) ; un appui
    // pose le début, un second la fin (demi-heure comprise), avec la catégorie choisie dans la palette du module ; liste
    // des plages du jour, ✕ pour en retirer une ; « Annuler » (pas de Ctrl+Z sur téléphone). Même composant, mêmes
    // données : la grille de la semaine est seulement masquée (classe dw-day-on).
    const VIEW = 'disposView:v1',
      CELL = 24;
    let dayIdx = null, // jour affiché (0 : lundi) ; null : aujourd'hui s'il est dans la semaine, sinon lundi
      pick = null, // minute du jour du début choisi, en attente de la fin
      shownDay = ''; // semaine et jour dessinés (colonne replacée au changement de jour)
    const mobile = () => document.documentElement.dataset.mobile === 'on';
    const dayOn = () => {
      if (!mobile()) return false;
      try {
        return localStorage.getItem(VIEW) !== 'week';
      } catch {
        return true;
      }
    };
    const hm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    const isoAt = ms => new Date(ms).toISOString().slice(0, 16);
    /** Début (ms UTC) du jour affiché. */
    const dayStart = () => SD().weekMonday(week) + dayIdx * 864e5;
    /** Plages de la semaine (fond visible et dispos) coupées au jour d0 : { start, end, cat, a, b } (a, b : minutes). */
    const dayParts = (data, d0) => data.ranges.map(r => ({
      ...r,
      a: Math.max(Date.parse(`${r.start}:00Z`), d0),
      b: Math.min(Date.parse(`${r.end}:00Z`), d0 + 864e5)
    })).filter(r => r.b > r.a).map(r => ({
      ...r,
      a: (r.a - d0) / 6e4,
      b: (r.b - d0) / 6e4
    }));
    /** Dessine la vue « un jour » (écrit seulement ce qui change) ; ailleurs qu'en mode mobile, la cache. */
    function dayRender() {
      const box = host.querySelector('[data-dayview]'),
        sw = host.querySelector('[data-view]');
      if (!box || !sw) return;
      const on = !!ui && loaded() && dayOn();
      host.classList.toggle('dw-day-on', on);
      sw.hidden = !ui || !mobile();
      for (const b of sw.querySelectorAll('[data-view-set]')) b.setAttribute('aria-pressed', String((b.dataset.viewSet === 'day') ===
        dayOn()));
      box.hidden = !on;
      if (!on) return;
      const D = SD(),
        cats = new Map(D.timelineConfig().categories.map(c => [c.id, c])),
        mon = D.weekMonday(week);
      if (dayIdx === null) {
        const today = Math.floor((Date.now() - mon) / 864e5);
        dayIdx = today >= 0 && today < 7 ? today : 0;
      }
      const d0 = dayStart(),
        data = ui.get(),
        parts = dayParts(data, d0),
        brush = ui.brush(),
        bc = cats.get(brush),
        bg = r => cats.get(r.cat)?.layer === 'background',
        name = r => cats.get(r.cat)?.label || r.cat,
        title = new Date(d0).toLocaleDateString(loc(), {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          timeZone: 'UTC'
        });
      const pills = Array.from({
        length: 7
      }, (_, j) => {
        const has = dayParts(data, mon + j * 864e5).some(r => !bg(r)),
          lab = new Date(mon + j * 864e5).toLocaleDateString(loc(), {
            weekday: 'short',
            timeZone: 'UTC'
          }).replace('.', '');
        return `<button type="button" class="secondary${has ? ' has' : ''}" data-dpill="${j}" aria-current="${j === dayIdx}">${esc(lab)}<br>${new Date(mon + j * 864e5).getUTCDate()}</button>`;
      }).join('');
      const brushName = brush === '__erase' ? t(['effacer le fond', 'clear the background', 'Hintergrund löschen',
        'borrar el fondo'
      ]) : bc ? [bc.letter, bc.label].filter(Boolean).join(' ') : '—';
      const hint = pick === null ? `<span>${esc(tf(['Appuyer sur l’heure de début, puis sur l’heure de fin : {c}.',
          'Tap the start time, then the end time: {c}.', 'Auf die Anfangszeit tippen, dann auf die Endzeit: {c}.',
          'Tocar la hora de inicio y luego la hora de fin: {c}.'
        ], { c: brushName }))}</span><button type="button" class="secondary" data-dall>${esc(t(['Journée entière', 'Whole day', 'Ganzer Tag', 'Día entero']))}</button>` :
        `<span>${esc(tf(['Début {h} : appuyer sur l’heure de fin.', 'Start {h}: tap the end time.',
          'Beginn {h}: auf die Endzeit tippen.', 'Inicio {h}: tocar la hora de fin.'
        ], { h: hm(pick) }))}</span><button type="button" class="ghost" data-dcancel>${esc(t(['Annuler', 'Cancel', 'Abbrechen', 'Cancelar']))}</button>`;
      const undo = ui.history().undo ? `<button type="button" class="secondary" data-dundo>↶ ${esc(t(['Défaire', 'Undo', 'Rückgängig', 'Deshacer']))}</button>` : '';
      const list = parts.map((r, i) => `<li><i style="background:${esc(cats.get(r.cat)?.color || '#ccc')}"></i><span>${hm(r.a)}–${hm(r.b)} · ${esc(name(r))}</span><button type="button" class="ghost" data-dx="${i}" title="${esc(t(['Retirer', 'Remove', 'Entfernen', 'Quitar']))}">✕</button></li>`).join('');
      const col = Array.from({
        length: 24
      }, (_, h) => `<span class="dw-h" style="top:${h * 2 * CELL}px">${hm(h * 60)}</span>`).join('') + parts.map(r => {
        const c = cats.get(r.cat),
          pos = `top:${r.a / 30 * CELL}px;height:${(r.b - r.a) / 30 * CELL}px;background:${esc(c?.color || '#ccc')}`;
        return bg(r) ? `<div class="dw-dbg" style="${pos}"></div>` : `<div class="dw-dfg" style="${pos};color:${ink(c?.color || '#ccc')}">${hm(r.a)}–${hm(r.b)} ${esc([c?.letter, c?.short || name(r)].filter(Boolean).join(' '))}</div>`;
      }).join('') + (pick === null ? '' : `<div class="dw-dpick" style="top:${pick / 30 * CELL}px;height:${CELL}px"></div>`);
      const html = `<div class="dw-dhead"><button type="button" class="secondary" data-dstep="-1" title="${esc(t(['Jour précédent', 'Previous day', 'Vorheriger Tag', 'Día anterior']))}">‹</button><b>${esc(title)} (UTC)</b><button type="button" class="secondary" data-dstep="1" title="${esc(t(['Jour suivant', 'Next day', 'Nächster Tag', 'Día siguiente']))}">›</button></div>
        <div class="dw-dpills">${pills}</div><p class="dw-dhint">${hint}${undo}</p>${list ? `<ul class="dw-dlist">${list}</ul>` : ''}
        <div class="dw-colbox" data-colbox><div class="dw-col" data-col style="height:${48 * CELL}px">${col}</div></div>`;
      if (box.innerHTML !== html) {
        const top = box.querySelector('[data-colbox]')?.scrollTop || 0; // même jour : la colonne reste où elle était
        box.innerHTML = html;
        box.querySelector('[data-colbox]').scrollTop = top;
      }
      // autre jour : la colonne s'ouvre une heure avant la première dispo du jour, sinon à 07:00
      const key = `${week}|${dayIdx}`;
      if (key !== shownDay) {
        shownDay = key;
        const first = parts.find(r => !bg(r));
        box.querySelector('[data-colbox]').scrollTop = Math.max(0, ((first ? first.a : 480) - 60) / 30 * CELL);
      }
    }
    /** Jour affiché décalé de n : au-delà de la semaine, semaine voisine relue (dimanche → lundi suivant, et l'inverse). */
    function dayStep(n) {
      pick = null;
      const j = dayIdx + n;
      if (j >= 0 && j < 7) {
        dayIdx = j;
        return dayRender();
      }
      dayIdx = j < 0 ? 6 : 0;
      setWeek(SD().addWeek(week, j < 0 ? -1 : 1));
    }
    /** Appui dans la vue « un jour » ; rend true s'il la concernait. */
    function dayClick(e) {
      const view = e.target.closest('[data-view-set]');
      if (view) {
        try {
          localStorage.setItem(VIEW, view.dataset.viewSet);
        } catch {
          /* stockage indisponible : choix le temps de la page */
        }
        pick = null;
        dayRender();
        return true;
      }
      if (!e.target.closest('[data-dayview]') || !loaded()) return false;
      const el = sel => e.target.closest(sel),
        d0 = dayStart();
      if (el('[data-dstep]')) dayStep(+el('[data-dstep]').dataset.dstep);
      else if (el('[data-dpill]')) {
        dayIdx = +el('[data-dpill]').dataset.dpill;
        pick = null;
        dayRender();
      } else if (el('[data-dcancel]')) {
        pick = null;
        dayRender();
      } else if (el('[data-dundo]')) ui.undo();
      else if (el('[data-dall]')) ui.add([{
        start: isoAt(d0),
        end: isoAt(d0 + 864e5),
        cat: ui.brush()
      }]);
      else if (el('[data-dx]')) {
        // dispo : retirée entière (même si elle passe minuit) ; fond : effacé sur ce jour seulement
        const r = dayParts(ui.get(), d0)[+el('[data-dx]').dataset.dx],
          D = SD();
        if (!r) return true;
        if (D.timelineConfig().categories.find(c => c.id === r.cat)?.layer === 'background') ui.add([{
          start: isoAt(d0 + r.a * 6e4),
          end: isoAt(d0 + r.b * 6e4),
          cat: '__erase'
        }]);
        else {
          const d = ui.get();
          ui.replace({
            ...d,
            ranges: d.ranges.filter(x => !(x.start === r.start && x.end === r.end && x.cat === r.cat))
          });
        }
      } else if (el('[data-col]')) {
        const y = e.clientY - el('[data-col]').getBoundingClientRect().top,
          m = Math.max(0, Math.min(47, Math.floor(y / CELL))) * 30;
        if (pick === null) {
          pick = m;
          dayRender();
        } else {
          const a = Math.min(pick, m),
            b = Math.max(pick, m) + 30;
          pick = null;
          if (!ui.add([{
              start: isoAt(d0 + a * 6e4),
              end: isoAt(d0 + b * 6e4),
              cat: ui.brush()
            }])) dayRender();
        }
      }
      return true;
    }
    // balayage horizontal sur la vue « un jour » : jour suivant ou précédent
    let swipe = null;
    host.addEventListener('touchstart', e => {
      swipe = e.target.closest('[data-dayview]') && e.touches.length === 1 ? [e.touches[0].clientX, e.touches[0].clientY] : null;
    }, {
      passive: true
    });
    host.addEventListener('touchend', e => {
      if (!swipe || !loaded()) return;
      const dx = e.changedTouches[0].clientX - swipe[0],
        dy = e.changedTouches[0].clientY - swipe[1];
      swipe = null;
      if (Math.abs(dx) > 60 && Math.abs(dy) < 40) dayStep(dx < 0 ? 1 : -1);
    }, {
      passive: true
    });
    window.addEventListener('repository-mobile-change', dayRender);
    /** Catégories du groupe choisi dans « Plage précise ». */
    function fillCats() {
      const D = SD(),
        g = host.querySelector('[data-g]')?.value,
        c = host.querySelector('[data-c]');
      if (c) c.innerHTML = D.categories().filter(x => x.groupe === g).map(x => `<option value="${esc(x.id)}">${esc(D.label(x.label))}</option>`).join('');
    }
    /** Thèmes ouverts par la catégorie du pinceau (préférences du pilote) ; catégorie personnalisée : lien vers les
     *  préférences. */
    async function themesHint(id) {
      const D = SD(),
        p = host.querySelector('[data-themes]'),
        c = D.category(id);
      if (!p) return;
      if (!c || c.groupe === 'indispo') return void(p.textContent = '');
      const prefs = await window.SuiteUsers?.themePrefs?.(tri).catch(() => null);
      const th = [...D.openThemes(c, prefs)];
      const text = th.includes('*') ? t(['Ouvre tous les thèmes de mission.', 'Opens every mission theme.',
        'Öffnet alle Missionsthemen.',
        'Abre todos los temas de misión.'
      ]) : th.length ? tf(['{c} : thèmes ouverts : {t}', '{c}: open themes: {t}', '{c}: offene Themen: {t}',
        '{c}: temas abiertos: {t}'
      ], {
        c: D.label(c.label),
        t: th.map(D.themeLabel).join(', ')
      }) : tf(['{c} : aucun thème de mission ouvert.', '{c}: no mission theme open.', '{c}: kein Missionsthema offen.',
        '{c}: ningún tema de misión abierto.'
      ], {
        c: D.label(c.label)
      });
      const perso = /^prefs:/.test(String(c.ouverts || ''));
      p.innerHTML = `${esc(text)}${perso ? ` <a href="${esc(window.RepositoryNav?.settingsUrl?.('themes') || '#')}">${esc(t(['Mes types de missions…', 'My mission types…', 'Meine Missionsarten…', 'Mis tipos de misión…']))}</a>` : ''}`;
    }

    /** Appareils et simulateurs du pilote, relus (modifiés entre-temps dans Mon profil, autre onglet). */
    async function readExtra(t0) {
      const av = await Promise.resolve(A()?.availability?.(t0)).catch(() => null);
      if (av) extra = {
        appareils: {
          possedes: av.aircraft?.owned || [],
          neophytes: av.aircraft?.novice || [],
          maitrises: av.aircraft?.mastered || [],
          ...(av.aircraft?.variants ? {
            variantes: av.aircraft.variants
          } : {})
        },
        simulateurs: av.sims || []
      };
      return av;
    }
    // enregistrements dans l'ordre : le dernier état de chaque semaine gagne, une écriture à la fois
    let chain = Promise.resolve(),
      queued = new Map();
    /** Met en file l'enregistrement de la semaine data du pilote t0 (données schema 3). */
    function queueSave(t0, data, text) {
      queued.set(`${t0}|${data.week}`, [t0, data, text]);
      chain = chain.then(async () => {
        const items = [...queued.values()];
        queued = new Map();
        for (const [tt, d, tx] of items) await save(tt, d, tx);
      });
      return chain;
    }
    /** Enregistre une semaine (dossier des données, sinon ce navigateur) et dit où. */
    async function save(t0, data, text) {
      const w0 = data.week;
      try {
        await readExtra(t0);
        const r = await SD().saveWeek(t0, w0, data, extra);
        lastSaved = r.doc?.updated_at || '';
        window.dispatchEvent(new CustomEvent('dispos-week-saved', {
          detail: {
            tri: t0,
            week: w0
          }
        }));
        if (`${t0}|${w0}` !== `${tri}|${week}`) return; // semaine changée entre-temps : enregistrée, plus affichée
        // gardé dans ce navigateur : raison réelle (non autorisé, autre copie…) ; alerte donnée par writeData
        if (r.where === 'local') msg(tf(['Gardé dans ce navigateur, le Centre ne le voit pas : {e}',
          'Kept in this browser, the Centre cannot see it: {e}', 'In diesem Browser behalten, das Zentrum sieht es nicht: {e}',
          'Guardado en este navegador, el Centro no lo ve: {e}'
        ], {
          e: r.error?.message || ''
        }), 'warn');
        else msg(text || (window.GitHubData?.on?.() ? t(['Enregistré dans le dépôt des données (GitHub).',
          'Saved to the data repository (GitHub).', 'Im Daten-Repository gespeichert (GitHub).',
          'Guardado en el repositorio de datos (GitHub).'
        ]) : t(['Enregistré dans le dossier des données.', 'Saved to the data folder.', 'Im Datenordner gespeichert.',
          'Guardado en la carpeta de datos.'
        ])), 'ok');
      } catch (e) {
        if (`${t0}|${w0}` !== `${tri}|${week}`) return window.AppFramework?.notify?.(e.message, 'err');
        msg(e.message, 'err');
      }
      render();
    }
    /** Ancienne grille horaire de la semaine (fichier d'avant les catégories) en plages par jour ; null si vide. Heures
     *  consécutives du même code → une plage, journée entière → debut / fin null ; code → catégorie (codes ODV). */
    function importOld(av, w) {
      const D = SD(),
        mon = D.weekMonday(w),
        grid = av && A()?.weekGrid?.(av, isoDay(mon));
      if (!grid?.some(r => r.some(Boolean))) return null;
      const hh = h => `${String(h).padStart(2, '0')}:00`,
        out = {};
      grid.forEach((row, j) => {
        for (let h = 0; h < 24;) {
          const code = row[h];
          if (!code) {
            h++;
            continue;
          }
          let k = h;
          while (k < 24 && row[k] === code) k++;
          const cat = D.codeCategory(code);
          if (cat)(out[isoDay(mon + j * 864e5)] ||= []).push(h === 0 && k === 24 ? {
            debut: null,
            fin: null,
            categorie: cat
          } : {
            debut: hh(h),
            fin: hh(k),
            categorie: cat
          });
          h = k;
        }
      });
      return Object.keys(out).length ? out : null;
    }
    /** Lit la semaine affichée du pilote, ses appareils et simulateurs, importe au besoin l'ancienne grille, puis la
     *  donne au composant ; ignore une réponse dépassée (loadSeq). */
    async function load() {
      await need('SuiteDispos');
      await SD().ready?.();
      if (!ui || shownKey.split('|')[0] !== tri) frame();
      if (!tri || !week) return render();
      const seq = ++loadSeq,
        t0 = tri,
        w0 = week;
      const weeks = await SD().readPilot(t0, {
        weeks: [w0],
        fresh: true
      });
      if (seq !== loadSeq || t0 !== tri || w0 !== week) return;
      const av = await readExtra(t0);
      if (seq !== loadSeq || t0 !== tri || w0 !== week) return;
      const old = !weeks[w0] && importOld(av, w0),
        doc = weeks[w0] || (old ? SD().normalize({
          schema: 2,
          semaine: w0,
          pilote: t0,
          dispos: old
        }, w0, t0) : {
          schema: 3,
          week: w0,
          ranges: []
        });
      if (!ui) frame();
      if (ui.week() !== w0) ui.week(w0);
      ui.set({
        ...doc,
        week: w0,
        pilot: t0
      });
      shownKey = `${t0}|${w0}`;
      lastSaved = weeks[w0]?.updated_at || '';
      render();
      if (old) await queueSave(t0, ui.get(), t(['Ancienne grille horaire importée dans la semaine.',
        'Former hourly grid imported into the week.', 'Frühere Stundentabelle in die Woche übernommen.',
        'Antigua cuadrícula horaria importada en la semana.'
      ]));
    }
    const loaded = () => !!ui && shownKey === `${tri}|${week}`;

    host.addEventListener('change', e => {
      if (e.target.matches('[data-g]')) fillCats();
      if (e.target.matches('[data-wk-date]') && e.target.value) setWeek(SD().weekId(Date.parse(`${e.target.value}T12:00:00Z`)));
    });
    host.addEventListener('click', async e => {
      if (dayClick(e)) return;
      const D = SD();
      const wk = e.target.closest('[data-wk]');
      if (wk) return setWeek(+wk.dataset.wk ? D.addWeek(week, +wk.dataset.wk) : D.weekId(Date.now()));
      if (e.target.closest('[data-add], [data-copy], [data-clear]') && !loaded()) return msg(t([
        'Semaine en cours de lecture : réessayer dans un instant.', 'Week still loading: try again in a moment.',
        'Woche wird noch gelesen: gleich noch einmal versuchen.', 'Semana aún cargando: reintentar en un momento.'
      ]), 'warn');
      if (e.target.closest('[data-add]')) {
        const cat = host.querySelector('[data-c]').value,
          days = [...host.querySelectorAll('[data-day]:checked')].map(x => +x.dataset.day),
          from = host.querySelector('[data-from]').value,
          to = host.querySelector('[data-to]').value;
        if (!cat) return msg(t(['Choisir une catégorie.', 'Choose a category.', 'Eine Kategorie wählen.', 'Elegir una categoría.']),
          'err');
        if (!days.length) return msg(t(['Cocher au moins un jour.', 'Tick at least one day.', 'Mindestens einen Tag ankreuzen.',
          'Marcar al menos un día.'
        ]), 'err');
        // à la minute (le format la porte) ; vides : journée entière ; sans fin : jusqu'à minuit
        const a = mins(from) ?? 0,
          b = to ? mins(to) : 1440;
        if (to && b <= a) return msg(t(['Horaires incohérents : la fin doit suivre le début (UTC).',
          'Inconsistent times: the end must follow the start (UTC).',
          'Unstimmige Zeiten: Das Ende muss nach dem Beginn liegen (UTC).',
          'Horarios incoherentes: el fin debe seguir al inicio (UTC).'
        ]), 'err');
        const mon = D.weekMonday(week),
          at = (j, m) => new Date(mon + j * 864e5 + m * 6e4).toISOString().slice(0, 16);
        const n = ui.add(days.map(j => ({
          start: at(j, a),
          end: at(j, b),
          cat
        })));
        return msg(tf(['{n} plage(s) ajoutée(s) (Ctrl+Z l’annule).', '{n} range(s) added (Ctrl+Z undoes it).',
          '{n} Zeitraum/Zeiträume hinzugefügt (Strg+Z macht es rückgängig).',
          '{n} intervalo(s) añadido(s) (Ctrl+Z lo deshace).'
        ], {
          n
        }), 'ok');
      }
      if (e.target.closest('[data-copy]')) {
        const key = shownKey,
          prevId = D.addWeek(week, -1),
          prev = (await D.readPilot(tri, {
            weeks: [prevId],
            fresh: true
          }))[prevId];
        if (key !== shownKey || !loaded()) return; // semaine changée pendant la lecture
        if (!prev?.ranges?.length) return msg(t(['Semaine précédente vide : rien à recopier.',
          'Previous week empty: nothing to copy.',
          'Vorwoche leer: nichts zu übernehmen.', 'Semana anterior vacía: nada que copiar.'
        ]), 'err');
        if (ui.get().ranges.length && !await window.AppFramework.ask(t([
            'Remplacer la semaine affichée par la semaine précédente ? (Ctrl+Z l’annule)',
            'Replace the shown week by the previous week? (Ctrl+Z undoes it)',
            'Die angezeigte Woche durch die Vorwoche ersetzen? (Strg+Z macht es rückgängig)',
            '¿Reemplazar la semana mostrada por la semana anterior? (Ctrl+Z lo deshace)'
          ]))) return;
        if (key !== shownKey || !loaded()) return;
        // plages décalées de sept jours (fond posé compris)
        const shift = list => (list || []).map(r => ({
          start: new Date(Date.parse(`${r.start}:00Z`) + 7 * 864e5).toISOString().slice(0, 16),
          end: new Date(Date.parse(`${r.end}:00Z`) + 7 * 864e5).toISOString().slice(0, 16),
          cat: r.cat
        }));
        ui.replace({
          schema: 3,
          week,
          ranges: shift(prev.ranges),
          background: shift(prev.background)
        });
        return msg(t(['Semaine précédente recopiée (Ctrl+Z l’annule).', 'Previous week copied (Ctrl+Z undoes it).',
          'Vorwoche übernommen (Strg+Z macht es rückgängig).', 'Semana anterior copiada (Ctrl+Z lo deshace).'
        ]), 'ok');
      }
      if (e.target.closest('[data-clear]')) {
        if (!ui.get().ranges.length) return;
        ui.clear();
        return msg(t(['Semaine effacée (Ctrl+Z l’annule).', 'Week cleared (Ctrl+Z undoes it).',
          'Woche gelöscht (Strg+Z macht es rückgängig).', 'Semana borrada (Ctrl+Z lo deshace).'
        ]), 'ok');
      }
      if (e.target.closest('[data-flush]')) {
        try {
          const done = await A().flushData();
          msg(tf(['{n} fichier(s) écrit(s) dans le dossier des données.', '{n} file(s) written to the data folder.',
            '{n} Datei(en) in den Datenordner geschrieben.', '{n} archivo(s) escrito(s) en la carpeta de datos.'
          ], {
            n: done.length
          }), 'ok');
          render();
        } catch (err) {
          msg(err.message, 'err');
        }
      }
    });

    /** Change de semaine affichée : relecture, puis événement dispos-week pour la page hôte. */
    function setWeek(w) {
      if (!w || w === week) return;
      week = w;
      last = ['', ''];
      ready = load();
      host.dispatchEvent(new CustomEvent('dispos-week', {
        detail: {
          week
        }
      }));
    }
    // langue ou catégories changées : composant remonté (textes, palette), semaine gardée
    window.addEventListener('repository-language-change', () => tri && (frame(), ready = load()));
    window.addEventListener('suite-dispos-config', () => tri && ui && (frame(), ready = load()));
    // semaine écrite par un autre onglet (ou relue du dossier) : relue, sauf notre propre écriture
    window.addEventListener('defa-data-change', e => {
      const path = e.detail?.path || '';
      if (!tri || !week || !path.endsWith(`disponibilites/${tri}/${week}.json`)) return;
      SD().readPilot(tri, {
        weeks: [week]
      }).then(w => {
        const d = w?.[week];
        if (d && d.updated_at && d.updated_at !== lastSaved && loaded()) {
          lastSaved = d.updated_at;
          ui.set(d);
        }
      }).catch(() => {});
    });
    return {
      /** Pilote et semaine (ISO « 2026-W41 ») affichés ; relit la semaine. */
      set(o = {}) {
        if ('tri' in o) tri = String(o.tri || '').toUpperCase();
        if (o.week) week = o.week;
        week ||= window.SuiteDispos?.weekId(Date.now()) || '';
        return ready = load();
      },
      /** Relit la semaine affichée. */
      refresh: () => ready = load(),
      /** Appareils et simulateurs changés (Mes missions) : réenregistrés avec la semaine affichée si elle est déclarée. */
      async touch() {
        await ready;
        if (!tri || !loaded() || !ui.get().ranges.length) return;
        await queueSave(tri, ui.get());
      },
      /** Semaine affichée (ISO « 2026-W41 »). */
      get week() {
        return week;
      }
    };
  }
  /** Sous-titre du bloc de saisie (Mes missions, Mes disponibilités), dans la langue courante. */
  const subtitle = () => t([
    'Semaine affichée, heures UTC : choisir une catégorie dans la palette, puis tracer dans la grille (« Comment s’en servir » sous la grille). Le Centre s’en sert pour affecter les missions.',
    'Week shown, UTC times: choose a category in the palette, then draw in the grid (“How to use” under the grid). The Centre uses it to assign missions.',
    'Angezeigte Woche, UTC-Zeiten: eine Kategorie in der Palette wählen, dann im Raster zeichnen („So geht’s“ unter dem Raster). Das Zentrum nutzt sie, um Missionen zuzuteilen.',
    'Semana mostrada, horas UTC: elegir una categoría en la paleta y trazar en la cuadrícula («Cómo usarlo» bajo la cuadrícula). El Centro lo usa para asignar las misiones.'
  ]);
  /** Remplit (et tient à jour au changement de langue) un sous-titre de bloc avec subtitle(). */
  function bindSubtitle(el) {
    if (!el) return;
    const set = () => {
      const v = subtitle();
      if (el.textContent !== v) el.textContent = v;
    };
    set();
    window.addEventListener('repository-language-change', set);
  }
  window.DisposWeek = {
    mount,
    legend,
    subtitle,
    bindSubtitle
  };
})();
