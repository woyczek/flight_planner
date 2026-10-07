(() => {
  'use strict';
  // Mission partagée entre le générateur de mission et le studio cartographique : un seul document
  // { yaml, narrative, sourceNames, rev, at, by } dans le navigateur, avec numéro de révision et
  // notification des autres pages ouvertes (BroadcastChannel + événement storage). Lecture des
  // missions Markdown / YAML (schéma helo-xp-mission) commune aux deux pages.
  // Espace de noms (window.SIA_MISSION_NS, posé avant ce script) : une page hors du Centre (Cartes de vol) garde sa
  // propre mission, sans toucher à celle du générateur et du studio.
  const NS = window.SIA_MISSION_NS ? ':' + window.SIA_MISSION_NS : '';
  const KEY = NS ? 'siaMissionShared' + NS : 'siaMissionShared:v1',
    LEGACY = 'missionGeneratorDraft' + NS,
    BATCH = NS ? 'siaMissionBatch' + NS : 'siaMissionBatch:v1'; // lot de missions (opération à plusieurs équipes) : { docs, index }
  /** Clé de texte : minuscules sans accents, mots séparés par « _ ». */
  const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(
    /^_|_$/g, '');
  /** Copie profonde : valeurs simples telles quelles (la copie JSON de chaque nombre ou texte coûtait des milliers
   *  d'analyses par relecture du dossier des missions), objets par structuredClone. */
  const deepClone = v => v === null || typeof v !== 'object' ? v : structuredClone(v);

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
      re = new RegExp('^' + start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:\\s*\\r?\\n([\\s\\S]*?)(?=^(?:' + ends +
        ')\\s*:\\s*$|(?![\\s\\S]))', 'mi'),
      m = text.match(re);
    return m ? m[1].trim() : ''
  }

  /** Points tournants de l'ancien format (nom, position). */
  function parseLegacyPoints(block) {
    const out = [];
    for (const m of block.matchAll(
        /^\s*-\s*([^|\n]+)\|\s*([^|\n]+)\|\s*(-?\d+(?:[.,]\d+)?)\s*\|\s*(-?\d+(?:[.,]\d+)?)(?:\s*\|\s*([^\n]+))?/gm)) out.push({
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
    const rows = String(block).split('\n').filter(l => /^\s*\|/.test(l)).map(l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c
      .trim()));
    if (rows.length < 2) return [];
    const head = rows[0].map(norm);
    return rows.slice(1).filter(r => !r.every(c => /^:?-{2,}:?$/.test(c))).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ??
      ''
    ])));
  }
  /** Éléments de liste « - … » d'une section. */
  const mdList = block => String(block).split('\n').map(l => /^\s*-\s+(.*)$/.exec(l)?.[1]?.trim()).filter(Boolean);
  /** Valeur de liste typée : True / False (vrai / faux, oui / non), nombre, sinon texte. */
  const mdValue = v => /^(true|vrai|oui)$/i.test(v) ? true : /^(false|faux|non)$/i.test(v) ? false : /^-?\d+(?:[.,]\d+)?$/.test(v) ?
    Number(v.replace(',', '.')) : v;
  /** « Nom (OACI) — lat, lon » → { name, icao?, lat?, lon? } ; null si vide. */
  function mdPlace(text) {
    const m = /^(.*?)(?:\s*—\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?))?\s*$/.exec(String(text || '').trim());
    const name = (m?.[1] || '').trim(),
      icao = /\(([A-Z0-9]{4})\)\s*$/.exec(name)?.[1];
    if (!name) return null;
    const out = {
      name
    };
    if (icao) out.icao = icao;
    if (m?.[2] != null) {
      out.lat = +m[2];
      out.lon = +m[3];
    }
    return out;
  }

  /** Données d'une mission au format Markdown actuel ; seuls les champs trouvés sont présents. */
  function modernMdMetadata(text) {
    const y = {
      mission: {}
    };
    const intro = mdPairs(mdSection(text, /^introduction/));
    /** Première valeur renseignée de l'introduction parmi les clés données (alias français / anglais). */
    const pick = (...keys) => keys.map(k => intro[k]).find(Boolean);
    if (pick('type')) y.mission.type = pick('type');
    if (pick('sous_type', 'subtype')) y.mission.subtype = pick('sous_type', 'subtype');
    if (pick('serie')) y.mission.series = pick('serie');
    // aéronef : « A400M Atlas », ou « H135 — SAMU66 » (type — indicatif)
    const plane = pick('aeronef', 'aeronef_concerne'),
      cs = pick('callsign', 'indicatif');
    if (plane || cs) {
      const [type, callsign] = String(plane || '').split(/\s+—\s+/);
      y.aircraft = [{
        id: 'AC1',
        type: (type || '').trim(),
        callsign: (cs || callsign || '').trim(),
        role: 'aéronef principal'
      }];
    }
    const origin = mdPlace(pick('depart')),
      destination = mdPlace(pick('destination'));
    if (origin) y.origin = origin;
    if (destination) y.destination = destination;
    // points tournants : | ID | Nom | Latitude | Longitude | Rôle |
    const tps = mdTable(mdSection(text, /^points_tournants/, /^turning_points/)).map(r => ({
      id: r.id || '',
      name: r.nom || r.name || '',
      lat: Number(r.latitude ?? r.lat),
      lon: Number(r.longitude ?? r.lon),
      role: r.role || ''
    })).filter(pt => Number.isFinite(pt.lat) && Number.isFinite(pt.lon));
    if (tps.length) y.turning_points = tps;
    // rendez-vous : « - **RDV-1 — Nom** — lat, lon — participants : A, B — rôle »
    const rdv = mdList(mdSection(text, /^rendez_vous/)).map(item => {
      const m =
        /^\*\*(.+?)\*\*\s*—\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*(?:—\s*participants?\s*:\s*(.+?))?(?:\s*—\s*(.+))?$/i
        .exec(item);
      if (!m) return null;
      const [id, ...name] = m[1].split(/\s+—\s+/);
      return {
        id: id.trim(),
        name: name.join(' — ').trim() || id.trim(),
        lat: +m[2],
        lon: +m[3],
        participants: (m[4] || '').split(',').map(x => x.trim()).filter(Boolean),
        role: (m[5] || '').trim()
      };
    }).filter(Boolean);
    if (rdv.length) y.rendezvous = rdv;
    // équipes engagées : | Nom / callsign | Arme / service | Département | Type | Rôle |
    const teams = mdTable(mdSection(text, /^equipes/)).map(r => ({
      name: r.nom_callsign || r.nom || '',
      service: r.arme_service || r.service || '',
      department: r.departement || '',
      type: r.type || '',
      role: r.role || ''
    })).filter(t => t.name);
    if (teams.length) y.teams = teams;
    // charge / personnel
    const loadBlock = mdSection(text, /^charge/);
    if (loadBlock) {
      const [head, tail = ''] = loadBlock.split(/contraintes\s*:/i), kv = mdPairs(head), mass = kv.masse || kv.masse_fret || kv
        .masse_totale, list = mdList(tail);
      y.payload = {
        category: kv.categorie || '',
        description: kv.description || ''
      };
      if (mass) y.payload.mass_kg = Number(String(mass).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
      if (kv.passagers != null) y.payload.passengers = Number(kv.passagers) || 0;
      if (list.length) y.payload.constraints = list;
    }
    // objectifs
    const primary = mdSection(text, /^objectif_principal/).trim(),
      secondary = mdList(mdSection(text, /^objectifs_secondaires/));
    if (primary || secondary.length) y.objectives = {
      primary: primary.split('\n')[0].trim(),
      secondary
    };
    // ravitaillement en vol : « - clé: valeur »
    const aar = mdList(mdSection(text, /^ravitaillement/)).map(l => /^([\w ]+?)\s*:\s*(.+)$/.exec(l)).filter(Boolean);
    if (aar.length) y.air_refueling = Object.fromEntries(aar.map(([, k, v]) => [norm(k), mdValue(v.trim())]));
    // risques : « - **Danger** — conséquence : X — mesure : Y » (ou « … . Mesure: Y »)
    const risks = mdList(mdSection(text, /^risques/)).map(item => {
      const m = /^\*\*(.+?)\*\*\s*—\s*conséquence\s*:\s*(.+?)(?:\s*(?:—|\.)\s*mesure\s*:\s*(.+))?$/i.exec(item);
      return m ? {
        hazard: m[1].trim(),
        consequence: m[2].trim().replace(/\.$/, ''),
        mitigation: (m[3] || '').trim()
      } : {
        hazard: item.replace(/\*\*/g, '').trim()
      };
    });
    if (risks.length) y.risks = risks;
    if (!Object.keys(y.mission).length) delete y.mission;
    return y;
  }

  /** Métadonnées d'une mission Markdown à l'ancien format (blocs « TYPE: », « TARGET », « TURNING POINTS », « RDV »,
   *  « ZONE », « MAPS TO PRODUCE », « NOTES ») → objet YAML partiel. */
  function extractMdMetadata(text, parsed) {
    const y = {
      title: parsed.title || 'Mission',
      mission: {}
    };
    const id = y.title.match(/\bMission\s+([A-Z]?-?\d+[A-Z]?)\b/i);
    if (id) {
      const p = parseId(id[1]);
      y.mission.id = p.id;
      y.mission.number = p.num;
    }
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
    const targetBlock = legacyBlock(text, 'TARGET', ['TURNING POINTS', 'POINTS TOURNANTS', 'RDV', 'ZONE', 'MAPS TO PRODUCE', 'MAPS',
        'NOTES'
      ]),
      target = {
        id: 'TARGET',
        name: legacyValue(targetBlock, 'NAME') || legacyValue(targetBlock, 'NOM') || 'Cible',
        lat: legacyNumber(legacyValue(targetBlock, 'LAT')),
        lon: legacyNumber(legacyValue(targetBlock, 'LON'))
      };
    if (Number.isFinite(target.lat) && Number.isFinite(target.lon)) y.target = target;
    const tpBlock = legacyBlock(text, 'TURNING POINTS', ['RDV', 'ZONE', 'MAPS TO PRODUCE', 'MAPS', 'NOTES']) || legacyBlock(text,
        'POINTS TOURNANTS', ['RDV', 'ZONE', 'MAPS TO PRODUCE', 'MAPS', 'NOTES']),
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
        type: /general/i.test(filename) ? 'general' : /detail/i.test(filename) ? 'detail' : /cible|target/i.test(filename) ?
          'target' : /zone/i.test(filename) ? 'zone' : 'map',
        description
      })
    }
    if (!maps.length)
      for (const filename of new Set([...text.matchAll(/\b([\wÀ-ÿ.-]+\.(?:png|jpe?g|svg))\b/gi)].map(m => m[1]))) maps.push({
        filename,
        type: /general/i.test(filename) ? 'general' : /detail/i.test(filename) ? 'detail' : /cible|target/i.test(filename) ?
          'target' : 'map'
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
    for (const [k, v] of Object.entries(extra)) out[k] = v && typeof v === 'object' && !Array.isArray(v) ? mergeYaml(out[k], v) :
      deepClone(v);
    return out
  }

  // Plusieurs fichiers YAML / Markdown → document (YAML fusionné, textes du Markdown).
  // Fichiers d'une mission : YAML (données) et / ou Markdown (textes, plus les données du format actuel).
  // Fichiers annexes d'une série ignorés (manifeste des cartes, références, consignes, VALIDATION.txt) ;
  // une sélection qui contient plusieurs missions (dossier de série entier) est refusée avec un message clair.
  const isYaml = f => /\.ya?ml$/i.test(f.name) || /^\s*[\[{]/.test(f.text) || /^\s*(schema|mission)\s*:/m.test(f.text) && !/^\s*#/.test(f
    .text);
  /** Vrai pour le Markdown d'une mission (ancien format TYPE: / TURNING POINTS:, ou format actuel ## Introduction / ## Summary). */
  const isMissionMd = f => (/\.(md|markdown|txt)$/i.test(f.name) || /^\s*#/.test(f.text)) && (
    /^##\s+(introduction|summary|résumé|resume)\b/im.test(f.text) || /^\s*(TYPE|TURNING POINTS|POINTS TOURNANTS)\s*:/m.test(f.text));
  /** Missions distinctes d'une sélection : identifiant du YAML (mission.id) ou n° du titre Markdown (« Mission 51 »). */
  /** Identifiant de mission normalisé (M-016, m-16 → M-016 ; 041A → 41A) : regroupement des fichiers d'une même mission. */
  const normId = v => parseId(v).id;

  /** Identifiants de mission normalisés, sans doublon, trouvés dans les YAML analysés et les titres « # Mission ». */
  function missionIds(yamls, mds) {
    const ids = new Set();
    yamls.forEach(({
      parsed
    }) => {
      const id = parsed?.mission?.id ?? parsed?.mission?.number;
      if (id != null && id !== '') ids.add(normId(id));
    });
    mds.forEach(f => {
      const m = /^#\s+Mission\s+([A-Z]?-?\d+[A-Z]?)\b/im.exec(f.text);
      if (m) ids.add(normId(m[1]));
    }); // 41A ≠ 41B (une mission par équipe)
    return [...ids];
  }

  /** Plusieurs fichiers YAML / Markdown d'UNE mission → document { yaml, narrative, sourceNames, ignored }.
   *  Lève une erreur si la sélection contient plusieurs missions ou aucun fichier de mission. */
  function fromTexts(files) {
    const parsedYamls = files.filter(isYaml).map(f => {
      const parsed = window.jsyaml.load(f.text);
      if (!parsed || typeof parsed !== 'object') throw Error(`${f.name} ne contient pas un objet YAML.`);
      return {
        f,
        parsed
      };
    });
    // un YAML / JSON sans clé de mission (ex. VALIDATION.txt d'une série, en JSON) est un fichier annexe
    const isMission = ({
      f,
      parsed
    }) => /\.ya?ml$/i.test(f.name) || ['schema', 'mission', 'turning_points', 'target', 'aircraft'].some(k => k in parsed);
    const yamls = parsedYamls.filter(isMission);
    const mds = files.filter(f => !isYaml(f) && isMissionMd(f));
    const ignored = [...parsedYamls.filter(y => !isMission(y)).map(y => y.f.name), ...files.filter(f => !isYaml(f) && !isMissionMd(f))
      .map(f => f.name)
    ];
    if (!yamls.length && !mds.length) throw Error(`Aucun fichier de mission (YAML ou Markdown de mission) dans : ${files.map(f => f.name).join(', ')}.`);
    const ids = missionIds(yamls, mds);
    if (ids.length > 1) throw Error(`La sélection contient ${ids.length} missions (${ids.join(', ')}) : choisir les fichiers d'une seule mission (missionNN.yaml et summaryNN.md).`);
    let yaml = {};
    const narrative = {
      summary: '',
      detailed: '',
      sections: []
    };
    for (const {
        parsed
      }
      of yamls) yaml = mergeYaml(yaml, parsed);
    for (const f of mds) {
      const p = parseMarkdown(f.text);
      yaml = mergeYaml(extractMdMetadata(f.text, p), yaml); // les valeurs du YAML priment
      if (p.title && !yaml.title) yaml.title = p.title;
      if (p.summary) narrative.summary = p.summary;
      if (p.detailed) narrative.detailed = p.detailed;
      narrative.sections.push(...p.sections);
    }
    // ligne de séparation d'un tableau Markdown recopiée comme équipe par certains générateurs (« --- », « ---: »)
    if (Array.isArray(yaml.teams)) yaml.teams = yaml.teams.filter(t => !t || typeof t !== 'object' || !Object.values(t).every(v =>
      /^\s*:?-{2,}:?\s*$/.test(String(v ?? ''))));
    return {
      yaml: upgradeSchema(yaml),
      narrative,
      sourceNames: files.map(f => f.name).filter(n => !ignored.includes(n)),
      ignored
    };
  }
  /** Format helo-xp-mission : un document 1.0 dont l'identifiant est déjà « lettre-nnn[équipe] » est conforme au 2.0,
   *  seul son repère change (même règle que tools/migrate_missions_schema.py) ; appliqué à la lecture (fichiers,
   *  mission partagée et lot mémorisés dans le navigateur). */
  function upgradeSchema(y) {
    if (y && typeof y === 'object' && (y.schema || 'helo-xp-mission') === 'helo-xp-mission' && String(y.schema_version ?? '1.0') ===
      '1.0' && /^[A-Z]-\d{3}[A-Z]?$/.test(String(y.mission?.id || '').trim().toUpperCase())) y.schema_version = '2.0';
    return y;
  }

  // ---- stockage partagé
  /** Document de mission partagé entre le générateur et le studio (localStorage) ; null sinon. */
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (d && d.yaml) {
        upgradeSchema(d.yaml);
        return d;
      }
    } catch {
      /* illisible */
    }
    try {
      const d = JSON.parse(localStorage.getItem(LEGACY) || 'null');
      if (d && d.yaml) return {
        ...d,
        rev: 0
      };
    } catch {
      /* illisible */
    }
    return null;
  }
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel('sia-mission' + NS) : null;

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
    // lot : la mission enregistrée remplace sa copie dans le lot et devient la courante. Mission en cours de saisie (la
    // courante du lot, même titre, même opération) : sa propre place, quel que soit l'identifiant tapé (vide, partiel,
    // égal à celui d'une autre mission) — jamais une autre mission du lot ; sinon (mission chargée, go) : même identifiant
    const b = loadBatch();
    if (b) {
      const here = b.docs[b.index],
        editing = current && missionId(current) === missionId(here) && sameMission(out, here);
      const i = editing ? b.index : b.docs.findIndex(d => missionId(d) === missionId(out));
      if (i >= 0) {
        b.docs[i] = {
          yaml: out.yaml,
          narrative: out.narrative,
          sourceNames: out.sourceNames
        };
        b.index = i;
        storeBatch(b);
      }
    }
    channel?.postMessage({
      rev: out.rev,
      by
    });
    return out;
  }

  // ---- lot de missions (opération à plusieurs équipes : 41A, 41B…) --------------------------------------
  /** Identifiant d'une mission (mission.id, sinon numéro), normalisé : « 41A », « 11 » ; « » si absent. */
  const missionId = d => String(d?.yaml?.mission?.id ?? d?.yaml?.mission?.number ?? '').trim().toUpperCase().replace(/^0+(?=\d)/, '');
  /** Identifiant d'opération d'une mission (bloc operation) ; « » sans opération. */
  const operationId = d => String(d?.yaml?.operation?.id ?? '').trim().toUpperCase();
  /** Même mission à identifiant près : même titre, même opération (sert à suivre une mission dont on change l'identifiant). */
  const sameMission = (a, b) => String(a?.yaml?.title ?? '') === String(b?.yaml?.title ?? '') && operationId(a) === operationId(b);
  // ---- identifiants liés : une mission d'opération est référencée par les autres (operation.missions / organisation,
  // exercise.participants[].mission, noms des cartes « generalBFM-001A.png », récits « selon BFM-001Z »). Changer un seul
  // mission.id casse ces liens : migration de l'opération entière, même règle que tools/migrate_operation_ids.py.
  const idNorm = v => String(v ?? '').trim().toUpperCase();
  /** Base d'opération d'un identifiant : « BFM-001C » → « BFM-001 » ; « M-016 » → « M-016 ». */
  const idBase = id => idNorm(id).replace(/(\d)[A-Z]$/, '$1');
  /** Ancien identifiant comme jeton (lettre d'équipe capturée pour une base d'opération) : pas « BFM-0012 ». */
  const idToken = (old, base) => new RegExp(`(?<![A-Z0-9-])${old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${base ? '([A-Z]?)' : '()'}(?![A-Z0-9])`, 'g');
  /** Valeurs texte d'un document (clés comprises), parcours profond ; fn(texte) → texte. */
  const mapStrings = (v, fn) => Array.isArray(v) ? v.map(x => mapStrings(x, fn)) : v && typeof v === 'object' ? Object.fromEntries(Object
      .entries(v).map(([k, x]) => [k, k === 'former_id' ? x : mapStrings(x, fn)])) : typeof v === 'string' ? fn(v) :
    v; // former_id : trace, gardé tel quel
  /** Missions du lot (et courante) qui citent un identifiant ailleurs que dans leur propre mission.id : [{ id, count }]. */
  function idRelations(id) {
    const old = idNorm(id);
    if (!old) return [];
    const rx = idToken(old, false),
      b = loadBatch(),
      cur = load(),
      docs = [...(b?.docs || [])];
    if (cur && !docs.some(d => missionId(d) === missionId(cur))) docs.push(cur);
    return docs.map(d => {
      const y = {
        ...(d.yaml || {}),
        mission: {
          ...(d.yaml?.mission || {}),
          id: '',
          former_id: ''
        }
      };
      return {
        id: missionId(d) || '?',
        count: (JSON.stringify(y).match(rx) || []).length + (JSON.stringify(d.narrative || {}).match(rx) || []).length
      };
    }).filter(x => x.count);
  }
  /** Migration d'identifiants dans le lot et la mission courante : from → to partout (textes, listes, noms de cartes).
   *  Base d'opération (« BFM-001 » → « A-001 ») : l'opération et chacune de ses missions, la lettre d'équipe suit ;
   *  identifiant complet : cette mission seulement. mission.former_id = ancien identifiant ; type : famille donnée aux
   *  missions, mission d'organisation comprise. Retour : nombre de missions du lot modifiées. */
  function migrateIds(from, to, {
    type = ''
  } = {}) {
    const old = idNorm(from),
      now = idNorm(to);
    if (!old || !now || old === now) return 0;
    const base = !/\d[A-Z]$/.test(old),
      rx = idToken(old, base),
      sub = s => s.replace(rx, (_, team) => now + team);
    let n = 0;
    /** Applique la migration à un document du lot (YAML et récit), note l'ancien identifiant (former_id) et compte
     *  les documents réellement modifiés. */
    const fix = d => {
      if (!d?.yaml) return d;
      const before = JSON.stringify([d.yaml, d.narrative]),
        was = idNorm(d.yaml.mission?.id),
        y = mapStrings(d.yaml, sub),
        narrative = mapStrings(d.narrative, sub);
      const m = y.mission || (y.mission = {});
      // identifiant propre déjà changé dans la page (saisie) : l'ancien est retrouvé d'après la règle
      const own = [...JSON.stringify(d.yaml).matchAll(rx)].map(x => old + x[1]).find(o => sub(o) === idNorm(m.id)) || (was !== idNorm(m
        .id) ? was : '');
      if (own && own !== idNorm(m.id) && !m.former_id) m.former_id = own;
      if (type) m.type = type; // mission d'organisation comprise (même famille que ses missions)
      if (JSON.stringify([y, narrative]) !== before) n++;
      return {
        ...d,
        yaml: y,
        narrative
      };
    };
    const b = loadBatch();
    if (b) {
      b.docs = b.docs.map(fix);
      storeBatch(b);
    }
    const cur = load(),
      counted = n;
    if (cur) {
      const c = fix(cur);
      n = b ? counted : n;
      localStorage.setItem(KEY, JSON.stringify({
        ...c,
        rev: (cur.rev || 0) + 1,
        at: Date.now()
      }));
      channel?.postMessage({
        rev: (cur.rev || 0) + 1,
        by: 'migration'
      });
    }
    return n;
  }
  /** Missions annoncées par l'opération d'un lot (operation.missions de ses documents), normalisées. */
  const plannedIds = docs => [...new Set(docs.flatMap(d => (Array.isArray(d?.yaml?.operation?.missions) ? d.yaml.operation.missions : [])
    .map(x => String(x).trim().toUpperCase().replace(/^0+(?=\d)/, ''))))];
  /** Lot mémorisé { docs: [{ yaml, narrative, sourceNames }], index } (plusieurs missions, ou une mission d'une
   *  opération dont les autres restent à charger) ; null sans lot. */
  function loadBatch() {
    try {
      const b = JSON.parse(localStorage.getItem(BATCH) || 'null');
      if (b && Array.isArray(b.docs)) b.docs.forEach(d => upgradeSchema(d?.yaml));
      return b && Array.isArray(b.docs) && b.docs.length ? {
        docs: b.docs,
        index: Math.min(Math.max(0, b.index | 0), b.docs.length - 1)
      } : null;
    } catch {
      return null;
    }
  }
  /** Enregistre le lot (null : l'efface) et prévient les autres pages. */
  function storeBatch(b) {
    try {
      b ? localStorage.setItem(BATCH, JSON.stringify(b)) : localStorage.removeItem(BATCH);
    } catch (e) {
      throw Error('Lot de missions non enregistré dans le navigateur : ' + e.message);
    }
    channel?.postMessage({
      batch: true
    });
    window.dispatchEvent(new CustomEvent('sia-mission-batch'));
  }
  /** Passe à la mission i du lot : la courante (avec ses dernières modifications) est rangée, la mission i devient
   *  la mission partagée (by : page auteure). Retourne le document enregistré ; null sans lot. */
  function go(i, by) {
    const b = loadBatch();
    if (!b) return null;
    const cur = load();
    if (cur && missionId(cur) === missionId(b.docs[b.index])) b.docs[b.index] = {
      yaml: cur.yaml,
      narrative: cur.narrative,
      sourceNames: cur.sourceNames
    };
    b.index = (i + b.docs.length) % b.docs.length;
    storeBatch(b);
    return save(b.docs[b.index], by);
  }

  /** Ajoute (ou remplace, même identifiant) une mission au lot de son opération et la rend courante ; sans lot, le lot
   *  est créé avec la mission courante. Utilisé pour la mission d'organisation (<lettre>-<nnn>Z) créée par le générateur. */
  function addToBatch(doc, by) {
    /** Document réduit à ce que garde le lot : YAML, récit (vide par défaut) et noms des fichiers sources. */
    const slim = d => ({
      yaml: d.yaml,
      narrative: d.narrative || {
        summary: '',
        detailed: '',
        sections: []
      },
      sourceNames: d.sourceNames || []
    });
    let b = loadBatch();
    const cur = load();
    if (!b) b = {
      docs: cur?.yaml ? [slim(cur)] : [],
      index: 0
    };
    else if (cur && missionId(cur) === missionId(b.docs[b.index])) b.docs[b.index] = slim(cur);
    const i = b.docs.findIndex(x => missionId(x) === missionId(doc));
    i >= 0 ? b.docs[i] = slim(doc) : b.docs.push(slim(doc));
    b.docs.sort((x, y) => missionId(x).localeCompare(missionId(y), 'fr', {
      numeric: true
    }));
    b.index = b.docs.findIndex(x => missionId(x) === missionId(doc));
    storeBatch(b);
    return save(b.docs[b.index], by);
  }

  /** Découpe un texte collé contenant plusieurs fichiers ou plusieurs missions en fichiers { name, text } ; texte
   *  d'un seul fichier : tableau vide. Formes reconnues, dans l'ordre :
   *   1. « Fichier : mission41A.yaml » puis bloc de code ``` (réponse de ChatGPT copiée en Markdown) ;
   *   2. « Fichier : … » sans ``` (réponse copiée depuis la page affichée : étiquette « yaml », « Copier le code ») ;
   *   3. plusieurs blocs de code ``` sans nom ;
   *   4. YAML et Markdown des missions à la suite, sans rien autour (débuts : « schema: helo-xp-mission »,
   *      « # Mission 41A »). Le texte hors mission (introduction, VALIDATION, « Mission suivante ») est écarté. */
  function splitBundle(text) {
    const src = String(text || '').replace(/\r\n/g, '\n'),
      out = [];
    const re =
      /^[ \t>*_-]*(?:fichier|file|datei|archivo)\s*:?\s*[*_`]*\s*([\w.\-]+\.(?:ya?ml|md|markdown))\s*[*_`]*\s*\n+\s*```[\w-]*\n([\s\S]*?)\n\s*```/gim;
    for (let m;
      (m = re.exec(src));) out.push({
      name: m[1],
      text: m[2]
    });
    if (out.length) return out;
    // 2. repères « Fichier : nom » sans blocs de code : un segment par repère, nettoyé
    const marks = [...src.matchAll(
      /^[ \t>*_#-]*(?:fichier|file|datei|archivo)\s*:?\s*[*_`]*\s*([\w.\-]+\.(?:ya?ml|md|markdown))\s*[*_`]*\s*$/gim)];
    if (marks.length > 1) return marks.map((m, k) => ({
      name: m[1],
      text: cleanSegment(src.slice(m.index + m[0].length, marks[k + 1]?.index ?? src.length))
    })).filter(f => f.text);
    // 3. blocs de code sans nom : nommés d'après leur contenu
    const blocks = [...src.matchAll(/```([\w-]*)\n([\s\S]*?)\n\s*```/g)];
    if (blocks.length > 1) return blocks.map((b, i) => ({
      name: /ya?ml/i.test(b[1]) || /^\s*(schema|mission)\s*:/m.test(b[2]) ? `bloc${i + 1}.yaml` : `bloc${i + 1}.md`,
      text: b[2]
    }));
    // 4. débuts de fichiers à la suite : YAML (« schema: helo-xp-mission ») et Markdown (« # Mission 41A »)
    const starts = [...src.matchAll(/^(?:schema\s*:\s*['"]?helo-xp-mission\b.*|#\s+Mission\s+[A-Z]?-?\d+[A-Z]?\b.*)$/gim)];
    if (starts.length > 1) return starts.map((m, k) => {
      const yaml = /^schema/i.test(m[0]);
      return {
        name: `${yaml ? 'mission' : 'summary'}${k + 1}.${yaml ? 'yaml' : 'md'}`,
        text: cleanSegment(src.slice(m.index, starts[k + 1]?.index ?? src.length))
      };
    }).filter(f => f.text);
    return [];
  }
  /** Nettoie un segment de texte collé : étiquettes et boutons des blocs de code copiés depuis ChatGPT (« yaml »,
   *  « markdown », « Copier le code », ```), puis coupe au bloc VALIDATION ou à « Mission suivante ». */
  function cleanSegment(seg) {
    const lines = String(seg).split('\n');
    while (lines.length &&
      /^\s*(?:```[\w-]*|yaml|yml|markdown|md|text|plaintext|copier(?: le code)?|copy(?: code)?|code copié|copied!?)?\s*$/i.test(lines[0]))
      lines.shift();
    // arrêt : titre seul « VALIDATION » (pas une phrase qui commence par « Validation de… »), ou « Mission suivante »
    const stop = lines.findIndex(l => /^\s*(?:#+\s*)?(?:\*\*)?\s*(?:\d+\.\s*)?(?:bloc\s+)?validation\s*(?:\*\*)?\s*:?\s*$/i.test(l) ||
      /^\s*(?:\*\*)?\s*(?:mission suivante|next mission)\b/i.test(l));
    const kept = stop >= 0 ? lines.slice(0, stop) : lines;
    while (kept.length && /^\s*(?:```|copier(?: le code)?|copy(?: code)?)?\s*$/i.test(kept[kept.length - 1])) kept.pop();
    return kept.join('\n').trim();
  }

  /** Comme fromTexts, pour une sélection qui peut contenir PLUSIEURS missions (fichiers d'une opération, ou un
   *  texte collé à découper) : { docs (une par mission, ordre des identifiants : 41A, 41B…), ignored }. */
  function fromTextsBatch(files) {
    // un fichier .yaml n'est pas découpé : son commentaire d'en-tête « # Mission I-001C — … » n'est pas un Markdown
    const expanded = files.flatMap(f => {
      const parts = /\.ya?ml$/i.test(f.name || '') ? [] : splitBundle(f.text);
      return parts.length ? parts : [f];
    });
    /** Identifiant normalisé de la mission d'un fichier (YAML analysé, sinon titre « # Mission … »), '' si aucun. */
    const idOfFile = f => {
      if (isYaml(f)) {
        try {
          const y = window.jsyaml.load(f.text);
          return normId(missionId({
            yaml: y
          }));
        } catch {
          return '';
        }
      }
      const m = /^#\s+Mission\s+([A-Z]?-?\d+[A-Z]?)\b/im.exec(f.text);
      return m ? normId(m[1]) : '';
    };
    const groups = new Map(),
      loose = [];
    for (const f of expanded) {
      const id = idOfFile(f);
      id ? (groups.has(id) || groups.set(id, []), groups.get(id).push(f)) : loose.push(f);
    }
    if (groups.size <= 1) {
      const d = fromTexts(expanded);
      return {
        docs: [d],
        ignored: d.ignored
      };
    }
    const ids = [...groups.keys()].sort((a, b) => a.localeCompare(b, 'fr', {
      numeric: true
    }));
    const docs = ids.map(id => fromTexts(groups.get(id))),
      ignored = [...new Set([...loose.map(f => f.name), ...docs.flatMap(d => d.ignored)])];
    return {
      docs,
      ignored
    };
  }

  /** Lit une sélection (fichiers ou texte collé) et l'enregistre comme mission partagée (by : page auteure) ;
   *  plusieurs missions : lot, la première devient la courante (« mission suivante » dans l'en-tête).
   *  Retourne { doc (mission courante enregistrée), docs, count, ignored }. */
  function importTexts(files, by) {
    const {
      docs,
      ignored
    } = fromTextsBatch(files), slim = d => ({
      yaml: d.yaml,
      narrative: d.narrative,
      sourceNames: d.sourceNames
    });
    const prev = loadBatch(),
      op = operationId(docs[0]);
    let b = null;
    if (prev && op && docs.every(d => operationId(d) === op) && prev.docs.some(d => operationId(d) === op)) {
      // missions de la MÊME opération chargées en plusieurs fois (ex. réponse de ChatGPT collée mission par mission) : elles rejoignent le lot
      const all = [...prev.docs];
      for (const d of docs) {
        const i = all.findIndex(x => missionId(x) === missionId(d));
        i >= 0 ? all[i] = slim(d) : all.push(slim(d));
      }
      all.sort((x, y) => missionId(x).localeCompare(missionId(y), 'fr', {
        numeric: true
      }));
      b = {
        docs: all,
        index: all.findIndex(x => missionId(x) === missionId(docs[0]))
      };
    } else if (docs.length > 1 || plannedIds(docs).length > 1) b = {
      docs: docs.map(slim),
      index: 0
    };
    storeBatch(b);
    const planned = plannedIds(b?.docs || docs),
      loaded = (b?.docs || docs).map(missionId),
      missing = planned.filter(id => !loaded.includes(id));
    return {
      doc: save(docs[0], by),
      docs,
      count: docs.length,
      ignored,
      batchSize: b?.docs.length || 1,
      missing,
      operation: docs[0].yaml?.operation?.name || ''
    };
  }

  /** Navigation du lot dans l'en-tête de la page : « ◀ Mission 41A — titre (1/3) ▶ », masquée sans lot.
   *  apply(doc) : la page affiche la mission choisie. me : identifiant de la page (générateur, studio). */
  function mountNav(me, apply) {
    /** Pose la barre de navigation du lot dans l'en-tête (une seule fois), avec le lien de retour au registre. */
    const mount = () => {
      const line = document.querySelector('body>header .repo-header-line1') || document.querySelector('body>header');
      if (!line || document.getElementById('siaBatchNav')) return;
      const nav = document.createElement('div');
      nav.id = 'siaBatchNav';
      nav.className = 'sia-batch-nav';
      nav.hidden = true;
      nav.innerHTML =
        '<button type="button" data-step="-1" title="Mission précédente">◀</button><select title="Mission du lot"></select><button type="button" data-step="1" title="Mission suivante">▶</button>';
      const title = line.querySelector('h1');
      title ? title.after(nav) : line.prepend(nav);
      // arrivée depuis le registre des missions (même onglet) : lien de retour vers la mission dans le registre
      let from = null;
      try {
        from = NS ? null : JSON.parse(sessionStorage.getItem('siaFromRegistry:v1') || 'null');
      } catch {
        /* stockage indisponible */
      }
      if (from) {
        const back = document.createElement('a');
        back.id = 'siaBackRegistry';
        back.className = 'sia-back';
        back.href = new URL(`apps/cpco/mission_registry.html${from.id ? `?mission=${encodeURIComponent(from.id)}` : ''}`, window.RepositoryNav?.root || new URL('../../', location.href).href).href;
        back.textContent = `← Registre${from.id ? ` (${from.id})` : ''}`;
        back.title = `Retour au registre des missions${from.title ? ` : ${from.id} — ${from.title}` : ''}`;
        nav.before(back);
      }
      const css = document.createElement('style');
      css.textContent =
        '.sia-back{display:inline-flex;align-items:center;margin:0 6px 0 10px;padding:3px 10px;border-radius:999px;border:1px solid currentColor;color:inherit;text-decoration:none;font-size:13px;font-weight:600;white-space:nowrap;opacity:.9}.sia-back:hover{opacity:1}.sia-batch-nav{display:inline-flex;align-items:center;gap:4px;margin:0 10px}.sia-batch-nav[hidden]{display:none}.sia-batch-nav select{max-width:320px;padding:3px 6px;border-radius:6px;font:inherit;font-size:13px}.sia-batch-nav button{padding:3px 9px;border-radius:6px;font-size:13px;cursor:pointer}';
      document.head.append(css);
      const sel = nav.querySelector('select');
      /** Remplit la liste des missions du lot (chargées, et prévues par l'opération à charger) ; masquée sous deux. */
      const render = () => {
        const b = loadBatch(),
          planned = b ? plannedIds(b.docs) : [],
          loaded = b ? b.docs.map(missionId) : [];
        const all = [...new Set([...loaded, ...planned])].sort((x, y) => x.localeCompare(y, 'fr', {
          numeric: true
        }));
        nav.hidden = !b || all.length < 2;
        if (nav.hidden) return;
        sel.innerHTML = all.map((id, k) => {
          const i = loaded.indexOf(id),
            d = b.docs[i];
          return i >= 0 ? `<option value="${i}">Mission ${esc(id)} — ${esc(String(d.yaml?.title || '').slice(0, 48))} (${k + 1}/${all.length})</option>` :
            `<option disabled>Mission ${esc(id)} — à charger : coller ou ouvrir ses fichiers (${k + 1}/${all.length})</option>`;
        }).join('');
        sel.value = String(b.index);
        nav.querySelectorAll('[data-step]').forEach(x => {
          x.disabled = b.docs.length < 2;
        });
        nav.title = b.docs[0]?.yaml?.operation?.name ? `Opération : ${b.docs[0].yaml.operation.name}` : '';
      };
      /** Rend courante la mission i du lot, l'affiche dans la page (apply) ; erreur notifiée. */
      const goTo = i => {
        try {
          const d = go(i, me);
          if (d) apply(d);
        } catch (e) {
          window.AppFramework.notify(e.message, 'err');
        }
        render();
      };
      sel.onchange = () => goTo(+sel.value);
      nav.addEventListener('click', e => {
        const st = e.target.closest('[data-step]')?.dataset.step;
        if (st) goTo((loadBatch()?.index || 0) + +st);
      });
      window.addEventListener('sia-mission-batch', render);
      window.addEventListener('storage', e => {
        if (e.key === BATCH || e.key === KEY) render();
      });
      channel?.addEventListener('message', () => setTimeout(render, 0));
      render();
    };
    if (document.querySelector('body>header .repo-header-line1')) mount();
    else window.addEventListener('repository-nav-ready', () => setTimeout(mount, 0), {
      once: true
    });
    setTimeout(mount, 1500); // secours : en-tête sans bandeau commun
  }
  /** Échappe un texte pour HTML. */
  const esc = window.RepositoryKit.esc; // échappement HTML commun (shared/kit.js)
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
  // ---- numérotation : lettre de FAMILLE + tiret + numéro sur 3 chiffres par famille (+ lettre d'équipe) — « M-016 », « S-002A »
  // (écritures sans tiret « M016 » acceptées et ramenées à ce format).
  // Même table que tools/family_letters.py et que le prompt (docs/technique/PROMPT_GENERATEUR_MISSIONS.md, § 3).
  const FAMILY_LETTERS = {
    HEMS: 'M',
    MEDEVAC: 'M',
    HADR: 'H',
    FIRE: 'F',
    SAR: 'S',
    AIRLIFT: 'T',
    AAR: 'R',
    AIRBORNE: 'P',
    MARITIME: 'N',
    ISR: 'I',
    LE: 'L',
    COMMAND: 'C',
    COMBAT: 'A',
    SOF: 'O',
    FI: 'V',
    SURVEY: 'G',
    SPECIAL: 'X'
  };
  /** Découpe un identifiant : { id: 'M-016A', letter, num, team } ; anciens identifiants numériques (« 41A ») : letter vide. */
  function parseId(raw) {
    const s = String(raw ?? '').trim().toUpperCase(),
      m = /^([A-Z])?-?(\d+)([A-Z])?$/.exec(s);
    if (!m) return {
      id: s,
      letter: '',
      num: null,
      team: ''
    };
    const letter = m[1] || '',
      num = +m[2],
      team = m[3] || '';
    return {
      id: letter ? `${letter}-${String(num).padStart(3, '0')}${team}` : `${num}${team}`,
      letter,
      num,
      team
    };
  }
  /** Prochain identifiant d'une famille d'après le registre (missionRegistry:v1) : { letter, first: '016', id: 'M-016', serie: 4 }. */
  function nextNumbering(family) {
    let reg = [];
    try {
      // registre des missions : copie en mémoire de l'index (shared/data_index.js), lue à l'ouverture de la page
      reg = (window.MissionIndex ? window.MissionIndex.all() : (window.RepositoryKit?.store?.jsonCached ? window.RepositoryKit.store
        .jsonCached('missionRegistry:v1', null) : JSON.parse(localStorage.getItem('missionRegistry:v1') || 'null'))?.missions) || [];
    } catch {
      /* registre illisible */
    }
    const letter = FAMILY_LETTERS[String(family || '').toUpperCase()] || '';
    const mine = reg.filter(m => letter && parseId(m.id).letter === letter);
    const num = Math.max(0, ...mine.map(m => parseId(m.id).num || 0)) + 1,
      serie = Math.max(0, ...mine.map(m => +m.series || 0)) + 1;
    return {
      letter,
      first: String(num).padStart(3, '0'),
      id: letter ? `${letter}-${String(num).padStart(3, '0')}` : '',
      serie
    };
  }
  /** Prochains identifiants de toutes les familles (paramètre PROCHAINS_NUMEROS du prompt, utile si TYPE = aléatoire). */
  function numberingTable() {
    return [...new Set(Object.keys(FAMILY_LETTERS).filter(f => f !== 'MEDEVAC'))].map(f => {
      const n = nextNumbering(f);
      return `${f} ${n.id} série ${n.serie}`;
    }).join(' · ');
  }
  // ---- Markdown d'une mission (summary<ID>.md) produit depuis son YAML : format du § 9 du prompt de génération
  //      (docs/technique/PROMPT_GENERATEUR_MISSIONS.md), relu par fromTexts ; mission d'organisation (…Z) : son format propre.
  //      docs : autres missions de l'opération (YAML), pour la section « Exercice » d'une mission d'équipage.
  function markdownOf(y, {
    docs = []
  } = {}) {
    y = y?.yaml || y || {};
    /** Outils de mise en forme : liste, texte nettoyé, cellule de tableau Markdown (sans « | » ni saut de ligne). */
    const arr = v => Array.isArray(v) ? v : v ? [v] : [],
      txt = v => String(v ?? '').trim(),
      cell = v => txt(v).replace(/\|/g, '/').replace(/\n+/g, ' ');
    /** Coordonnée à 6 décimales ; « — lat, lon » après un nom de point s'il a une position. */
    const num = v => Number.isFinite(+v) ? (+v).toFixed(6) : '',
      at = p => p && Number.isFinite(+p.lat) ? ` — ${num(p.lat)}, ${num(p.lon)}` : '';
    const m = y.mission || {},
      id = txt(m.id),
      ac = arr(y.aircraft)[0] || {},
      op = y.operation || {},
      ex = y.exercise,
      out = [];
    /** Paragraphes du texte, chaque paragraphe remis sur une ligne. */
    const para = v => txt(v).split(/\n\s*\n/).map(s => s.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean).join('\n\n');
    /** Ajoute la section « ## title » si son contenu n'est pas vide. */
    const sec = (title, body) => {
      if (txt(body)) out.push(`## ${title}\n\n${txt(body)}`);
    };
    const teams = arr(y.teams).filter(t => t && typeof t === 'object');
    const teamTable = teams.length ? ['| Nom / callsign | Arme / service | Département | Type | Rôle |', '|---|---|---|---|---|', ...teams
      .map(t => `| ${cell(t.name)} | ${cell(t.service)} | ${cell(t.department)} | ${cell(t.type)} | ${cell(t.role)} |`)
    ].join('\n') : '';
    if (ex && typeof ex === 'object') {
      // mission d'organisation
      out.push(`# Organisation ${id} — « ${txt(y.title)} »`);
      sec('Introduction', [`Type : ${txt(m.type)}`, `Sous-type : ${txt(m.subtype)}`, op.name ? `Opération : ${txt(op.name)} — missions ${arr(op.missions).join(', ')}` : ''].filter(Boolean).join('\n'));
      sec('Summary', para(y.summary));
      sec('Description détaillée', para(y.detailed_description));
      sec('Équipes engagées', teamTable);
      sec('Heure H et participants', [`Heure H : ${txt(ex.h_hour) || 'H'}`, '', '| Indicatif | Mission | Décollage | Rôle |', '|---|---|---|---|', ...arr(ex
        .participants).map(p => `| ${cell(p.callsign)} | ${cell(p.mission)} | ${cell(p.takeoff)} | ${cell(p.role)} |`)].join('\n'));
      if (arr(ex.tracks).length) sec('Chiffons', [
        '| Piste | Joué | Indicatif | Départ | Nature | Points | Niveau | Vitesse | À établir | Consignes |',
        '|---|---|---|---|---|---|---|---:|---|---|',
        ...arr(ex.tracks).map(k => `| ${cell(k.name || k.id)} | ${k.played ? 'oui' : 'non'} | ${cell(k.callsign)} | ${cell(k.start)} | ${cell(k.nature)} | ${cell(arr(k.points).map(p => `${txt(p.name)} ${num(p.lat)}, ${num(p.lon)}`).join(' → '))} | ${cell(k.level)} | ${cell(k.speed_kt)} | ${cell(k.task)} | ${cell(k.conduct)} |`)
      ].join('\n'));
      if (arr(ex.events).length) sec('Chronologie', arr(ex.events).map(e => `- **${txt(e.id)} — ${txt(e.at)}${e.by ? ` (${txt(e.by)})` : ''}${+e.delay_min ? ` +${+e.delay_min} min` : ''}** — ${/pli/i.test(e.kind || '') ? 'pli' : 'radio'} — ${txt(e.from)} → ${arr(e.to).join(', ')} : ${txt(e.title)}${arr(e.reveals).length ? ` — pistes ${arr(e.reveals).join(', ')}` : ''}${txt(e.text) ? '\n  ' + para(e.text).replace(/\n\n/g, '\n  ') : ''}`).join('\n'));
    } else {
      out.push(`# Mission ${id} — ${txt(ac.callsign) || '—'} — « ${txt(y.title)} »`);
      sec('Introduction', [`Type : ${txt(m.type)}`, `Sous-type : ${txt(m.subtype)}`, `Aéronef : ${txt(ac.type)}`, `Callsign : ${txt(ac.callsign)}`, `Départ : ${txt(y.origin?.name)}${at(y.origin)}`, `Destination : ${txt(y.destination?.name)}${at(y.destination)}`].join('\n'));
      sec('Summary', para(y.summary));
      sec('Description détaillée', para(y.detailed_description));
      sec('Équipes engagées', teamTable);
      if (arr(op.missions).length > 1) sec('Coordination de l\'opération', `Opération : ${txt(op.name)} — missions ${arr(op.missions).join(', ')}`);
      const pl = y.payload;
      if (pl && typeof pl === 'object') sec('Charge / personnel', [`Catégorie : ${txt(pl.category)}`, `Description : ${txt(pl.description)}`, pl.mass_kg != null ? `Masse : ${pl.mass_kg} kg` : '', pl
        .passengers != null ? `Passagers : ${pl.passengers}` : '', arr(pl.constraints).length ? `\nContraintes :\n${arr(pl.constraints).map(c => `- ${txt(c)}`).join('\n')}` : ''
      ].filter(Boolean).join('\n'));
      sec('Objectif principal', txt(y.objectives?.primary));
      sec('Objectifs secondaires', arr(y.objectives?.secondary).map(o => `- ${txt(o)}`).join('\n'));
      if (arr(y.turning_points).length) sec('Points tournants', ['| ID | Nom | Latitude | Longitude | Rôle |', '|---|---|---:|---:|---|',
        ...arr(y.turning_points).map(p => `| ${cell(p.id)} | ${cell(p.name)} | ${num(p.lat)} | ${num(p.lon)} | ${cell(p.role)} |`)
      ].join('\n'));
      if (arr(y.rendezvous).length) sec('Rendez-vous', arr(y.rendezvous).map(r => `- **${txt(r.id)} — ${txt(r.name)}** — ${num(r.lat)}, ${num(r.lon)}${arr(r.participants).length ? ` — participants : ${arr(r.participants).join(', ')}` : ''}${r.role ? ` — ${txt(r.role)}` : ''}`).join('\n'));
      if (y.air_refueling && typeof y.air_refueling === 'object') sec('Ravitaillement en vol', Object.entries(y.air_refueling).map(([k,
        v
      ]) => `- ${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n'));
      sec('Risques à prendre en compte', arr(y.risks).map(r => typeof r === 'object' ? `- **${txt(r.hazard)}** — conséquence : ${txt(r.consequence)} — mesure : ${txt(r.mitigation)}` : `- ${txt(r)}`).join('\n'));
      sec('Cartographie prévue', arr(y.maps).map(mp => typeof mp === 'object' ? `- \`${txt(mp.filename || mp.file)}\` — ${txt(mp.description)}` : `- \`${txt(mp)}\``).join('\n'));
      // exercice : organisation de l'opération (docs) ; plis comptés, pas leur contenu
      const X = window.MissionExercise,
        org = X ? X.of(y, docs) : null,
        me = org && X.participantOf(org, id);
      if (op.organisation || me) {
        const tl = org ? X.timeline(org, [y, ...docs]) : [],
          mine = me ? X.eventsFor(tl, me.callsign) : [],
          plis = mine.filter(e => e.kind === 'pli');
        sec('Exercice', [`Organisation : ${txt(op.organisation)}`, `Heure H : ${txt(org?.h_hour) || 'H'}`, `Décollage : ${txt(me?.takeoff) || 'H'}`, `Plis scellés remis : ${plis.length ? plis.map(e => `${txt(e.title) || e.id} (à ouvrir : ${e.when})`).join(' ; ') : 'aucun'}`, `Messages radio attendus en vol : ${mine.length > plis.length ? 'oui' : 'non'}`].join('\n'));
      }
      for (const ph of arr(y.phases)) sec(`Partie ${txt(ph.id)} — ${txt(ph.title)}`, [`À ouvrir : ${txt(ph.trigger)}`, `Message : ${txt(ph.message)}`, '', para(ph.brief)].join('\n'));
    }
    out.push('> Scénario de simulation — ne pas utiliser pour une mission réelle.');
    return out.join('\n\n') + '\n';
  }
  window.SiaMission = {
    FAMILY_LETTERS,
    parseId,
    nextNumbering,
    numberingTable,
    markdownOf,
    KEY,
    load,
    save,
    subscribe,
    fromTexts,
    fromTextsBatch,
    splitBundle,
    importTexts,
    loadBatch,
    idBase,
    idRelations,
    migrateIds,
    go,
    addToBatch,
    mountNav,
    parseMarkdown,
    extractMdMetadata,
    mergeYaml
  };
})();
