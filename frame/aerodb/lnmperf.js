(() => {
  'use strict';
  // V3 aerodb — fiches de performances et fichiers Little Navmap (.lnmperf) tenus pareils dans les deux sens, sur un
  // poste servi par le lanceur (frame/aerodb/SPEC.md § 5 ter). Le dossier .lnmperf du poste est réglé dans Réglages
  // (carte « Fiches Little Navmap ») et gardé par le lanceur (tools/.lnmperf.json) ; routes /__setup/lnmperf-folder et
  // /__setup/lnmperf (liste, lecture, écriture, mise à l'écart dans _removed/).
  //   · manifeste cache/aerodb/lnmperf.json (cache du frame, cet appareil) : { schema, folder, files: { nom: { sheetId,
  //     sha (empreinte du fichier au dernier passage), view (champs .lnmperf de la fiche à ce moment, dans son unité) } } } ;
  //   · cinq cas : fiche changée → fichier réécrit ; fichier changé → fiche mise à jour (origine « lnmperf ») ; les deux →
  //     champ par champ, le plus récent gagne (date du champ contre date du fichier), la valeur perdante gardée dans _kept
  //     et un conflit compté au bouton du cadre ; nouveau fichier → fiche importée ; fichier supprimé → réécrit ; fiche
  //     retirée → fichier rangé dans _removed/ (s'il n'a pas changé, sinon réimporté). Jamais de perte silencieuse ;
  //   · passage au démarrage, après chaque synchronisation du cadre, et toutes les deux minutes tant que la page est
  //     visible ; un seul passage à la fois ;
  //   · téléchargement d'une fiche en .lnmperf (téléphone, sans lanceur) ;
  //   · unités : un .lnmperf est en livres (ou en gallons) ; une fiche en kg est convertie à l'écriture et à la lecture.
  // API : AeroDBLnmperf.create({ reader, aircraft, launcherRoot }) → { start, sync, exportNow, status, on, folder, setFolder,
  //   download, card } ; AeroDBLnmperf.fileName(id), viewOf(text, unit, lib).
  // La carte des Réglages n'offre que l'EXPORT (exportNow, SOG-0023, § 10.35) : les fiches écrivent leurs fichiers, un fichier changé
  // dans Little Navmap n'est jamais repris en silence (listé : il s'importe par Appareils › « Importer un fichier », aperçu avant
  // écriture). sync() garde le passage dans les deux sens pour le banc et l'essai create({ lnmperf: true }) seulement.
  const MANIFEST = 'cache/aerodb/lnmperf.json',
    EVERY = 120000, // toutes les deux minutes, page visible
    START_DELAY = 4000,
    // champs portés par un .lnmperf (chemins des fiches)
    LNM_PATHS = ['name', 'icao', 'description', 'jetFuel', 'fuelAsVolume', 'contingencyPercent', 'extraFuel', 'reserveFuel', 'taxiFuel',
      'usableFuel', 'minRunwayLengthFt', 'runwayType', 'alternate.fuelFlowPerHour', 'alternate.tasKt', 'cruise.fuelFlowPerHour',
      'cruise.tasKt', 'climb.fuelFlowPerHour', 'climb.tasKt', 'climb.rateFpm', 'descent.fuelFlowPerHour', 'descent.tasKt',
      'descent.rateFpm'
    ],
    FUEL = new Set(['fuelFlowPerHour', 'usableFuel', 'taxiFuel', 'reserveFuel', 'extraFuel']),
    KG_PER_LB = 0.45359237;

  const T = {
    title: ['Fiches Little Navmap (.lnmperf)', 'Little Navmap sheets (.lnmperf)', 'Little-Navmap-Profile (.lnmperf)',
      'Fichas de Little Navmap (.lnmperf)'
    ],
    hint: [
      'La fiche JSON est la seule source. « Exporter les fiches » écrit vos fiches dans ce dossier, à votre demande ; rien ne se fait en arrière-plan. Un fichier changé dans Little Navmap n\'est jamais repris ni écrasé : il est listé ici, et s\'importe par Appareils › « Importer un fichier » (aperçu avant écriture).',
      'The JSON sheet is the only source. “Export the sheets” writes your sheets to this folder, when you ask; nothing happens in the background. A file changed in Little Navmap is never taken nor overwritten: it is listed here, and is imported through Aircraft › “Import a file” (preview before writing).',
      'Das JSON-Profil ist die einzige Quelle. „Profile exportieren“ schreibt Ihre Profile auf Ihren Wunsch in diesen Ordner; im Hintergrund geschieht nichts. Eine in Little Navmap geänderte Datei wird nie übernommen oder überschrieben: sie wird hier aufgelistet und über Luftfahrzeuge › „Datei importieren“ importiert (Vorschau vor dem Schreiben).',
      'La ficha JSON es la única fuente. «Exportar las fichas» escribe sus fichas en esta carpeta, cuando usted lo pide; no se hace nada en segundo plano. Un archivo cambiado en Little Navmap nunca se recoge ni se sobrescribe: se lista aquí, y se importa por Aeronaves › «Importar un archivo» (vista previa antes de escribir).'
    ],
    folder: ['Dossier des fichiers .lnmperf', 'Folder of the .lnmperf files', 'Ordner der .lnmperf-Dateien',
      'Carpeta de los archivos .lnmperf'
    ],
    found: ['Dossiers de Little Navmap trouvés :', 'Little Navmap folders found:', 'Gefundene Little-Navmap-Ordner:',
      'Carpetas de Little Navmap encontradas:'
    ],
    save: ['Enregistrer', 'Save', 'Speichern', 'Guardar'],
    off: ['Arrêter', 'Stop', 'Beenden', 'Detener'],
    now: ['Exporter les fiches', 'Export the sheets', 'Profile exportieren', 'Exportar las fichas'],
    changed: ['Changés dans Little Navmap', 'Changed in Little Navmap', 'In Little Navmap geändert', 'Cambiados en Little Navmap'],
    changedTxt: ['{l} — non repris : à importer par Appareils › « Importer un fichier » (aperçu avant écriture)',
      '{l} — not taken: import them through Aircraft › “Import a file” (preview before writing)',
      '{l} — nicht übernommen: über Luftfahrzeuge › „Datei importieren“ importieren (Vorschau vor dem Schreiben)',
      '{l} — no recogidos: importarlos por Aeronaves › «Importar un archivo» (vista previa antes de escribir)'
    ],
    exported: ['Fiches exportées vers le dossier.', 'Sheets exported to the folder.', 'Profile in den Ordner exportiert.',
      'Fichas exportadas a la carpeta.'
    ],
    exportDone: ['{t} — {w} écrit(s), {r} écarté(s)', '{t} — {w} written, {r} set aside', '{t} — {w} geschrieben, {r} beiseitegelegt',
      '{t} — {w} escrito(s), {r} apartado(s)'
    ],
    saved: ['Dossier enregistré. « Exporter les fiches » y écrit vos fiches.',
      'Folder saved. “Export the sheets” writes your sheets there.',
      'Ordner gespeichert. „Profile exportieren“ schreibt Ihre Profile dorthin.',
      'Carpeta guardada. «Exportar las fichas» escribe allí sus fichas.'
    ],
    stopped: ['Synchronisation .lnmperf arrêtée.', '.lnmperf synchronisation stopped.', '.lnmperf-Abgleich beendet.',
      'Sincronización .lnmperf detenida.'
    ],
    absent: ['Ce dossier n\'existe pas sur ce poste.', 'This folder does not exist on this computer.',
      'Dieser Ordner existiert auf diesem Rechner nicht.', 'Esta carpeta no existe en este equipo.'
    ],
    dataRefused: ['Le dossier des données ne peut pas servir : choisissez celui de Little Navmap.',
      'The data folder cannot be used: choose Little Navmap\'s.',
      'Der Datenordner kann nicht dienen: wählen Sie den von Little Navmap.',
      'La carpeta de datos no puede servir: elija la de Little Navmap.'
    ],
    none: ['Aucun dossier réglé : la synchronisation est arrêtée.', 'No folder set: synchronisation is stopped.',
      'Kein Ordner eingestellt: der Abgleich ist angehalten.', 'Ninguna carpeta ajustada: la sincronización está detenida.'
    ],
    files: ['Fichiers liés', 'Linked files', 'Verknüpfte Dateien', 'Archivos vinculados'],
    last: ['Dernier passage', 'Last pass', 'Letzter Durchgang', 'Última pasada'],
    lastDone: ['{t} — {w} écrit(s), {i} importé(s), {m} mis à jour, {r} écarté(s)',
      '{t} — {w} written, {i} imported, {m} updated, {r} set aside',
      '{t} — {w} geschrieben, {i} importiert, {m} aktualisiert, {r} beiseitegelegt',
      '{t} — {w} escrito(s), {i} importado(s), {m} actualizado(s), {r} apartado(s)'
    ],
    never: ['pas encore', 'not yet', 'noch nicht', 'todavía no'],
    conflicts: ['Conflits', 'Conflicts', 'Konflikte', 'Conflictos'],
    conflictsTxt: ['{n} — voir le bouton de synchronisation du cadre', '{n} — see the frame\'s synchronisation button',
      '{n} — siehe die Abgleich-Schaltfläche des Rahmens', '{n} — ver el botón de sincronización del marco'
    ],
    incomplete: ['Fiches non écrites', 'Sheets not written', 'Nicht geschriebene Profile', 'Fichas no escritas'],
    incompleteTxt: ['{l} (champs requis par Little Navmap vides)', '{l} (fields required by Little Navmap empty)',
      '{l} (von Little Navmap verlangte Felder leer)', '{l} (campos requeridos por Little Navmap vacíos)'
    ],
    errors: ['Fichiers illisibles', 'Unreadable files', 'Unlesbare Dateien', 'Archivos ilegibles'],
    running: ['Comparaison en cours…', 'Comparing…', 'Vergleich läuft…', 'Comparando…'],
    done: ['Fiches et fichiers .lnmperf comparés.', 'Sheets and .lnmperf files compared.', 'Profile und .lnmperf-Dateien verglichen.',
      'Fichas y archivos .lnmperf comparados.'
    ],
    failed: ['Synchronisation .lnmperf impossible : {m}', '.lnmperf synchronisation failed: {m}',
      '.lnmperf-Abgleich fehlgeschlagen: {m}',
      'Sincronización .lnmperf imposible: {m}'
    ],
    conflictNote: ['{n} fiche(s) changée(s) des deux côtés : la valeur la plus récente gagne, l\'autre est gardée.',
      '{n} sheet(s) changed on both sides: the newest value wins, the other is kept.',
      '{n} Profil(e) auf beiden Seiten geändert: der neueste Wert gewinnt, der andere bleibt erhalten.',
      '{n} ficha(s) cambiada(s) en ambos lados: gana el valor más reciente, el otro se conserva.'
    ]
  };

  // ---------------------------------------------------------------- champs et unités
  const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const r3 = v => typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 1000) / 1000 : v;
  const getPath = (o, p) => p.split('.').reduce((x, k) => x == null ? undefined : x[k], o);

  function setPath(o, p, v) {
    const ks = p.split('.');
    let x = o;
    for (const k of ks.slice(0, -1)) x = x[k] && typeof x[k] === 'object' ? x[k] : (x[k] = {});
    x[ks[ks.length - 1]] = v;
  }
  /** Unité du carburant d'un profil lu dans un .lnmperf : gallons (FuelAsVolume) ou livres. */
  const fileUnit = p => p?.fuelAsVolume ? 'gal' : 'lb';
  /** Valeur de carburant convertie entre kg et lb ; undefined si la conversion est impossible (gallons ↔ masse). */
  function fuelIn(v, from, to) {
    if (typeof v !== 'number' || from === to) return v;
    if (from === 'lb' && to === 'kg') return v * KG_PER_LB;
    if (from === 'kg' && to === 'lb') return v / KG_PER_LB;
    return undefined;
  }
  /** Champs .lnmperf d'un profil à plat, carburant dans l'unité unit, nombres arrondis au millième (le .lnmperf garde trois
   *  décimales) ; les carburants non convertibles sont omis. */
  function flat(p, from, unit) {
    const out = {};
    for (const k of LNM_PATHS) {
      let v = getPath(p, k);
      if (v === undefined) continue;
      if (FUEL.has(k.split('.').pop())) v = fuelIn(v, from, unit);
      if (v !== undefined) out[k] = r3(v);
    }
    return out;
  }
  /** Champs d'un texte .lnmperf, dans l'unité de la fiche. */
  const viewOf = (text, unit, lib) => {
    const p = lib.parseLnmperf(text, 'x.lnmperf');
    return flat(p, fileUnit(p), unit || 'kg');
  };
  /** Texte .lnmperf d'une fiche (lève une erreur si des champs requis par Little Navmap manquent). */
  const exportText = (s, lib) => lib.toLnmperf(lib.normalize(clone({
    ...s,
    _fields: undefined,
    _kept: undefined
  })));
  /** Champs .lnmperf d'une fiche tels que son fichier les porterait. */
  const viewOfSheet = (s, lib) => viewOf(exportText(s, lib), s.unit || 'kg', lib);
  /** Nom de fichier d'une fiche : son identifiant, caractères interdits remplacés. */
  const fileName = id => `${String(id).replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').replace(/^\./, '_').slice(0, 120)}.lnmperf`;

  function create({
    reader,
    aircraft,
    launcher = null, // client du lanceur donné par le cadre (frame/INTEGRATION.md § 15) ; sans lui : fetch (bancs)
    launcherRoot = new URL('../../', document.currentScript?.src || location.href).href
  } = {}) {
    let state = {
      state: 'idle',
      folder: '',
      at: '',
      linked: 0,
      written: 0,
      imported: 0,
      merged: 0,
      retired: 0,
      conflicts: 0,
      incomplete: [],
      changed: [], // fichiers changés dans Little Navmap qu'un export n'a pas repris (SOG-0023)
      errors: [],
      message: '',
      mode: '' // 'export' : le dernier passage n'a fait qu'écrire
    };
    let busy = null,
      timer = 0,
      started = false,
      lastSync = '';
    const fns = new Set();
    const emit = patch => {
      state = {
        ...state,
        ...patch
      };
      for (const fn of fns) try {
        fn(state);
      } catch {
        /* écouteur en échec : ignoré */
      }
    };

    /** Route du lanceur ; null sans lanceur (réseau, refus), { status, body } sinon. */
    async function call(path, {
      method = 'GET',
      json,
      text
    } = {}) {
      if (launcher) {
        const x = await launcher.request(path, {
          method,
          json,
          text
        });
        if (!x || x.status === 403 || x.status === 404 && path.endsWith('lnmperf-folder')) return null;
        return x;
      }
      let r;
      try {
        r = await fetch(new URL(path, launcherRoot), {
          method,
          cache: 'no-store',
          headers: {
            'X-SOG-Setup': '1',
            ...(json !== undefined ? {
              'Content-Type': 'application/json'
            } : text !== undefined ? {
              'Content-Type': 'application/xml'
            } : {})
          },
          body: json !== undefined ? JSON.stringify(json) : text
        });
      } catch {
        return null;
      }
      if (r.status === 403 || r.status === 404 && path.endsWith('lnmperf-folder')) return null;
      return {
        status: r.status,
        body: await r.json().catch(() => ({}))
      };
    }
    const enc = encodeURIComponent;

    /** Dossier réglé sur ce poste : { folder, exists, suggestions } ; null sans lanceur. */
    async function folder() {
      const r = await call('__setup/lnmperf-folder');
      return r && r.status === 200 ? r.body : null;
    }
    /** Règle le dossier (vide : arrêt) ; { ok, folder } ou { ok: false, error: 'absent' | 'data' | message }. */
    async function setFolder(f) {
      const r = await call('__setup/lnmperf-folder', {
        method: 'PUT',
        json: {
          folder: String(f || '').trim()
        }
      });
      if (!r) return {
        ok: false,
        error: 'launcher'
      };
      if (r.body?.ok && started) sync('folder');
      return r.body?.ok ? r.body : {
        ok: false,
        error: r.body?.error || r.body?.message || String(r.status)
      };
    }

    /** Un passage (un seul à la fois) ; rend l'état. exportOnly : les fiches écrivent leurs fichiers, rien n'est lu dans une fiche. */
    function sync(reason = 'manual', {
      exportOnly = false
    } = {}) {
      return busy ||= run(reason, exportOnly).catch(e => {
        emit({
          state: 'error',
          message: e?.message || String(e)
        });
        return state;
      }).finally(() => {
        busy = null;
      });
    }

    /** L'export à la demande (la carte des Réglages, SOG-0023) : un passage qui n'écrit que des fichiers. */
    const exportNow = () => sync('export', {
      exportOnly: true
    });

    async function run(reason, exportOnly = false) {
      const list = await call('__setup/lnmperf');
      if (!list || list.status !== 200) {
        emit({
          state: 'off',
          folder: '',
          message: ''
        });
        return state;
      }
      emit({
        state: 'running',
        folder: list.body.folder
      });
      const A = await aircraft(),
        lib = A.lib,
        FD = window.FrameData,
        stats = {
          written: 0,
          imported: 0,
          merged: 0,
          retired: 0,
          conflicts: 0,
          incomplete: [],
          changed: [],
          errors: []
        };
      let man = clone(await reader.get(MANIFEST).catch(() => null)) || null;
      if (!man || man.folder !== list.body.folder) man = {
        schema: 1,
        folder: list.body.folder,
        files: {}
      };
      const files = new Map((list.body.files || []).map(f => [f.name, f])),
        sheets = new Map((await A.sheets.list()).map(s => [String(s.id), s])),
        linked = new Set(Object.values(man.files).map(m => m.sheetId));
      const read = async name => {
        const r = await call(`__setup/lnmperf?name=${enc(name)}`);
        if (!r || r.status !== 200) throw new Error(r?.body?.error || 'read');
        return r.body.text;
      };
      /** Fichier écrit depuis la fiche ; faux si la fiche n'a pas les champs requis par Little Navmap. */
      const write = async (name, s) => {
        let text;
        try {
          text = exportText(s, lib);
        } catch {
          stats.incomplete.push(String(s.id));
          return false;
        }
        const r = await call(`__setup/lnmperf?name=${enc(name)}`, {
          method: 'PUT',
          text
        });
        if (!r || r.status !== 200) throw new Error(r?.body?.error || 'write');
        man.files[name] = {
          sheetId: String(s.id),
          sha: r.body.sha,
          view: viewOfSheet(s, lib)
        };
        stats.written++;
        return true;
      };
      /** Fiche importée d'un fichier (nouvelle, ou reprise sous l'identifiant id). */
      const importFile = async (name, f, text, id) => {
        const p = lib.parseLnmperf(text, name);
        // identifiant de son type (V3 § 10.35) : celui d'avant s'il vaut encore, sinon la base C30J si elle est libre, sinon la
        // variante C30J-<NOM DU FICHIER> ; un fichier sans code de type n'est pas importé (dit parmi les fichiers illisibles)
        const type = String(p.icao || p.type || '').toUpperCase(),
          key = id && (sheets.has(id) || !(await A.sheets.checkId(id, type))) ? id : await A.sheets.newId(type, sheets.has(type) ?
            name
            .replace(/\.lnmperf$/i, '') : '');
        if (!key) throw new Error('no ICAO type');
        p.id = key;
        const s = await A.sheets.put(p, {
          source: 'lnmperf'
        });
        sheets.set(key, s);
        linked.add(key);
        man.files[name] = {
          sheetId: key,
          sha: f.sha,
          view: viewOfSheet(s, lib)
        };
        stats.imported++;
      };
      /** Fusion d'une fiche et de son fichier par rapport à base (champs du dernier passage ; {} : aucun). */
      const merge = async (name, s, f, text, base) => {
        const unit = s.unit || 'kg',
          fv = viewOf(text, unit, lib),
          sv = viewOfSheet(s, lib),
          next = clone(s),
          lost = {},
          fileSide = clone(s);
        let changed = false,
          conflict = false;
        for (const k of LNM_PATHS) {
          const fch = !same(fv[k], base[k]) && fv[k] !== undefined,
            sch = !same(sv[k], base[k]);
          if (!fch || same(fv[k], sv[k])) continue;
          setPath(fileSide, k, fv[k]);
          if (!sch) {
            setPath(next, k, fv[k]);
            changed = true;
            continue;
          }
          // changé des deux côtés : le plus récent gagne (date du champ de la fiche contre date du fichier)
          conflict = true;
          const sAt = Date.parse(s._fields?.[k]?.at || s.updated_at || s.updatedAt || '') || 0,
            fAt = Date.parse(f.mtime || '') || 0;
          if (fAt > sAt) {
            setPath(next, k, fv[k]);
            changed = true;
          } else lost[k] = [{
            value: fv[k],
            at: f.mtime,
            source: 'lnmperf'
          }];
        }
        let saved = s;
        if (changed || Object.keys(lost).length) {
          saved = await A.sheets.put(next, {
            source: 'lnmperf',
            kept: lost
          });
          sheets.set(String(s.id), saved);
          stats.merged++;
        }
        if (conflict) {
          stats.conflicts++;
          await FD?.noteConflict?.({
            path: A.sheets.fileOf(s.id),
            kept: JSON.stringify(saved, null, 1),
            lost: JSON.stringify(fileSide, null, 1),
            side: 'lnmperf'
          });
        }
        // le fichier suit la fiche quand elle a gardé une valeur à elle ; sinon il est déjà à jour
        const now = viewOfSheet(saved, lib);
        if (!same(now, fv)) await write(name, saved);
        else man.files[name] = {
          sheetId: String(s.id),
          sha: f.sha,
          view: now
        };
      };

      // 1. fichiers déjà liés
      for (const [name, m] of Object.entries(man.files)) {
        const f = files.get(name),
          s = sheets.get(m.sheetId);
        files.delete(name);
        try {
          if (!s && !f) {
            delete man.files[name];
          } else if (!s) {
            // fiche retirée : le fichier est mis à l'écart s'il n'a pas changé, sinon il redevient une fiche
            if (f.sha !== m.sha && exportOnly) stats.changed.push(name); // changé dans Little Navmap : jamais repris par un export
            else if (f.sha === m.sha) {
              const r = await call(`__setup/lnmperf?name=${enc(name)}&action=retire`, {
                method: 'POST',
                json: {}
              });
              if (!r || r.status !== 200) throw new Error('retire');
              delete man.files[name];
              stats.retired++;
            } else await importFile(name, f, await read(name), m.sheetId);
          } else if (!f) {
            await write(name, s); // fichier supprimé : réécrit
          } else {
            const sheetCh = !same(viewOfSheet(s, lib), m.view),
              fileCh = f.sha !== m.sha;
            if (sheetCh && !fileCh) await write(name, s);
            else if (fileCh && exportOnly) stats.changed.push(name); // ni fusion ni écrasement : dit, à importer avec l'aperçu
            else if (fileCh) await merge(name, s, f, await read(name), m.view || {});
          }
        } catch (e) {
          stats.errors.push({
            name,
            message: e?.message || String(e)
          });
        }
      }
      // 2. fichiers nouveaux : la fiche du même nom s'il y en a une (fusion sans base), sinon une fiche importée
      const byName = new Map([...sheets.values()].filter(s => !linked.has(String(s.id))).map(s => [fileName(s.id).toLowerCase(), s]));
      for (const [name, f] of files) {
        if (exportOnly) {
          stats.changed.push(name); // un fichier venu de Little Navmap seul : ni importé ni écrasé par un export
          continue;
        }
        try {
          const text = await read(name),
            s = byName.get(name.toLowerCase());
          if (s) {
            linked.add(String(s.id));
            await merge(name, s, f, text, {});
          } else await importFile(name, f, text);
        } catch (e) {
          stats.errors.push({
            name,
            message: e?.message || String(e)
          });
        }
      }
      // 3. fiches sans fichier : écrites
      for (const s of sheets.values()) {
        if (linked.has(String(s.id))) continue;
        const name = fileName(s.id);
        if (man.files[name] || (exportOnly && [...files.keys()].some(k => k.toLowerCase() === name.toLowerCase()))) continue;
        try {
          if (await write(name, s)) linked.add(String(s.id));
        } catch (e) {
          stats.errors.push({
            name,
            message: e?.message || String(e)
          });
        }
      }
      await reader.put(MANIFEST, man);
      emit({
        state: 'idle',
        at: new Date().toISOString(),
        linked: Object.keys(man.files).length,
        message: '',
        ...stats,
        mode: exportOnly ? 'export' : 'sync',
        conflicts: state.conflicts + stats.conflicts,
        lastConflicts: stats.conflicts
      });
      return state;
    }

    /** Passages automatiques : au démarrage, après chaque synchronisation du cadre, toutes les deux minutes page visible. Sans lanceur ni dossier réglé, rien n'est programmé.
     *  PLUS appelée par aerodb (V3 § 10.35, 5 nov. 2026 : la fiche JSON est l'unique source, .lnmperf n'est qu'un import ou un export à la demande, jamais une synchronisation silencieuse) :
     *  seul un appelant qui la veut vraiment (un essai, `create({ lnmperf: true })`) la lance. */
    async function start() {
      if (started) return;
      const f = await folder();
      if (!f) return emit({
        state: 'off'
      });
      started = true;
      emit({
        folder: f.folder
      });
      if (!f.folder) return emit({
        state: 'off'
      });
      setTimeout(() => sync('start'), START_DELAY);
      timer = setInterval(() => {
        if (document.visibilityState === 'visible') sync('timer');
      }, EVERY);
      reader.onStatus?.(s => {
        if (s?.lastSync && s.lastSync !== lastSync) {
          const first = !lastSync;
          lastSync = s.lastSync;
          if (!first) sync('after-sync');
        }
      });
    }

    /** Fiche téléchargée en .lnmperf (sans lanceur : téléphone) ; rend le nom du fichier. Lève une erreur si des champs
     *  requis manquent. */
    async function download(id) {
      const A = await aircraft(),
        s = await A.sheets.get(id);
      if (!s) throw new Error('aerodb: no such sheet');
      const text = exportText(s, A.lib),
        name = fileName(s.id),
        url = URL.createObjectURL(new Blob([text], {
          type: 'application/xml'
        })),
        a = Object.assign(document.createElement('a'), {
          href: url,
          download: name
        });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return name;
    }

    /** Carte « Fiches Little Navmap » des réglages (poste servi par le lanceur) : dossier, passage, état. ctx : { t,
     *  notify }. Les écritures dans la carte n'ont lieu que si le texte change. */
    async function card(el, {
      t,
      notify = () => {}
    }) {
      if (!el) return;
      const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`),
        f = await folder();
      if (!f) return void(el.hidden = true);
      el.innerHTML = `<h2>${esc(t(T.title))}</h2><p class="f-muted">${esc(t(T.hint))}</p>
<label class="f-field">${esc(t(T.folder))}<input data-f="lnmFolder" type="text" value="${esc(f.folder)}" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
${f.suggestions?.length ? `<p class="f-muted">${esc(t(T.found))}</p><div class="f-row">${f.suggestions.map(s => `<button type="button" data-lnm-pick="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : ''}
<div class="f-row"><button type="button" class="primary" data-lnm="save">${esc(t(T.save))}</button><button type="button" data-lnm="now">${esc(t(T.now))}</button><button type="button" data-lnm="off">${esc(t(T.off))}</button></div>
<dl class="f-dl" data-lnm-state></dl>`;
      const input = el.querySelector('[data-f="lnmFolder"]'),
        dl = el.querySelector('[data-lnm-state]');
      let off = () => {};
      const show = s => {
        // carte retirée (écran des réglages quitté) : plus d'écoute
        if (!el.isConnected) return off();
        const rows = [];
        if (s.state === 'off' || !s.folder) rows.push(['', t(T.none)]);
        else {
          rows.push([t(T.files), String(s.linked || 0)]);
          rows.push([t(T.last), s.state === 'running' ? t(T.running) : s.at && s.mode === 'export' ? t(T.exportDone, {
            t: new Date(s.at).toLocaleTimeString(),
            w: s.written || 0,
            r: s.retired || 0
          }) : s.at ? t(T.lastDone, {
            t: new Date(s.at).toLocaleTimeString(),
            w: s.written || 0,
            i: s.imported || 0,
            m: s.merged || 0,
            r: s.retired || 0
          }) : t(T.never)]);
          if (s.conflicts) rows.push([t(T.conflicts), t(T.conflictsTxt, {
            n: s.conflicts
          })]);
          if (s.incomplete?.length) rows.push([t(T.incomplete), t(T.incompleteTxt, {
            l: s.incomplete.join(', ')
          })]);
          if (s.changed?.length) rows.push([t(T.changed), t(T.changedTxt, {
            l: s.changed.slice(0, 20).join(', ') + (s.changed.length > 20 ? ' …' : '')
          })]);
          if (s.errors?.length) rows.push([t(T.errors), s.errors.map(e => e.name).join(', ')]);
        }
        const html = rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
        if (dl.innerHTML !== html) dl.innerHTML = html;
      };
      show(state);
      off = on(show);
      el.addEventListener('click', async e => {
        const pick = e.target.closest('[data-lnm-pick]')?.dataset.lnmPick;
        if (pick) input.value = pick;
        const act = e.target.closest('[data-lnm]')?.dataset.lnm;
        if (!act) return;
        if (act === 'save' || act === 'off') {
          const r = await setFolder(act === 'off' ? '' : input.value);
          if (!r.ok) return notify(t(r.error === 'absent' ? T.absent : r.error === 'data' ? T.dataRefused : T.failed, {
            m: r.error
          }), 'err');
          if (act === 'off') input.value = '';
          emit({
            folder: r.folder,
            state: r.folder ? state.state : 'off'
          });
          notify(t(r.folder ? T.saved : T.stopped), 'info');
          // pas de suivi tout seul (V3 § 10.35, 5 nov. 2026) : le dossier réglé ne déclenche aucun passage, « Exporter les fiches » fait un passage d’export (SOG-0023)
          return;
        }
        // « Exporter les fiches » : l'export seul (SOG-0023, § 10.35) ; un fichier changé dans Little Navmap est dit, jamais repris
        const s = await exportNow();
        if (s.state === 'error') notify(t(T.failed, {
          m: s.message
        }), 'warn');
        else if (s.state !== 'off') notify(t(T.exported), 'info');
      });
    }

    function on(fn) {
      fns.add(fn);
      return () => fns.delete(fn);
    }

    return {
      start,
      sync,
      exportNow,
      status: () => state,
      on,
      folder,
      setFolder,
      download,
      card,
      stop() {
        clearInterval(timer);
        started = false;
      }
    };
  }

  window.AeroDBLnmperf = {
    create,
    fileName,
    viewOf,
    LNM_PATHS
  };
})();
