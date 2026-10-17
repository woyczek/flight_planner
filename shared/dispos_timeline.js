(() => {
  'use strict';
  // Module autonome (aucune dépendance) : saisie des disponibilités d'une personne sur un axe de temps continu, une
  // rangée par jour de la semaine ISO, en UTC. Spécification complète : docs/technique/DISPOS_TIMELINE_SPEC.md ;
  // intégration dans une page : docs/technique/DISPOS_TIMELINE_INTEGRATION.md.
  //   · FOND : nature de la non-disponibilité, bandes pleine hauteur, couleur seule ; PREMIER PLAN : les dispos, par
  //     rectangle (début à gauche, type au centre, fin à droite) ; une minute a UN état : sous une dispo, le fond ne
  //     compte pas mais reste en place (dispo déplacée ou effacée : le fond revient) ; temps sans rien : indisponible ;
  //   · tracé aimanté à la demi-heure, poignées et déplacement au pas de 5 min (vers une autre rangée : même horaire,
  //     autre jour) ; tracé sur plusieurs rangées : rectangle de sélection, mêmes heures sur chaque jour traversé ; la
  //     dernière forme gagne ; entrée de palette déposée sur une forme : change sa nature, sur un jour : journée
  //     entière ; double-clics ; Maj ; clavier ; appui long ; historique (Ctrl+Z / Ctrl+Y) ; période répétitive.
  // Données (schema 3) : { schema: 3, pilot, week: "AAAA-Wnn", tz: "UTC", ranges: [{ start, end, cat }], background } ;
  // ranges : la déclaration (la vérité), sans chevauchement ; background : le fond tel que posé, dessous compris,
  // commodité d'édition qu'un lecteur peut ignorer ; dates « AAAA-MM-JJTHH:MM » UTC, fin exclue. Autres formats :
  // shared/dispos_formats.js.
  // Textes : anglais par défaut (DEFAULT_LABELS) ; la page traduit par labels { clé: texte } ou t(clé, défaut), y compris
  // les catégories (« cat.<id> ») et les groupes (« group.<id> ») ; dates et jours par Intl dans la langue lang.
  // API (window.DisposTimeline) : mount(hôte, { config, week, data, lang, labels, t, density, help, onChange(data),
  //   store }) → { get(), set(data), replace(data), week(id), brush(id), clear(), undo(), redo(), history(), destroy() } ; événements sur l'hôte :
  //   dispos-change (detail : données), dispos-select (detail : plage { start, end, cat } ou null), dispos-week,
  //   dispos-history ; DEFAULT_CONFIG, DEFAULT_LABELS, weekId(date), weekMonday(id), addWeek(id, n), model (fonctions
  //   du modèle, pour les formats).
  if (window.DisposTimeline) return;
  const DAY = 1440,
    WEEK = 7 * DAY,
    SNAP_DRAW = 30,
    SNAP_EDIT = 5,
    MIN_PIECE = 5,
    LONG_PRESS = 500,
    HISTORY = 50;

  /** Catégories par défaut (couleurs et codes de la grille d'origine ; legacy : code du schema 2). */
  const DEFAULT_CONFIG = {
    schema: 1,
    groups: [{
      id: 'dispo',
      label: 'Available',
      layer: 'foreground'
    }, {
      id: 'exercice',
      label: 'Exercise',
      layer: 'foreground'
    }, {
      id: 'occupe',
      label: 'Busy',
      layer: 'foreground'
    }, {
      id: 'indispo',
      label: 'Unavailable',
      layer: 'background'
    }],
    categories: [{
      id: 'IN',
      label: 'Unavailable',
      letter: '',
      color: '#BFBFBF',
      layer: 'background',
      group: 'indispo',
      legacy: 'indispo'
    }, {
      id: 'V',
      label: 'Leave',
      letter: '',
      color: '#FFC000',
      layer: 'background',
      group: 'indispo',
      legacy: 'conges'
    }, {
      id: 'Q',
      label: 'Rest',
      letter: '',
      color: '#D9D9D9',
      layer: 'background',
      group: 'indispo',
      legacy: 'recup'
    }, {
      id: 'IR',
      label: 'Real-life activity',
      letter: '',
      color: '#FFFF00',
      layer: 'background',
      group: 'indispo',
      legacy: 'irl'
    }, {
      id: 'O',
      label: 'Available for anything',
      letter: 'O',
      color: '#00B050',
      layer: 'foreground',
      group: 'dispo',
      legacy: 'tout'
    }, {
      id: 'SC',
      label: 'Available, civil security',
      letter: 'SC',
      color: '#2F5597',
      layer: 'foreground',
      group: 'dispo',
      legacy: 'secu'
    }, {
      id: 'D+',
      label: 'Available, defence',
      letter: 'D+',
      color: '#0070C0',
      layer: 'foreground',
      group: 'dispo',
      legacy: 'defense'
    }, {
      id: 'S',
      label: 'Exercise flight',
      letter: 'S',
      color: '#FF0000',
      layer: 'foreground',
      group: 'exercice',
      legacy: 'exercice_vol'
    }, {
      id: 'AM',
      label: 'Exercise control',
      letter: 'AM',
      color: '#C4BD97',
      layer: 'foreground',
      group: 'exercice',
      legacy: 'exercice_ctrl'
    }, {
      id: 'G',
      label: 'Other flight (IVAO / VATSIM)',
      letter: 'G',
      color: '#FFD966',
      layer: 'foreground',
      group: 'occupe',
      legacy: 'vol_hors'
    }, {
      id: 'DC',
      label: 'DCS',
      letter: 'DC',
      color: '#002060',
      layer: 'foreground',
      group: 'occupe',
      legacy: 'dcs'
    }, {
      id: 'AT',
      label: 'Other control (IVAO / VATSIM)',
      letter: 'AT',
      color: '#7030A0',
      layer: 'foreground',
      group: 'occupe',
      legacy: 'ctrl_hors'
    }]
  };

  // ---- dates : semaine ISO, minutes depuis le lundi 00:00 UTC
  const pad = n => String(n).padStart(2, '0');
  /** Semaine ISO d'une date (ms ou Date) : « AAAA-Wnn ». */
  function weekId(d) {
    const t = new Date(d),
      th = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()));
    th.setUTCDate(th.getUTCDate() - (th.getUTCDay() + 6) % 7 + 3); // jeudi de la semaine : son année est celle de la semaine
    const jan4 = new Date(Date.UTC(th.getUTCFullYear(), 0, 4)),
      w = 1 + Math.round(((th - jan4) / 864e5 - 3 + (jan4.getUTCDay() + 6) % 7) / 7);
    return `${th.getUTCFullYear()}-W${pad(w)}`;
  }
  /** Lundi 00:00 UTC (ms) d'une semaine « AAAA-Wnn ». */
  function weekMonday(id) {
    const [, y, w] = /^(\d{4})-W(\d{2})$/.exec(id) || [0, 1970, 1],
      jan4 = Date.UTC(+y, 0, 4),
      mon1 = jan4 - ((new Date(jan4).getUTCDay() + 6) % 7) * 864e5;
    return mon1 + (+w - 1) * 7 * 864e5;
  }
  /** Semaine décalée de n semaines. */
  const addWeek = (id, n) => weekId(weekMonday(id) + n * 7 * 864e5 + 3 * 864e5);
  /** Date « AAAA-MM-JJ » d'une date UTC (ms). */
  const isoDay = ms => new Date(ms).toISOString().slice(0, 10);
  /** Minute de la semaine → « AAAA-MM-JJTHH:MM ». */
  const toIso = (monday, m) => new Date(monday + m * 6e4).toISOString().slice(0, 16);
  /** « AAAA-MM-JJTHH:MM » → minute de la semaine (bornée à la semaine). */
  const fromIso = (monday, s) => Math.max(0, Math.min(WEEK, Math.round((Date.parse(`${s}:00Z`) - monday) / 6e4)));
  /** « HH:MM » d'une minute de la semaine (fin de journée : « 24:00 »). */
  const hhmm = (m, end = false) => {
    const d = end && m % DAY === 0 && m > 0 ? DAY : ((m % DAY) + DAY) % DAY;
    return `${pad(Math.floor(d / 60))}:${pad(d % 60)}`;
  };
  /** Horaire court d'un rectangle étroit : « 08:00 » → « 8 », « 08:30 » → « 8:30 ». */
  const hShort = t => t.replace(/^0(?=\d)/, '').replace(/:00$/, '');
  const snap = (m, step) => Math.round(m / step) * step;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---- modèle : deux couches indépendantes, chacune en plages { s, e, cat } (minutes de la semaine, triées, sans
  // chevauchement dans la couche) — fond : nature de la non-disponibilité ; premier plan : les dispos, par rectangle,
  // posées par-dessus le fond, qui reste en place sous elles
  /** Retire [s, e[ des plages d'une couche (découpe en deux une plage qui le contient). */
  function cut(list, s, e) {
    const out = [];
    for (const r of list) {
      if (r.e <= s || r.s >= e) out.push(r);
      else {
        if (r.s < s) out.push({
          ...r,
          e: s
        });
        if (r.e > e) out.push({
          ...r,
          s: e
        });
      }
    }
    return out;
  }
  /** Range une couche : tri, fusion des plages contiguës de même catégorie, morceaux de moins de 5 min retirés. */
  function tidy(list) {
    const sorted = list.filter(r => r.e - r.s >= MIN_PIECE).sort((a, b) => a.s - b.s),
      out = [];
    for (const r of sorted) {
      const p = out[out.length - 1];
      if (p && p.cat === r.cat && p.e >= r.s) p.e = Math.max(p.e, r.e);
      else out.push({
        ...r
      });
    }
    return out;
  }
  /** Pose une plage dans une couche : la dernière gagne dans cette couche. */
  const paint = (list, s, e, cat) => tidy([...cut(list, s, e), {
    s,
    e,
    cat
  }]);
  /** Fond posé (cat) ou effacé (cat vide) sur [s, e[ : une non-disponibilité découpe aussi les dispos qu'elle recouvre
   *  (le fond est mis à jour, la dispo coupée en deux) ; effacer le fond laisse les dispos. */
  const applyBg = (st, s, e, cat) => ({
    bg: cat ? paint(st.bg, s, e, cat) : tidy(cut(st.bg, s, e)),
    fg: cat ? tidy(cut(st.fg, s, e)) : st.fg
  });
  /** Dispo posée sur [s, e[ : elle découpe les dispos qu'elle recouvre ; le fond reste tel quel, dessous. */
  const applyFg = (st, s, e, cat) => ({
    bg: st.bg,
    fg: paint(st.fg, s, e, cat)
  });

  /** Fond visible : les bandes de fond moins les dispos posées dessus (une minute a un seul état). */
  const visibleBg = st => tidy(st.fg.reduce((list, r) => cut(list, r.s, r.e), st.bg));

  // ---- formats
  /** Couches → JSON du composant (schema 3) : ranges, la déclaration sans chevauchement ; background, le fond posé. */
  function toData(state) {
    const mon = weekMonday(state.week),
      out = r => ({
        start: toIso(mon, r.s),
        end: toIso(mon, r.e),
        cat: r.cat
      });
    return {
      schema: 3,
      pilot: state.pilot || '',
      week: state.week,
      tz: 'UTC',
      ranges: [...state.fg, ...visibleBg(state)].sort((a, b) => a.s - b.s).map(out),
      background: state.bg.map(out)
    };
  }
  /** JSON du composant (schema 3) → couches de la semaine : fond d'après background (sinon les plages de fond de
   *  ranges), dispos d'après ranges (catégorie inconnue : premier plan). */
  function fromData(data, week, config = DEFAULT_CONFIG) {
    const mon = weekMonday(week),
      bgCats = new Set((config.categories || []).filter(c => c.layer === 'background').map(c => c.id)),
      conv = list => (list || []).map(r => ({
        s: fromIso(mon, r.start),
        e: fromIso(mon, r.end),
        cat: String(r.cat)
      })).filter(r => r.e > r.s),
      all = conv(data?.ranges);
    let st = {
      bg: [],
      fg: []
    };
    for (const r of Array.isArray(data?.background) ? conv(data.background) : all.filter(r => bgCats.has(r.cat))) st = applyBg(st, r.s, r
      .e, r.cat);
    for (const r of all.filter(r => !bgCats.has(r.cat))) st = applyFg(st, r.s, r.e, r.cat);
    return st;
  }
  // ---- composant
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  /** Encre lisible sur une couleur (noir ou blanc selon la luminance). */
  const ink = hex => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return '#000';
    const n = parseInt(m[1], 16),
      l = (0.299 * (n >> 16) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255;
    return l > 0.6 ? '#111' : '#fff';
  };
  const ERASE = '__erase'; // pinceau « Effacer le fond »
  function css() {
    if (document.getElementById('disposTimelineCss')) return;
    const st = document.createElement('style');
    st.id = 'disposTimelineCss';
    st.textContent = `.dt{display:grid;gap:10px;font:var(--dt-font,14px/1.4 system-ui,sans-serif);color:var(--dt-ink,#17202a);user-select:none;-webkit-user-select:none}
.dt-nav{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.dt-nav b{min-width:15em}
.dt-pal{display:grid;grid-template-columns:max-content 1fr;gap:6px 10px;align-items:center}
.dt-pal-g{font-size:12px;opacity:.75;text-align:right}.dt-pal-r{display:flex;flex-wrap:wrap;gap:4px}
.dt-brush{display:inline-flex;align-items:center;gap:6px;border:1px solid #0003;background:var(--dt-btn-bg,#fff);color:var(--dt-btn-ink,#111);padding:3px 8px;cursor:grab;font:inherit;font-size:12.5px;touch-action:none}
.dt-brush i{display:inline-block;min-width:18px;height:18px;font:700 11px/18px system-ui;text-align:center;font-style:normal}
.dt-brush[aria-pressed=true]{outline:2px solid var(--dt-accent,#1d6fd8);outline-offset:1px}
.dt-grid{display:grid;grid-template-columns:7.5em 1fr;gap:11px 8px;position:relative}
.dt-day{font-size:12.5px;line-height:1.2;align-self:center}.dt-day small{display:block;opacity:.7}
.dt-axis{position:relative;height:18px;font-size:10.5px;opacity:.7;margin-bottom:var(--dt-edge,8px)}.dt-axis span{position:absolute;transform:translateX(-50%)}
.dt-grid{padding-bottom:var(--dt-edge,8px)}
.dt-row{position:relative;height:44px;border:1px solid #0002;touch-action:none;cursor:crosshair;background:var(--dt-row-bg,#fafafa)}
.dt-row::after{content:'';position:absolute;inset:0;pointer-events:none;
background:repeating-linear-gradient(90deg,#0000 0,#0000 calc(100%/48 - 1px),var(--dt-line-half,#00000012) calc(100%/48 - 1px),var(--dt-line-half,#00000012) calc(100%/48)),
repeating-linear-gradient(90deg,#0000 0,#0000 calc(100%/24 - 1px),var(--dt-line,#00000033) calc(100%/24 - 1px),var(--dt-line,#00000033) calc(100%/24))}
.dt-row.drop,.dt-fg.drop{outline:2px dashed var(--dt-accent,#1d6fd8);outline-offset:1px}.dt-bg.drop{outline:2px dashed var(--dt-accent,#1d6fd8);outline-offset:-2px;z-index:1}
.dt-box{position:absolute;border:2px solid var(--dt-accent,#1d6fd8);background:var(--dt-accent-soft,#1d6fd81f);pointer-events:none;z-index:4;box-sizing:border-box}
.dt-box span{position:absolute;left:4px;top:2px;background:var(--dt-accent,#1d6fd8);color:#fff;font:600 11px/1.3 system-ui;padding:1px 5px;white-space:nowrap}
.dt-bg{position:absolute;top:0;bottom:0;opacity:.85}
.dt-fg{position:absolute;top:3px;bottom:3px;box-shadow:0 1px 2px #0005;display:flex;align-items:center;justify-content:space-between;
padding:0 6px;overflow:hidden;white-space:nowrap;font-size:11.5px;cursor:grab;box-sizing:border-box;z-index:1}
.dt-fg b{font-size:13px;position:absolute;left:50%;transform:translateX(-50%)}.dt-fg.narrow{justify-content:center}
.dt-fg.sel{outline:2px solid var(--dt-accent,#1d6fd8);outline-offset:1px;z-index:2}
.dt-h{position:absolute;top:0;bottom:0;width:7px;cursor:ew-resize;display:none;background:#fff8;border:1px solid #0006;box-sizing:border-box}
.dt-h.l{left:0}.dt-h.r{right:0}.dt-fg:hover .dt-h,.dt-fg.sel .dt-h,.dt-bg:hover .dt-h,.dt-bg.sel .dt-h{display:block}
.dt-bg{cursor:grab}.dt-bg.sel{outline:2px solid var(--dt-accent,#1d6fd8);outline-offset:-2px;z-index:1}
.dt-x{position:absolute;top:-1px;right:8px;display:none;border:0;background:#0008;color:#fff;font:11px/14px system-ui;padding:0 4px;cursor:pointer;z-index:2}
.dt-fg:hover .dt-x,.dt-bg:hover .dt-x{display:block}
.dt-fg.live{z-index:3;box-shadow:0 0 0 2px var(--dt-accent,#1d6fd8),0 2px 6px #0006}.dt-bg.live{opacity:1;box-shadow:inset 0 0 0 2px var(--dt-accent,#1d6fd8)}
.dt-bg .dt-lt{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font:600 11.5px/1 system-ui;color:#111;background:#fffc;padding:2px 5px;white-space:nowrap}
.dt-hover{position:fixed;pointer-events:none;background:var(--dt-tip-bg,#111);color:var(--dt-tip-ink,#fff);font:12px/1.3 system-ui;padding:3px 7px;z-index:50;white-space:nowrap}
.dt-period{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;font-size:13px}.dt-period label{display:inline-flex;gap:5px;align-items:center}
.dt-period .dt-days label{gap:2px}.dt-period input,.dt-period select{font:inherit;padding:3px 5px}
.dt-help{font-size:12px;opacity:.75;margin:0}
.dt-helpbox{font-size:12.5px;line-height:1.45}.dt-helpbox>summary{cursor:pointer;font-weight:600}.dt-helpbox p{margin:6px 0 0;max-width:72em}
.dt-compact{gap:6px;font-size:12px}.dt-compact .dt-nav button{font-size:12px;padding:1px 7px}.dt-compact .dt-nav b{font-size:12.5px}
.dt-compact .dt-pal{gap:3px 6px}.dt-compact .dt-pal-g{font-size:10.5px;opacity:.85;text-align:left;white-space:nowrap}.dt-compact .dt-pal-r{gap:2px}
.dt-compact .dt-brush{gap:0;padding:0 3px;border:1px solid #0000004d;background:var(--c);color:var(--k);font:400 9.5px/1.45 system-ui,sans-serif;white-space:nowrap}
.dt-compact .dt-brush[aria-pressed=true]{outline:none;box-shadow:0 0 0 2px #fff,0 0 0 4px var(--c)}
.dt-compact .dt-brush[data-brush="${ERASE}"]{border-style:dashed}
.dt-compact .dt-grid{grid-template-columns:max-content 1fr;gap:3px 6px}
.dt-compact .dt-day{font-size:11px;line-height:1;white-space:nowrap;align-self:stretch;display:flex;align-items:center;gap:4px;padding:0 5px;border:1px solid #0002}
.dt-compact .dt-day small{display:inline;opacity:.7}
.dt-compact .dt-axis{height:13px;font-size:10.5px;--dt-edge:5px}
.dt-compact .dt-row{height:21px}
.dt-compact .dt-bg{opacity:1}
.dt-compact .dt-fg{top:2px;bottom:2px;padding:0 3px;font-size:10px;box-shadow:0 0 0 1px #0004}.dt-compact .dt-fg b{font-size:11px}
.dt-compact .dt-h{width:5px}.dt-compact .dt-x{top:0;right:7px;font:9px/11px system-ui;padding:0 3px}
.dt-compact .dt-bg .dt-lt,.dt-compact .dt-box span{font-size:10px;padding:1px 4px}
.dt-compact .dt-period{gap:4px 10px;font-size:11.5px}.dt-compact .dt-period input,.dt-compact .dt-period select{padding:1px 4px}
.dt-compact .dt-pd>summary{font-size:11.5px;cursor:pointer}.dt-compact .dt-help{font-size:11px}.dt-compact .dt-helpbox{font-size:12px}`;
    document.head.append(st);
  }
  /** Textes par défaut (anglais) ; {nom} : valeur insérée. Clés en plus, sans défaut ici : « cat.<id> » et
   *  « group.<id> » (libellés de la configuration). */
  /** Paragraphes de l'aide, dans l'ordre d'usage (option help). */
  const HELP_KEYS = ['help.layers', 'help.palette', 'help.draw', 'help.grab', 'help.cut', 'help.drop', 'help.fix', 'help.period',
    'help.saved'
  ];
  const DEFAULT_LABELS = {
    'nav.prev': '‹',
    'nav.today': 'This week',
    'nav.next': '›',
    title: 'Week {n} — {from} to {to} (UTC)',
    erase: 'Erase background',
    'erase.title': 'Erase the background (availabilities stay)',
    'brush.bg': '{label} — drop on a band or an availability: changes its nature; on a day: whole day; double-click: background of the whole week',
    'brush.fg': '{label} — drop on a band or an availability: changes its nature; on a day: whole day',
    'period.title': 'Repeating period',
    'period.cat': 'Category',
    'period.dateFrom': 'from',
    'period.dateTo': 'to',
    'period.timeFrom': 'from',
    'period.timeTo': 'to',
    'period.add': 'Add',
    'period.hint': 'Empty times: whole day. End before start: until the next day.',
    'period.errDates': 'Dates: "from" then "to", in that order.',
    'period.errDays': 'Tick at least one day.',
    'period.errTimes': 'Times: both, or none (whole day).',
    'period.done': '{n} day(s) set',
    'period.other': ', {n} in other week(s)',
    'period.lost': ' — {n} week(s) not saved (no store)',
    'hover.default': 'Unavailable (default)',
    'hover.day': '{day}, {from} to {to}: {name}',
    'hover.days': 'from {day} {from} to {day2} {to}: {name}',
    box: '{label} {from}–{to}, {day} → {day2}',
    delete: 'Delete',
    'help.title': 'How to use',
    'help.layers': 'Two layers. The background gives the nature of an unavailability (unavailable, leave, rest, real-life activity): colour only, full row height. The first layer holds the availabilities, exercises and busy times: rectangles with a letter and their times. A minute has one state only: where a rectangle lies, the background under it does not count, but it stays in place and comes back when the rectangle moves away.',
    'help.palette': 'The palette. Click a chip to choose the brush: it only says what the next drawing will be. Background chips are on the last line.',
    'help.draw': 'Draw. Drag on empty space or in the gap between two rows: the shape snaps to the half hour. Across several days, a selection rectangle lays the same hours on each day it crosses.',
    'help.grab': 'Take a shape. A gesture that starts on a shape, rectangle or band, takes it whatever the brush: a click selects it, a drag moves it (5 min steps; up or down: same times, another day), its edges resize it. Shift+drag draws over it instead, which is how to draw an availability on a day already covered by a band.',
    'help.cut': 'Cut. The last shape wins: a rectangle drawn over another cuts it, and a background drawn through a rectangle cuts it too. The cut shows while you drag.',
    'help.drop': 'Drop and double-click. Drag a chip onto a shape: the shape takes that nature. Drop it on the empty part of a row or on the day name: the whole day, and a background chip then changes only the background, rectangles stay. Double-click a band: its colour becomes the background of the whole day; double-click a background chip: of the whole week.',
    'help.fix': 'Correct. ✕ on a shape, or Delete on the selection, removes it; the arrow keys move it (← → 5 min, ↑ ↓ one day); Escape clears the selection. Ctrl+Z undoes, Ctrl+Y or Ctrl+Shift+Z redoes.',
    'help.period': 'Repeating period. The box above the grid lays one category on chosen weekdays between two dates, at the same times, across several weeks. Empty times mean the whole day; an end before the start runs into the next day.',
    'help.saved': 'What is saved. Times are in UTC, weeks are ISO weeks (Monday to Sunday). Each week is one JSON document: its ranges are the declaration, one state per minute; time with nothing is unavailable.'
  };

  /** Monte le composant dans host. opts : { config, week, data (schema 3), lang (dates et jours, Intl ; défaut « en »),
   *  labels ({ clé: texte }), t(clé, défaut) → texte, onChange(données), store : { read(semaine) → données schema 3 |
   *  null, write(données) } (périodes qui débordent de la semaine affichée) }. */
  function mount(host, {
    config = DEFAULT_CONFIG,
    week = weekId(Date.now()),
    data = null,
    lang = 'en',
    labels = {},
    t = null,
    density = 'compact',
    help = true,
    onChange = null,
    store = null
  } = {}) {
    css();
    const cats = new Map(config.categories.map(c => [c.id, c]));
    /** Texte d'une clé : t(clé, défaut), sinon labels, sinon le défaut anglais ; {nom} remplacés par vars. */
    const txt = (key, vars = null, fallback = null) => {
      const def = labels[key] ?? fallback ?? DEFAULT_LABELS[key] ?? key,
        out = String((t && t(key, def)) ?? def);
      return vars ? out.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m) : out;
    };
    const lab = c => c.id ? txt(`cat.${c.id}`, null, c.label) : c.label;
    const dateOf = (ms, o) => new Date(ms).toLocaleDateString(lang, {
      ...o,
      timeZone: 'UTC'
    });
    const cap = x => x.charAt(0).toUpperCase() + x.slice(1);
    const compact = density !== 'comfortable';
    /** Libellé court d'une catégorie (palette compacte) : « short.<id> », sinon c.short, sinon le libellé sans le nom
     *  du groupe en tête ni la précision entre parenthèses, mots longs abrégés au-delà de 12 caractères. */
    const shortOf = c => {
      const def = c.short || (() => {
        const full = lab(c),
          g = config.groups.find(x => x.id === c.group),
          gl = g ? txt(`group.${g.id}`, null, g.label) : '';
        let x = full.replace(/\s*\([^)]*\)\s*$/, '');
        if (gl && x.toLowerCase().startsWith(`${gl.toLowerCase()} `)) x = x.slice(gl.length + 1);
        if (!x) return full;
        x = cap(x);
        return x.length > 12 ? x.split(' ').map(w => w.length > 6 ? `${w.slice(0, 5)}.` : w).join(' ') : x;
      })();
      return txt(`short.${c.id}`, null, def);
    };
    const isBg = id => id === ERASE || cats.get(id)?.layer === 'background';
    const state = {
      week,
      pilot: data?.pilot || '',
      ...(data ? fromData(data, week, config) : {
        bg: [],
        fg: []
      }),
      brush: config.categories.find(c => c.layer === 'foreground')?.id || config.categories[0]?.id,
      sel: null // dispo sélectionnée (objet de state.fg)
    };
    let preview = null, // couches affichées pendant un geste (null : state)
      drag = null,
      palDrag = null;
    const hover = document.createElement('div');
    hover.className = 'dt-hover';
    hover.hidden = true;
    document.body.append(hover);
    const mon0 = weekMonday('2026-W01'); // un lundi : noms des jours dans la langue
    const catOpts = config.categories.map(c => `<option value="${esc(c.id)}">${esc(lab(c))}${c.letter ? ` (${esc(c.letter)})` : ''}</option>`).join('');
    host.innerHTML = `<div class="dt ${compact ? 'dt-compact' : 'dt-comfortable'}"><div class="dt-nav"><button type="button" data-w="-1">${esc(txt('nav.prev'))}</button><button type="button" data-w="0">${esc(txt('nav.today'))}</button><button type="button" data-w="1">${esc(txt('nav.next'))}</button> <b data-title></b></div>
      <div class="dt-pal" data-pal></div>
      <details class="dt-pd"${compact ? '' : ' open'}><summary>${esc(txt('period.title'))}</summary><div class="dt-period">
        <label>${esc(txt('period.cat'))} <select data-p-cat>${catOpts}</select></label>
        <label>${esc(txt('period.dateFrom'))} <input type="date" data-p-from></label><label>${esc(txt('period.dateTo'))} <input type="date" data-p-to></label>
        <span class="dt-days">${Array.from({ length: 7 }, (_, i) => `<label><input type="checkbox" data-p-day="${i}" checked>${esc(dateOf(mon0 + i * 864e5, { weekday: 'short' }))}</label>`).join(' ')}</span>
        <label>${esc(txt('period.timeFrom'))} <input type="time" step="300" data-p-s></label><label>${esc(txt('period.timeTo'))} <input type="time" step="300" data-p-e></label>
        <button type="button" data-p-add>${esc(txt('period.add'))}</button><span class="dt-help" data-p-msg>${esc(txt('period.hint'))}</span></div></details>
      <div class="dt-grid" data-grid></div>
      ${help ? `<details class="dt-helpbox"${help === 'collapsed' ? '' : ' open'}><summary>${esc(txt('help.title'))}</summary>${HELP_KEYS.map(k => `<p>${esc(txt(k))}</p>`).join('')}</details>` : ''}</div>`;
    const grid = host.querySelector('[data-grid]');
    const cur = () => preview || state;
    /** Données changées : onChange et événement dispos-change. */
    const emit = () => {
      const d = toData(state);
      onChange?.(d);
      host.dispatchEvent(new CustomEvent('dispos-change', {
        detail: d
      }));
    };
    let selSent = null; // dernière sélection annoncée (dispos-select)
    let periodTouched = false;
    /** Dates par défaut de la période : la semaine affichée (tant que l'utilisateur ne les a pas changées). */
    const periodDefaults = () => {
      if (periodTouched) return;
      const mon = weekMonday(state.week);
      host.querySelector('[data-p-from]').value = isoDay(mon);
      host.querySelector('[data-p-to]').value = isoDay(mon + 6 * 864e5);
    };

    function renderPalette() {
      const groups = config.groups.map(g => {
        const list = config.categories.filter(c => c.group === g.id),
          extra = g.layer === 'background' && g === config.groups.find(x => x.layer === 'background') ? `<button type="button" class="dt-brush" data-brush="${ERASE}" aria-pressed="${state.brush === ERASE}" title="${esc(txt('erase.title'))}" style="--c:#fff;--k:#111">${compact ? `⌫ ${esc(txt('erase'))}` : `<i style="background:#fff;border:1px dashed #0008;color:#111">⌫</i>${esc(txt('erase'))}`}</button>` : '';
        return list.length ? `<span class="dt-pal-g">${esc(txt(`group.${g.id}`, null, g.label))}</span><span class="dt-pal-r">${list.map(c => `<button type="button" class="dt-brush" data-brush="${esc(c.id)}" aria-pressed="${c.id === state.brush}" title="${esc(txt(c.layer === 'background' ? 'brush.bg' : 'brush.fg', { label: lab(c) }))}" style="--c:${esc(c.color)};--k:${ink(c.color)}">${compact ? esc(`${c.letter ? `${c.letter} ` : ''}${shortOf(c)}`) : `<i style="background:${esc(c.color)};color:${ink(c.color)}">${esc(c.letter || '')}</i>${esc(lab(c))}`}</button>`).join('')}${extra}</span>` : '';
      });
      host.querySelector('[data-pal]').innerHTML = groups.join('');
    }
    /** Texte de survol d'une plage : « Wednesday 14 October, 00:00 to 05:30: Unavailable ». */
    function describe(r) {
      const mon = weekMonday(state.week),
        c = cats.get(r.cat),
        name = !r.cat ? txt('hover.default') : c ? `${lab(c)}${c.letter ? ` (${c.letter})` : ''}` : r.cat,
        dayOf = m => dateOf(mon + Math.floor(m / DAY) * 864e5, {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        }),
        d0 = Math.floor(r.s / DAY),
        d1 = Math.floor((r.e - 1) / DAY);
      return d0 === d1 ? txt('hover.day', {
        day: dayOf(r.s),
        from: hhmm(r.s),
        to: hhmm(r.e, true),
        name
      }) : txt('hover.days', {
        day: dayOf(r.s),
        from: hhmm(r.s),
        day2: dayOf(r.e - 1),
        to: hhmm(r.e, true),
        name
      });
    }

    function render() {
      const mon = weekMonday(state.week),
        st = cur(),
        live = drag?.result || null,
        // formes en cours de geste (tracé, déplacement, poignée) : elles-mêmes, aimantées, horaires dedans
        isLive = (r, layer) => !!live && live.layer === layer && r.cat === live.cat && live.spans.some(([a, b]) => layer === 'bg' ? r.s <
          b &&
          r.e > a : r.s <= a && r.e >= b),
        vis = visibleBg(st);
      const title = txt('title', {
        n: state.week.slice(6),
        from: dateOf(mon, {
          day: 'numeric',
          month: 'long'
        }),
        to: dateOf(mon + 6 * 864e5, {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      });
      if (host.querySelector('[data-title]').textContent !== title) host.querySelector('[data-title]').textContent = title;
      let html = `<span></span><div class="dt-axis">${compact ? Array.from({ length: 24 }, (_, h) => `<span style="left:${(h + 0.5) / 24 * 100}%">${h}</span>`).join('') : Array.from({ length: 25 }, (_, h) => h % 2 ? '' : `<span style="left:${h / 24 * 100}%">${pad(h)}</span>`).join('')}</div>`;
      for (let d = 0; d < 7; d++) {
        const from = d * DAY,
          to = from + DAY,
          seg = r => {
            const s = Math.max(r.s, from) - from,
              e = Math.min(r.e, to) - from;
            return `left:${s / DAY * 100}%;width:${(e - s) / DAY * 100}%`;
          };
        // fond : sa partie visible seulement (sous une dispo, la minute est disponible)
        const bg = vis.filter(r => r.e > from && r.s < to).map(r => {
          const c = cats.get(r.cat) || {
              label: r.cat,
              color: '#999'
            },
            lv = isLive(r, 'bg'),
            own = st.bg.find(x => x.s <= r.s && x.e >= r.e), // plage de fond dont la bande est la partie visible
            sel = !!own && own === state.sel,
            first = r.s >= from && r.s === own?.s,
            last = r.e <= to && r.e === own?.e;
          return `<div class="dt-bg${lv ? ' live' : ''}${sel ? ' sel' : ''}" role="button" aria-pressed="${sel}" aria-label="${esc(describe(r))}" data-b="${st.bg.indexOf(own)}" data-s="${r.s}" data-e="${r.e}" data-cat="${esc(r.cat)}" style="${seg(r)};background:${esc(c.color)}">${lv ? `<span class="dt-lt">${esc(`${lab(c)} ${hhmm(r.s)}–${hhmm(r.e, true)}`)}</span>` : ''}${first ? '<i class="dt-h l" data-h="l"></i>' : ''}${last ? '<i class="dt-h r" data-h="r"></i>' : ''}<button type="button" class="dt-x" data-x title="${esc(txt('delete'))}">✕</button></div>`;
        }).join('');
        const fg = st.fg.filter(r => r.e > from && r.s < to).map(r => {
          const c = cats.get(r.cat) || {
              label: r.cat,
              color: '#999',
              letter: r.cat
            },
            lv = isLive(r, 'fg'),
            first = r.s >= from,
            last = r.e <= to;
          // vrai rectangle : heure de début à gauche, type au centre, heure de fin à droite
          return `<div class="dt-fg${r === state.sel ? ' sel' : ''}${lv ? ' live' : ''}" role="button" aria-pressed="${r === state.sel}" aria-label="${esc(describe(r))}" data-f="${st.fg.indexOf(r)}" style="${seg(r)};background:${esc(c.color)};color:${ink(c.color)}"><span data-t data-full="${first ? esc(hhmm(r.s)) : ''}" data-short="${first ? esc(hShort(hhmm(r.s))) : ''}">${first ? esc(hhmm(r.s)) : ''}</span><b>${esc(c.letter || '')}</b><span data-t data-full="${last ? esc(hhmm(r.e, true)) : ''}" data-short="${last ? esc(hShort(hhmm(r.e, true))) : ''}">${last ? esc(hhmm(r.e, true)) : ''}</span>${first ? '<i class="dt-h l" data-h="l"></i>' : ''}${last ? '<i class="dt-h r" data-h="r"></i>' : ''}<button type="button" class="dt-x" data-x title="${esc(txt('delete'))}">✕</button></div>`;
        }).join('');
        const dayMs = mon + d * 864e5,
          dayLabel = compact ? `${esc(dateOf(dayMs, { weekday: 'short' }).replace(/\.$/, ''))}<small>${esc(dateOf(dayMs, { day: '2-digit', month: '2-digit' }))}</small>` : `${esc(cap(dateOf(dayMs, { weekday: 'long' })))}<small>${esc(dateOf(dayMs, { day: 'numeric', month: 'short' }))}</small>`;
        html += `<div class="dt-day" data-d="${d}">${dayLabel}</div><div class="dt-row" data-d="${d}" aria-label="${esc(dateOf(mon + d * 864e5, { weekday: 'long', day: 'numeric', month: 'long' }))}">${bg}${fg}</div>`;
      }
      grid.innerHTML = html;
      if (state.sel !== selSent) { // sélection changée : dispos-select (plage ou null)
        selSent = state.sel;
        const m0 = weekMonday(state.week);
        host.dispatchEvent(new CustomEvent('dispos-select', {
          detail: selSent && {
            start: toIso(m0, selSent.s),
            end: toIso(m0, selSent.e),
            cat: selSent.cat,
            layer: state.bg.includes(selSent) ? 'background' : 'foreground'
          }
        }));
      }
      // tracé sur plusieurs rangées : un seul rectangle de sélection par-dessus la grille, bornes aimantées
      if (live?.box) {
        const [da, db, s, en] = live.box,
          g = grid.getBoundingClientRect(),
          ra = grid.querySelector(`.dt-row[data-d="${da}"]`).getBoundingClientRect(),
          rb = grid.querySelector(`.dt-row[data-d="${db}"]`).getBoundingClientRect(),
          c = cats.get(live.cat),
          box = document.createElement('div');
        box.className = 'dt-box';
        box.style.cssText = `left:${ra.left - g.left + s / DAY * ra.width}px;width:${(en - s) / DAY * ra.width}px;top:${ra.top - g.top}px;height:${rb.bottom - ra.top}px`;
        box.innerHTML = `<span>${esc(txt('box', { label: c ? lab(c) : txt('erase'), from: hhmm(s), to: hhmm(en, true), day: dateOf(mon + da * 864e5, { weekday: 'long' }), day2: dateOf(mon + db * 864e5, { weekday: 'long' }) }))}</span>`;
        grid.append(box);
      }
      // horaires aux bords si la largeur le permet (toujours pendant le geste), sinon le type seul
      grid.querySelectorAll('.dt-fg').forEach(el => {
        // une seule lettre par dispo, et ses horaires : complets (08:00) si la place le permet, sinon courts (8, 8:30) ;
        // lettre seule en dessous de 44 px (horaires dans l'infobulle) ; écritures seulement si la valeur change
        const w = el.clientWidth,
          mode = el.classList.contains('live') || w >= (compact ? 80 : 96) ? 'full' : w >= 44 ? 'short' : 'none';
        el.classList.toggle('narrow', mode === 'none');
        el.querySelectorAll('[data-t]').forEach(t => {
          const v = mode === 'short' ? t.dataset.short : t.dataset.full;
          t.hidden = mode === 'none';
          if (t.textContent !== v) t.textContent = v;
        });
      });
    }
    // historique par semaine : couches avant chaque geste (undo), après une annulation (redo)
    const hist = new Map(),
      H = () => hist.get(state.week) || hist.set(state.week, {
        undo: [],
        redo: []
      }).get(state.week),
      histEvent = () => host.dispatchEvent(new CustomEvent('dispos-history', {
        detail: api.history()
      }));
    /** Pose les couches d'un geste : une entrée d'historique, si elles changent. */
    const commit = st => {
      preview = null;
      if (JSON.stringify([st.bg, st.fg]) === JSON.stringify([state.bg, state.fg])) return void render();
      const h = H();
      h.undo.push({
        bg: state.bg,
        fg: state.fg
      });
      if (h.undo.length > HISTORY) h.undo.shift();
      h.redo.length = 0;
      state.bg = st.bg;
      state.fg = st.fg;
      render();
      emit();
      histEvent();
    };
    /** Annule (from « undo ») ou rétablit (from « redo ») un geste. */
    const restore = (from, to) => {
      const h = H(),
        prev = h[from].pop();
      if (!prev) return false;
      h[to].push({
        bg: state.bg,
        fg: state.fg
      });
      state.bg = prev.bg;
      state.fg = prev.fg;
      state.sel = null;
      preview = null;
      render();
      emit();
      histEvent();
      return true;
    };
    /** Jour (0–6) de la rangée sous le pointeur, borné à la semaine (au-dessus : lundi, en dessous : dimanche) ; dans la
     *  gouttière entre deux rangées : la plus proche. */
    const dayAt = y => {
      const rows = [...grid.querySelectorAll('.dt-row')].map(r => r.getBoundingClientRect());
      for (let i = 0; i < rows.length - 1; i++)
        if (y < (rows[i].bottom + rows[i + 1].top) / 2) return i;
      return Math.max(0, rows.length - 1);
    };
    /** Rangées que traverse un rectangle de sélection, du point de départ au pointeur (gouttières comprises) ; tout
     *  entier dans une gouttière : la rangée la plus proche. */
    const rowsSpan = (ya, yb) => {
      const lo = Math.min(ya, yb),
        hi = Math.max(ya, yb),
        hit = [...grid.querySelectorAll('.dt-row')].map((r, i) => {
          const b = r.getBoundingClientRect();
          return b.bottom > lo && b.top < hi ? i : -1;
        }).filter(i => i >= 0);
      return hit.length ? [hit[0], hit[hit.length - 1]] : [dayAt(lo), dayAt(lo)];
    };
    /** Minute de la semaine sous le pointeur, dans la rangée du jour d (bornée à 0–24 h de ce jour). */
    const minuteAt = (d, x) => {
      const b = grid.querySelector(`.dt-row[data-d="${d}"]`).getBoundingClientRect();
      return d * DAY + clamp((x - b.left) / b.width, 0, 1) * DAY;
    };
    /** Forme retrouvée après une mise à jour, dans sa couche (même catégorie qui contient la minute m). */
    const findIn = (layer, cat, m) => state[layer].find(r => r.cat === cat && r.s <= m && r.e > m) || null;
    /** Couches après le déplacement ou le redimensionnement d'une forme de la couche layer vers [s, e[ : une dispo
     *  découpe les dispos qu'elle recouvre ; une plage de fond, le fond seulement (les dispos restent par-dessus). */
    const placeIn = (layer, r, s, e) => layer === 'fg' ? applyFg({
      bg: state.bg,
      fg: state.fg.filter(x => x !== r)
    }, s, e, r.cat) : {
      bg: paint(state.bg.filter(x => x !== r), s, e, r.cat),
      fg: state.fg
    };
    /** Couches sans la forme r (de l'une ou l'autre couche). */
    const without = r => ({
      bg: state.bg.filter(x => x !== r),
      fg: state.fg.filter(x => x !== r)
    });
    /** Pose une plage avec un pinceau (fond, effacement du fond ou dispo) dans les couches st. */
    const applyBrush = (st, s, e, id) => id === ERASE ? applyBg(st, s, e, '') : isBg(id) ? applyBg(st, s, e, id) : applyFg(st, s, e,
      id);

    grid.addEventListener('pointerdown', e => {
      // départ dans une rangée ou dans la gouttière entre deux rangées (colonne de l'axe) ; noms des jours, axe et
      // croix : non
      const row = e.target.closest('.dt-row'),
        lane = grid.querySelector('.dt-row')?.getBoundingClientRect();
      if (e.button > 0 || e.target.closest('[data-x], .dt-day, .dt-axis')) return;
      if (!row && (!lane || e.clientX < lane.left || e.clientX > lane.right)) return;
      hover.hidden = true;
      // règle unique, quel que soit le pinceau : un geste qui part SUR une forme (dispo ou bande de fond) la saisit
      // (clic : sélection ; glisser : déplacement ; poignée : bord ; Maj+glisser : tracer par-dessus) ; à côté (vide,
      // gouttière), il trace avec le pinceau, qui ne dit que QUOI tracer
      const fgEl = e.target.closest('.dt-fg'),
        bgEl = !fgEl && e.target.closest('.dt-bg'),
        layer = fgEl ? 'fg' : 'bg',
        r = fgEl ? state.fg[+fgEl.dataset.f] : bgEl ? state.bg[+bgEl.dataset.b] || null : null,
        handle = e.target.closest('[data-h]')?.dataset.h,
        d = row ? +row.dataset.d : dayAt(e.clientY),
        m = minuteAt(d, e.clientX);
      e.preventDefault();
      if (r && handle) drag = {
        mode: 'resize',
        r,
        layer,
        side: handle,
        d,
        press: true
      };
      else if (r) drag = {
        mode: e.shiftKey ? 'draw' : 'move', // Maj : tracer par-dessus la forme
        r,
        layer,
        d,
        m0: m,
        x0: e.clientX,
        y0: e.clientY,
        press: true
      };
      else drag = {
        mode: 'draw',
        d,
        m0: m,
        x0: e.clientX,
        y0: e.clientY
      };
      drag.moved = false;
      drag.pid = e.pointerId;
      if (r) drag.long = setTimeout(() => { // appui long : sélection
        if (drag && !drag.moved) {
          state.sel = r;
          drag = null;
          preview = null;
          render();
        }
      }, LONG_PRESS);
    });
    const onMove = e => {
      if (palDrag) return palMove(e);
      if (!drag) return hoverAt(e);
      if (!drag.moved && Math.hypot(e.clientX - (drag.x0 ?? e.clientX), e.clientY - (drag.y0 ?? e.clientY)) > 3) {
        drag.moved = true;
        try {
          grid.setPointerCapture(drag.pid); // le geste continue hors de la rangée (la grille n'est pas redessinée)
        } catch {
          /* pointeur déjà relâché */
        }
      }
      if (!drag.moved && drag.mode !== 'resize') return;
      clearTimeout(drag.long);
      if (drag.mode === 'draw') {
        // tracé : dans la rangée de départ, ou en rectangle de sélection sur plusieurs rangées (la même plage horaire
        // sur chaque jour couvert) ; un pinceau de fond découpe les dispos dès l'aperçu
        const id = state.brush,
          [da, db] = rowsSpan(drag.y0, e.clientY),
          t0 = drag.m0 - drag.d * DAY,
          t1 = minuteAt(da, e.clientX) - da * DAY,
          s = clamp(snap(Math.min(t0, t1), SNAP_DRAW), 0, DAY - SNAP_DRAW),
          en = clamp(snap(Math.max(t0, t1), SNAP_DRAW), s + SNAP_DRAW, DAY),
          spans = [];
        for (let d = da; d <= db; d++) spans.push([d * DAY + s, d * DAY + en]);
        drag.result = {
          spans,
          cat: id === ERASE ? '' : id,
          layer: isBg(id) ? 'bg' : 'fg',
          box: db > da ? [da, db, s, en] : null
        };
        preview = spans.reduce((st, [a, b]) => applyBrush(st, a, b, id), state);
      } else if (drag.mode === 'move') {
        // corps glissé : pas de 5 min ; vers une autre rangée, même horaire, autre jour
        const len = drag.r.e - drag.r.s,
          m = minuteAt(drag.d, e.clientX),
          s = clamp(snap(drag.r.s + (m - drag.m0), SNAP_EDIT) + (dayAt(e.clientY) - drag.d) * DAY, 0, WEEK - len);
        drag.result = {
          spans: [
            [s, s + len]
          ],
          cat: drag.r.cat,
          layer: drag.layer
        };
        preview = placeIn(drag.layer, drag.r, s, s + len);
      } else if (drag.mode === 'resize') {
        const m = minuteAt(drag.d, e.clientX);
        let {
          s,
          e: en
        } = drag.r;
        if (drag.side === 'l') s = clamp(snap(m, SNAP_EDIT), 0, en - SNAP_EDIT);
        else en = clamp(snap(m, SNAP_EDIT), s + SNAP_EDIT, WEEK);
        drag.result = {
          spans: [
            [s, en]
          ],
          cat: drag.r.cat,
          layer: drag.layer
        };
        preview = placeIn(drag.layer, drag.r, s, en);
      }
      render();
    };
    window.addEventListener('pointermove', onMove);
    const end = e => {
      if (palDrag) return palEnd(e);
      if (!drag) return;
      clearTimeout(drag.long);
      const d = drag;
      drag = null;
      if (d.result && preview) {
        const {
          spans: [
            [s]
          ],
          cat,
          layer
        } = d.result;
        commit(preview);
        state.sel = d.mode !== 'draw' && cat ? findIn(layer, cat, s) : null;
        render();
        return;
      }
      preview = null;
      // clic sans glisser : sélection de la forme, sinon désélection ; redessin seulement si elle change (un redessin
      // entre les deux clics ferait manquer le double-clic)
      const sel = d.press ? d.r : null;
      if (sel !== state.sel) {
        state.sel = sel;
        render();
      }
    };
    window.addEventListener('pointerup', end);
    grid.addEventListener('pointercancel', () => {
      drag = null;
      preview = null;
      render();
    });
    /** Survol (hors geste) : plage sous le pointeur, en clair (« mercredi 14 octobre, de 00:00 à 05:30 : Indisponible »). */
    function hoverAt(e) {
      const el = document.elementFromPoint(e.clientX, e.clientY),
        f = el?.closest?.('.dt-fg'),
        b = !f && el?.closest?.('.dt-bg'),
        row = !f && !b && el?.closest?.('.dt-row');
      let r = f ? state.fg[+f.dataset.f] : b ? {
        s: +b.dataset.s,
        e: +b.dataset.e,
        cat: b.dataset.cat
      } : null;
      if (row && grid.contains(row)) { // vide, dans le jour survolé : du bout de ce qui précède au début de ce qui suit
        const d = +row.dataset.d,
          m = minuteAt(d, e.clientX),
          all = [...state.fg, ...visibleBg(state)];
        r = {
          s: Math.max(d * DAY, ...all.filter(x => x.e <= m).map(x => x.e)),
          e: Math.min(d * DAY + DAY, ...all.filter(x => x.s > m).map(x => x.s)),
          cat: ''
        };
      }
      if (!r || !grid.contains(el)) {
        hover.hidden = true;
        return;
      }
      const text = describe(r);
      if (hover.textContent !== text) hover.textContent = text;
      hover.hidden = false;
      hover.style.left = `${Math.min(e.clientX + 14, innerWidth - hover.offsetWidth - 8)}px`;
      hover.style.top = `${e.clientY + 16}px`;
    }
    grid.addEventListener('pointerleave', () => hover.hidden = true);
    grid.addEventListener('click', e => {
      const x = e.target.closest('[data-x]');
      if (!x) return;
      const el = x.closest('.dt-fg, .dt-bg'),
        r = el.classList.contains('dt-fg') ? state.fg[+el.dataset.f] : state.bg[+el.dataset.b];
      if (!r) return;
      if (state.sel === r) state.sel = null;
      hover.hidden = true;
      commit(without(r));
    });
    // double-clic : sur une bande de fond, elle REMPLACE le fond du jour (sa catégorie) ; ailleurs dans la rangée, le
    // pinceau de fond (ou l'effacement) ; les dispos restent posées
    grid.addEventListener('dblclick', e => {
      const at = document.elementFromPoint(e.clientX, e.clientY),
        row = at?.closest?.('.dt-row'),
        band = at?.closest?.('.dt-bg');
      if (!row || at.closest('.dt-fg')) return;
      const id = band ? band.dataset.cat : isBg(state.brush) ? state.brush : null;
      if (id == null) return;
      const day = +row.dataset.d * DAY;
      commit({
        bg: id === ERASE ? tidy(cut(state.bg, day, day + DAY)) : paint(state.bg, day, day + DAY, id),
        fg: state.fg
      });
    });
    // palette : clic = pinceau ; double-clic sur une entrée de fond = fond de la semaine ; glisser une entrée sur un
    // jour = journée entière
    const pal = host.querySelector('[data-pal]');
    pal.addEventListener('click', e => {
      const b = e.target.closest('[data-brush]');
      if (!b || b.dataset.dragged) return void delete b?.dataset.dragged;
      state.brush = b.dataset.brush;
      // état des boutons seulement : redessiner la palette entre les deux clics ferait manquer le double-clic
      host.querySelectorAll('[data-brush]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.brush === state.brush)));
    });
    pal.addEventListener('dblclick', e => {
      const id = e.target.closest('[data-brush]')?.dataset.brush;
      if (!id || !isBg(id)) return;
      commit({
        bg: id === ERASE ? [] : paint(state.bg, 0, WEEK, id),
        fg: state.fg
      });
    });
    pal.addEventListener('pointerdown', e => {
      const b = e.target.closest('[data-brush]');
      if (!b || e.button > 0) return;
      palDrag = {
        id: b.dataset.brush,
        el: b,
        x0: e.clientX,
        y0: e.clientY,
        moved: false,
        pid: e.pointerId
      };
    });
    /** Glisser d'une entrée de la palette : la rangée visée est encadrée. */
    function palMove(e) {
      if (!palDrag.moved && Math.hypot(e.clientX - palDrag.x0, e.clientY - palDrag.y0) > 5) {
        palDrag.moved = true;
        try {
          pal.setPointerCapture(palDrag.pid);
        } catch {
          /* pointeur relâché */
        }
      }
      if (!palDrag.moved) return;
      const target = dropTarget(document.elementFromPoint(e.clientX, e.clientY), palDrag.id)?.el;
      grid.querySelectorAll('.drop').forEach(x => x !== target && x.classList.remove('drop'));
      if (target && !target.classList.contains('drop')) target.classList.add('drop');
    }
    /** Cible d'un dépôt de la palette : une dispo, une bande de fond (sa partie visible) ou le jour (vide de la rangée,
     *  nom du jour : la rangée est encadrée) ; « Effacer le fond » vise une bande ou le jour. */
    function dropTarget(at, id) {
      const f = id !== ERASE && at?.closest?.('.dt-fg'),
        b = !f && at?.closest?.('.dt-bg'),
        day = at?.closest?.('.dt-row, .dt-day');
      if (!day || !grid.contains(day)) return null;
      const d = +day.dataset.d;
      return {
        el: f || b || grid.querySelector(`.dt-row[data-d="${d}"]`),
        f,
        b,
        d
      };
    }
    /** Lâcher d'une entrée de la palette : sur une dispo ou une bande de fond, elle en change la nature sur son étendue
     *  (entrée de fond sur une dispo : remplacée par ce fond ; entrée de dispo sur une bande : un rectangle à sa place) ;
     *  sur le jour, la journée entière, fond ou dispo. */
    function palEnd(e) {
      const p = palDrag;
      palDrag = null;
      grid.querySelectorAll('.drop').forEach(x => x.classList.remove('drop'));
      if (!p.moved) return;
      p.el.dataset.dragged = '1'; // le clic qui suit ne change pas de pinceau
      setTimeout(() => delete p.el.dataset.dragged, 0);
      const t = dropTarget(document.elementFromPoint(e.clientX, e.clientY), p.id);
      if (!t) return;
      state.sel = null;
      if (t.b) return void commit(applyBrush(state, +t.b.dataset.s, +t.b.dataset.e, p.id));
      if (t.f) {
        const r = state.fg[+t.f.dataset.f];
        return void commit(isBg(p.id) ? applyBg(state, r.s, r.e, p.id) : {
          bg: state.bg,
          fg: paint(state.fg.filter(x => x !== r), r.s, r.e, p.id)
        });
      }
      // journée entière : une entrée de fond ne touche que le fond (les dispos restent par-dessus) ; une entrée de dispo
      // pose une dispo sur toute la journée
      const day = t.d * DAY;
      commit(isBg(p.id) ? {
        bg: p.id === ERASE ? tidy(cut(state.bg, day, day + DAY)) : paint(state.bg, day, day + DAY, p.id),
        fg: state.fg
      } : applyFg(state, day, day + DAY, p.id));
    }
    host.querySelector('.dt-nav').addEventListener('click', e => {
      const b = e.target.closest('[data-w]');
      if (!b) return;
      api.week(+b.dataset.w ? addWeek(state.week, +b.dataset.w) : weekId(Date.now()));
    });
    // période répétitive : catégorie, dates, jours de la semaine, horaires (vides : journée entière) ; semaines hors de
    // celle affichée : par store (read / write)
    host.querySelectorAll('[data-p-from], [data-p-to]').forEach(i => i.addEventListener('change', () => periodTouched = true));
    host.querySelector('[data-p-add]').addEventListener('click', () => {
      const q = sel => host.querySelector(sel),
        msg = q('[data-p-msg]'),
        id = q('[data-p-cat]').value,
        from = Date.parse(`${q('[data-p-from]').value}T00:00:00Z`),
        to = Date.parse(`${q('[data-p-to]').value}T00:00:00Z`),
        days = new Set([...host.querySelectorAll('[data-p-day]:checked')].map(x => +x.dataset.pDay)),
        tm = v => v ? +v.slice(0, 2) * 60 + +v.slice(3, 5) : null,
        s0 = tm(q('[data-p-s]').value),
        e0 = tm(q('[data-p-e]').value);
      if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return void(msg.textContent =
        txt('period.errDates'));
      if (!days.size) return void(msg.textContent = txt('period.errDays'));
      if ((s0 == null) !== (e0 == null)) return void(msg.textContent = txt('period.errTimes'));
      // plages absolues (minutes depuis l'époque), puis réparties par semaine
      const spans = [];
      for (let t = from; t <= to; t += 864e5) {
        if (!days.has((new Date(t).getUTCDay() + 6) % 7)) continue;
        const a = t / 6e4 + (s0 ?? 0),
          b = t / 6e4 + (s0 == null ? DAY : e0 > s0 ? e0 : e0 + DAY);
        spans.push([a, b]);
      }
      const byWeek = new Map();
      for (const [a, b] of spans) {
        for (let w = weekId(a * 6e4); weekMonday(w) / 6e4 < b; w = addWeek(w, 1)) {
          const mon = weekMonday(w) / 6e4,
            s = Math.max(a, mon) - mon,
            e = Math.min(b, mon + WEEK) - mon;
          if (e > s)(byWeek.get(w) || byWeek.set(w, []).get(w)).push([s, e]);
        }
      }
      let other = 0,
        lost = 0;
      for (const [w, list] of byWeek) {
        if (w === state.week) {
          let st = {
            bg: state.bg,
            fg: state.fg
          };
          for (const [s, e] of list) st = applyBrush(st, s, e, id);
          commit(st);
        } else if (store?.read && store?.write) {
          const d0 = store.read(w) || {
            schema: 3,
            pilot: state.pilot,
            week: w,
            ranges: []
          };
          let st = fromData(d0, w, config);
          for (const [s, e] of list) st = applyBrush(st, s, e, id);
          store.write(toData({
            week: w,
            pilot: d0.pilot || state.pilot,
            ...st
          }));
          other++;
        } else lost++;
      }
      msg.textContent = `${txt('period.done', { n: spans.length })}${other ? txt('period.other', { n: other }) : ''}${lost ? txt('period.lost', { n: lost }) : ''}.`;
    });
    // clavier : historique ; dispo sélectionnée
    const onKey = e => {
      if (!host.isConnected || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) return;
      const k = e.key.toLowerCase(),
        r = state.sel,
        step = {
          ArrowLeft: -SNAP_EDIT,
          ArrowRight: SNAP_EDIT,
          ArrowUp: -DAY,
          ArrowDown: DAY
        } [e.key];
      if ((e.ctrlKey || e.metaKey) && (k === 'z' || k === 'y')) {
        e.preventDefault();
        if (k === 'y' || e.shiftKey) api.redo();
        else api.undo();
        return;
      }
      if (!r) return;
      if (e.key === 'Escape') {
        state.sel = null;
        render();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        state.sel = null;
        commit(without(r));
      } else if (step) { // ← → : 5 min ; ↑ ↓ : un jour, même horaire (dispo ou plage de fond)
        e.preventDefault();
        const len = r.e - r.s,
          s = r.s + step,
          layer = state.bg.includes(r) ? 'bg' : 'fg';
        if (s < 0 || s + len > WEEK) return;
        commit(placeIn(layer, r, s, s + len));
        state.sel = findIn(layer, r.cat, s);
        render();
      }
    };
    document.addEventListener('keydown', onKey);
    const api = {
      /** Remplace les données (schema 3) de la semaine affichée. */
      set(d) {
        state.pilot = d?.pilot || state.pilot;
        if (d?.week) state.week = d.week;
        Object.assign(state, fromData(d, state.week, config));
        state.sel = null;
        periodDefaults();
        render();
        histEvent();
      },
      /** Données de la semaine affichée (schema 3). */
      get: () => toData(state),
      /** Change de semaine (sans argument : rend la semaine affichée) ; la page charge la semaine voulue par set. */
      week(w) {
        if (!w) return state.week;
        state.week = w;
        state.bg = [];
        state.fg = [];
        state.sel = null;
        periodDefaults();
        host.dispatchEvent(new CustomEvent('dispos-week', {
          detail: {
            week: w
          }
        }));
        render();
        histEvent();
        return w;
      },
      /** Annule le dernier geste de la semaine affichée (false : rien à annuler). */
      undo: () => restore('undo', 'redo'),
      /** Rétablit le dernier geste annulé (false : rien à rétablir). */
      redo: () => restore('redo', 'undo'),
      /** Remplace les données de la semaine affichée par un geste qui s'annule (import) ; données d'une autre semaine :
       *  false, rien n'est changé. */
      replace(d) {
        if (d?.week && d.week !== state.week) return false;
        state.sel = null;
        commit(fromData(d, state.week, config));
        return true;
      },
      /** Vide la semaine affichée (un geste : il s'annule). */
      clear() {
        state.sel = null;
        commit({
          bg: [],
          fg: []
        });
      },
      /** Démonte le composant : écouteurs de la fenêtre et du document retirés, hôte vidé. */
      destroy() {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', end);
        document.removeEventListener('keydown', onKey);
        hover.remove();
        host.innerHTML = '';
        drag = palDrag = preview = null;
      },
      /** Pas d'historique de la semaine affichée : { undo, redo }. */
      history: () => ({
        undo: H().undo.length,
        redo: H().redo.length
      }),
      /** Pinceau actif (identifiant de catégorie, ou « __erase »). */
      brush(id) {
        if (cats.has(id) || id === ERASE) state.brush = id;
        renderPalette();
        return state.brush;
      }
    };
    renderPalette();
    periodDefaults();
    render();
    return api;
  }

  window.DisposTimeline = {
    mount,
    DEFAULT_CONFIG,
    DEFAULT_LABELS,
    weekId,
    weekMonday,
    addWeek,
    // modèle : pour les lecteurs / écrivains de formats (shared/dispos_formats.js)
    model: {
      DAY,
      WEEK,
      cut,
      tidy,
      paint,
      applyBg,
      applyFg,
      visibleBg,
      fromData,
      toData,
      toIso,
      fromIso,
      isoDay
    }
  };
})();
