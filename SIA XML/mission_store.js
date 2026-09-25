(() => {
  'use strict';
  // Mission partagée entre le générateur de mission et le studio cartographique : un seul document
  // { yaml, narrative, sourceNames, rev, at, by } dans le navigateur, avec numéro de révision et
  // notification des autres pages ouvertes (BroadcastChannel + événement storage). Lecture des
  // missions Markdown / YAML (schéma helo-xp-mission) commune aux deux pages.
  const KEY = 'siaMissionShared:v1',
    LEGACY = 'missionGeneratorDraft';
  /** Clé de texte : minuscules sans accents, mots séparés par « _ ». */
  const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  /** Copie profonde (JSON). */
  const deepClone = v => JSON.parse(JSON.stringify(v));

  // ---- lecture Markdown (titres « ## Summary », ancien format à blocs TYPE: / TURNING POINTS: …)
  function parseMarkdown(text) {
    const headings = [...text.matchAll(/^(#{1,6})\s+(.+)\s*$/gm)],
      title = (headings[0]?.[2] || '').trim(),
      sections = [];
    for (let i = 1; i < headings.length; i++) {
      const start = headings[i].index + headings[i][0].length,
        end = headings[i + 1]?.index ?? text.length;
      sections.push({
        title: headings[i][2].trim(),
        content: text.slice(start, end).trim()
      })
    }
    /** Section Markdown dont le titre contient l'un des mots. */
    const find = words => sections.find(s => words.some(w => norm(s.title).includes(w))),
      sum = find(['summary', 'resume', 'synthese']),
      det = find(['description_detaillee', 'description_complete', 'deroulement']);
    return {
      title,
      summary: sum?.content || '',
      detailed: det?.content || '',
      sections: sections.filter(s => s !== sum && s !== det)
    }
  }

  /** Valeur d'une ligne « LIBELLÉ: valeur » de l'ancien format Markdown. */
  function legacyValue(text, label) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      m = text.match(new RegExp('^(?:\\*\\*)?' + escaped + '(?:\\*\\*)?\\s*:\\s*(?:\\r?\\n\\s*)?([^\\r\\n]+)', 'mi'));
    return m ? m[1].trim() : ''
  }

  /** Premier nombre d'un texte (virgule décimale acceptée) ; null sinon. */
  function legacyNumber(value) {
    const m = String(value || '').replace(',', '.').match(/[-+]?\d+(?:\.\d+)?/);
    return m ? +m[0] : NaN
  }

  /** Texte d'un bloc de l'ancien format (de start au titre suivant). */
  function legacyBlock(text, start, endNames) {
    const ends = endNames.map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
      re = new RegExp('^' + start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:\\s*\\r?\\n([\\s\\S]*?)(?=^(?:' + ends + ')\\s*:\\s*$|(?![\\s\\S]))', 'mi'),
      m = text.match(re);
    return m ? m[1].trim() : ''
  }

  /** Points tournants de l'ancien format (nom, position). */
  function parseLegacyPoints(block) {
    const out = [];
    for (const m of block.matchAll(/^\s*-\s*([^|\n]+)\|\s*([^|\n]+)\|\s*(-?\d+(?:[.,]\d+)?)\s*\|\s*(-?\d+(?:[.,]\d+)?)(?:\s*\|\s*([^\n]+))?/gm)) out.push({
      id: m[1].trim(),
      name: m[2].trim(),
      lat: +m[3].replace(',', '.'),
      lon: +m[4].replace(',', '.'),
      description: (m[5] || '').trim()
    });
    return out
  }

  /** Métadonnées d'une mission Markdown (titre, type, appareils, terrains, points) au format YAML de la mission. */
  function extractMdMetadata(text, parsed) {
    const y = {
      title: parsed.title || 'Mission',
      mission: {}
    };
    const id = y.title.match(/\bMission\s+(\d+)/i);
    if (id) y.mission.id = y.mission.number = +id[1];
    for (const [key, aliases] of Object.entries({
        type: ['TYPE', 'Type'],
        subtype: ['SOUS-TYPE', 'Sous-type', 'Subtype'],
        series: ['SÉRIE', 'SERIE', 'Série', 'Serie']
      })) {
      for (const a of aliases) {
        const value = legacyValue(text, a);
        if (value) {
          y.mission[key] = value;
          break
        }
      }
    }
    const targetBlock = legacyBlock(text, 'TARGET', ['TURNING POINTS', 'POINTS TOURNANTS', 'RDV', 'ZONE', 'MAPS TO PRODUCE', 'MAPS', 'NOTES']),
      target = {
        id: 'TARGET',
        name: legacyValue(targetBlock, 'NAME') || legacyValue(targetBlock, 'NOM') || 'Cible',
        lat: legacyNumber(legacyValue(targetBlock, 'LAT')),
        lon: legacyNumber(legacyValue(targetBlock, 'LON'))
      };
    if (Number.isFinite(target.lat) && Number.isFinite(target.lon)) y.target = target;
    const tpBlock = legacyBlock(text, 'TURNING POINTS', ['RDV', 'ZONE', 'MAPS TO PRODUCE', 'MAPS', 'NOTES']) || legacyBlock(text, 'POINTS TOURNANTS', ['RDV', 'ZONE', 'MAPS TO PRODUCE', 'MAPS', 'NOTES']),
      turning = parseLegacyPoints(tpBlock);
    if (turning.length) y.turning_points = turning;
    const rdv = parseLegacyPoints(legacyBlock(text, 'RDV', ['ZONE', 'MAPS TO PRODUCE', 'MAPS', 'NOTES']));
    if (rdv.length) y.rendezvous = rdv;
    const zoneBlock = legacyBlock(text, 'ZONE', ['MAPS TO PRODUCE', 'MAPS', 'NOTES']),
      zone = {
        name: legacyValue(zoneBlock, 'NAME') || legacyValue(zoneBlock, 'NOM'),
        lat: legacyNumber(legacyValue(zoneBlock, 'LAT')),
        lon: legacyNumber(legacyValue(zoneBlock, 'LON')),
        radius_km: legacyNumber(legacyValue(zoneBlock, 'RAYON') || legacyValue(zoneBlock, 'RADIUS'))
      };
    if (Number.isFinite(zone.lat) && Number.isFinite(zone.lon)) y.zone = zone;
    const mapBlock = legacyBlock(text, 'MAPS TO PRODUCE', ['NOTES']) || legacyBlock(text, 'MAPS', ['NOTES']),
      maps = [];
    for (const m of mapBlock.matchAll(/^\s*-\s*([^|\n]+\.(?:png|jpe?g|svg))\s*(?:\|\s*([^\n]+))?/gmi)) {
      const filename = m[1].trim(),
        description = (m[2] || '').trim();
      maps.push({
        filename,
        type: /general/i.test(filename) ? 'general' : /detail/i.test(filename) ? 'detail' : /cible|target/i.test(filename) ? 'target' : /zone/i.test(filename) ? 'zone' : 'map',
        description
      })
    }
    if (!maps.length)
      for (const filename of new Set([...text.matchAll(/\b([\wÀ-ÿ.-]+\.(?:png|jpe?g|svg))\b/gi)].map(m => m[1]))) maps.push({
        filename,
        type: /general/i.test(filename) ? 'general' : /detail/i.test(filename) ? 'detail' : /cible|target/i.test(filename) ? 'target' : 'map'
      });
    if (maps.length) y.maps = maps;
    const notes = legacyBlock(text, 'NOTES', ['$']).split(/\r?\n/).map(x => x.replace(/^\s*-\s*/, '').trim()).filter(Boolean);
    if (notes.length) y.notes = notes;
    return y
  }

  /** Fusion profonde de deux documents YAML (extra complète et remplace base). */
  function mergeYaml(base, extra) {
    if (extra == null) return base;
    if (Array.isArray(extra)) return extra;
    if (typeof extra !== 'object') return extra;
    const out = base && typeof base === 'object' && !Array.isArray(base) ? base : {};
    for (const [k, v] of Object.entries(extra)) out[k] = v && typeof v === 'object' && !Array.isArray(v) ? mergeYaml(out[k], v) : deepClone(v);
    return out
  }

  // Plusieurs fichiers YAML / Markdown → document (YAML fusionné, textes du Markdown).
  function fromTexts(files) {
    let yaml = {};
    const narrative = {
      summary: '',
      detailed: '',
      sections: []
    };
    for (const f of files.filter(f => /\.ya?ml$/i.test(f.name) || /^\s*[\[{]/.test(f.text) || /^\s*(schema|mission)\s*:/m.test(f.text) && !/^\s*#/m.test(f.text))) {
      const parsed = window.jsyaml.load(f.text);
      if (!parsed || typeof parsed !== 'object') throw Error(`${f.name} ne contient pas un objet YAML.`);
      yaml = mergeYaml(yaml, parsed);
    }
    for (const f of files.filter(f => !(/\.ya?ml$/i.test(f.name) || /^\s*[\[{]/.test(f.text) || /^\s*(schema|mission)\s*:/m.test(f.text) && !/^\s*#/m.test(f.text)))) {
      const p = parseMarkdown(f.text);
      yaml = mergeYaml(extractMdMetadata(f.text, p), yaml);
      if (p.title && !yaml.title) yaml.title = p.title;
      if (p.summary) narrative.summary = p.summary;
      if (p.detailed) narrative.detailed = p.detailed;
      narrative.sections.push(...p.sections);
    }
    return {
      yaml,
      narrative,
      sourceNames: files.map(f => f.name)
    };
  }

  // ---- stockage partagé
  /** Document de mission partagé entre le générateur et le studio (localStorage) ; null sinon. */
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (d && d.yaml) return d;
    } catch {
      /* illisible */ }
    try {
      const d = JSON.parse(localStorage.getItem(LEGACY) || 'null');
      if (d && d.yaml) return {
        ...d,
        rev: 0
      };
    } catch {
      /* illisible */ }
    return null;
  }
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel('sia-mission') : null;

  /** Enregistre le document de mission partagé (YAML, textes, fichiers sources, révision) et sa copie à l'ancien format, puis prévient les autres pages et onglets (BroadcastChannel) ; by : page auteure (pas d'auto-notification). Lève une erreur si le stockage est plein. */
  function save(doc, by) {
    const current = load(),
      out = {
        yaml: doc.yaml,
        narrative: doc.narrative || current?.narrative || {
          summary: '',
          detailed: '',
          sections: []
        },
        sourceNames: doc.sourceNames || current?.sourceNames || [],
        rev: (current?.rev || 0) + 1,
        at: Date.now(),
        by
      };
    try {
      localStorage.setItem(KEY, JSON.stringify(out));
      localStorage.setItem(LEGACY, JSON.stringify({
        yaml: out.yaml,
        narrative: out.narrative,
        sourceNames: out.sourceNames
      }));
    } catch (e) {
      throw Error('Mission non enregistrée dans le navigateur : ' + e.message);
    }
    channel?.postMessage({
      rev: out.rev,
      by
    });
    return out;
  }
  // Rappel à chaque modification faite par une AUTRE page (ou un autre onglet).
  function subscribe(me, cb) {
    /** Transmet le document courant à l'abonné s'il vient d'une autre page. */
    const fire = () => {
      const d = load();
      if (d && d.by !== me) cb(d);
    };
    channel?.addEventListener('message', e => {
      if (e.data?.by !== me) fire();
    });
    window.addEventListener('storage', e => {
      if (e.key === KEY) fire();
    });
  }
  window.SiaMission = {
    KEY,
    load,
    save,
    subscribe,
    fromTexts,
    parseMarkdown,
    extractMdMetadata,
    mergeYaml
  };
})();
