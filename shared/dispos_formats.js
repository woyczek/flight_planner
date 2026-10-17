(() => {
  'use strict';
  // Lecteurs / écrivains de formats pour shared/dispos_timeline.js (à charger APRÈS lui) : un format est un objet
  // { read(json, opts) → données schema 3, write(données schema 3, opts) → json } ; opts : { config (catégories du
  // composant ; défaut : DisposTimeline.DEFAULT_CONFIG), base (écriture : document existant dont les autres champs sont
  // gardés) }. Fournis : « schema3 » (format natif du composant, contrôlé et normalisé) et « schema2 » (déclaration de la
  // suite SOG : une semaine, plages par jour au quart d'heure). Le format définitif des dispos et des pilotes n'est pas
  // arrêté : register(nom, format) en ajoute un sans toucher au composant.
  // API (window.DisposFormats) : read(nom, json, opts), write(nom, données, opts), register(nom, { read, write }),
  //   get(nom), names().
  if (window.DisposFormats) return;
  const T = window.DisposTimeline;
  if (!T?.model) throw new Error('dispos_formats.js: load dispos_timeline.js first');
  const {
    DAY,
    WEEK,
    applyBg,
    applyFg,
    visibleBg,
    fromData,
    toData,
    isoDay
  } = T.model;
  const pad = n => String(n).padStart(2, '0');
  const cfg = opts => opts?.config || T.DEFAULT_CONFIG;
  const formats = new Map();

  /** Schema 3 (natif) : relu par le modèle du composant, donc normalisé (plages triées, sans chevauchement, morceaux de
   *  moins de 5 min retirés, background gardé). */
  const schema3 = {
    read(json, opts) {
      const week = json?.week || T.weekId(Date.now());
      return toData({
        week,
        pilot: json?.pilot || '',
        ...fromData(json, week, cfg(opts))
      });
    },
    write(data, opts) {
      return schema3.read(data, opts);
    }
  };

  /** Schema 2 de la suite ({ semaine, pilote, dispos: { "AAAA-MM-JJ": [{ debut, fin, categorie }] } }, heures UTC au
   *  quart d'heure, null : journée entière) → schema 3, sans perte : le fond va dans la couche de fond, le reste dans
   *  les dispos ; dans une même couche, des plages superposées (permises dans le schema 2) : la dernière gagne.
   *  Catégorie : par son code legacy, sinon son identifiant tel quel. */
  function read2(doc, opts) {
    const config = cfg(opts),
      week = doc?.semaine || T.weekId(Date.now()),
      mon = T.weekMonday(week),
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
  /** Schema 3 → schema 2, par jour, horaires arrondis au quart d'heure, sans chevauchement (dispos, puis fond visible) ;
   *  un jour sans rien : indisponible toute la journée (première catégorie de fond) ; temps sans rien dans un jour
   *  entamé : pas d'entrée (indisponible par défaut) ; opts.base : document schema 2 dont les autres champs
   *  (appareils, simulateurs…) sont gardés. */
  function write2(data, opts) {
    const config = cfg(opts),
      base = opts?.base || {},
      week = data.week,
      mon = T.weekMonday(week),
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

  /** Ajoute (ou remplace) un format : { read(json, opts) → schema 3, write(schema 3, opts) → json }. */
  function register(name, fmt) {
    if (typeof fmt?.read !== 'function' || typeof fmt?.write !== 'function') throw new Error(`dispos format "${name}": read and write are required`);
    formats.set(String(name), fmt);
    return fmt;
  }
  const get = name => {
    const f = formats.get(String(name));
    if (!f) throw new Error(`dispos format "${name}" unknown (known: ${[...formats.keys()].join(', ')})`);
    return f;
  };
  register('schema3', schema3);
  register('schema2', {
    read: read2,
    write: write2
  });

  window.DisposFormats = {
    register,
    get,
    names: () => [...formats.keys()],
    /** json → schema 3, par le format nommé. */
    read: (name, json, opts) => get(name).read(json, opts),
    /** schema 3 → json, par le format nommé. */
    write: (name, data, opts) => get(name).write(data, opts)
  };
})();
