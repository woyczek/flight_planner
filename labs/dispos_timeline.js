(() => {
  'use strict';
  // Maquette (hors suite) : saisie des disponibilités sur un axe de temps continu, une rangée par jour de la semaine.
  //   · couche de FOND (non-disponibilités : indisponible, congés, récupération, activité réelle) : bandes pleine
  //     hauteur, couleur seule, aimantées à la demi-heure ; double-clic sur une bande : remplit les trous du jour de sa
  //     catégorie (ailleurs dans la rangée : avec le pinceau de fond) ; double-clic sur l'entrée de la palette : les trous
  //     de la semaine ; pendant un geste, la forme elle-même (aimantée, horaires dedans), sans infobulle flottante ;
  //   · couche de PREMIER PLAN (disponible, exercice, occupé) : rectangles à cliquer-glisser, aimantés à la demi-heure,
  //     une lettre et les horaires ; poignées et déplacement au pas de 5 min ; clic : sélection (Suppr, ← →, Échap),
  //     croix au survol ; appui long au doigt : sélection ;
  //   · la dernière forme posée gagne : elle découpe ce qu'elle recouvre, dans les deux couches ; une minute a au plus
  //     une catégorie ; les morceaux de moins de 5 min disparaissent.
  // Modèle du composant (schema 3) : { schema: 3, pilot, week: "AAAA-Wnn", tz: "UTC", ranges: [{ start, end, cat }] },
  // dates « AAAA-MM-JJTHH:MM » (fin exclue), une plage de fond peut couvrir plusieurs jours. Catégories : configuration
  // séparée { categories: [{ id, label, letter, color, layer: "background" | "foreground", group, legacy }] }.
  // Lecteurs / écrivains : schema 2 de la suite (une déclaration par semaine, plages par jour au quart d'heure) ↔ schema 3.
  // API (window.DisposTimeline) : mount(hôte, { config, week, data, onChange(data) }) → { set(data), get(), week(w),
  //   brush(id) } ; DEFAULT_CONFIG ; fromSchema2(doc, config), toSchema2(data, config, base) ; weekId(date), weekMonday(id).
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

  // ---- modèle : plages { s, e, cat } en minutes de la semaine, triées, sans chevauchement
  /** Retire [s, e[ de toutes les plages (découpe en deux une plage qui le contient). */
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
  /** Range : tri, fusion des plages contiguës de même catégorie, morceaux de moins de 5 min retirés. */
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
  /** Pose une forme : la dernière gagne (elle découpe ce qu'elle recouvre, dans les deux couches). */
  const paint = (list, s, e, cat) => tidy([...cut(list, s, e), {
    s,
    e,
    cat
  }]);
  /** Remplit les trous de [from, to[ avec la catégorie cat. */
  function fillGaps(list, from, to, cat) {
    const gaps = [];
    let at = from;
    for (const r of [...list].sort((a, b) => a.s - b.s)) {
      if (r.e <= from || r.s >= to) continue;
      if (r.s > at) gaps.push([at, r.s]);
      at = Math.max(at, r.e);
    }
    if (at < to) gaps.push([at, to]);
    return tidy([...list, ...gaps.map(([s, e]) => ({
      s,
      e,
      cat
    }))]);
  }

  // ---- formats
  /** Modèle interne → JSON du composant (schema 3). */
  function toData(state) {
    const mon = weekMonday(state.week);
    return {
      schema: 3,
      pilot: state.pilot || '',
      week: state.week,
      tz: 'UTC',
      ranges: state.ranges.map(r => ({
        start: toIso(mon, r.s),
        end: toIso(mon, r.e),
        cat: r.cat
      }))
    };
  }
  /** JSON du composant (schema 3) → plages internes de la semaine (catégories inconnues gardées). */
  function fromData(data, week) {
    const mon = weekMonday(week);
    return tidy((data?.ranges || []).map(r => ({
      s: fromIso(mon, r.start),
      e: fromIso(mon, r.end),
      cat: String(r.cat)
    })).filter(r => r.e > r.s));
  }
  /** Déclaration de la suite (schema 2 : { semaine, pilote, dispos: { "AAAA-MM-JJ": [{ debut, fin, categorie }] } },
   *  heures UTC au quart d'heure, null : journée entière) → schema 3. Les plages superposées du schema 2 (permises
   *  là-bas) ne le sont plus : le fond est posé d'abord, le premier plan par-dessus (une journée de congés garde le vol
   *  posé ce jour-là) ; dans une même couche, la dernière gagne. Catégorie inconnue : son identifiant tel quel. */
  function fromSchema2(doc, config = DEFAULT_CONFIG) {
    const week = doc?.semaine || weekId(Date.now()),
      mon = weekMonday(week),
      byLegacy = new Map((config.categories || []).map(c => [c.legacy || c.id, c.id])),
      layer = id => (config.categories || []).find(c => c.id === id)?.layer === 'background' ? 0 : 1;
    let list = [];
    for (const [day, items] of Object.entries(doc?.dispos || {})) {
      const base = Math.round((Date.parse(`${day}T00:00:00Z`) - mon) / 6e4);
      if (base < 0 || base >= WEEK) continue;
      const sorted = (items || []).map((it, i) => [layer(byLegacy.get(it.categorie) || it.categorie), i, it]).sort((a, b) => a[0] -
        b[0] || a[1] - b[1]).map(x => x[2]);
      for (const it of sorted) {
        const m = v => v ? +v.slice(0, 2) * 60 + +v.slice(3, 5) : null,
          s = base + (m(it.debut) ?? 0),
          e = base + (it.fin ? m(it.fin) : DAY);
        if (e > s) list = paint(list, s, e, byLegacy.get(it.categorie) || it.categorie);
      }
    }
    return toData({
      week,
      pilot: doc?.pilote || '',
      ranges: list
    });
  }
  /** Schema 3 → déclaration de la suite (schema 2), par jour, horaires arrondis au quart d'heure ; base : document
   *  schema 2 dont les autres champs (appareils, simulateurs…) sont gardés. */
  function toSchema2(data, config = DEFAULT_CONFIG, base = {}) {
    const week = data.week,
      mon = weekMonday(week),
      legacy = new Map((config.categories || []).map(c => [c.id, c.legacy || c.id])),
      dispos = {},
      q = m => Math.round(m / 15) * 15;
    for (const r of fromData(data, week)) {
      for (let d = Math.floor(r.s / DAY); d * DAY < r.e; d++) {
        const s = q(Math.max(r.s, d * DAY) - d * DAY),
          e = q(Math.min(r.e, (d + 1) * DAY) - d * DAY);
        if (e <= s) continue;
        const day = isoDay(mon + d * 864e5);
        (dispos[day] ||= []).push(s === 0 && e === DAY ? {
          debut: null,
          fin: null,
          categorie: legacy.get(r.cat) || r.cat
        } : {
          debut: `${pad(Math.floor(s / 60))}:${pad(s % 60)}`,
          fin: `${pad(Math.floor(e / 60))}:${pad(e % 60)}`,
          categorie: legacy.get(r.cat) || r.cat
        });
      }
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

  function css() {
    if (document.getElementById('disposTimelineCss')) return;
    const st = document.createElement('style');
    st.id = 'disposTimelineCss';
    st.textContent = `.dt{display:grid;gap:10px;font:14px/1.4 system-ui,sans-serif;user-select:none;-webkit-user-select:none}
.dt-nav{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.dt-nav b{min-width:15em}
.dt-pal{display:grid;grid-template-columns:max-content 1fr;gap:6px 10px;align-items:center}
.dt-pal-g{font-size:12px;opacity:.75;text-align:right}.dt-pal-r{display:flex;flex-wrap:wrap;gap:4px}
.dt-brush{display:inline-flex;align-items:center;gap:6px;border:1px solid #0003;border-radius:6px;background:#fff;color:#111;padding:3px 8px;cursor:pointer;font:inherit;font-size:12.5px}
.dt-brush i{display:inline-block;min-width:18px;height:18px;border-radius:3px;font:700 11px/18px system-ui;text-align:center;font-style:normal}
.dt-brush[aria-pressed=true]{outline:2px solid #1d6fd8;outline-offset:1px}
.dt-grid{display:grid;grid-template-columns:7.5em 1fr;gap:4px 8px}
.dt-day{font-size:12.5px;line-height:1.2;align-self:center}.dt-day small{display:block;opacity:.7}
.dt-axis{position:relative;height:18px;font-size:10.5px;opacity:.7}.dt-axis span{position:absolute;transform:translateX(-50%)}
.dt-row{position:relative;height:44px;border:1px solid #0002;border-radius:4px;touch-action:none;cursor:crosshair;
background:repeating-linear-gradient(90deg,#0000 0,#0000 calc(100%/48 - 1px),#00000010 calc(100%/48 - 1px),#00000010 calc(100%/48)),
repeating-linear-gradient(90deg,#0000 0,#0000 calc(100%/24 - 1px),#00000030 calc(100%/24 - 1px),#00000030 calc(100%/24)),#fafafa}
.dt-bg{position:absolute;top:0;bottom:0;opacity:.85}
.dt-fg{position:absolute;top:7px;bottom:7px;border-radius:4px;box-shadow:0 1px 2px #0005;display:flex;align-items:center;gap:6px;
padding:0 8px;overflow:hidden;white-space:nowrap;font-size:12px;cursor:grab;box-sizing:border-box}
.dt-fg b{font-size:13px}.dt-fg.sel{outline:2px solid #1d6fd8;outline-offset:1px;z-index:2}
.dt-h{position:absolute;top:0;bottom:0;width:8px;cursor:ew-resize;display:none;background:#fff8;border:1px solid #0006;box-sizing:border-box}
.dt-h.l{left:0;border-radius:4px 0 0 4px}.dt-h.r{right:0;border-radius:0 4px 4px 0}
.dt-fg:hover .dt-h,.dt-fg.sel .dt-h{display:block}
.dt-x{position:absolute;top:-1px;right:10px;display:none;border:0;background:#0008;color:#fff;border-radius:3px;font:11px/14px system-ui;padding:0 4px;cursor:pointer}
.dt-fg:hover .dt-x{display:block}
.dt-fg.live{z-index:3;box-shadow:0 0 0 2px #1d6fd8,0 2px 6px #0006}.dt-bg.live{opacity:1;box-shadow:inset 0 0 0 2px #1d6fd8}
.dt-bg .dt-lt{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font:600 11.5px/1 system-ui;color:#111;background:#fffc;padding:2px 5px;border-radius:3px;white-space:nowrap}
.dt-help{font-size:12px;opacity:.75;margin:0}`;
    document.head.append(st);
  }

  /** Monte le composant dans host. opts : { config, week, data (schema 3), onChange(data) }. */
  function mount(host, {
    config = DEFAULT_CONFIG,
    week = weekId(Date.now()),
    data = null,
    onChange = null
  } = {}) {
    css();
    const cats = new Map(config.categories.map(c => [c.id, c]));
    const state = {
      week,
      pilot: data?.pilot || '',
      ranges: data ? fromData(data, week) : [],
      brush: config.categories.find(c => c.layer === 'foreground')?.id || config.categories[0]?.id,
      sel: null // plage sélectionnée (objet de state.ranges)
    };
    let preview = null, // plages affichées pendant un glisser (null : state.ranges)
      drag = null;
    host.innerHTML = `<div class="dt"><div class="dt-nav"><button type="button" data-w="-1">‹</button><button type="button" data-w="0">cette semaine</button><button type="button" data-w="1">›</button> <b data-title></b></div>
      <div class="dt-pal" data-pal></div>
      <div class="dt-grid" data-grid></div>
      <p class="dt-help">Fond (couleur seule) : glisser pour poser une bande ; double-clic sur une bande : remplit les trous du jour avec sa catégorie (ailleurs dans la rangée : avec le pinceau de fond) ; double-clic sur l'entrée de la palette : ceux de la semaine. Premier plan : glisser pour poser un rectangle ; bords et corps se glissent au pas de 5 min ; clic : sélection (Suppr, ← →, Échap) ; appui long au doigt : sélection. La dernière forme posée découpe ce qu'elle recouvre.</p></div>`;
    const grid = host.querySelector('[data-grid]');
    const label = c => c ? c.label : '?';
    const emit = () => onChange?.(toData(state));

    function renderPalette() {
      host.querySelector('[data-pal]').innerHTML = config.groups.map(g => {
        const list = config.categories.filter(c => c.group === g.id);
        return list.length ? `<span class="dt-pal-g">${esc(g.label)}</span><span class="dt-pal-r">${list.map(c => `<button type="button" class="dt-brush" data-brush="${esc(c.id)}" aria-pressed="${c.id === state.brush}" title="${esc(c.layer === 'background' ? `${c.label} — double-clic : remplit les trous de la semaine` : c.label)}"><i style="background:${esc(c.color)};color:${ink(c.color)}">${esc(c.letter || '')}</i>${esc(c.label)}</button>`).join('')}</span>` : '';
      }).join('');
    }

    function render() {
      const mon = weekMonday(state.week),
        list = preview || state.ranges,
        live = drag?.result || null,
        // forme en cours de geste (tracé, déplacement, poignée) : elle-même, aimantée, horaires dedans
        isLive = r => !!live && r.cat === live[2] && r.s <= live[0] && r.e >= live[1];
      host.querySelector('[data-title]').textContent = `Semaine ${state.week.slice(6)} — du ${new Date(mon).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' })} au ${new Date(mon + 6 * 864e5).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })} (UTC)`;
      let html = `<span></span><div class="dt-axis">${Array.from({ length: 25 }, (_, h) => h % 2 ? '' : `<span style="left:${h / 24 * 100}%">${pad(h)}</span>`).join('')}</div>`;
      for (let d = 0; d < 7; d++) {
        const from = d * DAY,
          to = from + DAY,
          segs = list.filter(r => r.e > from && r.s < to).map(r => {
            const c = cats.get(r.cat) || {
                label: r.cat,
                color: '#999',
                layer: 'foreground',
                letter: r.cat
              },
              s = Math.max(r.s, from) - from,
              e = Math.min(r.e, to) - from,
              pos = `left:${s / DAY * 100}%;width:${(e - s) / DAY * 100}%`,
              span = r.e - r.s > DAY || Math.floor(r.s / DAY) !== Math.floor((r.e - 1) / DAY) ? `${isoDay(mon + Math.floor(r.s / DAY) * 864e5).slice(5)} ${hhmm(r.s)} → ${isoDay(mon + Math.floor((r.e - 1) / DAY) * 864e5).slice(5)} ${hhmm(r.e, true)}` : `${hhmm(r.s)}–${hhmm(r.e, true)}`,
              idx = state.ranges.indexOf(r);
            if (c.layer === 'background') return `<div class="dt-bg${isLive(r) ? ' live' : ''}" data-cat="${esc(r.cat)}" style="${pos};background:${esc(c.color)}" title="${esc(`${c.label} ${span}`)}">${isLive(r) ? `<span class="dt-lt">${esc(`${c.label} ${span}`)}</span>` : ''}</div>`;
            return `<div class="dt-fg${r === state.sel ? ' sel' : ''}${isLive(r) ? ' live' : ''}" data-r="${idx}" style="${pos};background:${esc(c.color)};color:${ink(c.color)}" title="${esc(`${c.label}${c.letter ? ` (${c.letter})` : ''} ${span}`)}"><b>${esc(c.letter || '')}</b><span data-t>${esc(span)}</span><i class="dt-h l" data-h="l"></i><i class="dt-h r" data-h="r"></i><button type="button" class="dt-x" data-x title="Effacer">✕</button></div>`;
          }).join('');
        html += `<div class="dt-day">${DAYS[d]}<small>${new Date(mon + d * 864e5).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })}</small></div><div class="dt-row" data-d="${d}">${segs}</div>`;
      }
      grid.innerHTML = html;
      // horaires montrés si la largeur le permet, sinon la lettre seule (horaires en infobulle)
      // (pendant le geste : toujours, la forme montre ses horaires en direct)
      grid.querySelectorAll('.dt-fg').forEach(el => {
        const t = el.querySelector('[data-t]');
        if (t) t.hidden = !el.classList.contains('live') && el.clientWidth < 84;
      });
    }
    const commit = list => {
      state.ranges = list;
      preview = null;
      render();
      emit();
    };
    /** Minute de la semaine sous le pointeur, dans la rangée du jour d (rangée relue : la grille est redessinée pendant
     *  un glisser). */
    const minuteAt = (d, x) => {
      const b = grid.querySelector(`.dt-row[data-d="${d}"]`).getBoundingClientRect();
      return d * DAY + clamp((x - b.left) / b.width, 0, 1) * DAY;
    };
    /** Plage rangée retrouvée après une mise à jour (même catégorie qui contient la minute m). */
    const find = (cat, m) => state.ranges.find(r => r.cat === cat && r.s <= m && r.e > m) || null;

    grid.addEventListener('pointerdown', e => {
      const row = e.target.closest('.dt-row');
      if (!row || e.button > 0) return;
      if (e.target.closest('[data-x]')) return; // croix : clic
      const fgEl = e.target.closest('.dt-fg'),
        r = fgEl ? state.ranges[+fgEl.dataset.r] : null,
        handle = e.target.closest('[data-h]')?.dataset.h,
        d = +row.dataset.d,
        m = minuteAt(d, e.clientX),
        brush = cats.get(state.brush);
      e.preventDefault();
      const day = d * DAY,
        pid = e.pointerId;
      if (r && handle) drag = {
        mode: 'resize',
        r,
        side: handle,
        d,
        day,
        press: true
      };
      else if (r) drag = {
        mode: brush?.layer === 'foreground' || !brush ? 'move' : 'draw',
        r,
        d,
        day,
        m0: m,
        x0: e.clientX,
        press: true
      };
      else drag = {
        mode: 'draw',
        d,
        day,
        m0: m,
        x0: e.clientX
      };
      drag.moved = false;
      drag.pid = pid;
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
      if (!drag) return;
      if (!drag.moved && Math.abs(e.clientX - (drag.x0 ?? e.clientX)) > 3) {
        drag.moved = true;
        try {
          grid.setPointerCapture(drag.pid); // la position reste bornée à 0–24 h de la rangée de départ
        } catch {
          /* pointeur déjà relâché */
        }
      }
      if (!drag.moved && drag.mode !== 'resize') return;
      clearTimeout(drag.long);
      const m = minuteAt(drag.d, e.clientX),
        {
          day
        } = drag;
      if (drag.mode === 'draw') {
        const cat = state.brush;
        let s = snap(Math.min(drag.m0, m), SNAP_DRAW),
          en = snap(Math.max(drag.m0, m), SNAP_DRAW);
        if (en <= s) en = s + SNAP_DRAW;
        s = clamp(s, day, day + DAY);
        en = clamp(en, day, day + DAY);
        drag.result = [s, en, cat];
        preview = paint(state.ranges, s, en, cat);
      } else if (drag.mode === 'move') {
        const len = drag.r.e - drag.r.s;
        const s = clamp(snap(drag.r.s + (m - drag.m0), SNAP_EDIT), day, day + DAY - len);
        drag.result = [s, s + len, drag.r.cat];
        preview = paint(state.ranges.filter(x => x !== drag.r), s, s + len, drag.r.cat);
      } else if (drag.mode === 'resize') {
        let {
          s,
          e: en
        } = drag.r;
        if (drag.side === 'l') s = clamp(snap(m, SNAP_EDIT), day, en - SNAP_EDIT);
        else en = clamp(snap(m, SNAP_EDIT), s + SNAP_EDIT, day + DAY);
        drag.result = [s, en, drag.r.cat];
        preview = paint(state.ranges.filter(x => x !== drag.r), s, en, drag.r.cat);
      }
      render();
    });
    const end = () => {
      if (!drag) return;
      clearTimeout(drag.long);
      const d = drag;
      drag = null;
      if (d.result) {
        const [s, e, cat] = d.result;
        commit(preview);
        state.sel = d.mode === 'draw' ? null : find(cat, s);
        render();
        return;
      }
      preview = null;
      // clic sans glisser : sélection d'un rectangle, sinon désélection ; redessin seulement si elle change (un
      // redessin entre les deux clics ferait manquer le double-clic)
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
    grid.addEventListener('click', e => {
      const x = e.target.closest('[data-x]');
      if (!x) return;
      const r = state.ranges[+x.closest('.dt-fg').dataset.r];
      if (state.sel === r) state.sel = null;
      commit(state.ranges.filter(y => y !== r));
    });
    // double-clic avec un pinceau de fond sur une rangée : trous du jour remplis
    grid.addEventListener('dblclick', e => {
      // élément sous le pointeur (la cible d'un événement peut être la grille après une capture du pointeur)
      const at = document.elementFromPoint(e.clientX, e.clientY),
        row = at?.closest?.('.dt-row'),
        band = at?.closest?.('.dt-bg'),
        brush = cats.get(state.brush),
        cat = band ? band.dataset.cat : brush?.layer === 'background' ? brush.id : '';
      if (!row || !cat || at.closest('.dt-fg')) return;
      const day = +row.dataset.d * DAY;
      commit(fillGaps(state.ranges, day, day + DAY, cat));
    });
    host.querySelector('[data-pal]').addEventListener('click', e => {
      const b = e.target.closest('[data-brush]');
      if (!b) return;
      state.brush = b.dataset.brush;
      // état des boutons seulement : redessiner la palette entre les deux clics ferait manquer le double-clic
      host.querySelectorAll('[data-brush]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.brush === state.brush)));
    });
    // double-clic sur une entrée de fond de la palette : trous de la semaine remplis
    host.querySelector('[data-pal]').addEventListener('dblclick', e => {
      const c = cats.get(e.target.closest('[data-brush]')?.dataset.brush);
      if (c?.layer === 'background') commit(fillGaps(state.ranges, 0, WEEK, c.id));
    });
    host.querySelector('.dt-nav').addEventListener('click', e => {
      const b = e.target.closest('[data-w]');
      if (!b) return;
      api.week(+b.dataset.w ? addWeek(state.week, +b.dataset.w) : weekId(Date.now()));
    });
    // clavier : rectangle sélectionné
    const onKey = e => {
      const r = state.sel;
      if (!r || !host.isConnected || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) return;
      if (e.key === 'Escape') {
        state.sel = null;
        render();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        state.sel = null;
        commit(state.ranges.filter(x => x !== r));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const day = Math.floor(r.s / DAY) * DAY,
          len = r.e - r.s,
          s = clamp(r.s + (e.key === 'ArrowLeft' ? -SNAP_EDIT : SNAP_EDIT), day, day + DAY - len);
        commit(paint(state.ranges.filter(x => x !== r), s, s + len, r.cat));
        state.sel = find(r.cat, s);
        render();
      }
    };
    document.addEventListener('keydown', onKey);
    const api = {
      /** Remplace les données (schema 3) de la semaine affichée. */
      set(d) {
        state.pilot = d?.pilot || state.pilot;
        if (d?.week) state.week = d.week;
        state.ranges = fromData(d, state.week);
        state.sel = null;
        render();
      },
      /** Données de la semaine affichée (schema 3). */
      get: () => toData(state),
      /** Change de semaine (sans argument : rend la semaine affichée) ; onChange n'est pas appelé, la page charge la
       *  semaine voulue par set. */
      week(w) {
        if (!w) return state.week;
        state.week = w;
        state.ranges = [];
        state.sel = null;
        host.dispatchEvent(new CustomEvent('dispos-timeline-week', {
          detail: {
            week: w
          }
        }));
        render();
        return w;
      },
      /** Pinceau actif (identifiant de catégorie). */
      brush(id) {
        if (cats.has(id)) state.brush = id;
        renderPalette();
        return state.brush;
      }
    };
    renderPalette();
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
      fillGaps
    }
  };
})();
