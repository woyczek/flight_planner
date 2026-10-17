(() => {
  'use strict';
  // Maquette (hors suite) : saisie des disponibilités sur un axe de temps continu, une rangée par jour de la semaine.
  //   · FOND : nature de la non-disponibilité (indisponible, congés, récupération, activité réelle), bandes pleine
  //     hauteur, couleur seule, aimantées à la demi-heure, d'une rangée à l'autre pour plusieurs jours ; glisser l'entrée
  //     de la palette sur un jour : journée entière ; double-clic : REMPLACE le fond du jour (sur la palette : de la
  //     semaine) ; pinceau « Effacer le fond » ;
  //   · PREMIER PLAN : les dispos, par rectangle (lettre au centre, heure de début à gauche, de fin à droite), aimantés
  //     à la demi-heure, poignées et déplacement au pas de 5 min ; clic : sélection (Suppr, ← →, Échap), croix au survol,
  //     appui long au doigt ;
  //   · une minute a UN état : là où une dispo est posée, le fond ne compte pas (export, survol) ; il reste pourtant en
  //     place dessous, si bien qu'une dispo déplacée ou effacée rend le fond choisi ; une non-disponibilité posée sur une
  //     dispo la découpe ; temps sans fond ni dispo : indisponible par défaut ;
  //   · survol (hors geste) : la plage en clair, partie visible seulement (« mercredi 14 octobre, de 00:00 à 05:30 :
  //     Indisponible ») ; pendant un geste, la forme elle-même, aimantée, horaires dedans ;
  //   · période répétitive : catégorie, dates, jours, horaires, sur plusieurs semaines (par store).
  // Modèle du composant (schema 3) : { schema: 3, pilot, week: "AAAA-Wnn", tz: "UTC", ranges: [{ start, end, cat }],
  // background: [...] } ; ranges : la déclaration, sans chevauchement (dispos, puis fond visible) ; background : le fond
  // tel que posé, dessous compris (aide à l'édition). Dates « AAAA-MM-JJTHH:MM » (fin exclue). Catégories : configuration
  // séparée { categories: [{ id, label, letter, color, layer: "background" | "foreground", group, legacy }] }.
  // Lecteurs / écrivains : schema 2 de la suite (une déclaration par semaine, plages par jour au quart d'heure) ↔ schema 3.
  // API (window.DisposTimeline) : mount(hôte, { config, week, data, onChange(data), store }) → { set(data), get(),
  //   week(w), brush(id) } ; DEFAULT_CONFIG ; fromSchema2(doc, config), toSchema2(data, config, base) ; weekId(date),
  //   weekMonday(id), addWeek(id, n).
  if (window.DisposTimeline) return;
  const DAY = 1440,
    WEEK = 7 * DAY,
    SNAP_DRAW = 30,
    SNAP_EDIT = 5,
    MIN_PIECE = 5,
    LONG_PRESS = 500;
  const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  /** Catégories par défaut, reprises de la configuration de la suite (shared/dispos.js : couleurs, codes de l'ODV). */
  const DEFAULT_CONFIG = {
    schema: 1,
    groups: [{
      id: 'indispo',
      label: 'Non disponible',
      layer: 'background'
    }, {
      id: 'dispo',
      label: 'Disponible',
      layer: 'foreground'
    }, {
      id: 'exercice',
      label: 'Exercice',
      layer: 'foreground'
    }, {
      id: 'occupe',
      label: 'Occupé',
      layer: 'foreground'
    }],
    categories: [{
      id: 'IN',
      label: 'Indisponible',
      letter: '',
      color: '#BFBFBF',
      layer: 'background',
      group: 'indispo',
      legacy: 'indispo'
    }, {
      id: 'V',
      label: 'Congés',
      letter: '',
      color: '#FFC000',
      layer: 'background',
      group: 'indispo',
      legacy: 'conges'
    }, {
      id: 'Q',
      label: 'Récupération',
      letter: '',
      color: '#D9D9D9',
      layer: 'background',
      group: 'indispo',
      legacy: 'recup'
    }, {
      id: 'IR',
      label: 'Activité réelle',
      letter: '',
      color: '#FFFF00',
      layer: 'background',
      group: 'indispo',
      legacy: 'irl'
    }, {
      id: 'O',
      label: 'Disponible pour tout',
      letter: 'O',
      color: '#00B050',
      layer: 'foreground',
      group: 'dispo',
      legacy: 'tout'
    }, {
      id: 'SC',
      label: 'Disponible sécurité civile',
      letter: 'SC',
      color: '#2F5597',
      layer: 'foreground',
      group: 'dispo',
      legacy: 'secu'
    }, {
      id: 'D+',
      label: 'Disponible défense',
      letter: 'D+',
      color: '#0070C0',
      layer: 'foreground',
      group: 'dispo',
      legacy: 'defense'
    }, {
      id: 'S',
      label: 'Vol en exercice SOG',
      letter: 'S',
      color: '#FF0000',
      layer: 'foreground',
      group: 'exercice',
      legacy: 'exercice_vol'
    }, {
      id: 'AM',
      label: 'Contrôle SOG',
      letter: 'AM',
      color: '#C4BD97',
      layer: 'foreground',
      group: 'exercice',
      legacy: 'exercice_ctrl'
    }, {
      id: 'G',
      label: 'Vol hors SOG (IVAO / VATSIM)',
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
      label: 'Contrôle hors SOG (IVAO / VATSIM)',
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
  /** Déclaration de la suite (schema 2 : { semaine, pilote, dispos: { "AAAA-MM-JJ": [{ debut, fin, categorie }] } },
   *  heures UTC au quart d'heure, null : journée entière) → schema 3, sans perte : le fond va dans la couche de fond,
   *  le reste dans les dispos ; dans une même couche, des plages superposées (permises dans le schema 2) : la dernière
   *  gagne. Catégorie inconnue : son identifiant tel quel. */
  function fromSchema2(doc, config = DEFAULT_CONFIG) {
    const week = doc?.semaine || weekId(Date.now()),
      mon = weekMonday(week),
      byLegacy = new Map((config.categories || []).map(c => [c.legacy || c.id, c.id])),
      bgCats = new Set((config.categories || []).filter(c => c.layer === 'background').map(c => c.id)),
      items = [];
    for (const [day, list] of Object.entries(doc?.dispos || {})) {
      const base = Math.round((Date.parse(`${day}T00:00:00Z`) - mon) / 6e4);
      if (base < 0 || base >= WEEK) continue;
      const m = v => v ? +v.slice(0, 2) * 60 + +v.slice(3, 5) : null;
      for (const it of list || []) {
        const s = base + (m(it.debut) ?? 0),
          e = base + (it.fin ? m(it.fin) : DAY);
        if (e > s) items.push({
          s,
          e,
          cat: byLegacy.get(it.categorie) || it.categorie
        });
      }
    }
    let st = {
      bg: [],
      fg: []
    };
    for (const r of items.filter(r => bgCats.has(r.cat))) st = applyBg(st, r.s, r.e, r.cat);
    for (const r of items.filter(r => !bgCats.has(r.cat))) st = applyFg(st, r.s, r.e, r.cat);
    return toData({
      week,
      pilot: doc?.pilote || '',
      ...st
    });
  }
  /** Schema 3 → déclaration de la suite (schema 2), par jour, horaires arrondis au quart d'heure, sans chevauchement
   *  (dispos, puis fond visible) ; un jour sans rien : indisponible toute la journée (première catégorie de fond) ;
   *  temps sans rien dans un jour entamé : pas d'entrée (indisponible par défaut) ; base : document schema 2 dont les
   *  autres champs (appareils, simulateurs…) sont gardés. */
  function toSchema2(data, config = DEFAULT_CONFIG, base = {}) {
    const week = data.week,
      mon = weekMonday(week),
      legacy = new Map((config.categories || []).map(c => [c.id, c.legacy || c.id])),
      dispos = {},
      q = m => Math.round(m / 15) * 15,
      st = fromData(data, week, config),
      dflt = (config.categories || []).find(c => c.layer === 'background');
    for (const r of [...st.fg, ...visibleBg(st)].sort((a, b) => a.s - b.s)) {
      for (let d = Math.floor(r.s / DAY); d * DAY < r.e; d++) {
        const s = q(Math.max(r.s, d * DAY) - d * DAY),
          e = q(Math.min(r.e, (d + 1) * DAY) - d * DAY);
        if (e <= s) continue;
        (dispos[isoDay(mon + d * 864e5)] ||= []).push({
          debut: s === 0 && e === DAY ? null : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`,
          fin: s === 0 && e === DAY ? null : `${pad(Math.floor(e / 60))}:${pad(e % 60)}`,
          categorie: legacy.get(r.cat) || r.cat
        });
      }
    }
    for (let d = 0; d < 7 && dflt; d++) {
      const day = isoDay(mon + d * 864e5);
      if (!dispos[day]) dispos[day] = [{
        debut: null,
        fin: null,
        categorie: dflt.legacy || dflt.id
      }];
    }
    return {
      ...base,
      schema: 2,
      pilote: data.pilot || base.pilote || '',
      semaine: week,
      updated_at: new Date().toISOString(),
      dispos
    };
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
    st.textContent = `.dt{display:grid;gap:10px;font:14px/1.4 system-ui,sans-serif;user-select:none;-webkit-user-select:none}
.dt-nav{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.dt-nav b{min-width:15em}
.dt-pal{display:grid;grid-template-columns:max-content 1fr;gap:6px 10px;align-items:center}
.dt-pal-g{font-size:12px;opacity:.75;text-align:right}.dt-pal-r{display:flex;flex-wrap:wrap;gap:4px}
.dt-brush{display:inline-flex;align-items:center;gap:6px;border:1px solid #0003;background:#fff;color:#111;padding:3px 8px;cursor:grab;font:inherit;font-size:12.5px;touch-action:none}
.dt-brush i{display:inline-block;min-width:18px;height:18px;font:700 11px/18px system-ui;text-align:center;font-style:normal}
.dt-brush[aria-pressed=true]{outline:2px solid #1d6fd8;outline-offset:1px}
.dt-grid{display:grid;grid-template-columns:7.5em 1fr;gap:4px 8px}
.dt-day{font-size:12.5px;line-height:1.2;align-self:center}.dt-day small{display:block;opacity:.7}
.dt-axis{position:relative;height:18px;font-size:10.5px;opacity:.7}.dt-axis span{position:absolute;transform:translateX(-50%)}
.dt-row{position:relative;height:44px;border:1px solid #0002;touch-action:none;cursor:crosshair;
background:repeating-linear-gradient(90deg,#0000 0,#0000 calc(100%/48 - 1px),#00000010 calc(100%/48 - 1px),#00000010 calc(100%/48)),
repeating-linear-gradient(90deg,#0000 0,#0000 calc(100%/24 - 1px),#00000030 calc(100%/24 - 1px),#00000030 calc(100%/24)),#fafafa}
.dt-row.drop{outline:2px dashed #1d6fd8;outline-offset:1px}
.dt-bg{position:absolute;top:0;bottom:0;opacity:.85}
.dt-fg{position:absolute;top:3px;bottom:3px;box-shadow:0 1px 2px #0005;display:flex;align-items:center;justify-content:space-between;
padding:0 6px;overflow:hidden;white-space:nowrap;font-size:11.5px;cursor:grab;box-sizing:border-box;z-index:1}
.dt-fg b{font-size:13px;position:absolute;left:50%;transform:translateX(-50%)}.dt-fg.narrow{justify-content:center}
.dt-fg.sel{outline:2px solid #1d6fd8;outline-offset:1px;z-index:2}
.dt-h{position:absolute;top:0;bottom:0;width:7px;cursor:ew-resize;display:none;background:#fff8;border:1px solid #0006;box-sizing:border-box}
.dt-h.l{left:0}.dt-h.r{right:0}.dt-fg:hover .dt-h,.dt-fg.sel .dt-h{display:block}
.dt-x{position:absolute;top:-1px;right:8px;display:none;border:0;background:#0008;color:#fff;font:11px/14px system-ui;padding:0 4px;cursor:pointer;z-index:2}
.dt-fg:hover .dt-x{display:block}
.dt-fg.live{z-index:3;box-shadow:0 0 0 2px #1d6fd8,0 2px 6px #0006}.dt-bg.live{opacity:1;box-shadow:inset 0 0 0 2px #1d6fd8}
.dt-bg .dt-lt{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font:600 11.5px/1 system-ui;color:#111;background:#fffc;padding:2px 5px;white-space:nowrap}
.dt-hover{position:fixed;pointer-events:none;background:#111;color:#fff;font:12px/1.3 system-ui;padding:3px 7px;z-index:50;white-space:nowrap}
.dt-period{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;font-size:13px}.dt-period label{display:inline-flex;gap:5px;align-items:center}
.dt-period .dt-days label{gap:2px}.dt-period input,.dt-period select{font:inherit;padding:3px 5px}
.dt-help{font-size:12px;opacity:.75;margin:0}`;
    document.head.append(st);
  }
  const DAY_LOWER = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

  /** Monte le composant dans host. opts : { config, week, data (schema 3), onChange(data), store : { read(semaine) →
   *  données schema 3 | null, write(données) } (périodes qui débordent de la semaine affichée) }. */
  function mount(host, {
    config = DEFAULT_CONFIG,
    week = weekId(Date.now()),
    data = null,
    onChange = null,
    store = null
  } = {}) {
    css();
    const cats = new Map(config.categories.map(c => [c.id, c]));
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
    const catOpts = config.categories.map(c => `<option value="${esc(c.id)}">${esc(c.label)}${c.letter ? ` (${esc(c.letter)})` : ''}</option>`).join('');
    host.innerHTML = `<div class="dt"><div class="dt-nav"><button type="button" data-w="-1">‹</button><button type="button" data-w="0">cette semaine</button><button type="button" data-w="1">›</button> <b data-title></b></div>
      <div class="dt-pal" data-pal></div>
      <details class="dt-pd" open><summary>Période répétitive (saisie manuelle)</summary><div class="dt-period">
        <label>Catégorie <select data-p-cat>${catOpts}</select></label>
        <label>du <input type="date" data-p-from></label><label>au <input type="date" data-p-to></label>
        <span class="dt-days">${DAY_LOWER.map((d, i) => `<label><input type="checkbox" data-p-day="${i}" checked>${esc(d.slice(0, 3))}</label>`).join(' ')}</span>
        <label>de <input type="time" step="300" data-p-s></label><label>à <input type="time" step="300" data-p-e></label>
        <button type="button" data-p-add>Ajouter</button><span class="dt-help" data-p-msg>Horaires vides : journée entière. Fin avant le début : jusqu'au lendemain.</span></div></details>
      <div class="dt-grid" data-grid></div>
      <p class="dt-help">Fond (nature de la non-disponibilité, couleur seule) : glisser pour poser une bande, d'une rangée à l'autre pour plusieurs jours ; glisser l'entrée de la palette sur un jour : journée entière ; double-clic sur une bande (ou sur la rangée, avec un pinceau de fond) : remplace le fond du jour ; double-clic sur l'entrée de la palette : celui de la semaine. Dispos (rectangles, posés sur le fond) : glisser pour poser ; bords et corps se glissent au pas de 5 min ; clic : sélection (Suppr, ← →, Échap) ; appui long au doigt : sélection. Une minute a un seul état : sous une dispo, le fond ne compte pas, mais il reste en place (dispo déplacée ou effacée : le fond revient) ; une non-disponibilité posée sur une dispo la découpe ; temps sans rien : indisponible par défaut, et un jour vide s'exporte « indisponible » toute la journée.</p></div>`;
    const grid = host.querySelector('[data-grid]');
    const cur = () => preview || state;
    const emit = () => onChange?.(toData(state));
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
          extra = g.layer === 'background' && g === config.groups.find(x => x.layer === 'background') ? `<button type="button" class="dt-brush" data-brush="${ERASE}" aria-pressed="${state.brush === ERASE}" title="Effacer le fond (les dispos restent)"><i style="background:#fff;border:1px dashed #0008;color:#111">⌫</i>Effacer le fond</button>` : '';
        return list.length ? `<span class="dt-pal-g">${esc(g.label)}</span><span class="dt-pal-r">${list.map(c => `<button type="button" class="dt-brush" data-brush="${esc(c.id)}" aria-pressed="${c.id === state.brush}" title="${esc(c.layer === 'background' ? `${c.label} — glisser sur un jour : journée entière ; double-clic : fond de toute la semaine` : `${c.label} — glisser sur un jour : journée entière`)}"><i style="background:${esc(c.color)};color:${ink(c.color)}">${esc(c.letter || '')}</i>${esc(c.label)}</button>`).join('')}${extra}</span>` : '';
      });
      host.querySelector('[data-pal]').innerHTML = groups.join('');
    }
    /** Texte de survol d'une plage : « mercredi 14 octobre, de 00:00 à 05:30 : Indisponible ». */
    function describe(r) {
      const mon = weekMonday(state.week),
        c = cats.get(r.cat),
        name = !r.cat ? 'Indisponible (par défaut)' : c ? `${c.label}${c.letter ? ` (${c.letter})` : ''}` : r.cat,
        dayOf = m => `${DAY_LOWER[Math.floor(m / DAY)]} ${new Date(mon + Math.floor(m / DAY) * 864e5).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' })}`,
        d0 = Math.floor(r.s / DAY),
        d1 = Math.floor((r.e - 1) / DAY);
      return d0 === d1 ? `${dayOf(r.s)}, de ${hhmm(r.s)} à ${hhmm(r.e, true)} : ${name}` : `du ${dayOf(r.s)} ${hhmm(r.s)} au ${dayOf(r.e - 1)} ${hhmm(r.e, true)} : ${name}`;
    }

    function render() {
      const mon = weekMonday(state.week),
        st = cur(),
        live = drag?.result || null,
        // forme en cours de geste (tracé, déplacement, poignée) : elle-même, aimantée, horaires dedans
        isLive = (r, layer) => !!live && live[3] === layer && r.cat === live[2] && (layer === 'bg' ? r.s < live[1] && r.e > live[0] : r
          .s <= live[0] && r.e >= live[1]),
        vis = visibleBg(st);
      host.querySelector('[data-title]').textContent = `Semaine ${state.week.slice(6)} — du ${new Date(mon).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' })} au ${new Date(mon + 6 * 864e5).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })} (UTC)`;
      let html = `<span></span><div class="dt-axis">${Array.from({ length: 25 }, (_, h) => h % 2 ? '' : `<span style="left:${h / 24 * 100}%">${pad(h)}</span>`).join('')}</div>`;
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
            lv = isLive(r, 'bg');
          return `<div class="dt-bg${lv ? ' live' : ''}" data-s="${r.s}" data-e="${r.e}" data-cat="${esc(r.cat)}" style="${seg(r)};background:${esc(c.color)}">${lv ? `<span class="dt-lt">${esc(`${c.label} ${hhmm(r.s)}–${hhmm(r.e, true)}`)}</span>` : ''}</div>`;
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
          return `<div class="dt-fg${r === state.sel ? ' sel' : ''}${lv ? ' live' : ''}" data-f="${st.fg.indexOf(r)}" style="${seg(r)};background:${esc(c.color)};color:${ink(c.color)}"><span data-t>${first ? esc(hhmm(r.s)) : ''}</span><b>${esc(c.letter || '')}</b><span data-t>${last ? esc(hhmm(r.e, true)) : ''}</span>${first ? '<i class="dt-h l" data-h="l"></i>' : ''}${last ? '<i class="dt-h r" data-h="r"></i>' : ''}<button type="button" class="dt-x" data-x title="Effacer">✕</button></div>`;
        }).join('');
        html += `<div class="dt-day">${DAYS[d]}<small>${new Date(mon + d * 864e5).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })}</small></div><div class="dt-row" data-d="${d}">${bg}${fg}</div>`;
      }
      grid.innerHTML = html;
      // horaires aux bords si la largeur le permet (toujours pendant le geste), sinon le type seul
      grid.querySelectorAll('.dt-fg').forEach(el => {
        const narrow = !el.classList.contains('live') && el.clientWidth < 96;
        el.classList.toggle('narrow', narrow);
        el.querySelectorAll('[data-t]').forEach(t => t.hidden = narrow);
      });
    }
    const commit = st => {
      state.bg = st.bg;
      state.fg = st.fg;
      preview = null;
      render();
      emit();
    };
    /** Jour (0–6) de la rangée sous le pointeur, borné à la semaine (au-dessus : lundi, en dessous : dimanche). */
    const dayAt = y => {
      const rows = [...grid.querySelectorAll('.dt-row')];
      if (!rows.length) return 0;
      for (const [i, r] of rows.entries()) {
        const b = r.getBoundingClientRect();
        if (y < b.bottom + 2) return i;
      }
      return rows.length - 1;
    };
    /** Minute de la semaine sous le pointeur, dans la rangée du jour d (bornée à 0–24 h de ce jour). */
    const minuteAt = (d, x) => {
      const b = grid.querySelector(`.dt-row[data-d="${d}"]`).getBoundingClientRect();
      return d * DAY + clamp((x - b.left) / b.width, 0, 1) * DAY;
    };
    /** Dispo retrouvée après une mise à jour (même catégorie qui contient la minute m). */
    const findFg = (cat, m) => state.fg.find(r => r.cat === cat && r.s <= m && r.e > m) || null;
    /** Pose une plage avec un pinceau (fond, effacement du fond ou dispo) dans les couches st. */
    const applyBrush = (st, s, e, id) => id === ERASE ? applyBg(st, s, e, '') : isBg(id) ? applyBg(st, s, e, id) : applyFg(st, s, e,
      id);

    grid.addEventListener('pointerdown', e => {
      const row = e.target.closest('.dt-row');
      if (!row || e.button > 0) return;
      if (e.target.closest('[data-x]')) return; // croix : clic
      hover.hidden = true;
      const fgEl = e.target.closest('.dt-fg'),
        r = fgEl ? state.fg[+fgEl.dataset.f] : null,
        handle = e.target.closest('[data-h]')?.dataset.h,
        d = +row.dataset.d,
        m = minuteAt(d, e.clientX);
      e.preventDefault();
      if (r && handle) drag = {
        mode: 'resize',
        r,
        side: handle,
        d,
        press: true
      };
      else if (r) drag = {
        mode: isBg(state.brush) ? 'draw' : 'move',
        r,
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
    window.addEventListener('pointermove', e => {
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
        const id = state.brush,
          bgBrush = isBg(id),
          // fond : d'une rangée à l'autre (plusieurs jours) ; dispo : dans la rangée de départ
          d1 = bgBrush ? dayAt(e.clientY) : drag.d,
          m = minuteAt(d1, e.clientX);
        let s = snap(Math.min(drag.m0, m), SNAP_DRAW),
          en = snap(Math.max(drag.m0, m), SNAP_DRAW);
        if (en <= s) en = s + SNAP_DRAW;
        const lo = bgBrush ? 0 : drag.d * DAY,
          hi = bgBrush ? WEEK : drag.d * DAY + DAY;
        s = clamp(s, lo, hi - SNAP_DRAW);
        en = clamp(en, s + SNAP_DRAW, hi);
        drag.result = [s, en, id === ERASE ? '' : id, bgBrush ? 'bg' : 'fg'];
        preview = applyBrush(state, s, en, id);
      } else if (drag.mode === 'move') {
        const len = drag.r.e - drag.r.s,
          m = minuteAt(drag.d, e.clientX),
          s = clamp(snap(drag.r.s + (m - drag.m0), SNAP_EDIT), 0, WEEK - len);
        drag.result = [s, s + len, drag.r.cat, 'fg'];
        preview = applyFg({
          bg: state.bg,
          fg: state.fg.filter(x => x !== drag.r)
        }, s, s + len, drag.r.cat);
      } else if (drag.mode === 'resize') {
        const m = minuteAt(drag.d, e.clientX);
        let {
          s,
          e: en
        } = drag.r;
        if (drag.side === 'l') s = clamp(snap(m, SNAP_EDIT), 0, en - SNAP_EDIT);
        else en = clamp(snap(m, SNAP_EDIT), s + SNAP_EDIT, WEEK);
        drag.result = [s, en, drag.r.cat, 'fg'];
        preview = applyFg({
          bg: state.bg,
          fg: state.fg.filter(x => x !== drag.r)
        }, s, en, drag.r.cat);
      }
      render();
    });
    const end = e => {
      if (palDrag) return palEnd(e);
      if (!drag) return;
      clearTimeout(drag.long);
      const d = drag;
      drag = null;
      if (d.result && preview) {
        const [s, , cat, layer] = d.result;
        commit(preview);
        state.sel = layer === 'fg' && d.mode !== 'draw' ? findFg(cat, s) : null;
        render();
        return;
      }
      preview = null;
      // clic sans glisser : sélection d'une dispo, sinon désélection ; redessin seulement si elle change (un redessin
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
      const r = state.fg[+x.closest('.dt-fg').dataset.f];
      if (state.sel === r) state.sel = null;
      hover.hidden = true;
      commit({
        bg: state.bg,
        fg: state.fg.filter(y => y !== r)
      });
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
      const el = document.elementFromPoint(e.clientX, e.clientY),
        row = el?.closest?.('.dt-row');
      grid.querySelectorAll('.dt-row.drop').forEach(x => x !== row && x.classList.remove('drop'));
      if (row && !row.classList.contains('drop')) row.classList.add('drop');
    }
    /** Lâcher d'une entrée de la palette sur un jour : la journée entière, fond ou dispo. */
    function palEnd(e) {
      const p = palDrag;
      palDrag = null;
      grid.querySelectorAll('.dt-row.drop').forEach(x => x.classList.remove('drop'));
      if (!p.moved) return;
      p.el.dataset.dragged = '1'; // le clic qui suit ne change pas de pinceau
      setTimeout(() => delete p.el.dataset.dragged, 0);
      const row = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.dt-row');
      if (!row) return;
      const day = +row.dataset.d * DAY;
      commit(applyBrush(state, day, day + DAY, p.id));
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
        'Dates : « du » puis « au », dans cet ordre.');
      if (!days.size) return void(msg.textContent = 'Cocher au moins un jour.');
      if ((s0 == null) !== (e0 == null)) return void(msg.textContent = 'Horaires : les deux, ou aucun (journée entière).');
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
      msg.textContent = `${spans.length} jour(s) posé(s)${other ? `, dont ${other} autre(s) semaine(s)` : ''}${lost ? ` — ${lost} semaine(s) non enregistrée(s) (stockage absent)` : ''}.`;
    });
    // clavier : dispo sélectionnée
    const onKey = e => {
      const r = state.sel;
      if (!r || !host.isConnected || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) return;
      if (e.key === 'Escape') {
        state.sel = null;
        render();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        state.sel = null;
        commit({
          bg: state.bg,
          fg: state.fg.filter(x => x !== r)
        });
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const len = r.e - r.s,
          s = clamp(r.s + (e.key === 'ArrowLeft' ? -SNAP_EDIT : SNAP_EDIT), 0, WEEK - len);
        commit(applyFg({
          bg: state.bg,
          fg: state.fg.filter(x => x !== r)
        }, s, s + len, r.cat));
        state.sel = findFg(r.cat, s);
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
        host.dispatchEvent(new CustomEvent('dispos-timeline-week', {
          detail: {
            week: w
          }
        }));
        render();
        return w;
      },
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
    fromSchema2,
    toSchema2,
    weekId,
    weekMonday,
    addWeek,
    // fonctions du modèle, pour les essais
    _model: {
      paint,
      cut,
      tidy,
      applyBg,
      applyFg,
      fromData,
      toData,
      visibleBg
    }
  };
})();
