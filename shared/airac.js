(() => {
  'use strict';
  // Composant « Airac » : cycles AIRAC et état des données SIA, pour Paramètres › Maintenance et le contrôle de
  // mise à jour (suite_update.js).
  //   · Airac.cycle(date) / next(date) / fromDate('2026-10-01') → { date, ident: '2610', label: '10/26', start, end } :
  //     cycles de 28 jours (référence 25 janvier 2024 = AIRAC 2401) ;
  //   · Airac.inspectFolder(fichiers) : rôle et cycle des fichiers d'un dossier SIA XML (AIXM 4.5, XML-SIA,
  //     ancien sia-airspaces, ZIP d'export du SIA…), cycles présents, complets ou non, anciens cycles ;
  //   La base analysée (lecture du dossier, cache, résumé siaBaseInfo:v1, grille MORA) est dans shared/sia_base.js (SiaBase).
  const DAY = 864e5,
    CYCLE = 28 * DAY,
    REF = Date.UTC(2024, 0, 25); // AIRAC 2401
  const iso = t => new Date(t).toISOString().slice(0, 10);
  /** Instant UTC (minuit) d'une date « AAAA-MM-JJ », d'un Date ou d'un nombre ; aujourd'hui par défaut. */
  function dayOf(d) {
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) return Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
    const x = d == null ? new Date() : new Date(d);
    return Date.UTC(x.getFullYear(), x.getMonth(), x.getDate());
  }
  /** Cycle commençant à l'instant start (UTC). */
  function describe(start) {
    const y = new Date(start).getUTCFullYear(),
      first = REF + Math.ceil((Date.UTC(y, 0, 1) - REF) / CYCLE) * CYCLE,
      num = Math.round((start - first) / CYCLE) + 1,
      yy = String(y).slice(2);
    return {
      date: iso(start),
      start,
      end: start + CYCLE,
      until: iso(start + CYCLE - DAY),
      ident: yy + String(num).padStart(2, '0'),
      label: `${String(num).padStart(2, '0')}/${yy}`,
      // page du SIA de ce cycle (« Données aéronautiques XML AIRAC 10/26 »)
      url: (window.RepositoryNav?.source?.('siaCycle') || 'https://www.sia.aviation-civile.gouv.fr/donnees-aeronautiques-xml-airac-{nn}-{yy}.html').replace('{nn}', String(num).padStart(2, '0')).replace('{yy}', yy)
    };
  }
  /** Cycle en vigueur à la date d (défaut : aujourd'hui). */
  const cycle = d => describe(REF + Math.floor((dayOf(d) - REF) / CYCLE) * CYCLE);
  /** Cycle suivant celui en vigueur à la date d. */
  const next = d => describe(cycle(d).start + CYCLE);
  /** Cycle qui commence à la date donnée (« 2026-10-01 ») ; null si ce n'est pas une date de cycle. */
  function fromDate(date) {
    if (!date) return null;
    const t = dayOf(date);
    return (t - REF) % CYCLE === 0 ? describe(t) : null;
  }
  /** Cycle d'un nom de fichier (date AAAA-MM-JJ qu'il contient) ; null sinon. */
  const cycleOfName = name => fromDate(/(\d{4}-\d{2}-\d{2})/.exec(String(name || ''))?.[1]);

  // ---- fichiers du dossier SIA XML
  const ROLES = [{
    id: 'aixm',
    re: /^AIXM4\.5_all_FR_OM_(\d{4}-\d{2}-\d{2})\.xml$/i,
    need: true,
    label: ['AIXM 4.5 complet (espaces, aérodromes, balises, obstacles)', 'Full AIXM 4.5 (airspace, aerodromes, navaids, obstacles)']
  }, {
    id: 'xmlsia',
    re: /^XML_SIA_(\d{4}-\d{2}-\d{2})\.xml$/i,
    need: true,
    label: ['Export XML-SIA (inventaire)', 'XML-SIA export (inventory)']
  }, {
    id: 'airspaces',
    re: /^sia-airspaces-(\d{4}-\d{2}-\d{2})\.xml$/i,
    need: false,
    label: ['Contours dérivés (ancien format, facultatif : les contours sont lus dans XML-SIA)', 'Derived outlines (legacy, optional: outlines are read from XML-SIA)']
  }, {
    id: 'zip',
    re: /^export_xml_bd_SIA_(\d{4}-\d{2}-\d{2})(?:-v(\d+))?\.zip$/i,
    need: false,
    label: ['ZIP d’export du SIA (à extraire)', 'SIA export ZIP (to extract)']
  }];
  const FIXED = [{
    id: 'mora',
    name: 'mora.csv',
    label: ['Grille MORA calculée', 'Computed MORA grid']
  }, {
    id: 'tracks',
    name: 'miam-enr-5-7-tracks.xml',
    label: ['Axes AAR nommés (ENR 5.7)', 'Named AAR tracks (ENR 5.7)']
  }, {
    id: 'coords',
    name: 'miam-enr-5-7-coordinates.xml',
    label: ['Coordonnées ENR 5.7 d’origine', 'Original ENR 5.7 coordinates']
  }, {
    id: 'readme',
    name: 'Lisez_moi.txt',
    label: ['Lisez-moi du SIA (nouveautés du BMJ)', 'SIA read-me (BMJ changes)']
  }];
  /** Inventaire d'un dossier SIA XML (fichiers [{ name, size, lastModified }]) : { files, cycles, latest, complete, old, fixed, zips }. */
  function inspectFolder(files) {
    const list = [...(files || [])].map(f => ({
      name: f.name,
      size: f.size || 0,
      lastModified: f.lastModified || 0,
      file: f
    }));
    const byCycle = new Map(),
      zips = [];
    for (const f of list) {
      const role = ROLES.find(r => r.re.test(f.name));
      if (!role) continue;
      const m = role.re.exec(f.name),
        c = fromDate(m[1]);
      const entry = {
        ...f,
        role: role.id,
        cycle: c?.date || m[1],
        version: m[2] ? +m[2] : null,
        valid: !!c
      };
      if (role.id === 'zip') {
        zips.push(entry);
        continue;
      }
      if (!byCycle.has(entry.cycle)) byCycle.set(entry.cycle, []);
      byCycle.get(entry.cycle).push(entry);
    }
    const cycles = [...byCycle.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([date, items]) => {
      const roles = new Set(items.map(i => i.role));
      return {
        date,
        cycle: fromDate(date),
        items,
        missing: ROLES.filter(r => r.need && !roles.has(r.id)).map(r => r.id),
        complete: ROLES.filter(r => r.need).every(r => roles.has(r.id))
      };
    });
    const fixed = FIXED.map(x => ({
      ...x,
      file: list.find(f => f.name.toLowerCase() === x.name.toLowerCase()) || null
    }));
    return {
      files: list,
      cycles,
      latest: cycles[0] || null,
      old: cycles.slice(1),
      complete: !!cycles[0]?.complete,
      fixed,
      zips: zips.sort((a, b) => b.cycle.localeCompare(a.cycle) || (b.version || 0) - (a.version || 0))
    };
  }
  /** Fichiers (File) d'un dossier autorisé, sans descendre dans les sous-dossiers ; [] sans accès. */
  async function filesOf(handle) {
    const out = [];
    if (!handle) return out;
    for await (const [name, h] of handle.entries()) if (h.kind === 'file') try {
      out.push(await h.getFile());
    } catch {
      /* verrouillé */ }
    return out;
  }

  window.Airac = {
    cycle,
    next,
    fromDate,
    cycleOfName,
    describe,
    ROLES,
    FIXED,
    inspectFolder,
    filesOf
  };
})();
