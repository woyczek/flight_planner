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

  // ---- format actuel des missions générées (summaryNN.md) : titres « ## », lignes « Clé : valeur », tableaux, listes.
  // Lu en complément de l'ancien format (blocs TYPE: / TURNING POINTS:) : les valeurs de l'ancien format priment.
  // La cible et les zones n'ont pas de coordonnées dans ce Markdown : elles viennent du YAML de la mission.

  /** Texte de la section « ## titre » (titre normalisé comparé aux motifs) ; « » si absente. */
  function mdSection(text, ...patterns) {
    const parts = String(text).split(/^##\s+/m).slice(1);
    const hit = parts.find(part => patterns.some(re => re.test(norm(part.split('\n')[0]))));
    return hit ? hit.slice(hit.indexOf('\n') + 1) : '';
  }
  /** Lignes « Clé : valeur » d'une section (clé en gras tolérée) : { clé normalisée : valeur }. */
  function mdPairs(block) {
    const out = {};
    for (const line of String(block).split('\n')) {
      const m = /^\s*(?:\*\*)?([^:*|\n-][^:*\n]*?)\s*:\s*(?:\*\*)?\s*(.+?)\s*$/.exec(line);
      if (m && !/^https?$/i.test(m[1].trim())) out[norm(m[1])] = m[2].trim();
    }
    return out;
  }
  /** Tableau Markdown d'une section → lignes { colonne normalisée : valeur }. */
  function mdTable(block) {
    const rows = String(block).split('\n').filter(l => /^\s*\|/.test(l)).map(l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
    if (rows.length < 2) return [];
    const head = rows[0].map(norm);
    return rows.slice(1).filter(r => !r.every(c => /^:?-{2,}:?$/.test(c))).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
  }
  /** Éléments de liste « - … » d'une section. */
  const mdList = block => String(block).split('\n').map(l => /^\s*-\s+(.*)$/.exec(l)?.[1]?.trim()).filter(Boolean);
  /** Valeur de liste typée : True / False (vrai / faux, oui / non), nombre, sinon texte. */
  const mdValue = v => /^(true|vrai|oui)$/i.test(v) ? true : /^(false|faux|non)$/i.test(v) ? false : /^-?\d+(?:[.,]\d+)?$/.test(v) ? Number(v.replace(',', '.')) : v;
  /** « Nom (OACI) — lat, lon » → { name, icao?, lat?, lon? } ; null si vide. */
  function mdPlace(text) {
    const m = /^(.*?)(?:\s*—\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?))?\s*$/.exec(String(text || '').trim());
    const name = (m?.[1] || '').trim(), icao = /\(([A-Z0-9]{4})\)\s*$/.exec(name)?.[1];
    if (!name) return null;
    const out = { name };
    if (icao) out.icao = icao;
    if (m?.[2] != null) { out.lat = +m[2]; out.lon = +m[3]; }
    return out;
  }

  /** Données d'une mission au format Markdown actuel ; seuls les champs trouvés sont présents. */
  function modernMdMetadata(text) {
    const y = { mission: {} };
    const intro = mdPairs(mdSection(text, /^introduction/));
    const pick = (...keys) => keys.map(k => intro[k]).find(Boolean);
    if (pick('type')) y.mission.type = pick('type');
    if (pick('sous_type', 'subtype')) y.mission.subtype = pick('sous_type', 'subtype');
    if (pick('serie')) y.mission.series = pick('serie');
    // aéronef : « A400M Atlas », ou « H135 — SAMU66 » (type — indicatif)
    const plane = pick('aeronef', 'aeronef_concerne'), cs = pick('callsign', 'indicatif');
    if (plane || cs) {
      const [type, callsign] = String(plane || '').split(/\s+—\s+/);
      y.aircraft = [{ id: 'AC1', type: (type || '').trim(), callsign: (cs || callsign || '').trim(), role: 'aéronef principal' }];
    }
    const origin = mdPlace(pick('depart')), destination = mdPlace(pick('destination'));
    if (origin) y.origin = origin;
    if (destination) y.destination = destination;
    // points tournants : | ID | Nom | Latitude | Longitude | Rôle |
    const tps = mdTable(mdSection(text, /^points_tournants/, /^turning_points/)).map(r => ({
      id: r.id || '', name: r.nom || r.name || '', lat: Number(r.latitude ?? r.lat), lon: Number(r.longitude ?? r.lon), role: r.role || ''
    })).filter(pt => Number.isFinite(pt.lat) && Number.isFinite(pt.lon));
    if (tps.length) y.turning_points = tps;
    // rendez-vous : « - **RDV-1 — Nom** — lat, lon — participants : A, B — rôle »
    const rdv = mdList(mdSection(text, /^rendez_vous/)).map(item => {
      const m = /^\*\*(.+?)\*\*\s*—\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*(?:—\s*participants?\s*:\s*(.+?))?(?:\s*—\s*(.+))?$/i.exec(item);
      if (!m) return null;
      const [id, ...name] = m[1].split(/\s+—\s+/);
      return { id: id.trim(), name: name.join(' — ').trim() || id.trim(), lat: +m[2], lon: +m[3], participants: (m[4] || '').split(',').map(x => x.trim()).filter(Boolean), role: (m[5] || '').trim() };
    }).filter(Boolean);
    if (rdv.length) y.rendezvous = rdv;
    // équipes engagées : | Nom / callsign | Arme / service | Département | Type | Rôle |
    const teams = mdTable(mdSection(text, /^equipes/)).map(r => ({
      name: r.nom_callsign || r.nom || '', service: r.arme_service || r.service || '', department: r.departement || '', type: r.type || '', role: r.role || ''
    })).filter(t => t.name);
    if (teams.length) y.teams = teams;
    // charge / personnel
    const loadBlock = mdSection(text, /^charge/);
    if (loadBlock) {
      const [head, tail = ''] = loadBlock.split(/contraintes\s*:/i), kv = mdPairs(head), mass = kv.masse || kv.masse_fret || kv.masse_totale, list = mdList(tail);
      y.payload = { category: kv.categorie || '', description: kv.description || '' };
      if (mass) y.payload.mass_kg = Number(String(mass).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
      if (kv.passagers != null) y.payload.passengers = Number(kv.passagers) || 0;
      if (list.length) y.payload.constraints = list;
    }
    // objectifs
    const primary = mdSection(text, /^objectif_principal/).trim(), secondary = mdList(mdSection(text, /^objectifs_secondaires/));
    if (primary || secondary.length) y.objectives = { primary: primary.split('\n')[0].trim(), secondary };
    // ravitaillement en vol : « - clé: valeur »
    const aar = mdList(mdSection(text, /^ravitaillement/)).map(l => /^([\w ]+?)\s*:\s*(.+)$/.exec(l)).filter(Boolean);
    if (aar.length) y.air_refueling = Object.fromEntries(aar.map(([, k, v]) => [norm(k), mdValue(v.trim())]));
    // risques : « - **Danger** — conséquence : X — mesure : Y » (ou « … . Mesure: Y »)
    const risks = mdList(mdSection(text, /^risques/)).map(item => {
      const m = /^\*\*(.+?)\*\*\s*—\s*conséquence\s*:\s*(.+?)(?:\s*(?:—|\.)\s*mesure\s*:\s*(.+))?$/i.exec(item);
      return m ? { hazard: m[1].trim(), consequence: m[2].trim().replace(/\.$/, ''), mitigation: (m[3] || '').trim() } : { hazard: item.replace(/\*\*/g, '').trim() };
    });
    if (risks.length) y.risks = risks;
    if (!Object.keys(y.mission).length) delete y.mission;
    return y;
  }

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
    return mergeYaml(modernMdMetadata(text), y)
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
  // Fichiers d'une mission : YAML (données) et / ou Markdown (textes, plus les données du format actuel).
  // Fichiers annexes d'une série ignorés (manifeste des cartes, références, consignes, VALIDATION.txt) ;
  // une sélection qui contient plusieurs missions (dossier de série entier) est refusée avec un message clair.
  const isYaml = f => /\.ya?ml$/i.test(f.name) || /^\s*[\[{]/.test(f.text) || /^\s*(schema|mission)\s*:/m.test(f.text) && !/^\s*#/.test(f.text);
  /** Vrai pour le Markdown d'une mission (ancien format TYPE: / TURNING POINTS:, ou format actuel ## Introduction / ## Summary). */
  const isMissionMd = f => (/\.(md|markdown|txt)$/i.test(f.name) || /^\s*#/.test(f.text)) && (/^##\s+(introduction|summary|résumé|resume)\b/im.test(f.text) || /^\s*(TYPE|TURNING POINTS|POINTS TOURNANTS)\s*:/m.test(f.text));
  /** Missions distinctes d'une sélection : identifiant du YAML (mission.id) ou n° du titre Markdown (« Mission 51 »). */
  function missionIds(yamls, mds) {
    const ids = new Set();
    yamls.forEach(({ parsed }) => { const id = parsed?.mission?.id ?? parsed?.mission?.number; if (id != null && id !== '') ids.add(String(id).trim().toUpperCase().replace(/^0+(?=\d)/, '')); });
    mds.forEach(f => { const m = /^#\s+Mission\s+(\d+[A-Z]?)\b/im.exec(f.text); if (m) ids.add(m[1].toUpperCase().replace(/^0+(?=\d)/, '')); }); // 41A ≠ 41B (une mission par équipe)
    return [...ids];
  }

  /** Plusieurs fichiers YAML / Markdown d'UNE mission → document { yaml, narrative, sourceNames, ignored }.
   *  Lève une erreur si la sélection contient plusieurs missions ou aucun fichier de mission. */
  function fromTexts(files) {
    const parsedYamls = files.filter(isYaml).map(f => {
      const parsed = window.jsyaml.load(f.text);
      if (!parsed || typeof parsed !== 'object') throw Error(`${f.name} ne contient pas un objet YAML.`);
      return { f, parsed };
    });
    // un YAML / JSON sans clé de mission (ex. VALIDATION.txt d'une série, en JSON) est un fichier annexe
    const isMission = ({ f, parsed }) => /\.ya?ml$/i.test(f.name) || ['schema', 'mission', 'turning_points', 'target', 'aircraft'].some(k => k in parsed);
    const yamls = parsedYamls.filter(isMission);
    const mds = files.filter(f => !isYaml(f) && isMissionMd(f));
    const ignored = [...parsedYamls.filter(y => !isMission(y)).map(y => y.f.name), ...files.filter(f => !isYaml(f) && !isMissionMd(f)).map(f => f.name)];
    if (!yamls.length && !mds.length) throw Error(`Aucun fichier de mission (YAML ou Markdown de mission) dans : ${files.map(f => f.name).join(', ')}.`);
    const ids = missionIds(yamls, mds);
    if (ids.length > 1) throw Error(`La sélection contient ${ids.length} missions (${ids.join(', ')}) : choisir les fichiers d'une seule mission (missionNN.yaml et summaryNN.md).`);
    let yaml = {};
    const narrative = { summary: '', detailed: '', sections: [] };
    for (const { parsed } of yamls) yaml = mergeYaml(yaml, parsed);
    for (const f of mds) {
      const p = parseMarkdown(f.text);
      yaml = mergeYaml(extractMdMetadata(f.text, p), yaml);   // les valeurs du YAML priment
      if (p.title && !yaml.title) yaml.title = p.title;
      if (p.summary) narrative.summary = p.summary;
      if (p.detailed) narrative.detailed = p.detailed;
      narrative.sections.push(...p.sections);
    }
    // ligne de séparation d'un tableau Markdown recopiée comme équipe par certains générateurs (« --- », « ---: »)
    if (Array.isArray(yaml.teams)) yaml.teams = yaml.teams.filter(t => !t || typeof t !== 'object' || !Object.values(t).every(v => /^\s*:?-{2,}:?\s*$/.test(String(v ?? ''))));
    return { yaml, narrative, sourceNames: files.map(f => f.name).filter(n => !ignored.includes(n)), ignored };
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
